# KOST48 V5 — Changelog
**Versi:** 2026-05-29 M8G–M8K Command Center Safety Belts Sync


<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_START -->
## 0.0 Latest Current State — M8G–M8K Command Center Safety Belts Sync

```text
Latest local code commit:
5c4526f feat(command-center): harden accounting booking checkout and staff safety belts

Docs sync status:
- Code commit 5c4526f sudah dibuat lokal.
- Docs sync ini harus dicommit terpisah sebelum push GitHub.
- Older M4A/M8F/V5.29 sections below remain historical record.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8G | Accounting Manual Payment Posting + Deposit Status Fix | FULL | Backend build PASS; manual payment journal smoke PASS; update/delete journaled payment blocked; deposit PARTIAL_REFUND status code patched but targeted runtime smoke still recommended |
| M8H | Admin Booking Review Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; reject endpoint added; targeted booking runtime smoke still recommended before FULL label |
| M8I | Tenant Booking / Waiting Room Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; cancelled booking visibility patched; tenant booking runtime smoke still recommended |
| M8J | Admin Checkout Request Review Safety Belt | FULL | Backend build PASS; pending list PASS; short reject note blocked; valid reject PASS; valid approve PASS; already-processed approve blocked |
| M8K | Staff Report / Admin Confirmation Safety Belt | FULL | Backend build PASS; ticket list PASS; field report queue PASS; short final note blocked; valid ticket close PASS |

### Current honest label

```text
M8G–M8K = build-confirmed and core runtime-smoked for accounting, checkout, and ticket close paths.
M8H/M8I booking/waiting-room still need targeted runtime/manual UI smoke before FULL business-flow PASS.
Manual browser UI smoke for M8J/M8K is still not confirmed.
Generated Prisma noise was restored before code commit.
No DB reset was used.
```

### Latest important UAT evidence

```text
M8G:
- Manual InvoicePayment id=6 created JournalEntry JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE of journaled payment id=6 returned 409 and blocked silent accounting divergence.

M8J:
- Checkout request id=3 short reject note returned 400.
- Checkout request id=3 valid reject returned REJECTED.
- Checkout request id=2 valid approve returned APPROVED.
- Approving already processed request returned 409.

M8K:
- Ticket id=3 short finalAdminNote returned 400.
- Ticket id=3 valid finalAdminNote closed ticket TIC-UAT-0003.
- Backend build: npm run build:local PASS.
```

### Next recommended phase

```text
PLAN M8L Inventory Movement Safety Belt.
Goal:
- official stock movement must not be direct-click or staff-owned,
- staff may report need/condition only,
- admin/owner confirms official InventoryMovement,
- no schema change unless real guard/data gap is proven.
```
<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_END -->

## 2026-05-29 — M8G–M8K Command Center Safety Belts

### Type

Backend + frontend safety-belt hardening across accounting, booking, checkout request review, and staff/admin confirmation.

### Added / Changed

#### M8G Accounting
- Added accounting posting hook for manual admin invoice payments.
- Added accounting metadata/warning behavior to manual payment responses.
- Blocked update/delete for invoice payments that already have posted accounting journals.
- Changed `PARTIAL_REFUND` deposit status to `PARTIALLY_REFUNDED`.
- Added migration/bootstrap constraint update for deposit status consistency.
- Removed hardcoded local development path from AccountingSchemaGuard.

#### M8H Admin Booking Review
- Added approve booking review checklist modal.
- Added reject booking modal.
- Added admin booking reject endpoint.
- Added reject booking DTO.
- Added safe room release logic after rejected booking.

#### M8I Tenant Booking Waiting Room
- Tenant booking endpoint now includes cancelled/rejected website booking history.
- Tenant booking UI shows admin rejection/cancel reason.
- Tenant waiting-room copy shortened and made action-first.

#### M8J Checkout Request Review
- Added approve checkout request modal.
- Clarified approve request is not final checkout.
- Enforced checkout reject reason minimum 8 characters in backend DTO.
- Improved reject checkout modal copy.

#### M8K Staff/Admin Confirmation
- Staff action copy now emphasizes field report/proof, not final decision.
- Admin ticket close uses final confirmation UX.
- Ticket close requires meaningful final admin note.
- Staff field report review requires meaningful admin note.
- Backend enforces admin note minimum length for sensitive final decisions.

### Verified

```text
M8G:
- Backend build PASS from user local report.
- Manual payment id=6 created journal JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE journaled payment blocked 409.

M8J:
- Backend build PASS from user local report.
- Pending checkout list PASS.
- Short reject reason blocked 400.
- Valid reject PASS.
- Valid approve PASS.
- Already processed request blocked 409.

