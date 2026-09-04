import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { nextRegistrationCode } from "../../lib/id-sequence.js";

// Part 33 — one shared model for محلية participants and جهوية/وطنية join requests.
const registrationSchema = z
  .object({
    studentId: z.string().uuid().nullish(),
    externalName: z.string().min(1).max(200).nullish(),
    externalPhone: z.string().min(1).max(40).nullish(),
    amountPaid: z.number().nonnegative().nullish(),
  })
  .refine((v) => Boolean(v.studentId) !== Boolean(v.externalName), {
    message: "يجب اختيار تلميذ من الجمعية أو إدخال اسم خارجي، وليس كليهما.",
  })
  .refine((v) => !v.studentId || !v.externalPhone, {
    message: "لا يُدخل رقم هاتف خارجي عند اختيار تلميذ تابع للجمعية.",
  })
  .refine((v) => !v.externalName || Boolean(v.externalPhone), {
    message: "رقم الهاتف مطلوب للمشارك من خارج الجمعية.",
  });

function shape(r) {
  return {
    id: r.id,
    competitionId: r.competitionId,
    // Part 36 — internal participants reuse the student's own member number;
    // only external ones carry an N-MEM-{year}-{seq} registration code.
    registrationCode: r.registrationCode ?? null,
    memberId: r.student?.memberId ?? r.student?.username ?? null,
    displayId: r.student?.memberId ?? r.student?.username ?? r.registrationCode ?? null,
    studentId: r.studentId,
    fullName: r.student?.fullName ?? r.externalName ?? "",
    phone: r.student?.phone ?? r.externalPhone ?? null,
    external: !r.studentId,
    amountPaid: r.amountPaid == null ? null : Number(r.amountPaid),
    registeredAt: r.registeredAt,
    receiptIssued: r.receiptIssued,
    receiptIssuedAt: r.receiptIssuedAt,
  };
}

export async function list(req, res, next) {
  try {
    const rows = await prisma.competitionRegistration.findMany({
      where: { competitionId: req.params.id },
      orderBy: { registeredAt: "desc" },
      include: { student: { select: { fullName: true, phone: true, memberId: true, username: true } } },
    });
    res.json(rows.map(shape));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const body = registrationSchema.parse(req.body);
    const competition = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!competition) return res.status(404).json({ error: "المسابقة غير موجودة" });

    // Part 36 — only EXTERNAL registrations get an N-MEM-{year}-{seq} code,
    // reserved atomically in the same transaction; internal participants are
    // identified by the student's own frozen memberId.
    const created = await prisma.$transaction(async (tx) => tx.competitionRegistration.create({
      data: {
        registrationCode: body.studentId ? null : await nextRegistrationCode(tx),
        competitionId: competition.id,
        studentId: body.studentId ?? null,
        externalName: body.studentId ? null : body.externalName ?? null,
        externalPhone: body.studentId ? null : body.externalPhone ?? null,
        amountPaid: body.amountPaid ?? null,
      },
      include: { student: { select: { fullName: true, phone: true, memberId: true, username: true } } },
    }));
    res.status(201).json(shape(created));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.competitionRegistration.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Idempotent: re-issuing returns the existing state instead of erroring.
export async function issueReceipt(req, res, next) {
  try {
    const existing = await prisma.competitionRegistration.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { fullName: true, phone: true, memberId: true, username: true } } },
    });
    if (!existing) return res.status(404).json({ error: "التسجيل غير موجود" });
    if (existing.receiptIssued) return res.json(shape(existing));

    const updated = await prisma.competitionRegistration.update({
      where: { id: existing.id },
      data: { receiptIssued: true, receiptIssuedAt: new Date() },
      include: { student: { select: { fullName: true, phone: true, memberId: true, username: true } } },
    });
    res.json(shape(updated));
  } catch (e) { next(e); }
}
