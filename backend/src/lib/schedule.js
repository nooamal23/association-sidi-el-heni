// Shared helpers for group scheduling business rules (Part 21 / section 2).
import { prisma } from "../db/prisma.js";

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  const a1 = toMinutes(aFrom), a2 = toMinutes(aTo);
  const b1 = toMinutes(bFrom), b2 = toMinutes(bTo);
  if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
  return a1 < b2 && b1 < a2;
}

export function sharesDay(a = [], b = []) {
  return a.some((d) => b.includes(d));
}

const GROUP_SELECT = {
  id: true, number: true, days: true, timeFrom: true, timeTo: true,
  instructorId: true, room: true,
  course: { select: { title: true } },
};

/**
 * Returns an Arabic error message when the given schedule collides with
 * another group taught by the same instructor (same day + overlapping time).
 * Returns null when there is no conflict.
 */
export async function findInstructorConflict({ groupId, instructorId, days, timeFrom, timeTo }) {
  if (!instructorId || !timeFrom || !timeTo || !days?.length) return null;
  const others = await prisma.courseGroup.findMany({
    where: { instructorId, ...(groupId ? { id: { not: groupId } } : {}) },
    select: GROUP_SELECT,
  });
  const hit = others.find(
    (g) => sharesDay(days, g.days ?? []) && rangesOverlap(timeFrom, timeTo, g.timeFrom, g.timeTo),
  );
  if (!hit) return null;
  return `المعلم مسجّل بالفعل في فوج آخر بنفس اليوم ونفس التوقيت: ${hit.course?.title ?? "دورة"} - الفوج ${hit.number} (${hit.timeFrom} - ${hit.timeTo}).`;
}

/** Same overlap rule applied to a room, to avoid double-booking it. */
export async function findRoomConflict({ groupId, room, days, timeFrom, timeTo }) {
  if (!room || !timeFrom || !timeTo || !days?.length) return null;
  const others = await prisma.courseGroup.findMany({
    where: { room, ...(groupId ? { id: { not: groupId } } : {}) },
    select: GROUP_SELECT,
  });
  const hit = others.find(
    (g) => sharesDay(days, g.days ?? []) && rangesOverlap(timeFrom, timeTo, g.timeFrom, g.timeTo),
  );
  if (!hit) return null;
  return `القاعة «${room}» محجوزة بالفعل في نفس اليوم ونفس التوقيت: ${hit.course?.title ?? "دورة"} - الفوج ${hit.number}.`;
}

/**
 * Part 28/2 — student-level (advisory) schedule conflicts.
 * For each candidate student, look at every OTHER group they are already
 * enrolled in and report day+time overlaps with the target group.
 * Purely informational: the caller decides whether to proceed.
 */
export async function findStudentScheduleConflicts({ studentIds, days, timeFrom, timeTo, excludeGroupId }) {
  if (!studentIds?.length || !timeFrom || !timeTo || !days?.length) return [];
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      ...(excludeGroupId ? { groupId: { not: excludeGroupId } } : {}),
    },
    select: {
      studentId: true,
      student: { select: { fullName: true } },
      group: {
        select: {
          number: true, days: true, timeFrom: true, timeTo: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  const byStudent = new Map();
  for (const e of enrollments) {
    const g = e.group;
    if (!g) continue;
    if (!sharesDay(days, g.days ?? [])) continue;
    if (!rangesOverlap(timeFrom, timeTo, g.timeFrom, g.timeTo)) continue;
    const detail = `${g.course?.title ?? "دورة"} - الفوج ${g.number} (${g.timeFrom} - ${g.timeTo})`;
    const cur = byStudent.get(e.studentId);
    if (cur) cur.conflicts.push(detail);
    else byStudent.set(e.studentId, {
      studentId: e.studentId,
      fullName: e.student?.fullName ?? "تلميذ",
      conflicts: [detail],
    });
  }
  return [...byStudent.values()];
}

/**
 * Throws-free capacity check. `extra` = how many students we are about to add.
 * Returns an Arabic error message or null.
 */
export async function findCapacityError(groupId, extra = 1) {
  const group = await prisma.courseGroup.findUnique({
    where: { id: groupId },
    select: { capacity: true, _count: { select: { enrollments: true } } },
  });
  if (!group) return "المجموعة غير موجودة.";
  const current = group._count.enrollments;
  if (current + extra > group.capacity) {
    return `المجموعة ممتلئة، الطاقة الاستيعابية القصوى ${group.capacity} تلاميذ (المسجّلون حاليًا: ${current}).`;
  }
  return null;
}

/**
 * Lowest-numbered existing group of a course, or null.
 * Groups are NEVER auto-created: the admin adds every فوج explicitly.
 */
export async function firstGroupId(courseId) {
  const existing = await prisma.courseGroup.findFirst({
    where: { courseId },
    orderBy: { number: "asc" },
    select: { id: true },
  });
  return existing?.id ?? null;
}
