# KOST48 V5 — Decisions Log
**Versi:** 2026-05-30 M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate Sync

<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_START -->
## 0.0 Latest Current State — M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate Sync

```text
Latest generated working packages:
- backend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- frontend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- backend_20260530_M8P1_UI_SMOKE_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P1_UI_SMOKE_HOTFIX_FULL.zip
- backend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_FULL.zip
- backend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- frontend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- backend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- frontend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- backend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- frontend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- backend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_UNCHANGED.zip
- frontend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_FULL.zip

Docs sync status:
- This docs sync supersedes older M8L–M8N active sections.
- Older M8L–M8N/M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8N

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8O | Global UI action/responsive + backend integrity cleanup | FULL | Frontend build PASS, backend build PASS, base API smoke PASS from user local logs |
| M8P.1 | UI smoke hotfix: responsive table auto-label + tenant copy cleanup | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8P.2 | Responsive/copy/action cleanup with safer labels and enum mapping | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8Q | Business-flow hardening for checkout request, invoice/payment refresh | FULL | Build covered by later cumulative builds; checkout/invoice/payment read smoke covered in M8R/M8T gates |
| M8R | Renew + checkout + deposit deep UAT hardening | FULL | Build PASS and renew/checkout/invoice/deposit read smoke PASS |
| M8S | Inventory + staff ops full UAT hardening | FULL | Inventory lifecycle API UAT PASS; staff official movement blocked 403 PASS; staff warehouse UI direction PASS from screenshot |
| M8T | Owner Finance Cockpit + production readiness gate | Backend UNCHANGED | Finance read smoke PASS; accounting readiness PASS; frontend build PASS; backend build PASS after cumulative backend patches |

### Latest verified UAT evidence

```text
M8O base smoke:
- GET /api/public/rooms PASS.
- Admin login PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/inventory-items, /inventory-movements, /room-items PASS.

M8R read smoke:
- GET /api/stays?limit=20 PASS.
- GET /api/invoices?limit=20 PASS.
- GET /api/admin/checkout-requests?status=APPROVED PASS.
- GET /api/admin/renew-requests?status=PENDING PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.

M8S inventory lifecycle API UAT:
- InventoryItem id=4 / UAT-M8S-KURSI-045732 created with qtyOnHand 10.
- Opening stock created official IN movement qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- RETURN_FROM_ROOM qty 999 blocked with HTTP 409.
- OUT qty 1 reduced qtyOnHand to 8.
- Final positionSummary returned: Gudang (8) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.

M8T finance/production gate:
- GET /api/invoices?limit=20 PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.
- GET /api/accounting/readiness PASS with ready=True and score=100.
- GET /api/assets?limit=20 PASS.
- GET /api/expenses?limit=20 PASS.
- Frontend build PASS: 727 modules transformed.
- Backend build:local PASS and final read smoke PASS.
```

### Current honest label

```text
M8O–M8T = build-confirmed and read/API-smoked for the tested surfaces.
M8S inventory stock lifecycle API UAT = PASS.
M8T owner finance production gate = frontend build PASS + backend build PASS + finance/read smoke PASS.
Manual browser smoke for every role/page is still not a complete FULL regression.
Generated Prisma noise appears after backend build and must be restored before code commit.
No DB reset was used.
No schema change was introduced in M8O–M8T.
```

### Immediate pre-commit gate

```text
1. Restore generated Prisma noise:
   git restore backend/src/generated/prisma
2. Confirm git status no generated Prisma files.
3. Commit code changes first.
4. Commit docs changes separately.
5. Push only after clean git status and no accidental generated Prisma commit.
```

### Next recommended phase

```text
PLAN M9 Full Regression UAT + Production Readiness.
Goal:
- smoke all main role surfaces after M8O–M8T,
- verify public booking, tenant portal, admin payment, renew, checkout, deposit, inventory, staff, owner finance,
- manually check responsive and action integrity,
- then commit/push after code/docs split.
```
<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_END -->

## 2026-05-30 — M8O–M8T Command Center Verification and Production Gate Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 536 | M8O menjadi verification/action sweep setelah M8N | Feature stacking dihentikan sementara untuk memastikan build, smoke, responsive, dan action integrity aman. |
| 537 | ResourceTable build blocker harus diselesaikan lebih dulu | UI sweep tidak boleh menumpuk di atas frontend yang berpotensi gagal build. |
| 538 | Proof link tidak boleh fallback ke `#` | Admin tidak boleh diarahkan ke action kosong saat bukti bayar tidak tersedia. |
| 539 | Responsive table auto-label dipakai sebagai safety net global | Mobile table tetap readable tanpa patch manual satu-per-satu di semua cell. |
| 540 | Tenant copy wajib dibersihkan dari `My Stay Guide` dan raw enum | Tenant melihat bahasa manusia seperti Panduan Kos Saya dan status pemesanan. |
| 541 | Approve checkout request harus conditional dan service-guarded | Mencegah role leak dan double-processing pada request yang sama. |
| 542 | Approve checkout request menyinkronkan planned checkout date | Final checkout modal dapat memakai tanggal yang sudah disetujui admin. |
| 543 | Invoice/payment mutations harus invalidate dashboard, urgency, stay, portal, dan accounting readiness | UI tidak boleh menampilkan blocker/cashflow stale setelah aksi finansial. |
| 544 | Final checkout harus conditional pada ACTIVE stay | Mengurangi risiko double-click/race ringan saat melepas kamar. |
| 545 | Final checkout tanggal dinormalisasi ke tanggal bisnis Jakarta | Mengurangi bug tanggal WIB/UTC pada akhir masa sewa. |
| 546 | Deposit settlement dipindah menjadi transaction + conditional HELD | Deposit tidak bisa diproses ganda lewat race/double-click. |
| 547 | Potongan/hangus deposit wajib catatan bermakna | Keputusan deposit memiliki audit trail dan tidak menjadi klik kosong. |
| 548 | Mutasi stok lama tidak boleh di-PATCH | Riwayat stok adalah audit trail; koreksi harus lewat mutasi baru. |
| 549 | RETURN_FROM_ROOM harus lock/validasi RoomItem | Return lebih besar dari stok kamar diblok dan tidak membuat qty negatif. |
| 550 | DTO inventory menerima UAT payload resmi dengan `movementType`/`qty` string | Command UAT diselaraskan dengan kontrak backend yang strict. |
| 551 | Staff warehouse UI menegaskan staff hanya lapor masalah fisik/kebutuhan restock | Status habis/menipis tetap dihitung otomatis oleh sistem. |
| 552 | Owner dashboard mendapat finance production gate | Owner bisa melihat accounting readiness, deposit ledger, asset register, dan cash decision lebih cepat. |
| 553 | Deposit tetap ditampilkan sebagai dana titipan/liability | Owner tidak boleh mengira deposit adalah omzet. |
| 554 | M8S inventory lifecycle API UAT dinyatakan PASS | IN, ASSIGN_TO_ROOM, RETURN_FROM_ROOM, bad return 409, OUT, dan staff 403 sudah terbukti. |
| 555 | M8T finance/read smoke dinyatakan PASS | Invoices, payment queue, deposit ledger, accounting readiness, assets, expenses berhasil diambil. |
| 556 | Backend build akan memunculkan generated Prisma noise | `backend/src/generated/prisma` harus selalu direstore sebelum commit jika schema tidak berubah. |
| 557 | M8O–M8T tidak memakai DB reset | UAT dilakukan di atas data berjalan tanpa reset database. |
| 558 | M8O–M8T tidak mengubah schema Prisma | Generated Prisma tidak boleh ikut commit. |
| 559 | Code dan docs harus dicommit terpisah | Audit git history lebih bersih dan rollback lebih mudah. |
| 560 | Next phase adalah M9 full regression UAT | Setelah M8O–M8T, fokus berikutnya adalah validasi end-to-end lintas role. |

