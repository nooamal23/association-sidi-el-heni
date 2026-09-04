-- Part 29 — attendance/memorization tracking + real dates on news & competitions.
-- Idempotent; safe to re-run.

BEGIN;

-- 2. Memorization progress
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS hizb_completed integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS memorization_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  logged_on     date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memorization_logs_enrollment_id_idx ON memorization_logs (enrollment_id);
CREATE INDEX IF NOT EXISTS memorization_logs_logged_on_idx ON memorization_logs (logged_on);

-- 3. Real dates for the dashboard "upcoming activities" widget
ALTER TABLE news        ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS location text;

COMMIT;
