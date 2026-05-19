# KOST48 V5 — Contracts & API
**Versi:** 2026-05-18 V5.7/V5.8 audit sync  
**Fungsi:** Kontrak bisnis/API/ownership aktif. Untuk status fase lihat `00_GROUND_STATE.md`; untuk rencana eksekusi lihat `02_PLAN.md`.

---

---

## 0A. V5.8-A Implementation Contract Overlay

V5.8-A source overlay mengikuti kontrak ini:

| Area | Contract setelah patch |
|---|---|
| Renewal invoice | Invoice renewal boleh dibuat `DRAFT` hanya sebagai staging internal saat line dibuat; sebelum transaction selesai harus menjadi `ISSUED` dan memiliki `issuedAt`. |
| Checkout final | `StaysService.complete()` wajib menolak invoice status selain `PAID`/`CANCELLED` sebelum `Stay` menjadi `COMPLETED` dan room menjadi `AVAILABLE`. |
| Open invoice count | Count/surface backend harus memakai definisi open invoice yang sama: `status NOT IN [PAID, CANCELLED]`. |
| Deposit processing | Deposit tidak boleh diproses jika masih ada open invoice menurut definisi yang sama. |
| CheckoutRequestsModule | Tidak boleh import `StaysModule` jika service tidak inject `StaysService`. |

Catatan penting: package ini belum membuktikan PASS karena build/UAT harus dilakukan di environment Windows user.

## 0. Latest Contract Override — V5 Multi-App Shared-DB

Kontrak ini mengalahkan wording lama jika ada konflik.

```text
Architecture: Multi-App Shared-DB Architecture
Database: shared PostgreSQL tetap dipakai
PrismaService: shared
Migration style: greenfield shell + brownfield logic extraction
No total rewrite
No pure microservices
No separate DB at initial phase
No distributed transaction
No service-to-service HTTP in Phase 0/1 unless explicitly decided
```

### 0.1 Service ownership contract

| Domain/action | Owner awal | Catatan |
|---|---|---|
| Stay lifecycle writes | `core-api` | create, complete, cancel, renew execution |
| Room occupancy/status writes | `core-api` | AVAILABLE/RESERVED/OCCUPIED mutation |
| Direct/manual check-in | `core-api` | Operational lifecycle starts immediately |
| Booking approval | `core-api` | agreed rent, deposit, invoice, pending meter snapshot |
| Booking create/my | `tenant-api` later | request/read only; no activation |
| Checkout request create/view/cancel tenant | `tenant-api` later | safe read/request methods only |
| Checkout request approve/reject/admin processing | `core-api` | admin lifecycle decision |
| Checkout final / complete stay | `core-api` | room release + invoice guard |
| Renew request create/view tenant | `tenant-api` later | request/read only |
| Renew approve/execution | `core-api` | confirmed injects `StaysService`; calls `renewStay()` |
| Payment proof create/my | `tenant-api` later | submission only |
| Payment review queue | `finance-api` later | read/review surface only |
| Payment approval | `core-api` | confirmed `$transaction` + SQL lock + lifecycle mutation |
| Public rooms/detail | `marketing-api` later | read-only candidate |
| Staff tickets | `staff-api` later | low-risk candidate |
| Staff room/inventory read-only | `staff-api` later | writes remain core |
| Owner dashboard/reporting | later | defer to avoid mini-monolith |

### 0.2 Cross-app shared DB rule

Selama shared DB dipakai:

- App boleh membaca tabel domain lain untuk validasi.
- Write ownership harus jelas.
- `tenant-api` tidak boleh mutate `Stay.status`, `Room.status`, meter promotion, invoice lifecycle final.
- `finance-api` tidak boleh approve payment yang mengubah Stay/Room/Meter/Deposit sampai command boundary didesain.
- Tidak ada distributed transaction; multi-entity write tetap harus dilakukan dalam satu `prisma.$transaction()` di owner app.

---

## 1. Confirmed High-Risk Flow Contract

Hasil audit V5.7-B mengunci flow berikut sebagai **core-api only**:

| Flow/method | Reason |
|---|---|
| `PaymentSubmissionsService.approveSubmission()` | `$transaction` + SQL lock; mutasi PaymentSubmission, InvoicePayment, Invoice, Stay, Room, MeterReading, deposit fields, AuditLog |
| `TenantBookingsService.approveBooking()` | `$transaction`; set agreed rent/deposit, invoice DRAFT→ISSUED, pending meter snapshot, audit |
| `StaysService.create()` | `$transaction`; creates Stay, Room OCCUPIED, invoice ISSUED, meter readings, portal user |
| `StaysService.complete()` | `$transaction`; checkout final, room AVAILABLE; akan ditambah open invoice guard |
| `StaysService.renewStay()` | `$transaction`; extends stay, creates renewal invoice; target KB-1 = ISSUED |
| `RenewRequestsService.approveRequest()` | confirmed injects `StaysService` and calls `renewStay()` |
| Room status writes | occupancy source of truth |
| Meter promotion | tied to payment activation |
| Deposit settlement | future model/audit trail needed |
| Damage/penalty schema | deferred |

