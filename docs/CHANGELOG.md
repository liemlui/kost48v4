# KOST48 V5 — Changelog
**Versi:** 2026-06-13 — Audit V3 + 84 keputusan owner + restruktur docs domain-dossier. Entri < V5.11.0 di `archieve/CHANGELOG_PRE_V5110.md`.

<!-- KOST48_DOCS_SYNC_20260613_AUDIT_V3_DOSSIER -->
## 2026-06-13 — F1-10: Kunci Deposit = Room.defaultDepositRupiah (C3/D-05)

- **`stays.service.ts` create**: `deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah` → `room.defaultDepositRupiah ?? 0` (abaikan override dto).
- **`tenant-bookings.service.ts` approveBooking**: hapus override `depositAmountRupiah: dto.depositAmountRupiah` dari update stay — deposit tetap di snapshot room-default yang diset saat `createBooking` (:159). Admin tak bisa mengubah deposit jaminan.
- Sesuai owner D-05/C3: deposit jaminan SELALU = `Room.defaultDepositRupiah` (refundable, tetap).
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 13/13 hijau.

Status: perubahan kode booking/stay (kunci nilai deposit); tanpa schema/DB.

## 2026-06-13 — F1-9: Deposit Bukan Operating Cashflow (F-10)

- **`cashflow-classifier.ts`**: sourceType `DEPOSIT` (dana titipan) tidak lagi masuk operating (fallback) → kategori baru `depositLiabilityIn/Out` (perubahan liabilitas titipan). `netRupiah` tetap memuat deposit (mempengaruhi kas).
- **`accounting-reports.service.ts` `cashflow()`**: tambah section `depositLiability` (totalIn/Out/net + catatan "bukan kas operasional yang bisa dipakai"); `netCashflow` kini = operating + investing + financing + deposit.
- Koreksi test: sourceType nyata = `DEPOSIT` (bukan `DEPOSIT_RECEIVED`); test menegaskan deposit → `depositLiabilityIn`, `operatingInTotal` tidak terpengaruh.
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 13/13 hijau. ⏳ runtime skenario emas `05 §5` (sewa 1,7jt operating-in; deposit 500rb perubahan liabilitas) = gate pra-deploy F1-12.

Status: perubahan kode finance (klasifikasi cashflow) + test; tanpa schema/DB.

## 2026-06-13 — F1-8: Guard Settlement Deposit (F-24)

- **`accounting-posting.service.ts` `postDepositSettlementTx`**: TAMBAH pra-cek — sebelum men-debit liability 2000, pastikan ada jurnal PENERIMAAN deposit POSTED untuk stay (sourceType `DEPOSIT`, sourceId `String(stayId)`). Bila tak ada → `skip()` benign.
- Menutup F-24: tanpa cek, settlement bisa men-debit 2000 tanpa kredit sebelumnya → akun liability 2000 bersaldo DEBIT (uang titipan "hilang" dari buku). Receipt yang sempat skip best-effort bisa di-backfill, lalu settlement jalan.
- **Jurnal settlement TIDAK diubah** (patuh DO-NOT-TOUCH `05 §2` — hanya menambah CEK). Idempotensi & balance tetap.
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 13/13 hijau. ⏳ runtime (`deposit-reconciliation` MATCHED, 2000 tak debit) = gate pra-deploy F1-12.

Status: perubahan kode finance (guard posting); tanpa schema/DB/perubahan jurnal.

## 2026-06-13 — F1-7: Invoice DRAFT Bukan Revenue (F-09)

- **`reports.service.ts` (4 agregat revenue/billed)** + **`finance.service.ts` (5 agregat revenue ber-periodStart)**: filter `status: { not: CANCELLED }` → `status: { notIn: [DRAFT, CANCELLED] }` → DRAFT (belum diterbitkan) tidak lagi dihitung sebagai pendapatan/tagihan.
- **Sengaja TIDAK diubah** (LARANGAN): groupBy `countByStatus` di reports (masih perlu DRAFT untuk `unpaidCount`), dan openInvoice/AR (`notIn [PAID, CANCELLED]` — termasuk DRAFT sesuai guard checkout).
- Verifikasi: grep memastikan 4+5 spot benar berubah, groupBy & openInvoice tetap. `tsc --noEmit` 0, `npm run test:unit` 13/13 hijau. ⏳ runtime (P&L revenue tanpa DRAFT) = gate pra-deploy F1-12.

Status: perubahan filter query laporan; tanpa schema/DB.

## 2026-06-13 — F1-6: Occupancy Rasio (F-04) dihitung inline

- **`financialRatios()`**: `occupancyRate` tak lagi membaca `bs.statement?.occupancyRate` (yang tidak ada → selalu 0). Dihitung INLINE: `operableRooms = kamar isActive − (MAINTENANCE+INACTIVE)`, `occupiedPromoted = stay ACTIVE & initialMetersPromotedAt != null`, lalu `occupancyRatePercent(occupied, operable)`. Konsisten dengan `finance.service` occupancySummary.
- Helper `occupancyRatePercent` (di `financial-ratios.helper.ts`) + test (5/10→50; operable 0→0; 48/48→100). Total `test:unit` **13/13 hijau**.
- Gate: `tsc --noEmit` 0. ⏳ runtime (occupancy>0 saat ada penghuni) = gate pra-deploy F1-12.

Status: perubahan kode finance (rasio occupancy) + helper + test; tanpa schema/DB.

## 2026-06-13 — F1-5: Deposit sebagai Kewajiban Lancar (F-03) — verifikasi & tutup (docs-only)

- Inti F1-5 (deposit masuk kewajiban lancar → currentRatio turun wajar saat deposit HELD) sudah terpenuhi di **F1-4**: `currentLiabilities` memakai `CURRENT_LIABILITY_PREFIXES ['20','21','22','23']`, mencakup `Tenant Deposit Liability` (2000).
- `balanceSheet()` ditelaah baris-demi-baris: identitas **A = L + E** benar — keenam tipe akun (ASSET/LIABILITY/EQUITY/REVENUE/COGS/EXPENSE) ter-map, contra-asset (1590) ter-net via `netFixedAssets`, `currentProfit = revenue − cogs − expenses`. F-17 (imbalance karena mapping tak lengkap) **tidak bermanifestasi** di kode saat ini; konsisten dengan UAT GROUND_STATE "balance sheet A=L+E".
- Tidak ada perubahan kode (tercakup commit F1-4); hanya penutupan checklist + catatan.

Status: docs-only.

## 2026-06-13 — F1-4: Rasio Keuangan Benar (F-02 presedensi + F-18 kas/AR)

- **`financial-ratios.helper.ts` (baru, pure)** + `backend/test/unit/financial-ratios.helper.test.js` (12/12 hijau total).
- **`accounting-reports.service.ts` `financialRatios()`**:
  - F-02: `expenseRatio` presedensi `expense ?? 0 / revenue` (→ `expense × 100`, "1e8") diperbaiki ke `(expense/revenue)×100`. **Beban 1jt / rev 4jt = 25%.**
  - F-18: `cashAndBank` `startsWith('11')` (AR/piutang) → prefix `'10'` (kas 1000/1010/1020).
  - Inventory `startsWith('14')` (tak ada akun 14xx → selalu 0) → `'12'` (COA 1200).
  - `currentLiabilities` `startsWith('21')` (melewatkan deposit 2000) → `['20','21','22','23']` → current/quick/cash ratio benar.
