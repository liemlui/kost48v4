# KOST48 V5 — Contracts & API
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


## 0.1 Latest Contract Addendum — V5.29-C/D/E Critical Bugfix Track

### B1 — Deposit partial refund integrity

```text
processDeposit() must never leave any part of tenant deposit untracked.
For PARTIAL_REFUND, deductionAmountRupiah + refundAmountRupiah must equal the full deposit amount being processed.
```

Rules:
- Full refund is valid only when refunded amount equals deposit amount and deduction is 0.
- Full deduction is valid only when deduction equals deposit amount and refund is 0.
- Partial refund is valid only when deduction + refund equals deposit amount.
- Over-processing must remain blocked.
- Under-processing must be blocked because it creates an invisible remainder.
- No automatic deposit ledger migration in this hotfix; Stay deposit fields remain operational snapshot.

### B2 — agreed rent amount must preserve zero

```text
agreedRentAmountRupiah=0 is a valid explicit value and must not be replaced by room default rent.
Use nullish coalescing (??), not falsy fallback (||), when choosing rent values.
```

Rules:
- If `agreedRentAmountRupiah` is `0`, backend must store/use `0`.
- If `agreedRentAmountRupiah` is `null` or `undefined`, backend may resolve rent from room/pricing term.
- This must match `renewStay` behavior.

### B3 — stay invoice count contract

```text
invoiceCount = total invoices for the stay.
openInvoiceCount = invoices whose status is not PAID and not CANCELLED.
```

Rules:
- Do not use the same filtered `_count.invoices` value for both fields.
- `DRAFT` counts as open invoice because checkout final is blocked by any non-PAID/non-CANCELLED invoice.

### B4 — renew requested term contract

```text
If tenant/admin renew request includes requestedTerm, admin approve must pass it into RenewStayDto and renew execution must use the approved term.
```

Rules:
- Requested term is not dead data.
- Renewal invoice and renewed stay period must reflect the approved term.
- Existing rule remains: renewal invoice must be ISSUED after admin approves renew request.
- Renew approval/execution remains core monolith.

### F1 — pricing term select contract

```text
Admin check-in wizard must expose every pricing term supported by backend enum.
```

Required check:
- Inspect actual enum before patching.
- Include BIWEEKLY.
- Include SEMESTERLY or SMESTERLY according to real code/schema spelling.
- Include YEARLY.
- Payload must send backend enum value, not display label.

### B5 — checkout notification date contract

```text
Checkout request notification must show requestedCheckOutDate as the primary date.
```

Rules:
- `stay.plannedCheckOutDate` may only be secondary context if shown.
- Owner/Admin must see the date tenant actually requested.

### B6 — DRAFT invoice cancellation accounting contract

```text
DRAFT invoice has no posted accounting journal and must not call cancellation reversal.
```

Rules:
- Cancel DRAFT invoice by status update only.
- For journaled invoice cancellation, use controlled reversal.
- Do not silently swallow critical accounting reversal failures for journaled invoices.
- No lifecycle rewrite.

### B7 — checkout request response consistency contract

```text
checkout-requests findAll should be response-shape consistent with the rest of the API.
```

Rules:
- Inspect frontend expectations before changing response shape.
- Avoid double wrapping if a global interceptor already wraps responses.
- If backend changes shape, patch frontend API reader in same batch.

### F2 — frontend cache invalidation contract

```text
After approve renew, invalidate any admin checkout/stay query that can show stale request state.
```

Likely query keys:
- admin-checkout-requests
- stay detail / stays list if used by current page
- renew requests if visible on same detail surface


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


## 0.0 Latest Contract Addendum — V5.27-B7 / V5.28-B8 Accounting Close Governance

### Period close contract

```text
Period close is the official way to move current period profit/loss into Retained Earnings.
It must be Owner-controlled, balanced, auditable, and never a silent status flip.
```

Active period close endpoints:

```text
GET  /api/accounting/period-close/readiness?year=YYYY&month=M
POST /api/accounting/period-close/preview
POST /api/accounting/period-close/post
POST /api/accounting/period-close/reopen-preview
POST /api/accounting/period-close/reopen
```

