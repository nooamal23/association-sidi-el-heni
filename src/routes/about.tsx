import { createFileRoute } from "@tanstack/react-router";
import { usePeopleStore, POSITION_LABEL } from "@/lib/people-store";
import { PageHero } from "./courses";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن الفرع — فرع سيدي الهاني" },
      {
        name: "description",
        content:
          "نبذة عن فرع سيدي الهاني للرابطة الوطنية للقرآن الكريم، الهيئة التسييرية، والأهداف.",
      },
      { property: "og:title", content: "عن الفرع — فرع سيدي الهاني" },
      {
        property: "og:description",
        content: "نبذة عن الفرع والهيئة التسييرية.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { boardMembers } = usePeopleStore();
  return (
    <>
      <PageHero
        title="عن الفرع"
        desc="فرع محلي تابع للرابطة الوطنية للقرآن الكريم بسيدي الهاني، يعنى بتحفيظ القرآن وتكوين المعلمين وتنظيم المسابقات والمناسبات الدينية."
      />

      <section className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <article className="prose prose-neutral max-w-none">
            <h2 className="font-display text-2xl font-bold text-foreground">
              رسالة الفرع
            </h2>
            <p className="mt-3 text-base leading-loose text-muted-foreground">
              يعمل فرع سيدي الهاني على تيسير تعلّم القرآن الكريم لمختلف الفئات
              العمرية، من الأطفال إلى النساء والرجال، عبر دورات تحفيظ منتظمة
              ودورات تأهيل للمعلمين والمعلمات. كما ينظّم الفرع مسابقات محلية
              وجهوية ومناسبات دينية وأنشطة ترفيهية وتثقيفية على مدار السنة.
            </p>

            <h2 className="mt-8 font-display text-2xl font-bold text-foreground">
              أهداف المنصة
            </h2>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>تنظيم سير الدورات: التسجيل، الجدولة، الحضور، التقييم، النتائج.</li>
              <li>توفير فضاء موحد للأخبار والمناسبات والدورات.</li>
              <li>تسهيل التواصل بين الإدارة والمكوّنين والتلاميذ.</li>
              <li>
                ثلاثة فضاءات مستخدمين متمايزة: الإدارة، المكوّن، والتلميذ، إضافة
                إلى الفضاء العام للزوار.
              </li>
            </ul>
          </article>

          <aside className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="font-display text-xl font-bold text-foreground">
              الهيئة التسييرية
            </h3>
            <ul className="mt-5 space-y-3">
              {boardMembers.map((m) => {
                const initial = m.fullName.trim().charAt(0) || "؟";
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
                  >
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.fullName} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-hero font-display text-lg font-bold text-primary-foreground">
                        {initial}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-foreground">{m.fullName}</div>
                      <div className="text-xs text-muted-foreground">{POSITION_LABEL[m.position]}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
