# KOST48 V5 — Audit Mendalam Pass A (Uang Masuk) & Pass B (Auto-Ops)
**Versi:** 2026-06-11 — di atas baseline V5.11.0. Companion: `05_FLOW_MAP.md`.
**Metode:** pembacaan penuh `payment-submissions.service.ts`, `invoice-payments.service.ts`, `invoices.service.ts`, `accounting-posting.service.ts` (jalur INVOICE/PAYMENT/reversal), `auto-ops.service.ts`, ditambah verifikasi guard `stays.create` dan `auto-ops.constants.ts`.

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_PASS_AB -->

Severity: P0 = uang/data tenant bisa salah tanpa intervensi; P1 = bug nyata berdampak bisnis, butuh kondisi tertentu; P2 = bug/inkonsistensi nyata berdampak terbatas; P3 = catatan kualitas.

> **Update eksekusi (2026-06-11, paket 1):** A1 ✅, A2 ✅, A4 ✅ sudah diperbaiki (lihat CHANGELOG V5.11.1). A3 direklasifikasi menjadi bagian dari temuan arsitektur **A18 (DP vs deposit)** di bawah — menunggu keputusan owner. A5 masih OPEN menunggu definisi overstay.
> **Update eksekusi (paket 2):** A6 ✅, A7 ✅, A9 ✅, A10 ✅, A12 ✅, A16 ✅.
> **Update eksekusi (V5.12.2):** A14 ✅, A17 ✅ (P3 terakhir yang actionable); Pass C ✅ (ledger sehat + fix forfeit sweeper tercatat di ledger); Pass E sebagian ✅ (rate limiting global+auth); Pass D/F/G terverifikasi ringan — lihat CHANGELOG V5.12.2. Temuan A13/A15 = catatan sadar-risiko, tidak diubah.
> **Update eksekusi (paket 3):** A8 ✅ (helper `reverseCancelledInvoiceJournalsTx` — reversal blocking seragam di 4 jalur cancel payment-submissions), A11 ✅ terverifikasi sudah ter-gate oleh readiness unmapped-operational. Masih OPEN: A13-A15, A17 (P3), A18 + A5 (keputusan owner).

## ⚠️ Terminologi (ketetapan owner, 2026-06-11)
- **DP (uang muka)** = pembayaran untuk **memesan kamar**; bagian dari harga sewa; **hangus** bila gagal kontrak (G2=A).
- **Deposit (uang jaminan)** = uang titipan yang **dicek/diperhitungkan saat checkout** (kerusakan, kebersihan); **refundable** lewat settlement.
- Kedua konsep ini WAJIB dibedakan di kode. Lihat temuan A18.

### A18 ✅ FIXED BACKEND (V5.12.0, frontend menyusul) — Satu field `Stay.depositAmountRupiah` dipakai untuk dua konsep yang bertentangan
- **Fakta kode:**
  - `tenant-bookings.service.ts:149-150` (V5.11.0, G4=B) mengisi `depositAmountRupiah = 30% × agreedRent` dan menyebutnya **DP**.
  - Seluruh hilir memperlakukan field yang sama sebagai **deposit jaminan refundable**: deposit ledger (`TenantDepositLedgerEntry`), jurnal liability `postDepositReceivedForStayTx`, settlement checkout `processDeposit` (FULL_REFUND/PARTIAL/FORFEIT), laporan `deposit-liability`.
  - `Room.defaultDepositRupiah` (konfigurasi jaminan per kamar) tidak lagi dipakai `createBooking`.
  - **Tambahan (paket 2):** check-in manual `stays.create` justru masih memakai `room.defaultDepositRupiah` — dua jalur masuk mengisi field yang sama dengan dua rumus berbeda (30% sewa vs jaminan kamar).
  - `createSubmission` booking path mewajibkan bayar **sewa penuh + 30%** sekaligus — jadi 30% itu berperilaku sebagai jaminan (dibayar di atas harga sewa, dikembalikan saat checkout), bukan DP pesan kamar.
