---
type: adr
id: ADR-005
created: 2026-06-21
status: accepted
tags: [architecture, design-decision, holidays, saturdays]
---

# ADR-005: Government Holidays and Saturdays

## Context
The system required a way to track government holidays and flexible Saturdays (some Saturdays are holidays, others are working days). We needed to block attendance session initialization/creation on holidays and display marked holidays in the calendar with custom badges.

## Decision
1.  **Holidays Schema**:
    *   Created `holidays` table with `id` (UUID), `date` (DATE NOT NULL UNIQUE), and `name` (TEXT NOT NULL).
    *   Enabled Row Level Security (RLS) with public read access and full write access for authenticated users (Admins).
2.  **API Block Check**:
    *   Modified the `attendance-api` edge function (`/sessions/create-or-open`) to query the `holidays` table for the target session date.
    *   If a holiday entry exists, the request returns a `400 Bad Request` block with a clear message: `"Cannot log attendance: today is a holiday (Name)"`.
3.  **Holidays & Saturdays Admin Tab**:
    *   Added a sub-tab navigation to the General Settings tab of `AdminDashboard.tsx`, dividing it into "Academic Years" and "Holidays & Saturdays".
    *   Implemented Holiday CRUD form and table list.
    *   Implemented a dedicated **Saturdays Manager** column/panel. If an active academic year exists, it lists all Saturdays in that range. For each Saturday, it displays its status ("Saturday Holiday" vs "Working Saturday") and a quick toggle button ("Make Working" / "Mark Holiday") that inserts/deletes from the `holidays` table under the name `"Saturday Holiday"`.
4.  **Teacher Calendar Badging**:
    *   Configured the monthly calendar inside `TeacherDashboard.tsx` to display a purple holiday badge instead of attendance session counts on dates matching the active holidays list.

## Reasoning & Trade-offs
*   **Pro**: Reusing the single `holidays` table for both custom named holidays and Saturday holidays simplifies queries and logic.
*   **Pro**: Toggling Saturdays directly from a pre-calculated list of Saturdays saves administrative manual input time.
*   **Con**: If no active academic year is configured, the Saturdays list cannot be resolved. The admin is notified to create and set a year active first.

## Code References
*   [holidays migration](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000400_holidays.sql)
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
*   [TeacherDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/TeacherDashboard.tsx)
*   [attendance-api Edge Function](file:///d:/Projects/Projects/Attendance/supabase/functions/attendance-api/index.ts)
