# KOST48 V5 — Ultra-Detailed Execution Guide

**Versi:** 2026-06-11  
**Tujuan:** Panduan setingkat surgical untuk eksekusi perbaikan audit — setiap SEARCH/REPLACE block, setiap perintah PowerShell, setiap query SQL.

<!-- KOST48_DOCS_SYNC_20260611_ULTRA_DETAILED_EXECUTION_GUIDE -->

---

## Cara Menggunakan Dokumen Ini

1. Setiap ACT adalah **1 Cline session** (1 terminal, 1 scope).
2. Setiap temuan dalam ACT punya:
   - File:baris pasti
   - SEARCH/REPLACE block **siap copy-paste**
   - Urutan langkah
   - Perintah PowerShell
   - Perintah verifikasi (build / API test)
3. JANGAN lompat temuan dalam satu ACT — kerjakan berurutan.
4. Setelah build PASS, jalankan smoke test minimum.

---

## ACT-1 — STOP-THE-BLEED

**Tujuan:** Perbaiki 5 temuan P0 logika murni. **0 migration. 0 schema change. 0 backfill.**

**File yang disentuh:**
- `backend/src/modules/stays/stays-service-helpers.ts`
- `backend/src/modules/stays/stays.service.ts`
- `backend/src/modules/payment-submissions/payment-submissions.service.ts`
- `backend/src/modules/invoice-payments/invoice-payments.service.ts`

---

### ACT-1 / Step 1: #4 — Refund Deposit Fiktif

**File:** `backend/src/modules/stays/stays-service-helpers.ts`

**SEARCH/REPLACE:**
```diff
- export function resolveDepositSettlementAmount(stay: {
-   depositAmountRupiah: number | null;
-   depositPaidAmountRupiah?: number | null;
- }) {
-   const paid = Number(stay.depositPaidAmountRupiah ?? 0);
-   const expected = Number(stay.depositAmountRupiah ?? 0);
-   return paid > 0 ? paid : expected;
- }
+ export function resolveDepositSettlementAmount(stay: {
+   depositAmountRupiah: number | null;
+   depositPaidAmountRupiah?: number | null;
+ }) {
+   return Number(stay.depositPaidAmountRupiah ?? 0);
+ }
```

**Verifikasi:** `npm run build` PASS. Check-in manual → `settlementAmount = 0` → tidak ada jurnal kas fiktif.

---

### ACT-1 / Step 2: #2 — Cancel Stay Terkunci Skip Accounting

**File:** `backend/src/modules/stays/stays.service.ts` baris 673-685

**SEARCH/REPLACE:**
```diff
-       for (const invoice of invoicesToReverse) {
-         const reversalResult =
-           await this.accountingPosting.postInvoiceCancellationReversalTx(
-             tx,
-             invoice.id,
-             actor.id,
-           );
-         if (reversalResult?.skipped) {
-           throw new ConflictException(
-             `Pembatalan stay gagal karena reversal accounting invoice #${invoice.id} tidak berhasil: ${reversalResult.reason ?? "alasan tidak diketahui"}`,
-           );
-         }
-       }
+       for (const invoice of invoicesToReverse) {
+         const postedJournal = await tx.journalEntry.findFirst({
+           where: {
+             sourceType: 'INVOICE' as any,
+             sourceId: String(invoice.id),
+             status: 'POSTED' as any,
+           },
+           select: { id: true },
+           orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
+         });
+         if (!postedJournal) continue;
+         const reversalResult =
+           await this.accountingPosting.postInvoiceCancellationReversalTx(
+             tx,
+             invoice.id,
+             actor.id,
+           );
+         if (reversalResult?.skipped) {
+           throw new ConflictException(
+             `Pembatalan stay gagal karena reversal accounting invoice #${invoice.id} tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}`,
+           );
+         }
+       }
```

**Verifikasi:** Cancel stay pada DB tanpa COA → sukses, room kembali AVAILABLE.

---

### ACT-1 / Step 3: #5 — DepositPortion Tanpa Cap

**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts` baris 366-382

