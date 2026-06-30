---
type: adr
id: ADR-001
created: 2026-06-20
status: accepted
tags: [architecture, design-decision, backend, database]
---

# ADR-001: College Attendance System Architecture

## Context
We need to design a college attendance system where:
- Class Representatives (Reps) log in via a class dropdown and a shared password.
- Teachers verify and finalize attendance via a unique 4-digit PIN (without a standard login account).
- Students view their live attendance percentages using only their 16-digit register number.
- Admins manage the timetable dynamically using standard email/password authentication.
- Substitute teachers must be allowed to finalize attendance for a class if the scheduled teacher is absent, provided they teach at least one slot in that same class.

## Decision
We will build the application using:
- **Frontend**: React + Vite + Tailwind CSS, configured as a PWA using `vite-plugin-pwa`.
- **Backend**: Supabase Edge Functions (Deno/TypeScript API layer) to handle all custom authentication, session creation, PIN verification, and substitute teacher verification rules.
- **Database**: Supabase PostgreSQL with custom tables for classes, students, and teachers.
- **Authentication**:
  - Admin: Standard Supabase Auth.
  - Reps: Custom JWTs signed by the Edge Function after verifying the class password.
  - Students: Read-only public dashboard accessed via register number lookup.
  - Teachers: Action-level PIN validation checked server-side in Edge Functions using `pgcrypto` crypt/bcrypt.

## Reasoning & Trade-offs
*   **Pro**: Bypasses the need for standard individual Supabase Auth accounts for students and reps, which would require dummy emails and passwords.
*   **Pro**: Centralizes custom business logic (e.g., substitute teacher validation, PIN rate-limiting, PWA sync payloads) in readable TypeScript edge functions instead of complex PostgreSQL trigger functions.
*   **Con**: Requires Deno CLI setup and deployment of edge functions, adding slightly more complexity to the deployment workflow compared to a pure database-centric design.

## Rejected Alternatives
*   **Pure SQL/RPC/RLS Approach (Option 1)**: Rejected because handling class-based shared password authentication, generating custom JWT tokens, and managing rate-limiting for PIN brute-force prevention are highly complex and harder to maintain in raw PL/pgSQL.

## Code References
*   *Greenfield project: implementation files will be created under `src/` and `supabase/functions/`.*