Rules:
- `post` close is OWNER only.
- `reopen` is OWNER only.
- Closing creates `JournalEntry.sourceType = CLOSING_ENTRY`.
- Reopen creates `JournalEntry.sourceType = CLOSING_REVERSAL`.
- Reopen must not delete or mutate the old closing journal.
- Re-close after reopen must create the next version, for example `JE-CLOSE-2026-05-V2`.
- Duplicate close while period is `CLOSED` must be blocked.
- P&L operational report excludes `CLOSING_ENTRY` and `CLOSING_REVERSAL` by default so owner can still read operational performance after close/reopen.
- Balance Sheet should move closed-period current profit/loss into Retained Earnings and show `currentProfitRupiah = 0` for closed periods.
- Manual `AccountingPeriod.status` mutation is blocked; close/reopen workflow must be used.
- Manual journal draft or posting into a CLOSED period must be blocked unless it is part of controlled close/reopen governance.

### Accounting period metadata contract

`AccountingPeriod` can store:

```text
closedAt
closedById
closingJournalEntryId
closingNote
closeBasis
closeVersion
reopenedAt
reopenedById
reopenJournalEntryId
reopenReason
reopenVersion
```

These fields are audit metadata. They must support timeline/history UI in B9.

### Statement command center contract

B9 should make the following readable in Finance:
- Trial Balance status.
- Balance Sheet status.
- Profit & Loss status.
- Period close state: OPEN / CLOSED / REOPENED / RECLOSED.
- Closing journal and reversal journal references.
- Asset register vs ledger alignment.
- Data quality warnings: unmapped operational data, draft journals, unbalanced journals, stale copy, and period state mismatch.

Do not expose accounting mutation to STAFF or TENANT.


## 0.0 V5.23-B Accounting & Finance Contract

### Admin IA contract

```text
Sidebar = main navigation.
Dashboard = cross-menu command center.
Detail work = respective menu pages with badge filters + clickable rows.
```

Final admin sidebar:

```text
Dashboard
Stays & Tenant
Finance
Staff & Tiket
Kamar & Stok
```

Header-only:
- Pengumuman,
- Bell/Alert,
- Profile/Settings,
- Logout.

No admin top workspace tabs unless explicitly re-approved.

### Finance/accounting contract

Current finance is operational, not formal accounting.

Existing sources:
- `Invoice` / `InvoiceLine` / `InvoicePayment` = rent/utility billing and payment truth.
- `WifiSale` = existing voucher WiFi revenue stream.
- `Expense` = current cost/expense record, still not full accounting classification.
- Stay deposit fields = deposit tracking, but deposit must be treated as liability, not revenue.

Future accounting-ready foundation must support:
- OPEX / COGS / CAPEX classification.
- AncillaryProduct / AncillarySale.
- CashAccount.
- ChartOfAccount.
- JournalEntry / JournalLine.
- Asset register.
- Depreciation.
- Opening balances.
- Balance Sheet readiness validation.

### Balance Sheet guard

Balance Sheet is not valid unless the system can reliably derive:

```text
Assets = Liabilities + Equity
```

Minimum data required:
- cash/bank balances,
- accounts receivable or billing basis,
- inventory/stock where material,
- fixed assets net of depreciation,
- tenant deposit liability,
- payables if used,
- owner capital,
- drawings,
- retained earnings / period result.

Do not show formal ratios if accounting readiness is not complete.

### Ancillary revenue contract

Short-term:
- Keep `WifiSale` running.
- Present voucher WiFi inside Finance as revenue stream.

Medium-term:
- Add generic `AncillaryProduct` and `AncillarySale`.
- WiFi can later be migrated/adapted into generic ancillary reporting.

Recommended categories:
- WIFI_VOUCHER
- LAUNDRY
- WATER_GALLON
- ROOM_CLEANING
- PARKING
- EXTRA_GUEST
- KEY_CARD_REPLACEMENT
- LINEN_RENTAL
- SNACK_DRINK
- MASSAGE_PARTNER
- OTHER

### Expense classification contract

Future `Expense` should classify:

```text
OPEX = operating expense
COGS = direct cost for ancillary/service revenue
CAPEX = asset/capital expenditure
```

CAPEX rule of thumb:
- useful life > 1 year,
- above business threshold,
- should create or update asset register.

### Role boundary

Owner:
- may see Balance Sheet, P&L, Cashflow, asset value, owner capital, liability, finance ratios once ready.

Admin:
- may input operational finance data: invoices, payments, expenses, ancillary sales.
- should not decide owner equity/capital structure unless explicitly allowed.

Staff:
- no sensitive finance/accounting mutation.

Tenant:
- may pay/order/request only; no accounting mutation.


## 0.1 V5.20 First Paid Room Priority Contract

```text
Room priority is first valid payment, not first booking.
A booking/request alone is an interest signal, not a full room lock.
The room is only secured after the required invoice is paid and payment is approved.
```

