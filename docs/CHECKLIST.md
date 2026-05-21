# KOST48 V5 — Active Checklist
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation checklist sync

## A. Start Hygiene

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
  ```
- [ ] Confirm working tree state.
- [ ] Confirm branch from local git.
- [ ] PowerShell only.
- [ ] API tests use `Invoke-RestMethod`.
- [ ] No DB reset unless user explicitly asks.
- [ ] No new `.md` docs unless user asks.
- [ ] No multi-app/workspace migration.
- [ ] No new dependency without PLAN/approval.
- [ ] Do not claim PASS without build + verification.
- [ ] No dark mode.
- [ ] No production mutation.

## B. Stable Baseline Before V5.15

- [ ] Confirm baseline includes `e93c78a` or newer.
- [ ] Confirm V5.12 full regression was previously PASS.
- [ ] Confirm V5.13 release readiness scripts/docs are present if using that baseline.
- [ ] Confirm latest V5.14 frontend Command Center zip has been merged before V5.15 ACT.
- [ ] Preserve locked guards:
  - [ ] Renewal invoice `ISSUED`.
  - [ ] Checkout final blocks open invoice.
  - [ ] `DRAFT` blocks checkout.
  - [ ] No auto-create final utility invoice.
  - [ ] Payment approval remains core monolith.
  - [ ] Renew execution remains core monolith.
  - [ ] Room status writes remain core monolith.
  - [ ] Admin approve checkout request does not complete stay.

## C. V5.14 Implementation State To Confirm Locally

- [ ] `AssistantPanel` exists.
- [ ] `ActionQueueTable` exists.
- [ ] `CompactMetrics` exists.
- [ ] `StatusBadge` was updated.
- [ ] `ReadinessChecklist` exists.
- [ ] `BlockedReasonCard` exists.
- [ ] `LifecycleTimeline` exists.
- [ ] `PeriodVisualizer` exists.
- [ ] Dashboard owner/admin/staff uses Command Center pattern.
- [ ] Tenant My Stay Guide uses tenant-friendly copy.
- [ ] Invoices/stays/renew/tickets/reminders/public rooms received expansion patch.
- [ ] Frontend build PASS after merge.
- [ ] Manual browser smoke pending/done:
  - [ ] `/dashboard`
  - [ ] `/reports`
  - [ ] `/invoices`
  - [ ] `/stays`
  - [ ] `/payment-submissions/review`
  - [ ] `/portal/stay`

## D. V5.15-A Docs Sync Checklist

- [x] Product direction updated to Intelligent Command Center + Finance Foundation.
- [x] Stable Modular Monolith preserved.
- [x] Tier 0 rule intelligence defined.
- [x] Tier 1 AI on-demand defined.
- [x] Tier 2 finance foundation defined.
- [x] Assistant vs queue dedup rule defined.
- [x] Sidebar simplification rule defined.
- [x] Smart chart system planned.
- [x] Balance sheet/formal ratio readiness planned.
- [x] Only 7 active docs updated.

## E. V5.15-B UX Dedup + Sidebar Simplification

Before ACT:

- [ ] Inspect latest merged frontend source.
- [ ] Identify current dashboard duplicate assistant/queue items.
- [ ] Identify sidebar report/menu entries.
- [ ] Confirm owner/admin/staff/tenant navigation behavior.

Patch:

- [ ] AssistantPanel summarizes diagnosis only.
- [ ] ActionQueueTable lists actionable rows only.
- [ ] Dedup by `ruleId + entityType + entityId + actionRoute`.
- [ ] Dashboard links to reports drill-down.
- [ ] Sidebar no longer feels like a full page dump.
- [ ] Reports still accessible for OWNER.
- [ ] No route removed without alternate path.
- [ ] Frontend build PASS.
- [ ] Manual check OWNER/ADMIN/STAFF/TENANT sidebar.

## F. V5.15-C Tier 0 Rule Intelligence Hooks

Create/Update:

- [ ] `frontend/src/hooks/useBusinessHealthScore.ts`
- [ ] `frontend/src/hooks/useTenantRiskProfile.ts`
- [ ] `frontend/src/hooks/useCashflowForecast.ts`
- [ ] `frontend/src/hooks/useOperationalStressIndex.ts`
- [ ] `frontend/src/hooks/useMeterAnomalyDetector.ts`
- [ ] `frontend/src/utils/smartCopy.ts`
- [ ] `frontend/src/utils/scoring.ts`

Quality:

- [ ] No LLM/API call.
- [ ] Deterministic outputs.
- [ ] Handles empty data gracefully.
- [ ] No fake data.
- [ ] Business score explains drivers.
- [ ] Tenant risk uses tenant-friendly wording.
- [ ] Cashflow forecast labels assumptions.
- [ ] Operational stress separates admin vs staff risk.
- [ ] Meter anomaly is warning only unless backend rule exists.
- [ ] Frontend build PASS.

## G. V5.15-D Smart Chart System

- [ ] Create/update `SmartChartPanel` if needed.
- [ ] Support mode switching:
  - [ ] Summary
  - [ ] Donut
  - [ ] Bar
  - [ ] Line if time-series data exists
  - [ ] Table
- [ ] Do not show unsupported chart modes.
- [ ] Occupancy/room condition chart links to reports drill-down.
- [ ] No new chart dependency unless approved.
- [ ] Frontend build PASS.

## H. V5.15-E Reports + Formal Finance Readiness

Reports UX:

- [ ] Reports can be opened from dashboard.
- [ ] Reports page has clear Command Center/drill-down tabs.
- [ ] Occupancy report connects to room condition dashboard.
- [ ] Formal ratios explain locked state.

Finance readiness:

- [ ] Balance sheet readiness panel exists.
- [ ] Cash/bank source identified.
- [ ] Accounts receivable from open invoices identified.
- [ ] Deposit held treated as liability.
- [ ] Expenses source identified.
- [ ] Payables/equity missing state explained.
- [ ] Formal ratios remain locked until data reliable.
- [ ] No fake ratio values.
- [ ] Frontend build PASS.

## I. V5.15-F Backend Finance Summary Endpoints

Only after PLAN/ACT approval:

- [ ] Inspect existing reports module.
- [ ] Confirm guards OWNER/ADMIN.
- [ ] Add read-only endpoint only.
- [ ] No lifecycle mutation.
- [ ] No DB reset.
- [ ] Return readiness object if incomplete.
- [ ] Backend build PASS.
- [ ] Smoke with `Invoke-RestMethod`.

Candidate endpoints:

- [ ] `GET /api/finance/business-health`
- [ ] `GET /api/finance/occupancy/summary`
- [ ] `GET /api/finance/formal-ratios/readiness`
- [ ] `GET /api/finance/balance-sheet/draft`

## J. V5.15-G Balance Sheet / Schema Plan

Before schema ACT:

- [ ] Write migration plan.
- [ ] Identify current Prisma models.
- [ ] Decide account model.
- [ ] Decide journal/ledger model.
- [ ] Decide deposit liability mapping.
- [ ] Decide cash/bank source.
- [ ] Decide opening balance strategy.
- [ ] No DB reset.
- [ ] Backup plan exists for production.

Potential models:

- [ ] `FinanceAccount`
- [ ] `JournalEntry`
- [ ] `LedgerEntry`
- [ ] `BalanceSnapshot`
- [ ] `AiCache` optional

## K. V5.15-H Tier 1 AI On-Demand

Backend:

- [ ] `ai.module.ts`
- [ ] `ai.service.ts`
- [ ] `ai.controller.ts`
- [ ] `ai-cache.service.ts`
- [ ] provider key from env only.
- [ ] no secret committed.
- [ ] rate limit `/api/ai/*`.
- [ ] cache before provider call.
- [ ] JSON output.
- [ ] no autonomous mutation.

Frontend:

- [ ] AI call only after explicit click.
- [ ] Loading state clear.
- [ ] Result shown as suggestion only.
- [ ] Admin must still decide final action.
- [ ] Errors do not block normal workflow.

Smoke:

- [ ] Backend build PASS.
- [ ] Frontend build PASS.
- [ ] API test uses `Invoke-RestMethod`.

## L. V5.15-I Payment Proof Scanner

- [ ] Only available from review page/modal.
- [ ] Click “Analisa bukti” triggers AI.
- [ ] Extracted amount/date/confidence shown.
- [ ] Mismatch warning shown.
- [ ] Does not approve payment.
- [ ] Does not mutate invoice/payment/stay.
- [ ] Result cached.
- [ ] Admin still clicks approve/reject manually.

## M. Build / Smoke Commands

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Backend build if backend touched:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
```

Smoke:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```

## N. Deferred

- [ ] Multi-app shell.
- [ ] Workspace migration.
- [ ] Service-to-service HTTP.
- [ ] WebSocket/realtime.
- [ ] Payment gateway.
- [ ] Autonomous AI approval.
- [ ] Production DB mutation.
- [ ] Dark mode.
