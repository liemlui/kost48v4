# KOST48 V5 — M13 Changelog

> Arsip changelog ringkas, dipisah dari M12 pada 2026-06-19 untuk hemat token AI (M12 = checklist aktif saja). **Entri changelog BARU ditulis DI SINI (paling atas)**, bukan di M12. Format: 1 header tanggal + 1-2 poin outcome per entri.
> Entri lama (≤ 2026-07-16) diarsip ke docs/archieve/M13_CHANGELOG_ARSIP_S1_2026.md.

## 2026-07-16 — KTP Portal dan UI Owner/Admin Bertahap

- Tenant dapat upload/ganti KTP sendiri dengan guard kepemilikan; Admin mendapat antrean KTP pending dan detail review terpadu.
- Standar UI dibukukan: **ringkas saat dilihat, lengkap saat dibuka**. Toggle Owner/Admin mengganti konteks, bukan kewenangan OWNER. Gate TypeScript backend/frontend lulus.

### 10 Jul 2026 (entri terbaru)
- **Crawl E2E UI/UX Admin+Owner (Playwright) — 66 halaman LULUS bersih** — suite baru `frontend/e2e/admin-owner-crawl.spec.ts`: login nyata via UI terhadap **server combined paket deploy** (production-like, port 3100, DB UAT ter-seed 13 kamar), kunjungi OWNER 35 route + ADMIN 31 route; deteksi pageerror / console.error / HTTP≥500 / 4xx API / request gagal / halaman blank + screenshot per halaman (`frontend/e2e-out/`). Hasil akhir: **OWNER 35/35 & ADMIN 31/31 render OK, 0 temuan** setelah 1 fix: ADMIN membuka /settings memicu 403 `GET /owner-ai/usage` (endpoint memang OWNER-only, G7) → `OwnerSettingsPage` AiSettingsPanel kini fetch usage hanya bila OWNER + tampil catatan "hanya OWNER" untuk ADMIN. Catatan infra: vite dev tak punya proxy `/api` (e2e memakai `E2E_BASE` → combined 3100); suite a11y `axe-auth.spec.ts` yang tercatat di M12 ikut terhapus di `e505894`.

### 10 Jul 2026 — awal hari
- **KRITIS pre-live: paket deploy GAGAL BOOT — `@nestjs/swagger` hilang** — ketahuan lewat "cek total sebelum live": simulasi cPanel lokal (`cpanel:install` prod-only + start `dist/main.js`) → MODULE_NOT_FOUND `@nestjs/swagger` (tercatat devDependency padahal di-require runtime oleh controller terkompilasi) → app pasti mati saat start di server. Fix `backend/package.json`: swagger pindah ke dependencies; `express` & `multer` (di-require langsung, sebelumnya cuma transitif) jadi dependency eksplisit (multer disamakan overrides `2.2.0`); paket deploy diregenerasi. **Boot test LULUS:** SPA `/` 200 · `/api` 404-JSON filter · guard 401 · `/api/public/rooms` 200 = query DB nyata (Prisma WASM + pg vs UAT 5433) · guard JWT_SECRET produksi terbukti menolak secret lemah.
- **Temuan cek total: suite test besar sudah TIDAK ADA** — commit `e505894` (bersih-bersih repo) menghapus seluruh `test/integration` (187 test) + mayoritas unit; angka "≈1370 test PASS" yang berulang di M12 = basi. Kondisi nyata kini: BE unit **26/26 PASS**, FE vitest **121/121 PASS** (1 error teardown environment ocrPreprocess, exit 0). Suite lama recoverable dari git history bila mau dipulihkan.

