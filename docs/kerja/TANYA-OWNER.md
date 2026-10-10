# TANYA-OWNER — pertanyaan yang menunggu keputusan owner

> **Blok baca** · Jenis: **daftar pertanyaan untuk owner (bukan antrean, bukan kontrak)** · Status: **aktif — kosong per 10 Okt 2026 (semua pertanyaan sudah dijawab)** · Untuk siapa: owner + agen yang butuh jawaban sebelum melanjutkan
> · Baca kalau: owner ingin melihat **apa yang sedang menunggu keputusannya**, atau agen mau memastikan tidak ada pertanyaan terbuka. · **Jangan** dibaca kalau: mencari keputusan yang sudah final (itu [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)) atau memilih tugas (itu [ANTREAN](../ANTREAN.md)).

**Pertanyaan terbuka: TIDAK ADA.** Tujuh pertanyaan pertama (P1–P7: arah percepatan, increment pertama, flow app baru, gate uang, izin rilis, UI/UX, kerapatan docs) **sudah dijawab owner 10 Okt 2026** dan dipindah ke register keputusan sebagai **`MODE-CEPAT-UTAMA + KERJA-KECIL-COMMIT`** di [KEPUTUSAN-OWNER §6](../KEPUTUSAN-OWNER.md) — di sana juga ada `OTORITAS-TEKNIS-AI + EKONOMI-VERIFIKASI`. Ringkasan arahnya: Mode Cepat sebagai arah utama, mobile-first, ringan, navigasi berjenjang.

## Cara pakai berkas ini kalau nanti ada pertanyaan baru

Aturan (arah owner 10 Okt 2026 — [default-dev §12](../operations/default-dev.md)): **satu pertanyaan = satu keputusan**, ditulis bahasa manusia, wajib memuat **konteks · pilihan · risiko tiap pilihan · rekomendasi agen · default yang dijalankan bila tidak dijawab**. Pertanyaan yang sudah dijawab **dipindah** ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) dan **dihapus** dari sini. Tidak ada kotak `[ ]` di sini — ini bukan antrean kerja.

## Keputusan yang TIDAK perlu ditanyakan ke owner (agen memutuskan sendiri)

Dicatat supaya owner tahu apa yang berjalan tanpa menunggu dia — rincian di [default-dev §12](../operations/default-dev.md):

| Hal | Keputusan agen | Alasan satu baris |
|---|---|---|
| Struktur berkas, nama fungsi, urutan kerja, format dokumen | agen | keputusan teknis, tidak mengubah perilaku pengguna |
| `golive:setup` di `backend/package.json` yang menunjuk skrip terhapus | perbaiki saat menyentuh packaging | perintah mati membingungkan operator |
| Pola detektor nomor baris belum mengenal `.css/.html/.json` | perluas bersama uji negatifnya | pagar tanpa uji negatif tidak layak dipercaya |
| `design/` tidak ikut git | biarkan untracked + tandai buktinya sebagai bukti lokal | bukti harus jujur menyebut dirinya lokal |
| GAP #1/#3 di `flow.md` tampak sudah ditutup kode | biarkan sebagai status bertanggal | mencabut gap = keputusan bisnis owner |

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-10 | Dibuat: tujuh pertanyaan (P1–P7) dengan format konteks · pilihan · risiko · rekomendasi · default. |
| 2026-10-10 | **Dijawab owner** → dipindah ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) (`MODE-CEPAT-UTAMA + KERJA-KECIL-COMMIT`); berkas dikosongkan dari pertanyaan terbuka dan disisakan cara pakai + daftar keputusan yang tidak perlu ditanyakan. |
