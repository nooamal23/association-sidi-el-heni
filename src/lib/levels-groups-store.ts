// Store for Levels + Groups. A group (فوج) always belongs to exactly one
// course; the level is an optional tag on the group.
import { useSyncExternalStore, useEffect } from "react";
import { ApiError, HAS_API, apiFetch } from "./api";
import { noticeToast } from "./notice-toast";

export type Level = {
  id: string;
  name: string;
  groupsCount: number;
};

export type StudentGroup = {
  id: string;
  number: number;
  courseId: string;
  courseTitle?: string | null;
  levelId: string | null;
  levelName?: string | null;
  hizbCount?: number;
  instructorId?: string | null;
  instructorName?: string | null;
  room?: string | null;
  capacity: number;
  days: number[];
  timeFrom?: string | null;
  timeTo?: string | null;
  studentsCount: number;
};

export type GroupInput = {
  courseId: string;
  number: number;
  levelId?: string | null;
  instructorId?: string | null;
  room?: string | null;
  capacity?: number;
  days?: number[];
  timeFrom?: string | null;
  timeTo?: string | null;
};

export type GroupStudent = {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  photoUrl: string | null;
  groupId: string | null;
};

type State = { levels: Level[]; groups: StudentGroup[] };

let state: State = { levels: [], groups: [] };
const listeners = new Set<() => void>();
let loadedOnce = false;
let inflight: Promise<void> | null = null;

function notify() { listeners.forEach((l) => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export async function ensureLevelsGroupsLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loadedOnce) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [levels, groups] = await Promise.all([
        apiFetch<Level[]>("/api/admin/levels"),
        apiFetch<StudentGroup[]>("/api/admin/groups"),
      ]);
      state = { levels, groups };
      loadedOnce = true;
      notify();
    } catch (err) {
      console.warn("levels-groups-store: hydration failed", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useLevelsGroups() {
  useEffect(() => { void ensureLevelsGroupsLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

// Hard business-rule rejections (409) must be impossible to miss: show them in
// the large centered notice dialog instead of a small auto-dismissing toast.
async function reportError(e: unknown, fallbackPrefix: string) {
  const err = e as ApiError;
  if (err instanceof ApiError && err.status === 409) {
    noticeToast({
      variant: "warning",
      title: "تعذّر الحفظ",
      message: err.message,
    });
    return;
  }
  await toastError(`${fallbackPrefix}: ${(e as Error).message}`);
}

export const levelsActions = {
  async add(input: { name: string }) {
    try { await apiFetch("/api/admin/levels", { method: "POST", body: JSON.stringify(input) }); }
    catch (e) { await toastError(`تعذّر إنشاء المستوى: ${(e as Error).message}`); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
  async update(id: string, patch: { name?: string }) {
    try { await apiFetch(`/api/admin/levels/${id}`, { method: "PUT", body: JSON.stringify(patch) }); }
    catch (e) { await toastError(`تعذّر تحديث المستوى: ${(e as Error).message}`); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
  async remove(id: string) {
    try { await apiFetch(`/api/admin/levels/${id}`, { method: "DELETE" }); }
    catch (e) { await toastError(`${(e as Error).message}`); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
};

export const studentGroupsActions = {
  async add(input: GroupInput) {
    try { await apiFetch("/api/admin/groups", { method: "POST", body: JSON.stringify(input) }); }
    catch (e) { await reportError(e, "تعذّر إنشاء المجموعة"); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
  async update(id: string, patch: Partial<GroupInput>) {
    try { await apiFetch(`/api/admin/groups/${id}`, { method: "PUT", body: JSON.stringify(patch) }); }
    catch (e) { await reportError(e, "تعذّر تحديث المجموعة"); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
  async remove(id: string) {
    try { await apiFetch(`/api/admin/groups/${id}`, { method: "DELETE" }); }
    catch (e) { await reportError(e, "تعذّر حذف المجموعة"); throw e; }
    await ensureLevelsGroupsLoaded(true);
  },
  async listStudents(id: string): Promise<GroupStudent[]> {
    return apiFetch<GroupStudent[]>(`/api/admin/groups/${id}/students`);
  },
};
