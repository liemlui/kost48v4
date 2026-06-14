# KOST48 V5 — Deploy Produksi & PWA Hardening
**Versi:** 2026-06-13 — konsolidasi dari `archieve/_DEPRECATED_06_DEPLOY_RUNBOOK.md` dan `archieve/_DEPRECATED_08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md`.
**Target:** VPS produksi, DB `kost48_v3` port 5432. JANGAN jalankan langkah DB di luar jendela deploy.

<!-- KOST48_DOCS_SYNC_20260612_DEPLOY_PWA -->

---

## Bagian A — Runbook Deploy Produksi

### 0. Pra-syarat
- [ ] Semua commit di `origin/main`; `npx tsc --noEmit` backend & frontend = 0 error.
- [ ] Fase 1 di `08_CHECKLIST.md` selesai, termasuk harness finance dan rekonsiliasi.
- [ ] Owner mengonfirmasi database target masih kosong/testing dan menyetujui pembuatan ulang. Snapshot `pg_dump` boleh dibuat sebagai pengaman, tetapi **tidak untuk dimigrasikan** ke produksi baru.
- [ ] Env produksi WAJIB: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (domain frontend — backend tolak start tanpa ini), `NODE_ENV=production`, `FRONTEND_URL`, `BREVO_API_KEY` + `MAIL_FROM_*`. Auto-ops: **VPS/always-on** → `AUTO_OPS_ENABLED=true` (+`AUTO_OPS_INTERVAL_MINUTES`); **shared hosting/Passenger (mis. IDwebhost)** → `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` + cPanel Cron ke `GET /api/auto-ops/cron` (Bagian D).
- [ ] **F4-2 PWA Web Push (opsional tapi disarankan):** set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:owner@...`). Generate sekali: `node -e "console.log(require('web-push').generateVAPIDKeys())"` (dependency `web-push` sudah terpasang). **Tanpa env ini push otomatis NONAKTIF** (notif in-app tetap jalan, tak error). Dispatch push ikut sweeper auto-ops (`runPushDispatch`) → di shared hosting pastikan cPanel Cron `GET /api/auto-ops/cron` aktif. Frontend butuh HTTPS (service worker) agar tenant bisa opt-in.
- [ ] Canonical frontend: `https://app.kost48surabaya.com`. `CORS_ORIGIN` dan `FRONTEND_URL` pakai host ini.

### 1. Build
```powershell
cd backend;  npm ci; npm run build      # prisma generate + nest build
cd ../frontend; npm ci; npm run build   # tsc + vite build -> dist/
```

### 2. Database Bersih, Skema & Pagar DB
Provision database produksi kosong `kost48_v3`. Bila database bernama sama sudah berisi data, berhenti dan minta persetujuan owner sebelum drop/recreate.

**Skema = 2 opsi SETARA** (pilih salah satu), **lalu WAJIB jalankan `bootstrap.sql` + addendum**:
```powershell
cd backend
# --- Opsi A (disarankan utk prod, sejak squash baseline 2026-06-14): replay migration ---
npx prisma migrate deploy        # buat seluruh schema dari migrations/00000000000000_baseline
# --- Opsi B (lama, tetap valid): db push ---
# npx prisma db push             # schema.prisma langsung ke DB (tanpa ledger migration)

# --- WAJIB sesudahnya (kedua opsi) — pagar DB di LUAR schema Prisma ---
psql -h <host> -p 5432 -U postgres -d kost48_v3 -f sql/bootstrap.sql
psql -h <host> -p 5432 -U postgres -d kost48_v3 -f sql/bootstrap_v4_addendum.sql
```
- **Squash baseline (2026-06-14):** rantai migration lama (tak lengkap) di-arsip ke `prisma/_archive_migrations_pre_baseline/`; kini ada **1 baseline** `prisma/migrations/00000000000000_baseline/migration.sql` = SELURUH schema (41 tabel/54 enum/192 index/90 FK). Terverifikasi: `migrate deploy` ke DB kosong → 42 tabel sukses; `migrate diff` baseline vs schema = empty.
- **`bootstrap.sql` WAJIB** baik pakai Opsi A maupun B: trigger, CHECK constraint (mis. konsistensi deposit), advisory lock generate ticket-number, index tambahan, dan **carve-out guard deposit F3-16** TIDAK ada di schema Prisma. Idempotent (DROP IF EXISTS lalu CREATE).
- **Rehearsal 2026-06-13 (DB throwaway 5433): `db push`→41 tabel + `bootstrap.sql`+addendum apply BERSIH (0 error), 2 unique index + 7 check constraint + 8 trigger + 231 index terbentuk.** Aman di produksi.
- **DB yang sudah ada tapi dibangun via `db push` (mis. UAT lama):** ledger `_prisma_migrations` tak sinkron. Selaraskan sekali: `DELETE FROM "_prisma_migrations"` lalu `npx prisma migrate resolve --applied 00000000000000_baseline` → `migrate status` "up to date". (Prod fresh tak perlu ini.)