<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_START -->
## 0.0 Latest Current State — M8L–M8N Critical Integrity, Inventory Automation, and Action Integrity Sync

```text
Latest generated working packages:
- backend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- frontend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- backend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- frontend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- backend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_UNCHANGED.zip
- frontend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_FULL.zip
- backend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_UNCHANGED.zip
- frontend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_FULL.zip
- backend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_UNCHANGED.zip
- frontend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_FULL.zip

Docs sync status:
- This docs sync supersedes older M8G–M8K active sections.
- Older M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8K

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8L-Critical | Payment/invoice/accounting integrity hotfix + inventory safety belt | FULL | ZIP generated; backend/frontend patch package created; local build still must be confirmed after apply |
| M8L-Stock Hotfix 1 | Stock reference refresh + opening stock movement | FULL | Corrected dropdown/reference refresh and opening IN movement behavior; superseded by Stock Hotfix 2 |
| M8L-Stock Hotfix 2 | Stock position, fallback qty sync, and room flow | FULL | Targeted backend smoke PASS; manual inventory UI smoke PASS from user screenshots/logs |
| M8L-Auto Inventory | Automate stock movement flows and reduce manual room item entry | FULL | RETURN_FROM_ROOM API smoke PASS; manual UI smoke PASS from user screenshots/logs |
| M8L-Responsive | Responsive tables/lists across command center | Backend UNCHANGED | Frontend package generated; local frontend build/manual PC-tablet-mobile smoke still required |
| M8M | Global IA simplification: remove global search, separate menu/filter | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |
| M8N | Global Action Integrity: no misleading/no-op buttons | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |

### Latest verified UAT evidence

```text
M8L Stock Position + Room Flow:
- InventoryItem id=3 / UAT-M8L-MEJA-03 created with qtyOnHand 10.
- Opening stock created official InventoryMovement IN qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created/updated RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 from roomId=1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.
- Short movement note returned 400.

M8L manual UI smoke from user screenshots:
- Stock Gudang shows quick actions Pasang / Keluar / Edit.
- Mutasi Stok quick-action prefill works for Pasang ke Kamar and Kembali dari Kamar.
- Confirmation modal shows official stock mutation warning and effect.
- Barang di Kamar is read/condition oriented and links to room detail.
- Room detail shows inventory tab with assigned item.

