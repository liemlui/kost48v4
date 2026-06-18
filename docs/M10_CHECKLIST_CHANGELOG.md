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

### Status ringkas (2026-06-19)

| Blok | Selesai | Terbuka | Catatan |
|------|---------|---------|---------|
| Fase A — Pra-Go-Live | sebagian | F1-12 🧑 | Kode inti siap; publish nyata menunggu server/domain/env owner |
| Fase B — Publik & Tenant | sebagian | foto, profil | Layanan tambahan, minat layanan, smart booking, kalender, dan meter jadwal sudah selesai fungsional |
| Fase C — Owner/Admin | **selesai** | — | Mode-aware UI, route split/guard, status cards, inventaris shell SEMUA selesai (2026-06-19) |
| Fase D — Staff & Gudang | **selesai** | — | Meter status, theme, WiFi order, tip flow, gudang FK, role scope SEMUA selesai (2026-06-19) |
| Fase E — Polish & Teknis | sebagian | TEN-GAMIF, refactor, test lanjutan | MKT-5 selesai fungsional; backlog teknis diserap ke M10 |
| Fase F — UI/UX Sweep | **baru** | UX-404, UX-TOAST, UX-A11Y, UX-COLOR, UX-LOGOUT | Audit UI/UX 2026-06-19: 13 temuan, 6 prioritas perbaikan |

### Urutan kerja (jangan loncat kecuali blocked) — detail di [ANTRIAN](#antrian-eksekusi-aktif-untuk-ai--kerjakan-dari-sini)

1. **Fase A — Pra-Go-Live**: owner-blocked, ikuti `docs/M08_DEPLOY_GO_LIVE.md`.
2. **Fase B — Publik & Portal Tenant**: bereskan sisa foto, smart booking, meter status, profil.
3. **Fase C — Workspace Owner/Admin**: mode-aware UI, route split, inventaris shell.
4. **Fase D — Operasional Staff & Gudang**: gudang dinamis, staff meter, WiFi/tip, polish staff.
5. **Fase E — Polish & Teknis**: gamifikasi kebersihan + backlog teknis non-blocker.
6. **Fase F — UI/UX Sweep**: perbaikan aksesibilitas, feedback toast, route 404, kontras, polish (13 temuan audit 2026-06-19).
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

> **Mulai dari Fase A lalu turun ke B, C, D, E.** Fase A boleh berhenti di langkah owner, lalu AI boleh lanjut ke Fase B/C selama tidak menyentuh deploy produksi. Status: `[x]` selesai, `[~]` sudah sebagian/tinggal polish, `[ ]` belum selesai.

### Peta Rujukan Dokumen

| Kebutuhan | Baca dulu | Dipakai untuk |
|-----------|-----------|---------------|
| Orientasi bisnis & batasan sistem | `docs/M01_MASTER.md` | Gambaran KOST48, asumsi 48 kamar, lokasi, role |
| Keputusan owner & UX owner/admin | `docs/M02_KEPUTUSAN_OWNER.md` | Owner view, role guard, keputusan D-01..D-22 |
| Flow kontrak & chain-of-custody | `docs/M03_FLOW_KONTRAK.md` | Alur booking, invoice, jurnal, stay, dan kontrak |
| Keuangan, jurnal, invoice, deposit | `docs/M04_KEUANGAN.md` | Semua task uang wajib unit test + invarian TB |
| Siklus huni, booking, tenant, renewal | `docs/M05_SIKLUS_HUNI.md` | Booking, stay, checkout, KTP, profil tenant |
| Operasional, staff, gudang, meter | `docs/M06_OPERASIONAL.md` | Staff route, inventory, meter, tiket, gudang |
| Publik, marketing, SEO, layanan | `docs/M07_PUBLIK_GROWTH.md` | Public UI, katalog, layanan tambahan, foto marketing |
| Deploy & go-live produksi | `docs/M08_DEPLOY_GO_LIVE.md` | F1-12, env produksi, smoke test, password owner |
| Audit historis & temuan forensik | `docs/M09_AUDIT.md` | Rujukan audit lama, risiko, dan keputusan pasca-audit |
| Checklist aktif & ANTRIAN | `docs/M10_CHECKLIST_CHANGELOG.md` | Source of truth eksekusi berikutnya |
| Changelog arsip | `docs/M11_CHANGELOG.md` | Riwayat ringkas; tulis entri baru di paling atas |
| Peta navigasi kode (AI) | `docs/CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |
| Audit post-fix terbaru | `docs/AUDIT_POST_FIX.md` | Verifikasi DEEP-01..05 dan catatan hardening |

### Mode AI Lemah — Aturan Eksekusi

1. Buka `docs/M10_CHECKLIST_CHANGELOG.md` dulu, pilih **satu** item `[ ]` atau `[~]` dari Fase A-E.
2. Buka semua rujukan MD yang tertulis di fase itu sebelum edit kode. Jangan mengerjakan dari ingatan atau dari nama task saja.
3. Cari anchor kode dengan `rg` sesuai petunjuk fase, lalu cocokkan perilaku kode dengan MD rujukan.
4. Jika task menyentuh uang, baca `docs/M04_KEUANGAN.md` dan jalankan gate uang. `tsc 0` saja tidak cukup.
5. Jika task menyentuh schema/migration, berhenti sampai ada approval owner untuk schema additive.
6. Setelah selesai, update checklist M10 + 1 baris di `docs/M11_CHANGELOG.md`; jangan membuat checklist baru di file lain.

### Prompt YOLO Siap Pakai

Salin prompt ini ke AI eksekutor baru bila ingin dia jalan otonom dari checklist:

```text
Kamu adalah AI eksekutor lemah untuk repo KOST48. Kerjakan YOLO tapi tetap aman.