### 8 Jul 2026
- **Audit inventaris & kebijakan aset (kuis owner)** — keputusan final: cut-off 31 Jul 2026; kapitalisasi = barang tahan lama ≥ Rp100rb (revisi dari Rp500rb — kipas/lemari plastik masuk aset, bohlam/sprei = beban); umur default pajak (elektronik 48 bln · furniture 48-96 · utilitas 96 · bangunan 240); tanah+bangunan masuk buku via NJOP + SALDO AWAL (bangunan dinilai kondisi kini, susut fresh — renovasi 2011-kini tidak dirunut); **F3/F4 FINAL TIDAK ADA** (blok F = F1+F2, 13 kamar); rekening campur dipilah per cut-off; tanpa hutang. Paket form lapangan `docs/filePrint/05-07` (checklist master terisi + form cetak berwarna + form INTERAKTIF per kamar: tap kondisi/autosave/ringkasan otomatis/CSV). Kode disinkronkan: warning kapitalisasi owner-ai (helpers+service+prompt) & insight expense besar `accounting-reports` → ambang Rp100rb (tanpa dampak jurnal/TB). Docs sinkron: M02/M04/M09/M11/M12/RUNBOOK audit+onboarding. `tsc` BE ✅.
- **KRITIS go-live: gate KTP diam-diam OFF di produksi (GATE-KTP-ENV)** — pembaca gate (`stays.service.ts`, `tenant-bookings.service.ts`) memakai nilai DB `ktpVerificationGateEnabled` begitu row `OperationalSetting` ada (kolom non-nullable → fallback `?? env` tak pernah jatuh), sedangkan row terbentuk otomatis default `false` pada akses pertama — env `KTP_ACTIVATION_GATE_ENABLED=true` yang diwajibkan runbook deploy jadi konfigurasi mati. Fix: `settings.service.ts getOperational()` semai nilai awal row dari env; docs deploy (PANDUAN §5 + `.env.example` make-deploy) ditambah catatan "env = nilai awal, selanjutnya UI Settings → Operasional" + langkah verifikasi gate. `tsc` BE ✅.
- **AU-01..AU-03 selesai (fix UX Admin/Owner)** — `SimpleCrudPage.tsx` delete kini confirm dialog + `onError` toast (sebelumnya langsung eksekusi & gagal bisu — dampak expenses/invoice-payments/wifi-sales/additional-services); `StaysPage.tsx` 4 mutation booking/checkout dapat `onError` toast + confirm di "Jalankan Kedaluwarsa"; `OwnerSettingsPage.tsx` "Hapus key" DeepSeek pakai confirm. Re-verifikasi 7/7 sampel klaim audit lama masih valid (tanpa regresi). `tsc` FE ✅.
- **Runbook onboarding 13 tenant nyata** — `docs/RUNBOOK_ONBOARDING_TENANT_NYATA.md`: urutan tenant→upload KTP→verifikasi→stay walk-in, `checkInDate` = tanggal siklus terakhir bulan berjalan (keputusan owner: tahun berjalan), jebakan due-date invoice 24 jam (`calculateDueDate` = now+24h — lunasi hari itu juga SEBELUM buka akses portal), prasyarat NIK Dini/Theo + kamar Annisa + catat meter listrik 13 kamar, catatan akuntansi deposit lama.
- **Docs cleanup level `docs/`** — file kerja sementara `AI_WEAK_FIXLIST_KTP_G5_REVIEW.md`, `AI_AUDIT_ORPHANED_ENDPOINTS_ADMIN_OWNER.md`, dan `M18_CELAH_PENINGKATAN.md` diserap ke M-file utama (`M12`/`M13`) lalu dibersihkan dari root `docs/`. Audit kedalaman UI/UX Admin/Owner juga dipadatkan jadi antrian aktif `AU-01..AU-03` di `M12`.
- **Docs hygiene root repo** — panduan sesi dari `CLAUDE.md` dipindah ke dossier utama (`M01` pintu masuk docs + `M12` efisiensi sesi/konvensi versi), lalu file root dibersihkan agar repo tidak punya dokumen kerja liar di luar folder `docs/`.
- **G5+ gap kritis: UI upload foto KTP tidak pernah ada** — ditemukan saat persiapan onboarding tenant nyata (audit manual, bukan Fable5): backend `POST /tenants/:id/ktp/upload` sudah lengkap sejak F3-17, tapi TIDAK ADA UI manapun yang memanggilnya (semua komponen KTP cuma OCR lokal, tidak pernah kirim file foto) — akibatnya `verifyKtp()` SELALU gagal 409 "Tenant belum mengunggah foto KTP", jadi dengan `KTP_ACTIVATION_GATE_ENABLED=true` tidak ada tenant yang bisa diaktifkan. Fix: `KtpOcrValidateCard.tsx` sekarang fetch state tenant sendiri (`GET /tenants/:id`, sebelumnya caller tak pernah kirim prop verifikasi), tambah tombol "Simpan Foto KTP ke Berkas Tenant" yang benar-benar upload file asli, badge status foto, dan tombol Verifikasi Manual di-disable sebelum foto tersimpan. File baru: `getTenant`/`uploadTenantKtpImage` di `frontend/src/api/tenants.ts`, field KTP ditambah ke tipe `Tenant` (`frontend/src/types/core.ts`). Verifikasi: `tsc --noEmit` FE ✅. Menyusul: audit sistematis orphaned-endpoint Admin/Owner+Inventory (`docs/AI_AUDIT_ORPHANED_ENDPOINTS_ADMIN_OWNER.md`, sedang berjalan).
- **G5+ Fixlist KTP + review Fable5 (xhigh, 2 putaran)** — 3 fix spec tuntas: migration `20260708000000_add_ktp_verification_metadata` (schema disinkron `@db.VarChar(50)`), rate-limit AI hanya terpotong saat DeepSeek benar dipanggil, method `AI` di `verifyKtp` kini wajib bukti sukses AI via `KtpAiApprovalService` baru (TTL 30 mnt, sekali pakai — jalur sukses AI tak lagi 400). Hardening cache AI: prune+cap 200 entry, `structuredClone` anti-mutasi (mask NIK aman di cache-hit), cache key pakai model request (bukan echo server), dedup in-flight (double-click tak lagi 2x panggilan berbayar). Fix `stableHash()` — replacer array lama membuang key nested secara rekursif (canonicalize + sort tiap level). Fix cold-start: `maxTokens`/`dailyRemaining` tak lagi pakai default hardcoded sebelum config DB pernah ke-await. File: `backend/src/modules/tenants/*`, `backend/src/modules/owner-ai/*`, `backend/prisma/*`. Verifikasi: `tsc --noEmit` ✅, unit test 26/26 PASS, FE build ✅, backend boot DI sukses.

### 10 Jul 2026
- **M18-P3-02** — Error boundary per fitur kritis: `FeatureErrorBoundary.tsx` + wrap 3 halaman (TicketsPage, OwnerSettingsPage, MyStayPage). File: `frontend/src/components/common/FeatureErrorBoundary.tsx`.
- **M18-P3-01** — Logging di silent catches: 7 lokasi (auth, payment-submissions, auto-ops, AuthContext). File: 4 file backend + 1 file frontend.
- **M18-P2-05** — Unit test `preprocessImage()` FE. File: `frontend/src/test/utils/ocrPreprocess.test.ts`.
- **M18-P2-04** — Unit test `parseNikDemographics()` BE (6 suite, 19 test). File: `backend/test/unit/ocr-helpers.test.js`.
- **M18-P2-03** — Unit test `parseKtpText()` FE (7 test). File: `frontend/src/test/utils/ktpOcr.test.ts`.
- **M18-P2-02** — DTO validasi `PATCH /tenants/:id/ktp-data` — `SaveKtpDataDto` dengan class-validator. File: `backend/src/modules/tenants/dto/save-ktp-data.dto.ts`.
- **M18-P2-01** — Fix silent error `handleSaveKtpData` FE: toast feedback + console.error. File: `frontend/src/components/ai/KtpOcrValidateCard.tsx`.
- **M18-P1-03** — `saveKtpData` jangan overwrite field existing: tambah `!tenant.X` guard di tiap field. File: `backend/src/modules/tenants/tenants.service.ts`.
- **M18-P1-02** — Unique constraint `identityNumber` + tangkap error P2002 di `saveKtpData`. File: `backend/src/modules/tenants/tenants.service.ts`.
- **M18-P1-01** — Mask NIK di UI KTP OCR: tambah fungsi `maskNik()` frontend + panggil di render NIK. File: `frontend/src/components/ai/KtpOcrValidateCard.tsx`.
- **M18-P0-01** — Fix race condition refresh token rotation: bungkus delete+create dalam `prisma.$transaction` dengan single-use enforcement (`findUnique` di dalam transaksi). File: `backend/src/auth/auth.service.ts`.
- **M18** — Dokumen celah peningkatan dari review Reasonix (11 task, sisanya P1-P3). File: `docs/M18_CELAH_PENINGKATAN.md`.

