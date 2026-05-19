param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot

Write-Host "`n=== V5.12 FULL REGRESSION PACK ===" -ForegroundColor Cyan

& "$root\KOST48_V512_RENEW_UAT.ps1" -BaseUrl $BaseUrl -AdminIdentifier $AdminIdentifier -AdminPassword $AdminPassword
& "$root\KOST48_V512_CHECKOUT_GUARD_UAT.ps1" -BaseUrl $BaseUrl -AdminIdentifier $AdminIdentifier -AdminPassword $AdminPassword
& "$root\KOST48_V512_PAYMENT_REGRESSION.ps1" -BaseUrl $BaseUrl -AdminIdentifier $AdminIdentifier -AdminPassword $AdminPassword

Write-Host "`nV5.12 full regression pack PASS" -ForegroundColor Green
