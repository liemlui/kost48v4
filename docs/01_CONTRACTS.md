# KOST48 V5 — Contracts & API
**Versi:** 2026-05-22 V5.16-G Staff Repair Contract + V5.15 Carry-Forward**

## 0. Active Architecture Contract

```text
Active architecture: Stable Modular Monolith
Multi-app Shared-DB: future roadmap only
No apps/ generation now
No workspace migration now
No service-to-service HTTP now
No runtime alias mirror hack
```

## 1. Staff Repair Business Contract

### 1.1 Role ownership

| Domain/action | Owner | Contract |
|---|---|---|
| Staff report item condition | STAFF | boleh membuat laporan kondisi lapangan |
| Staff start/finish ticket | STAFF | boleh start dan mark done ticket assigned ke dirinya |
| Final room item status | OWNER/ADMIN | staff tidak menentukan final barang |
| Final warehouse item status | OWNER/ADMIN | staff tidak menentukan final barang gudang |
| InventoryMovement | OWNER/ADMIN | mutasi stok resmi hanya admin/owner |
| Ticket close/cancel | OWNER/ADMIN | close hanya dari DONE; cancel hanya dari OPEN |
| Staff performance evidence | System | tercatat dari report/ticket flow |

### 1.2 Source of truth

```text
Ticket = process controller.
StaffFieldReport = laporan/diagnosis lapangan.
RoomItem.status = display/final state barang kamar setelah konfirmasi admin.
InventoryItem.status = display/final state barang gudang setelah konfirmasi admin.
InventoryMovement = stock/physical truth resmi.
```

### 1.3 Staff may do

- Lihat pekerjaan aktif.
- Lapor kondisi barang kamar.
- Lapor kondisi barang gudang.
- Minta barang pengganti.
- Start ticket assigned.
- Mark done ticket assigned dengan `resolutionNote`.
- Lihat laporan kondisi yang ia buat.

### 1.4 Staff must not do

- Menetapkan status final barang.
- Membuat official InventoryMovement.
- Mengubah qty resmi gudang.
- Menutup/cancel ticket.
- Mutate finance/lifecycle sensitive flow.

### 1.5 Admin may do

- Assign staff.
- Review `StaffFieldReport`.
- Approve/reject/needs more info.
- Create official movement if needed.
- Close ticket and set final item status.
- Cancel ticket when still `OPEN`.

## 2. Ticket Lifecycle Contract

```text
OPEN = belum mulai / bisa dibatalkan admin
IN_PROGRESS = sedang dikerjakan staff / mengunci staff dari pekerjaan aktif lain
DONE = staff selesai / menunggu cek admin
CLOSED = selesai final
CANCELLED = dibatalkan admin
```

Rules:
- Staff can `start` only if no other active work exists.
- Staff can `mark-done` only from `IN_PROGRESS`.
- Admin can `close` only from `DONE`.
- Admin can `cancel` only from `OPEN`.
- CLOSED/CANCELLED should not appear in default staff active list.

## 3. Staff Ticket List Contract

Endpoint:

```text
GET /api/tickets
Roles: OWNER, ADMIN, STAFF
```

For STAFF:
- Default list includes only active work:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- A ticket is visible if:
  - `assignedToId = currentUser.id`, or
  - it has `staffFieldReports.some.reportedByStaffId = currentUser.id`.
- STAFF list must not fallback to `tenantId` because staff user has empty tenantId.

Verified:
- Staff user id = 3.
- Ticket #12 `OPEN`, `assignedToId=3`, `linkedRoomItemId=1` appeared in staff list after V5.16-G.

## 4. Staff Report Endpoints

### Room item report

```text
PATCH /api/room-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Accepted DTO contract currently uses:
- `status`
- `note`
- optional photo fields
- `requestsReplacement`
- `requestedInventoryItemId`
- `requestedQty`

Do not use payload keys:
- `notes`
- `reportedCondition`
- `conditionNotes`

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- sets temporary applied status,
- fills `linkedRoomItemId`,
- does not decide final status.

### Warehouse/inventory report

```text
PATCH /api/inventory-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- fills `linkedInventoryItemId`,
- does not mutate official qty.

## 5. StaffFieldReport Contract

Model introduced in V5.16-B.

Fields conceptually:
- ticket link,
- room/roomItem/inventoryItem link,
- reportedByStaff,
- reported condition,
- condition notes/photo evidence,
- request replacement data,
- admin decision,
- related movement if any,
- status.

Admin decisions:
- `APPROVE`
- `REJECT`
- `NEEDS_MORE_INFO`

Report statuses:
- reported/pending,
- under review,
- approved/in repair,
- rejected,
- closed/final.

Use user-facing Indonesian labels in UI. Avoid showing enum names to staff.

## 6. Close Ticket Contract

```text
POST /api/tickets/:id/close
```

Current body uses:

```json
{ "action": "CLOSE" }
```

or

```json
{ "action": "CANCEL" }
```

Optional final fields:
- `finalRoomItemStatus`
- `finalInventoryItemStatus`
- `finalAdminNote`

Do not use `reason`; validation rejects it.

## 7. Core Lifecycle Ownership

| Domain/action | Owner sekarang | Contract |
|---|---|---|
| Stay lifecycle writes | Core monolith | create, renew, complete, cancel |
| Room occupancy/status writes | Core monolith | AVAILABLE/RESERVED/OCCUPIED mutation |
| Manual check-in | Core monolith | creates active stay, invoice, meter, portal user |
| Booking approval | Core monolith | invoice/deposit/pending meter snapshot |
| Renew execution | Core monolith | approve request extends stay and issues invoice |
| Checkout final | Core monolith | complete stay + room release after invoice guard |
| Payment approval | Core monolith | mutates submission/payment/invoice/stay/room/meter/deposit |
| Tenant request/read | Tenant surface in monolith | create/view only, no lifecycle finalization |
| Staff surfaces | Staff surface in monolith | read/operational low-risk; finance/billing writes restricted |
| Marketing/public | Marketing module in monolith | read-only public rooms/detail |

## 8. Locked Business Guards

1. Renewal invoice must be `ISSUED`.
2. Checkout final must be blocked if any invoice for the stay is not `PAID`/`CANCELLED`.
3. `DRAFT` invoice counts as open invoice.
4. `complete()` must not auto-create final utility invoice.
5. Payment approval remains core monolith and atomic.
6. Room status/occupancy writes remain core monolith.
7. Tenant does not execute lifecycle finalization.
8. Staff does not mutate finance/lifecycle-sensitive flows.

## 9. UX Contract

Staff UI must use:
- “Laporkan kondisi”
- “Menunggu cek admin”
- “Admin meminta info tambahan”
- “Tandai selesai”
- “Pekerjaan selesai, menunggu konfirmasi”
- “Selesai final”

Avoid:
- `FieldReport`
- `StaffPerformanceEvent`
- `PENDING_CHECK`
- `NEEDS_MORE_INFO`
- `linkedRoomItemId`
- `mutation`
- `negative KPI`
- `audit failed`

## 10. AI/Finance Carry-Forward

V5.15 remains active as future track:
- Tier 0 deterministic hooks first.
- AI only on-demand.
- Finance ratios locked until balance-sheet-grade data is reliable.
- No fake ratio.