---

## 2. Locked Business Decisions — V5.8

### KB-1 — Renewal invoice policy

```text
Renewal invoice must become ISSUED when admin approves a renew request.
```

Rationale:

- Booking approval flow already produces an `ISSUED` invoice.
- Renewal approval is a business commitment and should become tenant-facing.
- Leaving renewal invoice as `DRAFT` can hide payment obligations from tenant.

Implementation target:

- Patch `RenewRequestsService.approveRequest()` and/or `StaysService.renewStay()` after V5.8 PLAN.
- Preferred approach must be chosen in V5.8 PLAN based on lowest risk.
- Do not change schema.

Expected behavior after ACT:

```text
Admin approve renew request
→ stay planned checkout extended
→ renewal invoice created
→ renewal invoice status ISSUED
→ tenant can see/pay renewal invoice
```

### KB-2 — Checkout final open invoice guard

```text
StaysService.complete() must block checkout final if there is any open invoice for the stay.
No auto-create final utility invoice inside complete().
```

Open invoice definition:

```text
Open invoice = invoice status NOT IN [PAID, CANCELLED]
DRAFT is open and must block checkout until admin resolves it.
```

Rationale:

- Checkout means tenant truly leaves.
- Admin must settle invoices manually before final checkout.
- No hidden unpaid or draft invoices should remain when room is released.
- Final utility billing remains manual/admin-managed for now.

Expected error style:

```text
Tidak bisa checkout final karena masih ada invoice yang belum diselesaikan: [invoiceId/number]. Selesaikan atau batalkan invoice terlebih dahulu.
```

---

## 3. Manual Check-in Business Automation Contract — Status Updated

Previous B1 target is now implemented in code according to V5.7-B audit.

Current behavior confirmed by audit:

- `StaysService.create()` uses `prisma.$transaction()`.
- Direct/manual check-in creates `Stay ACTIVE` and `Room OCCUPIED`.
- Invoice is created as `DRAFT`, invoice line is created, then invoice becomes `ISSUED`.
- Initial meter readings are created.
- Portal user auto-create is implemented for tenant email.
- Portal statuses include `MISSING_EMAIL`, `CREATED`, `ALREADY_ACTIVE`.
- Temporary password follows `kost48-XXXX` pattern and is returned only on `CREATED`.

Contract remains:

| Condition | Behavior |
|---|---|
| Tenant email empty | skip portal create; return `MISSING_EMAIL`; check-in succeeds |
| Tenant email exists and no User | create TENANT portal user; return `CREATED`, portalEmail, temporaryPassword once |
| User already exists for same tenant | return `ALREADY_ACTIVE`; no duplicate user |
| Email belongs to another user/tenant | block with conflict before final side effects |

---

## 4. Invoice Semantics Contract

| Status | Meaning |
|---|---|
| `DRAFT` | Internal preparation only; not tenant-facing and not payable unless explicitly exposed |
| `ISSUED` | Official tenant-facing invoice; payable |
| `PARTIAL` | Partially paid |
| `PAID` | Fully paid |
| `CANCELLED` | Cancelled/voided from business flow |

Business invariants:

1. Tenant who is `OCCUPIED` should not silently have active obligation hidden as `DRAFT`.
2. Manual check-in initial invoice must be `ISSUED`.
3. Booking approval initial invoice must be `ISSUED`.
4. Renewal approval invoice must be `ISSUED` after KB-1.
5. Checkout final must be blocked by any open invoice after KB-2.

---

## 5. Checkout / Rencana Keluar Contract

Tenant-facing name: **Pengajuan Keluar Kamar**  
Admin/internal short name: **Rencana Keluar**

Status labels:

| Status | Display |
|---|---|
| `PENDING` | Menunggu Review |
| `APPROVED` | Rencana Disetujui / Siap Checkout Final |
| `REJECTED` | Ditolak |

Rules:

1. Approving checkout request does not complete the stay.
2. Tenant remains active/occupied until admin runs **Checkout Final**.
3. Checkout final is done through `StaysService.complete()` / `POST /stays/:id/complete`.
4. Checkout final must preserve history: meter, payment, invoice, deposit.
5. After KB-2, checkout final must be blocked if any invoice for the stay is not `PAID` or `CANCELLED`.
6. No auto-create utility invoice in `complete()` for now.

Audit finding:

- `CheckoutRequestsModule` imports `StaysModule`, but `CheckoutRequestsService` does not inject `StaysService`.
- This is a dead import cleanup candidate, not a business behavior change.

---

## 6. Renew Request Contract

Rules:

1. Tenant can create/view own renew request later in `tenant-api`.
2. Admin approval/execution stays in `core-api`.
3. `RenewRequestsService` injects `StaysService` and approval calls `renewStay()`.
4. Renewal extends existing active stay, not create parallel stay.
5. After KB-1, renewal invoice must become `ISSUED` when admin approves the request.
6. Renewal invoice should be tenant-facing immediately after approval.