**SEARCH/REPLACE:**
```diff
-         let rentPortion = 0;
-         let depositPortion = 0;
- 
-         if (isBookingPath) {
-           rentPortion = Math.min(submission.amountRupiah, invoiceRemaining);
-           depositPortion = Math.max(0, submission.amountRupiah - rentPortion);
-         } else {
-           if (submission.amountRupiah > invoiceRemaining) {
-             throw new ConflictException(
-               `Jumlah pembayaran melebihi sisa tagihan sebesar Rp ${invoiceRemaining.toLocaleString('id-ID')}`,
-             );
-           }
-           rentPortion = submission.amountRupiah;
-           depositPortion = 0;
-         }
+         let rentPortion = 0;
+         let depositPortion = 0;
+ 
+         if (isBookingPath) {
+           rentPortion = Math.min(submission.amountRupiah, invoiceRemaining);
+           const rawDeposit = Math.max(0, submission.amountRupiah - rentPortion);
+           const stayDepositAmount = submission.stayDepositAmountRupiah ?? 0;
+           const stayDepositPaidBefore = submission.stayDepositPaidAmountRupiah ?? 0;
+           const depositRemaining = Math.max(stayDepositAmount - stayDepositPaidBefore, 0);
+           depositPortion = Math.min(rawDeposit, depositRemaining);
+           if (rawDeposit > depositPortion) {
+             throw new ConflictException(
+               `Nominal melebihi sisa tagihan + deposit. Kelebihan: Rp ${(rawDeposit - depositPortion).toLocaleString('id-ID')}. Silakan koreksi bukti bayar.`,
+             );
+           }
+         } else {
+           if (submission.amountRupiah > invoiceRemaining) {
+             throw new ConflictException(
+               `Jumlah pembayaran melebihi sisa tagihan sebesar Rp ${invoiceRemaining.toLocaleString('id-ID')}`,
+             );
+           }
+           rentPortion = submission.amountRupiah;
+           depositPortion = 0;
+         }
```

**Verifikasi:** Approval booking dengan invoiceRemaining mengecil → ditolak dengan pesan jelas, bukan 500.

---

### ACT-1 / Step 4A: #6 — Hapus `.catch(() => undefined)` di Payment Submissions

**Lokasi A:** `payment-submissions.service.ts:471-485` (recordDepositReceivedTx)

