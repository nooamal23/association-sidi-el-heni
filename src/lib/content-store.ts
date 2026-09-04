// Content store for competitions and gallery.
//
// Part 44 — SINGLE SOURCE OF TRUTH: there is exactly one competitions list on the
// frontend (`state.competitions`, hydrated from /api/public/competitions).
// "الإعلان عن مسابقات" and "نتائج المسابقات" are two *views* over that same list:
//   • announcements = every competition row (+ local-only presentation extras:
//     description / deadline / imageUrl, which have no backend column yet)
//   • results       = rows that actually have results entered (hasResults)
// Nothing is ever merged/concatenated anymore, so no row can render twice.

import { useSyncExternalStore, useEffect } from "react";
import { HAS_API, apiFetch } from "./api";

export type Competition = {
  id: string;
  name: string;
  level: "محلية" | "جهوية" | "وطنية" | string;
  year: number;
  participants: number;
  passed: number;
  passRate?: number;
  topThree: { rank: number; name: string; category: string }[];
  /** Part 29/3 — real date (yyyy-MM-dd) + place of the competition. */
  eventDate?: string | null;
  location?: string | null;
};

export type GalleryEntry = {
  id: string;
  title: string;
  date: string;
  url: string;
  imageUrl?: string;
  imageSeed?: number;
};

export type CompetitionAnnouncement = {
  id: string;
  title: string;
  level: "محلية" | "جهوية" | "وطنية";
  date: string;
  deadline?: string;
  location: string;
  description: string;
  imageUrl?: string;
};

/** Local-only presentation fields for a competition (no backend column yet). */
type Extra = { description?: string; deadline?: string; imageUrl?: string };

type Persisted = {
  competitions: Competition[];
  gallery: GalleryEntry[];
  extras: Record<string, Extra>;
};

type State = Persisted & {
  /** Derived from competitions + extras — never stored independently. */
  announcements: CompetitionAnnouncement[];
};

const KEY = "sh_content_store_v3";
const EMPTY: Persisted = { competitions: [], gallery: [], extras: {} };

/** A competition has results once numbers or a podium were entered. */
export function hasResults(c: Competition): boolean {
  return (c.participants ?? 0) > 0 || (c.passed ?? 0) > 0 || (c.topThree?.length ?? 0) > 0;
}

function toAnnouncement(c: Competition, extras: Record<string, Extra>): CompetitionAnnouncement {
  const e = extras[c.id] ?? {};
  return {
    id: c.id,
    title: c.name,
    level: c.level as CompetitionAnnouncement["level"],
    date: c.eventDate ?? "",
    deadline: e.deadline || undefined,
    location: c.location ?? "",
    description: e.description ?? "",
    imageUrl: e.imageUrl || undefined,
  };
}

function derive(p: Persisted): State {
  return { ...p, announcements: p.competitions.map((c) => toAnnouncement(c, p.extras)) };
}

function loadCache(): State {
  if (typeof window === "undefined") return derive(EMPTY);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return derive(EMPTY);
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return derive({
      competitions: parsed.competitions ?? [],
      gallery: parsed.gallery ?? [],
      extras: parsed.extras ?? {},
    });
  } catch {
    return derive(EMPTY);
  }
}

let state: State = loadCache();
const listeners = new Set<() => void>();

