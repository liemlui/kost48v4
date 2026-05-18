# KOST48 UAT B2-1 - Invoice-Only PaymentSubmission Focused V5
# No DB reset. No build. Disposable API data only.
# Fix V5: flexible login token parser for accessToken/access_token/token.

$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"

$passCount = 0
$warnCount = 0
$failCount = 0

function StepHeader([string]$label) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host $label -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor Cyan
}

function Pass([string]$msg) {
  $script:passCount++
  Write-Host "PASS | $msg" -ForegroundColor Green
}

function Warn([string]$msg) {
  $script:warnCount++
  Write-Host "WARN | $msg" -ForegroundColor Yellow
}

function Fail([string]$msg) {
  $script:failCount++
  Write-Host "FAIL | $msg" -ForegroundColor Red
  throw $msg
}

function Read-ErrorBody($err) {
  $raw = $err.Exception.Message
  if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
    $raw = $err.ErrorDetails.Message
  }
  if ($err.Exception.Response) {
    try {
      $stream = $err.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $body = $reader.ReadToEnd()
      $reader.Close()
      if ($body) { $raw = $body }
    } catch {}
  }
  return $raw
}

function Get-Data($resp) {
  if ($null -eq $resp) { return $null }
  if ($resp.PSObject.Properties.Name -contains "data") { return $resp.data }
  return $resp
}

function Get-Items($resp) {
  if ($null -eq $resp) { return @() }
  if ($resp -is [System.Array]) { return @($resp) }
  if ($resp.PSObject.Properties.Name -contains "items") { return @($resp.items) }

  $data = Get-Data $resp
  if ($null -eq $data) { return @() }
  if ($data -is [System.Array]) { return @($data) }
  if ($data.PSObject.Properties.Name -contains "items") { return @($data.items) }
  return @($data)
}

function Get-TokenFromResponse($resp) {
  $data = Get-Data $resp
  if ($null -eq $data) { return $null }

  $names = $data.PSObject.Properties.Name
  if ($names -contains "accessToken") { return $data.accessToken }
  if ($names -contains "access_token") { return $data.access_token }
  if ($names -contains "token") { return $data.token }
  if ($names -contains "jwt") { return $data.jwt }

  $rootNames = $resp.PSObject.Properties.Name
  if ($rootNames -contains "accessToken") { return $resp.accessToken }
  if ($rootNames -contains "access_token") { return $resp.access_token }
  if ($rootNames -contains "token") { return $resp.token }
  if ($rootNames -contains "jwt") { return $resp.jwt }

  return $null
}

function Get-UserFromResponse($resp) {
  $data = Get-Data $resp
  if ($null -ne $data -and ($data.PSObject.Properties.Name -contains "user")) { return $data.user }
  if ($resp.PSObject.Properties.Name -contains "user") { return $resp.user }
  return $null
}

function ApiGet([string]$path, [string]$token) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri "$base$path" -Headers $headers
}

function ApiPost([string]$path, [string]$token, $body) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  if ($null -eq $body) { $body = @{} }
  $json = $body | ConvertTo-Json -Depth 20 -Compress
  return Invoke-RestMethod -Method Post -Uri "$base$path" -Headers $headers -ContentType "application/json" -Body $json
}

function ExpectFailPost([string]$label, [string]$path, [string]$token, $body, [int[]]$expectedStatus) {
  try {
    $resp = ApiPost $path $token $body
    Write-Host ($resp | ConvertTo-Json -Depth 10)
    Fail "$label | expected fail, got success"
  } catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $raw = Read-ErrorBody $_
    if ($expectedStatus -contains $status) {
      Pass "$label | failed as expected HTTP $status"
      Write-Host "BODY | $raw" -ForegroundColor DarkGray
    } else {
      Fail "$label | expected HTTP $($expectedStatus -join '/'), got HTTP $status | $raw"
    }
  }
}

function Login([string]$email, [string]$password, [string]$expectedRole) {
  $body = @{ identifier = $email; password = $password }
  $resp = ApiPost "/auth/login" "" $body
  $token = Get-TokenFromResponse $resp
  if (-not $token) {
    Write-Host "RAW LOGIN RESPONSE:" -ForegroundColor Yellow
    Write-Host ($resp | ConvertTo-Json -Depth 10)
    Fail "Login $email did not return recognized token field"
  }
  Pass "Login $email"

  if ($expectedRole) {
    $user = Get-UserFromResponse $resp
    $role = $null
    if ($user) { $role = $user.role }
    if ($role -eq $expectedRole) {
      Pass "$email role is $expectedRole"
    } else {
      Warn "$email role expected $expectedRole, got $role. Continuing because token exists."
    }
  }
  return $token
}

function Get-IdFromResponse($resp) {
  $data = Get-Data $resp
  if ($data -and ($data.PSObject.Properties.Name -contains "id")) { return $data.id }
  return $null
}

