# KOST48 V5 — Changelog
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation docs pack

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation

### Type

Product/UX/architecture planning docs sync only.

### Added

- Active direction:

```text
KOST48 Intelligent Command Center + Finance Foundation
```

- Assistant vs queue dedup strategy:
  - Assistant = diagnosis/impact/recommendation.
  - Queue = concrete actionable rows.
  - Dedup key = `ruleId + entityType + entityId + actionRoute`.
- Sidebar simplification plan:
  - dashboard becomes primary command center,
  - reports become drill-down from dashboard/finance cockpit,
  - sidebar should not become a full page dump.
- Tier 0 zero-cost intelligence plan:
  - `useBusinessHealthScore`,
  - `useTenantRiskProfile`,
  - `useCashflowForecast`,
  - `useOperationalStressIndex`,
  - `useMeterAnomalyDetector`,
  - `smartCopy.ts`,
  - `scoring.ts`.
- `usePaymentUrgency.ts` pattern promoted as official rule intelligence pattern.
- Smart chart system plan:
  - summary,
  - donut,
  - bar,
  - line when data supports it,
  - table.
- Reports drill-down plan.
- Finance foundation plan:
  - balance sheet readiness,
  - assets/liabilities/equity mapping,
  - accounts receivable from open invoices,
  - deposit held as liability,
  - formal ratio unlock rule.
- Tier 1 AI on-demand plan:
  - AI only after explicit click,
  - cache required,
  - rate limit required,
  - short prompt,
  - JSON output,
  - no autonomous mutation.
- AI module candidate files:
  - `backend/src/modules/ai/ai.module.ts`,
  - `backend/src/modules/ai/ai.service.ts`,
  - `backend/src/modules/ai/ai.controller.ts`,
  - `backend/src/modules/ai/ai-cache.service.ts`.
- Payment Proof Scanner as first AI wow moment candidate.

### Updated

Active docs updated:

- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`

Docs now reflect:

- Current phase = V5.15 Intelligent Command Center + Finance Foundation.
- Active architecture remains Stable Modular Monolith.
- Multi-app remains roadmap only.
- Backend/schema work is allowed when bounded and justified.
- No DB reset remains active.
- Formal ratios must remain locked until balance sheet data is reliable.
- AI is on-demand only and cannot mutate business records.

### Not Changed

- No backend source code changed by this docs pack.
- No frontend source code changed by this docs pack.
- No schema migration applied.
- No DB reset.
- No multi-app implementation.
- No workspace migration.
- No new dependency.
- No AI endpoint implemented yet.
- No UAT run by this docs package.

### Next Recommended Step

Run V5.15-B/C ACT:

```text
UX Dedup + Sidebar Simplification + Tier 0 Rule Intelligence Hooks
```

Recommended first source patch files:

```text
frontend/src/pages/dashboard/DashboardPage.tsx
frontend/src/layout/AppLayout.tsx
frontend/src/components/command-center/AssistantPanel.tsx
frontend/src/components/command-center/ActionQueueTable.tsx
frontend/src/hooks/useBusinessHealthScore.ts
frontend/src/hooks/useTenantRiskProfile.ts
frontend/src/hooks/useCashflowForecast.ts
frontend/src/hooks/useOperationalStressIndex.ts
frontend/src/hooks/useMeterAnomalyDetector.ts
frontend/src/utils/smartCopy.ts
frontend/src/utils/scoring.ts
```

---

## 2026-05-21 — V5.14 Command Center Source ACT Batches

### Type

Frontend source implementation packages created from uploaded frontend/backend zips.

### Batch 1 — Command Center Foundation

Added frontend reusable components:

- `AssistantPanel`
- `ActionQueueTable`
- `CompactMetrics`
- `BlockedReasonCard`
- `ReadinessChecklist`
- `LifecycleTimeline`

Patched:

- dashboard owner/admin/staff,
- tenant portal home / My Stay Guide,
- payment review,
- stay detail.

Verification:

- Frontend build PASS in package build.
- Backend unchanged.

### Batch 2 — Command Center Expansion

Patched:

- invoices list/detail,
- tenant invoices,
- stays list,
- renew requests,
- tickets,
- reminders,
- public rooms/detail,
- `PeriodVisualizer`.

Verification:

- Frontend build PASS in package build.
- Backend unchanged.

### Remaining Verification

Manual browser/runtime/API smoke must still be run in user local environment before production-ready PASS.

---

## 2026-05-20 — V5.14 Command Center MVP Direction

### Type

Product/UX strategy docs sync only.

### Added

- Active product direction:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

- V5.14 Command Center MVP plan.
- Frontend-first UX redesign strategy.
- Role-based UX contracts:
  - Owner = Financial / Business Health Cockpit,
  - Admin = Action Queue Command Center,
  - Staff = Operational Task Board,
  - Tenant = My Stay Guide,
  - Public = Room Discovery & Booking.
- Rule-based assistant contract.
- Component foundation plan:
  - `AssistantPanel`,
  - `ActionQueueTable`,
  - `CompactMetrics`,
  - `StatusBadge`,
  - `ReadinessChecklist`,
  - `BlockedReasonCard`,
  - `LifecycleTimeline`.
- Tenant-facing microcopy rules.
- Dashboard redesign direction:
  - remove giant KPI-card dominance,
  - introduce assistant/action queue/compact metrics.

### Updated

Active docs updated:

- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`

### Not Changed

- No backend source code changed.
- No frontend source code changed.
- No schema change.
- No DB reset.
- No multi-app implementation.
- No workspace migration.
- No new markdown docs outside the 7 active docs.
- No new dependency.
- No UAT run by this docs package.

---

## 2026-05-19 — V5.13 Production Deployment Readiness & Release Pack

### Type

Release readiness scripts and docs sync only.

### Added

- `scripts/release/KOST48_V513_LOCAL_RELEASE_CHECK.ps1`
- `scripts/release/KOST48_V513_CREATE_SOURCE_LITE_ZIP.ps1`
- `scripts/uat/KOST48_V513_PRODUCTION_SAFE_SMOKE.ps1`

### Purpose

- Verify local build readiness.
- Create source-lite ZIP without heavy/generated/sensitive files.
- Run production-safe smoke without mutating production data.

### Not Changed

- No backend feature code.
- No frontend feature code.
- No schema change.
- No DB reset.
- No multi-app implementation.

---

## 2026-05-19 — V5.12 Renew + Checkout Full Business UAT Pack

### Type

UAT/regression scripts and docs sync only.

### Added

PowerShell UAT scripts:

- `scripts/uat/KOST48_V512_RENEW_UAT.ps1`
- `scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1`
- `scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1`
- `scripts/uat/KOST48_V512_FULL_REGRESSION.ps1`

### Coverage

- Renew full flow: tenant create, admin approve, invoice `ISSUED`, tenant visibility, double approval guard.
- Checkout guard: open invoice blocks checkout with 409, full invoice payment allows checkout, room returns `AVAILABLE`.
- Payment regression: partial payment -> `PARTIAL`, overpay -> 409, remaining payment -> `PAID`, review queue remains healthy.

### Not Changed

- No backend feature code.
- No frontend feature code.
- No schema change.
- No DB reset.
- No multi-app shell.
- No workspace migration.
