import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X, ChevronDown, GraduationCap, BookOpenCheck, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../lib/auth";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";
import { ConfirmDialog } from "../components/confirm-dialog";
import { NoticeDialog } from "../components/notice-dialog";
import { ReauthDialog } from "../components/reauth-dialog";
import logoPng from "../assets/logo.png";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/courses", label: "الدورات" },
  { to: "/register", label: "التسجيل" },
  { to: "/news", label: "الأخبار والمناسبات" },
  { to: "/competitions", label: "المسابقات" },
  { to: "/gallery", label: "المعرض" },
  { to: "/about", label: "عن الفرع" },
] as const;

function MemberLoginMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (user) {
    const landing =
      user.role === "admin" ? "/admin" : user.role === "instructor" ? "/instructor" : "/student";
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-soft hover:bg-secondary"
        >
          <UserIcon className="h-4 w-4 text-primary" />
          <span className="max-w-[10rem] truncate">{user.fullName}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
            <Link
              to={landing}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <UserIcon className="h-4 w-4 text-primary" />
              فضائي
            </Link>
            <button
              onClick={() => { setOpen(false); onNavigate?.(); logout("manual"); }}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-start text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
      >
        دخول الأعضاء
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          <Link
            to="/login"
            search={{ role: "student" }}
            onClick={() => { setOpen(false); onNavigate?.(); }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <GraduationCap className="h-4 w-4 text-primary" />
            فضاء التلميذ
          </Link>
          <Link
            to="/login"
            search={{ role: "instructor" }}
            onClick={() => { setOpen(false); onNavigate?.(); }}
            className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <BookOpenCheck className="h-4 w-4 text-primary" />
            فضاء المعلم
          </Link>
        </div>
      )}
    </div>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-page grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:h-20 sm:gap-4 md:h-24 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4">
          <img
            src={logoPng}
            alt="شعار الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني"
            className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-bold text-foreground sm:text-base md:text-lg">
              فرع سيدي الهاني
            </div>
            <div className="truncate text-[10px] text-muted-foreground sm:text-[11px] md:text-xs">
              الرابطة الوطنية للقرآن الكريم
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <MemberLoginMenu />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md p-2 text-foreground hover:bg-secondary lg:hidden"
          aria-label="القائمة"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-secondary"
                activeProps={{ className: "bg-secondary text-primary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                search={{ role: "student" }}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                <GraduationCap className="h-4 w-4" />
                فضاء التلميذ
              </Link>
              <Link
                to="/login"
                search={{ role: "instructor" }}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                <BookOpenCheck className="h-4 w-4" />
                فضاء المعلم
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-4">
            <img
              src={logoPng}
              alt="شعار الفرع"
              className="h-20 w-20 md:h-24 md:w-24 shrink-0 object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-base md:text-lg font-bold">فرع سيدي الهاني</div>
              <div className="text-xs md:text-sm text-muted-foreground">
                الرابطة الوطنية للقرآن الكريم
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            فرع محلي يعمل على تحفيظ القرآن الكريم وتكوين المعلمين وتنظيم
            المسابقات والمناسبات الدينية بسيدي الهاني.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">روابط سريعة</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground">معلومات الاتصال</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>المقر: سيدي الهاني، تونس</li>
            <li>التسجيل في الدورات حضوريا بمقر الفرع</li>
            <li>أوقات العمل: حسب جدول الحصص</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني
        </div>
      </div>
    </footer>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          الصفحة غير موجودة
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          حدث خطأ غير متوقع
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          جرّب تحديث الصفحة أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "فرع سيدي الهاني — الرابطة الوطنية للقرآن الكريم" },
      {
        name: "description",
        content:
          "البوابة الرسمية لفرع سيدي الهاني: دورات تحفيظ القرآن، أخبار، مناسبات دينية، ونتائج المسابقات.",
      },
      { name: "author", content: "فرع سيدي الهاني" },
      { property: "og:title", content: "فرع سيدي الهاني — الرابطة الوطنية للقرآن الكريم" },
      {
        property: "og:description",
        content: "البوابة الرسمية لفرع سيدي الهاني: دورات تحفيظ القرآن، أخبار، مناسبات دينية، ونتائج المسابقات.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ar_TN" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "فرع سيدي الهاني — الرابطة الوطنية للقرآن الكريم" },
      { name: "twitter:description", content: "البوابة الرسمية لفرع سيدي الهاني: دورات تحفيظ القرآن، أخبار، مناسبات دينية، ونتائج المسابقات." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/fb49e7e4-d960-44f0-bf17-bbcdc647ab0c" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/fb49e7e4-d960-44f0-bf17-bbcdc647ab0c" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <Toaster richColors position="top-center" dir="rtl" />
        <ConfirmDialog />
        <NoticeDialog />
        <ReauthDialog />
      </AuthProvider>
    </QueryClientProvider>
  );
}
