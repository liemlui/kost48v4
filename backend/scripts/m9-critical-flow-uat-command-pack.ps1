<#
KOST48 M9C Critical Flow UAT Command Pack
- PowerShell-only helper for local UAT.
- Default mode is safe: discovers candidate data and writes a command pack.
- It DOES NOT execute mutation flows automatically.
- Copy/run generated commands one section at a time and record every created id.

Result labels:
- ENV_NOT_READY             = backend server/port is not reachable.
- AUTH_NOT_READY            = backend reachable, admin login failed.
- M9C_COMMAND_PACK_READY    = candidate discovery + command pack generation completed.
- M9C_DISCOVERY_WARN        = command pack generated, but one or more discovery reads failed.

Example:
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"
Unblock-File ".\scripts\m9-critical-flow-uat-command-pack.ps1"; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\m9-critical-flow-uat-command-pack.ps1

With real tenant credential for tenant candidate discovery:
.\scripts\m9-critical-flow-uat-command-pack.ps1 -TenantIdentifier "tenant@email.com" -TenantPassword "tenantPassword"
#>

[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$FrontendUrl = "http://localhost:5173",
  [int]$TimeoutSec = 30,
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123",
  [string]$TenantIdentifier = "",
  [string]$TenantPassword = "",
  [string]$StaffIdentifier = "staff@kost48.com",
  [string]$StaffPassword = "staff123",
  [string]$UatCode = "M9C",
  [switch]$NoReport,
  [switch]$NoCommandPackFile,
  [switch]$QuietCommands
)

$ErrorActionPreference = "Stop"
$script:Results = New-Object System.Collections.Generic.List[object]
$script:StartedAt = Get-Date

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$RootDir = Split-Path -Parent $BackendDir
$ReportPath = Join-Path $RootDir ("m9c-critical-flow-command-pack-report-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$CommandPackPath = Join-Path $RootDir ("m9c-critical-flow-command-pack-{0}.ps1" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

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
    foreach ($key in @("ready", "score", "basis", "mismatchCount", "totalItems", "found", "status", "id", "invoiceNumber", "invoiceId", "stayId", "roomId", "tenantId", "roomNumber", "name", "email")) {
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
    [string]$Group = "Discovery",
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
  param([string]$RoleName, [string]$Identifier, [string]$Password, [switch]$Optional)
  if ([string]::IsNullOrWhiteSpace($Identifier) -or [string]::IsNullOrWhiteSpace($Password)) {
    if ($Optional) { Write-Warn "Skip $RoleName login karena credential kosong."; return $null }
    throw "$RoleName credential kosong."
  }

  $response = Invoke-KostApi -Group "Auth" -Name "Login $RoleName" -Method POST -Path "/auth/login" -Body @{ identifier = $Identifier; password = $Password }
  if ($response -and $response.data -and $response.data.accessToken) {
    return @{ Authorization = "Bearer $($response.data.accessToken)" }
  }
  if ($Optional) { Write-Warn "Skip $RoleName candidate discovery karena login gagal."; return $null }
  return $null
}

function Get-Items {
  param($Response)
  if ($null -eq $Response -or $null -eq $Response.data) { return @() }
  if ($Response.data.items -and ($Response.data.items -is [array])) { return @($Response.data.items) }
  if ($Response.data -is [array]) { return @($Response.data) }
  return @($Response.data)
}

function Get-FirstItem {
  param($Response)
  $items = Get-Items -Response $Response
  if ($items.Count -gt 0) { return $items[0] }
  return $null
}

function Get-AnyField {
  param($Object, [string[]]$Names)
  if ($null -eq $Object) { return $null }
  foreach ($name in $Names) {
    if ($null -ne $Object.$name) { return $Object.$name }
  }
  return $null
}

function Add-Line {
  param([System.Collections.Generic.List[string]]$Lines, [string]$Text = "")
  $Lines.Add($Text) | Out-Null
}

function Add-CommandSection {
  param([System.Collections.Generic.List[string]]$Lines, [string]$Title)
  Add-Line $Lines ""
  Add-Line $Lines ("# " + ("=" * 76))
  Add-Line $Lines "# $Title"
  Add-Line $Lines ("# " + ("=" * 76))
}

function Format-CandidateLiteral {
  param($Value, [string]$Placeholder)
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
    return ('"{0}"' -f $Placeholder)
  }
  $s = [string]$Value
  if ($s -match '^\d+$') { return $s }
  $escaped = $s.Replace('`', '``').Replace('"', '`"')
  return ('"{0}"' -f $escaped)
}

