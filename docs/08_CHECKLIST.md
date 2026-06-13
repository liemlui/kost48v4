# KOST48 V5 — Checklist Eksekusi (untuk AI eksekutor)
**Versi:** 2026-06-13 — pasca audit V3 + 84 keputusan owner + restruktur domain-dossier. Versi lama → `archieve/CHECKLIST_V5100_STALE.md`.
**Cara pakai:** kerjakan task BERURUTAN dari atas. Tiap task tunjuk **dossier** tempat spesifikasi LENGKAP (aturan + lokasi kode + cara fix + UAT). Centang `[x]` saat selesai + verifikasi.

## 🤖 PROTOKOL AI EKSEKUTOR (baca tiap mulai)
1. Baca `00_BLUEPRINT.md` (orientasi) → navigasi via **`_PETA_AI.md`** (router + anchor terverifikasi §2; **eksekusi otonom/YOLO + hard-gate ada di §4**) → buka **dossier** yang ditunjuk task → baca Temuan + Task + UAT domain itu.
2. **ANCHOR = PETUNJUK AWAL, bukan kebenaran.** `file:baris` di task ini bergeser tiap commit — **WAJIB konfirmasi dulu via grep nama fungsi/simbol**, baru edit. JANGAN edit baris secara buta. Anchor terverifikasi terakhir: `_PETA_AI §2`.
3. Kerjakan **1 task = 1 commit**. Backend: `cd backend; npx tsc --noEmit` = 0 error. Frontend: `cd frontend; npm run build` (tsc+vite) pass.
3b. **Task KEUANGAN (dossier 10/12/13) WAJIB lewati gate `05_VERIFIKASI_KEUANGAN.md`** sebelum commit: jalankan `node --test "test/**/*.test.js"` (hijau) + cek invarian + angka harapan. `tsc 0` SAJA TIDAK CUKUP untuk finance.
4. Commit Bahasa Indonesia: `fix:`/`feat:`/`perf:`/`ui:`/`ops:`/`test:`. Lalu centang `[x]` di sini + tulis 1 baris di CHANGELOG.
5. **Boleh jalan terus tanpa tanya** untuk task TANPA marker 🧬/[SCHEMA]/🧑 (semua sudah jelas di dossier). **STOP & lapor (jangan tebak)** HANYA bila: simbol/fungsi target tak ditemukan via grep / error tetap setelah 2× coba / butuh `npm install` / task ber-marker 🧬/[SCHEMA] (schema belum di-approve owner) / langkah 🧑 owner / file sedang dimodifikasi AI lain (`git status` dulu).

## 🚫 LARANGAN MUTLAK
- JANGAN tambah dependensi npm. JANGAN ubah `schema.prisma`/`sql/` TANPA approval owner (task ber-tanda [SCHEMA] perlu schema). JANGAN `git push` (owner yang push). JANGAN sentuh file yang muncul di `git status` sebagai milik AI lain — cek dulu.
- JANGAN pakai PowerShell `Get-Content`/`Set-Content -Encoding utf8` untuk edit docs massal (merusak UTF-8). Pakai Edit tool.
- JANGAN ubah logika payment/auto-ops/accounting di luar yang diminta task.

## ⚠️ KONTEKS PENTING
- **Sistem BELUM publish** (DB = data testing, boleh dihapus). Deploy = FRESH, bukan migrasi. Semua tugas "perbaiki data lama" GUGUR.
- **1 staf** → round-robin & leaderboard antar-staf DITUNDA. **Tenant = pengawas staf.** Bayar tunai+transfer. Lokasi: Surabaya Barat.
- Keputusan owner mengikat: `03_KEPUTUSAN_OWNER.md`. Aturan bisnis = sumber kebenaran.

