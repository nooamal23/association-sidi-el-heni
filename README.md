# منصة فرع سيدي الهاني — الرابطة الوطنية للقرآن الكريم

تطبيق ويب لإدارة دورات تحفيظ القرآن، الأخبار، المسابقات، ومتابعة التلاميذ.

## البنية (Stack)

- **Frontend**: React 19 + TanStack Start + Tailwind v4 (هذا المستودع، RTL عربي)
- **Backend**: Node.js + Express + **Prisma ORM** (`backend/`)
- **DB**: PostgreSQL 16
- **Deployment**: Docker Compose على VPS واحد، خلف Nginx + Let's Encrypt

## التشغيل محليا

### Frontend

```bash
bun install
bun run dev   # http://localhost:8080
```

اضبط `VITE_API_URL` (اختياري في التطوير) للإشارة إلى الـ API:

```bash
echo 'VITE_API_URL=http://localhost:4000/api' > .env.local
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev   # http://localhost:4000
```

عيّن `DATABASE_URL` لـ Postgres محلي، ثم:

```bash
npm run db:push   # يطبّق schema Prisma على القاعدة (تطوير)
npm run seed      # ينشئ مستخدم admin / admin1234
```

في الإنتاج، استعمل الهجرات الرسمية:

```bash
npx prisma migrate dev --name init   # مرة واحدة عند إنشاء migration جديد
npm run migrate                      # = prisma migrate deploy (على VPS)
```

### كلمة سر قسم المالية (Finance module password)

قسم المالية محمي بكلمة سر ثانية إضافة إلى تسجيل دخول المدير. الكلمة **لا تُخزَّن في الواجهة أبدا** بل يُخزَّن هاشها (bcrypt) في متغير بيئي على الخادم:

```bash
# داخل مجلد backend/
npm run finance:hash -- "كلمة-السر-الجديدة"
```

السكربت يطبع نسختين من الهاش:

1. **Raw hash** — يُستعمل عندما يكون `FINANCE_PASSWORD_HASH` متغيّر بيئة حقيقي (Process manager، CI/CD secret، Kubernetes Secret، أو `docker run -e ...`).
2. **For backend/.env** — يُستعمل عند وضع الهاش في `backend/.env` المحمَّل عبر `docker-compose env_file:`.

> ⚠️ **تحذير مهم:** Docker Compose يفسّر الرمز `$` داخل قيم `env_file` (يعتبره بداية متغيّر). هاشات bcrypt تحتوي `$` بشكل حرفي، لذلك **يجب مضاعفة كل `$` إلى `$$`** داخل `backend/.env` وإلا يُقتطع الهاش بصمت وتظهر رسالة "كلمة السر غير صحيحة" دائما. السكربت أعلاه يطبع النسخة المُضاعَفة جاهزة للنسخ.

```bash
# مثال (النسخة المضاعَفة، جاهزة للصق في backend/.env):
# FINANCE_PASSWORD_HASH=$$2a$$10$$mBU.iq281AjZ...
# ثم أعد تشغيل الحاوية:
docker compose restart api
```

عند فتح `/admin/finance` ستظهر شاشة قفل تطلب هذه الكلمة. النقطة `POST /api/admin/finance/unlock` تقارن الكلمة مع الهاش عبر `bcrypt.compare` وتُصدر Token خاص بقسم المالية صالح 15 دقيقة، ويُرسَل مع كل طلبات `/api/admin/finance*` عبر ترويسة `X-Finance-Token`. الطلبات بدون هذا Token تُرفض بالرمز 423 حتى لو كان لدى المستخدم Admin JWT صالح.

## النشر على VPS

### قائمة تحقق أمنية قبل النشر (deployment checklist)

**يجب** ضبط هذه القيم قبل تشغيل `docker compose up` — كلها placeholders لا تصلح للإنتاج:

1. `POSTGRES_PASSWORD` — أنشئ ملف `.env` بجانب `docker-compose.yml` يحتوي:
   ```env
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   ```
   بدون هذا المتغير، `docker compose up` **سيرفض** الإقلاع (تم فرض ذلك في `docker-compose.yml`).
   يوجد `.env.example` في جذر المشروع كمرجع — انسخه: `cp .env.example .env` ثم عيّن قيمة قوية.
   ⚠️ لا تُضِف ملف `.env` هذا إلى git (مُستثنى في `.gitignore`).
2. `backend/.env`:
   - `JWT_SECRET` — 64 حرفاً عشوائياً (`openssl rand -hex 32`). لا يوجد قيمة افتراضية — الخادم يرفض الإقلاع في `NODE_ENV=production` بدونها.
   - `DATABASE_URL` — **يجب** أن تطابق كلمة السر فيها `POSTGRES_PASSWORD` في `.env` الجذر بالحرف (وإلا فشل اتصال `api` بـ `db`).
   - `CORS_ORIGINS` — النطاق الحقيقي (لا `your-domain.tn` ولا `*`).
   - `FINANCE_PASSWORD_HASH` — الناتج عن `npm run finance:hash` (انظر أعلاه).
