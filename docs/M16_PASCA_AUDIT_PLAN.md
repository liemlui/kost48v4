# M16 — Pasca-Audit Total KOST48 V5: Rencana Eksekusi

> **Dibuat:** 2026-06-20 · **Sumber:** Audit 12 jalur paralel · **97 temuan**
> **AI lain paralel:** Fase J (J0-J4 di `docs/M15_FASE_J_HARDENING_AI.md`)
> **5 Keputusan Owner sudah diambil** (threshold configurable, unifikasi arus kas, auto-adjust stok, full UI DeepSeek, CSS audit)

---

## Status Eksekusi

| Task | Status | Commit |
|------|--------|--------|
| P1 — RolesGuard di 3 controller | ✅ SELESAI | _(pending commit)_ |
| P2 — DTO validation bypass multipart | ✅ SELESAI | _(pending commit)_ |
| P3 — Hapus STAFF dari 11 endpoint sensitif | ✅ SELESAI | _(pending commit)_ |
| P4–R5 (13 task) | ⏳ PLAN | Lihat di bawah |

---

## Batch P — Keamanan & Auth (lanjutan)

### P4: Refresh token / graceful expiry warning
**Severity:** 🔴 Critical · **Risk:** High
**Problem:** JWT 24 jam, mid-session 401 → hard redirect ke /login, state hilang. [client.ts:28](frontend/src/api/client.ts:28)
**Target files:**
- `backend/src/auth/auth.module.ts` — extend JWT expiry ke 7 hari
- `frontend/src/api/client.ts` — intercept 401 dengan modal re-login, bukan hard redirect
- `frontend/src/components/layout/AppLayout.tsx` — deteksi token < 1 jam tersisa, tampilkan toast warning
- `frontend/src/context/AuthContext.tsx` — handle re-auth flow
**Gate:** `cd frontend; npm run build`

### P5: Circuit breaker DeepSeek + fallback MarketAnalysis.chat
**Severity:** 🔴 Critical · **Risk:** Medium
**Problem:** DeepSeek down → 60s timeout → 500 error. MarketAnalysis.chat() TANPA fallback. [deepseek.client.ts:38-78](backend/src/modules/market-analysis/deepseek.client.ts:38)
**Target files:**
- `backend/src/modules/market-analysis/deepseek.client.ts` — state tracking (consecutiveFailures, lastFailTime), circuit breaker: 5 failures → 30 detik open
- `backend/src/modules/market-analysis/market-analysis.service.ts` — bungkus chat() dengan try-catch + fallback
**Gate:** `cd backend; npx tsc --noEmit`

### P6: Auto-ops DB advisory lock (ganti in-memory `running` flag)
**Severity:** 🔴 Critical · **Risk:** Medium
**Problem:** `this.running` in-memory, multi-process (PM2) bisa race. [auto-ops.service.ts:24](backend/src/modules/auto-ops/auto-ops.service.ts:24)
**Target files:**
- `backend/src/modules/auto-ops/auto-ops.service.ts` — `pg_try_advisory_lock(1)` sebelum `runAll()`, release di finally
**Gate:** `cd backend; npx tsc --noEmit`

---

## Batch Q — Data Integrity & Business Logic

### Q1: Unifikasi resolveRent — hapus Pattern A, semua pakai Pattern B
**Severity:** 🔴 Critical · **Risk:** High
**Problem:** Room sama, term sama, HARGA BEDA tergantung siapa yang booking. Pattern A (admin) pakai `dailyRateRupiah` langsung, Pattern B (portal) pakai 13% × monthly. [stays.helpers.ts:61](backend/src/modules/stays/stays.helpers.ts) vs [tenant-bookings-helpers.ts:136](backend/src/modules/tenant-bookings/tenant-bookings-helpers.ts:136)
**Target files:**
- `backend/src/modules/stays/stays.helpers.ts` — hapus `resolveRent`
- `backend/src/modules/tenant-bookings/tenant-bookings-helpers.ts` — pindahkan `resolveRent` ke shared
- `backend/src/common/utils/rent-resolver.util.ts` ✨ BARU — fungsi `resolveRent` tunggal
- `backend/src/modules/stays/stays.service.ts` — import dari shared
- `backend/src/modules/tenant-bookings/tenant-bookings.service.ts` — import dari shared
- `backend/src/modules/tenant-bookings/public-bookings.service.ts` — import dari shared
- `backend/src/modules/marketing/marketing-public-rooms.service.ts` — import dari shared
**Acceptance:** Semua jalur booking menghasilkan harga DAILY/WEEKLY/BIWEEKLY yang sama untuk room yang sama
**Gate:** `cd backend; npx tsc --noEmit`