### 9 Jul 2026 (malam)
- **G5+** — Perkuat OCR Verifikasi KTP + fallback manual + bank data tenant:
  - **Algoritma OCR bertingkat** (`owner-ai.helpers.ts`): `cleanOcrText()` normalisasi whitespace + koreksi O→0/l→1 + gabung baris pecah; `extractNameFromOcr/Address/BirthPlace/Province` multi-strategi; `isDeterministicResultSolid` skip AI bila NIK+nama sudah cocok (hemat token).
  - **Pipeline validasi** (`owner-ai.service.ts`): pre-clean → deterministik solid (skip AI) → DeepSeek → fallback enriched. `ktpFallback()` sekarang membawa data enriched (nama/alamat/TTL/provinsi deterministik).
  - **Verifikasi manual** (`tenants.service.ts`): `verifyKtp()` diperluas terima `method` (AI/AI_FAILED_MANUAL/MANUAL) + `notes`; ADMIN bisa verifikasi (sebelumnya OWNER-only).
  - **Bank data KTP** (`tenants.service.ts`): `enrichTenantFromKtp()` auto-isi field kosong dari data OCR; `saveKtpData()` simpan hasil ekstraksi ke tenant; `getDemographicsSummary()` ringkasan demografi untuk marketing (OWNER-only).
  - **Schema** (`schema.prisma`): field `ktpVerificationMethod` + `ktpVerificationNotes` di model Tenant (additive, 🧬).
  - **Endpoint baru** (`tenants.controller.ts`): `PATCH :id/ktp-data`, `GET demographics/summary`.
  - **UI verifikasi manual** (`KtpOcrValidateCard.tsx`): tombol "Verifikasi Manual" dengan modal (pilih metode + catatan); tombol "Simpan Data KTP ke Profil"; badge status "Terverifikasi ✅" / "Belum ⚠️"; auto-detect metode verifikasi dari hasil AI.
  - **API frontend** (`tenants.ts`): `verifyTenantKtp()`, `saveTenantKtpData()`, `getDemographicsSummary()`.
  - Build: backend tsc ✅, frontend 136 chunks ✅.

### 9 Jul 2026
- **M17** — Implementasi audit P3-P8: 🔴 P3-01 refresh token (🧬 model RefreshToken + endpoint `/auth/refresh` + httpOnly cookie + FE auto-refresh interceptor); 🟠 P7-01 BookingCtaButton shared component; 🟠 P8-01 FK index verified (215 `@@index`); 🔵 P8-03 chart empty state guard. Semua LOW (P3-02/P8-02/P8-04/P8-05) didokumentasikan/diverifikasi selesai. File: `backend/prisma/schema.prisma`, `backend/src/auth/*`, `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/components/rooms/BookingCtaButton.tsx`, `frontend/src/components/charts/SmartChartPanel.tsx`, `frontend/src/components/charts/HorizontalBarChart.tsx`, `docs/M17_AUDIT_360_P3_P8.md`.

### 8 Jul 2026
- **M16** — Perbaikan temuan Audit 360° Flow Huni: P2-01 LeadSource PORTAL (🧬 schema + kode), P2-02 guard checkout ≤ plannedCheckOutDate, P2-04 FOR UPDATE lock Stay di approveRequest. 3 temuan lain diverifikasi valid (P2-03/05/06/07). File: `backend/src/modules/checkout-requests/checkout-requests.service.ts`, `backend/prisma/schema.prisma`, `backend/src/common/enums/app.enums.ts`, `backend/src/modules/tenant-bookings/tenant-bookings.service.ts`, `frontend/src/pages/stays/check-in-wizard/{constants,checkInWizardUtils}.tsx`, `docs/M16_AUDIT_360_FLOW_HUNI.md`.
- **M15** — Unifikasi basis revenue dashboard owner: KPI `totalRevenue` + tren jadi **KAS murni** (`InvoicePayment.paymentDate` + `WifiSale.saleDate`), bukan campur akrual (Invoice.periodStart) + kas. `netProfit` tetap akrual (invoice-based) untuk membedakan dari `netCashFlow`. File: `backend/src/modules/finance/finance.service.ts` (2 blok: KPI section ~20 line + trend loop ~10 line).

### 6 Jul 2026
- **M14 SELESAI (16/16 100%)** — Redundansi UI/UX + audit: AM-01 unifikasi 12 WA URL builder → 1 `utils/whatsapp.ts`, AM-02 hapus RoleWorkspaceTabs dari AppLayout, AM-05 tambah Pengumuman ke sidebar admin (navigation.ts), AM-07 fix RoomComparePanel spec detection (regex→shared utility). AM-13 riset CSS Modules (Vite native support, 1/200+ file). AM-14 buat `useGenericForm` hook. AM-15 setup Storybook (3 story pilot: StatusBadge, EmptyState, StatCard). AM-16 setup Playwright E2E (3 smoke test: public + login). AM-10 dokumentasi lengkap. Build FE ✅
- **AM-01** — Unifikasi WhatsApp URL builder: `utils/whatsapp.ts` (buildAdminWaUrl, buildRoomWaUrl, buildAvailabilityWaUrl) gantikan 6 fungsi duplikat + 6 raw wa.me/ inline di 13 file.
- **AM-02** — Hapus RoleWorkspaceTabs dari AppLayout (render + import). AM-04 N/A (sudah dihapus total).
- **AM-05** — Tambah "Pengumuman" (📣) ke sidebar admin antara Perawatan AC dan Loyalitas & Reward.
- **AM-07** — Fix RoomComparePanel spec detection: hapus 4 fungsi regex (getBathroomLabel/getCoolingLabel/getSizeLabel/allRoomText/normalizeText), ganti dengan getPublicRoomBathroomLabel/getPublicRoomCoolingLabel dari utility shared.
  Build FE ✅

