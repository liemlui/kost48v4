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
| U10 | UAT flow booking mandiri: `/rooms` → `/booking/:roomId` → `/portal/bookings` | ✅ PASS — Gate 1 diterima; tidak perlu ulang |
| U11 | UAT backoffice read-only booking reserved di halaman Stays | ✅ PASS — klasifikasi RESERVED vs OCCUPIED sudah dipatch dan diverifikasi |
| U12 | UAT approval booking: queue backoffice → approve booking → tenant melihat status `Menunggu Pembayaran` | ✅ PASS — Gate 2 diterima; modal close, invoice DRAFT, meter awal, room RESERVED sudah diverifikasi |
| U13 | Regression check setelah approval: booking reserved tidak lagi terasa “menunggu approval”, invoice awal `DRAFT` terbentuk, room tetap `RESERVED` | ✅ PASS — tenant melihat Menunggu Pembayaran, belum OCCUPIED sebelum pembayaran |

**Catatan status:**  
- Backend dan frontend booking mandiri V4 inti sudah dipatch pada level source/build.  
- Backend core approval booking 4.1A dan frontend approval surface 4.1B juga sudah dipatch pada level source/build.  
- UAT end-to-end Fase 4.0 dan 4.1 sudah dinyatakan PASS pada 2026-04-26; jangan ulang dari awal kecuali ada regresi baru.

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
- Fase 4.0 sudah PASS pada UAT Gate 1 setelah patch klasifikasi stay dan fallback image publik.

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
- UAT approval booking end-to-end sudah PASS pada Gate 2.  
- Payment submission dan aktivasi `RESERVED → OCCUPIED` sudah lolos happy path, tetapi 4.2 belum full PASS karena reject/wrong amount/expiry/double approve belum selesai.

---

### Fase 4.2 — Pembayaran Mandiri & Aktivasi Otomatis (COMBINED BOOKING PAYMENT / TANPA PARSIAL)

| # | Tugas | Status |
|---|-------|--------|
| 4.2.1 | Schema/model `PaymentSubmission` + enum status + proof metadata + compatibility fields bila ada | ✅ Terpakai pada happy path UAT |
| 4.2.2 | Backend: `POST /payment-submissions` validasi nominal pas = sisa sewa + sisa deposit | ✅ Happy path PASS; wrong amount path belum dites |
| 4.2.3 | Backend: `GET /payment-submissions/my` | ✅ Riwayat submission tenant tampil |
| 4.2.4 | Backend: `GET /payment-submissions/review-queue` | ✅ Queue admin tampil dan proof bisa dibuka |
| 4.2.5 | Backend: `POST /payment-submissions/:id/approve` split otomatis rent portion + deposit portion | ✅ Happy path approve PASS |
| 4.2.6 | Backend: `POST /payment-submissions/:id/reject` | ⏳ Pending — lanjut setelah P0 cache isolation |
| 4.2.7 | Backend: sinkronisasi `InvoicePayment` final untuk sewa + tracking deposit awal pada `Stay` | ✅ InvoicePayment terbentuk dan invoice PAID pada happy path |
| 4.2.8 | Backend: aktivasi `RESERVED -> OCCUPIED` setelah combined payment valid disetujui | ✅ PASS pada happy path |
| 4.2.9 | Backend: expiry booking saat `expiresAt` terlewati | ⏳ Pending — belum UAT |
| 4.2.10 | Frontend tenant: section **Pembayaran Awal** + satu CTA **Bayar Sewa & Deposit** | ✅ PASS pada happy path |
| 4.2.11 | Frontend tenant: riwayat/status submission di booking detail | ✅ PASS pada happy path |
| 4.2.12 | Frontend admin: queue verifikasi pembayaran combined | ✅ PASS pada happy path |
| 4.2.13 | Frontend admin: modal approve/reject pembayaran | ⚠️ Approve PASS; reject pending |
| 4.2.14 | UAT happy path / reject / wrong amount / expiry / regression | ⚠️ Happy path PASS; reject/wrong amount/expiry/double approve pending; P0 tenant cache isolation blocks continuation |

### Fase 4.3### Fase 4.3 — Notifikasi & Reminder (WhatsApp)

