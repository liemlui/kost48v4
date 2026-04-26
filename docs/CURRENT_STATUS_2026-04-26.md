# KOST48 V3 — Current Status Snapshot
**Tanggal:** 26 April 2026  
**Tujuan:** Membekukan kondisi terbaru agar UAT yang sudah PASS tidak perlu diulang.

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
| UAT 4.2 Overall | ✅ CORE PASS / accepted with P1 cleanup notes |
| Next ACT | P1 cleanup kecil sebelum Phase 4.3 |
| Phase 4.3 | ⬜ Belum dibuka |

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

## P0 yang Sudah Ditutup

**Tenant portal cache isolation** sudah PASS. Retest membuktikan tenant baru tanpa stay aktif tidak lagi melihat stay tenant sebelumnya; `/stays/me/current` 404 dirender sebagai empty state; tidak ada request flood; `/portal/bookings` dan `/portal/invoices` tidak bocor data tenant lama.

## P1 Cleanup Sebelum Phase 4.3

1. **Expiry invoice cleanup** — saat booking expired, invoice awal yang masih `DRAFT` / `ISSUED` dan belum `PAID` sebaiknya ikut `CANCELLED` agar tidak orphan.
2. **Rooms label polish** — untuk room `RESERVED`, tampilkan `Pemesan` / `Booking oleh`, bukan `Penghuni`.
3. **Pricing term honesty** — sembunyikan `Semester` / `Tahunan` jika tidak ada rate nyata; jangan fallback ke monthly.
4. **Production-safe error response** — jangan kirim stack trace ke client di production.
5. **Phase 3A verification** — verifikasi create stay backoffice tetap mewajibkan meter awal listrik/air dan membuat 2 `MeterReading` atomik.

## ACT Berikutnya

**ACT P1 — Post-UAT 4.2 Cleanup Before 4.3**

Scope:
- Backend expiry cleanup invoice.
- Frontend room label RESERVED vs OCCUPIED.
- Frontend pricing term honesty.
- Error response hardening.
- Phase 3A initial meter verification.

## Instruksi UAT Berikutnya

Tidak perlu ulang Gate 1, Gate 2, atau UAT 4.2 core dari awal. Setelah P1 cleanup, lakukan targeted retest saja:

- Expire booking baru → stay `CANCELLED`, room `AVAILABLE`, invoice ikut `CANCELLED` jika belum final.
- Room `RESERVED` menampilkan label `Pemesan` / `Booking oleh`.
- `Semester` / `Tahunan` tidak muncul kalau tidak ada rate nyata.
- Production error response tidak expose stack.
- Build backend dan frontend PASS.

Jika targeted retest PASS, lanjut **Phase 4.3 — WhatsApp Reminder**.
