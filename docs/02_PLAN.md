# KOST48 V5 — Execution Plan
**Versi:** 2026-05-18 V5.7/V5.8 audit sync  
**Fungsi:** Master plan eksekusi aktif. Bagian terbaru ini mengalahkan rencana lama jika ada konflik.

---

---

## 0A. V5.8-A Backend Guard Overlay — Prepared

Scope executed in this overlay:

- Removed dead `StaysModule` import from `CheckoutRequestsModule`.
- Patched `StaysService.renewStay()` so renewal invoice is issued after line creation.
- Patched `StaysService.complete()` so checkout final blocks all invoices where status is not `PAID` or `CANCELLED`.
- Patched `StaysService.processDeposit()` with the same open invoice guard.
- Patched `StaysQueryService` open invoice counts to match KB-2 semantics.

Verification still required locally:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```

After build/UAT OK, next phase remains:

```text
V5.8-B = marketing-api shell/extraction PLAN/ACT, still no lifecycle writes moved.
```

## 0. Current Execution Override

```text
Current phase: V5.8-A overlay prepared, awaiting local build/UAT
Mode for this package: bounded YOLO ACT completed in sandbox
Do not generate apps yet
Do not move modules yet
Do not edit nest-cli.json yet
Do not split app.module.ts yet
Do not change schema
```

Architecture direction:

```text
Multi-App Shared-DB Architecture
Shared PostgreSQL tetap dipakai
PrismaService tetap shared
Greenfield shell + brownfield logic extraction
No total rewrite
No separate DB
No distributed transaction
No service-to-service HTTP Phase 0/1
```

---

## 1. Latest Audit Summary — V5.7-B Accepted

V5.7-B targeted audit closed the critical UNKNOWNs:

| Area | Finding | Execution impact |
|---|---|---|
| Workspace | `nest-cli.json` single-project; `AppModule` monolith | `NEEDS MANUAL MIGRATION`; no app generation in V5.7 |
| Public/Marketing | Read-only; safe candidate | Use for V5.8 marketing PLAN |
| CheckoutRequests | `StaysModule` dead import; no `StaysService` injection | cleanup candidate |
| RenewRequests | injects `StaysService`; approval calls `renewStay()` | approval/execution core-only |
| PaymentSubmissions | approval uses `$transaction` + SQL lock | no hotfix needed; approval core-only |
| TenantBookings | approval uses `$transaction`; invoice ISSUED; pending meter snapshot | approval core-only |
| Stays.create | transaction; invoice ISSUED; meter + portal user | B1 behavior implemented |
| Stays.complete | transaction; no final utility invoice | KB-2 guard needed |
| Stays.renewStay | transaction; renewal invoice DRAFT | KB-1 patch needed |

---

## 2. Locked Business Decisions

### KB-1 — Renewal invoice

```text
Renewal invoice must auto-ISSUE when admin approves renew request.
```

Target after patch:

```text
Renew request approved
→ stay extended
→ renewal invoice created
→ invoice status ISSUED
→ tenant can see/pay renewal invoice
```

### KB-2 — Checkout complete invoice guard

```text
StaysService.complete() must block if any invoice for the stay is not PAID/CANCELLED.
No auto-create final utility invoice inside complete().
```

Target after patch:

```text
Checkout Final requested
→ system checks all invoices for stay
→ if any DRAFT/ISSUED/PARTIAL/etc exists: reject with invoice list
→ if all PAID/CANCELLED: checkout proceeds
```

---

## 3. Current Gate Before V5.8 PLAN

Before running V5.8 PLAN with Cline:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Gate must be:

- `.clinerules` and `.clineignore` resolved/committed.
- `MyInvoicesPage.tsx` resolved:
  - if valid: frontend build PASS then commit separately;
  - if invalid/duplicate: do not add.
- Working tree clean before extraction planning/ACT.

If not clean, do not start V5.8 ACT.

---

## 4. V5.8 Plan

### V5.8 objective

Produce a detailed PLAN for:

1. Public/marketing module extraction path.
2. Checkout dead import cleanup.
3. KB-1 renewal invoice ISSUED patch.
4. KB-2 complete open invoice guard patch.
5. Future workspace migration approach.

### V5.8 mode

```text
V5.8 PLAN only first.
No code changes.
No file creation.
No nest-cli modification.
No app.module modification.
No module moves.
No schema changes.
No DB mutation.
No build unless explicitly requested later.
```

### V5.8 recommended Cline prompt

```text
MODE: PLAN ONLY — NO CODE CHANGES

Project:
KOST48 Surabaya V5

Phase:
V5.8 — Marketing-api extraction + KB-1/KB-2 patch planning

Project root:
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle

PowerShell only.
If terminal is not PowerShell, STOP.

ABSOLUTE RULES:
- No code changes.
- No file creation.
- Return the plan in chat only.
- No nest-cli.json modification.
- No app.module.ts changes.
- No module moves.
- No tsconfig changes.
- No schema changes.
- No DB mutation.
- No npm install.
- No build unless explicitly requested later.
- Read-only analysis only.