**Tidak ada backfill E-2 atau migrasi data UAT.** Seed hanya data fondasi: COA, periode OPEN, opening balance produksi, dan CashAccount.

> ⚠️ **PRASYARAT seed (temuan rehearsal F1-12): DB fresh TIDAK punya user.** `bootstrap.sql` tidak membuat User dan belum ada seed script. Endpoint seed (COA/period/opening/cashaccount) butuh auth ADMIN/OWNER. Maka langkah #0 sebelum seed: **buat user OWNER pertama** — INSERT manual ke tabel `"User"` (password bcrypt) ATAU sediakan seed script. Tanpa ini, runbook seed via API tidak bisa jalan. (Rekomendasi: tambahkan `prisma/seed.ts` minimal OWNER untuk produksi.)

- [ ] Seed COA.
- [ ] Buat periode OPEN dan opening balance produksi.
- [ ] Buat `CashAccount` Cash (1000) dan Bank (1010).

### 3. Restart & Smoke
1. Restart backend (PM2/systemd). Tunggu log "AutoOps aktif".
2. Smoke API:
   - `GET /api/public/rooms?limit=1` → 200
   - `GET /api/stays?limit=1` → 401
   - `POST /api/auth/login` admin → token; `GET /api/auth/me` → 200
3. Deploy frontend dist/; cek `/rooms` & login.
   - HTTP wajib redirect HTTPS (HSTS).
   - Deep link `/login`, `/portal/stay`, `/notifications` → SPA `index.html`.
   - Aset tidak ada → 404, bukan `index.html`.
   - CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy di host frontend.
   - `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`.
   - `/manifest.webmanifest`: `application/manifest+json`, `no-cache`.
   - `/index.html`: `Cache-Control: no-cache`.
   - `/assets/<hash>.*`: `public, max-age=31536000, immutable`.
4. `GET /api/deposit-ledger/reconciliation-lite` → catat baseline.
5. `GET /api/accounting/readiness` → formalStatementReady; trial-balance → isBalanced=true.

### 4. Pasca-Deploy
- [ ] Jalankan `POST /api/auto-ops/run` sekali; amati hasil.
- [ ] Spot-check onboarding penghuni pertama ketika data produksi pertama tersedia.
- [ ] Arsipkan: hasil smoke, reconciliation, opening balance, dan commit SHA.

### 5. Rollback
- Kode: `git checkout <sebelumnya>` + build + restart (perubahan DB additive — aman).
- Data: restore `pg_restore` hanya bila korupsi nyata.
- PWA: rollback `index.html`, manifest, `sw.js` sebagai satu set.

### Catatan Ditunda
- E-6 TZ WIB staf: set TZ server Asia/Jakarta.
- E-7 Round-robin tiket.
- E-8 test suite luas; harness finance minimum F1-T tetap wajib sebelum deploy.

---

## Bagian B — PWA Audit & Hardening Plan

### Status Audit
- **Source:** PWA MVP installable, fondasi dasar sehat (manifest, ikon, SW hanya di PROD, API/auth tidak masuk Cache Storage).
- **Produksi:** **RED / release blocker** (build 1 Mei 2026, HTTP tidak redirect, tanpa security headers, SW cache 7 hari, manifest MIME salah, API 503).

### Yang Sudah Sehat
1. SW registrasi hanya `import.meta.env.PROD`.
2. `/api/*` + request `Authorization` tidak masuk Cache Storage.
3. Tidak ada IndexedDB data bisnis, background sync, retry transaksi offline.
4. Navigasi network-first, bukan cache-first.
5. React Query dibersihkan saat login/logout.
6. `AppNotification` pusat notifikasi in-app.

