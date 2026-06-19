# KOST48 V5 — Checklist Eksekusi Aktif (changelog → M11)

> **Pintu masuk AI eksekutor.** Versi: **2026-06-18**. Arsip dokumen root lama: `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Cara pakai (AI eksekutor — baca sebelum coding)

1. **Orientasi:** mulai dari bagian [ANTRIAN EKSEKUSI AKTIF](#antrian-eksekusi-aktif-untuk-ai--kerjakan-dari-sini) di file ini.
2. **Spesifikasi domain:** buka M-file yang ditunjuk fase/task (`M01`-`M09`) dan audit MD pendukung bila disebut di tabel rujukan.
3. **Anchor kode:** grep **nama simbol/fungsi** di `backend/src` / `frontend/src` — **JANGAN** edit baris dokumen secara buta.
4. **1 task = 1 commit** (Bahasa Indonesia: `fix:`/`feat:`/`ui:`/`ops:`). Lalu centang `[x]` di sini + 1 baris di `docs/M11_CHANGELOG.md` (paling atas).
5. **Gate build:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`. Task **uang** WAJIB juga `cd backend; node --test "test/**/*.test.js"` + gate di `docs/M04_KEUANGAN.md`.
6. **DB dev:** postgres **5433** `kost48_v3_pro` · reseed: `node scripts/seed-dev-reset.js` lalu `node scripts/seed-dev-via-api.js`.
7. **Larangan:** no npm dep baru · no `schema.prisma` tanpa approval owner (🧬) · no `git push` · no sentuh file milik AI lain (`git status` dulu).

### Status ringkas (2026-06-20)

| Blok | Selesai | Terbuka | Catatan |
|------|---------|---------|---------|
| Fase A — Pra-Go-Live | sebagian | F1-12 🧑 | Kode inti siap; publish nyata menunggu server/domain/env owner |
| Fase B — Publik & Tenant | **selesai** | — | Public/tenant B1-B5 selesai; aset publik/brosur kini bisa dikelola dari Owner Settings (2026-06-19) |
| Fase C — Owner/Admin | **selesai** | — | Mode-aware UI, route split/guard, status cards, inventaris shell SEMUA selesai (2026-06-19) |
| Fase D — Staff & Gudang | **selesai** | — | Meter status, theme, WiFi order, tip flow, gudang FK, role scope SEMUA selesai (2026-06-19) |
| Fase E — Polish & Teknis | **selesai** | — | TEN-GAMIF privacy, split auto-ops & stays, integration test, E2E Playwright, evaluasi arsitektur ✅ |
| Fase F — UI/UX Sweep | **selesai** | — | UX-404 (NotFoundPage), UX-TOAST (ToastProvider), UX-A11Y (SVG password, skip-link), UX-COLOR (kontras AA), UX-LOGOUT (konfirmasi), UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT ✅ |
| Fase G — AI Owner/Admin | **selesai** | — | DeepSeek/API AI berbayar: G0-G9 selesai, tombol manual, draft queue, KTP OCR, budgeting ✅ |
| Fase H — UI/UX Compact | **selesai** | — | Sidebar owner 18→7, dashboard 6→3 tab, merge minat+layanan, polish CSS ✅ |
| Fase I — Navigasi & Onboarding | **selesai** | — | I1-I6 selesai: hapus AdminAreaInternalMenu, unifikasi staff nav via navigation.ts, ekspos /meter-readings, GettingStartedGuide tenant, breadcrumb klik ✅ |
| Fase J — Hardening AI Pra-Go-Live | **selesai** | — | J0-J4 selesai: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP dibukukan di M09 |

### Urutan kerja (jangan loncat kecuali blocked) — detail di [ANTRIAN](#antrian-eksekusi-aktif-untuk-ai--kerjakan-dari-sini)

1. **Fase A — Pra-Go-Live**: owner-blocked, ikuti `docs/M08_DEPLOY_GO_LIVE.md`.
2. **Fase B — Publik & Portal Tenant**: bereskan sisa foto, smart booking, meter status, profil.
3. **Fase C — Workspace Owner/Admin**: mode-aware UI, route split, inventaris shell.
4. **Fase D — Operasional Staff & Gudang**: gudang dinamis, staff meter, WiFi/tip, polish staff.
5. **Fase E — Polish & Teknis**: selesai; jangan ulang kecuali regresi.
6. **Fase F — UI/UX Sweep**: perbaikan aksesibilitas, feedback toast, route 404, kontras, polish (13 temuan audit 2026-06-19).
7. **Fase G — AI Owner/Admin Approval Copilot**: safety foundation → owner brief → finance analyst → payment/expense/KTP/ops assistant → budget observability.
8. **Fase K — Pasca-Audit Total**: ikuti `docs/M16_PASCA_AUDIT_PLAN.md` — 13 task P4–R5 + 31 backlog.
- ✅ Selesai referensi: METER M-5, AUDIT-OWNER, CSS+SWEEP, MKT-4, MKT-5, OWN-STRUKTUR-TOGGLE, AUDIT-KEUANGAN-ULTRA (lihat ANTRIAN → "Selesai Referensi").

### Legenda marker task

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Langkah manusia — STOP & lapor, jangan tebak env/server |
| 🧬 / [SCHEMA] | Perlu migration additive — butuh approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum centang `[x]` |
| **Anchor (grep):** | Simbol entry point — konfirmasi ada sebelum edit |
| **Jangan sentuh:** | File/flow di luar scope (DO-NOT-TOUCH finance) |

---

## Selesai — Sesi 2026-06-16 (referensi, jangan kerjakan ulang)

Detail SI: `docs/archieve/2026-06-16_si_notes/_PLAN_SI_SEWA_RIWAYAT.md` · Meter M-1..M-4: `docs/M06_OPERASIONAL.md` Bagian 5.

- [x] **SI-1** — Seeder DEV event-path: `scripts/seed-dev-reset.js` + `scripts/seed-dev-via-api.js` (20 kamar/16 stay/TB seimbang).
- [x] **SI-2** — Transparansi perpanjangan (portal + admin renew-requests): DP ≤ hari-H, lunas ≤ DP+7.
- [x] **SI-3** — Timeline riwayat sewa: `frontend/src/components/stays/StayHistoryTimeline.tsx` (StayDetailPage + MyStayPage).
- [x] **SI-4** — Badge peruntukan invoice: `frontend/src/utils/invoiceUtility.ts`.
- [x] **G-1** — Poin kebaikan + Top-3 kamar anonim: `MyLoyaltyPage` + `GET /me/loyalty/leaderboard`.
- [x] **T-1** — Tip P2P dasar: `User.tipShopeepay`, tenant "Saya sudah beri tip", `TIP_RECEIVED`, `tipCount` di KPI staf.
- [x] **U-1** — `SegmentedTabs` reusable di filter staf.
- [x] **U-2** — Kartu status besar admin: `AdminHealthChips` di `DashboardAdmin.tsx`.
- [x] **FIX CORS dev** — `backend/src/main.ts`: localhost port fleksibel di dev.
- [x] **MKT-1** — Analisa Pasar AI: modul `backend/src/modules/market-analysis/`, halaman `/market-analysis`, env `DEEPSEEK_API_KEY`.
- [x] **MKT-1b** — Snapshot data nyata ke prompt AI: `GET /market-analysis/snapshot`.
- [x] **MKT-2** — `FreeRepairPolicyCard` + `RenewalCrossSellCard` (MyTicketsPage, MyManualPage, MyStayPage).
- [x] **MKT-3** — Survei kepuasan: modul `surveys`, `SatisfactionSurveyCard`, ringkasan di MarketAnalysisPage.

## Bagian 1 - `docs/08_CHECKLIST.md`

### KOST48 V5 — Checklist Eksekusi (untuk AI eksekutor)
**Versi:** 2026-06-13 — pasca audit V3 + 84 keputusan owner + restruktur domain-dossier. Versi lama → `archieve/CHECKLIST_V5100_STALE.md`.
**Cara pakai:** kerjakan task BERURUTAN dari atas. Tiap task tunjuk **dossier** tempat spesifikasi LENGKAP (aturan + lokasi kode + cara fix + UAT). Centang `[x]` saat selesai + verifikasi.
**Audit ulang 2026-06-14:** `[x]` hanya berarti seluruh lingkup task/dossier sudah terpenuhi. Implementasi parsial tetap `[ ]`; verifikasi runtime yang secara eksplisit dipindahkan ke gate terpisah (mis. F1-12) tidak membuka kembali task implementasinya.

