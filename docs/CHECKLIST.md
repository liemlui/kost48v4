

---

## 2026-04-27 — Checklist Update: Phase 4.3-C Complete + 4.3-D Next

### Phase 4.3-C — In-app Notification Center MVP

| # | Tugas | Status |
|---|-------|--------|
| 4.3-C1a.1 | Schema/model `AppNotification` | ✅ PASS / committed |
| 4.3-C1a.2 | Endpoint `GET /me/notifications` | ✅ PASS / committed |
| 4.3-C1a.3 | Endpoint `PATCH /me/notifications/:id/read` | ✅ PASS / committed |
| 4.3-C1a.4 | Endpoint `PATCH /me/notifications/read-all` | ✅ PASS / committed |
| 4.3-C1a.5 | Mock send membuat AppNotification untuk tenant target | ✅ PASS / committed |
| 4.3-C1a.6 | Tenant/user isolation test | ✅ PASS |
| 4.3-C1b.1 | Frontend API client notifications | ✅ Build PASS / committed |
| 4.3-C1b.2 | Hook TanStack Query + optimistic mark read | ✅ Build PASS / committed |
| 4.3-C1b.3 | Notification bell + unread badge + dropdown | ✅ Visual PASS / committed |
| 4.3-C1b.4 | `/notifications` page | ✅ Visual PASS / committed |
| 4.3-C1b.5 | Tenant sidebar menu **Notifikasi** | ✅ Visual PASS / committed |
| 4.3-C1b.6 | Admin/Owner/Staff access via bell/header only | ✅ Decision frozen |

### Phase 4.3-D — Tenant Payment Urgency Header Chip

| # | Tugas | Status |
|---|-------|--------|
| 4.3-D.1 | PLAN: audit existing tenant invoice/booking/stay data for urgency chip | ⬜ NEXT |
| 4.3-D.2 | ACT: frontend urgency chip beside bell | ⬜ |
| 4.3-D.3 | ACT: priority calculation overdue/booking due/invoice due/contract ending | ⬜ |
| 4.3-D.4 | UAT: chip stays visible until business condition resolved | ⬜ |

### Deferred tetap belum dibuka
- [ ] Real WhatsApp provider
- [ ] Scheduler/cron reminder otomatis
- [ ] Browser push/service worker/PWA push
- [ ] SSE/websocket notification stream
- [ ] Announcement → AppNotification integration

## Integrasi & UAT Aktif (Fokus Saat Ini)

| # | Tugas | Status |
|---|-------|--------|
| U1 | Jalankan backend dan frontend lokal dengan environment yang benar | ⏳ |
| U2 | Verifikasi `bootstrap.sql` sudah dijalankan ulang pasca reset DB dev | ⏳ |
| U3 | UAT tenant: login → buat tiket portal → tiket muncul di backoffice admin | ⏳ |
| U4 | UAT profil: lihat profil + ganti password | ⏳ |
| U5 | UAT Room Detail Page: tab Inventaris tampil dan stabil | ⏳ |
| U6 | UAT Global Search di header | ⏳ |
| U7 | UAT Quick Actions di tabel Tenant & Room | ⏳ |
| U8 | UAT keamanan: Admin tidak bisa edit/hapus Owner | ⏳ |
| U9 | UAT keamanan: login salah memberi pesan generik | ⏳ |
| U10 | UAT flow booking mandiri: `/rooms` → `/booking/:roomId` → `/portal/bookings` | ⚠️ Parsial: create booking sukses; gate belum lulus penuh |
| U11 | UAT backoffice read-only booking reserved di halaman Stays | ⚠️ Parsial: surface muncul, tetapi sempat ada gap tanggal/expiry |
| U12 | UAT approval booking: queue backoffice → approve booking → tenant melihat status `Menunggu Pembayaran` | ⚠️ Parsial: approval pernah sukses, tetapi masih ada bug integrasi/modals |
| U13 | Regression check setelah approval: booking reserved tidak lagi terasa “menunggu approval”, invoice awal `DRAFT` terbentuk, room tetap `RESERVED` | ⚠️ Belum ditutup penuh |