### Temuan Kritis
| ID | Severity | Temuan | Status (source) |
|----|----------|--------|-----------------|
| PWA-01 | CRITICAL | Produksi tertinggal (v1 vs v2) | Perlu deploy ulang |
| PWA-02 | CRITICAL | HTTP tidak redirect HTTPS | Perlu konfigurasi hosting |
| PWA-03 | CRITICAL | Frontend tanpa security headers (CSP/HSTS/dll) | Perlu hosting |
| PWA-04 | HIGH | Cache terlalu luas (catch-all GET) | SELESAI (allowlist) |
| PWA-05 | HIGH | Aktivasi hapus cache origin lain | SELESAI (prefix `kost48-`) |
| PWA-06 | HIGH | Update worker tidak terkoordinasi | SELESAI (UI update + reload) |
| PWA-07 | HIGH | Header cache produksi salah | Perlu hosting |
| PWA-08 | HIGH | Delivery auth + cache bukti bayar belum aman | SELESAI (blob Bearer, no-store) |
| PWA-09 | HIGH | Belum ada kontrak UX offline | SELESAI (banner, fallback, block mutation) |
| PWA-10 | MEDIUM | Precache best-effort bisa kosong | SELESAI |
| PWA-11 | MEDIUM | Launch/manifest belum role-aware | SELESAI |
| PWA-12 | MEDIUM | Tidak ada install/update UX | SELESAI |
| PWA-13 | MEDIUM | Ikon lemah visual | BELUM |
| PWA-14 | MEDIUM | Cold start berat (552 kB gzip) | SELESAI tahap 1 (272 KiB) |
| PWA-15 | MEDIUM | Runbook belum uji kontrak PWA | Sudah merge ke sini |
| PWA-16 | MEDIUM | Belum test/observability PWA | BELUM |
| PWA-17 | PLANNED | Push notification belum | Phase 3 |

### Plan Perkuatan Bertahap

#### Phase 0 — Release Gate Produksi (0.5-1.5 hari)
- Canonical frontend `https://app.kost48surabaya.com`.
- HTTP → HTTPS redirect + HSTS + security headers.
- Deploy `dist/` dari commit tercatat.
- MIME + cache header sesuai PWA-07.
- SPA fallback untuk navigation, 404 untuk aset hilang.
- API public rooms 200.

#### Phase 1 — Cache Safety, Update, Offline UX (2-4 hari)
- [x] Allowlist cache aset publik, prefix `kost48-`.
- [x] Precache shell + build ID otomatis.
- [x] Update worker + UI prompt + reload terkontrol.
- [x] Offline banner + fallback `/offline.html` + block mutation.
- [x] Bukti bayar: blob fetch Bearer, object URL revoke, `private, no-store`.
- [ ] Smoke test cache isolation dua akun.

#### Phase 2 — Installability & Performance (2-5 hari)
- [x] Manifest `id`, role-aware launch, tanpa lock orientasi.
- [x] Install CTA + update UX.
- [x] Shortcut manifest publik.
- [x] Code split per role/route.
- [ ] Ikon launcher/maskable/badge desain ulang.
- [ ] Screenshots manifest + budget akhir JS <250 kB gzip, CSS <80 kB gzip.

#### Phase 3 — Web Push dengan Outbox (4-8 hari)
- Data model: `PushSubscription`, `PushDelivery`, `NotificationPreference`.
- Backend: VAPID, subscribe/unsubscribe, outbox delivery, retry 429/5xx, cleanup 410.
- Frontend: permission dari klik user, register setelah login, detach saat logout.
- `push` handler: payload minimal, `notificationclick` hanya path same-origin.
- In-app notification tetap source of truth.
- Urutan kategori: reminder kontrak → pembayaran → checkout/renew → tiket → announcement.

#### Phase 4 — Offline Operasional Terbatas (opsional)
Draft tiket/laporan staf setelah Phase 0-3 stabil. Wajib: IndexedDB, idempotency key, status queued/sent/failed. JANGAN queue approval pembayaran, jurnal, invoice, checkout, mutasi stok.

### Matriks Kemampuan PWA
| Kemampuan | Status |
|-----------|--------|
| Install Home Screen/Desktop | AKTIF |
| Offline app shell | AKTIF |
| Mutation offline | DILARANG |
| Kamera langsung | AKTIF OPT-IN |
| Push notification | DITUNDA (Phase 3) |
| Background Sync | DITUNDA KETAT |
| Web Share, App Badge | OPSIONAL NANTI |
| Wake Lock, Geo, Mic, NFC | TIDAK AKTIF |

