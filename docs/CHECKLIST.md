# KOST48 V5 — Active Checklist
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