M8N user feedback:
- Any visible button/menu must have a real purpose.
- Menu, filter, CTA, and status badge must be visually and functionally separated.
- No global search in header unless a page-specific search is genuinely needed.
```

### Current honest label

```text
M8L inventory backend targeted smoke + manual UI smoke = PASS for tested stock sync/position/room flows.
M8L critical payment/invoice/accounting hotfix package = generated, but full local build/runtime smoke still required before PASS label.
M8L responsive, M8M IA simplification, and M8N action-integrity packages = generated, but final local frontend build + manual UI smoke still required.
No DB reset was used.
No schema change was introduced in these packages.
Generated Prisma noise must be restored before commit if build regenerates it.
```

### Next recommended phase

```text
PLAN M8O Verification Gate + UI Action Sweep.
Goal:
- run local frontend build after M8N,
- run backend build if latest backend M8L patches are applied,
- smoke critical API paths,
- manually check owner/admin/staff/tenant/public pages for misleading buttons, mobile table behavior, and menu/filter separation,
- then commit/push M8L–M8N only after clean git status.
```
<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_END -->

## 2026-05-29 — M8L–M8N Inventory Automation and Global Action Integrity Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 511 | M8L critical integrity hotfix diprioritaskan sebelum inventory UI final | Tenant payment, invoice total, payment lock, and accounting cancellation issues are more dangerous than cosmetic inventory work. |
| 512 | `findCurrentForTenant` must expose invoice metadata | Tenant payment UX can locate the active/latest bill without guessing. |
| 513 | Payment approval locking must cover related stay/room/invoice state | Reduces concurrent approval race risk. |
| 514 | Initial check-in invoice must store total amount | Downstream payment/accounting logic must not read zero/null invoice totals. |
| 515 | AutoOps invoice cancellation must be accounting-safe | ISSUED/PARTIAL cancellation must not silently diverge from journal state. |
| 516 | Inventory movement becomes official stock truth | Stok gudang and barang kamar must be synchronized through official movement flows. |
| 517 | Opening stock on item creation is automated as IN movement | Admin should not create a new item then manually create the first movement. |
| 518 | Backend adds explicit stock sync fallback | Local DB trigger gaps must not leave qtyOnHand stale. |
| 519 | `ASSIGN_TO_ROOM` automatically updates room items | Admin should not separately maintain Barang di Kamar after stock movement. |
| 520 | `RETURN_FROM_ROOM` validates room stock before returning | Prevents returning more items than the room actually has. |
| 521 | Direct `qtyOnHand` edit is blocked | All stock truth changes must use Mutasi Stok. |
| 522 | Barang di Kamar becomes read/condition-oriented | Assignment and return should flow through Mutasi Stok, not separate manual duplicate input. |
| 523 | Stock health is calculated, not manually selected | `Habis`, `Menipis`, and `Aman` are derived from qty/minQty. |
| 524 | Stok list must show position summary | Admin needs to know whether stock is in gudang or rooms without opening detail. |
| 525 | Global search is removed from header | Search was visual noise and not a core command-center action. |
| 526 | Menu and filter are separated globally | User should know whether clicking navigates or filters. |
| 527 | Navigation badges show only urgent/actionable counts | Total-data badges on menu create confusion with filters. |
| 528 | No-op or decorative CTA is forbidden | Buttons must navigate, mutate, open a modal, or clearly filter. |
| 529 | `Lihat antrean` style buttons are removed unless they open a real queue | CTA must lead to meaningful work. |
| 530 | Empty state must be section-specific | Do not say there is no work while another table on the same page still has work. |
| 531 | Responsive tables must adapt to PC/tablet/mobile | Mobile should use readable card/list patterns instead of forced sideways tables. |
| 532 | Movement enum labels must be human-readable | Admin should see `Kembali dari Kamar`, not `RETURN_FROM_ROOM`. |
| 533 | System should automate deterministic data entry whenever safe | Admin confirms meaningful/sensitive decisions, not duplicate calculated data. |
| 534 | M8L stock sync targeted smoke can be treated as PASS | API and manual UI evidence confirmed assign/return/gudang/room synchronization. |
| 535 | M8M/M8N remain package-generated until build/manual smoke pass | Do not claim frontend action-integrity FULL PASS before local verification. |

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

## 2026-05-29 — M8G–M8K Command Center Safety Belt Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 493 | M8G accounting gap diprioritaskan sebelum lanjut booking UI | Manual admin payment dapat membuat cash/AR diverge jika tidak dijurnal. |
| 494 | Manual invoice payment wajib memanggil accounting posting service | Jalur admin dan jalur tenant approval menjadi lebih konsisten secara accounting. |
| 495 | Journaled InvoicePayment tidak boleh diupdate/delete langsung | Mencegah silent divergence; koreksi wajib lewat reversal/correction resmi. |
| 496 | PARTIAL_REFUND harus menghasilkan `PARTIALLY_REFUNDED` | Status deposit lebih akurat saat sebagian dipotong dan sisanya dikembalikan. |
| 497 | Hardcoded local path di AccountingSchemaGuard dihapus | Pesan next action menjadi portable dan tidak bocor path dev user. |
| 498 | Admin booking approve tidak boleh direct-click | Booking approval menyentuh room/payment/invoice initial flow dan butuh review singkat. |
| 499 | Admin booking reject membutuhkan endpoint resmi | Reject booking harus audited dan bisa release room secara aman. |
| 500 | Booking reject ringan dibatasi untuk booking tanpa invoice/payment submission | Booking yang sudah masuk billing/payment tidak boleh dibatalkan diam-diam. |
| 501 | Tenant harus tetap melihat booking yang ditolak/dibatalkan | Tenant butuh alasan dan next action, bukan status hilang dari portal. |
| 502 | Tenant waiting-room copy harus pendek dan action-first | Mengikuti rule UX bahwa user Indonesia tidak suka membaca panjang. |
| 503 | Approve checkout request bukan final checkout | Admin approval hanya menyetujui pengajuan keluar; final checkout tetap flow terpisah. |
| 504 | Checkout reject wajib alasan minimal 8 karakter | Tenant/admin audit trail lebih jelas. |
| 505 | Request checkout yang sudah diproses tidak bisa diproses ulang | Menghindari double decision pada request yang sama. |
| 506 | Staff action dipertegas sebagai bukti/laporan kerja | Staff tidak dianggap mengambil keputusan final barang/ticket. |
| 507 | Close ticket final wajib catatan admin minimal 8 karakter | Final decision admin punya audit trail. |
| 508 | Review laporan staff wajib catatan admin minimal 8 karakter | Admin confirmation tidak menjadi klik kosong. |
| 509 | Generated Prisma noise tetap harus direstore | Build boleh generate client, tetapi commit generated hanya jika scope disetujui. |
| 510 | M8L berikutnya adalah Inventory Movement Safety Belt | Stock truth resmi adalah area sensitif berikutnya setelah staff/ticket close. |

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

## 2026-05-28 — M7A–M8F Frontend Safety Belt Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 467 | M7A Tenant Portal Action Center diposisikan sebagai frontend hardening, bukan rewrite tenant portal | Tenant portal dibuat lebih action-first memakai API yang sudah ada. |
| 468 | Tenant payment proof UI harus mengikuti kontrak image JPG/PNG/WebP maksimal 2MB | Menghindari tenant memilih PDF/5MB yang bisa ditolak backend. |
| 469 | Pending review proof harus menampilkan “Tidak perlu upload ulang” | Mengurangi duplicate upload dan kebingungan tenant. |
| 470 | M8A menambahkan safety belt final checkout dan deposit settlement | Admin dibimbing sebelum melepas kamar dan memproses deposit. |
| 471 | Deposit action UI tidak boleh memakai raw enum | Admin membaca aksi sebagai kembalikan penuh/potong sebagian/hangus. |
| 472 | Deposit tetap dana titipan/liability, bukan omzet | Copy finance dan settlement tidak menyesatkan laporan bisnis. |
| 473 | M8B mengunci public booking copy dengan first-paid room priority | Public paham booking belum mengunci kamar. |
| 474 | Public room AVAILABLE ditulis “Bisa diajukan”, bukan seolah sudah pasti aman | Mengurangi klaim kamar terkunci sebelum pembayaran valid. |
| 475 | M8C memperketat payment review decision | Approve payment tidak boleh asal klik untuk proof hilang/risiko tinggi. |
| 476 | Missing proof memblokir normal approve di UI | Admin diarahkan reject/minta bukti ulang. |
| 477 | Reject payment membutuhkan alasan minimal 8 karakter | Tenant mendapat alasan yang bisa ditindaklanjuti. |
| 478 | M8D mengunci rule UX “orang Indonesia tidak suka baca” | UI harus ringkas, minim paragraf, dan action-first. |
| 479 | CTA/link berulang dalam satu halaman dibatasi 1–2 untuk tujuan sama | Mengurangi visual clutter dan kebingungan user. |
| 480 | Priority/assistant board default maksimal 3 prioritas utama | User melihat aksi penting tanpa membaca daftar panjang. |
| 481 | M8E memperkuat renew approval safety | Admin wajib memperhatikan meter, tanggal, dan tagihan renew. |
| 482 | Renew reject tidak boleh fallback “tanpa alasan” | Audit trail dan komunikasi tenant menjadi lebih jelas. |
| 483 | Renew term enum harus diganti label manusia | UI tidak bocor istilah backend seperti MONTHLY/YEARLY. |
| 484 | M8F memperkuat issue/cancel invoice dan manual payment | Tagihan sebagai blocker cashflow/checkout/renew lebih aman dikelola. |
| 485 | Issue invoice butuh checklist singkat | Admin sadar tenant akan melihat tagihan setelah diterbitkan. |
| 486 | Cancel invoice wajib alasan minimal 8 karakter | Pembatalan tagihan punya audit reason. |
| 487 | Create invoice frontend harus validasi item/qty/price/period/due date | Mengurangi tagihan kosong atau salah input sebelum backend call. |
| 488 | Manual payment adalah catatan admin, bukan upload bukti tenant | Role dan audit trail payment tetap jelas. |
| 489 | M7A–M8F tidak mengubah backend | Semua batch adalah frontend safety/readability hardening. |
| 490 | M7A–M8F build PASS tapi bukan FULL PASS | Runtime/API smoke dan manual UI smoke masih deferred. |
| 491 | Next recommended phase adalah M8G Admin Booking Review Safety Belt | Booking approval/reject perlu safety belt setelah public funnel diperjelas. |
| 492 | Setelah M8G, M9 Targeted Runtime/UI Smoke harus memvalidasi M7A–M8G | Tidak boleh menumpuk frontend package tanpa verification gate sebelum label final. |


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



## 2026-05-28 — M4A Deposit Ledger Backend Foundation Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 456 | M3.2 BR5 pure first-paid runtime UAT dinyatakan PASS | M3.2 naik dari partial menjadi FULL runtime UAT PASS. |
| 457 | M4A dimulai sebagai backend-first deposit ledger foundation | Frontend deposit timeline ditunda ke M4B agar schema/hook stabil dulu. |
| 458 | `TenantDepositLedgerEntry` ditambahkan sebagai additive business-history layer | Deposit punya timeline operasional tanpa mengganti snapshot `Stay`. |
| 459 | `Stay` deposit fields tetap source operasional saat ini | Tidak ada breaking rewrite untuk lifecycle/payment/checkout. |
| 460 | Deposit ledger tidak menggantikan accounting journal | Deposit ledger untuk audit operasional; accounting journal tetap formal ledger. |
| 461 | Backfill historical deposit hanya dry-run | Histori lama tidak dipalsukan tanpa review owner. |
| 462 | Payment approval hook membuat `PAYMENT_RECEIVED` | Deposit yang dibayar tenant otomatis masuk timeline deposit. |
| 463 | Deposit settlement hook membuat `REFUND`/deduction/forfeit entries | Refund/deduction deposit punya jejak operasional. |
| 464 | M4A runtime UAT FULL PASS | Summary, reconciliation-lite, dry-run, payment hook, settlement hook, cleanup semua PASS. |
| 465 | Commit M4A dipush sebagai `1b645de` | origin/main sudah membawa deposit ledger backend foundation. |
| 466 | M4B berikutnya adalah frontend deposit timeline | Admin/tenant/owner perlu melihat deposit history dengan microcopy yang mudah. |


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

## 2026-05-27 — V5.29-K Controlled Monthly Auto-Close Governance Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 427 | KOST48 boleh memakai auto-close bulanan | Period close tidak harus manual setiap bulan selama automation tetap controlled. |
| 428 | Auto-close bukan blind automation | Sistem hanya menutup periode jika readiness aman dan preview balanced. |
| 429 | Auto-close hanya menargetkan bulan sebelumnya | Bulan berjalan tidak boleh dikunci otomatis. |
| 430 | Auto-close tidak membuat periode yang belum ada | Jika target period missing, sistem safe-skip dengan skippedReason. |
| 431 | Target period harus OPEN | CLOSED/invalid period tidak boleh ditutup ulang diam-diam. |
| 432 | Readiness period close harus canPost=true | Blocker data/accounting mencegah closing otomatis. |
| 433 | Preview closing journal harus balanced | Tidak ada closing journal yang diposting jika debit/kredit tidak seimbang. |
| 434 | Owner boleh trigger auto-run manual | Owner tetap punya kontrol eksplisit untuk menjalankan auto-close saat dibutuhkan. |
| 435 | Admin tidak boleh trigger auto-run manual | Sensitive accounting close tetap Owner-controlled. |
| 436 | AutoOps boleh menjalankan accounting auto-close | Auto-close menjadi bagian dari deterministic operations automation. |
| 437 | Manual period close wajib alasan minimal 8 karakter | Audit trail closing tidak boleh kosong. |
| 438 | Reopen tetap Owner-only dan reason-required | Periode tertutup tidak boleh dibuka tanpa alasan audit. |
| 439 | Safe-skip dianggap PASS behavior untuk kondisi target belum siap | Sistem benar jika tidak memaksa close saat period 2026-04 belum ada. |
| 440 | Actual closed=true UAT ditunda sampai ada previous OPEN period yang ready | Tidak boleh mengklaim full actual-close pass tanpa jurnal closing benar-benar dibuat. |
| 441 | Commit V5.29-K dipush sebagai `7c8c8e7` | origin/main sudah membawa controlled monthly auto-close governance. |
| 442 | Generated Prisma tetap tidak ikut commit | Hygiene release tetap bersih. |
| 443 | Next recommended product phase kembali ke M1 Tenant My Stay Guide Full Audit | Accounting governance cukup stabil untuk melanjutkan audit tenant. |


## 2026-05-27 — V5.29-C/D Lifecycle Hotfix PASS Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 414 | V5.29-C dinyatakan PASS setelah runtime UAT B1/B2/B3 | Deposit, rent 0, dan invoice count kembali aman sebagai data dasar lifecycle/finance. |
| 415 | PARTIAL_REFUND harus memproses seluruh deposit | Tidak ada sisa deposit yang hilang/tidak tercatat. |
| 416 | `agreedRentAmountRupiah=0` dipertahankan sebagai nilai valid | Backend tidak boleh mengganti angka 0 dengan default room rent. |
| 417 | `invoiceCount` dan `openInvoiceCount` dikunci berbeda | Admin/owner membaca total invoice dan blocker invoice dengan benar. |
| 418 | Checkout request UTC HOTFIX2 PASS untuk fresh data | Tanggal checkout tenant tidak lagi drift H-1 dan notification memakai requested date. |
| 419 | Renew requestedTerm HOTFIX PASS | YEARLY/term yang diminta tidak lagi menjadi dead data saat approve. |
| 420 | Renew date precision HOTFIX3 wajib memakai UTC-safe date helpers | Stay planned checkout dan invoice period tidak boleh drift H-1. |
| 421 | Tenant blocker microcopy HOTFIX4 menghapus enum mentah | Tenant tidak melihat `(ISSUED)` atau istilah backend mentah di blocker message. |
| 422 | F2 cache invalidation PASS berdasarkan manual UI dan API cross-check | Approve renew tidak meninggalkan pending state stale di UI. |
| 423 | Commit lifecycle hotfix dipush sebagai `f6af6fc` | Main/origin/main sekarang membawa hotfix V5.29-C/D. |
| 424 | Generated Prisma tetap tidak boleh ikut commit | Hygiene release tetap dijaga setelah build lokal. |
| 425 | Historical UAT notification/date lama tidak dianggap regression baru | Fresh data setelah hotfix menjadi kriteria kebenaran. |
| 426 | Next bounded batch adalah V5.29-E | Check-in pricing terms dan DRAFT invoice reversal hygiene tetap outstanding. |

## 2026-05-26 — V5.29-B9A/B9B + Critical Bug Audit Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 393 | B9A Statement Command Center dipush sebagai frontend-first owner finance cockpit | Finance → Laporan Keuangan menjadi owner-readable cockpit, bukan panel teknis accounting. |
| 394 | B9A menambahkan statement cards, data quality panel, period close timeline, dan journal audit trail | Owner/admin bisa membaca Trial Balance, Neraca, P&L, aset, period close, dan data quality dalam satu flow. |
| 395 | Finance menu “Setup Accounting” diganti menjadi “Laporan Keuangan” | Accounting tidak lagi terasa sebagai setup teknis setelah ledger foundation siap. |
| 396 | Backend unchanged di B9A karena existing accounting endpoints sudah cukup | Tidak perlu read-only aggregator baru untuk B9A. |
| 397 | B9B difokuskan hanya pada copy consistency readiness/accounting warning | Menghindari kontradiksi `formalStatementReady=true` dengan copy lama B1/B2/no-auto-posting. |
| 398 | B9B runtime API smoke menunjukkan warning readiness sudah current | Owner tidak lagi membaca warning stale yang menurunkan trust. |
| 399 | Critical bug audit mengubah prioritas timeline | Tenant My Stay Guide ditunda sampai B1/B2/B3/B4/F1/B5/B6/B7/F2 hotfix track masuk. |
| 400 | B1 deposit partial refund guard wajib strict | Deposit tidak boleh punya sisa tidak tercatat. |
| 401 | B2 rent 0 harus dipertahankan sebagai nilai eksplisit | Gunakan `??`, bukan `||`, untuk agreed rent. |
| 402 | B3 invoiceCount harus total, openInvoiceCount harus filtered | Admin/owner tidak boleh membaca jumlah invoice salah. |
| 403 | B4 requestedTerm harus dipakai saat approve renew | Request term tenant tidak boleh menjadi dead data. |
| 404 | F1 check-in wizard harus expose semua pricing term backend | Admin tidak boleh bypass API untuk BIWEEKLY/SEMESTERLY/YEARLY. |
| 405 | B5 checkout notification harus memakai requestedCheckOutDate sebagai tanggal utama | Owner/admin melihat tanggal yang diajukan tenant, bukan tanggal lama. |
| 406 | B6 DRAFT invoice cancellation tidak boleh memanggil reversal | DRAFT belum journaled; reversal sia-sia dan error accounting tidak boleh ditelan diam-diam. |
| 407 | B7 checkout-requests response consistency harus dicek bersama frontend expectation | Hindari breaking UI atau double wrapper. |
| 408 | F2 approve renew harus invalidate checkout/stay cache terkait | Mengurangi stale state di StayDetail/admin checkout request. |
| 409 | V5.29-C dibatasi untuk B1/B2/B3 | Batch critical data integrity harus kecil dan mudah diuji. |
| 410 | V5.29-D dibatasi untuk B4/B5/B7/F2 | Renew/checkout consistency dibenahi dalam batch terpisah. |
| 411 | V5.29-E dibatasi untuk F1/B6 | Check-in UI dan invoice cancellation hygiene dipisahkan dari bug critical. |
| 412 | Semua hotfix harus tetap tanpa DB reset dan tanpa lifecycle rewrite luas | Patch harus bounded, targeted, dan aman. |
| 413 | Tenant Side Full Audit tetap next product track setelah hotfix critical selesai | Tenant UX penting, tapi tidak boleh dibangun di atas data lifecycle yang salah. |
```


