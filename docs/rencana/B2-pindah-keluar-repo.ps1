<#
  B2 - pindahkan arsip legacy KELUAR repo (66 berkas kelas C + 08_CHECKLIST.md).
  Dibuat 2026-10-05 oleh agen; DIJALANKAN OLEH OWNER (sandbox agen tidak boleh menulis di luar repo).

  Kenapa keluar repo: berkas-berkas ini tidak dikutip dokumen aktif (kelas C) atau sudah kedaluwarsa
  (08_CHECKLIST.md). Kelas A/B yang dikutip sudah dipindah ke docs/arsip/legacy/ pada commit 2971efa7.
  TIDAK ADA berkas yang dihapus - semuanya dipindah, dan 6 berkas tracked tetap ada di riwayat git.

  TIGA MODE (aman secara default)
    1) .\docs\rencana\B2-pindah-keluar-repo.ps1
       UJI murni: tidak memindahkan apa pun, TIDAK membuat folder tujuan, hanya mencetak rencana.
    2) .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute
       Menjalankan pemindahan, tetapi MENOLAK MENIMPA: bila ada satu saja berkas tujuan yang sudah ada,
       seluruh proses dibatalkan sebelum satu berkas pun berpindah.
    3) .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute -Force
       Menjalankan pemindahan DAN mengizinkan menimpa berkas tujuan yang sudah ada - hanya bila Anda
       memang menghendakinya.

  PENGAMAN
    - Pra-terbang 1: daftar $files di bawah DIBANDINGKAN dengan daftar di
      docs/rencana/B2-daftar-pindah-arsip-legacy.md (bagian "## 5. Kelas C" + baris 08_CHECKLIST.md).
      Bila tidak sama => BERHENTI, selisihnya dicetak. Tidak ada drift diam-diam.
    - Pra-terbang 2 (mode -Execute tanpa -Force): mendeteksi bentrok berkas tujuan => BERHENTI,
      nol pemindahan, daftar bentrok dicetak, saran -Execute -Force.
    - Gagal membuat folder atau gagal memindah => BERHENTI (bukan lanjut), dan berkas yang sudah
      terlanjur pindah dilaporkan beserta perintah untuk mengembalikannya.
    - 6 berkas tracked: penghapusannya dari repo dicatat agen setelah Anda lapor "SELESAI PINDAH".

  CATATAN
    - Jangan ubah nilai variabel $repo. $dest boleh diubah bila Anda ingin lokasi lain.
    - Jalankan dari akar repo (bukan dari dalam folder docs).
    - Berkas yang tidak ada di sumber hanya DIPERINGATKAN dan dilewati (bukan kegagalan), karena daftar
      ini snapshot recon 2026-10-05.
#>
[CmdletBinding()]
param(
  [switch]$Execute,  # tanpa switch ini = mode UJI murni (WhatIf, tanpa menulis)
  [switch]$Force     # hanya berlaku bersama -Execute: izinkan menimpa berkas tujuan
)

$repo = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
$dest = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\_arsip-docs-legacy-2026-10-05"

