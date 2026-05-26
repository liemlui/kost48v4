# KOST48 V5 — Ground State
**Versi:** 2026-05-26 V5.24-C Released + Next Plan Lock
**Status:** Source of truth utama setelah V5.24-C. Accounting foundation B2 sudah functional; admin UI critical hardening sudah pushed.


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

## 0.0 Latest V5.23-B Ground State — Accounting & Balance Sheet Planning

```text
Current latest generated frontend package:
- frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip

Current latest backend package:
- backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip

Verification status:
- V5.23-A frontend package generated.
- Backend unchanged in V5.23-A.
- Frontend build still needs local verification because ZIP handoff did not include node_modules.
- Runtime/API smoke still needs local verification.
- Do not call FULL PASS until local build + smoke + manual UI verification pass.
```

### Current active planning track

```text
Next official planning track:
V5.23-B Accounting & Balance Sheet Foundation

Goal:
Move KOST48 finance from operational summary into accounting-ready foundation that can eventually produce:
- Profit & Loss
- Cashflow
- Balance Sheet
- Asset register
- Deposit liability
- Ancillary revenue profitability
- Expense split: OPEX / COGS / CAPEX
```

### Admin IA final direction

Admin sidebar is restored and must stay simple:

```text
Dashboard
Stays & Tenant
Finance
Staff & Tiket
Kamar & Stok
```

Header owns:

```text
Bell / Alert
Pengumuman
Akun / Settings
Logout
```

No separate sidebar items for:
- Pengumuman,
- Settings,
- Expenses,
- Tenant,
- Tiket,
- Reports.

Rules:
- Tenant belongs under Stays & Tenant.
- Expenses belongs under Finance.
- Tiket belongs under Staff & Tiket.
- Pengumuman belongs in header.
- Settings belongs in header/user menu.
- Reports is not a standalone admin sidebar item until the finance/reporting model is concrete.

### Finance direction

Finance must become the home for:

```text
Tagihan
Review Pembayaran
Voucher WiFi
Pendapatan Tambahan
Pengeluaran
Riwayat Pembayaran
Aset
Laporan Keuangan
```

Short-term:
- Existing `WifiSale` remains active for voucher WiFi.
- Existing `Expense` remains active, but UI/categories should move toward kos-specific classification.
- `AncillaryProduct` / `AncillarySale` is the recommended future model for laundry, galon, cleaning, parking, extra guest, key/card replacement, linen, snack, and similar add-on services.

Accounting warning:
- Current system has operational finance summary, not full accounting ledger.
- Do not fake Balance Sheet, ratios, or accounting statements until required accounting data exists.


## 0.0 Latest V5.20 Ground State

```text
Current active implementation package: V5.20 First Paid Room Priority + Fast AutoOps
Latest generated code ZIP:
- backend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip
- frontend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip

Verification status:
- V5.19 Renew Meter Utility backend runtime UAT PASS from local user log.
- V5.20 source ZIP generated.
- V5.20 still requires local backend build, frontend build, DB bootstrap/reset if needed, and fresh UAT before being called FULL PASS.
```

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


## 0. Current State

```text
Active architecture: Stable Modular Monolith
Current verified implementation track: V5.19 Renew Meter Utility runtime UAT PASS; V5.20 First Paid AutoOps generated pending final local verification
Next active planning track: V5.20 local build/UAT + Admin/Owner/Tenant UI bug audit after AutoOps
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
- Project root:

```text
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle
```

## 0.1 Product Direction Locked

Arah produk tetap:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

Aplikasi tidak boleh terasa seperti database viewer atau dashboard dekoratif. KOST48 harus menjadi pusat kendali operasional kos:

- Owner: bisnis sehat atau tidak, uang masuk kurang di mana, risiko apa yang perlu diputuskan?
- Admin: apa yang harus dikerjakan hari ini, mana yang urgent, flow mana yang macet?
- Staff: tugas fisik/tiket/meter/inventaris mana yang perlu ditangani?
- Tenant: status sewa saya apa, apa yang harus saya bayar, apa yang sedang diproses?
- Public: kamar mana yang tersedia dan bagaimana cara booking?

## 0.2 Latest Verified Code State

Latest pushed commits:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
42105e0 fix(frontend): include staff repair constants
14d8e97 feat(staff): stabilize repair workflow and staff ticket visibility
```

Working tree after restore generated Prisma was clean in the last user report.

V5.17-D was manually checked by user and marked:

```text
PASS — Staff Routine Work Cards + Inventory Intelligence + Clean Staff UX
```

## 0.3 V5.16 Staff Repair Flow — Verified State

V5.16 menutup masalah flow staff/tenant/admin untuk barang kamar dan gudang.

Keputusan final:

```text
Staff = lapor kondisi / diagnosis lapangan / kerjakan tugas / upload bukti.
Admin/Owner = konfirmasi status final barang, review laporan, close/cancel ticket, dan mutasi stok resmi.
System/Rule Intelligence = hitung status objektif yang bisa dihitung otomatis.
```

