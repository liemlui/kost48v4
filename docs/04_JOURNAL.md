# KOST48 V3/V4 — Project Journal
**Versi:** 2026-04-28 clean consolidation  
**Fungsi:** Arsip kronologis milestone dan hasil UAT. Tidak menggantikan `00_GROUND_STATE.md`.

---

## Ringkasan Kronologi Utama

### 2026-04-13 sampai 2026-04-18 — Fondasi dan Stabilization
- Core commercial flow diverifikasi sampai checkout dan process deposit.
- Backend/frontend cleanup batch awal dilakukan.
- Direct check-in dibuat atomik dengan meter awal listrik+air.
- Checkout UX memakai `checkoutReason`.
- Invoice automation awal dan renew flow diperkenalkan.
- Audit backend/frontend menutup gap P0/P1.

### 2026-04-19 sampai 2026-04-20 — Role Split dan Portal Access
- Dashboard route dikunci per role.
- Tenant portal dibuat lebih jujur terhadap empty/error state.
- Portal access tenant dibuat tenant-context:
  - create portal user,
  - toggle active/inactive,
  - reset password portal.

### 2026-04-21 — V4 Booking Mandiri Dimulai
- Backend V4 4.0: `GET /public/rooms`, `POST /tenant/bookings`, `GET /tenant/bookings/my`.
- Frontend V4 4.0: public rooms, booking page, portal bookings, backoffice reserved read-only.
- Admin approval frontend surface disiapkan.

### 2026-04-22 sampai 2026-04-24 — Payment Deep Patch dan UAT Stabilization
- Payment submission flow masuk sebagai candidate baseline.
- Combined booking payment decision dibuat: rent + deposit satu submission.
- Approval payment harus idempotent dan race-safe.
- Expiry booking diperketat.
- Pricing Policy V1 diputuskan.

### 2026-04-26 — Phase 4.3-A Reminder Preview PASS
- Backend preview endpoint reminder tersedia.
- Frontend `/reminders` untuk OWNER/ADMIN.
- Preview read-only, tanpa WhatsApp send dan tanpa scheduler.

### 2026-04-27 — Phase 4.3-B/C Notification Foundation
- Reminder Mock Send PASS.
- AppNotification backend foundation PASS.
- Frontend Notification Center PASS:
  - bell,
  - unread badge,
  - dropdown,
  - `/notifications`,
  - tenant sidebar menu Notifikasi.
- Keputusan Payment Urgency Chip dibuat sebagai next UX finance.

---

## 2026-04-27 — Lifecycle Integrity Issue Found

### Masalah
1. Tenant non-occupied masih dapat menerima/lihat announcement operasional.
2. Meter baseline tenant booking dibuat terlalu dini saat approve booking sehingga rawan duplicate/zombie ketika booking cancel/rebook.

### Keputusan
- Announcement operational untuk tenant hanya untuk occupied tenant.
- Tenant non-occupied diarahkan ke `/portal/bookings`.
- Meter final tenant booking dibuat saat payment approved/room occupied.
- Approve booking menyimpan pending snapshot di Stay.
- Cancel/expired sebelum occupied membersihkan pending snapshot.
- Checkout occupied tidak menghapus histori.

---

## 2026-04-28 — Phase 4.3-G2 Fresh UAT PASS

### Commit context
- Branch: `checkpoint/uat-4-2-before-cancelstay-fix`
- Relevant commits:
  - `d2d80f2 defer booking meter baseline until payment activation`
  - `b555f25 clear pending meter snapshot on reserved stay cancel`
  - `7bfe282 clear pending meter snapshot on booking expiry`
  - `3530004 guard booking expiry against occupied stays`
  - `256a6f4 seed dev data for G2 UAT`

### DB reset and seed
Fresh UAT memakai DB reset clean:
- `npx prisma db push --force-reset`
- `npx prisma generate`
- `bootstrap.sql`
- `bootstrap_v4_addendum.sql`
- `npx ts-node seed-admin.ts`

Seed baseline:
- OWNER: `admin@kost48.com / admin123`
- TENANT: `tenant.g2@kost48.com / tenant123`
- Rooms: `G2-001`, `G2-002`, `G2-003`
- Initial counts: users 2, tenants 1, rooms 3, stays 0, meterReadings 0, invoices 0, submissions 0.

### UAT evidence
1. Admin approve booking created pending snapshot only.
2. MeterReading count remained 0 after approve booking.
3. Reserved expiry cleared pending snapshot and released room.
4. Payment submission combined amount Rp2.700.000 succeeded.
5. Admin approve payment promoted pending snapshot into 2 MeterReadings.
6. Room became `OCCUPIED`.
7. Expire occupied returned 409 and DB stayed unchanged.
8. `runExpiryCheck` code verified to target only `ACTIVE + RESERVED + initialMetersPromotedAt null + expiresAt < now`.

### Final assessment
- Phase 4.3-G2 Pending Meter Snapshot Core = PASS.
- G2e/G2f legacy cleanup = skipped because DB dev reset clean before live.
- Next practical ACT = Phase 4.3-D Tenant Payment Urgency Header Chip.

---

## 2026-04-28 — Docs Cleanup Consolidation

### Masalah
Terlalu banyak file markdown sementara/status/package/changelog terpisah dibuat setiap patch sehingga konteks menjadi berantakan.

### Perubahan dokumen
Dokumen aktif dibatasi menjadi:
- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`

File lama yang boleh dihapus dari active docs:
- `CURRENT_STATUS_2026-04-26.md`
- `README_PROGRESS_UPDATE.md`
- `PACKAGE_README_2026-04-27.md`
- `PATCH_SUMMARY*.md`
- `CHANGELOG_BACKEND.md`
- `FINAL_FRONTEND_FEATURES.md`
- `05_V4_MASTER_PLAN.md`
- pasted/temp markdown files.
