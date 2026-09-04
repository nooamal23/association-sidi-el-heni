import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { publicWriteLimiter } from "../middleware/rate-limit.js";

export const publicRouter = Router();

const PHONE_REGEX = /^(\+?216)?[2345789]\d{7}$/;
const registrationRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  ageCategory: z.enum(["under_9", "age_9_to_15", "over_15"]),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s\-().]/g, ""))
    .refine((s) => PHONE_REGEX.test(s), "invalid Tunisian phone number"),
});

// POST /api/public/registration-requests — visitor form submission
publicRouter.post(
  "/registration-requests",
  publicWriteLimiter,
  async (req, res, next) => {
    try {
      const data = registrationRequestSchema.parse(req.body);
      await prisma.registrationRequest.create({
        data: {
          fullName: data.fullName,
          ageCategory: data.ageCategory,
          phone: data.phone,
        },
        select: { id: true },
      });
      res.status(201).json({ ok: true });
    } catch (e) {
      if (e?.issues) return res.status(400).json({ error: "بيانات غير صالحة" });
      next(e);
    }
  },
);


// Scheduling lives on course groups; build a readable label from the first one.
const DAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function formatGroupSchedule(g) {
  if (!g) return "—";
  const days = (g.days ?? []).map((d) => DAY_LABELS[d]).filter(Boolean).join("، ");
  const time = g.timeFrom && g.timeTo ? `${g.timeFrom} - ${g.timeTo}` : "";
  return [days, time].filter(Boolean).join(" · ") || "—";
}

// GET /api/public/courses
publicRouter.get("/courses", async (_req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      include: {
        groups: {
          orderBy: { number: "asc" },
          select: { instructor: { select: { fullName: true } }, days: true, timeFrom: true, timeTo: true },
        },
        _count: { select: { enrollments: true } },
      },
    });
    res.json(
      courses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        level: c.level,
        schedule: formatGroupSchedule(c.groups[0]),
        capacity: c.capacity,
        instructor: c.groups.find((g) => g.instructor)?.instructor?.fullName ?? null,
        enrolled: c._count.enrollments,
        startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
        endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
      }))
    );
  } catch (e) { next(e); }
});

// GET /api/public/news
publicRouter.get("/news", async (_req, res, next) => {
  try {
    const rows = await prisma.news.findMany({
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/public/competitions
publicRouter.get("/competitions", async (_req, res, next) => {
  try {
    const rows = await prisma.competition.findMany({
      orderBy: [{ year: "desc" }, { name: "asc" }],
    });
    res.json(
      rows.map((c) => ({
        ...c,
        passRate:
          c.participants > 0 ? Math.round((c.passed / c.participants) * 100) : 0,
      }))
    );
  } catch (e) { next(e); }
});

// GET /api/public/gallery
publicRouter.get("/gallery", async (_req, res, next) => {
  try {
    const rows = await prisma.gallery.findMany({
      orderBy: { id: "desc" },
      take: 60,
    });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/public/board
publicRouter.get("/board", async (_req, res, next) => {
  try {
    const rows = await prisma.boardMember.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, fullName: true, position: true, photoUrl: true, orderIndex: true,
        // Part 41 — linked instructors keep their identity on their User row.
        instructor: { select: { fullName: true, photoUrl: true } },
      },
    });
    res.json(
      rows.map((b) => ({
        id: b.id,
        fullName: b.instructor?.fullName ?? b.fullName ?? "",
        position: b.position,
        photoUrl: b.instructor?.photoUrl ?? b.photoUrl ?? null,
        orderIndex: b.orderIndex,
      })),
    );
  } catch (e) { next(e); }
});

