# KOST48 V3/V4 — Project Journal
**Versi:** 2026-05-11 business lifecycle blueprint  
**Fungsi:** Arsip kronologis milestone dan hasil UAT. Tidak menggantikan `00_GROUND_STATE.md`.

---

## 2026-05-11 — Business Lifecycle Audit & Blueprint

### Konteks

Setelah full API UAT lulus dan M-series patches selesai, penggunaan browser manual mengungkap **business automation gap**: manual check-in bisa menghasilkan tenant yang menghuni kamar sementara invoice pertama masih `DRAFT` dan portal belum otomatis dibuat.

Ini bukan regresi dari M2 UX patch. M2 yang PASS adalah UX reliability fix:

- Modal close berfungsi benar.
- Tombol X tidak meninggalkan backdrop.
- Tombol Kembali ke `/stays`, bukan `/dashboard`.
- Tenant select refresh setelah inline creation.

M2 **tidak mencakup** invoice auto-ISSUED atau portal auto-create. Business automation gap ini adalah item baru yang ditemukan setelah UAT teknis selesai.

### Audit business logic yang dilakukan

Audit Cline memetakan full business lifecycle dari public booking sampai checkout final. Temuan utama yang valid:

```text
1. Manual check-in membuat invoice DRAFT, bukan ISSUED.
2. Portal tidak auto-created saat check-in.
3. Checkout final perlu audit terhadap DRAFT invoice dan final utility charge.
4. Deposit settlement belum punya audit trail.
5. Damage/penalty belum ada model.
6. Final meter akhir checkout belum dikonfirmasi menghasilkan utility charge.
```

### Koreksi terhadap audit Cline

Beberapa framing audit Cline perlu dikoreksi:

```text
"Guest/public booking tidak ada" → TIDAK AKURAT
  Yang benar: baseline booking sudah UAT PASS (4.0/4.1/4.2).
  Yang belum: marketing polish (gallery, detail, SEO, flexible registration) → Phase 4.4.

"Payment flow pakai /invoice-payments" → KURANG AKURAT
  Yang benar: flow utama booking memakai PaymentSubmission, bukan direct InvoicePayment.

"M2 lanjut untuk invoice/portal" → SALAH NAMING
  Yang benar: M2 UX sudah PASS. Invoice/portal automation adalah Batch B1.
```

### Business invariants yang dikunci

Lima prinsip bisnis baru dikunci dan masuk ke CONTRACTS + GROUND_STATE:

```text
1. OCCUPIED berarti bisnis sudah aktif → invoice harus ISSUED, portal harus siap bila email ada.
2. DRAFT invoice hanya untuk persiapan internal.
3. Portal account otomatis jika email ada, status jelas jika tidak.
4. Portal auto-create harus idempotent: MISSING_EMAIL, CREATED, ALREADY_ACTIVE, CONFLICT.
5. Deposit adalah liability, bukan sekadar angka.
```

### Roadmap yang dihasilkan

```text
Batch B0: Commit identity patch jika belum.
Batch B1: Manual Check-in Business Automation (P0 — next).
Batch B2: Invoice Lifecycle + Final Utility Audit (P0/P1).
Batch B3: Urgency Chip Verification (status perlu dikonfirmasi).
Batch B4: Deposit Settlement Model (P1).
Batch B5: Damage / Penalty / Inventory Condition (P1).
Batch B6: Public / Marketing Polish (P2 — Phase 4.4).
```

### Status kerja setelah audit

```text
Tenant Identity + Duplicate Protection: API UAT PASS 157/0 — pending commit/push confirmation.
Staff Inventory Read-only: PASS — commit 70fcf4e.
M2 UX Reliability: PASS — commit 71ab386.
Full Checkout UAT: PASS.
Business automation gap: IDENTIFIED — Batch B1 belum dikerjakan.
```

---

## 2026-05-09 — Local Stabilization, UX Flow, and DB Reset Context

### Ringkasan kerja terbaru

- Dashboard command center telah melewati browser UAT user dan dinyatakan OK/PASS.
- M2 Manual Check-in Reliability (UX) dinyatakan PASS: modal close dan tenant select refresh sudah oke. Commit `71ab386`.
- M4 Password Visibility Toggle dinyatakan PASS oleh user.
- M3 UI polish sudah pushed: toast spacing, mobile safe-area, close button/sidebar polish. Commit `960f922`.
- Staff Inventory read-only PASS. Commit `70fcf4e`.
- Tenant Identity Required + Duplicate Protection: backend build PASS, frontend build PASS, API UAT PASS 157/0.
- BIG UX patch untuk rencana keluar/checkout final sempat digabung dengan CSS modularization.
- CSS modularization menyebabkan visual regression dan di-rollback.

### Full Checkout UAT selesai

Flow yang harus dipertahankan — verified PASS:

1. Tenant mengajukan Pengajuan Keluar Kamar.
2. Admin Setujui Rencana.
3. Status menjadi Rencana Disetujui / Siap Checkout Final.
4. Tenant masih menghuni.
5. Admin menjalankan Checkout Final saat tenant benar-benar keluar.
6. Stay selesai dan room available.

### DB reset dev/UAT

Solusi yang benar untuk dev/UAT:

```powershell
npx prisma db push --force-reset
npx prisma generate
npx ts-node seed-admin.ts
```

Seed target:

- OWNER: `liem.lui@gmail.com / admin123`
- ADMIN: `admin@kost48.com / admin123`
- STAFF: `staff@kost48.com / staff123`
- TENANT: `tenant.g2@kost48.com / tenant123`
- Rooms: G2-001 sampai G2-005, G3-001 sampai G3-003, semua AVAILABLE.

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
- Payment Urgency Chip status tetap perlu dikonfirmasi sebelum klaim PASS.

---

## 2026-04-28 — Docs Cleanup Consolidation

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

---

## 2026-05-04 — Production Connection, Reminder Fix, and Git Push PASS

### Production verification

- Frontend production: `https://app.kost48surabaya.com`.
- Backend production: `https://api.kost48surabaya.com/api`.
- `GET /api/public/rooms` reachable. Response `items: []` berarti data rooms production masih kosong, bukan koneksi gagal.
- Admin login production PASS dengan `admin@kost48.com / admin123`.
- Protected endpoint `GET /api/me/notifications` PASS.
- Reminder preview endpoint `GET /api/admin/reminders/preview/all` PASS.
- Halaman Pengingat WhatsApp production sudah jalan setelah frontend path dan backend runtime diselaraskan.

### Git commits pushed to `origin/main`

- `ff8f2b5 harden backend production runtime`
- `652c0dd support production prisma seed and lean build`
- `54e74e6 optimize response serialization`

### Final assessment

- Production frontend/backend connection = PASS.
- Reminder WhatsApp preview = PASS.
- Local Git and `origin/main` synced at `54e74e6`.
- Hotfix langsung ke production `dist` hanya emergency-only; patch normal lewat source → build → commit → push → deploy.

