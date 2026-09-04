-- Part 21 / section 1 — PREFLIGHT: run this FIRST on the production database
-- and report the numbers back before running the migration.
-- It is read-only.

SELECT 'legacy groups rows'              AS what, COUNT(*) AS n FROM groups
UNION ALL
SELECT 'users linked to a legacy group', COUNT(*) FROM users WHERE group_id IS NOT NULL
UNION ALL
SELECT 'course_groups rows',             COUNT(*) FROM course_groups
UNION ALL
SELECT 'courses with an instructor',     COUNT(*) FROM courses WHERE instructor_id IS NOT NULL
UNION ALL
SELECT 'courses with days set',          COUNT(*) FROM courses WHERE array_length(days, 1) > 0
UNION ALL
SELECT 'courses with a time range',      COUNT(*) FROM courses WHERE time_from IS NOT NULL OR time_to IS NOT NULL
UNION ALL
SELECT 'enrollments without a group',    COUNT(*) FROM enrollments WHERE group_id IS NULL;