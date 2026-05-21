# KOST48 V5 — Execution Plan
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation plan sync

## 0. Current Execution Override

```text
Current phase: V5.15 Intelligent Command Center + Finance Foundation
Default mode: PLAN ONLY unless user explicitly says ACT / YOLO / patch
Architecture: Stable Modular Monolith
Multi-app: roadmap only
```

V5.15 direction:

```text
1. Deduplicate Command Center UX.
2. Make rule intelligence official using usePaymentUrgency-style hooks.
3. Simplify sidebar and make reports drill-down from dashboard.
4. Add smart chart switching where data supports it.
5. Prepare finance foundation for balance sheet and formal ratios.
6. Add backend/AI/schema only when justified and gated.
```

Forbidden unless explicitly planned:

- no `apps/`,
- no `core-api`/`tenant-api`/`staff-api`/`finance-api`/`marketing-api` shell,
- no workspace migration,
- no runtime alias mirror,
- no service-to-service HTTP,
- no DB reset unless explicitly requested,
- no production DB mutation,
- no autonomous AI mutation,
- no dark mode.

Allowed with PLAN and ACT:

- backend read/report endpoints,
- finance summary endpoints,
- on-demand AI module,
- schema migration for finance foundation,
- persistent AI cache table,
- chart utility component without heavy dependency if possible.

## 1. Stable Baseline Before V5.15

V5.12/V5.13 baseline:

```text
Commit: e93c78a or newer expected
V5.12 full regression PASS and pushed
V5.13 release readiness pack = docs/scripts/release support only
```

V5.14 frontend implementation state:

```text
V5.14 Command Center Foundation ACT — frontend build PASS
V5.14 Command Center Expansion ACT — frontend build PASS
Backend unchanged in both V5.14 ACT packages
Runtime/manual browser smoke still required on user machine
```

V5.15 must preserve these business guards:

- renewal invoice `ISSUED`,
- checkout final blocks open invoice,
- DRAFT blocks checkout,
- no auto-create final utility invoice,
- payment approval remains core monolith,
- renew execution remains core monolith,
- room status writes remain core monolith.

## 2. V5.15 Product Objective

Transform KOST48 from:

```text
Command Center UI with some duplicated alerts
```

into:

```text
Intelligent Command Center
Rule-based assistant + actionable queue + finance-grade drill-down + AI on-demand only
```

The highest-value V5.15 change is not adding more UI. It is improving intelligence, deduplication, reporting correctness, and finance data readiness.

## 3. V5.15 Design Principles

1. **Assistant is diagnosis, queue is work.** Do not duplicate the same message.
2. **Math/rule first.** If an insight can be computed by if/else or formula, do not use LLM.
3. **AI on-demand only.** No AI call during page load.
4. **Reports are drill-down.** Dashboard should link to reports; sidebar should stay simple.
5. **Chart modes are tools.** Donut/bar/line/table only if they improve understanding.
6. **Finance ratio must be real.** No fake current ratio, quick ratio, ROCE, D/E.
7. **Backend allowed when useful.** Backend/schema may be patched when it unlocks real finance/intelligence value.
8. **Stable monolith remains.** No multi-app split.

## 4. V5.15 Target Architecture

### 4.1 UX architecture

```text
[PageHeader]
[AssistantPanel: diagnosis, not duplicate rows]
[ActionQueueTable: concrete tasks]
[CompactMetrics]
[SmartChartPanel: summary/donut/bar/line/table]
[Tabs / Filters / Search]
[Table / Detail / Report drill-down]
```

### 4.2 Intelligence architecture

```text
Tier 0 — frontend deterministic hooks
Tier 1 — backend AI on-demand endpoints with cache/rate limit
Tier 2 — finance schema/reporting foundation
```

### 4.3 Finance architecture

```text
Current app reports = operational finance snapshot
Next reports = finance-grade draft with readiness checks
Formal ratios = locked until balance sheet data is reliable
```

## 5. V5.15-A — Docs/Product Direction Sync

Status: current package.

Scope:

- Update 7 active docs only.
- Lock V5.15 direction as Intelligent Command Center + Finance Foundation.
- Preserve Stable Modular Monolith.
- Record V5.14 source implementation state.
- Define dedup, sidebar, chart, Tier 0, Tier 1, finance foundation.

Allowed files:

```text
docs/00_GROUND_STATE.md
docs/01_CONTRACTS.md
docs/02_PLAN.md
docs/CHECKLIST.md
docs/03_DECISIONS_LOG.md
docs/04_JOURNAL.md
docs/CHANGELOG.md
```

