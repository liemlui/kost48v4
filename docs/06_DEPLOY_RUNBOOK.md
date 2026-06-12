# KOST48 V5 — Runbook Deploy Produksi
**Versi:** 2026-06-12 — untuk rilis pasca Audit Mega (baseline kode lihat git main terbaru).
**Target:** VPS produksi, DB `kost48_v3` port 5432. JANGAN jalankan langkah DB di luar jendela deploy.

## 0. Pra-syarat
- [ ] Semua commit sudah di `origin/main`; `npx tsc --noEmit` backend & frontend = 0 error.
- [ ] Backup produksi: `pg_dump -h <host> -p 5432 -U postgres -Fc kost48_v3 > backup_pre_v513_$(Get-Date -Format yyyyMMdd).dump`
- [ ] Catat env produksi WAJIB terisi: `DATABASE_URL`, `JWT_SECRET` (kuat, bukan default), `CORS_ORIGIN` (domain frontend produksi — backend menolak start tanpa ini), `NODE_ENV=production`, `FRONTEND_URL`, `BREVO_API_KEY` + `MAIL_FROM_*` (reset password), opsional `RATE_LIMIT_GLOBAL_PER_MINUTE`/`RATE_LIMIT_AUTH_PER_15MIN`, `AUTO_OPS_ENABLED=true`, `AUTO_OPS_INTERVAL_MINUTES`.

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
4. `GET /api/deposit-ledger/reconciliation-lite` (admin) → catat baseline mismatch produksi; bila >0, review item lalu pertimbangkan backfill ledger (lihat `03_AUDIT_MEGA` E-jejak) SEBELUM tutup buku bulan berjalan.
5. `GET /api/accounting/readiness` → formalStatementReady; `GET /api/accounting/trial-balance?year=&month=` → isBalanced=true.

## 5. Pasca-deploy (hari yang sama)
- [ ] Buat `CashAccount` di menu accounting bila belum ada (saldo kas laporan kini dihitung dari jurnal — E-4; tanpa cash account bagian itu kosong).
- [ ] Jalankan sekali `POST /api/auto-ops/run` (admin) dan amati hasil: tidak boleh ada cancel tak terduga (filter sweeper sudah teruji UAT, tapi data produksi unik).
- [ ] Spot-check 1 penghuni nyata di portal (status, tagihan, dana titipan "disetor / target").
- [ ] Arsipkan: hasil pratinjau backfill, output reconciliation, nomor commit rilis.

## 6. Rollback
- Kode: `git checkout <commit-sebelumnya>` + build ulang + restart (semua perubahan DB bersifat additive — aman untuk kode lama).
- Data: restore `pg_restore` dari backup langkah 0 HANYA bila terjadi korupsi nyata (kehilangan transaksi pasca-backup harus dipertimbangkan).

## Catatan keputusan yang DITUNDA sadar (bukan blocker produksi)
- E-6 timezone WIB modul staf (batas hari checklist staf bergeser bila server UTC — set TZ server ke Asia/Jakarta sebagai mitigasi sementara).
- E-7 round-robin penugasan tiket otomatis (sekarang selalu staf ID terkecil).
- E-8 rangka unit test backend (proyek tersendiri; UAT runtime menyeluruh menjadi pagar sementara).
