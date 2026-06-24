# DEFAULT DATA — Sumber Kebenaran Data KOST48

> **Ini adalah satu-satunya sumber kebenaran** untuk semua data seed, dummy, dan nilai default.
> Seed scripts (`seed-dev-reset.js`, `seed-dev-via-api.js`) dan service seed (`faqs.service.ts`)
> HARUS konsisten dengan file ini. Jika ada perbedaan, file ini yang benar — update script-nya.
>
> Diperbarui: 2026-06-24

---

## 1. Akun & Kredensial

### 1a. Akun Internal (DEV & Produksi)

| Role  | Email                  | Password    | Keterangan                        |
|-------|------------------------|-------------|-----------------------------------|
| OWNER | `owner@kost48.com`     | `Owner#2026`| Dibuat via `golive-setup.js` / `seed-dev-reset.js` |
| ADMIN | `admin@kost48.com`     | `admin123`  | DEV only; produksi buat manual    |
| STAFF | `staff@kost48.com`     | `staff123`  | DEV only; produksi buat manual    |

### 1b. Akun Tenant Dummy (DEV only)

Format email: `{slug}.tenant@kost48.test` · Password semua: `Tenant#2026`

| Kamar | Nama              | Email Login                         | Slug    |
|-------|-------------------|-------------------------------------|---------|
| A     | Maya Pratiwi      | `maya.tenant@kost48.test`           | maya    |
| B     | Dimas Saputra     | `dimas.tenant@kost48.test`          | dimas   |
| C     | Cindy Wijaya      | `cindy.tenant@kost48.test`          | cindy   |
| D     | Hendra Gunawan    | `hendra.tenant@kost48.test`         | hendra  |
| G     | Gita Lestari      | `gita.tenant@kost48.test`           | gita    |
| H     | Indah Permata     | `indah.tenant@kost48.test`          | indah   |
| I     | Bayu Nugroho      | `bayu.tenant@kost48.test`           | bayu    |
| J     | Karin Salsabila   | `karin.tenant@kost48.test`          | karin   |
| K     | Lani Kusuma       | `lani.tenant@kost48.test`           | lani    |
| L     | Rizky Ramadhan    | `rizky.tenant@kost48.test`          | rizky   |
| M     | Putri Anggraini   | `putri.tenant@kost48.test`          | putri   |
| F1    | Fajar Maulana     | `fajar.tenant@kost48.test`          | fajar   |
| F2    | Sari Melati       | `sari.tenant@kost48.test`           | sari    |

> **Catatan:** DB saat ini mungkin berisi seed LAMA dengan format `tenant.kamar{X}@kost48-dummy.com` / `tenant123`.
> Jalankan `npm run seed:dev:reset` lalu `npm run seed:dev:api` untuk migrasi ke format baru.

---

## 2. Kamar (13 Kamar Nyata)

Sumber: kost48surabaya.com. Semua kamar saat ini OCCUPIED (per data real 2026-06).

| Kode | Nama     | Kategori | Tipe       | Ukuran   | KM     | Pendingin | Tarif/bln  | Deposit   | Lantai |
|------|----------|----------|------------|----------|--------|-----------|------------|-----------|--------|
| A    | Kamar A  | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.700.000  | 500.000   | 1      |
| B    | Kamar B  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000  | 500.000   | 1      |
| C    | Kamar C  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000  | 500.000   | 1      |
| D    | Kamar D  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000  | 500.000   | 1      |
| G    | Kamar G  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000    | 300.000   | 1      |
| H    | Kamar H  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000    | 300.000   | 1      |
| I    | Kamar I  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000    | 300.000   | 1      |
| J    | Kamar J  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000  | 500.000   | 1      |
| K    | Kamar K  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000  | 600.000   | 1      |
| L    | Kamar L  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000  | 600.000   | 1      |
| M    | Kamar M  | STANDARD | REGULAR    | LARGE    | Dalam  | Kipas     | 1.400.000  | 500.000   | 1      |
| F1   | Kamar F1 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000  | 500.000   | 2      |
| F2   | Kamar F2 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000  | 500.000   | 2      |

### Catatan Fisik Kamar

| Kode | Dimensi & Detail                                                                                  |
|------|---------------------------------------------------------------------------------------------------|
| A    | 2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200                          |
| B    | 2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200                               |
| C    | 2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200                               |
| D    | 2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200                                  |
| G    | 2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200                                     |
| H    | 2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200                                     |
| I    | 2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200                                     |
| J    | 2m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200                                 |
| K    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200                                  |
| L    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200                                  |
| M    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Superior/Economy tanpa AC       |
| F1   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed    |
| F2   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur double bed; Perabot lengkap    |

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

