# ATURAN OWNER DEEP (V3) — 11 aturan re-verifikasi per baris; skor naik dari 7/11 (V1) menjadi 8/11 sebagian
**Perbedaan vs V1:** aturan #8 (no partial) ternyata SEBAGIAN sudah dipenuhi kode (gate A18) — V1 menilai ❌ penuh karena membaca versi/penjelasan lama. Aturan #10 separuh termitigasi guard jurnal. Detil evidence di bawah.

## Matriks kepatuhan
| # | Aturan owner | Status | Evidence (file:line) | Sisa pekerjaan |
|---|---|---|---|---|
| 1 | DP 30% × pricingTerm (G4=B) | ✅ | Portal `tenant-bookings.service.ts:157`; publik `public-bookings.service.ts:334` — rumus identik `Math.round((rent*30)/100)`; recalc saat approve hanya bila DP belum dibayar `:342-344` | — |
| 2 | DP non-refundable, hangus 100% (G2=A) | ✅ | Sweeper `auto-ops.service.ts:378-421` (H+1 pk 12 WIB, gerbang :380-382) → `cancelEndedUnpaidStay` mode forfeit :246-310 → jurnal `postDownPaymentForfeitTx` D1100/K4400 dgn guard anti-piutang-fiktif `accounting-posting.service.ts:808-817` | F-13: entryDate=now, bukan tanggal kejadian |
| 3 | DP tidak pindah rebooking (G3=A) | ✅ | DP melekat per Stay (kolom `downPayment*`); stay batal → `downPaymentForfeitedAt` :326; booking baru = Stay baru | — |
| 4 | Room release pk 12:00 H-day (G5=A) | ✅ | `runRoomReleaseAtNoon:164-203` gerbang `jakartaHour>=12` :166-169; satu pintu cancelEndedUnpaidStay | E-6 TZ server mitigasi tetap |
| 5 | Forced checkout sistem + tiket (G1=B) | ✅ | `forceCheckoutOverstay:542-685`: blokir-tagihan → COMPLETED → MAINTENANCE+allowBooking :600-603 → tiket CHK dedupe :605-641 → notif tenant :665-679 | B-07: DRAFT invoice ikut memblokir |
| 6 | Tanpa denda keterlambatan (D1) | ✅ | Tidak ada kode denda; COA 4400 hanya forfeit/potongan manual; copy "denda" nihil | — |
| 7 | Notifikasi in-app → PWA push (D2) | 🟡 | In-app jalan (payment :1488/:1516, booking :979/:1016, checkout :195/:244, reminder auto-ops:482, forced-checkout :671, A17 :840, blocked-checkout admin :717) | Renew = NOL; ticket-assign, wifi, room-ready, sweeper-cancel bolong (lihat 08) |
| 8 | TIDAK partial payment | 🟡 NAIK dari ❌ | Gate dua-nominal-sah `payment-submissions.service.ts:122-135` (DP persis ATAU pelunasan persis); PARTIAL pada booking = tahap DP resmi A18 | Residual B-01: approve tidak re-validasi; invoice renewal masih boleh partial ≤ sisa (:146-159) |
| 9 | Renewal DP 30% fase aman (GAP #2) | ❌ TETAP | `renew-requests.service.ts:77-118` approve → langsung `renewStayInTransaction` (stay diperpanjang seketika); tidak ada status AWAITING_DP, tidak ada fase kamar-tampil-publik, tidak ada grace H+7 | Desain penuh = F2-1 |
| 10 | Admin tak boleh hapus payment OCCUPIED (GAP #3) | 🟡 NAIK dari ❌ | `invoice-payments.service.ts:245` remove DIBLOKIR bila payment berjurnal (`assertNoActivePaymentJournal`); padanya `postPaymentReversalTx` jadi DEAD CODE (F-29) | Payment yang jurnalnya GAGAL/skip (accounting belum siap, periode closed) tetap bisa dihapus saat OCCUPIED → guard promoted/OCCUPIED tetap perlu (F1-2 tetap berlaku) |
| 11 | Refund DP kalah first-paid-wins manual via admin (GAP #4) | ❌ | Notif A17 ADA (`payment-submissions.service.ts:832-852`) tapi copy `:843` = "**Tidak ada dana yang terpotong dari Anda**" — SALAH untuk loser PENDING_REVIEW yang SUDAH transfer (submission di-EXPIRED oleh :781-792); tidak ada instruksi refund manual | W-B03 makin urgent: copy bedakan loser sudah-transfer vs belum |

## Verifikasi per-domain pendukung aturan
- **First paid wins:** `cancelCompetingUnpaidBookingsTx:736-826` — pesaing belum-promoted dibatalkan saat pembayaran PERTAMA (DP pun) disetujui (:693-699), bukan menunggu PAID; invoice pesaing direversal blocking (:779). ✅ lebih ketat dari docs.
- **Kamar terkunci setelah DP:** `expiresAt` dimatikan struktural saat approve pertama (`:521`, M-12) ✅; submission DP saat booking expired ditolak hanya bila DP belum pernah masuk (:89-94, A18) ✅ konsisten.
- **Tagihan = gerbang semua lifecycle:** complete (`stays:546-569`), processDeposit (:837-855), renew (`assertNoOpenInvoicesTx`), renew-request create (`renew-requests:44-54`) — seragam `notIn [PAID, CANCELLED]` (DRAFT ikut menghalangi = disengaja sebagai guard, partner temuan F-09/B-07).
- **Deposit jaminan refundable:** settlement 3 aksi (FULL_REFUND/PARTIAL/FORFEIT) `stays:861-892`, partial wajib habis dibagi (deduction+refund = settlement :886-890), catatan ≥8 char utk potongan/hangus :867-879, jurnal+ledger blocking :928-941 ✅ PSAK liability.
- **Kamar tak pernah AVAILABLE tanpa inspeksi:** complete→MAINTENANCE+tiket ✅; forced checkout→MAINTENANCE+tiket ✅; `releaseRoomAfterBookingCancelTx` cek tiket terbuka ✅ (3 salinan identik di payment-submissions :860-869, auto-ops :905-914 — kandidat refactor); **KECUALI** jalur `stays.cancel` promoted (B-08) yang lupa membuat tiket.

## RECOMMENDATIONS (ordered)
1. F1-2 tetap (guard remove payment OCCUPIED) — kini dengan justifikasi lebih presisi: hanya payment tanpa jurnal yang bisa lolos.
2. F1-1R (revisi): validasi dua-nominal-sah di `approveSubmission` booking path; minta keputusan owner utk invoice renewal partial.
3. W-B03 (copy A17): "Jika Anda sudah terlanjur transfer, dana akan dikembalikan admin secara manual — hubungi pengelola dengan bukti transfer."
4. GAP #2 = satu-satunya aturan owner yang masih ❌ penuh → prioritas desain tertinggi (F2-1).
5. Refactor kecil: satukan `releaseRoomAfterBookingCancelTx` (2 salinan) ke util bersama agar kebijakan tak bisa drift.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Aturan #8 scope partial? → **no-partial MENYELURUH** termasuk renewal/utilitas (D-02) → F1-1R diperluas.
- Aturan #11 refund dicatat? → **YA, di sistem (field bukti transfer balik)** (D-07) → F2-3b.

---

## LAMPIRAN — Uraian verifikasi per aturan (jejak audit lengkap)

### Aturan 1 — DP 30% × pricingTerm
- Rumus portal: `Math.round((agreedRentAmountRupiah * 30) / 100)` — `tenant-bookings.service.ts:157`.
- Rumus publik: identik — `public-bookings.service.ts:334`. Paritas penuh kedua jalur.
- Recalc saat approve: `downPaymentAmountRupiah` dihitung ulang HANYA bila `dpPaidSoFar === 0` (:342-344); bila DP sudah dibayar, tarif TERKUNCI dgn pesan eksplisit (:332-335) — perbaikan di atas spesifikasi M-09.
- Verdict: ✅ penuh, tanpa residual.

### Aturan 2 — DP hangus 100%
- Sweeper: `runDownPaymentForfeit` hanya menyasar stay ber-DP, belum promoted, lewat checkIn H+1, tanpa submission PENDING (`auto-ops.service.ts:389-401`).
- Eksekusi: mode `forfeitDownPayment` di `cancelEndedUnpaidStay` — invoice PARTIAL direversal (blocking), DP dijurnal D1100/K4400, `downPaymentForfeitedAt` diisi (:297-332).
- Anti-piutang-fiktif: forfeit di-skip benign bila pembayaran DP tidak pernah terjurnal (`accounting-posting.service.ts:808-817`).
- Residual: F-13 entryDate=tanggal posting (F3-10).
- Verdict: ✅ dengan 1 catatan higiene tanggal.

### Aturan 3 — DP tidak pindah rebooking
- Kolom `downPayment*` melekat pada Stay; tidak ditemukan SATU PUN jalur yang menyalin nilai DP antar stay (grep `downPaymentPaidRupiah` semua assignment = jalur approve & forfeit saja).
- Verdict: ✅ struktural.

### Aturan 4 — Room release pk 12:00
- Gerbang `jakartaHour >= 12` dihitung dari UTC+7 (`auto-ops.service.ts:166-169`) — tidak bergantung TZ server utk gerbang jam.
- Satu pintu `cancelEndedUnpaidStay` menjamin kebijakan identik dgn job H+1.
- Verdict: ✅; E-6 hanya menyisakan batas-hari (F2-14).

### Aturan 5 — Forced checkout + tiket
- Blokir-tagihan dicek 2×: pre-tx (:548-554) dan dalam tx (:579-583) — race pembayaran tertutup.
- Kamar → MAINTENANCE + `allowBookingWhileCleaning=true` (:600-603); tiket CHK dedupe per stay (:605-641); notif tenant di LUAR tx (:665-679, benar agar tidak terkirim saat rollback).
- Residual: B-07 (DRAFT ikut memblokir + alert harian).
- Verdict: ✅ dengan 1 kebijakan perlu keputusan owner.

### Aturan 6 — Tanpa denda
- Grep `denda|penalty|late fee` di service: hanya COA 4400 (potongan manual/forfeit) dan copy lama yang sudah dihapus. Tidak ada kalkulasi denda otomatis di jalur mana pun.
- Verdict: ✅ penuh.

### Aturan 7 — Notifikasi in-app
- 9 event ternotifikasi rapi; 6 bolong; 2 cacat kualitas (N-01 copy, K-8 penerima). Matriks lengkap di `AUDIT_08_NOTIF.md`.
- Verdict: 🟡 — coverage 14/22.

### Aturan 8 — Tanpa partial payment
- Gate dua-nominal-sah createSubmission (`payment-submissions.service.ts:122-135`): hanya (sisa DP persis) atau (sisa invoice + sisa deposit persis). PARTIAL invoice pada booking = representasi tahap "DP dibayar" yang owner setujui di alur A18 — bukan partial liar.
- Residual 1: approveSubmission tidak re-validasi (B-01) → F1-1R.
- Residual 2: jalur invoice-only (:146-159) menerima nominal apa pun ≤ sisa — invoice renewal bisa PARTIAL menggantung → OPEN QUESTION owner.
- Verdict: 🟡 naik dari ❌ — gate ada di pintu masuk, belum di pintu keputusan.

### Aturan 9 — Renewal DP fase aman
- `approveRequest` (`renew-requests.service.ts:77-118`) memanggil `renewStayInTransaction` SEKETIKA — stay diperpanjang sebelum uang renewal masuk; tidak ada status AWAITING_DP; kamar tidak pernah muncul di katalog selama proses; tidak ada grace H+7; `assertNoOpenInvoicesTx` hanya melindungi tunggakan LAMA, bukan pembayaran renewal BARU.
- Verdict: ❌ penuh — satu-satunya aturan owner yang belum tersentuh. Desain F2-1.

### Aturan 10 — Larangan hapus payment saat OCCUPIED
- Mitigasi yang ADA: `assertNoActivePaymentJournal` di update (:197) dan remove (:245) — payment berjurnal kebal mutasi.
- Lubang yang TERSISA: payment yang jurnalnya skip (accounting belum siap / periode CLOSED / F-25 tanggal) TIDAK berjurnal → bisa dihapus walau kamar OCCUPIED. Konsekuensi: invoice PAID→PARTIAL pada kamar terisi tanpa jejak akuntansi.
- Verdict: 🟡 — F1-2 tetap wajib (guard promoted/OCCUPIED).

### Aturan 11 — Refund kalah first-paid-wins manual
- Mekanisme batal kompetitor: `cancelCompetingUnpaidBookingsTx:736-826` membatalkan SEMUA stay belum-promoted di kamar itu — TERMASUK yang sudah transfer (submission PENDING_REVIEW di-EXPIRED :781-792).
- Notif A17 terkirim ke semua loser dgn copy SERAGAM yang menyangkal adanya dana (:843) — utk loser yang sudah transfer, ini secara faktual salah dan berisiko UUPK (informasi tidak benar).
- Tidak ada mekanisme pencatatan refund manual.
- Verdict: ❌ — F2-3 (copy dua-varian) minimal; pencatatan refund = OPEN QUESTION.

## Skenario UAT kepatuhan (regression harness per aturan — jalankan ulang pasca tiap fase)
| Aturan | Skenario uji | Hasil yang diharapkan |
|---|---|---|
| 1 | Booking MONTHLY tarif 1.700.000 | DP = 510.000 persis di kedua jalur |
| 2 | DP approved lalu diam sampai H+1 pk 12:01 WIB | stay CANCELLED, jurnal DP_FORFEIT D1100/K4400, deposit tak tersentuh |
| 8 | Submit nominal 600.000 saat sisa DP 510.000 & pelunasan 1.690.000 | 409 dua-nominal-sah |
| 8R | (pasca F1-1R) approve submission lama bernominal aneh | 409 di approve |
| 10 | (pasca F1-2) hapus payment pada stay promoted tanpa jurnal | 409 |
| 11 | (pasca F2-3) dua loser: satu pernah transfer, satu tidak | dua copy notif BERBEDA |
| 9 | (pasca GAP #2) approve renewal tanpa DP masuk | stay TIDAK diperpanjang; kamar tampil publik |

## Matriks risiko kepatuhan sisa (ringkas)
| Aturan | Risiko bila dibiarkan | Tingkat |
|---|---|---|
| #8 residual | Approve nominal aneh dari submission lama/race | Rendah-Menengah |
| #9 | Kamar "terjual dua kali" saat renewal vs booking publik; vacancy tak termonetisasi | TINGGI |
| #10 residual | Data occupancy vs pembayaran inkonsisten tanpa jejak | Menengah |
| #11 | Komplain tenant + risiko reputasi/UUPK | Menengah-Tinggi |
| #7 (renew bolong) | Tenant tidak tahu nasib perpanjangan → pindah kost diam-diam | Menengah-Tinggi |

Kesimpulan kepatuhan: sistem MENEGAKKAN kontrak lebih baik daripada yang docs kira — pekerjaan tersisa terkonsentrasi di renewal (#9) dan komunikasi (#7/#11), bukan di mesin uang.

## Definisi selesai kepatuhan "hijau penuh"
1. 11/11 aturan owner ✅ (saat ini 8/11, dgn #8/#10 sebagian).
2. GAP #2 renewal DP terimplementasi + skenario UAT lulus (kamar tampil publik saat DP belum masuk).
3. Copy A17 dua-varian + (bila owner mau) pencatatan refund manual.
4. Guard remove payment OCCUPIED menutup payment tanpa-jurnal.
5. Seluruh 7 skenario UAT kepatuhan di atas lulus pasca tiap fase.
