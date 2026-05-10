# KOST48 V3/V4 — Active Checklist
**Versi:** 2026-05-04 production handoff

---

## A0. Latest Active Checklist — 2026-05-09

### Start-of-session hygiene
- [ ] Run `git status --short; git log --oneline -8` before any new work.
- [ ] If 8 frontend UX files are modified, do not start new feature.
- [ ] If BIG UX patch is modified, run frontend build and visual UAT first.
- [ ] Do not attempt CSS modularization again now.

### BIG UX / rencana keluar state
- [ ] Verify login page styling normal.
- [ ] Verify public rooms styling normal.
- [ ] Verify OWNER sidebar has `Pengguna`.
- [ ] Verify ADMIN sidebar has `Pengguna`.
- [ ] Verify dashboard cards normal and clickable.
- [ ] Verify `Pengajuan Keluar Kamar` wording clear in tenant portal.
- [ ] Verify `Rencana Disetujui / Siap Checkout Final` does not imply tenant already left.
- [ ] Commit BIG UX patch only after build + visual UAT.

### Dev/UAT DB reset
- [ ] Patch `seed-admin.ts` if not yet changed.
- [ ] OWNER seed = `liem.lui@gmail.com / admin123`.
- [ ] ADMIN seed = `admin@kost48.com / admin123`.
- [ ] TENANT seed = `tenant.g2@kost48.com / tenant123`.
- [ ] Reset DB with `npx prisma db push --force-reset`.
- [ ] Run `npx prisma generate`.
- [ ] Run `npx ts-node seed-admin.ts`.
- [ ] Build backend PASS.
- [ ] Public rooms API shows G2-001/G2-002/G2-003 available.
- [ ] OWNER login returns role OWNER.
- [ ] ADMIN login returns role ADMIN.

### Full checkout UAT fresh data
- [ ] Guest booking from `/rooms` creates reserved booking.
- [ ] Admin approves booking.
- [ ] Tenant submits payment.
- [ ] Admin approves payment.
- [ ] Room becomes OCCUPIED and stay active.
- [ ] Tenant submits Pengajuan Keluar Kamar.
- [ ] Admin Setujui Rencana.
- [ ] Tenant remains occupying after approval.
- [ ] Dashboard/Stays show Siap Checkout Final.
- [ ] Admin runs Checkout Final from StayDetail.
- [ ] Stay becomes completed and room available.

### Staff inventory read-only
- [ ] PLAN audit frontend inventory page.
- [ ] PLAN audit backend inventory endpoints/guards.
- [ ] STAFF can view inventory items.
- [ ] STAFF cannot create/edit/delete/adjust/import.
- [ ] OWNER/ADMIN can mutate inventory.
- [ ] Backend enforces mutation guard, not just frontend hiding.


## A. Current Working Tree Hygiene

- [x] Fresh UAT G2 PASS.
- [x] `seed-admin.ts` committed for clean UAT baseline: `256a6f4 seed dev data for G2 UAT`.
- [ ] Delete temporary helper files if present, especially `backend/verify-db.js`.
- [x] Production frontend/backend connection PASS.
- [x] Admin login production PASS.
- [x] Protected notification endpoint PASS.
- [x] Reminder preview production endpoint PASS.
- [x] GitHub `origin/main` pushed to `54e74e6`.
- [ ] Run `git status --short` before next ACT; expected clean.

PowerShell cleanup:
```powershell
Remove-Item backend/verify-db.js -Force -ErrorAction SilentlyContinue
git status --short
git log --oneline -5
```

---

## B. Completed / Do Not Repeat Unless Touched

### Gate 1 — UAT 4.0 Booking Mandiri
- [x] Public `/rooms` for guest.
- [x] Admin `/rooms` remains backoffice.
- [x] Tenant creates booking.
- [x] `/portal/bookings` shows correct dates/status.
- [x] Placeholder/fallback image safe.
- [x] Reserved booking separated from operational stay.
- [x] CheckInWizard regression safe.

### Gate 2 — UAT 4.1 Admin Approval
- [x] Admin approve booking.
- [x] Approval modal closes after success.
- [x] Initial invoice created/synced.
- [x] Tenant sees `Menunggu Pembayaran`.
- [x] Room remains `RESERVED` before payment.

