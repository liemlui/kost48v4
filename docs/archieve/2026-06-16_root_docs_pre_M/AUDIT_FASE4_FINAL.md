# AUDIT FORENSIK FASE 4 + BACKLOG — temuan per fitur
**Mulai:** 2026-06-15. **Metode:** baca kode hasil-commit satu per satu; bandingkan dgn teori (PSAK, idempotency, privasi, race, RBAC). Severity: 🔴 BUG (harus fix) · 🟠 CELAH (risiko) · 🟡 CATATAN/over-confidence · ✅ OK.
**Aturan:** `[x]` di checklist hanya bila benar-benar lengkap. Item dengan temuan tetap dibuka.

---

## FASE A — FINANCE (paling berisiko)

### F4-1 Unearned Revenue (`rent-recognition.service.ts`)
- ✅ **A-OK1** Konsistensi nominal: Σ jadwal (`splitRentByMonths`) = `rentTotal` = deferral. Deferral DR 4000/CR 2200 = R; recognize Σ = R. Trial balance seimbang (UAT membuktikan). Hanya RENT yang ditangguhkan; utilitas (4100) tetap diakui langsung — **benar**.
- 🟠 **A-1 [entryDate periode tutup → recognition/deferral stranded]** `ensureSchedules` deferral pakai `entryDate=checkInDate`; `recognizeDue` pakai `entryDate=periodStart`. Bila periode akuntansi bulan itu sudah **CLOSED** sebelum posting (sweeper mati > ~1 bulan, atau periode ditutup dini), `postBalancedJournalTx` menolak (periode bukan OPEN) → baris **stranded pending selamanya** / deferral tak pernah jadi → pendapatan over/under-recognized. **Mitigasi saat ini:** sweeper 5 menit + deploy fresh → periode selalu OPEN saat diproses. **Saran:** bila periode target tutup, fallback ke periode berjalan + memo koreksi, ATAU larang tutup periode yang masih punya baris `recognizedAt=null` jatuh tempo. **Perlu keputusan owner.**
- 🟠 **A-2 [race prepay sebelum jadwal awal SMESTERLY]** `ensureSchedules` gate `rentRecognitionSchedules: none`. Bila stay SMESTERLY/YEARLY menerima **prabayar (F4-11)** sebelum sweeper sempat membuat jadwal awal → `scheduleExtension` mengisi baris → `none` jadi false → `ensureSchedules` **melewati stay selamanya** → sewa semester AWAL tak pernah ditangguhkan (tetap diakui penuh di issuance). Probabilitas kecil (prabayar di menit pertama stay SMESTERLY baru) tapi nyata.
- 🟡 **A-3 [deferral fires di issuance-posted+promoted, bukan eksplisit paid]** Bergantung invarian *promoted ⟹ sudah bayar* (benar di flow booking). Untuk SMESTERLY/YEARLY yang entah bagaimana promoted-tapi-belum-bayar, akan mengakui pendapatan tanpa kas. Risiko rendah.
- 🟡 **A-4 [pengakuan bulan-1 di awal periode]** Straight-line bulanan diakui di **awal** tiap bulan (bukan prorata harian). Sesuai metode yang owner pilih; bukan bug, dicatat agar tak dikira prorata.

### F4-11 Prabayar (`prepay-extension.service.ts`)
- ✅ **A-OK2** Alur jurnal benar (issuance DR1100/CR4000 + payment DRkas/CR1100 + deferral DR4000/CR2200), periodIndex offset + sourceKey per-invoice mencegah bentrok. UAT TB seimbang tiap langkah.
- 🟡 **A-5 [tarif bulanan non-MONTHLY]** `monthlyRent = MONTHLY? agreedRent : room.monthlyRateRupiah`. Untuk stay non-MONTHLY, pakai **tarif kamar saat ini** (bukan terkunci D-16). Karena prabayar = "harga bulanan", wajar; tapi bila tarif kamar sudah naik, prabayar non-MONTHLY ikut tarif baru. **Abu-abu — perlu konfirmasi owner.**
- 🟡 **A-6 [tak ada cek tunggakan/invoice terbuka sebelum prabayar]** Prabayar bisa dibuat walau ada invoice belum lunas lain. Tidak salah secara kas (prabayar = uang baru), tapi mungkin owner mau blok prabayar bila ada tunggakan. **Abu-abu.**
- 🟡 **A-7 [prabayar tak memberi poin RENEWAL]** Prabayar memperpanjang sewa tapi tak lewat `renew-requests` → tak award poin RENEWAL/review. Mungkin diinginkan (prabayar ≠ renewal request). **Abu-abu.**

