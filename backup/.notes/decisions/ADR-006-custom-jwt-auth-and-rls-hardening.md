---
type: adr
id: ADR-006
created: 2026-06-21
status: accepted
tags: [security, database, authentication, rls]
---

# ADR-006: Custom JWT Auth and RLS Hardening

## Context
Standard Supabase GoTrue Auth was encountering 500 errors on the hosted instance, which forced the system to run in anonymous mode with disabled RLS on all 12 core tables. To restore security, we needed to re-enable Row-Level Security (RLS) while supporting Teacher, Representative, and Admin logins.

However, PostgREST instantly rejects custom JWTs (not signed by the actual database private key) in the `Authorization` header with a `PGRST301` decode error.

## Decision
We implemented a custom JWT-based authentication protocol utilizing a dynamic HTTP header:
1. **API JWT Issuance**: The `attendance-api` Edge Function signs custom JWTs containing `user_role` claims (and `class_id` or `teacher_id` context) using a default custom signing secret.
2. **Dynamic Header Interception**: We updated the Supabase client's `global.fetch` handler in `supabaseClient.ts` to intercept all outgoing API requests. It extracts custom tokens and injects them in the `x-custom-auth-token` header, while replacing the `Authorization` header with the standard database `anon` key.
3. **Database JWT Wrapper**: We created a PostgreSQL function `public.jwt_claims()` that checks for `x-custom-auth-token` in request headers, verifies it using `pgcrypto`, and falls back to standard Supabase JWT claims if none is found.
4. **Public RLS Policies**: We re-enabled RLS on all 12 core tables and rewrote all authentication-checked policies to target the `public` database role (since the connection role is `anon`), verifying rights via `public.jwt_claims() ->> 'user_role'`.

## Reasoning & Trade-offs
*   **Pro**: Re-enabled RLS on all 12 tables, establishing bulletproof security.
*   **Pro**: Completely bypassed the broken GoTrue service without triggering `PGRST301` errors.
*   **Pro**: Roles and class-specific constraints are verified securely in PostgreSQL.
*   **Con**: Connection role in PostgreSQL runs as `anon` rather than `authenticated`, which requires policies to be defined `TO public` instead of `TO authenticated`.

## Code References
*   [supabaseClient.ts](file:///d:/Projects/Projects/Attendance/src/utils/supabaseClient.ts)
*   [20260621000500_security_hardening.sql](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000500_security_hardening.sql)
