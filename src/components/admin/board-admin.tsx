import { useMemo, useState } from "react";
import { toast } from "sonner";
import { noticeToast } from "@/lib/notice-toast";
import { UserPlus, X, Pencil, Trash2, Search, GraduationCap, Users, ShieldCheck, Phone, Camera, Upload, Save } from "lucide-react";
import { formatArabicDate } from "@/lib/utils";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { confirmToast } from "@/lib/confirm-toast";
import { isValidTunisianPhone, TUNISIA_PHONE_MESSAGE } from "@/lib/phone";
import { FrozenIdField } from "@/components/admin/frozen-id-field";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import {
  StatCard,
  PersonAvatar,
  Pagination,
  usePagination,
} from "@/components/admin/admin-list-kit";

import {
  usePeopleStore,
  boardActions,
  POSITION_LABEL,
  type BoardMember,
  type BoardPosition,
  type Person,
} from "@/lib/people-store";

type Mode = "instructor" | "manual";

type FormState = {
  fullName: string;
  birthDate: string;
  phone: string;
  position: BoardPosition;
  photoUrl: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  birthDate: "1970-01-01",
  phone: "",
  position: "president",
  photoUrl: "",
};

export function BoardAdmin() {
  const { boardMembers, people } = usePeopleStore();
  const instructors = useMemo(
    () => people.filter((p) => p.role === "instructor"),
    [people],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BoardMember | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("manual");
  const [instructorId, setInstructorId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  // Part 41 — the freshly generated MEM- number, shown in real time after save.
  const [issuedId, setIssuedId] = useState("");

  const selectedInstructor = instructors.find((p) => p.id === instructorId) ?? null;
  const { query, setQuery, filtered } = useLiveSearch<Person>(instructors, [
    (p) => p.fullName,
    (p) => p.memberId ?? p.username,
    (p) => p.phone,
  ]);

  // Part 52 — list-level search/stats/pagination (separate from the dialog's
  // instructor picker search above).
  const boardSearch = useLiveSearch<BoardMember>(boardMembers, [
    (m) => m.fullName,
    (m) => m.memberId ?? "",
    (m) => POSITION_LABEL[m.position],
    (m) => m.phone,
  ]);
  const boardQuery = boardSearch.query;
  const setBoardQuery = boardSearch.setQuery;
  const boardFiltered = boardSearch.filtered;
  const pager = usePagination<BoardMember>(boardFiltered, 8);
  const linkedCount = boardMembers.filter((m) => m.instructorId).length;
  const standaloneCount = boardMembers.length - linkedCount;
  const officersCount = boardMembers.filter((m) => m.position !== "member").length;

  const frozenId = editing ? (editing.memberId ?? "") : issuedId;

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMode("manual");
    setInstructorId("");
    setQuery("");
    setIssuedId("");
    setPhoneError(null);
    setOpen(true);
  }

  function openEdit(m: BoardMember) {
    setEditing(m);
    setForm({
      fullName: m.fullName,
      birthDate: m.birthDate,
      phone: m.phone,
      position: m.position,
      photoUrl: m.photoUrl || "",
    });
    setMode(m.instructorId ? "instructor" : "manual");
    setInstructorId(m.instructorId ?? "");
    setIssuedId("");
    setPhoneError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (mode === "instructor" && !editing && !instructorId) {
      noticeToast({
        variant: "warning",
        title: "لم تختر معلّماً",
        message: "اختر معلّماً من القائمة أو حوّل إلى «شخص جديد».",
      });
      return;
    }
    const manual = mode === "manual";
    if (manual && form.phone && !isValidTunisianPhone(form.phone)) {
      setPhoneError(TUNISIA_PHONE_MESSAGE);
      noticeToast({
        variant: "warning",
        title: "رقم هاتف غير صحيح",
        message: TUNISIA_PHONE_MESSAGE,
      });
      return;
    }
    setPhoneError(null);

    const displayName = manual ? form.fullName : (selectedInstructor?.fullName ?? "");
    setSaving(true);
    try {
      if (editing) {
        await boardActions.update(editing.id, {
          position: form.position,
          ...(editing.instructorId
            ? {}
            : {
                fullName: form.fullName,
                birthDate: form.birthDate,
                phone: form.phone,
                photoUrl: form.photoUrl || undefined,
              }),
        });
        toast.success(`تم حفظ التغييرات على ${displayName} بنجاح`);
        setOpen(false);
        return;
      }
      const memberId = await boardActions.add({
        instructorId: manual ? null : instructorId,
        fullName: displayName,
        birthDate: manual ? form.birthDate : "",
        phone: manual ? form.phone : "",
        position: form.position,
        photoUrl: manual ? form.photoUrl || undefined : undefined,
      });
      // Part 40 pattern — real value in place of the placeholder, no refresh.
      setIssuedId(memberId ?? "");
      toast.success(`تمت إضافة ${displayName} بنجاح`);
    } catch (err) {
      noticeToast({
        variant: "error",
        title: "تعذّر إضافة العضو",
        message: (err as Error).message || "حدث خطأ غير متوقع.",
      });
    } finally {
      setSaving(false);
    }
  }

  function remove(m: BoardMember) {
    confirmToast({
      message: `حذف ${m.fullName}؟`,
      description: m.instructorId
        ? "يُحذف مقعده في الهيئة التسييرية فقط — يبقى حساب المعلّم كما هو."
        : "لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () => {
        boardActions.remove(m.id);
        toast.success(`تم حذف ${m.fullName}`);
      },
    });
  }

  const savedNew = Boolean(issuedId) && !editing;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" /> الهيئة التسييرية للفرع
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">إدارة أعضاء الهيئة التسييرية للفرع وصفاتهم.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" /> إضافة عضو
        </button>
      </header>

      <SearchBox
        value={boardQuery}
        onChange={(v) => {
          setBoardQuery(v);
          pager.setPage(1);
        }}
        placeholder="ابحث عن عضو (الاسم، المعرف، الصفة)..."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} value={boardMembers.length} label="إجمالي أعضاء الهيئة" />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} value={linkedCount} label="المرتبطون بمعلمين" />
        <StatCard icon={<UserPlus className="h-5 w-5" />} value={standaloneCount} label="الأعضاء المستقلون" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} value={officersCount} label="أعضاء المكتب (رئاسة وأمانة ومالية)" />
      </div>

      {boardMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا يوجد أعضاء حاليا. اضغط "إضافة عضو" للبدء.
        </div>
      ) : boardFiltered.length === 0 ? (
        <NoResults />
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2">
          {pager.slice.map((m) => (
            <article key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <PersonAvatar name={m.fullName} url={m.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-foreground">{m.fullName}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-gold-faint px-2 py-0.5 text-[11px] font-semibold text-gold">
                          {POSITION_LABEL[m.position]}
                        </span>
                        {m.instructorId && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            <GraduationCap className="h-3 w-3" /> معلّم
                          </span>
                        )}
                        {m.memberId && (
                          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
                            {m.memberId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary"
                        title="تعديل"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(m)}
                        className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <Row label="تاريخ الولادة" value={m.birthDate ? formatArabicDate(m.birthDate) : "—"} />
                    <Row label="الهاتف" value={m.phone || "—"} />
                    {m.instructorMemberId && (
                      <Row label="معرّف المعلّم" value={m.instructorMemberId} />
                    )}
                  </dl>

                </div>
              </div>
            </article>
          ))}
        </div>

        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          from={pager.from}
          to={pager.to}
          total={pager.total}
          noun="عضو"
          onPage={pager.setPage}
        />
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </span>
                <h2 className="min-w-0 truncate font-display text-xl font-bold">
                  {editing ? "تعديل عضو" : "إضافة عضو جديد"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {editing
                ? "عدّل معلومات العضو ثم احفظ التغييرات."
                : "أدخل معلومات العضو لإضافته إلى الهيئة التسييرية."}
            </p>
            <form onSubmit={submit} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">

              {!editing && (
                <div className="min-w-0 sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold">نوع العضو</label>
                  <div className="flex flex-wrap gap-2">
                    <ModeButton
                      active={mode === "instructor"}
                      disabled={savedNew}
                      onClick={() => setMode("instructor")}
                      label="معلّم موجود"
                    />
                    <ModeButton
                      active={mode === "manual"}
                      disabled={savedNew}
                      onClick={() => setMode("manual")}
                      label="شخص جديد (ليس معلّماً)"
                    />
                  </div>
                </div>
              )}

              <FrozenIdField value={frozenId} example="MEM-000001" />
              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">الصفة داخل الهيئة</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value as BoardPosition })}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {(Object.keys(POSITION_LABEL) as BoardPosition[]).map((k) => (
                    <option key={k} value={k}>{POSITION_LABEL[k]}</option>
                  ))}
                </select>
              </div>

              {mode === "instructor" ? (
                <div className="min-w-0 sm:col-span-2">
                  {editing || savedNew ? (
                    <ReadOnlyInstructor person={selectedInstructor} fallbackName={editing?.fullName} />
                  ) : selectedInstructor ? (
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <ReadOnlyInstructor person={selectedInstructor} />
                      <button
                        type="button"
                        onClick={() => setInstructorId("")}
                        className="mt-2 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-secondary"
                      >
                        تغيير المعلّم
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="mb-1.5 block text-sm font-semibold">اختر المعلّم</label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="ابحث بالاسم أو المعرّف أو الهاتف"
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 pe-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                      </div>
                      <ul className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border">
                        {filtered.length === 0 ? (
                          <li className="p-3 text-center text-xs text-muted-foreground">لا نتائج مطابقة</li>
                        ) : (
                          filtered.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => setInstructorId(p.id)}
                                className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-start text-sm last:border-b-0 hover:bg-secondary"
                              >
                                <span className="truncate font-semibold">{p.fullName}</span>
                                <span className="shrink-0 font-mono text-xs text-muted-foreground" dir="ltr">
                                  {p.memberId ?? p.username}
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Field className="sm:col-span-2" label="الاسم الكامل" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
                  <Field label="تاريخ الولادة" type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} required />
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-sm font-semibold">
                      رقم الهاتف <span className="text-destructive">*</span>
                    </label>
                    <div className={`flex items-stretch overflow-hidden rounded-xl border bg-background ${phoneError ? "border-destructive" : "border-input"}`}>
                      <span className="flex w-11 shrink-0 items-center justify-center border-e border-input bg-muted text-primary">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="tel"
                        value={form.phone}
                        placeholder="مثال: 20 123 456"
                        onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (phoneError) setPhoneError(null); }}
                        className="block w-full min-w-0 bg-background px-3 py-3 text-sm outline-none"
                      />
                    </div>
                    {phoneError && <p className="mt-1.5 text-xs font-medium text-destructive">{phoneError}</p>}
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border bg-background/40 p-4 sm:col-span-2">
                    <label className="mb-3 block text-sm font-semibold">الصورة الشخصية (اختياري)</label>
                    <div className="flex flex-wrap items-center gap-4">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="preview" className="h-24 w-32 shrink-0 rounded-xl object-cover ring-2 ring-primary/20" />
                      ) : (
                        <div className="flex h-24 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground">
                          <Camera className="h-6 w-6" />
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
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setForm((f) => ({ ...f, photoUrl: String(reader.result) }));
                                toast.success("تم اختيار الصورة");
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <div className="text-xs text-muted-foreground">
                          {form.photoUrl ? "تم اختيار صورة" : "يُفضل صورة واضحة بخلفية مناسبة."}
                        </div>
                        {form.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, photoUrl: "" })}
                            className="self-start rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
                          >
                            إزالة الصورة
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4 sm:col-span-2">
                {savedNew ? (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold hover:bg-secondary"
                  >
                    إغلاق
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {editing ? "حفظ التغييرات" : "إضافة العضو"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active, onClick, label, disabled,
}: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function ReadOnlyInstructor({ person, fallbackName }: { person: Person | null; fallbackName?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={person?.fullName ?? fallbackName ?? "?"} url={person?.photoUrl} />
      <dl className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
        <div className="font-display text-base font-bold text-foreground">
          {person?.fullName ?? fallbackName ?? "—"}
        </div>
        <Row label="المعرّف كمعلّم" value={person?.memberId ?? person?.username ?? "—"} />
        <Row label="الهاتف" value={person?.phone || "—"} />
        <Row label="تاريخ الولادة" value={person?.birthDate ? formatArabicDate(person.birthDate) : "—"} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return <img src={url} alt={name} className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20" />;
  }
  const initial = name?.trim().charAt(0) || "?";
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary ring-2 ring-primary/20">
      {initial}
    </div>
  );
}

function Field({
  label, value, onChange, required, className, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <label className="mb-1.5 block text-sm font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {type === "date" ? (
        <ArabicDateInput value={value} onChange={onChange} required={required} placeholder={placeholder} />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full max-w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      )}
    </div>
  );
}
