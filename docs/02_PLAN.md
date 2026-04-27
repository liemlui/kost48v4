# KOST48 V3 — Execution Plan (Unified Master Plan)

**Versi:** 2026-04-27 (Pasca Phase 4.3-C In-app Notification Center COMPLETE dan keputusan Phase 4.3-D Payment Urgency Header Chip)
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
- Notifikasi (`/notifications`)
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



---

## Update Aktif — 2026-04-27: Phase 4.3-C COMPLETE dan Next Phase 4.3-D

### Phase 4.3-C — In-app Notification Center MVP ✅ COMPLETE

Status resmi:
- **4.3-C1a Backend AppNotification Foundation** — UAT PASS dan committed.
- **4.3-C1b Frontend Notification Center** — build PASS, visual smoke PASS, committed.
- Branch checkpoint sudah bersih dan pushed sampai commit C1b.

Scope yang sudah selesai:
1. Model `AppNotification` terpisah dari AuditLog dan Announcement.
2. Endpoint user-scoped:
   - `GET /api/me/notifications`
   - `PATCH /api/me/notifications/:id/read`
   - `PATCH /api/me/notifications/read-all`
3. Mock reminder dapat membuat AppNotification untuk tenant target tanpa memblokir hasil mock send.
4. Frontend menampilkan notification bell, unread badge, dropdown preview, route `/notifications`, dan menu tenant **Notifikasi**.
5. OWNER/ADMIN/STAFF tidak diberi sidebar menu Notifikasi; akses cukup dari bell/header dan route `/notifications`.

Yang tetap deferred:
- real WhatsApp provider
- scheduler/cron otomatis
- browser push/service worker/PWA push
- SSE/websocket
- automation engine umum

### Phase 4.3-D — Tenant Payment Urgency Header Chip 🟡 NEXT

Tujuan: finance-related reminder harus lebih berdampak secara bisnis daripada sekadar inbox read/unread.

Prinsip:
- AppNotification = riwayat/inbox personal.
- Payment Urgency Chip = indikator bisnis aktif yang tetap muncul sampai kewajiban selesai.
- Membaca notifikasi tidak boleh menghilangkan urgency chip jika invoice/booking/contract masih aktif.

Target MVP frontend-first:
- Tampilkan chip kecil di header tenant, di sebelah bell.
- Tenant-only untuk batch pertama.
- Klik chip navigasi ke halaman terkait:
  - `/portal/invoices`
  - `/portal/bookings`
  - `/portal/stay`

Prioritas chip:
1. Invoice overdue (`Terlambat X hari`)
2. Booking payment deadline (`Bayar sebelum X jam`)
3. Invoice due soon (`Tagihan H-X` / `Jatuh tempo hari ini`)
4. Stay/contract ending soon (`Kontrak H-X`)

Acceptance criteria:
- Chip tidak muncul jika tidak ada urgency.
- Chip tetap muncul walau notification sudah read selama kondisi bisnis belum selesai.
- Chip hilang hanya saat invoice paid, booking resolved, atau stay/contract resolved.
- Tidak membuka WhatsApp, scheduler, push, service worker, SSE, websocket.

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

**Tujuan:** tenant mengunggah bukti bayar, admin memverifikasi, lalu status booking/invoice/room berubah sinkron tanpa mematahkan fondasi stay dan invoice existing.

#### Scope resmi fase ini
1. **Payment submission tenant** — tenant membuat pengajuan bukti bayar, bukan langsung menulis `InvoicePayment`.
2. **Review queue admin** — admin melihat daftar submission pending dan memutuskan approve / reject.
3. **Sinkronisasi status** — approval final membuat `InvoicePayment` final, invoice ter-update, room `RESERVED -> OCCUPIED`, dan stay booking menjadi aktif operasional.
4. **Expiry booking** — booking yang lewat `expiresAt` tanpa penyelesaian pembayaran harus dilepas aman.

#### Backend — ACT rinci
**4.2.A — Data + contract**
- Tambah entity / model `PaymentSubmission` beserta enum status minimal:
  - `PENDING_REVIEW`
  - `APPROVED`
  - `REJECTED`
  - `EXPIRED`
- Field minimum:
  - `stayId`
  - `invoiceId`
  - `tenantId`
  - `amountRupiah`
  - `paidAt`
  - `paymentMethod`
  - proof metadata (`fileKey`, `fileUrl`, `originalFilename`, `mimeType`, `fileSizeBytes`)
  - `senderName?`, `senderBankName?`, `referenceNumber?`, `notes?`
  - `reviewedById?`, `reviewedAt?`, `reviewNotes?`

**4.2.B — Endpoint tenant**
- `POST /payment-submissions`
  - Guard role TENANT
  - Tenant hanya boleh submit untuk booking miliknya
  - Validasi file/proof metadata
  - Validasi invoice milik stay yang sama
  - Validasi stay masih konteks booking dan room masih `RESERVED`
