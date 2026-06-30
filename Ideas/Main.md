Need A Attendence system for college with seperate dashboard for student. Attendence is taken by rep and finalised by teacher by their unique 4-digit password. the attendence should taken in each class period and finalised by seperate teacher. Student dashboard should show their attendence percentage from start of acadamic yr to end. Admin has the whole access of setting timetable dynamically and assigning teachers to that. Teacher info like name and passward. Subject into like name and code. Creating timetable for class like a rows and column and setting the timetable. Use supabase for this. 

Database Schema (Supabase)
Here's what your tables look like — clean and minimal:
users — auth.users linked to roles (admin | teacher | rep | student), class/section assignment
subjects — name, code, assigned teacher FK
timetable_slots — class_id, day (Mon–Sat), period number (1–7), subject FK, teacher FK. Admin builds this as the grid.
attendance_sessions — one row per (date, timetable_slot). Status: not_started → draft → finalized. The period "opens" when rep marks, "locks" when teacher enters PIN.
attendance_records — one row per (session, student). present | absent | late. Immutable once session is finalized.
academic_year — start date, end date. Drives the % calculation window.
The student percentage is a PostgreSQL view that counts present records divided by total finalized sessions for their class — so it's always live.

Key Implementation Notes
PIN security: Never store the PIN in plain text. Use pgcrypto's crypt() in Supabase with bcrypt — the teacher enters it on the frontend, you send it to an RPC function that verifies it server-side. Never expose the hash to the client.
Timetable builder UI: A simple HTML table grid — rows = periods (1–7), columns = days (Mon–Sat). Each cell is a dropdown to pick the subject. On save, you upsert into timetable_slots. This is trivially easy in React but would be a nightmare in React Native.
Realtime flow: When the rep submits the roll, the session moves to draft. The teacher's screen (which is subscribed to that session via Supabase Realtime) lights up with a "Finalize now" button. Teacher enters 4-digit PIN → RPC call verifies → session goes to finalized → student percentages update.
PWA setup: Just add a vite-plugin-pwa with a manifest. Students get an "Add to homescreen" prompt on Android/iOS and it behaves like an app.

Stack Summary
LayerChoiceWhyFrontendReact + Vite + TailwindFast dev, great for grid UIAuthSupabase AuthBuilt-in roles, RLSDBSupabase PostgreSQLViews for % calc, RPC for PIN verifyRealtimeSupabase RealtimeRep → Teacher live updateMobilePWA (vite-plugin-pwa)No app store neededHostingVercel / NetlifyFree tier is enough

Students can enter their 16-digit register number to see their dashboard and can also see the past attendence sheet. Like when they are absent. and for attendance dashboard there should be a rep password

Finalized System Spec
Auth model:

Admin → email + password (Supabase Auth)
Teacher → unique 4-digit PIN to finalize attendance (not a login, just a per-action verification)
Rep → one shared class password per class (simple login, no email needed)
Student → 16-digit register number only (no password, public-ish dashboard)