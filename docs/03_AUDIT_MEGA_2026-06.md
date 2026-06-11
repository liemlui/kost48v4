# KOST48 V5 — Audit Mega Full-Sweep
**Versi:** 2026-06-11 — di atas baseline V5.12.2 (commit `0a51400`). Auditor: Fable 5, pembacaan kode langsung (bukan dari docs).
**Cakupan:** semua 33 modul backend + schema/bootstrap + main/common/auth + frontend (sweep terarah). Keputusan owner: full sweep; output fix = `docs/04_FIX_INSTRUCTIONS.md` (patch verbatim untuk AI eksekutor).
**Severity:** P0 = uang/data tenant salah tanpa intervensi · P1 = bug nyata berdampak bisnis, butuh kondisi tertentu · P2 = berdampak terbatas · P3 = kualitas/copy.
**Status per temuan:** `FIX-##` (ada patch di 04) · `ESKALASI` (hanya Fable/owner) · `INFO` (bukan bug / koreksi pemahaman).

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_MEGA -->

---

## Batch 0 — Fondasi (schema.prisma, bootstrap.sql, main.ts, common/, auth/)

### Yang diverifikasi SEHAT (penting untuk koreksi catatan lama)
- **Auth lebih kuat dari yang dicatat docs:** `jwt.strategy.ts:20-42` memvalidasi user dari DB **setiap request** — suspend (`isActive=false`) langsung memutus sesi; klaim `pwdAt` ditolak bila `passwordChangedAt` lebih baru (ganti/reset password = logout paksa token lama); role selalu diambil dari DB (downgrade langsung efektif). Catatan `02_FOCUS_PLAN.md` "sesi tidak invalid saat suspend" = **salah, dikoreksi**. (INFO)
- Reset password: token CSPRNG di-hash SHA-256, sekali pakai, 30 menit, enumeration-safe; email reset nyata via Brevo API (`auth.service.ts:366-420`). (INFO — docs lama bilang "no email delivery"; untuk reset password sudah ada.)
- Rate limit dua lapis: middleware global 300/menit + auth 10/15 menit (`main.ts:55-69`), plus `RateLimitGuard` per-endpoint (login/forgot/reset/publicBooking/tenantUpload). (INFO)
- Fondasi DB kuat (bootstrap.sql): no-overpay trigger dengan `FOR UPDATE` (:262-303), line auto-compute + draft-only (:309-432), total invoice dikelola trigger (:381-402), deposit processing guard (:440-476), meter monotonic (:482-522), qty inventory sync via trigger DB (:558-622), partial unique 1-ACTIVE-per-tenant / 1-promoted-per-room (:69-75), 1 PENDING_REVIEW per target (:703-705).
- Hanya 1 controller tanpa guard: `marketing-public-rooms.controller.ts` (katalog publik — by design). Controller lain semua ber-`@UseGuards`. **Tidak ada APP_GUARD global** — keamanan bergantung disiplin per-controller (lihat M-04).

### Temuan

#### M-01 [P2] [fondasi/schema] — DP tanpa pagar DB: `downPaymentPaidRupiah` bisa melebihi `downPaymentAmountRupiah` atau negatif
- **Bukti:** `sql/bootstrap.sql:708-711` menambah 4 kolom DP tanpa CHECK constraint; bandingkan deposit jaminan yang dipagari `stay_deposit_payment_amount_chk` (:637-642).
- **Dampak:** bug aplikasi (sekarang/masa depan) yang salah menghitung DP tidak akan tertahan di DB — uang muka bisa tercatat lebih besar dari kewajiban tanpa error.
- **Akar:** kolom DP ditambahkan V5.12.0 (A18) tanpa meniru pagar deposit.
- **Status:** FIX (schema additive — tambah CHECK constraint).

#### M-02 [P2] [fondasi/error-handling] — Pesan error internal bocor di production untuk exception non-HTTP
- **Bukti:** `common/filters/all-exceptions.filter.ts` — untuk `exception instanceof Error` (bukan HttpException), `message = exception.message` dikirim ke klien tanpa melihat NODE_ENV. Error Prisma/driver memuat nama tabel, constraint, kadang potongan query. `ValidationPipe` sudah `disableErrorMessages` di production (main.ts:35) tapi filter ini membocorkan jalur lain. Stack sudah benar disembunyikan di production.
- **Dampak:** information disclosure ringan (nama tabel/constraint) ke penyerang; juga pesan teknis membingungkan pengguna.
- **Status:** FIX (genericize message untuk status 500 di production).

#### M-03 [P3] [fondasi/rate-limit] — Map limiter global bisa tumbuh melampaui batas saat flood IP unik
- **Bukti:** `common/middleware/rate-limit.middleware.ts` — `sweep` hanya berjalan bila `buckets.size ≥ 10_000` dan hanya menghapus entry kedaluwarsa; flood IP unik dalam satu window menumbuhkan Map tanpa plafon keras.
- **Dampak:** tekanan memori saat serangan terdistribusi; bukan jalur normal.
- **Status:** FIX kecil (hard cap: tolak track baru / hapus paksa tertua saat penuh) — prioritas rendah.

#### M-04 [P3] [fondasi/arsitektur] — Tidak ada guard global; keamanan bergantung disiplin per-controller
- **Bukti:** `app.module.ts` tanpa provider `APP_GUARD`; semua proteksi via `@UseGuards` per controller (saat ini lengkap, hanya katalog publik yang sengaja terbuka).
- **Dampak:** controller BARU yang lupa `@UseGuards` otomatis 100% publik, tanpa peringatan.
- **Status:** ESKALASI (perubahan arsitektur: global `JwtAuthGuard` + decorator `@Public()` — perlu menyentuh banyak file, bukan untuk AI lemah).

