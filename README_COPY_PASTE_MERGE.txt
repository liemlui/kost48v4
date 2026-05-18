KOST48 V5.8-A OVERLAY MERGE INSTRUCTIONS

IMPORTANT
This is an overlay patch. It is not an installer and has no APPLY_*.ps1 script.
Copy/merge folders manually into the project root and choose Merge/Replace when Windows asks.

PROJECT ROOT
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle

STEP 1 — BACKUP / CHECK GIT STATUS
Open PowerShell:

Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5

STEP 2 — COPY/MERGE OVERLAY
From the extracted ZIP folder:
- Copy backend\ into project root and choose Merge/Replace.
- Copy docs\ into project root and choose Merge/Replace.
- Copy scripts\ into project root and choose Merge/Replace.
- frontend\ is intentionally empty in this overlay because no frontend code was changed.

STEP 3 — REVIEW CHANGED FILES
Run:

Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short

Expected changed files:
- backend/src/modules/checkout-requests/checkout-requests.module.ts
- backend/src/modules/stays/stays.service.ts
- backend/src/modules/stays/stays-query.service.ts
- docs/00_GROUND_STATE.md
- docs/01_CONTRACTS.md
- docs/02_PLAN.md
- docs/CHECKLIST.md
- docs/03_DECISIONS_LOG.md
- docs/04_JOURNAL.md
- docs/CHANGELOG.md
- scripts/VERIFY_V5_8_A.ps1
- scripts/UAT_V5_8_A_SMOKE.ps1

STEP 4 — RUN VERIFY + BUILD

Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\VERIFY_V5_8_A.ps1

Or build only:

Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build

STEP 5 — RUN BASIC SMOKE UAT
Backend must be running at http://localhost:3000/api.

Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; .\scripts\UAT_V5_8_A_SMOKE.ps1

STEP 6 — RUN TARGETED UAT WITH REAL IDS
Use real IDs from your DB. Do not use examples blindly.

Renew approval should return invoice.status ISSUED:
.\scripts\UAT_V5_8_A_SMOKE.ps1 -RenewRequestId 9

Checkout final should fail when stay still has open invoice:
.\scripts\UAT_V5_8_A_SMOKE.ps1 -StayIdWithOpenInvoice 9

Checkout final should succeed only when all stay invoices are PAID/CANCELLED:
.\scripts\UAT_V5_8_A_SMOKE.ps1 -StayIdReadyToComplete 10

Deposit process should fail when completed/cancelled stay still has open invoice:
.\scripts\UAT_V5_8_A_SMOKE.ps1 -DepositStayIdWithOpenInvoice 11

STEP 7 — DO NOT CLAIM PASS TOO EARLY
Only call V5.8-A PASS after:
- backend build passes;
- smoke endpoints pass;
- renew exact UAT proves invoice is ISSUED;
- checkout exact UAT proves open invoice blocks;
- checkout exact UAT proves all PAID/CANCELLED allows completion;
- git status reviewed.