#### 🤖 PROTOKOL AI EKSEKUTOR (baca tiap mulai)
1. Baca `docs/M01_MASTER.md` (orientasi) → task terbuka di [ANTRIAN](#antrian-eksekusi-aktif-untuk-ai--kerjakan-dari-sini) → buka **M-file** dossier yang ditunjuk.
2. **ANCHOR = PETUNJUK AWAL, bukan kebenaran.** Konfirmasi via **grep nama fungsi/simbol** di kode, baru edit.
3. Kerjakan **1 task = 1 commit**. Backend: `cd backend; npx tsc --noEmit` = 0. Frontend: `cd frontend; npm run build`.
3b. **Task KEUANGAN** WAJIB gate `docs/M04_KEUANGAN.md`: `node --test "test/**/*.test.js"` hijau + invarian TB. `tsc 0` saja tidak cukup.
4. Commit Bahasa Indonesia. Centang `[x]` + 1 baris di `docs/M11_CHANGELOG.md`.
5. **Jalan otonom** untuk task tanpa 🧬/🧑. **STOP & lapor** bila: simbol tidak ketemu / error 2× / butuh `npm install` / schema belum approve / langkah owner / konflik `git status`.

#### 🚫 LARANGAN MUTLAK
- JANGAN tambah dependensi npm. JANGAN ubah `schema.prisma`/`sql/` tanpa approval owner. JANGAN `git push`. JANGAN sentuh file milik AI lain.
- JANGAN PowerShell `Get-Content`/`Set-Content -Encoding utf8` untuk docs massal (rusak UTF-8).
- JANGAN ubah logika payment/auto-ops/accounting di luar yang diminta task.

#### ⚠️ KONTEKS PENTING
- **Sistem BELUM publish** — DB testing, deploy = FRESH. **1 staf** — round-robin/leaderboard dorman otomatis. **Tenant = pengawas staf.** Bayar tunai+transfer. Lokasi: Surabaya Barat.
- Keputusan owner: `docs/M02_KEPUTUSAN_OWNER.md`.

> **Arsip di bawah (Fase 1–5, UI sesi 16 Jun):** historis selesai. AI **tidak perlu** mengerjakan ulang kecuali regresi. Langsung ke [ANTRIAN](#antrian-eksekusi-aktif-untuk-ai--kerjakan-dari-sini).

---
#### FASE 1 — SEBELUM DEPLOY (uang & laporan benar) — WAJIB tuntas dulu
- [x] **F1-0** Koreksi alamat docs → Surabaya Barat (SELESAI 2026-06-13).
- [x] **F1-T** 🛡️ SABUK PENGAMAN TERPASANG (SELESAI 2026-06-13) — `backend/test/unit/pricing.test.js` + `periode.test.js` dibuat (kode dari `05 §3`, nilai diverifikasi vs kode), script `test:unit` ditambah. **6/6 test hijau** via `npm run build && npm run test:unit`. Baseline finance terkunci. Catatan: `node --test test/` GAGAL di Node 22/Windows → pakai `node --test "test/**/*.test.js"`.
- [x] **F1-1R** No-partial menyeluruh (SELESAI 2026-06-13) — gate dua-nominal direplikasi di `approveSubmission` (booking: DP-persis/pelunasan-persis; invoice-only: lunas penuh) + `createSubmission` invoice-only `!==`→409 + `invoice-payments` create/update manual wajib lunas penuh. tsc 0, unit 6/6 hijau, logika dicocokkan vs skenario emas 05 §5. ⏳ runtime rekonsiliasi/skenario-emas → gate pra-deploy F1-12.
- [x] **F1-2** Guard remove/update payment OCCUPIED (SELESAI 2026-06-13) — helper `assertStayNotOccupiedForPaymentMutationTx` dipanggil di `invoice-payments` update+remove (dalam tx, sesudah lock): 409 bila `initialMetersPromotedAt!=null` ATAU room OCCUPIED (walau tanpa jurnal); booking RESERVED tetap bisa. tsc 0.
- [x] **F1-3** Perbaikan cashflow (F-01/05/19/20) (SELESAI 2026-06-14) — dossier **13 §6**. `cashflow-classifier.ts` mengklasifikasikan **setiap baris kas sekali** dan menyimpan inflow/outflow bruto terpisah per `sourceType`; transaksi masuk dan keluar dengan sumber sama tidak lagi saling dinetkan. Kas via `cashAccountId`/prefix `10` (bukan `11`=AR), beginning=opening+Σ mutasi kas sebelum periode, ending=beginning+net. Regression `cashflow-gross.test.js` membuktikan deposit masuk 500.000 dan keluar 200.000 tetap tampil bruto dengan net 300.000. Backend build dan total unit test 26/26 hijau. ⏳ runtime skenario emas → gate pra-deploy F1-12.
- [x] **F1-4** Rasio (F-02 presedensi + F-18 kas/inventory) (SELESAI 2026-06-13) — dossier **13 §7** (before→after). Helper `financial-ratios.helper.ts`: expenseRatio presedensi diperbaiki (beban1jt/rev4jt=**25**), kas prefix '10' (bukan '11'=AR), inventory '12' (bukan '14'), currentLiab ['20','21','22','23'] (termasuk deposit 2000). tsc 0, `financial-ratios.helper.test.js` 12/12 hijau. ⏳ runtime → F1-12.
- [x] **F1-5** Deposit = kewajiban lancar (F-03) (SELESAI 2026-06-13) — currentLiabilities di `financialRatios` sudah pakai `CURRENT_LIABILITY_PREFIXES ['20','21','22','23']` (termasuk deposit 2000) → landed di commit F1-4; currentRatio turun wajar saat deposit HELD. Balance sheet `balanceSheet()` ditelaah: A=L+E benar (6 tipe ter-map, contra ter-net) — F-17 tak bermanifestasi di kode. Tanpa kode baru.
- [x] **F1-6** Occupancy rasio (F-04) (SELESAI 2026-06-13) — `financialRatios` hitung occupancy INLINE (operable=kamar isActive−MAINTENANCE/INACTIVE; huni=stay ACTIVE&promoted) via `occupancyRatePercent()`, ganti `bs.statement?.occupancyRate` yg selalu 0. Konsisten finance.service. tsc 0, test 13/13 hijau. ⏳ runtime occupancy>0 saat ada penghuni → F1-12.
- [x] **F1-7** DRAFT bukan revenue (F-09) (SELESAI 2026-06-13) — `reports.service.ts` (4 agregat revenue) + `finance.service.ts` (5 agregat revenue ber-periodStart) → `status:{notIn:[DRAFT,CANCELLED]}`. TIDAK menyentuh: groupBy countByStatus (butuh DRAFT utk unpaidCount), openInvoice/AR (`notIn[PAID,CANCELLED]`, sengaja termasuk DRAFT per guard checkout). tsc 0, test 13/13 hijau. ⏳ runtime P&L tanpa DRAFT → F1-12.
- [x] **F1-8** Guard settlement deposit (F-24) (SELESAI 2026-06-13) — `postDepositSettlementTx`: TAMBAH cek `journalEntry` sourceType DEPOSIT + sourceId `String(stayId)` + status POSTED (= receipt journal yang kredit 2000); bila tak ada → `skip()` benign. Jurnal settlement TIDAK diubah (DO-NOT-TOUCH §2 patuh). tsc 0, 13/13 hijau. ⏳ runtime: akun 2000 tak saldo debit + `deposit-reconciliation` MATCHED → gate pra-deploy F1-12.
- [x] **F1-9** Deposit bukan operating cashflow (F-10) (SELESAI 2026-06-13) — classifier: sourceType `DEPOSIT` → section `depositLiability` (perubahan liabilitas titipan), keluar dari operating; cashflow() tambah section + netCashflow memuat netDeposit. tsc 0, 13/13 hijau (test deposit→depositLiabilityIn, operatingInTotal=0). ⏳ runtime skenario emas (sewa operating-in, deposit perubahan liability) → F1-12.
- [x] **F1-10** Kunci deposit = `Room.defaultDepositRupiah` (C3) (SELESAI 2026-06-13) — `stays.create` deposit = `room.defaultDepositRupiah ?? 0` (ignore dto); `approveBooking` tak lagi override `depositAmountRupiah` (tetap di snapshot room-default dari createBooking:159). tsc 0, 13/13 hijau.
- [x] **F1-11** Booking expiry 3 jam flat (D-04) — kedua helper booking memakai `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`, default 3 jam (diverifikasi 2026-06-13).
- [x] **F2-8** Matikan endpoint draft jurnal manual (F-22/F-23) (SELESAI 2026-06-13) — `accounting.controller.ts` route `POST journal-entries/draft` kini `ForbiddenException` (403). Tidak ada tombol FE untuk ini (grep: hanya OpeningBalanceWizard = jalur Opening Balance yang sengaja tetap). Opening balance draft terpisah & utuh. tsc 0.
- [ ] **F1-12** 🧑 DEPLOY BERSIH (owner+AI pendamping) — **`docs/M08_DEPLOY_GO_LIVE.md`** · detail sub-task di [ANTRIAN F1-12](#-f1-12--go-live-produksi-blocker-publish). TANPA backfill/migrasi data UAT.
  - [x] **runbook schema+bootstrap REHEARSED** (2026-06-13, DB throwaway 5433): db push 41 tabel + bootstrap.sql+addendum BERSIH (2 uidx + 7 chk + 8 trigger + 231 index); DB di-drop, UAT utuh. ⚠️ **Temuan:** DB fresh tak punya user → tambah langkah #0 buat OWNER pertama (lihat `04_DEPLOY §2`).
  - [x] **DB produksi `kost48_v3` diprovisikan + di-seed** (2026-06-13, lokal-as-prod 5433 karena 5432/VPS tak ada): create+push+bootstrap+addendum → seed OWNER(liem.lui) + COA(37) + periode 2026-06 OPEN + CashAccount Cash(1000)+Bank(1010); opening NOL (mulai nol). Smoke LULUS (login OWNER, public/rooms 200, TB balanced, recon mismatch=0, cashflow depositLiability live). readiness=75 (opening/journal pending = normal zero-start).
  - [ ] **go-live nyata** = menunggu env produksi: jalankan backend di server prod (5432/VPS, NODE_ENV=production, domain+HTTPS) atau pg_dump→restore ke 5432; ganti password OWNER (admin123→real); set opening balance bila ada modal awal.
    - [ ] Konfirmasi target deploy final: VPS/cPanel, domain, HTTPS, PostgreSQL prod 5432, dan env rahasia siap.
    - [ ] Jalankan fresh provision sesuai M08: DB kosong → `prisma db push` → bootstrap/addendum → seed OWNER pertama → seed COA/periode/cash account.
    - [ ] Set env produksi wajib: `NODE_ENV=production`, JWT secret kuat, CORS domain final, VAPID keys, `KTP_ACTIVATION_GATE_ENABLED=true`.
    - [ ] Ganti password OWNER dummy/dev menjadi password real sebelum dipakai owner.
    - [ ] Isi opening balance hanya jika ada modal/saldo awal nyata; kalau mulai nol, dokumentasikan keputusan zero-start.
    - [ ] Smoke test prod: login OWNER, public rooms 200, create booking dummy kecil bila aman, trial balance balanced, readiness tidak ada blocker merah.
    - [ ] Catat hasil go-live di changelog dan update status F1-12.

#### FASE 2 — PASCA DEPLOY (flow & model)
- [x] **F2-1** [BESAR][SCHEMA] Renewal DP penuh (GAP #2) — dossier **11 §5** · **schema approved S-1 (2026-06-13)**. **DIAUDIT ULANG DAN DIPERBAIKI 2026-06-14.** Renewal kini benar-benar dua fase: DP harus `PAID`; admin mencatat meter dan menerbitkan invoice pelunasan (`settlementInvoiceId`) tanpa mengubah periode stay; tenant membayar lewat proof flow; hanya invoice pelunasan `PAID` dalam H+7 yang boleh memfinalkan stay dan status `COMPLETED`. Endpoint direct-renew dinonaktifkan agar gate ini tidak dapat dilewati. Penolakan `AWAITING_DP` membatalkan invoice belum bayar beserta reversal jurnal; setelah `DP_SECURED` tidak boleh ditolak sembarang. Frontend tenant/admin menyediakan keputusan YA/TIDAK, konfirmasi DP, penerbitan pelunasan, tautan invoice, dan finalisasi. Prompt H-10, fallback portal, serta kebijakan FORFEITED manual tetap berlaku. Backend/frontend build lulus; regression renewal masuk total unit test 26/26 hijau.
  - [x] **inc.1 schema** — RenewRequestStatus +7 status serta field DP/deadline dan `settlementInvoiceId`; migration additive tersedia dan Prisma client sudah digenerate.
  - [x] **inc.2a service state machine CORE** (DIPERBAIKI 2026-06-14) — `confirmDownPayment` memakai `paidAt` faktual dari invoice PAID, bukan tanggal input admin. `approveRequest` fase pertama hanya menerbitkan pelunasan; fase kedua baru `COMPLETED` setelah invoice pelunasan PAID dan tepat waktu. Periode stay dikunci terhadap periode invoice untuk mencegah stale finalize.
  - [x] **inc.2b invoice DP + PELUNASAN TERPISAH** (DIPERBAIKI 2026-06-14) — DP dan sisa sewa/utilitas memiliki invoice terpisah; `settlementInvoiceId` tersimpan di request. Payment submission terlambat ditolak pada create maupun approve. Publikasi kamar TIDAK/EXPIRED tetap via flow checkout normal sesuai keputusan owner.
  - [x] **inc.3 sweeper renewal** (SELESAI 2026-06-14) — EXPIRED_PRIORITY + pembatalan/reversal invoice belum-bayar SUDAH. FORFEITED = flag+notif admin — forced checkout & potong deposit = **MANUAL admin** (keputusan owner hibrida 2026-06-14, SENGAJA override R5 auto). BUKAN bug.
  - [x] **inc.4 notif siklus renewal** (DIPERBAIKI 2026-06-14) — create→admin, decide YA→tenant, decide TIDAK→admin, confirm DP→tenant, terbit pelunasan→tenant, finalisasi PAID→tenant, reject→tenant; sweeper EXPIRED→tenant dan FORFEITED→admin. Best-effort tidak menggagalkan transaksi. Regression keselamatan renewal termasuk dalam unit 26/26.
- [x] **F2-2** Notif renew (SELESAI 2026-06-14) — notif request/keputusan/DP/approve/reject/EXPIRED/FORFEITED ✅ (F2-1 inc.4). **Prompt H-10** kini ada (`runContractEndReminders` REMINDER_DAYS `[10,7,3,1,0]`, horizon +10) + **fallback ADMIN** untuk tenant tanpa akun portal (`notifyAdminsTenantNoPortalContract`, dedupe harian). **✅ UAT:** stay H-10 → notif tenant; tenant non-portal → notif 3 admin (via `POST /auto-ops/run/contract-reminders`). tsc 0.
- [x] **F2-3** Copy A17 dua-varian (loser sudah-transfer vs belum) (DIPERBAIKI 2026-06-14) — `hasTransferred` hanya benar untuk submission `PENDING_REVIEW`/`APPROVED` atau nilai DP terbayar; submission `REJECTED`/`EXPIRED` tidak lagi menghasilkan klaim refund palsu.
- [x] **F2-3b** 🧬 Catat refund kalah-cepat di sistem (DIPERBAIKI 2026-06-14, schema owner-approved) — auto-set `PENDING`+nominal hanya dari transfer yang masih valid. OWNER endpoint proses refund kini **wajib** menerima `proofUrl` atau `proofFileKey`; frontend juga memblok submit tanpa bukti. Regression membuktikan refund tanpa bukti ditolak dan tidak mengubah data. Backend/frontend build lulus; unit 26/26.
- [x] **F2-5** Konsolidasi util + tutup ghost-stock (X-03) (DIPERBAIKI 2026-06-14) — helper stok tetap memakai `FOR UPDATE` di transaksi. `generateTicketNumberTx` kini memakai PostgreSQL transaction advisory lock per tahun sebelum menghitung sequence dan melewati nomor yang sudah terisi; semua caller, termasuk `tickets.service`, menjalankannya di dalam transaksi. Regression membuktikan lock dipanggil dan sequence occupied dilewati. Backend build dan unit 26/26 lulus.
- [x] **F2-6** Auto-tiket inspeksi saat cancel stay promoted (B-08) (SELESAI 2026-06-14) — `stays.cancel()`: bila `wasPromoted` & tak ada tiket inspeksi terbuka → buat CHECKOUT_INSPECTION, dedupe via openCleaningTicket. **✅ UAT runtime LULUS** (DB UAT): cancel stay 1 (promoted, room OCCUPIED) → stay CANCELLED + room **MAINTENANCE** + tiket **TIC-2026-CHK-1** (CHECKOUT_INSPECTION, OPEN) + invoice ter-reversal → **trial-balance balanced**.
- [x] **F2-9** KPI tiket double-count (K-6) (SELESAI 2026-06-14) — `staff-performance.service.ts` `ticketsDone` kini disaring `resolvedAt` ∈ bulan (bukan sekadar status DONE/CLOSED dari query ber-OR resolvedAt/updatedAt/createdAt). Tiket lama yg cuma di-update bulan ini tak lagi ikut terhitung selesai → hilangkan dobel-hitung lintas bulan. Berdampak benar ke positiveValue/proofRequired/missingTicketProof. tsc 0 · unit 13/13. (UAT: koreksi kalkulasi, tanpa fixture lintas-bulan.)
- [x] **F2-16** Perketat OWNER-only (D-17) (SELESAI 2026-06-14) — 4 area OWNER-only, ADMIN→403: **(a) periode** akuntansi (sudah OWNER: create/update/reopen/close/post/opening-balance); **(b) user/staf** `users` create+update→OWNER (cegah ADMIN nonaktif user & eskalasi `role`); **(c) setelan kamar & harga** `rooms` create/update/facilities(CRUD)/upload-image→OWNER; **(d) deposit/refund** `stays :id/deposit/process`→OWNER. GET (baca) tetap. **✅ UAT LULUS**: ADMIN 403 di 7 endpoint, OWNER lolos guard (400/404). tsc 0. Scoping: `tenants :id/portal-access/status` (suspend portal TENANT) dibiarkan OWNER+ADMIN (moderasi tenant level-rendah, bukan akun privileged); ubah bila owner mau OWNER-only.
- [x] **F2-18** Model tenant-pengawas (SELESAI 2026-06-14) — enum `PENDING_VERIFICATION` + guard keselamatan room-ready ada. **Guard kategori STAFF SUDAH ditambah (2026-06-14):** `tickets.service.close()` menolak STAFF utk kategori ≠ `CHECKOUT_INSPECTION` (ForbiddenException) sesuai invarian dossier 15. **✅ UAT:** STAFF close #1(non-inspeksi)→403; STAFF close #13(CHECKOUT_INSPECTION)→409 (guard lolos, status OPEN≠DONE); OWNER close #1→409 (tak dibatasi). **Workflow verifikasi PENDING_VERIFICATION SUDAH (2026-06-14):** review tenant rating **≤2 → PENDING_VERIFICATION** (tak tampil & TAK dihitung KPI sampai diverifikasi — buildSummaryForStaff hanya hitung VISIBLE); owner `GET /tenant/staff-reviews/pending-verification` + `POST /:id/verify {APPROVE→VISIBLE | DISMISS→HIDDEN}` (OWNER-only, set `moderatedById`). Rating >2 langsung VISIBLE. **✅ UAT:** rating-2→PENDING; owner list✓; ADMIN verify→403; owner APPROVE→VISIBLE; re-verify→409. tsc 0. (Perluasan "cakupan review fasilitas/admin" = fitur terpisah di luar model tenant-pengawas-STAFF; ditunda ke F3+.)
- [x] **F2-11** Performa publik (SELESAI 2026-06-14) — **V-1** 4 halaman publik lazy/code-split; **W-02** skeleton katalog (grid `SkeletonBlock` saat load) + detail loading; **W-03** paginasi 12/halaman di `PublicRoomsPage` (kontrol prev/no-halaman/next, reset saat filter berubah); **UD-05** sticky CTA detail (`room-detail-mobile-sticky`). `npm run build` LULUS (94 chunk, PWA verify ok). (UD-06 grid tablet: `Col xl=4 md=6` sudah responsif 2-kolom tablet.)
- [x] **F2-12** Sinyal tiket + aging (F-21/F-27) (SELESAI 2026-06-14) — `finance.service.ts`. **F-21:** `highSignalTickets` pakai kategori nyata `['EMERGENCY','SECURITY']` (dulu `['URGENT','HIGH','EMERGENCY']` invalid → throw → ditelan `.catch(()=>0)` = sinyal mati); catch dibuang. **F-27:** aging/overdue di `businessHealth` & `ownerDashboard` kini `$queryRaw` SISA = `total − Σ pembayaran` (invoice PARTIAL tak dihitung penuh). **✅ UAT runtime LULUS:** kedua endpoint 200; tiket EMERGENCY OPEN → alert `ticket-high-signal` count=1 (terbukti hidup); owner-dashboard overdue 6/Rp994.250. tsc 0 · unit 13/13.
- [x] **F2-14** Timezone WIB (F-25/E-6) (SELESAI 2026-06-14) — `accounting-posting-helpers.dateOnly`, `staff-performance.monthRange`, **dan `staff-routines.startOfLocalDate`** (juga `parseDate` lewatnya) kini hitung tanggal WIB (UTC+7) sbg UTC-midnight, bebas timezone server (cPanel UTC). `getDate()/getDay()/formatDateKey` tetap membaca tanggal kalender WIB di server UTC maupun WIB (geseran 0–7 jam tak lewat hari). tsc 0; `getToday` tanpa regresi (server WIB hasil identik; fix berdampak di server UTC).
- [x] **F2-17** Notif booking-dibatalkan-sweeper (E3) (SELESAI 2026-06-14) — `auto-ops`: helper `notifyTenantStayCancelled` dipanggil **DI LUAR tx** (best-effort) setelah pembatalan sukses di `cancelEndedUnpaidStay` (noon-release/H+1/DP-forfeit) & `expireBookingTx` (booking-expiry). Tenant tanpa akun portal → di-skip. **✅ UAT LULUS** (stay manufaktur 22): sweeper batalkan → stay CANCELLED + room AVAILABLE + tenant terima "Booking dibatalkan otomatis". tsc 0.

#### FASE 3 — OPERASIONAL & VISIBILITAS
- [x] **F3-1** Notif coverage 5 event + K-8 penerima (SELESAI 2026-06-14) — dossier **16**. **ticket-assign→assignee** (notif saat assignee berubah, skip self-assign); **K-6/K-8** BARANG_PINDAH closed → notif ke **staf assignee** (dulu keliru `actor.id`) di LUAR tx; **room-ready** CHECKOUT_INSPECTION close → kamar AVAILABLE → notif OWNER/ADMIN (dedupe `createOnce`). **wifi-order** = lewat WhatsApp (`WifiOrderPage`), tak ada event in-app. sweeper-cancel sudah di F2-17. Terisolasi di `tickets.service.ts`, tsc 0 utk file ini. (build penuh tertunda: WIP renewal agen lain di tree.)
- [x] **F3-2** Inbox admin payment-submitted — **SELESAI 2026-06-14** · setelah submission commit, semua OWNER/ADMIN aktif menerima notifikasi dedupe berisi tenant, nominal, invoice, kamar, dan deep-link `/payment-submissions/review`; kegagalan notifikasi tidak membatalkan submission. **UAT rollback real DB:** 3 penerima aktif menghasilkan tepat 3 notifikasi meski helper dipanggil dua kali, residu 0.
- [x] **F3-3** SEO dasar — **SELESAI 2026-06-16** (L-5 + Wave 2). Lighthouse SEO **100/100** (home, build dist). OG/Twitter, JSON-LD, canonical, robots, sitemap ada di guest pages. **Gate ulang** hanya setelah re-theme publik (lihat PUB-UI-REVAMP).
- [x] **F3-4** Social proof home (D-09) — **SELESAI 2026-06-14** · endpoint publik hanya mengekspos ulasan visible rating≥4, agregat rating, inisial tenant, dan count penghuni aktif terpromosi. Guest page menampilkan statistik serta ulasan terbaru. **UAT real DB:** 11 penghuni aktif, 0 ulasan visible; build backend/frontend lulus.
- [x] **F3-7** Occupancy heatmap (D-15: historis+berjalan+depan) — **SELESAI 2026-06-14** · endpoint owner `/api/reports/occupancy-daily?from&to` dan kalender CSS-grid 12 bulan historis + 3 bulan proyeksi tersedia. Checkout aktual bersifat eksklusif; planned checkout dipakai untuk proyeksi. **UAT real DB:** 14 hari, 19 kamar operasional, occupied≤operable; unit test boundary lulus.
- [x] **F3-9** Hierarki laporan (SELESAI 2026-06-14) — dossier **13**. **F-11** badge tier `ReportSection` (≈ Estimasi default utk laporan operasional /reports; ✓ Formal utk jurnal) + banner hierarki yang mengarahkan ke tab "Laporan Formal". **F-12** filter unmapped tetap via gate `fetchFormalRatiosReadiness`/`LockedFormalRatios` yang sudah ada (formal terbuka hanya saat ter-map, konsisten readiness). `frontend npm run build` LULUS (95 chunk). (F-31 pembulatan = F4-10, terpisah.)
- [x] **F3-10** Higiene jurnal (SELESAI 2026-06-14) — dossier **13**. ✅ **race P2002**: 7 entrypoint posting ber-tx-sendiri dibungkus `runIdempotentPosting` (P2002 di LUAR tx → diperlakukan sudah-terposting; catch-in-tx tak mungkin krn Postgres meng-abort tx). **entryNumber suffix VOID = N/A** (tak ada jalur journalEntry→VOID di kode; reversal bikin ADJUSTMENT baru). **forfeit entryDate** sudah benar (sweeper post saat kejadian → `new Date()` = tanggal kejadian). tsc 0 · unit 26/26.
- [x] **F3-11** Lead source dropdown + foto via config (SELESAI 2026-06-14) — dossier **17**. **M-08 sudah ada**: check-in wizard admin punya dropdown `bookingSource` 10 kanal + backend simpan `bookingSource/Detail` + filter query → CAC terukur (booking publik tetap WEBSITE = benar). **M-04**: ~76 foto marketing dipindah dari service ke `marketing/marketing-room-images.config.ts` (perilaku identik). tsc 0.
- [x] **F3-12** Paket chart (SELESAI 2026-06-14, kecuali V-7) — dossier **17**. ✅ **V-5** palet Okabe-Ito colorblind-safe terpusat (`chartPalette.ts` → SmartChartPanel/HorizontalBarChart/DonutGauge/PaymentReview); ✅ **V-2** count saat n<5 di donut "Level Risiko"; ✅ **V-6** kontras teks tengah DonutGauge (dark mode); ✅ **UD-07** filter "Semua"→"Semua Kamar"+hint; ✅ **V-3/UD-04** sudah ada (empty-state SmartChartPanel + all-zero OwnerDashboard Audit U-10). **V-7** ditunda (kurangi seri Laba = keputusan UX owner; seri Laba Bersih masih berguna). `frontend npm run build` LULUS (95 chunk, PWA ok).
- [x] **F3-13** Ops-hardening (SELESAI 2026-06-14) — dossier **12/13/16**. ✅ **B-07** forced-checkout overstay kecualikan+batalkan DRAFT (D-03); ✅ **B-12** `stays.update` tolak `plannedCheckOutDate` masa lalu (WIB); ✅ **B-14** reminder kontrak window `<=` + dedupe per gelombang (tahan downtime sweeper); ✅ **N-02** notif pengumuman ditahan bila `startsAt` masa depan; ✅ **B-11** snapshot meter dibuang (rebooking sehari) kini warn-log bila beda nilai (tak lagi diam-diam); ✅ **B-06** sudah teratasi via pemisahan mode `forfeitDownPayment` (A18) — caller non-forfeit tak tulis "DP hangus". tsc 0 · unit 26/26.
- [x] **F3-14** Tombol admin "tenant kabur" (B2) (SELESAI 2026-06-14, schema approved + UAT LULUS) — dossier **12** · DIGABUNG dgn F3-16 jadi `POST /stays/:id/forced-checkout` (reason TENANT_KABUR set `fled*`). Lihat F3-16.
- [x] **F3-15** Lacak barang abandoned 30 hari (B3) (SELESAI 2026-06-14, schema approved) — dossier **12**. Schema `Stay.belongingsStatus/belongingsDeadline/belongingsResolvedAt` + enum `BelongingsStatus`. Deadline=checkout+30hr di `complete` & forced-checkout; sweeper `runBelongingsAbandonment` (PENDING+lewat deadline → ABANDONED + notif admin, dedupe) + endpoint `run/belongings-abandonment`; admin `POST /stays/:id/belongings` (CLAIMED/ABANDONED). tsc 0 · unit 26/26.
- [x] **F3-16** Paksa-checkout overstay nunggak (B4) (SELESAI 2026-06-14, UAT LULUS) — dossier **12**. Gabung F3-14+F3-16: `POST /stays/:id/forced-checkout` (OWNER). Deposit menutup tunggakan (jurnal DR 2000/CR 1100, `postForcedCheckoutDepositSettlementTx`); **deposit kurang → sisa TETAP jadi PIUTANG AR 1100** (bukan write-off); kelebihan deposit refund kas. Guard `guard_stay_deposit_processing` di-carve-out via GUC sesi-tx `app.allow_deposit_with_open_invoices` (processDeposit normal tetap terproteksi). **UAT runtime LULUS 12/12** (stay 8: applied 500k, shortfall 734.200 jadi AR, trial balance seimbang, deposit FORFEITED, ledger net 0). tsc 0 · unit 26/26.
- [x] **F3-17** Upload+verifikasi KTP (E1) (SELESAI 2026-06-14, schema approved) — dossier **18**. Schema `Tenant.ktpImage*/ktpVerifiedAt/ById/ktpDeletedAt`. Upload `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, MIME-sig, folder `uploads/ktp-images`); verify `POST :id/ktp/verify` (OWNER); GET `:id/ktp/image` **OWNER/ADMIN saja** (PDP); gate aktivasi `stays.create` via env `KTP_ACTIVATION_GATE_ENABLED` (default OFF); hapus PDP otomatis saat checkout (no other active stay) + manual `DELETE :id/ktp`. tsc 0 · unit 26/26.
- [x] **F3-18** Expense rutin auto-draft (G-c) — **SELESAI 2026-06-14** · migration menambah status `DRAFT/CONFIRMED/CANCELLED` dan recurring key unik. AutoOps membuat maksimal 6 draft kategori rutin per bulan secara idempotent; draft tidak masuk laporan/jurnal hingga dikonfirmasi. Konfirmasi dan posting jurnal atomik. **UAT rollback:** tepat 6 draft dibuat tanpa residu data.
- [x] **F3-19** SLA tiket + KPI adil (SELESAI backend 2026-06-14) — dossier **15**. Schema `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt`. ✅ `dueAt` per kategori (24j/3h/7h, `ticket-sla.ts`) di-set saat assign pertama; ✅ resolved-time KPI dari `assignedAt` (K-1); ✅ breakdown kategori + `slaOnTime/slaBreached/avgResolutionHours` di staff summary (K-3); ✅ eskalasi `runTicketSlaEscalation` L0→1 ADMIN, L1→2 OWNER (+endpoint `run/ticket-sla`). tsc 0 · unit 26/26. (Tampilan metrik di dashboard FE = polish lanjutan.)
- [x] **F3-20** Auto-prompt review tenant→staf (I-b) — **SELESAI 2026-06-14** · saat tiket tenant ber-assignee STAFF menjadi DONE/CLOSED, tenant portal menerima notifikasi dedupe menuju `/portal/tickets`; kartu `TenantStaffReviewPrompt` menampilkan pekerjaan eligible. **UAT rollback real DB:** dua pemanggilan pada tiket #12 menghasilkan tepat 1 notifikasi, residu 0.
- [x] **F3-21** Depresiasi otomatis bulanan (I-c) — **SELESAI 2026-06-14** · AutoOps menargetkan bulan WIB sebelumnya, menjalankan service depresiasi yang sama dengan proses manual, lalu mencoba accounting auto-close. Idempotent dan aman saat sudah diposting/tidak ada aset eligible. **UAT Juni 2026:** target Mei 2026, safe-skip `NO_ELIGIBLE_ASSETS`.

#### FASE 4 — FUTURE
- [x] **F4-1** 🧬 Unearned revenue PSAK 72 (F-15, sewa panjang) — dossier **13** (SELESAI 2026-06-15, schema S-2 approved). Sewa >1 bulan (SMESTERLY/YEARLY; berbasis N bulan agar reusable F4-11) ditangguhkan ke **2200 Unearned** lalu diakui bertahap **straight-line** per bulan. `RentRecognitionSchedule` + helper `rent-recognition.helper.ts` (unit test) + `RentRecognitionService` (ensure deferral DR 4000/CR 2200 + recognize DR 2200/CR 4000, idempotent) + sweeper `runRentRecognition` + endpoint `POST /auto-ops/run/rent-recognition`. Jalur posting BARU (DO-NOT-TOUCH dihormati). **Invoice/AR tetap 1 penuh di muka**, hanya pengakuan pendapatan yang dibagi. **Finance gate LULUS**: tsc 0 · `node --test` 37/37 · **UAT runtime** (DB 5433): TB seimbang tiap langkah, deferral 6jt→2200, bulan-1 diakui 1jt, idempotent, residu 0.
- [x] **F4-2** PWA Web Push (4 kelompok event J-d) — dossier **16** (SELESAI 2026-06-15, schema S-2 approved). Backend: `PushSubscription` + outbox in-place (`AppNotification.pushStatus/pushAttempts/pushedAt`) + `PushService` (web-push/VAPID) + sweeper `runPushDispatch` + endpoint subscribe/unsubscribe/vapid-key/manual-dispatch. Frontend: service worker push/notificationclick + hook `usePushNotifications` + UI opt-in `PushToggle` di NotificationsPage. **UAT backend LULUS** (no-device→SENT; dead-endpoint retry→FAILED; unsubscribe→deactivate). tsc 0 · frontend build + PWA verify LULUS. ⚙️ Prod: set `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` di env (lihat 04_DEPLOY).
- [x] **F4-7** Pruning notifikasi >90 hari (N-04) — dossier **16** (SELESAI 2026-06-14). `AppNotificationService.pruneOlderThan(90, batch 5000)` + sweeper `runNotificationPruning` di akhir `runAll` (env `NOTIFICATION_RETENTION_DAYS`/`NOTIFICATION_PRUNING_ENABLED`) + endpoint `POST /auto-ops/run/notification-pruning`. **UAT (ROLLBACK):** umur 100hr terhapus, 10hr tetap. tsc 0.
- [x] **F4-8** 🧬 Flow pindah kamar resmi (E4) — (SELESAI 2026-06-15, schema S-2 + 5 keputusan desain owner). `RoomTransfer` (audit) + `RoomTransferService.transferRoom` + endpoint `POST /stays/:id/transfer-room` (OWNER/ADMIN). **Stay SAMA** (roomId diperbarui); **deposit ikut apa adanya**; **harga dikunci** (D-16) kecuali **override OWNER-only** (D-17); **meter kamar baru di-snapshot**; kamar lama→MAINTENANCE+tiket CHECKOUT_INSPECTION; kamar baru→OCCUPIED; notif tenant. **UAT runtime LULUS:** transfer+tarif+tiket+meter+audit; OWNER override harga; ADMIN override→403. tsc 0 · node --test 39/39.
- [x] **F4-9** 🧬 Gamifikasi/loyalitas tenant — dossier **19** (SELESAI 2026-06-15, schema S-2, default poin dossier 19). Schema LoyaltyPoint/LoyaltyReward/Redemption + 3 enum; `LoyaltyService` (award idempotent/balance/history); `RedemptionService` (katalog CRUD + request potong-poin/stok + decide refund/fulfill + **jurnal reward DR 6300/CR 2100 M4**). **4 trigger earn:** RENEWAL(+100), ON_TIME_PAYMENT(+50), VALIDATED_REPORT(+30 tiket PORTAL closed), ONBOARDING_QUEST(+200 profil lengkap). Endpoint tenant `/me/loyalty(+/redemptions)` + admin `/loyalty/rewards|redemptions`. **Frontend:** `MyLoyaltyPage` (saldo+katalog+tukar+riwayat) + `LoyaltyAdminPage` (kelola reward + approve/reject penukaran) + nav tenant/owner/admin. UAT runtime lulus (poin idempotent, redemption TB seimbang, ONBOARDING_QUEST). tsc 0 · node --test 39/39 · FE build+PWA verify. **Ide perluasan → backlog F4-13/F4-14.**
- [x] **F4-10** Standarisasi pembulatan Rupiah (F-31) — dossier **13** (SELESAI 2026-06-14). Helper terpusat `common/business/money.helper.ts` (`roundRupiah`/`rupiahAmount`, tie half-away-from-zero) menggantikan `Math.round` mentah di 8 call-site Rupiah (util/DP/depresiasi/revenue-per-kamar + helper `rupiah` posting). `accounting-period-close` (DO-NOT-TOUCH) sengaja dilewati. tsc 0 · `node --test` 32/32 · UAT TB seimbang + akun 2000 saldo kredit.

#### 🆕 BACKLOG IDE OWNER (schema S-3 approved 2026-06-15)
- [x] **F4-11** Renewal/prabayar fleksibel kapan saja — **SELESAI** (2026-06-15). `PrepayExtensionService.prepayExtension` (`POST /stays/:id/prepay-extension`, OWNER/ADMIN): bayar N bulan ke depan harga bulanan (terkunci D-16), 1 invoice PAID di muka → jurnal issuance+payment+**deferral ke 2200** (PSAK 72) → `recognizeDue` mengakui per bulan (reuse F4-1; `scheduleExtension` periodIndex offset; `postRentDeferralTx` sourceKey per-invoice). Stay diperpanjang. **Finance UAT LULUS** (prabayar 4 bln: kas+4jt, revenue ditangguhkan, unearned 2200=4jt, recognize bulan-1→1jt, **TB seimbang**). + data capture `RenewRequest.prepaidMonths/isEarly` (F4-13a path). Dossier **11/13**.
- [x] **F4-12** FAQ/manual tenant — SELESAI (2026-06-15). `MyManualPage` (/portal/manual) baca FAQ publik per kategori (Accordion). Tanpa schema baru (reuse Faq). Konten dikurasi owner via admin FAQ.
- [x] **F4-13a** Review saat renewal → poin — SELESAI (2026-06-15). `CreateRenewRequestDto.tenantReview` → simpan + award (skor VALIDATED_REPORT +30, idempotent `RENEWAL_REVIEW:id`).
- [x] **F4-13c** Quest perbaikan sikap (peer anonim) — **SELESAI** (2026-06-15, schema S-4). `PeerBehaviorReport`+`PeerReportStatus`: A lapor B → admin moderate (ACKNOWLEDGE notif B **ANONIM**/DISMISS) → B markImproved → konfirmasi (**A atau admin**) → B +40. **Privasi:** reporterTenantId tak diekspos ke reportee. Endpoint tenant+admin; FE: MyLoyaltyPage "Masukan untuk Anda" + LoyaltyAdminPage moderasi. UAT LULUS (award+privasi+CONFIRMED).
- [x] **F4-13-referral** Referral teman → poin — **SELESAI** (2026-06-15, schema S-4). `Tenant.referralCode`+`TenantReferral`+`ReferralStatus`; kode dipakai saat booking publik → `linkReferralTx` (PENDING); sweeper `runReferralRewards` → teman jadi tenant aktif → referrer **+150** → REWARDED. FE: kode referral di MyLoyaltyPage. UAT LULUS.
- [x] **F4-13b** Reward "special request" → tugas staf — SELESAI (2026-06-15). `LoyaltyReward.fulfillmentTaskCategory/Title`; redemption FULFILLED → auto-create tiket staf (UAT LULUS). Admin form set kategori/judul tugas.
- [x] **F4-14** Tip ke staf P2P — SELESAI (2026-06-15). `User.tip*` settable; tenant lihat link tip assignee di tiket DONE/CLOSED (MyTicketsPage). **TIDAK dijurnal/direkap** (P2P, di luar buku kos).
- [x] **F4-15** Penjadwalan cuci AC — SELESAI (2026-06-15). `Room.hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays`; sweeper `runAcCleaningSchedule` (overdue interval → tiket `AC_CLEANING` dedupe) + endpoint manual + reset saat tiket AC ditutup. Biaya cuci → Expense (flow normal). (Estimasi jam dari kWh = refinement; trigger utama interval hari.)

#### ✅ DISIAPKAN, DORMAN saat 1 staf (auto-aktif saat staf ≥ 2 — ide owner 2026-06-15)
- [x] **F2-10** Round-robin penugasan tiket (K-4) — dossier **15** (SELESAI 2026-06-15). `TicketsService.pickStaffAssigneeTx` di `createTicketRecord`: staf=0→none, staf=1→satu staf (dorman), staf≥2→**round-robin berbasis beban** (tiket aktif paling sedikit). Otomatis aktif saat staf bertambah.
- [x] **F3-5** Leaderboard antar-staf — dossier **15** (SELESAI 2026-06-15). `getLeaderboard` (peringkat skor KPI) + `GET /admin/staff-performance/leaderboard` + kartu di AdminStaffPerformancePage; **`active=false` saat staf <2** (tampil catatan; kartu rumus skor per staf TETAP jalan), auto-aktif saat staf ≥ 2.

#### 🔍 TINDAK LANJUT AUDIT FORENSIK (2026-06-15 — `docs/AUDIT_FASE4_FINAL.md`)
**Hasil:** TIDAK ada 🔴 bug baru dari Fase 4; app boot OK (tanpa circular-dep), migration konsisten, trial balance seimbang. Berikut celah/over-confidence yang dicatat:

> ✅ **FASE 5 (tindak-lanjut audit) SELESAI 2026-06-15** — S-5 (schema) + F5-1..F5-8 ter-commit. Tiga task finance (F5-6/7/8) LULUS runtime UAT (trial balance seimbang). Sisa = item docs/go-live/abu-abu non-prioritas (lihat L-2..L-5, AUD-6/7, SINKRON-DOC).

- [x] **AUD-1 🟠 (C-1) → F5-7 SELESAI** Pindah kamar: utilitas **kamar LAMA** kini ditagih lebih dulu (snapshot meter akhir + invoice + jurnal SEBELUM `roomId` pindah). UAT TB seimbang (D-21.1).
- [x] **AUD-2 🟠 (D-5) → F5-2 SELESAI** Tip staf: staf isi e-wallet sendiri via `PATCH /auth/me/tip-info` + kartu di ProfilePage (D-21.2, tetap tak dijurnal).
- [x] **AUD-3 🟡 (C-4) → F5-4 SELESAI** Cuci AC HIBRID: interval hari + pemicu dini kWh (`acUsageHoursPerDay`, unit test 7/7). Form kamar dapat field AC (D-21.3).
- [x] **AUD-4 🟡 (D-4) → F5-1 SELESAI** FAQ operasional di-seed dari aturan/flow; `seed()` idempoten per-pertanyaan (D-22.3).
- [x] **AUD-5 🟡 (C-6) + AC vendor → F5-3 SELESAI** Tiket cuci AC tanpa assignee + penanda vendor (`POST /tickets/:id/vendor`, schema S-5); tiket sistem lain round-robin via util bersama (D-22.2).
- [x] **AUD-prabayar (A-5/A-6/A-7/B-4) → F5-8 SELESAI** A-6 blokir saat menunggak · A-7 poin prabayar · A-5 tarif diskon SMESTERLY/YEARLY · B-4 sudah berlaku (no-change). UAT TB seimbang (D-21.4).
- [x] **AUD-6 🟠 (A-1) → SELESAI** Readiness period-close kini punya gate **`rent-recognition-due`**: tutup periode DIBLOKIR bila ada baris `RentRecognitionSchedule` jatuh tempo (`periodStart ≤ akhir periode`) yang belum diakui → cegah recognition stranded. (`accounting-period-close.service.ts`; read-only, tsc 0, unit 47/47.)
- [x] **AUD-7** Race minor — **SELESAI Wave 1 2026-06-16**. Row lock `FOR UPDATE`: `requestRedemption`, `decideRedemption`, `transferRoom` (toRoom).
- [x] **AUD-8** Auto-journal warisan — **SELESAI** via F5-6 `runAutoJournalReconciliation` + alert OWNER/ADMIN. Best-effort flow lama tetap; gap ditutup sweeper.
> **Semua abu-abu TERJAWAB (D-21 + D-22, 2026-06-15):** A-5/A-6/A-7/B-4 (AUD-prabayar), D-6 (AUD-2), L-1 (D-22.1), AUD-5+AC-vendor (D-22.2), AUD-4 FAQ (D-22.3), B-9 referral (D-22.4). → semua jadi **Fase 5 tindak-lanjut audit**; item schema (penanda vendor AC, jam-pakai AC) menunggu proposal+approval.

##### 🔍 AUDIT MENYELURUH SEMUA FASE (2026-06-15 — `docs/AUDIT_MENYELURUH_SEMUA_FASE.md`)
**Hasil:** TIDAK ada 🔴 bug baru di seluruh fase; 🔴 warisan ghost-stock (I-02) ternyata SUDAH ditutup. Temuan:
- [x] **SINKRON-DOC 🟡 → SELESAI (docs)** Banner "🔄 SINKRON KODE (2026-06-15)" ditambahkan di §3 dossier **10/11/13/14/15/18** menandai item yang ditandai open (🔴/🟠) tapi SUDAH selesai di kode (F1-1R, F1-2, F1-8, F1-10, F2-5/I-02, F2-14) + anchor verifikasi. (Severity tabel = historis, bukan TODO.)
- [x] **L-1 🟠 (= AUD-8/A-8) → F5-6 SELESAI** Sweeper `runAutoJournalReconciliation` (backfill jurnal warisan yang bolong + alert OWNER/ADMIN, di runAll sebelum auto-close; endpoint manual). UAT: backfill 1 invoice, TB seimbang, idempoten (D-22.1).
- [x] **B-9 🟡 → F5-5 SELESAI** Field `referredByCode` di pendaftaran tenant admin/portal → `linkReferralTx` (D-22.4).
- [x] **L-2** Dedupe deposit ledger — **SELESAI Wave 1 2026-06-16**. Key `(stayId, type, sourceType, sourceId)` dengan `sourceId=submissionId` unik — cukup; no code change.
- [x] **L-3 🟡 → SELESAI** Jurnal reward kini per tipe (`postRewardFulfillmentTx`): **RENT_DISCOUNT → DR 4000**, **METER_DISCOUNT → DR 4100** (kontra-pendapatan), SERVICE_ADDON/PHYSICAL → DR 6300 (beban); fallback aman ke 6300. UAT (`scripts/uat-l3...js`) LULUS: semua jurnal seimbang per tipe. Dossier 19 disinkron.
- [x] **L-4 🟡 GO-LIVE → SELESAI (docs)** Gate aktivasi KTP default OFF (`KTP_ACTIVATION_GATE_ENABLED`). **WAJIB set `=true` di produksi** — sudah masuk runbook `04_DEPLOY` (checklist env + langkah cPanel #6).
- [x] **L-5 🟡 → SELESAI (terukur)** SEO Lighthouse **100/100** (LH 12.8.2, headless Chrome atas build dist, halaman home) — 10 audit lulus (is-crawlable, document-title, meta-description, http-status, link-text, crawlable-anchors, robots-txt, image-alt, hreflang, canonical); structured-data = N/A (cek manual, JSON-LD ada). Target ≥90 TERLAMPAUI. _(UD-04/V-7 kosmetik tetap backlog UI.)_

#### 🆕 SESI UI/UX + PENYATUAN MODUL + METER (2026-06-16) — review owner langsung
**Konteks:** walkthrough UI/UX owner + verifikasi screenshot Playwright (`ui-shots/`, tak di-commit). Pakai DB dev 5433 (di-reseed via event-path: `seed-dev-reset.js` + `seed-dev-via-api.js`). Semua `tsc` 0, dipush ke `origin/main`.

##### Sudah SELESAI & ter-commit/push
- [x] **UI-RESP-1** Fix bug app-shell collapse `<1200px` (override `10-misc` menutup collapse `02-layout`) — global semua role.
- [x] **UI-LOGIN** Subtitle dinamis per role · ikon tab SVG · rapatkan spacing (tombol Masuk fit) · buang teks redundant.
- [x] **UI-ROOMS** Copy paginasi "Menampilkan A–B dari N" · sticky filter ≥992px · navbar emoji→SVG · aria-label tombol "+". Bug "Lihat Perbandingan" = TIDAK reproduksi (keterbatasan tool reviewer).
- [x] **UI-LOGO** Wordmark teks bersih 2-warna ganti gambar logo gradasi (beranda/rooms/footer); kontras hero dipertegas; **PWA install prompt ditunda sampai login**.
- [x] **TEN-1** Poin & Reward: sembunyikan konversi "1 poin = Rp" + nilai rupiah reward.
- [x] **TEN-2** Hapus kartu "Lapor masalah penghuni lain" (poin ke tenant yang memperbaiki, bukan pelapor).
- [x] **TEN-3** /portal/stay: hapus "Panduan resmi KOST48" (sudah di menu) · dropdown detail kamar → Accordion (seperti "Panduan & Aturan") · tombol "Ajukan Perpanjangan" selalu tampil (nonaktif+alasan bila belum bisa).
- [x] **STF-1** /staff-report: fix judul/keterangan tanpa spasi.
- [x] **STF-2** Dropdown notifikasi staf tampil di atas kartu — z-index `.app-topbar` (owner/admin) **dan** `.staff-workspace-topbar` (staf).
- [x] **STF-3** Wording lane: Mendesak→Tugas Penting, Hari Ini→Tugas Hari Ini, Dalam Proses→Tugas Dalam Proses.
- [x] **STF-4** "Checklist tambahan" → "Checklist operasional" (tanpa collapse) + motivasi (SDT: recognition/relatedness/makna + tenur).
- [x] **STF-5** Dashboard: chart komposisi recharts + dedup "Papan Kerja" (ringkasan+chart) vs "Daftar Kerja" (aksi).
- [x] **STF-6** "Laporkan Barang Kamar" disederhanakan: potong langkah saat barang sudah baik · "Catatan lapangan"→"Info kondisi barang" auto-isi · pengganti gudang difilter sejenis (kipas→kipas).
- [x] **STF-7** "Catatan Kamar" dibatasi scope fisik staf (perlu dicat/kerusakan), catatan opsional, tombol cukup (kebersihan/status=otomatis/admin).
- [x] **STF-8** Perjelas "Skor" (donut) vs "Poin kerja bersih"; nudge "Review tenant belum masuk" → "Ajak tenant beri review".
- [x] **STF-9** Gudang: kolom salah-label "Area"→"Kategori"; pisah filter **STATUS STOK** vs **KATEGORI BARANG**; default tampil semua.
- [x] **OWN-1** Relabel jargon "COA" → "Bagan Akun (COA)" / "Akun" (8 tempat).
- [x] **OWN-2 (Fase A)** Regroup navigasi owner jadi alur menyatu: "Keuangan" (incl. Akuntansi), "Barang & Aset" (Inventaris+Aset) — config-only.
- [x] **OWN-3 (Fase B-1)** Surface & buat koneksi **aset↔inventaris** di UI register aset (kolom "Tertaut", dropdown tautkan inventaris).
- [x] **OWN-4** Laporan owner: kartu **"Pergerakan Pengeluaran"** (per kategori) pendamping "Pergerakan Pendapatan".
- [x] **METER M-1** Konstanta owner-settable di Settings (`OperationalSetting` + modul `settings` + tab "Tarif & Konstanta"): free 30 kWh, tarif Rp2500, toggle air, tarif air. [SCHEMA additive, owner OK]
- [x] **METER M-2** `POST /meter-readings/cycle` (OWNER/ADMIN): catat listrik+air → jatah gratis+tarif → auto-issue invoice meter (reuse `createWithLinesAndIssue`) + `MeterCycleModal` di tab Meter. Verified API+UI.
- [x] **DATA** Seeder event-path (`seed-dev-reset.js` + `seed-dev-via-api.js`) menggantikan dummy raw/bypass lama; data bisnis masuk via endpoint nyata.
- [x] **DOCS** Spec `_PROPOSAL_METER_LISTRIK_AIR.md` (M-1..M-5) + `_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md` (tip/gamifikasi/marketing/cross-sell) + CHANGELOG 2026-06-16.

#### ✅ WAVE 1 — Selesai 2026-06-16 (Keamanan Keuangan)
- [x] **L-2** Audit dedupe deposit ledger — key `(stayId, type, sourceType, sourceId)` sudah cukup (`sourceId=submissionId` unik). No code change.
- [x] **AUD-7** Race minor (AUD-7/B-1/B-2/C-2): row lock `FOR UPDATE` ditambahkan di 3 titik:
  - `requestRedemption()` — lock reward row sebelum cek stok
  - `decideRedemption()` — lock reward row sebelum approve
  - `transferRoom()` — lock toRoom row sebelum pindah kamar
- [x] **AUD-8** Auto-journal warisan sudah di-cover F5-6 (`runAutoJournalReconciliation` mencakup INVOICE/INVOICE_PAYMENT/EXPENSE/WIFI_SALE + alert OWNER/ADMIN). No code change.

#### ✅ WAVE 2 — Selesai 2026-06-16 (Meter + SEO)
- [x] **METER M-3** Pencatatan **mandiri tenant** — frontend portal tenant **SELESAI**:
  - [x] Entry point: tombol "Catat Meter Listrik/Air" di MyStayPage
  - [x] Form tenant hanya untuk stay miliknya (guard backend: `@Roles(TENANT)` di `POST /meter-readings/cycle`)
  - [x] Estimasi tagihan live: kuota gratis 30 kWh, tarif listrik/kWh, status air, chargeable
  - [x] Submit memakai endpoint cycle yang sudah izinkan TENANT; invoice system-issued tampil setelah submit
  - [x] Badge "🔔 Catat Meter Sekarang" (btn warning) saat H-10
  - [x] Build frontend + PWA verify ✅ (105 chunks)
- [x] **METER M-4** "Bayar sekaligus" invoice sewa + meter OPEN **SELESAI**:
  - [x] Backend: `POST /payment-submissions/batch` — validasi multi-invoice milik stay/tenant yang sama
  - [x] UI tenant: alert grouping "Bayar sekaligus" di MyInvoicesPage + tombol "Bayar Semua"
  - [x] Copy invoice: "belum termasuk pemakaian listrik/air berjalan" di detail invoice
  - [x] Build backend ✅ + frontend ✅
- [x] **F3-3** SEO Lighthouse — skor **100/100** (diverifikasi via L-5). Build dist siap.

---

## ANTRIAN EKSEKUSI AKTIF (untuk AI — kerjakan dari sini)

> **Mulai dari Fase A lalu turun ke B, C, D, E, F, G.** Fase A boleh berhenti di langkah owner, lalu AI boleh lanjut ke fase lain selama tidak menyentuh deploy produksi. Status: `[x]` selesai, `[~]` sudah sebagian/tinggal polish, `[ ]` belum selesai.

### Peta Rujukan Dokumen

| Kebutuhan | Baca dulu | Dipakai untuk |
|-----------|-----------|---------------|
| Orientasi bisnis & batasan sistem | `docs/M01_MASTER.md` | Gambaran KOST48, asumsi 48 kamar, lokasi, role |
| Keputusan owner & UX owner/admin | `docs/M02_KEPUTUSAN_OWNER.md` | Owner view, role guard, keputusan D-01..D-23 |
| Flow kontrak & chain-of-custody | `docs/M03_FLOW_KONTRAK.md` | Alur booking, invoice, jurnal, stay, dan kontrak |
| Keuangan, jurnal, invoice, deposit | `docs/M04_KEUANGAN.md` | Semua task uang wajib unit test + invarian TB |
| Siklus huni, booking, tenant, renewal | `docs/M05_SIKLUS_HUNI.md` | Booking, stay, checkout, KTP, profil tenant |
| Operasional, staff, gudang, meter | `docs/M06_OPERASIONAL.md` | Staff route, inventory, meter, tiket, gudang |
| Publik, marketing, SEO, layanan | `docs/M07_PUBLIK_GROWTH.md` | Public UI, katalog, layanan tambahan, foto marketing |
| Deploy & go-live produksi | `docs/M08_DEPLOY_GO_LIVE.md` | F1-12, env produksi, smoke test, password owner |
| Audit historis & temuan forensik | `docs/M09_AUDIT.md` | Rujukan audit lama, risiko, dan keputusan pasca-audit |
| Checklist aktif & ANTRIAN | `docs/M10_CHECKLIST_CHANGELOG.md` | Source of truth eksekusi berikutnya |
| Changelog arsip | `docs/M11_CHANGELOG.md` | Riwayat ringkas; tulis entri baru di paling atas |
| AI Owner/Admin berbayar | `docs/M12_AI_OWNER_ADMIN.md` | Fase G: tombol manual, DeepSeek, konteks hemat token, OCR draft, approval copilot |
| UI/UX Compact Owner↔Admin | `docs/M13_FASE_H_UIUX_COMPACT.md` | Fase H: reduksi sidebar 18→7, dashboard 6→3 tab, merge layanan |
| Navigasi & Onboarding | `docs/M14_FASE_I_NAVIGASI_ONBOARDING.md` | Fase I: de-duplikasi menu, rute tersembunyi, breadcrumb, onboarding |
| Peta navigasi kode (AI) | `docs/CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |
| Audit post-fix terbaru | `docs/AUDIT_POST_FIX.md` | Verifikasi DEEP-01..05 dan catatan hardening |

### Mode AI Lemah — Aturan Eksekusi

1. Buka `docs/M10_CHECKLIST_CHANGELOG.md` dulu, pilih **satu** item `[ ]` atau `[~]` dari Fase A-G.
2. Buka semua rujukan MD yang tertulis di fase itu sebelum edit kode. Jangan mengerjakan dari ingatan atau dari nama task saja.
3. Cari anchor kode dengan `rg` sesuai petunjuk fase, lalu cocokkan perilaku kode dengan MD rujukan.
4. Jika task menyentuh uang, baca `docs/M04_KEUANGAN.md` dan jalankan gate uang. `tsc 0` saja tidak cukup.
5. Jika task Fase G menyentuh DeepSeek/API AI, baca `docs/M12_AI_OWNER_ADMIN.md` penuh. Semua fitur AI harus tombol manual Owner/Admin, tidak boleh auto-run.
6. Jika task menyentuh schema/migration, berhenti sampai ada approval owner untuk schema additive.
7. Setelah selesai, update checklist M10 + 1 baris di `docs/M11_CHANGELOG.md`; jangan membuat checklist baru di file lain.

### Prompt YOLO Siap Pakai

Salin prompt ini ke AI eksekutor baru bila ingin dia jalan otonom dari checklist:

```text
Kamu adalah AI eksekutor lemah untuk repo KOST48. Kerjakan YOLO tapi tetap aman.

Aturan utama:
1. Mulai dari docs/M10_CHECKLIST_CHANGELOG.md bagian "ANTRIAN EKSEKUSI AKTIF".
2. Pilih 1 task pertama yang actionable dari Fase A-G dengan status [ ] atau [~].
3. Jika task owner-blocked, rahasia produksi, deploy nyata, atau schema/migration tanpa approval owner, jangan nebak. Lewati ke task AI-actionable berikutnya dan catat alasannya.
4. Sebelum edit kode, buka semua MD rujukan yang tertulis di fase/task itu. Minimal baca M10 + M-file domain terkait. Untuk uang wajib baca docs/M04_KEUANGAN.md.
5. Cari anchor kode pakai rg. Cocokkan kode aktual dengan checklist; jangan mengandalkan ingatan atau asumsi.
6. Implementasikan perubahan sampai selesai, bukan sekadar rencana. Jaga scope kecil: 1 task = 1 perubahan fokus.
7. Untuk Fase G AI: baca docs/M12_AI_OWNER_ADMIN.md penuh; AI berbayar hanya boleh jalan setelah tombol manual Owner/Admin; Tenant/Staff tidak mendapat tombol AI; AI hanya membuat draft/rekomendasi dan manusia tetap approve.
8. Jangan tambah dependency npm, jangan git push, jangan ubah schema.prisma/sql tanpa approval owner, jangan sentuh flow finance di luar scope.
9. Jalankan gate sesuai dampak:
   - Backend: cd backend; npx tsc --noEmit
   - Frontend: cd frontend; npm run build
   - Task uang: cd backend; npm run test:unit atau node --test "test/**/*.test.js" sesuai package script
   - UI/layout: cek responsive/mobile bila memungkinkan
10. Setelah lulus, update docs/M10_CHECKLIST_CHANGELOG.md (ubah status item) dan tambah 1 baris changelog di docs/M11_CHANGELOG.md.
11. Jika gagal 2 kali di error yang sama, berhenti dan laporkan blocker dengan file/line/error konkret.

Output akhir:
- Sebut task yang dikerjakan.
- Sebut file yang diubah.
- Sebut gate yang dijalankan dan hasilnya.
- Sebut sisa risiko atau item berikutnya.
```

### Ringkasan Fase Aktif

| Fase | Nama Mudah | Status | Rujukan Utama | Catatan |
|------|------------|--------|---------------|---------|
| **Fase A** | Pra-Go-Live Produksi | 🧑 blocked owner | M08, M02 | Deploy nyata menunggu server/domain/env owner |
| **Fase B** | Publik & Portal Tenant | **selesai** | M07, M05, M06 | Public UI, smart booking, kalender, layanan, meter, profil, foto kamar/fasilitas, dan aset brosur selesai |
| **Fase C** | Workspace Owner/Admin | **selesai** | M02, M06 | Mode-aware UI + route split/guard + status cards + inventaris shell selesai (2026-06-19) |
| **Fase D** | Operasional Staff & Gudang | **selesai** | M06, M04 | Staff/gudang/WiFi/tip/meter view selesai untuk backlog aktif |
| **Fase E** | Polish, Gamifikasi & Teknis | **selesai** | M06, M07, M09 | TEN-GAMIF privacy, split service, integration test, E2E, dan evaluasi arsitektur selesai |
| **Fase F** | UI/UX Sweep | **selesai** | M07 | 404, toast, a11y, kontras, logout, tenant search, skeleton, overscroll, login format |
| **Fase G** | AI Owner/Admin Approval Copilot | **selesai** | M12, M02, M04-M09, CODEMAP | DeepSeek/API AI manual-only; G0-G9 selesai, draft queue, KTP OCR, budgeting ✅ |
| **Fase H** | UI/UX Compact Owner↔Admin | **selesai** | M13, M02, M07, CODEMAP | Reduksi sidebar 18→7, dashboard 6→3 tab, merge layanan, polish CSS ✅ |
| **Fase I** | Navigasi & Onboarding | **selesai** | M14, M02, M07, CODEMAP | I1-I6 selesai: hapus duplikasi menu, unifikasi staff nav, ekspos /meter-readings, breadcrumb klik, onboarding tenant ✅ |

---

### Fase A — Pra-Go-Live Produksi

**Tujuan:** aplikasi siap dipublish bersih, tanpa membawa data UAT/testing.

**Rujukan:** `docs/M08_DEPLOY_GO_LIVE.md` · `backend/.env.production.example` · `backend/scripts/change-owner-password.ts` · `docs/M02_KEPUTUSAN_OWNER.md`.

- [ ] **A1 / F1-12 — Go-live nyata** 🧑: owner konfirmasi VPS/cPanel, domain, HTTPS, PostgreSQL prod 5432, dan env rahasia.
- [ ] **A2 — Fresh provision produksi:** DB kosong → migrate/push → bootstrap + addendum → OWNER pertama → COA/periode/cash account.
- [ ] **A3 — Env produksi:** `NODE_ENV=production`, JWT kuat, CORS domain final, VAPID, `KTP_ACTIVATION_GATE_ENABLED=true`, auto-ops sesuai host.
- [ ] **A4 — Password OWNER:** ganti password dev/dummy ke password real sebelum dipakai owner.
- [ ] **A5 — Opening balance:** isi saldo/modal awal bila ada; jika mulai nol, dokumentasikan zero-start.
- [ ] **A6 — Smoke prod:** login OWNER, public rooms 200, trial balance balanced, recon mismatch 0, readiness tanpa blocker merah.
- [x] **A7 — Guard test stale:** `backend/package.json` sudah punya `pretest:unit = npm run build`, jadi test unit pakai `dist` segar.
- [x] **A8 — Hardening hasil audit:** DEEP-01..05 sudah tercatat selesai; HSTS dan `Permissions-Policy: camera=(self)` sudah masuk changelog.

**Gate:** M08 §3 smoke PASS. **Jangan:** backfill data UAT ke produksi.

---

### Fase B — Publik & Portal Tenant

**Tujuan:** calon penghuni bisa paham kamar/biaya, booking, lihat layanan, dan tenant bisa memakai portal tanpa bingung.

**Rujukan:** `docs/M07_PUBLIK_GROWTH.md` · `docs/M05_SIKLUS_HUNI.md` · `docs/M06_OPERASIONAL.md`.

**Anchor kode:** `PublicGuestDashboardPage` · `GuestBookingForm` · `MyStayPage` · `marketing-public-rooms.service.ts` · `additional-services`.

#### B1 — Public UI dasar yang sudah selesai
- [x] Navigasi publik, tombol "Masuk Portal", ikon, CTA audit, badge status, kategori kamar, filter ulasan, OCR KTP, KTP/NIK opsional, dan profile completeness badge sudah selesai.
- [x] **PUB-CALENDAR-CHECKOUT:** badge "Perkiraan kosong [tgl]" sudah muncul dari checkout-approved atau stay jangka pendek.
- [x] **PUB-CALENDAR-RENEW:** ditutup sebagai keputusan produk owner; sistem tidak menebak kontrak bulanan/panjang.

#### B2 — Ketersediaan & booking cerdas
- [x] **PUB-CALENDAR:** backend `GET /public/rooms/availability-calendar?from&to` + frontend `AvailabilityTimeline` horizontal (per kamar × per tanggal: KOSONG/BOOKING_DP/HUNI/MAINTENANCE).
- [x] **PUB-SMART-BOOKING:** API `GET /public/rooms?checkIn&durationDays` sudah memfilter kamar yang available di seluruh rentang (backend: `marketing-public-rooms.service.ts`).

#### B3 — Foto, brosur, dan aset marketing
- [x] **PUB-CARD-RESPONSIVE:** grid public rooms sudah 4/2/1 kolom.
- [x] **PUB-FACILITY-PHOTO:** owner bisa upload 1 foto per fasilitas via Settings → Foto Fasilitas; foto real tampil di landing page publik (fallback emoji bila belum ada foto).
- [x] **OWN-FOTO-UPLOAD:** Owner Settings kini mengelola foto kamar, foto fasilitas, dan aset publik slot-based (hero, profil/galeri, spanduk, brosur depan/belakang) via endpoint `marketing-assets`.
- [x] **PUB-BROCHURE:** section galeri/brosur publik memakai upload owner bila ada, dengan fallback aset statis bila slot belum di-upload.

#### B4 — Layanan tambahan & minat layanan
- [x] **PUB-LAYANAN-TAMBAHAN:** model `AdditionalService`, CRUD owner, route/nav admin, dan portlet tenant sudah selesai.
- [x] **PUB-LAYANAN-MINAT:** model `ServiceInterest`, API interest, tombol tenant "Saya Minat", dan halaman admin/owner proses minat sudah selesai fungsional. Sisa polish: ganti `window.confirm` ke modal custom bila diminta.

#### B5 — Meter & profil tenant
- [x] **PUB-METER-JADWAL:** tenant sudah bisa melihat jendela catat meter bulan ini + status sudah/belum di `/portal/stay`; tenant hanya bisa membaca meter kamar aktifnya.
- [x] **PUB-FOTO-PROFIL-KTP:** foto KTP pertama otomatis menjadi avatar tenant; owner/admin bisa ganti/hapus foto profil; avatar disajikan via endpoint authed. Schema additive `20260618030000_tenant_profile_photo` dipakai untuk metadata profil.

**Gate:** frontend `npm run build` PASS; jika menyentuh backend/schema, backend `npx tsc --noEmit` dan migration additive owner-approved.

---

### Fase C — Workspace Owner/Admin

**Tujuan:** owner punya kokpit bisnis yang jelas, dan saat pindah ke mode admin tidak terasa campur-aduk dengan dashboard owner.

**Rujukan:** `docs/M02_KEPUTUSAN_OWNER.md` §Keputusan UI/UX Dashboard · `docs/M06_OPERASIONAL.md`.

**Anchor kode:** `AppLayout.tsx` · `navigation.ts` · `RoleWorkspaceTabs.tsx` · `OwnerDashboardPage` · `DashboardAdmin` · `02-layout.css` · `12-owner.css`.

#### C1 — Layout dasar yang sudah masuk
- [x] **Sidebar collapsible:** ikon-only desktop + persist localStorage sudah ada.
- [x] **Breadcrumb + hamburger:** topbar breadcrumb dan hamburger mobile sudah ada.
- [x] **Owner dashboard compact/full:** toggle Ringkas/Lengkap di `OwnerDashboardPage` sudah ada.

#### C2 — Toggle Owner/Admin mode
- [x] **OWN-TOGGLE-CSS:** (SELESAI 2026-06-19) `.owner-view-toggle` jadi segmented control: radius 12px, track abu (`#f1f5f9`) + padding, active **putih + shadow** (`0 1px 3px`), hover state, transisi **0.2s ease**. Konsisten utk toggle topbar, mobile, & Ringkas/Lengkap.
- [x] **OWN-TOGGLE-LAYOUT:** (SELESAI 2026-06-19) toggle dibungkus `.owner-view-toggle-wrap` (center `margin:0 auto`) dengan `.topbar-divider` di kiri-kanan sebagai pemisah breadcrumb/aksi.
- [x] **OWN-TOGGLE-MOBILE:** (SELESAI 2026-06-19) toggle Kokpit/Area Admin kini muncul lebar-penuh di offcanvas mobile (`owner-view-toggle-mobile`); toggle topbar dijadikan desktop-only (`d-none d-xl-inline-flex`) agar tak bertumpuk di layar kecil.
- [x] **OWN-TOGGLE-TRANSITION:** (SELESAI 2026-06-19) `12-owner.css`: transisi `grid-template-columns` di `.app-shell-grid` + `width/margin/padding` di `.app-sidebar, .app-main` (0.3s ease) saat sidebar ciut/lebar.

#### C3 — Sidebar, breadcrumb, dan aksi topbar adaptif
- [x] **OWN-SIDEBAR-CONTEXT:** (SELESAI 2026-06-19) `SidebarContent` kini menerima prop `ownerViewMode`; context-card title/subtitle pakai `getWorkspaceTitle/Summary(role, mode)` dan footer/`isAdmin` memperlakukan OWNER mode-admin sebagai konteks admin.
- [x] **OWN-BREADCRUMB-MODE:** (SELESAI 2026-06-19) breadcrumb owner kini diprepend root hard-label "Kokpit Owner"/"Area Admin" sesuai `ownerViewMode` (tak dobel bila segmen pertama sudah sama).
- [x] **OWN-OFFCANVAS-TITLE:** (SELESAI 2026-06-19) `Offcanvas.Title` kini `getWorkspaceTitle(role, ownerViewMode)` → "Kokpit Owner"/"Area Admin (Owner)" mengikuti mode.
- [x] **OWN-ADMIN-ICON-ACTION:** (SELESAI 2026-06-19) tombol "Pengumuman" tampil saat `isAdmin || (isOwner && ownerViewMode === 'admin')`.
- [x] **OWN-STATUS-CARDS:** (SELESAI 2026-06-19) `OwnerDashboardPage` punya strip "Status Kokpit" 4 kartu: **okupansi** (kpi), **tunggakan** (signal overdue+outstanding, count+Rp), **meter belum dicatat** (best-effort: stay aktif vs reading bulan ini via `computeMeterDue`), **kesiapan go-live** (`fetchAccountingReadiness` score/ready); semua clickable. Sidebar Kokpit Owner diregroup jadi 2 grup: **Operasional** vs **Keputusan Owner** (`navigation.ts` `ownerSections`).

#### C4 — Route split dan guard
- [x] **OWN-ROUTE-SPLIT:** (SELESAI 2026-06-19) `/admin-dashboard` kini route nyata (OWNER) di `App.tsx` → `DashboardAdmin`; render inline hack di `AppLayout` dibuang. `ownerAdminSections` (sidebar) + `RoleWorkspaceTabs(adminDashboardPath)` + chip internal `DashboardAdmin` memakai base path dinamis (`/admin-dashboard` vs `/dashboard`).
- [x] **OWN-ROUTE-GUARD:** (SELESAI 2026-06-19) `/owner-dashboard` & `/admin-dashboard` OWNER-only via `RequireRoles`; toggle owner kini navigasi antar route, dan `AppLayout` sinkronkan `ownerViewMode` dari pathname (buka `/admin-dashboard` → mode admin, `/owner-dashboard` → mode owner).
- [x] **OWN-ROLE-TABS-MODE:** (SELESAI 2026-06-19) `RoleWorkspaceTabs` kini terima `role` asli + prop eksplisit `ownerViewMode`, dan memilih tab set + base path internal (OWNER+admin → `/admin-dashboard`). Hack `role={...?'ADMIN':...}` + `adminDashboardPath` di `AppLayout` dibuang; aria-label ikut `isAdminView`.
- [x] **OWN-BACKEND-MODE** *(opsional)*: (SELESAI 2026-06-19) FE kirim header `X-Owner-View-Mode` (owner/admin) via interceptor `api/client.ts`; BE `OwnerViewModeInterceptor` global melampirkan `request.ownerViewMode` + audit log saat OWNER aksi tulis dalam mode admin. Bonus: fix bentrok key localStorage (`OwnerDashboardPage` density → `kost48_owner_density`).

#### C5 — Inventaris terpadu
- [x] **FASE B-2:** (SELESAI 2026-06-19) shell `InventoryShellPage` (route `/inventory`, OWNER/ADMIN) dengan `SegmentedTabs` 3 tab path-based: **Gudang** (`/inventory/gudang`) · **Barang Kamar** (`/inventory/barang-kamar`) · **Mutasi** (`/inventory/mutasi`). Route lama `/inventory-items`/`/room-items`/`/inventory-movements` redirect ke shell (mutasi preservasi query untuk prefill). `SimpleCrudPage` dapat `hideAreaMenu` (cegah dobel nav); sidebar/dashboard chips/RoleWorkspaceTabs/ResourceTable diarahkan ke shell. **Keputusan owner: 3 tab** (Inventaris=shell, "Gudang" staf = view terpisah Fase D).

**Gate:** frontend build PASS, UAT route guard OWNER/ADMIN, dan cek mobile 390/834/1440 bila menyentuh layout.

---

### Fase D — Operasional Staff & Gudang

**Tujuan:** pekerjaan staff, gudang, meter, WiFi, dan tip sukarela jelas batas role-nya, tanpa bocor ke finance.

**Rujukan:** `docs/M06_OPERASIONAL.md` · `docs/M04_KEUANGAN.md` untuk batas finance.

**Anchor kode:** `DashboardStaff.tsx` · `StaffMotivationDashboard.tsx` · `StaffReportPrintView.tsx` · `inventory-items` · `room-items` · `tickets` · `WifiOrderPage`.

- [x] **STF-GUDANG-2:** (1) Schema additive: FK `inventoryItemId` di `RoomFacility` (migration `20260618210000`), mapping eksak fasilitas→item via FK langsung, bukan fuzzy-name. (2) `suggestedMinQtyRupiah` + `facilityCount` dari `loadFacilityCounts()` via `groupBy inventoryItemId`. (3) DTO `CreateRoomFacilityDto`/`UpdateRoomFacilityDto` + `inventoryItemId`. (4) Seeder: 20 kamar dapat "Kipas Angin" via `POST /rooms/:id/facilities`.
- [x] **STF-METER-VIEW:** dashboard daftar kamar sudah/belum catat meter per siklus — `StaffMeterStatusPanel` + integrasi ke `StaffMotivationDashboard`.
- [x] **STF-ROLE-SCOPE:** audit penuh scope resepsionis/reparasi/kebersihan per route. **2 celah ditutup:** (1) STAFF dilarang override `agreedRentAmountRupiah`/tarif listrik+air saat create stay — ForbiddenException + pesan jelas; (2) `GET /tenants/:id` memfilter field KTP (ktp*, identityNumber, profilePhoto*) untuk STAFF — data PDP tidak bocor.
- [x] **STF-WIFI-ORDER:** flow lengkap tanpa schema: tenant lihat paket WiFi di `/portal/wifi` + tombol "Pesan Sekarang" → `ServiceInterest` → admin proses → `WifiSale` + invoice. Staff read-only via `GET /wifi-sales`. WhatsApp tetap sebagai fallback.
- [x] **STF-TIP-FLOW:** T-1 tenant acknowledge + notif staff + endpoint `POST /tickets/:id/tip-confirm` (STAFF konfirmasi Sudah/Belum) + notif balik ke tenant + idempotency `TIP_CONFIRMED`. Sisa: UI konfirmasi di portal staff + auto-grace sweeper 2 hari.
- [x] **STF-THEME:** standarkan header, tabs, empty/loading, mobile z-index di route staff — CSS `staff-panel-card`, `staff-meter-table`, z-index mobile.
- [x] **STF-THEME screenshot:** `ui-shots/shoot-staff.mjs` desktop + mobile (390px) — 4 halaman staf: report, dashboard, warehouse, tickets.

**Gate:** frontend build PASS; untuk role/finance wajib UAT guard dan pastikan tip/WiFi tidak membuat jurnal liar.

---

### Fase E — Polish, Gamifikasi & Teknis

**Tujuan:** fitur non-blocker dirapikan setelah flow utama aman.

**Rujukan:** `docs/M06_OPERASIONAL.md` · `docs/M07_PUBLIK_GROWTH.md` · `docs/M09_AUDIT.md`.

**Urutan kerja:** E1b → E3a → E3b → E3c → E3d → E3e. **1 task = 1 commit.**

**Gate umum:** Backend `cd backend && npx tsc --noEmit` = 0. Frontend `cd frontend && npm run build` PASS. DB UAT: port **5433** `kost48_v3_pro`.

---

#### E1 — Tenant gamification

- [x] **TEN-GAMIF:** ranking kebersihan depan kamar bulanan — backend `GET /public/rooms/cleanliness-ranking?month&year` (skor persentase `DONE/expected` dari assignment aktif area CLEANING per room, query month/year tervalidasi) + frontend kartu ranking di MyLoyaltyPage.
- [x] **TEN-GAMIF privacy:** leaderboard poin tidak expose tenantId/nama; UAT lulus.

##### E1b — Verifikasi Privacy (UAT manual, tanpa edit kode)

**Anchor:** `backend/src/modules/marketing/marketing-public-rooms.service.ts:547-643` · `backend/src/modules/loyalty/loyalty.service.ts:125-151` · `frontend/src/pages/portal/MyLoyaltyPage.tsx`

**Step 1 — Backend cleanliness ranking:** Jalankan backend, lalu:
```bash
curl -s "http://localhost:3000/api/public/rooms/cleanliness-ranking?month=6&year=2026" | python -c "import sys,json; d=json.load(sys.stdin); [print(k) for r in d.get('ranking',d.get('data',{}).get('ranking',[])) for k in r.keys()]" | sort -u
```
Assert: output HANYA berisi `code`, `doneCount`, `expectedCount`, `name`, `roomId`, `score`. **TIDAK boleh** ada `tenantId`, `tenantName`, `userId`, `fullName`, `email`, `nik`.

**Step 2 — Backend loyalty leaderboard:**
```bash
curl -s -H "Authorization: Bearer $(node -e "const http=require('http'); http.get('http://localhost:3000/api/auth/login',{headers:{'Content-Type':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{const j=JSON.parse(d);process.stdout.write(j.data?.token??'')})}).write(JSON.stringify({identifier:'tenant.g2@kost48.com',password:'tenant123'}))")|tail -1")" "http://localhost:3000/api/me/loyalty/leaderboard" | python -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d); [print(k) for r in (items if isinstance(items,list) else items.get('leaderboard',[])) for k in r.keys()]" | sort -u
```
Assert: output HANYA berisi `points`, `rank`, `roomCode`. **TIDAK boleh** ada identitas tenant.

**Step 3 — Frontend smoke:** Buka `http://localhost:5173/portal/loyalty` (login tenant). Pastikan kartu kebersihan dan papan poin menampilkan **kode kamar** (A01, B03), bukan nama orang, dan ada badge "anonim".

**Step 4 — Centang checklist:** Ubah marker `[~]` → `[x]`.

**Gate:** keempat langkah PASS. Tidak perlu `tsc` atau build.

---

#### E2 — Marketing renewal

- [x] **MKT-5:** selesai fungsional. `RenewRequestModal` sudah memuat copy meter; `RenewalCrossSellCard` opsional.

---

#### E3 — Backlog teknis non-blocker

##### E3a — Split `auto-ops.service.ts` [x]

**Kondisi:** 1.819 baris monolitik, 26 method, 79.6 KiB. Belum dipecah.

**Target:** Orchestrator + 5 sweep service. Controller **TIDAK** diubah.

**Arsitektur target:**
```
auto-ops/
├── auto-ops.service.ts          # Orchestrator (~200 baris): runAll, status, + proxy per sweep
├── auto-ops.controller.ts       # TETAP — semua endpoint delegasi ke orchestrator
├── auto-ops.module.ts           # Update: daftarkan 5 sweep service baru
├── sweeps/
│   ├── booking-sweep.service.ts     # runBookingExpiry(L287-315), runDownPaymentForfeit(L573-616),
│   │                                #   expiredBookingWhere(L1704-1718), expireBookingTx(L1720-1818)
│   ├── stay-sweep.service.ts        # runRoomReleaseAtNoon(L322-361), cancelEndedUnpaidStay(L372-537),
│   │                                #   notifyTenantStayCancelled(L544-565), runOverstayForcedCheckout(L1306-1338),
│   │                                #   forceCheckoutOverstay(L1340-1494), notifyAdminsForcedCheckoutBlocked(L1496-1538),
│   │                                #   runOverstayEnforcement(L1548-1630), runPostCheckoutAutoCancel(L1637-1671),
│   │                                #   runRoomHealer(L1673-1701)
│   ├── renewal-sweep.service.ts     # runRenewalPriorityExpiry(L1075-1102), expireRenewalPriorityTx(L1104-1156),
│   │                                #   notifyTenantRenewalExpired(L1158-1178), runRenewalSettlementForfeit(L1187-1268),
│   │                                #   notifyAdminsRenewalForfeited(L1270-1295)
│   ├── accounting-sweep.service.ts  # runRentRecognition(L766-777), runAutoJournalReconciliation(L824-843),
│   │                                #   notifyAdminsJournalReconciliation(L846-878), runRecurringExpenseDrafts(L159-234),
│   │                                #   runAutomaticDepreciation(L236-268), runAccountingAutoClose(L271-285)
│   └── maintenance-sweep.service.ts # runAcCleaningSchedule(L704-760), runReferralRewards(L685-696),
│                                    #   runPushDispatch(L783-794), runNotificationPruning(L802-815),
│                                    #   runTicketSlaEscalation(L885-945), runContractEndReminders(L947-1029),
│                                    #   notifyAdminsTenantNoPortalContract(L1032-1058), runBelongingsAbandonment(L628-679),
│                                    #   wibToday(L1060-1064)
└── auto-ops-period.helper.ts    # TETAP
```

**Pola sweep service (copy-paste template):**
```typescript
import { Injectable, Logger } from '@nestjs/common';
// SALIN import yang relevan SAJA dari auto-ops.service.ts

@Injectable()
export class BookingSweepService {  // ganti nama per domain
  private readonly logger = new Logger(BookingSweepService.name);

  constructor(
    // SALIN dependency yang dipakai method di file ini SAJA
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
    // ...
  ) {}

  // COPY-PASTE method dari auto-ops.service.ts — JANGAN ubah isi method
  async runBookingExpiry(...) { /* persis sama */ }
}
```

**Langkah:**
1. `mkdir backend/src/modules/auto-ops/sweeps`
2. Buat 5 file sweep service — setiap file ambil method yang terdaftar di atas
3. Update `auto-ops.service.ts`: hapus method yang sudah pindah + inject 5 sweep service; `runAll()` panggil via sweep service; tambah method proxy untuk setiap endpoint controller
4. Update `auto-ops.module.ts`: tambah 5 sweep service di `providers`
5. **JANGAN ubah `auto-ops.controller.ts`** — semua method publik orchestrator tetap jadi proxy

**⚠️ PENTING:** Gunakan `get_symbols` + `read_file` untuk lihat dependensi tiap method (`this.xxx`) sebelum copy. Jangan pindahkan method yang memanggil `this.methodLain()` — method yang dipanggil juga harus ikut pindah.

**Gate:** `cd backend && npx tsc --noEmit` = 0. Runtime: auto-ops cron tetap jalan (trigger via `/api/auto-ops/cron`).

##### E3b — Split `stays.service.ts` (renewal) [x]

**Kondisi:** 2.020 baris, 73.5 KiB. Sudah ada `stays-service-helpers.ts` (203 baris).

**Target:** Ekstrak 5 method renewal ke `stays-renewal.service.ts`.

**Method yang dipindahkan:**
| Method | Baris | Visibility |
|--------|-------|------------|
| `renewStay` | 1602-1609 | public |
| `issueRenewalDownPaymentInvoiceTx` | 1615-1664 | public |
| `prepareRenewalSettlementInTransaction` | 1666-1845 | public |
| `finalizePreparedRenewalInTransaction` | 1847-1916 | public |
| `cancelUnpaidRenewalInvoiceInTransaction` | 1918-1963 | public |

**Konsumen yang harus diupdate:**

1. **`renew-requests.service.ts`** — baris 158, 274, 313, 420 pakai `this.staysService.issueRenewal*/prepareRenewal*/finalize*/cancelUnpaid*`. Ganti ke `this.staysRenewalService.*`.
   - SEARCH: `import { StaysService } from '../stays/stays.service';`
   - UPDATE: inject `StaysRenewalService` (ganti atau tambah, tergantung apakah `StaysService` dipakai untuk method non-renewal juga — **grep dulu** `staysService\.` di file tersebut!)

2. **`stays.controller.ts`** — baris 126: `this.staysService.renewStay(...)`. Tetap proxy via orchestrator.

3. **`stays.module.ts`** — tambah `StaysRenewalService` di `providers` + `exports`.

**Langkah:**
1. Buat `backend/src/modules/stays/stays-renewal.service.ts` — copy 5 method renewal
2. Hapus 5 method dari `stays.service.ts`
3. Inject `StaysRenewalService` ke `StaysService`, method `renewStay()` jadi proxy
4. Update `renew-requests.service.ts` — ganti pemanggilan ke `StaysRenewalService`
5. Update `stays.module.ts`

**Gate:** `cd backend && npx tsc --noEmit` = 0. Runtime UAT: renewal penuh (request → DP invoice → settlement → finalize).

##### E3c — Integration test: booking → checkout → deposit [x]

**Prasyarat:** DB UAT (5433) running + seeded: `node scripts/seed-dev-reset.js && node scripts/seed-dev-via-api.js`

**Buat direktori + file:** `backend/test/integration/stays-lifecycle.integration.test.ts`

**Kerangka (copy-paste):**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Stay Lifecycle Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = module.get(PrismaService);
  });

  afterAll(async () => { await app.close(); });

  // TC1: Booking → DP lunas → check-in → checkout → deposit refund
  it('full lifecycle: booking → check-in → checkout → deposit refund', async () => {
    // 1. Ambil room AVAILABLE dari DB
    // 2. Stay.create() → status ACTIVE, Room RESERVED
    // 3. Buat PaymentSubmission → approve DP
    // 4. Stay.complete() → Room OCCUPIED, promoted
    // 5. Checkout request → deposit settlement → refund
    // 6. Assert deposit ledger balance = 0
  });

  // TC2: Booking expiry 3 jam → DP hangus
  // TC3: Renewal sukses tanpa gap periode
  // TC4: Checkout dengan potong meter × deposit
});
```

**Tambah script di `backend/package.json`:**
```json
"test:integration": "node --test \"test/integration/**/*.test.js\""
```

**Gate:** `cd backend && npm run build && npm run test:integration` — semua PASS.

##### E3d — E2E Playwright fungsional [x]

**Prasyarat:** `ui-shots/` sudah ada Playwright 1.60.0 (screenshot capture). Backend + frontend harus running.

**Langkah:**
1. `cd frontend && npm install -D @playwright/test && npx playwright install chromium`
2. Buat `frontend/playwright.config.ts`:
   ```typescript
   import { defineConfig } from '@playwright/test';
   export default defineConfig({
     testDir: './e2e',
     timeout: 30000,
     use: { baseURL: 'http://localhost:5173', headless: true },
     webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
   });
   ```
3. Buat `frontend/e2e/public-pages.spec.ts` — test: landing, katalog, detail kamar, login
4. Buat `frontend/e2e/booking-flow.spec.ts` — test: pilih kamar → form booking muncul
5. Buat `frontend/e2e/tenant-portal.spec.ts` — test: login tenant → portal → loyalty page
6. Tambah script: `"test:e2e": "npx playwright test"` di `frontend/package.json`

**Gate:** `cd frontend && npx playwright test` — semua spec PASS.

##### E3e — Evaluasi arsitektur jangka panjang [x]

**Output:** `docs/FASE_E_EVALUASI_ARSITEKTUR.md` (read-only, tidak ada perubahan kode).

Evaluasi 4 item dengan format: kondisi saat ini → risiko → rekomendasi → prioritas → estimasi.

| # | Item | Prioritas | Estimasi | Catatan |
|---|------|-----------|----------|--------|
| 1 | Refresh token JWT | MEDIUM | 1-2 sesi | Access 15m + refresh 7d + rotation. Perlu sebelum publish. |
| 2 | Nonce-based CSP | LOW | 1 sesi | Header CSP strict + nonce. Bisa ditunda. |
| 3 | WA/Email urgent alert | LOW | 2-3 sesi | PWA push dulu; WA opsional untuk notif urgent. |
| 4 | Event bus / message queue | VERY LOW | N/A | Overengineering untuk 48 kamar. Sequential cukup. |

**Gate:** Tidak ada — read-only.

---

### Fase F — UI/UX Sweep (Audit 2026-06-19) ✅ SELESAI

**Tujuan:** perbaiki temuan audit UI/UX full — aksesibilitas, feedback, routing, kontras, polish. **Selesai 2026-06-19 — 10 task.**

**Rujukan:** `docs/M07_PUBLIK_GROWTH.md` → Audit UI/UX Full 2026-06-19.

**Gate:** `cd frontend && npm run build` PASS.

| ID | Task | File Kunci |
|----|------|------------|
| UX-404 | Route 404 NotFoundPage + wildcard route | `NotFoundPage.tsx`, `App.tsx` |
| UX-TOAST | ToastProvider feedback global (success/danger/warning) | `ToastProvider.tsx`, `main.tsx`, `SimpleCrudPage.tsx` |
| UX-A11Y-PASSWORD | SVG icon ganti emoji + aria-label + tabIndex dihapus | `PasswordInput.tsx` |
| UX-A11Y-SKIPLINK | Skip-to-content link + CSS + id main-content | `AppLayout.tsx`, `01-base.css` |
| UX-COLOR | Kontras WCAG AA — `--text-muted` #64748b→#475569 | `01-base.css`, `04-operations.css` |
| UX-LOGOUT | Konfirmasi `window.confirm` sebelum logout | `AppLayout.tsx` (2 tombol logout) |
| UX-SEARCH-TENANT | GlobalSearch buka untuk tenant (invoice + tiket sendiri) | `GlobalSearch.tsx` |
| UX-SKELETON | StatCardSkeleton width 100% ikuti container | `SkeletonLoader.tsx` |
| UX-OVERSCROLL | Hapus `overscroll-behavior-y: none` → pull-to-refresh mobile | `01-base.css` |
| UX-LOGIN-FORMAT | Validasi format input (email vs HP) di LoginPage | `LoginPage.tsx` |

> **Detail implementasi lengkap:** lihat changelog `docs/M11_CHANGELOG.md` atau commit history (2026-06-19).
> **JANGAN kerjakan ulang** — semua task Fase F sudah `[x]`.

---

### Fase G — AI Owner/Admin Approval Copilot (DeepSeek/API AI berbayar) 🆕

**Tujuan:** AI membantu Owner/Admin membaca data, membuat analisa, dan menyiapkan draft keputusan. AI tidak menjadi autopilot. Semua fitur AI aktif hanya setelah tombol manual ditekan oleh Owner/Admin, lalu hasilnya ditampilkan untuk disetujui/diedit/ditolak manusia.

**Rujukan wajib sebelum coding:** `docs/M12_AI_OWNER_ADMIN.md` (utama) · `docs/M02_KEPUTUSAN_OWNER.md` D-23 · `docs/M04_KEUANGAN.md` · `docs/M05_SIKLUS_HUNI.md` · `docs/M06_OPERASIONAL.md` · `docs/M07_PUBLIK_GROWTH.md` · `docs/M08_DEPLOY_GO_LIVE.md` · `docs/M09_AUDIT.md` · `docs/CODEMAP.md`.

**Status:** baru. Kerjakan **G0 dulu** sebelum G1-G8 — G0 adalah PONDASI (deepseek.client upgrade + modul owner-ai + komponen UI). **G9 [SCHEMA] opsional** dan harus berhenti sampai owner approve.

**Panduan file exist vs new (untuk AI lemah):**

| Target | Status | Jangan |
|--------|--------|--------|
| `backend/src/modules/market-analysis/deepseek.client.ts` | ✏️ EDIT (upgrade) | Jangan hapus market-analysis |
| `backend/src/modules/owner-ai/` | ✨ BUAT BARU (folder kosong) | — |
| `backend/src/modules/ai/` | 🔒 READ-ONLY (rule-based, NO DeepSeek) | JANGAN tambah DeepSeek call ke sini |
| `frontend/src/components/ai/AiAssistButton.tsx` | ✏️ EDIT (upgrade) | Jangan hapus, keep backward compat |
| `frontend/src/api/ai.ts` | ✏️ EDIT (tambah endpoint) | — |
| `frontend/src/api/ownerAi.ts` | ✨ BUAT BARU | — |
| `backend/.env.production.example` | ✏️ EDIT (tambah env Fase G) | — |
| `backend/src/app.module.ts` | ✏️ EDIT (import OwnerAiModule) | Jangan hapus import lain |
| `backend/prisma/schema.prisma` | 🧬 JANGAN SENTUH (kecuali G9 + approval) | — |
| Semua file `*test*` / `*.spec.ts` | 🔒 JANGAN UBAH | Tambah test baru boleh |

#### Kontrak Global Fase G

1. **Manual button only:** tidak ada panggilan AI dari page load, React Query auto-fetch, cron, auto-ops, interval, hover, route enter, atau prefetch.
2. **Owner/Admin only:** tombol AI berbayar hanya muncul untuk OWNER/ADMIN. Tenant dan Staff tidak boleh melihat tombol AI DeepSeek.
3. **Draft/rekomendasi saja:** AI boleh mengisi draft form, memberi confidence, warning, dan payload usulan. Aksi final tetap tombol manusia.
4. **Tidak ada direct mutation:** AI endpoint tidak boleh langsung membuat/mengubah `PaymentSubmission`, `Invoice`, `JournalEntry`, `Expense`, `InventoryMovement`, `Tenant`, `Room`, `Stay`, `Ticket`, atau status KTP. Endpoint AI hanya return JSON.
5. **Guard deterministik menang:** no-partial payment, trial balance, deposit guard, period close, stock guard, room/stay state machine, dan PDP gate tetap ditentukan service existing.
6. **Hemat token:** backend mengirim snapshot ringkas, bukan dump table. Pakai ID, kode kamar, status, nominal agregat, tanggal penting, dan top risk. Hindari email, nomor HP, NIK penuh, foto, alamat lengkap, dan catatan panjang kecuali task benar-benar butuh.
7. **OCR aman:** gambar KTP/bukti/nota diproses lokal dulu bila memungkinkan. DeepSeek menerima teks OCR ringkas, bukan file gambar KTP. Untuk KTP, mask NIK di prompt kecuali validator butuh 16 digit untuk cek format.
8. **Audit wajib:** saat manusia memakai rekomendasi AI untuk aksi final, tulis `AuditLog.meta.ai` minimal: `feature`, `model`, `promptHash`, `snapshotHash`, `confidence`, `recommendedAction`, `humanDecision`, `actorId`, `createdAt`.
9. **Fallback offline:** jika `DEEPSEEK_API_KEY` kosong/error/rate-limit, UI menampilkan fallback rule-based atau pesan non-blocking. Data bisnis tidak berubah.
10. **Model saat ini:** default baru gunakan `deepseek-v4-flash`; finance mendalam gunakan `deepseek-v4-pro`. Jangan membuat default baru ke `deepseek-chat`/`deepseek-reasoner`.

#### Pola Implementasi Wajib

- **Backend target:** buat modul baru `backend/src/modules/owner-ai/` untuk fitur G1-G8. Boleh reuse helper `backend/src/modules/market-analysis/deepseek.client.ts`, tetapi G0 harus mengubah helper itu menjadi aman untuk JSON, usage, model env, timeout, dan fallback.
- **Frontend target:** pakai/upgrade `frontend/src/components/ai/AiAssistButton.tsx` atau buat komponen baru di `frontend/src/components/ai/` seperti `AiApprovalDrawer`, `AiDraftPanel`, `AiConfidenceBadge`, `AiCostHint`.
- **API client target:** tambah `frontend/src/api/ownerAi.ts`. Jangan menaruh API key di frontend.
- **Envelope response:** semua endpoint AI mengembalikan `{ mode, feature, model, generatedAt, snapshotHash, promptHash, confidence, warnings, result, usage?, fallback? }`.
- **Approval pattern:** panel hasil AI punya tombol seperti `Gunakan Draft`, `Salin ke Form`, `Approve dengan Data Ini`, `Tolak`, atau `Minta Analisa Ulang`. Tombol approve harus memanggil endpoint domain existing, bukan endpoint AI.
- **Cache/token:** cache boleh berdasarkan `feature + snapshotHash + actorId` TTL pendek. Jangan cache data yang berisi NIK penuh atau OCR KTP mentah.
- **UI copy:** jangan klaim AI "pasti benar". Pakai copy singkat: "Bantuan AI", "Perlu review manusia", "Data tidak berubah sebelum disetujui".

#### G0 — AI-SAFETY-FOUNDATION

- [x] **G0 / AI-SAFETY-FOUNDATION:** rapikan fondasi DeepSeek agar semua fitur berikutnya aman, hemat token, dan manual-only.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` bagian G0, `docs/M08_DEPLOY_GO_LIVE.md` env Fase G, `docs/CODEMAP.md`.
  - **Anchor backend:** `backend/src/modules/market-analysis/deepseek.client.ts` ✏️ [EDIT] · `backend/src/modules/market-analysis/market-analysis.service.ts` 🔒 [READ-ONLY, backward compat check] · `backend/src/modules/ai/ai.service.ts` 🔒 [READ-ONLY, referensi rate-limit pattern saja, JANGAN diedit] · `backend/src/modules/audit-log/` 🔒 [READ-ONLY, referensi AuditLog.meta] · `backend/src/app.module.ts` ✏️ [EDIT].
  - **Anchor frontend:** `frontend/src/components/ai/AiAssistButton.tsx`, `frontend/src/api/ai.ts`, `frontend/src/pages/marketing/MarketAnalysisPage.tsx`.
  - **Langkah detail:**
    1. Ubah default model DeepSeek menjadi `process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'`.
    2. Tambah opsi `model`, `responseFormatJson`, `maxTokens`, `timeoutMs`, `feature`, dan `actorId` pada helper chat.
    3. Bila `responseFormatJson=true`, kirim `response_format: { type: 'json_object' }` dan validasi hasil JSON di service pemanggil.
    4. Ambil `usage` dari response DeepSeek jika tersedia; jangan crash bila tidak ada.
    5. Hitung `promptHash` dari messages yang sudah diminimalkan dan `snapshotHash` dari data bisnis sebelum prompt.
    6. Tambah guard env: `AI_FEATURES_ENABLED`, `AI_MANUAL_ONLY`, `AI_OWNER_ADMIN_ONLY`, `AI_DAILY_REQUEST_LIMIT`, `AI_MAX_INPUT_CHARS`, `AI_MAX_OUTPUT_TOKENS`, `AI_FINANCE_MAX_OUTPUT_TOKENS`.
    7. Tambah endpoint status aman `GET /owner-ai/status` untuk OWNER/ADMIN: configured true/false, enabled true/false, model, limit tersisa. Jangan bocorkan API key.
    8. Pastikan integrasi lama `/market-analysis` tetap jalan atau fallback offline.
  - **Gate:** `cd backend; npx tsc --noEmit`; `cd frontend; npm run build`; smoke manual `/market-analysis/status` dan `/owner-ai/status`.
  - **Jangan:** jangan tambah dependency npm, jangan ubah schema, jangan panggil AI otomatis dari halaman.

