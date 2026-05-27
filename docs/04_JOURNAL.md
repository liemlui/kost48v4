# KOST48 V5 — Project Journal
**Versi:** 2026-05-26 V5.29-B9A Pushed + B9B Copy Smoke + V5.29-C/D/E Hotfix Plan


## 0.0 Latest Current State — V5.29-B9A Pushed + B9B Copy Smoke + Critical Hotfix Track

```text
Current latest pushed commit:
51eba86 feat(accounting): add statement command center finance cockpit

Previous accounting governance baseline:
286e512 fix(accounting): block manual edits in closed period governance

B9A status:
- V5.29-B9A Statement Command Center Finance Cockpit has been pushed to origin/main.
- Frontend build PASS was verified during ZIP patching.
- Runtime accounting API smoke PASS was verified from user log.
- Manual UI smoke PASS: Finance → Laporan Keuangan tampil dengan baik.
- Backend unchanged in B9A.

B9B status:
- V5.29-B9B Copy Consistency Cleanup package was generated.
- Runtime accounting API smoke PASS from user log:
  - readiness warnings no longer mention stale B1/B2/no-auto-posting copy,
  - Trial Balance formalStatementReady=true and balanced,
  - Balance Sheet ready=true, formalStatementReady=true, balanced,
  - Profit & Loss formalStatementReady=true and excludes closing/reversal,
  - Period Close state CLOSED with JE-CLOSE-2026-05-V2,
  - unmapped operational=0, draft journal=0, unbalanced posted journal=0,
  - depreciation posted, asset alignment safe.
- B9B build/commit/push still needs local confirmation unless user reports it completed.

Critical audit received after B9:
- B1 Deposit partial refund can leave untracked deposit remainder.
- B2 agreedRentAmountRupiah uses || instead of ??, so rent 0 is ignored.
- B3 invoiceCount equals openInvoiceCount because query count is filtered.
- B4 requestedTerm in renew request is ignored during approve.
- F1 Check-in wizard is missing BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY terms.
- B5 checkout notification uses current planned checkout date instead of requested checkout date.
- B6 DRAFT invoice cancellation calls reversal unnecessarily and swallows accounting errors.
- B7 checkout-requests findAll response is inconsistent.
- F2 approve renew does not invalidate admin-checkout-requests cache.

Current recommended order:
M0   Finish B9B build/commit/push hygiene.
M0.5 V5.29-C Critical Lifecycle/Data Integrity Hotfix: B1, B2, B3.
M0.6 V5.29-D Renew/Checkout Consistency Hotfix: B4, B5, B7, F2.
M0.7 V5.29-E Admin Check-In + Invoice Hygiene Fix: F1, B6.
M1   Tenant My Stay Guide Full Audit.
M2   Tenant Payment/Renew/Checkout UX Hardening.
M3   AutoOps + First-Paid Runtime UAT.
M4+  Deposit Ledger Detail, Cashflow, OPEX/COGS/CAPEX, Ancillary Revenue, Global Data Quality, Unified Command Center, Production Readiness.
```

### Verification and release hygiene

```text
Do not claim a new FULL PASS without:
- backend build PASS if backend touched,
- frontend build PASS if frontend touched,
- runtime API smoke PASS for touched flows,
- manual UI smoke where UI changed,
- no unrelated changes,
- generated Prisma restored before commit,
- final ZIP or GitHub push confirmed depending on release type.
```

PowerShell only:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status -sb; git log --oneline -5
```

Generated Prisma hygiene:

```powershell
git restore --staged backend/src/generated/prisma
git restore backend/src/generated/prisma
git status -sb
```

### Source-of-truth note

```text
This section supersedes older V5.28-B8/B9 planning sections below.
Older sections remain as historical record only.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```


## 2026-05-26 — V5.29-B9A/B9B + Critical Audit Planning Journal

### V5.29-B9A — Statement Command Center Finance Cockpit

Status:
```text
Commit pushed:
51eba86 feat(accounting): add statement command center finance cockpit