- `GET /payment-submissions/my`
  - pagination
  - filter status
  - search ringan berdasar kode kamar / invoice / reference number

**4.2.C — Endpoint admin review**
- `GET /payment-submissions/review-queue`
  - list pending review
  - filter status, search, paymentMethod, room, tenant
- `POST /payment-submissions/:id/approve`
  - create `InvoicePayment` final
  - sync status invoice
  - sync status room + stay
  - audit log
  - idempotent / race-safe
- `POST /payment-submissions/:id/reject`
  - simpan alasan
  - tenant tetap melihat riwayat reject

**4.2.D — Activation sync**
- Jika invoice awal booking menjadi lunas:
  - `Room.status` berubah `RESERVED -> OCCUPIED`
  - booking berubah menjadi stay aktif operasional
  - tenant mendapat akses portal penuh sesuai aturan V4
- Jika baru partial:
  - invoice menjadi `PARTIAL`
  - room tetap `RESERVED`
  - submission lain masih bisa diajukan sepanjang booking belum expired

**4.2.E — Expiry handling**
- Internal job / scheduler sempit untuk cek `expiresAt`
- Jika booking melewati `expiresAt` dan belum lunas:
  - stay booking dibatalkan / di-expire
  - room kembali `AVAILABLE`
  - submission pending yang belum final diberi status `EXPIRED`
  - audit log expiry dibuat
- Expiry wajib aman terhadap race dengan approval admin

#### Frontend — ACT rinci
**Tenant portal**
- Tambah tombol **Upload Bukti Bayar** di surface booking yang sudah `Menunggu Pembayaran`
- Form upload memuat:
  - nominal
  - tanggal bayar
  - metode pembayaran
  - nomor referensi
  - catatan
  - upload proof
- Tambah list / riwayat submission pada detail booking
- Status yang harus terbaca jujur:
  - `Menunggu Upload`
  - `Menunggu Review`
  - `Ditolak`
  - `Lunas / Aktif`

**Backoffice**
- Tambah queue verifikasi pembayaran
- Row menampilkan konteks manusiawi:
  - tenant
  - kamar
  - invoice
  - nominal
  - waktu bayar
  - `expiresAt`
- Modal review:
  - preview proof
  - approve
  - reject + alasan wajib
- Setelah aksi sukses, queue / stay / invoice / dashboard terkait di-invalidasi

#### Acceptance criteria fase 4.2
- Tenant dapat submit bukti bayar tanpa input ID teknis mentah
- Admin dapat approve / reject dengan feedback jelas
- Approval yang membuat invoice lunas mengubah status `RESERVED -> OCCUPIED`
- Reject tidak membuat data sync rusak
- Booking yang expired otomatis kembali aman
- Flow lolos UAT happy path, reject path, partial path, expiry path, dan regression check

---

### ⬜ Fase 4.3 — Notifikasi & Reminder (WhatsApp)

**Tujuan:** mengurangi reminder manual operator dengan notifikasi yang terukur, idempotent, dan tidak menjatuhkan flow utama.

#### Scope resmi fase ini
1. Reminder booking hampir kadaluarsa
2. Reminder invoice H-3 / H-1
3. Reminder checkout H-10 / H-7 / H-3
4. Badge reminder di portal tenant
5. Logging hasil kirim notifikasi

#### Backend — ACT rinci
**4.3.A — Gateway abstraction**
- Buat adapter WhatsApp gateway (Waha / Whapi / provider lain) di satu service
- Fail-safe: kegagalan gateway tidak menjatuhkan transaksi inti
- Pesan bahasa Indonesia operasional-friendly

**4.3.B — Reminder runner**
- Job / cron internal terpisah per jenis:
  - booking expiry reminder
  - invoice due reminder
  - checkout reminder
- Idempotency guard agar event yang sama tidak spam

**4.3.C — Notification log**
- Simpan hasil kirim:
  - type
  - target tenant
  - channel
  - payload ringkas
  - status sukses/gagal
  - waktu kirim
- Minimal cukup untuk troubleshooting, tidak harus dashboard besar dulu

#### Frontend — ACT rinci
- Portal tenant menampilkan badge reminder ringan:
  - booking hampir habis
  - invoice jatuh tempo dekat
  - checkout mendekat
- Backoffice cukup punya indikator bahwa reminder terkirim / gagal bila data tersedia

#### Acceptance criteria fase 4.3
- Reminder terkirim hanya untuk entitas aktif yang relevan
- Tidak ada spam untuk event yang sama
- Tenant melihat reminder yang konsisten antara portal dan pesan WhatsApp
- Kegagalan gateway tidak menjatuhkan flow bisnis utama