### F4-10 Pembulatan (`money.helper.ts`)
- ✅ **A-OK3** `roundRupiah` half-away-from-zero (simetri D/K), `rupiahAmount` clamp ≥0. Identik `Math.round` untuk input ≥0 (terbukti unit test). DO-NOT-TOUCH (period-close) tak disentuh. Tidak ada bug.

### Silang dengan audit AI lain (`FLOW_AUDIT_LAPORAN.md`, commit 0a83dbd pra-Fase 4)
- 🟠 **A-8 [WARISAN: Auto Journal Lite best-effort]** Temuan utama audit lama (R1): jurnal INVOICE_ISSUED/PAYMENT/CANCELLED/EXPENSE/WIFI/DEPOSIT_RECEIVED **best-effort** (try/catch, operasi tetap jalan walau jurnal gagal); hanya DEPOSIT_SETTLEMENT blocking. **Status: ISU ARSITEKTUR LAMA, di luar lingkup Fase 4** — tetap relevan untuk kredibilitas laporan. **Fase 4 saya justru BLOCKING:** F4-11 prabayar memeriksa hasil `postInvoiceIssuedTx`/`postInvoicePaymentTx`/deferral & **throw bila gagal** (tx rollback); F4-1 deferral throw bila tak terposting. **Mitigasi lama:** `backfillAutoJournal` ada (manual). **Saran owner:** pertimbangkan blocking + reconciliation otomatis (R1/R2 audit lama).
- ✅ Temuan audit lama A3 (high-signal tickets) & A4 (occupancy 0) = SUDAH diperbaiki (F2-12/F1-6) — STALE.
- 🟡 **A-9 [balanceSheet di reports.service]** Audit lama bilang "tak ada balanceSheet". **Perlu verifikasi:** `accounting-reports.service.ts` punya `balanceSheet()` (berbasis jurnal) — kemungkinan temuan lama parsial/stale. Dicek di Fase E.

## FASE B — GAMIFIKASI

### F4-9 Poin & Redemption (`loyalty.service.ts`, `redemption.service.ts`)
- ✅ **B-OK1** Idempotency poin solid: `@@unique(sourceType, sourceId)` + catch P2002 di `award`. Tiap sumber (RENEWAL/ON_TIME_PAYMENT/REDEMPTION/REFUND/PEER/REFERRAL) sourceId unik. UAT membuktikan dup di-skip.
- ✅ **B-OK2** Redemption flow benar: potong poin saat ajukan, refund saat REJECT, FULFILLED + jurnal DR6300/CR2100 saat APPROVE. Jurnal reward **DI DALAM tx decide** (lebih baik dari best-effort lama).
- 🟡 **B-1 [race overspend poin]** `requestRedemption`: cek saldo via `aggregate SUM` sebelum & sesudah insert, tapi isolation default **read-committed** → 2 request paralel bisa sama-sama lolos (tak lihat insert satu sama lain yang belum commit) → saldo bisa negatif. **Risiko rendah** (1 tenant, jarang paralel). Fix kuat: `SELECT ... FOR UPDATE` baris saldo / advisory lock per tenant / serializable.
- 🟡 **B-2 [race stok reward]** Sama: 2 request paralel reward stok=1 bisa sama-sama lolos `stockQty<=0` → stok jadi negatif. Risiko rendah. Fix: lock baris reward.
- 🟡 **B-3 [jurnal reward best-effort dalam tx]** `decideRedemption` APPROVE: bila `postRewardFulfillmentTx` **skip** (COA 6300/2100 hilang) → `journalEntryId=null` tapi status tetap **FULFILLED** → reward terkirim tanpa jurnal (M4). COA ter-seed → risiko rendah; tapi tak ada guard throw seperti F4-11. (Reward tanpa nilai/BADGE skip = sengaja, benar.)
- 🟡 **B-4 [ON_TIME_PAYMENT terlalu murah hati]** Trigger memberi +50 untuk SETIAP invoice PAID tepat waktu (termasuk DP, pelunasan, utilitas) — bisa banyak poin per siklus. Idempotent per invoiceId (benar), tapi mungkin owner hanya mau poin untuk invoice SEWA. **Abu-abu — perlu konfirmasi.**
- 🟡 **B-5 [VALIDATED_REPORT reuse skor]** Review-renewal (F4-13a) & lapor-tervalidasi pakai reason `VALIDATED_REPORT` (+30) karena enum `LoyaltyPointReason` tak punya nilai khusus. sourceType beda (RENEWAL_REVIEW vs VALIDATED_REPORT) → tak bentrok. Fungsional benar; hanya "reason" di ledger kurang spesifik. **Catatan, bukan bug.**

