# KOST48 V5 — Active Checklist
**Versi:** 2026-05-30 M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate Sync

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

## A0. Latest Release Checklist — M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate

### M8O Global UI Action/Responsive + Integrity

- [x] ResourceTable build blocker fixed.
- [x] Proof link fallback `#` removed/guarded.
- [x] Responsive table data-label coverage improved.
- [x] Tenant copy/status cleanup started.
- [x] Invoice/payment/stay/portal query invalidation strengthened.
- [x] Backend date/invoice integrity cleanup packaged.
- [x] Frontend build PASS from user local report.
- [x] Backend build PASS from user local report.
- [x] Base API smoke PASS.

### M8P.1 / M8P.2 UI Smoke Hotfixes

- [x] Responsive table auto-label utility added.
- [x] Tenant `Panduan Kos Saya` copy added.
- [x] Raw booking source labels mapped to human labels.
- [x] StatusBadge title/aria labels added.
- [x] Included in later cumulative frontend build PASS.
- [ ] Full manual browser smoke for every table-heavy page.

### M8Q Business Flow Hardening

- [x] Checkout request approve/reject service guard added.
- [x] Checkout request decisions use conditional status update.
- [x] Approved checkout request syncs planned checkout date.
- [x] Final checkout modal prefill from approved request.
- [x] Invoice/payment/dashboard/portal invalidations expanded.
- [x] Covered by later cumulative backend/frontend builds.
- [ ] Dedicated browser smoke of checkout request modals.

### M8R Renew + Checkout + Deposit

- [x] Final checkout Jakarta date normalization.
- [x] Checkout-before-check-in blocked.
- [x] Final checkout conditional ACTIVE update.
- [x] Deposit settlement transaction + conditional HELD update.
- [x] Deposit deduction/forfeit note requirement.
- [x] Final checkout/deposit checklist UI added.
- [x] Renew/admin route smoke PASS.
- [x] Deposit ledger summary smoke PASS.
- [x] Deposit ledger reconciliation-lite ready=True mismatchCount=0.
- [ ] Manual browser smoke final checkout/deposit modal.

### M8S Inventory + Staff Ops

- [x] InventoryMovement PATCH blocked.
- [x] RETURN_FROM_ROOM locks/validates RoomItem.
- [x] Inventory item response includes position/location summary.
- [x] Movement form validates qty and room context.
- [x] Inventory query invalidations strengthened.
- [x] Staff warehouse copy: staff reports issues/restock, system computes habis/menipis.
- [x] Inventory read smoke PASS.
- [x] Full inventory lifecycle API UAT PASS.
- [x] Return qty 999 blocked HTTP 409.
- [x] Staff official movement blocked HTTP 403.
- [x] Staff warehouse UI direction PASS from screenshot.
- [ ] Manual browser smoke all inventory/staff pages.

### M8T Owner Finance Production Gate

- [x] Owner dashboard finance production gate added.
- [x] Accounting readiness fetch added to owner dashboard.
- [x] Asset readiness fetch added to owner dashboard.
- [x] Deposit as liability/dana titipan copy added.
- [x] Finance gate links to real pages/actions.
- [x] Finance read smoke PASS.
- [x] Accounting readiness ready=True score=100.
- [x] Deposit reconciliation ready=True mismatchCount=0.
- [x] Assets/expenses read smoke PASS.
- [x] Frontend build PASS after M8T.
- [x] Backend build:local PASS after cumulative patches.
- [x] Final read smoke PASS.
- [ ] Restore generated Prisma noise after final backend build.

## A1. Immediate Pre-Commit Checklist

- [ ] Run `git restore backend/src/generated/prisma`.
- [ ] Confirm `git status -sb` no longer lists generated Prisma.
- [ ] Confirm docs updated to M8O–M8T.
- [ ] Commit code changes separately.
- [ ] Commit docs changes separately.
- [ ] Push only after clean git status.

## A2. Next Active Checklist — M9 Full Regression UAT + Production Readiness

- [ ] Public rooms list/detail smoke.
- [ ] Public booking flow smoke.
- [ ] Tenant current stay smoke.
- [ ] Tenant invoices and payment proof smoke.
- [ ] Tenant renew request smoke.
- [ ] Tenant checkout request smoke.
- [ ] Admin booking review smoke.
- [ ] Admin payment review smoke.
- [ ] Admin renew approve/reject smoke.
- [ ] Admin checkout request approve/reject smoke.
- [ ] Final checkout blocker smoke.
- [ ] Deposit settlement smoke.
- [ ] Inventory lifecycle smoke repeat if needed.
- [ ] Staff warehouse/report/ticket smoke.
- [ ] Owner dashboard finance gate smoke.
- [ ] Accounting readiness/asset/expense smoke.
- [ ] Responsive desktop/tablet/mobile smoke.
- [ ] No raw tenant backend terms.
- [ ] No misleading/no-op CTA.
- [ ] No generated Prisma commit.

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

## A0. Latest Release Checklist — M8L–M8N Critical Integrity, Inventory Automation, and Action Integrity

### M8L critical integrity package

- [x] Tenant current stay invoice metadata patch packaged.
- [x] Payment approval row-lock hardening packaged.
- [x] Initial invoice total persistence patch packaged.
- [x] AutoOps invoice cancellation safety patch packaged.
- [x] Deposit FORFEIT zero-deposit guard packaged.
- [x] Invoice query invalidation and DRAFT open UI patch packaged.
- [ ] Backend build PASS after latest M8L critical package applied locally.
- [ ] Targeted payment/invoice/accounting runtime smoke PASS after latest package applied.

### M8L inventory automation

- [x] Official movement requires meaningful note.
- [x] Staff cannot create official InventoryMovement.
- [x] Direct stock quantity edit is blocked by intended flow.
- [x] Opening stock creates official IN movement.
- [x] Backend fallback sync updates qtyOnHand after movement.
- [x] ASSIGN_TO_ROOM syncs gudang stock and room item.
- [x] RETURN_FROM_ROOM validates room stock and syncs gudang/room item.
- [x] Inventory item response includes position/location summary.
- [x] Stock Gudang quick action Pasang/Keluar implemented.
- [x] Barang di Kamar read/condition-oriented flow implemented.
- [x] M8L stock sync API smoke PASS for item id=3.
- [x] M8L inventory manual UI smoke PASS from user screenshots.