## 7. Dummy Tenant DEV — Skenario per Kamar

Seed via `seed-dev-via-api.js`. Tanggal seed berbasis `TODAY = 2026-06-24`.

| Kamar | Nama              | Slug   | Gender | Pekerjaan  | Skenario      | Keterangan Skenario                          |
|-------|-------------------|--------|--------|------------|---------------|----------------------------------------------|
| A     | Maya Pratiwi      | maya   | F      | Karyawan   | paid          | Stay aktif, invoice lunas                    |
| B     | Dimas Saputra     | dimas  | M      | Mahasiswa  | renew         | Stay aktif, lunas + RenewRequest PENDING     |
| C     | Cindy Wijaya      | cindy  | F      | Karyawan   | pet           | Stay aktif, lunas, **hasPet = true**         |
| D     | Hendra Gunawan    | hendra | M      | Karyawan   | paid          | Stay aktif, invoice lunas                    |
| G     | Gita Lestari      | gita   | F      | Mahasiswa  | paid          | Stay aktif, invoice lunas                    |
| H     | Indah Permata     | indah  | F      | Mahasiswa  | paid          | Stay aktif, lunas, **occupantCount = 2**     |
| I     | Bayu Nugroho      | bayu   | M      | Karyawan   | unpaid        | Stay aktif, invoice **BELUM dibayar**        |
| J     | Karin Salsabila   | karin  | F      | Mahasiswa  | paid          | Stay aktif, invoice lunas                    |
| K     | Lani Kusuma       | lani   | F      | Karyawan   | checkoutH10   | Stay aktif, **planOut = H+10** (mau habis)   |
| L     | Rizky Ramadhan    | rizky  | M      | Mahasiswa  | paid          | Stay aktif, invoice lunas                    |
| M     | Putri Anggraini   | putri  | F      | Karyawan   | paid          | Stay aktif, invoice lunas                    |
| F1    | Fajar Maulana     | fajar  | M      | Karyawan   | paid          | Stay aktif, invoice lunas                    |
| F2    | Sari Melati       | sari   | F      | Mahasiswa  | partial       | Baru masuk, **DP 30% saja**, pelunasan pending|

### Tiket Keluhan Dummy

| Tenant (slug) | Judul Tiket                       | Kategori    | Tips Staf |
|---------------|-----------------------------------|-------------|-----------|
| maya          | AC kamar A kurang dingin          | AC          | ya        |
| cindy         | Keran kamar mandi bocor           | PLUMBING    | ya        |
| gita          | WiFi sering putus di lantai 1     | WIFI        | ya        |
| bayu          | Lampu kamar I mati                | ELECTRICITY | tidak     |
| lani          | AC kamar K perlu service cuci     | AC          | ya        |

### Survei Kepuasan Dummy

| Tenant (slug) | Rating | Rekomendasi | Komentar (ringkas)                              |
|---------------|--------|-------------|-------------------------------------------------|
| maya          | 5      | ya          | Kos bersih, staf ramah, lokasi strategis        |
| cindy         | 4      | ya          | Nyaman; WiFi kadang lambat jam 8 malam          |
| gita          | 5      | ya          | Puas, respons keluhan cepat dan transparan      |
| bayu          | 3      | tidak       | KM luar perlu perawatan lebih sering            |
| karin         | 4      | ya          | (tanpa komentar)                                |
| rizky         | 5      | ya          | Recommended untuk mahasiswa dan pekerja muda    |
| fajar         | 4      | ya          | Harga sesuai fasilitas, listrik transparan      |

---

## 8. Ringkasan Perintah Seed

```bash
# DEV — Reset + seed ulang dari nol:
cd backend
npm run seed:dev:reset     # Bersihkan DB + buat kamar + akun internal
# (pastikan backend dev sudah jalan: npm run start:dev)
npm run seed:dev:api       # Buat tenant + stay + invoice + bayar + tiket + survei

# FAQ (idempoten — aman diulang):
# POST http://localhost:3000/api/faqs/seed  (perlu login OWNER)

# Produksi — hanya OWNER & data wajib:
node scripts/golive-setup.js
```

---

*Diperbarui: 2026-06-24 · Sumber: kost48surabaya.com + faqs.service.ts + seed-dev-via-api.js*
