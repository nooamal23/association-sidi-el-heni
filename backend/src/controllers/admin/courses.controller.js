import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { firstGroupId, findCapacityError, findInstructorConflict } from "../../lib/schedule.js";
import { findSeasonRangeError } from "../../lib/course-dates.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const courseSchema = z.object({
  title: z.string().min(2),
  category: z.enum(["children", "women", "men", "training", "summer"]),
  type: z.enum(["quran", "fiqh", "training", "summer"]).optional(),
  level: z.string().min(1).optional(),
  capacity: z.number().int().positive().default(25),
  instructorId: z.string().uuid().nullable().optional(),
  seasonId: z.number().int().nullable().optional(),
  isPublished: z.boolean().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  timeFrom: z.string().regex(timeRegex).optional().nullable(),
  timeTo: z.string().regex(timeRegex).optional().nullable(),
});

const courseListSelect = {
  id: true, title: true, category: true, type: true, level: true,
  capacity: true, seasonId: true, isPublished: true,
  startDate: true, endDate: true,
  createdAt: true,
  groups: {
    orderBy: { number: "asc" },
    select: {
      id: true, number: true, instructorId: true, days: true,
      timeFrom: true, timeTo: true, capacity: true, room: true,
      instructor: { select: { fullName: true } },
    },
  },
  _count: { select: { enrollments: true } },
  enrollments: { select: { studentId: true } },
};

function serializeCourse(c) {
  // Scheduling/instructor now live on CourseGroup. The course-level fields are
  // derived from the first (lowest-numbered) group for backwards compatibility.
  const g = c.groups?.[0] ?? null;
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    type: c.type,
    level: c.level ?? null,
    capacity: c.capacity,
    instructorId: g?.instructorId ?? null,
    seasonId: c.seasonId,
    isPublished: c.isPublished,
    startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
    endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
    days: g?.days ?? [],
    timeFrom: g?.timeFrom ?? null,
    timeTo: g?.timeTo ?? null,
    instructorName: g?.instructor?.fullName ?? null,
    groupsCount: c.groups?.length ?? 0,
    enrolled: c._count?.enrollments ?? 0,
    studentIds: c.enrollments?.map(e => e.studentId) ?? [],
  };
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: courseListSelect,
    });
    res.json(rows.map(serializeCourse));
  } catch (e) { next(e); }
}

// Part 24 §4: course dates must sit inside the linked season's range.
async function seasonRangeError({ seasonId, startDate, endDate }) {
  if (!seasonId) return null;
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { name: true, startsOn: true, endsOn: true },
  });
  if (!season) return null;
  return findSeasonRangeError({ season, startDate, endDate });
}

export async function create(req, res, next) {
  try {
    const c = courseSchema.parse(req.body);
    // Part 48: a new course is always attached to the currently active season.
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!activeSeason) {
      return res.status(409).json({
        error: "لا يوجد موسم دراسي نشط حالياً — يرجى تفعيل موسم من صفحة المواسم الدراسية أولاً.",
      });
    }
    const seasonId = activeSeason.id;
    const rangeError = await seasonRangeError({
      seasonId,
      startDate: c.startDate ?? null,
      endDate: c.endDate ?? null,
    });
    if (rangeError) return res.status(409).json({ error: rangeError });
    const conflict = await findInstructorConflict({
      instructorId: c.instructorId ?? null,
      days: c.days ?? [],
      timeFrom: c.timeFrom ?? null,
      timeTo: c.timeTo ?? null,
    });
    if (conflict) return res.status(409).json({ error: conflict });
    const course = await prisma.course.create({
      data: {
        title: c.title,
        category: c.category,
        type: c.type ?? "quran",
        level: c.level ?? "all",
        capacity: c.capacity,
        seasonId,

        isPublished: c.isPublished ?? true,
        startDate: c.startDate ? new Date(c.startDate) : null,
        endDate: c.endDate ? new Date(c.endDate) : null,
        // No group is auto-created: the admin adds every فوج explicitly.
      },
      select: courseListSelect,
    });
    res.status(201).json(serializeCourse(course));
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = courseSchema.partial().parse(req.body);
    const { instructorId, days, timeFrom, timeTo, ...rest } = patch;
    const data = { ...rest };
    if (patch.startDate !== undefined) data.startDate = patch.startDate ? new Date(patch.startDate) : null;
    if (patch.endDate !== undefined) data.endDate = patch.endDate ? new Date(patch.endDate) : null;

    const current = await prisma.course.findUnique({
      where: { id: req.params.id },
      select: { seasonId: true, startDate: true, endDate: true },
    });
    if (!current) return res.status(404).json({ error: "الدورة غير موجودة." });
    const rangeError = await seasonRangeError({
      seasonId: patch.seasonId !== undefined ? patch.seasonId : current.seasonId,
      startDate: patch.startDate !== undefined ? patch.startDate : current.startDate,
      endDate: patch.endDate !== undefined ? patch.endDate : current.endDate,
    });
    if (rangeError) return res.status(409).json({ error: rangeError });

    // Schedule/instructor edits are applied to the course's first group.
    const touchesSchedule =
      instructorId !== undefined || days !== undefined ||
      timeFrom !== undefined || timeTo !== undefined;
    let groupId = null;
    if (touchesSchedule) {
      groupId = await firstGroupId(req.params.id);
      if (!groupId) {
        return res.status(409).json({
          error: "لا يوجد أي فوج في هذه الدورة. أضف فوجاً أولاً ثم حدّد المعلم وأوقات الحصص على مستوى الفوج.",
        });
      }
      const currentGroup = await prisma.courseGroup.findUnique({
        where: { id: groupId },
        select: { instructorId: true, days: true, timeFrom: true, timeTo: true },
      });
      const next = {
        instructorId: instructorId !== undefined ? (instructorId || null) : currentGroup.instructorId,
        days: days !== undefined ? days : currentGroup.days,
        timeFrom: timeFrom !== undefined ? (timeFrom || null) : currentGroup.timeFrom,
        timeTo: timeTo !== undefined ? (timeTo || null) : currentGroup.timeTo,
      };
      const conflict = await findInstructorConflict({ groupId, ...next });
      if (conflict) return res.status(409).json({ error: conflict });
      await prisma.courseGroup.update({ where: { id: groupId }, data: next });
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data,
      select: courseListSelect,
    });
    res.json(serializeCourse(course));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function enroll(req, res, next) {
  try {
    const studentId = z.string().uuid().parse(req.body.studentId);
    const requestedGroupId = req.body.groupId
      ? z.string().uuid().parse(req.body.groupId)
      : null;
    const groupId = requestedGroupId ?? (await firstGroupId(req.params.id));
    if (!groupId) {
      return res.status(409).json({
        error: "لا يمكن تسجيل تلميذ قبل إنشاء فوج في هذه الدورة. أضف فوجاً أولاً.",
      });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: req.params.id, studentId } },
      select: { id: true, groupId: true },
    });
    if (existing?.groupId === groupId) return res.json(existing);

    const capacityError = await findCapacityError(groupId, 1);
    if (capacityError) return res.status(409).json({ error: capacityError });

    const enrollment = await prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId: req.params.id, studentId } },
      update: { groupId },
      create: { courseId: req.params.id, studentId, groupId },
    });
    res.json(enrollment);
  } catch (e) { next(e); }
}

export async function unenroll(req, res, next) {
  try {
    const studentId = z.string().uuid().parse(req.body.studentId);
    await prisma.enrollment.deleteMany({
      where: { courseId: req.params.id, studentId },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}