### M8L responsive tables

- [x] Responsive table/list package generated.
- [ ] Frontend build PASS after applying responsive package/latest M8N package.
- [ ] Manual PC width smoke.
- [ ] Manual tablet width smoke.
- [ ] Manual mobile width smoke.
- [ ] Confirm no important tables force unreadable sideways layout.

### M8M global IA simplification

- [x] Global search removal package generated.
- [x] Menu/filter separation package generated.
- [x] Redundant helper copy reduction package generated.
- [ ] Frontend build PASS after latest package.
- [ ] Manual UI smoke admin/owner header.
- [ ] Manual UI smoke tenant/public where applicable.

### M8N global action integrity

- [x] Misleading/no-op button cleanup package generated.
- [x] Filter-only controls separated from CTA/menu package generated.
- [x] Section-specific empty state patch generated.
- [x] Human movement labels patch generated.
- [ ] Frontend build PASS after applying M8N.
- [ ] Manual UI smoke Stays & Tenant.
- [ ] Manual UI smoke Renew Requests.
- [ ] Manual UI smoke Invoices.
- [ ] Manual UI smoke Kamar & Stok.
- [ ] Manual UI smoke dashboards/action queues.

## A1. Next Active Checklist — M8O Verification Gate

- [ ] Run frontend build.
- [ ] Run backend build if latest M8L backend patches are applied.
- [ ] Restore generated Prisma noise.
- [ ] Public rooms API smoke.
- [ ] Admin login smoke.
- [ ] Payment review queue smoke.
- [ ] Inventory items smoke.
- [ ] Inventory movements smoke.
- [ ] Room items smoke.
- [ ] Manual UI smoke menu vs filter separation across roles.
- [ ] Manual UI smoke every visible button has real action.
- [ ] Commit code only after build/smoke are acceptable.
- [ ] Commit docs separately after code commit if needed.
- [ ] Push only after clean git status.

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

## A0. Latest Release Checklist — M8G–M8K Command Center Safety Belts

### Completed / code committed

- [x] M8G manual payment accounting posting implemented.
- [x] M8G journaled manual payment update/delete guard implemented.
- [x] M8G PARTIAL_REFUND status fix implemented.
- [x] M8G AccountingSchemaGuard hardcoded path removed.
- [x] M8H admin booking approve checklist implemented.
- [x] M8H admin booking reject endpoint/modal implemented.
- [x] M8I tenant cancelled/rejected booking visibility implemented.
- [x] M8I waiting-room copy shortened.
- [x] M8J approve checkout request modal implemented.
- [x] M8J reject checkout note minimum 8 characters implemented.
- [x] M8K staff report/admin final confirmation UX implemented.
- [x] M8K ticket close / field report review admin note guard implemented.
- [x] Code committed locally as `5c4526f feat(command-center): harden accounting booking checkout and staff safety belts`.

### Verified

- [x] Backend build PASS from user local report after combined M8G–M8K patch.
- [x] M8G manual payment created accounting journal.
- [x] M8G journaled payment PATCH blocked.
- [x] M8G journaled payment DELETE blocked.
- [x] M8J checkout request pending list smoke PASS.
- [x] M8J short reject note blocked 400.
- [x] M8J valid reject PASS.
- [x] M8J valid approve PASS.
- [x] M8J already processed request blocked 409.
- [x] M8K tickets list smoke PASS.
- [x] M8K staff field report queue smoke PASS.
- [x] M8K short final admin note blocked 400.
- [x] M8K valid ticket close PASS.
- [x] Generated Prisma noise restored before code commit.

### Still verify before FULL label

- [ ] M8G deposit PARTIAL_REFUND status runtime smoke when clean candidate exists.
- [ ] M8H admin booking approve/reject runtime smoke.
- [ ] M8I tenant booking/waiting-room API smoke.
- [ ] Manual browser UI smoke for M8H admin booking review.
- [ ] Manual browser UI smoke for M8I tenant booking waiting room.
- [ ] Manual browser UI smoke for M8J checkout request modals.
- [ ] Manual browser UI smoke for M8K staff/admin confirmation screens.
- [ ] Docs sync committed separately.
- [ ] Push to GitHub after docs sync.

## A1. Next Active Checklist — M8L Inventory Movement Safety Belt

### Input/source inspection

- [ ] Inspect latest repo after code commit `5c4526f`.
- [ ] Inspect inventory pages/components.
- [ ] Inspect inventory API client.
- [ ] Inspect backend inventory movement endpoints and guards.
- [ ] Confirm staff cannot create official InventoryMovement.
- [ ] Confirm admin/owner owns official stock movement.

### Frontend safety belt

- [ ] Add confirmation modal before official movement create/update/delete if direct-click exists.
- [ ] Add short checklist for stock truth mutation.
- [ ] Require meaningful note/reason where movement affects official stock.
- [ ] Use concise copy: `Mutasi stok resmi`, `Cek jumlah`, `Cek alasan`, `Simpan mutasi`.
- [ ] Staff copy says `Laporkan kebutuhan barang`, not `Mutasi stok`.
- [ ] Avoid repeated warnings and long paragraphs.

### Backend guard if needed

- [ ] Add backend note validation only if current endpoint accepts sensitive official movement without meaningful context.
- [ ] Keep no schema change unless explicitly approved.
- [ ] Keep no generated Prisma commit.

### Verification

- [ ] Frontend build PASS.
- [ ] Backend build PASS if backend touched.
- [ ] Runtime inventory endpoint smoke.
- [ ] Manual UI smoke admin inventory movement.
- [ ] Manual UI smoke staff inventory report flow.

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

## A0. Latest Release Checklist — M7A–M8F Frontend Safety Belt Packages

### Completed packages

