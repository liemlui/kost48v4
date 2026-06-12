# KOST48 V5 — Active Checklist
**Versi:** 2026-06-12 — pasca Audit Mega. Versi lama (V5.10.0, basi) diarsipkan di `archieve/CHECKLIST_V5100_STALE.md`.
**Aturan:** file ini hanya berisi pekerjaan AKTIF. Item selesai dipindah ke `CHANGELOG.md`, bukan ditumpuk di sini.

## Prioritas #0 — Pasca-eksekusi Audit Mega (update 2026-06-12 sore)
- [x] 24/24 FIX diterapkan AI eksekutor & diverifikasi Fable — commit e4a8c31..f9d10ac (PUSHED)
- [x] **E-2 backfill DONE (DB UAT 5433):** 11 stay penghuni nyata (kamar OCCUPIED) diisi `initialMetersPromotedAt = checkInDate`; 1 booking RESERVED dikecualikan. Pre-state: `scripts/uat/E2_BACKFILL_PRESTATE_2026-06-12.txt`. Efek terverifikasi: okupansi finance 0% → 55% (11/20). ⚠️ Ulangi backfill yang sama di PRODUKSI saat deploy.
- [x] **UAT M-07/M-09 PASS SEMUA** via `scripts/uat/UAT_M07_M09_CLEAN.ps1` (booking publik → tenant baru → approve tarif 2jt → DP recalc 600rb ✓M-09 → DP approved + expiresAt mati ✓M-12 → approve ulang 409 ✓ → pelunasan → promoted ✓M-07 + kamar OCCUPIED + jaminan 500rb). Artefak tes: stay #15 (kamar G2-003); stay #14 (booking sisa) dibiarkan auto-expire sweeper.
- [x] **UAT siklus overstay §4.2 PASS PENUH** (stay tes #15, 2026-06-12 sore): pengingat H-3 ✓ → H-day (pengingat "HARI INI" + tiket EVICT_OVERSTAY) ✓ → H+1 forced checkout otomatis (COMPLETED, kamar MAINTENANCE + allowBookingWhileCleaning, tiket pembersihan, notif 🚪 tenant) ✓ → settlement PARTIAL_REFUND (potong 100rb + refund 400rb; jurnal POSTED `JE-AUTO-DEPOSIT-SETTLEMENT-15`; ledger 3 entri seimbang → saldo 0) ✓ → tutup tiket pembersihan → kamar AVAILABLE + flag reset ✓
- [x] **Rekonsiliasi §4.4:** `reconciliation-lite` → ready=True, 15 stay, **mismatch=0**; ledger-backfill dry-run wouldCreate=0. Catatan by-design: 11 deposit demo lama belum punya jurnal liability (deposit sengaja dikecualikan dari auto-backfill agar tidak double-posting) + invoice demo #4 total 0 — keduanya PR data demo, bukan bug.
- [x] **UAT renew penuh §4.3 PASS** (stay #1 Andi): request tenant → approve admin → invoice ISSUED 1.794.250 (RENT 1,7jt + 50 kWh×1.445 + 4 m³×5.500), periode menyambung 30 Jun→30 Jul tanpa gap, planned bergeser, approve ulang 409. Artefak: invoice INV-1-R-570953 (tunggakan wajar Andi).
- [x] **Cross-check P&L vs trial balance PASS:** trial balance seimbang (104.494.250 = 104.494.250); P&L ledger Juni 3.894.250 vs operasional 3.794.250 — selisih tepat 100rb = pendapatan potongan deposit (4400) non-invoice, by design. Semua angka teruji sampai ke rupiah.
- [x] **Eskalasi E-1/E-3/E-4/E-5/E-9 DIIMPLEMENTASIKAN + verifikasi runtime** (2026-06-12 larut; lihat CHANGELOG): guard global default-deny, jaminan check-in manual (ledger+jurnal), saldo kas dari jurnal, finance HELD, map cap + hapus kode mati.
- [x] **5 skenario residual PASS runtime** (S1 A1-guard, S2 first-paid-wins+notif, S3 expiry live, S4 DP-forfeit H+1+jurnal, S5 kamar kotor blokir aktivasi) — `scripts/uat/UAT_RUNTIME_RESIDUAL.ps1` + `UAT_S5_DIRTY_ROOM.ps1`. Rekonsiliasi akhir: 21 stay mismatch=0.

## DEPLOY PRODUKSI — ikuti `06_DEPLOY_RUNBOOK.md`
- [ ] Backup pg_dump → build → `prisma db push` + `bootstrap.sql` → **backfill E-2 produksi** → restart → smoke E-1 → baseline reconciliation → buat CashAccount
- [ ] Set TZ server Asia/Jakarta (mitigasi E-6)

## Ditunda sadar (bukan blocker)
- [ ] E-6 timezone WIB modul staf · E-7 round-robin tiket · E-8 rangka unit test backend

## Prioritas #1b — Quick Wins UI/UX (BARU, 2026-06-12; detail `05_UIUX_AUDIT_2026-06-12.md`)
- [ ] QW-1..QW-8 (filter default tagihan admin, H1 detail kamar, copy DP 30% di booking publik, lazy-load foto katalog, badge "Menunggu Pembayaran" portal, section home kosong, empty-state chart owner, sinkron angka Tagihan Saya)
- [ ] Pekerjaan lebih besar: U-01 code-split API publik + skeleton; U-02 pagination katalog; U-08 keputusan IA /portal/bookings vs /portal/stay

<!-- KOST48_DOCS_SYNC_20260611_CHECKLIST_REWRITE -->

## Prioritas #1 — UAT end-to-end + rekonsiliasi data (keputusan owner D3)
Checklist lengkap & detail langkah: `02_FOCUS_PLAN.md` §4.

- [ ] 4.1 Siklus DP → pelunasan (6 skenario, termasuk regresi A1 dan DP forfeit H+1)
- [ ] 4.2 Siklus kontrak habis → overstay (5 skenario, termasuk kamar kotor bisa dipesan)
- [ ] 4.3 Renew & checkout normal (3 skenario, termasuk race renew vs noon-release)
- [ ] 4.4 Rekonsiliasi data: deposit-ledger reconciliation-lite, backfill dry-run, auto-journal backfill, cross-check P&L vs trial balance
- [ ] Temuan UAT dicatat → fix → baru izinkan auto-close tutup buku bulan berjalan

## Antrean berikutnya (setelah UAT lulus)
- [ ] Pass H — audit flow Renew (race noon-release, interaksi model DP)
- [ ] Pass I — audit flow Tiket & staf (guard role markDone/close, auto-assign, regex parsing)
- [ ] Pass J — cross-check laporan + audit endpoint AI
- [ ] Sisa Pass E — refresh token, invalidasi sesi saat suspend, matriks @Roles per endpoint
- [ ] PWA + push notification (keputusan D2 — jangka menengah)

## Selesai hari ini (2026-06-11, ringkas)
- [x] Dokumen peta fokus flow bisnis: `02_FOCUS_PLAN.md` (12 flow + 9 job, matriks kuat/lemah, keputusan D1–D4)
- [x] D1: copy "denda" dihapus dari reminder overdue (`reminder-preview.service.ts`)
- [x] D4: docs dipadatkan jadi 5 file aktif (00_GROUND_STATE, 01_FLOW_MAP, 02_FOCUS_PLAN, CHECKLIST, CHANGELOG ≈60 KB); contracts/plan/decisions/journal pra-audit + changelog lama → `archieve/`; `CLAUDE.md` dibuat
