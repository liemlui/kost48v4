# KOST48 V3/V4 — Changelog
**Versi:** 2026-05-11 business lifecycle blueprint  
**Fungsi:** Satu changelog gabungan untuk backend, frontend, dan docs. Jangan buat changelog frontend/backend terpisah lagi kecuali diminta.

---

## 2026-05-11 — Business Lifecycle Blueprint Update

### Type
Docs/status sync for business lifecycle completeness after full UAT and manual browser findings.

### Changed context
- Clarified that **M2 Manual Check-in UX Reliability PASS** only covers:
  - Offcanvas/modal close,
  - Back/Kembali navigation to `/stays`,
  - tenant select refresh after inline tenant creation.
- Clarified that M2 does **not** include:
  - invoice auto-ISSUED,
  - portal user auto-create,
  - temporary portal password delivery.
- Added **Batch B1 — Manual Check-in Business Automation** as next P0 business batch.
- Added business invariant: `OCCUPIED` means business is active, so invoice/portal consequences must be ready.
- Added policy: manual check-in invoice should become `ISSUED`, not remain quietly `DRAFT`.
- Added policy: portal user should auto-create during manual check-in if tenant email exists.
- Added idempotent portal creation contract:
  - `MISSING_EMAIL`,
  - `CREATED`,
  - `ALREADY_ACTIVE`,
  - `CONFLICT`.
- Added once-only temporary password delivery policy with copy button and warning.
- Added future audit items:
  - final meter → utility charge,
  - renewal invoice lifecycle,
  - checkout + DRAFT invoice policy,
  - deposit settlement model,
  - damage/penalty,
  - inventory room condition.

### Tenant Identity Required + Duplicate Protection
- Status: CODE COMPLETE / BUILD PASS / API UAT PASS.
- API UAT summary: 157 PASS / 2 WARN / 0 SKIP / 0 FAIL.
- Added No KTP required for new tenants.
- Added 16-digit validation for No KTP.
- Added duplicate prevention for:
  - No KTP,
  - No HP,
  - tenant email,
  - User.email conflict.
- Added No KTP to inline manual check-in tenant form.
- Commit/push status should be confirmed with `git log --oneline -5` before starting Batch B1.

### Not implemented yet
- Manual check-in invoice auto-ISSUED.
- Manual check-in portal auto-create.
- Deposit settlement model.
- Damage/penalty model.
- KTP upload.
- DB unique constraints.

---

## 2026-05-09 — Local Stabilization Status Update

### Type
Docs/status sync for latest local development context.

### Updated context
- Added latest rule for Rencana Keluar / Checkout Final UX:
  - approve plan/request is not final checkout,
  - tenant remains occupying until admin runs Checkout Final.
- Added current seed target:
  - OWNER `liem.lui@gmail.com / admin123`,
  - ADMIN `admin@kost48.com / admin123`,
  - TENANT `tenant.g2@kost48.com / tenant123`.
- Added DB reset correction:
  - use `npx prisma db push --force-reset` for dev/UAT,
  - do not use `migrate reset` when migrations lag behind current schema.
- Added CSS modularization decision:
  - deferred after visual regression,
  - keep `styles.css` monolithic for now.
- Added STAFF inventory read-only rule.
- Later UAT confirmed Staff Inventory read-only PASS and M2 UX Reliability PASS.

### No assumption
New sessions must check `git status --short` first. Do not assume working tree is clean.

---

## 2026-05-04 — Production Handoff PASS

### Type
Production deployment verification + runtime hardening.

### Result
- Frontend production `app.kost48surabaya.com` connected to backend `api.kost48surabaya.com/api`.
- Admin login production PASS.
- Protected notification endpoint PASS.
- Reminder preview endpoint PASS at `/api/admin/reminders/preview/all`.
- Pengingat WhatsApp page production confirmed working.
- DB table/sequence grants for production app user fixed.
- GitHub `origin/main` updated to `54e74e6`.

### Commits pushed
- `ff8f2b5 harden backend production runtime`
- `652c0dd support production prisma seed and lean build`
- `54e74e6 optimize response serialization`

### Notes
- Production data rooms may still be empty; this is not a connection issue.
- Direct production `dist` hotfix should be emergency-only. Future patch should go through source → build → commit → push → deploy.

---

## 2026-04-28 — Docs Cleanup Patch

### Type
Docs consolidation only.

### Changed
- Consolidated active docs into a smaller set:
  - `00_GROUND_STATE.md`
  - `01_CONTRACTS.md`
  - `02_PLAN.md`
  - `CHECKLIST.md`
  - `03_DECISIONS_LOG.md`
  - `04_JOURNAL.md`
  - `CHANGELOG.md`
