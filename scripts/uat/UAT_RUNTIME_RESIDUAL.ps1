# UAT runtime 5 skenario residual (2026-06-12):
#   S1 guard pembayaran manual booking (A1) -> 409
#   S2 first-paid-wins dua pembayar -> booking pesaing CANCELLED + notif
#   S3 expiry 3 jam live -> booking kedaluwarsa di-cancel sweeper
#   S4 DP-forfeit H+1 -> stay CANCELLED + jurnal DP_FORFEIT + jaminan utuh
#   S5 aktivasi diblokir saat kamar kotor (tiket pembersihan terbuka) -> 409
# Catatan: manipulasi tanggal/status via SQL hanya pada artefak tes yang dibuat skrip ini.
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"
$env:PGPASSWORD = '123456'
$psql = 'psql'
function Sql($q) {
  $f = Join-Path $env:TEMP "uatq.sql"; Set-Content -Path $f -Value $q -Encoding ascii
  & $psql -h localhost -p 5433 -U postgres -d kost48_v3_pro -A -t -f $f
}
function PostJson($uri, $body, $headers) { Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers }
function PatchJson($uri, $body, $headers) { Invoke-RestMethod -Method Patch -Uri $uri -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 5) -Headers $headers }
function NewPublicBooking($roomId, $tag, $phoneDigit) {
  # phoneDigit harus unik antar booking — normalizePhone membuang huruf, jadi tag huruf saja tidak cukup.
  PostJson "$base/public/bookings" @{ roomId = $roomId; checkInDate = (Get-Date).AddDays(1).ToString('yyyy-MM-dd'); pricingTerm = 'MONTHLY'; fullName = "UAT $tag"; phone = "089$phoneDigit$stamp"; email = "uat.$tag@uat.kost48.local"; website = '' } @{}
}
function AvailableRooms() { (Invoke-RestMethod "$base/public/rooms?limit=60").data.items | Where-Object { $_.status -eq 'AVAILABLE' } }
$fail = 0
function Check($name, $ok) { if ($ok) { Write-Host "    PASS $name" -ForegroundColor Green } else { Write-Host "    FAIL $name" -ForegroundColor Red; $script:fail++ } }

$at = (PostJson "$base/auth/login" @{ identifier = 'admin@kost48.com'; password = 'admin123' } @{}).data.accessToken
$ah = @{ Authorization = "Bearer $at" }
$stamp = Get-Date -Format 'HHmmss'

# ============ S1 + S2 : satu kamar, dua booking ============
$rooms = AvailableRooms
if ($rooms.Count -lt 1) { throw "Tidak ada kamar AVAILABLE" }
$roomB = $rooms[0]
Write-Host "[S1/S2] kamar $($roomB.code) (id $($roomB.id))"
$bA = NewPublicBooking $roomB.id "a$stamp" 1
$bB = NewPublicBooking $roomB.id "b$stamp" 2
$stayA = $bA.data.booking.stayId; $stayB = $bB.data.booking.stayId
$ttA = (PostJson "$base/auth/login" @{ identifier = $bA.data.portalAccess.email; password = $bA.data.portalAccess.temporaryPassword } @{}).data.accessToken
$thA = @{ Authorization = "Bearer $ttA" }
$apr = PatchJson "$base/admin/bookings/$stayA/approve" @{ agreedRentAmountRupiah = 2000000; depositAmountRupiah = 500000; initialElectricityKwh = '7000'; initialWaterM3 = '700' } $ah
$invA = $apr.data.invoice.id
Write-Host "  booking A approved (invoice $invA); booking B pesaing stay #$stayB"

# S1: pembayaran manual oleh admin pada invoice booking -> WAJIB 409 (A1)
try {
  PostJson "$base/invoice-payments" @{ invoiceId = $invA; paymentDate = (Get-Date).ToString('yyyy-MM-dd'); amountRupiah = 100000; method = 'CASH' } $ah | Out-Null
  Check "S1 guard A1 (manual payment ditolak)" $false
} catch { Check "S1 guard A1 (manual payment ditolak 409)" ($_.Exception.Response.StatusCode.value__ -eq 409) }

# S2: tenant A bayar DP -> approve -> pesaing B harus CANCELLED + dapat notif
$dpA = (Invoke-RestMethod "$base/stays/$stayA" -Headers $ah).data.downPaymentAmountRupiah
$s1 = (PostJson "$base/payment-submissions" @{ stayId = $stayA; invoiceId = $invA; amountRupiah = $dpA; paidAt = (Get-Date).ToString('yyyy-MM-dd'); paymentMethod = 'TRANSFER' } $thA).data.id
Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$s1/approve" -Headers $ah | Out-Null
$stB = Sql "SELECT status FROM ""Stay"" WHERE id = $stayB;"
Check "S2 pesaing CANCELLED" ($stB.Trim() -eq 'CANCELLED')
$notifB = Sql "SELECT COUNT(*) FROM ""AppNotification"" n JOIN ""User"" u ON u.id = n.""recipientUserId"" WHERE u.email = 'uat.b$stamp@uat.kost48.local' AND n.title LIKE '%diamankan tenant lain%';"
Check "S2 notif tenant kalah (A17)" ([int]$notifB.Trim() -ge 1)