Aturan utama:
1. Mulai dari docs/M10_CHECKLIST_CHANGELOG.md bagian "ANTRIAN EKSEKUSI AKTIF".
2. Pilih 1 task pertama yang actionable dari Fase A-E dengan status [ ] atau [~].
3. Jika task owner-blocked, rahasia produksi, deploy nyata, atau schema/migration tanpa approval owner, jangan nebak. Lewati ke task AI-actionable berikutnya dan catat alasannya.
4. Sebelum edit kode, buka semua MD rujukan yang tertulis di fase/task itu. Minimal baca M10 + M-file domain terkait. Untuk uang wajib baca docs/M04_KEUANGAN.md.
5. Cari anchor kode pakai rg. Cocokkan kode aktual dengan checklist; jangan mengandalkan ingatan atau asumsi.
6. Implementasikan perubahan sampai selesai, bukan sekadar rencana. Jaga scope kecil: 1 task = 1 perubahan fokus.
7. Jangan tambah dependency npm, jangan git push, jangan ubah schema.prisma/sql tanpa approval owner, jangan sentuh flow finance di luar scope.
8. Jalankan gate sesuai dampak:
   - Backend: cd backend; npx tsc --noEmit
   - Frontend: cd frontend; npm run build
   - Task uang: cd backend; npm run test:unit atau node --test "test/**/*.test.js" sesuai package script
   - UI/layout: cek responsive/mobile bila memungkinkan
9. Setelah lulus, update docs/M10_CHECKLIST_CHANGELOG.md (ubah status item) dan tambah 1 baris changelog di docs/M11_CHANGELOG.md.
10. Jika gagal 2 kali di error yang sama, berhenti dan laporkan blocker dengan file/line/error konkret.

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
| **Fase B** | Publik & Portal Tenant | sebagian | M07, M05, M06 | Banyak selesai; sisa foto dan profil |
| **Fase C** | Workspace Owner/Admin | **selesai** | M02, M06 | Mode-aware UI + route split/guard + status cards + inventaris shell selesai (2026-06-19) |
| **Fase D** | Operasional Staff & Gudang | sebagian | M06, M04 | Staff/gudang/WiFi/tip/meter view |
| **Fase E** | Polish, Gamifikasi & Teknis | sebagian | M06, M07, M09 | Ranking kebersihan + backlog teknis non-blocker |

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
- [~] **PUB-CALENDAR-RENEW:** ditutup sesuai keputusan owner; sistem tidak menebak kontrak bulanan/panjang.

