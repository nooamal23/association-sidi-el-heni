// Tunisian phone number validation.
// Mobile: leading 2, 4, 5, 9 — Landline: leading 3, 7, 8.
// Accepts optional +216 / 216 country prefix and spaces/dashes.

export const TUNISIA_PHONE_MESSAGE =
  "الرجاء إدخال رقم هاتف تونسي صحيح (8 أرقام، يبدأ بـ 2 أو 4 أو 5 أو 7 أو 9).";

export function normalizeTunisianPhone(raw: string): string {
  return (raw ?? "").replace(/[\s\-().]/g, "");
}

export function isValidTunisianPhone(raw: string): boolean {
  const n = normalizeTunisianPhone(raw);
  return /^(\+?216)?[2345789]\d{7}$/.test(n);
}
