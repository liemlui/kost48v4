# KOST48 V3/V4 — Ground State
**Versi:** 2026-05-18 multi-app shared-db architecture planning  
**Status:** Source of truth utama untuk membuka sesi baru. Baca ini dulu sebelum `01_CONTRACTS.md`, `02_PLAN.md`, dan `CHECKLIST.md`.

---

## 0AA. Latest Override — 2026-05-18 Multi-App Shared-DB Architecture Planning

Bagian ini mengalahkan keputusan lama tentang “tidak memakai microservices” bila ada konflik. Statusnya **architecture planning**, belum implementasi.

### Keputusan arsitektur baru

KOST48 diarahkan ke **Multi-App Shared-DB Architecture**:

```text
Bukan rewrite dari nol.
Bukan pure microservices dengan separate database.
Bukan distributed transaction.
Strategi: greenfield shell + brownfield logic extraction.
Shared PostgreSQL tetap dipakai.
PrismaService tetap shared.
Business logic lama dipertahankan dan dipindahkan bertahap.
```

### Target app/process backend

| App | Ownership utama | Status |
|---|---|---|
| `core-api` | Stay lifecycle, Room occupancy writes, manual check-in, booking approval, checkout final, renew execution, meter promotion | Target utama |
| `tenant-api` | Tenant booking create/my, payment submission create/my, checkout/renew request create-view, tenant read-only surfaces | Setelah audit |
| `staff-api` | Tickets, room view, inventory read-only, maintenance/task future | Early win |
| `finance-api` | Invoices, payments, review queue, reports, expenses/deposit/damage later | Partial only; approval mutasi Stay tetap core dulu |
| `marketing-api` | Public rooms, public detail, gallery, SEO/landing | Early win paling aman |
| `owner-api` | Owner dashboard/reporting aggregator | Later only |

### Boundary rules yang wajib dikunci

1. `core-api` owns all writes to `Stay` lifecycle.
2. `core-api` owns `Room.status` / occupancy writes.
3. `tenant-api` boleh create request/submission, tapi tidak boleh execute lifecycle finalization.
4. Checkout request: tenant create/view = `tenant-api`; admin approve/reject/final checkout = `core-api`.
5. Renew request: tenant create/view = `tenant-api`; admin approve/reject + extend stay/invoice = `core-api`.
6. Payment submission: tenant create/my = `tenant-api`; approval yang mutate invoice/stay/room/meter/deposit tetap `core-api` sampai command boundary didesain.
7. `marketing-api` read-only/public dulu.
8. `owner-api` ditunda supaya tidak menjadi mini-monolith kedua.

### Next work terbaru

Sebelum `nest generate app` atau pindah file, wajib lakukan **Phase 0 Architecture Audit** terhadap ZIP backend/frontend terbaru:

```text
- cek workspace readiness NestJS
- petakan module imports/service injections
- konfirmasi CheckoutRequests/RenewRequests/PaymentSubmissions mutation boundary
- petakan frontend split routes
- tentukan shared libs
- hasilkan Phase 0 ACT plan
```

Jangan ACT arsitektur sebelum audit ini selesai.

---

## 0A. Latest Override — 2026-05-11 Business Lifecycle State

Bagian ini mengalahkan status lama jika ada konflik.

### Status paling baru yang harus diingat