### Q2: Merge tenant-bookings-helpers.ts & tenant-bookings.helpers.ts
**Severity:** 🔴 Critical · **Risk:** Low
**Problem:** Dua file beda, fungsi overlapping, sudah mulai drift. [tenant-bookings-helpers.ts](backend/src/modules/tenant-bookings/tenant-bookings-helpers.ts) vs [tenant-bookings.helpers.ts](backend/src/modules/tenant-bookings/tenant-bookings.helpers.ts)
**Target files:**
- `backend/src/modules/tenant-bookings/tenant-bookings.helpers.ts` — file tujuan (pakai nama plural)
- `backend/src/modules/tenant-bookings/tenant-bookings-helpers.ts` — HAPUS setelah merge
- Update import di `tenant-bookings.service.ts`, `tenant-bookings-query.service.ts`
**Gate:** `cd backend; npx tsc --noEmit`

### Q3: Schema — @unique NIK, @relation SatisfactionSurvey, missing indexes
**Severity:** 🔴 Critical · **Risk:** High (schema migration)
**Problem:** Tenant.identityNumber no unique → NIK duplikat. SatisfactionSurvey no @relation → orphan rows. Multiple missing indexes. [schema.prisma](backend/prisma/schema.prisma)
**Target files:**
- `backend/prisma/schema.prisma`:
  - `Tenant.identityNumber` → tambah `@unique`
  - `SatisfactionSurvey.tenantId` → tambah `@relation` ke Tenant
  - `SatisfactionSurvey.stayId` → tambah `@relation` ke Stay
  - `SatisfactionSurvey.createdById` → tambah `@relation` ke User
  - `Ticket.assignedToId` → tambah `@@index`
  - `LoyaltyReward.isActive + type` → tambah `@@index`
  - `Room.floor + category` → tambah `@@index`
  - `Stay.createdById` → tambah `@@index`
  - `Invoice.dueDate` → ubah ke `DateTime` (required), default `now()`
  - `Invoice.periodStart, periodEnd` → ubah ke required
**Gate:** `cd backend; npx tsc --noEmit` · `npx prisma migrate dev --name audit_data_integrity`

### Q4: Schema — Cascade → SetNull di StaffWorkAudit, StaffPerformanceEvent
**Severity:** 🔴 Critical · **Risk:** High (schema migration)
**Problem:** Hapus User = hilang seluruh audit trail staf. [schema.prisma](backend/prisma/schema.prisma)
**Target files:**
- `backend/prisma/schema.prisma`:
  - `StaffWorkAudit.staff` → `onDelete: SetNull`
  - `StaffPerformanceEvent.staff` → `onDelete: SetNull`
  - `StaffReview.staff` → `onDelete: SetNull`
**Gate:** `cd backend; npx tsc --noEmit` · `npx prisma migrate dev --name audit_cascade_fix`

### Q5: Selaraskan deposit handling normal vs forced checkout
**Severity:** 🟠 Medium · **Risk:** Medium
**Problem:** Normal checkout BLOKIR deposit kalau ada invoice non-meter; forced checkout AUTO-COVER invoice non-meter. [stays.service.ts:526](backend/src/modules/stays/stays.service.ts:526) vs [stays.service.ts:775](backend/src/modules/stays/stays.service.ts:775)
**Target files:**
- `backend/src/modules/stays/stays.service.ts` — `processDeposit()`: hapus blokir non-meter invoice, pakai logika auto-cover oldest-first (seperti forced checkout)
**Gate:** `cd backend; npx tsc --noEmit`

---

## Batch R — UX, CSS & Polish

### R1: CSS variables audit — ekstrak :root, hapus duplikat
**Severity:** 🔴 Critical · **Risk:** Medium
**Problem:** 7 `:root` blocks di 6 file CSS saling timpa. `.app-sidebar` didefinisikan di 4 file, `.btn-primary` di 7 file. [01-base.css:4](frontend/src/styles/01-base.css:4) [04-operations.css:7](frontend/src/styles/04-operations.css:7)
**Target files:**
- `frontend/src/styles/00-tokens.css` ✨ BARU — gabung SEMUA CSS custom properties, resolve konflik (pakai 06-tenant.css sebagai pemenang)
- `frontend/src/styles/00-layout.css` ✨ BARU — selector global (.app-sidebar, .btn-primary, .stat-card)
- `frontend/src/styles/01-base.css` — hapus `:root`
- `frontend/src/styles/03-components.css` — hapus `:root` + selector global
- `frontend/src/styles/04-operations.css` — hapus `:root` (2×) + selector global
- `frontend/src/styles/05-staff.css` — hapus `:root`
- `frontend/src/styles/06-tenant.css` — hapus `:root` + selector global (pertahankan override tenant-spesifik dengan parent selector)
- `frontend/src/styles/10-misc.css` — hapus `:root`
- `frontend/src/styles/styles.css` — import 00-tokens.css + 00-layout.css PALING AWAL
**Gate:** `cd frontend; npm run build` — pastikan tidak ada visual regression