- **Dampak bisnis:** (1) Tidak ada jalur "bayar DP untuk pesan kamar, pelunasan menyusul" — kebijakan forfeit H+1 (G2=A) tidak punya objek (eks-temuan A3). (2) Uang 30% yang oleh owner dimaksudkan DP akan **dikembalikan** saat checkout oleh flow settlement seolah jaminan. (3) Besaran jaminan per kamar (defaultDepositRupiah) terabaikan.
- **Rekomendasi desain (butuh keputusan owner sebelum implementasi):**
  1. Pisahkan field: `downPaymentRupiah`/`downPaymentPaidRupiah` (DP, non-refundable, mengurangi sisa sewa) vs `depositAmountRupiah` (jaminan, dari `Room.defaultDepositRupiah`, refundable).
  2. Alur booking: bayar DP 30% → kamar terkunci sementara → pelunasan sisa sewa + jaminan sebelum/saat check-in → promote.
  3. Gagal lunas H+1 → DP hangus (jurnal pendapatan lain-lain), jaminan (belum dibayar) tidak terlibat.
  4. Ledger jaminan tetap seperti sekarang; DP dicatat sebagai bagian piutang sewa, bukan liability.
- **Pertanyaan untuk owner:** (a) nominal jaminan: pakai `defaultDepositRupiah` per kamar atau rumus lain? (b) pelunasan sisa paling lambat kapan (saat check-in / H-1 / jam tertentu)? (c) DP dibayar via jalur submission yang sama?

---

## 🔴 P0/P1 — Logika bisnis

### A1. ✅ FIXED (V5.11.1) — Pembayaran manual pada invoice booking tidak mengaktifkan kamar → tenant yang sudah bayar bisa di-auto-cancel
- **Lokasi:** `invoice-payments.service.ts:113` (create) vs jalur aktivasi di `payment-submissions.service.ts:519-625`; sweeper di `auto-ops.service.ts:391-405` (expiredBookingWhere), `:151` (noon), `:300` (H+1), dan `payment-submissions.service.ts:922-935`.
- **Pemicu:** Admin mencatat pelunasan invoice booking lewat endpoint pembayaran manual (bukan approve submission). `syncInvoiceStatus` membuat invoice PAID, **tetapi** room tetap RESERVED, stay tidak di-promote, DP tidak dicatat, dan tidak ada PaymentSubmission APPROVED.
- **Dampak:** Semua sweeper memakai filter `paymentSubmissions none APPROVED/PENDING` → booking dianggap "tidak bayar": lewat `expiresAt` (default 3 jam) stay di-CANCEL, kamar dilepas, alasan "tanpa bukti pembayaran valid" — padahal invoice PAID dan kas sudah dijurnal. Invoice PAID tidak ikut dibatalkan (updateMany hanya DRAFT/ISSUED/PARTIAL) → uang diterima, tenant terusir, tanpa jejak anomali.
- **Rekomendasi:** Di `invoice-payments.create`, tolak (atau redirect) bila `invoice.stay.room.status == RESERVED && stay.initialMetersPromotedAt == null`; pesan: "gunakan review pembayaran booking". Alternatif: jalankan jalur aktivasi identik dengan approveSubmission (lebih berisiko duplikasi logika).

### A2. ✅ FIXED (V5.11.1) — Hardening race expiry (fix #3) hanya diterapkan di auto-ops — 3 jalur kembar tidak dilindungi
- **Lokasi:** `payment-submissions.service.ts` — `expireBooking`:836 (validasi di luar tx, tanpa lock), `runExpiryCheck`:940 (kandidat dipilih di luar tx, dalam tx langsung cancel tanpa re-check), `autoCancelRejectedExpiredBookingTx`:1022 (submission ter-lock, tapi stay/room tidak). Bandingkan pola benar di `auto-ops.service.ts:407-423` (`FOR UPDATE OF s, r` + re-check status + re-check submission).
- **Pemicu:** Approve submission berjalan bersamaan dengan expire manual/sweep dari endpoint.
- **Dampak:** Hasil tergantung urutan commit: stay CANCELLED + room AVAILABLE bertabrakan dengan room OCCUPIED + invoice PAID; bisa berakhir kamar AVAILABLE padahal dihuni, atau stay CANCELLED dengan invoice PAID.
- **Rekomendasi:** Ekstrak `expireBookingTx` auto-ops menjadi util bersama dan pakai di keempat jalur (1 implementasi, 1 kebijakan).

