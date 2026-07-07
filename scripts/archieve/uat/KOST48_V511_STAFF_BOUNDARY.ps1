param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$StaffIdentifier = "staff@kost48.com",
  [string]$StaffPassword = "staff123"
)

$ErrorActionPreference = "Stop"

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
    throw "$Label expected HTTP $ExpectedStatus but succeeded"
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

$login = Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{ identifier = $StaffIdentifier; password = $StaffPassword }
$token = $login.data.accessToken
if (-not $token) { throw "Staff token not returned" }
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n== STAFF read permissions ==" -ForegroundColor Cyan
Expect-Status -Method Get -Uri "$BaseUrl/meter-readings" -Headers $headers -ExpectedStatus 200 -Label "STAFF can read meter readings"
Expect-Status -Method Get -Uri "$BaseUrl/expenses" -Headers $headers -ExpectedStatus 200 -Label "STAFF can read expenses"
Expect-Status -Method Get -Uri "$BaseUrl/wifi-sales" -Headers $headers -ExpectedStatus 200 -Label "STAFF can read wifi sales"

Write-Host "`n== STAFF forbidden writes ==" -ForegroundColor Cyan
Expect-Status -Method Post -Uri "$BaseUrl/meter-readings" -Headers $headers -Body @{ roomId = 1; utilityType = "ELECTRICITY"; value = "1" } -ExpectedStatus 403 -Label "STAFF cannot create meter reading"
Expect-Status -Method Patch -Uri "$BaseUrl/meter-readings/1" -Headers $headers -Body @{ value = "2" } -ExpectedStatus 403 -Label "STAFF cannot update meter reading"

Expect-Status -Method Post -Uri "$BaseUrl/expenses" -Headers $headers -Body @{ title = "UAT forbidden"; amountRupiah = 1000; expenseDate = "2026-05-19" } -ExpectedStatus 403 -Label "STAFF cannot create expense"
Expect-Status -Method Patch -Uri "$BaseUrl/expenses/1" -Headers $headers -Body @{ title = "UAT forbidden" } -ExpectedStatus 403 -Label "STAFF cannot update expense"
Expect-Status -Method Delete -Uri "$BaseUrl/expenses/1" -Headers $headers -ExpectedStatus 403 -Label "STAFF cannot delete expense"

Expect-Status -Method Post -Uri "$BaseUrl/wifi-sales" -Headers $headers -Body @{ tenantId = 1; amountRupiah = 1000; saleDate = "2026-05-19" } -ExpectedStatus 403 -Label "STAFF cannot create wifi sale"
Expect-Status -Method Patch -Uri "$BaseUrl/wifi-sales/1" -Headers $headers -Body @{ amountRupiah = 2000 } -ExpectedStatus 403 -Label "STAFF cannot update wifi sale"
Expect-Status -Method Delete -Uri "$BaseUrl/wifi-sales/1" -Headers $headers -ExpectedStatus 403 -Label "STAFF cannot delete wifi sale"

Write-Host "`nV5.11 staff boundary regression PASS" -ForegroundColor Green
