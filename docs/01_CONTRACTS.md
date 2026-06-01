# KOST48 V5 — Contracts & API
**Versi:** 2026-05-31 V5.9.8-A Room Readiness Flow Hardening

<!-- KOST48_DOCS_SYNC_20260601_V599_BOOKING_EXPIRY_META_IMPORT -->
## 0.0 Latest Contract Addendum — V5.9.9 Fix: Missing getBookingExpiryMeta import

```text
Latest pushed main baseline:
- f3eb43b fix: add missing getBookingExpiryMeta import in StaysPage.tsx

Verification evidence reported:
- Git push PASS to origin/main.
- Frontend build PASS confirmed by user local run.
- No schema change.
- No DB reset.
- No new dependency.
```

### V5.9.9 patch scope

```text
Fix TS2304: Cannot find name 'getBookingExpiryMeta' at 3 locations in StaysPage.tsx.
The function was defined in bookingExpiry.ts but was not imported in StaysPage.tsx.
```

### Files changed in commit f3eb43b

Modified:
- `frontend/src/pages/stays/StaysPage.tsx` — added `getBookingExpiryMeta` to import from `../../utils/bookingExpiry`.

Other accumulated files committed together (pre-existing or new from previous work):
- Backend helpers: accounting-posting-helpers.ts, accounting-report-helpers.ts, stays-service-helpers.ts, tenant-bookings-helpers.ts
- Frontend: DashboardAdmin.tsx, DashboardOwner.tsx, DashboardStaff.tsx, dashboardShared.tsx, stayPredicates.ts, TicketsStaffMode.tsx, ticketsShared.ts, accounting-types.ts, config resources split
- Docs: 05_BUSINESS_MANAGEMENT_INTELLIGENCE_PLAN.md

### Not changed in V5.9.9

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No new dependency.
- No generated Prisma commit.
- No lifecycle/payment business rule change.
- No room readiness behavior change from V5.9.8-A.
```

---

## 0.0 Latest Contract Addendum — V5.9.8-A Room Readiness Flow Hardening

```text
Latest pushed main baseline:
- 2abf4c9 feat(rooms): gate checkout room readiness

Verification evidence reported:
- Git push PASS to origin/main.
- Backend build PASS confirmed by user local run.
- Frontend build PASS confirmed by user local run.
- Generated Prisma restored before commit.
```

### Room readiness after checkout contract

Purpose:
- Final checkout confirms the tenant has left and the stay can be completed.
- Final checkout must not imply the room is already clean, inspected, inventoried, and ready for the next tenant.
- Room readiness is an operational gate between checkout completion and bookable availability.

Rules:
- Final checkout changes the stay lifecycle to completed according to the existing core flow.
- After final checkout, the room must enter a readiness gate:
  - current no-schema-change implementation uses `Room.status = MAINTENANCE`.
  - tenant/public/admin/staff UI should label this as `Perlu dicek`, `Cek kamar keluar`, or `Sedang dicek` depending on context.
- Backend must create or reuse one checkout inspection task/ticket for that stay/room:
  - category: `CHECKOUT_INSPECTION`,
  - intent: staff checks room condition after the tenant leaves.
- Duplicate checkout-inspection tickets for the same stay/room/category should be avoided.
- Closing a safe checkout-inspection ticket may move the room from `MAINTENANCE` to `AVAILABLE`.
- A checkout-inspection ticket must not mark a room `AVAILABLE` if:
  - another active stay exists for the same room,
  - the room is no longer in `MAINTENANCE`,
  - the final condition or admin review indicates damage/problem,
  - the close action is not the correct checkout-inspection completion path.

### Staff inspection contract

Rules:
- Staff inspection is operational evidence collection and task completion.
- Staff should see a clear work item such as `Cek kamar keluar` or `Cek kamar setelah penghuni keluar`.
- Staff-facing copy should focus on:
  - kebersihan,
  - kunci,
  - barang tertinggal,
  - inventaris,
  - kerusakan,
  - foto kondisi akhir.
- Staff UI must not use developer/internal permission copy such as:
  - `lifecycle`,
  - `official movement`,
  - `final checkout`,
  - `approval finance`,
  - `computed by system`.
- Staff must not mutate sensitive finance/lifecycle/payment/deposit decisions unless explicitly approved in a future decision.

### Public room readiness contract

Rules:
- Public room card/detail must treat `MAINTENANCE` rooms as non-bookable.
- Public-facing label for this readiness state should be `Sedang dicek`.
- Public CTA for this state should be `Tanya Ketersediaan`, not `Ajukan Booking`.
- Public filter may include `Sedang Dicek` so prospects can see recently vacated rooms without assuming they are ready today.
- `canBook` remains the source of truth for direct booking action.

### Pagination and duplicate UI contract

Rules:
- Main table/list surfaces should show max 10 visible rows per page where feasible.
- If server metadata is unavailable, frontend may use client-side fallback pagination.
- Row-click and `Detail/Lihat` button must not duplicate each other unless the button performs a different action.
- Dashboard pages should prioritize compact queues, summaries, and disclosure sections over long table dumps.
- Filters should reset pagination to page 1 and must remain visually lighter than primary actions.

### Not approved in V5.9.8-A

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No new dependency.
- No generated Prisma commit.
- No new room readiness enum/table yet.
- No official admin-managed room inspection schema yet.
```

### Future officialization candidates

```text
RoomReadinessStatus or RoomInspection may be considered later if explicitly approved.
A future production-grade design may separate occupancy status from readiness/cleaning status instead of reusing MAINTENANCE.
```
<!-- KOST48_DOCS_SYNC_20260531_V598A_ROOM_READINESS_FLOW_END -->

<!-- KOST48_DOCS_SYNC_20260531_V595A_PUBLIC_ROOM_ASSETS_START -->
## 0.0 Latest Contract Addendum — V5.9.5-A Public Room Assets & Slideshow

```text
Latest local commits for this scope:
- f10ebe5 fix(public): wire room assets and slideshow
- 419dc62 chore(public): add backend room image assets

Verification evidence reported:
- Frontend build PASS.
- Backend build PASS.
- API smoke PASS for public rooms.
- Public browser smoke PASS for room catalog/detail/booking scope.
```

### Public room catalog contract

Purpose:
- Public room discovery is a marketing and trust surface, not only an availability table.
- Occupied rooms may remain visible so prospects can understand room types, pricing, photos, and future interest.
- A visible room is not necessarily bookable; booking intent must depend on `canBook`.

Rules:
- Public list/detail may show active rooms with statuses such as `AVAILABLE`, `RESERVED`, `OCCUPIED`, and `MAINTENANCE` when the service marks them public/active.
- Public DTO must expose a booking capability flag:
  - `canBook = true` only for rooms that may enter the booking submission flow.
  - `canBook = false` for occupied/non-bookable rooms.
- Frontend must not infer bookability from labels alone; use `canBook` when present.
- Public labels must be tenant/prospect-friendly:
  - Bookable rooms: `Kosong` / `Bisa diajukan`.
  - Occupied rooms: `Terisi`.
  - Maintenance/unavailable rooms: `Belum tersedia` or `Perawatan` where useful.
- Raw backend enums such as `AVAILABLE`, `OCCUPIED`, `RESERVED`, and `MAINTENANCE` must not appear in public UI.

### Room asset contract

Rules:
- Curated Kost48 image assets live in:
  - `frontend/public/room-images/` for immediate Vite/static frontend rendering.
  - `backend/uploads/room-images/` for backend-served public media paths.
- Backend static uploads can serve room assets through upload paths such as:
  - `/uploads/room-images/...`
  - `/api/uploads/room-images/...` when the backend alias is active.
- `backend/uploads` remains generally ignored; only `backend/uploads/room-images` curated marketing assets may be force-added.
- Do not commit uploaded payment proofs, tenant documents, or unrelated runtime upload folders.
- If an exact room-code photo does not exist, fallback images must be neutral marketing images and must not claim to be the exact room.
- Public UI must handle missing/broken images with a clean fallback instead of a broken image icon.

### Public CTA contract

Rules:
- `canBook = true` room:
  - Primary CTA: `Ajukan Booking`.
  - Secondary CTA may be WhatsApp inquiry.
- `canBook = false` room:
  - Do not allow direct booking submission.
  - CTA should be `Tanya Ketersediaan` / `Minat Kamar Ini` via WhatsApp.
  - Do not show a dead disabled button as the only action.
