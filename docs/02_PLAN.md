# KOST48 V5 — Execution Plan
**Versi:** 2026-05-24 V5.23-B1 Backend Accounting Foundation Pre-ACT Lock


## 0.0 Current Execution Override — V5.23-B Accounting & Balance Sheet Foundation

```text
Current latest implementation package:
frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip
backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip

Current verification status:
frontend build not verified in container,
backend unchanged,
runtime/API smoke not run,
FULL PASS not claimed.

Next mode:
PLAN FIRST.
User will provide extra planning/research from another AI.
The next assistant must inspect the uploaded docs/code ZIP first, then produce a coherent accounting roadmap before any patch.
```

### V5.23-B target

Move KOST48 from operational finance summary toward accounting-ready finance that can eventually support:

1. Profit & Loss / Income Statement.
2. Cashflow Statement.
3. Balance Sheet.
4. Asset register.
5. Depreciation.
6. Deposit liability.
7. OPEX / COGS / CAPEX.
8. Ancillary revenue profitability.
9. Owner finance cockpit with honest readiness score.

### Current known gap

Current system has:
- invoices,
- invoice lines,
- invoice payments,
- expenses,
- WiFi sales,
- deposit fields,
- inventory/room item operations.

Current system does **not** yet have:
- Chart of Accounts,
- Cash/Bank account ledger,
- JournalEntry / JournalLine,
- formal asset register,
- depreciation,
- owner capital/equity,
- opening balance,
- formal Balance Sheet.

### Recommended roadmap

#### Batch 1 — Accounting Readiness Foundation

Scope:
- Add or plan expense classification:
  - OPEX
  - COGS
  - CAPEX
- Add revenue stream classification:
  - ROOM_RENT
  - UTILITY
  - WIFI
  - ANCILLARY
  - PENALTY
  - DEPOSIT_RECEIPT (liability, not revenue)
- Add `AncillaryProduct` and `AncillarySale`.
- Keep `WifiSale` as-is short-term.
- Map WiFi into Finance as voucher revenue stream.
- Improve Finance IA without claiming full accounting.

Backend likely needed:
- additive schema only,
- no DB reset,
- no destructive migration.

#### Batch 2 — Cash/Bank + Opening Balance

Scope:
- Add `CashAccount`.
- Add `OpeningBalance`.
- Allow owner/admin to set starting cash/bank, deposit liability, existing assets, and starting equity.
- Define cutover date.

Goal:
- avoid trying to reconstruct old incomplete history.

#### Batch 3 — Auto Journal Lite

Scope:
- Add `ChartOfAccount`.
- Add `JournalEntry`.
- Add `JournalLine`.
- Auto-generate journal entries for:
  - invoice issued,
  - invoice payment,
  - deposit received,
  - deposit refunded/deducted,
  - expense paid,
  - WiFi sale,
  - ancillary sale,
  - CAPEX purchase.

Goal:
- build semi-ledger without forcing full accounting UI too early.

#### Batch 4 — Asset Register + Depreciation

Scope:
- Add `Asset`.
- Add `AssetDepreciation`.
- Support straight-line monthly depreciation.
- Asset categories:
  - building/renovation,
  - furniture,
  - AC/electronics,
  - CCTV/security,
  - router/network equipment,
  - water pump,
  - laundry machine,
  - room equipment.

#### Batch 5 — Financial Statements

Scope:
- P&L from accounts/journals.
- Cashflow from cash movements.
- Balance Sheet from accounts:
  - assets,
  - liabilities,
  - equity.
- Finance readiness score:
  - cash account complete,
  - opening balance set,
  - deposit liability mapped,
  - assets registered,
  - journals balanced,
  - no unmapped transactions.

#### Batch 6 — Migration / Cleanup

Scope:
- Migrate/adapt `WifiSale` into `AncillarySale` reporting.
- Backfill or cutover strategy.
- Consistency checks.
- No production mutation without explicit approval.

### New chat PLAN output required

The next assistant must produce:

A. Executive summary  
B. Current code/data map from actual ZIP  
C. Accounting gap analysis  
D. COA minimal for kos  
E. Schema proposal  
F. Transaction-to-journal mapping  
G. Revenue recognition plan  
H. OPEX/COGS/CAPEX rules  
I. Asset/depreciation plan  
J. Balance Sheet calculation plan  
K. Migration/cutover plan  
L. Backend API plan  
M. Frontend IA/UX plan  
N. Owner cockpit metrics  
O. Phased implementation batches  
P. Risks/guardrails  
Q. UAT plan  
R. ACT recommendation  

### Do not

- Do not implement full double-entry in one risky patch without plan.
- Do not fake Balance Sheet from incomplete data.
- Do not treat deposit as revenue.
- Do not reset DB without explicit user request.
- Do not introduce microservices.
- Do not add dark mode.
- Do not create standalone Reports menu until reporting model is clear.


## 0.0 Current V5.20 Execution Override

```text
Current active package: V5.20 First Paid Room Priority + Fast AutoOps
Mode after docs sync: verify locally, then patch bugs if found.
Architecture remains: Stable Modular Monolith.
No multi-app migration.
No service-to-service HTTP.
No autonomous AI mutation.
```

### Immediate verification plan

1. Apply latest backend/frontend V5.20 ZIP.
2. If DB still contains old partial unique index or old UAT data, reset/bootstrap local dev DB only.
3. Run backend build.
4. Run frontend build.
5. Run AutoOps UAT:
   - expired unpaid booking auto-cancel,
   - pending proof not auto-cancelled,
   - payment reject after expired booking auto-cancels,
   - orphan RESERVED room auto-release,
   - first valid payment cancels competing unpaid interest,
   - one-step payment proof works from tenant UI.
6. Run manual UI smoke:
   - public room card copy,
   - tenant waiting room,
   - tenant Bayar & Kirim Bukti,
   - admin dashboard SLA cards,
   - owner dashboard AutoOps summary,
   - payment review urgency,
   - renew utility checkpoint,
   - checkout readiness.

### Definition of done for V5.20

```text
Do not call FULL PASS until:
backend build PASS,
frontend build PASS,
runtime API UAT PASS,
tenant/admin/owner manual UI smoke PASS,
no unrelated changes,
ZIP final generated.
```



## 0. Current Execution Override

```text
Current verified phase: V5.19 Renew Meter Utility runtime UAT PASS; V5.20 First Paid AutoOps ZIP generated pending local verification
Next phase: V5.20 local build/UAT + UI bug audit for first-paid/payment/AutoOps flow
Default mode: PLAN ONLY unless user explicitly says ACT / YOLO / patch
Architecture: Stable Modular Monolith
Multi-app: roadmap only
```

## 1. Current Verified State