- [x] M7A Tenant Portal Action Center Hardening package generated.
- [x] M7A frontend build PASS.
- [x] M7A backend unchanged.
- [x] M8A Checkout + Deposit Safety Belt package generated.
- [x] M8A frontend build PASS.
- [x] M8A backend unchanged.
- [x] M8B Public Booking Safety Belt package generated.
- [x] M8B frontend build PASS.
- [x] M8B backend unchanged.
- [x] M8C Payment Review Safety Belt package generated.
- [x] M8C frontend build PASS.
- [x] M8C backend unchanged.
- [x] M8D Readability + CTA Dedup package generated.
- [x] M8D frontend build PASS.
- [x] M8D backend unchanged.
- [x] M8E Renew Approval Safety Belt package generated.
- [x] M8E frontend build PASS.
- [x] M8E backend unchanged.
- [x] M8F Invoice Action Safety Belt package generated.
- [x] M8F frontend build PASS.
- [x] M8F backend unchanged.

### Current honest label

```text
M7A–M8F = frontend build PASS packages.
Runtime/API smoke = deferred.
Manual UI smoke = deferred.
FULL PASS = not claimed.
```

### M8D readability rule checklist

- [x] Lock rule: Indonesian users dislike long copy.
- [x] Limit repeated same-destination CTA/link to 1–2 per page.
- [x] Default action/priority list to top 3 items where practical.
- [x] Prefer badges/metrics/short CTAs over long paragraphs.
- [x] Keep tenant/public copy especially short.

## A1. Next Active Checklist — M8G Admin Booking Review Safety Belt

### Input/source inspection

- [ ] Inspect latest M8F frontend ZIP before patching.
- [ ] Identify actual admin booking review page/component files.
- [ ] Identify booking API client and response shape.
- [ ] Confirm current approve/reject booking endpoints.
- [ ] Confirm what room/status/payment fields are available.

### Booking review safety

- [ ] Add risk labels for booking review queue.
- [ ] Explain booking approval does not lock room until valid payment is approved.
- [ ] Add approve confirmation modal if approval currently direct.
- [ ] Add reject reason minimum 8 characters.
- [ ] Keep copy concise and avoid repeated first-paid warnings.
- [ ] Ensure CTA/action repetition stays within 1–2 per page.

### Verification gate for M8G

- [ ] Frontend build PASS.
- [ ] Backend unchanged or build PASS if touched.
- [ ] Runtime smoke booking review endpoint if server available.
- [ ] Manual UI smoke admin booking review queue.
- [ ] No DB reset.
- [ ] No generated Prisma commit.
- [ ] No FULL PASS without runtime + manual verification.

## A2. M9 Targeted Runtime/UI Smoke Checklist

- [ ] Public rooms list smoke.
- [ ] Public room detail smoke.
- [ ] Tenant current stay smoke.
- [ ] Tenant invoices smoke.
- [ ] Tenant payment submissions smoke.
- [ ] Payment review queue smoke.
- [ ] Renew request queue smoke.
- [ ] Checkout request/stay detail smoke.
- [ ] Invoice list/detail smoke.
- [ ] Booking review queue smoke.
- [ ] Manual browser smoke for the main M7A–M8G surfaces.


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



## A0. Latest Release Checklist — M4A Deposit Ledger Backend Foundation

### Completed and pushed

- [x] M3.2 BR5 pure first-paid-wins runtime UAT PASS.
- [x] M3.2 upgraded to FULL runtime UAT PASS.
- [x] M4A backend-first patch implemented.
- [x] `TenantDepositLedgerEntry` schema added.
- [x] Deposit ledger module added.
- [x] Deposit ledger summary endpoint added.
- [x] Deposit ledger reconciliation-lite endpoint added.
- [x] Deposit ledger backfill dry-run endpoint added.
- [x] Payment approval hook creates `PAYMENT_RECEIVED`.
- [x] Deposit settlement hook creates `REFUND` for full refund.
- [x] Backend build PASS from user local report.
- [x] Runtime endpoint smoke PASS.
- [x] Payment hook UAT PASS.
- [x] Settlement hook UAT PASS.
- [x] Cleanup test data PASS.
- [x] Room G2-005 returned AVAILABLE.
- [x] Deposit ledger summary returned empty after cleanup.
- [x] Code pushed as `1b645de feat(deposit): add tenant deposit ledger foundation`.

### Current honest label

```text
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
M4B Frontend Deposit Timeline = not started.
```

## A1. Next Active Checklist — M4B Frontend Deposit Timeline

### Input/source inspection

- [ ] Confirm latest source after commit `1b645de`.
- [ ] Restore generated Prisma noise before frontend work.
- [ ] Inspect current StayDetail/FinanceTab deposit UI.
- [ ] Inspect Tenant My Stay deposit/invoice UI.
- [ ] Inspect Owner/Finance pages where deposit drilldown belongs.
- [ ] Confirm deposit ledger API response shapes.

### Admin UI

- [ ] Add deposit summary card to Stay Detail Finance tab.
- [ ] Add deposit timeline using `/deposit-ledger/stays/:stayId`.
- [ ] Show mismatch warning if reconciliation-lite detects gap.
- [ ] Keep process deposit modal behavior unchanged.
- [ ] Avoid raw enum copy.

### Tenant UI

- [ ] Add tenant-friendly deposit card in My Stay.
- [ ] Use “Deposit kamu sudah diterima”.
- [ ] Use “Deposit sedang ditahan”.
- [ ] Use “Deposit dikembalikan”.
- [ ] Use “Deposit dipotong”.
- [ ] Do not use ledger/liability/mutation/backend enum words.

### Owner/Finance UI

- [ ] Add lightweight deposit summary/drilldown.
- [ ] Show total received/refunded/held from ledger.
- [ ] Link to relevant stay detail where possible.
- [ ] Explain historical backfill candidates honestly.

### Verification

- [ ] Frontend build PASS.
- [ ] Backend deposit-ledger smoke PASS.
- [ ] Manual UI smoke admin stay detail.
- [ ] Manual UI smoke tenant My Stay.
- [ ] Manual UI smoke owner finance deposit drilldown.
- [ ] No backend mutation unless explicitly needed.
- [ ] No generated Prisma commit.


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

## A0. Latest Release Checklist — V5.29-K Controlled Monthly Auto-Close Governance

### Completed and pushed

