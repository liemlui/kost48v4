# KOST48 V5 — Deploy, PWA, Go-Live, Akun Dev

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Runbook deploy/PWA, checklist go-live, dan appendix akun dummy untuk DB pengembangan.

## Sumber Digabung

- `docs/04_DEPLOY_AND_PWA.md` - konten dipertahankan
- `docs/GO_LIVE_CHECKLIST.md` - konten dipertahankan
- `docs/archieve/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md` - update SI-1 event-path diserap

## Update 2026-07-08 — GATE-KTP-ENV Fix + Deploy Docs

Gate KTP diam-diam OFF di produksi telah diperbaiki (`settings.service.ts` semai nilai awal row dari env). Panduan deploy di §5 ditambah catatan "env = nilai awal, selanjutnya UI Settings → Operasional". Runbook onboarding tenant nyata sudah tersedia di `docs/RUNBOOK_ONBOARDING_TENANT_NYATA.md`.

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

**READY FOR GO-LIVE.** Audit keuangan ultra teliti LULUS: Trial balance balanced, deposit MATCHED, 8 invarian PASS, 0 unmapped transactions. DO-NOT-TOUCH blocks UTUH. Dead code minor `postPaymentReversalTx`. Runbook `M08 §3` smoke + env checklist siap.

## Update 2026-06-19 - Env Fase G AI Owner/Admin

Fitur AI berbayar bersifat opsional dan manual-only. Jika belum ingin memakai biaya API, kosongkan `DEEPSEEK_API_KEY` dan sistem harus tetap berjalan dengan fallback offline. Detail: `docs/M09_AI_OWNER_ADMIN.md`.

Env produksi yang disarankan saat AI diaktifkan:

```env
DEEPSEEK_API_KEY=<rahasia>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_FINANCE_MODEL=deepseek-v4-pro
AI_FEATURES_ENABLED=true
AI_MANUAL_ONLY=true
AI_OWNER_ADMIN_ONLY=true
AI_DAILY_REQUEST_LIMIT=50
AI_MAX_INPUT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1400
AI_FINANCE_MAX_OUTPUT_TOKENS=2200
AI_LOG_USAGE=true
```

Catatan deploy: jangan pernah expose API key ke frontend; semua panggilan DeepSeek wajib lewat backend.

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.
- Appendix akun dummy hanya untuk DB pengembangan; jangan dipakai untuk produksi.


## Bagian 1 - `docs/04_DEPLOY_AND_PWA.md`

### KOST48 V5 — Deploy Produksi & PWA Hardening
**Versi:** 2026-06-13 — konsolidasi dari `archieve/_DEPRECATED_06_DEPLOY_RUNBOOK.md` dan `archieve/_DEPRECATED_08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md`.
**Target:** VPS produksi, DB `kost48_v3` port 5432. JANGAN jalankan langkah DB di luar jendela deploy.

<!-- KOST48_DOCS_SYNC_20260612_DEPLOY_PWA -->

---

#### Bagian A — Runbook Deploy Produksi

