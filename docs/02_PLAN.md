# KOST48 V5 — Execution Plan
**Versi:** 2026-05-19 V5.13 release readiness plan sync

## 0. Current Execution Override

```text
Current phase: V5.13 Production Deployment Readiness & Release Pack
Default mode: PLAN ONLY unless user explicitly says ACT
Architecture: Stable Modular Monolith
Multi-app: roadmap only
```

Forbidden now:

- no `apps/`,
- no `core-api`/`tenant-api`/`staff-api`/`finance-api`/`marketing-api` shell,
- no workspace migration,
- no runtime alias mirror,
- no service-to-service HTTP,
- no schema change unless separately approved,
- no DB reset unless explicitly requested.

## 1. V5.10-A — Completed/Applied Target

Scope:

- absolute import hygiene,
- Prisma generated size hygiene,
- `AuditLogModule` dependency explicit,
- checkout final UX aligned with backend invoice guard,
- query freshness for important finance/tenant views.

Verification required locally:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

## 2. V5.10-B — Renew Request Contract Hardening

Goal:

- remove frontend/backend DTO mismatch,
- support optional planned checkout override on approval,
- support optional requested checkout date on tenant request,
- execute renew approval and stay/invoice mutation in one DB transaction,
- prevent duplicate/double approval via row lock and pending status check.

Files:

- `backend/src/modules/renew-requests/dto/approve-renew-request.dto.ts`
- `backend/src/modules/renew-requests/dto/create-renew-request.dto.ts`
- `backend/src/modules/renew-requests/renew-requests.service.ts`
- `backend/src/modules/renew-requests/renew-requests.module.ts`
- `backend/src/modules/stays/stays.service.ts`
- `frontend/src/types/index.ts`
- `frontend/src/pages/renew-requests/RenewRequestsAdminPage.tsx`

## 3. V5.10-C — Staff Boundary Hardening

Goal:

- Staff remains low-risk read/operational role.
- Restrict billing/finance-sensitive writes to OWNER/ADMIN.

Patch target:

- meter readings: STAFF read only, OWNER/ADMIN write.
- expenses: STAFF read only, OWNER/ADMIN write/delete.
- wifi sales: STAFF read only, OWNER/ADMIN write/delete.

## 4. V5.10-D — Finance Boundary Hardening

Goal:

- Preserve read/review surfaces.
- Keep financial mutation and lifecycle-changing approval in core OWNER/ADMIN only.

Do not move:

- `PaymentSubmissionsService.approveSubmission()`.
- invoice payment mutation.
- payment approval that mutates stay/room/meter/deposit.

## 5. V5.10-E — Docs Sync

Update only active docs:

- `docs/00_GROUND_STATE.md`
- `docs/01_CONTRACTS.md`
- `docs/02_PLAN.md`
- `docs/CHECKLIST.md`
- `docs/03_DECISIONS_LOG.md`
- `docs/04_JOURNAL.md`
- `docs/CHANGELOG.md`

No new markdown docs by default.

## 6. V5.10-F — Verification/UAT

Required before claiming PASS:

1. Backend build PASS.
2. Frontend build PASS.
3. Backend runtime start PASS.
4. Smoke API PASS.
5. Renew approval UAT PASS.
6. Staff restriction UAT PASS.
7. Checkout final open invoice UAT PASS.
8. `git status --short` reviewed.

## 7. Next After V5.10

Only after V5.10 passes:

- consider marketing module further hardening inside monolith,
- audit route/API client split plan,
- revisit multi-app roadmap as PLAN only.


## 8. V5.11 — Checkout Filter + Regression Pack

Goal:

- reduce admin checkout request over-fetching on `StayDetailPage`,
- add backend `stayId` filter for admin checkout request lists,
- keep checkout request approval/final checkout ownership unchanged,
- provide repeatable PowerShell UAT scripts for smoke and staff boundary checks.

Scope:

- Backend: `CheckoutRequestsAdminController` and `CheckoutRequestsService` only.
- Frontend: `checkoutRequests` API client and `StayDetailPage` only.
- Scripts: PowerShell-only UAT scripts under `scripts/uat`.

Forbidden:

- no DB reset,
- no schema change,
- no multi-app,
- no workspace migration,
- no lifecycle flow rewrite,
- no change to `StaysService.complete()`,
- no change to payment approval.

Verification commands:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V511_SMOKE.ps1
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V511_STAFF_BOUNDARY.ps1
```


## 9. V5.12 — Renew + Checkout Full Business UAT Pack

Goal:

- prove renew request full flow after V5.10-B,
- prove checkout final invoice guard after V5.8-A/V5.10-A,
- prove invoice payment status transitions remain safe,
- keep all tests repeatable via PowerShell scripts.

Scope:

- Add UAT scripts only under `scripts/uat`.
- Update the 7 active docs only.
- No backend/frontend feature code unless a script reveals a real regression later.

Scripts:

```text
scripts/uat/KOST48_V512_RENEW_UAT.ps1
scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1
scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1
scripts/uat/KOST48_V512_FULL_REGRESSION.ps1
```

Verification commands:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V512_FULL_REGRESSION.ps1
```

Forbidden:

- no DB reset,
- no schema change,
- no multi-app shell,
- no workspace migration,
- no lifecycle rewrite,
- no payment approval extraction,
- no production DB touch.

Definition of done:

- backend build PASS,
- frontend build PASS,
- V5.12 full regression script PASS,
- `git status --short` reviewed,
- commit pushed.
## V5.13 — Production Deployment Readiness & Release Pack

### Objective

Prepare a safe release pack after V5.12 full regression PASS.

### Scope

- Add local release verification script.
- Add production-safe smoke script.
- Add source-lite ZIP creation script.
- Update active docs with V5.13 baseline.

### Not in scope

- No backend feature code.
- No frontend feature code.
- No Prisma schema change.
- No DB reset.
- No workspace/multi-app migration.
- No production mutation script.

### Recommended order

1. Run local release check.
2. Create source-lite ZIP.
3. Deploy/pull to target environment manually.
4. Run production-safe smoke.
5. Commit docs/scripts if successful.

### Commands

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\release\KOST48_V513_LOCAL_RELEASE_CHECK.ps1
```

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\release\KOST48_V513_CREATE_SOURCE_LITE_ZIP.ps1
```

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V513_PRODUCTION_SAFE_SMOKE.ps1 -BaseApi "https://api.kost48surabaya.com/api"
```
