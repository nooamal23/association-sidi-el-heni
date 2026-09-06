-- Part 45 — competition announcements become first-class database rows.
-- Adds the announcement fields that used to live only in the browser
-- (description / deadline / image) plus the new "مجال المسابقة" + "عدد الأحزاب".
-- Idempotent; safe to re-run.

BEGIN;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS field       text,          -- tajwid | hifz | hifz_tajwid | fiqh | sharia
  ADD COLUMN IF NOT EXISTS hizb_count  integer,       -- only for hifz / hifz_tajwid
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS deadline    date,
  ADD COLUMN IF NOT EXISTS image_url   text;

-- Keep the value set closed at the database level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competitions_field_check'
  ) THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_field_check
      CHECK (field IS NULL OR field IN ('tajwid','hifz','hifz_tajwid','fiqh','sharia'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competitions_hizb_count_check'
  ) THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_hizb_count_check
      CHECK (hizb_count IS NULL OR (hizb_count >= 1 AND hizb_count <= 60));
  END IF;
END $$;

-- The public/admin lists sort on these two.
CREATE INDEX IF NOT EXISTS competitions_event_date_idx ON competitions (event_date DESC);
CREATE INDEX IF NOT EXISTS competitions_deadline_idx   ON competitions (deadline);

COMMIT;
