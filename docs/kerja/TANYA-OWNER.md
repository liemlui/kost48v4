# TANYA-OWNER — pertanyaan yang menunggu keputusan owner

> **Blok baca** · Jenis: **daftar pertanyaan untuk owner (bukan antrean, bukan kontrak)** · Status: **aktif — kosong per 10 Okt 2026 (P8 sudah dijawab)** · Untuk siapa: owner + agen yang butuh jawaban sebelum melanjutkan
> · Baca kalau: owner ingin melihat **apa yang sedang menunggu keputusannya**, atau agen mau memastikan tidak ada pertanyaan terbuka. · **Jangan** dibaca kalau: mencari keputusan yang sudah final (itu [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)) atau memilih tugas (itu [ANTREAN](../ANTREAN.md)).

## 1. Cara pakai berkas ini (format wajib — arah owner 10 Okt 2026)

Setiap pertanyaan **wajib** memakai lima unsur ini, dalam bahasa manusia — bukan pilihan singkat yang membuat owner menebak:

1. **Konteks** — apa yang terjadi, dan kenapa ini butuh keputusan owner (bukan agen).
2. **Pilihan berhuruf (a) · (b) · (c)** — minimal dua; kalau pilihan belum terbayang, agen **menyusun dulu** pilihan yang masuk akal.
3. **Konsekuensi tiap pilihan** — apa yang terjadi, apa yang **tidak** terjadi, perkiraan biaya waktu/langkah, dan **risikonya** ditulis terbuka.
4. **Rekomendasi agen + alasan** — agen ikut berpikir, bukan cuma bertanya.
5. **Default bila tidak dijawab** — supaya pekerjaan lain tidak berhenti menunggu.

**Dilarang:** pertanyaan telanjang di chat ("mau saya commit?"), pertanyaan ya/tidak tanpa konsekuensi, dan pertanyaan yang memaksa owner membaca kode untuk bisa menjawab. Pertanyaan yang sudah dijawab **dipindah** ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) dan **dihapus** dari sini. Tidak ada kotak `[ ]` di sini — ini bukan antrean kerja.

## 2. Pertanyaan terbuka

### P8. (SUDAH DIJAWAB 10 Okt 2026 — pemilik aturannya: lihat register) Dua berkas source Anda — di-commit sekarang atau tidak?

**Konteks.** Ada dua berkas kode yang **sudah Anda ubah sendiri** sebelum sesi ini dan masih **belum di-commit**: [MyManualPage.tsx](../../frontend/src/pages/portal/MyManualPage.tsx) (kalimat "jika menunggak >30 hari, pengelola berhak memutus sewa" dihapus dari panduan penghuni) dan [CekPage.tsx](../../frontend/src/pages/public/CekPage.tsx) (ditambah bagian 7 tentang dua mode Cepat & Normal, catatan tanggal diperbarui ke 25 Sep, ditambah baris "deploy menunggu rencana rilis"). Karena belum di-commit, kedua perubahan itu **tidak terlacak git dan tidak ikut ter-push ke `main`**. Saya belum menyentuhnya, karena ini kode — bukan dokumen.

**Pilihan dan konsekuensinya:**

| Pilihan | Apa yang saya lakukan | Yang terjadi | Biaya | Risiko |
|---|---|---|---|---|
| **(a)** Build dulu, lalu commit + push | jalankan build frontend, kalau hijau → commit terpisah + push | perubahan Anda terlacak **dan** ada bukti frontend masih terkompilasi | ±5–15 menit mesin | **rendah** — kalau build gagal saya berhenti dan lapor, tidak memaksa commit |
| **(b)** Commit tanpa build | langsung commit + push | tercepat; perubahan terlacak | ±1 menit | **sedang** — kalau ada galat TypeScript/import, `main` jadi merah untuk sesi berikutnya, merusak kebiasaan "setiap commit hijau" |
| **(c)** Biarkan seperti sekarang | tidak ada tindakan | `main` tetap bersih (hanya dokumen hari ini) | 0 | **sedang** — perubahan Anda tetap tak terlacak; kalau disk bermasalah atau Anda pindah mesin, isinya hilang; halaman `/cek` di produksi tetap versi lama |

