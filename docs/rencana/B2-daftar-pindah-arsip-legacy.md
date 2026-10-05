# B2 — daftar pindah arsip legacy (`docs/archieve/**`) — potret 2026-10-05

> **Blok baca** · Jenis: **daftar kerja batch** · Status: **menunggu persetujuan owner** · Untuk siapa: owner + agen pelaksana B2
> · Baca kalau: akan memindahkan/merawat arsip legacy. · **Jangan** dibaca kalau: sedang mengerjakan task produk.

Recon dijalankan 2026-10-05 pada HEAD `f8fbff7d`.
Aturan batch: [RENCANA-ROMPAK-DOCS.md](RENCANA-ROMPAK-DOCS.md) §4 (B2) · keputusan owner: [PERTANYAAN-ROMPAK.md](PERTANYAAN-ROMPAK.md). **Belum ada berkas yang dipindahkan.**

## 1. Metode

Kelas ditentukan dari kemunculan nama berkas di **dokumen aktif** (root `*.md` + `docs/**` di luar `archieve`, `arsip`, `audit-map`):

| Kelas | Arti | Tindakan yang diusulkan |
|---|---|---|
| **A** | dikutip lewat **path** (`archieve/…`) | pindah **di dalam repo** ke `docs/arsip/legacy/<sub>` + alihkan tautannya |
| **B** | hanya **namanya** muncul (bisa kebetulan, mis. `CHECKLIST`) | tinjau manual; default pindah ke `docs/arsip/legacy/<sub>` |
| **C** | tidak dikutip sama sekali | pindah **keluar repo** (owner eksekusi) — bukan dihapus, karena **untracked tidak punya jaring git** |

Perintah pengukuran ulang: `node .design-audit/b2-recon-arsip.mjs <akar-repo>`.

## 2. Ringkasan

| Ukuran | Jumlah |
|---|---:|
| Berkas `.md` di `docs/archieve/**` | **106** |
| — tracked git | 30 |
| — untracked (di-exclude lokal) | 76 |
| Kelas **A** (dikutip lewat path) | **35** |
| Kelas **B** (hanya nama) | **5** |
| Kelas **C** (tidak dikutip) | **66** |
| Total byte kelas A+B (masuk `docs/arsip/legacy/`) | 590.0 KB |

## 3. Kelas A — dikutip lewat path (35)

