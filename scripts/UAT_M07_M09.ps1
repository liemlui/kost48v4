# UAT M-07 & M-09 — Jalankan setelah rate limit clear (~15 menit setelah error 429)
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"

Write-Host "=== M-07 + M-09: BOOKING -> APPROVE -> CECK ==="

# Step 1: Login tenant
Write-Host "`n[1] Login tenant..."
$tl = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"identifier":"tenant.g2@kost48.com","password":"tenant123"}'
$tt = $tl.data.accessToken
Write-Host "OK"

# Step 2: Booking kamar G2-002 (room 15)
Write-Host "`n[2] Booking room 15..."
$book = Invoke-RestMethod -Method Post -Uri "$base/tenant-bookings" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body '{"roomId":15,"checkInDate":"2026-06-13","pricingTerm":"MONTHLY"}'
$stayId = $book.data.id
$dpAmount = $book.data.downPaymentAmountRupiah
Write-Host "Stay ID: $stayId | DP amount: $dpAmount"

# Step 3: Login admin
Write-Host "`n[3] Login admin..."
$al = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'
$at = $al.data.accessToken
$ah = @{Authorization="Bearer $at"}
Write-Host "OK"

# Step 4: Approve booking (M-09 test: tarif diubah dari 1.8jt jadi 2jt, DP harus recalc)
Write-Host "`n[4] M-09: Approve booking dengan tarif BERBEDA..."
$newRent = 2000000
$approve = Invoke-RestMethod -Method Post -Uri "$base/tenant-bookings/$stayId/approve" -Headers $ah -ContentType "application/json" -Body "{`"agreedRentAmountRupiah`":$newRent,`"depositAmountRupiah`":500000,`"initialElectricityKwh`":`"0`",`"initialWaterM3`":`"0`"}"
$invoiceId = $approve.data.invoice.id
Write-Host "Invoice ID: $invoiceId"

# Cek DP di stay
$stay = Invoke-RestMethod -Method Get -Uri "$base/stays/$stayId" -Headers $ah
$newDp = $stay.data.downPaymentAmountRupiah
$expectedDp = [Math]::Round(($newRent * 30) / 100)
Write-Host "DP baru: $newDp (expect: $expectedDp = 30% * $newRent)"
if ($newDp -eq $expectedDp) { Write-Host "PASS M-09: DP recalc OK!" -ForegroundColor Green } else { Write-Host "FAIL M-09" -ForegroundColor Red }

# Step 5: Tenant bayar DP dulu
Write-Host "`n[5] Tenant bayar DP..."
$pay1 = Invoke-RestMethod -Method Post -Uri "$base/payment-submissions" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body "{`"stayId`":$stayId,`"invoiceId`":$invoiceId,`"amountRupiah`":$newDp,`"paidAt`":`"2026-06-12`",`"paymentMethod`":`"BANK_TRANSFER`"}"
$sub1Id = $pay1.data.id
Write-Host "Submission ID: $sub1Id"

# Approve DP
Write-Host "`n[6] Admin approve DP..."
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub1Id/approve" -Headers $ah | Out-Null
Write-Host "DP approved"

# Step 6: M-09 part 2 — coba ubah tarif setelah DP terbayar (harus ditolak)
Write-Host "`n[7] M-09 part 2: Coba ubah tarif setelah DP terbayar (expect 409)..."
try {
  Invoke-RestMethod -Method Post -Uri "$base/tenant-bookings/$stayId/approve" -Headers $ah -ContentType "application/json" -Body '{"agreedRentAmountRupiah":2500000,"depositAmountRupiah":500000,"initialElectricityKwh":"0","initialWaterM3":"0"}'
  Write-Host "FAIL M-09: seharusnya ditolak" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 409) { Write-Host "PASS M-09: 409 Conflict — tarif tidak bisa diubah setelah DP terbayar!" -ForegroundColor Green } else { Write-Host "UNEXPECTED: $($_.Exception.Response.StatusCode)" -ForegroundColor Red }
}

# Step 7: Tenant bayar pelunasan (sisa sewa + deposit)
Write-Host "`n[8] Tenant bayar pelunasan..."
$remaining = $newRent - $newDp + 500000
$pay2 = Invoke-RestMethod -Method Post -Uri "$base/payment-submissions" -Headers @{Authorization="Bearer $tt"} -ContentType "application/json" -Body "{`"stayId`":$stayId,`"invoiceId`":$invoiceId,`"amountRupiah`":$remaining,`"paidAt`":`"2026-06-12`",`"paymentMethod`":`"BANK_TRANSFER`"}"
$sub2Id = $pay2.data.id
Write-Host "Submission ID: $sub2Id"

# Approve pelunasan
Write-Host "`n[9] Admin approve pelunasan..."
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub2Id/approve" -Headers $ah | Out-Null
Write-Host "Pelunasan approved"

# Step 8: M-07 — cek stay promoted walau meter 0
Write-Host "`n[10] M-07: Cek stay promoted..."
$stay = Invoke-RestMethod -Method Get -Uri "$base/stays/$stayId" -Headers $ah
Write-Host "initialMetersPromotedAt: $($stay.data.initialMetersPromotedAt)"
if ($stay.data.initialMetersPromotedAt) { Write-Host "PASS M-07: stay promoted walau meter 0!" -ForegroundColor Green } else { Write-Host "FAIL M-07: null" -ForegroundColor Red }

Write-Host "`n=== DONE ==="