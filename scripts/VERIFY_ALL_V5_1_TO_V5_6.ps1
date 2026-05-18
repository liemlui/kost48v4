param(
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
  $ProjectRoot = (Get-Location).Path
}

Set-Location $ProjectRoot
Write-Host "=== KOST48 V5.1-V5.6 cumulative verification ===" -ForegroundColor Cyan
Write-Host "ProjectRoot: $ProjectRoot" -ForegroundColor Cyan

Write-Host "`n--- Git status ---" -ForegroundColor Yellow
git status --short
git log --oneline -8

Write-Host "`n--- Backend build ---" -ForegroundColor Yellow
Set-Location (Join-Path $ProjectRoot "backend")
npm run build

Write-Host "`n--- Frontend build ---" -ForegroundColor Yellow
Set-Location (Join-Path $ProjectRoot "frontend")
npm run build

Set-Location $ProjectRoot
Write-Host "`nBuild verification done." -ForegroundColor Green
Write-Host "Manual/API UAT masih wajib sebelum klaim PASS:" -ForegroundColor Yellow
Write-Host "- V5.1/V5.2 manual check-in B1"
Write-Host "- V5.3 public rooms marketing route"
Write-Host "- V5.4 staff read-only boundary"
Write-Host "- V5.5 tenant boundary"
Write-Host "- V5.6 finance read/review boundary"