### A3. ↪ DIGABUNG KE A18 — Kebijakan "DP hangus H+1" (keputusan owner G2=A) tidak pernah bisa tereksekusi (dead logic)
- **Lokasi:** `auto-ops.service.ts:300-359` `runPostCheckoutAutoCancel` — filter `paymentSubmissions: none APPROVED`, lalu forfeit `paid > 0 ? FORFEITED : HELD` (:327).
- **Analisis:** Satu-satunya jalur yang mengisi `depositPaidAmountRupiah > 0` adalah `approveSubmission` (booking path) — yang sekaligus membuat submission APPROVED. Maka setiap stay dengan DP terbayar pasti ter-exclude oleh filter → cabang FORFEITED tidak pernah jalan. Job ini hanya menangkap booking yang tidak bayar sama sekali (paid=0, tidak ada yang bisa dihangus).
- **Akar masalah lebih dalam:** `createSubmission` booking path mewajibkan nominal **tepat = sisa sewa + sisa DP** (`payment-submissions.service.ts:101`) → tidak ada jalur "bayar DP dulu, pelunasan belakangan". Model "DP 30%" V5.11.0 secara efektif = wajib bayar penuh di muka; skenario G2/G3 (DP masuk, pelunasan gagal) tidak bisa terjadi via portal.
- **Rekomendasi:** Putuskan dulu di level bisnis: (a) memang full-payment-only → hapus job forfeit & sederhanakan; atau (b) izinkan pembayaran DP-only (createSubmission menerima `amount == depositRemaining`) → baru forfeit H+1 bermakna. Jangan biarkan dua kebijakan setengah jalan.

### A4. ✅ FIXED (V5.11.1) — Noon-release vs H+1 auto-cancel: tumpang-tindih target + race antar job + hasil DP berbeda
- **Lokasi:** `auto-ops.service.ts:90-97` (semua job jalan paralel `Promise.all`), `:151-202` (noon: `plannedCheckOutDate <= today`, tanpa cek pembayaran, tanpa forfeit, tanpa re-check status dalam tx), `:300-359` (H+1: `<= kemarin`, cek pembayaran, forfeit).
- **Dampak:** (1) Target H+1 ⊂ target noon → noon hampir selalu menang → DP yang seharusnya hangus malah tetap HELD (memperparah A3). (2) Keduanya bisa memproses stay yang sama dalam run yang sama tanpa lock/re-check → dua kali `stay.update`/`room.update` dan dua audit log untuk satu kejadian. (3) Noon-release tidak memeriksa `paymentSubmissions` sama sekali → dikombinasikan dengan A1, tenant yang lunas via pembayaran manual pasti tergusur pukul 12:00 pada `plannedCheckOutDate`.
- **Rekomendasi:** Jadikan sweeper checkout satu fungsi dengan satu urutan keputusan (sudah bayar? → jangan cancel; belum bayar & H+1 → cancel+forfeit; belum bayar & H-day ≥12:00 → cancel tanpa forfeit), pakai `FOR UPDATE` + re-check seperti pola `expireBookingTx`. Jalankan job sequential, bukan `Promise.all`, untuk job yang menyentuh tabel sama.

