# GO-LIVE CHECKLIST — LAN dulu (2026-06-15)
**Target terpilih:** Lokal/LAN via `npm run golive` (uji di jaringan rumah/kos sebelum publik internet). Detail lengkap & opsi cPanel/VPS di `04_DEPLOY_AND_PWA.md`. **Kode siap:** Fase 1–5 + audit menyeluruh tuntas, `tsc` 0, unit 47/47, tak ada 🔴 bug.

> ⚠️ **LAN = http (bukan https).** Push PWA (VAPID) **tidak aktif** di LAN plain-http (browser butuh secure context); notif **in-app tetap jalan**. VAPID disiapkan untuk publish HTTPS nanti.

## 🗂️ Struktur proyek — kenapa ada banyak `package.json`?
Ada **4** `package.json`, masing-masing beda peran. **Frontend & backend tetap TERPISAH di source** (dua aplikasi independen) — yang "jadi satu" hanyalah saat **mode combined / deploy**.

| Lokasi | Peran | Diedit? |
|---|---|---|
| **`backend/package.json`** | Aplikasi **backend** (NestJS+Prisma). Dependency + script backend (`start`, `build`, `golive`, **`golive:setup`**, `seed:owner`). | ✅ source |
| **`frontend/package.json`** | Aplikasi **frontend** (React+Vite). Dependency + script frontend (`dev`, `build`, `build:lan`, `golive`). | ✅ source |
| **`package.json` (root `final_bundle`)** | **Orchestrator/peluncur** — TANPA dependency. Hanya script untuk menjalankan **kedua app sekaligus**: `golive` (2 port), `golive:1` (combined 1 port), `make-deploy`. | ✅ source (jarang) |
| **`deploy/package.json`** | **HASIL GENERATE** dari `npm run make-deploy` (= salinan backend + frontend yang sudah di-build di `deploy/client/`). Untuk di-upload ke cPanel/VPS. **gitignored — JANGAN edit manual** (akan ditimpa saat generate ulang). | ❌ artefak |

**3 cara menjalankan (semua opsional, pilih sesuai kebutuhan):**
- **`npm run golive`** (dari root) → backend `:3000` + frontend `:5173` **bersamaan, 1 terminal** (paling mudah untuk LAN). ← dipakai checklist ini.
- **`npm run golive:1`** (dari root) → **COMBINED 1 server/1 port** (`:3000`): backend menyajikan frontend + API sekaligus. Ini wujud "frontend+backend jadi satu" (mirip produksi).
- **`npm run make-deploy`** (dari root) → buat folder `deploy/` siap upload ke hosting (cPanel/VPS), nanti di server: `npm ci → npm run build → node dist/main.js`.

> Folder lain di root yang **bukan source** (artefak/abaikan): `node_modules/`, `*.zip`, `kost48-deploy.tgz`, `tmp_*.log`, `deploy/`, `frontend/dist`, `backend/dist`.

## ⚡ RINGKAS — 3 langkah (LAN)
1. **Buat DB kosong** `kost48_v3` (Postgres port 5432) + isi `backend/.env` (lihat §0).
2. **`cd backend && npm run golive:setup`** ← satu perintah: schema + bootstrap.sql + OWNER + COA + periode OPEN + Kas/Bank.
3. **`npm run golive`** dari **root `final_bundle`** ← satu perintah jalankan backend+frontend → buka `http://<IP-LAN>:5173`.

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

## 4. Jalankan
**Cara mudah (1 perintah, dari root `final_bundle`):**
- [ ] `npm run golive` → bebaskan port, build frontend LAN, jalankan backend `:3000` + frontend `:5173` **bersamaan**. Ctrl+C menutup keduanya.
- [ ] Catat **IP LAN** yang dicetak → akses dari HP/laptop lain: `http://<IP-LAN>:5173`

**Alternatif COMBINED (1 server/1 port :3000, mirip produksi):** `npm run golive:1` (backend menyajikan frontend + API sekaligus).

**Alternatif manual (2 terminal):** `cd backend && npm run golive` + `cd frontend && npm run golive`.

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
