# KOST48 V5 — Active Checklist
**Versi:** 2026-06-12 — pasca Audit Mega. Versi lama (V5.10.0, basi) diarsipkan di `archieve/CHECKLIST_V5100_STALE.md`.
**Aturan:** file ini hanya berisi pekerjaan AKTIF. Item selesai dipindah ke `CHANGELOG.md`, bukan ditumpuk di sini.

## Prioritas #0 — Eksekusi hasil Audit Mega (BARU, 2026-06-12)
- [ ] Serahkan `docs/04_FIX_INSTRUCTIONS.md` ke AI eksekutor → kerjakan FIX-01..22, 25, 26 (1 FIX = 1 commit, tsc 0 error per FIX)
- [ ] Review hasil eksekutor (laporan FIX sukses/dilewati) → push setelah disetujui owner
- [ ] Eskalasi E-1..E-9 (lihat `03_AUDIT_MEGA_2026-06.md`) — dikerjakan Fable/owner; minimal E-2 (backfill promotedAt check-in manual) WAJIB setelah FIX-01 sebelum UAT overstay

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
