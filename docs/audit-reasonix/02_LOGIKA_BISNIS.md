# 02 — LOGIKA BISNIS (16 temuan)

---

## 🟠 H3: Booking Sweeper vs Approval — No Auto-Refund

**File:** `backend/src/modules/auto-ops/sweeps/booking-sweep.service.ts:76-100` vs `payment-submissions.service.ts:593-689`

Race condition: sweeper cancel stay saat admin approve payment. PG row lock memastikan serial execution — salah satu menang. Tapi kalau **sweeper menang duluan**: payment di-approve tapi stay sudah CANCELLED → `ConflictException('Hunian tidak lagi aktif')`. Tenant sudah bayar, tapi tidak ada auto-refund. Harus refund manual.

---

## 🟠 H4: DP Forfeit — PAID Invoice Kecil Block Forfeit

**File:** `backend/src/modules/auto-ops/booking-sweep.service.ts:126-130`

```typescript
if (invoice.status === 'PAID') continue; // skip forfeit
```

Kalau tenant bayar invoice non-sewa (misal WiFi Rp 50k) yang statusnya PAID → forfeit dibatalkan. Stay tetap hidup dengan DP terkumpul.

**Fix:** Hanya skip kalau invoice SEWA (MONTHLY_RENT) yang PAID.

---

## 🟠 H5: Checkout `complete()` Tanpa `FOR UPDATE`

**File:** `backend/src/modules/stays/stays.service.ts:771-803`

Antara pengecekan open invoice (line 771) dan `updateMany` (line 803) tidak ada row lock. Invoice baru bisa dibuat dalam jeda tersebut.

---

## 🟠 H9: Renew `decideByTenant()` — "TIDAK" Tanpa Transaksi

**File:** `backend/src/modules/renew-requests/renew-requests.service.ts:218-225`

Cabang "YA" pakai `$transaction`, cabang "TIDAK" hanya `prisma.renewRequest.update()` tanpa transaksi. Inkonsisten.

---

## 🟠 H10: Checkout Approve — TOCTOU Tanpa `FOR UPDATE`

**File:** `backend/src/modules/checkout-requests/checkout-requests.service.ts:106-120`

Baca request dengan `findUnique`, lalu `updateMany` conditional. Tanpa lock, concurrent request bisa lihat status basi.

---

## 🟠 H13: Duplicate Invoice — Tidak Ada Unique Guard

**File:** `backend/src/modules/invoices/invoices.service.ts:226-228`

Tidak ada unique constraint di `(stayId, periodStart, periodEnd)`. Dua invoice beda nomor bisa dibuat untuk periode sama → double billing.

**Fix:** Tambah `@@unique` atau cek di service.

---

## 🟡 Payment File Deleted — Submission Stuck PENDING_REVIEW

**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts:615-622`

`existsSync(proofPath)` → `BadRequestException` di dalam transaksi → rollback. Submission tetap PENDING_REVIEW selamanya. Tidak ada auto-reject atau notifikasi admin.

---

## 🟡 Booking Approval — Controller Non-Idempotent

**File:** `backend/src/modules/payment-submissions/payment-submissions.controller.ts:408`

Tidak ada idempotency key. Network retry bisa menyebabkan error membingungkan (walaupun PG lock mencegah double-approve).

---

## 🟡 Reject Submission — `reviewNotes` Bisa Kosong

**File:** `backend/src/modules/payment-submissions/payment-submissions.controller.ts:419`

Tidak ada `@MinLength(1)` atau `@IsNotEmpty()` di `RejectPaymentSubmissionDto`. Alasan rejection kosong disimpan.

---

## 🟡 Meter Reading — Tidak Ada Ceiling

**File:** `backend/src/modules/meters/meter-readings.service.ts:35-42`

Nilai `99999999999999` kWh lolos → invoice listrik raksasa. Tidak ada batas atas (misal 10.000 kWh/reading).

**Fix:** Tambah guard `if (value > MAX_READING_DELTA) throw ...`.

---

## 🟡 Meter Reading — Future Date Tidak Ditolak? (Perlu Verifikasi)

`assertReadingIsChronological` mengecek urutan kronologis, tapi tidak eksplisit menolak tanggal future. Perlu dicek: apakah `readingAt > now()` ditolak?

---

## 🟡 Invoice `unitPriceRupiah = 0` — Lolos

**File:** `backend/src/modules/invoices/invoices.service.ts:173`

Hanya tolak `< 0`. Nilai `0` lolos → lineAmountRupiah = 0, baru ketahuan di `totalAmountRupiah <= 0`. Kalau ada line non-zero lain, line nol tetap masuk.

---

## 🟡 Invoice `lineType` Invalid — Lolos via `as any`

**File:** `backend/src/modules/invoices/invoices.service.ts:179` + `meter-readings.service.ts:294`

```typescript
lineType: dto.lineType as InvoiceLineType  // bare cast
lines: lines as any  // bypass type safety
```

Line type invalid disimpan di DB. `revenueCodeForInvoiceLine` gagal → line tidak masuk journal.

---

## 🟡 `qty < 0` — Pesan Error Menyesatkan

**File:** `backend/src/modules/invoices/invoices.service.ts:169-170`

```typescript
if (qtyDecimal.lte(0)) throw new ConflictException('Qty invoice harus lebih dari 0');
```

Untuk qty negatif, pesan "harus lebih dari 0" tidak menjelaskan bahwa nilai negatif juga ditolak.

---

## 🟢 `RenewRequestsService` — `downPaymentDueDate` @db.Date vs DateTime

**File:** `backend/src/modules/renew-requests/renew-requests.service.ts:262-264`

```typescript
new Date(dpInvoice.paidAt).getTime() > new Date(request.downPaymentDueDate).getTime()
```

`downPaymentDueDate` = `@db.Date` (no time). `paidAt` = `DateTime` (with time). Perbandingan dekat midnight bisa salah.

---

## 🟢 Room Transfer — Belum Ada Validasi Same Room

Perlu verifikasi: apakah `TransferRoomDto` menolak `sourceRoomId === destinationRoomId`?

---

## ✅ VERIFIKASI POSITIF

- ✅ Stay lifecycle: double check-in dicegah (FOR UPDATE + multi-guard)
- ✅ Booking first-paid-wins: kompetitor booking ditangani
- ✅ Invoice status flow: DRAFT→ISSUED→PAID/CANCELLED, D-02 enforced
- ✅ Loyalty points: double-guard tak-negatif + idempotent
- ✅ Overstay handling: auto-sweep dengan money-guard
- ✅ D-03: DRAFT invoice tidak blokir forced checkout