### 4 Jul 2026
- **audit(M14):** Audit UI/UX komprehensif — validasi 8 kategori (struktur, design system, routing, data fetching, styling, error states, form, aksesibilitas). Hasil: 7/8 KUAT (⭐5), 1/8 CUKUP (⭐4). 23 shared components verified, 13 ARIA pattern, 100% React Query, 16-file CSS cascade. 4 task baru dibuat dari temuan: AM-13 (CSS Modules bertahap), AM-14 (useForm wrapper shared), AM-15 (Storybook), AM-16 (E2E smoke test). Total Fase AM: 16 task (7 selesai, 9 tersisa).

### 6 Jul 2026
- **AM-06** — RoomCard pakai FacilityList (ganti amenity inline `<span>`→`<FacilityList compact maxItems={3} />`).
- **AM-08** — Buat RoomPriceTable komponen reusable, dipakai di RoomCard (ganti `<table>` inline).
- **AM-09** — Buat RoomSpecChips komponen reusable, dipakai di RoomCard (ganti `<div> 4 spec` inline).
- **AM-10** — Dokumentasi: centang checklist M14, update M12 antrian, entri changelog.
- **AM-11** — Hapus tombol "Buka laporan" duplikat di OwnerDashboardPage (sidebar sudah ada).
- **AM-12** — Hapus tombol "Lengkapi setup akuntansi" duplikat di FinancialRatiosPage (sidebar sudah ada).
  Build FE ✅

### 4 Jul 2026
- **DEPLOY-512MB** — Paket deploy cPanel jadi PREBUILT penuh (RAM host 512MB): `make-deploy` kini build backend di lokal (dist/ + Prisma client WASM ikut paket, binary `*.node` dibuang, tanpa `src/`), script baru `cpanel:install` (= `npm ci --omit=dev`, gantikan `cpanel:setup` build-di-server), `cpanel:migrate` pakai `--skip-generate`, `seed-owner.js` resolve client dari dist/. Paket = 686 file / 19,5 MB tgz. Runbook M08 §D diperbarui (NODE_OPTIONS=192, bootstrap addendum sudah konsolidasi). Verifikasi: boot produksi TANPA `.node` → `GET /api/public/rooms` 200 ✅
### 4 Jul 2026
- **E11** — Inline style batch 2 selesai: report turun ke 6 file `style={{` >5 (di bawah batas 8) lewat utilitas CSS di `frontend/src/styles/06-tenant.css` dan rapikan beberapa halaman publik/laporan. Build frontend ✅
### 4 Jul 2026
- **E12** — Laporan dead-code: ts-prune FE 414 + BE 873 item. Report-only → `docs/archieve/audit_reasonix/11_DEAD_CODE.md`. 0 kode berubah.
- **E13** — Diet dokumen: rangkas 00_index (230→137) + arsip M11 (1508→206) + arsip 01-08 ke arsip. F6 = 6/8 (75%)
- **F6 E9** � Header tujuan 1 baris (`// FILE: x � tujuan`) di 69 file >400 baris backend+frontend. Script ukur `[E9] = 0`. tsc BE ? build FE ?

### 2026-07-04 — E8 pecah shared types FE selesai
- E8: `frontend/src/types/index.ts` dijadikan barrel export, isi shared types dipindah ke `frontend/src/types/core.ts`
- Gate PASS: `cd frontend && npm run build`

### 2026-07-04 — E7 unifikasi format tanggal FE selesai
- E7: semua `toLocaleDateString/TimeString` FE target Fase 6 sudah diganti ke `formatDateOnly` / `formatDateTimeWib` atau `Intl.DateTimeFormat` yang disengaja
- Gate PASS: `node scripts/token-efficiency-report.mjs` → `[E7] File FE toLocaleDateString/TimeString: 0` dan `cd frontend && npm run build` PASS

### 2026-07-04 — Fase 4 tuntas 35/35 100% — M31 DeepSeek verified
- M31: DeepSeek test-connection via `.env` API key ✅ PASS (model deepseek-v4-flash, 1.2s, 18 token)
- Fase 4 = 35/35 100% (M26/M27 SKIP, M31 fix)
- Progres global: Fase 1-5 semua 100%, Fase 6 = 1/8 (12%)

### 2026-07-04 — OC-07 Staff dashboard halaman khusus
- OC-07 (L22): Backend module `StaffDashboard` (`GET /staff/dashboard/aggregate`) — endpoint aggregate untuk data staff (rooms, tickets, inventory, routineSummary, meterPending). Frontend: API client `staffDashboard.ts`, DashboardStaff.tsx kini pakai 1 query aggregate (tambah dari 5 query terpisah). Build backend ✅ frontend ✅
- 00_index.md: L22 dicentang [x], tabel OC L22 → ✅ SELESAI

### 2026-07-04 — OC-05 ExternalReview CRUD audit
- OC-05 (M29): Audit modul ExternalReview — model Prisma standalone, hanya read-only via social proof publik, tanpa CRUD endpoint/admin UI. Temuan: 1 critical (no admin CRUD), 1 high (no admin UI), 2 medium, 2 low. Laporan: `docs/archieve/audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md`

### 2026-07-04 — OC-04 GuestPreferenceSurvey admin page
- OC-04 (M28): Backend module `guest-preferences` (`GET /guest-preferences` + `/guest-preferences/stats`) + FE `GuestPreferencesPage` — stat panel, preferensi breakdown, tabel paginated. Build backend ✅ frontend ✅

### 2026-07-04 — E6 token-efficiency-report script selesai
- E6: `scripts/token-efficiency-report.mjs` ditambahkan + `npm run token-efficiency-report` di root `package.json`
- Gate awal PASS: backend 337 file / 44.843 baris, frontend 386 file / 64.319 baris, baseline Fase 6 terbaca normal

