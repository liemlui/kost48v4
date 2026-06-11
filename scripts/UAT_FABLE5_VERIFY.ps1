# =========================================================
# UAT FABLE 5 — Verifikasi FIX M-07, M-09, M-14, M-16
# =========================================================
# Cara pakai:
# 1. Pastikan backend sudah running di http://localhost:3000
# 2. Jalankan: .\scripts\UAT_FABLE5_VERIFY.ps1
# 3. Ikuti instruksi di setiap langkah
# =========================================================

$ErrorActionPreference = "Continue"
$base = "http://localhost:3000/api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  UAT FABLE 5 — M-07, M-09, M-14, M-16" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# -----------------------------------------------------------------
# 0. LOGIN ADMIN
# -----------------------------------------------------------------
Write-Host "`n[0] Login admin..." -ForegroundColor Yellow
try {
    $login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'
    $token = $login.data.accessToken
    Write-Host "  Token admin: OK" -ForegroundColor Green
} catch {
    Write-Host "  GAGAL login admin: $_" -ForegroundColor Red
    Write-Host "  Pastikan backend running di http://localhost:3000" -ForegroundColor Red
    exit 1
}

$headers = @{Authorization = "Bearer $token"}

# -----------------------------------------------------------------
# 1. CEK DATA AWAL — cari stay yang sudah ada
# -----------------------------------------------------------------
Write-Host "`n[1] Data awal — daftar stay..." -ForegroundColor Yellow
$stays = (Invoke-RestMethod -Method Get -Uri "$base/stays" -Headers $headers).items
if (-not $stays) { $stays = @() }
if ($stays.Count -eq 0) {
    Write-Host "  Tidak ada stay. LANJUTKAN dengan membuat booking baru dulu." -ForegroundColor Yellow
} else {
    $stays | Select-Object id, status, initialMetersPromotedAt, roomId | Format-Table -AutoSize
}

# -----------------------------------------------------------------
# 2. VERIFIKASI M-14: check-in manual HARUS punya initialMetersPromotedAt
# -----------------------------------------------------------------
Write-Host "`n[2] M-14 — Verifikasi check-in manual pasti promoted" -ForegroundColor Yellow
Write-Host "  Untuk menguji M-14:" -ForegroundColor White
Write-Host "  1. Buka admin panel → Check-in Manual" -ForegroundColor White
Write-Host "  2. Pilih kamar AVAILABLE, tenant aktif (contoh: tenant G2-002)" -ForegroundColor White
Write-Host "  3. Isi meter awal listrik & air, tarif sewa, klik Simpan" -ForegroundColor White
Write-Host "  4. Setelah sukses, jalankan perintah PowerShell ini:" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host '  $token="' -NoNewline -ForegroundColor Cyan
Write-Host $token -NoNewline -ForegroundColor Cyan
Write-Host '"; $h=@{Authorization="Bearer $token"}; $stays=(Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/stays" -Headers $h).items; $stays | Where-Object {$_.status -eq "ACTIVE" -and $_.initialMetersPromotedAt -eq $null} | Select id,status' -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host '  HASIL YANG DIHARAPKAN: tidak ada stay ACTIVE dengan initialMetersPromotedAt = null' -ForegroundColor Green
Write-Host '  (Semua check-in manual langsung promoted, tidak tersisih dari lifecycle overstay)' -ForegroundColor Green

# -----------------------------------------------------------------
# 3. VERIFIKASI M-07: booking activation HARUS promoted walau tanpa meter
# -----------------------------------------------------------------
Write-Host "`n[3] M-07 — Verifikasi aktivasi booking selalu promoted" -ForegroundColor Yellow
Write-Host "  Untuk menguji M-07:" -ForegroundColor White
Write-Host "  Jika ada booking RESERVED yang belum punya submission, bisa di-approve" -ForegroundColor White
Write-Host "  lewat admin panel → Booking Review → Approve (isi tarif, deposit, meter)" -ForegroundColor White
Write-Host "  Atau: booking baru → tenant portal → bayar → admin approve payment submission" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "  Setelah approve, stay HARUS punya initialMetersPromotedAt != null" -ForegroundColor Green
Write-Host "  (dulu hanya di-set kalau ada meter; sekarang SELALU di-set saat aktivasi)" -ForegroundColor Green

# -----------------------------------------------------------------
# 4. VERIFIKASI M-09: DP 30% recalc saat approval booking
# -----------------------------------------------------------------
Write-Host "`n[4] M-09 — Verifikasi DP 30% recalc" -ForegroundColor Yellow
Write-Host "  Untuk menguji M-09:" -ForegroundColor White
Write-Host "  1. Booking baru (tenant portal) → cek downPaymentAmountRupiah = 30% × sewa" -ForegroundColor White
Write-Host "  2. Admin approve booking DENGAN tarif berbeda → cek DP ikut berubah" -ForegroundColor White
Write-Host "  3. Admin coba approve booking dengan DP SUDAH terbayar & tarif diubah → HARUS ditolak" -ForegroundColor White
Write-Host "     (ConflictException: 'DP sudah dibayar untuk tarif sebelumnya')" -ForegroundColor White

# -----------------------------------------------------------------
# 5. VERIFIKASI M-16: cancel stay → kamar ke MAINTENANCE (bukan AVAILABLE)
# -----------------------------------------------------------------
Write-Host "`n[5] M-16 — Verifikasi cancel stay tidak lepas ke AVAILABLE" -ForegroundColor Yellow
Write-Host "  Untuk menguji M-16:" -ForegroundColor White
Write-Host "  1. Ambil stay ACTIVE yang sudah promoted (initialMetersPromotedAt != null)" -ForegroundColor White
Write-Host "  2. Buka admin panel → Stay List → klik Cancel" -ForegroundColor White
Write-Host "  3. Isi alasan cancel, submit" -ForegroundColor White
Write-Host "  4. Setelah cancel, cek status kamar (roomId dari stay tersebut):" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host '  $token="' -NoNewline -ForegroundColor Cyan
Write-Host $token -NoNewline -ForegroundColor Cyan
Write-Host '"; $h=@{Authorization="Bearer $token"}; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/rooms" -Headers $h' -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host '  HASIL YANG DIHARAPKAN: kamar GANTI jadi MAINTENANCE (bukan AVAILABLE)' -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "  Catatan: kalau stay-nya BELUM promoted (booking aja), kamar tetap AVAILABLE." -ForegroundColor Yellow
Write-Host "  Catatan: kalau ada tiket CHECKOUT_INSPECTION terbuka, kamar juga MAINTENANCE." -ForegroundColor Yellow

# -----------------------------------------------------------------
# 6. BUILD CHECK
# -----------------------------------------------------------------
Write-Host "`n[6] Build check..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/../backend"; npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Backend build: PASS" -ForegroundColor Green
} else {
    Write-Host "  Backend build: FAIL" -ForegroundColor Red
}

Set-Location "$PSScriptRoot/../frontend"; npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Frontend build: PASS" -ForegroundColor Green
} else {
    Write-Host "  Frontend build: FAIL" -ForegroundColor Red
}

# -----------------------------------------------------------------
# DONE
# -----------------------------------------------------------------
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  UAT FABLE 5 — SKRIP VERIFIKASI SELESAI" -ForegroundColor Cyan
Write-Host "  Jalankan langkah 2–5 secara manual" -ForegroundColor Cyan
Write-Host "  Gunakan token di atas untuk API tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan