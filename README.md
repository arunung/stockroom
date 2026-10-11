# Stockroom — ระบบจัดการคลังสินค้า (Supabase + Cloudflare Pages)

เว็บแอปรับเข้า / จ่ายออก / ย้าย-ปรับยอด / ยอดคงเหลือแยก Location / รายงาน / พิมพ์เอกสาร / ยกเลิกเอกสาร  
ฐานข้อมูล: **Supabase** (Postgres + Auth + Realtime + Storage) · โฮสต์: **Cloudflare Pages** · ไม่มี server ของตัวเอง

```
เบราว์เซอร์ ──► Cloudflare Pages (ไฟล์ static: index.html, app.js, shim.js)
     │
     └────────► Supabase  (Auth อีเมล+รหัสผ่าน · Postgres + RLS · Realtime · Storage รูปสินค้า)
```

สิทธิ์ผู้ใช้ถูกบังคับที่ **ฐานข้อมูล (Row Level Security)** ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ

| บทบาท | ดูข้อมูล | รับเข้า/จ่าย/ย้าย | ปรับยอด (ADJ) | แก้ master (สินค้า/Location) | ยกเลิกเอกสาร | ผู้ใช้ & ตั้งค่า |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| pending (สมัครใหม่) | – | – | – | – | – | – |
| viewer | ✔ | – | – | – | – | – |
| clerk | ✔ | ✔ | – | – | – | – |
| manager | ✔ | ✔ | ✔ | ✔ | ✔ | – |
| admin | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

> ตารางตรวจด้วยชุดทดสอบ RLS 42 รายการบน Postgres 16 จำลอง (`npm run test:rls`) — **ยังไม่ได้ทดสอบกับโปรเจกต์ Supabase จริง**

---

## ขั้นตอนติดตั้ง (ใช้เวลา ~30 นาที, ไม่เสียเงิน)

### 1) สร้างโปรเจกต์ Supabase
1. สมัคร/เข้า https://supabase.com → **New project** → ตั้งชื่อ `stockroom`, Region **Southeast Asia (Singapore)**, ตั้ง Database password (เก็บไว้)
2. **Authentication → Sign In / Providers → Email** → ปิด **Confirm email** (ให้ใช้งานได้ทันทีหลังสมัคร — ผู้ใช้ใหม่ยังเข้าข้อมูลไม่ได้จนกว่า admin อนุมัติ)
3. **SQL Editor → New query** → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run** (รันซ้ำได้ปลอดภัย)
4. **Project Settings → API Keys** → คัดลอก **Project URL** และ **anon / publishable key**  
   ⚠ ห้ามใช้ `service_role` / `secret` key ในเว็บเด็ดขาด (build จะปฏิเสธให้)

### 2) ตั้งค่า config
แก้ `config.js`:
```js
window.STOCKROOM_CONFIG={supabaseUrl:"https://xxxx.supabase.co",supabaseAnonKey:"eyJ... หรือ sb_publishable_..."};
```
หรือไม่แก้ไฟล์ แต่ตั้ง Environment variables `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ที่ Cloudflare (ข้อ 4) — build จะเขียนทับให้  
(anon key เป็น public ได้ — ความปลอดภัยอยู่ที่ RLS)

### 3) สมัครผู้ใช้คนแรก แล้วตั้งเป็น admin
1. เปิดเว็บ (ลองในเครื่อง: `npm ci && npm run serve` → http://localhost:8080) → แท็บ **สมัครใช้งาน**
2. กลับไป Supabase **SQL Editor** แล้วรัน (เปลี่ยนอีเมล):
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
3. รีเฟรชเว็บ → เข้าเมนู **ผู้ใช้ & ตั้งค่า** เพื่ออนุมัติคนอื่นและกำหนดบทบาท

### 4) Push ขึ้น GitHub แล้วต่อ Cloudflare Pages
```bash
cd stockroom
git remote add origin https://github.com/<user>/stockroom.git   # สร้าง repo (แนะนำ Private) ก่อน
git push -u origin main
# หรือถ้าติดตั้ง GitHub CLI:  gh repo create stockroom --private --source=. --push
```
Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → เลือก repo แล้วตั้ง:

| ช่อง | ค่า |
|---|---|
| Framework preset | None |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Environment variables | `NODE_VERSION=22`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

Deploy เสร็จได้ URL `https://<project>.pages.dev` — ทุกครั้งที่ push เข้า `main` จะ deploy ใหม่อัตโนมัติ

