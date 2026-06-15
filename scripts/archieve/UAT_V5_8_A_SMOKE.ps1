param(
  [string]$ProjectRoot = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle",
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$AdminIdentifier = "admin@kost48.com",
  [string]$AdminPassword = "admin123",
  [int]$RenewRequestId = 0,
  [int]$StayIdWithOpenInvoice = 0,
  [int]$StayIdReadyToComplete = 0,
  [int]$DepositStayIdWithOpenInvoice = 0
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Invoke-ApiExpectConflict($ScriptBlock, [string]$ExpectedText) {
  try {
    & $ScriptBlock | Out-Null
    throw "Expected HTTP conflict/error, but request succeeded."
  } catch {
    $message = $_.Exception.Message
    $body = $null
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
      }
    } catch {}
    $combined = "$message $body"
    if ($combined -notmatch [regex]::Escape($ExpectedText)) {
      Write-Host "Actual error/body:" -ForegroundColor Yellow
      Write-Host $combined
      throw "Expected error text not found: $ExpectedText"
    }
    Write-Host "OK expected conflict/error observed: $ExpectedText" -ForegroundColor Green
  }
}

Write-Step "KOST48 V5.8-A smoke UAT"
Set-Location $ProjectRoot
Write-Host "BaseUrl: $BaseUrl"

Write-Step "Public rooms"
Invoke-RestMethod -Method Get -Uri "$BaseUrl/public/rooms" | Out-Host

Write-Step "Admin login"
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (@{identifier=$AdminIdentifier; password=$AdminPassword} | ConvertTo-Json -Compress)
$token = $login.data.accessToken
if (-not $token) { throw "Login did not return accessToken" }
$headers = @{ Authorization = "Bearer $token" }
Write-Host "OK token acquired"

Write-Step "Protected notification"
Invoke-RestMethod -Method Get -Uri "$BaseUrl/me/notifications" -Headers $headers | Out-Host

Write-Step "Payment review queue"
Invoke-RestMethod -Method Get -Uri "$BaseUrl/payment-submissions/review-queue" -Headers $headers | Out-Host

Write-Step "Renew approval exact UAT (optional)"
if ($RenewRequestId -gt 0) {
  $renewResult = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/renew-requests/$RenewRequestId/approve" -Headers $headers -ContentType "application/json" -Body '{"reviewNotes":"V5.8-A UAT approve renew"}'
  $renewResult | Out-Host
  if ($renewResult.data.invoice.status -ne "ISSUED") { throw "Renew approval did not return invoice.status ISSUED" }
  Write-Host "OK renew invoice returned as ISSUED" -ForegroundColor Green
} else {
  Write-Host "Skipped. Pass -RenewRequestId with a real numeric ID, example: -RenewRequestId 9" -ForegroundColor Yellow
}

Write-Step "Checkout open invoice guard exact UAT (optional)"
if ($StayIdWithOpenInvoice -gt 0) {
  $body = '{"actualCheckOutDate":"2026-05-18","checkoutReason":"V5.8-A open invoice guard UAT","notes":"Expected to fail because open invoice exists"}'
  Invoke-ApiExpectConflict -ExpectedText "Tidak bisa checkout final karena masih ada invoice" -ScriptBlock {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/stays/$StayIdWithOpenInvoice/complete" -Headers $headers -ContentType "application/json" -Body $body
  }
} else {
  Write-Host "Skipped. Pass -StayIdWithOpenInvoice with a real stay ID that still has DRAFT/ISSUED/PARTIAL invoice, example: -StayIdWithOpenInvoice 9" -ForegroundColor Yellow
}

Write-Step "Checkout allowed after settlement exact UAT (optional)"
if ($StayIdReadyToComplete -gt 0) {
  $body = '{"actualCheckOutDate":"2026-05-18","checkoutReason":"V5.8-A completed after settlement UAT","notes":"Expected to succeed only if all invoices are PAID/CANCELLED"}'
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/stays/$StayIdReadyToComplete/complete" -Headers $headers -ContentType "application/json" -Body $body | Out-Host
  Write-Host "OK checkout final request completed" -ForegroundColor Green
} else {
  Write-Host "Skipped. Pass -StayIdReadyToComplete with a real stay ID whose invoices are all PAID/CANCELLED, example: -StayIdReadyToComplete 10" -ForegroundColor Yellow
}

Write-Step "Deposit open invoice guard exact UAT (optional)"
if ($DepositStayIdWithOpenInvoice -gt 0) {
  $body = '{"action":"FULL_REFUND","depositNote":"V5.8-A deposit guard UAT"}'
  Invoke-ApiExpectConflict -ExpectedText "Deposit tidak dapat diproses karena masih ada invoice" -ScriptBlock {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/stays/$DepositStayIdWithOpenInvoice/deposit/process" -Headers $headers -ContentType "application/json" -Body $body
  }
} else {
  Write-Host "Skipped. Pass -DepositStayIdWithOpenInvoice with a real completed/cancelled stay ID that still has open invoice, example: -DepositStayIdWithOpenInvoice 11" -ForegroundColor Yellow
}

Write-Step "Smoke UAT script complete"
Write-Host "Only mark PASS if the required optional exact UAT cases were run with real IDs and behaved as expected." -ForegroundColor Green
