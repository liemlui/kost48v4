# KOST48 V5 — Project Journal
**Versi:** 2026-05-31 V5.9.4 Tenant Profile One-Time Fill

<!-- KOST48_DOCS_SYNC_20260531_V594_TENANT_PROFILE_ONBOARDING_START -->
## 2026-05-31 — V5.9.4 Tenant Profile One-Time Fill Journal

Status:
```text
2597709 committed locally. Main is ahead 1 of origin/main.
Docs sync commit is next.
```

Implemented backend:
- Added `tenant-profile-onboarding.dto.ts`: 7 optional fields with class-validator decorators.
- Added `tenant-profile.controller.ts`:
  - `GET /api/tenant/profile` — role TENANT — returns safe tenant profile + completion summary.
  - `PATCH /api/tenant/profile/onboarding` — role TENANT — one-time fill for empty fields.
- Modified `tenants.service.ts`:
  - Added module-level `ONBOARDING_FIELDS` constant.
  - Added `isOnboardingFieldFilled()` private helper.
  - Added `buildCompletionSummary()` private helper.
  - Added `getTenantProfile()` public method with explicit Prisma select (notes excluded).
  - Added `fillTenantProfileOnboarding()` public method with lock enforcement and audit log.
- Modified `tenants.module.ts`: registered `TenantProfileController`.

Implemented frontend:
- Added `frontend/src/data/kost48Assets.ts` stub (build-contract fix; returns null).
- Added `TenantProfileCompletionSummary`, `TenantSelfProfile`, `TenantProfileResponse` to `types/index.ts`.
- Added `getTenantProfile()` and `fillTenantProfileOnboarding()` to `api/tenants.ts`.
- Modified `ProfilePage.tsx`:
  - Added useQuery for tenant profile (enabled for TENANT role only).
  - Added useMutation for one-time fill.
  - Added "Data Penghuni Tambahan" card with:
    - Completion badge showing X/7 data terisi.
    - Locked field readonly display with "Sudah tersimpan" hint.
    - Editable input for missing fields.
    - Save button disabled until at least one field has input.
    - Tenant-friendly Indonesian copy.
- Added `.tp-*` CSS classes to `styles.css`.

Verified:
```text
Backend:
- tsc 0 errors.
- dist/modules/tenants/tenant-profile.controller.js confirmed.
- GET /tenant/profile: 6/7 completedFields, missingFields: birthDate.
- PATCH /tenant/profile/onboarding fill birthDate: isComplete=True, 7/7.
- PATCH retry locked field: HTTP 400 with clear message.
- notes not present in GET response.
- completionPercent=100 after fill.

Frontend:
- tsc -b PASS.
- Vite build PASS: 22.03s, 733 modules, 0 errors.
```

Not changed:
```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No new npm dependency.
- No lifecycle/payment/finance mutation.
- No tenant photo upload.
- No tenant interaction/chat.
```

Carry-forward:
```text
- Browser visual smoke for /portal/profile recommended and pending.
- M9 FULL PASS remains pending until full manual browser smoke across all roles is complete.
- kost48Assets.ts stub is temporary; room cover photo integration requires a separate decision.
- Do not pop/commit the broad leftover stash (stash@{0}) without first splitting into coherent batches.
```
<!-- KOST48_DOCS_SYNC_20260531_V594_TENANT_PROFILE_ONBOARDING_END -->

<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_START -->
## 2026-05-31 — V5.9.3-B Tenant Room Dossier Compact Journal

Status:
```text
V5.9.3-B is pushed to main.
Main is clean and up to date with origin/main.
Remaining broad WIP was stashed as stash@{0} and must be handled later per batch.
```

Implemented:
- Reworked `/portal/stay` `Kamar Saya` into a compact Room Dossier.
- Added compact room header with small thumbnail, room identity, status, end date, and key facts.
- Replaced separate large detail card with expandable dossier sections.
- Added sections for:
  - Info kamar,
  - Fasilitas,
  - Inventaris kamar,
  - Tarif & dana titipan.
- Inventory section shows all room items available from API with friendly statuses and internal scroll.
- Facilities section uses room facilities when available and provides friendly fallback when empty.
- Kept issue reporting clear via `Laporkan masalah` action.
- Preserved neutral deposit language as `dana titipan`.
- Added backend `GET /api/room-items/my-room` for tenant room inventory.
- Enriched current stay query with tenant and public-visible room facilities.

Verified:
```text
Frontend:
- tsc -b PASS.
- Vite build PASS in 8.17s.
- Tenant screenshot smoke PASS: 24/24 PNG captured, all status 200.

Backend:
- GET /api/room-items/my-room returned success=True for tenant login.
- Main pushed through commits e2d7d58 and 7b89df6.
```

Not changed:
```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No tenant profile one-time fill yet.
- No tenant photo upload yet.
- No tenant interaction/chat yet.
```

Carry-forward:
```text
Next recommended slice is Tenant Profile One-Time Fill or Tenant Remaining Production Readiness.
Do not pop/commit the broad leftover stash without first splitting it into coherent batches.
M9 FULL PASS remains pending until full manual browser smoke across roles is complete.
```
<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_END -->

<!-- KOST48_DOCS_SYNC_20260531_V592_START -->
## 2026-05-31 — V5.8.6 to V5.9.2 UI Finalization and Tenant Engagement Journal

Status:
```text
Generated frontend UI packages from V5.8.6 through V5.9.2.
Backend packages for these UI rounds are UNCHANGED.
Frontend build PASS was reported for each generated package.
Final current package: V5.9.2 Tenant Engagement + Room Transparency.
Manual browser smoke is still ongoing; tenant is the active audit focus.
```

### V5.8.6 — UI Stabilization

Implemented:
- Public/auth/tenant/admin/owner visible copy cleanup.
- Public booking copy clarified that rooms are not secured before payment/admin approval.
- Tenant-facing backend jargon reduced.
- Package hygiene improved for generated ZIP handoff.

### V5.8.7 — Browser Smoke UI Fixes

Implemented:
- Login labels changed to `Penghuni` and `Admin / Operasional`.
- Public room warnings compacted.
- Admin/owner/staff copy such as refresh/review/overdue cleaned to Indonesian business wording.
- Rp0 invoice UI guard started.

### V5.8.8 — UI Simplification and Pagination

Implemented:
- Owner sidebar simplified.
- Owner dashboard reduced to business/finance cockpit.
- Dashboard queues and selected main lists compacted with max 10 visible rows/pagination behavior.
- Redundant detail buttons reduced where rows already navigate to detail.

### V5.8.9 — Finance Reports + Tenant Intelligence

Implemented:
- Reports gained Finance Report Center UI: Profit/Loss, Cashflow, Balance Sheet, Piutang Aging, Deposit Titipan.
- Charts/visual finance blocks added without dependency changes.
- Tenant stay journey and engagement-oriented metrics added.

### V5.9.0 — Tenant UI Final + Announcements

Implemented:
- Tenant portal duplicate hero/copy reduced.
- Announcements removed from heavy tenant menu treatment and moved toward header strip/notification behavior.
- Booking empty state and invoice row/detail behavior improved.
- WiFi/procedure copy made more production-like.

### V5.9.1 — Compact UI Density

Implemented:
- Global CSS density pass: smaller spacing, fonts, card padding, table rows, alerts, buttons, and section gaps.
- Tenant mobile density improved as first priority.
- Public, admin, staff, and owner surfaces also inherit compact styling.

### V5.9.2 — Tenant Engagement + Room Transparency

Implemented:
- Tenant `Kamar Saya` expanded as a room transparency card with photo/placeholder and booking-like room information.
- Room items/facilities are surfaced where data exists or fallback content is available.
- Copy explains damaged/missing/problematic items can be reported through the app.
- Tenant engagement card added for service interests beyond WiFi and improvement feedback.
- Service interest CTA is honest and routes to existing laporan/saran path until official backend exists.

Carry-forward:
```text
Rerun tenant screenshots after applying V5.9.2.
If tenant is accepted, continue Staff → Admin → Owner → Public visual audits.
Do not claim FULL PASS until browser smoke and runtime/API gates are complete.
Backend officialization starts only after UI final candidate.
```
<!-- KOST48_DOCS_SYNC_20260531_V592_END -->

<!-- KOST48_DOCS_SYNC_20260530_M10C_START -->
## 2026-05-30 — M10 Cleanup, Safety Flow Hardening, and Reminder Label Journal

Status:
```text
M10-A / M10-A.1 frontend cleanup pushed.
M10-B backend/frontend safety flow hardening pushed.
M10-C reminder label cleanup pushed as latest main baseline.
main is up to date with origin/main after push to 3fa294c.
```

### M10-A / M10-A.1 cleanup

Implemented:
- Removed dead resource config split files under `frontend/src/config/resources/*`.
- Removed legacy product/batch labels such as `Kost48 Surabaya V3`, `M4A`, `M5B`, and visible `Queue` copy from command-center/payment/deposit surfaces.
- Cleaned package handoff by excluding `.env`, nested ZIPs, upload proof files, and TypeScript build artifacts from generated ZIPs.

Verified:
```text
Frontend cleanup commits pushed before M10-B.
Frontend build was run locally during the cleanup gate.
No backend business logic was changed by cleanup-only packages.
```

### M10-B safety flow hardening

Implemented:
- Added explicit rate-limit metadata/decorator support for public booking.
- Added warning logs for best-effort Auto Journal Lite and deposit liability posting failures.
- Adjusted final checkout date comparison to Jakarta business-day convention.
- Improved frontend API error extraction in stay lifecycle/payment modals.
- Aligned tenant portal payment-submission query key and invalidations after admin payment/renew decisions.

Verified:
```text
GET /api/public/rooms returned success=True.
Admin login + GET /api/payment-submissions/review-queue returned success=True.
Backend and frontend commits pushed to main.
```

### M10-C reminder label cleanup

Implemented:
- Changed `Queue pengingat` to `Antrean pengingat` in `ReminderPreviewPage`.

