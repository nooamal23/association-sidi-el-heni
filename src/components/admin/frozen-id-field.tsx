// Part 40 — shared, reusable display for auto-generated frozen unique IDs
// (students STU-, instructors TCH-, board members MEM- in Part 41).
// Placeholder before the record is saved, real value right after.

export const FROZEN_ID_LABEL = "المعرف الوحيد";
export const FROZEN_ID_PLACEHOLDER = "يُولَّد آلياً بعد الحفظ";

export function FrozenIdField({
  value,
  example,
  label = FROZEN_ID_LABEL,
}: {
  /** The real generated ID once it exists; empty/undefined before saving. */
  value?: string | null;
  /** Example shown in the helper text, e.g. "STU-000001". */
  example?: string;
  label?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2.5">
        <span
          className={`font-mono text-sm font-bold ${value ? "text-foreground" : "text-muted-foreground"}`}
          dir={value ? "ltr" : undefined}
        >
          {value || FROZEN_ID_PLACEHOLDER}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        معرّف وحيد ودائم يُنشئه النظام تلقائياً{example ? ` (مثال: ${example})` : ""} — لا يمكن تغييره.
      </p>
    </div>
  );
}
