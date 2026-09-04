import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const levelSchema = z.object({
  name: z.string().min(1),
});

function serialize(l) {
  return {
    id: l.id,
    name: l.name,
    groupsCount: l._count?.courseGroups ?? 0,
  };
}

const INCLUDE = { _count: { select: { courseGroups: true } } };

export async function list(_req, res, next) {
  try {
    const rows = await prisma.level.findMany({
      orderBy: { createdAt: "asc" },
      include: INCLUDE,
    });
    res.json(rows.map(serialize));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const data = levelSchema.parse(req.body);
    const row = await prisma.level.create({ data, include: INCLUDE });
    res.status(201).json(serialize(row));
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const data = levelSchema.partial().parse(req.body);
    const row = await prisma.level.update({
      where: { id: req.params.id },
      data,
      include: INCLUDE,
    });
    res.json(serialize(row));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const count = await prisma.courseGroup.count({ where: { levelId: req.params.id } });
    if (count > 0) {
      return res.status(409).json({
        error: `لا يمكن حذف المستوى لأنه يحتوي على ${count} مجموعة. احذف المجموعات أو انقلها إلى مستوى آخر أولاً.`,
      });
    }
    await prisma.level.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