M8K:
- Backend build PASS from user local report.
- Tickets list PASS.
- Staff field report queue PASS.
- Short final admin note blocked 400.
- Valid ticket close PASS.
```

### Not fully verified yet

```text
M8H/M8I targeted booking runtime smoke and manual UI smoke remain recommended.
Manual browser UI smoke for M8J/M8K remains recommended.
Deposit PARTIAL_REFUND status runtime smoke remains recommended when clean candidate data is available.
```

### Not changed

- No DB reset.
- No production DB mutation.
- No microservices/apps folder.
- No lifecycle rewrite.
- No dark mode.
- Generated Prisma was restored and not committed.

<!-- KOST48_DOCS_SYNC_20260528_M8F_START -->
## 0.0 Latest Current State — M8F Frontend Command Center Safety Belt Sync

```text
Latest generated working package:
- frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
- backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip

Latest pushed backend/source-of-truth commit still referenced by prior docs:
- 1b645de feat(deposit): add tenant deposit ledger foundation

Important status label:
- M7A–M8F are frontend-first package builds, not FULL runtime PASS.
- Frontend build PASS was verified for each batch in container.
- Backend was unchanged for M7A–M8F.
- Runtime/API smoke and manual browser UI smoke are deferred.
- Do not claim FULL PASS until local runtime/API smoke + manual UI smoke pass.
```

### Completed package sequence after M4A

| Batch | Focus | Backend | Verification |
|---|---|---|---|
| M7A | Tenant Portal Action Center Hardening | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8A | Checkout Closure + Deposit Settlement Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8B | Public Room Discovery + Booking Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8C | Payment Review Decision Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8D | Indonesian Readability + CTA Dedup Sweep | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8E | Renew Approval Safety Belt + Ringkas Copy | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8F | Invoice Issue/Cancel + Manual Payment Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |

### Latest product position

```text
KOST48 V5 Command Center now has safety-belt UI coverage across the main business flows:
- Tenant action center and payment proof UX.
- Public booking discovery with first-paid-room-priority copy.
- Admin payment review decision safety.
- Renew approval safety.
- Checkout/deposit settlement safety.
- Invoice issue/cancel/manual payment safety.
- Indonesian readability and CTA dedup rules.
```

### New UX rule locked from user feedback

```text
Orang Indonesia sangat tidak suka baca.
UI KOST48 must be concise, action-first, and not repeat the same explanation.
Repeated links/CTAs in one page should be limited to 1–2 maximum for the same destination/action.
```

Practical rule:
- Card/alert title: 3–7 words.
- Body: 1–2 short lines maximum.
- One primary CTA per block.
- Assistant/priority board should show the top 3 priorities by default.
- Avoid repeating the same warning across banner, card, modal, and footer.
- Use badges, numbers, and clear action labels instead of paragraphs.

### Current honest label

```text
M8F Frontend Command Center Safety Belt Sync = build-verified frontend package set.
Backend = unchanged after M4A for these M7A–M8F frontend safety batches.
Runtime/API smoke = deferred.
Manual UI smoke = deferred.
FULL PASS = not claimed.
```

### Next recommended phase

```text
PLAN M8G Admin Booking Review Safety Belt.
Focus:
- Admin booking review queue safety.
- Booking approval/reject confirmation.
- First-paid room priority explanation for admin.
- Avoid over-reserving rooms from booking-only interest.
- Keep backend unchanged unless missing data is proven.

After M8G, start M9 Targeted Runtime/UI Smoke to validate M7A–M8G locally.
```

### Source-of-truth note

```text
This M8F docs sync supersedes the older M4A-only current-state sections above/below.
Older M4A/V5.29 sections remain as historical record.
For coding, inspect the latest real ZIP/repo first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M8F_END -->

## 2026-05-28 — M7A–M8F Frontend Command Center Safety Belts

### Type

Frontend business-flow safety hardening + Indonesian readability cleanup. Backend unchanged.

### Added / Changed

- Added tenant action-center hardening for stay, invoices, proof upload, deposit copy, and ticket/request state.
- Standardized tenant payment proof UI to JPG/PNG/WebP image files and 2MB max.
- Added checkout final safety and deposit settlement safety copy/calculation.
- Added public booking first-paid safety copy and clearer room availability labels.
- Added payment review risk labels, approve checklist, and stronger reject-note requirement.
- Added readability and CTA dedup utilities.
- Added rule: Indonesian users dislike long copy; UI must be concise and action-first.
- Added renew approval safety checks and human-readable term labels.
- Added invoice issue/cancel/manual payment safety belts.
- Added create invoice frontend validation for empty/invalid invoice data.