# Snapshot daftar per 2026-10-05. Sengaja hardcoded; kesamaannya dengan dokumen diperiksa di pra-terbang.
$files = @(
  "2026-06-16_root_docs_pre_M/08_CHECKLIST.md",
  "2026-06-16_root_docs_pre_M/07_PLAN.md",
  "2026-06-16_root_docs_pre_M/09_TRACEABILITY.md",
  "2026-06-16_root_docs_pre_M/AUDIT_FASE4_FINAL.md",
  "2026-06-16_root_docs_pre_M/AUDIT_MENYELURUH_SEMUA_FASE.md",
  "2026-06-16_root_docs_pre_M/FLOW_AUDIT_LAPORAN.md",
  "2026-06-16_si_notes/_PLAN_SI_SEWA_RIWAYAT.md",
  "2026-06-20_fase_selesai/AUDIT_POST_FIX.md",
  "2026-06-20_fase_selesai/FASE_E_EVALUASI_ARSITEKTUR.md",
  "2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md",
  "2026-06-20_fase_selesai/M17_FASE_L_UIUX_AUDIT.md",
  "2026-06-20_fase_selesai/audit-uiux-2026-06-20.md",
  "2026-06-20_fase_selesai/fase-l-specs/L01_L03_loading_error_mobile.md",
  "2026-06-20_fase_selesai/fase-l-specs/L04_L07_wizard_balance_guest_auth.md",
  "2026-06-20_fase_selesai/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md",
  "2026-06-20_fase_selesai/fase-l-specs/L12_L15_enum_staff_stays_tenant.md",
  "2026-06-20_fase_selesai/fase-l-specs/L16_L20_accounting_a11y_empty_asset_minor.md",
  "AUDIT_CLINE_INVENTARIS.md",
  "AUDIT_CLINE_OPERASIONAL_STAF.md",
  "AUDIT_CLINE_PUBLIK_MARKETING.md",
  "PANDUAN_INPUT_TENANT.md",
  "PANDUAN_SHEET_TENANT.md",
  "PROMPT_AI_LEMAH_INTEGRASI_METER_TENANT.md",
  "_expired_root_cleanup/PROMPT_EKSEKUTOR_OVERHAUL_ADMIN_UX.md",
  "_expired_root_cleanup/RENCANA_WIZARD_AUDIT_TENANT.md",
  "_expired_root_cleanup/RUNBOOK_ONBOARDING_TENANT_NYATA.md",
  "_expired_root_cleanup/RUNBOOK_OVERHAUL_ADMIN_UX.md",
  "_expired_root_cleanup/_PROMPT_FASE2_DASHBOARD_ADMIN.md",
  "_previous_cycles/01_FINANSIAL_PERHITUNGAN.md",
  "_previous_cycles/02_LOGIKA_BISNIS.md",
  "_previous_cycles/03_LAPORAN_AKUNTANSI.md",
  "_previous_cycles/04_UI_UX.md",
  "_previous_cycles/05_MODUL_OPERASIONAL.md",
  "_previous_cycles/06_MODUL_LAINNYA.md",
  "_previous_cycles/07_CODE_QUALITY.md",
  "_previous_cycles/08_REPORTING_DASHBOARD.md",
  "_previous_cycles/M11_CHANGELOG_ARSIP_S1_2026.md",
  "_previous_cycles/M15-M17_README.md",
  "_previous_cycles/_AUDIT_CROSS_PORTAL_2026-07-02.md",
  "_previous_cycles/_SPEC_FASE_AJ_SISA_AUDIT.md",
  "_previous_cycles/_SPEC_FASE_X_UIUX.md",
  "audit_fable/CHECKLIST_01_publik_landing.md",
  "audit_fable/CHECKLIST_02_publik_katalog_kamar.md",
  "audit_fable/CHECKLIST_03_publik_booking.md",
  "audit_fable/CHECKLIST_04_auth.md",
  "audit_fable/CHECKLIST_05_tenant_mystay.md",
  "audit_fable/CHECKLIST_06_tenant_invoice_bayar.md",
  "audit_fable/CHECKLIST_07_tenant_tiket.md",
  "audit_fable/CHECKLIST_08_tenant_info.md",
  "audit_fable/CHECKLIST_09_tenant_loyalty_renew_checkout.md",
  "audit_fable/CHECKLIST_10_admin_booking_stay.md",
  "audit_fable/CHECKLIST_11_admin_renew_checkout_meter.md",
  "audit_fable/CHECKLIST_12_keuangan_invoice_payment.md",
  "audit_fable/CHECKLIST_13_keuangan_akuntansi.md",
  "audit_fable/CHECKLIST_14_ops_tiket_survey.md",
  "audit_fable/CHECKLIST_15_ops_staff_routines.md",
  "audit_fable/CHECKLIST_16_ops_inventory_layanan.md",
  "audit_fable/CHECKLIST_17_owner_dashboard_ai.md",
  "audit_fable/CHECKLIST_18_admin_master_settings.md",
  "audit_fable/CHECKLIST_19_lintas_pwa_a11y.md",
  "audit_fable/RINGKASAN_TEMUAN.md",
  "audit_reasonix/00_index.md",
  "audit_reasonix/09_EFISIENSI_TOKEN.md",
  "audit_reasonix/10_EFISIENSI_LANJUTAN.md",
  "audit_reasonix/11_DEAD_CODE.md",
  "audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md",
  "audit_reasonix/SPEC_PERBAIKAN_KRITIS.md"
)