## 2026-05-26 — V5.27-B7 / V5.28-B8 Accounting Governance Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 377 | Period close menjadi mekanisme resmi untuk memindahkan laba/rugi periode ke Retained Earnings | Balance Sheet tidak lagi terus bergantung pada current profit sementara setelah periode ditutup. |
| 378 | Closing journal memakai `JournalSourceType.CLOSING_ENTRY` | Audit trail closing terlihat di ledger dan Trial Balance tetap balanced. |
| 379 | P&L operasional mengecualikan `CLOSING_ENTRY` secara default | Owner tetap melihat performa operasional periode, bukan revenue/expense nol setelah close. |
| 380 | Duplicate close pada periode CLOSED harus diblokir | Mencegah double closing dan angka Retained Earnings rusak. |
| 381 | Reopen periode harus memakai reversal journal, bukan delete/edit closing journal | Audit trail aman dan histori close/reopen tetap terlihat. |
| 382 | Reopen memakai `JournalSourceType.CLOSING_REVERSAL` | Trial Balance tetap balanced dan reversal dapat dibedakan dari closing biasa. |
| 383 | Re-close setelah reopen memakai versi berikutnya, misalnya `JE-CLOSE-2026-05-V2` | Histori koreksi tetap jelas tanpa overwrite journal lama. |
| 384 | Manual update status `AccountingPeriod` dilarang setelah B8 | Periode tidak boleh ditutup/dibuka lewat status flip tanpa journal. |
| 385 | Journal draft/posting langsung ke periode CLOSED harus diblokir | Periode tertutup benar-benar locked kecuali dibuka ulang lewat workflow Owner. |
| 386 | B8 tetap tidak menyentuh payment/stay/renew/checkout lifecycle | Accounting governance tidak boleh merusak operational core. |
| 387 | Balance Sheet setelah close membaca Retained Earnings dan `currentProfitRupiah` hanya untuk periode belum close | Owner tidak membaca laba/rugi ganda di equity. |
| 388 | P&L setelah reopen/close ulang tetap mengecualikan CLOSING_ENTRY dan CLOSING_REVERSAL | P&L tidak menjadi dobel dan tidak hilang setelah governance flow. |
| 389 | B8 response consistency wajib menampilkan nested accountingPeriod state yang benar | Menghindari kebingungan response top-level CLOSED tetapi nested masih OPEN. |
| 390 | Generated Prisma tetap tidak boleh ikut commit | Hygiene release tetap dijaga. |
| 391 | Next recommended phase adalah B9 Statement Command Center + Data Quality | Setelah engine aman, owner UI perlu menjelaskan angka dan audit trail. |
| 392 | Tenant Side Full Audit tetap carry-forward, tetapi accounting B9 adalah next official focus setelah B8 jika user tetap di finance track | Product track tenant tidak dibuang, hanya ditunda karena accounting runway sedang aktif. |


