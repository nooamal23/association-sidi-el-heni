import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, X } from "lucide-react";
import { ARABIC_MONTHS, paymentsActions, useStudentPayments } from "@/lib/payments-store";
import { getActiveSeason, useSeasonsStore } from "@/lib/seasons-store";
import type { Person } from "@/lib/people-store";

type Props = {
  student: Person;
  onClose: () => void;
};

export function StudentProfileDialog({ student, onClose }: Props) {
  useSeasonsStore(); // keeps the active season in sync
  // Payments always follow the currently active season (there is at most one).
  const activeSeason = getActiveSeason();
  const { payments, loading, reload } = useStudentPayments(student.id, activeSeason?.id ?? null);
  const [busy, setBusy] = useState<number | null>(null);

  const paidSet = useMemo(() => new Set(payments.map((p) => p.month)), [payments]);

  async function toggle(month: number) {
    if (!activeSeason) return;
    const isPaid = paidSet.has(month);
    setBusy(month);
    try {
      if (isPaid) {
        await paymentsActions.unmark(student.id, month, activeSeason.id);
        toast.success(`تم إلغاء خلاص ${ARABIC_MONTHS[month - 1]}`);
      } else {
        await paymentsActions.mark(student.id, month, { seasonId: activeSeason.id });
        toast.success(`تم تسجيل خلاص ${ARABIC_MONTHS[month - 1]}`);
      }
      await reload();
    } finally {
      setBusy(null);
    }
  }

  const paidCount = payments.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">ملف التلميذ</h2>
            <div className="mt-0.5 text-sm text-foreground">{student.fullName}</div>
            <div className="text-xs text-muted-foreground">@{student.username}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-secondary"
            title="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-foreground">الأشهر المُخلَّصة</div>
              <div className="text-xs text-muted-foreground">
                اضغط على الشهر لتسجيل/إلغاء الخلاص.
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              الموسم الدراسي:{" "}
              <span className="font-bold text-foreground">{activeSeason?.name ?? "لا يوجد موسم نشط"}</span>
            </div>
          </div>

          {!activeSeason ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              لا يوجد موسم دراسي نشط. فعّل موسماً من قسم «المواسم الدراسية» لتسجيل الخلاص.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  مُخلَّص: <span className="font-bold text-primary">{paidCount}</span> / 12
                </span>
                {loading && <span className="text-muted-foreground">جاري التحميل...</span>}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ARABIC_MONTHS.map((label, i) => {
                  const month = i + 1;
                  const isPaid = paidSet.has(month);
                  const isBusy = busy === month;
                  return (
                    <button
                      key={month}
                      onClick={() => toggle(month)}
                      disabled={isBusy}
                      className={
                        "flex items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 " +
                        (isPaid
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                          : "border-border bg-background text-foreground hover:bg-muted")
                      }
                    >
                      <span>{label}</span>
                      {isPaid ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
