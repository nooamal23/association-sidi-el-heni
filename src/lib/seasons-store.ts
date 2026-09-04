// Store for academic seasons (fetched from backend).
import { useSyncExternalStore, useEffect } from "react";
import { HAS_API, apiFetch } from "./api";

export type SeasonPhase =
  | "not_started"
  | "registration"
  | "study"
  | "evaluation"
  | "final_competition"
  | "ended";

export const PHASE_LABEL: Record<SeasonPhase, string> = {
  not_started: "لم يبدأ بعد",
  registration: "التسجيل",
  study: "الدراسة",
  evaluation: "التقييم",
  final_competition: "المسابقة الختامية",
  ended: "انتهى الموسم",
};

export type Season = {
  id: number;
  name: string;
  startsOn: string;
  studyStartsOn: string;
  evaluationStartsOn: string;
  finalCompetitionStartsOn: string;
  endsOn: string;
  isActive: boolean;
  coursesCount: number;
};

export function computePhase(s: Pick<Season, "startsOn" | "studyStartsOn" | "evaluationStartsOn" | "finalCompetitionStartsOn" | "endsOn">, today = new Date().toISOString().slice(0, 10)): SeasonPhase {
  if (today < s.startsOn) return "not_started";
  if (today < s.studyStartsOn) return "registration";
  if (today < s.evaluationStartsOn) return "study";
  if (today < s.finalCompetitionStartsOn) return "evaluation";
  if (today <= s.endsOn) return "final_competition";
  return "ended";
}

let seasons: Season[] = [];
const listeners = new Set<() => void>();
let loadedOnce = false;
let inflight: Promise<void> | null = null;

function notify() { listeners.forEach((l) => l()); }

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function ensureSeasonsLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loadedOnce) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await apiFetch<Season[]>("/api/admin/seasons");
      seasons = rows;
      loadedOnce = true;
      notify();
    } catch (err) {
      console.warn("seasons-store: hydration failed", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useSeasonsStore() {
  useEffect(() => { void ensureSeasonsLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => seasons, () => seasons);
}

export function getActiveSeason(): Season | undefined {
  return seasons.find((s) => s.isActive);
}

async function toastError(msg: string) {
  const { noticeToast } = await import("./notice-toast");
  noticeToast({ variant: "error", title: "تعذّر حفظ الموسم", message: msg });
}

export const seasonsActions = {
  async add(input: Omit<Season, "id" | "coursesCount">) {
    try {
      await apiFetch("/api/admin/seasons", {
        method: "POST",
        body: JSON.stringify(input),
      });
    } catch (e) {
      await toastError((e as Error).message);
      throw e;
    }
    await ensureSeasonsLoaded(true);
  },
  async update(id: number, patch: Partial<Omit<Season, "id" | "coursesCount">>) {
    try {
      await apiFetch(`/api/admin/seasons/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    } catch (e) {
      await toastError((e as Error).message);
      throw e;
    }
    await ensureSeasonsLoaded(true);
  },
  async remove(id: number) {
    try {
      await apiFetch(`/api/admin/seasons/${id}`, { method: "DELETE" });
    } catch (e) {
      await toastError(`تعذّر حذف الموسم: ${(e as Error).message}`);
    }
    await ensureSeasonsLoaded(true);
  },
  async activate(id: number) {
    try {
      await apiFetch(`/api/admin/seasons/${id}/activate`, { method: "POST" });
    } catch (e) {
      await toastError(`تعذّر تفعيل الموسم: ${(e as Error).message}`);
    }
    await ensureSeasonsLoaded(true);
  },
};
