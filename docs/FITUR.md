# FITUR — registry fitur & jangkar kode

> **Blok baca** · Jenis: **registry fitur (tier-1)** · Status: **aktif sejak 2026-10-21 (batch D3 DOCS-GEN2)** · Untuk siapa: agen + owner yang mencari fitur, rute, atau jangkar kode
> · Baca kalau: mencari ID fitur, role, rute, status, atau berkas komponennya. · **Jangan** dibaca kalau: mencari status pekerjaan (itu [ANTREAN](ANTREAN.md)) atau aturan kerja (itu [KONTRAK](KONTRAK.md)).

**Fakta** · potret **2026-10-22** — **58 fitur** menutup **80 rute** `App.tsx`; sumber role/rute: [peta peran](product/peran.md), `frontend/src/App.tsx`, `frontend/src/config/navigation.ts`.

## 1. Cara membaca

- **ID** = `FEAT-<AREA>-NNN`; AREA mengikuti domain (OWN/ADM/STF/TNT/FIN/OPS/DATA), bukan role. Satu fitur lintas-role tetap satu ID.
- **Satu fitur = satu layar/alur** dengan satu komponen utama. Alias/redirect menempel ke fitur induk; halaman detail menempel ke fitur daftar.
- **Status** = `aktif` · `stub` · `redirect` · `deprecated`; diturunkan dari komentar kode dan perilaku rute, bukan dari nama folder.
- **Jangkar kode** = path komponen, bukan nomor baris. Untuk `ConfiguredResourcePage`, nama `resource` ditulis di teks.
- Registry ini **bukan antrean**; status pekerjaan tetap di [ANTREAN](ANTREAN.md).

## 2. Registry