Verified:
- Frontend build PASS.
- Runtime accounting API smoke PASS.
- Manual UI smoke PASS: Finance → Laporan Keuangan tampil dengan baik.
- Backend unchanged.
```

Added:
- Statement command center.
- Statement status cards.
- Accounting data quality panel.
- Period close/reopen/re-close timeline.
- Journal audit trail.
- Owner-facing finance navigation cleanup.

### V5.29-B9B — Copy Consistency Cleanup

Status:
```text
Package generated.
Runtime accounting API smoke PASS from user log.
Build/commit/push pending unless user confirms.
```

Verified API behavior:
```text
Readiness warnings now say ledger accounting is ready to read.
Trial Balance formalStatementReady=true and balanced.
Balance Sheet ready=true, formalStatementReady=true, balanced.
P&L formalStatementReady=true and excludes closing/reversal.
Period close CLOSED with JE-CLOSE-2026-05-V2.
Unmapped operational=0.
Draft journal=0.
Unbalanced posted journal=0.
Depreciation posted.
Asset alignment safe.
```

### Critical Audit Received

Accepted bug list:
```text
B1 CRITICAL — Deposit partial refund can leave deposit remainder untracked.
B2 CRITICAL — agreedRentAmountRupiah uses || and ignores 0.
B3 HIGH — invoiceCount equals openInvoiceCount due filtered count.
B4 HIGH — requestedTerm ignored during renew approve.
F1 HIGH — check-in wizard missing BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY.
B5 MEDIUM — checkout notification date uses planned date instead of requested date.
B6 MEDIUM — DRAFT invoice cancellation calls reversal unnecessarily and swallows accounting errors.
B7 MEDIUM — checkout-requests findAll response shape inconsistent.
F2 LOW — approve renew does not invalidate admin-checkout-requests cache.
```

### New Journal Target

```text
PLAN/ACT V5.29-C — Critical Lifecycle/Data Integrity Hotfix
```

Scope:
- B1 deposit partial refund guard.
- B2 rent 0 nullish coalescing fix.
- B3 invoiceCount total vs openInvoiceCount filtered.


## 2026-05-26 — V5.26-B6 to V5.28-B8 Accounting Governance Release

### B6 — Fixed Asset Ledger Alignment

B6 added explicit schema-backed fixed asset ledger alignment:
- `FixedAssetLedgerAlignmentStatus`
- `FixedAssetLedgerAlignmentMethod`
- alignment fields on `FixedAsset`
- asset ledger alignment DTO/endpoints
- Asset Register UI alignment workflow

Verified result from previous UAT:
```text
Asset FA-00001 aligned.
FixedAsset.ledgerAlignmentStatus = ALIGNED.
ledgerAlignmentAmountRupiah = 3.600.000.
JournalEntry JE-AUTO-ADJUSTMENT-FIXED-ASSET-ALIGNMENT-1 balanced.
Balance Sheet and Trial Balance balanced.
Asset register net book value matches ledger fixed assets.
```

### B7 — Period Close + Retained Earnings

B7 added:
- readiness, preview, and post endpoints for period close,
- `JournalSourceType.CLOSING_ENTRY`,
- `AccountingPeriod` close metadata,
- Owner-only close action,
- closing journal to move P&L to Retained Earnings,
- P&L metadata that keeps operational performance readable after close.

Runtime UAT:
```text
Readiness ready=true.
Preview balanced: 125.000 debit / 125.000 kredit.
Post close created JE-CLOSE-2026-05.
AccountingPeriod status CLOSED.
Duplicate close blocked.
Trial Balance after close balanced.
Balance Sheet after close balanced.
P&L basis LEDGER_OPERATIONAL_PNL_EXCLUDING_CLOSING_B7.
```

### B8 — Closed Period Governance + Reopen/Reversal

B8 added:
- `JournalSourceType.CLOSING_REVERSAL`,
- reopen metadata on `AccountingPeriod`,
- reopen preview and reopen endpoints,
- closed period posting guard,
- manual period status guard,
- journal draft guard for CLOSED period,
- re-close versioning.

Runtime UAT:
```text
Reopen created CLOSING_REVERSAL and returned period to OPEN.
P&L stayed readable and excluded closing/reversal.
Re-close created JE-CLOSE-2026-05-V2.
Duplicate close after re-close blocked.
Trial Balance after re-close: 34.170.000 debit / 34.170.000 kredit.
Balance Sheet after re-close: assets 29.915.000 = liabilities+equity 29.915.000.
Latest GitHub commit: 286e512.
Working tree clean: ## main...origin/main.
```

### Next Journal Target

```text
PLAN V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening
```

Focus:
- statement command center UI,
- data quality/readiness warnings,
- period close/reopen timeline,
- journal audit trail readability,
- cleanup stale B1/B2/no-auto-posting copy,
- Finance navigation to Balance Sheet / P&L / Trial Balance / Asset Register / Period Close.


## 2026-05-24 — V5.23-A Admin IA + Finance Add-on Revenue Package

### Konteks

Setelah beberapa iterasi V5.22, user mengarahkan kembali IA admin agar sidebar menjadi navigasi utama, bukan top workspace tabs. User juga memutuskan penggabungan domain:

```text
Tenant gabung Stays.
Expenses gabung Finance.
Tiket gabung Staff.
Pengumuman tetap header.
Settings tetap header.
Reports tidak perlu dulu.
```

### Package terakhir

Latest generated frontend package:

```text
frontend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_FULL.zip
```

Latest backend package:

```text
backend_20260524_V523A_ADMIN_IA_FINANCE_ADDON_REVENUE_UNCHANGED.zip
```

### Isi patch V5.23-A

- Admin sidebar final 5 menu:
  - Dashboard
  - Stays & Tenant
  - Finance
  - Staff & Tiket
  - Kamar & Stok
- Dashboard kembali menjadi command center lintas menu.
- Finance menerima sub-menu:
  - Tagihan
  - Review Pembayaran
  - Voucher WiFi
  - Pendapatan Tambahan
  - Pengeluaran
  - Riwayat Bayar
- Existing `WifiSale` diposisikan sebagai revenue stream voucher WiFi.
- Halaman placeholder/plan untuk Pendapatan Tambahan dibuat.
- Expense category UI dibuat lebih cocok untuk usaha kos.
- Ticket tenant category diperluas menjadi lebih kos-specific.

### Verification

```text
Syntax check for touched files: OK.
Frontend full build: not verified in container because node_modules not available.
Backend unchanged.
Runtime/API smoke not run.
FULL PASS not claimed.
```

## 2026-05-24 — V5.23-B Accounting & Balance Sheet Planning

### Konteks

User bertanya apakah revenue dan cost sudah masuk ke akuntansi kos. Kesimpulan:

```text
Saat ini sudah ada finance operasional.
Belum ada accounting ledger formal.
Belum ada Chart of Accounts.
Belum ada CashAccount.
Belum ada JournalEntry / JournalLine.
Belum ada Asset Register.
Belum ada Depreciation.
Belum ada Equity/Owner Capital.
Balance Sheet belum valid.
```

### Direction

Next phase harus merancang **Accounting & Balance Sheet Foundation** sampai sistem mampu mencapai:

- Profit & Loss,
- Cashflow,
- Balance Sheet,
- Asset register,
- Deposit liability,
- OPEX / COGS / CAPEX,
- Ancillary revenue profitability.

### Important warning

Jangan langsung lompat ke full double-entry accounting patch besar tanpa PLAN. Buat roadmap bertahap dan migration-safe.


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps Docs Sync

### Konteks

User menegaskan aturan bisnis yang sebenarnya:

```text
Prioritas kamar berdasarkan siapa yang sudah bayar valid duluan, bukan siapa yang hanya pesan duluan.
Booking belum melunasi pembayaran tidak boleh mengunci kamar.
Tenant baru belum boleh bayar kalau kamar belum siap dihuni.
Tenant lama yang telat bayar/perpanjang tidak boleh berhutang.
Jika tenant lama telat dan ada tenant baru valid, tenant lama wajib mengosongkan kamar maksimal 3 jam.
```

### Patch code sebelumnya

V5.20 code package sudah dibuat:
- `backend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`
- `frontend_20260524_V520_FIRST_PAID_AUTOOPS_FULL.zip`

Isi package mencakup:
- AutoOps module,
- deadline cepat 3 jam,
- one-step payment proof endpoint,
- first-paid competing booking behavior,
- urgent UI emphasis,
- dedup alert/copy yang mirip.

### Docs sync ini

Docs aktif diperbarui agar source of truth mengikuti V5.20:
- ground state,
- contracts,
- plan,
- decisions log,
- journal,
- changelog,
- checklist.

### Verification status

```text
V5.19 Renew Meter Utility backend runtime UAT PASS.
V5.20 source ZIP generated.
V5.20 still needs local backend build, frontend build, and fresh UAT/manual UI smoke before FULL PASS.
```


## 2026-05-22 — V5.17-D Staff Routine Work Cards PASS + Push

### Konteks

Setelah staff workspace dipoles, user menemukan bahwa checklist harian/mingguan/bulanan sempat hilang/tergeser. Ini dianggap regression karena checklist adalah core work board staff.

### Patch

V5.17-D mengembalikan checklist sebagai professional routine work cards:
- Harian,
- Mingguan,
- Bulanan,
- progress visual ringan,
- status tugas,
- tombol start/done/help,
- assistant strip berbasis kondisi checklist.

### Verification

User melakukan manual check dan menyatakan:

```text
Sudah saya cek sip bagus pass
```

Patch staff UX terbaru kemudian dipush:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
```