### F4-13c Quest sikap (`peer-report.service.ts`) — PRIVASI
- ✅ **B-OK3** Privasi pelapor terjaga: `listAboutMe` select TANPA `reporterTenantId`; notif ACKNOWLEDGE ke B tanpa identitas A; UAT membuktikan. Konfirmasi = A (reporter) atau admin (sesuai keputusan owner). Dedupe 1 laporan aktif per (A,B,kategori).
- 🟡 **B-6 [self-identify via deskripsi]** Sistem tak bocorkan pelapor, TAPI A bisa menulis identitasnya sendiri di `description` ("ini saya kamar 5"). Itu pilihan A, bukan kebocoran sistem. **Catatan.**
- 🟡 **B-7 [reportee bisa = tenant non-aktif?]** `create` hanya cek reportee tenant ada (bukan harus aktif/sehuni). `listCoTenants` (UI) hanya tampilkan penghuni aktif, jadi via UI aman; via API langsung bisa lapor tenant lama. Risiko rendah.

### F4-13 Referral (`referral.service.ts`)
- ✅ **B-OK4** Anti-double via `TenantReferral.referredTenantId @unique` + upsert; self-referral diblok; reward hanya saat teman jadi tenant **AKTIF promoted** (harus benar-benar menyewa → tak bisa farming poin gratis). Idempotent per referralId.
- 🟡 **B-8 [hanya tenant BARU]** `linkReferralTx` dipanggil hanya saat `isNewTenant` di booking publik. Teman yang sudah pernah jadi tenant (balik lagi) tak tertaut. Sesuai semangat "ajak teman baru". **Catatan.**
- 🟡 **B-9 [kode via booking publik saja]** Referral hanya tertaut lewat booking PUBLIK (DTO `referralCode`). Booking via portal/admin tak ada jalur kode. Bila teman dibooking-kan admin, referral tak tercatat. **Abu-abu — perlu konfirmasi apakah perlu jalur admin.**

## FASE C — OPERASIONAL

### F4-8 Pindah kamar (`room-transfer.service.ts`)
- ✅ **C-OK1** Validasi benar (stay ACTIVE+promoted, toRoom AVAILABLE & tak ada penghuni aktif lain), tx + `FOR UPDATE` stay, kamar lama→MAINTENANCE+tiket inspeksi, baru→OCCUPIED, tarif kamar baru di-snapshot, override harga OWNER-only, RoomTransfer audit. UAT lengkap.
- 🟠 **C-1 [utilitas kamar LAMA tak diselesaikan saat pindah]** Transfer hanya snapshot meter **kamar BARU** (opsional). Pemakaian listrik/air tenant di kamar LAMA dari pembacaan terakhir s/d tanggal pindah **tidak di-snapshot/ditagih** — billing utilitas baca meter `roomId` saat ini (=kamar baru) → utilitas kamar lama periode berjalan bisa **hilang/tak tertagih**. **Perlu keputusan owner:** apakah pindah kamar harus menyelesaikan utilitas kamar lama dulu (snapshot meter akhir + tagih)?
- 🟡 **C-2 [toRoom tak di-lock]** Hanya stay yang `FOR UPDATE`; toRoom tidak. Dua pindah paralel ke kamar tujuan sama bisa lolos cek "tak ada penghuni aktif". Risiko rendah (admin-initiated). Fix: lock toRoom.
- 🟡 **C-3 [override harga vs jadwal recognition]** Bila stay SMESTERLY (punya RentRecognitionSchedule) lalu pindah + override harga, jadwal lama (harga lama) tak disesuaikan. Edge langka.

