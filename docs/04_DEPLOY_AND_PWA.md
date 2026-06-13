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
- [ ] Env produksi WAJIB: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (domain frontend — backend tolak start tanpa ini), `NODE_ENV=production`, `FRONTEND_URL`, `BREVO_API_KEY` + `MAIL_FROM_*`, `AUTO_OPS_ENABLED=true`, `AUTO_OPS_INTERVAL_MINUTES`.
- [ ] Canonical frontend: `https://app.kost48surabaya.com`. `CORS_ORIGIN` dan `FRONTEND_URL` pakai host ini.

### 1. Build
```powershell
cd backend;  npm ci; npm run build      # prisma generate + nest build
cd ../frontend; npm ci; npm run build   # tsc + vite build -> dist/
```

### 2. Database Bersih, Skema & Pagar DB
Provision database produksi kosong `kost48_v3`. Bila database bernama sama sudah berisi data, berhenti dan minta persetujuan owner sebelum drop/recreate.

```powershell
cd backend
npx prisma db push
psql -h <host> -p 5432 -U postgres -d kost48_v3 -f sql/bootstrap.sql
psql -h <host> -p 5432 -U postgres -d kost48_v3 -f sql/bootstrap_v4_addendum.sql
```
bootstrap.sql idempotent (DROP IF EXISTS lalu CREATE). **Rehearsal 2026-06-13 (DB throwaway 5433): `prisma db push`→41 tabel + `bootstrap.sql`+addendum apply BERSIH (0 error), 2 unique index + 7 check constraint + 8 trigger + 231 index terbentuk.** Aman dijalankan di produksi.

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

**Perintah (zero-dependency, IP LAN auto-deteksi):**
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