| Area | Status terbaru |
|---|---|
| Git/working tree | **Belum diasumsikan clean.** Selalu mulai sesi dengan `git status --short; git log --oneline -8`. |
| M2 Manual Check-in UX Reliability | ✅ PASS — commit `71ab386 fix manual check-in close and tenant refresh`. Ini hanya UX fix: close/offcanvas, tombol kembali, tenant select refresh. |
| M2 bukan business automation | Invoice auto-ISSUED dan portal auto-create **belum termasuk** M2. Itu menjadi Batch B1. |
| M3 UI polish | ✅ PASS — commit `960f922 polish mobile layout and toast spacing`. Jangan CSS modularization ulang. |
| M4 Password visibility toggle | ✅ PASS menurut user. |
| Staff Inventory read-only | ✅ PASS — commit `70fcf4e stabilize checkout payment and inventory permissions`. STAFF view-only; OWNER/ADMIN mutate. |
| Tenant Identity + Duplicate Protection | ✅ CODE COMPLETE / BUILD PASS / API UAT PASS 157/0. Commit/push perlu dikonfirmasi dari `git log`. |
| Full Checkout UAT | ✅ PASS — tenant request → admin approve rencana → tenant tetap menghuni → admin Checkout Final → stay completed, room available. |
| Production handoff | ✅ PASS — `app.kost48surabaya.com` connected ke `api.kost48surabaya.com/api`. |
| Urgency chip 4.3-D | 🟡 Status kode perlu dikonfirmasi aktual. Jangan klaim PASS tanpa browser UAT final. |
| Current P0 next | 🔴 **Batch B1 — Manual Check-in Business Automation**. Belum dikerjakan. PLAN audit dulu, jangan langsung ACT. |

