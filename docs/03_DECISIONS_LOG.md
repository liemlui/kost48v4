# KOST48 V5 — Decisions Log
**Versi:** 2026-05-26 V5.28-B8 Pushed + Next Plan B9


## 0.0 Latest Current State — V5.28-B8 Pushed + Next Plan B9

```text
Current GitHub latest commit:
286e512 fix(accounting): block manual edits in closed period governance

Recent accounting release chain:
a72eabe fix(accounting): balance sheet contra asset presentation
182057b feat(accounting): add fixed asset ledger alignment workflow
ff2008f feat(accounting): add period close retained earnings workflow
5c38672 feat(accounting): add closed period governance workflow
286e512 fix(accounting): block manual edits in closed period governance

Status:
- main is pushed to origin/main through 286e512.
- Working tree is clean: ## main...origin/main.
- V5.27-B7 Period Close + Retained Earnings runtime UAT PASS.
- V5.28-B8 Closed Period Governance + Reopen/Reversal runtime UAT PASS.
- Accounting period 2026-05 was closed, reopened through CLOSING_REVERSAL, then re-closed as JE-CLOSE-2026-05-V2.
- Duplicate close after re-close is blocked with "Accounting period 2026-05 sudah CLOSED."
- Trial Balance after re-close: Debit 34.170.000 = Kredit 34.170.000.
- Balance Sheet after re-close: Assets 29.915.000 = Liabilities + Equity 29.915.000; difference 0.
- P&L remains operational/readable after close/reopen because CLOSING_ENTRY and CLOSING_REVERSAL are excluded by default.
- Generated Prisma was restored before commit; do not commit backend/src/generated/prisma unless explicitly decided.
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
PLAN V5.29-B9 — Accounting Data Quality & Statement Command Center Hardening

Why:
B1-B8 moved KOST48 from operational finance into a ledger-backed accounting foundation:
- COA, cash account, accounting period, opening balance, journal entry/line.
- Auto journal visibility, statement lite, deposit/reversal visibility.
- Asset register, depreciation, fixed asset ledger alignment.
- Period close to Retained Earnings.
- Closed period governance with reopen/reversal and re-close versioning.

Remaining gap:
Owner/finance UI now needs a stronger statement command center and audit/data-quality layer so the numbers are readable, explainable, and safe for business use. Some older UI copy/checklist wording still says "B1/B2" or "no auto-posting" and should be refreshed so docs/UI do not confuse the owner.

B9 should be frontend-first with small backend read-only additions only if needed.
```

### Source-of-truth note

```text
This section supersedes old V5.24-C/V5.24-D top-of-file state.
Older sections below remain as historical record, not the current release state.
For coding, inspect the latest repo/ZIP first. If docs and code differ, write "docs/code out of sync" and follow real code.
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
