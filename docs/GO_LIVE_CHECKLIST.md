# GO-LIVE CHECKLIST — LAN dulu (2026-06-15)
**Target terpilih:** Lokal/LAN via `npm run golive` (uji di jaringan rumah/kos sebelum publik internet). Detail lengkap & opsi cPanel/VPS di `04_DEPLOY_AND_PWA.md`. **Kode siap:** Fase 1–5 + audit menyeluruh tuntas, `tsc` 0, unit 47/47, tak ada 🔴 bug.

> ⚠️ **LAN = http (bukan https).** Push PWA (VAPID) **tidak aktif** di LAN plain-http (browser butuh secure context); notif **in-app tetap jalan**. VAPID disiapkan untuk publish HTTPS nanti.

## ⚡ RINGKAS — 3 langkah
1. **Buat DB kosong** `kost48_v3` (Postgres port 5432) + isi `backend/.env` (lihat §0).
2. **`npm run golive:setup`** ← satu perintah: schema + bootstrap.sql + OWNER + COA + periode OPEN + Kas/Bank.
3. **`npm run golive`** (backend) + **`cd frontend && npm run golive`** (frontend) → buka `http://<IP-LAN>:5173`.

---

## 0. Prasyarat (sekali)
- [ ] PostgreSQL jalan di port **5432**; buat database kosong **`kost48_v3`**. (UAT memakai 5433 `kost48_v3_pro` — **JANGAN tertukar**; `golive:setup` & `golive` otomatis pakai `kost48_v3`.)
- [ ] Isi `backend/.env`:
  - `DATABASE_URL` (boleh tetap menunjuk `..._pro`; skrip otomatis swap ke `kost48_v3`), `JWT_SECRET` (kuat).
  - **`KTP_ACTIVATION_GATE_ENABLED=true`** ← **L-4, JANGAN lupa** (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifikasi).
  - (Opsional LAN) `BREVO_API_KEY`+`MAIL_FROM_*` (email reset password).

## 1. Setup DB — SATU perintah
```
cd backend
OWNER_EMAIL=owner@kost48surabaya.com OWNER_PASSWORD='GANTI_password_kuat' OWNER_FULLNAME='Pemilik KOST48' npm run golive:setup
```
Otomatis & **idempoten** (aman diulang): build → `prisma db push` → `bootstrap.sql`+addendum → OWNER pertama → 37 akun COA → periode bulan berjalan OPEN → CashAccount **Kas Tunai (1000)** + **Bank Utama (1010, default)**.
- [ ] Skrip selesai dengan **"✅ SETUP SELESAI"**.
- [ ] (Opsional) **FAQ panduan tenant**: setelah `golive` jalan & login OWNER → `POST /api/faqs/seed` (atau kapan saja).
- [ ] (Opsional) **Saldo awal (opening balance)** kas/aset bila ada → isi via UI Akuntansi (default 0).

## 3. (Sudah di §0) Env produksi
- [ ] Pastikan `KTP_ACTIVATION_GATE_ENABLED=true` sudah di `.env`.
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
