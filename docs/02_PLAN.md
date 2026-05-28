# KOST48 V5 — Execution Plan
**Versi:** 2026-05-28 M4A Deposit Ledger Backend Foundation FULL PASS Sync



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



## A1. Next Active Plan — M4B Frontend Deposit Timeline

### Goal

```text
Make deposit history visible and understandable in admin, tenant, and owner finance surfaces.
M4B is frontend-first on top of M4A read endpoints.
```

### Target surfaces

- Admin Stay Detail / Finance tab:
  - Deposit summary card.
  - Deposit timeline.
  - Snapshot vs ledger warning if mismatch exists.
  - Direct CTA to process deposit only when current lifecycle rules allow it.

- Tenant My Stay:
  - Tenant-friendly deposit card.
  - Copy: “Deposit kamu sudah diterima”, “Deposit sedang ditahan”, “Deposit dikembalikan”, “Deposit dipotong”.
  - Avoid backend words: ledger, liability, settlement enum, mutation.

- Owner/Finance:
  - Lightweight deposit drilldown.
  - Total deposit received/refunded/held from ledger.
  - Reconciliation warning where snapshot and ledger differ.

### M4B guardrails

- No schema change unless a missing read shape is proven.
- No new backend mutation.
- Do not alter payment approval, checkout final, renew, or room lifecycle.
- Do not expose deposit ledger to staff.
- Do not show fake historical entries as real timeline.
- Historical entries from before M4A must be labelled as unavailable or backfill candidate, not invented.

### M4B verification

- Frontend build PASS.
- Admin stay detail shows deposit summary/timeline.
- Tenant My Stay shows deposit status in friendly Indonesian.
- Owner finance drilldown reads summary/reconciliation-lite.
- Existing deposit process modal still works.
- M4A endpoints still smoke PASS.


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

## 0.1 Active Timeline — After V5.29-K PASS + Push

### Completed: V5.29-H/I/J Accounting Invoice Lifecycle + Period Governance

Status: PASS + pushed before K as `0285dbe`.

Completed scope:
- Invoice issue/create-with-lines-and-issue no longer silently swallows accounting posting failure.
- Issue path is atomic.
- Invoice response exposes accounting metadata.
- Readiness is date-aware and detects CLOSED current posting period.
- Period reopen by ID is Owner-only, auditable, and creates posted reversal journal.
- Cancel journaled invoice creates controlled reversal journal.
- ISSUED invoice must not exist silently without accounting journal when formal readiness is true.

### Completed: V5.29-K Controlled Monthly Auto-Close Governance

Status: PASS for build, safe-skip, role guard, validation guard, AutoOps integration, commit and push.

Commit:
```text
7c8c8e7 feat(accounting): add controlled monthly auto close governance
```

Completed scope:
- Auto-close policy endpoint.
- Owner manual auto-run endpoint.
- AutoOps integration with accountingAutoClose.
- Safe-skip if target previous period is missing or blocked.
- Admin manual auto-run blocked 403.
- Manual close without reason blocked 400.
- UI exposes controlled monthly auto-close card and clear owner-facing copy.
- Generated Prisma restored before commit.

Deferred:
```text
Actual auto-close closed=true scenario remains deferred until a previous AccountingPeriod exists, is OPEN, and readiness/preview are complete.
```

### Recommended next: M1 Tenant My Stay Guide Full Audit

Why:
- The accounting governance runway is now stable enough.
- Critical lifecycle/data integrity bugs were fixed before tenant work.
- Tenant side can now be audited on top of safer renew/checkout/invoice/accounting rules.

Alternative next if user stays on accounting:
```text
V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning
```

V5.29-L should not patch first. It should PLAN and UAT:
- Create or identify a previous OPEN accounting period.
- Confirm readiness canPost=true.
- Confirm preview balanced.
- Run owner auto-close and verify closed=true.
- Verify CLOSING_ENTRY journal.
- Verify duplicate auto-close skips/blocks safely.
- Decide whether annual hard close is needed as separate future workflow.


## 0.2 New Chat Prompt — Start After V5.29-K