$mode = if ($Execute -and $Force) { 'EKSEKUSI + IZIN MENIMPA (-Force)' }
        elseif ($Execute) { 'EKSEKUSI (menolak menimpa)' }
        else { 'UJI murni (WhatIf - tidak menulis apa pun)' }
Write-Host "=== B2 pindah keluar repo ===" -ForegroundColor Cyan
Write-Host "mode   : $mode"
Write-Host "repo   : $repo"
Write-Host "tujuan : $dest"
Write-Host "berkas : $($files.Count)"
Write-Host ""

# ── PRA-TERBANG 1: daftar skrip harus sama dengan dokumen (anti-drift) ──────
$dokDaftar = Join-Path $repo 'docs\rencana\B2-daftar-pindah-arsip-legacy.md'
if (-not (Test-Path $dokDaftar)) {
  Write-Error "BERHENTI: daftar rujukan tidak ditemukan: $dokDaftar. Pemeriksaan anti-drift tidak boleh dilewati."
  return
}
$barisDok = Get-Content -LiteralPath $dokDaftar
$dalamBagian5 = $false
$dariDokumen = New-Object System.Collections.Generic.List[string]
foreach ($baris in $barisDok) {
  if ($baris -match '^## 5\. Kelas C') { $dalamBagian5 = $true; continue }
  if ($dalamBagian5 -and $baris -match '^## ') { break }
  if ($dalamBagian5 -and $baris -match '^\| `archieve/([^`]+)` \|') { $dariDokumen.Add($matches[1]) }
}
if ($dariDokumen.Count -eq 0) {
  Write-Error "BERHENTI: bagian '## 5. Kelas C' tidak menghasilkan satu baris pun (format dokumen berubah?). Tidak ada yang dipindah."
  return
}
$tambahan = @('2026-06-16_root_docs_pre_M/08_CHECKLIST.md')
if (-not (($barisDok -join "`n") -match [regex]::Escape($tambahan[0]))) {
  Write-Error "BERHENTI: dokumen tidak lagi menyebut $($tambahan[0]); dasar pemindahannya hilang. Tidak ada yang dipindah."
  return
}
foreach ($t in $tambahan) { $dariDokumen.Add($t) }
$hanyaSkrip = @($files | Where-Object { $dariDokumen -notcontains $_ })
$hanyaDokumen = @($dariDokumen | Where-Object { $files -notcontains $_ })
if ($hanyaSkrip.Count -gt 0 -or $hanyaDokumen.Count -gt 0) {
  Write-Error "BERHENTI: daftar skrip TIDAK sama dengan dokumen (drift). Tidak ada yang dipindah."
  $hanyaSkrip | ForEach-Object { Write-Warning "  hanya di skrip   : $_" }
  $hanyaDokumen | ForEach-Object { Write-Warning "  hanya di dokumen : $_" }
  return
}
Write-Host "pra-terbang: daftar skrip = dokumen ($($files.Count) berkas)." -ForegroundColor DarkGray

