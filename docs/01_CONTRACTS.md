# KOST48 V3/V4 — Contracts & API
**Versi:** 2026-04-28 clean consolidation  
**Fungsi:** Kontrak bisnis/API aktif. Untuk status fase lihat `00_GROUND_STATE.md`; untuk rencana eksekusi lihat `02_PLAN.md`.

---

## 1. Prinsip Kontrak

1. `schema.prisma` = bentuk data.
2. `bootstrap.sql` = pagar integritas DB.
3. Service = alur bisnis, validasi, kalkulasi.
4. Controller tipis: routing + auth guard.
5. Actor selalu diambil dari JWT auth context (`req.user.id`).
6. Semua transaksi penting multi-entity wajib `prisma.$transaction()`.
7. Raw SQL hanya jika perlu locking/compatibility; default tetap Prisma-first.
8. Error message harus Bahasa Indonesia, operasional-friendly, dan tidak expose internal stack di production.

---

## 2. Core Stay Contract

### 2.1 Direct backoffice check-in
- Endpoint existing: `POST /stays`.
- Room langsung `OCCUPIED`.
- Stay langsung `ACTIVE` operasional.
- Meter awal listrik dan air wajib.
- Meter awal langsung dibuat sebagai 2 `MeterReading` dalam transaction yang sama.
- Invoice awal `DRAFT` + line `RENT` dibuat otomatis.

### 2.2 Checkout
- Endpoint existing: `POST /stays/:id/complete`.
- `checkoutReason` wajib.
- Room kembali `AVAILABLE` jika tidak ada stay aktif lain.
- Deposit tidak diproses otomatis.
- Meter/payment/invoice/deposit history tidak boleh dihapus.

### 2.3 Cancel operational stay
- Endpoint existing: `POST /stays/:id/cancel`.
- `cancelReason` wajib/tersimpan eksplisit.
- Tidak boleh menghapus histori operasional.

### 2.4 Renew
- Endpoint existing: `POST /stays/:id/renew`.
- Renewal = extend existing active stay, bukan create parallel stay baru.
- Invoice renewal `DRAFT` dibuat otomatis.
- Renewal tenant self-service nanti harus berupa request + admin approval, bukan auto-renew.

---

## 3. Tenant Booking Contract

### 3.1 Public room catalog
- `GET /public/rooms`
- Public/guest/tenant melihat room aktif yang masih `AVAILABLE`.
- Mendukung search, floor, pricingTerm bila tersedia.

### 3.2 Create tenant booking
- `POST /tenant/bookings`
- Role: TENANT.
- Tenant hanya bisa booking untuk diri sendiri.
- Tenant tidak boleh punya stay/booking aktif lain.
- Room harus `AVAILABLE`.
- Setelah booking:
  - `Stay.status = ACTIVE` sebagai konteks booking.
  - `Room.status = RESERVED`.
  - `expiresAt` terisi.
  - Belum membuat `MeterReading` final.
  - Belum menjadi hunian operasional.

### 3.3 My bookings
- `GET /tenant/bookings/my`
- Tenant hanya melihat booking miliknya.
- Response harus manusiawi: room, pricing term, check-in, expiresAt, status, invoice/payment state bila ada.
- Tidak expose ID teknis yang tidak perlu ke UI tenant.

### 3.4 Admin approve booking
- `PATCH /admin/bookings/:stayId/approve`
- Role: OWNER/ADMIN.
- Admin mengisi:
  - `agreedRentAmountRupiah`
  - `depositAmountRupiah`
  - `initialElectricityKwh`
  - `initialWaterM3`
- Setelah approve booking:
  - Stay tetap `ACTIVE`.
  - Room tetap `RESERVED`.
  - Invoice awal dibuat/di-issue sesuai policy existing.
  - Meter awal disimpan sebagai pending snapshot di `Stay`.
  - `MeterReading` tetap `0` sampai payment approved.

---

## 4. Pending Meter Snapshot Contract — Phase 4.3-G2 PASS

### 4.1 Field konseptual di Stay
Pending snapshot menyimpan meter awal tenant booking sebelum room benar-benar occupied:
- `initialElectricityKwhPending`
- `initialWaterM3Pending`
- `initialMetersRecordedAt`
- `initialMetersRecordedById`
- `initialMetersPromotedAt`

### 4.2 Promotion rule
`MeterReading` final dibuat hanya saat:
1. Payment submission approved.
2. Room berubah `RESERVED -> OCCUPIED`.
3. Pending snapshot ada dan belum promoted.

Promotion harus:
- membuat 2 `MeterReading`: `ELECTRICITY` + `WATER`,
- memakai value pending snapshot,
- idempotent/no duplicate,
- set `initialMetersPromotedAt`,
- clear pending snapshot fields setelah sukses sesuai implementasi yang sudah PASS.

### 4.3 Expiry/cancel before occupied
Jika booking cancelled/expired sebelum occupied:
- Stay menjadi `CANCELLED`.
- Room kembali `AVAILABLE`.
- Pending snapshot fields menjadi `null`.
- Tidak ada `MeterReading` yang dihapus.
- Global meter history tetap aman.

