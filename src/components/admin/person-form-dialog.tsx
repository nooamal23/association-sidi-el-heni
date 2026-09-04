import { useState } from "react";
import { toast } from "sonner";
import { X, UserPlus, CalendarDays, Phone, Lock, Camera, Upload, Save } from "lucide-react";
import { noticeToast } from "@/lib/notice-toast";
import { formatSimpleDate } from "@/lib/utils";
import { ArabicDateInput } from "@/components/ui/arabic-date-input";
import { isValidTunisianPhone, TUNISIA_PHONE_MESSAGE } from "@/lib/phone";
import { CredentialCard } from "@/components/admin/credential-card";
import { FrozenIdField } from "@/components/admin/frozen-id-field";
import {
  usePeopleStore,
  peopleActions,
  getPersonById,
  type Person,
  type Role,
} from "@/lib/people-store";

type FormState = {
  fullName: string;
  username: string;
  birthDate: string;
  phone: string;
  photoUrl: string;
  courseIds: string[];
  passwordOverride: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  username: "",
  birthDate: "",
  phone: "",
  photoUrl: "",
  courseIds: [],
  passwordOverride: "",
};

function initialFormFor(
  editing: Person | null,
  prefill?: Partial<FormState>,
): FormState {
  if (editing) {
    return {
      fullName: editing.fullName,
      username: editing.username,
      birthDate: editing.birthDate,
      phone: editing.phone,
      photoUrl: editing.photoUrl || "",
      courseIds: editing.courseIds,
      passwordOverride:
        editing.password !== editing.birthDate ? editing.password : "",
    };
  }
  return { ...EMPTY_FORM, ...(prefill ?? {}) };
}