**Catatan status:**  
- Backend dan frontend booking mandiri V4 inti sudah dipatch pada level source/build.  
- Backend core approval booking 4.1A dan frontend approval surface 4.1B juga sudah dipatch pada level source/build.  
- UAT end-to-end Fase 4.0 dan UAT approval booking Fase 4.1 belum dinyatakan lolos penuh.

---

## V4 Roadmap — Tenant-First Platform

### Fase 4.0 — Booking Mandiri & Status RESERVED

| # | Tugas | Status |
|---|-------|--------|
| 4.0.1 | Schema Prisma: tambah `RoomStatus.RESERVED` + `Stay.expiresAt` + migration dev DB | ✅ |
| 4.0.2 | Backend: endpoint publik `GET /public/rooms` | ✅ |
| 4.0.3 | Backend: `POST /tenant/bookings` — DTO + validasi awal | ✅ |
| 4.0.4 | Backend: `POST /tenant/bookings` — transaksi atomik create booking + set room `RESERVED` | ✅ |
| 4.0.5 | Backend: `GET /tenant/bookings/my` | ✅ |
| 4.0.6 | Frontend: halaman publik `/rooms` | ✅ |
| 4.0.7 | Frontend: form booking `/booking/:roomId` | ✅ |
| 4.0.8 | Frontend: menu + halaman tenant **Pemesanan Saya** | ✅ |
| 4.0.9 | Backoffice: daftar booking read-only (`roomStatus=RESERVED`) | ✅ |

**Catatan status Fase 4.0:**  
- Backend inti 4.0.1–4.0.5 sudah dipatch.  
- Frontend 4.0.6–4.0.9 sudah dipatch.  
- Fase 4.0 pada level kode sudah tertutup, tetapi verifikasi runtime/UAT penuh belum dinyatakan lolos.

---

### Fase 4.1 — Admin Approval & Pelengkapan Data

| # | Tugas | Status |
|---|-------|--------|
| 4.1.1 | Backend: `PATCH /admin/bookings/:stayId/approve` | ✅ |
| 4.1.2 | Backend: isi `agreedRentAmountRupiah`, `depositAmountRupiah`, meter awal, dan buat invoice `DRAFT` pertama | ✅ |
| 4.1.3 | Frontend backoffice: halaman/queue **Approval Booking** | ✅ |
| 4.1.4 | Frontend backoffice: form approval booking | ✅ |
| 4.1.5 | Tenant portal: tampilkan status “Menunggu Pembayaran” setelah approval | ✅ |

**Catatan status Fase 4.1:**  
- Backend 4.1A core sudah dipatch pada level source/build.  
- Frontend 4.1B approval surface juga sudah dipatch pada level source/build.  
- UAT approval booking end-to-end masih belum dinyatakan lolos penuh.  
- Payment submission dan aktivasi penuh `RESERVED → OCCUPIED` tetap belum dibuka.

---

### Fase 4.2 — Pembayaran Mandiri & Aktivasi Otomatis

| # | Tugas | Status |
|---|-------|--------|
| 4.2.1 | Schema/model `PaymentSubmission` + enum status + proof metadata | ⚠️ Source patch/artifact sudah ada; sinkronisasi schema lokal masih pending |
| 4.2.2 | Backend: `POST /payment-submissions` | ⚠️ Source patch ada; local verify pending |
| 4.2.3 | Backend: `GET /payment-submissions/my` | ⚠️ Source patch ada; local verify pending |
| 4.2.4 | Backend: `GET /payment-submissions/review-queue` | ⚠️ Source patch ada; local verify pending |
| 4.2.5 | Backend: `POST /payment-submissions/:id/approve` | ⚠️ Source patch ada; local verify pending |
| 4.2.6 | Backend: `POST /payment-submissions/:id/reject` | ⚠️ Source patch ada; local verify pending |
| 4.2.7 | Backend: sinkronisasi invoice payment final + invoice status | ⚠️ Source patch ada; local verify pending |
| 4.2.8 | Backend: aktivasi `RESERVED -> OCCUPIED` setelah invoice booking awal lunas | ⚠️ Source patch ada; local verify pending |
| 4.2.9 | Backend: expiry booking saat `expiresAt` terlewati | ⚠️ Source patch ada; local verify pending |
| 4.2.10 | Frontend tenant: form upload bukti bayar | ⚠️ Source patch ada; local verify pending |
| 4.2.11 | Frontend tenant: riwayat/status submission di booking detail | ⚠️ Source patch ada; local verify pending |
| 4.2.12 | Frontend admin: queue verifikasi pembayaran | ⚠️ Source patch ada; local verify pending |
| 4.2.13 | Frontend admin: modal approve/reject pembayaran | ⚠️ Source patch ada; local verify pending |
| 4.2.14 | UAT happy path / reject / partial / expiry / regression | ⏳ |

