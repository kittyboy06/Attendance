import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log(">>> Reading environment configuration...");
  let envText;
  try {
    envText = fs.readFileSync(".env", "utf-8");
  } catch (err) {
    console.error("Error reading .env file:", err.message);
    process.exit(1);
  }

  const env = {};
  envText.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });

  const supabaseUrl = env["VITE_SUPABASE_URL"];
  const supabaseKey = env["VITE_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
  }

  console.log(`>>> Initializing Supabase client for: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, supabaseKey);

  // 1. Seed Registries (academic years, departments, teachers, classes, subjects, students, timetable slots)
  const registryQuery = `
  DO $$
  DECLARE
      prev_year_id UUID;
      curr_year_id UUID;
      dept_cse_id UUID;
      dept_ece_id UUID;
      dept_mech_id UUID;
      v_class_id UUID;
      v_teacher_id UUID;
      v_subject_id UUID;
      v_slot_id UUID;
      v_student_reg TEXT;
      t_idx INT;
      c_idx INT;
      s_idx INT;
      p_idx INT;
      t_pin_hash TEXT;
      r_pwd_hash TEXT;
  BEGIN
      -- Truncate all tables
      TRUNCATE TABLE admins, academic_years, departments, teachers, subjects, classes, students, timetable_slots, attendance_sessions, attendance_records, holidays, pin_verification_attempts RESTART IDENTITY CASCADE;

      -- Seed Admin Account (automatically hashed by database trigger)
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@college.edu', 'admin123');

      -- Pre-calculate PIN and password hashes
      t_pin_hash := crypt('0000', gen_salt('bf', 10));
      r_pwd_hash := crypt('1111', gen_salt('bf', 10));

      -- Disable teacher hashing trigger
      ALTER TABLE teachers DISABLE TRIGGER trg_hash_teacher_pin;

      -- Academic Years
      INSERT INTO academic_years (name, start_date, end_date, is_active)
      VALUES ('2025-2026', '2025-06-01', '2026-04-30', false)
      RETURNING id INTO prev_year_id;

      INSERT INTO academic_years (name, start_date, end_date, is_active)
      VALUES ('2026-2027', '2026-06-01', '2027-04-30', true)
      RETURNING id INTO curr_year_id;

      -- Holidays
      INSERT INTO holidays (date, name) VALUES
      ('2025-12-25', 'Christmas Day'),
      ('2026-01-01', 'New Year''s Day'),
      ('2026-01-26', 'Republic Day'),
      ('2026-04-14', 'Dr. Ambedkar Jayanti');

      -- Departments
      INSERT INTO departments (name, code) VALUES ('Computer Science & Engineering', 'CSE') RETURNING id INTO dept_cse_id;
      INSERT INTO departments (name, code) VALUES ('Electronics & Communication Engineering', 'ECE') RETURNING id INTO dept_ece_id;
      INSERT INTO departments (name, code) VALUES ('Mechanical Engineering', 'MECH') RETURNING id INTO dept_mech_id;

      -- Teachers (10 per department)
      INSERT INTO teachers (name, pin_hash, department)
      SELECT d.code || ' Teacher ' || t.idx, t_pin_hash, d.code
      FROM departments d
      CROSS JOIN generate_series(1, 10) t(idx);

      -- Classes (CSE, ECE, MECH; Years I, II, III)
      INSERT INTO classes (name, rep_password_hash, department_id, year)
      SELECT d.code || ' - ' || yr.val || ' Yr', r_pwd_hash, d.id, yr.val
      FROM departments d
      CROSS JOIN (
          SELECT 'I'::text as val UNION ALL SELECT 'II' UNION ALL SELECT 'III'
      ) yr;

      -- Subjects (6 per department)
      INSERT INTO subjects (code, name, assigned_teacher_id)
      SELECT 
          CASE WHEN d.code = 'CSE' THEN 'CS-' WHEN d.code = 'ECE' THEN 'EC-' ELSE 'ME-' END || (300 + s.idx),
          d.code || ' Subject ' || s.idx,
          t.id
      FROM departments d
      CROSS JOIN generate_series(1, 6) s(idx)
      JOIN teachers t ON t.department = d.code AND t.name = d.code || ' Teacher ' || s.idx;

      -- Students (300 total, ~33 per class, with CSE Year I getting 34)
      INSERT INTO students (register_number, name, class_id)
      SELECT 
          '2026' || 
          CASE WHEN d.code = 'CSE' THEN '10' WHEN d.code = 'ECE' THEN '20' ELSE '30' END ||
          CASE WHEN c.year = 'I' THEN '1' WHEN c.year = 'II' THEN '2' ELSE '3' END ||
          LPAD(s.idx::text, 9, '0'),
          d.code || ' Student ' || s.idx,
          c.id
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      CROSS JOIN (
          SELECT generate_series(1, 33) as idx
          UNION ALL
          SELECT 34
      ) s
      WHERE NOT (s.idx = 34 AND NOT (d.code = 'CSE' AND c.year = 'I'));

      -- Timetable Slots (Monday to Friday, 5 periods per day per class)
      INSERT INTO timetable_slots (class_id, day, period_id, subject_id, teacher_id)
      SELECT 
          c.id,
          days.day_name,
          p.uuid,
          sub.id,
          sub.assigned_teacher_id
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      CROSS JOIN (
          SELECT 'Monday'::text as day_name, 1 as day_num UNION ALL
          SELECT 'Tuesday', 2 UNION ALL
          SELECT 'Wednesday', 3 UNION ALL
          SELECT 'Thursday', 4 UNION ALL
          SELECT 'Friday', 5
      ) days
      CROSS JOIN (
          SELECT 1 as p_idx, '11111111-1111-1111-1111-111111111111'::UUID as uuid UNION ALL
          SELECT 2, '22222222-2222-2222-2222-222222222222'::UUID UNION ALL
          SELECT 3, '33333333-3333-3333-3333-333333333333'::UUID UNION ALL
          SELECT 4, '44444444-4444-4444-4444-444444444444'::UUID UNION ALL
          SELECT 5, '55555555-5555-5555-5555-555555555555'::UUID
      ) p
      JOIN subjects sub ON sub.code LIKE CASE WHEN d.code = 'CSE' THEN 'CS-%' WHEN d.code = 'ECE' THEN 'EC-%' ELSE 'ME-%' END
        AND sub.code = CASE WHEN d.code = 'CSE' THEN 'CS-' WHEN d.code = 'ECE' THEN 'EC-' ELSE 'ME-' END || (300 + ((p.p_idx + days.day_num) % 6) + 1);

      -- Re-enable trigger
      ALTER TABLE teachers ENABLE TRIGGER trg_hash_teacher_pin;
  END $$;
  `;

  console.log(">>> Seeding registries (Departments, Classes, Teachers, Subjects, Students, Timetable)...");
  const { error: regError } = await client.rpc("execute_sql_query", {
    query_text: registryQuery,
    passcode: "CollegeAttendanceSystemSecureSeedPasscode2026",
  });

  if (regError) {
    console.error(">>> REGISTRY SEEDING FAILED:", regError.message);
    process.exit(1);
  }
  console.log(">>> Registries seeded successfully.");

  // 2. Define Month Ranges for Seeding Logs (to avoid statement timeout, we execute in monthly batches)
  const ranges = [
    { start: "2025-12-01", end: "2025-12-31" },
    { start: "2026-01-01", end: "2026-01-31" },
    { start: "2026-02-01", end: "2026-02-28" },
    { start: "2026-03-01", end: "2026-03-31" },
    { start: "2026-04-01", end: "2026-04-30" },
    { start: "2026-06-01", end: "2026-06-21" }, // June 2026 (skipping May 2026 break)
  ];

  for (const range of ranges) {
    console.log(`>>> Seeding attendance logs from ${range.start} to ${range.end}...`);
    const logsQuery = `
    DO $$
    BEGIN
        -- Seeding Sessions
        INSERT INTO attendance_sessions (date, timetable_slot_id, status, subject_id, teacher_id, finalized_by_teacher_id)
        SELECT 
            d.date,
            ts.id,
            CASE 
                WHEN d.date = '2026-06-21'::date AND ts.period_id IN (
                    '11111111-1111-1111-1111-111111111111'::UUID, 
                    '22222222-2222-2222-2222-222222222222'::UUID
                ) THEN 'draft'
                ELSE 'finalized'
            END,
            ts.subject_id,
            ts.teacher_id,
            CASE 
                WHEN d.date = '2026-06-21'::date AND ts.period_id IN (
                    '11111111-1111-1111-1111-111111111111'::UUID, 
                    '22222222-2222-2222-2222-222222222222'::UUID
                ) THEN NULL
                ELSE ts.teacher_id
            END
        FROM (
            SELECT date::date,
                   CASE EXTRACT(ISODOW FROM date)
                       WHEN 1 THEN 'Monday'
                       WHEN 2 THEN 'Tuesday'
                       WHEN 3 THEN 'Wednesday'
                       WHEN 4 THEN 'Thursday'
                       ELSE 'Friday'
                   END as weekday_name
            FROM generate_series('${range.start}'::date, '${range.end}'::date, '1 day'::interval) date
            WHERE EXTRACT(ISODOW FROM date) NOT IN (6, 7)
              AND date NOT IN ('2025-12-25'::date, '2026-01-01'::date, '2026-01-26'::date, '2026-04-14'::date)
        ) d
        JOIN timetable_slots ts ON ts.day = d.weekday_name;

        -- Seeding Attendance Records
        INSERT INTO attendance_records (session_id, student_register_number, status)
        SELECT 
            sess.id,
            s.register_number,
            CASE 
                WHEN (hashtext(s.register_number || sess.date::text) % 100) BETWEEN -100 AND -90 OR (hashtext(s.register_number || sess.date::text) % 100) BETWEEN 90 AND 100 THEN 'absent'
                WHEN (hashtext(s.register_number || sess.date::text) % 100) BETWEEN -89 AND -85 OR (hashtext(s.register_number || sess.date::text) % 100) BETWEEN 85 AND 89 THEN 'late'
                ELSE 'present'
            END
        FROM attendance_sessions sess
        JOIN timetable_slots ts ON sess.timetable_slot_id = ts.id
        JOIN students s ON ts.class_id = s.class_id
        WHERE sess.date BETWEEN '${range.start}'::date AND '${range.end}'::date;
    END $$;
    `;

    const { error: logsError } = await client.rpc("execute_sql_query", {
      query_text: logsQuery,
      passcode: "CollegeAttendanceSystemSecureSeedPasscode2026",
    });

    if (logsError) {
      console.error(`>>> LOG SEEDING FAILED for range ${range.start} - ${range.end}:`, logsError.message);
      process.exit(1);
    }
  }

  console.log(">>> SEEDING SUCCESSFUL!");
  console.log(">>> Mock database populated with:");
  console.log("  - 3 Departments (CSE, ECE, MECH)");
  console.log("  - 9 Classes (Years I-III)");
  console.log("  - 30 Teachers (PIN = '0000')");
  console.log("  - 18 Subjects");
  console.log("  - 300 Students");
  console.log("  - 5-period daily timetables");
  console.log("  - 6 months of attendance records (Dec 2025 - Jun 2026)");
}

main();
