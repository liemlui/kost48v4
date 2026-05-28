# KOST48 V5 — Project Journal
**Versi:** 2026-05-28 M4A Deposit Ledger Backend Foundation FULL PASS Sync



<!-- KOST48_DOCS_SYNC_20260528_M4A_START -->
## 0.0 Latest Current State — M4A Deposit Ledger Backend Foundation FULL PASS

```text
Current latest pushed code commit:
1b645de feat(deposit): add tenant deposit ledger foundation

Previous important pushed commits:
9d66c79 docs: sync m3.2 full first-paid runtime uat
296bd8d fix(autoops): harden runtime control panel
dc052a1 feat(tenant): ship my stay guide and autoops control ux
7c8c8e7 feat(accounting): add controlled monthly auto close governance
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
```

### Release status

```text
M3.2 Deep First-Paid Runtime UAT = FULL PASS.
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
M4A frontend = unchanged.
Next recommended phase = PLAN M4B Frontend Deposit Timeline.
```

### M3.2 final runtime lock

```text
BR1 Expired unpaid booking auto-cancel = PASS.
BR2 Pending proof must not auto-cancel = PASS.
BR3 Rejected proof after deadline auto-cancel = PASS.
BR4 Orphan RESERVED room auto-release = PASS.
BR5 Pure first-paid-wins competitor-unpaid scenario = PASS.
BR6 AutoOps must not approve payment = PASS.
BR7 AutoOps must not approve renew = PASS.
BR8 AutoOps must not final checkout = PASS.
BR9 AutoOps must not refund/deduct deposit = PASS.
```

BR5 pure runtime evidence:
```text
Stay A winner id=18 remained ACTIVE.
Payment submission A id=6 became APPROVED.
Invoice A id=30 became PAID.
Room G2-004 became OCCUPIED with activeStayId=18.
Competing unpaid Stay B id=19 became CANCELLED.
Room did not move to unpaid booking.
Cleanup returned Room G2-004 to AVAILABLE with activeStayId=null and currentStay=null.
```

### M4A runtime UAT result

| Area | Result | Evidence summary |
|---|---|---|
| Schema/table application | PASS | `TenantDepositLedgerEntry` table created via additive `prisma db push`, no DB reset. |
| Backend build | PASS | User local build reported successful before commit/push. |
| Summary endpoint | PASS | `GET /api/deposit-ledger/summary` returned basis `M4_DEPOSIT_LEDGER_SUMMARY`. |
| Reconciliation-lite endpoint | PASS | `GET /api/deposit-ledger/reconciliation-lite` returned `ready=true`, `mismatchCount=0`. |
| Backfill dry-run | PASS | `POST /api/deposit-ledger/backfill/dry-run` returned `dryRun=true` and did not mutate historical data. |
| Payment approval hook | PASS | Approved booking payment created `PAYMENT_RECEIVED` ledger entry for deposit amount. |
| Deposit settlement hook | PASS | Full refund settlement created `REFUND` ledger entry and reduced ledger held balance to zero. |
| Cleanup | PASS | Test stay/payment/invoice/ledger entries removed; Room G2-005 returned AVAILABLE. |
| Frontend | UNCHANGED | M4A was backend-first only. |

### M4A verified behavior

```text
Created runtime UAT IDs:
- Stay test: 20
- Tenant test: 21
- Room: 5 / G2-005
- Invoice: 31
- PaymentSubmission: 7
- InvoicePayment: 5
- TenantDepositLedgerEntry: 1 PAYMENT_RECEIVED, 2 REFUND

Payment hook:
- PAYMENT_RECEIVED
- direction=INCREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=500000
- sourceType=PAYMENT_SUBMISSION
- sourceId=7

Settlement hook:
- REFUND
- direction=DECREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=0
- sourceType=STAY_DEPOSIT_SETTLEMENT
- sourceId=20:REFUND

After cleanup:
- Room G2-005 status=AVAILABLE
- activeStayId=null
- currentStay=null
- deposit-ledger summary increaseRupiah=0
- deposit-ledger summary decreaseRupiah=0
- recentEntries=[]
```

### M4A implementation summary

