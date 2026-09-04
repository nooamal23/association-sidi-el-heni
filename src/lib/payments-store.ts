// Student monthly payments store — per-student fetch on demand.
// Payments are keyed by the active academic season, not by calendar year.
import { useEffect, useState } from "react";
import { HAS_API, apiFetch } from "./api";

export type StudentPayment = {
  id: string;
  studentId: string;
  seasonId: number;
  month: number; // 1..12
  amount: number | null;
  note: string | null;
  paidAt: string;
};

async function toastError(msg: string) {
  const { toast } = await import("sonner");
  toast.error(msg);
}

export function useStudentPayments(studentId: string | null, seasonId?: number | null) {
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [loading, setLoading] = useState(false);

  async function reload() {
    if (!studentId || !HAS_API) { setPayments([]); return; }
    setLoading(true);
    try {
      const qs = seasonId ? `?seasonId=${seasonId}` : "";
      const rows = await apiFetch<StudentPayment[]>(`/api/admin/students/${studentId}/payments${qs}`);
      setPayments(rows);
    } catch (e) {
      console.warn("payments: load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [studentId, seasonId]);

  return { payments, loading, reload };
}

export const paymentsActions = {
  async mark(studentId: string, month: number, extras?: { amount?: number | null; note?: string | null; seasonId?: number | null }) {
    try {
      await apiFetch(`/api/admin/students/${studentId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          month,
          amount: extras?.amount ?? null,
          note: extras?.note ?? null,
          ...(extras?.seasonId ? { seasonId: extras.seasonId } : {}),
        }),
      });
    } catch (e) {
      await toastError(`تعذّر تسجيل الخلاص: ${(e as Error).message}`);
      throw e;
    }
  },
  async unmark(studentId: string, month: number, seasonId?: number | null) {
    try {
      await apiFetch(
        `/api/admin/students/${studentId}/payments?month=${month}${seasonId ? `&seasonId=${seasonId}` : ""}`,
        { method: "DELETE" },
      );
    } catch (e) {
      await toastError(`تعذّر إلغاء الخلاص: ${(e as Error).message}`);
      throw e;
    }
  },
};

export const ARABIC_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
