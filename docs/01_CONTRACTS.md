# KOST48 V3 — Contracts & API
**Menggabungkan:** backend-implementation-contract + API gap matrix

---

## 1. Prinsip Kontrak

1. `schema.prisma` = bentuk data
2. `bootstrap.sql` = pagar integritas
3. Service = alur bisnis, validasi, kalkulasi
4. Controller tipis — hanya routing dan auth guard
5. Actor selalu diambil dari JWT auth context (`req.user.id`)
6. Semua transaksi penting multi-entity wajib `prisma.$transaction()`

---

## 2. Baseline Contract — Existing

### 2.1 Stay

**Guard aktif:**
- 1 tenant hanya boleh 1 stay `ACTIVE`
- 1 room hanya boleh 1 stay `ACTIVE`

**Create stay (atomik):**
- `pricingTerm` wajib
- Rent/deposit/tariff boleh default dari room
- Meter awal listrik dan air wajib — disimpan sebagai 2 `MeterReading`
- Room di-sync ke `OCCUPIED`
- Invoice awal `DRAFT` dibuat otomatis
  - line `RENT` dibuat otomatis
  - `periodEnd` = kalkulasi dari `pricingTerm` atau override `plannedCheckOutDate`
  - `dueDate = periodEnd + 3 hari`

**Checkout (ACTIVE → COMPLETED):**
- `checkoutReason` wajib
- Room kembali `AVAILABLE`
- Deposit tidak diproses otomatis

**Cancel (ACTIVE → CANCELLED):**
- `cancelReason` disimpan eksplisit
- Tidak boleh mematahkan guard lain

**Renew:**
- Extend existing active stay — bukan create stay baru
- Invoice renewal `DRAFT` dibuat otomatis
- Validasi overlap renewal belum kaya

### 2.2 Deposit

- Lifecycle tetap di `Stay`
- Process deposit hanya boleh jika stay `COMPLETED` atau `CANCELLED`
- Process deposit diblok jika masih ada invoice `ISSUED` atau `PARTIAL`
- `action` enum: `FULL_REFUND | PARTIAL_REFUND | FORFEIT`

### 2.3 Meter Reading

- Dipakai untuk listrik (`ELECTRICITY`) dan air (`WATER`)
- Unique constraint: `[roomId, utilityType, readingAt]`
- Nilai tidak boleh turun (monotonic — dijaga trigger/service)
- Meter awal create stay adalah baseline pertama

### 2.4 Invoice

- Total invoice dikelola otomatis dari `InvoiceLine` — trigger atau recalc di service
- Service tidak boleh set `totalAmountRupiah` manual
- Invoice line hanya boleh berubah saat status `DRAFT`
- Sequence status: `DRAFT → ISSUED → PARTIAL | PAID | CANCELLED`

### 2.5 Invoice Payment (Existing Flow)

- Admin dapat input `InvoicePayment` langsung
- Overpay tidak boleh
- Update status invoice otomatis:
  - 0 paid → `ISSUED`
  - partial → `PARTIAL`
  - full → `PAID`

### 2.6 Announcement

- Field: `title`, `content`, `audience`, `isPublished`, `isPinned`, `publishedAt`, `startsAt`, `expiresAt`
- Audience existing: `TENANT | STAFF | ADMIN | STAFF_ADMIN | ALL`

### 2.7 Ticket (Existing — Pre Phase C)

- Ticket dasar sudah ada
- Tenant bisa lihat progress
- Backoffice bisa update status
- Belum tenant-first sepenuhnya — ini yang Phase C selesaikan

### 2.8 Inventory

- Stock global di `InventoryItem.qtyOnHand`
- Movement sync stok
- Room item masih entity penting tapi surface frontend belum di-embed (Phase D)

### 2.9 Tenant Portal Access (Baseline — Phase B Done)

Endpoint yang sudah ada:
- `POST /tenants/:id/portal-access` — create portal user
- `PATCH /tenants/:id/portal-access/status` — toggle aktif/nonaktif
- `POST /tenants/:id/portal-access/reset-password` — reset password operator-initiated