Verified:
```text
Select-String confirmed `Antrean pengingat` exists.
Frontend npm run build PASS: 728 modules transformed.
Commit pushed; origin/main now at 3fa294c.
```

Carry-forward:
```text
Manual browser smoke owner/admin/staff/tenant/public remains required before M9 FULL PASS.
Next phase is V5.8 Public and Tenant Browser Smoke Gate inside the current frontend monolith.
```
<!-- KOST48_DOCS_SYNC_20260530_M10C_END -->


<!-- KOST48_DOCS_SYNC_20260530_M9_API_FLOW_BUILD_START -->
## 0.0 Latest Current State — M9 Read Smoke, Critical API Flow, and Build Gate PASS

```text
Latest verified local gate before commit:
- M9 read smoke PASS: 25 passed, 0 failed.
- Frontend build PASS: 727 modules transformed.
- Backend build:local PASS: clean + Prisma generate + TypeScript build completed.
- Generated Prisma restored after build; git status no longer lists backend/src/generated/prisma.
- M9 critical API flow PASS across public booking, payment, renew, checkout, deposit, inventory, and staff report.
- M9 FULL PASS is still not claimed because manual browser smoke across owner/admin/staff/tenant/public is still pending.
```

### M9 critical API flow evidence summary

| Flow | Result | Evidence |
|---|---|---|
| Public booking | PASS | Website booking created stay `21`, tenant `22`, room `4 / G2-004`, and portal account. |
| Admin booking approve | PASS | Approval created initial invoice `32` as `ISSUED`, room became `RESERVED`, and open invoice count became `1`. |
| Tenant payment proof | PASS | Tenant submitted payment proof `8` for rent + deposit amount `2,200,000`; review queue showed `PENDING_REVIEW`. |
| Admin payment approval | PASS | Payment proof `8` approved; invoice `32` became `PAID`, room became `OCCUPIED`, deposit became `PAID / HELD`. |
| Renew request | PASS | Renew request `4` created and approved with meter checkpoint. |
| Renewal invoice | PASS | Renewal invoice `34` created as `ISSUED` with rent, electricity, and water lines totaling `1,741,950`. |
| Open invoice checkout blocker | PASS | Tenant checkout request and direct final checkout were blocked while invoice `34` was open. |
| Renewal invoice payment | PASS | Payment proof `9` approved; invoice `34` became `PAID`, stay open invoice count returned to `0`. |
| Checkout request approval | PASS | Checkout request `4` approved; stay remained `ACTIVE`, proving approval is not final checkout. |
| Final checkout | PASS | Final checkout completed stay `21`, set room `4` to `AVAILABLE`, and kept deposit `HELD`. |
| Deposit settlement | PASS | Full refund processed; deposit became `REFUNDED`, ledger matched, accounting journal `JE-AUTO-DEPOSIT-SETTLEMENT-21` posted and balanced. |
| Inventory lifecycle | PASS | Item `4` moved through IN, ASSIGN_TO_ROOM, RETURN_FROM_ROOM; staff official movement was blocked with 403. |
| Staff field report | PASS | Staff field report `1` created ticket `5`, admin reviewed as `APPROVE`, no official stock movement was auto-created. |

### M9 read smoke and build gate

```text
Read smoke:
- backend reachable at localhost:3000.
- public rooms PASS.
- admin login PASS.
- main admin read surfaces PASS.
- staff login/read smoke PASS.
- owner/tenant default role smoke only warned because seed credentials were not present; warnings did not fail read-smoke.
- final label: M9_READ_SMOKE_PASS, Passed 25, Failed 0.

Build:
- frontend npm run build PASS.
- backend npm run build:local PASS.
- generated Prisma restored after build.
```

### Current honest label

```text
M9 READ SMOKE = PASS.
M9 CRITICAL API FLOW = PASS.
M9 BUILD GATE = PASS.
M9 FULL PASS = pending manual browser smoke.
No DB reset was used.
No schema change was introduced.
No production DB mutation was performed.
Generated smoke reports and generated command packs are local UAT artifacts and must not be committed.
```

### Immediate pre-commit cleanup

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; Remove-Item ".\m9-uat-read-smoke-report-*.json" -Force -ErrorAction SilentlyContinue; Remove-Item ".\m9c-critical-flow-command-pack-*.ps1" -Force -ErrorAction SilentlyContinue; Remove-Item ".\m9c-critical-flow-command-pack-report-*.json" -Force -ErrorAction SilentlyContinue; git restore backend/src/generated/prisma; git status -sb
```

### Next required gate before FULL PASS

```text
Manual browser smoke owner/admin/staff/tenant/public:
- no no-op CTA or link #,
- filters visually distinct from primary action,
- tenant copy avoids raw backend terms,
- deposit copy remains dana titipan/liability,
- tables readable on desktop/tablet/mobile,
- checkout request approval not final checkout,
- final checkout blocked by every open invoice including DRAFT,
- staff reports issues/restock needs, not official stock mutation.
```
<!-- KOST48_DOCS_SYNC_20260530_M9_API_FLOW_BUILD_END -->

## 2026-05-30 — M9 Read Smoke, Critical API Flow, and Build Gate Journal

Status:
```text
M9 read smoke PASS.
M9 critical API flow PASS.
Frontend build PASS.
Backend build:local PASS.
Generated Prisma restored.
Manual browser smoke still pending before FULL PASS.
```

### M9 tooling hardening

Implemented:
- Read smoke script now labels backend-not-running as environment readiness, not endpoint failure.
- Role login failures for missing owner/tenant default seed credentials are warnings unless strict mode is requested.
- Critical flow command pack was added as reusable UAT tooling.
- Command pack generation was corrected to avoid hardcoded candidate IDs and avoid the public booking `website` honeypot field.

### Runtime UAT performed

Verified:
- Public booking created stay `21` and portal access.
- Admin approval created invoice `32`.
- Tenant paid rent + deposit and admin approved proof `8`.
- Room moved to `OCCUPIED`; deposit moved to `PAID / HELD`.
- Tenant created renew request `4`; admin approved with meter checkpoint.
- Renewal invoice `34` included rent, electricity, and water.
- Checkout was blocked while invoice `34` was open.
- Renewal invoice was paid through proof `9`.
- Checkout request `4` was approved without completing the stay.
- Final checkout completed stay `21` and released room `4`.
- Deposit full refund posted ledger/accounting journal and reconciliation stayed `MATCH`.
- Inventory lifecycle moved item `4` through official admin movements; staff official movement blocked 403.
- Staff field report `1` was reviewed by admin without automatic official stock mutation.

### Build verification

Verified:
- `npm run build` frontend PASS.
- `npm run build:local` backend PASS.
- `git restore backend/src/generated/prisma` removed generated Prisma noise from git status.

Carry-forward:
```text
Manual browser smoke is still required before M9 FULL PASS.
Clean generated report/command-pack artifacts before commit.
Commit reusable tooling and docs separately.
```

<!-- KOST48_DOCS_SYNC_20260530_M9_0_START -->
## 0.0 Latest Current State — M9-0 Runtime Hotfix, Base Smoke Recovery, and Full Regression UAT Gate

```text
Latest pushed commits:
- ed85fb6 fix(runtime): guard deposit ledger and accounting readiness smoke
- 618ab15 docs: sync m8o to m8t command center verification
- fe72fba feat(command-center): harden ui actions finance inventory and lifecycle flows

Latest generated / applied tooling package:
- backend_20260530_M9_FULL_REGRESSION_UAT_TOOLING_FULL.zip
- frontend_20260530_M9_FULL_REGRESSION_UAT_TOOLING_UNCHANGED.zip

Current baseline:
- M8O–M8T code and docs are pushed.
- M9-0 runtime hotfix is pushed.
- M9 full regression UAT is not FULL PASS yet.
- M9 base smoke inline PASS after backend server was running.
```

### M9-0 runtime hotfix summary

| Area | Result | Evidence |
|---|---|---|
| Deposit ledger reconciliation-lite | PASS | `/api/deposit-ledger/reconciliation-lite` returned `success=True`, `ready=True`, `mismatchCount=0`. |
| Accounting readiness | PASS | `/api/accounting/readiness` returned `success=True`, `ready=True`, `score=100`. |
| Public rooms | PASS | `/api/public/rooms` returned `success=True`. |
| Payment review queue | PASS | `/api/payment-submissions/review-queue` returned `success=True`. |
| Backend build | PASS before smoke | `npm run build:local` completed with Prisma generate + TypeScript compile. |
| Git push | PASS | `ed85fb6` was pushed to `main`. |

### Important operational discovery

```text
Do not restore backend/src/generated/prisma before running local dev server if the dev server needs freshly generated Prisma types.
For local runtime/UAT:
1. npm run prisma:generate or npm run build:local may generate local Prisma client.
2. Start/restart backend.
3. Run smoke/UAT.
4. Only after UAT/build, restore generated Prisma before commit/push if schema/generator change is not approved.
```

### M9 UAT tooling note

```text
backend/scripts/m9-full-regression-read-smoke.ps1 was added as optional read-smoke tooling.
PowerShell execution policy may block unsigned scripts; use process-scope Bypass + Unblock-File if needed.
Failed JSON reports caused only by backend not reachable should be deleted and not committed.
Commit the script only if the team wants reusable M9 smoke tooling.
```

### Current honest label

```text
M8O–M8T = pushed.
M9-0 runtime hotfix = build/smoke PASS + pushed.
M9 base smoke inline = PASS for public rooms, payment review queue, deposit reconciliation, and accounting readiness.
M9 full regression = pending.
Manual browser smoke across all roles/pages = pending.
No DB reset was used.
No schema change was introduced.
Generated Prisma remains build/runtime artifact and must not be committed unless schema/generator scope is explicitly approved.
```

### Next recommended phase

```text
PLAN M9 Full Regression UAT + Production Readiness.
Goal:
- run read-smoke for all main role surfaces with backend actively running,
- run critical flow UAT: public booking, tenant payment proof, admin payment approval, renew, checkout, deposit, inventory/staff, owner finance,
- run manual browser smoke for owner/admin/staff/tenant/public,
- patch only bugs proven by M9 evidence,
- keep code/docs commits clean and exclude generated Prisma/report noise.
```
<!-- KOST48_DOCS_SYNC_20260530_M9_0_END -->


## 2026-05-30 — M9-0 Runtime Hotfix and Base Smoke Recovery Journal

Status:
```text
M8O–M8T code/docs pushed.
M9-0 runtime hotfix pushed as ed85fb6.
M9 base smoke recovered after backend was running.
M9 full regression still pending.
```

### Issue found after M8O–M8T push

Observed:
- `/api/deposit-ledger/reconciliation-lite` returned 500 because runtime Prisma rejected `Stay.include.depositLedgerEntries`.
- `/api/accounting/readiness` returned 500 because readiness attempted `.count()` on an undefined Prisma delegate.

Root cause:
```text
Runtime Prisma client/schema/code contract was fragile around generated delegate/relation availability.
```

### M9-0 patch

Implemented:
- Deposit ledger reconciliation now queries ledger entries separately instead of relying on a fragile relation include on Stay.
- Accounting readiness now guards Prisma delegates and returns controlled readiness guidance instead of crashing.
- Backend-only patch.
- No schema change.
- No DB reset.
- No generated Prisma commit.

Verified:
```text
Backend build:local PASS.
Public rooms PASS.
Payment review queue PASS.
Deposit ledger reconciliation-lite PASS with ready=True and mismatchCount=0.
Accounting readiness PASS with ready=True and score=100.
Hotfix pushed to main as ed85fb6.
```

### UAT tooling note

Implemented:
- Optional `backend/scripts/m9-full-regression-read-smoke.ps1` read-smoke helper.

Observed:
- Script failure reports were caused by backend not reachable, not by endpoint bugs.
- PowerShell may block unsigned ps1 scripts; use process-scope bypass only for the current terminal session if needed.

Carry-forward:
```text
Delete failed report JSON files caused by unreachable backend.
Commit the UAT script only if reusable tooling is desired.
Continue to M9 full role/flow/browser regression.
```

<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_START -->
## 0.0 Latest Current State — M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate Sync

```text
Latest generated working packages:
- backend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- frontend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- backend_20260530_M8P1_UI_SMOKE_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P1_UI_SMOKE_HOTFIX_FULL.zip
- backend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_FULL.zip
- backend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- frontend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- backend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- frontend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- backend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- frontend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- backend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_UNCHANGED.zip
- frontend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_FULL.zip

