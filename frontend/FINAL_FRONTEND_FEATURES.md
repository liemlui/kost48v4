# KOST48 — Final Frontend Feature Set (Updated)

**Versi:** 2026-04-21 (Sinkronisasi dengan Frontend V4 Fase 4.0 + 4.1B Approval Surface)

## Ringkasan

Frontend KOST48 adalah workspace gabungan untuk **backoffice**, **tenant portal**, dan kini juga **surface publik terbatas** untuk mendukung flow **booking mandiri tenant** dan **approval booking backoffice** pada roadmap V4.

Frontend ini dibangun dengan prinsip:
- **role-first**
- **tenant-first di portal**
- **compact over clutter**
- **jujur terhadap kontrak backend yang benar-benar tersedia**
- **patch pragmatis, bukan rewrite total**

Stack utama:
- **Vite + React 18 + TypeScript**
- **React-Bootstrap**
- **TanStack Query**

Route, tipe data, label status, dan surface utama frontend telah diselaraskan dengan kontrak aktif proyek, termasuk dukungan terhadap:
- `RoomStatus.RESERVED`
- `Stay.expiresAt`
- `GET /public/rooms`
- `POST /tenant/bookings`
- `GET /tenant/bookings/my`
- `PATCH /admin/bookings/:stayId/approve`

---

## Role & Workspace

### 1. Guest / Public
Guest dapat mengakses katalog kamar publik melalui route `/rooms`. Surface ini dipakai untuk menampilkan kamar aktif yang tersedia dan menjadi pintu masuk flow booking mandiri.

### 2. OWNER / ADMIN / STAFF
Role backoffice tetap memakai workspace operasional utama. Route `/rooms` untuk mereka tetap membuka surface rooms backoffice, bukan katalog publik.

### 3. TENANT
Tenant memakai **portal tenant** untuk kebutuhan harian seperti hunian, tagihan, tiket, pengumuman, profil, dan kini juga **pemesanan/booking**.

Pemisahan role tetap dijaga agar portal tenant tidak bocor ke surface backoffice.

---

## Fitur Inti Backoffice

### 1. Dashboard Operasional
Dashboard dipisahkan per role:
- **Owner Dashboard**
- **Admin Dashboard**
- **Staff Dashboard**

Fungsinya meliputi:
- KPI kamar terisi / kosong
- stay aktif dan reminder operasional
- invoice overdue / due soon
- deposit queue
- tabel pemantauan stay dan invoice prioritas

Batch pagination + UAT readiness juga menyesuaikan fetch limit agar pembacaan data besar lebih realistis.

### 2. Tenants & Portal Access
Modul tenant mendukung:
- CRUD tenant
- pencarian
- filter tenant aktif
- guard UI untuk tenant yang sedang punya stay aktif

Untuk **OWNER / ADMIN**, tersedia **Portal Access Management**:
- lihat portal summary tenant
- buat akun portal
- toggle aktif/nonaktif akses portal
- reset password portal

Relasi tenant ↔ user tenant dibuat lebih jujur dan mudah dibaca dari context tenant.

### 3. Rooms
Modul room mendukung:
- CRUD room
- status kamar
- info tenant aktif
- guard UI untuk room yang sedang ditempati

Route `/rooms` kini mendukung **dua surface**:
- backoffice rooms untuk OWNER / ADMIN / STAFF
- katalog publik untuk guest / TENANT

Keputusan ini menjaga kompatibilitas route lama tanpa mematahkan flow baru.

### 4. Stays
Modul stay tetap menjadi pusat flow operasional existing:
- list stay aktif
- filter status dan pencarian
- check-in wizard multi-step
- detail stay dengan tab:
  - **Info**
  - **Meteran**
  - **Keuangan**
  - **Catatan**

Aksi existing yang masih aktif:
- Checkout
- Perpanjang Stay
- Batalkan Stay
- Proses Deposit

Selain itu, halaman stays kini juga memuat:
- **surface read-only booking reserved**
- **queue approval booking**
- **modal approval booking**

Semua ini di-embed ke surface existing agar tidak membuka menu besar baru.

### 5. Invoices
Modul invoice mendukung:
- list invoice dengan filter status, keyword, dan rentang tanggal
- detail invoice dengan line items dan riwayat pembayaran
- issue invoice dari draft
- batalkan invoice

Invoice tetap mengikuti baseline bahwa total dikelola otomatis dari `InvoiceLine`, dan frontend hanya membaca kontrak yang ada tanpa memalsukan angka.

### 6. Invoice Payments
Modul pembayaran invoice mendukung:
- CRUD pembayaran
- blokir overpay di UI
- preview status invoice setelah pembayaran

Flow ini masih memakai mekanisme pembayaran existing, bukan payment submission V4.

