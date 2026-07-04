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

> **Status:** **kode + UNIT TEST SELESAI** (akuntansi sangat matang, 0 bug); **live UI laporan TERTUNDA** (backend down). **Gate M04 terpenuhi di level kode + unit test.**

### ✅ UNIT TEST money-critical — 21/21 PASS (dijalankan offline vs `dist/`)
- `money.helper.test.js` + `rent-recognition.helper.test.js` → **11/11 pass** (JB-13 pembulatan; JB-11 split straight-line + clamp akhir bulan).
- `accounting-posting.service.test.js` → **10/10 pass**: postInvoiceIssued, **postInvoicePayment**, postExpense, postWifiSale, **postDepositReceivedForStay**, postInvoiceCancellationReversal, **runIdempotentPosting catch P2002 = skip** (JB-12), boundary. (Prisma di-mock → tak butuh DB.)

### ✅ Verifikasi kode — BENAR (kuat)
- **JB-10 cashflow (`cashflow-classifier.ts`):** deposit di-bucket **terpisah** (`DEPOSIT_SOURCES={'DEPOSIT'}`, `depositLiabilityIn/Out`) — **tidak** masuk `operatingCashIn`. Classify-once per sourceType (net debit−kredit) → **anti double-count** (F1-3c).
- **A = L + E (`accounting-reports.service.ts`):** balance sheet **guarded** `!readiness.ready || !trial.isBalanced` (`:423`); trial-balance `isBalanced: totalDebit===totalCredit` (`:100`). Karena double-entry + guard, A=L+E terjamin saat TB seimbang. Rasio D/E guard `/0` (`:960`).
- **JB-11 rent recognition (`rent-recognition.helper.ts`):** term >1 bln → tangguhkan ke **2200**, `splitRentByMonths` straight-line, **sisa pembulatan ke bulan terakhir** (Σ split = total, tak ada rupiah bocor). ≤1 bln tak ditangguhkan.
- **JB-13 depresiasi (`assets.service.ts`):** STRAIGHT_LINE, `validateAssetNumbers`, `roundRupiah`, netBookValue guard ≥0, readiness gate (depreciationEnabled + run posted).
- **Period close (`accounting-period-close.service.ts`):** gate "Trial Balance balanced" + "Tidak ada posted journal tidak balance (unbalancedPosted===0)" + preview closing balance sebelum tutup; reopen/reversal Owner-only. **DO-NOT-TOUCH dihormati** (tak dijalankan saat audit).

### ✅/⚠️ LIVE `/reports` (owner, 3 Jul)
- **Halaman `/reports` BERFUNGSI:** 8 query laporan (monthly-income, overdue-aging, deposit-liability, expense-summary, **profit-loss**, **financial-ratios**, occupancy, occupancy-daily) semua **200** dgn param `year/month` benar. Bukan loop (8 request distinct).
- **⚠️ TAPI LAMBAT + BACKEND DEGRADED:** tiap query 2.5–6 dtk; bahkan endpoint ringan `/public/rooms/summary` = **4.586 dtk** (sebelumnya <0.5s). Halaman stuck skeleton ~10–15 dtk; screenshot renderer sampai timeout 30s. **Penyebab kemungkinan besar: sisa degradasi dari badai loop C05-01** (backend sempat crash 2×, tak pulih penuh) + dev-mode query-log + 8 query berat paralel. **Bukti tambahan dampak C05-01.** SARAN: restart backend bersih + pertimbangkan indeks/optimasi query laporan (occupancy-daily rentang 15 bulan = berat).

### ✅ LIVE `/expenses` (owner, 3 Jul)
- **Render "Pengeluaran Operasional":** menu keuangan (Tagihan/Review Pembayaran/Voucher WiFi/Pendapatan Tambahan/Pengeluaran/Riwayat Bayar), 6 seed **draft rutin** (TAX, RENT_BUILDING, INTERNET, SALARY = FIXED; WATER, ELECTRICITY = VARIABLE). Tally kategori **benar**: Tetap 4 / Variabel 2, Perlu Konfirmasi 6 / Terkonfirmasi 0. Semua **Rp 0 status Draft**.
- **Kontrol bagus (JB-10):** expense masih **Draft** = belum di-posting ke jurnal (Rp 0, Perlu Konfirmasi). Tak ada entri kas hantu sebelum owner konfirmasi. Konsisten dgn `postExpense` idempotent (unit test 10/10). Tanpa NaN.

### Live TERTUNDA (butuh BE hidup — sebaiknya setelah restart bersih)
- `GET /api/accounting/trial-balance` isBalanced (live), rekalkulasi Neraca/L-R/Arus Kas/Rasio via UI, tambah expense → jurnal balanced + TB tetap seimbang, JB-14 (`/reports/*`,`/accounting/*` ditolak STAFF/TENANT — cek curl).
- `npm run test:unit` **penuh** (integration test butuh DB) — jalankan di mesin user.

## Definition of Done — status
- [x] Unit test money-critical 21/21 PASS (offline).
- [x] JB-09/10/11/13 + A=L+E + period-close guard diverifikasi kode.
- [x] period-close TIDAK dijalankan (DO-NOT-TOUCH).
- [~] TB live + reports UI + JB-14 curl: tertunda (backend down).
- [x] Temuan `C13-xx` (nihil bug; core matang); INDEX baris 13 diupdate.

## Definition of Done
- [ ] `npm run test:unit` dijalankan; hasil dilampirkan (PASS/FAIL).
- [ ] Trial Balance seimbang; Neraca A=L+E; Arus kas tidak hitung deposit sebagai operating-in (JB-09/JB-10).
- [ ] Unearned revenue 2200 (JB-11) & depresiasi diverifikasi hitung manual.
- [ ] Expense membuat jurnal balanced; idempotency dicek.
- [ ] period-close TIDAK dijalankan (DO-NOT-TOUCH) — hanya diobservasi.
- [ ] JB-14 diuji.
- [ ] Temuan `C13-xx`. Update Progres Global baris 13.
