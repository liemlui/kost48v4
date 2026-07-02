# CHECKLIST 13 — Keuangan: Akuntansi + Aset + Biaya + Laporan ⚠️ GATE M04

> **Baca `00_INDEX.md` + `docs/M04_KEUANGAN.md` dulu.** Prefiks temuan: **`C13-xx`**. **Role:** OWNER/ADMIN. **Audit-only.** DB UAT.
> ⚠️ **DO-NOT-TOUCH:** `accounting-period-close.service.ts` — JANGAN utak-atik/menjalankan close di DB berisi data penting. Audit hanya baca/observasi.

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Setup akuntansi | `/finance/accounting-setup` | `pages/finance/AccountingSetupPage.tsx` |
| Aset tetap | `/finance/assets` | `pages/finance/AssetRegisterPage.tsx` |
| Pendapatan ancillary | `/ancillary-revenue` | `pages/finance/AncillaryRevenuePage.tsx` |
| Biaya (expenses) | `/expenses` | `ConfiguredResourcePage` (cek App.tsx) |
| Laporan (hub) | `/reports` | `pages/reports/ReportsPage.tsx` |
| Neraca | (dari reports) | `pages/reports/BalanceSheetPage.tsx` |
| Laba rugi | (dari reports) | `pages/reports/ProfitLossPage.tsx` |
| Arus kas | (dari reports) | `pages/reports/CashflowPage.tsx` |
| Rasio keuangan | (dari reports) | `pages/reports/FinancialRatiosPage.tsx` |
| Laporan formal | (dari reports) | `pages/reports/UnlockedFormalReports.tsx` |

**Backend:** `accounting` (setup/reports/posting/period-close/rent-recognition), `assets`, `expenses`, `finance`, `reports`. Model: `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `JournalEntry`, `JournalLine`, `RentRecognitionSchedule`, `FixedAsset`, `AssetDepreciationRun/Line`, `Expense`.

## Prasyarat: jalankan unit test akuntansi (bukti kuat)
```bash
cd backend && npm run build && npm run test:unit   # node --test "test/**/*.test.js" → HARUS semua PASS
```
- [ ] 0. Semua unit test PASS? Bila ada yang gagal → **C13-xx BLOCKER**, lampirkan output.

## Langkah audit

### A. Trial Balance & integritas jurnal (JB-09) — INTI
- [ ] 1. `GET /api/accounting/trial-balance` → `isBalanced: true`, totalDebit=totalCredit sampai rupiah. Screenshot/JSON.
- [ ] 2. Ambil beberapa JournalEntry → tiap entry Σdebit=Σkredit? Cari entry tak balance (harusnya mustahil karena DB-enforced; kalau ada → BLOCKER).
- [ ] 3. **JB-10:** akun 2000 (deposit liability) bersaldo kredit; deposit TIDAK muncul sebagai revenue di laba-rugi.
- [ ] 4. **JB-11:** akun 2200 (unearned revenue) — sewa >1 bulan ditangguhkan lalu diakui straight-line. Cek `RentRecognitionSchedule`: jumlah pengakuan bulanan × N = total tangguhan (tidak double-count, tidak kurang).

### B. Laporan keuangan (rekalkulasi manual)
- [ ] 5. **Neraca** `/reports` → BalanceSheet: **A = L + E** (aset = liabilitas + ekuitas) tepat? Hitung. Kalau timpang → BLOCKER.
- [ ] 6. **Laba Rugi** → revenue TIDAK memuat entri DRAFT; deposit tidak masuk revenue; beban wajar.
- [ ] 7. **Arus Kas** → **JB-10:** deposit masuk kas tapi diklasifikasi financing/liability, BUKAN operating-in revenue. Contoh M04: operating-in bulan = pelunasan sewa saja (mis. 1.700.000), bukan termasuk deposit 500.000. Cek klasifikasi (F1-3c: tiap sourceType diklasifikasi SEKALI, tidak double-count).
- [ ] 8. **Rasio keuangan** → angka masuk akal (bukan pembagian /0 → Infinity/NaN)?
- [ ] 9. **Laporan formal (Unlocked)** → tampil bila periode ter-close; konsisten dengan TB.
- [ ] 10. Ganti rentang tanggal laporan → angka berubah konsisten? Rentang kosong → empty-state, bukan crash?

### C. Setup akuntansi `/finance/accounting-setup`
- [ ] 11. CoA, cash account, periode tampil. **Audit-only:** JANGAN seed/close di DB penting. Bila DB UAT bersih, boleh uji seed CoA sekali & cek idempotent (JB-12: seed 2× tidak dobel akun).
- [ ] 12. Periode OPEN/CLOSED tampil benar. **JANGAN** menjalankan period-close di sini (DO-NOT-TOUCH). Cukup verifikasi tombolnya ada guard (mis. tak bisa close periode dengan jurnal tak balance).

### D. Aset tetap `/finance/assets` (depresiasi)
- [ ] 13. Daftar aset + nilai + akumulasi depresiasi tampil. **JB-13** bulat.
- [ ] 14. Depresiasi bulanan = (harga − residu) / umur? Hitung manual satu aset, cocokkan. Depresiasi menghasilkan JournalEntry balanced?
- [ ] 15. Jalankan/preview depreciation run (bila aman di UAT) → **JB-12** idempotent (run 2× bulan sama tidak dobel)?

### E. Biaya `/expenses`
- [ ] 16. Tambah expense → JournalEntry (DR beban / CR kas) balanced? TB tetap seimbang setelah?
- [ ] 17. Expense nominal negatif / 0 → ditolak? Kategori wajib?
- [ ] 18. **JB-12:** submit expense 2× → tidak dobel.

### F. Ancillary revenue `/ancillary-revenue`
- [ ] 19. Pendapatan tambahan (WiFi, layanan) tercatat sebagai revenue benar (bukan tercampur deposit). Cocok dengan wifi-sales (CHECKLIST_16).

### G. Keamanan
- [ ] 20. **JB-14:** semua halaman finance/reports ditolak untuk STAFF/TENANT (UI + curl beberapa endpoint `/api/reports/*`, `/api/accounting/*`).

## HASIL TEMUAN
_(kosong — diisi auditor)_

## Definition of Done
- [ ] `npm run test:unit` dijalankan; hasil dilampirkan (PASS/FAIL).
- [ ] Trial Balance seimbang; Neraca A=L+E; Arus kas tidak hitung deposit sebagai operating-in (JB-09/JB-10).
- [ ] Unearned revenue 2200 (JB-11) & depresiasi diverifikasi hitung manual.
- [ ] Expense membuat jurnal balanced; idempotency dicek.
- [ ] period-close TIDAK dijalankan (DO-NOT-TOUCH) — hanya diobservasi.
- [ ] JB-14 diuji.
- [ ] Temuan `C13-xx`. Update Progres Global baris 13.
