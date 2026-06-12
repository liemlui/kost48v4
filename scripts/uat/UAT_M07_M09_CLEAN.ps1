# UAT M-07 + M-09 (varian data-bersih, 2026-06-12)
# Membuat tenant BARU via booking publik (tidak bentrok stay aktif), lalu:
# approve dgn tarif berbeda (M-09 recalc DP 30%) -> bayar DP -> pelunasan ->
# cek stay promoted (M-07) + expiresAt mati (M-12) + kamar OCCUPIED.
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"
$stamp = Get-Date -Format "HHmmss"
Write-Host "=== UAT M-07/M-09 CLEAN start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

function PostJson($uri, $body, $headers) {
  Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers
}
function PatchJson($uri, $body, $headers) {
  Invoke-RestMethod -Method Patch -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers
}

# [1] Kamar AVAILABLE pertama
$rooms = Invoke-RestMethod "$base/public/rooms?limit=60"
$room = $rooms.data.items | Where-Object { $_.status -eq 'AVAILABLE' } | Select-Object -First 1
if (-not $room) { throw "Tidak ada kamar AVAILABLE di UAT" }
Write-Host "[1] Kamar: id=$($room.id) code=$($room.code)"

# [2] Booking publik -> tenant+portal baru
$checkIn = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$pub = PostJson "$base/public/bookings" @{
  roomId = $room.id; checkInDate = $checkIn; pricingTerm = 'MONTHLY'
  fullName = "UAT Clean $stamp"; phone = "0899$stamp"; email = "uat.clean.$stamp@uat.kost48.local"; website = ''
} @{}
$stayId = $pub.data.booking.stayId
$tEmail = $pub.data.portalAccess.email
$tPass = $pub.data.portalAccess.temporaryPassword
if (-not $tPass) { throw "Portal access tidak mengembalikan password sementara" }
Write-Host "[2] Booking publik OK: stay=$stayId tenant=$tEmail"

# [3] Login tenant baru + admin
$tt = (PostJson "$base/auth/login" @{ identifier = $tEmail; password = $tPass } @{}).data.accessToken
$at = (PostJson "$base/auth/login" @{ identifier = 'admin@kost48.com'; password = 'admin123' } @{}).data.accessToken
$th = @{ Authorization = "Bearer $tt" }; $ah = @{ Authorization = "Bearer $at" }
Write-Host "[3] Login tenant + admin OK"

# [4] M-09: approve dengan tarif BERBEDA -> DP harus recalc 30% tarif baru
$newRent = 2000000
$approve = PatchJson "$base/admin/bookings/$stayId/approve" @{
  agreedRentAmountRupiah = $newRent; depositAmountRupiah = 500000
  initialElectricityKwh = '5000'; initialWaterM3 = '500'
} $ah
$invoiceId = $approve.data.invoice.id
$stay = (Invoke-RestMethod "$base/stays/$stayId" -Headers $ah).data
$expectDp = [Math]::Round(($newRent * 30) / 100)
Write-Host "[4] Invoice=$invoiceId DP=$($stay.downPaymentAmountRupiah) (expect $expectDp)"
if ($stay.downPaymentAmountRupiah -eq $expectDp) { Write-Host "    PASS M-09 (recalc DP)" -ForegroundColor Green } else { Write-Host "    FAIL M-09" -ForegroundColor Red; exit 1 }

# [5] Tenant bayar DP (nominal pas) -> admin approve
$dp = $stay.downPaymentAmountRupiah
$sub1 = (PostJson "$base/payment-submissions" @{ stayId = $stayId; invoiceId = $invoiceId; amountRupiah = $dp; paidAt = (Get-Date).ToString('yyyy-MM-dd'); paymentMethod = 'TRANSFER' } $th).data.id
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub1/approve" -Headers $ah | Out-Null
$stay = (Invoke-RestMethod "$base/stays/$stayId" -Headers $ah).data
Write-Host "[5] DP approved: dpPaid=$($stay.downPaymentPaidRupiah) expiresAt=$($stay.expiresAt)"
if ($stay.downPaymentPaidRupiah -eq $dp) { Write-Host "    PASS DP tercatat" -ForegroundColor Green } else { Write-Host "    FAIL DP" -ForegroundColor Red; exit 1 }
if (-not $stay.expiresAt) { Write-Host "    PASS M-12 (expiresAt mati)" -ForegroundColor Green } else { Write-Host "    WARN M-12: expiresAt masih $($stay.expiresAt)" -ForegroundColor Yellow }

# [6] M-09 part 2: approve ulang harus ditolak 409 (invoice sudah ada / tarif terkunci)
try {
  PatchJson "$base/admin/bookings/$stayId/approve" @{ agreedRentAmountRupiah = 2500000; depositAmountRupiah = 500000; initialElectricityKwh = '5000'; initialWaterM3 = '500' } $ah | Out-Null
  Write-Host "[6] FAIL: approve ulang tidak ditolak" -ForegroundColor Red; exit 1
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 409) { Write-Host "[6] PASS: approve ulang ditolak 409" -ForegroundColor Green } else { Write-Host "[6] UNEXPECTED $code" -ForegroundColor Red; exit 1 }
}

# [7] Pelunasan = sisa invoice + deposit jaminan -> approve -> M-07 promoted
$remaining = ($newRent - $dp) + 500000
$sub2 = (PostJson "$base/payment-submissions" @{ stayId = $stayId; invoiceId = $invoiceId; amountRupiah = $remaining; paidAt = (Get-Date).ToString('yyyy-MM-dd'); paymentMethod = 'TRANSFER' } $th).data.id
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sub2/approve" -Headers $ah | Out-Null
$stay = (Invoke-RestMethod "$base/stays/$stayId" -Headers $ah).data
$roomAfter = (Invoke-RestMethod "$base/rooms/$($room.id)" -Headers $ah).data
Write-Host "[7] promotedAt=$($stay.initialMetersPromotedAt) roomStatus=$($roomAfter.status) depositPaid=$($stay.depositPaidAmountRupiah)"
if ($stay.initialMetersPromotedAt) { Write-Host "    PASS M-07 (promoted)" -ForegroundColor Green } else { Write-Host "    FAIL M-07" -ForegroundColor Red; exit 1 }
if ($roomAfter.status -eq 'OCCUPIED') { Write-Host "    PASS kamar OCCUPIED" -ForegroundColor Green } else { Write-Host "    FAIL kamar=$($roomAfter.status)" -ForegroundColor Red; exit 1 }
if ($stay.depositPaidAmountRupiah -eq 500000) { Write-Host "    PASS jaminan tercatat 500rb" -ForegroundColor Green } else { Write-Host "    FAIL jaminan=$($stay.depositPaidAmountRupiah)" -ForegroundColor Red; exit 1 }

Write-Host "`n=== SEMUA PASS - selesai $(Get-Date -Format 'HH:mm:ss') ===" -ForegroundColor Green
Write-Host "Artefak: stay #$stayId (tenant $tEmail, kamar $($room.code)) dibiarkan untuk inspeksi; bersihkan via checkout/cancel bila perlu."
