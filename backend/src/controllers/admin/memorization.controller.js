import { z } from "zod";
import { prisma } from "../../db/prisma.js";

// Part 29/2 — memorization progress API only. Like attendance, the data-entry
// UI belongs to the instructor space (later phase); no admin screen uses these.

async function loadEnrollment(id) {
  return prisma.enrollment.findUnique({
    where: { id },
    select: {
      id: true,
      hizbCompleted: true,
      student: { select: { id: true, fullName: true } },
      group: { select: { id: true, number: true, hizbCount: true } },
      course: { select: { id: true, title: true, type: true } },
    },
  });
}

function payload(enrollment, hizbCompleted) {
  return {
    ok: true,
    enrollmentId: enrollment.id,
    studentId: enrollment.student.id,
    studentName: enrollment.student.fullName,
    hizbCompleted,
    hizbTarget: enrollment.group?.hizbCount ?? 0,
  };
}

/** POST /api/admin/enrollments/:id/memorization/increment */
export async function increment(req, res, next) {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const enrollment = await loadEnrollment(id);
    if (!enrollment) return res.status(404).json({ error: "التسجيل غير موجود." });

    const target = enrollment.group?.hizbCount ?? 0;
    if (target > 0 && enrollment.hizbCompleted >= target) {
      return res.status(409).json({
        error: `التلميذ ${enrollment.student.fullName} أتمّ كل الأحزاب المقرّرة للفوج (${target}).`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.enrollment.update({
        where: { id },
        data: { hizbCompleted: { increment: 1 } },
        select: { hizbCompleted: true },
      });
      await tx.memorizationLog.create({ data: { enrollmentId: id } });
      return row;
    });

    res.json(payload(enrollment, updated.hizbCompleted));
  } catch (e) { next(e); }
}

/** POST /api/admin/enrollments/:id/memorization/decrement */
export async function decrement(req, res, next) {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const enrollment = await loadEnrollment(id);
    if (!enrollment) return res.status(404).json({ error: "التسجيل غير موجود." });

    if (enrollment.hizbCompleted <= 0) {
      return res.status(409).json({
        error: `لا يمكن الإنقاص: ${enrollment.student.fullName} لم يُسجَّل له أي حزب بعد.`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const latest = await tx.memorizationLog.findFirst({
        where: { enrollmentId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latest) await tx.memorizationLog.delete({ where: { id: latest.id } });
      return tx.enrollment.update({
        where: { id },
        data: { hizbCompleted: { decrement: 1 } },
        select: { hizbCompleted: true },
      });
    });

    res.json(payload(enrollment, updated.hizbCompleted));
  } catch (e) { next(e); }
}
