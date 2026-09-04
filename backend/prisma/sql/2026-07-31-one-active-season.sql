-- Addendum to Part 21 — Section 1b
-- Enforce at most one active season at the database level.
--
-- Run once, manually:  psql "$DATABASE_URL" -f backend/prisma/sql/2026-07-31-one-active-season.sql

BEGIN;

-- 1) Repair existing data: keep only the most recently starting active season.
UPDATE seasons
SET is_active = false
WHERE is_active = true
  AND id <> (
    SELECT id FROM seasons
    WHERE is_active = true
    ORDER BY starts_on DESC, id DESC
    LIMIT 1
  );

-- 2) Partial unique index: at most one row may carry is_active = true.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_season
  ON seasons (is_active)
  WHERE is_active = true;

COMMIT;

-- Verify:
--   SELECT count(*) FROM seasons WHERE is_active = true;  -- must be 0 or 1