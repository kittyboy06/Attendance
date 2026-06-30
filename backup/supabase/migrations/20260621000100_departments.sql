-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Allow public read access" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add department_id and year to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS year TEXT CHECK (year IN ('I', 'II', 'III', 'IV'));

-- Seed default departments
INSERT INTO departments (name, code)
VALUES
  ('General Department', 'General'),
  ('Computer Science & Engineering', 'CSE'),
  ('Artificial Intelligence & Machine Learning', 'AIML'),
  ('Electronics & Communication Engineering', 'ECE'),
  ('Electrical & Electronics Engineering', 'EEE'),
  ('Information Technology', 'IT'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL')
ON CONFLICT (code) DO NOTHING;

-- Associate existing classes with General Department if they don't have one
UPDATE classes
SET department_id = (SELECT id FROM departments WHERE code = 'General' LIMIT 1),
    year = 'I'
WHERE department_id IS NULL;
