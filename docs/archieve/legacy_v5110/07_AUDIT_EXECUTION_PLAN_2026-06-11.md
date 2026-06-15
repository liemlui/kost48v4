# KOST48 V5 — Rencana Eksekusi Perbaikan Audit
**Versi:** 2026-06-11 — Detail per temuan agar langsung bisa dieksekusi (companion dari `06_AUDIT_TOTAL_2026-06-11.md`)

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_EXECUTION_PLAN -->

## Cara membaca dokumen ini

Setiap temuan punya struktur tetap:
- **Lokasi** — file:baris pasti.
- **Pemicu** — kondisi konkret yang membuat bug muncul.
- **Dampak** — akibat bisnis/teknis.
- **Akar masalah** — kenapa terjadi.
- **Eksekusi** — langkah perbaikan konkret (kode/SQL).
- **Backfill data** — query perbaikan data lama bila perlu.
- **Verifikasi** — cara test bahwa fix bekerja.

Penemuan deep-pass yang mengubah laporan awal ditandai **[REVISI]**.

### Fakta constraint DB yang relevan (hasil verifikasi `sql/bootstrap.sql`)

```sql
-- Satu stay ACTIVE per tenant (selalu aktif untuk status ACTIVE)
CREATE UNIQUE INDEX stay_one_active_per_tenant_uidx
  ON "Stay" ("tenantId") WHERE status = 'ACTIVE';

-- Satu stay ACTIVE per room HANYA bila sudah promoted (occupied),
-- booking RESERVED (promotedAt NULL) TIDAK tercakup → multi-booking diizinkan
CREATE UNIQUE INDEX stay_one_active_per_room_uidx
  ON "Stay" ("roomId") WHERE status = 'ACTIVE' AND "initialMetersPromotedAt" IS NOT NULL;

-- Deposit dibayar tidak boleh > deposit disepakati (error code 23514 bila dilanggar)
ALTER TABLE "Stay" ADD CONSTRAINT stay_deposit_payment_amount_chk
  CHECK ("depositPaidAmountRupiah" >= 0 AND "depositPaidAmountRupiah" <= "depositAmountRupiah");
```

> Catatan penting: `stays.create` (check-in manual) membuat stay ACTIVE dengan `initialMetersPromotedAt = NULL`, sehingga **tidak** tercakup `stay_one_active_per_room_uidx`. Ini memengaruhi #16.

---

## 🔴 P0

### 1. Schema drift `Stay.cancelReason`

**Lokasi**
- Tulis: `tenant-bookings.service.ts:564-571` (rejectBooking), `:749-756` (cancelPendingBooking).
- Baca: `tenant-bookings-helpers.ts:141` (findBookingByIdTx), `:116` (mapBookingRow), dan SELECT di `findMine` (`tenant-bookings.service.ts:834`).
- Skema sumber kebenaran: `schema.prisma` model `Stay` (baris 563-627) — **tidak ada** field `cancelReason`. Hanya `Invoice.cancelReason` (baris 696) yang ada di migration.

**Pemicu**
- DB yang dibangun murni dari `prisma/migrations` → kolom `Stay.cancelReason` tidak ada → semua raw SQL di atas error `42703 column does not exist`.
- `findMine` membungkus error dengan `isBookingSchemaDriftError` (helper baris 51-66, mendeteksi "column ... does not exist") → mengembalikan `{ items: [], meta }` tanpa error → **senyap**.

**Dampak**
- Reject/cancel booking → 500. Daftar booking tenant kosong padahal ada data.
- Risiko data-loss: jika kolom ditambah manual di produksi, `prisma migrate`/`db push` akan men-DROP-nya.

**Akar masalah**
Raw SQL menambah kolom logis yang tidak pernah dimasukkan ke schema.prisma maupun migration.

**Eksekusi** (pilih satu jalur, jangan campur)

Jalur A — jadikan kolom resmi (disarankan, karena kode sudah mengandalkannya):
1. Tambah ke `schema.prisma` model `Stay`:
   ```prisma
   cancelReason String?
   ```
