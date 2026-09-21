# Riwayat Changelog — Agustus 2026

> Dimigrasi dari docs/M13_CHANGELOG.md pada a18197c5 (Tahap 2). Anchor asli dipertahankan.
> Isi blok dipindahkan tanpa diubah; 8 entri (2026-08-17 ... 2026-08-20).

## 2026-08-20 — Portal Staff: perbaikan 403 /users + hapus kartu kinerja duplikat di dashboard

- **TicketsPage (mode STAFF):** query `/users` kini hanya jalan untuk OWNER/ADMIN (`enabled` sesuai role). Sebelumnya staff mendapat HTTP 403 + console error saat membuka halaman Tugas.
- **Dashboard staff:** kartu `StaffPerformanceCategoryCard` dihapus dari dashboard karena menduplikasi KPI "Kinerja bulan ini" yang sudah ada di strip atas; detail kategori tetap tersedia di `/staff-report`.
- **Live check 8 route staff** (`/dashboard`, `/tickets`, `/rooms`, `/rooms/7`, `/staff-warehouse`, `/staff-report`, `/notifications`, `/profile`) memakai akun staff sementara: semua render OK, 0 pageerror/5xx/403/404, 0 blank.
- **Verifikasi:** FE `tsc` ✅ · `vitest run` 133/133 ✅ · `npm run build` ✅ (PWA passed).

**Perubahan:** `frontend/src/pages/tickets/TicketsPage.tsx`, `frontend/src/components/staff/StaffMotivationDashboard.tsx`.

## 2026-08-20 — Portal Tenant Ringkas (lanjutan): hapus tab Listrik duplikat + refresh sensor pindah ke Energi

- **MyStayPage kini satu layar tanpa tab.** Tab "Listrik & Air" yang menampilkan ulang `UtilityInsightCard` (sudah ada di halaman `/portal/energy`) dihapus; dashboard tenant menyisakan ringkasan listrik singkat dengan tombol "Buka detail energi".
- **Fitur refresh sensor dipertahankan** — tombol "Muat Ulang Sensor" ditambahkan di halaman Energi (sebelumnya ada di UtilityInsightCard), memanggil `refreshMyRoomMeter` + invalidasi query yang sama.
- **Komponen tidak terpakai dihapus:** `StayTabs.tsx`, `UtilityInsightCard.tsx`, dan test `stayTabs.test.tsx`.
- **Verifikasi:** FE `tsc` ✅ · `vitest run` 133/133 ✅ (135 − 2 test StayTabs yang dihapus) · `npm run build` ✅ (PWA passed, chunks 164→161).

**Perubahan:** `frontend/src/components/portal/stay/ActiveStayContent.tsx`, `frontend/src/pages/portal/MyStayPage.tsx`, `frontend/src/pages/portal/EnergyPage.tsx`, `frontend/src/components/portal/stay/StayTabs.tsx` (dihapus), `frontend/src/components/portal/stay/UtilityInsightCard.tsx` (dihapus), `frontend/src/test/components/stayTabs.test.tsx` (dihapus).

## 2026-08-20 — Portal Tenant Ringkas: nav Utama/Lainnya + hapus redundansi dashboard

- **Navigasi tenant** kini dikelompokkan: **Utama** = Panduan Kos Saya · Bayar Tagihan · Lapor Masalah; **Lainnya** = Energi · Pengumuman · Panduan · WiFi · Poin & Reward (bila aktif). Mobile bottom nav tetap 3 tab utama + popup "Lainnya".
- **Dashboard tenant (MyStayPage):** tab "Kamar & Riwayat" yang duplikat dihapus — survei kepuasan & riwayat sewa tetap ada di tab Ringkasan, info kamar/fasilitas/inventaris/tarif tetap di accordion.
- Tidak ada fitur yang dihapus; hanya dirapikan agar tenant awam melihat 3 aksi inti lebih dulu.
- **Verifikasi:** FE `vitest run` 135/135 ✅ · FE `npm run build` ✅ (PWA passed).

**Perubahan:** `frontend/src/config/navigation.ts`, `frontend/src/components/tenant/TenantWorkspaceTabs.tsx`, `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/components/portal/stay/StayTabs.tsx`, `frontend/src/components/portal/stay/ActiveStayContent.tsx`, `frontend/src/styles/06-tenant.css`, `frontend/src/test/components/stayTabs.test.tsx`.

## 2026-08-20 — M17 Portal Flow Ringkas: Iterasi 4 (E2E + cleanup widget lama)

- **Booking E2E:** flow publik booking → approve → bayar DP → approve → pelunasan → check-in → perpanjangan (DP, meter, settlement, final) → checkout (request → approve → final) diuji live di UAT. Predikat booking di `dashboardShared.tsx` & `stayPredicates.ts` dikoreksi: booking online tetap tampil saat kamar `AVAILABLE`/`MAINTENANCE` (sebelumnya menuntut `RESERVED`, sehingga booking baru tak muncul di antrean).
- **Perpanjangan:** CTA kartu tugas kini dinamis mengikuti state renew — `DP_SECURED` → Catat Meter (`/renew-requests?status=DP_SECURED`), `AWAITING_DP` → Konfirmasi DP, `PENDING_DECISION` → Lihat. Label filter `DP_SECURED` di halaman renew disesuaikan jadi "Perlu Meter / Pelunasan".
- **Backend:** `createRenewUtilityCheckpointLineTx` tidak lagi membuat `InvoiceLine` qty=0 saat pemakaian tertutup jatah gratis (melanggar `invoice_line_non_negative_chk`); meter tetap dicatat, line dilewati.
- **Cleanup:** section "Visual Dashboard" di `DashboardAdmin` dihapus; komponen lama `GaugeChart`, `ActivityRing`, `SnippetCard`, `ComplicationGrid`, `RatingDisplay` dihapus dari repo.
- **Verifikasi:** FE `vitest run` 135/135 ✅ · BE `test:unit` 74/74 ✅ · build FE ✅ (PWA passed) · build BE ✅ · Playwright: dashboard menampilkan lane "Review booking" dan CTA membuka `/stays?status=BOOKINGS` dengan row "Setujui".

