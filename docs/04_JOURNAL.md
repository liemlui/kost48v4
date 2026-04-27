# KOST48 V3 — Project Journal
**Arsip kronologis milestone, keputusan sesi, dan hasil verifikasi. Tidak dipakai sebagai acuan aktif.**

---

## 2026-04-13 — Audit Happy Path Core Commercial Flow
- Backend core commercial flow diverifikasi hingga checkout dan process deposit
- Bug double processing deposit ditemukan dan ditutup
- Kesimpulan: fondasi inti backend cukup kuat untuk dijadikan dasar integrasi frontend

---

## 2026-04-14 — Frontend Cleanup Awal
- Tenants form dirapikan agar lebih sinkron dengan backend
- Dashboard 500 error ditutup lewat safe serialization
- Navigasi stays disederhanakan menjadi satu entry dengan toggle status

---

## 2026-04-15 — Regression Cleanup Batch 1
- Check-in success handling diperbaiki
- Query invalidation dibenahi
- Type safety response create stay diperbaiki
- Format tanggal, period, due, Rupiah distandardkan
- Occupancy consistency tenant diperbaiki

**Hasil:** False error saat create stay hilang; list lebih aman terhadap invalid date

---

## 2026-04-15 — Freeze Logic Stays & Scope Aktif
- Checkout = tenant keluar kos (dibekukan)
- Deposit diproses terpisah (dibekukan)
- Debt flow ditunda
- Meter awal sebagai `MeterReading`, bukan field `Stay` (dibekukan)
- `PENDING` tidak dibuka di scope aktif

---

## 2026-04-15 — Tenants & Rooms Final Hardening
- Occupancy warning di tenant list
- Guard nonaktif tenant yang sedang occupied
- Room occupied tidak bisa dinonaktifkan
- Tampilan status dan penghuni dirapikan

---

## 2026-04-16 — Fase 3A Backend: Atomic Initial Meter
- `CreateStayDto` ditambah `initialElectricityKwh` + `initialWaterM3` (required)
- Create stay sekarang membuat 2 baseline `MeterReading` dalam satu transaction
- Validasi non-negatif, uniqueness, monotonic ditutup
- ✅ Backend build sukses; ✅ Create stay valid sukses; ✅ Rollback aman bila meter gagal

---

## 2026-04-16 — Fase 3A Frontend: Meter Awal Wajib di Check-in Wizard
- Wizard check-in diselaraskan dengan DTO backend baru
- Field meter awal listrik dan air menjadi required dengan validasi (angka valid, tidak negatif)
- Payload submit mencakup `initialElectricityKwh` dan `initialWaterM3` sebagai string
- ✅ Build frontend sukses; ✅ Submit valid sukses end-to-end

---

## 2026-04-16 — Checkout UX Hardening
- Tombol utama stay detail menjadi "Checkout"
- Modal checkout Bahasa Indonesia penuh
- `checkoutReason` wajib diisi
- Hint jelas bahwa deposit diproses terpisah
- ✅ Build frontend sukses

---

## 2026-04-17 — Reminder Lifecycle Ringan (Frontend-Only)
- ACT 1: reminder harian di dashboard (H-10 checkout, H-3 invoice)
- ACT 2: badge reminder di stays list (H-10, H-7, H-3)
- ACT 3: due-soon badge di invoices list (Hari Ini, Besok, H-3)
- ✅ Scheduler tidak dibuka; ✅ Tidak ada endpoint baru

---

## 2026-04-17 — Deposit Queue Read-Only
- Backend: `GET /stays` ditambah filter `depositStatus` dan computed `openInvoiceCount`
- Dashboard: section "Antrian Deposit" menampilkan stay COMPLETED/CANCELLED dengan deposit HELD
- Dibagi: "Siap Diproses" vs "Tertahan — Masih Ada Tagihan"
- ✅ Read-only; ✅ Tidak ada schema change; ✅ Tidak membuka flow PENDING