### Verifikasi Implementasi (Source)
- Backend build: PASS. Frontend build: PASS (1,477 modul, 76 JS chunk, entry 272 KiB gzip).
- Build ID otomatis: `c2aoy-NA1HTp`.
- `npm run pwa:verify`: PASS.
- `dist/` memuat `sw.js`, `offline.html`, `manifest.webmanifest`.

### Risiko Tersisa
1. Produksi belum aman sampai deploy (HTTP, CSP, MIME, API 503, drift build).
2. JWT di `localStorage` — migrasi ke HttpOnly cookie butuh desain refresh/session.
3. Upload orphan file — tambahkan cleanup job sebelum skala besar.
4. Rate limiter in-memory — multi-replica perlu Redis.
5. Entry JS di atas target 250 KiB.

---

## Bagian C — Go-live Lokal/LAN (self-host, WiFi kos)

Untuk kos 1 lokasi tanpa VPS: jalankan stack di PC kos, akses dari HP via WiFi kos. **Prasyarat:** DB `kost48_v3` sudah di-provision + seed (lihat Bagian A / dijalankan 2026-06-13 di server lokal).

**⭐⭐ PALING SIMPEL — COMBINED 1 SERVER, 1 PORT (rekomendasi) — dari root `final_bundle/`:**
```bash
npm run golive:1        # 1 proses di port 3000 yg serve frontend+API; build relatif /api (host-agnostic)
npm run golive:1:fast   # jalankan saja, tanpa rebuild
```
Backend menyajikan frontend (`backend/client`) + API di **1 port (3000)** → **firewall cukup 3000**, **tanpa CORS**, frontend **tak perlu rebuild** saat ganti IP/host/domain. Akses: `http://<ip-lan>:3000`. Ini juga **fondasi deploy cPanel** (entry `dist/main.js`). Diuji live ✓.

**⭐ ALTERNATIF — 2 proses terpisah (backend 3000 + frontend 5173):**
```bash
npm run golive        # pastikan port 3000+5173 bebas (auto-kill) -> build:lan -> jalankan backend+frontend bareng
npm run golive:fast   # tanpa rebuild frontend
```
Port **tetap** 3000/5173 (proses lama dihentikan, `--strictPort`). Ctrl+C menutup keduanya. Zero-dependency.

**Atau manual per-paket (zero-dependency, IP LAN auto-deteksi):**
```bash
# Backend (mode produksi, DB kost48_v3, CORS LAN auto, auto-ops on)
cd backend && npm run golive          # = scripts/golive.mjs -> npm run start

# Frontend (build menuju IP LAN, lalu serve di 0.0.0.0:5173)
cd frontend && npm run build:lan && npm run golive
```
- `backend npm run golive`: set `NODE_ENV=production`, `DATABASE_URL` (derive `.env` → `kost48_v3`), `CORS_ORIGIN` dari semua IPv4 LAN terdeteksi `:5173`, `PORT=3000`, `AUTO_OPS_ENABLED=true`.
- `frontend npm run build:lan`: deteksi IP LAN → tulis `.env.production.local` (`VITE_API_BASE_URL=http://<ip>:3000/api`, gitignored) → build. `golive`: `vite preview --host 0.0.0.0 --port 5173`.

**Firewall (sekali, sebagai Administrator):**
```powershell
New-NetFirewallRule -DisplayName "KOST48 LAN backend 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
New-NetFirewallRule -DisplayName "KOST48 LAN frontend 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173
```
**Akses HP:** WiFi kos → `http://<ip-lan>:5173` (mis. `http://192.168.1.200:5173`). **Persistensi:** biarkan 2 terminal terbuka, atau pakai PM2. **Catatan:** PWA install/offline butuh HTTPS (non-localhost) → pakai mkcert bila perlu; set IP statis/DHCP-reservation agar URL tetap (kalau IP ganti, ulangi `build:lan`); ganti password OWNER `admin123`.

---

## Bagian D — Publish ke cPanel (host owner — DIKONFIRMASI MAMPU 2026-06-13)

