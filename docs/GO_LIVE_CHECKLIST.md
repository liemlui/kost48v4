# GO-LIVE CHECKLIST — LAN dulu (2026-06-15)
**Target terpilih:** Lokal/LAN via `npm run golive` (uji di jaringan rumah/kos sebelum publik internet). Detail lengkap & opsi cPanel/VPS di `04_DEPLOY_AND_PWA.md`. **Kode siap:** Fase 1–5 + audit menyeluruh tuntas, `tsc` 0, unit 47/47, tak ada 🔴 bug.

> ⚠️ **LAN = http (bukan https).** Push PWA (VAPID) **tidak aktif** di LAN plain-http (browser butuh secure context); notif **in-app tetap jalan**. VAPID disiapkan untuk publish HTTPS nanti.

## 0. Prasyarat
- [ ] PostgreSQL jalan di port **5432** (DB produksi `kost48_v3`). UAT memakai 5433 `kost48_v3_pro` — **JANGAN tertukar**.
- [ ] `backend/.env` punya `DATABASE_URL`, `JWT_SECRET` (kuat), `BREVO_API_KEY`+`MAIL_FROM_*` (untuk email reset password; opsional saat LAN).

## 1. Siapkan DB produksi fresh `kost48_v3`
- [ ] Buat database kosong `kost48_v3` (port 5432).
- [ ] Dari `backend/`: `npx prisma migrate deploy` **ATAU** `npx prisma db push` (set `DATABASE_URL` → `kost48_v3` dulu).
- [ ] **WAJIB** jalankan SQL di luar schema Prisma (trigger/CHECK/carve-out F3-16):
  - `psql "<DATABASE_URL kost48_v3>" -f sql/bootstrap.sql`
  - `psql "<DATABASE_URL kost48_v3>" -f sql/bootstrap_v4_addendum.sql`

## 2. Seed data awal
- [ ] **Seed OWNER pertama** (prasyarat F1-12 — DB fresh tak punya user):
  ```
  cd backend
  OWNER_EMAIL=owner@kost48surabaya.com OWNER_PASSWORD='GANTI_password_kuat' OWNER_FULLNAME='Pemilik KOST48' npm run seed:owner
  ```
  (Idempoten: aman diulang; tak menimpa bila email sudah ada. Pakai DATABASE_URL yang menunjuk `kost48_v3`.)
- [ ] Login OWNER lalu seed via API (butuh token OWNER):
  - `POST /api/accounting/default-coa/seed` (COA 38 akun)
  - Buat **periode akuntansi OPEN** bulan berjalan
  - Buat **CashAccount** + **opening balance** (saldo awal kas/aset bila ada)
  - `POST /api/faqs/seed` (FAQ panduan tenant — operasional + marketing)

## 3. Env produksi (set di `backend/.env`)
- [ ] `KTP_ACTIVATION_GATE_ENABLED=true` ← **L-4, JANGAN lupa** (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifikasi).
- [ ] (Opsional, untuk publish HTTPS nanti) **VAPID push** — sepasang kunci sudah di-generate 2026-06-15 dan diberikan via chat (publicKey/privateKey/subject). **Tempel ke env produksi, JANGAN commit private key ke git.** Bila perlu generate ulang: `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
  ```
  VAPID_PUBLIC_KEY=<dari chat / generate>
  VAPID_PRIVATE_KEY=<RAHASIA — dari chat / generate, jangan commit>
  VAPID_SUBJECT=mailto:owner@kost48surabaya.com
  ```
  (Di LAN push tetap nonaktif — butuh HTTPS.)
- [ ] `AUTO_OPS_ENABLED=true` di-set otomatis oleh `golive` (server always-on lokal) — tak perlu cron.

## 4. Jalankan (2 terminal)
- [ ] Backend (port 3000, DB `kost48_v3`, CORS auto-LAN): `cd backend && npm run golive`
- [ ] Frontend (port 5173, API ke IP LAN): `cd frontend && npm run golive`
- [ ] Catat **IP LAN** yang dicetak go-live → akses dari HP/laptop lain: `http://<IP-LAN>:5173`

## 5. Verifikasi pasca go-live (smoke test)
- [ ] Login OWNER berhasil; dashboard tampil.
- [ ] Buat 1 kamar + 1 tenant; coba booking → DP 30% → approve bukti → kamar OCCUPIED.
- [ ] Cek **Akuntansi**: Trial Balance **seimbang**; readiness period-close tak ada blocker liar.
- [ ] Aktivasi kamar **tanpa KTP terverifikasi → DITOLAK** (bukti `KTP_ACTIVATION_GATE_ENABLED=true` aktif).
- [ ] Menu **Panduan/Aturan** tenant tampil (FAQ ter-seed).
- [ ] Auto-ops berjalan (cek log sweeper tiap interval; mis. rekonsiliasi jurnal, AC cleaning).

## 6. Naik ke PUBLIK INTERNET (setelah LAN OK)
- [ ] Pilih host (cPanel/IDwebhost shared **atau** VPS) — ikuti `04_DEPLOY_AND_PWA.md` Bagian D/E.
- [ ] Domain + **SSL/HTTPS** (push PWA baru aktif di HTTPS) → `CORS_ORIGIN`/`FRONTEND_URL`/canonical = domain final.
- [ ] cPanel shared: `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` + cPanel Cron → `GET /api/auto-ops/cron`.
- [ ] Set VAPID env (di atas) di host produksi → push aktif.
- [ ] SEO sudah 100/100 (Lighthouse, L-5) — submit `sitemap.xml` ke Google Search Console; sinkron dgn Google Business Profile (`kost48surabaya.com`).

---
**Catatan positioning (dari Google Business Profile, opsional):** profil muncul untuk pencarian "hotel"/"hotel terdekat" (3.168 tayang) → pertimbangkan kata kunci "kost"/"kost bulanan" diperkuat. Tarif harian Google (Rp377rb) jauh di atas pasar OYO — wajar karena ini kost bulanan, bukan hotel harian; pastikan deskripsi profil menegaskan "kost bulanan" agar ekspektasi tamu tepat.
