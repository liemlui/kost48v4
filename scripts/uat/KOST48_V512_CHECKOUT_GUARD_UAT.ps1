param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [object]$Body
  )

  $params = @{ Method = $Method; Uri = $Uri }
  if ($Headers) { $params.Headers = $Headers }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }
  return Invoke-RestMethod @params
}

function Assert-True {
  param([bool]$Condition, [string]$Label)
  if (-not $Condition) { throw "ASSERT FAILED: $Label" }
  Write-Host "PASS: $Label" -ForegroundColor Green
}

function Expect-Status {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [object]$Body,
    [int]$ExpectedStatus,
    [string]$Label
  )

  try {
    $null = Invoke-Json -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    if ($ExpectedStatus -ge 200 -and $ExpectedStatus -lt 300) {
      Write-Host "PASS: $Label" -ForegroundColor Green
      return
    }
    throw "$Label expected HTTP $ExpectedStatus but request succeeded"
  } catch {
    $status = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -eq $ExpectedStatus) {
      Write-Host "PASS: $Label returned expected HTTP $ExpectedStatus" -ForegroundColor Green
      return
    }
    throw "$Label expected HTTP $ExpectedStatus but got $status. Error: $($_.Exception.Message)"
  }
}

function New-UatSuffix { return (Get-Date -Format "MMddHHmmssfff") }
function New-UatIdentityNumber {
  $random = Get-Random -Minimum 100 -Maximum 999
  return "9$((Get-Date).ToString('yyMMddHHmmss'))$random"
}
function Login-Admin {
  $login = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $AdminIdentifier; password = $AdminPassword }
  if (-not $login.data.accessToken) { throw "Admin token not returned" }
  return @{ Authorization = "Bearer $($login.data.accessToken)" }
}
function New-UatRoom {
  param([hashtable]$Headers, [string]$Code)
  $body = @{
    code = $Code
    name = "UAT Checkout Room $Code"
    floor = "UAT"
    dailyRateRupiah = 225000
    weeklyRateRupiah = 765000
    biWeeklyRateRupiah = 1275000
    monthlyRateRupiah = 1700000
    defaultDepositRupiah = 1000000
    electricityTariffPerKwhRupiah = 1445
    waterTariffPerM3Rupiah = 5500
    images = @()
    notes = "Auto-created by KOST48_V512_CHECKOUT_GUARD_UAT.ps1"
    isActive = $true
  }
  return (Invoke-Json -Method Post -Uri "$BaseUrl/rooms" -Headers $Headers -Body $body).data
}
function New-UatTenant {
  param([hashtable]$Headers, [string]$Suffix)
  $body = @{
    fullName = "Tenant V512 Checkout $Suffix"
    phone = "0877$Suffix"
    email = "tenant.v512.checkout.$Suffix@uat.kost48.local"
    identityNumber = New-UatIdentityNumber
    gender = "FEMALE"
    originCity = "Surabaya"
    occupation = "UAT Tester"
    companyOrCampus = "KOST48 UAT"
    emergencyContactName = "Kontak UAT"
    emergencyContactPhone = "0866$Suffix"
    notes = "Auto-created by KOST48_V512_CHECKOUT_GUARD_UAT.ps1"
    isActive = $true
  }
  return (Invoke-Json -Method Post -Uri "$BaseUrl/tenants" -Headers $Headers -Body $body).data
}
function New-UatStay {
  param([hashtable]$Headers, [int]$TenantId, [int]$RoomId)
  $body = @{
    tenantId = $TenantId
    roomId = $RoomId
    pricingTerm = "MONTHLY"
    agreedRentAmountRupiah = 1700000
    checkInDate = (Get-Date).ToString("yyyy-MM-dd")
    plannedCheckOutDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    depositAmountRupiah = 1000000
    electricityTariffPerKwhRupiah = 1445
    waterTariffPerM3Rupiah = 5500
    bookingSource = "WALK_IN"
    stayPurpose = "WORK"
    notes = "Auto-created by V5.12 checkout guard UAT"
    initialElectricityKwh = "10"
    initialWaterM3 = "2"
  }
  return (Invoke-Json -Method Post -Uri "$BaseUrl/stays" -Headers $Headers -Body $body).data
}

Write-Step "Admin login"
$adminHeaders = Login-Admin
Write-Host "PASS: admin login returned token" -ForegroundColor Green

$stamp = New-UatSuffix

Write-Step "Create isolated UAT tenant, room, and active stay"
$room = New-UatRoom -Headers $adminHeaders -Code "UAT-CHK-$stamp"
$tenant = New-UatTenant -Headers $adminHeaders -Suffix $stamp
$stayBundle = New-UatStay -Headers $adminHeaders -TenantId $tenant.id -RoomId $room.id
$stay = $stayBundle.stay
$invoice = $stayBundle.invoice
Assert-True ($stay.id -gt 0) "UAT stay created"
Assert-True ($invoice.status -eq "ISSUED") "Open invoice exists as ISSUED"

Write-Step "Checkout final is blocked while invoice is open"
Expect-Status -Method Post -Uri "$BaseUrl/stays/$($stay.id)/complete" -Headers $adminHeaders -Body @{
  actualCheckOutDate = (Get-Date).ToString("yyyy-MM-dd")
  checkoutReason = "V5.12 checkout guard should block open invoice"
  notes = "This attempt should fail with 409"
} -ExpectedStatus 409 -Label "Checkout final with open invoice is blocked"

Write-Step "Pay invoice fully"
$invoiceDetail = Invoke-Json -Method Get -Uri "$BaseUrl/invoices/$($invoice.id)" -Headers $adminHeaders
$amount = [int]$invoiceDetail.data.totalAmountRupiah
Assert-True ($amount -gt 0) "Invoice total is greater than zero"
$payment = Invoke-Json -Method Post -Uri "$BaseUrl/invoice-payments" -Headers $adminHeaders -Body @{
  invoiceId = $invoice.id
  paymentDate = (Get-Date).ToString("yyyy-MM-dd")
  amountRupiah = $amount
  method = "CASH"
  referenceNo = "V512-CHK-$stamp"
  note = "V5.12 checkout guard UAT full payment"
}
Assert-True ($payment.data.invoiceStatusAfterSync -eq "PAID") "Invoice becomes PAID after full payment"

Write-Step "Checkout final succeeds after invoices are resolved"
$complete = Invoke-Json -Method Post -Uri "$BaseUrl/stays/$($stay.id)/complete" -Headers $adminHeaders -Body @{
  actualCheckOutDate = (Get-Date).ToString("yyyy-MM-dd")
  checkoutReason = "V5.12 checkout guard allowed after paid invoice"
  notes = "Checkout final should pass after invoice paid"
}
Assert-True ($complete.data.status -eq "COMPLETED") "Stay becomes COMPLETED"

$roomAfter = Invoke-Json -Method Get -Uri "$BaseUrl/rooms/$($room.id)" -Headers $adminHeaders
Assert-True ($roomAfter.data.status -eq "AVAILABLE") "Room becomes AVAILABLE after checkout final"

Write-Host "`nV5.12 checkout guard UAT PASS" -ForegroundColor Green
