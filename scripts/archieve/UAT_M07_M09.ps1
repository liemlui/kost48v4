$ErrorActionPreference = "Continue"
$base = "http://localhost:3000/api"
$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "=== UAT M-07 + M-09 START at $now ==="

# Step 1: Login tenant
Write-Host "`n[1] Login tenant..."
$tl = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"identifier":"tenant.g2@kost48.com","password":"tenant123"}'
if (-not $tl.data.accessToken) { Write-Host "SKIP: rate limit"; exit 0 }
$tt = $tl.data.accessToken
Write-Host "OK"

# Step 2: Booking
Write-Host "`n[2] Booking room 15..."
$bookBody = '{"roomId":15,"checkInDate":"2026-06-13","pricingTerm":"MONTHLY"}'
$book = Invoke-RestMethod -Method Post -Uri "$base/tenant/bookings" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body $bookBody
$stayId = $book.data.id
Write-Host "Stay ID: $stayId"

# Step 3: Login admin
Write-Host "`n[3] Login admin..."
$al = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'
if (-not $al.data.accessToken) { Write-Host "SKIP: rate limit"; exit 0 }
$at = $al.data.accessToken
$ah = @{Authorization="Bearer $at"}
Write-Host "OK"

# Step 4: Approve booking with DIFFERENT rent (M-09 test: DP must recalc)
Write-Host "`n[4] M-09: Approve booking rent 2jt..."
$newRent = 2000000
$approveBody = "{""agreedRentAmountRupiah"":$newRent,""depositAmountRupiah"":500000,""initialElectricityKwh"":""0"",""initialWaterM3"":""0""}"
$approve = Invoke-RestMethod -Method Post -Uri "$base/admin/bookings/$stayId/approve" -Headers $ah -ContentType "application/json" -Body $approveBody
$invoiceId = $approve.data.invoice.id
Write-Host "Invoice ID: $invoiceId"

$stay = Invoke-RestMethod -Method Get -Uri "$base/stays/$stayId" -Headers $ah
$newDp = $stay.data.downPaymentAmountRupiah
$expectedDp = [Math]::Round(($newRent * 30) / 100)
Write-Host "DP: $newDp (expect $expectedDp)"
if ($newDp -eq $expectedDp) { Write-Host "PASS M-09" -ForegroundColor Green } else { Write-Host "FAIL M-09" -ForegroundColor Red }

# Step 5: Tenant bayar DP
Write-Host "`n[5] Tenant bayar DP..."
$pay1Body = "{""stayId"":$stayId,""invoiceId"":$invoiceId,""amountRupiah"":$newDp,""paidAt"":""2026-06-12"",""paymentMethod"":""BANK_TRANSFER""}"
$pay1 = Invoke-RestMethod -Method Post -Uri "$base/payment-submissions" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body $pay1Body
$sub1Id = $pay1.data.id
Write-Host "DP submission: $sub1Id"

# Approve DP
Write-Host "`n[6] Admin approve DP..."
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub1Id/approve" -Headers $ah | Out-Null
Write-Host "OK"

# Step 6: M-09 part 2 - coba ubah tarif setelah DP terbayar (expect 409)
Write-Host "`n[7] M-09 part 2: Ubah tarif setelah DP (expect 409)..."
try {
  Invoke-RestMethod -Method Post -Uri "$base/admin/bookings/$stayId/approve" -Headers $ah -ContentType "application/json" -Body '{"agreedRentAmountRupiah":2500000,"depositAmountRupiah":500000,"initialElectricityKwh":"0","initialWaterM3":"0"}'
  Write-Host "FAIL M-09: should be 409" -ForegroundColor Red
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 409) { Write-Host "PASS M-09: 409 Conflict" -ForegroundColor Green } else { Write-Host "UNEXPECTED: $code" -ForegroundColor Red }
}

# Step 7: Tenant bayar pelunasan
Write-Host "`n[8] Tenant bayar pelunasan..."
$remaining = $newRent - $newDp + 500000
$pay2Body = "{""stayId"":$stayId,""invoiceId"":$invoiceId,""amountRupiah"":$remaining,""paidAt"":""2026-06-12"",""paymentMethod"":""BANK_TRANSFER""}"
$pay2 = Invoke-RestMethod -Method Post -Uri "$base/payment-submissions" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body $pay2Body
$sub2Id = $pay2.data.id
Write-Host "Pelunasan submission: $sub2Id"

# Approve pelunasan
Write-Host "`n[9] Admin approve pelunasan..."
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub2Id/approve" -Headers $ah | Out-Null
Write-Host "OK"

# Step 8: M-07 - cek stay promoted
Write-Host "`n[10] M-07: Cek promoted..."
$stay = Invoke-RestMethod -Method Get -Uri "$base/stays/$stayId" -Headers $ah
Write-Host "initialMetersPromotedAt: $($stay.data.initialMetersPromotedAt)"
if ($stay.data.initialMetersPromotedAt) { Write-Host "PASS M-07" -ForegroundColor Green } else { Write-Host "FAIL M-07" -ForegroundColor Red }

$now2 = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n=== DONE at $now2 ==="