### Verified

```text
Frontend build PASS for each generated frontend package M7A through M8F.
Backend unchanged for M7A through M8F.
```

### Not verified yet

```text
Runtime/API smoke deferred.
Manual UI smoke deferred.
FULL PASS not claimed.
```

### Not changed

- No backend mutation in M7A–M8F.
- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle rewrite.
- No payment approval backend rewrite.
- No AutoOps sensitive mutation.
- No dark mode.
- No new dependency.

### Latest packages

```text
frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip
```


<!-- KOST48_DOCS_SYNC_20260528_M4A_START -->
## 0.0 Latest Current State — M4A Deposit Ledger Backend Foundation FULL PASS

```text
Current latest pushed code commit:
1b645de feat(deposit): add tenant deposit ledger foundation

Previous important pushed commits:
9d66c79 docs: sync m3.2 full first-paid runtime uat
296bd8d fix(autoops): harden runtime control panel
dc052a1 feat(tenant): ship my stay guide and autoops control ux
7c8c8e7 feat(accounting): add controlled monthly auto close governance
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
```

### Release status

```text
M3.2 Deep First-Paid Runtime UAT = FULL PASS.
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
M4A frontend = unchanged.
Next recommended phase = PLAN M4B Frontend Deposit Timeline.
```

### M3.2 final runtime lock

```text
BR1 Expired unpaid booking auto-cancel = PASS.
BR2 Pending proof must not auto-cancel = PASS.
BR3 Rejected proof after deadline auto-cancel = PASS.
BR4 Orphan RESERVED room auto-release = PASS.
BR5 Pure first-paid-wins competitor-unpaid scenario = PASS.
BR6 AutoOps must not approve payment = PASS.
BR7 AutoOps must not approve renew = PASS.
BR8 AutoOps must not final checkout = PASS.
BR9 AutoOps must not refund/deduct deposit = PASS.
```

BR5 pure runtime evidence:
```text
Stay A winner id=18 remained ACTIVE.
Payment submission A id=6 became APPROVED.
Invoice A id=30 became PAID.
Room G2-004 became OCCUPIED with activeStayId=18.
Competing unpaid Stay B id=19 became CANCELLED.
Room did not move to unpaid booking.
Cleanup returned Room G2-004 to AVAILABLE with activeStayId=null and currentStay=null.
```

### M4A runtime UAT result

| Area | Result | Evidence summary |
|---|---|---|
| Schema/table application | PASS | `TenantDepositLedgerEntry` table created via additive `prisma db push`, no DB reset. |
| Backend build | PASS | User local build reported successful before commit/push. |
| Summary endpoint | PASS | `GET /api/deposit-ledger/summary` returned basis `M4_DEPOSIT_LEDGER_SUMMARY`. |
| Reconciliation-lite endpoint | PASS | `GET /api/deposit-ledger/reconciliation-lite` returned `ready=true`, `mismatchCount=0`. |
| Backfill dry-run | PASS | `POST /api/deposit-ledger/backfill/dry-run` returned `dryRun=true` and did not mutate historical data. |
| Payment approval hook | PASS | Approved booking payment created `PAYMENT_RECEIVED` ledger entry for deposit amount. |
| Deposit settlement hook | PASS | Full refund settlement created `REFUND` ledger entry and reduced ledger held balance to zero. |
| Cleanup | PASS | Test stay/payment/invoice/ledger entries removed; Room G2-005 returned AVAILABLE. |
| Frontend | UNCHANGED | M4A was backend-first only. |

### M4A verified behavior

```text
Created runtime UAT IDs:
- Stay test: 20
- Tenant test: 21
- Room: 5 / G2-005
- Invoice: 31
- PaymentSubmission: 7
- InvoicePayment: 5
- TenantDepositLedgerEntry: 1 PAYMENT_RECEIVED, 2 REFUND

Payment hook:
- PAYMENT_RECEIVED
- direction=INCREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=500000
- sourceType=PAYMENT_SUBMISSION
- sourceId=7

Settlement hook:
- REFUND
- direction=DECREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=0
- sourceType=STAY_DEPOSIT_SETTLEMENT
- sourceId=20:REFUND

After cleanup:
- Room G2-005 status=AVAILABLE
- activeStayId=null
- currentStay=null
- deposit-ledger summary increaseRupiah=0
- deposit-ledger summary decreaseRupiah=0
- recentEntries=[]
```

### M4A implementation summary