function New-CriticalFlowCommandPack {
  param(
    [hashtable]$Candidates
  )

  $lines = New-Object System.Collections.Generic.List[string]
  $today = Get-Date -Format "yyyy-MM-dd"
  $tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
  $plus30 = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
  $nowIso = (Get-Date).ToString("o")

  $publicRoomLiteral = Format-CandidateLiteral -Value $Candidates.publicRoomId -Placeholder "PASTE_AVAILABLE_PUBLIC_ROOM_ID"
  $adminRoomLiteral = Format-CandidateLiteral -Value $Candidates.adminRoomId -Placeholder "PASTE_ROOM_ID"
  $activeStayLiteral = Format-CandidateLiteral -Value $Candidates.activeStayId -Placeholder "PASTE_ACTIVE_STAY_ID"
  $invoiceLiteral = Format-CandidateLiteral -Value $Candidates.invoiceId -Placeholder "PASTE_INVOICE_ID"
  $openInvoiceLiteral = Format-CandidateLiteral -Value $Candidates.openInvoiceId -Placeholder "PASTE_OPEN_INVOICE_ID"
  $inventoryItemLiteral = Format-CandidateLiteral -Value $Candidates.inventoryItemId -Placeholder "PASTE_INVENTORY_ITEM_ID"
  $completedStayLiteral = '"PASTE_COMPLETED_STAY_ID_WITH_HELD_DEPOSIT"'
  $activeStayUrl = ([string]$activeStayLiteral).Trim('"')
  $invoiceUrl = ([string]$invoiceLiteral).Trim('"')
  $adminRoomUrl = ([string]$adminRoomLiteral).Trim('"')

  Add-Line $lines "# KOST48 M9C Critical Flow UAT Command Pack"
  Add-Line $lines "# Generated: $((Get-Date).ToString('o'))"
  Add-Line $lines "# Default: safe. Discovery commands may run, but mutation sections are blocked until you set `$EnableMutation = `$true."
  Add-Line $lines "# Do not run against production DB. No DB reset. Record every created id."
  Add-Line $lines "# Candidate hints from generator:"
  foreach ($key in $Candidates.Keys) {
    Add-Line $lines ("# - {0}: {1}" -f $key, $Candidates[$key])
  }
  Add-Line $lines ""
  Add-Line $lines "`$baseUrl = `"$BaseUrl`""
  Add-Line $lines "`$frontendUrl = `"$FrontendUrl`""
  Add-Line $lines "`$today = `"$today`""
  Add-Line $lines "`$tomorrow = `"$tomorrow`""
  Add-Line $lines "`$plus30 = `"$plus30`""
  Add-Line $lines "`$uatCode = `"$UatCode`""
  Add-Line $lines "`$EnableMutation = `$false"
  Add-Line $lines ""
  Add-Line $lines 'function Confirm-UatMutation {'
  Add-Line $lines '  param([string]$Section)'
  Add-Line $lines '  if (-not $EnableMutation) {'
  Add-Line $lines '    throw "Mutation section ''$Section'' disabled. Review IDs, set `$EnableMutation = `$true, then run only that intended section."'
  Add-Line $lines '  }'
  Add-Line $lines '}'
  Add-Line $lines ""
  Add-Line $lines "# Login admin"
  Add-Line $lines "`$adminLogin = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/auth/login`" -ContentType `"application/json`" -Body '{`"identifier`":`"$AdminIdentifier`",`"password`":`"$AdminPassword`"}'"
  Add-Line $lines "`$adminToken = `$adminLogin.data.accessToken"
  Add-Line $lines "`$adminH = @{Authorization=`"Bearer `$adminToken`"}"
  Add-Line $lines ""
  Add-Line $lines "# Optional tenant/staff login. Replace with real local credentials before tenant/staff mutation UAT."
  Add-Line $lines "# `$tenantLogin = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/auth/login`" -ContentType `"application/json`" -Body '{`"identifier`":`"PASTE_TENANT_EMAIL`",`"password`":`"PASTE_TENANT_PASSWORD`"}'"
  Add-Line $lines "# `$tenantH = @{Authorization=`"Bearer `$(`$tenantLogin.data.accessToken)`"}"
  Add-Line $lines "# `$staffLogin = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/auth/login`" -ContentType `"application/json`" -Body '{`"identifier`":`"$StaffIdentifier`",`"password`":`"$StaffPassword`"}'"
  Add-Line $lines "# `$staffH = @{Authorization=`"Bearer `$(`$staffLogin.data.accessToken)`"}"

  Add-CommandSection $lines "0. Candidate discovery / baseline snapshot"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/public/rooms`""
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/rooms?limit=20`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/stays?limit=20`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/stays?status=ACTIVE&limit=20`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/invoices?limit=20`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/payment-submissions/review-queue?limit=20`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/admin/renew-requests?status=PENDING`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/admin/checkout-requests?status=PENDING`" -Headers `$adminH"
  Add-Line $lines "Invoke-RestMethod -Method Get -Uri `"`$baseUrl/deposit-ledger/reconciliation-lite`" -Headers `$adminH"

  Add-CommandSection $lines "1. Public booking flow"
  Add-Line $lines "Confirm-UatMutation '1. Public booking flow'"
  Add-Line $lines "# Candidate room is from discovery. Verify it is AVAILABLE before running. Booking/minat must not mean room is fully locked before payment. Do not set website: it is a honeypot anti-bot field."
  Add-Line $lines "`$roomId = $publicRoomLiteral # publicRoomId candidate from discovery"
  Add-Line $lines "`$publicBookingBody = @{ roomId=`$roomId; checkInDate=`$tomorrow; pricingTerm='MONTHLY'; fullName=(`"UAT `$uatCode Public Guest `" + (Get-Date -Format 'HHmmss')); phone='081234567890'; email=(`"uat-`$uatCode-`" + (Get-Date -Format 'HHmmss') + `"@example.com`" ); identityNumber='UAT-M9C'; emergencyContactName='Kontak UAT'; emergencyContactPhone='081111111111'; plannedCheckOutDate=`$plus30; stayPurpose='WORK'; notes='UAT M9C public booking first-paid priority' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "`$publicBooking = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/public/bookings`" -ContentType `"application/json`" -Body `$publicBookingBody"
  Add-Line $lines "`$publicBooking.data | Format-List"
  Add-Line $lines "`$bookingStayId = `$publicBooking.data.booking.stayId"

  Add-CommandSection $lines "2. Admin booking approve/reject safety"
  Add-Line $lines "Confirm-UatMutation '2. Admin booking approve/reject safety'"
  Add-Line $lines "# Approval must create/continue initial billing/payment path but not imply room is safe before payment approval."
  Add-Line $lines "# Requires `$bookingStayId from section 1, or set it manually: `$bookingStayId = PASTE_BOOKING_STAY_ID"
  Add-Line $lines "`$approveBookingBody = @{ agreedRentAmountRupiah=1700000; depositAmountRupiah=500000; initialElectricityKwh='0'; initialWaterM3='0' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "`$approvedBooking = Invoke-RestMethod -Method Patch -Uri `"`$baseUrl/admin/bookings/`$bookingStayId/approve`" -Headers `$adminH -ContentType `"application/json`" -Body `$approveBookingBody"
  Add-Line $lines "`$approvedBooking.data | Format-List"
  Add-Line $lines "# Reject should be tested on a DIFFERENT booking candidate, not the approved one."
  Add-Line $lines "# `$rejectBookingBody = @{ reviewNotes='UAT reject booking dengan alasan jelas' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# Invoke-RestMethod -Method Patch -Uri `"`$baseUrl/admin/bookings/PASTE_OTHER_BOOKING_STAY_ID/reject`" -Headers `$adminH -ContentType `"application/json`" -Body `$rejectBookingBody"

  Add-CommandSection $lines "3. Tenant payment proof + admin review"
  Add-Line $lines "Confirm-UatMutation '3. Tenant payment proof + admin review'"
  Add-Line $lines "# Prefer browser/multipart for real proof upload. API JSON path below is commented because it requires tenant token and invoice id from approved booking."
  Add-Line $lines "# Need tenant token for the tenant that owns the stay/invoice. Set `$tenantH first."
  Add-Line $lines "`$stayId = `$bookingStayId"
  Add-Line $lines "`$invoiceId = $invoiceLiteral # candidate invoiceId; replace with latest invoice id from approved booking/stay detail"
  Add-Line $lines "`$paymentBody = @{ stayId=`$stayId; invoiceId=`$invoiceId; targetType='INVOICE'; amountRupiah=1700000; paidAt='$nowIso'; paymentMethod='TRANSFER'; senderName='UAT M9C'; senderBankName='BCA'; referenceNumber=(`"UAT-`$uatCode-`" + (Get-Date -Format 'HHmmss')); notes='UAT M9C payment proof'; fileUrl='/uploads/payment-proofs/uat-m9c.jpg'; fileKey='uat-m9c.jpg'; originalFilename='uat-m9c.jpg'; mimeType='image/jpeg'; fileSizeBytes=1234 } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# `$paymentSubmission = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/payment-submissions`" -Headers `$tenantH -ContentType `"application/json`" -Body `$paymentBody"
  Add-Line $lines "# `$paymentSubmissionId = `$paymentSubmission.data.id"
  Add-Line $lines "# Invoke-RestMethod -Method Get -Uri `"`$baseUrl/payment-submissions/review-queue`" -Headers `$adminH"
  Add-Line $lines "# Invoke-RestMethod -Method Post -Uri `"`$baseUrl/payment-submissions/`$paymentSubmissionId/approve`" -Headers `$adminH"

  Add-CommandSection $lines "4. Renew request + meter checkpoint"
  Add-Line $lines "Confirm-UatMutation '4. Renew request + meter checkpoint'"
  Add-Line $lines "# Need active paid stay and tenant token. Approval must record meter and issue renewal invoice."
  Add-Line $lines "`$activeStayId = $activeStayLiteral # candidate ACTIVE stay id; verify it is owned by tenant before tenant flow"
  Add-Line $lines "`$renewBody = @{ stayId=`$activeStayId; requestedTerm='MONTHLY'; requestedCheckOutDate=`$plus30; requestNotes='UAT M9C ajukan perpanjangan' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# `$renew = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/tenant/renew-requests`" -Headers `$tenantH -ContentType `"application/json`" -Body `$renewBody"
  Add-Line $lines "# `$renewId = `$renew.data.id"
  Add-Line $lines "# `$approveRenewBody = @{ plannedCheckOutDate=`$plus30; agreedRentAmountRupiah=1700000; electricityReadingValue='10.000'; waterReadingValue='5.000'; meterReadingAt=(Get-Date).ToString('o'); reviewNotes='UAT M9C approve renew dengan meter checkpoint' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# Invoke-RestMethod -Method Post -Uri `"`$baseUrl/admin/renew-requests/`$renewId/approve`" -Headers `$adminH -ContentType `"application/json`" -Body `$approveRenewBody"

  Add-CommandSection $lines "5. Checkout request + final checkout blocker"
  Add-Line $lines "Confirm-UatMutation '5. Checkout request + final checkout blocker'"
  Add-Line $lines "# Tenant ajukan keluar. Admin approval is NOT final checkout. Final checkout must remain blocked by open invoice."
  Add-Line $lines "`$openInvoiceId = $openInvoiceLiteral # candidate open invoice id for blocker investigation"
  Add-Line $lines "`$checkoutBody = @{ stayId=`$activeStayId; requestedCheckOutDate=`$plus30; checkoutReason='UAT selesai masa sewa'; requestNotes='UAT M9C ajukan keluar' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# `$checkout = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/tenant/checkout-requests`" -Headers `$tenantH -ContentType `"application/json`" -Body `$checkoutBody"
  Add-Line $lines "# `$checkoutRequestId = `$checkout.data.id"
  Add-Line $lines "# `$approveCheckoutBody = @{ actualCheckOutDate=`$plus30; checkoutReason='UAT selesai masa sewa'; reviewNotes='UAT M9C approve checkout request, bukan final checkout' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# Invoke-RestMethod -Method Patch -Uri `"`$baseUrl/admin/checkout-requests/`$checkoutRequestId/approve`" -Headers `$adminH -ContentType `"application/json`" -Body `$approveCheckoutBody"
  Add-Line $lines "# Negative test: if stay has open invoice, this should fail with 409 / blocker."
  Add-Line $lines "# try { Invoke-RestMethod -Method Post -Uri `"`$baseUrl/stays/`$activeStayId/complete`" -Headers `$adminH -ContentType `"application/json`" -Body (@{ actualCheckOutDate=`$plus30; checkoutReason='UAT final checkout blocker'; notes='Expect blocked if open invoice exists' } | ConvertTo-Json -Depth 8) } catch { `$_.ErrorDetails.Message }"

  Add-CommandSection $lines "6. Deposit settlement after valid final checkout"
  Add-Line $lines "Confirm-UatMutation '6. Deposit settlement after valid final checkout'"
  Add-Line $lines "# Run only on a COMPLETED stay with HELD deposit. Deposit remains dana titipan/liability."
  Add-Line $lines "`$completedStayId = $completedStayLiteral # replace manually; no safe completed-stay candidate is auto-selected"
  Add-Line $lines "# Full refund example:"
  Add-Line $lines "# `$depositBody = @{ action='FULL_REFUND'; depositDeductionRupiah=0; depositRefundedRupiah=500000; depositNote='UAT M9C full refund deposit' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# Invoke-RestMethod -Method Post -Uri `"`$baseUrl/stays/`$completedStayId/deposit/process`" -Headers `$adminH -ContentType `"application/json`" -Body `$depositBody"
  Add-Line $lines "# Invoke-RestMethod -Method Get -Uri `"`$baseUrl/deposit-ledger/reconciliation-lite`" -Headers `$adminH"

  Add-CommandSection $lines "7. Inventory lifecycle + staff guard"
  Add-Line $lines "Confirm-UatMutation '7. Inventory lifecycle + staff guard'"
  Add-Line $lines "# Admin mutation should update official stock truth. Staff official movement should be 403."
  Add-Line $lines "`$itemId = $inventoryItemLiteral # inventoryItemId candidate from discovery"
  Add-Line $lines "`$targetRoomId = $adminRoomLiteral # adminRoomId candidate from discovery"
  Add-Line $lines "`$inBody = @{ itemId=`$itemId; movementType='IN'; qty='1'; movementDate=`$today; note='UAT M9C barang masuk' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "Invoke-RestMethod -Method Post -Uri `"`$baseUrl/inventory-movements`" -Headers `$adminH -ContentType `"application/json`" -Body `$inBody"
  Add-Line $lines "`$assignBody = @{ itemId=`$itemId; movementType='ASSIGN_TO_ROOM'; qty='1'; roomId=`$targetRoomId; movementDate=`$today; note='UAT M9C pasang ke kamar' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "Invoke-RestMethod -Method Post -Uri `"`$baseUrl/inventory-movements`" -Headers `$adminH -ContentType `"application/json`" -Body `$assignBody"
  Add-Line $lines "`$returnBody = @{ itemId=`$itemId; movementType='RETURN_FROM_ROOM'; qty='1'; roomId=`$targetRoomId; movementDate=`$today; note='UAT M9C kembali dari kamar' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "Invoke-RestMethod -Method Post -Uri `"`$baseUrl/inventory-movements`" -Headers `$adminH -ContentType `"application/json`" -Body `$returnBody"
  Add-Line $lines "# Staff forbidden smoke, expect 403:"
  Add-Line $lines "# try { Invoke-RestMethod -Method Post -Uri `"`$baseUrl/inventory-movements`" -Headers `$staffH -ContentType `"application/json`" -Body `$inBody } catch { `$_.ErrorDetails.Message }"

  Add-CommandSection $lines "8. Staff field report + admin review"
  Add-Line $lines "Confirm-UatMutation '8. Staff field report + admin review'"
  Add-Line $lines "# Staff reports issue/restock need; admin decides. Staff does not create official stock movement directly."
  Add-Line $lines "`$reportBody = @{ roomId=`$targetRoomId; inventoryItemId=`$itemId; reportedCondition='NEEDS_REPAIR'; conditionNotes='UAT M9C laporan kondisi barang perlu dicek admin'; requestsReplacement=`$false } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# `$fieldReport = Invoke-RestMethod -Method Post -Uri `"`$baseUrl/staff-field-reports`" -Headers `$staffH -ContentType `"application/json`" -Body `$reportBody"
  Add-Line $lines "# `$fieldReportId = `$fieldReport.data.id"
  Add-Line $lines "# `$reviewBody = @{ adminDecision='APPROVE'; adminNotes='UAT M9C admin approve laporan staff' } | ConvertTo-Json -Depth 8"
  Add-Line $lines "# Invoke-RestMethod -Method Patch -Uri `"`$baseUrl/staff-field-reports/`$fieldReportId/admin-review`" -Headers `$adminH -ContentType `"application/json`" -Body `$reviewBody"

  Add-CommandSection $lines "9. Manual browser smoke before FULL PASS"
  foreach ($page in @("/dashboard", "/stays", "/stays/$activeStayUrl", "/invoices", "/invoices/$invoiceUrl", "/payment-submissions/review", "/renew-requests", "/rooms", "/rooms/$adminRoomUrl", "/staff-warehouse", "/portal/stay", "/portal/invoices", "/portal/bookings", "/rooms")) {
    Add-Line $lines "# Open: $FrontendUrl$page"
  }
  Add-Line $lines "# Manual rules: no no-op CTA/link #; filters not primary CTA; tenant copy avoids raw backend terms; tables readable desktop/tablet/mobile; checkout approval is not final checkout; final checkout blocked by open invoice including DRAFT; staff reports issues/restock, not official stock mutation."

  return ($lines -join [Environment]::NewLine)
}

function Write-ReportAndExit {
  param([string]$Label, [int]$ExitCode, [string]$Note, [hashtable]$Candidates = @{}, [string]$CommandPack = "")
  $endedAt = Get-Date
  $passed = @($script:Results | Where-Object { $_.passed }).Count
  $failed = @($script:Results | Where-Object { -not $_.passed }).Count
  $report = [ordered]@{
    name = "KOST48 M9C Critical Flow UAT Command Pack"
    label = $Label
    note = $Note
    startedAt = $script:StartedAt.ToString("o")
    endedAt = $endedAt.ToString("o")
    baseUrl = $BaseUrl
    frontendUrl = $FrontendUrl
    rootDir = $RootDir
    reportPath = if ($NoReport) { $null } else { $ReportPath }
    commandPackPath = if ($NoCommandPackFile) { $null } else { $CommandPackPath }
    totals = [ordered]@{ passed = $passed; failed = $failed }
    candidates = $Candidates
    results = $script:Results
    next = @(
      "Run generated command pack one section at a time.",
      "Do not claim M9 FULL PASS until critical mutation flow + manual browser smoke pass.",
      "Delete failed/noise reports before commit.",
      "Restore backend/src/generated/prisma before commit if generated files changed."
    )
  }

  if (-not $NoCommandPackFile -and -not [string]::IsNullOrWhiteSpace($CommandPack)) {
    $CommandPack | Out-File -FilePath $CommandPackPath -Encoding UTF8
  }
  if (-not $NoReport) {
    $report | ConvertTo-Json -Depth 20 | Out-File -FilePath $ReportPath -Encoding UTF8
  }

  Write-Section "Summary"
  Write-Host "Label   : $Label" -ForegroundColor Cyan
  Write-Host "Passed  : $passed" -ForegroundColor Green
  Write-Host "Failed  : $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
  Write-Host "Note    : $Note" -ForegroundColor Gray
  if (-not $NoCommandPackFile -and -not [string]::IsNullOrWhiteSpace($CommandPack)) { Write-Host "Commands: $CommandPackPath" -ForegroundColor Gray }
  if (-not $NoReport) { Write-Host "Report  : $ReportPath" -ForegroundColor Gray }
  exit $ExitCode
}

Write-Host "`n=== KOST48 M9C Critical Flow UAT Command Pack ===" -ForegroundColor Cyan
Write-Host "BaseUrl     : $BaseUrl"
Write-Host "FrontendUrl : $FrontendUrl"
Write-Host "RootDir     : $RootDir"
Write-Host "Backend     : $BackendDir"
Write-Host "CommandPack : $CommandPackPath"
Write-Host "Report      : $ReportPath"

Write-Section "Preflight backend connectivity"
if (-not (Test-BackendReachable)) {
  Write-Fail "Backend not reachable at $BaseUrl"
  Write-ReportAndExit -Label "ENV_NOT_READY" -ExitCode 2 -Note "Backend not reachable. Start backend first, then rerun M9C command-pack generator."
}
Write-Ok "Backend reachable at $BaseUrl"

Write-Section "Admin login"
$adminH = Login-Role -RoleName "ADMIN" -Identifier $AdminIdentifier -Password $AdminPassword
if ($null -eq $adminH) {
  Write-ReportAndExit -Label "AUTH_NOT_READY" -ExitCode 3 -Note "Admin login failed. Critical command pack needs admin token for candidate discovery."
}

$tenantH = $null
$staffH = $null
Write-Section "Optional role login"
$tenantH = Login-Role -RoleName "TENANT" -Identifier $TenantIdentifier -Password $TenantPassword -Optional
$staffH = Login-Role -RoleName "STAFF" -Identifier $StaffIdentifier -Password $StaffPassword -Optional

Write-Section "Candidate discovery"
$publicRooms = Invoke-KostApi -Group "Discovery" -Name "Public rooms" -Path "/public/rooms"
$rooms = Invoke-KostApi -Group "Discovery" -Name "Admin rooms" -Path "/rooms?limit=20" -Headers $adminH
$stays = Invoke-KostApi -Group "Discovery" -Name "All stays" -Path "/stays?limit=20" -Headers $adminH
$activeStays = Invoke-KostApi -Group "Discovery" -Name "Active stays" -Path "/stays?status=ACTIVE&limit=20" -Headers $adminH
$invoices = Invoke-KostApi -Group "Discovery" -Name "Invoices" -Path "/invoices?limit=20" -Headers $adminH
$openInvoices = Invoke-KostApi -Group "Discovery" -Name "Open invoices" -Path "/invoices?status=ISSUED&limit=20" -Headers $adminH
$paymentQueue = Invoke-KostApi -Group "Discovery" -Name "Payment queue" -Path "/payment-submissions/review-queue?limit=20" -Headers $adminH
$renewQueue = Invoke-KostApi -Group "Discovery" -Name "Pending renew requests" -Path "/admin/renew-requests?status=PENDING" -Headers $adminH
$checkoutQueue = Invoke-KostApi -Group "Discovery" -Name "Pending checkout requests" -Path "/admin/checkout-requests?status=PENDING" -Headers $adminH
$inventoryItems = Invoke-KostApi -Group "Discovery" -Name "Inventory items" -Path "/inventory-items?limit=20" -Headers $adminH
$fieldReviewQueue = Invoke-KostApi -Group "Discovery" -Name "Staff field review queue" -Path "/staff-field-reports/review-queue" -Headers $adminH
$depositReconciliation = Invoke-KostApi -Group "Discovery" -Name "Deposit reconciliation" -Path "/deposit-ledger/reconciliation-lite" -Headers $adminH

$tenantCurrentStay = $null
$tenantInvoices = $null
$tenantBookings = $null
$tenantRenew = $null
$tenantCheckout = $null
if ($tenantH) {
  Write-Section "Tenant candidate discovery"
  $tenantCurrentStay = Invoke-KostApi -Group "Tenant discovery" -Name "Tenant current stay" -Path "/stays/me/current" -Headers $tenantH
  $tenantInvoices = Invoke-KostApi -Group "Tenant discovery" -Name "Tenant invoices" -Path "/invoices/my?limit=20" -Headers $tenantH
  $tenantBookings = Invoke-KostApi -Group "Tenant discovery" -Name "Tenant bookings" -Path "/tenant/bookings/my?limit=20" -Headers $tenantH
  $tenantRenew = Invoke-KostApi -Group "Tenant discovery" -Name "Tenant renew requests" -Path "/tenant/renew-requests/my" -Headers $tenantH
  $tenantCheckout = Invoke-KostApi -Group "Tenant discovery" -Name "Tenant checkout requests" -Path "/tenant/checkout-requests/my" -Headers $tenantH
}

$firstPublicRoom = Get-FirstItem -Response $publicRooms
$firstRoom = Get-FirstItem -Response $rooms
$firstActiveStay = Get-FirstItem -Response $activeStays
$firstInvoice = Get-FirstItem -Response $invoices
$firstOpenInvoice = Get-FirstItem -Response $openInvoices
$firstInventoryItem = Get-FirstItem -Response $inventoryItems

$candidates = [ordered]@{
  publicRoomId = Get-AnyField -Object $firstPublicRoom -Names @("id", "roomId")
  adminRoomId = Get-AnyField -Object $firstRoom -Names @("id", "roomId")
  activeStayId = Get-AnyField -Object $firstActiveStay -Names @("id", "stayId")
  invoiceId = Get-AnyField -Object $firstInvoice -Names @("id", "invoiceId")
  openInvoiceId = Get-AnyField -Object $firstOpenInvoice -Names @("id", "invoiceId")
  inventoryItemId = Get-AnyField -Object $firstInventoryItem -Names @("id", "itemId")
  depositReady = if ($depositReconciliation -and $depositReconciliation.data) { $depositReconciliation.data.ready } else { $null }
  tenantDiscovery = if ($tenantH) { "attempted" } else { "skipped_no_tenant_credentials" }
}

Write-Section "Candidate hints"
foreach ($key in $candidates.Keys) {
  Write-Host ("{0,-18}: {1}" -f $key, $candidates[$key]) -ForegroundColor Gray
}

$commandPack = New-CriticalFlowCommandPack -Candidates $candidates
if (-not $QuietCommands) {
  Write-Section "Generated command pack preview"
  Write-Host $commandPack -ForegroundColor Gray
}

$failed = @($script:Results | Where-Object { -not $_.passed }).Count
if ($failed -gt 0) {
  Write-ReportAndExit -Label "M9C_DISCOVERY_WARN" -ExitCode 1 -Note "Command pack generated, but one or more candidate discovery reads failed. Review report before mutation UAT." -Candidates $candidates -CommandPack $commandPack
}

Write-ReportAndExit -Label "M9C_COMMAND_PACK_READY" -ExitCode 0 -Note "Command pack generated. Run critical mutation commands one section at a time; this script did not mutate data." -Candidates $candidates -CommandPack $commandPack
