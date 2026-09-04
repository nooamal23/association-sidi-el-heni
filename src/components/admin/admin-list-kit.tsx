// Part 52/53 — shared presentation pieces for the admin people-style pages
// (stat cards, avatar, horizontal field row, pagination). التلاميذ is the
// reference design; المعلمون and الهيئة التسييرية reuse exactly these pieces.
import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function StatCard({
  icon,
  value,
  label,
  unit,
  tone = "primary",
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  unit?: string;
  tone?: "primary" | "gold" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "gold"
      ? "bg-gold-faint text-gold"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-600"
        : tone === "amber"
          ? "bg-amber-500/10 text-amber-600"
          : "bg-primary/10 text-primary";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1 font-display text-2xl font-bold leading-none text-foreground">
          <span>{value}</span>
          {unit ? <span className="text-xs font-normal text-muted-foreground">{unit}</span> : null}
        </div>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        {icon}
      </div>
    </div>
  );
}

/** Same shell as StatCard but with a text value (e.g. آخر تحديث). */
export function InfoStatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-base font-bold leading-none text-primary">
          {value}
        </div>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
    </div>
  );
}

export function PersonAvatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
      />
    );
  }
  const initial = name?.trim().charAt(0) || "?";
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xl font-bold text-primary">
      {initial}
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}

/** Horizontal icon + label / value cell used inside the person cards. */
export function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
      {children}
    </div>
  );
}

/** Small square icon action button used in the card header. */
export function IconAction({
  icon,
  title,
  onClick,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  tone?: "neutral" | "danger" | "primary";
}) {
  const cls =
    tone === "danger"
      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
      : tone === "primary"
        ? "border-primary/30 text-primary hover:bg-primary/10"
        : "border-border text-foreground hover:bg-secondary";
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg border bg-background p-2 ${cls}`}
    >
      {icon}
    </button>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`}
      />
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

/** Soft footer button matching the التلاميذ card actions. */
export function SoftButton({
  icon,
  label,
  onClick,
  variant = "soft",
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "soft" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
        variant === "soft"
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "bg-secondary text-foreground hover:bg-secondary/70"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Client-side pagination over an already-filtered list. */
export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );
  return {
    page: current,
    setPage,
    pageCount,
    slice,
    from: items.length === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
}

function pageList(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const set = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - (nums[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  noun,
  onPage,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  noun: string;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const items = pageList(page, pageCount);
  const navCls =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
      <span>
        عرض {from} إلى {to} من أصل {total} {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="السابق"
            className={navCls}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {items.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onPage(n)}
                className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold ${
                  n === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => onPage(Math.min(pageCount, page + 1))}
            disabled={page === pageCount}
            aria-label="التالي"
            className={navCls}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