Rules:
- Relasi `Tenant ↔ User TENANT` one-to-one optional
- Create/toggle/reset hanya untuk `OWNER` atau `ADMIN`
- Reset password bersifat operator-initiated, bukan forgot-password global
- Error message Bahasa Indonesia dan operasional-friendly

---

## 3. Transaction Boundaries

Wajib gunakan `prisma.$transaction()` untuk:

| Operasi | Entitas dalam transaksi |
|---------|------------------------|
| Create stay | Stay + Room (status sync) + 2 MeterReading + Invoice draft + InvoiceLine |
| Complete stay | Stay + Room (release) + guard deposit |
| Cancel stay | Stay + Room (release) |
| Process deposit | Stay (deposit fields) |
| Create/update/delete invoice line | InvoiceLine + recalc total invoice |
| Create payment | InvoicePayment + invoice status sync |
| Approve payment submission (vNext) | PaymentSubmission + proof metadata finalization + InvoicePayment + invoice status sync + stay/room activation sync + audit log |
| Inventory movement | InventoryMovement + qtyOnHand sync + RoomItem sync |
| Create portal account | User (TENANT role) + Tenant link (bila perlu atomicity) |

---

## 4. DTO Validation Policy

| Tipe data | Validator |
|-----------|-----------|
| Angka Rupiah | `@IsInt()` + `@Min(0)` (atau `@Min(1)` sesuai konteks) |
| Decimal input (meter, tariff) | `@IsNumberString()` bila dikirim string |
| Enum | `@IsEnum(EnumName)` — **tidak boleh hanya `@IsString()`** |
| Field opsional | `@IsOptional()` |
| Password operator | Validasi eksplisit `minLength` sesuai scope endpoint |

---

## 5. Error Message Policy

Gunakan Bahasa Indonesia yang konsisten dan operasional-friendly.

| Situasi | Contoh pesan |
|---------|--------------|
| Room sudah ditempati | `Kamar sudah ditempati stay aktif lain` |
| Tenant masih aktif | `Tenant masih memiliki stay aktif` |
| Overpay | `Pembayaran melebihi total invoice` |
| Stay tidak ditemukan | `Stay tidak ditemukan` |
| Stay tidak aktif | `Stay tidak aktif, tidak dapat diperpanjang` |
| Deposit ada invoice terbuka | `Deposit tidak dapat diproses karena masih ada tagihan terbuka` |
| Tenant belum punya portal | `Tenant ini belum memiliki akun portal` |
| Reset password sukses | `Password portal tenant berhasil diperbarui` |

---

## 6. API Existing — Fondasi

### Auth
- `POST /auth/login`
- `GET /auth/me`
### Tickets (Pasca Phase C)
- `POST /tickets/portal` — create ticket tenant-first (auto-fill context dari JWT)

### Auth (Pasca Fase 3.5)
- `POST /auth/change-password` — ganti password user terautentikasi

### Stays (Pasca Fase 3.5)
- `GET /stays/:id/invoice-suggestion` — saran item invoice untuk pembuatan invoice
### Stays
- `GET /stays` (filter: `status`, `depositStatus`, `limit`) — includes `openInvoiceCount`
- `GET /stays/:id` (includes `openInvoiceCount`, relasi tenant, room, invoices)
- `POST /stays` (create + meter awal + invoice draft atomik)
- `PATCH /stays/:id` (update fields termasuk notes)
- `POST /stays/:id/complete`
- `POST /stays/:id/cancel`
- `POST /stays/:id/renew`
- `POST /stays/:id/deposit/process`
- `GET /stays/me/current` (untuk tenant portal — current active stay)

### Rooms
- CRUD dasar `/rooms`

### Tenants
- CRUD dasar `/tenants`
- `POST /tenants/:id/portal-access`
- `PATCH /tenants/:id/portal-access/status`
- `POST /tenants/:id/portal-access/reset-password`