- Booking page for a non-bookable room must show a friendly blocked/interest state, not a hard technical error.
- Public booking copy must continue to state that booking does not lock the room until payment/admin approval is completed.

### Not approved in V5.9.5-A

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle or payment rule rewrite.
- No new dependency.
- No generated Prisma commit.
- No automatic DB seeding of room image URLs.
- No claim that fallback/generic photos are exact photos of a specific room.
```
<!-- KOST48_DOCS_SYNC_20260531_V595A_PUBLIC_ROOM_ASSETS_END -->

<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_START -->
## 0.0 Latest Contract Addendum — V5.9.3-B Tenant Room Dossier Compact

```text
Latest pushed main baseline:
- e2d7d58 fix(tenant): compact room dossier on my stay page
- 7b89df6 fix(tenant): expose room dossier inventory data

Current verification evidence:
- Frontend build PASS: tsc -b 0 errors and Vite build completed in 8.17s.
- Tenant screenshot smoke PASS: 24/24 PNG captured, all status 200.
- Desktop/mobile `/portal/stay` rendered with compact Room Dossier architecture.
- Backend tenant endpoint smoke PASS: GET /api/room-items/my-room returned success=True.
- Main is clean and up to date with origin/main after push.
- Remaining broad WIP changes were stashed as `stash@{0}: On main: wip leftover before backend room dossier cherry-pick`.
```

### Tenant Room Dossier contract

Rules:
- `/portal/stay` is the active `My Stay Guide` / `Kamar Saya` room dossier surface.
- `Kamar Saya` must remain compact while preserving useful database-backed room data.
- Room identity, lease status, payment/tagihan status, room photo/thumbnail, facilities, inventory, tariffs, deposit/dana titipan, and issue reporting should be visible or checkable from this route.
- Facilities and inventory should use compact disclosure/details patterns rather than giant always-open sections.
- All room inventory items available from the API should be checkable; do not permanently hide items behind a misleading `+N` CTA.
- Inventory problem reporting must remain a clear separate CTA, not mixed with item count text.
- Tenant-facing inventory statuses must be human-readable: `GOOD` => `Baik`, `DAMAGED` => `Rusak`, `MISSING` => `Hilang`, `NEEDS_REPAIR`/`MAINTENANCE` => `Perlu dicek`.
- Deposit copy must use `dana titipan` / `deposit titipan` and stay neutral during active tenancy.
- Tenant UI must avoid raw backend terms such as `stay`, `periodEnd`, `checkout request`, `ISSUED`, `PENDING_REVIEW`, and raw enum item statuses.

### API contract

Added/active endpoint:

```text
GET /api/room-items/my-room
Role: TENANT
Purpose: return room inventory for the authenticated tenant's active stay.
Response shape: { items, meta: { page, limit, totalItems, totalPages } }
```

Rules:
- The endpoint must use `actor.tenantId`.
- If the tenant account is not linked to a tenant record, return a controlled error.
- If no active stay exists, return an empty items list with pagination metadata.
- Tenant must only see inventory for the room attached to their own active stay.
- This endpoint is read-only and must not mutate room, stock, inventory, stay, payment, or lifecycle state.

Updated current-stay read shape:
- `GET /api/stays/me/current` may include `tenant`.
- `GET /api/stays/me/current` may include `room.facilities` filtered to `publicVisible: true`.

### Not approved in V5.9.3-B

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No tenant profile photo upload yet.
- No tenant one-time profile completion endpoint yet.
- No tenant-to-tenant chat/community implementation yet.
```
<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_END -->

<!-- KOST48_DOCS_SYNC_20260531_V592_START -->
## 0.0 Latest Contract Addendum — V5.8.6 to V5.9.2 UI Finalization and Tenant Engagement

### UI finalization contract

Rules:
- These packages are frontend-first UI/UX stabilization packages; backend stays unchanged unless runtime/build proves a real contract gap.
- Compact mode is now a product rule: avoid oversized cards, excessive hero blocks, repeated explanatory copy, and long pages where the same decision can fit in a compact section.
- One destination should not appear as multiple duplicate CTAs in the same section.
- If a table/list row is clickable for detail, do not also show a redundant `Detail/Lihat` button in the same row unless it performs a distinct action.
- Tables/lists should default to 10 visible rows where feasible; filter changes should reset pagination to page 1.
- Filters must remain visually lighter than primary actions.
- Visible UI copy should use Indonesian business/tenant language, not backend jargon.

### Tenant engagement contract

Rules:
- Tenant portal is not only a finance/payment surface; it is `My Stay Guide` and should build trust, engagement, service awareness, and feedback.
- Tenant home should show `Kamar Saya` clearly, including room identity, booking-like room information, room photo/placeholder, and installed room item visibility if available.
- Tenant should be told that damaged, missing, or problematic room items can be reported through the app.
- Tenant payment/tagihan cards must not push payment actions for Rp0 invoices; Rp0/problem invoices should be framed as `perlu dicek admin` and link to the specific invoice detail if an invoice ID exists.
- Announcements are rare and should not be a major tenant sidebar/menu item. They may appear as a small strip under the header or through notifications, with detail route kept only when useful.
- Service interest buttons are allowed as lightweight engagement UI only if they do not falsely claim persistence before a backend exists. Until backend support exists, route to laporan/saran/contact flow.
- Profile photo/upload is intentionally deferred to a later patch; current scope may show profile/room placeholders only.

### Finance report UI contract

Rules:
- Profit/Loss, Cashflow, Balance Sheet, Piutang Aging, and Deposit Titipan should live together in Reports → Keuangan rather than adding sidebar clutter.
- Deposit must remain dana titipan/liability, not revenue/omzet/profit.
- Frontend charts may be used for decision support, but official accounting numbers must later move to backend-backed report endpoints before production finance labeling.

### Officialization carry-forward

Future backend officialization may add endpoints such as:

```text
GET /api/reports/finance/summary
GET /api/reports/finance/profit-loss
GET /api/reports/finance/cashflow
GET /api/reports/finance/balance-sheet
GET /api/reports/finance/receivables-aging
GET /api/reports/finance/deposit-liability
GET /api/admin/decision-queue
GET /api/tenant/my-stay/summary
GET /api/staff/work-board
GET /api/owner/business-health
```

No schema change is approved by this docs sync.
<!-- KOST48_DOCS_SYNC_20260531_V592_END -->

<!-- KOST48_DOCS_SYNC_20260530_M10C_START -->
## 0.0 Latest Contract Addendum — M10 Cleanup and Safety Flow Hardening

```text
Latest pushed baseline after M10-C:
- 3fa294c fix(frontend): localize reminder queue label
- feb086b fix(frontend): refresh tenant portal after lifecycle decisions
- 8a43ac2 fix(backend): harden public booking rate limit and journal logging
- 8fc5f7f fix(payments): refresh portal state after review decisions
- b456064 fix(frontend): remove legacy labels from command center
- cd3d7f0 fix(frontend): clean legacy labels and package noise

Current verification evidence from local run:
- main is up to date with origin/main after push.
- M10-C frontend build PASS: 728 modules transformed, built successfully.
- M10-B smoke PASS: GET /api/public/rooms returned success=True.
- M10-B smoke PASS: admin login + GET /api/payment-submissions/review-queue returned success=True.
- M10 cleanup removed remaining user-facing legacy labels such as V3, M4A/M5B, and Queue pengingat.
- Backend generated Prisma remains a local build artifact and must be restored before commit if it appears.
- M9 FULL PASS is still not claimed until manual browser smoke across owner/admin/staff/tenant/public is completed.
```

### M10 cleanup contract

Rules:
- `frontend/src/config/resources.ts` remains the active resource config source of truth after deleting the unused `frontend/src/config/resources/*` split attempt.
- User-facing legacy/batch labels must not appear in UI copy: avoid `Kost48 Surabaya V3`, `M4A`, `M5B`, and English `Queue` when the user sees Indonesian UI.
- Use `Antrean` for visible queue/work-list copy where appropriate.
- Package handoff ZIPs must exclude `.env`, nested ZIPs, TypeScript build info, generated reports, and uploaded payment proof files.
- Frontend cleanup must not change lifecycle, payment, invoice, deposit, or inventory business rules.

### M10-B safety contract

