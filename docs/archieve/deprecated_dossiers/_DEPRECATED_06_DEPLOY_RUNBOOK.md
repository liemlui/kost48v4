# KOST48 V5 — Runbook Deploy Produksi
**Versi:** 2026-06-12 — untuk rilis pasca Audit Mega (baseline kode lihat git main terbaru).
**Target:** VPS produksi, DB `kost48_v3` port 5432. JANGAN jalankan langkah DB di luar jendela deploy.

## 0. Pra-syarat
- [ ] Semua commit sudah di `origin/main`; `npx tsc --noEmit` backend & frontend = 0 error.
- [ ] Backup produksi: `pg_dump -h <host> -p 5432 -U postgres -Fc kost48_v3 > backup_pre_v513_$(Get-Date -Format yyyyMMdd).dump`
- [ ] Catat env produksi WAJIB terisi: `DATABASE_URL`, `JWT_SECRET` (kuat, bukan default), `CORS_ORIGIN` (domain frontend produksi — backend menolak start tanpa ini), `NODE_ENV=production`, `FRONTEND_URL`, `BREVO_API_KEY` + `MAIL_FROM_*` (reset password), opsional `RATE_LIMIT_GLOBAL_PER_MINUTE`/`RATE_LIMIT_AUTH_PER_15MIN`, `AUTO_OPS_ENABLED=true`, `AUTO_OPS_INTERVAL_MINUTES`.
- [ ] Canonical frontend diputuskan: `https://app.kost48surabaya.com`; `CORS_ORIGIN` dan `FRONTEND_URL` harus memakai host ini, bukan domain website lama.
- [ ] Catat commit SHA yang dibuild agar versi HTML, manifest, service worker, dan API dapat dicocokkan setelah deploy.

## 1. Build
```powershell
cd backend;  npm ci; npm run build      # prisma generate + nest build
cd ../frontend; npm ci; npm run build   # tsc + vite build -> dist/
```

## 2. Skema & pagar DB (sekali per deploy)
```powershell
cd backend
npx prisma db push          # skema additive (Room.allowBookingWhileCleaning, Stay.downPayment*, dst.)
psql -h <host> -p 5432 -U postgres -d kost48_v3 -f sql/bootstrap.sql   # trigger + CHECK termasuk stay_down_payment_amount_chk (M-01)
```
> bootstrap.sql idempotent (DROP IF EXISTS lalu CREATE). Bila `stay_down_payment_amount_chk` gagal karena data lama `downPaymentPaid > downPaymentAmount`, perbaiki datanya dulu — itu data korup nyata.

## 3. Backfill data WAJIB (E-2) — penghuni lama check-in manual
Tanpa ini penghuni lama tersisih dari pengingat/overstay/okupansi (temuan M-14).
```sql
BEGIN;
-- pratinjau dulu:
SELECT s.id, t."fullName", r.code FROM "Stay" s
JOIN "Room" r ON r.id = s."roomId" JOIN "Tenant" t ON t.id = s."tenantId"
WHERE s.status='ACTIVE' AND s."initialMetersPromotedAt" IS NULL AND r.status='OCCUPIED';
-- eksekusi (kriteria sama persis — booking RESERVED TIDAK tersentuh):
UPDATE "Stay" s SET "initialMetersPromotedAt" = s."checkInDate"::timestamp
FROM "Room" r WHERE r.id = s."roomId"
  AND s.status='ACTIVE' AND s."initialMetersPromotedAt" IS NULL AND r.status='OCCUPIED';
COMMIT;
```
Preseden UAT: 11 baris, okupansi langsung benar (0%→55%). Simpan hasil pratinjau sebagai arsip.

## 4. Restart & smoke (urutan ini)
1. Restart backend (PM2/systemd). Tunggu log "AutoOps aktif setiap N menit".
2. Smoke API (PowerShell, ganti host):
   - `GET /api/public/rooms?limit=1` tanpa token → **200** (guard global E-1: @Public bekerja)
   - `GET /api/stays?limit=1` tanpa token → **401**
   - `POST /api/auth/login` admin → token; `GET /api/auth/me` → 200
   - `GET /api/faqs/public` → 200
