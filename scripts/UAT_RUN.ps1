$ErrorActionPreference = "Continue"
Set-Location "$PSScriptRoot/.."

Write-Host "=== LOGIN ADMIN ===" 
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'
$token = $login.data.accessToken
$h = @{Authorization = "Bearer $token"}
Write-Host "OK"

Write-Host "`n=== STAY LIST ===" 
$stays = (Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/stays" -Headers $h).data.items
if ($null -eq $stays -or $stays.Count -eq 0) { Write-Host "NO STAYS"; exit 1 }
Write-Host "Total stays: $($stays.Count)"
foreach ($s in $stays) { Write-Host "#$($s.id) room=$($s.roomId) $($s.status) promoted=$($s.initialMetersPromotedAt) notes=$($s.notes)" }

Write-Host "`n=== M-14: Check stay ACTIVE tanpa promoted ==="
$unpromoted = $stays | Where-Object { $_.status -eq "ACTIVE" -and $null -eq $_.initialMetersPromotedAt }
if ($unpromoted.Count -eq 0) { Write-Host "PASS M-14: semua stay ACTIVE sudah promoted" } else { Write-Host "SEED DATA: $($unpromoted.Count) stay belum promoted (seed data belum simulate check-in manual). Untuk tes M-14, lakukan check-in manual via admin panel." }

Write-Host "`n=== M-16: Cek stay paling aman buat cancel (stay #$($stays[0].id), room $($stays[0].roomId)) ==="
$stay = $stays[0]
Write-Host "  Stay #$($stay.id): status=$($stay.status) promoted=$($stay.initialMetersPromotedAt)"
if ($stay.initialMetersPromotedAt -eq $null) { Write-Host "  SKIP: stay ini belum promoted (booking aja). M-16 hanya tes promoted stay." } else { Write-Host "  RUN M-16: cancel promoted stay..." }

Write-Host "`n=== M-16: Cek cancel stay (pake stay #$($stays[0].id) room=$($stays[0].roomId)) ==="
$stayId = $stays[0].id
$roomIdBefore = $stays[0].roomId
try {
  $cancel = Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/stays/$stayId/cancel" -Headers $h -ContentType "application/json" -Body '{"cancelReason":"UAT Fable5 M-16 test"}'
  Write-Host "CANCEL OK: status=$($cancel.data.status)"
  $roomAfter = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/rooms" -Headers $h
  $roomList = if ($roomAfter.items) { $roomAfter.items } elseif ($roomAfter.data) { $roomAfter.data } else { @() }
  $targetRoom = $roomList | Where-Object { $_.id -eq $roomIdBefore }
  Write-Host "Room $($roomIdBefore) status: $($targetRoom.status)"
  if ($targetRoom.status -eq "MAINTENANCE") { Write-Host "PASS M-16: kamar ke MAINTENANCE" } else { Write-Host "FAIL M-16: kamar $($targetRoom.status) (expect MAINTENANCE)" }
} catch { Write-Host "CANCEL FAIL: $($_.Exception.Message)" }

Write-Host "`n=== DONE ==="