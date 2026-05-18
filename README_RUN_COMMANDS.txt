KOST48 PS1 REGEN PACK

Files:
1. KOST48_RESET_AND_FULL_UAT_FINAL_IDENTITY.ps1
   - Full reset/build/identity regression.
2. KOST48_RESET_AND_FULL_UAT_FINAL_B1.ps1
   - Full reset/build/B1 regression.
3. KOST48_RESET_AND_FULL_UAT_FINAL_B2.ps1
   - Full reset/build/B2 regression, includes B2-1 section.
4. KOST48_UAT_B2_1_INVOICE_PAYMENT_FOCUSED.ps1
   - Focused no-reset/no-build B2-1 invoice-only payment test.

Run from project root in Windows PowerShell:
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\KOST48_RESET_AND_FULL_UAT_FINAL_B2.ps1

Recommended order now:
1. Copy all files to project root.
2. Run full B2 script because DB is dirty from focused tests.
3. If full B2 PASS, do browser visual check.
4. Commit B2-1.