3. Deploy frontend dist/ ke hosting; cek halaman `/rooms` & login.
   - HTTP wajib redirect 301/308 ke HTTPS.
   - Deep link `/login`, `/portal/stay`, dan `/notifications` wajib kembali ke SPA `index.html`.
   - Request aset yang tidak ada wajib 404, bukan salah dikembalikan sebagai `index.html`.
   - Host frontend wajib membawa CSP, HSTS, X-Content-Type-Options, Referrer-Policy, dan Permissions-Policy. Header backend API tidak menggantikan header frontend.
   - Karena bukti lapangan mendukung kamera, gunakan `Permissions-Policy: camera=(self), microphone=(), geolocation=()`. Jangan memakai `camera=()` pada host frontend.
   - CSP frontend harus mengizinkan `worker-src 'self'`, `connect-src` ke API canonical, serta `img-src 'self' blob: data:` agar media privat hasil fetch Bearer dapat dipreview.
   - `/sw.js`: JavaScript + `Cache-Control: no-cache, no-store, must-revalidate`.
   - `/manifest.webmanifest`: `application/manifest+json` + `Cache-Control: no-cache`.
   - `/index.html`: `Cache-Control: no-cache`.
   - `/assets/<hash>.*`: `Cache-Control: public, max-age=31536000, immutable`.
4. `GET /api/deposit-ledger/reconciliation-lite` (admin) → catat baseline mismatch produksi; bila >0, review item lalu pertimbangkan backfill ledger (lihat `03_AUDIT_MEGA` E-jejak) SEBELUM tutup buku bulan berjalan.
5. `GET /api/accounting/readiness` → formalStatementReady; `GET /api/accounting/trial-balance?year=&month=` → isBalanced=true.

### 4A. Smoke PWA produksi

```powershell
curl.exe -I http://app.kost48surabaya.com/rooms
curl.exe -I https://app.kost48surabaya.com/rooms
curl.exe -I https://app.kost48surabaya.com/sw.js
curl.exe -I https://app.kost48surabaya.com/manifest.webmanifest
curl.exe https://app.kost48surabaya.com/version.json
curl.exe -I "https://api.kost48surabaya.com/api/public/rooms?limit=1"
```

- [ ] HTTP app tidak pernah membalas aplikasi dengan 200; harus redirect HTTPS.
- [ ] HTML/worker/manifest sesuai commit rilis, bukan build lama.
- [ ] `version.json`, meta `kost48-build` pada HTML, dan `BUILD_ID` di `sw.js`
      identik. Cache Storage memakai suffix build tersebut.
- [ ] API public rooms = 200, bukan 503.
- [ ] Browser fresh profile: worker registered, manifest terbaca, icon tidak 404.
- [ ] Offline reload menunjukkan fallback yang jelas; mutation bisnis tidak dapat disubmit.
- [ ] Bila worker lama masih aktif, update muncul dan reload terkontrol memuat versi baru.
- [ ] Android/iPhone: tombol `Ambil Foto` membuka kamera belakang; `Pilih dari Galeri` tetap tersedia; upload JPG/PNG/WebP valid berhasil.
- [ ] Tenant/staf yang tidak berhak tidak dapat membuka foto tiket/pengumuman milik konteks lain.
- [ ] Bukti pembayaran, tiket, dan pengumuman merespons `Cache-Control: private, no-store` dan tidak masuk Cache Storage.
- [ ] Detail acceptance test: `08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md`.

## 5. Pasca-deploy (hari yang sama)
- [ ] Buat `CashAccount` di menu accounting bila belum ada (saldo kas laporan kini dihitung dari jurnal — E-4; tanpa cash account bagian itu kosong).
- [ ] Jalankan sekali `POST /api/auto-ops/run` (admin) dan amati hasil: tidak boleh ada cancel tak terduga (filter sweeper sudah teruji UAT, tapi data produksi unik).
- [ ] Spot-check 1 penghuni nyata di portal (status, tagihan, dana titipan "disetor / target").
- [ ] Arsipkan: hasil pratinjau backfill, output reconciliation, nomor commit rilis.

## 6. Rollback
- Kode: `git checkout <commit-sebelumnya>` + build ulang + restart (semua perubahan DB bersifat additive — aman untuk kode lama).
- Data: restore `pg_restore` dari backup langkah 0 HANYA bila terjadi korupsi nyata (kehilangan transaksi pasca-backup harus dipertimbangkan).
- PWA: rollback juga harus mengembalikan `index.html`, manifest, dan `sw.js` sebagai satu set. Jangan hanya rollback JS/CSS; verifikasi client lama dapat menerima worker rollback/update tanpa menunggu cache server.

## Catatan keputusan yang DITUNDA sadar (bukan blocker produksi)
- E-6 timezone WIB modul staf (batas hari checklist staf bergeser bila server UTC — set TZ server ke Asia/Jakarta sebagai mitigasi sementara).
- E-7 round-robin penugasan tiket otomatis (sekarang selalu staf ID terkecil).
- E-8 rangka unit test backend (proyek tersendiri; UAT runtime menyeluruh menjadi pagar sementara).
