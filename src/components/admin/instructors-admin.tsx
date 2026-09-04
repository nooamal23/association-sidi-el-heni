// Part 52 — المعلمون page, using the same visual system as التلاميذ
// (header + search + stat cards + 2-column person cards + pagination),
// with instructor-appropriate fields only (no courses/enrollment).
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  UserPlus,
  Pencil,
  Trash2,
  IdCard,
  Users,
  UserCheck,
  UserX,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { formatArabicDate, formatSimpleDate } from "@/lib/utils";
import { confirmToast } from "@/lib/confirm-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { CredentialCard } from "@/components/admin/credential-card";
import { useLevelsGroups } from "@/lib/levels-groups-store";
import {
  StatCard,
  PersonAvatar,
  FieldRow,
  StatusBadge,
  Pagination,
  usePagination,
} from "@/components/admin/admin-list-kit";
import { usePeopleStore, peopleActions, type Person } from "@/lib/people-store";

export function InstructorsAdmin() {
  const { people } = usePeopleStore();
  const { groups } = useLevelsGroups();

  const instructors = useMemo(
    () => people.filter((p) => p.role === "instructor"),
    [people],
  );

  const groupsByInstructor = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of groups) {
      if (!g.instructorId) continue;
      map.set(g.instructorId, (map.get(g.instructorId) ?? 0) + 1);
    }
    return map;
  }, [groups]);

  const { query, setQuery, filtered } = useLiveSearch(instructors, [
    (p) => p.fullName,
    (p) => p.memberId ?? "",
    (p) => p.username,
    (p) => p.phone,
  ]);

  const pager = usePagination(filtered, 8);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [viewingCred, setViewingCred] = useState<Person | null>(null);

  const total = instructors.length;
  // نشط = مُسند إلى دورة (أو فوج)، غير نشط = غير مرسّم في أي دورة.
  const isTeaching = (p: Person) =>
    (p.courseIds?.length ?? 0) > 0 || (groupsByInstructor.get(p.id) ?? 0) > 0;
  const activeCount = instructors.filter(isTeaching).length;
  const withoutGroup = instructors.filter(
    (p) => (groupsByInstructor.get(p.id) ?? 0) === 0,
  ).length;
  const assignedGroups = instructors.reduce(
    (sum, p) => sum + (groupsByInstructor.get(p.id) ?? 0),
    0,
  );

  function remove(p: Person) {
    confirmToast({
      message: `حذف ${p.fullName}؟`,
      description: "لا يمكن التراجع عن هذا الإجراء.",
      onConfirm: () => {
        peopleActions.remove(p.id);
        toast.success(`تم حذف ${p.fullName}`);
      },
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-primary" /> المعلمون
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة المعلمين والمعلمات والأفواج المُسندة إليهم.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" /> إضافة معلم
        </button>
      </header>

      <SearchBox
        value={query}
        onChange={(v) => {
          setQuery(v);
          pager.setPage(1);
        }}
        placeholder="ابحث عن معلم (الاسم، المعرف، الهاتف)..."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} value={total} label="إجمالي المعلمين" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} value={activeCount} label="معلمون نشطون" />
        <StatCard icon={<UserX className="h-5 w-5" />} value={withoutGroup} label="معلمون بدون فوج مُسند" />
        <StatCard icon={<Layers className="h-5 w-5" />} value={assignedGroups} label="الأفواج المُسندة إجمالياً" />
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا يوجد معلم حاليا. اضغط "إضافة معلم" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {pager.slice.map((p) => {
              const groupCount = groupsByInstructor.get(p.id) ?? 0;
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start gap-4">
                    <PersonAvatar name={p.fullName} url={p.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-bold text-foreground">
                              {p.fullName}
                            </h3>
                            <StatusBadge active={isTeaching(p)} />
                          </div>
                          {p.memberId && (
                            <span
                              className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary"
                              dir="ltr"
                            >
                              {p.memberId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setViewingCred(p)}
                            className="rounded-md border border-primary/30 bg-primary/5 p-1.5 text-primary hover:bg-primary/10"
                            title="بطاقة الاعتماد"
                          >
                            <IdCard className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                            className="rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-secondary"
                            title="تعديل"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(p)}
                            className="rounded-md border border-destructive/30 bg-background p-1.5 text-destructive hover:bg-destructive/10"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <FieldRow label="الهاتف" value={p.phone || "—"} />
                        <FieldRow
                          label="تاريخ الميلاد"
                          value={p.birthDate ? formatArabicDate(p.birthDate) : "—"}
                        />
                        <FieldRow
                          label="تاريخ الانضمام"
                          value={p.createdAt ? formatSimpleDate(p.createdAt) : "—"}
                        />
                      </dl>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      الأفواج الحالية:{" "}
                      <span className="font-semibold text-foreground">{groupCount}</span>
                    </span>
                    <Link
                      to="/admin/course-groups"
                      search={{ courseId: undefined }}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      عرض الأفواج <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            page={pager.page}
            pageCount={pager.pageCount}
            from={pager.from}
            to={pager.to}
            total={pager.total}
            noun="معلم"
            onPage={pager.setPage}
          />
        </>
      )}

      {open && (
        <PersonFormDialog role="instructor" editing={editing} onClose={() => setOpen(false)} />
      )}
      {viewingCred && (
        <CredentialCard
          cred={{
            fullName: viewingCred.fullName,
            username: viewingCred.username,
            password: viewingCred.password || "••••••",
            role: viewingCred.role,
          }}
          onClose={() => setViewingCred(null)}
        />
      )}
    </div>
  );
}