Generated Prisma noise di-restore, working tree clean, branch `main` sama dengan `origin/main`.

## 2026-05-22 — V5.17-C Inventory Intelligence

### Konteks

User menegaskan bahwa status stok gudang seperti “stok habis” dan “stok menipis” tidak perlu diisi staff. Jika bisa dihitung otomatis dari jumlah stok, sistem/AI rule intelligence harus menghitungnya.

### Patch Direction

- Status stok gudang dihitung dari `qtyOnHand/minQty`.
- Staff tidak memilih manual “stok habis/menipis”.
- Gudang dibedakan antara:
  - health stok otomatis,
  - kondisi fisik barang.
- Assistant staff memberi prioritas restock/stock risk.
- Admin tidak dibebani konfirmasi hal yang objektif dan bisa dihitung sistem.

## 2026-05-22 — V5.17-B Clean Blue Staff UI

### Konteks

User tidak menyukai font terlalu berat, warna low contrast, tombol dobel, dan UI staff yang belum modern. User juga menegaskan:
- jangan font yang tebal/sulit dibaca,
- warna jangan sampai tidak terbaca,
- assistant harus bekerja,
- admin/staff flow harus simpel dan on-flow.

### Patch Direction

- Clean blue unified UI style.
- Card kamar clickable penuh.
- Hapus tombol dobel yang memiliki fungsi sama.
- Modal laporan progressive dan lebih readable.
- Admin review decision dibuat lebih dekat dengan flow.

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix PASS

