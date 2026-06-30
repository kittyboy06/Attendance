---
type: bug
created: 2026-06-21
status: resolved
tags: [debugging, authentication, rls, admin]
---

# Bug: Admin Delete False Positive Success due to Missing Token

## Symptom
When an administrator clicked "Delete" on a class or department, the dashboard displayed a green toast message "Record deleted successfully!", but the records remained visible in the UI and were not deleted from the database.

## Root Cause
1. **Missing Token Session**: The Admin was logged in using mock credentials from a previous browser session (setting `admin_auth: "true"` but `admin_token: null`). Without a valid custom JWT token, all subsequent database operations ran under the anonymous `anon` database role.
2. **Silent RLS Block**: The Row-Level Security (RLS) policies for writing/deleting records are restricted to authenticated Admins (`public.jwt_claims() ->> 'user_role' = 'admin'`). When the anonymous user executed a DELETE request, PostgreSQL's RLS silently blocked the deletion (deleting 0 rows) without throwing an error, and returned a `204 No Content` HTTP status code.
3. **False Success Trigger**: The frontend checked `{ error }` from the Supabase Client. Since no error was thrown, it assumed the delete succeeded and showed the success toast, but since `loadDatabase()` also ran anonymously, it fetched the un-deleted records from the database.

## Applied Fix
1. **Require Admin Token**: Modified [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx) state initialization to require both `admin_auth === "true"` and a non-null `admin_token`.
2. **Remove Mock Fallback**: Removed the mock login fallback logic, forcing all admin logins to authenticate via the Edge Function and acquire a valid custom JWT token.
3. **Harden Deletion Verification**: Updated `deleteRecord` and `handleDeleteSlot` in [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx) to append `.select()` to DELETE queries. If RLS silently blocks the deletion, the query returns 0 rows, triggering a deletion error in the UI.

## How to Avoid in the Future
*   When executing writes under RLS, always append `.select()` or check the number of affected rows to confirm that the row was actually written/deleted rather than silently filtered.

## Affected Files
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