Docs sync status:
- This docs sync supersedes older M8L–M8N active sections.
- Older M8L–M8N/M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8N

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8O | Global UI action/responsive + backend integrity cleanup | FULL | Frontend build PASS, backend build PASS, base API smoke PASS from user local logs |
| M8P.1 | UI smoke hotfix: responsive table auto-label + tenant copy cleanup | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8P.2 | Responsive/copy/action cleanup with safer labels and enum mapping | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8Q | Business-flow hardening for checkout request, invoice/payment refresh | FULL | Build covered by later cumulative builds; checkout/invoice/payment read smoke covered in M8R/M8T gates |
| M8R | Renew + checkout + deposit deep UAT hardening | FULL | Build PASS and renew/checkout/invoice/deposit read smoke PASS |
| M8S | Inventory + staff ops full UAT hardening | FULL | Inventory lifecycle API UAT PASS; staff official movement blocked 403 PASS; staff warehouse UI direction PASS from screenshot |
| M8T | Owner Finance Cockpit + production readiness gate | Backend UNCHANGED | Finance read smoke PASS; accounting readiness PASS; frontend build PASS; backend build PASS after cumulative backend patches |

### Latest verified UAT evidence

```text
M8O base smoke:
- GET /api/public/rooms PASS.
- Admin login PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/inventory-items, /inventory-movements, /room-items PASS.

M8R read smoke:
- GET /api/stays?limit=20 PASS.
- GET /api/invoices?limit=20 PASS.
- GET /api/admin/checkout-requests?status=APPROVED PASS.
- GET /api/admin/renew-requests?status=PENDING PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.

M8S inventory lifecycle API UAT:
- InventoryItem id=4 / UAT-M8S-KURSI-045732 created with qtyOnHand 10.
- Opening stock created official IN movement qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- RETURN_FROM_ROOM qty 999 blocked with HTTP 409.
- OUT qty 1 reduced qtyOnHand to 8.
- Final positionSummary returned: Gudang (8) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.

M8T finance/production gate:
- GET /api/invoices?limit=20 PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.
- GET /api/accounting/readiness PASS with ready=True and score=100.
- GET /api/assets?limit=20 PASS.
- GET /api/expenses?limit=20 PASS.
- Frontend build PASS: 727 modules transformed.
- Backend build:local PASS and final read smoke PASS.
```

### Current honest label

```text
M8O–M8T = build-confirmed and read/API-smoked for the tested surfaces.
M8S inventory stock lifecycle API UAT = PASS.
M8T owner finance production gate = frontend build PASS + backend build PASS + finance/read smoke PASS.
Manual browser smoke for every role/page is still not a complete FULL regression.
Generated Prisma noise appears after backend build and must be restored before code commit.
No DB reset was used.
No schema change was introduced in M8O–M8T.
```

### Immediate pre-commit gate

```text
1. Restore generated Prisma noise:
   git restore backend/src/generated/prisma
2. Confirm git status no generated Prisma files.
3. Commit code changes first.
4. Commit docs changes separately.
5. Push only after clean git status and no accidental generated Prisma commit.
```

### Next recommended phase

```text
PLAN M9 Full Regression UAT + Production Readiness.
Goal:
- smoke all main role surfaces after M8O–M8T,
- verify public booking, tenant portal, admin payment, renew, checkout, deposit, inventory, staff, owner finance,
- manually check responsive and action integrity,
- then commit/push after code/docs split.
```
<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_END -->

## 2026-05-30 — M8O–M8T Command Center Verification, Lifecycle, Inventory, Staff Ops, and Owner Finance Gate Journal

Status:
```text
Generated packages:
- M8O global UI/action/responsive/integrity FULL backend/frontend
- M8P.1 UI smoke hotfix frontend FULL + backend unchanged
- M8P.2 responsive/copy/action hotfix frontend FULL + backend unchanged
- M8Q business-flow hardening FULL backend/frontend
- M8R renew/checkout/deposit deep UAT FULL backend/frontend
- M8S inventory/staff ops full UAT FULL backend/frontend
- M8T owner finance production gate frontend FULL + backend unchanged
```

### M8O — Global UI Action/Responsive + Integrity Cleanup

Implemented:
- Fixed frontend build blocker in ResourceTable.
- Hardened payment proof action so missing proof does not open `#`.
- Added/strengthened responsive table labels.
- Improved tenant/public copy and status labels.
- Added backend integrity cleanup around invoice journal consistency and Jakarta date normalization.
- Strengthened query invalidation after check-in, booking approval, renew, invoices, and payment review.

Verified:
```text
Frontend build PASS from user local report.
Backend build PASS from user local report.
Base API smoke PASS:
- public rooms,
- admin login,
- payment review queue,
- inventory items,
- inventory movements,
- room items.
```

### M8P.1 / M8P.2 — UI Smoke Hotfixes

Implemented:
- Global responsive table auto-label utility.
- Tenant copy cleanup: Panduan Kos Saya and status pemesanan.
- Human labels for booking source / raw enum sources.
- StatusBadge accessibility metadata.
- Safer responsive table observer behavior.

Verification:
```text
Included in later cumulative frontend build PASS.
Manual full UI regression remains pending for every page.
```

### M8Q — Business Flow Hardening

Implemented:
- Checkout request approve/reject service-level role guard.
- Conditional PENDING update for checkout request decisions.
- Planned checkout date sync when request approved.
- Final checkout modal prefill from approved checkout request.
- Stronger invoice/payment/dashboard/portal invalidations.

Verification:
```text
Build covered by later cumulative builds.
Checkout/invoice/payment read smoke covered through M8R/M8T.
```

### M8R — Renew + Checkout + Deposit Deep UAT

Implemented:
- Final checkout Jakarta business-date normalization.
- Final checkout date-before-check-in guard.
- Conditional ACTIVE update to reduce double processing.
- Deposit settlement transaction and conditional HELD update.
- Deposit notes required for partial deduction/forfeit.
- Frontend final checkout and deposit confirmation checklists.
- Deposit ledger/accounting metadata returned from settlement.

Verified:
```text
Build PASS from user local report.
Read smoke PASS:
- stays,
- invoices,
- approved checkout requests,
- admin renew requests,
- deposit ledger summary,
- deposit ledger reconciliation-lite ready=True mismatchCount=0.
```

### M8S — Inventory + Staff Ops Full UAT

Implemented:
- Official InventoryMovement PATCH blocked.
- RETURN_FROM_ROOM locks/validates RoomItem.
- Inventory item response returns position/location summary after create/update.
- Mutasi stok form validates qty, room context, and date.
- After movement, frontend invalidates movements/items/room-items/rooms/reference data.
- Staff warehouse copy states staff reports physical issues/restock needs; stock status is system-calculated.

Verified:
```text
Inventory read smoke PASS:
- inventory items,
- inventory movements,
- room items,
- rooms.

Inventory lifecycle API UAT PASS:
- Item id=4 / UAT-M8S-KURSI-045732 created with Gudang (10).
- Opening IN movement qty 10 created.
- ASSIGN_TO_ROOM qty 2 -> Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 -> Gudang (9) · G2-001 (1).
- RETURN_FROM_ROOM qty 999 blocked HTTP 409.
- OUT qty 1 -> Gudang (8) · G2-001 (1).
- Staff official movement blocked HTTP 403.

Manual UI direction:
- Staff warehouse screenshot confirms staff is guided to report physical/restock issues, not choose habis/menipis manually.
```

### M8T — Owner Finance Cockpit + Production Gate

Implemented:
- Owner dashboard finance production gate.
- Accounting readiness and asset readiness fetched on dashboard.
- Deposit ledger copy reinforces deposit as dana titipan/liability.
- Gate cards link to accounting setup, assets, payment review, and invoices.
- Responsive owner gate CSS added.

