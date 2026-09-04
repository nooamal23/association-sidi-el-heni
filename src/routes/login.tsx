import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Loader2, GraduationCap, BookOpenCheck, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { noticeToast } from "@/lib/notice-toast";

import { ArabicDateInput } from "@/components/ui/arabic-date-input";


const searchSchema = z.object({
  role: z.enum(["student", "instructor"]),
});

const ROLE_META = {
  student: {
    title: "فضاء التلميذ",
    description: "دخول الطلبة لمتابعة حصصهم، حضورهم وتقييماتهم.",
    icon: GraduationCap,
    expectedRole: "student" as const,
    landing: "/student",
  },
  instructor: {
    title: "فضاء المعلم",
    description: "دخول المعلمين لإدارة الحصص، الحضور والتقييمات.",
    icon: BookOpenCheck,
    expectedRole: "instructor" as const,
    landing: "/instructor",
  },
};

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.role) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "دخول الأعضاء — فرع سيدي الهاني" },
      { name: "description", content: "دخول الأعضاء إلى فضائهم الخاص." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { role } = Route.useSearch() as { role: keyof typeof ROLE_META };
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    if (user && user.role === meta.expectedRole) {
      navigate({ to: meta.landing });
    }
  }, [user, meta, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(username.trim(), password);
      if (u.role !== meta.expectedRole) {
        logout();
        noticeToast({
          variant: "error",
          title: "لا يمكن الدخول",
          message: `هذا الفضاء مخصص لـ${meta.title} فقط.`,
        });
        return;
      }
      navigate({ to: meta.landing });
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر تسجيل الدخول";
      noticeToast({
        variant: "error",
        title: "فشل في تسجيل الدخول",
        message,
        description: "تأكّد من اسم المستخدم وكلمة المرور، ثم أعد المحاولة.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-hero min-h-[calc(100vh-4rem)]">
      <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hero text-primary-foreground shadow-soft">
              <Icon className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
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
                {role === "student" ? "كلمة المرور (تاريخ الولادة)" : "كلمة المرور"}
              </label>
              {role === "student" ? (
                <>
                  <ArabicDateInput
                    value={password}
                    onChange={setPassword}
                    required
                    placeholder="اختر تاريخ ولادتك"
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    اختر يوم وشهر وسنة ولادتك من الرزنامة.
                  </p>
                </>
              ) : (
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
              )}
            </div>


            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              تسجيل الدخول
            </button>

            <div className="flex items-center justify-center gap-3 text-xs">
              {role === "student" ? (
                <Link
                  to="/login"
                  search={{ role: "instructor" }}
                  className="text-muted-foreground hover:text-primary"
                >
                  ← دخول كمعلم
                </Link>
              ) : (
                <Link
                  to="/login"
                  search={{ role: "student" }}
                  className="text-muted-foreground hover:text-primary"
                >
                  ← دخول كتلميذ
                </Link>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-1 font-semibold text-foreground">كيف يمكنني الدخول؟</div>
              {role === "student" ? (
                <p>
                  بيانات الدخول (اسم المستخدم وكلمة المرور) تُسلَّم لك من طرف إدارة الفرع
                  بعد تسجيلك في إحدى الدورات. إذا نسيت بياناتك، يرجى التواصل مع الإدارة
                  مباشرة أو عبر صفحة <Link to="/about" className="text-primary hover:underline">عن الفرع</Link>.
                </p>
              ) : (
                <p>
                  بيانات الدخول تُسلَّم للمعلمين من طرف إدارة الفرع. للاستفسار أو إعادة
                  ضبط كلمة المرور، يرجى التواصل مع الإدارة.
                </p>
              )}
              {role === "student" && (
                <div className="mt-2 border-t border-border/60 pt-2 text-[11px]">
                  كلمة المرور الافتراضية هي <span className="font-semibold text-foreground">تاريخ ولادتك</span>.
                </div>
              )}

            </div>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← العودة إلى الموقع العام</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