### Current boot command for new session

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -8
```

### Urutan kerja paling aman sekarang

1. Pastikan identity patch sudah commit + push jika belum.
2. Pastikan working tree clean sebelum batch baru.
3. Jalankan **PLAN audit Batch B1**: `StaysService.create()`, invoice creation, portal access method, response ke `CheckInWizard`.
4. Review PLAN B1.
5. Baru ACT B1 dengan scope sempit.
6. Setelah B1 PASS, lanjut Batch B2 PLAN: invoice lifecycle + final utility audit.

### Jangan salah arah

- Jangan anggap M2 UX PASS = invoice/portal automation sudah selesai.
- Jangan langsung ACT Batch B1 tanpa PLAN audit.
- Jangan mulai deposit/damage/schema change sebelum Batch B1 selesai.
- Jangan mulai Phase 4.4/4.5 sebelum B1/B2 stabil.
- Jangan klaim urgency chip PASS tanpa browser UAT.
- Jangan CSS modularization ulang.
- Jangan reset DB production.
- Jangan buat file markdown baru di luar 7 active docs.

---

## 0B. Ringkasan Status Terbaru

| Area | Status |
|---|---|
| Gate 1 / UAT 4.0 Booking Mandiri | ✅ PASS |
| Gate 2 / UAT 4.1 Admin Approval | ✅ PASS |
| UAT 4.2 Payment Submission Core | ✅ CORE PASS |
| Pricing Policy V1 | ✅ PASS |
| Phase 4.3-A Reminder Preview | ✅ PASS |
| Phase 4.3-B Reminder Mock Send | ✅ PASS |
| Phase 4.3-C Notification Center MVP | ✅ COMPLETE |
| Phase 4.3-G1 Announcement Access Guard | ✅ PASS |
| Phase 4.3-G2 Pending Meter Snapshot | ✅ Fresh UAT PASS |
| M2 Manual Check-in UX Reliability | ✅ PASS — `71ab386` |
| M3 UI Polish | ✅ PASS — `960f922` |
| M4 Password Visibility Toggle | ✅ PASS |
| Staff Inventory Read-only | ✅ PASS — `70fcf4e` |
| Tenant Identity + Duplicate Protection | ✅ API UAT PASS 157/0 — commit/push perlu konfirmasi |
| Full Checkout UAT | ✅ PASS |
| Production frontend/backend | ✅ PASS |
| Batch B1 Manual Check-in Business Automation | 🔴 NEXT P0 — belum dikerjakan |
| Batch B2 Invoice Lifecycle + Final Utility Audit | ⬜ Belum dibuka |
| Batch B4 Deposit Settlement Model | ⬜ Belum dibuka |
| Batch B5 Damage / Penalty / Inventory Condition | ⬜ Belum dibuka |
| Phase 4.4 Marketing + Registration | ⬜ Belum dibuka |
| Real WhatsApp/provider/scheduler/push | ⬜ Deferred |

---

## 0C. Business Lifecycle Gap yang Ditemukan

Setelah UAT teknis PASS, penggunaan manual menemukan gap bisnis pada manual check-in:

```text
Admin check-in tenant baru seperti Paijo
→ tenant terbentuk
→ room OCCUPIED
→ stay ACTIVE
→ invoice awal ada tapi masih DRAFT
→ portal user belum otomatis dibuat
→ tenant belum tentu bisa login portal
→ tenant belum tentu melihat invoice/tagihan
→ admin harus ingat issue invoice dan create portal manual
```

Ini bukan regresi M2. Ini adalah **business automation gap**.

Target Batch B1:

```text
Manual check-in selesai
→ stay ACTIVE
→ room OCCUPIED
→ meter awal tercatat
→ invoice awal ISSUED
→ portal user auto-created jika email ada
→ jika portal user baru dibuat, temp password ditampilkan sekali
→ jika email kosong, portal status jelas: belum aktif
```

---

## 0D. Business Invariants Baru

### 1. `OCCUPIED` berarti bisnis sudah aktif

Jika `Stay ACTIVE` dan `Room OCCUPIED`, tenant sudah benar-benar menghuni. Konsekuensi bisnis utama harus siap:

- invoice resmi,
- portal access jika email tersedia,
- tenant bisa melihat stay/invoice,
- admin tidak perlu mengingat langkah manual kritis.

### 2. `DRAFT invoice` hanya untuk persiapan internal

Makna status invoice:

| Status | Makna bisnis |
|---|---|
| DRAFT | Belum resmi, internal, belum tenant-facing |
| ISSUED | Resmi, tenant-facing, bisa dibayar |
| PARTIAL | Sebagian dibayar |
| PAID | Lunas |
| CANCELLED | Dibatalkan |

Tenant yang sudah `OCCUPIED` tidak boleh diam-diam punya invoice awal `DRAFT` tanpa warning/automation.

### 3. Portal account otomatis jika memungkinkan

- Jika tenant punya email saat manual check-in, sistem mencoba auto-create portal user.
- Jika tenant tidak punya email, check-in tetap boleh lanjut, tetapi UI wajib jelas: portal belum aktif karena email kosong.

### 4. Portal auto-create harus idempotent

Batch B1 wajib memakai kontrak idempotent:

1. `MISSING_EMAIL`: tenant.email kosong → skip portal create + UI warning.
2. `CREATED`: tenant.email ada dan belum ada User → create portal user + return temp password sekali.
3. `ALREADY_ACTIVE`: User sudah ada untuk tenant yang sama → jangan error.
4. `CONFLICT`: email dipakai user/tenant lain → block conflict.

### 5. Temporary password hanya ditampilkan sekali

Jika portal user baru dibuat, backend boleh mengembalikan temporary password sekali di response check-in. Frontend harus menampilkan modal hasil check-in dengan:

- email portal,
- temporary password,
- tombol Salin Password,
- tombol Tutup,
- warning bahwa password hanya ditampilkan sekali.

Plaintext password tidak boleh disimpan. Jika admin lupa copy, reset manual dari Tenant Detail.

### 6. Deposit adalah liability, bukan sekadar angka

Deposit harus diperlakukan sebagai uang titipan. Saat checkout final, deposit perlu keputusan akhir:

- refund penuh,
- refund sebagian,
- forfeit/hangus,
- dipotong penalty,
- pending transfer.

Future Batch B4 perlu `DepositTransaction` / `DepositLog` untuk audit trail.

### 7. Damage dan inventory berbeda, tapi bisa terhubung

Kerusakan barang kamar bukan otomatis inventory movement.

- `RoomFacility.condition` berubah saat barang kamar rusak.
- `InventoryMovement` hanya dibuat jika stok fisik berubah: barang keluar, masuk, diganti, atau dipindahkan.

---

## 1. Identitas Proyek

| Item | Nilai |
|---|---|
| Nama | WebKost48 Surabaya V3/V4 |
| Model bisnis | Hybrid kos–hospitality |
| Backend | NestJS + Prisma + PostgreSQL |
| Frontend | React + Vite + TypeScript + React-Bootstrap + TanStack Query |
| Auth | JWT Bearer Token |
| App aktif | Backoffice + Tenant Portal + public room catalog |
| Environment default | Windows + VS Code + PowerShell |
| Repo | Monorepo sederhana: `/backend`, `/frontend`, `/docs` |
| Project root | `C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle` |
| API lokal | `http://localhost:3000/api` |
| Frontend lokal | `http://localhost:5173` |
| DB dev/UAT | `localhost:5433 / kost48_v3_pro / postgres` |

