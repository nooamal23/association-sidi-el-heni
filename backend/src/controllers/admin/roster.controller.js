import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { findStudentScheduleConflicts } from "../../lib/schedule.js";

// Part 27: course roster management — full breakdown of a course's groups,
// available (not-yet-enrolled) students, bulk enroll and single unenroll.

const WEEKDAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

function sortDays(days = []) {
  return [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

/** GET /api/admin/courses/:id/roster */
export async function roster(req, res, next) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, title: true, category: true, type: true, level: true,
        groups: {
          orderBy: { number: "asc" },
          select: {
            id: true, number: true, room: true, capacity: true, hizbCount: true,
            days: true, timeFrom: true, timeTo: true,
            instructor: { select: { id: true, fullName: true } },
            level: { select: { id: true, name: true } },
            enrollments: {
              orderBy: { student: { fullName: "asc" } },
              select: {
                id: true,
                student: { select: { id: true, fullName: true, username: true, phone: true, memberId: true } },
              },
            },
          },
        },
      },
    });
    if (!course) return res.status(404).json({ error: "الدورة غير موجودة." });

    res.json({
      id: course.id,
      title: course.title,
      category: course.category,
      type: course.type,
      level: course.level ?? null,
      groups: course.groups.map((g) => ({
        id: g.id,
        number: g.number,
        room: g.room ?? null,
        capacity: g.capacity,
        hizbCount: g.hizbCount ?? 0,
        days: sortDays(g.days ?? []),
        timeFrom: g.timeFrom ?? null,
        timeTo: g.timeTo ?? null,
        instructorId: g.instructor?.id ?? null,
        instructorName: g.instructor?.fullName ?? null,
        levelId: g.level?.id ?? null,
        levelName: g.level?.name ?? null,
        students: g.enrollments.map((e) => ({
          enrollmentId: e.id,
          id: e.student.id,
          fullName: e.student.fullName,
          username: e.student.username,
          phone: e.student.phone ?? null,
          memberId: e.student.memberId ?? e.student.username ?? null,
        })),
      })),
    });
  } catch (e) { next(e); }
}

/**
 * GET /api/admin/courses/:id/available-students?search=...
 * A student can only belong to one group per course, so anyone already
 * enrolled in THIS course (in any of its groups) is excluded entirely.
 */
export async function availableStudents(req, res, next) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rows = await prisma.user.findMany({
      where: {
        role: "student",
        enrollments: { none: { courseId: req.params.id } },
        ...(search ? { fullName: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, username: true, phone: true, memberId: true },
      take: 500,
    });
    res.json(rows.map((r) => ({ ...r, phone: r.phone ?? null, memberId: r.memberId ?? r.username ?? null })));
  } catch (e) { next(e); }
}

const bulkSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  // Part 28/2 — how to treat student-level schedule conflicts (advisory).
  // "check" (default): stop and report conflicts, enrol nobody.
  // "force": enrol everyone anyway. "skipConflicting": enrol only the rest.
  conflictMode: z.enum(["check", "force", "skipConflicting"]).optional(),
});

/**
 * POST /api/admin/course-groups/:groupId/enrollments
 * All-or-nothing: never partially enrol silently when capacity is short.
 */
export async function bulkEnroll(req, res, next) {
  try {
    const { studentIds, conflictMode = "check" } = bulkSchema.parse(req.body);
    let unique = [...new Set(studentIds)];
    const group = await prisma.courseGroup.findUnique({
      where: { id: req.params.groupId },
      select: {
        id: true, courseId: true, number: true, capacity: true,
        days: true, timeFrom: true, timeTo: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!group) return res.status(404).json({ error: "الفوج غير موجود." });

    // Anyone already enrolled in this course must not be re-added here.
    const alreadyInCourse = await prisma.enrollment.count({
      where: { courseId: group.courseId, studentId: { in: unique } },
    });
    if (alreadyInCourse > 0) {
      return res.status(409).json({
        error: `${alreadyInCourse} من التلاميذ المختارين مسجّلون بالفعل في هذه الدورة. لا يمكن للتلميذ أن ينتمي إلى أكثر من فوج في نفس الدورة.`,
      });
    }

    const remaining = group.capacity - group._count.enrollments;
    if (unique.length > remaining) {
      return res.status(409).json({
        error: `لا يمكن إضافة كل التلاميذ المختارين: الطاقة الاستيعابية المتبقية ${remaining < 0 ? 0 : remaining} فقط (اخترت ${unique.length}). الطاقة القصوى للفوج ${group.capacity} والمسجّلون حاليًا ${group._count.enrollments}.`,
      });
    }

    // Capacity stays a HARD block above. Below is the advisory student-level
    // schedule conflict check (Part 28/2) — the admin decides how to resolve.
    const conflicts = await findStudentScheduleConflicts({
      studentIds: unique,
      days: group.days ?? [],
      timeFrom: group.timeFrom,
      timeTo: group.timeTo,
      excludeGroupId: group.id,
    });

    if (conflicts.length > 0 && conflictMode === "check") {
      return res.status(409).json({
        code: "STUDENT_SCHEDULE_CONFLICT",
        error:
          conflicts.length === 1
            ? `التلميذ ${conflicts[0].fullName} لديه حصة أخرى في نفس اليوم والتوقيت: ${conflicts[0].conflicts.join(" ، ")}`
            : `${conflicts.length} من التلاميذ المختارين لديهم حصص أخرى في نفس اليوم والتوقيت.`,
        conflicts,
      });
    }

    if (conflicts.length > 0 && conflictMode === "skipConflicting") {
      const skip = new Set(conflicts.map((c) => c.studentId));
      unique = unique.filter((id) => !skip.has(id));
      if (unique.length === 0) {
        return res.status(200).json({ ok: true, count: 0, skipped: skip.size });
      }
    }

    await prisma.enrollment.createMany({
      data: unique.map((studentId) => ({ courseId: group.courseId, studentId, groupId: group.id })),
      skipDuplicates: true,
    });
    res.status(201).json({
      ok: true,
      count: unique.length,
      skipped: conflictMode === "skipConflicting" ? conflicts.length : 0,
    });
  } catch (e) { next(e); }
}

/** DELETE /api/admin/enrollments/:id */
export async function removeEnrollment(req, res, next) {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const existing = await prisma.enrollment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: "التسجيل غير موجود." });
    await prisma.enrollment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
