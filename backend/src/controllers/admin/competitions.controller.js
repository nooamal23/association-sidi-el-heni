import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const FIELDS = ["tajwid", "hifz", "hifz_tajwid", "fiqh", "sharia"];

const competitionSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    level: z.string().trim().min(1).max(50),
    year: z.number().int(),
    participants: z.number().int().nonnegative().default(0),
    passed: z.number().int().nonnegative().default(0),
    topThree: z
      .array(
        z.object({
          rank: z.number().int(),
          name: z.string(),
          category: z.string(),
        }),
      )
      .default([]),
    // Part 29/3 — real date + place (the dashboard widget sorts on eventDate).
    eventDate: DATE.nullish(),
    location: z.string().trim().max(200).nullish(),
    // Part 45 — announcement fields, now persisted.
    field: z.enum(FIELDS).nullish(),
    hizbCount: z.number().int().min(1).max(60).nullish(),
    description: z.string().trim().max(4000).nullish(),
    deadline: DATE.nullish(),
    imageUrl: z.string().trim().max(2_000_000).nullish(),
  })
  .strict();

function day(v) {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

function toData(c) {
  const data = { ...c };
  if ("eventDate" in data) data.eventDate = day(data.eventDate);
  if ("deadline" in data) data.deadline = day(data.deadline);
  // Hizb count only makes sense for memorization fields.
  if ("field" in data && data.field && !["hifz", "hifz_tajwid"].includes(data.field)) {
    data.hizbCount = null;
  }
  for (const k of ["location", "description", "imageUrl"]) {
    if (k in data && typeof data[k] === "string" && data[k] === "") data[k] = null;
  }
  return data;
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.competition.findMany({
      orderBy: [{ eventDate: "desc" }, { year: "desc" }, { name: "asc" }],
    });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const c = competitionSchema.parse(req.body);
    const created = await prisma.competition.create({ data: toData(c) });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = competitionSchema.partial().parse(req.body);
    const updated = await prisma.competition.update({
      where: { id: req.params.id }, data: toData(patch),
    });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.competition.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
