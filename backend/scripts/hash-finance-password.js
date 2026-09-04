#!/usr/bin/env node
// Generate a bcrypt hash for the finance-module password.
// Usage:
//   node backend/scripts/hash-finance-password.js "your-new-password"
//
// Prints TWO forms:
//   - Raw hash: for real environment variables (process manager, CI secret, k8s Secret).
//   - Compose-safe hash: for backend/.env when loaded via docker-compose `env_file:`.
//     Docker Compose interpolates `$` in env_file values, and bcrypt hashes contain
//     literal `$` characters — so every `$` MUST be doubled ($ -> $$) or the hash
//     is silently corrupted and finance unlock always reports "wrong password".

import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node backend/scripts/hash-finance-password.js "<password>"');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const composeSafe = hash.replace(/\$/g, "$$$$");

console.log("");
console.log("Raw hash (use as-is for a REAL environment variable — process manager,");
console.log("CI/CD secret, Kubernetes Secret, or `docker run -e FINANCE_PASSWORD_HASH=...`):");
console.log("");
console.log("  " + hash);
console.log("");
console.log("For backend/.env (loaded by docker-compose `env_file:`, needs every `$` doubled");
console.log("to avoid Compose interpolation silently corrupting the hash):");
console.log("");
console.log("  FINANCE_PASSWORD_HASH=" + composeSafe);
console.log("");