**Kesiapan host (owner cek 2026-06-13):** Node.js App ✅ (versi dukung) · PostgreSQL ✅ · SSH ✅ · build di server ✅ · AutoSSL ✅. Resource: upgrade bila kurang (ideal RAM ≥512MB-1GB). **#4 TERJAWAB (IDwebhost 2026-06-14):** shared hosting Passenger **TIDAK always-on** (proses Node di-idle/restart saat sepi; tak ada minimum-instances/keep-alive). **Cron Job DIDUKUNG** via cPanel menu "Cron Jobs". → Auto-ops WAJIB digerakkan cron eksternal (in-process timer tak andal di idle-sleep).

**Status kode:** ✅ Combined single-server SUDAH dibangun (entry `dist/main.js` serve `client/` + API). ✅ Paket deploy ramping & script cPanel tersedia. ✅ **Endpoint cron auto-ops SUDAH dibuat.**
- **Auto-ops via cron (SELESAI):** di shared hosting set **`AUTO_OPS_ENABLED=false`** (matikan setInterval in-process yang tak andal) + **`AUTO_OPS_CRON_TOKEN=<rahasia panjang>`**. Endpoint publik token-protected: **`GET /api/auto-ops/cron`** dengan header `X-Cron-Token: <rahasia>` (atau query `?token=<rahasia>`). Panggilan ini sekaligus membangunkan app + menjalankan `runAll`. cPanel **Cron Jobs** tiap 5–10 menit:
  `curl -fsS -H "X-Cron-Token: <rahasia>" https://domain/api/auto-ops/cron >/dev/null 2>&1` (fallback wget: `wget -q -O /dev/null "https://domain/api/auto-ops/cron?token=<rahasia>"`).
  Token salah/kosong → 403. (Di VPS/always-on boleh sebaliknya: `AUTO_OPS_ENABLED=true`, cron opsional.)

**Runbook cPanel (combined, RAMPING):**
1. **LOKAL:** `npm run make-deploy` → hasil folder `deploy/` (backend source + frontend prebuilt `client/`, TANPA node_modules; + `kost48-deploy.tgz`). Frontend tak perlu dibangun di server.
2. **PostgreSQL** (cPanel → PostgreSQL Databases): buat DB `kost48_v3` + user; catat kredensial.
3. **Upload** isi `deploy/` ke folder app cPanel (File Manager extract `kost48-deploy.tgz`, atau git).
4. **Setup Node.js App**: pilih versi Node, set **Application startup file = `dist/main.js`**.
5. **SSH (di Node venv): `npm run cpanel:setup`** → `npm ci` + build (prisma generate engine Linux + tsc) + `prune --omit=dev` (ramping). `frontend/node_modules` TIDAK perlu di server.
6. **Env** (cPanel "Environment Variables"): `DATABASE_URL`(postgres cPanel), `JWT_SECRET`(baru, kuat), `NODE_ENV=production`, `CORS_ORIGIN=https://domain` (same-origin → domain saja), **`AUTO_OPS_ENABLED=false`** (shared hosting: digerakkan cron, bukan setInterval), **`AUTO_OPS_CRON_TOKEN=<rahasia panjang>`**. (PORT diatur Passenger.)
7. **Schema+seed (SSH, sekali): `npm run cpanel:migrate`** (= `prisma db push`; alternatif sejak baseline 2026-06-14: `npx prisma migrate deploy`) → **WAJIB** `psql "<DATABASE_URL>" -f sql/bootstrap.sql` + `bootstrap_v4_addendum.sql` (trigger/CHECK/carve-out F3-16 di luar schema Prisma) → seed **OWNER** (INSERT bcryptjs) → login OWNER lalu seed COA (`POST /api/accounting/default-coa/seed`) + periode OPEN + CashAccount.
8. **Restart App** (Passenger pakai `dist/main.js`). **AutoSSL** domain → HTTPS (PWA penuh).
9. **Auto-ops**: pasang cPanel **Cron Job** tiap 5–10 menit memanggil `GET /api/auto-ops/cron` dgn `X-Cron-Token` (perintah lengkap di "Status kode" atas). Verifikasi: jalankan manual sekali → cek notif/sweeper berjalan.
10. Smoke: `https://domain/` (frontend) · `https://domain/api/public/rooms` 200 · login OWNER · trial-balance balanced · reconciliation-lite mismatch=0.

⚠️ **Ganti password OWNER** dari `admin123`. ⚠️ Jika host ternyata MySQL-only / no-SSH → cPanel batal, pakai VPS. (README ringkas juga ada di dalam paket: `deploy/README-DEPLOY.md`.)
