import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Users,
  GraduationCap,
  Layers,
  Sun,
  Newspaper,
  Trophy,
  CalendarDays,
  BookOpen,
  Award,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAutoRefresh, formatRefreshTime } from "@/hooks/use-auto-refresh";
import { useDashboardData, type DashboardData } from "@/lib/dashboard-store";
import { useSeasonsStore } from "@/lib/seasons-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة القيادة — إدارة فرع سيدي الهاني" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const CATEGORY_LABEL: Record<string, string> = {
  children: "أطفال",
  women: "نساء",
  men: "رجال",
  training: "تكوين معلمين",
  summer: "دورة صيفية",
};

const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return AR_DAYS[d.getUTCDay()];
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return d.toLocaleDateString("ar-TN", { day: "numeric", month: "long", year: "numeric" });
}

function AdminDashboard() {
  const { data, loading, error, reload } = useDashboardData();
  const seasons = useSeasonsStore();
  const activeSeason = seasons.find((s) => s.isActive);
  // Part 28/4 — no manual "تحديث" button; refresh on focus + every 45s.
  const { lastRefreshedAt } = useAutoRefresh(reload, { intervalMs: 45_000 });

  const cards = [
    { label: "إجمالي الطلاب", value: data?.students ?? 0, icon: Users, accent: "bg-primary/10 text-primary" },
    { label: "إجمالي المعلمين", value: data?.instructors ?? 0, icon: GraduationCap, accent: "bg-secondary text-secondary-foreground" },
    { label: "الحلقات النشطة", value: data?.activeGroups ?? 0, icon: Layers, accent: "bg-gold/15 text-gold-foreground" },
    { label: "الدورات الصيفية النشطة", value: data?.activeSummerCourses ?? 0, icon: Sun, accent: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <div className="text-center">
          {activeSeason ? (
            <h1 className="font-display text-3xl font-bold text-gold-foreground">
              {activeSeason.name}
            </h1>
          ) : (
            <h1 className="font-display text-3xl font-bold text-muted-foreground">—</h1>
          )}
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          <div className="text-start">
            <h2 className="font-display text-2xl font-bold text-foreground">لوحة القيادة</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              كل الأرقام أدناه محسوبة من بيانات الفرع الفعلية.
            </p>
          </div>
          <div />
          <div className="text-end">
            <span className="text-xs text-muted-foreground">
              آخر تحديث: {formatRefreshTime(lastRefreshedAt)} — تحديث تلقائي
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          تعذّر تحميل بيانات اللوحة: {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-2xl font-bold text-foreground">{loading ? "…" : s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <StudentsChart data={data} className="lg:col-span-2" />
        <UpcomingActivities data={data} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <MemorizationDonut data={data} />
        <TopStudents data={data} />
        <LatestGroups data={data} />
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  icon: typeof Users;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-soft ${className}`}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Icon className="h-4 w-4 text-gold" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function StudentsChart({ data, className }: { data: DashboardData | null; className?: string }) {
  const rows = useMemo(
    () => (data?.series ?? []).map((p) => ({ ...p, label: dayLabel(p.day) })),
    [data],
  );
  const hasAny = rows.some((r) => r.attendanceRecorded > 0 || r.newStudents > 0 || r.memorized > 0);

  return (
    <Panel title="إحصائيات الطلاب — آخر 7 أيام" icon={BookOpen} className={className}>
      {!hasAny ? (
        <Empty>لا توجد بيانات مسجّلة في الأيام السبعة الأخيرة (حضور، التحاق، أو حفظ).</Empty>
      ) : (
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} reversed />
              <YAxis tick={{ fontSize: 12 }} orientation="right" />
              <Tooltip
                contentStyle={{ direction: "rtl", background: "var(--card)", borderColor: "var(--border)", borderRadius: 12 }}
              />
              <Legend wrapperStyle={{ direction: "rtl", fontSize: 12 }} />
              <Line type="monotone" dataKey="attendanceRate" name="الحضور (%)" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="newStudents" name="المنتسبون الجدد" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="memorized" name="المحفوظ (أحزاب)" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function UpcomingActivities({ data }: { data: DashboardData | null }) {
  const items = data?.upcoming ?? [];
  return (
    <Panel title="الأنشطة القادمة" icon={CalendarDays}>
      {items.length === 0 ? (
        <Empty>لا توجد أنشطة قادمة مسجّلة بتاريخ.</Empty>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const isNews = a.kind === "news";
            const Icon = isNews ? Newspaper : Trophy;
            return (
              <li key={`${a.kind}-${a.id}`} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isNews ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDate(a.date)}
                    {a.subtitle ? ` — ${a.subtitle}` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{isNews ? "خبر / مناسبة" : "مسابقة"}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function MemorizationDonut({ data }: { data: DashboardData | null }) {
  const m = data?.memorization;
  const rows = [
    { name: "تم الحفظ", value: m?.completed ?? 0, color: "var(--primary)" },
    { name: "قيد الحفظ", value: m?.inProgress ?? 0, color: "var(--gold)" },
    { name: "لم يبدأ", value: m?.notStarted ?? 0, color: "var(--muted-foreground)" },
  ];
  const total = m?.total ?? 0;

  return (
    <Panel title="نسبة الحفظ" icon={Award}>
      {total === 0 ? (
        <Empty>لا توجد تسجيلات في دورات التحفيظ بعد.</Empty>
      ) : (
        <>
          <div className="h-52 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
                  {rows.map((r) => (
                    <Cell key={r.name} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ direction: "rtl", background: "var(--card)", borderColor: "var(--border)", borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="font-semibold text-foreground">
                  {r.value} ({total > 0 ? Math.round((r.value / total) * 100) : 0}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function TopStudents({ data }: { data: DashboardData | null }) {
  const rows = data?.topStudents ?? [];
  return (
    <Panel title="أفضل الطلاب" icon={Trophy}>
      {rows.length === 0 ? (
        <Empty>لم يُسجَّل أي حزب محفوظ بعد.</Empty>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{s.fullName}</span>
              <span className="text-xs font-semibold text-muted-foreground">{s.hizbCompleted} حزب</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function LatestGroups({ data }: { data: DashboardData | null }) {
  const rows = data?.latestGroups ?? [];
  return (
    <Panel title="الحلقات الأخيرة" icon={Layers}>
      {rows.length === 0 ? (
        <Empty>لا توجد أفواج بعد.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((g) => (
            <li key={g.id}>
              <Link
                to="/admin/course-groups"
                search={{ courseId: g.courseId }}
                className="block rounded-xl border border-border/60 p-3 transition hover:border-gold hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {g.courseTitle} — الفوج {g.number}
                  </span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {CATEGORY_LABEL[g.category] ?? g.category}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  المعلّم: {g.instructorName ?? "غير محدّد"} • التلاميذ: {g.studentCount}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
