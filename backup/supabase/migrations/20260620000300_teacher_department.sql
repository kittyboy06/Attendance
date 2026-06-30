-- Add department column to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General';