##### 0. Pra-syarat
- [ ] Semua commit di `origin/main`; `npx tsc --noEmit` backend & frontend = 0 error.
- [ ] Fase 1 di `08_CHECKLIST.md` selesai, termasuk harness finance dan rekonsiliasi.
- [ ] Owner mengonfirmasi database target masih kosong/testing dan menyetujui pembuatan ulang. Snapshot `pg_dump` boleh dibuat sebagai pengaman, tetapi **tidak untuk dimigrasikan** ke produksi baru.
- [ ] Env produksi WAJIB: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (domain frontend — backend tolak start tanpa ini), `NODE_ENV=production`, `FRONTEND_URL`, `BREVO_API_KEY` + `MAIL_FROM_*`. Auto-ops: **VPS/always-on** → `AUTO_OPS_ENABLED=true` (+`AUTO_OPS_INTERVAL_MINUTES`); **shared hosting/Passenger (mis. IDwebhost)** → `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` + cPanel Cron ke `GET /api/auto-ops/cron` (Bagian D).
- [ ] **F4-2 PWA Web Push (opsional tapi disarankan):** set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:owner@...`). Generate sekali: `node -e "console.log(require('web-push').generateVAPIDKeys())"` (dependency `web-push` sudah terpasang). **Tanpa env ini push otomatis NONAKTIF** (notif in-app tetap jalan, tak error). Dispatch push ikut sweeper auto-ops (`runPushDispatch`) → di shared hosting pastikan cPanel Cron `GET /api/auto-ops/cron` aktif. Frontend butuh HTTPS (service worker) agar tenant bisa opt-in.
- [ ] **F3-17 Gate aktivasi KTP (L-4, WAJIB di produksi):** set **`KTP_ACTIVATION_GATE_ENABLED=true`**. **Default OFF** (agar UAT lancar) → bila lupa di-set, kamar bisa diaktifkan TANPA KTP terverifikasi (lawan maksud E1/UU PDP & D-17). Konsekuensi ON: aktivasi kamar (`stays.create`/approve booking) menolak bila tenant belum ada foto KTP terverifikasi. Opsional terkait: ambang cuci AC kWh `AC_CLEAN_KWH_THRESHOLD` (default 200) & rekonsiliasi jurnal `JOURNAL_RECONCILIATION_ENABLED` (default on, F5-6).
- [ ] **Fase G AI (opsional):** bila mengaktifkan DeepSeek, set `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-v4-flash`, `DEEPSEEK_FINANCE_MODEL=deepseek-v4-pro`, `AI_FEATURES_ENABLED=true`, `AI_MANUAL_ONLY=true`, limit harian, dan pastikan tombol AI hanya OWNER/ADMIN.
- [ ] Canonical frontend: `https://app.kost48surabaya.com`. `CORS_ORIGIN` dan `FRONTEND_URL` pakai host ini.

##### 1. Build
```powershell
cd backend;  npm ci; npm run build      # prisma generate + nest build
cd ../frontend; npm ci; npm run build   # tsc + vite build -> dist/
```

##### 2. Database Bersih, Skema & Pagar DB
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

##### 3. Restart & Smoke
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

##### 4. Pasca-Deploy
- [ ] Jalankan `POST /api/auto-ops/run` sekali; amati hasil.
- [ ] Spot-check onboarding penghuni pertama ketika data produksi pertama tersedia.
- [ ] Arsipkan: hasil smoke, reconciliation, opening balance, dan commit SHA.

##### 5. Rollback
- Kode: `git checkout <sebelumnya>` + build + restart (perubahan DB additive — aman).
- Data: restore `pg_restore` hanya bila korupsi nyata.
- PWA: rollback `index.html`, manifest, `sw.js` sebagai satu set.

##### Catatan Ditunda
- E-6 TZ WIB staf: set TZ server Asia/Jakarta.
- E-7 Round-robin tiket.
- E-8 test suite luas; harness finance minimum F1-T tetap wajib sebelum deploy.

---

#### Bagian B — PWA Audit & Hardening Plan

##### Status Audit
- **Source:** PWA MVP installable, fondasi dasar sehat (manifest, ikon, SW hanya di PROD, API/auth tidak masuk Cache Storage).
- **Produksi:** **RED / release blocker** (build 1 Mei 2026, HTTP tidak redirect, tanpa security headers, SW cache 7 hari, manifest MIME salah, API 503).

##### Yang Sudah Sehat
1. SW registrasi hanya `import.meta.env.PROD`.
2. `/api/*` + request `Authorization` tidak masuk Cache Storage.
3. Tidak ada IndexedDB data bisnis, background sync, retry transaksi offline.
4. Navigasi network-first, bukan cache-first.
5. React Query dibersihkan saat login/logout.
6. `AppNotification` pusat notifikasi in-app.

