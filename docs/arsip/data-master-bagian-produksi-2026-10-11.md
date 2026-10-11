# Data produksi dari data-master.md — arsip blok duplikat (2026-10-11)

> **Provenance:** blok baris **213–455** (243 baris) dari [operations/data-master.md](../operations/data-master.md) pada commit `0e8a3385`, dipindahkan **11 Oktober 2026** karena isinya duplikat berkas kanonik.
> **Ledger SHA-256 blok asli:** `a7ce9499f9ed524b7e6bbc3f046757897c4abd67f7c5e4266dc5838569eb29ae` (10587 byte, newline LF). Cara memeriksa: ambil baris 213–455 dari `git show 0e8a3385:docs/operations/data-master.md`, gabung dengan newline LF, tambahkan newline penutup, lalu SHA-256 — harus sama.
> **Kenapa diarsipkan, bukan dihapus:** isi yang masih berlaku tidak boleh dipangkas. Blok ini tetap utuh dan bisa dipulihkan baris-per-baris.
> **Rumah kanonik isi ini sekarang:** [operations/produksi.md](../operations/produksi.md) §15–§18 — tabel “Isi & lokasi kanonik” di data-master.md sendiri sudah menyatakan itu sejak migrasi batch B9 (23 September 2026).
> **Jangan dipakai sebagai rujukan hidup.** Untuk produksi, buka produksi.md.

## 7. Data Tenant Produksi — Skenario per Kamar

Data real dari owner. Seed via `seed-prod.js`. Tgl Masuk = tanggal hari (bulan menyusul — akan dilengkapi via UI Owner).

| Kamar | Nama                   | NIK                 | Tgl Msk | Tarif Kontrak | Deposit  | Gender | Keterangan                     |
|-------|------------------------|---------------------|---------|---------------|----------|--------|--------------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26      | 1.700.000     | —        | F      | DELUXE Mezzanine, AC           |
| B     | Dini Widiastutik       | 3275085012800021    | 1       | 1.500.000     | —        | F      | DELUXE, AC                     |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28      | 1.600.000     | —        | M      | DELUXE, AC                     |
| D     | Ade Chandra            | 3173052309720009    | 24      | 1.500.000     | 200.000  | M      | DELUXE, AC                     |
| F1    | GUNAWAN                | 1505062511740001    | 27      | 1.700.000     | —        | M      | DELUXE Mezzanine, AC           |
| F2    | Patrick Wilfred        | 3275020504910019    | 8       | 1.600.000     | —        | M      | DELUXE Mezzanine, AC           |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1       | 800.000       | —        | F      | ECONOMY, Kipas                 |
| H     | Welly Tanoto           | 3578070811730004    | 10      | 800.000       | —        | M      | ECONOMY, Kipas                 |
| I     | Theo Wijaya            | 3571021308860003    | 5       | 800.000       | —        | M      | ECONOMY, Kipas                 |
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
> - Referensi lengkap: `../arsip/legacy/AUDIT_INVENTARIS_LENGKAP.md`

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