2. Buat migration:
   ```bash
   npx prisma migrate dev --name add_stay_cancel_reason
   ```
3. Pastikan `sql/bootstrap.sql` juga menambah kolom idempotent (untuk jalur non-migrate):
   ```sql
   ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
   ```

Jalur B — hapus ketergantungan kolom (jika tidak mau ubah skema):
- Ganti semua tulis `cancelReason` menjadi tulis ke `checkoutReason` (kolom yang sudah ada di Stay), dan `mapBookingRow`/`findBookingByIdTx` membaca `checkoutReason`.

**Backfill data**
Tidak perlu jika Jalur A pada DB yang sudah punya kolom; untuk DB yang belum, `ADD COLUMN IF NOT EXISTS` cukup (nilai NULL).

**Verifikasi**
- `psql -c '\d "Stay"'` → kolom `cancelReason` ada.
- Buat booking tenant → reject → tidak 500; daftar booking tenant memunculkan item CANCELLED beserta alasannya.
- `npx prisma migrate status` bersih.

---

### 2. Pembatalan stay terkunci oleh skip accounting benign

**Lokasi** `stays.service.ts:673-685`.

**Pemicu** Accounting belum siap (COA/periode belum ada) → invoice ISSUED tak pernah dijurnal → `postInvoiceCancellationReversalTx` mengembalikan `{ skipped: true, reason: "Original INVOICE journal belum ada..." }` (`accounting-posting.service.ts:703-708`) → `stays.cancel` melempar ConflictException.

**Dampak** Semua pembatalan stay yang punya invoice ISSUED gagal pada instalasi yang accounting-nya belum lengkap.

**Akar masalah** Memperlakukan skip benign (tidak ada jurnal asli) sama dengan skip-error (gagal reversal).

**Eksekusi**
Samakan dengan pola `invoices.service.ts:479-506`: cek dulu apakah ada jurnal INVOICE POSTED; hanya panggil reversal jika ada, dan baru error jika reversal-nya yang gagal.
```ts
for (const invoice of invoicesToReverse) {
  const posted = await tx.journalEntry.findFirst({
    where: { sourceType: 'INVOICE', sourceId: String(invoice.id), status: 'POSTED' },
    select: { id: true },
    orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
  });
  if (!posted) continue; // tak ada jurnal asli → reversal tak diperlukan
  const r = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, invoice.id, actor.id);
  if (r?.skipped) throw new ConflictException(`... reversal gagal: ${r.reason}`);
}
```
Terapkan pola yang sama pada `processDeposit` bila ada cek skip serupa.

**Verifikasi**
- DB tanpa COA → cancel stay ber-invoice ISSUED → sukses, room kembali AVAILABLE.
- DB dengan COA + jurnal → cancel → ada JournalEntry sourceType ADJUSTMENT `INVOICE_REVERSAL:<id>`.

---

### 3. Expiry booking: TOCTOU + zombie booking

**Lokasi** `auto-ops.service.ts:125-141` (query), `:189-263` (`expireBookingTx`); duplikat di `payment-submissions.service.ts:885-990` (`runExpiryCheck`).

**Pemicu**
- (a) Kandidat di-`findMany` di luar transaksi; `expireBookingTx` tidak re-lock/re-cek. Approval pembayaran yang masuk di sela query↔tx tidak terlihat.
- (b) `tx.room.update(... AVAILABLE)` tanpa cek booking ACTIVE lain di room yang sama. Karena `stay_one_active_per_room_uidx` hanya berlaku untuk promoted, beberapa booking RESERVED bisa hidup bersama.

**Dampak**
- (a) Stay terbayar bisa ikut dibatalkan; kamar OCCUPIED dilepas → double-booking berikutnya.
- (b) Booking RESERVED lain jadi "zombie" (tak tampil/tak bisa di-approve/cancel, dan tenant tertahan oleh `stay_one_active_per_tenant_uidx`).

**Akar masalah** Tidak ada re-validasi di dalam transaksi, dan room dilepas tanpa mempertimbangkan booking lain.

