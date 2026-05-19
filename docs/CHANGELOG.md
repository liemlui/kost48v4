# KOST48 V5 — Changelog
**Versi:** 2026-05-19 V5.12 UAT pack


## 2026-05-19 — V5.12 Renew + Checkout Full Business UAT Pack

### Type

UAT/regression scripts and docs sync only.

### Added

PowerShell UAT scripts:

- `scripts/uat/KOST48_V512_RENEW_UAT.ps1`
- `scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1`
- `scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1`
- `scripts/uat/KOST48_V512_FULL_REGRESSION.ps1`

### Coverage

- Renew full flow: tenant create, admin approve, invoice `ISSUED`, tenant visibility, double approval guard.
- Checkout guard: open invoice blocks checkout with 409, full invoice payment allows checkout, room returns `AVAILABLE`.
- Payment regression: partial payment -> `PARTIAL`, overpay -> 409, remaining payment -> `PAID`, review queue remains healthy.

### Not Changed

- No backend feature code.
- No frontend feature code.
- No schema change.
- No DB reset.
- No multi-app shell.
- No workspace migration.

### Verification Required

- backend build PASS,
- frontend build PASS,
- `KOST48_V512_FULL_REGRESSION.ps1` PASS,
- commit and push.

---

## 2026-05-19 — V5.11 Checkout Filter + Regression Pack

### Backend

Changed:

- `GET /api/admin/checkout-requests` now supports optional `stayId` query filter.
- Invalid `stayId` now returns HTTP 400 with a clear Indonesian error.
- Admin checkout request list can now be scoped by stay for detail pages instead of loading all pending/approved requests and filtering client-side.

### Frontend

Changed:

- `listAdminCheckoutRequests()` accepts optional `stayId`.
- `StayDetailPage` now requests pending/approved checkout requests by `stayId`, avoiding client-side filtering over all checkout requests.

### Scripts

Added PowerShell UAT scripts:

- `scripts/uat/KOST48_V511_SMOKE.ps1`
- `scripts/uat/KOST48_V511_STAFF_BOUNDARY.ps1`

### Not Changed

- No schema change.
- No DB reset.
- No multi-app shell.
- No workspace migration.
- No lifecycle write extraction.

### Verification Required

- backend build PASS,
- frontend build PASS,
- smoke script PASS,
- staff boundary script PASS,
- checkout detail UI manual check.


## 2026-05-19 — V5.10-B/C/D/E/F Boundary Hardening

### Backend

Changed:

- Renew approve DTO now accepts:
  - `plannedCheckOutDate`,
  - `agreedRentAmountRupiah`,
  - `reviewNotes`.
- Renew create DTO now accepts optional `requestedCheckOutDate`.
- Renew approval now locks the request row with `FOR UPDATE` before processing.
- Renew approval executes stay extension, invoice creation/issue, and request approval in one transaction.
- `StaysService` exposes transaction-safe renewal execution for core internal use.
- `RenewRequestsModule` imports `AuditLogModule` explicitly.
- Staff write boundary tightened:
  - meter reading create/update = OWNER/ADMIN,
  - expense create/update/delete = OWNER/ADMIN,
  - wifi sale create/update/delete = OWNER/ADMIN.
- Staff read access preserved for those surfaces.

### Frontend

Changed:

- Admin renew request payload type now matches backend.
- Admin renew approval modal supports optional approval notes.
- Admin renew approval date field pre-fills from requested checkout date when available.

### Docs

Updated only active docs:

- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`

Docs now reflect:

- Stable Modular Monolith as active architecture,
- Multi-app as roadmap only,
- V5.10 current phase,
- V5.10-B/C/D/E/F scope and UAT needs.

### Not Changed

- No schema change.
- No DB reset.
- No multi-app shell.
- No workspace migration.
- No service-to-service HTTP.
- No payment approval extraction.
- No frontend app split.

### Verification Required

Do not claim full PASS until:

- backend build PASS,
- frontend build PASS,
- runtime smoke PASS,
- renew approval UAT PASS,
- staff restriction UAT PASS,
- checkout invoice guard UAT PASS.
