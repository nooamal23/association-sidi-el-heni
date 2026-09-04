import { z } from "zod";
import { prisma } from "../../db/prisma.js";

// Part 29/1 — attendance API only. No admin UI consumes these endpoints:
// attendance is recorded by the instructor (المكوّن) in the instructor space,
// which is built in a later phase. These handlers are ready for that wiring.

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صحيح (YYYY-MM-DD).");

const upsertSchema = z.object({
  date: dateSchema,
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        present: z.boolean(),
        note: z.string().max(500).nullish(),
      }),
    )
    .min(1),
});

function dayUtc(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function loadGroup(groupId) {
  return prisma.courseGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      number: true,
      courseId: true,
      course: { select: { id: true, title: true } },
      enrollments: {
        orderBy: { student: { fullName: "asc" } },
        select: {
          id: true,
          student: { select: { id: true, fullName: true, username: true } },
        },
      },
    },
  });
}

/** GET /api/admin/course-groups/:groupId/attendance?date=YYYY-MM-DD */
export async function getAttendance(req, res, next) {
  try {
    const date = dateSchema.parse(
      typeof req.query.date === "string" && req.query.date
        ? req.query.date
        : new Date().toISOString().slice(0, 10),
    );
    const group = await loadGroup(req.params.groupId);
    if (!group) return res.status(404).json({ error: "الفوج غير موجود." });

    const rows = await prisma.attendance.findMany({
      where: {
        courseId: group.courseId,
        sessionDate: dayUtc(date),
        studentId: { in: group.enrollments.map((e) => e.student.id) },
      },
      select: { studentId: true, present: true, note: true },
    });
    const byStudent = new Map(rows.map((r) => [r.studentId, r]));

    res.json({
      date,
      groupId: group.id,
      groupNumber: group.number,
      courseId: group.courseId,
      courseTitle: group.course.title,
      students: group.enrollments.map((e) => {
        const rec = byStudent.get(e.student.id);
        return {
          enrollmentId: e.id,
          studentId: e.student.id,
          fullName: e.student.fullName,
          username: e.student.username,
          present: rec ? rec.present : null,
          note: rec?.note ?? null,
          recorded: Boolean(rec),
        };
      }),
    });
  } catch (e) { next(e); }
}

/** POST /api/admin/course-groups/:groupId/attendance */
export async function upsertAttendance(req, res, next) {
  try {
    const { date, records } = upsertSchema.parse(req.body);
    const group = await loadGroup(req.params.groupId);
    if (!group) return res.status(404).json({ error: "الفوج غير موجود." });

    const enrolled = new Set(group.enrollments.map((e) => e.student.id));
    const foreign = records.filter((r) => !enrolled.has(r.studentId));
    if (foreign.length > 0) {
      return res.status(409).json({
        error: `${foreign.length} من التلاميذ في القائمة غير مسجّلين في هذا الفوج.`,
      });
    }

    const sessionDate = dayUtc(date);
    await prisma.$transaction(
      records.map((r) =>
        prisma.attendance.upsert({
          where: {
            courseId_studentId_sessionDate: {
              courseId: group.courseId,
              studentId: r.studentId,
              sessionDate,
            },
          },
          create: {
            courseId: group.courseId,
            studentId: r.studentId,
            sessionDate,
            present: r.present,
            note: r.note ?? null,
          },
          update: { present: r.present, note: r.note ?? null },
        }),
      ),
    );

    res.json({ ok: true, date, count: records.length });
  } catch (e) { next(e); }
}
