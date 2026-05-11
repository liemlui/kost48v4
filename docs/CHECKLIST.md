# KOST48 V3/V4 — Active Checklist
**Versi:** 2026-05-11 business lifecycle blueprint

---

## A0. Latest Active Checklist — 2026-05-11

### Start-of-session hygiene

- [ ] Run `git status --short; git log --oneline -8` before any new work.
- [ ] Verify identity patch committed and pushed (atau konfirmasi status dari user).
- [ ] Do not attempt CSS modularization.
- [ ] Do not start Batch B1 ACT before running Cline PLAN audit first.
- [ ] If Cline terminal is not PowerShell, STOP. Do not adapt to cmd/Git Bash/WSL.

### Batch B0 — Identity patch commit/push

- [ ] Confirm identity patch files sudah committed.
- [ ] Confirm pushed to origin/main.
- [ ] `git log --oneline -5` menunjukkan commit identity.
- [ ] Working tree clean sebelum Batch B1.

---

## B. Batch B1 — Manual Check-in Business Automation

### Owner decisions — harus dikunci sebelum ACT

- [ ] Invoice manual check-in langsung ISSUED — **dikonfirmasi owner: Ya/Tidak**
- [ ] Auto-create portal user jika email ada — **dikonfirmasi owner: Ya/Tidak**
- [ ] Tenant tanpa email tetap bisa check-in, portal = belum aktif — **dikonfirmasi owner: Ya/Tidak**
- [ ] Portal auto-create idempotent (MISSING_EMAIL / CREATED / ALREADY_ACTIVE / CONFLICT) — **dikonfirmasi owner: Ya/Tidak**
- [ ] Jika portal user sudah ada untuk tenant sama, jangan error — **dikonfirmasi owner: Ya/Tidak**
- [ ] Jika email dipakai tenant/user lain, block conflict — **dikonfirmasi owner: Ya/Tidak**
- [ ] Temp password ditampilkan sekali di modal hasil check-in — **dikonfirmasi owner: Ya/Tidak**
- [ ] Modal punya tombol Salin Password + warning jelas — **dikonfirmasi owner: Ya/Tidak**
- [ ] Jika admin lupa copy, reset manual dari Tenant Detail — **dikonfirmasi owner: Ya/Tidak**

### Pre-ACT — Cline PLAN audit dulu

- [ ] Audit `StaysService.create()` — periksa invoice creation saat ini DRAFT atau ISSUED.
- [ ] Audit `TenantsService` — periksa portal creation method existing.
- [ ] Audit users/auth dependency untuk create portal user dan temporary password.
- [ ] Audit `CheckInWizard.tsx` — periksa response handling saat ini.
- [ ] Audit stays API/types — periksa response DTO existing.
- [ ] PLAN output: file list, function, contract idempotent, response DTO plan, UAT checklist.
- [ ] PLAN output tidak membuka deposit/damage/renewal/final utility/schema.

### ACT scope

- [ ] `StaysService.create()` — invoice awal langsung ISSUED.
- [ ] `StaysService.create()` — auto-create portal user (idempotent).
- [ ] Response check-in mengembalikan portal result + temp password jika baru.
- [ ] `CheckInWizard.tsx` — success modal menampilkan portal result.
- [ ] Temp password hanya ditampilkan sekali dan tidak disimpan plaintext.
- [ ] Build backend PASS.
- [ ] Build frontend PASS.
- [ ] `git status --short` reviewed.

### UAT B1 — Happy path

- [ ] Manual check-in tenant baru dengan email.
- [ ] Stay ACTIVE, room OCCUPIED, invoice ISSUED.
- [ ] Modal menampilkan portalEmail + temp password.
- [ ] Tombol Salin Password berfungsi (copy ke clipboard).
- [ ] Tenant login portal dengan temp password berhasil.
- [ ] Tenant melihat current stay di portal.
- [ ] Tenant melihat invoice ISSUED di portal.

### UAT B1 — Edge cases

- [ ] Check-in tenant tanpa email: berhasil, modal tampilkan “portal belum aktif”.
- [ ] Check-in tenant existing yang sudah punya portal: berhasil, modal tampilkan “portal sudah aktif”.
- [ ] Check-in dengan email yang dipakai tenant/user lain: gagal dengan pesan konflik yang jelas.
- [ ] Jika check-in gagal karena conflict, room tidak berubah status dan stay tidak tercipta.
- [ ] Build backend PASS.
- [ ] Build frontend PASS.
- [ ] `git status --short` clean setelah selesai.

---

## C. Completed / Do Not Repeat Unless Touched

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