```text
Added backend module:
- src/modules/deposit-ledger/deposit-ledger.module.ts
- src/modules/deposit-ledger/deposit-ledger.controller.ts
- src/modules/deposit-ledger/deposit-ledger.service.ts
- src/modules/deposit-ledger/dto/deposit-ledger-query.dto.ts

Modified backend:
- prisma/schema.prisma
- src/app.module.ts
- src/common/enums/app.enums.ts
- src/modules/payment-submissions/payment-submissions.module.ts
- src/modules/payment-submissions/payment-submissions.service.ts
- src/modules/stays/stays.module.ts
- src/modules/stays/stays.service.ts
```

### Current honest label

```text
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
Do not claim M4B until frontend surfaces are implemented and manually/UI smoked.
```

### Next recommended step

```text
PLAN M4B Frontend Deposit Timeline.
Focus:
- Admin Stay Detail / Finance tab deposit summary + timeline.
- Tenant My Stay deposit card with tenant-friendly microcopy.
- Owner/Finance deposit ledger drilldown.
- No backend mutation unless a missing read shape is proven.
```

### Source-of-truth note

```text
This section supersedes the older M3.2-only and V5.29-K current-state sections below.
Older sections remain as historical record.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M4A_END -->



## 2026-05-28 — M4A Deposit Ledger Backend Foundation

### Added

- Added `TenantDepositLedgerEntry` model.
- Added deposit ledger entry types and directions.
- Added Deposit Ledger backend module.
- Added endpoints:
  - `GET /api/deposit-ledger/stays/:stayId`
  - `GET /api/deposit-ledger/tenants/:tenantId`
  - `GET /api/deposit-ledger/summary`
  - `GET /api/deposit-ledger/reconciliation-lite`
  - `POST /api/deposit-ledger/backfill/dry-run`
- Added payment approval hook for `PAYMENT_RECEIVED`.
- Added deposit settlement hook for refund/deduction/forfeit timeline events.

### Verified

- Backend build PASS from user local report.
- Summary endpoint PASS.
- Reconciliation-lite endpoint PASS.
- Backfill dry-run PASS.
- New deposit payment approval creates ledger entry PASS.
- Full refund settlement creates ledger entry PASS.
- Cleanup returns test room and ledger summary to clean state PASS.

### Not changed

- Frontend unchanged.
- Stay deposit snapshot fields remain.
- Payment/renew/checkout lifecycle rules unchanged.
- Historical deposit backfill remains dry-run only.


## 0.0 Latest Current State — V5.29-K Controlled Monthly Auto-Close Governance PASS + Pushed

```text
Current latest pushed commit:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Previous latest pushed commits:
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
51eba86 feat(accounting): add statement command center finance cockpit
286e512 fix(accounting): block manual edits in closed period governance

Release status:
- V5.29-H/I/J accounting invoice lifecycle and period governance were verified before K.
- V5.29-K Controlled Monthly Auto-Close Governance is built, UAT-smoked, committed, and pushed.
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked with 403 PASS.
- Owner close without reason blocked with 400 PASS.
- Generated Prisma was restored and was not committed.
- Commit 7c8c8e7 is pushed to origin/main.

V5.29-K verified behavior:
- Auto-close policy basis is PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K.
- Mode is AUTO_MONTHLY_PREVIOUS_PERIOD.
- Auto-close targets only the previous month, not the current month.
- Target period must already exist and must be OPEN.
- Period close readiness must return canPost=true.
- Closing preview must be balanced before posting.
- If blocker exists or target period is missing, system skips safely and does not force close.
- Owner can manually trigger auto-close through /api/accounting/period-close/auto-run.
- AutoOps run includes accountingAutoClose result.
- Admin cannot trigger auto-close manually.
- Manual period close requires a closing reason of at least 8 characters.

Known honest limitation:
- Actual auto-close closed=true scenario is deferred because target period 2026-04 did not exist in current UAT data.
- The verified K result is controlled safe-skip + governance/role/validation PASS, not actual previous-period closing PASS.
- Manual UI smoke remains user-side visual verification if needed.

