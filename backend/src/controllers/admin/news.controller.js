import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const newsSchema = z.object({
  title: z.string().min(2),
  excerpt: z.string().min(2),
  body: z.string().min(2),
  tag: z.string().min(1),
  dateGregorian: z.string().min(1),
  dateHijri: z.string().min(1),
  // Part 29/3 — real sortable date used by the dashboard "upcoming" widget.
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

function toData(n) {
  const { eventDate, ...rest } = n;
  if (eventDate === undefined) return rest;
  return { ...rest, eventDate: eventDate ? new Date(`${eventDate}T00:00:00.000Z`) : null };
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.news.findMany({ orderBy: { publishedAt: "desc" } });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const n = newsSchema.parse(req.body);
    const created = await prisma.news.create({ data: toData(n) });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = newsSchema.partial().parse(req.body);
    const updated = await prisma.news.update({ where: { id: req.params.id }, data: toData(patch) });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}