import { PrismaClient } from "@prisma/client";

// Singleton Prisma client for the whole backend.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
