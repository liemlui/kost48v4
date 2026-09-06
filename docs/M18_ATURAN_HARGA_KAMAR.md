# KOST48 — Aturan Penentuan Harga Kamar (Harian, Mingguan, Bulanan, dll.)

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> Dokumen ini merangkum **aturan resmi & terimplementasi** penentuan harga kamar KOST48.
> Sumber kode: `backend/src/modules/tenant-bookings/pricing.helper.ts`, `frontend/src/utils/pricing.ts`, `tenant-bookings.helpers.ts`, `prepay-extension.service.ts`, `rooms.service.ts`, `docs/M02_KEPUTUSAN_OWNER.md`.
> Terakhir diperbarui: 2026-08-22.

---

## 1. Prinsip Dasar — Tarif Bulanan Adalah Pangkal Semua Harga

1. **Satu-satunya sumber kebenaran harga** adalah kolom `Room.monthlyRateRupiah` (tarif bulanan dalam Rupiah).
2. **Semua harga term lain (harian, mingguan, 2-mingguan, semester, tahunan) DITURUNKAN dari tarif bulanan** memakai formula resmi — **bukan** kolom harga manual.
3. Kolom `dailyRateRupiah` / `weeklyRateRupiah` / `biWeeklyRateRupiah` **hanya dipakai sebagai "pintu ketersediaan"** (apakah term ditawarkan?), **bukan** sebagai harga final.
4. Audit M-40: *"Harga tampil harus sama dengan harga yang DITAGIH backend — semua term diturunkan dari tarif bulanan via formula resmi."* Artinya tampilan katalog dan tagihan **selalu sama**, karena memakai rumus yang identik.
5. Kamar **aktif wajib memiliki `monthlyRateRupiah > 0`** (diberlakukan saat simpan: `ConflictException('Kamar aktif wajib memiliki monthlyRateRupiah > 0')`).

---

## 2. Formula Multiplikator (PRICING_MULTIPLIERS)

| Term | Kode API | Pengali × Tarif Bulanan | Keterangan |
|------|----------|--------------------------|------------|
| **Harian** | `DAILY` | **0,13 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **Mingguan** | `WEEKLY` | **0,50 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **2-Mingguan** | `BIWEEKLY` | **0,75 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **Bulanan** | `MONTHLY` | **1,00 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |
| **Semester (6 bulan)** | `SMESTERLY` | **5,70 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |
| **Tahunan (12 bulan)** | `YEARLY` | **11,00 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |

### Catatan penting
- `SMESTERLY` = 5,7× → efektif **Rp 0,95/bulan** (diskon ~5% dari 6×).
- `YEARLY` = 11× → efektif **Rp 0,917/bulan** (diskon ~8,3% dari 12×).
- Diskon jangka panjang ini khusus pada **prabayar di muka penuh** (lihat §10).

---

## 3. Pembulatan — Selalu Ke Atas Kelipatan Rp 5.000

`roundUpToNearest(monthlyRate × multiplier, 5000)`:

```
raw = monthlyRateRupiah × multiplier
hasil = ceil(raw / 5.000) × 5.000
```

- Konstanta: `PRICING_ROUND_TO = 5000`.
- **Selalu dibulatkan KE ATAS** ke kelipatan Rp 5.000 (bukan nearest/biasa).
- Jika hasilnya ≤ 0 → harga = 0 (berarti term tidak ditawarkan).

**Contoh perhitungan** (tarif bulanan Rp 1.000.000):

| Term | Perhitungan | Dibulatkan |
|------|-------------|------------|
| Harian | 1.000.000 × 0,13 = 130.000 | **Rp 130.000 / hari** |
| Mingguan | 1.000.000 × 0,50 = 500.000 | **Rp 500.000 / minggu** |
| 2-Mingguan | 1.000.000 × 0,75 = 750.000 | **Rp 750.000 / 2 minggu** |
| Bulanan | 1.000.000 × 1,00 = 1.000.000 | **Rp 1.000.000 / bulan** |
| Semester | 1.000.000 × 5,70 = 5.700.000 | **Rp 5.700.000 / 6 bulan** |
| Tahunan | 1.000.000 × 11,00 = 11.000.000 | **Rp 11.000.000 / 12 bulan** |

