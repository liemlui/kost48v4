# KOST48 V5 — Contracts & API
**Versi:** 2026-05-19 V5.13 release readiness contract sync

## 0. Active Architecture Contract

```text
Active architecture: Stable Modular Monolith
Multi-app Shared-DB: future roadmap only
No apps/ generation now
No workspace migration now
No service-to-service HTTP now
No runtime alias mirror hack
```

## 1. Core Lifecycle Ownership

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
| Finance read/review | Finance surface in monolith | review/read OK, approval core-only |
| Marketing/public | Marketing module in monolith | read-only public rooms/detail |

## 2. Locked V5.8-A Business Guards

1. Renewal invoice must be `ISSUED` after admin approve.
2. Checkout final must be blocked if any invoice for the stay is not `PAID`/`CANCELLED`.
3. `DRAFT` invoice counts as open invoice.
4. `complete()` must not auto-create final utility invoice.
5. Admin must settle/pay/cancel invoice manually before final checkout.
6. Open invoice count uses `NOT IN [PAID, CANCELLED]`.

## 3. Renew Request Contract — V5.10-B

Tenant create:

- Tenant may create renew request for own active stay.
- Request is blocked when a checkout request is pending.
- Only one pending renew request per stay.
- Payload supports:
  - `stayId`,
  - `requestedTerm`,
  - optional `requestedCheckOutDate`,
  - optional `requestNotes`.

Admin approve:

- Approval remains core monolith.
- Backend accepts optional `plannedCheckOutDate`, `agreedRentAmountRupiah`, and `reviewNotes`.
- Approval locks the renew request row with `FOR UPDATE` before execution.
- Stay extension, renewal invoice creation, invoice issue, and renew request approval are executed in one DB transaction.
- Renewal invoice remains tenant-facing immediately as `ISSUED`.
- Duplicate/double approval must fail because request status is no longer `PENDING`.

Admin reject:

- Reject only updates request status and review fields.
- Reject does not mutate stay/invoice/room.

## 4. Checkout Request Contract

- Tenant create/view checkout request remains request-only.
- Admin approve/reject checkout request does not complete the stay.
- Final checkout is still `POST /stays/:id/complete`.
- Final checkout is blocked by open invoices.

## 5. Payment Submission Contract

Tenant:

- Creates payment submission/proof only.
- Does not write `InvoicePayment` directly.

Admin/Owner:

- Review queue/read OK.
- Approval stays core-only.
- Payment approval must remain atomic and must not be extracted to finance surface yet.

## 6. Staff Contract — V5.10-C

Staff may read low-risk operational data:

- inventory items,
- room items,
- inventory movements,
- room view,
- selected finance/billing records for operational visibility.

Billing/finance-sensitive writes are OWNER/ADMIN unless explicitly decided otherwise:

- meter reading create/update,
- expense create/update/delete,
- wifi sale create/update/delete.

Tickets remain operational staff domain.

## 7. Finance Contract — V5.10-D

Finance read/review surfaces may exist inside monolith:

- invoice list/detail,
- invoice payment read,
- payment submission review queue,
- reports/read analytics.

Finance/lifecycle mutation remains OWNER/ADMIN core:

- invoice creation/update/cancel/issue,
- invoice payment create/update/delete,
- payment approval,
- expense/wifi-sale write after V5.10-D guard,
- any payment mutation that changes stay/room/meter/deposit.

## 8. Marketing Contract

Marketing module remains read-only and public:

- public rooms list,
- public room detail,
- no auth required,
- no tenant private data,
- no room status writes,
- no lifecycle mutation.

## 9. Production Contract

- Do not reset production DB.
- Do not edit production `dist` except emergency hotfix.
- Source local → build → commit → push → deploy.
- Schema/DB changes require separate backup/migration plan.


## V5.11 Contract Addendum — Checkout Request Read Filter

Admin checkout request list may be filtered by `stayId` for UI efficiency:

```text
GET /api/admin/checkout-requests?status=PENDING&stayId=123
GET /api/admin/checkout-requests?status=APPROVED&stayId=123
```

Rules:

1. `stayId` is optional.
2. Invalid `stayId` must return HTTP 400.
3. This is read-only list filtering, not lifecycle execution.
4. Approving a checkout request still does not complete the stay.
5. Final checkout remains owned by `StaysService.complete()`.


## 8. V5.12 UAT Contract

V5.12 is a regression/UAT pack, not a feature extraction phase.

Required UAT proofs:

| Flow | Required proof | Script |
|---|---|---|
| Renew full flow | Tenant creates renew request, admin approves, stay extends, renewal invoice is `ISSUED`, tenant can see invoice | `scripts/uat/KOST48_V512_RENEW_UAT.ps1` |
| Checkout guard | Checkout final with open invoice returns HTTP 409; after invoice is paid, checkout succeeds and room becomes `AVAILABLE` | `scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1` |
| Invoice payment regression | Partial payment => `PARTIAL`, overpayment => HTTP 409, remaining payment => `PAID`, queue still healthy | `scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1` |
| Full pack | Runs all V5.12 scripts sequentially | `scripts/uat/KOST48_V512_FULL_REGRESSION.ps1` |

Rules:

- Scripts may create isolated UAT tenants, rooms, stays, invoices, and payments.
- Scripts must not reset DB.
- Scripts must use PowerShell + `Invoke-RestMethod`.
- Scripts must not require multi-app services.
- Scripts must not mutate production DB.
## V5.13 Release / Deployment Contract

V5.13 does not change business behavior. It only prepares release/deployment verification.

Rules:

1. Production smoke must be read-only unless credentials are explicitly supplied.
2. Production smoke must not create tenant, room, stay, invoice, payment, checkout, or renew data.
3. Production DB must never be reset by release scripts.
4. Source ZIP must exclude heavy/sensitive/generated files:
   - `node_modules/`,
   - `dist/`,
   - `backend/src/generated/`,
   - `.prisma/`,
   - `.env`,
   - logs,
   - TypeScript build info.
5. Multi-app remains roadmap only.
6. If production smoke fails, do not claim deploy PASS; capture the first failing endpoint and status.