## 2026-05-24 — V5.23 Admin IA + Accounting Foundation Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 337 | Admin sidebar final memakai 5 menu: Dashboard, Stays & Tenant, Finance, Staff & Tiket, Kamar & Stok | Mengurangi cognitive load dan menghapus menu abstrak/redundan. |
| 338 | Pengumuman tidak masuk sidebar | Pengumuman tetap di header karena bersifat broadcast/quick action. |
| 339 | Settings/Akun tidak masuk sidebar | Settings tetap di header/avatar karena jarang dipakai harian. |
| 340 | Tenant digabung dengan Stays | Tenant selalu dilihat dalam konteks masa sewa, kamar, tagihan, renew, checkout. |
| 341 | Expenses digabung dengan Finance | Semua arus uang masuk/keluar berada di satu pintu. |
| 342 | Tiket digabung dengan Staff | Tiket adalah pekerjaan operasional staff, bukan domain utama terpisah. |
| 343 | Reports tidak menjadi menu admin mandiri untuk sekarang | Reports terlalu abstrak sampai accounting/reporting model matang. |
| 344 | Finance harus menampung voucher WiFi dan pendapatan tambahan | KOST48 perlu melihat revenue per kamar dan add-on revenue. |
| 345 | `WifiSale` dipertahankan short-term | Backend sudah ada; tidak perlu migrasi risiko tinggi sebelum model generic siap. |
| 346 | Future ancillary revenue memakai `AncillaryProduct` + `AncillarySale` | Lebih scalable daripada membuat tabel terpisah untuk Laundry/Galon/Cleaning/dll. |
| 347 | Expense harus bergerak ke OPEX / COGS / CAPEX | Owner perlu tahu biaya operasional, HPP layanan, dan aset. |
| 348 | Deposit tetap liability, bukan revenue | Laporan keuangan tidak boleh salah membaca deposit sebagai pendapatan. |
| 349 | Balance Sheet tidak boleh ditampilkan sebagai valid sebelum accounting readiness terpenuhi | Menghindari laporan/rasio fake. |
| 350 | Accounting roadmap harus bertahap dari readiness → cash/opening balance → journal → assets → statements | Mengurangi risiko overbuild dan data mismatch. |
| 351 | Next phase adalah PLAN FIRST untuk Accounting & Balance Sheet Foundation | User akan mengirim rencana dari AI lain untuk dipertimbangkan sebelum patch. |


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 317 | Prioritas kamar mengikuti pembayaran valid pertama, bukan booking pertama | Booking/minat tidak boleh dianggap mengunci kamar penuh. |
| 318 | Tenant/public copy wajib menjelaskan bahwa sebelum lunas/disetujui, kamar masih bisa diminati orang lain | Mengurangi salah paham dan klaim hak kamar tanpa bayar. |
| 319 | Tenant payment harus satu aksi: Bayar & Kirim Bukti | Tidak ada flow “bayar dulu, upload bukti nanti” secara UX. |
| 320 | Booking/minat tanpa keputusan atau pembayaran valid memakai SLA 3 jam | Kamar tidak tertahan terlalu lama. |
| 321 | Approved booking payment deadline default 3 jam | Setelah kamar siap/invoice awal terbit, tenant harus cepat bayar + kirim bukti. |
| 322 | Bukti pembayaran pending review tidak boleh auto-cancel | Tenant sudah melakukan kewajiban; admin/owner yang harus review cepat. |
| 323 | Payment review urgent setelah 1 jam, escalate setelah 3 jam, max 6 jam | Admin payment review menjadi action queue prioritas. |
| 324 | Invoice aktif tenant berjalan urgent 6 jam dan overdue 24 jam | Tidak ada hutang anak kos; renew/checkout tetap blocked sampai lunas. |
| 325 | Renew request urgent 3 jam dan escalate 6 jam | Admin harus cepat catat meter dan putuskan renew. |
| 326 | Renew wajib meter checkpoint | Invoice renew berisi sewa + listrik + air dari selisih meter. |
| 327 | Tenant lama yang telat melewati masa kontrak/pembayaran dapat kehilangan hak renew | Kamar bisa diiklankan ulang. |
| 328 | Jika tenant baru valid mengambil kamar, tenant lama telat wajib keluar maksimal 3 jam | Tegas namun masih memberi waktu pengosongan. |
| 329 | Tenant baru belum boleh bayar jika kamar belum siap dihuni | Sebelum siap, tenant baru hanya waiting/interest. |
| 330 | AutoOps boleh auto-cancel expired unpaid booking | Admin tidak perlu review booking yang sudah jelas gagal. |
| 331 | AutoOps boleh auto-release orphan RESERVED room | Kamar tidak tertahan oleh data tidak valid. |
| 332 | AutoOps boleh dedup alert yang sama | Dashboard tidak boleh menampilkan pesan mirip berkali-kali. |
| 333 | AutoOps tidak boleh approve payment | Bukti pembayaran tetap perlu keputusan manusia. |
| 334 | AutoOps tidak boleh approve renew/final checkout/deposit refund | Lifecycle sensitif tetap core/admin. |
| 335 | Urgent UI boleh memakai emphasis lebih besar/tegas untuk kasus special | UI harus membuat risiko bisnis terlihat jelas. |
| 336 | Redundant assistant/alert harus dikurangi | Assistant = prioritas dan aksi, bukan spam. |

