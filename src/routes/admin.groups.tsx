import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Trash2, Users2, ArrowLeft, Printer, Layers, GraduationCap, CheckCircle2, BookOpen, User, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import {
  useLevelsGroups,
  levelsActions,
  studentGroupsActions,
  type Level,
  type StudentGroup,
  type GroupStudent,
} from "@/lib/levels-groups-store";
import { usePeopleStore, isMemorizationCourse, WEEKDAYS, AUDIENCE_LABEL } from "@/lib/people-store";
import { PrintSheet, PrintSectionTitle, PrintTable, PrintTd } from "@/components/admin/print-sheet";
import { TimeInput24 } from "@/components/ui/time-input-24";
import { StatCard } from "@/components/admin/admin-list-kit";

export const Route = createFileRoute("/admin/groups")({
  head: () => ({
    meta: [
      { title: "المستويات والمجموعات — الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GroupsAdminPage,
});

type Tab = "levels" | "groups";

function GroupsAdminPage() {
  const { levels, groups } = useLevelsGroups();
  const [tab, setTab] = useState<Tab>("groups");
  const [openLevel, setOpenLevel] = useState<Level | "new" | null>(null);
  const [openGroup, setOpenGroup] = useState<StudentGroup | "new" | null>(null);
  const [detail, setDetail] = useState<StudentGroup | null>(null);

  if (detail) {
    return <GroupDetailView group={detail} onBack={() => setDetail(null)} />;
  }

  const totalStudents = groups.reduce((s, g) => s + (g.studentsCount ?? 0), 0);
  const avgSize = groups.length > 0 ? Math.round((totalStudents / groups.length) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">المستويات والمجموعات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              نظّم التلاميذ في مجموعات مرتبطة بمستويات (كل مستوى يحدّد عدد الأحزاب المطلوبة).
            </p>
          </div>
        </div>
        <button
          onClick={() => (tab === "levels" ? setOpenLevel("new") : setOpenGroup("new"))}
          disabled={tab === "groups" && levels.length === 0}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {tab === "levels" ? "مستوى جديد" : "مجموعة جديدة"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Layers className="h-5 w-5" />} label="إجمالي المجموعات" value={groups.length} unit="مجموعة" tone="primary" />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="متوسط حجم المجموعة" value={avgSize} unit="تلميذ" tone="amber" />
        <StatCard icon={<Users2 className="h-5 w-5" />} label="إجمالي التلاميذ" value={totalStudents} unit="تلميذ" tone="emerald" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="إجمالي المستويات" value={levels.length} unit="مستوى" tone="primary" />
      </div>

      <div className="inline-flex shrink-0 rounded-xl border border-border bg-card p-1">
        <TabBtn active={tab === "groups"} onClick={() => setTab("groups")}>المجموعات</TabBtn>
        <TabBtn active={tab === "levels"} onClick={() => setTab("levels")}>المستويات</TabBtn>
      </div>


      {tab === "levels" ? (
        <LevelsList levels={levels} onAdd={() => setOpenLevel("new")} onEdit={setOpenLevel} />
      ) : (
        <GroupsList
          groups={groups}
          levels={levels}
          onAdd={() => setOpenGroup("new")}
          onEdit={setOpenGroup}
          onOpen={setDetail}
        />
      )}

      {openLevel && (
        <LevelFormDialog editing={openLevel === "new" ? null : openLevel} onClose={() => setOpenLevel(null)} />
      )}
      {openGroup && (
        <GroupFormDialog
          editing={openGroup === "new" ? null : openGroup}
          levels={levels}
          groups={groups}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

// -------------------- Levels --------------------
function LevelsList({ levels, onAdd, onEdit }: { levels: Level[]; onAdd: () => void; onEdit: (l: Level) => void }) {
  function remove(l: Level) {
    confirmToast({
      message: `حذف المستوى "${l.name}"؟`,
      description: l.groupsCount > 0 ? `هذا المستوى يحتوي على ${l.groupsCount} مجموعة — لن يتم الحذف حتى تُزال مجموعاته أولاً.` : undefined,
      onConfirm: async () => {
        try { await levelsActions.remove(l.id); toast.success("تم حذف المستوى"); } catch {}
      },
    });
  }
  return (
    <div className="space-y-4">
      {levels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مستويات. اضغط «مستوى جديد» للبدء.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {levels.map((l) => (
            <article key={l.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{l.name}</h3>
                    <span className="mt-1 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      عدد المجموعات: <span className="text-foreground">{l.groupsCount}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(l)} className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary" title="تعديل">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(l)} className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function LevelFormDialog({ editing, onClose }: { editing: Level | null; onClose: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) { await levelsActions.update(editing.id, { name }); toast.success("تم حفظ التغييرات"); }
      else { await levelsActions.add({ name }); toast.success("تم إنشاء المستوى"); }
      onClose();
    } catch {}
  }

  return (
    <Modal title={editing ? "تعديل المستوى" : "مستوى جديد"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="اسم المستوى">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="مثال: المستوى الأول" />
        </Field>
        <button type="submit" className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {editing ? "حفظ" : "إنشاء"}
        </button>
      </form>
    </Modal>
  );
}

// -------------------- Groups --------------------
function GroupsList({
  groups, levels, onAdd, onEdit, onOpen,
}: {
  groups: StudentGroup[]; levels: Level[]; onAdd: () => void; onEdit: (g: StudentGroup) => void; onOpen: (g: StudentGroup) => void;
}) {
  function remove(g: StudentGroup) {
    confirmToast({
      message: `حذف المجموعة رقم "${g.number}"؟`,
      description: "سيتم إلغاء ربط التلاميذ بهذه المجموعة، ولن يُحذف أي تلميذ.",
      onConfirm: async () => {
        try { await studentGroupsActions.remove(g.id); toast.success("تم حذف المجموعة"); } catch {}
      },
    });
  }
  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مجموعات بعد. {levels.length === 0 ? "أنشئ مستوىً أولاً قبل إضافة المجموعات." : "اضغط «مجموعة جديدة» للبدء."}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const pct = g.capacity > 0 ? Math.min(100, Math.round((g.studentsCount / g.capacity) * 100)) : 0;
            return (
              <article key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <button onClick={() => onOpen(g)} className="block min-w-0 truncate text-right font-display text-lg font-bold text-primary hover:underline">
                        مجموعة {g.number}
                      </button>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">نشطة</span>
                        {g.courseTitle && (
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{g.courseTitle}</span>
                        )}
                        {g.levelName && (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{g.levelName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => onEdit(g)} className="rounded-md border border-border bg-background p-1.5 hover:bg-secondary" title="تعديل">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(g)} className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs sm:grid-cols-4">
                  <MiniInfo icon={<BookOpen className="h-3.5 w-3.5" />} label="الدورة" value={g.courseTitle ?? "—"} />
                  <MiniInfo icon={<User className="h-3.5 w-3.5" />} label="المعلم" value={g.instructorName ?? "غير محدد"} />
                  <MiniInfo icon={<Clock className="h-3.5 w-3.5" />} label="الوقت" value={g.timeFrom && g.timeTo ? `${g.timeFrom} - ${g.timeTo}` : "—"} />
                  <MiniInfo icon={<CalendarDays className="h-3.5 w-3.5" />} label="الأيام" value={daysText(g.days)} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => onOpen(g)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Users2 className="h-4 w-4" /> عرض التلاميذ
                  </button>
                  <div className="w-full sm:w-48">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{g.studentsCount} من {g.capacity} تلميذ</span>
                      <span className="font-semibold text-primary">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="mt-1 block truncate font-semibold text-foreground">{value}</span>
    </div>
  );
}

// Next free group number for a course: MAX(number) + 1, or 1 when it has none.
function nextGroupNumber(groups: StudentGroup[], courseId: string) {
  const used = groups.filter((g) => g.courseId === courseId).map((g) => g.number);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

function GroupFormDialog({ editing, levels, groups, onClose }: { editing: StudentGroup | null; levels: Level[]; groups: StudentGroup[]; onClose: () => void }) {
  const { people, courses } = usePeopleStore();
  const instructors = useMemo(() => people.filter((p) => p.role === "instructor"), [people]);
  const initialCourseId = editing?.courseId ?? courses[0]?.id ?? "";
  const [courseId, setCourseId] = useState(initialCourseId);
  const [number, setNumber] = useState<number>(
    editing?.number ?? nextGroupNumber(groups, initialCourseId),
  );
  const [levelId, setLevelId] = useState(editing?.levelId ?? "");
  const [hizbCount, setHizbCount] = useState<number>(editing?.hizbCount ?? 0);
  const [instructorId, setInstructorId] = useState(editing?.instructorId ?? "");
  const [room, setRoom] = useState(editing?.room ?? "");
  const [capacity, setCapacity] = useState<number>(editing?.capacity ?? 25);
  const [days, setDays] = useState<number[]>(editing?.days ?? []);
  const [timeFrom, setTimeFrom] = useState(editing?.timeFrom ?? "");
  const [timeTo, setTimeTo] = useState(editing?.timeTo ?? "");

  // عدد الأحزاب only applies to memorization courses (children/women/men);
  // فقه وشريعة / تكوين معلمين / دورات صيفية have no hizb progress. The
  // instructor schedule-conflict rule still applies to every category.
  const selectedCourse = courses.find((c) => c.id === courseId);
  const showHizb = isMemorizationCourse(selectedCourse);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  // Switching the course re-computes the suggested number (creation only);
  // the admin can still override it manually.
  function changeCourse(id: string) {
    setCourseId(id);
    if (!editing) setNumber(nextGroupNumber(groups, id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return;
    const payload = {
      courseId,
      number,
      levelId: levelId || null,
      ...(showHizb ? { hizbCount } : {}),
      instructorId: instructorId || null,
      room: room || null,
      capacity,
      days,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
    };
    try {
      if (editing) { await studentGroupsActions.update(editing.id, payload); toast.success("تم حفظ التغييرات"); }
      else { await studentGroupsActions.add(payload); toast.success("تم إنشاء المجموعة"); }
      onClose();
    } catch {}
  }
  return (
    <Modal title={editing ? "تعديل المجموعة" : "مجموعة جديدة"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label="الدورة">
          <select required value={courseId} onChange={(e) => changeCourse(e.target.value)} className={inputClass}>
            <option value="" disabled>اختر الدورة</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <Field label="رقم المجموعة">
          <input type="number" min={1} required value={number} onChange={(e) => setNumber(Number(e.target.value))} className={inputClass} placeholder="مثال: 1" />
        </Field>
        <Field label="المستوى (اختياري)">
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)} className={inputClass}>
            <option value="">— بدون مستوى —</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        {showHizb ? (
          <Field label="عدد الأحزاب">
            <input
              type="number"
              min={0}
              max={60}
              value={hizbCount}
              onChange={(e) => setHizbCount(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        ) : (
          selectedCourse && (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              عدد الأحزاب لا ينطبق على هذا النوع من الدورات (فقه وشريعة / تكوين معلمين / دورات صيفية).
            </div>
          )
        )}
        <Field label="المعلم (اختياري)">
          <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className={inputClass}>
            <option value="">— بدون معلم —</option>
            {instructors.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </Field>
        <Field label="الطاقة الاستيعابية">
          <input type="number" min={1} required value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputClass} />
        </Field>
        <Field label="القاعة (اختياري)">
          <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} placeholder="مثال: قاعة 2" />
        </Field>
        <Field label="أيام الحصص">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => toggleDay(w.value)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  days.includes(w.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من الساعة">
            <TimeInput24 value={timeFrom} onChange={setTimeFrom} />
          </Field>
          <Field label="إلى الساعة">
            <TimeInput24 value={timeTo} onChange={setTimeTo} />
          </Field>
        </div>
        <button type="submit" className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {editing ? "حفظ" : "إنشاء"}
        </button>
      </form>
    </Modal>
  );
}

// -------------------- Group detail (read-only roster + print) --------------------
function daysText(days: number[] | undefined) {
  if (!days || days.length === 0) return "—";
  const order = WEEKDAYS.map((d) => d.value);
  return [...days]
    .sort((a, b) => order.indexOf(a as never) - order.indexOf(b as never))
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? d)
    .join("، ");
}

function GroupDetailView({ group, onBack }: { group: StudentGroup; onBack: () => void }) {
  const { people, courses } = usePeopleStore();
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    studentGroupsActions
      .listStudents(group.id)
      .then((rows) => { if (alive) setStudents(rows); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [group.id]);

  const course = courses.find((c) => c.id === group.courseId);
  const audience = course?.audience ? AUDIENCE_LABEL[course.audience] : "—";
  const showHizb = isMemorizationCourse(course);
  const rows = useMemo(
    () =>
      students.map((s) => {
        const person = people.find((p) => p.id === s.id);
        return {
          id: s.id,
          code: person?.memberId ?? s.username,
          fullName: s.fullName,
          phone: s.phone ?? "—",
        };
      }),
    [students, people],
  );

  const q = search.trim();
  const filtered = useMemo(
    () =>
      q === ""
        ? rows
        : rows.filter((r) => r.fullName.includes(q) || r.code.includes(q) || r.phone.includes(q)),
    [rows, q],
  );

  const info: { label: string; value: React.ReactNode }[] = [
    { label: "الدورة", value: group.courseTitle ?? course?.title ?? "—" },
    { label: "الفئة المستهدفة", value: audience },
    { label: "الأستاذ المسؤول", value: group.instructorName ?? "—" },
    { label: "الأيام", value: daysText(group.days) },
    { label: "التوقيت", value: group.timeFrom && group.timeTo ? `${group.timeFrom} - ${group.timeTo}` : "—" },
    { label: "المستوى", value: group.levelName ?? "—" },
    ...(showHizb ? [{ label: "عدد الأحزاب", value: group.hizbCount ?? 0 }] : []),
    { label: "عدد التلاميذ", value: rows.length },
  ];

  return (
    <div className="space-y-5">
      {/* شريط علوي: العودة + مسار التنقّل */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users2 className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-bold">تلاميذ مجموعة {group.number}</h1>
        </div>
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> العودة إلى المجموعات
        </button>
      </div>
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button onClick={onBack} className="hover:text-primary hover:underline">المجموعات</button>
        <span>‹</span>
        <span>مجموعة {group.number}</span>
        <span>‹</span>
        <span className="font-semibold text-foreground">تلاميذ المجموعة</span>
      </nav>

      {/* بطاقة ملخّص المجموعة */}
      <header className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users2 className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold">مجموعة {group.number}</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">نشطة</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(group.courseTitle ?? course?.title) && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{group.courseTitle ?? course?.title}</span>
              )}
              {group.levelName && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{group.levelName}</span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> المعلم: {group.instructorName ?? "—"}
              </span>
              {group.room && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" /> {group.room}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 text-center sm:grid-cols-3 sm:divide-x sm:divide-x-reverse sm:divide-border">
          <div>
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Users2 className="h-4 w-4 text-primary" /> عدد التلاميذ
            </span>
            <div className="mt-1.5 font-display text-xl font-bold">
              {rows.length} / {group.capacity}
            </div>
            <div className="text-xs text-muted-foreground">تلميذ</div>
          </div>
          <div>
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" /> الأيام
            </span>
            <div className="mt-1.5 font-display text-base font-bold">{daysText(group.days)}</div>
          </div>
          <div>
            <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" /> الوقت
            </span>
            <div className="mt-1.5 font-display text-base font-bold" dir="ltr">
              {group.timeFrom && group.timeTo ? `${group.timeFrom} - ${group.timeTo}` : "—"}
            </div>
          </div>
        </div>
      </header>

      {/* قائمة التلاميذ */}
      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <button onClick={() => setPrinting(true)} className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
            <Printer className="h-4 w-4" /> طباعة
          </button>
          <div className="relative w-full sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن تلميذ بالاسم أو رقم الهاتف..."
              className={`${inputClass} pe-9`}
            />
            <Users2 className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {loading ? (
          <div className="px-4 pb-5 text-sm text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="mx-4 mb-4 rounded-xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "لا يوجد تلاميذ في هذه المجموعة بعد." : "لا توجد نتائج مطابقة للبحث."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="w-12 px-4 py-3 text-start font-semibold">#</th>
                    <th className="px-4 py-3 text-start font-semibold">التلميذ</th>
                    <th className="px-4 py-3 text-start font-semibold">رقم الهاتف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                            {r.fullName.trim().charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{r.fullName}</div>
                            <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" dir="ltr" style={{ textAlign: "start" }}>{r.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              عرض 1 إلى {filtered.length} من أصل {filtered.length} تلميذ
            </div>
          </>
        )}
      </div>

      {printing && (
        <PrintGroupRoster
          group={group}
          info={info}
          rows={rows}
          courseType={course?.type as never}
          onClose={() => setPrinting(false)}
        />
      )}
    </div>
  );
}

function PrintGroupRoster({
  group, info, rows, courseType, onClose,
}: {
  group: StudentGroup;
  info: { label: string; value: React.ReactNode }[];
  rows: { id: string; code: string; fullName: string; phone: string }[];
  courseType?: "quran" | "fiqh" | "training" | "summer" | null;
  onClose: () => void;
}) {
  return (
    <PrintSheet
      title={`المجموعة ${group.number}`}
      stats={info}
      courseType={courseType}
      onClose={onClose}
    >
      <PrintSectionTitle>قائمة التلاميذ</PrintSectionTitle>
      <PrintTable headers={["#", "المعرف الوحيد", "الاسم واللقب", "رقم الهاتف"]}>
        {rows.length === 0 ? (
          <tr><PrintTd className="py-3">—</PrintTd><PrintTd>لا يوجد تلاميذ في هذه المجموعة</PrintTd><PrintTd>—</PrintTd><PrintTd>—</PrintTd></tr>
        ) : rows.map((r, i) => (
          <tr key={r.id}>
            <PrintTd>{i + 1}</PrintTd>
            <PrintTd className="font-mono">{r.code}</PrintTd>
            <PrintTd>{r.fullName}</PrintTd>
            <PrintTd>{r.phone}</PrintTd>
          </tr>
        ))}
      </PrintTable>
    </PrintSheet>
  );
}


// -------------------- Shared UI --------------------
const inputClass =
  "block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
      <div className={`max-h-full w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated`}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