Latest confirmed/pushed state:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
42105e0 fix(frontend): include staff repair constants
14d8e97 feat(staff): stabilize repair workflow and staff ticket visibility
```

V5.16 Staff Repair Flow verified:
- Staff report barang kamar creates ticket.
- Fresh ticket has `assignedToId=3`, `roomId=1`, `linkedRoomItemId=1`.
- Staff list shows active assigned tickets after V5.16-G.
- Ticket detail visibility for staff works.
- Ticket lifecycle works: start, mark done, close, cancel.
- Admin can set final item status.
- Inventory report linking works for fresh ticket.

V5.17 Staff UX verified:
- Clean blue staff UI direction applied.
- Room card clickable/full-card UX applied.
- Inventory health computed from qty/minQty.
- Staff no longer manually selects stock habis/menipis.
- Routine checklist harian/mingguan/bulanan restored as professional work cards.
- User manually checked V5.17-D and said it is good/PASS.
- Working tree clean after generated Prisma restore.

## 2. Immediate Next Priority

```text
Tenant Side Full Audit — PLAN first.
```

Do not patch yet unless user says ACT/YOLO/patch.

Before audit:
1. User should upload latest frontend/backend ZIP or ensure current repo code is available.
2. Inspect real code, not memory.
3. Identify tenant routes, portal pages, hooks, API clients, components, and styles.
4. Compare current tenant UI with contracts and product direction.

## 3. Tenant Side Full Audit Goals

Tenant portal must become:

```text
Tenant = My Stay Guide
```

It should answer clearly:

1. Saya tinggal di kamar apa?
2. Masa sewa saya sampai kapan?
3. Tagihan apa yang harus saya bayar?
4. Bukti pembayaran saya sedang diproses atau sudah diterima?
5. Apakah saya bisa ajukan perpanjangan?
6. Apakah saya bisa ajukan keluar?
7. Apakah ada masalah/ticket/request yang masih menunggu?
8. Apa aksi paling penting sekarang?

## 4. Tenant Pages to Audit

Audit real source files for routes and pages such as:

```text
frontend/src/pages/portal/*
frontend/src/pages/booking/*
frontend/src/pages/invoices/*
frontend/src/pages/tickets/*
frontend/src/components/tenant/*
frontend/src/components/portal/*
frontend/src/components/layout/AppLayout.tsx
frontend/src/config/navigation.ts
frontend/src/api/*
frontend/src/utils/statusLabels.ts
frontend/src/styles.css
```

Expected tenant surfaces:
- Tenant portal home / dashboard
- My stay page
- My invoices page
- Tenant invoice detail
- Payment proof upload
- Payment submission status
- Renew request flow
- Checkout request flow
- My tickets / complaints
- Notifications / urgency chip
- Booking continuation if tenant has active/approved booking
- Tenant profile/room summary if available

## 5. Tenant Audit Framework

### A. Information Architecture

Check:
- Does tenant have too many menu items?
- Is dashboard the primary guidance screen?
- Are invoices, stay, payment, renew, checkout connected logically?
- Is “Reports” or admin/staff terminology leaking to tenant?
- Are routes protected correctly for TENANT?

### B. Tenant Language / Microcopy

Must use:
- “Tagihan”
- “Masa sewa”
- “Akhir masa sewa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Bukti pembayaran sedang diperiksa”
- “Tidak perlu upload ulang”
- “Menunggu keputusan admin”
- “Hubungi admin”

Avoid:
- `stay`
- `periodEnd`
- `checkout request`
- `ISSUED`
- `PENDING_REVIEW`
- `payment submission`
- enum mentah/backend terms
- technical lifecycle/mutation terms

### C. Assistant / Rule Intelligence

Tenant assistant must be useful, not decorative.

Tier 0 deterministic rules:
- If payment submission `PENDING_REVIEW`:
  - “Bukti pembayaran kamu sedang diperiksa. Tidak perlu upload ulang.”
- If invoice open/overdue:
  - show CTA “Lihat Tagihan” / “Bayar Sekarang”
- If renew pending:
  - “Pengajuan perpanjangan sedang menunggu keputusan admin.”
- If checkout pending:
  - “Pengajuan keluar sedang diproses.”
- If checkout blocked by open invoice:
  - “Selesaikan tagihan dulu sebelum keluar final.”
- If near end of lease:
  - “Masa sewa akan segera berakhir. Ajukan perpanjangan atau keluar.”
- If no active stay:
  - give clear next step, not blank dashboard.
- If ticket open:
  - show status and next expectation.

### D. Flow Guards

Audit:
- Tenant cannot upload duplicate proof when payment is pending review.
- Tenant cannot request renew/checkout if blocked by unpaid invoice where rule says blocked.
- Tenant sees correct CTA based on invoice/payment status.
- Tenant does not execute final checkout.
- Tenant does not approve payment.
- Tenant does not mutate lifecycle finalization.
- Checkout final remains admin/core flow.

### E. UI/UX Quality

Audit:
- readable font weights, no overly thick fonts.
- no low-contrast text.
- same modern blue design system as staff.
- no dark mode.
- cards should be informative, not decorative.
- CTA should be obvious but not duplicated.
- status badges must be human-readable.
- mobile/responsive sanity.

### F. API/Data Availability

Map which API already provides:
- current tenant/stay
- invoices
- invoice detail
- payment submissions
- renew requests
- checkout requests
- tickets
- notifications
- room info
- urgency/payment status

Decide:
- backend unchanged if existing API enough.
- backend patch only if data minimal is unavailable or endpoint bug blocks tenant flow.

## 6. Expected PLAN Output in Next Chat

The next ChatGPT must produce:

A. Executive summary  
B. Current tenant frontend map  
C. Current tenant API/data map  
D. Tenant UX gap analysis  
E. Tenant business-rule gap analysis  
F. Assistant/rule intelligence opportunities  
G. Exact files to touch/create  
H. Backend unchanged/needed decision  
I. Risks/unknowns  
J. ACT patch plan  
K. PowerShell build/smoke commands

## 7. ACT Scope After Audit

Potential V5.18-A ACT scope:

```text
V5.18-A Tenant My Stay Guide + Payment/Renew/Checkout Assistant
```

Possible patch:
- Redesign tenant portal home as My Stay Guide.
- Redesign invoice cards/detail.
- Add tenant assistant cards.
- Payment under review banner.
- Improve renew/checkout request flows.
- Remove technical enum/backend language.
- Add blocked reason cards where needed.
- Ensure duplicate proof upload UX is safe.
- Keep backend unchanged unless existing data is insufficient.

## 8. Tenant Smoke Commands

Use PowerShell only. Do not use curl.

Login tenant once:

```powershell
$tenantLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"tenant@kost48.com","password":"tenant123"}'; $tenantToken=$tenantLogin.data.accessToken
```

Protected smoke examples:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/me/stay" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/invoices" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/renew-requests" -Headers @{Authorization="Bearer $tenantToken"}
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tenant/checkout-requests" -Headers @{Authorization="Bearer $tenantToken"}
```

If endpoint names differ, inspect real code and adjust. Do not invent endpoints.

## 9. Definition of Done

No further patch can be called PASS unless:
1. Source files inspected.
2. Backend build PASS if backend touched.
3. Frontend build PASS if frontend touched.
4. Manual smoke / UAT command actually run.
5. No unrelated file changes.
6. No file-based UAT scripts created unless user explicitly asks.
7. No DB reset.
8. No production mutation.
9. ZIP final generated if requested.
10. Git commit/push done if release task requested.
11. Generated Prisma noise not committed accidentally.

## 10. New Chat Prompt

Use the prompt from the assistant final response in the current chat. It must tell the next ChatGPT:
- start PLAN only,
- inspect uploaded ZIP/code,
- focus tenant side full audit,
- use these docs as source of truth,
- keep V5.17-D staff state as done,
- do not patch until ACT.


## 11. V5.20 AutoOps / First Paid ACT Plan

## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Prinsip bisnis utama

```text
Prioritas kamar mengikuti pembayaran valid pertama, bukan siapa yang hanya pesan duluan.
Booking/minat belum mengunci kamar.
Tenant baru hanya boleh bayar setelah kamar siap dihuni.
Tenant lama tidak boleh hutang.
Kalau tenant lama telat melewati batas pembayaran/kontrak dan kamar sudah diambil tenant baru, tenant lama wajib mengosongkan kamar maksimal 3 jam.
```

### Deadline operasional default

| Flow | Deadline default | AutoOps / eskalasi |
|---|---:|---|
| Booking/minat tanpa keputusan admin | 3 jam | Auto-cancel dan kamar dibuka kembali jika tidak ada bukti valid |
| Tagihan awal setelah kamar siap | 3 jam | Auto-cancel booking jika belum bayar + belum kirim bukti |
| Bukti pembayaran pending review | urgent 1 jam, escalate 3 jam, max 6 jam | Tidak auto-cancel tenant yang sudah kirim bukti; naik prioritas admin/owner |
| Invoice aktif tenant berjalan | urgent 6 jam, overdue 24 jam | Renew/checkout tetap blocked sampai lunas |
| Renew request | urgent 3 jam, escalate 6 jam | Admin wajib catat meter dan buat invoice renew utility |
| Checkout request | urgent 3 jam, escalate 6 jam | Admin review cepat; final checkout tetap manual |
| Checkout approved belum final | 6 jam | Owner/Admin melihat room tertahan |
| Tenant lama telat + tenant baru valid | 3 jam | Tenant lama wajib keluar maksimal 3 jam |
| Ticket staff | 24–48 jam | Lebih longgar karena pekerjaan fisik |

### Payment UX contract

```text
Tenant tidak boleh diarahkan "bayar dulu, upload bukti nanti".
Tenant action harus satu langkah: Bayar & Kirim Bukti.
Backend boleh tetap menyimpan upload file dan payment submission secara terstruktur, tetapi frontend harus terasa sebagai satu aksi.
```

### Copy wajib untuk tenant/public

```text
Pemesanan belum mengunci kamar. Kamar baru aman setelah pembayaran lunas dan disetujui admin.
Jika masa sewa habis dan tagihan perpanjangan belum dibayar, kamar dapat ditawarkan kembali.
Jika kamar sudah diambil tenant baru yang membayar valid, perpanjangan tidak dapat dilanjutkan.
Jika kamu telat dan kamar sudah diambil tenant baru, kamu wajib mengosongkan kamar maksimal 3 jam.
Tidak ada sistem hutang.
```

### Batas otomatisasi

Boleh otomatis:
- expired unpaid booking auto-cancel,
- unpaid approved booking auto-cancel,
- orphan RESERVED room auto-release,
- overdue/urgent notification,
- dashboard priority/escalation,
- duplicate/redundant alert dedup.

Tetap manual:
- approve/reject payment,
- approve renew + catat meter,
- final checkout,
- refund/deduction deposit,
- close ticket final,
- inventory movement resmi.

## 12. V5.20 UAT targets

```text
1. Create room + tenant + booking interest.
2. Force booking expiresAt to past.
3. Run /api/auto-ops/run.
4. Verify unpaid booking CANCELLED and room AVAILABLE.
5. Create booking with PENDING_REVIEW proof.
6. Force expiresAt to past.
7. Run AutoOps.
8. Verify booking is NOT cancelled while proof is pending.
9. Reject proof after deadline.
10. Verify booking auto-cancel and room AVAILABLE.
11. Create two unpaid booking interests for same room if business index allows it.
12. Approve payment for one.
13. Verify competing unpaid interests are cancelled.
14. Verify tenant payment UI uses one-step Bayar & Kirim Bukti.
```


## 0.1 Final Pre-ACT Plan — V5.23-B1 Accounting Foundation Readiness

```text
Next ACT target: Backend V5.23-B1 Accounting Foundation Readiness.
Status: READY FOR ACT after backend_latest_for_accounting_act_CLEAN.zip received and verified.
Patch style: large coherent backend patch, but additive-only.
```


## Backend Current Map — Operational Finance, Not Formal Accounting

```text
Existing operational finance truth:
- Invoice / InvoiceLine / InvoicePayment
- PaymentSubmission review flow
- Expense
- WifiSale
- Stay deposit operational snapshot fields
- FinanceService business-health
- ReportsService operational reports
- AuditLog
- PostgreSQL trigger/constraint layer in sql/bootstrap.sql

Relevant modules:
- src/modules/finance
- src/modules/reports
- src/modules/invoices
- src/modules/invoice-payments
- src/modules/payment-submissions
- src/modules/expenses
- src/modules/wifi-sales
- src/modules/stays
- src/modules/tenant-bookings
- src/modules/inventory-items
- src/modules/inventory-movements
- src/modules/room-items

Existing finance/report endpoints:
- GET /api/finance/business-health
- GET /api/finance/occupancy/summary
- GET /api/finance/formal-ratios/readiness
- GET /api/finance/balance-sheet/draft
- GET /api/reports/monthly-income
- GET /api/reports/overdue-aging
- GET /api/reports/deposit-liability
- GET /api/reports/expense-summary
- GET /api/reports/cash-flow
- GET /api/reports/profit-loss
- GET /api/reports/financial-ratios
- GET /api/reports/occupancy

Docs/code out-of-sync risk:
/reports/profit-loss and /reports/financial-ratios can sound too formal.
They must be labeled OPERATIONAL_APPROXIMATION until ledger/readiness is real.
```


## V5.23-B1 ACT Scope Lock — Accounting Foundation Readiness

```text
B1 is a ledger foundation and readiness patch.
B1 is NOT auto-posting.
B1 is NOT formal Balance Sheet.
B1 is NOT deposit migration.
B1 is NOT payment/stay/checkout/renew rewrite.
```

### Schema additions allowed in B1

```text
ChartOfAccount
CashAccount
AccountingPeriod
OpeningBalanceBatch
OpeningBalanceLine
JournalEntry
JournalLine
```

### Backend module additions allowed in B1

```text
src/modules/accounting/accounting.module.ts
src/modules/accounting/accounting.controller.ts
src/modules/accounting/accounting.service.ts
src/modules/accounting/accounting-posting.service.ts
src/modules/accounting/accounting-readiness.service.ts
src/modules/accounting/accounting-reports.service.ts
src/modules/accounting/constants/default-coa.ts
src/modules/accounting/dto/*
```

### Existing files allowed to touch in B1

```text
prisma/schema.prisma
src/app.module.ts
src/modules/reports/reports.service.ts
Optional only if necessary: src/common/enums/app.enums.ts
```

### Files forbidden to touch in B1

```text
src/modules/payment-submissions/payment-submissions.service.ts
src/modules/stays/stays.service.ts
src/modules/checkout-requests/*
src/modules/renew-requests/*
src/modules/tenant-bookings/*
src/modules/invoice-payments/*
src/modules/invoices/*
src/modules/expenses/*
src/modules/wifi-sales/*
```

### B1 endpoint target

```text
GET  /api/accounting/readiness
POST /api/accounting/default-coa/seed
GET  /api/accounting/accounts
POST /api/accounting/accounts
PATCH /api/accounting/accounts/:id
GET  /api/accounting/cash-accounts
POST /api/accounting/cash-accounts
PATCH /api/accounting/cash-accounts/:id
GET  /api/accounting/opening-balances
POST /api/accounting/opening-balances/draft
GET  /api/accounting/journal-entries
GET  /api/accounting/trial-balance
GET  /api/accounting/unmapped-transactions
GET  /api/accounting/balance-sheet
```

### Report honesty rule

```text
Existing reports should include metadata:
- basis: OPERATIONAL_APPROXIMATION
- ledgerBacked: false
- formalStatementReady: false
- readinessNote: current report uses operational invoice/payment/expense data, not formal accounting ledger.
```


## V5.23-B Roadmap After B1

```text
Batch 2 — Opening Balance + Cash Setup
- opening balance draft/approve/post, default cash account, accounting period, Owner-only posting

Batch 3 — Expense Classification
- OPEX / COGS / CAPEX, Expense.coaId, Expense.cashAccountId, CAPEX Owner approval

Batch 4 — Invoice/Payment Auto Posting
- invoice issued posting, invoice payment posting, payment submission deposit portion posting, idempotency guard, after cutover only

Batch 5 — Deposit Ledger Additive Sync
- TenantDepositLedger movement history, deposit liability reconciliation, Stay deposit fields remain operational snapshot, no field drop

Batch 6 — Ancillary Revenue
- AncillaryProduct, AncillarySale, keep WifiSale short-term, optional adapter later

Batch 7 — Asset Register + Depreciation
- asset register, straight-line depreciation, monthly depreciation run, no inventory link in first asset patch

Batch 8 — Equity + Owner Capital / Drawing
- Owner capital/drawing via COA and journal entries, retained earnings from period close, no auto-close period yet
```


## Verification Commands — PowerShell Only

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
```

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/finance/business-health" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/accounting/default-coa/seed" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/accounts" -Headers @{Authorization="Bearer $token"}
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/trial-balance?asOf=2026-05-31" -Headers @{Authorization="Bearer $token"}
```

```text
Do not claim PASS without backend build success, API smoke success, no unrelated changes, final ZIP generated, and honest note if runtime/manual verification was not run.
```