**Perubahan:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`, `frontend/src/pages/dashboard/dashboardShared.tsx`, `frontend/src/pages/stays/stayPredicates.ts`, `frontend/src/pages/stays/StaysPage.tsx`, `frontend/src/pages/renew-requests/RenewRequestsAdminPage.tsx`, `backend/src/modules/stays/stays-service.helpers.ts`, `docs/M17_PORTAL_FLOW_RINGKAS.md`.

## 2026-08-18 — Settings: kredensial Tuya & VAPID pindah ke Owner Settings (env minimal)

- **OperationalSetting** + migration `20260818000000_settings_tuya_vapid`: kolom `tuyaAccessKey/SecretKey/ApiBase` + `vapidPublicKey/PrivateKey/Subject` (owner-settable; secret tak pernah dikirim ke client).
- **tuya-client** & **push.service**: baca kredensial DB dulu, env fallback; refresh runtime saat owner update (tanpa restart).
- **UI Owner → Pengaturan**: section baru "Tuya IoT Cloud" + "Web Push (VAPID)" (pola sama dengan Brevo).
- **`.env` minimal**: hanya 9 key esensial. DeepSeek/Brevo/Tuya/VAPID diisi via UI Owner.

**Perubahan:** `backend/prisma/schema.prisma`, migration baru, `tuya-client.service.ts`, `push.service.ts`, `settings.*`, `OwnerSettingsPanels.tsx`, `api/settings.ts`, `make-deploy.mjs`, `.env.production.example`, `bootstrap-production-schema.sql`.

## 2026-08-18 — Go-live: lengkapi data tenant (email + koreksi F1/I)

- **Email 4 tenant** yang tadinya kosong kini terisi di `seed-prod.js` + `tenant-data-template.tsv`: Yofi (G) `jtt1234511@gmail.com`, Lovandra (J) `lovandra.fachri103@gmail.com`, Destarika (L) `desterikahasan@gmail.com`, Gabriel (M) `gabrielexcelly1908@gmail.com`.
- **Kamar F1:** tenant diganti dari Yufita Hieng (NIK 6405025701970003, F, tgl 26) → **GUNAWAN** (NIK 1505062511740001, M, tgl 27). Email GUNAWAN masih kosong.
- **Kamar I:** nama tampil diubah `Agus Settiyo Budi` → **Theo Wijaya** (NIK tetap 3571021308860003, atas nama Agus Settiyo Budi).
- **Status email:** 12/13 tenant sudah ber-email; sisa 1 (GUNAWAN, F1).

**Perubahan:** `backend/scripts/seed-prod.js`, `docs/tenant-data-template.tsv`, `docs/GO_LIVE_DATA_ISI.md`, `docs/FORM_ISI_DATA_GO_LIVE.md`, `docs/M11_DEFAULT_DATA.md`.

## 2026-08-18 — CSS: definisikan 27 token yang dipakai tapi tak pernah didefinisikan

- **00-tokens.css:** 27 custom property yang dirujuk `var(--token)` di 05-staff/06-tenant/04-operations/10-misc/11-public-pages tapi tidak pernah didefinisikan — style diam-diam fallback/rusak tanpa error (mis. `.staff-badge-danger` background kosong). Nilai diambil dari history `styles.css` (commit 6479352^, theme staf hijau) + infer pola fallback existing.
- **Yang ditambahkan:** `--k48-info/-soft`, `--k48-radius-card`, `--k48-shadow-card/-hover`, `--k48-staff-danger-strong/-soft`, `--k48-staff-warning/-soft`, `--k48-staff-success/-soft`, `--k48-staff-info/-soft`, `--k48-staff-border`, `--k48-staff-shadow-card/-float`, `--k48-staff-radius-card`, `--ops-blue/-ink/-muted/-glow/-text`, `--pub-radius-card`, `--density-body`, `--text-base`, `--bg-subtle`, `--ff-mono`.
- **Verifikasi:** build FE ✅ (`built in 42.53s`, PWA passed) · `vitest run` 135/135 ✅.

**Perubahan:** `frontend/src/styles/00-tokens.css`.

## 2026-08-17 — Optimasi deploy shared hosting: Prisma tanpa engine binary + AutoOps interval mati di produksi

- **Prisma:** `binaryTargets` dihapus dari `schema.prisma`. Runtime sudah memakai driver adapter (`@prisma/adapter-pg` → query compiler WASM), sehingga binary engine (`query_engine-windows.dll.node` 21 MB, `query_engine_bg.wasm` 2.3 MB, `query_engine_bg.js`) tidak lagi digenerate/dipakai. Hasil: `dist` 58 MB → 35 MB, `src/generated/prisma` 41 MB → 19 MB (hemat ±23 MB per deploy).
- **Auto-Ops:** `.env.production.example` diselaraskan dengan `deploy/.env.example` — shared hosting/Passenger wajib `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` (cPanel Cron panggil `POST /api/auto-ops/cron`), karena `setInterval` in-process tak andal saat proses di-idle.
- **Verifikasi:** backend `tsc --noEmit` ✅ · `test:unit` 74/74 ✅ · build sukses.

**Perubahan:** `backend/prisma/schema.prisma`, `backend/.env.production.example`.
