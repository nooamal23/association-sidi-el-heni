// Shared printable A4 sheet used by the admin roster reports so every printed
// PDF looks the same (branding header, ornamented title, stats strip, footer).
import type { ReactNode } from "react";
import {
  Printer, X, Calendar, Clock, BookOpen, Users, Users2, User,
  CalendarDays, BarChart3, DoorOpen,
} from "lucide-react";
import logoPng from "@/assets/logo.png";

export type CourseType = "quran" | "fiqh" | "training" | "summer" | null | undefined;

const QUOTES: Record<string, { text: string; source?: string }> = {
  quran: { text: "« خيركم من تعلّم القرآن وعلّمه »", source: "(رواه البخاري)" },
  fiqh: { text: "« من يُرد الله به خيراً يفقّهه في الدين »", source: "(متفق عليه)" },
  training: { text: "« وقل ربِّ زدني علماً »", source: "(سورة طه)" },
  summer: { text: "« صيفٌ بالعلم والإيمان »" },
};

export function courseQuote(type: CourseType) {
  return QUOTES[type ?? "quran"] ?? QUOTES.quran;
}

const AR_DATE = new Intl.DateTimeFormat("ar-TN", { day: "numeric", month: "long", year: "numeric" });

function iconForLabel(label: string) {
  const c = "h-4 w-4";
  if (label.includes("تلاميذ") || label.includes("التلميذ")) return <Users2 className={c} />;
  if (label.includes("أفواج") || label.includes("مجموعات")) return <Users className={c} />;
  if (label.includes("معلم") || label.includes("أستاذ")) return <User className={c} />;
  if (label.includes("فئة")) return <Users className={c} />;
  if (label.includes("أيام")) return <CalendarDays className={c} />;
  if (label.includes("توقيت") || label.includes("وقت")) return <Clock className={c} />;
  if (label.includes("مستوى")) return <BarChart3 className={c} />;
  if (label.includes("قاعة")) return <DoorOpen className={c} />;
  return <BookOpen className={c} />;
}

export type PrintStat = { label: string; value: ReactNode; icon?: ReactNode };

function Ornament({ flip }: { flip?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block text-[--print-accent] opacity-70"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      ❧
    </span>
  );
}

export function PrintSheet({
  title,
  stats = [],
  courseType,
  onClose,
  children,
}: {
  title: string;
  stats?: PrintStat[];
  courseType?: CourseType;
  onClose: () => void;
  children: ReactNode;
}) {
  const now = new Date();
  const quote = courseQuote(courseType);

  return (
    <div className="print-overlay fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Printer className="h-4 w-4" /> طباعة الآن
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
        >
          <X className="h-4 w-4" /> إغلاق
        </button>
      </div>

      <div
        className="print-sheet mx-auto my-6 flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white p-10 text-[#14321f] shadow-soft"
        style={{ ["--print-accent" as string]: "#b08a3e" }}
      >
        {/* ترويسة الوثيقة */}
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={logoPng}
              alt="شعار الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-2xl font-bold">فرع سيدي الهاني</div>
              <div className="text-sm text-[#14321f]/70">الرابطة الوطنية للقرآن الكريم</div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-[#14321f]/75">
            <div className="flex items-center justify-end gap-2">
              <span>تاريخ الإصدار: {AR_DATE.format(now)}</span>
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <span>
                وقت الإصدار: {String(now.getHours()).padStart(2, "0")}:
                {String(now.getMinutes()).padStart(2, "0")}
              </span>
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </header>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#14321f]/25" />
          <Ornament />
          <span className="h-px flex-1 bg-[#14321f]/25" />
        </div>

        {/* عنوان التقرير */}
        <div className="mt-7 flex items-center justify-center gap-3">
          <Ornament flip />
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <Ornament />
        </div>

        {/* شريط المعطيات */}
        {stats.length > 0 && (
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] border-y border-[#14321f]/15">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`px-2 py-3 text-center ${i > 0 ? "border-s border-[#14321f]/12" : ""}`}
              >
                <div className="flex justify-center text-[#14321f]/70">
                  {s.icon ?? iconForLabel(s.label)}
                </div>
                <div className="mt-1.5 text-[11px] text-[#14321f]/70">{s.label}</div>
                <div className="mt-1 text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1">{children}</div>

        {/* تذييل الوثيقة */}
        <footer className="mt-10 border-t border-[#14321f]/20 pt-6">
          <div className="grid grid-cols-3 items-end gap-4 text-center text-xs">
            <div />
            <div>
              <BookOpen className="mx-auto h-6 w-6 text-[#14321f]/70" />
              <p className="mt-2 text-sm font-semibold">{quote.text}</p>
              {quote.source && <p className="mt-0.5 text-[#14321f]/70">{quote.source}</p>}
            </div>
            <div className="text-center">
              <p className="mb-6">يعتمد</p>
              <p className="text-[#14321f]/50">............................</p>
              <p className="mt-1">ختم الفرع</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** عنوان قسم داخل الوثيقة، بزخرفة مطابقة لعنوان التقرير. */
export function PrintSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <span className="h-px w-16 bg-[#14321f]/25" />
      <h2 className="font-display text-xl font-bold">{children}</h2>
      <span className="h-px w-16 bg-[#14321f]/25" />
    </div>
  );
}

/** جدول مطبوع بترويسة خضراء داكنة. */
export function PrintTable({
  headers, children,
}: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg text-sm">
      <thead>
        <tr className="bg-[#1f4d2e] text-white">
          {headers.map((h, i) => (
            <th key={i} className="border border-[#1f4d2e] px-3 py-2 text-center font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function PrintTd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border border-[#14321f]/20 px-3 py-2 text-center ${className}`}>{children}</td>;
}
