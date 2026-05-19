param(
  [string]$BaseApi = "https://api.kost48surabaya.com/api",
  [string]$AdminIdentifier = "",
  [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"

function Section($name) { Write-Host "`n== $name ==" -ForegroundColor Cyan }
function Pass($message) { Write-Host "PASS: $message" -ForegroundColor Green }
function Fail($message) { throw "FAIL: $message" }
function Invoke-ExpectSuccess($Method, $Uri, $Headers = $null, $Body = $null) {
  if ($Body -ne $null) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body $Body
  }
  if ($Headers -ne $null) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }
  return Invoke-RestMethod -Method $Method -Uri $Uri
}

$BaseApi = $BaseApi.TrimEnd("/")

Section "Production-safe public smoke"
$publicRooms = Invoke-ExpectSuccess -Method Get -Uri "$BaseApi/public/rooms"
if ($publicRooms.success -ne $true) { Fail "GET /public/rooms did not return success=true" }
Pass "GET /public/rooms"

if ([string]::IsNullOrWhiteSpace($AdminIdentifier) -or [string]::IsNullOrWhiteSpace($AdminPassword)) {
  Section "Protected smoke skipped"
  Write-Host "AdminIdentifier/AdminPassword not provided. Skipping login/protected endpoints to keep script safe."
  Write-Host "To include protected smoke, run with -AdminIdentifier and -AdminPassword."
  Write-Host "V5.13 production-safe smoke PASS (public only)" -ForegroundColor Green
  exit 0
}

Section "Protected admin smoke"
$loginBody = @{ identifier = $AdminIdentifier; password = $AdminPassword } | ConvertTo-Json -Compress
$login = Invoke-ExpectSuccess -Method Post -Uri "$BaseApi/auth/login" -Body $loginBody
if (-not $login.data.accessToken) { Fail "Admin login did not return access token" }
$token = $login.data.accessToken
$headers = @{ Authorization = "Bearer $token" }
Pass "Admin login returned token"

$notifications = Invoke-ExpectSuccess -Method Get -Uri "$BaseApi/me/notifications" -Headers $headers
if ($notifications.success -ne $true) { Fail "GET /me/notifications did not return success=true" }
Pass "GET /me/notifications"

$queue = Invoke-ExpectSuccess -Method Get -Uri "$BaseApi/payment-submissions/review-queue" -Headers $headers
if ($queue.success -ne $true) { Fail "GET /payment-submissions/review-queue did not return success=true" }
Pass "GET /payment-submissions/review-queue"

Write-Host "`nV5.13 production-safe smoke PASS" -ForegroundColor Green