---

## 2026-04-17 — Check-in Wizard Eligibility Hardening
- Bug: tenant dengan stay COMPLETED historis sempat ikut terblokir
- Fix: eligibility hanya berbasis stay `ACTIVE` (bukan COMPLETED/CANCELLED)
- `SearchableSelect` diperbaiki untuk mendukung preload/default options
- ✅ Wizard eligibility runtime dianggap cukup stabil

---

## 2026-04-17 — Commercial Entry Flow — ACT 1-3
- ACT 1: display consistency stays/invoices list (format Rupiah, fallback tanggal, filter status)
- ACT 2: payment entry UX hardening di `InvoiceDetailPage` (modal pembayaran, ringkasan Total/Dibayar/Sisa, blokir overpay di UI)
- ACT 3: unpaid warning + deposit wording clarity di `StayDetailPage`
- ✅ Build frontend sukses; ✅ Tidak ada perubahan backend contract

---

## 2026-04-18 — Invoice Automation & Renew Flow
- Create stay auto-membuat invoice awal `DRAFT` + line `RENT` (backend)
- Renew stay auto-membuat invoice renewal `DRAFT` (backend)
- `RenewStayModal` ada di frontend; `POST /stays/:id/renew` tersedia
- ⚠️ Runtime verification masih bercampur — belum 100% freeze-ready saat itu

---

## 2026-04-18 — Audit Komprehensif Backend & Frontend

**Backend gaps teridentifikasi:**
1. `PATCH /stays/:id` belum ada → ditutup di batch ini
2. `renewStay` period bug untuk stay tanpa `plannedCheckOutDate` → ditutup
3. `ProcessDepositDto.action` validasi longgar → ditutup (pakai `@IsEnum`)
4. Ticket number race condition → diberi fallback aman
5. `cancelReason` belum disimpan eksplisit → ditutup
6. `findOne` stay tidak konsisten dengan `openInvoiceCount` → ditutup

**Frontend gaps teridentifikasi:**
1. Meter tab cache key mismatch → ditutup
2. Free-text enum di check-in wizard → ditutup (dropdown)
3. Save notes stay 404 (backend gap) → ditutup via PATCH
4. FinanceTab paid summary tidak akurat → dibenahi
5. MeterTab membaca field meter awal palsu dari stay → dibenahi
6. Process deposit belum support FORFEIT → ditutup
7. Dashboard tidak diinvalidasi setelah aksi stay → ditutup
8. MyTicketsPage alias TicketsPage backoffice → dibenahi
9. Announcements tenant endpoint tidak pasti → dibenahi defensif
10. Tidak ada global 401 interceptor → ditutup

---

## 2026-04-18 — Sinkronisasi Ulang Dokumen Aktif
- Docs lama saling bertabrakan antara "verify/freeze kecil" vs "role-based restructure besar"
- Keputusan: baseline existing tetap dipakai; fokus resmi = Batch 0 Stabilization lalu role-based restructure bertahap
- Paket docs sinkronisasi 13 file dibuat

---

## 2026-04-19 — Batch A & B Frontend Freeze

**Batch A:**
- Route `/dashboard` dikunci — tenant di-redirect ke portal
- Login tidak lagi memprefill kredensial
- Dashboard invalidation diperbaiki via prefix/predicate

**Batch B:**
- Tenant pages jujur soal empty state vs error operasional
- Overdue invoice tenant dihitung per tanggal (bukan jam-menit-detik)
- Announcements tenant lebih defensif
- FinanceTab paid summary lebih jujur
- Ticket pages lebih tenant-friendly

---

## 2026-04-19 — Phase A Role-Based Navigation Dianggap Cukup Berjalan
- Navigation per role sudah nyata
- Owner/Admin/Staff/Tenant tidak lagi membaca surface yang sama
- Route guard inti sudah lebih aman

---

## 2026-04-20 — Phase B Portal Access Core Freeze

