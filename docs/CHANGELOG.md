# KOST48 V5 — Changelog
**Versi:** 2026-05-26 V5.28-B8 Pushed + Next Plan B9


## 0.0 Latest Current State — V5.28-B8 Pushed + Next Plan B9

```text
Current GitHub latest commit:
286e512 fix(accounting): block manual edits in closed period governance

Recent accounting release chain:
a72eabe fix(accounting): balance sheet contra asset presentation
182057b feat(accounting): add fixed asset ledger alignment workflow
ff2008f feat(accounting): add period close retained earnings workflow
5c38672 feat(accounting): add closed period governance workflow
286e512 fix(accounting): block manual edits in closed period governance

Status:
- main is pushed to origin/main through 286e512.
- Working tree is clean: ## main...origin/main.
- V5.27-B7 Period Close + Retained Earnings runtime UAT PASS.
- V5.28-B8 Closed Period Governance + Reopen/Reversal runtime UAT PASS.
- Accounting period 2026-05 was closed, reopened through CLOSING_REVERSAL, then re-closed as JE-CLOSE-2026-05-V2.
- Duplicate close after re-close is blocked with "Accounting period 2026-05 sudah CLOSED."
- Trial Balance after re-close: Debit 34.170.000 = Kredit 34.170.000.
- Balance Sheet after re-close: Assets 29.915.000 = Liabilities + Equity 29.915.000; difference 0.
- P&L remains operational/readable after close/reopen because CLOSING_ENTRY and CLOSING_REVERSAL are excluded by default.
- Generated Prisma was restored before commit; do not commit backend/src/generated/prisma unless explicitly decided.
```

### Important local hygiene

```text
After every npx prisma generate, backend/src/generated/prisma may be modified locally.
Generated Prisma must be restored before commit unless explicitly decided.
Run before commit:
git restore --staged backend/src/generated/prisma
git restore backend/src/generated/prisma
git status -sb
```

### Next official planning focus

```text
PLAN V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening

Why:
B1-B8 moved KOST48 from operational finance into a ledger-backed accounting foundation:
- COA, cash account, accounting period, opening balance, journal entry/line.
- Auto journal visibility, statement lite, deposit/reversal visibility.
- Asset register, depreciation, fixed asset ledger alignment.
- Period close to Retained Earnings.
- Closed period governance with reopen/reversal and re-close versioning.

Remaining gap:
Owner/finance UI now needs a stronger statement command center and audit/data-quality layer so the numbers are readable, explainable, and safe for business use. Some older UI copy/checklist wording still says "B1/B2" or "no auto-posting" and should be refreshed so docs/UI do not confuse the owner.

B9 should be frontend-first with small backend read-only additions only if needed.
```

### Source-of-truth note

```text
This section supersedes old V5.24-C/V5.24-D top-of-file state.
Older sections below remain as historical record, not the current release state.
For coding, inspect the latest repo/ZIP first. If docs and code differ, write "docs/code out of sync" and follow real code.
```

## 2026-05-26 — V5.28-B8 Closed Period Governance + Reopen/Reversal

### Type

Backend accounting governance + frontend period close UI hardening.

### Added / Changed

- Added `JournalSourceType.CLOSING_REVERSAL`.
- Added reopen metadata fields to `AccountingPeriod`.
- Added period reopen preview endpoint.
- Added Owner-only period reopen endpoint.
- Reopen creates reversal journal instead of deleting/editing closing journal.
- Re-close after reopen creates next version, e.g. `JE-CLOSE-2026-05-V2`.
- Manual status mutation on `AccountingPeriod` is blocked.
- Journal draft/posting into CLOSED period is blocked unless controlled by governance workflow.
- P&L excludes `CLOSING_ENTRY` and `CLOSING_REVERSAL` by default.
- PeriodClosePanel now supports closed period, reopen preview, and reopen flow.

### Verified

