import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useContentStore } from "@/lib/content-store";
import { PageHero } from "./courses";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "المعرض — فرع سيدي الهاني" },
      {
        name: "description",
        content:
          "معرض صور الرحلات الترفيهية والتثقيفية وحفلات التكريم بفرع سيدي الهاني.",
      },
      { property: "og:title", content: "المعرض — فرع سيدي الهاني" },
      {
        property: "og:description",
        content: "صور الرحلات وحفلات التكريم والفعاليات.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { gallery } = useContentStore();
  const { query, setQuery, filtered } = useLiveSearch(gallery, [(g) => g.title]);
  return (
    <>
      <PageHero
        title="معرض الصور والأنشطة"
        desc="لحظات من رحلات الفرع وحفلات التكريم والفعاليات الدينية والتثقيفية."
      />
      <section className="container-page py-12">
        <div className="mb-6">
          <SearchBox value={query} onChange={setQuery} placeholder="ابحث في المعرض..." />
        </div>
        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            لم تُضف صور بعد.
          </div>
        ) : filtered.length === 0 ? (
          <NoResults />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => (
              <figure
                key={g.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
              >
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden bg-hero"
                  aria-hidden
                >
                  {g.imageUrl ? (
                    <img src={g.imageUrl} alt={g.title} className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 pattern-arabesque opacity-30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-white/40" />
                      </div>
                      <div
                        className="absolute inset-0 mix-blend-overlay opacity-40"
                        style={{
                          background: `conic-gradient(from ${(g.imageSeed ?? 30) * 6}deg, oklch(0.78 0.13 85), oklch(0.38 0.09 158), oklch(0.78 0.13 85))`,
                        }}
                      />
                    </>
                  )}
                </div>
                <figcaption className="p-4">
                  <div className="font-semibold text-foreground">{g.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{g.date}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
