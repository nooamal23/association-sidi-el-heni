import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, UserMinus, UserPlus, Users, GraduationCap, Library, Play, TrendingUp, CalendarDays, Clock, User, Save, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { formatArabicDateRange } from "@/lib/utils";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { confirmToast } from "@/lib/confirm-toast";
import { noticeToast } from "@/lib/notice-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { useSeasonsStore } from "@/lib/seasons-store";
import { useCourseGroups, groupsActions, type CourseGroup } from "@/lib/groups-store";
import { StatCard } from "@/components/admin/admin-list-kit";


import {
  usePeopleStore,
  isMemorizationCourse,
  peopleActions,
  isCourseActive,
  LEVEL_LABEL,
  TYPE_LABEL,
  AUDIENCE_LABEL,
  ALLOWED_AUDIENCE,
  type CourseLite,
  type CourseType,
  type CourseAudience,
} from "@/lib/people-store";


export const Route = createFileRoute("/admin/courses")({
  component: CoursesAdminPage,
});

type FormState = {
  title: string;
  type: CourseType;
  audience: CourseAudience;
  startDate: string;
  endDate: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  type: "quran",
  audience: "children",
  startDate: "",
  endDate: "",
};



function CoursesAdminPage() {
  const { courses, people } = usePeopleStore();
  const seasons = useSeasonsStore();
  const instructors = people.filter((p) => p.role === "instructor");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseLite | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewing, setViewing] = useState<CourseLite | null>(null);
  const [tab, setTab] = useState<"active" | "archive">("active");

  const instructorById = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
  const seasonById = useMemo(() => new Map(seasons.map((s) => [s.id, s])), [seasons]);

  const tabbedCourses = useMemo(
    () => courses.filter((c) => (tab === "active" ? isCourseActive(c) : !isCourseActive(c))),
    [courses, tab],
  );

  const { query, setQuery, filtered: visibleCourses } = useLiveSearch(tabbedCourses, [
    (c) => c.title,
    (c) => (c.instructorId ? instructorById.get(c.instructorId)?.fullName ?? "" : ""),
  ]);

  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visibleCourses.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageCourses = visibleCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeTab(t: "active" | "archive") { setTab(t); setPage(1); }
  function changeQuery(q: string) { setQuery(q); setPage(1); }


  const activeCount = courses.filter((c) => isCourseActive(c)).length;
  const archiveCount = courses.length - activeCount;

  const enrolledByCourse = useMemo(() => {
    const m = new Map<string, number>();
    people.forEach((p) => {
      if (p.role !== "student") return;
      p.courseIds.forEach((cid) => m.set(cid, (m.get(cid) ?? 0) + 1));
    });
    return m;
  }, [people]);

  const totalEnrolled = useMemo(
    () => courses.reduce((sum, c) => sum + (enrolledByCourse.get(c.id) ?? 0), 0),
    [courses, enrolledByCourse],
  );
  const fillRate = useMemo(() => {
    const cap = courses.reduce((sum, c) => sum + (c.capacity ?? 25), 0);
    return cap > 0 ? Math.min(100, Math.round((totalEnrolled / cap) * 100)) : 0;
  }, [courses, totalEnrolled]);



  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }

  function openEdit(c: CourseLite) {
    setEditing(c);
    setForm({
      title: c.title,
      type: c.type ?? "quran",
      audience: c.audience ?? "children",
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
    });
    setOpen(true);
  }


  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ALLOWED_AUDIENCE[form.type].includes(form.audience)) {
      noticeToast({
        variant: "warning",
        title: "تعذّر الحفظ",
        message: "الفئة المستهدفة غير متاحة لهذا النوع من الدورات.",
      });
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      noticeToast({
        variant: "warning",
        title: "تعذّر الحفظ",
        message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.",
      });
      return;
    }
    if (!editing && !seasons.some((s) => s.isActive)) {
      noticeToast({
        variant: "warning",
        title: "تعذّر إنشاء الدورة",
        message: "لا يوجد موسم دراسي نشط حالياً — يرجى تفعيل موسم من صفحة المواسم الدراسية أولاً.",
      });
      return;
    }
    const payload = {
      title: form.title,
      type: form.type,
      audience: form.audience,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    // A rejected validation (e.g. course dates outside the season range) must
    // leave the dialog open with the admin's values intact — the large notice
    // is shown on top and only the offending field needs fixing.
    setSaving(true);
    try {
      if (editing) await peopleActions.updateCourse(editing.id, payload);
      else await peopleActions.addCourse(payload);
      setOpen(false);
    } catch {
      /* notice already shown; keep the form open */
    } finally {
      setSaving(false);
    }
  }


  function remove(c: CourseLite) {
    confirmToast({
      message: `حذف الدورة "${c.title}"؟`,
      description: "سيتم إلغاء تسجيل جميع المرسمين بها.",
      onConfirm: () => {
        peopleActions.removeCourse(c.id);
        toast.success(`تم حذف الدورة "${c.title}"`);
      },
    });
  }

  function onTypeChange(type: CourseType) {
    const allowed = ALLOWED_AUDIENCE[type];
    setForm((f) => ({
      ...f,
      type,
      audience: allowed.includes(f.audience) ? f.audience : allowed[0],
    }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">الدورات</h1>
            <p className="mt-1 text-sm text-muted-foreground">إنشاء وإدارة الدورات مع التفاصيل الكاملة.</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> دورة جديدة
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Library className="h-5 w-5" />} label="إجمالي الدورات" value={courses.length} unit="دورة" tone="primary" />
        <StatCard icon={<Play className="h-5 w-5" />} label="الدورات النشطة" value={activeCount} unit="دورة" tone="emerald" />
        <StatCard icon={<Users className="h-5 w-5" />} label="إجمالي المسجلين" value={totalEnrolled} unit="مسجّل" tone="amber" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="معدل الإقبال" value={`${fillRate}%`} unit="متوسط الإكمال" tone="emerald" />
      </div>


      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <SearchBox value={query} onChange={changeQuery} placeholder="ابحث عن دورة أو معلم..." />
        </div>
        <div className="inline-flex shrink-0 self-start rounded-xl border border-border bg-card p-1 sm:self-auto">
          <button
            onClick={() => changeTab("active")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "active" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            الجارية <span className="opacity-70">({activeCount})</span>
          </button>
          <button
            onClick={() => changeTab("archive")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "archive" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            الأرشيف <span className="opacity-70">({archiveCount})</span>
          </button>
        </div>
      </div>


      {tabbedCourses.length === 0 ? (

        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد دورات حاليا. اضغط "دورة جديدة" للبدء.
        </div>
      ) : visibleCourses.length === 0 ? (
        <NoResults />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleCourses.map((c) => {
            const enrolled = people.filter((p) => p.role === "student" && p.courseIds.includes(c.id)).length;
            const instructor = c.instructorId ? instructorById.get(c.instructorId) : undefined;
            const active = isCourseActive(c);
            const cap = c.capacity ?? 25;
            const pct = cap > 0 ? Math.min(100, Math.round((enrolled / cap) * 100)) : 0;
            return (
              <article key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {c.type && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                        {TYPE_LABEL[c.type]}
                      </span>
                    )}
                    {c.audience && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {AUDIENCE_LABEL[c.audience]}
                      </span>
                    )}
                    {c.level && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {LEVEL_LABEL[c.level]}
                      </span>
                    )}
                    {!active && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        أرشيف
                      </span>
                    )}
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

                <h3 className="mt-3 font-display text-lg font-bold">{c.title}</h3>

                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <Row label="التاريخ" value={formatArabicDateRange(c.startDate ?? "", c.endDate ?? "")} />

                  <Row label="التوقيت" value={c.timeFrom && c.timeTo ? `${c.timeFrom} — ${c.timeTo}` : "—"} />
                  <Row label="المعلم" value={instructor ? instructor.fullName : "غير محدد"} />
                  <Row label="الموسم" value={c.seasonId ? seasonById.get(c.seasonId)?.name ?? "—" : "—"} />

                </dl>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{enrolled}/{cap} مسجّل</span>
                    <span className="font-semibold text-primary">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h2 className="min-w-0 truncate font-display text-xl font-bold">
                  {editing ? "تعديل الدورة" : "إضافة دورة جديدة"}
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
                ? "عدّل معلومات الدورة ثم احفظ التغييرات."
                : "أدخل معلومات الدورة لإضافتها إلى النظام."}
              {" "}الحقول المعلّمة بـ <span className="text-destructive">*</span> إجبارية.
            </p>

            <form onSubmit={submit} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="عنوان الدورة"
                placeholder="أدخل عنوان الدورة"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                required
              />

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">
                  نوع الدورة <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => onTypeChange(e.target.value as CourseType)}
                  className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">
                  الفئة المستهدفة <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value as CourseAudience })}
                  className="block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {ALLOWED_AUDIENCE[form.type].map((a) => (
                    <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>
                  ))}
                </select>
              </div>

              <Field label="تاريخ البداية" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
              <Field label="تاريخ النهاية" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />

              <div className="min-w-0 rounded-2xl border border-dashed border-border bg-background/40 p-4 text-xs text-muted-foreground sm:col-span-2">
                المستوى والمعلم والطاقة الاستيعابية والأيام والتوقيت تُحدَّد على مستوى الفوج وليس الدورة — أضفها من «المستويات والمجموعات» عند إنشاء/تعديل الفوج. كما تُربط الدورة تلقائياً بالموسم الدراسي النشط.
              </div>

              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "جاري الحفظ..." : editing ? "حفظ التغييرات" : "إضافة الدورة"}
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


      {viewing && (
        <ViewCourseModal
          course={viewing}
          onClose={() => setViewing(null)}
          onChangeInstructor={() => {
            setViewing(null);
            openEdit(viewing);
          }}
        />
      )}
    </div>
  );
}