## 2026-05-22 — V5.17 Staff UX / Inventory / Routine Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 301 | Staff UI memakai clean readable modern blue system, bukan tema yang berubah-ubah | Staff/admin/tenant nanti harus terasa satu keluarga UI. |
| 302 | Font tidak boleh terlalu tebal atau sulit dibaca | Heading maksimal semibold; body tetap readable. |
| 303 | Teks/badge low contrast dilarang | Semua status dan helper text harus terbaca jelas. |
| 304 | Room card staff dapat diklik penuh | Tombol dobel seperti “Buka” dan “Perlu cek” dihilangkan jika fungsi sama. |
| 305 | Modal laporan staff memakai progressive disclosure | Staff menjawab kondisi lapangan bertahap, bukan memilih semua enum sekaligus. |
| 306 | Assistant/rule intelligence harus bekerja, bukan dekoratif | Assistant memberi prioritas dan next action dari data. |
| 307 | Status stok gudang dihitung otomatis dari `qtyOnHand/minQty` | Staff tidak input manual “stok habis/menipis”. |
| 308 | `InventoryItem.status` tidak boleh disalahgunakan untuk status stok otomatis | Pisahkan kondisi fisik barang dari inventory health. |
| 309 | Admin tidak perlu mengonfirmasi hal yang bisa dihitung sistem | Admin fokus exception/approval/movement resmi. |
| 310 | Checklist harian/mingguan/bulanan adalah core staff workflow | Tidak boleh hilang dari staff workspace. |
| 311 | Checklist ditampilkan sebagai professional work cards | Progress visual ringan boleh dipakai tanpa dependency chart baru. |
| 312 | V5.17-D Routine Work Cards manual PASS dari user | Staff checklist restored dan dianggap bagus. |
| 313 | Generated Prisma noise harus di-restore sebelum commit/push kecuali ada keputusan sadar | Menghindari commit binary/generated besar yang tidak diperlukan. |
| 314 | Commit `484a288` menjadi latest staff UX stable checkpoint | Pushed to main. |
| 315 | Next focus adalah Tenant Side Full Audit, bukan lanjut staff besar lagi | Tenant portal perlu jadi My Stay Guide. |
| 316 | Tenant UI harus menggunakan bahasa tenant-friendly | Hindari enum/backend jargon seperti ISSUED, PENDING_REVIEW, stay, periodEnd. |

