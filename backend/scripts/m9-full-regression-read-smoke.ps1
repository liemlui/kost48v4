<#
KOST48 M9 Full Regression Read Smoke
- PowerShell-only helper for local UAT.
- Read-only by default: no DB reset, no destructive mutation, no generated Prisma commit.
- Run backend server separately before API smoke.

Example:
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"
.\scripts\m9-full-regression-read-smoke.ps1 -RunBuild

Optional role smoke:
.\scripts\m9-full-regression-read-smoke.ps1 -TryDefaultRoleLogins
#>

[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [switch]$RunBuild,
  [switch]$RunFrontendBuild,
  [switch]$SkipGitRestore,
  [switch]$TryDefaultRoleLogins,
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123",
  [string]$OwnerIdentifier = "",
  [string]$OwnerPassword = "",
  [string]$StaffIdentifier = "",
  [string]$StaffPassword = "",
  [string]$TenantIdentifier = "",
  [string]$TenantPassword = ""
)

$ErrorActionPreference = "Stop"
$script:Results = New-Object System.Collections.Generic.List[object]
$script:StartedAt = Get-Date

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$RootDir = Split-Path -Parent $BackendDir
$FrontendDir = Join-Path $RootDir "frontend"
$ReportPath = Join-Path $RootDir ("m9-uat-read-smoke-report-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

function Write-Section {
  param([string]$Title)
  Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Write-Fail {
  param([string]$Message)
  Write-Host "FAIL $Message" -ForegroundColor Red
}

function Write-Warn {
  param([string]$Message)
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Get-ResponseSummary {
  param($Response)
  if ($null -eq $Response) { return $null }
  $summary = [ordered]@{}
  if ($null -ne $Response.success) { $summary.success = $Response.success }
  if ($Response.message) { $summary.message = $Response.message }
  if ($Response.data) {
    $data = $Response.data
    foreach ($key in @("ready", "score", "basis", "mismatchCount", "totalItems", "found", "status", "id", "invoiceNumber")) {
      if ($null -ne $data.$key) { $summary[$key] = $data.$key }
    }
    if ($data.items -and ($data.items -is [array])) { $summary.itemCount = $data.items.Count }
    if ($data.meta) { $summary.meta = $data.meta }
  }
  return $summary
}

function Add-UatResult {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Uri,
    [bool]$Passed,
    [int]$ElapsedMs,
    $Summary,
    [string]$ErrorMessage = ""
  )
  $script:Results.Add([ordered]@{
    name = $Name
    method = $Method
    uri = $Uri
    passed = $Passed
    elapsedMs = $ElapsedMs
    summary = $Summary
    error = $ErrorMessage
  }) | Out-Null
}

function Invoke-KostApi {
  param(
    [string]$Name,
    [ValidateSet("GET", "POST", "PATCH", "PUT", "DELETE")]
    [string]$Method = "GET",
    [string]$Path,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  $uri = if ($Path.StartsWith("http")) { $Path } else { $BaseUrl.TrimEnd("/") + "/" + $Path.TrimStart("/") }
  $sw = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $params = @{
      Method = $Method
      Uri = $uri
      TimeoutSec = 30
    }
    if ($Headers.Count -gt 0) { $params.Headers = $Headers }
    if ($null -ne $Body) {
      $params.ContentType = "application/json"
      $params.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    $response = Invoke-RestMethod @params
    $sw.Stop()
    $summary = Get-ResponseSummary -Response $response
    Add-UatResult -Name $Name -Method $Method -Uri $uri -Passed $true -ElapsedMs $sw.ElapsedMilliseconds -Summary $summary
    Write-Ok "$Name ($($sw.ElapsedMilliseconds) ms)"
    return $response
  } catch {
    $sw.Stop()
    $message = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($message)) { $message = $_.Exception.Message }
    Add-UatResult -Name $Name -Method $Method -Uri $uri -Passed $false -ElapsedMs $sw.ElapsedMilliseconds -Summary $null -ErrorMessage $message
    Write-Fail "$Name ($($sw.ElapsedMilliseconds) ms)"
    Write-Host $message -ForegroundColor DarkYellow
    return $null
  }
}

function Login-Role {
  param(
    [string]$RoleName,
    [string]$Identifier,
    [string]$Password
  )
  if ([string]::IsNullOrWhiteSpace($Identifier) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-Warn "Skip login $RoleName karena credential kosong."
    return $null
  }
  $response = Invoke-KostApi -Name "Login $RoleName" -Method POST -Path "/auth/login" -Body @{ identifier = $Identifier; password = $Password }
  if ($response -and $response.data -and $response.data.accessToken) {
    return @{ Authorization = "Bearer $($response.data.accessToken)" }
  }
  return $null
}

function Invoke-EndpointGroup {
  param(
    [string]$GroupName,
    [hashtable]$Headers,
    [array]$Endpoints
  )
  Write-Section $GroupName
  foreach ($endpoint in $Endpoints) {
    Invoke-KostApi -Name $endpoint.Name -Method GET -Path $endpoint.Path -Headers $Headers | Out-Null
  }
}

function Invoke-LocalCommand {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$Arguments
  )
  Write-Section $Name
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') exited with code $LASTEXITCODE" }
    Write-Ok $Name
  } finally {
    Pop-Location
  }
}