---

## 2. Arsitektur yang Tidak Ditawar

### Current baseline sebelum migration

1. Backend existing masih modular NestJS dalam `/backend`.
2. Frontend existing masih React/Vite dalam `/frontend`.
3. Database existing tetap PostgreSQL shared.
4. Prisma schema existing tetap source of truth bentuk data.

### Arah baru yang dikunci untuk audit

1. Boleh migrasi ke beberapa NestJS app/process dengan shared PostgreSQL.
2. Tidak memakai separate database per service pada fase awal.
3. Tidak memakai distributed transaction pada fase awal.
4. Tidak rewrite business logic dari nol.
5. Constraint bisnis penting tetap dibantu trigger/constraint DB (`bootstrap.sql` + addendum bila ada).
6. Operasi multi-entity penting tetap harus atomik dengan `prisma.$transaction()` selama masih shared DB.
7. Build success saja belum cukup; flow penting wajib UAT.
8. Default command/testing memakai Windows PowerShell.

---

## 3. Hierarki Source of Truth Aktif

| Prioritas | File aktif | Fungsi |
|---:|---|---|
| 1 | `backend/prisma/schema.prisma` | Bentuk data final |
| 2 | `backend/sql/bootstrap.sql` + addendum | Pagar integritas DB |
| 3 | `docs/00_GROUND_STATE.md` | Status proyek, keputusan aktif, arah next |
| 4 | `docs/01_CONTRACTS.md` | Kontrak bisnis/API/DTO |
| 5 | `docs/02_PLAN.md` | Master plan eksekusi V4 |
| 6 | `docs/CHECKLIST.md` | Checklist phase/UAT ringkas |
| 7 | `docs/03_DECISIONS_LOG.md` | Keputusan freeze historis dan terbaru |
| 8 | `docs/04_JOURNAL.md` | Arsip kronologis hasil kerja/UAT |
| 9 | `docs/CHANGELOG.md` | Ringkasan patch source/docs |

### File markdown lama yang boleh dihapus dari active docs

- `CURRENT_STATUS_2026-04-26.md`
- `README_PROGRESS_UPDATE.md`
- `PACKAGE_README_2026-04-27.md`
- `PATCH_SUMMARY*.md`
- `CHANGELOG_BACKEND.md`
- `FINAL_FRONTEND_FEATURES.md`
- `05_V4_MASTER_PLAN.md`
- `Pasted markdown*.md`, `Pasted text.txt`, dan helper UAT/debug yang bukan source.

---

## 4. Baseline Existing yang Wajib Dihormati

### Stay & Room

- Satu tenant hanya boleh punya satu stay `ACTIVE`.
- Satu room hanya boleh punya satu stay `ACTIVE`.
- `Room.status` harus sinkron dengan stay aktif.
- Backoffice direct check-in langsung membuat room `OCCUPIED`.
- Checkout berarti tenant benar-benar keluar kos.
- Room kembali `AVAILABLE` hanya jika tidak ada stay aktif lain.

### Booking tenant V4

- Tenant membuat booking mandiri dari public catalog.
- Booking memakai `Room.status = RESERVED` dan `Stay.status = ACTIVE` sebagai konteks booking.
- `expiresAt` wajib jujur dan tidak membuat false-expired.
- Tenant hanya mendapat akses penuh setelah pembayaran awal approved dan room `OCCUPIED`.

### Tenant identity

