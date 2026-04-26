# KOST48 V3 — Ground State
**Versi:** Synced 2026-04-26 (Pasca UAT Gate 1/2 PASS, 4.2 CORE PASS, P0 cache isolation CLOSED, dan P1 cleanup sebelum 4.3) | **Baca ini pertama kali di setiap sesi.**

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
| **4.0** | **Booking Mandiri & Status RESERVED** | ✅ Patch + UAT Gate 1 PASS |
| **4.1** | **Admin Approval & Pelengkapan Data** | ✅ Patch + UAT Gate 2 PASS |
| **4.2** | **Pembayaran Mandiri & Aktivasi Otomatis** | ✅ CORE PASS / accepted; P1 cleanup pending sebelum 4.3 |
| **4.3** | **Notifikasi & Reminder (WhatsApp)** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |
| **4.4** | **Marketing Display & Registrasi Fleksibel** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |
| **4.5** | **Tenant Self-Service Lanjutan** | ⬜ Belum dibuka di kode; blueprint implementasi sudah disinkronkan |

---

## 6. Fokus Aktif Sekarang — P1 Cleanup Pasca UAT 4.2, lalu Phase 4.3

**Tujuan saat ini:** mempertahankan hasil UAT yang sudah PASS, menutup P1 cleanup kecil pasca 4.2, lalu membuka Phase 4.3 WhatsApp reminder secara aman.

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
1. **Selesaikan P1 cleanup pasca 4.2**
   - invoice awal booking expired ikut `CANCELLED` bila belum final,
   - label room `RESERVED` memakai `Pemesan` / `Booking oleh`, bukan `Penghuni`,
   - pricing term hanya menampilkan rate nyata,
   - production error response tidak expose stack,
   - Phase 3A initial meter requirement diverifikasi code-level.
2. **Targeted retest cleanup saja**
   - jangan ulang Gate 1/2/4.2 core dari awal.
3. **Buka Phase 4.3 setelah cleanup PASS**
   - WhatsApp adapter,
   - reminder booking expiry / invoice due / checkout,
   - idempotency dan notification log.
4. **Fase 4.4–4.5 tetap mengikuti urutan berlapis**
   - 4.4 setelah 4.3 stabil,
   - 4.5 setelah public/auth/self-service contract aman.

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

---

## 2026-04-24 — Sinkronisasi Dokumen Pasca Deep Patch Booking → Approval → Payment

### Ringkasan posisi terbaru
- Source patch lanjutan untuk fase 4.2 sudah masuk di artifact kerja terbaru:
  - payment submission booking awal bergerak ke combined payment: satu bukti untuk sewa + deposit
  - tracking deposit payment pada booking/stay mulai diperkenalkan
  - flow approval invoice diperkeras agar patuh pada constraint DB: invoice dibuat `DRAFT`, line dibuat saat masih `DRAFT`, lalu baru bergerak ke status operasional yang benar
  - expiry booking dibersihkan lebih agresif agar tidak meninggalkan orphan invoice / orphan meter baseline
- Frontend source juga sudah bergerak lebih jauh:
  - modal pembayaran tenant dibuat lebih jujur dan minimal
  - surface booking tenant/admin mulai dibedakan lebih jelas antara approval booking vs verifikasi pembayaran
  - sinkronisasi stage tenant dan success feedback diperkuat

### Status resmi yang harus dipegang
- 4.0 dan 4.1 tetap dianggap slice aktif yang **harus** aman secara UAT end-to-end
- 4.2 **sudah memiliki source patch lanjutan**, tetapi belum boleh dianggap baseline resmi sebelum:
  1. sinkronisasi schema / Prisma selesai di environment lokal
  2. build lokal backend/frontend lolos penuh
  3. UAT happy path + reject + wrong amount + expiry ditutup

### Pedoman interpretasi
- Jika ada perbedaan antara dokumen lama yang menyebut 4.2 “belum dibuka” dan artifact/source terbaru yang sudah mengandung patch 4.2, maka yang benar adalah:
  - **patch source sudah ada**
  - **status resmi / gate proyek masih pending verifikasi**
- Dengan kata lain, 4.2 sekarang berada di status:
  - **bukan nol**
  - **belum final**
  - **siap dipakai sebagai kandidat baseline setelah verifikasi lokal**


### Catatan Operasional 4.2 — Combined Booking Payment
- Pembayaran booking awal dibaca tenant sebagai satu journey **Pembayaran Awal**.
- Tenant mengirim satu bukti **Bayar Sewa & Deposit** dengan nominal dikunci penuh.
- Nominal wajib sama dengan sisa sewa invoice booking awal + sisa deposit booking awal.
- Backend membagi efek pembayaran secara internal: rent portion ke `InvoicePayment` dan deposit portion ke tracking deposit awal pada `Stay`.
- Tidak ada pembayaran parsial pada workflow booking 4.2.
- Room hanya berubah `RESERVED -> OCCUPIED` saat invoice sewa `PAID` dan deposit payment status `PAID`.


---

## 2026-04-26 — Status Aktual UAT Pasca Gate 1, Gate 2, dan Happy Path 4.2

