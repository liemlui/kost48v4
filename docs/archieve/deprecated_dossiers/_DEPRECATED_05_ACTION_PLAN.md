# MASTER ACTION PLAN V3 — KOST48 V5.13+
**Total:** 4 fase · 44 task · estimasi 28–34 sesi AI eksekutor · menggantikan `docs/fable5-audit/10_MASTER_ACTION_PLAN.md` (V1, 24 task)
**Perubahan kunci dari V1:** (1) F1-1 DIREVISI jadi F1-1R — spesifikasi lama akan MEMATIKAN jalur DP 30% yang sah; (2) +1 task data-truth UD-01 (alamat); (3) +20 task dari temuan deep V3 (F-17..F-34, B-01..B-15, I-01..I-10, K-6..K-8, N-01..N-04, UD-01..07).

## 0. Ringkasan eksekutif
Mesin uang & jurnal sehat — kerusakan terkonsentrasi di: (a) lapisan LAPORAN (9 bug baru ditemukan di atas 4 bug V1 — cashflow, rasio, MoM neraca, sinyal dashboard); (b) GOVERNANCE pinggiran (draft jurnal dead-end, COA bisa diubah, admin-review stok tanpa lock); (c) COVERAGE notifikasi (renew nol, copy A17 menyesatkan); (d) 1 kontradiksi DATA-TRUTH alamat properti. GAP #1 owner ternyata SEBAGIAN sudah tertutup di kode (gate A18) — rencana lama harus dikoreksi sebelum dieksekusi. GAP #2 (renewal DP) tetap satu-satunya aturan owner yang belum diimplementasi sama sekali.

> ### 🔴 BANNER (keputusan owner 2026-06-13, lihat `04_KEPUTUSAN_OWNER.md`): SISTEM BELUM PUBLISH — DATABASE = DATA TESTING
> Owner: *"Itu hanya testing, lebih baik data dihapus semua juga tidak masalah sebab kita belum publish."* Konsekuensi: **deploy = START BERSIH** (drop DB testing → seed COA → opening balance produksi), BUKAN migrasi. Semua tugas "perbaiki data lama" GUGUR (F-24/F-06/F-07/E-2/F2-4); KODE-nya tetap diperbaiki agar produksi ke depan bersih. Ini kesempatan emas menuntaskan Fase 1 + GAP #2 SEBELUM ada data hidup. 16 keputusan owner (D-01..D-16) sudah memodifikasi task di bawah — baca `04_KEPUTUSAN_OWNER.md` sebelum eksekusi.

## Aturan untuk AI eksekutor (WAJIB)
1. Kerjakan berurutan dalam fase; 1 task = `npx tsc --noEmit` 0 error = 1 commit berbahasa Indonesia.
2. STOP condition per task = lewati + catat di CHECKLIST + lanjut task berikutnya.
3. JANGAN: tambah npm deps, ubah schema.prisma/sql, push, atau sentuh file yang sedang M oleh AI lain (`git status --short` dulu).
4. Setiap task selesai: prepend CHANGELOG + update CHECKLIST.
5. Baris kode pada spesifikasi = posisi saat audit (commit 292817b + working tree 2026-06-13); bila bergeser, cari pola yang disebut, jangan menebak.

---

## FASE 1 — KRITIS (sebelum/saat deploy produksi) — 10 task

### F1-0 · 🔴 UD-01 Koreksi alamat properti → DOCS yang salah (D-01 TERJAWAB)
- **Keputusan D-01:** alamat BENAR = **Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall/PTC)** — FRONTEND benar, DOCS salah.
- **File:** `docs/01_GROUND_STATE.md §1` (+ grep `Ngagel Jaya Utara` di seluruh docs) + memory.
- **Spesifikasi:** ganti "Ngagel Jaya Utara" → "Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)" di semua docs. Frontend & meta SEO TIDAK diubah (sudah benar) — F3-3 SEO memakai alamat ini.
- **Kriteria selesai:** 0 kemunculan "Ngagel" di docs; 1 alamat konsisten docs+frontend.
- **Stop:** —.