No source code change in V5.15-A.

## 6. V5.15-B — UX Dedup + Sidebar Simplification

Mode: ACT frontend.

Objective:

- remove duplicate messages between AssistantPanel and ActionQueueTable,
- simplify sidebar report link,
- keep reports accessible from dashboard drill-down,
- improve dashboard hierarchy after user screenshot feedback.

Patch candidates:

```text
frontend/src/pages/dashboard/DashboardPage.tsx
frontend/src/layout/AppLayout.tsx
frontend/src/components/command-center/AssistantPanel.tsx
frontend/src/components/command-center/ActionQueueTable.tsx
frontend/src/styles.css
```

Rules:

- Assistant should summarize impact.
- Queue should list concrete work.
- Deduplicate by `ruleId + entityType + entityId + actionRoute`.
- Reports menu item may be hidden/merged for non-owner roles if dashboard has drill-down links.
- Owner can access reports from dashboard cockpit.

Verification:

- frontend build PASS,
- dashboard manual check,
- sidebar manual check for OWNER/ADMIN/STAFF/TENANT,
- no route broken.

## 7. V5.15-C — Tier 0 Rule Intelligence Hooks

Goal:

Replicate the successful `usePaymentUrgency.ts` pattern across key domains.

Create:

```text
frontend/src/hooks/useBusinessHealthScore.ts
frontend/src/hooks/useTenantRiskProfile.ts
frontend/src/hooks/useCashflowForecast.ts
frontend/src/hooks/useOperationalStressIndex.ts
frontend/src/hooks/useMeterAnomalyDetector.ts
frontend/src/utils/smartCopy.ts
frontend/src/utils/scoring.ts
```

### 7.1 useBusinessHealthScore

Inputs:

- invoices,
- payment submissions,
- rooms,
- occupancy,
- reports if available,
- overdue aging,
- deposit liability.

Outputs:

```ts
type BusinessHealthScore = {
  score: number
  grade: 'AMAN' | 'PERHATIAN' | 'RISIKO' | 'KRITIS'
  drivers: string[]
  assistantItems: AssistantItem[]
  queueItems: QueueItem[]
}
```

Use cases:

- Owner dashboard.
- Admin dashboard summary.
- Reports command center.

### 7.2 useTenantRiskProfile

Inputs:

- tenant stay,
- unpaid tagihan,
- payment pending review,
- checkout/renew request,
- ticket history if available.

Outputs:

- “aman”, “perlu bayar”, “sedang diperiksa”, “risiko keluar terblokir”.

Use cases:

- Tenant portal.
- Admin stay detail.

### 7.3 useCashflowForecast

Inputs:

- due invoices,
- open invoices,
- payment history,
- monthly income reports if available.

Outputs:

- near-term expected inflow,
- overdue risk,
- collection ratio trend if enough data.

No LLM.

### 7.4 useOperationalStressIndex

Inputs:

- open tickets,
- high priority tickets,
- checkout pending/approved,
- renew pending,
- occupied/maintenance rooms.

Outputs:

- stress score,
- staff/admin action priorities.

### 7.5 useMeterAnomalyDetector

Inputs:

- meter readings if available,
- room utility records,
- previous vs current usage.

Outputs:

- possible spike,
- missing reading,
- abnormal zero usage.

Do not block lifecycle unless backend rule exists. Show as warning only.

### 7.6 SmartCopyEngine

File:

```text
frontend/src/utils/smartCopy.ts
```

Purpose:

- conditional copy without LLM,
- role-specific tone,
- tenant-friendly wording,
- consistent assistant messages.

## 8. V5.15-D — Smart Chart System

Goal:

Charts should support mode switching where useful.

Create optional component:

```text
frontend/src/components/charts/SmartChartPanel.tsx
```

Initial modes:

```text
summary
donut
bar
line
table
```

Rules:

- Use existing chart capability first.
- No new chart dependency unless current code cannot support basic modes.
- Do not show mode if data does not support it.
- Condition room chart should link conceptually to occupancy report.

Patch candidates:

```text
frontend/src/pages/dashboard/DashboardPage.tsx
frontend/src/pages/reports/ReportsPage.tsx
```

## 9. V5.15-E — Reports Drill-Down + Formal Finance Readiness UX

Goal:

Reports should become a drill-down workspace, not just another menu item.

Patch:

```text
frontend/src/pages/reports/ReportsPage.tsx
```

Targets:

