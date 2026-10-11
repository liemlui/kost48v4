# Data Master & Nilai Default KOST48

Tanggal: 23 September 2026
Status: Kanonik untuk nilai default DEV, konstanta operasional, data master lapangan, dan referensi seed.
Tujuan: Rumah kanonik materi referensi master asal `docs/operations/data-master.md` (data mentah lapangan, nilai default, FAQ, data tenant produksi, audit fasilitas).
Rujukan: [data default & seed DEV pintu masuk](default-dev.md) · [Default & Seed DEV](default-dev.md) · [Produksi & Operasional Harian](produksi.md) · [operasi produksi](deploy-go-live.md)

> **Migrasi batch B9 (23 September 2026):** isi `docs/operations/data-master.md` dipindah ke file ini; teks tidak diubah, hanya tautan relatif yang disesuaikan dengan basis folder tujuan. Batch B9 memindahkan: §2, §2 (Catatan Fisik Kamar), §2 (Fasilitas Per Kamar), §3, §4, §5, §6, §7, §7b, dan §8. Sisa isi M11 ada di [Default & Seed DEV](default-dev.md) (§1a, §1b, §9) dan [Produksi & Operasional Harian](produksi.md) (§ Status penggunaan data untuk go-live, §1c, §7 Data Tenant Produksi, §7b Data Audit Fasilitas Lapangan).
>
> **Batas lingkungan (eksplisit):** DEV (basis data pengembangan port 5433) · UAT (audit non-personal, akun/kredensial tidak ditulis di docs) · **Produksi (data penghuni nyata dan audit lapangan)**. File ini memuat **referensi nilai/nilai default dan data master lapangan**, bukan instruksi seed produksi; status go-live dan data tenant produksi ada di [Produksi & Operasional Harian](produksi.md).

<a id="4-konstanta-operasional-operationalsetting-id1"></a>
<a id="5-layanan-tambahan-additionalservice"></a>
<a id="6-faq-lengkap-37-faq"></a>

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| § Status penggunaan data untuk go-live | [operations/produksi.md](produksi.md) | Batas produksi sebelum go-live |
| §1a Akun Fondasi seed-dev, §1b Akun Audit UAT Non-Personal, §9 Ringkasan Perintah Seed | [operations/default-dev.md](default-dev.md) | DEV + fixture UAT; kredensial tidak ditulis di docs |
| §1c Data Tenant Produksi (GO-LIVE), §7 Data Tenant Produksi per kamar | [operations/produksi.md](produksi.md) | Data penghuni nyata; input lewat UI Owner |
| §2 Kamar (13 kamar nyata), Catatan Fisik Kamar, Fasilitas Per Kamar | File ini | Nilai master lapangan |
| §3 Fasilitas Umum | File ini | Referensi fasilitas |
| §3a Data Lapangan Produksi Owner | [operations/produksi.md](produksi.md) | Ground truth lapangan; belum otomatis masuk DB |
| §4 Konstanta Operasional (`OperationalSetting` id=1), §5 Layanan Tambahan | File ini | Nilai default sistem |
| §6 FAQ Lengkap (37 FAQ) | File ini | Sumber kanonik: `backend/src/modules/faqs/faqs.service.ts` |
| §7b Data Audit Fasilitas Lapangan | [operations/produksi.md](produksi.md) | Hasil audit lapangan; template siap diisi |
| §8 DeepSeek AI — API Key & Konfigurasi | [operations/produksi.md](produksi.md) | Nilai key TIDAK disalin; hanya lokasi |

## Catatan Pemakaian

- Jadikan file ini rumah kanonik nilai master/default; runbook DEV (akun & perintah seed) ada di [Default & Seed DEV](default-dev.md), data produksi/audit lapangan ada di [Produksi & Operasional Harian](produksi.md).
- Heading asli (`## 2. Kamar (13 Kamar Nyata)` … `## 8. DeepSeek AI`) dipertahankan apa adanya; penomoran bagian tidak diubah demi keterlacakan.
- **Batas DEV/UAT/produksi tetap eksplisit:** DEV di `operations/default-dev.md`, UAT non-personal mengikuti berkas audit AO-03, produksi/audit lapangan di `operations/produksi.md`.
- **Keselamatan data:** materi ini memuat data lapangan yang dapat memuat PII; jangan salin ke paket deploy, log, atau artefak publik.
---
## 2. Kamar (13 Kamar Nyata)