Product decision locked:
- KOST48 may use automatic monthly period close, but only as controlled automation.
- Auto-close is not blind automation.
- It must be blocker-aware, auditable, balanced, role-safe, and reversible only through official reopen workflow.
- Reopen remains Owner-only and reason-required.
```

### Source-of-truth note

```text
This section supersedes older V5.29-C/D/E/H/I/J planning sections below.
Older sections remain as historical record only.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```

## 2026-05-27 — V5.29-K Controlled Monthly Auto-Close Governance

### Type

Backend accounting governance + AutoOps integration + frontend accounting UI polish.

### Added / Changed

- Added controlled monthly auto-close policy endpoint.
- Added Owner manual auto-close runner.
- Integrated accounting auto-close into AutoOps result.
- Auto-close targets previous month only.
- Auto-close skips safely if target period is missing, not OPEN, readiness is blocked, or preview is unbalanced.
- Manual period close now requires a reason/note of at least 8 characters.
- ADMIN manual auto-close is blocked.
- Owner-facing Accounting Setup UI now explains controlled monthly auto-close.
- Period close UI copy now clarifies manual close vs automatic monthly close.
- Added frontend API support for auto-close policy and manual auto-run.

### Verified

```text
Backend build PASS from user local report.
Frontend build PASS from user local report.
Runtime UAT:
- GET /api/accounting/period-close/auto-policy PASS.
- POST /api/accounting/period-close/auto-run as OWNER PASS safe-skip.
- POST /api/auto-ops/run includes accountingAutoClose PASS safe-skip.
- POST /api/accounting/period-close/auto-run as ADMIN returns 403 PASS.
- POST /api/accounting/period-close/post without reason returns 400 PASS.

Commit pushed:
7c8c8e7 feat(accounting): add controlled monthly auto close governance
```

### Not Changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No payment/stay/renew/checkout lifecycle rewrite.
- No generated Prisma commit.
- No microservices/apps folder.
- No blind auto-close.
- No automatic creation of missing accounting periods.

### Carry-forward

```text
Actual auto-close closed=true UAT remains deferred until previous OPEN period exists and readiness/preview are complete.
Next recommended product track: M1 Tenant My Stay Guide Full Audit.
Alternative accounting track: V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning.
```


## 2026-05-27 — V5.29-C/D Lifecycle Data Integrity + Renew/Checkout UTC Hotfix

### Type

Backend lifecycle/data integrity hotfix + frontend renew approval cache/date handling.

### Added / Changed

- Added strict deposit partial refund guard.
- Preserved explicit `agreedRentAmountRupiah=0`.
- Corrected stay `invoiceCount` vs `openInvoiceCount`.
- Ensured DRAFT invoice counts as open.
- Passed renew request `requestedTerm` into renew execution.
- Ensured renewal invoice remains `ISSUED` after approve.
- Corrected checkout notification primary date to requested checkout date.
- Stabilized checkout request list response shape for frontend `data.items`.
- Added/confirmed frontend cache invalidation after approve renew.
- Reworked lifecycle/finance date helpers to use UTC-safe calendar logic.
- Fixed renew approval H-1 drift for stay planned checkout and invoice period dates.
- Converted frontend renew approval date input to full ISO UTC.
- Cleaned tenant blocker copy so raw enum `(ISSUED)` no longer leaks.

### Verified

```text
Backend build PASS from user local report.
Frontend build PASS from user local report.
Runtime UAT PASS:
- B1 deposit invalid/valid partial refund
- B2 rent 0
- B3 invoice count/open count/DRAFT open
- B4 renew requestedTerm
- B5 checkout UTC + notification
- B7 checkout list shape
- F2 frontend cache invalidation
- HOTFIX3 renew UTC date precision
- HOTFIX4 tenant blocker microcopy

