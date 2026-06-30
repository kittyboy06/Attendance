-- Enable read access for all users (anon and authenticated)
CREATE POLICY "Allow public read access" ON academic_years FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON timetable_slots FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON attendance_records FOR SELECT USING (true);

-- Enable full access for authenticated users (Admins)
CREATE POLICY "Allow authenticated full access" ON academic_years FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON timetable_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON attendance_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON pin_verification_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);
