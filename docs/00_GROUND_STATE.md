# KOST48 V5 — Ground State
**Versi:** 2026-05-29 M8G–M8K Command Center Safety Belts Sync
**Status:** Source of truth utama setelah M8G–M8K command center safety belts. Latest local code commit 5c4526f; docs sync commit/push pending.


<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_START -->
## 0.0 Latest Current State — M8G–M8K Command Center Safety Belts Sync

```text
Latest local code commit:
5c4526f feat(command-center): harden accounting booking checkout and staff safety belts

Docs sync status:
- Code commit 5c4526f sudah dibuat lokal.
- Docs sync ini harus dicommit terpisah sebelum push GitHub.
- Older M4A/M8F/V5.29 sections below remain historical record.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8G | Accounting Manual Payment Posting + Deposit Status Fix | FULL | Backend build PASS; manual payment journal smoke PASS; update/delete journaled payment blocked; deposit PARTIAL_REFUND status code patched but targeted runtime smoke still recommended |
| M8H | Admin Booking Review Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; reject endpoint added; targeted booking runtime smoke still recommended before FULL label |
| M8I | Tenant Booking / Waiting Room Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; cancelled booking visibility patched; tenant booking runtime smoke still recommended |
| M8J | Admin Checkout Request Review Safety Belt | FULL | Backend build PASS; pending list PASS; short reject note blocked; valid reject PASS; valid approve PASS; already-processed approve blocked |
| M8K | Staff Report / Admin Confirmation Safety Belt | FULL | Backend build PASS; ticket list PASS; field report queue PASS; short final note blocked; valid ticket close PASS |

### Current honest label

```text
M8G–M8K = build-confirmed and core runtime-smoked for accounting, checkout, and ticket close paths.
M8H/M8I booking/waiting-room still need targeted runtime/manual UI smoke before FULL business-flow PASS.
Manual browser UI smoke for M8J/M8K is still not confirmed.
Generated Prisma noise was restored before code commit.
No DB reset was used.
```

### Latest important UAT evidence

```text
M8G:
- Manual InvoicePayment id=6 created JournalEntry JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE of journaled payment id=6 returned 409 and blocked silent accounting divergence.

M8J:
- Checkout request id=3 short reject note returned 400.
- Checkout request id=3 valid reject returned REJECTED.
- Checkout request id=2 valid approve returned APPROVED.
- Approving already processed request returned 409.

M8K:
- Ticket id=3 short finalAdminNote returned 400.
- Ticket id=3 valid finalAdminNote closed ticket TIC-UAT-0003.
- Backend build: npm run build:local PASS.
```

### Next recommended phase

```text
PLAN M8L Inventory Movement Safety Belt.
Goal:
- official stock movement must not be direct-click or staff-owned,
- staff may report need/condition only,
- admin/owner confirms official InventoryMovement,
- no schema change unless real guard/data gap is proven.
```
<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_END -->

## 0.1 Active Ground State — After M8G–M8K

```text
Active architecture remains Stable Modular Monolith.
Product direction remains KOST48 Command Center.
Current local code commit: 5c4526f.
Docs sync should be committed separately before GitHub push.
```

### Active guardrails now strengthened

- Manual admin invoice payment now auto-posts accounting journal when accounting is ready.
- Journaled invoice payment cannot be edited/deleted directly; use official reversal/correction flow later.
- Partial deposit refund status is patched to `PARTIALLY_REFUNDED` with SQL constraint update.
- Admin booking approve/reject is safety-belted; reject booking endpoint exists.
- Tenant booking history can show rejected/cancelled booking with admin reason.
- Admin approve checkout request is not final checkout.
- Checkout reject/approval review notes require clear audit trail.
- Staff report remains field evidence; admin confirms final ticket/report decisions.
- Ticket close and staff field report review require meaningful admin notes.

### Carry-forward honesty

```text
Do not call M8H/M8I FULL runtime PASS until booking approve/reject and tenant waiting-room flows are smoked locally.
Do not call M8J/M8K FULL UI PASS until manual browser smoke is confirmed.
Do not commit generated Prisma noise unless schema/generator scope is explicitly approved.
```


<!-- KOST48_DOCS_SYNC_20260528_M8F_START -->
## 0.0 Latest Current State — M8F Frontend Command Center Safety Belt Sync

```text
Latest generated working package:
- frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
- backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip

Latest pushed backend/source-of-truth commit still referenced by prior docs:
- 1b645de feat(deposit): add tenant deposit ledger foundation

