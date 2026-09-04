// Store for admin members (instructors + students), courses, and board members.
// Hydrated from the real backend when VITE_API_URL is set; falls back to an
// empty in-memory + localStorage store when running as a static demo.

import { useSyncExternalStore, useEffect } from "react";
import { ApiError, HAS_API, apiFetch } from "./api";
import { noticeToast } from "./notice-toast";
import { localNextMemberId, localNextInstructorId, localNextId } from "./id-codes";

export type Role = "instructor" | "student";

export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all";
export type CourseType = "quran" | "fiqh" | "training" | "summer";
export type CourseAudience = "children" | "women" | "men";

// Day of the week: JS Date.getDay() convention. 0=الأحد ... 6=السبت
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  all: "كل المستويات",
};

export const TYPE_LABEL: Record<CourseType, string> = {
  quran: "تحفيظ وتجويد",
  fiqh: "فقه وشريعة",
  training: "تكوين معلمين",
  summer: "دورة صيفية",
};

export const AUDIENCE_LABEL: Record<CourseAudience, string> = {
  children: "أطفال",
  women: "نساء",
  men: "رجال",
};

export const ALLOWED_AUDIENCE: Record<CourseType, CourseAudience[]> = {
  quran: ["children", "women", "men"],
  fiqh: ["women", "men"],
  training: ["women", "men"],
  summer: ["children", "women", "men"],
};

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 6, label: "السبت" },
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
];

export type CourseLite = {
  id: string;
  title: string;
  endDate: string; // ISO yyyy-mm-dd
  startDate?: string;
  level?: CourseLevel;
  type?: CourseType;
  audience?: CourseAudience;
  days?: Weekday[];
  timeFrom?: string;
  timeTo?: string;
  instructorId?: string;
  capacity?: number;
  seasonId?: number | null;
};


export type BoardPosition = "president" | "vice_president" | "secretary" | "treasurer" | "member";

export const POSITION_LABEL: Record<BoardPosition, string> = {
  president: "رئيس",
  vice_president: "نائب الرئيس",
  secretary: "كاتب عام",
  treasurer: "أمين مال",
  member: "عضو",
};

export type Person = {
  id: string;
  role: Role;
  /** Part 39 — frozen auto-generated member number: STU-000001 (students) or TCH-000001 (instructors). */
  memberId?: string | null;
  /** Part 36 — registration date (server `createdAt`), display only. */
  createdAt?: string | null;
  /** Part 52 — account status coming from the backend `is_active` column. */
  isActive?: boolean;
  fullName: string;
  username: string;
  password: string;
  birthDate: string;
  phone: string;
  photoUrl?: string;
  courseIds: string[];
  groupId?: string | null;
  groupNumber?: number | null;
  groupLevelName?: string | null;
};

export type BoardMember = {
  id: string;
  /** Part 41 — frozen auto-generated board number: MEM-000001. */
  memberId?: string | null;
  /** Part 41 — when set, identity is read live from this instructor's record. */
  instructorId?: string | null;
  /** The linked instructor's own TCH- number, when linked. */
  instructorMemberId?: string | null;
  fullName: string;
  birthDate: string;
  phone: string;
  position: BoardPosition;
  photoUrl?: string;
  orderIndex?: number;
};


type State = {
  courses: CourseLite[];
  people: Person[];
  boardMembers: BoardMember[];
};

const KEY = "sh_people_store_v6";

const EMPTY_STATE: State = { courses: [], people: [], boardMembers: [] };

// ---- Category mapping (backend enum → frontend audience/type heuristic) ----
type BackendCategory = "children" | "women" | "men" | "training" | "summer";

function categoryToAudience(cat: BackendCategory): CourseAudience {
  if (cat === "training") return "men";
  if (cat === "summer") return "children";
  return cat;
}

function categoryToType(cat: BackendCategory): CourseType {
  if (cat === "training") return "training";
  if (cat === "summer") return "summer";
  return "quran";
}

function audienceTypeToCategory(audience?: CourseAudience, type?: CourseType): BackendCategory {
  if (type === "summer") return "summer";
  if (type === "training") return "training";
  return audience ?? "children";
}

/**
 * Memorization courses (children/women/men) track progress in أحزاب.
 * فقه وشريعة / تكوين معلمين / دورات صيفية do not.
 */
export function isMemorizationCourse(c?: Pick<CourseLite, "type"> | null): boolean {
  if (!c) return false;
  // Only تحفيظ وتجويد tracks hizb progress. فقه وشريعة / تكوين معلمين /
  // دورات صيفية never show «عدد الأحزاب».
  return c.type === "quran";
}