```text
Added backend module:
- src/modules/deposit-ledger/deposit-ledger.module.ts
- src/modules/deposit-ledger/deposit-ledger.controller.ts
- src/modules/deposit-ledger/deposit-ledger.service.ts
- src/modules/deposit-ledger/dto/deposit-ledger-query.dto.ts

Modified backend:
- prisma/schema.prisma
- src/app.module.ts
- src/common/enums/app.enums.ts
- src/modules/payment-submissions/payment-submissions.module.ts
- src/modules/payment-submissions/payment-submissions.service.ts
- src/modules/stays/stays.module.ts
- src/modules/stays/stays.service.ts
```

### Current honest label

```text
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
Do not claim M4B until frontend surfaces are implemented and manually/UI smoked.
```

### Next recommended step

```text
PLAN M4B Frontend Deposit Timeline.
Focus:
- Admin Stay Detail / Finance tab deposit summary + timeline.
- Tenant My Stay deposit card with tenant-friendly microcopy.
- Owner/Finance deposit ledger drilldown.
- No backend mutation unless a missing read shape is proven.
```

### Source-of-truth note

```text
This section supersedes the older M3.2-only and V5.29-K current-state sections below.
Older sections remain as historical record.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M4A_END -->



## 2026-05-28 — M4A Deposit Ledger Backend Foundation Journal

Status:
```text
Commit pushed:
1b645de feat(deposit): add tenant deposit ledger foundation

Verified:
- Backend build PASS from user local report.
- Runtime endpoint smoke PASS.
- Payment approval hook PASS.
- Deposit settlement/refund hook PASS.
- Cleanup PASS.
- Frontend unchanged.
```

Implementation:
- Added `TenantDepositLedgerEntry` schema and supporting enums.
- Added `DepositLedgerModule`.
- Added read endpoints for stay, tenant, summary, reconciliation-lite, and backfill dry-run.
- Hooked deposit ledger entry creation into payment approval flow.
- Hooked deposit ledger entry creation into deposit settlement flow.
- Kept backfill as dry-run only.

Runtime UAT:
```text
GET /api/deposit-ledger/summary PASS.
GET /api/deposit-ledger/reconciliation-lite PASS.
POST /api/deposit-ledger/backfill/dry-run PASS.

Fresh deposit payment test:
- Stay 20 / Room G2-005 / PaymentSubmission 7.
- Payment approval created PAYMENT_RECEIVED entry amount 500000.
- Summary showed increaseRupiah 500000 and held balance 500000.

Settlement test:
- Stay 20 cancelled for UAT cleanup path.
- FULL_REFUND created REFUND entry amount 500000.
- Summary showed increaseRupiah 500000, decreaseRupiah 500000, held balance 0.
```

Cleanup:
```text
Deleted test ledger entries 1 and 2.
Deleted test payment submission 7.
Deleted test invoice 31 and invoice payment 5.
Deleted test stay 20 and tenant 21.
Room G2-005 returned AVAILABLE with activeStayId=null and currentStay=null.
Deposit ledger summary returned empty again.
```

Known notes:
- Historical deposit data may show as backfill candidates.
- Backfill remains dry-run only until a separate reviewed write plan is approved.
- M4A does not include frontend timeline UI.

Next journal target:
```text
PLAN M4B Frontend Deposit Timeline
```


## 0.0 Latest Current State — V5.29-K Controlled Monthly Auto-Close Governance PASS + Pushed

```text
Current latest pushed commit:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Previous latest pushed commits:
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
51eba86 feat(accounting): add statement command center finance cockpit
286e512 fix(accounting): block manual edits in closed period governance

Release status:
- V5.29-H/I/J accounting invoice lifecycle and period governance were verified before K.
- V5.29-K Controlled Monthly Auto-Close Governance is built, UAT-smoked, committed, and pushed.
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked with 403 PASS.
- Owner close without reason blocked with 400 PASS.
- Generated Prisma was restored and was not committed.
- Commit 7c8c8e7 is pushed to origin/main.

