<#
  B2 - pindahkan arsip legacy KELUAR repo (66 berkas kelas C + 08_CHECKLIST.md).
  Dibuat 2026-10-05 oleh agen; DIJALANKAN OLEH OWNER (sandbox agen tidak boleh menulis di luar repo).

  Kenapa keluar repo: berkas-berkas ini tidak dikutip dokumen aktif (kelas C) atau sudah kedaluwarsa
  (08_CHECKLIST.md). Kelas A/B yang dikutip sudah dipindah ke docs/arsip/legacy/ pada commit 2971efa7.
  TIDAK ADA berkas yang dihapus - semuanya dipindah, dan 6 berkas tracked tetap ada di riwayat git.

  CARA PAKAI
    1) Uji dulu (tidak mengubah apa pun):      .\docs\rencana\B2-pindah-keluar-repo.ps1
    2) Kalau daftarnya sudah benar, eksekusi:  .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute
    3) Setelah selesai, kabari agen "SELESAI PINDAH": agen memverifikasi 67 berkas sampai di tujuan,
       meng-commit penghapusan 08_CHECKLIST.md dari repo, lalu menghapus baris docs/archieve/
       di .git/info/exclude (penutupan P5).

  CATATAN
    - Folder tujuan di bawah ini bisa Anda ubah; jangan ubah nilai variabel $repo.
    - Skrip berhenti dengan aman: berkas yang tidak ada hanya diperingatkan, tidak menggagalkan sisanya.
    - Jangan jalankan dari dalam folder docs; jalankan dari akar repo.
    - Folder tujuan BELUM ada: skrip membuatnya (-Force). Mode UJI pernah dijalankan agen 2026-10-05:
      67 target terbaca, 0 dilewati, tidak ada berkas berpindah, dan folder tujuan tidak terbentuk di
      uji itu karena sandbox agen hanya boleh menulis di dalam repo (Access denied) - di terminal Anda normal.
#>
[CmdletBinding()]
param(
  [switch]$Execute   # tanpa switch ini = mode UJI (WhatIf)
)

$repo = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
$dest = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\_arsip-docs-legacy-2026-10-05"

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

$mode = if ($Execute) { 'EKSEKUSI' } else { 'UJI (WhatIf - tidak ada yang dipindah)' }
Write-Host "=== B2 pindah keluar repo ===" -ForegroundColor Cyan
Write-Host "mode   : $mode"
Write-Host "repo   : $repo"
Write-Host "tujuan : $dest"
Write-Host "berkas : $($files.Count)"
Write-Host ""

# 1) folder tujuan utama
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# 2) pindahkan
$ok = 0; $lewat = 0
foreach ($rel in $files) {
  $src = Join-Path $repo ("docs\archieve\" + ($rel -replace '/', '\'))
  $dst = Join-Path $dest ($rel -replace '/', '\')
  $dstDir = Split-Path -Parent $dst

  if (-not (Test-Path $src)) { Write-Warning "TIDAK ADA (dilewati): $src"; $lewat++; continue }
  if (-not (Test-Path $dstDir)) {
    if ($Execute) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
    else { Write-Host "  [uji] akan dibuat: $dstDir" -ForegroundColor DarkGray }
  }
  if ($Execute) {
    Move-Item -LiteralPath $src -Destination $dst -Force
  } else {
    Move-Item -LiteralPath $src -Destination $dst -Force -WhatIf
  }
  $ok++
}

Write-Host ""
if (-not $Execute) {
  Write-Host "MODE UJI selesai: $ok berkas akan dipindah, $lewat dilewati." -ForegroundColor Yellow
  Write-Host "Kalau daftar di atas sudah benar, jalankan lagi dengan -Execute:" -ForegroundColor Yellow
  Write-Host "  .\docs\rencana\B2-pindah-keluar-repo.ps1 -Execute" -ForegroundColor Yellow
  return
}

# 3) verifikasi sesudah eksekusi
Write-Host "=== VERIFIKASI ===" -ForegroundColor Cyan
$ada = 0; $hilang = @()
foreach ($rel in $files) {
  $dst = Join-Path $dest ($rel -replace '/', '\')
  if (Test-Path $dst) { $ada++ } else { $hilang += $rel }
}
$sisa = @(Get-ChildItem -LiteralPath (Join-Path $repo 'docs\archieve') -Recurse -File -ErrorAction SilentlyContinue)
Write-Host "sampai di tujuan : $ada / $($files.Count)"
Write-Host "tidak sampai     : $($hilang.Count)"
if ($hilang.Count -gt 0) { $hilang | ForEach-Object { Write-Warning "  HILANG: $_" } }
Write-Host "sisa docs\archieve: $($sisa.Count) berkas (harus 1 = berkas .tsv)"
$sisa | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor DarkGray }
Write-Host ""
Write-Host "Sudah selesai? Kabari agen: SELESAI PINDAH" -ForegroundColor Green