### 2026-07-04 — Plan Fase 6 Efisiensi Token Lanjutan (audit-reasonix)
- Baru: `docs/archieve/audit_reasonix/10_EFISIENSI_LANJUTAN.md` — spec 8 task E6-E13 untuk AI lemah (script pengukur, unifikasi tanggal FE, split types/index.ts, header file, `as any` backend, inline style batch 2, dead-code report-only, diet dokumen) + checklist FASE 6 di `00_INDEX.md` (baseline diukur ulang: 40 file tanggal mentah, 672 `as any` BE, 69 file >400 baris tanpa header, M11 1.468 baris)

### 2026-07-04 — OC-01 AncillaryRevenue API+FE + sinkronisasi dokumentasi + keputusan owner
- OC-01: Backend module `AncillaryRevenue` (`GET /ancillary-revenue/streams`) + FE `AncillaryRevenuePage` dinamis (dari statis)
- M02_KEPUTUSAN_OWNER.md: 7 keputusan baru (OC-01 s/d OC-07) untuk item 🧑
- 00_index.md: Fase 4=32/35 (91%), Fase 5=25/26 (96%) — M24/L19 fixed, M26/M27 skip, M31 tunda
- BE tsc ✅ · FE build ✅

### 2026-07-04 — L1 @ApiOperation + sinkronisasi dokumentasi
- L1: @ApiOperation ditambahkan ke ~55 controller backend (>200 endpoint) — summary/docs API lengkap
- tsc --noEmit: ✅ LULUS 0 error
- 00_index.md: L1 dicentang [x], progress Fase 5=22/26 (85%)
- RINGKASAN_EKSEKUTIF.md: H14 status fixed, tabel M/L selaras 00_index

### 2026-07-04 — Dokumentasi: 00_index.md jadi kanonik + antrian sesi berikutnya
- 00_index.md: tanggal diperbaiki (7→4 Jul), struktur dokumen rapi, tambah "Antrian Sesi Berikutnya"
- Semua progress: Fase 4=83%, Fase 5=81%
- RINGKASAN_EKSEKUTIF.md: tanggal diperbaiki
- ⚠️ RINGKASAN masih perlu sinkronisasi penomoran dgn 00_index (dijadwalkan sesi depan)

### 2026-07-04 — Fase 4: 13 temuan menengah (83% tuntas)
- M4: Survey summary dibatasi 200 rows (pagination)
- M8: deepseek.client.ts — semua throw new Error → HTTP exceptions (503/400/502/504)
- M10: accounting-readiness — dynamic model access dengan return type any + eslint-disable
- M14/M15/M16: finance.service.ts — komentar klarifikasi score≠signal, WiFi accrual vs cash, deposit liability
- M30: MarketAnalysis — findAll filter 90 hari (cutoff createdAt)
- M17/M19/M21/M23/M25/M32-M35: via Fase 5 overlap

### 2026-07-07 — L7: isNaN guard `new Date()` di 13 file FE
- 13 file frontend: InvoicesPage · StayDetailPage · FinanceTab · NotificationsPage · AdminSurveysPage · NotificationBell · StaffMeterStatusPanel · MeterReadingsPage · MyStayPage — semua isNaN(Date) guard ditambahkan di date display/sort/overdue check
- Build FE: ✅ lulus (tsc + vite + PWA stamp)

### 2026-07-07 — Fase 5 Audit Reasonix: 16 temuan rendah (77% selesai)
- Seed scripts: `addMonths` overflow guard, `ymd()` WIB fix, dynamic year, `require(dist)` graceful error
- FE: SkeletonLoader key, MyInvoicesPage countdown PAID guard, console.warn DEV guard (4 file)
- BE: AC_CLEANING CLOSED dedup guard, Renew enum comment sinkronisasi
- Dokumentasi: L15/L16/L20/L21/L23 diverifikasi "by design / already fixed"

**2026-07-07 — Fase 2+3 TUNTAS 100% ✅ + Fase 4 partial (7/35)**
- C1-C6 ✅ Semua 6 bug kritis: DISCOUNT journal (4010 contra-revenue), overdue net, renewal cross-term, collection rate period, journal retry, DTO number. `accounting-posting-helpers.ts`, `reports.service.ts`, `renew-requests.service.ts`, `finance.service.ts`, `payment-submissions.service.ts`, `stay.dto.ts`.
- H1-H15 ✅ Semua 15 temuan tinggi (H3/H6/H7 final): sweeper auto-reject PENDING_REVIEW, balance sheet currentProfit guard, cashflow cashBeginning koreksi otomatis. `booking-sweep.service.ts`, `accounting-reports.service.ts`.
- M2/M3/M6/M7/M11/M12/M20 ✅ Fase 4 partial: N+1 staff-assignment & maintenance-sweep, pagination renew, reviewNotes optional, push NaN guard, reminder stack trace, SimpleCrudPage skeleton. 8 file.
- Verifikasi: tsc backend ✅ · build FE ✅.

**2026-07-04 — Fase 3 Temuan Tinggi TUNTAS ✅ (kecuali H3/H6/H7 untuk model pro)**
- H1 ✅ `updateLine()` — conditional spread agar undefined tidak meng-null-kan field DB. `invoices.service.ts`.
- H2 ✅ `CreatePortalTicketDto` — tambah validasi `@IsIn(PORTAL_TICKET_CATEGORIES)`. `ticket.dto.ts` + `app.enums.ts`.
- H4 ✅ DP forfeit — hanya invoice SEWA (RENT) yang PAID memblokir forfeit. `booking-sweep.service.ts`.
- H5 ✅ Checkout `complete()` — tambah FOR UPDATE row lock cegah race condition. `stays.service.ts`.
- H8 ✅ `decideByTenant()` TIDAK — bungkus dalam `$transaction`. `renew-requests.service.ts`.
- H9 ✅ `approveRequest()` — pindahkan status check ke dalam transaksi + FOR UPDATE. `checkout-requests.service.ts`.
- H10 ✅ `businessHealth()` — tambah WiFi revenue query + `totalRevenueRupiah` di metrics. `finance.service.ts`.
- H11 ✅ Seed `ymd()` — ganti `toISOString()` (UTC) → `toLocaleDateString('en-CA')` (WIB). 2 seed files.
- H12 ✅ Duplicate invoice guard — cek `stayId + periodStart + periodEnd` sebelum create. `invoices.service.ts`.
- H13 ✅ C19-01 — tenant component ganti `fetchOperationalSettings` → `fetchPublicConfig`. `UtilityInsightCard.tsx` + `MeterCycleModal.tsx`.
- H14 ✅ C19-02 — tambah breakpoint 480px untuk admin dashboard. `08-admin.css`.
- H15 🧑 Z-19 owner dashboard — task verifikasi manual (kode sudah ada).