```text
Kamu adalah command center + senior full-stack direct patcher untuk project KOST48 Surabaya V5.

Bahasa kerja: Indonesia.
Environment user: Windows + VS Code + PowerShell.
Semua command wajib PowerShell.
API lokal: http://localhost:3000/api
Frontend lokal: http://localhost:5173

Project root:
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle

Stack:
Backend NestJS + Prisma + PostgreSQL.
Frontend React + Vite + TypeScript + React-Bootstrap + TanStack Query.

SOURCE OF TRUTH:
Baca 7 docs aktif:
docs/00_GROUND_STATE.md
docs/01_CONTRACTS.md
docs/02_PLAN.md
docs/CHECKLIST.md
docs/03_DECISIONS_LOG.md
docs/04_JOURNAL.md
docs/CHANGELOG.md

Jika docs dan code berbeda, tulis “docs/code out of sync” dan ikuti code asli.

CURRENT LATEST RELEASE:
V5.29-K Controlled Monthly Auto-Close Governance sudah PASS untuk build, safe-skip, role guard, validation guard, AutoOps integration, commit, dan push.

Latest pushed commit:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Verified:
- Backend build PASS dari user local.
- Frontend build PASS dari user local.
- GET /api/accounting/period-close/auto-policy PASS.
- Owner POST /api/accounting/period-close/auto-run PASS safe-skip karena period 2026-04 belum dibuat.
- POST /api/auto-ops/run includes accountingAutoClose PASS safe-skip.
- ADMIN POST /api/accounting/period-close/auto-run blocked 403 PASS.
- Owner close period tanpa reason blocked 400 PASS.
- Generated Prisma restored sebelum commit.
- Commit pushed ke origin/main.

Important honest limitation:
Actual auto-close closed=true belum terbukti karena previous target period 2026-04 belum ada.
Jangan klaim actual-close FULL PASS sampai ada previous OPEN period, readiness canPost=true, preview balanced, dan CLOSING_ENTRY journal benar-benar dibuat.

Latest business decision:
Auto-close bulanan boleh, tetapi controlled:
- previous month only,
- target period must exist,
- target period must be OPEN,
- readiness canPost=true,
- preview balanced,
- skip if blocked,
- Owner manual trigger allowed,
- Admin manual trigger forbidden,
- reopen remains Owner-only and reason-required.
No blind automation.

MODE:
Default PLAN dulu.
ACT hanya jika user bilang ACT / YOLO / patch / implementasikan.
PLAN = audit + rencana, tanpa patch.
ACT = patch ZIP/code langsung dan output ZIP final bila user upload ZIP.

NEXT RECOMMENDED PHASE:
M1 Tenant My Stay Guide Full Audit.

M1 focus:
- tenant portal home,
- My Stay page,
- invoice list/detail,
- payment proof upload,
- payment under review UX,
- renew request flow,
- checkout request flow,
- tenant tickets/complaints,
- notifications/payment urgency chip,
- tenant language/microcopy,
- blocked flows and assistant cards,
- API contracts used by tenant pages,
- role guard/navigation consistency.

Tenant product direction:
Tenant = My Stay Guide.
Tenant portal must answer:
- Saya tinggal di kamar apa?
- Masa sewa saya sampai kapan?
- Tagihan apa yang harus saya bayar?
- Bukti pembayaran saya sedang diproses atau sudah diterima?
- Apakah saya bisa ajukan perpanjangan?
- Apakah saya bisa ajukan keluar?
- Apakah ada ticket/request yang masih menunggu?
- Apa aksi paling penting sekarang?

Tenant wording must use:
Tagihan, Masa sewa, Akhir masa sewa, Ajukan perpanjangan, Ajukan keluar,
Bukti pembayaran kamu sedang diperiksa, Tidak perlu upload ulang,
Menunggu keputusan admin, Hubungi admin.

Avoid tenant-facing:
stay, periodEnd, checkout request, ISSUED, PENDING_REVIEW, DRAFT,
payment submission, lifecycle, mutation, enum/backend terms.

Locked business guards:
- Renewal invoice must be ISSUED.
- Checkout final blocked by any invoice not PAID/CANCELLED.
- DRAFT invoice counts as open.
- complete() must not auto-create final utility invoice.
- Payment approval remains core monolith and atomic.
- Renew approval/execution remains core monolith.
- Room occupancy/status writes remain core monolith.
- Admin approve checkout request does not final checkout.
- Tenant can create/view requests/submissions only.
- Staff must not mutate finance/lifecycle sensitive flows.
- AI/assistant never mutates data autonomously.

Alternative next if user wants accounting:
PLAN V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning.
Do not patch first. Plan UAT:
- create/identify previous OPEN period,
- confirm readiness canPost=true,
- confirm close preview balanced,
- run owner auto-close,
- verify closed=true,
- verify CLOSING_ENTRY journal,
- verify duplicate auto-close safe behavior,
- decide if annual hard close is needed later.

Required PLAN output:
A. Executive summary
B. Current source verification state
C. Current frontend/backend map for target phase
D. Gap analysis
E. Exact files to inspect/touch
F. Backend unchanged/needed decision
G. Risks/unknowns
H. PowerShell UAT commands
I. ACT plan if user says YOLO

Hard rules:
- PowerShell only.
- Invoke-RestMethod only for API tests, not curl.
- No DB reset unless user explicitly asks.
- No production DB mutation.
- No schema change without explicit approval.
- No generated Prisma commit unless schema/generate scope is explicitly approved.
- No apps/ folder, no microservices split, no service-to-service HTTP.
- No dark mode.
- No new markdown docs unless user asks.
- Do not claim PASS without build + runtime/UAT/manual verification relevant to scope.
```


## 0.1 Active Timeline — After V5.29-C/D PASS

### Completed: M0.5 V5.29-C Critical Lifecycle/Data Integrity Hotfix

Status: PASS + pushed as part of `f6af6fc`.

Completed scope:
- B1 Deposit partial refund guard.
- B2 agreedRentAmountRupiah zero-value fix.
- B3 invoiceCount vs openInvoiceCount fix.

### Completed: M0.6 V5.29-D Renew/Checkout Consistency Hotfix

Status: PASS + pushed as part of `f6af6fc`.

Completed scope:
- B4 requestedTerm passed into renew approve.
- B5 checkout requested date notification.
- B7 checkout-requests response consistency.
- F2 approve renew cache invalidation.
- HOTFIX2 checkout UTC date precision.
- HOTFIX3 renew UTC date precision.
- HOTFIX4 tenant blocker microcopy cleanup.

### Current next: M0.7 V5.29-E Admin Check-In + Invoice Hygiene Fix

Scope:
- F1 Check-in wizard exposes all backend pricing terms.
- B6 DRAFT invoice cancellation skips reversal and does not swallow real journaled reversal errors.

Likely files:
```text
frontend/src/pages/stays/ManualCheckInWizard.tsx
frontend/src/constants/* or existing pricing-term option source
backend/src/modules/invoices/invoices.service.ts
backend/src/modules/accounting/* only if reversal call path requires inspection
```

Required UAT for V5.29-E:
- Admin can choose BIWEEKLY in manual check-in if backend enum supports it.
- Admin can choose semester term using exact backend spelling.
- Admin can choose YEARLY.
- Payload sends backend enum value, not display label.
- DRAFT invoice cancellation succeeds without calling reversal.
- Journaled/issued invoice cancellation either posts controlled reversal or fails visibly if reversal fails.
- Backend build PASS.
- Frontend build PASS if frontend touched.
- No DB reset.
- No generated Prisma commit.

### After V5.29-E

- M1 Tenant My Stay Guide Full Audit.
- M2 Tenant Payment/Renew/Checkout UX Hardening.
- M3 AutoOps + First-Paid Runtime UAT.