export function PersonFormDialog({
  role,
  editing,
  prefill,
  onClose,
  onCreated,
}: {
  role: Role;
  editing: Person | null;
  /** Prefill for add mode (ignored when editing). */
  prefill?: Partial<FormState>;
  onClose: () => void;
  /** Called after a successful add (not on edit, not on failure). */
  onCreated?: () => Promise<void> | void;
}) {
  const { courses } = usePeopleStore();
  const singular = role === "instructor" ? "معلم" : "تلميذ";
  const [form, setForm] = useState<FormState>(() => initialFormFor(editing, prefill));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Part 39/40 — for students (STU-) and instructors (TCH-) the member number
  // IS the username: auto-generated, frozen, and shown live after save.
  const [issuedId, setIssuedId] = useState("");
  const frozenId = editing ? (editing.memberId || editing.username) : issuedId;
  const idExample = role === "instructor" ? "TCH-000001" : "STU-000001";
  const [issuedCred, setIssuedCred] = useState<{
    fullName: string;
    username: string;
    password: string;
  } | null>(null);

  function toggleCourse(id: string) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(id)
        ? f.courseIds.filter((x) => x !== id)
        : [...f.courseIds, id],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // Part 39 — the identifier is always the frozen auto-generated member
    // number (STU-/TCH-), so there is nothing to validate for uniqueness.
    const uname = frozenId || "";
    if (!isValidTunisianPhone(form.phone)) {
      setPhoneError(TUNISIA_PHONE_MESSAGE);
      noticeToast({
        variant: "warning",
        title: "رقم هاتف غير صحيح",
        message: TUNISIA_PHONE_MESSAGE,
      });
      return;
    }
    setPhoneError(null);
    const password =
      role === "student"
        ? form.birthDate
        : form.passwordOverride || form.birthDate;
    const payload = {
      role,
      fullName: form.fullName,
      username: uname,
      birthDate: form.birthDate,
      password,
      phone: form.phone,
      photoUrl: form.photoUrl || undefined,
      courseIds: form.courseIds,
    };
    setSaving(true);
    try {
      if (editing) {
        await peopleActions.update(editing.id, payload);
        if (role === "student") {
          await syncEnrollments(editing.id, editing.courseIds, form.courseIds);
        } else {
          await syncInstructorCourses(editing.id, editing.courseIds, form.courseIds);
        }
        toast.success(`تم حفظ التغييرات على ${payload.fullName} بنجاح`);
        onClose();
      } else {
        const newId = await peopleActions.add(payload);
        if (newId) {
          // Part 40 — show the real generated ID immediately, no refresh.
          const created = getPersonById(newId);
          setIssuedId(created?.memberId || created?.username || "");
          if (role === "student" && form.courseIds.length > 0) {
            await syncEnrollments(newId, [], form.courseIds);
          } else if (role === "instructor" && form.courseIds.length > 0) {
            await syncInstructorCourses(newId, [], form.courseIds);
          }
        }
        try {
          await onCreated?.();
        } catch (err) {
          noticeToast({
            variant: "error",
            title: "تم إنشاء الحساب لكن حدث خطأ",
            message: (err as Error).message,
          });
        }
        toast.success(`تمت إضافة ${payload.fullName} بنجاح`);
        // Show the credential card instead of closing — admin needs to
        // deliver these credentials to the person offline.
        setIssuedCred({
          fullName: payload.fullName,
          username: (newId ? getPersonById(newId)?.username : "") || payload.username,
          password: payload.password,
        });
      }
    } catch {
      // peopleActions already surfaced the error toast; keep the dialog open.
    } finally {
      setSaving(false);
    }
  }

  async function syncEnrollments(
    studentId: string,
    prev: string[],
    next: string[],
  ) {
    const prevSet = new Set(prev);
    const nextSet = new Set(next);
    const toEnroll = next.filter((id) => !prevSet.has(id));
    const toUnenroll = prev.filter((id) => !nextSet.has(id));
    await Promise.all([
      ...toEnroll.map((cid) => peopleActions.enroll(cid, studentId)),
      ...toUnenroll.map((cid) => peopleActions.unenroll(cid, studentId)),
    ]);
  }

  async function syncInstructorCourses(
    instructorId: string,
    prev: string[],
    next: string[],
  ) {
    const prevSet = new Set(prev);
    const nextSet = new Set(next);
    // Assign this instructor to newly-selected courses.
    const toAssign = next.filter((id) => !prevSet.has(id));
    // Clear this instructor from courses removed from the selection,
    // but only where the course still points to this instructor.
    const toClear = prev.filter((id) => !nextSet.has(id));
    await Promise.all([
      ...toAssign.map((cid) => peopleActions.updateCourse(cid, { instructorId })),
      ...toClear.map((cid) => {
        const c = courses.find((x) => x.id === cid);
        if (!c || c.instructorId !== instructorId) return Promise.resolve();
        return peopleActions.updateCourse(cid, { instructorId: "" });
      }),
    ]);
  }

  if (issuedCred) {
    return (
      <CredentialCard
        cred={{ ...issuedCred, role }}
        onClose={() => {
          setIssuedCred(null);
          onClose();
        }}
      />
    );
  }


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 truncate font-display text-xl font-bold">
              {editing ? `تعديل ${singular}` : `إضافة ${singular} جديد`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {editing
            ? `عدّل معلومات ال${singular} ثم احفظ التغييرات.`
            : `أدخل معلومات ال${singular} لإضافته إلى النظام.`}
        </p>

        <form onSubmit={submit} className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {(role === "student" || role === "instructor") && (
            <>
              <FrozenIdField value={frozenId} example={idExample} />

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold">
                  تاريخ التسجيل <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-input bg-muted px-3 py-3 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {editing?.createdAt
                      ? formatSimpleDate(editing.createdAt)
                      : formatSimpleDate(new Date().toISOString())}
                  </span>
                </div>
              </div>
            </>
          )}
          <div className="min-w-0 sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold">
              الاسم الكامل <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              required
              placeholder={`أدخل الاسم الكامل لل${singular}`}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="block w-full max-w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-semibold">
              تاريخ الولادة <span className="text-destructive">*</span>
            </label>
            <ArabicDateInput
              value={form.birthDate}
              onChange={(v) => setForm({ ...form, birthDate: v })}
              required
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-sm font-semibold">
              رقم الهاتف <span className="text-destructive">*</span>
            </label>
            <div
              className={`flex items-stretch overflow-hidden rounded-xl border bg-background ${
                phoneError ? "border-destructive" : "border-input"
              }`}
            >
              <span className="flex w-11 shrink-0 items-center justify-center border-e border-input bg-muted text-primary">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="tel"
                value={form.phone}
                required
                placeholder="مثال: 20 123 456"
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  if (phoneError) setPhoneError(null);
                }}
                className="block w-full min-w-0 bg-background px-3 py-3 text-sm outline-none"
              />
            </div>
            {phoneError && (
              <p className="mt-1.5 text-xs font-medium text-destructive">{phoneError}</p>
            )}
          </div>

          {role === "student" ? (
            <div className="min-w-0 sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">كلمة المرور</label>
              <div className="flex items-stretch overflow-hidden rounded-xl border border-input bg-muted">
                <span className="flex w-11 shrink-0 items-center justify-center border-e border-input bg-muted text-primary">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={form.birthDate}
                  readOnly
                  disabled
                  placeholder="YYYY-MM-DD"
                  className="block w-full min-w-0 cursor-not-allowed bg-muted px-3 py-3 text-sm text-muted-foreground"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                كلمة مرور مؤقتة (تطابق تاريخ الولادة).
              </p>
            </div>
          ) : (
            <div className="min-w-0 sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">
                كلمة المرور (افتراضيا: تاريخ الولادة)
              </label>
              <div className="flex items-stretch overflow-hidden rounded-xl border border-input bg-background">
                <span className="flex w-11 shrink-0 items-center justify-center border-e border-input bg-muted text-primary">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={form.passwordOverride}
                  onChange={(e) => setForm({ ...form, passwordOverride: e.target.value })}
                  placeholder={form.birthDate || "YYYY-MM-DD"}
                  className="block w-full min-w-0 bg-background px-3 py-3 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <div className="min-w-0 rounded-2xl border border-border bg-background/40 p-4 sm:col-span-2">
            <label className="mb-3 block text-sm font-semibold">الصورة الشخصية (اختياري)</label>
            <div className="flex flex-wrap items-center gap-4">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt="preview"
                  className="h-24 w-32 shrink-0 rounded-xl object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex h-24 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  <span>لا توجد صورة</span>
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  <Upload className="h-4 w-4" />
                  <span>اختر صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((f) => ({ ...f, photoUrl: String(reader.result) }));
                        toast.success("تم اختيار الصورة");
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="text-xs text-muted-foreground">
                  {form.photoUrl ? "تم اختيار صورة" : "يُفضل صورة واضحة بخلفية مناسبة."}
                </div>
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, photoUrl: "" })}
                    className="self-start rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
                  >
                    إزالة الصورة
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-background/40 p-4 sm:col-span-2">
            <label className="mb-3 block text-sm font-semibold">
              الدورات (اختياري) — يمكن اختيار أكثر من دورة
            </label>
            <div className="grid max-h-40 grid-cols-[minmax(0,1fr)] gap-1.5 overflow-y-auto sm:grid-cols-2">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={form.courseIds.includes(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                </label>
              ))}
              {courses.length === 0 && (
                <div className="text-xs text-muted-foreground">لا توجد دورات بعد.</div>
              )}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-4 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {editing ? "حفظ التغييرات" : `إضافة ال${singular}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