- [x] Backend build PASS from user local report.
- [x] Frontend build PASS from user local report.
- [x] Auto-close policy endpoint returns basis `PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K`.
- [x] Auto-close mode is `AUTO_MONTHLY_PREVIOUS_PERIOD`.
- [x] Owner manual auto-run endpoint works.
- [x] Owner manual auto-run safe-skips when target previous period is missing.
- [x] AutoOps includes `accountingAutoClose`.
- [x] AutoOps safe-skips accounting close when target period is missing.
- [x] ADMIN manual auto-run is blocked with 403.
- [x] Owner manual period close without reason is blocked with 400.
- [x] Manual close reason must be at least 8 characters.
- [x] Frontend accounting UI exposes controlled monthly auto-close copy/action.
- [x] Generated Prisma restored before commit.
- [x] Code commit pushed: `7c8c8e7 feat(accounting): add controlled monthly auto close governance`.

### Verified but not FULL actual-close

- [x] Safe-skip behavior PASS.
- [x] Role guard PASS.
- [x] Validation guard PASS.
- [x] AutoOps integration PASS.
- [ ] Actual auto-close closed=true with created CLOSING_ENTRY journal.
- [ ] Duplicate auto-close after closed=true skips/blocks safely.
- [ ] Manual UI browser smoke after K if user wants visual confirmation.

### Current honest label

```text
V5.29-K PASS — Controlled auto-close governance, safe-skip, role guard, build, and push verified.
Actual closed=true scenario deferred until previous OPEN period exists and readiness is complete.
```

## A1. Next Active Checklist — M1 Tenant My Stay Guide Full Audit

### Input/source inspection

- [ ] Confirm latest frontend/backend source after commit `7c8c8e7`.
- [ ] Inspect real tenant routes and components.
- [ ] Identify tenant API clients/hooks.
- [ ] Identify current navigation/sidebar/header behavior for TENANT.
- [ ] Check actual endpoint names before writing smoke commands.

### Tenant page audit

- [ ] Portal home / tenant dashboard.
- [ ] My Stay page.
- [ ] My Invoices page.
- [ ] Tenant Invoice Detail.
- [ ] Payment proof upload.
- [ ] Payment under review state.
- [ ] Renew request flow.
- [ ] Checkout request flow.
- [ ] My Tickets / tenant complaint flow.
- [ ] Tenant notifications / payment urgency chip.
- [ ] Tenant booking continuation if relevant.
- [ ] Tenant profile/room summary if relevant.

### Tenant business-rule audit

- [ ] Tenant cannot approve payment.
- [ ] Tenant cannot execute lifecycle finalization.
- [ ] Tenant cannot final-checkout directly.
- [ ] Tenant can create/view renew request only.
- [ ] Tenant can create/view checkout request only.
- [ ] Payment approval remains admin/core monolith.
- [ ] Renew approval/execution remains admin/core monolith.
- [ ] Checkout final blocked by open invoice.
- [ ] Duplicate proof upload hidden/blocked if pending review exists.
- [ ] Open invoice blocks renew/checkout where intended by current rules.

### Tenant UX/microcopy audit

- [ ] Use “Tagihan”, not invoice where tenant-facing Indonesian is expected.
- [ ] Use “Masa sewa”, not stay/period.
- [ ] Use “Akhir masa sewa”.
- [ ] Use “Ajukan perpanjangan”.
- [ ] Use “Ajukan keluar”.
- [ ] Use “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- [ ] Avoid enum names: `ISSUED`, `PENDING_REVIEW`, `DRAFT`, etc.
- [ ] Avoid backend jargon: lifecycle, mutation, payment submission.
- [ ] No low-contrast text.
- [ ] Font weight readable, not overly thick.
- [ ] Modern blue system consistent with admin/staff finance UI.


## A0. Latest Release Checklist — V5.29-C/D Lifecycle Hotfix

### Completed and pushed

- [x] B1 Deposit partial refund under-processing rejected.
- [x] B1 Valid partial refund with deduction + refund equal to full deposit accepted.
- [x] B2 `agreedRentAmountRupiah=0` preserved.
- [x] B3 `invoiceCount` total fixed.
- [x] B3 `openInvoiceCount` filtered by not PAID/CANCELLED fixed.
- [x] B3 DRAFT invoice counts as open.
- [x] B4 Renew requestedTerm applied on approve.
- [x] B5 Checkout notification uses requestedCheckOutDate.
- [x] B7 Admin checkout request list returns `data.items`.
- [x] HOTFIX2 checkout UTC date precision PASS on fresh data.
- [x] HOTFIX3 renew UTC date precision PASS on fresh data.
- [x] HOTFIX4 tenant blocker microcopy cleaned.
- [x] F2 approve renew cache invalidation manual UI PASS.
- [x] Backend build PASS from user local report.
- [x] Frontend build PASS from user local report.
- [x] Runtime smoke owner/public/notifications/payment-review PASS.
- [x] No generated Prisma committed.
- [x] Code commit pushed: `f6af6fc fix(lifecycle): harden deposit renew checkout data integrity`.

### Current outstanding

- [ ] Decide/commit docs sync separately from code hotfix.
- [ ] Run `git status -sb` and ensure only intentional docs changes remain.

## A1. Next Active Checklist — V5.29-E Admin Check-In + Invoice Hygiene

### F1 — check-in pricing terms

- [ ] Inspect actual backend pricing term enum.
- [ ] Confirm exact semester spelling: `SEMESTERLY` or `SMESTERLY`.
- [ ] Add BIWEEKLY to admin check-in wizard if supported.
- [ ] Add semester term using exact backend enum value.
- [ ] Add YEARLY to admin check-in wizard.
- [ ] Ensure payload sends enum value, not display label.
- [ ] Verify manual check-in with each added term.

### B6 — DRAFT invoice cancellation reversal hygiene

- [ ] Inspect invoice cancellation service.
- [ ] Confirm DRAFT invoice has no posted accounting journal.
- [ ] Skip reversal for DRAFT invoice.
- [ ] Keep controlled reversal for journaled invoice cancellation.
- [ ] Do not silently swallow critical accounting reversal failures for journaled cancellation.
- [ ] Verify DRAFT cancel succeeds without reversal.
- [ ] Verify journaled cancellation behavior.

### V5.29-E release gate

