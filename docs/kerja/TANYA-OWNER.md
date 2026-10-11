# TANYA-OWNER — pertanyaan yang menunggu keputusan owner

> **Blok baca** · Jenis: **daftar pertanyaan untuk owner (bukan antrean, bukan kontrak)** · Status: **aktif — kosong per 11 Okt 2026 (P9 dan P10 sudah dijawab)** · Untuk siapa: owner + agen yang butuh jawaban sebelum melanjutkan
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
Tidak ada pertanyaan yang menunggu keputusan owner per 11 Okt 2026.

Tiga pertanyaan terakhir sudah dijawab dan **dipindah** ke register: `PEMADATAN-STOP-MEKANIS + KARTU-3-ROLE + BASELINE-RATCHET-DITERIMA` di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) (P9 pemadatan berhenti di jalur mekanis · P10 kartu aturan hanya 3 role · baseline ratchet diterima). Blok P8 lama yang sudah dijawab juga dihapus dari sini pada hari yang sama — menurut aturan §1, pertanyaan yang sudah dijawab **tidak** disimpan dua kali.
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
| 2026-10-10 | **Pertanyaan lanjutan dijawab owner: (c)** (goal+todos dicatat permanen) → dipindah ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `LOG-GOAL-TODOS-PERMANEN`. **Penyimpangan yang dicatat apa adanya:** pertanyaan itu diajukan di chat dengan format lima unsur lengkap, tetapi **tidak lebih dulu ditulis ke berkas ini** — bagian "juga ditulis ke TANYA-OWNER" pada §1 tidak dipenuhi. Mulai sekarang pertanyaan ditulis di sini **lebih dulu**, lalu dipaparkan di chat. |
| 2026-10-11 | **P9 ditambahkan (pemadatan dokumentasi: mulai dari klaster IoT atau tunggu target owner).** Dijawab lebih dulu di berkas ini **sebelum** dipaparkan di chat, sesuai perbaikan aturan pada baris di atas. Dua koreksi yang ikut tercatat di konteks P9: angka potret §5 "7.887 baris di 20 berkas" tidak cocok dengan ukuran nyata (**7.900 baris di 18 berkas**), dan kandidat "klaster AI" di potret menunjuk berkas domain AI pemantauan yang **tidak ada di disk** (temuan ini sempat ditulis dalam backtick dan **ditegur gate R6** — sudah diperbaiki dengan menyebutnya sebagai deskripsi, bukan path). Blok P8 lama masih ada di §2 sebagai catatan pertanyaan lampau (jawabannya sudah di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)); ia boleh dihapus pada pembersihan berkas berikutnya. |
| 2026-10-11 | **P10 ditambahkan (kartu keputusan untuk penghuni/TENANT).** Muncul dari recon `AIDL-01b`: 16 aturan rule-based sudah hidup untuk OWNER/ADMIN/STAFF, TENANT belum punya. Karena menambah kartu penghuni = perilaku pengguna baru, keputusannya diangkat ke owner dengan 5 unsur lengkap. Default: kartu TENANT **tidak** ditambah, lanjut ke `AIDL-02`. |
| 2026-10-11 | **P9 dan P10 DIJAWAB owner: P9 (b), P10 (b), baseline ratchet diterima.** Jawabannya dipindah ke register sebagai `PEMADATAN-STOP-MEKANIS + KARTU-3-ROLE + BASELINE-RATCHET-DITERIMA` ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)), dan berkas ini **dikosongkan**: blok P10, P9, dan P8 (yang jawabannya sudah ada di register) dihapus sesuai aturan §1 "pertanyaan yang sudah dijawab tidak disimpan dua kali". Berkas 98 → 44 baris. Dampak yang langsung dieksekusi: gate `AIDL-01` di [ANTREAN §3](../ANTREAN.md) ditulis jujur "tiga role"; pemadatan **tidak** dilanjutkan ke penggabungan makna. |
