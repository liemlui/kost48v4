# DEFAULT DATA — Sumber Kebenaran Data KOST48

> **Ini adalah satu-satunya sumber kebenaran** untuk semua data seed, dummy, dan nilai default.
> Seed scripts (`seed-dev-reset.js`, `seed-dev-via-api.js`) dan service seed (`faqs.service.ts`)
> HARUS konsisten dengan file ini. Jika ada perbedaan, file ini yang benar — update script-nya.
>
> Diperbarui: 2026-07-04

---

## 1. Akun & Kredensial

### 1a. Akun Internal (DEV & Produksi)

| Role  | Email                  | Password    | Keterangan                        |
|-------|------------------------|-------------|-----------------------------------|
| OWNER | `owner@kost48.com`     | `Owner#2026`| Dibuat via `golive-setup.js` / `seed-dev-reset.js` |
| ADMIN | `admin@kost48.com`     | `admin123`  | DEV only; produksi buat manual    |
| STAFF | `staff@kost48.com`     | `staff123`  | DEV only; produksi buat manual    |

### 1b. Data Tenant Produksi (GO-LIVE)

**Sumber data:** Owner KOST48, 2026-07. NIK (KTP) sudah diverifikasi.
Email & HP placeholder — akan dilengkapi via **UI Owner → Manajemen Tenant** sebelum aktivasi portal.

| Kamar | Nama                   | NIK                 | Tgl Masuk | Tarif Kontrak/bln | Deposit     | Keterangan               |
|-------|------------------------|---------------------|-----------|-------------------|-------------|--------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| B     | Dini Widiastutik       | 3275085012800021    | 1         | 1.500.000         | —           | DELUXE, AC               |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28        | 1.600.000         | —           | DELUXE, AC               |
| D     | Ade Chandra            | 3173052309720009    | 24        | 1.500.000         | 200.000     | DELUXE, AC               |
| F1    | Yufita Hieng           | 6405025701970003    | 26        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| F2    | Patrick Wilfred        | 3275020504910019    | 8         | 1.600.000         | —           | DELUXE Mezzanine, AC     |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1         | 800.000           | —           | ECONOMY, Kipas            |
| H     | Welly Tanoto           | 3578070811730004    | 10        | 800.000           | —           | ECONOMY, Kipas            |
| I     | Agus Settiyo Budi      | 3571021308860003    | 5         | 800.000           | —           | ECONOMY, Kipas            |
| J     | Lovandra               | 3175070312930003    | 30        | 1.500.000         | —           | DELUXE, AC               |
| K     | Meliana Tamara         | 3578125102000002    | 10        | 1.600.000         | —           | DELUXE, LARGE, AC        |
| L     | Destarika Hasan        | 1671065812020008    | 1         | 1.600.000         | —           | DELUXE, LARGE, AC        |
| M     | Gabriel Excelly P.     | 3511115908030001    | 3         | 1.200.000         | —           | STANDARD, LARGE, Kipas   |

> **Catatan:** `Tgl Masuk` = tanggal hari (bulan bervariasi per tenant — akan dilengkapi via UI).
> **Deposit:** Hanya Ade Chandra (Kamar D) Rp200.000. Sisanya tidak ada deposit.
> **Email & HP tenant** belum tersedia — input via UI Owner sebelum aktivasi portal penghuni.

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
- Theo Wijaya → **Agus Settiyo Budi** (Kamar I) ✅ NIK 3571021308860003 — data lengkap

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

Rujukan detail: `docs/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md`.

---

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

---

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

---

## 7. Data Tenant Produksi — Skenario per Kamar

Data real dari owner. Seed via `seed-prod.js`. Tgl Masuk = tanggal hari (bulan menyusul — akan dilengkapi via UI Owner).