Rules:
- Public booking spam protection uses explicit `@RateLimit('publicBooking')` metadata and `RateLimitGuard` bucket resolution.
- Auto Journal Lite and deposit liability journal failures remain best-effort; they must warn in logs instead of silently disappearing or blocking payment approval.
- Final checkout date comparison uses the Jakarta business-day convention to avoid timezone off-by-one errors.
- Tenant portal payment/renew/stay query keys must be invalidated consistently after admin payment or renew decisions.
- Frontend mutation modals should use shared API error extraction so backend messages are not lost.

### Carry-forward contract

Rules:
- M9 FULL PASS cannot be claimed until manual browser smoke across owner/admin/staff/tenant/public is completed.
- Generated Prisma files are build/runtime artifacts and must be restored before commit unless schema/generator change is explicitly approved.
- No apps folder, workspace migration, microservice shell, schema change, DB reset, dark mode, or production DB mutation is allowed for the next browser-smoke phase.
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

## 0.1 Latest Contract Addendum — M9 Critical Flow and Build Gate

Rules:
- M9 read-smoke PASS does not equal FULL PASS.
- M9 critical API flow may be labelled PASS because public booking, payment, renew, checkout, deposit, inventory, and staff report were all verified by local runtime evidence.
- M9 FULL PASS remains blocked until manual browser smoke is done across owner/admin/staff/tenant/public.
- Public booking command packs must never fill the `website` honeypot field; it is anti-bot and intentionally rejects requests when populated.
- Command pack generated mutation commands must use discovered candidate IDs, not hardcoded `1`.
- Role login warnings caused by missing default owner/tenant seed credentials are not endpoint failures unless strict role login mode is explicitly required.
- Generated report JSON files and generated command pack files are local UAT artifacts and must not be committed.
- `backend/scripts/m9-critical-flow-uat-command-pack.ps1` may be committed as reusable tooling, but generated command pack outputs must not.

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


## 0.1 Latest Contract Addendum — M9-0 Runtime/Dev-Server Guard

### Runtime smoke contract

Rules:
- A failed smoke caused by `Unable to connect to the remote server` is environment/server-not-running, not an application endpoint failure.
- Backend must be running and `Test-NetConnection localhost -Port 3000` should pass before protected API smoke.
- `start:dev` may require freshly generated Prisma client; do not restore generated Prisma immediately before starting dev server.
- Restore generated Prisma before commit/push, not before runtime UAT.
- Failed JSON smoke reports created while backend is not reachable are noise and should not be committed.

### M9 hotfix contract

Rules:
- Deposit ledger reconciliation must not crash because of fragile Prisma relation includes.
- Accounting readiness must not crash with undefined Prisma delegates; it should return a controlled readiness response or valid ready state.
- No DB reset, schema migration, or generated Prisma commit is allowed for M9-0.
- M9-0 only fixes runtime guards; it does not mean M9 full regression is complete.

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

## 0.1 Latest Contract Addendum — M8O–M8T Verification, Lifecycle, Inventory, Staff, and Finance Gate Rules

### M8O global action/responsive/integrity contract

Rules:
- Build blockers must be fixed before broad UI sweep.
- Payment proof links must never fall back to `#`; missing proof is disabled or shown as unavailable.
- Responsive tables must auto-label rows on mobile without breaking deliberate wide comparison grids.
- Check-in, approve booking, renew, invoice, and payment mutations must invalidate related stale queries.
- Tenant-facing copy must use `masa sewa`, `tagihan`, `bukti diperiksa`, `ajukan keluar`, `ajukan perpanjangan`, and avoid backend jargon.

### M8Q checkout and invoice refresh contract

Rules:
- Admin approve/reject checkout request is OWNER/ADMIN-owned and must be guarded at service level.
- Checkout request approve/reject must not process already-decided requests.
- Approving checkout request is not final checkout.
- Approved checkout request should synchronize the stay planned checkout date to the approved requested date.
- Final checkout modal may prefill from the approved checkout request but final checkout remains a separate action.
- Invoice create/issue/cancel and payment approve/reject must invalidate dashboards, tenant portal, urgency, invoice/stay, and accounting readiness where relevant.

### M8R final checkout and deposit settlement contract

Rules:
- Final checkout date must be normalized as Jakarta business date.
- Final checkout must reject a checkout date before check-in date.
- Final checkout must use conditional update on ACTIVE stay to reduce double-click/race risk.
- Final checkout remains blocked by any open tagihan: status not PAID and not CANCELLED; DRAFT also blocks.
- Deposit settlement must run in a transaction.
- Deposit settlement must use conditional update from HELD to prevent double processing.
- Deposit settlement is forbidden for zero deposit paid.
- Partial deduction and forfeit require meaningful notes.
- Deposit remains dana titipan/liability, not revenue.

### M8S inventory and staff ops contract

Rules:
- Official stock truth is InventoryMovement plus synced InventoryItem.qtyOnHand and RoomItem.
- Creating an inventory item with initial stock creates official IN movement.
- ASSIGN_TO_ROOM decreases gudang stock and creates/updates RoomItem.
- RETURN_FROM_ROOM locks/validates RoomItem and blocks returning more than room stock.
- OUT decreases gudang stock.
- PATCH existing InventoryMovement is blocked; corrections use new movements.
- Staff cannot create official InventoryMovement.
- Staff warehouse/report UI must say staff reports physical issues or restock needs; system computes habis/menipis from qty/minQty.
- Stock health is calculated, not chosen by staff.

### M8T owner finance production gate contract

Rules:
- Owner dashboard must surface finance readiness without forcing owner to hunt through pages.
- Deposit must be framed as dana titipan/liability, not omzet.
- Owner finance gate should link to real actions/pages: accounting setup, assets, invoices, payment review.
- Accounting readiness, asset readiness, invoices, payment review, deposit ledger summary, and reconciliation-lite are core finance smoke surfaces.
- Generated Prisma files are build artifacts and must be restored before commit unless schema/generator commit is explicitly approved.

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

## 0.1 Latest Contract Addendum — M8L–M8N Integrity, Inventory, Responsive, and Action-Integrity Rules

### M8L critical payment/invoice/accounting integrity contract

Rules:
- Tenant current stay read shape must include invoice metadata needed by payment UX: `invoiceCount`, `openInvoiceCount`, `latestInvoiceId`, `latestInvoiceNumber`, and `latestInvoiceStatus` where available.
- Payment submission approval must lock all rows needed for a safe decision, not only the payment submission row. Room/stay/invoice state must not be read stale during approval.
- Initial invoice created through direct/manual check-in must store `totalAmountRupiah` consistently with invoice lines.
- DRAFT invoices may be cancelled without reversal; journaled ISSUED/PARTIAL invoices require controlled accounting cancellation/reversal behavior.
- Deposit `FORFEIT` must not be allowed for zero-deposit cases.
- Frontend invoice mutations must invalidate invoice detail/list and stays queries so open-invoice blockers do not remain stale.
- DRAFT is open for renew/checkout blocking purposes because open invoice means status not PAID and not CANCELLED.

### M8L inventory automation contract

Rules:
- Official stock truth is `InventoryMovement` plus synced `InventoryItem.qtyOnHand` and `RoomItem` state.
- Staff must not create official InventoryMovement.
- Admin/Owner official movement requires meaningful note/reason and confirmation for stock truth mutation.
- Creating an inventory item with initial stock must create an official opening `IN` movement.
- The system must sync `qtyOnHand` explicitly after movement if DB trigger does not do it.
- `ASSIGN_TO_ROOM` must decrease gudang stock and create/update `RoomItem` automatically.
- `RETURN_FROM_ROOM` must validate enough room stock, decrease `RoomItem`, and increase gudang stock automatically.
- Direct `qtyOnHand` edit through master inventory is forbidden; use Mutasi Stok.
- Stock health such as habis/menipis/aman is calculated from `qtyOnHand` and `minQty`, not manually selected.
- Barang di Kamar is a read/condition surface; assignment/return should flow through Mutasi Stok.

### M8L responsive table/list contract

Rules:
- PC may use normal tables.
- Tablet must compact spacing and avoid forcing awkward horizontal growth.
- Mobile should show row-as-card/list pattern where table columns would become unreadable.
- Tables/lists must not force content into long sideways overflow unless a deliberate horizontal data grid is necessary.
- Action buttons in mobile rows must remain readable and grouped.

### M8M global IA simplification contract

Rules:
- Global topbar search is removed unless a specific page has a real, local search need.
- Menu navigation is for moving between areas/pages.
- Filters only filter the current list and must be visually lighter than primary actions.
- Badge numbers in navigation should only show urgent/actionable counts, not decorative totals.
- Repeated explanatory copy is removed unless it changes the user decision.