# ── PRA-TERBANG 2: bentrok berkas tujuan ───────────────────────────────────
$bentrok = @($files | Where-Object { Test-Path (Join-Path $dest ($_ -replace '/', '\')) })
if ($Execute -and -not $Force -and $bentrok.Count -gt 0) {
  Write-Host ""
  Write-Error "BERHENTI: $($bentrok.Count) berkas sudah ada di tujuan. TIDAK ADA yang dipindah."
  $bentrok | ForEach-Object { Write-Host "   - $_" -ForegroundColor DarkGray }
  Write-Host "Kalau memang ingin menimpa: .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute -Force" -ForegroundColor Yellow
  return
}

# ── folder tujuan ──────────────────────────────────────────────────────────
if ($Execute) {
  try { New-Item -ItemType Directory -Force -Path $dest -ErrorAction Stop | Out-Null }
  catch { Write-Error "BERHENTI: gagal membuat folder tujuan $dest - $($_.Exception.Message). Tidak ada yang dipindah."; return }
} else {
  if (Test-Path $dest) { Write-Host "[uji] folder tujuan sudah ada: $dest" -ForegroundColor DarkGray }
  else { Write-Host "[uji] folder tujuan akan dibuat bila belum ada: $dest" -ForegroundColor DarkGray }
  Write-Host "[uji] berkas tujuan yang sudah ada saat ini: $($bentrok.Count) dari $($files.Count) (mode -Execute tanpa -Force akan menolak bila > 0)" -ForegroundColor DarkGray
}

# ── pemindahan ─────────────────────────────────────────────────────────────
$ok = 0; $lewat = 0; $gagalSebab = $null
$sudahPindah = New-Object System.Collections.Generic.List[string]
foreach ($rel in $files) {
  $src = Join-Path $repo ("docs\archieve\" + ($rel -replace '/', '\'))
  $dst = Join-Path $dest ($rel -replace '/', '\')
  $dstDir = Split-Path -Parent $dst

  if (-not (Test-Path $src)) { Write-Warning "TIDAK ADA (dilewati): $src"; $lewat++; continue }

  if (-not (Test-Path $dstDir)) {
    if ($Execute) {
      try { New-Item -ItemType Directory -Force -Path $dstDir -ErrorAction Stop | Out-Null }
      catch { $gagalSebab = "gagal membuat folder $dstDir - $($_.Exception.Message)"; break }
    } else {
      Write-Host "  [uji] akan dibuat: $dstDir" -ForegroundColor DarkGray
    }
  }

  if ($Execute) {
    try {
      if ($Force) { Move-Item -LiteralPath $src -Destination $dst -Force -ErrorAction Stop }
      else        { Move-Item -LiteralPath $src -Destination $dst -ErrorAction Stop }
      $ok++; $sudahPindah.Add($rel)
    } catch {
      $gagalSebab = "gagal memindah $rel - $($_.Exception.Message)"; break
    }
  } else {
    Move-Item -LiteralPath $src -Destination $dst -WhatIf
    $ok++
  }
}

# ── berhenti di tengah: laporkan yang sudah pindah ─────────────────────────
if ($gagalSebab) {
  Write-Host ""
  Write-Error "BERHENTI: $gagalSebab"
  if ($sudahPindah.Count -gt 0) {
    Write-Host "Berkas yang SUDAH terlanjur pindah ($($sudahPindah.Count)) - kembalikan manual bila perlu:" -ForegroundColor Yellow
    foreach ($rel in $sudahPindah) {
      Write-Host "   $rel" -ForegroundColor DarkGray
      Write-Host "     Move-Item -LiteralPath `"$dest\$($rel -replace '/', '\')`" -Destination `"$repo\docs\archieve\$($rel -replace '/', '\')`"" -ForegroundColor DarkGray
    }
  } else {
    Write-Host "Tidak ada berkas yang dipindah." -ForegroundColor Green
  }
  return
}

# ── ringkasan mode UJI ─────────────────────────────────────────────────────
Write-Host ""
if (-not $Execute) {
  Write-Host "MODE UJI selesai: $ok berkas akan dipindah, $lewat dilewati. Tidak ada berkas yang berpindah." -ForegroundColor Yellow
  Write-Host "Kalau daftar di atas sudah benar:" -ForegroundColor Yellow
  Write-Host "  .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute" -ForegroundColor Yellow
  return
}

# ── verifikasi sesudah eksekusi ────────────────────────────────────────────
Write-Host "=== VERIFIKASI ===" -ForegroundColor Cyan
$ada = 0; $hilang = @()
foreach ($rel in $files) {
  $dst = Join-Path $dest ($rel -replace '/', '\')
  if (Test-Path $dst) { $ada++ } else { $hilang += $rel }
}
$sisa = @(Get-ChildItem -LiteralPath (Join-Path $repo 'docs\archieve') -Recurse -File -ErrorAction SilentlyContinue)
Write-Host "dipindah (dilaporkan loop) : $ok"
Write-Host "sampai di tujuan           : $ada / $($files.Count)"
Write-Host "tidak sampai               : $($hilang.Count)"
if ($hilang.Count -gt 0) { $hilang | ForEach-Object { Write-Warning "  HILANG: $_" } }
Write-Host "sisa docs\archieve         : $($sisa.Count) berkas (harus 1 = berkas .tsv)"
$sisa | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor DarkGray }
Write-Host ""
Write-Host "Sudah selesai? Kabari agen: SELESAI PINDAH" -ForegroundColor Green