#### B2 — Ketersediaan & booking cerdas
- [x] **PUB-CALENDAR:** backend `GET /public/rooms/availability-calendar?from&to` + frontend `AvailabilityTimeline` horizontal (per kamar × per tanggal: KOSONG/BOOKING_DP/HUNI/MAINTENANCE).
- [x] **PUB-SMART-BOOKING:** API `GET /public/rooms?checkIn&durationDays` sudah memfilter kamar yang available di seluruh rentang (backend: `marketing-public-rooms.service.ts`).

#### B3 — Foto, brosur, dan aset marketing
- [x] **PUB-CARD-RESPONSIVE:** grid public rooms sudah 4/2/1 kolom.
- [x] **PUB-FACILITY-PHOTO:** owner bisa upload 1 foto per fasilitas via Settings → Foto Fasilitas; foto real tampil di landing page publik (fallback emoji bila belum ada foto).
- [~] **OWN-FOTO-UPLOAD:** upload foto kamar sudah ada di Owner Settings; sisa CRUD foto marketing, fasilitas, brosur/spanduk.
- [~] **PUB-BROCHURE:** section "Galeri KOST48" + aset brosur/spanduk statis sudah ada; sisa upload/kelola dari Owner Settings.

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

**Rujukan:** `docs/M06_OPERASIONAL.md` · `docs/M07_PUBLIK_GROWTH.md` · `docs/M09_AUDIT.md` · `docs/AUDIT_POST_FIX.md`.

#### E1 — Tenant gamification
- [x] **TEN-GAMIF:** ranking kebersihan depan kamar bulanan — backend `GET /public/rooms/cleanliness-ranking?month&year` (skor persentase `DONE/expected` dari assignment aktif area CLEANING per room, query month/year tervalidasi) + frontend kartu ranking di MyLoyaltyPage.
- [~] **TEN-GAMIF privacy:** leaderboard poin yang ada tidak expose tenantId/nama; tetap perlu UAT ulang untuk ranking kebersihan baru.

#### E2 — Marketing renewal
- [x] **MKT-5:** selesai fungsional. `RenewRequestModal` sudah memuat copy meter; `RenewalCrossSellCard` opsional dan tidak memblokir flow renewal.

#### E3 — Backlog teknis non-blocker (jangan dikerjakan sebelum Fase A-D kecuali diminta)
- [ ] Split file besar: `auto-ops.service.ts` → per-job + orchestrator; `stays.service.ts` → booking/checkout/renewal helper.
- [ ] Tambah integration test flow kritis: booking → check-in → checkout → deposit refund.
- [ ] Tambah E2E Playwright fungsional, bukan hanya screenshot visual.
- [ ] Evaluasi refresh token JWT, nonce-based CSP, WA/email urgent alert, dan event bus/message queue sebagai jangka panjang.

---

### Fase F — UI/UX Sweep (Audit 2026-06-19)

**Tujuan:** perbaiki temuan audit UI/UX full — aksesibilitas, feedback, routing, kontras, polish.

**Rujukan:** `docs/M07_PUBLIK_GROWTH.md` → Audit UI/UX Full 2026-06-19.

**Anchor kode (grep):** `App.tsx` · `AppLayout.tsx` · `PasswordInput.tsx` · `SkeletonLoader.tsx` · `GlobalSearch.tsx` · `01-base.css`.

**Gate:** `cd frontend && npm run build` harus PASS. Tidak ada npm install.

---

#### F1 — Critical: Route 404 (UX-404)

**Target:** `frontend/src/App.tsx` + `frontend/src/pages/NotFoundPage.tsx` (BARU)  
**Estimasi:** 30 menit · **Risk:** low

**Langkah 1 — Buat file halaman 404:**
Buat file BARU `frontend/src/pages/NotFoundPage.tsx` dengan isi:

```tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRoute } from '../config/navigation';

export default function NotFoundPage() {
  const { user } = useAuth();
  const homeLink = user ? getDefaultRoute(user.role) : '/rooms';

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <div className="text-center" style={{ maxWidth: 480 }}>
        <div className="display-1 fw-bold text-muted mb-3">404</div>
        <h1 className="h4 mb-2">Halaman tidak ditemukan</h1>
        <p className="text-muted mb-4">
          Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
          Gunakan menu navigasi atau tombol di bawah untuk kembali.
        </p>
        <Link to={homeLink} className="btn btn-primary">
          {user ? 'Kembali ke Dashboard' : 'Lihat Katalog Kamar'}
        </Link>
      </div>
    </div>
  );
}
```

