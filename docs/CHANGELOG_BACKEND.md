# CHANGELOG_BACKEND.md

## Sinkronisasi Dokumen — 2026-04-22 (Blueprint Detail 4.2–4.5)

**Jenis perubahan:** dokumentasi saja, **bukan** patch source backend baru.

Dokumen yang diselaraskan:
- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHECKLIST.md`

Fokus sinkronisasi:
- memperinci kontrak `PaymentSubmission`
- memperinci reminder WhatsApp dan logging notifikasi
- memperinci room gallery, public room detail, registrasi fleksibel, soft delete akun
- memperinci tenant renew request dan forgot/reset password self-service
- menjaga kejujuran status: 4.2–4.5 **belum live**, baru blueprint implementasi

---

## Ringkasan
Batch patch backend ini menyelesaikan slice **V4 Fase 4.0 backend** untuk booking mandiri tenant, dengan fokus pada endpoint yang diminta:
- `GET /public/rooms`
- `POST /tenant/bookings`
- `GET /tenant/bookings/my`

Selain endpoint baru, batch ini juga menutup **drift prasyarat 4.0.1** yang masih tersisa di artifact ZIP:
- `RoomStatus.RESERVED` diselaraskan kembali di source-of-truth lokal
- `Stay.expiresAt` ditambahkan kembali di schema lokal agar sejalan dengan roadmap booking mandiri

Pendekatan implementasi dijaga tetap sempit: **tidak membuka Fase 4.1+, tidak menyentuh frontend, tidak membuka debt flow, scheduler umum, redesign accounting, atau rewrite total**.

## Scope Patch Batch Ini
1. **ACT 4.0.2 — `GET /public/rooms`**
   - Endpoint publik untuk katalog kamar aktif yang masih `AVAILABLE`
   - Mendukung pagination dasar, pencarian, filter lantai, dan filter `pricingTerm`
   - Mengembalikan ringkasan kamar + tarif + term yang tersedia

2. **ACT 4.0.3 — `POST /tenant/bookings` (DTO + validasi awal)**
   - DTO baru untuk booking tenant (`roomId`, `checkInDate`, `pricingTerm`, optional `plannedCheckOutDate`, `stayPurpose`, `notes`)
   - Validasi awal untuk tanggal dan struktur payload
   - Guard role TENANT + validasi tenant context

3. **ACT 4.0.4 — `POST /tenant/bookings` (transaksi atomik)**
   - Booking dibuat dalam `prisma.$transaction()`
   - Baris room dilock (`FOR UPDATE`) untuk memperkecil race condition
   - Room diubah ke `RESERVED`
   - Stay booking dibuat sebagai `ACTIVE` dengan `expiresAt`, deposit/tarif default dari room, dan `bookingSource = WEBSITE`
   - Audit log booking dibuat di dalam transaksi yang sama

4. **ACT 4.0.5 — `GET /tenant/bookings/my`**
   - Endpoint tenant untuk melihat booking miliknya yang masih aktif pada kamar berstatus `RESERVED`
   - Mendukung pagination dan pencarian ringan berdasarkan kode/nama kamar

## File Utama yang Diubah / Dibuat
### Diubah
- `src/app.module.ts`
- `src/common/enums/app.enums.ts`
- `prisma/schema.prisma`
- `prisma/schema - Copy.txt`
- `CHANGELOG_BACKEND.md`

### Dibuat
- `src/modules/tenant-bookings/tenant-bookings.module.ts`
- `src/modules/tenant-bookings/tenant-bookings.service.ts`
- `src/modules/tenant-bookings/tenant-bookings.controller.ts`
- `src/modules/tenant-bookings/public-rooms.controller.ts`
- `src/modules/tenant-bookings/dto/create-tenant-booking.dto.ts`
- `src/modules/tenant-bookings/dto/public-rooms-query.dto.ts`
- `src/modules/tenant-bookings/dto/tenant-bookings-query.dto.ts`

## Detail Perubahan

### 1) App Wiring
#### `src/app.module.ts`
- Menambahkan `TenantBookingsModule` ke dalam aplikasi utama.

### 2) Enum Aplikasi
#### `src/common/enums/app.enums.ts`
- `RoomStatus` sekarang kembali memuat `RESERVED` agar sinkron dengan roadmap booking mandiri V4.

### 3) Schema Source of Truth Lokal
#### `prisma/schema.prisma`
- Enum `RoomStatus` ditambah `RESERVED`
- Model `Stay` ditambah field `expiresAt`
- Menambah index `@@index([expiresAt])`

#### `prisma/schema - Copy.txt`
- Diselaraskan dengan schema utama untuk mencegah drift lokal.

### 4) Modul Baru — Tenant Bookings
#### `src/modules/tenant-bookings/public-rooms.controller.ts`
- Menambahkan `GET /public/rooms`
- Endpoint ini tidak memakai auth guard dan ditujukan sebagai katalog publik kamar

#### `src/modules/tenant-bookings/tenant-bookings.controller.ts`
- Menambahkan controller `tenant/bookings`
- `POST /tenant/bookings` hanya untuk role `TENANT`
- `GET /tenant/bookings/my` hanya untuk role `TENANT`

#### `src/modules/tenant-bookings/dto/create-tenant-booking.dto.ts`
- DTO booking tenant baru:
  - `roomId`
  - `checkInDate`
  - `pricingTerm`
  - `plannedCheckOutDate?`
  - `stayPurpose?`
  - `notes?`

#### `src/modules/tenant-bookings/dto/public-rooms-query.dto.ts`
- Query DTO untuk katalog publik kamar:
  - pagination
  - `search?`
  - `floor?`
  - `pricingTerm?`

#### `src/modules/tenant-bookings/dto/tenant-bookings-query.dto.ts`
- Query DTO untuk list booking tenant:
  - pagination
  - `search?`

#### `src/modules/tenant-bookings/tenant-bookings.service.ts`
Implementasi inti batch ini:

**A. `getPublicRooms()`**
- Mengambil kamar dengan syarat:
  - `isActive = true`
  - `status = AVAILABLE`
- Mendukung pencarian kode/nama kamar
- Mendukung filter lantai dan `pricingTerm`
- Mengembalikan:
  - ringkasan data kamar
  - struktur tarif
  - `highlightedPricingTerm`
  - `highlightedRateRupiah`
  - daftar `availablePricingTerms`

**B. `createBooking()`**
- Validasi tenant context:
  - user TENANT harus punya `tenantId`
  - tenant harus ada dan aktif
- Validasi payload:
  - `checkInDate` tidak boleh di masa lalu
  - `plannedCheckOutDate` tidak boleh sebelum `checkInDate`
- Guard bisnis:
  - tenant tidak boleh punya stay aktif lain
  - room harus ada, aktif, dan berstatus `AVAILABLE`
  - room tidak boleh sudah punya stay aktif lain
- Transaksi atomik:
  - lock room row (`FOR UPDATE`)
  - hitung tarif dari room sesuai `pricingTerm`
  - hitung `expiresAt` dengan rule aman:
    - gunakan H-10 jika booking masih jauh dari tanggal check-in
    - fallback ke H-1 jika tanggal check-in sudah dekat
    - fallback ke hari ini jika hasil perhitungan sudah lewat
  - update room menjadi `RESERVED`
  - insert stay booking dengan:
    - `status = ACTIVE`
    - `bookingSource = WEBSITE`
    - default deposit/tarif utilitas dari room
    - `createdById = user.id`
  - audit log `CREATE_BOOKING` dibuat di transaksi yang sama

**C. `findMine()`**
- Mengambil booking milik tenant dengan filter:
  - `tenantId = user.tenantId`
  - `Stay.status = ACTIVE`
  - `Room.status = RESERVED`
- Mengembalikan ringkasan booking + info tenant + info room
- Mendukung pagination dan pencarian ringan

### 5) Kenapa Raw SQL Dipakai pada Sebagian Flow
Pada artifact ZIP ini, generated Prisma client yang ikut tersimpan masih belum sinkron penuh terhadap `RESERVED` dan `Stay.expiresAt`. Karena `prisma generate` tidak bisa dijalankan di container (lihat bagian verifikasi), implementasi endpoint booking memakai kombinasi:
- Prisma biasa untuk flow yang masih kompatibel
- raw SQL terparameterisasi untuk bagian yang membutuhkan field/enum baru (`RESERVED`, `expiresAt`)

Tujuannya: **batch ini tetap buildable dan endpoint booking tetap nyata**, tanpa memaksakan rewrite besar atau berhenti hanya karena environment generate Prisma gagal.

## Perubahan yang Sengaja Tidak Dibuka
- Tidak membuka **Fase 4.1+**
- Tidak membuat approval booking admin
- Tidak membuat invoice booking awal
- Tidak membuat payment submission flow
- Tidak membuat scheduler expiry umum
- Tidak menyentuh frontend
- Tidak membuka redesign accounting / debt flow

## Verifikasi yang Dijalankan
### Berhasil
- `npm install --ignore-scripts`
- `npm run build`

### Dicoba tetapi gagal karena keterbatasan environment container
- `npx prisma generate`
  - Gagal karena Prisma CLI mencoba mengunduh `schema-engine` dari `binaries.prisma.sh`, sementara environment kerja ini tidak memiliki akses jaringan yang diperlukan.

## Dampak Integrasi / Catatan Operasional
1. **Endpoint baru tersedia di backend source:**
   - `GET /public/rooms`
   - `POST /tenant/bookings`
   - `GET /tenant/bookings/my`

2. **Artifact build backend tetap lolos**, tetapi generated Prisma client di source repo masih artifact lama. Untuk sinkronisasi penuh di mesin lokal Anda setelah download ZIP ini, jalankan:

```powershell
npx prisma generate
```

3. Karena schema source-of-truth ikut diselaraskan (`RESERVED`, `expiresAt`), bila database lokal/dev Anda belum memuat perubahan 4.0.1, Anda perlu menyelaraskannya sebelum UAT booking:

```powershell
# sesuai kebijakan proyek untuk konteks DEV saja bila memang perlu reset
npx prisma db push --force-reset
# lalu jalankan lagi sql/bootstrap.sql
```

4. Batch ini **belum** mengaktifkan flow approval admin, pembayaran, atau auto-expire scheduler. Itu sengaja ditunda ke fase berikutnya sesuai scope.


---

## Refactor Backend — 2026-04-23 (Kerapian Struktur Source + Patch Korektif UAT)

**Jenis perubahan:** refactor struktur + patch korektif stabilisasi, bukan pembukaan fase resmi baru.

### Ringkasan
Batch terbaru setelah dokumentasi 2026-04-22 berfokus pada dua area:
1. **patch korektif dari temuan UAT parsial**
2. **refactor struktur source backend** agar file besar lebih terkendali

### Patch korektif yang dibuat
- perbaikan kalkulasi `expiresAt` agar tidak jatuh ke awal hari
- perbaikan serialisasi `Date` agar `checkInDate` / `expiresAt` tidak hilang di response
- perbaikan konsistensi approval payment terhadap constraint invoice (`issuedAt`, transisi status invoice)

### Refactor struktur
Service besar dipecah ke helper / mapper / query-support agar file source utama lebih kecil dan lebih mudah dibaca, khususnya pada area:
- `tenant-bookings`
- `payment-submissions`
- `stays`

### Catatan kejujuran status
- Eksplorasi/prototype `payment-submissions` yang sempat masuk source **tidak mengubah status gate resmi**
- Gate 4.0 dan 4.1 tetap harus lulus sebelum 4.2 dianggap baseline resmi
- Refactor ini tidak boleh dibaca sebagai “4.2 sudah final/live”
