// Part 35/39 — concurrency-safe ID generation.
//
// The next number is produced by a SINGLE atomic statement
// (INSERT ... ON CONFLICT DO UPDATE ... RETURNING), never by a
// read-then-write in application code, so two simultaneous requests can
// never obtain the same sequence value.

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} key  counter key, e.g. "STU", "TCH" or "NMEM-2026"
 * @returns {Promise<number>} the freshly reserved sequence number (1-based)
 */
export async function nextSequence(tx, key) {
  const rows = await tx.$queryRaw`
    INSERT INTO id_counters ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = id_counters."value" + 1
    RETURNING "value"
  `;
  return Number(rows[0].value);
}

const pad = (n) => String(n).padStart(6, "0");

/**
 * Part 39 — prefix-agnostic frozen ID: `${prefix}-000001`.
 * The counter key is the prefix itself, so each prefix owns its own sequence.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} prefix e.g. "STU", "TCH", "MEM"
 */
export async function nextId(tx, prefix) {
  return `${prefix}-${pad(await nextSequence(tx, prefix))}`;
}

/** STU-000001 — permanent member number of a student (Part 39). */
export async function nextMemberId(tx) {
  return nextId(tx, "STU");
}

/** TCH-000001 — permanent member number of an instructor (Part 39). */
export async function nextInstructorId(tx) {
  return nextId(tx, "TCH");
}

/** N-MEM-2026-000001 — code of a competition registration (internal or external). */
export async function nextRegistrationCode(tx, year = new Date().getFullYear()) {
  return `N-MEM-${year}-${pad(await nextSequence(tx, `NMEM-${year}`))}`;
}