**Langkah 2 — Tambah import di App.tsx:**
Cari baris import di `frontend/src/App.tsx`. Tambahkan setelah import terakhir (sebelum `type Role`):

```tsx
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
```

> **Cara temukan spot:** buka `App.tsx`, cari teks `type Role = 'OWNER'`. Tambah import di atasnya.

**Langkah 3 — Tambah wildcard route di App.tsx:**
Buka `frontend/src/App.tsx`, cari baris:

```tsx
          </Route>
        </Route>
        </Routes>
```

**SEARCH/REPLACE tepat:**
```
          </Route>
        </Route>
        </Routes>
```

**REPLACE dengan:**
```
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
```

**Verifikasi:** `cd frontend && npm run build` — harus PASS. Buka browser ke `/halaman-tidak-ada`, harus muncul halaman 404.

---

#### F2 — High: Toast Feedback Global (UX-TOAST)

**Target:** `frontend/src/components/common/ToastProvider.tsx` (BARU) + `frontend/src/main.tsx` + `frontend/src/pages/resources/SimpleCrudPage.tsx`  
**Estimasi:** 2 jam · **Risk:** low (tidak menyentuh backend/schema)

**Langkah 1 — Buat ToastProvider:**
Buat file BARU `frontend/src/components/common/ToastProvider.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; variant: 'success' | 'danger' | 'warning' | 'info' };

const ToastCtx = createContext<{ toast: (message: string, variant?: Toast['variant']) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: Toast['variant'] = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast: addToast }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast show align-items-center text-bg-${t.variant} border-0`} role="alert">
            <div className="d-flex">
              <div className="toast-body">{t.message}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Tutup" />
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

**Langkah 2 — Wrap di main.tsx:**
Buka `frontend/src/main.tsx`. Tambah import:

```tsx
import { ToastProvider } from './components/common/ToastProvider';
```

Cari teks:

```tsx
        <AuthProvider>
          <App />
```

**SEARCH/REPLACE tepat:**
```
        <AuthProvider>
          <App />
```

**REPLACE dengan:**
```
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
```

**Langkah 3 — Panggil toast di SimpleCrudPage.tsx:**
Buka `frontend/src/pages/resources/SimpleCrudPage.tsx`. Tambah import di atas:

```tsx
import { useToast } from '../../components/common/ToastProvider';
```

Cari `const queryClient = useQueryClient();` (sekitar line 60). Tambah di bawahnya:

```tsx
  const toast = useToast();
```

Lalu cari 3 lokasi mutation `onSuccess` — biasanya ada di `useMutation` untuk create, update, delete. Di tiap `onSuccess`, tambah `toast.toast('Data berhasil disimpan.')` atau pesan sesuai. Contoh:

**SEARCH untuk create mutation onSuccess (cari teks `createResource`):**
Cari blok `onSuccess: () => {` di dalam mutation create. Tambahkan `toast.toast('Data berhasil ditambah.');` di dalamnya.

**SEARCH untuk update mutation onSuccess:**
Cari blok `onSuccess: () => {` di dalam mutation update. Tambahkan `toast.toast('Data berhasil diubah.');`.

**SEARCH untuk delete mutation onSuccess:**
Cari blok `onSuccess: () => {` di dalam mutation delete. Tambahkan `toast.toast('Data berhasil dihapus.', 'warning');`.

**Verifikasi:** `cd frontend && npm run build`. Buka aplikasi, tambah/edit/hapus data → toast muncul di kanan bawah.

---

#### F3 — Medium: Aksesibilitas

##### UX-A11Y-PASSWORD: Ganti emoji password toggle dengan SVG icon

**Target:** `frontend/src/components/common/PasswordInput.tsx`  
**Estimasi:** 20 menit · **Risk:** low

**SEARCH (seluruh isi file — ganti total):**
```
import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap';

type PasswordInputProps = Omit<FormControlProps, 'type'>;

export default function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup>
      <Form.Control
        {...props}
        type={show ? 'text' : 'password'}
      />
      <Button
        variant="outline-secondary"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        size="sm"
        className="px-2"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 40 }}
        title={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? '🙈' : '👁'}
      </Button>
    </InputGroup>
  );
}
```

