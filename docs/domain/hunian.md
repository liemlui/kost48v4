# Hunian — Siklus, Renewal, Checkout, Deposit

Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan & invarian siklus huni (dari M05)
Rujukan: [M02](../M02_KEPUTUSAN_OWNER.md) · [M12](../M12_CHECKLIST_CHANGELOG.md) · [M05](../M05_SIKLUS_HUNI.md) · [kontrak.md](kontrak.md) · [keuangan.md](keuangan.md)

> Migrasi dari docs/M05_SIKLUS_HUNI.md (S2.c Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks aturan tidak diubah.
> Kuota utilitas: [keuangan.md](keuangan.md#quota-utilitas-berbasis-periode-sewa-lunas) · Status kamar Fase V: [kontrak.md](kontrak.md#override-fase-v--status-kamar) · Bukti audit: [audit-360-huni-2026-07.md](../audit/audit-360-huni-2026-07.md)

## Dossier 11 — Booking & Renewal (normatif)

#### 1. Aturan bisnis
##### Booking
- **DP 30%** × sewa periode (sesuai pricingTerm), non-refundable, hangus bila gagal lunas H+1. Deposit jaminan = `Room.defaultDepositRupiah`, **SELALU tetap** (D-05; admin tak boleh override). Nominal kanonik DP & deposit: [harga.md §7](harga.md#7-uang-muka-dp--deposit).
- **Booking expiry 3 JAM FLAT** semua jalur (D-04) — sudah diterapkan melalui `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`.
- **First-paid-wins**: multi-booking RESERVED tak dibatasi (D4); pembayaran pertama disetujui (DP pun) mengunci kamar + batalkan pesaing.
- Harga per term memakai **tabel multiplikator kanonik** — angka tidak diulang di sini; lihat [harga.md §2](harga.md#2-formula-multiplikator-pricing_multipliers). Utilitas term pendek all-in; bulanan+ meter (C2).
- **KTP wajib** sebelum aktivasi (E1 — detail di dossier 18).
##### Renewal (GAP #2 — TARGET, lihat desain lengkap di §5)
- Tenant lama yang menyatakan perpanjang punya **prioritas eksklusif sampai hari-H TANPA wajib DP dulu** (L2). Di hari-H belum bayar DP → kamar dibuka publik untuk orang lain (first-paid, mulai tanggal checkout L1). Tenant pilih TIDAK → kamar langsung dibuka.
- DP 30% perpanjangan → pelunasan maks **H+7 dari DP** (R2); grace boleh lewat kontrak (tenant tetap huni; gagal lunas → forced checkout + DP hangus + potong deposit, L4).
- Ditanya via **notif H-10 + boleh ajukan sendiri** (R4).
- **Rent-loyalty (D-16): tenant yang perpanjang tanpa putus kontrak TIDAK mengalami kenaikan harga sewa. Harga hanya naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru).** Ini memperkuat retensi — tenant loyal dilindungi dari inflasi sewa.


#### 5. DESAIN RENEWAL (deliverable F2-1 — state machine penuh)
**State RenewRequest:** `PENDING_DECISION → (YA) AWAITING_DP → (DP≤hari-H) DP_SECURED → (terbit invoice pelunasan, tetap DP_SECURED) → (invoice PAID≤H+7) COMPLETED`; cabang: `(TIDAK) REJECTED_BY_TENANT → kamar dibuka`; `(hari-H tanpa DP) EXPIRED_PRIORITY → kamar dibuka first-paid`; `(gagal lunas H+7) FORFEITED → ditandai + notif admin; forced checkout + DP hangus + potong deposit = MANUAL admin (owner hibrida 2026-06-14, override R5 auto)`.
**Aturan per fase:**
1. Prompt H-10..H-day "perpanjang?" (notif) ATAU tenant ajukan sendiri.
2. YA → AWAITING_DP, invoice DP 30%, kamar TIDAK dibuka publik (prioritas tenant lama s/d hari-H). **Rent-loyalty (D-16):** harga sewa renewal = harga saat ini (tidak naik).
3. TIDAK → kamar tampil publik mulai tanggal checkout.
4. DP ≤ hari-H → DP_SECURED → kamar keluar katalog + batalkan booking baru belum-bayar + notif "diperpanjang penghuni lama" (L3).
5. Hari-H lewat tanpa DP → EXPIRED_PRIORITY → kamar dibuka (first-paid orang baru, mulai tanggal checkout); tenant lama wajib checkout (overstay flow bila tetap tinggal).
6. Admin catat meter → `prepareRenewalSettlementInTransaction` menerbitkan invoice sisa sewa+utilitas dan menyimpan `settlementInvoiceId`; periode stay **belum berubah**.
7. Tenant membayar invoice pelunasan lewat proof flow. Hanya invoice `PAID` dengan `paidAt ≤ settlementDueDate` yang dapat diproses.
8. Admin finalkan → `finalizePreparedRenewalInTransaction`; periode stay baru berubah dan request menjadi `COMPLETED`.
9. Grace H+7 lewat kontrak → tenant tetap huni; gagal lunas → FORFEITED, lalu forced checkout + deposit ditangani manual sesuai keputusan owner.
**Schema additive (owner-approve):** RenewRequest.status (+5 status), downPaymentPaidAt, downPaymentDueDate (=hari-H), settlementDueDate (=DP+7), dan `settlementInvoiceId`.
**Sweeper baru (auto-ops):** AWAITING_DP lewat hari-H → EXPIRED_PRIORITY (OTOMATIS: batalkan invoice DP belum-bayar + reversal jurnal + notif tenant); DP_SECURED gagal lunas H+7 → FORFEITED.
> **KEPUTUSAN OWNER HIBRIDA (2026-06-14) — override R5 auto:** FORFEITED **hanya DITANDAI + notif admin**; forced checkout & potong deposit dilakukan **admin MANUAL lewat flow checkout normal** (BUKAN otomatis sweeper). DP terbayar = hangus (tetap revenue invoice DP PAID). Deadline digate dari `paidAt` invoice aktual: DP harus dibayar ≤ hari-H dan pelunasan ≤ H+7. Prompt keputusan mulai **H-10** + fallback admin utk tenant tanpa portal.
**Invarian:** periode menyambung tanpa gap/overlap; pemesan baru tak pernah mulai < tanggal checkout; kamar tak dibuka selama prioritas tenant lama; DP hangus hanya bila gagal lunas H+7; **rent-loyalty: harga tetap untuk tenant renew.**
**UAT (7 skenario):** (1) YA+DP H-2+lunas H+5 mulus; (2) DP hari-H persis sah; (3) tak DP s/d hari-H → kamar dibuka+overstay; (4) gagal lunas H+7 → forfeit+forced checkout; (5) TIDAK → kamar langsung publik; (6) 2 orang baru → first-paid; (7) race tenant-lama-DP vs buka-kamar → lock prioritas.

---
## Dossier 12 — Checkout, Deposit & Overstay (normatif)

#### 1. Aturan bisnis
- **Checkout request ≤ `plannedCheckOutDate`** (tak boleh extend; perpanjang via renewal dossier 11).
- **Final checkout** blokir bila ada tagihan non-PAID/CANCELLED → kamar MAINTENANCE + tiket CHECKOUT_INSPECTION (dedupe). Gate room-ready: MAINTENANCE→AVAILABLE saat tiket inspeksi ditutup (**staf kini boleh tutup** → kamar siap, guard keselamatan tetap; lihat dossier 15).
- **Deposit jaminan refundable** via settlement (FULL_REFUND/PARTIAL/FORFEIT), jurnal + ledger BLOCKING. Partial wajib habis dibagi (deduction+refund = settlement), catatan ≥8 char untuk potongan/hangus.
- **Denda kerusakan (2026-06-24):** admin bisa mencatat biaya kerusakan (`damageChargeRupiah` + `damageNote`) langsung di form Final Checkout. Sistem otomatis membuat invoice `PENALTY` setelah stay COMPLETED, dan deposit otomatis menutup invoice ini saat `processDeposit()` (Q5: auto-cover semua invoice terbuka).
- **Keluar lebih awal (K-e):** sewa yang sudah dibayar HANGUS (no refund pro-rata); deposit dikembalikan normal.
- **Overstay (Auto-Ops):** reminder H-10..H-day → H-day pk 12:00 kamar publik + tiket EVICT → H+1 pk 12:00 forced checkout → kamar MAINTENANCE + `allowBookingWhileCleaning`. Tagihan belum lunas → TIDAK auto-checkout, admin dapat alert.
- **Tenant kabur (B2):** admin tandai manual bila **nunggak X hari + tak bisa dihubungi** (X konfig, mis. 7) → checkout dini + potong deposit.
- **Forced checkout nunggak (B4):** admin boleh PAKSA checkout + potong sisa dari deposit; **deposit tidak cukup → sisa jadi PIUTANG** tenant (AR), bukan write-off.
- **Barang ditinggal (B3):** batas ambil **30 hari** → status ABANDONED + notif; tindakan fisik manual.


#### 5. Invarian & UAT
- **Invarian:** kamar tak pernah AVAILABLE tanpa tiket inspeksi ditutup (KECUALI lubang B-08 — diperbaiki F2-6); deposit diproses tepat 1× (blocking); Σ ledger = paid − refund − deduction; selama grace renewal sah, tenant lama tak kena overstay enforcement.
- **UAT:** (1) checkout normal → inspeksi → settlement → ledger cocok (mismatch 0); (2) overstay penuh H-3→EVICT→forced H+1→kamar kotor-bisa-dipesan→settlement; (3) overstay nunggak → tidak auto-checkout + alert admin; (4) cancel stay promoted → kamar MAINTENANCE + tiket muncul (pasca F2-6); (5) paksa-checkout nunggak deposit kurang → sisa jadi piutang (pasca F3-16); (6) barang abandoned 30 hari (pasca F3-15).
- **Lintas-dossier:** jurnal deposit/forfeit → dossier 13; tiket inspeksi & tutup-oleh-staf → dossier 15; notif overstay → dossier 16.

## Lampiran — Peta kode (dari M05)

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Buat booking portal (DP 30%, lock Tenant+Room) | `tenant-bookings.service.ts:56`; DP :157; INSERT :173 |
| Booking publik (paritas DP/deposit) | `public-bookings.service.ts:334`; expiry :292 |
| Approve/reject booking + notif | `tenant-bookings.service.ts:247 / :506`; notif :979/:1016 |
| Renew request dua fase | `renew-requests.service.ts`: DP PAID → terbitkan invoice pelunasan; pelunasan PAID → finalisasi stay melalui `stays.service.ts` |



#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Checkout request create/approve/reject + notif | `checkout-requests.service.ts:47/128/201`; notif :294/:354/:392 |
| Final checkout (blokir tagihan + tiket inspeksi) | `stays.service.ts:526`; tiket :605-654 |
| Cancel stay | `stays.service.ts:675`; **lubang B-08: promoted tak buat tiket :768-790** |
| Process deposit (jurnal+ledger blocking) | `stays.service.ts:812`; settlement :861-892; posting :928-941 |
| Deposit ledger (idempotent + reconciliationLite) | `deposit-ledger.service.ts:158/197/351` |
| Forced checkout overstay H+1 | `auto-ops.service.ts:508-685`; blokir tagihan :548; tiket+notif :605-679 |
| Sweeper noon/H+1/DP-forfeit (satu pintu) | `auto-ops.service.ts:214` cancelEndedUnpaidStay |

## Catatan AI & riwayat sewa (normatif)

### Update 2026-06-16 - SI-2/SI-3 Riwayat Sewa

Sesuai analisa PDF, siklus tenant harus terbaca sebagai alur end-to-end: masuk kos, periode berjalan, perpanjangan, invoice, meter, checkout, dan kamar siap jual lagi.

- **SI-2 selesai:** UI renewal menjelaskan basis tanggal konkret: DP 30% harus dibayar <= hari-H/akhir kontrak lama; pelunasan <= 7 hari setelah DP. Guard backend sudah benar, perubahan utama adalah transparansi.
- **SI-3 selesai:** `StayHistoryTimeline` menampilkan kronologi masuk kos, deposit, periode awal, periode perpanjangan, tagihan listrik/air, status lunas/belum, total, dan tautan ke invoice.
- Periode sewa diturunkan dari invoice `RENT` berurut `periodStart`, sehingga riwayat huni dan invoice tetap terhubung.
- Prinsip bisnis: tenant dan admin harus melihat kontrak sebagai narasi yang nyambung, bukan potongan invoice terpisah.

### Update 2026-06-19 - Fase G AI untuk Siklus Huni

AI dalam siklus huni hanya membantu Owner/Admin membaca data dan membuat draft. Detail: `docs/domain/ai.md`.

- **Payment review assistant:** AI boleh memberi rekomendasi APPROVE/REJECT/ASK_MORE_INFO untuk `PaymentSubmission`, tetapi approval final tetap tombol Owner/Admin dan guard no-partial backend tetap menang.
- **KTP OCR validator:** foto KTP tidak dikirim ke DeepSeek. OCR gambar tetap lokal; AI hanya boleh menerima teks OCR untuk menormalkan nama/NIK dan memberi warning. `verifyKtp` tetap Owner-only manual.
- **Renewal/checkout:** AI boleh merangkum risiko renewal, tunggakan, meter, dan deposit. AI tidak boleh memfinalkan renewal, forced checkout, proses deposit, atau membuka kamar.
- **PDP:** snapshot AI untuk tenant memakai ID/kode kamar/status/nominal; jangan kirim email, nomor KTP penuh, foto, atau alamat lengkap kecuali benar-benar dibutuhkan untuk validasi KTP dan tetap berbasis teks OCR.