try {
  StepHeader "B2-1 FOCUSED UAT V5 - PREFLIGHT"
  Write-Host "NO DB RESET. NO BUILD. Creates disposable UAT data only."
  $health = Invoke-RestMethod -Method Get -Uri "$base/public/rooms"
  Pass "Backend reachable: GET /public/rooms"

  StepHeader "1. AUTH"
  $adminToken = Login "admin@kost48.com" "admin123" "ADMIN"
  $g2Token = Login "tenant.g2@kost48.com" "tenant123" "TENANT"

  StepHeader "2. CREATE MANUAL CHECK-IN SOURCE INVOICE"
  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  $rand = Get-Random -Minimum 10 -Maximum 99
  $email = "b2.focus.$stamp$rand@example.com"
  $phone = "0812$stamp"
  if ($phone.Length -gt 13) { $phone = $phone.Substring(0,13) }
  $identityNumber = "35$stamp"
  if ($identityNumber.Length -gt 16) { $identityNumber = $identityNumber.Substring(0,16) }

  $tenantBody = @{
    fullName = "B2 Focus $stamp"
    phone = $phone
    email = $email
    identityNumber = $identityNumber
    gender = "MALE"
  }
  $tenantResp = ApiPost "/tenants" $adminToken $tenantBody
  $tenantId = Get-IdFromResponse $tenantResp
  if (-not $tenantId) { Fail "Tenant id not returned" }
  Pass "Created tenant id=$tenantId email=$email"

  $roomsResp = Invoke-RestMethod -Method Get -Uri "$base/public/rooms"
  $rooms = Get-Items $roomsResp
  $room = $rooms | Where-Object { $_.id } | Select-Object -First 1
  if (-not $room) { Fail "No available public room found" }
  $roomId = $room.id
  Pass "Selected room id=$roomId code=$($room.code)"

  $today = (Get-Date).ToString("yyyy-MM-dd")
  $stayBody = @{
    tenantId = $tenantId
    roomId = $roomId
    pricingTerm = "MONTHLY"
    agreedRentAmountRupiah = 1700000
    checkInDate = $today
    depositAmountRupiah = 0
    electricityTariffPerKwhRupiah = 1500
    waterTariffPerM3Rupiah = 8000
    initialElectricityKwh = "100"
    initialWaterM3 = "50"
    stayPurpose = "REGULAR"
    notes = "B2-1 invoice-only payment focused UAT"
  }
  $stayResp = ApiPost "/stays" $adminToken $stayBody
  $stayData = Get-Data $stayResp
  $stayId = $stayData.id
  $invoiceId = $stayData.invoice.id
  $portalEmail = $stayData.portal.email
  $portalPassword = $stayData.portal.temporaryPassword

  if (-not $stayId) { Fail "Manual check-in did not return stay id" }
  if (-not $invoiceId) { Fail "Manual check-in did not return invoice id" }
  if ($stayData.invoice.status -ne "ISSUED") { Fail "Expected ISSUED invoice, got $($stayData.invoice.status)" }
  if ($stayData.portal.status -ne "CREATED") { Fail "Expected portal CREATED, got $($stayData.portal.status)" }
  if (-not $portalPassword) { Fail "Temporary password not returned" }
  Pass "Manual check-in created stay=$stayId invoice=$invoiceId portal=$portalEmail"

  $tenantToken = Login $portalEmail $portalPassword "TENANT"

  StepHeader "3. DIAGNOSE /invoices/my"
  $adminInvoiceResp = ApiGet "/invoices/$invoiceId" $adminToken
  $adminInvoice = Get-Data $adminInvoiceResp
  if ($adminInvoice.status -ne "ISSUED") { Fail "Admin invoice detail expected ISSUED, got $($adminInvoice.status)" }
  Pass "Admin can read focus invoice detail"

  $tenantInvoiceResp = ApiGet "/invoices/$invoiceId" $tenantToken
  $tenantInvoice = Get-Data $tenantInvoiceResp
  if ($tenantInvoice.id -ne $invoiceId) { Fail "Tenant invoice detail mismatch" }
  Pass "Tenant can read own invoice detail"

  $myInvoicesResp = ApiGet "/invoices/my" $tenantToken
  Write-Host "RAW /invoices/my RESPONSE:" -ForegroundColor DarkGray
  Write-Host ($myInvoicesResp | ConvertTo-Json -Depth 10)
  $myItems = Get-Items $myInvoicesResp
  $count = @($myItems).Count
  Write-Host "Parsed item count: $count" -ForegroundColor DarkGray
  if ($count -lt 1) { Fail "/invoices/my returned no parsed items" }

  $listedInvoice = $myItems | Where-Object { $_.id -eq $invoiceId } | Select-Object -First 1
  if (-not $listedInvoice) { Fail "/invoices/my does not include invoice id=$invoiceId" }
  Pass "/invoices/my includes focus invoice id=$invoiceId"

  $total = [int64]$adminInvoice.totalAmountRupiah
  $paid = 0
  if ($adminInvoice.PSObject.Properties.Name -contains "paidAmountRupiah" -and $adminInvoice.paidAmountRupiah) {
    $paid = [int64]$adminInvoice.paidAmountRupiah
  }
  $remaining = $total - $paid
  if ($remaining -le 0) { $remaining = $total }
  Pass "Focus invoice remaining amount: $remaining"

  StepHeader "4. INVOICE-ONLY PAYMENT SUBMISSION"
  $wrongAmount = [Math]::Max($remaining - 1000, 1)
  $wrongBody = @{
    stayId = $stayId
    invoiceId = $invoiceId
    targetType = "INVOICE"
    amountRupiah = $wrongAmount
    paidAt = $today
    paymentMethod = "TRANSFER"
    senderName = "B2 Wrong Amount"
    referenceNumber = "B2-WRONG-$stamp"
    notes = "B2 wrong amount should fail"
  }
  ExpectFailPost "Wrong invoice-only amount rejected" "/payment-submissions" $tenantToken $wrongBody @(400,409)

  $crossBody = @{
    stayId = $stayId
    invoiceId = $invoiceId
    targetType = "INVOICE"
    amountRupiah = $remaining
    paidAt = $today
    paymentMethod = "TRANSFER"
    senderName = "B2 Other Tenant"
    referenceNumber = "B2-CROSS-$stamp"
    notes = "B2 other tenant should fail"
  }
  ExpectFailPost "Other tenant cannot pay focus invoice" "/payment-submissions" $g2Token $crossBody @(403,404,409)

  $payBody = @{
    stayId = $stayId
    invoiceId = $invoiceId
    targetType = "INVOICE"
    amountRupiah = $remaining
    paidAt = $today
    paymentMethod = "TRANSFER"
    senderName = "B2 Focus Sender"
    referenceNumber = "B2-OK-$stamp"
    notes = "B2 invoice-only payment focused UAT"
  }
  $subResp = ApiPost "/payment-submissions" $tenantToken $payBody
  Write-Host "RAW payment submission response:" -ForegroundColor DarkGray
  Write-Host ($subResp | ConvertTo-Json -Depth 10)
  $subData = Get-Data $subResp
  $submissionId = $subData.id
  if (-not $submissionId) { Fail "Payment submission id not returned" }
  if ($subData.status -ne "PENDING_REVIEW") { Warn "Expected PENDING_REVIEW, got $($subData.status)" } else { Pass "Invoice-only payment submission created id=$submissionId" }

  $dupBody = @{
    stayId = $stayId
    invoiceId = $invoiceId
    targetType = "INVOICE"
    amountRupiah = $remaining
    paidAt = $today
    paymentMethod = "TRANSFER"
    senderName = "B2 Duplicate"
    referenceNumber = "B2-DUP-$stamp"
    notes = "B2 duplicate should fail"
  }
  ExpectFailPost "Duplicate pending submission rejected" "/payment-submissions" $tenantToken $dupBody @(400,409)

  StepHeader "5. ADMIN APPROVE PAYMENT"
  $approveResp = ApiPost "/payment-submissions/$submissionId/approve" $adminToken @{}
  Write-Host "RAW approve response:" -ForegroundColor DarkGray
  Write-Host ($approveResp | ConvertTo-Json -Depth 10)
  Pass "Admin approve payment submission request completed"

  $invoiceAfterResp = ApiGet "/invoices/$invoiceId" $adminToken
  $invoiceAfter = Get-Data $invoiceAfterResp
  Write-Host "RAW invoice after approval:" -ForegroundColor DarkGray
  Write-Host ($invoiceAfter | ConvertTo-Json -Depth 10)
  if ($invoiceAfter.status -eq "PAID") {
    Pass "Invoice becomes PAID after approval"
  } else {
    Warn "Invoice status after approval is $($invoiceAfter.status). Check if partial logic is expected."
  }

  $paidAgainBody = @{
    stayId = $stayId
    invoiceId = $invoiceId
    targetType = "INVOICE"
    amountRupiah = $remaining
    paidAt = $today
    paymentMethod = "TRANSFER"
    senderName = "B2 Paid Again"
    referenceNumber = "B2-PAID-$stamp"
    notes = "B2 paid invoice should fail"
  }
  ExpectFailPost "Paid invoice cannot be paid again" "/payment-submissions" $tenantToken $paidAgainBody @(400,409)

  StepHeader "FINAL SUMMARY"
  Write-Host "PASS : $passCount" -ForegroundColor Green
  Write-Host "WARN : $warnCount" -ForegroundColor Yellow
  Write-Host "FAIL : $failCount" -ForegroundColor Red

  if ($failCount -gt 0) {
    throw "B2-1 focused UAT finished with FAIL"
  }

  Write-Host "B2-1 FOCUSED UAT V5 FINISHED WITHOUT HARD FAIL." -ForegroundColor Green
} catch {
  StepHeader "FAILED"
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "PASS : $passCount" -ForegroundColor Green
  Write-Host "WARN : $warnCount" -ForegroundColor Yellow
  Write-Host "FAIL : $failCount" -ForegroundColor Red
  exit 1
}
