# KOST48 V5 — Changelog
**Versi:** 2026-06-13 — Audit V3 + 84 keputusan owner + restruktur docs domain-dossier. Entri < V5.11.0 di `archieve/CHANGELOG_PRE_V5110.md`.

<!-- KOST48_DOCS_SYNC_20260613_AUDIT_V3_DOSSIER -->
## 2026-06-15 — Pasca-Fase 5: hardening + sinkron docs (L-4, SINKRON-DOC, AUD-6, L-3)

Lanjutan tindak-lanjut audit setelah Fase 5 inti:
- **L-4 (go-live):** runbook `04_DEPLOY` mewajibkan `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifikasi).
- **SINKRON-DOC:** banner "🔄 SINKRON KODE (2026-06-15)" di §3 dossier 10/11/13/14/15/18 — menandai item ditandai open (🔴/🟠) yang SUDAH selesai di kode (F1-1R, F1-2, F1-8, F1-10, F2-5/I-02, F2-14) + anchor verifikasi.
- **AUD-6:** readiness period-close tambah gate `rent-recognition-due` — tutup periode diblokir bila ada `RentRecognitionSchedule` jatuh tempo (`periodStart ≤ akhir periode`) belum diakui → cegah recognition stranded. Read-only.
- **L-3:** `postRewardFulfillmentTx` klasifikasi per `LoyaltyRewardType` — RENT_DISCOUNT → DR 4000 (kontra-pendapatan sewa), METER_DISCOUNT → DR 4100 (kontra-pendapatan listrik), SERVICE_ADDON/PHYSICAL → DR 6300 (beban); fallback aman 6300. **UAT seimbang per tipe.** Dossier 19 disinkron.
- **L-5:** **Lighthouse SEO = 100/100** (terukur — LH 12.8.2, headless Chrome atas build `dist`, halaman home; 10 audit lulus). Target ≥90 terlampaui; dossier 17 M-01/F3-3 disinkron.
- **Gate:** `tsc` 0; `node --test` 47/47. Sisa deferred (keputusan sadar): L-2 (edge ~nol dampak), AUD-7 (race minor — defer-to-scale).

## 2026-06-15 — FASE 5 (tindak-lanjut audit menyeluruh): S-5 + F5-1..F5-8 — SELESAI

Audit menyeluruh SEMUA fase (`docs/AUDIT_MENYELURUH_SEMUA_FASE.md`): TIDAK ada 🔴 bug baru; temuan dominan = dossier drift (kode > docs). Keputusan owner D-21/D-22 + S-5 → 9 task tindak-lanjut, semua ter-commit. Tiga task finance LULUS runtime UAT (trial balance seimbang).

- **S-5 schema additive** (owner-approve, migration `20260615140000_s5_ac_usage_vendor`): `Room.acUsageHoursPerDay`, `Ticket.handledByVendor`/`vendorNote`.
- **F5-1 (AUD-4) FAQ operasional:** seed FAQ dari aturan/flow (Pembayaran/Booking/Perpanjangan/Checkout&Deposit/KTP/Keluhan&Poin); `seed()` idempoten per-pertanyaan.
- **F5-2 (AUD-2) tip staf self-service:** `PATCH /auth/me/tip-info` (STAFF) + kartu "Info Tip" di ProfilePage. Tetap tak dijurnal (P2P).
- **F5-3 (AUD-5) AC vendor + round-robin sistem:** tiket cuci AC tanpa assignee + `POST /tickets/:id/vendor` (penanda vendor luar, keluar KPI/round-robin); util bersama `pickRoundRobinStaffTx` dipakai semua tiket sistem (inspeksi/evict/reward/transfer) → round-robin saat staf≥2.
- **F5-4 (AUD-3) cuci AC HIBRID:** `ac-cleaning.helper` — interval hari + pemicu dini kWh (watt×jam/hari, env `AC_CLEAN_KWH_THRESHOLD`, default 200; default 400W/8 jam). Unit test 7/7. Form kamar dapat field AC (sebelumnya backend-only).
- **F5-5 (B-9) referral di portal/admin:** `CreateTenantDto.referredByCode` → `linkReferralTx` saat admin daftarkan tenant baru (idempotent + anti self-referral).
- **F5-6 (L-1) auto-rekonsiliasi jurnal:** sweeper `runAutoJournalReconciliation` (backfill jurnal warisan best-effort yang bolong + alert OWNER/ADMIN, sebelum auto-close; `POST /auto-ops/run/journal-reconciliation`). **UAT LULUS:** backfill 1 invoice, TB seimbang, idempoten.
- **F5-7 (AUD-1) utilitas kamar lama saat pindah:** `billOldRoomUtilityTx` — snapshot meter akhir kamar lama + invoice utilitas + jurnal SEBELUM `roomId` pindah (flat→skip; bertarif tanpa meter→409). **UAT LULUS:** listrik 10kWh×1500 + air 3m³×8000 = 39.000, jurnal SEIMBANG.
- **F5-8 prabayar (A-5/A-6/A-7):** A-6 blokir prabayar saat menunggak · A-7 poin RENEWAL saat prabayar (idempotent) · A-5 tarif diskon SMESTERLY(5,5×/6)/YEARLY(10×/12) via `effectiveMonthly` konsisten invoice+deferral+recognition. B-4 sudah berlaku (no-change). **UAT LULUS:** SMESTERLY effMonthly 1.375.000, total 8.250.000 (vs penuh 9.000.000), recognition Σ=total, poin +100, TB seimbang.
- **Gate semua task:** `tsc` 0; `node --test` 47/47; FE build + PWA verify (99 chunk); boot tanpa circular-dep. S-5 + D-21/D-22 tercatat di `03_KEPUTUSAN_OWNER`.

## 2026-06-15 — feat(F2-10 + F3-5): round-robin tiket + leaderboard staf (disiapkan, dorman saat 1 staf)

- **Ide owner:** siapkan round-robin & leaderboard meski staf masih 1; aktif otomatis saat staf ≥ 2. **Tanpa schema baru.**
- **F2-10 round-robin** (K-4): `TicketsService.pickStaffAssigneeTx` dipakai di `createTicketRecord` saat tiket belum ber-assignee — staf=0 → tanpa assignee; staf=1 → ke satu-satunya staf (dorman); **staf≥2 → round-robin berbasis beban** (staf dengan tiket aktif OPEN/IN_PROGRESS/DONE paling sedikit). Aktif otomatis begitu staf bertambah.
- **F3-5 leaderboard:** `StaffPerformanceService.getLeaderboard` (peringkat skor KPI desc, reuse `getAdminMonthly`) + `GET /admin/staff-performance/leaderboard` (OWNER/ADMIN). FE: kartu "🏆 Leaderboard Staff" di `AdminStaffPerformancePage` — **`active=false` saat staf <2** (tampil catatan, kartu rumus skor per staf tetap jalan); tabel peringkat saat ≥2.
- **Gate:** backend `tsc` 0; `node --test` 40/40; FE build + PWA verify (99 chunk).

## 2026-06-15 — feat(F4-13c + F4-13 referral): quest perbaikan sikap anonim + referral teman (S-4)

- **Schema additive S-4** (owner-approve, migration `20260615130000_f4_s4_peer_referral`): `PeerBehaviorReport` + enum `PeerReportStatus`; `TenantReferral` + enum `ReferralStatus`; `Tenant.referralCode @unique`.
- **F4-13c quest perbaikan sikap (ANONIM):** A lapor B → admin moderasi (`ACKNOWLEDGE` → notif B **tanpa identitas A** / `DISMISS`) → B `markImproved` → konfirmasi oleh **A (pelapor) ATAU admin** → B dapat poin **+40**. **PRIVASI dijaga:** `reporterTenantId` tak pernah diekspos ke reportee (`listAboutMe` select terbatas). `PeerReportService` + `PeerReportController` (tenant: create/made/about-me/improved/confirm; admin: list/moderate). FE: MyLoyaltyPage "Masukan untuk Anda" (+tombol "Sudah saya perbaiki") + LoyaltyAdminPage tabel moderasi (Validasi/Tolak/Konfirmasi).
- **F4-13 referral teman:** `Tenant.referralCode` (`GET /me/loyalty/referral-code`, auto-generate); teman memasukkan kode saat **booking publik** → `ReferralService.linkReferralTx` membuat `TenantReferral` PENDING; sweeper `AutoOps.runReferralRewards` → saat teman jadi **tenant aktif (promoted)**, referrer dapat **+150** → `REWARDED` (idempotent per referralId). FE: kode referral tampil di MyLoyaltyPage.
- **Poin default** (env-override): perbaikan sikap +40, referral +150 (reason ADJUSTMENT + sourceType PEER_IMPROVEMENT/REFERRAL).
- **Gate:** backend `tsc` 0; `node --test` 40/40; FE build + PWA verify; **UAT runtime LULUS** (peer: award B +40 + privasi + CONFIRMED; referral: link PENDING → teman aktif → REWARDED +150). S-4 tercatat di `03_KEPUTUSAN_OWNER`.

## 2026-06-15 — feat(F4-11 deep): prabayar/perpanjangan multi-bulan + unearned (PSAK 72) — SELESAI

- **`PrepayExtensionService.prepayExtension`** (`POST /stays/:id/prepay-extension`, OWNER/ADMIN): tenant membayar **N bulan ke depan dengan harga BULANAN** (terkunci D-16), **satu invoice PAID di muka** (keputusan owner D-18). Stay diperpanjang `plannedCheckOutDate += N bulan`.
- **Akuntansi PSAK 72:** jurnal issuance (DR 1100 / CR 4000) + payment (DR kas / CR 1100) + **deferral seluruh prabayar (DR 4000 / CR 2200 Unearned)**; lalu sweeper `recognizeDue` (F4-1) mengakui per bulan (DR 2200 / CR 4000). `postRentDeferralTx` kini punya `sourceKey` (deferral per-invoice, tak bentrok); `RentRecognitionService.scheduleExtension` membuat N baris jadwal dengan `periodIndex` MELANJUTKAN sequence stay.
- **Finance gate LULUS:** `tsc` 0; `node --test` 40/40; **UAT runtime (prabayar 4 bln @Rp1jt = Rp4jt):** kas +4jt, AR net 0, revenue 4000 net 0 (ditangguhkan), unearned 2200 = −4jt, stay diperpanjang ke 2026-10-15; recognize bulan-1 → 4000=−1jt/2200=−3jt; **trial balance SEIMBANG tiap langkah**; residu 0.

## 2026-06-15 — feat(backlog S-3): F4-11/12/13a/13b/14/15 — implementasi backlog ide owner

- **Schema additive S-3** (owner-approve, migration `20260615120000_f4_backlog_s3`): Room (hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays), LoyaltyReward (fulfillmentTaskCategory/Title), User (tipGopay/Ovo/Dana/Bank), RenewRequest (prepaidMonths/isEarly/tenantReview/tenantReviewAt). **F4-13c (quest sikap anonim) DITUNDA.**
- **F4-12 FAQ/manual** (tanpa schema): `MyManualPage` (`/portal/manual`) menampilkan FAQ publik per kategori (Accordion ringkas) — manual book aturan kos untuk tenant. Nav tenant "Panduan & Aturan".
- **F4-15 cuci AC:** sweeper `AutoOps.runAcCleaningSchedule` — kamar ber-AC yang lewat `acCleanIntervalDays` (default 90) sejak `acLastCleanedAt` → tiket `AC_CLEANING` (dedupe) + assign STAFF. Endpoint manual `POST /auto-ops/run/ac-cleaning`. Tiket AC ditutup → reset `acLastCleanedAt`. Biaya cuci dicatat Expense (flow normal, ditanggung bisnis). Admin set AC via Room DTO.
- **F4-13b reward → tugas staf:** reward ber-`fulfillmentTaskCategory` → saat redemption APPROVE/FULFILLED, auto-create tiket tugas staf (mis. bersihkan kamar mandi luar/area umum/dapur umum) selain jurnal reward M4. Admin form + UAT runtime LULUS (ticket dibuat, redemption FULFILLED).
- **F4-14 tip staf P2P:** `User.tip*` (GoPay/OVO/DANA/Bank) settable via user DTO/service; query tiket mengekspos tip assignee; tenant melihat link tip di tiket DONE/CLOSED (`MyTicketsPage`). **Tip langsung tenant→staf, TIDAK dijurnal/direkap** di buku kos (P2P).
- **F4-13a review-renewal:** `CreateRenewRequestDto.tenantReview` → disimpan + award poin (skor VALIDATED_REPORT +30, idempotent `RENEWAL_REVIEW:id`).
- **F4-11 (data capture):** `RenewRequest.prepaidMonths/isEarly` disimpan saat create (early request enabled). **Alur multi-bulan prabayar penuh** (invoice N bulan + unearned via F4-1) = lanjutan finance terpisah.
- **Gate:** backend `tsc` 0; `node --test` 40/40; FE build + PWA verify (99 chunk). S-3 (03_KEPUTUSAN_OWNER) tercatat.

## 2026-06-15 — feat(F4-9): Gamifikasi & Loyalitas tenant — SELESAI (schema S-2, dossier 19)

- **Schema additive (S-2):** `LoyaltyPoint` (ledger append-only, unique sourceType+sourceId) + `LoyaltyReward` (katalog) + `Redemption` (penukaran, wajib approve, journalEntryId) + 3 enum (`LoyaltyPointReason`/`LoyaltyRewardType`/`RedemptionStatus`) + back-rel Tenant/JournalEntry. Migration `20260615100000_f4_9_loyalty`.
- **Poin (default dossier 19, env-override):** `LoyaltyService.award/earn/earnSafe` (idempotent per sourceType+sourceId), `balance`, `history`. **4 trigger earn:** RENEWAL +100 (renew COMPLETED), ON_TIME_PAYMENT +50 (invoice PAID & paidAt≤dueDate), VALIDATED_REPORT +30 (tiket PORTAL tenant → CLOSED, cek AuditLog source=PORTAL), ONBOARDING_QUEST +200 sekali (profil lengkap kecuali KTP). Semua best-effort di luar tx.
- **Redemption (M3/M4):** `RedemptionService` — katalog CRUD (OWNER) + `requestRedemption` (potong poin saat ajukan + kurangi stok + guard anti-overspend, atomik) + `decideRedemption` (REJECT→refund poin+kembalikan stok; APPROVE→FULFILLED + **jurnal reward DR 6300 Marketing / CR 2100 AP** untuk reward bernilai). Endpoint tenant `/me/loyalty(+/redemptions)`, admin `/loyalty/rewards|redemptions(+/decide)`.
- **Frontend:** `MyLoyaltyPage` (saldo + katalog + tukar + riwayat + penukaran saya) + `LoyaltyAdminPage` (kelola reward modal CRUD OWNER + approve/reject penukaran OWNER/ADMIN) + nav `🎁 Poin & Reward`/`Loyalitas & Reward` (tenant/owner/admin) + route `/portal/loyalty` & `/loyalty`.
- **Gate LULUS:** `tsc` 0; `node --test` **39/39** (+`loyalty.constants.test.js`); FE build + PWA verify (98 chunk). **UAT runtime (DB 5433):** award idempotent (dup di-skip, saldo 100+50=150, redeem −30→120); redemption request −500/stok−, reject +500/stok+, approve→FULFILLED + jurnal DR6300/CR2100=200000 **trial balance seimbang**; ONBOARDING_QUEST parsial=0/lengkap=+200/idempotent. Semua residu UAT dibersihkan.
- **Ide perluasan owner → backlog F4-13** (review-renewal/referral/quest-sikap) **& F4-14** (tip staf P2P, tidak dijurnal).

## 2026-06-15 — feat(F4-8): Pindah kamar resmi (E4) — SELESAI, schema S-2 + 5 keputusan desain owner

- **Keputusan desain owner (D-20, 2026-06-15):** Stay **SAMA** (roomId diperbarui, tak putus kontrak); **deposit ikut apa adanya**; **harga dikunci** (rent-loyalty D-16) **kecuali override OWNER** (D-17, ADMIN dilarang ubah harga); **meter kamar baru di-snapshot**; kamar lama→MAINTENANCE+inspeksi, kamar baru→OCCUPIED.
- **Schema additive (S-2):** `RoomTransfer` (stayId, fromRoomId, toRoomId, transferDate, reason, rentBefore/AfterRupiah, note, createdById) + back-rel Stay/Room(from/to)/User. Migration `20260615110000_f4_8_room_transfer` (zero-risk).
- **`RoomTransferService.transferRoom`** (tx, FOR UPDATE): validasi stay ACTIVE+promoted & kamar tujuan AVAILABLE tanpa penghuni aktif; update stay (roomId + tarif kamar baru + harga override OWNER-only); snapshot meter awal kamar baru (opsional); kamar baru→OCCUPIED; kamar lama→MAINTENANCE + tiket `CHECKOUT_INSPECTION` (dedupe); catat `RoomTransfer`; audit `ROOM_TRANSFER`; notif tenant best-effort di luar tx. Endpoint `POST /stays/:id/transfer-room` (OWNER/ADMIN).
- **UAT runtime LULUS (DB 5433):** transfer tanpa override → stay pindah, harga tetap, tarif kamar baru, kamar lama MAINTENANCE+tiket inspeksi, 2 baris meter baseline, RoomTransfer audit benar; OWNER override harga → rent diperbarui + kamar baru OCCUPIED; **ADMIN override harga → 403** (D-17). tsc 0; node --test 39/39. State UAT direstore penuh.

## 2026-06-15 — feat(F4-1): Unearned Revenue PSAK 72 (F-15) — SELESAI, schema S-2 approved

- **Kebijakan (keputusan owner):** sewa yang mencakup **>1 bulan** diakui pendapatan **bertahap** (straight-line per bulan), bukan sekaligus saat check-in. **Invoice & uang tetap 1 penuh di muka** (1 invoice di bulan awal); yang dibagi hanya pengakuan pendapatan via akun **2200 Unearned Revenue** (sudah ada). Sekarang berlaku untuk **SMESTERLY (6) & YEARLY (12)**; mekanisme berbasis "jumlah bulan N" sehingga reusable oleh prabayar fleksibel (D-18/F4-11).
- **Schema additive (S-2):** `RentRecognitionSchedule` (stayId, periodIndex, periodStart/End, scheduledAmountRupiah, recognizedAt, journalEntryId; unique stayId+periodIndex) + back-rel Stay/JournalEntry. Migration `20260615090000_f4_1_rent_recognition` (zero-risk).
- **Helper murni** `rent-recognition.helper.ts`: `monthsForPricingTerm`, `splitRentByMonths` (sisa pembulatan ke bulan terakhir → Σ tepat), `buildRentRecognitionSchedule` (periode bulanan clamp akhir bulan) + unit test.
- **Posting BARU (hormati DO-NOT-TOUCH, tak ubah fungsi lama):** `postRentDeferralTx` (DR 4000 / CR 2200) + `postRentRecognitionTx` (DR 2200 / CR 4000), sourceType `ADJUSTMENT`, sourceId `RENT_DEFERRAL:stayId` / `RENT_RECOGNITION:stayId:idx` (idempotent per source).
- **`RentRecognitionService`** (decoupled dari flow check-in): (1) ensure — untuk stay long-lease promoted yang invoice sewanya sudah POSTED & belum berjadwal → jurnal deferral seluruh sewa ke 2200 + buat jadwal N bulan (atomik; rollback bila periode tutup); (2) recognize — akui baris yang periodenya sudah mulai (DR 2200/CR 4000). Sweeper `AutoOps.runRentRecognition` (env `RENT_RECOGNITION_ENABLED`) + endpoint manual `POST /auto-ops/run/rent-recognition`.
- **Finance gate LULUS:** `tsc` 0; `node --test` **37/37** (+`rent-recognition.helper.test.js`); **UAT runtime (DB 5433, skenario SMESTERLY 6.000.000):** issuance → 4000=6jt/AR=6jt; ensure → deferral pindah 6jt ke 2200 (4000 net 0), jadwal 6 baris Σ=6jt; recognize → bulan-1 diakui 1jt (4000=1jt, 2200=5jt sisa); **trial balance seimbang tiap langkah**; idempotent (re-run 0, total tetap 3 jurnal); residu 0.

## 2026-06-15 — feat(F4-2): PWA Web Push (4 kelompok event J-d) — SELESAI, schema S-2 approved

- **Schema additive (owner-approve S-2):** `PushSubscription` (endpoint unik/device) + enum `PushDeliveryStatus` + `AppNotification.pushStatus/pushAttempts/pushedAt` (**outbox in-place**, bukan tabel terpisah) + `User.pushSubscriptions`. Migration `20260614220000_f4_2_push` (zero-risk). Dependency baru `web-push@3.6.7` (+@types) — diizinkan owner.
- **Backend `PushModule`:** `GET /push/vapid-public-key`, `POST /push/subscribe` (upsert by endpoint), `POST /push/unsubscribe` (deactivate). `PushService` baca VAPID dari env (`VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT`); **nonaktif otomatis bila env kosong** (notif in-app tetap jalan). `AppNotification.create` menandai `pushStatus=PENDING` → SEMUA notif in-app diantre push (cakupan ≥ 4 kelompok J-d).
- **Sweeper `AutoOps.runPushDispatch`** (akhir `runAll`, best-effort) + endpoint manual `POST /auto-ops/run/push-dispatch`: kirim PENDING ke device aktif via `web-push`. Tanpa device → `SENT` (no-op); endpoint mati (404/410) → subscription dinonaktifkan; gagal sementara → retry s/d 3× lalu `FAILED`.
- **Frontend:** service worker (`public/sw.js`) handler `push` + `notificationclick` (buka `linkTo`); hook `usePushNotifications` (izin browser, `PushManager.subscribe`, kirim ke API); kartu opt-in `PushToggle` di `NotificationsPage` (Aktifkan/Matikan, status, blokir-browser handling). Guard `verify-pwa.mjs` diperbarui: kini WAJIB ada handler push/notificationclick; `sync`/`periodicsync` tetap dilarang.
- **UAT backend runtime (offline, DB 5433):** VAPID aktif; no-device→SENT+pushedAt; subscribe persist (active, user benar); dead-endpoint PENDING/1→PENDING/2→FAILED/3 (retry cap); unsubscribe→deactivate; after-unsub→SENT. Residu UAT dibersihkan. backend `tsc` 0; frontend build + **PWA verify LULUS** (95 chunk).
- **Deploy:** set VAPID env di prod (lihat `04_DEPLOY §0`); push ikut sweeper auto-ops (cron di shared hosting); butuh HTTPS untuk service worker.

## 2026-06-14 — fix(F4-10): standarisasi pembulatan Rupiah (F-31) — helper terpusat

- **Masalah (F-31):** pembulatan Rupiah tersebar (`Math.round` mentah di util/DP/depresiasi/revenue-per-kamar + helper `rupiah` duplikat di modul akuntansi) → tak ada satu definisi pembulatan, rawan drift pecahan yang me-masking selisih trial balance.
- **Helper terpusat baru** `backend/src/common/business/money.helper.ts`: `roundRupiah(v)` (bilangan bulat terdekat; tie tepat 0,5 dibulatkan MENJAUHI nol agar debit/kredit berlawanan tanda saling meniadakan simetris, hindari asimetri `Math.round` pada negatif; NaN/±∞→0) + `rupiahAmount(v)` (clamp ≥0 untuk debit/kredit/line amount).
- **Wiring 8 call-site Rupiah:** posting helper `rupiah` (`accounting-posting`, di LUAR rentang DO-NOT-TOUCH 128-849/1110-1216) · util line amount (`stays-service-helpers`, `stays.helpers`) · DP 30% (`renew-requests`, `tenant-bookings` ×2, `public-bookings` raw-SQL) · depresiasi bulanan (`assets` ×2 + helper lokal) · revenue-per-kamar (`finance`, `reports`).
- **DO-NOT-TOUCH dihormati:** `accounting-period-close.service.ts` (tutup buku, paling matang) SENGAJA tidak disentuh; helper lokalnya dibiarkan. Rasio/persen (bukan Rupiah) tidak diubah.
- **Preservasi nilai:** untuk input non-negatif (seluruh kasus runtime) `roundRupiah` ≡ `Math.round` → nominal terpersist tidak berubah; dibuktikan unit test ekuivalensi.
- **Gate keuangan LULUS:** `tsc --noEmit` 0; `node --test` **32/32** (26 lama + 6 baru `money.helper.test.js`); runtime UAT (DB 5433): trial balance **seimbang** (2.123.996.855 = 2.123.996.855), akun deposit 2000 saldo **kredit** (−8.000.000, bukan debit).

## 2026-06-14 — ops(F4-7): pruning notifikasi >90 hari (N-04) — retensi AppNotification

- **Masalah (N-04):** `AppNotification` tak punya retensi → tumbuh tanpa batas, terutama untuk broadcast ALL ke banyak penerima.
- **Solusi:** `AppNotificationService.pruneOlderThan(retentionDays=90, batchLimit=5000)` menghapus notifikasi `createdAt < now − retensi`, dibatasi per-batch (pilih id via index `createdAt` lalu `deleteMany`) agar satu eksekusi sweeper tidak menghapus terlalu banyak sekaligus.
- **Sweeper:** `AutoOps.runNotificationPruning` dipanggil di akhir `runAll` (independen dari Stay/Room, best-effort never-throw). Retensi via env `NOTIFICATION_RETENTION_DAYS` (default 90); dapat dimatikan via `NOTIFICATION_PRUNING_ENABLED=false`. Endpoint manual `POST /auto-ops/run/notification-pruning` (OWNER/ADMIN).
- **Verifikasi — UAT runtime LULUS (DB UAT 5433, transaksi ROLLBACK tanpa residu):** sisip 2 notif (umur 100 hari & 10 hari) → prune menghapus **tepat 1** (yang 100 hari), notif 10 hari TETAP. backend `tsc` 0.

- **Masalah:** rantai migration lama tak lengkap (tabel `RenewRequest` dll. ditambah lewat `db push` tanpa create-migration) → `migrate deploy`/`migrate diff --from-migrations` GAGAL replay dari kosong.
- **Squash baseline:** 13 migration lama dipindah ke `prisma/_archive_migrations_pre_baseline/`; dibuat satu **`prisma/migrations/00000000000000_baseline/migration.sql`** = SELURUH schema saat ini (41 tabel, 54 enum, 192 index, 90 FK) via `migrate diff --from-empty --to-schema`. Migration F3 additive ikut terserap ke baseline.
- **Divalidasi:** (a) `migrate diff --from-migrations(baseline) --to-schema` = **empty** (baseline == schema); (b) `migrate deploy` ke DB kosong baru = **42 tabel terbuat, sukses**; (c) UAT 5433 ledger `_prisma_migrations` di-reset ke baseline-applied → `migrate status` = **"up to date"**.
- **Deploy prod kini 2 opsi setara:** (1) `prisma migrate deploy` (baseline) **atau** (2) `prisma db push` — **keduanya WAJIB diikuti `sql/bootstrap.sql`** (trigger, CHECK constraint, advisory lock, index tambahan, carve-out guard F3-16 — TIDAK ada di schema Prisma). `prisma.config.ts` dukung `shadowDatabaseUrl` (env) untuk `migrate dev` ke depan.

## 2026-06-14 — chore(migration): migration resmi F3 additive + dukungan shadow DB

- **Migration baru** `prisma/migrations/20260614210000_f3_admin_safety/migration.sql` — additive untuk F3-14/15/17/19: enum `BelongingsStatus`; `Tenant.ktp*` (8 kolom) + FK `Tenant_ktpVerifiedById_fkey`; `Stay.fled*`+`belongings*` (6 kolom) + FK `Stay_fledMarkedById_fkey`; `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt`; 3 index. Semua nullable/ber-default → zero-risk.
- **Divalidasi vs DB UAT live:** seluruh 18 kolom + enum + 3 index + 2 FK ADA dengan nama/tipe/default PERSIS sesuai migration → file akurat & lengkap.
- **`prisma.config.ts`:** tambah dukungan `shadowDatabaseUrl` (opsional via env `SHADOW_DATABASE_URL`) untuk operasi `migrate diff`/`migrate dev`.
- **⚠️ Temuan deploy:** rantai migration TIDAK lengkap (mis. tabel `RenewRequest` tak punya create-migration) karena proyek selama ini deploy via **`db push` + `sql/bootstrap.sql`**, bukan `migrate deploy`. Jadi `migrate deploy` dari kosong TIDAK bisa replay bersih. Migration F3 ini akurat sebagai dokumentasi + bisa diterapkan manual pada DB hasil `db push`. **Path deploy prod tetap:** `prisma db push` (schema = sumber kebenaran) + `bootstrap.sql` (termasuk trigger carve-out F3-16). Squash baseline penuh = keputusan terpisah bila ingin `migrate deploy` end-to-end.

## 2026-06-14 — feat(F3-14/F3-16): forced-checkout admin (kabur/overstay) + deposit→AR (SELESAI, UAT LULUS)

- **Gabung F3-14+F3-16 (keputusan owner):** satu endpoint `POST /stays/:id/forced-checkout` (OWNER) beralasan `OVERSTAY_NUNGGAK`/`TENANT_KABUR`.
- **Akuntansi (disetujui owner):** deposit menutup tunggakan → jurnal **DR 2000 / CR 1100** (`postForcedCheckoutDepositSettlementTx`, BEDA dari settlement damages yg kredit 4400); sisa tunggakan **TETAP jadi piutang AR 1100** (bukan write-off); kelebihan deposit di-refund kas. Invoice tertutup ditandai PAID/PARTIAL via pembayaran NON-KAS (method OTHER) agar aging konsisten.
- **Guard carve-out (disetujui owner):** trigger `guard_stay_deposit_processing` (sql/bootstrap.sql) menambah carve-out via GUC sesi-transaksi `app.allow_deposit_with_open_invoices` — settlement deposit boleh jalan saat ada invoice terbuka HANYA dalam forced-checkout; flow normal `processDeposit` tetap terproteksi penuh.
- **Lifecycle:** stay COMPLETED + `fled*` (jika kabur) + `belongingsDeadline` (F3-15) + kamar MAINTENANCE + tiket inspeksi; status deposit patuh `stay_deposit_status_consistency_chk`; ledger via `recordDepositSettlementTx`; KTP PDP cleanup; audit `FORCED_CHECKOUT`.
- **Robustness:** jurnal settlement diposting DULU; bila penerimaan deposit tak terjurnal (F-24 skip), forced-checkout DITOLAK (tx rollback) agar tak ada state setengah-jadi.
- **Verifikasi — UAT runtime LULUS (DB UAT 5433, backend live, stay 8):** outstanding 1.234.200 vs deposit 500.000 → applied 500.000, **shortfall 734.200 TETAP jadi AR**. **12/12 assertions PASS:** trial balance tetap seimbang (selisih 0); AR 1100 turun 500.000; deposit 2000 turun 500.000 (debit); invoice → PARTIAL/paid 500.000; stay COMPLETED + deposit FORFEITED (deduction 500.000); offset journal `FORCED_CHECKOUT_DEPOSIT:8` POSTED; deposit ledger HELD→FORFEIT net 0. backend `tsc` 0; unit 26/26.

## 2026-06-14 — ui(F3-9): hierarki laporan — badge Formal/Estimasi

- **Badge tier (F-11):** `ReportSection` kini menandai setiap kartu laporan operasional dengan badge **≈ Estimasi** (default) — angka dihitung mentah dari data transaksi (invoice/pembayaran/stay/beban), bisa beda tipis dari buku besar. Badge **✓ Formal** disediakan untuk angka berbasis jurnal.
- **Banner hierarki:** ReportsPage menambah catatan tetap yang menjelaskan tab operasional = Estimasi, dan mengarahkan ke tab **"Laporan Formal"** (sudah ada: `UnlockedFormalReports` + readiness) untuk angka audit-grade berbasis jurnal/neraca saldo.
- **Filter unmapped (F-12):** kesiapan formal & hitung unmapped tetap dikelola gate `fetchFormalRatiosReadiness`/`LockedFormalRatios` yang sudah ada (laporan formal hanya terbuka saat data ter-map) — konsisten dengan readiness auto-close.
- **Verifikasi:** `frontend npm run build` LULUS (95 chunk, PWA ok); tsc 0. Murni presentasi, tanpa ubah angka.

## 2026-06-14 — feat(F3-17): upload + verifikasi KTP (terproteksi, gate aktivasi, hapus PDP)

- **Schema (approved):** `Tenant.ktpImage*` (url/fileKey/originalFilename/mimeType/fileSizeBytes) + `ktpVerifiedAt/ktpVerifiedById` + `ktpDeletedAt`.
- **Upload:** `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, multer + validasi MIME signature, simpan di `uploads/ktp-images` terpisah dari foto kamar/tiket). Upload baru me-reset verifikasi & hapus berkas lama.
- **Verifikasi:** `POST /tenants/:id/ktp/verify` (OWNER) → set `ktpVerifiedAt/ById`.
- **Penyajian terproteksi:** `GET /tenants/:id/ktp/image` **OWNER/ADMIN saja** (no-store, nosniff, Vary Authorization) — STAFF/TENANT tak bisa akses data PDP.
- **Gate aktivasi (opsional):** `stays.create` menolak check-in bila `KTP_ACTIVATION_GATE_ENABLED=true` dan KTP tenant belum terverifikasi. **Default OFF** agar alur tak terganggu sampai onboarding KTP siap; owner aktifkan saat siap.
- **Hapus PDP:** otomatis saat checkout final (`stays.complete`) bila tenant tak punya stay aktif lain (hapus file + kosongkan field + set `ktpDeletedAt`, best-effort di luar tx); plus manual `DELETE /tenants/:id/ktp` (OWNER).
- **Verifikasi:** backend `tsc` 0; unit test 26/26 hijau.

