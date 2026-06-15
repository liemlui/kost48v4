# KOST48 V5.4 Staff Read-only Boundary UAT Guide
# Run from project root while backend API is running at http://localhost:3000/api
# This guide uses Invoke-RestMethod only.

$BaseUrl = "http://localhost:3000/api"

Write-Host "== Login as STAFF ==" -ForegroundColor Cyan
$staffLogin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body '{"identifier":"staff@kost48.com","password":"staff123"}'
$staffToken = $staffLogin.accessToken
if (!$staffToken) { throw "STAFF login did not return accessToken" }
Write-Host "STAFF token acquired" -ForegroundColor Green

Write-Host "== STAFF read checks: should PASS ==" -ForegroundColor Cyan
Invoke-RestMethod -Method Get -Uri "$BaseUrl/inventory-items" -Headers @{Authorization="Bearer $staffToken"} | Out-Null
Invoke-RestMethod -Method Get -Uri "$BaseUrl/inventory-movements" -Headers @{Authorization="Bearer $staffToken"} | Out-Null
Invoke-RestMethod -Method Get -Uri "$BaseUrl/room-items" -Headers @{Authorization="Bearer $staffToken"} | Out-Null
Invoke-RestMethod -Method Get -Uri "$BaseUrl/rooms" -Headers @{Authorization="Bearer $staffToken"} | Out-Null
Write-Host "STAFF read checks PASS" -ForegroundColor Green

function Expect-Forbidden($Name, [scriptblock]$Action) {
  try {
    & $Action | Out-Null
    throw "$Name unexpectedly succeeded. Expected 403 Forbidden."
  } catch {
    $status = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -ne 403) {
      Write-Host "Unexpected error body for $Name:" -ForegroundColor Yellow
      Write-Host $_.ErrorDetails.Message
      throw "$Name returned status $status, expected 403."
    }
    Write-Host "$Name blocked with 403 as expected" -ForegroundColor Green
  }
}

Write-Host "== STAFF mutation checks: should be 403 ==" -ForegroundColor Cyan
Expect-Forbidden "STAFF create inventory item" { Invoke-RestMethod -Method Post -Uri "$BaseUrl/inventory-items" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"sku":"V54-STAFF-BLOCK","name":"V54 Staff Block","category":"TEST","unit":"pcs","qtyOnHand":"1","minQty":"1","isActive":true}' }
Expect-Forbidden "STAFF create inventory movement" { Invoke-RestMethod -Method Post -Uri "$BaseUrl/inventory-movements" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"itemId":1,"movementType":"IN","qty":"1","movementDate":"2026-05-18"}' }
Expect-Forbidden "STAFF create room item" { Invoke-RestMethod -Method Post -Uri "$BaseUrl/room-items" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"roomId":1,"itemId":1,"qty":"1","status":"GOOD"}' }
Expect-Forbidden "STAFF create room" { Invoke-RestMethod -Method Post -Uri "$BaseUrl/rooms" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"code":"V54-STAFF-BLOCK","name":"V54 Staff Block","floor":"TEST","monthlyRateRupiah":1000000,"defaultDepositRupiah":1000000,"isActive":true}' }

Write-Host "== Login as ADMIN ==" -ForegroundColor Cyan
$adminLogin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'
$adminToken = $adminLogin.accessToken
if (!$adminToken) { throw "ADMIN login did not return accessToken" }
Write-Host "ADMIN token acquired" -ForegroundColor Green

Write-Host "== ADMIN read check: should PASS ==" -ForegroundColor Cyan
Invoke-RestMethod -Method Get -Uri "$BaseUrl/inventory-items" -Headers @{Authorization="Bearer $adminToken"} | Out-Null
Invoke-RestMethod -Method Get -Uri "$BaseUrl/room-items" -Headers @{Authorization="Bearer $adminToken"} | Out-Null
Write-Host "ADMIN read checks PASS" -ForegroundColor Green

Write-Host "V5.4 Staff read-only UAT guide completed. For admin mutation, use normal UI/API with real valid data if needed." -ForegroundColor Green
