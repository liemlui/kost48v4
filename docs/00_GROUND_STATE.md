# KOST48 V5 — Ground State
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation sync  
**Status:** Source of truth utama untuk sesi berikutnya.

## 0. Current Command Center State

KOST48 sekarang berada pada track:

```text
Active architecture: Stable Modular Monolith
Current phase: V5.15 Intelligent Command Center + Finance Foundation
Default mode: PLAN ONLY, kecuali user eksplisit minta ACT / YOLO / patch
Multi-app: ROADMAP ONLY, bukan implementasi aktif
```

Environment tetap:

- Windows + VS Code + PowerShell
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript + React-Bootstrap + TanStack Query
- Auth: JWT Bearer
- API lokal: `http://localhost:3000/api`
- Frontend lokal: `http://localhost:5173`
- DB dev/UAT: `localhost:5433 / kost48_v3_pro / postgres`
- Project root:

```text
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle
```

## 0.1 Product Direction Locked — KOST48 Command Center

Arah produk tetap:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

Aplikasi tidak boleh terasa seperti database viewer atau dashboard dekoratif. KOST48 harus terasa seperti **pusat kendali operasional kos** yang menjawab:

- Owner: bisnis sehat atau tidak, uang masuk kurang di mana, risiko apa yang perlu diputuskan?
- Admin: apa yang harus dikerjakan hari ini, mana yang urgent, flow mana yang macet?
- Staff: tugas fisik/tiket/meter/inventaris mana yang perlu ditangani?
- Tenant: status sewa saya apa, apa yang harus saya bayar, apa yang sedang diproses?
- Public: kamar mana yang tersedia dan bagaimana cara booking?

Filosofi UX:

```text
FROM: statistic-first, decorative dashboard, giant KPI cards
TO: action-first, business assistant, priority queue, compact metrics, clear next action
NEXT: intelligent command center, rule engine, finance-grade reporting, AI on-demand only
```

## 0.2 Current Implementation State After V5.14 ACT Batches

V5.14 frontend Command Center sudah dipatch dalam 2 batch besar:

1. **Command Center Foundation + Dashboard/Tenant/Detail batch**
   - reusable components created:
     - `AssistantPanel`
     - `ActionQueueTable`
     - `CompactMetrics`
     - `BlockedReasonCard`
     - `ReadinessChecklist`
     - `LifecycleTimeline`
   - dashboard owner/admin/staff diarahkan menjadi assistant + queue + compact metrics.
   - tenant home diarahkan menjadi `My Stay Guide`.
   - stay detail/payment review mulai memakai blocker/readiness UX.

2. **Command Center Expansion batch**
   - invoice list/detail,
   - tenant invoice list/detail,
   - stays list,
   - renew requests,
   - tickets,
   - reminders,
   - public rooms/detail,
   - `PeriodVisualizer`.

Verification yang sudah dilakukan oleh patch package:

- Frontend build PASS pada package hasil ACT.
- Backend tidak disentuh pada 2 batch tersebut.
- Runtime/manual browser smoke di mesin user tetap wajib sebelum klaim production-ready PASS.

## 0.3 V5.15 Direction — Intelligent Command Center + Finance Foundation

Masukan user setelah melihat UI:

1. Jika `AssistantPanel` dan `Priority Queue` berisi hal sama, harus di-deduplicate.
2. Jika dashboard sudah menjadi pintu ke laporan, sidebar tidak perlu menampilkan laporan sebagai menu utama untuk semua role.
3. Chart harus lebih flexible: donut/bar/line/table jika data memungkinkan.
4. `Kondisi Kamar` harus tersambung konsepnya dengan occupancy core report.
5. Formal finance ratio harus disiapkan dengan benar, termasuk balance sheet.
6. Backend dan schema boleh dibuka untuk finance foundation, selama terencana dan tidak merusak guard bisnis.
7. `usePaymentUrgency.ts` adalah pola bagus: rule engine yang terasa seperti AI, zero cost, tanpa API call.

Arah V5.15:

```text
Tier 0: zero-cost intelligence in frontend hooks
Tier 1: on-demand AI backend endpoints with cache and rate limit
Tier 2: finance data foundation for balance sheet and formal ratios
```

## 0.4 Latest Stable Technical Baseline

Latest known stable baseline before UX redesign:

