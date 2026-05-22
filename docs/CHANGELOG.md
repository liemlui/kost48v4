# KOST48 V5 — Changelog
**Versi:** 2026-05-22 V5.16-G Staff Repair Flow Stable**

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix

### Type

Backend staff visibility hard fix.

### Fixed

- `GET /api/tickets` for STAFF now shows active tickets assigned to the staff or created through the staff's field reports.
- Default staff list includes:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- Staff list no longer incorrectly appears empty when active assigned tickets exist.

### Verified

Manual UAT:
- Staff user:
  - `id=3`
  - `role=STAFF`
- Fresh room item report created ticket:
  - `id=12`
  - `ticketNumber=TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff `GET /api/tickets?limit=20` displayed the active assigned ticket.

### Not Changed

- No schema change.
- No frontend source change required.
- No UAT script file added.
- No DB reset.

---

## 2026-05-22 — V5.16-F Staff Repair UX Final Polish

### Type

Frontend UX polish + backend visibility preparation.

### Updated

- Staff/admin wording made more human:
  - “Belum mulai”
  - “Sedang dikerjakan”
  - “Selesai, menunggu cek admin”
  - “Selesai final”
  - “Dibatalkan admin”
- Admin queue wording changed to “Antrian konfirmasi admin”.
- Staff work queue cleaned from technical jargon.

### Verification

Initial UAT showed report/linking still worked, but staff list needed V5.16-G hard fix.

---

## 2026-05-21 — V5.16-E Staff Ticket Linking + UAT Safe Package

### Type

Backend linking and UAT behavior cleanup.

### Fixed

- Fresh staff report for room item fills `linkedRoomItemId`.
- Fresh staff report for inventory item fills `linkedInventoryItemId`.
- Staff ticket detail visibility works.
- UAT commands are written in chat, not committed as script files.

### Verified

- Ticket 9 had `linkedRoomItemId=1`.
- Ticket 8 had `linkedInventoryItemId=2`.
- Ticket 8 and 9 were cancelled after UAT.

---

## 2026-05-21 — V5.16-D Staff Repair Select Contract + UAT

### Type

Frontend select contract + backend DTO alignment.

### Added

- Frontend `staffRepairOptions` single source of truth.
- Separate option sets for:
  - room item condition,
  - warehouse item condition,
  - admin decision,
  - final room item status,
  - final inventory item status.

### Verified

Manual UAT:
- Staff room item report applied temporary `MAINTENANCE`.
- Replacement request saved.
- Staff warehouse report applied temporary `PENDING_CHECK`.
- Admin review `APPROVE`, `NEEDS_MORE_INFO`, and `REJECT` accepted.
- Movement created and stock decreased.

---

## 2026-05-21 — V5.16-C Staff Repair Flow Stabilization

### Type

Validation and lifecycle hardening.

### Fixed

- Field report condition notes required.
- Replacement request requires inventory item and qty.
- Admin movement only allowed when decision is `APPROVE`.
- Staff reports require note or photo evidence.
- Ticket close remains valid only from `DONE`.

---

## 2026-05-21 — V5.16-B Staff Field Report + Admin Confirmation Queue

### Type

Backend schema additive + frontend admin/staff flow.

### Added

- `StaffFieldReport`.
- `ReportedCondition`.
- `AdminDecision`.
- `StaffFieldReportStatus`.
- Ticket nullable final/link fields:
  - `linkedRoomItemId`
  - `linkedInventoryItemId`
  - `finalRoomItemStatus`
  - `finalInventoryItemStatus`
  - `finalAdminNote`
- Admin review queue.
- Staff field reports API.

### Not Changed

- No DB reset.
- No lifecycle rewrite.
- Inventory movement remains owner/admin.

---

## 2026-05-21 — V5.16-A Staff Repair Governance

### Type

Business flow correction.

### Changed

- Staff status update became “laporan kondisi”.
- Staff no longer appears to decide final item status.
- Frontend wording changed from “Update Status” to “Laporkan Kondisi Barang”.

---

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation

### Type

Product/UX/architecture planning docs sync only.

### Added

- Intelligent Command Center direction.
- Assistant vs queue dedup strategy.
- Tier 0 deterministic intelligence plan.
- Tier 1 AI on-demand plan.
- Finance foundation plan.
- Smart chart system plan.

### Not Changed

- No backend source code changed by docs pack.
- No frontend source code changed by docs pack.
- No schema migration applied.
- No DB reset.