---

### ⬜ Fase 4.4 — Marketing Display & Registrasi Fleksibel

**Tujuan:** membuat surface publik lebih kuat untuk konversi booking dan membuat onboarding tenant lebih realistis di lapangan.

#### Scope resmi fase ini
1. Galeri / gambar kamar
2. Detail kamar publik
3. Registrasi fleksibel via email atau nomor HP
4. Soft delete akun tenant
5. Update frontend public/auth/portal yang relevan

#### Backend — ACT rinci
**4.4.A — Room gallery**
- Tambah dukungan `images` pada room
- Tentukan aturan:
  - array URL / file key
  - urutan gambar
  - placeholder bila kosong
- `GET /public/rooms` boleh mengirim thumbnail / first image
- `GET /public/rooms/:id` mengirim detail penuh + galeri

**4.4.B — Registrasi fleksibel**
- Perluas auth agar calon tenant bisa register dengan:
  - email
  - atau nomor HP
- Normalisasi nomor HP
- Uniqueness check email/HP
- Error message tetap generik dan operasional-friendly

**4.4.C — Soft delete akun**
- Endpoint deactivate akun tenant sendiri
- Implementasi tetap `isActive = false`
- Histori bisnis tetap utuh untuk audit

#### Frontend — ACT rinci
**Public**
- Tambah halaman detail kamar publik:
  - galeri
  - tarif
  - term
  - highlight fasilitas
  - CTA booking / login / register
- Katalog `/rooms` terhubung ke detail room publik

**Auth**
- Form registrasi menerima email atau HP
- Copywriting harus jelas bahwa salah satu wajib

**Portal**
- Opsi **Hapus Akun Saya** / nonaktifkan akun
- Konfirmasi dua langkah agar tidak salah klik

#### Acceptance criteria fase 4.4
- Kamar publik bisa dilihat lebih lengkap dan menarik
- Register fleksibel berjalan tanpa mematahkan auth existing
- Akun tenant bisa dinonaktifkan tanpa menghapus histori
- Public flow tetap jujur bila data gambar belum ada

---

### ⬜ Fase 4.5 — Tenant Self-Service Lanjutan

**Tujuan:** memberi tenant kontrol lanjutan yang aman, tetapi tetap menjaga approval operasional di sisi admin.

#### Scope resmi fase ini
1. Pengajuan perpanjangan stay oleh tenant
2. Forgot password
3. Reset password self-service
4. Riwayat request dan feedback status di portal

#### Backend — ACT rinci
**4.5.A — Tenant renew request**
- `POST /tenant/stays/renew`
- Tenant mengajukan:
  - stay aktif target
  - pricing term baru
  - tanggal akhir baru (opsional, sesuai model bisnis)
  - catatan
- Admin review request terpisah:
  - approve
  - reject
- Jika approve:
  - reuse fondasi renewal existing
  - extend stay aktif
  - buat invoice renewal `DRAFT`

**4.5.B — Forgot / reset password**
- `POST /auth/forgot-password`
  - response generik
  - kirim token / OTP ke kanal akun
- `POST /auth/reset-password`
  - token sekali pakai
  - masa berlaku jelas
  - update `passwordChangedAt`

#### Frontend — ACT rinci
**Portal**
- Tombol **Perpanjang Stay** pada stay aktif
- Form renew request sederhana dan tenant-first
- Halaman / section status request:
  - menunggu review
  - disetujui
  - ditolak

**Auth**
- Halaman **Lupa Password**
- Halaman **Reset Password**
- Copywriting netral dan aman

#### Acceptance criteria fase 4.5
- Tenant dapat mengajukan renewal tanpa menyentuh flow operator existing
- Admin tetap memegang persetujuan akhir
- Forgot/reset password aman dan tidak membocorkan eksistensi akun
- UAT self-service berjalan tanpa kebocoran ke surface backoffice

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

---

## 2026-04-23 — Addendum Status Nyata Pasca UAT Parsial & Refactor

### A. Posisi nyata proyek setelah UAT parsial
- V4 Fase 4.0 sudah memiliki bukti UAT parsial:
  - katalog publik `/rooms` aman
  - `/rooms` untuk ADMIN tetap mengarah ke backoffice
  - tenant berhasil membuat booking baru
- V4 Fase 4.1 juga sudah disentuh melalui approval booking, tetapi masih ditemukan bug integrasi nyata:
  - tanggal booking/expiry sempat hilang dari surface
  - approval booking sempat memicu `409` karena expiry/data tanggal
  - modal frontend sempat tidak menutup setelah aksi sukses

### B. Patch korektif yang dibuat sesudah temuan UAT
- backend:
  - fix kalkulasi `expiresAt` ke akhir hari
  - fix serialisasi `Date`
  - fix konsistensi `issuedAt` pada approval payment/invoice