START:
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
git status --short
git log --oneline -5

If working tree is not clean:
STOP and report what remains.

CONTEXT FROM V5.7:
- V5.1–V5.6 applied and committed.
- Branch is main/origin/main unless local git says otherwise.
- Backend workspace is still monolith.
- nest-cli.json is single-project.
- app.module.ts is monolith aggregator.
- No app generation yet.
- No libs/shared yet.
- Public/marketing module confirmed read-only.
- CheckoutRequestsModule imports StaysModule but CheckoutRequestsService does not inject StaysService. This is dead import cleanup candidate.
- RenewRequestsService injects StaysService and approveRequest() calls staysService.renewStay(), so renewal execution must stay core-api.
- PaymentSubmissions.approveSubmission() uses prisma.$transaction + SQL lock and must stay core-api.
- StaysService.create() already creates portal user + invoice ISSUED + meter readings in transaction.
- StaysService.complete() uses transaction but does not create final utility invoice.
- StaysService.renewStay() creates renewal invoice as DRAFT.

BUSINESS DECISIONS LOCKED:
KB-1:
Renewal invoice must be auto-ISSUED when admin approves renew request.
Do not leave renewal invoice DRAFT after approval.

KB-2:
StaysService.complete() must block checkout final if there are open invoices.
Admin must settle invoices manually first.
Do not auto-create utility invoice inside complete().

READ ONLY FILES:
- backend/src/modules/public/public.controller.ts
- backend/src/modules/public/public.service.ts
- backend/src/modules/public/public.module.ts
- backend/src/modules/checkout-requests/checkout-requests.module.ts
- backend/src/modules/renew-requests/renew-requests.service.ts
- backend/src/modules/stays/stays.service.ts
- backend/src/app.module.ts
- backend/nest-cli.json
- backend/tsconfig.json
- frontend/src/App.tsx
- frontend/src/pages/rooms/RoomsRouteEntry.tsx
- frontend/src/pages/rooms/PublicRoomDetailPage.tsx
- frontend/src/api/public.ts

TASK 1 — PUBLIC MODULE VERIFICATION
- List every endpoint in PublicController.
- List every Prisma model read by PublicService.
- Confirm PublicService write operations: yes/no.
- Confirm PublicModule imports.
- Confirm whether PublicModule imports lifecycle modules.
- Verdict: safe to extract to marketing-api later? YES / NO / PARTIAL.

TASK 2 — CHECKOUT DEAD IMPORT CLEANUP PLAN
- Confirm exact import line for StaysModule in checkout-requests.module.ts.
- Confirm no StaysService injection in CheckoutRequestsService.
- Recommend whether removing StaysModule import is safe.
- Risk level.
- Exact file for future ACT.
- Build needed after cleanup.

TASK 3 — KB-1 RENEWAL INVOICE ISSUED PLAN
- Locate approveRequest() in RenewRequestsService.
- Locate staysService.renewStay() call.
- Locate renewStay() in StaysService.
- Confirm renewal invoice status is currently DRAFT.
- Recommend lowest-risk patch:
  Option A: update invoice to ISSUED inside StaysService.renewStay()
  Option B: update invoice to ISSUED from RenewRequestsService after renewStay()
- Choose one and justify.
- Exact files for ACT.
- Exact expected behavior after patch.
- UAT commands/checklist.

TASK 4 — KB-2 COMPLETE OPEN INVOICE GUARD PLAN
- Locate complete() in StaysService.
- Confirm where checkout validation currently happens.
- Define open invoice as status not in PAID/CANCELLED.
- Decide whether DRAFT should block checkout.
- Recommend exact guard placement.
- Recommend error message in Indonesian.
- Error should include invoice IDs or invoice numbers if available.
- Exact file for ACT.
- UAT checklist:
  - complete() with open invoice should fail
  - complete() with all invoices PAID/CANCELLED should succeed

TASK 5 — MARKETING-API EXTRACTION PLAN
- Since nest-cli.json is still monolith, do not generate app yet.
- Plan future extraction only.
- Propose exact future files for marketing-api.
- Propose required shared dependencies.
- Propose port for marketing-api.
- Propose whether auth/JWT is needed. Expected: no.
- Propose future smoke test:
  GET /api/public/rooms

TASK 6 — EXECUTION ORDER RECOMMENDATION
Recommend the safest ACT order after this PLAN:
- V5.8-A: small backend cleanup + KB-1 + KB-2?
- V5.8-B: marketing-api shell?
- V5.8-C: workspace migration?
Or another safer order.

Return format:
A. Executive summary
B. Public module verification
C. Checkout dead import cleanup plan
D. KB-1 renewal invoice ISSUED patch plan
E. KB-2 checkout complete open invoice guard plan
F. Marketing-api extraction plan
G. Recommended V5.8 ACT order
H. Exact allowed files for first ACT
I. Forbidden scope
J. Build commands
K. UAT checklist
L. Risks / unknowns

