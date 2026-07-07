param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123",
  [string]$StaffIdentifier = "staff@kost48.com",
  [string]$StaffPassword = "staff123"
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
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }
  return Invoke-RestMethod @params
}

function Assert-SuccessResponse {
  param([object]$Response, [string]$Label)
  if ($null -eq $Response) { throw "$Label returned empty response" }
  if ($Response.PSObject.Properties.Name -contains "success" -and -not $Response.success) {
    throw "$Label returned success=false"
  }
  Write-Host "PASS: $Label" -ForegroundColor Green
}

function Assert-HttpStatus {
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

Write-Step "Public smoke"
$publicRooms = Invoke-Json -Method Get -Uri "$BaseUrl/public/rooms"
Assert-SuccessResponse $publicRooms "GET /public/rooms"

Write-Step "Admin auth smoke"
$login = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $AdminIdentifier; password = $AdminPassword }
$adminToken = $login.data.accessToken
if (-not $adminToken) { throw "Admin token not returned" }
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Write-Host "PASS: admin login returned token" -ForegroundColor Green

$notifications = Invoke-Json -Method Get -Uri "$BaseUrl/me/notifications" -Headers $adminHeaders
Assert-SuccessResponse $notifications "GET /me/notifications"

$paymentQueue = Invoke-Json -Method Get -Uri "$BaseUrl/payment-submissions/review-queue" -Headers $adminHeaders
Assert-SuccessResponse $paymentQueue "GET /payment-submissions/review-queue"

Write-Step "Checkout request filter smoke"
$checkoutAll = Invoke-Json -Method Get -Uri "$BaseUrl/admin/checkout-requests?status=PENDING" -Headers $adminHeaders
Assert-SuccessResponse $checkoutAll "GET /admin/checkout-requests?status=PENDING"

$checkoutByStay = Invoke-Json -Method Get -Uri "$BaseUrl/admin/checkout-requests?status=PENDING&stayId=1" -Headers $adminHeaders
Assert-SuccessResponse $checkoutByStay "GET /admin/checkout-requests?status=PENDING&stayId=1"

Assert-HttpStatus -Method Get -Uri "$BaseUrl/admin/checkout-requests?stayId=abc" -Headers $adminHeaders -ExpectedStatus 400 -Label "GET /admin/checkout-requests invalid stayId"

Write-Step "Staff read smoke"
$staffLogin = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $StaffIdentifier; password = $StaffPassword }
$staffToken = $staffLogin.data.accessToken
if (-not $staffToken) { throw "Staff token not returned" }
$staffHeaders = @{ Authorization = "Bearer $staffToken" }
Write-Host "PASS: staff login returned token" -ForegroundColor Green

$meterReadings = Invoke-Json -Method Get -Uri "$BaseUrl/meter-readings" -Headers $staffHeaders
Assert-SuccessResponse $meterReadings "STAFF GET /meter-readings"

$expenses = Invoke-Json -Method Get -Uri "$BaseUrl/expenses" -Headers $staffHeaders
Assert-SuccessResponse $expenses "STAFF GET /expenses"

$wifiSales = Invoke-Json -Method Get -Uri "$BaseUrl/wifi-sales" -Headers $staffHeaders
Assert-SuccessResponse $wifiSales "STAFF GET /wifi-sales"

Write-Host "`nV5.11 smoke pack PASS" -ForegroundColor Green
