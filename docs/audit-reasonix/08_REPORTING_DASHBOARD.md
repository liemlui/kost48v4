# 08 — REPORTING & DASHBOARD ACCURACY (27 temuan)

---

## 🔴 C2 (DUPLICATE): Overdue Aging — Gross, Bukan Net

**File:** `backend/src/modules/reports/reports.service.ts:108-139`

Sudah dibahas di file 01. Temuan paling kritis untuk reporting.

---

## 🔴 C4 (DUPLICATE): Collection Rate — Period Mismatch

**File:** `backend/src/modules/finance/finance.service.ts:77-86` + `reports.service.ts:319-390`

Sudah dibahas di file 01. Terjadi di admin dashboard DAN reports module.

---

## 🟠 H11: Admin Dashboard Revenue Exclude WiFi

**File:** `backend/src/modules/finance/finance.service.ts:77-81, 119`

`businessHealth()` query invoice aggregates tapi TIDAK query `wifiSale`. Owner dashboard (line 174) include WiFi. Inkonsisten.

---

## 🟠 Business Health Score — Double-Counted Penalties

**File:** `backend/src/modules/finance/finance.service.ts:123-136`

```typescript
if (occupancyRate < 60) score -= 18;
if (collectionRate > 0 && collectionRate < 70) score -= 15;
if (overdueCount > 0) score -= Math.min(25, overdueCount * 4);
```

Occupancy rendah → lebih sedikit invoice → lebih banyak overdue. Tiga penalty dari akar masalah sama → double/triple-count.

---

## 🟠 Business Health Score — Weights Tidak Ada Justifikasi

Semua weight (18, 15, 12, 8, 4, 3) adalah konstanta heuristik tanpa basis finansial terdokumentasi.

---

## 🟡 Owner Dashboard — Revenue Trend: Akrual + Cash Campur

**File:** `backend/src/modules/finance/finance.service.ts:174-178, 222-241`

```typescript
invoiceRevenue = Σ invoice WHERE periodStart = month   // akrual
wifiRevenue    = Σ wifiSale WHERE saleDate = month     // cash
totalRevenue   = invoiceRevenue + wifiRevenue          // campur basis!
```

---

## 🟡 Owner Dashboard — Net Profit Abaikan Deposit

**File:** `backend/src/modules/finance/finance.service.ts:201-210`

Deposit forfeiture, refund, dan deduction tidak masuk perhitungan profit. Deposit forfeiture = revenue yang tidak tercatat.

---

## 🟡 Owner Dashboard — Cash Position Tidak Bank-Ready

Cash in = invoice payments + WiFi sales. Cash out = CONFIRMED expenses. Tidak termasuk:
- Cash opening balance
- Owner capital injections
- Refunds ke tenant
- Settlement delays (QRIS, transfer)

---

## 🟡 Overdue Aging — "Current" Bucket di Laporan "Overdue"

**File:** `backend/src/modules/reports/reports.service.ts:108-139`

Query WHERE `dueDate < today` (past due), tapi ada bucket `'current'` untuk `diffDays <= 0`. Tidak pernah terisi kecuali edge case timezone.

---

## 🟡 Occupancy Report — Daily Calculation Tidak Diverifikasi

**File:** `backend/src/modules/reports/reports.service.ts:230-260` (occupancy report)

Query occupancy per hari. Logika benar (hanya stay promoted + exclude MAINTENANCE), tapi tidak diverifikasi dengan sample perhitungan manual.

---

## 🟡 Expense Report — Filter CONFIRMED Saja

**File:** `backend/src/modules/reports/reports.service.ts:137,147`

✅ Benar: DRAFT expenses tidak masuk report. Tapi tidak ada flag/notifikasi kalau ada expense DRAFT yang menumpuk.

---

## 🟡 Tenant Report — Potensi PII Leakage?

**File:** `backend/src/modules/reports/` — tenant-related reports

Perlu verifikasi: apakah laporan tenant menyertakan NIK, nomor HP, atau data pribadi lain? C01-02 (nama penghuni bocor) sudah difix, tapi perlu dipastikan tidak ada endpoint report lain yang bocor.

---

## 🟡 Financial Ratios — Semua Formula Perlu Audit Manual

**File:** `backend/src/modules/reports/reports.service.ts:319-390`

| Ratio | Formula | Status |
|-------|---------|--------|
| Collection rate | paid / billed (period mismatch) | 🚩 Bug |
| Gross margin | (revenue - cogs) / revenue | ✅ Verified |
| Net margin | profit / revenue | ✅ Verified |
| ROA | profit / assets | ✅ Verified (guard division-by-zero) |
| Current ratio | currentAssets / currentLiabilities | ✅ Verified |
| Debt ratio | totalLiabilities / totalAssets | ✅ Verified |

---

## 🟡 Trial Balance — Opening Balance Double-Count Guard ✅

**File:** `backend/src/modules/accounting/accounting-reports.service.ts:35-55`

Opening balance exclude yang sudah ada di journal. ✅ Benar.

---

## 🟡 Balance Sheet — Current Profit Double-Count

**File:** `backend/src/modules/accounting/accounting-reports.service.ts:520-525`

```typescript
const currentProfit = revenue - cogs - expenses;
const equityIncludingCurrentProfit = equityBase + currentProfit;
```

Untuk periode fully-closed: `currentProfit = 0` (aman). Untuk partially-closed: double-count.

---

## 🟡 Cashflow — `cashBeginning` Fragile

**File:** `backend/src/modules/accounting/accounting-reports.service.ts:830-845`

Asumsi: semua cash account punya opening balance benar. Tidak ada validasi.

---

## 🟡 General Ledger — Ordering Benar

**File:** `backend/src/modules/accounting/accounting-reports.service.ts`

Transaction ordering by `createdAt` + `entryNumber`. ✅ Benar.

---

## 🟢 Admin Dashboard — "Pendapatan Bulan Ini" Label Menyesatkan

**File:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`

Label "Pendapatan Bulan Ini" padahal query pakai `periodStart` (bulan coverage invoice), bukan `paymentDate` (bulan uang masuk). Bisa berbeda untuk invoice yang mundur.

---

## 🟢 Owner Dashboard — AI Brief Bukan Murni Rule-Based

**File:** `backend/src/modules/owner-ai/owner-ai.service.ts:276-320`

Kalau AI dikonfigurasi → panggil DeepSeek live. Kalau tidak → fallback rule-based. JB-08 mengatakan "manual button only" — ini benar (tombol harus diklik manusia). Tapi brief yang muncul adalah AI-generated kalau AI enabled. Perlu jelas di UI bahwa ini AI-generated.

---

## 🟢 Staff Dashboard — Tidak Ada Dashboard Khusus

Staff pakai komponen `DashboardAdmin` yang sama dengan admin. Tidak ada KPI khusus staf (tiket diselesaikan, rutinitas completed, dll).

---

## ✅ VERIFIKASI POSITIF

- ✅ Occupancy formula: numerator = promoted stays, denominator = operable rooms (exclude MAINTENANCE)
- ✅ Expense reports: DRAFT excluded via `status: 'CONFIRMED'`
- ✅ Trial Balance `isBalanced` = true (dengan caveat bug DISCOUNT)
- ✅ P&L query exclude CLOSING_ENTRY/CLOSING_REVERSAL
- ✅ Cashflow classifier: deposit = financing (JB-10)
- ✅ Income Statement: revenue recognition straight-line per PSAK 72
- ✅ Semua KPI NaN-safe (guard `x > 0 ? ... : 0`)
- ✅ Division-by-zero guard di semua financial ratios
