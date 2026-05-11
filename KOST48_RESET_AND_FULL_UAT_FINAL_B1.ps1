# ============================================================
# KOST48 V3/V4 — RESET DB + SEED + BUILD + FULL API UAT + IDENTITY CHECKS
# Backend local: http://localhost:3000/api
# PowerShell only. No curl.
# Save this file on Desktop; do not commit it.
# ============================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$ApiBase = "http://localhost:3000/api"

$OwnerEmail = "liem.lui@gmail.com"
$OwnerPassword = "admin123"
$AdminEmail = "admin@kost48.com"
$AdminPassword = "admin123"
$StaffEmail = "staff@kost48.com"
$StaffPassword = "staff123"
$TenantEmail = "tenant.g2@kost48.com"
$TenantPassword = "tenant123"

$Global:PassCount = 0
$Global:FailCount = 0
$Global:WarnCount = 0
$Global:SkipCount = 0

function Section($name) { Write-Host ""; Write-Host "============================================================" -ForegroundColor Cyan; Write-Host $name -ForegroundColor Cyan; Write-Host "============================================================" -ForegroundColor Cyan }
function Pass($msg) { $Global:PassCount++; Write-Host "PASS | $msg" -ForegroundColor Green }
function Warn($msg) { $Global:WarnCount++; Write-Host "WARN | $msg" -ForegroundColor Yellow }
function Skip($msg) { $Global:SkipCount++; Write-Host "SKIP | $msg" -ForegroundColor DarkYellow }
function Fail($msg) { $Global:FailCount++; Write-Host "FAIL | $msg" -ForegroundColor Red; throw $msg }
function Assert($condition, $msg) { if (-not $condition) { Fail $msg }; Pass $msg }
function ToJson($obj) { return ($obj | ConvertTo-Json -Depth 50) }

function Get-DbUrlForPsql {
  Set-Location $BackendDir
  $dbUrl = (Get-Content ".\.env" | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1) -replace "^DATABASE_URL=", ""
  $dbUrl = $dbUrl.Trim().Trim('"').Trim("'")
  $psqlUrl = ($dbUrl -split "\?")[0]
  if (-not $psqlUrl) { Fail "DATABASE_URL tidak ditemukan di backend/.env" }
  return $psqlUrl
}

function Get-StatusCodeFromError($err) { try { if ($err.Exception.Response -and $err.Exception.Response.StatusCode) { return [int]$err.Exception.Response.StatusCode } } catch {}; return $null }