**Eksekusi**
1. Di `expireBookingTx`, lock + re-cek di dalam tx sebelum membatalkan:
   ```ts
   const rows = await tx.$queryRaw<{status:string; roomStatus:string; promotedAt:Date|null}[]>(Prisma.sql`
     SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
     FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
     WHERE s.id = ${stayId} FOR UPDATE OF s, r`);
   const cur = rows[0];
   if (!cur || cur.status !== 'ACTIVE' || cur.roomStatus !== 'RESERVED' || cur.promotedAt) return; // sudah berubah
   // re-cek tidak ada submission PENDING_REVIEW/APPROVED
   ```
2. Sebelum melepas room, tiru `rejectBooking:545-556`:
   ```ts
   const otherReserved = await tx.stay.findFirst({
     where: { roomId, status: 'ACTIVE', NOT: { id: stayId }, room: { status: 'RESERVED' } },
     select: { id: true },
   });
   await tx.room.update({ where: { id: roomId }, data: { status: otherReserved ? 'RESERVED' : 'AVAILABLE' } });
   ```
3. Terapkan perubahan yang sama di `payment-submissions.runExpiryCheck` dan `cancelCompetingUnpaidBookingsTx` (yang sudah benar mem-batch, tapi periksa pelepasan room-nya).

**Backfill data** Cari zombie yang sudah terjadi:
```sql
-- booking ACTIVE pada room yang sudah AVAILABLE/terisi tenant lain
SELECT s.id, s."roomId", s."tenantId", r.status
FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
WHERE s.status='ACTIVE' AND s."initialMetersPromotedAt" IS NULL
  AND r.status <> 'RESERVED';
```
Tinjau manual → set CANCELLED dengan alasan, agar tenant tidak tertahan.

**Verifikasi**
- Simulasi: buat 2 booking RESERVED di room sama; expire salah satu → room tetap RESERVED, booking lain tetap tampil di portal.
- Simulasi race: approve pembayaran tepat saat expiry → stay tetap ACTIVE/OCCUPIED (re-cek menggugurkan expiry).

---

### 4. Refund deposit yang tidak pernah diterima

**Lokasi** `stays-service-helpers.ts:145-152` (`resolveDepositSettlementAmount`); dipakai di `stays.processDeposit:744`.

**Pemicu** `depositPaidAmountRupiah = 0` (selalu untuk check-in manual) → fallback ke `depositAmountRupiah` → `FULL_REFUND` memproses deposit fiktif.

**Dampak** Jurnal kredit kas untuk uang yang tak pernah masuk (kas minus); ledger DEDUCTION/REFUND tanpa PAYMENT_RECEIVED → `reconciliationLite` mismatch permanen.

**Akar masalah** Settlement amount tidak berbasis kas yang benar-benar diterima.

**Eksekusi**
1. Settlement hanya boleh atas dana yang tercatat diterima:
   ```ts
   export function resolveDepositSettlementAmount(stay) {
     return Number(stay.depositPaidAmountRupiah ?? 0); // tanpa fallback ke amount
   }
   ```
2. Di `processDeposit`, jika `settlementAmount <= 0`, tetap tutup status deposit (mis. `REFUNDED` dengan nilai 0 / status khusus `NO_DEPOSIT`) tanpa membuat jurnal kas. Sesuaikan pesan agar tidak menampilkan "deposit 0 tidak dapat diproses" sebagai blocker bila memang tak ada deposit.
3. Untuk check-in manual yang benar-benar menerima deposit tunai, sediakan jalur pencatatan `depositPaidAmountRupiah` saat check-in (atau lewat payment submission deposit), agar settlement punya basis.

**Backfill data** Audit stay yang sudah ter-refund tanpa paid:
```sql
SELECT id, "depositAmountRupiah","depositPaidAmountRupiah","depositRefundedRupiah","depositDeductionRupiah","depositStatus"
FROM "Stay"
WHERE "depositPaidAmountRupiah"=0 AND ("depositRefundedRupiah">0 OR "depositDeductionRupiah">0);
```
Tinjau jurnal terkait (`sourceId = 'SETTLEMENT:<stayId>'`) → reversal manual bila uang tak pernah ada.

