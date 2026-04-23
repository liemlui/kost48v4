# KOST48 V3 — Ground State
**Versi:** Synced 2026-04-23 (Pasca UAT parsial, patch korektif, dan refactor struktur) | **Baca ini pertama kali di setiap sesi.**

---

## 1. Identitas Proyek

| Item | Nilai |
|------|-------|
| Nama | WebKost48 Surabaya V3 |
| Model bisnis | Hybrid kos–hospitality |
| Developer | Solo developer |
| Backend | NestJS + Prisma + PostgreSQL |
| Frontend | React + Vite + TypeScript + React-Bootstrap + TanStack Query |
| Auth | JWT Bearer Token |
| App aktif | Backoffice + Tenant Portal |
| Environment default | Windows + VS Code + PowerShell |
| Repo | Monorepo sederhana (`/backend`, `/frontend`, `/docs`) |

---

## 2. Arsitektur yang Tidak Ditawar

1. Satu backend modular NestJS
2. Satu database PostgreSQL
3. Satu Prisma schema
4. Tidak ada microservices
5. Constraint bisnis penting dibantu trigger/constraint DB (`bootstrap.sql`)
6. Semua operasi multi-entity penting wajib atomik (`prisma.$transaction`)

---

## 3. Hierarki Source of Truth

Jika ada konflik, urutan ini menentukan siapa yang menang:

| Level | Sumber | Menang atas |
|-------|--------|-------------|
| 1 | `schema.prisma` | Semua — bentuk data |
| 2 | `bootstrap.sql` | Semua — pagar integritas DB |
| 3 | `01_CONTRACTS.md` | Docs lain — alur bisnis & DTO |
| 4 | `00_GROUND_STATE.md` (ini) | Docs lain — arah & status proyek |
| 5 | `02_PLAN.md` | Docs lain — rencana eksekusi detail |
| 6 | `03_DECISIONS_LOG.md` | — histori, tidak override aktif |
| 7 | `04_JOURNAL.md` | — arsip kronologis |

---

## 4. Baseline Existing yang Wajib Dihormati

### Stay & Room
- Satu tenant hanya boleh punya satu stay `ACTIVE`
- Satu room hanya boleh punya satu stay `ACTIVE`
- `Room.status` harus selalu sinkron dengan stay aktif
- Backoffice create stay langsung menghasilkan stay `ACTIVE` (bukan flow approval)
- Checkout berarti tenant benar-benar keluar kos
- Room kembali `AVAILABLE` hanya jika tidak ada stay aktif lain

### Deposit
- Deposit tidak diputuskan otomatis saat checkout
- Deposit diproses terpisah setelah checkout
- Proses deposit diblok jika masih ada invoice `ISSUED` atau `PARTIAL`
- UI tidak boleh membaca `depositStatus` sendirian sebagai bukti bayar

### Meter
- Meter awal wajib dicatat sebagai dua `MeterReading` (listrik + air) dalam transaksi create stay
- `initialElectricityKwh` dan `initialWaterM3` bukan field di `Stay`
- Uniqueness `[roomId, utilityType, readingAt]` dijaga DB + service
- Nilai meter tidak boleh turun (monotonic)

### Invoice & Payment
- Total invoice dikelola otomatis dari `InvoiceLine` — service tidak boleh set manual
- Invoice line hanya boleh berubah saat status `DRAFT`
- Overpay tidak boleh melebihi total invoice final
- Create stay boleh auto-membuat invoice awal `DRAFT`
- Renewal stay boleh auto-membuat invoice renewal `DRAFT`
- `periodEnd` mengikuti `pricingTerm` atau override `plannedCheckOutDate`; `dueDate = periodEnd + 3 hari`

### Scope yang Ditutup
- Debt flow tidak dibangun
- Scheduler / notification engine tidak dibangun
- PENDING stay tidak dibuka sebagai redesign state aktif
- Reminder lifecycle tetap computed display ringan (frontend-only)

---
## 5. Status Freeze per Fase (Update 2026-04-22 — Pasca Patch 4.1 dan Sinkronisasi Detail 4.2–4.5)

| Fase | Nama | Status |
|------|------|--------|
| 0 | Fondasi & Stabilitas Awal | ✅ Selesai |
| 1 | Stabilisasi Lanjutan & Pembersihan Kode | ✅ Selesai |
| 2 | Penyempurnaan UX & Integrasi Modul | ✅ Selesai |
| 3 | Ticket Tenant-Only Redesign | ✅ Selesai |
| **3.5** | **Backend Stabilization & API Gap Closure** | ✅ **Selesai** |
| **4.0** | **Booking Mandiri & Status RESERVED** | ⏳ Backend + frontend inti sudah dipatch; UAT booking belum dinyatakan lolos penuh |
| **4.1** | **Admin Approval & Pelengkapan Data** | ⏳ Backend 4.1A + frontend 4.1B sudah dipatch; UAT approval belum dinyatakan lolos penuh |
| **4.2** | **Pembayaran Mandiri & Aktivasi Otomatis** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |
| **4.3** | **Notifikasi & Reminder (WhatsApp)** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |
| **4.4** | **Marketing Display & Registrasi Fleksibel** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |
| **4.5** | **Tenant Self-Service Lanjutan** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |

---

## 6. Fokus Aktif Sekarang — UAT 4.0 + 4.1, lalu buka 4.2 secara resmi

**Tujuan saat ini:** memastikan slice V4 Fase 4.0 dan 4.1 yang sudah tertutup di level source/build benar-benar stabil secara end-to-end, sebelum membuka payment submission dan flow otomatis berikutnya.

