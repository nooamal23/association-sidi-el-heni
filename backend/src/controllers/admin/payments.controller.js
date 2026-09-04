import { z } from "zod";
import { prisma } from "../../db/prisma.js";

// Payments are tracked per academic season (not per calendar year): the school
// year does not align with the calendar year. When no seasonId is supplied we
// operate on the currently active season (there is at most one, enforced by the
// `one_active_season` index + the seasons controller).
const monthSchema = z.object({
  seasonId: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12),
  amount: z.number().nonnegative().nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

const NO_SEASON = "لا يوجد موسم دراسي نشط. فعّل موسماً من قسم «المواسم الدراسية» قبل تسجيل الخلاص.";

async function resolveSeasonId(explicit) {
  if (explicit) return explicit;
  const active = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  return active?.id ?? null;
}

function serialize(p) {
  return {
    id: p.id,
    studentId: p.studentId,
    seasonId: p.seasonId,
    month: p.month,
    amount: p.amount ? Number(p.amount) : null,
    note: p.note ?? null,
    paidAt: p.paidAt.toISOString(),
  };
}

export async function list(req, res, next) {
  try {
    const seasonId = await resolveSeasonId(req.query.seasonId ? Number(req.query.seasonId) : null);
    if (!seasonId) return res.json([]);
    const rows = await prisma.studentPayment.findMany({
      where: { studentId: req.params.id, seasonId },
      orderBy: { month: "asc" },
    });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
}

export async function mark(req, res, next) {
  try {
    const body = monthSchema.parse(req.body);
    const seasonId = await resolveSeasonId(body.seasonId ?? null);
    if (!seasonId) return res.status(409).json({ error: NO_SEASON });
    // Idempotent: re-marking an already paid month just refreshes the row.
    const row = await prisma.studentPayment.upsert({
      where: {
        studentId_seasonId_month: {
          studentId: req.params.id,
          seasonId,
          month: body.month,
        },
      },
      update: {
        amount: body.amount ?? null,
        note: body.note ?? null,
        paidAt: new Date(),
      },
      create: {
        studentId: req.params.id,
        seasonId,
        month: body.month,
        amount: body.amount ?? null,
        note: body.note ?? null,
      },
    });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
}

export async function unmark(req, res, next) {
  try {
    const month = Number(req.query.month);
    if (!month) return res.status(400).json({ error: "month is required" });
    const seasonId = await resolveSeasonId(req.query.seasonId ? Number(req.query.seasonId) : null);
    if (!seasonId) return res.status(409).json({ error: NO_SEASON });
    await prisma.studentPayment.deleteMany({
      where: { studentId: req.params.id, seasonId, month },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