## 2026-06-14 — feat(F3-15): lacak barang ditinggal 30 hari → ABANDONED

- **Schema (approved):** `Stay.belongingsStatus` (enum `BelongingsStatus PENDING/CLAIMED/ABANDONED`, default PENDING), `belongingsDeadline`, `belongingsResolvedAt` + index.
- **Set deadline:** checkout final (`stays.complete`) dan forced-checkout overstay (`auto-ops.forceCheckoutOverstay`) men-set `belongingsDeadline = checkout + 30 hari`.
- **Sweeper:** `runBelongingsAbandonment` (di `runAll` + endpoint `POST /auto-ops/run/belongings-abandonment`) — `belongingsDeadline < hari ini (WIB)` & status PENDING → set `ABANDONED` + `belongingsResolvedAt` + notif OWNER/ADMIN (dedupe `createOnce`). Tindakan fisik tetap manual.
- **Admin action:** `POST /stays/:id/belongings` (OWNER/ADMIN) tandai `CLAIMED` (tenant ambil) atau `ABANDONED` manual + catatan.
- **Verifikasi:** backend `tsc` 0; unit test 26/26 hijau. Default PENDING → baris lama tak terdampak.

## 2026-06-14 — feat(F3-19): SLA tiket — dueAt per kategori, resolved-time adil, eskalasi

