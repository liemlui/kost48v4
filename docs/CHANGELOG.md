# KOST48 V5 — Changelog
**Versi:** 2026-05-19 V5.9 rollback + V5.8-A guard line defenses  
**Fungsi:** Satu changelog gabungan untuk backend, frontend, docs, dan architecture planning. Jangan buat changelog frontend/backend terpisah kecuali diminta.

---

---

## 2026-05-19 — V5.9 Multi-App Shell Rollback

### Type
Cleanup rollback. Menghapus V5.9 multi-app shell yang tidak aktif.

### Changed
- `backend/src/main.ts`: dikembalikan ke bootstrap core sederhana (tidak lagi pakai `bootstrapKost48App`).  
- `backend/package.json`: skrip multi-app (`start:core`, `start:marketing`, `start:staff`, `start:finance`, `prisma:copy-generated` via script terpisah) dihapus. Inline copy-generated dimasukkan ke `build`.  
- `backend/src/app.module.ts`: import `HealthModule` dihapus.  
- `backend/src/modules/health/`: direktori dihapus.  
- `backend/src/apps/`: direktori sebelumnya sudah dihapus oleh user.

### Not changed
- `backend/nest-cli.json`: tetap single-project.  
- `backend/tsconfig.json` dan `backend/tsconfig.build.json`: tidak disentuh.  
- Semua module lifecycle, payment, booking, checkout, renew: tidak disentuh.  
- Semua V5.8-A guard line defenses: TETAP UTUH.

### Reason
V5.9 multi-app shell dibuat terlalu dini — workspace belum siap manual migration, apps tidak aktif, dan tidak seharusnya diterapkan sebelum gated PLAN/ACT sequence. Rollback ini membersihkan state ke baseline V5.8-A guard ready.

---

## 2026-05-18 — V5.8-A Backend Guard Overlay Prepared

### Type
Source overlay patch + docs/scripts sync. Build/UAT not yet run locally.

### Changed
- Removed dead `StaysModule` import from `CheckoutRequestsModule`.
- Changed renewal invoice flow in `StaysService.renewStay()`:
  - create invoice as `DRAFT` for line insertion compatibility,
  - create renewal rent line,
  - immediately issue invoice with `status: ISSUED` and `issuedAt`.
- Strengthened `StaysService.complete()`:
  - blocks checkout final for any invoice with status not in `PAID`/`CANCELLED`,
  - guard runs inside the transaction before stay/room mutation,
  - error lists invoice number/id and status.
- Strengthened `StaysService.processDeposit()` with the same open invoice semantics.
- Updated `StaysQueryService` open invoice counts to include all non-closed invoice statuses.
- Added verification/UAT PowerShell scripts under `scripts/`.

### Not changed
- No schema migration.
- No workspace/app/libs generation.
- No `nest-cli.json`, `app.module.ts`, or tsconfig change.
- No payment approval, booking approval, or lifecycle ownership move.
- No frontend split.

### Required before PASS
- Run backend build locally.
- Run targeted UAT for renew approval, checkout open invoice guard, checkout allowed after settlement, and deposit guard.

## 2026-05-18 — V5.7/V5.8 Audit Docs Sync

### Type
Docs sync based on V5.7-B targeted audit and business decision lock. No source code implementation in this package.

### Updated
- Renamed active documentation context from V3/V4 to **KOST48 V5**.
- Synchronized docs with V5.1–V5.6 shared boundary hardening context.
- Added accepted V5.7-B audit findings:
  - backend workspace is `NEEDS MANUAL MIGRATION`,
  - `nest-cli.json` remains single-project,
  - `AppModule` remains monolith aggregator,
  - public/marketing module is read-only,
  - checkout dead import exists,
  - renew request execution injects `StaysService`,
  - payment approval uses `$transaction` + SQL lock,
  - manual check-in automation exists in `StaysService.create()`,
  - `StaysService.complete()` does not create final utility invoice,
  - `StaysService.renewStay()` creates renewal invoice as `DRAFT`.
- Added locked business decisions:
  - KB-1 renewal invoice must be `ISSUED` after approve request,
  - KB-2 checkout final must block open invoices and not auto-create utility invoice.
- Updated execution roadmap to V5.8 PLAN → V5.8-A/B/C split.
- Updated decisions log with V5.7-B and KB-1/KB-2 decisions.
- Updated checklist with V5 gates and P0 correctness items.

### Not implemented
- No backend code changed.
- No frontend code changed.
- No schema changed.
- No DB migration.
- No Nest app generated.
- No module moved.
- No `nest-cli.json` migration.
- No `app.module.ts` split.
- No UAT run by this docs package.

---

## 2026-05-18 — Cline Rules V5 Workflow Update

### Type
Workflow/rules update.

