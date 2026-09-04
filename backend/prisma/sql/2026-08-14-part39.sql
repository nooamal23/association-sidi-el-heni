-- Part 39 — student prefix MEM- → STU-, and auto-generated frozen instructor IDs (TCH-000001).
--
-- Preflight (run before):
--   SELECT * FROM id_counters;
--   SELECT username, member_id, role, created_at FROM users WHERE role = 'student'    ORDER BY created_at;
--   SELECT username, member_id, role, created_at FROM users WHERE role = 'instructor' ORDER BY created_at;
--
-- Old → new mapping for instructors is printed by the final SELECT of this file.

BEGIN;

-- 1. Students: MEM-000001 → STU-000001 (same sequence number, both columns).
UPDATE users
SET member_id = 'STU-' || split_part(member_id, '-', 2),
    username  = 'STU-' || split_part(member_id, '-', 2)
WHERE role = 'student' AND member_id LIKE 'MEM-%';

-- Safety net: any student still missing a member number gets one after the max.
WITH missing AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)
         + COALESCE((SELECT MAX(split_part(member_id, '-', 2)::int)
                     FROM users WHERE member_id LIKE 'STU-%'), 0) AS seq
  FROM users
  WHERE role = 'student' AND (member_id IS NULL OR member_id NOT LIKE 'STU-%')
)
UPDATE users u
SET member_id = 'STU-' || LPAD(m.seq::text, 6, '0'),
    username  = 'STU-' || LPAD(m.seq::text, 6, '0')
FROM missing m
WHERE u.id = m.id;

-- 2. Instructors: sequential TCH-000001 by created_at; username = member_id.
--    password_hash is deliberately untouched.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS seq
  FROM users WHERE role = 'instructor'
)
UPDATE users u
SET member_id = 'TCH-' || LPAD(n.seq::text, 6, '0'),
    username  = 'TCH-' || LPAD(n.seq::text, 6, '0')
FROM numbered n
WHERE u.id = n.id;

-- 3. Counters: rename MEM → STU preserving its value, seed TCH.
INSERT INTO id_counters ("key", "value")
SELECT 'STU', COALESCE((SELECT value FROM id_counters WHERE key = 'MEM'), 0)
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

DELETE FROM id_counters WHERE "key" = 'MEM';

-- Never below the highest issued student number.
INSERT INTO id_counters ("key", "value")
SELECT 'STU', COALESCE(MAX(split_part(member_id, '-', 2)::int), 0)
FROM users WHERE member_id LIKE 'STU-%'
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

INSERT INTO id_counters ("key", "value")
SELECT 'TCH', COALESCE(MAX(split_part(member_id, '-', 2)::int), 0)
FROM users WHERE member_id LIKE 'TCH-%'
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

COMMIT;

-- Verification:
--   SELECT * FROM id_counters;
--   SELECT username, member_id, role FROM users WHERE role IN ('student','instructor') ORDER BY role, created_at;
--   SELECT full_name, username AS new_username FROM users WHERE role = 'instructor' ORDER BY username;
