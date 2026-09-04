// Part 53 — التلاميذ page aligned with the المعلمون / الهيئة التسييرية design
// (header + search + stat cards + person cards + pagination). "نشط" here means
// the student is enrolled in at least one active course.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  Pencil,
  Trash2,
  Archive,
  IdCard,
  FolderOpen,
  GraduationCap,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatArabicDate, formatSimpleDate } from "@/lib/utils";
import { confirmToast } from "@/lib/confirm-toast";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import { PersonFormDialog } from "@/components/admin/person-form-dialog";
import { CredentialCard } from "@/components/admin/credential-card";
import { StudentProfileDialog } from "@/components/admin/student-profile-dialog";
import {
  StatCard,
  PersonAvatar,
  FieldRow,
  Pagination,
  usePagination,
} from "@/components/admin/admin-list-kit";

import {
  usePeopleStore,
  peopleActions,
  splitCourses,
  type Person,
  type Role,
} from "@/lib/people-store";

export function PeopleAdmin({ role }: { role: Role }) {
  const { people, courses } = usePeopleStore();

  const list = useMemo(() => people.filter((p) => p.role === role), [people, role]);

  // Precompute course split once per person — used by stats, badges and cards.
  const splitById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof splitCourses>>();
    for (const p of list) map.set(p.id, splitCourses(p, courses));
    return map;
  }, [list, courses]);

  const enrolledCount = useMemo(() => {
    let n = 0;
    for (const p of list) if ((splitById.get(p.id)?.active.length ?? 0) > 0) n += 1;
    return n;
  }, [list, splitById]);

  const { query, setQuery, filtered } = useLiveSearch(list, [
    (p) => p.fullName,
    (p) => p.username,
    (p) => p.phone,
    (p) => p.memberId ?? "",
  ]);

  const pager = usePagination(filtered, 8);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [viewingCred, setViewingCred] = useState<Person | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Person | null>(null);

  const title = role === "instructor" ? "المعلمون" : "التلاميذ";
  const singular = role === "instructor" ? "معلم" : "تلميذ";
  const desc =
    role === "instructor"
      ? "إدارة المعلمين والمعلمات ومسؤولياتهم على الدورات."
      : "إدارة التلاميذ وتسجيلهم في الدورات.";

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
            <GraduationCap className="h-6 w-6 text-primary" /> {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" /> إضافة {singular}
        </button>
      </header>

      <SearchBox
        value={query}
        onChange={(v) => {
          setQuery(v);
          pager.setPage(1);
        }}
        placeholder={`ابحث عن ${singular} (الاسم، المعرف، الهاتف)...`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          value={list.length}
          label={`إجمالي ${role === "instructor" ? "المعلمين" : "التلاميذ"}`}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          value={enrolledCount}
          label="التلاميذ المسجلون في الدورات"
        />
        <StatCard
          icon={<UserX className="h-5 w-5" />}
          value={list.length - enrolledCount}
          label="غير مسجلين في الدورات"
        />
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا يوجد {singular} حاليا. اضغط "إضافة {singular}" للبدء.
        </div>
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {pager.slice.map((p) => {
              const { active, archived } = splitById.get(p.id) ?? {
                active: [],
                archived: [],
              };
              const enrolled = active.length > 0;
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
                            <EnrollmentBadge enrolled={enrolled} />
                          </div>
                          {(p.memberId ?? p.username) && (
                            <span
                              className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary"
                              dir="ltr"
                            >
                              {p.memberId ?? p.username}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {role === "student" && (
                            <button
                              onClick={() => setViewingProfile(p)}
                              className="rounded-md border border-primary/30 bg-primary/5 p-1.5 text-primary hover:bg-primary/10"
                              title="ملف التلميذ (الأشهر المُخلَّصة)"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                            </button>
                          )}
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
                        {role === "student" && (
                          <FieldRow
                            label="المجموعة"
                            value={
                              p.groupNumber
                                ? `مجموعة ${p.groupNumber}${p.groupLevelName ? ` — ${p.groupLevelName}` : ""}`
                                : "بدون مجموعة"
                            }
                          />
                        )}
                        <FieldRow
                          label="تاريخ التسجيل"
                          value={p.createdAt ? formatSimpleDate(p.createdAt) : "—"}
                        />
                      </dl>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <CoursePills
                      label="الدورات الحالية"
                      items={active.map((c) => c.title)}
                      tone="active"
                    />
                    {archived.length > 0 && (
                      <CoursePills
                        label="الأرشيف"
                        items={archived.map((c) => c.title)}
                        tone="archived"
                        icon={<Archive className="h-3 w-3" />}
                      />
                    )}
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
            noun={singular}
            onPage={pager.setPage}
          />
        </>
      )}

      {open && (
        <PersonFormDialog role={role} editing={editing} onClose={() => setOpen(false)} />
      )}
      {viewingCred && (
        <CredentialCard
          cred={{
            fullName: viewingCred.fullName,
            username: viewingCred.username,
            password:
              viewingCred.role === "student"
                ? viewingCred.birthDate
                : viewingCred.password || "••••••",
            role: viewingCred.role,
          }}
          onClose={() => setViewingCred(null)}
        />
      )}
      {viewingProfile && (
        <StudentProfileDialog
          student={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}

/** نشط = مرسّم في دورة نشطة، غير نشط = غير مرسّم في أي دورة. */
function EnrollmentBadge({ enrolled }: { enrolled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        enrolled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${enrolled ? "bg-primary" : "bg-muted-foreground"}`}
      />
      {enrolled ? "نشط" : "غير نشط"}
    </span>
  );
}

function CoursePills({
  label,
  items,
  tone,
  icon,
}: {
  label: string;
  items: string[];
  tone: "active" | "archived";
  icon?: React.ReactNode;
}) {
  const pillClass =
    tone === "active"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground line-through";
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
        {icon} {label}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">—</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <span
              key={t}
              title={t}
              className={`inline-block max-w-full whitespace-normal break-words rounded-2xl px-2.5 py-1 text-xs font-medium leading-snug ${pillClass}`}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
