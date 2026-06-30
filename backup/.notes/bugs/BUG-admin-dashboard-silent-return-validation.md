---
type: bug
created: 2026-06-29
status: resolved
tags: [debugging, frontend, validation]
---

# Bug: Silent Class Registry Insertion Failure on Blank Representative Password

## Symptom
Clicking the "Add Class" button in the Admin Dashboard did nothing. No class was created, and no validation error was presented to the user.

## Root Cause
1. **Placeholder Confusion**: The "Rep Shared Password" field had a placeholder `"reppass123"`. Users believed this was pre-populated, leaving the field empty.
2. **Silent Validation Return**: The `addClass` function in `AdminDashboard.tsx` had a guard statement:
   `if (!newClassDeptId || !newClassYear || !newClassPassword) return;`
   Because `newClassPassword` was empty, the function exited silently with no feedback.
3. **RPC Result Parsing**: The code destructured `{ error }` from the Supabase RPC return but ignored `{ data }`. Since `execute_sql_query` returned validation error payloads in the JSON response rather than raising a Postgres error, the call succeeded with `{ error: null, data: { status: 'error', ... } }`, causing the UI to falsely report success (`Created class!`).

## Applied Fix
1. Prefilled `newClassPassword` state to `"reppass123"` by default so that the placeholder value is active if unmodified.
2. Added detailed form validation checks in `addClass` that raise a clear error `setDbError(...)` instead of returning silently.
3. Added fallback checking for the RPC's JSON status to ensure errors returned in the payload correctly invoke the fallback insert handler.

## How to Avoid in the Future
*   Avoid silent returns in event handlers. Always provide user-facing error feedback when validation fails.
*   Ensure default fallback values are initialized in React state if a placeholder represents a recommended default.

## Affected Files
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
