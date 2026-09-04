import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Medal, Award, Megaphone, Calendar, MapPin, Clock } from "lucide-react";
import { useContentStore, hasResults } from "@/lib/content-store";
import { PageHero } from "./courses";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "المسابقات — فرع سيدي الهاني" },
      {
        name: "description",
        content:
          "الإعلان عن المسابقات القادمة ونشر نتائج المسابقات المحلية والجهوية للفرع.",
      },
      { property: "og:title", content: "المسابقات — فرع سيدي الهاني" },
      {
        property: "og:description",
        content: "إعلانات ونتائج المسابقات المحلية والجهوية للفرع.",
      },
    ],
  }),
  component: CompetitionsPage,
});

const RANK_ICON = [Trophy, Medal, Award];
const RANK_COLOR = ["text-gold", "text-muted-foreground", "text-accent-foreground"];

function CompetitionsPage() {
  const { competitions, announcements } = useContentStore();
  const annSearch = useLiveSearch(announcements, [(a) => a.title]);
  const published = competitions.filter(hasResults);
  const compSearch = useLiveSearch(published, [(c) => c.name]);
  return (
    <>
      <PageHero
        title="المسابقات"
        desc="الإعلان عن المسابقات القادمة ونتائج المسابقات التي شارك فيها تلاميذ الفرع."
      />

      {/* ANNOUNCEMENTS */}
      <section className="container-page py-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">الإعلان عن المسابقات</h2>
            <p className="text-sm text-muted-foreground">المسابقات القادمة المفتوحة للتسجيل.</p>
          </div>
        </div>

        <div className="mb-6">
          <SearchBox
            value={annSearch.query}
            onChange={annSearch.setQuery}
            placeholder="ابحث في الإعلانات..."
          />
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            لا توجد إعلانات حاليا.
          </div>
        ) : annSearch.filtered.length === 0 ? (
          <NoResults />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {annSearch.filtered.map((a) => (
              <article key={a.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                {a.imageUrl && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
                    <img src={a.imageUrl} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {a.level}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> {a.date}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold">{a.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {a.location}
                  </p>
                  {a.deadline && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
                      <Clock className="h-4 w-4" /> آخر أجل للتسجيل: {a.deadline}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{a.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* RESULTS */}
      <section className="container-page space-y-10 pb-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">نتائج المسابقات</h2>
            <p className="text-sm text-muted-foreground">
              إحصائيات ونتائج المسابقات المحلية والجهوية.
            </p>
          </div>
        </div>

        <SearchBox
          value={compSearch.query}
          onChange={compSearch.setQuery}
          placeholder="ابحث في المسابقات..."
        />

        {published.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            لا توجد نتائج منشورة حاليا.
          </div>
        )}
        {published.length > 0 && compSearch.filtered.length === 0 && <NoResults />}
        {compSearch.filtered.map((comp) => (
          <article
            key={comp.id}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <div className="border-b border-border bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {comp.level}
                  </span>
                  <h2 className="mt-3 font-display text-2xl font-bold text-foreground md:text-3xl">
                    {comp.name}
                  </h2>
                </div>
                <div className="font-display text-3xl font-bold text-gold">{comp.year}</div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Stat label="عدد المشاركين" value={comp.participants} />
                <Stat label="الناجحون" value={comp.passed} />
                <Stat label="نسبة النجاح" value={`${comp.passRate}%`} highlight />
              </div>
            </div>

            <div className="p-6 md:p-8">
              <h3 className="font-display text-lg font-bold text-foreground">المراكز الأولى</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {comp.topThree.map((t, i) => {
                  const Icon = RANK_ICON[i];
                  return (
                    <li
                      key={t.rank}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-secondary ${RANK_COLOR[i]}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">المركز {t.rank}</div>
                        <div className="font-semibold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.category}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-gold/40 bg-gold/10" : "border-border bg-background"
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-2 font-display text-3xl font-bold ${
          highlight ? "text-gold" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