**Verifikasi** Check-in manual tanpa deposit → processDeposit tidak menghasilkan JournalEntry kas; reconciliationLite gap = 0.

---

### 5. `depositPortion` tanpa cap saat approval booking

**Lokasi** `payment-submissions.service.ts:369-372`.

**Pemicu** `invoiceRemaining` mengecil antara submit↔approve (admin catat pembayaran manual di sela) → `depositPortion = amount − invoiceRemaining` membengkak → `depositPaidAfter > depositAmount`.

**Dampak** Melanggar `stay_deposit_payment_amount_chk` (error 23514). `catch` di `approveSubmission:633-638` hanya menangani P2002 → **500 generik**. Tanpa constraint: deposit overstated.

**Akar masalah** Porsi deposit tidak dibatasi sisa deposit yang belum dibayar.

**Eksekusi**
```ts
const depositRemaining = Math.max(stayDepositAmount - stayDepositPaidBefore, 0);
const rawDeposit = Math.max(0, submission.amountRupiah - rentPortion);
const depositPortion = Math.min(rawDeposit, depositRemaining);
const overpay = rawDeposit - depositPortion; // > 0 berarti kelebihan bayar
if (overpay > 0) {
  // tolak approval, atau alokasikan sebagai kredit/penjelasan eksplisit — JANGAN diam-diam
  throw new ConflictException(`Nominal melebihi sisa tagihan + deposit sebesar Rp ${overpay.toLocaleString('id-ID')}. Tolak/koreksi bukti.`);
}
```
Plus tangani error 23514 di catch sebagai ConflictException yang jelas.

**Verifikasi** Skenario: invoiceRemaining turun sebelum approve → approve menolak dengan pesan jelas, bukan 500; `depositPaidAmountRupiah` tak pernah > `depositAmountRupiah`.

---

### 6. `.catch(() => undefined)` di dalam transaksi Postgres

**Lokasi** `payment-submissions.service.ts:471-485, 686, 844, 944, 1031`; `tenant-bookings.service.ts:364`; cek juga `stays.service.ts:302-309, 1047-1054`.

**Pemicu** Statement di dalam `$transaction` gagal → seluruh tx masuk state aborted; statement berikut gagal "current transaction is aborted".

**Dampak** Catch tidak menyelamatkan tx; menyembunyikan error ledger/jurnal → data finansial hilang diam-diam, atau seluruh operasi gagal di titik lain yang membingungkan.

**Akar masalah** Best-effort side-effect dijalankan **di dalam** tx utama.

**Eksekusi** (dua opsi)
- Opsi A (disarankan): pindahkan posting jurnal/ledger **ke luar** transaksi utama (after-commit), dengan idempotency yang sudah ada (`sourceType/sourceId`). Jika gagal, log + tandai untuk backfill, tanpa membatalkan operasi bisnis.
- Opsi B: jika harus di dalam tx, gunakan SAVEPOINT eksplisit (`tx.$executeRaw('SAVEPOINT sp')` / `ROLLBACK TO sp`) agar kegagalan side-effect tidak mengabort tx utama. Prisma interactive tx tidak mengekspos savepoint secara native → perlu raw.
- Hapus `.catch(() => undefined)` "kosong"; minimal log warning dengan konteks.

**Verifikasi** Paksa posting jurnal gagal (mis. COA dihapus) → operasi bisnis (approve/cancel) tetap commit bersih; ada log + entri readiness backfill; tidak ada error "transaction is aborted".

---

### 7. Race overpayment pembayaran manual

**Lokasi** `invoice-payments.service.ts:113-148` (create), `:156-198` (update).

**Pemicu** `invoice.payments` dibaca di luar tx tanpa lock; dua request paralel sama-sama lolos cek `totalPaid + amount <= total`.