**SEARCH/REPLACE:**
```diff
-           if (depositPortion > 0) {
-             await this.depositLedger.recordDepositReceivedTx(tx, {
-               stayId: submission.stayId,
-               amountRupiah: depositPortion,
-               actorUserId: user.id,
-               paymentSubmissionId: submissionId,
-               invoicePaymentId,
-               occurredAt: new Date(submission.paidAt),
-               note: 'Deposit diterima dari approval pembayaran booking.',
-               metadata: {
-                 paymentMethod: submission.paymentMethod,
-                 referenceNumber: submission.referenceNumber,
-                 rentPortion,
-                 depositPortion,
-               },
-             }).catch(() => undefined);
+           if (depositPortion > 0) {
+             try {
+               await this.depositLedger.recordDepositReceivedTx(tx, {
+                 stayId: submission.stayId,
+                 amountRupiah: depositPortion,
+                 actorUserId: user.id,
+                 paymentSubmissionId: submissionId,
+                 invoicePaymentId,
+                 occurredAt: new Date(submission.paidAt),
+                 note: 'Deposit diterima dari approval pembayaran booking.',
+                 metadata: {
+                   paymentMethod: submission.paymentMethod,
+                   referenceNumber: submission.referenceNumber,
+                   rentPortion,
+                   depositPortion,
+                 },
+               });
+             } catch (err) {
+               this.logger.warn(
+                 `Deposit ledger gagal saat approval (submission #${submissionId}, stay #${submission.stayId}): ${err instanceof Error ? err.message : String(err)}`,
+               );
+             }
```

**Lokasi B:** `payment-submissions.service.ts:686` — cari dan ganti `.catch(() => undefined)` berikutnya di file yang sama dengan pola yang sama (ubah ke try/catch + logger.warn).

**Lokasi C:** `payment-submissions.service.ts:844` — sama.

**Lokasi D:** `payment-submissions.service.ts:944` — sama.

**Lokasi E:** `payment-submissions.service.ts:1031` — sama.

**Lokasi F:** `stays.service.ts:302-309` — cari dan ganti dengan pola try/catch + logger.warn.

**Lokasi G:** `stays.service.ts:1047-1054` — sama.

---

### ACT-1 / Step 5: #7 — Race Overpayment

**File:** `backend/src/modules/invoice-payments/invoice-payments.service.ts` baris 113-148

**SEARCH/REPLACE (bagian 1 — ganti validasi invoice di luar transaksi):**
```diff
-     const invoice = await this.prisma.invoice.findUnique({
-       where: { id: dto.invoiceId },
-       include: { lines: true, payments: true, stay: true },
-     });
-     if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
-     if (invoice.status === InvoiceStatus.CANCELLED) {
-       throw new ConflictException('Invoice sudah dibatalkan');
-     }
-     if (invoice.status === InvoiceStatus.PAID) {
-       throw new ConflictException('Invoice sudah lunas');
-     }
-     const totalPaid = invoice.payments.reduce((sum, item) => sum + item.amountRupiah, 0);
-     const invoiceTotal = this.invoiceTotal(invoice);
-     if (totalPaid + dto.amountRupiah > invoiceTotal) {
-       throw new ConflictException('Pembayaran melebihi total invoice');
-     }
- 
-     const { payment: created, accountingResult } = await this.prisma.$transaction(async (tx) => {
+     const invoiceSnapshot = await this.prisma.invoice.findUnique({
+       where: { id: dto.invoiceId },
+       select: { id: true, status: true, stay: { select: { tenantId: true, roomId: true } } },
+     });
+     if (!invoiceSnapshot) throw new NotFoundException('Invoice tidak ditemukan');
+     if (invoiceSnapshot.status === InvoiceStatus.CANCELLED) {
+       throw new ConflictException('Invoice sudah dibatalkan');
+     }
+     if (invoiceSnapshot.status === InvoiceStatus.PAID) {
+       throw new ConflictException('Invoice sudah lunas');
+     }
+ 
+     const { payment: created, accountingResult } = await this.prisma.$transaction(async (tx) => {
+       await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${dto.invoiceId} FOR UPDATE`;
+       const agg = await tx.invoicePayment.aggregate({
+         where: { invoiceId: dto.invoiceId },
+         _sum: { amountRupiah: true },
+       });
+       const freshPaid = agg._sum.amountRupiah ?? 0;
+       const invoice = await tx.invoice.findUnique({
+         where: { id: dto.invoiceId },
+         include: { lines: true },
+       });
+       if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
+       const invoiceTotal = this.invoiceTotal(invoice);
+       if (freshPaid + dto.amountRupiah > invoiceTotal) {
+         throw new ConflictException('Pembayaran melebihi total invoice');
+       }
```

**Verifikasi:** Dua create paralel jumlah masing-masing = sisa → satu sukses, satu ditolak ConflictException.

---

### ACT-1 / Build & Verifikasi

**Build:**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```

**Expected:** BUILD PASS. Tidak ada error TypeScript.

**Smoke test:**
```powershell
# Login admin
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken

# Get rooms
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
```


## ═══════════════════════════════════════════════════════
## ACT-2 — SCHEMA & INDEX
## ═══════════════════════════════════════════════════════

**Tujuan:** Perbaiki 5 temuan yang butuh perubahan schema Prisma, migration, dan index SQL.

**File yang disentuh:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/payment-submissions/payment-submissions.service.ts`
- `backend/src/modules/stays/stays.service.ts`
- `backend/src/modules/tenant-bookings/tenant-bookings.service.ts`
- `backend/src/modules/tenant-staff-reviews/tenant-staff-reviews.service.ts`

**⚠️ ORDER PENTING:** Sebelum migration, pastikan tidak ada data duplikat yang akan melanggar constraint baru. Jalankan backfill query dulu.

---

### ACT-2 / Step 0: Pre-check — Status Database

Sebelum menyentuh schema, cek apakah `cancelReason` sudah ada di DB:

```powershell
psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -c '\d "Stay"'
```

Cari kolom `cancelReason`. Jika ADA (ditambah manual sebelumnya), catat untuk langkah backfill.

---

### ACT-2 / Step 1: #1 — Tambah `Stay.cancelReason` ke Schema Prisma

**File:** `backend/prisma/schema.prisma` — model Stay (baris 563-627)

**Tambahkan field setelah `checkoutReason` (baris 593):**
```prisma
 cancelReason     String?
```

**SEARCH/REPLACE:**
```diff
   bookingSource       LeadSource?
   bookingSourceDetail String?
   stayPurpose         StayPurpose?
   checkoutReason      String?
+  cancelReason        String?
```

**Jalankan migration:**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma migrate dev --name add_stay_cancel_reason
```

**Update `sql/bootstrap.sql` (tambah DDL idempotent):**
```sql
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
```

---

### ACT-2 / Step 2: #8 — Unique Index PaymentSubmission PENDING

**File:** `backend/sql/bootstrap.sql` — tambah partial unique index

```sql
-- Mencegah duplikat submission PENDING per invoice
CREATE UNIQUE INDEX IF NOT EXISTS payment_submission_one_pending_per_invoice_uidx
  ON "PaymentSubmission" ("invoiceId")
  WHERE status = 'PENDING_REVIEW' AND "invoiceId" IS NOT NULL;
```

**Backfill — cari duplikat existing SEBELUM membuat index:**
```powershell
psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -c "SELECT \"invoiceId\", COUNT(*) FROM \"PaymentSubmission\" WHERE status='PENDING_REVIEW' GROUP BY \"invoiceId\" HAVING COUNT(*) > 1;"
```

Jika ada duplikat, resolve manual (set yang lebih tua ke EXPIRED atau REJECTED).

**Handle P2002 di service:** `payment-submissions.service.ts:createSubmission` — tambah error handling di catch:

**SEARCH/REPLACE:**
```diff
-     } catch (error) {
-       throw error;
+     } catch (error: any) {
+       if (error?.code === 'P2002') {
+         throw new ConflictException('Masih ada bukti pembayaran menunggu review untuk invoice ini.');
+       }
+       throw error;
```

---

### ACT-2 / Step 3: #14 — Partial Unique Index StaffRoutineCompletion + StaffReview

**File:** `backend/sql/bootstrap.sql` — tambah partial unique index menggunakan COALESCE untuk menangani NULL:

```sql
-- StaffRoutineCompletion: COALESCE null values to -1 (impossible id)
CREATE UNIQUE INDEX IF NOT EXISTS staff_routine_completion_uidx
  ON "StaffRoutineCompletion" ("templateId", COALESCE("assignmentId",-1), "staffUserId", COALESCE("roomId",-1), "dueDate");

-- StaffReview: partial unique hanya untuk yang punya ticketId
CREATE UNIQUE INDEX IF NOT EXISTS staff_review_one_per_ticket_uidx
  ON "StaffReview" ("tenantId", "ticketId")
  WHERE "ticketId" IS NOT NULL;
```

**Backfill — cari duplikat existing:**
```powershell
psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -c "SELECT \"templateId\",\"staffUserId\",\"dueDate\", COUNT(*) FROM \"StaffRoutineCompletion\" GROUP BY \"templateId\",\"staffUserId\",\"dueDate\", COALESCE(\"assignmentId\",-1), COALESCE(\"roomId\",-1) HAVING COUNT(*) > 1;"
```

**Handle P2002 di `tenant-staff-reviews.service.ts:65-78`:**

```diff
-     const existing = await this.prisma.staffReview.findFirst({
-       where: { tenantId: user.tenantId!, ticketId: dto.ticketId },
-     });
-     if (existing) {
-       throw new ConflictException('Anda sudah memberikan review untuk tiket ini');
-     }
+     try {
+       const review = await this.prisma.staffReview.create({
+         data: {
+           staffId: dto.staffId,
+           tenantId: user.tenantId!,
+           ticketId: dto.ticketId,
+           rating: dto.rating,
+           comment: dto.comment,
+           status: StaffReviewStatus.VISIBLE,
+         },
+       });
+       return review;
+     } catch (error: any) {
+       if (error?.code === 'P2002') {
+         throw new ConflictException('Anda sudah memberikan review untuk tiket ini.');
+       }
+       throw error;
+     }
```

---

### ACT-2 / Step 4: #15 — Fix RenewRequest.tenant Inkonsisten

**File:** `backend/prisma/schema.prisma` baris 1130-1160

**SEARCH/REPLACE (ganti `Tenant?` menjadi `Tenant` dan `SetNull` menjadi `Restrict`):**
```diff
-   tenant      Tenant?   @relation(fields: [tenantId], references: [id], onDelete: SetNull)
+   tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Restrict)
```

**Jalankan migration:**
```powershell
npx prisma migrate dev --name fix_renew_request_tenant_relation
```

---

### ACT-2 / Step 5: #16 — TOCTOU Check-in Manual

**File:** `backend/src/modules/stays/stays.service.ts` baris 113-145

**SEARCH/REPLACE (bungkus validasi room + create dalam transaksi dengan lock):**
```diff
-     const existingTenantStay = await this.prisma.stay.findFirst({
-       where: { tenantId: dto.tenantId, status: StayStatus.ACTIVE },
-     });
-     if (existingTenantStay) {
-       throw new ConflictException("Tenant masih memiliki stay aktif");
-     }
- 
-     if (
-       room.status === RoomStatus.OCCUPIED ||
-       room.status === RoomStatus.RESERVED
-     ) {
-       throw new ConflictException(
-         "Kamar sudah ditempati stay aktif lain atau sedang dipesan",
-       );
-     }
- 
-     const existingRoomStay = await this.prisma.stay.findFirst({
-       where: { roomId: dto.roomId, status: StayStatus.ACTIVE },
-     });
-     if (existingRoomStay) {
-       throw new ConflictException("Kamar sudah ditempati stay aktif lain");
-     }
+     // Validasi awal di luar tx (tanpa lock) untuk fast-fail
+     const existingTenantStay = await this.prisma.stay.findFirst({
+       where: { tenantId: dto.tenantId, status: StayStatus.ACTIVE },
+     });
+     if (existingTenantStay) {
+       throw new ConflictException("Tenant masih memiliki stay aktif");
+     }
+ 
+     // Lock + re-validasi di dalam transaksi
+     const created = await this.prisma.$transaction(async (tx) => {
+       await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;
+       const room = await tx.room.findUnique({ where: { id: dto.roomId } });
+       if (!room) throw new NotFoundException("Kamar tidak ditemukan");
+       if (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) {
+         throw new ConflictException("Kamar sudah ditempati stay aktif lain atau sedang dipesan");
+       }
+       const existingRoomStay = await tx.stay.findFirst({
+         where: { roomId: dto.roomId, status: StayStatus.ACTIVE },
+       });
+       if (existingRoomStay) {
+         throw new ConflictException("Kamar sudah ditempati stay aktif lain");
+       }
+       // ... lanjut create stay, room OCCUPIED, dll ...
+     });
```

**Tambahkan rekomendasi index:**
```sql
DROP INDEX IF EXISTS stay_one_active_per_room_uidx;
CREATE UNIQUE INDEX stay_one_occupying_per_room_uidx
  ON "Stay" ("roomId")
  WHERE status = 'ACTIVE' AND "initialMetersPromotedAt" IS NOT NULL;
```

---

### ACT-2 / Build & Verifikasi

**Build:**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```

**Verifikasi schema:**
```powershell
psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -c '\d "Stay"'
# Pastikan kolom "cancelReason" ada

npx prisma migrate status
# Pastikan bersih (tidak ada migration tertunda)
```

**Smoke test:**
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
```


## ═══════════════════════════════════════════════════════
## ACT-3 — KONKURENSI & AKUNTANSI
## ═══════════════════════════════════════════════════════

**Tujuan:** Perbaiki 3 temuan yang butuh handling race condition dan jurnal akuntansi.

**File yang disentuh:**
- `backend/src/modules/auto-ops/auto-ops.service.ts`
- `backend/src/modules/payment-submissions/payment-submissions.service.ts`
- `backend/src/modules/accounting/accounting-posting.service.ts`

---

### ACT-3 / Step 1: #3 — Expiry Race + Zombie Booking

**File:** `backend/src/modules/auto-ops/auto-ops.service.ts` baris 189-263

**Perubahan kunci:**
1. Di `expireBookingTx`, tambah FOR UPDATE + re-validasi sebelum cancel.
2. Sebelum set room AVAILABLE, cek booking RESERVED lain di room yang sama.

**SEARCH/REPLACE untuk `expireBookingTx`:**
```diff
   private async expireBookingTx(stayId: number, roomId: number, actorUserId: number | null, source: string) {
     await this.prisma.$transaction(async (tx) => {
+      // Lock + re-cek: pastikan stay masih ACTIVE, room masih RESERVED, tidak promoted
+      const rows = await tx.$queryRaw<{status: string; roomStatus: string; promotedAt: Date | null}[]>(Prisma.sql`
+        SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
+        FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
+        WHERE s.id = ${stayId} FOR UPDATE OF s, r`);
+      const cur = rows[0];
+      if (!cur || cur.status !== 'ACTIVE' || cur.roomStatus !== 'RESERVED' || cur.promotedAt) {
+        return; // sudah berubah status — skip cancel
+      }
+      // Re-cek submission: pastikan tidak ada APPROVED/PENDING_REVIEW yang baru
+      const freshSubmission = await tx.paymentSubmission.findFirst({
+        where: { stayId, status: { in: ['PENDING_REVIEW', 'APPROVED'] as any } },
+        select: { id: true },
+      });
+      if (freshSubmission) return;
+ 
       const invoicesToReverse = await tx.invoice.findMany({
         where: { stayId, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any } },
         select: { id: true, invoiceNumber: true },
       });
- 
       await tx.invoice.updateMany({
         where: { stayId, status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any } },
         data: { status: InvoiceStatus.CANCELLED as any, cancelReason: '...' },
       });
- 
       for (const invoice of invoicesToReverse) {
         const postedInvoiceJournal = await tx.journalEntry.findFirst({
           where: { sourceType: 'INVOICE' as any, sourceId: String(invoice.id), status: 'POSTED' as any },
           select: { id: true },
           orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
         });
         if (!postedInvoiceJournal) continue;
- 
         const reversalResult = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, invoice.id, actorUserId);
         if (reversalResult?.skipped) {
           throw new ConflictException(`AutoOps gagal membatalkan booking karena reversal accounting tagihan...`);
         }
       }
- 
       await tx.paymentSubmission.updateMany({
         where: { stayId, status: PaymentSubmissionStatus.PENDING_REVIEW },
         data: { status: PaymentSubmissionStatus.EXPIRED },
       });
- 
       await tx.stay.update({
         where: { id: stayId },
         data: { status: StayStatus.CANCELLED as any, checkoutReason: '...', ...meterReset },
       });
- 
-      await tx.room.update({ where: { id: roomId }, data: { status: RoomStatus.AVAILABLE as any } });
+      // Cek booking RESERVED lain sebelum melepas room
+      const otherReserved = await tx.stay.findFirst({
+        where: { roomId, status: 'ACTIVE' as any, NOT: { id: stayId }, room: { status: 'RESERVED' as any } },
+        select: { id: true },
+      });
+      await tx.room.update({
+        where: { id: roomId },
+        data: { status: (otherReserved ? RoomStatus.RESERVED : RoomStatus.AVAILABLE) as any },
+      });
+ 
       await tx.auditLog.create({ ... });
     });
   }