#### M-05 [P3] [fondasi/schema] — Unique constraint dengan kolom nullable tidak mencegah duplikat
- **Bukti:** `schema.prisma` — `StaffReview @@unique([tenantId, ticketId])` (ticketId nullable; NULL ≠ NULL di Postgres → review tanpa tiket bisa duplikat); `StaffRoutineCompletion @@unique([templateId, assignmentId, staffUserId, roomId, dueDate])` (assignmentId & roomId nullable → kombinasi NULL bisa duplikat).
- **Dampak:** bergantung guard aplikasi (dicek di Batch 4); dicatat di sini sebagai fakta fondasi.
- **Status:** ditangguhkan ke Batch 4 (verifikasi guard aplikasi dulu).

#### M-06 [WATCH→Batch 3/6] — Konsistensi FORFEITED di constraint vs sweeper, dan `CashAccount.currentBalanceRupiah`
- `stay_deposit_status_consistency_chk` (:135-165) mewajibkan FORFEITED ⇒ `depositDeductionRupiah = depositAmountRupiah` — sweeper forfeit harus mengisi deduction, kalau tidak UPDATE-nya gagal. Verifikasi di Batch 3.
- `CashAccount.currentBalanceRupiah` (schema) adalah saldo denormalized — siapa yang meng-update saat jurnal posting? Verifikasi di Batch 6; bila tidak pernah, angka dashboard berpotensi basi.
- Trigger DB `inventory_movement_sync_qty_trg` meng-update `qtyOnHand` otomatis — bila service JUGA meng-update qty manual = double-apply. Verifikasi di Batch 5.

---

## Batch 1 — Uang inti / regresi (payment-submissions 1.398, invoice-payments, invoices, meter-readings + controller upload)