V5.29-K verified behavior:
- Auto-close policy basis is PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K.
- Mode is AUTO_MONTHLY_PREVIOUS_PERIOD.
- Auto-close targets only the previous month, not the current month.
- Target period must already exist and must be OPEN.
- Period close readiness must return canPost=true.
- Closing preview must be balanced before posting.
- If blocker exists or target period is missing, system skips safely and does not force close.
- Owner can manually trigger auto-close through /api/accounting/period-close/auto-run.
- AutoOps run includes accountingAutoClose result.
- Admin cannot trigger auto-close manually.
- Manual period close requires a closing reason of at least 8 characters.

Known honest limitation:
- Actual auto-close closed=true scenario is deferred because target period 2026-04 did not exist in current UAT data.
- The verified K result is controlled safe-skip + governance/role/validation PASS, not actual previous-period closing PASS.
- Manual UI smoke remains user-side visual verification if needed.

Product decision locked:
- KOST48 may use automatic monthly period close, but only as controlled automation.
- Auto-close is not blind automation.
- It must be blocker-aware, auditable, balanced, role-safe, and reversible only through official reopen workflow.
- Reopen remains Owner-only and reason-required.
```

### Source-of-truth note

```text
This section supersedes older V5.29-C/D/E/H/I/J planning sections below.
Older sections remain as historical record only.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```

## 2026-05-27 — V5.29-K Controlled Monthly Auto-Close Governance Journal

Status:
```text
Commit pushed:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Verified:
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked 403 PASS.
- Owner close without reason blocked 400 PASS.
- Generated Prisma restored and not committed.
```

Main UAT findings and outcomes:
- `GET /api/accounting/period-close/auto-policy` returned basis `PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K`.
- Policy mode is `AUTO_MONTHLY_PREVIOUS_PERIOD`.
- Target period key was `2026-04`.
- Owner `POST /api/accounting/period-close/auto-run` returned skipped=true because AccountingPeriod 2026-04 was not created.
- AutoOps `POST /api/auto-ops/run` included `accountingAutoClose` and also safe-skipped with the same reason.
- ADMIN `POST /api/accounting/period-close/auto-run` returned 403 Forbidden.
- Owner manual close without `notes` returned 400 with message: `Alasan tutup periode wajib diisi minimal 8 karakter agar audit trail jelas.`
- Commit/push succeeded: `0285dbe..7c8c8e7 main -> main`.

Known notes:
- Safe-skip is correct because auto-close must not create or close missing target periods.
- Actual auto-close `closed=true` remains deferred until a previous OPEN period exists and readiness/preview pass.
- Manual UI visual smoke remains pending if user wants final browser confirmation.

Next journal target:
```text
PLAN M1 Tenant My Stay Guide Full Audit
```

Alternative accounting target:
```text
PLAN V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning
```


## 2026-05-27 — V5.29-C/D Lifecycle Hotfix PASS + Push Journal

Status:
```text
Commit pushed:
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity

Verified:
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Runtime UAT PASS for B1/B2/B3/B4/B5/B7/F2.
- HOTFIX3 renew UTC date precision PASS.
- HOTFIX4 tenant blocker microcopy PASS.
- Generated Prisma restored and not committed.
```

Main UAT findings and outcomes:
- B1 invalid partial refund under-processing rejected with 409.
- B1 valid exact partial refund settled full deposit.
- B2 stay creation with agreed rent 0 stored 0.
- B3 cancelled invoice left invoiceCount total intact and openInvoiceCount 0.
- B3 DRAFT invoice counted as open.
- Checkout request with `2026-06-15T00:00:00.000Z` stayed exact and notification showed 15/6/2026.
- Duplicate checkout request rejected 409.
- Renew request YEARLY stayed YEARLY after approve.
- Initial renew approval UAT found real H-1 drift; HOTFIX3 fixed it.
- After HOTFIX3, stay planned checkout and renew invoice periodEnd returned `2027-05-26T00:00:00.000Z`.
- Manual UI F2 showed renew request moved out of pending and API confirmed approved YEARLY requests with correct UTC date.
- Open invoice blockers for checkout and renew worked.
- HOTFIX4 cleaned tenant blocker copy from raw `(ISSUED)` enum to tenant-friendly `belum dibayar`.

Known notes:
- Old UAT notifications created before HOTFIX2 can still show old H-1 dates.
- Those rows are historical dev data, not current regression.

Next journal target:
```text
PLAN/ACT V5.29-E — Admin Check-In + Invoice Hygiene Fix
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
