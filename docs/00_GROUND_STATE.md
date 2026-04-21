# KOST48 V3 — Ground State
**Versi:** Synced 2026-04-21 (Pasca Frontend Fase 2 & Audit Backend) | **Baca ini pertama kali di setiap sesi.**

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
## 5. Status Freeze per Fase (Update 2026-04-21 — Pasca Frontend V4 Fase 4.0 Patch)

| Fase | Nama | Status |
|------|------|--------|
| 0 | Fondasi & Stabilitas Awal | ✅ Selesai |
| 1 | Stabilisasi Lanjutan & Pembersihan Kode | ✅ Selesai |
| 2 | Penyempurnaan UX & Integrasi Modul | ✅ Selesai |
| 3 | Ticket Tenant-Only Redesign | ✅ Selesai |
| **3.5** | **Backend Stabilization & API Gap Closure** | ✅ **Selesai** |
| **4.0** | **Booking Mandiri & Status RESERVED** | ⏳ **Backend + frontend inti sudah dipatch; UAT belum selesai** |
| 4.1 | Admin Approval & Pelengkapan Data | ⏳ Backend 4.1A + frontend 4.1B sudah dipatch; UAT approval belum selesai |
| 4.2 | Pembayaran Mandiri & Aktivasi Otomatis | ⬜ Belum |
| 4.3 | Notifikasi & Reminder (WhatsApp) | ⬜ Belum |
| 4.4 | Marketing Display & Registrasi Fleksibel | ⬜ Belum |
| 4.5 | Tenant Self-Service Lanjutan | ⬜ Belum |

---

## 6. Fokus Aktif Sekarang — UAT 4.0, LALU LANJUT 4.1

**Tujuan saat ini:** Memverifikasi bahwa slice V4 Fase 4.0 yang sudah tertutup di level kode benar-benar stabil secara end-to-end, sebelum membuka approval booking di Fase 4.1.

**Status penting saat ini:**
1. Backend inti V4 sudah dipatch:
   - `RoomStatus.RESERVED`
   - `Stay.expiresAt`
   - `GET /public/rooms`
   - `POST /tenant/bookings`
   - `GET /tenant/bookings/my`
2. Frontend inti V4 juga sudah dipatch:
   - katalog publik `/rooms`
   - form booking `/booking/:roomId`
   - tenant `Pemesanan Saya`
   - booking reserved read-only di backoffice
3. UAT penuh flow booking mandiri belum dinyatakan lolos.

**Urutan kerja aktif:**
1. **Lakukan UAT end-to-end Fase 4.0**
   - flow publik `/rooms`
   - flow tenant booking
   - flow tenant `Pemesanan Saya`
   - flow backoffice read-only booking reserved
   - regression check existing flow yang masih aktif
2. **Fase 4.1 saat ini sudah mulai dipatch secara terkontrol**
   - backend 4.1A: approval booking core
   - frontend 4.1B: queue approval + form approval + status tenant portal setelah approval
   - UAT approval booking masih perlu dijalankan
3. **Fase 4.2+ tetap belum dibuka**

**Catatan arah kerja:**
- Mode kerja tetap pragmatis: patch dulu, lalu UAT.
- Untuk Fase 4.0, patch backend + frontend inti sudah tertutup.
- Status “selesai” penuh tetap membutuhkan verifikasi runtime/UAT.

---

## 7. Do Not Open dalam Sesi Aktif

1. Debt flow / hutang
2. Scheduler reminder otomatis umum di luar scope booking
3. Payment approval vNext penuh sebelum Fase 4.1 resmi dibuka
4. Owner finance dashboard penuh
5. Redesign accounting formal
6. Rewrite total backend + frontend sekaligus
7. Fase 4.2+ sebelum UAT Fase 4.0 selesai
8. UI palsu yang belum punya kontrak backend jelas

---

## 8. Prinsip Kerja

- Maksimal **1 flow utama** per batch coding
- Patch nyata menang atas rencana besar yang belum dieksekusi
- Build success tetap wajib
- UAT sekarang kembali menjadi prioritas sebelum membuka Fase 4.1
- Semua perubahan yang mengubah status resmi harus disinkronkan minimal ke:
  - `CHECKLIST.md`
  - `02_PLAN.md`
  - `04_JOURNAL.md`
- Default shell: **PowerShell**
- Untuk task yang benar-benar butuh DB / Prisma / PowerShell runtime, boleh pakai Cline
- Untuk task yang tidak butuh DB, utamakan patch langsung di chat / artifact

**Catatan sinkronisasi:** Dokumen ini memakai mode kerja pragmatis: patch inti ditutup dulu agar slice 4.0 lengkap di level kode, lalu UAT end-to-end dilakukan sebelum masuk ke approval booking Fase 4.1.