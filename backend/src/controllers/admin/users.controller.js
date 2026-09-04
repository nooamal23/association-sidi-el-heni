import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { nextMemberId, nextInstructorId } from "../../lib/id-sequence.js";

// ~2 MB image → ~2.75 MB base64 text. Cap slightly above that; anything
// larger is rejected before hitting the DB.
const MAX_PHOTO_LEN = 3_000_000;
const photoField = z
  .string()
  .max(MAX_PHOTO_LEN, "photo too large")
  .optional()
  .nullable();

const createUserSchema = z.object({
  // Part 39 — students AND instructors no longer supply a username: it IS the
  // auto-generated member number (STU-000001 / TCH-000001), optional + ignored.
  username: z.string().min(2).optional().nullable(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["admin", "instructor", "student"]),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  photoUrl: photoField,
});


const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "instructor", "student"]).optional(),
  isActive: z.boolean().optional(),
  username: z.string().min(2).optional(),
  birthDate: z.string().optional().nullable(),
  photoUrl: photoField,
});

export async function list(_req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, fullName: true, role: true,
        memberId: true,
        phone: true, birthDate: true, photoUrl: true,
        isActive: true, createdAt: true,
        enrollments: {
          select: {
            courseId: true,
            group: { select: { id: true, number: true, level: { select: { name: true } } } },
          },
        },
        groupsTaught: { select: { courseId: true } },
      },
    });
    res.json(users.map(u => {
      const firstGroup = u.enrollments[0]?.group ?? null;
      return {
        ...u,
        birthDate: u.birthDate ? u.birthDate.toISOString().slice(0, 10) : null,
        groupId: firstGroup?.id ?? null,
        groupNumber: firstGroup?.number ?? null,
        groupLevelName: firstGroup?.level?.name ?? null,
        courseIds: [
          ...new Set([
            ...u.enrollments.map(e => e.courseId),
            ...u.groupsTaught.map(g => g.courseId),
          ]),
        ],
        enrollments: undefined,
        groupsTaught: undefined,
      };
    }));
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);
    // Part 39 — the member number IS the username for students (STU-000001)
    // and instructors (TCH-000001): one field, one value, reserved atomically
    // with the row creation. Admin accounts keep a manual username.
    const user = await prisma.$transaction(async (tx) => {
      const memberId =
        data.role === "student"
          ? await nextMemberId(tx)
          : data.role === "instructor"
            ? await nextInstructorId(tx)
            : null;
      const username = memberId ?? data.username;
      if (!username) throw Object.assign(new Error("اسم المستخدم مطلوب"), { status: 400 });
      return tx.user.create({
      data: {
        memberId,
        username,

        passwordHash: await bcrypt.hash(data.password, 10),
        fullName: data.fullName,
        role: data.role,
        phone: data.phone || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        photoUrl: data.photoUrl || null,
      },
      select: {
        id: true, username: true, fullName: true, role: true,
        memberId: true,
        phone: true, birthDate: true, photoUrl: true,
        isActive: true, createdAt: true,
      },
      });
    });
    res.status(201).json({
      ...user,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
    });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const patch = updateUserSchema.parse(req.body);
    // Part 39 — memberId (= the username of students and instructors) is
    // frozen: never editable.
    const data = { ...patch };
    delete data.memberId;
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { role: true },
    });
    if (existing?.role === "student" || existing?.role === "instructor") delete data.username;

    if (patch.birthDate !== undefined) {
      data.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, username: true, fullName: true, role: true,
        memberId: true,
        phone: true, birthDate: true, photoUrl: true,
        isActive: true, createdAt: true,
      },
    });
    res.json({
      ...user,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
    });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function resetPassword(req, res, next) {
  try {
    const password = z.string().min(6).parse(req.body.password);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}