### A5. ✅ FIXED (V5.12.0) — EVICT_OVERSTAY (keputusan owner G1=B) kemungkinan unreachable lewat flow normal
- **Lokasi:** `auto-ops.service.ts:209-293` — syarat: room OCCUPIED + ada stay ACTIVE lain ber-submission APPROVED di room sama.
- **Analisis:** Booking baru di kamar OCCUPIED diblokir (`tenant-bookings.service.ts:125` hanya AVAILABLE/RESERVED; `stays.service.ts` manual check-in juga menolak OCCUPIED/RESERVED). Submission APPROVED untuk stay kedua di kamar OCCUPIED tidak bisa terbentuk → tiket penggusuran tidak akan pernah dibuat otomatis. Kebijakan owner berjalan 0%.
- **Rekomendasi:** Definisikan ulang trigger: overstay = stay promoted yang `plannedCheckOutDate` lewat N jam dan belum checkout final (tanpa perlu tenant baru), atau izinkan booking antrian pada kamar OCCUPIED yang kontraknya berakhir.

---

## 🟠 P2

### A6. ✅ FIXED (V5.11.1) — `invoice-payments.update` tanpa lock/validasi dalam transaksi (fix #7 hanya di `create`)
- **Lokasi:** `invoice-payments.service.ts:165-187` — cek jurnal aktif & overpayment dihitung dari snapshot di luar tx, tidak ada `FOR UPDATE` invoice.
- **Dampak:** Dua update bersamaan (atau update + create) bisa lolos overpayment; jurnal bisa terlanjur diposting utk nominal lama.
- **Rekomendasi:** Pindahkan validasi ke dalam tx dengan `SELECT ... FOR UPDATE` invoice, pola sama dengan `create`:129.

### A7. ✅ FIXED (V5.11.1) — Line jurnal reversal pembayaran tanpa deskripsi (bug mapping field)
- **Lokasi:** `accounting-posting.service.ts:765` — `postPaymentReversalTx` memetakan `memo:` padahal `postBalancedJournalTx` membaca `line.description` (:1122) → deskripsi line reversal selalu kosong; `sortOrder` mulai 1 (inkonsisten dengan jalur lain yang mulai 0).
- **Rekomendasi:** Ganti ke `description: \`Reversal: ${line.description ?? ''}\`` dan `sortOrder: index`.

### A8. ✅ FIXED (V5.11.1) — Kebijakan reversal pembatalan invoice tidak konsisten antar 6 jalur cancel
- **Blocking (gagal = transaksi batal):** `auto-ops.expireBookingTx`:456-461; `invoices.cancel`:499-506.
- **Best-effort (gagal = warn saja):** `cancelCompetingUnpaidBookingsTx`:702-708; `expireBooking`:864-870; `runExpiryCheck`:968-974; `autoCancelRejectedExpiredBookingTx`:1059-1065.
- **Dampak:** Invoice ISSUED yang sudah terjurnal lalu dibatalkan via jalur best-effort bisa kehilangan reversal → revenue & piutang overstated permanen, hanya tertulis di log proses.
- **Rekomendasi:** Satu util cancel-invoice-with-reversal; minimal: pre-check jurnal POSTED → jika ada, reversal wajib sukses (pola `invoices.cancel`).

### A9. ✅ FIXED (V5.11.1) — Check-in manual mengizinkan kamar MAINTENANCE / INACTIVE
- **Lokasi:** `stays.service.ts` create — guard hanya menolak OCCUPIED/RESERVED (luar tx dan dalam tx :118).
- **Dampak:** Bypass readiness gate inspeksi checkout (flow 6.4): kamar yang belum lolos inspeksi bisa langsung dihuni; kamar INACTIVE pun bisa di-check-in.
- **Rekomendasi:** Hanya izinkan AVAILABLE (atau minta konfirmasi eksplisit/role OWNER utk override, dengan audit meta).

### A10. ✅ FIXED (V5.11.1) — Booking path `createSubmission` tidak menolak invoice DRAFT
- **Lokasi:** `payment-submissions.service.ts:77` (hanya menolak PAID/CANCELLED; bandingkan jalur invoice-only :108 yang menolak DRAFT).
- **Dampak:** Tenant bisa upload bukti untuk invoice DRAFT; approve pasti gagal di :350 → submission menggantung, kamar tertahan RESERVED sampai expiry.
- **Rekomendasi:** Tambahkan guard DRAFT yang sama di booking path.