#### G1 — OWNER-BRIEF-AI

- [x] **G1 / OWNER-BRIEF-AI:** tombol "Ringkas Kondisi Bisnis dengan AI" di Kokpit Owner.
  - **Tujuan:** Owner menekan tombol, AI membaca snapshot ringkas bisnis hari ini, lalu memberi prioritas 3-7 poin.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G1, `docs/M02_KEPUTUSAN_OWNER.md`, `docs/M04_KEUANGAN.md`, `docs/M06_OPERASIONAL.md`.
  - **Anchor backend:** `OwnerDashboardPage` data source, `finance.service.ts`, `reports.service.ts`, `tickets.service.ts`, `payment-submissions.service.ts`, `settings.service.ts`.
  - **Anchor frontend:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`, `frontend/src/components/ai/`.
  - **Snapshot minimal:** okupansi, kamar kosong/maintenance, invoice overdue agregat, pending payment count, ticket urgent/open, meter due, readiness score, top 5 risiko. Jangan kirim daftar tenant lengkap.
  - **Output AI:** `executiveSummary`, `topRisks[]`, `recommendedActions[]`, `watchlist[]`, `missingData[]`, `confidence`.
  - **UI:** hasil tampil di panel/drawer; tombol `Refresh Analisa AI` manual; tidak auto-refresh saat dashboard dibuka.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/brief.prompt.ts` ✨ [NEW]: export `buildBriefPrompt(snapshot)` → return `ChatMsg[]` (system prompt tetap + JSON schema + data snapshot).
    2. Di `OwnerAiService`: tambah method `buildBriefSnapshot()` → query Prisma: room count by status, invoice overdue (sum + count), pending payments, open tickets, meter missing, readiness score.
    3. Di `OwnerAiService`: tambah method `generateBrief(actorId)` → rate-limit check → build snapshot → `stableHash(snapshot)` → panggil `deepseekChat(messages, { json: true })` → parse JSON → return `AiResult<BriefOutput>`.
    4. Fallback: bila API gagal/disabled, return ringkasan rule-based dari snapshot mentah (tanpa AI).
    5. Di `OwnerAiController`: tambah `POST /owner-ai/brief` → guard `@Roles(OWNER)` → panggil service.
    6. Di `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`: import `AiAssistButton` + `AiResultPanel` → tambah tombol "Buat Brief AI" di bawah status cards → onClick POST → render panel hasil.
    7. Tombol disabled bila `configured=false` (cek dari `GET /owner-ai/status`).
  - **Gate:** backend tsc, frontend build, UAT role: OWNER bisa, ADMIN hanya jika diputuskan boleh di M12, STAFF/TENANT 403 dan tombol tidak muncul.