- Merged current status, progress update, package readme, patch summaries, frontend feature set, backend changelog, and V4 master plan into the active docs.
- Added latest Phase 4.3-G2 Fresh UAT PASS status.
- Added docs hygiene rule: do not create new dated/package/patch summary markdown files by default.

### Delete from active docs manually
- `CURRENT_STATUS_2026-04-26.md`
- `README_PROGRESS_UPDATE.md`
- `PACKAGE_README_2026-04-27.md`
- `PATCH_SUMMARY.md`
- `PATCH_SUMMARY_PHASE_4_3_G_LIFECYCLE_DECISION.md`
- `CHANGELOG_BACKEND.md`
- `FINAL_FRONTEND_FEATURES.md`
- `05_V4_MASTER_PLAN.md`
- Temporary/pasted markdown files.

---

## 2026-04-28 — Phase 4.3-G2 Fresh UAT PASS

### Type
Backend lifecycle verification + dev seed committed.

### Relevant commits
- `3530004 guard booking expiry against occupied stays`
- `256a6f4 seed dev data for G2 UAT`

### Result
- Approve booking saves pending meter snapshot only.
- Approve booking does not create `MeterReading`.
- Reserved expiry clears pending snapshot and releases room.
- Payment approval promotes snapshot into 2 `MeterReading` rows.
- Occupied stay expiry is rejected with `409`.
- `runExpiryCheck` is scoped to reserved/unpromoted bookings only.
- G2e/G2f legacy cleanup skipped because DB dev reset clean before live.

---

## 2026-04-27 — Phase 4.3-G Lifecycle Decision

### Type
Backend/frontend lifecycle decision and docs sync.

### Decisions
- Tenant booking meter final created only at payment approved / room `OCCUPIED`.
- Approve booking stores pending meter snapshot in `Stay`.
- Cancel/expired before occupied clears pending snapshot.
- Checkout occupied stay preserves operational history.
- Announcement `TENANT` operational audience only for occupied tenants.
- Tenant non-occupied redirects from `/portal/announcements` to `/portal/bookings`.

---

## 2026-04-27 — Phase 4.3-C Notification Center MVP

### Backend
- Added `AppNotification` foundation.
- Added endpoints:
  - `GET /me/notifications`
  - `PATCH /me/notifications/:id/read`
  - `PATCH /me/notifications/read-all`
- Mock reminder can create AppNotification for tenant portal user.
- User isolation tested.

### Frontend
- Added notification API client/hook.
- Added notification bell, unread badge, dropdown.
- Added `/notifications` page.
- Added tenant sidebar menu `Notifikasi`.
- Owner/Admin/Staff access notifications via bell/header only.

### Deferred
- Real WhatsApp provider.
- Scheduler/cron.
- Browser push/service worker.
- SSE/websocket.

---

## 2026-04-26 — Phase 4.3-A Reminder Preview PASS

### Added
- Backend reminder preview endpoints:
  - booking expiry,
  - invoice due,
  - invoice overdue,
  - checkout approaching,
  - preview all.
- Frontend `/reminders` for OWNER/ADMIN.
- Menu `Pengingat WhatsApp` for OWNER/ADMIN only.

### Rules
- Read-only preview.
- No WhatsApp send.
- No scheduler.
- No NotificationLog write in 4.3-A.

---

## 2026-04-24 — Payment Submission Core Accepted

### Decisions
- Tenant creates `PaymentSubmission`, not direct `InvoicePayment`.
- Admin approval creates final payment records.
- Initial booking payment uses combined rent + deposit submission.
- Exact amount required.
- Room activates only after rent and deposit initial paid.

---

## 2026-04-21 to 2026-04-23 — V4 Booking + Approval Surface

### Backend
- Public rooms endpoint.
- Tenant booking endpoint.
- Tenant booking list endpoint.
- Admin booking approval endpoint.

### Frontend
- Public `/rooms`.
- `/booking/:roomId`.
- `/portal/bookings`.
- Booking reserved surface in Stays.
- Approval booking modal.
- Tenant status `Menunggu Approval` / `Menunggu Pembayaran`.

---

## 2026-04-13 to 2026-04-20 — Foundation Summary

- Core stay/room/deposit/invoice flow stabilized.
- Role-based dashboard and navigation hardened.
- Tenant portal access flow created.
- Ticket tenant-first redesign completed.
- Backend security/API gap closure completed.