- COA diverifikasi dari `constants/default-coa.ts` sebelum ubah prefix. Spec before→after → `13_AKUNTANSI §7`.
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 12/12 hijau. ⏳ runtime = gate pra-deploy F1-12.

Status: perubahan kode finance (rasio) + helper + test; tanpa schema/DB.

## 2026-06-13 — F1-3: Perbaikan Cashflow (F-01/05/19/20) + classifier teruji

- **Tulis `13_AKUNTANSI_LAPORAN §6`** — spec before→after 4 sub-langkah (sebelumnya checklist menunjuk §6 yang belum ada).
- **`cashflow-classifier.ts` (baru, pure)** + `backend/test/unit/cashflow-classifier.test.js` (10/10 hijau total): klasifikasi arus kas terverifikasi zero-dependency.
- **`accounting-reports.service.ts` `cashflow()`**:
  - F1-3a (F-01): deteksi kas `code.startsWith('11')` (AR/PIUTANG dihitung kas!) → `cashAccountId != null` ATAU prefix `'10'`.
  - F1-3b: opening balance filter `'11'` → `'10'` (saldo awal kas, bukan AR).
  - F1-3c (F-19/20): hapus double-count (semua line → operating LALU investing/financing ditambah lagi) + dead `cashCOACodes`; tiap sourceType diklasifikasi SEKALI berbasis net.
  - F1-3d: `cashBeginning = opening + Σ mutasi kas POSTED sebelum periode`; `cashEnding = beginning + netCashflow` → invarian **beginning+net=ending** (sebelumnya pakai saldo all-time).
  - DO-NOT-TOUCH blok E-4 (`:838-847`) ditiru untuk prior-delta, tidak diubah.
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 10/10 hijau. ⏳ runtime skenario emas `05 §5` = gate pra-deploy F1-12.

Status: perubahan kode finance (laporan cashflow) + helper baru + test; tanpa schema/DB.

## 2026-06-13 — F1-2: Guard Hapus/Ubah Pembayaran Kamar OCCUPIED (D-17 / GAP #3 / B-04)

- **`invoice-payments.service.ts`** — tambah helper `assertStayNotOccupiedForPaymentMutationTx`, dipanggil di `update` + `remove` (dalam tx, sesudah `FOR UPDATE`): tolak 409 bila stay `initialMetersPromotedAt != null` ATAU `room.status == OCCUPIED`.
- Menutup lubang: pembayaran TANPA jurnal (best-effort skip) sebelumnya masih bisa dihapus saat kamar sudah ditempati → occupancy vs uang inkonsisten. Booking RESERVED tetap bisa dikoreksi.
- Gate: `tsc --noEmit` 0. (Guard occupancy, bukan perubahan perhitungan.)

Status: perubahan kode finance (guard); tanpa schema/DB.

## 2026-06-13 — F1-1R: No-Partial Menyeluruh (D-02 / GAP #1 / B-01)

- **`payment-submissions.service.ts` `approveSubmission`** — tambah gate re-validasi dua nominal sah (sebelumnya hanya blokir overpay → bisa approve PARTIAL liar): booking hanya terima **DP-persis** atau **pelunasan-persis** (sisa sewa + deposit jaminan); selain itu 409.
- **`approveSubmission` invoice-only** (renewal/utilitas/manual) — wajib `amount === invoiceRemaining` (lunas penuh), bukan sekadar `≤`.
- **`createSubmission` invoice-only** — dari `> invoiceRemaining` (izinkan partial) menjadi `!== invoiceRemaining` (lunas penuh) → 409.
- **`invoice-payments.service.ts` create + update (manual admin)** — tambah guard wajib melunasi tagihan penuh (`!== invoiceTotal`) → tidak ada cicilan; booking tetap diblokir dari jalur manual (A1).
- Gate: `tsc --noEmit` 0 · `npm run test:unit` 6/6 hijau · logika dicocokkan manual vs skenario emas `05 §5` (DP 510rb → pelunasan 1.690rb). LARANGAN V1 lama (tolak `< invoice+deposit`) TIDAK dipakai — DP sah tetap lolos.
- ⏳ Runtime rekonsiliasi/golden-scenario (`05 §4-5`) = gate pra-deploy (F1-12), belum dijalankan (sistem belum publish, DB UAT tak di-seed di sesi ini).

Status: perubahan kode finance (payment approval); tanpa perubahan schema/DB.

## 2026-06-13 — F1-T: Sabuk Pengaman Unit Test Finance (baseline terkunci)

- **F1-T SELESAI** — pasang harness unit test zero-dependency (Node built-in `node --test`, tanpa npm install):
  - `backend/test/unit/pricing.test.js` — `calculateRentByPricingTerm` (multiplier 13/45/75/100/550/1000% + pembulatan naik 5.000), `roundUpToNearest`, `isUtilitiesIncludedForPricingTerm`.
  - `backend/test/unit/periode.test.js` — `calculatePeriodEnd` (end eksklusif) + clamp akhir bulan (31 Jan +1bln → 28 Feb).
  - Nilai assertion DIVERIFIKASI vs implementasi (`pricing.helper.ts`, `stays.helpers.ts`) sebelum ditulis.
- Tambah script `package.json` → `test:unit`: `node --test "test/**/*.test.js"`. **Hasil: 6/6 PASS** via `npm run build && npm run test:unit`.
- **Koreksi command:** `node --test test/` GAGAL di Node 22/Windows (dianggap modul) → semua docs (`05`, `07`, `08`) + script diganti ke pola glob `node --test "test/**/*.test.js"`.
- Baseline finance terkunci sebelum F1-1R dst menyentuh kode uang.

Status: tambah test + script + perbaikan docs; tidak mengubah kode aplikasi/DB.

## 2026-06-13 — Audit Traceability Root Docs + Router `_PETA_AI` + Penomoran 06-09 (docs-only)

- **Buat `_PETA_AI.md`** — router 22 file root: §1 tabel "baca saat" + status akurasi, §2 anchor `file:baris` TERVERIFIKASI vs kode (`3c7ffe2`), §3 status defek, **§4 panduan EKSEKUSI OTONOM (YOLO)**: set file minimum + apa yang boleh jalan tanpa persetujuan vs hard-gate (schema/owner/push/install).
- **Audit mendalam 22 file root → perbaiki 4 defek traceability:**
  - D1: `02_FLOW_MAP.md` — sinkronkan SEMUA anchor metode ke kode (approveSubmission 323→353, stays.complete 480→526, processDeposit 749→812, renewStayInTransaction 934→997, tickets.close 489→530, postBalancedJournalTx 1032→1110, dll) + banner "sub-baris indikatif, sumber baris terverifikasi = `_PETA_AI §2`/dossier".
  - D2: nama file inti dossier 13 dikoreksi ke `accounting-reports.service.ts` (jamak).
  - D3: `01_GROUND_STATE` — ref dossier `06-15`→`10-19`; §1.2 ditulis ulang ke **33 modul nyata** (buang `inventory`/`deposits`/`public`/`dashboard`/`me`/`maintenance` fiktif); §1.4 = **41 model** nyata.
  - D4: ID task dossier 15 diselaraskan ke checklist (KPI `F2-9`, SLA `F3-19`, prompt review `F3-20`).