Sumber: kost48surabaya.com. Semua kamar saat ini OCCUPIED (per data real 2026-06).

| Kode | Nama     | Kategori | Tipe       | Ukuran   | KM     | Pendingin | Tarif Publik | Tarif Kontrak* | Deposit   | Lantai |
|------|----------|----------|------------|----------|--------|-----------|-------------|----------------|-----------|--------|
| A    | Kamar A  | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.700.000   | 1.700.000      | 500.000   | 1      |
| B    | Kamar B  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000   | 1.500.000      | 500.000   | 1      |
| C    | Kamar C  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000   | 1.600.000      | 500.000   | 1      |
| D    | Kamar D  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000   | 1.500.000      | 500.000   | 1      |
| G    | Kamar G  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| H    | Kamar H  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| I    | Kamar I  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| J    | Kamar J  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000   | 1.500.000      | 500.000   | 1      |
| K    | Kamar K  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000   | 1.600.000      | 600.000   | 1      |
| L    | Kamar L  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000   | 1.600.000      | 600.000   | 1      |
| M    | Kamar M  | STANDARD | REGULAR    | LARGE    | Dalam  | Kipas     | 1.400.000   | 1.200.000      | 500.000   | 1      |
| F1   | Kamar F1 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000   | 1.700.000      | 500.000   | 2      |
| F2    | Kamar F2 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000   | 1.600.000      | 500.000   | 2      |

> **\* Tarif Kontrak** = harga yang dibayar tenant saat ini (berdasarkan kontrak awal saat join, bisa berbeda dari tarif publik).

### Catatan Fisik Kamar

| Kode | Dimensi & Detail                                                                                  |
|------|---------------------------------------------------------------------------------------------------|
| A    | 2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur ukuran 160                               |
| B    | 2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; **Kasur kosong** (tenant tidak mau)                               |
| C    | 2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur ukuran 120                                               |
| D    | 2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur ukuran 140                                                |
| G    | 2m×3,5m (medium); KM Luar bersama; Kasur **belum diaudit**                                                |
| H    | 2m×3,5m (medium); KM Luar bersama; Kasur **belum diaudit**                                                |
| I    | 2m×3,5m (medium); KM Luar bersama; Kasur ukuran 140                                                |
| J    | 2m×3,5m (medium); KM Dalam 1,2m×1,5m; Springbed ukuran 160                                            |
| K    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 180                                             |
| L    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 180                                             |
| M    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 160; Superior/Economy tanpa AC       |
| F1   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; **2 kasur ukuran 90**    |
| F2   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur ukuran 90; Perabot lengkap    |

### Fasilitas Per Kamar (seed via POST /rooms/:id/facilities)

Semua kamar (DELUXE / ECONOMY / STANDARD):
- Kasur Busa Tebal (qty 1, kategori: tidur, publicVisible: true)
- Lemari Baju (qty 1, kategori: perabot, publicVisible: true)
- Gantungan Baju (qty 1, kategori: perabot, publicVisible: true)
- Kipas Angin (qty 1, kategori: pendingin, publicVisible: true)

Kamar ber-AC (A, B, C, D, J, K, L, F1, F2): acWattage 380W (K & L: 450W), acCleanIntervalDays 90.

---

## 3. Fasilitas Umum

| Fasilitas                | Keterangan                                           |
|--------------------------|------------------------------------------------------|
| Parkir luas              | Ruang parkir mobil dan motor                         |
| Dapur bersama            | Area masak + kitchen set                             |
| Air PDAM + tandon        | 2 tandon cadangan 650 liter                          |
| Balkon santai            | Area terbuka untuk istirahat                         |
| Area jemur               | Beberapa titik di area kos                           |
| Taman & area hijau       | Lingkungan teduh dan nyaman                          |

