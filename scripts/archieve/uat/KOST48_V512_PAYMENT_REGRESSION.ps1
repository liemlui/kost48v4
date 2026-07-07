param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Message) Write-Host "`n== $Message ==" -ForegroundColor Cyan }
function Invoke-Json {
  param([string]$Method, [string]$Uri, [hashtable]$Headers, [object]$Body)
  $params = @{ Method = $Method; Uri = $Uri }
  if ($Headers) { $params.Headers = $Headers }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }
  return Invoke-RestMethod @params
}
function Assert-True { param([bool]$Condition, [string]$Label) if (-not $Condition) { throw "ASSERT FAILED: $Label" } Write-Host "PASS: $Label" -ForegroundColor Green }
function Expect-Status {
  param([string]$Method, [string]$Uri, [hashtable]$Headers, [object]$Body, [int]$ExpectedStatus, [string]$Label)
  try {
    $null = Invoke-Json -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    if ($ExpectedStatus -ge 200 -and $ExpectedStatus -lt 300) { Write-Host "PASS: $Label" -ForegroundColor Green; return }
    throw "$Label expected HTTP $ExpectedStatus but request succeeded"
  } catch {
    $status = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq $ExpectedStatus) { Write-Host "PASS: $Label returned expected HTTP $ExpectedStatus" -ForegroundColor Green; return }
    throw "$Label expected HTTP $ExpectedStatus but got $status. Error: $($_.Exception.Message)"
  }
}
function New-UatSuffix { return (Get-Date -Format "MMddHHmmssfff") }
function New-UatIdentityNumber { $random = Get-Random -Minimum 100 -Maximum 999; return "9$((Get-Date).ToString('yyMMddHHmmss'))$random" }
function Login-Admin { $login = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $AdminIdentifier; password = $AdminPassword }; if (-not $login.data.accessToken) { throw "Admin token not returned" }; return @{ Authorization = "Bearer $($login.data.accessToken)" } }
function New-UatRoom {
  param([hashtable]$Headers, [string]$Code)
  return (Invoke-Json -Method Post -Uri "$BaseUrl/rooms" -Headers $Headers -Body @{
    code = $Code; name = "UAT Payment Room $Code"; floor = "UAT"; dailyRateRupiah = 225000; weeklyRateRupiah = 765000; biWeeklyRateRupiah = 1275000; monthlyRateRupiah = 1700000; defaultDepositRupiah = 1000000; electricityTariffPerKwhRupiah = 1445; waterTariffPerM3Rupiah = 5500; images = @(); notes = "Auto-created by KOST48_V512_PAYMENT_REGRESSION.ps1"; isActive = $true
  }).data
}
function New-UatTenant {
  param([hashtable]$Headers, [string]$Suffix)
  return (Invoke-Json -Method Post -Uri "$BaseUrl/tenants" -Headers $Headers -Body @{
    fullName = "Tenant V512 Payment $Suffix"; phone = "0855$Suffix"; email = "tenant.v512.payment.$Suffix@uat.kost48.local"; identityNumber = New-UatIdentityNumber; gender = "MALE"; originCity = "Surabaya"; occupation = "UAT Tester"; companyOrCampus = "KOST48 UAT"; emergencyContactName = "Kontak UAT"; emergencyContactPhone = "0844$Suffix"; notes = "Auto-created by KOST48_V512_PAYMENT_REGRESSION.ps1"; isActive = $true
  }).data
}
function New-UatStay {
  param([hashtable]$Headers, [int]$TenantId, [int]$RoomId)
  return (Invoke-Json -Method Post -Uri "$BaseUrl/stays" -Headers $Headers -Body @{
    tenantId = $TenantId; roomId = $RoomId; pricingTerm = "MONTHLY"; agreedRentAmountRupiah = 1700000; checkInDate = (Get-Date).ToString("yyyy-MM-dd"); plannedCheckOutDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd"); depositAmountRupiah = 1000000; electricityTariffPerKwhRupiah = 1445; waterTariffPerM3Rupiah = 5500; bookingSource = "WALK_IN"; stayPurpose = "WORK"; notes = "Auto-created by V5.12 payment regression"; initialElectricityKwh = "10"; initialWaterM3 = "2"
  }).data
}

