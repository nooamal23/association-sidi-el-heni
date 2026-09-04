// Part 33 — competition registrations (participants / join requests) with a
// one-time exportable receipt. Backed by the API when VITE_API_URL is set,
// falls back to localStorage so the admin space stays browsable offline.

import { useEffect, useSyncExternalStore } from "react";
import { HAS_API, apiFetch } from "./api";
import { localNextRegistrationCode } from "./id-codes";

export type CompetitionRegistration = {
  id: string;
  competitionId: string;
  /** Part 36 — N-MEM-{year}-{seq}; only for external participants, null otherwise. */
  registrationCode: string | null;
  /** Part 39 — internal participant's own frozen member number (STU-000001). */
  memberId?: string | null;
  /** Part 36 — what the UI shows: memberId for internal, registrationCode for external. */
  displayId?: string | null;
  studentId?: string | null;
  fullName: string;
  phone?: string | null;
  external: boolean;
  amountPaid?: number | null;
  registeredAt: string;
  receiptIssued: boolean;
  receiptIssuedAt?: string | null;
};

type State = Record<string, CompetitionRegistration[]>;

const KEY = "sh_competition_registrations_v1";

function load(): State {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as State) ?? {};
  } catch {
    return {};
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: CompetitionRegistration[] = [];

// Part 44 — announcements are no longer local-only rows: they ARE competition
// rows, so ids are always real database ids and no id-resolution shim is needed.


export function useCompetitionRegistrations(competitionId?: string | null) {
  useEffect(() => {
    if (competitionId) void loadRegistrations(competitionId);
  }, [competitionId]);
  const all = useSyncExternalStore(subscribe, () => state, () => state);
  return competitionId ? all[competitionId] ?? EMPTY : EMPTY;
}


export async function loadRegistrations(competitionId: string) {
  if (!HAS_API) {
    if (!state[competitionId]) setState({ ...state, [competitionId]: [] });
    return;
  }
  try {
    const rows = await apiFetch<CompetitionRegistration[]>(
      `/api/admin/competitions/${competitionId}/registrations`,
    );
    setState({ ...state, [competitionId]: rows });
  } catch (err) {
    console.warn("competition-registrations: load failed", err);
  }
}

export type NewRegistration = {
  studentId?: string | null;
  /** Part 36 — member number of the selected internal student (offline display). */
  memberId?: string | null;
  fullName: string;
  phone?: string | null;
  externalName?: string | null;
  externalPhone?: string | null;
  amountPaid?: number | null;
};

export const registrationsActions = {
  async add(competitionId: string, input: NewRegistration) {
    if (!HAS_API) {
      const row: CompetitionRegistration = {
        id: crypto.randomUUID(),
        competitionId,
        registrationCode: input.studentId ? null : localNextRegistrationCode(),
        memberId: input.memberId ?? null,
        studentId: input.studentId ?? null,
        fullName: input.fullName,
        phone: input.phone ?? null,
        external: !input.studentId,
        amountPaid: input.amountPaid ?? null,
        displayId: input.studentId ? input.memberId ?? null : null,
        registeredAt: new Date().toISOString(),
        receiptIssued: false,
        receiptIssuedAt: null,
      };
      setState({ ...state, [competitionId]: [row, ...(state[competitionId] ?? [])] });
      return;
    }
    await apiFetch(`/api/admin/competitions/${competitionId}/registrations`, {
      method: "POST",
      body: JSON.stringify({
        studentId: input.studentId ?? null,
        externalName: input.studentId ? null : input.externalName ?? input.fullName,
        externalPhone: input.studentId ? null : input.externalPhone ?? input.phone ?? null,
        amountPaid: input.amountPaid ?? null,
      }),
    });
    await loadRegistrations(competitionId);
  },

  async issueReceipt(competitionId: string, id: string) {
    if (!HAS_API) {
      setState({
        ...state,
        [competitionId]: (state[competitionId] ?? []).map((r) =>
          r.id === id ? { ...r, receiptIssued: true, receiptIssuedAt: new Date().toISOString() } : r,
        ),
      });
      return;
    }
    await apiFetch(`/api/admin/competition-registrations/${id}/issue-receipt`, { method: "POST" });
    await loadRegistrations(competitionId);
  },

  async remove(competitionId: string, id: string) {
    if (!HAS_API) {
      setState({
        ...state,
        [competitionId]: (state[competitionId] ?? []).filter((r) => r.id !== id),
      });
      return;
    }
    await apiFetch(`/api/admin/competition-registrations/${id}`, { method: "DELETE" });
    await loadRegistrations(competitionId);
  },
};
