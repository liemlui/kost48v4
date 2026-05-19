param(
  [string]$ProjectRoot = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
)

$ErrorActionPreference = "Stop"

function Section($name) { Write-Host "`n== $name ==" -ForegroundColor Cyan }
function Pass($message) { Write-Host "PASS: $message" -ForegroundColor Green }
function Fail($message) { throw "FAIL: $message" }

Section "Project root"
if (-not (Test-Path $ProjectRoot)) { Fail "Project root not found: $ProjectRoot" }
Set-Location $ProjectRoot
Pass "Project root exists"

Section "Git baseline"
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$commit = (git rev-parse --short HEAD).Trim()
Write-Host "Branch: $branch"
Write-Host "Commit: $commit"
$status = git status --short
if ($status) {
  Write-Host $status
  Fail "Working tree is not clean. Commit/stash/restore first."
}
Pass "Working tree clean"

Section "Backend build"
Push-Location (Join-Path $ProjectRoot "backend")
npm run build:local
Pop-Location
Pass "Backend build:local completed"

Section "Frontend build"
Push-Location (Join-Path $ProjectRoot "frontend")
npm run build
Pop-Location
Pass "Frontend build completed"

Section "Release readiness"
Write-Host "V5.13 local release check PASS" -ForegroundColor Green
