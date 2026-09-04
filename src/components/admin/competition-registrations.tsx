import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Printer, UserPlus, X, Users, Filter, Tag, Calendar, MapPin, Globe, IdCard, Phone, Check, Info, Trash2, Save } from "lucide-react";
import { confirmToast } from "@/lib/confirm-toast";
import { useContentStore } from "@/lib/content-store";
import { usePeopleStore, type Person } from "@/lib/people-store";
import {
  useCompetitionRegistrations,
  registrationsActions,
  type CompetitionRegistration,
} from "@/lib/competition-registrations-store";
import { useLiveSearch } from "@/lib/use-live-search";
import { SearchBox, NoResults } from "@/components/ui/search-box";
import logoPng from "@/assets/logo.png";

type Level = "محلية" | "جهوية" | "وطنية";
const LEVELS: Level[] = ["محلية", "جهوية", "وطنية"];

type CompetitionOption = {
  id: string;
  title: string;
  level: string;
  date: string;
  location: string;
};

/** محلية = تسجيل مباشر · جهوية/وطنية = طلب انضمام (نفس النظام، تسمية مختلفة). */
function wording(level: string) {
  const local = level === "محلية";
  return {
    addLabel: local ? "تسجيل مشارك" : "طلب انضمام",
    amountLabel: local ? "ثمن المشاركة" : "رسم المشاركة",
    dateLabel: local ? "تاريخ التسجيل" : "تاريخ الطلب",
  };
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("fr-FR");
}

function fmtAmount(v?: number | null) {
  return v == null ? "—" : `${Number(v).toFixed(3)} د.ت`;
}