- Backend: `POST /tenants/:id/portal-access`, `PATCH /tenants/:id/portal-access/status`, `POST /tenants/:id/portal-access/reset-password` — tersedia
- Frontend: tenant detail enriched dengan portal summary read-only
- Frontend: email portal tidak terasa ganda di create/edit
- Frontend: honest portal visibility — tidak ada fake toggle
- Frontend: toggle/create/reset portal access dari tenant context (OWNER/ADMIN)
- Role OWNER/ADMIN menjadi pengelola lifecycle dasar portal tenant
- ✅ Core slice Phase B dianggap freeze-ready
- ▶️ Next official phase = Ticket Tenant-Only Redesign

---

## 2026-04-20 — Audit Frontend Komprehensif

Hasil audit codebase (dari sesi terpisah):

**P0 — Bug kritis:**
1. `ResourceFormModal` mutasi `editingItem.portalUserSummary` langsung → React tidak re-render → toggle portal tidak update UI
2. `OwnerDashboard` fetches invoices dengan hard limit 200 → angka finansial tidak akurat jika invoice > 200
3. Tenant type (`types/index.ts`) tidak include `identityNumber`, `emergencyContactName`, `emergencyContactPhone` yang ada di form config

**P1 — Gap kontrak:**
4. PENDING filter masih tersisa di `StaysPage` dan blok PENDING di `StayDetailPage` — kontradiktif dengan keputusan freeze
5. `activateStay()` dead code masih ada di `api/stays.ts` (sisa dari flow PENDING lama)
6. `MyTicketsPage` memanggil endpoint backoffice `/tickets` bukan endpoint tenant-first
7. `tenants.ts` menggunakan CRLF, file lain LF
8. `cancelStay` mengirim `{ notes }` bukan `{ cancelReason }` — perlu verifikasi DTO backend

**P2 — UX/performa:**
9. Hard limit 500 di seluruh `SimpleCrudPage` tanpa pagination real
10. Tidak ada JWT refresh mechanism
11. Breadcrumb bisa salah match untuk nested paths
12. `MyStayPage` menampilkan tarif alternatif room yang tidak relevan untuk tenant
13. User form masih raw number input untuk `tenantId`

**Prioritas pra-Phase C (sebelum masuk ACT C-1):**
- Fix `ResourceFormModal` state mutation (P0, 1 file)
- Hapus PENDING filter + blok dari UI (2 file)
- Remove `activateStay` dead code (1 file)
- Normalize line ending `tenants.ts`

---

## 2026-04-21 — Backend Patch Completion & V4 Roadmap

- Backend patch (Fase 3.5) selesai dikerjakan oleh ChatGPT.
- Seluruh item P0 dan P1 dari audit backend ditutup.
- Celah keamanan JWT fallback, login enumeration, dan otorisasi admin terhadap Owner diperbaiki.
- Endpoint baru ditambahkan: `POST /tickets/portal`, `POST /auth/change-password`, `GET /stays/:id/invoice-suggestion`.
- `GET /rooms/:id` diperkaya dengan `currentStay`, `roomItems`, `meterSummary`.
- Legacy path `PENDING` dan `activateStay()` dihapus total dari backend.
- DTO diperketat sesuai policy kontrak.
- **V4 Roadmap** disusun dan disepakati:
  - Fase 4.0–4.5 mencakup booking mandiri, approval admin, pembayaran mandiri, notifikasi WhatsApp, marketing display, dan self-service tenant.
  - Status kamar `RESERVED` akan ditambahkan untuk mendukung flow booking.
  - Registrasi fleksibel (email/HP) dan soft delete akun tenant.
- Dokumentasi proyek (`02_PLAN.md`, `00_GROUND_STATE.md`, `CHECKLIST.md`) diperbarui untuk mencerminkan status terkini.

---

## 2026-04-21 — V4 Fase 4.0 Backend Core Patched + Sync Status Docs

