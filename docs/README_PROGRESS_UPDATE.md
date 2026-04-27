# KOST48 Docs Package — Progress Update 2026-04-26

Paket ini memperbarui dokumen proyek ke kondisi terbaru setelah **Phase 4.3-A Reminder Preview** selesai.

## Status Terbaru

- Gate 1 / UAT 4.0: ✅ PASS
- Gate 2 / UAT 4.1: ✅ PASS
- P0 tenant portal cache isolation: ✅ CLOSED / PASS
- UAT 4.2 core: ✅ PASS
  - happy path
  - reject path
  - wrong amount path
  - double approve prevention
  - expiry core
- Pricing Policy V1: ✅ PASS
- Approve Booking money input: ✅ PASS
- Phase 4.3-A Reminder Preview: ✅ PASS / committed

## Reminder Preview 4.3-A yang sudah masuk

- Backend endpoint preview `/api/admin/reminders/preview/*`.
- Frontend halaman `/reminders`.
- Menu **Pengingat WhatsApp** untuk OWNER/ADMIN.
- Preview 4 kategori: booking expiry, invoice due, invoice overdue, checkout approaching.
- Read-only: tidak kirim WhatsApp, tidak tulis `NotificationLog`, tidak menjalankan scheduler.

## Next

**Phase 4.3-B — Reminder Queue / Mock Send**

Tujuan berikutnya adalah menyiapkan jalur simulasi/mock-send yang aman sebelum integrasi provider WhatsApp asli.

## Catatan UAT

Jangan ulang UAT yang sudah PASS kecuali patch baru menyentuh flow terkait secara langsung.


---

# Update Tambahan — 2026-04-27

Paket ini juga memperbarui dokumen proyek setelah **Phase 4.3-C — In-app Notification Center MVP** selesai.

## Status tambahan

- Phase 4.3-B Reminder Mock Send: ✅ PASS / committed
- Phase 4.3-C1a Backend AppNotification Foundation: ✅ UAT PASS / committed
- Phase 4.3-C1b Frontend Notification Center: ✅ build + visual smoke PASS / committed
- Phase 4.3-C Overall: ✅ COMPLETE
- Working tree project: ✅ clean setelah leftover files distash

## Keputusan baru yang ditulis ke dokumen

1. Announcement berbeda dari AppNotification.
2. PWA Push adalah channel, bukan source of truth data.
3. Tenant mendapat menu **Notifikasi**; admin/owner/staff cukup dari bell/header.
4. Finance-related reminder perlu **Payment Urgency Header Chip** yang tetap muncul sampai kewajiban selesai.
5. Real WhatsApp, scheduler, push/service worker, SSE/websocket tetap deferred.

## Next ACT resmi

**Phase 4.3-D — Tenant Payment Urgency Header Chip**

Tujuannya membuat reminder pembayaran lebih berdampak secara bisnis daripada sekadar notifikasi read/unread.
