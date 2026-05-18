# KOST48 V5 — Active Checklist
**Versi:** 2026-05-18 V5.7/V5.8 audit sync

---

---

## AA. V5.8-A Overlay Merge Checklist

- [ ] Copy/merge overlay into project root.
- [ ] Confirm changed source only includes intended files:
  - `backend/src/modules/checkout-requests/checkout-requests.module.ts`
  - `backend/src/modules/stays/stays.service.ts`
  - `backend/src/modules/stays/stays-query.service.ts`
  - active docs updates
  - optional scripts under `scripts/`
- [ ] Run backend build.
- [ ] Run public/protected smoke commands.
- [ ] UAT renew approval: invoice returned/created as `ISSUED`.
- [ ] UAT checkout final: open invoice blocks with Indonesian error listing invoice references.
- [ ] UAT checkout final: all invoices `PAID`/`CANCELLED` allows completion.
- [ ] UAT deposit process: open invoice blocks deposit processing.
- [ ] Review `git status --short`.
- [ ] Commit only after build/UAT evidence.

Do not mark V5.8-A PASS until these are complete locally.

## A. Start-of-Session Hygiene

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
  ```
- [ ] Confirm branch from local git. Latest evidence: `main/origin/main`.
- [ ] Do not assume working tree clean.
- [ ] Do not start ACT if untracked/modified files are unresolved.
- [ ] PowerShell only.
- [ ] API test uses `Invoke-RestMethod`, not curl.
- [ ] Do not reset DB unless explicitly asked.
- [ ] Do not create new `.md` docs.

---

## B. V5.7 Closeout Checklist

### B1. Cline rules / ignore

- [ ] `.clinerules` updated to KOST48 V5.
- [ ] `.clineignore` updated with active source-of-truth comments.
- [ ] No corrupt duplicate `staff-api`/`finance-api` section.
- [ ] Branch wording matches actual local branch.
- [ ] Rules committed separately from frontend code.

### B2. MyInvoicesPage resolution

- [ ] Check if `frontend/src/pages/portal/MyInvoicesPage.tsx` exists.
- [ ] Confirm it is imported/used by `frontend/src/App.tsx` route `/portal/invoices`.
- [ ] Run frontend build before commit:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
  ```
- [ ] If build PASS, commit MyInvoicesPage separately.
- [ ] If build FAIL, do not commit; paste error to command center.

### B3. V5.7-B audit accepted

- [x] CheckoutRequests dependency verified.
- [x] RenewRequests dependency verified.
- [x] PaymentSubmissions approval transaction verified.
- [x] TenantBookings approval transaction verified.
- [x] StaysService create/complete/renew behavior verified.
- [x] Public module read-only candidate verified.
- [x] Workspace verdict: `NEEDS MANUAL MIGRATION`.

---

## C. V5.8 PLAN Gate

V5.8 PLAN may start only if:

- [ ] Working tree clean or remaining changes explicitly known.
- [ ] `.clinerules/.clineignore` resolved.
- [ ] MyInvoicesPage resolved.
- [x] Public/marketing module read-only confirmed.
- [x] Payment approval stays core confirmed.
- [x] Renew approval/execution stays core confirmed.
- [x] Booking approval stays core confirmed.
- [x] Checkout admin processing stays core confirmed.
- [x] Room writes stay core confirmed.
- [x] Meter promotion stays core confirmed.

V5.8 mode:

- [ ] PLAN ONLY first.
- [ ] No code changes.
- [ ] No file creation.
- [ ] No nest-cli.json modification.
- [ ] No app.module.ts modification.
- [ ] No module moves.
- [ ] No schema changes.
- [ ] No DB mutation.

---

## D. V5.8 PLAN Tasks

Cline PLAN must produce:

- [ ] Public module verification:
  - endpoints,
  - Prisma models read,
  - no writes,
  - imports,
  - extraction verdict.
- [ ] Checkout dead import cleanup plan:
  - exact import line,
  - risk,
  - file for ACT.
- [ ] KB-1 renewal invoice ISSUED plan:
  - choose patch location,
  - exact expected behavior,
  - files,
  - UAT.
- [ ] KB-2 checkout open invoice guard plan:
  - guard query,
  - open invoice definition,
  - error message,
  - UAT.
