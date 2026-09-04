import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, Trophy, Megaphone, ClipboardList, Calendar, MapPin, ImageIcon, Upload, Save } from "lucide-react";
import {
  useContentStore,
  competitionsActions,
  announcementsActions,
  hasResults,
  type Competition,
  type CompetitionAnnouncement,
} from "@/lib/content-store";
import { confirmToast } from "@/lib/confirm-toast";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { CompetitionRegistrationsPanel } from "@/components/admin/competition-registrations";

export const Route = createFileRoute("/admin/competitions")({
  head: () => ({ meta: [{ title: "المسابقات — الإدارة" }] }),
  component: CompetitionsAdmin,
});

type Tab = "announcements" | "results" | "registrations";

function CompetitionsAdmin() {
  const [tab, setTab] = useState<Tab>("announcements");

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">المسابقات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إعلان المسابقات القادمة ونشر نتائج المسابقات المنجزة. كل ما يُنشر هنا يظهر مباشرة في
            صفحة "المسابقات" العمومية.
          </p>
        </div>
      </header>

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
        <TabButton active={tab === "announcements"} onClick={() => setTab("announcements")} icon={<Megaphone className="h-4 w-4" />}>
          الإعلان عن مسابقات
        </TabButton>
        <TabButton active={tab === "results"} onClick={() => setTab("results")} icon={<Trophy className="h-4 w-4" />}>
          نتائج المسابقات
        </TabButton>
        <TabButton active={tab === "registrations"} onClick={() => setTab("registrations")} icon={<ClipboardList className="h-4 w-4" />}>
          التسجيلات والتوصيلات
        </TabButton>
      </div>

      {tab === "announcements" ? <AnnouncementsPanel /> : tab === "results" ? <ResultsPanel /> : <CompetitionRegistrationsPanel />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-secondary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ================= ANNOUNCEMENTS ================= */

type AnnForm = Omit<CompetitionAnnouncement, "id">;

const EMPTY_ANN: AnnForm = {
  title: "",
  level: "محلية",
  date: "",
  deadline: "",
  location: "",
  description: "",
  imageUrl: "",
};

function AnnouncementsPanel() {
  const { announcements } = useContentStore();
  const { query, setQuery, filtered } = useLiveSearch(announcements, [(a) => a.title]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompetitionAnnouncement | null>(null);
  const [form, setForm] = useState<AnnForm>(EMPTY_ANN);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_ANN, date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  function openEdit(a: CompetitionAnnouncement) {
    setEditing(a);
    setForm({ ...a });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AnnForm = {
      ...form,
      imageUrl: form.imageUrl?.trim() || undefined,
      deadline: form.deadline?.trim() || undefined,
    };
    if (editing) {
      announcementsActions.update(editing.id, payload);
      toast.success("تم حفظ التغييرات");
    } else {
      announcementsActions.add(payload);
      toast.success("تم نشر الإعلان");
    }
    setOpen(false);
  }

  function remove(a: CompetitionAnnouncement) {
    confirmToast({
      message: `حذف إعلان "${a.title}"؟`,
      description: "لن يظهر بعد الآن في صفحة المسابقات.",
      onConfirm: () => {
        announcementsActions.remove(a.id);
        toast.success("تم الحذف");
      },
    });
  }

  async function pickImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="min-w-0 flex-1">
          <SearchBox value={query} onChange={setQuery} placeholder="ابحث في الإعلانات..." />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> إعلان مسابقة جديدة
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد إعلانات حاليا. اضغط "إعلان مسابقة جديدة" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {a.imageUrl && (
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-secondary sm:w-36">
                    <img src={a.imageUrl} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">{a.date}</span>
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold">{a.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {a.location}
                    </span>
                    {a.deadline && (
                      <span className="border-s border-border ps-4">
                        آخر أجل للتسجيل: <span className="font-bold text-primary">{a.deadline}</span>
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{a.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col-reverse sm:items-end">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {a.level}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-xl border border-primary/30 bg-background p-2.5 text-primary hover:bg-primary/10"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(a)}
                      className="rounded-xl border border-destructive/30 bg-background p-2.5 text-destructive hover:bg-destructive/10"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="h-5 w-5" />
                </span>
                <h2 className="min-w-0 truncate font-display text-xl font-bold">
                  {editing ? "تعديل الإعلان" : "إعلان مسابقة جديدة"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {editing
                ? "عدّل معلومات الإعلان ثم احفظ التغييرات."
                : "أدخل معلومات المسابقة لنشر الإعلان في الصفحة العمومية."}
            </p>

            <form onSubmit={submit} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <SimpleField className="sm:col-span-2" label="عنوان المسابقة" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">المستوى</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as CompetitionAnnouncement["level"] })}
                  className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="محلية">محلية</option>
                  <option value="جهوية">جهوية</option>
                  <option value="وطنية">وطنية</option>
                </select>
              </div>
              <SimpleField label="المكان" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required />
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">
                  تاريخ المسابقة <span className="text-destructive">*</span>
                </label>
                <ArabicDateInput value={form.date} required onChange={(v) => setForm({ ...form, date: v })} />
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">آخر أجل للتسجيل (اختياري)</label>
                <ArabicDateInput value={form.deadline ?? ""} onChange={(v) => setForm({ ...form, deadline: v })} />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold">
                  وصف الإعلان <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.description}
                  required
                  rows={4}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="min-w-0 rounded-2xl border border-border bg-background/40 p-4 sm:col-span-2">
                <label className="mb-3 block text-sm font-semibold">صورة الإعلان (اختياري)</label>
                <div className="flex flex-wrap items-center gap-4">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="معاينة" className="h-24 w-32 shrink-0 rounded-xl object-cover ring-2 ring-primary/20" />
                  ) : (
                    <div className="flex h-24 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      <span>لا توجد صورة</span>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      <Upload className="h-4 w-4" />
                      <span>اختر صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) pickImage(f);
                        }}
                      />
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {form.imageUrl ? "تم اختيار صورة" : "يُفضل صورة واضحة بخلفية مناسبة."}
                    </div>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="self-start rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
                      >
                        إزالة الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4 sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Save className="h-4 w-4" />
                  {editing ? "حفظ التغييرات" : "نشر الإعلان"}
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

/* ================= RESULTS ================= */

type TopRow = { rank: number; name: string; category: string };
type ResultForm = {
  name: string;
  level: Competition["level"];
  year: number;
  participants: number;
  passed: number;
  topThree: TopRow[];
  // Part 29/3 — real date + place of the competition.
  eventDate: string;
  location: string;
};

const EMPTY_RES: ResultForm = {
  name: "",
  level: "محلية",
  year: new Date().getFullYear(),
  participants: 0,
  passed: 0,
  eventDate: "",
  location: "",
  topThree: [
    { rank: 1, name: "", category: "" },
    { rank: 2, name: "", category: "" },
    { rank: 3, name: "", category: "" },
  ],
};

function ResultsPanel() {
  const { competitions } = useContentStore();
  // Part 44 — same single list as the announcements tab; here we only show rows
  // whose results were actually entered (no phantom 0/0/0% cards).
  const withResults = useMemo(() => competitions.filter(hasResults), [competitions]);
  const { query, setQuery, filtered } = useLiveSearch(withResults, [(c) => c.name]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [form, setForm] = useState<ResultForm>(EMPTY_RES);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_RES);
    setOpen(true);
  }

  function openEdit(c: Competition) {
    setEditing(c);
    setForm({
      name: c.name,
      level: c.level,
      year: c.year,
      participants: c.participants,
      passed: c.passed,
      eventDate: c.eventDate ? String(c.eventDate).slice(0, 10) : "",
      location: c.location ?? "",
      topThree: [0, 1, 2].map((i) => c.topThree[i] ?? { rank: i + 1, name: "", category: "" }),
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const passRate =
      form.participants > 0 ? Math.round((form.passed / form.participants) * 100) : 0;
    const payload = {
      name: form.name,
      level: form.level,
      year: Number(form.year),
      participants: Number(form.participants),
      passed: Number(form.passed),
      passRate,
      eventDate: form.eventDate || null,
      location: form.location.trim() || null,
      topThree: form.topThree.filter((t) => t.name.trim()).map((t, i) => ({ ...t, rank: i + 1 })),
    };
    if (editing) {
      competitionsActions.update(editing.id, payload);
      toast.success("تم حفظ التغييرات");
    } else {
      competitionsActions.add(payload);
      toast.success("تم نشر النتائج");
    }
    setOpen(false);
  }

  function remove(c: Competition) {
    confirmToast({
      message: `حذف نتائج "${c.name}"؟`,
      description: "لن تظهر بعد الآن في صفحة نتائج المسابقات.",
      onConfirm: () => {
        competitionsActions.remove(c.id);
        toast.success("تم الحذف");
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="min-w-0 flex-1">
          <SearchBox value={query} onChange={setQuery} placeholder="ابحث في المسابقات..." />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> نشر نتائج مسابقة
        </button>
      </div>

      {withResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج منشورة حاليا. اضغط "نشر نتائج مسابقة" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <article key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {c.level}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.year}</span>
                  </div>
                  <h3 className="mt-2 flex items-center gap-2 font-display text-lg font-bold">
                    <Trophy className="h-4 w-4 text-gold" /> {c.name}
                  </h3>
                  <div className="mt-1 text-xs text-muted-foreground">
                    مشاركون: {c.participants} • ناجحون: {c.passed} • نسبة النجاح: {c.passRate}%
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary"
                    title="تعديل"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </span>
                <h2 className="min-w-0 truncate font-display text-xl font-bold">
                  {editing ? "تعديل النتائج" : "نشر نتائج مسابقة"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {editing
                ? "عدّل نتائج المسابقة ثم احفظ التغييرات."
                : "أدخل معطيات المسابقة ونتائجها لنشرها في الصفحة العمومية."}
            </p>

            <form onSubmit={submit} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <SimpleField className="sm:col-span-2" label="اسم المسابقة" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">المستوى</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as Competition["level"] })}
                  className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="محلية">محلية</option>
                  <option value="جهوية">جهوية</option>
                  <option value="وطنية">وطنية</option>
                </select>
              </div>
              <SimpleField label="السنة" type="number" value={String(form.year)} onChange={(v) => setForm({ ...form, year: Number(v) })} required />
              <SimpleField label="عدد المشاركين" type="number" value={String(form.participants)} onChange={(v) => setForm({ ...form, participants: Number(v) })} required />
              <SimpleField label="عدد الناجحين" type="number" value={String(form.passed)} onChange={(v) => setForm({ ...form, passed: Number(v) })} required />
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">تاريخ المسابقة</label>
                <ArabicDateInput value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
              </div>
              <SimpleField label="المكان" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />

              <div className="min-w-0 rounded-2xl border border-border bg-background/40 p-4 sm:col-span-2">
                <div className="mb-3 text-sm font-semibold">المراكز الأولى</div>
                <div className="space-y-2">
                  {form.topThree.map((t, i) => (
                    <div key={i} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[48px_1fr_1fr]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <input
                        placeholder="الاسم"
                        value={t.name}
                        onChange={(e) => {
                          const next = [...form.topThree];
                          next[i] = { ...t, name: e.target.value };
                          setForm({ ...form, topThree: next });
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      />
                      <input
                        placeholder="الصنف (مثال: أطفال متقدم)"
                        value={t.category}
                        onChange={(e) => {
                          const next = [...form.topThree];
                          next[i] = { ...t, category: e.target.value };
                          setForm({ ...form, topThree: next });
                        }}
                        className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4 sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Save className="h-4 w-4" />
                  {editing ? "حفظ التغييرات" : "نشر النتائج"}
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

function SimpleField({
  label,
  value,
  onChange,
  required,
  className,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  type?: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <label className="mb-1.5 block text-sm font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}
