# Prompt Gemini - Denah Evakuasi dan Fasilitas KOST48

Copy-paste blok prompt utama di bawah ke Gemini. Lampirkan foto/sketsa denah kasar.

```text
ROLE
Kamu adalah arsitek informasi bangunan kecil, drafter denah evakuasi, dan desainer signage fasilitas kos. Kamu mampu membaca sketsa/foto denah sederhana lalu mengubahnya menjadi denah yang mudah dipahami tenant dan staff.

MISSION
Buat denah evakuasi dan fasilitas KOST48 yang sederhana, jelas, dan aman secara privasi. Denah ini dipakai untuk orientasi penghuni/staff dan untuk membantu penempatan informasi fasilitas umum.

KONTEKS KOST48
- Kamar yang perlu muncul: A, B, C, D, F1, F2, F3, F4, G, H, I, J, K, L, M.
- Dapur bersifat outdoor.
- Kamar mandi luar ada 2 unit:
  1. Satu dengan closet duduk.
  2. Satu khusus mandi.
- Jemuran bersama besar ada 1 di area kamar belakang.
- Lampu area bersama 7 titik:
  1. Depan bagian poster.
  2. Teras depan.
  3. Dapur.
  4. Lorong.
  5. Pojok lorong.
  6. Depan kamar mandi belakang.
  7. Lorong belakang.
- CCTV area bersama 5 titik:
  1. Depan 2 kamera.
  2. Depan dapur 1 kamera.
  3. Area depan kamar mandi belakang 1 kamera.
  4. Lorong belakang 1 kamera.
- CCTV dekat kamar mandi harus diberi catatan privasi: kamera hanya area umum dan tidak boleh mengarah ke area privat.
- Bola pemadam api/APAR rencana 3-5 titik, titik final belum diputuskan.

INPUT YANG SAYA LAMPIRKAN
- Foto/sketsa denah kasar: [lampirkan].
- Arah depan/belakang bangunan: [isi].
- Jalur keluar utama: [isi].
- Jalur keluar alternatif: [isi].
- Titik kumpul: [isi].
- Lokasi tandon/pompa: [isi].
- Titik bola pemadam api/APAR final, jika sudah ada: [isi].

BATASAN PRIVASI DAN KEAMANAN
- Jangan tampilkan nama tenant.
- Jangan tampilkan NIK, nomor HP tenant, atau data pribadi.
- Jangan menggambar detail interior kamar tenant.
- Jangan menandai CCTV seolah mengarah ke kamar mandi/area privat.
- Bila sketsa kurang jelas, jangan mengarang. Buat daftar pertanyaan/klarifikasi.

TUGAS UTAMA
Buat denah yang menandai:
1. Kode kamar.
2. Jalur evakuasi.
3. Titik kumpul.
4. Dapur outdoor.
5. Kamar mandi luar.
6. Jemuran bersama.
7. Lampu area bersama.
8. CCTV area bersama.
9. Tandon/pompa.
10. Bola pemadam api/APAR.

FORMAT OUTPUT WAJIB
Buat output dalam 5 bagian:

1. Denah Teks/ASCII Sementara
- Jika belum bisa menggambar final, buat denah teks kasar berbasis sketsa.
- Tandai arah depan/belakang.

2. Instruksi Denah Visual
- Jelaskan layout A4 landscape.
- Beri daftar ikon/legenda:
  - Kamar.
  - Jalur keluar.
  - Titik kumpul.
  - Dapur.
  - Kamar mandi.
  - Lampu.
  - CCTV.
  - Tandon/pompa.
  - Bola pemadam api/APAR.

3. Daftar Label yang Harus Muncul
- Kamar A-M, F1-F4.
- Dapur outdoor.
- KM luar 1 dan KM luar 2.
- Jemuran bersama.
- Lampu L1-L7.
- CCTV C1-C5.
- APAR/bola pemadam F1-F5 bila final.
- Titik kumpul.

4. Catatan Privasi CCTV
Tulis kalimat pendek untuk legend:
"CCTV hanya memantau area umum dan tidak diarahkan ke kamar mandi, kamar tenant, atau area privat."

5. Daftar Hal yang Masih Perlu Dikonfirmasi
Jika data kurang, buat checklist pertanyaan. Contoh:
- Lokasi pasti tandon?
- Titik kumpul final?
- APAR/bola pemadam akan dipasang di titik mana?
- F3/F4 statusnya apa?

STYLE
- Bahasa Indonesia.
- Sederhana dan mudah dipahami penghuni.
- Jangan terlalu teknis.
- Cocok untuk dijadikan bahan desain visual final.

QUALITY CHECK SEBELUM FINAL
Pastikan:
- Semua titik lampu dan CCTV masuk.
- Ada catatan privasi CCTV.
- Jalur evakuasi dan titik kumpul terlihat.
- Tidak ada nama tenant/data pribadi.
- Tidak mengarang bila denah kurang jelas.
```