| Berkas | KB | Git | Penyebutan | Dokumen aktif yang mengutip |
|---|---:|---|---:|---|
| `archieve/2026-06-16_root_docs_pre_M/00_BLUEPRINT.md` | 8.9 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/02_FLOW_MAP.md` | 29.8 | tracked | 2 | docs/domain/flow.md<br>docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/03_KEPUTUSAN_OWNER.md` | 16.1 | tracked | 2 | docs/domain/kontrak.md<br>docs/KEPUTUSAN-OWNER.md |
| `archieve/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md` | 18.0 | tracked | 3 | docs/domain/flow.md<br>docs/domain/kontrak.md<br>docs/operations/deploy-go-live.md |
| `archieve/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md` | 8.4 | tracked | 2 | docs/domain/kontrak.md<br>docs/operations/verifikasi-keuangan.md |
| `archieve/2026-06-16_root_docs_pre_M/06_CONTRACTS.md` | 18.1 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/10_PEMBAYARAN_INVOICE.md` | 6.7 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/11_BOOKING_RENEWAL.md` | 8.7 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/12_CHECKOUT_DEPOSIT_OVERSTAY.md` | 7.5 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/13_AKUNTANSI_LAPORAN.md` | 13.3 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/14_INVENTARIS.md` | 4.7 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/15_STAF_TIKET_KPI.md` | 5.6 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/16_NOTIFIKASI_PENGUMUMAN.md` | 6.7 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md` | 7.8 | tracked | 2 | docs/domain/kontrak.md<br>docs/domain/publik.md |
| `archieve/2026-06-16_root_docs_pre_M/18_AUTH_FONDASI_ONBOARDING.md` | 6.0 | tracked | 1 | docs/domain/kontrak.md |
| `archieve/2026-06-16_root_docs_pre_M/19_GAMIFIKASI_LOYALITAS.md` | 4.7 | tracked | 1 | docs/domain/publik.md |
| `archieve/2026-06-16_root_docs_pre_M/GO_LIVE_CHECKLIST.md` | 6.7 | tracked | 1 | docs/operations/deploy-go-live.md |
| `archieve/2026-06-16_root_docs_pre_M/_PETA_AI.md` | 6.9 | tracked | 1 | docs/domain/flow.md |
| `archieve/2026-06-16_root_docs_pre_M/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md` | 5.6 | tracked | 1 | docs/domain/publik.md |
| `archieve/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md` | 2.4 | untracked | 1 | docs/operations/default-dev.md |
| `archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md` | 28.3 | untracked | 2 | docs/M13_CHANGELOG.md<br>docs/STATUS.md |
| `archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md` | 18.2 | untracked | 1 | docs/domain/ai.md |
| `archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md` | 2.5 | untracked | 1 | docs/domain/ai.md |
| `archieve/2026-09-07_docs_cleanup/GO_LIVE_DATA_ISI.md` | 8.8 | tracked | 2 | docs/M13_CHANGELOG.md<br>docs/STATUS.md |
| `archieve/AUDIT_INVENTARIS_LENGKAP.md` | 11.0 | untracked | 2 | docs/operations/data-master.md<br>docs/operations/produksi.md |
| `archieve/_expired_root_cleanup/PANDUAN_DEPLOY_CPANEL.md` | 15.4 | untracked | 2 | docs/M13_CHANGELOG.md<br>docs/STATUS.md |
| `archieve/_expired_root_cleanup/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md` | 23.6 | untracked | 2 | docs/KEPUTUSAN-OWNER.md<br>docs/operations/data-master.md |
| `archieve/_expired_root_cleanup/UI_UX_OWNER_ADMIN.md` | 3.1 | untracked | 1 | docs/KEPUTUSAN-OWNER.md |
| `archieve/_previous_cycles/M09_AUDIT.md` | 70.5 | untracked | 1 | docs/PETA-KODE.md |
| `archieve/_previous_cycles/M14_REDUNDANSI_UI_UX.md` | 1.9 | untracked | 1 | docs/PETA-KODE.md |
| `archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md` | 2.0 | untracked | 3 | docs/audit/audit-uang-huni-2026-07.md<br>docs/audit/p1-uang-verifikasi-2026-09-25.md<br>docs/PETA-KODE.md |
| `archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md` | 1.6 | untracked | 2 | docs/audit/audit-uang-huni-2026-07.md<br>docs/PETA-KODE.md |
| `archieve/_previous_cycles/M17_AUDIT_360_P3_P8.md` | 2.2 | untracked | 5 | docs/audit/audit-operasional-2026-07.md<br>docs/domain/ai.md<br>docs/domain/flow.md |
| `archieve/audit_fable/00_INDEX.md` | 19.0 | untracked | 1 | docs/PETA-KODE.md |
| `archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` | 8.3 | untracked | 2 | docs/KEPUTUSAN-OWNER.md<br>docs/PETA-KODE.md |

## 4. Kelas B — hanya namanya muncul (5)

| Berkas | KB | Git | Penyebutan |
|---|---:|---|---:|
| `archieve/2026-06-16_root_docs_pre_M/01_GROUND_STATE.md` | 9.4 | tracked | 1 |
| `archieve/2026-06-16_root_docs_pre_M/08_CHECKLIST.md` | 43.9 | tracked | 2 |
| `archieve/2026-06-16_root_docs_pre_M/CHANGELOG.md` | 120.8 | tracked | 1 |
| `archieve/2026-06-16_root_docs_pre_M/_AKUN_DUMMY_DEV.md` | 1.8 | tracked | 1 |
| `archieve/2026-06-16_root_docs_pre_M/_PROPOSAL_METER_LISTRIK_AIR.md` | 5.3 | tracked | 1 |