### 5) กัน Supabase pause (สำคัญสำหรับ Free plan)
Free plan จะ **pause โปรเจกต์ที่ไม่มีการใช้งานราว 1 สัปดาห์** → ใน GitHub repo ไปที่ **Settings → Secrets and variables → Actions** เพิ่ม  
`SUPABASE_URL`, `SUPABASE_ANON_KEY` แล้วเปิด tab **Actions** → เปิดใช้ workflow `keepalive` (ทำงานทุกวัน เรียก `ping()`)  
ข้อควรรู้: GitHub จะปิด scheduled workflow เองถ้า repo ไม่มี activity ~60 วัน — ถ้าถูกปิดให้กด Enable ใหม่

### 6) สำรองข้อมูล (แนะนำ)
Free plan **ไม่มี daily backup อัตโนมัติ** — ทางเลือก:
- เปิด workflow `backup` (pg_dump รายสัปดาห์ เก็บเป็น artifact 30 วัน) ต้องตั้ง secret `SUPABASE_DB_URL` (Session pooler connection string) — **ยังไม่ได้ทดสอบจริง ให้กด Run workflow ทดสอบก่อนพึ่งพา**
- หรือ export ผ่านเมนูรายงานในแอปเป็นระยะ

---

## ข้อจำกัด Free tier / ข้อควรระวัง
> ตัวเลขโควตาเปลี่ยนได้ — ตรวจที่หน้า Pricing ของ Supabase และ Cloudflare ก่อนใช้งานจริง

- **Supabase Free**: DB ~500 MB, Storage ~1 GB, Egress ~5 GB/เดือน, pause เมื่อไม่ active ~1 สัปดาห์, ไม่มี daily backup
  - แอปลด egress ด้วย IndexedDB cache + delta sync (โหลดเฉพาะรายการที่เปลี่ยน) — เป็นการออกแบบ ยังไม่ได้วัดการใช้งานจริง
  - เอกสาร (docs) เป็น ledger แก้ไม่ได้ ยกเว้น admin; การ "ยกเลิก" ใช้เอกสาร void แยก
- **อีเมลสมัคร/รีเซ็ตรหัสผ่าน**: Free ใช้ SMTP ของ Supabase ซึ่งจำกัดจำนวนอีเมลต่อชั่วโมงมาก — แอปปิด Confirm email ไว้ และ **ไม่มีหน้า "ลืมรหัสผ่าน"** ให้ admin รีเซ็ตที่ Supabase Dashboard → Authentication → Users
- **รูปสินค้า**: bucket `photos` เป็น public (ใครมี URL ก็เปิดได้) จำกัด 2 MB/ไฟล์ (jpeg/png/webp) — อย่าอัปโหลดรูปที่เป็นความลับ
- **Cloudflare Pages Free**: static hosting + bandwidth ไม่จำกัด, จำนวน build ต่อเดือนจำกัด (ตรวจโควตาปัจจุบัน)
- **CSP**: `public/_headers` ตั้ง Content-Security-Policy เข้ม (script จาก origin เดียว, เชื่อมต่อ `*.supabase.co` เท่านั้น) — ถ้าย้ายไป Supabase self-host/โดเมนอื่นต้องแก้ `connect-src` / `img-src`
- **พิมพ์ PDF**: สร้างในเบราว์เซอร์เอง (ไม่พึ่ง library) — ทดสอบแล้วบน Chromium; **Safari/มือถือจริงยังไม่ได้ทดสอบ**

## โครงสร้าง repo
```
src/            ซอร์สแอป (HTML/CSS/JS) + shim.js (adapter ไป Supabase)
supabase/schema.sql   ตาราง + RLS + trigger + RPC + bucket รูป
build.mjs       build → dist/ (และ dist/artifact.html ไฟล์เดียวสำหรับ claude.ai)
public/_headers security headers สำหรับ Cloudflare Pages
config.js       ใส่ Supabase URL + anon key
test/           rls-test.sql (42 checks), e2e.py (Playwright + Supabase จำลอง), serve.py
.github/workflows/  keepalive.yml, backup.yml
```

## ทดสอบ
```bash
npm run build
npm run test:rls         # ต้องมี Postgres ในเครื่อง — ดู test/run-rls.sh
python3 test/serve.py dist 8790 &   # เซิร์ฟเวอร์ที่ใช้ header จาก _headers
npm run test:e2e         # ต้องมี playwright (pip install playwright)
```