**Contoh pembulatan** (tarif bulanan Rp 900.000):

| Term | Perhitungan | Dibulatkan |
|------|-----------|------------|
| Harian | 900.000 × 0,13 = 117.000 | → **Rp 120.000 / hari** |
| Mingguan | 900.000 × 0,50 = 450.000 | → **Rp 450.000 / minggu** |
| 2-Mingguan | 900.000 × 0,75 = 675.000 | → **Rp 675.000 / 2 minggu** |
| Semester | 900.000 × 5,70 = 5.130.000 | → **Rp 5.130.000 / 6 bulan** |
| Tahunan | 900.000 × 11,00 = 9.900.000 | → **Rp 9.900.000 / 12 bulan** |

**Contoh pembulatan** (tarif bulanan Rp 1.750.000):

| Term | Perhitungan | Dibulatkan |
|------|-----------|------------|
| Harian | 1.750.000 × 0,13 = 227.500 | → **Rp 230.000 / hari** |
| Mingguan | 1.750.000 × 0,50 = 875.000 | → **Rp 875.000 / minggu** |
| 2-Mingguan | 1.750.000 × 0,75 = 1.312.500 | → **Rp 1.315.000 / 2 minggu** |
| Bulanan | 1.750.000 × 1,00 = 1.750.000 | → **Rp 1.750.000 / bulan** |
| Semester | 1.750.000 × 5,70 = 9.975.000 | → **Rp 9.975.000 / 6 bulan** |
| Tahunan | 1.750.000 × 11,00 = 19.250.000 | → **Rp 19.250.000 / 12 bulan** |

> Karena pembulatan ke atas, harga yang tampil bisa lebih besar sedikit dari jumlah mentah, TETAPI tampilan & tagihan selalu memakai angka yang sama (nilai pembulatan).

---

## 4. Ketersediaan Term Berdasarkan Kolom Harga

| Term | Syarat | Tersedia bila |
|------|--------|----------------|
| `DAILY` | kamar menawarkan term harian | `dailyRateRupiah > 0` |
| `WEEKLY` | kamar menawarkan term mingguan | `weeklyRateRupiah > 0` |
| `BIWEEKLY` | kamar menawarkan term 2-mingguan | `biWeeklyRateRupiah > 0` |
| `MONTHLY`, `SEMESTERLY`, `YEARLY` | semua memakai basis bulanan | `monthlyRateRupiah > 0` |

- Satu kolom `monthlyRateRupiah > 0` otomatis **mengaktifkan 3 term**: `MONTHLY`, `SEMESTERLY`, dan `YEARLY`.
- Kolom harian/mingguan/2-mingguan bila bernilai 0 atau null → term tersebut **tidak ditawarkan** pada kamar.
- Kamar **aktif (isActive=true) WAJIB** `monthlyRateRupiah > 0`; tarif harian/mingguan opsional.

---

## 5. Utilitas — Listrik & Air

Aturan `isUtilitiesIncludedForPricingTerm`:

| Term | Status Utilitas |
|------|----------------|
| `DAILY`, `WEEKLY`, `BIWEEKLY` | **Termasuk** (all-in di tarif) — tidak ditagih meter |
| `MONTHLY`, `SEMESTERLY`, `YEARLY` | **Pisah via meter** (pascabayar dihitung dari pemakaian) |

