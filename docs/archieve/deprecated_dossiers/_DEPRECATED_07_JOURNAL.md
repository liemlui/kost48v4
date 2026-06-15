# KOST48 V5 — Work Journal
**Versi:** 2026-06-13 — ekstrak dari `archieve/04_JOURNAL.md` (kronologi pekerjaan historis).
**Tujuan:** Kronologi perubahan besar untuk referensi developer Multi-App Shared-DB.

<!-- KOST48_DOCS_SYNC_20260612_JOURNAL -->

---

## Timeline Pengembangan

### V5.12 — Audit Mega & UAT Runtime (2026-06-11 s.d 2026-06-12)
- **Audit Mega Full-Sweep**: 33 modul backend + schema/bootstrap + frontend, 42 temuan, 24 FIX dieksekusi.
- **Audit UI/UX Visual**: 104 screenshot (4 role), 11 temuan, 8 Quick Wins terealisasi.
- **UAT Runtime PASS**: siklus DP→pelunasan, overstay penuh (H-3/H-day/H+1), renew, rekonsiliasi (mismatch=0), trial balance seimbang.
- **E-2 Backfill**: 11 stay manual di-promote di UAT.
- **Keputusan Owner D1-D4**: tanpa denda, notifikasi in-app, UAT prioritas, docs rapi.
- **Commit**: e4a8c31..f9d10ac.

### V5.11 — Docs Simplifikasi & Baseline (2026-06-11)
- Simplifikasi Docs V1: 5 file aktif menggantikan 8+ file lama.
- CLAUDE.md dibuat sebagai pintu masuk sesi.
- Docs basi V5.10.0 diarsipkan ke `archieve/`.
- Commit: `45237ba`.

### V5.10 — Charts, Review, Tiket, CSS (2026-06-02)
- Recharts analytics: client-side chart dari data yang sudah ada, zero extra API.
- Review komplain + rating terstruktur (`[Kategori] teks`).
- Tiket BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN.
- CSS split: `src/styles.css` (538 KB) dipecah 13 modul.
- Pagination tabel admin (10 rows).

### V5.9 — Readiness Flow & Booking Expiry (2026-05-31)
- **V5.9.9**: Fix missing `getBookingExpiryMeta` import di StaysPage.tsx.
- **V5.9.8-A**: Room Readiness Flow Hardening — MAINTENANCE gate + CHECKOUT_INSPECTION ticket.
- **V5.9.5-A**: Public room assets & slideshow, `canBook` flag, curated static assets.
- **V5.9.3-B**: Tenant Room Dossier Compact — `GET /api/room-items/my-room`.
- **V5.9.2**: UI finalization & tenant engagement.

### V5.8 — Inventory, Deposit, Integrity (2026-05)
- **M10**: Cleanup and Safety Flow Hardening.
- **M9**: Read Smoke, Critical API Flow, Build Gate PASS.
- **M8**: Command Center Safety Belts, Inventory UAT, Owner Finance Gate.
- **M4A**: Deposit Ledger Backend Foundation.

### V5.2 — Multi-App Architecture Foundation (2026-05)
- **V5.2.9**: Data mutation safety contracts, invoice/payment/booking lifecycle rules.
- **V5.2.8-B8**: Account Configuration & Recurring Invoice.
- **V5.2.7**: Owner financial management & tenant deposit flows.

### V4 / Early V5 (2026-04 s.d awal 2026-05)
- Booking mandiri MVP.
- Admin approval flow.
- Payment submission core.
- Pricing policy V1.
- Reminder preview & mock send.
- Notification center MVP.
- Announcement access guard.
- Manual check-in UX.
- Password visibility toggle.
- Full checkout UAT.
- Staff inventory read-only.

---

## Konteks V5 Architecture Direction (Current)

- **KOST48 V5 — Multi-App Shared-DB Architecture.**
- Bukan total rewrite, bukan pure microservices.
- Shared PostgreSQL tetap, PrismaService tetap shared.
- Greenfield shell + brownfield logic extraction.
- Target apps: core-api, tenant-api, staff-api, finance-api, marketing-api, owner-api (deferred).

### High-Risk Flows (jangan diekstrak tanpa PLAN audit)
- `PaymentSubmissionsService.approveSubmission()`
- `StaysService.create()` / `.complete()` / `.renewStay()`
- `TenantBookingsService.approveBooking()`
- Checkout final
- Renew admin approval/execution
- Room status writes
- Meter promotion
- Deposit settlement
- Damage/penalty schema (deferred)

### Current Priority
1. V5.7 — Workspace & Shared Foundation Prep (PLAN/AUDIT)
2. V5.8 — Marketing-api extraction candidate
3. V5.9 — Staff-api extraction candidate
4. Later — tenant-api, finance-api, frontend split

---

*Untuk detail per-flow, lihat `01_FLOW_MAP.md`. Untuk rencana kerja saat ini, lihat `02_WORK_PLAN.md`. Untuk changelog rilis, lihat `CHANGELOG.md`.*