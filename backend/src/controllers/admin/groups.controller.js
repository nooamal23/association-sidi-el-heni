import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import {
  findCapacityError,
  findInstructorConflict,
  findRoomConflict,
} from "../../lib/schedule.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const groupSchema = z.object({
  number: z.number().int().positive().optional(),
  hizbCount: z.number().int().min(0).max(60).optional(),
  levelId: z.string().uuid().nullable().optional(),
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
    courseId: g.courseId,
    number: g.number,
    hizbCount: g.hizbCount ?? 0,
    levelId: g.levelId ?? null,
    levelName: g.level?.name ?? null,
    instructorId: g.instructorId ?? null,
    instructorName: g.instructor?.fullName ?? null,
    room: g.room ?? null,
    capacity: g.capacity ?? 25,
    days: g.days ?? [],
    timeFrom: g.timeFrom ?? null,
    timeTo: g.timeTo ?? null,
    memberIds: g.enrollments?.map((e) => e.studentId) ?? [],
    membersCount: g._count?.enrollments ?? g.enrollments?.length ?? 0,
  };
}

const include = {
  enrollments: { select: { studentId: true } },
  _count: { select: { enrollments: true } },
  level: { select: { name: true } },
  instructor: { select: { fullName: true } },
};

// Merge a partial patch onto the stored row so the conflict check always sees
// the full resulting schedule.
function mergedSchedule(current, body) {
  return {
    instructorId: body.instructorId !== undefined ? (body.instructorId || null) : current.instructorId,
    room: body.room !== undefined ? (body.room || null) : current.room,
    days: body.days !== undefined ? body.days : (current.days ?? []),
    timeFrom: body.timeFrom !== undefined ? (body.timeFrom || null) : current.timeFrom,
    timeTo: body.timeTo !== undefined ? (body.timeTo || null) : current.timeTo,
  };
}

// CourseGroup has @@unique([courseId, number]) — report Prisma's P2002 as 409.
function duplicateNumberError(e, number) {
  if (e?.code !== "P2002") return null;
  const label = number === undefined || number === null ? "" : ` ${number}`;
  return `رقم الفوج${label} مستعمل بالفعل لهذه الدورة، الرجاء اختيار رقم آخر.`;
}

export async function listByCourse(req, res, next) {
  try {
    const rows = await prisma.courseGroup.findMany({
      where: { courseId: req.params.id },
      orderBy: { number: "asc" },
      include,
    });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const body = groupSchema.parse(req.body);
    let number = body.number;
    if (number === undefined) {
      const last = await prisma.courseGroup.findFirst({
        where: { courseId: req.params.id },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      number = (last?.number ?? 0) + 1;
    }
    const schedule = mergedSchedule(
      { instructorId: null, room: null, days: [], timeFrom: null, timeTo: null },
      body,
    );
    const conflict =
      (await findInstructorConflict(schedule)) || (await findRoomConflict(schedule));
    if (conflict) return res.status(409).json({ error: conflict });

    const row = await prisma.courseGroup.create({
      data: {
        courseId: req.params.id,
        number,
        hizbCount: body.hizbCount ?? 0,
        levelId: body.levelId ?? null,
        capacity: body.capacity ?? 25,
        ...schedule,
      },
      include,
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
      where: { id: req.params.groupId },
      select: { instructorId: true, room: true, days: true, timeFrom: true, timeTo: true },
    });
    if (!current) return res.status(404).json({ error: "المجموعة غير موجودة." });
    const schedule = mergedSchedule(current, body);
    const conflict =
      (await findInstructorConflict({ groupId: req.params.groupId, ...schedule })) ||
      (await findRoomConflict({ groupId: req.params.groupId, ...schedule }));
    if (conflict) return res.status(409).json({ error: conflict });

    const data = {};
    if (body.number !== undefined) data.number = body.number;
    if (body.hizbCount !== undefined) data.hizbCount = body.hizbCount;
    if (body.levelId !== undefined) data.levelId = body.levelId || null;
    if (body.capacity !== undefined) data.capacity = body.capacity;
    if (body.instructorId !== undefined) data.instructorId = schedule.instructorId;
    if (body.room !== undefined) data.room = schedule.room;
    if (body.days !== undefined) data.days = schedule.days;
    if (body.timeFrom !== undefined) data.timeFrom = schedule.timeFrom;
    if (body.timeTo !== undefined) data.timeTo = schedule.timeTo;
    const row = await prisma.courseGroup.update({
      where: { id: req.params.groupId },
      data,
      include,
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
    // Enrollment.groupId is required, so a group with students can't be
    // deleted without losing the enrollments — refuse instead.
    const count = await prisma.enrollment.count({ where: { groupId: req.params.groupId } });
    if (count > 0) {
      return res.status(409).json({
        error: `لا يمكن حذف المجموعة لأنها تحتوي على ${count} تلميذ. انقل التلاميذ إلى مجموعة أخرى أولاً.`,
      });
    }
    await prisma.courseGroup.delete({ where: { id: req.params.groupId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

const assignSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid(),
});

export async function assign(req, res, next) {
  try {
    const { studentId, groupId } = assignSchema.parse(req.body);
    const already = await prisma.enrollment.findFirst({
      where: { courseId: req.params.id, studentId },
      select: { groupId: true },
    });
    if (already?.groupId !== groupId) {
      const capacityError = await findCapacityError(groupId, 1);
      if (capacityError) return res.status(409).json({ error: capacityError });
    }
    const updated = await prisma.enrollment.updateMany({
      where: { courseId: req.params.id, studentId },
      data: { groupId },
    });
    if (updated.count === 0) return res.status(404).json({ error: "enrollment not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

const bulkAssignSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  groupId: z.string().uuid(),
});

export async function bulkAssign(req, res, next) {
  try {
    const { studentIds, groupId } = bulkAssignSchema.parse(req.body);
    const moving = await prisma.enrollment.count({
      where: { courseId: req.params.id, studentId: { in: studentIds }, groupId: { not: groupId } },
    });
    const capacityError = await findCapacityError(groupId, moving);
    if (capacityError) return res.status(409).json({ error: capacityError });
    const updated = await prisma.enrollment.updateMany({
      where: { courseId: req.params.id, studentId: { in: studentIds } },
      data: { groupId },
    });
    res.json({ ok: true, count: updated.count });
  } catch (e) { next(e); }
}