**Dampak** Overpayment; status PAID dengan total bayar > total invoice.

**Eksekusi** Pindahkan validasi ke dalam `$transaction` dengan lock baris invoice + agregat segar (pola `approveSubmission`):
```ts
await this.prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${dto.invoiceId} FOR UPDATE`;
  const agg = await tx.invoicePayment.aggregate({ where: { invoiceId: dto.invoiceId }, _sum: { amountRupiah: true } });
  const paid = agg._sum.amountRupiah ?? 0;
  if (paid + dto.amountRupiah > total) throw new ConflictException('Pembayaran melebihi total invoice');
  // create + syncInvoiceStatus + posting
});
```

**Verifikasi** Dua create paralel jumlah masing-masing = sisa → satu sukses, satu ditolak.

---

### 8. TOCTOU duplikat submission PENDING

**Lokasi** `payment-submissions.service.ts:132-145`.

**Pemicu** Cek `existingPending` di luar tx; tanpa unique index. (Diverifikasi: tidak ada partial unique untuk PaymentSubmission PENDING di bootstrap.)

**Dampak** Dua PENDING per invoice; pada jalur booking dapat menyebabkan kelebihan ke deposit (lihat #5).

**Eksekusi**
1. Partial unique index:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS payment_submission_one_pending_per_invoice_uidx
     ON "PaymentSubmission" ("invoiceId")
     WHERE status = 'PENDING_REVIEW' AND "invoiceId" IS NOT NULL;
   ```
2. Tangani P2002 di `createSubmission` → ConflictException "Masih ada bukti pembayaran menunggu review".

**Backfill** Selesaikan dulu duplikat existing sebelum membuat index:
```sql
SELECT "invoiceId", COUNT(*) FROM "PaymentSubmission"
WHERE status='PENDING_REVIEW' GROUP BY "invoiceId" HAVING COUNT(*) > 1;
```

**Verifikasi** Dua submit paralel invoice sama → satu PENDING, satu ditolak Conflict.

---

## 🟠 P1

### 9. Jurnal pembayaran tak di-reverse saat invoice PARTIAL dibatalkan

**Lokasi** semua jalur cancel: `stays.service.ts:648-687`, `auto-ops.expireBookingTx`, `payment-submissions.cancelCompetingUnpaidBookingsTx:669-700`, `payment-submissions.runExpiryCheck`.

**Pemicu** Invoice PARTIAL punya InvoicePayment + jurnal INVOICE_PAYMENT. Cancel hanya reverse jurnal INVOICE.

**Dampak** AR negatif, kas overstated; tidak ada penanganan refund uang tenant.

**Eksekusi**
- Saat membatalkan invoice yang punya pembayaran, juga reverse tiap jurnal `INVOICE_PAYMENT` terkait (buat reversal mirror seperti `postInvoiceCancellationReversalTx`, generalisasi untuk sourceType INVOICE_PAYMENT).
- Tetapkan kebijakan refund: jika booking dibatalkan tapi sudah ada pembayaran nyata, blokir auto-cancel dan eskalasi ke admin (atau buat catatan kewajiban refund). Jangan menghapus jejak kas diam-diam.

**Backfill** Cari invoice CANCELLED yang masih punya jurnal payment hidup:
```sql
SELECT i.id, i.status
FROM "Invoice" i
WHERE i.status='CANCELLED'
  AND EXISTS (SELECT 1 FROM "InvoicePayment" p WHERE p."invoiceId"=i.id)
  AND EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."sourceType"='INVOICE_PAYMENT'
              AND je."sourceId" IN (SELECT CAST(p.id AS text) FROM "InvoicePayment" p WHERE p."invoiceId"=i.id)
              AND je.status='POSTED');
```

**Verifikasi** Batalkan invoice PARTIAL → AR & kas kembali nol; tidak ada jurnal payment yatim.

---

### 10. Gap sewa tak tertagih pada renewal terlambat

**Lokasi** `stays.service.ts:945-956`.

**Pemicu** `logicalPeriodStart = max(plannedCheckOut, today)`; renewal diproses jauh setelah plannedCheckOut.

