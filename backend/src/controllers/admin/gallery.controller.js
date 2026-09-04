import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const gallerySchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  url: z.string().url(),
});

export async function list(_req, res, next) {
  try {
    const rows = await prisma.gallery.findMany({ orderBy: { id: "desc" } });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const g = gallerySchema.parse(req.body);
    const created = await prisma.gallery.create({ data: g });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = gallerySchema.partial().parse(req.body);
    const updated = await prisma.gallery.update({ where: { id: req.params.id }, data: patch });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.gallery.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}