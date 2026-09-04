-- Part 36 — corrects Part 35:
--   * student member IDs lose the year segment: MEM-000001, one ongoing sequence
--   * competition registration codes (N-MEM-{year}-{seq}) are EXTERNAL-only;
--     internal participants reuse the student's own member_id.
--
-- Preflight (run first):
--   SELECT count(*) AS students_total FROM users WHERE role = 'student';
--   SELECT count(*) AS students_missing_id FROM users WHERE role = 'student' AND member_id IS NULL;
--   SELECT count(*) AS internal_regs_with_code FROM competition_registrations WHERE student_id IS NOT NULL AND registration_code IS NOT NULL;

BEGIN;

-- 1. registration_code becomes nullable; internal registrations drop their code.
ALTER TABLE competition_registrations ALTER COLUMN registration_code DROP NOT NULL;
UPDATE competition_registrations SET registration_code = NULL WHERE student_id IS NOT NULL;

-- 2. Re-issue every student member_id in the new year-less format, oldest first.
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id TEXT;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS seq
  FROM users
  WHERE role = 'student'
)
UPDATE users u
SET member_id = 'MEM-' || LPAD(r.seq::text, 6, '0')
FROM ranked r
WHERE u.id = r.id;

-- Non-students never carry a member number.
UPDATE users SET member_id = NULL WHERE role <> 'student' AND member_id IS NOT NULL;

-- 3. Counters: single ongoing "MEM" key; drop the obsolete per-year MEM-{year} keys.
DELETE FROM id_counters WHERE "key" LIKE 'MEM-%';

INSERT INTO id_counters ("key", "value")
SELECT 'MEM', COALESCE(MAX(split_part(member_id, '-', 2)::int), 0)
FROM users
WHERE member_id IS NOT NULL
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

-- NMEM-{year} counters stay exactly as they are (external codes are unchanged).

COMMIT;
