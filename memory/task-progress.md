# Progress Eksekusi Fase V

## Task Checklist
- [x] V-00 Langkah 1: Analisis pemakaian RoomStatus.BOOKING di semua file
- [x] V-00 Langkah 2: `booking-schema.helper.ts` — hasBookingRoomStatus tidak lagi syarat readiness ✅
- [x] V-00 Langkah 3: `payment-submissions.service.ts` — hapus penulisan `RoomStatus.BOOKING`, ganti ke `RoomStatus.RESERVED` ✅
- [ ] V-00 Langkah 4: Cek data room status BOOKING di DB (butuh password)
- [ ] V-00 Langkah 5: Update `app.enums.ts` (opsional — hapus BOOKING jika legacy-only)
- [ ] V-00 Langkah 6: Update `schema.prisma` (opsional — hapus BOOKING jika legacy-only)
- [ ] V-01: Booking create tidak mengunci room (public-bookings.service.ts, tenant-bookings.service.ts)
- [ ] V-02: Payment approved → RESERVED (sudah selesai sebagian)
- [ ] V-03: Check-in wajib lunas (stays.service.ts)
- [ ] V-04: AutoOps ikut flow baru
- [ ] V-05: Fix booking publik phone/email
- [ ] V-06: Payment proof ownership + batch
- [ ] V-07: Hardening upload, cron, meter, ticket
- [ ] V-08: Verifikasi final (build, test, search)

## Catatan
- Strategy: legacy-only untuk `BOOKING` enum — tidak hapus dari schema/enum, tapi runtime tidak boleh menulisnya
- tsc --noEmit ✅ untuk 2 file yang sudah diubah