Important status label:
- M7A–M8F are frontend-first package builds, not FULL runtime PASS.
- Frontend build PASS was verified for each batch in container.
- Backend was unchanged for M7A–M8F.
- Runtime/API smoke and manual browser UI smoke are deferred.
- Do not claim FULL PASS until local runtime/API smoke + manual UI smoke pass.
```

### Completed package sequence after M4A

| Batch | Focus | Backend | Verification |
|---|---|---|---|
| M7A | Tenant Portal Action Center Hardening | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8A | Checkout Closure + Deposit Settlement Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8B | Public Room Discovery + Booking Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8C | Payment Review Decision Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8D | Indonesian Readability + CTA Dedup Sweep | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8E | Renew Approval Safety Belt + Ringkas Copy | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8F | Invoice Issue/Cancel + Manual Payment Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |

### Latest product position

```text
KOST48 V5 Command Center now has safety-belt UI coverage across the main business flows:
- Tenant action center and payment proof UX.
- Public booking discovery with first-paid-room-priority copy.
- Admin payment review decision safety.
- Renew approval safety.
- Checkout/deposit settlement safety.
- Invoice issue/cancel/manual payment safety.
- Indonesian readability and CTA dedup rules.
```

### New UX rule locked from user feedback

```text
Orang Indonesia sangat tidak suka baca.
UI KOST48 must be concise, action-first, and not repeat the same explanation.
Repeated links/CTAs in one page should be limited to 1–2 maximum for the same destination/action.
```

Practical rule:
- Card/alert title: 3–7 words.
- Body: 1–2 short lines maximum.
- One primary CTA per block.
- Assistant/priority board should show the top 3 priorities by default.
- Avoid repeating the same warning across banner, card, modal, and footer.
- Use badges, numbers, and clear action labels instead of paragraphs.

### Current honest label

```text
M8F Frontend Command Center Safety Belt Sync = build-verified frontend package set.
Backend = unchanged after M4A for these M7A–M8F frontend safety batches.
Runtime/API smoke = deferred.
Manual UI smoke = deferred.
FULL PASS = not claimed.
```

### Next recommended phase

```text
PLAN M8G Admin Booking Review Safety Belt.
Focus:
- Admin booking review queue safety.
- Booking approval/reject confirmation.
- First-paid room priority explanation for admin.
- Avoid over-reserving rooms from booking-only interest.
- Keep backend unchanged unless missing data is proven.

After M8G, start M9 Targeted Runtime/UI Smoke to validate M7A–M8G locally.
```

### Source-of-truth note

```text
This M8F docs sync supersedes the older M4A-only current-state sections above/below.
Older M4A/V5.29 sections remain as historical record.
For coding, inspect the latest real ZIP/repo first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M8F_END -->

## 0.1 Active Ground State — After M8F

```text
Active architecture: Stable Modular Monolith.
Current working package baseline: M8F Invoice Action Safety Belt.
Current direction: KOST48 Command Center with concise Indonesian UX and safety-belt decision flows.
```

### Role coverage after M8F

| Role/surface | Current position |
|---|---|
| Owner | Financial Health Cockpit exists from prior package track; deposit remains liability, not revenue. |
| Admin | Operations command queue + payment/renew/checkout/deposit/invoice safety belts. |
| Staff | Operational task board and staff routine/checklist flow from earlier packages. |
| Tenant | My Stay Guide / Action Center with concise blockers and payment-proof guard. |
| Public | Room discovery and booking funnel explains first-paid room priority. |

### Important verification boundary

```text
The M7A–M8F packages are build-verified but not runtime/manual FULL PASS.
Before production or commit labeling, run local build, API smoke, and browser UI smoke.
```


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

## 0.1 Active Ground State — After V5.29-K

```text
Active architecture remains Stable Modular Monolith.
Current verified product direction: KOST48 Command Center + accounting-ready finance governance.
Latest pushed code commit: 7c8c8e7.
V5.29-K status: build PASS, safe-skip PASS, negative governance PASS, AutoOps integration PASS, pushed.
Next recommended product focus: M1 Tenant My Stay Guide Full Audit.
Alternative accounting focus: V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning.
```

### V5.29-K PASS summary

- Controlled monthly auto-close policy is available.
- Auto-close targets previous month only.
- Auto-close does not create missing accounting periods silently.
- Missing target period returns safe skipped result.
- AutoOps includes accountingAutoClose.
- Admin manual auto-run is forbidden.
- Owner manual close requires audit reason.
- Generated Prisma was restored and not committed.
- Actual closed=true scenario remains deferred until a previous OPEN period exists and readiness is complete.

### Current next focus

```text
PLAN FIRST: M1 Tenant My Stay Guide Full Audit.
```

Do not patch tenant side before inspecting latest real code/ZIP after commit 7c8c8e7.


## 0.1 Active Ground State — After V5.29-C/D

