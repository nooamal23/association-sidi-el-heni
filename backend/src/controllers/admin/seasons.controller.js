import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const seasonSchema = z.object({
  name: z.string().min(2),
  startsOn: z.string(),
  studyStartsOn: z.string(),
  evaluationStartsOn: z.string(),
  finalCompetitionStartsOn: z.string(),
  endsOn: z.string(),
  isActive: z.boolean().optional(),
}).refine(
  (s) => s.startsOn < s.studyStartsOn
      && s.studyStartsOn < s.evaluationStartsOn
      && s.evaluationStartsOn < s.finalCompetitionStartsOn
      && s.finalCompetitionStartsOn <= s.endsOn,
  { message: "التواريخ يجب أن تكون بترتيب زمني تصاعدي" },
);

function iso(d) { return d ? d.toISOString().slice(0, 10) : null; }

function serialize(s) {
  return {
    id: s.id,
    name: s.name,
    startsOn: iso(s.startsOn),
    studyStartsOn: iso(s.studyStartsOn),
    evaluationStartsOn: iso(s.evaluationStartsOn),
    finalCompetitionStartsOn: iso(s.finalCompetitionStartsOn),
    endsOn: iso(s.endsOn),
    isActive: s.isActive,
    coursesCount: s._count?.courses ?? 0,
  };
}

const INCLUDE = { _count: { select: { courses: true } } };

// At most one season may be active at a time. Activating a season
// auto-deactivates the previous one (admin-friendly: starting a new school
// year naturally ends the previous one). Enforced in a transaction here and
// by the `one_active_season` partial unique index in the database.
async function deactivateOthers(tx, exceptId = null) {
  await tx.season.updateMany({
    where: exceptId === null ? { isActive: true } : { isActive: true, NOT: { id: exceptId } },
    data: { isActive: false },
  });
}

// Part 51: no two seasons may have overlapping date ranges.
// Ranges [s1,e1] and [s2,e2] overlap when s1 < e2 AND s2 < e1 (strict, so a
// season starting exactly on the day another ends is allowed).
async function assertNoOverlap(tx, { startsOn, endsOn }, exceptId = null) {
  const conflict = await tx.season.findFirst({
    where: {
      ...(exceptId === null ? {} : { NOT: { id: exceptId } }),
      startsOn: { lt: endsOn },
      endsOn: { gt: startsOn },
    },
    orderBy: { startsOn: "asc" },
  });
  if (conflict) {
    const err = new Error(
      `تتداخل تواريخ هذا الموسم مع موسم آخر موجود (الموسم «${conflict.name}»: من ${iso(conflict.startsOn)} إلى ${iso(conflict.endsOn)}). يرجى اختيار تواريخ لا تتداخل مع أي موسم موجود.`,
    );
    err.status = 409;
    throw err;
  }
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.season.findMany({
      orderBy: { startsOn: "desc" },
      include: INCLUDE,
    });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const s = seasonSchema.parse(req.body);
    const row = await prisma.$transaction(async (tx) => {
      await assertNoOverlap(tx, { startsOn: new Date(s.startsOn), endsOn: new Date(s.endsOn) });
      if (s.isActive) await deactivateOthers(tx);
      return tx.season.create({
      data: {
        name: s.name,
        startsOn: new Date(s.startsOn),
        studyStartsOn: new Date(s.studyStartsOn),
        evaluationStartsOn: new Date(s.evaluationStartsOn),
        finalCompetitionStartsOn: new Date(s.finalCompetitionStartsOn),
        endsOn: new Date(s.endsOn),
        isActive: s.isActive ?? false,
      },
      include: INCLUDE,
      });
    });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = seasonSchema.partial().parse(req.body);
    const id = Number(req.params.id);
    const data = { ...patch };
    for (const k of ["startsOn", "studyStartsOn", "evaluationStartsOn", "finalCompetitionStartsOn", "endsOn"]) {
      if (patch[k] !== undefined) data[k] = new Date(patch[k]);
    }
    const row = await prisma.$transaction(async (tx) => {
      if (data.startsOn !== undefined || data.endsOn !== undefined) {
        const current = await tx.season.findUnique({ where: { id } });
        if (!current) { const e = new Error("الموسم غير موجود"); e.status = 404; throw e; }
        await assertNoOverlap(
          tx,
          { startsOn: data.startsOn ?? current.startsOn, endsOn: data.endsOn ?? current.endsOn },
          id,
        );
      }
      if (patch.isActive) await deactivateOthers(tx, id);
      return tx.season.update({ where: { id }, data, include: INCLUDE });
    });
    res.json(serialize(row));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.season.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function activate(req, res, next) {
  try {
    const id = Number(req.params.id);
    const row = await prisma.$transaction(async (tx) => {
      await deactivateOthers(tx, id);
      return tx.season.update({
        where: { id },
        data: { isActive: true },
        include: INCLUDE,
      });
    });
    res.json(serialize(row));
  } catch (e) { next(e); }
}