### 3a. Data Lapangan Produksi Owner — Belum Otomatis Masuk DB

Sumber: konfirmasi owner 2026-07-08. Data ini adalah ground truth lapangan awal, tetapi **belum boleh dianggap sudah ada di database produksi** sampai diinput lewat UI/seed/runbook. Jangan masukkan full NIK, foto KTP, password jaringan, token, atau API key ke repo.

**✅ Status NIK per 2026-07: Semua 13 tenant sudah punya NIK lengkap.**
- Dini Widiastutik (Kamar B) ✅ NIK 3275085012800021 — data lengkap, tinggal upload foto KTP via UI
- Theo Wijaya (Kamar I) — nama tampil di sistem; NIK atas nama **Agus Settiyo Budi** ✅ 3571021308860003 — data lengkap

| Area | Data owner-confirmed | Status DB/aplikasi | Target input |
|------|----------------------|--------------------|--------------|
| Kamar F3/F4 | FINAL (owner 2026-07-08): TIDAK ADA — blok F dirombak menjadi F1+F2 | Tidak dibuat di master `Room`; total kamar tetap 13 | — |
| Lampu area bersama | 7 titik: depan poster, teras depan, dapur, lorong, pojok lorong, depan KM belakang, lorong belakang | BELUM jadi inventory/aset | `InventoryItem`/`FixedAsset` bila ingin dilacak, atau checklist operasional |
| CCTV area bersama | 5 titik: depan 2, depan dapur 1, area depan KM belakang 1, lorong belakang 1 | BELUM jadi inventory/aset; wajib review privasi angle kamera | `InventoryItem`/`FixedAsset`; dokumen notice CCTV |
| Bola pemadam api/APAR | Rencana 3-5 titik | BELUM dibeli/dipasang/final | `InventoryItem`/`FixedAsset` + checklist emergency |
| Kamar mandi dalam | F1 closet jongkok; kamar mandi dalam lain closet duduk | BELUM detail per room item | `RoomFacility` + `RoomItem` per kamar |
| Kamar mandi luar | 2 unit: satu closet duduk, satu khusus mandi; bak air plastik besar; tidak ada shower | BELUM ada model khusus area bersama | Checklist operasional; dapat dicatat sebagai facility umum/manual |
| Dapur outdoor | Kran ada, tempat sampah ada, rak piring tidak ada, ventilasi tidak perlu, kompor/selang/regulator/tabung LPG ada | BELUM jadi inventory/aset lengkap | `InventoryItem`/`FixedAsset` untuk kompor/LPG; checklist gas |
| Jemuran bersama | 1 jemuran besar area kamar belakang | BELUM jadi inventory/aset | `InventoryItem` bila perlu dilacak |
| Anak kunci | Perlu daftar master/cadangan per kamar | BELUM diinput | Checklist audit kelengkapan data kamar; catatan room/stay |
| Garansi barang | Jika ada: AC, router, pompa, CCTV, kasur | BELUM terstruktur | `FixedAsset.notes` atau dokumen operasional |
| Foto audit kondisi kamar saat ini | Perlu foto audit setiap kamar sebelum input data produksi | BELUM dibuat | Upload/file operasional; jangan simpan foto mentah di repo |
| Materi cetak | Nomor darurat, emergency flow, denah evakuasi, notice CCTV, aturan penghuni, checklist kamar/fasilitas | BELUM dibuat | Dokumen cetak + portal/manual tenant bila relevan |

Kebijakan owner terkait kerusakan:

- Kerusakan normal/aus/bocor/lampu mati/AC bermasalah/fasilitas mulai tidak layak: owner/staff memperbaiki atau mengganti.
- Kerusakan sengaja, salah pakai berat, kehilangan barang/kunci, atau pelanggaran aturan: direview sebagai tanggung jawab tenant.
- Kondisi kamar saat audit produksi sebaiknya difoto sebagai baseline data yang adil.

Rujukan detail: `docs/arsip/legacy/_expired_root_cleanup/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md`.

## 4. Konstanta Operasional (OperationalSetting id=1)