- [ ] Marketing-api extraction plan:
  - future files,
  - shared deps,
  - port,
  - auth need/no need,
  - smoke test.
- [ ] Recommended ACT order.

---

## E. V5.8-A Expected ACT Checklist — After PLAN Approval Only

Likely scope:

- [ ] Remove dead `StaysModule` import from `CheckoutRequestsModule`.
- [ ] KB-1: renewal invoice becomes `ISSUED` after admin renew approval.
- [ ] KB-2: `StaysService.complete()` blocks open invoices.

Allowed likely files:

```text
backend/src/modules/checkout-requests/checkout-requests.module.ts
backend/src/modules/renew-requests/renew-requests.service.ts
backend/src/modules/stays/stays.service.ts
```

Forbidden in V5.8-A:

- [ ] No `nest-cli.json` migration.
- [ ] No app generation.
- [ ] No `app.module.ts` split.
- [ ] No schema change.
- [ ] No payment approval change.
- [ ] No frontend split.
- [ ] No marketing app shell.

Build/UAT:

- [ ] Backend build PASS.
- [ ] Renew request approve creates/sets invoice `ISSUED`.
- [ ] Checkout final with open invoice fails.
- [ ] Checkout final with all invoices `PAID`/`CANCELLED` succeeds.
- [ ] `git status --short` reviewed.

---

## F. V5.8-B Marketing-api Plan/Shell Gate

Do not start until V5.8-A is reviewed/pass.

Requirements:

- [ ] Public module remains read-only.
- [ ] No lifecycle imports.
- [ ] No auth/JWT required for public endpoints.
- [ ] Workspace migration plan accepted.
- [ ] `marketing-api` port decided.
- [ ] Existing `/api/public/rooms` behavior preserved.

Forbidden:

- [ ] No Room status writes.
- [ ] No booking approval.
- [ ] No tenant private data.
- [ ] No payment/renew/checkout logic.

---

## G. V5.9+ Future Gates

### V5.9 — staff-api

- [ ] Tickets scope audited.
- [ ] Inventory read-only endpoints verified.
- [ ] Staff mutation block UAT preserved.
- [ ] Room status writes remain core.

### V5.10 — tenant-api read/request

Prerequisites:

- [ ] KB-1 deployed and UAT PASS.
- [ ] KB-2 deployed and UAT PASS.
- [ ] Checkout/Renew create/view methods isolated.
- [ ] Tenant isolation verified.
- [ ] No lifecycle execution in tenant-api.

### V5.11 — finance-api read/review

- [ ] `findReviewQueue()` read-only verified.
- [ ] Invoices read/list verified.
- [ ] Payment approval remains core.
- [ ] Reports read-only verified.

### V5.12 — frontend split

- [ ] API clients split plan.
- [ ] App.tsx route split plan.
- [ ] Shared UI/components plan.
- [ ] No premature separate repo.

---

## H. Completed / Do Not Repeat Unless Touched

- [x] Booking Mandiri PASS.
- [x] Admin Approval PASS.
- [x] Payment Submission Core PASS.
- [x] Pricing Policy V1 PASS.
- [x] Reminder Preview PASS.
- [x] Reminder Mock Send PASS.
- [x] Notification Center MVP COMPLETE.
- [x] Announcement Access Guard PASS.
- [x] Pending Meter Snapshot Fresh UAT PASS.
- [x] Staff inventory read-only PASS.
- [x] Manual Check-in UX Reliability PASS.
- [x] Manual Check-in Business Automation implemented according to audit.
- [x] Full checkout UAT baseline PASS.
- [x] Production frontend/backend connection PASS.

Retest only if touched.

---

## I. Deferred

- [ ] Real WhatsApp provider.
- [ ] Scheduler/cron reminder.
- [ ] Browser push/service worker/PWA push.
- [ ] SSE/websocket notification stream.
- [ ] Advanced stage-aware announcement audience.
- [ ] KTP upload.
- [ ] Damage photo upload.
- [ ] Payment gateway.
- [ ] DB unique constraint pending data audit/cleanup.
- [ ] DepositTransaction / DepositLog schema.
- [ ] Damage/penalty model.
- [ ] Owner-api.