- [ ] Backend build PASS if backend touched.
- [ ] Frontend build PASS if frontend touched.
- [ ] Runtime API UAT PASS for touched flows.
- [ ] Manual UI smoke for check-in pricing term dropdown.
- [ ] No DB reset.
- [ ] No generated Prisma commit.
- [ ] No unrelated docs/code changes.

## A0. Latest Release Checklist — V5.29-B9A/B9B

### B9A completed

- [x] Statement command center created.
- [x] Trial Balance / Balance Sheet / P&L / Asset / Period Close visible in one owner-readable cockpit.
- [x] Period close/reopen/re-close timeline added.
- [x] Journal audit trail summary added.
- [x] Data quality/readiness panel added.
- [x] Finance navigation improved to Laporan Keuangan.
- [x] Frontend build PASS.
- [x] Runtime accounting API smoke PASS.
- [x] Manual UI smoke PASS.
- [x] Backend unchanged.
- [x] Commit pushed: `51eba86 feat(accounting): add statement command center finance cockpit`.

### B9B completed from runtime/API perspective

- [x] Readiness warning no longer says stale B1/B2/no-auto-posting when ledger ready.
- [x] Trial Balance formalStatementReady=true and balanced.
- [x] Balance Sheet ready=true, formalStatementReady=true, balanced.
- [x] P&L formalStatementReady=true and excludes closing/reversal.
- [x] Period Close remains CLOSED with `JE-CLOSE-2026-05-V2`.
- [x] Unmapped operational count = 0.
- [x] Draft journal count = 0.
- [x] Unbalanced posted journal count = 0.
- [x] Depreciation posted.
- [x] Asset alignment safe.

### B9B still needs local release confirmation

- [ ] Backend build PASS after B9B if backend touched.
- [ ] Frontend build PASS after B9B if frontend touched.
- [ ] Generated Prisma restored before commit.
- [ ] B9B commit created.
- [ ] B9B push completed.
- [ ] Git status clean.

## A1. Next Active Checklist — V5.29-C Critical Lifecycle/Data Integrity Hotfix

### B1 — Deposit partial refund guard

- [ ] Inspect `processDeposit()` implementation.
- [ ] Identify action enum/value for PARTIAL_REFUND.
- [ ] Add guard: deduction + refund must equal deposit amount.
- [ ] Keep over-processing guard.
- [ ] Add clear error message for under-processing.
- [ ] Verify full refund valid.
- [ ] Verify full deduction valid.
- [ ] Verify exact partial refund valid.
- [ ] Verify under partial refund rejected.
- [ ] Verify over refund rejected.

### B2 — agreedRentAmountRupiah zero-value fix

- [ ] Inspect `create()` stay rent fallback.
- [ ] Replace `||` with `??` where explicit zero should be preserved.
- [ ] Compare with `renewStay` behavior.
- [ ] Verify create stay with rent 0 remains 0.
- [ ] Verify create stay without rent uses resolved room rent.
- [ ] Verify create stay with normal rent uses DTO value.

### B3 — invoiceCount vs openInvoiceCount

- [ ] Inspect `stays-query.service.ts`.
- [ ] Ensure `invoiceCount` returns total invoices.
- [ ] Ensure `openInvoiceCount` filters status not PAID/CANCELLED.
- [ ] Verify DRAFT counts as open.
- [ ] UAT stay with PAID/ISSUED/CANCELLED invoices returns expected counts.

### V5.29-C release gate

- [ ] Backend build PASS.
- [ ] Runtime API UAT PASS for B1/B2/B3.
- [ ] No frontend build required unless frontend touched.
- [ ] No DB reset.
- [ ] No generated Prisma commit.
- [ ] No unrelated docs update unless user asks.
- [ ] Git status clean after push.

## A2. Next Checklist — V5.29-D Renew/Checkout Consistency Hotfix

### B4 — requestedTerm renew approve

- [ ] Inspect renew request model/DTO for requestedTerm field.
- [ ] Inspect `approveRequest()` mapping to `RenewStayDto`.
- [ ] Pass requestedTerm into renew execution.
- [ ] Verify renewed stay term changes when request approved with new term.
- [ ] Verify renewal invoice uses approved term.

### B5 — checkout notification date

- [ ] Inspect checkout request notification creation.
- [ ] Replace primary date with requestedCheckOutDate.
- [ ] Keep plannedCheckOutDate only as secondary context if needed.
- [ ] Verify owner/admin notification shows requested date.

### B7 — checkout response consistency

- [ ] Inspect controller return shape.
- [ ] Check frontend API expectation.
- [ ] Avoid double wrapper if global interceptor exists.
- [ ] Patch frontend reader if backend shape changes.
- [ ] Verify checkout list renders.

### F2 — approve renew cache invalidation

- [ ] Inspect TanStack Query keys for renew/stay/checkout.
- [ ] Invalidate admin-checkout-requests after approve renew.
- [ ] Invalidate stay detail/list if needed.
- [ ] Verify StayDetail/admin request state refreshes.

## A3. Next Checklist — V5.29-E Check-In + Invoice Hygiene

### F1 — check-in pricing terms

- [ ] Inspect backend pricing term enum spelling.
- [ ] Confirm whether term is `SEMESTERLY` or `SMESTERLY`.
- [ ] Add BIWEEKLY to wizard dropdown.
- [ ] Add semester term using exact backend enum.
- [ ] Add YEARLY.
- [ ] Verify payload sends exact enum value.

### B6 — DRAFT invoice cancellation reversal hygiene

- [ ] Inspect invoice cancellation service.
- [ ] Skip reversal for DRAFT invoice.
- [ ] Keep controlled reversal for journaled invoice.
- [ ] Stop silently swallowing critical accounting reversal errors for journaled cancellation.
- [ ] Verify DRAFT cancel succeeds without reversal.
- [ ] Verify journaled cancel reversal behavior.

## A4. Product Timeline After Hotfixes

- [ ] M1 Tenant My Stay Guide Full Audit.
- [ ] M2 Tenant Payment/Renew/Checkout UX Hardening.
- [ ] M3 AutoOps + First-Paid Runtime UAT.
- [ ] M4 Deposit Ledger Detail.
- [ ] M5 Cashflow Statement + Owner Finance Trend.
- [ ] M6 OPEX/COGS/CAPEX Classification.
- [ ] M7 Ancillary Revenue System.
- [ ] M8 Global Data Quality Center.
- [ ] M9 Unified Command Center.
- [ ] M10 Production Readiness.


