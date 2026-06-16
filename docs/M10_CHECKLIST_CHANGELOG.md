# KOST48 V5 - Checklist Aktif dan Changelog Ringkas

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Checklist eksekusi aktif plus changelog yang dipadatkan agar tetap terbaca sebagai kronologi kerja.

## Sumber Digabung

- `docs/08_CHECKLIST.md` - konten dipertahankan
- `docs/CHANGELOG.md` - ringkas/compact

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.
- Changelog sengaja dipadatkan: tanggal dan outcome dipertahankan, detail panjang tetap ada di source lama.


## Sesi 2026-06-16 — SI (sewa/data/invoice) + G-1 (gamifikasi) — TERBARU

Detail SI sudah diserap ke M04/M05/M08; source ringkas diarsipkan di `docs/archieve/2026-06-16_si_notes/_PLAN_SI_SEWA_RIWAYAT.md`. Semua ter-commit & push ke `main`.

- **SI-1** `90ced2f`/`bb49ff3` — Seeder dummy DEV via **event-path HTTP** (anti raw-insert; keputusan
  owner: "dummy lewat jalur kejadian, jangan by pass DB"). `scripts/seed-dev-reset.js` (TRUNCATE+fondasi)
  + `scripts/seed-dev-via-api.js` (rooms/tenants/check-in/invoice/bayar/meter via endpoint).
  Seeder raw/bypass lama diusangkan. Verified: 20 kamar/16 stay/19 invoice/TB seimbang.
- **SI-4** `e8e80e3` — Label peruntukan invoice (badge "Tagihan Sewa/Listrik/Air/DP") di daftar+detail
  tenant & backoffice; nomor invoice jadi subteks (`utils/invoiceUtility.ts`).
- **SI-3** `eb820a9` — Timeline **Riwayat Sewa** (masuk→tiap periode→tagihannya, tertaut invoice) di
  StayDetailPage + MyStayPage (`components/stays/StayHistoryTimeline.tsx`).
- **SI-2** `c0dd13a` — Transparansi aturan perpanjangan: tampil tanggal+basis "DP ≤ hari-H (akhir
  kontrak)", "lunas ≤ DP+7" di portal tenant + admin renew-requests. Guard backend sudah benar (audit).
- **G-1** `c75370a` — Gamifikasi tenant: poin = "kebaikan" (bukan rupiah), kartu Total/Ditukar/Sisa,
  **Papan Top-3 Kamar (anonim)** via `GET /me/loyalty/leaderboard`. Seeder lengkapi onboarding (event-path)
  → poin ONBOARDING_QUEST terisi.
- **T-1** — Tip staf: tambah **ShopeePay** (User.tipShopeepay) di profil staf + tampil ke penghuni;
  penghuni **tandai "sudah beri tip"** pada tiket selesai → StaffPerformanceEvent `TIP_RECEIVED`
  (scoreDelta 0, P2P, **tanpa nominal**); laporan staf tampil **"Tip diterima: N kali"** (hitungan,
  bukan jumlah uang). **Bugfix**: `generateTicketNumberTx` pakai `$executeRaw` (bukan `$queryRaw`) untuk
  `pg_advisory_xact_lock` — Prisma 7 menolak kolom `void` → pembuatan tiket 500 (kini normal). Seeder +4
  tiket/3 tip-ack. Verified: tipCount=3, TB tetap seimbang.
- Sebelumnya (sesi sama): **Meter M-1/M-2/M-3** (konstanta owner-settable, siklus listrik+air auto-invoice,
  pencatatan mandiri tenant). Detail: `docs/_PROPOSAL_METER_LISTRIK_AIR.md`.

## Bagian 1 - `docs/08_CHECKLIST.md`

### KOST48 V5 — Checklist Eksekusi (untuk AI eksekutor)
**Versi:** 2026-06-13 — pasca audit V3 + 84 keputusan owner + restruktur domain-dossier. Versi lama → `archieve/CHECKLIST_V5100_STALE.md`.
**Cara pakai:** kerjakan task BERURUTAN dari atas. Tiap task tunjuk **dossier** tempat spesifikasi LENGKAP (aturan + lokasi kode + cara fix + UAT). Centang `[x]` saat selesai + verifikasi.
**Audit ulang 2026-06-14:** `[x]` hanya berarti seluruh lingkup task/dossier sudah terpenuhi. Implementasi parsial tetap `[ ]`; verifikasi runtime yang secara eksplisit dipindahkan ke gate terpisah (mis. F1-12) tidak membuka kembali task implementasinya.

#### 🤖 PROTOKOL AI EKSEKUTOR (baca tiap mulai)
1. Baca `00_BLUEPRINT.md` (orientasi) → navigasi via **`_PETA_AI.md`** (router + anchor terverifikasi §2; **eksekusi otonom/YOLO + hard-gate ada di §4**) → buka **dossier** yang ditunjuk task → baca Temuan + Task + UAT domain itu.
2. **ANCHOR = PETUNJUK AWAL, bukan kebenaran.** `file:baris` di task ini bergeser tiap commit — **WAJIB konfirmasi dulu via grep nama fungsi/simbol**, baru edit. JANGAN edit baris secara buta. Anchor terverifikasi terakhir: `_PETA_AI §2`.
3. Kerjakan **1 task = 1 commit**. Backend: `cd backend; npx tsc --noEmit` = 0 error. Frontend: `cd frontend; npm run build` (tsc+vite) pass.
3b. **Task KEUANGAN (dossier 10/12/13) WAJIB lewati gate `05_VERIFIKASI_KEUANGAN.md`** sebelum commit: jalankan `node --test "test/**/*.test.js"` (hijau) + cek invarian + angka harapan. `tsc 0` SAJA TIDAK CUKUP untuk finance.
4. Commit Bahasa Indonesia: `fix:`/`feat:`/`perf:`/`ui:`/`ops:`/`test:`. Lalu centang `[x]` di sini + tulis 1 baris di CHANGELOG.
5. **Boleh jalan terus tanpa tanya** untuk task TANPA marker 🧬/[SCHEMA]/🧑 (semua sudah jelas di dossier). **STOP & lapor (jangan tebak)** HANYA bila: simbol/fungsi target tak ditemukan via grep / error tetap setelah 2× coba / butuh `npm install` / task ber-marker 🧬/[SCHEMA] (schema belum di-approve owner) / langkah 🧑 owner / file sedang dimodifikasi AI lain (`git status` dulu).

#### 🚫 LARANGAN MUTLAK
- JANGAN tambah dependensi npm. JANGAN ubah `schema.prisma`/`sql/` TANPA approval owner (task ber-tanda [SCHEMA] perlu schema). JANGAN `git push` (owner yang push). JANGAN sentuh file yang muncul di `git status` sebagai milik AI lain — cek dulu.
- JANGAN pakai PowerShell `Get-Content`/`Set-Content -Encoding utf8` untuk edit docs massal (merusak UTF-8). Pakai Edit tool.
- JANGAN ubah logika payment/auto-ops/accounting di luar yang diminta task.

