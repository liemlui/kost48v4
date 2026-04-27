# KOST48 V3 — Ground State
**Versi:** Synced 2026-04-27 (Pasca Phase 4.3-C In-app Notification Center COMPLETE, AppNotification foundation, frontend bell/page, dan decision Payment Urgency Chip) | **Baca ini pertama kali di setiap sesi.**

---

## Update Aktif — 2026-04-27: Phase 4.3-C Notification Center + Keputusan Urgency Chip

Dokumen ini sudah disinkronkan dengan kondisi terbaru setelah **Phase 4.3-C — In-app Notification Center MVP** selesai dan dipush pada branch `checkpoint/uat-4-2-before-cancelstay-fix`.

### Status resmi terbaru

| Area | Status |
|---|---|
| Gate 1 / UAT 4.0 | ✅ PASS |
| Gate 2 / UAT 4.1 | ✅ PASS |
| UAT 4.2 Core | ✅ CORE PASS / accepted |
| Phase 4.3-A Reminder Preview | ✅ PASS / committed |
| Phase 4.3-B Reminder Mock Send | ✅ PASS / committed |
| Phase 4.3-C1a AppNotification Backend Foundation | ✅ UAT PASS / committed |
| Phase 4.3-C1b Frontend Notification Center | ✅ Build + visual smoke PASS / committed |
| Phase 4.3-C Overall | ✅ In-app Notification Center MVP COMPLETE |
| Next ACT | 🟡 Phase 4.3-D — Tenant Payment Urgency Header Chip |

### Keputusan UX/arsitektur yang dibekukan

1. **Announcement ≠ AppNotification.** Announcement adalah konten/papan pengumuman; AppNotification adalah inbox personal/read-unread per user.
2. **PWA Push adalah channel**, bukan sumber data utama. Nantinya Announcement dan AppNotification bisa dikirim lewat PWA, tetapi tetap dipisahkan di database dan kontrak.
3. **Finance-critical reminder tidak boleh hanya bergantung pada read/unread notification.** Untuk tagihan, pembayaran booking, overdue, dan kontrak/sewa mendekat, tenant perlu melihat **persistent urgency/countdown chip** di header sampai kondisi bisnis selesai.
4. **Tenant punya menu sidebar `Notifikasi`.** OWNER/ADMIN/STAFF cukup akses dari bell/header dan route `/notifications`; tidak perlu sidebar menu baru.
5. Real WhatsApp provider, scheduler/cron otomatis, browser push/service worker, SSE/websocket tetap **deferred** sampai foundation stabil.

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
| **4.2** | **Pembayaran Mandiri & Aktivasi Otomatis** | ⏳ Source patch lanjutan sudah ada di artifact/source kerja, tetapi baseline resmi + UAT/local verify belum dinyatakan lolos |
| **4.3** | **Notifikasi & Reminder (WhatsApp)** | 🟡 4.3-A Reminder Preview PASS; 4.3-B Mock Send next |
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

---

## 2026-04-24 — Sinkronisasi Dokumen Pasca Deep Patch Booking → Approval → Payment

### Ringkasan posisi terbaru
- Source patch lanjutan untuk fase 4.2 sudah masuk di artifact kerja terbaru:
  - payment submission mulai dipisah berdasarkan target `INVOICE | DEPOSIT`
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
  3. UAT happy path + reject + partial + expiry ditutup

### Pedoman interpretasi
- Jika ada perbedaan antara dokumen lama yang menyebut 4.2 “belum dibuka” dan artifact/source terbaru yang sudah mengandung patch 4.2, maka yang benar adalah:
  - **patch source sudah ada**
  - **status resmi / gate proyek masih pending verifikasi**
- Dengan kata lain, 4.2 sekarang berada di status:
  - **bukan nol**
  - **belum final**
  - **siap dipakai sebagai kandidat baseline setelah verifikasi lokal**


---

## 2026-04-26 — Update Phase 4.3-A Reminder Preview PASS

### Status terbaru
- **Phase 4.3-A Reminder Preview dinyatakan PASS** setelah backend endpoint preview, frontend page `/reminders`, route OWNER/ADMIN, dan menu **Pengingat WhatsApp** berhasil diverifikasi.
- Endpoint preview bersifat **read-only** dan tidak mengirim WhatsApp.
- Tidak ada `NotificationLog` write pada 4.3-A.
- Tidak ada scheduler/cron pada 4.3-A.
- TENANT tidak melihat menu **Pengingat WhatsApp**.

### Perubahan status fase
| Fase | Status terbaru |
|---|---|
| 4.3-A Reminder Preview | ✅ PASS / committed |
| 4.3-B Reminder Queue / Mock Send | ⏭️ Next |
| Real WhatsApp provider send | ⬜ Belum dibuka |
| Scheduler reminder | ⬜ Belum dibuka |

