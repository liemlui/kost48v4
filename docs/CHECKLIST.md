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
| U10 | UAT flow booking mandiri: `/rooms` → `/booking/:roomId` → `/portal/bookings` | ⏳ |
| U11 | UAT backoffice read-only booking reserved di halaman Stays | ⏳ |
| U12 | UAT approval booking: queue backoffice → approve booking → tenant melihat status `Menunggu Pembayaran` | ⏳ |
| U13 | Regression check setelah approval: booking reserved tidak lagi terasa “menunggu approval”, invoice awal `DRAFT` terbentuk, room tetap `RESERVED` | ⏳ |

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
| 4.2.1 | Backend: `POST /payment-submissions` | ⬜ |
| 4.2.2 | Backend: `GET /payment-submissions/my` | ⬜ |
| 4.2.3 | Backend: review queue + approve/reject submission | ⬜ |
| 4.2.4 | Backend: sinkronisasi status `RESERVED` → `OCCUPIED` dan invoice `PAID` setelah approve | ⬜ |
| 4.2.5 | Backend: logika kadaluarsa booking bila `expiresAt` terlewati | ⬜ |
| 4.2.6 | Frontend tenant: upload bukti bayar pada booking detail | ⬜ |
| 4.2.7 | Frontend admin: queue verifikasi pembayaran | ⬜ |

### Fase 4.3 — Notifikasi & Reminder (WhatsApp)

| # | Tugas | Status |
|---|-------|--------|
| 4.3.1 | Integrasi WhatsApp gateway | ⬜ |
| 4.3.2 | Reminder booking hampir kadaluarsa | ⬜ |
| 4.3.3 | Reminder invoice H-3 / H-1 | ⬜ |
| 4.3.4 | Reminder checkout H-10 / H-7 / H-3 | ⬜ |
| 4.3.5 | Badge reminder di portal tenant | ⬜ |

### Fase 4.4 — Marketing Display & Registrasi Fleksibel

| # | Tugas | Status |
|---|-------|--------|
| 4.4.1 | Schema/API room gallery (`images`) | ⬜ |
| 4.4.2 | Endpoint publik `GET /public/rooms/:id` | ⬜ |
| 4.4.3 | Registrasi fleksibel via email atau nomor HP | ⬜ |
| 4.4.4 | Soft delete akun tenant (`isActive = false`) | ⬜ |
| 4.4.5 | Frontend: halaman detail kamar dengan galeri | ⬜ |
| 4.4.6 | Frontend: form registrasi fleksibel | ⬜ |
| 4.4.7 | Frontend: opsi “Hapus Akun Saya” | ⬜ |

### Fase 4.5 — Tenant Self-Service Lanjutan

| # | Tugas | Status |
|---|-------|--------|
| 4.5.1 | Backend: `POST /tenant/stays/renew` (tenant request renew) | ⬜ |
| 4.5.2 | Frontend: tombol/flow **Perpanjang Stay** di portal tenant | ⬜ |
| 4.5.3 | Backend: `POST /auth/forgot-password` | ⬜ |
| 4.5.4 | Backend: `POST /auth/reset-password` | ⬜ |
| 4.5.5 | Frontend: flow **Lupa Password** | ⬜ |

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
| 4.2 | ⬜ 0% |
| 4.3 | ⬜ 0% |
| 4.4 | ⬜ 0% |
| 4.5 | ⬜ 0% |
| V4 total | ⏳ ±40% |

---

## Urutan ACT yang Belum (Disarankan)

1. Lakukan **U1–U11** untuk existing flow + booking mandiri.
2. Lanjut **U12–U13** untuk approval booking end-to-end.
3. Setelah UAT 4.0 + 4.1 cukup aman, baru buka **4.2** dan seterusnya.