# KOST48 V3/V4 — Contracts & API
**Versi:** 2026-05-11 business lifecycle blueprint  
**Fungsi:** Kontrak bisnis/API aktif. Untuk status fase lihat `00_GROUND_STATE.md`; untuk rencana eksekusi lihat `02_PLAN.md`.

---

## 0A. Latest Contract Override — 2026-05-11 Business Lifecycle

Bagian ini mengalahkan wording lama jika ada konflik.

### 0A.1 Manual Check-in Business Automation — Target Batch B1

**Current behavior sebelum B1:**

- `POST /stays` direct/manual check-in membuat `Stay ACTIVE` dan `Room OCCUPIED`.
- Meter awal langsung dibuat sebagai `MeterReading`.
- Invoice awal dibuat sebagai `DRAFT` + line `RENT`.
- Portal user tenant tidak auto-created.
- Admin harus manual issue invoice dan manual create portal access.

**Target behavior setelah B1:**

- `POST /stays` manual check-in tetap membuat `Stay ACTIVE` dan `Room OCCUPIED`.
- Meter awal tetap langsung dibuat sebagai 2 `MeterReading`.
- Invoice awal manual check-in harus langsung `ISSUED` saat check-in selesai.
- Jika tenant punya email, sistem mencoba auto-create portal user.
- Jika portal user baru dibuat, response boleh mengembalikan temporary password sekali.
- Jika tenant tidak punya email, check-in tetap sukses tetapi portal status harus `MISSING_EMAIL` / `PORTAL_UNAVAILABLE`.
- Jika portal user sudah ada untuk tenant yang sama, check-in tetap sukses dengan status `ALREADY_ACTIVE`.
- Jika email dipakai user/tenant lain, check-in harus gagal dengan conflict sebelum side effect room/stay final.

### 0A.2 Portal Auto-create Idempotency Contract

Saat manual check-in, portal auto-create harus mengikuti 4 kondisi:

| Kondisi | Target behavior |
|---|---|
| Tenant email kosong | Jangan create portal user. Return portal status `MISSING_EMAIL`. Check-in tetap sukses. |
| Tenant email ada dan belum ada User | Create portal user role TENANT. Return status `CREATED`, `portalEmail`, dan `temporaryPassword` sekali. |
| User sudah ada untuk tenant yang sama | Jangan error. Return status `ALREADY_ACTIVE`. Tidak membuat duplicate User. |
| Email dipakai user/tenant lain | Block dengan conflict. Pesan operasional: `Email sudah digunakan oleh user/tenant lain`. |

### 0A.3 Temporary Password Contract

- Temporary password hanya boleh dikembalikan sekali saat portal user baru dibuat.
- Plaintext temporary password tidak boleh disimpan di database.
- Password yang disimpan di DB harus hashed.
- Frontend harus menampilkan temporary password dalam modal hasil check-in dengan tombol Salin Password dan warning jelas.
- Jika admin lupa copy, solusi adalah reset password manual dari Tenant Detail.

### 0A.4 Tenant Identity Required Contract

Untuk tenant baru:

- `identityNumber` / No KTP wajib.
- No KTP wajib 16 digit angka.
- Backend mencegah duplicate:
  - `identityNumber`,
  - `phone`,
  - tenant `email`,
  - konflik dengan `User.email`.
- Update tenant tidak boleh mengubah No KTP/No HP/email menjadi data yang sudah dipakai tenant lain.
- DB unique constraint belum ditambahkan sampai data existing diaudit/cleanup.

### 0A.5 Invoice Semantics Contract

| Status | Makna bisnis |
|---|---|
| `DRAFT` | Belum resmi, internal, belum tenant-facing. |
| `ISSUED` | Resmi, tenant-facing, bisa dibayar. |
| `PARTIAL` | Sebagian dibayar. |
| `PAID` | Lunas. |
| `CANCELLED` | Dibatalkan. |

Business invariant:

```text
Jika tenant sudah OCCUPIED, invoice utama yang menjadi tagihan tenant tidak boleh diam-diam tertinggal sebagai DRAFT tanpa warning/automation.
```

Target B1:

```text
Manual check-in selesai → invoice awal langsung ISSUED.
```

### 0A.6 Deposit / Damage / Inventory Contract — Future Batches

Deposit adalah liability, bukan sekadar angka.

Future Batch B4 harus mendesain audit trail deposit:

- `COLLECTED`,
- `DEDUCTED`,
- `REFUNDED`,
- `FORFEITED`,
- `PENDING_TRANSFER` bila dipakai.

Damage dan inventory movement tidak sama:

- Kerusakan barang kamar mengubah `RoomFacility.condition`.
- `InventoryMovement` hanya terjadi bila stok fisik berubah.
- Penalty/damage charge dan deposit deduction adalah batch future, bukan B1.

### 0A.7 Final Meter Utility Contract — Pending Audit

Belum boleh diasumsikan bahwa checkout final membuat final utility charge.

Sebelum Batch B2 ACT, wajib audit:

```text
Apakah StaysService.complete() hanya mencatat meter akhir,
atau juga membuat InvoiceLine final dari delta meter akhir?
```

Jika hanya mencatat meter akhir tanpa charge, ini menjadi gap finance P0/P1 untuk Batch B2.

---

## 0B. Latest Contract Override — 2026-05-09

### Rencana Keluar / Checkout Final Contract

1. Tenant-facing fitur disebut **Pengajuan Keluar Kamar**.
2. Admin/internal boleh memakai label pendek **Rencana Keluar**.
3. Status tampilan:
   - `PENDING` → **Menunggu Review**
   - `APPROVED` → **Rencana Disetujui / Siap Checkout Final**
   - `REJECTED` → **Ditolak**