**Dampak** Periode antara plannedCheckOut dan hari ini tidak ditagih sewa.

**Eksekusi** (keputusan bisnis — pilih kebijakan)
- Opsi A: `logicalPeriodStart = currentPlannedCheckOut` (selalu lanjut dari periode lama, tanpa max(today)) → gap ikut tertagih. Risiko: jika telat lama, tagihan besar.
- Opsi B: pertahankan max(today) tapi tambahkan line "tunggakan periode <range>" otomatis untuk selisih hari.
- Minimal: tampilkan peringatan ke admin saat ada gap > 0 hari dan minta konfirmasi.

**Verifikasi** Renewal yang plannedCheckOut-nya lampau menghasilkan invoice yang menutup gap (atau peringatan eksplisit).

---

### 11. Checkout request = perpanjangan gratis

**Lokasi** `checkout-requests.service.ts:173-176`.

**Pemicu** approve menyetel `plannedCheckOutDate = requestedCheckOutDate` tanpa batas atas periode terbayar.

**Dampak** Masa huni diperpanjang tanpa invoice bila tanggal keluar diajukan jauh ke depan.

**Eksekusi**
- Validasi di `createRequest`/`approveRequest`: `requestedCheckOutDate <= plannedCheckOutDate` saat ini (checkout hanya boleh mempercepat/menyamai, bukan memperpanjang).
- Jika ingin mundur melewati periode terbayar, arahkan ke flow renewal (bayar dulu), bukan checkout.

**Verifikasi** Ajukan checkout dengan tanggal > plannedCheckOut → ditolak dengan pesan arahkan ke perpanjangan.

---

### 12. Jurnal payment VOID memblokir posting ulang

**Lokasi** `accounting-posting.service.ts:1001-1011` (cek existing tanpa filter status) vs `invoice-payments.service.ts:32-42` (cari jurnal non-VOID).

**Pemicu** Pembayaran diedit setelah jurnal lamanya VOID → `postBalancedJournalTx` melihat jurnal VOID lama → skip "Journal sudah ada".

**Dampak** Pembayaran teredit tidak pernah terjurnal ulang.

**Eksekusi** Pada `postBalancedJournalTx`, cek existing **hanya** untuk status non-VOID:
```ts
const existing = await tx.journalEntry.findFirst({
  where: { sourceType: input.sourceType, sourceId: input.sourceId, status: { not: 'VOID' } },
  select: { id: true, entryNumber: true, status: true },
});
```
Pertimbangkan `entryNumber` unik bila boleh ada >1 jurnal per source (tambah suffix versi), karena `entryNumber` `@unique`.

**Verifikasi** VOID-kan jurnal payment, edit payment → jurnal baru POSTED terbentuk.

---

### 13. Pembayaran `paidAt` lampau di periode CLOSED tak terjurnal

**Lokasi** `payment-submissions.approveSubmission:414-417` (entryDate = paidAt), `postBalancedJournalTx:1063-1069` (skip jika periode bukan OPEN).

**Pemicu** Tenant klaim `paidAt` di bulan yang sudah CLOSED.

**Dampak** Jurnal di-skip permanen; backfill skip dengan alasan sama; tak ada peringatan.

**Eksekusi**
- Untuk auto-journal, gunakan tanggal posting = tanggal approval (periode berjalan) bila periode `paidAt` sudah CLOSED, ATAU
- Munculkan ke readiness/queue "perlu adjustment manual periode berjalan" alih-alih skip diam. Tambahkan metadata jelas ke response approval (`accountingWarning`).

**Verifikasi** Approve submission dengan paidAt di periode CLOSED → ada jurnal di periode berjalan ATAU warning eksplisit + entri readiness.

---

### 14. Unique constraint kolom nullable tidak efektif (Postgres NULL ≠ NULL)

**Lokasi** `schema.prisma:923` (`StaffRoutineCompletion`), `schema.prisma:987` (`StaffReview`); race di `tenant-staff-reviews.service.ts:65-78`.