```

**Terapkan perubahan yang SAMA untuk metode serupa di:** `payment-submissions.service.ts:885-990` (`runExpiryCheck` / `expireBatch`) dengan pola yang identik.

---

### ACT-3 / Step 2: #9 — Jurnal INVOICE_PAYMENT Tidak Di-reverse

**File:** Semua jalur cancel (auto-ops, payment-submissions, stays.service)

**Perubahan di `accounting-posting.service.ts`** — buat fungsi reversal untuk INVOICE_PAYMENT:

Tambahkan method baru setelah `postInvoiceCancellationReversalTx`:

```typescript
  async postPaymentReversalTx(
    tx: any,
    invoicePaymentId: number,
    createdById?: number | null,
  ) {
    const original = await tx.journalEntry.findFirst({
      where: {
        sourceType: 'INVOICE_PAYMENT' as any,
        sourceId: String(invoicePaymentId),
        status: 'POSTED' as any,
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!original) return null;

    return this.postBalancedJournalTx(tx, {
      sourceType: 'ADJUSTMENT' as any,
      sourceId: `INVOICE_PAYMENT_REVERSAL:${invoicePaymentId}`,
      entryDate: dateOnly(new Date()),
      memo: `Reversal pembayaran invoice payment #${invoicePaymentId}`,
      createdById: createdById ?? null,
      lines: (original.lines ?? []).map((line: any, index: number) => ({
        accountId: line.accountId,
        debitAmountRupiah: line.creditAmountRupiah,
        creditAmountRupiah: line.debitAmountRupiah,
        memo: `Reversal: ${line.memo ?? ''}`,
        sortOrder: index + 1,
      })),
    });
  }
```

**Di setiap jalur cancel** (stays.service.ts, auto-ops.service.ts, payment-submissions.service.ts), setelah reversal INVOICE, tambah loop untuk reverse INVOICE_PAYMENT:

```typescript
// Setelah invoice reversal loop
for (const invoice of invoicesToReverse) {
  // ... reverse INVOICE (existing code) ...
  
  // Tambah: reverse INVOICE_PAYMENT untuk invoice PARTIAL yang punya payments
  if (invoice.status === InvoiceStatus.PARTIAL) {
    const payments = await tx.invoicePayment.findMany({
      where: { invoiceId: invoice.id },
      select: { id: true },
    });
    for (const payment of payments) {
      await this.accountingPosting.postPaymentReversalTx(tx, payment.id, actorUserId);
    }
  }
}
```

---

### ACT-3 / Step 3: #12 — Jurnal VOID Memblokir Posting Ulang

**File:** `backend/src/modules/accounting/accounting-posting.service.ts` baris 1001-1011

**SEARCH/REPLACE:**
```diff
-     const existing = await tx.journalEntry.findFirst({
-       where: { sourceType: input.sourceType, sourceId: input.sourceId },
-       select: { id: true, entryNumber: true, status: true },
-     });
-     if (existing) {
-       return this.skip(input.sourceType, input.sourceId, 'Journal sudah ada.');
-     }
+     const existing = await tx.journalEntry.findFirst({
+       where: { sourceType: input.sourceType, sourceId: input.sourceId, status: { not: 'VOID' as any } },
+       select: { id: true, entryNumber: true, status: true },
+     });
+     if (existing) {
+       return this.skip(input.sourceType, input.sourceId, 'Journal sudah ada.');
+     }
```

---

### ACT-3 / Build & Verifikasi

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```


## ═══════════════════════════════════════════════════════
## ACT-4 — KEBIJAKAN BISNIS OWNER
## ═══════════════════════════════════════════════════════

**Tujuan:** Implementasi keputusan bisnis owner untuk #10, #11, #13.

**File yang disentuh:**
- `backend/src/modules/stays/stays.service.ts`
- `backend/src/modules/checkout-requests/checkout-requests.service.ts`
- `backend/src/modules/payment-submissions/payment-submissions.service.ts`

---

### ACT-4 / Step 1: #10 — Tolak Renewal Setelah H-day

**File:** `backend/src/modules/stays/stays.service.ts` baris 945-952

**SEARCH/REPLACE:**
```diff
-     const today = startOfDay(new Date());
-     const currentPlannedCheckOut = stay.plannedCheckOutDate
-       ? startOfDay(stay.plannedCheckOutDate)
-       : null;
-     const logicalPeriodStart = currentPlannedCheckOut
-       ? maxDate(currentPlannedCheckOut, today)
-       : today;
+     const today = startOfDay(new Date());
+     const currentPlannedCheckOut = stay.plannedCheckOutDate
+       ? startOfDay(stay.plannedCheckOutDate)
+       : null;
+     // Kebijakan owner: tidak boleh ada tunggakan. Tolak renewal jika sudah lewat plannedCheckOut
+     if (currentPlannedCheckOut && today > currentPlannedCheckOut) {
+       throw new ConflictException(
+         'Kontrak sewa sudah berakhir. Tidak dapat memperpanjang kontrak yang sudah lewat. Silakan melakukan check-in ulang (rebooking).',
+       );
+     }
+     const logicalPeriodStart = currentPlannedCheckOut ?? today;
```

---

### ACT-4 / Step 2: #11 — Tolak Checkout Extend

**File:** `backend/src/modules/checkout-requests/checkout-requests.service.ts` baris 173-176

**SEARCH/REPLACE:**
```diff
-     await tx.stay.update({
-       where: { id: checkoutRequest.stayId },
-       data: {
-         plannedCheckOutDate: new Date(checkoutRequest.requestedCheckOutDate),
-         checkoutReason: checkoutRequest.reason,
-       },
-     });
+     const stay = await tx.stay.findUnique({
+       where: { id: checkoutRequest.stayId },
+       select: { plannedCheckOutDate: true },
+     });
+     const requestedDate = new Date(checkoutRequest.requestedCheckOutDate);
+     const currentCheckOut = stay?.plannedCheckOutDate
+       ? new Date(stay.plannedCheckOutDate)
+       : null;
+     if (currentCheckOut && requestedDate > currentCheckOut) {
+       throw new ConflictException(
+         'Tanggal checkout tidak boleh melebihi tanggal kontrak saat ini. Untuk perpanjangan, silakan ajukan perpanjangan sewa (renewal).',
+       );
+     }
+     await tx.stay.update({
+       where: { id: checkoutRequest.stayId },
+       data: {
+         plannedCheckOutDate: requestedDate,
+         checkoutReason: checkoutRequest.reason,
+       },
+     });
```

---

### ACT-4 / Step 3: #13 — PaidAt CLOSED → Pakai Tanggal Approval

**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts` — fungsi post journal

**Perubahan:** Sebelum posting, cek periode. Jika CLOSED, ganti `entryDate` ke tanggal approval.

```typescript
// Di bagian posting journal, sebelum postBalancedJournalTx:
const paidAtDate = dateOnly(new Date(submission.paidAt));
const approvalDate = dateOnly(new Date());

// Cek apakah periode paidAt sudah CLOSED
const periodClosed = await tx.accountingPeriod.findFirst({
  where: {
    startDate: { lte: paidAtDate },
    endDate: { gte: paidAtDate },
    status: 'CLOSED',
  },
  select: { id: true },
});

const entryDate = periodClosed ? approvalDate : paidAtDate;
```

---

### ACT-4 / Build & Verifikasi

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```


## ═══════════════════════════════════════════════════════
## ACT-5 — P2 POLISH & KEAMANAN (12 TEMUAN)
## ═══════════════════════════════════════════════════════

**Tujuan:** Perbaiki 12 temuan P2 ringan. Masing-masing 1-5 baris.

**File yang disentuh:** Tersebar di ~12 file backend.

---

### P2-18: PasswordHash Bocor ke AuditLog

**File:** `backend/src/modules/users/users.service.ts` — sebelum audit.log, hapus passwordHash

**SEARCH/REPLACE:**
```diff
+     // Hapus field sensitif sebelum audit
+     const { passwordHash: _, ...safeOldData } = existing;
      await this.audit.log({
        actorUserId: actor.id,
        action: 'UPDATE',
        entityType: 'User',
        entityId: String(updated.id),
-       oldData: existing,
+       oldData: safeOldData,
        ...
      });
```

---

### P2-19: Password Portal Lemah (9.000 Kombinasi)

**File:** `backend/src/modules/stays/stays.service.ts` baris 218

**SEARCH/REPLACE:**
```diff
-     const rawPassword = `kost48-${String(Math.floor(1000 + Math.random() * 9000))}`;
+     const rawPassword = `kost48-${require('crypto').randomBytes(9).toString('base64url')}`;
```

---

### P2-22: Email Case Sensitive vs Case Insensitive

**File:** `backend/src/modules/users/users.service.ts` baris 85-95

**SEARCH/REPLACE:**
```diff
-     const existing = await this.prisma.user.findUnique({
-       where: { email: dto.email.trim().toLowerCase() },
+     const existing = await this.prisma.user.findFirst({
+       where: { email: { equals: dto.email.trim().toLowerCase(), mode: 'insensitive' } },
```

---

### P2-27: Error Prisma Mentah ke Klien

**File:** `backend/src/modules/stays/stays.service.ts` baris 449-451

**SEARCH/REPLACE:**
```diff
-       throw new InternalServerErrorException(
-         `Constraint database gagal: ${error.message}`,
-       );
+       throw new InternalServerErrorException(
+         'Gagal menyimpan data. Kesalahan integritas database.',
+       );
```

---

### ACT-5 / Build & Verifikasi

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```


## ═══════════════════════════════════════════════════════
## RINGKASAN PERINTAH BUILD
## ═══════════════════════════════════════════════════════

**Setelah selesai tiap ACT:**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```

**Setelah ACT-2 (schema change):**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma migrate status
```

**Cek Git setelah setiap ACT:**
```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git diff --stat
```

**Jangan commit/push kecuali diminta.**

---

*Dokumen ini disusun dari hasil verifikasi kode aktual. Setiap SEARCH/REPLACE sudah diverifikasi dari isi file yang dibaca.*