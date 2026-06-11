# KOST48 V5 — Ground State
**Versi:** 2026-06-02 V5.10.0 — Analytics Charts, Review Komplain, Tiket Pekerjaan, CSS Split
**Status:** Source of truth utama setelah V5.10.0. Commit `6479352` sudah pushed ke origin/main. TypeScript PASS, Vite build PASS. No schema change.

<!-- KOST48_DOCS_SYNC_20260602_V5100_CHARTS_REVIEW_TICKETS_CSS -->
## 0.0 Latest Current State — V5.10.0

```text
Latest pushed main baseline:
- 6479352 refactor: split styles.css (24K baris) menjadi 13 modul CSS + backend ticket categories
- 37fec46 feat: perkuat sistem review, komplain tenant→staff, dan tiket pekerjaan operasional
- 345c838 feat: tambah chart ketersediaan kamar dan fasilitas di halaman publik
- 358426b feat: tambah chart analytics di Tiket, Review Pembayaran, Perpanjangan, dan Portal Tenant
- 4df023c feat(frontend): improve owner workspace and recharts dashboards

Verification:
- Git push PASS ke origin/main.
- TypeScript check PASS (npx tsc --noEmit clean).
- Vite production build PASS (661 KB CSS, 1.9 MB JS).
- No schema change. No DB reset. No new npm dependency.
- CSS split: 13/13 file balanced.
```

### V5.10.0 active baseline — Fitur Baru

| Area | Status |
|---|---|
| Recharts chart library | ✅ Installed & digunakan di semua halaman utama |
| DonutGauge, HorizontalBarChart components | ✅ Di `src/components/charts/` |
| Charts: StaysPage, InvoicesPage, AdminStaffPerformancePage | ✅ 3 panel per halaman |
| Charts: TicketsPage, PaymentReviewPage, RenewRequestsAdminPage | ✅ 3 panel per halaman |
| Charts: MyInvoicesPage (tenant portal) | ✅ Gauge + bar |
| Charts: PublicGuestDashboardPage | ✅ Donut ketersediaan + bar fasilitas |
| Charts: OwnerDashboardPage (trend line/bar + best-fit) | ✅ Multi-mode chart |
| Review tenant → kategori komplain (≤2⭐) | ✅ Wajib pilih Kebersihan/Kualitas/dll |
| Review tenant → tag pujian (≥4⭐) | ✅ Opsional |
| Admin alert panel rating jelek | ✅ Badge ⚠️ + panel merah otomatis |
| Staff laporan: distribusi rating chart | ✅ Bar 1⭐–5⭐ + label kategori |
| Modal "Buat Tiket Pekerjaan" (admin/owner) | ✅ 6 kategori termasuk BARANG_PINDAH |
| Backend TicketCategory enum baru | ✅ BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN |
| CSS split: 13 modul di `src/styles/` | ✅ styles.css = 16 baris @import saja |

### Implementasi V5.9.8-A (carryover, masih aktif)

| Area | Result |
|---|---|
| Final checkout readiness gate | Final checkout sets the room to `MAINTENANCE` / `Perlu dicek`, not directly to `AVAILABLE`. |
| Staff inspection task | Backend creates a `CHECKOUT_INSPECTION` ticket for staff after checkout final. |
| Duplicate inspection prevention | Checkout inspection ticket creation checks existing stay/room/category ticket history before creating a new one. |
| Room ready transition | Closing a safe checkout-inspection ticket can move room from `MAINTENANCE` to `AVAILABLE`. |
| Safety blockers | Room is not marked available if there is another active stay, room is not in `MAINTENANCE`, or final condition is not safe. |
| Public visibility | Public room catalog can show `MAINTENANCE` as `Sedang dicek`, with `canBook=false`. |
| Public filter | `/rooms` includes a `Sedang Dicek` filter for rooms that are empty but still being prepared. |
| Staff UX | Staff dashboard/work queue was compacted, stabilized, and cleaned from developer/internal permission copy. |
| Pagination/list hygiene | Major list/table surfaces moved toward max 10 visible rows with pagination or compact preview behavior. |

