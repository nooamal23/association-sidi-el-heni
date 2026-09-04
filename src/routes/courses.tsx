import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Clock, User } from "lucide-react";
import { CATEGORY_LABEL, type Course } from "@/lib/mock-data";
import { usePeopleStore } from "@/lib/people-store";
import { toPublicCourse } from "@/lib/course-view";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "الدورات — فرع سيدي الهاني" },
      {
        name: "description",
        content:
          "كل دورات تحفيظ القرآن والتكوين بفرع سيدي الهاني، مصنّفة حسب الفئة والمستوى.",
      },
      { property: "og:title", content: "الدورات — فرع سيدي الهاني" },
      {
        property: "og:description",
        content: "دورات تحفيظ القرآن والتكوين بفرع سيدي الهاني.",
      },
    ],
  }),
  component: CoursesPage,
});

type Filter = "all" | Course["category"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "children", label: "أطفال" },
  { id: "women", label: "نساء" },
  { id: "men", label: "رجال" },
  { id: "training", label: "تكوين معلمين" },
  { id: "summer", label: "صيفية" },
];

function CoursesPage() {
  const { courses, people } = usePeopleStore();
  const [filter, setFilter] = useState<Filter>("all");
  const publicCourses = useMemo(
    () => courses.map((c) => toPublicCourse(c, people)),
    [courses, people],
  );
  const byCategory = filter === "all" ? publicCourses : publicCourses.filter((c) => c.category === filter);
  const { query, setQuery, filtered: list } = useLiveSearch(byCategory, [
    (c) => c.title,
    (c) => c.instructor,
  ]);

  return (
    <>
      <PageHero
        title="دليل الدورات"
        desc="استعرض الدورات المتاحة بمقر الفرع. التسجيل النهائي يتم حضوريا بمقر الفرع بسيدي الهاني."
      />

      <section className="container-page py-12">
        <div className="mb-6">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ابحث عن دورة أو معلم..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const remaining = c.capacity - c.enrolled;
            const fillPct = (c.enrolled / c.capacity) * 100;
            return (
              <article
                key={c.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {CATEGORY_LABEL[c.category]}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.level}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                  {c.title}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {c.schedule}
                  </li>
                  <li className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {c.instructor}
                  </li>
                </ul>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {c.enrolled} / {c.capacity} مسجّل
                    </span>
                    <span
                      className={`font-semibold ${
                        remaining > 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {remaining > 0 ? `${remaining} مقعد متبقي` : "اكتمل العدد"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  التسجيل حضوريا بمقر الفرع
                </div>
              </article>
            );
          })}
        </div>
        {list.length === 0 && (
          <NoResults message={query ? "لا توجد نتائج مطابقة" : "لا توجد دورات مطابقة لهذا التصنيف حاليا."} />
        )}
      </section>
    </>
  );
}

export function PageHero({ title, desc }: { title: string; desc: string }) {
  return (
    <section className="relative overflow-hidden bg-hero text-primary-foreground">
      <div className="absolute inset-0 opacity-15 pattern-arabesque" aria-hidden />
      <div className="container-page relative py-14 md:py-20">
        <h1 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
          {desc}
        </p>
      </div>
    </section>
  );
}