### M8N action-integrity contract

Rules:
- If an element looks like a primary button, it must perform a real action.
- If an element is only a filter, it must be labelled/styled as filter.
- If an element is a menu item, it must navigate or switch a real work area.
- No-op buttons, decorative CTAs, and misleading `lihat antrean` buttons are forbidden.
- Empty states must match their section and must not claim “no work” while another queue/table below still has actionable items.
- Raw enum movement types should be shown with human labels: `Barang Masuk`, `Barang Keluar`, `Pasang ke Kamar`, `Kembali dari Kamar`.

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

## 0.1 Latest Contract Addendum — M8G–M8K Safety Belts

### M8G manual payment accounting contract

```text
Manual admin invoice payment must not diverge from accounting.
```

Rules:
- `POST /api/invoice-payments` must create/sync payment and attempt `INVOICE_PAYMENT` journal posting through `AccountingPostingService`.
- If posting succeeds, response may expose accounting metadata.
- If posting is skipped because accounting readiness/period/COA is not ready, response must surface warning/reason.
- Once an `InvoicePayment` has an active posted accounting journal, direct update/delete is blocked.
- Correction of journaled payment must use official reversal/correction workflow, not silent edit/delete.
- Generated Prisma must not be committed for this patch because Prisma model schema was not changed.

### M8G deposit partial refund status contract

```text
PARTIAL_REFUND means the deposit was partly deducted and the rest refunded.
```

Rules:
- `deductionAmountRupiah > 0`.
- `refundAmountRupiah > 0`.
- `deductionAmountRupiah + refundAmountRupiah = depositAmountRupiah`.
- Resulting `Stay.depositStatus` should be `PARTIALLY_REFUNDED`.
- `REFUNDED` should mean full refund without deduction.
- Deposit remains liability/dana titipan, not revenue.

### M8H admin booking review contract

Rules:
- Admin booking approve should not be direct-click; it should go through short review/checklist UI.
- Booking approval creates/continues initial billing flow, but booking alone does not lock the room.
- Reject booking requires meaningful admin reason.
- Reject booking is allowed only for safe booking state; booking with invoice/payment proof must not be silently cancelled through lightweight reject.
- If rejected and no other active booking holds the room, room may be released to AVAILABLE.
- First-paid room priority remains source of truth.

### M8I tenant booking / waiting-room contract

Rules:
- Tenant can still see latest rejected/cancelled booking reason.
- Tenant copy must be short: `Menunggu admin`, `Bayar & Kirim Bukti`, `Bukti diperiksa`, `Pilih kamar lain`.
- Tenant should not see raw enum/backend terms.
- Pending proof copy: `Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.`
- Cancelled/rejected booking should show admin reason and next action.

### M8J checkout request review contract

Rules:
- Admin approve checkout request must not be direct-click.
- Approve checkout request is not final checkout.
- Final checkout remains separate and must remain blocked by open invoice.
- Reject checkout request requires admin reason minimum 8 characters.
- Already processed checkout request must not be approved/rejected again.
- Tenant-facing copy should still say `Ajukan keluar`, not raw checkout jargon where avoidable.

### M8K staff report / admin confirmation contract

Rules:
- Staff action is field work/evidence, not final decision.
- Staff may start/finish assigned work and submit proof.
- Admin/Owner closes ticket and confirms final status.
- Ticket close requires `finalAdminNote` minimum 8 characters.
- Staff field report review requires admin note minimum 8 characters.
- Staff must not create official InventoryMovement or mutate sensitive finance/lifecycle flows.

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

## 0.1 Latest Contract Addendum — M7A–M8F Frontend Safety Belts

### Indonesian readability and CTA dedup contract

```text
Indonesian users generally skip long copy.
KOST48 UI must be concise, action-first, and avoid repeated links/buttons.
```

Rules:
- Do not repeat the same CTA destination more than 1–2 times on one page.
- Assistant/priority lists should default to the top 3 actions.
- Use short labels: `Tagihan aktif`, `Bukti diperiksa`, `Butuh meter`, `Cek tanggal`, `Risiko tinggi`.
- Prefer one banner/helper per risk, not repeated warnings in every card.
- Tenant/public copy must be shorter than admin copy.

### Tenant payment proof contract

```text
Tenant payment action remains one-step: Bayar & Kirim Bukti.
```

Frontend contract after M7A:
- Proof file UI accepts image only: JPG, PNG, WebP.
- Maximum proof size shown to tenant: 2MB.
- Do not promise PDF upload in tenant payment UI unless backend validator is changed.
- If a payment proof is already pending review, show: `Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.`

### Public booking safety contract

```text
Booking/minat belum mengunci kamar.
Room priority follows first valid approved payment.
```

Frontend labels:
- AVAILABLE/public actionable room: `Bisa diajukan`.
- RESERVED/interest exists: `Ada minat aktif`.
- Main CTA: `Ajukan Booking`.
- Explain only once or twice per page: `Kamar aman setelah pembayaran disetujui admin.`

### Payment review decision safety contract

Admin approval of payment is sensitive because it can affect invoice, stay, room, meter, and deposit.

Rules:
- Missing proof blocks normal approval in UI.
- Medium/high-risk payments require a short confirmation checklist.
- Reject reason must be meaningful, minimum 8 characters.
- Deposit payment copy must say deposit is `dana titipan`, not revenue/omzet.
- Overpay copy must not promise success; backend guard remains source of truth.

### Checkout and deposit safety contract

Rules:
- Final checkout remains separate from admin approval of checkout request.
- Final checkout remains blocked by open invoice.
- Open invoice = status not PAID and not CANCELLED; DRAFT also blocks.
- Deposit settlement remains separate from final checkout.
- Deposit action labels must be user-facing:
  - `Kembalikan penuh`
  - `Potong sebagian, sisanya dikembalikan`
  - `Deposit hangus`
- Deposit is dana titipan/liability, not revenue.

### Renew approval safety contract

Rules:
- Admin renew approval requires meter electricity, meter water, and meter reading time.
- New end date must not move backward from current end date.
- Medium/high-risk renew approval requires short confirmation checklist.
- Reject reason minimum 8 characters.
- Raw term enum should not be shown; use `Bulanan`, `2 Mingguan`, `Semesteran`, `Tahunan`.

### Invoice action safety contract

Rules:
- Issue invoice should go through a short confirmation checklist.
- Cancel invoice should require a reason of at least 8 characters.
- DRAFT cancellation copy can say it is safer, but backend remains source of truth.
- Create invoice frontend must validate: at least one item, description, qty > 0, price >= 0, total > 0, due date, and valid period.
- Manual payment is admin record, not tenant proof upload.
- Partial manual payment should require a note for audit clarity.


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



## 0.1 Latest Contract Addendum — M4A Deposit Ledger Backend Foundation

### Deposit ledger contract

```text
TenantDepositLedgerEntry is an additive immutable business-history layer for tenant deposits.
It does not replace Stay deposit snapshot fields yet.
Stay deposit snapshot remains the operational state source in M4A.
Accounting journal remains formal ledger; deposit ledger is operational/audit timeline.
```

Rules:
- Deposit remains liability, not revenue.
- Stay deposit fields must not be removed or deprecated in M4A/M4B.
- Deposit ledger entries are created for new deposit payment/settlement events.
- Historical backfill must remain dry-run until owner/admin review approves a write backfill plan.
- Do not fabricate detailed historical events from old snapshot data.
- Ledger timeline may include `MIGRATION_SNAPSHOT` only in a future explicitly approved backfill batch.

### M4A endpoint contract

```text
GET  /api/deposit-ledger/stays/:stayId
GET  /api/deposit-ledger/tenants/:tenantId
GET  /api/deposit-ledger/summary
GET  /api/deposit-ledger/reconciliation-lite
POST /api/deposit-ledger/backfill/dry-run
```

Access:
- OWNER/ADMIN may read all deposit ledger endpoints.
- TENANT may read only their own stay/tenant deposit ledger where implemented by guard.
- STAFF must not access deposit ledger.
- Public/marketing has no deposit ledger access.

### Entry contract

Expected entry types include:
```text
PAYMENT_RECEIVED
REFUND
DEDUCTION
FORFEIT
SETTLEMENT
ADJUSTMENT
MIGRATION_SNAPSHOT
```

Expected directions:
```text
INCREASE_LIABILITY
DECREASE_LIABILITY
INFO
```

