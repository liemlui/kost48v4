# KOST48 V3 — Current Status Snapshot
**Tanggal:** 26 April 2026  
**Tujuan:** Membekukan kondisi terbaru agar UAT yang sudah PASS tidak perlu diulang dan Phase 4.3-A tercatat resmi.

## Status Resmi Saat Ini

| Area | Status |
|---|---|
| Gate 1 / UAT 4.0 | ✅ PASS |
| Gate 2 / UAT 4.1 | ✅ PASS |
| P0 Tenant Portal Cache Isolation | ✅ CLOSED / PASS |
| UAT 4.2 Happy Path | ✅ PASS |
| UAT 4.2 Reject Path | ✅ PASS |
| UAT 4.2 Wrong Amount Path | ✅ PASS |
| UAT 4.2 Double Approve Prevention | ✅ PASS |
| UAT 4.2 Expiry Core | ✅ PASS |
| UAT 4.2 Overall | ✅ CORE PASS / operationally accepted |
| Pricing Policy V1 | ✅ PASS |
| Approve Booking Money Input | ✅ PASS |
| Phase 4.3-A Reminder Preview | ✅ PASS / committed |
| Phase 4.3-B | ⏭️ Next: Reminder Queue / Mock Send |
| Real WhatsApp Provider Send | ⬜ Belum dibuka |
| Scheduler / Cron Reminder | ⬜ Belum dibuka |

## Bukti UAT yang Diterima

### Gate 1 / UAT 4.0 PASS
- Public `/rooms` tampil untuk guest.
- Admin `/rooms` tetap masuk backoffice.
- Tenant booking berhasil.
- `/portal/bookings` menampilkan `checkInDate` dan `expiresAt` benar.
- Broken image sudah fallback ke placeholder.
- Booking Reserved tidak tercampur dengan Stay Aktif.
- CheckInWizard tidak diblok oleh RESERVED booking.

### Gate 2 / UAT 4.1 PASS
- Admin approve booking berhasil.
- Modal close setelah sukses.
- Invoice awal terbentuk.
- Meter awal tersimpan.
- Room tetap `RESERVED` sebelum pembayaran.
- Tenant melihat `Menunggu Pembayaran`.

### UAT 4.2 PASS — Core Flow
- Happy path: tenant upload bukti pembayaran awal, admin approve, `InvoicePayment` terbentuk, invoice `PAID`, room `RESERVED -> OCCUPIED`, tenant melihat hunian aktif.
- Reject path: admin reject dengan alasan, tenant melihat alasan, tenant bisa upload ulang, invoice tidak menjadi `PAID`, room tetap `RESERVED`.
- Wrong amount path: backend menolak nominal tidak tepat; tidak ada partial payment.
- Double approve prevention: approval kedua ditolak; tidak ada `InvoicePayment` ganda.
- Expiry core: booking expired menjadi `CANCELLED`, room kembali `AVAILABLE`, pending submission menjadi `EXPIRED` bila ada, dan invoice tidak mengaktifkan room.

### Pricing Policy V1 PASS
- Harga dasar = `monthlyRateRupiah`.
- Harian = 13% × bulanan, Mingguan = 45%, Dua Mingguan = 75%.
- Bulanan = 100%, Semester = 5,5×, Tahunan = 10×.
- Short-term (`DAILY`, `WEEKLY`, `BIWEEKLY`) = flat, listrik dan air termasuk.
- Long-term (`MONTHLY`, `SMESTERLY`, `YEARLY`) = meteran terpisah.
- Semua harga dibulatkan naik ke Rp5.000 terdekat.
- Admin tetap bisa override harga saat approval booking.

### Phase 4.3-A Reminder Preview PASS
- Backend preview endpoint tersedia:
  - `GET /api/admin/reminders/preview/booking-expiry`
  - `GET /api/admin/reminders/preview/invoice-due`
  - `GET /api/admin/reminders/preview/invoice-overdue`
  - `GET /api/admin/reminders/preview/checkout`
  - `GET /api/admin/reminders/preview/all`