### F1-1R · 🔴 (REVISI V1 F1-1) No-partial MENYELURUH — D-02 TERJAWAB
- **Keputusan D-02:** TIDAK ADA partial di MANA PUN (booking, renewal, utilitas). Diperluas dari "hanya booking" V1.
- **File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts` — approve booking (:406-430) DAN jalur invoice-only (:146-159 createSubmission + :421-430 approve).
- **Spesifikasi:** (a) booking path: REPLIKASI gate dua-nominal-sah createSubmission (:122-135) di approve — tolak bila amount ≠ sisa-DP-persis DAN ≠ (sisa invoice + sisa deposit); (b) invoice-only path: tolak bila amount ≠ sisa tagihan PENUH (renewal/utilitas wajib lunas, tidak boleh ≤ sisa). Throw ConflictException copy jelas.
- **Kriteria selesai:** DP persis ✅; pelunasan persis ✅; invoice renewal lunas ✅; semua nominal kurang → 409. tsc 0.
- **Larangan:** JANGAN pakai spesifikasi V1 lama (menolak DP sah). DP 30% tetap jalur sah.
- **Stop:** struktur isBookingPath berubah signifikan → STOP.

### F1-2 · 🟠 GAP #3 guard remove/update payment saat OCCUPIED (tetap dari V1, justifikasi dipertajam)
- **File:** `backend/src/modules/invoice-payments/invoice-payments.service.ts:189 (update), :237 (remove)`
- **Spesifikasi:** Dalam tx setelah lock, telusuri payment→invoice→stay: bila `stay.initialMetersPromotedAt != null` ATAU `room.status === OCCUPIED` → throw ConflictException 409 "Tidak dapat mengubah/menghapus pembayaran kamar yang sudah ditempati." (Guard jurnal :245 sudah ada tapi TIDAK menutup payment yang jurnalnya gagal/skip.)
- **Kriteria selesai:** remove pada stay promoted → 409 meski tanpa jurnal; pada booking RESERVED → tetap bisa.
- **Larangan:** create tidak disentuh (guard A1 sudah ada :142-150). **Stop:** relasi invoice→stay tidak ditemukan → STOP.

### F1-3 · 🔴 F-01+F-05+F-19+F-20 Perombakan cashflow ledger (4 bug, 1 fungsi)
- **File:** `backend/src/modules/accounting/accounting-reports.service.ts:731-915`
- **Spesifikasi:** (a) deteksi line kas = `line.cashAccountId != null` (pola E-4 :837), HAPUS `startsWith('11')` :794 dan ganti opening filter :760 ke `startsWith('10')`; (b) klasifikasi SEKALI per line: INVOICE_PAYMENT/WIFI_SALE/DEPOSIT(masuk)=operating-in, EXPENSE/DEPOSIT(refund)=operating-out, ADJUSTMENT ber-sourceId `FIXED_ASSET_ALIGNMENT:`=investing, OPENING_BALANCE=saldo awal BUKAN arus (hapus dari financing double-count :817-832); (c) `cashBeginning` = opening + Σ(D−K) line kas dgn `entryDate < periodStart`; `cashEnding = cashBeginning + netCashflow`; (d) hapus dead code `cashCOACodes` :768-771.
- **Kriteria selesai:** identitas beginning+net=ending berlaku; operating-in bulan uji = Σ jurnal INVOICE_PAYMENT+WIFI_SALE+DEPOSIT kas-masuk bulan itu (cross-check manual).
- **Larangan:** blok E-4 :837-862 jangan diubah logikanya. **Stop:** tidak ada CashAccount di DB uji → verifikasi via catatan tertulis.

### F1-4 · 🔴 F-02+F-18 Rasio: presedensi + kas-vs-piutang + inventory prefix
- **File:** `accounting-reports.service.ts:961, :965, :978`
- **Spesifikasi:** (a) :978 → `(((pnl.totals?.expenseRupiah ?? 0)) / totalRevenue)`; (b) :961 cashAndBank → prefix `'10'` (atau via cashAccountId); (c) :965 inventory → prefix `'12'`.
- **Kriteria selesai:** beban 1jt/revenue 4jt → expenseRatio 25; cashRatio memakai saldo 10xx.
- **Larangan:** 3 baris ini saja. **Stop:** —.

### F1-5 · 🟠 F-03 Deposit = kewajiban lancar di rasio
- **File:** `accounting-reports.service.ts:932-934`
- **Spesifikasi:** currentLiabilities filter → `['20','21','22','23'].some(p => code.startsWith(p))` (seluruh kewajiban kost bersifat lancar; tidak ada utang jangka panjang di COA).
- **Kriteria selesai:** currentRatio turun wajar saat ada deposit HELD berjurnal. **Stop:** —.

### F1-6 · 🟠 F-04 occupancyRate rasio selalu 0
- **File:** `accounting-reports.service.ts:979`
- **Spesifikasi:** hapus `bs.statement?.occupancyRate`; hitung inline: `room.count(isActive, status notIn [MAINTENANCE,INACTIVE])` vs `stay.count(ACTIVE, promoted)` (salin pola `reports.service.ts:431-445`).
- **Kriteria selesai:** efficiency.occupancyRatePercent > 0 saat ada penghuni. **Stop:** —.

### F1-7 · 🟠 F-09 Invoice DRAFT bukan revenue (10 lokasi terverifikasi)
- **File:** `reports.service.ts:31,45,309,377,485` + `finance.service.ts:66,187,311,316,436`
- **Spesifikasi:** semua agregat revenue invoice: `status: { notIn: [DRAFT, CANCELLED] }`.
- **Kriteria selesai:** P&L ops turun sebesar total DRAFT periode uji; tsc 0.
- **Larangan:** openInvoiceAgg / blockingInvoices / guard checkout JANGAN diubah (DRAFT memang penghalang lifecycle). **Stop:** pola `not: ... CANCELLED` pada aggregate revenue tidak ketemu → cari ulang per fungsi.

### F1-8 · 🔴 F-24 Settlement deposit tanpa receipt journal = liability negatif
- **File:** `backend/src/modules/accounting/accounting-posting.service.ts:602-687` (postDepositSettlementTx)
- **Spesifikasi:** sebelum posting, cek `journalEntry.findFirst({sourceType:'DEPOSIT', sourceId:String(stayId), status:'POSTED'})`; bila TIDAK ada → return skip benign dgn reason "Receipt deposit belum terjurnal; settlement journal di-skip agar akun 2000 tidak debit" (pola anti-piutang-fiktif :808-817).
- **Kriteria selesai:** settlement pada stay ber-receipt → jurnal seperti biasa; tanpa receipt → skip + tercatat reconciliation.
- **Larangan:** ledger TenantDepositLedgerEntry tetap dicatat (sumber kebenaran operasional). **Stop:** —.

### F1-9 · Deploy FRESH (bukan migrasi) — D-06 TERJAWAB (belum publish)
- **Keputusan D-06:** DB = data testing, boleh dihapus. Deploy = START BERSIH.
- **File:** `docs/06_DEPLOY_RUNBOOK.md` — eksekusi owner dgn pendampingan.
- **Spesifikasi:** drop/buat DB produksi kosong → `prisma migrate deploy` → `bootstrap.sql` (trigger/constraint) → seed default COA → buat accounting period berjalan (OPEN) → opening balance produksi (kas/bank, modal owner) → buat CashAccount → smoke test E-1 (guard default-deny) → jalankan 3 alat audit (reconciliation-lite, deposit-reconciliation, trial-balance) sebagai baseline 0 di DB kosong.
- **Kriteria selesai:** DB produksi bersih + COA + periode OPEN + opening balance POSTED + trial balance seimbang.
- **Larangan:** AI dilarang eksekusi (owner-only). TIDAK ADA backfill/rekonsiliasi data lama (tidak ada data lama).
- **Catatan:** RISK MATRIX baris F1-9 lama ("data produksi beda dari UAT") TIDAK BERLAKU — tidak ada data produksi.

---

## FASE 2 — PENTING (minggu 1–4 pasca deploy) — 14 task

### F2-1 · 🔴 GAP #2 Renewal DP 30% fase aman — ✅ DESAIN SELESAI di `06_DESAIN_RENEWAL.md`
- **Desain lengkap:** `06_DESAIN_RENEWAL.md` — state machine RenewRequest (AWAITING_DP/DP_SECURED/EXPIRED_PRIORITY/REJECTED_BY_TENANT/FORFEITED), aturan per fase, 7 skenario UAT, schema additive.
- **Inti (klarifikasi L2 mengoreksi R3):** tenant lama yang menyatakan perpanjang punya **prioritas eksklusif s/d hari-H tanpa wajib DP dulu**; di hari-H belum DP → kamar dibuka publik (first-paid-wins orang baru, mulai tanggal checkout). DP 30% → pelunasan H+7 (boleh lewat kontrak, forced checkout bila gagal).
- **File:** `renew-requests.service.ts` + `stays.service.ts:997` + `marketing-public-rooms.service.ts` + auto-ops (2 sweeper baru) + schema RenewRequest (owner-approve).
- **Kriteria selesai:** 7 skenario UAT (§5 desain) PASS. **Stop:** schema belum di-approve → STOP.
- **Prasyarat:** SETELAH Fase 1 + F1-1R (renewal pakai jalur payment-submission yang sama).

### F2-2 · 🔴 Notifikasi renew lengkap (request→admin, approved/rejected→tenant)
- **File:** `renew-requests.service.ts` (+module import NotificationsModule)
- **Spesifikasi:** salin 3 pola dari `checkout-requests.service.ts:294-345 (admin create), :354-376 (approve), :392-422 (reject)` — best-effort catch, linkTo `/portal/stay`.
- **Kriteria selesai:** 3 event ternotifikasi; gagal notif tidak menggagalkan transaksi. **Stop:** AppNotificationService tak ter-inject → tambah ke module.

### F2-3 · 🔴 N-01/W-B03 Copy notif kalah first-paid-wins
- **File:** `payment-submissions.service.ts:840-847`
- **Spesifikasi:** bedakan dua kasus saat loop losingTenants: cek apakah loser punya submission EXPIRED utk stay tsb → body: "Anda sudah terlanjur transfer? Dana akan dikembalikan admin secara manual — hubungi pengelola dengan bukti transfer." else copy lama. HAPUS kalimat "Tidak ada dana yang terpotong dari Anda" utk kasus pertama.
- **Kriteria selesai:** copy terverifikasi dua varian. **Larangan:** hanya copy + 1 query ringan. **Stop:** —.

### F2-3b · 🟠 GAP #4 Pencatatan refund di sistem — D-07 TERJAWAB
- **Keputusan D-07:** refund kalah-cepat DICATAT di sistem (bukan cuma di luar app).
- **File:** schema (owner-approve: field additive di Stay/PaymentSubmission) + `payment-submissions` + UI admin.
- **Spesifikasi:** tambah field `downPaymentRefundProofFileKey` + `downPaymentRefundedAt` + status refund; UI admin upload bukti transfer balik → status REFUNDED + notif tenant; portal tenant menampilkan status. DESAIN schema (additive) dulu.
- **Kriteria selesai:** admin upload bukti refund; tenant lihat status di portal. **Stop:** schema belum disetujui → sajikan desain dulu.

### ~~F2-4~~ · DIBATALKAN (keputusan D-06) — backfill deposit data lama tidak relevan
- DB testing dihapus saat deploy bersih (F1-9). Guard kode ke depan = F1-8. Tidak ada data yang di-backfill. Hapus dari estimasi.

### F2-5 · 🔴 I-02 Tutup vektor ghost-stock admin-review + X-01 konsolidasi util
- **File:** `staff-field-reports.service.ts:478-505,563-636` + `inventory-movements.service.ts`
- **Spesifikasi:** ekstrak `lockInventoryQtyTx` + `assertRoomItemQtyAvailableTx` + `ensureInventoryQtySyncedTx` + `syncRoomItem` dari inventory-movements ke util/service bersama; adminReview memakai util yang sama (lock dlm tx, validasi RETURN, self-healing). Sekalian: satukan `generateTicketNumber` (2 file) dan `releaseRoomAfterBookingCancelTx` (2 file).
- **Kriteria selesai:** RETURN qty > qty kamar via adminReview → 409; race 2 admin → 1 sukses 1 konflik; tsc 0.
- **Larangan:** kebijakan status GOOD-on-ASSIGN: samakan ke salah satu (usul: jangan setel status, biarkan admin tentukan — konfirmasi owner). **Stop:** circular dependency module → pakai util murni tanpa DI.

### F2-6 · 🟠 B-08 Auto-ticket inspeksi saat cancel stay promoted
- **File:** `stays.service.ts:768-790` (cancel)
- **Spesifikasi:** bila `wasPromoted` dan tidak ada stay aktif lain → setelah set MAINTENANCE, buat tiket CHECKOUT_INSPECTION (salin blok dari `complete` :605-654, dedupe per stay/room/kategori).
- **Kriteria selesai:** cancel stay promoted → kamar MAINTENANCE + tiket muncul; gate room-ready bekerja. **Stop:** —.

### F2-7 · 🟠 F-17 balanceSheetDetail MoM selalu 0%
- **File:** `accounting-reports.service.ts:1087-1099`
- **Spesifikasi:** previous = `this.balanceSheet({ asOf: new Date(Date.UTC(prevYear, prevMonth, 0)).toISOString().slice(0,10) })` (endDate bulan prev sebagai asOf) — JANGAN andalkan year/month yang diabaikan trialBalance.
- **Kriteria selesai:** BS detail bulan berjalan vs lalu menunjukkan delta nyata ketika ada jurnal baru. **Stop:** —.

### F2-8 · 🟠 F-22+F-23 Matikan endpoint draft jurnal manual — D-05 TERJAWAB
- **Keputusan D-05:** owner tidak pernah/tidak butuh draft jurnal manual → MATIKAN, bukan perbaiki.
- **File:** `accounting.controller.ts:207` (+ service `createJournalDraft`).
- **Spesifikasi:** sembunyikan/nonaktifkan endpoint `POST journal-entries/draft` (return 403/410 atau hapus route + sembunyikan tombol UI). Menghapus risiko F-22 (dead-end buntu close) & F-23 (samar sourceType auto) sepenuhnya tanpa menambah kode post/void.
- **Kriteria selesai:** endpoint draft jurnal tidak bisa dipanggil; tutup buku tidak bisa lagi diblokir draft. **Stop:** ada pemanggil lain endpoint ini di frontend → sembunyikan juga.

### F2-9 · 🟠 K-6 KPI tiket double-count lintas bulan
- **File:** `staff-performance.service.ts:174-184, :209`
- **Spesifikasi:** dasar `ticketsDone` = `resolvedAt { gte: start, lt: end }` saja; list evidence boleh tetap window OR tapi beri flag `countedForScore`.
- **Kriteria selesai:** tiket resolve Mei + close Juni → poin hanya di Mei. **Larangan:** jangan ubah bobot. **Stop:** —.

### F2-10 · ⏸️ DITUNDA (keputusan F2 2026-06-13: hanya 1 staf) — Round-robin penugasan tiket
> Dengan 1 staf, tidak ada beban timpang. Aktifkan kembali saat staf ≥ 2. Spesifikasi tetap di bawah untuk referensi.

### ~~F2-10-asli~~ · 🟡 W-B07/W-04/K-4 Round-robin penugasan tiket (referensi)
- **File:** `stays.service.ts:615-619` + `auto-ops.service.ts:610-614, :773-777`
- **Spesifikasi:** ganti `orderBy id asc` → pilih staf aktif dgn count tiket OPEN/IN_PROGRESS tersedikit (tie-break id asc); ekstrak ke util bersama (1 query groupBy).
- **Kriteria selesai:** distribusi tiket baru merata pada uji 6 tiket / 2 staf. **Stop:** —.

### F2-11 · 🟡 Sisa performa publik: V-1 + W-02 + W-03
- **File:** `App.tsx:13` + `PublicGuestDashboardPage.tsx` + `PublicRoomDetailPage.tsx` + `PublicRoomsPage.tsx`
- **Spesifikasi:** (a) lazy-load PublicGuestDashboardPage ATAU ganti donut home → CSS conic-gradient (hapus import recharts); (b) skeleton kartu di detail kamar (komponen SkeletonLoader sudah ada); (c) pagination 12 kartu + "Tampilkan 12 lagi" + reset saat filter.
- **Kriteria selesai:** build pass; bundle first-load publik tanpa recharts (cek dist stats); mobile 390px OK. **Larangan:** jangan ubah logika query. **Stop:** konflik dgn AI PWA pada file yang sama → STOP.

### F2-12 · 🟡 F-21+F-27 Dashboard sinyal & aging
- **File:** `finance.service.ts:93` + `reports.service.ts:92-135` + `finance.service.ts:73-77`
- **Spesifikasi:** (a) hapus filter kategori invalid pada highSignalTickets (atau ganti kategori nyata: PERBAIKAN/BARANG_RUSAK) + HAPUS `.catch(() => 0)` agar error terlihat; (b) aging & overdue: nilai = `totalAmountRupiah − Σpayments` per invoice (sertakan payments di select).
- **Kriteria selesai:** sinyal tiket muncul saat ada tiket open kategori tsb; aging PARTIAL = sisa, bukan full. **Stop:** —.

### F2-13 · 🟡 W-06/W-B08 Backup + healthcheck script (tetap V1)
- **File:** `scripts/ops/` — spesifikasi persis V1; TANPA registrasi scheduler; parse-check pass; jangan eksekusi.

### F2-14 · 🟡 F-25 + W-05/E-6 Paket timezone WIB
- **File:** `accounting/accounting-posting-helpers.ts:6-9 (dateOnly)` + `staff-performance.service.ts:9-21` + `staff-routines.service.ts (monthRange/today)`
- **Spesifikasi:** dateOnly → truncate berbasis WIB (geser +7 jam sebelum ambil komponen UTC, pola `jakartaNow` auto-ops:431-432); monthRange staf → WIB. Kolom DB tetap UTC.
- **Kriteria selesai:** transaksi 00:30 WIB tgl 1 → jurnal tertanggal tgl 1 (bukan akhir bulan lalu); KPI bulan benar. **Larangan:** jangan sentuh entryDate jurnal lama (no migration). **Stop:** error tipe menjalar → STOP. **Catatan:** jalankan awal bulan; umumkan ke staf (KPI bisa bergeser sehari).

---

## FASE 3 — OPTIMAL (bulan 2–3) — 13 task

### F3-1 · Notif coverage 5 event
- **File:** `tickets.service.ts:421 (assign), :651 (K-8 penerima BARANG_PINDAH)` · `wifi-sales.service.ts:40 (create)` · `tickets.service.ts:700-709 (room-ready)` · `auto-ops cancelEndedUnpaidStay` + `expireBookingTx` (sweeper-cancel, kirim di LUAR tx)
- **Spesifikasi:** best-effort `appNotification.create` + dedupe per entity; penerima: assign→staf ybs; BARANG_PINDAH→assignee (bukan actor); wifi→tenant pemesan; room-ready→tenant booking yang menunggu (bila ada) + admin; sweeper-cancel→tenant pemilik stay.
- **Kriteria selesai:** 5 event ternotifikasi; kegagalan notif tidak menggagalkan transaksi.
- **Stop:** —.

### F3-2 · Inbox admin payment-submitted
- **File:** `payment-submissions.service.ts:177-219` (createSubmission, setelah tx sukses)
- **Spesifikasi:** salin `notifyOwnerAdminOnCreate` dari `checkout-requests.service.ts:294-345` (loop admin aktif, Promise.allSettled, dedupe per submission).
- **Kriteria selesai:** admin terima notif saat submission masuk; linkTo `/payment-submissions/review`.
- **Stop:** —.

### F3-3 · Paket SEO dasar (PRASYARAT F1-0)
- **File:** `frontend/index.html` + `frontend/public/robots.txt` + `frontend/public/sitemap.xml`
- **Spesifikasi:** OG title/description/image + canonical; JSON-LD `@type: LodgingBusiness` dgn alamat BENAR hasil F1-0 + priceRange dari tarif publik; robots.txt allow / + ref sitemap; sitemap 3 URL (/, /rooms, /register). Tanpa lib SSR.
- **Kriteria selesai:** Lighthouse SEO ≥ 90; markup tervalidasi Rich Results Test.
- **Stop:** F1-0 belum selesai → STOP (jangan publikasikan alamat yang belum dikonfirmasi).

### F3-4 · Social proof home
- **File:** `PublicGuestDashboardPage.tsx` + endpoint publik read-only baru (controller marketing)
- **Spesifikasi:** agregat StaffReview VISIBLE rating≥4 (tampilkan inisial saja — UU PDP) + count penghuni aktif ("42/48 kamar terisi"); cache ringan di service.
- **Kriteria selesai:** section tampil dgn data nyata; tanpa data pribadi.
- **Stop:** owner belum setuju konten/consent → STOP.

### F3-5 · ⏸️ SEBAGIAN DITUNDA (1 staf) — Transparansi rumus skor + reward
- **Leaderboard antar-staf DITUNDA** (1 staf, tidak ada pesaing — keputusan F2 2026-06-13).
- **TETAP dikerjakan:** kartu "Cara skor dihitung" (K-2 transparansi) di `StaffMonthlyReportPage.tsx` + rekap netKpi bulanan ke owner untuk reward (D-13).
- **File:** `StaffMonthlyReportPage.tsx` (kartu rumus statis) + rekap owner.
- Aktifkan leaderboard saat staf ≥ 2; PRASYARAT saat itu: F2-9 (K-6 fix) + F2-10 (round-robin).

### F3-6 · KPI waktu resolusi tiket (display-only)
- **File:** `staff-performance.service.ts:209+`
- **Spesifikasi:** avg(resolvedAt−createdAt) tiket DONE/CLOSED per staf per bulan; tampilkan di laporan bulanan; JANGAN masukkan ke formula skor.
- **Kriteria selesai:** angka tampil; skor tidak berubah.
- **Stop:** keputusan bobot = owner (parkir di OPEN QUESTIONS).

### F3-7 · Occupancy Heatmap — D-15: HISTORIS + BERJALAN + DEPAN
- **Keputusan D-15:** tampilkan rentang lebar (bulan lalu + berjalan + ke depan), bukan 1 bulan.
- **File:** komponen baru `components/charts/OccupancyHeatmap.tsx` + endpoint `/api/reports/occupancy-daily?from&to`
- **Spesifikasi:** grid CSS div (BUKAN lib); intensitas = kamar promoted-terisi per tanggal; data = Stay promoted overlap (checkInDate..actualCheckOutDate∣plannedCheckOutDate); endpoint terima rentang from-to (default: −1 bln s.d +1 bln).
- **Kriteria selesai:** angka hari ini == occupancySummary snapshot; rentang lalu/depan ter-render.
- **Stop:** tanpa lib kalender baru.

### F3-8 · Queue dashboard admin
- **File:** `finance.service.ts` businessHealth + DashboardAdmin
- **Spesifikasi:** tambah metrik: umur rata-rata & maksimum PENDING_REVIEW; lead time booking→approve 7 hari terakhir.
- **Kriteria selesai:** kartu antrian tampil dgn angka tervalidasi manual.
- **Stop:** —.

### F3-9 · Hierarki laporan (F-11/F-12/F-31)
- **File:** `finance.service.ts:226` + halaman finance/reports frontend + `accounting-reports.service.ts:109`
- **Spesifikasi:** (a) formalRatiosReadiness baca readiness accounting nyata; (b) badge "Formal (ledger)" vs "Estimasi operasional" di tiap halaman laporan; (c) samakan filter unmapped scanner dgn close-readiness (`notIn [DRAFT, CANCELLED]`).
- **Kriteria selesai:** owner bisa membedakan sumber angka; dua angka unmapped konsisten.
- **Larangan:** jangan hapus laporan operasional.

### F3-10 · Higiene jurnal (F-13 + F-08 + F-28)
- **File:** `accounting-posting.service.ts:829, :43-48, :1181`
- **Spesifikasi:** (a) DP forfeit entryDate = tanggal kejadian H+1 (param dari sweeper); (b) entryNumber bentrok dgn VOID → suffix `-R<n>`; (c) bungkus create: catch P2002 → return as already-posted (idempotensi race-safe).
- **Kriteria selesai:** repost pasca-VOID sukses; tanggal jurnal forfeit = H+1; race paralel tidak melempar.
- **Larangan:** idempotensi non-VOID tetap.

### F3-11 · M-08 lead source + M-04 foto via konfigurasi
- **File:** form booking publik + `public-bookings.service.ts:187` + `marketing-public-rooms.service.ts:34-46`
- **Spesifikasi:** (a) dropdown opsional "Tahu KOST48 dari mana?" → isi bookingSource (enum LeadSource & kolom SUDAH ada); (b) pindahkan 76 nama file foto dari hardcode service ke `Room.images` (kolom ada) atau JSON konfigurasi.
- **Kriteria selesai:** bookingSource terisi dari pilihan; tambah foto tanpa deploy backend.
- **Stop:** —.

### F3-12 · Paket perbaikan chart existing + funnel
- **File:** `PaymentReviewPage.tsx` · `OwnerDashboardPage.tsx` · DashboardAdmin
- **Spesifikasi:** (a) V-2: n<5 → badge count, bukan donut; (b) UD-04: all-zero → EmptyState + "—" utk %-basis-nol; (c) V-7: hapus/toggle seri Laba di line tren; (d) V-5: palet Okabe-Ito; (e) funnel booking BarChart bertahap (data count Stay per tahap).
- **Kriteria selesai:** 5 perbaikan terpasang; build pass.
- **Stop:** —.

### F3-13 · Paket ops-hardening (6 temuan kecil)
- **File:** `auto-ops.service.ts:857 (B-06 copy), :361 (B-06 meta), :548 (B-07), :451-457 (B-14)` · `stays.service.ts:78-99 (B-12)` · `payment-submissions.service.ts:630-674 (B-11)` · `announcements.service.ts:116 (N-02)`
- **Spesifikasi:** (a) B-06: copy & meta job H+1 jangan klaim DP hangus; (b) **B-07 (D-03 TERJAWAB): exclude DRAFT dari blocker forced-checkout DAN auto-CANCEL invoice DRAFT saat forced checkout** (DRAFT = bukan tagihan resmi, selaras D-02); (c) B-12: guard plannedCheckOutDate ≥ hari ini di stays.update; (d) B-14: reminder window `<=` dgn dedupe gelombang; (e) B-11: log + flag response saat meter promotion ter-skip; (f) N-02: tunda notif pengumuman sampai startsAt.
- **Kriteria selesai:** overstay ber-DRAFT → tetap checkout otomatis + DRAFT ter-cancel; per kriteria temuan lain; tsc 0.
- **Stop:** —.

## TASK BARU DARI KEPUTUSAN FLOW & SUBSISTEM (2026-06-13) — lihat `04_KEPUTUSAN_OWNER.md`
> **Dokumen desain konkret (deliverable, baca sebelum koding):** GAP #2 renewal → `06_DESAIN_RENEWAL.md`; gamifikasi F4-9 → `07_DESAIN_GAMIFIKASI.md`; review/overstay/KTP/expense/SLA (F2-18, F3-14..20) → `08_DESAIN_OPERASIONAL.md`.
### Fase 1 (tambahan)
- **F1-10** Kunci deposit = `Room.defaultDepositRupiah` (C3): abaikan override `dto.depositAmountRupiah` di `tenant-bookings.service.ts:341` (approveBooking) & `stays.create:159`. tsc 0.
- **F1-11** Booking expiry 3 jam flat semua jalur (D2): `calculateBookingExpiry` → murni 3 jam dari createdAt, buang cutoff 21:00 WIB; samakan publik & portal.
### Fase 2 (tambahan)
- **F2-15** Tambah reminder H-10 (B1): `auto-ops.service.ts:451` REMINDER_DAYS `[7,3,1,0]` → `[10,7,3,1,0]`.
- **F2-16** Audit @Roles + perketat OWNER-only (D3): tutup/buka periode, hapus/nonaktif user-staf, ubah setelan kamar & harga, proses deposit/refund → tolak ADMIN. Sapu semua controller.
- **F2-17** Notif booking-dibatalkan-sweeper + alasan (E3): best-effort di `cancelEndedUnpaidStay`/`expireBookingTx` di LUAR tx.
- **F2-3b** Pencatatan refund kalah-cepat di sistem (D-07): field bukti transfer + status + UI admin (desain schema additive dulu).
- **F2-18** 🔴 Model tenant-pengawas (H-b/I-a): longgarkan `tickets.close` agar STAF boleh tutup (termasuk CHECKOUT_INSPECTION → kamar AVAILABLE) DENGAN guard keselamatan tetap (tidak ada stay aktif lain + barang GOOD); hanya batasan admin-only yang dilepas. Membalik sebagian M-27.
### Fase 3 (tambahan)
- **F3-14** Tombol admin "tenant kabur" → checkout + potong deposit (B2).
- **F3-15** Lacak batas **30 hari** ambil barang → abandoned (B3): field deadline + notif.
- **F3-16** Admin paksa-checkout overstay nunggak + potong sisa dari deposit (B4).
- **F3-17** Upload & verifikasi KTP sebelum aktivasi kamar (E1): field file terproteksi + gate.
- **F3-18** Auto-generate template expense rutin bulanan (G-c): gaji/listrik/air/internet draft tiap awal bulan.
- **F3-19** SLA tiket + eskalasi alert (H-a): deadline per kategori + job pengecek → alert admin/owner.
- **F3-20** Auto-prompt review tenant→staf setelah tiket tenant ditutup (I-b): trigger `TenantStaffReviewPrompt`.
- **F3-21** Depresiasi otomatis bulanan via auto-ops (I-c): pindah dari manual ke job (atau bagian auto-close).
- **Kapitalisasi**: pertegas usulan aset bila pengeluaran > Rp 500.000 (H-d, selaras kode asset-readiness).
### Fase 4 (tambahan)
- **F4-8** Flow pindah kamar resmi antar kamar (E4): kamar lama lepas+inspeksi, deposit/sisa ikut pindah. Desain Fable dulu.
- **F4-9** 🟢 Program loyalitas/gamifikasi tenant (K-b/M1-M4) — ✅ DESAIN SELESAI di `07_DESAIN_GAMIFIKASI.md`: schema TenantPoint/RewardCatalog/Redemption + earn (renewal/bayar-tepat/streak/quest) + reward (WiFi/cleaning/diskon) DICATAT akuntansi + approve admin/owner + UI "Misi & Poin Saya". Fase 4, setelah inti sehat.
- **Backup** (W-06): jadwal 6-bulanan (K-c) — ⚠️ advisory: harian disarankan (lihat 04_KEPUTUSAN_OWNER K-c).
### Ditunda (1 staf)
- **F2-10** round-robin & **F3-5** leaderboard antar-staf — aktifkan saat staf ≥ 2.

## FASE 4 — FUTURE (bulan 3+) — 7 task

### F4-1 · F-15 PSAK 72 unearned revenue
- **Spesifikasi:** sewa SMESTERLY/YEARLY: issue → K 2200 Unearned; amortisasi bulanan 2200→4000 (job auto-ops #10 atau saat close). DESAIN Fable + owner dulu (berdampak P&L historis).
- **Stop:** tanpa dokumen desain → STOP.

### F4-2 · PWA Phase 3 Web Push
- **Spesifikasi:** outbox + VAPID per `08_PWA_AUDIT`; PRASYARAT: Phase 2 selesai + N-04 pruning (F4-7) agar outbox tidak membengkak.
- **Stop:** Phase 2 belum selesai → STOP.

### F4-3 · Unit test jalur uang (E-8/W-07)
- **Spesifikasi:** mulai fungsi murni yang baru saja diperbaiki (split nominal A18, validasi dua-nominal-sah, closing preview, cashflow classifier F1-3) — regression guard atas fix fase 1.
- **Stop:** jest gagal load → STOP.

### F4-4 · Analitik lanjutan (BEP, unit economics/tier, sensitivity, stress, DuPont/Z)
- **Spesifikasi:** rumus siap di `AUDIT_04_FINANCE.md §J`; endpoint analytics baca LEDGER (bukan ops); PRASYARAT: 1 bulan data produksi + F1-3..F1-7.
- **Stop:** data < 1 bulan → STOP.

### F4-5 · Badge gamification + rekap reward owner tgl 1
- **Spesifikasi:** badge derivatif on-render (09 §gamification, tanpa schema); rekap top-3 netKpi otomatis ke owner tiap tgl 1 (job ringan).
- **Stop:** keputusan reward owner belum ada → badge boleh jalan, reward menunggu.

### F4-6 · Nilai persediaan ke ledger (COA 1200) + I-04 soft-zero RoomItem
- **Spesifikasi:** hanya bila owner butuh neraca penuh / riwayat kondisi barang per kamar.
- **Stop:** owner tidak butuh → skip permanen.

### F4-7 · N-04 pruning notifikasi + arsip
- **Spesifikasi:** job auto-ops #11: hapus AppNotification read > 90 hari (unread dipertahankan 180 hari); pertimbangkan arsip AuditLog > 1 tahun ke tabel arsip — TIDAK menghapus audit trail, hanya memindah.
- **Stop:** —.

## RISK MATRIX (task berisiko ≥ Medium)
| Task | Risk | Likelihood | Impact | Mitigasi |
|---|---|---|---|---|
| F1-1R | menolak pembayaran sah edge (pembulatan/recalc DP) | Medium | High | uji 4 skenario: DP-saja, pelunasan, DP+pelunasan terpisah, manual-invoice; pakai nilai segar dlm tx |
| F1-3 | salah klasifikasi arus → cashflow tetap salah | Medium | High | cross-check manual 1 bulan vs Σ jurnal per sourceType; tulis tabel uji di PR |
| F1-7 | guard checkout/tunggakan ikut berubah | Medium | Medium | HANYA aggregate revenue; jangan sentuh openInvoice/blocking |
| F1-8 | settlement lama jadi skip → selisih reconciliation BERTAMBAH terlihat | Low | Medium | itu memang tujuan (visibilitas); siapkan penjelasan owner |
| F2-1 | race renewal vs booking publik kamar sama | Medium | High | lock pola first-paid-wins yang sudah teruji; desain dulu |
| F2-5 | refactor util menyentuh 4 file panas | Medium | High | per-fungsi + uji movement resmi tak berubah perilaku; jangan ubah signature publik |
| F2-8 | endpoint post-draft membuka pintu jurnal manual salah | Low | High | OWNER-only + validasi balance + periode OPEN + audit log |
| F2-14 | KPI/jurnal bergeser sehari saat ganti TZ | High | Low | jalankan awal bulan; umumkan; jangan migrasi data lama |
| F3-9 | label formal/estimasi membingungkan bila copy buruk | Low | Medium | review copy oleh owner |
| F3-13 (B-07) | auto-cancel DRAFT menghapus draft yang sedang disiapkan admin | Low | Low | D-03 owner menyetujui auto-cancel DRAFT; mitigasi: DRAFT belum diterbitkan = belum jadi tagihan, admin bisa terbitkan ulang bila masih perlu |

## DEPENDENCY GRAPH
```
F1-0 (alamat) ───────────────► F3-3 SEO ──► F3-4 social proof
F1-1R/F1-2 (uang masuk) ─┐
F1-3..F1-8 (laporan+jurnal)├─► F1-9 DEPLOY ──► F2-* ──► F3-* ──► F4-*
                          ┘