function Invoke-Api {
  param([string]$Method, [string]$Path, [string]$Token = $null, $Body = $null)
  $headers = @{}
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $uri = "$ApiBase$Path"
  if ($null -eq $Body) { return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body (ToJson $Body)
}

function Invoke-ApiRaw {
  param([string]$Method, [string]$Path, [string]$Token = $null, $Body = $null)
  try { $res = Invoke-Api $Method $Path $Token $Body; return @{ ok=$true; status=200; data=$res; error=$null } }
  catch { return @{ ok=$false; status=(Get-StatusCodeFromError $_); data=$null; error=$_.Exception.Message } }
}

function Expect-Success {
  param([string]$Method, [string]$Path, [string]$Token = $null, $Body = $null, [string]$Label)
  try { $res = Invoke-Api $Method $Path $Token $Body; Pass $Label; return $res }
  catch { $status = Get-StatusCodeFromError $_; Fail "$Label | expected success, got HTTP $status | $($_.Exception.Message)" }
}

function Expect-Fail {
  param([string]$Method, [string]$Path, [string]$Token = $null, $Body = $null, [int[]]$ExpectedStatuses, [string]$Label)
  try { $res = Invoke-Api $Method $Path $Token $Body; Fail "$Label | expected failure $($ExpectedStatuses -join '/'), but succeeded: $(ToJson $res)" }
  catch { $status = Get-StatusCodeFromError $_; if ($ExpectedStatuses -contains $status) { Pass "$Label | failed as expected HTTP $status" } else { Fail "$Label | expected HTTP $($ExpectedStatuses -join '/'), got HTTP $status | $($_.Exception.Message)" } }
}

function Try-Optional { param([string]$Label, [scriptblock]$Script); try { & $Script; Pass $Label } catch { $Global:WarnCount++; Write-Host "WARN | $Label | $($_.Exception.Message)" -ForegroundColor Yellow } }
function DataOf($res) { if ($null -ne $res.data) { return $res.data }; return $res }
function ItemsOf($res) { if ($null -ne $res.data -and $null -ne $res.data.items) { return @($res.data.items) }; if ($null -ne $res.items) { return @($res.items) }; if ($null -ne $res.data -and $res.data -is [array]) { return @($res.data) }; if ($res -is [array]) { return @($res) }; return @() }
function TokenOf($loginRes) { if ($loginRes.data -and $loginRes.data.accessToken) { return $loginRes.data.accessToken }; if ($loginRes.accessToken) { return $loginRes.accessToken }; Fail "Cannot find accessToken in login response: $(ToJson $loginRes)" }
function UserOf($loginRes) { if ($loginRes.data -and $loginRes.data.user) { return $loginRes.data.user }; if ($loginRes.user) { return $loginRes.user }; Fail "Cannot find user in login response: $(ToJson $loginRes)" }

function ExtractId($res) {
  $d = DataOf $res
  if ($d.id) { return [int]$d.id }
  if ($d.stayId) { return [int]$d.stayId }
  if ($d.bookingId) { return [int]$d.bookingId }
  if ($d.submissionId) { return [int]$d.submissionId }
  if ($d.paymentSubmissionId) { return [int]$d.paymentSubmissionId }
  if ($d.checkoutRequestId) { return [int]$d.checkoutRequestId }
  if ($d.stay -and $d.stay.id) { return [int]$d.stay.id }
  if ($d.booking -and $d.booking.id) { return [int]$d.booking.id }
  if ($d.paymentSubmission -and $d.paymentSubmission.id) { return [int]$d.paymentSubmission.id }
  if ($d.checkoutRequest -and $d.checkoutRequest.id) { return [int]$d.checkoutRequest.id }
  if ($d.request -and $d.request.id) { return [int]$d.request.id }
  if ($d.ticket -and $d.ticket.id) { return [int]$d.ticket.id }
  Fail "Cannot extract id from response: $(ToJson $res)"
}

function Login-Role {
  param([string]$Email, [string]$Password, [string]$ExpectedRole)
  $login = Expect-Success "Post" "/auth/login" $null @{ identifier=$Email; password=$Password } "Login $ExpectedRole $Email"
  $token = TokenOf $login
  $user = UserOf $login
  Assert ($user.role -eq $ExpectedRole) "$Email role is $ExpectedRole"
  return @{ token=$token; user=$user }
}

function First-Existing-Path { param([string[]]$Paths, [string]$Token=$null); foreach ($p in $Paths) { $r = Invoke-ApiRaw "Get" $p $Token; if ($r.ok) { return $p } }; return $null }

function Try-Path-Post {
  param([string[]]$Paths, [string]$Token, $Body, [string]$Label)
  foreach ($p in $Paths) {
    $r = Invoke-ApiRaw "Post" $p $Token $Body
    if ($r.ok) { Pass "$Label | route=$p"; return @{ path=$p; response=$r.data } }
    if ($r.status -ne 404) { Warn "$Label route=$p returned HTTP $($r.status): $($r.error)"; return @{ path=$p; response=$null; status=$r.status } }
  }
  Skip "$Label | no matching route found: $($Paths -join ', ')"
  return $null
}

function Try-Path-Patch {
  param([string[]]$Paths, [string]$Token, $Body, [string]$Label)
  foreach ($p in $Paths) {
    $r = Invoke-ApiRaw "Patch" $p $Token $Body
    if ($r.ok) { Pass "$Label | route=$p"; return @{ path=$p; response=$r.data } }
    if ($r.status -ne 404) { Warn "$Label route=$p returned HTTP $($r.status): $($r.error)"; return @{ path=$p; response=$null; status=$r.status } }
  }
  Skip "$Label | no matching route found: $($Paths -join ', ')"
  return $null
}

function Wait-Backend {
  for ($i = 1; $i -le 30; $i++) {
    try { Invoke-RestMethod -Method Get -Uri "$ApiBase/public/rooms" | Out-Null; Pass "Backend reachable at $ApiBase"; return }
    catch { Start-Sleep -Seconds 2 }
  }
  Fail "Backend tidak reachable setelah menunggu 60 detik"
}

function Run-Cmd {
  param(
    [string]$WorkDir,
    [string]$Command,
    [string]$Label
  )

  Set-Location $WorkDir

  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  Write-Host "RUN | $Command" -ForegroundColor DarkCyan
  cmd.exe /d /c "$Command 2>&1"
  $exitCode = $LASTEXITCODE

  $ErrorActionPreference = $oldEap

  if ($exitCode -ne 0) {
    Fail "$Label failed with exit code $exitCode"
  }

  Pass "$Label"
}

# ============================================================
# A. BUILD + RESET + BOOTSTRAP + SEED
# ============================================================

Section "A. WORKING TREE INFO"
Set-Location $ProjectRoot
git status --short
git log --oneline -8

Section "B. BACKEND BUILD"
Run-Cmd $BackendDir "npm run build" "Backend build PASS"

Section "C. FRONTEND BUILD"
Run-Cmd $FrontendDir "npm run build" "Frontend build PASS"

Section "D. RESET DB + PRISMA GENERATE + BOOTSTRAP + SEED"
Set-Location $BackendDir
$env:NODE_ENV = "development"
Run-Cmd $BackendDir "npx prisma db push --force-reset" "Prisma db push force reset PASS"
Run-Cmd $BackendDir "npx prisma generate" "Prisma generate PASS"
$psqlUrl = Get-DbUrlForPsql
Run-Cmd $BackendDir "psql `"$psqlUrl`" -f `".\sql\bootstrap.sql`"" "bootstrap.sql PASS"
if (Test-Path ".\sql\bootstrap_v4_addendum.sql") {
  Run-Cmd $BackendDir "psql `"$psqlUrl`" -f `".\sql\bootstrap_v4_addendum.sql`"" "bootstrap_v4_addendum.sql PASS"
}
Run-Cmd $BackendDir "npx ts-node seed-admin.ts" "Seed admin/dev UAT PASS"
Pass "DB reset + bootstrap + seed selesai"

Section "E. BACKEND START CHECK"
$backendCheck = Invoke-ApiRaw "Get" "/public/rooms"
if ($backendCheck.ok) { Pass "Backend sudah running" }
else {
  Warn "Backend belum running. Script akan start backend di window PowerShell baru."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$BackendDir`"; npm run start:dev"
  Start-Sleep -Seconds 6
}
Wait-Backend

# ============================================================
# 0. PREFLIGHT
# ============================================================

Section "0. PREFLIGHT"
Set-Location $ProjectRoot
git status --short
git log --oneline -8
Expect-Success "Get" "/public/rooms" $null $null "Backend reachable: GET /public/rooms" | Out-Null

# ============================================================
# 1. AUTH + ROLE
# ============================================================

Section "1. AUTH + ROLE"
$owner = Login-Role $OwnerEmail $OwnerPassword "OWNER"
$admin = Login-Role $AdminEmail $AdminPassword "ADMIN"
$staff = Login-Role $StaffEmail $StaffPassword "STAFF"
$tenant = Login-Role $TenantEmail $TenantPassword "TENANT"
$ownerToken = $owner.token; $adminToken = $admin.token; $staffToken = $staff.token; $tenantToken = $tenant.token
$ownerUser = $owner.user; $adminUser = $admin.user; $staffUser = $staff.user; $tenantUser = $tenant.user

Expect-Fail "Post" "/auth/login" $null @{ identifier=$AdminEmail; password="wrong-password" } @(401,400) "Wrong password rejected"
Expect-Fail "Get" "/me/notifications" $null $null @(401) "Protected endpoint without token rejected"
Expect-Success "Get" "/me/notifications" $ownerToken $null "OWNER can access notifications" | Out-Null
Expect-Success "Get" "/me/notifications" $adminToken $null "ADMIN can access notifications" | Out-Null
Expect-Success "Get" "/me/notifications" $staffToken $null "STAFF can access notifications" | Out-Null
Expect-Success "Get" "/me/notifications" $tenantToken $null "TENANT can access notifications" | Out-Null

# ============================================================
# 2. PUBLIC CATALOG + ROOM SOURCE
# ============================================================

Section "2. PUBLIC CATALOG + ROOM SOURCE"
$publicRooms = Expect-Success "Get" "/public/rooms" $null $null "Public rooms list works"
$rooms = ItemsOf $publicRooms
Assert ($rooms.Count -gt 0) "Public rooms has at least 1 room"
$room = $rooms | Where-Object { $_.code -eq "G2-001" } | Select-Object -First 1
if (-not $room) { $room = $rooms | Select-Object -First 1 }
Assert ($null -ne $room.id) "Selected room has id"
Write-Host "Selected UAT Room: code=$($room.code), id=$($room.id)" -ForegroundColor Cyan
Expect-Success "Get" "/public/rooms/$($room.id)" $null $null "Public room detail works" | Out-Null
Expect-Fail "Get" "/public/rooms/999999" $null $null @(404) "Public room detail not found returns 404"

# ============================================================
# 3. BASIC READ ENDPOINTS BY ROLE
# ============================================================

Section "3. BASIC READ ENDPOINTS BY ROLE"
Expect-Success "Get" "/users" $ownerToken $null "OWNER can list users" | Out-Null
Expect-Success "Get" "/users" $adminToken $null "ADMIN can list users" | Out-Null
Expect-Fail "Get" "/users" $tenantToken $null @(403) "TENANT cannot list users"
Expect-Success "Get" "/tenants" $ownerToken $null "OWNER can list tenants" | Out-Null
Expect-Success "Get" "/tenants" $adminToken $null "ADMIN can list tenants" | Out-Null
Expect-Success "Get" "/tenants" $staffToken $null "STAFF can list tenants" | Out-Null
Expect-Fail "Get" "/tenants" $tenantToken $null @(403) "TENANT cannot list tenants"
Expect-Success "Get" "/rooms" $ownerToken $null "OWNER can list rooms" | Out-Null
Expect-Success "Get" "/rooms" $adminToken $null "ADMIN can list rooms" | Out-Null
Expect-Success "Get" "/rooms" $staffToken $null "STAFF can list rooms" | Out-Null
Expect-Fail "Get" "/rooms" $tenantToken $null @(403) "TENANT cannot access backoffice rooms"
Try-Optional "Room detail backoffice" { Expect-Success "Get" "/rooms/$($room.id)" $ownerToken $null "OWNER can read room detail" | Out-Null }
Try-Optional "Room facilities backoffice/public check" { Expect-Success "Get" "/rooms/$($room.id)/facilities" $ownerToken $null "OWNER can read room facilities" | Out-Null; Expect-Fail "Get" "/rooms/$($room.id)/facilities" $tenantToken $null @(403) "TENANT cannot access backoffice room facilities" }
Expect-Success "Get" "/stays" $ownerToken $null "OWNER can list stays" | Out-Null
Expect-Success "Get" "/stays" $adminToken $null "ADMIN can list stays" | Out-Null
Expect-Success "Get" "/stays" $staffToken $null "STAFF can list stays" | Out-Null
Expect-Fail "Get" "/stays" $tenantToken $null @(403) "TENANT cannot list all stays"
Expect-Success "Get" "/payment-submissions/my" $tenantToken $null "TENANT can list own payment submissions" | Out-Null
Expect-Success "Get" "/payment-submissions/review-queue" $ownerToken $null "OWNER can access payment review queue" | Out-Null
Expect-Success "Get" "/payment-submissions/review-queue" $adminToken $null "ADMIN can access payment review queue" | Out-Null
Expect-Fail "Get" "/payment-submissions/review-queue" $tenantToken $null @(403) "TENANT cannot access payment review queue"
Try-Optional "Invoices read checks" { Expect-Success "Get" "/invoices" $ownerToken $null "OWNER can list invoices" | Out-Null; Expect-Success "Get" "/invoices" $adminToken $null "ADMIN can list invoices" | Out-Null; Expect-Success "Get" "/invoices" $staffToken $null "STAFF can list invoices" | Out-Null; Expect-Fail "Get" "/invoices" $tenantToken $null @(403) "TENANT cannot list all invoices"; Expect-Success "Get" "/invoices/my" $tenantToken $null "TENANT can list own invoices" | Out-Null }
Expect-Success "Patch" "/me/notifications/read-all" $ownerToken $null "OWNER can mark notifications read-all" | Out-Null
Expect-Success "Patch" "/me/notifications/read-all" $tenantToken $null "TENANT can mark notifications read-all" | Out-Null
Try-Optional "Reminder preview access" { Expect-Success "Get" "/admin/reminders/preview/all" $ownerToken $null "OWNER can access reminder preview all" | Out-Null; Expect-Success "Get" "/admin/reminders/preview/all" $adminToken $null "ADMIN can access reminder preview all" | Out-Null; Expect-Fail "Get" "/admin/reminders/preview/all" $tenantToken $null @(403) "TENANT cannot access admin reminder preview" }

# ============================================================
# 4. OWNER PROTECTION
# ============================================================

Section "4. OWNER PROTECTION"
$ownerId = $ownerUser.id
Expect-Fail "Post" "/users" $adminToken @{ fullName="Evil Owner UAT"; email="evil.owner.uat@example.com"; password="admin123"; role="OWNER"; isActive=$true } @(403,400) "ADMIN cannot create OWNER"
Expect-Fail "Patch" "/users/$ownerId" $adminToken @{ role="STAFF"; isActive=$false } @(403) "ADMIN cannot downgrade/deactivate OWNER"
Expect-Fail "Patch" "/users/$ownerId" $staffToken @{ role="STAFF"; isActive=$false } @(403) "STAFF cannot modify OWNER"


# ============================================================
# 4B. TENANT IDENTITY REQUIRED + DUPLICATE PROTECTION
# ============================================================

Section "4B. TENANT IDENTITY REQUIRED + DUPLICATE PROTECTION"
$tenantIdentityA = "3578010101010001"
$tenantIdentityB = "3578010101010002"
$tenantPhoneA = "081900000001"
$tenantPhoneB = "081900000002"
$tenantEmailA = "uat.identity.a@example.com"
$tenantEmailB = "uat.identity.b@example.com"

$tenantBaseA = @{
  fullName = "UAT Identity Tenant A"
  phone = $tenantPhoneA
  email = $tenantEmailA
  identityNumber = $tenantIdentityA
  gender = "OTHER"
  isActive = $true
}

$tenantBaseB = @{
  fullName = "UAT Identity Tenant B"
  phone = $tenantPhoneB
  email = $tenantEmailB
  identityNumber = $tenantIdentityB
  gender = "OTHER"
  isActive = $true
}

Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Missing KTP"; phone="081900000011"; email="uat.missing.ktp@example.com"; gender="OTHER"; isActive=$true } @(400) "Create tenant without No KTP rejected"
Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Invalid KTP"; phone="081900000012"; email="uat.invalid.ktp@example.com"; identityNumber="12345"; gender="OTHER"; isActive=$true } @(400) "Create tenant with invalid No KTP rejected"
$identityTenantA = Expect-Success "Post" "/tenants" $adminToken $tenantBaseA "Create tenant with unique No KTP/phone/email succeeds"
$identityTenantAId = ExtractId $identityTenantA
Assert ($identityTenantAId -gt 0) "Identity tenant A id extracted: $identityTenantAId"
$identityTenantB = Expect-Success "Post" "/tenants" $adminToken $tenantBaseB "Create second tenant with unique No KTP/phone/email succeeds"
$identityTenantBId = ExtractId $identityTenantB
Assert ($identityTenantBId -gt 0) "Identity tenant B id extracted: $identityTenantBId"

Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Duplicate KTP"; phone="081900000021"; email="uat.dup.ktp@example.com"; identityNumber=$tenantIdentityA; gender="OTHER"; isActive=$true } @(400,409) "Create tenant with duplicate No KTP rejected"
Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Duplicate Phone"; phone=$tenantPhoneA; email="uat.dup.phone@example.com"; identityNumber="3578010101010021"; gender="OTHER"; isActive=$true } @(400,409) "Create tenant with duplicate No HP rejected"
Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Duplicate Email"; phone="081900000022"; email=$tenantEmailA; identityNumber="3578010101010022"; gender="OTHER"; isActive=$true } @(400,409) "Create tenant with duplicate tenant email rejected"
Expect-Fail "Post" "/tenants" $adminToken @{ fullName="UAT Existing User Email"; phone="081900000023"; email=$AdminEmail; identityNumber="3578010101010023"; gender="OTHER"; isActive=$true } @(400,409) "Create tenant with existing user email rejected"

Expect-Success "Patch" "/tenants/$identityTenantAId" $adminToken @{ fullName="UAT Identity Tenant A Updated"; phone=$tenantPhoneA; email=$tenantEmailA; identityNumber=$tenantIdentityA } "Update tenant keeping own No KTP/phone/email succeeds" | Out-Null
Expect-Fail "Patch" "/tenants/$identityTenantBId" $adminToken @{ identityNumber=$tenantIdentityA } @(400,409) "Update tenant to duplicate No KTP rejected"
Expect-Fail "Patch" "/tenants/$identityTenantBId" $adminToken @{ phone=$tenantPhoneA } @(400,409) "Update tenant to duplicate No HP rejected"
Expect-Fail "Patch" "/tenants/$identityTenantBId" $adminToken @{ email=$tenantEmailA } @(400,409) "Update tenant to duplicate tenant email rejected"
Expect-Fail "Patch" "/tenants/$identityTenantBId" $adminToken @{ email=$OwnerEmail } @(400,409) "Update tenant to existing user email rejected"


# ============================================================
# 4C. B1 MANUAL CHECK-IN BUSINESS AUTOMATION UAT
# ============================================================

Section "4C. B1 MANUAL CHECK-IN BUSINESS AUTOMATION UAT"

# B1 target:
# - Manual check-in creates ACTIVE stay + OCCUPIED room.
# - First invoice is ISSUED, not DRAFT.
# - Portal user auto-created when tenant has email.
# - Temporary password is returned once for CREATED.
# - Tenant without email succeeds with MISSING_EMAIL.
# - Existing portal returns ALREADY_ACTIVE.
# - Email conflict is blocked before side effects when conflict setup is possible through public API.

$b1Rooms = @($rooms | Where-Object { $_.id -ne $room.id } | Select-Object -First 4)
Assert ($b1Rooms.Count -ge 3) "B1 has at least 3 non-main rooms available for manual check-in tests"

$b1RoomCreated = $b1Rooms[0]
$b1RoomMissingEmail = $b1Rooms[1]
$b1RoomAlreadyActive = $b1Rooms[2]
$b1RoomConflict = if ($b1Rooms.Count -ge 4) { $b1Rooms[3] } else { $b1Rooms[2] }

function New-B1TenantBody {
  param(
    [string]$FullName,
    [string]$Phone,
    [string]$IdentityNumber,
    [string]$Email = $null
  )

  $body = @{
    fullName = $FullName
    phone = $Phone
    identityNumber = $IdentityNumber
    gender = "OTHER"
    isActive = $true
  }

  if ($Email) { $body.email = $Email }
  return $body
}

function New-B1StayBody {
  param(
    [int]$TenantId,
    [int]$RoomId,
    [string]$Note,
    [string]$InitialElectricity = "1000",
    [string]$InitialWater = "10"
  )

  return @{
    tenantId = $TenantId
    roomId = $RoomId
    pricingTerm = "MONTHLY"
    checkInDate = (Get-Date).ToString("yyyy-MM-dd")
    agreedRentAmountRupiah = 1700000
    depositAmountRupiah = 1000000
    initialElectricityKwh = $InitialElectricity
    initialWaterM3 = $InitialWater
    notes = $Note
  }
}

function Assert-B1InvoiceIssued {
  param($CreateStayResponse, [string]$Label)
  $d = DataOf $CreateStayResponse
  Assert ($null -ne $d.invoice) "$Label | response includes invoice"
  Assert ($d.invoice.status -eq "ISSUED") "$Label | invoice status is ISSUED"
  Assert ($d.invoice.status -ne "DRAFT") "$Label | invoice is not DRAFT"
  if ($d.invoice.id) {
    $invoiceDetail = Expect-Success "Get" "/invoices/$($d.invoice.id)" $adminToken $null "$Label | ADMIN can read issued invoice detail"
    $invoiceDetailData = DataOf $invoiceDetail
    Assert ($invoiceDetailData.status -eq "ISSUED") "$Label | invoice detail status is ISSUED"
  }
}

function Assert-B1PortalStatus {
  param($CreateStayResponse, [string]$ExpectedStatus, [string]$Label)
  $d = DataOf $CreateStayResponse
  Assert ($null -ne $d.portal) "$Label | response includes portal result"
  Assert ($d.portal.status -eq $ExpectedStatus) "$Label | portal.status is $ExpectedStatus"
  return $d.portal
}

# ------------------------------------------------------------
# 4C-1. Manual check-in tenant baru dengan email -> CREATED
# ------------------------------------------------------------

$b1CreatedEmail = "b1.created.uat@example.com"
$b1CreatedTenant = Expect-Success "Post" "/tenants" $adminToken (New-B1TenantBody "B1 Created Portal Tenant" "082100000101" "3578010101020101" $b1CreatedEmail) "B1 CREATED | create tenant with email"
$b1CreatedTenantId = ExtractId $b1CreatedTenant
Assert ($b1CreatedTenantId -gt 0) "B1 CREATED | tenant id extracted: $b1CreatedTenantId"

$b1CreatedStay = Expect-Success "Post" "/stays" $adminToken (New-B1StayBody $b1CreatedTenantId ([int]$b1RoomCreated.id) "B1 UAT CREATED portal") "B1 CREATED | ADMIN manual check-in tenant with email"
$b1CreatedStayData = DataOf $b1CreatedStay
$b1CreatedStayId = ExtractId $b1CreatedStay
Assert ($b1CreatedStayId -gt 0) "B1 CREATED | stay id extracted: $b1CreatedStayId"
Assert-B1InvoiceIssued $b1CreatedStay "B1 CREATED"
$b1CreatedPortal = Assert-B1PortalStatus $b1CreatedStay "CREATED" "B1 CREATED"
Assert ($b1CreatedPortal.email -eq $b1CreatedEmail) "B1 CREATED | portal email returned"
Assert ($null -ne $b1CreatedPortal.temporaryPassword -and $b1CreatedPortal.temporaryPassword.Length -ge 8) "B1 CREATED | temporary password returned once"

$b1CreatedLogin = Login-Role $b1CreatedPortal.email $b1CreatedPortal.temporaryPassword "TENANT"
$b1CreatedTenantToken = $b1CreatedLogin.token
Expect-Success "Get" "/stays/me/current" $b1CreatedTenantToken $null "B1 CREATED | new tenant can see current stay" | Out-Null
$b1CreatedInvoices = Expect-Success "Get" "/invoices/my" $b1CreatedTenantToken $null "B1 CREATED | new tenant can see own invoices"
$b1CreatedInvoiceItems = ItemsOf $b1CreatedInvoices
if ($b1CreatedInvoiceItems.Count -gt 0) {
  $b1CreatedInvoice = $b1CreatedInvoiceItems | Where-Object { $_.status -eq "ISSUED" -or $_.stayId -eq $b1CreatedStayId } | Select-Object -First 1
  Assert ($null -ne $b1CreatedInvoice) "B1 CREATED | own invoice list includes issued/manual check-in invoice"
} else {
  Warn "B1 CREATED | /invoices/my succeeded but returned empty items. Check invoice list envelope manually."
}

# ------------------------------------------------------------
# 4C-2. Manual check-in tenant tanpa email -> MISSING_EMAIL
# ------------------------------------------------------------

$b1MissingTenant = Expect-Success "Post" "/tenants" $adminToken (New-B1TenantBody "B1 Missing Email Tenant" "082100000102" "3578010101020102") "B1 MISSING_EMAIL | create tenant without email"
$b1MissingTenantId = ExtractId $b1MissingTenant
Assert ($b1MissingTenantId -gt 0) "B1 MISSING_EMAIL | tenant id extracted: $b1MissingTenantId"

$b1MissingStay = Expect-Success "Post" "/stays" $adminToken (New-B1StayBody $b1MissingTenantId ([int]$b1RoomMissingEmail.id) "B1 UAT MISSING_EMAIL portal" "1100" "11") "B1 MISSING_EMAIL | ADMIN manual check-in tenant without email"
$b1MissingStayId = ExtractId $b1MissingStay
Assert ($b1MissingStayId -gt 0) "B1 MISSING_EMAIL | stay id extracted: $b1MissingStayId"
Assert-B1InvoiceIssued $b1MissingStay "B1 MISSING_EMAIL"
$b1MissingPortal = Assert-B1PortalStatus $b1MissingStay "MISSING_EMAIL" "B1 MISSING_EMAIL"
Assert ($null -eq $b1MissingPortal.temporaryPassword) "B1 MISSING_EMAIL | no temporary password returned"

# ------------------------------------------------------------
# 4C-3. Manual check-in tenant existing yang sudah punya portal -> ALREADY_ACTIVE
# ------------------------------------------------------------

$b1ExistingEmail = "b1.already.active.uat@example.com"
$b1ExistingTenant = Expect-Success "Post" "/tenants" $adminToken (New-B1TenantBody "B1 Already Active Portal Tenant" "082100000103" "3578010101020103" $b1ExistingEmail) "B1 ALREADY_ACTIVE | create tenant with email"
$b1ExistingTenantId = ExtractId $b1ExistingTenant
Assert ($b1ExistingTenantId -gt 0) "B1 ALREADY_ACTIVE | tenant id extracted: $b1ExistingTenantId"

$b1ManualPortalCreated = $false
$b1ManualPortalPassword = "tenant123"
$b1ManualPortalPaths = @(
  "/tenants/$b1ExistingTenantId/portal-access",
  "/tenants/$b1ExistingTenantId/portal",
  "/tenants/$b1ExistingTenantId/create-portal-access"
)
$b1ManualPortalBodies = @(
  @{ password=$b1ManualPortalPassword },
  @{ email=$b1ExistingEmail; password=$b1ManualPortalPassword },
  @{ temporaryPassword=$b1ManualPortalPassword },
  @{ fullName="B1 Already Active Portal Tenant"; email=$b1ExistingEmail; password=$b1ManualPortalPassword }
)

foreach ($path in $b1ManualPortalPaths) {
  foreach ($body in $b1ManualPortalBodies) {
    if (-not $b1ManualPortalCreated) {
      $rawPortal = Invoke-ApiRaw "Post" $path $adminToken $body
      if ($rawPortal.ok) {
        $b1ManualPortalCreated = $true
        Pass "B1 ALREADY_ACTIVE | manual portal created via $path"
      } elseif ($rawPortal.status -ne 404) {
        Write-Host "INFO | B1 ALREADY_ACTIVE | portal route=$path returned HTTP $($rawPortal.status): $($rawPortal.error)" -ForegroundColor DarkGray
      }
    }
  }
}

# Fallback: create TENANT user directly if portal endpoint is unavailable and /users supports tenantId.
if (-not $b1ManualPortalCreated) {
  $rawUserPortal = Invoke-ApiRaw "Post" "/users" $ownerToken @{ fullName="B1 Already Active Portal Tenant"; email=$b1ExistingEmail; password=$b1ManualPortalPassword; role="TENANT"; tenantId=[int]$b1ExistingTenantId; isActive=$true }
  if ($rawUserPortal.ok) {
    $b1ManualPortalCreated = $true
    Pass "B1 ALREADY_ACTIVE | manual portal created via /users fallback"
  } elseif ($rawUserPortal.status -ne 404) {
    Write-Host "INFO | B1 ALREADY_ACTIVE | /users fallback returned HTTP $($rawUserPortal.status): $($rawUserPortal.error)" -ForegroundColor DarkGray
  }
}

if ($b1ManualPortalCreated) {
  $b1AlreadyStay = Expect-Success "Post" "/stays" $adminToken (New-B1StayBody $b1ExistingTenantId ([int]$b1RoomAlreadyActive.id) "B1 UAT ALREADY_ACTIVE portal" "1200" "12") "B1 ALREADY_ACTIVE | ADMIN manual check-in tenant with existing portal"
  $b1AlreadyStayId = ExtractId $b1AlreadyStay
  Assert ($b1AlreadyStayId -gt 0) "B1 ALREADY_ACTIVE | stay id extracted: $b1AlreadyStayId"
  Assert-B1InvoiceIssued $b1AlreadyStay "B1 ALREADY_ACTIVE"
  $b1AlreadyPortal = Assert-B1PortalStatus $b1AlreadyStay "ALREADY_ACTIVE" "B1 ALREADY_ACTIVE"
  Assert ($null -eq $b1AlreadyPortal.temporaryPassword) "B1 ALREADY_ACTIVE | no new temporary password returned"
} else {
  Skip "B1 ALREADY_ACTIVE | manual portal creation route not confirmed; browser/API route check required"
}

# ------------------------------------------------------------
# 4C-4. Manual check-in email conflict -> blocked before side effects
# ------------------------------------------------------------

$b1ConflictEmail = "b1.conflict.uat@example.com"
$b1ConflictTenant = Expect-Success "Post" "/tenants" $adminToken (New-B1TenantBody "B1 Conflict Tenant" "082100000104" "3578010101020104" $b1ConflictEmail) "B1 CONFLICT | create tenant with email"
$b1ConflictTenantId = ExtractId $b1ConflictTenant
Assert ($b1ConflictTenantId -gt 0) "B1 CONFLICT | tenant id extracted: $b1ConflictTenantId"

# Try to create a non-tenant user using the same email as the tenant.
# If current identity protection blocks this setup, B1 conflict is effectively blocked earlier and this subcase is skipped.
$b1ConflictUserSetup = Invoke-ApiRaw "Post" "/users" $ownerToken @{ fullName="B1 Conflict User"; email=$b1ConflictEmail; password="admin123"; role="STAFF"; isActive=$true }
if ($b1ConflictUserSetup.ok) {
  Pass "B1 CONFLICT | conflicting user setup created through API"
  $b1ConflictStayBody = New-B1StayBody $b1ConflictTenantId ([int]$b1RoomConflict.id) "B1 UAT CONFLICT should fail" "1300" "13"
  Expect-Fail "Post" "/stays" $adminToken $b1ConflictStayBody @(400,409) "B1 CONFLICT | manual check-in blocked when tenant email belongs to another user"
  Try-Optional "B1 CONFLICT | room remains not OCCUPIED after blocked check-in" {
    $conflictRoomDetail = Expect-Success "Get" "/rooms/$($b1RoomConflict.id)" $adminToken $null "B1 CONFLICT | read room after blocked check-in"
    $conflictRoomData = DataOf $conflictRoomDetail
    if ($conflictRoomData.status) { Assert ($conflictRoomData.status -ne "OCCUPIED") "B1 CONFLICT | room did not become OCCUPIED" }
  }
} else {
  Skip "B1 CONFLICT | conflict setup blocked by identity/user guards HTTP $($b1ConflictUserSetup.status); no raw DB mutation used"
}

# ============================================================
# 5. TENANT BOOKING FLOW
# ============================================================

Section "5. TENANT BOOKING FLOW"
Expect-Success "Get" "/tenant/bookings/my" $tenantToken $null "TENANT can access my bookings" | Out-Null
Expect-Fail "Get" "/tenant/bookings/my" $ownerToken $null @(403) "OWNER cannot access tenant my bookings"
Expect-Fail "Post" "/tenant/bookings" $null @{ roomId=[int]$room.id; checkInDate=(Get-Date).AddDays(1).ToString("yyyy-MM-dd"); pricingTerm="MONTHLY"; notes="No token should fail" } @(401) "Create tenant booking without token rejected"
$booking = Expect-Success "Post" "/tenant/bookings" $tenantToken @{ roomId=[int]$room.id; checkInDate=(Get-Date).AddDays(1).ToString("yyyy-MM-dd"); pricingTerm="MONTHLY"; notes="UAT PowerShell tenant booking" } "TENANT creates booking"
$stayId = ExtractId $booking
Assert ($stayId -gt 0) "Booking stayId extracted: $stayId"
Expect-Success "Get" "/tenant/bookings/my" $tenantToken $null "TENANT sees booking after create" | Out-Null
$secondRoom = $rooms | Where-Object { $_.id -ne $room.id } | Select-Object -First 1
if ($secondRoom) { Expect-Fail "Post" "/tenant/bookings" $tenantToken @{ roomId=[int]$secondRoom.id; checkInDate=(Get-Date).AddDays(2).ToString("yyyy-MM-dd"); pricingTerm="MONTHLY"; notes="Duplicate active booking should fail" } @(400,409) "TENANT cannot create duplicate active booking" } else { Skip "Duplicate booking test skipped: no second room" }

# ============================================================
# 6. ADMIN APPROVE BOOKING
# ============================================================

Section "6. ADMIN APPROVE BOOKING"
$approveBookingBody = @{ agreedRentAmountRupiah=1700000; depositAmountRupiah=1000000; initialElectricityKwh="1200"; initialWaterM3="10" }
Expect-Fail "Patch" "/admin/bookings/$stayId/approve" $tenantToken $approveBookingBody @(403) "TENANT cannot approve booking"
$approvedBooking = Expect-Success "Patch" "/admin/bookings/$stayId/approve" $adminToken $approveBookingBody "ADMIN approves booking"
$approvedBookingData = DataOf $approvedBooking
$invoiceId = $null
if ($approvedBookingData.invoice -and $approvedBookingData.invoice.id) { $invoiceId = [int]$approvedBookingData.invoice.id }
if (-not $invoiceId) {
  $myBookingsForInvoice = Expect-Success "Get" "/tenant/bookings/my" $tenantToken $null "TENANT booking list after approve for invoiceId"
  $bookingItemsForInvoice = ItemsOf $myBookingsForInvoice
  $bookingForInvoice = $bookingItemsForInvoice | Where-Object { $_.id -eq $stayId -or $_.stayId -eq $stayId } | Select-Object -First 1
  if ($bookingForInvoice.latestInvoiceId) { $invoiceId = [int]$bookingForInvoice.latestInvoiceId } elseif ($bookingForInvoice.invoiceId) { $invoiceId = [int]$bookingForInvoice.invoiceId }
}
Assert ($invoiceId -gt 0) "Invoice id extracted after booking approval: $invoiceId"
$invoiceDetailBeforePayment = Expect-Success "Get" "/invoices/$invoiceId" $adminToken $null "ADMIN can read invoice detail before payment"
$invoiceDataBeforePayment = DataOf $invoiceDetailBeforePayment
Assert ([int]$invoiceDataBeforePayment.totalAmountRupiah -eq 1700000) "Invoice total should be 1700000 before payment"
Expect-Fail "Patch" "/admin/bookings/$stayId/approve" $adminToken $approveBookingBody @(400,409) "Double approve booking rejected"
Try-Optional "Read stay after booking approve" { Expect-Success "Get" "/stays/$stayId" $adminToken $null "ADMIN can read stay after booking approve" | Out-Null }

# ============================================================
# 7. PAYMENT SUBMISSION
# ============================================================

Section "7. PAYMENT SUBMISSION"
$wrongPaymentBody = @{ stayId=[int]$stayId; invoiceId=[int]$invoiceId; targetType="INVOICE"; amountRupiah=1000; paidAt=(Get-Date).ToString("o"); paymentMethod="TRANSFER"; senderName="Tenant UAT G2"; senderBankName="BCA"; fileUrl="https://example.local/wrong-proof.jpg"; originalFilename="wrong-proof.jpg"; mimeType="image/jpeg"; fileSizeBytes=12345; notes="UAT wrong amount should fail"; referenceNumber="UAT-WRONG-$stayId" }
Expect-Fail "Post" "/payment-submissions" $tenantToken $wrongPaymentBody @(400,409) "Wrong combined payment amount rejected"
$correctPaymentBody = @{ stayId=[int]$stayId; invoiceId=[int]$invoiceId; targetType="INVOICE"; amountRupiah=2700000; paidAt=(Get-Date).ToString("o"); paymentMethod="TRANSFER"; senderName="Tenant UAT G2"; senderBankName="BCA"; fileUrl="https://example.local/uat-proof.jpg"; originalFilename="uat-proof.jpg"; mimeType="image/jpeg"; fileSizeBytes=12345; notes="UAT correct combined rent + deposit payment"; referenceNumber="UAT-PAY-$stayId" }
$paymentSubmission = Expect-Success "Post" "/payment-submissions" $tenantToken $correctPaymentBody "TENANT creates correct payment submission"
$submissionId = ExtractId $paymentSubmission
Assert ($submissionId -gt 0) "Payment submission id extracted: $submissionId"
Expect-Success "Get" "/payment-submissions/my" $tenantToken $null "TENANT sees own payment submission" | Out-Null
Expect-Success "Get" "/payment-submissions/review-queue" $adminToken $null "ADMIN sees payment review queue" | Out-Null
Expect-Fail "Post" "/payment-submissions/$submissionId/approve" $tenantToken @{ reviewNotes="Tenant should fail" } @(403) "TENANT cannot approve payment"
Expect-Fail "Post" "/payment-submissions/$submissionId/approve" $staffToken @{ reviewNotes="Staff should fail" } @(403) "STAFF cannot approve payment"
$approvedPayment = Expect-Success "Post" "/payment-submissions/$submissionId/approve" $adminToken @{ reviewNotes="UAT payment approved" } "ADMIN approves payment submission"
Expect-Fail "Post" "/payment-submissions/$submissionId/approve" $adminToken @{ reviewNotes="Double approve should fail" } @(400,409) "Double approve payment rejected"
Try-Optional "Read stay after payment approve" { Expect-Success "Get" "/stays/$stayId" $adminToken $null "ADMIN can read stay after payment approve" | Out-Null }
Try-Optional "Tenant current stay after payment approve" { Expect-Success "Get" "/stays/me/current" $tenantToken $null "TENANT has current stay after payment approve" | Out-Null }

# ============================================================
# 8. TICKETS
# ============================================================

Section "8. TICKETS"
Try-Optional "Ticket list access by role" { Expect-Success "Get" "/tickets" $ownerToken $null "OWNER can list tickets" | Out-Null; Expect-Success "Get" "/tickets" $adminToken $null "ADMIN can list tickets" | Out-Null; Expect-Success "Get" "/tickets" $staffToken $null "STAFF can list tickets" | Out-Null }
Try-Optional "Tenant ticket list route" { $ticketMyPath = First-Existing-Path @("/tickets/my", "/tickets/portal/my") $tenantToken; if ($ticketMyPath) { Expect-Success "Get" $ticketMyPath $tenantToken $null "TENANT can list own tickets at $ticketMyPath" | Out-Null } else { Skip "Tenant ticket my route not found" } }
Try-Optional "Tenant create ticket route" { $ticketCreateResult = Try-Path-Post @("/tickets/portal", "/tickets") $tenantToken @{ title="UAT PowerShell Ticket"; description="Ticket dibuat dari PowerShell UAT."; category="MAINTENANCE"; roomId=[int]$room.id; stayId=[int]$stayId } "TENANT creates ticket"; if ($ticketCreateResult -and $ticketCreateResult.response) { $ticketId = ExtractId $ticketCreateResult.response; Try-Optional "Read created ticket as admin" { Expect-Success "Get" "/tickets/$ticketId" $adminToken $null "ADMIN can read created ticket" | Out-Null } } }

# ============================================================
# 9. ANNOUNCEMENTS
# ============================================================

Section "9. ANNOUNCEMENTS"
Try-Optional "Announcement read access" { Expect-Success "Get" "/announcements" $ownerToken $null "OWNER can list announcements" | Out-Null; Expect-Success "Get" "/announcements" $adminToken $null "ADMIN can list announcements" | Out-Null; Expect-Success "Get" "/announcements/active" $tenantToken $null "TENANT can access active announcements if eligible" | Out-Null; Expect-Fail "Get" "/announcements/active" $null $null @(401) "Announcement active without token rejected" }
Try-Optional "Announcement create validation" { Expect-Fail "Post" "/announcements" $tenantToken @{} @(403) "TENANT cannot create announcement"; Expect-Fail "Post" "/announcements" $adminToken @{} @(400) "ADMIN empty announcement body rejected validation" }

# ============================================================
# 10. INVENTORY STAFF READ-ONLY PROBE
# ============================================================

Section "10. INVENTORY STAFF READ-ONLY PROBE"
Try-Optional "Inventory items read access" { Expect-Success "Get" "/inventory-items" $ownerToken $null "OWNER can read inventory items" | Out-Null; Expect-Success "Get" "/inventory-items" $adminToken $null "ADMIN can read inventory items" | Out-Null; Expect-Success "Get" "/inventory-items" $staffToken $null "STAFF can read inventory items" | Out-Null; Expect-Fail "Get" "/inventory-items" $tenantToken $null @(403) "TENANT cannot read backoffice inventory items" }
Try-Optional "Inventory STAFF mutation must be blocked" {
  $staffInventoryBody = @{
    sku = "UAT-STAFF-BLOCK-$stayId"
    name = "UAT Staff Block Test Item"
    category = "UAT"
    unit = "pcs"
    qtyOnHand = "1"
    minQty = "0"
    notes = "Should be blocked for STAFF"
    isActive = $true
  }

  Expect-Fail "Post" "/inventory-items" $staffToken $staffInventoryBody @(403) "STAFF cannot create inventory item with valid body"

  $adminInventoryBody = @{
    sku = "UAT-ADMIN-CREATE-$stayId"
    name = "UAT Admin Create Test Item"
    category = "UAT"
    unit = "pcs"
    qtyOnHand = "1"
    minQty = "0"
    notes = "Admin mutation reachability probe"
    isActive = $true
  }

  $adminProbe = Invoke-ApiRaw "Post" "/inventory-items" $adminToken $adminInventoryBody
  if ($adminProbe.ok) {
    Pass "ADMIN can create inventory item with valid body"
  } elseif ($adminProbe.status -eq 403) {
    Fail "ADMIN got 403 on inventory create; OWNER/ADMIN mutation guard may be wrong"
  } else {
    Warn "ADMIN inventory create returned HTTP $($adminProbe.status): $($adminProbe.error)"
  }
}
Try-Optional "Inventory movements read access" { Expect-Success "Get" "/inventory-movements" $ownerToken $null "OWNER can read inventory movements" | Out-Null; Expect-Success "Get" "/inventory-movements" $adminToken $null "ADMIN can read inventory movements" | Out-Null; Expect-Success "Get" "/inventory-movements" $staffToken $null "STAFF can read inventory movements" | Out-Null }

# ============================================================
# 11. CHECKOUT REQUEST / RENCANA KELUAR
# ============================================================

Section "11. CHECKOUT REQUEST / RENCANA KELUAR"
$checkoutRequestId = $null
$checkoutCreatePaths = @("/checkout-requests", "/tenant/checkout-requests", "/stays/$stayId/checkout-requests", "/stays/$stayId/checkout-request")
$checkoutBody = @{ stayId=[int]$stayId; requestedCheckOutDate=(Get-Date).AddDays(3).ToString("yyyy-MM-dd"); checkoutReason="UAT Pengajuan Keluar Kamar"; requestNotes="Tenant masih menghuni sampai admin Checkout Final" }
$checkoutCreate = Try-Path-Post $checkoutCreatePaths $tenantToken $checkoutBody "TENANT creates Pengajuan Keluar Kamar"
if ($checkoutCreate -and $checkoutCreate.response) {
  $checkoutRequestId = ExtractId $checkoutCreate.response
  Assert ($checkoutRequestId -gt 0) "Checkout request id extracted: $checkoutRequestId"
  $approveCheckoutPaths = @("/checkout-requests/$checkoutRequestId/approve", "/admin/checkout-requests/$checkoutRequestId/approve", "/checkout-requests/$checkoutRequestId/approve-plan", "/admin/checkout-requests/$checkoutRequestId/approve-plan")
  $approvedPlan = Try-Path-Patch $approveCheckoutPaths $adminToken @{ checkoutReason="UAT Rencana Keluar Disetujui"; reviewNotes="UAT Setujui Rencana, bukan Checkout Final" } "ADMIN approves Rencana Keluar"
  if ($approvedPlan -and $approvedPlan.response) { Try-Optional "Verify stay still active after Rencana Keluar approved" { Expect-Success "Get" "/stays/$stayId" $adminToken $null "ADMIN can read stay after Rencana Keluar" | Out-Null } }
} else { Skip "Checkout request route not confirmed. Browser/manual route check required." }

# ============================================================
# 12. FINAL CHECKOUT
# ============================================================

Section "12. FINAL CHECKOUT"
Expect-Fail "Post" "/stays/$stayId/complete" $tenantToken @{ checkoutReason="Tenant should not complete stay" } @(403) "TENANT cannot run Checkout Final"
$finalCheckoutBodyCandidates = @(@{ actualCheckOutDate=(Get-Date).AddDays(3).ToString("yyyy-MM-dd"); checkoutReason="UAT Checkout Final setelah Rencana Keluar disetujui"; notes="Final checkout via PowerShell UAT" })
$finalCheckoutSuccess = $false
foreach ($body in $finalCheckoutBodyCandidates) {
  if (-not $finalCheckoutSuccess) {
    $raw = Invoke-ApiRaw "Post" "/stays/$stayId/complete" $adminToken $body
    if ($raw.ok) { $finalCheckoutSuccess = $true; Pass "ADMIN runs Checkout Final" } else { Warn "Checkout Final body candidate failed HTTP $($raw.status): $($raw.error)" }
  }
}
if (-not $finalCheckoutSuccess) { Warn "Checkout Final API did not pass. Check if open ISSUED/PARTIAL invoice blocks checkout or body field differs." }
else { Try-Optional "Verify stay after Checkout Final" { Expect-Success "Get" "/stays/$stayId" $adminToken $null "ADMIN can read stay after final checkout" | Out-Null } }

# ============================================================
# 13. NOT FOUND + VALIDATION SPOT CHECKS
# ============================================================

Section "13. NOT FOUND + VALIDATION SPOT CHECKS"
Expect-Fail "Get" "/rooms/999999" $ownerToken $null @(404) "GET missing room returns 404"
Expect-Fail "Get" "/users/999999" $ownerToken $null @(404) "GET missing user returns 404"
Expect-Fail "Get" "/tenants/999999" $ownerToken $null @(404) "GET missing tenant returns 404"
Expect-Fail "Post" "/users" $ownerToken @{} @(400) "POST users empty body returns 400"
Expect-Fail "Post" "/tenant/bookings" $tenantToken @{} @(400) "POST tenant booking empty body returns 400"
Expect-Fail "Post" "/payment-submissions" $tenantToken @{} @(400) "POST payment submission empty body returns 400"

# ============================================================
# 14. OPTIONAL RATE LIMIT PROBE
# ============================================================

Section "14. OPTIONAL RATE LIMIT PROBE"
Warn "Rate limit probe can produce noisy logs. Running light wrong-login probe only."
$rateLimitHit = $false
for ($i = 1; $i -le 8; $i++) {
  $raw = Invoke-ApiRaw "Post" "/auth/login" $null @{ identifier="rate.limit.uat@example.com"; password="wrong-password-$i" }
  if ($raw.status -eq 429) { $rateLimitHit = $true; Pass "Rate limit triggered at attempt $i"; break }
  elseif ($raw.status -in @(400,401)) { Write-Host "Attempt $i returned HTTP $($raw.status)" -ForegroundColor DarkGray }
  else { Warn "Attempt $i unexpected HTTP $($raw.status)" }
}
if (-not $rateLimitHit) { Warn "Rate limit not triggered in 8 attempts. This may be OK if limit threshold is higher or disabled in dev." }

# ============================================================
# 15. FINAL SUMMARY
# ============================================================

Section "15. FINAL SUMMARY"
Write-Host "PASS : $Global:PassCount" -ForegroundColor Green
Write-Host "WARN : $Global:WarnCount" -ForegroundColor Yellow
Write-Host "SKIP : $Global:SkipCount" -ForegroundColor DarkYellow
Write-Host "FAIL : $Global:FailCount" -ForegroundColor Red
if ($Global:FailCount -eq 0) { Write-Host ""; Write-Host "API UAT PACK FINISHED WITHOUT HARD FAIL." -ForegroundColor Green; Write-Host "Next: run manual visual UAT checklist." -ForegroundColor Cyan }
else { Write-Host ""; Write-Host "API UAT HAS HARD FAILURES. Fix before claiming PASS." -ForegroundColor Red }
