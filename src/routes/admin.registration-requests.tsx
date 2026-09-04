import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, Phone, Calendar, Users } from "lucide-react";
import { confirmToast } from "@/lib/confirm-toast";
import { noticeToast } from "@/lib/notice-toast";
import { useAutoRefresh, formatRefreshTime } from "@/hooks/use-auto-refresh";
import { formatArabicDate } from "@/lib/utils";
import {
  AGE_CATEGORY_LABEL,
  listRegistrationRequests,
  resolveRegistrationRequest,
  type RegistrationRequest,
} from "@/lib/registration-requests";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";

export const Route = createFileRoute("/admin/registration-requests")({
  head: () => ({
    meta: [
      { title: "طلبات التسجيل — فضاء الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegistrationRequestsAdmin,
});

function RegistrationRequestsAdmin() {
  const [items, setItems] = useState<RegistrationRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<RegistrationRequest | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const rows = await listRegistrationRequests("pending");
      setItems(rows);
    } catch (e) {
      noticeToast({
        variant: "error",
        title: "تعذّر تحميل الطلبات",
        message: (e as Error).message,
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  // Part 28/4 — new requests arrive from the public site at any time, so this
  // page refreshes itself on tab focus and every 30 seconds.
  const { lastRefreshedAt } = useAutoRefresh(reload, { intervalMs: 30_000 });

  function onReject(r: RegistrationRequest) {
    confirmToast({
      message: "هل أنت متأكد من رفض هذا الطلب؟",
      description: "سيتم حذفه من القائمة.",
      confirmLabel: "تأكيد الرفض",
      onConfirm: async () => {
        try {
          await resolveRegistrationRequest(r.id, "reject");
          setItems((cur) => (cur ?? []).filter((x) => x.id !== r.id));
          toast.success("تم رفض الطلب");
        } catch (e) {
          noticeToast({
            variant: "error",
            title: "تعذّر رفض الطلب",
            message: (e as Error).message,
          });
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">طلبات التسجيل</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مراجعة الطلبات الواردة من الزوار والموافقة عليها أو رفضها.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? "جاري التحديث..." : `تحديث تلقائي · آخر تحديث: ${formatRefreshTime(lastRefreshedAt)}`}
        </span>
      </header>

      {loading && items === null ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          جاري تحميل الطلبات...
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد طلبات معلّقة حالياً.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(items ?? []).map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {r.fullName}
                  </h3>
                  <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>الفئة: {AGE_CATEGORY_LABEL[r.ageCategory]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span dir="ltr">{r.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {formatArabicDate(r.createdAt.slice(0, 10))}
                      </span>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  onClick={() => onReject(r)}
                  className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" /> رفض
                </button>
                <button
                  onClick={() => setApproving(r)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:opacity-90"
                >
                  <Check className="h-4 w-4" /> موافق
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {approving && (
        <PersonFormDialog
          role="student"
          editing={null}
          prefill={{ fullName: approving.fullName, phone: approving.phone }}
          onClose={() => setApproving(null)}
          onCreated={async () => {
            const id = approving.id;
            // Hard-delete the request only after the student was created.
            await resolveRegistrationRequest(id, "approve");
            setItems((cur) => (cur ?? []).filter((x) => x.id !== id));
          }}
        />
      )}
    </div>
  );
}
