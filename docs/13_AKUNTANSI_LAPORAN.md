# DOSSIER 13 — AKUNTANSI & LAPORAN
**Domain:** jurnal otomatis, COA, general ledger, trial balance, laporan keuangan (P&L, Balance Sheet, Cashflow, AR Aging). **Flow 12.**
**Status:** 🟢 Journal engine HEALTHY / 🔴 Report layer punya 9 bug nyata. Fase 1 = FIX bug laporan SEBELUM deploy.
**File inti:** `accounting-posting.service.ts`, `accounting-reports.service.ts`, `accounting-readiness.service.ts`.

---
## 1. Aturan bisnis
- **COA 38 akun** (dikoreksi V3 dari klaim V1 17/17). Prefix mapping: 1xxx=Aset, 2xxx=Liabilitas, 3xxx=Ekuitas, 4xxx=Pendapatan, 5xxx=Beban.
- **Auto Journal Lite:** 10 fungsi posting idempotent per `(sourceType, sourceId)`:
  1. `postStayInitialRentRevenueTx` — pendapatan sewa awal
  2. `postStayRenewRentRevenueTx` — pendapatan perpanjangan
  3. `postStayMeterRevenueTx` — pendapatan meter
  4. `postStayDPForfeitTx` — hangus DP (jurnal DP_FORFEIT)
  5. `postStayDepositReceiptTx` — setoran jaminan (liability)
  6. `postStayDepositSettlementTx` — penyelesaian deposit
  7. `postStayPenaltyTx` — denda manual
  8. `postExpenseTx` — pencatatan beban
  9. `postInventoryMovementTx` — mutasi inventaris
  10. `postPaymentReversalTx` — reversal pembayaran (DEAD CODE sejak A8)
- **Auto-close bulanan** ter-gate readiness: `unmapped-operational` menghitung penuh sebelum auto-close.
- **Reversal CANCEL invoice = BLOCKING** di semua jalur (pola A8); reversal gagal → cancel invoice ditolak.

## 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Post jurnal sewa awal (auto, saat check-in/approve) | `accounting-posting.service.ts:postStayInitialRentRevenueTx` |
| Post jurnal renewal | `accounting-posting.service.ts:postStayRenewRentRevenueTx` |
| Post jurnal meter | `accounting-posting.service.ts:postStayMeterRevenueTx` |
| Post jurnal DP forfeit | `accounting-posting.service.ts:postStayDPForfeitTx` |
| Post jurnal deposit receipt + settlement | `accounting-posting.service.ts:postStayDepositReceiptTx, postStayDepositSettlementTx` |
| Readiness check | `accounting-readiness.service.ts` |
| Reports (P&L, Balance Sheet, Cashflow) | `accounting-reports.service.ts` |
| General Ledger query | Prisma raw + report helpers |

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| F-01 | 🔴 P1 | Cashflow mendeteksi AR prefix `11` sebagai kas → laporan overstate. | `accounting-reports.service.ts` | **F1-3**: gunakan `cashAccountId`/prefix `10` |
| F-02 | 🔴 P1 | Expense ratio: operator precedence BUG `expense×100/revenue` → angka ratusan bukan persen. | Laporan rasio keuangan | **F1-4**: tambah kurung `expense*100/(revenue&#124;&#124;1)` |
| F-09 | 🟠 P2 | Invoice DRAFT ikut dihitung pendapatan di laporan → revenue overstated. | Reports/finance agregat | **F1-7**: exclude DRAFT dari revenue calculation |
| F-10 | 🟠 P2 | Deposit masuk operating cashflow sehingga kas operasional tampak terlalu besar. | `accounting-reports.service.ts` | **F1-9**: pisahkan perubahan liability titipan |
| F-17 | 🟠 P2 | Balance Sheet: total aset ≠ liabilitas + ekuitas saat ada jurnal partial → imbalance karena mapping akun tidak lengkap. | `accounting-reports.service.ts` BS query | **F1-5**: perbaiki grouping akun balance sheet |
| F-18 | 🟠 P2 | Ratio menggunakan AR sebagai cash → current ratio salah. | Laporan rasio | **F1-4** bagian ratio |
| F-24 | 🔴 P1 | Settlement deposit TANPA cek receipt journal → akun liabilitas 2000 bisa debit permanen (uang titipan hilang dari buku). | `accounting-posting.service.ts:602` | **F1-8**: guard cek journal receipt sebelum settlement |
| F-29 | 🟡 INFO | `postPaymentReversalTx` = DEAD CODE (0 pemanggil) — remove payment berjurnal kini diblokir A8. | `accounting-posting.service.ts:741` | Hapus / dokumentasikan |
| F-30 | 🟡 P3 | Ledger deposit sourceId fallback stayId → setoran jaminan manual ke-2 kena dedupe → kurang catat. | `deposit-ledger.service.ts:184` | Sertakan invoicePaymentId di sourceId |
| F-31 | 🟡 P3 | Trial balance imbalance 0.01 akibat pembulatan → masking error di akun kecil. | Rounding di berbagai modul | **F4-10**: standarisasi pembulatan Rupiah |
| (sehat) | ✅ | 10 auto-journal posting idempotent + readiness gate auto-close bulanan = engine sehat. Trial balance runtime seimbang, deposit mismatch=0. | — | pertahankan |