### 7. Tickets
Backoffice ticket difokuskan untuk tindak lanjut operasional:
- list tiket
- filter status
- assign ke staff/admin
- update progress
- penutupan tiket

Backoffice bukan lagi surface utama untuk create ticket tenant; create ticket tenant diarahkan ke portal tenant sesuai redesign tenant-first.

### 8. Announcements
Modul pengumuman mendukung:
- CRUD announcement
- audience
- publish
- pinned
- masa berlaku

### 9. Meter Readings
Modul meter readings mendukung:
- CRUD pembacaan meter listrik dan air
- penggunaan sebagai modul terpisah
- embedding di detail stay / room bila diperlukan

### 10. Inventory
Modul inventory mencakup:
- **Inventory Items**
- **Room Items**
- **Inventory Movements**

### 11. WiFi Sales
Modul WiFi Sales mendukung pencatatan penjualan paket WiFi dan integrasi dasar ke invoice sesuai fase yang sudah selesai.

### 12. Expenses
Modul expenses mendukung pencatatan pengeluaran operasional.

### 13. Users
Modul users mendukung manajemen akun dan role, dengan pembatasan keamanan bahwa admin tidak dapat:
- mengedit akun owner
- menghapus akun owner
- mengubah role menjadi OWNER

---

## Fitur Tenant Portal

### 1. Pengumuman
Tenant dapat melihat daftar pengumuman aktif yang relevan untuk mereka, termasuk pinned badge dan tanggal berlaku.

### 2. Hunian Saya
Tenant dapat melihat stay aktif mereka, termasuk:
- kamar
- sewa
- deposit
- rencana checkout

Surface ini dijaga tetap sederhana dan hanya menampilkan data yang relevan untuk tenant.

### 3. Tagihan Saya
Tenant dapat melihat daftar invoice sendiri, termasuk:
- status invoice
- overdue state
- ringkasan total
- sisa pembayaran

### 4. Tiket Saya
Tenant dapat:
- melihat daftar tiket sendiri
- membuat tiket baru tanpa input ID teknis
- memantau progres tiket

Ini mengikuti pendekatan tenant-first di mana context tiket otomatis diisi dari tenant/stay/room yang sesuai.

### 5. Profil Saya
Tenant dapat melihat profil sendiri dan mengganti password sesuai kontrak backend yang tersedia.

### 6. Pemesanan Saya (V4 Fase 4.0 + 4.1B)
Tenant kini memiliki halaman **Pemesanan Saya** di route `/portal/bookings`.

Halaman ini menampilkan:
- kamar
- tanggal check-in
- pricing term
- tarif utama / tarif relevan
- masa berlaku booking (`expiresAt`)
- status booking yang jujur:
  - **Menunggu Approval**
  - **Menunggu Pembayaran**

Tenant tidak diberi kesan kamar sudah aktif penuh / `OCCUPIED`, dan tidak diarahkan ke payment submission flow karena fase itu belum dibuka.

---

## Surface Publik Baru (V4 Fase 4.0)

### 1. Katalog Kamar Publik — `/rooms`
Guest dan tenant dapat melihat kamar aktif yang tersedia dari katalog publik.

Informasi utama yang ditampilkan:
- kode / nama kamar
- lantai
- tarif utama yang relevan
- daftar pricing term tersedia
- CTA **Pesan Sekarang**

Filter yang tersedia:
- `search`
- `floor`
- `pricingTerm`

Jika gambar belum tersedia, frontend memakai placeholder netral agar tetap jujur terhadap data yang benar-benar ada.

### 2. Resolver Route `/rooms`
Route `/rooms` bertindak sebagai resolver:
- backoffice user masuk ke workspace rooms existing
- guest / tenant masuk ke katalog publik

Keputusan ini menjaga kompatibilitas route lama dan menghindari duplikasi jalur yang membingungkan.

### 3. Form Booking Tenant — `/booking/:roomId`
Frontend menyediakan halaman booking tenant yang menampilkan ringkasan kamar dan form booking dalam satu layar.

Field yang didukung:
- `checkInDate`
- `pricingTerm`
- `plannedCheckOutDate`
- `stayPurpose`
- `notes`

Submit terhubung ke kontrak backend booking mandiri. Setelah sukses:
- query terkait di-refresh
- tenant diarahkan ke `/portal/bookings`

Error backend ditampilkan secara aman tanpa wording palsu.

---

## Surface Backoffice Baru untuk Approval Booking

### 1. Booking Reserved Read-Only
Surface booking reserved tetap di-embed ke halaman **Stays** sebagai mode/filter tambahan.

Karakteristiknya:
- stay masih aktif secara booking
- room berstatus `RESERVED`
- tidak otomatis membuka detail operasional penuh

### 2. Approval Booking Queue
Backoffice kini memiliki queue approval booking yang di-embed ke halaman **Stays** melalui mode **Booking Reserved**.

