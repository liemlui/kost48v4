$ErrorActionPreference = "Stop"

Write-Host "=== KOST48 V5.5 Tenant Boundary Patch Verification ===" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "\n[1/5] Git status" -ForegroundColor Yellow
git status --short

Write-Host "\n[2/5] Required patched files exist" -ForegroundColor Yellow
$required = @(
  "backend/src/modules/announcements/announcements.service.ts",
  "backend/src/modules/invoices/invoices.service.ts",
  "backend/src/modules/stays/stays-query.service.ts"
)
foreach ($file in $required) {
  if (!(Test-Path $file)) { throw "Missing required file: $file" }
  Write-Host "OK $file"
}

Write-Host "\n[3/5] Static guard checks" -ForegroundColor Yellow
$announcements = Get-Content "backend/src/modules/announcements/announcements.service.ts" -Raw
if ($announcements -notmatch "hasTenantOccupiedStay") { throw "Missing hasTenantOccupiedStay guard in announcements service" }
if ($announcements -notmatch "Pengumuman operasional hanya tersedia") { throw "Missing tenant operational announcement forbidden message" }
if ($announcements -notmatch "RoomStatus\.OCCUPIED") { throw "Missing occupied room status guard for tenant announcements" }

$invoices = Get-Content "backend/src/modules/invoices/invoices.service.ts" -Raw
if ($invoices -notmatch "Akun tenant belum terhubung ke data tenant") { throw "Missing explicit tenant linkage guard in invoices service" }
if ($invoices -notmatch "stay: \{ tenantId: user\.tenantId \}") { throw "Invoices findMine is not clearly tenant-scoped" }

$stays = Get-Content "backend/src/modules/stays/stays-query.service.ts" -Raw
if ($stays -notmatch "ConflictException") { throw "Missing ConflictException import/use in stays query service" }
if ($stays -notmatch "tenantId: user\.tenantId, status: StayStatus\.ACTIVE") { throw "Current stay query is not clearly tenant-scoped" }
Write-Host "Static checks PASS" -ForegroundColor Green

Write-Host "\n[4/5] Backend build" -ForegroundColor Yellow
Push-Location "backend"
npm run build
Pop-Location

Write-Host "\n[5/5] Frontend build" -ForegroundColor Yellow
Push-Location "frontend"
npm run build
Pop-Location

Write-Host "\nV5.5 verification script completed. Run V5_5_TENANT_UAT_GUIDE.ps1 with API running for manual endpoint checks." -ForegroundColor Green