- **Penomoran root dirapikan** (sekuens 00-09 lintas-domain lengkap): `CONTRACTS`→`06_CONTRACTS`, `PLAN`→`07_PLAN`, `CHECKLIST`→`08_CHECKLIST`, `TRACEABILITY`→`09_TRACEABILITY` (via `git mv`); semua referensi di docs aktif + `CLAUDE.md` diperbarui (broken-ref aktif = 0).
- `CLAUDE.md` menunjuk `_PETA_AI.md` sebagai router + anchor terverifikasi (tetap <3KB).
- Fakta terverifikasi: 33 modul, 41 model, bug F-01 di `accounting-reports.service.ts:794` (`code.startsWith('11')` PIUTANG dianggap kas).

Status: docs-only; tidak ada perubahan kode aplikasi atau database.

## 2026-06-13 — Normalisasi Logic dan Referensi Root Docs

- Rename fisik dossier `06`-`15` menjadi `10`-`19` agar sesuai heading, blueprint, checklist, dan tab kerja.
- Tetapkan hierarki sumber kebenaran: keputusan owner untuk aturan bisnis, kode untuk perilaku aktual, checklist untuk ID/urutan task.
- Hilangkan benturan task: `F1-9` = deposit cashflow, `F1-12` = deploy bersih; task staf mengikuti `F2-9`, `F3-19`, `F3-20`.
- Sinkronkan fakta kode: 41 model Prisma, ticket status `DONE`, urutan Auto-Ops aktual, expiry booking 3 jam sudah selesai.
- Perbaiki runbook fresh deploy tanpa backfill UAT, OWNER-only D-17, renewal H-10/prioritas hari-H, no-partial seluruh jalur, serta referensi arsip.
- Rewrite `PLAN.md` agar prioritas produksi dimulai dari Fase 1 uang/laporan; multi-app menjadi rencana lanjutan.
- Verifikasi: 20 file kanonik hadir, 53 task ID unik, active missing reference = 0, `git diff --check` bersih.

Status: docs-only; tidak ada perubahan kode aplikasi atau database.

## 2026-06-13 — Audit Forensik V3 + 84 Keputusan Owner + Restruktur Docs Domain-Dossier (READ-ONLY, belum sentuh kode aplikasi)

### Audit forensik V3 (Fable 5, baca kode penuh per-baris)
- **97 temuan** di atas 53 temuan V1: finance F-17..F-34 (cashflow salah-akun F-01 + kembarannya F-18 yang LOLOS fix V1, rasio, BS-MoM 0%, settlement deposit bisa liability negatif F-24, draft jurnal dead-end F-22/23), flow B-01..B-15, inventaris I-01..I-07 (ghost-stock admin-review I-02), KPI K-6..K-8, notif N-01..N-04 (copy A17 menyangkal dana N-01), marketing/UIUX M/UD, fondasi X.
- **Koreksi atas V1:** COA 17→**38 akun**; GAP #1 ternyata SEBAGIAN tertutup gate A18 (rencana fix V1 berbahaya → diganti F1-1R); W-01 code-split sudah terpasang; M-25 round-robin BELUM fix (V1 keliru tandai FIX); M-19 jaminan check-in SUDAH fix (E-3).
- **Temuan data-truth:** alamat — frontend "Jl. Hikmah V, Surabaya Barat (Pakuwon/PTC)" vs docs "Ngagel" → owner konfirmasi **Surabaya Barat benar**, docs dikoreksi (D-01).