### F4-15 Cuci AC (`auto-ops.service.ts runAcCleaningSchedule`)
- ✅ **C-OK2** Sweeper buat tiket AC_CLEANING saat lewat `acCleanIntervalDays`, dedupe via tiket terbuka, reset `acLastCleanedAt` saat tiket ditutup. Admin set AC via Room DTO.
- 🟡 **C-4 [OVER-CONFIDENCE: kWh/jam-pemakaian TIDAK diimplementasi]** Owner minta acuan **kWh listrik / estimasi jam dari watt** (AC 1/2 PK 380-450W). Implementasi hanya **interval HARI** (default 90); `acWattage` disimpan tapi TAK dipakai untuk trigger. Dicatat di checklist sbg "refinement" tapi sebenarnya bagian inti permintaan owner BELUM ada. **Status jujur: PARSIAL, bukan penuh.** Perlu keputusan: cukup interval, atau implement estimasi jam dari kWh?
- 🟡 **C-5 [biaya cuci → Expense manual]** Tak ada tautan otomatis tiket AC → Expense. Admin catat expense manual saat bayar tukang. Sesuai "flow normal" tapi tak otomatis.

### F2-10 Round-robin (`tickets.service.ts pickStaffAssigneeTx`)
- ✅ **C-OK3** Logika benar (0→none, 1→dorman, ≥2→beban terendah). UAT membuktikan dorman/aktif.
- 🟡 **C-6 [cakupan parsial]** Round-robin hanya di `createTicketRecord` (tiket portal tenant + backoffice). Tiket **auto-system** (inspeksi checkout, AC, reward→tugas, room-transfer) masih `findFirst STAFF orderBy id asc` → menumpuk ke staf-1 walau ada ≥2 staf. **Perlu keputusan:** apakah tiket sistem juga harus round-robin?

### F3-5 Leaderboard (`staff-performance.service.ts getLeaderboard`)
- ✅ **C-OK4** Peringkat skor KPI desc, `active=false` saat <2 staf (auto-aktif ≥2). UAT membuktikan. Reuse `getAdminMonthly` (konsisten skor). Tie → stable by fullName.

## FASE D — INFRA / NOTIF

### F4-2 PWA Push (`push.service.ts`, `sw.js`)
- ✅ **D-OK1** subscribe upsert by endpoint, unsubscribe deactivate, dispatch outbox (PENDING→SENT/FAILED), retry cap 3, 404/410 → deactivate subscription, VAPID off → skip aman (notif in-app tetap). UAT lengkap (offline). Tak ada bug berarti.
- 🟡 **D-1 [VAPID prod]** Wajib set `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` di env prod (langkah owner). Tanpa itu push diam (by design). Bukan bug.
- 🟡 **D-2 [butuh HTTPS + service worker hanya PROD]** Push hanya jalan di build PROD (SW di-register `import.meta.env.PROD`) + HTTPS. Di dev tak ada push. By design.

### F4-7 Pruning notif (`app-notification.service.ts`)
- ✅ **D-OK2** `pruneOlderThan(90, batch 5000)` hapus `createdAt < cutoff`, batched via index. UAT membuktikan. Sweeper best-effort.
- 🟡 **D-3 [hapus termasuk unread]** Menghapus notif >90 hari TANPA pandang `isRead`. Notif penting yang belum dibaca & >90 hari ikut terhapus. Sesuai tujuan retensi; bisa diperhalus (hapus read-only) bila owner mau. **Catatan.**

### F4-12 FAQ/Manual (`MyManualPage.tsx`)
- ✅ **D-OK3** Halaman tenant baca FAQ publik per kategori (Accordion). Reuse `Faq` + `/faqs/public`. Tanpa schema.
- 🟡 **D-4 [OVER-CONFIDENCE: "generate dari aturan flow" = manual]** Owner minta FAQ **di-generate dari semua aturan/flow**. Implementasi hanya **menampilkan** FAQ yang ADA; konten harus **dikurasi manual owner** via admin FAQ. Auto-generation konten dari `03_KEPUTUSAN_OWNER`/dossier **TIDAK** dibuat. **Status jujur: menu/tampilan PENUH, generasi konten BELUM.** Perlu keputusan: cukup kurasi manual, atau perlu seed FAQ awal dari aturan?

