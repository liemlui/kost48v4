# KOST48 V5.3 verification script
# PowerShell only. Run from project root.

$ErrorActionPreference = "Stop"

Write-Host "=== KOST48 V5.3 Marketing Read-only Patch Verification ==="
Write-Host "Project root: $(Get-Location)"

Write-Host "`n[1/6] Git status"
git status --short

Write-Host "`n[2/6] Check expected files"
$expectedFiles = @(
  "backend/src/modules/marketing/marketing.module.ts",
  "backend/src/modules/marketing/marketing-public-rooms.controller.ts",
  "backend/src/modules/marketing/marketing-public-rooms.service.ts",
  "backend/src/modules/marketing/dto/public-rooms-query.dto.ts",
  "backend/src/modules/tenant-bookings/tenant-bookings.module.ts",
  "backend/src/app.module.ts"
)
foreach ($file in $expectedFiles) {
  if (-not (Test-Path $file)) {
    throw "Missing expected file: $file"
  }
  Write-Host "OK $file"
}

Write-Host "`n[3/6] Check deprecated public room files are not still active in TenantBookingsModule"
$tenantBookingsModule = Get-Content "backend/src/modules/tenant-bookings/tenant-bookings.module.ts" -Raw
if ($tenantBookingsModule -match "PublicRoomsController" -or $tenantBookingsModule -match "PublicRoomsService") {
  throw "TenantBookingsModule still registers PublicRoomsController/PublicRoomsService. Run .\scripts\APPLY_V5_3_CLEANUP.ps1 and re-check module content."
}
Write-Host "OK TenantBookingsModule no longer owns public room routes"

Write-Host "`n[4/6] Backend build"
Push-Location backend
npm run build
Pop-Location

Write-Host "`n[5/6] Frontend build"
Push-Location frontend
npm run build
Pop-Location

Write-Host "`n[6/6] Optional local API smoke test"
Write-Host "If backend is running, execute this manually:"
Write-Host 'Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"'
Write-Host 'Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms/1"'

Write-Host "`nV5.3 verification script completed. Build PASS above is required before claiming PASS."