- Dev DB lokal sempat di-reset karena drift migration Prisma.
- Schema V4 dasar berhasil diselaraskan:
  - `RoomStatus.RESERVED`
  - `Stay.expiresAt`
- Migration dev DB berhasil dijalankan ulang.
- Prisma client berhasil digenerate ulang di environment lokal.
- Build backend berhasil.
- Seed admin berhasil dijalankan ulang untuk environment dev.

### Backend V4 Fase 4.0 yang sudah dipatch
- `GET /public/rooms`
- `POST /tenant/bookings`
- `GET /tenant/bookings/my`

### Catatan implementasi backend
- Flow booking tenant dibuat tetap sempit dan fokus pada slice inti.
- Booking dibuat dengan pendekatan atomik agar perubahan stay/room tetap aman.
- Scope sengaja **tidak** membuka:
  - approval booking admin,
  - payment submission,
  - scheduler expiry umum,
  - debt flow,
  - redesign accounting,
  - frontend V4.

### Status docs setelah sinkronisasi
- `CHECKLIST.md` perlu/atau sudah diperbarui agar:
  - 4.0.1–4.0.5 backend ditandai selesai,
  - 4.0.6–4.0.9 tetap belum,
  - UAT tetap ditandai belum lolos penuh.
- `02_PLAN.md` perlu/atau sudah diperbarui agar Fase 4.0 ditulis sebagai:
  - backend inti sudah dipatch,
  - frontend dan UAT penuh masih tertunda.

### Posisi proyek setelah entry ini
- Fase 0–3.5 tetap dianggap selesai.
- V4 tidak lagi di posisi nol; backend inti booking mandiri sudah mulai masuk.
- Fokus kerja praktis berikutnya:
  1. Frontend V4 4.0.6–4.0.9
  2. Baru setelah itu UAT end-to-end flow booking
  3. Fase 4.1+ tetap belum dibuka

  ---

## 2026-04-21 — V4 Fase 4.0 Frontend Surface Patched

- Frontend V4 Fase 4.0 berhasil dipatch untuk menutup surface booking mandiri tenant.
- Surface yang ditutup:
  - katalog publik `/rooms`
  - form booking `/booking/:roomId`
  - halaman tenant `Pemesanan Saya`
  - surface read-only booking reserved di backoffice
- Route `/rooms` dibuat mendukung dua surface:
  - backoffice rooms untuk OWNER / ADMIN / STAFF
  - katalog publik untuk guest / TENANT
- Frontend diselaraskan dengan kontrak backend booking mandiri:
  - `GET /public/rooms`
  - `POST /tenant/bookings`
  - `GET /tenant/bookings/my`
  - `RoomStatus.RESERVED`
  - `Stay.expiresAt`
- Batch ini sengaja tidak membuka:
  - approval booking admin,
  - payment submission,
  - reminder / scheduler,
  - Fase 4.1+
- Build frontend dinyatakan sukses.
- Setelah entry ini, Fase 4.0 pada level patch kode dianggap tertutup di backend + frontend, tetapi UAT end-to-end masih menjadi langkah berikutnya sebelum masuk Fase 4.1.

## 2026-04-21 — V4 Fase 4.1B Frontend Approval Surface Patched

- Frontend V4 Fase 4.1B berhasil dipatch khusus untuk surface approval booking backoffice dan status tenant portal setelah approval.
- Surface yang ditutup:
  - queue approval booking di halaman `Stays` melalui mode `Booking Reserved`
  - modal form approval booking yang memakai endpoint backend existing `PATCH /admin/bookings/:stayId/approve`
  - status tenant portal `Menunggu Approval` / `Menunggu Pembayaran` di halaman `Pemesanan Saya`
- Frontend sengaja tidak membuka:
  - payment submission
  - upload bukti bayar
  - auto activation `RESERVED -> OCCUPIED`
  - Fase 4.2+