### Changed
- `.clinerules` updated to KOST48 V5 architecture command center workflow.
- `.clineignore` active source-of-truth comments updated to current active docs/config files.
- Cline role clarified as local auditor/bounded coding agent only.
- PowerShell-only and Invoke-RestMethod-only rules reinforced.
- Overlay patch format adopted:

```text
KOST48_V5_X_OVERLAY_PATCH/
├─ backend/
├─ frontend/
├─ scripts/
├─ PATCH_SUMMARY.txt
└─ README_COPY_PASTE_MERGE.txt
```

### Notes
- Branch wording should follow actual local git output. Latest terminal evidence showed `main/origin/main`.
- Do not change to `master` unless local git proves branch is master.

---

## 2026-05-18 — Multi-App Shared-DB Architecture Planning

### Type
Architecture planning docs update only. No code implementation.

### Added
- Architecture direction: **Multi-App Shared-DB Architecture**.
- Clarified not total rewrite, not pure microservices, and not separate DB yet.
- Migration style: greenfield shell + brownfield logic extraction.
- Target backend apps:
  - `core-api`,
  - `tenant-api`,
  - `staff-api`,
  - `finance-api`,
  - `marketing-api`,
  - `owner-api` deferred.
- Ownership boundaries for Stay lifecycle, Room occupancy, checkout, renew, booking, and payment approval.

### Audit corrections
- `PaymentSubmissionsService.approveSubmission()` confirmed high-risk core flow.
- `RenewRequestsService.approveRequest()` confirmed core because it calls `StaysService.renewStay()`.
- `CheckoutRequestsModule` dead import identified.
- Public/marketing read-only candidate confirmed.

---

## 2026-05-18 — Business Lifecycle Decision Update

### Type
Business rules lock for V5.8.

### Added
- KB-1 renewal invoice policy:

```text
Renewal invoice must become ISSUED when admin approves renew request.
```

- KB-2 checkout final invoice guard:

```text
Checkout final must be blocked if any invoice for the stay is not PAID/CANCELLED.
No auto-create final utility invoice inside complete().
```

### Rationale
- Renewal invoice as `DRAFT` is inconsistent with booking/manual check-in invoice behavior.
- Checkout final should not release a room while financial obligations remain unresolved.

---

## 2026-05-11 — Business Lifecycle Blueprint Update

### Type
Historical docs/status sync.

### Note updated by V5 audit
The old statement that B1 was not done is now outdated. V5.7-B audit confirmed `StaysService.create()` now implements:

- invoice `ISSUED`,
- portal auto-create,
- meter reading creation,
- transactional direct check-in.

---

## 2026-05-09 — Local Stabilization Status Update

### Still relevant
- Staff inventory read-only rule.
- Full checkout baseline UAT.
- Dev/UAT seed targets.
- CSS modularization deferred.

### Changed by V5 audit
- Full checkout needs targeted retest after KB-2 guard is implemented.
- Manual check-in business automation is no longer next P0; it is implemented in code.

---

## Historical Completed Items

- Booking Mandiri PASS.
- Admin Approval PASS.
- Payment Submission Core PASS.
- Pricing Policy V1 PASS.
- Reminder Preview PASS.
- Reminder Mock Send PASS.
- Notification Center MVP COMPLETE.
- Announcement Access Guard PASS.
- Pending Meter Snapshot Fresh UAT PASS.
- Staff inventory read-only PASS.
- Manual Check-in UX Reliability PASS.
- Full Checkout UAT baseline PASS.
- Production handoff PASS.

---

## 2026-05-18 — V5.9-A Multi-App Read-Only Shell Patch

### Type
Backend source patch. Multi-app shared-DB foundation without lifecycle extraction.

### Added
- Shared bootstrap helper: `backend/src/common/bootstrap/kost48-bootstrap.ts`.
- Health endpoint module: `GET /api/health`.
- `marketing-api` shell under `backend/src/apps/marketing-api`.
- `staff-api` shell under `backend/src/apps/staff-api` with dedicated read-only staff module.
- `finance-api` shell under `backend/src/apps/finance-api` with dedicated read-only finance module.
- Backend package scripts:
  - `start:core`
  - `start:marketing`
  - `start:staff`
  - `start:finance`
  - `start:marketing:dev`
  - `start:staff:dev`
  - `start:finance:dev`
- Verification scripts:
  - `scripts/VERIFY_V5_9_A_MULTI_APP.ps1`
  - `scripts/UAT_V5_9_A_MULTI_APP_SMOKE.ps1`

### Preserved
- Existing core `src/main.ts` remains the default core-api entry and still builds to `dist/main.js`.
- Existing monolith `AppModule` is not split yet.
- Existing route behavior in core-api is preserved.
- Payment approval, booking approval, renew execution, checkout final, room writes, and meter promotion remain core-api only.

### Not changed
- No schema change.
- No DB migration.
- No payment approval move.
- No tenant-api extraction.
- No frontend split.
- No separate DB.
