> **ARSIP BEKU** · dipindah dari `docs/rencana/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# ADAPTASI — doktrin dokumentasi dari proyek lain, diterjemahkan ke KOST48

> **Blok baca** · Jenis: **rencana adaptasi (usulan, sebagian sudah dieksekusi)** · Status: **7 butir §3 selesai dieksekusi (A-1…A-7) per 2026-10-07** · Untuk siapa: owner pemutus kebijakan + agen pelaksana batch berikutnya
> · Baca kalau: memutuskan ide doktrin mana yang dipakai di KOST48, dan kenapa 5 berkas docs/kerja ditolak.
> · **Jangan** dibaca kalau: mencari tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau hasil pengukuran (itu [audit perbandingan](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md)).

**Maksud.** Doktrin proyek lain itu **bukan cetak biru**, dan tidak dicontek. Ia dipakai sebagai *daftar ide*; tiap ide diuji dengan dua pertanyaan: **apakah menjawab masalah KOST48 yang terukur**, dan **apakah bentuknya cocok dengan otoritas yang sudah ada**? Hasil: **7 ide diadopsi dalam bentuk lokal, 4 ditolak** (2 di antaranya akan melanggar aturan kita sendiri), sisanya sudah kita miliki dalam versi lebih kuat.

Angka dan temuan mentah ada di [audit perbandingan 2026-10-07](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) (T-01–T-10). Berkas ini **tidak mengubah** temuan itu; ia memutuskan apa yang dilakukan terhadapnya.

## 1. Tiga saringan sebelum sebuah ide diadopsi

1. **Jangan menciptakan otoritas kedua.** Bila sebuah ide menjadi aturan yang bisa berbenturan dengan AGENTS/KONTRAK, bentuknya harus berubah atau idenya ditolak (AGENTS §1).
2. **Jangan menambah aturan yang tidak bisa diperiksa.** Aturan tanpa detektor hanyalah harapan — doktrin itu sendiri yang mengajarkannya, dan kita sudah punya satu pelanggaran prinsip ini (tanpa kotak, tanpa pengawas).
3. **Ambil yang menjawab masalah terukur kita**, bukan yang terdengar rapi di proyek lain.

## 2. Celah terukur kita yang belum punya rumah (potret 2026-10-07)

Ini yang membuat adaptasi punya alasan, bukan selera.

| Celah | Bukti terukur | Rumah sekarang |
|---|---|---|
| **Jebakan yang sudah memakan waktu** (gejala → sebab → tindakan) | kata "jebakan" 4 kemunculan tersebar di 4 berkas; "kalau macet" 0; "pitfall" 0; "troubleshoot" 1 | **tidak ada** |
| **Spesifikasi kerja per tugas** (langkah, jangkar, "selesai bila", perintah verifikasi) | [ANTREAN](../ANTREAN.md) §3 = 1 baris per tugas (ID — judul \| Gate); "TASK-" 1 kemunculan; "kerangka tugas" 0 | **tidak ada** |
| **"Apa yang sebenarnya dibuktikan sebuah test"** | frasa ini **0** kemunculan di dokumen aktif | **tidak ada** |
| Sitasi **nomor baris** di dokumen awet | **28** kemunculan di 13 berkas aktif (terbanyak di PENUTUP-SITASI-RUSAK 6, audit-modul-2026 4, bukti-2026-10 3, portal-owner-admin 2) | tersebar, tanpa konvensi |
| **Outline sebelum membaca berkas panjang** | "outline" 3 kemunculan; tidak diwajibkan | anjuran tersirat |
| **Indeks folder basi & tidak bisa disegarkan** | 11 baris di 4 indeks menyimpang ≥0,3 KB (terbesar: klaim 54,9 KB vs nyata 58,0 KB); 5 indeks memuat klaim "dibuat ulang dengan `node scripts/buat-indeks-folder.mjs`", padahal skrip itu **berhenti** bila indeks sudah ada | klaim pemeliharaan yang tidak bisa dieksekusi |
| Salinan basi dokumen aturan di luar gate | `.design-audit/` 2.663 berkas / 36,3 MB, memuat cuplikan STATUS/AUDIT era pra-B2.2 | di luar [KONTRAK](../KONTRAK.md) §4 |

## 3. Yang diadopsi — 7 butir, dengan bentuk lokal

| ID | Ide doktrin | Bentuk lokal KOST48 (bukan salinan) | Berkas | Level | Nilai |
|---|---|---|---|---|---|
| **A-1** | Jangkar berupa **kutipan teks**, bukan nomor baris; penjaga memeriksa rujukan | Konvensi: spesifikasi tugas & aturan awet menunjuk lokasi lewat kutipan; nomor baris hanya sah di bukti audit bertanggal. Ditambah pemeriksa **anchor mati + nomor bagian ganda** di gate | [KONTRAK](../KONTRAK.md) §7 + `scripts/check-docs.mjs` | S | **Tinggi** — mencegah kelas T-01/T-02 terulang |
| **A-2** | Kerangka dokumen tugas TASK-NN untuk AI (§0–§9) | Berkas `docs/kerja/TASK-<ID>.md` — **tanpa kotak `[ ]`, tanpa daftar pekerjaan** (agar bukan antrean kedua), dirujuk dari baris ANTREAN. Kerangka dipangkas dari 10 bagian jadi **7**: tujuan & definisi selesai · kondisi awal + cara mengukur ulang · langkah dari risiko terendah (jangkar kutipan + "selesai bila" + perintah) · jebakan nyata · kalau macet (gejala → sebab → tindakan) · catatan penyimpangan (tabel kosong) · riwayat | templat baru + konvensi di [ANTREAN](../ANTREAN.md) §3 | S | **Tinggi** — ANTREAN tetap antrean, tugas berat dapat dokumen kerja |
| **A-3** | BATAS KEJUJURAN: larangan menulis "selesai/terverifikasi" tanpa bukti; sebutkan **apa yang sebenarnya dibuktikan** test | (a) satu rumah tetap untuk batas kejujuran; (b) dua kalimat di kontrak: klaim "hijau/selesai" wajib disertai arti buktinya (mis. "hijau = layar masih dirender", bukan "fiturnya bekerja") | `docs/history/batas-kejujuran.md` + [KONTRAK](../KONTRAK.md) §9 | S | **Tinggi** — langsung menaikkan mutu laporan |
| **A-4** | CHEATSHEET: catatan teknis per tugas (jangkar kode, jebakan, perintah verifikasi) | **Bagian tetap** di runbook dev, bukan berkas gaya CHEATSHEET baru. Setengahnya sudah berdiri pada batch SPLIT: [default-dev](../operations/default-dev.md) §10 kini memuat tabel perintah per-cwd (dipindah dari KONTRAK §5). Sisa A-4 = menambah daftar **jebakan mesin-dev**. Jebakan **produksi** sudah punya rumah sendiri di [produksi.md](../operations/produksi.md) §10 "Jebakan yang sudah terbukti (jangan diulang)" — **jangan diduplikasi, cukup ditunjuk** | [default-dev](../operations/default-dev.md) | S | Sedang–tinggi |
| **A-5** | Protokol bertanya sempit: bertanya hanya untuk uang, perilaku pengguna, penghapusan data | Batas atas kapan agen **tidak** bertanya: di luar 4 hal itu (uang · perilaku pengguna · hapus data · deploy/secret) putuskan sendiri + catat satu baris alasan. Ini melengkapi aturan kita yang sekarang hanya punya arah sebaliknya | AGENTS §4 + [KONTRAK](../KONTRAK.md) §2 | XS | **Tinggi** — langsung ke waktu owner |
| **A-6** | "Aturan yang menang tidak boleh jadi yang paling basi" | (a) detektor deterministik: **tidak boleh ada salinan berkas tangga wajib** (AGENTS/KONTRAK/ANTREAN/PETA-KODE) di luar `docs/`; (b) `.design-audit/` masuk daftar "jangan dibaca rutin" | gate + AGENTS §6 + KONTRAK §4 | S | **Tinggi** |
| **A-7** | Indeks/artefak turunan harus benar soal cara memperbaruinya | Pilih satu: tambahkan **mode penyegaran** ke generator indeks, **atau** ubah kalimat klaim di 5 indeks supaya jujur (skripnya membuat, bukan menyegarkan) | `scripts/buat-indeks-folder.mjs` (kode) atau 5 × README | XS | Sedang |

**Status eksekusi 2026-10-07 (batch SISA-DOCS) — tidak ada butir §3 yang tersisa:**

| Butir | Status | Bukti |
|---|---|---|
| A-1 | selesai (batch A-1) | R8 + konvensi kutipan di KONTRAK §7 |
| A-2 | **selesai** | [docs/kerja/TASK-T05-DETEKTOR-ARSIP.md](../kerja/TASK-T05-DETEKTOR-ARSIP.md) — dipakai untuk **tugas nyata** (detektor T-05), bukan contoh kosong; konvensi di [ANTREAN §3](../ANTREAN.md); indeks folder baru [docs/kerja](../kerja/README.md) |
| A-3 | **selesai** | [history/batas-kejujuran.md](../history/batas-kejujuran.md) (disiplin + register batas) · dua kalimat wajib di [AGENTS §8](../../AGENTS.md) · pointer di [KONTRAK §9](../KONTRAK.md) |
| A-4 | **selesai** | [default-dev §10a](../operations/default-dev.md) — 7 jebakan mesin-dev, tiap baris dengan bukti; jebakan produksi cukup **ditunjuk** ke produksi §10, tidak diduplikasi |
| A-5 | selesai (batch A-1) | AGENTS §4 + KONTRAK §2 |
| A-6 | selesai (batch RAPI) | R11 + `.design-audit` di daftar jangan-dibaca |
| A-7 | **selesai seluruhnya** | a: slugifier diselaraskan (batch A-1) · b: `--paksa` kini **mengganti** TOC (bukan menambah) dan skrip menulis **LF** sesuai `.gitattributes` (batch SISA-DOCS) |

## 4. Yang ditolak — dan cara membuatnya tidak ditawarkan lagi

| ID | Yang ditolak | Alasan | Akibat bila dipaksa |
|---|---|---|---|
| R-1 | `docs/kerja/ATURAN-AI.md` sebagai kontrak | Otoritas kedua; AGENTS §1 melarang aturan paralel, dan padanannya sudah ada di AGENTS + KONTRAK | Dua kontrak yang bisa saling bertentangan; pertanyaan "yang mana menang?" lahir kembali |
| R-2 | `docs/kerja/PEKERJAAN.md` sebagai satu-satunya daftar pekerjaan | [ANTREAN](../ANTREAN.md) sudah jadi satu-satunya antrean dan **dijaga R3** (0 kotak otoritatif di luar itu) | Antrean kedua; R3 kehilangan makna |
| R-3 | `docs/README.md` sebagai router | Router ada di AGENTS §3 dan **disuntik tiap request** — tidak bisa dilewatkan pembaca; item J kartu kekuatan sudah memastikan setiap folder punya indeks | Menambah satu tempat yang bisa basi tanpa menambah jaminan |
| R-4 | "Kerangka 5 berkas" sebagai paket | Yang berguna sudah diadopsi selektif (A-2, A-3); sisanya duplikasi | Birokrasi tanpa daya periksa |

**Sudah mengikat (2026-10-07):** keempat baris di atas **dicatat di [KONTRAK](../KONTRAK.md) §8** ("konflik yang sudah diselesaikan — jangan diangkat lagi"), jadi sesi berikutnya tidak perlu mengusulkannya lagi untuk ketiga kalinya.

## 5. Yang sudah kita miliki lebih kuat — jangan diseragamkan

Proksi biaya **byte** (doktrin tidak punya unit biaya) · **R1 angka volatil ber-mesin** · satu antrean + 142 kotak non-otoritatif yang semuanya bertanda · **ledger konservasi SHA-256** untuk arsip (doktrin hanya berkata "jangan hapus") · gate **exit 2** untuk pemeriksaan yang dilewati + daftar "yang TIDAK diperiksa" di kepala skrip · **daftar konflik selesai** dan pemisahan **pelaksanaan vs izin** · blok laporan 5 baris dengan exit code dan daftar "yang tidak dijalankan".

## 6. Satu ide doktrin yang ditolak sebagai **aturan rutin**

Sensus berkala "dokumen mana yang sudah tidak berlaku" (doktrin TUGAS A-a). Butuh mata manusia per berkas → tidak bisa jadi gate, dan sebagai aturan ia akan menjadi harapan kosong. Bentuk lokalnya: langkah **terjadwal dalam batch rombak** (mis. setiap 3 batch), hasilnya ditulis sebagai kartu audit bertanggal — bukan aturan tetap.

## 7. Urutan eksekusi yang diusulkan (nilai per biaya)

1. **A-5** — satu paragraf, dampak terbesar pada waktu owner.
2. **A-3b** — dua kalimat di KONTRAK §9; mengubah mutu semua laporan berikutnya.
3. **A-1** — konvensi + pemeriksa anchor/nomor bagian; menutup T-01/T-02 dan mencegah ulangannya.
4. **A-6** — detektor salinan basi + daftar jangan-dibaca; menutup T-04.
5. **A-7** — putuskan klaim generator (kode vs kalimat); menutup T-06.
6. **A-2** — dokumen kerja per tugas; **butuh satu tugas nyata sebagai contoh pertama**, jangan dibuat kosong.
7. **A-4** — daftar jebakan; tumbuh dari kejadian nyata. Mengisinya dengan karangan akan merusak gunanya.

## 8. Batas rencana ini

**Catatan 2026-10-07 (batch SISA-DOCS):** dua batas di bawah sudah **tidak berlaku** — "A-2 belum diuji pada tugas nyata" (kini dipakai untuk detektor T-05, lihat [dokumen kerjanya](../kerja/TASK-T05-DETEKTOR-ARSIP.md)) dan "detektor usulan A-1/A-6 belum ditulis" (keduanya sudah dipasang sebagai R8/R11 dan diuji negatif). Butir lain di bawah tetap berlaku sebagai catatan saat rencana ditulis.

- Semua angka adalah **potret terukur 2026-10-07**; belum satu pun butir dieksekusi, dan tidak ada perubahan kode/test/build pada batch penulisan rencana ini.
- **A-2 belum diuji pada tugas nyata.** Risikonya birokrasi (7 bagian untuk tugas XS). Syarat pakai: hanya untuk level ≥S, dan bagian yang tidak relevan boleh ditulis "tidak ada".
- Klaim "A-5 menjawab masalah terukur" **belum teruji**: proksinya jumlah pertanyaan blokir per batch, dan baseline-nya belum diukur.
- **A-7** punya dua opsi dengan sifat berbeda: mengubah skrip = perubahan **kode** (butuh gate kode), mengubah kalimat = docs-only.
- Detektor usulan A-1/A-6 belum ditulis, jadi belum diuji negatif. Sampai itu ada, keduanya masih **usulan**, bukan penjaga.

## 9. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat setelah owner menegaskan doktrin proyek lain **tidak** untuk dicontek, melainkan disesuaikan. Isi: 3 saringan, 7 celah terukur, 7 adopsi berbentuk lokal (A-1..A-7), 4 penolakan (R-1..R-4), 6 hal yang sudah lebih kuat, dan urutan eksekusi. Belum ada butir yang dieksekusi. |
| 2026-10-07 | Owner menyetujui urutan usulan (**A-5 lebih dulu, lalu A-1**). Dieksekusi pada hari yang sama: **A-5** (protokol bertanya sempit → AGENTS §4 + KONTRAK §2), **A-1** (konvensi rujukan kutipan di KONTRAK §7 + aturan gate **R8** + 22 anchor rusak diperbaiki), **A-7a** (slugifier `scripts/tambah-toc.mjs` diselaraskan dengan R8; opsi `--paksa` belum). Temuan pendukung: T-11 dan T-12 di [audit](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) §2 dan kalibrasi alat ukur di lampiran §7-nya. |
| 2026-10-07 | Batch **SPLIT+R9**: KONTRAK dipangkas dengan cara **memindahkan** isi (tabel perintah §5 → default-dev §10; tabel level §3 → pointer ke AGENTS §5, hanya kolom Build yang tinggal) dan "Riwayat" ganda disatukan; **R9** (nomor bagian ganda, catatan bertanggal dikecualikan) dipasang & diuji negatif; `arah-produk.md` dan `produksi.md` dinomori ulang; riak rujukan di AGENTS §5/§7 ditutup. Temuan **T-13**: data pribadi penghuni (NIK) di `docs/operations/produksi.md` — diputuskan owner sebagai exception bertanggal (`PII-DOC-TENANT`); klaim awal "berkas itu melarang isinya sendiri" dicabut (audit §6). |
| 2026-10-07 | Batch **RAPI** (perintah owner: "hari ini fokus docs dan rapi"): **47 label `[STATUS…]` basi → `[ANTREAN…]` di 29 berkas**; indeks folder bisa disegarkan (`--segarkan`) dan tidak lagi mendaftarkan dirinya sendiri (**22 baris ukuran basi → 0**); **R10** (judul H1 ganda) + **R11** (salinan berkas tangga di luar rumah kanonik) dipasang, gate jadi **v2.0 = 11 aturan**, keduanya diuji negatif; 3 berkas hidup dengan dua H1 diturunkan judul keduanya tanpa memutus anchor; `.design-audit/` didaftarkan jangan-dibaca; 3 berkas pointer (`copilot-instructions`, AI_QUICKREF, AI_WORKFLOW_GUIDE) menyatakan diri turunan + satu tautan mati diperbaiki. Keputusan tercatat: **U-7** blok baca tetap hanya untuk berkas tangga + indeks folder. |
| 2026-10-07 | Batch **SISA-DOCS** (perintah owner: "kerjakan yang berhubungan dengan docs 100%"): **A-2** (dokumen kerja per tugas + konvensi ANTREAN §3), **A-3** (rumah kanon batas kejujuran + kalimat wajib AGENTS §8), **A-4** (jebakan mesin-dev di default-dev §10a), **A-7b** (`--paksa` mengganti TOC + tulisan LF). Tiga butir §7 rencana penguatan docs juga ditutup pada batch yang sama: **T-05** (CATATAN ARSIP di gate, non-pelanggaran, uji negatif dua arah), **T-09** (kepala gate bisa direkonsiliasi), **T-10** (lihat A-3). Temuan sampingan terverifikasi: **T-14** (47 arsip tanpa banner) dan **T-15** (115 berkas CRLF) — keduanya **keputusan owner**; **T-16** peringatan bahwa 25 "mojibake" adalah kutipan sengaja. |
| 2026-10-07 | **Lanjutan batch SISA-DOCS — dua keputusan owner dieksekusi.** **T-14 opsi (b):** aturan banner arsip dibatasi pada berkas yang diarsipkan sejak DOCS-CLEANUP-1 (KONTRAK §7 + kalibrasi 15 gate); 47 berkas legacy **tidak** disunting. **T-15 normalisasi semua:** **114 berkas** dinormalkan CRLF→LF (32.273 CRLF; selisih byte tepat −32.273), `.ps1` dikecualikan sesuai `.gitattributes`, 8 berkas arsip ikut dengan hash sebelum→sesudah tercatat (ledger B2 tidak dilanggar — 0 hash per-berkas untuk berkas itu). Jebakan baru didokumentasikan: 114 entri ` M` hantu dari stat-cache index, obatnya `git update-index --refresh -- <berkas>` per berkas. |