## 0.1 Active Timeline — V5.29-C to Production Readiness

### M0 — Finish B9B release hygiene

Goal:
- Complete B9B build/commit/push if not already done locally.

Checklist:
- backend build PASS if backend touched,
- frontend build PASS if frontend touched,
- runtime accounting API smoke PASS,
- generated Prisma restored,
- commit/push confirmed,
- git status clean.

### M0.5 — V5.29-C Critical Lifecycle/Data Integrity Hotfix

Scope:
- B1 Deposit partial refund guard.
- B2 agreedRentAmountRupiah zero-value fix.
- B3 invoiceCount vs openInvoiceCount fix.

Why before tenant work:
- Tenant/admin UI must not read or produce wrong lifecycle/finance data.

Likely backend files:
```text
backend/src/modules/stays/stays.service.ts
backend/src/modules/stays/stays-query.service.ts
```

Required UAT:
- PARTIAL_REFUND under-processing rejected.
- PARTIAL_REFUND exact deduction+refund accepted.
- rent 0 create stay remains 0.
- missing rent still resolves room rent.
- invoiceCount total and openInvoiceCount filtered are distinct.

### M0.6 — V5.29-D Renew/Checkout Consistency Hotfix

Scope:
- B4 requestedTerm passed into renew approve.
- B5 checkout notification uses requestedCheckOutDate.
- B7 checkout-requests response wrapper consistency.
- F2 invalidate admin checkout request cache after approve renew.

Likely files:
```text
backend/src/modules/renew-requests/renew-requests.service.ts
backend/src/modules/stays/stays.service.ts
backend/src/modules/checkout-requests/checkout-requests.service.ts
backend/src/modules/checkout-requests/checkout-requests.controller.ts
frontend/src/pages/stays/StayDetailPage.tsx
frontend/src/api/*
```

Required UAT:
- MONTHLY stay renewed to YEARLY/other requested term uses approved term.
- notification displays requested checkout date.
- checkout request list still renders after response consistency fix.
- approve renew refreshes relevant admin checkout/stay state.

### M0.7 — V5.29-E Admin Check-In + Invoice Hygiene Fix

Scope:
- F1 Check-in wizard exposes all backend pricing terms.
- B6 DRAFT invoice cancellation skips reversal and does not swallow real journaled reversal errors.

Likely files:
```text
frontend/src/pages/stays/ManualCheckInWizard.tsx
frontend/src/constants/*
backend/src/modules/invoices/invoices.service.ts
```

Required UAT:
- admin can choose BIWEEKLY.
- admin can choose SEMESTERLY/SMESTERLY according to real enum.
- admin can choose YEARLY.
- DRAFT cancellation succeeds without reversal.
- journaled cancellation uses controlled reversal or fails visibly if reversal fails.

### M1 — Tenant My Stay Guide Full Audit

Scope:
- tenant portal home,
- My Stay page,
- invoice list/detail,
- payment proof upload,
- renew request,
- checkout request,
- ticket/request state,
- notifications/urgency chip,
- tenant copy and assistant.

Outcome:
- PLAN first with exact files.
- ACT only after user says YOLO/ACT/patch.

### M2 — Tenant Payment/Renew/Checkout UX Hardening

Goal:
- tenant-facing sensitive flows become action-first and tenant-friendly.

Must include:
- Bayar & Kirim Bukti one-step UX,
- no duplicate proof upload when pending review,
- clear renew/checkout blocked reasons,
- no technical enum/backend terms.

### M3 — AutoOps + First-Paid Runtime UAT

Goal:
- prove room priority follows first valid approved payment, not first booking.

UAT:
- expired unpaid booking auto-cancel,
- pending review not auto-cancel,
- rejected after deadline cancels,
- orphan RESERVED release,
- competing unpaid interests cancelled when one valid payment wins.

### M4 — Deposit Ledger Detail

Goal:
- additive TenantDepositLedger history without removing Stay deposit snapshot fields.

### M5 — Cashflow Statement + Owner Finance Trend

Goal:
- owner can see cash in/out, ending cash, monthly trend, and cash risk.

### M6 — OPEX/COGS/CAPEX Classification

Goal:
- expenses become business-readable: operating cost, service cost, or capital expenditure.

### M7 — Ancillary Revenue System

Goal:
- generic AncillaryProduct/AncillarySale while keeping WifiSale short-term.

### M8 — Global Data Quality Center

Goal:
- one command center for accounting, tenant/stay, invoice/payment, room, staff/ticket, inventory/asset data issues.

### M9 — Unified Admin/Owner Command Center

Goal:
- main dashboard ranks cross-domain blockers by business urgency and removes redundant alerts.

### M10 — Production Readiness

Goal:
- env/security/DB backup/migration/logging/deployment smoke checklist ready.


## 0.2 Critical Audit Backlog — Accepted Bug Report

| ID | Severity | Area | Problem | Target batch |
|---|---|---|---|---|
| B1 | CRITICAL | Deposit / Stay lifecycle | PARTIAL_REFUND can process only part of deposit and leave remainder untracked | V5.29-C |
| B2 | CRITICAL | Stay creation | `agreedRentAmountRupiah || resolveRent(room)` ignores explicit 0 | V5.29-C |
| B3 | HIGH | Stay query | `invoiceCount` incorrectly equals filtered `openInvoiceCount` | V5.29-C |
| B4 | HIGH | Renew | `requestedTerm` from renew request is ignored during approve | V5.29-D |
| F1 | HIGH | Check-in UI | BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY missing from wizard dropdown | V5.29-E |
| B5 | MEDIUM | Checkout notification | Notification uses current planned checkout date instead of tenant requested date | V5.29-D |
| B6 | MEDIUM | Invoice cancellation | DRAFT cancellation calls reversal unnecessarily and swallows accounting errors | V5.29-E |
| B7 | MEDIUM | Checkout API | checkout-requests findAll response shape inconsistent | V5.29-D |
| F2 | LOW | Frontend cache | approve renew does not invalidate admin-checkout-requests cache | V5.29-D |