### Invoices
- `GET /invoices`, `GET /invoices/:id`
- `POST /invoices`, `PATCH /invoices/:id`
- `POST /invoices/:id/issue`, `POST /invoices/:id/cancel`
- Invoice lines: create/update/delete (hanya saat `DRAFT`)
- Invoice awal booking approval admin dibuat otomatis sebagai `DRAFT` dan total tetap dikelola dari `InvoiceLine`

### Invoice Payments
- `POST /invoice-payments`, `PATCH /invoice-payments/:id`, `DELETE /invoice-payments/:id`

### Tickets
- `GET /tickets`, `GET /tickets/:id`
- `POST /tickets` (backoffice existing — target Phase C: dipersempit)
- `GET /tickets/my` (tenant portal — perlu verifikasi endpoint ini ada)
- Assign/progress basics

### Meter Readings
- `GET /meter-readings`, `POST /meter-readings`

### Inventory
- `GET /inventory-items`, CRUD
- `GET /inventory-movements`, CRUD
- `GET /room-items`, CRUD

### Announcements
- CRUD dasar `/announcements`

### Expenses, WiFi Sales
- CRUD dasar

---

## 7. API vNext — Gap yang Perlu Dibuat

### 7.1 Phase C — Ticket Tenant-First (✅ SELESAI)
- `POST /tickets/portal` — **Sudah tersedia.**

### 7.2 Phase E / Fase 4.2 — Payment Submission + Approval Queue (COMBINED BOOKING PAYMENT / TANPA PARSIAL)

#### Tujuan kontrak
Tenant **tidak** menulis langsung ke `InvoicePayment`. Tenant hanya membuat `PaymentSubmission`. `InvoicePayment` final tetap dibuat oleh sistem **setelah admin approve**. **Pembayaran parsial tidak diizinkan.**

Pembayaran booking awal dibaca sebagai satu journey **Pembayaran Awal** dan satu submission gabungan:

> **Total Pembayaran Awal = sisa sewa invoice booking awal + sisa deposit booking awal**

Tenant tidak memilih target `INVOICE` atau `DEPOSIT` di UI. Backend yang membagi efek pembayaran secara internal:
- bagian sewa → `InvoicePayment` + invoice booking awal menjadi `PAID`
- bagian deposit → tracking deposit awal pada `Stay` menjadi `PAID`

Catatan kompatibilitas: bila model `PaymentSubmission` masih memiliki `targetType` / `targetId`, field tersebut diperlakukan sebagai metadata internal/compatibility anchor, bukan pilihan tenant. Untuk flow booking awal, source of truth nominal tetap `stay + invoice awal + deposit tracking`.

#### Endpoint target
- `POST /payment-submissions`
- `GET /payment-submissions/my`
- `GET /payment-submissions/review-queue`
- `GET /payment-submissions/:id`
- `POST /payment-submissions/:id/approve`
- `POST /payment-submissions/:id/reject`

#### Payload minimal `POST /payment-submissions`
- `stayId`
- `invoiceId` untuk invoice booking awal
- `amountRupiah` — wajib sama dengan total sisa sewa + sisa deposit
- `paidAt`
- `paymentMethod`
- `senderName?`
- `senderBankName?`
- `referenceNumber?`
- `notes?`
- attachment / proof metadata (`fileKey`, `fileUrl`, `originalFilename`, `mimeType`, `fileSizeBytes`) lewat storage adapter yang dipakai proyek

Field internal/legacy yang boleh tetap ada bila schema sudah memakai:
- `targetType?`
- `targetId?`

Namun untuk tenant booking payment, UI tidak boleh mengekspos target terpisah kepada tenant.

#### Response shape minimal
- `id`
- `status` (`PENDING_REVIEW | APPROVED | REJECTED | EXPIRED`)
- `amountRupiah`
- `expectedAmountRupiah` / `combinedRemainingAmountRupiah` bila tersedia
- `rentRemainingAmountRupiah` bila tersedia
- `depositRemainingAmountRupiah` bila tersedia
- `paidAt`
- `paymentMethod`
- proof metadata aman untuk frontend
- ringkasan stay / room / invoice / deposit
- `reviewedById?`
- `reviewedAt?`
- `reviewNotes?`

