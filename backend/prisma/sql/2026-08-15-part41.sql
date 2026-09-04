-- Part 41 — الهيئة التسييرية: frozen MEM-000001 IDs + optional link to an
-- existing instructor (User) instead of duplicating their identity.
--
-- Step 0 (run before, keep the output):
--   SELECT * FROM board_members ORDER BY order_index, created_at;
--   SELECT * FROM id_counters;

BEGIN;

-- 1. New columns. member_id is added nullable first so existing rows can be
--    backfilled, then made NOT NULL.
ALTER TABLE board_members
  ADD COLUMN IF NOT EXISTS member_id     text,
  ADD COLUMN IF NOT EXISTS instructor_id uuid;

-- Identity columns become nullable (they stay null for instructor-linked rows).
ALTER TABLE board_members ALTER COLUMN full_name DROP NOT NULL;

-- 2. Backfill sequential MEM-000001... in order_index / created_at order.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY order_index ASC, created_at ASC, id ASC) AS seq
  FROM board_members
  WHERE member_id IS NULL
)
UPDATE board_members b
SET member_id = 'MEM-' || LPAD((n.seq
      + COALESCE((SELECT MAX(split_part(member_id, '-', 2)::int)
                  FROM board_members WHERE member_id LIKE 'MEM-%'), 0))::text, 6, '0')
FROM numbered n
WHERE b.id = n.id;

ALTER TABLE board_members ALTER COLUMN member_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS board_members_member_id_key
  ON board_members (member_id);

-- 3. Link to users; a deleted user only frees the seat, never deletes the row.
ALTER TABLE board_members
  DROP CONSTRAINT IF EXISTS board_members_instructor_id_fkey;
ALTER TABLE board_members
  ADD CONSTRAINT board_members_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. One board seat per instructor. Postgres treats NULLs as distinct, so a
--    plain unique index already leaves board-only rows unconstrained. The name
--    matches what Prisma expects for @unique on instructorId.
CREATE UNIQUE INDEX IF NOT EXISTS board_members_instructor_id_key
  ON board_members (instructor_id);

-- 4b. Legacy partial index (kept for older deployments; harmless duplicate).
CREATE UNIQUE INDEX IF NOT EXISTS one_board_seat_per_instructor
  ON board_members (instructor_id) WHERE instructor_id IS NOT NULL;

-- 5. Counter: MEM was freed in Part 39; seed it above the highest issued number.
INSERT INTO id_counters ("key", "value")
SELECT 'MEM', COALESCE(MAX(split_part(member_id, '-', 2)::int), 0)
FROM board_members WHERE member_id LIKE 'MEM-%'
ON CONFLICT ("key") DO UPDATE SET "value" = GREATEST(id_counters."value", EXCLUDED."value");

COMMIT;

-- Verification:
--   SELECT member_id, instructor_id, full_name, position FROM board_members ORDER BY created_at;
--   SELECT * FROM id_counters;
--   SELECT indexname FROM pg_indexes WHERE tablename = 'board_members';