F1-3..F1-6 ► F3-12 chart finansial / F4-4 analitik   [jangan visualkan angka salah]
F1-8 ──► (F2-4 DIBATALKAN D-06 — data testing dihapus saat deploy bersih)
F2-1 (desain renewal) ──► implementasi GAP #2 ──► notif renew dipakai penuh (F2-2 tetap duluan utk flow lama)
F2-9 + F2-10 ──► F3-5 leaderboard (keadilan dulu)
F2-5 (util bersama) ──► F2-6 (pakai util tiket) — kerjakan berurutan
F2-14 (WIB) ──► tanggal jurnal & KPI konsisten utk F3-9/F4-4
N-04/F4-7 ──► F4-2 push outbox
```

## ESTIMASI BIAYA
| Fase | Task | Sesi AI | Catatan |
|---|---|---|---|
| 1 | 10 | 7–9 | F1-3 terbesar (1 sesi penuh); F1-4..F1-6 bisa 1 sesi gabungan; F1-0/F1-9 = manusia |
| 2 | 14 | 11–13 | F2-1 desain (Fable) + implementasi 2–3 sesi; F2-5 refactor hati-hati 2 sesi |
| 3 | 13 | 8–10 | banyak task kecil bisa digabung per file |
| 4 | 7 | 4–6 + desain | F4-1/F4-4 perlu desain Fable |
| **Total** | **44** | **30–38** | prioritas mutlak: F1-0 → F1-1R → F1-3 → F1-7 → deploy |

## MAPPING TEMUAN → TASK (jaminan tidak ada temuan P1/P2 yang yatim)
| Temuan | Sev | Task penampung |
|---|---|---|
| UD-01 lokasi | 🔴 | F1-0 |
| B-01 approve tanpa re-validasi | 🔴 | F1-1R |
| GAP #3 / B-04 | 🟠 | F1-2 |
| F-01, F-05, F-19, F-20 cashflow | 🔴 | F1-3 |
| F-02, F-18 rasio | 🔴 | F1-4 |
| F-03 deposit liability | 🟠 | F1-5 |
| F-04 occupancy rasio | 🟠 | F1-6 |
| F-09 DRAFT revenue | 🟠 | F1-7 |
| F-24 settlement tanpa receipt | 🔴 | F1-8 |
| GAP #2 renewal | 🔴 | F2-1 |
| Notif renew NOL | 🔴 | F2-2 |
| N-01 copy A17 | 🔴 | F2-3 |
| F-06/F-07 deposit backfill | 🟠 | F2-4 |
| I-02 ghost-stock + X-01/I-03/I-07 util | 🔴 | F2-5 |
| B-08 cancel tanpa tiket inspeksi | 🟠 | F2-6 |
| F-17 BS MoM 0% | 🟠 | F2-7 |
| F-22/F-23 draft jurnal | 🟠 | F2-8 |
| K-6 KPI double-count | 🟠 | F2-9 |
| K-4 beban timpang | 🟡 | F2-10 |
| V-1 + W-02/W-03 publik | 🟠 | F2-11 |
| F-21 sinyal + F-27 aging | 🟠 | F2-12 |
| F-25 + E-6 TZ | 🟠 | F2-14 |
| 6 lubang notif + K-8 | 🟡 | F3-1/F3-2 |
| M-01/M-05 SEO | 🟠 | F3-3 |
| M-06 social proof | 🟠 | F3-4 |
| K-1/K-2 leaderboard | 🟡 | F3-5 |
| F-11/F-12/F-31 hierarki | 🟡 | F3-9 |
| F-13/F-08/F-28 higiene jurnal | 🟡 | F3-10 |
| M-08/M-04 | 🟡 | F3-11 |
| V-2/UD-04/V-5/V-7 chart | 🟡 | F3-12 |
| B-06/B-07/B-11/B-12/B-14/N-02 | 🟡 | F3-13 |
| F-15 PSAK 72 | 🟠 | F4-1 |
| F-16/I-04/N-04 | INFO | F4-6/F4-7 |
| B-09 (asimetri posting), B-10 (expiry beda), I-01 (fuzzy tiket), I-05 (catatan admin), I-06, M-02/M-09, F-26, F-32/F-33/F-34, B-15, N-03, UD-05/06/07, X-02 | 🟡/INFO | dikerjakan menumpang task terdekat per file (catat di CHECKLIST saat menyentuh file ybs) — keputusan sadar agar 44 task tidak membengkak jadi 60 |

## URUTAN SESI YANG DISARANKAN (sprint plan utk owner)
1. **Sesi 0 (manusia, 30 menit):** jawab 6 OPEN QUESTIONS + F1-0 alamat.
2. **Sesi 1:** F1-1R + F1-2 (jalur uang masuk; file payment-submissions & invoice-payments).
3. **Sesi 2:** F1-3 (cashflow — terbesar; satu file accounting-reports).
4. **Sesi 3:** F1-4 + F1-5 + F1-6 (rasio; file sama dgn sesi 2 — boleh digabung bila sesi 2 lancar).
5. **Sesi 4:** F1-7 (DRAFT revenue, 2 file) + F1-8 (settlement guard, posting service).
6. **Sesi 5 (manusia+AI):** F1-9 deploy + verifikasi runtime fase 1 di UAT dulu.
7. **Minggu 2-4:** F2-3 (copy, 15 menit) → F2-2 (notif renew) → F2-5 (inventaris) → F2-6..F2-9 → F2-1 desain renewal paralel oleh Fable → implementasi GAP #2 → sisa F2.
8. **Bulan 2:** F3 sesuai ketersediaan; F3-3 SEO segera setelah F1-0.
9. Tiap akhir minggu: jalankan `reconciliationLite` + `deposit-reconciliation` + trial balance — 3 alat audit bawaan sebagai regression harness gratis.

## OPEN QUESTIONS — SEMUA TERJAWAB 2026-06-13 (lihat `04_KEPUTUSAN_OWNER.md` D-01..D-16)
| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | (F1-0) Alamat benar? | **Jl. Hikmah V, Surabaya Barat (Pakuwon/PTC)** — docs dikoreksi (D-01) |
| 2 | (F1-1R) Partial juga renewal/utilitas? | **Ya — no partial menyeluruh** (D-02) |
| 3 | (B-07) Forced checkout auto-cancel DRAFT? | **Ya — checkout jalan + cancel DRAFT** (D-03) |
| 4 | (F2-5) Status barang ASSIGN? | **Ditentukan admin** (D-08) |
| 5 | (F3-4) Social proof + consent? | **Ya — anonim/inisial** (D-09) |
| 6 | (F4-5) Reward bulanan staf? | **Ya — bonus manual owner; leaderboard terbuka** (D-13) |
| 7 | (D-05) Draft jurnal dipakai? | **Tidak — matikan endpoint** (D-05) |
| 8 | (D-06) Backfill deposit? | **Data testing, hapus semua — fresh deploy** (D-06) |
| 9 | (D-07) Refund kalah-cepat dicatat? | **Ya — field bukti di sistem (F2-3b)** (D-07) |
| 10 | (N-03) Pengumuman utk booking? | **Tidak — cukup tenant huni** (D-10) |
| 11 | (U-08) Portal bookings vs stay? | **Pertahankan terpisah** (D-11) |
| 12 | (K-7) Klaim tiket bebas? | **Boleh + round-robin adil** (D-12) |
| 13 | Deepseek? | **Cukup rule-based** (D-14) |
| 14 | (F3-7) Heatmap historis/depan? | **Keduanya** (D-15) |
| 15 | (I-04) Riwayat barang ditarik? | **Hapus saja** (D-16) |
| 16 | (D-04) Sewa SMESTERLY/YEARLY ada? | **Belum/jarang — F-15 ke Fase 4** (D-04) |

## CATATAN PENUTUP UNTUK SESI EKSEKUSI
- Tiga alat audit bawaan = regression harness gratis: `GET deposit-ledger/reconciliation-lite`, `GET accounting/deposit-reconciliation`, `GET accounting/trial-balance` — jalankan sebelum & sesudah SETIAP task fase 1/2 yang menyentuh uang; hasil harus sama-atau-lebih-baik.
- Bila menemukan kode yang berbeda dari deskripsi task: JANGAN paksakan — kemungkinan AI lain sudah memperbaiki (preseden nyata: W-01 & W-B04 sudah dikerjakan diam-diam di working tree). Verifikasi temuannya masih ada dulu, baru eksekusi.
- Dokumen ini menggantikan `docs/fable5-audit/10_MASTER_ACTION_PLAN.md`; bila ada konflik antar keduanya, V3 menang (khusus F1-1: WAJIB versi F1-1R).
- Prioritas mutlak jika waktu/anggaran terbatas (kerjakan HANYA ini): F1-0 (alamat) · F1-1R · F1-2 · F1-3 · F1-7 · F1-8 · F2-3 (copy A17) · F2-5 (ghost-stock). Delapan task ini menutup semua P1 yang berdampak uang/kepercayaan/data-integritas.
- Setelah delapan task itu: GAP #2 (F2-1/F2-2) adalah pekerjaan bernilai tertinggi berikutnya karena menyentuh retensi (CLV) langsung.
