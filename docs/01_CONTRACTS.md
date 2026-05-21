# KOST48 V5 — Contracts & API
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation contract sync

## 0. Active Architecture Contract

```text
Active architecture: Stable Modular Monolith
Multi-app Shared-DB: future roadmap only
No apps/ generation now
No workspace migration now
No service-to-service HTTP now
No runtime alias mirror hack
```

V5.15 extends the V5.14 product/UX contract with intelligence and finance foundation.

```text
Product direction: KOST48 Intelligent Command Center
Implementation direction: rule-first, backend-supported when needed, finance-grade reporting later
Backend direction: allowed when it unlocks real finance/AI value, but no lifecycle rewrite
Schema direction: allowed only with explicit migration plan and no DB reset unless separately requested
```

## 1. Core Lifecycle Ownership

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
| Finance read/review | Finance surface in monolith | review/read/report OK, approval core-only |
| Marketing/public | Marketing module in monolith | read-only public rooms/detail |
| AI assist | Monolith support module | recommendation/read/extraction only, no autonomous mutation |

## 2. Locked Business Guards

1. Renewal invoice must be `ISSUED` after admin approve.
2. Checkout final must be blocked if any invoice for the stay is not `PAID`/`CANCELLED`.
3. `DRAFT` invoice counts as open invoice.
4. `complete()` must not auto-create final utility invoice.
5. Admin must settle/pay/cancel invoice manually before final checkout.
6. Open invoice count uses `NOT IN [PAID, CANCELLED]`.
7. Admin approve checkout request does not complete stay.
8. Payment approval remains core monolith and atomic.
9. Room status/occupancy writes remain core monolith.
10. Tenant does not execute lifecycle finalization.

## 3. Product Contract — KOST48 Intelligent Command Center

### 3.1 Product identity

```text
KOST48 Intelligent Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, prediksi ringan, dan aksi.
```

The UI must not behave like a passive database viewer. It must guide each role through the next best action.

### 3.2 UX hierarchy contract

Default page hierarchy for operational pages:

```text
1. Business Assistant / priority insight
2. Primary action or action queue
3. Compact metrics
4. Filter/search/tabs/chart switcher
5. Table/grid/detail/report drill-down
6. Recent activity / exception context
```

Avoid:

- giant KPI-only cards as the main dashboard body,
- decorative charts without decision value,
- tenant-facing technical jargon,
- disabled buttons without clear reason,
- showing every alert at equal severity,
- duplicating the same insight in AssistantPanel and ActionQueueTable.

### 3.3 Assistant vs Queue Contract

```text
AssistantPanel = diagnosis, impact, why it matters, recommended direction.
ActionQueueTable = concrete work items, entity, reason, age, CTA.
```

Dedup rule:

```text
ruleId + entityType + entityId + actionRoute
```

If one source produces both assistant and queue:

- Assistant summarizes: “3 pembayaran menahan cashflow.”
- Queue lists actionable rows: payment/invoice/tenant items to verify.

Assistant must not repeat all queue rows as cards.

### 3.4 Severity contract

| Severity | Meaning | UI behavior |
|---|---|---|
| BLOCKER/HIGH | Process cannot continue or needs immediate action | show above fold, with action button |
| PENDING/MEDIUM | Waiting for admin/staff/tenant decision | show in action queue |
| WARNING | Risk if ignored | show in assistant panel or badge |
| OPPORTUNITY | Business optimization | show lower priority |
| INFO | Helpful status | collapse or show as subtle note |

## 4. Role-Based UX Contract

| Role | UX name | Primary question | Required UI emphasis |
|---|---|---|---|
| Owner | Financial / Business Health Cockpit | Bisnis sehat? uang masuk kurang di mana? | collection, outstanding, overdue, occupancy, deposit liability, risk, reports drill-down |
| Admin | Action Queue Command Center | Apa yang harus dikerjakan hari ini? | payment review, checkout, renew, booking, overdue, direct CTA |
| Staff | Operational Task Board | Tugas fisik/ticket apa yang urgent? | tickets, rooms, meter, inventory, maintenance |
| Tenant | My Stay Guide | Status saya apa dan apa yang harus saya lakukan? | masa sewa, tagihan, payment review, renew/keluar action |
| Public | Room Discovery & Booking | Kamar tersedia dan cara booking? | availability, price, facilities, booking steps |

