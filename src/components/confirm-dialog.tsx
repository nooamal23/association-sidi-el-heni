import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { CONFIRM_EVENT, type ConfirmOptions } from "@/lib/confirm-toast";

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<ConfirmOptions>).detail;
      setState(detail);
    }
    window.addEventListener(CONFIRM_EVENT, handler);
    return () => window.removeEventListener(CONFIRM_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function close(confirmed: boolean) {
    if (!state) return;
    const s = state;
    setState(null);
    if (confirmed) s.onConfirm();
    else s.onCancel?.();
  }

  if (!state) return null;

  const danger = state.variant !== "default";
  const confirmLabel = state.confirmLabel ?? "تأكيد الحذف";
  const cancelLabel = state.cancelLabel ?? "إلغاء";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-4"
      onClick={() => close(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elevated animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-6 sm:p-7 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-foreground sm:text-2xl">
            {state.message}
          </h2>
          {state.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {state.description}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface/60 p-4 sm:flex-row sm:justify-center sm:gap-3 sm:p-5">
          <button
            onClick={() => close(false)}
            className="w-full rounded-xl border-2 border-border bg-background px-6 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary sm:w-auto sm:min-w-[140px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            className={`w-full rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-soft transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[160px] ${
              danger ? "bg-destructive" : "bg-primary"
            }`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