### 0.1.1 Booking / room priority

| State | Meaning | Tenant/Public copy |
|---|---|---|
| Interest / booking only | Calon tenant berminat, kamar belum terkunci | Pemesanan belum mengunci kamar |
| Admin approved but unpaid | Kamar dapat diberi batas bayar cepat | Bayar & kirim bukti maksimal 3 jam |
| Payment pending review | Tenant sudah bertindak; admin wajib review cepat | Bukti pembayaran sedang diperiksa |
| Payment approved | Prioritas kamar sudah valid | Kamar diamankan |
| Existing tenant late | Tidak ada hak hutang | Kamar dapat ditawarkan kembali |

### 0.1.2 Deadlines

```text
BOOKING_REVIEW_DEADLINE_HOURS = 3
APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS = 3
PAYMENT_REVIEW_URGENT_HOURS = 1
PAYMENT_REVIEW_ESCALATE_HOURS = 3
PAYMENT_REVIEW_MAX_HOURS = 6
INVOICE_URGENT_AFTER_HOURS = 6
INVOICE_DUE_AFTER_HOURS = 24
RENEW_REVIEW_URGENT_HOURS = 3
RENEW_REVIEW_ESCALATE_HOURS = 6
CHECKOUT_REVIEW_URGENT_HOURS = 3
CHECKOUT_REVIEW_ESCALATE_HOURS = 6
CHECKOUT_FINAL_URGENT_HOURS = 6
OLD_TENANT_LATE_VACATE_HOURS = 3
AUTO_OPS_INTERVAL_MINUTES = 5
```

### 0.1.3 Payment contract

Tenant payment must be one combined action:

```text
Bayar & Kirim Bukti
```

The tenant must not experience payment and proof upload as separate flows. The UI must collect amount, payment metadata, and proof file in the same action. Duplicate pending proof remains blocked.

### 0.1.4 Renew contract

Renewal remains admin/core controlled:
- tenant may request renew,
- admin must record meter checkpoint,
- system calculates electricity/water difference,
- renewal invoice includes rent + electricity + water,
- tenant must pay quickly,
- no tenant debt/hutang is allowed.

If the current tenant misses the deadline after contract end/payment due date:
- room may be advertised again,
- if a new tenant validly takes the room, old tenant cannot renew,
- old tenant must vacate within 3 hours.

### 0.1.5 Automation boundary

AutoOps may cancel expired unpaid bookings and release orphan reserved rooms.
AutoOps must not approve payment, approve renew, final checkout, refund deposit, or create official inventory movement.


## 0. Active Architecture Contract

```text
Active architecture: Stable Modular Monolith
Multi-app Shared-DB: future roadmap only
No apps/ generation now
No workspace migration now
No service-to-service HTTP now
No runtime alias mirror hack
```

## 1. Staff Repair Business Contract

### 1.1 Role ownership

| Domain/action | Owner | Contract |
|---|---|---|
| Staff report item condition | STAFF | boleh membuat laporan kondisi lapangan |
| Staff start/finish ticket | STAFF | boleh start dan mark done ticket assigned ke dirinya |
| Final room item status | OWNER/ADMIN | staff tidak menentukan final barang |
| Final warehouse item condition | OWNER/ADMIN | staff tidak menentukan final kondisi fisik barang gudang |
| Inventory health/status stok | SYSTEM | dihitung otomatis dari `qtyOnHand/minQty`, bukan input staff |
| InventoryMovement | OWNER/ADMIN | mutasi stok resmi hanya admin/owner |
| Ticket close/cancel | OWNER/ADMIN | close hanya dari DONE; cancel hanya dari OPEN |
| Staff performance evidence | SYSTEM | tercatat dari report/ticket/checklist flow |

### 1.2 Source of truth

```text
Ticket = process controller.
StaffFieldReport = laporan/diagnosis lapangan.
RoomItem.status = display/final state barang kamar setelah konfirmasi admin.
InventoryItem.status = kondisi fisik/final barang gudang setelah konfirmasi admin.
Inventory health = computed health dari qtyOnHand/minQty.
InventoryMovement = stock/physical truth resmi.
```

### 1.3 Staff may do

- Lihat pekerjaan aktif.
- Lapor kondisi barang kamar.
- Lapor kondisi fisik barang gudang.
- Minta barang pengganti.
- Start ticket assigned.
- Mark done ticket assigned dengan `resolutionNote`.
- Lihat laporan kondisi yang ia buat.
- Mengikuti checklist harian/mingguan/bulanan.
- Tandai pekerjaan rutin sesuai permission yang sudah ada.