**Pemicu** `assignmentId`/`roomId` NULL → kombinasi unik tidak menjepit → duplikat completion. StaffReview `ticketId` NULL serupa.

**Dampak** Double scoring performa staf; race membuat 500 (P2002 tak ditangani).

**Eksekusi**
1. Partial unique index yang menangani NULL via COALESCE/ekspresi:
   ```sql
   CREATE UNIQUE INDEX staff_routine_completion_uidx
     ON "StaffRoutineCompletion" ("templateId", COALESCE("assignmentId",-1), "staffUserId", COALESCE("roomId",-1), "dueDate");
   ```
2. Tangani P2002 di service review → ConflictException "sudah pernah dikirim".
3. Bungkus create review dalam try/catch P2002.

**Backfill** Hapus duplikat sebelum index:
```sql
SELECT "templateId","staffUserId","dueDate", COUNT(*)
FROM "StaffRoutineCompletion"
GROUP BY "templateId","staffUserId","dueDate", COALESCE("assignmentId",-1), COALESCE("roomId",-1)
HAVING COUNT(*) > 1;
```

**Verifikasi** Dua completion identik (assignmentId NULL) → yang kedua ditolak.

---

### 15. Relasi `RenewRequest.tenant` inkonsisten

**Lokasi** `schema.prisma:1142,1154`.

**Pemicu** `tenantId Int` NOT NULL + relasi `Tenant?` `onDelete: SetNull`.

**Dampak** Hapus Tenant → runtime error (tak bisa SetNull kolom NOT NULL); semantik salah.

**Eksekusi** Selaraskan: ubah `onDelete` ke `Restrict` (atau `Cascade` sesuai kebijakan) dan relasi jadi non-optional `Tenant`:
```prisma
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
```
Buat migration.

**Verifikasi** `prisma validate` + coba hapus tenant yang punya renewRequest → ditolak Restrict, bukan crash SetNull.

---

### 16. TOCTOU check-in manual (double occupancy) **[REVISI]**

**Lokasi** `stays.create:124-145`.

**Pemicu** Cek `existingRoomStay`/status room di luar tx tanpa lock. **Penting:** `stay_one_active_per_room_uidx` hanya menjepit stay dengan `initialMetersPromotedAt IS NOT NULL`. Check-in manual membuat stay ACTIVE dengan `promotedAt = NULL` → **tidak terlindungi index** → dua tenant berbeda bisa race ke room yang sama. (Race tenant-sama tetap terlindungi `stay_one_active_per_tenant_uidx`.)

**Dampak** Dua stay ACTIVE pada satu room; room OCCUPIED ganda.

**Eksekusi** (dua lapis)
1. Bungkus pengecekan + create dalam `$transaction` dengan lock room:
   ```ts
   await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;
   // re-cek status room & existingRoomStay di dalam tx
   ```
2. Perkuat index agar mencakup check-in manual juga (occupied tanpa promotedAt):
   ```sql
   -- ganti index lama: jepit semua stay ACTIVE pada room occupied
   DROP INDEX IF EXISTS stay_one_active_per_room_uidx;
   CREATE UNIQUE INDEX stay_one_occupying_per_room_uidx
     ON "Stay" ("roomId")
     WHERE status = 'ACTIVE' AND "initialMetersPromotedAt" IS NOT NULL;
   -- TAMBAH guard manual check-in lewat aplikasi (set promotedAt saat manual occupy) ATAU index berbasis room.status
   ```
   Catatan: bila ingin satu index DB murni, set `initialMetersPromotedAt = now()` pada check-in manual agar masuk cakupan index existing (cara paling sederhana & konsisten).

**Verifikasi** Dua check-in manual paralel ke room sama → satu sukses, satu ditolak.

---

### 17. Edit meter historis setelah dipakai menagih

**Lokasi** `meter-readings.service.ts:153-186`.

**Pemicu** Update reading yang sudah menjadi checkpoint invoice perpanjangan (`createRenewUtilityCheckpointLineTx` membuat reading + invoice line).