Verified:
```text
Finance read smoke PASS:
- invoices,
- payment review queue,
- deposit ledger summary,
- deposit ledger reconciliation-lite ready=True mismatchCount=0,
- accounting readiness ready=True score=100,
- assets,
- expenses.

Frontend build PASS:
- 727 modules transformed.

Backend build:local PASS after cumulative backend patches.
Final read smoke PASS:
- public rooms,
- invoices,
- inventory items,
- deposit ledger reconciliation-lite.
```

Carry-forward:
```text
Generated Prisma noise appears after backend build and must be restored before code commit.
Manual full browser regression across all roles is still recommended before production labeling.
Next phase: M9 Full Regression UAT + Production Readiness.
```

<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_START -->
## 0.0 Latest Current State — M8L–M8N Critical Integrity, Inventory Automation, and Action Integrity Sync

```text
Latest generated working packages:
- backend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- frontend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- backend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- frontend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- backend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_UNCHANGED.zip
- frontend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_FULL.zip
- backend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_UNCHANGED.zip
- frontend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_FULL.zip
- backend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_UNCHANGED.zip
- frontend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_FULL.zip

Docs sync status:
- This docs sync supersedes older M8G–M8K active sections.
- Older M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8K

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8L-Critical | Payment/invoice/accounting integrity hotfix + inventory safety belt | FULL | ZIP generated; backend/frontend patch package created; local build still must be confirmed after apply |
| M8L-Stock Hotfix 1 | Stock reference refresh + opening stock movement | FULL | Corrected dropdown/reference refresh and opening IN movement behavior; superseded by Stock Hotfix 2 |
| M8L-Stock Hotfix 2 | Stock position, fallback qty sync, and room flow | FULL | Targeted backend smoke PASS; manual inventory UI smoke PASS from user screenshots/logs |
| M8L-Auto Inventory | Automate stock movement flows and reduce manual room item entry | FULL | RETURN_FROM_ROOM API smoke PASS; manual UI smoke PASS from user screenshots/logs |
| M8L-Responsive | Responsive tables/lists across command center | Backend UNCHANGED | Frontend package generated; local frontend build/manual PC-tablet-mobile smoke still required |
| M8M | Global IA simplification: remove global search, separate menu/filter | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |
| M8N | Global Action Integrity: no misleading/no-op buttons | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |

### Latest verified UAT evidence

```text
M8L Stock Position + Room Flow:
- InventoryItem id=3 / UAT-M8L-MEJA-03 created with qtyOnHand 10.
- Opening stock created official InventoryMovement IN qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created/updated RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 from roomId=1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.
- Short movement note returned 400.

M8L manual UI smoke from user screenshots:
- Stock Gudang shows quick actions Pasang / Keluar / Edit.
- Mutasi Stok quick-action prefill works for Pasang ke Kamar and Kembali dari Kamar.
- Confirmation modal shows official stock mutation warning and effect.
- Barang di Kamar is read/condition oriented and links to room detail.
- Room detail shows inventory tab with assigned item.

M8N user feedback:
- Any visible button/menu must have a real purpose.
- Menu, filter, CTA, and status badge must be visually and functionally separated.
- No global search in header unless a page-specific search is genuinely needed.
```

### Current honest label

```text
M8L inventory backend targeted smoke + manual UI smoke = PASS for tested stock sync/position/room flows.
M8L critical payment/invoice/accounting hotfix package = generated, but full local build/runtime smoke still required before PASS label.
M8L responsive, M8M IA simplification, and M8N action-integrity packages = generated, but final local frontend build + manual UI smoke still required.
No DB reset was used.
No schema change was introduced in these packages.
Generated Prisma noise must be restored before commit if build regenerates it.
```

### Next recommended phase

```text
PLAN M8O Verification Gate + UI Action Sweep.
Goal:
- run local frontend build after M8N,
- run backend build if latest backend M8L patches are applied,
- smoke critical API paths,
- manually check owner/admin/staff/tenant/public pages for misleading buttons, mobile table behavior, and menu/filter separation,
- then commit/push M8L–M8N only after clean git status.
```
<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_END -->

## 2026-05-29 — M8L–M8N Critical Integrity, Inventory Automation, Responsive UI, and Action Integrity Journal

Status:
```text
Generated packages:
- M8L critical + inventory safety FULL backend/frontend
- M8L stock reference/opening movement hotfix FULL backend/frontend
- M8L stock position/room flow hotfix FULL backend/frontend
- M8L auto inventory flow FULL backend/frontend
- M8L responsive tables frontend FULL + backend unchanged
- M8M global IA simplification frontend FULL + backend unchanged
- M8N global action integrity frontend FULL + backend unchanged
```

### M8L-Critical — Payment/Invoice/Accounting Integrity

Implemented:
- Tenant current stay response enriched with invoice metadata.
- Payment approval locking hardened around payment/stay/room/invoice state.
- Initial check-in invoice total persistence patched.
- AutoOps booking-expiry invoice cancellation path hardened toward accounting-safe behavior.
- Deposit FORFEIT zero-deposit guard added.
- Invoice query invalidation improved.
- DRAFT included in open invoice UI where it blocks checkout/renew.

Verification:
```text
Package generated.
Full local build/runtime smoke still required before PASS label.
```

### M8L — Inventory Movement Safety + Automation

Implemented:
- Movement note minimum added for official stock mutation.
- Staff forbidden from official stock movement remains enforced.
- Direct stock quantity edit is blocked.
- Creating item with initial stock creates official IN movement.
- Backend fallback sync updates qtyOnHand after movement.
- ASSIGN_TO_ROOM syncs gudang stock and RoomItem.
- RETURN_FROM_ROOM validates room stock then syncs gudang and RoomItem.
- Inventory item response includes `positionSummary` / `locationSummary`.
- Stock Gudang list exposes positions and action-first Pasang/Keluar controls.
- Barang di Kamar is de-emphasized as manual create route and becomes read/condition surface.

Verified by user logs/screenshots:
```text
InventoryItem id=3 / UAT-M8L-MEJA-03:
- Created with qtyOnHand 10.
- IN movement qty 10 created.
- ASSIGN_TO_ROOM qty 2 to roomId=1 created movement id=3 and RoomItem qty 2.
- qtyOnHand became 8.
- positionSummary became Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 created movement id=4.
- qtyOnHand became 9.
- RoomItem qty became 1.
- positionSummary became Gudang (9) · G2-001 (1).
```

### M8L Responsive Tables

Implemented:
- Global responsive table/list behavior for resource-heavy pages.
- PC keeps table style; mobile/tablet aims to reduce forced sideways overflow.

Verification:
```text
Package generated.
Manual PC/tablet/mobile smoke still required after apply.
```

### M8M Global IA Simplification

Implemented:
- Global header search removed.
- Menu and filter patterns separated.
- Decorative helper copy reduced.
- Stays/Tenant and resource pages simplified.

Verification:
```text
Package generated.
Frontend build/manual UI smoke still required.
```

### M8N Global Action Integrity

Implemented:
- Misleading/no-op buttons cleaned.
- Filter-only controls styled/labeled as filters.
- Menu controls reduced to real navigation/work-area switching.
- Empty states made more section-aware.
- Inventory movement enum labels made user-facing.

Verification:
```text
Package generated.
Frontend build/manual UI smoke still required before PASS.
```

Changed UAT data:
```text
InventoryItem id=3 / UAT-M8L-MEJA-03.
InventoryMovement id=2 / IN qty 10.
InventoryMovement id=3 / ASSIGN_TO_ROOM qty 2 to roomId=1.
InventoryMovement id=4 / RETURN_FROM_ROOM qty 1 from roomId=1.
RoomItem id=1 / roomId=1 itemId=3 qty 1 after return smoke.
```

Carry-forward:
```text
Run frontend build after M8N.
Run backend build if applying latest M8L backend patches.
Restore generated Prisma noise before commit.
Manual UI smoke owner/admin/staff/tenant/public for action integrity.
M8H/M8I booking/waiting-room runtime/manual smoke remains outstanding.
```

<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_START -->
## 0.0 Latest Current State — M8G–M8K Command Center Safety Belts Sync

```text
Latest local code commit:
5c4526f feat(command-center): harden accounting booking checkout and staff safety belts

Docs sync status:
- Code commit 5c4526f sudah dibuat lokal.
- Docs sync ini harus dicommit terpisah sebelum push GitHub.
- Older M4A/M8F/V5.29 sections below remain historical record.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8G | Accounting Manual Payment Posting + Deposit Status Fix | FULL | Backend build PASS; manual payment journal smoke PASS; update/delete journaled payment blocked; deposit PARTIAL_REFUND status code patched but targeted runtime smoke still recommended |
| M8H | Admin Booking Review Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; reject endpoint added; targeted booking runtime smoke still recommended before FULL label |
| M8I | Tenant Booking / Waiting Room Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; cancelled booking visibility patched; tenant booking runtime smoke still recommended |
| M8J | Admin Checkout Request Review Safety Belt | FULL | Backend build PASS; pending list PASS; short reject note blocked; valid reject PASS; valid approve PASS; already-processed approve blocked |
| M8K | Staff Report / Admin Confirmation Safety Belt | FULL | Backend build PASS; ticket list PASS; field report queue PASS; short final note blocked; valid ticket close PASS |

### Current honest label

```text
M8G–M8K = build-confirmed and core runtime-smoked for accounting, checkout, and ticket close paths.
M8H/M8I booking/waiting-room still need targeted runtime/manual UI smoke before FULL business-flow PASS.
Manual browser UI smoke for M8J/M8K is still not confirmed.
Generated Prisma noise was restored before code commit.
No DB reset was used.
```

### Latest important UAT evidence