```text
Commit: e93c78a
Branch: main
Remote: origin/main
Status: V5.12 full regression PASS and pushed
Phase after that: V5.13 release readiness pack
```

Verified by user local UAT before V5.13:

- Public rooms smoke PASS.
- Admin login PASS.
- Notifications smoke PASS.
- Payment review queue smoke PASS.
- V5.11 smoke + staff boundary scripts PASS.
- V5.12 renew full UAT PASS.
- V5.12 checkout guard UAT PASS.
- V5.12 payment regression PASS.

## 1. Hard Rules

1. Jangan rewrite total.
2. Jangan patch sebelum paham file asli.
3. Jangan campur PLAN dan ACT.
4. Semua command harus PowerShell.
5. API test wajib `Invoke-RestMethod`, bukan curl.
6. Jangan reset DB kecuali user eksplisit minta.
7. Jangan klaim PASS tanpa build + runtime + UAT/manual verification.
8. Jangan kerja di luar project root.
9. Jangan buat `.md` baru kecuali user minta.
10. Jangan buka multi-app/workspace migration tanpa bounded plan baru.
11. Jangan tambah dependency chart/UI library tanpa PLAN dan approval.
12. No dark mode.
13. No production DB mutation.
14. No service-to-service HTTP.
15. No autonomous AI mutation.

## 2. Stable Modular Monolith Remains Active

Keputusan aktif tetap:

```text
Stable Modular Monolith first.
No apps/ generation.
No runtime alias mirror hack.
No core-api/tenant-api/staff-api/finance-api/marketing-api shell now.
No service-to-service HTTP now.
No workspace migration now.
```

V5.15 boleh membuka backend module baru **di dalam monolith**, terutama untuk:

- finance read/reporting foundation,
- deterministic summary endpoints,
- AI on-demand endpoints,
- cache/rate-limit support.

V5.15 tidak membuka multi-app split.

## 3. Locked Business Guards

Jangan hilangkan:

1. CheckoutRequestsModule tidak import dead `StaysModule`.
2. `StaysService.renewStay()` menerbitkan renewal invoice sebagai `ISSUED`.
3. `StaysService.complete()` block checkout final jika ada open invoice.
4. Open invoice = status bukan `PAID` dan bukan `CANCELLED`.
5. `DRAFT` ikut block checkout.
6. `complete()` tidak auto-create final utility invoice.
7. `StaysQueryService.openInvoiceCount` memakai semantics `NOT IN [PAID, CANCELLED]`.
8. Payment approval yang mutate invoice/stay/room/meter/deposit tetap core monolith.
9. Renew approval/execution tetap core monolith.
10. Room occupancy/status writes tetap core monolith.
11. Admin approve checkout request tidak sama dengan final checkout.
12. Tenant hanya create/view request/submission, tidak menjalankan lifecycle final.

## 4. Core Ownership Rules

Tetap core monolith:

- Stay lifecycle writes.
- Room occupancy/status writes.
- Manual check-in.
- Booking approval.
- Checkout final.
- Renew execution.
- Payment approval that mutates invoice/stay/room/meter/deposit.
- Meter promotion.
- Deposit settlement.

Staff surface diarahkan ke low-risk operational/read-heavy surfaces. Billing/finance-sensitive writes harus OWNER/ADMIN unless explicitly decided otherwise.

## 5. V5.15 UX Rules

### 5.1 Assistant vs Queue Dedup Rule

```text
AssistantPanel = diagnosis, impact, priority summary, recommendation.
ActionQueueTable = concrete rows of work with entity, reason, and CTA.
```

Tidak boleh menampilkan pesan yang sama dua kali dengan wording hampir sama.

Dedup key:

```text
ruleId + entityType + entityId + actionRoute
```

Jika data yang sama dipakai dua tempat:

- Assistant tampilkan ringkasan: “Ada 3 pembayaran menahan cashflow.”
- Queue tampilkan baris actionable: tenant/invoice/payment yang harus diverifikasi.

### 5.2 Sidebar Simplification Rule

Sidebar tidak boleh menjadi daftar semua halaman.

Jika dashboard sudah punya drill-down ke laporan, sidebar cukup:

- Dashboard / Command Center
- Operasional utama sesuai role
- Portal tenant sesuai role