### Yang diverifikasi SEHAT
- `approveSubmission` (payment-submissions.service.ts:353-729): lock `FOR UPDATE OF ps,s,r,i` (:1417), hitung ulang paid segar dalam tx (:395), cap rentPortion ≤ sisa invoice + depositPortion ≤ sisa jaminan dengan penolakan kelebihan (:409-420), guard tiket pembersihan sebelum aktivasi (:570-582), pembatalan pesaing dalam transaksi yang sama (:688), notifikasi tenant kalah A17 (:827).
- Keempat jalur cancel kini memakai `reverseCancelledInvoiceJournalsTx` blocking (A8, :873-902); `releaseRoomAfterBookingCancelTx` konsisten mengembalikan kamar kotor ke MAINTENANCE (:855-864).
- `expireBooking`/`runExpiryCheck`/`autoCancelRejectedExpiredBookingTx`: lock + re-check status + re-check submission + re-check invoice PAID/PARTIAL (regresi A1/A2 LULUS).
- invoice-payments: guard booking manual-payment (A1, :142-150), lock+validasi dalam tx untuk create/update/remove (A6/#7), `syncInvoiceStatus` pakai max(paymentDate) (A12), blokir edit/delete payment berjurnal aktif.
- invoices.cancel: lock + re-validasi dalam tx (A14), reversal wajib sukses; DB trigger menjaga total & line draft-only.
- Upload bukti: magic-byte verification (JPG/PNG/WebP), rename nama acak CSPRNG, anti path-traversal, limit 2 MB, rate-limit `tenantUpload`; akses proof per-tenant via `doesTenantOwnProof`.
- meter-readings: guard kronologis aplikasi + trigger DB monotonic (lapisan ganda); edit bebas sesuai kebijakan owner (selisih checkpoint).

### Temuan

#### M-07 [P2-laten] [pembayaran/aktivasi] — `initialMetersPromotedAt` hanya di-set bila ada snapshot meter pending
- **Bukti:** payment-submissions.service.ts:616 `if (stay && (hasElectricity || hasWater))` membungkus seluruh blok promosi termasuk update `initialMetersPromotedAt` (:671-680). Bila kedua pending meter null, kamar jadi OCCUPIED (:584) tetapi stay TIDAK pernah "promoted".
- **Mitigasi saat ini:** `approveBooking` admin mewajibkan meter (tenant-bookings.service.ts:248-249) sehingga jalur normal selalu punya snapshot. TAPI invariant "OCCUPIED ⇒ promoted" tidak dijaga struktural — jalur booking baru di masa depan (atau approveBooking yang diubah) membuat stay berbayar jadi target sweeper unpromoted (noon-release/H+1) → tenant lunas bisa digusur otomatis.
- **Status:** FIX — pindahkan update `initialMetersPromotedAt` ke luar blok `if`, set selalu saat aktivasi (pembuatan MeterReading tetap kondisional).

#### M-08 [P2] [invoice/diskon] — Rumus total service tidak mengenal tanda negatif DISCOUNT → mutasi line invoice ber-DISCOUNT selalu gagal
- **Bukti:** DB `recalc_invoice_total` menghitung `CASE WHEN lineType='DISCOUNT' THEN -lineAmount` (bootstrap.sql:334-346) dan `prevent_manual_invoice_total_mutation` menolak nilai lain (:381-398). Service menjumlah polos tanpa tanda: `invoices.service.ts:422-431` (`recalculateInvoiceTotal` — `_sum.lineAmountRupiah`), `:308-313` (`createWithLinesAndIssue` `totalAmountRupiah +=`).
- **Dampak:** invoice yang memuat line DISCOUNT: `addLine`/`updateLine`/`removeLine` dan `createWithLinesAndIssue` menulis total ≠ hasil trigger → exception Postgres → 500. Fitur diskon efektif rusak; juga total salah (diskon menambah bukan mengurangi) bila trigger tidak ada.
- **Status:** FIX — samakan rumus service dengan DB (DISCOUNT = pengurang) di kedua lokasi.

#### M-09 [P2] [booking/DP] — `approveBooking` bisa mengubah `agreedRentAmountRupiah` tanpa menghitung ulang DP 30%
- **Bukti:** tenant-bookings.service.ts:325-331 — update hanya `agreedRentAmountRupiah` + `depositAmountRupiah`; `downPaymentAmountRupiah` (di-set 30% dari tarif saat createBooking) tidak disentuh.
- **Dampak:** bila admin menyetujui dengan tarif berbeda dari tarif booking, DP yang ditagih bukan lagi 30% dari sewa final (kebijakan G4 melenceng); nominal "pas" di review pembayaran pun ikut salah.
- **Status:** FIX — recalc `downPaymentAmountRupiah = round(30% × agreedRent baru)` di approveBooking **hanya bila DP belum terbayar** (downPaymentPaidRupiah = 0); bila sudah ada DP terbayar, tolak perubahan tarif.

#### M-10 [P3] [pembayaran/copy] — Notifikasi approve selalu bilang "Hunian Anda sudah aktif"
- **Bukti:** payment-submissions.service.ts:1501 — body statis, padahal approval bisa berupa DP-saja (kamar belum aktif) atau pembayaran invoice renewal.
- **Status:** FIX copy netral.

#### M-11 [P3] [pembayaran/proof] — Tenant tidak bisa melihat bukti bayar miliknya yang berstatus EXPIRED
- **Bukti:** `doesTenantOwnProof` (:1549-1558) hanya mengizinkan PENDING_REVIEW/APPROVED/REJECTED.
- **Status:** FIX — tambahkan EXPIRED ke daftar.

#### M-12 [P3] [pembayaran/hardening] — `expiresAt` tidak di-nol-kan saat pembayaran pertama disetujui
- **Bukti:** approveSubmission tidak pernah menulis `expiresAt: null`; "expiresAt mati setelah DP" (CHANGELOG V5.12.0) diimplementasikan hanya lewat filter `paymentSubmissions none APPROVED` di semua sweeper. Invariant bergantung pada disiplin filter, bukan data.
- **Status:** FIX — set `expiresAt: null` pada update stay di jalur booking approveSubmission (:516-526).

#### M-13 [INFO] — Risiko-sadar yang dipertahankan
- A13: hapus payment → invoice PAID turun ke PARTIAL sementara kamar tetap OCCUPIED (sudah diblokir bila ada jurnal aktif; sisa kasus = payment tanpa jurnal).
- Jurnal & ledger best-effort di approveSubmission (:476-486, :528-563) — kebijakan sadar (readiness unmapped menahan tutup buku).
- `create` JSON submission menerima `fileKey` arbitrer — secara teori tenant bisa mengklaim file tenant lain, tetapi nama file CSPRNG 8-byte praktis tidak tertebak. Tidak ada aksi.

---

## Batch 2 — Booking & siklus huni (stays 1.021, tenant-bookings 886, public-bookings 455, checkout-requests, renew-requests)

### Yang diverifikasi SEHAT
- `createBooking` portal: lock Tenant+Room `FOR UPDATE`, DP 30% × sewa per pricingTerm, jaminan dari `Room.defaultDepositRupiah` (A18 benar di kedua jalur masuk).
- **Paritas publik vs portal LULUS untuk harga & expiry:** keduanya memakai `calculateRentByPricingTerm` (multiplier dari tarif bulanan) dan `expiresAt = 3 jam dari sekarang`. Pertanyaan terbuka flow-map §2 terjawab.
- `rejectBooking`/`cancelPendingBooking`: lock `FOR UPDATE OF s, r`, guard invoice/submission sudah ada, kamar tetap RESERVED bila masih ada booking pesaing.
- `stays.create` (check-in manual): lock kamar, hanya AVAILABLE (A9), tolak tiket pembersihan terbuka, meter awal langsung jadi `MeterReading`, auto-buat akun portal dengan password CSPRNG.
- `complete` (final checkout): blokir tagihan aktif, `updateMany` guard status, kamar → MAINTENANCE + tiket CHECKOUT_INSPECTION dedupe.
- `processDeposit`: validasi aksi ketat, jurnal + ledger **blocking**; checkout-requests: tolak tanggal melebihi kontrak (#11), guard tagihan aktif, anti-dobel PENDING.
- `renew-requests.approveRequest`: lock request `FOR UPDATE`, delegasi satu transaksi penuh.

### Temuan

#### M-14 [P1] [stays/check-in manual] — Check-in manual tidak men-set `initialMetersPromotedAt` → penghuni sah berstatus "unpromoted" selamanya
- **Bukti:** `stays.service.ts:253-273` membuat Stay tanpa `initialMetersPromotedAt`, padahal meter awal nyata dicatat (:366-386) dan kamar langsung OCCUPIED (:275-278).
- **Dampak:** (1) Partial unique `stay_one_active_per_room_uidx` (syarat promoted) tidak melindungi kamar check-in manual; (2) semua sweeper auto-ops yang menarget "stay unpromoted" (noon-release, DP-forfeit, post-checkout auto-cancel) berpotensi menganggap penghuni manual sebagai booking tak berbayar → **kandidat penggusuran otomatis penghuni sah** (verifikasi filter persis di Batch 3 — lihat M-20); (3) semantik "promoted = resmi huni" rusak untuk seluruh jalur manual.
- **Status:** FIX — set `initialMetersPromotedAt: new Date()` pada data create stay manual.

#### M-15 [P1] [renew] — `renewStayInTransaction` tanpa lock & tanpa re-check → dobel-renew dan race dengan sweeper
- **Bukti:** `stays.service.ts:956-964` — `findUnique` biasa, tidak ada `SELECT ... FOR UPDATE`, tidak ada re-check setelahnya. Dua approve bersamaan (atau approve admin + `renewStay` langsung) sama-sama lolos `assertNoOpenInvoicesTx` → dua invoice renewal ISSUED + dua kali geser `plannedCheckOutDate`. Race juga terbuka terhadap noon-release/forced-checkout yang memproses stay yang sama.
- **Status:** FIX — lock stay (+room) `FOR UPDATE` di awal `renewStayInTransaction` + re-check `status=ACTIVE` setelah lock (pola sama dengan `expireBooking`).

#### M-16 [P1] [stays/cancel] — `stays.cancel` atas penghuni promoted melepas kamar langsung ke AVAILABLE tanpa gate inspeksi
- **Bukti:** `stays.service.ts:729-741` — setelah cancel, kamar → AVAILABLE tanpa cek tiket pembersihan dan tanpa membedakan stay promoted (kamar bekas dihuni) vs booking murni. Bandingkan `complete` yang selalu MAINTENANCE+inspeksi, dan `releaseRoomAfterBookingCancelTx` di payment-submissions yang sadar-tiket.
- **Dampak:** admin membatalkan stay penghuni aktif (mis. tenant kabur) → kamar tampil siap huni tanpa pernah dicek; juga booking di kamar kotor yang dibatalkan lewat jalur ini menjadikan kamar kotor AVAILABLE.
- **Status:** FIX — bila stay promoted → kamar MAINTENANCE (+ biarkan alur inspeksi normal); bila tidak promoted → cek tiket pembersihan terbuka (MAINTENANCE) sebelum AVAILABLE.

#### M-17 [P2] [booking/pelepas kamar] — `rejectBooking` & `cancelPendingBooking` melepas kamar tanpa cek tiket pembersihan
- **Bukti:** tenant-bookings.service.ts:568-576 dan :753-761 — `nextRoomStatus` hanya RESERVED/AVAILABLE; tidak ada cek CHECKOUT_INSPECTION terbuka. Booking pada kamar kotor (`allowBookingWhileCleaning`) yang ditolak/dibatalkan membuat kamar kotor tampil AVAILABLE (CHANGELOG V5.12.1 mengklaim semua jalur sudah sadar-tiket — dua jalur ini terlewat).
- **Status:** FIX — sisipkan cek tiket pembersihan terbuka; bila ada → MAINTENANCE.

#### M-18 [P2] [booking publik/timezone] — Cutoff booking same-day publik memakai endOfDay UTC, bukan pk 21.00 WIB
- **Bukti:** public-bookings.service.ts:148-154 — `endOfDay(checkInDate)` (UTC 23:59 = 06:59 WIB esok) − now < 3 jam ⇒ cutoff efektif ±03:59 WIB dini hari, padahal pesan error menjanjikan jam operasional s.d. 21.00 WIB; portal memakai cek `jakartaHour >= 21` yang benar (tenant-bookings.service.ts:83-89).
- **Dampak:** publik bisa booking same-day hingga lewat tengah malam WIB; perilaku publik ≠ portal.
- **Status:** FIX — samakan dengan portal (cek jam Jakarta ≥ 21).

#### M-19 [P1] [deposit jaminan/check-in manual] — Penerimaan jaminan pada check-in manual tidak pernah tercatat
- **Bukti:** satu-satunya penulis `depositPaidAmountRupiah` adalah approveSubmission jalur booking (payment-submissions.service.ts:519). `stays.create` hanya mengisi `depositAmountRupiah` (:264). Akibat berantai: `processDeposit` selalu terblokir "nominal deposit yang diterima masih 0" (`resolveDepositSettlementAmount` = paid), ledger kosong, laporan liability mengabaikan jaminan tunai yang sebenarnya diterima admin saat check-in.
- **Dampak:** uang jaminan jalur check-in manual tidak punya jejak penerimaan, tidak bisa di-settle, tidak masuk liability.
- **Status:** ESKALASI (butuh desain: field DTO `depositPaidNow` + ledger + jurnal liability + metode pembayaran — bukan untuk AI lemah).

#### M-20 [WATCH→Batch 3] — Pertanyaan kritis untuk auto-ops
- Apakah noon-release/DP-forfeit/post-checkout-auto-cancel mengecualikan stay dengan kamar OCCUPIED / pembayaran APPROVED? (Berinteraksi dengan M-14.)
- Apakah sweeper forfeit mengisi `depositDeductionRupiah = depositAmountRupiah` sesuai `stay_deposit_status_consistency_chk`?

#### M-21 [P3] — Catatan kecil batch 2
- Audit log `cancelPendingBooking` menulis `roomStatus: AVAILABLE` hardcoded meski hasil aktual bisa RESERVED (tenant-bookings.service.ts:783).
- Password sementara booking publik `Kost48#####` (90 ribu kombinasi) — lemah; mitigasi rate-limit login ada. Sarankan format CSPRNG seperti stays.create (`kost48-` + 12 char base64url).
- `checkout-requests.createRequest` menghitung "besok" dalam UTC — antara 00:00–07:00 WIB tenant bisa mengajukan checkout "hari ini" (minor, tidak merusak invariant; approve tetap menjaga ≤ kontrak).
- Kolom tarif per-term di Room (`dailyRateRupiah` dll.) tidak dipakai jalur booking (harga selalu multiplier × bulanan) — hanya dipakai check-in manual via `resolveRent` stays.helpers. Drift kecil antara dua sumber harga; dicatat saja.

---

## Batch 3 — Auto-ops (913) + deposit-ledger (431)

### Yang diverifikasi SEHAT
- 9 job berjalan **sequential** (A4 fixed, auto-ops.service.ts:94-105) dengan mutex `running`; noon-release & H+1 auto-cancel kini SATU pintu `cancelEndedUnpaidStay` (:205-357): lock `FOR UPDATE OF s,r`, re-check status/promoted, skip bila ada submission PENDING/APPROVED atau invoice PAID/PARTIAL (mode normal), reversal jurnal blocking pola A8, DP-forfeit dengan jurnal wajib sukses, forfeit jaminan legacy tercatat ke ledger (fix Pass C), pelepas kamar sadar-tiket-pembersihan.
- `expireBookingTx` (:907-1005): lock + re-check + tolak bila invoice PAID/PARTIAL (regresi A1/A2/A4 LULUS).
- Urutan job benar: forced-checkout H+1 (:100) berjalan sebelum overstay-enforcement (:104) sehingga tidak ada tiket EVICT untuk stay yang baru saja di-checkout paksa.
- Gerbang jam WIB konsisten (`jakartaHour >= 12`) sehingga perhitungan tanggal UTC aman di window 12:00–23:59 WIB.
- M-06 (bagian forfeit): pada data normal A18 `depositPaid` hanya 0 atau penuh → `depositDeductionRupiah = paid = amount` memenuhi constraint; urutan cancel-invoice → update stay juga memenuhi trigger `guard_stay_deposit_processing`.
- auto-ops.controller: semua endpoint @Roles(OWNER, ADMIN) ✓.
- deposit-ledger.service: entri idempotent per (stay, type, source), isolasi tenant (`assertTenantCanReadStay`), `reconciliationLite` + `backfillDryRun` read-only.

### Temuan

#### M-22 [P1] [auto-ops/ketahanan] — Tidak ada try/catch per item: satu stay "beracun" menghentikan SELURUH rantai auto-ops
- **Bukti:** `runAll` (:96-105) memanggil job berurutan; setiap job me-loop kandidat dan memanggil `expireBookingTx`/`cancelEndedUnpaidStay` TANPA try/catch per item (:146-149, :183-191, :391-401, :830-838). `cancelEndedUnpaidStay` sengaja melempar ConflictException bila reversal jurnal gagal (:278-282) atau jurnal DP-forfeit gagal (:295-299).
- **Dampak:** satu stay yang reversal-nya gagal permanen (mis. periode akuntansi CLOSED belum di-reopen, COA berubah) membuat exception yang sama terlempar SETIAP run → job-job setelah titik gagal (pengingat, forced checkout, healer, auto-close) **tidak pernah berjalan lagi** sampai stay itu dibereskan manual; satu-satunya jejak hanyalah `logger.warn` di interval.
- **Status:** FIX — bungkus pemanggilan per item dengan try/catch (log error + lanjut item berikutnya) di 4 loop tersebut.

#### M-23 [konfirmasi M-14, P1] — Seluruh lifecycle overstay V5.12.1 mengecualikan penghuni check-in manual
- **Bukti:** filter `initialMetersPromotedAt: { not: null }` di runContractEndReminders (:422), runOverstayForcedCheckout (:505), runOverstayEnforcement (:731). Penghuni check-in manual (M-14, tidak pernah promoted) → tidak pernah dapat pengingat H-7/H-3/H-1, tidak pernah kena tiket EVICT, tidak pernah forced checkout. Sebaliknya bila invoice pertamanya belum dibayar, ia justru bisa ditangkap noon-release (filter unpromoted) → stay penghuni fisik di-CANCEL + kamar dilepas.
- **Status:** ditutup oleh FIX M-14 (set promotedAt saat check-in manual). Setelah fix, lakukan juga backfill data: stay ACTIVE+OCCUPIED hasil check-in manual lama perlu `initialMetersPromotedAt` diisi (lihat ESKALASI E-2).

#### M-24 [P3] [auto-ops/forfeit-legacy] — Forfeit jaminan pada stay berdeposit-parsial (data legacy) melanggar constraint
- **Bukti:** `cancelEndedUnpaidStay` :310-312 menulis `depositStatus=FORFEITED, depositDeductionRupiah=paid`; constraint FORFEITED menuntut `deduction = depositAmountRupiah`. Bila legacy `paid < amount` → UPDATE gagal → exception (dan tanpa M-22, memacetkan rantai).
- **Status:** FIX kecil — hanya tandai FORFEITED bila `paid === depositAmountRupiah`; selain itu biarkan HELD (diproses manual lewat processDeposit). Ambil `depositAmountRupiah` di SELECT lock.

#### M-25 [P3] [notifikasi/route] — linkTo tidak konsisten antar pengirim
- `/portal/my-stay` (auto-ops :472, :654) vs `/portal/stay` (payment-submissions, checkout-requests). Salah satu pasti rute mati — verifikasi rute aktual di Batch 8 lalu samakan.

---

## Batch 4 — Tiket & operasional staf (tickets 754, staff-field-reports 615, staff-routines 365, staff-performance 447, tenant-staff-reviews 109)

### Yang diverifikasi SEHAT
- Isolasi akses tiket benar: staf hanya melihat tiket yang di-assign padanya / berisi laporannya sendiri (findAll branch STAFF, findOne guard); tenant hanya tiketnya sendiri; createPortal mengabaikan tenantId/stayId kiriman klien (anti-spoof).
- Gerbang kamar (close CHECKOUT_INSPECTION, tickets.service.ts:621-669) sudah benar pasca V5.12.1: penghuni promoted memblokir, booking baru TIDAK memblokir (flag kotor direset, kamar tetap RESERVED), transisi MAINTENANCE→AVAILABLE pakai `updateMany` guard status.
- Guard satu-pekerjaan-aktif staf konsisten di tickets.start dan staff-routines (`assertNoActiveWork`).
- staff-field-reports: laporan staf men-trigger tiket (dedupe per item), sinkronisasi qty stok TIDAK dilakukan manual (mengandalkan trigger DB saat movement dibuat — tidak ada double-apply di jalur ini); review admin wajib catatan ≥8 char; movement hanya saat APPROVE.
- tenant-staff-reviews: duplikat ditahan P2002 + ticketId selalu terisi di jalur ini → unique constraint efektif (menjawab M-05 bagian StaffReview); komplain ≤2⭐ memberi notifikasi admin.

### Temuan

#### M-26 [P2] [tiket/guard] — `markDone` tanpa guard kepemilikan untuk STAFF
- **Bukti:** tickets.service.ts:457-487 — `start` menolak staf yang bukan assignee (:407-410), tetapi `markDone` tidak memeriksa apa pun selain status IN_PROGRESS. Staf mana pun bisa menyelesaikan tiket staf lain (memengaruhi KPI, kualitas resolusi, dan review tenant→staf yang tertuju ke assignee).
- **Status:** FIX — tambahkan guard yang sama dengan `start` (bila STAFF dan assignedToId ≠ actor → tolak).

#### M-27 [P3] [tiket] — `assign` tanpa guard status
- **Bukti:** tickets.service.ts:373-399 — tiket CLOSED/CANCELLED masih bisa di-reassign (membingungkan KPI bulanannya).
- **Status:** FIX kecil — tolak assign bila status CLOSED/CANCELLED.

#### M-28 [P3] [routines] — `complete` bisa menimpa pekerjaan yang sudah DONE
- **Bukti:** staff-routines.service.ts:207-274 — `start` menolak existing DONE (:174), tetapi `complete` langsung update existing apa pun statusnya → staf bisa "menyegarkan" completedAt/foto berulang (KPI bisa dipoles).
- **Status:** FIX kecil — tolak complete bila existing berstatus DONE.

#### M-29 [P3] [staf/timezone] — Batas hari/bulan modul staf memakai timezone server, bukan WIB
- **Bukti:** `startOfLocalDate` (staff-routines.service.ts:11-14) dan `monthRange` (staff-performance.service.ts:9-21) memakai waktu lokal proses Node; modul lain konsisten Jakarta/UTC. Bila server berjalan UTC, "hari ini" checklist staf baru berganti pk 07:00 WIB.
- **Status:** INFO/ESKALASI kecil (perubahan menyentuh banyak perhitungan KPI — selaraskan saat ada pekerjaan timezone menyeluruh).

#### M-30 [INFO] — Konfirmasi & downgrade kekhawatiran lama
- Regex BARANG_PINDAH (tickets.service.ts:603-619) hanya membentuk isi NOTIFIKASI, tidak memutasi data → kekhawatiran flow-map diturunkan jadi kosmetik.
- Penugasan otomatis tiket selalu ke staf `orderBy id asc` (3 lokasi: stays.complete, auto-ops forced-checkout & evict) → beban staf tidak merata. Dicatat sebagai keputusan desain yang perlu owner pertimbangkan (round-robin) — ESKALASI ringan.
- `StaffRoutineCompletion` masih berisiko duplikat teoretis (unique ber-NULL + pola findFirst→create) — dampak rendah, dipantau.

---

## Batch 5 — Barang & kamar (inventory-items 333, inventory-movements 160, room-items 254, rooms 386, assets 665)

### Yang diverifikasi SEHAT
- **M-06 (double-apply qty) TERJAWAB: TIDAK terjadi.** Trigger DB `inventory_movement_sync_qty_trg` adalah satu-satunya pengubah qty; service memakai `ensureInventoryQtySyncedTx`/`ensureOpeningStockSyncedTx` yang self-healing (hanya menulis bila beda) — bukan penambah kedua. Edit movement DIBLOKIR total (wajib mutasi koreksi, inventory-movements.service.ts:72-77). Stok awal item baru dibuat lewat movement IN, bukan tulis langsung.
- room-items: create & ubah qty diblokir (wajib via Mutasi Stok); staf hanya boleh lapor status bermasalah → status PENDING_CHECK + tiket + field report otomatis.
- inventory-items: qtyOnHand tidak bisa diubah lewat edit master; guard role rapi (staf read-only stok).
- inventory-movements.create: lock qty `FOR UPDATE`, validasi stok cukup, validasi konsistensi room per tipe movement, catatan wajib ≥8 char.
- rooms: deactivation ditolak bila ada stay aktif; kamar aktif wajib tarif bulanan > 0; create selalu AVAILABLE; mutasi kamar/fasilitas owner/admin-only.
- assets: depresiasi dobel-run terkunci ganda (unique DB `[periodYear, periodMonth]` + re-check dalam tx + jurnal wajib sukses); alignment ledger lewat satu pintu posting.

### Temuan

#### M-31 [P3] [rooms/kode-mati] — `rooms.service.findPublicOne` adalah jalur harga kedua yang tidak terpakai
- **Bukti:** rooms.service.ts:158-205 memakai kolom tarif per-term mentah (`dailyRateRupiah ?? monthly`), berbeda dengan formula multiplier yang dipakai katalog publik & booking (`calculateRentByPricingTerm`). Tidak ada route yang memanggilnya (rooms.controller tidak meng-expose) — kode mati yang berisiko dihidupkan kembali dengan harga salah.
- **Status:** FIX kecil — hapus method (atau samakan formulanya). Direkomendasikan hapus.

#### M-32 [P3] [marketing/payload] — Katalog publik ikut meng-expose kolom tarif per-term mentah
- **Bukti:** marketing-public-rooms.service.ts:202-205 menyertakan `dailyRateRupiah` dkk. di response selain `highlightedRateRupiah` hasil formula. Bila frontend menampilkan kolom mentah, harga tampil ≠ harga ditagih (formula 13%/45%/75% × bulanan dibulatkan ke 5 ribu).
- **Status:** verifikasi pemakaian di Batch 8; kandidat FIX di frontend (tampilkan hanya harga formula).

---

## Batch 6 — Akuntansi & laporan (accounting ×5 = 3.927 baris, expenses, wifi-sales, finance 459, reports 461)

### Yang diverifikasi SEHAT
- `postBalancedJournalTx` idempotent per (sourceType, sourceId); jurnal DP-forfeit (`postDownPaymentForfeitTx`:781-849) akuntansinya konsisten: netting piutang (debit 1100) lawan pendapatan DP hangus (kredit 4400), dengan guard "pembayaran DP belum terjurnal → skip benign agar tidak membuat piutang fiktif".
- Depresiasi & alignment aset: pintu tunggal, jurnal wajib sukses, dobel-run terkunci DB.
- Auto-close tetap ter-gate readiness unmapped-operational (verifikasi A11 bertahan).
- reports.service memberi metadata jujur (`OPERATIONAL_APPROXIMATION`, `ledgerBacked:false`) di laporan berbasis data operasional — pelabelan baik.
- finance.occupancySummary & businessHealth memakai filter `initialMetersPromotedAt not null` (fix P2-26 utuh).

### Temuan

#### M-33 [P1] [expense & wifi/jurnal yatim] — Edit & hapus expense/wifi-sale tidak menyentuh jurnalnya
- **Bukti:** `expenses.service.ts` update (:halaman update) mengubah `amountRupiah/expenseDate` dan `remove` menghapus row TANPA cek/reversal jurnal; `wifi-sales.service.ts` identik. Tidak ada helper reversal EXPENSE/WIFI_SALE di accounting-posting (daftar method :69-:781). Bandingkan invoice-payments yang memblokir edit/delete payment berjurnal (`assertNoActivePaymentJournal`).
- **Dampak:** expense dihapus → jurnal biaya tetap POSTED selamanya (biaya & kas salah, dan karena sumbernya hilang, readiness unmapped tidak akan pernah menandainya); nominal diedit → jurnal tetap nominal lama.
- **Status:** FIX — di update (bila nominal/tanggal berubah) dan remove: cek `journalEntry(sourceType EXPENSE/WIFI_SALE, sourceId, status != VOID)`; bila ada → tolak dengan pesan "gunakan koreksi/void resmi". (Pola persis invoice-payments.)

#### M-34 [P1] [akuntansi/saldo kas] — `CashAccount.currentBalanceRupiah` tidak pernah di-update posting jurnal tapi dijumlahkan di laporan
- **Bukti:** satu-satunya penulis adalah create/update manual cash account (accounting.service.ts:171, :205); `accounting-reports.service.ts:839-843` menjumlahkannya sebagai `totalCashCurrent`.
- **Dampak:** saldo kas pada laporan = angka manual saat akun dibuat, tidak bergerak mengikuti jurnal → menyesatkan owner.
- **Status:** ESKALASI (solusi benar: hitung saldo kas dari Σ JournalLine per cashAccountId, atau hapus field dari laporan — keputusan desain).

#### M-35 [P2] [reports/okupansi] — Okupansi reports menghitung booking RESERVED sebagai terisi (P2-26 hanya separuh jalan)
- **Bukti:** `reports.service.ts:435-437` dan :474-476 — `stay.count({ status: ACTIVE })` tanpa filter promoted; finance.service sudah benar (:62, :183).
- **Status:** FIX — tambahkan `initialMetersPromotedAt: { not: null }` pada kedua count.

#### M-36 [P2] [laporan/deposit liability] — Jaminan HELD milik stay yang sudah selesai tidak dihitung sebagai liability
- **Bukti:** `reports.depositLiability` (:152-165) dan agregat finance (:94-98, :242-246) memfilter `status: ACTIVE` — padahal deposit stay COMPLETED/CANCELLED yang belum di-settle (depositStatus HELD) masih utang nyata kepada tenant.
- **Status:** FIX — ganti filter ke `depositStatus: HELD` + `depositPaidAmountRupiah > 0` (tanpa syarat stay ACTIVE) di reports.depositLiability; finance dicatat untuk perbaikan serupa (ESKALASI ringan karena menyentuh beberapa agregat dashboard).

#### M-37 [P3] [laporan/nilai] — Catatan presisi yang perlu dipahami owner
- `overdueAging` memakai nilai penuh invoice (PARTIAL tidak dikurangi pembayarannya) → tunggakan tampil lebih besar.
- `monthlyIncome.outstanding` = tagihan bulan ini − pembayaran bulan ini (pembayaran lintas bulan membuat angka bias). Keduanya sudah berlabel approximation — biarkan, tapi pahami saat membaca.

#### M-38 [INFO] — Gejala M-14 di laporan: penghuni check-in manual TIDAK terhitung okupansi finance (filter promoted). Sembuh otomatis oleh FIX M-14 + backfill.

---

## Batch 7 — Pendukung (notifications ×3, announcements, faqs, analytics, ai, marketing, tenants 530, users 193)

### Yang diverifikasi SEHAT
- **Risiko "app-notification tanpa RolesGuard" GUGUR:** semua query service di-scope `recipientUserId` milik JWT (listMine/markMine/markAll) — user hanya bisa menyentuh notifikasinya sendiri; RolesGuard memang tidak diperlukan di sini.
- faqs: endpoint publik hanya `GET /faqs/public` (read-only, isActive); semua mutasi OWNER/ADMIN.
- ai.service: murni rule-based + cache (TIDAK memanggil provider eksternal, tidak ada biaya/route injeksi), rate-limit 12/menit/user/fitur, disclaimer "tidak mengubah data bisnis". Akses OWNER/ADMIN-only di controller.
- users.service: proteksi OWNER berlapis — non-OWNER tidak bisa membuat/mengubah akun OWNER, tidak bisa memberi role OWNER, tidak bisa mengubah isActive/password akun OWNER; konsistensi role↔tenantId dijaga (sinkron dengan CHECK constraint DB); audit log menandai sensitiveUpdate.
- analytics & marketing: read-only, guard sesuai; katalog publik memakai formula harga yang sama dengan booking.

### Temuan

#### M-39 [P3] [users] — Cek duplikat email pada update bersifat case-sensitive
- **Bukti:** users.service.ts — `create` memakai `mode: insensitive`, `update` memakai `findUnique({ where: { email } })` (exact). Email beda kapital bisa lolos di update lalu membuat dua akun yang sama-sama "match" saat login insensitive (login pakai findFirst insensitive → ambil yang pertama).
- **Status:** FIX kecil — samakan ke insensitive.

---

## Batch 8 — Frontend sweep terarah

### Yang diverifikasi SEHAT
- `api/client.ts`: Bearer dari localStorage, auto-logout+redirect saat 401 (kecuali request login); `AuthContext` membersihkan sesi.
- Routing per-role ketat: setiap rute portal dibungkus `RequireRoles allowed=['TENANT']`; staff/admin/owner sama.
- `utils/pricing.ts` = salinan persis formula backend (multiplier + pembulatan 5 ribu) — satu sumber kebenaran lintas tier.
- Copy "denda" di frontend hanya label tipe line PENALTY & contoh potongan manual — konsisten keputusan D1.

### Temuan

#### M-40 [P2] [frontend/harga publik] — Harga tampil DAILY/WEEKLY memakai kolom tarif mentah, bukan formula yang ditagih
- **Bukti:** `utils/publicRoomDisplay.ts:51-62` — `getPublicRoomRate` DAILY/WEEKLY membaca `room.pricing.dailyRateRupiah`/`weeklyRateRupiah` mentah; backend menagih `calculateRentByPricingTerm` (13%/45% × bulanan, bulat ke atas 5 ribu) dan mengabaikan kolom-kolom itu. Bila kolom tak sinkron (atau 0), harga yang dilihat calon tenant ≠ harga yang ditagih.
- **Status:** FIX — ubah semua cabang term ke formula (fallback kolom hanya bila tarif bulanan 0).

#### M-41 [INFO] — JWT di localStorage = trade-off sadar (risiko XSS exfiltration); dimitigasi CSP ketat di backend & tidak ada penyimpanan refresh token. Tidak ada aksi.
#### M-42 [resolusi M-25] — Rute portal aktual `/portal/stay`; `linkTo: '/portal/my-stay'` di auto-ops (2 lokasi) adalah link mati → FIX.

---

## Ringkasan Akhir

**Skor kesehatan per lini (pasca-audit):** fondasi DB & auth KUAT; jalur uang inti KUAT (regresi pass A lulus semua); auto-ops KUAT secara logika tapi RAPUH secara ketahanan (M-22); booking/huni ada 3 lubang nyata (M-14/M-15/M-16); operasional staf disiplin dengan beberapa guard bolong kecil; akuntansi solid KECUALI expense/wifi yatim (M-33) dan saldo kas manual (M-34); laporan jujur tapi 2 definisi salah (M-35/M-36); frontend sehat dengan 1 bug harga publik (M-40).

**P1 (5):** M-14 check-in manual unpromoted (akar banyak gejala: M-23, M-38) · M-15 renew tanpa lock · M-16 cancel melepas kamar tanpa inspeksi · M-22 auto-ops macet oleh 1 item · M-33 jurnal expense/wifi yatim.
**P2 (11):** M-01, M-02, M-07, M-08, M-09, M-17, M-18, M-26, M-35, M-36, M-40.
**P3 (12):** M-03, M-05*, M-10, M-11, M-12, M-24, M-25/M-42, M-27, M-28, M-29, M-31, M-39. (*M-05 separuh gugur di Batch 4.)

### Daftar ESKALASI (TIDAK untuk AI eksekutor — hanya Fable/owner)
| # | Item | Alasan |
|---|---|---|
| E-1 | M-04 — Guard global APP_GUARD + decorator @Public | refactor lintas controller |
| E-2 | Backfill data: stay ACTIVE hasil check-in manual lama perlu diisi `initialMetersPromotedAt` (setelah FIX-01) | mutasi data produksi, perlu verifikasi kasus per kasus |
| E-3 | M-19 — pencatatan penerimaan jaminan pada check-in manual (DTO+ledger+jurnal) | butuh keputusan desain & alur kasir |
| E-4 | M-34 — saldo kas laporan dihitung dari jurnal, bukan field manual | redesign laporan |
| E-5 | M-36 bagian finance.service (agregat dashboard deposit) | menyentuh beberapa dashboard sekaligus |
| E-6 | M-29 — penyelarasan timezone WIB modul staf | menyentuh banyak perhitungan KPI |
| E-7 | M-30 — round-robin penugasan otomatis staf | keputusan kebijakan owner |
| E-8 | 0 unit test di backend — bangun rangka test untuk jalur uang minimal | proyek tersendiri |
| E-9 | M-31 (hapus kode mati findPublicOne) & M-03 (hard-cap map limiter) | opsional, risiko rendah; kerjakan saat menyentuh file terkait |

---

## Pemetaan Temuan → Tindakan (kontrol silang final)
QC patch: 42/42 blok CARI di `04_FIX_INSTRUCTIONS.md` terverifikasi match **tepat 1×** di file targetnya (scan otomatis 2026-06-12).

| Temuan | Tindakan | Temuan | Tindakan |
|---|---|---|---|
| M-01 | FIX-25 | M-22 | FIX-04 |
| M-02 | FIX-21 | M-23 | tertutup FIX-01 (+E-2 backfill) |
| M-03 | E-9 (opsional) | M-24 | FIX-05 |
| M-04 | E-1 | M-25/M-42 | FIX-06 |
| M-05 | gugur sebagian (Batch 4), sisa INFO | M-26 | FIX-18 |
| M-06 | terjawab (Batch 3/5/6) | M-27 | FIX-19 |
| M-07 | FIX-07 | M-28 | FIX-20 |
| M-08 | FIX-10 | M-29 | E-6 |
| M-09 | FIX-11 | M-30 | INFO/E-7 |
| M-10 | FIX-09a | M-31 | E-9 (opsional) |
| M-11 | FIX-09b | M-32 | tertutup FIX-26 |
| M-12 | FIX-08 | M-33 | FIX-14 + FIX-15 |
| M-13 | INFO (sadar-risiko) | M-34 | E-4 |
| M-14 | FIX-01 (+E-2) | M-35 | FIX-16 |
| M-15 | FIX-02 | M-36 | FIX-17 (+E-5) |
| M-16 | FIX-03 | M-37 | INFO |
| M-17 | FIX-12 | M-38 | INFO (sembuh via FIX-01) |
| M-18 | FIX-13 | M-39 | FIX-22 |
| M-19 | E-3 | M-40 | FIX-26 |
| M-20 | terjawab (Batch 3) | M-41 | INFO |
| M-21 | INFO/P3 kecil | | |
