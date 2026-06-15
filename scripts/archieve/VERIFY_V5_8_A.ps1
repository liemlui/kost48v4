param(
  [string]$ProjectRoot = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

Write-Step "KOST48 V5.8-A source verification"
Set-Location $ProjectRoot
Write-Host "ProjectRoot: $ProjectRoot"

git status --short
git log --oneline -5

$expectedFiles = @(
  "backend\src\modules\checkout-requests\checkout-requests.module.ts",
  "backend\src\modules\stays\stays.service.ts",
  "backend\src\modules\stays\stays-query.service.ts",
  "docs\00_GROUND_STATE.md",
  "docs\01_CONTRACTS.md",
  "docs\02_PLAN.md",
  "docs\CHECKLIST.md",
  "docs\03_DECISIONS_LOG.md",
  "docs\04_JOURNAL.md",
  "docs\CHANGELOG.md"
)

Write-Step "Check expected files exist"
foreach ($file in $expectedFiles) {
  if (-not (Test-Path $file)) { throw "Missing expected file: $file" }
  Write-Host "OK $file"
}

Write-Step "Static source assertions"
$checkoutModule = Get-Content "backend\src\modules\checkout-requests\checkout-requests.module.ts" -Raw
if ($checkoutModule -match "StaysModule") { throw "CheckoutRequestsModule still references StaysModule" }
Write-Host "OK CheckoutRequestsModule no longer references StaysModule"

$staysService = Get-Content "backend\src\modules\stays\stays.service.ts" -Raw
if ($staysService -notmatch "status:\s*\{\s*notIn:\s*\[InvoiceStatus\.PAID,\s*InvoiceStatus\.CANCELLED\]\s*\}") { throw "Open invoice guard not found in stays.service.ts" }
if ($staysService -notmatch "status:\s*InvoiceStatus\.ISSUED") { throw "Renewal invoice ISSUE update not found in stays.service.ts" }
if ($staysService -notmatch "Tidak bisa checkout final karena masih ada invoice") { throw "Checkout final Indonesian guard message not found" }
Write-Host "OK stays.service.ts contains V5.8-A guards"

$staysQuery = Get-Content "backend\src\modules\stays\stays-query.service.ts" -Raw
if ($staysQuery -notmatch "notIn:\s*\[InvoiceStatus\.PAID,\s*InvoiceStatus\.CANCELLED\]") { throw "StaysQueryService open invoice count not updated" }
Write-Host "OK StaysQueryService open invoice semantics updated"

if (-not $SkipBuild) {
  Write-Step "Backend build"
  Set-Location "$ProjectRoot\backend"
  npm run build
}

Write-Step "Verification script complete"
Write-Host "If build passed locally, continue with scripts\UAT_V5_8_A_SMOKE.ps1" -ForegroundColor Green