---
## FASE 1 — SEBELUM DEPLOY (uang & laporan benar) — WAJIB tuntas dulu
- [x] **F1-0** Koreksi alamat docs → Surabaya Barat (SELESAI 2026-06-13).
- [x] **F1-T** 🛡️ SABUK PENGAMAN TERPASANG (SELESAI 2026-06-13) — `backend/test/unit/pricing.test.js` + `periode.test.js` dibuat (kode dari `05 §3`, nilai diverifikasi vs kode), script `test:unit` ditambah. **6/6 test hijau** via `npm run build && npm run test:unit`. Baseline finance terkunci. Catatan: `node --test test/` GAGAL di Node 22/Windows → pakai `node --test "test/**/*.test.js"`.
- [x] **F1-1R** No-partial menyeluruh (SELESAI 2026-06-13) — gate dua-nominal direplikasi di `approveSubmission` (booking: DP-persis/pelunasan-persis; invoice-only: lunas penuh) + `createSubmission` invoice-only `!==`→409 + `invoice-payments` create/update manual wajib lunas penuh. tsc 0, unit 6/6 hijau, logika dicocokkan vs skenario emas 05 §5. ⏳ runtime rekonsiliasi/skenario-emas → gate pra-deploy F1-12.
- [x] **F1-2** Guard remove/update payment OCCUPIED (SELESAI 2026-06-13) — helper `assertStayNotOccupiedForPaymentMutationTx` dipanggil di `invoice-payments` update+remove (dalam tx, sesudah lock): 409 bila `initialMetersPromotedAt!=null` ATAU room OCCUPIED (walau tanpa jurnal); booking RESERVED tetap bisa. tsc 0.
- [x] **F1-3** Perbaikan cashflow (F-01/05/19/20) (SELESAI 2026-06-13) — dossier **13 §6** (before→after 4 sub-langkah ditulis). Classifier murni `cashflow-classifier.ts` (F1-3a kas via cashAccountId/'10', bukan '11'=AR; F1-3c classify-once anti double-count) + opening filter '11'→'10' (F1-3b) + beginning=opening+Σ mutasi kas <periodStart, ending=beginning+net (F1-3d). tsc 0, `cashflow-classifier.test.js` 10/10 hijau. ⏳ runtime skenario emas → gate pra-deploy F1-12.
- [x] **F1-4** Rasio (F-02 presedensi + F-18 kas/inventory) (SELESAI 2026-06-13) — dossier **13 §7** (before→after). Helper `financial-ratios.helper.ts`: expenseRatio presedensi diperbaiki (beban1jt/rev4jt=**25**), kas prefix '10' (bukan '11'=AR), inventory '12' (bukan '14'), currentLiab ['20','21','22','23'] (termasuk deposit 2000). tsc 0, `financial-ratios.helper.test.js` 12/12 hijau. ⏳ runtime → F1-12.
- [x] **F1-5** Deposit = kewajiban lancar (F-03) (SELESAI 2026-06-13) — currentLiabilities di `financialRatios` sudah pakai `CURRENT_LIABILITY_PREFIXES ['20','21','22','23']` (termasuk deposit 2000) → landed di commit F1-4; currentRatio turun wajar saat deposit HELD. Balance sheet `balanceSheet()` ditelaah: A=L+E benar (6 tipe ter-map, contra ter-net) — F-17 tak bermanifestasi di kode. Tanpa kode baru.
- [x] **F1-6** Occupancy rasio (F-04) (SELESAI 2026-06-13) — `financialRatios` hitung occupancy INLINE (operable=kamar isActive−MAINTENANCE/INACTIVE; huni=stay ACTIVE&promoted) via `occupancyRatePercent()`, ganti `bs.statement?.occupancyRate` yg selalu 0. Konsisten finance.service. tsc 0, test 13/13 hijau. ⏳ runtime occupancy>0 saat ada penghuni → F1-12.
- [x] **F1-7** DRAFT bukan revenue (F-09) (SELESAI 2026-06-13) — `reports.service.ts` (4 agregat revenue) + `finance.service.ts` (5 agregat revenue ber-periodStart) → `status:{notIn:[DRAFT,CANCELLED]}`. TIDAK menyentuh: groupBy countByStatus (butuh DRAFT utk unpaidCount), openInvoice/AR (`notIn[PAID,CANCELLED]`, sengaja termasuk DRAFT per guard checkout). tsc 0, test 13/13 hijau. ⏳ runtime P&L tanpa DRAFT → F1-12.
- [x] **F1-8** Guard settlement deposit (F-24) (SELESAI 2026-06-13) — `postDepositSettlementTx`: TAMBAH cek `journalEntry` sourceType DEPOSIT + sourceId `String(stayId)` + status POSTED (= receipt journal yang kredit 2000); bila tak ada → `skip()` benign. Jurnal settlement TIDAK diubah (DO-NOT-TOUCH §2 patuh). tsc 0, 13/13 hijau. ⏳ runtime: akun 2000 tak saldo debit + `deposit-reconciliation` MATCHED → gate pra-deploy F1-12.
- [x] **F1-9** Deposit bukan operating cashflow (F-10) (SELESAI 2026-06-13) — classifier: sourceType `DEPOSIT` → section `depositLiability` (perubahan liabilitas titipan), keluar dari operating; cashflow() tambah section + netCashflow memuat netDeposit. tsc 0, 13/13 hijau (test deposit→depositLiabilityIn, operatingInTotal=0). ⏳ runtime skenario emas (sewa operating-in, deposit perubahan liability) → F1-12.
- [x] **F1-10** Kunci deposit = `Room.defaultDepositRupiah` (C3) (SELESAI 2026-06-13) — `stays.create` deposit = `room.defaultDepositRupiah ?? 0` (ignore dto); `approveBooking` tak lagi override `depositAmountRupiah` (tetap di snapshot room-default dari createBooking:159). tsc 0, 13/13 hijau.
- [x] **F1-11** Booking expiry 3 jam flat (D-04) — kedua helper booking memakai `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`, default 3 jam (diverifikasi 2026-06-13).
- [ ] **F2-8** Matikan endpoint draft jurnal manual (F-22/F-23) — dossier **13** · `accounting.controller.ts:207` · nonaktifkan/403 route draft + sembunyikan tombol UI.
- [ ] **F1-12** 🧑 DEPLOY BERSIH (owner+AI pendamping) — dossier **04** · provision DB produksi kosong→`prisma db push`→`bootstrap.sql`→seed COA→periode OPEN→opening balance→CashAccount Cash(1000)+Bank(1010)→smoke E-1→baseline reconciliation. TANPA backfill/migrasi data UAT.