#### G2 — FINANCE-AI-ANALYST

- [x] **G2 / FINANCE-AI-ANALYST:** analis keuangan mendalam untuk Owner.
  - **Tujuan:** AI membantu membaca trial balance, P&L, cashflow, rasio, readiness, deposit reconciliation, dan aging piutang dari data terkini sistem.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G2, `docs/M04_KEUANGAN.md`, `docs/M09_AUDIT.md`.
  - **Anchor backend:** `backend/src/modules/finance/`, `backend/src/modules/accounting/`, `backend/src/modules/reports/`, helper trial balance/cashflow/ratios.
  - **Anchor frontend:** `frontend/src/pages/finance/AccountingSetupPage.tsx`, komponen accounting reports.
  - **Snapshot minimal:** agregat per periode, bukan seluruh jurnal. Sertakan akun abnormal/top variance/top overdue/top expense category.
  - **Output AI:** `healthScore`, `cashflowAnalysis`, `profitabilityAnalysis`, `riskFindings[]`, `anomalyChecks[]`, `nextActions[]`, `questionsForOwner[]`.
  - **Approval:** AI tidak punya tombol posting jurnal. Jika ada saran koreksi, tampilkan sebagai checklist manual untuk Owner.
  - **Gate uang:** `cd backend; npx tsc --noEmit`; `cd backend; node --test "test/**/*.test.js"`; frontend build bila ada UI.
  - **Jangan:** jangan mengubah `JournalEntry`, `Invoice`, `InvoicePayment`, `Expense`, `AccountingPeriod`, `OpeningBalance`, atau `CashAccount`.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/finance.prompt.ts` ✨ [NEW]: system prompt tetap + JSON schema + business rules (no-partial, TB invariant, deposit liability).
    2. Di `OwnerAiService`: tambah method `buildFinanceSnapshot()` → panggil service TB, P&L, cashflow, ratios, readiness, deposit reconciliation (JANGAN reimplementasi — panggil fungsi service existing).
    3. Di `OwnerAiService`: tambah method `analyzeFinance(actorId)` → rate-limit → snapshot → hash → `deepseekChat(..., { json: true, model: env.DEEPSEEK_FINANCE_MODEL })` → parse → return.
    4. Fallback: jika API gagal, return `{ mode: "RULE_FALLBACK", warnings: ["AI tidak tersedia, silakan review manual"] }` — JANGAN buat analisa palsu.
    5. Di `OwnerAiController`: tambah `POST /owner-ai/finance/analyze` → guard `@Roles(OWNER)`.
    6. Di halaman accounting (cari `frontend/src/pages/finance/`): tambah tombol "Analisa Keuangan AI" → hasil tampil di drawer dengan `AiResultPanel`.
    7. Gate UANG: `cd backend && node --test "test/**/*.test.js"` HARUS HIJAU — pastikan tidak ada side effect ke ledger.

#### G3 — PAYMENT-REVIEW-AI

- [x] **G3 / PAYMENT-REVIEW-AI:** asisten review bukti pembayaran untuk Admin/Owner.
  - **Tujuan:** di modal review pembayaran, Admin menekan "Bantu Review AI"; AI memberi rekomendasi `APPROVE`, `REJECT`, atau `ASK_MORE_INFO`.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G3, `docs/M04_KEUANGAN.md`, `docs/M05_SIKLUS_HUNI.md`.
  - **Anchor backend:** `backend/src/modules/payment-submissions/` 🔒 [READ-ONLY, baca data saja] · `backend/src/modules/ai/ai.service.ts` 🔒 [READ-ONLY, `analyzePaymentProof` rule-based existing — JANGAN diedit, buat versi DeepSeek BARU di `owner-ai/`] · `invoice-payments.service.ts` 🔒 [READ-ONLY, baca data saja].
  - **Anchor frontend:** `frontend/src/pages/payments/PaymentReviewPage.tsx`, `frontend/src/components/payments/ReviewPaymentModal.tsx`, `frontend/src/api/ai.ts`.
  - **Input minimal:** submissionId, invoiceId, expected amount, submitted amount, paidAt, sender/ref text, OCR text jika ada. Jangan kirim file bukti langsung ke DeepSeek untuk tahap ini.
  - **Output AI:** `recommendedAction`, `confidence`, `matches[]`, `warnings[]`, `reason`, `suggestedAdminNote`.
  - **Approval:** tombol approve/reject tetap endpoint existing `payment-submissions`. Saat manusia approve/reject setelah memakai AI, catat `AuditLog.meta.ai`.
  - **Gate uang:** backend tsc + unit uang, frontend build. UAT: nominal kurang tetap tidak bisa approve meski AI menyarankan approve.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/payment-review.prompt.ts` ✨ [NEW]: system prompt + JSON schema + deterministic rules (no-partial, allowed amounts).
    2. Di `OwnerAiService`: tambah method `reviewPaymentSubmission(submissionId, actorId)` → ambil data submission + invoice + stay dari service existing → validasi no-partial dulu SEBELUM panggil AI → jika nominal tidak sah, langsung return `{ recommendation: "REJECT", reason: "Nominal tidak sesuai aturan no-partial" }` TANPA panggil AI.
    3. Jika nominal valid, panggil `deepseekChat` dengan snapshot → parse JSON → return rekomendasi.
    4. Di `OwnerAiController`: tambah `POST /owner-ai/payment-submissions/:id/review-draft` → guard OWNER/ADMIN.
    5. Di `frontend/src/pages/payments/PaymentReviewPage.tsx`: tambah tombol "Bantu Review AI" di modal review (cari modal yang dipakai untuk approve/reject) → tampil `AiResultPanel` dengan rekomendasi.
    6. Saat admin klik "Setujui" setelah pakai AI: endpoint approve existing jalan + catat `AuditLog.meta.ai` dengan field minimal dari M12 Audit Trail.