```text
Reopen preview balanced.
Reopen/reversal succeeded.
AccountingPeriod returned OPEN.
Re-close preview balanced.
Re-close post created JE-CLOSE-2026-05-V2.
Duplicate close after re-close blocked.
Trial Balance after re-close balanced: Debit 34.170.000 = Kredit 34.170.000.
Balance Sheet after re-close balanced: Assets 29.915.000 = Liabilities+Equity 29.915.000.
P&L remained operational/readable with net -85.000.
Commit pushed:
286e512 fix(accounting): block manual edits in closed period governance
```

### Not Changed

- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.
- No production mutation.
- No generated Prisma commit.
- No microservices/apps folder.

---

## 2026-05-26 — V5.27-B7 Period Close + Retained Earnings

### Type

Backend accounting close foundation + frontend Owner period close workflow.

### Added / Changed

- Added `JournalSourceType.CLOSING_ENTRY`.
- Added close metadata fields to `AccountingPeriod`.
- Added period close readiness endpoint.
- Added period close preview endpoint.
- Added Owner-only period close post endpoint.
- Closing journal moves revenue/expense/COGS result into Retained Earnings.
- Balance Sheet after close moves closed period result into Retained Earnings.
- P&L operational report excludes closing entries by default.

### Verified

```text
Readiness ready=true.
Preview closing journal balanced.
Post close created JE-CLOSE-2026-05.
AccountingPeriod status CLOSED.
Duplicate close blocked.
Trial Balance remained balanced.
Balance Sheet remained balanced.
P&L stayed readable after close.
Commit pushed:
ff2008f feat(accounting): add period close retained earnings workflow
```

### Not Changed

- No reopen in B7.
- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.




## 2026-05-24 — V5.23-A Admin IA + Finance Add-on Revenue Foundation

### Type

Frontend IA/product patch. Backend unchanged.

### Added / Changed

- Admin sidebar restored with final 5-menu structure:
  - Dashboard
  - Stays & Tenant
  - Finance
  - Staff & Tiket
  - Kamar & Stok
- Removed admin top workspace tabs as primary navigation.
- Dashboard repositioned as cross-menu Command Center.
- Finance IA expanded to include:
  - Tagihan
  - Review Pembayaran
  - Voucher WiFi
  - Pendapatan Tambahan
  - Pengeluaran
  - Riwayat Pembayaran
- Existing `WifiSale` placed as voucher WiFi revenue stream.
- Added Finance placeholder/plan page for future ancillary revenue.
- Expanded expense UI/category copy for kos business context.
- Expanded tenant ticket categories for kos-specific issue reporting.

### Not Changed

- Backend unchanged.
- No schema migration.
- No DB reset.
- No formal accounting ledger yet.
- No Balance Sheet claim.

### Verification

- Source ZIP generated.
- Touched-file syntax checks passed.
- Full frontend build still requires local environment with dependencies.
- Runtime/API smoke still required before PASS.

---

## 2026-05-24 — V5.23-B Accounting & Balance Sheet Foundation Planning

### Type

Planning direction / docs sync.

### Added

- Next official planning track:
  - Accounting Readiness
  - OPEX / COGS / CAPEX
  - AncillaryProduct / AncillarySale
  - CashAccount
  - ChartOfAccount
  - JournalEntry / JournalLine
  - Asset Register
  - Depreciation
  - Opening Balance
  - Balance Sheet readiness
- Clarified that existing finance is operational summary, not formal accounting.

### Not Allowed

- Do not fake Balance Sheet.
- Do not treat deposit as revenue.
- Do not reset DB.
- Do not force full double-entry in one patch without plan.
- Do not create standalone Reports menu until finance/reporting model is concrete.


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Type

Backend + frontend business-rule patch, AutoOps, payment UX, urgent UI, and docs sync.

### Added

- AutoOps module for deterministic business automation.
- Fast operational deadlines:
  - booking/payment SLA 3 hours,
  - payment review urgent 1 hour,
  - payment review escalate 3 hours,
  - payment review max 6 hours,
  - invoice overdue 24 hours,
  - old late tenant vacate rule 3 hours.
- First-paid room priority contract.
- One-step tenant payment proof flow: `Bayar & Kirim Bukti`.
- Auto-cancel expired unpaid booking.
- Auto-release orphan RESERVED rooms.
- Urgent UI emphasis for special/high-risk cases.
- Dedup direction for repeated assistant/alert copy.

### Changed

- Booking/minat no longer means room fully locked.
- Tenant/public copy now warns that room is secured only after payment is valid and approved.
- Renew/no-debt copy is more explicit.
- Admin/Owner dashboards should prioritize business blockers, not duplicated decorative alerts.

### Not Allowed

- AutoOps must not approve payment.
- AutoOps must not approve renew.
- AutoOps must not final checkout.
- AutoOps must not refund/deduct deposit automatically.
- AutoOps must not create official inventory movements.

### Verification

- Source ZIP generated.
- Static ZIP integrity/source generation completed during patch.
- Local build/UAT still required before FULL PASS.

---

## 2026-05-23 — V5.19 Renew Meter Utility Checkpoint

### Type

Backend lifecycle hardening + frontend renew/payment/checkout UX.

### Added / Fixed

- Renew approval requires electricity/water meter checkpoint.
- Renewal invoice includes rent + electricity + water.
- Meter delta is calculated from previous reading.
- Checkout remains blocked by open invoice.
- Staff removed from sensitive lifecycle actions.
- Runtime UAT from user confirmed:
  - renew without meter fails,
  - renew with meter succeeds,
  - renewal invoice has 3 lines,
  - checkout blocked while invoice open,
  - final checkout succeeds after clear,
  - room returns AVAILABLE,
  - deposit refund succeeds.

### Verification

- Backend runtime UAT PASS from local user log.
- Frontend build was user-confirmed PASS for V5.19B/C before V5.20 work.

---

## 2026-05-22 — V5.17-D Routine Work Cards + Inventory/Staff UX Push

### Type

Frontend staff workspace UX polish.

### Added / Updated

- Restored staff checklist harian/mingguan/bulanan as professional work cards.
- Added progress-style checklist summary without new chart dependency.
- Improved assistant strip so it reads active work/checklist state.
- Improved inventory health UX:
  - stock habis/menipis/aman is computed from quantity/minimum stock.
  - staff no longer manually chooses stock health status.
- Improved staff room/card UX.
- Improved staff report modal readability and progressive flow.
- Improved admin staff field report decision UI.
- Added `frontend/src/utils/inventoryHealth.ts`.

### Verified

- User manual check: “Sudah saya cek sip bagus pass.”
- Commit pushed:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
```

### Not Changed

- Backend unchanged for V5.17-D.
- No new chart dependency.
- No dark mode.
- No DB reset.
- Generated Prisma noise restored and not committed.

---

## 2026-05-22 — V5.17-C Inventory Intelligence

### Type

Frontend rule-intelligence UX.

### Changed

- Inventory stock health is now treated as computed information from `qtyOnHand/minQty`.
- Staff warehouse report no longer treats “stok habis/menipis” as manual condition input.
- Warehouse flow is split:
  - physical condition report,
  - stock health warning,
  - restock/action suggestion.
- Assistant highlights stock risk and restock blocker.

### Not Changed

- No backend schema change.
- No official InventoryMovement mutation by staff.

---

## 2026-05-22 — V5.17-B Clean Blue Staff UI + On-Flow Staff/Admin Repair UX

### Type

Frontend UI/UX polish.

### Changed

- Staff room cards became clickable full cards.
- Removed duplicate “Buka” / “Perlu cek” actions when they navigated to the same place.
- Cleaner blue design direction applied.
- Font weights reduced to improve readability.
- Low-contrast text/badge issues reduced.
- Admin review decision input changed from plain select to more on-flow choices.

### Not Changed

- No backend change.
- No new UI dependency.

---

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix

### Type

Backend staff visibility hard fix.

### Fixed

- `GET /api/tickets` for STAFF now shows active tickets assigned to the staff or created through the staff's field reports.
- Default staff list includes:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- Staff list no longer incorrectly appears empty when active assigned tickets exist.

### Verified

Manual UAT:
- Staff user:
  - `id=3`
  - `role=STAFF`
- Fresh room item report created ticket:
  - `id=12`
  - `ticketNumber=TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff `GET /api/tickets?limit=20` displayed the active assigned ticket.

