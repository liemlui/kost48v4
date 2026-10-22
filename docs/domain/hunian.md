# Hunian — Siklus, Renewal, Checkout, Deposit

Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan & invarian siklus huni (dari M05)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [hunian](hunian.md) · [kontrak.md](publik.md#d4c-kontrak) · [keuangan.md](keuangan.md)

> Migrasi dari docs/M05_SIKLUS_HUNI.md (S2.c Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks aturan tidak diubah.
> Kuota utilitas: [keuangan.md](keuangan.md#quota-utilitas-berbasis-periode-sewa-lunas) · Status kamar Fase V: [kontrak.md](publik.md#d4c-kontrak) · Bukti audit: [audit-360-huni-2026-07.md](../arsip/audit-uang-huni-2026-07.md)

## Dossier 11 — Booking & Renewal (normatif)

#### 1. Aturan bisnis
##### Booking
- **DP 30%** × sewa periode (sesuai pricingTerm), non-refundable, hangus bila gagal lunas H+1. Deposit jaminan = `Room.defaultDepositRupiah`, **SELALU tetap** (D-05; admin tak boleh override). Nominal kanonik DP & deposit: [harga.md §7](keuangan.md#d4c-harga).
- **Booking expiry 3 JAM FLAT** semua jalur (D-04) — sudah diterapkan melalui `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`.
- **First-paid-wins**: multi-booking RESERVED tak dibatasi (D4); pembayaran pertama disetujui (DP pun) mengunci kamar + batalkan pesaing.
- **Booking online publik — bukti transfer manual (flow baru, 10 Okt 2026, `BOOKING-ONLINE-MANUAL`):** pembayaran **selalu bukti transfer manual** yang diperiksa **ADMIN/OWNER** — **tanpa** QRIS, virtual account, atau payment gateway (unggah bukti: `POST /api/payment-submissions/submit-with-proof` role TENANT; putusan approve/reject role OWNER/ADMIN). Kamar **terkunci saat DP disetujui**; **DP kadarluasa** mengikuti booking expiry di baris di atas (3 jam flat, D-04) → booking dibatalkan sweep dan **kamar terbuka kembali**. Keputusan lengkap: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `BOOKING-ONLINE-MANUAL`; kontrak kerja: [kerja/TASK-BOOKING-ONLINE.md](../arsip/TASK-BOOKING-ONLINE.md).
- Harga per term memakai **tabel multiplikator kanonik** — angka tidak diulang di sini; lihat [harga.md §2](keuangan.md#d4c-harga). Utilitas term pendek all-in; bulanan+ meter (C2).
- **KTP tidak memblokir check-in**; wajib dilengkapi **setelah** check-in dan diingatkan berulang sampai terverifikasi (keputusan `TRANSPARAN-TENANT`, 19 Okt 2026; detail di dossier 18).
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
| Buat booking portal (DP 30%, lock Tenant+Room) | `tenant-bookings.service.ts` — `createBooking` (DP + INSERT stay di dalamnya) |
| Booking publik (paritas DP/deposit) | `public-bookings.service.ts` — `createPublicBooking`; expiry oleh `auto-ops.service.ts` `runBookingExpiry` |
| Approve/reject booking + notif | `tenant-bookings.service.ts` — `approveBooking` / `rejectBooking`; notif `notifyBookingApproved` / `notifyBookingRejected` |
| Renew request dua fase | `renew-requests.service.ts`: DP PAID → terbitkan invoice pelunasan; pelunasan PAID → finalisasi stay melalui `stays.service.ts` |



#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Checkout request create/approve/reject + notif | `checkout-requests.service.ts` — `createRequest` / `approveRequest` / `rejectRequest`; notif `notifyOwnerAdminOnCreate` / `notifyTenantOnApprove` / `notifyTenantOnReject` |
| Final checkout (blokir tagihan + tiket inspeksi) | `stays.service.ts` — `complete` (tiket inspeksi dibuat di dalamnya) |
| Cancel stay | `stays.service.ts` — `cancel`; **lubang B-08: promoted tak buat tiket** |
| Process deposit (jurnal+ledger blocking) | `stays.service.ts` — `processDeposit`; settlement `settleDepositAgainstOpenInvoicesTx` |
| Deposit ledger (idempotent + reconciliationLite) | `deposit-ledger.service.ts` — `recordDepositReceivedTx` / `recordDepositSettlementTx` (+ reconciliationLite) |
| Forced checkout overstay H+1 | `auto-ops.service.ts` — `runOverstayForcedCheckout` (blokir tagihan + tiket + notif di dalamnya) |
| Sweeper noon/H+1/DP-forfeit (satu pintu) | `auto-ops.service.ts` — `runAllUnlocked` (termasuk `cancelEndedUnpaidStay`) |

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


<a id="d4c-operasional"></a>
## Bagian B — Operasional, staf, notifikasi, auth

Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan operasional harian — aturan tenant, inventaris, staf/tiket/KPI, notifikasi/pengumuman, auth/onboarding — beserta proposal meter listrik/air (spesifikasi IoT dipindah ke [iot.md](ai.md#d4c-iot), B8 23 Sep 2026)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [operasional](hunian.md#d4c-operasional) · [hunian.md](hunian.md) · [keuangan.md](keuangan.md) · [kontrak.md](publik.md#d4c-kontrak)

> Migrasi dari docs/M06_OPERASIONAL.md (B1 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks aturan tidak diubah.
> Indeks dossier — rujukan "dossier 14/15/16/18" dari [hunian.md](hunian.md) menunjuk ke file ini: **14** inventaris & barang kamar · **15** staf/tiket/KPI · **16** notifikasi & pengumuman · **18** auth/KTP/onboarding.
> Riwayat & bukti dipisah: identity dossier, temuan audit, dan task ke history/changelog/2026-06.md; update bertanggal Juli 2026 ke history/changelog/2026-07.md; audit 29 Jul 2026 ke audit/audit-operasional-2026-07.md.
> Duplikasi yang dicurigai (bukan diputuskan) dicatat di [history/laporan-duplikat.md](../arsip/laporan-duplikat.md); isi kembar tidak dihapus pada batch ini.

### Update 2026-06-19 - Fase G AI Operasional

AI operasional hanya untuk OWNER/ADMIN dan selalu manual lewat tombol. Detail implementasi ada di `docs/domain/ai.md`.

- **Ticket assistant:** AI boleh merangkum tiket, menyarankan prioritas, draft note, atau aksi lanjutan. Admin/Owner tetap klik assign/start/close/request-photo secara manual.
- **Inventory assistant:** AI boleh menyusun rekomendasi reorder, stok rendah, atau estimasi pembelian. Mutasi stok, movement, expense, dan perubahan fasilitas tetap melalui endpoint existing dan approval manusia.
- **Staff field report assistant:** AI boleh membantu admin membaca laporan staf dan menyarankan keputusan. Staff tidak mendapat tombol AI berbayar.
- **Tidak ada auto-ops AI:** jangan menambahkan DeepSeek ke cron/sweeper/auto-ops. Auto-ops tetap deterministik dan murah.
- **Audit:** bila saran AI dipakai untuk review laporan/tiket/stok, catat `AuditLog.meta.ai` pada aksi final.

---
### Aturan & Panduan Tenant KOST48 — 2026-06-17

Konten aturan ini akan diisi ke **menu Panduan & Aturan Kos** di portal tenant (MyManualPage) dan halaman publik FAQ. Berdasarkan keputusan owner D-19 (F4-12): FAQ di-seed dari aturan/flow, owner edit via admin FAQ.

> **Salinan bertanggal — bukan aturan kanonik (ditandai 2026-10-21).** Bagian ini disalin 2026-06-17 dan memuat angka yang sudah tidak berlaku: deposit Rp300.000, “1 kamar maksimal 2 orang”, denda merokok Rp200.000, dan aturan hewan versi lama. Aturan yang mengikat ada di dossier hunian/keuangan; panduan tenant `MyManualPage.tsx` sudah disinkronkan 2026-10-21. Jangan menyalin ulang dari bagian ini tanpa memeriksa kanonik — selisihnya dicatat sebagai **F-17** di [TASK-AKTIF](../kerja/TASK-AKTIF.md#d4f-sinkron).

#### A. Profil & Akomodasi KOST48

Kost 48 Surabaya – Akomodasi Nyaman & Terjangkau di Lokasi Strategis. Mencari penginapan harian di Surabaya yang nyaman, terjangkau, dan strategis? Kost 48 Surabaya adalah pilihan tepat! Berlokasi di kawasan eksklusif Pakuwon Indah, kami menawarkan akomodasi yang cocok untuk pekerja mall, tim event, keluarga acara pernikahan, supir eksekutif, peserta lomba UNESA, tamu wisuda, wisatawan transit, hingga tenaga kerja yang hendak ke Jepang.

**Lokasi:** Jl. Hikmah V No. 48, Lontar, Sambikerep, Surabaya.

**Keunggulan:**
- ✅ Dekat Pakuwon Mall & Pusat Perbelanjaan – Hanya 7-10 menit jalan kaki ke Pakuwon Mall (PTC & Supermall), Spazio, Lenmarc
- ✅ Akses Mudah ke UNESA & Acara Akademik – Hanya 10 menit berkendara ke Universitas Negeri Surabaya
- ✅ Dekat RS Lombok 22 Lontar & National Hospital – Cocok untuk keluarga pasien yang butuh akomodasi sementara
- ✅ Lingkungan Eksklusif & Aman – Dikelilingi perumahan elite Pakuwon Indah, Graha Family, Citraland, Bukit Darmo Golf
- ✅ Pilihan Kamar Beragam – Mulai dari Budget, Standard, Economy, hingga Deluxe dengan fasilitas AC/Fan & kamar mandi dalam/luar
- ✅ Fasilitas Lengkap – Wi-Fi gratis, dapur bersama, lounge nyaman, parkir luas, dan pet-friendly
- ✅ Dekat Pusat Transportasi – Transit ideal bagi wisatawan ke Malang atau Bali & akses mudah ke Bandara Juanda (27 km)

**Cocok untuk:**
- Pekerja Mall & Event Crew – Hemat & dekat lokasi kerja
- Tamu Pernikahan – Akomodasi nyaman untuk keluarga pengantin
- Supir Eksekutif – Tempat istirahat terbaik saat bos menginap di hotel mewah
- Peserta Lomba & Wisuda UNESA – Nyaman & dekat kampus
- Menunggu Renovasi Rumah – Tinggal sementara tanpa ribet
- Wisatawan Transit – Istirahat sebelum ke Malang atau Bali
- Backpacker Internasional – Ramah bule dengan harga bersahabat
- Calon Tenaga Kerja ke Jepang – Menginap sambil mengurus izin & pelatihan

#### B. Aturan & Kebijakan — SEWA BULANAN

**Check-in & Check-out:**
- Check-in: 14:00 - 22:00 WIB
- Check-out: Maksimal pukul 12:00 WIB

**Kebijakan Deposit:**
- Deposit kerusakan sebesar Rp 300.000 dibutuhkan saat kedatangan. Pembayaran dilakukan saat pelunasan dan akan dikembalikan sepenuhnya saat check-out, tergantung pada pemeriksaan akomodasi.

**Kebijakan Merokok:**
- Dilarang merokok di dalam kamar. Area merokok tersedia di luar ruangan.
- Pelanggaran akan dikenakan denda Rp 200.000 untuk pembersihan ekstra.

**Kebijakan Anak & Tamu:**
- Anak di bawah 11 tahun menginap gratis jika berbagi tempat tidur dengan orang tua.
- Anak 11 tahun ke atas dihitung sebagai tamu dewasa.
- 1 Kamar Maksimal isi 2 Orang.

**Makanan & Minuman:**
- Dapur bersama tersedia bagi yang ingin memasak. Harap menjaga kebersihan setelah penggunaan.
- Sarapan tidak termasuk dalam tarif kamar (khusus harian).

**Wi-Fi & Fasilitas Umum:**
- Wi-Fi tersedia dengan biaya tambahan Rp 50.000/bulan, Rp 20.000/minggu, atau Rp 5.000/hari per perangkat untuk menjaga kualitas koneksi.
- Lounge bersama dapat digunakan oleh tamu untuk bersantai atau bekerja.

**Parkir:**
- Parkir gratis. Harap memastikan keamanan kendaraan secara pribadi.
- Parkir terbatas, harap informasikan terlebih dahulu jika membawa kendaraan.

**Hewan Peliharaan:**
- Hewan peliharaan diizinkan dengan pemberitahuan sebelumnya.
- Harap memastikan hewan peliharaan tidak mengganggu tamu lain.
- Pemilik hewan peliharaan wajib memberikan uang jaminan Rp 100.000 yang akan dikembalikan jika tidak ada kerusakan.

**Keamanan & Ketertiban:**
- Dilarang membawa dan mengkonsumsi alkohol, narkoba, atau barang ilegal di dalam area penginapan.
- Dilarang membuat kebisingan yang mengganggu tamu lain, terutama setelah pukul 22:00 WIB.
- Pengunjung yang tidak terdaftar dilarang menginap tanpa izin dari pengelola.
- Perilaku yang melanggar norma, seperti perbuatan asusila, sangat dilarang dan dapat dilaporkan ke pihak berwenang.

#### C. Aturan & Kebijakan — HARIAN / MINGGUAN / 2 MINGGUAN

**Check-in & Check-out:**
- Check-in: 14:00 - 22:00 WIB
- Check-out: Maksimal pukul 12:00 WIB

**Kebijakan Deposit:**
- Deposit kerusakan Rp 100.000 atau jaminan KTP dibayarkan saat check-in.
- Dikembalikan sepenuhnya saat check-out setelah pemeriksaan kamar.

**Kebijakan Merokok:**
- Dilarang merokok di dalam kamar. Area merokok di luar ruangan.
- Pelanggaran denda Rp 200.000.

**Anak & Tamu Tambahan:**
- Anak <11 tahun gratis (berbagi tempat tidur).
- Anak ≥11 tahun = tamu dewasa.
- 1 kamar maksimal 2 orang.

**Kebijakan Makanan & Minuman:**
- Dapur bersama tersedia. Harap jaga kebersihan.
- Sarapan tidak termasuk.

**Wi-Fi:**
- Wi-Fi gratis untuk tamu harian.

**Parkir:**
- Parkir gratis, terbatas. Informasikan sebelumnya jika bawa kendaraan.

**Hewan Peliharaan:**
- Diperbolehkan dengan pemberitahuan.
- Deposit Rp 100.000, dikembalikan jika tidak ada kerusakan.

**Keamanan & Ketertiban:**
- Sama dengan aturan bulanan (poin 5–8 di atas).

#### D. SOP Housekeeping — KOST 48 SURABAYA

**Jam Kerja Housekeeping:**
- Senin – Sabtu: 08.00 – 16.00 WIB
- Minggu & Tanggal Merah: sesuai kebutuhan/check-out

**Peralatan Wajib Dibawa:**
| Alat | Keterangan |
|------|-----------|
| Lap Microfiber | Untuk meja, kaca, dan permukaan keras |
| Sabun Pembersih Serbaguna | Wajib pakai setiap kamar |
| Sikat WC & Cairan Pembersih | Untuk kamar mandi |
| Sapu + Pel | Lantai kamar dan lorong |
| Sarung Tangan Karet | Wajib saat bersih kamar mandi |
| Kantong Sampah | Ganti tiap hari |
| Pengharum Ruangan | 1 semprot terakhir sebelum tutup kamar |

**Checklist Pembersihan Kamar (urutan):**
1. Buka gorden, nyalakan lampu dan kipas/AC
2. Rapikan kasur dan lipat selimut/bantal
3. Buang sampah & ganti kantong baru
4. Lap meja, lemari, handle pintu, kaca
5. Sapu & pel lantai
6. Bersihkan toilet, wastafel, lantai kamar mandi
7. Kunci pintu kamar, laporkan bila ada kerusakan/kotoran berat

**Catatan Penting:**
- Dilarang menyentuh barang pribadi penyewa
- Bila menemukan: kunci, HP, uang → segera laporkan ke owner
- Setiap selesai bersih kamar, centang checklist di app

#### E. Room Ready Checklist — KOST 48 SURABAYA

Format checklist yang digunakan petugas setelah kamar selesai dibersihkan dan siap huni:

**A. Kebersihan Kamar:**
| Item | Cek (✔) | Catatan Jika Tidak Sesuai |
|------|---------|--------------------------|
| Kasur rapi & sprei bersih | | |
| Bantal bersih | | |
| Lantai disapu & dipel | | |
| Meja & lemari bebas debu | | |
| Jendela & kaca bersih | | |
| Kamar mandi bersih & kering | | |
| Wastafel & toilet bersih | | |
| Sisa sampah dibuang | | |

**B. Fasilitas dan Fungsi:**
| Item | Cek (✔) | Catatan Jika Rusak / Tidak Aktif |
|------|---------|----------------------------------|
| AC menyala & dingin | | |
| Lampu utama berfungsi | | |
| Colokan listrik normal | | |
| Wi-Fi aktif (tes koneksi HP) | | |
| Kunci pintu berfungsi baik | | |

**C. Foto Dokumentasi (opsional untuk laporan digital):**
- Foto 1: Tampak kasur & meja
- Foto 2: Kamar mandi
- Foto 3: Kondisi umum ruangan

Data petugas: Tanggal, Nomor Kamar, Nama Petugas, Jam Selesai.

---
### Staff Role Scope & Operasional — 2026-06-17

#### A. Scope Pekerjaan Staff
Staff KOST48 hanya mengerjakan 3 area:
1. **Reparasi** — perbaikan kerusakan kamar/fasilitas (tiket MAINTENANCE, KERUSAKAN, KUNCI)
2. **Kebersihan** — housekeeping + room ready checklist (tiket KEBERSIHAN, CHECKOUT_INSPECTION)
3. **Resepsionis** — menyambut tamu datang, antar kunci, info dasar

Staff **TIDAK BOLEH** memulai/menyetujui pemesanan layanan berbayar (WiFi, galon, TV, deposit, dll). Semua layanan berbayar harus melalui admin/owner.

#### B. WiFi & Layanan Tambahan
- **WiFi Order:** Staff hanya bisa melihat status pesanan WiFi. Tombol "Mulai" untuk memulai layanan hanya untuk ADMIN/OWNER. Alternatif: ganti tombol "Pesan" yang setelah di-approve admin → masuk invoice tenant.
- **Layanan Tambahan Lain:** Galon, TV, dll — sama, admin yang memproses. Staff tidak punya akses approve.

#### C. Label Saran
- **STF-SARAN-LABEL**: Ganti semua label "Kirim via Laporan" menjadi "Kirim Saran" di portal tenant. Fungsinya tetap membuat tiket (laporan), tapi judul dibedakan agar tenant tidak ragu memberi masukan non-darurat.

#### D. Tip Staf — Flow Lengkap
1. Tenant selesai interaksi dengan staf (tiket CLOSED)
2. Tenant melihat kartu tip di MyTicketsPage — berisi info e-wallet staf
3. Tenant transfer manual ke e-wallet staf
4. Tenant klik tombol "Saya sudah transfer" → notifikasi ke staff
5. Staff punya **2 hari** untuk konfirmasi (via portal staff):
   - **"Sudah masuk"** → notif balik ke tenant "Terima kasih" + poin tip untuk tenant
   - **"Belum masuk"** → notif ke tenant "Silakan cek kembali"
6. Setelah 2 hari tanpa konfirmasi staff → otomatis dianggap sudah masuk (default grace)
7. Tombol "Terima Kasih" (acknowledge) di portal staff untuk memberi sinyal ke tenant

#### E. Meter View untuk Staff
- Staff bisa melihat dashboard/daftar kamar yang **sudah** dan **belum** catat meter per siklus.
- Tampilkan: kode kamar, tenant, status (SUDAH / BELUM), tanggal catat terakhir.
- Gunakan data dari `MeterReading` — cukup query `MAX(readingAt)` per room.

#### F. Foto Profil Tenant dari KTP
- Saat pertama upload KTP, foto tersebut otomatis dipakai sebagai foto profil tenant.
- Sistem kompres gambar (reuse `compressImageFile` yang sudah ada di frontend).
- Owner/Admin bisa upload ulang foto profil tenant via halaman edit tenant.

---
### Dossier 14 — Inventaris & Barang Kamar (normatif)

##### 1. Aturan bisnis
- **Qty single-writer:** satu-satunya pengubah qty = trigger DB `inventory_movement_sync_qty_trg`; service hanya self-healing (tulis bila beda), bukan penambah kedua.
- **Movement tak boleh diedit** (wajib mutasi koreksi); catatan ≥8 char; ADJUSTMENT ditolak.
- **RoomItem create/ubah-qty langsung DIBLOKIR** — hanya via movement ASSIGN/RETURN.
- **Staf** hanya boleh LAPOR status (DAMAGED/MAINTENANCE/MISSING) + wajib catatan/foto; status final menunggu admin.
- **Status barang saat ASSIGN ditentukan admin**, bukan auto-GOOD.
- **Riwayat barang ditarik (qty 0): hapus record RoomItem**; jejak tetap ada di movement, AuditLog, dan tiket.

##### 5. Invarian, verifikasi, tools
- **Invarian:** `qtyOnHand = stok awal + Σ delta movement` (trigger=single writer); `RoomItem.qty` per (item,kamar) = ΣASSIGN−ΣRETURN, tak pernah negatif; tiap perubahan qty berjejak movement+AuditLog; movement tak pernah diedit (koreksi=movement lawan).
- **UAT regresi F2-5:** (1) kamar 1 kasur + adminReview RETURN qty 3 → HARUS 409; (2) 2 admin paralel approve item sama → 1 sukses 1 konflik; (3) movement resmi RETURN>kamar → 409 (regresi tetap).
- **Pemeriksaan historis I-02:** query InventoryMovement RETURN dari relatedMovement adminReview → cek selisih (belum-publish: dampak retroaktif nihil; tetap fix kode).
- **Tools belum ada (rekomendasi):** inventory turnover, dead-stock (item tanpa movement >90 hari). EOQ tidak relevan (consumable sedikit).
- **Pelajaran arsitektural** (layak masuk CLAUDE.md): setiap penulis qty baru WAJIB lewat util movement resmi — jangan tulis versi longgar.


---
### Dossier 15 — Staf, Tiket & KPI (normatif)

##### 1. Aturan bisnis
- **Tiket lifecycle aktual:** OPEN → IN_PROGRESS → DONE → CLOSED, dengan CANCELLED dari kondisi yang diizinkan.
- **Kategori:** CHECKOUT_INSPECTION, EVICT_OVERSTAY, BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN, MAINTENANCE, KEBERSIHAN, KUNCI, INVENTARIS, KERUSAKAN.
- **Auto-created:** CHECKOUT_INSPECTION (setelah final checkout), EVICT_OVERSTAY (H-day overstay).
- **Staff boleh close** tiket CHECKOUT_INSPECTION → room MAINTENANCE → AVAILABLE (guard keselamatan tetap).
- **Room readiness gate:** tidak AVAILABLE jika: active stay lain, room ≠ MAINTENANCE, kondisi tidak aman.
- **Round-robin assignment (F2-10):** ✅ DISIAPKAN & DORMAN (2026-06-15). `pickStaffAssigneeTx` di `createTicketRecord` — 1 staf → semua ke dia; **≥2 staf → round-robin berbasis beban** (otomatis aktif). **Leaderboard (F3-5):** ✅ `getLeaderboard` + `GET /admin/staff-performance/leaderboard` (`active=false` saat <2 staf; auto-aktif ≥2).

##### 5. Invarian & UAT
- **Invarian:** tiket inspeksi dedupe per stay/room; staff close hanya CHECKOUT_INSPECTION; room tidak AVAILABLE tanpa close safe.
- **UAT:** (1) final checkout → tiket inspeksi muncul; (2) staff close inspeksi → room AVAILABLE; (3) KPI dashboard filter category bekerja; (4) monthRange WIB benar (pasca F2-14).

**Lintas-dossier:** tiket inspeksi → dossier 12 (checkout); staff report inventory → dossier 14; review tenant → dossier 17.


---
### Dossier 16 — Notifikasi & Pengumuman (normatif)

##### 1. Aturan bisnis
- **Notif in-app + PWA Web Push** (D2; push AKTIF sejak F4-2, 2026-06-15). Tenant/staf aktifkan via menu Notifikasi (opt-in, izin browser).
- **Pengumuman: Admin + Owner** boleh publish (J-c). Audiens TENANT = hanya yang OCCUPIED (N-03/D-10: tenant booking TIDAK terima — kode benar).
- **Reminder kontrak: H-10, H-7, H-3, H-1, H-day** (B1 — ✅ SELESAI 2026-06-14, `runContractEndReminders` REMINDER_DAYS `[10,7,3,1,0]`).
- **Push (J-d) SELESAI (F4-2): 4 kelompok event prioritas** — (1) pengingat kontrak, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Implementasi memush SEMUA notif in-app (pushStatus=PENDING saat create) → cakupan ≥ 4 kelompok. Selaras model tenant-pengawas.
- Notif TIDAK pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout di LUAR tx).

##### 5. Konvensi & invarian
- **Konvensi event baru:** penerima eksplisit; linkTo terdalam relevan; dedupe key (recipient, entityType, entityId, title); best-effort never-throw; di LUAR tx bila pasca-commit.
- **Util target:** `notifySafe({recipient,dedupeKey,...})` terpusat (Langkah 1 murah) sebelum outbox push (Phase 3).
- **Prioritas penutupan:** renew (vacancy) > A17 copy (kepercayaan) > payment-submitted (kecepatan kas) > ticket-assign (SLA) > room-ready > wifi.
- **Pola terbaik (template):** `checkout-requests.service.ts` — metode `notifyOwnerAdminOnCreate`.


---
### Dossier 18 — Auth, Fondasi & Onboarding (KTP) (normatif)

##### 1. Aturan bisnis
- **E-1 APP_GUARD global default-deny TERPASANG** (sejak V5.12.2) — controller baru otomatis 401 kecuali `@Public`. (Koreksi: kontrak lama "tidak ada guard global" BASI.)
- **Role: OWNER/ADMIN/STAFF/TENANT.** **OWNER-only (D-17):** (a) tutup/buka periode akuntansi, (b) hapus/nonaktif user & staf, (c) ubah setelan kamar & harga, (d) proses deposit & refund settlement — ADMIN tidak boleh.
- **forgotPassword enumeration-safe** (respons identik); token reset di-hash SHA-256; suspend memutus sesi seketika (jwt.strategy validasi DB/request).
- **Rate limit:** global 300/menit/IP, auth 10/15menit/IP (in-memory; multi-instance perlu store bersama).
- **Onboarding minimal: nama + HP + KTP**; data lain dapat dilengkapi lewat quest gamifikasi.
- **KTP (E1/P1-P4):** upload **saat atau sesudah check-in**; KTP **tidak memblokir check-in/aktivasi** — kewajiban dilengkapi setelah check-in dengan pengingat berulang sampai terverifikasi (keputusan `TRANSPARAN-TENANT`, 19 Okt 2026; gate lama `ktpVerificationGateEnabled` berhenti menjadi penghalang masuk **sejak 22 Okt 2026** — kode tidak lagi membacanya untuk memblokir, hanya tersisa sebagai penanda kebijakan); **irama pengingat: tiap 7 hari kalender sejak check-in** ke akun portal penghuni (dedupe per gelombang → tidak spam) dan **berhenti otomatis** saat KTP terverifikasi, plus **eskalasi ke OWNER/ADMIN setelah hari ke-8** bagi penghuni tanpa akun portal maupun yang belum melengkapi (`KtpReminderSweepService`; pemicu manual `POST /api/auto-ops/run/ktp-reminders`). Pesan pengingat **tidak memuat NIK/foto/alamat**; simpan **terproteksi Bearer-scoped, admin/owner-only, hapus saat tenant keluar** (UU PDP); **cukup FOTO** (verifikasi visual, tidak simpan NIK); verifikasi oleh **OWNER** menurut aturan ini, sedangkan kode kini mengizinkan OWNER/ADMIN — selisih dicatat sebagai F-13 di [TASK-SINKRON-ATURAN](../kerja/TASK-AKTIF.md#d4f-sinkron).
- File security (sudah ada, pola dipakai KTP): magic-byte, rename CSPRNG, anti path-traversal, `private, no-store`.

##### 5. Invarian & verifikasi
- **Invarian:** controller tanpa `@Public` = wajib auth (default-deny); suspend = sesi putus seketika; token reset sekali pakai + berbatas waktu + disimpan sebagai hash; data sensitif (KTP) minimal + terproteksi + dihapus saat keluar.
- **UAT:** (1) controller baru tanpa @Public → 401; (2) suspend tenant → request berikutnya 401; (3) ADMIN coba tutup periode/ubah harga → 403 (pasca F2-16); (4) aktivasi kamar tanpa KTP tetap bisa; KTP menjadi kewajiban pasca check-in (keputusan 19 Okt 2026); (5) forgot-password user tak-ada vs ada → respons identik.
- **Lintas-dossier:** OWNER-only deposit → dossier 12/13; KTP gate aktivasi → dossier 11 (booking); helper konsolidasi → dossier 14.


---
### Proposal — Meter Listrik & Air: Pascabayar Murni (normatif; keputusan owner 2026-06-16)

##### Keputusan inti

1. **Listrik 100% PASCABAYAR. TIDAK ada deposit listrik / saldo / token.**
   - Alasan: deposit listrik = saldo terselubung → menyisakan saldo saat checkout, melawan
     janji marketing. Pakai dulu, bayar kemudian (khusus meter).
2. **Pengaman checkout = DEPOSIT JAMINAN yang sudah ada** (refundable, tetap). Tagihan meter
   periode terakhir yang belum dibayar saat checkout → dipotong dari deposit jaminan, sisanya
   dikembalikan. (Tidak ada jenis deposit baru.)
3. **Invoice meter TERPISAH dari invoice sewa**, tapi bisa **"bayar sekaligus"** (dikelompokkan),
   demi transparansi. (Bukan merge fisik baris.)
4. **Marketing:** "Listrik bukan token/prabayar. Pakai dulu, bayar kemudian. Saat checkout tidak
   ada sisa saldo listrik. Transparan & pro-tenant." (untuk halaman publik/katalog).

##### Aturan siklus meter

- **Jangkar (anchor)** per stay = tanggal tagih (mis. tiap tanggal 25; ikut check-in/renewal).
- **Jendela catat = H-10 → hari-H**. **Telat boleh** (lupa sampai ganti periode tetap valid).
- **Satu invoice meter per siklus.** Siklus diukur dari **tanggal catatan terakhir**, bukan
  kalender. Catatan berikutnya hanya boleh dibuka mulai (jendela H-10 anchor berikutnya).
  Contoh sah: catat 10 Mar lalu 25 Mar = dua siklus berurutan, masing-masing 1 nilai.
- **Pencatat:** staf / admin / owner / **mandiri tenant**.
- **Input listrik & air BERSAMA** (satu form). Baris air hanya jika toggle air ON.

##### Perhitungan

```
pemakaianKwh   = meterSekarang − meterTerakhir
tagihanListrik = max(0, pemakaianKwh − kuotaGratisKwh) × tarifPerKwh
tagihanAir     = (toggle air ON) ? max(0, pemakaianM3 − kuotaGratisM3) × tarifPerM3 : 0
```

- Saat dicatat → **auto-generate invoice meter** (baris ELECTRICITY + WATER bila aktif).
- Invoice sewa/perpanjangan diberi catatan eksplisit:
  *"Belum termasuk listrik/air — tagihan meter terbit terpisah saat dicatat."*

##### Konstanta owner-settable (Settings owner) — nyambung permintaan "konstanta di Settings"

| Kunci | Default | Catatan |
|------|---------|---------|
| `freeElectricityKwhPerMonth` | **30** | jatah gratis listrik / siklus |
| `electricityTariffPerKwhRupiah` | **2500** | tarif kelebihan (kini); per-kamar boleh override |
| `waterMeteringEnabled` | **false** | toggle: air dihitung atau tidak (belum ada meter air) |
| `waterTariffPerM3Rupiah` | (ada) | dipakai bila toggle ON |
| `freeWaterM3PerMonth` | 0 | opsional |

> **Keputusan 19 Okt 2026 (P19):** listrik memakai tarif default **Rp2.500/kWh** melalui setting global (override per kamar tetap boleh, tidak wajib); **air gratis sementara** — `waterMeteringEnabled=false`, tarif 0 — sampai sensor waterflow IoT tersedia, jadi tidak ada tagihan air. Ditinjau saat proyek IoT air berjalan.

Sumber TUNGGAL (hindari duplikasi). Per-kamar tetap bisa override tarif bila perlu.

##### UI

- **/rooms (depan):** saat stay masuk jendela H-10 & meter belum dicatat siklus ini →
  badge **"Catat meter"** di kartu + status kamar. Angka meter terakhir tampil di detail kamar.
- **Form catat meter gabungan** (listrik+air) untuk staf/admin/owner + versi mandiri tenant.
- **"Bayar sekaligus":** kelompokkan invoice sewa + meter yang sama-sama OPEN.

---

### Bagian 6 — IoT Monitoring (dipindah 23 Sep 2026; B8 Tahap 3)

> Isi bagian ini dipindah **apa adanya** ke rumah kanonik IoT: [iot.md](ai.md#d4c-iot) § Bagian 6 — IoT Monitoring (KWH Tuya + Water Flow ESP32). Telemetry tetap monitoring/estimasi dan tidak pernah otomatis menerbitkan tagihan; dasar periode quota ada di [keuangan.md § Quota Utilitas](keuangan.md#quota-utilitas-berbasis-periode-sewa-lunas).

### Lampiran — Peta kode & coverage modul operasional (dari M06)

##### 2. Peta kode (3 jalur sinkron qty)
| Jalur | Lokasi | Lock | Validasi RETURN | Status |
|---|---|---|---|---|
| 1. Movement resmi | `inventory-movements.service.ts` — `create` (dalam transaksi) | ✅ `update` (`lockInventoryQtyTx`) | ✅ `ensureInventoryQtySyncedTx` | 🟢 RUJUKAN EMAS |
| 2. Laporan staf (status only) | `room-items.service.ts` — `updateStatusFromField` | n/a | n/a | 🟢 |
| 3. Admin-review field report (boleh buat movement) | `staff-field-reports.service.ts` — `adminReview` (+ `validateMovement`) | ❌ | ❌ | 🔴 I-02 |

##### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Ticket CRUD + assign/close | `tickets.service.ts` |
| Auto-create CHECKOUT_INSPECTION | `stays.service.ts` — `complete` (pembuatan tiket di dalamnya, dengan dedupe) |
| Staff work queue | `tickets.controller.ts` GET endpoint |
| KPI calculation (resolved rate, avg time) | `tickets.service.ts` / frontend dashboard |
| Staff review (tenant rating) | `reviews` module |

##### 2. Coverage matrix (verifikasi grep)
✅ ada: payment approved/rejected, booking approved/rejected, checkout created/approved/rejected, reminder H-10/H-7/H-3/H-1/H-day, forced-checkout, A17 dua-varian, notif siklus renewal, booking-dibatalkan-sweeper, announcement, review ≤2, overstay-blocked admin, prompt renewal H-10 + fallback admin tenant tanpa portal.
✅ baru (F3-1): ticket-assigned→assignee (saat assignee berubah, skip self), room-ready→OWNER/ADMIN (CHECKOUT_INSPECTION close → kamar AVAILABLE, dedupe).
❌ bolong: wifi-order TIDAK ADA event in-app (tenant pesan via WhatsApp di `WifiOrderPage`).
✅ baru: payment-submitted→OWNER/ADMIN dan prompt-review tenant setelah tiket selesai, keduanya best-effort + dedupe.
✅ RESOLVED (K-6/K-8): ticket-closed BARANG_PINDAH kini ke staf assignee (di luar tx).

##### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Login/me/forgot/reset/change | `auth.service.ts` — `login` / `me` / `forgotPassword` / `resetPassword` / `changePassword` |
| Guard global + @Public | `common/guards/*`, `app.module.ts` (E-1) |
| Rate limit | `common/middleware/rate-limit.middleware.ts` |
| User/tenant CRUD + portal access | `users.service.ts`, `tenants.service.ts` — `findAll` / `findOne` / `setKtpImage` |
| File proof terproteksi (pola utk KTP) | `payment-submissions` proof endpoint + `common/utils/file-signature.util.ts` |

---

> **Auto-Ops Engine (dari M01 §4; dipindah ke rumah kanonik aturan operasional pada koreksi B5, 23 Sep 2026):** teks tidak diubah; nomor bagian mengikuti asalnya.
### 4. Auto-Ops Engine (6 Sweep Service, 18+ Operasi)

Mutex (DB advisory lock `pg_try_advisory_lock(1)`). **Prinsip:** uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi. Lock `FOR UPDATE` + re-cek. Timezone WIB (UTC+7). Struktur awal Fase E dipecah menjadi 5 sweep service; release P2 menambah `AnnouncementSweepService` sebagai service ke-6:

| Sweep Service | Operasi |
|---|---|
| **BookingSweep** | booking expiry, DP forfeit |
| **StaySweep** | overstay forced checkout, post-checkout auto-cancel, noon release, room healer, overstay enforcement |
| **RenewalSweep** | renewal priority expiry, renewal settlement forfeit |
| **AccountingSweep** | rent recognition (PSAK 72), auto-journal reconciliation, recurring expense draft, automatic depreciation, accounting auto-close, notification pruning |
| **MaintenanceSweep** | contract end reminders, SLA escalation, belongings abandonment, AC cleaning, referral rewards, PWA push dispatch |
| **AnnouncementSweep** | dispatch pengumuman aktif yang belum `dispatchedAt`, dedupe per penerima |

Semua operasi dijalankan sequential dalam `runAll()` untuk menghindari race condition double-cancel.