Runtime-verified:
- Approved booking payment with deposit creates `PAYMENT_RECEIVED`.
- Full refund process creates `REFUND`.
- `balanceAfterRupiah` increases when deposit is received and returns to zero after full refund.


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

## 0.1 Latest Contract Addendum — V5.29-K Controlled Monthly Auto-Close Governance

### Monthly auto-close contract

```text
Accounting period close may run automatically, but only under controlled monthly governance.
The system must never close a period blindly.
```

Rules:
- Auto-close targets the previous month only.
- Auto-close must not close the current month.
- Auto-close must not create missing periods silently.
- Target AccountingPeriod must exist.
- Target AccountingPeriod must be OPEN.
- Period close readiness must return canPost=true.
- Closing preview must be balanced.
- If any blocker exists, auto-close must skip and report skippedReason.
- AutoOps may call the auto-close runner.
- Owner may manually trigger auto-close.
- Admin must not manually trigger auto-close.
- Manual period close requires a reason/note of at least 8 characters.
- Reopen remains Owner-only and reason-required.
- Closing creates CLOSING_ENTRY journal.
- Reopen creates CLOSING_REVERSAL journal.
- Do not delete or mutate old closing journals.
- Do not bypass CLOSED period by changing journal date or period status manually.
- Do not auto-open period.
- Do not allow ISSUED invoice without journal when accounting formal readiness is true.

### V5.29-K endpoint contract

```text
GET  /api/accounting/period-close/auto-policy
POST /api/accounting/period-close/auto-run
POST /api/auto-ops/run
```

Expected behavior:
- `auto-policy` returns basis, enabled, mode, targetYear, targetMonth, targetPeriodKey, trigger, safeguards, and note.
- `auto-run` returns closed=true only when all close conditions pass.
- `auto-run` returns skipped=true with skippedReason when target period is missing, already closed, not ready, or preview is not balanced.
- AutoOps response includes `accountingAutoClose`.
- Safe-skip is successful behavior when the target cannot be closed safely.


## 0.1 Latest Contract Addendum — V5.29-C/D PASS Contract Lock

### Lifecycle/finance UTC date contract

```text
All lifecycle and finance business dates must be normalized using UTC calendar logic, not local timezone logic.
Fresh API responses must return ISO UTC Z dates and must not drift H-1.
```

Applies to:
- Stay check-in and planned checkout dates.
- Renew requestedCheckOutDate and approved plannedCheckOutDate.
- Checkout requestedCheckOutDate.
- Invoice periodStart, periodEnd, issuedAt, dueDate where applicable.
- Meter checkpoint dates.
- Reminder preview and notification date formatting.
- Accounting posting date-only normalization.

Rules:
- Use full ISO UTC payloads in UAT: `YYYY-MM-DDT00:00:00.000Z`.
- Do not send lifecycle/finance date-only payloads unless the receiving code explicitly normalizes them to UTC.
- Do not use local `setHours`, `setDate`, `setMonth`, `getDate`, `getMonth`, or `getFullYear` for business date arithmetic.
- Use UTC date helpers for add-days and add-months logic.

### Tenant blocker copy contract

```text
Tenant-facing blocker messages must not leak raw backend enums such as ISSUED, DRAFT, PENDING_REVIEW, or lifecycle/internal terms.
```

Allowed style:
- `Selesaikan tagihan aktif sebelum mengajukan keluar: INV-XXXX belum dibayar.`
- `Selesaikan tagihan aktif sebelum mengajukan perpanjangan: INV-XXXX belum dibayar.`

Avoid:
- `INV-XXXX (ISSUED)`
- `checkout request` in tenant UI copy
- raw enum/backend terms.

### V5.29-C/D locked behavior

- PARTIAL_REFUND must process the full deposit amount.
- `agreedRentAmountRupiah=0` is a valid explicit value.
- `invoiceCount` means total invoices.
- `openInvoiceCount` means invoices whose status is not PAID and not CANCELLED.
- DRAFT invoice blocks renew/checkout because it is open.
- Renew approval must pass and apply `requestedTerm`.
- Renew approval must issue an ISSUED renewal invoice.
- Checkout notification primary date is the tenant-requested checkout date.
- Admin renew approve route is POST, not PATCH.

## 0.1 Latest Contract Addendum — V5.29-C/D/E Critical Bugfix Track

### B1 — Deposit partial refund integrity

```text
processDeposit() must never leave any part of tenant deposit untracked.
For PARTIAL_REFUND, deductionAmountRupiah + refundAmountRupiah must equal the full deposit amount being processed.
```

Rules:
- Full refund is valid only when refunded amount equals deposit amount and deduction is 0.
- Full deduction is valid only when deduction equals deposit amount and refund is 0.
- Partial refund is valid only when deduction + refund equals deposit amount.
- Over-processing must remain blocked.
- Under-processing must be blocked because it creates an invisible remainder.
- No automatic deposit ledger migration in this hotfix; Stay deposit fields remain operational snapshot.

### B2 — agreed rent amount must preserve zero

```text
agreedRentAmountRupiah=0 is a valid explicit value and must not be replaced by room default rent.
Use nullish coalescing (??), not falsy fallback (||), when choosing rent values.
```

Rules:
- If `agreedRentAmountRupiah` is `0`, backend must store/use `0`.
- If `agreedRentAmountRupiah` is `null` or `undefined`, backend may resolve rent from room/pricing term.
- This must match `renewStay` behavior.

### B3 — stay invoice count contract

```text
invoiceCount = total invoices for the stay.
openInvoiceCount = invoices whose status is not PAID and not CANCELLED.
```

Rules:
- Do not use the same filtered `_count.invoices` value for both fields.
- `DRAFT` counts as open invoice because checkout final is blocked by any non-PAID/non-CANCELLED invoice.

### B4 — renew requested term contract

```text
If tenant/admin renew request includes requestedTerm, admin approve must pass it into RenewStayDto and renew execution must use the approved term.
```

Rules:
- Requested term is not dead data.
- Renewal invoice and renewed stay period must reflect the approved term.
- Existing rule remains: renewal invoice must be ISSUED after admin approves renew request.
- Renew approval/execution remains core monolith.

### F1 — pricing term select contract

```text
Admin check-in wizard must expose every pricing term supported by backend enum.
```

Required check:
- Inspect actual enum before patching.
- Include BIWEEKLY.
- Include SEMESTERLY or SMESTERLY according to real code/schema spelling.
- Include YEARLY.
- Payload must send backend enum value, not display label.

### B5 — checkout notification date contract

```text
Checkout request notification must show requestedCheckOutDate as the primary date.
```

Rules:
- `stay.plannedCheckOutDate` may only be secondary context if shown.
- Owner/Admin must see the date tenant actually requested.

### B6 — DRAFT invoice cancellation accounting contract

```text
DRAFT invoice has no posted accounting journal and must not call cancellation reversal.
```

Rules:
- Cancel DRAFT invoice by status update only.
- For journaled invoice cancellation, use controlled reversal.
- Do not silently swallow critical accounting reversal failures for journaled invoices.
- No lifecycle rewrite.

### B7 — checkout request response consistency contract

```text
checkout-requests findAll should be response-shape consistent with the rest of the API.
```

Rules:
- Inspect frontend expectations before changing response shape.
- Avoid double wrapping if a global interceptor already wraps responses.
- If backend changes shape, patch frontend API reader in same batch.

### F2 — frontend cache invalidation contract

```text
After approve renew, invalidate any admin checkout/stay query that can show stale request state.
```

Likely query keys:
- admin-checkout-requests
- stay detail / stays list if used by current page
- renew requests if visible on same detail surface


## 0.2 Critical Audit Backlog — Accepted Bug Report

| ID | Severity | Area | Problem | Target batch |
|---|---|---|---|---|
| B1 | CRITICAL | Deposit / Stay lifecycle | PARTIAL_REFUND can process only part of deposit and leave remainder untracked | V5.29-C |
| B2 | CRITICAL | Stay creation | `agreedRentAmountRupiah || resolveRent(room)` ignores explicit 0 | V5.29-C |
| B3 | HIGH | Stay query | `invoiceCount` incorrectly equals filtered `openInvoiceCount` | V5.29-C |
| B4 | HIGH | Renew | `requestedTerm` from renew request is ignored during approve | V5.29-D |
| F1 | HIGH | Check-in UI | BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY missing from wizard dropdown | V5.29-E |
| B5 | MEDIUM | Checkout notification | Notification uses current planned checkout date instead of tenant requested date | V5.29-D |
| B6 | MEDIUM | Invoice cancellation | DRAFT cancellation calls reversal unnecessarily and swallows accounting errors | V5.29-E |
| B7 | MEDIUM | Checkout API | checkout-requests findAll response shape inconsistent | V5.29-D |
| F2 | LOW | Frontend cache | approve renew does not invalidate admin-checkout-requests cache | V5.29-D |