```text
M8G:
- Manual InvoicePayment id=6 created JournalEntry JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE of journaled payment id=6 returned 409 and blocked silent accounting divergence.

M8J:
- Checkout request id=3 short reject note returned 400.
- Checkout request id=3 valid reject returned REJECTED.
- Checkout request id=2 valid approve returned APPROVED.
- Approving already processed request returned 409.

M8K:
- Ticket id=3 short finalAdminNote returned 400.
- Ticket id=3 valid finalAdminNote closed ticket TIC-UAT-0003.
- Backend build: npm run build:local PASS.
```

### Next recommended phase

```text
PLAN M8L Inventory Movement Safety Belt.
Goal:
- official stock movement must not be direct-click or staff-owned,
- staff may report need/condition only,
- admin/owner confirms official InventoryMovement,
- no schema change unless real guard/data gap is proven.
```
<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_END -->

## 2026-05-29 — M8G–M8K Command Center Safety Belts Journal

Status:
```text
Code commit local:
5c4526f feat(command-center): harden accounting booking checkout and staff safety belts

Docs sync:
This docs sync must be committed separately before GitHub push.
```

### M8G — Accounting Manual Payment Posting + Deposit Status Fix

Implemented:
- `InvoicePaymentsModule` imports accounting module.
- Manual `InvoicePaymentsService.create()` posts `INVOICE_PAYMENT` journal through accounting posting service.
- Journaled payment update/delete is blocked with 409.
- `processDeposit()` partial refund now targets `PARTIALLY_REFUNDED`.
- Deposit status SQL constraint updated through bootstrap/migration.
- AccountingSchemaGuard no longer exposes hardcoded local path.

Verified:
```text
Backend build PASS from user local report.
Accounting readiness PASS.
Manual InvoicePayment id=6 created source journal found=true.
Journal number: JE-AUTO-INVOICE-PAYMENT-6.
PATCH/DELETE payment id=6 blocked with 409.
```

Known note:
```text
Deposit PARTIAL_REFUND status should still receive targeted runtime smoke if exact candidate data is available.
```

### M8H — Admin Booking Review Safety Belt

Implemented:
- Approve booking uses review checklist modal.
- Reject booking modal added with meaningful reason.
- Backend admin reject booking endpoint added.
- Reject booking blocks unsafe states with invoice/payment submission.
- Room release after rejection respects other active booking candidates.

Verification:
```text
Frontend build PASS from package work.
Backend build later PASS after combined M8G–M8K local build.
Targeted admin booking runtime smoke still recommended before FULL business-flow label.
```

### M8I — Tenant Booking / Waiting Room Safety Belt

Implemented:
- `/tenant/bookings/my` includes cancelled website booking visibility.
- Tenant booking card shows rejection/cancel reason and next action.
- Waiting-room copy shortened.
- Tenant booking copy avoids raw enum/backend jargon.

Verification:
```text
Frontend build PASS from package work.
Backend build later PASS after combined M8G–M8K local build.
Tenant booking runtime/manual UI smoke still recommended.
```

### M8J — Admin Checkout Request Review Safety Belt

Implemented:
- Approve checkout request modal added.
- Approval copy clarifies it is not final checkout.
- Reject checkout reason minimum 8 characters enforced in frontend and backend DTO.

Verified:
```text
Pending checkout request list PASS.
Request id=3 short reject note returned 400.
Request id=3 valid reject returned REJECTED.
Request id=2 valid approve returned APPROVED.
Approving already processed request returned 409.
Backend build PASS from user local report.
```

### M8K — Staff Report / Admin Confirmation Safety Belt

Implemented:
- Staff copy changed toward field evidence / proof submission.
- Admin close ticket uses final confirmation checklist.
- Ticket close requires final admin note minimum 8 characters.
- Staff field report review requires admin note minimum 8 characters.
- Backend validates meaningful admin notes.

Verified:
```text
Ticket list PASS.
Staff field report review queue PASS.
Ticket id=3 short finalAdminNote returned 400.
Ticket id=3 valid finalAdminNote closed TIC-UAT-0003.
Backend build PASS from user local report.
```

Changed UAT data:
```text
InvoicePayment id=6 created and journaled.
CheckoutRequest id=3 rejected.
CheckoutRequest id=2 approved.
Ticket TIC-UAT-0003 / id=3 closed with finalAdminNote "UAT close final admin".
```

Carry-forward:
```text
Manual browser UI smoke still recommended for M8H–M8K.
M8L Inventory Movement Safety Belt is next recommended phase.
```

<!-- KOST48_DOCS_SYNC_20260528_M8F_START -->
## 0.0 Latest Current State — M8F Frontend Command Center Safety Belt Sync

```text
Latest generated working package:
- frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
- backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip

Latest pushed backend/source-of-truth commit still referenced by prior docs:
- 1b645de feat(deposit): add tenant deposit ledger foundation

Important status label:
- M7A–M8F are frontend-first package builds, not FULL runtime PASS.
- Frontend build PASS was verified for each batch in container.
- Backend was unchanged for M7A–M8F.
- Runtime/API smoke and manual browser UI smoke are deferred.
- Do not claim FULL PASS until local runtime/API smoke + manual UI smoke pass.
```

### Completed package sequence after M4A

| Batch | Focus | Backend | Verification |
|---|---|---|---|
| M7A | Tenant Portal Action Center Hardening | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8A | Checkout Closure + Deposit Settlement Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8B | Public Room Discovery + Booking Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8C | Payment Review Decision Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8D | Indonesian Readability + CTA Dedup Sweep | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8E | Renew Approval Safety Belt + Ringkas Copy | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8F | Invoice Issue/Cancel + Manual Payment Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |

### Latest product position

```text
KOST48 V5 Command Center now has safety-belt UI coverage across the main business flows:
- Tenant action center and payment proof UX.
- Public booking discovery with first-paid-room-priority copy.
- Admin payment review decision safety.
- Renew approval safety.
- Checkout/deposit settlement safety.
- Invoice issue/cancel/manual payment safety.
- Indonesian readability and CTA dedup rules.
```

### New UX rule locked from user feedback

```text
Orang Indonesia sangat tidak suka baca.
UI KOST48 must be concise, action-first, and not repeat the same explanation.
Repeated links/CTAs in one page should be limited to 1–2 maximum for the same destination/action.
```

Practical rule:
- Card/alert title: 3–7 words.
- Body: 1–2 short lines maximum.
- One primary CTA per block.
- Assistant/priority board should show the top 3 priorities by default.
- Avoid repeating the same warning across banner, card, modal, and footer.
- Use badges, numbers, and clear action labels instead of paragraphs.

### Current honest label

```text
M8F Frontend Command Center Safety Belt Sync = build-verified frontend package set.
Backend = unchanged after M4A for these M7A–M8F frontend safety batches.
Runtime/API smoke = deferred.
Manual UI smoke = deferred.
FULL PASS = not claimed.
```

### Next recommended phase

```text
PLAN M8G Admin Booking Review Safety Belt.
Focus:
- Admin booking review queue safety.
- Booking approval/reject confirmation.
- First-paid room priority explanation for admin.
- Avoid over-reserving rooms from booking-only interest.
- Keep backend unchanged unless missing data is proven.

After M8G, start M9 Targeted Runtime/UI Smoke to validate M7A–M8G locally.
```

### Source-of-truth note

```text
This M8F docs sync supersedes the older M4A-only current-state sections above/below.
Older M4A/V5.29 sections remain as historical record.
For coding, inspect the latest real ZIP/repo first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M8F_END -->

## 2026-05-28 — M7A–M8F Frontend Safety Belt Journal

Status:
```text
Generated packages through latest batch:
- frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
- backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip

Verification:
- Frontend build PASS for each M7A–M8F package.
- Backend unchanged for M7A–M8F.
- Runtime/API smoke deferred.
- Manual UI smoke deferred.
- FULL PASS not claimed.
```

### M7A — Tenant Portal Action Center Hardening

Added/changed:
- Tenant invoice detail proof upload aligned to image-only JPG/PNG/WebP and 2MB.
- Shared `tenantPaymentProof` utility.
- Tenant My Stay action center strengthened with ticket/request/payment context.
- Tenant copy cleaned from technical words and long repeated helpers.

### M8A — Checkout Closure + Deposit Settlement Safety Belt

Added/changed:
- `CompleteStayModal` shows final checkout readiness and reminders.
- `ProcessDepositModal` uses human labels instead of raw enum.
- Deposit math is clearer: initial deposit, deduction, refund, processed total.
- Deposit deduction/forfeit requires meaningful note.

### M8B — Public Room Discovery + Booking Safety Belt

Added/changed:
- Public room status labels: `Bisa diajukan`, `Ada minat aktif`, `Penuh`.
- Public booking flow explains first-paid priority.
- Guest booking form and success page use action-first copy.
- Room comparison includes more useful booking/initial cost signals.

### M8C — Payment Review Decision Safety Belt

Added/changed:
- `ReviewPaymentModal` adds risk labels and checklist for risky approvals.
- Missing proof blocks normal approve in UI.
- Reject reason minimum 8 characters.
- Payment review table shows risk signal.
- Deposit payment copy says dana titipan, not omzet.

### M8D — Indonesian Readability + CTA Dedup Sweep

Added/changed:
- New readability/dedup utilities.
- TenantPriorityBoard defaults to max 3 priority items.
- Repeated links/actions are reduced.
- Public/tenant/admin copy shortened.
- Core UX rule locked: Indonesian users dislike long reading.

### M8E — Renew Approval Safety Belt + Ringkas Copy

Added/changed:
- Admin renew queue has compact risk badges.
- Approve renew requires meter/time/date safety checks.
- Medium/high-risk renew approval requires confirmation checklist.
- Reject renew requires minimum 8-character reason.
- Raw term enum mapped to human labels.

### M8F — Invoice Issue/Cancel + Manual Payment Safety Belt

Added/changed:
- Invoice issue goes through short checklist modal.
- Invoice cancel requires reason minimum 8 characters.
- Create invoice validates item/qty/price/period/due date before submit.
- Manual payment copy clarifies it is admin record, not tenant upload proof.
- Partial manual payment requires note.

Known notes:
```text
These batches are UI safety/readability packages.
They do not replace backend guards.
Local runtime/API smoke and manual browser checks are still needed before PASS labeling.
```


<!-- KOST48_DOCS_SYNC_20260528_M4A_START -->
## 0.0 Latest Current State — M4A Deposit Ledger Backend Foundation FULL PASS

```text
Current latest pushed code commit:
1b645de feat(deposit): add tenant deposit ledger foundation