### Aturan tambahan (keputusan owner & FAQ):
- Sewa bulanan: tiap kamar mendapat **jatah gratis listrik 30 kWh/bulan**; kelebihannya ditagih dengan **tarif Rp 2.500/kWh** (disetel di OperationalSetting; tarif kamar bisa di-override OWNER).
- Air: hanya ditagih bila sesuai setting aktif, dengan tarif per m³ (dari `OperationalSetting.waterTariffPerM3Rupiah`).
- Untuk tarif jangka pendek (harian/mingguan/2-mingguan), listrik & air **SUDAH TERMASUK** — tidak ditagih meter.
- Estimasi tambahan listrik (FAQ): kipas umumnya tidak ada tambahan; AC hemat Rp 0–100rb; AC rata-rata Rp 100rb–200rb; pasutri sering di kos Rp 200rb–300rb.

---

## 6. Periode Sewa Berdasarkan Term

Periode mulai **inclusive**, tanggal akhir (`periodEnd`/`plannedCheckOutDate`) **exclusive**:

| Term | Penambahan periode |
|------|---------------------|
| Harian | `+1 hari` |
| Mingguan | `+7 hari` |
| 2-Mingguan | `+14 hari` |
| Bulanan | `+1 bulan kalender` (Clamp: 31 Jan + 1 bln = 28/29 Feb) |
| Semester | `+6 bulan kalender` |
| Tahunan | `+12 bulan kalender` |

Contoh: check-in 1 September + 3 bulan → berakhir 1 Desember (exclusive). 31 Jan + 1 bulan → 28/29 Februari.

---

## 7. Uang Muka (DP) & Deposit

### DP (uang muka pemesanan) — G-4/B
- **DP = 30% × tarif periode** (sesuai `pricingTerm`): `roundRupiah(agreedRentAmountRupiah × 30 / 100)`.
- **Non-refundable** (hangus saat booking dibatalkan / gagal lunas).
- **Merupakan bagian dari harga sewa** — bukan biaya tambahan.
- Setelah DP dibayar untuk tarif tertentu, **tarif tidak boleh lagi diubah** lewat approval (kecuali batal dan negosiasi ulang).

### Prinsip NO-PARTIAL (D-02)
Pembayaran yang sah HANYA:
1. **DP 30% persis**, atau
2. **Pelunasan penuh** = sisa invoice + sisa deposit.
Jalur invoice-only (renewal/utilitas) wajib lunas penuh.

### Deposit jaminan
- **Selalu** = `Room.defaultDepositRupiah` (nilai bawaan kamar) — **ADMIN tidak boleh mengubah deposit** (D-05).
- Merupakan **dana titip, liability (kewajiban), BUKAN revenue**.

---

## 8. Penghuni Ekstra — Surcharge +20%

| Ukuran Kamar | Penghuni Gratis | Maks Booking | Maks Ekstra |
|--------------|-----------------|--------------|-------------|
| `SMALL/STANDARD` (2,5×3 m) | **2 orang** | **4 orang** | 2 |
| `LARGE` (3×3,5 m) | **4 orang** | **6 orang** | 2 |

**Aturan (keputusan owner D-24):**
- Penghuni di atas batas gratis dikenakan **+20% harga sewa per kepala ekstra**:
  `surcharge = roundUpToNearest(baseRent × 0,20 × jumlahEkstra, 5.000)`
- Contoh: tarif bulanan Rp 1.000.000, kamar STANDARD dihuni 3 orang (1 ekstra) → surcharge = 1.000.000 × 0,20 × 1 = Rp 200.000 (dibulatkan ke 5rb).
- Lebih dari 2 ekstra **tidak dibolehkan sistem** (kamar tidak layak huni).

---

## 9. Kunci Harga Sewa Tenant Loyal (Rent-Lock) — D-16

- Tenant yang **memperpanjang tanpa putus kontrak** → harga sewa **DIKUNCI** (tidak naik) — memakai `agreedRentAmountRupiah` yang sudah disepakati.
- Harga **hanya bisa naik** jika: kontrak terputus → gagal bayar → atau memesan ulang sebagai penghuni baru (re-kontrak).
- Saat **pindah kamar (transfer room)**, harga juga tetap dikunci; perubahan harga sewaktu pindah adalah **OWNER-only** (D-17).
- Saat **renewal dengan ganti term** (dari bulanan ke harian dsb.), harga dikunci → dihitung ulang agar setara (re-multiply dengan rasio multiplier).

