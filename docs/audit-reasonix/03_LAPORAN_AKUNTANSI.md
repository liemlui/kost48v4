# 03 — LAPORAN & AKUNTANSI

> Akurasi laporan keuangan, balance sheet, cashflow, P&L, dan posting journal.

---

## 🟠 Balance Sheet: Double-Count Current Profit

**File:** `backend/src/modules/accounting/accounting-reports.service.ts:520-525`

### Masalah
```typescript
const currentProfit = revenue - cogs - expenses;
const equityIncludingCurrentProfit = equityBase + currentProfit;
```
P&L query mengecualikan `CLOSING_ENTRY`/`CLOSING_REVERSAL`, jadi untuk periode FULLY CLOSED: `currentProfit = 0` → aman.

Tapi untuk periode dengan sub-periode campuran (sebagian closed, sebagian open), current profit bisa double-count: sekali sebagai retained earnings + sekali sebagai current profit.

### Risiko
Rendah untuk penggunaan saat ini (periode akuntansi sederhana). Tapi struktural fragile.

### Saran Fix
Tambah flag/guard: kalau periode punya `closingEntryId`, gunakan retained earnings dari closing entry, abaikan P&L kalkulasi.

---

## 🟠 Cashflow: `cashBeginning` Fragile

**File:** `backend/src/modules/accounting/accounting-reports.service.ts:830-845`

### Masalah
```typescript
cashBeginning = totalCashOpening + priorCashDelta;
```
`priorCashDelta` menjumlahkan SEMUA journal lines dengan `cashAccountId` sebelum `periodStart`. Jika cash account dibuat mid-year dengan `openingBalanceRupiah = 0` tapi ada aktivitas journal di periode sebelumnya → beginning balance mismatch.

### Saran Fix
Dokumentasikan asumsi: semua cash account harus dibuat dengan opening balance yang benar. Atau tambah guard.

---

## 🟡 Deposit Settlement: Arah Saldo Ledger Membingungkan

**File:** `backend/src/modules/deposit-ledger/deposit-ledger.service.ts:151-153`

### Masalah
`balanceAfterRupiah` dihitung dari stay snapshot SEBELUM perubahan:
```typescript
const balanceAfterRupiah = Math.max(paid - deduction, 0);
```
Padahal `deduction` baru saja diterapkan. Jadi `balanceAfter` mencerminkan state sebelum entry, bukan sesudah.

### Saran Fix
Hitung ulang setelah apply perubahan, atau rename ke `balanceBeforeRupiah`.

---

## ✅ LAPORAN YANG SUDAH BENAR

### Occupancy Report
- Numerator: `initialMetersPromotedAt: { not: null }` — hanya stay yang sudah check-in
- Denominator: exclude `MAINTENANCE`/`INACTIVE` rooms — hanya kamar siap-sewa
- ✅ Benar

### Expense Reports
- Exclude `DRAFT`: query pakai `status: 'CONFIRMED'` — biaya draft tidak masuk laporan
- ✅ Benar

### P&L / Income Statement
- Revenue dari invoice recognition + WiFi sales
- Expense dari confirmed expenses
- ✅ Benar (selain issue DISCOUNT)

### Cashflow Classification
- `cashflow-classifier.ts`: OPERATING / INVESTING / FINANCING / DEPOSIT dipisah
- Deposit = financing liability (JB-10): masuk ke arus kas pendanaan, BUKAN operasi
- ✅ Benar

### Journal Posting — Strong Guard
- Semua posting lewat `postBalancedJournalTx`:
  - Minimum 2 lines
  - Tidak boleh ada line dengan BOTH debit dan credit
  - Σdebit HARUS = Σkredit (sampai Rupiah)
  - Period-close guard: tolak posting ke periode CLOSED
  - Idempotent: `entryNumber` unique `JE-AUTO-{sourceType}-{sourceId}`
- ✅ Benar (kecuali bug DISCOUNT di file 01)

### Invoice Cancellation Reversal
- Membalik debit/kredit dari journal asli
- Membuat entry baru, bukan mengubah entry lama (audit trail)
- ✅ Benar

### Rent Recognition PSAK 72
- Deferral: DR 4000 (Expense) / CR 2200 (Unearned Revenue) — pindahkan revenue ke liability
- Recognition: DR 2200 / CR 4000 — akui per bulan
- Straight-line: `total / months`, remainder di bulan terakhir
- Stop recognition saat stay completed/cancelled
- ✅ Benar

### `syncInvoiceStatus` — Edge Cases
| Skenario | Perilaku | Status |
|----------|----------|--------|
| totalPaid = 0 | ISSUED | ✅ |
| 0 < totalPaid < total | PARTIAL | ✅ |
| totalPaid = total | PAID | ✅ |
| Overpayment | ConflictException | ✅ |
| Partial manual | ConflictException (D-02) | ✅ |
| Pay DRAFT invoice | Blocked | ✅ |
| Pay CANCELLED invoice | Blocked | ✅ |
| Amount = 0 | Partial guard: 0 < total → reject | ✅ |