#### Aturan bisnis wajib
- Tenant hanya dapat submit untuk booking miliknya sendiri.
- Submission hanya boleh untuk booking/stay dengan room `RESERVED`.
- Invoice booking awal harus milik stay yang sama.
- **Nominal submission wajib sama persis dengan total sisa pembayaran awal:**
  - `amountRupiah == (invoiceTotalAmountRupiah - invoicePaidAmountRupiah) + (depositAmountRupiah - depositPaidAmountRupiah)`
- Jika nominal kurang atau lebih, request ditolak; tidak ada partial payment.
- Jika sudah ada submission `PENDING_REVIEW` untuk booking yang sama, tenant tidak boleh membuat submission baru sampai admin approve/reject.
- Approval final tetap **overpay-safe** dan menghitung ulang sisa sewa + deposit di dalam transaksi.
- Approval harus **idempotent / race-safe**.
- Satu submission yang sudah `APPROVED`, `REJECTED`, atau `EXPIRED` tidak boleh diproses ulang secara liar.
- Sistem tidak boleh membuat dua `InvoicePayment` final dari satu submission yang sama.
- Deposit tidak boleh dicatat sebagai pembayaran sewa; deposit portion harus masuk ke tracking deposit awal pada `Stay`.
- Jika `expiresAt` booking terlewati sebelum approval final, submission baru harus ditolak atau booking harus di-expire sesuai rule fase 4.2.

#### Dampak approve
Saat `POST /payment-submissions/:id/approve` berhasil:
1. `PaymentSubmission.status = APPROVED`.
2. Backend menghitung ulang dalam transaksi:
   - `rentRemaining = invoiceTotal - freshPaidAmount`
   - `depositRemaining = depositAmount - depositPaidAmount`
   - `combinedRemaining = rentRemaining + depositRemaining`
3. `submission.amountRupiah` harus sama dengan `combinedRemaining`. Jika tidak sama, approval ditolak.
4. Untuk rent portion:
   - `InvoicePayment` final dibuat hanya untuk `rentRemaining` jika nilainya > 0.
   - Invoice booking awal langsung menjadi `PAID`.
   - `paidAt` di-set sesuai kontrak invoice.
5. Untuk deposit portion:
   - `Stay.depositPaidAmountRupiah` di-update menjadi `depositAmountRupiah`.
   - `Stay.depositPaymentStatus` menjadi `PAID`.
   - Tidak membuat `InvoicePayment` untuk deposit kecuali schema/source memang memodelkan deposit sebagai invoice.
6. Karena submission gabungan melunasi sewa dan deposit sekaligus, room dapat berubah `RESERVED -> OCCUPIED` setelah kedua kewajiban terbukti `PAID`.
7. Audit log approval dibuat, termasuk ringkasan rent portion dan deposit portion.

#### Dampak reject
Saat `POST /payment-submissions/:id/reject` berhasil:
- `PaymentSubmission.status = REJECTED`
- `reviewNotes` wajib disimpan
- Tenant melihat alasan penolakan di portal
- Tidak ada `InvoicePayment` dibuat
- Tidak ada perubahan deposit status
- Booking tetap `RESERVED` selama belum expired dan admin belum membatalkan
- Tenant dapat submit ulang satu bukti gabungan dengan nominal yang benar

#### Query admin review queue
`GET /payment-submissions/review-queue` minimal mendukung:
- `status`
- `search`
- `page`
- `limit`
- `paymentMethod?`
- `roomId?`
- `tenantId?`
- sort default: pending paling lama lebih dulu
- tampilan nominal: total gabungan, rent portion, deposit portion bila tersedia

#### Query tenant list
`GET /payment-submissions/my` minimal mendukung:
- `page`
- `limit`
- `status?`
- `search?`

#### Constraints vNext
- proof metadata harus aman
- file type dibatasi
- approval final tetap dilarang overpay
- transaksi approval memakai `prisma.$transaction()`
- attachment/proof tidak boleh menjadi jalur eskalasi akses file lintas tenant
- workflow booking payment tidak memiliki jalur `PARTIAL`
- tenant tidak melihat split target teknis; tenant hanya melihat satu CTA **Bayar Sewa & Deposit**