### Prinsip fase 4.3 yang dibekukan
1. Preview dulu sebelum send.
2. Mock/internal send dulu sebelum provider WhatsApp asli.
3. Tidak ada automation engine umum.
4. Kegagalan reminder tidak boleh menjatuhkan flow bisnis utama.
5. OWNER/ADMIN boleh melihat reminder; TENANT tidak melihat backoffice reminder surface.

### ACT berikutnya
**Phase 4.3-B — Reminder Queue / Mock Send** dengan scope sempit:
- gunakan kandidat dari preview,
- sediakan aksi simulasi/mock send,
- belum kirim WhatsApp sungguhan,
- belum scheduler,
- belum provider credential.

---

## Update Aktif — 2026-04-27: Freeze Lifecycle Meter, Deposit, dan Announcement Audience

### Latar belakang

Setelah Notification Center, Announcement → AppNotification, Booking Approved AppNotification, dan Payment Reviewed AppNotification berjalan, ditemukan dua gap lifecycle yang harus dibekukan sebelum ACT berikutnya:

1. Tenant yang masih berada di tahap booking/reserved dapat menerima notifikasi pengumuman dan membuka `/portal/announcements`, padahal beberapa pengumuman operasional seperti listrik/air hanya relevan untuk penghuni aktif.
2. Approval booking dapat gagal dengan pesan `Meter awal listrik pada tanggal check-in sudah pernah tercatat untuk kamar ini` karena meter baseline dibuat pada approval booking, lalu booking dibatalkan/expired atau kamar dibooking ulang pada tanggal yang sama.

### Keputusan freeze baru

| Area | Keputusan |
|---|---|
| Meter tenant booking | `MeterReading` final untuk flow booking tenant **tidak dibuat saat approve booking**. |
| Timing meter operasional | `MeterReading` final dibuat saat payment approved dan room berubah `RESERVED -> OCCUPIED`. |
| Approval booking | Admin tetap mengisi meter awal, tetapi nilai disimpan sebagai **pending meter snapshot** di `Stay`. |
| Cancel/expired sebelum occupied | Pending meter snapshot dibersihkan; jangan menghapus histori meter operasional. |
| Checkout occupied stay | Meter history, invoice, payment, dan deposit history **tetap disimpan**. |
| Deposit booking | Deposit awal booking adalah syarat aktivasi; deposit pasca-checkout tetap workflow refund/forfeit terpisah. |
| Announcement TENANT | Jangka pendek: audience `TENANT` hanya dikirim ke tenant dengan hunian aktif operasional (`Room.status = OCCUPIED`). |
| Tenant reserved membuka pengumuman | Jika tenant belum occupied membuka `/portal/announcements`, frontend harus redirect aman ke `/portal/bookings`. |
| Audience stage-aware | `TENANT_OCCUPIED`, `TENANT_BOOKING`, `TENANT_ALL` ditunda sebagai long-term improvement setelah guard minimal stabil. |
| WhatsApp/scheduler/PWA | Tetap deferred; lifecycle integrity lebih prioritas daripada channel eksternal. |

### Keputusan desain meter

Untuk flow **backoffice direct check-in existing**, meter awal tetap boleh langsung menjadi `MeterReading` karena room langsung `OCCUPIED`.

Untuk flow **tenant booking V4**, meter awal bersifat provisional sampai pembayaran disetujui. Karena itu:

```text
Booking created         -> no meter snapshot
Booking approved        -> pending meter snapshot on Stay
Payment rejected        -> snapshot remains pending
Payment approved full   -> promote snapshot to MeterReading final
Booking cancel/expired  -> clear snapshot only
Checkout occupied stay  -> preserve MeterReading history
```

### Next ACT resmi

Next core bukan fitur baru, melainkan stabilisasi lifecycle:

1. **4.3-G1 — Announcement Access Guard**
   - Backend filter notification recipient untuk audience `TENANT` hanya occupied tenants.
   - Frontend guard `/portal/announcements` untuk tenant non-occupied.
2. **4.3-G2 — Pending Meter Snapshot for Tenant Booking**
   - Tambah field pending meter di `Stay`.
   - Ubah approve booking agar tidak membuat `MeterReading` final.
   - Ubah payment approval agar mempromosikan snapshot menjadi `MeterReading`.
   - Cancel/expired hanya clear snapshot.
3. **4.3-G3 — Legacy Meter Audit/Cleanup**
   - Audit data `MeterReading` lama yang berasal dari booking cancelled/expired.
   - Jangan bulk delete tanpa review.
4. **4.3-G4 — Long-term Metadata**
   - Pertimbangkan `MeterReading.stayId`, `sourceType`, `isBaseline`, dan stage-aware announcement audience.