| ID | Fitur | Role | Rute | Status | Jangkar kode |
|---|---|---|---|---|---|
| FEAT-OPS-001 | Login, daftar akun tenant, lupa sandi, reset sandi | PUBLIK | `/login`, `/register`, `/forgot-password`, `/reset-password` | aktif | `frontend/src/pages/auth/LoginPage.tsx`<br>`frontend/src/pages/auth/RegisterPage.tsx`<br>`frontend/src/pages/auth/ForgotPasswordPage.tsx`<br>`frontend/src/pages/auth/ResetPasswordPage.tsx` |
| FEAT-OPS-002 | Katalog kamar publik | PUBLIK | `/rooms`, `/rooms/:roomId/detail` | aktif | `frontend/src/pages/rooms/RoomsRouteEntry.tsx`<br>`frontend/src/pages/rooms/PublicRoomDetailPage.tsx` |
| FEAT-OPS-003 | Booking tamu | PUBLIK | `/booking/:roomId` | aktif | `frontend/src/pages/bookings/GuestBookingPage.tsx` |
| FEAT-OPS-004 | Wizard ketersediaan kamar | PUBLIK | `/update-kamar`, `/availability-setup` | aktif | `frontend/src/pages/public/PublicAvailabilityWizardPage.tsx` |
| FEAT-OPS-005 | Okupansi publik | PUBLIK | `/okupansi` | aktif | `frontend/src/pages/public/OkupansiPage.tsx` |
| FEAT-OPS-006 | Cek status publik | PUBLIK | `/cek` | aktif | `frontend/src/pages/public/CekPage.tsx` |
| FEAT-OPS-007 | FAQ publik | PUBLIK | `/panduan` | aktif | `frontend/src/pages/public/FaqPublicPage.tsx` |
| FEAT-OPS-008 | Ulasan publik | PUBLIK | `/reviews` | aktif | `frontend/src/pages/public/ReviewsPublicPage.tsx` |
| FEAT-OPS-009 | Beranda publik | PUBLIK | `/` | aktif | `frontend/src/pages/public/PublicGuestDashboardPage.tsx` |
| FEAT-OPS-010 | Mode Cepat (deprecated) | Semua | `/cepat`, `/pilih-mode` | deprecated | `frontend/src/pages/cepat/CepatShell.tsx`<br>`frontend/src/pages/cepat/PilihModePage.tsx` |
| FEAT-OPS-011 | Profil dan notifikasi | OWNER, ADMIN, STAFF, TENANT | `/profile`, `/notifications` | aktif | `frontend/src/pages/profile/ProfilePage.tsx`<br>`frontend/src/pages/notifications/NotificationsPage.tsx` |
| FEAT-OPS-012 | Halaman 404 | Semua | `*` | aktif | `frontend/src/pages/NotFoundPage.tsx` |
| FEAT-ADM-001 | Dashboard admin dan staff | ADMIN, STAFF | `/dashboard` | aktif | `frontend/src/pages/dashboard/DashboardPage.tsx` |
| FEAT-ADM-002 | Masa sewa dan penghuni | OWNER, ADMIN | `/stays`, `/stays/check-in`, `/stays/assist`, `/stays/:id` | aktif | `frontend/src/pages/stays/StaysPage.tsx`<br>`frontend/src/pages/stays/CheckInWizard.tsx`<br>`frontend/src/pages/stays/AssistTenantPage.tsx`<br>`frontend/src/pages/stays/StayDetailPage.tsx` |
| FEAT-ADM-003 | Tagihan | OWNER, ADMIN | `/invoices`, `/invoices/:id` | aktif | `frontend/src/pages/invoices/InvoicesPage.tsx`<br>`frontend/src/pages/invoices/InvoiceDetailPage.tsx` |
| FEAT-ADM-004 | Pembayaran dan review | OWNER, ADMIN | `/invoice-payments`, `/payment-submissions/review` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="invoice-payments") + `frontend/src/pages/payments/PaymentReviewPage.tsx` |
| FEAT-ADM-005 | Pengumuman | OWNER, ADMIN | `/announcements` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="announcements") |
| FEAT-ADM-006 | Catatan meter | OWNER, ADMIN | `/meter-readings` | aktif | `frontend/src/pages/rooms/MeterReadingsPage.tsx` |
| FEAT-ADM-007 | IoT listrik dan air | OWNER, ADMIN | `/iot` | aktif | `frontend/src/pages/iot/IotOverviewPage.tsx` |
| FEAT-ADM-008 | Perawatan AC | OWNER, ADMIN | `/ac-maintenance` | aktif | `frontend/src/pages/operations/AcMaintenancePage.tsx` |
| FEAT-ADM-009 | Layanan tambahan | OWNER, ADMIN | `/additional-services` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="additionalServices") |
| FEAT-ADM-010 | Minat layanan | OWNER, ADMIN | `/service-interests` | aktif | `frontend/src/pages/services/ServiceInterestsPage.tsx` |
| FEAT-ADM-011 | Tiket | OWNER, ADMIN, STAFF | `/tickets` | aktif | `frontend/src/pages/tickets/TicketsPage.tsx` |
| FEAT-ADM-012 | Rutinitas staff | OWNER, ADMIN | `/staff-routines` | aktif | `frontend/src/pages/staff-routines/StaffRoutinesAdminPage.tsx` |
| FEAT-ADM-013 | Kinerja staff | OWNER, ADMIN | `/staff-performance` | aktif | `frontend/src/pages/admin/AdminStaffPerformancePage.tsx` |
| FEAT-ADM-014 | Survei penghuni | OWNER, ADMIN | `/surveys` | aktif | `frontend/src/pages/admin/AdminSurveysPage.tsx` |
| FEAT-ADM-015 | Preferensi tamu | OWNER, ADMIN | `/guest-preferences` | aktif | `frontend/src/pages/admin/GuestPreferencesPage.tsx` |
| FEAT-ADM-016 | Inventaris terpadu | OWNER, ADMIN; alias redirect: Semua | `/inventory`, `/inventory/gudang`, `/inventory/barang-kamar`, `/inventory/mutasi`, `/inventory-items`, `/room-items`, `/inventory-movements` | aktif | `frontend/src/pages/resources/InventoryShellPage.tsx`<br>`frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="inventory-items", "room-items", "inventory-movements") |
| FEAT-ADM-017 | Detail kamar operasional | OWNER, ADMIN, STAFF | `/rooms/:id` | aktif | `frontend/src/pages/rooms/RoomDetailPage.tsx` |
| FEAT-ADM-018 | Akun pengguna | OWNER, ADMIN | `/users` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="users") |
| FEAT-ADM-019 | Data tenant | OWNER, ADMIN | `/tenants` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="tenants") |
| FEAT-ADM-020 | Perpanjangan sewa | OWNER, ADMIN | `/renew-requests` | aktif | `frontend/src/pages/renew-requests/RenewRequestsAdminPage.tsx` |
| FEAT-ADM-021 | Pengingat | OWNER, ADMIN | `/reminders` | aktif | `frontend/src/pages/reminders/ReminderPreviewPage.tsx` |
| FEAT-ADM-022 | Pengaturan | OWNER, ADMIN | `/settings` | aktif | `frontend/src/pages/settings/OwnerSettingsPage.tsx` |
| FEAT-ADM-023 | Loyalitas dan reward admin | OWNER, ADMIN | `/loyalty` | aktif | `frontend/src/pages/loyalty/LoyaltyAdminPage.tsx` |
| FEAT-ADM-024 | Penjualan WiFi | OWNER, ADMIN | `/wifi-sales` | aktif | `frontend/src/pages/resources/ConfiguredResourcePage.tsx` (resource="wifi-sales") |
| FEAT-ADM-025 | Pendapatan tambahan | OWNER, ADMIN | `/ancillary-revenue` | aktif | `frontend/src/pages/finance/AncillaryRevenuePage.tsx` |
| FEAT-ADM-026 | Pengeluaran | OWNER, ADMIN | `/expenses` | aktif | `frontend/src/pages/finance/PurchaseOperationsPage.tsx` |
| FEAT-FIN-001 | Kokpit OWNER | OWNER | `/owner-dashboard` | aktif | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` |
| FEAT-FIN-002 | Dashboard admin OWNER | OWNER | `/admin-dashboard` | aktif | `frontend/src/pages/dashboard/DashboardAdmin.tsx` |
| FEAT-FIN-003 | Laporan bisnis | OWNER | `/reports` | aktif | `frontend/src/pages/reports/ReportsPage.tsx` |
| FEAT-FIN-004 | Akuntansi dan aset | OWNER, ADMIN | `/finance/accounting-setup`, `/finance/assets` | aktif | `frontend/src/pages/finance/AccountingSetupPage.tsx`<br>`frontend/src/pages/finance/AssetRegisterPage.tsx` |
| FEAT-FIN-005 | Refund kalah-cepat | OWNER | `/loss-refunds` | aktif | `frontend/src/pages/finance/LossRefundsPage.tsx` |
| FEAT-FIN-006 | Analisa pasar | OWNER | `/market-analysis` | aktif | `frontend/src/pages/marketing/MarketAnalysisPage.tsx` |
| FEAT-STF-001 | Laporan bulanan staff | STAFF | `/staff-report` | aktif | `frontend/src/pages/staff/StaffMonthlyReportPage.tsx` |
| FEAT-STF-002 | Gudang staff | STAFF | `/staff-warehouse` | aktif | `frontend/src/pages/staff/StaffWarehousePage.tsx` |
| FEAT-TNT-001 | Status pemesanan | TENANT | `/portal/bookings` | aktif | `frontend/src/pages/portal/MyBookingsPage.tsx` |
| FEAT-TNT-002 | Tagihan awal | TENANT | `/portal/invoices`, `/portal/invoices/:id` | aktif | `frontend/src/pages/portal/MyInvoicesPage.tsx`<br>`frontend/src/pages/portal/TenantInvoiceDetailPage.tsx` |
| FEAT-TNT-003 | Panduan kos saya | TENANT | `/portal/stay` | aktif | `frontend/src/pages/portal/MyStayPage.tsx` |
| FEAT-TNT-004 | Energi | TENANT | `/portal/energy` | aktif | `frontend/src/pages/portal/EnergyPage.tsx` |
| FEAT-TNT-005 | Lapor masalah | TENANT | `/portal/tickets` | aktif | `frontend/src/pages/portal/MyTicketsPage.tsx` |
| FEAT-TNT-006 | Pengumuman tenant | TENANT | `/portal/announcements`, `/portal/announcements/:id` | aktif | `frontend/src/pages/portal/MyAnnouncementsPage.tsx`<br>`frontend/src/pages/portal/TenantAnnouncementDetailPage.tsx` |
| FEAT-TNT-007 | Panduan penghuni | TENANT; alias redirect /portal/guide: Semua | `/portal/manual`, `/portal/guide` | aktif | `frontend/src/pages/portal/MyManualPage.tsx` |
| FEAT-TNT-008 | Pesan WiFi | TENANT | `/portal/wifi` | aktif | `frontend/src/pages/portal/WifiOrderPage.tsx` |
| FEAT-TNT-009 | Poin dan reward | TENANT | `/portal/loyalty` | aktif | `frontend/src/pages/portal/MyLoyaltyPage.tsx` |
| FEAT-TNT-010 | Checkout (stub) | TENANT | `/portal/checkout` | stub | `frontend/src/pages/portal/CheckoutPortalPage.tsx` |
| FEAT-TNT-011 | Perpanjangan (stub) | TENANT | `/portal/renewal` | stub | `frontend/src/pages/portal/RenewalPortalPage.tsx` |
| FEAT-TNT-012 | Booking portal | TENANT | `/portal/booking/:roomId` | aktif | `frontend/src/pages/bookings/BookingPage.tsx` |