### Added (V5.9.9)

| Area | Result |
|---|---|
| Import fix | `getBookingExpiryMeta` added to import in `StaysPage.tsx` — fixes TS2304. |
| Frontend build | `npm run build` PASS (tsc + vite). |

---

<!-- ============================================================ -->
<!-- Everything below this line is preserved from previous version -->
<!-- ============================================================ -->

## 1.0 Application Identity and Ownership

- **Nama aplikasi:** KOST48 Surabaya
- **Versi:** V5 (Multi-App Shared-DB Architecture)
- **Owner / konteks bisnis:** Kost eksklusif pria di Surabaya, 48 kamar (33 kamar reguler, 10 kamar eksklusif, 5 kamar VIP)
- **Alamat:** Ngagel Jaya Utara, Surabaya

## 1.1 Technology Stack

### Backend

| Komponen | Teknologi |
|---|---|
| Framework | NestJS (Node.js) |
| Bahasa | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Autentikasi | JWT (Bearer token) |
| Enkripsi | bcryptjs |
| Validasi | class-validator + class-transformer |
| Dokumentasi API | Swagger (OpenAPI via `@nestjs/swagger`) |
| Template engine | Handlebars (email/invoice generation) |
| File upload | multer |
| Security | Helmet, express-rate-limit |

### Frontend

| Komponen | Teknologi |
|---|---|
| Framework | React 18 |
| Bundler | Vite 5 |
| Bahasa | TypeScript |
| UI | React-Bootstrap 2.x + Bootstrap 5 |
| Routing | React Router v6 |
| HTTP client | Axios |
| State / server cache | TanStack Query (React Query) |
| Form | React Hook Form |
| Charts | Recharts |
| Dates | date-fns |

### Infrastructure / Dev

| Komponen | Teknologi |
|---|---|
| Version control | Git + GitHub |
| DB administration | pgAdmin 4 |
| API testing | PowerShell (Invoke-RestMethod), Playwright |
| Schema management | Prisma Migrate |

## 1.2 Database

### Current Schema Baseline

```text
Database           : kost48_v3_pro (UAT/local) / kost48_v3 (production)
Port               : 5433 (UAT) / 5432 (production)
ORM                : Prisma (schema.prisma)
Connection pooling : Direct connection (NestJS PrismaService)
Backup             : pg_dump (manual)
```

### Active Models

> **Total active models:** 50 (updated per 2026-05-31)
> **Note:** 4 deprecated models (`Announcement`, `TenantNotificationPreference`, `InvoiceChannel`, `AnnouncementRecipient`) are excluded.

AuditLog, BookingPaymentSubmission, CheckoutRequest, ContractRule, DepositSettlement, Expense, ExpenseCategory, ExpensePayment, ExpenseSplit, InventoryItem, InventoryMovement, Invoice, InvoiceLine, InvoicePayment, JournalEntry, JournalEntryLine, Notification, PaymentSubmission, PaymentSubmissionReview, PricingRule, RenewRequest, Review, Room, RoomFacility, RoomFile, RoomGalleryImage, RoomItem, RoomMaintenanceSchedule, RoomUtilityAccount, Stay, StayFile, StayNote, StayUtilityUsage, Tenant, TenantBooking, TenantDeposit, TenantNotification, User, AccountingPeriod, AccountingPostingConfig, ClosingPeriod, Coa, GeneralLedger, OpeningBalance, Ticket, TicketCategory, TicketComment, TicketWatcher, Workspace, WorkspaceMembership

---

## 2.0 Architecture

### V5 Multi-App — Greenfield Shell + Brownfield Extraction

```text
Tidak semua service dipisah sekaligus.
Tidak ada service-to-service HTTP di fase awal.
Shared DB + shared PrismaService tetap ada.
Extractor pattern: buat shell app → pindahkan module → koneksikan shared foundation.
Target apps: core-api, tenant-api, staff-api, finance-api, marketing-api, owner-api.
```

### Current Backend Structure

