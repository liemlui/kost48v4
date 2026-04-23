# KOST48 — Final Frontend Feature Set (Updated)

**Versi:** 2026-04-23 (Pasca refactor struktur frontend + catatan sinkronisasi status gate)

## Ringkasan
Frontend ini adalah workspace untuk **backoffice** dan **tenant portal** KOST48, dengan tambahan surface publik untuk mendukung **booking mandiri tenant** pada V4 Fase 4.0.

Stack utama:
- **Vite + React 18 + TypeScript**
- **React-Bootstrap**
- **TanStack Query**

Frontend dijaga tetap:
- **role-first**
- **tenant-first di portal**
- **compact over clutter**
- **jujur terhadap kontrak backend yang benar-benar tersedia**

---

## Role & Workspace

### 1. Guest / Public
- Dapat mengakses katalog kamar publik melalui `/rooms`
- Dapat melihat kamar aktif yang tersedia
- Dapat diarahkan ke login/register sebelum membuat booking

### 2. OWNER / ADMIN / STAFF
- Menggunakan workspace **backoffice**
- Surface tetap dipisahkan berdasarkan role
- Tetap memakai route dan shell operasional yang sudah ada

### 3. TENANT
- Menggunakan **tenant portal**
- Melihat informasi hunian, tagihan, tiket, pengumuman, profil, dan sekarang juga **pemesanan/booking**

---

## Fitur Inti Backoffice

### 1. Dashboard Operasional
- Dashboard terpisah per role (Owner/Admin/Staff)
- KPI kamar terisi / kosong
- Stay aktif & reminder checkout
- Invoice overdue & due soon
- Deposit queue
- Tabel pemantauan stay dan invoice prioritas

### 2. Tenants & Portal Access
- CRUD tenant
- Filter tenant aktif & pencarian
- Guard UI untuk tenant dengan stay aktif
- **Portal Access Management (OWNER/ADMIN only):**
  - Lihat status portal tenant
  - Buat akun portal
  - Toggle aktif/nonaktif akses portal
  - Reset password portal

### 3. Rooms
- CRUD room
- Status kamar dan info tenant aktif
- Guard UI untuk room yang sedang ditempati

### 4. Stays
- List stay aktif untuk operasional existing
- Filter status dan pencarian
- Check-in wizard multi-step
- Detail stay dengan tab:
  - **Info**
  - **Meteran**
  - **Keuangan**
  - **Catatan**
- Aksi existing:
  - Checkout
  - Perpanjang Stay
  - Batalkan Stay
  - Proses Deposit

### 5. Invoices
- List invoice dengan filter status, keyword, rentang tanggal
- Detail invoice dengan line items & riwayat pembayaran
- Issue invoice dari draft
- Batalkan invoice

### 6. Invoice Payments
- CRUD pembayaran invoice
- Blokir overpay di UI
- Preview status setelah pembayaran

### 7. Tickets
- List tiket dengan filter status & pencarian
- Assign ticket ke staff/admin
- Update progress dan penutupan tiket
- Backoffice fokus pada tindak lanjut, bukan create ticket utama

### 8. Announcements
- CRUD pengumuman
- Audience, publish, pinned, masa berlaku

### 9. Meter Readings
- CRUD pembacaan meter listrik & air
- Tersedia sebagai modul dan embedded di detail stay

### 10. Inventory
- **Inventory Items**
- **Room Items**
- **Inventory Movements**

### 11. WiFi Sales
- Pencatatan penjualan paket WiFi

### 12. Expenses
- Pencatatan pengeluaran operasional

### 13. Users
- Manajemen akun & role
- Admin tidak dapat mengedit/menghapus Owner, dan tidak dapat mengubah role menjadi OWNER

---

## Fitur Tenant Portal

### 1. Pengumuman
- Daftar pengumuman aktif untuk tenant
- Pinned badge & tanggal berlaku

### 2. Hunian Saya
- Informasi stay aktif
- Kamar, sewa, deposit, rencana checkout
- Fokus pada data yang relevan untuk tenant
- Tidak lagi menonjolkan tarif alternatif kamar yang kurang relevan

### 3. Tagihan Saya
- Daftar invoice tenant dengan status & overdue
- Ringkasan total, belum lunas, overdue

### 4. Tiket Saya
- Daftar tiket tenant
- Buat tiket baru tanpa input ID teknis
- Pantau progres tiket

### 5. Profil Saya
- Lihat profil sendiri
- Ganti password sesuai kontrak backend

### 6. Pemesanan Saya (**V4 Fase 4.0**)
- Halaman tenant untuk melihat booking milik sendiri
- Menampilkan:
  - kamar
  - tanggal check-in
  - pricing term
  - tarif disepakati / tarif utama yang relevan
  - masa berlaku booking (`expiresAt`)
- Empty/loading/error state aman
- Tenant tidak diminta mengisi ID teknis

---

## Surface Publik Baru (V4 Fase 4.0)

### 1. Katalog Kamar Publik — `/rooms`
- Guest dan tenant dapat melihat kamar aktif yang tersedia
- Menampilkan:
  - kode / nama kamar
  - lantai
  - tarif utama yang relevan
  - term tersedia
  - tombol **Pesan Sekarang**
- Mendukung pencarian dan filter yang aman
- Bila gambar belum tersedia, memakai placeholder netral

### 2. Resolver Route `/rooms`
- Route `/rooms` sekarang mendukung dua surface:
  - **Backoffice rooms** untuk OWNER / ADMIN / STAFF
  - **Katalog publik** untuk guest / TENANT
- Tujuannya menjaga route existing tetap hidup tanpa mematahkan flow lama

