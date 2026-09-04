import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  BookOpenCheck,
  CalendarRange,
  Newspaper,
  Wallet,
  LogOut,
  Menu,
  ShieldCheck,
  Trophy,
  Camera,
  Inbox,
  Users2,
  ClipboardList,
  CalendarCheck,
  FileQuestion,
  BarChart3,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { listRegistrationRequests } from "@/lib/registration-requests";
import { noticeToast } from "@/lib/notice-toast";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "فضاء الإدارة — فرع سيدي الهاني" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

type AdminNavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  exact?: boolean;
  badge?: "pending";
  soon?: boolean;
};

const DASHBOARD: AdminNavItem = {
  label: "لوحة القيادة",
  icon: LayoutDashboard,
  to: "/admin",
  exact: true,
};

const ADMIN_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "الإدارة الأساسية",
    items: [
      {
        label: "طلبات التسجيل",
        icon: Inbox,
        to: "/admin/registration-requests",
        badge: "pending" as const,
      },
      { label: "الهيئة التسييرية", icon: ShieldCheck, to: "/admin/board" },
      { label: "المعلمون", icon: GraduationCap, to: "/admin/instructors" },
      { label: "التلاميذ", icon: Users, to: "/admin/students" },
      { label: "المواسم الدراسية", icon: CalendarRange, to: "/admin/seasons" },
      { label: "الدورات", icon: BookOpen, to: "/admin/courses" },
      { label: "المستويات والمجموعات", icon: Users2, to: "/admin/groups" },
      { label: "أفواج الدورات والتلاميذ", icon: ClipboardList, to: "/admin/course-groups" },
    ],
  },
  {
    title: "العمليات والمتابعة",
    items: [
      { label: "الحضور والغياب", icon: CalendarCheck, to: "", soon: true },
      { label: "متابعة الحفظ", icon: BookOpenCheck, to: "", soon: true },
      { label: "الاختبارات", icon: FileQuestion, to: "", soon: true },
      { label: "المسابقات", icon: Trophy, to: "/admin/competitions" },
      { label: "الأخبار", icon: Newspaper, to: "/admin/news" },
      { label: "معرض الصور", icon: Camera, to: "/admin/gallery" },
    ],
  },
  {
    title: "المالية والتقارير",
    items: [
      { label: "المالية", icon: Wallet, to: "/admin/finance" },
      { label: "التقارير والإحصائيات", icon: BarChart3, to: "", soon: true },
    ],
  },
];

function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let cancelled = false;
    async function refresh() {
      try {
        const rows = await listRegistrationRequests("pending");
        if (!cancelled) setPendingCount(rows.length);
      } catch {
        // silent — badge just stays at its previous value
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user, pathname]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/admin-access" });
    else if (!loading && user && user.role !== "admin") navigate({ to: "/" });
  }, [user, loading, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="container-page py-20 text-center text-muted-foreground">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  function isActive(item: AdminNavItem) {
    if (item.soon) return false;
    if (item.exact) return pathname === item.to;
    return pathname.startsWith(item.to);
  }

  function NavItem({ item }: { item: AdminNavItem }) {
    const Icon = item.icon;
    const active = isActive(item);
    const showBadge = item.badge === "pending" && pendingCount > 0;

    if (item.soon) {
      return (
        <button
          onClick={() =>
            noticeToast({
              title: "قريباً",
              message: "هذه الميزة قيد الإنشاء",
              variant: "info",
            })
          }
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground opacity-60 transition-colors hover:bg-muted/50"
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-start">{item.label}</span>
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            قريباً
          </span>
        </button>
      );
    }

    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-primary text-primary-foreground shadow-soft"
            : "text-foreground/80 hover:bg-secondary"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1">{item.label}</span>
        {showBadge && (
          <span
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              active
                ? "bg-primary-foreground text-primary"
                : "bg-destructive text-white"
            }`}
          >
            {pendingCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="bg-surface">
      <div className="container-page py-6">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"
          >
            <Menu className="h-4 w-4" />
            القائمة
          </button>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-4 rounded-xl bg-hero p-4 text-primary-foreground">
                <div className="text-xs opacity-80">مرحبا</div>
                <div className="font-display text-lg font-bold">{user.fullName}</div>
                <div className="mt-1 text-xs opacity-80">@{user.username}</div>
              </div>

              <nav className="space-y-5">
                <NavItem item={DASHBOARD} />

                {ADMIN_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 pb-1 text-xs font-bold text-muted-foreground">
                      {group.title}
                    </div>
                    {group.items.map((item) => (
                      <NavItem key={item.label} item={item} />
                    ))}
                  </div>
                ))}
              </nav>

              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="mt-4 hidden w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 lg:flex"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </aside>

          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