| Field                         | Nilai Default | Keterangan                                          |
|-------------------------------|---------------|-----------------------------------------------------|
| freeElectricityKwhPerMonth    | 30            | Jatah listrik gratis per bulan (kWh)                |
| electricityTariffPerKwhRupiah | 2.500         | Tarif kelebihan listrik per kWh (Rp)                |
| waterMeteringEnabled          | false         | Toggle meteran air (default off)                    |
| waterTariffPerM3Rupiah        | 0             | Tarif air per m³ (bila meteran aktif)               |
| freeWaterM3PerMonth           | 0             | Jatah air gratis per bulan (m³)                     |
| wifiRupiah                    | 50.000        | Biaya WiFi per perangkat per bulan (Rp)             |
| galonRupiah                   | 20.000        | Harga galon air Voila per galon (Rp)                |
| petDepositRupiah              | 100.000       | Deposit jaminan hewan peliharaan (Rp, refundable)   |
| extraOccupantFeePercent       | 20            | Biaya penghuni tambahan (% tarif/kepala/bulan)      |

---

## 5. Layanan Tambahan (AdditionalService)
| Nama                       | Harga   | Unit              | Keterangan                                        |
|----------------------------|---------|-------------------|---------------------------------------------------|
| WiFi                       | 50.000  | /perangkat/bulan  | Jaga kualitas koneksi                             |
| Galon Air (Voila)          | 20.000  | /galon            | Beli langsung ke pengelola                        |
| TV Tambahan                | 50.000  | /bulan            | Layar datar 17 inci (opsional, konfirmasi dulu)   |
| Deposit Hewan Peliharaan   | 100.000 | /hewan            | Refundable bila tidak ada kerusakan               |

> **Catatan:** Galon = **Rp 20.000** (bukan 15.000). `insert-faqs.js` lama salah — gunakan `faqs.service.ts` sebagai referensi kanonik.
## 6. FAQ Lengkap (37 FAQ)

Sumber kanonik: `backend/src/modules/faqs/faqs.service.ts` → `DEFAULT_FAQS`.
Seed via `POST /api/faqs/seed` (idempoten, aman diulang).

> `insert-faqs.js` sudah USANG (konten beda, galon salah). JANGAN dipakai. Gunakan endpoint seed.

### Kelompok Website (sortOrder 1–18) — dari kost48surabaya.com

| No | sortOrder | Kategori  | Pertanyaan                                                  |
|----|-----------|-----------|-------------------------------------------------------------|
| 1  | 1         | Fasilitas | Fasilitasnya apa saja Kak?                                  |
| 2  | 2         | Lokasi    | Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?       |
| 3  | 3         | Aturan    | Satu kamar bisa untuk berapa orang?                         |
| 4  | 4         | Fasilitas | Apakah tersedia WiFi?                                       |
| 5  | 5         | Fasilitas | Apakah disediakan nasi putih?                               |
| 6  | 6         | Fasilitas | Apakah disediakan dispenser air minum?                      |
| 7  | 7         | Aturan    | Ini kost cewek apa cowok?                                   |
| 8  | 8         | Aturan    | Apakah boleh membawa pasangan atau selingkuhan?             |
| 9  | 9         | Aturan    | Apakah boleh untuk pasangan Nikah Siri?                     |
| 10 | 10        | Aturan    | Apakah kos bebas?                                           |
| 11 | 11        | Aturan    | Apakah boleh membawa hewan peliharaan?                      |
| 12 | 12        | Aturan    | Apakah boleh untuk Pasutri (Pasangan Suami Istri)?          |
| 13 | 13        | Fasilitas | Apakah ada TV di kamar?                                     |
| 14 | 14        | Fasilitas | Apakah tempatnya bersih?                                    |
| 15 | 15        | Lokasi    | Apakah ada kamar kosong?                                    |
| 16 | 16        | Aturan    | Apakah boleh menginap dengan pacar?                         |
| 17 | 17        | Tarif     | Apakah sudah termasuk listrik?                              |
| 18 | 18        | Tarif     | Berapa tarif kamarnya kak?                                  |

### Kelompok Operasional (sortOrder 30–83) — dari aturan bisnis