function ViewCourseModal({
  course,
  onClose,
  onChangeInstructor,
}: {
  course: CourseLite;
  onClose: () => void;
  onChangeInstructor: () => void;
}) {
  const { people } = usePeopleStore();
  const instructor = course.instructorId ? people.find((p) => p.id === course.instructorId) : undefined;
  const students = people.filter((p) => p.role === "student" && p.courseIds.includes(course.id));
  const availableStudents = people.filter(
    (p) => p.role === "student" && !p.courseIds.includes(course.id),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [pickId, setPickId] = useState("");

  function unenroll(studentId: string, name: string) {
    confirmToast({
      message: `حذف ${name} من هذه الدورة؟`,
      onConfirm: () => {
        peopleActions.unenroll(course.id, studentId);
        toast.success(`تم حذف ${name} من الدورة`);
      },
    });
  }

  function enroll() {
    if (!pickId) return;
    const s = availableStudents.find((p) => p.id === pickId);
    const cap = course.capacity ?? 25;
    if (students.length >= cap) {
      noticeToast({
        variant: "warning",
        title: "المجموعة ممتلئة",
        message: `لا يمكن إضافة هذا التلميذ: المجموعة ممتلئة (الطاقة الاستيعابية القصوى ${cap} تلاميذ).`,
        description: "ارفع الطاقة الاستيعابية للدورة أو أزل تلميذا قبل إضافة تلميذ جديد.",
      });
      return;
    }
    peopleActions.enroll(course.id, pickId);
    setPickId("");
    setAddOpen(false);
    if (s) toast.success(`تمت إضافة ${s.fullName} إلى الدورة`);
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{course.title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">المعلم المسؤول</div>
              <div className="font-semibold">{instructor?.fullName ?? "غير محدد"}</div>
            </div>
            <button
              onClick={onChangeInstructor}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-secondary"
              title="تعديل المعلم"
            >
              <Pencil className="h-3.5 w-3.5" /> تغيير
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              المرسّمون <span className="text-muted-foreground">({students.length})</span>
            </div>
            <button
              onClick={() => setAddOpen((v) => !v)}
              disabled={availableStudents.length === 0}
              className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              title={availableStudents.length === 0 ? "لا يوجد تلاميذ متاحون للإضافة" : "إضافة تلميذ"}
            >
              <UserPlus className="h-3.5 w-3.5" /> إضافة تلميذ
            </button>
          </div>

          {addOpen && (
            <div className="mb-3 rounded-lg border border-border bg-background p-3">
              {availableStudents.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  كل التلاميذ المسجلين موجودون في هذه الدورة. أضف تلاميذ جددا من قسم "التلاميذ".
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-semibold">اختر تلميذا</label>
                    <select
                      value={pickId}
                      onChange={(e) => setPickId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— اختر من القائمة —</option>
                      {availableStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} (@{s.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={enroll}
                    disabled={!pickId}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    إضافة
                  </button>
                </div>
              )}
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              لا يوجد مرسّمون بعد.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">@{s.username}</div>
                  </div>
                  <button
                    onClick={() => unenroll(s.id, s.fullName)}
                    className="flex items-center gap-1 rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    title="حذف من الدورة"
                  >
                    <UserMinus className="h-3.5 w-3.5" /> حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <GroupsSection course={course} students={students} />

      </div>

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
        <ArabicDateInput value={value} onChange={onChange} required={required} />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full max-w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      )}
    </div>
  );
}


function GroupsSection({
  course,
  students,
}: {
  course: CourseLite;
  students: { id: string; fullName: string }[];
}) {
  const courseId = course.id;
  // عدد الأحزاب only applies to memorization courses.
  const showHizb = isMemorizationCourse(course);
  const { groups, loading, reload } = useCourseGroups(courseId);
  const [hizb, setHizb] = useState<string>("");
  const [pickerFor, setPickerFor] = useState<CourseGroup | null>(null);

  const memberOfById = useMemo(() => {
    const map = new Map<string, string | null>();
    students.forEach((s) => map.set(s.id, null));
    groups.forEach((g) => g.memberIds.forEach((sid) => map.set(sid, g.id)));
    return map;
  }, [groups, students]);

  const studentById = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach((s) => m.set(s.id, s.fullName));
    return m;
  }, [students]);

  const unassigned = useMemo(
    () => students.filter((s) => !memberOfById.get(s.id)),
    [students, memberOfById],
  );

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    const h = hizb === "" ? 0 : Number(hizb);
    if (Number.isNaN(h) || h < 0) return;
    try {
      await groupsActions.create(courseId, { hizbCount: h });
      setHizb("");
      await reload();
      toast.success("تم إنشاء المجموعة");
    } catch {}
  }

  async function updateHizb(g: CourseGroup, value: number) {
    if (value === g.hizbCount) return;
    await groupsActions.update(courseId, g.id, { hizbCount: value });
    await reload();
  }

  function removeGroup(g: CourseGroup) {
    confirmToast({
      message: `حذف المجموعة رقم ${g.number}؟`,
      description:
        g.membersCount > 0
          ? `التلاميذ (${g.membersCount}) لن يُحذفوا، فقط يُفصلون عن المجموعة ويبقون مسجّلين في الدورة.`
          : undefined,
      onConfirm: async () => {
        await groupsActions.remove(courseId, g.id);
        await reload();
        toast.success("تم حذف المجموعة");
      },
    });
  }

  async function assignOne(studentId: string, groupId: string | null) {
    await groupsActions.assign(courseId, studentId, groupId);
    await reload();
  }

  async function bulkAssign(groupId: string, studentIds: string[]) {
    await groupsActions.bulkAssign(courseId, studentIds, groupId);
    await reload();
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">
          المجموعات <span className="text-muted-foreground">({groups.length})</span>
        </div>
      </div>

      <form onSubmit={addGroup} className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground">
          المجموعة رقم <span className="font-semibold text-foreground">{(groups[groups.length - 1]?.number ?? 0) + 1}</span>
        </div>
        {showHizb && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">المستوى (عدد الأحزاب):</label>
            <input
              type="number"
              min={0}
              max={60}
              value={hizb}
              onChange={(e) => setHizb(e.target.value)}
              placeholder="0"
              className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        )}
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          إضافة مجموعة
        </button>
      </form>

      {loading ? (
        <div className="text-xs text-muted-foreground">جاري التحميل...</div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          لا توجد مجموعات بعد. أنشئ مجموعة لتوزيع التلاميذ داخل الدورة.
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                    المجموعة #{g.number}
                  </span>
                  <label className={`flex items-center gap-1 text-xs text-muted-foreground ${showHizb ? "" : "hidden"}`}>
                    المستوى:
                    <input
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={g.hizbCount}
                      onBlur={(e) => updateHizb(g, Number(e.target.value) || 0)}
                      className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <span>حزب</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{g.membersCount} تلميذ</span>
                  <button
                    onClick={() => setPickerFor(g)}
                    className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    + إضافة تلاميذ
                  </button>
                  <button
                    onClick={() => removeGroup(g)}
                    className="rounded-md border border-destructive/30 bg-background p-1 text-destructive hover:bg-destructive/10"
                    title="حذف المجموعة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {g.memberIds.length > 0 && (
                <ul className="mt-2 divide-y divide-border border-t border-border">
                  {g.memberIds.map((sid) => (
                    <li key={sid} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="truncate">{studentById.get(sid) ?? sid}</span>
                      <button
                        onClick={() => assignOne(sid, null)}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                        title="إخراج من المجموعة"
                      >
                        إخراج
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {unassigned.length > 0 && groups.length > 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-amber-400/40 bg-amber-50/40 p-2.5 dark:bg-amber-950/20">
          <div className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            بدون مجموعة ({unassigned.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((s) => (
              <span key={s.id} className="rounded-md bg-background px-2 py-0.5 text-xs">{s.fullName}</span>
            ))}
          </div>
        </div>
      )}

      {pickerFor && (
        <AddStudentsDialog
          group={pickerFor}
          candidates={students.filter((s) => memberOfById.get(s.id) !== pickerFor.id)}
          memberOfById={memberOfById}
          onClose={() => setPickerFor(null)}
          onConfirm={async (ids) => {
            await bulkAssign(pickerFor.id, ids);
            setPickerFor(null);
            toast.success(`تم إضافة ${ids.length} تلميذ إلى المجموعة #${pickerFor.number}`);
          }}
        />
      )}
    </div>
  );
}

function AddStudentsDialog({
  group,
  candidates,
  memberOfById,
  onClose,
  onConfirm,
}: {
  group: CourseGroup;
  candidates: { id: string; fullName: string }[];
  memberOfById: Map<string, string | null>;
  onClose: () => void;
  onConfirm: (ids: string[]) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return candidates;
    return candidates.filter((s) => s.fullName.includes(term));
  }, [candidates, q]);

  const unassignedFirst = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ag = memberOfById.get(a.id) ? 1 : 0;
      const bg = memberOfById.get(b.id) ? 1 : 0;
      return ag - bg;
    });
  }, [filtered, memberOfById]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllUnassigned() {
    const ids = candidates.filter((s) => !memberOfById.get(s.id)).map((s) => s.id);
    setSelected(new Set(ids));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">إضافة تلاميذ إلى المجموعة #{group.number}</div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">إغلاق</button>
        </div>
        <div className="mb-2 flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={selectAllUnassigned}
            className="whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
          >
            تحديد بدون مجموعة
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {unassignedFirst.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">لا يوجد تلاميذ متاحون.</div>
          ) : (
            <ul className="divide-y divide-border">
              {unassignedFirst.map((s) => {
                const currentGid = memberOfById.get(s.id);
                const isChecked = selected.has(s.id);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4"
                      />
                      <span className="truncate text-sm">{s.fullName}</span>
                    </label>
                    {currentGid ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">في مجموعة أخرى</span>
                    ) : (
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">بدون مجموعة</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">محدَّد: {selected.size}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
              إلغاء
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() => onConfirm(Array.from(selected))}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              إضافة إلى المجموعة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