#### G4 — EXPENSE-OCR-DRAFT

- [x] **G4 / EXPENSE-OCR-DRAFT:** OCR nota biaya menjadi draft expense.
  - **Tujuan:** Admin/Owner upload/foto nota, OCR lokal membaca teks, AI menormalkan menjadi draft expense yang bisa diedit sebelum simpan.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G4, `docs/M04_KEUANGAN.md`, `docs/M06_OPERASIONAL.md`.
  - **Anchor backend:** `backend/src/modules/expenses/expenses.service.ts`, `backend/src/modules/expenses/expenses.controller.ts`.
  - **Anchor frontend:** halaman resource/expense, `frontend/src/pages/resources/`, `frontend/src/components/ai/`, lazy import `tesseract.js` seperti `GuestBookingForm`.
  - **Flow wajib:** file → OCR di browser → user lihat teks OCR → tombol "Rapikan Draft AI" → AI return draft → user edit → user klik "Simpan Expense" endpoint existing.
  - **Output AI:** `date`, `vendor`, `amountRupiah`, `categorySuggestion`, `description`, `taxOrFeeWarning`, `confidence`, `needsHumanCheck[]`.
  - **Gate uang:** backend tsc, unit uang, frontend build. UAT: draft tidak membuat jurnal sampai expense disimpan lewat flow existing.
  - **Jangan:** jangan posting expense/jurnal otomatis, jangan simpan OCR mentah panjang kecuali user eksplisit menyimpan catatan.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/expense-ocr.prompt.ts` ✨ [NEW]: system prompt untuk normalisasi teks OCR → field expense (date, vendor, amount, category, description).
    2. Di `OwnerAiService`: tambah method `draftExpenseFromOcr(ocrText, actorId)` → validasi input ≤ `AI_MAX_INPUT_CHARS` → panggil `deepseekChat` → parse JSON → return draft expense.
    3. Di `OwnerAiController`: tambah `POST /owner-ai/expenses/receipt-draft` → guard OWNER/ADMIN.
    4. Buat `frontend/src/components/expenses/ExpenseReceiptUpload.tsx` ✨ [NEW]: lazy import `tesseract.js` (pola dari `GuestBookingForm.tsx`) → OCR di browser → tampilkan teks OCR → tombol "Rapikan Draft AI" → panggil endpoint → tampilkan form prefill.
    5. User edit form → klik "Simpan Expense" → panggil endpoint `POST /expenses` EXISTING (jangan buat endpoint baru untuk simpan).
    6. JANGAN auto-create expense/jurnal dari AI.

#### G5 — KTP-OCR-VALIDATOR

- [x] **G5 / KTP-OCR-VALIDATOR:** validator teks OCR KTP untuk Admin/Owner. **SELESAI 2026-06-19** — `POST /owner-ai/tenants/:id/ktp-ocr-validate` (OWNER/ADMIN); PDP: hanya TEKS (gambar/base64 ditolak), NIK ter-mask di prompt & hasil; cek deterministik backend-menang + demografi dari NIK (tgl lahir/gender) tanpa AI; DeepSeek json + fallback rule-based; `KtpOcrValidateCard` (OCR lokal, gating role+configured) di StepTenantSelect; verifikasi final tetap tombol existing. Gate: backend tsc 0, frontend tsc 0.
  - **Tujuan:** membantu cek format NIK/nama/tanggal lahir dari hasil OCR, bukan mengganti verifikasi manusia.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G5, `docs/M05_SIKLUS_HUNI.md`, `docs/M07_PUBLIK_GROWTH.md`.
  - **Anchor frontend:** `frontend/src/pages/bookings/GuestBookingForm.tsx`, `frontend/src/utils/ktpOcr.ts`, `StayDetailPage`/tenant KTP card.
  - **Anchor backend:** `backend/src/modules/tenants/tenants.service.ts`, endpoint upload/verifikasi KTP existing.
  - **Flow wajib:** gambar KTP tetap di flow existing; OCR gambar lokal; AI hanya menerima teks OCR yang sudah diminimalkan; hasil AI tampil sebagai warning/checklist.
  - **Output AI:** `normalizedName`, `nikFormatValid`, `birthDateGuess`, `fieldWarnings[]`, `manualReviewRequired`, `confidence`.
  - **Approval:** status KTP/tenant tetap diverifikasi dengan tombol Owner/Admin existing.
  - **PDP:** jangan kirim foto KTP ke DeepSeek. Jangan tampilkan NIK penuh di prompt log. Mask minimal `************1234` di audit.
  - **Gate:** backend tsc bila ada endpoint, frontend build, UAT role + PDP.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/ktp-ocr.prompt.ts` ✨ [NEW]: system prompt untuk ekstrak NIK/nama/tglLahir dari teks OCR — JANGAN minta gambar.
    2. Di `OwnerAiService`: tambah method `validateKtpOcr(ocrText, tenantId, actorId)` → validasi input tidak mengandung base64/image → mask NIK jadi `************1234` di prompt → panggil `deepseekChat` → return normalisasi + match warnings.
    3. Di `OwnerAiController`: tambah `POST /owner-ai/tenants/:id/ktp-ocr-validate` → guard OWNER/ADMIN.
    4. Di frontend (cari halaman verifikasi tenant / `StayDetailPage` / `GuestBookingForm`): tambah tombol "Bantu Validasi KTP" — kirim teks OCR (BUKAN gambar) → hasil tampil sebagai checklist warning.
    5. Verifikasi final tetap tombol Owner/Admin existing — AI TIDAK auto-verify.

