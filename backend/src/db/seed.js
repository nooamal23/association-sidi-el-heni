import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./prisma.js";

// --- Admin password strategy ---
// 1. If SEED_ADMIN_PASSWORD env var is set, use it.
// 2. Otherwise, generate a strong random password and print it once.
// The insecure literal "admin1234" default is intentionally NOT used anymore.
let adminPassword = process.env.SEED_ADMIN_PASSWORD;
let generated = false;
if (!adminPassword) {
  adminPassword = randomBytes(15).toString("base64").replace(/[+/=]/g, "").slice(0, 20);
  generated = true;
}

const passwordHash = await bcrypt.hash(adminPassword, 10);

const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });

if (existingAdmin) {
  console.log("• Admin user already exists — password NOT modified.");
} else {
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash,
      fullName: "مدير الفرع",
      role: "admin",
    },
  });

  const banner = "═".repeat(72);
  console.log("\n" + banner);
  if (generated) {
    console.log("⚠  ADMIN ACCOUNT CREATED WITH A RANDOMLY GENERATED PASSWORD");
    console.log("   Username: admin");
    console.log(`   Password: ${adminPassword}`);
    console.log("   This password is shown ONCE. Save it now, then change it immediately");
    console.log("   after your first login.");
  } else {
    console.log("⚠  ADMIN ACCOUNT CREATED USING SEED_ADMIN_PASSWORD");
    console.log("   Username: admin");
    console.log("   Change this password immediately after your first login.");
  }
  console.log(banner + "\n");
}

await prisma.$disconnect();
