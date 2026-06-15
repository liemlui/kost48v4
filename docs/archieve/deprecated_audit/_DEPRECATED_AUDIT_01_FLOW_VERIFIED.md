# FLOW BISNIS DEEP (V3) — 13 flow diverifikasi dgn baca penuh file inti; 1 KOREKSI BESAR atas V1 (GAP #1 sebagian tertutup), 12 temuan flow baru B-01..B-15
**Basis baca penuh:** `payment-submissions.service.ts` (1.564 baris — file terbesar, BUKAN 1.346 seperti docs), `auto-ops.service.ts` (1.031), `stays.service.ts` (1.174), `renew-requests.service.ts` (194), `invoice-payments.service.ts` (283), `invoices.service.ts` (535) + targeted `tenant-bookings.service.ts` / `public-bookings.service.ts` / `checkout-requests.service.ts`.

## Matriks 13 flow × verifikasi
| # | Flow | Verdict | Evidence kunci | Temuan |
|---|---|---|---|---|
| 1 | Auth & Identitas | ✅ (V1 tetap) | `auth.service.ts:28` login; jwt validasi DB/request | refresh token absen = sadar-risiko |
| 2 | Booking publik | ✅ | DP 30% identik portal (`public-bookings.service.ts:334`) | B-10: expiry flat 3 jam (:292) ≠ portal cutoff 21.00 WIB |
| 3 | Booking portal | ✅ | DP 30% `tenant-bookings.service.ts:157`; INSERT raw :173 | B-13 (positif): tarif TERKUNCI setelah DP dibayar :326-344 |
| 4 | Pembayaran (JANTUNG) | 🟡 KOREKSI V1 | Gate A18 dua-nominal-sah `payment-submissions.service.ts:122-135` | B-01: GAP #1 SEBAGIAN TERTUTUP (lihat bawah) |
| 5 | Invoice manual | ✅ | cancel lock+re-cek A14 `invoices.service.ts:489-527`; reversal blocking :520-527 | B-04: GAP #3 separuh termitigasi (lihat 02) |
| 6 | Renew | 🔴 | `renew-requests.service.ts:77-118` approve langsung renew | B-03: GAP #2 utuh + NOL notifikasi (import AppNotification pun tidak ada) |
| 7 | Checkout & deposit | ✅ | `stays.service.ts:526` complete blokir invoice non-PAID; `:812` processDeposit settlement jurnal+ledger BLOCKING :928-941 | B-08: `cancel` stay promoted → MAINTENANCE TANPA tiket inspeksi |
| 8 | Auto-ops 9 job | ✅ tangguh | mutex :89; sequential :94-105; take 100/200/50; try/catch per item; gerbang WIB :166,380,510,741 | B-05/B-06/B-07 (lihat bawah) |
| 9 | Tiket & staf | ✅ (V1) | gate kamar `tickets.service.ts:489+` | assignee = staf id terkecil (auto-ops:610,773) — W-04 tetap |
| 10 | Inventaris | ✅ (V1) | trigger DB single-writer | lihat `AUDIT_05_INVENTORY.md` |
| 11 | Keuangan ops | ✅ | M-33 terverifikasi `expenses.service.ts:81-92`, `wifi-sales.service.ts:69-80` | guard hanya aktif bila jurnal ADA — wajar |
| 12 | Akuntansi | ✅ mesin / 🔴 laporan | 10 fungsi posting balance+idempotent | F-17..F-34 → `AUDIT_04_FINANCE.md` |
| 13 | Laporan & dashboard | 🟡 | F-09 DRAFT-as-revenue terverifikasi 10 lokasi | F-21 sinyal tiket mati; F-27 aging overstated |