### 7.3 Phase G### 7.3 Phase G / Fase 4.3 — Notification & Reminder (WhatsApp)

#### Tujuan kontrak
Reminder operasional tidak lagi hanya badge frontend. Pada fase ini sistem boleh mengirim notifikasi keluar, **tetapi tetap fokus dan terukur**, bukan automation engine liar.

#### Endpoint / surface internal yang direkomendasikan
- `POST /internal/reminders/run-booking-expiry-check`
- `POST /internal/reminders/run-invoice-due-check`
- `POST /internal/reminders/run-checkout-check`
- `GET /notifications/logs?type=...` (opsional backoffice read-only, bukan wajib di batch pertama)

> Endpoint internal boleh diganti scheduler langsung, tetapi kontrak pengiriman dan idempotensi tetap harus jelas.

#### Event reminder yang wajib ditutup
- booking hampir kadaluarsa (`expiresAt - 1 hari`, dan/atau H-0 jika masih relevan)
- invoice due H-3 dan H-1
- checkout H-10 / H-7 / H-3

#### Aturan bisnis
- channel prioritas: WhatsApp
- email bersifat sekunder / fallback
- reminder tidak boleh spam; event yang sama harus punya guard idempotensi
- reminder hanya dikirim untuk entitas yang masih aktif / relevan
- isi pesan harus bahasa Indonesia operasional-friendly
- kegagalan gateway tidak boleh menjatuhkan transaksi bisnis utama

### 7.4 Phase H / Fase 4.4 — Marketing Display & Registrasi Fleksibel

#### Tujuan kontrak
Public surface tidak lagi hanya katalog list. Sistem mulai mendukung room detail marketing, registrasi fleksibel, dan soft delete akun tenant.

#### Public room detail
Target endpoint:
- `GET /public/rooms/:id`

Response minimal:
- identitas kamar
- deskripsi singkat
- lantai
- tarif utama
- term tersedia
- `images`
- fasilitas / highlight yang aman dipublikasikan
- status publik apakah masih bisa dibooking

#### Registrasi fleksibel
Target endpoint:
- `POST /auth/register-flex`
- atau perluasan aman pada `POST /auth/register` jika tidak mematahkan kontrak existing

Rule minimal:
- user dapat mendaftar dengan **email** atau **nomor HP**
- minimal salah satu wajib ada
- jika HP dipakai, format harus dinormalisasi
- uniqueness email dan HP harus jelas
- role public signup tetap dibatasi aman (TENANT / calon tenant)
- tidak boleh mematahkan guard tenant portal access existing

#### Soft delete akun tenant
Target endpoint:
- `POST /portal/profile/deactivate`
- atau `DELETE /portal/profile` yang secara implementasi melakukan soft delete

Rule minimal:
- `isActive = false`
- histori stay / invoice / ticket tetap utuh
- login berikutnya diblok dengan pesan operasional-friendly
- aksi harus tercatat di audit log

### 7.5 Phase I / Fase 4.5 — Tenant Self-Service Lanjutan

#### Tujuan kontrak
Tenant dapat mengajukan perpanjangan stay dan dapat mereset password sendiri tanpa campur tangan operator pada happy path.

#### Renewal request tenant
Target endpoint:
- `POST /tenant/stays/renew`
- `GET /tenant/stays/renew/my-requests` (direkomendasikan)
- `POST /admin/stay-renew-requests/:id/approve` (direkomendasikan)
- `POST /admin/stay-renew-requests/:id/reject` (direkomendasikan)

Payload minimal:
- `stayId`
- `requestedPricingTerm`
- `requestedNewEndDate?`
- `notes?`

Rule minimal:
- tenant hanya bisa mengajukan untuk stay miliknya yang masih aktif
- approval admin tetap diperlukan
- request tidak boleh membuat paralel stay baru
- jika disetujui, tetap mengikuti fondasi renewal existing: extend stay aktif + buat invoice renewal `DRAFT`