| Kamar | Nama                   | NIK                 | Tgl Msk | Tarif Kontrak | Deposit  | Gender | Keterangan                     |
|-------|------------------------|---------------------|---------|---------------|----------|--------|--------------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26      | 1.700.000     | —        | F      | DELUXE Mezzanine, AC           |
| B     | Dini Widiastutik       | 3275085012800021    | 1       | 1.500.000     | —        | F      | DELUXE, AC                     |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28      | 1.600.000     | —        | M      | DELUXE, AC                     |
| D     | Ade Chandra            | 3173052309720009    | 24      | 1.500.000     | 200.000  | M      | DELUXE, AC                     |
| F1    | Yufita Hieng           | 6405025701970003    | 26      | 1.700.000     | —        | F      | DELUXE Mezzanine, AC           |
| F2    | Patrick Wilfred        | 3275020504910019    | 8       | 1.600.000     | —        | M      | DELUXE Mezzanine, AC           |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1       | 800.000       | —        | F      | ECONOMY, Kipas                 |
| H     | Welly Tanoto           | 3578070811730004    | 10      | 800.000       | —        | M      | ECONOMY, Kipas                 |
| I     | Agus Settiyo Budi      | 3571021308860003    | 5       | 800.000       | —        | M      | ECONOMY, Kipas                 |
| J     | Lovandra               | 3175070312930003    | 30      | 1.500.000     | —        | M?     | DELUXE, AC                     |
| K     | Meliana Tamara         | 3578125102000002    | 10      | 1.600.000     | —        | F      | DELUXE LARGE, AC               |
| L     | Destarika Hasan        | 1671065812020008    | 1       | 1.600.000     | —        | F      | DELUXE LARGE, AC               |
| M     | Gabriel Excelly P.     | 3511115908030001    | 3       | 1.200.000     | —        | F?     | STANDARD LARGE, Kipas          |

> **Catatan:**
> - Gender `?` = perlu konfirmasi owner.
> - Email/HP/occupation → input via UI Owner.
> - **Deposit:** Hanya Ade Chandra (Kamar D) Rp200.000. Sisanya tidak ada deposit.
> - Data tanggal check-in (Tgl Msk) hanya hari; bulan menyesuaikan realitas masing-masing tenant.

---

## 7b. Data Audit Fasilitas Lapangan

> **Status:** Template siap diisi. Data dikumpulkan owner saat audit keliling.
> Kolom `Kondisi` & `Catatan` diisi manual — hasil audit lapangan.
>
> **Audit 2026-07 — Kondisi umum SEMUA KAMAR:**
> - KM dalam: closet standar duduk + jet shower + shower ✅ kondisi prima
> - Ember & gayung: ✅ ada
> - **Gantungan baju**: ✅ ada di setiap kamar & kamar mandi
> - **Tempat sabun**: ✅ ada di setiap kamar mandi
> - Kunci pintu & jendela: ✅ aman, semua ok
> - Plafond & tembok: ✅ baik, beberapa sudah cat ulang
> - Semua yg ada kasur: ✅ ada sprei
> - **Kamar B: kasur kosong** (tenant tidak mau)

### Per Kamar (13 kamar: A–D, F1–F2, G–M)

| Kamar | Item | Ada? | Kondisi | Catatan |
|-------|------|------|---------|---------|
| **A** | Lampu kamar | ✅ | baik | |
| | AC Midea | ✅ | baik, remote ada | |
| | Kasur | ukuran 160 | | |
| | Lemari plastik kecil | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **B** | Lampu kamar | ✅ | baik | |
| | AC Midea | ✅ | baik, remote ada | |
| | Kasur | **kosong** | | tenant tidak mau |
| | Lemari | — | tdk ada | |
| | Meja | — | tdk ada | |
| | Sprei | — | | tdk ada kasur |
| | Bantal | — | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **C** | Lampu kamar | ✅ | baik | |
| | AC Akari | ✅ | baik, remote ada | |
| | Kasur | ukuran 120 | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **D** | Lampu kamar | ✅ | baik | |
| | AC Sharp | ✅ | baik, remote ada | |
| | Kasur | ukuran 140 | | |
| | Lemari | ✅ | tipe? | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset American Standard duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **F1** | Lampu kamar | ✅ | baik | |
| | AC Daikin | ✅ | baik, remote ada | |
| | Kasur | **2 unit ukuran 90** | | |
| | Lemari triplek besar | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset American Standard **jongkok** + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **F2** | Lampu kamar | ✅ | baik | |
| | AC Samsung | ✅ | baik, remote ada | |
| | Kasur | ukuran 90 | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset DBS duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **G** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | **belum diaudit** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **H** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | **belum diaudit** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **I** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | ukuran 140 | | |
| | Lemari plastik | ✅ | | |
| | Meja belajar | ✅ | | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **J** | Lampu kamar | ✅ | baik | |
| | AC LG AV-A5UCY | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 160** | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **K** | Lampu kamar | ✅ | baik | |
| | AC LG AV-A5UCY | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 180** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **L** | Lampu kamar | ✅ | baik | |
| | AC Aqua | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 180** | | |
| | Lemari | ✅ | | |
| | Meja belajar | ✅ | | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **M** | Lampu kamar | ✅ | baik | |
| | Kipas | **2 unit** | | |
| | KM dalam | — | | |
| | Kasur | **Springbed ukuran 160** | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |

### Area Bersama

| Area | Item | Ada? | Kondisi | Catatan |
|------|------|------|---------|---------|
| **Lampu** | Depan poster | 1 | | |
| | Teras depan | 1 | | |
| | Dapur | 1 | | |
| | Lorong | 1 | | |
| | Pojok lorong | 1 | | |
| | Depan KM belakang | 1 | | |
| | Lorong belakang | 1 | | |
| **CCTV** | Depan (2) | 2 | | |
| | Depan dapur | 1 | | |
| | Area depan KM belakang | 1 | | |
| | Lorong belakang | 1 | | |
| **KM Luar** | Closet duduk | 1 | | |
| | Khusus mandi | 1 | | |
| | Bak plastik besar | 2 | | |
| | Ember & gayung | ✅ ada | ✅ prima | |
| | Gantungan baju | ✅ ada | | |
| | Tempat sabun | ✅ ada | | |
| **Dapur** | Kompor + LPG | | | |
| | Kran | | | |
| | Tempat sampah | | | |
| **Lain** | Tandon air | | | |
| | Pompa air | | | |
| | Jemuran besar | | | |
| | APAR/ pemadam | rencana 3-5 | | |
| | Anak kunci cadangan | | | |
| | Kunci pintu & jendela (semua kamar) | ✅ | ✅ aman | |
| | Plafond & tembok | ✅ | ✅ baik, cat ulang | |

> **Data yang masih perlu dilengkapi audit lanjutan:**
> - Ukuran kamar & KM P×L×T — belum diukur
> - Model/PK/watt/serial/tahun AC — via foto label
> - Merek, model, watt kipas — belum dicatat
> - Kasur & lemari G, H — belum diaudit
> - Lemari K — belum diaudit
> - Tipe/bahan lemari D — belum spesifik
> - Jumlah bantal per kamar — inventaris KOST48
> - Jumlah sikat per KM (sikat lantai & kloset) — inventaris KOST48
> - Kepastian guling inventaris (C, F1, I, J, M)
> - **Gudang** — belum diaudit
> - **Ruang umum** — belum diaudit
> - Referensi lengkap: `docs/AUDIT_INVENTARIS_LENGKAP.md`

---

## 8. DeepSeek AI — API Key & Konfigurasi

| Item | Nilai | Lokasi |
|------|-------|--------|
| API Key | `sk-...` (dari platform.deepseek.com) | `backend/.env` `DEEPSEEK_API_KEY=` atau Settings → AI & Biaya (OWNER) |
| Model default | `deepseek-chat` | `backend/.env` `DEEPSEEK_MODEL=` |
| Base URL | `https://api.deepseek.com` | `backend/.env` `DEEPSEEK_BASE_URL=` (fallback) |
| Status | ✅ Terverifikasi | `POST /owner-ai/test-connection` — latency ~1.2s, 18 token |

**Cara pakai:**
1. Daftar di https://platform.deepseek.com → buat API key
2. Tempel di `backend/.env`: `DEEPSEEK_API_KEY=sk-xxx`
3. Atau login OWNER → **Pengaturan → AI & Biaya** → isi key → Simpan (langsung aktif, tanpa restart)
4. Klik **"Tes Koneksi DeepSeek"** untuk verifikasi

> API key dari Settings (DB) lebih aman karena tidak tersimpan di file .env yang bisa ke-commit.
> Env `DEEPSEEK_API_KEY` tetap jadi fallback bila Settings kosong.

---

## 9. Ringkasan Perintah Seed

```bash
# DEV — Reset + seed ulang dari nol:
cd backend
npm run seed:dev:reset     # Bersihkan DB + buat kamar + akun internal
# (pastikan backend dev sudah jalan: npm run start:dev)
npm run seed:dev:api       # Buat tenant + stay + invoice + bayar + tiket + survei

# FAQ (idempoten — aman diulang):
# POST http://localhost:3000/api/faqs/seed  (perlu login OWNER)

# PRODUKSI — input data tenant real (nama, NIK, kamar, tarif):
# 1. Pastikan DB fresh & kamar sudah terbuat (via golive-setup atau seed:dev:reset)
# 2. Jalankan seed-prod:
node scripts/seed-prod.js
# 3. Email/HP/occupation tenant → input via UI Owner → Manajemen Tenant
# 4. Deposit → atur via UI Owner
```

---

*Diperbarui: 2026-07-08 · Sumber: owner KOST48 (data tenant real) + kost48surabaya.com + faqs.service.ts*