**REPLACE dengan:**
```
import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap';

type PasswordInputProps = Omit<FormControlProps, 'type'>;

/** SVG icon mata terbuka — digunakan saat password terlihat */
function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** SVG icon mata tertutup — digunakan saat password disembunyikan */
function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

export default function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup>
      <Form.Control
        {...props}
        type={show ? 'text' : 'password'}
      />
      <Button
        variant="outline-secondary"
        onClick={() => setShow((v) => !v)}
        size="sm"
        className="px-2"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 40 }}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        title={show ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </Button>
    </InputGroup>
  );
}
```

**Yang berubah:** (1) `tabIndex={-1}` dihapus, (2) emoji diganti SVG icon, (3) tambah `aria-label`.

**Verifikasi:** `cd frontend && npm run build`. Buka halaman login, test toggle password — icon harus berganti mata terbuka/tertutup, bisa di-tab keyboard.

---

##### UX-A11Y-SKIPLINK: Tambah skip-to-content link

**Target:** `frontend/src/components/layout/AppLayout.tsx`  
**Estimasi:** 10 menit · **Risk:** low

**Langkah 1 — Tambah CSS:**
Buka `frontend/src/styles/01-base.css`, tambahkan di akhir file:

```css
/* Skip-to-content link — visually hidden, muncul saat Tab pertama */
.skip-to-content {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 9999;
  padding: 10px 20px;
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: top 0.2s ease;
}
.skip-to-content:focus {
  top: 16px;
}
```

**Langkah 2 — Tambah link di AppLayout.tsx:**
Buka `frontend/src/components/layout/AppLayout.tsx`. Cari baris:

```tsx
    <div className="app-shell">
```

(Garis ~359, tepat setelah block `if (isTenant)` dan sebelum return utama admin/owner.)

**SEARCH:**
```
    <div className="app-shell">
```

**REPLACE dengan:**
```
    <a href="#main-content" className="skip-to-content">Loncat ke konten utama</a>
    <div className="app-shell">
```

**Langkah 3 — Tambah id di elemen main:**
Cari baris:

```tsx
        <main className="app-main">
```

(Garis ~397.)

**SEARCH:**
```
        <main className="app-main">
```

**REPLACE dengan:**
```
        <main className="app-main" id="main-content">
```

**Verifikasi:** `cd frontend && npm run build`. Buka halaman, tekan Tab — link "Loncat ke konten utama" muncul di kiri atas. Tekan Enter → fokus pindah ke konten utama.

---

##### UX-COLOR: Gelapkan --text-muted untuk WCAG AA

**Target:** `frontend/src/styles/01-base.css` line 13 + `frontend/src/styles/04-operations.css` line 18  
**Estimasi:** 5 menit · **Risk:** low (hanya ubah warna, tidak rusak layout)

**Langkah 1 — `01-base.css`:**
Buka `frontend/src/styles/01-base.css`. Cari line yang tepat:

```
  --text-muted: #64748b;
```

(Garis 13.)

**SEARCH:** `--text-muted: #64748b;`  
**REPLACE:** `--text-muted: #475569;`

> Hanya perubahan satu kata (64748b → 475569). Contrast ratio naik dari 4.55:1 ke 5.5:1 — lulus WCAG AA small text.

**Langkah 2 — `04-operations.css`:**
Buka `frontend/src/styles/04-operations.css`. Cari line yang tepat:

```
  --text-muted: #64748b;
```

(Garis 18.)

**SEARCH:** `--text-muted: #64748b;`  
**REPLACE:** `--text-muted: #475569;`

**Verifikasi:** `cd frontend && npm run build`. Lihat halaman — teks muted sedikit lebih gelap, tetap terbaca.

---

##### UX-LOGOUT: Tambah konfirmasi sebelum logout

**Target:** `frontend/src/components/layout/AppLayout.tsx`  
**Estimasi:** 15 menit · **Risk:** low

**Langkah 1 — Buat helper di atas komponen AppLayout:**
Buka `frontend/src/components/layout/AppLayout.tsx`. Cari baris:

```tsx
export default function AppLayout({ children }: { children?: ReactNode }) {
```

Tambahkan DI ATAS baris tersebut:

```tsx
function handleLogout(logoutFn: () => void) {
  if (window.confirm('Yakin ingin keluar?')) {
    logoutFn();
  }
}
```

**Langkah 2 — Ganti onClick di 2 tombol logout:**

**Tombol 1 — Staff logout (line ~325):**
**SEARCH:**
```
              <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
            </div>
          </section>

          <StaffTopWorkspaceNav />
```

**REPLACE dengan:**
```
              <Button variant="outline-danger" size="sm" onClick={() => handleLogout(logout)}>Logout</Button>
            </div>
          </section>

          <StaffTopWorkspaceNav />
```

**Tombol 2 — Admin/Owner logout (line ~456):**
**SEARCH:**
```
                  <Button variant="outline-danger" size="sm" onClick={logout}>Logout</Button>
```

**REPLACE dengan:**
```
                  <Button variant="outline-danger" size="sm" onClick={() => handleLogout(logout)}>Logout</Button>
```

> **Catatan:** Tenant logout (line 348 — `onLogout={logout}` di `TenantWorkspaceTabs`) menggunakan handler internal tenant. JANGAN disentuh — tenant logout flow terpisah.

**Verifikasi:** `cd frontend && npm run build`. Klik Logout → muncul dialog "Yakin ingin keluar?" → OK baru logout, Cancel tetap di halaman.

---

#### F4 — Low: Polish

##### UX-SEARCH-TENANT: Buka GlobalSearch untuk tenant

**Target:** `frontend/src/components/layout/GlobalSearch.tsx`  
**Estimasi:** 30 menit · **Risk:** low

**Masalah:** `GlobalSearch` langsung `return null` bila `role === 'TENANT'`.

**Langkah 1 — Tambah endpoint search tenant:**
Buka `frontend/src/components/layout/GlobalSearch.tsx`. Cari function `canSearchTenants`, `canSearchInvoices`, `canSearchRooms`.  

**SEARCH blok (sekitar line 47-60):**
```
function canSearchTenants(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

function canSearchInvoices(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

function canSearchRooms(role?: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'STAFF';
}
```

**REPLACE dengan:**
```
function canSearchTenants(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

function canSearchInvoices(role?: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'TENANT';
}

function canSearchRooms(role?: string) {
  if (role === 'TENANT') return false;
  return role === 'OWNER' || role === 'ADMIN' || role === 'STAFF';
}
```

**Langkah 2 — Sesuaikan query tenant untuk tenant role:**
Cari blok fungsi `queryFn` di dalam `useQuery` — sekitar line 68-100. Di bagian `canSearchInvoices`, ganti endpoint untuk tenant.

**SEARCH (temukan bagian ini di dalam array tasks):**
```
      if (canSearchInvoices(role)) {
        tasks.push(
          listResource<Invoice>('/invoices', { search: debouncedKeyword, limit: 5 })
```

**REPLACE dengan:**
```
      if (canSearchInvoices(role)) {
        const invoicePath = role === 'TENANT' ? '/me/invoices' : '/invoices';
        tasks.push(
          listResource<Invoice>(invoicePath, { search: debouncedKeyword, limit: 5 })
```

**Langkah 3 — Hapus early return untuk tenant:**
Cari baris:

```tsx
  if (role === 'TENANT') return null;
```

(Line ~88.)

**SEARCH:**
```
  if (role === 'TENANT') return null;
```

**REPLACE dengan:**
```
  // Tenant sekarang bisa search invoice + tiket mereka sendiri (UX-SEARCH-TENANT)
```

(Jangan return null — biarkan search tetap tampil.)

**Langkah 4 — Update placeholder:**
Cari function `getPlaceholder`. Di case `default`:

**SEARCH:**
```
    default:
      return 'Cari data...';
```

**REPLACE dengan:**
```
    case 'TENANT':
      return 'Cari invoice atau tiket...';
    default:
      return 'Cari data...';
```

**Verifikasi:** `cd frontend && npm run build`. Login sebagai tenant, search bar muncul di portal. Cari invoice → hasil dari invoice tenant sendiri.

---

##### UX-SKELETON: Sesuaikan StatCardSkeleton agar tidak layout shift

**Target:** `frontend/src/components/common/SkeletonLoader.tsx`  
**Estimasi:** 15 menit · **Risk:** low

