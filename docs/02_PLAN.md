# KOST48 V3 — Execution Plan (Unified Master Plan)

**Versi:** 2026-04-21 (Pasca Backend Patch, V4 Roadmap Ditambahkan)  
**Menggabungkan:** FRONTEND_PLAN + IMPLEMENTATION_ROADMAP + ROLE_PERMISSION_MATRIX + UAT_SCENARIOS + BACKEND AUDIT GAP CLOSURE + V4 TENANT-FIRST PLATFORM

---

## 1. Prinsip Besar UI/UX

1. **Role first** — Owner/Admin/Staff/Tenant tidak melihat surface yang sama
2. **Compact over clutter** — jangan jadikan semua tabel sebagai menu utama
3. **Human-readable relations** — tampilkan nama, kode, konteks, bukan ID mentah
4. **One flow, one place** — jika flow sudah wizard/contextual, jangan diduplikasi tanpa alasan
5. **Defensive UI** — invalid/null data tidak boleh menjatuhkan halaman
6. **Honest UX** — jangan beri makna berlebihan pada status yang belum pasti
7. **Approval feels like one journey** — tagihan, bukti bayar, verifikasi, status harus terasa satu alur
8. **Hidden > disabled** — sembunyikan menu yang tidak relevan per role, jangan hanya disable

---

## 2. Role-Based Information Architecture

### 2.1 Owner

**Menu Final (Target):**
- Dashboard Owner
- Stays
- Rooms
- Tenants
- Invoices
- Expenses
- Reports (Finance, Occupancy)
- Announcements
- Users

**Allowed:**
- Melihat KPI utama, billed/collected/overdue, occupancy summary, expense summary, ratios
- Mengelola user level tinggi dan announcements
- Melihat dan mengelola portal access tenant bila diperlukan

**Not primary:** check-in/checkout harian, update meter, create ticket operasional

**UI guideline:** sedikit CTA operasional, lebih banyak cards/summaries/reports, hindari tabel mentah panjang sebagai landing

---

### 2.2 Admin

**Menu Final (Target):**
- Dashboard Admin
- Stays
- Rooms
- Tenants
- Invoices
- Invoice Payments
- Tickets
- Announcements
- Users
- Inventory Items
- Room Items
- Inventory Movements
- WiFi Sales
- Expenses

**Allowed:**
- Full stay lifecycle (create/checkout/cancel/renew/process deposit)
- Manage rooms, tenants, users
- Create/toggle/reset portal access tenant
- Create/edit/issue/cancel invoice draft
- Create direct payment (existing) + approve payment submission (vNext)
- Manage ticket lifecycle
- Manage announcements, inventory

**Not allowed (final target):** create ticket sebagai flow backoffice utama

**UI guideline:** operasional harian, queue penting, CTA langsung dan jelas

---

### 2.3 Staff

**Menu Final (Target):**
- Dashboard Staff
- Tickets
- Rooms
- Inventory Items
- Room Items
- Inventory Movements

**Allowed:**
- Lihat ticket yang relevan, update progress teknis
- Lihat dan kelola inventory
- Lihat konteks kamar untuk pekerjaan teknis

**Tidak boleh:** check-in/checkout/deposit, kelola tenant/users, approval pembayaran, create/toggle/reset portal access tenant

**UI guideline:** surface singkat, fokus pekerjaan aktif, minim menu manajerial

---

### 2.4 Tenant

**Menu Final (Target):**
- Hunian Saya (`/portal/stay`)
- Tagihan Saya (`/portal/invoices`)
- Tiket Saya (`/portal/tickets`)
- Pengumuman (`/portal/announcements`)
- Profil Saya (`/portal/profile`)

**Allowed:**
- Lihat stay sendiri
- Lihat invoice sendiri
- Submit payment proof (vNext Phase E)
- Create ticket sendiri (Phase C) + lihat status tiket sendiri
- Lihat pengumuman yang relevan
- Mengubah data diri & password sendiri

**Tidak boleh:** input ID teknis manual, create stay, edit room, approval payment, manage tenant lain, manage ticket orang lain, create/toggle/reset portal access

**UI guideline:** sangat sederhana, satu layar = satu kebutuhan, bahasa non-teknis, relasi auto-filled dari context

---