Commit pushed:
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
```

### Not Changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle rewrite.
- No generated Prisma commit.
- No microservices/apps folder.

### Carry-forward

```text
V5.29-E Admin Check-In + Invoice Hygiene Fix remains next:
- F1 check-in pricing terms,
- B6 DRAFT invoice cancellation reversal hygiene.
```

## 2026-05-26 — V5.29-B9A Statement Command Center Finance Cockpit

### Type

Frontend accounting/finance UX hardening. Backend unchanged.

### Added / Changed

- Added owner-readable Finance → Laporan Keuangan cockpit.
- Added statement cards for Trial Balance, Neraca, Laba Rugi, Aset, Period Close, and Data Quality.
- Added Accounting Data Quality Panel.
- Added Period Close / Reopen / Re-close Timeline.
- Added Journal Audit Trail Panel.
- Cleaned user-facing finance wording from technical phase labels.
- Renamed owner finance navigation from Setup Accounting to Laporan Keuangan.

### Verified

```text
Frontend build PASS.
Runtime accounting API smoke PASS.
Manual UI smoke PASS.
Commit pushed:
51eba86 feat(accounting): add statement command center finance cockpit
```

### Not Changed

- Backend unchanged.
- No schema change.
- No DB reset.
- No payment/stay/renew/checkout lifecycle rewrite.
- No generated Prisma commit.

---

## 2026-05-26 — V5.29-B9B Copy Consistency Cleanup

### Type

Backend/frontend copy consistency cleanup for accounting readiness and statement surfaces.

### Added / Changed

- Removed stale B1/B2/no-auto-posting-style warning from readiness response when ledger is ready.
- Readiness warning now says ledger accounting is ready to read while still requiring owner data-quality review.
- Trial Balance formalStatementReady now aligns with balanced ledger state.
- Frontend accounting copy cleaned from technical wording like Auto Journal Lite / Guarded / old phase labels.

### Verified

```text
Runtime accounting API smoke PASS from user log:
- readiness warnings current,
- Trial Balance balanced and formalStatementReady=true,
- Balance Sheet ready/formalStatementReady/balanced,
- P&L formalStatementReady=true and excludes closing/reversal,
- Period Close CLOSED with JE-CLOSE-2026-05-V2,
- unmapped operational=0,
- draft journal=0,
- unbalanced posted journal=0,
- depreciation posted,
- asset alignment safe.
```

### Pending

```text
Local backend build / frontend build / commit / push confirmation still required unless user reports completion.
```

---

## 2026-05-26 — Critical Lifecycle/Data Integrity Audit Accepted

### Type

Planning / accepted bug backlog.

### Added

- B1 CRITICAL deposit partial refund guard.
- B2 CRITICAL rent 0 nullish coalescing fix.
- B3 HIGH invoiceCount total vs openInvoiceCount filtered.
- B4 HIGH requestedTerm renew approve.
- F1 HIGH check-in pricing terms.
- B5 MEDIUM checkout notification requested date.
- B6 MEDIUM DRAFT invoice cancellation reversal hygiene.
- B7 MEDIUM checkout response consistency.
- F2 LOW renew approve cache invalidation.

### Next target

```text
V5.29-C Critical Lifecycle/Data Integrity Hotfix
```


## 2026-05-26 — V5.28-B8 Closed Period Governance + Reopen/Reversal

### Type

Backend accounting governance + frontend period close UI hardening.

### Added / Changed

- Added `JournalSourceType.CLOSING_REVERSAL`.
- Added reopen metadata fields to `AccountingPeriod`.
- Added period reopen preview endpoint.
- Added Owner-only period reopen endpoint.
- Reopen creates reversal journal instead of deleting/editing closing journal.
- Re-close after reopen creates next version, e.g. `JE-CLOSE-2026-05-V2`.
- Manual status mutation on `AccountingPeriod` is blocked.
- Journal draft/posting into CLOSED period is blocked unless controlled by governance workflow.
- P&L excludes `CLOSING_ENTRY` and `CLOSING_REVERSAL` by default.
- PeriodClosePanel now supports closed period, reopen preview, and reopen flow.

### Verified

```text
Reopen preview balanced.
Reopen/reversal succeeded.
AccountingPeriod returned OPEN.
Re-close preview balanced.
Re-close post created JE-CLOSE-2026-05-V2.
Duplicate close after re-close blocked.
Trial Balance after re-close balanced: Debit 34.170.000 = Kredit 34.170.000.
Balance Sheet after re-close balanced: Assets 29.915.000 = Liabilities+Equity 29.915.000.
P&L remained operational/readable with net -85.000.
Commit pushed:
286e512 fix(accounting): block manual edits in closed period governance
```

### Not Changed

- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.
- No production mutation.
- No generated Prisma commit.
- No microservices/apps folder.

---

## 2026-05-26 — V5.27-B7 Period Close + Retained Earnings

### Type

Backend accounting close foundation + frontend Owner period close workflow.

### Added / Changed

- Added `JournalSourceType.CLOSING_ENTRY`.
- Added close metadata fields to `AccountingPeriod`.
- Added period close readiness endpoint.
- Added period close preview endpoint.
- Added Owner-only period close post endpoint.
- Closing journal moves revenue/expense/COGS result into Retained Earnings.
- Balance Sheet after close moves closed period result into Retained Earnings.
- P&L operational report excludes closing entries by default.

### Verified

```text
Readiness ready=true.
Preview closing journal balanced.
Post close created JE-CLOSE-2026-05.
AccountingPeriod status CLOSED.
Duplicate close blocked.
Trial Balance remained balanced.
Balance Sheet remained balanced.
P&L stayed readable after close.
Commit pushed:
ff2008f feat(accounting): add period close retained earnings workflow
```

### Not Changed

- No reopen in B7.
- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.


## 2026-05-24 — V5.23-A Admin IA + Finance Add-on Revenue Foundation

### Type

Frontend IA/product patch. Backend unchanged.

### Added / Changed

- Admin sidebar restored with final 5-menu structure:
  - Dashboard
  - Stays & Tenant
  - Finance
  - Staff & Tiket
  - Kamar & Stok
- Removed admin top workspace tabs as primary navigation.
- Dashboard repositioned as cross-menu Command Center.
- Finance IA expanded to include:
  - Tagihan
  - Review Pembayaran
  - Voucher WiFi
  - Pendapatan Tambahan
  - Pengeluaran
  - Riwayat Pembayaran
- Existing `WifiSale` placed as voucher WiFi revenue stream.
- Added Finance placeholder/plan page for future ancillary revenue.
- Expanded expense UI/category copy for kos business context.
- Expanded tenant ticket categories for kos-specific issue reporting.

### Not Changed

- Backend unchanged.
- No schema migration.
- No DB reset.
- No formal accounting ledger yet.
- No Balance Sheet claim.

### Verification

- Source ZIP generated.
- Touched-file syntax checks passed.
- Full frontend build still requires local environment with dependencies.
- Runtime/API smoke still required before PASS.

---

## 2026-05-24 — V5.23-B Accounting & Balance Sheet Foundation Planning

### Type

Planning direction / docs sync.

### Added

- Next official planning track:
  - Accounting Readiness
  - OPEX / COGS / CAPEX
  - AncillaryProduct / AncillarySale
  - CashAccount
  - ChartOfAccount
  - JournalEntry / JournalLine
  - Asset Register
  - Depreciation
  - Opening Balance
  - Balance Sheet readiness
- Clarified that existing finance is operational summary, not formal accounting.

### Not Allowed

- Do not fake Balance Sheet.
- Do not treat deposit as revenue.
- Do not reset DB.
- Do not force full double-entry in one patch without plan.
- Do not create standalone Reports menu until finance/reporting model is concrete.


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Type

Backend + frontend business-rule patch, AutoOps, payment UX, urgent UI, and docs sync.

### Added

- AutoOps module for deterministic business automation.
- Fast operational deadlines:
  - booking/payment SLA 3 hours,
  - payment review urgent 1 hour,
  - payment review escalate 3 hours,
  - payment review max 6 hours,
  - invoice overdue 24 hours,
  - old late tenant vacate rule 3 hours.
- First-paid room priority contract.
- One-step tenant payment proof flow: `Bayar & Kirim Bukti`.
- Auto-cancel expired unpaid booking.
- Auto-release orphan RESERVED rooms.
- Urgent UI emphasis for special/high-risk cases.
- Dedup direction for repeated assistant/alert copy.

### Changed

- Booking/minat no longer means room fully locked.
- Tenant/public copy now warns that room is secured only after payment is valid and approved.
- Renew/no-debt copy is more explicit.
- Admin/Owner dashboards should prioritize business blockers, not duplicated decorative alerts.

### Not Allowed

- AutoOps must not approve payment.
- AutoOps must not approve renew.
- AutoOps must not final checkout.
- AutoOps must not refund/deduct deposit automatically.
- AutoOps must not create official inventory movements.

### Verification

- Source ZIP generated.
- Static ZIP integrity/source generation completed during patch.
- Local build/UAT still required before FULL PASS.

---

## 2026-05-23 — V5.19 Renew Meter Utility Checkpoint

### Type

Backend lifecycle hardening + frontend renew/payment/checkout UX.

### Added / Fixed

- Renew approval requires electricity/water meter checkpoint.
- Renewal invoice includes rent + electricity + water.
- Meter delta is calculated from previous reading.
- Checkout remains blocked by open invoice.
- Staff removed from sensitive lifecycle actions.
- Runtime UAT from user confirmed:
  - renew without meter fails,
  - renew with meter succeeds,
  - renewal invoice has 3 lines,
  - checkout blocked while invoice open,
  - final checkout succeeds after clear,
  - room returns AVAILABLE,
  - deposit refund succeeds.

### Verification

- Backend runtime UAT PASS from local user log.
- Frontend build was user-confirmed PASS for V5.19B/C before V5.20 work.

---

## 2026-05-22 — V5.17-D Routine Work Cards + Inventory/Staff UX Push

### Type

Frontend staff workspace UX polish.

### Added / Updated

- Restored staff checklist harian/mingguan/bulanan as professional work cards.
- Added progress-style checklist summary without new chart dependency.
- Improved assistant strip so it reads active work/checklist state.
- Improved inventory health UX:
  - stock habis/menipis/aman is computed from quantity/minimum stock.
  - staff no longer manually chooses stock health status.
- Improved staff room/card UX.
- Improved staff report modal readability and progressive flow.
- Improved admin staff field report decision UI.
- Added `frontend/src/utils/inventoryHealth.ts`.

### Verified

- User manual check: “Sudah saya cek sip bagus pass.”
- Commit pushed:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
```

