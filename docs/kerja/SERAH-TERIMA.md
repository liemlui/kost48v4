# SERAH-TERIMA — keadaan terakhir sesi dan langkah berikutnya

> **Blok baca** · Jenis: **potret keadaan + serah-terima sesi (bukan antrean, bukan kontrak)** · Status: **aktif (diperbarui tiap sesi besar)** · Untuk siapa: agen yang **membuka sesi baru** + owner yang menilai "sudah sampai mana"
> · Baca kalau: baru masuk ke repo ini dan butuh keadaan terakhir, pelajaran yang sudah memakan waktu, dan langkah berikutnya. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)), butuh aturan kerja (itu [AGENTS](../../AGENTS.md) + [KONTRAK](../KONTRAK.md)), atau mencari riwayat/bukti bertanggal (itu [bukti-2026-10](../history/bukti-2026-10.md)).

**Bukan antrean (aturan R-5).** Berkas ini **memuat potret, bukan status pekerjaan**: tidak ada kotak `[ ]`, tidak ada gate tugas, dan tidak ada baris yang boleh dibaca sebagai perintah kerja. Setiap baris "belum selesai" di §4–§5 **menunjuk** [ANTREAN](../ANTREAN.md) atau [batas-kejujuran](../history/batas-kejujuran.md) — statusnya tetap hanya di sana. Alasannya: [KONTRAK §8](../KONTRAK.md) R-5 · kontrak batch: [rencana/SERAH-SESI-DOCS](../rencana/SERAH-SESI-DOCS.md).

```yaml
# @kost48-state — blok yang diperiksa mesin, jangan diedit manual tanpa mengukur ulang.
head: 0b84034d92c00975a11fbd133b483667b5f37afb   # git rev-parse HEAD saat potret
tanggal: 2026-10-10
gate: BERSIH                                      # node scripts/check-docs.mjs
kartu_kekuatan: 13/13                             # node scripts/ukur-kekuatan-docs.mjs
periksa: node scripts/ukur-serah-terima-docs.mjs  # pemeriksa blok ini
```

Diperiksa oleh `node scripts/ukur-serah-terima-docs.mjs` ([KONTRAK §11](../KONTRAK.md) invariant "Kesesuaian berkas serah-terima"). **Ukur sendiri: jangan percaya blok di atas** — ia benar hanya pada commit `head` itu.

## 1. Urutan baca untuk sesi baru

1. [AGENTS.md](../../AGENTS.md) — disuntik otomatis; aturan, izin, level, gate.
2. [KONTRAK.md](../KONTRAK.md) — rincian aturan, berkas berisiko, bentuk laporan, invariant.
3. [ANTREAN.md](../ANTREAN.md) — **satu-satunya** antrean; pilih satu tugas dari §3.
4. Berkas ini §3–§5 — pelajaran, batas, dan langkah berikutnya. **Bukan** pengganti langkah 3.
5. Baru buka berkas topik (`docs/domain/**`, `docs/operations/**`, `docs/product/**`) sesuai tugas. Jangan membaca seluruh `docs/` sebagai orientasi ([KONTRAK §4](../KONTRAK.md)).

## 2. Keadaan repository pada potret

**Potret terakhir: 2026-10-10, branch `main`, HEAD `0b84034d`** — pohon kerja **tidak bersih**: dua berkas source milik owner (`frontend/src/pages/portal/MyManualPage.tsx`, `frontend/src/pages/public/CekPage.tsx`) dan dua folder untracked (`.design-audit/`, `design/`) — semuanya **di luar** batch dokumentasi dan tidak disentuh — **ditambah delapan berkas dokumen sesi 2026-10-10 yang belum di-commit** (§6). Tiga commit sesudah potret sebelumnya: PENUTUP (`9e8be972`), RUJUKAN (`3a7ba7e0`), kenaikan baseline ratchet (`0b84034d`).

