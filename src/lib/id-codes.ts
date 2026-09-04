// Part 35 — offline fallback for the auto-generated, frozen IDs.
//
// When VITE_API_URL is unset the admin space runs on localStorage only, so the
// database counter is not reachable. We mirror the same year-scoped, sequential
// scheme locally: MEM-{year}-{seq} for students, N-MEM-{year}-{seq} for
// competition registrations. The authoritative generator is always the backend
// (see backend/src/lib/id-sequence.js) — this only keeps the demo consistent.

const KEY = "sh_id_counters_v1";

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, number>) ?? {};
  } catch {
    return {};
  }
}

function nextSequence(counterKey: string): number {
  const all = read();
  const value = (all[counterKey] ?? 0) + 1;
  all[counterKey] = value;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ }
  }
  return value;
}

const pad = (n: number) => String(n).padStart(6, "0");

/** Part 39 — prefix-agnostic frozen ID: `${prefix}-000001`. */
export function localNextId(prefix: string): string {
  return `${prefix}-${pad(nextSequence(prefix))}`;
}

/** Part 39 — student ID: STU-000001 (one ongoing sequence, no year). */
export function localNextMemberId(): string {
  return localNextId("STU");
}

/** Part 39 — instructor ID: TCH-000001. */
export function localNextInstructorId(): string {
  return localNextId("TCH");
}

export function localNextRegistrationCode(year = new Date().getFullYear()): string {
  return `N-MEM-${year}-${pad(nextSequence(`NMEM-${year}`))}`;
}
