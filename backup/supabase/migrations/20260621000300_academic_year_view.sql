-- Drop the existing view if it exists
DROP VIEW IF EXISTS student_attendance_summary;

-- Recreate view with correct filtering for active academic year
CREATE VIEW student_attendance_summary AS
SELECT 
    s.register_number,
    s.name AS student_name,
    s.class_id,
    c.name AS class_name,
    COUNT(CASE WHEN r.status IN ('present', 'late') AND ay.id IS NOT NULL THEN 1 END) AS attended_count,
    COUNT(CASE WHEN ay.id IS NOT NULL THEN r.id END) AS total_finalized_count,
    CASE 
        WHEN COUNT(CASE WHEN ay.id IS NOT NULL THEN r.id END) = 0 THEN 0.00
        ELSE ROUND((COUNT(CASE WHEN r.status IN ('present', 'late') AND ay.id IS NOT NULL THEN 1 END)::numeric / COUNT(CASE WHEN ay.id IS NOT NULL THEN r.id END)::numeric) * 100, 2)
    END AS attendance_percentage
FROM students s
JOIN classes c ON s.class_id = c.id
LEFT JOIN attendance_records r ON s.register_number = r.student_register_number
LEFT JOIN attendance_sessions sess ON r.session_id = sess.id AND sess.status = 'finalized'
LEFT JOIN academic_years ay ON sess.date BETWEEN ay.start_date AND ay.end_date AND ay.is_active = true
GROUP BY s.register_number, s.name, s.class_id, c.name;
