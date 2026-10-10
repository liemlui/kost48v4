# SERAH-SESI-DOCS — kontrak batch: sistem serah-terima sesi + ekspansi alat ukur

> **Blok baca** · Jenis: **kontrak batch dokumentasi** · Status: **aktif (A-8…A-13 dijalankan 2026-10-07)** · Untuk siapa: owner + agen pelaksana batch dokumentasi
> · Baca kalau: menilai atau melanjutkan batch ini, atau bertanya "kenapa ada berkas serah-terima dan pemeriksa keadaan". · **Jangan** dibaca kalau: memilih tugas produk (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan kerja (itu [AGENTS](../../AGENTS.md) + [KONTRAK](../KONTRAK.md)).

**Maksud.** Owner menilai **sistem kerja + struktur dokumentasi** proyek lain berjalan baik dan meminta sistemnya **ditiru — bukan isinya**. Batch ini mengeksekusi itu dengan disiplin yang sama seperti [ADAPTASI-DOKTRIN-DOCS](ADAPTASI-DOKTRIN-DOCS.md): tiap ide diuji "apakah menjawab masalah **KOST48** yang terukur", lalu diterima **dalam bentuk lokal**. Ide yang sudah ditolak di §4 berkas itu (R-1…R-4) **tidak** dibuka kembali.

## 1. Celah terukur yang dijawab batch ini (potret 2026-10-07)

| Celah | Bukti terukur sebelum batch | Rumah setelah batch |
|---|---|---|
| **Tidak ada berkas serah-terima sesi** | tidak ada `SERAH-TERIMA*`, `PROMPT-SESI*`, `CHEATSHEET*` di repo (pencarian nama berkas); keadaan sesi hanya tersebar di [bukti-2026-10](../history/bukti-2026-10.md) | [kerja/SERAH-TERIMA.md](../kerja/SERAH-TERIMA.md) + [kerja/PROMPT-SESI-BERIKUTNYA.md](../kerja/PROMPT-SESI-BERIKUTNYA.md) |
| **Berkas tangga tidak menyatakan kebasiannya sendiri** | tidak ada baris potret/tanggal di kepala `KONTRAK`/`ANTREAN`; `PETA-KODE` memakai "Tanggal: 2026-09-23" tanpa perintah ukur | baris **Fakta** di 4 berkas tangga + pemeriksaan **D** kartu kekuatan |
| **Kebijakan "kutipan, bukan nomor baris" tanpa detektor** | **85** rujukan `berkas:NNN` di 9 dokumen kontrak aktif (terbanyak `docs/domain/flow.md` 25); tidak ada pemeriksa | INFO detektor nomor baris di gate + pemeriksaan **L** kartu kekuatan (0 di berkas tangga) |
| **Register keputusan final tidak bernomor & bertanggal** | [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) memuat keputusan **tanpa** tanggal-impor + sumber; tidak ada pernyataan "jangan diangkat lagi" untuk keputusan bisnis | [KONTRAK §8](../KONTRAK.md) register final + R-5/R-6; invariant "Register keputusan final" di [KONTRAK §11](../KONTRAK.md) |
| **KONTRAK menyentuh plafon 16 KB** (sisa 0,11 KB sebelum batch) | `docs/KONTRAK.md` 16.273 B dari 16.384 B | §5 **dipindahkan utuh** ke [default-dev §11](../operations/default-dev.md) → 16.121 B (sisa 263 B) |

## 2. Aturan yang mengikat batch ini

1. **Tidak melemahkan apa pun.** Plafon byte, aturan gate (R1–R11, **exit code tidak berubah**), ledger konservasi, dan aturan arsip beku **tidak** disentuh. Yang bertambah hanya **pemeriksa** dan **rumah** bagi aturan yang sudah ada.
2. **Berkas serah-terima adalah potret, bukan antrean** (**R-5**): tanpa kotak `[ ]`, tanpa gate, dan setiap baris "belum selesai" menunjuk [ANTREAN](../ANTREAN.md) atau register batas.
3. **Angka tidak ditulis di dokumen tanpa perintah pengukurnya** (R1). Blok `@kost48-state` di berkas serah-terima justru **tunduk pada aturan ini**: ia menyatakan dirinya potret pada satu commit, dan ada pemeriksa yang membuktikannya.
4. **Pemeriksa baru bukan aturan baru.** Pelajaran **T-05** ([TASK-T05](../kerja/TASK-T05-DETEKTOR-ARSIP.md)): sesuatu yang tidak bisa ditutup (mis. 85 nomor baris di dokumen rujukan) **tidak** dijadikan pelanggaran yang memblokir — ia dilaporkan sebagai **INFO** supaya terlihat tiap kali gate jalan.
5. **Laporan batch** memakai bentuk 5 baris [KONTRAK §9](../KONTRAK.md), termasuk baris "yang TIDAK dijalankan".

## 3. Yang dieksekusi — 6 butir

| ID | Yang dikerjakan | Berkas | Level | Status |
|---|---|---|---|---|
| **A-8** | Berkas **serah-terima sesi** + **titik masuk sesi baru** (ejaan lokal: potret keadaan, pelajaran, batas, langkah berikutnya; tanpa kotak) | `docs/kerja/SERAH-TERIMA.md`, `docs/kerja/PROMPT-SESI-BERIKUTNYA.md` | S | **selesai** |
| **A-9** | **Baris Fakta** di 4 berkas tangga (tanggal potret + perintah pengukur) + pemeriksaan **D** kartu kekuatan diperluas | `AGENTS.md`, `KONTRAK`, `ANTREAN`, `PETA-KODE` | XS | **selesai** |
| **A-10** | **Detektor nomor baris** di gate sebagai **INFO** + pemeriksaan **L** kartu kekuatan (0 di berkas tangga) | `scripts/check-docs.mjs`, `scripts/ukur-kekuatan-docs.mjs` | S | **selesai** |
| **A-11** | **Register keputusan final** + dua penolakan baru **R-5/R-6** di KONTRAK §8, ditambah invariant cara memeriksanya | `docs/KONTRAK.md` | S | **selesai** |
| **A-12** | **Pemeriksa keadaan serah-terima** (`@kost48-state` vs repo: HEAD, berkas yang ditunjuk, label gate) | `scripts/ukur-serah-terima-docs.mjs` | M | **selesai** |
| **A-13** | **Pindahkan KONTRAK §5** (gate G0–G5 + aturan per level + exception uang) ke rumah teknisnya, **utuh** | `docs/operations/default-dev.md` §11 | S | **selesai** |

**Yang sengaja TIDAK dikerjakan** (supaya tidak diangkat lagi):

- **Konversi 101 rujukan nomor baris** di `docs/domain/**` dan `docs/operations/**` menjadi kutipan teks. **Dicoba dan dihentikan 2026-10-09.** Empat kerusakan terukur muncul dari **skrip konversi** (bukan dari dokumen lama): `\s{2,}` memuat newline → `flow.md` 508→305 baris · rentang **en dash** tidak tertangkap → sisa `prisma.service.ts–22` · aturan `| |`→`|` menghapus **kolom kosong tabel** · pola longgar `:[ \t]*\d+` + aturan pagar kode menghapus **nama simbol di dalam backtick** dan 3 pagar kode JSON. **Semua perubahan dipulihkan** (`git checkout`), 9 berkas bersih, **0 perubahan di-commit**. Kesimpulan: ini pekerjaan **Isi** (per rujukan + verifikasi kode), bukan pekerjaan mesin. Prosedur aman untuk transformasi massal dicatat di [default-dev §10a](../operations/default-dev.md); sisanya tetap terlihat sebagai INFO di gate.
- **Berkas `CHEATSHEET` gaya proyek lain**: padanannya sudah hidup sebagai bagian tetap [default-dev §10](../operations/default-dev.md) (tabel perintah) dan §10a (jebakan) — dibuat pada butir **A-4**. Menambah berkas baru = duplikasi.
- **`docs/README.md` sebagai router**: tetap ditolak (R-3); router ada di [AGENTS §3](../../AGENTS.md).

**Kekurangan yang ditemukan sendiri pada penutupan batch, lalu diperbaiki:**

1. **Label tanggal yang menyesatkan.** Batch-batch sebelumnya menyebut dirinya "2026-10-07" padahal **tidak ada commit bertanggal itu** (commit terakhir sebelum batch ini: **2026-10-06**; gate di commit itu masih **v1.6**). Waktu modifikasi berkas membuktikan tulisan itu memang dibuat 2026-10-07, jadi labelnya **sah sebagai tanggal penulisan**, tetapi **bukan** tanggal commit — dan tidak boleh dipakai sebagai tanggal pengukuran. Baris **Fakta** di 4 berkas tangga sekarang memakai **tanggal pengukuran nyata (2026-10-09)**; label lama di catatan batch **dibiarkan** (menyuntingnya = menyunting catatan bertanggal).
2. **Pemeriksa register keputusan menuduh yang benar** (12 → 1 → 0 temuan palsu). Ketiga sebabnya ada di **alat**, bukan di register owner: (a) tabel **indeks arsip/status** diperlakukan sebagai keputusan; (b) atribusi berupa **ID keputusan** (`D-01..D-31`, `AI-DECISION-*`, `DOCS-CLEANUP`) tidak dikenali polanya; (c) pola ID menuntut ≥3 huruf sehingga `D-01` tidak cocok. Hasil akhir: **LULUS — 9 baris keputusan + 9 baris indeks dikecualikan**; isi [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) **tidak** disentuh.

## 4. Kenapa bentuknya berbeda dari proyek sumber (bukan salinan)

| Ide sumber | Bentuk lokal KOST48 | Alasan |
|---|---|---|
| `SERAH-TERIMA` + `PROMPT-SESI-BERIKUTNYA` | Sama peran, **tanpa** kotak & tanpa daftar pekerjaan; ditambah blok `@kost48-state` yang **diperiksa mesin** | Kotak akan menjadi antrean kedua (R3/R-5). Sumber hanya meminta "ukur sendiri"; di sini klaim itu **dibuktikan** pemeriksa — berkas serah-terima paling cepat basi dan paling mahal bila salah |
| Kepala fakta (`versi_app:` / `test: NNN`) di **setiap** dokumen aktif | Hanya **baris Fakta** di 4 berkas tangga (bukan blok `yaml` di semua berkas) | 64 dokumen aktif × blok kepala = biaya byte dan pemeliharaan besar; yang paling menentukan kepercayaan pembaca adalah berkas tangga + berkas serah-terima |
| Register keputusan "final, jangan ditanya lagi" | Register final di KONTRAK §8 **+ invariant yang memeriksanya** | Sumber mengandalkan disiplin pembaca; di sini klaimnya punya cara periksa |

## 5. Bukti batch (diisi sesudah eksekusi)

| Pemeriksaan | Hasil |
|---|---|
| `node scripts/check-docs.mjs` | **BERSIH** — 0 pelanggaran, 0 dilewati, exit 0; INFO 3 (kartu bertanggal + anchor rapuh) |
| `node scripts/ukur-kekuatan-docs.mjs` | **13/13 = 100%** (11 pemeriksaan lama + **D** diperluas + **L** baru) |
| `node scripts/ukur-serah-terima-docs.mjs` | blok `@kost48-state` **cocok** dengan repo |
| Plafon byte | `AGENTS.md` 9,4 KB (12) · `KONTRAK` 15,7 KB (16) · `ANTREAN` 14,8 KB (16) · `PETA-KODE` 15,8 KB (16) — **semua di bawah plafon** |
| Yang **TIDAK** dijalankan | test/build/lint/typecheck, server, DB, UAT, deployment (docs-only — [default-dev §11](../operations/default-dev.md)). **Dampak runtime tidak diukur**: yang dibuktikan gate adalah tautan & bentuk dokumen, bukan aplikasi masih bekerja |

## 6. Pekerjaan lanjutan yang dibuka batch ini

1. **Konversi 85 rujukan nomor baris** (`docs/domain/**`, `docs/operations/**`, `docs/product/**`) — level L, butuh verifikasi kode; **belum** masuk [ANTREAN](../ANTREAN.md) §3.
2. **Pemeriksa `--keputusan`** (invariant "Register keputusan final" di [KONTRAK §11](../KONTRAK.md)) — bentuknya sudah ditetapkan, implementasinya kecil; boleh dikerjakan bersamaan dengan tugas dokumentasi berikutnya.
3. **Tiga tautan mati** yang tercatat pada potret kartu kekuatan (A: 10/11) — dua di antaranya adalah berkas batch ini yang **belum ada saat potret diambil**; verifikasi ulang sesudah batch ditutup.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat sebagai kontrak batch atas instruksi owner ("rombak total docs agar semakin kuat; jangan melemahkan; hal teknis diputuskan agen"). Enam butir A-8…A-13 dieksekusi pada hari yang sama. |
