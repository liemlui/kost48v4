# KOST48 V5 — Ground State (Ringkas)
**Versi:** 2026-06-12 — pasca Audit Mega + eksekusi 24 FIX + UAT runtime penuh (baseline kode `a5c8477`). Versi V5.10.0 lama diarsipkan di `archieve/00_GROUND_STATE_V5100_STALE.md`, JANGAN dipakai sebagai referensi.
**Aturan:** file ini hanya memuat fakta yang sudah diverifikasi dari kode. Detail per-flow ada di `01_FLOW_MAP.md` (peta `file:baris`). Riwayat perubahan di `CHANGELOG.md` (entri V5.11.0+; lebih lama di `archieve/CHANGELOG_PRE_V5110.md`).

<!-- KOST48_DOCS_SYNC_20260611_GROUND_STATE_REWRITE -->

## 1. Identitas & Stack
- **KOST48 Surabaya** — kost eksklusif pria, 48 kamar (33 reguler, 10 eksklusif, 5 VIP), Ngagel Jaya Utara.
- Backend: NestJS + TypeScript + Prisma + PostgreSQL. Auth JWT Bearer (expiry 24 jam, tanpa refresh token). Swagger non-production saja.
- Frontend: React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- Keamanan: header manual di `main.ts` (TANPA Helmet — keputusan sadar), rate limit in-memory (`common/middleware/rate-limit.middleware.ts`): global 300/menit/IP, auth 10/15 menit/IP.
- DB: `kost48_v3_pro` (UAT, port 5433) / `kost48_v3` (produksi, 5432). **40 model** aktif di schema.prisma.
- Role enum: **OWNER, ADMIN, STAFF, TENANT** (tidak ada SUPER_ADMIN/FINANCE).

## 2. Konsep kunci (wajib paham sebelum menyentuh kode)
- **Tidak ada model Booking.** Satu `Stay` mewakili seluruh siklus: booking = Stay ACTIVE + Room RESERVED + belum promoted; huni = promoted (`initialMetersPromotedAt` terisi) + Room OCCUPIED.
- **DP ≠ Deposit (ketetapan owner):**
  - **DP** (`Stay.downPayment*`) = uang muka pesan kamar, 30% sewa, bagian harga sewa, **hangus** bila gagal lunas (jurnal `DP_FORFEIT`).
  - **Deposit jaminan** (`Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`) = uang titipan, dicek saat checkout, **refundable** via settlement + ledger.
- **Alur booking:** bayar DP 30% (atau lunas langsung) → DP approved = kamar terkunci (pesaing batal) → pelunasan + jaminan paling lambat saat check-in → gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- **First paid wins:** multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- **Overstay lifecycle:** pengingat H-7/H-3/H-1/H-day → H-day pk 12:00 kamar dibuka publik + tiket EVICT_OVERSTAY → H+1 pk 12:00 forced checkout otomatis → kamar MAINTENANCE + `allowBookingWhileCleaning=true` (kotor tapi bisa dipesan; huni menunggu tiket pembersihan ditutup). Pengecualian: tagihan belum lunas → tidak auto-checkout, admin dapat alert.
- **Tanpa denda keterlambatan** (keputusan owner D1, 2026-06-11). Line invoice `PENALTY` hanya untuk potongan manual.
- **Notifikasi hanya in-app** (keputusan D2); rencana jangka panjang: PWA push. Belum ada email/WA nyata.
- **Auto-ops = 9 job sequential** (`auto-ops.service.ts`): bookingExpiry, roomHealer, roomReleaseAtNoon, downPaymentForfeit, contractEndReminders, overstayEnforcement, overstayForcedCheckout, postCheckoutAutoCancel, accountingAutoClose.
- **Akuntansi Auto Journal Lite:** jurnal otomatis idempotent per (sourceType, sourceId); auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh). Reversal cancel invoice kini blocking di semua jalur (fix A8).
- **Room readiness gate:** kamar tidak pernah AVAILABLE tanpa tiket CHECKOUT_INSPECTION ditutup.

## 3. Status audit & pengujian (per 2026-06-12)
- **Audit Mega full-sweep selesai** (`03_AUDIT_MEGA_2026-06.md`): 42 temuan, 24 FIX dieksekusi & diverifikasi (commit e4a8c31..f9d10ac), 8 quick-win UI/UX terpasang (`05_UIUX_AUDIT_2026-06-12.md`).
- **UAT runtime PASS (DB UAT, 2026-06-12):** siklus DP→pelunasan (M-09 recalc DP, M-12 expiresAt mati, M-07 promoted) · siklus overstay penuh (pengingat H-3/H-day → tiket EVICT → forced checkout H+1 → kamar kotor-bisa-dipesan → settlement deposit berjurnal+ledger → gate room-ready) · renew penuh (invoice sewa+meter, periode menyambung) · rekonsiliasi deposit **mismatch=0** · trial balance **seimbang**; selisih P&L ledger vs operasional terjelaskan 100%.
- **E-2 backfill DONE di UAT** (11 stay manual di-promote; ulangi di PRODUKSI saat deploy bersama bootstrap.sql).
- **SIAP PRODUKSI (2026-06-12 larut):** E-1 guard global default-deny (+@Public), E-3 jaminan check-in manual (ledger+jurnal), E-4 saldo kas dari jurnal, E-5 liability HELD, E-9 hardening — semua terverifikasi runtime. 5 skenario residual PASS (A1-guard, first-paid-wins, expiry live, DP-forfeit H+1, blokir-aktivasi-kamar-kotor). Rekonsiliasi akhir 21 stay mismatch=0. Deploy: ikuti `06_DEPLOY_RUNBOOK.md`. Sisa sadar-risiko: A13/A15; ditunda: E-6 (mitigasi: TZ server Asia/Jakarta), E-7, E-8.

## 4. Akun default & perintah
- admin@kost48.com/admin123 · staff@kost48.com/staff123 · tenant.g2@kost48.com/tenant123 · liem.lui@gmail.com/admin123 (OWNER).
- Backend: `npx tsc --noEmit` (check), `npm run start:dev`. Frontend: `npm run build` (tsc+vite), `npm run dev`. Base URL API: `http://localhost:3000/api`.

## 5. Aturan update dokumen
- Rilis baru → update file ini (tetap ringkas, <10 KB) + prepend entri di `CHANGELOG.md`. Jangan biarkan dua sumber kebenaran beda versi.
- File docs >30 KB → arsipkan bagian lama ke `docs/archieve/`.