##### Temuan Kritis
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

##### Plan Perkuatan Bertahap

###### Phase 0 — Release Gate Produksi (0.5-1.5 hari)
- Canonical frontend `https://app.kost48surabaya.com`.
- HTTP → HTTPS redirect + HSTS + security headers.
- Deploy `dist/` dari commit tercatat.
- MIME + cache header sesuai PWA-07.
- SPA fallback untuk navigation, 404 untuk aset hilang.
- API public rooms 200.

###### Phase 1 — Cache Safety, Update, Offline UX (2-4 hari)
- [x] Allowlist cache aset publik, prefix `kost48-`.
- [x] Precache shell + build ID otomatis.
- [x] Update worker + UI prompt + reload terkontrol.
- [x] Offline banner + fallback `/offline.html` + block mutation.
- [x] Bukti bayar: blob fetch Bearer, object URL revoke, `private, no-store`.
- [ ] Smoke test cache isolation dua akun.

###### Phase 2 — Installability & Performance (2-5 hari)
- [x] Manifest `id`, role-aware launch, tanpa lock orientasi.
- [x] Install CTA + update UX.
- [x] Shortcut manifest publik.
- [x] Code split per role/route.
- [ ] Ikon launcher/maskable/badge desain ulang.
- [ ] Screenshots manifest + budget akhir JS <250 kB gzip, CSS <80 kB gzip.

###### Phase 3 — Web Push dengan Outbox (4-8 hari)
- Data model: `PushSubscription`, `PushDelivery`, `NotificationPreference`.
- Backend: VAPID, subscribe/unsubscribe, outbox delivery, retry 429/5xx, cleanup 410.
- Frontend: permission dari klik user, register setelah login, detach saat logout.
- `push` handler: payload minimal, `notificationclick` hanya path same-origin.
- In-app notification tetap source of truth.
- Urutan kategori: reminder kontrak → pembayaran → checkout/renew → tiket → announcement.

###### Phase 4 — Offline Operasional Terbatas (opsional)
Draft tiket/laporan staf setelah Phase 0-3 stabil. Wajib: IndexedDB, idempotency key, status queued/sent/failed. JANGAN queue approval pembayaran, jurnal, invoice, checkout, mutasi stok.

##### Matriks Kemampuan PWA
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

##### Verifikasi Implementasi (Source)
- Backend build: PASS. Frontend build: PASS (1,477 modul, 76 JS chunk, entry 272 KiB gzip).
- Build ID otomatis: `c2aoy-NA1HTp`.
- `npm run pwa:verify`: PASS.
- `dist/` memuat `sw.js`, `offline.html`, `manifest.webmanifest`.

##### Risiko Tersisa
1. Produksi belum aman sampai deploy (HTTP, CSP, MIME, API 503, drift build).
2. JWT di `localStorage` — migrasi ke HttpOnly cookie butuh desain refresh/session.
3. Upload orphan file — tambahkan cleanup job sebelum skala besar.
4. Rate limiter in-memory — multi-replica perlu Redis.
5. Entry JS di atas target 250 KiB.

---

#### Bagian C — Go-live Lokal/LAN (self-host, WiFi kos)

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

#### Bagian D — Publish ke cPanel (host owner — DIKONFIRMASI MAMPU 2026-06-13)

**Kesiapan host (owner cek 2026-06-13):** Node.js App ✅ (versi dukung) · PostgreSQL ✅ · SSH ✅ · AutoSSL ✅. **#4 TERJAWAB (IDwebhost 2026-06-14):** shared hosting Passenger **TIDAK always-on** (proses Node di-idle/restart saat sepi; tak ada minimum-instances/keep-alive). **Cron Job DIDUKUNG** via cPanel menu "Cron Jobs". → Auto-ops WAJIB digerakkan cron eksternal (in-process timer tak andal di idle-sleep).