4. Tombol admin:
   - Approve → **Setujui Rencana**
   - Reject → **Tolak**
   - Final completion → **Checkout Final**
5. `APPROVED` **tidak** mengakhiri stay.
6. Tenant tetap `ACTIVE/OCCUPIED` sampai admin menjalankan **Checkout Final** via flow complete stay existing.
7. Checkout Final adalah aksi yang menandai tenant benar-benar keluar kamar.
8. Open invoice `ISSUED/PARTIAL` tetap memblokir Checkout Final sesuai logic existing.
9. Deposit tetap diproses terpisah/manual setelah checkout.
10. Backend lifecycle tidak boleh diubah untuk auto-checkout saat approve request.

### Checkout vs Renew Conflict Contract

- Jika ada rencana keluar/checkout request `PENDING`, tenant tidak boleh mengajukan renew/perpanjangan untuk stay yang sama.
- Jika ada renew request `PENDING`, tenant tidak boleh mengajukan rencana keluar untuk stay yang sama.
- Pesan harus Bahasa Indonesia dan operasional-friendly.

### Staff Inventory Read-only Contract

- STAFF boleh melihat inventory items.
- STAFF tidak boleh create, edit, delete, import, atau adjust stok.
- OWNER dan ADMIN boleh mutasi inventory sesuai guard.
- Rule ini harus ditegakkan di **frontend dan backend**, bukan hanya hide button.

### Dev/UAT Seed Contract Baru

Seed dev/UAT terbaru harus menghasilkan:

| Role | Email | Password |
|---|---|---|
| OWNER | `liem.lui@gmail.com` | `admin123` |
| ADMIN | `admin@kost48.com` | `admin123` |
| STAFF | `staff@kost48.com` | `staff123` |
| TENANT | `tenant.g2@kost48.com` | `tenant123` |

Rooms fresh UAT yang umum dipakai:

- G2-001 sampai G2-005,
- G3-001 sampai G3-003.

Semua room seed harus `AVAILABLE` dan `isActive=true`.

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

Endpoint existing: `POST /stays`.

**Current pre-B1 behavior:**

- Room langsung `OCCUPIED`.
- Stay langsung `ACTIVE` operasional.
- Meter awal listrik dan air wajib.
- Meter awal langsung dibuat sebagai 2 `MeterReading` dalam transaction yang sama.
- Invoice awal `DRAFT` + line `RENT` dibuat otomatis.
- Portal user tidak otomatis dibuat.

**Target Batch B1 behavior:**

- Room tetap langsung `OCCUPIED`.
- Stay tetap langsung `ACTIVE`.
- Meter awal tetap langsung dibuat.
- Invoice awal langsung `ISSUED`.
- Portal user auto-created jika tenant punya email.
- Response check-in mengembalikan portal result.

### 2.2 Checkout

- Endpoint existing: `POST /stays/:id/complete`.
- `checkoutReason` wajib.
- Room kembali `AVAILABLE` jika tidak ada stay aktif lain.
- Deposit belum diproses otomatis.
- Meter/payment/invoice/deposit history tidak boleh dihapus.
- Saat ini open invoice `ISSUED/PARTIAL` memblokir checkout.
- Future Batch B2 wajib audit behavior untuk invoice `DRAFT` dan final meter utility charge.

### 2.3 Cancel operational stay

- Endpoint existing: `POST /stays/:id/cancel`.
- `cancelReason` wajib/tersimpan eksplisit.
- Tidak boleh menghapus histori operasional.

### 2.4 Renew

- Endpoint existing: `POST /stays/:id/renew`.
- Renewal = extend existing active stay, bukan create parallel stay baru.
- Invoice renewal saat ini `DRAFT` dibuat otomatis.
- Future Batch B2 wajib audit apakah renewal approval harus auto-ISSUED dan apakah approval form sudah punya nominal confirmation.
- Renewal tenant self-service harus berupa request + admin approval, bukan auto-renew.

---

## 3. Tenant Booking Contract

### 3.1 Public room catalog

- `GET /public/rooms`
- Public/guest/tenant melihat room aktif yang masih `AVAILABLE`.
- Mendukung search, floor, pricingTerm bila tersedia.
- Baseline public booking sudah pernah UAT PASS; marketing polish tetap Phase 4.4.

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
- Status 4.3-D perlu browser UAT sebelum klaim PASS.

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
- STAFF inventory read-only: boleh lihat, tidak boleh mutate.
- Tidak boleh approve payment atau manage tenant portal access jika bukan scope.

### TENANT

- Melihat data miliknya sendiri.
- Booking kamar.
- Melihat booking, invoice, stay, ticket, announcement occupied, notification.
- Submit payment proof sesuai booking sendiri.
- Tidak input ID teknis manual.
- Tidak melihat tenant lain.

---

## 9. Production Deployment Contract

### 9.1 Production endpoints

- Frontend production: `https://app.kost48surabaya.com`.
- Backend API base: `https://api.kost48surabaya.com/api`.
- Public rooms health check: `GET /api/public/rooms`.
- Protected notification check: `GET /api/me/notifications`.
- Reminder preview all: `GET /api/admin/reminders/preview/all`.

### 9.2 Deployment rules

- Normal patch flow: source lokal → build → commit → push → pull/deploy on cPanel.
- Jangan edit `dist` production kecuali emergency hotfix.
- Jangan reset DB production.
- Schema/DB changes require backup and separate plan.
- `.htaccess`/Apache proxy config adalah deployment config; jangan commit kecuali sudah diputuskan.

### 9.3 Production UAT minimum after deploy

- `GET /api/public/rooms` returns API envelope.
- `POST /api/auth/login` works for owner admin.
- `GET /api/me/notifications` works with Bearer token.
- If reminder code touched, `GET /api/admin/reminders/preview/all` works with Bearer token.
