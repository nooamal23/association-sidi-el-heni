import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const REQ_STATUSES = ["pending", "approved", "rejected"];

const resolveSchema = z.object({ action: z.enum(["approve", "reject"]) });

export async function list(req, res, next) {
  try {
    const status = String(req.query.status ?? "pending");
    const where =
      status === "all" ? {} : REQ_STATUSES.includes(status) ? { status } : { status: "pending" };
    const rows = await prisma.registrationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        ageCategory: true,
        phone: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        resolvedById: true,
      },
    });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function resolve(req, res, next) {
  try {
    // Validate but don't act on the action — both approve and reject now
    // hard-delete the row. Approved requests: the resulting User row is the
    // durable record. Rejected requests: no ongoing value.
    resolveSchema.parse(req.body);
    try {
      await prisma.registrationRequest.delete({ where: { id: req.params.id } });
    } catch (err) {
      if (err?.code === "P2025") return res.status(404).json({ error: "not_found" });
      throw err;
    }
    res.json({ id: req.params.id, deleted: true });
  } catch (e) { next(e); }
}