function setState(next: Persisted) {
  state = derive(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ competitions: state.competitions, gallery: state.gallery, extras: state.extras }),
      );
    } catch {}
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useContentStore() {
  useEffect(() => { void ensureContentLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

let loadedOnce = false;
let inflight: Promise<void> | null = null;

export async function ensureContentLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loadedOnce) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [comps, gal] = await Promise.all([
        apiFetch<any[]>("/api/public/competitions").catch(() => null),
        apiFetch<any[]>("/api/public/gallery").catch(() => null),
      ]);
      if (comps && gal) {
        setState({
          ...state,
          competitions: comps.map((c) => ({
            id: c.id,
            name: c.name,
            level: c.level,
            year: c.year,
            participants: c.participants,
            passed: c.passed,
            passRate: c.passRate,
            topThree: Array.isArray(c.topThree) ? c.topThree : [],
            eventDate: c.eventDate ? String(c.eventDate).slice(0, 10) : null,
            location: c.location ?? null,
          })),
          gallery: gal.map((g) => ({
            id: g.id,
            title: g.title,
            date: g.date,
            url: g.url,
            imageUrl: g.url,
          })),
        });
        loadedOnce = true;
      }
    } catch (err) {
      console.warn("content-store: hydration failed", err);
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

export const competitionsActions = {
  /** Returns the id of the created row (real backend id when the API is on). */
  async add(c: Omit<Competition, "id">): Promise<string> {
    if (!HAS_API) {
      const id = crypto.randomUUID();
      setState({ ...state, competitions: [{ ...c, id }, ...state.competitions] });
      return id;
    }
    let id = "";
    try {
      const created = await apiFetch<{ id: string }>("/api/admin/competitions", {
        method: "POST",
        body: JSON.stringify({
          name: c.name, level: c.level, year: c.year,
          participants: c.participants, passed: c.passed,
          topThree: c.topThree ?? [],
          eventDate: c.eventDate || null,
          location: c.location || null,
        }),
      });
      id = created?.id ?? "";
    } catch (e) { await toastError(`تعذّر إضافة المسابقة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
    return id;
  },
  async update(id: string, patch: Partial<Omit<Competition, "id">>) {
    if (!HAS_API) {
      setState({ ...state, competitions: state.competitions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      for (const k of ["name", "level", "year", "participants", "passed", "topThree", "eventDate", "location"] as const) {
        if (patch[k] !== undefined) body[k] = patch[k];
      }
      await apiFetch(`/api/admin/competitions/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } catch (e) { await toastError(`تعذّر تحديث المسابقة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
  },
  async remove(id: string) {
    if (!HAS_API) {
      setState({ ...state, competitions: state.competitions.filter((c) => c.id !== id) });
      return;
    }
    try {
      await apiFetch(`/api/admin/competitions/${id}`, { method: "DELETE" });
    } catch (e) { await toastError(`تعذّر حذف المسابقة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
  },
};

export const galleryActions = {
  async add(g: Omit<GalleryEntry, "id">) {
    const url = g.url || g.imageUrl || "";
    if (!HAS_API) {
      setState({ ...state, gallery: [{ ...g, url, id: crypto.randomUUID() }, ...state.gallery] });
      return;
    }
    try {
      await apiFetch("/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({ title: g.title, date: g.date, url }),
      });
    } catch (e) { await toastError(`تعذّر إضافة الصورة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
  },
  async update(id: string, patch: Partial<Omit<GalleryEntry, "id">>) {
    if (!HAS_API) {
      setState({ ...state, gallery: state.gallery.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      if (patch.title !== undefined) body.title = patch.title;
      if (patch.date !== undefined) body.date = patch.date;
      if (patch.url !== undefined || patch.imageUrl !== undefined) body.url = patch.url ?? patch.imageUrl;
      await apiFetch(`/api/admin/gallery/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } catch (e) { await toastError(`تعذّر تحديث الصورة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
  },
  async remove(id: string) {
    if (!HAS_API) {
      setState({ ...state, gallery: state.gallery.filter((g) => g.id !== id) });
      return;
    }
    try {
      await apiFetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    } catch (e) { await toastError(`تعذّر حذف الصورة: ${(e as Error).message}`); }
    await ensureContentLoaded(true);
  },
};

function yearOf(date: string): number {
  const y = Number(String(date).slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : new Date().getFullYear();
}

// Announcements write to the SAME competitions table; only description/deadline/
// imageUrl live locally until the backend gains those columns.
export const announcementsActions = {
  async add(a: Omit<CompetitionAnnouncement, "id">) {
    const id = await competitionsActions.add({
      name: a.title,
      level: a.level,
      year: yearOf(a.date),
      participants: 0,
      passed: 0,
      topThree: [],
      eventDate: a.date || null,
      location: a.location || null,
    });
    if (!id) return;
    setState({
      ...state,
      extras: {
        ...state.extras,
        [id]: { description: a.description, deadline: a.deadline, imageUrl: a.imageUrl },
      },
    });
  },
  async update(id: string, patch: Partial<Omit<CompetitionAnnouncement, "id">>) {
    const compPatch: Partial<Omit<Competition, "id">> = {};
    if (patch.title !== undefined) compPatch.name = patch.title;
    if (patch.level !== undefined) compPatch.level = patch.level;
    if (patch.location !== undefined) compPatch.location = patch.location;
    if (patch.date !== undefined) { compPatch.eventDate = patch.date || null; compPatch.year = yearOf(patch.date); }
    if (Object.keys(compPatch).length) await competitionsActions.update(id, compPatch);
    setState({
      ...state,
      extras: {
        ...state.extras,
        [id]: {
          ...(state.extras[id] ?? {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.deadline !== undefined ? { deadline: patch.deadline } : {}),
          ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        },
      },
    });
  },
  async remove(id: string) {
    await competitionsActions.remove(id);
    const extras = { ...state.extras };
    delete extras[id];
    setState({ ...state, extras });
  },
};