### 4.4 Expire after occupied
`expire-booking` pada stay yang sudah room `OCCUPIED` atau meter promoted harus ditolak `409` dengan pesan operasional:
> Booking sudah menjadi hunian aktif. Gunakan checkout untuk mengakhiri stay.

---

## 5. Payment Submission Contract — 4.2 Core Accepted

### 5.1 Endpoint aktif/target
- `POST /payment-submissions`
- `GET /payment-submissions/my`
- `GET /payment-submissions/review-queue`
- `GET /payment-submissions/:id`
- `POST /payment-submissions/:id/approve`
- `POST /payment-submissions/:id/reject`
- Internal/manual expiry path sesuai implementasi saat ini.

### 5.2 Tenant create submission
Tenant submit bukti bayar booking awal. Tenant tidak menulis langsung ke `InvoicePayment`.

Payload minimal:
- `stayId` atau context booking yang valid sesuai implementasi.
- `invoiceId` bila target invoice dibutuhkan.
- `amountRupiah`.
- `paidAt`.
- `paymentMethod`.
- optional proof metadata: `fileUrl`, `originalFilename`, `mimeType`, `fileSizeBytes`, `notes`, `referenceNumber`, dll.

Rules:
- Tenant hanya submit untuk booking miliknya.
- Booking harus masih `ACTIVE + RESERVED`.
- Nominal workflow booking awal wajib tepat sebesar sisa sewa + sisa deposit.
- No underpay, no overpay, no partial pada booking initial payment.
- Jika nominal salah, backend menolak dan tidak membuat side effect final.

### 5.3 Admin approve submission
Dalam transaction:
1. Lock/read submission.
2. Guard status harus `PENDING_REVIEW`.
3. Guard invoice/stay/room valid.
4. Buat `InvoicePayment` untuk rent portion.
5. Update deposit payment tracking untuk deposit portion.
6. Sync invoice status.
7. Set `PaymentSubmission.status = APPROVED`.
8. Jika rent + deposit paid, update room `RESERVED -> OCCUPIED`.
9. Promote pending meter snapshot menjadi `MeterReading`.
10. Audit/log/app notification bila tersedia.

### 5.4 Admin reject submission
- Status menjadi `REJECTED`.
- `reviewNotes` wajib.
- Booking tetap `RESERVED` selama belum expired/cancelled.
- Tenant dapat submit ulang jika booking masih valid.

### 5.5 Double approve prevention
- Submission yang sudah `APPROVED/REJECTED/EXPIRED` tidak boleh diproses ulang.
- Tidak boleh ada duplicate `InvoicePayment` final dari satu submission.

---

## 6. Announcement, AppNotification, Reminder Contract

### 6.1 Announcement
- Announcement adalah konten broadcast/pengumuman.
- Audience existing tetap ada, tetapi audience `TENANT` operasional hanya boleh untuk tenant occupied.
- Tenant non-occupied redirect dari `/portal/announcements` ke `/portal/bookings`.

### 6.2 AppNotification
- AppNotification adalah inbox personal/read-unread per user.
- Endpoint aktif:
  - `GET /me/notifications`
  - `PATCH /me/notifications/:id/read`
  - `PATCH /me/notifications/read-all`
- Query dan mark-read wajib scoped ke user login.
- Mock reminder boleh membuat AppNotification untuk tenant target jika tenant punya portal user.
- Gagal membuat AppNotification tidak boleh menggagalkan mock send.

### 6.3 Payment urgency chip
- Bukan AppNotification.
- Bukan Announcement.
- Ini indikator kondisi bisnis aktif.
- Read/unread notification tidak boleh menghilangkan chip.
- Chip hilang hanya jika kondisi bisnis selesai: invoice paid, booking resolved, stay/contract resolved.

---

## 7. Pricing Policy Contract

- Harga dasar kamar = `monthlyRateRupiah`.
- DAILY = 13% × monthly, rounded up to Rp5.000.
- WEEKLY = 45% × monthly, rounded up to Rp5.000.
- BIWEEKLY = 75% × monthly, rounded up to Rp5.000.
- MONTHLY = 100% × monthly.
- SMESTERLY/SEMESTERLY = 5,5 × monthly.
- YEARLY = 10 × monthly.
- Deposit tidak dikalikan term; deposit mengikuti default deposit room.
- Admin dapat override saat approval booking.
- Short-term includes utilities normal; long-term utilities by meter.

---

## 8. Role Contract

### OWNER/ADMIN
- Mengelola tenant, room, stay, invoice, payment review, announcement, user sesuai guard.
- Admin tidak boleh edit/delete OWNER atau mengubah role menjadi OWNER.

### STAFF
- Fokus operasional terbatas: tickets, rooms/inventory sesuai izin.
- Tidak boleh approve payment atau manage tenant portal access jika bukan scope.

### TENANT
- Melihat data miliknya sendiri.
- Booking kamar.
- Melihat booking, invoice, stay, ticket, announcement occupied, notification.
- Submit payment proof sesuai booking sendiri.
- Tidak input ID teknis manual.
- Tidak melihat tenant lain.