Before ACT:

- V5.8 PLAN must decide whether invoice issue logic is patched in `StaysService.renewStay()` or in `RenewRequestsService.approveRequest()` after `renewStay()`.
- Prefer lower-risk approach with smallest file count.

---

## 7. Payment Submission Contract

Tenant writes to `PaymentSubmission`, not `InvoicePayment`.

Tenant create rules:

- Tenant may create payment submission for own booking/invoice only.
- Initial booking payment must equal required rent + deposit amount.
- No underpay/overpay/partial for initial booking payment.
- Duplicate pending review submissions must be prevented.

Admin approve contract:

- Approval is `core-api` only.
- Approval must be atomic.
- Audit confirmed `$transaction` + raw SQL lock `FOR UPDATE` is used.
- Approval writes/may write:
  - `PaymentSubmission`
  - `InvoicePayment`
  - `Invoice`
  - `Stay` deposit fields
  - `Room` status RESERVED→OCCUPIED
  - `MeterReading` promotion
  - `AuditLog`
- Notification after approval may be non-blocking.

Finance-api future:

- `findReviewQueue()` / review list can move as read-only.
- `approveSubmission()` and lifecycle mutation must not move yet.

---

## 8. Booking Contract

Tenant booking:

- Tenant can create own booking request/Stay context.
- Room must be available.
- Booking creates reserved lifecycle context but not operational occupancy until payment approval.

Admin approval:

- `TenantBookingsService.approveBooking()` remains core-api.
- Audit confirmed `$transaction`.
- Approval creates invoice `ISSUED` and stores pending meter snapshot.
- Room remains `RESERVED` until payment approval.
- MeterReading is not created at booking approval; it is promoted at payment approval.

---

## 9. Public / Marketing Contract

Marketing/public module is read-only.

Allowed future `marketing-api` scope:

- public rooms list
- public room detail
- public profile/landing
- gallery read later
- announcement/public content read if applicable

Forbidden:

- no Room status writes
- no booking approval
- no tenant private data
- no auth dependency unless explicitly needed later
- no lifecycle mutation

---

## 10. Staff Contract

Staff can be extracted later as a read/operational app.

Allowed future `staff-api` scope:

- tickets
- room view
- inventory read-only
- room-items read-only
- maintenance/task future

Forbidden for staff-api early phase:

- inventory write
- room status write
- payment approval
- tenant portal access management
- stay lifecycle mutation

---

## 11. Announcement, AppNotification, Reminder Contract

Announcement:

- Broadcast content/pengumuman.
- Operational TENANT audience only for occupied tenants.
- Non-occupied tenants should be routed to `/portal/bookings` instead of operational announcements.

AppNotification:

- Personal inbox/read-unread per user.
- Query and mark-read must be scoped to current user.
- Notification failure should not break main business transaction unless explicitly part of transaction.

Urgency chip:

- Not Announcement.
- Not AppNotification.
- Persistent business indicator until obligation resolved.
- Still requires browser UAT before PASS claim.

---

## 12. Production Deployment Contract

Production endpoints:

- Frontend: `https://app.kost48surabaya.com`
- Backend: `https://api.kost48surabaya.com/api`

Rules:

1. Normal flow: source local → build → commit → push → pull/deploy.
2. Do not edit `dist` production except emergency hotfix.
3. Do not reset production DB.
4. Schema/DB changes require backup + separate plan.
5. `.htaccess`/Apache config is deployment config, not default app source unless explicitly decided.

Minimum production UAT after deploy:

- `GET /api/public/rooms`
- `POST /api/auth/login`
- `GET /api/me/notifications` with Bearer token
- If reminder touched: `GET /api/admin/reminders/preview/all`

---

## 13. V5.9-A Multi-App Shell Contract

### 13.1 App shell contract

V5.9-A app shells are allowed as long as they do not move lifecycle writes.

| App shell | Allowed in V5.9-A | Forbidden in V5.9-A |
|---|---|---|
| `marketing-api` | `GET /api/health`, `GET /api/public/rooms`, `GET /api/public/rooms/:id` | auth-only data, room writes, booking approval |
| `staff-api` | read-only rooms, inventory items, room items, tickets, overview | inventory write, room status write, ticket workflow mutation |
| `finance-api` | read-only invoices, payment review queue, finance summary/reports | payment approve/reject, booking expiry command, lifecycle mutation |

### 13.2 Build preservation contract

The existing backend build/start contract must stay valid:

```text
npm run build
node dist/main.js
```

Because of that, app shells are placed under `backend/src/apps/*`, not root `backend/apps/*`, until a later full workspace migration is explicitly planned.

### 13.3 Read-only enforcement contract

Dedicated read-only modules must be preferred for extracted shells instead of importing broad modules that expose mutation controllers.