### M-series patches

- [x] M2 Manual Check-in UX Reliability PASS — commit `71ab386`.
  - Catatan: M2 adalah UX fix. Invoice auto-ISSUED dan portal auto-create belum dikerjakan → Batch B1.
- [x] M3 UI Polish PASS — commit `960f922`.
- [x] M4 Password Visibility Toggle PASS.

### Staff Inventory Read-only

- [x] STAFF dapat view inventory items.
- [x] STAFF tidak dapat create/edit/delete/adjust/import.
- [x] OWNER/ADMIN dapat mutate inventory.
- [x] Backend guard enforced — commit `70fcf4e`.

### Tenant Identity + Duplicate Protection

- [x] `identityNumber` No KTP wajib untuk tenant baru.
- [x] No KTP wajib 16 digit angka.
- [x] Inline tenant creation di CheckInWizard punya field No KTP.
- [x] Backend mencegah duplicate: No KTP, No HP, email.
- [x] Update tenant juga mencegah duplicate.
- [x] API UAT PASS — 157 PASS / 0 FAIL.
- [ ] Commit/push dikonfirmasi dari `git log`.

### Full Checkout UAT

- [x] Guest booking dari `/rooms`.
- [x] Admin approve booking.
- [x] Tenant submit payment.
- [x] Admin approve payment → room OCCUPIED.
- [x] Tenant submit Pengajuan Keluar Kamar.
- [x] Admin Setujui Rencana.
- [x] Tenant tetap menghuni setelah approval rencana.
- [x] Admin Checkout Final dari StayDetail.
- [x] Stay completed, room available.

### Production

- [x] Frontend production `app.kost48surabaya.com` PASS.
- [x] Backend production `api.kost48surabaya.com/api` PASS.
- [x] Admin login production PASS.
- [x] Protected notification endpoint PASS.
- [x] Reminder preview endpoint PASS.

---

## D. Next Up — Urgency Chip Status Audit

Sebelum klaim PASS 4.3-D, konfirmasi status kode urgency chip:

- [ ] Cek apakah ada file urgency chip di frontend (`UrgencyChip`, `PaymentUrgency`, dll).
- [ ] Jika ada kode: lakukan browser UAT.
- [ ] Jika tidak ada kode: downgrade ke implementation PLAN, bukan verify.

### UAT 4.3-D jika kode sudah ada

- [ ] Tenant dengan invoice overdue melihat chip `Terlambat X hari`.
- [ ] Tenant dengan booking payment deadline melihat chip `Bayar sebelum X jam`.
- [ ] Tenant dengan invoice due soon melihat chip `Tagihan H-X`.
- [ ] Tenant dengan contract ending melihat chip `Kontrak H-X`.
- [ ] Chip tetap muncul setelah notification dibaca.
- [ ] Chip hilang setelah invoice paid / booking resolved / stay resolved.
- [ ] Admin/OWNER/STAFF tidak melihat chip ini.

---

## E. Future Gates

### Batch B2 — Invoice Lifecycle + Final Utility

Pre-audit:

- [ ] Audit `StaysService.complete()` — apakah meter akhir menghasilkan invoice line?
- [ ] Audit `RenewalsService.approve()` — apakah invoice renewal DRAFT atau ISSUED?
- [ ] Audit form approval renewal — apakah sudah punya field nominal?
- [ ] Audit invoice period coverage setelah renewal.

Owner decisions sebelum ACT B2:

- [ ] Checkout + DRAFT invoice: hard block atau warning + void/issue option?
- [ ] Renewal invoice: auto-ISSUED atau DRAFT dengan window koreksi?
- [ ] Form approval renewal perlu nominal field?

### Batch B4 — Deposit Settlement

- [ ] DepositTransaction model schema plan.
- [ ] Owner approve schema change.
- [ ] Backend service + migration.
- [ ] Frontend checkout final form dengan deposit settlement fields.

### Batch B5 — Damage / Penalty

- [ ] Damage model design setelah deposit clear.
- [ ] RoomFacility.condition update flow.
- [ ] Room MAINTENANCE trigger decision.

---

## F. Deferred / Not Open Yet

- [ ] Real WhatsApp provider.
- [ ] Scheduler/cron reminder.
- [ ] Browser push/service worker/PWA push.
- [ ] SSE/websocket notification stream.
- [ ] Advanced stage-aware announcement audience.
- [ ] KTP upload.
- [ ] Damage photo upload.
- [ ] Payment gateway.
- [ ] DB unique constraint pending data audit/cleanup.

---

## G. Later Roadmap

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