<!-- duplikat Fase 2 dihapus 2026-07-07 -->

**2026-07-07 — Fase 1 Audit Reasonix TUNTAS ✅ (E2+E4+E5 lanjutan)**
- E2 ✅ Unifikasi `toLocaleString` → `formatRupiah`: 7 file FE (CacClvDashboard, InvoicePrintLayout, AssetRegisterPage, ExpenseReceiptUpload, RichAvailabilityCalendar, publicGuestShared, StepReviewConfirm). Local helper diganti import `formatRupiah`/`formatRupiahWithoutSymbol` dari `formatCurrency.ts`. Build FE ✅
- E4 ✅ `any`→typed `accounting-reports.service.ts`: 32× `(this.prisma as any)` dihapus. Build backend tsc ✅
- E5a ✅ Split `create()` stays.service.ts: extract `resolvePortalUserForCheckIn` private method (591→543 baris). Build backend ✅
- E5b ✅ Split `createBooking()` tenant-bookings.service.ts: extract `validateBookingPreconditions` private method (193→151 baris). Build backend ✅
- **Fase 1 100% selesai.** Skor efisiensi token naik dari 35 → estimasi 55-60.

**2026-07-07 — E3+E4+E5 Fase 1 Audit Reasonix**
- E3 ✅ Inline→CSS class: 3 laporan + FAQ + AdminSurveys + KanbanBoard + ProfilePage + CSS utilities 14 class. Perbaiki 12 broken imports E2 + 2 async section marker bug. Build FE ✅
- E4 ✅ `any`→typed: `accounting-posting` (6 `as any` dibuang), `period-close` (3 `as any` dibuang). Build backend ✅
- E5 ✅ Split `createSubmission` (195→80 baris, 2 helper). Progress: 60% Fase 1.

### 2026-07-07 — Audit Reasonix Code ✅ 82 temuan + 2 refactor kecil

- **Refactor:** unifikasi `dateOnly()` — 5 implementasi di module akuntansi kini pakai 1 shared utility `backend/src/common/utils/date-only.ts`. `@ApiProperty` ditambahkan ke 17 DTO (invoice, stays, room-transfer). Build backend tsc ✅.
- **Audit:** 82 temuan baru (6 kritis, 15 tinggi, 35 menengah, 26 rendah) — bug finansial, logika bisnis, laporan, UI/UX, code quality. Semua di `docs/archieve/audit_reasonix/` (10 file). 4 keputusan owner baru di M02.
- **MD update:** M02 + M12 + M13 + audit/00_INDEX + audit/RINGKASAN + supersede Hermes + M00_CODEMAP.

### 2026-07-04 — Fase AJ selesai ✅ anti-loop live + re-seed dev + audit follow-up C19

- **AJ-02/AJ-04 lulus live:** `/portal/stay` tenant tanpa stay settle 2 request/30 dtk + empty-state, `/portal/bookings` 2, `/portal/invoices` 2, backend 200; `aj02-no-loop.spec.ts` PASS. DB dev 5433 di-reset+seed ulang: 13/13 kamar OCCUPIED, Bayu/I & Sari/F2 invoice pertama PAID dan invoice kedua ISSUED, Trial Balance balanced Rp47.490.000 = Rp47.490.000. Seed meter juga bersih (2 bertagihan, 3 gratis); setelah integration suite, DB di-reseed ulang dan diverifikasi lagi.
- **Kode/docs:** guard meter date-only diperbaiki agar catat meter pada tanggal check-in tidak ditolak oleh jam `initialMetersPromotedAt`; spec AJ diberi errata D-02 no-partial (Sari tidak dibuat bayar sebagian invoice-only/manual). FE build ✅ (PWA verified), BE `tsc --noEmit` ✅, `node --check seed-dev-via-api.js` ✅, backend unit 1072/1073 PASS (1 skip intentional) ✅, backend integration PASS ✅, frontend vitest 111/111 PASS ✅.
- **AJ-07 safe follow-up:** responsive tenant/admin 375/768 diuji. Temuan baru audit-only dicatat: C19-01 tenant `/portal/stay` request `/settings/operational` 403 console; C19-02 admin `/dashboard` overflow 375px (`scrollWidth=434`). Sisa destructive/human flow (DP→check-in, checkout/renew/WiFi full flow) tidak dimutasi agar baseline seed stabil.

### 2026-07-04 — Tindak lanjut verifikasi AA-AI ✅ cache schema-check self-healing + PII hygiene kalender + tutup AE-02

- **`booking-schema.helper.ts`:** cache modul-level baru — hasil READY di-cache permanen; BELUM SIAP / query gagal dicek ulang paling cepat tiap 30 detik (self-healing tanpa restart). Sebelumnya wrapper `{ current }` dibuat baru tiap panggilan sehingga cache tidak pernah persist, dan satu kegagalan bisa di-cache permanen. Duplikat `isBookingSchemaReady` **tanpa try-catch** di `tenant-bookings.queries.ts` dihapus; `TenantBookingsQueryService` delegasi ke helper bersama (menutup vektor 503 yang terlewat AI-01a). Callers (tenant-bookings, public-bookings, marketing) disederhanakan.
- **`marketing-public-rooms.service.ts`:** komputasi mati nama tenant di availability-calendar dihapus + `tenant.fullName` tidak lagi di-SELECT dari DB (defense-in-depth C01-02).
- **Test basi TC-MP10 diperbaiki:** assert `currentTenantName === null` sesuai C01-02 (test dibuat 2 Jul sebelum fix PII 3 Jul → gagal senyap sejak commit `e20f461`). Unit backend **1072/1073 PASS, 0 fail** (1 skip intentional) · `tsc --noEmit` ✅.
- **M10:** AE-02 ditutup (bukti live 3 Jul, bayu occupied); task AJ-06 diringkas.

