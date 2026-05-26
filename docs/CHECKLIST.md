# KOST48 V5 — Active Checklist
**Versi:** 2026-05-26 V5.24-C Released + Next Plan Lock


## 0.0 Latest Current State — V5.24-C Released + Next Plan Lock

```text
Current GitHub latest commit:
cb93fe6 fix(admin): harden dashboard search tickets and finance ux

Recent release chain:
e653cca feat: ship command center autoops and accounting foundation
2308f17 feat(accounting): add opening balance setup workflow
c04aec5 fix(accounting): harden setup workflow messages
eb198b2 fix(accounting): allow voiding draft opening balances
cb93fe6 fix(admin): harden dashboard search tickets and finance ux

Status:
- main is pushed to origin/main through cb93fe6.
- V5.24-B2 accounting setup is functionally verified.
- Opening balance was posted and produced JE-OPENING-1.
- Trial Balance reached non-zero balanced state: Debit 30.000.000 = Kredit 30.000.000.
- Balance Sheet guard can read opening balance and should remain honest about no operational auto-journal yet.
- V5.24-C admin UI hardening is pushed.
- API smoke after V5.24-C: GET /api/tickets and GET /api/public/rooms returned success.
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
PLAN V5.24-D — Admin UI Architecture + Performance Hardening

Why:
V5.24-C fixed urgent admin UI workflow bugs.
Remaining audit items are structural/performance/UX cleanup:
- RoleWorkspaceTabs dead/unrendered code decision.
- Dashboard/sidebar dual navigation consistency.
- Dashboard 13 blocking queries and overlapping stays/bookings queries.
- Admin sidebar lacks context card/footer.
- Status strip progress percentages are not meaningful.
- Non-standard font-weight cleanup in touched areas.
- Continue keeping GlobalSearch, ticket close, Stays filter, and ancillary page fixes stable.

Accounting B3 Auto Journal Lite is deferred until V5.24-D is either done or explicitly skipped by user.
```

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