- frontend:
  - patch invalidation + close-modal pada flow review pembayaran dibahas/disiapkan
- patch korektif ini bertujuan menstabilkan slice aktif, bukan membuka fase baru secara resmi

### C. Refactor struktur source
- backend dan frontend sama-sama sudah mulai direfactor agar file source manual besar lebih kecil dan lebih mudah dipatch
- refactor tidak mengubah hierarki source of truth dan tidak otomatis mengubah status fase

### D. Keputusan eksekusi
- 4.2 boleh diprototipekan untuk debugging blocker integrasi, tetapi **belum boleh dianggap baseline resmi**
- Gate 1 (UAT 4.0) dan Gate 2 (UAT 4.1) tetap menjadi pagar resmi sebelum 4.2 dinyatakan dibuka

---

## 2026-04-24 — Addendum Eksekusi Pasca Deep Patch

### A. Posisi kerja terbaru
Setelah batch deep patch terbaru, fase 4.2 tidak lagi sekadar blueprint murni. Pada source/artifact kerja sudah mulai ada:
- kontrak payment submission yang bergerak ke target-aware (`INVOICE | DEPOSIT`)
- hardening approval invoice agar patuh pada constraint `InvoiceLine` hanya boleh diubah saat `DRAFT`
- cleanup expiry booking yang lebih agresif
- UX frontend yang lebih jujur untuk kewajiban pembayaran booking

### B. Implikasi terhadap execution plan
Urutan resmi **tidak berubah**, tetapi status 4.2 kini dibaca sebagai:
- source patch tersedia
- membutuhkan sinkronisasi schema/generate Prisma di lokal
- membutuhkan build lokal penuh
- membutuhkan UAT end-to-end sebelum boleh dianggap baseline resmi

### C. Fokus praktis setelah sinkronisasi docs ini
1. Backend lokal:
   - sync schema
   - `prisma generate`
   - `db push` / migration yang sesuai
   - build backend
2. Frontend lokal:
   - install dependencies
   - build frontend
3. Tutup UAT 4.0 + 4.1 regression
4. Lanjut UAT 4.2:
   - submit bukti bayar
   - approve / reject
   - partial
   - expiry
   - activation sync

### D. Interpretasi status
Jika ada tabel lama yang masih menulis beberapa item 4.2 sebagai `⬜`, bacalah sebagai:
- **belum diverifikasi / belum resmi**
- bukan berarti source patch sama sekali tidak ada


---

## 2026-04-26 — Addendum Eksekusi Phase 4.3-A PASS

### A. Status yang sudah selesai
**Phase 4.3-A — Reminder Preview** sudah selesai dan manual retest PASS.

Backend:
- `reminder-preview.service.ts`
- `reminder-preview.controller.ts`
- `notifications.module.ts`
- `app.module.ts`

Frontend:
- `src/api/reminders.ts`
- `src/pages/reminders/ReminderPreviewPage.tsx`
- route `/reminders`
- nav entry **Pengingat WhatsApp** untuk OWNER/ADMIN

### B. Acceptance 4.3-A
- ADMIN melihat menu **Pengingat WhatsApp**.
- Klik menu masuk `/reminders`.
- 4 kartu preview tampil.
- Candidate checkout dapat muncul.
- TENANT tidak melihat menu.
- Tidak ada tombol Kirim/Send.
- Tidak ada WhatsApp send.
- Tidak ada `NotificationLog` write.
- Tidak ada scheduler.

### C. Status 4.3 setelah A
| Subfase | Status |
|---|---|
| 4.3-A Reminder Preview | ✅ PASS |
| 4.3-B Reminder Queue / Mock Send | ⏭️ Next |
| 4.3-C Real WhatsApp Provider | ⬜ Pending |
| 4.3-D Scheduler / Cron | ⬜ Pending |
| 4.3-E Portal tenant reminder badge | ⬜ Pending |

### D. ACT berikutnya — 4.3-B Reminder Queue / Mock Send
Scope yang disarankan:
1. Gunakan kandidat dari preview.
2. Tambahkan aksi mock send yang hanya mensimulasikan hasil kirim.
3. Jika schema `NotificationLog` sudah aman, boleh tulis log mock; jika belum, return mock result tanpa side effect permanen.
4. Tidak ada provider WhatsApp asli.
5. Tidak ada scheduler.
6. Tidak ada external credential.
7. Tidak ada tombol send real.

### E. Retest setelah 4.3-B
- Preview tetap berjalan.
- Mock send tidak mengirim WhatsApp sungguhan.
- Mock result jelas untuk admin.
- Tidak ada duplikasi log untuk event yang sama jika log digunakan.
- TENANT tetap tidak melihat menu.
- Build backend/frontend PASS.