## 5. Kelas C — tidak dikutip (66)

| Berkas | KB | Git |
|---|---:|---|
| `archieve/2026-06-16_root_docs_pre_M/07_PLAN.md` | 4.3 | tracked |
| `archieve/2026-06-16_root_docs_pre_M/09_TRACEABILITY.md` | 2.0 | tracked |
| `archieve/2026-06-16_root_docs_pre_M/AUDIT_FASE4_FINAL.md` | 16.4 | tracked |
| `archieve/2026-06-16_root_docs_pre_M/AUDIT_MENYELURUH_SEMUA_FASE.md` | 7.5 | tracked |
| `archieve/2026-06-16_root_docs_pre_M/FLOW_AUDIT_LAPORAN.md` | 31.7 | tracked |
| `archieve/2026-06-16_si_notes/_PLAN_SI_SEWA_RIWAYAT.md` | 4.8 | untracked |
| `archieve/2026-06-20_fase_selesai/AUDIT_POST_FIX.md` | 3.6 | untracked |
| `archieve/2026-06-20_fase_selesai/FASE_E_EVALUASI_ARSITEKTUR.md` | 3.8 | untracked |
| `archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md` | 19.8 | untracked |
| `archieve/2026-06-20_fase_selesai/M17_FASE_L_UIUX_AUDIT.md` | 5.0 | untracked |
| `archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md` | 12.8 | untracked |
| `archieve/2026-06-20_fase_selesai/fase-l-specs/L01_L03_loading_error_mobile.md` | 20.0 | untracked |
| `archieve/2026-06-20_fase_selesai/fase-l-specs/L04_L07_wizard_balance_guest_auth.md` | 18.9 | untracked |
| `archieve/2026-06-20_fase_selesai/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` | 36.0 | untracked |
| `archieve/2026-06-20_fase_selesai/fase-l-specs/L12_L15_enum_staff_stays_tenant.md` | 23.3 | untracked |
| `archieve/2026-06-20_fase_selesai/fase-l-specs/L16_L20_accounting_a11y_empty_asset_minor.md` | 32.6 | untracked |
| `archieve/AUDIT_CLINE_INVENTARIS.md` | 10.8 | untracked |
| `archieve/AUDIT_CLINE_OPERASIONAL_STAF.md` | 15.6 | untracked |
| `archieve/AUDIT_CLINE_PUBLIK_MARKETING.md` | 9.6 | untracked |
| `archieve/PANDUAN_INPUT_TENANT.md` | 2.9 | untracked |
| `archieve/PANDUAN_SHEET_TENANT.md` | 13.2 | untracked |
| `archieve/PROMPT_AI_LEMAH_INTEGRASI_METER_TENANT.md` | 4.2 | untracked |
| `archieve/_expired_root_cleanup/PROMPT_EKSEKUTOR_OVERHAUL_ADMIN_UX.md` | 32.8 | untracked |
| `archieve/_expired_root_cleanup/RENCANA_WIZARD_AUDIT_TENANT.md` | 10.5 | untracked |
| `archieve/_expired_root_cleanup/RUNBOOK_ONBOARDING_TENANT_NYATA.md` | 4.9 | untracked |
| `archieve/_expired_root_cleanup/RUNBOOK_OVERHAUL_ADMIN_UX.md` | 19.5 | untracked |
| `archieve/_expired_root_cleanup/_PROMPT_FASE2_DASHBOARD_ADMIN.md` | 5.8 | untracked |
| `archieve/_previous_cycles/01_FINANSIAL_PERHITUNGAN.md` | 5.0 | untracked |
| `archieve/_previous_cycles/02_LOGIKA_BISNIS.md` | 5.3 | untracked |
| `archieve/_previous_cycles/03_LAPORAN_AKUNTANSI.md` | 3.9 | untracked |
| `archieve/_previous_cycles/04_UI_UX.md` | 4.7 | untracked |
| `archieve/_previous_cycles/05_MODUL_OPERASIONAL.md` | 4.3 | untracked |
| `archieve/_previous_cycles/06_MODUL_LAINNYA.md` | 3.8 | untracked |
| `archieve/_previous_cycles/07_CODE_QUALITY.md` | 5.7 | untracked |
| `archieve/_previous_cycles/08_REPORTING_DASHBOARD.md` | 6.3 | untracked |
| `archieve/_previous_cycles/M11_CHANGELOG_ARSIP_S1_2026.md` | 144.4 | untracked |
| `archieve/_previous_cycles/M15-M17_README.md` | 0.9 | untracked |
| `archieve/_previous_cycles/_AUDIT_CROSS_PORTAL_2026-07-02.md` | 27.6 | untracked |
| `archieve/_previous_cycles/_SPEC_FASE_AJ_SISA_AUDIT.md` | 18.5 | untracked |
| `archieve/_previous_cycles/_SPEC_FASE_X_UIUX.md` | 20.0 | untracked |
| `archieve/audit_fable/CHECKLIST_01_publik_landing.md` | 14.6 | untracked |
| `archieve/audit_fable/CHECKLIST_02_publik_katalog_kamar.md` | 9.1 | untracked |
| `archieve/audit_fable/CHECKLIST_03_publik_booking.md` | 10.8 | untracked |
| `archieve/audit_fable/CHECKLIST_04_auth.md` | 10.4 | untracked |
| `archieve/audit_fable/CHECKLIST_05_tenant_mystay.md` | 12.1 | untracked |
| `archieve/audit_fable/CHECKLIST_06_tenant_invoice_bayar.md` | 7.9 | untracked |
| `archieve/audit_fable/CHECKLIST_07_tenant_tiket.md` | 6.9 | untracked |
| `archieve/audit_fable/CHECKLIST_08_tenant_info.md` | 8.5 | untracked |
| `archieve/audit_fable/CHECKLIST_09_tenant_loyalty_renew_checkout.md` | 8.8 | untracked |
| `archieve/audit_fable/CHECKLIST_10_admin_booking_stay.md` | 9.9 | untracked |
| `archieve/audit_fable/CHECKLIST_11_admin_renew_checkout_meter.md` | 7.3 | untracked |
| `archieve/audit_fable/CHECKLIST_12_keuangan_invoice_payment.md` | 7.9 | untracked |
| `archieve/audit_fable/CHECKLIST_13_keuangan_akuntansi.md` | 9.3 | untracked |
| `archieve/audit_fable/CHECKLIST_14_ops_tiket_survey.md` | 6.8 | untracked |
| `archieve/audit_fable/CHECKLIST_15_ops_staff_routines.md` | 5.3 | untracked |
| `archieve/audit_fable/CHECKLIST_16_ops_inventory_layanan.md` | 7.1 | untracked |
| `archieve/audit_fable/CHECKLIST_17_owner_dashboard_ai.md` | 11.2 | untracked |
| `archieve/audit_fable/CHECKLIST_18_admin_master_settings.md` | 8.0 | untracked |
| `archieve/audit_fable/CHECKLIST_19_lintas_pwa_a11y.md` | 10.2 | untracked |
| `archieve/audit_fable/RINGKASAN_TEMUAN.md` | 17.0 | untracked |
| `archieve/audit_reasonix/00_index.md` | 12.9 | untracked |
| `archieve/audit_reasonix/09_EFISIENSI_TOKEN.md` | 4.6 | untracked |
| `archieve/audit_reasonix/10_EFISIENSI_LANJUTAN.md` | 14.7 | untracked |
| `archieve/audit_reasonix/11_DEAD_CODE.md` | 6.9 | untracked |
| `archieve/audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md` | 8.3 | untracked |
| `archieve/audit_reasonix/SPEC_PERBAIKAN_KRITIS.md` | 9.9 | untracked |