**Resource host (statistik owner 2026-07-04):** RAM LVE **512MB** (139MB terpakai situs lama) · inode **46,7rb/75rb (62%)** · entry process 5/15 · Postgres OK. **Kesimpulan: CUKUP** dengan syarat: (a) **JANGAN build di server** (tsc/npm ci penuh bisa OOM + devDeps boros inode) → paket PREBUILT dari lokal; (b) situs lama di-off-kan (bebaskan RAM+inode); (c) heap Node dibatasi `NODE_OPTIONS=--max-old-space-size=192` via env cPanel (flag di `start:prod` package.json TIDAK dipakai Passenger). Estimasi runtime: idle 120-180MB, puncak ~250-300MB. Prisma client = WASM query compiler + driver adapter pg → platform-independent, TANPA `prisma generate` di server (binary `*.node` dibuang dari paket).

**Status kode:** ✅ Combined single-server SUDAH dibangun (entry `dist/main.js` serve `client/` + API). ✅ Paket deploy ramping & script cPanel tersedia. ✅ **Endpoint cron auto-ops SUDAH dibuat.**
- **Auto-ops via cron (SELESAI):** di shared hosting set **`AUTO_OPS_ENABLED=false`** (matikan setInterval in-process yang tak andal) + **`AUTO_OPS_CRON_TOKEN=<rahasia panjang>`**. Endpoint publik token-protected: **`GET /api/auto-ops/cron`** dengan header `X-Cron-Token: <rahasia>` (atau query `?token=<rahasia>`). Panggilan ini sekaligus membangunkan app + menjalankan `runAll`. cPanel **Cron Jobs** tiap 5–10 menit:
  `curl -fsS -X POST -H "X-Cron-Token: <rahasia>" https://domain/api/auto-ops/cron >/dev/null 2>&1` (fallback wget: `wget -q -O /dev/null --post-data="" --header="X-Cron-Token: <rahasia>" "https://domain/api/auto-ops/cron"`).
  Token salah/kosong → 403. (Di VPS/always-on boleh sebaliknya: `AUTO_OPS_ENABLED=true`, cron opsional.)

**Runbook cPanel (combined, PREBUILT — update 2026-07-04 utk RAM 512MB):**
1. **LOKAL:** `npm run make-deploy` → folder `deploy/` = backend **PREBUILT** `dist/` (+`dist/generated` Prisma client, binary `*.node` dibuang) + frontend prebuilt `client/` + `prisma/` + `sql/` + `scripts/seed-owner.js`; TANPA `src/`, TANPA node_modules; + `kost48-deploy.tgz`. **Server tidak build apa pun.** Jika `dist` sudah fresh, `npm run make-deploy:fast` bisa dipakai untuk bungkus ulang tanpa build.
2. **PostgreSQL** (cPanel → PostgreSQL Databases): buat DB `kost48_v3` + user; catat kredensial.
3. **Upload** `kost48-deploy.tgz` ke folder app cPanel → File Manager extract.
4. **Setup Node.js App**: Node 22, **Application startup file = `dist/main.js`**, env **`NODE_OPTIONS=--max-old-space-size=192`** (WAJIB via env cPanel, tidak bisa via `.env`).
5. **SSH (di Node venv): `npm run cpanel:install`** (= `npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund --progress=false` — prod deps saja dari lockfile deploy; tanpa tsc/prisma generate).
6. **Env**: salin `.env.example` → `.env` di root app (dibaca app via @nestjs/config + script seed): `DATABASE_URL`(postgres cPanel), `JWT_SECRET`(baru, kuat), `NODE_ENV=production`, `CORS_ORIGIN=https://domain` (same-origin → domain saja), **`AUTO_OPS_ENABLED=false`** (shared hosting: digerakkan cron, bukan setInterval), **`AUTO_OPS_CRON_TOKEN=<rahasia panjang>`**, **`KTP_ACTIVATION_GATE_ENABLED=true`** (L-4 — default OFF, wajib ON di produksi), VAPID (opsional, push). (PORT diatur Passenger.)
7. **Schema+seed (sekali):** schema via **psql/pgAdmin Query Tool**: `psql "<DATABASE_URL>" -f prisma/migrations/00000000000000_baseline/migration.sql` (fallback: `npm run cpanel:migrate` = `npx prisma db push --skip-generate`, jalankan saat app stop — npx unduh CLI sementara) → **WAJIB** `psql "<DATABASE_URL>" -f sql/bootstrap.sql` (trigger/CHECK/carve-out F3-16 di luar schema Prisma; addendum v4 SUDAH terkonsolidasi di dalamnya sejak file terpisah dihapus) → seed **OWNER**: `OWNER_EMAIL=... OWNER_PASSWORD=... npm run seed:owner` → login OWNER lalu seed COA (`POST /api/accounting/default-coa/seed`) + periode OPEN + CashAccount.
8. **Restart App** (Passenger pakai `dist/main.js`). **AutoSSL** domain → HTTPS (PWA penuh).
9. **Auto-ops**: pasang cPanel **Cron Job** tiap 5–10 menit memanggil `POST /api/auto-ops/cron` dgn `X-Cron-Token` (perintah lengkap di "Status kode" atas). Verifikasi: jalankan manual sekali → cek notif/sweeper berjalan.
10. Smoke: `https://domain/` (frontend) · `https://domain/api/public/rooms` 200 · login OWNER · trial-balance balanced · reconciliation-lite mismatch=0 · cPanel **Resource Usage: memory faults = 0** (bila ada fault → turunkan `NODE_OPTIONS` ke 160 atau upgrade paket).