## 0.3 Recommended ACT Batching

### ACT V5.29-C — Critical Lifecycle/Data Integrity Hotfix

Patch only:
```text
B1 Deposit partial refund guard
B2 agreedRentAmountRupiah 0 must stay 0
B3 invoiceCount total vs openInvoiceCount filtered
```

Why:
- Highest data integrity risk.
- Backend-only expected.
- Must be fixed before tenant UX relies on these values.

### ACT V5.29-D — Renew/Checkout Consistency Hotfix

Patch only:
```text
B4 requestedTerm renew approve
B5 checkout notification date
B7 checkout response consistency
F2 approve renew cache invalidation
```

Why:
- Same renew/checkout domain.
- Avoid mixing with deposit/stay critical fixes.

### ACT V5.29-E — Admin Check-In + Invoice Hygiene Fix

Patch only:
```text
F1 Check-in pricing terms
B6 DRAFT invoice cancellation reversal hygiene
```

Why:
- Admin check-in UI and invoice accounting hygiene are separate from deposit/renew fixes.
```

## 0.4 Post-Hotfix Product Timeline

```text
M1 Tenant My Stay Guide Full Audit
M2 Tenant Payment/Renew/Checkout UX Hardening
M3 AutoOps + First-Paid Runtime UAT
M4 Deposit Ledger Detail
M5 Cashflow Statement + Owner Finance Trend
M6 OPEX/COGS/CAPEX Classification
M7 Ancillary Revenue System
M8 Global Data Quality Center
M9 Unified Command Center
M10 Production Readiness
```


## 0.0 Current Execution Override — V5.29-B9 Accounting Data Quality & Statement Command Center

```text
Next target:
PLAN V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening

Mode:
PLAN first in new chat.
ACT only if user says ACT / YOLO / patch / implementasikan.

Recommended scope:
Frontend-first, backend read-only if necessary.
No lifecycle/payment/stay/checkout/renew rewrite.
No destructive schema change.
No DB reset.
```

### Why B9

B8 made the accounting engine safer. B9 should make it usable and understandable.

Current accounting foundation is strong:
- COA/cash/period/opening balance.
- Journal ledger.
- Trial Balance.
- Balance Sheet.
- P&L operational report.
- Asset register + depreciation.
- Fixed asset ledger alignment.
- Period close.
- Closed period reopen/reversal.
- Manual closed-period guard.

But the owner experience still needs a better command center:
- clear statement tiles,
- audit trail,
- period close timeline,
- data quality warnings,
- old copy cleanup,
- better explanation of current profit vs retained earnings,
- better navigation from Finance.

### B9 PLAN output required

A. Executive summary  
B. Current source verification state  
C. Current accounting frontend/backend map  
D. Statement Command Center UX design  
E. Data quality/readiness model  
F. Journal audit trail UX  
G. Period close history/timeline UX  
H. Copy cleanup list  
I. Exact files to touch/create  
J. Backend unchanged/needed decision  
K. UAT/smoke commands  
L. PASS criteria  
M. ACT recommendation  

### B9 likely file scope

Frontend:
```text
frontend/src/api/accounting.ts
frontend/src/components/accounting/AccountingCommandCenterLite.tsx
frontend/src/components/accounting/BalanceSheetGuardPanel.tsx
frontend/src/components/accounting/ProfitLossLitePanel.tsx
frontend/src/components/accounting/PeriodClosePanel.tsx
frontend/src/pages/finance/AccountingSetupPage.tsx
frontend/src/pages/finance/FinancePage.tsx or finance navigation files if present
```

Optional new components:
```text
StatementCommandCenterPanel.tsx
AccountingDataQualityPanel.tsx
PeriodCloseTimeline.tsx
JournalAuditTrailPanel.tsx
StatementStatusCard.tsx
```

Backend optional read-only:
```text
GET /api/accounting/statement-command-center?asOf=YYYY-MM-DD
GET /api/accounting/period-close/history
GET /api/accounting/data-quality
```

Only add backend if existing endpoints cannot provide the data cleanly.

### B9 must not do

- No DB reset.
- No production DB mutation.
- No payment/stay/renew/checkout rewrite.
- No new accounting mutation beyond existing B8 governance.
- No new chart dependency unless clearly justified.
- No dark mode.
- No microservices/apps folder.
- No generated Prisma commit.


## 0.0 Current Execution Override — V5.23-B Accounting & Balance Sheet Foundation

```text
Current latest implementation package:
frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip
backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip

Current verification status:
frontend build not verified in container,
backend unchanged,
runtime/API smoke not run,
FULL PASS not claimed.

