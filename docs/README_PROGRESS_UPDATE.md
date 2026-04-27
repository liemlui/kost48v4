# KOST48 Docs Package — Progress Update 2026-04-26

Paket ini memperbarui dokumen proyek ke kondisi terbaru:

- Gate 1 / UAT 4.0: PASS
- Gate 2 / UAT 4.1: PASS
- P0 tenant portal cache isolation: CLOSED / PASS
- UAT 4.2 core: PASS
  - happy path
  - reject path
  - wrong amount path
  - double approve prevention
  - expiry core
- Next: P1 cleanup sebelum Phase 4.3

P1 cleanup:
1. expiry invoice cleanup,
2. label room RESERVED,
3. pricing term honesty,
4. production-safe error response,
5. Phase 3A meter verification.

Jangan ulang UAT yang sudah PASS kecuali patch baru menyentuh flow terkait secara langsung.

---

# Update Tambahan — 2026-04-27 Lifecycle Integrity

## Status tambahan

Setelah Phase 4.3-F1 business event AppNotifications, ditemukan gap lifecycle yang harus diprioritaskan sebelum fitur baru:

- Announcement operational masih bisa terlihat oleh tenant non-occupied.
- Meter baseline tenant booking dibuat terlalu dini dan dapat bentrok saat booking ulang.

## Keputusan baru

1. Meter tenant booking final dibuat saat activation/payment approved, bukan saat approve booking.
2. Approve booking menyimpan pending meter snapshot di `Stay`.
3. Cancel/expired sebelum occupied membersihkan pending snapshot.
4. Checkout occupied stay mempertahankan meter/deposit/payment/invoice history.
5. Announcement `TENANT` jangka pendek hanya untuk occupied tenants.
6. Tenant non-occupied diarahkan dari `/portal/announcements` ke `/portal/bookings`.

## Next ACT resmi

**Phase 4.3-G1 — Announcement Access Guard** lalu **Phase 4.3-G2 — Pending Meter Snapshot**.