## 3. Modul yang Harus Di-Embed (bukan menu utama)

| Modul | Target embedding |
|-------|-----------------|
| Meter Readings | Stay detail (tab Meteran), Room detail |
| Room Items | Room detail (Tab Inventaris) |
| Inventory Movements | Inventory item detail |
| Ticket Create | Hanya dari Tenant Portal (Fase 3) |

---

## 4. Status Eksekusi per Fase (Seragam)

### ✅ Fase 0 — Fondasi & Stabilitas Awal (SELESAI)

**Mencakup:** Batch 0 Stabilization, Phase A (Role Navigation), Phase B (Portal Access Core).

**Batch 0 — Stabilization:**
- Renew modal null-safe, enum-safe check-in, meter invalidation, dashboard invalidation, meter awal honesty, FORFEIT deposit, paid summary defensif, tenant announcements defensif, global 401 interceptor, login hygiene, dashboard route guard.

**Phase A — Role-Based Navigation & Dashboard Split:**
- Route `/dashboard` diblok untuk TENANT.
- Dashboard split Owner/Admin/Staff nyata, menu per role terpisah.
- Tenant portal sederhana dan berdiri sendiri.

**Phase B — Tenant Identity & Portal Access (CORE SELESAI):**
1. Tenant detail enriched dengan portal summary read-only.
2. Email portal tidak terasa ganda di create/edit tenant.
3. Honest portal visibility (tidak memberi fake toggle).
4. Toggle portal access dari tenant context (OWNER/ADMIN).
5. Create portal account dari tenant context (OWNER/ADMIN).
6. Reset password portal dari tenant context (OWNER/ADMIN).

Exit criteria tercapai: Operator paham relasi tenant ↔ portal tanpa membuka modul users generik.

---

### ✅ Fase 1 — Stabilisasi Lanjutan & Pembersihan Kode (SELESAI)

**Tujuan:** Memperbaiki bug kritis, menghapus kode legacy, mengamankan role, dan memperkuat fondasi teknis.

| # | Tugas | File Terkait | Status |
|---|-------|--------------|--------|
| 1 | Perbaiki bug reaktivitas toggle portal | `ResourceFormModal.tsx` | ✅ Selesai |
| 2 | Hapus semua referensi status `PENDING` di UI | `StaysPage.tsx`, `StayDetailPage.tsx`, `ResourceTable.tsx` | ✅ Selesai |
| 3 | Hapus fungsi `activateStay` (dead code) | `api/stays.ts` | ✅ Selesai |
| 4 | Aktifkan `strictNullChecks` di TypeScript | `tsconfig.json` | ✅ Selesai |
| 5 | Perbaiki tipe `getStayInvoiceSuggestion` (ganti `any`) | `api/stays.ts` | ✅ Selesai |
| 6 | Tambahkan `staleTime` global 5 menit untuk TanStack Query | `main.tsx` | ✅ Selesai |
| 7 | Perbaiki navigasi sidebar agar sesuai hak akses penuh | `config/navigation.ts` | ✅ Selesai |
| 8 | Batasi Admin: tidak bisa edit/hapus akun Owner & tidak bisa ubah role ke OWNER | `SimpleCrudPage.tsx`, `ResourceTable.tsx`, `resources.ts` | ✅ Selesai |

**Kriteria Selesai:** Semua terpenuhi. Kode bersih, tipe aman, role aman.

---

### ✅ Fase 2 — Penyempurnaan UX & Integrasi Modul (SELESAI)

**Tujuan:** Memperbaiki alur kerja yang tidak intuitif, mengintegrasikan modul yang terpisah, dan menambahkan fitur dasar yang hilang.

| # | Tugas | Deskripsi | Status |
|---|-------|-----------|--------|
| 9 | **Halaman Profil & Ganti Password** | Buat halaman `/profile` untuk semua role. | ✅ Selesai |
| 10 | **Tab Inventaris di Detail Room** | `RoomDetailPage` dengan tab Inventaris (`RoomItems`). | ✅ Selesai |
| 11 | **Quick Actions di Tabel Tenant & Room** | Tombol "Check-in" pada tenant eligible, "Detail" pada room. | ✅ Selesai |
| 12 | **Pencarian Global di Header** | Komponen `GlobalSearch` untuk tenant/room/invoice. | ✅ Selesai |
| 13 | **Integrasi WiFi Sales ke Invoice** | Opsi menambahkan item dari `WiFiSales` di `CreateInvoiceModal`. | ✅ Selesai |

