---
type: bug
created: 2026-06-29
status: resolved
tags: [debugging, postgresql, database, auth]
---

# Bug: Custom JWT Claims Resolution Failure in execute_sql_query

## Symptom
When calling `execute_sql_query` from the Admin Dashboard, the database returned:
`Unauthorized: Admin access or valid passcode required`
even though the administrator was authenticated with a valid custom admin token.

## Root Cause
The database function `execute_sql_query` checked the caller's role using:
`SELECT COALESCE(auth.jwt() ->> 'user_role', '') INTO v_user_role;`

Because we use custom JWT token claims mapped via `x-custom-auth-token` (and verify it on the `public` schema), the built-in Supabase `auth.jwt()` function (which reads from request header configurations) did not see the custom token claims. Instead, it only parsed the default `anon` token role, leaving `v_user_role` empty `''` and failing authorization.

## Applied Fix
We updated the function definition of `execute_sql_query` in the database to resolve claims using our custom `public.jwt_claims()` helper instead of `auth.jwt()`:

```sql
SELECT COALESCE(public.jwt_claims() ->> 'user_role', '') INTO v_user_role;
```

This successfully extracts the `user_role` claim from the custom authorization headers, authorizing valid admin sessions.

## How to Avoid in the Future
*   When building systems with custom JWT authentication layers on top of Supabase, always use the custom claims extractor `public.jwt_claims()` inside database functions instead of relying on the native `auth.jwt()`.

## Affected Database Functions
*   `public.execute_sql_query(text, text)`