#### ⚠️ KONTEKS PENTING
- **Sistem BELUM publish** (DB = data testing, boleh dihapus). Deploy = FRESH, bukan migrasi. Semua tugas "perbaiki data lama" GUGUR.
- **1 staf** → round-robin & leaderboard antar-staf DITUNDA. **Tenant = pengawas staf.** Bayar tunai+transfer. Lokasi: Surabaya Barat.
- Keputusan owner mengikat: `03_KEPUTUSAN_OWNER.md`. Aturan bisnis = sumber kebenaran.

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
- [ ] **F1-12** 🧑 DEPLOY BERSIH (owner+AI pendamping) — dossier **04** · provision DB produksi kosong→`prisma db push`→`bootstrap.sql`→seed COA→periode OPEN→opening balance→CashAccount Cash(1000)+Bank(1010)→smoke E-1→baseline reconciliation. TANPA backfill/migrasi data UAT.
  - [x] **runbook schema+bootstrap REHEARSED** (2026-06-13, DB throwaway 5433): db push 41 tabel + bootstrap.sql+addendum BERSIH (2 uidx + 7 chk + 8 trigger + 231 index); DB di-drop, UAT utuh. ⚠️ **Temuan:** DB fresh tak punya user → tambah langkah #0 buat OWNER pertama (lihat `04_DEPLOY §2`).
  - [x] **DB produksi `kost48_v3` diprovisikan + di-seed** (2026-06-13, lokal-as-prod 5433 karena 5432/VPS tak ada): create+push+bootstrap+addendum → seed OWNER(liem.lui) + COA(37) + periode 2026-06 OPEN + CashAccount Cash(1000)+Bank(1010); opening NOL (mulai nol). Smoke LULUS (login OWNER, public/rooms 200, TB balanced, recon mismatch=0, cashflow depositLiability live). readiness=75 (opening/journal pending = normal zero-start).
  - [ ] **go-live nyata** = menunggu env produksi: jalankan backend di server prod (5432/VPS, NODE_ENV=production, domain+HTTPS) atau pg_dump→restore ke 5432; ganti password OWNER (admin123→real); set opening balance bila ada modal awal.

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
- [ ] **F3-3** SEO dasar — **IMPLEMENTASI SELESAI 2026-06-14; LIGHTHOUSE TERTUNDA** · OG/Twitter Card, JSON-LD `LodgingBusiness`, canonical, `robots.txt`, dan `sitemap.xml` tersedia. Build dan verifikasi statis lulus; target Lighthouse SEO ≥90 belum dapat diukur karena konektor browser lokal gagal dijalankan.
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
- [ ] **AUD-7 🟡 race minor** (risiko rendah, 1 admin): overspend poin (B-1), stok reward negatif (B-2), toRoom tak di-lock (C-2). Fix saat skala naik: row lock / serializable.
- [ ] **AUD-8 🟠 WARISAN (A-8, di luar Fase 4)** Auto-journal **best-effort** di flow lama (invoice issue/payment/cancel/expense/wifi/deposit-received) — bila posting gagal, operasi tetap jalan tanpa jurnal. Pertimbangkan blocking + reconciliation otomatis (R1/R2 audit lama `FLOW_AUDIT_LAPORAN.md`).
> **Semua abu-abu TERJAWAB (D-21 + D-22, 2026-06-15):** A-5/A-6/A-7/B-4 (AUD-prabayar), D-6 (AUD-2), L-1 (D-22.1), AUD-5+AC-vendor (D-22.2), AUD-4 FAQ (D-22.3), B-9 referral (D-22.4). → semua jadi **Fase 5 tindak-lanjut audit**; item schema (penanda vendor AC, jam-pakai AC) menunggu proposal+approval.

##### 🔍 AUDIT MENYELURUH SEMUA FASE (2026-06-15 — `docs/AUDIT_MENYELURUH_SEMUA_FASE.md`)
**Hasil:** TIDAK ada 🔴 bug baru di seluruh fase; 🔴 warisan ghost-stock (I-02) ternyata SUDAH ditutup. Temuan:
- [x] **SINKRON-DOC 🟡 → SELESAI (docs)** Banner "🔄 SINKRON KODE (2026-06-15)" ditambahkan di §3 dossier **10/11/13/14/15/18** menandai item yang ditandai open (🔴/🟠) tapi SUDAH selesai di kode (F1-1R, F1-2, F1-8, F1-10, F2-5/I-02, F2-14) + anchor verifikasi. (Severity tabel = historis, bukan TODO.)
- [x] **L-1 🟠 (= AUD-8/A-8) → F5-6 SELESAI** Sweeper `runAutoJournalReconciliation` (backfill jurnal warisan yang bolong + alert OWNER/ADMIN, di runAll sebelum auto-close; endpoint manual). UAT: backfill 1 invoice, TB seimbang, idempoten (D-22.1).
- [x] **B-9 🟡 → F5-5 SELESAI** Field `referredByCode` di pendaftaran tenant admin/portal → `linkReferralTx` (D-22.4).
- [ ] **L-2 🟡 (= F-30)** Dedupe deposit-ledger belum pakai `invoicePaymentId` (kolom ada, kunci masih `paymentSubmissionId ?? stayId`). Dampak sangat rendah (deposit diterima 1×/stay).
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