## 5. Component Contract

Reusable UI components should be preferred over one-off page-specific redesigns.

| Component | Contract |
|---|---|
| `AssistantPanel` | grouped alerts, severity, impact copy, optional CTA, no duplicate queue spam |
| `ActionQueueTable` | priority, type, subject, issue, age, recommended action |
| `CompactMetrics` / `MetricChip` | max 4–6 compact metrics, no giant cards |
| `StatusBadge` | consistent color/label by status and domain |
| `ReadinessChecklist` | shows pass/warn/block items and blocked reason |
| `BlockedReasonCard` | explains why an action cannot continue |
| `LifecycleTimeline` | visualizes booking/check-in/renew/checkout or invoice lifecycle |
| `PeriodVisualizer` | visual compare old/new rental period |
| `SmartChartPanel` | lets user switch summary/donut/bar/line/table when data supports it |
| `EmptyState` | explains no-data state with helpful next action |

## 6. Tenant-Facing Language Contract

Tenant UI must avoid technical/backend wording.

Prefer:

| Backend/admin wording | Tenant-facing wording |
|---|---|
| Invoice | Tagihan |
| Stay | Masa sewa / status tinggal |
| Checkout request | Ajukan keluar |
| Renew request | Ajukan perpanjangan |
| Payment submission | Bukti pembayaran |
| Pending review | Sedang diperiksa |
| Planned checkout | Akhir masa sewa / tanggal keluar |
| Final checkout | Proses keluar selesai |

Tenant microcopy examples:

- “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- “Kamu punya 1 tagihan yang perlu dibayar.”
- “Masa sewamu akan berakhir dalam 12 hari. Mau perpanjang atau ajukan keluar?”
- “Proses keluarmu hampir selesai, tetapi masih ada tagihan yang perlu diselesaikan.”

## 7. Rule Intelligence Contract — Tier 0

V5.15 makes `usePaymentUrgency.ts` the official pattern for zero-cost intelligence.

Allowed:

- frontend hook computes alerts from existing API data,
- deterministic scoring,
- risk labels,
- recommended route/CTA,
- business copy from templates,
- no backend cost,
- no LLM.

Candidate files:

```text
frontend/src/hooks/useBusinessHealthScore.ts
frontend/src/hooks/useTenantRiskProfile.ts
frontend/src/hooks/useCashflowForecast.ts
frontend/src/hooks/useOperationalStressIndex.ts
frontend/src/hooks/useMeterAnomalyDetector.ts
frontend/src/utils/smartCopy.ts
frontend/src/utils/scoring.ts
```

Tier 0 must be attempted before Tier 1 AI.

## 8. AI Contract — Tier 1 On-Demand Only

AI/LLM may exist only as explicit assist features.

Allowed use cases:

- payment proof scanner,
- reminder copy personalizer,
- short business narrative generator,
- natural language classification,
- proof/image text understanding.

Forbidden:

- AI call on page load,
- AI auto-approval,
- AI mutation of invoice/stay/room/payment,
- long prompt with full database context,
- hidden recurring AI calls,
- unbounded usage without cache/rate limit.

Endpoint pattern:

```text
POST /api/ai/payment-proof/analyze
POST /api/ai/reminders/personalize
POST /api/ai/business-narrative
POST /api/ai/classify-text
```

Backend files if implemented:

```text
backend/src/modules/ai/ai.module.ts
backend/src/modules/ai/ai.service.ts
backend/src/modules/ai/ai.controller.ts
backend/src/modules/ai/ai-cache.service.ts
```

Rules:

- button-click only,
- cache before provider call,
- rate limit `/api/ai/*`,
- prompt short,
- output JSON short,
- max token small,
- batch bulk operations,
- math/rules first, AI later.

## 9. AI Cache Contract

MVP cache may use in-memory `Map` inside NestJS service:

```ts
@Injectable()
class AiCacheService {
  private cache = new Map<string, { v: string; exp: number }>()

  get(key: string) {
    const hit = this.cache.get(key)
    if (!hit || hit.exp < Date.now()) return null
    return hit.v
  }

  set(key: string, value: string, ttlMs = 86_400_000) {
    this.cache.set(key, { v: value, exp: Date.now() + ttlMs })
  }
}
```

