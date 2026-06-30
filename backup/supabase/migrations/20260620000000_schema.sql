-- Enable pgcrypto extension for bcrypt PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    rep_password_hash TEXT NOT NULL, -- bcrypt hash of shared rep password
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Students Table (using 16-digit register number as PK)
CREATE TABLE IF NOT EXISTS students (
    register_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_register_number_length CHECK (length(register_number) = 16)
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL, -- bcrypt hash of 4-digit PIN
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    assigned_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Timetable Slots Table
CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 7),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_day_period UNIQUE (class_id, day, period)
);

-- Attendance Sessions Table
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    timetable_slot_id UUID NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    subject_id UUID NOT NULL REFERENCES subjects(id), -- Denormalized for historic tracking
    teacher_id UUID NOT NULL REFERENCES teachers(id), -- Denormalized for historic tracking (Scheduled Teacher)
    finalized_by_teacher_id UUID REFERENCES teachers(id), -- Actual finalizer (can be substitute)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_date_slot UNIQUE (date, timetable_slot_id)
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_register_number TEXT NOT NULL REFERENCES students(register_number) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_student UNIQUE (session_id, student_register_number)
);

-- Attempt Limiter for Brute Force PIN Protection
CREATE TABLE IF NOT EXISTS pin_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_success BOOLEAN NOT NULL
);

-- Create dynamic view for student attendance percentages
CREATE OR REPLACE VIEW student_attendance_summary AS
SELECT 
    s.register_number,
    s.name AS student_name,
    s.class_id,
    c.name AS class_name,
    COUNT(CASE WHEN r.status IN ('present', 'late') THEN 1 END) AS attended_count,
    COUNT(r.id) AS total_finalized_count,
    CASE 
        WHEN COUNT(r.id) = 0 THEN 0.00
        ELSE ROUND((COUNT(CASE WHEN r.status IN ('present', 'late') THEN 1 END)::numeric / COUNT(r.id)::numeric) * 100, 2)
    END AS attendance_percentage
FROM students s
JOIN classes c ON s.class_id = c.id
LEFT JOIN attendance_records r ON s.register_number = r.student_register_number
LEFT JOIN attendance_sessions sess ON r.session_id = sess.id AND sess.status = 'finalized'
LEFT JOIN academic_years ay ON sess.date BETWEEN ay.start_date AND ay.end_date AND ay.is_active = true
GROUP BY s.register_number, s.name, s.class_id, c.name;

-- Enable Row-Level Security (RLS) on all tables (will be accessed via service_role by Edge Functions)
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Insert Mock Data
-- Active Academic Year
INSERT INTO academic_years (name, start_date, end_date, is_active)
VALUES ('2026-2027', '2026-06-01', '2027-04-30', true);

-- Classes
-- Rep password is 'reppass123' hashed (bcrypt cost 10)
INSERT INTO classes (id, name, rep_password_hash)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'CS-A', crypt('reppass123', gen_salt('bf', 10))),
  ('b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 'CS-B', crypt('reppass123', gen_salt('bf', 10)));

-- Students (16-digit register numbers)
INSERT INTO students (register_number, name, class_id)
VALUES
  ('2026010101010101', 'Aravind Swamy', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('2026010101010102', 'Bhavana Reddy', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('2026010101010103', 'Chaitanya V', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('2026010101010104', 'Divya Nair', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('2026010101010105', 'Eshwar Prasad', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('2026020202020201', 'Faisal Khan', 'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e'),
  ('2026020202020202', 'Gautham Menon', 'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e');

-- Teachers
-- PINs are '1234', '5678', '9999' hashed
INSERT INTO teachers (id, name, pin_hash)
VALUES
  ('11111111-2222-3333-4444-555555555555', 'Dr. Robert Chen', crypt('1234', gen_salt('bf', 10))),
  ('22222222-3333-4444-5555-666666666666', 'Prof. Sarah Jenkins', crypt('5678', gen_salt('bf', 10))),
  ('33333333-4444-5555-6666-777777777777', 'Dr. Alan Turing', crypt('9999', gen_salt('bf', 10)));

-- Subjects
INSERT INTO subjects (id, code, name, assigned_teacher_id)
VALUES
  ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'CS-301', 'Operating Systems', '11111111-2222-3333-4444-555555555555'),
  ('22222222-aaaa-bbbb-cccc-dddddddddddd', 'CS-302', 'Database Systems', '22222222-3333-4444-5555-666666666666'),
  ('33333333-aaaa-bbbb-cccc-dddddddddddd', 'CS-303', 'Theory of Computation', '33333333-4444-5555-6666-777777777777');

-- Timetable slots for CS-A (Monday and Tuesday)
INSERT INTO timetable_slots (id, class_id, day, period, subject_id, teacher_id)
VALUES
  ('12345678-1111-2222-3333-444455556666', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Monday', 1, '11111111-aaaa-bbbb-cccc-dddddddddddd', '11111111-2222-3333-4444-555555555555'),
  ('12345678-2222-3333-4444-555566667777', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Monday', 2, '22222222-aaaa-bbbb-cccc-dddddddddddd', '22222222-3333-4444-5555-666666666666'),
  ('12345678-3333-4444-5555-666677778888', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Tuesday', 1, '33333333-aaaa-bbbb-cccc-dddddddddddd', '33333333-4444-5555-6666-777777777777');