Write-Section "KOST48 M9 Full Regression Read Smoke"
Write-Host "BaseUrl  : $BaseUrl"
Write-Host "RootDir  : $RootDir"
Write-Host "Backend  : $BackendDir"
Write-Host "Frontend : $FrontendDir"
Write-Host "Report   : $ReportPath"

if ($RunFrontendBuild) {
  if (Test-Path $FrontendDir) {
    Invoke-LocalCommand -Name "Frontend build" -WorkingDirectory $FrontendDir -Command "npm" -Arguments @("run", "build")
  } else {
    Write-Warn "Frontend folder tidak ditemukan: $FrontendDir"
  }
}

if ($RunBuild) {
  Invoke-LocalCommand -Name "Backend build:local" -WorkingDirectory $BackendDir -Command "npm" -Arguments @("run", "build:local")
  if (-not $SkipGitRestore) {
    Write-Section "Restore generated Prisma noise"
    Push-Location $RootDir
    try {
      & git restore backend/src/generated/prisma
      & git status -sb
    } finally {
      Pop-Location
    }
  }
}

if ($TryDefaultRoleLogins) {
  if ([string]::IsNullOrWhiteSpace($OwnerIdentifier)) { $OwnerIdentifier = "owner@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($OwnerPassword)) { $OwnerPassword = "owner123" }
  if ([string]::IsNullOrWhiteSpace($StaffIdentifier)) { $StaffIdentifier = "staff@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($StaffPassword)) { $StaffPassword = "staff123" }
  if ([string]::IsNullOrWhiteSpace($TenantIdentifier)) { $TenantIdentifier = "tenant@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($TenantPassword)) { $TenantPassword = "tenant123" }
}

Write-Section "Server connectivity + public smoke"
$publicRooms = Invoke-KostApi -Name "Public rooms" -Method GET -Path "/public/rooms"
if (-not $publicRooms) {
  Write-Warn "Backend belum reachable. Jalankan di terminal lain:"
  Write-Host "Set-Location \"$BackendDir\"; npm run start:dev" -ForegroundColor Yellow
}

Write-Section "Admin login"
$adminHeaders = Login-Role -RoleName "ADMIN" -Identifier $AdminIdentifier -Password $AdminPassword
if (-not $adminHeaders) {
  Write-Fail "Admin login gagal. Stop API smoke protected."
} else {
  $adminReadEndpoints = @(
    @{ Name = "Payment review queue"; Path = "/payment-submissions/review-queue" },
    @{ Name = "Deposit ledger reconciliation-lite"; Path = "/deposit-ledger/reconciliation-lite" },
    @{ Name = "Deposit ledger summary"; Path = "/deposit-ledger/summary" },
    @{ Name = "Accounting readiness"; Path = "/accounting/readiness" },
    @{ Name = "Inventory items"; Path = "/inventory-items?limit=20" },
    @{ Name = "Inventory movements"; Path = "/inventory-movements?limit=20" },
    @{ Name = "Room items"; Path = "/room-items?limit=20" },
    @{ Name = "Rooms"; Path = "/rooms?limit=20" },
    @{ Name = "Stays"; Path = "/stays?limit=20" },
    @{ Name = "Invoices"; Path = "/invoices?limit=20" },
    @{ Name = "Pending renew requests"; Path = "/admin/renew-requests?status=PENDING" },
    @{ Name = "Pending checkout requests"; Path = "/admin/checkout-requests?status=PENDING" },
    @{ Name = "Approved checkout requests"; Path = "/admin/checkout-requests?status=APPROVED" },
    @{ Name = "Assets"; Path = "/assets?limit=20" },
    @{ Name = "Expenses"; Path = "/expenses?limit=20" },
    @{ Name = "Tickets"; Path = "/tickets?limit=20" }
  )
  Invoke-EndpointGroup -GroupName "Admin read smoke" -Headers $adminHeaders -Endpoints $adminReadEndpoints
}

$ownerHeaders = Login-Role -RoleName "OWNER" -Identifier $OwnerIdentifier -Password $OwnerPassword
if ($ownerHeaders) {
  $ownerEndpoints = @(
    @{ Name = "Owner accounting readiness"; Path = "/accounting/readiness" },
    @{ Name = "Owner deposit reconciliation"; Path = "/deposit-ledger/reconciliation-lite" },
    @{ Name = "Owner assets"; Path = "/assets?limit=20" },
    @{ Name = "Owner expenses"; Path = "/expenses?limit=20" },
    @{ Name = "Owner invoices"; Path = "/invoices?limit=20" }
  )
  Invoke-EndpointGroup -GroupName "Owner finance read smoke" -Headers $ownerHeaders -Endpoints $ownerEndpoints
}

$staffHeaders = Login-Role -RoleName "STAFF" -Identifier $StaffIdentifier -Password $StaffPassword
if ($staffHeaders) {
  $staffEndpoints = @(
    @{ Name = "Staff rooms"; Path = "/rooms?limit=20" },
    @{ Name = "Staff tickets"; Path = "/tickets?limit=20" },
    @{ Name = "Staff inventory items read"; Path = "/inventory-items?limit=20" },
    @{ Name = "Staff room items read"; Path = "/room-items?limit=20" }
  )
  Invoke-EndpointGroup -GroupName "Staff read smoke" -Headers $staffHeaders -Endpoints $staffEndpoints
}

$tenantHeaders = Login-Role -RoleName "TENANT" -Identifier $TenantIdentifier -Password $TenantPassword
if ($tenantHeaders) {
  $tenantEndpoints = @(
    @{ Name = "Tenant current stay"; Path = "/stays/me/current" },
    @{ Name = "Tenant invoices"; Path = "/invoices/my" },
    @{ Name = "Tenant bookings"; Path = "/tenant/bookings/my" },
    @{ Name = "Tenant renew requests"; Path = "/tenant/renew-requests/my" },
    @{ Name = "Tenant checkout requests"; Path = "/tenant/checkout-requests/my" }
  )
  Invoke-EndpointGroup -GroupName "Tenant portal read smoke" -Headers $tenantHeaders -Endpoints $tenantEndpoints
}

Write-Section "Manual browser checklist"
$manualPages = @(
  "http://localhost:5173/dashboard",
  "http://localhost:5173/stays",
  "http://localhost:5173/invoices",
  "http://localhost:5173/payment-submissions/review",
  "http://localhost:5173/renew-requests",
  "http://localhost:5173/rooms",
  "http://localhost:5173/staff-warehouse",
  "http://localhost:5173/portal/stay",
  "http://localhost:5173/portal/invoices",
  "http://localhost:5173/portal/bookings",
  "http://localhost:5173/rooms"
)
foreach ($page in $manualPages) { Write-Host "- $page" }

Write-Host "`nManual audit rules:" -ForegroundColor Cyan
Write-Host "- No no-op CTA or link #"
Write-Host "- Filter is visually different from primary action"
Write-Host "- Tenant copy avoids raw backend terms"
Write-Host "- Deposit copy says dana titipan/liability, not omzet"
Write-Host "- Tables readable on desktop/tablet/mobile"
Write-Host "- Checkout approval is not final checkout"
Write-Host "- Final checkout is blocked by open invoice, including DRAFT"
Write-Host "- Staff reports issues/restock needs, not official stock mutation"

$endedAt = Get-Date
$passed = @($script:Results | Where-Object { $_.passed }).Count
$failed = @($script:Results | Where-Object { -not $_.passed }).Count
$report = [ordered]@{
  name = "KOST48 M9 Full Regression Read Smoke"
  startedAt = $script:StartedAt.ToString("o")
  endedAt = $endedAt.ToString("o")
  baseUrl = $BaseUrl
  rootDir = $RootDir
  totals = [ordered]@{ passed = $passed; failed = $failed; total = $script:Results.Count }
  label = if ($failed -eq 0) { "M9_READ_SMOKE_PASS" } else { "M9_READ_SMOKE_FAIL" }
  results = $script:Results
  manualBrowserChecklist = $manualPages
}

$report | ConvertTo-Json -Depth 12 | Set-Content -Path $ReportPath -Encoding UTF8

Write-Section "Summary"
Write-Host "Passed : $passed" -ForegroundColor Green
Write-Host "Failed : $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Report : $ReportPath"

if ($failed -gt 0) {
  Write-Warn "M9 read smoke belum PASS. Buka JSON report dan patch hanya bug yang terbukti."
  exit 1
}

Write-Ok "M9 read smoke PASS. Lanjutkan manual browser smoke sebelum klaim FULL PASS."
exit 0
