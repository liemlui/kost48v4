# SERAH-TERIMA — keadaan terakhir sesi dan langkah berikutnya

> **Blok baca** · Jenis: **potret keadaan + serah-terima sesi (bukan antrean, bukan kontrak)** · Status: **aktif (diperbarui tiap sesi besar)** · Untuk siapa: agen yang **membuka sesi baru** + owner yang menilai "sudah sampai mana"
> · Baca kalau: baru masuk ke repo ini dan butuh keadaan terakhir, pelajaran yang sudah memakan waktu, dan langkah berikutnya. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)), butuh aturan kerja (itu [AGENTS](../../AGENTS.md) + [KONTRAK](../KONTRAK.md)), atau mencari riwayat/bukti bertanggal (itu [bukti-2026-10](../history/bukti-2026-10.md)).

**Bukan antrean (aturan R-5).** Berkas ini **memuat potret, bukan status pekerjaan**: tidak ada kotak `[ ]`, tidak ada gate tugas, dan tidak ada baris yang boleh dibaca sebagai perintah kerja. Setiap baris "belum selesai" di §4–§5 **menunjuk** [ANTREAN](../ANTREAN.md) atau [batas-kejujuran](../history/batas-kejujuran.md) — statusnya tetap hanya di sana. Alasannya: [KONTRAK §8](../KONTRAK.md) R-5 · kontrak batch: [rencana/SERAH-SESI-DOCS](../rencana/SERAH-SESI-DOCS.md).

```yaml
# @kost48-state — blok yang diperiksa mesin, jangan diedit manual tanpa mengukur ulang.
head: faff7c365d30070e8a398e0833cc8e45878a394a   # git rev-parse HEAD saat potret
tanggal: 2026-10-09
gate: BERSIH                                      # node scripts/check-docs.mjs
kartu_kekuatan: 12/12                             # node scripts/ukur-kekuatan-docs.mjs
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

**Potret terakhir: 2026-10-09, branch `main`, HEAD `faff7c36`** — pohon kerja **bersih** kecuali dua berkas source owner yang sengaja tidak ikut commit batch dokumentasi (`frontend/src/pages/portal/MyManualPage.tsx`, `frontend/src/pages/public/CekPage.tsx`) dan dua folder untracked (`.design-audit/`, `design/`). Batch SERAH-SESI **sudah di-commit** pada `faff7c36` (72 berkas, +2714/−231).

**⚠ Koreksi tanggal yang mudah menyesatkan.** Sebelum commit itu, keadaan diukur pada **pohon kerja kotor**: HEAD `65d1dab4`, **69 berkas berubah** (51 diubah · 7 dipindah/di-rename · 11 untracked) — akumulasi batch B0–B8 dan SPLIT/RAPI/SISA-DOCS. Batch-batch itu **menyebut dirinya "2026-10-07"**, padahal **commit terakhir sebelum batch ini bertanggal 2026-10-06** dan gate di commit itu masih **v1.6** (bukan v2.0). Artinya label "2026-10-07" adalah **tanggal sesi yang belum di-commit**, dan **pengukuran pada berkas ini (2026-10-09) lebih baru dari label itu**. Yang dipakai sebagai tanggal di baris Fakta berkas tangga = **tanggal pengukuran nyata (2026-10-09)**; label "2026-10-07" di catatan batch **dibiarkan apa adanya** supaya arsip tidak disunting retroaktif, tetapi jangan dipakai sebagai tanggal pengukuran.

**Fakta ini bagian dari potret:** angka apa pun yang dibaca dari commit terakhir tidak sama dengan isi disk bila pohon kerja kotor ([kartu kesegaran](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md)).

| Ukuran | Nilai potret | Perintah pengukur |
|---|---:|---|
| `AGENTS.md` (disuntik tiap request, plafon 12 KB) | 9.592 B | `[IO.File]::ReadAllBytes("AGENTS.md").Length` |
| `docs/KONTRAK.md` (plafon 16 KB) | 16.121 B | idem |
| `docs/ANTREAN.md` (plafon 16 KB) | 15.193 B | idem |
| `docs/PETA-KODE.md` (plafon 16 KB) | 16.214 B | idem |
| Gate dokumen | **BERSIH** — 0 pelanggaran, 0 pemeriksaan dilewati, 11 aturan (v2.0) + 3 INFO | `node scripts/check-docs.mjs` |
| Kartu kekuatan | **12/12 = 100%** (11 pemeriksaan lama + **D** diperluas baris Fakta + **L** baru) | `node scripts/ukur-kekuatan-docs.mjs` |
| Rujukan nomor baris di dokumen kontrak aktif | **101** rujukan di 9 berkas (gate) · **102** di 10 berkas (kartu) — terbanyak `docs/operations/efisiensi-hosting.md` (29), `docs/domain/flow.md` (25) | INFO detektor di gate; kartu kekuatan pemeriksaan **L** |

**Kenapa dua angka (101 vs 102):** ruang lingkupnya memang berbeda, bukan selisih yang tak dijelaskan — detektor gate memakai **cakupan kontrak yang sama dengan R1** (9 berkas), sedangkan pemeriksaan **L** kartu juga menghitung `docs/rencana/**` (berkas kontrak batch) sehingga 10 berkas. Yang **sama** pada keduanya: berkas tangga wajib = **0**.

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
- **Belum dikerjakan, sudah terukur:** **102** rujukan nomor baris di 10 dokumen kontrak aktif — kebijakannya sudah ada ([KONTRAK §7](../KONTRAK.md)), detektornya sudah ada (INFO di gate), konversinya **belum** dijalankan. Pekerjaan Isi, butuh verifikasi kode per baris.
- **Batas sesi ini (jujur):** batch SERAH-SESI **hanya mengubah dokumentasi dan skrip ukur**. Tidak ada test/build/lint/typecheck, tidak ada server/DB, tidak ada deployment, dan **dampak runtime tidak diukur** — yang dibuktikan gate adalah *tautan dan bentuk dokumen benar*, bukan *aplikasi masih bekerja*.

## 6. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat pada batch SERAH-SESI bersama [PROMPT-SESI-BERIKUTNYA](PROMPT-SESI-BERIKUTNYA.md) dan [kontrak batchnya](../rencana/SERAH-SESI-DOCS.md). Bentuknya diadaptasi dari dokumen serah-terima proyek lain (isi tidak disalin, hanya perannya), lalu disesuaikan dengan aturan lokal: **tanpa kotak** (R3/R-5), dengan blok `@kost48-state` yang **diperiksa mesin** karena berkas serah-terima paling cepat basi dan paling mahal bila salah. |