## A0. Latest Release Checklist — V5.27-B7 / V5.28-B8

### Completed

- [x] B6 fixed asset ledger alignment pushed as `182057b`.
- [x] B7 period close retained earnings workflow pushed as `ff2008f`.
- [x] B8 closed period governance workflow pushed as `5c38672`.
- [x] B8 manual closed period guard fix pushed as `286e512`.
- [x] Working tree clean after push: `## main...origin/main`.
- [x] Period close readiness returned ready/canPost.
- [x] Period close preview balanced.
- [x] Period close post succeeded.
- [x] Duplicate close blocked.
- [x] Reopen preview balanced.
- [x] Reopen/reversal succeeded.
- [x] Re-close V2 succeeded.
- [x] Duplicate close after re-close blocked.
- [x] Trial Balance after re-close balanced.
- [x] Balance Sheet after re-close balanced.
- [x] P&L after close/reopen remains operational/readable.
- [x] Generated Prisma restored before commit.

### Still verify when starting next chat

- [ ] Run `git status -sb`.
- [ ] Run `git log --oneline -5`.
- [ ] Confirm latest commit `286e512` is at `HEAD`, `origin/main`, and `origin/HEAD`.
- [ ] Confirm frontend build status from local environment if needed.
- [ ] Do not claim a new PASS without fresh build/smoke for the new patch.

## A0.1 Next Active Checklist — V5.29-B9 Accounting Data Quality & Statement Command Center

### B9 input/source inspection

- [ ] Inspect current repo/ZIP after `286e512`.
- [ ] Identify actual accounting frontend components.
- [ ] Identify current Finance navigation.
- [ ] Identify stale copy that still says B1/B2/no auto-posting.
- [ ] Confirm current accounting endpoints and response shapes.
- [ ] Confirm whether backend read-only aggregation is needed.

### B9 frontend goals

- [ ] Create or improve statement command center panel.
- [ ] Show Trial Balance, Balance Sheet, P&L, Asset Register, Period Close status in one owner-readable cockpit.
- [ ] Add period close/reopen timeline.
- [ ] Add journal audit trail summary.
- [ ] Add data quality/readiness warnings.
- [ ] Explain OPEN vs CLOSED vs REOPENED/RECLOSED period state.
- [ ] Explain current profit vs Retained Earnings clearly.
- [ ] Make CTAs direct: Lihat Trial Balance, Lihat Balance Sheet, Lihat P&L, Tutup/Buka Ulang Periode.
- [ ] Keep UI clean, readable, blue, and not decorative.

### B9 backend optional

- [ ] Add read-only `statement-command-center` endpoint only if frontend currently needs too many separate queries.
- [ ] Add read-only period close history endpoint only if existing data is not enough.
- [ ] Do not add new mutation unless explicitly required and planned.
- [ ] Do not change payment/stay/renew/checkout.

### B9 smoke

- [ ] Backend build if backend touched.
- [ ] Frontend build if frontend touched.
- [ ] Login admin/owner.
- [ ] Smoke accounting readiness.
- [ ] Smoke trial balance.
- [ ] Smoke balance sheet.
- [ ] Smoke profit-loss.
- [ ] Smoke period close readiness/history.
- [ ] Manual UI smoke Finance command center.

### B9 must not do

- [ ] Do not reset DB.
- [ ] Do not commit generated Prisma.
- [ ] Do not add dark mode.
- [ ] Do not create apps/microservices.
- [ ] Do not modify payment/stay/renew/checkout lifecycle.
- [ ] Do not hide unresolved data quality issues.
- [ ] Do not show fake ratios if data is not ready.


## A0. V5.23-B Accounting & Balance Sheet Foundation Checklist

### Input / planning

- [ ] Collect and compare all external AI plans.
- [ ] Inspect latest frontend ZIP.
- [ ] Inspect latest backend ZIP.
- [ ] Inspect current active docs.
- [ ] Identify docs/code out of sync.
- [ ] Confirm latest package applied:
  - `frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip`
  - `backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip`

### Build gate before calling PASS

- [ ] Frontend build:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
  ```
- [ ] Backend build if touched:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
  ```
- [ ] Runtime/API smoke with Invoke-RestMethod only.
- [ ] Manual UI smoke.
- [ ] No unrelated changes.
- [ ] No generated Prisma noise accidentally committed.
- [ ] No DB reset unless user explicitly asks.

### Accounting design checklist

- [ ] Map existing Invoice / InvoiceLine / InvoicePayment into accounting concepts.
- [ ] Map existing WifiSale into revenue stream.
- [ ] Map existing Expense into OPEX/COGS/CAPEX proposal.
- [ ] Map deposit into liability.
- [ ] Identify current data missing for Balance Sheet.
- [ ] Design minimal Chart of Accounts for kos.
- [ ] Design CashAccount and opening balance.
- [ ] Design JournalEntry and JournalLine.
- [ ] Design Asset and AssetDepreciation.
- [ ] Design AncillaryProduct and AncillarySale.
- [ ] Define cutover strategy for old data.
- [ ] Define revenue recognition rules.
- [ ] Define expense/capex/cogs rules.
- [ ] Define Balance Sheet formula/data source.
- [ ] Define Owner-only finance statement screens.
- [ ] Define Admin operational finance screens.
- [ ] Define UAT cases.

### Must not do

- [ ] Do not fake accounting statements.
- [ ] Do not treat deposit as revenue.
- [ ] Do not show formal ratios before readiness.
- [ ] Do not overbuild full accounting before readiness and cutover are clear.
- [ ] Do not create a separate Reports sidebar item until reporting is concrete.
- [ ] Do not create microservices.
- [ ] Do not add dark mode.
- [ ] Do not add frontend dependencies unless explicitly approved.


## A0. V5.20 First Paid AutoOps Checklist

### Source / install

- [ ] Apply `backend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`.
- [ ] Apply `frontend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`.
- [ ] Confirm no unrelated file changes.
- [ ] Confirm generated Prisma noise is not accidentally committed.
- [ ] If local DB has old indexes/UAT data, reset/bootstrap dev DB only.