#### G6 — OPS-INVENTORY-AI

- [x] **G6 / OPS-INVENTORY-AI:** **SELESAI 2026-06-19** — asisten operasional tiket dan stok.
  - **Tujuan:** Admin/Owner menekan tombol pada tiket/gudang untuk mendapat ringkasan prioritas, saran barang pengganti, dan draft catatan follow-up.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G6, `docs/M06_OPERASIONAL.md`, `docs/CODEMAP.md`.
  - **Anchor backend:** `backend/src/modules/tickets/`, `backend/src/modules/inventory-items/`, `backend/src/modules/inventory-movements/`, `backend/src/modules/rooms/`.
  - **Anchor frontend:** `frontend/src/pages/tickets/TicketsPage.tsx`, `frontend/src/pages/resources/InventoryShellPage.tsx`, resource detail modal.
  - **Snapshot minimal:** ticket id/type/priority/status/age, room code, related facility, stock summary by category, recent movements. Jangan kirim catatan tenant panjang kecuali relevan.
  - **Output AI:** tiket `{ summary, recommendedAction, priority, suggestedNote, riskFlags[] }`; stok `{ lowStockItems[], purchaseSuggestions[], warnings[] }`; laporan staf `{ summary, recommendedDecision, priority, suggestedAdminNote, suggestedMovement, riskFlags[] }`.
  - **Approval:** AI tidak boleh membuat inventory movement, menutup tiket, mengubah status kamar, atau assign staff. Admin/Owner klik action existing.
  - **Gate:** backend tsc, frontend build, UAT STAFF tidak melihat tombol AI.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/ops-inventory.prompt.ts` ✨ [NEW]: system prompt untuk 3 domain (tiket / inventory / field-report) — masing-masing dengan JSON schema output.
    2. Di `OwnerAiService`: tambah 3 method: `draftTicketAction(ticketId, actorId)`, `draftReorder(actorId)`, `reviewFieldReport(reportId, actorId)` → masing-masing query data dari service existing (tickets, inventory-items, inventory-movements, rooms).
    3. Di `OwnerAiController`: tambah 3 endpoint: `POST /owner-ai/tickets/:id/action-draft`, `POST /owner-ai/inventory/reorder-draft`, `POST /owner-ai/staff-field-reports/:id/review-draft` → guard OWNER/ADMIN.
    4. Di `frontend/src/pages/tickets/TicketsPage.tsx`: tambah tombol "Saran AI" di ticket detail → tampil rekomendasi, tapi action tetap manual.
    5. Di `frontend/src/pages/resources/InventoryShellPage.tsx`: tambah tombol "Cek Stok AI" → tampil saran pembelian, tapi movement/purchase tetap manual.
    6. AI TIDAK membuat inventory movement, menutup tiket, mengubah status kamar, atau assign staff.

#### G7 — AI-SETTINGS-BUDGET-OBSERVABILITY

- [x] **G7 / AI-SETTINGS-BUDGET:** halaman setting dan observability biaya AI. **SELESAI 2026-06-19** — `getUsageStats()` (per-feature in-memory) + `recentAiAudit()` (AuditLog.meta.ai via jsonb_exists) + `getUsageOverview()`; `GET /owner-ai/usage` & `POST /owner-ai/test-connection` (OWNER only, latency+model, tanpa bocor API key). Tab "AI & Biaya" di OwnerSettingsPage: status (configured/enabled/manual-only/model/limit), tes koneksi, usage per fitur, 20 jejak audit AI terakhir. Gate: backend tsc 0, frontend tsc 0, build lulus.
  - **Tujuan:** Owner tahu AI aktif/tidak, model, limit harian, estimasi penggunaan, dan fitur mana yang paling sering dipakai.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G7, `docs/M08_DEPLOY_GO_LIVE.md`, `docs/M09_AUDIT.md`.
  - **Anchor backend:** `settings.service.ts`, `audit-log`, `owner-ai/status`.
  - **Anchor frontend:** `frontend/src/pages/settings/OwnerSettingsPage.tsx`.
  - **UI minimal:** status API key configured, AI enabled flag, manual-only flag, daily request remaining, model default, model finance, last 20 AI audit logs.
  - **Data source:** env + `OperationalSetting` bila sudah ada pola setting. Jika butuh schema baru untuk usage ledger, STOP dan jadikan bagian G9.
  - **Gate:** backend tsc, frontend build, UAT API key tidak pernah tampil di response.
  - **Langkah detail:**
    1. Di `OwnerAiService`: tambah method `getUsageStats()` → hitung dari in-memory counter (G0 sudah setup rate-limit per actor) → return `{ todayTotal, byFeature: { feature: count }, remainingDaily }`.
    2. Di `OwnerAiController`: tambah `GET /owner-ai/usage` → guard OWNER only.
    3. Di `OwnerAiController`: tambah `POST /owner-ai/test-connection` → panggil `deepseekChat` dengan prompt "OK" (1 token) → return latency + model — guard OWNER only.
    4. Di `frontend/src/pages/settings/OwnerSettingsPage.tsx`: tambah tab "AI & Biaya" → tampilkan: status API key, AI enabled, model default, model finance, daily limit, remaining, usage by feature, last 20 AI audit logs dari `AuditLog.meta.ai`.
    5. Pastikan response TIDAK PERNAH mengandung `DEEPSEEK_API_KEY` atau secret apapun.

#### G8 — AI-FAQ-MANUAL-GENERATOR

- [x] **G8 / AI-FAQ-MANUAL-GENERATOR:** generator draft FAQ/manual publik/tenant dari data sistem.
  - **Tujuan:** Owner/Admin menekan tombol untuk membuat draft FAQ, copy layanan, atau ringkasan aturan berdasarkan setting dan data layanan existing.
  - **Rujukan:** `docs/M12_AI_OWNER_ADMIN.md` G8, `docs/M07_PUBLIK_GROWTH.md`, `docs/M05_SIKLUS_HUNI.md`.
  - **Anchor backend:** `settings`, `additional-services`, `public/marketing` modules.
  - **Anchor frontend:** `OwnerSettingsPage`, halaman marketing/settings terkait.
  - **Snapshot minimal:** daftar layanan aktif, aturan kost, jam operasional, kebijakan pembayaran/checkout ringkas. Jangan kirim data tenant.
  - **Output AI:** `faqItems[]`, `publicCopyDraft`, `tenantManualDraft`, `warnings[]`.
  - **Approval:** draft hanya disalin ke form. Publish/simpan tetap tombol Owner/Admin existing.
  - **Gate:** backend tsc bila ada endpoint, frontend build.
  - **Langkah detail:**
    1. Buat `backend/src/modules/owner-ai/prompts/faq.prompt.ts` ✨ [NEW]: system prompt berisi ATURAN BISNIS yang dikurasi manual (dari M02/M04/M05/M06 — hardcode di file prompt, JANGAN baca file MD runtime).
    2. Di `OwnerAiService`: tambah method `generateFaqDraft(actorId)` → ambil data layanan aktif dari service additional-services → gabung dengan aturan bisnis hardcoded → panggil `deepseekChat` → return `faqItems[]`, `publicCopyDraft`, `tenantManualDraft`.
    3. Di `OwnerAiController`: tambah `POST /owner-ai/faqs/generate-draft` → guard OWNER only.
    4. Di frontend halaman FAQ/settings: tambah tombol "Generate Draft FAQ" → hasil tampil sebagai checklist → Owner pilih item → klik "Simpan FAQ terpilih" → panggil endpoint FAQ/settings EXISTING.
    5. JANGAN auto-overwrite FAQ existing.

#### G9 — AI-DRAFT-QUEUE [SCHEMA] OPSIONAL

- [x] **G9 / AI-DRAFT-QUEUE** 🧬 **[SCHEMA][OWNER]:** **SELESAI 2026-06-19** (schema S-6 owner-approved). Model `AiDraft`+enum `AiDraftStatus` (migration `20260619140000_ai_draft_queue`, additive). Modul terpisah `ai-draft.service.ts`+`ai-draft.controller.ts` (hindari file owner-ai kontensi): `POST/GET /owner-ai/drafts`, `GET :id`, `POST :id/review` (APPLIED/REJECTED), `POST run/expire` (retention `AI_DRAFT_RETENTION_DAYS`=60). FE: `api/aiDrafts.ts` + tombol "Simpan sebagai draft" di `AiResultPanel` (dipakai KtpOcrValidateCard) + tab "Antrean Draft AI" di OwnerSettings (review queue). PDP: resultJson sudah bersih dari sumbernya (NIK ter-mask). Gate: backend tsc 0, frontend tsc 0, build lulus.
  - **Tujuan:** menyimpan draft AI lintas fitur agar Owner/Admin bisa review, approve, reject, dan audit dari satu antrean.
  - **Kapan dibutuhkan:** jika G1-G8 butuh persist draft lintas sesi, histori revisi, atau approval queue khusus.
  - **Schema usulan:** `AiDraft(id, feature, actorId, status, sourceType, sourceId, snapshotHash, promptHash, model, confidence, inputSummaryJson, resultJson, humanDecision, decidedById, decidedAt, createdAt, updatedAt)`.
  - **Status:** `DRAFT`, `APPLIED`, `REJECTED`, `EXPIRED`.
  - **Aturan:** additive migration saja; tidak mengganti `AuditLog`; tidak menyimpan foto KTP atau bukti bayar mentah; retention 30-90 hari.
  - **STOP:** sebelum edit `schema.prisma`/migration, lapor ke owner dan minta approval eksplisit.

---

### Fase H — UI/UX Compact Owner ↔ Admin

**Tujuan:** menyederhanakan UI Owner & Admin dengan menghilangkan redundansi dan duplikasi, BUKAN menghilangkan fitur. Semua fitur tetap bisa diakses; hanya tampilan yang lebih compact.

> **⚠️ REVISI FINAL 2026-06-20 — rencana otoritatif = `docs/M13_FASE_H_UIUX_COMPACT.md` (H1–H5).** Outline H1–H6 di bawah ini adalah draf lama; ikuti M13 bila berbeda. Yang **DIKERJAKAN & SELESAI** (build+tsc PASS): H1 sidebar owner 18→7 item (1 grup "Keputusan Owner"; loss-refunds & assets digabung via `activePaths` Akuntansi&Aset; users+layanan+minat via `activePaths` Akun&Layanan), H2 dashboard admin 6→3 area (Ringkasan·Penghuni&Uang·Operasional di `DashboardAdmin.tsx`+`RoleWorkspaceTabs.tsx`), H3 merge Minat→Layanan (via activePaths), H4 hapus duplikat finance (auto via H1), H5 polish responsive tab (`12-owner.css`). Pengumuman dipindah ke tombol 📣 topbar utk owner-Kokpit (`AppLayout.tsx`).
> **DI-DEFER (di luar scope M13, owner belum minta):** "Unifikasi AI Panel admin" & "Owner Dashboard compact mode" & "hapus CSS dead" (lihat H4/H5/H6 draf lama). Keputusan #5 M13: AI panel TIDAK diubah (biaya AI).

**Rujukan:** `docs/M13_FASE_H_UIUX_COMPACT.md` (spesifikasi LENGKAP — baca penuh sebelum kerjakan) · `docs/M02_KEPUTUSAN_OWNER.md` · `docs/M07_PUBLIK_GROWTH.md` · `docs/CODEMAP.md`.

**Anchor kode:** `navigation.ts` · `AppLayout.tsx` · `DashboardAdmin.tsx` · `AdminWorkspaces.tsx` · `RoleWorkspaceTabs.tsx` · `OwnerDashboardPage.tsx` · `12-owner.css`.

#### H1 — Compact Owner Sidebar (18 → 7 item) [x]  ← SELESAI 2026-06-20 (1 grup "Keputusan Owner"; per M13)

**Target:** `frontend/src/config/navigation.ts` — fungsi `ownerSections`.

**Langkah:**
1. Buka `frontend/src/config/navigation.ts`.
2. Cari `const ownerSections: NavigationSection[] = [` (sekitar baris 38).
3. Hapus SELURUH item dari grup `Operasional` KECUALI `Kokpit Owner`.
4. Pindahkan item yang masih relevan ke grup `Keputusan Owner` bila perlu, tapi JANGAN tambah item baru.
5. Hasil akhir: grup `Operasional` hanya berisi 1 item (`Kokpit Owner`). Grup `Keputusan Owner` = 6-7 item strategis.

**Item yang DIHAPUS dari sidebar owner (tetap bisa diakses via toggle 🔧 Area Admin):**
- Masa Sewa & Penghuni `/stays`
- Tagihan & Piutang `/invoices`
- Pengeluaran `/expenses`
- Pendapatan Tambahan `/ancillary-revenue`
- Kamar & Inventaris `/rooms`
- Kinerja Staff `/staff-performance`
- Pengumuman `/announcements`
- Minat Layanan `/service-interests`

**Item yang TETAP:**
- Kokpit Owner `/owner-dashboard`
- Laporan Bisnis `/reports`
- Analisa Pasar (AI) `/market-analysis`
- Akuntansi `/finance/accounting-setup`
- Aset & Depresiasi `/finance/assets`
- Loyalitas & Reward `/loyalty`
- Pengaturan `/settings`
- (opsional) Akun User `/users`

**Gate:** `cd frontend; npm run build` PASS. Cek: login sebagai OWNER → sidebar hanya tampil 1 grup pendek (2 grup total: "Operasional" dengan 1 item + "Keputusan Owner" dengan ~7 item). Toggle 🔧 Area Admin → sidebar tetap 6 item.

**JANGAN:** hapus route, hapus halaman, atau ubah `ownerAdminSections` (sidebar mode admin).

#### H2 — Compact Dashboard Tab (6 → 3 area) [x]  ← SELESAI 2026-06-20 (id area: overview/stays-finance/ops per M13; bukan 'today/stays/operations' draf lama)

**Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` + `frontend/src/components/workspace/RoleWorkspaceTabs.tsx`.

**Langkah:**
1. Buka `frontend/src/pages/dashboard/DashboardAdmin.tsx`.
2. Cari `const ADMIN_QUEUE_AREAS = [` (sekitar baris 52).
3. Ganti array 6 area dengan 3 area:
   ```ts
   const ADMIN_QUEUE_AREAS = [
     { id: 'today', label: 'Ringkasan', helper: 'Orientasi cepat: kondisi hari ini dan pekerjaan yang butuh keputusan.' },
     { id: 'stays', label: 'Penghuni & Uang', helper: 'Booking, pembayaran, tagihan, perpanjangan, dan keluar.' },
     { id: 'operations', label: 'Operasional', helper: 'Tiket, staff, kamar, dan stok.' },
   ];
   ```
4. Update fungsi `normalizeAdminArea` — ganti validasi area lama dengan 3 area baru.
5. Update fungsi `itemMatchesAdminArea` — `'operations'` cocokkan dengan pattern tiket/staff/rooms.
6. Update seluruh query `needs*Data` — gabungkan: `stays` + `finance` → 1 set query, `tickets` + `staff` + `rooms` → 1 set query.
7. Update `AdminOverviewCharts` — panel untuk area `stays` gabung stays+finance charts dalam 1 area.
8. Buka `frontend/src/components/workspace/RoleWorkspaceTabs.tsx`.
9. Update `buildAdminTabs` — ganti 6 tab jadi 3:
   ```ts
   { id: 'today', label: 'Ringkasan', to: base },
   { id: 'stays', label: 'Penghuni & Uang', to: `${base}?area=stays` },
   { id: 'operations', label: 'Operasional', to: `${base}?area=operations` },
   ```
10. Update `match` function tiap tab — `stays` match `/stays|/tenants|/renew-requests|/invoices|/payment-submissions|/expenses`, `operations` match `/tickets|/staff|/rooms|/inventory`.

**Gate:** `cd frontend; npm run build` PASS. UAT: login ADMIN → tab hanya 3 (Ringkasan | Penghuni & Uang | Operasional). Klik tab → data termuat sesuai area. Owner mode admin → sama.

**JANGAN:** hapus query, hapus komponen workspace (AdminStaysUnifiedList, AdminFinanceWorkspace, dll), atau ubah backend.

#### H3 — Merge "Minat Layanan" + "Layanan Tambahan" → 1 sidebar entry [x]  ← SELESAI 2026-06-20 (via activePaths "Akun & Layanan"; breadcrumb ServiceInterestsPage opsional, di-skip per M13)

**Target:** `frontend/src/config/navigation.ts`.

**Langkah:**
1. Buka `frontend/src/config/navigation.ts`.
2. Cari entry `Minat Layanan` (`/service-interests`) di `ownerSections`.
3. Hapus entry tersebut (sudah dihapus di H1 otomatis — pastikan benar-benar hilang dari sidebar owner).
4. Cari entry `Layanan Tambahan` (`/additional-services`) — pastikan hint-nya menyebut "kelola layanan & minat tenant".
5. Update `activePaths` untuk `/additional-services` agar menyertakan `/service-interests`:
   ```ts
   activePaths: ['/additional-services', '/service-interests']
   ```
6. Di `frontend/src/pages/services/ServiceInterestsPage.tsx`: tambah link/breadcrumb yang mengarah ke `/additional-services` sebagai parent context.

**Gate:** `npm run build` PASS. UAT: sidebar owner hanya 1 entry untuk layanan. Klik → bisa akses daftar layanan. Minat tenant tetap bisa diakses (via tab di halaman yang sama atau link terpisah).

**JANGAN:** hapus route `/service-interests`, hapus `ServiceInterestsPage`, atau ubah backend.

#### H4 — Unifikasi AI Panel (Owner + Admin) [x]  ← SELESAI 2026-06-20 (AiAssistButton di DashboardAdmin overview + AssistantPanel sinyal di OwnerDashboard bawah KPI; keduanya conditional — tidak memaksa AI selalu tampil)

**Target:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` + `frontend/src/pages/dashboard/DashboardAdmin.tsx`.

**Latar:** Owner dashboard punya `AiAssistButton` + DeepSeek; Admin dashboard punya `AssistantPanel` rules-based. Dua sistem berbeda untuk kebutuhan yang mirip: memberi ringkasan cerdas ke pengambil keputusan.

**Langkah:**
1. Di `DashboardAdmin.tsx`, cari `AssistantPanel` (sekitar baris 410-430).
2. TAMBAHKAN (jangan ganti) `AiAssistButton` di sebelah atau di bawah `AssistantPanel` untuk area `today`, dengan fitur brief ala G1 tapi untuk admin (pakai `generateBrief` atau endpoint baru `POST /owner-ai/brief` yang sudah ada).
3. Bungkus dalam conditional: hanya tampil jika `AI_FEATURES_ENABLED` (cek dari `GET /owner-ai/status`).
4. Hasil AI tampil di `AiResultPanel` (seperti di OwnerDashboard).
5. Di `OwnerDashboardPage.tsx`, TAMBAHKAN `AssistantPanel` di bawah KPI cards untuk menampilkan aksi urgent (seperti di admin dashboard).
6. Gunakan data yang sudah ada (signals, statusCards) — tidak perlu query baru.

**Gate:** `npm run build` PASS. UAT: Owner dashboard → ada aksi urgent + AI brief. Admin dashboard → AssistantPanel tetap + tombol AI muncul untuk ADMIN/OWNER (opsional, tergantung env).

**JANGAN:** hapus `AssistantPanel`, ganti endpoint AI, atau ubah backend.

#### H5 — Owner Dashboard: Kurangi Full-Page, Jadi Landing Strategis [x]  ← SELESAI 2026-06-20 (tren chart `.owner-trend-panel` disembunyikan di mode Ringkas; 3 quick-action buttons "Buka Laporan / Buka Area Admin / Analisa Pasar" ditambah setelah sinyal; OwnerDashboardPage.tsx)

**Target:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`.

**Latar:** Saat ini OwnerDashboard adalah halaman penuh dengan KPI + chart tren + AI. Tapi laporan detail ada di `/reports`, dan operasional ada di `/admin-dashboard`. Dashboard owner sebaiknya jadi halaman ringkas — KPI + sinyal + quick actions.

**Langkah:**
1. Buka `OwnerDashboardPage.tsx`.
2. Cari section tren chart (`owner-trend-panel`, sekitar baris 440-490).
3. Bungkus dalam conditional: hanya tampil di mode `full`, SEMBUNYIKAN di mode `compact`.
4. Di bawah sinyal "Butuh perhatian", tambah 2-3 quick-action button:
   - "Buka Laporan" → `/reports`
   - "Buka Area Admin" → `/admin-dashboard`
   - "Analisa Pasar" → `/market-analysis`
5. Pastikan mode compact menampilkan: KPI 4 kartu, status kokpit strip, sinyal urgent, AI brief (opsional), dan quick-action buttons.

**Gate:** `npm run build` PASS. UAT: mode compact → tidak ada chart tren. Mode full → chart tetap ada. Kedua mode tetap punya quick-action yang mengarah ke laporan/area admin.

**JANGAN:** hapus chart, hapus mode full, atau ubah backend.

#### H6 — Polish: Hapus CSS Dead + Selaraskan Responsive [x] SELESAI 2026-06-20

**Target:** `frontend/src/styles/12-owner.css` + `frontend/src/styles/08-admin.css`.

**Langkah:**
1. Buka `12-owner.css`.
2. Cari selector yang sudah tidak dipakai setelah H1-H5 (misal: `.owner-lane-*` yang mengacu ke sidebar item yang dihapus — hati-hati, jangan hapus yang masih dipakai komponen).
3. Hapus selector yang SUDAH PASTI tidak dipakai. Bila ragu, LEBIH BAIK TIDAK MENGHAPUS.
4. Buka `08-admin.css`.
5. Pastikan responsive breakpoint (≤768px, ≤834px, ≥1440px) untuk area dashboard baru (H2) tidak pecah.
6. Cek mobile: sidebar offcanvas toggle tetap berfungsi, area chip horizontal tidak overflow.

**Gate:** `npm run build` PASS. UAT: buka dashboard admin di 390px (mobile) — tidak ada overflow horizontal, semua konten bisa dibaca.

**JANGAN:** hapus CSS secara agresif. Jika selector muncul di search_content, jangan hapus.

---

#### UAT Global Fase H

Checklist wajib sebelum centang `[x]`:

- [ ] Login OWNER → sidebar Kokpit hanya 1 grup pendek (1+7 item).
- [ ] Toggle 🔧 Area Admin → sidebar 6 item, dashboard admin 3 tab.
- [ ] Login ADMIN → sidebar 6 item, dashboard admin 3 tab.
- [ ] Semua route `/stays`, `/invoices`, `/tickets`, `/rooms`, `/staff-performance`, `/announcements`, `/service-interests` tetap bisa dibuka (via sidebar admin atau URL langsung).
- [ ] Owner dashboard mode compact: tidak ada chart tren, ada quick-action buttons.
- [ ] Owner dashboard mode full: chart tren tetap ada.
- [ ] Mobile (390px): sidebar offcanvas toggle Kokpit/Area Admin berfungsi, tidak overflow.
- [ ] `npm run build` PASS.

---

### Fase I — Navigasi & Onboarding

**Tujuan:** menghilangkan duplikasi navigasi tersisa pasca Fase H, mengekspos rute tersembunyi, dan menambah orientasi untuk user baru.

> **Rencana otoritatif = `docs/M14_FASE_I_NAVIGASI_ONBOARDING.md` (I1–I6).** Semua perubahan frontend-only — tidak menyentuh backend, schema, atau API.

**Rujukan:** `docs/M14_FASE_I_NAVIGASI_ONBOARDING.md` (spesifikasi LENGKAP) · `docs/M02_KEPUTUSAN_OWNER.md` · `docs/M07_PUBLIK_GROWTH.md` · `docs/CODEMAP.md`.

**Anchor kode:** `DashboardAdmin.tsx` · `StaffTopWorkspaceNav.tsx` · `navigation.ts` · `AppLayout.tsx` · `TenantWorkspaceTabs.tsx`.

#### I1 — Hapus AdminAreaInternalMenu dari DashboardAdmin [x]

**Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`.

**Langkah:**
1. Hapus type `AdminAreaMenuItem` (dead code).
2. Hapus fungsi `AdminAreaInternalMenu` (dead code).
3. Hapus computed `activeAreaMenuItems` (~30 baris chip duplikat).
4. Hapus render call `<AdminAreaInternalMenu ... />` di JSX.
5. Update teks `AdminCommandHeader`: ganti "buka area lain dari chip atau sidebar" → "Gunakan sidebar kiri untuk membuka halaman detail."

**Gate:** `cd frontend; npm run build` PASS. UAT: dashboard admin TIDAK menampilkan sub-menu chip; navigasi via sidebar berfungsi normal.

#### I2 — Unifikasi StaffTopWorkspaceNav dengan staffSections [x]

**Target:** `frontend/src/components/staff/StaffTopWorkspaceNav.tsx` + `frontend/src/config/navigation.ts`.

**Langkah:**
1. Import `staffSections` dari `navigation.ts` di `StaffTopWorkspaceNav.tsx`.
2. Ganti array `links` hardcode dengan `staffSections[0].links` (single source of truth).
3. Update `counts` logic agar mencakup semua link (termasuk "Tugas" `/tickets`).
4. Pastikan `staffSections` di `navigation.ts` sudah mencakup `/tickets` (sudah ada).

**Gate:** `cd frontend; npm run build` PASS. UAT: StaffTopWorkspaceNav menampilkan 5 tab dari navigation.ts; count badge berfungsi.

#### I3 — Ekspos Rute Tersembunyi di Sidebar Admin [x]

**Target:** `frontend/src/config/navigation.ts`.

**Langkah:**
1. Cek `adminSections` → section "Keuangan": pastikan `activePaths` sudah mencakup `/expenses`, `/invoice-payments` (✅ sudah ada).
2. Cek `adminSections` → section "Kamar & Stok": tambah `/meter-readings` ke `activePaths`.
3. Verifikasi semua rute admin punya cakupan `activePaths` di minimal 1 section sidebar.

**Gate:** `cd frontend; npm run build` PASS. UAT: buka `/expenses` → sidebar "Keuangan" active; buka `/meter-readings` → sidebar "Kamar & Stok" active.

#### I4 — GettingStartedGuide untuk Tenant Baru [x]

**Target:** `frontend/src/components/tenant/GettingStartedGuide.tsx` [NEW] + `frontend/src/components/tenant/TenantWorkspaceTabs.tsx`.

**Langkah:**
1. Buat komponen `GettingStartedGuide` — terima prop `stage: TenantPortalStage`.
2. Stage "browsing": tampilkan 3 langkah (pilih kamar → ajukan booking → bayar).
3. Stage "booking": tampilkan 3 langkah (pantau status → bayar tagihan → dapat kunci).
4. Stage "occupied": tidak menampilkan apa-apa.
5. Render di `TenantWorkspaceTabs`, di antara guide strip dan tab navigasi.

**Gate:** `cd frontend; npm run build` PASS. UAT: tenant browsing/booking melihat langkah orientasi; tenant occupied tidak.

#### I5 — Breadcrumb Interaktif (Segmen Pertama Klik) [x]

**Target:** `frontend/src/components/layout/AppLayout.tsx`.

**Langkah:**
1. Di render breadcrumb, ubah segmen index 0 dari `<span>` menjadi `<NavLink to={defaultRoute}>`.
2. Segmen lainnya tetap `<span>` (tidak ada route mapping untuk "Detail" ID numerik).
3. Style tetap sama (jangan ubah CSS).

**Gate:** `cd frontend; npm run build` PASS. UAT: klik segmen pertama breadcrumb → navigasi ke dashboard.

#### I6 — Verifikasi Guide Strip Adaptif Tenant [x]

**Target:** `frontend/src/components/tenant/TenantWorkspaceTabs.tsx` (verifikasi only, tidak ada perubahan kode).

**Langkah:**
1. Verifikasi `getStageTitle()` dan `getStageSummary()` mengembalikan teks berbeda per stage.
2. Pastikan teks deskriptif dan membantu orientasi.
3. Jika teks sudah benar → centang [x] tanpa perubahan kode.

**Gate:** UAT manual: login tenant di 3 stage berbeda → guide strip menampilkan teks yang sesuai.

---

#### UAT Global Fase I

Checklist wajib sebelum centang `[x]`:

- [ ] **UAT-I1:** Login ADMIN → dashboard TIDAK menampilkan sub-menu chip.
- [ ] **UAT-I2:** Login STAFF → StaffTopWorkspaceNav 5 tab, sumber dari navigation.ts.
- [ ] **UAT-I3:** `/expenses`, `/meter-readings` → sidebar item active.
- [ ] **UAT-I4:** TENANT browsing/booking → GettingStartedGuide muncul.
- [ ] **UAT-I5:** Breadcrumb segmen pertama bisa diklik → ke dashboard.
- [ ] **UAT-I6:** Guide strip tenant adaptif per stage.
- [ ] **UAT-REGRESSION:** Semua halaman existing tidak 404; toggle Owner↔Admin tidak rusak.
- [x] `cd frontend && npm run build` PASS (2026-06-20: built 27.7s, PWA verify ok, 115 chunks).

---

### Fase J — Hardening Pasca-Fase-G (Jaring Pengaman AI Pra-Go-Live) 🆕

**Tujuan:** mengunci jaminan PDP (mask NIK) + uang (no-partial) dengan test, meluruskan divergensi guard, dan membukukan audit keamanan AI — sebelum go-live (F1-12). BUKAN menambah fitur AI.

> **Rencana otoritatif = `docs/M15_FASE_J_HARDENING_AI.md` (J0–J4).** Baca PENUH sebelum coding (ditulis detail untuk AI eksekutor lemah: anchor ter-grep, langkah bernomor, gate, larangan).

**Latar belakang temuan (audit 2026-06-20):** modul `backend/src/modules/owner-ai/` (Fase G, 15 file) selesai 19–20 Jun tapi **NOL test**, padahal paling dekat ke uang + PDP. Fungsi pengaman murni terkubur sebagai `private`. Ditemukan **divergensi guard no-partial**: guard AI `reviewPaymentSubmission` (±l.1150) salah me-REJECT DP booking yang sah karena hanya cek `submitted !== invoiceTotal`, sedangkan guard domain `approveSubmission` (±l.567–587) sadar DP.

**Rujukan:** `docs/M15_FASE_J_HARDENING_AI.md` · `docs/M12_AI_OWNER_ADMIN.md` · `docs/M04_KEUANGAN.md` (gate uang) · `docs/M09_AUDIT.md` · `docs/CODEMAP.md`.

**Anchor kode:** `owner-ai.service.ts` · `owner-ai.helpers.ts` (baru) · `payment-submissions.service.ts` (acuan no-partial) · `frontend/src/components/ai/*` · `backend/test/unit/financial-ratios.helper.test.js` (pola test). **Test require `dist/` → WAJIB `npm run build` dulu.**

#### J0 — Ekstrak guard murni owner-ai → `owner-ai.helpers.ts` (refactor tanpa ubah perilaku) [x]

**Target:** buat `backend/src/modules/owner-ai/owner-ai.helpers.ts`; edit `owner-ai.service.ts`.

**Langkah:** pindahkan fungsi MURNI (tanpa Prisma/env/DeepSeek) + konstanta set ke helper & `export`; service import + delegasi; tambah `decidePaymentReviewGuard()` (kunci perilaku saat ini). Daftar fungsi & yang JANGAN dipindah → M15 J0 langkah 3–6.

**Gate:** `cd backend; npx tsc --noEmit` = 0 → `npm run build` → `npm run test:unit` (regresi hijau). Diff service hanya pindah + import.

#### J1 — Unit test jaring pengaman `owner-ai-safety.test.js` [x]

**Target:** buat `backend/test/unit/owner-ai-safety.test.js`.

**Langkah:** test `maskNik` (PDP), `parseNikDemographics`, `extractNikFromOcr`, `decidePaymentReviewGuard` (uang), `normalizeExpenseOcrDraft` (clamp+enum), `cleanShortText`/`isDateOnly`/`ageDays`, normalize* default aman. Detail assert → M15 J1.

**Gate:** `cd backend; npm run build && npm run test:unit` semua hijau (+≥18 assert baru).

#### J2 — Luruskan guard no-partial AI agar selaras domain (DP booking) [x]

**Target:** `owner-ai.helpers.ts` + `owner-ai.service.ts` `reviewPaymentSubmission`. Acuan: `payment-submissions.service.ts` `approveSubmission` (±567–587).

**Langkah:** `decidePaymentReviewGuard` jadi sadar-DP (FULL/DP/SETTLEMENT); hitung downPaymentRemaining/settlementAmount rumus SAMA dengan domain; tambah field `select` bila perlu (TANPA ubah tabel); test DP-persis/pelunasan tidak violated. Detail → M15 J2.

**Gate (UANG):** `npx tsc --noEmit` = 0 → `npm run build` → `npm run test:unit` hijau + gate `docs/M04_KEUANGAN.md`. UAT: DP booking 30% tidak disarankan REJECT; nominal salah tetap REJECT.

#### J3 — Hardening frontend AI (non-blocking error + role/configured gating) [x]

**Target:** `frontend/src/components/ai/AiAssistButton.tsx` · `AiResultPanel.tsx` · `AiApprovalDrawer.tsx`.

**Langkah:** error AI non-blocking + tombol coba lagi; gating tombol = `configured===true` && role∈{OWNER,ADMIN}; tampilkan `mode/fallback/warnings`; verifikasi tombol approve panggil endpoint DOMAIN bukan AI. Detail → M15 J3.

**Gate:** `cd frontend; npm run build` PASS. UAT: error → pesan non-blocking; STAFF/TENANT tak lihat tombol AI.

#### J4 — Audit keamanan & PDP menyeluruh modul AI (bukukan ke M09) [x]

**Target:** verifikasi 12 endpoint `owner-ai.controller.ts`; tulis hasil ke `docs/M09_AUDIT.md`.

**Langkah:** cek role guard, no secret bocor, PDP NIK/foto (tolak base64 + mask), snapshot ramping, no direct mutation (read-only), audit `meta.ai`. Checklist per endpoint → M15 J4.

**Gate:** audit dibukukan di M09; temuan (bila ada) → fix + commit terpisah.

#### UAT Global Fase J

- [x] `cd backend; npm run build && npm run test:unit` SEMUA hijau (termasuk `owner-ai-safety.test.js`).
- [x] `owner-ai.service.ts` bersih dari fungsi murni (sudah di helper); `npx tsc --noEmit` = 0.
- [x] Guard no-partial AI: DP booking sah tidak di-REJECT; nominal salah tetap REJECT.
- [x] `cd frontend; npm run build` PASS; tombol AI non-blocking + tak muncul untuk STAFF/TENANT.
- [x] Audit PDP/keamanan AI dibukukan di `docs/M09_AUDIT.md`.
- [x] Tidak ada perubahan `schema.prisma` / `sql/`.

---

#### UAT Global Fase G

Checklist ini wajib untuk setiap task G:

- [ ] Tombol AI tidak muncul untuk STAFF/TENANT.
- [ ] Tombol AI tidak memanggil API saat halaman baru dibuka.
- [ ] Network tab: request AI hanya muncul setelah klik manual.
- [ ] Jika `DEEPSEEK_API_KEY` kosong, halaman tetap bisa dipakai dan data tidak berubah.
- [ ] Jika DeepSeek error/timeout, user mendapat pesan non-blocking.
- [ ] AI response tidak langsung memutasi data; perubahan hanya lewat tombol approve/simpan existing.
- [ ] Prompt/snapshot tidak berisi foto KTP, API key, password, JWT, atau dump tabel mentah.
- [ ] Fitur uang tetap lulus unit test dan guard no-partial/deposit/TB.
- [ ] Audit `meta.ai` terisi saat manusia memakai rekomendasi AI untuk aksi final.

---

### Catatan Sinkron Audit 2026-06-18

- Audit eksternal sementara sudah diserap ke M10 agar tidak menjadi rujukan ganda.
- **MKT-5** ditutup sebagai `[x]` karena kode renewal meter-copy + cross-sell opsional sudah ada.
- **PUB-UI-REVAMP fase lama** dipecah: layanan tambahan, minat layanan, dan meter jadwal `[x]`; staff meter view sudah terserap Fase D.
- **OWNER-VIEW-PHASE2 P0** hanya dihitung selesai untuk layout dasar; mode-aware context, mobile toggle, offcanvas title, dan route split tetap terbuka.
- M10 memakai status terbaru: build + unit test 55/55 hijau setelah pretest/build.

### Selesai Referensi — Jangan Kerjakan Ulang

- **METER M-5:** checkout meter final × deposit jaminan, TB seimbang, UAT cukup/kurang/nol.
- **MKT-4:** CAC/CLV lite dashboard, DeepSeek V4 Pro + fallback offline.
- **AUDIT-OWNER:** title per-rute, skeleton, fallback foto, notif overflow, a11y, hapus dead-code, guest `/rooms` disengaja home+katalog gabungan.
- **CSS+SWEEP:** `.app-shell*` dipusatkan ke `02-layout.css`; sweep 5 role × 3 viewport = 0 overflow.
- **OWN-STRUKTUR-TOGGLE Phase 1:** toggle Owner/Admin view + AutoOps cleanup.
- **AUDIT-KEUANGAN-ULTRA:** 8 invarian, TB balanced, deposit MATCHED Rp8jt, 7 DO-NOT-TOUCH utuh.
- **PUB-LOGIN-BTN:** tombol "Masuk Portal" di navbar publik.

### Backlog Rendah / Jangan Duplikasi

| ID | Status / Catatan |
|----|------------------|
| **MG-UI-01..05** | Diserap **Fase B — Publik & Portal Tenant**. Jangan buat section terpisah. |
| **OWN-STRUKTUR** lama | Diserap **Fase C — Workspace Owner/Admin**. |
| **TIP+** | Diserap **Fase D — Operasional Staff & Gudang** sebagai `STF-TIP-FLOW`. |
| MKT-1/2/3 spec lama | Selesai/digantikan DeepSeek + surveys; jangan buat `BusinessNarrative` duplikat. |
| MKT-1 web LIVE | Owner/API-search berbayar; bukan blocker go-live. |
| V-7 chart | Ditutup sebagai keputusan UX owner di F3-12. |

<!-- KOST48_DOCS_SYNC_20260616_CHECKLIST_AI_ANTARIAN -->

---

## Changelog

Riwayat changelog dipindah ke **`docs/M11_CHANGELOG.md`** (2026-06-19, hemat token). **Tulis entri changelog baru di M11 (paling atas).**