Next mode:
PLAN FIRST.
User will provide extra planning/research from another AI.
The next assistant must inspect the uploaded docs/code ZIP first, then produce a coherent accounting roadmap before any patch.
```

### V5.23-B target

Move KOST48 from operational finance summary toward accounting-ready finance that can eventually support:

1. Profit & Loss / Income Statement.
2. Cashflow Statement.
3. Balance Sheet.
4. Asset register.
5. Depreciation.
6. Deposit liability.
7. OPEX / COGS / CAPEX.
8. Ancillary revenue profitability.
9. Owner finance cockpit with honest readiness score.

### Current known gap

Current system has:
- invoices,
- invoice lines,
- invoice payments,
- expenses,
- WiFi sales,
- deposit fields,
- inventory/room item operations.

Current system does **not** yet have:
- Chart of Accounts,
- Cash/Bank account ledger,
- JournalEntry / JournalLine,
- formal asset register,
- depreciation,
- owner capital/equity,
- opening balance,
- formal Balance Sheet.

### Recommended roadmap

#### Batch 1 — Accounting Readiness Foundation

Scope:
- Add or plan expense classification:
  - OPEX
  - COGS
  - CAPEX
- Add revenue stream classification:
  - ROOM_RENT
  - UTILITY
  - WIFI
  - ANCILLARY
  - PENALTY
  - DEPOSIT_RECEIPT (liability, not revenue)
- Add `AncillaryProduct` and `AncillarySale`.
- Keep `WifiSale` as-is short-term.
- Map WiFi into Finance as voucher revenue stream.
- Improve Finance IA without claiming full accounting.

Backend likely needed:
- additive schema only,
- no DB reset,
- no destructive migration.

#### Batch 2 — Cash/Bank + Opening Balance

Scope:
- Add `CashAccount`.
- Add `OpeningBalance`.
- Allow owner/admin to set starting cash/bank, deposit liability, existing assets, and starting equity.
- Define cutover date.

Goal:
- avoid trying to reconstruct old incomplete history.

#### Batch 3 — Auto Journal Lite

Scope:
- Add `ChartOfAccount`.
- Add `JournalEntry`.
- Add `JournalLine`.
- Auto-generate journal entries for:
  - invoice issued,
  - invoice payment,
  - deposit received,
  - deposit refunded/deducted,
  - expense paid,
  - WiFi sale,
  - ancillary sale,
  - CAPEX purchase.

Goal:
- build semi-ledger without forcing full accounting UI too early.

#### Batch 4 — Asset Register + Depreciation

Scope:
- Add `Asset`.
- Add `AssetDepreciation`.
- Support straight-line monthly depreciation.
- Asset categories:
  - building/renovation,
  - furniture,
  - AC/electronics,
  - CCTV/security,
  - router/network equipment,
  - water pump,
  - laundry machine,
  - room equipment.

#### Batch 5 — Financial Statements

Scope:
- P&L from accounts/journals.
- Cashflow from cash movements.
- Balance Sheet from accounts:
  - assets,
  - liabilities,
  - equity.
- Finance readiness score:
  - cash account complete,
  - opening balance set,
  - deposit liability mapped,
  - assets registered,
  - journals balanced,
  - no unmapped transactions.

#### Batch 6 — Migration / Cleanup

Scope:
- Migrate/adapt `WifiSale` into `AncillarySale` reporting.
- Backfill or cutover strategy.
- Consistency checks.
- No production mutation without explicit approval.

### New chat PLAN output required

The next assistant must produce:

A. Executive summary  
B. Current code/data map from actual ZIP  
C. Accounting gap analysis  
D. COA minimal for kos  
E. Schema proposal  
F. Transaction-to-journal mapping  
G. Revenue recognition plan  
H. OPEX/COGS/CAPEX rules  
I. Asset/depreciation plan  
J. Balance Sheet calculation plan  
K. Migration/cutover plan  
L. Backend API plan  
M. Frontend IA/UX plan  
N. Owner cockpit metrics  
O. Phased implementation batches  
P. Risks/guardrails  
Q. UAT plan  
R. ACT recommendation  

### Do not

- Do not implement full double-entry in one risky patch without plan.
- Do not fake Balance Sheet from incomplete data.
- Do not treat deposit as revenue.
- Do not reset DB without explicit user request.
- Do not introduce microservices.
- Do not add dark mode.
- Do not create standalone Reports menu until reporting model is clear.


## 0.0 Current V5.20 Execution Override

```text
Current active package: V5.20 First Paid Room Priority + Fast AutoOps
Mode after docs sync: verify locally, then patch bugs if found.
Architecture remains: Stable Modular Monolith.
No multi-app migration.
No service-to-service HTTP.
No autonomous AI mutation.
```

### Immediate verification plan

1. Apply latest backend/frontend V5.20 ZIP.
2. If DB still contains old partial unique index or old UAT data, reset/bootstrap local dev DB only.
3. Run backend build.
4. Run frontend build.
5. Run AutoOps UAT:
   - expired unpaid booking auto-cancel,
   - pending proof not auto-cancelled,
   - payment reject after expired booking auto-cancels,
   - orphan RESERVED room auto-release,
   - first valid payment cancels competing unpaid interest,
   - one-step payment proof works from tenant UI.
6. Run manual UI smoke:
   - public room card copy,
   - tenant waiting room,
   - tenant Bayar & Kirim Bukti,
   - admin dashboard SLA cards,
   - owner dashboard AutoOps summary,
   - payment review urgency,
   - renew utility checkpoint,
   - checkout readiness.

### Definition of done for V5.20

```text
Do not call FULL PASS until:
backend build PASS,
frontend build PASS,
runtime API UAT PASS,
tenant/admin/owner manual UI smoke PASS,
no unrelated changes,
ZIP final generated.
```


## 0. Current Execution Override

```text
Current verified phase: V5.19 Renew Meter Utility runtime UAT PASS; V5.20 First Paid AutoOps ZIP generated pending local verification
Next phase: V5.20 local build/UAT + UI bug audit for first-paid/payment/AutoOps flow
Default mode: PLAN ONLY unless user explicitly says ACT / YOLO / patch
Architecture: Stable Modular Monolith
Multi-app: roadmap only
```

## 1. Current Verified State

Latest confirmed/pushed state:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
42105e0 fix(frontend): include staff repair constants
14d8e97 feat(staff): stabilize repair workflow and staff ticket visibility
```

V5.16 Staff Repair Flow verified:
- Staff report barang kamar creates ticket.
- Fresh ticket has `assignedToId=3`, `roomId=1`, `linkedRoomItemId=1`.
- Staff list shows active assigned tickets after V5.16-G.
- Ticket detail visibility for staff works.
- Ticket lifecycle works: start, mark done, close, cancel.
- Admin can set final item status.
- Inventory report linking works for fresh ticket.

V5.17 Staff UX verified:
- Clean blue staff UI direction applied.
- Room card clickable/full-card UX applied.
- Inventory health computed from qty/minQty.
- Staff no longer manually selects stock habis/menipis.
- Routine checklist harian/mingguan/bulanan restored as professional work cards.
- User manually checked V5.17-D and said it is good/PASS.
- Working tree clean after generated Prisma restore.

