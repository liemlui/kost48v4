# Laporan Duplikasi Isi (konsolidasi dokumentasi)

Tanggal: 23 September 2026. Status: catatan temuan; keputusan owner yang menyertainya dicatat per item (lihat D-01).
Tujuan: mencatat dugaan duplikasi isi yang ditemukan saat batch konsolidasi. Isi kembar **tidak dihapus dan tidak diringkas tanpa keputusan yang sah**: **pengulangan non-aturan** (daftar teknis, indeks, navigasi, header) diputuskan AI sesuai **DELEGASI-DOC-TEKNIS** (owner 23 Sep, STATUS §6), sedangkan **pengulangan isi aturan bisnis** (uang, DP/deposit, harga, huni, flow bisnis) tetap wewenang owner.

## Ditemukan pada batch B1 (M06 → `domain/operasional.md`, 23 Sep 2026)

### D-01 — Aturan quota energi listrik (tiga salinan) — **SELESAI DEDUP 23 Sep 2026**

| Lokasi | Kutipan ringkas | Status |
|---|---|---|
| `docs/domain/operasional.md` § Bagian 6 IoT Monitoring (dari M06 L548) | "Aturan kanonik quota listrik ada di keuangan.md § Quota Utilitas … tidak diulang di sini" | Dipindah dari M06, lalu kalimat berulangnya diganti **rujukan** ke kanonik (23 Sep 2026) |
| `docs/domain/keuangan.md` § Quota Utilitas Berbasis Periode Sewa Lunas (L37–43) | "Dasar quota listrik gratis bukan lagi selalu satu bulan kalender… perpanjangan tiga bulan menerima tiga kali `freeElectricityKwhPerMonth`… Invoice DP renewal sengaja dikecualikan… `IotTelemetry` tidak menjadi jurnal atau invoice." | **KANONIK** (ditandai eksplisit 23 Sep 2026) |
| `docs/history/changelog/2026-07.md` entri `Update 2026-07-23 — kontrak quota utilitas` | "entri ini menandai tanggal kontrak; teks aturan tidak diulang" | Riwayat bertanggal; teks berulang diganti **rujukan** ke kanonik (23 Sep 2026) |

**KEPUTUSAN OWNER 23 Sep 2026:** `domain/keuangan.md` § Quota Utilitas = kanonik; dua salinan lain menjadi rujukan.
**Eksekusi:** kalimat aturan yang berulang pada dua salinan diganti penunjuk ke kanonik. Kalimat yang **tidak** berulang tetap dipertahankan apa adanya (contoh: "Catat meter/renewal tetap jalur bisnis yang menerbitkan invoice, bukan polling Tuya" di `domain/operasional.md`, dan klausa `MeterReading` di `changelog/2026-07.md`). **Tidak ada aturan yang berubah** — hanya pengulangan yang dihapus, dan seluruh isi yang dihapus terbukti ada di kanonik (`keuangan.md` L39–42).

## Ditemukan pada batch B3 (M18 → `domain/harga.md`, M19 → `operations/efisiensi-hosting.md`, 23 Sep 2026)

### D-02 — Aturan harga/DP/deposit & utilitas bersinggungan dengan domain uang dan huni — **BELUM DIPUTUSKAN**

| Lokasi | Bagian yang bersinggungan | Status |
|---|---|---|
| `docs/domain/harga.md` §5 "Utilitas — Listrik & Air" | Kuota gratis, tarif per kWh/m³, toggle air | Bersinggungan dengan `domain/keuangan.md` §Quota Utilitas (kanonik sejak D-01) dan `domain/operasional.md` §Konstanta meter |
| `docs/domain/harga.md` §7 "Uang Muka (DP) & Deposit" (`### DP (uang muka pemesanan) — G-4/B`, `### Prinsip NO-PARTIAL (D-02)`, `### Deposit jaminan`) | Besaran/persentase DP, aturan no-partial, deposit jaminan | Bersinggungan dengan `domain/hunian.md` (dossier 11/12) dan `domain/keuangan.md` (kebijakan & invarian pembayaran) |
| `docs/domain/harga.md` §8 "Penghuni Ekstra — Surcharge +20%" | Surcharge penghuni ekstra | Belum ada pembanding lain yang ditemukan — kemungkinan bukan duplikat |

**Status:** hanya **dugaan** yang perlu diperiksa berdampingan; belum dilakukan perbandingan kalimat-per-kalimat, jadi belum ada klaim duplikat pasti. Isi **tidak** diubah/dihapus.
**Mengapa belum dieksekusi:** ini menyentuh aturan uang/DP/deposit yang dilindungi aturan proyek ("DILARANG mengubah aturan uang/huni/harga, nominal, gate uang") — keputusan rumah kanonik harus dari owner, seperti pola D-01.