## 2026-05-22 — V5.16 Staff Repair Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 281 | Staff tidak lagi dianggap sebagai pengambil keputusan final barang | Staff hanya melapor/diagnosis/kerjakan; admin/owner final confirmation. |
| 282 | `Ticket` menjadi process controller untuk staff repair flow | Ticket mengontrol OPEN/IN_PROGRESS/DONE/CLOSED/CANCELLED. |
| 283 | `StaffFieldReport` menjadi laporan kondisi lapangan | Staff diagnosis dan permintaan barang dicatat terstruktur. |
| 284 | `RoomItem.status` adalah display/final state setelah admin confirm | Staff tidak langsung memutuskan status akhir barang kamar. |
| 285 | `InventoryItem.status` adalah display/final state kondisi fisik barang gudang setelah admin confirm | Staff tidak langsung memutuskan kondisi final barang gudang. |
| 286 | `InventoryMovement` tetap kebenaran stok resmi dan hanya admin/owner | Staff tidak membuat movement resmi. |
| 287 | `PATCH /room-items/:id/staff-status` menjadi report flow | Endpoint membuat/link ticket dan field report, bukan final mutation. |
| 288 | `PATCH /inventory-items/:id/staff-status` menjadi report flow | Endpoint membuat/link ticket dan field report untuk gudang. |
| 289 | Wording staff UI diganti dari “Update Status” ke “Laporkan Kondisi” | Menghindari staff merasa bisa mengubah keputusan final. |
| 290 | `StaffFieldReport` schema additive diizinkan | Perubahan aman tanpa DB reset dan tidak merusak data lama. |
| 291 | Admin review report dapat `APPROVE`, `REJECT`, `NEEDS_MORE_INFO` | Keputusan admin menjadi eksplisit. |
| 292 | Admin close ticket bisa membawa final item status | Final state dicatat saat closure, bukan saat staff report. |
| 293 | Close ticket body memakai `action: CLOSE/CANCEL`, bukan `reason` | Mengikuti DTO runtime yang menolak property reason. |
| 294 | `CLOSE` hanya valid dari `DONE` | Lifecycle guard dipertahankan; OPEN tidak boleh langsung close. |
| 295 | `CANCEL` hanya valid dari `OPEN` | Ticket UAT/laporan salah bisa dibatalkan sebelum pekerjaan dimulai. |
| 296 | Staff hanya boleh satu pekerjaan aktif IN_PROGRESS | Active work lock dipertahankan. |
| 297 | Staff list default hanya menampilkan active work | `OPEN`, `IN_PROGRESS`, `DONE` tampil; `CLOSED/CANCELLED` masuk laporan/rekap. |
| 298 | Staff list visibility diperbaiki di V5.16-G | Staff melihat ticket assigned ke dirinya atau report dibuat olehnya. |
| 299 | UAT script file tidak dibuat lagi secara default | User minta UAT ditulis di chat, bukan file `scripts/uat`. |
| 300 | Manual UAT V5.16-D/E/G dianggap PASS untuk flow utama | Staff report, linking, movement, lifecycle, dan staff active list terbukti. |

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 256 | V5.15 direction dikunci sebagai `Intelligent Command Center + Finance Foundation` | Fokus naik dari UI command center ke rule intelligence, dedup UX, chart/report drill-down, dan finance foundation. |
| 257 | `AssistantPanel` dan `ActionQueueTable` tidak boleh menduplikasi pesan yang sama | Assistant menjadi diagnosis/impact; queue menjadi daftar pekerjaan konkret. |
| 258 | Dedup memakai kombinasi `ruleId + entityType + entityId + actionRoute` | Mengurangi alert spam dan membuat dashboard lebih matang. |
| 259 | Sidebar tidak harus menampilkan Reports sebagai menu utama jika dashboard sudah punya drill-down | Navigasi lebih ringan; reports menjadi detail workspace dari dashboard/finance cockpit. |
| 260 | `usePaymentUrgency.ts` menjadi pola resmi zero-cost intelligence | Pola hook deterministic dipakai untuk domain lain sebelum LLM. |
| 261 | Tier 0 intelligence hooks diprioritaskan sebelum AI/LLM | Biaya nol, deterministic, auditable, dan bisa langsung terasa cerdas. |
| 262 | Tier 0 candidate hooks: `useBusinessHealthScore`, `useTenantRiskProfile`, `useCashflowForecast`, `useOperationalStressIndex`, `useMeterAnomalyDetector` | Dashboard dan portal bisa terasa lebih AI-like tanpa backend baru. |
| 263 | `SmartCopyEngine` dibuat sebagai template engine kondisional, bukan LLM | Copy role-specific dan tenant-friendly bisa konsisten tanpa biaya. |
| 264 | AI/LLM hanya boleh on-demand lewat klik eksplisit | Tidak ada AI call saat page load; user yang tidak klik = zero cost. |
| 265 | Semua `/api/ai/*` wajib memakai cache dan rate limit | Melindungi biaya dan mencegah spam klik. |
| 266 | Prompt AI harus pendek dan output JSON kecil | Biaya dan latency ditekan; hasil mudah dipakai UI. |
| 268 | Math/rule first, AI later | Jika bisa dihitung dengan if/else atau formula, tidak boleh memakai LLM. |
| 273 | Balance sheet harus dipersiapkan sebelum formal accounting ratios dibuka | Current ratio, quick ratio, D/E, ROCE tidak boleh fake. |
| 274 | Deposit held wajib diperlakukan sebagai liability, bukan revenue | Finance report tidak boleh salah membaca deposit sebagai pendapatan bersih. |
| 276 | Formal ratios tetap locked sampai cash/bank, liability, equity, dan capital employed reliable | UI harus menjelaskan data apa yang belum tersedia. |
| 280 | AI tidak boleh melakukan autonomous mutation | AI hanya memberi saran/ekstraksi; admin/user tetap eksekutor aksi. |

