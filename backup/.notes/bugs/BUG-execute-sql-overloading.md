---
type: bug
created: 2026-06-21
status: resolved
tags: [debugging, postgresql, database]
---

# Bug: Database Function Overloading on execute_sql_query

## Symptom
When calling the database RPC `execute_sql_query`, PostgreSQL threw `PGRST203` ("Could not choose the best candidate function between: public.execute_sql_query(query_text => text), public.execute_sql_query(query_text => text, passcode => text)").

## Root Cause
The old insecure migration `20260621000200_execute_sql.sql` defined:
`public.execute_sql_query(query_text text)`

The new security migration `20260621000500_security_hardening.sql` defined:
`public.execute_sql_query(query_text text, passcode text DEFAULT '')`

Because PostgreSQL supports function overloading, it created a second function with a different signature instead of replacing the old one. PostgREST was unable to resolve which function to invoke when arguments were ambiguous.

## Applied Fix
We dropped the old overloaded function using the raw SQL runner:
`DROP FUNCTION IF EXISTS public.execute_sql_query(text);`

This left only the passcode-secured version `public.execute_sql_query(text, text)`, successfully resolving the ambiguity and securing the endpoint.

## How to Avoid in the Future
*   When changing Postgres function signatures in migrations, always explicitly drop old signatures first using `DROP FUNCTION IF EXISTS ...` to avoid overloading.

## Affected Files
*   [20260621000200_execute_sql.sql](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000200_execute_sql.sql)
*   [20260621000500_security_hardening.sql](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000500_security_hardening.sql)
