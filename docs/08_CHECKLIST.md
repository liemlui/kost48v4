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
- [ ] **F1-1R** No-partial menyeluruh — dossier **10** · `payment-submissions.service.ts` approve booking/invoice-only + `invoice-payments.service.ts` create/update manual · DP atau pelunasan tepat saja; invoice-only/manual wajib lunas · nominal kurang→409, tsc 0.
- [ ] **F1-2** Guard remove/update payment OCCUPIED — dossier **10** · `invoice-payments.service.ts:189,237` · 409 bila stay promoted/room OCCUPIED · selesai: remove stay promoted→409, booking RESERVED tetap bisa.
- [ ] **F1-3** Perbaikan cashflow (F-01/05/19/20) — dossier **13 §6** (PECAH 4 sub-langkah F1-3a..d, before→after kode ada) · `accounting-reports.service.ts:731-915` · F1-3a deteksi kas via `cashAccountId!=null` · F1-3b opening filter '10' · F1-3c klasifikasi sekali (buang dead FIXED_ASSET) · F1-3d beginning=saldo akhir bln lalu · TIRU blok E-4 :837-862 (DO-NOT-TOUCH) · selesai: skenario emas harness §5 (operating-in=Σ kas-masuk, bukan AR; beginning+net=ending). Ekstrak classifier → `cashflow-classifier.test.js`.
- [ ] **F1-4** Rasio (F-02 presedensi + F-18 kas/inventory) — dossier **13 §6** (before→after kode) · `:961,965,978,932-934` · kurung expenseRatio; kas→prefix'10'; inventory→'12'; currentLiab prefix 20-23 · selesai: beban1jt/rev4jt→**25** (bukan 1e8).
- [ ] **F1-5** Deposit = kewajiban lancar (F-03) — dossier **13** · `:932-934` · prefix `['20','21','22','23']` · selesai: currentRatio turun wajar saat ada deposit HELD.
- [ ] **F1-6** Occupancy rasio (F-04) — dossier **13** · `:979` · hitung inline (room operable vs stay promoted) · selesai: occupancyRatePercent>0 saat ada penghuni.
- [ ] **F1-7** DRAFT bukan revenue (F-09) — dossier **13** · `reports.service.ts:31,45,309,377,485`+`finance.service.ts:66,187,311,316,436` · `status:{notIn:[DRAFT,CANCELLED]}` · LARANGAN: jangan ubah openInvoice/guard checkout.
- [ ] **F1-8** Guard settlement deposit (F-24) — dossier **13 §6** (snippet siap) · `accounting-posting.service.ts:602` · TAMBAH cek receipt journal POSTED di awal, skip benign bila tak ada (JANGAN ubah jurnalnya) · selesai: akun 2000 tak bisa saldo debit; `deposit-reconciliation` MATCHED.
- [ ] **F1-9** Deposit bukan operating cashflow (F-10) — dossier **13** · exclude perubahan liability deposit dari operating-in/out dan tampilkan section terpisah · selesai: skenario emas menunjukkan sewa 1,7jt sebagai operating-in, deposit 500rb sebagai perubahan liability.
- [ ] **F1-10** Kunci deposit = `Room.defaultDepositRupiah` (C3) — dossier **11** · `tenant-bookings.service.ts:341`+`stays.create:159` · abaikan override `dto.depositAmountRupiah`.
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
