import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { type NewsItem } from "@/lib/mock-data";
import { useNewsStore, newsActions } from "@/lib/news-store";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { confirmToast } from "@/lib/confirm-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/admin/news")({
  component: NewsAdminPage,
});

type FormState = Omit<NewsItem, "id" | "dateHijri" | "dateGregorian"> & {
  date: string; // ISO yyyy-mm-dd
};

const EMPTY: FormState = { title: "", excerpt: "", body: "", tag: "خبر", date: "" };

const AR_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatGregorian(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toHijri(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("ar-TN-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return "";
    }
  }
}

function NewsAdminPage() {
  const { news: list } = useNewsStore();
  const { query, setQuery, filtered } = useLiveSearch(list, [
    (n) => n.title,
    (n) => n.excerpt,
    (n) => n.body,
  ]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  function openEdit(n: NewsItem) {
    setEditing(n);
    setForm({
      title: n.title,
      excerpt: n.excerpt,
      body: n.body,
      tag: n.tag,
      date: n.eventDate
        ? String(n.eventDate).slice(0, 10)
        : /^\d{4}-\d{2}-\d{2}$/.test(n.dateGregorian)
        ? n.dateGregorian
        : new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      tag: form.tag,
      dateGregorian: formatGregorian(form.date),
      dateHijri: toHijri(form.date),
      // Part 29/3 — real date for sorting/"upcoming activities".
      eventDate: form.date || null,
    };
    if (editing) {
      newsActions.update(editing.id, payload);
      toast.success("تم حفظ التغييرات على الخبر");
    } else {
      newsActions.add(payload);
      toast.success("تم نشر الخبر بنجاح");
    }
    setOpen(false);
  }

  function remove(n: NewsItem) {
    confirmToast({
      message: `حذف الخبر "${n.title}"؟`,
      description: "لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () => {
        newsActions.remove(n.id);
        toast.success("تم حذف الخبر");
      },
    });
  }

  const hijriPreview = toHijri(form.date);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">الأخبار والمناسبات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نشر الأخبار والإعلانات والمناسبات الدينية. التاريخ الهجري يُحسب تلقائيا.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> خبر جديد
        </button>
      </header>

      <SearchBox value={query} onChange={setQuery} placeholder="ابحث في الأخبار..." />

      <div className="space-y-3">
        {list.length > 0 && filtered.length === 0 && <NoResults />}
        {filtered.map((n) => (
          <article key={n.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{n.tag}</span>
                <span className="text-xs text-muted-foreground">{n.dateGregorian} — {n.dateHijri}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(n)}
                  className="flex items-center gap-1 rounded-md border border-border bg-background p-1.5 hover:bg-secondary"
                  aria-label="تعديل"
                  title="تعديل"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(n)}
                  className="flex items-center gap-1 rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label="حذف"
                  title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <h3 className="mt-2 font-display text-lg font-bold">{n.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{n.excerpt}</p>
          </article>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
          <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{editing ? "تعديل الخبر" : "إضافة خبر"}</h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold">العنوان</label>
                <input value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">التصنيف</label>
                <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value as NewsItem["tag"] })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="خبر">خبر</option>
                  <option value="مناسبة دينية">مناسبة دينية</option>
                  <option value="إعلان">إعلان</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">التاريخ الميلادي</label>
                <ArabicDateInput
                  value={form.date}
                  required
                  onChange={(v) => setForm({ ...form, date: v })}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm">
                <span className="font-semibold">التاريخ الهجري (تلقائي): </span>
                <span className="text-primary font-bold">{hijriPreview || "—"}</span>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold">ملخّص</label>
                <input value={form.excerpt} required onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold">المحتوى</label>
                <textarea value={form.body} required rows={4} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
              </div>
              <button type="submit" className="sm:col-span-2 mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {editing ? "حفظ التغييرات" : "نشر الخبر"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
