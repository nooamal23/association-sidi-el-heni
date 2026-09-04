import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AR_DATE = new Intl.DateTimeFormat("ar-TN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Format an ISO date (YYYY-MM-DD) to Arabic, e.g. "5 سبتمبر 2025". */
export function formatArabicDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return AR_DATE.format(d);
}

/** Part 37 — simple numeric date: 12/08/2026. */
export function formatSimpleDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Format an ISO date range to Arabic, e.g. "5 سبتمبر 2025 → 10 أكتوبر 2025". */
export function formatArabicDateRange(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return "—";
  return `${formatArabicDate(startIso)} → ${formatArabicDate(endIso)}`;
}

