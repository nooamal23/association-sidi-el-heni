import { useEffect, useState } from "react";
import { X, AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { NOTICE_EVENT, type NoticeOptions } from "@/lib/notice-toast";

const ICONS = {
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle2,
};

const TONE = {
  error: {
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
    button: "bg-destructive hover:opacity-90",
  },
  warning: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    button: "bg-amber-500 hover:opacity-90",
  },
  info: {
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    button: "bg-primary hover:opacity-90",
  },
  success: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    button: "bg-emerald-500 hover:opacity-90",
  },
};

export function NoticeDialog() {
  const [state, setState] = useState<NoticeOptions | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<NoticeOptions>).detail;
      setState(detail);
    }
    window.addEventListener(NOTICE_EVENT, handler);
    return () => window.removeEventListener(NOTICE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setState(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  if (!state) return null;

  const variant = state.variant ?? "info";
  const tone = TONE[variant];
  const Icon = ICONS[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 px-4 backdrop-blur-sm"
      onClick={() => setState(null)}
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-7 text-center sm:p-9">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tone.iconBg} ${tone.iconText}`}
          >
            <Icon className="h-8 w-8" />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold text-foreground sm:text-2xl leading-snug">
            {state.title ?? (variant === "error" ? "تنبيه" : "ملاحظة")}
          </h2>

          <p className="mt-3 text-base font-medium text-foreground sm:text-lg leading-relaxed">
            {state.message}
          </p>

          {state.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
              {state.description}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse items-center justify-center gap-3 border-t border-border bg-surface/60 p-5 sm:flex-row sm:gap-4 sm:p-6">
          {!state.hideDismiss && (
            <button
              onClick={() => setState(null)}
              className={
                state.actions?.length
                  ? "flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3.5 text-base font-bold text-foreground shadow-soft transition-colors hover:bg-secondary sm:w-auto sm:min-w-[140px]"
                  : `flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-soft transition-opacity sm:w-auto sm:min-w-[160px] ${tone.button}`
              }
              autoFocus={!state.actions?.length}
            >
              <X className="h-5 w-5" />
              {state.dismissLabel ?? "فهمت، إخفاء"}
            </button>
          )}
          {state.actions?.map((a) => (
            <button
              key={a.label}
              onClick={() => { setState(null); void a.onClick(); }}
              className={
                a.style === "outline"
                  ? "flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3.5 text-base font-bold text-foreground shadow-soft transition-colors hover:bg-secondary sm:w-auto sm:min-w-[140px]"
                  : `flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-soft transition-opacity sm:w-auto sm:min-w-[140px] ${tone.button}`
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
