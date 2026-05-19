# KOST48 V5 — Ground State
**Versi:** 2026-05-19 V5.13 release readiness sync  
**Status:** Source of truth utama untuk sesi berikutnya.

## 0. Current Command Center State

KOST48 sekarang berada pada track:

```text
Active architecture: Stable Modular Monolith
Current phase: V5.13 Production Deployment Readiness & Release Pack
Default mode: PLAN ONLY, kecuali user eksplisit minta ACT
Multi-app: ROADMAP ONLY, bukan implementasi aktif
```

Environment tetap:

- Windows + VS Code + PowerShell
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript + React-Bootstrap + TanStack Query
- Auth: JWT Bearer
- API lokal: `http://localhost:3000/api`
- Frontend lokal: `http://localhost:5173`
- DB dev/UAT: `localhost:5433 / kost48_v3_pro / postgres`
- Project root:

```text
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle
```


## 0.1 Latest Verified Baseline — V5.11

Local verification reported by user:

```text
V5.10-V5.11 committed and pushed as f82a296.
Public rooms smoke PASS.
Admin login PASS.
Notifications PASS.
Payment review queue PASS.
V5.11 smoke pack PASS.
V5.11 staff boundary regression PASS.
```

V5.12 focuses on full business UAT scripts, not new feature scope:

- renew full UAT,
- checkout final invoice guard UAT,
- invoice payment regression,
- repeatable PowerShell scripts under `scripts/uat`.

No schema change, DB reset, multi-app, or workspace migration in V5.12.

## 1. Hard Rules

1. Jangan rewrite total.
2. Jangan patch sebelum paham file asli.
3. Jangan campur PLAN dan ACT.
4. Semua command harus PowerShell.
5. API test wajib `Invoke-RestMethod`, bukan curl.
6. Jangan reset DB kecuali user eksplisit minta.
7. Jangan klaim PASS tanpa build + runtime + UAT/manual verification.
8. Jangan kerja di luar project root.
9. Jangan buat `.md` baru kecuali user minta.
10. Jangan buka multi-app/workspace migration tanpa bounded plan baru.

## 2. Decision D Locked

V5.9 multi-app shell pernah dicoba terlalu agresif lalu rollback. Keputusan aktif sekarang:

```text
Stable Modular Monolith first.
No apps/ generation.
No runtime alias mirror hack.
No core-api/tenant-api/staff-api/finance-api/marketing-api shell now.
No service-to-service HTTP now.
No workspace migration now.
```

Multi-app Shared-DB tetap boleh dibahas sebagai future roadmap setelah monolith boundary matang, tetapi bukan active implementation.

## 3. Known Baseline After V5.10-A

V5.10-A hardening applied/expected:

- Absolute import `src/...` diganti menjadi relative import.
- `AuditLogModule` explicit import `PrismaModule`.
- Prisma `binaryTargets` diringkas ke `['native']` untuk source-lite/dev hygiene.
- `CompleteStayModal` disesuaikan dengan backend checkout guard.
- Frontend critical finance/tenant query dibuat lebih fresh dengan `refetchOnWindowFocus`.

User reported build/runtime smoke success after local verification for:

- `GET /api/public/rooms`
- `POST /api/auth/login`
- `GET /api/me/notifications`
- `GET /api/payment-submissions/review-queue`

Tetap jangan klaim full PASS tanpa targeted UAT flow.

## 4. V5.10-B/C/D/E/F Patch Intent

Patch berikutnya membawa monolith boundary hardening:

- V5.10-B: Renew request contract hardening.
- V5.10-C: Staff write boundary hardening for billing/finance-sensitive surfaces.
- V5.10-D: Finance read/review vs write boundary hardening.
- V5.10-E: Docs sync to Stable Modular Monolith.
- V5.10-F: UAT/checklist refresh.

## 5. Locked Business Guards

Jangan hilangkan:

1. CheckoutRequestsModule tidak import dead `StaysModule`.
2. `StaysService.renewStay()` menerbitkan renewal invoice sebagai `ISSUED`.
3. `StaysService.complete()` block checkout final jika ada open invoice.
4. Open invoice = status bukan `PAID` dan bukan `CANCELLED`.
5. `DRAFT` ikut block checkout.
6. `complete()` tidak auto-create final utility invoice.
7. `StaysQueryService.openInvoiceCount` memakai semantics `NOT IN [PAID, CANCELLED]`.

## 6. Core Ownership Rules

Tetap core monolith:

- Stay lifecycle writes.
- Room occupancy/status writes.
- Manual check-in.
- Booking approval.
- Checkout final.
- Renew execution.
- Payment approval that mutates invoice/stay/room/meter/deposit.
- Meter promotion.
- Deposit settlement.

Tenant surface boleh create request/submission dan read own data, tetapi tidak mengeksekusi final lifecycle.

Staff surface sekarang diarahkan ke low-risk operational/read-only surfaces. Billing/finance-sensitive writes harus OWNER/ADMIN unless explicitly decided otherwise.

## 7. Start-of-Session Command

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Jika dirty, identifikasi dulu file berubah. Jangan mulai ACT besar.

## 8. Verification Commands

Backend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
```

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Runtime:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run start:dev
```

Smoke API:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```


## 9. V5.11 Current Addendum

V5.11 focuses on targeted UAT/regression readiness inside the stable modular monolith.

Active V5.11 scope:

- admin checkout request `stayId` filter,
- `StayDetailPage` scoped checkout request query,
- PowerShell smoke and staff-boundary scripts,
- no schema change,
- no DB reset,
- no multi-app.

This does not change the ownership rule: checkout final remains in `StaysService.complete()` and request approval does not execute final checkout.
## V5.13 Release Baseline

Latest stable baseline after user local verification:

```text
Commit: e93c78a
Branch: main
Remote: origin/main
Status: V5.12 full regression PASS and pushed
Next phase: V5.13 Production Deployment Readiness & Release Pack
```

Verified by local UAT before V5.13:

- Public rooms smoke PASS.
- Admin login PASS.
- Notifications smoke PASS.
- Payment review queue smoke PASS.
- V5.11 smoke + staff boundary scripts PASS.
- V5.12 renew full UAT PASS.
- V5.12 checkout guard UAT PASS.
- V5.12 payment regression PASS.

V5.13 scope is release readiness only:

- safe production smoke script,
- source-lite ZIP script,
- local release check script,
- deployment checklist/update docs,
- no schema change,
- no DB reset,
- no multi-app implementation.
