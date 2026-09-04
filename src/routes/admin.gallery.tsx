import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, Camera } from "lucide-react";
import { useContentStore, galleryActions, type GalleryEntry } from "@/lib/content-store";
import { confirmToast } from "@/lib/confirm-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({ meta: [{ title: "المعرض — الإدارة" }] }),
  component: GalleryAdmin,
});

type FormState = {
  title: string;
  date: string;
  imageUrl: string;
};

const EMPTY: FormState = { title: "", date: "", imageUrl: "" };

function GalleryAdmin() {
  const { gallery } = useContentStore();
  const { query, setQuery, filtered } = useLiveSearch(gallery, [(g) => g.title]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(g: GalleryEntry) {
    setEditing(g);
    setForm({ title: g.title, date: g.date, imageUrl: g.imageUrl ?? "" });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      date: form.date,
      url: form.imageUrl || "",
      imageUrl: form.imageUrl || undefined,
    };
    if (editing) {
      galleryActions.update(editing.id, payload);
      toast.success("تم حفظ التغييرات");
    } else {
      galleryActions.add(payload);
      toast.success("تمت إضافة الصورة");
    }
    setOpen(false);
  }

  function remove(g: GalleryEntry) {
    confirmToast({
      message: `حذف "${g.title}"؟`,
      description: "لن تظهر بعد الآن في المعرض.",
      onConfirm: () => {
        galleryActions.remove(g.id);
        toast.success("تم الحذف");
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">المعرض</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إضافة الصور التي تظهر في صفحة "المعرض" العمومية.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> صورة جديدة
        </button>
      </header>

      <SearchBox value={query} onChange={setQuery} placeholder="ابحث في المعرض..." />

      {gallery.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد صور حاليا. اضغط "صورة جديدة" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <article key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-hero">
                {g.imageUrl ? (
                  <img src={g.imageUrl} alt={g.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="h-12 w-12 text-white/40" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{g.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{g.date}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary"
                      title="تعديل"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(g)}
                      className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-elevated sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {editing ? "تعديل الصورة" : "إضافة صورة"}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">العنوان</label>
                <input
                  value={form.title}
                  required
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">التاريخ (نص حر)</label>
                <input
                  value={form.date}
                  required
                  placeholder="مثال: ماي 2025"
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">الصورة</label>
                <div className="flex items-center gap-3">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="preview" className="h-20 w-20 shrink-0 rounded-lg object-cover ring-2 ring-primary/20" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs text-muted-foreground ring-2 ring-primary/20">
                      لا صورة
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2">
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      <span>اختر صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setForm((f) => ({ ...f, imageUrl: String(reader.result) }));
                            toast.success("تم اختيار الصورة");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: "" })}
                        className="self-start rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-secondary"
                      >
                        إزالة الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {editing ? "حفظ التغييرات" : "إضافة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
