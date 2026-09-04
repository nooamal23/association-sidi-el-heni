-- Part 37 — the student's member number IS their username.
-- Preflight:
--   SELECT count(*) FROM users WHERE role = 'student' AND username <> member_id;

BEGIN;

-- Make sure every student has a member number (MEM-000001 format, no year).
WITH missing AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)
         + COALESCE((SELECT value FROM id_counters WHERE key = 'MEM'), 0) AS seq
  FROM users
  WHERE role = 'student' AND member_id IS NULL
)
UPDATE users u
SET member_id = 'MEM-' || LPAD(m.seq::text, 6, '0')
FROM missing m
WHERE u.id = m.id;

-- One field, one value: username = member_id for every student.
UPDATE users SET username = member_id WHERE role = 'student' AND member_id IS NOT NULL;

-- Keep the counter ahead of the highest issued number.
INSERT INTO id_counters ("key", "value")
SELECT 'MEM', COALESCE(MAX(split_part(member_id, '-', 2)::int), 0)
FROM users WHERE member_id IS NOT NULL
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

COMMIT;