- Add Command Center tab/summary if not present.
- Link occupancy chart from dashboard to occupancy tab.
- Formal ratios tab remains locked with explicit readiness reasons.
- Add “Balance Sheet Readiness” section.

Formal ratio readiness copy:

```text
Belum tersedia karena data kas/bank, current liabilities, dan equity belum dimodelkan secara formal.
```

## 10. V5.15-F — Backend Finance Summary Endpoints

Mode: backend ACT only after frontend Tier 0.

Goal:

Reduce repeated frontend fetch and create one reliable source for business health.

Candidate endpoints:

```text
GET /api/finance/business-health
GET /api/finance/occupancy/summary
GET /api/finance/formal-ratios/readiness
GET /api/finance/balance-sheet/draft
```

Rules:

- read-only,
- OWNER/ADMIN guard where appropriate,
- no lifecycle mutation,
- no schema required for first summary if mapping can use existing data,
- return explicit `readiness` object when data incomplete.

Suggested response shape:

```ts
type FinanceReadiness = {
  ready: boolean
  missing: string[]
  assumptions: string[]
  nextDataNeeded: string[]
}
```

## 11. V5.15-G — Balance Sheet Data Model Plan

Mode: PLAN first before schema.

Goal:

Enable real balance sheet and formal ratios.

Potential schema candidates:

```text
CashAccount
LedgerEntry / JournalEntry
BalanceSnapshot
FinanceAccount
AiCache optional
```

Minimum concepts:

- asset,
- liability,
- equity,
- revenue,
- expense,
- receivable,
- deposit liability.

Important:

- deposit held is liability,
- rent paid is revenue only after business rule allows recognition,
- open invoice is receivable,
- cancelled invoice is not receivable,
- room/building assets unavailable until asset model exists.

No DB reset. Use migration.

## 12. V5.15-H — Tier 1 AI Module On-Demand

Mode: backend + frontend ACT only after Tier 0.

Create backend:

```text
backend/src/modules/ai/ai.module.ts
backend/src/modules/ai/ai.service.ts
backend/src/modules/ai/ai.controller.ts
backend/src/modules/ai/ai-cache.service.ts
```

Add to:

```text
backend/src/app.module.ts
```

Endpoints:

```text
POST /api/ai/payment-proof/analyze
POST /api/ai/reminders/personalize
POST /api/ai/business-narrative
POST /api/ai/classify-text
```

Rules:

- on-demand only,
- cache by hash input,
- rate limit,
- short prompt,
- JSON output,
- no secret in repo,
- no autonomous write.

MVP cache:

- in-memory `Map`.
- persistent `ai_cache` table only in separate schema ACT.

## 13. V5.15-I — Payment Proof Scanner Wow Moment

Mode: Tier 1 AI feature.

Goal:

Admin clicks “Analisa bukti” on payment proof. AI returns short structured result:

```json
{
  "detectedAmount": 1700000,
  "detectedDate": "2026-05-21",
  "confidence": "HIGH",
  "warnings": ["Nominal cocok", "Nama pengirim tidak terbaca"]
}
```

Rules:

- does not approve payment,
- does not mutate invoice,
- only helps admin review faster,
- result cached.

## 14. V5.15-J — UAT + Smoke Pack

Add PowerShell scripts later only after code ACT:

```text
scripts/uat/KOST48_V515_INTELLIGENCE_SMOKE.ps1
scripts/uat/KOST48_V515_FINANCE_READINESS_SMOKE.ps1
scripts/uat/KOST48_V515_AI_ON_DEMAND_SMOKE.ps1
```

Smoke commands must use `Invoke-RestMethod`.

## 15. Build and Manual Verification

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Backend build if backend touched:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
```

Smoke API if dashboard uses protected data:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```

Manual browser verification:

```text
http://localhost:5173/dashboard
http://localhost:5173/reports
http://localhost:5173/portal/stay
http://localhost:5173/invoices
http://localhost:5173/stays
http://localhost:5173/payment-submissions/review
```

## 16. Definition of Done

No V5.15 patch is PASS unless:

1. Actual source files were inspected before patch.
2. Frontend build PASS.
3. Backend build PASS if backend touched.
4. Manual route verification performed.
5. No unrelated file changes.
6. UI language matches role.
7. Assistant/action queue does not show duplicate data.
8. Tier 0 hooks do not show fake data.
9. AI endpoints are on-demand only if implemented.
10. Finance ratios stay locked unless data is reliable.
11. `git status --short` reviewed.
