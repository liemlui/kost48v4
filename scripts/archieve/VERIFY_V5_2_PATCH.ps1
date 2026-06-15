$ErrorActionPreference = "Stop"

Write-Host "=== KOST48 V5.2 Patch Verification ==="
$root = Get-Location
Write-Host "Project root: $root"

$backendFile = Join-Path $root "backend/src/modules/stays/stays.service.ts"
$frontendFile = Join-Path $root "frontend/src/pages/stays/CheckInWizard.tsx"

if (!(Test-Path $backendFile)) { throw "Missing backend file: $backendFile" }
if (!(Test-Path $frontendFile)) { throw "Missing frontend file: $frontendFile" }

$backend = Get-Content $backendFile -Raw
$frontend = Get-Content $frontendFile -Raw

$requiredBackendMarkers = @(
  'tenant.email?.trim().toLowerCase()',
  'Prisma.QueryMode.insensitive',
  'this.prisma.user.findFirst',
  'status: InvoiceStatus.ISSUED',
  'temporaryPassword',
  'AUTO_CREATE_PORTAL_BY_CHECKIN'
)

foreach ($marker in $requiredBackendMarkers) {
  if ($backend -notlike "*$marker*") { throw "Backend marker missing: $marker" }
  Write-Host "OK backend marker: $marker"
}

$requiredFrontendMarkers = @(
  'useRef',
  'successExitTargetRef',
  'handleCloseSuccess(`/stays/${stay.id}`)',
  'Browser tidak mengizinkan salin otomatis',
  'Password sementara hanya muncul sekali'
)

foreach ($marker in $requiredFrontendMarkers) {
  if ($frontend -notlike "*$marker*") { throw "Frontend marker missing: $marker" }
  Write-Host "OK frontend marker: $marker"
}

Write-Host "=== Backend build ==="
Push-Location (Join-Path $root "backend")
npm run build
Pop-Location

Write-Host "=== Frontend build ==="
Push-Location (Join-Path $root "frontend")
npm run build
Pop-Location

Write-Host "=== Git status ==="
git status --short
Write-Host "V5.2 static/build verification complete. Continue with browser/API UAT before declaring PASS."