Recommended TTL:

| AI result | TTL |
|---|---:|
| payment proof extraction | permanent if persisted later; MVP cache can be long TTL |
| reminder personalization | 24 hours |
| business narrative | 1 hour |
| text classification | 24 hours |

Persistent `ai_cache` table is allowed later only with migration plan.

Potential schema:

```text
ai_cache
- id
- cache_key unique
- feature
- input_hash
- result_json
- expires_at
- created_at
```

## 10. Finance Foundation Contract

Formal accounting ratio and balance sheet must not be fake.

### 10.1 Finance data meaning

| Concept | Initial source / requirement |
|---|---|
| Cash/bank | needs explicit data source or account model |
| Accounts receivable | open invoices excluding PAID/CANCELLED |
| Deferred/held deposit | deposit held must be liability, not revenue |
| Expenses | existing expense records if available |
| Payables | only if modeled; otherwise unavailable |
| Equity | owner capital/retained earnings only if modeled |
| Room/building asset | only if asset model exists |

### 10.2 Balance sheet unlock rule

Balance sheet requires:

```text
Assets = Liabilities + Equity
```

If the app cannot identify cash/bank/current liabilities/equity reliably, it must display “Belum tersedia” with exact reason.

### 10.3 Formal ratio unlock rule

Formal ratios stay locked until required inputs exist:

| Ratio | Required data |
|---|---|
| Current Ratio | current assets and current liabilities |
| Quick Ratio | cash/receivable and current liabilities |
| Debt-to-Equity | total liabilities and equity |
| ROCE | EBIT and capital employed |

## 11. Backend Data Contract for V5.15

Backend endpoints are allowed if they remove repeated frontend fetch logic or unlock finance-grade reporting.

Candidate endpoints:

```text
GET /api/dashboard/admin-summary
GET /api/dashboard/owner-summary
GET /api/finance/business-health
GET /api/finance/balance-sheet/draft
GET /api/finance/formal-ratios/readiness
GET /api/finance/occupancy/summary
GET /api/stays/:id/readiness
GET /api/rooms/grid
```

Rules:

- PLAN first before backend work.
- No DB reset.
- No lifecycle mutation change.
- Schema migration must be explicit and reversible.
- Reports may be read-only.

## 12. Renew Request Contract — Active

Tenant create:

- Tenant may create renew request for own active stay.
- Request is blocked when a checkout request is pending.
- Only one pending renew request per stay.
- Payload supports `stayId`, `requestedTerm`, optional `requestedCheckOutDate`, optional `requestNotes`.

Admin approve:

- Approval remains core monolith.
- Backend accepts optional `plannedCheckOutDate`, `agreedRentAmountRupiah`, and `reviewNotes`.
- Approval locks the renew request row with `FOR UPDATE` before execution.
- Stay extension, renewal invoice creation, invoice issue, and renew request approval are executed in one DB transaction.
- Renewal invoice remains tenant-facing immediately as `ISSUED`.
- Duplicate/double approval must fail because request status is no longer `PENDING`.

Admin reject:

- Reject only updates request status and review fields.
- Reject does not mutate stay/invoice/room.

## 13. Checkout Request Contract

- Tenant create/view checkout request remains request-only.
- Admin approve/reject checkout request does not complete the stay.
- Final checkout is still `POST /stays/:id/complete`.
- Final checkout is blocked by open invoices.
- Admin UI must not imply that approving checkout request already releases the room.

## 14. Payment Submission Contract

Tenant:

- Creates payment submission/proof only.
- Does not write `InvoicePayment` directly.
- UI should clearly say “sedang diperiksa” once proof is pending review.

Admin/Owner:

- Review queue/read OK.
- Approval stays core-only.
- Payment approval must remain atomic and must not be extracted to finance surface yet.

## 15. Production Contract

- Do not reset production DB.
- Do not edit production `dist` except emergency hotfix.
- Source local → build → commit → push → deploy.
- Schema/DB changes require separate backup/migration plan.
- Production smoke must be read-only unless credentials are explicitly supplied.
- AI provider keys must never be committed.