**⚠ Koreksi yang mudah menyesatkan — keduanya diukur ulang 2026-10-10.** (a) Potret sebelumnya menyebut HEAD **`faff7c36`** ("72 berkas, +2714/−231"); commit itu **bukan nenek moyang HEAD dan tidak ada cabang yang memuatnya** — ia versi lama dari commit batch SERAH-SESI yang sama-sama berinduk `65d1dab4`, lalu digantikan **`9be0ea47`** (72 berkas, +2732/−232). Nomor dari catatan lama karena itu **tidak boleh disalin**. (b) Label tanggal di catatan batch adalah tanggal **penulisan sesi**, bukan tanggal commit maupun tanggal pengukuran: batch B0–B8 menyebut "2026-10-07" padahal commit terakhir saat itu 2026-10-06 dan gate-nya masih v1.6. Label lama **dibiarkan apa adanya** (menyuntingnya = menyunting catatan bertanggal); yang sah dipakai sebagai tanggal = **tanggal pengukuran nyata**.

**Fakta ini bagian dari potret:** angka apa pun yang dibaca dari commit terakhir tidak sama dengan isi disk bila pohon kerja kotor ([kartu kesegaran](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md)).

| Ukuran | Nilai potret | Perintah pengukur |
|---|---:|---|
| `AGENTS.md` (disuntik tiap request, plafon 12 KB) | 9.803 B | `[IO.File]::ReadAllBytes("AGENTS.md").Length` |
| `docs/KONTRAK.md` (plafon 16 KB) | 16.304 B (**sisa 80 B**) | idem |
| `docs/ANTREAN.md` (plafon 16 KB) | 15.256 B | idem |
| `docs/PETA-KODE.md` (plafon 16 KB) | 16.214 B (**sisa 170 B**) | idem |
| Gate dokumen + pagar | **BERSIH** — 0 pelanggaran, 0 pemeriksaan dilewati, 11 aturan (v2.0) + 3 INFO · self-test pagar **13/13 lulus** | `node scripts/check-docs.mjs` + `node scripts/check-docs.selftest.mjs` |
| Kartu kekuatan | **13/13 = 100%** (11 pemeriksaan lama + **D** diperluas baris Fakta + **L** + **M** ratchet: 13.684 baris = baseline 2026-10-10) | `node scripts/ukur-kekuatan-docs.mjs` |
| Rujukan nomor baris di dokumen kontrak aktif | **0** rujukan di 0 berkas kontrak (gate) · **1** di 1 berkas (kartu) — turun dari **70** pada 2026-10-10; sisa itu kutipan bertanggal `docs/rencana/PERTANYAAN-ROMPAK.md`, bukan dokumen hidup | INFO detektor di gate; kartu kekuatan pemeriksaan **L** |
| Kesegaran isi docs | `% cakupan` **71%** (49/69) · `% segar` **80%** (39/49) — potret 2026-10-10, HEAD `0b84034d` | `node scripts/ukur-kesegaran-docs.mjs` |

**Kenapa dua angka (0 vs 1):** ruang lingkupnya memang berbeda, bukan selisih yang tak dijelaskan — detektor gate memakai **cakupan kontrak yang sama dengan R1**, sedangkan pemeriksaan **L** kartu juga menghitung `docs/rencana/**` (berkas kontrak batch) sehingga satu kutipan bertanggal di sana ikut terhitung. Yang **sama** pada keduanya: berkas tangga wajib = **0**.

**Batas angka di atas:** semuanya potret, dan **pohon kerja belum bersih** — angka byte berubah begitu ada berkas disunting. Yang sah dijadikan bukti hanya keluaran perintah, bukan tabel ini.

## 3. Pelajaran yang sudah memakan waktu (jangan diulang)

Rumah lengkapnya: [default-dev §10a](../operations/default-dev.md) (jebakan mesin) dan [produksi §10](../operations/produksi.md) (jebakan produksi). Yang paling relevan untuk **pekerjaan dokumentasi** — tiga teratas:

1. **Plafon KONTRAK tidak bisa dinaikkan** (ditolak owner). Kalau aturan baru harus masuk, yang dilakukan adalah **memindahkan** yang lama ke rumah teknisnya (§5 dan tabel perintah sudah dipindah begitu), bukan menambah dan berharap gate mengalah.
2. **Gate tidak boleh menuduh yang benar.** Dua pola yang sudah terukur: contoh sintaks di dalam backtick dulu dihitung tautan mati (kalibrasi v1.4), dan slug anchor berbeda antara GitHub dan slugifier lama (R8 dua tingkat). Sebelum "memperbaiki" temuan, verifikasi **sumbernya**.
3. **Suntingan teks besar tumbuh tak terduga.** Ukur byte **per bagian sebelum** menyunting: pada 2026-10-07 bagian §7/§8 KONTRAK tumbuh ~2× perkiraan dan plafon 16 KB terlewati tanpa terasa. Perintah: `[IO.File]::ReadAllBytes(<berkas>).Length`, lalu potong per `^## `.

## 4. Temuan yang harus dibaca sebelum bekerja

1. **Batas kejujuran punya rumah** ([batas-kejujuran](../history/batas-kejujuran.md)): disiplin tetap + **register batas yang masih berdiri**. Kalau pekerjaanmu menutup satu baris di sana, hapus barisnya dan catat penutupannya di [bukti-2026-10](../history/bukti-2026-10.md).
2. **Keputusan yang sudah ditolak tercatat**: [KONTRAK §8](../KONTRAK.md) memuat R-1…R-6. Yang paling sering muncul kembali: struktur dokumen dari proyek lain (kontrak kedua, antrean kedua, router kedua). Jangan tawarkan lagi tanpa keputusan owner baru.
3. **Angka volatil tidak ditulis di dokumen.** Tulis perintahnya; bila angka wajib muncul, tandai sebagai **potret bertanggal**.
4. **Catatan bertanggal dibekukan** (`docs/audit/**`, `docs/history/**`, `docs/arsip/**`): nomor ganda dan angka basi di sana adalah artefak penggabungan, bukan utang. R9/R10/R1 mengecualikannya.
5. **`.design-audit/` memuat salinan basi dokumen aturan** dan **bukan** sumber aturan; bila bertentangan dengan `docs/`, yang di `docs/` menang ([KONTRAK §4](../KONTRAK.md)).

## 5. Langkah berikutnya (menunjuk, bukan memerintah)