## 2. Immediate Next Priority

```text
Tenant Side Full Audit — PLAN first.
```

Do not patch yet unless user says ACT/YOLO/patch.

Before audit:
1. User should upload latest frontend/backend ZIP or ensure current repo code is available.
2. Inspect real code, not memory.
3. Identify tenant routes, portal pages, hooks, API clients, components, and styles.
4. Compare current tenant UI with contracts and product direction.

## 3. Tenant Side Full Audit Goals

Tenant portal must become:

```text
Tenant = My Stay Guide
```

It should answer clearly:

1. Saya tinggal di kamar apa?
2. Masa sewa saya sampai kapan?
3. Tagihan apa yang harus saya bayar?
4. Bukti pembayaran saya sedang diproses atau sudah diterima?
5. Apakah saya bisa ajukan perpanjangan?
6. Apakah saya bisa ajukan keluar?
7. Apakah ada masalah/ticket/request yang masih menunggu?
8. Apa aksi paling penting sekarang?

## 4. Tenant Pages to Audit

Audit real source files for routes and pages such as:

```text
frontend/src/pages/portal/*
frontend/src/pages/booking/*
frontend/src/pages/invoices/*
frontend/src/pages/tickets/*
frontend/src/components/tenant/*
frontend/src/components/portal/*
frontend/src/components/layout/AppLayout.tsx
frontend/src/config/navigation.ts
frontend/src/api/*
frontend/src/utils/statusLabels.ts
frontend/src/styles.css
```

Expected tenant surfaces:
- Tenant portal home / dashboard
- My stay page
- My invoices page
- Tenant invoice detail
- Payment proof upload
- Payment submission status
- Renew request flow
- Checkout request flow
- My tickets / complaints
- Notifications / urgency chip
- Booking continuation if tenant has active/approved booking
- Tenant profile/room summary if available

## 5. Tenant Audit Framework

### A. Information Architecture

Check:
- Does tenant have too many menu items?
- Is dashboard the primary guidance screen?
- Are invoices, stay, payment, renew, checkout connected logically?
- Is “Reports” or admin/staff terminology leaking to tenant?
- Are routes protected correctly for TENANT?

### B. Tenant Language / Microcopy

Must use:
- “Tagihan”
- “Masa sewa”
- “Akhir masa sewa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Bukti pembayaran sedang diperiksa”
- “Tidak perlu upload ulang”
- “Menunggu keputusan admin”
- “Hubungi admin”

Avoid:
- `stay`
- `periodEnd`
- `checkout request`
- `ISSUED`
- `PENDING_REVIEW`
- `payment submission`
- enum mentah/backend terms
- technical lifecycle/mutation terms

### C. Assistant / Rule Intelligence

Tenant assistant must be useful, not decorative.

Tier 0 deterministic rules:
- If payment submission `PENDING_REVIEW`:
  - “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- If invoice open/overdue:
  - show CTA “Lihat Tagihan” / “Bayar Sekarang”
- If renew pending:
  - “Pengajuan perpanjangan sedang menunggu keputusan admin.”
- If checkout pending:
  - “Pengajuan keluar sedang diproses.”
- If checkout blocked by open invoice:
  - “Selesaikan tagihan dulu sebelum keluar final.”
- If near end of lease:
  - “Masa sewa akan segera berakhir. Ajukan perpanjangan atau keluar.”
- If no active stay:
  - give clear next step, not blank dashboard.
- If ticket open:
  - show status and next expectation.

### D. Flow Guards

Audit:
- Tenant cannot upload duplicate proof when payment is pending review.
- Tenant cannot request renew/checkout if blocked by unpaid invoice where rule says blocked.
- Tenant sees correct CTA based on invoice/payment status.
- Tenant does not execute final checkout.
- Tenant does not approve payment.
- Tenant does not mutate lifecycle finalization.
- Checkout final remains admin/core flow.

### E. UI/UX Quality

Audit:
- readable font weights, no overly thick fonts.
- no low-contrast text.
- same modern blue design system as staff.
- no dark mode.
- cards should be informative, not decorative.
- CTA should be obvious but not duplicated.
- status badges must be human-readable.
- mobile/responsive sanity.

### F. API/Data Availability

Map which API already provides:
- current tenant/stay
- invoices
- invoice detail
- payment submissions
- renew requests
- checkout requests
- tickets
- notifications
- room info
- urgency/payment status

Decide:
- backend unchanged if existing API enough.
- backend patch only if data minimal is unavailable or endpoint bug blocks tenant flow.

## 6. Expected PLAN Output in Next Chat

The next ChatGPT must produce:

A. Executive summary  
B. Current tenant frontend map  
C. Current tenant API/data map  
D. Tenant UX gap analysis  
E. Tenant business-rule gap analysis  
F. Assistant/rule intelligence opportunities  
G. Exact files to touch/create  
H. Backend unchanged/needed decision  
I. Risks/unknowns  
J. ACT patch plan  
K. PowerShell build/smoke commands

## 7. ACT Scope After Audit

Potential V5.18-A ACT scope:

```text
V5.18-A Tenant My Stay Guide + Payment/Renew/Checkout Assistant
```

Possible patch:
- Redesign tenant portal home as My Stay Guide.
- Redesign invoice cards/detail.
- Add tenant assistant cards.
- Payment under review banner.
- Improve renew/checkout request flows.
- Remove technical enum/backend language.
- Add blocked reason cards where needed.
- Ensure duplicate proof upload UX is safe.
- Keep backend unchanged unless existing data is insufficient.

## 8. Tenant Smoke Commands

Use PowerShell only. Do not use curl.

Login tenant once:

```powershell
$tenantLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"tenant@kost48.com","password":"tenant123"}'; $tenantToken=$tenantLogin.data.accessToken
```