# ============ S4 : DP-forfeit H+1 (pakai stay A yang ber-DP) ============
Sql "UPDATE ""Stay"" SET ""checkInDate"" = (CURRENT_DATE - INTERVAL '2 day')::date WHERE id = $stayA;" | Out-Null
Invoke-RestMethod -Method Post -Uri "$base/auto-ops/run" -Headers $ah | Out-Null
$rowA = Sql "SELECT status || '|' || COALESCE(""downPaymentForfeitedAt""::text,'NULL') || '|' || ""depositStatus"" || '|' || ""depositPaidAmountRupiah"" FROM ""Stay"" WHERE id = $stayA;"
$p = $rowA.Trim() -split '\|'
Check "S4 stay CANCELLED" ($p[0] -eq 'CANCELLED')
Check "S4 downPaymentForfeitedAt terisi" ($p[1] -ne 'NULL')
Check "S4 jaminan utuh (HELD, paid 0)" ($p[2] -eq 'HELD' -and [int]$p[3] -eq 0)
$je = Sql "SELECT COUNT(*) FROM ""JournalEntry"" WHERE ""sourceId"" = 'DP_FORFEIT:$stayA' AND status = 'POSTED';"
Check "S4 jurnal DP_FORFEIT POSTED" ([int]$je.Trim() -ge 1)
$roomBs = Sql "SELECT status FROM ""Room"" WHERE id = $($roomB.id);"
Check "S4 kamar dilepas" ($roomBs.Trim() -in @('AVAILABLE','RESERVED'))

# ============ S3 : expiry 3 jam live ============
$rooms = AvailableRooms
$roomC = $rooms[0]
$bC = NewPublicBooking $roomC.id "c$stamp" 3
$stayC = $bC.data.booking.stayId
Sql "UPDATE ""Stay"" SET ""expiresAt"" = NOW() - INTERVAL '1 hour' WHERE id = $stayC;" | Out-Null
Invoke-RestMethod -Method Post -Uri "$base/auto-ops/run" -Headers $ah | Out-Null
$stC = Sql "SELECT s.status || '|' || r.status FROM ""Stay"" s JOIN ""Room"" r ON r.id = s.""roomId"" WHERE s.id = $stayC;"
$pc = $stC.Trim() -split '\|'
Check "S3 booking kedaluwarsa CANCELLED" ($pc[0] -eq 'CANCELLED')
Check "S3 kamar dilepas" ($pc[1] -eq 'AVAILABLE')

# ============ S5 : aktivasi diblokir saat kamar kotor ============
$rooms = AvailableRooms
$roomD = $rooms[0]
Write-Host "[S5] kamar $($roomD.code) (id $($roomD.id)) dijadikan 'kotor'"
Sql "UPDATE ""Room"" SET status = 'MAINTENANCE', ""allowBookingWhileCleaning"" = TRUE WHERE id = $($roomD.id);" | Out-Null
Sql "INSERT INTO ""Ticket"" (""ticketNumber"", title, description, category, status, ""roomId"", ""createdAt"", ""updatedAt"") VALUES ('TIC-UATDIRTY-$stamp', 'Bersihkan kamar (UAT)', 'Simulasi kamar kotor pasca overstay untuk uji gate aktivasi.', 'CHECKOUT_INSPECTION', 'OPEN', $($roomD.id), NOW(), NOW());" | Out-Null
$bD = NewPublicBooking $roomD.id "d$stamp" 4
$stayD = $bD.data.booking.stayId
Check "S5 kamar kotor BISA dipesan" ($null -ne $stayD)
$ttD = (PostJson "$base/auth/login" @{ identifier = $bD.data.portalAccess.email; password = $bD.data.portalAccess.temporaryPassword } @{}).data.accessToken
$thD = @{ Authorization = "Bearer $ttD" }
$aprD = PatchJson "$base/admin/bookings/$stayD/approve" @{ agreedRentAmountRupiah = 2000000; depositAmountRupiah = 500000; initialElectricityKwh = '8000'; initialWaterM3 = '800' } $ah
$invD = $aprD.data.invoice.id
$full = 2000000 + 500000
$sD = (PostJson "$base/payment-submissions" @{ stayId = $stayD; invoiceId = $invD; amountRupiah = $full; paidAt = (Get-Date).ToString('yyyy-MM-dd'); paymentMethod = 'TRANSFER' } $thD).data.id
try {
  Invoke-RestMethod -Method Post -Uri "$base/payment-submissions/$sD/approve" -Headers $ah | Out-Null
  Check "S5 aktivasi DIBLOKIR saat tiket pembersihan terbuka" $false
} catch { Check "S5 aktivasi DIBLOKIR (409 tiket pembersihan)" ($_.Exception.Response.StatusCode.value__ -eq 409) }

# cleanup S5: reject submission, hapus tiket simulasi, batalkan stay, kamar balik AVAILABLE
PostJson "$base/payment-submissions/$sD/reject" @{ reviewNotes = 'UAT selesai - dibatalkan (simulasi kamar kotor)' } $ah | Out-Null
Sql "DELETE FROM ""Ticket"" WHERE ""ticketNumber"" = 'TIC-UATDIRTY-$stamp';" | Out-Null
PostJson "$base/stays/$stayD/cancel" @{ cancelReason = 'UAT selesai - artefak simulasi kamar kotor dibersihkan' } $ah | Out-Null
$roomDs = Sql "SELECT status || '|' || ""allowBookingWhileCleaning"" FROM ""Room"" WHERE id = $($roomD.id);"
Write-Host "  cleanup S5: room=$($roomDs.Trim())"

Write-Host ""
if ($fail -eq 0) { Write-Host "=== SEMUA 5 SKENARIO RESIDUAL PASS ===" -ForegroundColor Green } else { Write-Host "=== $fail CHECK GAGAL ===" -ForegroundColor Red; exit 1 }
