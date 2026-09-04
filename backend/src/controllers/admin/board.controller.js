import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { nextId } from "../../lib/id-sequence.js";

// Part 41 — a board member is either linked to an existing instructor (User)
// or a board-only entry with manually typed identity. Exactly one mode.
const manualSchema = z.object({
  fullName: z.string().min(2),
  birthDate: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  photoUrl: z.string().max(3_000_000, "photo too large").optional().nullable(),
});

const createSchema = z
  .object({
    instructorId: z.string().uuid().optional().nullable(),
    position: z.enum(["president", "vice_president", "secretary", "treasurer", "member"]),
    orderIndex: z.number().int().optional(),
  })
  .and(manualSchema.partial());

const updateSchema = z
  .object({
    position: z
      .enum(["president", "vice_president", "secretary", "treasurer", "member"])
      .optional(),
    orderIndex: z.number().int().optional(),
  })
  .and(manualSchema.partial());

const BOARD_INCLUDE = {
  instructor: {
    select: { id: true, fullName: true, phone: true, photoUrl: true, birthDate: true, memberId: true },
  },
};

function serializeBoard(b) {
  const src = b.instructor ?? b;
  const birthDate = b.instructor ? b.instructor.birthDate : b.birthDate;
  return {
    id: b.id,
    memberId: b.memberId,
    instructorId: b.instructorId ?? null,
    instructorMemberId: b.instructor?.memberId ?? null,
    fullName: src.fullName ?? "",
    phone: src.phone ?? null,
    photoUrl: src.photoUrl ?? null,
    birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
    position: b.position,
    orderIndex: b.orderIndex,
    createdAt: b.createdAt,
  };
}

export async function list(_req, res, next) {
  try {
    const rows = await prisma.boardMember.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: BOARD_INCLUDE,
    });
    res.json(rows.map(serializeBoard));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const b = createSchema.parse(req.body);
    const linked = Boolean(b.instructorId);
    if (linked && b.fullName) {
      return res.status(400).json({
        error: "اختر إمّا ربط معلّم موجود أو إدخال شخص جديد، لا كليهما.",
      });
    }
    if (!linked && !b.fullName) {
      return res.status(400).json({
        error: "يجب ربط معلّم موجود أو إدخال الاسم الكامل لعضو جديد.",
      });
    }

    if (linked) {
      const user = await prisma.user.findUnique({ where: { id: b.instructorId } });
      if (!user || user.role !== "instructor") {
        return res.status(400).json({ error: "المعلّم غير موجود." });
      }
      const seat = await prisma.boardMember.findFirst({
        where: { instructorId: b.instructorId },
      });
      if (seat) {
        return res
          .status(409)
          .json({ error: "هذا المعلم عضو في الهيئة التسييرية بالفعل" });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const memberId = await nextId(tx, "MEM");
      return tx.boardMember.create({
        data: {
          memberId,
          position: b.position,
          orderIndex: b.orderIndex ?? 0,
          instructorId: linked ? b.instructorId : null,
          fullName: linked ? null : b.fullName,
          birthDate: linked || !b.birthDate ? null : new Date(b.birthDate),
          phone: linked ? null : (b.phone ?? null),
          photoUrl: linked ? null : (b.photoUrl ?? null),
        },
        include: BOARD_INCLUDE,
      });
    });
    res.status(201).json(serializeBoard(created));
  } catch (e) {
    // Partial unique index safety net (one_board_seat_per_instructor).
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ error: "هذا المعلم عضو في الهيئة التسييرية بالفعل" });
    }
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const patch = updateSchema.parse(req.body);
    const existing = await prisma.boardMember.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "العضو غير موجود." });

    const data = {};
    if (patch.position !== undefined) data.position = patch.position;
    if (patch.orderIndex !== undefined) data.orderIndex = patch.orderIndex;
    // Identity fields are only editable for board-only entries; linked entries
    // read their identity live from the instructor's own User record.
    if (!existing.instructorId) {
      if (patch.fullName !== undefined) data.fullName = patch.fullName;
      if (patch.phone !== undefined) data.phone = patch.phone || null;
      if (patch.photoUrl !== undefined) data.photoUrl = patch.photoUrl || null;
      if (patch.birthDate !== undefined) {
        data.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;
      }
    }
    const updated = await prisma.boardMember.update({
      where: { id: req.params.id },
      data,
      include: BOARD_INCLUDE,
    });
    res.json(serializeBoard(updated));
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    // Deletes only the board seat — the linked User/instructor is untouched.
    await prisma.boardMember.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