##### Sedang dikerjakan / BELUM
- [ ] **METER M-3** Pencatatan **mandiri tenant** (auto-issue invoice "system-issued", keputusan owner) — **backend SELESAI** (cycle izinkan TENANT kamar-sendiri + `createWithLinesAndIssue` opsi `systemIssued`; GET `/settings/operational` dibuka semua role); **frontend portal tenant + badge "Catat meter" H-10 (backoffice+portal) = BELUM**.
- [ ] **METER M-4** "Bayar sekaligus" (group invoice sewa + meter OPEN) + catatan "belum termasuk listrik" di invoice sewa.
- [ ] **METER M-5** Checkout: tagihan meter terakhir dipotong dari deposit jaminan + teks marketing publik (listrik pascabayar, no sisa saldo).
- [ ] **STF-GUDANG-2** Stok-min otomatis barang fasilitas (AC/kipas) = jumlah kamar pemakai + standar semua kamar punya kipas (marketing hemat listrik). [logika/data]
- [ ] **STF-THEME** Percantik SEMUA route staf (satu pass: ikon, warna, komponen Tab yang sesuai) + screenshot review.
- [ ] **TEN-GAMIF** Poin = ukuran kebaikan + total dikumpulkan/ditukar/sisa · rank Top 3 **kamar (anonim)** · ranking kebersihan depan kamar bulanan.
- [ ] **TIP+** Tambah ShopeePay di tip staf (F4-14/F5-2 sudah ada e-wallet) + narasi tenant "uang kopi" + tombol terima kasih + tip→poin + tip-count di laporan kinerja.
- [ ] **OWN-STRUKTUR** Pisah area "fitur admin" vs "khusus owner" di app owner + **kartu status besar** (pola kartu staf) di Admin & Owner.
- [ ] **FASE B-2** Gabung 4 menu stok (inventaris/barang kamar/mutasi/gudang) jadi tab dalam satu halaman.
- [ ] **MKT** Marketing high-level: SWOT/PESTLE owner-editable → narasi onboarding & web · pembanding kompetitor · survey guest · cross-sell perpanjangan (WiFi/bantuan bersih) · kebijakan perbaikan GRATIS (lampu/kran/shower/bocor).
- [ ] **MG-UI-01** Re-theme landing publik modern (lihat M07): konsep KOST48 tetap, warna/konten existing tetap, tetapi presentasi dibuat lebih modern seperti referensi Marshiba: hero immersive, capsule/sticky nav, CTA kuat, section story, dan card kamar premium.
- [ ] **MG-UI-02** Proof strip publik: tampilkan data marketing yang valid (lokasi Surabaya Barat/Pakuwon-PTC, rating/ulasan visible, penghuni aktif, booking online, Google Maps/CCTV, dan status ketersediaan) tanpa klaim palsu.
- [ ] **MG-UI-03** Section "Living System": jual nilai web app KOST48 sebagai pembeda kos lain — invoice jelas, riwayat sewa, laporan kerusakan, loyalty, referral, dashboard tenant, listrik pascabayar/30 kWh gratis.
- [ ] **MG-UI-04** Audit aset foto marketing: pilih foto hero, foto kamar unggulan, fallback foto rusak, ukuran web yang ringan, alt text, lazy-load, dan dimensi stabil agar LCP tidak turun.
- [ ] **MG-UI-05** Verifikasi re-theme publik: screenshot Playwright desktop/mobile, cek overlap teks/CTA, Lighthouse SEO tetap >=90, LCP target <2.5s, reduced-motion, dan build+PWA verify lulus.
- [ ] **AUDIT-OWNER** Sisa temuan audit owner: overflow Settings/Notif · spinner full-page antar-tab · fallback foto rusak · judul tab browser per-route · konsistensi "tersedia" owner vs publik · /rooms shared URL · "Laporan Formal" dangling.
- [ ] **CSS+SWEEP** Konsolidasi CSS `.app-shell*` duplikat (6 file) + sweep responsif penuh semua role + sisir teks tanpa-spasi lain.

> Legenda marker: **🧬 / [SCHEMA]** = perlu perubahan schema additive (WAJIB approval owner dulu) · **🧑 / [OWNER]** = langkah manusia/owner · **[BESAR]** = task besar, desain lengkap sudah ada di dossier.

<!-- KOST48_DOCS_SYNC_20260613_CHECKLIST_DOSSIER -->


## Bagian 2 - `docs/CHANGELOG.md`

## Changelog Ringkas

> Dipadatkan dari `docs/CHANGELOG.md`: header tanggal dipertahankan, tiap entry hanya menyimpan 1-2 poin outcome. Detail verbose tetap ada di source lama.