## 6. Perintah eksekusi

### 6.1 Dipindah OLEH AGEN di dalam repo (kelas A + B)

Tujuan: `docs/arsip/legacy/<sub>` (subfolder dipertahankan). Setiap pemindahan wajib punya bukti konservasi
(0 baris non-kosong hilang) dan tautan masuk dialihkan pada batch yang sama.

```powershell
$repo = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\00_BLUEPRINT.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\00_BLUEPRINT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\02_FLOW_MAP.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\02_FLOW_MAP.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\03_KEPUTUSAN_OWNER.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\03_KEPUTUSAN_OWNER.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\04_DEPLOY_AND_PWA.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\04_DEPLOY_AND_PWA.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\05_VERIFIKASI_KEUANGAN.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\05_VERIFIKASI_KEUANGAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\06_CONTRACTS.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\06_CONTRACTS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\10_PEMBAYARAN_INVOICE.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\10_PEMBAYARAN_INVOICE.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\11_BOOKING_RENEWAL.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\11_BOOKING_RENEWAL.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\12_CHECKOUT_DEPOSIT_OVERSTAY.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\12_CHECKOUT_DEPOSIT_OVERSTAY.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\13_AKUNTANSI_LAPORAN.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\13_AKUNTANSI_LAPORAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\14_INVENTARIS.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\14_INVENTARIS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\15_STAF_TIKET_KPI.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\15_STAF_TIKET_KPI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\16_NOTIFIKASI_PENGUMUMAN.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\16_NOTIFIKASI_PENGUMUMAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\17_PUBLIK_MARKETING_UIUX.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\17_PUBLIK_MARKETING_UIUX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\18_AUTH_FONDASI_ONBOARDING.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\18_AUTH_FONDASI_ONBOARDING.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\19_GAMIFIKASI_LOYALITAS.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\19_GAMIFIKASI_LOYALITAS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\GO_LIVE_CHECKLIST.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\GO_LIVE_CHECKLIST.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\_PETA_AI.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\_PETA_AI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_si_notes\_AKUN_DUMMY_DEV.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_si_notes\_AKUN_DUMMY_DEV.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\M13_FASE_H_UIUX_COMPACT.md" -Destination "$repo\docs\arsip\legacy\2026-06-20_fase_selesai\M13_FASE_H_UIUX_COMPACT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\M15_FASE_J_HARDENING_AI.md" -Destination "$repo\docs\arsip\legacy\2026-06-20_fase_selesai\M15_FASE_J_HARDENING_AI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\M16_PASCA_AUDIT_PLAN.md" -Destination "$repo\docs\arsip\legacy\2026-06-20_fase_selesai\M16_PASCA_AUDIT_PLAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-09-07_docs_cleanup\GO_LIVE_DATA_ISI.md" -Destination "$repo\docs\arsip\legacy\2026-09-07_docs_cleanup\GO_LIVE_DATA_ISI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\AUDIT_INVENTARIS_LENGKAP.md" -Destination "$repo\docs\arsip\legacy\AUDIT_INVENTARIS_LENGKAP.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\PANDUAN_DEPLOY_CPANEL.md" -Destination "$repo\docs\arsip\legacy\_expired_root_cleanup\PANDUAN_DEPLOY_CPANEL.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md" -Destination "$repo\docs\arsip\legacy\_expired_root_cleanup\RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\UI_UX_OWNER_ADMIN.md" -Destination "$repo\docs\arsip\legacy\_expired_root_cleanup\UI_UX_OWNER_ADMIN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M09_AUDIT.md" -Destination "$repo\docs\arsip\legacy\_previous_cycles\M09_AUDIT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M14_REDUNDANSI_UI_UX.md" -Destination "$repo\docs\arsip\legacy\_previous_cycles\M14_REDUNDANSI_UI_UX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M15_AUDIT_360_FLOW_UANG.md" -Destination "$repo\docs\arsip\legacy\_previous_cycles\M15_AUDIT_360_FLOW_UANG.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M16_AUDIT_360_FLOW_HUNI.md" -Destination "$repo\docs\arsip\legacy\_previous_cycles\M16_AUDIT_360_FLOW_HUNI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M17_AUDIT_360_P3_P8.md" -Destination "$repo\docs\arsip\legacy\_previous_cycles\M17_AUDIT_360_P3_P8.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\00_INDEX.md" -Destination "$repo\docs\arsip\legacy\audit_fable\00_INDEX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\RINGKASAN_EKSEKUTIF.md" -Destination "$repo\docs\arsip\legacy\audit_reasonix\RINGKASAN_EKSEKUTIF.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\01_GROUND_STATE.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\01_GROUND_STATE.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\08_CHECKLIST.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\08_CHECKLIST.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\CHANGELOG.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\CHANGELOG.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\_AKUN_DUMMY_DEV.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\_AKUN_DUMMY_DEV.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\_PROPOSAL_METER_LISTRIK_AIR.md" -Destination "$repo\docs\arsip\legacy\2026-06-16_root_docs_pre_M\_PROPOSAL_METER_LISTRIK_AIR.md" -Force
```

