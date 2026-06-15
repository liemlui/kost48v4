$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$BaseUrl = "http://localhost:3000/api"
Write-Host "=== KOST48 V5.6 Finance Boundary UAT Guide ===" -ForegroundColor Cyan
Write-Host "Requirement: backend is already running at $BaseUrl" -ForegroundColor Yellow

function Login($identifier, $password) {
  return Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body "{`"identifier`":`"$identifier`",`"password`":`"$password`"}"
}

Write-Host "`n[1] Login ADMIN" -ForegroundColor Yellow
$adminLogin = Login "admin@kost48.com" "admin123"
$adminToken = $adminLogin.accessToken
Write-Host "ADMIN token received: $([bool]$adminToken)" -ForegroundColor Green

Write-Host "`n[2] ADMIN can read invoices" -ForegroundColor Yellow
Invoke-RestMethod -Method Get -Uri "$BaseUrl/invoices?limit=5" -Headers @{Authorization="Bearer $adminToken"} | Out-Host

Write-Host "`n[3] ADMIN can read payment review queue" -ForegroundColor Yellow
Invoke-RestMethod -Method Get -Uri "$BaseUrl/payment-submissions/review-queue?limit=5" -Headers @{Authorization="Bearer $adminToken"} | Out-Host

Write-Host "`n[4] Login STAFF" -ForegroundColor Yellow
$staffLogin = Login "staff@kost48.com" "staff123"
$staffToken = $staffLogin.accessToken
Write-Host "STAFF token received: $([bool]$staffToken)" -ForegroundColor Green

Write-Host "`n[5] STAFF can read invoices" -ForegroundColor Yellow
Invoke-RestMethod -Method Get -Uri "$BaseUrl/invoices?limit=5" -Headers @{Authorization="Bearer $staffToken"} | Out-Host

Write-Host "`n[6] STAFF must NOT create invoice draft. Expected: 403/Forbidden." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/invoices" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"stayId":1,"invoiceNumber":"STAFF-SHOULD-FAIL-V56","periodStart":"2026-05-01","periodEnd":"2026-05-31","dueDate":"2026-05-31"}' | Out-Host
  Write-Host "FAIL - STAFF create invoice unexpectedly succeeded" -ForegroundColor Red
} catch {
  Write-Host "Expected block status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
  Write-Host $_.ErrorDetails.Message
}

Write-Host "`n[7] STAFF must NOT create invoice payment. Expected: 403/Forbidden." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/invoice-payments" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"invoiceId":1,"paymentDate":"2026-05-18","amountRupiah":1000,"method":"CASH"}' | Out-Host
  Write-Host "FAIL - STAFF create payment unexpectedly succeeded" -ForegroundColor Red
} catch {
  Write-Host "Expected block status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
  Write-Host $_.ErrorDetails.Message
}

Write-Host "`n[8] Login TENANT" -ForegroundColor Yellow
$tenantLogin = Login "tenant.g2@kost48.com" "tenant123"
$tenantToken = $tenantLogin.accessToken
Write-Host "TENANT token received: $([bool]$tenantToken)" -ForegroundColor Green

Write-Host "`n[9] TENANT must NOT access review queue. Expected: 403/Forbidden." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Method Get -Uri "$BaseUrl/payment-submissions/review-queue" -Headers @{Authorization="Bearer $tenantToken"} | Out-Host
  Write-Host "FAIL - TENANT review queue unexpectedly succeeded" -ForegroundColor Red
} catch {
  Write-Host "Expected block status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
  Write-Host $_.ErrorDetails.Message
}

Write-Host "`nV5.6 UAT guide complete. Review outputs manually before declaring PASS." -ForegroundColor Cyan