- Endpoint dijaga JWT + role OWNER/ADMIN.
- Frontend `/reminders` tersedia untuk OWNER/ADMIN.
- Menu **Pengingat WhatsApp** muncul untuk OWNER/ADMIN dan tidak muncul untuk TENANT.
- Halaman menampilkan 4 kartu: booking hampir kadaluarsa, invoice jatuh tempo, invoice terlambat, checkout mendekat.
- Preview bersifat read-only.
- Tidak ada tombol kirim.
- Tidak ada WhatsApp send.
- Tidak ada `NotificationLog` write.
- Tidak ada cron/scheduler.

## P0 yang Sudah Ditutup

**Tenant portal cache isolation** sudah PASS. Retest membuktikan tenant baru tanpa stay aktif tidak lagi melihat stay tenant sebelumnya; `/stays/me/current` 404 dirender sebagai empty state; tidak ada request flood; `/portal/bookings` dan `/portal/invoices` tidak bocor data tenant lama.

## P1 Cleanup Sebelum / Saat 4.3

Item P1 yang sudah tertutup melalui patch dan retest:
1. Expiry invoice cleanup pada booking expired.
2. Label room `RESERVED` menggunakan `Pemesan` / `Booking oleh`, bukan `Penghuni`.
3. Pricing Policy V1 menggantikan pricing honesty lama: semua term dihitung jujur dari harga bulanan, tidak fallback diam-diam.
4. Production-safe error response: stack trace hanya development.
5. Phase 3A meter awal tetap wajib dan telah diverifikasi dalam flow approval/check-in yang relevan.

## ACT Berikutnya

**Phase 4.3-B — Reminder Queue / Mock Send**

Scope yang disarankan:
- Admin bisa memilih kandidat dari preview.
- Admin klik aksi simulasi / mock send.
- Sistem mencatat hasil mock/internal log jika schema mendukung, atau mengembalikan result tanpa side effect permanen jika belum ada schema final.
- Belum real WhatsApp provider.
- Belum scheduler.
- Belum external credential.

## Instruksi UAT Berikutnya

Tidak perlu ulang Gate 1, Gate 2, atau UAT 4.2 core dari awal. Setelah Phase 4.3-B, lakukan targeted retest saja:

- `/reminders` tetap menampilkan 4 kategori preview.
- OWNER/ADMIN dapat melihat preview.
- TENANT tidak melihat menu preview.
- Mock send tidak mengirim WhatsApp sungguhan.
- Jika ada log, log tidak duplikat untuk event yang sama.
- Build backend dan frontend PASS.


---

## Update 2026-04-27 — Phase 4.3-C Notification Center COMPLETE

| Area | Status |
|---|---|
| Phase 4.3-B Reminder Mock Send | ✅ PASS / committed |
| Phase 4.3-C1a AppNotification Backend Foundation | ✅ UAT PASS / committed (`cf51077`) |
| Phase 4.3-C1b Frontend Notification Center | ✅ Build + visual PASS / committed (`a8ac7a5`) |
| Phase 4.3-C Overall | ✅ COMPLETE — In-app Notification Center MVP |
| Working Tree | ✅ Clean setelah leftover files diamankan di `stash@{0}` |
| Next ACT | 🟡 Phase 4.3-D — Tenant Payment Urgency Header Chip |

### Keputusan yang dibekukan

1. `Announcement` tetap konten broadcast/pengumuman.
2. `AppNotification` menjadi inbox personal/read-unread per user.
3. PWA Push adalah channel nanti, bukan pengganti Announcement/AppNotification.
4. Tenant punya menu **Notifikasi**; admin/owner/staff cukup lewat bell/header.
5. Reminder keuangan perlu **persistent urgency/countdown chip** agar kewajiban bayar tetap terlihat sampai kondisi bisnis selesai.

### Targeted retest berikutnya

Untuk 4.3-D, tidak perlu mengulang Gate 1/2/4.2 core. Cukup uji:
- tenant dengan invoice overdue melihat chip `Terlambat X hari`,
- tenant dengan invoice due soon melihat chip `Tagihan H-X`,
- chip tetap muncul walau notification sudah read,
- chip hilang setelah invoice paid / booking resolved / stay resolved.
