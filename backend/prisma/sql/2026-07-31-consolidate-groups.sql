-- Part 21 / section 1 — non-destructive migration + backfill.
--
-- Run order on the server:
--   1) psql "$DATABASE_URL" -f prisma/sql/2026-07-31-preflight-counts.sql   (report the numbers)
--   2) pg_dump backup
--   3) psql "$DATABASE_URL" -f prisma/sql/2026-07-31-consolidate-groups.sql (this file)
--   4) npx prisma generate     (schema.prisma already matches the result)
--
-- Do NOT run `prisma db push` before this file: db:push would drop
-- courses.instructor_id / days / time_from / time_to and the `groups` table
-- without copying anything over.

BEGIN;

-- 1. New CourseGroup columns -------------------------------------------------
ALTER TABLE course_groups
  ADD COLUMN IF NOT EXISTS level_id      uuid,
  ADD COLUMN IF NOT EXISTS instructor_id uuid,
  ADD COLUMN IF NOT EXISTS room          text,
  ADD COLUMN IF NOT EXISTS capacity      integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS days          integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_from     text,
  ADD COLUMN IF NOT EXISTS time_to       text;

ALTER TABLE course_groups
  DROP CONSTRAINT IF EXISTS course_groups_level_id_fkey,
  ADD  CONSTRAINT course_groups_level_id_fkey
       FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL;

ALTER TABLE course_groups
  DROP CONSTRAINT IF EXISTS course_groups_instructor_id_fkey,
  ADD  CONSTRAINT course_groups_instructor_id_fkey
       FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS course_groups_instructor_id_idx ON course_groups (instructor_id);

-- 2. Every course must have at least one group (فوج 1) so nothing is orphaned.
INSERT INTO course_groups (id, course_id, number, hizb_count, capacity, days, time_from, time_to, instructor_id, created_at)
SELECT gen_random_uuid(), c.id, 1, 0, c.capacity, c.days, c.time_from, c.time_to, c.instructor_id, now()
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM course_groups g WHERE g.course_id = c.id);

-- 3. Backfill: copy the course-level instructor / schedule onto its groups.
UPDATE course_groups g
SET instructor_id = COALESCE(g.instructor_id, c.instructor_id),
    days          = CASE WHEN COALESCE(array_length(g.days, 1), 0) = 0 THEN c.days ELSE g.days END,
    time_from     = COALESCE(g.time_from, c.time_from),
    time_to       = COALESCE(g.time_to, c.time_to),
    capacity      = CASE WHEN g.capacity = 25 THEN c.capacity ELSE g.capacity END
FROM courses c
WHERE c.id = g.course_id;

-- 4. Enrollment.group_id becomes required: attach group-less enrollments to
--    the lowest-numbered group of their course.
UPDATE enrollments e
SET group_id = g.id
FROM (
  SELECT DISTINCT ON (course_id) course_id, id
  FROM course_groups ORDER BY course_id, number ASC
) g
WHERE e.group_id IS NULL AND g.course_id = e.course_id;

DELETE FROM enrollments WHERE group_id IS NULL; -- only possible if the course vanished

ALTER TABLE enrollments ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_group_id_fkey;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES course_groups(id) ON DELETE CASCADE;

-- 5. Drop the moved course columns.
ALTER TABLE courses
  DROP COLUMN IF EXISTS instructor_id,
  DROP COLUMN IF EXISTS days,
  DROP COLUMN IF EXISTS time_from,
  DROP COLUMN IF EXISTS time_to;

-- 6. Drop the legacy global Group system.
--    NOTE: a legacy `groups` row is not course-scoped, so it cannot be mapped
--    automatically onto a CourseGroup. If the preflight showed rows here,
--    stop and decide the mapping manually before running this section.
ALTER TABLE users DROP COLUMN IF EXISTS group_id;
DROP TABLE IF EXISTS groups;

COMMIT;