### Build gate

- [ ] Backend build:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
  ```
- [ ] Frontend build:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
  ```

### Backend AutoOps UAT

- [ ] Booking/minat expired > 3 jam tanpa proof auto-cancel.
- [ ] Room kembali AVAILABLE setelah expired unpaid booking.
- [ ] Approved booking unpaid > 3 jam auto-cancel.
- [ ] Pending review payment tidak auto-cancel.
- [ ] Payment rejected after deadline auto-cancels booking if no other pending proof.
- [ ] Orphan RESERVED room auto-release.
- [ ] First valid approved payment cancels competing unpaid interests.
- [ ] AutoOps endpoints respond for OWNER/ADMIN only.
- [ ] AutoOps does not approve payment/renew/checkout/deposit.

### Tenant UI UAT

- [ ] Public/tenant copy says booking does not lock room before valid approved payment.
- [ ] All payment CTAs open one-step `Bayar & Kirim Bukti`.
- [ ] No separate confusing “pay now then upload later” flow.
- [ ] Pending proof shows “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- [ ] Expired booking shows “Pemesanan kedaluwarsa” and CTA pilih kamar lain.
- [ ] Renew copy warns no debt and room can be offered again if late.
- [ ] Late tenant special warning has stronger emphasis and clear action.

### Admin/Owner UI UAT

- [ ] Admin dashboard shows fast SLA 3 jam.
- [ ] Owner dashboard shows AutoOps business impact.
- [ ] Payment review prioritizes urgent proof.
- [ ] Repeated assistant/alert copy is deduped.
- [ ] Special urgent cases use stronger emphasis and action.
- [ ] Renew meter checkpoint UI remains clear.
- [ ] Checkout readiness UI remains clear.


## A. Start Hygiene

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
  ```
- [ ] Confirm working tree state.
- [ ] Confirm branch.
- [ ] PowerShell only.
- [ ] API tests use `Invoke-RestMethod`.
- [ ] No DB reset unless user explicitly asks.
- [ ] No new `.md` docs unless user asks.
- [ ] No multi-app/workspace migration.
- [ ] No new dependency without PLAN/approval.
- [ ] Do not claim PASS without build + verification.
- [ ] No dark mode.
- [ ] No production mutation.
- [ ] No UAT script file unless user explicitly asks.
- [ ] Do not accidentally commit generated Prisma noise.

## B. Verified Staff State

- [x] V5.16-G Staff repair flow released/pushed.
- [x] Staff report barang kamar uses “Laporkan Kondisi” mental model.
- [x] Staff does not decide final item status.
- [x] Admin/owner controls final item status.
- [x] InventoryMovement remains admin/owner.
- [x] `StaffFieldReport` exists.
- [x] Admin review queue exists.
- [x] Admin review supports APPROVE / REJECT / NEEDS_MORE_INFO.
- [x] Staff report room item fills fresh `linkedRoomItemId`.
- [x] Staff report inventory item fills fresh `linkedInventoryItemId`.
- [x] Ticket lifecycle manual UAT passed for ticket 6/7.
- [x] Fresh linking manual UAT passed for ticket 8/9.
- [x] Staff active list manual UAT passed after V5.16-G with ticket 12.
- [x] Ticket close body uses `action`, not `reason`.
- [x] UAT commands kept in chat, not files.
- [x] V5.17-B clean blue staff UI direction applied.
- [x] Staff room cards clickable and duplicate CTA removed.
- [x] V5.17-C inventory health computed from qty/minQty.
- [x] Staff no longer chooses stock habis/menipis manually in warehouse UI.
- [x] V5.17-D checklist harian/mingguan/bulanan restored as professional work cards.
- [x] User manually checked V5.17-D and said PASS.
- [x] Latest staff polish pushed as commit `484a288`.
- [x] Working tree clean after generated Prisma restore.

## C. Next Active Checklist — Tenant Side Full Audit

### C1. Input/source inspection

- [ ] Confirm latest frontend/backend ZIP or repo source is available.
- [ ] Inspect real file structure before planning patch.
- [ ] Identify tenant routes and components.
- [ ] Identify tenant API clients/hooks.
- [ ] Identify current navigation/sidebar/header behavior for TENANT.
- [ ] Check actual endpoint names before writing smoke commands.

### C2. Tenant page audit

- [ ] Portal home / tenant dashboard.
- [ ] My Stay page.
- [ ] My Invoices page.
- [ ] Tenant Invoice Detail.
- [ ] Payment proof upload.
- [ ] Payment under review state.
- [ ] Renew request flow.
- [ ] Checkout request flow.
- [ ] My Tickets / tenant complaint flow.
- [ ] Tenant notifications / payment urgency chip.
- [ ] Tenant booking continuation if relevant.
- [ ] Tenant profile/room summary if relevant.

### C3. Tenant business rules

- [ ] Tenant cannot approve payment.
- [ ] Tenant cannot execute lifecycle finalization.
- [ ] Tenant cannot final-checkout directly.
- [ ] Tenant can create/view renew request only.
- [ ] Tenant can create/view checkout request only.
- [ ] Payment approval remains admin/core monolith.
- [ ] Renew approval/execution remains admin/core monolith.
- [ ] Checkout final blocked by open invoice.
- [ ] Duplicate proof upload hidden/blocked if pending review exists.
- [ ] Open invoice blocks renew/checkout where intended by current rules.

### C4. Tenant UX/microcopy

- [ ] Use “Tagihan”, not invoice where tenant-facing Indonesian is expected.
- [ ] Use “Masa sewa”, not stay/period.
- [ ] Use “Akhir masa sewa”.
- [ ] Use “Ajukan perpanjangan”.
- [ ] Use “Ajukan keluar”.
- [ ] Use “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- [ ] Avoid enum names: `ISSUED`, `PENDING_REVIEW`, `DRAFT`, etc.
- [ ] Avoid backend jargon: lifecycle, mutation, payment submission.
- [ ] No low-contrast text.
- [ ] Font weight readable, not overly thick.
- [ ] Modern blue system consistent with staff UI.

### C5. Tenant assistant/rule intelligence

- [ ] Assistant card for payment pending review.
- [ ] Assistant card for unpaid/open/overdue invoice.
- [ ] Assistant card for near end of lease.
- [ ] Assistant card for renew request pending.
- [ ] Assistant card for checkout request pending.
- [ ] Assistant card for checkout blocked by open invoice.
- [ ] Assistant card for no active stay / no invoice empty state.
- [ ] Assistant card for open ticket/request status.
- [ ] Assistant is not decorative; every message has next action or clear expectation.

### C6. PLAN output required before ACT

- [ ] Executive summary.
- [ ] Current tenant frontend map.
- [ ] Current tenant API/data map.
- [ ] Gap analysis.
- [ ] Exact files to touch/create.
- [ ] Backend unchanged/needed decision.
- [ ] Risk list.
- [ ] ACT plan.
- [ ] Build/smoke commands.

## D. Build / Release Gate

Backend if touched:

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
  ```
