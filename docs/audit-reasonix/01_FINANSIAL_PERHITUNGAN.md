# 01 — FINANSIAL & PERHITUNGAN (18 temuan)

> **Detail + SEBELUM/SESUDAH untuk eksekusi:** lihat `SPEC_PERBAIKAN_KRITIS.md` (6 bug kritis sudah ada spec executable-nya).
> File ini = penjelasan KENAPA + DAMPAK. Spec = LANGKAH EKSEKUSI.

---

## 🔴 C1: DISCOUNT Line → Journal TIDAK Terposting (Silent)

**File:** `accounting-posting-helpers.ts:70-76` · `invoices.service.ts:139-149` · `accounting-posting.service.ts:295-310`

**Akar:** `revenueCodeForInvoiceLine()` tidak punya case `DISCOUNT`. Amount disimpan positif, `postInvoiceIssuedTx` tidak deteksi. Σdebit≠Σkredit → journal ditolak tanpa error.

**Dampak:** Invoice dengan DISCOUNT tidak punya journal entry. Trial Balance bisa tidak balance.

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-1

---

## 🔴 C2: Overdue Aging Pakai Gross (Bukan Net)

**File:** `reports.service.ts:99-145`

**Akar:** Query hanya `_count: { payments: true }`, bukan `SUM(amountRupiah)`. Baris 117: `const amount = Number(inv.totalAmountRupiah)` — TANPA kurangi pembayaran.

**Dampak:** Invoice PARTIAL (50% terbayar) dihitung 100% di aging report.

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-2

---

## 🔴 C3: Renewal Cross-Term Undercharge

**File:** `renew-requests.service.ts:84-94, 265-267`

**Akar:** `agreedRentAmountRupiah` monthly rate TIDAK dikalikan ulang saat `requestedTerm` berbeda.

**Contoh:** MONTHLY Rp 1.000.000 → renewal YEARLY tetap Rp 1.000.000 (seharusnya Rp 11.000.000).

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-3

---

## 🔴 C4: Collection Rate — Period Mismatch

**File:** `finance.service.ts:77-86` · `reports.service.ts:319-390`

**Akar:** `totalBilled` pakai `periodStart` (akrual), `totalPaid` pakai `paymentDate` (kas). Dua basis berbeda.

**Dampak:** Rate bisa >100% atau <0%.

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-4

---

## 🔴 C5: Journal Pending — Gagal Diswallow Tanpa Retry

**File:** `payment-submissions.service.ts:794-806`

**Akar:** `catch (err) { journalPending = true; }` — tidak ada log, tidak ada retry, tidak ada alert.

**Dampak:** Invoice dibayar tapi tanpa journal entry. Admin lihat flag tanpa mekanisme resolve.

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-5

---

## 🔴 C6: `@IsNumberString` Tolak JSON Number

**File:** `stay.dto.ts:58-63`

**Akar:** `initialElectricityKwh` bertipe `string` dengan validasi `@IsNumberString`. Client kirim `1500` (JSON number) → 400 Bad Request.

**Dampak:** Semua API client harus stringify nilai numerik. Tidak standar.

**Spec eksekusi:** `SPEC_PERBAIKAN_KRITIS.md` § AL-FIX-6

---

## 🟠 H1: `updateLine()` — Cast `undefined` Hapus Field DB

**File:** `invoices.service.ts:180-184`

```typescript
// SEBELUM — undefined jadi null di DB
lineType: dto.lineType as InvoiceLineType,

// SESUDAH — hanya set kalau ada
...(dto.lineType !== undefined ? { lineType: dto.lineType } : {}),
```

---

## 🟠 H13: Duplicate Invoice untuk Stay+Period Sama

**File:** `invoices.service.ts:226-228`

Hanya unique constraint di `invoiceNumber`. Tidak ada guard mencegah 2 invoice beda nomor untuk `stayId + periodStart + periodEnd` yang sama.

**Fix:** Tambah cek di service sebelum create, atau `@@unique([stayId, periodStart, periodEnd])` di schema.

---

## 🟡 M1: `buildLineData` Tidak Apply `roundRupiah`

**File:** `invoices.service.ts` method `buildLineData`

```typescript
// buildLineData:
qtyDecimal.times(unitPriceRupiah).toNumber()  // TANPA roundRupiah

// createRenewUtilityCheckpointLineTx:
roundRupiah(...)  // PAKAI roundRupiah ← inkonsisten
```

**Fix:** Tambah `roundRupiah()` setelah `.toNumber()` di `buildLineData`.

---

## 🟡 M2: Invoice 50+ Line — Insert Satu-per-Satu

**File:** `invoices.service.ts:244`

Loop `tx.invoiceLine.create()` per line. Untuk 50+ line = 50 INSERT statement. Tidak pakai `createMany`.

---

## 🟡 M3: `addMonths` di Seed — `setMonth()` Overflow

**File:** `scripts/seed-dev-via-api.js:28`

```js
// 31 Jan + 1 bulan = 3 Mar (bukan 28 Feb)
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
```

---

## 🟡 Revenue Trend: Accrual + Cash Dicampur

**File:** `finance.service.ts:174-178, 222-241`

```typescript
invoiceRevenue = Σ invoice WHERE periodStart = month   // akrual
wifiRevenue    = Σ wifiSale WHERE saleDate = month     // kas
totalRevenue   = invoiceRevenue + wifiRevenue          // campur basis!
```

---

## 🟡 Owner Dashboard: Net Profit Abaikan Deposit

**File:** `finance.service.ts:201-210`

Deposit forfeiture dan refund tidak masuk perhitungan profit atau cashflow.

---

## 🟢 `numeric()` Method — NaN → 0 Silent

**File:** `invoices.service.ts:38-40`

```typescript
private numeric(value: unknown): number {
  return Number.isFinite(parsed) ? parsed : 0;  // null, undefined, "abc" → 0 silent
}
```

---

## ✅ SUDAH DIFIX (7 Juli 2026)

- ✅ **C6 `dateOnly()`** — unifikasi ke `common/utils/date-only.ts`, 5 caller diupdate
- ✅ **DTO `@ApiProperty`** — 17 DTO, 82 field (invoice, stays, room-transfer)