**Dampak** Angka invoice dan meter diverge tanpa koreksi.

**Eksekusi** Tolak update/delete reading yang sudah dirujuk sebagai checkpoint invoice (tandai reading checkpoint, mis. lewat note pattern atau kolom `lockedByInvoiceId`), atau wajibkan koreksi lewat flow adjustment yang juga menyentuh invoice.

**Verifikasi** Edit reading checkpoint → ditolak / mengarahkan ke adjustment.

---

## 🟡 P2 (ringkas — eksekusi langsung)

| # | Lokasi | Eksekusi |
|---|---|---|
| 18 | `users.service.ts:159-171` & audit row mentah | Sebelum `audit.log`, hapus field sensitif: `const { passwordHash, ...safe } = existing;` simpan `safe`. Audit semua call audit yang menyimpan row User. |
| 19 | `stays.service.ts:218` | Ganti generator password: `randomBytes(9).toString('base64url')` (≥12 char, alfanumerik). |
| 20 | `common/guards/rate-limit.guard.ts` | Aktifkan `app.set('trust proxy', 1)` di main.ts; ganti store ke Redis untuk multi-replica; tambah sweep TTL pada `store`. |
| 21 | `main.ts` | Tambah header `Content-Security-Policy`; pertimbangkan refresh token + perpendek `JWT_EXPIRES_IN`. |
| 22 | `users.service.ts:89,134` | Cek email case-insensitive: `findFirst({ where: { email: { equals: dto.email, mode:'insensitive' } } })`; simpan email lowercase. |
| 23 | `auth.service.ts:293-313, 340-348` | Tambahkan keunikan nomor HP tenant (atau tolak login HP bila >1 match) untuk hindari reset salah sasaran. |
| 24 | `payment-submissions.controller.ts:150-177` | Cek `if (!file) throw BadRequest` di awal; bungkus `createSubmission` try/catch → bila gagal, `deleteFileSafe(securePath)`. |
| 25 | `date.util.ts` + `tenant-bookings.service.ts:83-89` | Konsistenkan semua tanggal bisnis ke `parseJakartaDateOnly`; hitung cutoff "21.00 WIB" dengan offset WIB, bukan endOfDay UTC. |
| 26 | `finance.service.ts:108` | Okupansi pakai stay yang sudah occupied (`initialMetersPromotedAt != null` atau room OCCUPIED), bukan semua ACTIVE. |
| 27 | `stays.service.ts:449-451`, renewStay catch | Jangan teruskan `error.message` Prisma; map ke pesan generik. |
| 28 | `deposit-ledger.service.ts:326-329` (summary) | Ganti `findMany` seluruh tabel → `groupBy`/agregasi SQL untuk totals. |
| 29 | `payment-submissions.service.ts:1255` & `invoice-payments.service.ts:171` | Perbaiki copy: notifikasi approve sesuai konteks (parsial vs lunas); pesan error CANCELLED yang benar. |

---

## Urutan rollout yang disarankan

1. **Stop-the-bleed (tanpa ubah skema):** #2, #5, #6, #7 — perbaikan logika murni, rendah risiko.
2. **Skema & index (butuh migration + backfill):** #1, #8, #14, #15, #16 — jalankan backfill duplikat dulu, baru index/migration.
3. **Konkurensi & lifecycle:** #3, #9 — butuh test race menyeluruh.
4. **Kebijakan bisnis (perlu keputusan owner):** #10, #11, #13, #17.
5. **Keamanan & polish:** #18–#29.

## Saran test regресi sebelum rilis

- Suite race: 2 request paralel untuk create payment, submit proof, manual check-in, expiry vs approve.
- Suite accounting: cancel invoice DRAFT/ISSUED/PARTIAL → cek tidak ada jurnal yatim, AR/kas balance.
- Suite deposit: check-in manual tanpa deposit → process deposit → reconciliationLite gap 0.
- Suite schema: `prisma migrate status` bersih + `\d "Stay"` punya `cancelReason`.