### A11. ✅ TERVERIFIKASI MITIGATED — Jurnal kas skip senyap saat periode akuntansi CLOSED/belum ada
- **Lokasi:** `postBalancedJournalTx`:1088-1101 (skip jika period absen/non-OPEN) + semua pemanggil best-effort (mis. `approveSubmission`:439-449).
- **Dampak:** Pembayaran yang diterima di bulan yang periodenya belum dibuat / sudah CLOSED tidak pernah terjurnal; satu-satunya sinyal adalah `logger.warn` + readiness counter. Auto-close (job #6) bisa menutup bulan sebelum backfill dilakukan.
- **Rekomendasi:** Tampilkan counter "jurnal skip" di dashboard finance (bukan hanya log); blokir auto-close bila ada skip yang belum di-backfill utk bulan tsb (cek apakah `unmappedOperationalCount` sudah mencakup ini).
- **Hasil verifikasi (paket 3):** Auto-close SUDAH ter-gate — check `unmapped-operational` (`accounting-period-close.service.ts:355,369,580-597`) menghitung penuh invoice/payment/expense/wifi tanpa jurnal POSTED dan memblokir close; deposit hanya warning (by design). Celah yang tersisa justru pada invoice CANCELLED yang keluar dari hitungan unmapped → ditutup oleh fix A8 (reversal kini wajib sukses di semua jalur cancel).

### A12. ✅ FIXED (V5.11.1) — `syncInvoiceStatus` menulis `paidAt = now()` alih-alih tanggal bayar
- **Lokasi:** `invoice-payments.service.ts:244`; bandingkan `approveSubmission`:425-428 (pakai `submission.paidAt`).
- **Dampak:** Tanggal lunas pada laporan berbeda tergantung jalur pembayaran; backdate payment manual menghasilkan paidAt hari ini.
- **Rekomendasi:** Pakai max(paymentDate) dari payments.

---

## 🟡 P3 — Catatan

| # | Catatan | Lokasi |
|---|---|---|
| A13 | Hapus payment pada invoice PAID menurunkan status invoice (ISSUED/PARTIAL) tapi kamar tetap OCCUPIED & stay promoted — tidak ada guard/peringatan keterkaitan. | invoice-payments.service.ts:209 |
| A14 | `invoices.cancel` cek payments di luar tx (TOCTOU kecil vs create payment bersamaan). | invoices.service.ts:471-476 |
| A15 | Reversal memakai `entryDate = hari ini` — pembatalan lintas bulan menggeser koreksi ke bulan berikutnya (sadari saat baca laporan bulanan). | accounting-posting.service.ts:727,759 |
| A16 | Pesan error `update` payment utk CANCELLED menyebut "overpayment" (copy salah). | invoice-payments.service.ts:180 |
| A17 | `cancelCompetingUnpaidBookingsTx` membatalkan stay pesaing tanpa menyentuh DP-nya (tetap HELD) — masih bisa diproses manual via processDeposit, tapi tidak ada notifikasi ke tenant kalah soal nasib DP. | payment-submissions.service.ts:723-733 |

---

## Ringkasan eksekusi yang disarankan (urutan)
1. **A1 + A4 + A2** — satu paket "sweeper & aktivasi": util bersama cancel-booking (lock + re-check + kebijakan pembayaran), guard manual payment utk booking, sweeper checkout digabung satu fungsi sequential.
2. **A3 + A5** — butuh keputusan owner (model DP-only payment? definisi overstay?) sebelum koding.
3. **A8 + A11** — konsistensi accounting (reversal wajib + visibilitas skip).
4. **A6, A7, A9, A10, A12** — fix kecil terisolasi, bisa satu commit massal.
5. P3 menyusul.

Pass berikutnya sesuai rencana `05_FLOW_MAP.md` §15: **C (deposit end-to-end)**, lalu D (tutup buku), E (akses & keamanan — catat: rate-limit belum ada), F, G.