#### Forgot / reset password self-service
Target endpoint:
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Rule minimal:
- token / OTP dikirim via WhatsApp atau email sesuai kanal akun
- token ada masa berlaku
- token sekali pakai
- response lupa password harus generik agar tidak membocorkan apakah akun ada
- reset sukses harus memperbarui `passwordChangedAt`

### 7.6 Phase F — Owner Reports

Target endpoints:
- `GET /finance-reports/summary` — aggregate billed/collected/overdue
- `GET /finance-reports/collections` — breakdown koleksi
- `GET /finance-reports/occupancy` — occupancy summary
- `GET /analytics-strategy/owner-dashboard` — KPI strategis

Catatan: label sebagai "management report", bukan laporan akuntansi final.

### 7.4 Phase D — Module Enrichment (No New Endpoints, Enrich Existing)

- `GET /rooms/:id` diperkaya: active stay summary, room items embedded, meter summary
- `GET /inventory-items/:id` diperkaya: low stock flag, movement history, room usage

### 7.5 V4 — Tenant-First Platform

#### Sudah tersedia / dipatch pada Fase 4.0
- `GET /public/rooms` — katalog publik kamar
- `POST /tenant/bookings` — booking mandiri tenant
- `GET /tenant/bookings/my` — daftar booking milik tenant

#### Sudah tersedia / dipatch pada Fase 4.1
- `PATCH /admin/bookings/:stayId/approve` — approval booking + pelengkapan data awal
- invoice booking awal `DRAFT` saat approval
- tenant portal membaca status konservatif `Menunggu Approval` / `Menunggu Pembayaran`

**Catatan kontrak resmi sampai 4.1:**
- Booking mandiri memakai `RoomStatus.RESERVED` dan `Stay.expiresAt`
- Flow tetap tenant-first, tetapi kendali akhir approval tetap di admin
- Surface backoffice booking reserved dan approval queue sudah ada, tetapi payment submission **belum live**

#### Target berikutnya (belum live)
- Fase 4.2: payment submission + approval queue + activation sync
- Fase 4.3: WhatsApp reminder
- Fase 4.4: room detail public + registrasi fleksibel + soft delete akun
- Fase 4.5: renewal request tenant + forgot/reset password self-service
---

## 8. Hal yang Tidak Boleh Diasumsikan Sudah Ada

1. Payment submission upload flow
2. Approval queue admin yang final
4. Owner analytics matang (Phase F)
5. Embedded room/item/movement surface final (Phase D)
6. Self-service forgot-password tenant (bukan scope sekarang)

---

## 9. Aturan Penutup

Jika ada rule baru, tanyakan:
1. Apakah ini bentuk data? → `schema.prisma`
2. Apakah ini harus aman walau backend bug? → `bootstrap.sql`
3. Apakah ini alur bisnis / validasi / kalkulasi? → service contract (dokumen ini)
4. Apakah ini target vNext? → tandai eksplisit sebagai **target**, jangan dianggap live


---

## 2026-04-23 — Catatan Sinkronisasi Kontrak Pasca UAT Parsial & Prototype 4.2

### A. Status kontrak aktif yang tetap berlaku
- Kontrak resmi yang boleh dianggap **live baseline** tetap:
  - Booking mandiri V4 Fase 4.0
  - Approval booking admin V4 Fase 4.1
- Kontrak payment submission V4 Fase 4.2 tetap diperlakukan sebagai:
  - **target vNext yang sudah mulai diprototipekan pada source tertentu**
  - **belum baseline resmi**
  - **belum boleh dijadikan asumsi live penuh** sebelum gate UAT 4.0 dan 4.1 selesai

### B. Temuan UAT yang memperkuat kontrak
- `expiresAt` adalah field sensitif operasional dan harus:
  - terisi konsisten
  - terserialisasi benar ke frontend
  - tidak jatuh ke awal hari bila rule bisnis menuntut masa berlaku sampai akhir hari