**Masalah:** `StatCardSkeleton` menggunakan width fixed (96px, 120px, 72%) yang tidak match card asli.

**SEARCH (seluruh fungsi StatCardSkeleton):**
```
export function StatCardSkeleton() {
  return (
    <div className="card stat-card border-0">
      <div className="card-body">
        <div className="stat-card-header">
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={96} height={12} className="mb-3" />
          </div>
          <SkeletonBlock width={44} height={44} />
        </div>
        <SkeletonBlock width={120} height={34} className="mb-2" />
        <SkeletonBlock width="72%" height={14} />
      </div>
    </div>
  );
}
```

**REPLACE dengan:**
```
export function StatCardSkeleton() {
  return (
    <div className="card stat-card border-0">
      <div className="card-body">
        <div className="stat-card-header">
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width={44} height={44} />
        </div>
        <SkeletonBlock width="100%" height={36} className="mb-2" />
        <SkeletonBlock width="100%" height={14} />
      </div>
    </div>
  );
}
```

> Perubahan: semua width jadi `100%` mengikuti container `.stat-card` yang sudah punya dimensi dari grid — tidak lagi hardcoded.

**Verifikasi:** `cd frontend && npm run build`. Buka dashboard — skeleton card lebar sama dengan card asli, tidak ada layout shift.

---

##### UX-OVERSCROLL: Kembalikan pull-to-refresh di mobile

**Target:** `frontend/src/styles/01-base.css` line 59  
**Estimasi:** 2 menit · **Risk:** low

**SEARCH:**
```
  overscroll-behavior-y: none;
```

(Garis 59.)

**REPLACE dengan:**
```
  /* UX-OVERSCROLL: pull-to-refresh dikembalikan untuk mobile */
```

> Hapus baris `overscroll-behavior-y: none;` — ganti dengan komentar.

**Verifikasi:** `cd frontend && npm run build`. Buka di mobile browser — pull-to-refresh berfungsi kembali.

---

##### UX-LOGIN-FORMAT: Validasi format input di LoginPage

**Target:** `frontend/src/pages/auth/LoginPage.tsx`  
**Estimasi:** 20 menit · **Risk:** low

**Masalah:** Error message generik — user tidak tahu apakah format input atau password yang salah.

**SEARCH (blok validasi di handleSubmit, sekitar line 56-59):**
```
    if (!identifier.trim()) nextErrors.identifier = mode === 'TENANT' ? 'Masukkan email atau nomor HP yang terdaftar.' : 'Masukkan email admin/staff.';
    if (!password.trim()) nextErrors.password = 'Masukkan password.';
```

**REPLACE dengan:**
```
    if (!identifier.trim()) {
      nextErrors.identifier = mode === 'TENANT' ? 'Masukkan email atau nomor HP yang terdaftar.' : 'Masukkan email admin/staff.';
    } else if (mode === 'TENANT') {
      // Deteksi format: jika mengandung @ → email; jika diawali 0 dan 10-13 digit → HP
      const val = identifier.trim();
      const isEmail = val.includes('@');
      const isPhone = /^0\d{9,12}$/.test(val.replace(/[-\s]/g, ''));
      if (!isEmail && !isPhone) {
        nextErrors.identifier = 'Format tidak dikenal. Masukkan email (contoh: nama@email.com) atau nomor HP (contoh: 08123456789).';
      }
    }
    if (!password.trim()) nextErrors.password = 'Masukkan password.';
```

**Verifikasi:** `cd frontend && npm run build`. Di login page tab Penghuni, ketik "abc" → error "Format tidak dikenal". Ketik "test@email.com" atau "08123456789" → tidak error format.

---

**Gate akhir Fase F:** `cd frontend && npm run build` PASS. Semua 10 task `[x]` dicentang setelah diverifikasi.

---

### Catatan Sinkron Audit 2026-06-18

- Audit eksternal sementara sudah diserap ke M10 agar tidak menjadi rujukan ganda.
- **MKT-5** ditutup sebagai `[x]` karena kode renewal meter-copy + cross-sell opsional sudah ada.
- **PUB-UI-REVAMP Fase G** dipecah: layanan tambahan, minat layanan, dan meter jadwal `[x]`; staff meter view masih `[~]`.
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