Write-Step "Admin login"
$adminHeaders = Login-Admin
Write-Host "PASS: admin login returned token" -ForegroundColor Green

$stamp = New-UatSuffix
Write-Step "Create isolated UAT invoice through manual check-in"
$room = New-UatRoom -Headers $adminHeaders -Code "UAT-PAY-$stamp"
$tenant = New-UatTenant -Headers $adminHeaders -Suffix $stamp
$stayBundle = New-UatStay -Headers $adminHeaders -TenantId $tenant.id -RoomId $room.id
$invoice = $stayBundle.invoice
Assert-True ($invoice.id -gt 0) "Invoice created from manual check-in"
Assert-True ($invoice.status -eq "ISSUED") "Invoice starts as ISSUED"

$invoiceDetail = Invoke-Json -Method Get -Uri "$BaseUrl/invoices/$($invoice.id)" -Headers $adminHeaders
$total = [int]$invoiceDetail.data.totalAmountRupiah
Assert-True ($total -gt 1000) "Invoice total supports partial payment test"

Write-Step "Partial payment changes invoice to PARTIAL"
$partialAmount = 1000
$partial = Invoke-Json -Method Post -Uri "$BaseUrl/invoice-payments" -Headers $adminHeaders -Body @{
  invoiceId = $invoice.id; paymentDate = (Get-Date).ToString("yyyy-MM-dd"); amountRupiah = $partialAmount; method = "CASH"; referenceNo = "V512-PARTIAL-$stamp"; note = "V5.12 partial payment"
}
Assert-True ($partial.data.invoiceStatusAfterSync -eq "PARTIAL") "Invoice becomes PARTIAL after partial payment"

Write-Step "Overpayment is rejected"
Expect-Status -Method Post -Uri "$BaseUrl/invoice-payments" -Headers $adminHeaders -Body @{
  invoiceId = $invoice.id; paymentDate = (Get-Date).ToString("yyyy-MM-dd"); amountRupiah = ($total + 1); method = "CASH"; referenceNo = "V512-OVERPAY-$stamp"; note = "This should fail"
} -ExpectedStatus 409 -Label "Overpayment is rejected with HTTP 409"

Write-Step "Remaining payment changes invoice to PAID"
$remaining = $total - $partialAmount
$final = Invoke-Json -Method Post -Uri "$BaseUrl/invoice-payments" -Headers $adminHeaders -Body @{
  invoiceId = $invoice.id; paymentDate = (Get-Date).ToString("yyyy-MM-dd"); amountRupiah = $remaining; method = "CASH"; referenceNo = "V512-FINAL-$stamp"; note = "V5.12 remaining payment"
}
Assert-True ($final.data.invoiceStatusAfterSync -eq "PAID") "Invoice becomes PAID after remaining payment"

Write-Step "Payment review queue remains healthy"
$queue = Invoke-Json -Method Get -Uri "$BaseUrl/payment-submissions/review-queue" -Headers $adminHeaders
Assert-True ($queue.success -eq $true) "Payment submission review queue still responds"

Write-Step "Overpayment after PAID is rejected"
Expect-Status -Method Post -Uri "$BaseUrl/invoice-payments" -Headers $adminHeaders -Body @{
  invoiceId = $invoice.id; paymentDate = (Get-Date).ToString("yyyy-MM-dd"); amountRupiah = 1; method = "CASH"; referenceNo = "V512-PAID-OVERPAY-$stamp"; note = "This should fail"
} -ExpectedStatus 409 -Label "Extra payment after PAID invoice is rejected"

Write-Host "`nV5.12 payment regression PASS" -ForegroundColor Green
