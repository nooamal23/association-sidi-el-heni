import { useEffect, useRef, useState } from "react";

/**
 * Part 28/4 — automatic data refresh, replacing manual "تحديث" buttons.
 * Re-runs `reload` when the tab regains focus/visibility and on a timer,
 * and exposes the timestamp of the last successful refresh so staleness
 * is always visible to the admin.
 */
export function useAutoRefresh(
  reload: () => Promise<unknown> | unknown,
  { intervalMs = 45_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let running = false;

    const run = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        await reloadRef.current();
        if (!cancelled) setLastRefreshedAt(new Date());
      } finally {
        running = false;
      }
    };

    const onFocus = () => void run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => void run(), intervalMs);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);

  // Mark the initial load (owned by the caller's own effect) as fresh.
  useEffect(() => { setLastRefreshedAt(new Date()); }, []);

  return { lastRefreshedAt, markRefreshed: () => setLastRefreshedAt(new Date()) };
}

export function formatRefreshTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleTimeString("ar-TN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