## B-01 🔴 KOREKSI V1/FLOW_MAP — GAP #1 partial payment SUDAH SEBAGIAN TERTUTUP
- **Fakta kode sekarang:** `createSubmission` jalur booking HANYA menerima 2 nominal sah (`payment-submissions.service.ts:122-135`): (a) sisa DP persis, atau (b) pelunasan persis = sisa invoice + sisa deposit jaminan. Nominal lain → 409 "Nominal pembayaran harus tepat". Invoice PARTIAL pada booking = TAHAP DP RESMI (A18: DP approved → `expiresAt` dimatikan struktural :521, kamar terkunci) — bukan partial liar.
- **Residual yang masih terbuka:** (1) `approveSubmission:406-430` TIDAK re-validasi dua-nominal-sah — submission yang dibuat sebelum aturan/race perubahan sisa bisa di-approve dengan nominal "aneh" (split rentPortion/depositPortion tetap dihitung, kelebihan ditolak :416-419 tapi kekurangan TIDAK); (2) jalur invoice-only (renewal/utilitas, :146-159) menerima nominal apa pun ≤ sisa → invoice renewal bisa PARTIAL berhari-hari. Rekomendasi: replikasi gate dua-nominal-sah di approve (booking path) + keputusan owner utk invoice renewal (lihat 02 aturan #8).
- **Implikasi ke action plan:** task F1-1 V1 ("tolak jika < sisa invoice + sisa deposit") **JANGAN dieksekusi mentah** — itu akan MEMATIKAN jalur DP 30% yang sah. Ganti dengan validasi dua-nominal-sah di approve. Sudah dikoreksi di `05_ACTION_PLAN.md` F1-1R.

## Temuan auto-ops (baca penuh 1.031 baris)
- **B-05 (docs drift):** noon-release SUDAH mengecek `paymentSubmissions none PENDING/APPROVED` (`auto-ops.service.ts:179-181`) + satu pintu `cancelEndedUnpaidStay` skip invoice PAID/PARTIAL (:255-262) → "Fokus audit" FLOW_MAP §7 (job #3 tak cek submissions) BASI; risiko tenant-approved-belum-promoted di-cancel sudah tertutup.
- **B-06 🟡:** `runPostCheckoutAutoCancel:857` checkoutReason tertulis "DP hangus sesuai kebijakan" padahal job ini TIDAK menyetel `forfeitDownPayment:true` → mode normal skip stay ber-DP (ditangani job DP-forfeit), tidak pernah menghanguskan apa pun; audit meta `depositForfeited: paid` (:361) juga tertulis meski `canForfeitDeposit=false`. Copy & meta menyesatkan auditor.
- **B-07 🟡:** forced checkout overstay diblokir oleh SEMUA invoice non-PAID/CANCELLED termasuk **DRAFT** (:548-554) → satu draft invoice terlupakan = overstay tidak pernah di-checkout otomatis + alert merah admin TIAP HARI (:687-729). DRAFT bukan "uang yang harus diputuskan" — pertimbangkan exclude DRAFT atau auto-cancel DRAFT saat forced checkout.
- **B-14 🟡:** reminder H-7/H-3/H-1/H-0 dedupe per judul-hari (:471-480); jika auto-ops mati tepat di hari gelombang (server down), gelombang itu hilang tanpa catch-up (cek `daysLeft` exact-match :457). Mitigasi murah: REMINDER_DAYS exact → `<=` window dgn dedupe per gelombang.
- ✅ Verified ulang: DP-forfeit H+1 (:378-421, mode forfeit benar), forced checkout H+1 (:508-685, blokir-tagihan + tiket + notif tenant), overstay EVICT (:739-825 dedupe tiket), room healer (:868-896), booking expiry (:932-1030, A1/A2 lock + uang-masuk guard + reversal blocking). Urutan eksekusi runAll :94-105 — forced-checkout SEBELUM noon/healer/evict, accounting auto-close TERAKHIR. SEHAT.

## Temuan stays & pembayaran lain
- **B-08 🟠** `stays.service.ts:768-790`: `cancel` stay promoted → Room MAINTENANCE **tanpa auto-create tiket CHECKOUT_INSPECTION** (bandingkan `complete` :605-654 yang membuat tiket). Gate room-ready (`tickets.close`) tidak akan pernah punya tiket untuk membuka kamar → kamar tersangkut MAINTENANCE sampai admin sadar & buat tiket manual. Fix: salin blok pembuatan tiket dari `complete`.
- **B-09 🟡:** kebijakan posting invoice TIDAK konsisten per pemanggil: `invoices.issue` MELEMPAR bila skip non-setup (`invoices.service.ts:136-137`), tapi check-in manual (`stays.service.ts:361-368`) dan renew (:1140-1147) menelan SEMUA error posting (catch → warn). Invoice check-in/renew yang gagal terjurnal hanya tertangkap readiness unmapped. Satukan kebijakan (pakai `resolveInvoiceAccountingMetadata`).
- **B-11 🟡** `payment-submissions.service.ts:630-674`: promosi meter dedupe per (room, utility, readingAt=tanggal check-in). Bila kamar punya reading lama di tanggal yang sama (tenant sebelumnya checkout+rebooking sehari), snapshot meter tenant baru DIBUANG diam-diam dan baseline memakai angka lama → tagihan utilitas pertama bisa salah. Minimal: log + tandai di response approve.
- **B-12 🟡** `stays.service.ts:78-99`: `update` menerima `plannedCheckOutDate` apa pun > checkInDate — admin bisa set tanggal kemarin → stay langsung jadi target overstay/forced-checkout pada sweep berikutnya tanpa konfirmasi. Tambah guard ≥ hari ini atau konfirmasi eksplisit.
- **B-15 INFO:** reminder kontrak hanya terkirim bila tenant punya user portal aktif (`auto-ops:459-463`) — tenant check-in manual tanpa email TIDAK PERNAH menerima pengingat (in-app only by design D2; dampak: hanya tahu dari staf).
- ✅ `expireBooking` manual + `runExpiryCheck` + `autoCancelRejectedExpiredBookingTx`: lock A2, guard uang-masuk A1, reversal blocking — verified per baris (:959-1304).

## RECOMMENDATIONS (ordered)
1. Koreksi rencana GAP #1: ganti F1-1 → F1-1R (validasi dua-nominal-sah di approveSubmission, JANGAN blok jalur DP). 
2. B-08: tambah auto-ticket inspeksi di `stays.cancel` untuk stay promoted (salin dari complete).
3. B-02 (lihat 02): perbaiki copy notif kalah-cepat — jangan klaim "tidak ada dana terpotong" untuk loser PENDING_REVIEW.
4. GAP #2: desain renewal DP 30% (F2-1) tetap prioritas #1 fase 2 + notifikasi renew (F2-2).
5. Koreksi FLOW_MAP: §3.1 ukuran file & klaim partial-bebas; §7 fokus audit job #3; §4 postPaymentReversalTx (dead code); §14.1 notif renew.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Partial di jalur non-booking? → **YA dilarang juga (no-partial menyeluruh)** (D-02) → F1-1R diperluas ke invoice-only.
- B-07 forced checkout cancel DRAFT? → **YA, checkout jalan + cancel DRAFT** (D-03) → F3-13 butir B-07.

---

## LAMPIRAN — Audit per-file domain uang-masuk (format V3 §5)

### backend/src/modules/payment-submissions/payment-submissions.service.ts (1.564 baris — dibaca penuh)
- **Function:** Jantung sistem — submit bukti bayar, approve (aktivasi kamar + meter + first-paid-wins), reject, expiry sweep, file proof guard.
- **Audit:** Gate dua-nominal-sah A18 (:122-135) = penegakan kontrak di pintu masuk; approve: lock 4-tabel `FOR UPDATE OF ps,s,r,i` (:1370-1426), hitung paid SEGAR dlm tx (:395-404), kelebihan ditolak (:416-419), kekurangan TIDAK (B-01); aktivasi OCCUPIED hanya saat PAID + gate tiket pembersihan (:573-585); promosi meter dedupe per tanggal (B-11 :630-674); kompetitor dibatalkan saat pembayaran PERTAMA approved (:693-699) dgn reversal blocking (:878-907); notif approved/rejected/A17 dedupe (:1488/:1516/:832).
- **Theory ref:** Hukum perdata (kontrak), first-paid-wins fairness, double-entry reversal.
- **Verdict:** ✅ kelas tertinggi; 3 residual (B-01, B-11, N-01).

### backend/src/modules/auto-ops/auto-ops.service.ts (1.031 baris — dibaca penuh)
- **Function:** 9 job otomatis: expiry, reminders, DP-forfeit, forced-checkout, H+1 cancel, noon release, healer, evict, auto-close.
- **Audit:** mutex+sequential (:89-105); satu pintu `cancelEndedUnpaidStay` dgn mode forfeit eksplisit (:214-370); semua lock+re-cek+money-guard+reversal-blocking; gerbang WIB 4 job; take 50-200; try/catch per item. Temuan B-05 (docs basi), B-06 (copy forfeit palsu :857), B-07 (DRAFT blokir :548), B-14 (reminder exact-day :457).
- **Theory ref:** Scheduling optimization; fail-safe automation ("uang masuk = stop otomatisasi").
- **Verdict:** ✅ paling tangguh; 3 catatan kecil.

### backend/src/modules/stays/stays.service.ts (1.174 baris — dibaca penuh)
- **Function:** Lifecycle stay: create (check-in manual + portal user + invoice + meter + deposit E-3), update, complete, cancel, processDeposit, renew (tx-able).
- **Audit:** create = transaksi terpadat (lock kamar, guard tiket pembersihan, deposit ledger blocking + jurnal best-effort, invoice ISSUED, meter baseline, portal user) — solid; complete blokir tagihan + tiket inspeksi dedupe; **cancel promoted TIDAK membuat tiket inspeksi (B-08)**; processDeposit settlement jurnal+ledger BLOCKING (:928-941) + partial wajib habis dibagi (:886-890); renew lock M-15 + periode kontinu.
- **Theory ref:** State machine integrity; TQM gate.
- **Verdict:** ✅ dengan 1 lubang gate kamar (B-08) + B-09/B-12.

### backend/src/modules/tenant-bookings/tenant-bookings.service.ts (36.9KB — targeted)
- **Function:** Booking portal: create (raw SQL insert + DP 30%), approve (meter+tarif), reject, cancel-by-tenant, findMine, notif.
- **Audit:** DP 30% (:157); expiresAt cutoff 21.00 WIB via `calculateBookingExpiry` (:161); tarif terkunci pasca-DP (:326-344, B-13 positif); notif approved/rejected dedupe never-throw (:959-1025).
- **Theory ref:** Anchoring harga (tarif terkunci), error prevention.
- **Verdict:** ✅.

### backend/src/modules/tenant-bookings/public-bookings.service.ts (16.7KB — targeted)
- **Function:** Booking publik tanpa login: buat Tenant+User+Stay sekaligus.
- **Audit:** paritas DP 30% & deposit (:333-334); expiry FLAT `hoursFromNow(BOOKING_REVIEW_DEADLINE_HOURS)` (:292) ≠ kebijakan cutoff portal (B-10); bookingSource hardcode WEBSITE (M-08).
- **Theory ref:** Konsistensi kebijakan lintas kanal.
- **Verdict:** ✅ dengan 1 asimetri kebijakan kecil.

### backend/src/modules/renew-requests/renew-requests.service.ts (194 baris — dibaca penuh)
- **Function:** Pengajuan perpanjangan tenant + keputusan admin.
- **Audit:** guard berlapis di create (stay aktif, milik sendiri, blokir saat checkout pending, blokir tunggakan, anti-dobel-pending :22-61) ✅; approve lock FOR UPDATE lalu LANGSUNG renew (:78-118) = GAP #2; reject polos; NOL notifikasi (import pun tidak ada).
- **Theory ref:** Subscription retention (churn risk).
- **Verdict:** 🔴 area paling tertinggal dari aturan owner.

### backend/src/modules/checkout-requests/checkout-requests.service.ts (14.1KB — targeted notif & guard)
- **Function:** Pengajuan checkout + keputusan admin + 3 jalur notifikasi.
- **Audit:** create guard tunggakan; notifyOwnerAdminOnCreate (:294-345, Promise.allSettled) = pola admin-notify TERBAIK di codebase (bahan salin F2-2/F3-2); approve/reject notif tenant (:354/:392).
- **Verdict:** ✅ teladan.

### backend/src/modules/invoices/invoices.service.ts + invoice-payments.service.ts
- Lihat lampiran `AUDIT_04_FINANCE.md` (domain irisan) — issue/cancel blocking-reversal ✅; remove-payment guard jurnal ✅ + lubang F1-2.

## Tabel keputusan kebijakan yang DITEMUKAN tertanam di kode (untuk diketahui owner)
| Kebijakan implisit | Lokasi | Selaras aturan owner? |
|---|---|---|
| Pembayaran pertama approved (termasuk DP) langsung membatalkan semua pesaing | payment-submissions:693 | ✅ lebih ketat dari "first PAID wins" — first APPROVED wins |
| Submission DP pada booking yang sudah expired ditolak HANYA bila DP belum pernah masuk | :89-94 | ✅ A18 |
| Booking publik: 1 stay ACTIVE per tenant ditegakkan konstrain DB | bootstrap.sql uidx | ✅ |
| Kamar bekas overstay: pelunasan (bukan DP) yang menunggu tiket pembersihan ditutup | :573-585 | ✅ keputusan sadar |
| Forced checkout TIDAK berjalan bila ada tagihan apa pun (termasuk DRAFT) | auto-ops:548 | 🟡 B-07 — konfirmasi |
| Deposit legacy partial saat auto-cancel dibiarkan HELD (bukan forfeit) | auto-ops:314-317 (M-24) | ✅ constraint DB |

## Invarian flow yang dipegang seluruh sistem (hasil sintesis — pegang utk audit berikutnya)
1. Uang masuk (submission PENDING/APPROVED atau invoice PAID/PARTIAL) = otomatisasi BERHENTI; hanya manusia yang boleh membatalkan.
2. Stay promoted tidak pernah dibatalkan/diubah oleh job mana pun — hanya complete/cancel manual atau forced-checkout overstay.
3. Setiap CANCELLED yang menyentuh invoice berjurnal WAJIB reversal sukses dalam tx yang sama (5 jalur terverifikasi).
4. Kamar tidak pernah AVAILABLE tanpa tiket inspeksi ditutup — KECUALI lubang B-08 (stays.cancel promoted).
5. Satu tenant satu stay ACTIVE; satu kamar satu stay promoted (constraint DB, bukan cuma kode).
6. expiresAt hanya bermakna sebelum uang pertama; setelahnya deadline = sweeper H+1.
7. Notifikasi tidak pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout :665) — event baru wajib ikut.
8. Semua lock memakai `FOR UPDATE OF` multi-tabel eksplisit (ps,s,r,i) — urutan konsisten mencegah deadlock antar jalur.