Yang **tidak** terjadi pada ketiga pilihan: **produksi tidak berubah** — deploy terpisah dan menunggu perintah Anda (`P5`: produksi saat Anda putuskan).

**Rekomendasi saya: (a).** Alasannya: `CekPage.tsx` adalah halaman **publik** yang dibaca calon penghuni, dan build adalah bukti minimum yang murah sebelum isinya masuk `main` lewat push. Gate uang tidak berlaku di sini, dan aturan Anda sendiri (`MOBILE-FIRST`, `UI-BOLEH-ROMBAK`) membuat perubahan tampilan tidak perlu ditahan. Catatan jujur: **build ≠ tampilannya benar** — build hanya membuktikan tidak ada galat tipe/import; verifikasi visual halaman perlu langkah terpisah.

**Jawaban owner: (d)** — periksa isi → build → commit + push. Sudah dieksekusi: build `exit 0` (tsc lulus, vite 1m 23s, PWA `qEDSp80ZMc1w`) dan commit `64107e55` dipush; satu cacat ditemukan saat pemeriksaan isi dan diperbaiki sebelum commit (komentar `CekPage.tsx` menunjuk berkas antrean lama *docs/STATUS.md* yang tidak ada). Keputusan lengkap: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `P8-BUILD-SEBELUM-COMMIT`. Blok pertanyaan ini boleh dihapus pada pembersihan dokumen berikutnya (arah owner P7: padatkan seefisien mungkin).

## 3. Keputusan yang TIDAK perlu ditanyakan ke owner (agen memutuskan sendiri)

Dicatat supaya owner tahu apa yang berjalan tanpa menunggu dia — rincian di [default-dev §12](../operations/default-dev.md):

| Hal | Keputusan agen | Alasan satu baris |
|---|---|---|
| Struktur berkas, nama fungsi, urutan kerja, format dokumen | agen | keputusan teknis, tidak mengubah perilaku pengguna |
| `golive:setup` di `backend/package.json` yang menunjuk skrip terhapus | perbaiki saat menyentuh packaging | perintah mati membingungkan operator |
| Pola detektor nomor baris belum mengenal `.css/.html/.json` | perluas bersama uji negatifnya | pagar tanpa uji negatif tidak layak dipercaya |
| `design/` tidak ikut git | biarkan untracked + tandai buktinya sebagai bukti lokal | bukti harus jujur menyebut dirinya lokal |
| GAP #1/#3 di `flow.md` tampak sudah ditutup kode | biarkan sebagai status bertanggal | mencabut gap = keputusan bisnis owner |

## 4. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-10 | Dibuat: tujuh pertanyaan (P1–P7) dengan format konteks · pilihan · risiko · rekomendasi · default. |
| 2026-10-10 | **Dijawab owner** → dipindah ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) (`MODE-CEPAT-UTAMA + KERJA-KECIL-COMMIT`); berkas dikosongkan dari pertanyaan terbuka. |
| 2026-10-10 | **Format pertanyaan diperketat** (arahan owner: "jelaskan detail, bahasa manusia, generate pilihan, sebutkan segala konsekuensinya"): format lima unsur jadi wajib, ditambah contoh benar vs salah, dan pertanyaan telanjang di chat dinyatakan pelanggaran. Aturan ikut masuk [AGENTS §4](../../AGENTS.md) + [default-dev §10a/§12](../operations/default-dev.md). Pertanyaan baru **P8** ditambahkan lengkap dengan pilihan (a)/(b)/(c) + konsekuensinya. |
| 2026-10-10 | **P8 dijawab owner: (d)** → dipindah ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `P8-BUILD-SEBELUM-COMMIT`; dieksekusi (build lulus, commit `64107e55` dipush). Berkas ini kembali kosong dari pertanyaan terbuka. |
