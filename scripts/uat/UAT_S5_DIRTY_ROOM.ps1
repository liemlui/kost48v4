# S5: aktivasi diblokir saat kamar kotor (tiket pembersihan terbuka).
# Menunggu 10 menit dulu (reset rate-limit publicBooking 5x/10mnt).
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"
$env:PGPASSWORD = '123456'
function Sql($q) { $f = Join-Path $env:TEMP "s5q.sql"; Set-Content -Path $f -Value $q -Encoding ascii; & psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -A -t -f $f }
function PostJson($uri, $body, $headers) { Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers }
function PatchJson($uri, $body, $headers) { Invoke-RestMethod -Method Patch -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers }

if (-not $env:SKIP_WAIT) {
  Write-Host "Menunggu 600 dtk (reset limiter publicBooking)..."
  Start-Sleep -Seconds 610
}
$stamp = Get-Date -Format 'HHmmss'
$at = (PostJson "$base/auth/login" @{ identifier = 'admin@kost48.com'; password = 'admin123' } @{}).data.accessToken
$ah = @{ Authorization = "Bearer $at" }

$rooms = (Invoke-RestMethod "$base/public/rooms?limit=60").data.items | Where-Object { $_.status -eq 'AVAILABLE' }
$roomD = $rooms[0]
Write-Host "[S5] kamar $($roomD.code) (id $($roomD.id)) dijadikan kotor"
Sql "UPDATE ""Room"" SET status = 'MAINTENANCE', ""allowBookingWhileCleaning"" = TRUE WHERE id = $($roomD.id);" | Out-Null
Sql "INSERT INTO ""Ticket"" (""ticketNumber"", title, description, category, status, ""roomId"", ""createdAt"", ""updatedAt"") VALUES ('TIC-UATDIRTY-$stamp', 'Bersihkan kamar (UAT)', 'Simulasi kamar kotor pasca overstay untuk uji gate aktivasi.', 'CHECKOUT_INSPECTION', 'OPEN', $($roomD.id), NOW(), NOW());" | Out-Null

$bD = PostJson "$base/public/bookings" @{ roomId = $roomD.id; checkInDate = (Get-Date).AddDays(1).ToString('yyyy-MM-dd'); pricingTerm = 'MONTHLY'; fullName = "UAT d$stamp"; phone = "0895$stamp"; email = "uat.d$stamp@uat.kost48.local"; website = '' } @{}
$stayD = $bD.data.booking.stayId
Write-Host "PASS kamar kotor bisa dipesan (stay #$stayD)"

$ttD = (PostJson "$base/auth/login" @{ identifier = $bD.data.portalAccess.email; password = $bD.data.portalAccess.temporaryPassword } @{}).data.accessToken
$thD = @{ Authorization = "Bearer $ttD" }
$aprD = PatchJson "$base/admin/bookings/$stayD/approve" @{ agreedRentAmountRupiah = 2000000; depositAmountRupiah = 500000; initialElectricityKwh = '8000'; initialWaterM3 = '800' } $ah
$invD = $aprD.data.invoice.id
$sD = (PostJson "$base/payment-submissions" @{ stayId = $stayD; invoiceId = $invD; amountRupiah = 2500000; paidAt = (Get-Date).ToString('yyyy-MM-dd'); paymentMethod = 'TRANSFER' } $thD).data.id
try {
  Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sD/approve" -Headers $ah | Out-Null
  Write-Host "FAIL S5: aktivasi TIDAK diblokir"; $code = 0
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 409) { Write-Host "PASS S5: aktivasi DIBLOKIR 409 saat tiket pembersihan terbuka" } else { Write-Host "UNEXPECTED S5: $code" }
}

# cleanup
PostJson "$base/payment-submissions/$sD/reject" @{ reviewNotes = 'UAT selesai - simulasi kamar kotor dibersihkan' } $ah | Out-Null
Sql "DELETE FROM ""Ticket"" WHERE ""ticketNumber"" = 'TIC-UATDIRTY-$stamp';" | Out-Null
PostJson "$base/stays/$stayD/cancel" @{ cancelReason = 'UAT selesai - artefak simulasi kamar kotor dibersihkan' } $ah | Out-Null
$st = Sql "SELECT status || '|' || ""allowBookingWhileCleaning"" FROM ""Room"" WHERE id = $($roomD.id);"
Sql "UPDATE ""Room"" SET ""allowBookingWhileCleaning"" = FALSE WHERE id = $($roomD.id);" | Out-Null
Write-Host "cleanup: room=$($st.Trim()) (flag direset)"
if ($code -eq 409) { Write-Host "=== S5 PASS ===" } else { exit 1 }
