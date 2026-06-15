# KOST48 V5.2 B1 Manual UAT Guide
# Run these from the project root after backend/frontend are running locally.
# This guide intentionally does not reset DB. Use fresh manual test data from the UI unless you explicitly choose to reset dev/UAT DB.

$baseUrl = "http://localhost:3000/api"
$adminToken = "PASTE_ADMIN_OR_OWNER_TOKEN_HERE"
$tenantToken = "PASTE_NEW_TENANT_TOKEN_AFTER_TEMP_PASSWORD_LOGIN"

Write-Host "1) Login admin/owner first via browser or PowerShell, then paste token into `$adminToken."
Write-Host "2) Browser UAT: open http://localhost:5173/stays/check-in and create manual check-in tenant with email."
Write-Host "3) Expected: success modal shows invoice ISSUED + portal CREATED + temp password once."
Write-Host "4) Copy temp password, login as tenant, then verify current stay and invoice."
Write-Host "5) Edge cases to test manually: MISSING_EMAIL, ALREADY_ACTIVE, email conflict."

# Example protected checks after you have tokens:
# Invoke-RestMethod -Method Get -Uri "$baseUrl/stays" -Headers @{Authorization="Bearer $adminToken"}
# Invoke-RestMethod -Method Get -Uri "$baseUrl/tenant/stays/current" -Headers @{Authorization="Bearer $tenantToken"}
# Invoke-RestMethod -Method Get -Uri "$baseUrl/tenant/invoices" -Headers @{Authorization="Bearer $tenantToken"}