### R2: Unifikasi arus kas — hapus /reports/cash-flow
**Severity:** 🔴 Critical · **Risk:** Low
**Problem:** Dua "Arus Kas" berbeda (operational vs ledger-backed). [reports.service.ts](backend/src/modules/reports/reports.service.ts)
**Target files:**
- `backend/src/modules/reports/reports.service.ts` — hapus `cashFlow()` method
- `backend/src/modules/reports/reports.controller.ts` — hapus route `GET /cash-flow`
- `frontend/src/api/reports.ts` — hapus `fetchCashFlow()`, `CashFlow` type
- `frontend/src/pages/reports/ReportsPage.tsx` — tab Operasional: ganti `CashFlowTable` → komponen dari `CashflowPage`, panggil `fetchCashflowStatement`
- `frontend/src/pages/reports/reportShared.tsx` — hapus tipe `CashFlow`, `CashFlowStatus`, `CashFlowTable`; pakai `CashflowStatement` dari accounting
**Gate:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`

### R3: DeepSeek full UI Settings + threshold kapitalisasi configurable
**Severity:** 🔴 Critical · **Risk:** Medium
**Problem:** Owner harus SSH edit .env untuk ganti model/base URL/limit. Threshold kapitalisasi tidak configurable. [owner-ai.service.ts:48](backend/src/modules/owner-ai/owner-ai.service.ts:48)
**Langkah:**
1. Schema: tambah field AI ke `OperationalSetting` (deepseekModel, deepseekFinanceModel, deepseekBaseUrl, aiFeaturesEnabled, aiManualOnly, aiOwnerAdminOnly, aiDailyRequestLimit, aiMaxInputChars, aiMaxOutputTokens, aiFinanceMaxOutputTokens, aiLogUsage, aiDraftRetentionDays, capitalizationThresholdByCategory JSON)
2. Backend: update DTO, SettingsService, deepseek.client.ts (baca dari DB, fallback env), owner-ai.service.ts
3. Frontend: ubah `AiSettingsPanel` di `OwnerSettingsPage.tsx` dari read-only → form editable
4. Expenses: enforce threshold saat create expense
**Target files:**
- `backend/prisma/schema.prisma` — tambah field ke OperationalSetting
- `backend/src/modules/settings/dto/operational-setting.dto.ts` — tambah field AI
- `backend/src/modules/settings/settings.service.ts` — handle field AI
- `backend/src/modules/market-analysis/deepseek.client.ts` — baca dari DB
- `backend/src/modules/owner-ai/owner-ai.service.ts` — baca dari DB
- `backend/src/modules/expenses/expenses.service.ts` — enforce threshold
- `backend/src/modules/assets/assets.service.ts` — auto-adjust stok (L1)
- `frontend/src/pages/settings/OwnerSettingsPage.tsx` — form editable
- `frontend/src/api/settings.ts` — update type
**Gate:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`

### R4: Fix error handling + silent swallowing + 6 halaman kosong
**Severity:** 🟠 Medium · **Risk:** Low
**Target files:**
- `frontend/src/pages/services/ServiceInterestsPage.tsx` — tambah Alert danger + EmptyState + Spinner
- `frontend/src/pages/rooms/RoomsRouteEntry.tsx` — tambah error boundary
- `frontend/src/pages/finance/AccountingSetupPage.tsx` — tambah EmptyState
- `frontend/src/pages/staff/StaffMonthlyReportPage.tsx` — tambah EmptyState
- `frontend/src/components/layout/GlobalSearch.tsx:75,89,106` — `.catch(err => { console.error(...); return []; })`
- `frontend/src/components/stays/CreateInvoiceModal.tsx:165,170` — log error di catch
- `frontend/src/hooks/usePushNotifications.ts:106` — log error di catch
- `frontend/src/App.tsx` — hapus route `/portal/profile` redundant, arahkan ke `/profile`
- `frontend/src/config/navigation.ts` — update link TENANT
**Gate:** `cd frontend; npm run build`