| sortOrder | Kategori            | Pertanyaan                                                          |
|-----------|---------------------|---------------------------------------------------------------------|
| 30        | Pembayaran          | Bagaimana cara membayar — tunai atau transfer?                      |
| 31        | Pembayaran          | Apakah boleh mencicil pembayaran sewa?                              |
| 32        | Pembayaran          | Apa beda DP (uang muka) dengan deposit jaminan?                     |
| 33        | Pembayaran          | Bagaimana hitungan listrik bila melebihi jatah?                     |
| 40        | Booking             | Bagaimana cara memesan kamar?                                       |
| 41        | Booking             | Berapa lama batas waktu konfirmasi booking?                         |
| 42        | Booking             | Bagaimana jika beberapa orang memesan kamar yang sama?              |
| 50        | Perpanjangan        | Kapan saya bisa memperpanjang sewa?                                 |
| 51        | Perpanjangan        | Bisakah saya membayar di muka beberapa bulan ke depan?             |
| 52        | Perpanjangan        | Apakah harga sewa naik saat saya perpanjang?                        |
| 60        | Checkout & Deposit  | Bagaimana proses keluar (checkout)?                                 |
| 61        | Checkout & Deposit  | Kapan deposit jaminan dikembalikan dan bisakah terpotong?           |
| 62        | Checkout & Deposit  | Jika saya keluar lebih awal, apakah sewa dikembalikan?             |
| 63        | Checkout & Deposit  | Apa yang terjadi bila saya melewati tanggal keluar tanpa perpanjang?|
| 70        | KTP & Privasi       | Apakah saya wajib menyerahkan KTP?                                  |
| 80        | Keluhan & Poin      | Bagaimana cara melapor kerusakan atau keluhan?                      |
| 81        | Keluhan & Poin      | Apakah saya bisa memberi tip ke staf setelah keluhan selesai?       |
| 82        | Keluhan & Poin      | Bagaimana cara mendapatkan dan memakai poin loyalitas?              |
| 83        | Keluhan & Poin      | Bagaimana cara mengaktifkan notifikasi?                             |

**Total: 37 FAQ** (18 website + 19 operasional)

## Salinan data produksi — dipindahkan 11 Okt 2026

Sampai 10 Okt 2026 bagian ini memuat salinan **§3a, §7, §7b, §8** (data produksi, audit fasilitas, DeepSeek AI) yang berasal dari migrasi batch B9 (23 Sep 2026). Tabel **Isi & lokasi kanonik** di atas sudah menyatakan keempatnya berumah kanonik di [operations/produksi.md](produksi.md), jadi salinan di sini adalah duplikat — dan duplikat itu terukur: **224 dari 228 barisnya identik** dengan berkas kanonik.

Salinan itu **dihapus dari berkas ini** dan **isi utuhnya diarsipkan** (bukan dipangkas diam-diam) di [arsip/data-master-bagian-produksi-2026-10-11.md](../arsip/data-master-bagian-produksi-2026-10-11.md), dengan provenance + ledger SHA-256 blok aslinya: `a7ce9499f9ed524b7e6bbc3f046757897c4abd67f7c5e4266dc5838569eb29ae` (243 baris, 10.587 byte). Rujukan pada dokumen lain yang tadinya menunjuk ke salinan itu sudah dialihkan ke [produksi.md](produksi.md).

**Untuk produksi, buka [produksi.md §15–§18](produksi.md).** Yang tetap menjadi milik berkas ini: nilai master lapangan (§2 kamar, §3 fasilitas, §4 konstanta, §5 layanan, §6 FAQ).

## 9. Ringkasan Perintah Seed

Isi lengkap perintah seed ada di [Default & Seed DEV](default-dev.md); bagian ini adalah penunjuk, bukan salinan perintah.

## Appendix — Seed Master Data (diarsipkan)

Prosedur "Patch Tenant Aman" (2026-07-08) sudah tidak tersedia.
Arsip: [m11-seed-master-data-appendix-2026-07-08.md](../arsip/m11-seed-master-data-appendix-2026-07-08.md).