Protected smoke examples:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/me/stay" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/invoices" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/renew-requests" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/checkout-requests" -Headers @{Authorization="Bearer $tenantToken"}
```

If endpoint names differ, inspect real code and adjust. Do not invent endpoints.

## 9. Definition of Done

No further patch can be called PASS unless:
1. Source files inspected.
2. Backend build PASS if backend touched.
3. Frontend build PASS if frontend touched.
4. Manual smoke / UAT command actually run.
5. No unrelated file changes.
6. No file-based UAT scripts created unless user explicitly asks.
7. No DB reset.
8. No production mutation.
9. ZIP final generated if requested.
10. Git commit/push done if release task requested.
11. Generated Prisma noise not committed accidentally.

## 10. New Chat Prompt

Use the prompt from the assistant final response in the current chat. It must tell the next ChatGPT:
- start PLAN only,
- inspect uploaded ZIP/code,
- focus tenant side full audit,
- use these docs as source of truth,
- keep V5.17-D staff state as done,
- do not patch until ACT.


## 11. V5.20 AutoOps / First Paid ACT Plan

## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Prinsip bisnis utama

```text
Prioritas kamar mengikuti pembayaran valid pertama, bukan siapa yang hanya pesan duluan.
Booking/minat belum mengunci kamar.
Tenant baru hanya boleh bayar setelah kamar siap dihuni.
Tenant lama tidak boleh hutang.
Kalau tenant lama telat melewati batas pembayaran/kontrak dan kamar sudah diambil tenant baru, tenant lama wajib mengosongkan kamar maksimal 3 jam.
```

### Deadline operasional default

| Flow | Deadline default | AutoOps / eskalasi |
|---|---:|---|
| Booking/minat tanpa keputusan admin | 3 jam | Auto-cancel dan kamar dibuka kembali jika tidak ada bukti valid |
| Tagihan awal setelah kamar siap | 3 jam | Auto-cancel booking jika belum bayar + belum kirim bukti |
| Bukti pembayaran pending review | urgent 1 jam, escalate 3 jam, max 6 jam | Tidak auto-cancel tenant yang sudah kirim bukti; naik prioritas admin/owner |
| Invoice aktif tenant berjalan | urgent 6 jam, overdue 24 jam | Renew/checkout tetap blocked sampai lunas |
| Renew request | urgent 3 jam, escalate 6 jam | Admin wajib catat meter dan buat invoice renew utility |
| Checkout request | urgent 3 jam, escalate 6 jam | Admin review cepat; final checkout tetap manual |
| Checkout approved belum final | 6 jam | Owner/Admin melihat room tertahan |
| Tenant lama telat + tenant baru valid | 3 jam | Tenant lama wajib keluar maksimal 3 jam |
| Ticket staff | 24–48 jam | Lebih longgar karena pekerjaan fisik |

### Payment UX contract

```text
Tenant tidak boleh diarahkan "bayar dulu, upload bukti nanti".
Tenant action harus satu langkah: Bayar & Kirim Bukti.
Backend boleh tetap menyimpan upload file dan payment submission secara terstruktur, tetapi frontend harus terasa sebagai satu aksi.
```

### Copy wajib untuk tenant/public

```text
Pemesanan belum mengunci kamar. Kamar baru aman setelah pembayaran lunas dan disetujui admin.
Jika masa sewa habis dan tagihan perpanjangan belum dibayar, kamar dapat ditawarkan kembali.
Jika kamar sudah diambil tenant baru yang membayar valid, perpanjangan tidak dapat dilanjutkan.
Jika kamu telat dan kamar sudah diambil tenant baru, kamu wajib mengosongkan kamar maksimal 3 jam.
Tidak ada sistem hutang.
```

### Batas otomatisasi

Boleh otomatis:
- expired unpaid booking auto-cancel,
- unpaid approved booking auto-cancel,
- orphan RESERVED room auto-release,
- overdue/urgent notification,
- dashboard priority/escalation,
- duplicate/redundant alert dedup.

Tetap manual:
- approve/reject payment,
- approve renew + catat meter,
- final checkout,
- refund/deduction deposit,
- close ticket final,
- inventory movement resmi.

## 12. V5.20 UAT targets

```text
1. Create room + tenant + booking interest.
2. Force booking expiresAt to past.
3. Run /api/auto-ops/run.
4. Verify unpaid booking CANCELLED and room AVAILABLE.
5. Create booking with PENDING_REVIEW proof.
6. Force expiresAt to past.
7. Run AutoOps.
8. Verify booking is NOT cancelled while proof is pending.
9. Reject proof after deadline.
10. Verify booking auto-cancel and room AVAILABLE.
11. Create two unpaid booking interests for same room if business index allows it.
12. Approve payment for one.
13. Verify competing unpaid interests are cancelled.
14. Verify tenant payment UI uses one-step Bayar & Kirim Bukti.
```


## 0.1 Final Pre-ACT Plan — V5.23-B1 Accounting Foundation Readiness

```text
Next ACT target: Backend V5.23-B1 Accounting Foundation Readiness.
Status: READY FOR ACT after backend_latest_for_accounting_act_CLEAN.zip received and verified.
Patch style: large coherent backend patch, but additive-only.
```


## Backend Current Map — Operational Finance, Not Formal Accounting

```text
Existing operational finance truth:
- Invoice / InvoiceLine / InvoicePayment
- PaymentSubmission review flow
- Expense
- WifiSale
- Stay deposit operational snapshot fields
- FinanceService business-health
- ReportsService operational reports
- AuditLog
- PostgreSQL trigger/constraint layer in sql/bootstrap.sql

Relevant modules:
- src/modules/finance
- src/modules/reports
- src/modules/invoices
- src/modules/invoice-payments
- src/modules/payment-submissions
- src/modules/expenses
- src/modules/wifi-sales
- src/modules/stays
- src/modules/tenant-bookings
- src/modules/inventory-items
- src/modules/inventory-movements
- src/modules/room-items