### Fase 4.3 — Notifikasi & Reminder (WhatsApp)

| # | Tugas | Status |
|---|-------|--------|
| 4.3.A1 | Backend reminder preview endpoint `/api/admin/reminders/preview/*` | ✅ PASS |
| 4.3.A2 | Frontend page `/reminders` dengan 4 kartu preview | ✅ PASS |
| 4.3.A3 | Navigation entry **Pengingat WhatsApp** OWNER/ADMIN only | ✅ PASS |
| 4.3.A4 | Manual retest preview: ADMIN bisa akses, TENANT tidak melihat menu, no send button | ✅ PASS |
| 4.3.B1 | Reminder Queue / Mock Send | ⏭️ Next |
| 4.3.C1 | Adapter WhatsApp gateway + konfigurasi environment untuk real send | ⬜ |
| 4.3.C2 | Job reminder booking hampir kadaluarsa real/send path | ⬜ |
| 4.3.C3 | Job reminder invoice H-3 / H-1 real/send path | ⬜ |
| 4.3.C4 | Job reminder checkout H-10 / H-7 / H-3 real/send path | ⬜ |
| 4.3.C5 | Idempotency guard reminder | ⬜ |
| 4.3.C6 | Logging hasil kirim notifikasi | ⬜ |
| 4.3.D1 | Badge reminder di portal tenant | ⬜ |
| 4.3.UAT | UAT reminder sukses/gagal tanpa spam | ⬜ |

### Fase 4.4 — Marketing Display & Registrasi Fleksibel

| # | Tugas | Status |
|---|-------|--------|
| 4.4.1 | Schema/API room gallery (`images`) | ⬜ |
| 4.4.2 | Endpoint publik `GET /public/rooms/:id` | ⬜ |
| 4.4.3 | Thumbnail / first image di `GET /public/rooms` | ⬜ |
| 4.4.4 | Registrasi fleksibel via email atau nomor HP | ⬜ |
| 4.4.5 | Normalisasi + uniqueness nomor HP | ⬜ |
| 4.4.6 | Soft delete akun tenant (`isActive = false`) | ⬜ |
| 4.4.7 | Frontend: halaman detail kamar dengan galeri | ⬜ |
| 4.4.8 | Frontend: form registrasi fleksibel | ⬜ |
| 4.4.9 | Frontend: opsi “Hapus Akun Saya” | ⬜ |
| 4.4.10 | UAT public detail / register / deactivate account | ⬜ |

### Fase 4.5 — Tenant Self-Service Lanjutan

| # | Tugas | Status |
|---|-------|--------|
| 4.5.1 | Backend: `POST /tenant/stays/renew` (tenant request renew) | ⬜ |
| 4.5.2 | Backend: list request renew tenant sendiri | ⬜ |
| 4.5.3 | Backend: approve/reject renew request oleh admin | ⬜ |
| 4.5.4 | Frontend: tombol/flow **Perpanjang Stay** di portal tenant | ⬜ |
| 4.5.5 | Frontend: riwayat status renew request | ⬜ |
| 4.5.6 | Backend: `POST /auth/forgot-password` | ⬜ |
| 4.5.7 | Backend: `POST /auth/reset-password` | ⬜ |
| 4.5.8 | Frontend: flow **Lupa Password** | ⬜ |
| 4.5.9 | Frontend: flow **Reset Password** | ⬜ |
| 4.5.10 | UAT renew request + forgot/reset password | ⬜ |

