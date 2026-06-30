-- Create timetable_periods table
CREATE TABLE IF NOT EXISTS timetable_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_academic_period BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Default Seeding Periods with fixed UUIDs
INSERT INTO timetable_periods (id, period_number, name, start_time, end_time, is_academic_period)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 'Period 1', '09:00:00', '09:50:00', true),
  ('22222222-2222-2222-2222-222222222222', 2, 'Period 2', '09:50:00', '10:40:00', true),
  ('bbbbbbbb-1111-1111-1111-111111111111', 3, 'Morning Break', '10:40:00', '11:00:00', false),
  ('33333333-3333-3333-3333-333333333333', 4, 'Period 3', '11:00:00', '11:50:00', true),
  ('44444444-4444-4444-4444-444444444444', 5, 'Period 4', '11:50:00', '12:40:00', true),
  ('bbbbbbbb-2222-2222-2222-222222222222', 6, 'Lunch Break', '12:40:00', '13:40:00', false),
  ('55555555-5555-5555-5555-555555555555', 7, 'Period 5', '13:40:00', '14:30:00', true),
  ('66666666-6666-6666-6666-666666666666', 8, 'Period 6', '14:30:00', '15:20:00', true),
  ('77777777-7777-7777-7777-777777777777', 9, 'Period 7', '15:20:00', '16:10:00', true)
ON CONFLICT (period_number) DO NOTHING;

-- Modify timetable_slots
-- 1. Add period_id column
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES timetable_periods(id) ON DELETE CASCADE;

-- 2. Migrate existing slots to the new period_id mappings based on old period numbers
UPDATE timetable_slots SET period_id = '11111111-1111-1111-1111-111111111111' WHERE period = 1;
UPDATE timetable_slots SET period_id = '22222222-2222-2222-2222-222222222222' WHERE period = 2;
UPDATE timetable_slots SET period_id = '33333333-3333-3333-3333-333333333333' WHERE period = 3;
UPDATE timetable_slots SET period_id = '44444444-4444-4444-4444-444444444444' WHERE period = 4;
UPDATE timetable_slots SET period_id = '55555555-5555-5555-5555-555555555555' WHERE period = 5;
UPDATE timetable_slots SET period_id = '66666666-6666-6666-6666-666666666666' WHERE period = 6;
UPDATE timetable_slots SET period_id = '77777777-7777-7777-7777-777777777777' WHERE period = 7;

-- In case there's any unmapped slot, set a default period_id (Period 1)
UPDATE timetable_slots SET period_id = '11111111-1111-1111-1111-111111111111' WHERE period_id IS NULL;

-- 3. Make period_id NOT NULL
ALTER TABLE timetable_slots ALTER COLUMN period_id SET NOT NULL;

-- 4. Drop old constraints and column
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_period_check;
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS unique_class_day_period;
ALTER TABLE timetable_slots DROP COLUMN IF EXISTS period;

-- 5. Add new unique constraint
ALTER TABLE timetable_slots ADD CONSTRAINT unique_class_day_period_new UNIQUE (class_id, day, period_id);

-- Enable RLS and define policies on timetable_periods
ALTER TABLE timetable_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON timetable_periods FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access" ON timetable_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-hash plain text teacher PINs on insert or update
CREATE OR REPLACE FUNCTION hash_teacher_pin_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pin_hash ~ '^[0-9]{4}$' THEN
        NEW.pin_hash := crypt(NEW.pin_hash, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_hash_teacher_pin
BEFORE INSERT OR UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION hash_teacher_pin_trigger();

