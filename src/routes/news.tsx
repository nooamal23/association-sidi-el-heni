import { createFileRoute } from "@tanstack/react-router";
import { useNewsStore } from "@/lib/news-store";
import { PageHero } from "./courses";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "الأخبار والمناسبات — فرع سيدي الهاني" },
      {
        name: "description",
        content:
          "آخر أخبار الفرع، المناسبات الدينية، السهرات والفعاليات بالتاريخين الهجري والميلادي.",
      },
      { property: "og:title", content: "الأخبار والمناسبات — فرع سيدي الهاني" },
      {
        property: "og:description",
        content: "أخبار الفرع والمناسبات الدينية والسهرات.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { news } = useNewsStore();
  const { query, setQuery, filtered: list } = useLiveSearch(news, [
    (n) => n.title,
    (n) => n.excerpt,
    (n) => n.body,
  ]);
  return (
    <>
      <PageHero
        title="الأخبار والمناسبات"
        desc="مستجدات الفرع والمناسبات الدينية، مع التواريخ بالتقويمين الهجري والميلادي."
      />
      <section className="container-page py-12">
        <div className="mb-6">
          <SearchBox value={query} onChange={setQuery} placeholder="ابحث في الأخبار..." />
        </div>
        {list.length === 0 ? (
          <NoResults />
        ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {list.map((n) => (
            <article
              key={n.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {n.tag}
                </span>
                <div className="text-left text-xs">
                  <div className="font-semibold text-foreground">{n.dateGregorian}</div>
                  <div className="text-gold">{n.dateHijri}</div>
                </div>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-foreground">
                {n.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {n.body}
              </p>
            </article>
          ))}
        </div>
        )}
      </section>
    </>
  );
}
