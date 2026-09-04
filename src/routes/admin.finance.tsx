import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, TrendingUp, TrendingDown, Wallet, Pencil, Trash2, Lock, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { formatArabicDate } from "@/lib/utils";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { confirmToast } from "@/lib/confirm-toast";
import {
  useFinanceStore,
  financeActions,
  type FinanceEntry,
} from "@/lib/finance-store";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/admin/finance")({
  component: FinanceAdminPage,
});


type FormState = {
  kind: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  entryDate: string;
};

const EMPTY_FORM: FormState = {
  kind: "income",
  category: "",
  amount: 0,
  description: "",
  entryDate: new Date().toISOString().slice(0, 10),
};

function FinanceAdminPage() {
  const { entries, locked } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { query, setQuery, filtered } = useLiveSearch(entries, [
    (e) => e.category,
    (e) => e.description ?? "",
  ]);

  const totals = useMemo(() => {
    const income = entries.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
    const expense = entries.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  if (locked) return <FinanceLockScreen />;



  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(e: FinanceEntry) {
    setEditing(e);
    setForm({
      kind: e.kind,
      category: e.category,
      amount: e.amount,
      description: e.description ?? "",
      entryDate: e.entryDate,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.amount || !form.entryDate) return;
    setSubmitting(true);
    try {
      if (editing) {
        await financeActions.update(editing.id, {
          kind: form.kind,
          category: form.category,
          amount: form.amount,
          description: form.description || null,
          entryDate: form.entryDate,
        });
        toast.success("تم تحديث العملية");
      } else {
        await financeActions.add({
          kind: form.kind,
          category: form.category,
          amount: form.amount,
          description: form.description || null,
          entryDate: form.entryDate,
        });
        toast.success("تم تسجيل العملية");
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
    } catch {
      // toast already shown
    } finally {
      setSubmitting(false);
    }
  }

  function remove(entry: FinanceEntry) {
    confirmToast({
      message: `حذف العملية "${entry.category}"؟`,
      description: "لا يمكن التراجع عن هذا الإجراء.",
      variant: "danger",
      onConfirm: async () => {
        try {
          await financeActions.remove(entry.id);
          toast.success("تم حذف العملية");
        } catch {}
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">المالية</h1>
          <p className="mt-1 text-sm text-muted-foreground">متابعة المداخيل والمصاريف وحركة الصندوق.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => financeActions.lock()}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            title="قفل قسم المالية"
          >
            <Lock className="h-4 w-4" /> قفل
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> عملية جديدة
          </button>
        </div>

      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="المداخيل" value={`${totals.income} د.ت`} accent="bg-primary/10 text-primary" />
        <Stat icon={TrendingDown} label="المصاريف" value={`${totals.expense} د.ت`} accent="bg-destructive/10 text-destructive" />
        <Stat icon={Wallet} label="الرصيد" value={`${totals.balance} د.ت`} accent="bg-gold/15 text-gold-foreground" />
      </div>

      <SearchBox value={query} onChange={setQuery} placeholder="ابحث في العمليات (الفئة أو الوصف)..." />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">التاريخ</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">النوع</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">الفئة</th>
                <th className="px-4 py-3 font-semibold">الوصف</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">أدخلها</th>
                <th className="px-4 py-3 text-end font-semibold whitespace-nowrap">المبلغ (د.ت)</th>
                <th className="px-4 py-3 text-end font-semibold whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد عمليات مسجّلة بعد.
                  </td>
                </tr>
              )}
              {entries.length > 0 && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    لا توجد نتائج مطابقة
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatArabicDate(r.entryDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.kind === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {r.kind === "income" ? "مدخول" : "مصروف"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.createdByName || "—"}</td>
                  <td className={`px-4 py-3 text-end font-bold whitespace-nowrap ${r.kind === "income" ? "text-primary" : "text-destructive"}`}>
                    {r.kind === "income" ? "+" : "-"}{r.amount}
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary"
                        title="تعديل"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {editing ? "تعديل العملية" : "عملية جديدة"}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">النوع</label>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FormState["kind"] })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="income">مدخول</option>
                  <option value="expense">مصروف</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">الفئة</label>
                <input value={form.category} required onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="تبرعات، اشتراكات، كراء..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">المبلغ (د.ت)</label>
                <input type="number" min={0} step="0.001" value={form.amount} required
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">التاريخ</label>
                <ArabicDateInput value={form.entryDate} required onChange={(v) => setForm({ ...form, entryDate: v })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">الوصف (اختياري)</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {editing ? "حفظ التغييرات" : "تسجيل"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FinanceLockScreen() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await financeActions.unlock(password);
      toast.success("تم فتح قسم المالية");
      setPassword("");
    } catch (err) {
      setError((err as Error).message || "كلمة السر غير صحيحة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">قسم المالية مقفل</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            الرجاء إدخال كلمة السر الخاصة بالمالية للاطلاع على العمليات وتسجيل المداخيل والمصاريف.
          </p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3" autoComplete="off">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">كلمة السر</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pl-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                className="absolute inset-y-0 left-2 flex items-center rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "جاري التحقّق..." : "فتح"}
          </button>
        </form>
      </div>
    </div>
  );
}