## FASE 2 — PASCA DEPLOY (flow & model)
- [ ] **F2-1** [BESAR][SCHEMA] Renewal DP penuh (GAP #2) — dossier **11 §5** (desain+state machine+7 UAT) · schema RenewRequest +5 status (owner-approve) + sweeper auto-ops · PRASYARAT: Fase 1 + F1-1R. STOP: schema belum approve.
- [ ] **F2-2** Notif renew (request→admin, approve/reject→tenant, prompt H-10) — dossier **16** · salin pola `checkout-requests.service.ts:294-422`; sertakan fallback antrean admin untuk tenant tanpa akun portal.
- [ ] **F2-3** Copy A17 dua-varian (loser sudah-transfer vs belum) — dossier **16** · `payment-submissions.service.ts:840-847`.
- [ ] **F2-3b** 🧬 Catat refund kalah-cepat di sistem — dossier **10/16** · field bukti transfer + status + UI admin (schema owner-approve).
- [ ] **F2-5** Tutup ghost-stock + konsolidasi util (I-02) — dossier **14** · `staff-field-reports.service.ts:478-505` pakai util lock+validasi dari `inventory-movements` · selesai: RETURN qty>kamar via adminReview→409.
- [ ] **F2-6** Auto-tiket inspeksi saat cancel stay promoted (B-08) — dossier **12** · `stays.service.ts:768-790` salin blok dari `complete`.
- [ ] **F2-9** KPI tiket double-count (K-6) — dossier **15** · `staff-performance.service.ts:174-184,209` · dasar ticketsDone=`resolvedAt` dlm bulan.
- [ ] **F2-16** Perketat OWNER-only (D-17) — dossier **18** · audit `@Roles` semua controller · OWNER-only: tutup/buka periode, user/staf mgmt, setelan kamar & harga, deposit/refund · ADMIN→403.
- [ ] **F2-18** Model tenant-pengawas — dossier **15** · longgarkan `tickets.close` (staf boleh tutup, termasuk inspeksi→kamar siap, guard keselamatan tetap) + `StaffReview.status`+=PENDING_VERIFICATION (≤2 gate owner) + cakupan staf/fasilitas/admin (schema owner-approve).
- [ ] **F2-11** Performa publik (V-1+W-02+W-03+UD-05) — dossier **17** · `App.tsx:13` lazy PublicGuestDashboard / CSS ring + skeleton detail + pagination 12 katalog + sticky CTA.
- [ ] **F2-12** Sinyal tiket + aging (F-21/F-27) — dossier **13** · `finance.service.ts:93` kategori nyata+buang catch; aging `:73`/`reports:115` total−Σpayments.
- [ ] **F2-14** Timezone WIB (F-25/E-6) — dossier **13** · `accounting-posting-helpers.ts:6-9` dateOnly WIB + `staff-performance`/`staff-routines` monthRange WIB. Jalankan awal bulan.
- [ ] **F2-17** Notif booking-dibatalkan-sweeper (E3) — dossier **16** · `cancelEndedUnpaidStay`/`expireBookingTx` best-effort di LUAR tx.

## FASE 3 — OPERASIONAL & VISIBILITAS
- [ ] **F3-3** SEO dasar — dossier **17** · `index.html` OG+JSON-LD LodgingBusiness (alamat Surabaya Barat)+canonical + `public/robots.txt`+`sitemap.xml`. Target Lighthouse SEO ≥90.
- [ ] **F3-4** Social proof home (D-09) — dossier **17** · endpoint publik agregat StaffReview rating≥4 (inisial) + count penghuni.
- [ ] **F3-7** Occupancy heatmap (D-15: historis+berjalan+depan) — dossier **17** · komponen CSS grid + endpoint `/api/reports/occupancy-daily?from&to`.
- [ ] **F3-14** 🧬 Tombol admin "tenant kabur" (B2) — dossier **12** · nunggak X hari+tak terhubung → checkout+potong deposit.
- [ ] **F3-15** 🧬 Lacak barang abandoned 30 hari (B3) — dossier **12** · field `belongingsDeadline`+status ABANDONED+notif.
- [ ] **F3-16** Paksa-checkout overstay nunggak (B4) — dossier **12** · potong deposit; deposit kurang→sisa jadi PIUTANG (AR 1100).
- [ ] **F3-17** 🧬 Upload+verifikasi KTP (E1) — dossier **18** · field KTP foto terproteksi + gate aktivasi kamar + hapus saat keluar (UU PDP).
- [ ] **F3-18** Expense rutin auto-draft (G-c) — dossier **13** · job awal bulan buat DRAFT (gaji/listrik/air/internet/sewa/pajak) untuk konfirmasi admin.
- [ ] **F3-19** SLA tiket + KPI adil — dossier **15** · resolved time dari `assignedAt`, breakdown kategori, `Ticket.dueAt` per kategori (24j/3h/7h), dan eskalasi staf→admin→owner.
- [ ] **F3-20** Auto-prompt review tenant→staf (I-b) — dossier **15** · trigger saat tiket tenant ditutup (`TenantStaffReviewPrompt` FE sudah ada).
- [ ] **F3-21** Depresiasi otomatis bulanan (I-c) — dossier **13** · pindah dari manual ke auto-ops/auto-close.
- [ ] **F3-1** Notif coverage 5 event + K-8 penerima — dossier **16** · ticket-assign, wifi, room-ready, sweeper-cancel, BARANG_PINDAH→assignee.
- [ ] **F3-2** Inbox admin payment-submitted — dossier **16** · pola notifyOwnerAdminOnCreate.
- [ ] **F3-9** Hierarki laporan (F-11/F-12/F-31) — dossier **13** · badge Formal/Estimasi + samakan filter unmapped.
- [ ] **F3-10** Higiene jurnal (F-13/F-08/F-28) — dossier **13** · forfeit entryDate kejadian; entryNumber suffix VOID; race P2002 as-already-posted.
- [ ] **F3-11** Lead source dropdown + foto via config (M-08/M-04) — dossier **17**.
- [ ] **F3-12** Paket chart (V-2/UD-04/V-5/V-7) — dossier **17** · n<5 count, all-zero empty-state, palet Okabe-Ito.
- [ ] **F3-13** Ops-hardening (B-06/B-07/B-11/B-12/B-14/N-02) — dossier **12/13/16** · forced-checkout cancel DRAFT, copy job, reminder window, dll.

## FASE 4 — FUTURE
- [ ] **F4-1** 🧬 Unearned revenue PSAK 72 (F-15, sewa panjang) — dossier **13** · desain dulu.
- [ ] **F4-9** 🧬 Gamifikasi/loyalitas tenant — dossier **19** (desain lengkap) · schema TenantPoint/RewardCatalog/Redemption · bangun setelah inti sehat.
- [ ] **F4-2** PWA Web Push (4 kelompok event J-d) — dossier **16** · outbox+VAPID.
- [ ] **F4-7** Pruning notifikasi >90 hari (N-04) — dossier **16**.
- [ ] **F4-8** 🧬 Flow pindah kamar resmi (E4) — desain dulu.

## ⏸️ DITUNDA (1 staf — aktifkan saat staf ≥ 2)
- [ ] **F2-10** Round-robin penugasan tiket (K-4) — dossier **15**.
- [ ] **F3-5** Leaderboard antar-staf (kartu rumus skor TETAP jalan) — dossier **15**.

> Legenda marker: **🧬 / [SCHEMA]** = perlu perubahan schema additive (WAJIB approval owner dulu) · **🧑 / [OWNER]** = langkah manusia/owner · **[BESAR]** = task besar, desain lengkap sudah ada di dossier.

<!-- KOST48_DOCS_SYNC_20260613_CHECKLIST_DOSSIER -->
