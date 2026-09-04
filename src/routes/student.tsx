import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "فضاء التلميذ — فرع سيدي الهاني" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentSpace,
});

function StudentSpace() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      navigate({ to: "/login", search: { role: "student" } });
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "student") {
    return (
      <div className="container-page py-20 text-center text-muted-foreground">
        جاري التحقق...
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-hero text-primary-foreground">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">مرحبا {user.fullName}</h1>
        <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">🛠️ هذا الفضاء في طور الصيانة</p>
          <p className="mt-1 text-sm opacity-90">
            نعمل حاليا على تطوير فضاء التلميذ. سيكون متاحا قريبا بإذن الله.
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
            الصفحة الرئيسية
          </Link>
          <button
            onClick={() => { logout(); navigate({ to: "/" }); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