Previous important pushed commits:
9d66c79 docs: sync m3.2 full first-paid runtime uat
296bd8d fix(autoops): harden runtime control panel
dc052a1 feat(tenant): ship my stay guide and autoops control ux
7c8c8e7 feat(accounting): add controlled monthly auto close governance
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
```

### Release status

```text
M3.2 Deep First-Paid Runtime UAT = FULL PASS.
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
M4A frontend = unchanged.
Next recommended phase = PLAN M4B Frontend Deposit Timeline.
```

### M3.2 final runtime lock

```text
BR1 Expired unpaid booking auto-cancel = PASS.
BR2 Pending proof must not auto-cancel = PASS.
BR3 Rejected proof after deadline auto-cancel = PASS.
BR4 Orphan RESERVED room auto-release = PASS.
BR5 Pure first-paid-wins competitor-unpaid scenario = PASS.
BR6 AutoOps must not approve payment = PASS.
BR7 AutoOps must not approve renew = PASS.
BR8 AutoOps must not final checkout = PASS.
BR9 AutoOps must not refund/deduct deposit = PASS.
```

BR5 pure runtime evidence:
```text
Stay A winner id=18 remained ACTIVE.
Payment submission A id=6 became APPROVED.
Invoice A id=30 became PAID.
Room G2-004 became OCCUPIED with activeStayId=18.
Competing unpaid Stay B id=19 became CANCELLED.
Room did not move to unpaid booking.
Cleanup returned Room G2-004 to AVAILABLE with activeStayId=null and currentStay=null.
```

### M4A runtime UAT result

| Area | Result | Evidence summary |
|---|---|---|
| Schema/table application | PASS | `TenantDepositLedgerEntry` table created via additive `prisma db push`, no DB reset. |
| Backend build | PASS | User local build reported successful before commit/push. |
| Summary endpoint | PASS | `GET /api/deposit-ledger/summary` returned basis `M4_DEPOSIT_LEDGER_SUMMARY`. |
| Reconciliation-lite endpoint | PASS | `GET /api/deposit-ledger/reconciliation-lite` returned `ready=true`, `mismatchCount=0`. |
| Backfill dry-run | PASS | `POST /api/deposit-ledger/backfill/dry-run` returned `dryRun=true` and did not mutate historical data. |
| Payment approval hook | PASS | Approved booking payment created `PAYMENT_RECEIVED` ledger entry for deposit amount. |
| Deposit settlement hook | PASS | Full refund settlement created `REFUND` ledger entry and reduced ledger held balance to zero. |
| Cleanup | PASS | Test stay/payment/invoice/ledger entries removed; Room G2-005 returned AVAILABLE. |
| Frontend | UNCHANGED | M4A was backend-first only. |

### M4A verified behavior

```text
Created runtime UAT IDs:
- Stay test: 20
- Tenant test: 21
- Room: 5 / G2-005
- Invoice: 31
- PaymentSubmission: 7
- InvoicePayment: 5
- TenantDepositLedgerEntry: 1 PAYMENT_RECEIVED, 2 REFUND

Payment hook:
- PAYMENT_RECEIVED
- direction=INCREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=500000
- sourceType=PAYMENT_SUBMISSION
- sourceId=7

Settlement hook:
- REFUND
- direction=DECREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=0
- sourceType=STAY_DEPOSIT_SETTLEMENT
- sourceId=20:REFUND

After cleanup:
- Room G2-005 status=AVAILABLE
- activeStayId=null
- currentStay=null
- deposit-ledger summary increaseRupiah=0
- deposit-ledger summary decreaseRupiah=0
- recentEntries=[]
```

### M4A implementation summary

```text
Added backend module:
- src/modules/deposit-ledger/deposit-ledger.module.ts
- src/modules/deposit-ledger/deposit-ledger.controller.ts
- src/modules/deposit-ledger/deposit-ledger.service.ts
- src/modules/deposit-ledger/dto/deposit-ledger-query.dto.ts

Modified backend:
- prisma/schema.prisma
- src/app.module.ts
- src/common/enums/app.enums.ts
- src/modules/payment-submissions/payment-submissions.module.ts
- src/modules/payment-submissions/payment-submissions.service.ts
- src/modules/stays/stays.module.ts
- src/modules/stays/stays.service.ts
```

### Current honest label

```text
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
Do not claim M4B until frontend surfaces are implemented and manually/UI smoked.
```

### Next recommended step

```text
PLAN M4B Frontend Deposit Timeline.
Focus:
- Admin Stay Detail / Finance tab deposit summary + timeline.
- Tenant My Stay deposit card with tenant-friendly microcopy.
- Owner/Finance deposit ledger drilldown.
- No backend mutation unless a missing read shape is proven.
```

### Source-of-truth note

```text
This section supersedes the older M3.2-only and V5.29-K current-state sections below.
Older sections remain as historical record.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M4A_END -->



## 2026-05-28 — M4A Deposit Ledger Backend Foundation Journal

Status:
```text
Commit pushed:
1b645de feat(deposit): add tenant deposit ledger foundation

Verified:
- Backend build PASS from user local report.
- Runtime endpoint smoke PASS.
- Payment approval hook PASS.
- Deposit settlement/refund hook PASS.
- Cleanup PASS.
- Frontend unchanged.
```

Implementation:
- Added `TenantDepositLedgerEntry` schema and supporting enums.
- Added `DepositLedgerModule`.
- Added read endpoints for stay, tenant, summary, reconciliation-lite, and backfill dry-run.
- Hooked deposit ledger entry creation into payment approval flow.
- Hooked deposit ledger entry creation into deposit settlement flow.
- Kept backfill as dry-run only.

Runtime UAT:
```text
GET /api/deposit-ledger/summary PASS.
GET /api/deposit-ledger/reconciliation-lite PASS.
POST /api/deposit-ledger/backfill/dry-run PASS.

Fresh deposit payment test:
- Stay 20 / Room G2-005 / PaymentSubmission 7.
- Payment approval created PAYMENT_RECEIVED entry amount 500000.
- Summary showed increaseRupiah 500000 and held balance 500000.

Settlement test:
- Stay 20 cancelled for UAT cleanup path.
- FULL_REFUND created REFUND entry amount 500000.
- Summary showed increaseRupiah 500000, decreaseRupiah 500000, held balance 0.
```

Cleanup:
```text
Deleted test ledger entries 1 and 2.
Deleted test payment submission 7.
Deleted test invoice 31 and invoice payment 5.
Deleted test stay 20 and tenant 21.
Room G2-005 returned AVAILABLE with activeStayId=null and currentStay=null.
Deposit ledger summary returned empty again.
```

Known notes:
- Historical deposit data may show as backfill candidates.
- Backfill remains dry-run only until a separate reviewed write plan is approved.
- M4A does not include frontend timeline UI.

Next journal target:
```text
PLAN M4B Frontend Deposit Timeline
```


## 0.0 Latest Current State — V5.29-K Controlled Monthly Auto-Close Governance PASS + Pushed

```text
Current latest pushed commit:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Previous latest pushed commits:
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
51eba86 feat(accounting): add statement command center finance cockpit
286e512 fix(accounting): block manual edits in closed period governance

Release status:
- V5.29-H/I/J accounting invoice lifecycle and period governance were verified before K.
- V5.29-K Controlled Monthly Auto-Close Governance is built, UAT-smoked, committed, and pushed.
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked with 403 PASS.
- Owner close without reason blocked with 400 PASS.
- Generated Prisma was restored and was not committed.
- Commit 7c8c8e7 is pushed to origin/main.

V5.29-K verified behavior:
- Auto-close policy basis is PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K.
- Mode is AUTO_MONTHLY_PREVIOUS_PERIOD.
- Auto-close targets only the previous month, not the current month.
- Target period must already exist and must be OPEN.
- Period close readiness must return canPost=true.
- Closing preview must be balanced before posting.
- If blocker exists or target period is missing, system skips safely and does not force close.
- Owner can manually trigger auto-close through /api/accounting/period-close/auto-run.
- AutoOps run includes accountingAutoClose result.
- Admin cannot trigger auto-close manually.
- Manual period close requires a closing reason of at least 8 characters.

Known honest limitation:
- Actual auto-close closed=true scenario is deferred because target period 2026-04 did not exist in current UAT data.
- The verified K result is controlled safe-skip + governance/role/validation PASS, not actual previous-period closing PASS.
- Manual UI smoke remains user-side visual verification if needed.

Product decision locked:
- KOST48 may use automatic monthly period close, but only as controlled automation.
- Auto-close is not blind automation.
- It must be blocker-aware, auditable, balanced, role-safe, and reversible only through official reopen workflow.
- Reopen remains Owner-only and reason-required.
```

### Source-of-truth note

```text
This section supersedes older V5.29-C/D/E/H/I/J planning sections below.
Older sections remain as historical record only.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```

## 2026-05-27 — V5.29-K Controlled Monthly Auto-Close Governance Journal

Status:
```text
Commit pushed:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Verified:
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked 403 PASS.
- Owner close without reason blocked 400 PASS.
- Generated Prisma restored and not committed.
```

Main UAT findings and outcomes:
- `GET /api/accounting/period-close/auto-policy` returned basis `PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K`.
- Policy mode is `AUTO_MONTHLY_PREVIOUS_PERIOD`.
- Target period key was `2026-04`.
- Owner `POST /api/accounting/period-close/auto-run` returned skipped=true because AccountingPeriod 2026-04 was not created.
- AutoOps `POST /api/auto-ops/run` included `accountingAutoClose` and also safe-skipped with the same reason.
- ADMIN `POST /api/accounting/period-close/auto-run` returned 403 Forbidden.
- Owner manual close without `notes` returned 400 with message: `Alasan tutup periode wajib diisi minimal 8 karakter agar audit trail jelas.`
- Commit/push succeeded: `0285dbe..7c8c8e7 main -> main`.