- **Schema (approved):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt` + index `dueAt`.
- **SLA per kategori (`ticket-sla.ts`):** `dueAt = assignedAt + window` — **24 jam** EMERGENCY/SECURITY/KUNCI · **3 hari** KERUSAKAN/MAINTENANCE/KEBERSIHAN/CHECKOUT_INSPECTION · **7 hari** INVENTARIS/AUDIT/PEMERIKSAAN/BARANG_PINDAH (+default 7 hari). Di-set saat penugasan PERTAMA (`assign`/`start`); re-assign tak me-reset jam.
- **KPI adil (K-1):** waktu penyelesaian dihitung dari `assignedAt` (bukan `createdAt`) → idle antrean tak menghukum staf. Staff summary kini ekspos `slaOnTime`, `slaBreached`, `avgResolutionHours`, dan `ticketsDoneByCategory` (breakdown K-3). Formula skor TIDAK diubah (hanya diekspos).
- **Eskalasi (K-2):** sweeper `runTicketSlaEscalation` (di `runAll` + endpoint `POST /auto-ops/run/ticket-sla`) — tiket lewat `dueAt` & belum selesai: L0→1 notif ADMIN+OWNER; L1→2 (setelah grace 1 hari) notif OWNER. Dedupe per (tiket, level) via `escalationLevel` + `createOnce`.
- **Verifikasi:** backend `tsc` 0; unit test 26/26 hijau. (Tampilan dashboard metrik baru = polish frontend lanjutan.)

## 2026-06-14 — ops(F3-13): hardening checkout/notif (B-06/B-07/B-11/B-12/B-14/N-02) SELESAI

- **B-07 (D-03):** forced-checkout overstay tak lagi diblokir tagihan **DRAFT** (belum terbit, tanpa jurnal). `forceCheckoutOverstay` mengecualikan DRAFT dari blocker pra-tx & re-cek in-tx, lalu membatalkan DRAFT yang tersisa di dalam tx (aman, tanpa reversal). Sebelumnya 1 DRAFT terlupakan = overstay tak pernah auto-checkout + alert merah harian.
- **B-12:** `stays.update` menolak `plannedCheckOutDate` di masa lalu (WIB) — mencegah admin tak sengaja menjadikan stay target overstay/forced-checkout instan; keluar lebih awal harus lewat flow checkout.
- **B-14:** reminder kontrak (`runContractEndReminders`) pakai **window** (`daysLeft <= threshold`) bukan exact-match → bila sweeper mati di hari-H gelombang, reminder tak hilang; gelombang yang terlewati tetap terkirim sekali. Dedupe per (stay, gelombang) via judul stabil `H-{wave}`; fallback admin tenant-tanpa-portal ikut dedupe per gelombang (bukan harian).
- **N-02:** notifikasi pengumuman ditahan bila `startsAt` masih di masa depan (konten belum tayang) — hilangkan notif instan yang menunjuk pengumuman yang belum bisa dibuka. (Pengiriman tepat di `startsAt` butuh sweeper terjadwal = peningkatan lanjutan.)
- **B-11:** promosi snapshot meter (listrik/air) yang DIBUANG karena sudah ada reading di tanggal sama (mis. rebooking sehari) kini **mencatat warning** bila nilainya berbeda — tak lagi hilang diam-diam; admin diingatkan cek tagihan utilitas awal. (Tanpa ubah perilaku dedupe & tanpa ubah bentuk response.)
- **B-06:** diverifikasi **sudah teratasi** oleh pemisahan mode `forfeitDownPayment` (A18/G2=A): caller non-forfeit (noon-release) tak lagi menulis "DP hangus", caller forfeit (H+1) menulis dengan benar. Tanpa kode baru.
- **Verifikasi:** backend `tsc` 0; unit test 26/26 hijau (B-07 hanya menyentuh DRAFT = tanpa dampak jurnal; B-11/B-14/N-02 notif/log-only).

## 2026-06-14 — refactor(F3-11): lead source + katalog foto marketing ke config

- **M-08 lead source:** sudah lengkap di kode — check-in wizard admin punya dropdown `bookingSource` 10 kanal (Google Maps/Walk-in/Referral/Instagram/TikTok/WhatsApp/Facebook/Website/OTA/Lainnya), backend `stays` menyimpan `bookingSource`+`bookingSourceDetail`, query stay bisa filter per kanal → CAC terukur. Booking publik tetap `WEBSITE` (benar — memang dari website).
- **M-04 foto config:** ~76 nama berkas foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (`ROOM_MARKETING_IMAGE_FILES`, `GENERIC_ROOM_MARKETING_IMAGES`, `ROOM_IMAGE_BASE_PATH`). Logika resolve tak berubah; daftar foto kini dirawat di config, bukan di tengah service.
- **Verifikasi:** backend build + `tsc` 0. Tanpa perubahan perilaku (fallback foto identik).

## 2026-06-14 — ops(F3-10): higiene jurnal — idempoten anti-race P2002 di posting

- **Race P2002 (utama):** `accounting-posting.service` membungkus 7 entrypoint posting ber-transaksi-sendiri (invoice issued/payment, expense, wifi-sale, deposit received/settlement, invoice-cancel-reversal) dengan `runIdempotentPosting`. Bila dua proses paralel memposting source yang sama, `JournalEntry.entryNumber` `@unique` memicu P2002 pada create kedua; karena error Postgres meng-abort transaksi (tak bisa di-catch lalu re-query di dalam tx yang sama), penanganan diletakkan di LUAR transaksi → duplikat diperlakukan sebagai **sudah-terposting** (skip benign), bukan error yang menggagalkan operasi bisnis.
- **entryNumber suffix VOID:** _tidak berlaku pada kode saat ini_ — tidak ada jalur `journalEntry` → status `VOID` (reversal selalu membuat entry `ADJUSTMENT` baru, `entryNumber` kanonik tak pernah dibebaskan). Akan relevan bila kelak ada flow void/reopen entry.
- **forfeit entryDate:** `postDownPaymentForfeitTx` diposting oleh sweeper PADA saat kejadian (gagal pelunasan H+1), jadi `entryDate = new Date()` sudah = tanggal kejadian; dibiarkan.
- **Verifikasi:** backend build + `tsc` 0; unit test 26/26 hijau (fungsi murni finance tanpa regresi).

## 2026-06-14 — audit-fix(Fase 1/2): checklist dibuktikan ulang terhadap kode

- **Renewal:** menutup celah kritis approval sebelum lunas. DP PAID kini hanya mengamankan prioritas; admin menerbitkan invoice pelunasan setelah catat meter; stay baru diperpanjang setelah invoice pelunasan PAID tepat waktu. Ditambah `RenewRequest.settlementInvoiceId`, gate payment deadline, pembatalan+reversal invoice saat reject sebelum DP, UI tenant/admin lengkap, dan direct-renew bypass dimatikan.
- **Cashflow:** classifier menyimpan gross inflow/outflow terpisah per sumber sehingga transaksi dua arah tidak saling menutup.
- **Refund:** hanya submission valid dianggap sudah transfer; bukti transfer balik wajib sebelum status COMPLETED.
- **Ticket number:** generator memakai PostgreSQL transaction advisory lock dan seluruh caller berjalan dalam transaksi.
- **Verifikasi terbaru:** backend build lulus; frontend production build + PWA verification lulus (94 chunks); unit test **26/26 lulus**, termasuk regression renewal, deadline payment, refund proof, gross cashflow, dan ticket-number concurrency.

## 2026-06-14 — ui(F3-12): paket chart — palet Okabe-Ito, count risiko n<5, kontras donut, filter publik

- **V-5:** palet Okabe-Ito colorblind-safe terpusat (`frontend/src/components/charts/chartPalette.ts`) dipakai `SmartChartPanel`, `HorizontalBarChart`, `DonutGauge` (warna default), dan `PaymentReviewPage` (semantik danger/warning/success).
- **V-2:** donut "Level Risiko" di review pembayaran berubah jadi tampilan hitungan saat sampel kecil (n<5) — 1 bukti high-risk tak lagi terbaca sebagai lingkaran 100% merah ("krisis").
- **V-6:** kontras teks tengah `DonutGauge` via token `--text-main/--text-muted` (terbaca di mobile/dark mode).
- **UD-07:** filter katalog publik "Semua" → "Semua Kamar" + hint "termasuk kamar terisi & sedang dicek".
- **V-3 & UD-04** sudah ada sebelumnya (empty-state `SmartChartPanel`; all-zero `OwnerDashboard` Audit U-10). **V-7** (kurangi seri Laba) ditunda — keputusan UX owner (seri Laba Bersih masih berguna, bukan murni redundan).
- **Verifikasi:** `frontend npm run build` LULUS (95 chunk, PWA verification ok). Terisolasi dari WIP renewal agen lain.

## 2026-06-14 — feat(F3-1): coverage notifikasi operasional (assign, room-ready, K-6/K-8)

- **Ticket-assign → assignee:** `tickets.service.assign()` mengirim notif ke penerima tugas (best-effort, di luar audit) hanya saat assignee benar-benar berubah; self-assign di-skip.
- **K-6/K-8 BARANG_PINDAH:** notif tiket pindah barang yang ditutup kini menuju **staf assignee** (sebelumnya keliru ke `actor.id` = admin penutup) dan dipindah ke LUAR transaksi (best-effort).
- **Room-ready:** penutupan tiket `CHECKOUT_INSPECTION` yang membuat kamar `AVAILABLE` kini memberi tahu OWNER/ADMIN (dedupe `createOnce`, entity `RoomReady`).
- **Wifi-order:** dikonfirmasi tidak ada event in-app — pemesanan WiFi tenant lewat WhatsApp (`WifiOrderPage`), jadi tidak ada notif yang perlu dipasang.
- **Verifikasi:** perubahan terisolasi di `tickets.service.ts`, `tsc` 0 untuk file ini (build penuh tertunda karena WIP renewal agen lain di tree). Notif tetap best-effort never-throw.

## 2026-06-14 — ops(F1-11): verifikasi booking expiry 3 jam flat

- Kedua helper booking (`expireBookingTx` di `auto-ops.service.ts` dan `cancelCompetingUnpaidBookingsTx` di `payment-submissions.service.ts`) memakai konstanta `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`, default 3 jam. Nilai diverifikasi 2026-06-13.
- **Verifikasi:** `grep` konfirmasi kedua helper pakai konstanta sama; tidak ada kode baru.

## 2026-06-14 — F3-2/F3-20: inbox pembayaran dan prompt review

- Payment submission yang berhasil commit kini mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif, lengkap dengan tenant, nominal, invoice, kamar, dan deep-link antrean review.
- Tiket tenant ber-assignee STAFF kini mengirim ajakan review saat masuk DONE/CLOSED; pemanggilan ulang pada close aman karena dedupe.
- Menambahkan `AppNotificationService.createOnce()` sebagai primitive dedupe bersama. Notifikasi tetap best-effort dan berjalan setelah transaksi bisnis utama.
- **Verifikasi:** backend build lulus; unit test 20/20; UAT rollback real DB membuktikan 3/3 penerima payment dan 1/1 prompt ticket tanpa notifikasi ganda maupun residu data.

## 2026-06-14 — Fase 3 independen: visibilitas dan otomasi operasional

- Menambahkan SEO dasar guest page: metadata, OpenGraph/Twitter Card, canonical, JSON-LD, `robots.txt`, dan `sitemap.xml`. Implementasi lulus build; skor Lighthouse belum diukur karena konektor browser lokal gagal dijalankan.
- Menambahkan social proof publik dengan pembatasan privasi, agregat rating, ulasan visible terbaru, dan count penghuni aktif.
- Menambahkan laporan okupansi harian beserta kalender owner 12 bulan historis dan 3 bulan proyeksi.
- Menambahkan draft biaya rutin bulanan yang idempotent, tidak masuk laporan/jurnal sebelum dikonfirmasi, serta konfirmasi-posting atomik.
- Menambahkan auto depresiasi bulan sebelumnya sebelum accounting auto-close, termasuk safe-skip saat tidak ada aset eligible atau depresiasi sudah diposting.
- **Verifikasi:** migration Prisma deployed dan up to date; backend build lulus; 18/18 unit test lulus; frontend build dan PWA verification lulus; UAT read-only/rollback pada database lokal lulus.

## 2026-06-14 — feat(F2-18): gate verifikasi owner utk review tenant ≤2 (F2-18 SELESAI)

Model tenant-pengawas: review tenant rating **≤2 → `PENDING_VERIFICATION`** (tidak tampil & TIDAK dihitung KPI sampai owner verifikasi — `buildSummaryForStaff` hanya hitung `VISIBLE`), melindungi staf dari review buruk yang belum dicek. Rating >2 langsung `VISIBLE`.
- Owner: `GET /tenant/staff-reviews/pending-verification` + `POST /:id/verify {decision: APPROVE→VISIBLE | DISMISS→HIDDEN}` (OWNER-only, set `moderatedById`). Notif staf saat review jadi VISIBLE. Notif komplain admin diperbarui ("menunggu verifikasi").
- **UAT runtime:** rating-2 → PENDING_VERIFICATION; owner list memuatnya; ADMIN verify → 403; owner APPROVE → VISIBLE; re-verify → 409. `tsc` 0. → **F2-18 SELESAI** (close-guard kategori + workflow verifikasi; perluasan cakupan review fasilitas/admin = F3+).

## 2026-06-14 — test(F2-6): UAT cancel stay promoted → MAINTENANCE + tiket inspeksi (F2-6 SELESAI)

Verifikasi runtime F2-6 (kode sudah ada): cancel stay promoted (stay 1, room OCCUPIED) → stay `CANCELLED` + room `MAINTENANCE` + tiket `TIC-2026-CHK-1` (`CHECKOUT_INSPECTION`, OPEN) terbentuk + invoice ter-reversal → **trial-balance balanced**. Kamar bekas huni tak lagi nyangkut MAINTENANCE (gate room-ready terbuka lewat tutup tiket inspeksi). → **F2-6 SELESAI.**

## 2026-06-14 — ui(F2-11): paginasi 12 + skeleton katalog publik → F2-11 SELESAI

`PublicRoomsPage`: **W-03** paginasi **12 kamar/halaman** (kontrol ‹ Sebelumnya / nomor / Berikutnya ›; reset ke hal.1 saat filter/sort berubah) — sebelumnya seluruh hasil dirender sekaligus. **W-02** skeleton grid (`SkeletonBlock`) saat memuat (ganti grid kosong+spinner). Melengkapi V-1 (code-split, sebelumnya) + UD-05 sticky CTA detail (`room-detail-mobile-sticky`). `npm run build` LULUS (94 chunk, PWA verify ok). → **F2-11 SELESAI.**

## 2026-06-14 — refactor(F2-5): satukan generateTicketNumber (4 salinan → 1 util) → F2-5 SELESAI

`common/utils/ticket-number.util.ts` `generateTicketNumberTx(db)` (db = `Prisma.TransactionClient` atau `PrismaService`) menyatukan 4 salinan `generateTicketNumber` (tickets / inventory-items / room-items / staff-field-reports). 3 salinan identik (count + fallback tabrakan ke suffix waktu); `tickets.service` yang dulu TANPA fallback kini ikut terlindungi. Method privat duplikat dihapus. **UAT:** buat tiket backoffice → `TIC-2026-0003`. `tsc` 0. → **F2-5 (konsolidasi util X-03 + ghost-stock) SELESAI.**

## 2026-06-14 — fix(F2-14): staff-routines startOfLocalDate → WIB (F2-14 SELESAI)

`staff-routines.startOfLocalDate` (dipakai `today` & `parseDate`) kini menghitung tanggal kalender **WIB (UTC+7) sebagai UTC-midnight**, bebas timezone server (cPanel UTC) — sebelumnya `new Date(y,m,d)` local-time → due-date rutinitas bisa bergeser di server UTC. `getDate()/getDay()/formatDateKey` tetap membaca tanggal WIB pada server UTC maupun WIB (geseran 0–7 jam tak pernah lewat hari). `tsc` 0; `getToday` tanpa regresi (di server WIB hasil identik). → **F2-14 (dateOnly + staff-performance + staff-routines) SELESAI.**

## 2026-06-14 — docs(F2-1): sinkron dossier 11 dgn keputusan owner hibrida → F2-1 SELESAI

Reconcile dossier 11 dgn keputusan owner 2026-06-14: **FORFEITED = ditandai + notif admin; forced checkout & potong deposit MANUAL admin** (override sengaja R5 auto) — bukan bug. Status renewal dossier 11 → 🟢; state machine, sweeper hibrida, deadline-gate command (R3), prompt H-10 + fallback portal semua tercatat. **F2-1 (Renewal DP penuh, GAP #2) ditandai SELESAI** di checklist (semua sub-keputusan owner terpenuhi/terdokumentasi).

## 2026-06-14 — feat(F2-2/#3): prompt renewal H-10 + fallback admin tenant tanpa portal

`auto-ops.runContractEndReminders`: REMINDER_DAYS `[7,3,1,0]` → **`[10,7,3,1,0]`** (horizon +10) sehingga tenant promoted dapat **prompt keputusan perpanjangan mulai H-10**. **Fallback portal-less:** bila tenant tak punya akun portal aktif, kini tak di-skip diam-diam — `notifyAdminsTenantNoPortalContract` memberi tahu OWNER/ADMIN (dedupe harian) agar tenant dihubungi manual. Endpoint manual baru `POST /auto-ops/run/contract-reminders` (UAT/ops).
- **UAT runtime:** stay di H-10 → notif tenant "berakhir 10 hari lagi"; tenant non-portal → notif 3 admin "Tenant tanpa portal"; data uji dipulihkan. `tsc` 0. → **F2-2 SELESAI.**

## 2026-06-14 — feat(F2-1 R3): gate deadline renewal di command service

Tindak lanjut audit (deadline hanya digate sweeper): `renew-requests.service` kini menegakkan deadline di tingkat command (deterministik):
- **`confirmDownPayment`** → 409 bila WIB-today > `downPaymentDueDate` (hari-H lewat → prioritas hangus).
- **`approveRequest`** → 409 bila WIB-today > `settlementDueDate` (H+7 lewat → harus FORFEITED, bukan di-approve).
- Helper `wibStartOfToday()` (UTC-midnight tanggal WIB) utk banding `@db.Date`.
- **UAT:** confirm past-hari-H→409; confirm dalam-deadline→200 (DP_SECURED); approve past-H+7→409; data uji dipulihkan. `tsc` 0.

## 2026-06-14 — fix(F2-5): tutup ghost-stock RETURN_FROM_ROOM (lock + 409 di dua jalur)

Tindak lanjut temuan audit: `staff-field-reports.adminReview` membuat movement `RETURN_FROM_ROOM` tanpa validasi/lock qty kamar → bila RETURN > stok kamar, `syncRoomItemTx` menghapus RoomItem (qty≤0) sambil menambah stok gudang fiktif (ghost-stock).
- **`assertRoomItemQtyAvailableTx`** (lock `SELECT … FOR UPDATE` + `ConflictException` bila stok kamar < diminta) diekstrak ke `common/utils/room-booking.util.ts`.
- Dipakai **DI DALAM transaksi** oleh `inventory-movements.create` (sebelumnya private, kini util) **dan** `staff-field-reports.adminReview` (sebelumnya TIDAK ada cek → lubang ghost-stock kini tertutup). `validateMovement` pra-tx tetap, tapi guard otoritatif kini in-tx + ber-lock.
- **UAT runtime:** RETURN 999 unit dari kamar berstok 2 → **409** (`tsc` 0).
- Sisa F2-5: `generateTicketNumber` 4 salinan beda-signature belum disatukan.

## 2026-06-14 — Audit ulang checklist terhadap kode aktual

- Mengembalikan `F2-1`, `F2-2`, `F2-5`, `F2-6`, `F2-18`, `F2-11`, dan `F2-14` ke `[ ]` karena lingkup task belum lengkap atau verifikasinya belum selesai.
- Temuan kritis: jalur `staff-field-reports.adminReview` masih dapat RETURN melebihi qty kamar tanpa lock/409; `syncRoomItemTx` hanya menghapus RoomItem saat qty menjadi negatif/nol, sehingga ghost-stock belum tertutup.
- Renewal belum memenuhi R3/R5: deadline tidak digate di command service, FORFEITED belum forced checkout + potong deposit, dan prompt H-10/fallback tenant tanpa portal belum ada.
- `tickets.close` saat ini memberi STAFF akses seluruh kategori, bertentangan dengan dossier 15 yang membatasi STAFF ke `CHECKOUT_INSPECTION`.
- Verifikasi terbaru: backend build lulus dan unit test **13/13 hijau**. Frontend build ulang terhalang pembatasan akses filesystem esbuild pada environment audit; ini bukan bukti kegagalan TypeScript/aplikasi.

## 2026-06-14 — fix(F2-18): STAFF close dibatasi ke CHECKOUT_INSPECTION (invarian dossier 15)

Tindak lanjut temuan audit: setelah F2-18 mengizinkan STAFF menutup tiket, STAFF sempat bisa menutup **semua kategori**. `tickets.service.close()` kini menolak STAFF untuk kategori ≠ `CHECKOUT_INSPECTION` (`ForbiddenException`) sesuai invarian dossier 15; OWNER/ADMIN tetap bebas. Guard keselamatan room-ready tidak berubah.
- **UAT runtime:** STAFF close #1 (non-inspeksi) → 403; STAFF close #13 (CHECKOUT_INSPECTION) → 409 (guard kategori lolos, status OPEN≠DONE); OWNER close #1 → 409 (tak dibatasi). `tsc` 0.

## 2026-06-14 — F2-3b: catat refund kalah-cepat di sistem (full-stack, UAT LULUS)

Refund untuk tenant yang KALAH first-paid-wins padahal sudah transfer kini tercatat & terlacak (lanjutan F2-3 yang memberi tahu loser "dana akan direfund").
- **Schema (owner-approved):** enum `RefundStatus { NONE, PENDING, COMPLETED }` + 7 field `Stay.lossRefund*` (status/amount/proofUrl/proofFileKey/note/processedAt/processedById). db push UAT + prod-lokal.
- **Backend:** `cancelCompetingUnpaidBookingsTx` auto-set `lossRefundStatus=PENDING` + nominal (DP terbayar atau jumlah submission) untuk loser yang sudah transfer — **atomik** dgn pembatalan. Endpoint OWNER: `GET /stays/loss-refunds/pending` (baca OWNER/ADMIN) + `POST /stays/:id/loss-refund/process` (OWNER-only D-17; COMPLETED + bukti; 409 bila bukan PENDING).
- **Frontend:** halaman OWNER **`/loss-refunds`** (tabel pending + modal "tandai sudah direfund") + nav Finance + route lazy.
- **UAT runtime:** list tampil; ADMIN proses → 403; OWNER proses → COMPLETED (processedBy/At terisi); re-proses → 409; `npm run build` LULUS (94 chunk). `tsc` 0 · unit 13/13.
- Auto-record race first-paid: code-complete + tsc; simulasi race penuh tak dijalankan (sama caveat F2-3).

## 2026-06-14 — F2-11 (V-1): code-split halaman publik (bundle utama lebih ramping)

`frontend/src/App.tsx`: empat halaman publik — `PublicGuestDashboardPage`, `RoomsRouteEntry` (katalog), `PublicRoomDetailPage`, `GuestBookingPage` — diubah dari import eager menjadi **`lazy()`** (code-split). Semua dirender di dalam `<Suspense fallback>` yang sudah ada (RootEntry lewat route `/`, sisanya lewat route masing-masing), jadi ada fallback spinner saat chunk dimuat. Bundle utama mengecil; chunk publik dimuat on-demand. `npm run build` LULUS (93 chunk, initial-js gzip ~141 KiB) + PWA verify lulus.
- **Sisa F2-11 (UI polish):** W-02 skeleton detail + CSS ring, W-03 pagination 12 katalog, UD-05 sticky CTA — perlu iterasi visual.

## 2026-06-14 — F2-18: tenant-pengawas — STAFF boleh tutup tiket (guard keselamatan tetap), enum PENDING_VERIFICATION

- **`tickets POST :id/close` kini izinkan STAFF** (sebelumnya OWNER/ADMIN). Mendukung model tenant-pengawas: staf menutup tiket pekerjaannya sendiri termasuk `CHECKOUT_INSPECTION` (menandai kamar siap). **Guard keselamatan TETAP** di `tickets.service.close()`: kamar baru jadi `AVAILABLE` HANYA bila status akhir barang `GOOD` & tak ada stay aktif (else `roomReadyBlockedReason`); jadi staf tak bisa melepas kamar yang barangnya rusak/masih dihuni.
- **`StaffReviewStatus` += `PENDING_VERIFICATION`** (enum app + schema, db push UAT & prod-lokal) sebagai prasarana model "tenant sebagai pengawas kualitas" (review menunggu verifikasi owner).
- **UAT runtime:** STAFF close tiket → 400 (validasi; guard role lolos, sebelumnya 403); STAFF buat user → 403 (kontrol OWNER-only F2-16 tetap utuh). `tsc` 0.
- **Sisa (butuh spek owner):** workflow verifikasi `PENDING_VERIFICATION` (alur "≤2 gate owner") + perluasan cakupan review (staf/fasilitas/admin).

## 2026-06-14 — F2-5: konsolidasi util terduplikasi ke common/utils (X-03, sebagian)

`backend/src/common/utils/room-booking.util.ts` (baru) menyatukan helper yang sebelumnya disalin lintas service:
- **`releaseRoomAfterBookingCancelTx`** — 2 salinan IDENTIK (auto-ops + payment-submissions) → satu sumber. Behavior tetap.
- **`syncRoomItemTx`** — 2 salinan yang sudah DRIFT (inventory-movements vs staff-field-reports) → disatukan ke perilaku **kanonik (keputusan owner 2026-06-14):** `ASSIGN_TO_ROOM` menambah qty + set `status: GOOD`; `RETURN_FROM_ROOM` mengurangi qty + pertahankan status; qty≤0 hapus baris. Param `reverse` yang mati dibuang. (inventory-movements kini ikut set status GOOD saat assign — sebelumnya tidak.)
- 5 file memakai util (import), method privat duplikat dihapus.
- **UAT runtime:** ASSIGN item#5→kamar#11 (semula MAINTENANCE/qty1) → **GOOD/qty2** (kanonik terbukti). `tsc` 0 · unit 13/13.
- **Sisa (ditunda):** `generateTicketNumber` punya 4 salinan beda signature (tickets.service tanpa-tx vs inventory-items/room-items/staff-field-reports ber-tx, sebagian dgn fallback tabrakan) — unifikasi butuh UAT pembuatan tiket lintas-jalur.

## 2026-06-14 — F2-3: copy notif A17 dua-varian (kalah first-paid: sudah/belum transfer)

`payment-submissions.notifyLosingTenants`: tenant yang kalah first-paid-wins kini menerima pesan sesuai kondisinya — `hasTransferred` (punya `PaymentSubmission` ATAU `downPaymentPaidRupiah > 0`):
- **Sudah transfer** → "Booking dibatalkan: dana Anda akan direfund" (admin akan menghubungi untuk proses refund).
- **Belum transfer** → "Booking dibatalkan: kamar diamankan tenant lain" (tak ada dana terpotong, pilih kamar lain).
Best-effort, di luar transaksi approve. `tsc` 0.

## 2026-06-14 — F2-14: timezone WIB untuk bucketing tanggal (F-25/E-6, sebagian)

- **`accounting-posting-helpers.dateOnly` → WIB (UTC+7):** entryDate jurnal kini dibucket per tanggal kalender WIB (dulu komponen UTC) → transaksi dini hari WIB (00:00–07:00) tak lagi jatuh ke tanggal/bulan kemarin. Hasil = UTC-midnight dari tanggal WIB, konsisten dengan batas periode laporan akuntansi (`Date.UTC(y,m,1)`). Saldo per-entry tak berubah → **trial-balance tetap balanced** (terverifikasi runtime).
- **`staff-performance.monthRange` → batas WIB-instant:** bebas timezone server (di server UTC/cPanel perhitungan local lama meleset ±7 jam di tepi bulan). No-op di server WIB.
- **Sisa (ditunda):** `staff-routines.startOfLocalDate` (penentuan "hari ini" untuk rutin) belum di-WIB-kan — perlu analisis semantik perbandingan field `@db.Date` agar penjadwalan rutin tak rusak. Aman selama server WIB.
- Gate: `tsc` 0 · unit 13/13 · trial-balance balanced.

## 2026-06-14 — F2-12: sinyal tiket hidup lagi + aging pakai sisa tagihan (F-21/F-27, UAT LULUS)

`finance.service.ts`:
- **F-21 (sinyal tiket):** `highSignalTickets` dulu memakai kategori `['URGENT','HIGH','EMERGENCY']` — `URGENT`/`HIGH` BUKAN `TicketCategory` valid → query selalu error & ditelan `.catch(()=>0)` (sinyal mati permanen). Kini pakai kategori nyata `['EMERGENCY','SECURITY']` + **catch dibuang** (error tak lagi disembunyikan).
- **F-27 (aging/overdue):** di `businessHealth` & `ownerDashboard`, overdue tak lagi menjumlah `totalAmountRupiah` kotor; kini `$queryRaw` menghitung **sisa = total − Σ pembayaran** (invoice `PARTIAL` yang sudah dibayar sebagian tidak dihitung penuh). Konsisten dipakai utk nominal + count + skor + signal.
- **UAT runtime LULUS:** `business-health` & `owner-dashboard` 200; sisipkan 1 tiket `EMERGENCY` OPEN → alert `ticket-high-signal` count=1 (terbukti aktif, sebelumnya selalu 0); owner-dashboard overdue 6 tagihan/Rp994.250. `tsc` 0 · unit 13/13.

## 2026-06-14 — F2-9: KPI tiket berhenti dobel-hitung lintas bulan (K-6)

`staff-performance.service.ts`: `ticketsDone` (basis skor KPI) kini disaring **`resolvedAt` ∈ bulan** + status DONE/CLOSED, bukan sekadar status pada query ber-OR (resolvedAt/updatedAt/createdAt). Akibatnya tiket yang diselesaikan bulan lalu tetapi sekadar di-update bulan ini **tidak lagi terhitung selesai dua kali**. Konsisten berdampak ke `positiveValue`, `proofRequired`, `missingTicketProof`, dan field `monthlyKpi.ticketsDone`. Query daftar/laporan (stockReports/roomChecks) tetap apa adanya. `tsc` 0 · unit 13/13.

## 2026-06-14 — F2-17: notif tenant saat booking/stay dibatalkan sweeper (E3, UAT LULUS)

Saat auto-ops membatalkan booking/stay, tenant kini diberi tahu in-app — best-effort & **DI LUAR transaksi** (kegagalan notif tak me-rollback pembatalan; tak menotif bila tx gagal):
- `cancelEndedUnpaidStay` (noon-release/H+1 auto-cancel/DP-forfeit) di-refactor: hasil tx ditangkap ke `cancelled`, lalu bila `true` panggil `notifyTenantStayCancelled` **setelah** commit. Logika pembatalan tak berubah.
- `runBookingExpiry`: setelah `expireBookingTx` sukses, kirim notif "booking kedaluwarsa".
- Helper `notifyTenantStayCancelled(stayId, reason)` baca `stay→tenant.user`+room; tenant tanpa akun portal di-skip (best-effort).
- **UAT LULUS** (stay manufaktur 22, tenant berakun): kandidat ACTIVE+RESERVED+non-promoted+expired → sweeper batalkan → stay CANCELLED + room AVAILABLE + tenant terima "⚠️ Booking dibatalkan otomatis". `tsc` 0.

## 2026-06-14 — F2-16: perketat OWNER-only 4 area (D-17), ADMIN→403 (UAT LULUS)

Audit `@Roles` + perketat 4 area sensitif jadi OWNER-only (ADMIN ditolak 403); operasi baca (GET) tetap untuk ADMIN/STAFF sesuai sebelumnya:
- **(a) Periode akuntansi** — sudah OWNER (create/update/`reopen`/`period-close/post`/`auto-run`/opening-balance post/void/draft); tak ada perubahan.
- **(b) User & staf** — `users` `@Post`/`@Patch(:id)` → **OWNER** (sebelumnya OWNER+ADMIN). Mencegah ADMIN menonaktifkan user (`isActive`) **dan eskalasi privilege** (`role` di `UpdateUserDto`/`CreateUserDto`).
- **(c) Setelan kamar & harga** — `rooms` create/update + fasilitas (create/update/delete) + upload-image → **OWNER** (rent/deposit/tarif & konfig kamar).
- **(d) Deposit & refund settlement** — `stays` `:id/deposit/process` (PARTIAL/FULL/FORFEIT) → **OWNER**.
- **UAT LULUS:** ADMIN→403 pada 7 endpoint (b/c/d + periode), OWNER lolos guard (400/404 validasi). `tsc` 0.
- **Scoping:** `tenants :id/portal-access/status` (suspend portal TENANT) sengaja dibiarkan OWNER+ADMIN (moderasi tenant level-rendah, bukan akun ber-privilege; tak ada risiko eskalasi). `deposit-ledger` hanya baca + dry-run (tak perlu dikunci).

## 2026-06-14 — F2-1 inc.4: notif siklus renewal end-to-end (F2-1 & F2-2 SELESAI, UAT LULUS)

`renew-requests.service` kini menerbitkan notifikasi in-app di tiap transisi (pola `app-notification.service`, mirror checkout-requests; best-effort di luar jalur error):
- **create** → OWNER/ADMIN ("🔁 Permintaan perpanjangan baru" + nominal DP).
- **decide YA** → tenant ("💳 Bayar DP perpanjangan" + nomor invoice DP).
- **decide TIDAK** → OWNER/ADMIN ("🚪 Tenant tidak memperpanjang" — turnover kamar).
- **confirm-dp** → tenant ("✅ DP diterima — kamar aman", lunasi ≤ H+7).
- **approve** → tenant ("🎉 Perpanjangan disetujui" + tanggal akhir baru).
- **reject** → tenant ("❌ Perpanjangan ditolak" + catatan).
- (Sweeper inc.3: EXPIRED→tenant, FORFEITED→admin.)
- `RenewRequestsModule` impor `NotificationsModule`; `RenewRequestsService` injeksi `AppNotificationService` + `Logger`.
- **UAT LULUS** (DB UAT, stay 11, req 7/8/9): 3 path (reject / TIDAK / happy-path penuh) → semua notif terbentuk ke penerima benar (tenant 4 jenis ×1; admin fan-out ke seluruh OWNER/ADMIN). tsc 0 · unit 13/13.
- **F2-1 (Renewal DP penuh, GAP #2) SELESAI** (inc.1–4) & **F2-2 (Notif renew) SELESAI**. Sisa minor F2-2: fallback antrean admin utk tenant tanpa akun portal (kini di-skip + dicatat log).

## 2026-06-14 — Auto-ops cron eksternal (cPanel/Passenger idle-sleep) — endpoint token-protected

Host owner (IDwebhost) konfirmasi: shared hosting **Passenger TIDAK always-on** (proses Node di-idle/restart saat sepi; tak ada keep-alive/min-instances), tapi **Cron Job didukung**. `setInterval` in-process auto-ops jadi tak andal di sana → digerakkan cron eksternal.
- **`GET /api/auto-ops/cron`** baru (`@Public`, tanpa JWT): validasi token rahasia `process.env.AUTO_OPS_CRON_TOKEN` via header `X-Cron-Token` ATAU query `?token=`; salah/kosong → **403**. Sukses → `runAll` (membangunkan app sekaligus). Endpoint admin `POST /api/auto-ops/run` (JWT) tetap untuk manual.
- **Deploy shared hosting:** set `AUTO_OPS_ENABLED=false` (matikan timer) + `AUTO_OPS_CRON_TOKEN=<rahasia>`, pasang cPanel **Cron** tiap 5–10 mnt: `curl -fsS -H "X-Cron-Token: <token>" https://domain/api/auto-ops/cron`. (VPS/always-on: `AUTO_OPS_ENABLED=true`, cron opsional.)
- Docs `04_DEPLOY_AND_PWA.md §D` (#4 terjawab) + `scripts/make-deploy.mjs` (`.env.example` + README-DEPLOY) diperbarui.
- **UAT lokal LULUS:** tanpa/ salah token → 403; header & query benar → 200 + `runAll`; `AUTO_OPS_ENABLED=false` → timer in-process OFF (cron jadi penggerak tunggal). `tsc` 0.

## 2026-06-13 — F2-1 inc.3: sweeper auto-ops renewal HIBRIDA (EXPIRED_PRIORITY + FORFEITED, UAT LULUS)

Sweeper baru di `auto-ops.service.ts` (wired ke `runAll`, jalan tiap 5 menit) — **kebijakan HIBRIDA** (keputusan owner 2026-06-13):
- **`runRenewalPriorityExpiry` (OTOMATIS):** `AWAITING_DP` yang lewat hari-H (`downPaymentDueDate`) tanpa DP lunas → `EXPIRED_PRIORITY`. Membatalkan invoice DP 30% belum-bayar (DRAFT/ISSUED → CANCELLED + **reversal jurnal** `postInvoiceCancellationReversalTx` bila sudah POSTED) + notif tenant. Bila invoice DP ternyata `PAID`/`PARTIAL` (admin belum confirm) → **DILEWATI** (keputusan manusia). Kamar tak disentuh — ketersediaan booking tak pernah dikunci RenewRequest; kamar terbuka lewat flow checkout normal.
- **`runRenewalSettlementForfeit` (DITANDAI saja):** `DP_SECURED` yang gagal lunas s/d H+7 (`settlementDueDate`) → `FORFEITED` + notif admin. Tenant masih huni → **forced checkout + potong deposit dilakukan admin MANUAL** (flow checkout normal, keputusan owner). DP yang sudah dibayar = hangus (tetap revenue invoice DP PAID). Stay & deposit **tidak disentuh** sweeper.
- Endpoint manual (UAT/ops): admin `POST /auto-ops/run/renewal-expiry`, `POST /auto-ops/run/renewal-forfeit`.
- **UAT runtime LULUS** (DB UAT, stay 11): EXPIRED → request `EXPIRED_PRIORITY` + invoice DP `CANCELLED` + jurnal reversal pair net-nol (38 issuance 420rb ↔ 39 `INVOICE_REVERSAL:21` 420rb) + notif tenant; FORFEITED → request `FORFEITED` + stay TETAP (`ACTIVE`/deposit `HELD`/deduction 0) + DP tetap `PAID` + notif 3 admin. Trial-balance **balanced**. Gate: `tsc` 0 · unit 13/13.
- **Sisa F2-1:** inc.4 notif renew end-to-end (F2-2) + 6 UAT skenario sisa (dossier 11 §5).

## 2026-06-13 — F2-1 inc.2b: invoice DP TERPISAH + rent-line pelunasan dikurangi (UAT runtime LULUS)

Model "DP invoice terpisah" (keputusan owner inc.2b): DP 30% = **invoice sendiri yang dibayar penuh** sebelum kamar diamankan; pelunasan = invoice renewal untuk **sisa (rent − DP) + meter**. Tidak ada perubahan validasi booking — kamar dibuka via **flow checkout normal** (keputusan owner #2).
- **`stays.service.ts`** `issueRenewalDownPaymentInvoiceTx(tx,…)` baru: terbitkan invoice DP 30% (DRAFT→ISSUED + Auto Journal Lite). `renewStayInTransaction` kini terima `priorDownPaymentRupiah` → rent-line pelunasan = `max(0, rent − DP)`; **`Stay.agreedRentAmountRupiah` tetap PENUH** (rent-loyalty utuh, DP cuma pisah timing bayar).
- **`renew-requests.service.ts`**: `decideByTenant` **YA** → transaksi terbitkan invoice DP + set `downPaymentInvoiceId` + `AWAITING_DP`; `confirmDownPayment` kini **wajib invoice DP `PAID`** (gagal 409 bila belum lunas) sebelum `DP_SECURED`; `approveRequest` teruskan `priorDownPaymentRupiah` ke renewal.
- Schema: `RenewRequest.downPaymentInvoiceId Int?` (di-`db push` ke UAT 5433; produksi via deploy bersih F1-12).
- **UAT end-to-end LULUS** (stay 8/tenant.joko, rent 1,6jt): DP=**480.000** (invoice INV-8-RDP, dibayar penuh) → confirm-dp **blokir 409 sebelum lunas, lolos sesudah** → settlement rent-line=**1.120.000** (=rent−DP) + listrik 86.700 + air 27.500 → stay rent **tetap 1.600.000**, periode → 2026-07-30. Trial-balance **balanced**. Gate: `tsc` 0 · unit 13/13.
- **Sisa F2-1:** inc.3 sweeper auto-ops (`AWAITING_DP` lewat hari-H→`EXPIRED_PRIORITY`; `DP_SECURED` gagal H+7→`FORFEITED`); inc.4 notif (F2-2) + 6 UAT skenario sisa.

## 2026-06-13 — F2-1 inc.2a UAT runtime LULUS (rent-loyalty terbukti)

Diuji end-to-end vs DB UAT (backend kode-baru :3002, stay 5 / tenant.gita, rent 850rb):
- CREATE → `PENDING_DECISION`, DP=**255.000** (30%), downPaymentDueDate=**2026-06-30** (hari-H).
- DECIDE YA → `AWAITING_DP`. CONFIRM-DP → `DP_SECURED`, settlementDueDate=**2026-06-20** (DP+7).
- APPROVE → `COMPLETED` + invoice renewal terbit, periode → 2026-07-30.
- **Rent-loyalty D-16 TERBUKTI:** admin sengaja kirim `agreedRentAmountRupiah=2.000.000` → hasil sewa tetap **850.000** (kenaikan diabaikan).
Backend UAT distop & dibersihkan; combined :3000 (LAN demo) tetap jalan.

## 2026-06-13 — F2-1 inc.2a: State Machine Renewal DP (CORE, admin-verified)

- **`renew-requests.service.ts`** dibangun ulang ke state machine GAP #2:
  - `createRequest` → `PENDING_DECISION` + set `downPaymentAmountRupiah` (30% × sewa SAAT INI — rent-loyalty D-16) + `downPaymentDueDate` = `plannedCheckOutDate` (hari-H).
  - **tenant** `POST /tenant/renew-requests/:id/decide` (`DecideRenewRequestDto` YA/TIDAK): YA→`AWAITING_DP`; TIDAK→`REJECTED_BY_TENANT`.
  - **admin** `POST /admin/renew-requests/:id/confirm-dp` (`ConfirmDownPaymentDto`): `AWAITING_DP`→`DP_SECURED` + `downPaymentPaidAt` + `settlementDueDate`=DP+7 (R2).
  - **admin** `approve` kini gate `DP_SECURED` → `renewStayInTransaction` → `COMPLETED`; **rent-loyalty D-16 ditegakkan** (agreedRent = sewa saat ini, abaikan kenaikan via dto). `reject` dari state aktif → `REJECTED`.
- `RenewRequestStatus` (TS enum `app.enums.ts`) ditambah 7 status (mirror schema inc.1).
- Gate: `tsc --noEmit` 0 · unit 13/13. ⏳ **UAT 7 skenario (dossier 11 §5)** menyusul.
- **Sisa (inc.2b/3/4):** room dibuka publik saat TIDAK/EXPIRED + batalkan booking baru + invoice DP terpisah & jurnal + hook payment-submission (DP via bukti bayar); sweeper auto-ops (EXPIRED_PRIORITY/FORFEITED); notif (F2-2).

Status: fitur renewal (state machine inti, admin-verified); schema sudah di inc.1. Tanpa perubahan flow payment/accounting (DP/settlement masih admin-verify manual di tahap ini).

## 2026-06-13 — Paket deploy RAMPING + script cPanel (`make-deploy`, `cpanel:setup`)

- **`npm run make-deploy`** (root, `scripts/make-deploy.mjs`): build frontend combined → folder **`deploy/`** = backend SOURCE (tanpa `node_modules`/`dist`/`src/generated`) + frontend prebuilt **`client/`** + `.env.example` + `README-DEPLOY.md` (+ `kost48-deploy.tgz`). **`frontend/node_modules` tak ikut ke server** (frontend sudah jadi).
- **Backend script cPanel** (`backend/package.json`): **`cpanel:setup`** = `npm ci && npm run build && npm prune --omit=dev` (build prisma engine Linux + tsc, lalu buang devDeps → ramping); **`cpanel:migrate`** = `prisma db push`. Runtime = `start:prod`/entry Passenger `dist/main.js`.
- **Alur cPanel:** lokal `make-deploy` → upload isi `deploy/` → Setup Node.js App (startup `dist/main.js`) → SSH `npm run cpanel:setup` → env → `cpanel:migrate` + `bootstrap.sql` + seed OWNER/COA → restart + AutoSSL. Runbook lengkap `04_DEPLOY §D` + `deploy/README-DEPLOY.md`.
- Diverifikasi: `deploy/` berisi `client/index.html` + src/prisma/sql + package.json (cpanel scripts), TANPA node_modules/dist/generated. `deploy/` & `.tgz` gitignored.

Status: tooling deploy; tanpa perubahan logika aplikasi.

## 2026-06-13 — COMBINED single-server: 1 proses serve frontend + API (`npm run golive:1`)

Owner pilih arsitektur "1 server". Diimplementasi **dependency-free**:
- **`backend/src/main.ts`**: serve `frontend/dist` (copy → `backend/client`, env `FRONTEND_DIST_PATH`, default `<backend>/client`) via `useStaticAssets` + **fallback SPA** (GET non-`/api` tanpa titik → `index.html`; aset hilang tetap 404). Pola sama dgn static foto kamar; tanpa `@nestjs/serve-static`.
- **`scripts/golive-combined.mjs`** + root script `npm run golive:1` (& `golive:1:fast`): bebaskan port 3000 → build frontend dgn **`VITE_API_BASE_URL=/api`** (relatif, host-agnostic) → copy `frontend/dist`→`backend/client` → build backend → jalankan `node dist/main.js` (1 proses, port 3000, prod, DB kost48_v3, CORS auto, auto-ops on).
- **Diuji LIVE (port 3000, localhost + LAN 192.168.1.200):** `/`=200 HTML · `/api/public/rooms`=200 · deep-link `/portal/stay`=200→index.html · `/api/docs`=404 (prod) · aset-hilang=404 · login OWNER tanpa CORS · aset nyata=200.
- Keuntungan: 1 port (firewall cukup 3000), tanpa CORS, frontend tak perlu rebuild saat ganti host/IP/domain (API relatif). **Fondasi langsung untuk cPanel/Passenger** (entry `dist/main.js`). `backend/client` di-gitignore.

Status: fitur arsitektur (combined server) + tooling + docs; logika bisnis tak berubah (tsc 0, smoke live PASS).

## 2026-06-13 — Target publish cPanel DIKONFIRMASI + rencana (04_DEPLOY §D)

- Owner konfirmasi host cPanel **mampu**: Node.js App (versi dukung) · PostgreSQL · SSH · build-on-server · AutoSSL. Resource upgrade bila kurang. Belum pasti: Passenger always-on vs idle-sleep.
- **Arsitektur diputuskan: combined single-server** (backend serve `frontend/dist` + API, 1 proses/port/domain, tanpa CORS) — dependency-free (`useStaticAssets` sudah dipakai untuk foto kamar); entry Passenger `dist/main.js`. **Build "nanti"** (owner defer).
- **Auto-ops di cPanel:** `setInterval` in-process (gated `AUTO_OPS_ENABLED`) hanya jalan saat proses hidup; `POST /api/auto-ops/run` butuh auth. Jika idle-sleep → TODO endpoint cron ber-secret + cPanel Cron ~10 menit.
- Runbook cPanel langkah-demi-langkah ditambah di `04_DEPLOY §D` (DB+seed via SSH, env, AutoSSL, smoke). Catatan: stack PostgreSQL — host MySQL-only tak cocok.

Status: docs/keputusan arsitektur deploy; tanpa perubahan kode.

## 2026-06-13 — Go-live SATU PERINTAH: `npm run golive` (root) + port tetap dijamin

- **Root `package.json` + `scripts/golive-all.mjs`** (zero-dependency): `npm run golive` dari `final_bundle/` → (1) **pastikan port 3000+5173 bebas** (deteksi via netstat/lsof + auto-kill proses nyangkut → port SELALU sesuai), (2) `frontend npm run build:lan`, (3) jalankan backend + frontend **bersamaan** (Ctrl+C menutup keduanya). `npm run golive:fast` = tanpa rebuild.
- Frontend `golive` ditambah `--strictPort` (gagal jelas, tak geser port).
- Deteksi port diuji terhadap instance live (3000→PID, 5173→PID terdeteksi benar). Detail di `04_DEPLOY §C`.

Status: tooling deploy (orchestrator) + docs; tanpa perubahan logika aplikasi.

## 2026-06-13 — Go-live LAN: npm script `golive` + `build:lan` (self-host WiFi kos)

Owner pilih go-live di localhost/LAN (kos 1 lokasi). Ditambah tooling konvenien **zero-dependency**:
- **`backend/scripts/golive.mjs`** + script `npm run golive`: set `NODE_ENV=production`, `DATABASE_URL`→`kost48_v3` (derive dari `.env`), `CORS_ORIGIN` auto dari semua IPv4 LAN terdeteksi (`:5173`), `PORT=3000`, `AUTO_OPS_ENABLED=true`, lalu `npm run start`.
- **`frontend/scripts/golive-build.mjs`** + `npm run build:lan`: auto-deteksi IP LAN → tulis `.env.production.local` (`VITE_API_BASE_URL=http://<ip>:3000/api`, gitignored via `.env.*`) → build. `npm run golive` → `vite preview --host 0.0.0.0 --port 5173`.
- **Workflow:** BE `cd backend && npm run golive` · FE `cd frontend && npm run build:lan && npm run golive`. Akses HP: `http://<ip-lan>:5173` (buka firewall inbound 3000+5173 sbg Admin). Detail di `04_DEPLOY §C`.
- **Diuji LIVE** (192.168.1.200): frontend 200 · API 200 · CORS preflight Allow-Origin LAN + credentials · login OWNER · prod-mode (`/api/docs`=404).
- Catatan: PWA install/offline butuh HTTPS non-localhost (mkcert opsional); ganti password OWNER `admin123`; set IP statis biar URL tetap.

Status: tooling deploy + docs; tanpa perubahan logika aplikasi.

## 2026-06-13 — F1-12: DB Produksi `kost48_v3` Diprovisikan + Di-seed (lokal-as-prod 5433)

Karena Postgres produksi 5432/VPS tak tersedia di sesi ini, owner memilih deploy DB produksi `kost48_v3` di server 5433 (sama mesin; pra-publish, port immaterial — saat go-live `pg_dump`→restore ke 5432 asli).
- **DB bersih:** `CREATE DATABASE kost48_v3` → `prisma db push` (41 tabel) → `bootstrap.sql` + `bootstrap_v4_addendum.sql` (bersih).
- **Seed fondasi (owner-driven):** OWNER `liem.lui@gmail.com` (bcryptjs, role OWNER) · COA **37 akun** (DEFAULT_COA) · AccountingPeriod 2026-06 **OPEN** · CashAccount **Cash (1000)** + **Bank (1010)**, opening 0.
- **Opening balance: NOL** (kos baru, belum ada saldo) → tidak diposting (jujur, tak mengarang). Gate `openingBalance.posted` + `journal.exists` sengaja pending → readiness **75**, akan otomatis hijau saat opening balance/transaksi pertama.
- **Smoke LULUS:** login OWNER ok · `public/rooms` 200 · trial-balance balanced (0=0) · reconciliation-lite mismatch=0 · cashflow punya section `depositLiability` (F1-9 live). Backend verifikasi (port 3001) di-stop & dibersihkan.
- **Catatan:** COA aktual **37** akun (DEFAULT_COA), bukan 38 seperti klaim docs lama — perlu koreksi minor. OWNER password = `admin123` (UAT) → **WAJIB ganti sebelum publish**.

**Sisa untuk go-live nyata (belum, butuh infra):** jalankan backend di server produksi (5432/VPS, `NODE_ENV=production`, domain+HTTPS, env penuh) atau `pg_dump kost48_v3`→restore ke 5432; set opening balance bila ada modal awal; ganti password OWNER.

## 2026-06-13 — F1-12 rehearsal: Runbook Fresh-Deploy Schema+Bootstrap LULUS

- Rehearsal di DB throwaway `kost48_v3_deploy_rehearsal` (5433): `prisma db push` → **41 tabel** (=41 model) · `sql/bootstrap.sql` + `bootstrap_v4_addendum.sql` apply **BERSIH** (hanya NOTICE idempotent, 0 error) · terbentuk 2 unique index (`stay_one_active_per_room/tenant_uidx`), 7 check constraint, 8 trigger, 231 index. DB throwaway di-drop; **UAT utuh** (COA=37).
- **Temuan F1-12:** DB fresh TIDAK punya user (bootstrap.sql tak buat User, tak ada seed script) → endpoint seed butuh auth admin. `04_DEPLOY §2` ditambah PRASYARAT langkah #0: buat OWNER pertama (INSERT bcrypt / seed script) + jalankan `bootstrap_v4_addendum.sql`.
- F1-12 (deploy produksi nyata) tetap [ ] — menunggu owner + env produksi 5432/VPS. Runbook schema+bootstrap kini tervalidasi aman.

Status: verifikasi runbook (DB throwaway, dibuang) + dokumentasi; tanpa perubahan kode aplikasi.

## 2026-06-13 — F2-1 inc.1: Schema Renewal DP (owner-approved S-1)

- **Owner approval S-1** (`03_KEPUTUSAN_OWNER §S`): seluruh perubahan schema ADDITIVE disetujui (F2-1, F2-3b, F2-18, F3-14/15/17, F4-9).
- **`schema.prisma`** (additive): `RenewRequestStatus` +7 status (`PENDING_DECISION`, `AWAITING_DP`, `DP_SECURED`, `COMPLETED`, `REJECTED_BY_TENANT`, `EXPIRED_PRIORITY`, `FORFEITED` — lama PENDING/APPROVED/REJECTED tetap); `RenewRequest` +`downPaymentAmountRupiah`, `downPaymentPaidAt`, `downPaymentDueDate`(=hari-H), `settlementDueDate`(=DP+7).
- `prisma validate` OK · `prisma db push` UAT 5433 **in sync** (additive, tanpa data loss) · generate + `tsc` 0.
- Increment berikutnya: service state machine (inc.2) → sweeper auto-ops (inc.3) → notif+UAT (inc.4).

Status: schema + generated client (generated TIDAK di-commit); service belum.

## 2026-06-13 — F2-6: Auto-tiket Inspeksi saat Cancel Stay Promoted (B-08)

- **`stays.service.ts` `cancel()`**: ketika stay yang dibatalkan `wasPromoted` (sudah dihuni) dan kamar → MAINTENANCE, kini otomatis membuat tiket `CHECKOUT_INSPECTION` (pola sama dengan `complete()`), dedupe via `openCleaningTicket`.
- Menutup B-08: sebelumnya cancel stay promoted menaruh kamar di MAINTENANCE TANPA tiket → kamar nyangkut selamanya (gate room-ready hanya buka lewat penutupan tiket inspeksi).
- Booking RESERVED yang dibatalkan tetap → AVAILABLE tanpa tiket (tidak terpengaruh).
- Gate: `tsc --noEmit` 0. ⏳ UAT: cancel stay promoted → tiket inspeksi muncul + kamar bisa di-ready-kan setelah tutup tiket.

Status: perubahan kode lifecycle (tambah tiket); tanpa schema/DB.

## 2026-06-13 — GATE RUNTIME FASE 1: LULUS (backend dev + DB UAT 5433)

Verifikasi `05 §4-5` dijalankan terhadap data UAT (`kost48_v3_pro`), backend `npm run start:dev`:
- **trial-balance**: `isBalanced=true` (debit=kredit=119.694.250). Invarian #6 ✓
- **deposit-ledger/reconciliation-lite**: `mismatchCount=0` (21/21 MATCH). Invarian #7 ✓
- **accounting/deposit-reconciliation** (F1-8): `OPENING_BALANCE_ONLY` (akun 2000 sumber DEPOSIT debit=kredit=1.500.000 berpasangan; **tak ada orphan debit**). Selisih 3,2jt = artefak opening balance seed UAT (ditandai disclosure, bukan error). ✓
- **accounting/cashflow** (F1-3/F1-9): `beginning(800.000)+net(2.700.000)=ending(3.500.000)` ✓; `operating.cashIn` = `INVOICE_PAYMENT` saja (AR 11xx TIDAK dihitung kas — F-01 terbukti fixed); section `depositLiability` terpisah (net 100.000, bukan operating — F1-9 terbukti). ✓
- **accounting/financial-ratios** (F1-4/F1-6): `expenseRatioPercent` waras (bukan 1e8); `occupancyRatePercent=57.89` (sebelumnya selalu 0 — F1-6 terbukti); currentRatio 10.47, cashRatio 6.69. ✓

Kesimpulan: fix Fase 1 (F1-3..F1-10) terbukti benar di runtime, bukan hanya tsc/unit. Sisa F1-12 = deploy bersih (owner). Untuk deploy FRESH, opening balance diset benar sehingga divergence deposit UAT tak muncul.

Status: verifikasi runtime (read-only) — tanpa perubahan kode/DB.

## 2026-06-13 — F2-8: Nonaktifkan Endpoint Draft Jurnal Manual (F-22/F-23/D-05)

- **`accounting.controller.ts`**: route `POST /accounting/journal-entries/draft` (`createJournalDraft`) kini melempar `ForbiddenException` (403) — pembuatan jurnal draft manual dimatikan. Auto Journal Lite menangani jurnal operasional.
- Opening Balance draft (jalur terpisah & terkontrol via OpeningBalanceWizard) TETAP berfungsi.
- FE: tidak ada tombol untuk endpoint ini (grep frontend hanya menemukan OpeningBalanceWizard) → tak ada UI yang perlu disembunyikan.
- Gate: `tsc --noEmit` 0 · `test:unit` 13/13 hijau.

Status: perubahan kode (disable route); tanpa schema/DB.
**Fase 1 (kode) SELESAI** — sisa hanya F1-12 (deploy bersih, langkah owner).

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