// ---- Persistence + subscribe ----
function loadCache(): State {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      courses: parsed.courses ?? [],
      people: parsed.people ?? [],
      boardMembers: parsed.boardMembers ?? [],
    };
  } catch {
    return EMPTY_STATE;
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

export function usePeopleStore() {
  useEffect(() => { void ensurePeopleLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// ---- API hydration ----
let loadedOnce = false;
let inflight: Promise<void> | null = null;

export async function ensurePeopleLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loadedOnce) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [users, courses, board] = await Promise.all([
        apiFetch<any[]>("/api/admin/users").catch(() => null),
        apiFetch<any[]>("/api/admin/courses").catch(() => null),
        apiFetch<any[]>("/api/admin/board").catch(() => null),
      ]);
      // If user is not admin, /admin/* returns 403 — leave cache in place.
      if (!users || !courses || !board) return;

      const people: Person[] = users
        .filter((u) => u.role === "instructor" || u.role === "student")
        .map((u) => ({
          id: u.id,
          role: u.role,
          memberId: u.memberId ?? null,
          createdAt: u.createdAt ?? null,
          isActive: u.isActive ?? true,
          fullName: u.fullName,
          username: u.username,
          password: "", // never returned by the API
          birthDate: u.birthDate ?? "",
          phone: u.phone ?? "",
          photoUrl: u.photoUrl ?? undefined,
          courseIds: u.courseIds ?? [],
          groupId: u.groupId ?? null,
          groupNumber: u.groupNumber ?? null,
          groupLevelName: u.groupLevelName ?? null,
        }));

      const localCourses: CourseLite[] = courses.map((c) => ({
        id: c.id,
        title: c.title,
        startDate: c.startDate ?? undefined,
        endDate: c.endDate ?? c.startDate ?? "2099-12-31",
        level: (c.level ?? undefined) as CourseLevel | undefined,
        type: (c.type as CourseType | undefined) ?? categoryToType(c.category),
        audience: categoryToAudience(c.category),
        days: Array.isArray(c.days) ? (c.days as Weekday[]) : undefined,
        timeFrom: c.timeFrom ?? undefined,
        timeTo: c.timeTo ?? undefined,
        instructorId: c.instructorId ?? undefined,
        capacity: c.capacity,
        seasonId: c.seasonId ?? null,
      }));


      const boardMembers: BoardMember[] = board.map((b) => ({
        id: b.id,
        memberId: b.memberId ?? null,
        instructorId: b.instructorId ?? null,
        instructorMemberId: b.instructorMemberId ?? null,
        fullName: b.fullName,
        birthDate: b.birthDate ?? "",
        phone: b.phone ?? "",
        position: b.position,
        photoUrl: b.photoUrl ?? undefined,
        orderIndex: b.orderIndex,
      }));


      setState({ courses: localCourses, people, boardMembers });
      loadedOnce = true;
    } catch (err) {
      console.warn("people-store: hydration failed", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ---- Public helpers ----
export function isCourseActive(c: CourseLite, today = new Date()): boolean {
  return new Date(c.endDate) >= new Date(today.toDateString());
}

export function splitCourses(person: Person, courses: CourseLite[]) {
  const map = new Map(courses.map((c) => [c.id, c]));
  const active: CourseLite[] = [];
  const archived: CourseLite[] = [];
  for (const id of person.courseIds) {
    const c = map.get(id);
    if (!c) continue;
    (isCourseActive(c) ? active : archived).push(c);
  }
  return { active, archived };
}

export function countSessions(startDate?: string, endDate?: string, days?: Weekday[]): number {
  if (!startDate || !endDate || !days || days.length === 0) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  const set = new Set(days);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (set.has(cur.getDay() as Weekday)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function findPersonByCredentials(username: string, password: string): Person | null {
  const u = username.trim().toLowerCase();
  return (
    state.people.find(
      (p) => p.username.trim().toLowerCase() === u && p.password === password,
    ) ?? null
  );
}

/** Part 37 — read a person straight from the store (used right after creation). */
export function getPersonById(id: string): Person | null {
  return state.people.find((p) => p.id === id) ?? null;
}

export function isUsernameTaken(username: string, excludeId?: string): boolean {
  const u = username.trim().toLowerCase();
  if (!u) return false;
  return state.people.some(
    (p) => p.id !== excludeId && p.username.trim().toLowerCase() === u,
  );
}

// ---- Actions ----
async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

// Hard business-rule rejections (409) go to the large, centered, dismissible
// notice dialog — and are re-thrown so the caller can keep its form open with
// the admin's data intact instead of closing it.
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

export const peopleActions = {
  async add(person: Omit<Person, "id">): Promise<string | null> {
    if (!HAS_API) {
      const id = crypto.randomUUID();
      // Part 35 — the member number is generated here, never supplied by the form.
      // Part 39 — it IS the username for students (STU-) and instructors (TCH-).
      const memberId =
        person.role === "student"
          ? localNextMemberId()
          : person.role === "instructor"
            ? localNextInstructorId()
            : null;
      setState({
        ...state,
        people: [
          ...state.people,
          {
            ...person,
            id,
            memberId,
            username: memberId ?? person.username,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      return id;
    }
    try {
      const created = await apiFetch<{ id: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          // Part 39 — auto-generated server-side for students (STU-) and
          // instructors (TCH-): never supplied by the form.
          username: undefined,
          password: person.password || crypto.randomUUID(),
          fullName: person.fullName,
          role: person.role,
          phone: person.phone || undefined,
          birthDate: person.birthDate || undefined,
          photoUrl: person.photoUrl || undefined,
        }),
      });
      return created?.id ?? null;
    } catch (e) {
      await toastError(`تعذّر إنشاء الحساب: ${(e as Error).message}`);
      throw e;
    } finally {
      await ensurePeopleLoaded(true);
    }
  },
  async update(id: string, patch: Partial<Omit<Person, "id" | "role" | "memberId">>) {
    if (!HAS_API) {
      // Part 35 — memberId is frozen and deliberately preserved on every update.
      setState({
        ...state,
        people: state.people.map((p) => (p.id === id ? { ...p, ...patch, memberId: p.memberId, createdAt: p.createdAt } : p)),
      });
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      if (patch.fullName !== undefined) body.fullName = patch.fullName;
      if (patch.phone !== undefined) body.phone = patch.phone;
      // Part 37 — a student's username is their frozen member number.
      if (patch.username !== undefined) body.username = patch.username;
      if (patch.birthDate !== undefined) body.birthDate = patch.birthDate;
      if (patch.photoUrl !== undefined) body.photoUrl = patch.photoUrl;
      if (Object.keys(body).length > 0) {
        await apiFetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      if (patch.password) {
        await apiFetch(`/api/admin/users/${id}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ password: patch.password }),
        });
      }
    } catch (e) {
      await toastError(`تعذّر تحديث الحساب: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
  async remove(id: string) {
    if (!HAS_API) {
      setState({ ...state, people: state.people.filter((p) => p.id !== id) });
      return;
    }
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    } catch (e) {
      await toastError(`تعذّر حذف الحساب: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
  async addCourse(c: Omit<CourseLite, "id">) {
    if (!HAS_API) {
      setState({ ...state, courses: [...state.courses, { ...c, id: crypto.randomUUID() }] });
      return;
    }
    try {
      await apiFetch("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: c.title,
          category: audienceTypeToCategory(c.audience, c.type),
          type: c.type ?? "quran",
          level: c.level ?? "all",
          capacity: c.capacity ?? 25,
          instructorId: c.instructorId ?? null,
          startDate: c.startDate ?? null,
          endDate: c.endDate ?? null,
          days: c.days ?? [],
          timeFrom: c.timeFrom || null,
          timeTo: c.timeTo || null,
          seasonId: c.seasonId ?? null,
          isPublished: true,
        }),
      });

    } catch (e) {
      await reportError(e, "تعذّر إنشاء الدورة");
      await ensurePeopleLoaded(true);
      throw e;
    }
    await ensurePeopleLoaded(true);
  },
  async updateCourse(id: string, patch: Partial<Omit<CourseLite, "id">>) {
    if (!HAS_API) {
      setState({ ...state, courses: state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      if (patch.title !== undefined) body.title = patch.title;
      if (patch.audience !== undefined || patch.type !== undefined) {
        const existing = state.courses.find((c) => c.id === id);
        body.category = audienceTypeToCategory(
          patch.audience ?? existing?.audience,
          patch.type ?? existing?.type,
        );
        body.type = patch.type ?? existing?.type ?? "quran";
      }
      if (patch.level !== undefined) body.level = patch.level;
      if (patch.capacity !== undefined) body.capacity = patch.capacity;
      if (patch.instructorId !== undefined) body.instructorId = patch.instructorId || null;
      if (patch.startDate !== undefined) body.startDate = patch.startDate || null;
      if (patch.endDate !== undefined) body.endDate = patch.endDate || null;
      if (patch.days !== undefined) body.days = patch.days ?? [];
      if (patch.timeFrom !== undefined) body.timeFrom = patch.timeFrom || null;
      if (patch.timeTo !== undefined) body.timeTo = patch.timeTo || null;
      if (patch.seasonId !== undefined) body.seasonId = patch.seasonId ?? null;

      await apiFetch(`/api/admin/courses/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } catch (e) {
      await reportError(e, "تعذّر تحديث الدورة");
      await ensurePeopleLoaded(true);
      throw e;
    }
    await ensurePeopleLoaded(true);
  },
  async removeCourse(id: string) {
    if (!HAS_API) {
      setState({
        ...state,
        courses: state.courses.filter((c) => c.id !== id),
        people: state.people.map((p) => ({ ...p, courseIds: p.courseIds.filter((cid) => cid !== id) })),
      });
      return;
    }
    try {
      await apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    } catch (e) {
      await toastError(`تعذّر حذف الدورة: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
  async unenroll(courseId: string, studentId: string) {
    if (!HAS_API) {
      setState({
        ...state,
        people: state.people.map((p) =>
          p.id === studentId ? { ...p, courseIds: p.courseIds.filter((c) => c !== courseId) } : p,
        ),
      });
      return;
    }
    try {
      await apiFetch(`/api/admin/courses/${courseId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
    } catch (e) {
      await toastError(`تعذّر إلغاء التسجيل: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
  async enroll(courseId: string, studentId: string) {
    if (!HAS_API) {
      setState({
        ...state,
        people: state.people.map((p) =>
          p.id === studentId && !p.courseIds.includes(courseId)
            ? { ...p, courseIds: [...p.courseIds, courseId] }
            : p,
        ),
      });
      return;
    }
    try {
      await apiFetch(`/api/admin/courses/${courseId}/enroll`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
    } catch (e) {
      await toastError(`تعذّر التسجيل: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
};

export const boardActions = {
  /**
   * Part 41 — creates a board seat, either linked to an existing instructor
   * (`instructorId`) or as a board-only entry. Returns the freshly generated
   * MEM- number so the form can show it in real time (Part 40 pattern).
   * Throws on failure so the caller can surface a friendly notice.
   */
  async add(
    m: Omit<BoardMember, "id"> & { instructorId?: string | null },
  ): Promise<string | null> {
    if (!HAS_API) {
      const memberId = localNextId("MEM");
      setState({
        ...state,
        boardMembers: [...state.boardMembers, { ...m, memberId, id: crypto.randomUUID() }],
      });
      return memberId;
    }
    const linked = Boolean(m.instructorId);
    const created = await apiFetch<{ memberId?: string }>("/api/admin/board", {
      method: "POST",
      body: JSON.stringify(
        linked
          ? {
              instructorId: m.instructorId,
              position: m.position,
              orderIndex: m.orderIndex ?? 0,
            }
          : {
              fullName: m.fullName,
              birthDate: m.birthDate || null,
              phone: m.phone || null,
              position: m.position,
              photoUrl: m.photoUrl || null,
              orderIndex: m.orderIndex ?? 0,
            },
      ),
    });
    await ensurePeopleLoaded(true);
    return created?.memberId ?? null;
  },
  async update(id: string, patch: Partial<Omit<BoardMember, "id">>) {
    if (!HAS_API) {
      setState({ ...state, boardMembers: state.boardMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      if (patch.fullName !== undefined) body.fullName = patch.fullName;
      if (patch.birthDate !== undefined) body.birthDate = patch.birthDate || null;
      if (patch.phone !== undefined) body.phone = patch.phone || null;
      if (patch.position !== undefined) body.position = patch.position;
      if (patch.photoUrl !== undefined) body.photoUrl = patch.photoUrl || null;
      if (patch.orderIndex !== undefined) body.orderIndex = patch.orderIndex;
      await apiFetch(`/api/admin/board/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } catch (e) {
      await toastError(`تعذّر تحديث العضو: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
  async remove(id: string) {
    if (!HAS_API) {
      setState({ ...state, boardMembers: state.boardMembers.filter((m) => m.id !== id) });
      return;
    }
    try {
      await apiFetch(`/api/admin/board/${id}`, { method: "DELETE" });
    } catch (e) {
      await toastError(`تعذّر حذف العضو: ${(e as Error).message}`);
    }
    await ensurePeopleLoaded(true);
  },
};
