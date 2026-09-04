import { Copy, Printer, X } from "lucide-react";
import { toast } from "sonner";

export type Credential = {
  fullName: string;
  username: string;
  password: string;
  role: "instructor" | "student";
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  } catch {
    toast.error("تعذّر النسخ");
  }
}

function openPrintable(cred: Credential) {
  const roleLabel = cred.role === "instructor" ? "معلم" : "تلميذ";
  const w = window.open("", "_blank", "width=820,height=720");
  if (!w) {
    toast.error("لم يُسمح بفتح نافذة جديدة");
    return;
  }
  const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>بطاقة اعتماد — ${escapeHtml(cred.fullName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Tajawal","Cairo","Segoe UI",Arial,sans-serif; margin: 0; padding: 24px; background: #f1f5f9; color: #0f172a; }
  .card { max-width: 520px; margin: 40px auto; border: 2px solid #14532d; border-radius: 18px; padding: 32px; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,.08); }
  .brand { text-align:center; font-size:12px; letter-spacing:1px; color:#14532d; font-weight:700; }
  h1 { margin: 6px 0 2px; font-size: 24px; text-align: center; color: #14532d; }
  .sub { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 22px; }
  .role { display:inline-block; margin: 4px auto 20px; padding: 4px 12px; background:#14532d10; color:#14532d; border-radius: 999px; font-size:12px; font-weight:700; }
  .center { text-align:center; }
  .row { display:flex; justify-content: space-between; align-items:center; border-bottom: 1px dashed #cbd5e1; padding: 14px 0; font-size: 15px; }
  .row:last-child { border-bottom: none; }
  .k { color:#475569; font-size: 13px; }
  .v { font-weight: 700; color:#0f172a; }
  .mono { font-family: "Courier New", "SFMono-Regular", monospace; direction: ltr; unicode-bidi: embed; }
  .note { margin-top: 22px; padding: 12px 14px; background: #fef3c7; border-right: 4px solid #f59e0b; border-radius: 8px; font-size: 12.5px; color: #78350f; line-height: 1.7; }
  .foot { margin-top: 18px; text-align:center; font-size: 11px; color:#94a3b8; }
  @media print {
    body { background: #fff; padding: 0; }
    .card { box-shadow: none; margin: 0 auto; border-color:#14532d; }
  }
</style></head>
<body><div class="card">
  <div class="brand">فرع سيدي الهاني</div>
  <h1>بطاقة اعتماد</h1>
  <div class="sub">بيانات الدخول إلى الفضاء الشخصي</div>
  <div class="center"><span class="role">${roleLabel}</span></div>
  <div class="row"><span class="k">الاسم الكامل</span><span class="v">${escapeHtml(cred.fullName)}</span></div>
  <div class="row"><span class="k">المعرف الوحيد</span><span class="v mono">${escapeHtml(cred.username)}</span></div>
  <div class="row"><span class="k">كلمة العبور</span><span class="v mono">${escapeHtml(cred.password)}</span></div>
  <div class="note">
    يرجى الاحتفاظ بهذه البطاقة في مكان آمن وعدم مشاركتها مع أي شخص آخر.${cred.role === "instructor" ? "\n    يُنصح بتغيير كلمة العبور بعد أول تسجيل دخول." : ""}
  </div>
  <div class="foot">تم إصدارها بتاريخ ${new Date().toLocaleDateString("ar-TN")}</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function CredentialCard({
  cred,
  onClose,
}: {
  cred: Credential;
  onClose: () => void;
}) {
  const roleLabel = cred.role === "instructor" ? "المعلّم" : "التلميذ";

  async function copyAll() {
    const text = `الاسم: ${cred.fullName}\nالمعرف الوحيد: ${cred.username}\nكلمة العبور: ${cred.password}`;
    await copyText(text, "البيانات");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-foreground/50 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-elevated sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">بطاقة الاعتماد</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-secondary"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          سلّم هذه البيانات لـ{roleLabel} لتمكينه من الدخول إلى فضائه الشخصي.
        </p>
        <dl className="space-y-1 rounded-xl border border-border bg-background/50 p-2">
          <Field
            label="الاسم"
            value={cred.fullName}
            onCopy={() => copyText(cred.fullName, "الاسم")}
          />
          <Field
            label="المعرف الوحيد"
            value={cred.username}
            mono
            onCopy={() => copyText(cred.username, "المعرف الوحيد")}
          />
          <Field
            label="كلمة العبور"
            value={cred.password}
            mono
            onCopy={() => copyText(cred.password, "كلمة العبور")}
          />
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={copyAll}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <Copy className="h-4 w-4" /> نسخ كل البيانات
          </button>
          <button
            onClick={() => openPrintable(cred)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Printer className="h-4 w-4" /> طباعة رسمية
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-secondary/60">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span
          className={`truncate ${mono ? "font-mono text-sm" : "font-semibold text-sm"} text-foreground`}
          dir={mono ? "ltr" : undefined}
          title={value}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-border bg-background p-1 hover:bg-secondary"
          aria-label={`نسخ ${label}`}
          title={`نسخ ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </dd>
    </div>
  );
}