| # | Tugas | Status |
|---|-------|--------|
| 4.3.1 | Adapter WhatsApp gateway + konfigurasi environment | ⬜ |
| 4.3.2 | Job reminder booking hampir kadaluarsa | ⬜ |
| 4.3.3 | Job reminder invoice H-3 / H-1 | ⬜ |
| 4.3.4 | Job reminder checkout H-10 / H-7 / H-3 | ⬜ |
| 4.3.5 | Idempotency guard reminder | ⬜ |
| 4.3.6 | Logging hasil kirim notifikasi | ⬜ |
| 4.3.7 | Badge reminder di portal tenant | ⬜ |
| 4.3.8 | UAT reminder sukses/gagal tanpa spam | ⬜ |

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
| Integrasi & UAT | ✅ Gate 1/2 PASS; 4.2 CORE PASS; P1 cleanup pending |
| 4.0 | ✅ Gate 1 PASS |
| 4.1 | ✅ Gate 2 PASS |
| 4.2 | ✅ CORE PASS; P1 cleanup pending sebelum 4.3 |
| 4.3 | ⬜ 0% |
| 4.4 | ⬜ 0% |
| 4.5 | ⬜ 0% |
| V4 total | ⏳ ±65–70% (4.0/4.1 PASS, 4.2 CORE PASS, P1 cleanup sebelum 4.3) |

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
- [x] `checkInDate` / `expiresAt` tampil jujur di semua surface admin/tenant
- [x] Approval booking tidak lagi gagal karena expiry terlalu agresif
- [x] Modal approval/review frontend menutup diri dengan benar setelah success
- [x] Regression invoice/status tetap sinkron setelah patch korektif terbaru

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
- [x] Build backend lokal sukses / aplikasi lokal berjalan untuk UAT
- [x] Build frontend lokal sukses / aplikasi lokal berjalan untuk UAT
- [x] UAT 4.2 happy path ditutup
- [x] UAT 4.2 reject / wrong amount / expiry core / double approve ditutup
- [ ] P1 cleanup pasca 4.2: invoice expiry cleanup, label RESERVED, pricing honesty, production error response, Phase 3A verification


---

## 2026-04-26 — Current UAT Snapshot / Tidak Perlu Ulang UAT

### Sudah diterima sebagai PASS
- [x] Gate 1 / UAT 4.0: katalog publik, booking tenant, `/portal/bookings`, backoffice Booking Reserved, image fallback, klasifikasi RESERVED vs OCCUPIED, dan CheckInWizard tidak terblokir booking reserved.
- [x] Gate 2 / UAT 4.1: admin approve booking, invoice awal terbentuk, meter awal tersimpan, tenant melihat `Menunggu Pembayaran`, dan room tetap `RESERVED`.
- [x] UAT 4.2 happy path: tenant upload bukti pembayaran awal, admin approve, `InvoicePayment` terbentuk, invoice `PAID`, room `OCCUPIED`, tenant masuk `Hunian Saya`.

### P0 aktif sebelum UAT 4.2 dilanjutkan
- [ ] **Tenant portal cache isolation:** setelah login tenant berbeda, UI tidak boleh menampilkan data tenant sebelumnya saat `/stays/me/current` menghasilkan 404.
- [ ] Clear query cache saat logout/login.
- [ ] Scope query key tenant portal berdasarkan user/tenant.
- [ ] Clear atau namespace `sessionStorage` success message agar tidak lintas tenant.
- [ ] `/portal/stay`, `/portal/bookings`, `/portal/invoices` tidak boleh menampilkan stale data lintas tenant.

### UAT yang masih tersisa setelah P0 fix
- [ ] 4.2 reject path.
- [ ] 4.2 wrong amount path.
- [ ] 4.2 expiry path.
- [ ] 4.2 double approve prevention.

**Instruksi:** Jangan ulang Gate 1, Gate 2, atau 4.2 happy path dari awal kecuali patch berikutnya menyentuh flow tersebut secara langsung.

---

## 2026-04-26 — Current UAT Snapshot Setelah 4.2 CORE PASS

### Sudah diterima sebagai PASS
- [x] Gate 1 / UAT 4.0.
- [x] Gate 2 / UAT 4.1.
- [x] P0 tenant portal cache isolation.
- [x] UAT 4.2 happy path.
- [x] UAT 4.2 reject path.
- [x] UAT 4.2 wrong amount path.
- [x] UAT 4.2 double approve prevention.
- [x] UAT 4.2 expiry core.

### P1 cleanup sebelum 4.3
- [ ] Expiry booking membatalkan invoice awal yang masih `DRAFT` / `ISSUED` dan belum `PAID`.
- [ ] Room `RESERVED` menampilkan `Pemesan` / `Booking oleh`, bukan `Penghuni`.
- [ ] Public rooms / booking form tidak menampilkan `Semester` / `Tahunan` tanpa rate nyata.
- [ ] Production error response tidak mengirim stack trace ke client.
- [ ] Phase 3A initial meter requirement diverifikasi code-level.

### Instruksi
Jangan ulang Gate 1, Gate 2, atau UAT 4.2 core dari awal. Setelah P1 cleanup, lakukan targeted retest item yang disentuh, lalu lanjut Phase 4.3.