⚠️ **Ganti password OWNER** dari `admin123`. ⚠️ Jika host ternyata MySQL-only / no-SSH → cPanel batal, pakai VPS. (README ringkas juga ada di dalam paket: `deploy/README-DEPLOY.md`.)


## Bagian 2 - `docs/GO_LIVE_CHECKLIST.md`

### GO-LIVE CHECKLIST — LAN dulu (2026-06-15)
**Target terpilih:** Lokal/LAN via `npm run golive` (uji di jaringan rumah/kos sebelum publik internet). Detail lengkap & opsi cPanel/VPS di `04_DEPLOY_AND_PWA.md`. **Kode siap:** Fase 1–5 + audit menyeluruh tuntas, `tsc` 0, unit 47/47, tak ada 🔴 bug.

> ⚠️ **LAN = http (bukan https).** Push PWA (VAPID) **tidak aktif** di LAN plain-http (browser butuh secure context); notif **in-app tetap jalan**. VAPID disiapkan untuk publish HTTPS nanti.

#### 🗂️ Struktur proyek — kenapa ada banyak `package.json`?
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

#### ⚡ RINGKAS — 3 langkah (LAN)
1. **Buat DB kosong** `kost48_v3` (Postgres port 5432) + isi `backend/.env` (lihat §0).
2. **`cd backend && npm run golive:setup`** ← satu perintah: schema + bootstrap.sql + OWNER + COA + periode OPEN + Kas/Bank.
3. **`npm run golive`** dari **root `final_bundle`** ← satu perintah jalankan backend+frontend → buka `http://<IP-LAN>:5173`.

---

#### 0. Prasyarat (sekali)
- [ ] PostgreSQL jalan di port **5432**; buat database kosong **`kost48_v3`**. (UAT memakai 5433 `kost48_v3_pro` — **JANGAN tertukar**; `golive:setup` & `golive` otomatis pakai `kost48_v3`.)
- [ ] Isi `backend/.env`:
  - `DATABASE_URL` (boleh tetap menunjuk `..._pro`; skrip otomatis swap ke `kost48_v3`), `JWT_SECRET` (kuat).
  - **`KTP_ACTIVATION_GATE_ENABLED=true`** ← **L-4, JANGAN lupa** (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifikasi).
  - (Opsional LAN) `BREVO_API_KEY`+`MAIL_FROM_*` (email reset password).