### Not Changed

- Backend unchanged for V5.17-D.
- No new chart dependency.
- No dark mode.
- No DB reset.
- Generated Prisma noise restored and not committed.

---

## 2026-05-22 — V5.17-C Inventory Intelligence

### Type

Frontend rule-intelligence UX.

### Changed

- Inventory stock health is now treated as computed information from `qtyOnHand/minQty`.
- Staff warehouse report no longer treats “stok habis/menipis” as manual condition input.
- Warehouse flow is split:
  - physical condition report,
  - stock health warning,
  - restock/action suggestion.
- Assistant highlights stock risk and restock blocker.

### Not Changed

- No backend schema change.
- No official InventoryMovement mutation by staff.

---

## 2026-05-22 — V5.17-B Clean Blue Staff UI + On-Flow Staff/Admin Repair UX

### Type

Frontend UI/UX polish.

### Changed

- Staff room cards became clickable full cards.
- Removed duplicate “Buka” / “Perlu cek” actions when they navigated to the same place.
- Cleaner blue design direction applied.
- Font weights reduced to improve readability.
- Low-contrast text/badge issues reduced.
- Admin review decision input changed from plain select to more on-flow choices.

### Not Changed

- No backend change.
- No new UI dependency.

---

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

- No frontend source change required for V5.16-G itself.
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


## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Docs Lock

### Type

Docs/context sync only. No backend/frontend source patch in this docs package.

### Added

- Consolidated backend audit findings from ChatGPT and Cline/DeepSeek.
- Clean backend source snapshot reference: `backend_latest_for_accounting_act_CLEAN.zip`.
- Pre-ACT verdict: READY FOR ACT B1 with additive-only scope.
- B1 Accounting Foundation locked scope: COA, CashAccount, AccountingPeriod, OpeningBalance, JournalEntry/Line, readiness, default COA seed, trial balance draft, unmapped transaction scanner.
- Allowed and forbidden file lists for ACT B1.
- Report honesty rule: existing reports must be marked operational approximation.
- Roadmap correction: TenantDepositLedger is deferred; Stay deposit fields must not be removed/deprecated yet.
- New-chat execution prompt file for the next ChatGPT ACT session.

### Not Changed

- No backend source code changed by this docs sync.
- No frontend source code changed by this docs sync.
- No schema migration applied.
- No DB reset.
- No auto-posting implemented.
- No payment/stay/checkout/renew flow changed.

### Verification

```text
Docs package generated only.
Code build/smoke not applicable to this docs sync.
Next ACT must run backend build and API smoke before claiming PASS.
```

## 2026-05-25 — V5.24-C Admin UI Critical Workflow Hardening

### Type

Frontend admin UI/UX hardening. Backend unchanged.

### Added / Changed

- GlobalSearch restored for admin topbar.
- Dashboard ticket DONE action hardened so it is no longer misleading.
- StaysPage filter behavior corrected so ALL is not hardcoded ACTIVE.
- Dashboard dead code/copy partially cleaned.
- AncillaryRevenuePage changed from roadmap-heavy future list into a more operational finance page.

### Verification

- API smoke confirmed:
  - `GET /api/tickets?limit=20`
  - `GET /api/public/rooms`
- Commit pushed:
  - `cb93fe6 fix(admin): harden dashboard search tickets and finance ux`

### Not Changed

- No backend lifecycle/payment/renew/checkout rewrite.
- No schema change.
- No generated Prisma committed.
- No B3 auto-journal.

---

## 2026-05-25 — V5.24-B2A/B/B2C Accounting Setup

### Type

Backend + frontend accounting setup hardening.

### Added / Changed

- Owner Accounting Setup UI.
- Cash/bank account setup surface.
- Accounting period setup.
- Opening balance draft/post workflow.
- Opening balance posting creates `JournalEntry` with `sourceType=OPENING_BALANCE`.
- Trial Balance avoids double-counting opening balance.
- Duplicate period/cash/opening balance messages hardened.
- Draft opening balance can be voided.
- POSTED opening balance remains protected from void until reversal plan exists.

### Verified

- COA seeded.
- Cash account created.
- Accounting period created.
- Opening balance posted.
- `JE-OPENING-1` created.
- Trial Balance balanced: Debit 30.000.000 = Kredit 30.000.000.
- Balance Sheet guard reads opening balance.
- Draft duplicate voided.
- Commits pushed:
  - `2308f17 feat(accounting): add opening balance setup workflow`
  - `c04aec5 fix(accounting): harden setup workflow messages`
  - `eb198b2 fix(accounting): allow voiding draft opening balances`

### Not Changed

- No invoice/payment/expense/stay auto-posting yet.
- No TenantDepositLedger yet.
- No asset/depreciation yet.
- No destructive schema change.