- Build frontend dinyatakan sukses.
- Setelah entry ini, backend 4.1A + frontend 4.1B sudah tertutup di level patch kode, tetapi UAT approval booking end-to-end masih menjadi langkah berikutnya sebelum Fase 4.2 dibuka.


## 2026-04-22 — Sinkronisasi Dokumen Detail Fase 4.2–4.5

- Dokumen proyek disinkronkan ulang agar blueprint implementasi Fase 4.2, 4.3, 4.4, dan 4.5 menjadi jauh lebih detail dan siap dipakai sebagai acuan ACT bertahap.
- `02_PLAN.md` diperluas untuk memecah tiap fase menjadi scope resmi, ACT backend/frontend rinci, dan acceptance criteria.
- `01_CONTRACTS.md` diperluas untuk menjelaskan kontrak vNext payment submission, reminder WhatsApp, room detail publik, registrasi fleksibel, soft delete akun, tenant renew request, dan forgot/reset password.
- `03_DECISIONS_LOG.md` ditambah freeze keputusan arsitektur untuk 4.2–4.5 agar eksekusi berikutnya tidak liar.
- `CHECKLIST.md` dipecah menjadi subtugas yang lebih granular untuk 4.2–4.5.
- `00_GROUND_STATE.md` ditegaskan kembali bahwa blueprint 4.2–4.5 sudah siap, tetapi implementasi kode tetap menunggu urutan resmi: UAT 4.0 → UAT 4.1 → Fase 4.2.
- Entry ini adalah **sinkronisasi dokumentasi**, bukan klaim bahwa kode 4.2–4.5 sudah live.


---

## 2026-04-23 — UAT Parsial V4 4.0–4.1 + Patch Korektif + Refactor Struktur

- UAT parsial dimulai pada flow aktif V4 dan menghasilkan temuan nyata:
  - `/rooms` publik dinyatakan aman
  - `/rooms` untuk ADMIN berhasil masuk ke workspace backoffice
  - tenant berhasil membuat booking baru
- Temuan bug selama UAT parsial:
  - `check-in` dan `expiresAt` sempat tampil `-` pada surface admin/tenant
  - approval booking sempat terkena `409` karena booking terasa kedaluwarsa terlalu cepat
  - modal approve/review frontend sempat tidak menutup walau aksi backend sukses
  - pada prototype flow payment submission, approval payment sempat menabrak constraint invoice (`invoice_status_consistency_chk`)
- Patch korektif yang dibuat selama rangkaian ini:
  - backend fix `calculateBookingExpiry()` agar expiry jatuh ke akhir hari
  - backend fix serialisasi `Date`
  - backend fix coercion boolean tertentu pada payload/admin form
  - backend fix `issuedAt` consistency saat invoice bergerak dari `DRAFT`
  - frontend patch close-modal / invalidate query pada review payment disiapkan
- Refactor struktur source juga dikerjakan:
  - backend: beberapa service besar dipecah agar file source utama turun ke kisaran <= 500 baris
  - frontend: `resources.ts` dan `CheckInWizard.tsx` dipecah ke file config/sections yang lebih kecil
- Kesimpulan sesi:
  - fondasi 4.0–4.1 semakin dekat stabil, tetapi gate UAT tetap belum dinyatakan lulus penuh
  - 4.2 sempat diprototipekan untuk menutup blocker integrasi, namun masih harus dianggap non-baseline sampai gate resmi lolos

---

## 2026-04-24 — Deep Patch Booking → Approval → Payment + Sinkronisasi Dokumen

- Source patch lanjutan untuk alur booking/payment disiapkan lebih dalam pada artifact kerja terbaru.
- Fokus utama batch:
  - hardening integritas booking
  - perbaikan expiry cleanup
  - fondasi split payment `INVOICE | DEPOSIT`
  - UX tenant/admin yang lebih jujur