## 0.0 Latest Contract Addendum — V5.27-B7 / V5.28-B8 Accounting Close Governance

### Period close contract

```text
Period close is the official way to move current period profit/loss into Retained Earnings.
It must be Owner-controlled, balanced, auditable, and never a silent status flip.
```

Active period close endpoints:

```text
GET  /api/accounting/period-close/readiness?year=YYYY&month=M
POST /api/accounting/period-close/preview
POST /api/accounting/period-close/post
POST /api/accounting/period-close/reopen-preview
POST /api/accounting/period-close/reopen
```

Rules:
- `post` close is OWNER only.
- `reopen` is OWNER only.
- Closing creates `JournalEntry.sourceType = CLOSING_ENTRY`.
- Reopen creates `JournalEntry.sourceType = CLOSING_REVERSAL`.
- Reopen must not delete or mutate the old closing journal.
- Re-close after reopen must create the next version, for example `JE-CLOSE-2026-05-V2`.
- Duplicate close while period is `CLOSED` must be blocked.
- P&L operational report excludes `CLOSING_ENTRY` and `CLOSING_REVERSAL` by default so owner can still read operational performance after close/reopen.
- Balance Sheet should move closed-period current profit/loss into Retained Earnings and show `currentProfitRupiah = 0` for closed periods.
- Manual `AccountingPeriod.status` mutation is blocked; close/reopen workflow must be used.
- Manual journal draft or posting into a CLOSED period must be blocked unless it is part of controlled close/reopen governance.

### Accounting period metadata contract

`AccountingPeriod` can store:

```text
closedAt
closedById
closingJournalEntryId
closingNote
closeBasis
closeVersion
reopenedAt
reopenedById
reopenJournalEntryId
reopenReason
reopenVersion
```

These fields are audit metadata. They must support timeline/history UI in B9.

### Statement command center contract

B9 should make the following readable in Finance:
- Trial Balance status.
- Balance Sheet status.
- Profit & Loss status.
- Period close state: OPEN / CLOSED / REOPENED / RECLOSED.
- Closing journal and reversal journal references.
- Asset register vs ledger alignment.
- Data quality warnings: unmapped operational data, draft journals, unbalanced journals, stale copy, and period state mismatch.

Do not expose accounting mutation to STAFF or TENANT.


## 0.0 V5.23-B Accounting & Finance Contract

### Admin IA contract

```text
Sidebar = main navigation.
Dashboard = cross-menu command center.
Detail work = respective menu pages with badge filters + clickable rows.
```

Final admin sidebar:

```text
Dashboard
Stays & Tenant
Finance
Staff & Tiket
Kamar & Stok
```

Header-only:
- Pengumuman,
- Bell/Alert,
- Profile/Settings,
- Logout.

No admin top workspace tabs unless explicitly re-approved.

### Finance/accounting contract

Current finance is operational, not formal accounting.

Existing sources:
- `Invoice` / `InvoiceLine` / `InvoicePayment` = rent/utility billing and payment truth.
- `WifiSale` = existing voucher WiFi revenue stream.
- `Expense` = current cost/expense record, still not full accounting classification.
- Stay deposit fields = deposit tracking, but deposit must be treated as liability, not revenue.

Future accounting-ready foundation must support:
- OPEX / COGS / CAPEX classification.
- AncillaryProduct / AncillarySale.
- CashAccount.
- ChartOfAccount.
- JournalEntry / JournalLine.
- Asset register.
- Depreciation.
- Opening balances.
- Balance Sheet readiness validation.

### Balance Sheet guard

Balance Sheet is not valid unless the system can reliably derive:

```text
Assets = Liabilities + Equity
```

Minimum data required:
- cash/bank balances,
- accounts receivable or billing basis,
- inventory/stock where material,
- fixed assets net of depreciation,
- tenant deposit liability,
- payables if used,
- owner capital,
- drawings,
- retained earnings / period result.

Do not show formal ratios if accounting readiness is not complete.

### Ancillary revenue contract

Short-term:
- Keep `WifiSale` running.
- Present voucher WiFi inside Finance as revenue stream.

Medium-term:
- Add generic `AncillaryProduct` and `AncillarySale`.
- WiFi can later be migrated/adapted into generic ancillary reporting.

Recommended categories:
- WIFI_VOUCHER
- LAUNDRY
- WATER_GALLON
- ROOM_CLEANING
- PARKING
- EXTRA_GUEST
- KEY_CARD_REPLACEMENT
- LINEN_RENTAL
- SNACK_DRINK
- MASSAGE_PARTNER
- OTHER

### Expense classification contract

Future `Expense` should classify:

```text
OPEX = operating expense
COGS = direct cost for ancillary/service revenue
CAPEX = asset/capital expenditure
```

CAPEX rule of thumb:
- useful life > 1 year,
- above business threshold,
- should create or update asset register.

### Role boundary

Owner:
- may see Balance Sheet, P&L, Cashflow, asset value, owner capital, liability, finance ratios once ready.

Admin:
- may input operational finance data: invoices, payments, expenses, ancillary sales.
- should not decide owner equity/capital structure unless explicitly allowed.

Staff:
- no sensitive finance/accounting mutation.

Tenant:
- may pay/order/request only; no accounting mutation.


## 0.1 V5.20 First Paid Room Priority Contract

```text
Room priority is first valid payment, not first booking.
A booking/request alone is an interest signal, not a full room lock.
The room is only secured after the required invoice is paid and payment is approved.
```

### 0.1.1 Booking / room priority

| State | Meaning | Tenant/Public copy |
|---|---|---|
| Interest / booking only | Calon tenant berminat, kamar belum terkunci | Pemesanan belum mengunci kamar |
| Admin approved but unpaid | Kamar dapat diberi batas bayar cepat | Bayar & kirim bukti maksimal 3 jam |
| Payment pending review | Tenant sudah bertindak; admin wajib review cepat | Bukti pembayaran sedang diperiksa |
| Payment approved | Prioritas kamar sudah valid | Kamar diamankan |
| Existing tenant late | Tidak ada hak hutang | Kamar dapat ditawarkan kembali |

### 0.1.2 Deadlines

```text
BOOKING_REVIEW_DEADLINE_HOURS = 3
APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS = 3
PAYMENT_REVIEW_URGENT_HOURS = 1
PAYMENT_REVIEW_ESCALATE_HOURS = 3
PAYMENT_REVIEW_MAX_HOURS = 6
INVOICE_URGENT_AFTER_HOURS = 6
INVOICE_DUE_AFTER_HOURS = 24
RENEW_REVIEW_URGENT_HOURS = 3
RENEW_REVIEW_ESCALATE_HOURS = 6
CHECKOUT_REVIEW_URGENT_HOURS = 3
CHECKOUT_REVIEW_ESCALATE_HOURS = 6
CHECKOUT_FINAL_URGENT_HOURS = 6
OLD_TENANT_LATE_VACATE_HOURS = 3
AUTO_OPS_INTERVAL_MINUTES = 5
```

### 0.1.3 Payment contract

Tenant payment must be one combined action:

```text
Bayar & Kirim Bukti
```

The tenant must not experience payment and proof upload as separate flows. The UI must collect amount, payment metadata, and proof file in the same action. Duplicate pending proof remains blocked.

### 0.1.4 Renew contract

Renewal remains admin/core controlled:
- tenant may request renew,
- admin must record meter checkpoint,
- system calculates electricity/water difference,
- renewal invoice includes rent + electricity + water,
- tenant must pay quickly,
- no tenant debt/hutang is allowed.

If the current tenant misses the deadline after contract end/payment due date:
- room may be advertised again,
- if a new tenant validly takes the room, old tenant cannot renew,
- old tenant must vacate within 3 hours.

### 0.1.5 Automation boundary

AutoOps may cancel expired unpaid bookings and release orphan reserved rooms.
AutoOps must not approve payment, approve renew, final checkout, refund deposit, or create official inventory movement.


## 0. Active Architecture Contract