### 1.4 Staff must not do

- Menetapkan status final barang.
- Membuat official InventoryMovement.
- Mengubah qty resmi gudang.
- Mengisi manual status stok yang bisa dihitung sistem, seperti “stok habis/menipis”.
- Menutup/cancel ticket.
- Mutate finance/lifecycle sensitive flow.

### 1.5 Admin may do

- Assign staff.
- Review `StaffFieldReport`.
- Approve/reject/needs more info.
- Create official movement if needed.
- Close ticket and set final item status.
- Cancel ticket when still `OPEN`.
- Menangani exception/approval bermakna, bukan konfirmasi semua hal kecil yang bisa dihitung sistem.

## 2. Ticket Lifecycle Contract

```text
OPEN = belum mulai / bisa dibatalkan admin
IN_PROGRESS = sedang dikerjakan staff / mengunci staff dari pekerjaan aktif lain
DONE = staff selesai / menunggu cek admin jika butuh final confirmation
CLOSED = selesai final
CANCELLED = dibatalkan admin
```

Rules:
- Staff can `start` only if no other active work exists.
- Staff can `mark-done` only from `IN_PROGRESS`.
- Admin can `close` only from `DONE`.
- Admin can `cancel` only from `OPEN`.
- CLOSED/CANCELLED should not appear in default staff active list.

## 3. Staff Ticket List Contract

Endpoint:

```text
GET /api/tickets
Roles: OWNER, ADMIN, STAFF
```

For STAFF:
- Default list includes only active work:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- A ticket is visible if:
  - `assignedToId = currentUser.id`, or
  - it has `staffFieldReports.some.reportedByStaffId = currentUser.id`.
- STAFF list must not fallback to `tenantId` because staff user has empty tenantId.

Verified:
- Staff user id = 3.
- Ticket #12 `OPEN`, `assignedToId=3`, `linkedRoomItemId=1` appeared in staff list after V5.16-G.

## 4. Staff Report Endpoints

### Room item report