- Surface frontend/backoffice tidak boleh menyamarkan tanggal booking menjadi `-` bila data sesungguhnya ada; response backend harus jujur terhadap field `Date`

### C. Tambahan pedoman implementasi service
- Prinsip service tetap:
  - controller tipis
  - service memegang validasi/alur bisnis
  - transaksi penting memakai `prisma.$transaction()`
- Raw SQL **bukan** default arsitektur.
  - Raw SQL hanya boleh dipakai bila benar-benar dibutuhkan untuk locking/compatibility/constraint yang sulit diekspresikan aman dengan Prisma
  - arah refactor terbaru adalah kembali ke **Prisma-first** sejauh memungkinkan

### D. Catatan approval payment / invoice consistency
- Pada flow approval payment submission, jika invoice bergerak dari `DRAFT` ke `ISSUED/PARTIAL/PAID`, maka field yang diwajibkan constraint DB harus ikut sinkron, khususnya `issuedAt`
- Service approval payment tidak boleh melanggar pagar integritas invoice yang dijaga oleh `bootstrap.sql`

---

## 2026-04-24 — Addendum Sinkronisasi Kontrak Pasca Combined Payment 4.2

### A. Payment submission booking menjadi combined payment
Kontrak payment submission terbaru untuk booking awal bergerak ke arah **combined booking payment**:

- tenant mengirim **satu bukti pembayaran awal**
- nominal dikunci ke total sisa sewa + sisa deposit
- tenant tidak memilih target pembayaran teknis
- backend membagi efek pembayaran secara internal ke rent portion dan deposit portion

Field tambahan yang tetap dapat dipertahankan sebagai compatibility/internal metadata bila sudah ada di schema:
- `targetType`
- `targetId`

Namun, untuk flow tenant booking, field tersebut tidak boleh menjadi pilihan UI yang membingungkan tenant.

### B. Tracking deposit payment pada booking/stay
Untuk booking yang sudah di-approve tetapi belum aktif operasional penuh, stay membutuhkan tracking deposit payment awal, minimal:
- `depositPaidAmountRupiah`
- `depositPaymentStatus` (`UNPAID | PAID`)

Catatan penting:
- ini **bukan** menggantikan lifecycle proses refund/forfeit deposit existing saat checkout
- ini hanya menambah tracking pembayaran deposit awal agar aktivasi `RESERVED -> OCCUPIED` bisa jujur

### C. Rule approval invoice pada booking
Karena constraint DB menolak perubahan detail invoice saat status bukan `DRAFT`, maka rule approval booking/approval payment yang benar adalah:
1. invoice awal booking dibuat / dipastikan dalam status `DRAFT`
2. `InvoiceLine` dibuat/diubah saat invoice masih `DRAFT`
3. setelah detail final aman, invoice booking payment bergerak langsung ke status operasional yang benar (`PAID`) saat combined payment disetujui

Implikasi:
- sistem **tidak boleh** langsung menulis detail invoice ke invoice berstatus `ISSUED`
- setiap patch approval booking/payments harus menghormati pagar integritas `bootstrap.sql`

### D. Activation sync resmi yang dituju
Arah kontrak terbaru untuk aktivasi booking:
- combined payment harus melunasi sewa booking awal dan deposit booking awal sekaligus
- rent portion sinkron ke invoice booking awal sampai `PAID`
- deposit portion sinkron ke tracking deposit sampai `PAID`
- kamar baru boleh `RESERVED -> OCCUPIED` hanya saat sewa dan deposit sama-sama `PAID`
- approval payment harus idempotent dan overpay-safe

### E. Expiry cleanup
Rule expiry booking yang lebih aman:
- booking expired harus me-release room
- `PaymentSubmission` pending yang relevan harus menjadi `EXPIRED`
- invoice awal booking yang belum final boleh/cocok dibatalkan agar tidak orphan
- meter baseline hasil approval booking yang hanya relevan untuk booking tersebut boleh dibersihkan bila aman secara bisnis