#### 1. Setup DB — SATU perintah
```
cd backend
OWNER_EMAIL=owner@kost48surabaya.com OWNER_PASSWORD='GANTI_password_kuat' OWNER_FULLNAME='Pemilik KOST48' npm run golive:setup
```
Otomatis & **idempoten** (aman diulang): build → `prisma db push` → `bootstrap.sql`+addendum → OWNER pertama → 37 akun COA → periode bulan berjalan OPEN → CashAccount **Kas Tunai (1000)** + **Bank Utama (1010, default)**.
- [ ] Skrip selesai dengan **"✅ SETUP SELESAI"**.
- [ ] (Opsional) **FAQ panduan tenant**: setelah `golive` jalan & login OWNER → `POST /api/faqs/seed` (atau kapan saja).
- [ ] (Opsional) **Saldo awal (opening balance)** kas/aset bila ada → isi via UI Akuntansi (default 0).

#### 3. (Sudah di §0) Env produksi
- [ ] Pastikan `KTP_ACTIVATION_GATE_ENABLED=true` sudah di `.env`.
- [ ] (Opsional, untuk publish HTTPS nanti) **VAPID push** — sepasang kunci sudah di-generate 2026-06-15 dan diberikan via chat (publicKey/privateKey/subject). **Tempel ke env produksi, JANGAN commit private key ke git.** Bila perlu generate ulang: `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
  ```
  VAPID_PUBLIC_KEY=<dari chat / generate>
  VAPID_PRIVATE_KEY=<RAHASIA — dari chat / generate, jangan commit>
  VAPID_SUBJECT=mailto:owner@kost48surabaya.com
  ```
  (Di LAN push tetap nonaktif — butuh HTTPS.)
- [ ] `AUTO_OPS_ENABLED=true` di-set otomatis oleh `golive` (server always-on lokal) — tak perlu cron.

#### 4. Jalankan
**Cara mudah (1 perintah, dari root `final_bundle`):**
- [ ] `npm run golive` → bebaskan port, build frontend LAN, jalankan backend `:3000` + frontend `:5173` **bersamaan**. Ctrl+C menutup keduanya.
- [ ] Catat **IP LAN** yang dicetak → akses dari HP/laptop lain: `http://<IP-LAN>:5173`

**Alternatif COMBINED (1 server/1 port :3000, mirip produksi):** `npm run golive:1` (backend menyajikan frontend + API sekaligus).

**Alternatif manual (2 terminal):** `cd backend && npm run golive` + `cd frontend && npm run golive`.

#### 5. Verifikasi pasca go-live (smoke test)
- [ ] Login OWNER berhasil; dashboard tampil.
- [ ] Buat 1 kamar + 1 tenant; coba booking → DP 30% → approve bukti → kamar OCCUPIED.
- [ ] Cek **Akuntansi**: Trial Balance **seimbang**; readiness period-close tak ada blocker liar.
- [ ] Aktivasi kamar **tanpa KTP terverifikasi → DITOLAK** (bukti `KTP_ACTIVATION_GATE_ENABLED=true` aktif).
- [ ] Menu **Panduan/Aturan** tenant tampil (FAQ ter-seed).
- [ ] Auto-ops berjalan (cek log sweeper tiap interval; mis. rekonsiliasi jurnal, AC cleaning).

#### 6. Naik ke PUBLIK INTERNET (setelah LAN OK)
- [ ] Pilih host (cPanel/IDwebhost shared **atau** VPS) — ikuti `04_DEPLOY_AND_PWA.md` Bagian D/E.
- [ ] Domain + **SSL/HTTPS** (push PWA baru aktif di HTTPS) → `CORS_ORIGIN`/`FRONTEND_URL`/canonical = domain final.
- [ ] cPanel shared: `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` + cPanel Cron → `POST /api/auto-ops/cron`.
- [ ] Set VAPID env (di atas) di host produksi → push aktif.
- [ ] SEO sudah 100/100 (Lighthouse, L-5) — submit `sitemap.xml` ke Google Search Console; sinkron dgn Google Business Profile (`kost48surabaya.com`).