Known notes:
- Safe-skip is correct because auto-close must not create or close missing target periods.
- Actual auto-close `closed=true` remains deferred until a previous OPEN period exists and readiness/preview pass.
- Manual UI visual smoke remains pending if user wants final browser confirmation.

Next journal target:
```text
PLAN M1 Tenant My Stay Guide Full Audit
```

Alternative accounting target:
```text
PLAN V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning
```


## 2026-05-27 — V5.29-C/D Lifecycle Hotfix PASS + Push Journal

Status:
```text
Commit pushed:
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity

Verified:
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Runtime UAT PASS for B1/B2/B3/B4/B5/B7/F2.
- HOTFIX3 renew UTC date precision PASS.
- HOTFIX4 tenant blocker microcopy PASS.
- Generated Prisma restored and not committed.
```

Main UAT findings and outcomes:
- B1 invalid partial refund under-processing rejected with 409.
- B1 valid exact partial refund settled full deposit.
- B2 stay creation with agreed rent 0 stored 0.
- B3 cancelled invoice left invoiceCount total intact and openInvoiceCount 0.
- B3 DRAFT invoice counted as open.
- Checkout request with `2026-06-15T00:00:00.000Z` stayed exact and notification showed 15/6/2026.
- Duplicate checkout request rejected 409.
- Renew request YEARLY stayed YEARLY after approve.
- Initial renew approval UAT found real H-1 drift; HOTFIX3 fixed it.
- After HOTFIX3, stay planned checkout and renew invoice periodEnd returned `2027-05-26T00:00:00.000Z`.
- Manual UI F2 showed renew request moved out of pending and API confirmed approved YEARLY requests with correct UTC date.
- Open invoice blockers for checkout and renew worked.
- HOTFIX4 cleaned tenant blocker copy from raw `(ISSUED)` enum to tenant-friendly `belum dibayar`.

Known notes:
- Old UAT notifications created before HOTFIX2 can still show old H-1 dates.
- Those rows are historical dev data, not current regression.

Next journal target:
```text
PLAN/ACT V5.29-E — Admin Check-In + Invoice Hygiene Fix
```

## 2026-05-26 — V5.29-B9A/B9B + Critical Audit Planning Journal

### V5.29-B9A — Statement Command Center Finance Cockpit

Status:
```text
Commit pushed:
51eba86 feat(accounting): add statement command center finance cockpit

Verified:
- Frontend build PASS.
- Runtime accounting API smoke PASS.
- Manual UI smoke PASS: Finance → Laporan Keuangan tampil dengan baik.
- Backend unchanged.
```

Added:
- Statement command center.
- Statement status cards.
- Accounting data quality panel.
- Period close/reopen/re-close timeline.
- Journal audit trail.
- Owner-facing finance navigation cleanup.

### V5.29-B9B — Copy Consistency Cleanup

Status:
```text
Package generated.
Runtime accounting API smoke PASS from user log.
Build/commit/push pending unless user confirms.
```

Verified API behavior:
```text
Readiness warnings now say ledger accounting is ready to read.
Trial Balance formalStatementReady=true and balanced.
Balance Sheet ready=true, formalStatementReady=true, balanced.
P&L formalStatementReady=true and excludes closing/reversal.
Period close CLOSED with JE-CLOSE-2026-05-V2.
Unmapped operational=0.
Draft journal=0.
Unbalanced posted journal=0.
Depreciation posted.
Asset alignment safe.
```

### Critical Audit Received

Accepted bug list:
```text
B1 CRITICAL — Deposit partial refund can leave deposit remainder untracked.
B2 CRITICAL — agreedRentAmountRupiah uses || and ignores 0.
B3 HIGH — invoiceCount equals openInvoiceCount due filtered count.
B4 HIGH — requestedTerm ignored during renew approve.
F1 HIGH — check-in wizard missing BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY.
B5 MEDIUM — checkout notification date uses planned date instead of requested date.
B6 MEDIUM — DRAFT invoice cancellation calls reversal unnecessarily and swallows accounting errors.
B7 MEDIUM — checkout-requests findAll response shape inconsistent.
F2 LOW — approve renew does not invalidate admin-checkout-requests cache.
```

### New Journal Target

```text
PLAN/ACT V5.29-C — Critical Lifecycle/Data Integrity Hotfix
```

Scope:
- B1 deposit partial refund guard.
- B2 rent 0 nullish coalescing fix.
- B3 invoiceCount total vs openInvoiceCount filtered.


## 2026-05-26 — V5.26-B6 to V5.28-B8 Accounting Governance Release

### B6 — Fixed Asset Ledger Alignment

B6 added explicit schema-backed fixed asset ledger alignment:
- `FixedAssetLedgerAlignmentStatus`
- `FixedAssetLedgerAlignmentMethod`
- alignment fields on `FixedAsset`
- asset ledger alignment DTO/endpoints
- Asset Register UI alignment workflow

Verified result from previous UAT:
```text
Asset FA-00001 aligned.
FixedAsset.ledgerAlignmentStatus = ALIGNED.
ledgerAlignmentAmountRupiah = 3.600.000.
JournalEntry JE-AUTO-ADJUSTMENT-FIXED-ASSET-ALIGNMENT-1 balanced.
Balance Sheet and Trial Balance balanced.
Asset register net book value matches ledger fixed assets.
```

### B7 — Period Close + Retained Earnings

B7 added:
- readiness, preview, and post endpoints for period close,
- `JournalSourceType.CLOSING_ENTRY`,
- `AccountingPeriod` close metadata,
- Owner-only close action,
- closing journal to move P&L to Retained Earnings,
- P&L metadata that keeps operational performance readable after close.

Runtime UAT:
```text
Readiness ready=true.
Preview balanced: 125.000 debit / 125.000 kredit.
Post close created JE-CLOSE-2026-05.
AccountingPeriod status CLOSED.
Duplicate close blocked.
Trial Balance after close balanced.
Balance Sheet after close balanced.
P&L basis LEDGER_OPERATIONAL_PNL_EXCLUDING_CLOSING_B7.
```

### B8 — Closed Period Governance + Reopen/Reversal

B8 added:
- `JournalSourceType.CLOSING_REVERSAL`,
- reopen metadata on `AccountingPeriod`,
- reopen preview and reopen endpoints,
- closed period posting guard,
- manual period status guard,
- journal draft guard for CLOSED period,
- re-close versioning.

Runtime UAT:
```text
Reopen created CLOSING_REVERSAL and returned period to OPEN.
P&L stayed readable and excluded closing/reversal.
Re-close created JE-CLOSE-2026-05-V2.
Duplicate close after re-close blocked.
Trial Balance after re-close: 34.170.000 debit / 34.170.000 kredit.
Balance Sheet after re-close: assets 29.915.000 = liabilities+equity 29.915.000.
Latest GitHub commit: 286e512.
Working tree clean: ## main...origin/main.
```

### Next Journal Target

```text
PLAN V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening
```

Focus:
- statement command center UI,
- data quality/readiness warnings,
- period close/reopen timeline,
- journal audit trail readability,
- cleanup stale B1/B2/no-auto-posting copy,
- Finance navigation to Balance Sheet / P&L / Trial Balance / Asset Register / Period Close.


## 2026-05-24 — V5.23-A Admin IA + Finance Add-on Revenue Package

### Konteks

Setelah beberapa iterasi V5.22, user mengarahkan kembali IA admin agar sidebar menjadi navigasi utama, bukan top workspace tabs. User juga memutuskan penggabungan domain:

```text
Tenant gabung Stays.
Expenses gabung Finance.
Tiket gabung Staff.
Pengumuman tetap header.
Settings tetap header.
Reports tidak perlu dulu.
```

### Package terakhir

Latest generated frontend package:

```text
frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip
```

Latest backend package:

```text
backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip
```

### Isi patch V5.23-A

- Admin sidebar final 5 menu:
  - Dashboard
  - Stays & Tenant
  - Finance
  - Staff & Tiket
  - Kamar & Stok
- Dashboard kembali menjadi command center lintas menu.
- Finance menerima sub-menu:
  - Tagihan
  - Review Pembayaran
  - Voucher WiFi
  - Pendapatan Tambahan
  - Pengeluaran
  - Riwayat Bayar
- Existing `WifiSale` diposisikan sebagai revenue stream voucher WiFi.
- Halaman placeholder/plan untuk Pendapatan Tambahan dibuat.
- Expense category UI dibuat lebih cocok untuk usaha kos.
- Ticket tenant category diperluas menjadi lebih kos-specific.

### Verification

```text
Syntax check for touched files: OK.
Frontend full build: not verified in container because node_modules not available.
Backend unchanged.
Runtime/API smoke not run.
FULL PASS not claimed.
```

## 2026-05-24 — V5.23-B Accounting & Balance Sheet Planning

### Konteks

User bertanya apakah revenue dan cost sudah masuk ke akuntansi kos. Kesimpulan:

```text
Saat ini sudah ada finance operasional.
Belum ada accounting ledger formal.
Belum ada Chart of Accounts.
Belum ada CashAccount.
Belum ada JournalEntry / JournalLine.
Belum ada Asset Register.
Belum ada Depreciation.
Belum ada Equity/Owner Capital.
Balance Sheet belum valid.
```

### Direction

Next phase harus merancang **Accounting & Balance Sheet Foundation** sampai sistem mampu mencapai:

- Profit & Loss,
- Cashflow,
- Balance Sheet,
- Asset register,
- Deposit liability,
- OPEX / COGS / CAPEX,
- Ancillary revenue profitability.

### Important warning

Jangan langsung lompat ke full double-entry accounting patch besar tanpa PLAN. Buat roadmap bertahap dan migration-safe.


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps Docs Sync

### Konteks

User menegaskan aturan bisnis yang sebenarnya:

```text
Prioritas kamar berdasarkan siapa yang sudah bayar valid duluan, bukan siapa yang hanya pesan duluan.
Booking belum melunasi pembayaran tidak boleh mengunci kamar.
Tenant baru belum boleh bayar kalau kamar belum siap dihuni.
Tenant lama yang telat bayar/perpanjang tidak boleh berhutang.
Jika tenant lama telat dan ada tenant baru valid, tenant lama wajib mengosongkan kamar maksimal 3 jam.
```

### Patch code sebelumnya

V5.20 code package sudah dibuat:
- `backend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`
- `frontend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`

Isi package mencakup:
- AutoOps module,
- deadline cepat 3 jam,
- one-step payment proof endpoint,
- first-paid competing booking behavior,
- urgent UI emphasis,
- dedup alert/copy yang mirip.

### Docs sync ini

Docs aktif diperbarui agar source of truth mengikuti V5.20:
- ground state,
- contracts,
- plan,
- decisions log,
- journal,
- changelog,
- checklist.

### Verification status

```text
V5.19 Renew Meter Utility backend runtime UAT PASS.
V5.20 source ZIP generated.
V5.20 still needs local backend build, frontend build, and fresh UAT/manual UI smoke before FULL PASS.
```


## 2026-05-22 — V5.17-D Staff Routine Work Cards PASS + Push

### Konteks

Setelah staff workspace dipoles, user menemukan bahwa checklist harian/mingguan/bulanan sempat hilang/tergeser. Ini dianggap regression karena checklist adalah core work board staff.

### Patch

V5.17-D mengembalikan checklist sebagai professional routine work cards:
- Harian,
- Mingguan,
- Bulanan,
- progress visual ringan,
- status tugas,
- tombol start/done/help,
- assistant strip berbasis kondisi checklist.

### Verification

User melakukan manual check dan menyatakan:

```text
Sudah saya cek sip bagus pass
```

Patch staff UX terbaru kemudian dipush:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
```

Generated Prisma noise di-restore, working tree clean, branch `main` sama dengan `origin/main`.

## 2026-05-22 — V5.17-C Inventory Intelligence

### Konteks

User menegaskan bahwa status stok gudang seperti “stok habis” dan “stok menipis” tidak perlu diisi staff. Jika bisa dihitung otomatis dari jumlah stok, sistem/AI rule intelligence harus menghitungnya.

### Patch Direction

- Status stok gudang dihitung dari `qtyOnHand/minQty`.
- Staff tidak memilih manual “stok habis/menipis”.
- Gudang dibedakan antara:
  - health stok otomatis,
  - kondisi fisik barang.
- Assistant staff memberi prioritas restock/stock risk.
- Admin tidak dibebani konfirmasi hal yang objektif dan bisa dihitung sistem.

## 2026-05-22 — V5.17-B Clean Blue Staff UI

### Konteks

User tidak menyukai font terlalu berat, warna low contrast, tombol dobel, dan UI staff yang belum modern. User juga menegaskan:
- jangan font yang tebal/sulit dibaca,
- warna jangan sampai tidak terbaca,
- assistant harus bekerja,
- admin/staff flow harus simpel dan on-flow.

### Patch Direction

- Clean blue unified UI style.
- Card kamar clickable penuh.
- Hapus tombol dobel yang memiliki fungsi sama.
- Modal laporan progressive dan lebih readable.
- Admin review decision dibuat lebih dekat dengan flow.

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix PASS

### Konteks

Setelah staff repair flow dipatch, ditemukan bug: staff report berhasil membuat ticket aktif dengan `assignedToId=3`, tetapi `GET /api/tickets?limit=20` sebagai staff sempat terlihat kosong.

Audit menunjukkan:
- Staff user benar: `id=3`, `role=STAFF`.
- Ticket baru benar: `OPEN`, `assignedToId=3`, `linkedRoomItemId=1`.
- Staff bisa `GET /api/tickets/:id` detail ticket.
- Masalah hanya list endpoint.

### Patch

V5.16-G memperbaiki `tickets.service.ts` supaya role STAFF punya branch query eksplisit:
- ticket assigned ke staff,
- atau ticket punya staffFieldReports yang dibuat oleh staff,
- default hanya `OPEN`, `IN_PROGRESS`, `DONE`.

### Verification

Manual UAT setelah patch:
- Staff membuat report room item 1.
- Admin melihat ticket baru:
  - `id=12`
  - `TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff list menampilkan:
  - ticket #12 OPEN,
  - ticket #2 DONE,
  - ticket #1 OPEN.

Kesimpulan:

```text
V5.16-G Staff Ticket List Hard Fix = PASS secara manual UAT.
```

## 2026-05-21 — V5.16-D/E Staff Repair Flow Manual UAT

### Verified

- Staff report barang kamar:
  - applied temporary status `MAINTENANCE`,
  - `NEEDS_REPLACEMENT` stored for request replacement,
  - replacement request stored.
- Staff report gudang:
  - applied temporary status `PENDING_CHECK`,
  - `OUT_OF_STOCK` stored.
- Admin review:
  - `APPROVE` accepted,
  - report entered `IN_REPAIR`,
  - movement created,
  - stock decreased.
- `NEEDS_MORE_INFO` accepted.
- `REJECT` accepted.
- Ticket 7:
  - marked done,
  - closed with `finalInventoryItemStatus=OUT_OF_STOCK`.
- Ticket 6:
  - started,
  - marked done,
  - closed with `finalRoomItemStatus=GOOD`.
- Fresh linking:
  - ticket 9 had `linkedRoomItemId=1`,
  - ticket 8 had `linkedInventoryItemId=2`.

### Lesson

Some old ticket data can remain unlinked because it was created before V5.16-E. That is accepted as dev/UAT historical data. New reports after V5.16-E link correctly.

## 2026-05-21 — V5.16 Staff Repair Governance Direction

User identified a real business-flow problem:

```text
Tenant can report broken room item, but staff could also directly update item status to damaged.
This made staff look like final decision-maker.
```

Final decision:
- Staff reports/diagnoses only.
- Admin/owner confirms final item state.
- Inventory movement remains admin/owner.
- Staff UI must be simple and human-friendly.

## 2026-05-21 — V5.15 Direction Locked

V5.15 remains carry-forward after V5.16 staff flow stabilizes:
- Intelligent Command Center,
- rule-based assistant,
- assistant vs queue dedup,
- reports drill-down,
- smart chart switching,
- finance foundation,
- on-demand AI only.

## 2026-05-20 — V5.14 Command Center Direction Locked

User wanted the app to stop feeling like decorative dashboard/database viewer. Direction became:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

V5.14 implemented frontend-first command center components:
- `AssistantPanel`
- `ActionQueueTable`
- `CompactMetrics`
- `BlockedReasonCard`
- `ReadinessChecklist`
- `LifecycleTimeline`
- `PeriodVisualizer`

## Next Journal Target

Next chat should start with:

```text
PLAN Tenant Side Full Audit
```

Focus:
- tenant portal home,
- My Stay Guide,
- invoice/payment UX,
- renew/checkout request UX,
- tenant assistant,
- tenant microcopy,
- API/data availability,
- exact patch plan.


## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Audit Lock

### Context

User asked to start from backend design and requested a full backend audit using the real backend ZIP. The backend was inspected as a monolithic NestJS + Prisma + PostgreSQL system. A second opinion audit was requested through Cline + DeepSeek V4 Pro. Cline initially stopped because of output/context limits, then provided pre-ACT validation and generated a clean backend ZIP.

### Clean backend source for next ACT

```text
backend_latest_for_accounting_act_CLEAN.zip
node_modules: excluded
dist: excluded
.git: excluded
.env files: excluded
source/prisma/sql/scripts/uploads: included
```

### Main audit findings

```text
Backend is strong for operational kos finance.
Backend is not yet accounting-ledger-grade.
There is no COA/cash/opening balance/journal/accounting period model yet.
Existing /finance/balance-sheet/draft is safe because it admits draft/not balance-sheet-grade.
Existing /reports/profit-loss and /reports/financial-ratios need operational approximation labeling.
Cline found local working tree was dirty before clean ZIP creation, so ACT must use the clean ZIP snapshot.
```

### ACT B1 conclusion

```text
READY FOR ACT B1 with strict additive-only scope.
Patch target: Accounting Foundation Readiness.
No auto-posting.
No lifecycle integration.
No payment/stay/checkout/renew/booking touch.
```

### Next chat should start with

```text
ACT V5.23-B1 Backend Accounting Foundation Readiness using backend_latest_for_accounting_act_CLEAN.zip and the updated docs.
```

## 2026-05-25 — V5.24-B2A/B/C + V5.24-C Release Journal

### Accounting B2A/B/B2C

Accounting foundation naik dari schema/readiness menjadi setup yang dapat dipakai Owner.

Verified flow:
```text
Cash account created.
Accounting period created.
Opening balance draft created.
Opening balance posted.
JE-OPENING-1 created.
Trial Balance reads 30.000.000 debit and 30.000.000 credit.
Duplicate draft was voided.
Readiness reached 100%.
```

Important carry-forward:
```text
This is still not B3 auto-journal.
Operational invoices/payments/expenses are not automatically posted yet.
Future B3 must design idempotency, source mapping, and failure isolation.
```

### Admin UI V5.24-C

V5.24-C addressed critical admin UI audit issues:
```text
GlobalSearch restored for admin.
Dashboard ticket DONE behavior hardened.
StaysPage ALL filter fixed.
AncillaryRevenuePage made operational instead of roadmap-heavy.
Dashboard dead code/copy partially cleaned.
```

Latest pushed commits:
```text
eb198b2 fix(accounting): allow voiding draft opening balances
cb93fe6 fix(admin): harden dashboard search tickets and finance ux
```

### Next Journal Target

```text
PLAN V5.24-D — Admin UI Architecture + Performance Hardening
```

Focus:
- dashboard query loading/performance,
- sidebar/dashboard navigation consistency,
- RoleWorkspaceTabs dead code decision,
- admin sidebar context,
- meaningful status strip metrics,
- limited font-weight cleanup.