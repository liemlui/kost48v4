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
| Approve payment submission (vNext) | PaymentSubmission + InvoicePayment + invoice status sync |
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

### 7.2 Phase E — Payment Submission + Approval Queue

Target endpoints:
- `POST /payment-submissions` — tenant submit bukti bayar
- `GET /payment-submissions/my` — tenant lihat submission sendiri
- `GET /payment-submissions/review-queue` — admin lihat queue pending review
- `POST /payment-submissions/:id/approve` — admin approve → create InvoicePayment final
- `POST /payment-submissions/:id/reject` — admin reject → tenant lihat status reject

Constraints vNext:
- Overpay final tetap dilarang
- Approval harus idempotent / race-safe
- Attachment/proof metadata harus aman

### 7.3 Phase F — Owner Reports

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

**Catatan kontrak Fase 4.0:**
- Booking mandiri memakai `RoomStatus.RESERVED` dan `Stay.expiresAt`
- Flow ini tetap tenant-first, tetapi approval akhir admin belum dibuka pada fase ini
- Surface backoffice untuk booking reserved pada fase ini bersifat read-only

#### Sudah tersedia / dipatch pada Fase 4.1A backend-only
- `PATCH /admin/bookings/:stayId/approve` — admin approval booking reserved + pelengkapan data inti + 2 baseline meter + invoice awal `DRAFT`

**Catatan kontrak Fase 4.1A:**
- Approval hanya untuk `OWNER` / `ADMIN`
- Actor diambil dari JWT auth context
- Booking harus valid sebagai booking reserved tenant-first
- `Room.status` tetap `RESERVED` sampai pembayaran diverifikasi pada fase berikutnya
- Batch ini tidak membuka payment submission atau auto activation pembayaran

#### Target berikutnya (belum live)
- `POST /payment-submissions` — upload bukti bayar
- `POST /auth/forgot-password`, `POST /auth/reset-password` — self-service reset password
- `POST /tenant/stays/renew` — pengajuan perpanjangan oleh tenant
- Notifikasi WhatsApp (cron job internal, bukan endpoint publik)
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