### Ringkasan status yang sekarang harus dipegang
- **Gate 1 / UAT 4.0 dinyatakan PASS** setelah patch klasifikasi stay dan fallback gambar publik.
- **Gate 2 / UAT 4.1 dinyatakan PASS** setelah admin approve booking berhasil, invoice awal terbentuk, meter awal tersimpan, dan room tetap `RESERVED` sampai pembayaran diverifikasi.
- **UAT 4.2 happy path dinyatakan PASS**: tenant submit bukti pembayaran awal, admin approve, `InvoicePayment` terbentuk, invoice menjadi `PAID`, room berubah `RESERVED -> OCCUPIED`, dan tenant masuk ke `Hunian Saya`.
- **4.2 belum boleh dinyatakan lulus penuh** karena reject path, wrong amount path, expiry path, dan double approve prevention belum ditutup.
- **P0 aktif sebelum lanjut UAT 4.2 lainnya:** tenant portal cache isolation. Saat login berpindah dari tenant lama ke tenant baru, `/api/stays/me/current` dapat 404 tetapi UI masih sempat menampilkan data stay tenant sebelumnya. Ini wajib dipatch sebelum reject/wrong amount/expiry dilanjutkan.

### Keputusan operasional penting
- **Tidak perlu mengulang UAT 4.0, 4.1, dan 4.2 happy path dari awal.** Bukti UAT yang sudah PASS diterima sebagai baseline verifikasi.
- Setelah patch cache isolation, lakukan **targeted retest saja**:
  1. login Tenant A yang punya stay aktif → `/portal/stay` tampil stay Tenant A,
  2. logout,
  3. login Tenant B yang tidak punya stay aktif → `/portal/stay` harus empty state, bukan data Tenant A,
  4. `/portal/bookings`, `/portal/invoices`, dan success message tidak boleh membawa data tenant lama,
  5. tidak ada request flood dari `/api/stays/me/current`.
- Setelah targeted retest cache isolation PASS, lanjutkan UAT 4.2 yang tersisa: reject path, wrong amount path, expiry path, double approve prevention.

### Catatan minor non-blocker
- Label room `RESERVED` di backoffice sebaiknya memakai kata **Pemesan** / **Booking oleh**, bukan **Penghuni**.
- Badge booking di mode “Semua Stay” sebaiknya lebih eksplisit sebagai **Booking Reserved** / **Menunggu Pembayaran**, bukan sekadar `Aktif`.
- Bukti bayar sudah bisa dilihat dalam modal review admin; new tab proof bukan blocker.

---

## 2026-04-26 — Update Terbaru: UAT 4.2 CORE PASS + P1 Cleanup Sebelum 4.3

### Status resmi terbaru
- **Gate 1 / UAT 4.0: PASS** — tidak perlu diulang dari awal.
- **Gate 2 / UAT 4.1: PASS** — tidak perlu diulang dari awal.
- **P0 tenant portal cache isolation: CLOSED / PASS** setelah query cache dibersihkan saat login/logout, query tenant di-scope berdasarkan user/tenant, dan `/stays/me/current` 404 dirender sebagai empty state.
- **UAT 4.2 happy path: PASS** — tenant submit pembayaran awal, admin approve, `InvoicePayment` terbentuk, invoice `PAID`, room `RESERVED -> OCCUPIED`, tenant melihat hunian aktif.
- **UAT 4.2 reject path: PASS** — admin reject dengan alasan, tenant melihat alasan dan bisa upload ulang, room tetap `RESERVED`, invoice belum `PAID`.
- **UAT 4.2 wrong amount path: PASS** — backend menolak nominal tidak tepat dengan pesan operasional-friendly; tidak ada partial payment.
- **UAT 4.2 double approve prevention: PASS** — approval kedua ditolak dan tidak ada `InvoicePayment` ganda.
- **UAT 4.2 expiry core: PASS** — booking expired berubah `CANCELLED`, room kembali `AVAILABLE`, pending submission menjadi `EXPIRED` bila ada, dan invoice tidak mengaktifkan room.

### Pembacaan status 4.2
Fase 4.2 sekarang dibaca sebagai **CORE PASS / operationally accepted**, dengan catatan P1 cleanup sebelum membuka 4.3. Ini bukan berarti semua polish selesai, tetapi flow inti booking → approval → payment → activation → reject/wrong amount/double approve/expiry sudah terbukti.

### P1 cleanup sebelum 4.3
- **P1.1 Expiry invoice cleanup:** saat booking expired, invoice awal yang masih `DRAFT` / `ISSUED` dan belum `PAID` sebaiknya ikut `CANCELLED` agar tidak orphan.
- **P1.2 Label room RESERVED:** backoffice rooms harus menampilkan `Pemesan` / `Booking oleh`, bukan `Penghuni`, untuk kamar `RESERVED`.
- **P1.3 Pricing term honesty:** jangan tampilkan `Semester` / `Tahunan` di public room / booking form jika room tidak punya rate nyata untuk term tersebut; jangan fallback ke monthly.
- **P1.4 Production-safe error response:** stack trace boleh muncul di development, tetapi tidak boleh dikirim ke client di production.
- **P1.5 Phase 3A verification:** verifikasi code-level bahwa backoffice create stay tetap mewajibkan meter awal listrik/air dan membuat 2 `MeterReading` atomik.

### Urutan kerja berikutnya
1. Tunggu / selesaikan ACT Cline P1 cleanup kecil.
2. Retest targeted saja untuk item P1 yang disentuh.
3. Jika cleanup build dan targeted retest PASS, baru buka **Phase 4.3 — WhatsApp Reminder**.

### Instruksi penting
- Jangan ulang Gate 1, Gate 2, atau UAT 4.2 happy/reject/wrong/double/expiry dari awal kecuali patch baru menyentuh flow terkait secara langsung.
- Jangan buka Phase 4.3 sebelum P1 cleanup selesai dan build backend/frontend PASS.
