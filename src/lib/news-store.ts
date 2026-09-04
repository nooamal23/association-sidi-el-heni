// News store — hydrated from the real backend when VITE_API_URL is set.
import { useSyncExternalStore, useEffect } from "react";
import { HAS_API, apiFetch } from "./api";

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  tag: "خبر" | "مناسبة دينية" | "إعلان" | string;
  dateGregorian: string;
  dateHijri: string;
  /** Part 29/3 — real sortable date (yyyy-MM-dd). */
  eventDate?: string | null;
};

const KEY = "sh_news_store_v2";

type State = { news: NewsItem[] };

function loadCache(): State {
  if (typeof window === "undefined") return { news: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { news: [] };
    const parsed = JSON.parse(raw) as Partial<State>;
    return { news: parsed.news ?? [] };
  } catch {
    return { news: [] };
  }
}

let state: State = loadCache();
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useNewsStore() {
  useEffect(() => { void ensureNewsLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

let loadedOnce = false;
let inflight: Promise<void> | null = null;

export async function ensureNewsLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loadedOnce) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await apiFetch<NewsItem[]>("/api/public/news");
      setState({ news: rows });
      loadedOnce = true;
    } catch (err) {
      console.warn("news-store: hydration failed", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

export const newsActions = {
  async add(n: Omit<NewsItem, "id">) {
    if (!HAS_API) {
      setState({ news: [{ ...n, id: crypto.randomUUID() }, ...state.news] });
      return;
    }
    try {
      await apiFetch("/api/admin/news", { method: "POST", body: JSON.stringify(n) });
    } catch (e) { await toastError(`تعذّر نشر الخبر: ${(e as Error).message}`); }
    await ensureNewsLoaded(true);
  },
  async update(id: string, patch: Partial<Omit<NewsItem, "id">>) {
    if (!HAS_API) {
      setState({ news: state.news.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
      return;
    }
    try {
      await apiFetch(`/api/admin/news/${id}`, { method: "PUT", body: JSON.stringify(patch) });
    } catch (e) { await toastError(`تعذّر تحديث الخبر: ${(e as Error).message}`); }
    await ensureNewsLoaded(true);
  },
  async remove(id: string) {
    if (!HAS_API) {
      setState({ news: state.news.filter((n) => n.id !== id) });
      return;
    }
    try {
      await apiFetch(`/api/admin/news/${id}`, { method: "DELETE" });
    } catch (e) { await toastError(`تعذّر حذف الخبر: ${(e as Error).message}`); }
    await ensureNewsLoaded(true);
  },
};
