> **ARSIP BEKU** · dipindah dari `docs/rencana/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# ALAT UKUR KESEGARAN DOCS — spesifikasi batch berikutnya

> **Blok baca** · Jenis: **spesifikasi batch (serah-terima)** · Status: **alat ukur SELESAI 2026-10-07; hasil + potret pertama di §6 · butir §7 prioritas 2–7 belum dikerjakan** · Untuk siapa: agen yang membuka sesi baru dengan tugas "memperkuat docs"
> · Baca kalau: memakai atau menilai kartu skor kesegaran dokumentasi (**§6 memuat hasil + potret pertama 2026-10-07**), atau melanjutkan penguatan docs KOST48 (prioritas §7 butir 2–7). · **Jangan** dibaca kalau: mencari tugas produk/aplikasi (itu [ANTREAN](../ANTREAN.md)).

**Tujuan sesi berikutnya:** mengubah satu-satunya pertanyaan besar yang masih **UNKNOWN** — *apakah isi dokumen masih cocok dengan kode hari ini?* — menjadi **angka + daftar yang bisa dikerjakan**.

Sisa inventaris docs saat ini: **68 berkas aktif** (61 di `docs/` + 5 di akar) + **56 arsip**. Kerapian mekanis sudah dijaga 11 aturan gate; **kesegaran isi tidak diukur oleh apa pun**.

## 1. Mengapa ini prioritas, bukan kerapian lagi

Hari ini (2026-10-07) terbukti bahwa gate yang "100% hijau" tidak berarti benar: dalam satu hari ditemukan 22 anchor mati, 47 label basi, indeks folder yang tidak bisa disegarkan, dan generator TOC yang membuat tautan mati selama berbulan-bulan. Semuanya lolos dari 100%. Kepatuhan tinggi adalah **ambang rendah**; kesegaran isi adalah pertanyaan yang berbeda dan belum pernah dijawab.

Bukti pendukung: [audit aturan docs](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) §1 baris **A-a** (UNKNOWN) dan §6; rencana adaptasi: [ADAPTASI-DOKTRIN-DOCS](ADAPTASI-DOKTRIN-DOCS.md) §2 (celah tanpa rumah).

## 2. Definisi metrik — bagian paling menentukan

Untuk setiap dokumen aktif `D`:

1. `t_doc(D)` = waktu commit terakhir yang **menyentuh `D`**.
2. Untuk setiap artefak yang **dirujuk** `D` (lihat §3): `t_ref(A)` = waktu commit terakhir yang menyentuh `A`.
3. `D` disebut **KANDIDAT USANG** bila ada `A` dengan `t_ref(A) > t_doc(D)` (rujukan "lebih muda" daripada dokumennya).
4. `usia_rujukan(D)` = selisih hari antara `t_ref` termuda dan `t_doc`.

**Angka yang dilaporkan:**

- **% segar** = (jumlah dokumen aktif **tanpa** rujukan yang lebih muda) ÷ (jumlah dokumen aktif **yang punya minimal satu rujukan yang bisa diselesaikan**) × 100.
  — penyebut sengaja **bukan** seluruh dokumen aktif: dokumen tanpa rujukan yang bisa diselesaikan tidak boleh dihitung sebagai "segar" (itu menghitung ketidaktahuan sebagai kesehatan).
- **% cakupan** = dokumen aktif yang punya ≥1 rujukan terselesaikan ÷ seluruh dokumen aktif. Ini yang membuat angka pertama bisa dibaca (angka besar dengan cakupan 20% tidak berarti apa-apa).
- **daftar peringkat**: dokumen → rujukan termuda → jarak hari → dugaan tindakan (perbarui / turunkan jadi kartu bertanggal / tandai UNKNOWN).

**Ambang wajib dilaporkan apa adanya:** bila `% cakupan` < 50%, angka `% segar` **tidak boleh** dipresentasikan sebagai kesimpulan — hanya sebagai indikasi.

## 3. Rujukan apa yang dihitung (bertahap, jangan langsung sempurna)

| Tahap | Jenis rujukan | Cara menyelesaikan | Catatan |
|---|---|---|---|
| 1 | Path kode di dalam backtick (`backend/…`, `frontend/…`, `scripts/…`) | cek keberadaan berkas relatif akar repo | paling murah; sudah ada preseden pemeriksa path di R6 |
| 2 | Tautan markdown ke berkas kode | sama dengan tahap 1 | tahap 1+2 biasanya sudah menutup mayoritas |
| 3 | Nama berkas tanpa path (mis. `pricing.helper.ts`) | cari di indeks path repo; **bila >1 kandidat → tandai UNKNOWN**, jangan pilih sembarang | kehati-hatian lebih penting daripada cakupan |
| 4 | Simbol/fungsi/konstanta (mis. `AUTO_OPS_DEADLINES`) | **belum** dikerjakan di batch ini | sebut sebagai UNKNOWN, jangan dikira-kira |

Aturan kehati-hatian: rujukan yang **tidak bisa diselesaikan** masuk hitungan `cakupan` sebagai tidak terselesaikan, dan **tidak pernah** dianggap segar.

## 4. Batas yang WAJIB ditulis di keluaran alat (bukan di kaki halaman)

1. **Segar ≠ benar.** Dokumen bisa usang walau semua berkas rujukannya tidak berubah (perilaku berubah di tempat lain, atau pernyataannya soal logika, bukan berkas).
2. **Sentuhan kerapian memalsukan kesegaran.** Batch dokumentasi (seperti rename 47 label hari ini) menyentuh dokumen **tanpa** memperbarui isi. Karena itu keluaran harus menyertakan **subjek commit terakhir** tiap dokumen, supaya manusia bisa menilai apakah sentuhan itu "kerapian" atau "pembaruan isi". Jangan mencoba menebaknya otomatis di batch pertama.
3. **Riwayat git dangkal = alat tidak sah.** Bila repo shallow (atau `git` tidak tersedia), alat **wajib menolak** menghasilkan angka, bukan mengeluarkan angka yang salah.
4. **Zona jangan-dibaca dikecualikan**: `.design-audit`, `.docs-legacy`, `.audit-map`, `docs/arsip` (konsisten dengan AGENTS §6 dan R6/R9/R10/R11).
5. **Cakupan rendah ≠ sehat.** Lihat §2.

## 5. Bentuk keluaran & sifat alat

- **Kartu skor, bukan gate.** Ikuti pola `scripts/ukur-kekuatan-docs.mjs`: exit 0, boleh gagal, **tidak** memblokir pekerjaan. Menjadikannya aturan gate adalah keputusan terpisah **setelah** angka pertama dilihat (preseden proyek ini: R6 dipasang *setelah* temuan ditutup, bukan sebelum).
- Jalankan tanpa jaringan, deterministik, di bawah beberapa detik.
- Nama usulan: `scripts/ukur-kesegaran-docs.mjs`, dipanggil `node scripts/ukur-kesegaran-docs.mjs` dari akar.
- Jangan menambah dependency (AGENTS §2). Cukup `git` lewat subprocess dan modul bawaan Node.

## 6. Kriteria selesai (terukur, bukan kesan)

1. Menjalankan alat menghasilkan **4 keluaran**: `% segar`, `% cakupan`, daftar peringkat, dan blok batas §4 — dalam satu kali jalan, exit 0.
2. **Uji negatif wajib** (gaya yang sudah dipakai R8–R11 hari ini): buat dua berkas uji sementara —
   - dokumen yang merujuk berkas **yang baru saja diubah** → harus muncul sebagai KANDIDAT USANG;
   - dokumen yang merujuk berkas **yang lama tidak berubah** → harus **tidak** muncul.
   Keduanya dihapus setelah uji; laporkan hasilnya apa adanya.
3. Angka pertama **dilaporkan sebagai potret bertanggal**, dengan `% cakupan` di sebelahnya.
4. Tidak ada aturan gate baru yang dipasang di batch ini.

**Hasil eksekusi (2026-10-07) — keempat kriteria di atas, dilaporkan apa adanya:**

1. `node scripts/ukur-kesegaran-docs.mjs` mencetak keempat keluaran dalam satu kali jalan — angka (`% segar` + `% cakupan`), rincian per kelas, daftar peringkat, dan blok batas §4 — dengan **exit 0** dalam **±1,7 detik**; tanpa jaringan, tanpa dependency baru (hanya `git` lewat subprocess + modul bawaan Node).
2. **Uji negatif lulus.** Fixture repo git sementara dibuat di direktori temporer (bukan di repo proyek, lalu **dihapus setelah uji**; riwayat git proyek tidak disentuh): dokumen yang merujuk berkas yang diubah **belakangan** muncul sebagai **KANDIDAT USANG** (jarak terukur **151,0 hari**), sedangkan dokumen yang merujuk berkas yang **lama tidak berubah** muncul sebagai `segar` dan **tidak** masuk daftar. Dua jalur penolakan juga diuji: repo shallow (`.git/shallow` disimulasikan) dan direktori bukan repo → **exit 3, nol baris angka**.
3. **Potret pertama (2026-10-07 · HEAD `65d1dab4` · pohon kerja kotor: 44 dokumen menyimpang dari HEAD):** `% cakupan` **64%** (44/69 dokumen aktif punya ≥1 rujukan terselesaikan) → `% segar` **95%** (42/44). Angka itu **bukan** bukti isi sudah benar: 64 dokumen hanya tersentuh **10 commit unik** (batch terbesar menyentuh 29 dokumen sekaligus) dan kedua kandidat usang berjarak **< 1 hari** — yang terukur adalah urutan commit pada hari yang sama. Rujukan yang gagal diselesaikan: **24** `tidak ada di repo` · **11** `ambigu` · **4** `belum di-commit`.
4. **Tidak ada aturan gate baru.** `scripts/check-docs.mjs` tidak diubah dan tidak memanggil kartu ini; sifat kartu (exit 0, boleh gagal, tidak memblokir) dipertahankan.

**Temuan sampingan dari daftar `tidak ada di repo` (diverifikasi, belum diperbaiki — di luar scope batch):** [PETA-KODE](../PETA-KODE.md) baris tabel "Shared utilities" menunjuk `backend/src/common/utils/cashflow-classifier.ts` dan `backend/src/common/utils/financial-ratios.helper.ts`, padahal **keduanya ada di `backend/src/modules/accounting/`** (diverifikasi `git ls-files`). Sisanya **campuran** dan belum boleh disebut temuan: path di luar repo yang sah (`scripts/seed-owner.js` dibuat `scripts/make-deploy.mjs`), nama dependency npm (`tesseract.js`), berkas bawaan Node (`npm.ps1`), dan rujukan yang memang sudah tidak ada.

**Kalibrasi yang menyimpang dari bacaan literal §2–§3** (semuanya tercatat di kepala skrip, bukan diam-diam): blok berpagar dinetralkan; tautan diselesaikan relatif-berkas **lalu** relatif akar repo; rujukan folder dilewati; kelas kartu bertanggal **tetap** masuk angka utama sesuai §2 (tanpa mempersempit cakupan) dan hanya ditambah rincian per kelas sebagai informasi. Bila kelas kartu bertanggal terbukti mendominasi angka kelak, itu keputusan owner tersendiri.

## 7. Sesudah alat ini: urutan memperkuat docs (sisa hari ini)

| Prioritas | Butir | Sumber |
|---|---|---|
| 1 | **Alat ukur kesegaran** (§1–§6 berkas ini) | — |
| 2 | **T-05** — aturan "pekerjaan terbuka tidak boleh ikut terarsip" masih **tanpa detektor**; satu-satunya aturan kita yang sepenuhnya harapan | [audit](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) §2 |
| 3 | **A-3 / T-10** — rumah kanon "batas kejujuran" (apa yang belum pernah dilihat mata/dijalankan) | [ADAPTASI](ADAPTASI-DOKTRIN-DOCS.md) §3 |
| 4 | **A-2** — dokumen kerja per tugas (`docs/kerja/TASK-<ID>.md`, **tanpa** kotak `[ ]`) | idem |
| 5 | **A-4** — jebakan mesin-dev di [default-dev](../operations/default-dev.md) §10 (setengahnya sudah berdiri); jebakan **produksi** sudah ada di [produksi](../operations/produksi.md) §10 — jangan diduplikasi | idem |
| 6 | **T-09** — kalimat kepala gate yang tidak bisa direkonsiliasi sendiri (`117 − 56 ≠ 66`); kosmetik tapi menyesatkan pembaca baru | [audit](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) §2 |
| 7 | **A-7b** — `--paksa` di `scripts/tambah-toc.mjs` masih **menambah** TOC kedua, bukan mengganti | idem |

**Status 2026-10-07 — ketujuh butir §7 SELESAI:**

| Prioritas | Status | Bukti |
|---|---|---|
| 1 | selesai (batch UKUR-KESEGARAN) | `scripts/ukur-kesegaran-docs.mjs` · potret pertama + uji negatif di §6 berkas ini |
| 2 **T-05** | selesai (batch SISA-DOCS) | gate mencetak **CATATAN ARSIP**: 244 kotak `[ ]` di 9 berkas `docs/arsip/**` — **non-pelanggaran** karena arsip beku (memblokir mustahil tanpa menyunting arsip + ledger konservasi); uji negatif dua arah di [kerja/TASK-T05-DETEKTOR-ARSIP](../kerja/TASK-T05-DETEKTOR-ARSIP.md); U-9 ditutup |
| 3 **A-3 / T-10** | selesai (batch SISA-DOCS) | [history/batas-kejujuran.md](../history/batas-kejujuran.md) + kalimat wajib di AGENTS §8 + pointer KONTRAK §9 |
| 4 **A-2** | selesai (batch SISA-DOCS) | [kerja/TASK-T05-DETEKTOR-ARSIP.md](../kerja/TASK-T05-DETEKTOR-ARSIP.md) (contoh pertama, tugas nyata) + konvensi di ANTREAN §3 |
| 5 **A-4** | selesai (batch SISA-DOCS) | [default-dev §10a](../operations/default-dev.md): 7 jebakan mesin-dev, masing-masing dengan bukti; jebakan produksi ditunjuk, tidak diduplikasi |
| 6 **T-09** | selesai (batch SISA-DOCS) | kepala gate kini `70 aktif = 65 di docs/ + 5 di akar repo (docs/ memuat 121 .md; 56 dikecualikan)` — bisa direkonsiliasi sendiri |
| 7 **A-7b** | selesai (batch SISA-DOCS) | `--paksa` **mengganti** seluruh blok TOC lama (uji: berkas dengan 2 TOC → 1), dan skrip menulis **LF** sesuai `.gitattributes`; sekaligus menutup derau "modified tanpa perubahan isi" |

Sisa yang **bukan** milik §7 dan masih menggantung: keputusan owner untuk **T-14** (banner 47 berkas arsip) dan **T-15** (line ending), keduanya tercatat di [audit §2](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md).

## 8. Aturan kerja yang berlaku di sesi berikutnya (jangan ditawar ulang)

- **Docs-only.** Jangan test/build/lint/typecheck, jangan server/DB (AGENTS §7). Satu-satunya pengecualian: skrip baru di `scripts/` untuk mengukur docs.
- **Gate harus hijau** sebelum menutup batch: `node scripts/check-docs.mjs` (v2.0, 11 aturan) **dan** `node scripts/ukur-kekuatan-docs.mjs`.
- Setiap **aturan baru** wajib **diuji negatif** (terbukti bisa gagal) dan **seluruh pelanggarannya ditutup pada batch yang sama**, supaya gate tidak pernah merah. Preseden hari ini: R8, R9, R10, R11.
- **Jangan** mengubah riwayat git, jangan memindahkan data untracked milik sesi lain (`.design-audit/` 36 MB menunggu keputusan owner), jangan menyentuh blok NIK penghuni (exception owner `PII-DOC-TENANT`).
- Angka yang ditulis di laporan wajib berasal dari keluaran perintah; tulis **potret + tanggal**. Jangan mengarang.
- Bila menemukan cacat pada alat ukur sendiri: **perbaiki alatnya lebih dulu**, laporkan, jangan menambal gejalanya. Hari ini ini terjadi tiga kali (slug tiruan, `--paksa`/akar repo, self-entry indeks) dan dua di antaranya hampir menjadi temuan palsu.

## 9. Self-test pagar + ratchet baris (dipasang 2026-10-09, batch PENUTUP)

Dua mekanisme yang belum ada sampai batch ini; keduanya menutup kerusakan yang **sudah** terbukti.

**Self-test pagar — `node scripts/check-docs.selftest.mjs`.** Menutup: pagar yang tidak pernah terbukti
bisa gagal tidak layak dipercaya (di repo rujukan, tiga kali sebuah pemeriksaan tampak hijau padahal
tidak memeriksa apa pun). Cara kerja: pohon sintetis di `.design-audit/selftest/` → dibuktikan **BERSIH**
lebih dulu (syarat mutlak) → satu pelanggaran disuntik per aturan R1–R11, gate wajib menangkapnya →
ditutup uji bahwa pemeriksaan yang **DILEWATI** berbuntut exit 2, bukan 0. Prasyarat: `check-docs.mjs`
menerima akar repo sebagai argumen, dan keluaran anak dialihkan ke berkas lewat fd (**bukan pipa** —
sandbox menolak pipa stdio). Pemasangan pertama: **13/13 lulus**, dan ia langsung menemukan **dua
kesalahan saya sendiri** — ekspektasi exit code (gate: `1` pelanggaran, `2` ada yang dilewati) dan teks
mutasi uji R4 yang memuat frasa yang dicari R4 sehingga ujinya palsu. **Pelajaran: teks mutasi tidak
boleh memuat apa yang sedang dicari aturan yang diuji.**

**Ratchet baris — pemeriksaan M di `scripts/ukur-kekuatan-docs.mjs`.** Menutup: pertumbuhan senyap.
Aturan: total baris dokumen aktif tidak boleh naik dari `scripts/docs-lines.baseline.json` (**data, bukan
dokumen**, jadi aturan angka volatil tidak dilanggar); kenaikan butuh keputusan pemilik — perbarui angka
baseline **beserta `alasan`** pada commit yang sama, atau pindahkan isi ke arsip. Sifatnya bagian dari
kartu kekuatan, jadi **laporan**, bukan gate (tidak mengubah exit code). Uji negatif sudah dijalankan
(+2 baris → GAGAL, lalu dikembalikan). **Batas jujurnya:** ratchet mengukur **pertumbuhan**, bukan
**kecukupan** — sistem rujukan menargetkan ≤6 berkas/≤1.500 baris dan repo ini jauh di atasnya, tetapi
memangkas isi yang masih berlaku adalah **keputusan pemilik**, bukan tindakan agen; memangkasnya justru
kerusakan termahal (butir pekerjaan hilang saat dokumen diringkas).

## 10. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat sebagai serah-terima penutup sesi. Owner memutuskan: alat ukur dikerjakan **di sesi baru**, dengan tugas utama memperkuat docs. Spesifikasi §2–§6 disusun agar angka pertama tidak menyesatkan (metrik, cakupan, batas, uji negatif). Belum ada kode yang dibuat. |
| 2026-10-07 | **Dieksekusi (batch UKUR-KESEGARAN, sesi baru).** `scripts/ukur-kesegaran-docs.mjs` dibangun (§2–§5), uji negatif §6 lulus, potret pertama dicatat di §6 beserta temuan sampingan dan kalibrasi. Register alat: [KONTRAK §7](../KONTRAK.md) · bukti bertanggal: [bukti-2026-10 §Kesegaran](../arsip/bukti-2026-10.md). Butir §7 prioritas 2–7 **belum** dikerjakan. |