### 3. Form Booking Tenant — `/booking/:roomId`
- Hanya untuk tenant yang login
- Menampilkan ringkasan kamar + form booking dalam satu layar
- Field dapat mencakup:
  - `checkInDate`
  - `pricingTerm`
  - `plannedCheckOutDate`
  - `stayPurpose`
  - `notes`
- Submit terhubung ke kontrak backend booking mandiri
- Setelah sukses, tenant diarahkan ke **Pemesanan Saya**

---

## Surface Backoffice Baru untuk Booking Reserved (V4 Fase 4.0)

### Booking Reserved Read-Only
- Tidak dibuat menu besar baru
- Di-embed sebagai mode/filter tambahan di halaman **Stays**
- Menampilkan booking dengan karakteristik:
  - stay masih aktif secara booking
  - kamar berstatus `RESERVED`
- Surface ini **read-only**
- Belum membuka approval admin, edit kontrak, atau payment flow

---

## Sinkronisasi Kontrak Frontend

Frontend ini sudah diselaraskan dengan kontrak aktif berikut:
- `cancelReason` untuk cancel stay
- login error generik
- password portal minimal 8 karakter
- role-aware global search
- `RoomStatus.RESERVED`
- `Stay.expiresAt`
- endpoint booking mandiri:
  - `GET /public/rooms`
  - `POST /tenant/bookings`
  - `GET /tenant/bookings/my`

Yang **belum** dibuka:
- payment submission / approval (Fase 4.2)
- notifikasi / reminder WhatsApp (Fase 4.3)
- registrasi fleksibel email/HP (Fase 4.4)
- forgot/reset password self-service tenant (Fase 4.5)

---

## Target Frontend Berikutnya (Belum Live)

### Fase 4.2 — Payment Submission Surface
**Portal tenant:**
- tombol **Upload Bukti Bayar** pada booking yang `Menunggu Pembayaran`
- form upload proof + nominal + tanggal bayar + metode + reference number
- riwayat submission dan status:
  - Menunggu Review
  - Ditolak
  - Lunas / Aktif

**Backoffice:**
- queue verifikasi pembayaran
- preview proof
- modal approve / reject
- refresh sinkron ke stays / invoices / dashboard

### Fase 4.3 — Reminder Surface
**Tenant portal:**
- badge booking hampir habis
- badge invoice due soon
- badge checkout mendekat

**Backoffice ringan:**
- indikator reminder terkirim / gagal bila payload tersedia

### Fase 4.4 — Marketing & Flexible Registration Surface
**Public:**
- halaman detail kamar publik dengan galeri
- CTA login / register / booking lebih kuat

**Auth:**
- form registrasi menerima email atau nomor HP
- copywriting yang jujur: salah satu wajib

**Portal tenant:**
- opsi nonaktifkan / hapus akun sendiri (soft delete)

### Fase 4.5 — Self-Service Tenant Surface
**Portal tenant:**
- tombol **Perpanjang Stay**
- form request renew
- daftar status request renew

**Auth:**
- halaman **Lupa Password**
- halaman **Reset Password**

## UI/UX

- Sidebar desktop + offcanvas mobile
- Breadcrumb topbar
- Page header konsisten
- Status badge Bahasa Indonesia
- Format Rupiah
- Empty state dengan ikon & CTA
- Skeleton / loading state aman
- Responsive layout
- Navigasi utama di sidebar
- Modul kecil tetap di-embed jika lebih tepat
- Tenant portal dijaga sederhana dan tidak bocor ke surface backoffice

---

## Status Terkini & Catatan Penting

### ✅ Sudah Ditutup
- Status `PENDING` telah dihapus dari UI aktif
- `activateStay` legacy dihapus
- Portal access reactivity dibenahi
- Login redirect sudah role-aware
- Global Search sudah role-aware
- Cancel stay memakai `cancelReason`
- Tenant portal lebih jujur dan sederhana
- V4 Fase 4.0 frontend sudah masuk:
  - `/rooms`
  - `/booking/:roomId`
  - `/portal/bookings`
  - booking reserved read-only di backoffice

### ⏳ Belum Dibuka
- Approval booking admin
- Upload bukti bayar booking
- Aktivasi otomatis `RESERVED` → `OCCUPIED`
- Reminder / notifikasi WhatsApp
- Galeri kamar publik penuh
- Registrasi fleksibel email / nomor HP
- Self-service forgot/reset password tenant

### ⚠️ Catatan
- Route `/rooms` sekarang memegang dua surface berbeda, sengaja untuk menjaga kompatibilitas route lama
- Booking reserved di backoffice masih read-only
- Warning bundle size dari Vite masih bisa muncul, tetapi bukan blocker build/runtime

---

## Catatan Paket
Zip final frontend berisi:
- source code frontend lengkap
- artifact build yang lolos kompilasi
- dokumen frontend yang sinkron dengan patch terbaru

---

## Update Sinkronisasi Frontend — 2026-04-23 (Refactor + Catatan Prototype 4.2)

### Yang baru secara struktur
- Source frontend sudah mulai direfactor agar file besar lebih mudah dirawat:
  - konfigurasi resource dipecah per domain
  - `CheckInWizard` dipecah ke constants/types/sections
- Tujuan refactor ini adalah kerapian source, bukan pembukaan fase bisnis baru

### Catatan penting tentang 4.2
- Beberapa surface/payment review sempat diprototipekan di source selama debugging integrasi
- Namun status resmi frontend **tetap**:
  - 4.0 dan 4.1 adalah slice aktif yang harus lolos UAT
  - 4.2 belum boleh dianggap baseline live penuh sampai gate resmi lolos
- Jika ada file/source 4.2 yang sudah ada di repo, perlakukan sebagai:
  - prototype / exploratory patch
  - belum authoritative untuk status proyek