---

## Ringkasan Progress

| Fase | Status |
|------|--------|
| 0 | ✅ 100% |
| 1 | ✅ 100% |
| 2 | ✅ 100% |
| 3 | ✅ 100% |
| 3.5 | ✅ 100% |
| Integrasi & UAT | ⏳ Belum lolos penuh |
| 4.0 | ⏳ 100% di level patch kode, UAT belum penuh |
| 4.1 | ⏳ Backend 4.1A + frontend 4.1B dipatch; UAT approval belum penuh |
| 4.2 | ⚠️ Source patch lanjutan/deep patch sudah ada; baseline resmi masih pending verifikasi lokal/UAT |
| 4.3 | ⬜ 0% |
| 4.4 | ⬜ 0% |
| 4.5 | ⬜ 0% |
| V4 total | ⏳ ±50% (4.2 sudah punya source patch lanjutan; status resmi tetap menunggu verifikasi lokal/UAT) |

---

## Urutan ACT yang Belum (Disarankan)

1. Lakukan **U1–U11** untuk existing flow + booking mandiri.
2. Lanjut **U12–U13** untuk approval booking end-to-end.
3. Setelah UAT 4.0 + 4.1 cukup aman, buka **4.2.1–4.2.14**.
4. Jika 4.2 inti stabil, lanjut **4.3.1–4.3.8**.
5. Setelah public/auth contract siap, lanjut **4.4.1–4.4.10**.
6. Terakhir, buka **4.5.1–4.5.10**.


---

## 2026-04-23 — Tambahan Checklist Sinkronisasi Terbaru

### Temuan UAT parsial yang sudah terbukti
- [x] Katalog publik `/rooms` aman untuk guest
- [x] `/rooms` untuk ADMIN tetap masuk ke workspace backoffice
- [x] Tenant dapat membuat booking baru

### Temuan bug yang masih perlu dipastikan tertutup
- [ ] `checkInDate` / `expiresAt` tampil jujur di semua surface admin/tenant
- [ ] Approval booking tidak lagi gagal karena expiry terlalu agresif
- [ ] Modal approval/review frontend menutup diri dengan benar setelah success
- [ ] Regression invoice/status tetap sinkron setelah patch korektif terbaru

### Refactor hygiene
- [x] Backend source utama yang terlalu besar mulai dipecah
- [x] Frontend source utama yang terlalu besar mulai dipecah
- [ ] Lanjutkan pass kedua refactor hanya setelah stabilitas UAT tidak terganggu

---

## 2026-04-24 — Checklist Sinkronisasi Dokumen

### Status source vs status resmi
- [x] Dokumen inti diselaraskan dengan fakta bahwa 4.2 sudah punya source patch lanjutan
- [x] Dokumen tetap jujur bahwa 4.2 belum resmi/live penuh
- [ ] Sinkronisasi schema Prisma dijalankan di environment lokal
- [ ] `npx prisma generate` lokal sukses
- [ ] Build backend lokal sukses
- [ ] Build frontend lokal sukses
- [ ] UAT 4.2 happy path ditutup
- [ ] UAT 4.2 reject / partial / expiry ditutup


---

## 2026-04-26 — Checklist Tambahan Phase 4.3-A PASS

- [x] Backend preview endpoint `/api/admin/reminders/preview/all` mengembalikan 4 section: `bookingExpiry`, `invoiceDue`, `invoiceOverdue`, `checkout`.
- [x] Halaman `/reminders` menampilkan 4 card preview.
- [x] Empty state tampil untuk kategori kosong.
- [x] Candidate checkout dapat muncul.
- [x] Menu **Pengingat WhatsApp** muncul untuk ADMIN/OWNER.
- [x] Menu **Pengingat WhatsApp** tidak muncul untuk TENANT.
- [x] Tidak ada tombol Kirim/Send.
- [x] Tidak ada WhatsApp send.
- [x] Tidak ada scheduler.

Next:
- [ ] 4.3-B Reminder Queue / Mock Send.