export function CompetitionRegistrationsPanel() {
  // Part 44 — one source of truth: the competitions list. No merging of arrays.
  const { competitions } = useContentStore();
  const [level, setLevel] = useState<Level>("محلية");
  const [competitionId, setCompetitionId] = useState("");
  const [adding, setAdding] = useState(false);
  const [receiptFor, setReceiptFor] = useState<CompetitionRegistration | null>(null);

  const options: CompetitionOption[] = useMemo(
    () =>
      competitions
        .filter((c) => c.level === level)
        .map((c) => ({
          id: c.id,
          title: c.name,
          level: c.level,
          date: c.eventDate ?? "",
          location: c.location ?? "",
        })),
    [competitions, level],
  );

  const selected = options.find((o) => o.id === competitionId) ?? null;
  const resolvedId = selected?.id ?? null;

  const target = selected;
  const registrations = useCompetitionRegistrations(resolvedId);
  const w = wording(level);


  return (
    <div className="space-y-5">
      {/* --- Competition selection --- */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Filter className="h-4.5 w-4.5" />
          </div>
          <h2 className="font-display text-lg font-bold">اختيار المسابقة</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">نوع المسابقة</span>
            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value as Level); setCompetitionId(""); }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">المسابقة</span>
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="">— اختر مسابقة —</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
        </div>

        {options.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            لا توجد مسابقات معلنة من نوع «{level}». أضِف إعلاناً من تبويب «الإعلان عن مسابقات».
          </p>
        )}

        {selected && (
          <dl className="mt-4 grid gap-4 rounded-xl bg-secondary/50 p-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">عنوان المسابقة</dt>
                <dd className="truncate font-semibold">{selected.title}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">تاريخ المسابقة</dt>
                <dd className="truncate font-semibold">{selected.date || "—"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">مكان المسابقة</dt>
                <dd className="truncate font-semibold">{selected.location || "—"}</dd>
              </div>
            </div>
          </dl>
        )}
      </section>

      {/* --- Registrations table --- */}
      {selected && (
        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-display text-lg font-bold">{selected.title}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {selected.level}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {selected.date || "—"}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selected.location || "—"}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> عدد المسجّلين: {registrations.length}</span>
              </p>
            </div>
            <button
              onClick={() => setAdding(true)}
              disabled={!resolvedId}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" /> {w.addLabel}
            </button>
          </header>

          {registrations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">لا توجد تسجيلات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">المعرف</th>
                    <th className="px-4 py-3 text-start font-semibold">الاسم واللقب</th>
                    <th className="px-4 py-3 text-start font-semibold">رقم الهاتف</th>
                    <th className="px-4 py-3 text-start font-semibold">{w.dateLabel}</th>
                    <th className="px-4 py-3 text-start font-semibold">الثمن المدفوع</th>
                    <th className="px-4 py-3 text-start font-semibold">الانتماء</th>
                    <th className="px-4 py-3 text-start font-semibold">التوصيل</th>
                    <th className="px-4 py-3 text-start font-semibold">إلغاء المشاركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.displayId ?? r.memberId ?? r.registrationCode ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{r.fullName}</td>
                      <td className="px-4 py-3">{r.phone || "—"}</td>
                      <td className="px-4 py-3">{fmtDate(r.registeredAt)}</td>
                      <td className="px-4 py-3">{fmtAmount(r.amountPaid)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.external ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary"
                        }`}>
                          {r.external ? "من خارج الجمعية" : "تابع للجمعية"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setReceiptFor(r)}
                          disabled={r.receiptIssued}
                          title={r.receiptIssued ? `تم تصدير التوصيل في ${fmtDate(r.receiptIssuedAt)}` : "تصدير التوصيل"}
                          aria-label="تصدير التوصيل"
                          className={`rounded-lg border p-2 ${
                            r.receiptIssued
                              ? "cursor-not-allowed border-border bg-secondary text-muted-foreground opacity-50"
                              : "border-border hover:bg-secondary"
                          }`}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            confirmToast({
                              message: "إلغاء المشاركة؟",
                              description: `سيتم حذف تسجيل «${r.fullName}» من مسابقة «${selected.title}».`,
                              confirmLabel: "إلغاء المشاركة",
                              variant: "danger",
                              onConfirm: () => {
                                if (!resolvedId) return;
                                registrationsActions
                                  .remove(resolvedId, r.id)
                                  .then(() => toast.success("تم إلغاء المشاركة"))
                                  .catch((e) => toast.error(`تعذّر الحذف: ${(e as Error).message}`));
                              },
                            })
                          }
                          title="إلغاء المشاركة"
                          aria-label="إلغاء المشاركة"
                          className="rounded-lg border border-border p-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {adding && target && (
        <AddRegistrationDialog
          competition={target}
          registrations={registrations}
          onClose={() => setAdding(false)}
        />
      )}

      {receiptFor && target && (
        <ReceiptSheet
          competition={target}
          registration={receiptFor}
          onClose={() => setReceiptFor(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Add registration ---------------- */

function AddRegistrationDialog({
  competition, registrations, onClose,
}: { competition: CompetitionOption; registrations: CompetitionRegistration[]; onClose: () => void }) {
  const { people } = usePeopleStore();
  // لا يظهر في القائمة تلميذ مسجَّل فعلاً في هذه المسابقة.
  const students = useMemo(() => {
    const registeredIds = new Set(
      registrations.map((r) => r.studentId).filter((id): id is string => Boolean(id)),
    );
    return people.filter((p) => p.role === "student" && !registeredIds.has(p.id));
  }, [people, registrations]);
  const { query, setQuery, filtered } = useLiveSearch<Person>(students, [(p) => p.fullName, (p) => p.phone]);

  const [kind, setKind] = useState<"internal" | "external">("internal");
  const [student, setStudent] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const w = wording(competition.level);

  async function save() {
    if (kind === "internal" && !student) { toast.error("اختر تلميذاً من القائمة."); return; }
    if (kind === "external" && (!name.trim() || !phone.trim())) {
      toast.error("أدخل الاسم واللقب ورقم الهاتف."); return;
    }
    if (amount.trim() === "" || Number.isNaN(Number(amount))) {
      toast.error("أدخل قيمة ثمن المشاركة."); return;
    }
    setSaving(true);
    try {
      await registrationsActions.add(competition.id, {
        studentId: kind === "internal" ? student!.id : null,
        memberId: kind === "internal" ? student!.memberId ?? student!.username ?? null : null,
        fullName: kind === "internal" ? student!.fullName : name.trim(),
        phone: kind === "internal" ? student!.phone : phone.trim(),
        externalName: kind === "external" ? name.trim() : null,
        externalPhone: kind === "external" ? phone.trim() : null,
        amountPaid: amount.trim() === "" ? null : Number(amount),
      });
      toast.success("تم التسجيل بنجاح");
      onClose();
    } catch (e) {
      toast.error(`تعذّر التسجيل: ${(e as Error).message}`);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-8">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 truncate font-display text-xl font-bold">{w.addLabel} — {competition.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          اختر نوع التسجيل ثم ابحث عن التلميذ لتسجيله في المسابقة.
        </p>

        <div className="mt-5 space-y-5">
          <div className="flex gap-2 rounded-2xl border border-border bg-secondary/40 p-1.5">
            {(["internal", "external"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  kind === k ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                <Users className="h-4 w-4" />
                {k === "internal" ? "تابع للجمعية" : "من خارج الجمعية"}
              </button>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {kind === "internal" ? (
                <>
                  <SearchBox value={query} onChange={setQuery} placeholder="ابحث بالاسم أو رقم الهاتف أو رقم التلميذ..." />
                  <div className="text-xs text-muted-foreground">نتائج البحث ({filtered.length})</div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
                    {filtered.length === 0 ? <NoResults /> : filtered.map((p) => {
                      const active = student?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setStudent(active ? null : p)}
                          title={active ? "إلغاء الاختيار" : "اختيار التلميذ"}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors ${
                            active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                          }`}>
                            {active ? <Check className="h-3.5 w-3.5" /> : "+"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{p.fullName}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {(p.memberId ?? p.username) && (
                                <span className="flex items-center gap-1 font-mono"><IdCard className="h-3.5 w-3.5" />{p.memberId ?? p.username}</span>
                              )}
                              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.phone || "—"}</span>
                            </span>
                            <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              تابع للجمعية
                            </span>
                          </span>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                            <Users className="h-4 w-4" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" /> يمكنك البحث بالاسم الكامل أو جزء منه أو رقم الهاتف أو رقم التلميذ.
                  </p>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      الاسم واللقب <span className="text-destructive">*</span>
                    </span>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      رقم الهاتف <span className="text-destructive">*</span>
                    </span>
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="w-full bg-transparent py-2.5 text-sm outline-none" />
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4 md:border-s md:border-border md:ps-5">
              {kind === "internal" && (
                <div>
                  <div className="text-sm font-bold">التلميذ المختار</div>
                  {student ? (
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <Users className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <Check className="h-4 w-4 text-primary" /> {student.fullName}
                        </div>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
                          {(student.memberId ?? student.username) && (
                            <span className="flex items-center gap-1 font-mono"><IdCard className="h-3.5 w-3.5" />{student.memberId ?? student.username}</span>
                          )}
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{student.phone || "—"}</span>
                        </div>
                        <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          تابع للجمعية
                        </span>
                      </div>
                      <button
                        onClick={() => setStudent(null)}
                        title="إلغاء الاختيار"
                        aria-label="إلغاء اختيار التلميذ"
                        className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      لم يتم اختيار تلميذ بعد.
                    </div>
                  )}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {w.amountLabel} (د.ت) <span className="text-destructive">*</span>
                </span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <span className="mt-1.5 block text-xs text-muted-foreground">أدخل قيمة ثمن المشاركة.</span>
              </label>

              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> حفظ
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- One-time receipt ---------------- */

function ReceiptSheet({
  competition, registration, onClose,
}: { competition: CompetitionOption; registration: CompetitionRegistration; onClose: () => void }) {
  const w = wording(competition.level);

  async function printAndIssue() {
    try {
      if (!registration.receiptIssued) {
        await registrationsActions.issueReceipt(competition.id, registration.id);
      }
    } catch (e) {
      toast.error(`تعذّر تسجيل التوصيل: ${(e as Error).message}`);
      return;
    }
    window.print();
    onClose();
  }

  return (
    <div className="print-overlay fixed inset-0 z-[60] overflow-y-auto bg-background">
      <div className="no-print sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => void printAndIssue()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Printer className="h-4 w-4" /> طباعة الآن
        </button>
        <button onClick={onClose} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary">
          <X className="h-4 w-4" /> إغلاق
        </button>
      </div>

      <div className="print-sheet mx-auto max-w-3xl bg-white p-8 text-black">
        <div className="flex items-center gap-3 border-b-2 border-black/20 pb-4">
          <img src={logoPng} alt="شعار الرابطة الوطنية للقرآن الكريم — فرع سيدي الهاني" className="h-20 w-20 shrink-0 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">فرع سيدي الهاني</div>
            <div className="text-xs">الرابطة الوطنية للقرآن الكريم</div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-xl font-bold">وصل مشاركة في مسابقة</h1>

        <table className="mt-4 w-full border-collapse border border-black/30 text-sm">
          <tbody>
            <tr>
              <th className="w-48 border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">المعرف</th>
              <td className="border border-black/30 px-3 py-2 font-mono">{registration.displayId ?? registration.memberId ?? registration.registrationCode ?? "—"}</td>
            </tr>
            <tr>
              <th className="w-48 border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">الاسم واللقب</th>
              <td className="border border-black/30 px-3 py-2">{registration.fullName}</td>
            </tr>
            <tr>
              <th className="border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">{w.dateLabel}</th>
              <td className="border border-black/30 px-3 py-2">{fmtDate(registration.registeredAt)}</td>
            </tr>
            <tr>
              <th className="border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">الثمن المدفوع</th>
              <td className="border border-black/30 px-3 py-2">{fmtAmount(registration.amountPaid)}</td>
            </tr>
            <tr>
              <th className="border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">عنوان المسابقة</th>
              <td className="border border-black/30 px-3 py-2">{competition.title}</td>
            </tr>
            <tr>
              <th className="border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">تاريخ المسابقة</th>
              <td className="border border-black/30 px-3 py-2">{competition.date || "—"}</td>
            </tr>
            <tr>
              <th className="border border-black/30 bg-black/5 px-3 py-2 text-start font-semibold">مكان المسابقة</th>
              <td className="border border-black/30 px-3 py-2">{competition.location || "—"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-10 flex justify-end">
          <div className="text-center text-sm">
            <div className="font-semibold">الإمضاء والختم</div>
            <div className="mt-12 border-t border-black/30 px-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