### 6.2 Dipindah OLEH OWNER ke luar repo (kelas C)

Tujuan usulan: `C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\_arsip-docs-legacy-2026-10-05` — **silakan ubah** `$dest` bila ingin lokasi lain. Tidak ada berkas yang dihapus.

```powershell
$repo = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"
$dest = "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\_arsip-docs-legacy-2026-10-05"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\07_PLAN.md" -Destination "$dest\2026-06-16_root_docs_pre_M\07_PLAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\09_TRACEABILITY.md" -Destination "$dest\2026-06-16_root_docs_pre_M\09_TRACEABILITY.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\AUDIT_FASE4_FINAL.md" -Destination "$dest\2026-06-16_root_docs_pre_M\AUDIT_FASE4_FINAL.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\AUDIT_MENYELURUH_SEMUA_FASE.md" -Destination "$dest\2026-06-16_root_docs_pre_M\AUDIT_MENYELURUH_SEMUA_FASE.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_root_docs_pre_M\FLOW_AUDIT_LAPORAN.md" -Destination "$dest\2026-06-16_root_docs_pre_M\FLOW_AUDIT_LAPORAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-16_si_notes\_PLAN_SI_SEWA_RIWAYAT.md" -Destination "$dest\2026-06-16_si_notes\_PLAN_SI_SEWA_RIWAYAT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\AUDIT_POST_FIX.md" -Destination "$dest\2026-06-20_fase_selesai\AUDIT_POST_FIX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\FASE_E_EVALUASI_ARSITEKTUR.md" -Destination "$dest\2026-06-20_fase_selesai\FASE_E_EVALUASI_ARSITEKTUR.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\M14_FASE_I_NAVIGASI_ONBOARDING.md" -Destination "$dest\2026-06-20_fase_selesai\M14_FASE_I_NAVIGASI_ONBOARDING.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\M17_FASE_L_UIUX_AUDIT.md" -Destination "$dest\2026-06-20_fase_selesai\M17_FASE_L_UIUX_AUDIT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\audit-uiux-2026-06-20.md" -Destination "$dest\2026-06-20_fase_selesai\audit-uiux-2026-06-20.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\fase-l-specs\L01_L03_loading_error_mobile.md" -Destination "$dest\2026-06-20_fase_selesai\fase-l-specs\L01_L03_loading_error_mobile.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\fase-l-specs\L04_L07_wizard_balance_guest_auth.md" -Destination "$dest\2026-06-20_fase_selesai\fase-l-specs\L04_L07_wizard_balance_guest_auth.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\fase-l-specs\L08_L11_public_dashboard_tenant_reports.md" -Destination "$dest\2026-06-20_fase_selesai\fase-l-specs\L08_L11_public_dashboard_tenant_reports.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\fase-l-specs\L12_L15_enum_staff_stays_tenant.md" -Destination "$dest\2026-06-20_fase_selesai\fase-l-specs\L12_L15_enum_staff_stays_tenant.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\2026-06-20_fase_selesai\fase-l-specs\L16_L20_accounting_a11y_empty_asset_minor.md" -Destination "$dest\2026-06-20_fase_selesai\fase-l-specs\L16_L20_accounting_a11y_empty_asset_minor.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\AUDIT_CLINE_INVENTARIS.md" -Destination "$dest\AUDIT_CLINE_INVENTARIS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\AUDIT_CLINE_OPERASIONAL_STAF.md" -Destination "$dest\AUDIT_CLINE_OPERASIONAL_STAF.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\AUDIT_CLINE_PUBLIK_MARKETING.md" -Destination "$dest\AUDIT_CLINE_PUBLIK_MARKETING.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\PANDUAN_INPUT_TENANT.md" -Destination "$dest\PANDUAN_INPUT_TENANT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\PANDUAN_SHEET_TENANT.md" -Destination "$dest\PANDUAN_SHEET_TENANT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\PROMPT_AI_LEMAH_INTEGRASI_METER_TENANT.md" -Destination "$dest\PROMPT_AI_LEMAH_INTEGRASI_METER_TENANT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\PROMPT_EKSEKUTOR_OVERHAUL_ADMIN_UX.md" -Destination "$dest\_expired_root_cleanup\PROMPT_EKSEKUTOR_OVERHAUL_ADMIN_UX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\RENCANA_WIZARD_AUDIT_TENANT.md" -Destination "$dest\_expired_root_cleanup\RENCANA_WIZARD_AUDIT_TENANT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\RUNBOOK_ONBOARDING_TENANT_NYATA.md" -Destination "$dest\_expired_root_cleanup\RUNBOOK_ONBOARDING_TENANT_NYATA.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\RUNBOOK_OVERHAUL_ADMIN_UX.md" -Destination "$dest\_expired_root_cleanup\RUNBOOK_OVERHAUL_ADMIN_UX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_expired_root_cleanup\_PROMPT_FASE2_DASHBOARD_ADMIN.md" -Destination "$dest\_expired_root_cleanup\_PROMPT_FASE2_DASHBOARD_ADMIN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\01_FINANSIAL_PERHITUNGAN.md" -Destination "$dest\_previous_cycles\01_FINANSIAL_PERHITUNGAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\02_LOGIKA_BISNIS.md" -Destination "$dest\_previous_cycles\02_LOGIKA_BISNIS.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\03_LAPORAN_AKUNTANSI.md" -Destination "$dest\_previous_cycles\03_LAPORAN_AKUNTANSI.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\04_UI_UX.md" -Destination "$dest\_previous_cycles\04_UI_UX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\05_MODUL_OPERASIONAL.md" -Destination "$dest\_previous_cycles\05_MODUL_OPERASIONAL.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\06_MODUL_LAINNYA.md" -Destination "$dest\_previous_cycles\06_MODUL_LAINNYA.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\07_CODE_QUALITY.md" -Destination "$dest\_previous_cycles\07_CODE_QUALITY.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\08_REPORTING_DASHBOARD.md" -Destination "$dest\_previous_cycles\08_REPORTING_DASHBOARD.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M11_CHANGELOG_ARSIP_S1_2026.md" -Destination "$dest\_previous_cycles\M11_CHANGELOG_ARSIP_S1_2026.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\M15-M17_README.md" -Destination "$dest\_previous_cycles\M15-M17_README.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\_AUDIT_CROSS_PORTAL_2026-07-02.md" -Destination "$dest\_previous_cycles\_AUDIT_CROSS_PORTAL_2026-07-02.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\_SPEC_FASE_AJ_SISA_AUDIT.md" -Destination "$dest\_previous_cycles\_SPEC_FASE_AJ_SISA_AUDIT.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\_previous_cycles\_SPEC_FASE_X_UIUX.md" -Destination "$dest\_previous_cycles\_SPEC_FASE_X_UIUX.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_01_publik_landing.md" -Destination "$dest\audit_fable\CHECKLIST_01_publik_landing.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_02_publik_katalog_kamar.md" -Destination "$dest\audit_fable\CHECKLIST_02_publik_katalog_kamar.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_03_publik_booking.md" -Destination "$dest\audit_fable\CHECKLIST_03_publik_booking.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_04_auth.md" -Destination "$dest\audit_fable\CHECKLIST_04_auth.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_05_tenant_mystay.md" -Destination "$dest\audit_fable\CHECKLIST_05_tenant_mystay.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_06_tenant_invoice_bayar.md" -Destination "$dest\audit_fable\CHECKLIST_06_tenant_invoice_bayar.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_07_tenant_tiket.md" -Destination "$dest\audit_fable\CHECKLIST_07_tenant_tiket.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_08_tenant_info.md" -Destination "$dest\audit_fable\CHECKLIST_08_tenant_info.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_09_tenant_loyalty_renew_checkout.md" -Destination "$dest\audit_fable\CHECKLIST_09_tenant_loyalty_renew_checkout.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_10_admin_booking_stay.md" -Destination "$dest\audit_fable\CHECKLIST_10_admin_booking_stay.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_11_admin_renew_checkout_meter.md" -Destination "$dest\audit_fable\CHECKLIST_11_admin_renew_checkout_meter.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_12_keuangan_invoice_payment.md" -Destination "$dest\audit_fable\CHECKLIST_12_keuangan_invoice_payment.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_13_keuangan_akuntansi.md" -Destination "$dest\audit_fable\CHECKLIST_13_keuangan_akuntansi.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_14_ops_tiket_survey.md" -Destination "$dest\audit_fable\CHECKLIST_14_ops_tiket_survey.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_15_ops_staff_routines.md" -Destination "$dest\audit_fable\CHECKLIST_15_ops_staff_routines.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_16_ops_inventory_layanan.md" -Destination "$dest\audit_fable\CHECKLIST_16_ops_inventory_layanan.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_17_owner_dashboard_ai.md" -Destination "$dest\audit_fable\CHECKLIST_17_owner_dashboard_ai.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_18_admin_master_settings.md" -Destination "$dest\audit_fable\CHECKLIST_18_admin_master_settings.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\CHECKLIST_19_lintas_pwa_a11y.md" -Destination "$dest\audit_fable\CHECKLIST_19_lintas_pwa_a11y.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_fable\RINGKASAN_TEMUAN.md" -Destination "$dest\audit_fable\RINGKASAN_TEMUAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\00_index.md" -Destination "$dest\audit_reasonix\00_index.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\09_EFISIENSI_TOKEN.md" -Destination "$dest\audit_reasonix\09_EFISIENSI_TOKEN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\10_EFISIENSI_LANJUTAN.md" -Destination "$dest\audit_reasonix\10_EFISIENSI_LANJUTAN.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\11_DEAD_CODE.md" -Destination "$dest\audit_reasonix\11_DEAD_CODE.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\M29_AUDIT_EXTERNAL_REVIEW.md" -Destination "$dest\audit_reasonix\M29_AUDIT_EXTERNAL_REVIEW.md" -Force
Move-Item -LiteralPath "$repo\docs\archieve\audit_reasonix\SPEC_PERBAIKAN_KRITIS.md" -Destination "$dest\audit_reasonix\SPEC_PERBAIKAN_KRITIS.md" -Force
```

Setelah kedua blok dijalankan, folder `docs/archieve/` akan kosong dan bisa dihapus; baris `docs/archieve/`
di `.git/info/exclude` menjadi tidak relevan.

## 7. Batas recon ini

- Yang diperiksa hanya **kemunculan nama/path di dokumen aktif**. Tautan **di dalam** berkas arsip (arsip menautkan arsip) tidak dihitung, dan rujukan dari luar repo (bookmark, ingatan) tidak bisa diperiksa.
- Kelas B belum dipastikan benar: nama pendek seperti `CHECKLIST` atau `TODO` bisa cocok karena kebetulan. **Tinjauan manusia tetap diperlukan** sebelum memindahkan kelas B.
- Jumlah byte di tabel = ukuran berkas saat recon, bukan ukuran setelah konversi apa pun.
- Recon ini **tidak** menjalankan pemindahan, tidak mengubah tautan, dan tidak menyentuh `.git/info/exclude`.

## 8. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat oleh recon B2 pada HEAD `f8fbff7d`. Kelas A 35 · B 5 · C 66. Belum ada pemindahan. |
