import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import {
  findCapacityError,
  findInstructorConflict,
  findRoomConflict,
} from "../../lib/schedule.js";

// Flat /api/admin/groups view over CourseGroup. A group always belongs to one
// course; the level is now just an optional tag on the group.
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const groupSchema = z.object({
  courseId: z.string().uuid(),
  number: z.number().int().positive(),
  levelId: z.string().uuid().nullable().optional(),
  hizbCount: z.number().int().min(0).max(60).optional(),
  instructorId: z.string().uuid().nullable().optional(),
  room: z.string().max(80).nullable().optional(),
  capacity: z.number().int().positive().optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  timeFrom: z.string().regex(timeRegex).nullable().optional(),
  timeTo: z.string().regex(timeRegex).nullable().optional(),
});

function serialize(g) {
  return {
    id: g.id,
    number: g.number,
    courseId: g.courseId,
    courseTitle: g.course?.title ?? null,
    levelId: g.levelId ?? null,
    levelName: g.level?.name ?? null,
    hizbCount: g.hizbCount ?? 0,
    instructorId: g.instructorId ?? null,
    instructorName: g.instructor?.fullName ?? null,
    room: g.room ?? null,
    capacity: g.capacity ?? 25,
    days: g.days ?? [],
    timeFrom: g.timeFrom ?? null,
    timeTo: g.timeTo ?? null,
    studentsCount: g._count?.enrollments ?? 0,
  };
}

const INCLUDE = {
  course: { select: { title: true } },
  level: { select: { name: true } },
  instructor: { select: { fullName: true } },
  _count: { select: { enrollments: true } },
};

function mergedSchedule(current, body) {
  return {
    instructorId: body.instructorId !== undefined ? (body.instructorId || null) : current.instructorId,
    room: body.room !== undefined ? (body.room || null) : current.room,
    days: body.days !== undefined ? body.days : (current.days ?? []),
    timeFrom: body.timeFrom !== undefined ? (body.timeFrom || null) : current.timeFrom,
    timeTo: body.timeTo !== undefined ? (body.timeTo || null) : current.timeTo,
  };
}

// CourseGroup has @@unique([courseId, number]); surface Prisma's P2002 as a
// clear 409 instead of a raw 500.
function duplicateNumberError(e, number) {
  if (e?.code !== "P2002") return null;
  const label = number === undefined || number === null ? "" : ` ${number}`;
  return `رقم الفوج${label} مستعمل بالفعل لهذه الدورة، الرجاء اختيار رقم آخر.`;
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.courseGroup.findMany({
      orderBy: [{ course: { title: "asc" } }, { number: "asc" }],
      include: INCLUDE,
    });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const body = groupSchema.parse(req.body);
    const schedule = mergedSchedule(
      { instructorId: null, room: null, days: [], timeFrom: null, timeTo: null },
      body,
    );
    const conflict =
      (await findInstructorConflict(schedule)) || (await findRoomConflict(schedule));
    if (conflict) return res.status(409).json({ error: conflict });
    const row = await prisma.courseGroup.create({
      data: {
        courseId: body.courseId,
        number: body.number,
        levelId: body.levelId ?? null,
        hizbCount: body.hizbCount ?? 0,
        capacity: body.capacity ?? 25,
        ...schedule,
      },
      include: INCLUDE,
    });
    res.status(201).json(serialize(row));
  } catch (e) {
    const dup = duplicateNumberError(e, req.body?.number);
    if (dup) return res.status(409).json({ error: dup });
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const body = groupSchema.partial().parse(req.body);
    const current = await prisma.courseGroup.findUnique({
      where: { id: req.params.id },
      select: { instructorId: true, room: true, days: true, timeFrom: true, timeTo: true },
    });
    if (!current) return res.status(404).json({ error: "المجموعة غير موجودة." });
    const schedule = mergedSchedule(current, body);
    const conflict =
      (await findInstructorConflict({ groupId: req.params.id, ...schedule })) ||
      (await findRoomConflict({ groupId: req.params.id, ...schedule }));
    if (conflict) return res.status(409).json({ error: conflict });

    const data = {};
    if (body.courseId !== undefined) data.courseId = body.courseId;
    if (body.number !== undefined) data.number = body.number;
    if (body.levelId !== undefined) data.levelId = body.levelId || null;
    if (body.hizbCount !== undefined) data.hizbCount = body.hizbCount;
    if (body.capacity !== undefined) data.capacity = body.capacity;
    if (body.instructorId !== undefined) data.instructorId = schedule.instructorId;
    if (body.room !== undefined) data.room = schedule.room;
    if (body.days !== undefined) data.days = schedule.days;
    if (body.timeFrom !== undefined) data.timeFrom = schedule.timeFrom;
    if (body.timeTo !== undefined) data.timeTo = schedule.timeTo;

    const row = await prisma.courseGroup.update({
      where: { id: req.params.id },
      data,
      include: INCLUDE,
    });
    res.json(serialize(row));
  } catch (e) {
    const dup = duplicateNumberError(e, req.body?.number);
    if (dup) return res.status(409).json({ error: dup });
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const count = await prisma.enrollment.count({ where: { groupId: req.params.id } });
    if (count > 0) {
      return res.status(409).json({
        error: `لا يمكن حذف المجموعة لأنها تحتوي على ${count} تلميذ. انقل التلاميذ إلى مجموعة أخرى أولاً.`,
      });
    }
    await prisma.courseGroup.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function listStudents(req, res, next) {
  try {
    const rows = await prisma.enrollment.findMany({
      where: { groupId: req.params.id },
      orderBy: { student: { fullName: "asc" } },
      select: {
        groupId: true,
        student: {
          select: { id: true, username: true, fullName: true, phone: true, photoUrl: true },
        },
      },
    });
    res.json(rows.map((r) => ({ ...r.student, groupId: r.groupId })));
  } catch (e) { next(e); }
}

const assignSchema = z.object({ studentIds: z.array(z.string().uuid()).min(1) });

export async function addStudents(req, res, next) {
  try {
    const { studentIds } = assignSchema.parse(req.body);
    const group = await prisma.courseGroup.findUnique({
      where: { id: req.params.id },
      select: { id: true, courseId: true },
    });
    if (!group) return res.status(404).json({ error: "المجموعة غير موجودة." });

    const alreadyHere = await prisma.enrollment.count({
      where: { groupId: group.id, studentId: { in: studentIds } },
    });
    const capacityError = await findCapacityError(group.id, studentIds.length - alreadyHere);
    if (capacityError) return res.status(409).json({ error: capacityError });

    let count = 0;
    for (const studentId of studentIds) {
      await prisma.enrollment.upsert({
        where: { courseId_studentId: { courseId: group.courseId, studentId } },
        update: { groupId: group.id },
        create: { courseId: group.courseId, studentId, groupId: group.id },
      });
      count += 1;
    }
    res.json({ ok: true, count });
  } catch (e) { next(e); }
}

export async function removeStudent(req, res, next) {
  try {
    // A student cannot stay in a course without a group, so removing them from
    // the group removes the enrollment itself.
    await prisma.enrollment.deleteMany({
      where: { groupId: req.params.id, studentId: req.params.studentId },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