Existing finance/report endpoints:
- GET /api/finance/business-health
- GET /api/finance/occupancy/summary
- GET /api/finance/formal-ratios/readiness
- GET /api/finance/balance-sheet/draft
- GET /api/reports/monthly-income
- GET /api/reports/overdue-aging
- GET /api/reports/deposit-liability
- GET /api/reports/expense-summary
- GET /api/reports/cash-flow
- GET /api/reports/profit-loss
- GET /api/reports/financial-ratios
- GET /api/reports/occupancy

Docs/code out-of-sync risk:
/reports/profit-loss and /reports/financial-ratios can sound too formal.
They must be labeled OPERATIONAL_APPROXIMATION until ledger/readiness is real.
```


## V5.23-B1 ACT Scope Lock — Accounting Foundation Readiness

```text
B1 is a ledger foundation and readiness patch.
B1 is NOT auto-posting.
B1 is NOT formal Balance Sheet.
B1 is NOT deposit migration.
B1 is NOT payment/stay/checkout/renew rewrite.
```

### Schema additions allowed in B1

```text
ChartOfAccount
CashAccount
AccountingPeriod
OpeningBalanceBatch
OpeningBalanceLine
JournalEntry
JournalLine
```

### Backend module additions allowed in B1

```text
src/modules/accounting/accounting.module.ts
src/modules/accounting/accounting.controller.ts
src/modules/accounting/accounting.service.ts
src/modules/accounting/accounting-posting.service.ts
src/modules/accounting/accounting-readiness.service.ts
src/modules/accounting/accounting-reports.service.ts
src/modules/accounting/constants/default-coa.ts
src/modules/accounting/dto/*
```

### Existing files allowed to touch in B1

```text
prisma/schema.prisma
src/app.module.ts
src/modules/reports/reports.service.ts
Optional only if necessary: src/common/enums/app.enums.ts
```

### Files forbidden to touch in B1

```text
src/modules/payment-submissions/payment-submissions.service.ts
src/modules/stays/stays.service.ts
src/modules/checkout-requests/*
src/modules/renew-requests/*
src/modules/tenant-bookings/*
src/modules/invoice-payments/*
src/modules/invoices/*
src/modules/expenses/*
src/modules/wifi-sales/*
```

### B1 endpoint target

```text
GET  /api/accounting/readiness
POST /api/accounting/default-coa/seed
GET  /api/accounting/accounts
POST /api/accounting/accounts
PATCH /api/accounting/accounts/:id
GET  /api/accounting/cash-accounts
POST /api/accounting/cash-accounts
PATCH /api/accounting/cash-accounts/:id
GET  /api/accounting/opening-balances
POST /api/accounting/opening-balances/draft
GET  /api/accounting/journal-entries
GET  /api/accounting/trial-balance
GET  /api/accounting/unmapped-transactions
GET  /api/accounting/balance-sheet
```

### Report honesty rule

```text
Existing reports should include metadata:
- basis: OPERATIONAL_APPROXIMATION
- ledgerBacked: false
- formalStatementReady: false
- readinessNote: current report uses operational invoice/payment/expense data, not formal accounting ledger.
```


## V5.23-B Roadmap After B1

```text
Batch 2 — Opening Balance + Cash Setup
- opening balance draft/approve/post, default cash account, accounting period, Owner-only posting

Batch 3 — Expense Classification
- OPEX / COGS / CAPEX, Expense.coaId, Expense.cashAccountId, CAPEX Owner approval

Batch 4 — Invoice/Payment Auto Posting
- invoice issued posting, invoice payment posting, payment submission deposit portion posting, idempotency guard, after cutover only

Batch 5 — Deposit Ledger Additive Sync
- TenantDepositLedger movement history, deposit liability reconciliation, Stay deposit fields remain operational snapshot, no field drop

Batch 6 — Ancillary Revenue
- AncillaryProduct, AncillarySale, keep WifiSale short-term, optional adapter later

Batch 7 — Asset Register + Depreciation
- asset register, straight-line depreciation, monthly depreciation run, no inventory link in first asset patch

Batch 8 — Equity + Owner Capital / Drawing
- Owner capital/drawing via COA and journal entries, retained earnings from period close, no auto-close period yet
```


## Verification Commands — PowerShell Only

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
```

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/finance/business-health" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/accounting/default-coa/seed" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/accounts" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/trial-balance?asOf=2026-05-31" -Headers @{Authorization="Bearer $token"}
```

```text
Do not claim PASS without backend build success, API smoke success, no unrelated changes, final ZIP generated, and honest note if runtime/manual verification was not run.
```

## 0.0 Current Execution Override — After V5.24-C

```text
Current latest pushed commit:
cb93fe6 fix(admin): harden dashboard search tickets and finance ux

Current status:
- V5.20–V5.23-B1B pushed.
- V5.24-B2A/B/B2C accounting setup pushed and UAT verified.
- V5.24-C admin UI critical hardening pushed.
- Generated Prisma must be restored before each commit.
```

### Immediate next plan

```text
PLAN V5.24-D — Admin UI Architecture + Performance Hardening
```

Primary goals:
1. Inspect current source after cb93fe6.
2. Confirm GlobalSearch admin remains visible.
3. Confirm dashboard ticket close UX remains correct.
4. Reduce dashboard blocking query behavior where safe.
5. Decide and clean dead `RoleWorkspaceTabs` path.
6. Improve admin sidebar with lightweight context card/footer if it does not clutter.
7. Replace fake progress percentages with meaningful counts or denominator-based metrics.
8. Clean non-standard font-weight only in touched sections.
9. Keep sidebar as primary navigation and dashboard as command center, not duplicate navigation.

### Deferred until after V5.24-D or explicit user override

```text
PLAN B3 — Auto Journal Lite
```

B3 must not start until:
- opening balance posted,
- trial balance balanced,
- cutover date clear,
- cash account exists,
- readiness stable,
- idempotency/sourceType+sourceId strategy designed.
