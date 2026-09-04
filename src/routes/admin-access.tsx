import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { noticeToast } from "@/lib/notice-toast";
import { HAS_API } from "@/lib/api";

export const Route = createFileRoute("/admin-access")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة — فرع سيدي الهاني" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    if (user?.role === "admin") navigate({ to: "/admin" });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(username.trim(), password);
      if (u.role !== "admin") {
        logout();
        noticeToast({
          variant: "error",
          title: "وصول مرفوض",
          message: "هذا الفضاء مخصص لإدارة الفرع فقط.",
        });
        return;
      }
      navigate({ to: "/admin" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر تسجيل الدخول";
      noticeToast({
        variant: "error",
        title: "فشل في تسجيل الدخول",
        message,
        description: "تأكّد من اسم المستخدم وكلمة المرور الخاصّة بالإدارة.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-foreground/[0.03]">
      <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-soft">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
              دخول الإدارة
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              فضاء محمي مخصص لمسؤولي الفرع.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                اسم المستخدم
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pl-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute inset-y-0 left-2 flex items-center rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-soft transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              دخول الإدارة
            </button>

            {!HAS_API && (
              <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <div className="font-semibold text-foreground">وضع تجريبي:</div>
                <code className="rounded bg-background px-1">admin / admin1234</code>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← العودة إلى الموقع العام</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