### Konteks

Setelah staff repair flow dipatch, ditemukan bug: staff report berhasil membuat ticket aktif dengan `assignedToId=3`, tetapi `GET /api/tickets?limit=20` sebagai staff sempat terlihat kosong.

Audit menunjukkan:
- Staff user benar: `id=3`, `role=STAFF`.
- Ticket baru benar: `OPEN`, `assignedToId=3`, `linkedRoomItemId=1`.
- Staff bisa `GET /api/tickets/:id` detail ticket.
- Masalah hanya list endpoint.

### Patch

V5.16-G memperbaiki `tickets.service.ts` supaya role STAFF punya branch query eksplisit:
- ticket assigned ke staff,
- atau ticket punya staffFieldReports yang dibuat oleh staff,
- default hanya `OPEN`, `IN_PROGRESS`, `DONE`.

### Verification

Manual UAT setelah patch:
- Staff membuat report room item 1.
- Admin melihat ticket baru:
  - `id=12`
  - `TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff list menampilkan:
  - ticket #12 OPEN,
  - ticket #2 DONE,
  - ticket #1 OPEN.

Kesimpulan:

```text
V5.16-G Staff Ticket List Hard Fix = PASS secara manual UAT.
```

## 2026-05-21 — V5.16-D/E Staff Repair Flow Manual UAT

### Verified

- Staff report barang kamar:
  - applied temporary status `MAINTENANCE`,
  - `NEEDS_REPLACEMENT` stored for request replacement,
  - replacement request stored.
- Staff report gudang:
  - applied temporary status `PENDING_CHECK`,
  - `OUT_OF_STOCK` stored.
- Admin review:
  - `APPROVE` accepted,
  - report entered `IN_REPAIR`,
  - movement created,
  - stock decreased.
- `NEEDS_MORE_INFO` accepted.
- `REJECT` accepted.
- Ticket 7:
  - marked done,
  - closed with `finalInventoryItemStatus=OUT_OF_STOCK`.
- Ticket 6:
  - started,
  - marked done,
  - closed with `finalRoomItemStatus=GOOD`.
- Fresh linking:
  - ticket 9 had `linkedRoomItemId=1`,
  - ticket 8 had `linkedInventoryItemId=2`.

### Lesson

Some old ticket data can remain unlinked because it was created before V5.16-E. That is accepted as dev/UAT historical data. New reports after V5.16-E link correctly.

## 2026-05-21 — V5.16 Staff Repair Governance Direction

User identified a real business-flow problem:

```text
Tenant can report broken room item, but staff could also directly update item status to damaged.
This made staff look like final decision-maker.
```

Final decision:
- Staff reports/diagnoses only.
- Admin/owner confirms final item state.
- Inventory movement remains admin/owner.
- Staff UI must be simple and human-friendly.

## 2026-05-21 — V5.15 Direction Locked

V5.15 remains carry-forward after V5.16 staff flow stabilizes:
- Intelligent Command Center,
- rule-based assistant,
- assistant vs queue dedup,
- reports drill-down,
- smart chart switching,
- finance foundation,
- on-demand AI only.

## 2026-05-20 — V5.14 Command Center Direction Locked

User wanted the app to stop feeling like decorative dashboard/database viewer. Direction became:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

V5.14 implemented frontend-first command center components:
- `AssistantPanel`
- `ActionQueueTable`
- `CompactMetrics`
- `BlockedReasonCard`
- `ReadinessChecklist`
- `LifecycleTimeline`
- `PeriodVisualizer`

## Next Journal Target

Next chat should start with:

```text
PLAN Tenant Side Full Audit
```

Focus:
- tenant portal home,
- My Stay Guide,
- invoice/payment UX,
- renew/checkout request UX,
- tenant assistant,
- tenant microcopy,
- API/data availability,
- exact patch plan.


## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Audit Lock

### Context

User asked to start from backend design and requested a full backend audit using the real backend ZIP. The backend was inspected as a monolithic NestJS + Prisma + PostgreSQL system. A second opinion audit was requested through Cline + DeepSeek V4 Pro. Cline initially stopped because of output/context limits, then provided pre-ACT validation and generated a clean backend ZIP.

### Clean backend source for next ACT

```text
backend_latest_for_accounting_act_CLEAN.zip
node_modules: excluded
dist: excluded
.git: excluded
.env files: excluded
source/prisma/sql/scripts/uploads: included
```

### Main audit findings

```text
Backend is strong for operational kos finance.
Backend is not yet accounting-ledger-grade.
There is no COA/cash/opening balance/journal/accounting period model yet.
Existing /finance/balance-sheet/draft is safe because it admits draft/not balance-sheet-grade.
Existing /reports/profit-loss and /reports/financial-ratios need operational approximation labeling.
Cline found local working tree was dirty before clean ZIP creation, so ACT must use the clean ZIP snapshot.
```

### ACT B1 conclusion

```text
READY FOR ACT B1 with strict additive-only scope.
Patch target: Accounting Foundation Readiness.
No auto-posting.
No lifecycle integration.
No payment/stay/checkout/renew/booking touch.
```

### Next chat should start with

```text
ACT V5.23-B1 Backend Accounting Foundation Readiness using backend_latest_for_accounting_act_CLEAN.zip and the updated docs.
```

## 2026-05-25 — V5.24-B2A/B/C + V5.24-C Release Journal

### Accounting B2A/B/B2C

Accounting foundation naik dari schema/readiness menjadi setup yang dapat dipakai Owner.

Verified flow:
```text
Cash account created.
Accounting period created.
Opening balance draft created.
Opening balance posted.
JE-OPENING-1 created.
Trial Balance reads 30.000.000 debit and 30.000.000 credit.
Duplicate draft was voided.
Readiness reached 100%.
```

Important carry-forward:
```text
This is still not B3 auto-journal.
Operational invoices/payments/expenses are not automatically posted yet.
Future B3 must design idempotency, source mapping, and failure isolation.
```

### Admin UI V5.24-C

V5.24-C addressed critical admin UI audit issues:
```text
GlobalSearch restored for admin.
Dashboard ticket DONE behavior hardened.
StaysPage ALL filter fixed.
AncillaryRevenuePage made operational instead of roadmap-heavy.
Dashboard dead code/copy partially cleaned.
```

Latest pushed commits:
```text
eb198b2 fix(accounting): allow voiding draft opening balances
cb93fe6 fix(admin): harden dashboard search tickets and finance ux
```

### Next Journal Target

```text
PLAN V5.24-D — Admin UI Architecture + Performance Hardening
```

Focus:
- dashboard query loading/performance,
- sidebar/dashboard navigation consistency,
- RoleWorkspaceTabs dead code decision,
- admin sidebar context,
- meaningful status strip metrics,
- limited font-weight cleanup.
