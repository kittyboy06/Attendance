-- 1. Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create verify_admin_password function
CREATE OR REPLACE FUNCTION verify_admin_password(p_admin_id UUID, p_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT (password_hash = crypt(p_password, password_hash)) INTO v_valid
    FROM admins
    WHERE id = p_admin_id;
    RETURN COALESCE(v_valid, false);
END;
$$ LANGUAGE plpgsql;

-- 3. Create triggers to auto-hash passwords on admins and classes tables
CREATE OR REPLACE FUNCTION hash_admin_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password_hash NOT LIKE '$2%' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_hash_admin_password
BEFORE INSERT OR UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION hash_admin_password_trigger();

CREATE OR REPLACE FUNCTION hash_class_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rep_password_hash NOT LIKE '$2%' THEN
        NEW.rep_password_hash := crypt(NEW.rep_password_hash, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_hash_class_password
BEFORE INSERT OR UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION hash_class_password_trigger();

-- 4. Re-enable Row-Level Security (RLS) on all 12 core tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_periods ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public read access" ON departments;
DROP POLICY IF EXISTS "Allow authenticated full access" ON departments;
DROP POLICY IF EXISTS "Allow public read access" ON academic_years;
DROP POLICY IF EXISTS "Allow authenticated full access" ON academic_years;
DROP POLICY IF EXISTS "Allow public read access" ON classes;
DROP POLICY IF EXISTS "Allow authenticated full access" ON classes;
DROP POLICY IF EXISTS "Allow public read access" ON students;
DROP POLICY IF EXISTS "Allow authenticated full access" ON students;
DROP POLICY IF EXISTS "Allow public read access" ON teachers;
DROP POLICY IF EXISTS "Allow authenticated full access" ON teachers;
DROP POLICY IF EXISTS "Allow public read access" ON subjects;
DROP POLICY IF EXISTS "Allow authenticated full access" ON subjects;
DROP POLICY IF EXISTS "Allow public read access" ON timetable_slots;
DROP POLICY IF EXISTS "Allow authenticated full access" ON timetable_slots;
DROP POLICY IF EXISTS "Allow public read access" ON attendance_sessions;
DROP POLICY IF EXISTS "Allow authenticated full access" ON attendance_sessions;
DROP POLICY IF EXISTS "Allow public read access" ON attendance_records;
DROP POLICY IF EXISTS "Allow authenticated full access" ON attendance_records;
DROP POLICY IF EXISTS "Allow public read access" ON holidays;
DROP POLICY IF EXISTS "Allow authenticated full access" ON holidays;
DROP POLICY IF EXISTS "Allow authenticated full access" ON pin_verification_attempts;
DROP POLICY IF EXISTS "Allow public read access" ON timetable_periods;
DROP POLICY IF EXISTS "Allow authenticated full access" ON timetable_periods;

-- 6. Define secure RLS policies
-- Policy: Admin full access
CREATE POLICY "Admin full access" ON departments FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON academic_years FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON classes FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON students FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON teachers FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON subjects FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON timetable_slots FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON attendance_sessions FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON attendance_records FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON holidays FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON pin_verification_attempts FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');
CREATE POLICY "Admin full access" ON timetable_periods FOR ALL TO authenticated USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

-- Policy: Public read access for setup/login dropdown tables
CREATE POLICY "Public read access" ON departments FOR SELECT USING (true);
CREATE POLICY "Public read access" ON academic_years FOR SELECT USING (true);
CREATE POLICY "Public read access" ON classes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON teachers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON timetable_slots FOR SELECT USING (true);
CREATE POLICY "Public read access" ON holidays FOR SELECT USING (true);
CREATE POLICY "Public read access" ON timetable_periods FOR SELECT USING (true);

-- Policy: Authenticated users (admin, teacher, rep) select access on sessions and records
CREATE POLICY "Authenticated select access" ON attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated select access" ON attendance_records FOR SELECT TO authenticated USING (true);

-- Policy: Restrict students table read access (only admin, teacher, and rep of the class)
CREATE POLICY "Restrict student read access" ON students FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'user_role') = 'admin' OR 
    (auth.jwt() ->> 'user_role') = 'teacher' OR 
    ((auth.jwt() ->> 'user_role') = 'rep' AND class_id = (auth.jwt() ->> 'class_id')::uuid)
);

-- 7. Secure execute_sql_query function to prevent unauthenticated arbitrary SQL injection
CREATE OR REPLACE FUNCTION public.execute_sql_query(query_text text, passcode text DEFAULT '')
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
    result_json jsonb;
    v_user_role text;
BEGIN
    SELECT COALESCE(auth.jwt() ->> 'user_role', '') INTO v_user_role;
    
    IF v_user_role <> 'admin' AND passcode <> 'CollegeAttendanceSystemSecureSeedPasscode2026' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Unauthorized: Admin access or valid passcode required');
    END IF;

    IF query_text ~* '^\s*SELECT' THEN
        EXECUTE 'SELECT jsonb_agg(t) FROM (' || query_text || ') t' INTO result_json;
        RETURN jsonb_build_object('status', 'success', 'data', COALESCE(result_json, '[]'::jsonb));
    ELSE
        EXECUTE query_text;
        RETURN jsonb_build_object('status', 'success');
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
