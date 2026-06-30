# Attendance System Constitution

## Core Principles

### I. UX & Design Taste
Every user interface must strictly conform to `DESIGN.md`. We enforce Outfit and Satoshi typography, a Zinc-950 dark canvas, a high-contrast Teal accent, and smooth micro-animations. Emojis, pure black backgrounds, and default system fonts (like Arial or Inter) are strictly banned.

### II. Offline-First PWA Reliability
The Representative dashboard must function even in offline or low-connectivity classroom environments. Attendance draft logs must be stored in browser IndexedDB first and synced automatically via a Service Worker once the internet connection is restored.

### III. Server-Side Security & RLS
We never trust client-side validation. All security operations—including Teacher PIN verification, authorization checks, and student percentage queries—are performed in Supabase Edge Functions. Database tables use Row-Level Security (RLS) to restrict unauthorized updates.

### IV. Decoupled Timetable History
Timetable modifications must not affect historic attendance records. When an attendance session is created, the system must write the current scheduled subject and teacher directly into the session record to ensure historical logs are locked.

### V. Substitute Teacher Flexibility
If a scheduled teacher is absent, any teacher scheduled to teach *any* subject or period in that same class is permitted to act as a substitute and sign off on the attendance session by entering their own unique 4-digit PIN.

## Technology Stack Constraints
*   **Frontend**: React (Vite) + Tailwind CSS + `vite-plugin-pwa`.
*   **Backend/API**: Supabase Edge Functions (Deno/TypeScript).
*   **Database**: Supabase PostgreSQL with `pgcrypto` enabled.

## Development Workflow
1.  All database schema changes must be declared in SQL migration files under `supabase/migrations/`.
2.  Edge Functions must be modularly structured and tested locally using `supabase functions serve`.
3.  Any UI component creation must follow the design tokens in `DESIGN.md`.

**Version**: 1.0.0 | **Ratified**: 2026-06-20 | **Last Amended**: 2026-06-20