## 3. Rute khusus

- `/inventory-items`, `/room-items`, `/inventory-movements` adalah **redirect** ke `/inventory/*` (FEAT-ADM-016); isi target dijaga OWNER/ADMIN.
- `/portal/guide` adalah **redirect** ke `/portal/manual` (FEAT-TNT-007); rute ini hanya dijaga `ProtectedRoute`, jadi semua role terautentikasi bisa memicunya.
- `/portal/checkout` dan `/portal/renewal` adalah **stub** informatif (FEAT-TNT-010/011), bukan layar penuh.
- `/cepat` **deprecated**; `/pilih-mode` adalah pintu pemilihan mode yang kehilangan fungsi setelah `/cepat` dihapus (FEAT-OPS-010).
- `/admin-dashboard` adalah **mode admin OWNER**, bukan dashboard ADMIN (FEAT-FIN-002).

## 4. Cakupan

- **58 fitur** menutup **80/80 rute**; **0 rute tak terpetakan**, **0 rute ganda**.
- Per area: OPS 12 · ADM 26 · FIN 6 · STF 2 · TNT 12.
- Checker mandiri: `node scripts/check-fitur.mjs` — memeriksa format ID, status, path jangkar, dan cakupan rute `App.tsx`.

## 5. Batas

- Jangkar membuktikan **berkasnya ada**, bukan bahwa fitur bekerja. Perilaku, otorisasi backend, dan data DB tidak diperiksa di sini.
- Granularitas fitur adalah keputusan manusia; rute baru harus ditambahkan ke fitur yang tepat, bukan dibiarkan di luar registry.
- Angka cakupan adalah **potret 2026-10-21**; kode yang berubah setelah tanggal itu membatalkan angka ini.

## 6. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat pada batch D3 DOCS-GEN2: 58 fitur, 79 rute, jangkar path komponen, checker mandiri. |