## 4. Task (urutan & spec lengkap)
- **F1-3 · FASE 1:** fix cashflow prefix mapping — AR (11xx) ≠ kas (10xx).
- **F1-4 · FASE 1:** fix operator precedence ratio + mapping AR/cash.
- **F1-5 · FASE 1:** fix balance sheet grouping.
- **F1-6 · FASE 1:** hitung occupancy dari kamar operable dan stay promoted.
- **F1-7 · FASE 1:** exclude DRAFT dari revenue.
- **F1-9 · FASE 1:** exclude deposit dari operating cashflow, pisahkan ke section liabilitas titipan. (F-10)
- **F1-8 · FASE 1:** guard settlement deposit — cek receipt journal. (F-24)
- **F2-8 · FASE 1:** nonaktifkan endpoint/UI pembuatan jurnal draft manual; draft opening balance tetap terpisah dan terkontrol.
- **F4-10 · FASE 4:** standarisasi pembulatan.

## 5. Invarian & UAT
- **Invarian:** trial balance seimbang; jurnal idempotent per sourceType+sourceId; DRAFT tidak masuk laporan; deposit excluded dari operating cashflow.
- **UAT:** (1) TB seimbang pasca siklus booking→checkout; (2) P&L show revenue tanpa DRAFT; (3) cashflow tidak hitung deposit sebagai inflow; (4) balance sheet A=L+E; (5) settlement ditolak tanpa receipt journal (pasca F1-8).

## 6. F1-3 cashflow — spec before→after (4 sub-langkah, SELESAI 2026-06-13)
Lokasi: `accounting-reports.service.ts` fungsi `cashflow()` (anchor metode :731 — grep `async cashflow`).
- **F1-3a deteksi kas (F-01):** *before* `isCashAccount = code.startsWith('11')` → 1100 (PIUTANG/AR) dihitung kas. *after* kas = `cashAccountId != null` ATAU `code.startsWith('10')`. Diekstrak ke `cashflow-classifier.ts::isCashLine` (pure, teruji).
- **F1-3b opening filter:** *before* `openingBalanceLine` where COA `code startsWith '11'`. *after* `'10'` (saldo awal KAS, bukan AR).
- **F1-3c classify once (F-19/F-20):** *before* semua cash-line masuk `operatingInTotal/Out` LALU investing/financing ditambah lagi (double-count) + dead `cashCOACodes`(→null). *after* `classifyCashflow()` mengklasifikasi tiap `sourceType` SEKALI ke operating/investing/financing berbasis net debit−kredit; operating total hanya dari sumber operating.
- **F1-3d beginning = akhir bln lalu:** *before* `cashBeginning = totalCashOpening || openingJournal`; `cashEnding = totalCashCurrent || …` → saldo all-time, `beginning+net ≠ ending`. *after* `cashBeginning = opening + Σ(mutasi kas POSTED entryDate < periodStart)`; `cashEnding = cashBeginning + netCashflow` → invarian **beginning+net=ending**.
- **DO-NOT-TOUCH:** blok saldo-kas E-4 `:838-847` (groupBy `cashAccountId`) — F1-3d MENIRU pola ini untuk prior-delta, jangan ubah.
- **Verifikasi:** `backend/test/unit/cashflow-classifier.test.js` 10/10 hijau (F-01 terbukti: AR 1100 ≠ kas). ⏳ runtime skenario emas `05 §5` (operating-in = Σ kas, bukan AR; beginning+net=ending) → gate pra-deploy F1-12.

## 7. F1-4 rasio — spec before→after (SELESAI 2026-06-13)
Lokasi: `accounting-reports.service.ts` `financialRatios()` (grep `async financialRatios`). Helper murni: `financial-ratios.helper.ts`.
- **F-02 expenseRatio (presedensi):** *before* `Math.round((pnl.totals?.expenseRupiah ?? 0 / totalRevenue) * 10000)/100` → `/` mengikat lebih kuat dari `??` ⇒ praktis `expense × 100` (beban 1jt → 1e8). *after* `expenseRatioPercent(expense, revenue)` = `(expense/revenue)×100`. **Selesai: beban 1jt / rev 4jt = 25.**
- **F-18 cashAndBank:** *before* `code.startsWith('11')` (1100=AR dihitung kas) → *after* `CASH_PREFIXES=['10']` (1000/1010/1020).
- **Inventory:** *before* `startsWith('14')` (tak ada akun 14xx → selalu 0) → *after* `INVENTORY_PREFIXES=['12']` (COA 1200).
- **Current liabilities:** *before* `startsWith('21')` (lewatkan deposit 2000) → *after* `CURRENT_LIABILITY_PREFIXES=['20','21','22','23']` → semua liquidity ratio (current/quick/cash) benar.
- **Verifikasi:** `financial-ratios.helper.test.js` (expenseRatio→25; kas 10≠AR 11; inventory 12; currentLiab termasuk deposit 2000). 12/12 hijau total. ⏳ runtime → gate pra-deploy F1-12.
- COA acuan (`constants/default-coa.ts`): kas 1000/1010/1020 · AR 1100 · inventory 1200 · fixed 1500/1590 · liab 2000/2100/2200/2300.

**Lintas-dossier:** jurnal booking/payment → dossier 10; jurnal deposit → dossier 12; keputusan owner → `03_KEPUTUSAN_OWNER.md`.