**Kriteria Selesai:** Semua fitur berfungsi dan terintegrasi dengan baik.

---

### ✅ Fase 3 — Ticket Tenant-Only Redesign (SELESAI)

**Goal:** Menjadikan tenant sumber utama ticket.

| # | Tugas | Deskripsi | Status |
|---|-------|-----------|--------|
| 14 | Backend: `POST /tickets/portal` | Endpoint auto-fill tenantId/stayId/roomId dari JWT. | ✅ Selesai |
| 15 | Frontend: `MyTicketsPage` tenant-first | Arahkan create ticket ke endpoint portal. | ✅ Selesai |
| 16 | Frontend: Backoffice ticket path hardening | Sembunyikan/sempitkan form create ticket di backoffice. | ✅ Selesai |

**Catatan:** Fase 3 selesai sepenuhnya. Tenant sekarang dapat membuat tiket dari portal dengan konteks otomatis.

---

### ✅ Fase 3.5 — Backend Stabilization & API Gap Closure (SELESAI)

**Tujuan:** Menutup celah keamanan, ketidaksesuaian kontrak, dan endpoint hilang yang ditemukan dalam audit backend (21 April 2026).

**Sumber:** Laporan Audit Backend KOST48 V3.

| # | Tugas | Prioritas | Status |
|---|-------|-----------|--------|
| B1 | Hapus fallback JWT secret & fail‑fast | P0 | ✅ Selesai |
| B2 | Samakan pesan error login (generik) | P0 | ✅ Selesai |
| B3 | Guard server‑side: admin tidak bisa edit/hapus Owner & tidak bisa set role OWNER | P0 | ✅ Selesai |
| B4 | Buat endpoint `POST /tickets/portal` | P0 | ✅ Selesai |
| B5 | Abaikan context teknis dari client pada create ticket tenant | P0 | ✅ Selesai |
| B6 | Hapus legacy path `PENDING` / `activateStay()` | P1 | ✅ Selesai |
| B7 | Tambahkan `POST /auth/change-password` | P1 | ✅ Selesai |
| B8 | Tambahkan `GET /stays/:id/invoice-suggestion` | P1 | ✅ Selesai |
| B9 | Perkaya `GET /rooms/:id` dengan `currentStay`, `roomItems`, `meterSummary` | P1 | ✅ Selesai |
| B10 | Perketat DTO enum, decimal, integer sesuai policy kontrak | P1 | ✅ Selesai |
| B11 | Pagination untuk endpoint mine/embedded list | P2 | ✅ Selesai (parsial) |
| B13 | Standarkan import Prisma client | P2 | ✅ Selesai |
| B14 | Lengkapi audit log untuk assign/close/update sensitif | P2 | ✅ Selesai |

**Catatan:** Semua gap kritis antara frontend dan backend telah ditutup. Sistem sekarang siap untuk integrasi penuh dan UAT.

---

## 5. V4 Roadmap — Tenant-First Platform (Backlog)

**Visi:** Mengubah KOST48 dari sistem *backoffice-centric* menjadi **platform tenant-first** dengan booking mandiri, persetujuan admin, pembayaran mandiri, dan otomatisasi penuh.
### ✅/⏳ Fase 4.0 — Booking Mandiri & Status RESERVED (PATCH KODE SUDAH TERTUTUP)

**Tujuan:** Memungkinkan calon tenant memesan kamar secara online dengan model tenant-first, sambil tetap menjaga approval final di tangan admin pada fase berikutnya.

**Status saat ini:**
- ✅ Backend inti 4.0.1–4.0.5 sudah dipatch pada level source/build
- ✅ Frontend inti 4.0.6–4.0.9 sudah dipatch pada level source/build
- ⏳ UAT end-to-end flow booking belum dinyatakan lolos penuh

**Backend yang sudah ditutup:**
- Enum `RESERVED` pada `RoomStatus`
- Field `expiresAt` pada `Stay`
- `GET /public/rooms`
- `POST /tenant/bookings`
- `GET /tenant/bookings/my`

