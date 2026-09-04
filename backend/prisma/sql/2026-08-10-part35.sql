-- Part 35 — frozen auto-generated IDs: MEM-{year}-{seq} for students and
-- N-MEM-{year}-{seq} for competition registrations.
--
-- Preflight (run first to report how many rows need backfilling):
--   SELECT count(*) AS students_to_backfill FROM users WHERE role = 'student' AND member_id IS NULL;
--   SELECT count(*) AS registrations_to_backfill FROM competition_registrations WHERE registration_code IS NULL;

-- 1. Atomic counter table (one row per scheme+year).
CREATE TABLE IF NOT EXISTS id_counters (
  "key"   TEXT PRIMARY KEY,
  "value" INTEGER NOT NULL DEFAULT 0
);

-- 2. New columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_member_id_key ON users (member_id);

ALTER TABLE competition_registrations ADD COLUMN IF NOT EXISTS registration_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS competition_registrations_registration_code_key
  ON competition_registrations (registration_code);

-- 3. Backfill students, per created_at year, oldest first.
WITH ranked AS (
  SELECT id,
         EXTRACT(YEAR FROM created_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM created_at)::int
           ORDER BY created_at ASC, id ASC
         ) AS seq
  FROM users
  WHERE role = 'student' AND member_id IS NULL
)
UPDATE users u
SET member_id = 'MEM-' || r.yr || '-' || LPAD(r.seq::text, 6, '0')
FROM ranked r
WHERE u.id = r.id;

-- 4. Backfill competition registrations, per registered_at year, oldest first.
WITH ranked AS (
  SELECT id,
         EXTRACT(YEAR FROM registered_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM registered_at)::int
           ORDER BY registered_at ASC, id ASC
         ) AS seq
  FROM competition_registrations
  WHERE registration_code IS NULL
)
UPDATE competition_registrations c
SET registration_code = 'N-MEM-' || r.yr || '-' || LPAD(r.seq::text, 6, '0')
FROM ranked r
WHERE c.id = r.id;

ALTER TABLE competition_registrations ALTER COLUMN registration_code SET NOT NULL;

-- 5. Seed the counters from what was just backfilled so new IDs continue the
--    sequence instead of colliding with it.
INSERT INTO id_counters ("key", "value")
SELECT 'MEM-' || split_part(member_id, '-', 2),
       MAX(split_part(member_id, '-', 3)::int)
FROM users
WHERE member_id IS NOT NULL
GROUP BY 1
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

INSERT INTO id_counters ("key", "value")
SELECT 'NMEM-' || split_part(registration_code, '-', 3),
       MAX(split_part(registration_code, '-', 4)::int)
FROM competition_registrations
WHERE registration_code IS NOT NULL
GROUP BY 1
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");
