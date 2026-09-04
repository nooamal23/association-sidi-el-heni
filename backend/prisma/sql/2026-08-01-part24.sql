-- Part 24 migration.
--   psql "$DATABASE_URL" -f backend/prisma/sql/2026-08-01-part24.sql
--
-- 1) Course.schedule is vestigial: scheduling lives on course_groups now.
-- 2) student_payments moves from calendar year to season.
--
-- Row-count preflight (run first, on its own):
--   SELECT COUNT(*) FROM student_payments;

BEGIN;

-- (1) drop the legacy free-text course schedule column
ALTER TABLE courses DROP COLUMN IF EXISTS schedule;

-- (2) season-based payments.
-- Best-effort backfill: map each row's calendar year to a season whose date
-- range contains that year; rows with no matching season cannot be kept
-- (season_id is NOT NULL) and are dropped.
ALTER TABLE student_payments ADD COLUMN IF NOT EXISTS season_id integer;

UPDATE student_payments p
SET season_id = s.id
FROM seasons s
WHERE p.season_id IS NULL
  AND make_date(p.year, p.month, 1) BETWEEN s.starts_on AND s.ends_on;

-- Fallback: the currently active season for anything still unmatched.
UPDATE student_payments p
SET season_id = (SELECT id FROM seasons WHERE is_active LIMIT 1)
WHERE p.season_id IS NULL;

DELETE FROM student_payments WHERE season_id IS NULL;

ALTER TABLE student_payments ALTER COLUMN season_id SET NOT NULL;
ALTER TABLE student_payments
  DROP CONSTRAINT IF EXISTS student_payments_student_id_year_month_key;
ALTER TABLE student_payments DROP COLUMN IF EXISTS year;

-- Collapsing several calendar years into one season can produce duplicates for
-- (student, season, month); keep the most recent payment of each triple.
DELETE FROM student_payments p
USING student_payments q
WHERE p.student_id = q.student_id
  AND p.season_id = q.season_id
  AND p.month = q.month
  AND (p.paid_at, p.id) < (q.paid_at, q.id);

ALTER TABLE student_payments
  ADD CONSTRAINT student_payments_season_id_fkey
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS student_payments_student_id_season_id_month_key
  ON student_payments (student_id, season_id, month);
CREATE INDEX IF NOT EXISTS student_payments_season_id_idx
  ON student_payments (season_id);

COMMIT;