---
**Catatan positioning (dari Google Business Profile, opsional):** profil muncul untuk pencarian "hotel"/"hotel terdekat" (3.168 tayang) → pertimbangkan kata kunci "kost"/"kost bulanan" diperkuat. Tarif harian Google (Rp377rb) jauh di atas pasar OYO — wajar karena ini kost bulanan, bukan hotel harian; pastikan deskripsi profil menegaskan "kost bulanan" agar ekspektasi tamu tepat.


## Bagian 3 - `docs/archieve/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md`

> DEV ONLY: akun dan data di bagian ini hanya untuk database pengembangan port 5433. Jangan pakai password ini di produksi.

### Akun Dummy DEV (login cepat) - SI-1 event-path

Data dummy **wajib dibuat lewat endpoint nyata (HTTP)**, bukan raw insert. Ini keputusan owner 2026-06-16: dummy harus melewati kejadian bisnis asli agar aturan service, invoice, deposit, meter, jurnal, dan audit trail ikut berjalan.

Login di `http://localhost:5173/login` (field `identifier` = email).

#### Cara isi ulang (wipe + reseed)

```bash
cd backend
node scripts/seed-dev-reset.js
# restart backend dev: npm run start:dev
node scripts/seed-dev-via-api.js
```

Alternatif npm:

```bash
npm run seed:dev:reset
npm run seed:dev:api
```

Seeder raw/bypass lama **usang** untuk data bisnis karena melewati aturan service. Jangan dipakai sebagai sumber data demo aktif.

#### Back-office

| Role | Email | Password |
|------|-------|----------|
| OWNER | `owner@kost48.com` | `Owner#2026` |
| ADMIN | `admin@kost48.com` | `admin123` |
| STAFF | `staff@kost48.com` | `staff123` |

#### Penghuni (TENANT)

Password semua tenant: `Tenant#2026`.

| Kamar | Nama | Email |
|-------|------|-------|
| K-A | Maya Pratiwi | `maya.tenant@kost48.test` |
| K-B | Dimas Saputra | `dimas.tenant@kost48.test` |
| K-C | Cindy Wijaya | `cindy.tenant@kost48.test` |
| K-D | Hendra Gunawan | `hendra.tenant@kost48.test` |
| K-E | Gita Lestari | `gita.tenant@kost48.test` |
| K-F | Indah Permata | `indah.tenant@kost48.test` |
| K-G | Bayu Nugroho | `bayu.tenant@kost48.test` |
| K-H | Karin Salsabila | `karin.tenant@kost48.test` |
| K-I | Lani Kusuma | `lani.tenant@kost48.test` |
| K-J | Rizky Ramadhan | `rizky.tenant@kost48.test` |
| K-K | Putri Anggraini | `putri.tenant@kost48.test` |
| K-L | Fajar Maulana | `fajar.tenant@kost48.test` |
| K-M | Sari Melati | `sari.tenant@kost48.test` |
| K-N | Andi Wirawan | `andi.tenant@kost48.test` |
| K-O | Nadia Safitri | `nadia.tenant@kost48.test` |
| K-P | Eko Prasetyo | `eko.tenant@kost48.test` |

Kamar `K-Q` sampai `K-T` tersedia untuk uji booking/check-in.

#### Isi data terverifikasi

- 20 kamar: 16 terisi, 4 kosong.
- 16 penghuni dan 16 stay ACTIVE promoted.
- 19 invoice: 16 sewa + 3 meter listrik; 12 PAID, 7 ISSUED.
- 16 deposit HELD Rp500.000/kamar, terjurnal.
- Trial balance seimbang dan tidak ada dobel-tagih.
