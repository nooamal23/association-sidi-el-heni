// Finance store — real backend via /api/admin/finance.
// The finance data endpoints are protected by a second-factor "finance unlock"
// token issued by POST /api/admin/finance/unlock after bcrypt-verifying a
// password against FINANCE_PASSWORD_HASH on the server. Without that token,
// every /finance* call returns 423 and this store stays locked.

import { useSyncExternalStore, useEffect } from "react";
import {
  HAS_API,
  apiFetch,
  FinanceLockedError,
  getFinanceToken,
  saveFinanceToken,
  clearFinanceToken,
} from "./api";

export type FinanceEntry = {
  id: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  description?: string | null;
  entryDate: string; // yyyy-MM-dd
  createdById?: string | null;
  createdByName?: string | null;
};

export type AdminStats = {
  students: number;
  instructors: number;
  courses: number;
  enrollments: number;
  enrolledStudents: number;
  financeIncome: number;
  financeExpense: number;
  financeBalance: number;
};

type State = {
  entries: FinanceEntry[];
  stats: AdminStats | null;
  locked: boolean;
};

let state: State = { entries: [], stats: null, locked: !getFinanceToken() };
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let loaded = false;
let inflight: Promise<void> | null = null;

export async function ensureFinanceLoaded(force = false): Promise<void> {
  if (!HAS_API) return;
  if (!force && loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // Stats endpoint is not gated by the finance token — always fetch it.
      const stats = await apiFetch<AdminStats>("/api/admin/stats").catch(() => null);
      // Only try to fetch entries when we hold a finance token; otherwise stay locked.
      let entries: FinanceEntry[] | null = null;
      let locked = !getFinanceToken();
      if (!locked) {
        try {
          entries = await apiFetch<FinanceEntry[]>("/api/admin/finance");
        } catch (e) {
          if (e instanceof FinanceLockedError) {
            locked = true;
          } else {
            throw e;
          }
        }
      }
      setState({
        entries: entries ?? (locked ? [] : state.entries),
        stats: stats ?? state.stats,
        locked,
      });
      loaded = true;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useFinanceStore() {
  useEffect(() => { void ensureFinanceLoaded(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => state);
}

async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

async function guarded<T>(fn: () => Promise<T>, errPrefix: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof FinanceLockedError) {
      setState({ ...state, locked: true, entries: [] });
      await toastError("انتهت جلسة المالية، الرجاء إعادة إدخال كلمة السر");
    } else {
      await toastError(`${errPrefix}: ${(e as Error).message}`);
    }
    throw e;
  }
}

export const financeActions = {
  async unlock(password: string) {
    const { token } = await apiFetch<{ token: string; expiresIn: number }>(
      "/api/admin/finance/unlock",
      { method: "POST", body: JSON.stringify({ password }) },
    );
    saveFinanceToken(token);
    loaded = false;
    await ensureFinanceLoaded(true);
  },
  lock() {
    clearFinanceToken();
    loaded = false;
    setState({ entries: [], stats: state.stats, locked: true });
  },
  async add(input: Omit<FinanceEntry, "id" | "createdById" | "createdByName">) {
    await guarded(
      () => apiFetch("/api/admin/finance", {
        method: "POST",
        body: JSON.stringify({
          kind: input.kind,
          category: input.category,
          amount: input.amount,
          description: input.description || null,
          entryDate: input.entryDate || null,
        }),
      }),
      "تعذّر التسجيل",
    );
    await ensureFinanceLoaded(true);
  },
  async update(id: string, patch: Partial<Omit<FinanceEntry, "id" | "createdById" | "createdByName">>) {
    await guarded(
      () => apiFetch(`/api/admin/finance/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
      "تعذّر التحديث",
    );
    await ensureFinanceLoaded(true);
  },
  async remove(id: string) {
    await guarded(
      () => apiFetch(`/api/admin/finance/${id}`, { method: "DELETE" }),
      "تعذّر الحذف",
    );
    await ensureFinanceLoaded(true);
  },
  refreshStats: () => ensureFinanceLoaded(true),
};