3. كلمة سر المدير الأولى — تُطبع مرة واحدة عند `npm run seed`؛ سجّلها وبدّلها فوراً بعد أول تسجيل دخول.
4. `VITE_API_URL` (في `docker-compose.yml`, خدمة `web`, تحت `build.args`) — القيمة المُدمَجة داخل bundle الواجهة وقت البناء ولا يمكن تغييرها لاحقاً بدون إعادة بناء. القيمة الحالية مناسبة للاختبار المحلي فقط. قبل نشر حقيقي:
   - إما ضعها إلى نطاقك الفعلي (مثال: `https://sidi-elhani.tn/api`)،
   - أو (الأفضل) اجعلها مساراً نسبياً `"/api"` واجعل Nginx يمرّر `/api` إلى backend — بهذه الطريقة تغيير النطاق مستقبلاً لا يستلزم إعادة بناء الواجهة.

### أمن الحاويات (containers)

- الحاويتان `api` و `web` تعملان بمستخدم غير جذري (`USER node`).
- المنافذ `4000` (api) و `3000` (web) و `5432` (db) مقيدة بـ `127.0.0.1` فقط — لا تعرِّض أياً منها للعموم.

### تحديث التبعيات

شغّل دورياً:
```bash
cd backend && npm audit
bun audit               # في جذر المشروع
```
يُنصح بتفعيل **Dependabot** (`.github/dependabot.yml`) أو **Renovate** بعد رفع المستودع على GitHub لتلقي تنبيهات تحديث الحزم تلقائياً.



```bash
# على الـ VPS
git clone <repo> /opt/sidi-elhani
cd /opt/sidi-elhani
cp .env.example .env
nano .env                               # POSTGRES_PASSWORD (قوي، عشوائي)
cp backend/.env.example backend/.env
nano backend/.env                       # JWT_SECRET, CORS_ORIGINS, DATABASE_URL (نفس كلمة السر أعلاه)

# عدّل docker-compose.yml: ضع نطاقك في VITE_API_URL (أو "/api" مع Nginx proxy)
docker compose up -d --build
docker compose exec api npm run db:push   # أو: npm run migrate إن استعملت prisma migrate
docker compose exec api npm run seed
```

ثم Nginx + Let's Encrypt:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/sidi-elhani.conf
# عدّل server_name
sudo ln -s /etc/nginx/sites-available/sidi-elhani.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.tn -d www.your-domain.tn
```

الخدمات بعد التشغيل:

| Service | Port (localhost only) |
| ------- | --------------------- |
| web (TanStack) | `127.0.0.1:3000` |
| api (Express)  | `127.0.0.1:4000` |
| db (Postgres)  | `127.0.0.1:5432` |

Nginx فقط هو المُعرّض على 80/443.

## نقاط API

### عمومية (بدون مصادقة)
- `GET  /api/public/courses`
- `GET  /api/public/news`
- `GET  /api/public/competitions`
- `GET  /api/public/gallery`

### مصادقة
- `POST /api/auth/login` → `{ token, user }`
- `GET  /api/auth/me`

### Admin (Bearer + role=admin)
- `GET/POST /api/admin/users`, `POST /api/admin/users/:id/reset-password`
- `POST /api/admin/courses`, `POST /api/admin/courses/:id/enroll`
- `POST /api/admin/news`, `GET/POST /api/admin/finance`, `GET /api/admin/stats`

### Instructor
- `GET /api/instructor/courses`, `GET /api/instructor/courses/:id/students`
- `POST /api/instructor/attendance`, `POST /api/instructor/evaluations`

### Student
- `GET /api/student/courses`, `/attendance`, `/evaluations`

## ربط الواجهة بـ API

طبقة البيانات الحالية في `src/lib/mock-data.ts` ثابتة (mocks).
عند جاهزية الـ backend، استبدل صفوف الـ exports بدوال تجلب من
`import.meta.env.VITE_API_URL` — مثلا:

```ts
const API = import.meta.env.VITE_API_URL;
export const fetchCourses = () => fetch(`${API}/public/courses`).then(r => r.json());
```

ثم استخدم TanStack Query في صفحات الراوتر:

```ts
const { data } = useSuspenseQuery({
  queryKey: ["courses"],
  queryFn: fetchCourses,
});
```

## الفضاءات (Spaces)

| الفضاء | الحالة |
| ------ | ------ |
| الفضاء العام | ✅ مكتمل (الرئيسية، الدورات، الأخبار، المسابقات، المعرض، عن الفرع) |
| فضاء الإدارة | 🚧 endpoints جاهزة في backend — UI لاحقا |
| فضاء المكوّن | 🚧 endpoints جاهزة في backend — UI لاحقا |
| فضاء التلميذ | 🚧 endpoints جاهزة في backend — UI لاحقا |