```text
backend/
├── prisma/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   ├── common/
│   ├── auth/
│   ├── audit-log/
│   ├── modules/
│   │   ├── stays/
│   │   ├── rooms/
│   │   ├── tenants/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── payment-submissions/
│   │   ├── tenant-bookings/
│   │   ├── checkout-requests/
│   │   ├── renew-requests/
│   │   ├── notifications/
│   │   ├── tickets/
│   │   ├── inventory/
│   │   ├── expenses/
│   │   ├── deposits/
│   │   ├── accounting/
│   │   ├── finance/
│   │   ├── public/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── me/
│   │   ├── announcements/
│   │   ├── maintenance/
│   │   └── ...
```

### Frontend Route/Surface Map

| Route Pattern | Surface | Auth |
|---|---|---|
| `/` | Landing / public home | Public |
| `/rooms` | Public room list | Public |
| `/rooms/:id` | Public room detail | Public |
| `/register` | Tenant registration | Public |
| `/login` | Login | Public |
| `/portal/*` | Tenant portal | Tenant JWT |
| `/staff/*` | Staff workspace | Staff/Admin JWT |
| `/admin/*` | Admin/backoffice | Admin JWT |
| `/finance/*` | Finance workspace | Finance/Admin JWT |
| `/owner/*` | Owner dashboard | Owner/Admin JWT |

---

## 3.0 Authentication & Authorization

### Auth Flow

| Aspek | Detail |
|---|---|
| Method | JWT Bearer token |
| Login identifier | Email atau phone |
| Default admin | `admin@kost48.com` / admin123 |
| Default staff | `staff@kost48.com` / staff123 |
| Default tenant | `tenant.g2@kost48.com` / tenant123 |
| Default owner | `liem.lui@gmail.com` / admin123 |
| Token expiry | 24 hours (configurable) |
| Refresh | Not yet implemented |

### Role Hierarchy

```text
SUPER_ADMIN > ADMIN > FINANCE > STAFF > TENANT
Permissions cascade down (except TENANT is isolated).
Some endpoints may check specific roles (e.g., @Roles(ROLE.ADMIN)).
```

### Authorization Decorators

| Decorator | Function |
|---|---|
| `@Auth()` | Requires valid JWT |
| `@Roles(ROLE.ADMIN, ROLE.FINANCE)` | Role-based access |
| `@Public()` | Skip auth |

---

## 4.0 API Structure

### Base URL

```text
Local development: http://localhost:3000/api
```

### Key Endpoints

| Area | Method | Endpoint | Access |
|---|---|---|---|
| Auth | POST | `/api/auth/login` | Public |
| Auth | GET | `/api/auth/me` | Authenticated |
| Rooms | GET | `/api/rooms` | Admin |
| Public | GET | `/api/public/rooms` | Public |
| Stays | GET/POST/PATCH | `/api/stays/*` | Admin |
| Invoices | GET | `/api/invoices/*` | Authenticated |
| Payments | POST | `/api/payments/*` | Authenticated |
| Tenant bookings | GET/POST | `/api/tenant-bookings/*` | Authenticated |
| Notifications | GET/PATCH | `/api/notifications` | Authenticated |
| Dashboard | GET | `/api/dashboard/*` | Admin |
| Tickets | GET/POST/PATCH | `/api/tickets/*` | Authenticated |
| Accounting | GET/POST | `/api/accounting/*` | Admin/Finance |

---

## 5.0 Key Business Flows

### 5.1 Booking Mandiri (Tenant Self-Booking)

```text
Ruang pilih kamar → isi data diri → submit → status RESERVED → batas waktu bayar (expiresAt).
Jika belum LUNAS sebelum expiresAt, booking hangus.
Approval Admin opsional (via pricing policy).
```

### 5.2 Admin Booking Approval

```text
Booking RESERVED muncul di antrean admin.
Admin lihat detail, setujui/tolak.
Approval membuat invoice.
Setelah LUNAS → booking jadi ACTIVE.
Status kamar berubah jadi OCCUPIED.
```

### 5.3 Payment Submission

```text
Tenant upload bukti bayar → PENDING → admin review → APPROVED/REJECTED.
Approval mengubah status pembayaran dan men-trigger pembuatan invoice.
```