### 84 keputusan owner (wawancara 2026-06-13) → `03_KEPUTUSAN_OWNER.md` (8 bagian)
- **TERBESAR: sistem BELUM publish** (DB = data testing) → deploy = FRESH bersih, bukan migrasi; semua tugas "perbaiki data lama" (F-24 historis, E-2 backfill) GUGUR.
- No-partial menyeluruh · deposit selalu tetap · booking expiry 3 jam flat · OWNER-only 4 area · **1 staf** (round-robin/leaderboard ditunda) · **tenant = pengawas staf** (staf tutup tiket sendiri, tenant menilai, owner menindak) · bayar tunai+transfer · reminder H-10 · KTP gate aktivasi · tenant-kabur · barang abandoned 30 hari · expense rutin auto-draft · SLA tiket 24j/3h/7h · depresiasi otomatis · kapitalisasi >500rb · push 4 event · keluar-awal sewa hangus · **gamifikasi/loyalitas tenant** (poin→reward, dicatat akurat).
- Renewal (GAP #2) berspesifikasi penuh: tenant lama prioritas s/d hari-H tanpa wajib DP; di hari-H belum DP → kamar dibuka first-paid; DP 30% → grace H+7.

### Restruktur docs → DOMAIN-DOSSIER (lebih mudah dipahami AI eksekutor, hemat token)
- **Struktur final:** 5 inti (`00_BLUEPRINT` pintu masuk + indeks/peta-eksekusi/auto-ops/matrix-teori · `01_GROUND_STATE` · `02_FLOW_MAP` · `03_KEPUTUSAN_OWNER` sumber-kebenaran · `04_DEPLOY_AND_PWA`) + **10 dossier domain MANDIRI** (`10_PEMBAYARAN_INVOICE` … `19_GAMIFIKASI_LOYALITAS`; tiap dossier = aturan+peta kode+temuan+task+desain+UAT domain itu) + CHANGELOG/CHECKLIST.
- Dibubarkan ke dossier lalu diarsipkan ke `archieve/_DEPRECATED_*`: 11 file audit forensik, ACTION_PLAN, 3 desain, CONTRACTS, + 5 docs lama (WORK_PLAN, AUDIT_REPORT, DECISIONS_LOG, JOURNAL, BMI_PLAN).
- `CHECKLIST.md` ditulis ulang sebagai **daftar eksekusi berurutan untuk AI lemah** (protokol kerja + larangan + tiap task: dossier rujukan·file·aksi·kriteria selesai·STOP). `CLAUDE.md` + `01_GROUND_STATE` diperbarui ke struktur baru.
- Perbaikan teknis: encoding UTF-8 dinormalisasi (perbaiki mojibake+BOM yang sempat muncul dari tooling PowerShell, termasuk CHANGELOG lama yang sudah corrupt).

### Status
Kode aplikasi BELUM disentuh (audit read-only). Rencana eksekusi siap di CHECKLIST + dossier. Prioritas: Fase 1 (uang & laporan benar) → deploy bersih → Fase 2+. Tidak ada commit/push.



<!-- KOST48_DOCS_SYNC_20260612_DOCS_SIMPLIFICATION_V2 -->
## 2026-06-12 — Simplifikasi & Update Docs — FLOW_MAP V2 + 6 Flow Baru + Arsip

### Update besar `docs/02_FLOW_MAP.md` (V2)
- **Koreksi 5 bagian basi:**
  - §0.1: "TANPA rate-limit" → rate-limit SUDAH ADA (V5.12.2)
  - §3.2: PARTIAL payment ditandai sebagai GAP #1, cross-ref ke §15
  - §3.3: Tambah catatan refund DP manual (GAP #4)
  - §7: Job #4 → `runDownPaymentForfeit`, Job #5 → `runContractEndReminders`, Job #6 → `runOverstayEnforcement`, Job #7 → `runOverstayForcedCheckout` (update nama aktual)
  - §1 fokus audit: coret "brute-force tanpa rate-limit" — sudah ditangani
- **Tulis ulang §5 Renew** — deskripsi flow bisnis asli dari owner: H-7 tanya perpanjang → YA/DP 30% → verify → aman. TIDAK → kamar bisa dipesan per tanggal checkout. Jika belum transfer → kamar muncul di katalog publik. Grace H+7.
- **6 flow baru ditambahkan:**
  - §9 Flow Inventaris & Barang Kamar (detail: master, movement, room items, sinkronisasi)
  - §10 Flow Keuangan Operasional (Expense, WiFi, Aset)
  - §12 Flow Dashboard Finance & Laporan (Balance Sheet, P&L, Cashflow, Rasio)
  - §13 Flow Analisis Strategis (SWOT, PESTLE, BCG, Porter, 7P + AI Deepseek sebagai konektor)
  - §14 Flow Notifikasi, Pengumuman & PWA
  - §16 Frontend Surface Map (ringkas)
- **Update §15 Gap Bisnis** — GAP #4 diubah: refund MANUAL via admin (bukan auto-refund), sesuai keputusan owner.
- **Renumber** sections: 17 total (V1 hanya 15).

### Update `docs/02_FOCUS_PLAN.md`
- §2: "SEMUA TERTANGANI" → "99% TERTANGANI, 3 minor ditunda (E-6/E-7/E-8)"
- Tambah catatan GAP #1 & #2 sebagai item terbuka

### Arsip
- `docs/04_FIX_INSTRUCTIONS.md` → `docs/archieve/04_FIX_INSTRUCTIONS.md` (24/24 FIX sudah applied & verified)

### Status
Semua file docs kini sinkron. Gap bisnis #1-4 masih perlu perbaikan kode.

<!-- KOST48_DOCS_SYNC_20260612_PRODUCTION_READY -->
## 2026-06-12 (larut) — Eskalasi Tuntas + 5 Skenario Residual PASS + Runbook Deploy → SIAP PRODUKSI

### Eskalasi diimplementasikan & diverifikasi runtime
- **E-1 Guard global (default-deny):** `APP_GUARD` JwtAuthGuard+RolesGuard + decorator `@Public()` (login/forgot/reset, public/bookings, public/rooms, faqs/public). Controller baru yang lupa guard kini otomatis 401, bukan bocor publik. Smoke: publik 200 tanpa token, terproteksi 401, login normal. (Bukti hidup: saat rebuild, katalog publik sempat 401 sebelum ditandai @Public.)
- **E-3 Jaminan check-in manual:** dto `depositCollected` + checkbox wizard → depositPaid=PAID + ledger `PAYMENT_RECEIVED` + jurnal liability POSTED (verifikasi stay #21: paid 1jt, `JE-AUTO-DEPOSIT-21`). Artefak dibersihkan via FULL_REFUND — rekonsiliasi tetap 0.
- **E-4 Saldo kas laporan dari JURNAL:** cashflow report kini menghitung saldo per cash account = opening + Σ(debit−kredit line POSTED); field manual hanya referensi (`manualBalanceRupiah`).
- **E-5 Finance deposit liability = HELD** (termasuk stay selesai belum settle) di businessHealth & balance-sheet draft — selaras fix M-36 reports.
- **E-9:** hard-cap fail-open map limiter (M-03) + hapus kode mati `rooms.findPublicOne` (M-31).

### 5 skenario residual — PASS runtime semua (`scripts/uat/UAT_RUNTIME_RESIDUAL.ps1`, `UAT_S5_DIRTY_ROOM.ps1`)
S1 guard A1: pembayaran manual pada invoice booking → 409 ✓ · S2 first-paid-wins: pesaing CANCELLED + notif A17 ✓ · S3 expiry live: sweeper cancel + kamar lepas ✓ (catatan: kolom expiresAt = UTC; skrip uji harus pakai kerangka UTC) · S4 DP-forfeit H+1: CANCELLED + `downPaymentForfeitedAt` + jurnal `DP_FORFEIT` POSTED + jaminan utuh ✓ · S5 kamar kotor: bisa dipesan, aktivasi DIBLOKIR 409 sampai tiket ditutup ✓.

### Siap produksi
- `docs/06_DEPLOY_RUNBOOK.md` — backup, build, bootstrap.sql (constraint DP), **backfill E-2 produksi (SQL siap pakai)**, smoke E-1, baseline rekonsiliasi, rollback.
- Rekonsiliasi akhir UAT: **21 stay, mismatch=0**. Ditunda sadar (bukan blocker): E-6 timezone staf (mitigasi: TZ server Asia/Jakarta), E-7 round-robin, E-8 unit test.

<!-- KOST48_DOCS_SYNC_20260612_OVERSTAY_UAT_PASS -->
## 2026-06-12 (malam) — UAT Siklus Overstay V5.12.1 PASS PENUH + Rekonsiliasi Bersih

### UAT overstay end-to-end (stay tes #15, kamar G2-003 — manipulasi tanggal via SQL UAT, eksekusi via `POST /auto-ops/run`)
1. H-3: notifikasi "⏰ Kontrak berakhir 3 hari lagi" terkirim ✓
2. H-day: pengingat "berakhir HARI INI" + tiket `EVICT_OVERSTAY` (TIC-2026-EV-15) untuk staf ✓
3. H+1: **forced checkout otomatis** — stay COMPLETED, kamar MAINTENANCE + `allowBookingWhileCleaning=true`, tiket pembersihan TIC-2026-CHK-15, notifikasi 🚪 ke tenant ✓
4. Settlement deposit PARTIAL_REFUND (potong 100rb biaya overstay + refund 400rb): jurnal **POSTED** `JE-AUTO-DEPOSIT-SETTLEMENT-15` (blocking ✓), ledger 3 entri seimbang (PAYMENT_RECEIVED 500rb → DEDUCTION 100rb → REFUND 400rb, saldo akhir 0) ✓
5. Tutup tiket pembersihan → kamar **AVAILABLE** + flag kotor direset (gate room-ready) ✓

### Rekonsiliasi (§4.4)
- `deposit-ledger/reconciliation-lite`: ready=True, 15 stay diperiksa, **mismatch=0**; `backfill/dry-run`: wouldCreate=0.
- `accounting/auto-journal/backfill`: 0 dibuat (sumber operasional sudah terjurnal); catatan by-design: 11 deposit demo lama tanpa jurnal liability (deposit dikecualikan dari auto-backfill anti-double-posting) + invoice demo #4 bertotal 0 — PR data demo, bukan bug. `formalStatementReady=True`.

### UAT renew penuh (§4.3) + cross-check P&L (§4.4) — PASS
- Renew stay #1: request tenant → approve admin → invoice ISSUED **1.794.250** (RENT 1,7jt + listrik 50 kWh×1.445 = 72.250 + air 4 m³×5.500 = 22.000), periode menyambung 30 Jun→30 Jul (exclusive, tanpa gap/overlap), `plannedCheckOutDate` bergeser, approve ulang ditolak 409 (lock M-15 hidup).
- Cross-check: **trial balance seimbang** (Σdebit = Σkredit = 104.494.250). P&L ledger Juni 3.894.250 vs operasional 3.794.250 — selisih **tepat 100rb = pendapatan potongan deposit overstay (akun 4400)** yang memang non-invoice. Rincian ledger: 4000 Rent 3,7jt · 4100 Listrik 72.250 · 4110 Air 22.000 · 4400 Penalty 100rb. Setiap rupiah teridentifikasi.
- Dengan ini SELURUH rencana UAT `02_FOCUS_PLAN.md` §4.1–§4.4 TUNTAS.

### Catatan operasional
- Pengingat H-7/H-3/H-1/H-day & semua job noon terbukti aktif >pk 12:00 WIB; copy notifikasi pembayaran baru (M-10) terverifikasi terkirim.
- Sisa antrean: eskalasi E-1/E-3/E-4 (desain); saat deploy produksi: bootstrap.sql + E-2 backfill produksi.

<!-- KOST48_DOCS_SYNC_20260612_E2_UAT_PASS -->
## 2026-06-12 (sore) — E-2 Backfill (DB UAT) + UAT M-07/M-09 PASS Penuh

### E-2 — Backfill `initialMetersPromotedAt` (data fix, DB UAT 5433)
- 11 stay penghuni nyata (kamar OCCUPIED, jaminan terbayar) diisi `initialMetersPromotedAt = checkInDate` via SQL bertransaksi; 1 booking fase RESERVED dikecualikan. Pre-state tersimpan: `scripts/uat/E2_BACKFILL_PRESTATE_2026-06-12.txt`.
- Efek terverifikasi langsung: okupansi finance 0% → **55% (11/20)**; ke-11 penghuni kini masuk lifecycle pengingat/overstay/forced-checkout.
- ⚠️ Backfill yang sama WAJIB diulang di DB produksi saat deploy (SQL di pre-state file / CHANGELOG ini).

### UAT M-07/M-09 — PASS SEMUA (`scripts/uat/UAT_M07_M09_CLEAN.ps1`)
Siklus uang penuh pada data bersih (tenant baru via booking publik):
booking publik → approve admin tarif 2jt → **DP recalc 600rb (30% tarif final) ✓ M-09** → DP dibayar & disetujui (**dpPaid tercatat; expiresAt mati ✓ M-12**) → approve ulang ditolak 409 ✓ → pelunasan 1,9jt → **stay promoted ✓ M-07**, kamar OCCUPIED, jaminan 500rb tercatat.
Catatan: skrip eksekutor lama (`scripts/UAT_M07_M09.ps1`) punya 3 cacat (akun tenant.g2 tak ada, enum BANK_TRANSFER tak sah, kamar/meter hard-coded) — varian CLEAN menggantikannya. Artefak tes: stay #15; booking sisa #14 dibiarkan auto-expire sweeper.

<!-- KOST48_DOCS_SYNC_20260612_FIX_EXECUTION_UIUX -->
## 2026-06-12 — Eksekusi FIX-01..26 oleh AI eksekutor (VERIFIED) + Audit UI/UX Visual

### Eksekusi audit mega (kode)
- AI eksekutor menerapkan **24/24 FIX** dari `04_FIX_INSTRUCTIONS.md` (commit e4a8c31..f9d10ac, 1 commit per FIX; M-26/M-27 digabung 1 commit — deviasi minor diterima).
- **Verifikasi independen Fable:** diff a8ac9af..HEAD = tepat 15 file FIX + 3 skrip UAT (tanpa file liar); spot-check patch kunci (M-14/M-07/M-22/M-08/M-33/M-12) semua terpasang persis; `tsc --noEmit` backend & frontend 0 error. Constraint M-01 sudah dijalankan owner ke DB UAT.
- UAT eksekutor: M-14 PASS, M-16 PASS, M-07/M-09 code-OK (terblokir data tes). Sisa: jalankan `scripts/UAT_M07_M09.ps1` pada data bersih + **E-2 backfill `initialMetersPromotedAt`** untuk stay manual lama (lihat CHECKLIST).

### Audit UI/UX visual (docs only)
- `docs/05_UIUX_AUDIT_2026-06-12.md` — 104 screenshot, 5 surface × 2 viewport via Playwright/Chrome (read-only). 0 BLOCKER; 4 MAJOR (spinner detail kamar 5–8 dtk; katalog 48 kamar tanpa pagination; booking belum bayar tampil "Masa Sewa Aktif"; angka Tagihan Saya kontradiktif), 6 MINOR, 8 Quick Wins siap eksekusi. Mobile: 52 capture tanpa satu pun layout rusak. Bukti di `_uiux_audit_2026-06-12\` (tidak di-commit).

<!-- KOST48_DOCS_SYNC_20260612_AUDIT_MEGA_FIX_INSTRUCTIONS -->
## 2026-06-12 — Audit Mega Full-Sweep (docs only, tanpa perubahan kode aplikasi)

### Type
Audit read-only oleh Fable 5 atas SEMUA lini: schema/bootstrap, main/common/auth, 33 modul backend, frontend terarah. 2 dokumen baru.

### Deliverables
- `docs/03_AUDIT_MEGA_2026-06.md` — 42 temuan M-01..M-42 (5×P1, 11×P2, sisanya P3/INFO) + 9 batch verifikasi SEHAT + daftar ESKALASI E-1..E-9 + pemetaan temuan→tindakan.
- `docs/04_FIX_INSTRUCTIONS.md` — 24 FIX patch verbatim (CARI/GANTI persis) untuk AI eksekutor; QC otomatis: 42/42 blok CARI match tepat 1× di file target; aturan emas + kriteria BERHENTI + pesan commit per FIX.

### Temuan P1 (inti)
- M-14 check-in manual tidak pernah "promoted" → tersisih dari seluruh lifecycle overstay/pengingat/okupansi (FIX-01 + backfill E-2).
- M-15 renew tanpa lock → dobel-renew/race sweeper (FIX-02).
- M-16 cancel stay penghuni melepas kamar tanpa gate inspeksi (FIX-03).
- M-22 auto-ops tanpa try/catch per item → satu stay beracun menghentikan semua job (FIX-04).
- M-33 edit/hapus expense & wifi-sale meninggalkan jurnal yatim (FIX-14/15).

### Koreksi pemahaman penting (sehat, docs lama salah)
- Suspend user MEMUTUS sesi seketika (jwt.strategy validasi DB per request + klaim pwdAt); email reset password nyata via Brevo; double-apply qty inventory TIDAK terjadi (trigger DB + sync self-healing); app-notification tanpa RolesGuard AMAN (scoped per user).
<!-- KOST48_DOCS_SYNC_20260611_DOCS_COMPACTION_D1D4 -->
## 2026-06-11 — Docs Compaction + Keputusan Owner D1–D4 (tanpa perubahan logika, 1 copy fix)

### Type
Dokumentasi + 1 string copy. No schema change. TypeScript backend PASS.

### Keputusan owner (detail di `02_FOCUS_PLAN.md` §3)
- **D1:** Tanpa denda keterlambatan → kata "denda" dihapus dari reminder overdue (`reminder-preview.service.ts`). Line `PENALTY` tetap untuk potongan manual.
- **D2:** Notifikasi in-app saja; arah jangka menengah PWA push.
- **D3:** Prioritas berikutnya = UAT end-to-end + rekonsiliasi data (checklist `02_FOCUS_PLAN.md` §4).
- **D4:** Docs dipadatkan: aktif kini hanya 5 file ±60 KB — `01_GROUND_STATE.md` (ditulis ulang ringkas), `02_FLOW_MAP.md` (eks 05), `02_FOCUS_PLAN.md` (eks 07, baru: 12 flow + matriks fokus + strategi token), `CHECKLIST.md` (ditulis ulang), `CHANGELOG.md` (entri V5.11.0+). Diarsipkan ke `archieve/`: 01_CONTRACTS, 02_PLAN, 03_DECISIONS_LOG, 04_JOURNAL, 06_AUDIT_PASS_AB, GROUND_STATE/CHECKLIST basi V5.10.0, CHANGELOG lama. `CLAUDE.md` root dibuat sebagai pintu masuk sesi.

<!-- KOST48_DOCS_SYNC_20260611_V5122_FRONTEND_RATELIMIT_PASSCE -->
## 2026-06-11 — V5.12.2 Frontend DP/Jaminan + Rate Limiting + Audit Pass C/E/P3

### Type
Frontend + backend hardening. No schema change. TypeScript PASS (backend & frontend).

### Frontend (fitur V5.12.x kini terlihat pengguna)
- **SubmitPaymentModal (portal):** pilihan radio "DP 30%" vs "Bayar Lunas" dengan rincian dan copy kebijakan (DP kunci kamar, hangus bila gagal lunas; pelunasan paling lambat saat check-in). Fase pelunasan punya copy deadline H+1 pk 12:00.
- **BookingCard (portal):** baris "DP 30%" (dengan tanda ✓ bila terbayar) + label "Deposit jaminan" menggantikan "Deposit awal".
- **Katalog publik:** kamar MAINTENANCE yang `canBook=true` tampil "Bisa dipesan · dibersihkan" dengan copy lengkap (booking & DP sekarang, huni setelah bersih).
- **Admin ApproveBookingModal:** label "Deposit Jaminan" + penjelasan beda DP vs jaminan.
- **Admin Review Pembayaran:** nominal yang tepat sama dengan sisa DP 30% dinilai "Pas" (bukan "Parsial mencurigakan") dengan dampak approve yang menjelaskan kunci kamar (`paymentReviewSafety.ts`).
- Types: `downPaymentAmountRupiah`/`downPaymentPaidRupiah` di `Stay` & `TenantBooking`.

### Pass E — Rate limiting (sebelumnya TIDAK ADA throttling)
- `common/middleware/rate-limit.middleware.ts` — limiter in-memory tanpa dependensi (selaras keputusan tanpa-Helmet).
- Global `/api`: 300 req/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`).
- `/api/auth/login|forgot-password|reset-password`: 10 req/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`) — menahan brute-force & enumerasi.
- Catatan: state per-proses; bila kelak multi-instance perlu store bersama.

### Pass C — Deposit jaminan end-to-end
- Ledger (`deposit-ledger.service.ts`) diverifikasi sehat: entri idempotent per (stay, type, source), settlement mencatat DEDUCTION/FORFEIT/REFUND, `reconciliationLite` tersedia sebagai alat audit data.
- **Fix:** forfeit deposit legacy di sweeper (`cancelEndedUnpaidStay`) kini menulis entri FORFEIT ke ledger via `recordDepositSettlementTx` — sebelumnya hanya mengubah status stay sehingga rekonsiliasi akan selisih.
- Catatan (P3): `recordDepositReceivedTx` fallback sourceId ke stayId bila tanpa submissionId — risiko dedupe-collision teoretis, biarkan.

### P3 fixes
- **A14:** `invoices.cancel` kini lock `FOR UPDATE` + re-validasi status/pembayaran di dalam transaksi.
- **A17:** tenant yang kalah first-paid-wins kini menerima notifikasi in-app berisi alasan & ajakan pilih kamar lain (dikirim setelah transaksi approve sukses, best-effort).

### Pass D/F/G — status verifikasi
- **Pass D (tutup buku):** sudah diverifikasi di V5.11.1 — auto-close di-gate readiness `unmapped-operational` (hitung penuh) + depresiasi + asset alignment + trial balance; celah invoice CANCELLED ditutup A8. Sisa pekerjaan: cross-check angka `reports/*` (raw SQL) vs trial balance accounting per periode — perlu data produksi, jadwalkan saat UAT.
- **Pass F (operasional fisik):** sinkronisasi qty barang punya 3 jalur (movement, field report, ticket close) dengan lock `lockInventoryQtyTx` di movement; risiko double-apply tersisa di kombinasi field-report→ticket-close (status saja, bukan qty) — risiko rendah, pantau lewat `ensureOpeningStockSyncedTx`/`ensureInventoryQtySyncedTx` yang sudah self-healing.
- **Pass G (data lama):** alat sudah tersedia & terhubung: `GET /api/deposit-ledger/reconciliation-lite`, `deposit-ledger/backfill-dry-run`, `accounting/backfill-auto-journal`, `accounting/deposit-backfill-dry-run`. Jalankan berurutan di UAT/produksi setelah deploy V5.12.x, perbaiki temuan via backfill sebelum tutup buku bulan berjalan.

<!-- KOST48_DOCS_SYNC_20260611_OVERSTAY_LIFECYCLE -->
## 2026-06-11 — V5.12.1 Overstay Lifecycle (Keputusan Owner)

### Type
Backend + schema additive (`Room.allowBookingWhileCleaning`, db push OK). TypeScript PASS.
Keputusan owner: forced checkout otomatis penuh; kamar kotor bisa dipesan, huni tunggu bersih; pengingat H-7/H-3/H-1/H-day; biaya overstay dipotong dari deposit jaminan saat settlement.

### Siklus overstay lengkap (auto-ops, urutan sequential)
1. **Pengingat** — `runContractEndReminders`: notifikasi in-app ke tenant pada H-7, H-3, H-1, dan H-day (dedupe per gelombang). Isi: perpanjang atau checkout sebelum pk 12:00; peringatan checkout paksa H+1.
2. **H-day pk 12:00** — `runOverstayEnforcement` (V5.12.0): tiket `EVICT_OVERSTAY` untuk staf menemui tenant.
3. **H+1 pk 12:00** — `runOverstayForcedCheckout` (BARU): stay → COMPLETED otomatis, kamar → MAINTENANCE + `allowBookingWhileCleaning=true` (kotor tapi bisa dipesan), tiket pembersihan `CHECKOUT_INSPECTION` untuk staf (keluarkan barang, bersihkan, foto), notifikasi ke tenant. **Pengecualian:** masih ada tagihan belum lunas → TIDAK auto-checkout; admin/owner dapat notifikasi 🚨 (dedupe harian) karena uang harus diputuskan manusia.
4. **Kamar kotor bisa dipesan** — katalog publik menampilkan "Bisa dipesan — sedang dibersihkan" (`canBook=true`); booking + DP diterima (portal & publik). **Aktivasi/huni diblokir** sampai tiket pembersihan ditutup: pelunasan tidak bisa di-approve, check-in manual ditolak.
5. **Tiket pembersihan ditutup** — gate baru: booking baru di kamar itu TIDAK memblokir penutupan tiket (yang memblokir hanya penghuni promoted); kamar → AVAILABLE (atau tetap RESERVED bila sudah dipesan), flag kotor direset → pelunasan boleh di-approve.
6. **Biaya overstay** — dipotong dari deposit jaminan tenant lama saat settlement (`processDeposit`, manual oleh admin; tercantum di deskripsi tiket).

### Konsistensi tambahan
- Semua jalur pelepas kamar (expiry sweep, expire manual, auto-cancel pasca-reject, cancelEndedUnpaidStay, room healer) kini memakai `releaseRoomAfterBookingCancelTx`: bila masih ada tiket pembersihan terbuka, kamar kembali ke MAINTENANCE (tetap bisa dipesan) — bukan AVAILABLE — agar check-in manual tidak masuk kamar kotor.
- `stays.create` (check-in manual) menolak kamar dengan tiket pembersihan terbuka.
- Aktivasi booking (pelunasan PAID) mereset `allowBookingWhileCleaning`.

### Files
`schema.prisma` + `sql/bootstrap.sql` (Room.allowBookingWhileCleaning), `auto-ops.service.ts`/`auto-ops.module.ts` (2 job baru + notifikasi), `payment-submissions.service.ts`, `tenant-bookings.service.ts`/`-helpers.ts`, `public-bookings.service.ts`, `tickets.service.ts`, `stays.service.ts`, `marketing-public-rooms.service.ts`.

### Follow-up frontend
- Katalog publik: render `availabilityNote` "sedang dibersihkan" (data sudah dikirim backend).
- Portal: tampilkan pengingat kontrak (notifikasi in-app sudah masuk bell icon yang ada).

<!-- KOST48_DOCS_SYNC_20260611_A18_DP_VS_DEPOSIT -->
## 2026-06-11 — V5.12.0 DP (Uang Muka) vs Deposit (Jaminan) + Overstay Enforcement Baru

### Type
Backend + schema additive (`prisma db push` sudah dijalankan ke kost48_v3_pro). TypeScript PASS.
Keputusan owner: jaminan = `Room.defaultDepositRupiah`; pelunasan paling lambat saat check-in (H+1 pk 12:00 = hangus); DP via jalur upload bukti yang sama; overstay = kontrak lewat + belum checkout final.

### Schema (additive)
- `Stay.downPaymentAmountRupiah` (DP 30% × sewa), `downPaymentPaidRupiah`, `downPaymentPaidAt`, `downPaymentForfeitedAt`.
- `Stay.depositAmountRupiah` kini KONSISTEN = jaminan (refundable): portal booking memakai `Room.defaultDepositRupiah` (sebelumnya 30% sewa), sama dengan booking publik & check-in manual.
- `sql/bootstrap.sql` + ALTER idempotent.

### Alur booking baru (A18)
1. Booking dibuat: DP = 30% sewa; jaminan = defaultDepositRupiah; SLA bayar DP = 3 jam (`expiresAt`).
2. Tenant upload bukti — dua nominal sah: **DP 30%** atau **pelunasan penuh** (sisa sewa + jaminan).
3. DP disetujui → invoice PARTIAL, `downPaymentPaid*` terisi, **kamar terkunci** (booking pesaing dibatalkan saat itu juga, tidak menunggu lunas), guard `expiresAt` mati.
4. Pelunasan disetujui → invoice PAID → kamar OCCUPIED, jaminan masuk deposit ledger + jurnal liability, meter dipromote (alur lama).
5. Tidak lunas hingga **H+1 pk 12:00 WIB setelah check-in** → job baru `runDownPaymentForfeit`: stay CANCELLED, invoice dibatalkan + reversal, **DP hangus** (`downPaymentForfeitedAt`), jurnal forfeit `DP_FORFEIT:{stayId}` (debit 1100 AR, kredit 4400 Penalty) — hanya diposting bila pembayaran DP terjurnal (hindari piutang fiktif), jaminan tidak tersentuh (belum dibayar).

### Overstay enforcement baru (A5)
- `runOverstayEnforcement` ditulis ulang: tenant promoted dengan `plannedCheckOutDate` lewat + belum checkout final → tiket `EVICT_OVERSTAY` otomatis setelah pk 12:00 WIB (dedupe per kamar). Definisi lama (perlu tenant baru yang bayar di kamar OCCUPIED) terbukti unreachable.

### Files
`schema.prisma`, `sql/bootstrap.sql`, `tenant-bookings.service.ts`, `tenant-bookings-helpers.ts`, `public-bookings.service.ts`, `payment-submissions.service.ts`, `payment-submissions.helpers.ts`, `accounting-posting.service.ts` (+`postDownPaymentForfeitTx`), `auto-ops.service.ts` (+`runDownPaymentForfeit`).

### Follow-up frontend (belum dikerjakan)
- Portal MyBookings: tampilkan dua opsi nominal (DP 30% / pelunasan) + status DP + deadline pelunasan; sekarang pesan error backend yang memandu nominal.
- Admin booking approval: label "Deposit" → "Deposit Jaminan"; tampilkan kolom DP di antrean review pembayaran.

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_PASS_AB_FIX1 -->
## 2026-06-11 — V5.11.1 Audit Pass A/B — Fix Paket 1

### Type
Backend hardening only. No schema change. No DB reset. TypeScript PASS.
Referensi temuan: `docs/06_AUDIT_PASS_AB_2026-06-11.md` (flow map: `docs/05_FLOW_MAP.md`).

### Fixed
| Temuan | Perbaikan | File |
|---|---|---|
| A1 | Pembayaran manual ditolak untuk invoice booking belum aktif (room RESERVED + belum promoted) — wajib lewat Review Pembayaran agar aktivasi kamar/jaminan/meter berjalan | `invoice-payments.service.ts` (create) |
| A1 | Semua sweeper kini skip stay yang punya invoice PAID/PARTIAL ("uang masuk = keputusan manusia") | `auto-ops.service.ts` (expireBookingTx), `payment-submissions.service.ts` (expireBooking, runExpiryCheck, autoCancelRejectedExpiredBookingTx) |
| A2 | `expireBooking` & `runExpiryCheck` kini lock `FOR UPDATE OF s, r` + re-cek status/submission dalam transaksi (pola fix #3) — race vs approve tertutup | `payment-submissions.service.ts` |
| A4 | Job auto-ops jalan **sequential** (bukan `Promise.all`) | `auto-ops.service.ts` (runAll) |
| A4 | Noon-release & H+1 auto-cancel digabung ke satu metode `cancelEndedUnpaidStay`: lock + re-cek, skip bila ada pembayaran, batalkan invoice DRAFT/ISSUED dengan reversal blocking, forfeit dana terbayar (G2=A), lepas kamar hanya bila tidak ada stay ACTIVE lain | `auto-ops.service.ts` |

### Terminologi (ketetapan owner)
- **DP** = uang muka pesan kamar (bagian harga sewa, hangus bila gagal).
- **Deposit** = uang jaminan, dicek saat checkout, refundable.
- Temuan arsitektur **A18**: `Stay.depositAmountRupiah` saat ini mencampur keduanya — menunggu keputusan owner (lihat docs/06 §A18).

### Fixed — Paket 2 (P2 terisolasi)
| Temuan | Perbaikan | File |
|---|---|---|
| A6 | `update`/`remove` payment: lock `FOR UPDATE` invoice + cek jurnal & overpayment dipindah ke dalam transaksi | `invoice-payments.service.ts` |
| A7 | Line jurnal reversal payment kini berisi `description` (sebelumnya salah field `memo` → kosong); sortOrder mulai 0 | `accounting-posting.service.ts` |
| A9 | Check-in manual hanya boleh ke kamar AVAILABLE (MAINTENANCE/INACTIVE kini ditolak, bukan cuma OCCUPIED/RESERVED) | `stays.service.ts` |
| A10 | Booking path `createSubmission` menolak invoice DRAFT (konsisten dengan jalur invoice-only) | `payment-submissions.service.ts` |
| A12 | `syncInvoiceStatus` menulis `paidAt` = tanggal pembayaran terakhir, bukan `now()` | `invoice-payments.service.ts` |
| A16 | Copy error CANCELLED pada update payment diperbaiki | `invoice-payments.service.ts` |

### Fixed — Paket 3 (konsistensi accounting)
| Temuan | Perbaikan | File |
|---|---|---|
| A8 | Helper tunggal `reverseCancelledInvoiceJournalsTx`: pre-check jurnal POSTED → reversal **wajib sukses** (skip idempotent = OK) — dipakai di 4 jalur cancel yang sebelumnya warn-only (competing-cancel, expire manual, sweep expiry, auto-cancel pasca-reject) | `payment-submissions.service.ts` |
| A11 | Diverifikasi: auto-close SUDAH diblokir readiness `unmapped-operational` (hitung penuh, bukan sample) bila ada invoice/payment/expense/wifi tanpa jurnal. Celah tersisa (invoice CANCELLED lolos dari hitungan unmapped) ditutup oleh A8 | (tanpa perubahan kode) |

### Open (menunggu keputusan owner)
- A18 (pemisahan DP vs deposit jaminan + alur DP-only payment) — termasuk fakta baru: check-in manual masih pakai `defaultDepositRupiah`, portal pakai 30% sewa (dua rumus, satu field)
- A5 (definisi ulang trigger EVICT_OVERSTAY)
- A13–A15, A17 (P3, catatan ringan)

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_FIX -->
## 2026-06-11 — V5.11.0 Audit Hardening & Business Logic Fixes

### Type
Backend refactor + schema additive + auto-ops expansion + security headers.
Schema: added `Stay.cancelReason` + fixed `RenewRequest.tenant` relation. No DB reset.

### Commits (5)
```
7bdcca3 fix: P2-20 trust proxy, P2-21 CSP header
cb43471 fix: #3 expiry race FOR UPDATE, #8 P2002 catch createSubmission
e030956 feat: auto-ops room release pk 12:00, forced checkout tiket staf, auto-cancel H+1 forfeit DP
73085b2 feat: DP 30% model - depositAmountRupiah = 30% × agreedRent sesuai pricingTerm
4cab5ee fix: terapkan audit fix ACT-1 s.d ACT-5 (11 temuan) + docs
```

### Audit Fix (11 temuan)
| # | Temuan | Perbaikan |
|---|--------|-----------|
| #1 | Stay.cancelReason schema drift | +field di schema.prisma + db push |
| #2 | Cancel stay skip accounting blocking | Pre-check journal POSTED sebelum reversal |
| #4 | Refund deposit fiktif | Hapus fallback ke depositAmount |
| #5 | DepositPortion tanpa cap | Cap ke depositRemaining |
| #6 | catch dalam transaksi | 5 lokasi → try/catch + logger.warn |
| #7 | Race overpayment manual | FOR UPDATE + validasi dalam transaksi |
| #9 | INVOICE_PAYMENT reversal | Method baru `postPaymentReversalTx` |
| #12 | Jurnal VOID blocking | Filter `status: { not: 'VOID' }` |
| #15 | RenewRequest.tenant relation | `Tenant` (not `Tenant?`) + Restrict |
| #16 | TOCTOU check-in manual | FOR UPDATE + re-validasi dalam transaksi |
| #3 | Expiry race TOCTOU | FOR UPDATE + re-cek submission sebelum cancel |

### Business Logic (Keputusan Owner G1-G5)
| Gap | Keputusan | Implementasi |
|-----|-----------|-------------|
| DP 30% | 30% × pricingTerm (G4=B) | depositAmountRupiah di createBooking |
| DP non-refundable | Hangus 100% jika gagal (G2=A) | auto-cancel H+1 forfeit |
| DP tidak pindah | Hangus total saat rebooking (G3=A) | depositStatus = FORFEITED |
| Room release | Pk 12:00 batas keras (G5=A) | runRoomReleaseAtNoon |
| Forced checkout | Sistem + tiket staf (G1=B) | runOverstayEnforcement → tiket EVICT_OVERSTAY |

### Auto-Ops Baru
- `runRoomReleaseAtNoon` — pk 12:00 WIB, lepas stay RESERVED yang overdue
- `runOverstayEnforcement` — auto-create tiket EVICT_OVERSTAY untuk staf
- `runPostCheckoutAutoCancel` — H+1 cancel + DP forfeit

### Security
- Trust proxy setting (`app.set('trust proxy', 1)`)
- Content-Security-Policy header
- PasswordHash stripped from AuditLog
- CSPRNG password generator (randomBytes)
- Generic Prisma error messages (no table/column leak)

### Docs
- `docs/06` s.d `09` + `05_BMI` → archived to `docs/archieve/`
- `docs/03_DECISIONS_LOG.md` — updated with G1-G5 decisions
- `docs/CHANGELOG.md` — this entry

### Files Changed (cumulative)
```
15 backend source files + 1 schema.prisma + 1 main.ts + db push
Total: +1.500 lines, 0 TypeScript errors
```

<!-- KOST48_DOCS_SYNC_20260602_V5100_CHARTS_REVIEW_TICKETS_CSS -->