**Status penting saat ini:**
1. Backend inti V4 sudah dipatch:
   - `RoomStatus.RESERVED`
   - `Stay.expiresAt`
   - `GET /public/rooms`
   - `POST /tenant/bookings`
   - `GET /tenant/bookings/my`
2. Approval booking Fase 4.1 juga sudah dipatch di level source/build:
   - `PATCH /admin/bookings/:stayId/approve`
   - invoice awal `DRAFT` saat approval
   - queue approval booking di backoffice
   - status tenant portal `Menunggu Approval` / `Menunggu Pembayaran`
3. Fase 4.2–4.5 **belum live**, tetapi detail implementasinya sekarang sudah dibakukan di dokumen proyek agar eksekusi nanti tidak melebar.

**Urutan kerja aktif:**
1. **Lakukan UAT end-to-end Fase 4.0**
   - flow publik `/rooms`
   - flow tenant booking
   - flow tenant `Pemesanan Saya`
   - flow backoffice read-only booking reserved
2. **Lanjutkan UAT end-to-end Fase 4.1**
   - approval admin
   - pelengkapan data kontrak
   - invoice awal booking
   - tenant status `Menunggu Pembayaran`
3. **Baru setelah UAT 4.0 + 4.1 cukup aman, buka Fase 4.2**
   - payment submission
   - approval/reject bukti bayar
   - sinkronisasi `RESERVED -> OCCUPIED`
   - expiry booking
4. **Fase 4.3–4.5 tetap mengikuti urutan berlapis**
   - 4.3 sesudah 4.2 inti stabil
   - 4.4 sesudah public surface & auth contract siap
   - 4.5 sesudah self-service tenant aman dibuka

**Do Not Open dalam batch aktif:**
1. Debt flow / hutang
2. Scheduler reminder otomatis umum di luar scope booking/reminder yang sudah dispesifikkan
3. Owner finance dashboard penuh
4. Redesign accounting formal
5. Rewrite total backend + frontend sekaligus
6. Fase 4.3–4.5 sebelum fondasi 4.2 stabil
7. UI palsu yang belum punya kontrak backend jelas

**Prinsip kerja:**
- Maksimal **1 flow utama** per batch coding
- Patch nyata menang atas rencana besar yang belum dieksekusi
- Build success tetap wajib
- UAT tetap menjadi gate sebelum membuka fase berikutnya
- Semua perubahan status resmi minimal harus disinkronkan ke:
  - `CHECKLIST.md`
  - `02_PLAN.md`
  - `04_JOURNAL.md`
- Default shell: **PowerShell**
- Untuk task yang benar-benar butuh DB / Prisma / PowerShell runtime, boleh pakai Cline
- Untuk task yang tidak butuh DB, utamakan patch langsung di chat / artifact

**Catatan sinkronisasi:** dokumen ini kini menegaskan bahwa blueprint 4.2–4.5 sudah detail, tetapi implementasi kode tetap menunggu urutan resmi: UAT 4.0 → UAT 4.1 → ACT 4.2 → 4.3 → 4.4 → 4.5.


---

## 2026-04-23 — Update Sinkronisasi Status Nyata Pasca UAT Parsial + Refactor Struktur

### Ringkasan posisi nyata saat ini
- UAT parsial V4 Fase 4.0 mulai menghasilkan bukti konkret:
  - skenario katalog publik `/rooms` dinyatakan aman
  - login ADMIN ke `/rooms` berhasil masuk ke surface backoffice yang benar
  - tenant berhasil membuat booking baru
- UAT juga menemukan bug integrasi nyata:
  - nilai `check-in` dan `expiresAt` sempat tampil `-`
  - approval booking sempat terkena `409` karena expiry terlalu agresif / data tanggal tidak jujur di surface
  - modal review/approval frontend sempat tidak menutup setelah aksi sukses
- Sejumlah patch korektif telah dibuat sesudah UAT parsial:
  - backend: perbaikan kalkulasi `expiresAt` agar jatuh ke akhir hari
  - backend: perbaikan serialisasi `Date` agar `checkInDate` / `expiresAt` tidak hilang di response
  - backend: perbaikan kompatibilitas update invoice saat approval payment (`issuedAt` / constraint invoice)
  - frontend: patch close-modal / invalidation pada flow review pembayaran dibahas dan disiapkan
- Refactor struktur juga sudah dilakukan:
  - backend: file source utama yang terlalu besar telah dipecah agar target praktis `<= 500` baris per file lebih tercapai
  - frontend: `resources.ts` dan `CheckInWizard.tsx` telah dipecah ke file yang lebih kecil

### Status resmi yang tetap harus dipegang
- Gate UAT 4.0 dan 4.1 **masih belum dinyatakan lolos penuh**
- Slice 4.2 sempat diprototipekan/diujicoba pada level source untuk menutup blocker integrasi, tetapi **belum boleh dianggap baseline resmi**
- Semua eksekusi resmi tetap mengikuti urutan:
  1. tuntaskan UAT 4.0
  2. tuntaskan UAT 4.1
  3. baru buka 4.2 sebagai baseline resmi

### Implikasi operasional
- Jika ada konflik antara kode eksperimen/prototype 4.2 dengan dokumen gate, yang menang tetap:
  - `schema.prisma`
  - `bootstrap.sql`
  - `01_CONTRACTS.md`
  - status gate di dokumen aktif
- Refactor struktur tidak mengubah arah bisnis; refactor hanya untuk menjaga file source lebih rapi, terbaca, dan aman dipatch lanjut
