<#
KOST48 M9 Full Regression Read Smoke
- PowerShell-only helper for local UAT.
- Read-only by default: no DB reset, no destructive mutation, no generated Prisma commit.
- Run backend server separately before API smoke.

Result labels:
- ENV_NOT_READY        = backend server/port is not reachable; not an endpoint bug.
- AUTH_NOT_READY       = backend reachable, but admin login failed; protected smoke skipped.
- M9_READ_SMOKE_FAIL   = backend reachable, one or more required read endpoint failed.
- M9_READ_SMOKE_PASS   = build/read-smoke passed. This is NOT M9 FULL PASS.

Example:
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"
Unblock-File ".\scripts\m9-full-regression-read-smoke.ps1"; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\m9-full-regression-read-smoke.ps1 -RunBuild -RunFrontendBuild

Optional role smoke:
.\scripts\m9-full-regression-read-smoke.ps1 -TryDefaultRoleLogins

Strict optional role login smoke, fail if OWNER/STAFF/TENANT credentials are invalid:
.\scripts\m9-full-regression-read-smoke.ps1 -TryDefaultRoleLogins -RequireRoleLogins
#>

[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$FrontendUrl = "http://localhost:5173",
  [switch]$RunBuild,
  [switch]$RunFrontendBuild,
  [switch]$SkipGitRestore,
  [switch]$TryDefaultRoleLogins,
  [switch]$RequireRoleLogins,
  [switch]$NoReport,
  [int]$TimeoutSec = 30,
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
$script:FinalLabel = "M9_READ_SMOKE_FAIL"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$RootDir = Split-Path -Parent $BackendDir
$FrontendDir = Join-Path $RootDir "frontend"
$ReportPath = Join-Path $RootDir ("m9-uat-read-smoke-report-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

function Write-Section { param([string]$Title) Write-Host "`n=== $Title ===" -ForegroundColor Cyan }
function Write-Ok { param([string]$Message) Write-Host "PASS $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "FAIL $Message" -ForegroundColor Red }
function Write-Warn { param([string]$Message) Write-Host "WARN $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "INFO $Message" -ForegroundColor Gray }

function Get-BaseUriParts {
  param([string]$Url)
  try {
    $uri = [Uri]$Url
    $port = if ($uri.IsDefaultPort) { if ($uri.Scheme -eq "https") { 443 } else { 80 } } else { $uri.Port }
    return [ordered]@{ Host = $uri.Host; Port = $port; Scheme = $uri.Scheme }
  } catch {
    throw "BaseUrl tidak valid: $Url"
  }
}

function Test-BackendReachable {
  $parts = Get-BaseUriParts -Url $BaseUrl
  Write-Info "Checking backend port: $($parts.Host):$($parts.Port)"
  try {
    $tcp = Test-NetConnection -ComputerName $parts.Host -Port $parts.Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $tcp) { return $false }
  } catch {
    Write-Warn "Test-NetConnection gagal, fallback ke public rooms smoke: $($_.Exception.Message)"
  }

  try {
    Invoke-RestMethod -Method GET -Uri ($BaseUrl.TrimEnd("/") + "/public/rooms") -TimeoutSec 8 | Out-Null
    return $true
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match "Unable to connect|actively refused|timed out|No connection|NameResolutionFailure") { return $false }
    return $true
  }
}

function Get-ResponseSummary {
  param($Response)
  if ($null -eq $Response) { return $null }
  $summary = [ordered]@{}
  if ($null -ne $Response.success) { $summary.success = $Response.success }
  if ($Response.message) { $summary.message = $Response.message }
  if ($Response.data) {
    $data = $Response.data
    foreach ($key in @("ready", "score", "basis", "mismatchCount", "totalItems", "found", "status", "id", "invoiceNumber", "invoiceId", "stayId")) {
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
    [string]$Group = "General",
    [string]$Method,
    [string]$Uri,
    [bool]$Passed,
    [int]$ElapsedMs,
    $Summary,
    [string]$ErrorMessage = ""
  )
  $script:Results.Add([ordered]@{
    group = $Group
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
    [string]$Group = "General",
    [ValidateSet("GET", "POST", "PATCH", "PUT", "DELETE")]
    [string]$Method = "GET",
    [string]$Path,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  $uri = if ($Path.StartsWith("http")) { $Path } else { $BaseUrl.TrimEnd("/") + "/" + $Path.TrimStart("/") }
  $sw = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $params = @{ Method = $Method; Uri = $uri; TimeoutSec = $TimeoutSec }
    if ($Headers.Count -gt 0) { $params.Headers = $Headers }
    if ($null -ne $Body) {
      $params.ContentType = "application/json"
      $params.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    $response = Invoke-RestMethod @params
    $sw.Stop()
    $summary = Get-ResponseSummary -Response $response
    Add-UatResult -Name $Name -Group $Group -Method $Method -Uri $uri -Passed $true -ElapsedMs $sw.ElapsedMilliseconds -Summary $summary
    Write-Ok "$Name ($($sw.ElapsedMilliseconds) ms)"
    return $response
  } catch {
    $sw.Stop()
    $message = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($message)) { $message = $_.Exception.Message }
    Add-UatResult -Name $Name -Group $Group -Method $Method -Uri $uri -Passed $false -ElapsedMs $sw.ElapsedMilliseconds -Summary $null -ErrorMessage $message
    Write-Fail "$Name ($($sw.ElapsedMilliseconds) ms)"
    Write-Host $message -ForegroundColor DarkYellow
    return $null
  }
}

function Login-Role {
  param(
    [string]$RoleName,
    [string]$Identifier,
    [string]$Password,
    [switch]$Required
  )
  if ([string]::IsNullOrWhiteSpace($Identifier) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-Warn "Skip login $RoleName karena credential kosong. Pakai -${RoleName}Identifier/-${RoleName}Password kalau mau smoke role ini."
    return $null
  }

  if ($Required) {
    $response = Invoke-KostApi -Group "Auth" -Name "Login $RoleName" -Method POST -Path "/auth/login" -Body @{ identifier = $Identifier; password = $Password }
    if ($response -and $response.data -and $response.data.accessToken) { return @{ Authorization = "Bearer $($response.data.accessToken)" } }
    return $null
  }

  $uri = $BaseUrl.TrimEnd("/") + "/auth/login"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-RestMethod -Method POST -Uri $uri -TimeoutSec $TimeoutSec -ContentType "application/json" -Body (@{ identifier = $Identifier; password = $Password } | ConvertTo-Json -Depth 12)
    $sw.Stop()
    Write-Ok "Login $RoleName ($($sw.ElapsedMilliseconds) ms)"
    if ($response -and $response.data -and $response.data.accessToken) { return @{ Authorization = "Bearer $($response.data.accessToken)" } }
    Write-Warn "Login $RoleName tidak mengembalikan accessToken. Role smoke dilewati."
    return $null
  } catch {
    $sw.Stop()
    $message = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($message)) { $message = $_.Exception.Message }
    Write-Warn "Skip $RoleName role smoke: login gagal ($($sw.ElapsedMilliseconds) ms). Ini biasanya credential seed lokal tidak ada, bukan endpoint read-smoke fail."
    Write-Host $message -ForegroundColor DarkYellow
    return $null
  }
}

function Invoke-EndpointGroup {
  param([string]$GroupName, [hashtable]$Headers, [array]$Endpoints)
  Write-Section $GroupName
  foreach ($endpoint in $Endpoints) { Invoke-KostApi -Group $GroupName -Name $endpoint.Name -Method GET -Path $endpoint.Path -Headers $Headers | Out-Null }
}

function Invoke-LocalCommand {
  param([string]$Name, [string]$WorkingDirectory, [string]$Command, [string[]]$Arguments)
  Write-Section $Name
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') exited with code $LASTEXITCODE" }
    Write-Ok $Name
  } finally { Pop-Location }
}

function Write-ReportAndExit {
  param([string]$Label, [int]$ExitCode, [string]$Note = "")
  $script:FinalLabel = $Label
  $endedAt = Get-Date
  $passed = @($script:Results | Where-Object { $_.passed }).Count
  $failed = @($script:Results | Where-Object { -not $_.passed }).Count
  $report = [ordered]@{
    name = "KOST48 M9 Full Regression Read Smoke"
    label = $Label
    note = $Note
    startedAt = $script:StartedAt.ToString("o")
    endedAt = $endedAt.ToString("o")
    baseUrl = $BaseUrl
    frontendUrl = $FrontendUrl
    rootDir = $RootDir
    totals = [ordered]@{ passed = $passed; failed = $failed; total = $script:Results.Count }
    results = $script:Results
    criticalFlowReminder = @(
      "Public booking flow",
      "Tenant payment proof flow",
      "Admin payment review approve/reject",
      "Renew request approval with meter checkpoint",
      "Checkout request + final checkout blocker",
      "Deposit settlement",
      "Inventory lifecycle + staff 403",
      "Manual browser smoke desktop/tablet/mobile"
    )
  }
  if (-not $NoReport) { $report | ConvertTo-Json -Depth 12 | Set-Content -Path $ReportPath -Encoding UTF8 }
  Write-Section "Summary"
  Write-Host "Label  : $Label" -ForegroundColor $(if ($ExitCode -eq 0) { "Green" } else { "Yellow" })
  Write-Host "Passed : $passed" -ForegroundColor Green
  Write-Host "Failed : $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
  if ($Note) { Write-Host "Note   : $Note" -ForegroundColor Yellow }
  if (-not $NoReport) { Write-Host "Report : $ReportPath" }
  exit $ExitCode
}

Write-Section "KOST48 M9 Full Regression Read Smoke"
Write-Host "BaseUrl     : $BaseUrl"
Write-Host "FrontendUrl : $FrontendUrl"
Write-Host "RootDir     : $RootDir"
Write-Host "Backend     : $BackendDir"
Write-Host "Frontend    : $FrontendDir"
if (-not $NoReport) { Write-Host "Report      : $ReportPath" }

if ($RunFrontendBuild) {
  if (Test-Path $FrontendDir) { Invoke-LocalCommand -Name "Frontend build" -WorkingDirectory $FrontendDir -Command "npm" -Arguments @("run", "build") }
  else { Write-Warn "Frontend folder tidak ditemukan: $FrontendDir" }
}

if ($RunBuild) {
  Invoke-LocalCommand -Name "Backend build:local" -WorkingDirectory $BackendDir -Command "npm" -Arguments @("run", "build:local")
  if (-not $SkipGitRestore) {
    Write-Section "Restore generated Prisma noise before commit gate"
    Push-Location $RootDir
    try { & git restore backend/src/generated/prisma; & git status -sb } finally { Pop-Location }
  } else { Write-Warn "SkipGitRestore aktif. Pastikan restore generated Prisma sebelum commit/push." }
}

if ($TryDefaultRoleLogins) {
  if ([string]::IsNullOrWhiteSpace($OwnerIdentifier)) { $OwnerIdentifier = "owner@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($OwnerPassword)) { $OwnerPassword = "owner123" }
  if ([string]::IsNullOrWhiteSpace($StaffIdentifier)) { $StaffIdentifier = "staff@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($StaffPassword)) { $StaffPassword = "staff123" }
  if ([string]::IsNullOrWhiteSpace($TenantIdentifier)) { $TenantIdentifier = "tenant@kost48.com" }
  if ([string]::IsNullOrWhiteSpace($TenantPassword)) { $TenantPassword = "tenant123" }
}

Write-Section "Preflight backend connectivity"
if (-not (Test-BackendReachable)) {
  Write-Warn "Backend belum reachable. Ini ENV_NOT_READY, bukan bug endpoint aplikasi."
  Write-Host "Jalankan di terminal PowerShell lain:" -ForegroundColor Yellow
  Write-Host "Set-Location \"$BackendDir\"; npm run prisma:generate; npm run start:dev" -ForegroundColor Yellow
  Write-ReportAndExit -Label "ENV_NOT_READY" -ExitCode 2 -Note "Backend server/port not reachable. Do not commit this report as application failure evidence."
}
Write-Ok "Backend reachable at $BaseUrl"

Write-Section "Public smoke"
Invoke-KostApi -Group "Public" -Name "Public rooms" -Method GET -Path "/public/rooms" | Out-Null

Write-Section "Admin login"
$adminHeaders = Login-Role -RoleName "ADMIN" -Identifier $AdminIdentifier -Password $AdminPassword -Required
if (-not $adminHeaders) {
  Write-Warn "Admin login gagal. Protected read-smoke tidak dijalankan."
  Write-ReportAndExit -Label "AUTH_NOT_READY" -ExitCode 3 -Note "Backend reachable, but admin login failed or token missing."
}

$adminReadEndpoints = @(
  @{ Name = "Me notifications"; Path = "/me/notifications" },
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
  @{ Name = "Tickets"; Path = "/tickets?limit=20" },
  @{ Name = "Staff field report review queue"; Path = "/staff-field-reports/review-queue" }
)
Invoke-EndpointGroup -GroupName "Admin read smoke" -Headers $adminHeaders -Endpoints $adminReadEndpoints

$ownerHeaders = Login-Role -RoleName "OWNER" -Identifier $OwnerIdentifier -Password $OwnerPassword -Required:$RequireRoleLogins
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

$staffHeaders = Login-Role -RoleName "STAFF" -Identifier $StaffIdentifier -Password $StaffPassword -Required:$RequireRoleLogins
if ($staffHeaders) {
  $staffEndpoints = @(
    @{ Name = "Staff rooms"; Path = "/rooms?limit=20" },
    @{ Name = "Staff tickets"; Path = "/tickets?limit=20" },
    @{ Name = "Staff inventory items read"; Path = "/inventory-items?limit=20" },
    @{ Name = "Staff room items read"; Path = "/room-items?limit=20" },
    @{ Name = "Staff field reports"; Path = "/staff-field-reports" }
  )
  Invoke-EndpointGroup -GroupName "Staff read smoke" -Headers $staffHeaders -Endpoints $staffEndpoints
}

$tenantHeaders = Login-Role -RoleName "TENANT" -Identifier $TenantIdentifier -Password $TenantPassword -Required:$RequireRoleLogins
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

Write-Section "Manual browser checklist - must pass before FULL PASS"
$manualPages = @(
  "$FrontendUrl/dashboard",
  "$FrontendUrl/stays",
  "$FrontendUrl/invoices",
  "$FrontendUrl/payment-submissions/review",
  "$FrontendUrl/renew-requests",
  "$FrontendUrl/rooms",
  "$FrontendUrl/staff-warehouse",
  "$FrontendUrl/portal/stay",
  "$FrontendUrl/portal/invoices",
  "$FrontendUrl/portal/bookings",
  "$FrontendUrl/rooms"
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

$failed = @($script:Results | Where-Object { -not $_.passed }).Count
if ($failed -gt 0) { Write-ReportAndExit -Label "M9_READ_SMOKE_FAIL" -ExitCode 1 -Note "Backend reachable, but one or more read endpoint failed." }
Write-ReportAndExit -Label "M9_READ_SMOKE_PASS" -ExitCode 0 -Note "Read-smoke PASS only. Continue critical flow UAT and manual browser smoke before FULL PASS."
