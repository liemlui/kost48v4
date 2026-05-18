$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== KOST48 V5.6 Finance Read/Review Boundary Verification ===" -ForegroundColor Cyan
Write-Host "Root: $Root"

Write-Host "`n[1/5] Git status" -ForegroundColor Yellow
git status --short

Write-Host "`n[2/5] Static patch marker checks" -ForegroundColor Yellow
$checks = @(
  @{ Path = "backend/src/modules/invoices/invoices.controller.ts"; Pattern = "@Roles\(UserRole\.OWNER, UserRole\.ADMIN\)"; Label = "Invoice mutation routes restricted to OWNER/ADMIN" },
  @{ Path = "backend/src/modules/invoices/invoices.service.ts"; Pattern = "assertFinanceMutationAllowed"; Label = "Invoice service-level finance mutation guard" },
  @{ Path = "backend/src/modules/invoice-payments/invoice-payments.controller.ts"; Pattern = "@Roles\(UserRole\.OWNER, UserRole\.ADMIN\)"; Label = "Invoice payment create route restricted to OWNER/ADMIN" },
  @{ Path = "backend/src/modules/invoice-payments/invoice-payments.service.ts"; Pattern = "assertFinanceMutationAllowed"; Label = "Invoice payment service-level finance mutation guard" },
  @{ Path = "frontend/src/pages/invoices/InvoicesPage.tsx"; Pattern = "canManageFinance"; Label = "Invoice list UI has finance manage guard" },
  @{ Path = "frontend/src/pages/invoices/InvoiceDetailPage.tsx"; Pattern = "Mode baca staff"; Label = "Invoice detail UI shows staff read-only copy" }
)

foreach ($check in $checks) {
  if (!(Test-Path $check.Path)) {
    throw "Missing expected file: $($check.Path)"
  }
  $content = Get-Content $check.Path -Raw
  if ($content -notmatch $check.Pattern) {
    throw "Missing marker: $($check.Label) in $($check.Path)"
  }
  Write-Host "PASS - $($check.Label)" -ForegroundColor Green
}

Write-Host "`n[3/5] Backend build" -ForegroundColor Yellow
Push-Location "backend"
npm run build
Pop-Location

Write-Host "`n[4/5] Frontend build" -ForegroundColor Yellow
Push-Location "frontend"
npm run build
Pop-Location

Write-Host "`n[5/5] Final git status" -ForegroundColor Yellow
git status --short

Write-Host "`nV5.6 static verification + builds complete. Continue with V5_6_FINANCE_UAT_GUIDE.ps1 while backend is running." -ForegroundColor Cyan
