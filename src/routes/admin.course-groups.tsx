import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Printer, Trash2, Users2, X, User, Users, CalendarDays, Clock, DoorOpen, BookOpen, UserPlus, Info, Filter, Phone, BadgeCheck, Save } from "lucide-react";
import { toast } from "sonner";

import { confirmToast } from "@/lib/confirm-toast";
import { noticeToast } from "@/lib/notice-toast";
import { useAutoRefresh, formatRefreshTime } from "@/hooks/use-auto-refresh";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { usePeopleStore, WEEKDAYS } from "@/lib/people-store";
import {
  rosterActions,
  type AvailableStudent,
  type ConflictMode,
  type CourseRoster,
  type RosterGroup,
  type RosterStudent,
} from "@/lib/roster-store";
import { PrintSheet, PrintSectionTitle, PrintTable, PrintTd } from "@/components/admin/print-sheet";

export const Route = createFileRoute("/admin/course-groups")({
  // Part 29/4 — the dashboard "latest groups" widget links here with ?courseId=
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: typeof search.courseId === "string" ? search.courseId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "أفواج الدورات والتلاميذ — الإدارة" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CourseGroupsRosterPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  children: "أطفال",
  women: "نساء",
  men: "رجال",
  training: "تكوين معلمين",
  summer: "دورة صيفية",
};

function dayLabel(d: number) {
  return WEEKDAYS.find((w) => w.value === d)?.label ?? String(d);
}

function daysText(g: Pick<RosterGroup, "days">) {
  return g.days.length ? g.days.map(dayLabel).join("، ") : "—";
}

function timeText(g: Pick<RosterGroup, "timeFrom" | "timeTo">) {
  return g.timeFrom && g.timeTo ? `${g.timeFrom} - ${g.timeTo}` : "—";
}

function CourseGroupsRosterPage() {
  const { courses } = usePeopleStore();
  const { courseId: courseIdFromUrl } = Route.useSearch();
  const [courseId, setCourseId] = useState(courseIdFromUrl ?? "");
  const [roster, setRoster] = useState<CourseRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<RosterGroup | null>(null);
  const [printing, setPrinting] = useState(false);
  // Part 28/3 — locate an already-enrolled student across the course's groups.
  const [enrolledQuery, setEnrolledQuery] = useState("");

  // Default to the first course once the course list has hydrated.
  useEffect(() => {
    if (!courseId && courses.length > 0) setCourseId(courses[0]!.id);
  }, [courses, courseId]);

  const reload = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      setRoster(await rosterActions.getRoster(courseId));
    } catch (e) {
      toast.error(`تعذّر تحميل قائمة الدورة: ${(e as Error).message}`);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void reload(); }, [reload]);

  // Part 28/4 — data refreshes itself (tab focus + polling), no manual button.
  const { lastRefreshedAt, markRefreshed } = useAutoRefresh(async () => {
    await reload();
  }, { intervalMs: 45_000, enabled: Boolean(courseId) });

  const q = enrolledQuery.trim().toLowerCase();
  const matchedGroupIds = useMemo(() => {
    if (!q || !roster) return null;
    return new Set(
      roster.groups
        .filter((g) => g.students.some((s) => s.fullName.toLowerCase().includes(q)))
        .map((g) => g.id),
    );
  }, [q, roster]);
  const visibleGroups = useMemo(() => {
    if (!roster) return [];
    if (!matchedGroupIds) return roster.groups;
    return roster.groups.filter((g) => matchedGroupIds.has(g.id));
  }, [roster, matchedGroupIds]);

  const isQuran = roster?.type === "quran";

  function removeStudent(group: RosterGroup, s: RosterStudent) {
    confirmToast({
      message: `إزالة ${s.fullName} من الفوج ${group.number}؟`,
      description: "سيتم إلغاء تسجيل التلميذ في هذه الدورة. لن يُحذف التلميذ من قائمة التلاميذ.",
      variant: "danger",
      confirmLabel: "إزالة",
      onConfirm: async () => {
        try {
          await rosterActions.removeEnrollment(s.enrollmentId);
          toast.success("تمت الإزالة");
          await reload();
        } catch { /* notice dialog already shown */ }
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">أفواج الدورات والتلاميذ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر دورة لعرض كل أفواجها وقائمة تلاميذها، وأضف أو أزل التلاميذ من كل فوج.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-center text-sm font-semibold">الدورة</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="block w-64 rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="" disabled>اختر الدورة</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <div className="flex flex-col items-start gap-1.5">
            <button
              onClick={() => setPrinting(true)}
              disabled={!roster}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> طباعة
            </button>
            <span className="text-xs text-muted-foreground">
              تحديث تلقائي · آخر تحديث: {formatRefreshTime(lastRefreshedAt)}
            </span>
          </div>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">جاري التحميل...</div>}

      {!loading && roster && (
        <>
          <section className="flex flex-wrap items-stretch gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-5 py-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </span>
              <h2 className="font-display text-xl font-bold text-primary">{roster.title}</h2>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-around gap-4">
              <SummaryCell
                icon={<Users className="h-6 w-6" />}
                label="الفئة المستهدفة"
                value={CATEGORY_LABEL[roster.category] ?? roster.category}
              />
              <Divider />
              <SummaryCell
                icon={<Users2 className="h-6 w-6" />}
                label="عدد الأفواج"
                value={String(roster.groups.length)}
              />
              <Divider />
              <SummaryCell
                icon={<User className="h-6 w-6" />}
                label="عدد التلاميذ"
                value={String(roster.groups.reduce((n, g) => n + g.students.length, 0))}
              />
            </div>
          </section>

          <div className="no-print">
            <SearchBox
              value={enrolledQuery}
              onChange={setEnrolledQuery}
              placeholder="ابحث عن تلميذ مسجّل لمعرفة فوجه..."
            />
            {q && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {visibleGroups.length === 0
                  ? "لا يوجد تلميذ مسجّل بهذا الاسم في هذه الدورة."
                  : `عدد الأفواج التي تحتوي على «${enrolledQuery.trim()}»: ${visibleGroups.length}`}
              </p>
            )}
          </div>

          {roster.groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              لا توجد أفواج في هذه الدورة. أضف فوجاً من صفحة «المستويات والمجموعات» أولاً.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map((g) => (
                <article key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users2 className="h-5 w-5" />
                      </span>
                      <h3 className="font-display text-lg font-bold">الفوج {g.number}</h3>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <Users2 className="h-4 w-4" />
                      {g.students.length} / {g.capacity}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4">
                    <button
                      onClick={() => setPicker(g)}
                      title="إضافة تلاميذ إلى هذا الفوج"
                      className="order-first flex items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 sm:order-last"
                    >
                      <Plus className="h-4 w-4" /> إضافة تلميذ
                    </button>
                    <dl className="flex flex-1 flex-wrap items-center justify-around gap-x-6 gap-y-3 text-sm">
                      <InfoCell icon={<User className="h-4 w-4" />} label="الأستاذ المسؤول" value={g.instructorName ?? "—"} />
                      <InfoCell icon={<CalendarDays className="h-4 w-4" />} label="الأيام" value={daysText(g)} />
                      <InfoCell icon={<Clock className="h-4 w-4" />} label="التوقيت" value={timeText(g)} />
                      <InfoCell icon={<DoorOpen className="h-4 w-4" />} label="القاعة" value={g.room ?? "—"} />
                      {isQuran
                        ? <InfoCell icon={<BookOpen className="h-4 w-4" />} label="عدد الأحزاب" value={String(g.hizbCount)} />
                        : <InfoCell icon={<BookOpen className="h-4 w-4" />} label="المستوى" value={g.levelName ?? "—"} />}
                    </dl>
                  </div>

                  {g.students.length === 0 ? (
                    <p className="p-5 text-sm text-muted-foreground">لا يوجد تلاميذ في هذا الفوج بعد.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 text-xs font-semibold text-foreground">
                        <tr>
                          <th className="w-12 px-4 py-2.5 text-start">#</th>
                          <th className="px-4 py-2.5 text-start">رقم الانخراط</th>
                          <th className="px-4 py-2.5 text-start">اسم التلميذ</th>
                          <th className="px-4 py-2.5 text-start">الهاتف</th>
                          <th className="w-16 px-4 py-2.5 text-start">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {g.students.map((s, i) => (
                          <tr
                            key={s.enrollmentId}
                            className={q && s.fullName.toLowerCase().includes(q) ? "bg-primary/10" : undefined}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.memberId ?? s.username ?? "—"}</td>
                            <td className="px-4 py-2.5 font-semibold">{s.fullName}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{s.phone ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => removeStudent(g, s)}
                                title="إزالة من الفوج"
                                className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {picker && roster && (
        <AddStudentsDialog
          courseId={roster.id}
          group={picker}
          onClose={() => setPicker(null)}
          onDone={async () => { setPicker(null); await reload(); markRefreshed(); }}
        />
      )}

      {printing && roster && (
        <PrintReport roster={roster} isQuran={isQuran} onClose={() => setPrinting(false)} />
      )}
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function SummaryCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-lg font-bold text-foreground">{value}</div>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-faint text-gold">
        {icon}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-10 w-px bg-border sm:block" />;
}

// -------------------- Add students --------------------
function AddStudentsDialog({
  courseId, group, onClose, onDone,
}: {
  courseId: string; group: RosterGroup; onClose: () => void; onDone: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Server-side exclusion: students already enrolled in THIS course (any group)
  // never appear here, since a student belongs to one group per course.
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      setLoading(true);
      try {
        const list = await rosterActions.availableStudents(courseId, query);
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) toast.error(`تعذّر تحميل التلاميذ: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [courseId, query]);

  const remaining = Math.max(0, group.capacity - group.students.length);
  const visibleIds = rows.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id)) && !allSelected;

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function submit(ids: string[], mode: ConflictMode) {
    if (ids.length === 0) return;
    setSaving(true);
    try {
      const res = await rosterActions.addStudentsWithMode(group.id, ids, mode);
      if (res.status === "conflict") {
        const conflicting = new Set(res.conflicts.map((c) => c.studentId));
        const rest = ids.filter((id) => !conflicting.has(id));
        noticeToast({
          variant: "warning",
          title: "تعارض في التوقيت",
          message: res.message,
          description:
            res.conflicts
              .map((c) => `${c.fullName}: ${c.conflicts.join(" ، ")}`)
              .join("\n") +
            (rest.length
              ? `\n\nيمكن إضافة ${rest.length} تلميذ بدون تعارض.`
              : "\n\nكل التلاميذ المختارين لديهم تعارض."),
          dismissLabel: "إلغاء",
          actions: [
            {
              label: "تجاهل التعارض وأضف الجميع",
              onClick: () => void submit(ids, "force"),
            },
            ...(rest.length
              ? [{
                  label: "أضف الباقي فقط",
                  style: "outline" as const,
                  onClick: () => void submit(rest, "force"),
                }]
              : []),
          ],
        });
        return;
      }
      toast.success(`تمت إضافة ${res.count} تلميذ إلى الفوج ${group.number}`);
      await onDone();
    } catch { /* notice dialog already shown; keep the dialog open */ }
    finally { setSaving(false); }
  }

  function confirm() {
    void submit([...selected], "check");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 truncate font-display text-xl font-bold">
              إضافة تلاميذ إلى الفوج {group.number}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-secondary p-1.5 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-7">
          {/* Info banner */}
          <div className="flex items-center gap-3 rounded-xl bg-gold-faint px-4 py-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-deep/15 text-green-deep">
              <Info className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 text-green-deep">
              الطاقة الاستيعابية المتبقية:{" "}
              <span className="font-bold">{remaining}</span>
              {" · "}لا تظهر هنا أسماء التلاميذ المسجّلين مسبقاً في هذه الدورة.
            </p>
          </div>

          {/* Search + total */}
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="ابحث عن تلميذ بالاسم أو رقم الهاتف..."
              className="min-w-[200px] flex-1"
            />
            <span className="ms-auto text-sm font-semibold text-muted-foreground">
              إجمالي التلاميذ: {rows.length}
            </span>
          </div>

          {/* Student table */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground">جاري التحميل...</p>
              ) : rows.length === 0 ? (
                <NoResults />
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-secondary/60 text-xs font-semibold text-foreground">
                    <tr>
                      <th className="w-12 px-4 py-3 text-start">#</th>
                      <th className="px-4 py-3 text-start">الاسم الكامل</th>
                      <th className="px-4 py-3 text-start">رقم الهاتف</th>
                      <th className="px-4 py-3 text-start">المعرف الوحيد</th>
                      <th className="w-12 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={toggleAll}
                          aria-label="تحديد الكل"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((p, i) => {
                      const on = selected.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => toggle(p.id)}
                          className={`cursor-pointer hover:bg-secondary/40 ${on ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold">{p.fullName}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {p.phone ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                              <BadgeCheck className="h-3.5 w-3.5 text-gold/80" />
                              {p.username ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-primary"
                              checked={on}
                              onChange={() => toggle(p.id)}
                              aria-label={`تحديد ${p.fullName}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              تم اختيار <span className="font-bold text-foreground">{selected.size}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:opacity-90"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                إضافة المحدَّدين ({selected.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- Printable report --------------------
function PrintReport({
  roster, isQuran, onClose,
}: {
  roster: CourseRoster; isQuran: boolean; onClose: () => void;
}) {
  const totalStudents = roster.groups.reduce((n, g) => n + g.students.length, 0);
  return (
    <PrintSheet
      title={roster.title}
      courseType={roster.type}
      onClose={onClose}
      stats={[
        { label: "الفئة المستهدفة", value: CATEGORY_LABEL[roster.category] ?? roster.category },
        { label: "عدد الأفواج", value: roster.groups.length },
        { label: "مجموع التلاميذ", value: totalStudents },
      ]}
    >
      {roster.groups.map((g) => (
        <section key={g.id} className="print-group">
          <PrintSectionTitle>الفوج {g.number}</PrintSectionTitle>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] border-y border-[#14321f]/15 text-center">
            {[
              { label: "الأستاذ المسؤول", value: g.instructorName ?? "—" },
              { label: "المستوى", value: g.levelName ?? "—" },
              { label: "الأيام", value: daysText(g) },
              { label: "التوقيت", value: timeText(g) },
              { label: "رقم القاعة", value: g.room ?? "—" },
              isQuran
                ? { label: "عدد الأحزاب", value: g.hizbCount }
                : { label: "عدد التلاميذ", value: g.students.length },
            ].map((c, i) => (
              <div key={c.label} className={`px-2 py-3 ${i > 0 ? "border-s border-[#14321f]/12" : ""}`}>
                <div className="text-[11px] text-[#14321f]/70">{c.label}</div>
                <div className="mt-1 text-sm font-semibold">{c.value}</div>
              </div>
            ))}
          </div>

          <PrintTable headers={["#", "المعرف الوحيد", "الاسم واللقب", "رقم الهاتف"]}>
            {g.students.length === 0 ? (
              <tr>
                <PrintTd>—</PrintTd><PrintTd>—</PrintTd>
                <PrintTd>لا يوجد تلاميذ في هذا الفوج</PrintTd><PrintTd>—</PrintTd>
              </tr>
            ) : g.students.map((s, i) => (
              <tr key={s.enrollmentId}>
                <PrintTd>{i + 1}</PrintTd>
                <PrintTd className="font-mono">{s.memberId ?? s.username}</PrintTd>
                <PrintTd>{s.fullName}</PrintTd>
                <PrintTd>{s.phone ?? "—"}</PrintTd>
              </tr>
            ))}
          </PrintTable>
        </section>
      ))}
    </PrintSheet>
  );
}