---

## 10. Prabayar / Perpanjangan dengan Diskon Jangka Panjang (D-18 / A-5 / F5-8)

Tenant dapat **membayar di muka 1–24 bulan** (kapan saja — tak harus menunggu kontrak habis):

| `rateTerm` | Syarat Minimum | Harga Efektif per Bulan | Total |
|------------|----------------|---------------------------|-------|
| `MONTHLY` | 1–24 bulan | `monthlyRent` (harga bulanan dikunci) | `monthlyRent × months` |
| `SEMESTERLY` | ≥ 6 bulan | `roundRupiah(monthlyRent × 5,7 / 6)` | `effectiveMonthly × months` |
| `YEARLY` | ≥ 12 bulan | `roundRupiah(monthlyRent × 11,0 / 12)` | `effectiveMonthly × months` |

- `monthlyRent` sumber: jika stay saat ini `MONTHLY` → pakai `agreedRentAmountRupiah` (lock D-16); jika term lain → pakai `Room.monthlyRateRupiah`.
- **Diblokir jika ada tunggakan** → tenant yang masih memiliki invoice berstatus `ISSUED` atau `PARTIAL` **tidak dapat prabayar** (keputusan A-06).
- Akuntansi PSAK-72: seluruh **prabayar > 1 bulan = unearned revenue** (COA 2200), diakui bertahap per bulan.
- **Poin loyalitas** diberikan untuk prabayar multi-bulan (keputusan A-7, alasan `RENEWAL`).

### Contoh hitung YEARLY
Tarif bulanan Rp 1.000.000, prabayar 12 bulan:
- effectiveMonthly = 1.000.000 × 11,0 / 12 = **Rp 916.667/bulan**
- total dibayar di muka = 916.667 × 12 = **Rp 11.000.000**

---

## 11. Kewenangan & Batasan Role

- **Setelan kamar & harga** (tarif bulanan, deposit, tarif listrik/air, harga harian/mingguan/2-mingguan) — **OWNER-only** (D-17 / F-2-16).
- **STAFF dilarang**: override harga sewa, override tarif listrik, dan override tarif air. Staf memakai harga default kamar yang mengikuti formula.
- **ADMIN** tidak boleh mengubah deposit secara manual; boleh menjalankan operasi lain yang secara eksplisit diizinkan selain 4 area owner-only.

---

## Ringkasan Alur

1. Dimulai dari tarif bulanan `Room.monthlyRateRupiah` (wajib untuk kamar aktif).
2. Owner memilih term: term harian/mingguan/2-mingguan muncul bila kolomnya > 0; bulanan selalu tersedia dan membuka semester + tahunan.
3. Sistem menghitung harga final = `ceil(monthly × multiplier / 5.000) × 5.000`.
4. Term DAILY/WEEKLY/BIWEEKLY → listrik & air sudah termasuk; MONTHLY/SEMESTERLY/YEARLY → listrik & air dihitung meter.
5. Masa sewa dihitung berdasarkan term (1 hari · 7 hari · 14 hari · 1/6/12 bulan, akhir eksklusif).
6. Ekstra penghuni di luar batas gratis → +20% × harga per kepala ekstra (pembulatan ke 5rb).
7. Booking → DP 30%, deposit jaminan default; kunci harga berlaku untuk renewal & pindah kamar.
8. Prabayar ≥6 bln / ≥12 bln berhak diskon semester/tahunan (5,7×/6, 11×/12) — dibayar penuh di muka.

---

*Dokumen ini harus dijaga sinkron dengan `pricing.helper.ts` (backend) dan `utils/pricing.ts` (frontend). Perubahan kebijakan harga memerlukan persetujuan OWNER dan update di KEDUA file kode.*
