import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X, Pencil, Trash2, CheckCircle2, Calendar, FileSignature, Info } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { formatArabicDateRange } from "@/lib/utils";
import {
  useSeasonsStore,
  seasonsActions,
  PHASE_LABEL,
  computePhase,
  type Season,
} from "@/lib/seasons-store";

export const Route = createFileRoute("/admin/seasons")({
  head: () => ({ meta: [{ title: "المواسم الدراسية — الإدارة" }, { name: "robots", content: "noindex" }] }),
  component: SeasonsAdminPage,
});

type FormState = {
  name: string;
  startsOn: string;
  studyStartsOn: string;
  evaluationStartsOn: string;
  finalCompetitionStartsOn: string;
  endsOn: string;
};

const EMPTY: FormState = {
  name: "",
  startsOn: "",
  studyStartsOn: "",
  evaluationStartsOn: "",
  finalCompetitionStartsOn: "",
  endsOn: "",
};

const DATE_FIELDS: Array<{ key: keyof Omit<FormState, "name">; label: string; hint: string }> = [
  { key: "startsOn", label: "بداية الموسم / بداية التسجيل", hint: "أول يوم في الموسم — يفتح فيه باب التسجيل." },
  { key: "studyStartsOn", label: "بداية مرحلة الدراسة", hint: "التاريخ الذي تُغلق فيه التسجيلات وتنطلق الحصص." },
  { key: "evaluationStartsOn", label: "بداية مرحلة التقييم", hint: "بداية فترة الامتحانات والتقييمات الدورية." },
  { key: "finalCompetitionStartsOn", label: "بداية المسابقة الختامية", hint: "انطلاق المسابقة الختامية للموسم." },
  { key: "endsOn", label: "نهاية الموسم", hint: "آخر يوم في الموسم / نهاية المسابقة الختامية." },
];

function SeasonsAdminPage() {
  const seasons = useSeasonsStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s: Season) {
    setEditing(s);
    setForm({
      name: s.name,
      startsOn: s.startsOn,
      studyStartsOn: s.studyStartsOn,
      evaluationStartsOn: s.evaluationStartsOn,
      finalCompetitionStartsOn: s.finalCompetitionStartsOn,
      endsOn: s.endsOn,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const order: Array<keyof FormState> = ["startsOn", "studyStartsOn", "evaluationStartsOn", "finalCompetitionStartsOn", "endsOn"];
    for (let i = 1; i < order.length; i++) {
      if (!(form[order[i - 1]] < form[order[i]])) {
        toast.error("التواريخ يجب أن تكون بترتيب زمني تصاعدي (كل تاريخ بعد سابقه)");
        return;
      }
    }
    try {
      if (editing) {
        await seasonsActions.update(editing.id, form);
        toast.success("تم تحديث الموسم");
      } else {
        await seasonsActions.add({ ...form, isActive: false });
        toast.success("تم إنشاء الموسم");
      }
      setOpen(false);
    } catch {}
  }

  function remove(s: Season) {
    confirmToast({
      message: `حذف الموسم "${s.name}"؟`,
      description: s.coursesCount > 0 ? `سيتم فصل ${s.coursesCount} دورة عن هذا الموسم.` : undefined,
      onConfirm: async () => {
        await seasonsActions.remove(s.id);
        toast.success(`تم حذف الموسم "${s.name}"`);
      },
    });
  }

  async function activate(s: Season) {
    await seasonsActions.activate(s.id);
    toast.success(`تم تفعيل الموسم "${s.name}"`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">المواسم الدراسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل موسم يمرّ بأربع مراحل متتالية: التسجيل، الدراسة، التقييم، المسابقة الختامية. المرحلة الحالية تُحسب تلقائياً من تاريخ اليوم.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> موسم جديد
        </button>
      </header>

      {seasons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مواسم بعد. اضغط «موسم جديد» للبدء.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seasons.map((s) => {
            const phase = computePhase(s);
            return (
              <article key={s.id} className={`rounded-2xl border bg-card p-5 shadow-soft ${s.isActive ? "border-primary" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        <CheckCircle2 className="h-3 w-3" /> نشط
                      </span>
                    )}
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                      المرحلة الحالية: {PHASE_LABEL[phase]}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {!s.isActive && (
                      <button
                        onClick={() => activate(s)}
                        className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                        title="تعيين كموسم نشط"
                      >
                        تفعيل
                      </button>
                    )}
                    <button onClick={() => openEdit(s)} className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary" title="تعديل">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(s)} className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{s.name}</h3>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatArabicDateRange(s.startsOn, s.endsOn)}</span>
                  </div>
                  <div>عدد الدورات: <span className="font-semibold text-foreground">{s.coursesCount}</span></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
          <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </span>
                <h2 className="font-display text-xl font-bold">{editing ? "تعديل الموسم" : "موسم جديد"}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {editing ? "عدّل معلومات الموسم الدراسي." : "أكمل المعلومات التالية لإنشاء موسم جديد."}
            </p>

            <form onSubmit={submit} className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <label className="mb-2 block text-sm font-semibold">
                  اسم الموسم <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <FileSignature className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: الموسم الدراسي 2025–2026"
                    className="w-full rounded-xl border border-input bg-background py-3 pr-10 pl-3 text-sm"
                    required
                  />
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>حدّد التواريخ الأربعة لمراحل الموسم بالترتيب. المرحلة الحالية ستُحسب تلقائياً حسب تاريخ اليوم.</span>
                </p>
              </div>

              {DATE_FIELDS.map((f, i) => (
                <div
                  key={f.key}
                  className="grid items-center gap-3 rounded-2xl border border-border bg-background/40 p-4 sm:grid-cols-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-primary">
                        {f.label} <span className="text-destructive">*</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
                    </div>
                  </div>
                  <ArabicDateInput
                    value={form[f.key]}
                    onChange={(v) => setForm({ ...form, [f.key]: v })}
                    required
                  />
                </div>
              ))}

              <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-4">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  {editing ? "حفظ التغييرات" : "إنشاء الموسم"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
