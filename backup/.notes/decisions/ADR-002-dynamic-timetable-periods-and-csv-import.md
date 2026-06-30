---
type: adr
id: ADR-002
created: 2026-06-20
status: accepted
tags: [architecture, database, schema-migration, CSV-import]
---

# ADR-002: Dynamic Timetable Periods and CSV Bulk Import

## Context
We need to support a fully flexible timetable schedule rather than a fixed 7-period day. The Admin must be able to configure periods (number of periods, display names, start/end times, and breaks/lunch markings). Additionally, we need to allow the Admin to import bulk data for Teachers, Subjects, Students, and Periods using CSV text/file uploads.

## Decision
1.  **Database schema modifications**:
    *   Created `timetable_periods` table to store period configurations.
    *   Replaced the integer `period` column in `timetable_slots` with `period_id` (foreign key referring to `timetable_periods.id`).
    *   Added database triggers to automatically hash plain text teacher PINs on insertion.
2.  **Timetable display logic**:
    *   The Admin Dashboard timetable grid renders columns dynamically by iterating over `timetable_periods` instead of hardcoded numbers.
    *   Non-academic periods (breaks/lunch) are rendered as locked, greyed-out cells in the grid, preventing teachers or subjects from being assigned.
    *   Representative (Rep) Dashboard fetches slots and filters out non-academic periods.
    *   Teacher and Rep Dashboards display period names and start/end times.
3.  **CSV Bulk Import**:
    *   Implemented client-side parsing of pasted CSV text in the Admin Dashboard.
    *   Validated CSV headers and mapped referenced names (like teacher name to `assigned_teacher_id` or class name to `class_id`) to perform bulk inserts using Supabase Client.

## Reasoning & Trade-offs
*   **Pro**: High flexibility—schedule configurations can scale from 4 to 10+ periods without code changes.
*   **Pro**: Offloads PIN hashing to PostgreSQL triggers, simplifying client-side bulk upload logic and ensuring security.
*   **Con**: Joined table queries are slightly more complex because `timetable_slots` references multiple related tables, requiring explicit relationship naming in Supabase queries.

## Code References
*   *Database Migration*: [20260620000200_dynamic_periods.sql](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260620000200_dynamic_periods.sql)
*   *Edge Functions*: [index.ts](file:///d:/Projects/Projects/Attendance/supabase/functions/attendance-api/index.ts)
*   *Admin UI*: [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
*   *Rep UI*: [RepDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/RepDashboard.tsx)
*   *Teacher UI*: [TeacherDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/TeacherDashboard.tsx)
