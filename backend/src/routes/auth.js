import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rate-limit.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.fullName,
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