```text
PATCH /api/room-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Accepted DTO contract currently uses:
- `status`
- `note`
- optional photo fields
- `requestsReplacement`
- `requestedInventoryItemId`
- `requestedQty`

Do not use payload keys:
- `notes`
- `reportedCondition`
- `conditionNotes`

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- sets temporary applied status,
- fills `linkedRoomItemId`,
- does not decide final status.

### Warehouse/inventory report

```text
PATCH /api/inventory-items/:id/staff-status
Roles: OWNER, ADMIN, STAFF
```

Expected:
- creates/links ticket,
- creates `StaffFieldReport`,
- fills `linkedInventoryItemId`,
- does not mutate official qty.

Important:
- This endpoint is for physical/field report, not for staff manually marking stock health.
- Stock health such as `Stok habis`, `Stok menipis`, `Stok aman` is computed by UI/system from quantity thresholds.

## 5. StaffFieldReport Contract

Model introduced in V5.16-B.

Fields conceptually:
- ticket link,
- room/roomItem/inventoryItem link,
- reportedByStaff,
- reported condition,
- condition notes/photo evidence,
- request replacement data,
- admin decision,
- related movement if any,
- status.

Admin decisions:
- `APPROVE`
- `REJECT`
- `NEEDS_MORE_INFO`

Report statuses:
- reported/pending,
- under review,
- approved/in repair,
- rejected,
- closed/final.

Use user-facing Indonesian labels in UI. Avoid showing enum names to staff.

## 6. Close Ticket Contract

```text
POST /api/tickets/:id/close
```

Current body uses:

```json
{ "action": "CLOSE" }
```

or

```json
{ "action": "CANCEL" }
```

Optional final fields:
- `finalRoomItemStatus`
- `finalInventoryItemStatus`
- `finalAdminNote`

Do not use `reason`; validation rejects it.

## 7. Core Lifecycle Ownership

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
| Marketing/public | Marketing module in monolith | read-only public rooms/detail |

## 8. Tenant Portal Contract — Next Audit Target

Tenant side must follow:

```text
Tenant = My Stay Guide
```

Tenant can:
- melihat status tinggal/sewa,
- melihat tagihan,
- upload bukti pembayaran,
- melihat status payment submission,
- membuat request perpanjangan,
- membuat request keluar/check-out,
- melihat request/ticket miliknya,
- membaca notifikasi/urgency.

Tenant must not:
- approve payment,
- mutate invoice status,
- execute renew lifecycle,
- execute final checkout,
- set room/stay final state,
- mutate finance/lifecycle sensitive flows.

Tenant UI wording must use:
- “Tagihan”
- “Masa sewa”
- “Akhir masa sewa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Bukti pembayaran sedang diperiksa”
- “Tidak perlu upload ulang”
- “Menunggu keputusan admin”

Avoid in tenant UI:
- `stay`
- `periodEnd`
- `checkout request`
- `ISSUED`
- `PENDING_REVIEW`
- `lifecycle`
- `mutation`
- enum mentah/backend terms.

## 9. Locked Business Guards

1. Renewal invoice must be `ISSUED`.
2. Checkout final must be blocked if any invoice for the stay is not `PAID`/`CANCELLED`.
3. `DRAFT` invoice counts as open invoice.
4. `complete()` must not auto-create final utility invoice.
5. Payment approval remains core monolith and atomic.
6. Room status/occupancy writes remain core monolith.
7. Tenant does not execute lifecycle finalization.
8. Staff does not mutate finance/lifecycle-sensitive flows.
9. AI/assistant does not mutate data autonomously.

## 10. UX Contract

General:
- Clean, readable, modern blue system.
- Font weight tidak terlalu tebal.
- Tidak ada low-contrast text.
- Assistant harus memberi prioritas/action, bukan dekorasi.

Staff UI must use:
- “Laporkan kondisi”
- “Menunggu cek admin”
- “Admin meminta info tambahan”
- “Tandai selesai”
- “Pekerjaan selesai, menunggu konfirmasi”
- “Selesai final”

Tenant UI must use:
- “My Stay Guide”
- “Masa sewa”
- “Tagihan aktif”
- “Bukti pembayaran kamu sedang diperiksa”
- “Ajukan perpanjangan”
- “Ajukan keluar”
- “Hubungi admin”

Avoid:
- `FieldReport`
- `StaffPerformanceEvent`
- `PENDING_CHECK`
- `NEEDS_MORE_INFO`
- `linkedRoomItemId`
- `mutation`
- `negative KPI`
- `audit failed`
- tenant-facing enum/backend words.

## 11. AI/Finance Carry-Forward

V5.15 remains active as future track:
- Tier 0 deterministic hooks first.
- AI only on-demand.
- Finance ratios locked until balance-sheet-grade data is reliable.
- No fake ratio.


## 12. V5.20 Carry-Forward Contract

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


## 0.1 V5.23-B1 Accounting Backend Contract Lock

```text
Current backend remains operational finance.
Formal accounting starts only after additive foundation models and readiness gates exist.
No Balance Sheet or financial ratios may be treated as formal until readiness returns true.
```

### Accounting foundation contract

```text
Required first entities: ChartOfAccount, CashAccount, AccountingPeriod, OpeningBalanceBatch, OpeningBalanceLine, JournalEntry, JournalLine.
OWNER may manage accounting setup. ADMIN may receive limited operational finance/readiness later. STAFF and TENANT receive no accounting route access.
```

### Deposit contract update

```text
Deposit remains liability, not revenue.
Stay deposit fields remain operational snapshot in near term.
Future TenantDepositLedger must be additive and synchronized gradually.
No drop/deprecate of Stay deposit fields until a separate migration plan is approved.
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

## 0.0 Latest Contract Addendum — V5.24-B2/C

### Accounting setup contract

```text
Opening balance is the accounting starting point.
Posting opening balance creates JournalEntry with sourceType=OPENING_BALANCE.
Trial Balance must read posted JournalEntry and avoid double-counting OpeningBalanceLine.
Draft opening balance can be voided.
Posted opening balance must not be voided without a future reversal plan.
```

Rules:
- Only DRAFT opening balance may be voided in current system.
- POSTED opening balance requires a reversal/correction plan before any mutation.
- Duplicate DRAFT for same period/cutover should be blocked after POSTED exists.
- No auto-posting from invoice/payment/expense/stay yet.
- No backfill of old operational transactions yet.
- Balance Sheet can preview opening-balance ledger, but full business financial statements are not complete until operational auto-journal/cutover rules exist.

### Admin UI contract after V5.24-C

```text
Sidebar remains primary admin navigation.
Dashboard remains cross-menu command center.
GlobalSearch is allowed and expected for admin.
Dashboard ticket close action must either actually close DONE tickets or clearly route to review/close flow.
StaysPage filters must match actual query behavior; do not show ALL if backend still filters ACTIVE.
Ancillary revenue page must separate active features from roadmap/future items.
```

Do not reintroduce admin top workspace tabs as primary navigation unless explicitly re-approved.
