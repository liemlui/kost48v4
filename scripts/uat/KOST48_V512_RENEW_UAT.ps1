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

function New-UatSuffix {
  return (Get-Date -Format "MMddHHmmssfff")
}

function New-UatIdentityNumber {
  $random = Get-Random -Minimum 100 -Maximum 999
  return "9$((Get-Date).ToString('yyMMddHHmmss'))$random"
}

function Login-User {
  param([string]$Identifier, [string]$Password)
  $login = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $Identifier; password = $Password }
  if (-not $login.data.accessToken) { throw "Token not returned for $Identifier" }
  return @{ Authorization = "Bearer $($login.data.accessToken)" }
}

function New-UatRoom {
  param([hashtable]$Headers, [string]$Code)
  $body = @{
    code = $Code
    name = "UAT Renew Room $Code"
    floor = "UAT"
    dailyRateRupiah = 225000
    weeklyRateRupiah = 765000
    biWeeklyRateRupiah = 1275000
    monthlyRateRupiah = 1700000
    defaultDepositRupiah = 1000000
    electricityTariffPerKwhRupiah = 1445
    waterTariffPerM3Rupiah = 5500
    images = @()
    notes = "Auto-created by KOST48_V512_RENEW_UAT.ps1"
    isActive = $true
  }
  $response = Invoke-Json -Method Post -Uri "$BaseUrl/rooms" -Headers $Headers -Body $body
  return $response.data
}

function New-UatTenant {
  param([hashtable]$Headers, [string]$Suffix)
  $email = "tenant.v512.renew.$Suffix@uat.kost48.local"
  $body = @{
    fullName = "Tenant V512 Renew $Suffix"
    phone = "0899$Suffix"
    email = $email
    identityNumber = New-UatIdentityNumber
    gender = "MALE"
    originCity = "Surabaya"
    occupation = "UAT Tester"
    companyOrCampus = "KOST48 UAT"
    emergencyContactName = "Kontak UAT"
    emergencyContactPhone = "0888$Suffix"
    notes = "Auto-created by KOST48_V512_RENEW_UAT.ps1"
    isActive = $true
  }
  $response = Invoke-Json -Method Post -Uri "$BaseUrl/tenants" -Headers $Headers -Body $body
  return $response.data
}

function New-UatStay {
  param([hashtable]$Headers, [int]$TenantId, [int]$RoomId)
  $today = (Get-Date).ToString("yyyy-MM-dd")
  $planned = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
  $body = @{
    tenantId = $TenantId
    roomId = $RoomId
    pricingTerm = "MONTHLY"
    agreedRentAmountRupiah = 1700000
    checkInDate = $today
    plannedCheckOutDate = $planned
    depositAmountRupiah = 1000000
    electricityTariffPerKwhRupiah = 1445
    waterTariffPerM3Rupiah = 5500
    bookingSource = "WALK_IN"
    stayPurpose = "WORK"
    notes = "Auto-created by V5.12 renew UAT"
    initialElectricityKwh = "10"
    initialWaterM3 = "2"
  }
  $response = Invoke-Json -Method Post -Uri "$BaseUrl/stays" -Headers $Headers -Body $body
  return $response.data
}

Write-Step "Admin login"
$adminHeaders = Login-User -Identifier $AdminIdentifier -Password $AdminPassword
Write-Host "PASS: admin login returned token" -ForegroundColor Green

$stamp = New-UatSuffix

Write-Step "Create isolated UAT tenant, room, and stay"
$room = New-UatRoom -Headers $adminHeaders -Code "UAT-RNW-$stamp"
Assert-True ($room.id -gt 0) "UAT room created"

$tenant = New-UatTenant -Headers $adminHeaders -Suffix $stamp
Assert-True ($tenant.id -gt 0) "UAT tenant created"

$stayBundle = New-UatStay -Headers $adminHeaders -TenantId $tenant.id -RoomId $room.id
$stay = $stayBundle.stay
$initialInvoice = $stayBundle.invoice
$portal = $stayBundle.portal
Assert-True ($stay.id -gt 0) "UAT stay created"
Assert-True ($initialInvoice.status -eq "ISSUED") "Initial manual check-in invoice is ISSUED"
Assert-True ($portal.status -eq "CREATED") "Tenant portal user auto-created"
Assert-True (-not [string]::IsNullOrWhiteSpace($portal.temporaryPassword)) "Temporary tenant password returned once"

Write-Step "Tenant login and create renew request"
$tenantHeaders = Login-User -Identifier $portal.email -Password $portal.temporaryPassword
Write-Host "PASS: tenant login returned token" -ForegroundColor Green

$requestedCheckout = (Get-Date).AddDays(65).ToString("yyyy-MM-dd")
$createRenew = Invoke-Json -Method Post -Uri "$BaseUrl/tenant/renew-requests" -Headers $tenantHeaders -Body @{
  stayId = $stay.id
  requestedTerm = "MONTHLY"
  requestedCheckOutDate = $requestedCheckout
  requestNotes = "V5.12 renew UAT request"
}
$renewRequest = $createRenew.data
Assert-True ($renewRequest.id -gt 0) "Tenant renew request created"
Assert-True ($renewRequest.status -eq "PENDING") "Renew request starts as PENDING"

Write-Step "Admin approve renew request"
$approvedCheckout = (Get-Date).AddDays(75).ToString("yyyy-MM-dd")
$approved = Invoke-Json -Method Post -Uri "$BaseUrl/admin/renew-requests/$($renewRequest.id)/approve" -Headers $adminHeaders -Body @{
  plannedCheckOutDate = $approvedCheckout
  agreedRentAmountRupiah = 1700000
  reviewNotes = "V5.12 renew UAT approved"
}
Assert-True ($approved.data.request.status -eq "APPROVED") "Renew request becomes APPROVED"
Assert-True ($approved.data.invoice.status -eq "ISSUED") "Renewal invoice is ISSUED after approval"
Assert-True ($approved.data.invoice.id -gt 0) "Renewal invoice returned"

Write-Step "Double approval guard"
Expect-Status -Method Post -Uri "$BaseUrl/admin/renew-requests/$($renewRequest.id)/approve" -Headers $adminHeaders -Body @{
  plannedCheckOutDate = (Get-Date).AddDays(90).ToString("yyyy-MM-dd")
  reviewNotes = "Second approval should fail"
} -ExpectedStatus 409 -Label "Renew request cannot be approved twice"

Write-Step "Verify tenant-facing invoice and request visibility"
$tenantInvoices = Invoke-Json -Method Get -Uri "$BaseUrl/invoices/my?limit=50" -Headers $tenantHeaders
$renewInvoiceVisible = $false
foreach ($item in $tenantInvoices.data.items) {
  if ($item.id -eq $approved.data.invoice.id -and $item.status -eq "ISSUED") { $renewInvoiceVisible = $true }
}
Assert-True $renewInvoiceVisible "Tenant can see renewal invoice as ISSUED"

$myRenewRequests = Invoke-Json -Method Get -Uri "$BaseUrl/tenant/renew-requests/my" -Headers $tenantHeaders
$approvedRequestVisible = $false
foreach ($item in $myRenewRequests.data) {
  if ($item.id -eq $renewRequest.id -and $item.status -eq "APPROVED") { $approvedRequestVisible = $true }
}
Assert-True $approvedRequestVisible "Tenant can see approved renew request"

Write-Host "`nV5.12 renew full UAT PASS" -ForegroundColor Green