### UAT 4.2 Core
- [x] Happy path payment submission.
- [x] Reject path.
- [x] Wrong amount path.
- [x] Double approve prevention.
- [x] Expiry core.
- [x] Combined booking payment: rent + deposit exact amount.

### Pricing Policy V1
- [x] Daily 13% monthly.
- [x] Weekly 45% monthly.
- [x] Biweekly 75% monthly.
- [x] Monthly 100%.
- [x] Semester 5.5× monthly.
- [x] Yearly 10× monthly.
- [x] Round up to Rp5.000.
- [x] Deposit not multiplied by term.

### Phase 4.3-A/B/C
- [x] 4.3-A Reminder Preview.
- [x] 4.3-B Reminder Mock Send.
- [x] 4.3-C1a AppNotification Backend.
- [x] 4.3-C1b Frontend Notification Center.
- [x] Bell/dropdown/page `/notifications`.
- [x] Tenant sidebar menu `Notifikasi`.
- [x] Admin/Owner/Staff access via bell/header only.

### Phase 4.3-G Lifecycle Fixes
- [x] 4.3-G1 Announcement Access Guard.
- [x] 4.3-G2 Pending Meter Snapshot + Promotion.
- [x] Fresh UAT G2 PASS.
- [x] Expire occupied rejected 409.
- [x] G2e/G2f legacy cleanup skipped because DB dev reset clean before live.

---


## C. Immediate Maintenance — Cline Cleanup Unused Files/Config

### PLAN
- [ ] Audit unused/temp/legacy files only.
- [ ] Identify files to delete with risk level.
- [ ] Confirm no business flow source is touched.
- [ ] Confirm no schema/database change.

### ACT
- [ ] Delete only approved obvious unused files.
- [ ] Do not delete 7 active docs.
- [ ] Do not delete reminder/notification source.
- [ ] Do not delete generated Prisma unless explicitly decided.
- [ ] Build affected app(s) PASS.
- [ ] `git status --short` reviewed.

---

## D. Next — Phase 4.3-D Tenant Payment Urgency Header Chip

### PLAN
- [ ] Audit header/topbar placement near `NotificationBell`.
- [ ] Audit tenant invoice data source.
- [ ] Audit tenant booking data source.
- [ ] Audit tenant current stay data source.
- [ ] Decide whether data is sufficient frontend-only.

### ACT
- [ ] Add urgency calculation helper/hook.
- [ ] Add tenant-only urgency chip beside bell.
- [ ] Add navigation target per urgency type.
- [ ] Ensure chip is independent from notification read/unread.
- [ ] Build frontend PASS.

### UAT 4.3-D
- [ ] Tenant with overdue invoice sees `Terlambat X hari`.
- [ ] Tenant with due soon invoice sees `Tagihan H-X` / `Jatuh tempo hari ini`.
- [ ] Tenant with booking deadline sees `Bayar sebelum X jam`.
- [ ] Tenant with ending stay sees `Kontrak H-X`.
- [ ] Chip stays visible after notification is read.
- [ ] Chip disappears after invoice paid / booking resolved / stay resolved.
- [ ] Admin/Owner/Staff do not see tenant payment urgency chip.

---

## E. Deferred / Not Open Yet

- [ ] Real WhatsApp provider.
- [ ] Scheduler/cron reminder.
- [ ] Browser push/service worker/PWA push.
- [ ] SSE/websocket notification stream.
- [ ] Advanced stage-aware announcement audience.
- [ ] Meter metadata enrichment unless needed.

---

## F. Later Roadmap

### Phase 4.4 — Marketing + Registration
- [ ] Public room detail endpoint.
- [ ] Room gallery/images.
- [ ] Public room detail page.
- [ ] Register with email or phone.
- [ ] Phone normalization/uniqueness.
- [ ] Tenant soft delete/deactivate.

### Phase 4.5 — Tenant Self-Service
- [ ] Tenant renew request.
- [ ] Admin approve/reject renew request.
- [ ] Forgot password.
- [ ] Reset password.
- [ ] Token/OTP expiration and one-time use.
- [ ] Account enumeration-safe response.
