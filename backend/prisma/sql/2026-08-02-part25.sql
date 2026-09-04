-- Part 25: Level no longer carries hizbCount — the hizb count is entered once,
-- on the group (course_groups.hizb_count). Run once:
--   psql "$DATABASE_URL" -f backend/prisma/sql/2026-08-02-part25.sql

-- Preflight (informational):
--   SELECT count(*) AS levels FROM levels;
--   SELECT count(*) AS groups_without_hizb FROM course_groups WHERE hizb_count = 0;

BEGIN;

-- Carry any level value over to its groups that still have no hizb count,
-- so no operational data is lost before the column disappears.
UPDATE course_groups g
   SET hizb_count = l.hizb_count
  FROM levels l
 WHERE g.level_id = l.id
   AND COALESCE(g.hizb_count, 0) = 0
   AND COALESCE(l.hizb_count, 0) > 0;

ALTER TABLE levels DROP COLUMN IF EXISTS hizb_count;

COMMIT;

-- Part 25 §3: courses now store their pedagogical type explicitly, so
-- «فقه وشريعة» is no longer collapsed into «تحفيظ وتجويد» on reload
-- (which is why the «عدد الأحزاب» field kept appearing for it).
BEGIN;
DO $$ BEGIN
  CREATE TYPE course_type AS ENUM ('quran', 'fiqh', 'training', 'summer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS type course_type NOT NULL DEFAULT 'quran';

UPDATE courses SET type = 'training' WHERE category = 'training';
UPDATE courses SET type = 'summer'   WHERE category = 'summer';
COMMIT;