### F. Status kontrak
Addendum ini berarti:
- kontrak 4.2 **sudah didefinisikan tegas sebagai no-partial dan combined booking payment**
- target-aware split lama dibaca sebagai keputusan historis/prototype, bukan UX final tenant
- status tetap **belum authoritative/live penuh** sampai verifikasi lokal dan UAT selesai


---

## 2026-04-26 — Addendum Kontrak Tenant Portal Cache Isolation

### A. Prinsip keamanan portal tenant
Tenant portal tidak boleh menampilkan data dari tenant lain dalam kondisi apa pun, termasuk setelah logout/login cepat, reload parsial, error 404, atau stale query cache.

### B. Kontrak `/stays/me/current`
- `GET /stays/me/current` yang menghasilkan 404 untuk tenant tanpa stay aktif adalah **state valid**.
- Frontend harus membaca 404 ini sebagai **tidak ada hunian aktif**, bukan sebagai alasan untuk mempertahankan data tenant sebelumnya.
- UI wajib menampilkan empty state yang jujur.

### C. Kontrak frontend cache
- Saat logout, token dan seluruh cache query tenant-sensitive wajib dibersihkan.
- Saat login sebagai user baru, cache lama tidak boleh dirender sebelum user context baru siap.
- Query tenant portal wajib di-scope berdasarkan identitas user/tenant bila memungkinkan.
- Query tenant-sensitive mencakup minimal:
  - current stay,
  - tenant portal stage,
  - my bookings,
  - my invoices,
  - my tickets,
  - my payment submissions,
  - success/flash message portal yang tersimpan di `sessionStorage`.

### D. Defensive rendering
Jika response stay memiliki `tenantId` dan auth context juga memiliki `tenantId`, frontend wajib menolak render jika tidak cocok. Ketidakcocokan ini harus diperlakukan sebagai error keamanan/stale cache, bukan data normal.

### E. Implikasi UAT
Setelah patch cache isolation, retest cukup targeted:
1. login Tenant A yang memiliki stay aktif,
2. logout,
3. login Tenant B yang tidak memiliki stay aktif,
4. `/portal/stay` harus empty state,
5. `/portal/bookings` dan `/portal/invoices` tidak boleh membawa data Tenant A,
6. tidak ada request flood dari `/stays/me/current`.

---

## 2026-04-26 — Addendum Kontrak Pasca UAT 4.2 CORE PASS

### A. Status kontrak payment submission terbaru
Flow 4.2 sudah terbukti secara UAT core:
- happy path approved membuat `InvoicePayment`, invoice `PAID`, dan room `RESERVED -> OCCUPIED`,
- reject path tidak membuat payment final dan tenant dapat submit ulang,
- wrong amount ditolak; tidak ada partial payment,
- double approve ditolak; tidak ada `InvoicePayment` ganda,
- expiry core membatalkan stay dan me-release room.

Kontrak 4.2 sekarang dibaca sebagai **operationally accepted**, dengan P1 cleanup sebelum 4.3.

### B. Expiry invoice cleanup
Saat booking expired, service expiry harus membatalkan invoice awal booking yang masih `DRAFT` atau `ISSUED` dan belum `PAID`, agar tidak meninggalkan invoice orphan. Invoice `PAID` tidak boleh disentuh.

### C. UI label dan pricing honesty
- Room `RESERVED` harus ditampilkan sebagai `Pemesan` / `Booking oleh`, bukan `Penghuni`.
- Public room / booking form hanya boleh menampilkan pricing term yang memiliki rate nyata.
- `Semester` / `Tahunan` tidak boleh fallback ke monthly jika tidak ada field/rate nyata.

### D. Error response production
Global error response boleh memuat stack trace di development, tetapi production response hanya boleh memuat field aman seperti `success`, `statusCode`, `message`, `path`, `method`, `requestId`, dan `timestamp`.

### E. Phase 3A meter requirement
Backoffice create stay tetap wajib memvalidasi `initialElectricityKwh` dan `initialWaterM3`, menolak missing/invalid/negative values, dan membuat 2 baseline `MeterReading` dalam transaksi create stay.
