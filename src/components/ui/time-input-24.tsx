// 24-hour time picker (00:00 → 23:55). Native <input type="time"> renders an
// AM/PM clock in some locales, which confused admins, so we always show an
// explicit 24-hour hour/minute pair instead.
type Props = {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  required?: boolean;
  minuteStep?: number;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));

const selectClass =
  "w-full rounded-lg border border-input bg-background px-2 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function TimeInput24({ value, onChange, required, minuteStep = 5, className }: Props) {
  const [h = "", m = ""] = (value ?? "").split(":");
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  const minuteOptions = m && !minutes.includes(m) ? [...minutes, m].sort() : minutes;

  function set(nextH: string, nextM: string) {
    if (!nextH && !nextM) return onChange("");
    onChange(`${nextH || "00"}:${nextM || "00"}`);
  }

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`} dir="ltr">
      <select
        aria-label="الساعة (نظام 24 ساعة)"
        required={required}
        value={h}
        onChange={(e) => set(e.target.value, m)}
        className={selectClass}
      >
        <option value="">--</option>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="text-sm font-bold text-muted-foreground">:</span>
      <select
        aria-label="الدقائق"
        required={required}
        value={m}
        onChange={(e) => set(h, e.target.value)}
        className={selectClass}
      >
        <option value="">--</option>
        {minuteOptions.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="shrink-0 text-[11px] text-muted-foreground">24h</span>
    </div>
  );
}