- Tenant baru wajib punya `identityNumber` / No KTP.
- No KTP wajib 16 digit angka.
- Backend mencegah duplicate No KTP, No HP, tenant email, dan konflik dengan `User.email`.
- Update tenant tidak boleh mengubah data menjadi duplicate tenant lain.

### Deposit

- Deposit awal booking dipakai untuk activation/payment tracking.
- Deposit pasca-checkout/refund tetap lifecycle terpisah.
- Deposit belum diputuskan otomatis saat checkout.
- Future Batch B4 perlu audit trail deposit.

### Meter

- Backoffice direct check-in: meter awal langsung menjadi 2 `MeterReading` karena room langsung `OCCUPIED`.
- Tenant booking flow: admin input meter saat approve booking, tetapi disimpan sebagai pending snapshot di `Stay`.
- Pending snapshot baru dipromosikan menjadi `MeterReading` saat payment approved dan room menjadi `OCCUPIED`.
- Cancel/expired sebelum `OCCUPIED` membersihkan snapshot, bukan menghapus histori meter operasional.
- Checkout occupied stay tidak menghapus `MeterReading`, payment, deposit, atau invoice history.
- Final meter akhir checkout perlu audit khusus: apakah hanya dicatat atau menghasilkan final utility invoice line.

### Invoice & Payment

- Total invoice dikelola dari `InvoiceLine` lewat trigger/recalc; service tidak boleh set total manual sembarangan.
- Invoice line hanya boleh berubah saat status `DRAFT`.
- Workflow booking payment 4.2 memakai satu submission gabungan untuk sewa + deposit.
- Nominal pembayaran awal wajib tepat sebesar sisa sewa + sisa deposit.
- Backend membagi combined payment secara internal.
- Room `RESERVED -> OCCUPIED` hanya jika sewa dan deposit awal sama-sama paid.
- **Target B1:** invoice manual check-in langsung `ISSUED`.

### Announcement & Notification

- `Announcement` = konten/papan pengumuman.
- `AppNotification` = inbox personal/read-unread per user.
- Announcement audience `TENANT` operasional hanya untuk tenant dengan hunian `OCCUPIED`.
- Tenant non-occupied yang membuka `/portal/announcements` harus diarahkan ke `/portal/bookings`.
- Finance-critical reminder tidak boleh hanya bergantung pada read/unread notification; butuh urgency chip persistent.

---

## 5. Current Next Work

### Batch B1 — Manual Check-in Business Automation

**Status:** NEXT P0 — belum dikerjakan.

**Goal:** manual check-in menghasilkan kondisi operasional lengkap:

- tenant/stay aktif,
- room occupied,
- meter awal tercatat,
- invoice awal `ISSUED`,
- portal user auto-created jika email tersedia,
- temp password ditampilkan sekali jika portal baru dibuat,
- status portal jelas jika email kosong atau portal sudah aktif.

**Pre-ACT:** wajib Cline PLAN audit dulu. Jangan langsung patch.

---

## 6. Cline Workflow Rules

1. Pilih satu mode: PLAN atau ACT.
2. Jangan campur PLAN dan ACT.
3. Untuk ACT, kerjakan satu vertical slice jelas.
4. Jangan ubah docs kecuali user meminta.
5. Jangan buat file markdown status baru tanpa alasan kuat.
6. File temporary test/helper harus dihapus sebelum selesai.
7. Semua command/test default memakai Windows PowerShell.
8. Jika terminal Cline bukan PowerShell, STOP. Jangan adapt ke cmd/Git Bash/WSL.
9. Untuk API test, gunakan PowerShell one-liner dengan `Invoke-RestMethod`.
10. Protected endpoint selalu pakai:
   ```powershell
   $token="PASTE_TOKEN_HERE"; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/..." -Headers @{Authorization="Bearer $token"}
   ```
11. Setelah patch: build, targeted UAT, `git status --short`.
12. Jangan ulang UAT yang sudah PASS kecuali patch menyentuh flow terkait.