```text
Active architecture remains Stable Modular Monolith.
KOST48 Command Center lifecycle hotfix track is now stable for deposit, renew, checkout, date precision, and tenant blocker copy.
Latest pushed code commit: f6af6fc.
Next official focus: V5.29-E Admin Check-In + Invoice Hygiene Fix.
Tenant My Stay Guide audit resumes after V5.29-E unless a new critical bug appears.
```

### V5.29-C/D PASS summary

- Deposit partial refund can no longer leave invisible remainder.
- Explicit rent 0 is preserved.
- `invoiceCount` and `openInvoiceCount` have distinct meanings.
- DRAFT invoice counts as open.
- Renew requested term is applied on approve.
- Checkout requested date and renew planned date are UTC-safe on fresh data.
- Renewal invoice is ISSUED after approve.
- Open invoice blocks renew and checkout.
- Tenant blocker copy no longer exposes raw status enum.

## 0.2 Critical Audit Backlog — Accepted Bug Report

| ID | Severity | Area | Problem | Target batch |
|---|---|---|---|---|
| B1 | CRITICAL | Deposit / Stay lifecycle | PARTIAL_REFUND can process only part of deposit and leave remainder untracked | V5.29-C |
| B2 | CRITICAL | Stay creation | `agreedRentAmountRupiah || resolveRent(room)` ignores explicit 0 | V5.29-C |
| B3 | HIGH | Stay query | `invoiceCount` incorrectly equals filtered `openInvoiceCount` | V5.29-C |
| B4 | HIGH | Renew | `requestedTerm` from renew request is ignored during approve | V5.29-D |
| F1 | HIGH | Check-in UI | BIWEEKLY, SEMESTERLY/SMESTERLY, YEARLY missing from wizard dropdown | V5.29-E |
| B5 | MEDIUM | Checkout notification | Notification uses current planned checkout date instead of tenant requested date | V5.29-D |
| B6 | MEDIUM | Invoice cancellation | DRAFT cancellation calls reversal unnecessarily and swallows accounting errors | V5.29-E |
| B7 | MEDIUM | Checkout API | checkout-requests findAll response shape inconsistent | V5.29-D |
| F2 | LOW | Frontend cache | approve renew does not invalidate admin-checkout-requests cache | V5.29-D |


## 0.3 Active Ground State — After B9A/B9B

```text
Active architecture: Stable Modular Monolith.
Current verified product direction: KOST48 Command Center + owner-readable accounting finance cockpit.
Current latest pushed commit confirmed by user: 51eba86.
B9A status: pushed + frontend build PASS + runtime accounting smoke PASS + manual UI PASS.
B9B status: copy consistency package generated + API smoke PASS; build/commit/push pending unless user confirms.
```

Current accounting state:
```text
- Accounting readiness returns formalStatementReady=true when ready.
- Trial Balance: 34.170.000 debit = 34.170.000 credit.
- Balance Sheet: 29.915.000 assets = 29.915.000 liabilities + equity.
- P&L: revenue 40.000, expense 125.000, net -85.000, excludes closing/reversal.
- Period 2026-05 is CLOSED with JE-CLOSE-2026-05-V2.
- Asset register and ledger fixed asset are aligned.
- Data quality smoke: draft journal 0, unbalanced posted 0, unmapped operational 0.
```

Important prioritization change:
```text
Tenant Side Full Audit remains important, but critical lifecycle/data bugs now come first.
Do V5.29-C/D/E before M1 Tenant My Stay Guide.
```


## 0.1 Active Ground State — After V5.28-B8

```text
Active architecture: Stable Modular Monolith.
Current verified product direction: KOST48 Command Center + accounting-ready finance foundation.
Current latest pushed commit: 286e512.
Current release state: V5.28-B8 pushed and clean.
```

### Accounting state

```text
Accounting foundation exists:
- ChartOfAccount
- CashAccount
- AccountingPeriod
- OpeningBalanceBatch/Line
- JournalEntry/Line
- Accounting readiness
- Trial Balance
- Balance Sheet guard
- Profit & Loss Lite
- Auto journal visibility
- Deposit/reversal visibility
- Asset register
- Depreciation
- Fixed asset ledger alignment
- Period close to Retained Earnings
- Closed period reopen/reversal governance
```

Verified UAT after B8:
```text
2026-05 close/reopen/re-close lifecycle works.
JE-CLOSE-2026-05-V2 is active closing journal.
Reopen reversal journal exists.
Duplicate close after re-close is blocked.
Trial Balance after re-close balanced: 34.170.000 / 34.170.000.
Balance Sheet after re-close balanced: 29.915.000 / 29.915.000.
P&L operational remains readable and excludes closing/reversal.
```

### Carry-forward

```text
Next recommended accounting focus:
V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening.

Tenant Side Full Audit remains an important product track, but if the user continues the finance/accounting runway, B9 should come first to make the new ledger foundation readable and safe for owner/admin use.
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