- **Antrean:** [ANTREAN §3](../ANTREAN.md) — pilih satu tugas yang prasyaratnya terpenuhi. Butir dokumentasi yang masih terbuka: kontrak batch [SERAH-SESI-DOCS](../rencana/SERAH-SESI-DOCS.md) §6.
- **Menunggu keputusan owner:** [TANYA-OWNER](TANYA-OWNER.md) — pertanyaan berbahasa manusia (arah percepatan, **flow app baru**, gate uang, izin rilis/UI, perampingan docs) yang masing-masing sudah membawa konteks · pilihan · risiko · rekomendasi agen · **default yang dijalankan bila tidak dijawab**. Otoritas keputusan: [AGENTS §4](../../AGENTS.md) + [default-dev §12](../operations/default-dev.md).
- **Selesai 2026-10-10 — konversi rujukan nomor baris tuntas:** **70 → 0** di dokumen kontrak aktif (1 kutipan bertanggal tersisa di `docs/rencana/`). Dikerjakan **per rujukan dengan mata pada kode**, bukan transformasi teks — 6 berkas tuntas pada batch RUJUKAN, 4 berkas sisanya (`efisiensi-hosting` 29 · `flow` 32 · `publik` 18 · `default-dev` 1) pada sesi ini. Bahwa nomor baris itu **memang menyesatkan** dibuktikan, bukan diduga: rujukan lama ke metode `complete` di `stays.service.ts` mendarat **165 baris** dari posisi sebenarnya, `processDeposit` meleset **626 baris**, dan 31 dari 32 rujukan di `flow.md` sudah basi. Pelajaran yang tetap berlaku ([default-dev §10a](../operations/default-dev.md)): **konversi otomatis selalu merusak** (dicoba 6×: tabel tergabung, backtick rusak, kolom tabel hilang, nama simbol terhapus) — sisa pekerjaan seperti ini adalah **pekerjaan Isi**, bukan pekerjaan mesin.
- **Sasaran kerapatan docs (arah owner 10 Okt 2026 — bukan lagi ≤1.500 baris, tapi angka yang diukur).** Yang dijaga adalah **biaya baca sesi baru**, bukan total halaman. Potret 2026-10-10: **bootstrap 712 baris** (7 berkas: AGENTS 109 · KONTRAK 142 · ANTREAN 96 · PETA-KODE 172 · SERAH-TERIMA 79 · PROMPT-SESI 85 · TANYA-OWNER 29) → sasaran **≤800** · **referensi domain+operasi 7.887 baris di 20 berkas** (dibaca sesuai tugas, bukan saat masuk) → sasaran **−20% (±6.300)** lewat penggabungan duplikasi, dijalankan dalam batch kecil · **total dokumen aktif 13.794 baris / 70 berkas** → sasaran **≤12.000** · aturan tambahan: **tidak ada dokumen baru tanpa menggabungkan/menutup satu yang lama**. Ukur: `(Get-Content <berkas>).Count` per kelompok, atau `node scripts/ukur-kekuatan-docs.mjs` (pemeriksaan M/ratchet). Larangan tetap: **jangan memangkas isi yang masih berlaku** — pindahkan, bukan hapus.
- **Batas sesi ini (jujur):** batch SERAH-SESI **hanya mengubah dokumentasi dan skrip ukur**. Tidak ada test/build/lint/typecheck, tidak ada server/DB, tidak ada deployment, dan **dampak runtime tidak diukur** — yang dibuktikan gate adalah *tautan dan bentuk dokumen benar*, bukan *aplikasi masih bekerja*.

## 6. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat pada batch SERAH-SESI bersama [PROMPT-SESI-BERIKUTNYA](PROMPT-SESI-BERIKUTNYA.md) dan [kontrak batchnya](../rencana/SERAH-SESI-DOCS.md). Bentuknya diadaptasi dari dokumen serah-terima proyek lain (isi tidak disalin, hanya perannya), lalu disesuaikan dengan aturan lokal: **tanpa kotak** (R3/R-5), dengan blok `@kost48-state` yang **diperiksa mesin** karena berkas serah-terima paling cepat basi dan paling mahal bila salah. |
| 2026-10-09 | Pemeriksaan **M** (ratchet baris) dan self-test gate dipasang pada batch PENUTUP; uji negatif ratchet (+2 baris) terbukti GAGAL lalu dikembalikan. |
| 2026-10-10 | **Sinkronisasi potret + penutupan konversi rujukan.** Potret: `head` 3 commit basi · `kartu_kekuatan` 12/12 padahal 13/13 · nomor commit `faff7c36` yang **yatim** (digantikan `9be0ea47`, +2732/−232 bukan +2714/−231) · baris "101 rujukan di 9 dokumen" yang sudah 70 di 4. Konversi: **70 → 0** rujukan nomor baris di dokumen kontrak (§5). Koreksi isi yang ikut terbukti: bagian audit UI/UX 2026-06-19 di `publik.md` (8 temuan sudah ditutup), register GAP #1/#3 di `flow.md`, `golive-setup.js` → `seed-owner.js`, klaim `data-master.md` "sudah dihapus", `bootstrap.sql` → `sql/bootstrap-production-schema.sql`, kutipan glob `test:unit`. Semua angka diukur ulang, bukan disalin. |
