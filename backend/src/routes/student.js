import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const studentRouter = Router();

studentRouter.get("/courses", async (req, res, next) => {
  try {
    const rows = await prisma.enrollment.findMany({
      where: { studentId: req.user.sub },
      include: {
        course: true,
        group: {
          select: {
            number: true,
            days: true,
            timeFrom: true,
            timeTo: true,
            instructor: { select: { fullName: true } },
          },
        },
      },
      orderBy: { course: { createdAt: "desc" } },
    });
    res.json(
      rows.map((r) => ({
        id: r.course.id,
        title: r.course.title,
        category: r.course.category,
        level: r.course.level,
        schedule: r.group && r.group.timeFrom && r.group.timeTo ? `${r.group.timeFrom} - ${r.group.timeTo}` : "—",
        groupNumber: r.group?.number ?? null,
        instructor: r.group?.instructor?.fullName ?? null,
      }))
    );
  } catch (e) { next(e); }
});

studentRouter.get("/attendance", async (req, res, next) => {
  try {
    const rows = await prisma.attendance.findMany({
      where: { studentId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { sessionDate: "desc" },
    });
    res.json(
      rows.map((a) => ({
        course_id: a.courseId,
        title: a.course.title,
        session_date: a.sessionDate,
        present: a.present,
        note: a.note,
      }))
    );
  } catch (e) { next(e); }
});

studentRouter.get("/evaluations", async (req, res, next) => {
  try {
    const rows = await prisma.evaluation.findMany({
      where: { studentId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { evaluatedAt: "desc" },
    });
    res.json(
      rows.map((e) => ({
        id: e.id,
        course: e.course.title,
        label: e.label,
        score: e.score,
        max_score: e.maxScore,
        evaluated_at: e.evaluatedAt,
      }))
    );
  } catch (e) { next(e); }
});