**Frontend yang sudah ditutup:**
- Halaman publik `/rooms`
- Form booking `/booking/:roomId`
- Menu + halaman tenant **Pemesanan Saya**
- Surface read-only booking reserved di backoffice

**Catatan implementasi:**
- Fase ini sengaja dijaga tetap sempit
- Tidak membuka:
  - approval booking admin
  - payment submission
  - scheduler umum
  - debt flow
  - redesign accounting formal
- Status fase tetap ⏳ karena verifikasi runtime/UAT penuh belum selesai

**Kriteria selesai Fase 4.0 (final):**
1. Tenant dapat melihat katalog kamar publik
2. Tenant dapat membuat booking dan status kamar berubah menjadi `RESERVED`
3. Tenant dapat melihat booking miliknya di portal
4. Admin dapat melihat daftar booking reserved di backoffice
5. Flow booking lolos UAT end-to-end tanpa mematahkan baseline existing

---

### ⏳ Fase 4.1 — Admin Approval & Pelengkapan Data (Backend 4.1A + Frontend 4.1B Sudah Dipatch)

**Tujuan:** Admin menyetujui booking dan melengkapi data yang kurang.

**Backend:**
- Buat endpoint `PATCH /admin/bookings/:stayId/approve`:
  - Admin mengisi `agreedRentAmountRupiah`, `depositAmountRupiah`, `initialElectricityKwh`, `initialWaterM3`.
  - Sistem membuat `Invoice` DRAFT untuk periode pertama.
  - Status `Room` tetap `RESERVED` hingga pembayaran diverifikasi.
- Kirim notifikasi WhatsApp ke tenant bahwa booking disetujui dan menunggu pembayaran.

**Frontend (Backoffice):**
- ✅ Queue approval booking di-embed pada halaman **Stays** lewat mode **Booking Reserved**.
- ✅ Form approval booking tersedia dan memakai endpoint backend existing `PATCH /admin/bookings/:stayId/approve`.
- ✅ Setelah approval sukses, queue stays dan invoice terkait di-refresh.

**Frontend (Tenant Portal):**
- ✅ `Pemesanan Saya` menampilkan status konservatif **Menunggu Approval** / **Menunggu Pembayaran** setelah approval.

**Status saat ini:**
- Backend core approval booking sudah dipatch pada batch 4.1A.
- Frontend approval queue + form + tenant status setelah approval sudah dipatch pada batch 4.1B.
- UAT end-to-end approval booking belum dinyatakan lolos penuh.

**Kriteria Selesai:**
- Admin dapat menyetujui booking dan mengisi data kontrak.
- Tenant melihat status booking berubah menjadi "Menunggu Pembayaran".
- Approval flow lolos UAT tanpa membuka payment submission lebih cepat dari fasenya.

---

### ⬜ Fase 4.2 — Pembayaran Mandiri & Aktivasi Otomatis

**Tujuan:** Tenant mengunggah bukti bayar, admin verifikasi, kamar otomatis `OCCUPIED`.

**Backend:**
- Integrasikan **Fase 5 V3 (Payment Submission)** ke dalam flow booking:
  - Tenant upload bukti bayar via `POST /payment-submissions`.
  - Admin review & approve via `POST /payment-submissions/:id/approve`.
  - **Trigger otomatis:** Setelah approve, `Room.status` berubah dari `RESERVED` → `OCCUPIED`.
  - `Invoice` status menjadi `PAID`.
- Tambah logika kadaluarsa otomatis (cron job sederhana): Jika `expiresAt` terlewati tanpa pembayaran, `Room` kembali `AVAILABLE` dan `Stay` dibatalkan otomatis.

**Frontend:**
- Di portal tenant, tambah tombol "Upload Bukti Bayar" pada halaman booking detail.
- Admin melihat queue pembayaran di dashboard.

**Kriteria Selesai:**
- Tenant dapat upload bukti bayar.
- Admin verifikasi → kamar otomatis `OCCUPIED` dan tenant mendapat akses penuh portal.
- Booking kadaluarsa otomatis kembali tersedia.

---

### ⬜ Fase 4.3 — Notifikasi & Reminder (WhatsApp)

**Tujuan:** Mengingatkan tenant tentang jatuh tempo pembayaran dan checkout.

