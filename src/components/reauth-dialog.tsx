import { useEffect, useState } from "react";
import { LogIn, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { SESSION_EXPIRED_EVENT, resetSessionExpiredFlag } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Part 28/5b — expired session never destroys unsaved form data: instead of
 * navigating to /login, we ask for the password in place and swap the token.
 */
export function ReauthDialog() {
  const { user, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handler() { setOpen(true); }
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, []);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await login(user.username, password);
      resetSessionExpiredFlag();
      setPassword("");
      setOpen(false);
      toast.success("تم تجديد الجلسة، يمكنك المتابعة من حيث توقفت");
    } catch (err) {
      toast.error((err as Error).message || "كلمة المرور غير صحيحة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-border bg-card shadow-2xl">
        <div className="p-7 text-center sm:p-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold sm:text-2xl">انتهت صلاحية الجلسة</h2>
          <p className="mt-3 text-base font-medium leading-relaxed">
            انتهت صلاحية الجلسة بسبب عدم النشاط. الرجاء إعادة تسجيل الدخول للمتابعة.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            بياناتك المكتوبة في الصفحة محفوظة كما هي — بعد تسجيل الدخول ستتابع من نفس المكان.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3 text-start">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">اسم المستخدم</span>
              <input
                value={user?.username ?? ""}
                readOnly
                dir="ltr"
                className="block w-full rounded-lg border border-input bg-secondary/50 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">كلمة المرور</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                dir="ltr"
                className="block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setOpen(false); logout("expired"); }}
                className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold hover:bg-secondary"
              >
                تسجيل الخروج
              </button>
              <button
                type="submit"
                disabled={submitting || !password}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                متابعة
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
