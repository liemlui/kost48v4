# KOST48 V3/V4 — Decisions Log
**Versi:** 2026-05-04 production handoff  
**Fungsi:** Arsip keputusan freeze. Tambahkan keputusan baru di bawah; jangan buat file decision baru.

---

## Keputusan Utama yang Masih Aktif

| # | Keputusan | Dampak |
|---:|---|---|
| 1 | Arsitektur monorepo sederhana `/backend`, `/frontend`, `/docs` | Struktur tetap sederhana |
| 2 | Tidak memakai microservices | Satu NestJS backend + satu PostgreSQL |
| 3 | `schema.prisma` adalah bentuk data utama | Semua docs kalah dari schema |
| 4 | `bootstrap.sql` adalah pagar integritas DB | Setelah reset DB wajib run bootstrap |
| 5 | Vertical slice sebagai strategi utama | Hindari rewrite total |
| 6 | Windows PowerShell sebagai default command | Semua contoh test pakai PowerShell |
| 7 | Checkout = tenant benar-benar keluar kos | Deposit diproses terpisah |
| 8 | Debt flow ditunda | Tidak buka status hutang baru |
| 9 | Create stay backoffice langsung operational `OCCUPIED` | Meter awal langsung `MeterReading` |
| 10 | Renewal = extend existing active stay | Bukan create stay paralel |
| 11 | Total invoice mengikuti line/recalc | Service tidak set total manual sembarangan |
| 12 | Overpay dilarang | Backend dan DB guard tetap dipertahankan |
| 13 | Tenant tidak menulis langsung ke `InvoicePayment` | Tenant memakai `PaymentSubmission` |
| 14 | Admin tetap memegang approval final | Booking/payment tetap human-approved |
| 15 | Payment submission harus idempotent/race-safe | Tidak boleh double payment/final activation |
| 16 | Initial booking payment = combined rent + deposit | Tenant tidak pilih target teknis |
| 17 | Nominal initial booking payment harus tepat | No underpay/overpay/partial |
| 18 | Room `RESERVED -> OCCUPIED` hanya setelah rent + deposit paid | Aktivasi kamar jujur |
| 19 | `Announcement` ≠ `AppNotification` | Konten broadcast dan inbox personal dipisah |
| 20 | PWA push adalah channel nanti | Bukan pengganti Announcement/AppNotification |
| 21 | Finance reminder butuh persistent urgency chip | Read/unread notification tidak cukup |

---

## 2026-04-24 — Combined Booking Payment Freeze

| # | Keputusan | Dampak |
|---:|---|---|
| 98 | Workflow booking payment final menggunakan satu submission gabungan untuk sewa + deposit | UX tenant lebih sederhana |
| 99 | Nominal pembayaran awal wajib sama persis dengan sisa sewa + sisa deposit | Tidak ada underpay/overpay/partial |
| 100 | Backend membagi combined payment secara internal | Rent portion → InvoicePayment; deposit portion → tracking deposit awal |
| 101 | Room `RESERVED -> OCCUPIED` hanya setelah invoice sewa dan deposit sama-sama paid | Aktivasi kamar tidak terjadi hanya karena upload proof |
| 102 | `targetType/targetId` bila masih ada adalah compatibility/internal metadata | Tidak menjadi pilihan tenant-facing |
| 103 | Status `PARTIAL` tidak digunakan di initial booking payment 4.2 | Nominal salah ditolak |

---

## 2026-04-27 — Notification Center Freeze

| # | Keputusan | Dampak |
|---:|---|---|
| 119 | Phase 4.3 dibuka preview-first, bukan real send dulu | Mengurangi risiko spam |
| 120 | Reminder Mock Send tidak mengirim WhatsApp asli | Aman untuk UAT |
| 121 | `AppNotification` menjadi inbox personal/read-unread | Terpisah dari Announcement/AuditLog |
| 122 | Semua role authenticated punya notification bell | Akses universal via header |
| 123 | Tenant punya sidebar menu Notifikasi | Tenant portal tetap jelas |
| 124 | Owner/Admin/Staff cukup akses lewat bell/header | Backoffice tetap compact |
| 125 | Real WhatsApp/scheduler/push/SSE/websocket deferred | Foundation dulu, automation nanti |
| 126 | Payment Urgency Chip menjadi next UX finance | Kewajiban bayar tetap terlihat sampai selesai |

---

## 2026-04-27 — Lifecycle Integrity Freeze

| # | Keputusan | Dampak |
|---:|---|---|
| 127 | Announcement audience `TENANT` operasional hanya untuk occupied tenants | Non-occupied tenant tidak melihat operational announcements |
| 128 | Tenant non-occupied diarahkan dari `/portal/announcements` ke `/portal/bookings` | Portal lebih stage-aware |
| 129 | Admin approve booking tetap input meter awal | Data kontrak lengkap sejak approval |
| 130 | Meter input approval booking disimpan sebagai pending snapshot di `Stay` | Tidak membuat `MeterReading` terlalu dini |
| 131 | `MeterReading` final tenant booking dibuat saat payment approved/room `OCCUPIED` | Mencegah duplicate/zombie meter saat booking cancel/rebook |
| 132 | Cancel/expired sebelum occupied membersihkan pending snapshot | Tidak menghapus histori operational meter |
| 133 | Checkout occupied stay mempertahankan semua histori | Audit/payment/meter/deposit tetap aman |
| 134 | Deposit booking awal tetap dipisah dari deposit refund setelah checkout | Tidak campur lifecycle |
| 135 | Stage-aware audience advanced + meter metadata menjadi long-term improvement | Tidak dibuka sekarang |

---

## 2026-04-28 — G2 Fresh UAT Decision

| # | Keputusan | Dampak |
|---:|---|---|
| 136 | Fresh UAT G2 dinyatakan PASS | Pending meter snapshot core aman |
| 137 | G2e/G2f legacy meter audit/cleanup di-skip | DB dev sudah reset clean sebelum live |
| 138 | `seed-admin.ts` disimpan sebagai dev/UAT seed | Reset UAT berikutnya lebih cepat |
| 139 | File markdown status/readme/patch summary digabung ke active docs | Dokumen tidak terlalu banyak dan tidak dibuat ulang terus |
| 140 | `05_V4_MASTER_PLAN.md` digabung ke `02_PLAN.md` | Satu master plan aktif |

---


## 2026-05-04 — Production Deployment & Cleanup Decision

| # | Keputusan | Dampak |
|---:|---|---|
| 141 | Production backend/frontend connection dinyatakan PASS | `app.kost48surabaya.com` memakai `api.kost48surabaya.com/api` |
| 142 | Production admin login dinyatakan PASS | Admin seed dan DB permission production sudah benar |
| 143 | Reminder preview production endpoint memakai `/api/admin/reminders/preview/all` | Frontend reminder harus memakai path admin reminder contract |
| 144 | Hotfix langsung ke `dist` hanya untuk emergency | Patch normal wajib lewat source, build, commit, push, deploy |
| 145 | Cleanup berikutnya harus audit-first | Jangan hapus file source/flow aktif tanpa bukti tidak dipakai |
| 146 | `.htaccess` production dianggap deployment config, bukan source app default | Jangan commit kecuali diputuskan sebagai bagian deploy strategy |

---

## Documentation Hygiene Rule

Jangan buat file baru seperti:
- `CURRENT_STATUS_YYYY-MM-DD.md`
- `PATCH_SUMMARY_*.md`
- `PACKAGE_README_*.md`
- `README_PROGRESS_UPDATE.md`
- changelog frontend/backend terpisah

Kecuali user eksplisit minta. Update cukup ke:
- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`
