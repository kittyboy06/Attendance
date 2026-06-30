---
type: adr
id: ADR-003
created: 2026-06-21
status: accepted
tags: [database, schema, relationships, departments, classes]
---

# ADR-003: Department and Class Relational Refactoring

## Context
Previously, classes (e.g. `CS-A`, `CS-B`) were managed directly and mapped to academic roll-calls. The dashboard tab for managing classes was visually labeled "Departments" on the UI but functioned as a direct `classes` list in the database. The user requested a formal separation where "Departments" can be created, "Classes" added inside those departments, and classes associated with academic years (I to IV).

## Decision
We introduced a relational database model in Supabase:
1. Created a new table `departments` with `id`, `name`, and `code`.
2. Added `department_id` and `year` to the existing `classes` table.
3. Seeded default departments (`CSE`, `AIML`, `ECE`, `EEE`, `IT`, `Mechanical`, `Civil`, `General`).
4. Updated the Admin Dashboard "Departments" (ID: `classes`) tab to manage both departments and their constituent classes.
5. Classes are created by selecting a Department, Year (I-IV), Section (optional), and Representative Password.
6. The class name is auto-generated as `[Department Code] - [Year] Yr - [Section]` for clean consistency.
7. Replaced the hardcoded `DEFAULT_DEPARTMENTS` array on the Teacher forms and Profile listing, making sure only user-created departments from the database are available.
8. Updated CSV bulk upload parsers (Teachers, Classes, Students) to query and validate against the new database-backed departments list, and support parsing class details from department name/code, year, and section.

## Reasoning & Trade-offs
*   **Pro**: Proper domain modeling (departments contain classes).
*   **Pro**: Clean visual grouping of classes by department in folder lists.
*   **Pro**: Fully backward-compatible: existing tables, functions, and views query `classes` table directly and still function because class `name` is retained and populated.
*   **Con**: Slightly more form fields required on class creation (must choose department and year).

## Rejected Alternatives
*   **Renaming the `classes` table**: Rejected to prevent breaking database dependencies (RPCs, functions, views, other portals) which query the `classes` table.

## Code References
*   [20260621000100_departments.sql](file:///d:/Projects/Projects/Attendance/supabase/migrations/20260621000100_departments.sql)
*   [AdminDashboard.tsx](file:///d:/Projects/Projects/Attendance/src/components/AdminDashboard.tsx)
