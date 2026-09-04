import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { signFinanceToken } from "../../middleware/finance.js";

const unlockSchema = z.object({ password: z.string().min(1) });

const financeSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
  entryDate: z.string().optional().nullable(),
});

const financeSelect = {
  id: true, kind: true, category: true, amount: true,
  description: true, entryDate: true, createdById: true, createdAt: true,
  createdBy: { select: { fullName: true } },
};

function serializeFinance(f) {
  return {
    id: f.id,
    kind: f.kind,
    category: f.category,
    amount: Number(f.amount),
    description: f.description,
    entryDate: f.entryDate ? f.entryDate.toISOString().slice(0, 10) : null,
    createdById: f.createdById,
    createdByName: f.createdBy?.fullName ?? null,
    createdAt: f.createdAt,
  };
}

export async function unlock(req, res, next) {
  try {
    const { password } = unlockSchema.parse(req.body);
    const hash = process.env.FINANCE_PASSWORD_HASH;
    if (!hash) {
      return res.status(500).json({
        error:
          "FINANCE_PASSWORD_HASH غير مضبوط على الخادم. اضبطه في backend/.env قبل الاستخدام.",
      });
    }
    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "كلمة السر غير صحيحة" });
    const token = signFinanceToken(req.user.sub);
    res.json({ token, expiresIn: 15 * 60 });
  } catch (e) { next(e); }
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.financeEntry.findMany({
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      select: financeSelect,
    });
    res.json(rows.map(serializeFinance));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const f = financeSchema.parse(req.body);
    const entry = await prisma.financeEntry.create({
      data: {
        kind: f.kind,
        category: f.category,
        amount: f.amount,
        description: f.description || null,
        entryDate: f.entryDate ? new Date(f.entryDate) : new Date(),
        createdById: req.user.sub,
      },
      select: financeSelect,
    });
    res.status(201).json(serializeFinance(entry));
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = financeSchema.partial().parse(req.body);
    const data = { ...patch };
    if (patch.entryDate !== undefined) {
      data.entryDate = patch.entryDate ? new Date(patch.entryDate) : null;
    }
    if (patch.description !== undefined) {
      data.description = patch.description || null;
    }
    const entry = await prisma.financeEntry.update({
      where: { id: req.params.id },
      data,
      select: financeSelect,
    });
    res.json(serializeFinance(entry));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.financeEntry.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}