Queue ini menampilkan konteks manusiawi:
- tenant
- kamar
- check-in
- pricing term
- `expiresAt`
- status approval

Reserved booking yang sudah memiliki invoice awal tidak lagi terasa “masih menunggu approval”.

### 3. Approval Booking Modal
Backoffice memiliki modal approval booking yang terhubung ke endpoint backend existing:
- `PATCH /admin/bookings/:stayId/approve`

Field minimum:
- `agreedRentAmountRupiah`
- `depositAmountRupiah`
- `initialElectricityKwh`
- `initialWaterM3`

Validasi frontend bersifat defensif:
- semua field wajib angka valid
- meter tidak boleh negatif

Setelah approval sukses:
- query stays / invoices / dashboard terkait di-invalidasi
- queue approval menjadi sinkron
- flow tetap jujur dan tidak membuka payment submission

---

## Pagination & UAT Readiness Improvements

Batch terbaru juga menambahkan penyempurnaan untuk kesiapan UAT:

### 1. Server-Side Pagination
Pola fetch-all dengan limit besar mulai diganti ke pagination server-side yang lebih proper pada:
- `SimpleCrudPage`
- `StaysPage`
- `InvoicesPage`
- `ResourceTable`

Komponen `PaginationControls` ditambahkan untuk navigasi halaman.

### 2. Dashboard Data Fetch Tuning
Owner dan admin dashboard mendapat penyesuaian fetch limit yang lebih realistis untuk pembacaan data saat UAT.

### 3. Booking Reserved UX Guard
`StayDetailPage` membedakan booking mandiri dari stay operasional:
- booking reserved diberi info badge
- tombol aksi operasional disembunyikan
- stay operasional dengan room `OCCUPIED` tetap berjalan seperti biasa

---

## Sinkronisasi Kontrak Frontend

Frontend saat ini sudah diselaraskan dengan kontrak aktif berikut:
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
- endpoint approval booking:
  - `PATCH /admin/bookings/:stayId/approve`

Yang **belum** dibuka:
- payment submission / approval (Fase 4.2)
- notifikasi / reminder WhatsApp (Fase 4.3)
- registrasi fleksibel email/HP (Fase 4.4)
- forgot/reset password self-service tenant (Fase 4.5)

---

## UI/UX

Frontend memakai:
- sidebar desktop + offcanvas mobile
- breadcrumb topbar
- page header konsisten
- status badge Bahasa Indonesia
- format Rupiah
- empty state aman
- loading state / skeleton aman
- responsive layout
- navigasi role-aware
- embedding modul kecil jika lebih tepat daripada menjadikannya menu utama

Tenant portal tetap dijaga sederhana dan tidak bocor ke surface backoffice. Prinsip **honest UX** tetap dipertahankan, termasuk untuk booking reserved dan approval booking yang belum boleh terasa seperti flow pembayaran penuh.

---

## Status Terkini & Catatan Penting

### ✅ Sudah Ditutup
- Status `PENDING` dihapus dari UI aktif
- `activateStay` legacy dihapus
- portal access reactivity dibenahi
- login redirect sudah role-aware
- global search sudah role-aware
- cancel stay memakai `cancelReason`
- tenant portal lebih jujur dan sederhana
- frontend V4 Fase 4.0 sudah masuk:
  - `/rooms`
  - `/booking/:roomId`
  - `/portal/bookings`
  - booking reserved read-only di backoffice
- frontend V4 Fase 4.1B sudah masuk:
  - queue approval booking di `Stays`
  - modal approval booking
  - status tenant portal `Menunggu Approval` / `Menunggu Pembayaran`
- pagination + beberapa guard UAT readiness sudah ditambahkan

### ⏳ Belum Dinilai Lolos Penuh
- UAT end-to-end Fase 4.0 masih belum dinyatakan lolos penuh
- UAT approval booking Fase 4.1 juga masih belum dinyatakan lolos penuh
- Karena itu Fase 4.0 dan 4.1 masih berstatus ⏳, bukan freeze-ready penuh

### ⬜ Belum Dibuka
- upload bukti bayar booking
- aktivasi otomatis `RESERVED` → `OCCUPIED`
- reminder / notifikasi WhatsApp
- galeri kamar publik penuh
- registrasi fleksibel email / nomor HP
- self-service forgot/reset password tenant

### ⚠️ Catatan
- Route `/rooms` memegang dua surface berbeda
- booking reserved dan approval booking tetap di-embed ke surface existing, bukan menu besar baru
- warning bundle size dari Vite masih bisa muncul, tetapi bukan blocker build/runtime pada batch ini

---

## Catatan Paket

Zip final frontend idealnya memuat:
- source code frontend lengkap
- artifact build yang lolos kompilasi
- `CHANGELOG.md` yang diperbarui
- dokumen fitur ini yang sinkron dengan status resmi terbaru