### 2026-07-04 — Fase AJ 📋 dibuat — antrian sisa temuan audit (C05-01 sistemik, C10-02 seed, C17-01 okupansi)

- Fase AJ (AJ-01..AJ-07) ditambahkan ke M10 dari konsolidasi `docs/archieve/audit_fable/RINGKASAN_TEMUAN.md` + CHECKLIST_05/10/17: fix sistemik loop 404 `/stays/me/current` (3 file FE tersisa — AE-01 baru menutup hook), verifikasi live anti-loop, seed occupied wajib lunas sewa awal, re-seed data menua, penyamaan label okupansi owner/admin, sinkron status dokumen audit, dan daftar verifikasi live lanjutan 🧑. Spec eksekutor AI lemah (langkah per file + kode SEBELUM/SESUDAH + gate): `docs/_SPEC_FASE_AJ_SISA_AUDIT.md`.

- **Fase AH (CHECKLIST_08 — Info):** AH-01 hardening `announcements.service.ts` `findActive` — bungkus `hasTenantOccupiedStay` try-catch agar DB drift tidak menyebabkan 503; fallback `false` + log warning. AH-02..AH-04: verifikasi STALE Hermes I12/I13 (Panduan & WiFi OK), banner ex-tenant tercakup AF-02.
- **Fase AI (CHECKLIST_09 — Loyalty+Renewal+Checkout):** AI-01a hardening `booking-schema.helper.ts` `isBookingSchemaReady` — bungkus `$queryRaw` try-catch agar query `pg_type`/`information_schema` gagal tidak menyebabkan 503 sistemik; return `false` + cache fallback. Ini menyembuhkan 503 di `/tenant/bookings/my` yang berdampak ke `/portal/bookings`, `/portal/stay` loop, `/portal/renewal`, `/portal/checkout`. AI-01b perbaiki FE `useTenantPortalStage` — `isStageLoading` hanya tunggu `stayQuery` (bookingsQuery tak blokir render portal). AI-02: loyalty/renewal/checkout diverifikasi via kode (JB-01 deposit OK, JB-10 liability OK).
- **Build:** backend `npm run build` ✅ · frontend `npm run build` ✅ (PWA verified).

### 2026-07-02 — Fase AF-AG ✅ Perbaikan temuan audit CHECKLIST_06 + 07 (Invoice + Tiket)

- **Fase AF (CHECKLIST_06 — Invoice):** AF-01 sembunyikan countdown jatuh tempo bila invoice sudah Lunas (`TenantInvoiceDetailPage.tsx`: guard `!isPaid` pada `relativeLabel` + metric helper "Tagihan sudah lunas"), AF-02 bedakan banner onboarding ex-tenant vs new: tambah `hasStayHistory` di `useTenantPortalStage` → `GettingStartedGuide` tampilkan "Kamu pernah menghuni KOST48" + langkah ringkas (katalog + riwayat tagihan) untuk mantan penghuni, AF-03 catatan INFO (guard double-submission kuat via consumed-fileKey + sudah lunas — tanpa kode).
- **Fase AG (CHECKLIST_07 — Tiket):** AG-01 C07-01 banner onboarding ex-tenant — identik dengan C06-02, tercakup AF-02. Tanpa kode tambahan.
- **Build:** frontend `npm run build` ✅ (PWA verified). Backend tidak terdampak.

### 2026-07-02 — Fase AB-AD ✅ Perbaikan 13 temuan audit (CHECKLIST_02..04) + AE polish

- **Fase AB (CHECKLIST_02 — Katalog):** AB-01 label RESERVED "Dipesan" (✅ sudah done sebelumnya), AB-02 link error-state `/katalog→/rooms` + WA asli (✅ sudah done), AB-03 `ROOMS_PER_PAGE` 3→9 + perbaiki komentar, AB-04 unifikasi istilah "Dana titipan"→"Deposit jaminan" di detail publik, AB-05 tambah komentar DP preview pakai monthly.
- **Fase AC (CHECKLIST_03 — Booking):** AC-01 fix default `checkInDate` UTC→WIB (hindari off-by-one dini hari), AC-02 perbaiki FAQ batas penghuni "Maks 2 orang"→"2 gratis, maks 4", AC-03 sembunyikan "Air Rp 0/m³"→"Air termasuk" bila tarif=0, AC-04 N/A (tercakup AB-05).
- **Fase AD (CHECKLIST_04 — Auth):** AD-01 hapus TENANT dari `@Roles GET /settings/operational` (tenant pakai `/public-config`), AD-02 pindahkan cek `isActive` setelah verifikasi password (hindari enumerasi akun nonaktif), AD-03 ganti `<a href>`→`<Link>` di "Lupa password" + tambah `autoComplete="email"` di ForgotPassword, AD-04 tambah komentar `resetTokenPreview` dev-only.
- **Fase AE (CHECKLIST_05 — MyStay):** AE-01 infinite refetch loop (✅ fix sudah ada: `useTenantPortalStage.ts` tangkap 404→null), AE-02 verifikasi occupied-view ⏳ deferred (perlu tenant OCCUPIED).
- **Build:** backend `npm run build` ✅ · frontend `npm run build` ✅ (PWA verified).

### 2026-07-02 — AE-01 ✅ Fix infinite refetch loop tenant MyStay

- **AE-01 / C05-01 🔴 HIGH** — `useTenantPortalStage.ts`: tangkap 404 `/stays/me/current` sebagai hasil valid (`return null`) agar `staleTime` 60s bekerja dan `refetchOnMount` tidak memicu loop tak terbatas. Sebelumnya: tenant tanpa stay OCCUPIED (mantan penghuni) membuka `/portal/stay` → 404 error → query selalu "stale" → tiap remount refetch → skeleton mount/unmount → ~150 req/detik → tab crash. Sekarang: 404 → null (sukses) → staleTime cegah refetch → empty-state "Kamu belum memiliki masa sewa aktif" tampil. Build lulus ✅.