### F4-14 Tip staf (`users` + `MyTicketsPage`)
- ✅ **D-OK4** `User.tip*` settable via users DTO/service; tenant lihat link tip assignee di tiket DONE/CLOSED; TIDAK dijurnal (sesuai keputusan).
- 🟠 **D-5 [TAK ADA UI input tip staf]** Backend menerima `tipGopay/Ovo/Dana/Bank` via update user, TAPI form manajemen user (ConfiguredResourcePage, config-driven) **belum punya field tip** → owner tak bisa mengisi info tip lewat UI (harus via API/DB langsung). **Fitur tip tak berguna sampai ada UI input.** Perlu: tambah field tip di form user, ATAU endpoint self-service staf.
- 🟡 **D-6 [staf tak bisa set tip sendiri]** Set tip via users update = OWNER-only (D-17). Staf tak bisa atur e-wallet sendiri. Mungkin owner mau self-service. **Abu-abu.**

## FASE E — LINTAS (schema, RBAC, deploy)
- ✅ **E-OK1 [migration chain]** `migrate diff --from-migrations --to-schema` = **"No difference detected"** → 5 migration (F4-2/F4-1/S-3/S-4) konsisten; `migrate deploy` dari baseline menghasilkan schema persis. Deploy bersih.
- ✅ **E-OK2 [boot/DI]** App **"Nest application successfully started"**; SEMUA modul cross-dep baru (Accounting/AutoOps/Loyalty/Notifications/PaymentSubmissions/RenewRequests/Stays/TenantBookings/Tenants/Tickets) initialized — **TIDAK ADA circular dependency** (kritis krn banyak import baru sesi ini).
- ✅ **E-OK3 [balanceSheet]** Ada `accounting-reports.service.ts:356 balanceSheet()` berbasis jurnal → temuan audit lama "tak ada balance sheet" = **STALE** (mereka lihat reports.service operasional).
- ✅ **E-OK4 [RBAC]** Endpoint baru benar: transfer-room/prepay = OWNER/ADMIN; loyalty rewards = OWNER, redemptions decide = OWNER/ADMIN; peer-report tenant = TENANT, moderate = OWNER/ADMIN; leaderboard = OWNER/ADMIN; referral-code = auth (tenantId-gated).
- 🟡 **E-1 [db push --accept-data-loss]** S-4 db push butuh `--accept-data-loss` (false-alarm unique index pada kolom baru/null). `migrate deploy` tak terdampak (SQL additive). Bukan bug; catat di runbook agar tak panik.
- 🟡 **E-2 [bootstrap.sql]** Tabel/fitur baru TAK butuh trigger/constraint DB tambahan (idempotency via `@@unique` di schema). `sql/bootstrap.sql` tak perlu diubah untuk Fase 4. ✅ tapi pastikan dijalankan tetap (guard lama).

---

## RINGKASAN TEMUAN

**Tidak ada 🔴 BUG baru dari Fase 4.** Gate (tsc 0, 40/40, UAT runtime, app boot) hijau; trial balance seimbang di semua jalur finance.

**🟠 CELAH (perlu keputusan owner):**
- **A-1** recognition/deferral bisa stranded bila periode tutup sebelum sweeper (mitigasi: sweeper 5 mnt). 
- **A-2** race prabayar sebelum jadwal SMESTERLY awal (edge langka).
- **C-1** utilitas kamar LAMA tak diselesaikan saat pindah kamar (bisa tak tertagih).
- **D-5** TAK ada UI input info tip staf (fitur tip tak berguna sampai ada UI).
- **A-8** (WARISAN, di luar Fase 4) auto-journal best-effort di flow lama.

**🟡 OVER-CONFIDENCE (di-check tapi parsial):**
- **C-4 F4-15:** acuan **kWh/jam** dari watt BELUM ada; hanya interval hari. (Permintaan owner sebagian.)
- **D-4 F4-12:** "generate FAQ dari aturan flow" = **manual kurasi**, bukan auto-generate.
- **C-6 F2-10:** round-robin hanya tiket portal/backoffice; tiket sistem-auto belum.

**🟡 ABU-ABU (perlu klarifikasi owner — lihat pertanyaan):** A-5/A-6/A-7 (prabayar: tarif non-MONTHLY, blok tunggakan, poin), B-4 (ON_TIME_PAYMENT setiap invoice?), B-9 (referral via admin?), D-6 (staf set tip sendiri?).

**Race-condition minor (🟡, risiko rendah krn 1 admin/low concurrency):** B-1 overspend poin, B-2 stok reward, C-2 toRoom lock. Fix umum: row lock / serializable bila nanti skala naik.

---

## RINGKASAN TEMUAN (diisi akhir)