- Error constraint invoice yang sempat muncul pada approval (`detail invoice hanya boleh diubah saat status DRAFT`) ditangani secara desain dengan rule: invoice tetap/masuk `DRAFT` saat edit detail, lalu baru bergerak ke status operasional yang benar.
- Sinkronisasi dokumentasi dilakukan pada seluruh dokumen inti agar:
  - status 4.2 tidak lagi dibaca sebagai nol mutlak
  - tetapi tetap belum diklaim resmi/live penuh tanpa verifikasi lokal dan UAT
- Output sesi dokumentasi:
  - `00_GROUND_STATE.md`
  - `01_CONTRACTS.md`
  - `02_PLAN.md`
  - `03_DECISIONS_LOG.md`
  - `04_JOURNAL.md`
  - `05_V4_MASTER_PLAN.md`
  - `CHANGELOG.md`
  - `CHANGELOG_BACKEND.md`
  - `CHECKLIST.md`
  - `FINAL_FRONTEND_FEATURES.md`
  diselaraskan dengan posisi source terbaru.


---

## 2026-04-26 — Phase 4.3-A Reminder Preview PASS

- Phase 4.3 dibuka secara bertahap dengan pendekatan **preview-first**.
- Backend menambahkan endpoint preview reminder untuk:
  - booking hampir kadaluarsa,
  - invoice jatuh tempo,
  - invoice terlambat,
  - checkout mendekat,
  - agregasi semua preview.
- Endpoint preview dijaga oleh JWT dan role OWNER/ADMIN.
- Frontend menambahkan halaman `/reminders` dengan 4 kartu preview dan empty/loading/error state.
- Navigation menambahkan menu **Pengingat WhatsApp** untuk OWNER/ADMIN.
- Manual retest PASS:
  - ADMIN melihat menu dan halaman `/reminders`,
  - 4 kartu tampil,
  - kandidat checkout muncul,
  - TENANT tidak melihat menu,
  - tidak ada tombol Kirim/Send.
- Batch ini sengaja tidak membuka:
  - WhatsApp send asli,
  - `NotificationLog` write,
  - scheduler/cron,
  - provider credential.
- Commit referensi: `4025a54 add reminder preview phase 4.3a`.

**Next:** Phase 4.3-B — Reminder Queue / Mock Send.


---

## 2026-04-27 — Phase 4.3-C Notification Center MVP Complete + Working Tree Clean

- Phase 4.3-C dibagi menjadi dua slice:
  - **4.3-C1a Backend AppNotification Foundation**
  - **4.3-C1b Frontend Notification Center**
- Backend C1a UAT PASS:
  - `GET /api/me/notifications`
  - `PATCH /api/me/notifications/:id/read`
  - `PATCH /api/me/notifications/read-all`
  - role isolation PASS
  - tenant isolation PASS
  - mock send berhasil membuat AppNotification untuk tenant target
- Frontend C1b build PASS dan visual smoke PASS:
  - bell notification di header
  - unread badge
  - dropdown latest notifications
  - route `/notifications`
  - page full notification list
  - tenant sidebar menu **Notifikasi**
  - breadcrumb Bahasa Indonesia **Notifikasi**
- Keputusan product/UX dibekukan:
  - Announcement tetap berbeda dari AppNotification.
  - PWA Push adalah channel ke device/browser, bukan pengganti data Announcement/AppNotification.
  - Finance-related reminder perlu persistent urgency/countdown chip di sebelah bell agar tenant tidak menganggap kewajiban selesai hanya karena notification sudah read.
- Commit yang diterima:
  - `cf51077 add app notification backend foundation phase 4.3-c1a`
  - `a8ac7a5 add frontend notification center phase 4.3-c1b`
- Branch `checkpoint/uat-4-2-before-cancelstay-fix` sudah sinkron dengan remote sampai C1b.
- Sisa dirty/untracked lama diamankan dalam `stash@{0}` dengan label `wip leftover files after phase 4.3-c notification center`.
- Working tree bersih setelah stash.
