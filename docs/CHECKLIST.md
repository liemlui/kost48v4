# KOST48 V5 — Active Checklist
**Versi:** 2026-05-19 V5.13 release readiness checklist sync

## A. Start Hygiene

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
  ```
- [ ] Confirm working tree state.
- [ ] PowerShell only.
- [ ] API tests use `Invoke-RestMethod`.
- [ ] No DB reset unless user explicitly asks.
- [ ] No new `.md` docs.

## B. V5.10-A Verification

- [ ] No backend import `from 'src/...` remains.
- [ ] `CompleteStayModal` says checkout cannot proceed when open invoice exists.
- [ ] Confirm button disabled when unpaid/open invoice count > 0.
- [ ] `AuditLogModule` imports `PrismaModule` explicitly.
- [ ] Prisma `binaryTargets` appropriate for dev/source-lite.
- [ ] Backend build PASS.
- [ ] Frontend build PASS.
- [ ] Smoke API PASS.

## C. V5.10-B Renew Request

- [ ] Backend approve DTO accepts `plannedCheckOutDate`.
- [ ] Backend approve DTO accepts `agreedRentAmountRupiah`.
- [ ] Backend approve DTO accepts `reviewNotes`.
- [ ] Backend create DTO accepts optional `requestedCheckOutDate`.
- [ ] Frontend `ApproveRenewRequestPayload` matches backend.
- [ ] Admin renew modal can send approval notes.
- [ ] Approval locks renew request row with `FOR UPDATE`.
- [ ] Stay extension, invoice issue, and request approval happen in one transaction.
- [ ] Double approval rejected.
- [ ] Renewal invoice is `ISSUED`.

## D. V5.10-C Staff Boundary

- [ ] STAFF can read meter readings.
- [ ] STAFF cannot create/update meter readings.
- [ ] STAFF can read expenses.
- [ ] STAFF cannot create/update/delete expenses.
- [ ] STAFF can read wifi sales.
- [ ] STAFF cannot create/update/delete wifi sales.
- [ ] Tickets operational staff behavior preserved.

## E. V5.10-D Finance Boundary

- [ ] Payment review queue still OWNER/ADMIN.
- [ ] Payment approval still OWNER/ADMIN only.
- [ ] Invoice mutation still OWNER/ADMIN only.
- [ ] Invoice payment mutation still OWNER/ADMIN only.
- [ ] Staff read visibility remains only where intended.

## F. V5.10-E Docs Sync

- [ ] Active architecture says Stable Modular Monolith.
- [ ] Multi-app described as roadmap only.
- [ ] V5.8 stale wording removed.
- [ ] V5.10-B/C/D changes documented.
- [ ] No new markdown files created.

## G. V5.10-F UAT Commands

Backend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
```

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Smoke:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```

## H. Deferred

- [ ] Multi-app shell.
- [ ] Workspace migration.
- [ ] Owner-api.
- [ ] Payment gateway.
- [ ] DepositTransaction model.
- [ ] Damage/penalty model.


## H. V5.11 Checkout Filter + Regression Pack

- [ ] Backend build PASS after checkout request filter patch.
- [ ] Frontend build PASS after `StayDetailPage` query patch.
- [ ] `GET /api/admin/checkout-requests?status=PENDING&stayId=1` returns success.
- [ ] `GET /api/admin/checkout-requests?stayId=abc` returns HTTP 400.
- [ ] `StayDetailPage` no longer loads all pending/approved checkout requests for a single stay detail check.
- [ ] `scripts/uat/KOST48_V511_SMOKE.ps1` PASS.
- [ ] `scripts/uat/KOST48_V511_STAFF_BOUNDARY.ps1` PASS.
- [ ] No schema change.
- [ ] No multi-app files created.
- [ ] `git status --short` reviewed before commit.


## I. V5.12 Renew + Checkout Full Business UAT Pack

- [ ] Backend build PASS after applying V5.12 scripts/docs.
- [ ] Frontend build PASS after applying V5.12 scripts/docs.
- [ ] `scripts/uat/KOST48_V512_RENEW_UAT.ps1` PASS.
- [ ] Renew script proves tenant renew create -> admin approve -> invoice `ISSUED`.
- [ ] Renew script proves double approval rejected with HTTP 409.
- [ ] Renew script proves tenant can see approved renew request and renewal invoice.
- [ ] `scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1` PASS.
- [ ] Checkout guard script proves open invoice blocks checkout with HTTP 409.
- [ ] Checkout guard script proves paid invoice allows checkout final.
- [ ] Checkout guard script proves room becomes `AVAILABLE` after checkout final.
- [ ] `scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1` PASS.
- [ ] Payment script proves partial payment => `PARTIAL`.
- [ ] Payment script proves overpayment rejected with HTTP 409.
- [ ] Payment script proves remaining payment => `PAID`.
- [ ] `scripts/uat/KOST48_V512_FULL_REGRESSION.ps1` PASS.
- [ ] No schema change.
- [ ] No DB reset.
- [ ] No multi-app files created.
- [ ] `git status --short` reviewed before commit.

V5.12 full command:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V512_FULL_REGRESSION.ps1
```
## V5.13 Release Readiness Checklist

- [ ] Confirm clean git status before release prep.
- [ ] Confirm latest baseline includes commit `e93c78a` or newer.
- [ ] Run local release check:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\release\KOST48_V513_LOCAL_RELEASE_CHECK.ps1
  ```
- [ ] Create source-lite ZIP:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\release\KOST48_V513_CREATE_SOURCE_LITE_ZIP.ps1
  ```
- [ ] Run local smoke after backend is running if needed:
  ```powershell
  Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
  ```
- [ ] Run production-safe smoke after deployment:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\uat\KOST48_V513_PRODUCTION_SAFE_SMOKE.ps1 -BaseApi "https://api.kost48surabaya.com/api"
  ```
- [ ] Do not reset production DB.
- [ ] Do not run UAT scripts that create data against production.
- [ ] Do not claim production PASS until smoke returns PASS.
