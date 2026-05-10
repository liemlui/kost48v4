# KOST48 V3/V4 — Ground State
**Versi:** 2026-05-04 production handoff  
**Status:** Source of truth utama untuk membuka sesi baru. Baca ini dulu sebelum `01_CONTRACTS.md`, `02_PLAN.md`, dan `CHECKLIST.md`.

---

## 0A. Latest Override — 2026-05-09 Working State

> Bagian ini mengalahkan status lama di bawahnya jika ada konflik. Baca ini dulu sebelum mengambil keputusan kerja.

### Status paling baru yang harus diingat

| Area | Status terbaru |
|---|---|
| Git/working tree | **Belum diasumsikan clean.** Selalu mulai sesi dengan `git status --short; git log --oneline -8`. |
| BIG UX checkout/sidebar patch | **Belum boleh dianggap committed** sampai user menunjukkan commit/push. Kemungkinan masih modified di 8 file frontend. |
| CSS modularization | **DIBATALKAN/DITUNDA.** Sempat menyebabkan visual regression. Jangan split `styles.css` lagi sekarang. |
| `styles.css` | Kembali ke monolithic CSS. M3 polish sudah pushed di `960f922 polish mobile layout and toast spacing`. |
| Dashboard command center | Browser UAT user: **OK/PASS** untuk dashboard command center. |
| M2 Manual check-in reliability | User manual UAT: **PASS** — modal close dan tenant select refresh sudah oke. |
| M4 Password visibility toggle | User menyatakan **PASS**. |
| Early checkout / rencana keluar | Flow harus jelas: approve rencana ≠ checkout final. Jika patch belum commit, selesaikan visual UAT + commit dulu. |
| DB dev/UAT | User sudah eksplisit mengizinkan reset. `migrate reset` gagal karena migration tertinggal. Pakai `prisma db push --force-reset`. |
| Seed dev/UAT baru | OWNER `liem.lui@gmail.com / admin123`; ADMIN `admin@kost48.com / admin123`; TENANT `tenant.g2@kost48.com / tenant123`; rooms G2-001..003. |
| Staff inventory | Rule baru: STAFF **read-only** untuk inventory items; hanya OWNER/ADMIN boleh create/edit/delete/adjust. Perlu audit+patch backend+frontend. |

### Current boot command for new session

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -8
```

### Jangan salah arah

- Jangan mulai Phase 4.4/4.5 sebelum working tree aman, DB dev fresh, dan full checkout UAT selesai.
- Jangan klaim Early Checkout/Rencana Keluar PASS sebelum browser UAT: tenant request → admin approve rencana → tenant tetap menghuni → admin Checkout Final → stay completed.
- Jangan lakukan CSS modularization ulang sekarang.
- Jangan reset DB production.
- Jangan commit docs/status file baru; hanya 7 active docs ini.


## 0. Ringkasan Status Terbaru

| Area | Status |
|---|---|
| Gate 1 / UAT 4.0 Booking Mandiri | ✅ PASS |
| Gate 2 / UAT 4.1 Admin Approval | ✅ PASS |
| UAT 4.2 Payment Submission Core | ✅ CORE PASS / operationally accepted |
| Pricing Policy V1 | ✅ PASS |
| Phase 4.3-A Reminder Preview | ✅ PASS / committed |
| Phase 4.3-B Reminder Mock Send | ✅ PASS / committed |
| Phase 4.3-C Notification Center MVP | ✅ COMPLETE / committed |
| Phase 4.3-G1 Announcement Access Guard | ✅ PASS / committed |
| Phase 4.3-G2 Pending Meter Snapshot | ✅ Fresh UAT PASS / committed |
| G2e/G2f Legacy Meter Cleanup | ✅ SKIPPED — DB dev reset clean before live |
| Seed dev/UAT | ✅ committed: `256a6f4 seed dev data for G2 UAT` |
| Production frontend/backend | ✅ CONNECTED — `app.kost48surabaya.com` → `api.kost48surabaya.com/api` |
| Production admin login | ✅ PASS — `admin@kost48.com / admin123` |
| Protected production API | ✅ PASS — `/api/me/notifications` |
| Production reminder preview | ✅ PASS — `/api/admin/reminders/preview/all` |
| GitHub main | ✅ pushed to `54e74e6 optimize response serialization` |
| Immediate maintenance | 🟡 Cline cleanup unused files/config only, then verify |
| Next ACT | 🟡 Phase 4.3-D — Tenant Payment Urgency Header Chip |
| Real WhatsApp provider / scheduler / push | ⬜ Deferred |


### Latest production evidence — 2026-05-04
Production deploy verification membuktikan:
- Frontend production `https://app.kost48surabaya.com` berhasil login ke backend production.
- Backend production base API aktif di `https://api.kost48surabaya.com/api`.
- Public endpoint `GET /api/public/rooms` reachable; data rooms production masih kosong bila `items: []`.
- Admin login production PASS dan mengembalikan JWT.
- Protected endpoint `GET /api/me/notifications` PASS.
- Reminder preview endpoint aktif di `GET /api/admin/reminders/preview/all`.
- DB permission + sequence grant production sudah diperbaiki untuk user DB aplikasi.
- GitHub `origin/main` sudah sinkron sampai commit `54e74e6`.
- Hotfix langsung ke production `dist` hanya boleh dianggap emergency; patch normal harus lewat source lokal → build → commit → push → deploy.

