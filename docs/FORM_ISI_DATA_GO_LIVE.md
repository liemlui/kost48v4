# FORM ISI DATA GO-LIVE — KOST48

> **Arah aktif 6 Sep 2026:** [M12](M12_CHECKLIST_CHANGELOG.md) adalah checklist tunggal; **Fase EF diprioritaskan dan Fase MA ditunda**. Isi identitas deployment dan pengamatan pasif pada [M19 §9](M19_EFISIENSI_HOSTING_512MB.md#9-pencatatan-hosting-ef-00-dan-ef-02) terlebih dahulu. Form ini untuk persiapan data bisnis, bukan izin seed, deploy, restart, atau mutasi DB. Nama/jumlah data pada catatan lama belum membuktikan data produksi saat ini.
> Jangan isi/commit password, token atau key ke dokumen/chat. Isikan kredensial langsung melalui mekanisme aplikasi/server yang diizinkan; laporan cukup status tersedia/belum.

> **Cara pakai:** Isi kolom kosong di bawah, lalu kirim balik ke saya (bisa copy-paste tabelnya ke chat).
> Data yang SUDAH lengkap (13 kamar, 13 nama+NIK+tarif+deposit, 8 email) tidak perlu diisi ulang.
> Tanda `[ ... ]` = silakan isi. Tanda `—` = memang kosong/opsional.
>
> 🗂️ **Formulir kanonik (sejak 2026-09-07):** formulir ini menggantikan `GO_LIVE_DATA_ISI.md` yang telah diarsipkan ke `docs/archieve/2026-09-07_docs_cleanup/`. Jangan membuat formulir go-live baru di `docs/` root — isi file ini.

---

## A. Akun Admin & Staf

| Peran | Email | Password | Nama Lengkap |
|-------|-------|----------|--------------|
| ADMIN (opsional) | `[ ... ]` | Atur langsung di aplikasi | `[ ... ]` |
| STAFF (1 orang) | `[ ... ]` | Atur langsung di aplikasi | `[ ... ]` |

---

## B. Data Tenant yang Belum Lengkap

### B1. Email + Gender + Pekerjaan (yang masih kosong)

| Kamar | Nama | Email | Gender (L/P) | Pekerjaan |
|-------|------|-------|--------------|-----------|
| F1 | GUNAWAN | — *(segera checkout — tidak perlu akun portal)* | `[ ... ]` | `[ ... ]` |
| J | Lovandra | `lovandra.fachri103@gmail.com` | `[ ... ]` | `[ ... ]` |
| M | Gabriel Excelly Pranajaya | `gabrielexcelly1908@gmail.com` | `[ ... ]` | `[ ... ]` |

> Email **G** (`jtt1234511@gmail.com`) dan **L** (`desterikahasan@gmail.com`) sudah terisi (keluar dari daftar kosong).
> **Pekerjaan (`occupation`) masih kosong untuk semua 13 tenant** — opsional, isi di §B2 bila mau lengkap.

### B2. Pekerjaan (occupation) — semua 13 tenant

| Kamar | Nama | Pekerjaan |
|-------|------|-----------|
| A | Shinta Larista | `[ ... ]` |
| B | Dini Widiastutik | `[ ... ]` |
| C | Miko Rakatama Adhi Winarto | `[ ... ]` |
| D | Ade Chandra | `[ ... ]` |
| F1 | GUNAWAN | `[ ... ]` |
| F2 | Patrick Wilfred | `[ ... ]` |
| G | Yofi Nurkolifah | `[ ... ]` |
| H | Welly Tanoto | `[ ... ]` |
| I | Theo Wijaya | `[ ... ]` |
| J | Lovandra | `[ ... ]` |
| K | Meliana Tamara | `[ ... ]` |
| L | Destarika Hasan | `[ ... ]` |
| M | Gabriel Excelly Pranajaya | `[ ... ]` |

---

## C. Data Check-in per Kamar (WAJIB)

> `Tarif Kontrak` sudah ada di sistem. Yang perlu diisi: **bulan+tahun masuk** (tanggal hari sudah ada) dan **meter listrik awal**.

| Kamar | Nama | Tanggal Masuk (hari sudah ada) | Bulan + Tahun Masuk | Meter Listrik Awal (kWh) |
|-------|------|-------------------------------|---------------------|---------------------------|
| A | Shinta Larista | 26 | Jun 2026 | ≈ 11.224 |
| B | Dini Widiastutik | 1 | Apr 2026 | ≈ 6.074 |
| C | Miko Rakatama A. W. | 28 | Mar 2026 | ≈ 8.178 |
| D | Ade Chandra | 24 | Agu 2025 | ≈ 5.629 |
| F1 | GUNAWAN | 27 | Jul 2026 | `[ ... ]` |
| F2 | Patrick Wilfred | 8 | Jun 2026 | `[ ... ]` |
| G | Yofi Nurkolifah | 1 | Agu 2025 | `[ ... ]` |
| H | Welly Tanoto | 10 | Mei 2025 | `[ ... ]` |
| I | Theo Wijaya | 5 | Mei 2025 | `[ ... ]` |
| J | Lovandra | 30 | Jan 2026 | ≈ 3.893 |
| K | Meliana Tamara | 10 | Mei 2025 | ≈ 8.641 |
| L | Destarika Hasan | 1 | Mei 2025 | ≈ 5.697 |
| M | Gabriel Excelly P. | 3 | Mei 2025 | `[ ... ]` |

> 📅 **Bulan+tahun masuk** diambil dari `Scan/KOST48_Historical_DB_AI_CONTEXT.md` §8. Catatan: **B (Dini)** ngekos sejak sebelum Nov 2024 (arsip mulai Nov 2024), pindah C→B 1 Apr 2026; **I (Theo)** masih aktif tapi belum bayar Jul+Agustus 2026.
> 📊 **Meter `≈`** = pembacaan absolut terakhir (Jun–Jul 2026), **wajib cek fisik ulang** saat go-live.

---

## D. Keuangan

| Item | Nilai |
|------|-------|
| Opening balance (saldo awal kas/bank) | `[ ... ]` (atau tulis "ZERO-START") |
| Rekening transfer — Nama Bank | diisi owner via UI Owner → Settings Operasional |
| Rekening transfer — No. Rekening | diisi owner via UI Owner → Settings Operasional |
| Rekening transfer — Atas Nama | diisi owner via UI Owner → Settings Operasional |

---

## E. Layanan Tambahan (opsional)

| Layanan | Harga / bulan |
|---------|---------------|
| WiFi per perangkat | `[ ... ]` (contoh: 50.000) |
| Lainnya: `[ ... ]` | `[ ... ]` |

---

## F. Pengumuman Awal (opsional)

| Judul | Isi | Kategori (info/urgent/maintenance) |
|-------|-----|-----------------------------------|
| `[ ... ]` | `[ ... ]` | `[ ... ]` |