Source of truth bisnis:

```text
Ticket = process controller
StaffFieldReport = laporan kondisi lapangan / diagnosis staff
RoomItem.status = display/final state barang kamar setelah keputusan admin/owner
InventoryItem.status = kondisi fisik/final barang gudang setelah keputusan admin/owner, bukan status stok otomatis
Inventory health = dihitung dari qtyOnHand/minQty, bukan input manual staff
InventoryMovement = kebenaran stok/fisik barang resmi
```

Verified UAT manual:

- Staff report barang kamar membuat ticket dengan `assignedToId=3`, `roomId=1`, `linkedRoomItemId=1`.
- Staff report gudang bisa link `linkedInventoryItemId`.
- Staff list `/api/tickets?limit=20` sekarang menampilkan pekerjaan aktif assigned ke staff.
- Staff detail ticket assigned dapat dibuka.
- Ticket lifecycle berhasil:
  - `OPEN → IN_PROGRESS → DONE → CLOSED`
  - `OPEN → CANCELLED`
- Ticket 6 manual UAT: `CLOSED`, `finalRoomItemStatus=GOOD`.
- Ticket 7 manual UAT: `CLOSED`, `finalInventoryItemStatus=OUT_OF_STOCK`.
- Fresh linking UAT membuktikan linking baru berjalan untuk ticket baru.
- Ticket 12 terlihat di staff list setelah V5.16-G.

Important:
- Ticket lama sebelum V5.16-E bisa tetap `linkedRoomItemId` kosong; itu data historis dev/UAT lama, bukan bug baru.
- Future UAT tidak dibuat sebagai file script kecuali user minta. Tulis UAT commands langsung di chat.

## 0.4 V5.17 Staff UX Track — Verified State

### V5.17-B — Clean Blue App System + On-Flow Staff/Admin Repair UX

- Staff room cards dibuat clickable penuh.
- Tombol dobel dengan fungsi sama dihapus.
- Clean blue unified style diterapkan pada staff workspace.
- Font weight dijaga ringan; tidak boleh terlalu tebal atau sulit dibaca.
- Kontras teks/status diperkuat.
- Modal laporan staff menggunakan progressive disclosure, bukan select panjang.
- Admin review decision dibuat lebih on-flow.

### V5.17-C — Inventory Intelligence + Less Manual Admin Friction

- Status stok gudang dihitung otomatis dari `qtyOnHand/minQty`.
- Staff tidak memilih manual status seperti “stok habis” atau “stok menipis”.
- Gudang dibedakan:
  - status stok otomatis = hitungan sistem,
  - kondisi fisik barang = laporan staff/admin.
- Assistant staff membaca inventory health dan memberi prioritas.
- Admin tidak dibebani konfirmasi untuk hal yang bisa dihitung sistem.
- Admin tetap menangani exception/approval/movement resmi.

### V5.17-D — Routine Work Cards

- Checklist harian/mingguan/bulanan dikembalikan sebagai core staff work board.
- Checklist tampil sebagai professional cards dengan progress visual ringan.
- Assistant strip membaca kondisi checklist:
  - pekerjaan aktif,
  - checklist belum selesai,
  - kendala butuh bantuan,
  - semua aman.
- Tidak ada chart dependency baru.
- User sudah cek manual dan menyatakan bagus/pass.

## 0.5 Next Focus Locked

Next focus:

```text
PLAN FIRST: Tenant Side Full Audit
```

Jangan langsung patch sebelum audit code asli/ZIP terbaru.

Tenant side harus diarahkan menjadi:

```text
Tenant = My Stay Guide
Tenant portal bukan dashboard database, tetapi panduan tinggal yang menjawab:
- masa sewa saya sampai kapan?
- tagihan apa yang harus saya bayar?
- bukti pembayaran saya sedang apa?
- permintaan perpanjangan/keluar saya statusnya apa?
- apa aksi paling penting sekarang?
```

## 1. Hard Rules

1. Jangan rewrite total.
2. Jangan patch sebelum inspect file asli ZIP/code terbaru.
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
16. UAT command ditulis di chat, jangan buat file script UAT kecuali user eksplisit minta.
17. Generated Prisma noise tidak boleh ikut commit tanpa keputusan sadar.
18. Jika `npx prisma generate` mengubah `backend/src/generated/prisma`, jangan commit otomatis; restore sebelum push kecuali memang diputuskan tracked update.

## 2. UI/UX Direction Locked

- Clean, readable, modern.
- Hindari font terlalu tebal.
- Hindari teks/badge low contrast.
- Warna biru modern boleh, tetapi jangan Bootstrap demo feel.
- Style harus konsisten app-wide, bukan staff/admin/tenant berganti tema.
- Assistant/rule intelligence harus berguna dan on-flow, bukan dekorasi.
- Jika sistem bisa menghitung otomatis, jangan minta input manual user.
- Admin/staff/tenant flows harus simpel dan sesuai proses bisnis.

## 3. Stable Modular Monolith Remains Active

Tetap:

```text
No apps/ generation.
No runtime alias mirror hack.
No core-api/tenant-api/staff-api/finance-api/marketing-api shell now.
No service-to-service HTTP now.
No workspace migration now.
```

Backend/schema boleh dibuka hanya bila bounded, additive, dan migration-safe.

## 4. Locked Business Guards

Jangan hilangkan:

1. Renewal invoice harus `ISSUED` setelah admin approve.
2. Checkout final block jika ada open invoice.
3. Open invoice = status bukan `PAID` dan bukan `CANCELLED`.
4. `DRAFT` ikut block checkout.
5. `complete()` tidak auto-create final utility invoice.
6. Payment approval yang mutate invoice/stay/room/meter/deposit tetap core monolith.
7. Renew approval/execution tetap core monolith.
8. Room occupancy/status writes tetap core monolith.
9. Admin approve checkout request tidak sama dengan final checkout.
10. Tenant hanya create/view request/submission, tidak menjalankan lifecycle final.
11. Staff tidak membuat mutasi finance/lifecycle sensitif.
12. InventoryMovement resmi tetap OWNER/ADMIN.
13. AI/assistant tidak melakukan autonomous mutation.

## 5. Next Recommended Focus

```text
Tenant Side Full Audit dulu.
```

Scope audit tenant:
- portal home / My Stay Guide
- invoice list/detail
- upload payment proof
- payment under review UX
- renew request
- checkout request
- tickets/complaints from tenant side
- notification/urgency chip
- tenant language/microcopy
- blocked flows and assistant cards
- API contracts used by tenant pages
- role guard/navigation consistency

After audit:
- produce PLAN with exact files to touch.
- ACT only after user says ACT/YOLO/patch.


## 0.1 Latest Pre-ACT Lock — V5.23-B1 Backend Accounting Foundation

```text
Date: 2026-05-24
Mode: DOCS SYNC / PRE-ACT LOCK
Clean backend snapshot received: backend_latest_for_accounting_act_CLEAN.zip
Clean ZIP: about 15.2 MB, 255 files, includes src/prisma/sql/scripts/uploads, excludes node_modules/dist/.git/.env.

Backend audit snapshot:
- Prisma models: 29
- Prisma enums: 34
- AccountingModule: not present
- ChartOfAccount / CashAccount / AccountingPeriod / OpeningBalance / JournalEntry / JournalLine: not present
- TenantDepositLedger / Asset / Depreciation / AncillarySale: not present

Combined verdict:
PLAN complete enough.
READY FOR ACT B1 only with strict additive-only accounting foundation scope.
Do not touch payment, stay, checkout, renew, booking, or invoice-payment flows in B1.
```

### Cline / DeepSeek pre-ACT finding

```text
Cline verdict: CONDITIONALLY READY.
Reason: working tree before clean ZIP was dirty: 97 modified files + 22 untracked files.
High-risk changed files included payment-submissions.service.ts, stays.service.ts, and app.module.ts.
Resolution: use backend_latest_for_accounting_act_CLEAN.zip as the only backend source snapshot for next ACT.
```

### Critical correction

```text
Do NOT remove or deprecate Stay deposit fields in near-term patches.
Stay deposit fields remain operational snapshot fields because current payment, checkout, refund, report, and frontend flows still depend on them.
Future TenantDepositLedger must be additive and synchronized gradually.
No drop field, no lifecycle rewrite, no checkout rewrite.
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

## 0.1 Active Ground State — After V5.24-C

```text
Active architecture: Stable Modular Monolith.
Current verified product direction: KOST48 Command Center + Accounting-ready finance foundation.
Current latest pushed commit: cb93fe6.
Current release state: V5.24-C pushed after B2 accounting setup hardening.
```

### Accounting state

```text
B1/B2 foundation exists:
- ChartOfAccount
- CashAccount
- AccountingPeriod
- OpeningBalanceBatch/Line
- JournalEntry/Line
- Accounting readiness
- Trial Balance
- Balance Sheet guard
- Owner Accounting Setup UI
- Void draft opening balance

Verified UAT:
- COA seeded: 37 accounts
- Cash account created: Bank Utama KOST48
- Accounting period: 2026-05 OPEN
- Opening balance posted: 30.000.000 debit / 30.000.000 credit
- JournalEntry created: JE-OPENING-1
- Trial Balance balanced
- Draft duplicate voided
```

### Admin UI state

```text
V5.24-C fixed:
- GlobalSearch restored for admin.
- Dashboard DONE tickets no longer use misleading "Selesai" navigation-only behavior.
- StaysPage ALL filter no longer hardcoded ACTIVE.
- AncillaryRevenuePage no longer presents future items as active actions.
- Dashboard dead code/copy partly cleaned.
```

### Carry-forward

```text
Do not start B3 auto-journal blindly.
First decide whether to run V5.24-D Admin UI Architecture + Performance Hardening:
- reduce dashboard blocking queries,
- clean dead RoleWorkspaceTabs path,
- improve admin sidebar context,
- make progress indicators meaningful,
- keep sidebar as primary admin navigation.
```