### Latest accepted G2 evidence
Fresh UAT G2 membuktikan:
- `approveBooking` hanya menyimpan pending meter snapshot di `Stay`.
- `MeterReading` tetap `0` setelah approval booking.
- Combined payment awal Rp2.700.000 berhasil dibuat dan di-approve.
- Payment approval membuat room `RESERVED -> OCCUPIED`.
- Pending snapshot dipromosikan menjadi 2 `MeterReading`: `ELECTRICITY` dan `WATER`.
- Pending snapshot dibersihkan setelah promotion.
- `expire-booking` pada room `OCCUPIED` ditolak `409` dan data tidak berubah.
- `runExpiryCheck` hanya menargetkan booking `ACTIVE + RESERVED + unpromoted`.

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
| Active branch saat G2 PASS | `checkpoint/uat-4-2-before-cancelstay-fix` |

---

## 2. Arsitektur yang Tidak Ditawar

1. Satu backend modular NestJS.
2. Satu database PostgreSQL.
3. Satu Prisma schema.
4. Tidak memakai microservices.
5. Constraint bisnis penting dibantu trigger/constraint DB (`bootstrap.sql` + addendum bila ada).
6. Operasi multi-entity penting wajib atomik dengan `prisma.$transaction()`.
7. Build success saja belum cukup; flow penting wajib UAT.
8. Default command/testing memakai Windows PowerShell.

---

## 3. Hierarki Source of Truth Aktif

Dokumen lama yang bersifat package/readme/patch summary sudah digabung ke set aktif ini. Jangan buat ulang file status baru setiap patch kecil.

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
- `PATCH_SUMMARY.md`
- `PATCH_SUMMARY_PHASE_4_3_G_LIFECYCLE_DECISION.md`
- `CHANGELOG_BACKEND.md`
- `FINAL_FRONTEND_FEATURES.md`
- `05_V4_MASTER_PLAN.md` — isinya digabung ke `02_PLAN.md`
- File sementara seperti `Pasted markdown*.md`, `Pasted text.txt`, dan helper UAT/debug yang bukan source.

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

### Deposit
- Deposit awal booking dipakai untuk activation/payment tracking.
- Deposit pasca-checkout/refund tetap lifecycle terpisah.
- Deposit tidak diputuskan otomatis saat checkout.
- Process deposit diblok jika masih ada invoice `ISSUED` atau `PARTIAL`.
- UI tidak boleh membaca `depositStatus` sendirian sebagai bukti bayar.

### Meter
- Backoffice direct check-in: meter awal langsung menjadi 2 `MeterReading` karena room langsung `OCCUPIED`.
- Tenant booking flow: admin tetap input meter saat approve booking, tetapi disimpan sebagai pending snapshot di `Stay`.
- Pending snapshot baru dipromosikan menjadi `MeterReading` saat payment approved dan room menjadi `OCCUPIED`.
- Cancel/expired sebelum `OCCUPIED` membersihkan snapshot, bukan menghapus histori meter operasional.
- Checkout occupied stay tidak menghapus `MeterReading`, payment, deposit, atau invoice history.

### Invoice & Payment
- Total invoice dikelola dari `InvoiceLine` lewat trigger/recalc; service tidak boleh set total manual sembarangan.
- Invoice line hanya boleh berubah saat status `DRAFT`.
- Workflow booking payment 4.2 memakai satu submission gabungan untuk sewa + deposit.
- Nominal pembayaran awal wajib tepat sebesar sisa sewa + sisa deposit.
- Backend membagi combined payment secara internal.
- Room `RESERVED -> OCCUPIED` hanya jika sewa dan deposit awal sama-sama paid.

### Announcement & Notification
- `Announcement` = konten/papan pengumuman.
- `AppNotification` = inbox personal/read-unread per user.
- Announcement audience `TENANT` operasional hanya untuk tenant dengan hunian `OCCUPIED`.
- Tenant non-occupied yang membuka `/portal/announcements` harus diarahkan ke `/portal/bookings`.
- Finance-critical reminder tidak boleh hanya bergantung pada read/unread notification; butuh urgency chip persistent.

---

## 5. Current Next ACT

### Phase 4.3-D — Tenant Payment Urgency Header Chip
Tujuan: tenant terus melihat kewajiban aktif walau notifikasi sudah dibaca.

Scope MVP:
- Frontend-first.
- Tenant-only.
- Chip di header/topbar dekat notification bell.
- Tidak membuka WhatsApp, scheduler, push, service worker, SSE, websocket.

Prioritas chip:
1. Invoice overdue: `Terlambat X hari`.
2. Booking payment deadline: `Bayar sebelum X jam`.
3. Invoice due soon: `Tagihan H-X` / `Jatuh tempo hari ini`.
4. Stay/contract ending soon: `Kontrak H-X`.

Acceptance criteria:
- Chip tidak muncul bila tidak ada urgency.
- Chip tetap muncul walau notification sudah read selama kondisi bisnis masih aktif.
- Chip hilang jika invoice paid, booking resolved, atau stay/contract resolved.
- Klik chip mengarah ke `/portal/invoices`, `/portal/bookings`, atau `/portal/stay` sesuai sumber urgency.

---

## 6. Cline Workflow Rules

1. Pilih satu mode: PLAN atau ACT.
2. Untuk ACT, kerjakan satu vertical slice jelas.
3. Jangan ubah docs kecuali user meminta.
4. Jangan buat file markdown status baru tanpa alasan kuat.
5. File temporary test/helper harus dihapus sebelum selesai.
6. Untuk API test, gunakan PowerShell one-liner dengan `Invoke-RestMethod`.
7. Protected endpoint selalu pakai:
   ```powershell
   $token="PASTE_TOKEN_HERE"; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/..." -Headers @{Authorization="Bearer $token"}
   ```
8. Setelah patch: build, targeted UAT, `git status --short`.
9. Jangan ulang UAT yang sudah PASS kecuali patch menyentuh flow terkait.