```text
Active architecture: Stable Modular Monolith
Multi-app Shared-DB: future roadmap only
No apps/ generation now
No workspace migration now
No service-to-service HTTP now
No runtime alias mirror hack
```

## 1. Staff Repair Business Contract

### 1.1 Role ownership

| Domain/action | Owner | Contract |
|---|---|---|
| Staff report item condition | STAFF | boleh membuat laporan kondisi lapangan |
| Staff start/finish ticket | STAFF | boleh start dan mark done ticket assigned ke dirinya |
| Final room item status | OWNER/ADMIN | staff tidak menentukan final barang |
| Final warehouse item condition | OWNER/ADMIN | staff tidak menentukan final kondisi fisik barang gudang |
| Inventory health/status stok | SYSTEM | dihitung otomatis dari `qtyOnHand/minQty`, bukan input staff |
| InventoryMovement | OWNER/ADMIN | mutasi stok resmi hanya admin/owner |
| Ticket close/cancel | OWNER/ADMIN | close hanya dari DONE; cancel hanya dari OPEN |
| Staff performance evidence | SYSTEM | tercatat dari report/ticket/checklist flow |

### 1.2 Source of truth

```text
Ticket = process controller.
StaffFieldReport = laporan/diagnosis lapangan.
RoomItem.status = display/final state barang kamar setelah konfirmasi admin.
InventoryItem.status = kondisi fisik/final barang gudang setelah konfirmasi admin.
Inventory health = computed health dari qtyOnHand/minQty.
InventoryMovement = stock/physical truth resmi.
```

### 1.3 Staff may do

- Lihat pekerjaan aktif.
- Lapor kondisi barang kamar.
- Lapor kondisi fisik barang gudang.
- Minta barang pengganti.
- Start ticket assigned.
- Mark done ticket assigned dengan `resolutionNote`.
- Lihat laporan kondisi yang ia buat.
- Mengikuti checklist harian/mingguan/bulanan.
- Tandai pekerjaan rutin sesuai permission yang sudah ada.

### 1.4 Staff must not do

- Menetapkan status final barang.
- Membuat official InventoryMovement.
- Mengubah qty resmi gudang.
- Mengisi manual status stok yang bisa dihitung sistem, seperti “stok habis/menipis”.
- Menutup/cancel ticket.
- Mutate finance/lifecycle sensitive flow.

### 1.5 Admin may do

- Assign staff.
- Review `StaffFieldReport`.
- Approve/reject/needs more info.
- Create official movement if needed.
- Close ticket and set final item status.
- Cancel ticket when still `OPEN`.
- Menangani exception/approval bermakna, bukan konfirmasi semua hal kecil yang bisa dihitung sistem.

## 2. Ticket Lifecycle Contract

```text
OPEN = belum mulai / bisa dibatalkan admin
IN_PROGRESS = sedang dikerjakan staff / mengunci staff dari pekerjaan aktif lain
DONE = staff selesai / menunggu cek admin jika butuh final confirmation
CLOSED = selesai final
CANCELLED = dibatalkan admin
```

Rules:
- Staff can `start` only if no other active work exists.
- Staff can `mark-done` only from `IN_PROGRESS`.
- Admin can `close` only from `DONE`.
- Admin can `cancel` only from `OPEN`.
- CLOSED/CANCELLED should not appear in default staff active list.

## 3. Staff Ticket List Contract

Endpoint:

```text
GET /api/tickets
Roles: OWNER, ADMIN, STAFF
```

For STAFF:
- Default list includes only active work:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- A ticket is visible if:
  - `assignedToId = currentUser.id`, or
  - it has `staffFieldReports.some.reportedByStaffId = currentUser.id`.
- STAFF list must not fallback to `tenantId` because staff user has empty tenantId.

Verified:
- Staff user id = 3.
- Ticket #12 `OPEN`, `assignedToId=3`, `linkedRoomItemId=1` appeared in staff list after V5.16-G.

## 4. Staff Report Endpoints

### Room item report

```text
PATCH /api/room-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Accepted DTO contract currently uses:
- `status`
- `note`
- optional photo fields
- `requestsReplacement`
- `requestedInventoryItemId`
- `requestedQty`

Do not use payload keys:
- `notes`
- `reportedCondition`
- `conditionNotes`

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- sets temporary applied status,
- fills `linkedRoomItemId`,
- does not decide final status.

### Warehouse/inventory report

```text
PATCH /api/inventory-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- fills `linkedInventoryItemId`,
- does not mutate official qty.

Important:
- This endpoint is for physical/field report, not for staff manually marking stock health.
- Stock health such as `Stok habis`, `Stok menipis`, `Stok aman` is computed by UI/system from quantity thresholds.

## 5. StaffFieldReport Contract

Model introduced in V5.16-B.

Fields conceptually:
- ticket link,
- room/roomItem/inventoryItem link,
- reportedByStaff,
- reported condition,
- condition notes/photo evidence,
- request replacement data,
- admin decision,
- related movement if any,
- status.

Admin decisions:
- `APPROVE`
- `REJECT`
- `NEEDS_MORE_INFO`

Report statuses:
- reported/pending,
- under review,
- approved/in repair,
- rejected,
- closed/final.

Use user-facing Indonesian labels in UI. Avoid showing enum names to staff.

## 6. Close Ticket Contract

```text
POST /api/tickets/:id/close
```

Current body uses:

```json
{ "action": "CLOSE" }
```

or

```json
{ "action": "CANCEL" }
```

Optional final fields:
- `finalRoomItemStatus`
- `finalInventoryItemStatus`
- `finalAdminNote`

Do not use `reason`; validation rejects it.

## 7. Core Lifecycle Ownership

| Domain/action | Owner sekarang | Contract |
|---|---|---|
| Stay lifecycle writes | Core monolith | create, renew, complete, cancel |
| Room occupancy/status writes | Core monolith | AVAILABLE/RESERVED/OCCUPIED mutation |
| Manual check-in | Core monolith | creates active stay, invoice, meter, portal user |
| Booking approval | Core monolith | invoice/deposit/pending meter snapshot |
| Renew execution | Core monolith | approve request extends stay and issues invoice |
| Checkout final | Core monolith | complete stay + room release after invoice guard |
| Payment approval | Core monolith | mutates submission/payment/invoice/stay/room/meter/deposit |
| Tenant request/read | Tenant surface in monolith | create/view only, no lifecycle finalization |
| Staff surfaces | Staff surface in monolith | read/operational low-risk; finance/billing writes restricted |
| Marketing/public | Marketing module in monolith | read-only public rooms/detail |

## 8. Tenant Portal Contract — Next Audit Target

Tenant side must follow:

```text
Tenant = My Stay Guide
```

Tenant can:
- melihat status tinggal/sewa,
- melihat tagihan,
- upload bukti pembayaran,
- melihat status payment submission,
- membuat request perpanjangan,
- membuat request keluar/check-out,
- melihat request/ticket miliknya,
- membaca notifikasi/urgency.

Tenant must not:
- approve payment,
- mutate invoice status,
- execute renew lifecycle,
- execute final checkout,
- set room/stay final state,
- mutate finance/lifecycle sensitive flows.

Tenant UI wording must use:
- “Tagihan”
- “Masa sewa”
- “Akhir masa sewa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Bukti pembayaran sedang diperiksa”
- “Tidak perlu upload ulang”
- “Menunggu keputusan admin”

Avoid in tenant UI:
- `stay`
- `periodEnd`
- `checkout request`
- `ISSUED`
- `PENDING_REVIEW`
- `lifecycle`
- `mutation`
- enum mentah/backend terms.

## 9. Locked Business Guards

1. Renewal invoice must be `ISSUED`.
2. Checkout final must be blocked if any invoice for the stay is not `PAID`/`CANCELLED`.
3. `DRAFT` invoice counts as open invoice.
4. `complete()` must not auto-create final utility invoice.
5. Payment approval remains core monolith and atomic.
6. Room status/occupancy writes remain core monolith.
7. Tenant does not execute lifecycle finalization.
8. Staff does not mutate finance/lifecycle-sensitive flows.
9. AI/assistant does not mutate data autonomously.

## 10. UX Contract

General:
- Clean, readable, modern blue system.
- Font weight tidak terlalu tebal.
- Tidak ada low-contrast text.
- Assistant harus memberi prioritas/action, bukan dekorasi.

Staff UI must use:
- “Laporkan kondisi”
- “Menunggu cek admin”
- “Admin meminta info tambahan”
- “Tandai selesai”
- “Pekerjaan selesai, menunggu konfirmasi”
- “Selesai final”