Stop after PLAN.
No edits.
```

---

## 5. Expected V5.8 ACT Split After PLAN

Do not assume final until V5.8 PLAN result is reviewed.

Expected safer split:

### V5.8-A — Backend low-risk cleanup + finance lifecycle guard

Candidate scope:

- Remove dead `StaysModule` import from `CheckoutRequestsModule`.
- KB-1: renewal invoice becomes `ISSUED` after renew approval.
- KB-2: `complete()` blocks open invoices.

Expected files:

```text
backend/src/modules/checkout-requests/checkout-requests.module.ts
backend/src/modules/renew-requests/renew-requests.service.ts
backend/src/modules/stays/stays.service.ts
```

Verification:

- Backend build PASS.
- Targeted API UAT for renew approval invoice status.
- Targeted API UAT for checkout blocked by open invoice and succeeds after invoice resolved.
- `git status --short` reviewed.

Forbidden:

- no workspace migration;
- no app generation;
- no schema change;
- no frontend split;
- no payment approval change;
- no marketing extraction yet.

### V5.8-B — Marketing-api plan/shell

Only after V5.8-A passes and V5.8-B PLAN is accepted.

Candidate scope:

- workspace migration plan;
- app shell plan;
- public module extraction path;
- no lifecycle dependency.

### V5.8-C — Workspace/shared foundation

Only after exact migration plan is accepted.

Candidate scope:

- `nest-cli.json` project format;
- `apps/core-api`, `apps/marketing-api` shell;
- `libs/shared` skeleton;
- path aliases.

This is high-risk and must not be mixed with KB-1/KB-2.

---

## 6. Roadmap Beyond V5.8

| Phase | Goal | Risk | Notes |
|---|---|---|---|
| V5.8-A | cleanup + KB-1/KB-2 | Low/Medium | business correctness before extraction |
| V5.8-B | marketing-api PLAN/shell | Low | public read-only |
| V5.8-C | workspace/shared skeleton | High | manual migration; small steps only |
| V5.9 | staff-api read-only | Low | tickets + inventory read-only |
| V5.10 | tenant-api read/request | Medium | only after renew/checkout/invoice guard stable |
| V5.11 | finance-api read/review | Medium | approval remains core |
| V5.12 | frontend API/router split | Medium | split API clients by surface |
| Later | owner-api | Deferred | avoid mini-monolith |

---

## 7. Definition of Done Rules

No phase is PASS unless:

1. Build relevant area passes.
2. Targeted UAT/manual verification performed for touched flow.
3. `git status --short` reviewed.
4. No unrelated file changes.
5. No hidden helper/debug files left.

Build success is not UAT PASS.

---

## 8. Completed / Historical Context

These are completed or baseline and should not be re-opened unless touched:

- Booking Mandiri PASS.
- Admin Approval PASS.
- Payment Submission Core PASS.
- Pricing Policy V1 PASS.
- Reminder Preview PASS.
- Reminder Mock Send PASS.
- Notification Center MVP COMPLETE.
- Announcement Access Guard PASS.
- Pending Meter Snapshot Fresh UAT PASS.
- Staff inventory read-only PASS.
- Manual Check-in UX Reliability PASS.
- Manual Check-in Business Automation implemented in code by `d1a7181` and hardened in V5.1–V5.2.
- Full checkout UAT PASS before KB-2 guard decision; future guard requires new targeted UAT when patched.

---

## 9. V5.9-A ACT — Multi-App Read-Only Shell Foundation

### Objective

Membuat fondasi Multi-App Shared-DB yang bisa dibuild tanpa memindahkan high-risk business logic.

### Scope implemented

```text
backend/src/common/bootstrap/kost48-bootstrap.ts
backend/src/modules/health/*
backend/src/apps/marketing-api/*
backend/src/apps/staff-api/*
backend/src/apps/finance-api/*
backend/src/modules/staff-readonly/*
backend/src/modules/finance-readonly/*
backend/package.json scripts
```

### Port convention

| App | Port lokal | Scope |
|---|---:|---|
| core-api | 3000 | Existing monolith/core lifecycle |
| marketing-api | 3001 | Public room/marketing read-only |
| staff-api | 3002 | Staff read-only rooms/inventory/room-items/tickets |
| finance-api | 3003 | Finance read-only invoices/review queue/reports |

### Verification

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\VERIFY_V5_9_A_MULTI_APP.ps1
```

### Multi-port UAT

Start each app in separate PowerShell terminal after build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; $env:PORT=3000; npm run start:core
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; $env:PORT=3001; npm run start:marketing
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; $env:PORT=3002; npm run start:staff
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; $env:PORT=3003; npm run start:finance
```

Then run:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\UAT_V5_9_A_MULTI_APP_SMOKE.ps1
```

### Forbidden still active

- No payment approval move to finance-api.
- No inventory/ticket mutation move to staff-api.
- No tenant-api lifecycle execution.
- No schema change.
- No separate DB.