### 2026-06-16 — Walkthrough UI/UX (owner+staf+tenant+publik) + penyatuan modul (Fase A/B-1) + Meter M-1
- Sesi UI/UX menyeluruh berbasis review owner + verifikasi screenshot Playwright (`ui-shots/`, tidak di-commit).
- **Responsif & publik:** fix bug app-shell (konten mepet kiri <1200px, override `10-misc` menutup collapse `02-layout`) — global semua role; login (subtitle d...

### 2026-06-15 — Pasca-Fase 5: hardening + sinkron docs (L-4, SINKRON-DOC, AUD-6, L-3)
- Lanjutan tindak-lanjut audit setelah Fase 5 inti:
- **L-4 (go-live):** runbook `04_DEPLOY` mewajibkan `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifi...

### 2026-06-15 — FASE 5 (tindak-lanjut audit menyeluruh): S-5 + F5-1..F5-8 — SELESAI
- **S-5 schema additive** (owner-approve, migration `20260615140000_s5_ac_usage_vendor`): `Room.acUsageHoursPerDay`, `Ticket.handledByVendor`/`vendorNote`.
- **F5-1 (AUD-4) FAQ operasional:** seed FAQ dari aturan/flow (Pembayaran/Booking/Perpanjangan/Checkout&Deposit/KTP/Keluhan&Poin); `seed()` idempoten per-perta...

### 2026-06-15 — feat(F2-10 + F3-5): round-robin tiket + leaderboard staf (disiapkan, dorman saat 1 staf)
- **Ide owner:** siapkan round-robin & leaderboard meski staf masih 1; aktif otomatis saat staf ≥ 2. **Tanpa schema baru.**
- **F2-10 round-robin** (K-4): `TicketsService.pickStaffAssigneeTx` dipakai di `createTicketRecord` saat tiket belum ber-assignee — staf=0 → tanpa assignee; st...

### 2026-06-15 — feat(F4-13c + F4-13 referral): quest perbaikan sikap anonim + referral teman (S-4)
- **Schema additive S-4** (owner-approve, migration `20260615130000_f4_s4_peer_referral`): `PeerBehaviorReport` + enum `PeerReportStatus`; `TenantReferral` + e...
- **F4-13c quest perbaikan sikap (ANONIM):** A lapor B → admin moderasi (`ACKNOWLEDGE` → notif B **tanpa identitas A** / `DISMISS`) → B `markImproved` → konfir...

### 2026-06-15 — feat(F4-11 deep): prabayar/perpanjangan multi-bulan + unearned (PSAK 72) — SELESAI
- **`PrepayExtensionService.prepayExtension`** (`POST /stays/:id/prepay-extension`, OWNER/ADMIN): tenant membayar **N bulan ke depan dengan harga BULANAN** (te...
- **Akuntansi PSAK 72:** jurnal issuance (DR 1100 / CR 4000) + payment (DR kas / CR 1100) + **deferral seluruh prabayar (DR 4000 / CR 2200 Unearned)**; lalu sw...

### 2026-06-15 — feat(backlog S-3): F4-11/12/13a/13b/14/15 — implementasi backlog ide owner
- **Schema additive S-3** (owner-approve, migration `20260615120000_f4_backlog_s3`): Room (hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays), LoyaltyReward...
- **F4-12 FAQ/manual** (tanpa schema): `MyManualPage` (`/portal/manual`) menampilkan FAQ publik per kategori (Accordion ringkas) — manual book aturan kos untuk...

### 2026-06-15 — feat(F4-9): Gamifikasi & Loyalitas tenant — SELESAI (schema S-2, dossier 19)
- **Schema additive (S-2):** `LoyaltyPoint` (ledger append-only, unique sourceType+sourceId) + `LoyaltyReward` (katalog) + `Redemption` (penukaran, wajib appro...
- **Poin (default dossier 19, env-override):** `LoyaltyService.award/earn/earnSafe` (idempotent per sourceType+sourceId), `balance`, `history`. **4 trigger ear...

### 2026-06-15 — feat(F4-8): Pindah kamar resmi (E4) — SELESAI, schema S-2 + 5 keputusan desain owner
- **Keputusan desain owner (D-20, 2026-06-15):** Stay **SAMA** (roomId diperbarui, tak putus kontrak); **deposit ikut apa adanya**; **harga dikunci** (rent-loy...
- **Schema additive (S-2):** `RoomTransfer` (stayId, fromRoomId, toRoomId, transferDate, reason, rentBefore/AfterRupiah, note, createdById) + back-rel Stay/Roo...

### 2026-06-15 — feat(F4-1): Unearned Revenue PSAK 72 (F-15) — SELESAI, schema S-2 approved
- **Kebijakan (keputusan owner):** sewa yang mencakup **>1 bulan** diakui pendapatan **bertahap** (straight-line per bulan), bukan sekaligus saat check-in. **I...
- **Schema additive (S-2):** `RentRecognitionSchedule` (stayId, periodIndex, periodStart/End, scheduledAmountRupiah, recognizedAt, journalEntryId; unique stayI...

### 2026-06-15 — feat(F4-2): PWA Web Push (4 kelompok event J-d) — SELESAI, schema S-2 approved
- **Schema additive (owner-approve S-2):** `PushSubscription` (endpoint unik/device) + enum `PushDeliveryStatus` + `AppNotification.pushStatus/pushAttempts/pus...
- **Backend `PushModule`:** `GET /push/vapid-public-key`, `POST /push/subscribe` (upsert by endpoint), `POST /push/unsubscribe` (deactivate). `PushService` bac...

### 2026-06-14 — fix(F4-10): standarisasi pembulatan Rupiah (F-31) — helper terpusat
- **Masalah (F-31):** pembulatan Rupiah tersebar (`Math.round` mentah di util/DP/depresiasi/revenue-per-kamar + helper `rupiah` duplikat di modul akuntansi) →...
- **Helper terpusat baru** `backend/src/common/business/money.helper.ts`: `roundRupiah(v)` (bilangan bulat terdekat; tie tepat 0,5 dibulatkan MENJAUHI nol agar...

### 2026-06-14 — ops(F4-7): pruning notifikasi >90 hari (N-04) — retensi AppNotification
- **Masalah (N-04):** `AppNotification` tak punya retensi → tumbuh tanpa batas, terutama untuk broadcast ALL ke banyak penerima.
- **Solusi:** `AppNotificationService.pruneOlderThan(retentionDays=90, batchLimit=5000)` menghapus notifikasi `createdAt < now − retensi`, dibatasi per-batch (...

### 2026-06-14 — chore(migration): migration resmi F3 additive + dukungan shadow DB
- **Migration baru** `prisma/migrations/20260614210000_f3_admin_safety/migration.sql` — additive untuk F3-14/15/17/19: enum `BelongingsStatus`; `Tenant.ktp*` (...
- **Divalidasi vs DB UAT live:** seluruh 18 kolom + enum + 3 index + 2 FK ADA dengan nama/tipe/default PERSIS sesuai migration → file akurat & lengkap.

### 2026-06-14 — feat(F3-14/F3-16): forced-checkout admin (kabur/overstay) + deposit→AR (SELESAI, UAT LULUS)
- **Gabung F3-14+F3-16 (keputusan owner):** satu endpoint `POST /stays/:id/forced-checkout` (OWNER) beralasan `OVERSTAY_NUNGGAK`/`TENANT_KABUR`.
- **Akuntansi (disetujui owner):** deposit menutup tunggakan → jurnal **DR 2000 / CR 1100** (`postForcedCheckoutDepositSettlementTx`, BEDA dari settlement dama...

### 2026-06-14 — ui(F3-9): hierarki laporan — badge Formal/Estimasi
- **Badge tier (F-11):** `ReportSection` kini menandai setiap kartu laporan operasional dengan badge **≈ Estimasi** (default) — angka dihitung mentah dari data...
- **Banner hierarki:** ReportsPage menambah catatan tetap yang menjelaskan tab operasional = Estimasi, dan mengarahkan ke tab **"Laporan Formal"** (sudah ada:...

### 2026-06-14 — feat(F3-17): upload + verifikasi KTP (terproteksi, gate aktivasi, hapus PDP)
- **Schema (approved):** `Tenant.ktpImage*` (url/fileKey/originalFilename/mimeType/fileSizeBytes) + `ktpVerifiedAt/ktpVerifiedById` + `ktpDeletedAt`.
- **Upload:** `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, multer + validasi MIME signature, simpan di `uploads/ktp-images` terpisah dari foto kamar/tiket). Up...

### 2026-06-14 — feat(F3-15): lacak barang ditinggal 30 hari → ABANDONED
- **Schema (approved):** `Stay.belongingsStatus` (enum `BelongingsStatus PENDING/CLAIMED/ABANDONED`, default PENDING), `belongingsDeadline`, `belongingsResolve...
- **Set deadline:** checkout final (`stays.complete`) dan forced-checkout overstay (`auto-ops.forceCheckoutOverstay`) men-set `belongingsDeadline = checkout +...

### 2026-06-14 — feat(F3-19): SLA tiket — dueAt per kategori, resolved-time adil, eskalasi
- **Schema (approved):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt` + index `dueAt`.
- **SLA per kategori (`ticket-sla.ts`):** `dueAt = assignedAt + window` — **24 jam** EMERGENCY/SECURITY/KUNCI · **3 hari** KERUSAKAN/MAINTENANCE/KEBERSIHAN/CHE...

### 2026-06-14 — ops(F3-13): hardening checkout/notif (B-06/B-07/B-11/B-12/B-14/N-02) SELESAI
- **B-07 (D-03):** forced-checkout overstay tak lagi diblokir tagihan **DRAFT** (belum terbit, tanpa jurnal). `forceCheckoutOverstay` mengecualikan DRAFT dari...
- **B-12:** `stays.update` menolak `plannedCheckOutDate` di masa lalu (WIB) — mencegah admin tak sengaja menjadikan stay target overstay/forced-checkout instan...

### 2026-06-14 — refactor(F3-11): lead source + katalog foto marketing ke config
- **M-08 lead source:** sudah lengkap di kode — check-in wizard admin punya dropdown `bookingSource` 10 kanal (Google Maps/Walk-in/Referral/Instagram/TikTok/Wh...
- **M-04 foto config:** ~76 nama berkas foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (`ROOM_...

### 2026-06-14 — ops(F3-10): higiene jurnal — idempoten anti-race P2002 di posting
- **Race P2002 (utama):** `accounting-posting.service` membungkus 7 entrypoint posting ber-transaksi-sendiri (invoice issued/payment, expense, wifi-sale, depos...
- **entryNumber suffix VOID:** _tidak berlaku pada kode saat ini_ — tidak ada jalur `journalEntry` → status `VOID` (reversal selalu membuat entry `ADJUSTMENT`...

### 2026-06-14 — audit-fix(Fase 1/2): checklist dibuktikan ulang terhadap kode
- **Renewal:** menutup celah kritis approval sebelum lunas. DP PAID kini hanya mengamankan prioritas; admin menerbitkan invoice pelunasan setelah catat meter;...
- **Cashflow:** classifier menyimpan gross inflow/outflow terpisah per sumber sehingga transaksi dua arah tidak saling menutup.

### 2026-06-14 — ui(F3-12): paket chart — palet Okabe-Ito, count risiko n<5, kontras donut, filter publik
- **V-5:** palet Okabe-Ito colorblind-safe terpusat (`frontend/src/components/charts/chartPalette.ts`) dipakai `SmartChartPanel`, `HorizontalBarChart`, `DonutG...
- **V-2:** donut "Level Risiko" di review pembayaran berubah jadi tampilan hitungan saat sampel kecil (n<5) — 1 bukti high-risk tak lagi terbaca sebagai lingka...

### 2026-06-14 — feat(F3-1): coverage notifikasi operasional (assign, room-ready, K-6/K-8)
- **Ticket-assign → assignee:** `tickets.service.assign()` mengirim notif ke penerima tugas (best-effort, di luar audit) hanya saat assignee benar-benar beruba...
- **K-6/K-8 BARANG_PINDAH:** notif tiket pindah barang yang ditutup kini menuju **staf assignee** (sebelumnya keliru ke `actor.id` = admin penutup) dan dipinda...

### 2026-06-14 — ops(F1-11): verifikasi booking expiry 3 jam flat
- Kedua helper booking (`expireBookingTx` di `auto-ops.service.ts` dan `cancelCompetingUnpaidBookingsTx` di `payment-submissions.service.ts`) memakai konstanta...
- **Verifikasi:** `grep` konfirmasi kedua helper pakai konstanta sama; tidak ada kode baru.

### 2026-06-14 — F3-2/F3-20: inbox pembayaran dan prompt review
- Payment submission yang berhasil commit kini mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif, lengkap dengan tenant, nominal, invoice, kamar, dan deep-lin...
- Tiket tenant ber-assignee STAFF kini mengirim ajakan review saat masuk DONE/CLOSED; pemanggilan ulang pada close aman karena dedupe.

### 2026-06-14 — Fase 3 independen: visibilitas dan otomasi operasional
- Menambahkan SEO dasar guest page: metadata, OpenGraph/Twitter Card, canonical, JSON-LD, `robots.txt`, dan `sitemap.xml`. Implementasi lulus build; skor Light...
- Menambahkan social proof publik dengan pembatasan privasi, agregat rating, ulasan visible terbaru, dan count penghuni aktif.

### 2026-06-14 — feat(F2-18): gate verifikasi owner utk review tenant ≤2 (F2-18 SELESAI)
- Owner: `GET /tenant/staff-reviews/pending-verification` + `POST /:id/verify {decision: APPROVE→VISIBLE | DISMISS→HIDDEN}` (OWNER-only, set `moderatedById`)....
- **UAT runtime:** rating-2 → PENDING_VERIFICATION; owner list memuatnya; ADMIN verify → 403; owner APPROVE → VISIBLE; re-verify → 409. `tsc` 0. → **F2-18 SELE...

### 2026-06-14 — test(F2-6): UAT cancel stay promoted → MAINTENANCE + tiket inspeksi (F2-6 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — ui(F2-11): paginasi 12 + skeleton katalog publik → F2-11 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — refactor(F2-5): satukan generateTicketNumber (4 salinan → 1 util) → F2-5 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — fix(F2-14): staff-routines startOfLocalDate → WIB (F2-14 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — docs(F2-1): sinkron dossier 11 dgn keputusan owner hibrida → F2-1 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — feat(F2-2/#3): prompt renewal H-10 + fallback admin tenant tanpa portal
- **UAT runtime:** stay di H-10 → notif tenant "berakhir 10 hari lagi"; tenant non-portal → notif 3 admin "Tenant tanpa portal"; data uji dipulihkan. `tsc` 0....

### 2026-06-14 — feat(F2-1 R3): gate deadline renewal di command service
- Tindak lanjut audit (deadline hanya digate sweeper): `renew-requests.service` kini menegakkan deadline di tingkat command (deterministik):
- **`confirmDownPayment`** → 409 bila WIB-today > `downPaymentDueDate` (hari-H lewat → prioritas hangus).

### 2026-06-14 — fix(F2-5): tutup ghost-stock RETURN_FROM_ROOM (lock + 409 di dua jalur)
- **`assertRoomItemQtyAvailableTx`** (lock `SELECT … FOR UPDATE` + `ConflictException` bila stok kamar < diminta) diekstrak ke `common/utils/room-booking.util....
- Dipakai **DI DALAM transaksi** oleh `inventory-movements.create` (sebelumnya private, kini util) **dan** `staff-field-reports.adminReview` (sebelumnya TIDAK...

### 2026-06-14 — Audit ulang checklist terhadap kode aktual
- Mengembalikan `F2-1`, `F2-2`, `F2-5`, `F2-6`, `F2-18`, `F2-11`, dan `F2-14` ke `[ ]` karena lingkup task belum lengkap atau verifikasinya belum selesai.
- Temuan kritis: jalur `staff-field-reports.adminReview` masih dapat RETURN melebihi qty kamar tanpa lock/409; `syncRoomItemTx` hanya menghapus RoomItem saat q...

### 2026-06-14 — fix(F2-18): STAFF close dibatasi ke CHECKOUT_INSPECTION (invarian dossier 15)
- **UAT runtime:** STAFF close #1 (non-inspeksi) → 403; STAFF close #13 (CHECKOUT_INSPECTION) → 409 (guard kategori lolos, status OPEN≠DONE); OWNER close #1 →...

### 2026-06-14 — F2-3b: catat refund kalah-cepat di sistem (full-stack, UAT LULUS)
- Refund untuk tenant yang KALAH first-paid-wins padahal sudah transfer kini tercatat & terlacak (lanjutan F2-3 yang memberi tahu loser "dana akan direfund").
- **Schema (owner-approved):** enum `RefundStatus { NONE, PENDING, COMPLETED }` + 7 field `Stay.lossRefund*` (status/amount/proofUrl/proofFileKey/note/processe...

### 2026-06-14 — F2-11 (V-1): code-split halaman publik (bundle utama lebih ramping)
- **Sisa F2-11 (UI polish):** W-02 skeleton detail + CSS ring, W-03 pagination 12 katalog, UD-05 sticky CTA — perlu iterasi visual.

### 2026-06-14 — F2-18: tenant-pengawas — STAFF boleh tutup tiket (guard keselamatan tetap), enum PENDING_VERIFICATION
- **`tickets POST :id/close` kini izinkan STAFF** (sebelumnya OWNER/ADMIN). Mendukung model tenant-pengawas: staf menutup tiket pekerjaannya sendiri termasuk `...
- **`StaffReviewStatus` += `PENDING_VERIFICATION`** (enum app + schema, db push UAT & prod-lokal) sebagai prasarana model "tenant sebagai pengawas kualitas" (r...

### 2026-06-14 — F2-5: konsolidasi util terduplikasi ke common/utils (X-03, sebagian)
- `backend/src/common/utils/room-booking.util.ts` (baru) menyatukan helper yang sebelumnya disalin lintas service:
- **`releaseRoomAfterBookingCancelTx`** — 2 salinan IDENTIK (auto-ops + payment-submissions) → satu sumber. Behavior tetap.

### 2026-06-14 — F2-3: copy notif A17 dua-varian (kalah first-paid: sudah/belum transfer)
- **Sudah transfer** → "Booking dibatalkan: dana Anda akan direfund" (admin akan menghubungi untuk proses refund).
- **Belum transfer** → "Booking dibatalkan: kamar diamankan tenant lain" (tak ada dana terpotong, pilih kamar lain).

### 2026-06-14 — F2-14: timezone WIB untuk bucketing tanggal (F-25/E-6, sebagian)
- **`accounting-posting-helpers.dateOnly` → WIB (UTC+7):** entryDate jurnal kini dibucket per tanggal kalender WIB (dulu komponen UTC) → transaksi dini hari WI...
- **`staff-performance.monthRange` → batas WIB-instant:** bebas timezone server (di server UTC/cPanel perhitungan local lama meleset ±7 jam di tepi bulan). No-...

### 2026-06-14 — F2-12: sinyal tiket hidup lagi + aging pakai sisa tagihan (F-21/F-27, UAT LULUS)
- `finance.service.ts`:
- **F-21 (sinyal tiket):** `highSignalTickets` dulu memakai kategori `['URGENT','HIGH','EMERGENCY']` — `URGENT`/`HIGH` BUKAN `TicketCategory` valid → query sel...

### 2026-06-14 — F2-9: KPI tiket berhenti dobel-hitung lintas bulan (K-6)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — F2-17: notif tenant saat booking/stay dibatalkan sweeper (E3, UAT LULUS)
- `cancelEndedUnpaidStay` (noon-release/H+1 auto-cancel/DP-forfeit) di-refactor: hasil tx ditangkap ke `cancelled`, lalu bila `true` panggil `notifyTenantStayC...
- `runBookingExpiry`: setelah `expireBookingTx` sukses, kirim notif "booking kedaluwarsa".

### 2026-06-14 — F2-16: perketat OWNER-only 4 area (D-17), ADMIN→403 (UAT LULUS)
- Audit `@Roles` + perketat 4 area sensitif jadi OWNER-only (ADMIN ditolak 403); operasi baca (GET) tetap untuk ADMIN/STAFF sesuai sebelumnya:
- **(a) Periode akuntansi** — sudah OWNER (create/update/`reopen`/`period-close/post`/`auto-run`/opening-balance post/void/draft); tak ada perubahan.

### 2026-06-14 — F2-1 inc.4: notif siklus renewal end-to-end (F2-1 & F2-2 SELESAI, UAT LULUS)
- `renew-requests.service` kini menerbitkan notifikasi in-app di tiap transisi (pola `app-notification.service`, mirror checkout-requests; best-effort di luar...
- **create** → OWNER/ADMIN ("🔁 Permintaan perpanjangan baru" + nominal DP).

### 2026-06-14 — Auto-ops cron eksternal (cPanel/Passenger idle-sleep) — endpoint token-protected
- **`GET /api/auto-ops/cron`** baru (`@Public`, tanpa JWT): validasi token rahasia `process.env.AUTO_OPS_CRON_TOKEN` via header `X-Cron-Token` ATAU query `?tok...
- **Deploy shared hosting:** set `AUTO_OPS_ENABLED=false` (matikan timer) + `AUTO_OPS_CRON_TOKEN=<rahasia>`, pasang cPanel **Cron** tiap 5–10 mnt: `curl -fsS -...

### 2026-06-13 — F2-1 inc.3: sweeper auto-ops renewal HIBRIDA (EXPIRED_PRIORITY + FORFEITED, UAT LULUS)
- Sweeper baru di `auto-ops.service.ts` (wired ke `runAll`, jalan tiap 5 menit) — **kebijakan HIBRIDA** (keputusan owner 2026-06-13):
- **`runRenewalPriorityExpiry` (OTOMATIS):** `AWAITING_DP` yang lewat hari-H (`downPaymentDueDate`) tanpa DP lunas → `EXPIRED_PRIORITY`. Membatalkan invoice DP...

### 2026-06-13 — F2-1 inc.2b: invoice DP TERPISAH + rent-line pelunasan dikurangi (UAT runtime LULUS)
- **`stays.service.ts`** `issueRenewalDownPaymentInvoiceTx(tx,…)` baru: terbitkan invoice DP 30% (DRAFT→ISSUED + Auto Journal Lite). `renewStayInTransaction` k...
- **`renew-requests.service.ts`**: `decideByTenant` **YA** → transaksi terbitkan invoice DP + set `downPaymentInvoiceId` + `AWAITING_DP`; `confirmDownPayment`...

### 2026-06-13 — F2-1 inc.2a UAT runtime LULUS (rent-loyalty terbukti)
- Diuji end-to-end vs DB UAT (backend kode-baru :3002, stay 5 / tenant.gita, rent 850rb):
- CREATE → `PENDING_DECISION`, DP=**255.000** (30%), downPaymentDueDate=**2026-06-30** (hari-H).

### 2026-06-13 — F2-1 inc.2a: State Machine Renewal DP (CORE, admin-verified)
- **`renew-requests.service.ts`** dibangun ulang ke state machine GAP #2:
- `createRequest` → `PENDING_DECISION` + set `downPaymentAmountRupiah` (30% × sewa SAAT INI — rent-loyalty D-16) + `downPaymentDueDate` = `plannedCheckOutDate`...

### 2026-06-13 — Paket deploy RAMPING + script cPanel (`make-deploy`, `cpanel:setup`)
- **`npm run make-deploy`** (root, `scripts/make-deploy.mjs`): build frontend combined → folder **`deploy/`** = backend SOURCE (tanpa `node_modules`/`dist`/`sr...
- **Backend script cPanel** (`backend/package.json`): **`cpanel:setup`** = `npm ci && npm run build && npm prune --omit=dev` (build prisma engine Linux + tsc,...

### 2026-06-13 — COMBINED single-server: 1 proses serve frontend + API (`npm run golive:1`)
- Owner pilih arsitektur "1 server". Diimplementasi **dependency-free**:
- **`backend/src/main.ts`**: serve `frontend/dist` (copy → `backend/client`, env `FRONTEND_DIST_PATH`, default `<backend>/client`) via `useStaticAssets` + **fa...

### 2026-06-13 — Target publish cPanel DIKONFIRMASI + rencana (04_DEPLOY §D)
- Owner konfirmasi host cPanel **mampu**: Node.js App (versi dukung) · PostgreSQL · SSH · build-on-server · AutoSSL. Resource upgrade bila kurang. Belum pasti:...
- **Arsitektur diputuskan: combined single-server** (backend serve `frontend/dist` + API, 1 proses/port/domain, tanpa CORS) — dependency-free (`useStaticAssets...

### 2026-06-13 — Go-live SATU PERINTAH: `npm run golive` (root) + port tetap dijamin
- **Root `package.json` + `scripts/golive-all.mjs`** (zero-dependency): `npm run golive` dari `final_bundle/` → (1) **pastikan port 3000+5173 bebas** (deteksi...
- Frontend `golive` ditambah `--strictPort` (gagal jelas, tak geser port).

### 2026-06-13 — Go-live LAN: npm script `golive` + `build:lan` (self-host WiFi kos)
- Owner pilih go-live di localhost/LAN (kos 1 lokasi). Ditambah tooling konvenien **zero-dependency**:
- **`backend/scripts/golive.mjs`** + script `npm run golive`: set `NODE_ENV=production`, `DATABASE_URL`→`kost48_v3` (derive dari `.env`), `CORS_ORIGIN` auto da...

### 2026-06-13 — F1-12: DB Produksi `kost48_v3` Diprovisikan + Di-seed (lokal-as-prod 5433)
- **DB bersih:** `CREATE DATABASE kost48_v3` → `prisma db push` (41 tabel) → `bootstrap.sql` + `bootstrap_v4_addendum.sql` (bersih).
- **Seed fondasi (owner-driven):** OWNER `liem.lui@gmail.com` (bcryptjs, role OWNER) · COA **37 akun** (DEFAULT_COA) · AccountingPeriod 2026-06 **OPEN** · Cash...

### 2026-06-13 — F1-12 rehearsal: Runbook Fresh-Deploy Schema+Bootstrap LULUS
- Rehearsal di DB throwaway `kost48_v3_deploy_rehearsal` (5433): `prisma db push` → **41 tabel** (=41 model) · `sql/bootstrap.sql` + `bootstrap_v4_addendum.sql...
- **Temuan F1-12:** DB fresh TIDAK punya user (bootstrap.sql tak buat User, tak ada seed script) → endpoint seed butuh auth admin. `04_DEPLOY §2` ditambah PRAS...

### 2026-06-13 — F2-1 inc.1: Schema Renewal DP (owner-approved S-1)
- **Owner approval S-1** (`03_KEPUTUSAN_OWNER §S`): seluruh perubahan schema ADDITIVE disetujui (F2-1, F2-3b, F2-18, F3-14/15/17, F4-9).
- **`schema.prisma`** (additive): `RenewRequestStatus` +7 status (`PENDING_DECISION`, `AWAITING_DP`, `DP_SECURED`, `COMPLETED`, `REJECTED_BY_TENANT`, `EXPIRED_...

### 2026-06-13 — F2-6: Auto-tiket Inspeksi saat Cancel Stay Promoted (B-08)
- **`stays.service.ts` `cancel()`**: ketika stay yang dibatalkan `wasPromoted` (sudah dihuni) dan kamar → MAINTENANCE, kini otomatis membuat tiket `CHECKOUT_IN...
- Menutup B-08: sebelumnya cancel stay promoted menaruh kamar di MAINTENANCE TANPA tiket → kamar nyangkut selamanya (gate room-ready hanya buka lewat penutupan...

### 2026-06-13 — GATE RUNTIME FASE 1: LULUS (backend dev + DB UAT 5433)
- Verifikasi `05 §4-5` dijalankan terhadap data UAT (`kost48_v3_pro`), backend `npm run start:dev`:
- **trial-balance**: `isBalanced=true` (debit=kredit=119.694.250). Invarian #6 ✓

### 2026-06-13 — F2-8: Nonaktifkan Endpoint Draft Jurnal Manual (F-22/F-23/D-05)
- **`accounting.controller.ts`**: route `POST /accounting/journal-entries/draft` (`createJournalDraft`) kini melempar `ForbiddenException` (403) — pembuatan ju...
- Opening Balance draft (jalur terpisah & terkontrol via OpeningBalanceWizard) TETAP berfungsi.

### 2026-06-13 — F1-10: Kunci Deposit = Room.defaultDepositRupiah (C3/D-05)
- **`stays.service.ts` create**: `deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah` → `room.defaultDepositRupiah ?? 0` (abaikan override dto).
- **`tenant-bookings.service.ts` approveBooking**: hapus override `depositAmountRupiah: dto.depositAmountRupiah` dari update stay — deposit tetap di snapshot r...

### 2026-06-13 — F1-9: Deposit Bukan Operating Cashflow (F-10)
- **`cashflow-classifier.ts`**: sourceType `DEPOSIT` (dana titipan) tidak lagi masuk operating (fallback) → kategori baru `depositLiabilityIn/Out` (perubahan l...
- **`accounting-reports.service.ts` `cashflow()`**: tambah section `depositLiability` (totalIn/Out/net + catatan "bukan kas operasional yang bisa dipakai"); `n...

### 2026-06-13 — F1-8: Guard Settlement Deposit (F-24)
- **`accounting-posting.service.ts` `postDepositSettlementTx`**: TAMBAH pra-cek — sebelum men-debit liability 2000, pastikan ada jurnal PENERIMAAN deposit POST...
- Menutup F-24: tanpa cek, settlement bisa men-debit 2000 tanpa kredit sebelumnya → akun liability 2000 bersaldo DEBIT (uang titipan "hilang" dari buku). Recei...

### 2026-06-13 — F1-7: Invoice DRAFT Bukan Revenue (F-09)
- **`reports.service.ts` (4 agregat revenue/billed)** + **`finance.service.ts` (5 agregat revenue ber-periodStart)**: filter `status: { not: CANCELLED }` → `st...
- **Sengaja TIDAK diubah** (LARANGAN): groupBy `countByStatus` di reports (masih perlu DRAFT untuk `unpaidCount`), dan openInvoice/AR (`notIn [PAID, CANCELLED]...

### 2026-06-13 — F1-6: Occupancy Rasio (F-04) dihitung inline
- **`financialRatios()`**: `occupancyRate` tak lagi membaca `bs.statement?.occupancyRate` (yang tidak ada → selalu 0). Dihitung INLINE: `operableRooms = kamar...
- Helper `occupancyRatePercent` (di `financial-ratios.helper.ts`) + test (5/10→50; operable 0→0; 48/48→100). Total `test:unit` **13/13 hijau**.

### 2026-06-13 — F1-5: Deposit sebagai Kewajiban Lancar (F-03) — verifikasi & tutup (docs-only)
- Inti F1-5 (deposit masuk kewajiban lancar → currentRatio turun wajar saat deposit HELD) sudah terpenuhi di **F1-4**: `currentLiabilities` memakai `CURRENT_LI...
- `balanceSheet()` ditelaah baris-demi-baris: identitas **A = L + E** benar — keenam tipe akun (ASSET/LIABILITY/EQUITY/REVENUE/COGS/EXPENSE) ter-map, contra-as...

### 2026-06-13 — F1-4: Rasio Keuangan Benar (F-02 presedensi + F-18 kas/AR)
- **`financial-ratios.helper.ts` (baru, pure)** + `backend/test/unit/financial-ratios.helper.test.js` (12/12 hijau total).
- **`accounting-reports.service.ts` `financialRatios()`**:

### 2026-06-13 — F1-3: Perbaikan Cashflow (F-01/05/19/20) + classifier teruji
- **Tulis `13_AKUNTANSI_LAPORAN §6`** — spec before→after 4 sub-langkah (sebelumnya checklist menunjuk §6 yang belum ada).
- **`cashflow-classifier.ts` (baru, pure)** + `backend/test/unit/cashflow-classifier.test.js` (10/10 hijau total): klasifikasi arus kas terverifikasi zero-depe...

### 2026-06-13 — F1-2: Guard Hapus/Ubah Pembayaran Kamar OCCUPIED (D-17 / GAP #3 / B-04)
- **`invoice-payments.service.ts`** — tambah helper `assertStayNotOccupiedForPaymentMutationTx`, dipanggil di `update` + `remove` (dalam tx, sesudah `FOR UPDAT...
- Menutup lubang: pembayaran TANPA jurnal (best-effort skip) sebelumnya masih bisa dihapus saat kamar sudah ditempati → occupancy vs uang inkonsisten. Booking...

### 2026-06-13 — F1-1R: No-Partial Menyeluruh (D-02 / GAP #1 / B-01)
- **`payment-submissions.service.ts` `approveSubmission`** — tambah gate re-validasi dua nominal sah (sebelumnya hanya blokir overpay → bisa approve PARTIAL li...
- **`approveSubmission` invoice-only** (renewal/utilitas/manual) — wajib `amount === invoiceRemaining` (lunas penuh), bukan sekadar `≤`.

### 2026-06-13 — F1-T: Sabuk Pengaman Unit Test Finance (baseline terkunci)
- **F1-T SELESAI** — pasang harness unit test zero-dependency (Node built-in `node --test`, tanpa npm install):
- `backend/test/unit/pricing.test.js` — `calculateRentByPricingTerm` (multiplier 13/45/75/100/550/1000% + pembulatan naik 5.000), `roundUpToNearest`, `isUtilit...

### 2026-06-13 — Audit Traceability Root Docs + Router `_PETA_AI` + Penomoran 06-09 (docs-only)
- **Buat `_PETA_AI.md`** — router 22 file root: §1 tabel "baca saat" + status akurasi, §2 anchor `file:baris` TERVERIFIKASI vs kode (`3c7ffe2`), §3 status defe...
- **Audit mendalam 22 file root → perbaiki 4 defek traceability:**

### 2026-06-13 — Normalisasi Logic dan Referensi Root Docs
- Rename fisik dossier `06`-`15` menjadi `10`-`19` agar sesuai heading, blueprint, checklist, dan tab kerja.
- Tetapkan hierarki sumber kebenaran: keputusan owner untuk aturan bisnis, kode untuk perilaku aktual, checklist untuk ID/urutan task.

### 2026-06-13 — Audit Forensik V3 + 84 Keputusan Owner + Restruktur Docs Domain-Dossier (READ-ONLY, belum sentuh kode aplikasi)
- Subbagian: Audit forensik V3 (Fable 5, baca kode penuh per-baris)
- **97 temuan** di atas 53 temuan V1: finance F-17..F-34 (cashflow salah-akun F-01 + kembarannya F-18 yang LOLOS fix V1, rasio, BS-MoM 0%, settlement deposit b...

### 2026-06-12 — Simplifikasi & Update Docs — FLOW_MAP V2 + 6 Flow Baru + Arsip
- Subbagian: Update besar `docs/02_FLOW_MAP.md` (V2)
- **Koreksi 5 bagian basi:**

### 2026-06-12 (larut) — Eskalasi Tuntas + 5 Skenario Residual PASS + Runbook Deploy → SIAP PRODUKSI
- Subbagian: Eskalasi diimplementasikan & diverifikasi runtime
- **E-1 Guard global (default-deny):** `APP_GUARD` JwtAuthGuard+RolesGuard + decorator `@Public()` (login/forgot/reset, public/bookings, public/rooms, faqs/pub...

### 2026-06-12 (malam) — UAT Siklus Overstay V5.12.1 PASS PENUH + Rekonsiliasi Bersih
- Subbagian: UAT overstay end-to-end (stay tes #15, kamar G2-003 — manipulasi tanggal via SQL UAT, eksekusi via `POST /auto-ops/run`)
- H-3: notifikasi "⏰ Kontrak berakhir 3 hari lagi" terkirim ✓

### 2026-06-12 (sore) — E-2 Backfill (DB UAT) + UAT M-07/M-09 PASS Penuh
- Subbagian: E-2 — Backfill `initialMetersPromotedAt` (data fix, DB UAT 5433)
- 11 stay penghuni nyata (kamar OCCUPIED, jaminan terbayar) diisi `initialMetersPromotedAt = checkInDate` via SQL bertransaksi; 1 booking fase RESERVED dikecua...

### 2026-06-12 — Eksekusi FIX-01..26 oleh AI eksekutor (VERIFIED) + Audit UI/UX Visual
- Subbagian: Eksekusi audit mega (kode)
- AI eksekutor menerapkan **24/24 FIX** dari `04_FIX_INSTRUCTIONS.md` (commit e4a8c31..f9d10ac, 1 commit per FIX; M-26/M-27 digabung 1 commit — deviasi minor d...

### 2026-06-12 — Audit Mega Full-Sweep (docs only, tanpa perubahan kode aplikasi)
- Subbagian: Type
- Subbagian: Deliverables

### 2026-06-11 — Docs Compaction + Keputusan Owner D1–D4 (tanpa perubahan logika, 1 copy fix)
- Subbagian: Type
- Subbagian: Keputusan owner (detail di `02_FOCUS_PLAN.md` §3)

### 2026-06-11 — V5.12.2 Frontend DP/Jaminan + Rate Limiting + Audit Pass C/E/P3
- Subbagian: Type
- Subbagian: Frontend (fitur V5.12.x kini terlihat pengguna)

### 2026-06-11 — V5.12.1 Overstay Lifecycle (Keputusan Owner)
- Subbagian: Type
- Subbagian: Siklus overstay lengkap (auto-ops, urutan sequential)

### 2026-06-11 — V5.12.0 DP (Uang Muka) vs Deposit (Jaminan) + Overstay Enforcement Baru
- Subbagian: Type
- Subbagian: Schema (additive)

### 2026-06-11 — V5.11.1 Audit Pass A/B — Fix Paket 1
- Subbagian: Type
- Subbagian: Fixed

### 2026-06-11 — V5.11.0 Audit Hardening & Business Logic Fixes
- Subbagian: Type
- Subbagian: Commits (5)