**Backend:**
- Integrasi WhatsApp Gateway (contoh: Waha, Whapi) untuk mengirim pesan.
- Buat *cron job* sederhana yang memanggil endpoint internal untuk mengirim notifikasi:
  - Booking kadaluarsa dalam 1 hari.
  - Invoice jatuh tempo H-3, H-1.
  - Checkout H-10, H-7, H-3.

**Frontend:**
- Tampilkan badge reminder di portal tenant.

**Kriteria Selesai:**
- Tenant menerima pengingat otomatis via WhatsApp.
- Admin tidak perlu mengingatkan manual.

---

### ⬜ Fase 4.4 — Marketing Display & Registrasi Fleksibel

**Tujuan:** Meningkatkan daya tarik visual dan memudahkan pendaftaran.

**Backend:**
- Tambah field `images` (array URL) pada model `Room`.
- Buat endpoint publik `GET /public/rooms/:id` untuk detail kamar.
- **Registrasi:** User dapat mendaftar dengan **email** atau **nomor HP** (WhatsApp). Username opsional.
- **Soft Delete Akun:** Saat tenant menghapus akun, set `isActive = false`, data tetap ada untuk audit.

**Frontend:**
- Halaman detail kamar dengan galeri foto.
- Form registrasi menerima email atau nomor HP.
- Opsi "Hapus Akun Saya" di portal tenant (dengan konfirmasi).

**Kriteria Selesai:**
- Kamar dapat dilihat publik dengan foto menarik.
- User dapat daftar dengan email atau nomor HP.
- Akun dapat dinonaktifkan tanpa kehilangan data historis.

---

### ⬜ Fase 4.5 — Tenant Self-Service Lanjutan

**Tujuan:** Memberikan kontrol lebih kepada tenant.

**Backend:**
- **Perpanjangan Stay:** `POST /tenant/stays/renew` (tenant ajukan, admin approve).
- **Lupa Password:** `POST /auth/forgot-password` + `POST /auth/reset-password` (token via WhatsApp/email).

**Frontend:**
- Tombol "Perpanjang Stay" di portal tenant.
- Form "Lupa Password" di halaman login.

**Kriteria Selesai:**
- Tenant dapat mengajukan perpanjangan stay.
- Tenant dapat mereset password secara mandiri.

---

## 6. UAT — Existing Scenarios

### Fase 0 UAT (referensi — sudah lolos)
- Renew modal tidak crash untuk stay dengan/tanpa planned checkout
- Save notes stay tidak 404
- Renewal open-ended menghasilkan period yang benar
- Meter tab refresh langsung setelah add reading
- Check-in wizard enum-safe (dropdown, bukan free-text)
- Login sebagai tenant → ketik `/dashboard` → di-redirect ke portal
- Form login default kosong, tidak ada prefill

### Fase 0 (Phase B) UAT (referensi — sudah lolos)
- Tenant detail menampilkan portal summary (email, status, last login)
- Create portal account → feedback sukses → summary ter-update
- Toggle portal aktif/nonaktif → status refresh → role non-OWNER/ADMIN tidak melihat CTA
- Reset password → feedback sukses jelas

### Fase 3 UAT (aktif — sudah lolos)
- Login sebagai tenant → buka Tiket Saya → klik "Ajukan Tiket" → isi judul + deskripsi → submit → tiket muncul di list tenant
- Tiket yang sama terlihat di backoffice admin dengan context tenant/stay/room sudah terisi
- Admin bisa update status tiket → status ter-update di portal tenant
- Tenant tidak diminta input ID manual apapun

### General Role UAT
- **Owner:** landing ke dashboard strategis, tidak ke surface admin mentah
- **Admin:** check-in/renew/checkout masih masuk akal, bisa manage portal access tenant
- **Staff:** hanya melihat menu teknis, tidak ada CTA manajerial, tidak ada CTA portal access tenant
- **Tenant:** melihat stay/invoice/tiket sendiri, tidak bisa akses route backoffice

---

## 7. Acceptance Rule

Skenario dianggap lolos jika:
1. Happy path berjalan
2. Empty / loading / error state tidak menyesatkan
3. Role tidak melihat CTA yang salah
4. Data setelah aksi terlihat sinkron tanpa refresh manual yang tidak wajar
5. Tenant portal tetap sederhana dan tidak bocor ke surface backoffice