### Not Changed

- No frontend source change required for V5.16-G itself.
- No UAT script file added.
- No DB reset.

---

## 2026-05-22 — V5.16-F Staff Repair UX Final Polish

### Type

Frontend UX polish + backend visibility preparation.

### Updated

- Staff/admin wording made more human:
  - “Belum mulai”
  - “Sedang dikerjakan”
  - “Selesai, menunggu cek admin”
  - “Selesai final”
  - “Dibatalkan admin”
- Admin queue wording changed to “Antrian konfirmasi admin”.
- Staff work queue cleaned from technical jargon.

### Verification

Initial UAT showed report/linking still worked, but staff list needed V5.16-G hard fix.

---

## 2026-05-21 — V5.16-E Staff Ticket Linking + UAT Safe Package

### Type

Backend linking and UAT behavior cleanup.

### Fixed

- Fresh staff report for room item fills `linkedRoomItemId`.
- Fresh staff report for inventory item fills `linkedInventoryItemId`.
- Staff ticket detail visibility works.
- UAT commands are written in chat, not committed as script files.

### Verified

- Ticket 9 had `linkedRoomItemId=1`.
- Ticket 8 had `linkedInventoryItemId=2`.
- Ticket 8 and 9 were cancelled after UAT.

---

## 2026-05-21 — V5.16-D Staff Repair Select Contract + UAT

### Type

Frontend select contract + backend DTO alignment.

### Added

- Frontend `staffRepairOptions` single source of truth.
- Separate option sets for:
  - room item condition,
  - warehouse item condition,
  - admin decision,
  - final room item status,
  - final inventory item status.

### Verified

Manual UAT:
- Staff room item report applied temporary `MAINTENANCE`.
- Replacement request saved.
- Staff warehouse report applied temporary `PENDING_CHECK`.
- Admin review `APPROVE`, `NEEDS_MORE_INFO`, and `REJECT` accepted.
- Movement created and stock decreased.

---

## 2026-05-21 — V5.16-C Staff Repair Flow Stabilization

### Type

Validation and lifecycle hardening.

### Fixed

- Field report condition notes required.
- Replacement request requires inventory item and qty.
- Admin movement only allowed when decision is `APPROVE`.
- Staff reports require note or photo evidence.
- Ticket close remains valid only from `DONE`.

---

## 2026-05-21 — V5.16-B Staff Field Report + Admin Confirmation Queue

### Type

Backend schema additive + frontend admin/staff flow.

### Added

- `StaffFieldReport`.
- `ReportedCondition`.
- `AdminDecision`.
- `StaffFieldReportStatus`.
- Ticket nullable final/link fields:
  - `linkedRoomItemId`
  - `linkedInventoryItemId`
  - `finalRoomItemStatus`
  - `finalInventoryItemStatus`
  - `finalAdminNote`
- Admin review queue.
- Staff field reports API.

### Not Changed

- No DB reset.
- No lifecycle rewrite.
- Inventory movement remains owner/admin.

---

## 2026-05-21 — V5.16-A Staff Repair Governance

### Type

Business flow correction.

### Changed

- Staff status update became “laporan kondisi”.
- Staff no longer appears to decide final item status.
- Frontend wording changed from “Update Status” to “Laporkan Kondisi Barang”.