Tenant UI must use:
- “My Stay Guide”
- “Masa sewa”
- “Tagihan aktif”
- “Bukti pembayaran kamu sedang diperiksa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Hubungi admin”

Avoid:
- `FieldReport`
- `StaffPerformanceEvent`
- `PENDING_CHECK`
- `NEEDS_MORE_INFO`
- `linkedRoomItemId`
- `mutation`
- `negative KPI`
- `audit failed`
- tenant-facing enum/backend words.

## 11. AI/Finance Carry-Forward

V5.15 remains active as future track:
- Tier 0 deterministic hooks first.
- AI only on-demand.
- Finance ratios locked until balance-sheet-grade data is reliable.
- No fake ratio.


## 12. V5.20 Carry-Forward Contract

## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Prinsip bisnis utama

```text
Prioritas kamar mengikuti pembayaran valid pertama, bukan siapa yang hanya pesan duluan.
Booking/minat belum mengunci kamar.
Tenant baru hanya boleh bayar setelah kamar siap dihuni.
Tenant lama tidak boleh hutang.
Kalau tenant lama telat melewati batas pembayaran/kontrak dan kamar sudah diambil tenant baru, tenant lama wajib mengosongkan kamar maksimal 3 jam.
```

### Deadline operasional default

| Flow | Deadline default | AutoOps / eskalasi |
|---|---:|---|
| Booking/minat tanpa keputusan admin | 3 jam | Auto-cancel dan kamar dibuka kembali jika tidak ada bukti valid |
| Tagihan awal setelah kamar siap | 3 jam | Auto-cancel booking jika belum bayar + belum kirim bukti |
| Bukti pembayaran pending review | urgent 1 jam, escalate 3 jam, max 6 jam | Tidak auto-cancel tenant yang sudah kirim bukti; naik prioritas admin/owner |
| Invoice aktif tenant berjalan | urgent 6 jam, overdue 24 jam | Renew/checkout tetap blocked sampai lunas |
| Renew request | urgent 3 jam, escalate 6 jam | Admin wajib catat meter dan buat invoice renew utility |
| Checkout request | urgent 3 jam, escalate 6 jam | Admin review cepat; final checkout tetap manual |
| Checkout approved belum final | 6 jam | Owner/Admin melihat room tertahan |
| Tenant lama telat + tenant baru valid | 3 jam | Tenant lama wajib keluar maksimal 3 jam |
| Ticket staff | 24–48 jam | Lebih longgar karena pekerjaan fisik |

### Payment UX contract

```text
Tenant tidak boleh diarahkan "bayar dulu, upload bukti nanti".
Tenant action harus satu langkah: Bayar & Kirim Bukti.
Backend boleh tetap menyimpan upload file dan payment submission secara terstruktur, tetapi frontend harus terasa sebagai satu aksi.
```

### Copy wajib untuk tenant/public

```text
Pemesanan belum mengunci kamar. Kamar baru aman setelah pembayaran lunas dan disetujui admin.
Jika masa sewa habis dan tagihan perpanjangan belum dibayar, kamar dapat ditawarkan kembali.
Jika kamar sudah diambil tenant baru yang membayar valid, perpanjangan tidak dapat dilanjutkan.
Jika kamu telat dan kamar sudah diambil tenant baru, kamu wajib mengosongkan kamar maksimal 3 jam.
Tidak ada sistem hutang.
```

### Batas otomatisasi

Boleh otomatis:
- expired unpaid booking auto-cancel,
- unpaid approved booking auto-cancel,
- orphan RESERVED room auto-release,
- overdue/urgent notification,
- dashboard priority/escalation,
- duplicate/redundant alert dedup.

Tetap manual:
- approve/reject payment,
- approve renew + catat meter,
- final checkout,
- refund/deduction deposit,
- close ticket final,
- inventory movement resmi.


## 0.1 V5.23-B1 Accounting Backend Contract Lock

```text
Current backend remains operational finance.
Formal accounting starts only after additive foundation models and readiness gates exist.
No Balance Sheet or financial ratios may be treated as formal until readiness returns true.
```

### Accounting foundation contract

```text
Required first entities: ChartOfAccount, CashAccount, AccountingPeriod, OpeningBalanceBatch, OpeningBalanceLine, JournalEntry, JournalLine.
OWNER may manage accounting setup. ADMIN may receive limited operational finance/readiness later. STAFF and TENANT receive no accounting route access.
```

### Deposit contract update

```text
Deposit remains liability, not revenue.
Stay deposit fields remain operational snapshot in near term.
Future TenantDepositLedger must be additive and synchronized gradually.
No drop/deprecate of Stay deposit fields until a separate migration plan is approved.
```


## V5.23-B1 ACT Scope Lock — Accounting Foundation Readiness

```text
B1 is a ledger foundation and readiness patch.
B1 is NOT auto-posting.
B1 is NOT formal Balance Sheet.
B1 is NOT deposit migration.
B1 is NOT payment/stay/checkout/renew rewrite.
```

### Schema additions allowed in B1

```text
ChartOfAccount
CashAccount
AccountingPeriod
OpeningBalanceBatch
OpeningBalanceLine
JournalEntry
JournalLine
```

### Backend module additions allowed in B1

```text
src/modules/accounting/accounting.module.ts
src/modules/accounting/accounting.controller.ts
src/modules/accounting/accounting.service.ts
src/modules/accounting/accounting-posting.service.ts
src/modules/accounting/accounting-readiness.service.ts
src/modules/accounting/accounting-reports.service.ts
src/modules/accounting/constants/default-coa.ts
src/modules/accounting/dto/*
```

### Existing files allowed to touch in B1

```text
prisma/schema.prisma
src/app.module.ts
src/modules/reports/reports.service.ts
Optional only if necessary: src/common/enums/app.enums.ts
```

### Files forbidden to touch in B1

```text
src/modules/payment-submissions/payment-submissions.service.ts
src/modules/stays/stays.service.ts
src/modules/checkout-requests/*
src/modules/renew-requests/*
src/modules/tenant-bookings/*
src/modules/invoice-payments/*
src/modules/invoices/*
src/modules/expenses/*
src/modules/wifi-sales/*
```

### B1 endpoint target

```text
GET  /api/accounting/readiness
POST /api/accounting/default-coa/seed
GET  /api/accounting/accounts
POST /api/accounting/accounts
PATCH /api/accounting/accounts/:id
GET  /api/accounting/cash-accounts
POST /api/accounting/cash-accounts
PATCH /api/accounting/cash-accounts/:id
GET  /api/accounting/opening-balances
POST /api/accounting/opening-balances/draft
GET  /api/accounting/journal-entries
GET  /api/accounting/trial-balance
GET  /api/accounting/unmapped-transactions
GET  /api/accounting/balance-sheet
```

### Report honesty rule

```text
Existing reports should include metadata:
- basis: OPERATIONAL_APPROXIMATION
- ledgerBacked: false
- formalStatementReady: false
- readinessNote: current report uses operational invoice/payment/expense data, not formal accounting ledger.
```

## 0.0 Latest Contract Addendum — V5.24-B2/C

### Accounting setup contract

```text
Opening balance is the accounting starting point.
Posting opening balance creates JournalEntry with sourceType=OPENING_BALANCE.
Trial Balance must read posted JournalEntry and avoid double-counting OpeningBalanceLine.
Draft opening balance can be voided.
Posted opening balance must not be voided without a future reversal plan.
```

Rules:
- Only DRAFT opening balance may be voided in current system.
- POSTED opening balance requires a reversal/correction plan before any mutation.
- Duplicate DRAFT for same period/cutover should be blocked after POSTED exists.
- No auto-posting from invoice/payment/expense/stay yet.
- No backfill of old operational transactions yet.
- Balance Sheet can preview opening-balance ledger, but full business financial statements are not complete until operational auto-journal/cutover rules exist.

### Admin UI contract after V5.24-C

```text
Sidebar remains primary admin navigation.
Dashboard remains cross-menu command center.
GlobalSearch is allowed and expected for admin.
Dashboard ticket close action must either actually close DONE tickets or clearly route to review/close flow.
StaysPage filters must match actual query behavior; do not show ALL if backend still filters ACTIVE.
Ancillary revenue page must separate active features from roadmap/future items.
```

Do not reintroduce admin top workspace tabs as primary navigation unless explicitly re-approved.