- [ ] Backend build PASS.

Frontend if touched:

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
  ```
- [ ] Frontend build PASS.

Tenant smoke must use PowerShell/Invoke-RestMethod only. Do not use curl.

## E. Carry-Forward V5.15 Backlog

- [ ] Dashboard dedup + sidebar simplification.
- [ ] Tier 0 rule intelligence hooks.
- [ ] Reports drill-down.
- [ ] Smart chart system.
- [ ] Finance readiness.
- [ ] AI on-demand only after Tier 0.

## F. Deferred

- [ ] Multi-app shell.
- [ ] Workspace migration.
- [ ] Service-to-service HTTP.
- [ ] WebSocket/realtime.
- [ ] Payment gateway.
- [ ] Autonomous AI approval.
- [ ] Production DB mutation.
- [ ] Dark mode.


## A0.1 V5.23-B1 Pre-ACT Backend Accounting Checklist

### Completed before ACT

- [x] Backend clean ZIP received: `backend_latest_for_accounting_act_CLEAN.zip`.
- [x] Clean ZIP excludes `node_modules`, `dist`, `.git`, `.env`.
- [x] ChatGPT verified backend snapshot is valid for ACT.
- [x] Backend audit confirmed no AccountingModule and no COA/cash/opening balance/journal models.
- [x] Cline verdict reviewed: CONDITIONALLY READY.
- [x] ChatGPT verdict: READY FOR ACT B1 with additive-only scope.
- [x] B1 allowed and forbidden files locked.
- [x] Deposit roadmap corrected: do not remove/deprecate Stay deposit fields yet.

### Must do during ACT B1

- [ ] Add ChartOfAccount.
- [ ] Add CashAccount.
- [ ] Add AccountingPeriod.
- [ ] Add OpeningBalanceBatch / OpeningBalanceLine.
- [ ] Add JournalEntry / JournalLine.
- [ ] Add AccountingModule.
- [ ] Add default COA seed.
- [ ] Add accounting readiness endpoint.
- [ ] Add accounts and cash accounts CRUD minimal.
- [ ] Add opening balance draft structure.
- [ ] Add journal list/trial balance draft.
- [ ] Add unmapped transaction scanner.
- [ ] Add balance-sheet endpoint that returns `ready=false` until accounting readiness passes.
- [ ] Add operational approximation metadata to existing reports.
- [ ] Register AccountingModule in app.module.ts.

### Must NOT do during ACT B1

- [ ] Do not touch payment submission approval logic.
- [ ] Do not touch stays complete/final checkout logic.
- [ ] Do not touch checkout request logic.
- [ ] Do not touch renew request logic.
- [ ] Do not touch tenant booking lifecycle.
- [ ] Do not touch invoice payment mutation logic.
- [ ] Do not add auto-posting yet.
- [ ] Do not add TenantDepositLedger yet.
- [ ] Do not add AssetRegister, Depreciation, or AncillarySale yet.
- [ ] Do not remove/deprecate existing Stay deposit fields.
- [ ] Do not claim Balance Sheet valid.
- [ ] Do not DB reset.

### Required verification after ACT B1

- [ ] `npx prisma generate`
- [ ] `npm run build:local`
- [ ] public rooms smoke
- [ ] admin login smoke
- [ ] existing finance business-health smoke
- [ ] accounting readiness smoke
- [ ] default COA seed smoke
- [ ] accounts list smoke
- [ ] trial balance smoke
- [ ] final backend ZIP generated
- [ ] frontend unchanged ZIP generated if frontend not touched

## A0. Latest Release Checklist — V5.24-B2/C

### Completed

- [x] V5.23-B1B accounting foundation pushed.
- [x] V5.24-B2A opening balance setup workflow pushed.
- [x] V5.24-B2B setup hardening pushed.
- [x] V5.24-B2C draft void pushed.
- [x] V5.24-C admin UI critical hardening pushed.
- [x] Opening balance posted.
- [x] Trial Balance balanced non-zero.
- [x] Draft duplicate voided.
- [x] Public rooms smoke passed.
- [x] Tickets smoke passed.
- [x] Generated Prisma not committed.

### Must do before any next commit

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status -sb
  ```
- [ ] If generated Prisma appears:
  ```powershell
  git restore --staged backend/src/generated/prisma
  git restore backend/src/generated/prisma
  ```
- [ ] Confirm no unrelated local changes.
- [ ] Do not claim PASS without build/smoke relevant to the patch.

## A0.1 Next Active Checklist — V5.24-D Admin UI Architecture + Performance

- [ ] Inspect latest source after `cb93fe6`.
- [ ] Confirm admin GlobalSearch visible.
- [ ] Confirm dashboard ticket close flow still works or is clearly routed.
- [ ] Audit dashboard loading condition and 13 query blocking.
- [ ] Consolidate or reduce overlapping stays/bookings query only if safe.
- [ ] Decide RoleWorkspaceTabs: remove dead code or keep explicitly deferred.
- [ ] Add/restore admin sidebar context card if useful and not cluttered.
- [ ] Replace fake progress percentages with meaningful counts or real denominator metrics.
- [ ] Keep sidebar primary; do not reintroduce top nav tabs without approval.
- [ ] Keep AncillaryRevenuePage operational, not roadmap-heavy.
- [ ] Frontend build PASS.
- [ ] API smoke: tickets + public rooms.
- [ ] Git clean after push.