### R5: Bersihkan dead code + duplikasi + hardcoded localhost fallback
**Severity:** 🟠 Medium · **Risk:** Low
**Target files:**
- `backend/src/modules/finance/finance.service.ts` — hapus `formalRatiosReadiness()`, `balanceSheetDraft()`
- `backend/src/modules/finance/finance.controller.ts` — hapus route terkait
- `frontend/src/utils/apiUtils.ts` ✨ BARU — `readAlias<T>()` dari bookings.ts + stays.ts
- `frontend/src/api/bookings.ts` — import dari apiUtils, hapus local
- `frontend/src/api/stays.ts` — import dari apiUtils, hapus local
- `frontend/src/utils/invoiceTotals.ts` — tambah `getInvoiceOutstandingAmount()`
- `frontend/src/pages/dashboard/dashboardShared.tsx` — hapus duplikasi
- `frontend/src/components/staff/AdminStaffFieldReportQueue.tsx` — ekstrak 3 helper ke shared
- `frontend/src/components/staff/StaffUnifiedWorkQueue.tsx` — import dari shared
- `frontend/src/pages/reports/BalanceSheetPage.tsx` — ganti `key={i}` → stable key
- `frontend/src/pages/reports/CashflowPage.tsx` — ganti `key={i}` → stable key
- `frontend/src/pages/reports/ProfitLossPage.tsx` — ganti `key={i}` → stable key
- `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` — ganti `key={idx}` → stable key
- `frontend/src/api/client.ts` — hapus hardcoded `localhost:3000` fallback
- `frontend/src/api/faqs.ts` — hapus hardcoded `localhost:3000` fallback
- `frontend/src/components/resources/ResourceFormModal.tsx` — hapus hardcoded `localhost:3000` fallback
- `frontend/src/utils/resolveAbsoluteFileUrl.ts` — hapus hardcoded `localhost:3000` fallback
**Gate:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`

---

## Backlog — Low Priority (31 temuan)

| # | Area | Temuan |
|---|------|--------|
| L1 | Schema | `MarketAnalysis.kind` String → enum |
| L2 | Schema | `Ticket.category` String → enum |
| L3 | Schema | `Faq.category` String → enum |
| L4 | Schema | `PeerBehaviorReport.category` String → enum |
| L5 | Schema | `AiDraft.feature/mode/targetType` String → enum |
| L6 | Schema | `InventoryItem.category` String → enum |
| L7 | Schema | `RoomFacility.category/condition` String → enum |
| L8 | Kode | `as any` di accounting module (900+ baris) — type safety |
| L9 | Kode | Enum values hardcoded string + `as any` — ganti pakai Prisma enum |
| L10 | Kode | `process.env` langsung (5+ module) — ganti ConfigService |
| L11 | Kode | `UploadedFile() file: any` di 5 controller |
| L12 | Kode | `(room as any)` cast di tenant-bookings.helpers.ts |
| L13 | Kode | `(db as any).renewRequest.findFirst` di payment-submissions |
| L14 | Kode | `const where: any` di app-notification.service.ts |
| L15 | Frontend | `as any` untuk JSX element (InvoiceDetailPage, DepositOperationsPanel) |
| L16 | Frontend | `any` pada parameter fungsi (isLowStockItem, dll) |
| L17 | Frontend | No global error boundary |
| L18 | Frontend | `key={index}` di 12+ tempat — stable key |
| L19 | Frontend | Hardcoded Indonesian strings (~60+ halaman) — i18n gap |
| L20 | Frontend | `useEffect` missing cleanup di AppLayout.tsx:298 (offcanvas-open class) |
| L21 | Frontend | localStorage tanpa SSR guard di 5 tempat |
| L22 | Frontend | `console.warn` di MyStayPage.tsx:812 — ganti logger |
| L23 | Frontend | Large files (StaysPage 848L, TicketsPage 1337L, MyStayPage 902L) |
| L24 | Auto-Ops | No central "AutoOpsRun" DB record — no observability |
| L25 | Auto-Ops | OverstayEnforcement cek existing ticket OUTSIDE transaction |
| L26 | Auto-Ops | Notification pruning pakai UTC bukan WIB |
| L27 | Business | 21:00 WIB same-day cutoff vs "no cutoff" M02 D-04 |
| L28 | Business | Meter free quota 30kWh tidak diprorata untuk partial months |
| L29 | Business | Expense categories gap — 3 COA codes tidak bisa dipilih manual |
| L30 | Business | WiFi price tidak di-enforce — bisa jual Rp10 atau Rp500.000 |
| L31 | Business | `SMESTERLY` typo di enum |

---

## UAT Global

- [ ] `cd backend; npx tsc --noEmit` = 0
- [ ] `cd backend; npm run build` = 0
- [ ] `cd backend; npm run test:unit` semua hijau
- [ ] `cd frontend; npm run build` = 0
- [ ] Tidak ada perubahan `schema.prisma` selain yang sudah disetujui
- [ ] Tidak ada npm dependency baru
