# KOST48 V5 — Project Journal
**Versi:** 2026-05-26 V5.24-C Released + Next Plan Lock


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