## Active Business Decisions

1. `core` monolith owns all Stay lifecycle writes.
2. Room status/occupancy writes remain core.
3. Tenant can create/view requests/submissions only.
4. Renew approval/execution remains core.
5. Checkout final remains core and is blocked by open invoice.
6. Payment approval remains core.
7. Marketing/public is read-only.
8. Staff is operational/read-heavy plus bounded field reporting.
9. Owner-api deferred.
10. Multi-app only after monolith gates pass.
11. Assistant is rule-based by default.
12. AI/LLM is on-demand only.
13. Finance ratios require balance-sheet-grade data.
14. Backend/schema work is allowed only through bounded PLAN/ACT and migration-safe flow.
15. PowerShell only for commands.
16. Invoke-RestMethod only for API tests.
17. Tenant audit next must be PLAN first.


## Active Business Decisions — V5.20 Addendum

18. Room priority follows first valid approved payment, not first booking.
19. Booking/request alone does not lock the room.
20. Tenant payment UX must be one-step Bayar & Kirim Bukti.
21. Booking/payment/admin review deadlines must be 3–6 hours maximum except staff tickets.
22. Tenant debt/hutang is not allowed.
23. Late current tenant may lose renewal right if a new valid tenant takes the room.
24. Late current tenant must vacate within 3 hours when the business rule is triggered.
25. AutoOps may auto-cancel expired unpaid booking but must not approve sensitive flows.

## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 352 | Backend clean source snapshot untuk ACT adalah `backend_latest_for_accounting_act_CLEAN.zip` | Menghindari patch dari ZIP lama setelah local working tree memiliki banyak perubahan. |
| 353 | ACT B1 dinyatakan READY hanya untuk additive-only Accounting Foundation | Patch boleh besar tetapi tidak boleh menyentuh flow sensitif. |
| 354 | ACT B1 wajib menambah COA, CashAccount, AccountingPeriod, OpeningBalance, JournalEntry/Line | Ini pondasi minimal sebelum formal statement. |
| 355 | AccountingModule baru boleh dibuat di monolith stabil | Tidak ada multi-app split atau service-to-service HTTP. |
| 356 | Existing payment/stay/checkout/renew/booking/invoice-payment flow tidak boleh disentuh di B1 | Mengurangi risiko regression pada lifecycle dan finance core. |
| 357 | Auto-posting journal ditunda setelah readiness/cutover jelas | Mencegah double posting dan salah hitung data lama. |
| 358 | Existing reports harus diberi label `OPERATIONAL_APPROXIMATION` sampai ledger-ready | Menghindari P&L/ratio/balance sheet fake. |
| 359 | Balance Sheet endpoint baru harus return `ready=false` jika readiness belum lengkap | Tidak boleh mengklaim laporan formal sebelum COA, opening balance, journal, dan cash account siap. |
| 360 | TenantDepositLedger tidak masuk B1 | Deposit ledger menyentuh lifecycle dan harus menjadi batch terpisah. |
| 361 | Field deposit di `Stay` tidak boleh dihapus/deprecate dalam roadmap dekat | Field tersebut masih menjadi operational snapshot yang dipakai banyak flow. |
| 362 | Asset register, depreciation, ancillary generic sale, owner equity masuk batch setelah foundation | Menjaga ACT B1 tetap aman dan fokus. |
| 363 | PASS tidak boleh diklaim tanpa build + smoke + ZIP final | Status verifikasi harus jujur. |

## 2026-05-25 — V5.24-B2/C Accounting + Admin UI Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 364 | Opening Balance POSTED menjadi starting point accounting resmi | Trial Balance dan Balance Sheet guard mulai punya angka awal. |
| 365 | Posting opening balance membuat JournalEntry `OPENING_BALANCE` | Ledger tidak hanya menyimpan batch, tetapi juga journal pembuka. |
| 366 | Trial Balance tidak boleh double-count opening balance | Jika JournalEntry opening sudah ada, OpeningBalanceLine tidak dihitung ulang. |
| 367 | Draft opening balance boleh di-void | Data UAT/draft salah bisa dibersihkan tanpa DB reset. |
| 368 | Opening balance POSTED tidak boleh di-void tanpa reversal plan | Mencegah perubahan ledger historis tanpa jejak koreksi. |
| 369 | Accounting readiness 100% bukan izin auto-posting operasional | Invoice/payment/expense/stay belum auto-journal sampai B3. |
| 370 | Generated Prisma tetap tidak boleh ikut commit | Build lokal perlu generate, tetapi commit harus restore generated noise. |
| 371 | GlobalSearch wajib tersedia untuk admin | Admin perlu cari tenant/kamar/invoice dari mana saja. |
| 372 | Tombol dashboard ticket `DONE` tidak boleh misleading | Harus close benar atau masuk review/close flow yang jelas. |
| 373 | `StaysPage` filter tidak boleh hardcoded ACTIVE saat UI bilang ALL | UI filter harus jujur terhadap query. |
| 374 | AncillaryRevenuePage harus memisahkan fitur aktif dari roadmap | Future items tidak boleh terlihat seperti action aktif admin. |
| 375 | Sidebar tetap primary admin navigation untuk sekarang | RoleWorkspaceTabs tidak dihidupkan sebagai top nav tanpa keputusan baru. |
| 376 | Next recommended phase adalah V5.24-D Admin UI Architecture + Performance Hardening | Selesaikan sisa audit UI sebelum B3 auto-journal kecuali user override. |