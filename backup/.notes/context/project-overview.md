---
type: context
created: 2026-06-20
status: accepted
tags: [attendance-system, education, college]
---

# Project Overview: College Attendance System

## Description
A comprehensive college attendance tracking system designed with custom dashboards for students, representatives (Reps), teachers, and administrators. Attendance is logged per class period by the Rep and verified/finalized by the teacher using a unique 4-digit PIN.

## Architecture & Tech Stack
- **Frontend**: React + Vite + Tailwind CSS (PWA via `vite-plugin-pwa`)
- **Backend/API**: Supabase Edge Functions (TypeScript/Deno)
- **Database**: Supabase PostgreSQL
- **Hosting**: Vercel or Netlify

## Current Phase
- **Verification and Hand-off**: All dashboards, database schemas, PWA offline configurations, and API edge functions have been built, verified, and environment variables separated securely.

## Recent Changes
- *2026-06-20*: Completed brainstorming and requirements clarification.
- *2026-06-20*: Documented architecture decisions in [[ADR-001-college-attendance-system-architecture]].
- *2026-06-20*: Implemented PostgreSQL schemas, RPC functions, and mock data.
- *2026-06-20*: Created and deployed Deno Edge Functions for rep auth, substitute verification, and student dashboard logs.
- *2026-06-20*: Developed student, rep, teacher, and admin React dashboards matching the premium Zinc-950 UI design guidelines.
- *2026-06-20*: Configured offline queue with IndexedDB and auto-sync worker.
- *2026-06-20*: Separated all environment variables into `.env` file, created `.env.example`, added `.gitignore`, and made Vite config dynamically resolve the caching patterns.
- *2026-06-20*: Implemented dynamic timetable period scheduling, dynamic column headers, and locked break/lunch slots.
- *2026-06-20*: Created CSV bulk import modal parsers for students, teachers, subjects, and periods, and resolved queries bugs.
- *2026-06-20*: Added decision record [[ADR-002-dynamic-timetable-periods-and-csv-import]] and resolved bug log [[BUG-invalid-period-column-query]].
- *2026-06-21*: Refactored the Class Schedule Editor timetable grid in [[AdminDashboard.tsx]] to render period and break slots as compact horizontal rectangles instead of tall vertical rectangles.
- *2026-06-21*: Added `department` column to `teachers` table via database migration, updating forms (now using a department dropdown select), department folder list grouping, and CSV bulk importers.
- *2026-06-21*: Refactored folder lists in Admin registry panels to enforce scrollable max heights inside expanded folders, solving registry scrolling bugs.
- *2026-06-21*: Implemented a dedicated `departments` table and linked `classes` to departments with academic year selections (I-IV) via database migration [[ADR-003-department-and-classes-relationship]], updating the Admin tab into a unified Departments & Classes manager.
- *2026-06-21*: Updated the Seed CSV templates (teacher.csv, stud.csv, and added classes.csv) to align with the new department-relational database structure.
- *2026-06-21*: Implemented Edit buttons and forms for all sections of the Admin Dashboard (Teachers, Subjects, Departments, Classes, Students, and Periods), linking them back to the database.
- *2026-06-21*: Updated the Teacher Dashboard to fetch and display the department codes of teachers in draft/finalized session listings and dropdown selects.
- *2026-06-21*: Refactored the Teacher Dashboard to implement dynamic department & year setup selections, profile selection, 4-digit security PIN login keypad, interactive monthly calendar with aggregated counts, student registers editing, and department analytics.
- *2026-06-21*: Added academic year settings in [[AdminDashboard.tsx]] and updated `student_attendance_summary` view and student logs API to filter/calculate statistics based on active academic year [[ADR-004-academic-years-and-attendance-filters]].
- *2026-06-21*: Implemented status filters (All, Present, Absent, Late) with count badges in [[StudentDashboard.tsx]].
- *2026-06-21*: Added Holidays & Saturdays manager sub-tab inside the General Settings panel in [[AdminDashboard.tsx]], with Holiday CRUD and an interactive Saturdays toggler [[ADR-005-government-holidays-and-saturdays]].
- *2026-06-21*: Disabled Row-Level Security (RLS) on all core database tables (departments, academic_years, classes, students, teachers, subjects, timetable_slots, attendance_sessions, attendance_records, holidays, pin_verification_attempts, timetable_periods) to support anon access, and verified CRUD views across all Admin dashboard tabs.
- *2026-06-21*: Re-enabled RLS on all 12 core database tables, secured `execute_sql_query` with a seed passcode, and designed a custom dynamic JWT auth header mapping in [[supabaseClient.ts]] backed by a PostgreSQL custom token claims parser [[ADR-006-custom-jwt-auth-and-rls-hardening]].
- *2026-06-21*: Resolved a PostgreSQL function overloading issue on `execute_sql_query` by dropping the old un-passcoded function signature [[BUG-execute-sql-overloading]].
- *2026-06-21*: Fixed a false positive deletion success bug in the Admin Dashboard by requiring a valid JWT session token and verifying affected rows using PostgREST `.select()` [[BUG-admin-delete-rls-bypass]].
- *2026-06-29*: Resolved Admin JWT custom claims extraction bug by updating `execute_sql_query` to utilize `public.jwt_claims()` instead of `auth.jwt()` [[BUG-execute-sql-custom-jwt]].
- *2026-06-29*: Fixed Admin Dashboard "Add Class" silent validation bug and pre-populated the default Class Representative shared password [[BUG-admin-dashboard-silent-return-validation]].


## Open Issues / Tasks
- [x] Complete brainstorming session to lock requirements.
- [x] Create system specification and architecture decision records (ADRs).
- [x] Initialize the project repository and design tokens.
- [x] Implement schema migration, offline queue utility, and all dashboard views.
- [x] Decouple environment configuration and secure variables.

