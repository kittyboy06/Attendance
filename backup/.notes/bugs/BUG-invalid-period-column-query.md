---
type: bug
created: 2026-06-20
status: resolved
tags: [debugging, supabase, postgrest, schema-migration]
---

# Bug: Invalid period Column Query Post-Migration

## Symptom
Console errors showing `Failed to load resource: the server responded with a status of 400 ()` when loading the Teacher and Representative Dashboards, and fetching student attendance history.

## Root Cause
The database schema migration `20260620000200_dynamic_periods.sql` dropped the old integer `period` column from the `timetable_slots` table and replaced it with `period_id` (foreign key to `timetable_periods`). Since the frontend dashboards and Edge Functions were still querying the old `period` column, PostgREST returned a `400 Bad Request` stating the column did not exist.

## Applied Fix
1.  **Backend API**: Refactored the edge function `index.ts` student history query to join `timetable_periods` and fetch the period name and duration strings.
2.  **Rep Dashboard**: Updated `RepDashboard.tsx` to fetch slots joining `timetable_periods`, filter out non-academic periods, and display the formatted times.
3.  **Teacher Dashboard**: Updated `TeacherDashboard.tsx` to query draft/finalized sessions joining `timetable_slots(timetable_periods(*))` and display period names.
4.  **Admin Dashboard**: Removed references to the hardcoded `periods = [1..7]` array and mapped the schedule grid columns dynamically to `periodsList` from the database.

## How to Avoid in the Future
*   Perform full typescript compilation checks (`tsc`) immediately after any schema migrations to catch reference errors early.
*   Validate API and network response schemas in development logs before pushing.

## Affected Files
*   [index.ts](file:///d:/Projects/Projects/Attendance/supabase/functions/attendance-api/index.ts)
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
*   [RepDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/RepDashboard.tsx)
*   [TeacherDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/TeacherDashboard.tsx)
