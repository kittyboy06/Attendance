CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Enable public read access
CREATE POLICY "Allow public read access" ON holidays FOR SELECT USING (true);

-- Enable full access for authenticated users (Admins)
CREATE POLICY "Allow authenticated full access" ON holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);