---

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation

### Type

Product/UX/architecture planning docs sync only.

### Added

- Intelligent Command Center direction.
- Assistant vs queue dedup strategy.
- Tier 0 deterministic intelligence plan.
- Tier 1 AI on-demand plan.
- Finance foundation plan.
- Smart chart system plan.

### Not Changed

- No backend source code changed by docs pack.
- No frontend source code changed by docs pack.
- No schema migration applied.
- No DB reset.


## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Docs Lock

### Type

Docs/context sync only. No backend/frontend source patch in this docs package.

### Added

- Consolidated backend audit findings from ChatGPT and Cline/DeepSeek.
- Clean backend source snapshot reference: `backend_latest_for_accounting_act_CLEAN.zip`.
- Pre-ACT verdict: READY FOR ACT B1 with additive-only scope.
- B1 Accounting Foundation locked scope: COA, CashAccount, AccountingPeriod, OpeningBalance, JournalEntry/Line, readiness, default COA seed, trial balance draft, unmapped transaction scanner.
- Allowed and forbidden file lists for ACT B1.
- Report honesty rule: existing reports must be marked operational approximation.
- Roadmap correction: TenantDepositLedger is deferred; Stay deposit fields must not be removed/deprecated yet.
- New-chat execution prompt file for the next ChatGPT ACT session.

### Not Changed

- No backend source code changed by this docs sync.
- No frontend source code changed by this docs sync.
- No schema migration applied.
- No DB reset.
- No auto-posting implemented.
- No payment/stay/checkout/renew flow changed.

### Verification

```text
Docs package generated only.
Code build/smoke not applicable to this docs sync.
Next ACT must run backend build and API smoke before claiming PASS.
```

## 2026-05-25 — V5.24-C Admin UI Critical Workflow Hardening

### Type

Frontend admin UI/UX hardening. Backend unchanged.

### Added / Changed

- GlobalSearch restored for admin topbar.
- Dashboard ticket DONE action hardened so it is no longer misleading.
- StaysPage filter behavior corrected so ALL is not hardcoded ACTIVE.
- Dashboard dead code/copy partially cleaned.
- AncillaryRevenuePage changed from roadmap-heavy future list into a more operational finance page.

### Verification

- API smoke confirmed:
  - `GET /api/tickets?limit=20`
  - `GET /api/public/rooms`
- Commit pushed:
  - `cb93fe6 fix(admin): harden dashboard search tickets and finance ux`

### Not Changed

- No backend lifecycle/payment/renew/checkout rewrite.
- No schema change.
- No generated Prisma committed.
- No B3 auto-journal.

---

## 2026-05-25 — V5.24-B2A/B/B2C Accounting Setup

### Type

Backend + frontend accounting setup hardening.

### Added / Changed

- Owner Accounting Setup UI.
- Cash/bank account setup surface.
- Accounting period setup.
- Opening balance draft/post workflow.
- Opening balance posting creates `JournalEntry` with `sourceType=OPENING_BALANCE`.
- Trial Balance avoids double-counting opening balance.
- Duplicate period/cash/opening balance messages hardened.
- Draft opening balance can be voided.
- POSTED opening balance remains protected from void until reversal plan exists.

### Verified

- COA seeded.
- Cash account created.
- Accounting period created.
- Opening balance posted.
- `JE-OPENING-1` created.
- Trial Balance balanced: Debit 30.000.000 = Kredit 30.000.000.
- Balance Sheet guard reads opening balance.
- Draft duplicate voided.
- Commits pushed:
  - `2308f17 feat(accounting): add opening balance setup workflow`
  - `c04aec5 fix(accounting): harden setup workflow messages`
  - `eb198b2 fix(accounting): allow voiding draft opening balances`

### Not Changed

- No invoice/payment/expense/stay auto-posting yet.
- No TenantDepositLedger yet.
- No asset/depreciation yet.
- No destructive schema change.