Reports boleh tidak muncul sebagai menu utama untuk semua role. Owner tetap bisa masuk laporan lewat dashboard cockpit atau tab internal.

### 5.3 Chart Intelligence Rule

Chart tidak boleh dekoratif. Chart harus menjawab keputusan.

Setiap chart penting sebaiknya punya mode:

- Summary
- Donut
- Bar
- Line
- Table

Jika data belum cocok untuk line chart, mode line harus tidak muncul.

### 5.4 Visual Motion Rule

Light mode only. Micro-interaction boleh dipakai ringan dan graceful:

```css
::view-transition-group(*),
::view-transition-old(*),
::view-transition-new(*) {
  animation-duration: 0.25s;
  animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
}
```

Jangan membuat animasi berat yang mengganggu kerja admin.

## 6. V5.15 Intelligence Direction

### Tier 0 — Zero-Cost Rule Intelligence

Gunakan pola seperti `usePaymentUrgency.ts`: hook deterministic yang terasa seperti AI karena menghitung konteks, prioritas, label, dan route otomatis.

Candidate hooks:

```text
frontend/src/hooks/useBusinessHealthScore.ts
frontend/src/hooks/useTenantRiskProfile.ts
frontend/src/hooks/useCashflowForecast.ts
frontend/src/hooks/useOperationalStressIndex.ts
frontend/src/hooks/useMeterAnomalyDetector.ts
frontend/src/utils/smartCopy.ts
frontend/src/utils/scoring.ts
```

Prinsip:

- no API call baru,
- no LLM,
- no cost,
- deterministic,
- auditable,
- bisa diuji dengan sample data.

### Tier 1 — On-Demand AI Backend

AI boleh dipakai hanya untuk hal yang sulit dihitung dengan if/else atau matematika, misalnya:

- payment proof scanner,
- reminder copy personalizer,
- natural-language classification,
- short business narrative.

Rules:

- Tidak ada AI call saat page load.
- Semua AI call dimulai dari klik eksplisit: “Analisa”, “Klasifikasi”, “Personalisasi”.
- Cache wajib.
- Rate limit wajib.
- Prompt harus pendek.
- Output JSON pendek.
- No autonomous mutation.
- AI boleh memberi saran, tetapi aksi tetap user/admin yang menekan tombol.

### Tier 2 — Finance Foundation

Formal finance ratio dan balance sheet boleh dibuka dengan backend/schema plan.

Tidak boleh fake ratio.

Urutan benar:

```text
1. Identify finance data source
2. Build finance mapping
3. Build balance sheet draft
4. Validate assets/liabilities/equity
5. Unlock formal ratios
```

## 7. Finance Foundation Direction

### 7.1 Required Finance Concepts

- Cash/bank balance.
- Accounts receivable from open invoices.
- Deposit held as liability, not revenue.
- Expense categories and payable if modeled.
- Owner equity/capital if modeled.
- Room/building asset only if asset model exists.
- Net snapshot must be labelled approximation unless balance sheet-grade data exists.

### 7.2 Formal Ratios Unlock Rule

Formal ratios remain locked until data is reliable:

- Current Ratio: current assets / current liabilities.
- Quick Ratio: liquid assets / current liabilities.
- Debt-to-Equity: liabilities / equity.
- ROCE: EBIT / capital employed.

UI must say why ratio is locked, not show fake values.

## 8. Pages Prioritized After V5.14

Priority order for V5.15:

1. Dashboard dedup + business health score.
2. Sidebar simplification.
3. Reports drill-down UX.
4. Smart chart switcher for occupancy/room/finance.
5. Tier 0 intelligence hooks.
6. Finance foundation backend summary endpoints.
7. Balance sheet model plan.
8. AI module on-demand.
9. Payment proof scanner.
10. UAT/smoke pack for intelligence/finance.

## 9. Start-of-Session Command

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Jika dirty, identifikasi dulu file berubah. Jangan mulai ACT besar tanpa tahu baseline.

## 10. Verification Commands

Backend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build:local
```

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Runtime:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run start:dev
```

Smoke API:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```

## 11. Deferred / Not Active Unless Planned

- Multi-app shell.
- Workspace migration.
- Service-to-service HTTP.
- WebSocket/realtime.
- Payment gateway.
- Autonomous AI approval.
- Production DB mutation.
- Dark mode.
