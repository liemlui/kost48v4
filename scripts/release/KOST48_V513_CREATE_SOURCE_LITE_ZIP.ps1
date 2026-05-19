param(
  [string]$ProjectRoot = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle",
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Section($name) { Write-Host "`n== $name ==" -ForegroundColor Cyan }
function Pass($message) { Write-Host "PASS: $message" -ForegroundColor Green }
function Fail($message) { throw "FAIL: $message" }
function Copy-TreeFiltered($Source, $Destination, [string[]]$ExcludeDirs, [string[]]$ExcludeFiles) {
  if (-not (Test-Path $Source)) { return }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -Path $Source -Force | ForEach-Object {
    if ($_.PSIsContainer) {
      if ($ExcludeDirs -contains $_.Name) { return }
      Copy-TreeFiltered -Source $_.FullName -Destination (Join-Path $Destination $_.Name) -ExcludeDirs $ExcludeDirs -ExcludeFiles $ExcludeFiles
    } else {
      if ($ExcludeFiles -contains $_.Name) { return }
      if ($_.Name -like "*.log") { return }
      if ($_.Name -like "*.tsbuildinfo") { return }
      Copy-Item $_.FullName (Join-Path $Destination $_.Name) -Force
    }
  }
}

Section "Prepare source-lite ZIP"
if (-not (Test-Path $ProjectRoot)) { Fail "Project root not found: $ProjectRoot" }
Set-Location $ProjectRoot

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $stamp = Get-Date -Format "yyyyMMdd_HHmm"
  $OutputPath = Join-Path $ProjectRoot "kost48-source-lite-$stamp.zip"
}

$temp = Join-Path $ProjectRoot "_zip_kost48_lite"
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $temp | Out-Null

$commonExcludeDirs = @("node_modules", "dist", ".vite", ".prisma", ".git")
$commonExcludeFiles = @(".env", ".env.local", ".env.production", "tsconfig.tsbuildinfo", "tsconfig.build.tsbuildinfo")

Copy-TreeFiltered -Source (Join-Path $ProjectRoot "backend") -Destination (Join-Path $temp "backend") -ExcludeDirs ($commonExcludeDirs + @("src\generated", "generated")) -ExcludeFiles $commonExcludeFiles
if (Test-Path (Join-Path $temp "backend\src\generated")) { Remove-Item (Join-Path $temp "backend\src\generated") -Recurse -Force }
Copy-TreeFiltered -Source (Join-Path $ProjectRoot "frontend") -Destination (Join-Path $temp "frontend") -ExcludeDirs $commonExcludeDirs -ExcludeFiles $commonExcludeFiles
Copy-TreeFiltered -Source (Join-Path $ProjectRoot "docs") -Destination (Join-Path $temp "docs") -ExcludeDirs @() -ExcludeFiles @()
Copy-TreeFiltered -Source (Join-Path $ProjectRoot "scripts") -Destination (Join-Path $temp "scripts") -ExcludeDirs @() -ExcludeFiles @()

Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $OutputPath -Force
Remove-Item $temp -Recurse -Force

Pass "Created source-lite ZIP: $OutputPath"