### 2026-07-02 — Fase Z: Z-17..Z-18 ✅ 2 task LOW publik selesai

- **Z-17 ✅** Stat counter publik: sync displayStats segera saat data rooms terload (tidak hanya saat scroll visibility). Cegah 0/0/0 di landing page.
- **Z-18 ✅** Empty state kamar publik: tambah CTA WhatsApp di samping link Cek Ketersediaan.

### 2026-07-02 — Fase Z: Z-11..Z-16 ✅ 6 task MEDIUM selesai

- **Z-11 ✅** RoomsRouteEntry sudah pakai PageLoadingSkeleton dengan label "Memuat kamar…".
- **Z-12 ✅** Empty state loyalty: tambah teks informatif + CTA untuk admin di katalog reward.
- **Z-13 ✅** Ganti env variable LOYALTY_POINT_RUPIAH_VALUE → teks ramah "1 poin ≈ RpN. Nilai dapat disesuaikan oleh owner."
- **Z-14 ✅** Tombol disabled "Perpanjang" & "Ajukan Keluar" sudah punya title attribute.
- **Z-15 ✅** Semua tenant route pakai AppLayout yang sama (TenantWorkspaceTabs). Tidak ada sidebar untuk TENANT.
- **Z-16 ✅** PwaStatus.tsx sudah implementasi localStorage 7-hari cooldown.

### 2026-07-02 — Fase Z: Z-08..Z-10 ✅ 3 task MEDIUM selesai

- **Z-08 ✅** ChartResponsiveWrapper (ResizeObserver) + diterapkan ke SmartChartPanel, DonutGauge, HorizontalBarChart. Cegah Recharts width=-1 warning via conditional render.
- **Z-09 ✅** StatCard.loading prop + skeleton animation. StaffMotivationDashboard cards stabil dengan isLoading gate.
- **Z-10 ✅** Ganti Dropdown Bootstrap → button group langsung + modal. Setiap tombol buka modal report yang sesuai.

### 2026-07-02 — Fase Z: Z-02..Z-07 ✅ 6 task HIGH selesai

- **Z-02 ✅** `/portal/guide` redirect ke `/portal/manual` — MyManualPage sudah ada sejak fase sebelumnya.
- **Z-03 ✅** MyAnnouncementsPage lengkap (fetch + render + 3 state). Hanya butuh seed data.
- **Z-04 ✅** WifiOrderPage lengkap (filter + card + fallback WhatsApp). Hanya butuh seed data.
- **Z-05 ✅** Batal modal tiket reset form (`setFormState(initialForm)` + `setError('')`) via `onHide` & tombol.
- **Z-06 ✅** STAFF sidebar: 5 link → 5 route valid dengan `<NavLink>`. Semua route terverifikasi ada.
- **Z-07 ✅** Room Z1 (id=14) + 3 RoomFacility + 1 ticket dihapus dari DB dev.

### 2026-07-02 — Fase Z: Z-01 ✅ 4 tiket XSS dihapus dari DB

- **Z-01 ✅** Hapus "Uji XSS Y-R2" dari DB dev (4 tiket: id 119, 123, 131, 139). Seed scripts bersih — data berasal dari integration test yang bocor. Build lulus BE+FE.

### 2026-07-02 — Audit UI/UX Cross-Portal (Fase Z dibuka)
- **19 task terverifikasi** dari inspeksi browser real-time di 4 portal (tenant/staff/admin/owner) + halaman publik `/` — 1 CRITICAL, 7 HIGH, 8 MEDIUM, 3 LOW. Detail di `docs/M12_CHECKLIST_CHANGELOG.md` → Fase Z.
- **Cakupan lengkap:** 17 halaman tenant (8), 1 halaman staff, 8 halaman admin, 1 halaman publik, + owner (manual 🧑). 0 JS errors di semua halaman.
- **Temuan kritis:** "Uji XSS Y-R2" muncul di seed data staff & admin — perlu dihapus dari DB + script seed.
- **3 halaman tenant rusak:** `/portal/guide` (404), `/portal/announcements` (kosong), `/portal/wifi` (kosong). **1 bug modal:** "Batal" tidak menutup dialog laporan.
- **Staff:** sidebar 5 link no-op, chart warnings 8×, race condition data cards, tombol "Laporan Lapangan" tidak expand.
- **Admin:** "Kamar Z1 (Contoh Tersedia)" di seed, Loyalitas kosong, env var exposed ke UI.
- **Publik:** stat counter 0/0/0 di landing page, empty state kamar tanpa CTA.
- **Verifikasi positif:** autocomplete login + novalidate sudah fixed di changelog 2026-07-16 ✅ (tidak diulang). No JS errors di seluruh portal.
- Laporan audit lengkap + screenshot: `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. Arsip per-portal: `docs/archieve/LAPORAN-AUDIT-UIUX-KOST48-*.md`.

### 2026-07-16 — Audit Login: autocomplete, type=email, validasi, WhatsApp link
- **Issue #1:** Tambah `autoComplete="email"` (BACKOFFICE) / `autoComplete="username"` (TENANT) di input identifier + `autoComplete="current-password"` di input password — browser bisa menawarkan password manager / auto-fill.
- **Issue #2:** Input email BACKOFFICE pakai `type="email"` (sebelumnya `type="text"`) — keyboard mobile tampilkan @ dan .com shortcut; input TENANT tetap `type="text"` karena bisa email atau nomor HP.
- **Issue #3:** Hapus `noValidate` dari form + tambah `required` — browser validation aktif; custom inline error tetap jalan.
- **Issue #4:** Link "Lupa password?" dari `<Link>` (SPA) diganti `<a href="/forgot-password">` — right-click open in new tab berfungsi.
- **Issue #5:** Tombol "Hubungi Admin via WhatsApp" di tab Nomor HP — aktif selama ada input (tidak butuh nomor valid penuh), plus hint format nomor HP.


