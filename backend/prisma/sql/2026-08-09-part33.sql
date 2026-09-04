-- Part 33 — competition registrations + one-time participation receipts.

CREATE TABLE IF NOT EXISTS competition_registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id    UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  external_name     TEXT,
  external_phone    TEXT,
  amount_paid       NUMERIC(10, 3),
  registered_at     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  receipt_issued    BOOLEAN NOT NULL DEFAULT false,
  receipt_issued_at TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS competition_registrations_competition_id_idx
  ON competition_registrations (competition_id);
