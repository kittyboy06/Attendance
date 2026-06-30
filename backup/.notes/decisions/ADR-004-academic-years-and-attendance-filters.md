---
type: adr
id: ADR-004
created: 2026-06-21
status: accepted
tags: [architecture, design-decision, academic-years, filtering]
---

# ADR-004: Academic Years and Attendance Filters

## Context
The system needed a way to dynamically calculate attendance percentages and statistics based on a configurable academic year range (start and end dates) managed by administrators. Additionally, students needed to filter their attendance log history (e.g., viewing only absent records) in the student portal.

## Decision
1.  **Academic Year Date Boundaries**:
    *   Added a General Settings tab to the Admin Dashboard (`AdminDashboard.tsx`) with full CRUD support for the `academic_years` table.
    *   Marking an academic year as "Active" sets `is_active = true` for that row and `is_active = false` for all other rows.
2.  **Attendance Calculations**:
    *   Modified the `student_attendance_summary` database view to only aggregate attendance records where the session's date falls within the start and end dates of the active academic year.
    *   Updated the `/student/dashboard` Edge Function endpoint to fetch the active academic year and filter log history records within that range.
3.  **Student Log Status Filters**:
    *   Implemented client-side status filter buttons (All, Present, Absent, Late) with count badges in the Student Dashboard (`StudentDashboard.tsx`) to allow students to filter and inspect their attendance log.

## Reasoning & Trade-offs
*   **Pro**: A single database view controls attendance statistics across both student and teacher portals, ensuring data consistency.
*   **Pro**: Post-filtering logs in the Edge Function is lightweight and avoids complex SQL joins or API constraints.
*   **Con**: If no academic year is marked as active, calculations fall back to 0.00%, which requires administrators to always maintain an active year.

## Code References
*   [student_attendance_summary view](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000300_academic_year_view.sql)
*   [StudentDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/StudentDashboard.tsx)
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
*   [attendance-api Edge Function](file:///d:/Projects/Projects/Attendance/supabase/functions/attendance-api/index.ts)