## Ditemukan pada batch B5 (M00/M01/M10/M17 → `PETA-KODE.md` + `product/` + riwayat, 23 Sep 2026)

### D-03 — Tabel Fase AM di `PETA-KODE.md` vs riwayat `changelog/2026-07.md` + `fase-lama.md` — **DIPERIKSA: BUKAN DUPLIKAT**

| Lokasi | Isi | Status |
|---|---|---|
| `docs/PETA-KODE.md` § Frontend — Redundansi UI/UX (Fase AM) | Status 16/16 + tabel AM-01..AM-16 dengan kolom **Dampak artefak kode** | Dipertahankan: fungsi **pemetaan artefak kode** (mis. `utils/whatsapp.ts`, `useGenericForm`), bukan catatan tanggal |
| `docs/history/changelog/2026-07.md` (entri M14 SELESAI + AM-01..) dan `docs/history/fase-lama.md` (baris Fase AM) | Narasi kronologis penyelesaian fase | Riwayat bertanggal — tetap di riwayat |

**Keputusan (penataan, AI):** kedua salinan **tidak** identik baris-per-baris dan melayani fungsi berbeda; tidak ada penghapusan. Yang dijaga hanya agar angka "16/16" tidak dijadikan klaim status aktif — status aktif tetap di [STATUS](../STATUS.md).

### D-04 — Daftar akun dev & perintah seed (`product/orientasi.md` §7) vs `operations/default-dev.md` — **SELESAI DEDUP 23 Sep 2026**

| Lokasi | Isi | Status |
|---|---|---|
| `docs/operations/default-dev.md` | Akun fondasi seed-dev, akun dummy, perintah seed | **KANONIK** (hasil S1.b) |
| `docs/product/orientasi.md` §7 (asal M01 L164) | Daftar akun dev yang sama (`owner@kost48.com`, `admin@kost48.com`, `staff@kost48.com`, 16 tenant) | Diganti **rujukan** ke kanonik; perintah kerja tetap di orientasi |

**Keputusan (penataan non-aturan, AI):** hanya daftar akun yang berulang yang diganti rujukan (kredensial DEV, bukan aturan bisnis); **tidak ada aturan bisnis yang berubah** dan perintah kerja (`tsc`, `npm run build`, seed UAT) tetap utuh di `orientasi.md`.

### D-05 — Ringkasan §1/§2 orientasi (identitas, DP/deposit, multiplier harga, surcharge) vs `domain/harga.md`, `domain/keuangan.md`, `domain/hunian.md` — **PENANGANAN DOKUMEN SELESAI; DEDUP ISI MENUNGGU OWNER**

| Lokasi | Bagian yang bersinggungan | Status |
|---|---|---|
| `docs/product/orientasi.md` §1 Identitas & Model Bisnis | Jumlah kamar, tipe, role, status deployment | Ringkasan orientasi → ditandai **"ringkasan, bukan aturan kanonik"** + rujukan kanonik ditambahkan (23 Sep 2026) |
| `docs/product/orientasi.md` §2 Konsep Kunci Uang | DP 30% hangus vs deposit refundable, NO-PARTIAL, tariff multiplier, surcharge penghuni ekstra | Ringkasan orientasi → ditandai + rujukan ke `domain/harga.md`, `domain/keuangan.md`, `domain/hunian.md` |
| `docs/domain/harga.md`, `domain/keuangan.md`, `domain/hunian.md` | Aturan rinci + invarian | **KANONIK** untuk aturan (tidak diubah) |

**Status:** **isi aturan tidak diubah dan tidak dihapus.** Pengulangan angka (30% DP, multiplier term, surcharge) sengaja dibiarkan sebagai ringkasan sambil menunjuk kanonik; dedup isi aturan menyentuh **aturan bisnis uang/harga/huni** → **menunggu keputusan owner** (bersama D-02). Bila owner memutuskan, catat di [M02](../M02_KEPUTUSAN_OWNER.md) lalu eksekusi pada batch konsolidasi berikutnya.

## Aturan pakai laporan ini

- Temuan di sini **tidak** mengubah isi aturan, tidak menetapkan mana yang benar, dan tidak menutup gate apa pun.
- Bila owner memutuskan, catat keputusan di [M02](../M02_KEPUTUSAN_OWNER.md), lalu eksekusi dedup pada batch konsolidasi berikutnya dan perbarui baris di atas sebagai bukti.
