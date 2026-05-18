$ErrorActionPreference = "Stop"

Write-Host "== KOST48 V5.4 Staff Read-only Boundary Verification ==" -ForegroundColor Cyan

$root = Get-Location
Write-Host "Project root: $root"

$requiredFiles = @(
  "backend\src\modules\room-items\room-items.controller.ts",
  "backend\src\modules\room-items\room-items.service.ts",
  "backend\src\modules\inventory-items\inventory-items.service.ts",
  "backend\src\modules\inventory-movements\inventory-movements.service.ts",
  "backend\src\modules\rooms\rooms.service.ts",
  "frontend\src\config\resources.ts",
  "frontend\src\pages\resources\SimpleCrudPage.tsx"
)

foreach ($file in $requiredFiles) {
  if (!(Test-Path $file)) {
    throw "Missing required patched file: $file"
  }
}

$roomItemsController = Get-Content "backend\src\modules\room-items\room-items.controller.ts" -Raw
if ($roomItemsController -notmatch "@Post\(\)\s*\r?\n\s*@Roles\(UserRole\.OWNER, UserRole\.ADMIN\)") {
  throw "room-items POST is not restricted to OWNER/ADMIN."
}
if ($roomItemsController -notmatch "@Patch\(':id'\)\s*\r?\n\s*@Roles\(UserRole\.OWNER, UserRole\.ADMIN\)") {
  throw "room-items PATCH is not restricted to OWNER/ADMIN."
}

$backendChecks = @(
  "backend\src\modules\room-items\room-items.service.ts",
  "backend\src\modules\inventory-items\inventory-items.service.ts",
  "backend\src\modules\inventory-movements\inventory-movements.service.ts",
  "backend\src\modules\rooms\rooms.service.ts"
)
foreach ($file in $backendChecks) {
  $text = Get-Content $file -Raw
  if ($text -notmatch "assertOwnerOrAdmin") {
    throw "$file does not contain service-level assertOwnerOrAdmin guard."
  }
  if ($text -notmatch "ForbiddenException") {
    throw "$file does not import/use ForbiddenException."
  }
}

$resources = Get-Content "frontend\src\config\resources.ts" -Raw
foreach ($path in @("/rooms", "/inventory-items", "/inventory-movements", "/room-items")) {
  if ($resources -notmatch [regex]::Escape($path)) {
    throw "frontend resources guard missing path $path."
  }
}
if ($resources -notmatch "getStaffReadOnlyReason") {
  throw "frontend resources guard missing getStaffReadOnlyReason."
}

$simpleCrud = Get-Content "frontend\src\pages\resources\SimpleCrudPage.tsx" -Raw
if ($simpleCrud -notmatch "Mode baca staff") {
  throw "SimpleCrudPage missing staff read-only notice."
}

Write-Host "Static patch markers PASS" -ForegroundColor Green

Write-Host "\nRunning backend build..." -ForegroundColor Cyan
Push-Location "backend"
npm run build
Pop-Location

Write-Host "\nRunning frontend build..." -ForegroundColor Cyan
Push-Location "frontend"
npm run build
Pop-Location

Write-Host "\nV5.4 build verification PASS" -ForegroundColor Green
Write-Host "Next: run scripts\V5_4_STAFF_UAT_GUIDE.ps1 manually while backend API is running." -ForegroundColor Yellow