### 5.4 Checkout

```text
Tenant ajukan checkout → admin setujui → admin final checkout.
Final checkout memicu:
- Status kamar → MAINTENANCE (readiness gate)
- Pembuatan CHECKOUT_INSPECTION ticket
- Deposit settlement (jika ada)
- Final utility charge (jika ada)
- Masa sewa selesai.
```

### 5.5 Renew (Perpanjangan)

```text
Tenant ajukan perpanjangan → admin setujui → perpanjangan dijalankan (perpanjangan masa sewa + invoice baru).
```

---

## 6.0 Key Business Rules

### Booking & Stay

- Satu kamar hanya bisa dihuni satu tenant aktif.
- Booking RESERVED tidak mengunci kamar.
- Booking tidak bisa di-approve jika sudah expired.
- Checkout final memicu room readiness gate (MAINTENANCE).
- Checkout inspection ticket harus di-close sebelum kamar bisa AVAILABLE kembali.

### Payment & Invoice

- Invoice diterbitkan saat booking di-approve.
- Invoice juga diterbitkan saat renew dijalankan.
- Pembayaran melalui payment submission (upload bukti).
- Payment submission perlu admin approval.
- Denda keterlambatan dikenakan otomatis jika pembayaran lewat jatuh tempo (setelah renew).

### Deposit

- Deposit diisi saat booking LUNAS atau check-in manual.
- Deposit bisa di-refund (sebagian/seluruhnya) atau dikonversi ke sewa.
- Settlement deposit terjadi saat checkout final.

### Notification

- Notifikasi untuk tenant: booking approve, payment accept/reject, checkout approve, invoice terbit, denda, dll.
- Notifikasi untuk admin: booking baru, payment submission, pengajuan checkout, dll.

---

## 7.0 Deployment & Environment

| Environment | Server | DB Port | DB Name |
|---|---|---|---|
| Development | Local | 5433 | kost48_v3_pro |
| UAT | Local | 5433 | kost48_v3_pro |
| Production | VPS | 5432 | kost48_v3 |

---

## 8.0 Known Limitations

### Current (V5.9.8-A / V5.9.9)

- No service-to-service HTTP yet.
- No separate database per app.
- No event bus / message queue.
- No refresh token.
- No email delivery yet (only preview/generate).
- No tenant deposit ledger (only deposit amount on Stay).
- No damage/penalty model yet.
- No asset/depreciation.
- No invoice auto-posting to accounting (manual journal only).
- Staff inventory read-only.
- Marketing/public pages are basic.
- Owner dashboard is still aggregated data (no real-time push).

---

## 9.0 Commit History (Recent)

```text
f3eb43b (HEAD -> main, origin/main, origin/HEAD) fix: add missing getBookingExpiryMeta import in StaysPage.tsx  [V5.9.9]
5b265d8 fix: UI/UX polish - replace developer labels with production-friendly English terms  [V5.9.8-A]
fec2511 feat: full fitur laporan keuangan (Balance Sheet, P&L, Cashflow, Financial Ratios) + Owner Dashboard  [V5.9.7]
75256c8 docs: sync v598a room readiness flow
2abf4c9 feat(rooms): gate checkout room readiness
f0ac838 docs: sync v595a public room assets
```

---

## 10.0 Next Planning Horizon

### Current (V5.9.9)

- [x] Fix TS2304 missing import in StaysPage.tsx
- [x] All other accumulated backend/frontend/doc changes committed and pushed.
- [ ] Full V5.9.9 manual UAT (if needed).

### Future (V5.24-D+ / V5.10+)

- PLAN V5.24-D — Admin UI Architecture + Performance Hardening
- V5.7 Workspace & Shared Foundation Prep
- V5.8 Marketing-api preparation
- V5.9 Staff-api preparation
- B2 Invoice Lifecycle + Final Utility Audit
- B3 Urgency Chip Final Verification
- B4 Deposit Settlement Model
- B5 Damage/Penalty/Inventory Condition
- B6 Public/Marketing Polish