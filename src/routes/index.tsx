import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BookOpen, Calendar, Trophy, Users, ArrowLeft, MapPin } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/mock-data";
import { useNewsStore } from "@/lib/news-store";
import { usePeopleStore } from "@/lib/people-store";
import { useContentStore, hasResults } from "@/lib/content-store";
import { toPublicCourse } from "@/lib/course-view";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "فرع سيدي الهاني — الرابطة الوطنية للقرآن الكريم" },
      {
        name: "description",
        content:
          "البوابة الرسمية لفرع سيدي الهاني: دورات تحفيظ القرآن، أخبار، مناسبات دينية، ونتائج المسابقات.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { courses, people } = usePeopleStore();
  const { news } = useNewsStore();
  const { competitions } = useContentStore();
  const publicCourses = useMemo(
    () => courses.map((c) => toPublicCourse(c, people)),
    [courses, people],
  );
  const featuredCourses = publicCourses.slice(0, 3);
  const latestNews = news.slice(0, 3);
  const mainComp = competitions.find(hasResults);
  const passRate =
    mainComp && mainComp.participants > 0
      ? Math.round((mainComp.passed / mainComp.participants) * 100)
      : 0;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-15 pattern-arabesque" aria-hidden />
        <div className="container-page relative grid gap-10 py-20 md:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              فرع محلي — سيدي الهاني
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              في رحاب القرآن الكريم
              <br />
              <span className="text-gold">نتعلّم، نُكوّن، ونتنافس</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              منصة فرع سيدي الهاني التابع للرابطة الوطنية للقرآن الكريم: دورات
              تحفيظ لكل الفئات، تكوين للمعلمين، ومسابقات سنوية. التسجيل في
              الدورات يتم حضوريا بمقر الفرع.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-gold-foreground shadow-elevated transition-transform hover:scale-[1.02]"
              >
                <BookOpen className="h-4 w-4" />
                استكشف الدورات
              </Link>
              <Link
                to="/news"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                آخر الأخبار
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, label: "دورات نشطة", value: publicCourses.length },
              { icon: Users, label: "تلميذ مسجّل", value: people.filter((p) => p.role === "student" && p.courseIds.length > 0).length },
              { icon: Trophy, label: "نسبة النجاح", value: `${passRate}%` },
              { icon: Calendar, label: "مناسبات الموسم", value: news.filter((n) => n.tag === "مناسبة دينية").length },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"
              >
                <Icon className="h-6 w-6 text-gold" />
                <div className="mt-3 font-display text-3xl font-bold">{value}</div>
                <div className="mt-1 text-xs text-white/80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="container-page py-16">
        <SectionHeader
          eyebrow="الدورات"
          title="دورات الموسم الحالي"
          desc="نظرة سريعة على الدورات المتاحة بمقر الفرع. للتسجيل توجّه حضوريا."
          link={{ to: "/courses", label: "كل الدورات" }}
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.map((c) => (
            <article
              key={c.id}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {CATEGORY_LABEL[c.category]}
                </span>
                <span className="text-xs text-muted-foreground">{c.level}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.schedule}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">{c.instructor}</span>
                <span className="font-semibold text-primary">
                  {c.capacity - c.enrolled} مقعد متبقي
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* NEWS */}
      <section className="bg-surface py-16">
        <div className="container-page">
          <SectionHeader
            eyebrow="آخر الأخبار"
            title="الأخبار والمناسبات"
            desc="مستجدات الفرع، السهرات الدينية، والفعاليات."
            link={{ to: "/news", label: "كل الأخبار" }}
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {latestNews.map((n) => (
              <article
                key={n.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {n.tag}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold leading-snug text-foreground">
                  {n.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {n.excerpt}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{n.dateGregorian}</span>
                  <span className="text-gold">{n.dateHijri}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-gold p-10 text-gold-foreground shadow-elevated md:p-14">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold md:text-3xl">
                التسجيل في الدورات يتم حضوريا
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-90 md:text-base">
                تفضّل بمقر الفرع بسيدي الهاني للاطلاع على المقاعد المتاحة
                وإتمام التسجيل. تجد كل التفاصيل حول الفئات والمواقيت في صفحة
                الدورات.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background hover:opacity-90"
              >
                عرض الدورات
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="inline-flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                سيدي الهاني — تونس
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
  link,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  link?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">
          {eyebrow}
        </div>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{desc}</p>
      </div>
      {link && (
        <Link
          to={link.to}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {link.label}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
