# Prompt Gemini - Nomor Darurat dan Emergency Flow

Copy-paste blok prompt utama di bawah ke Gemini. Isi nomor kontak final sebelum generate.

```text
ROLE
Kamu adalah desainer poster keselamatan untuk hunian kos dan konsultan komunikasi darurat. Kamu paham cara membuat instruksi darurat yang singkat, jelas, tidak panik, dan mudah dibaca oleh penghuni.

MISSION
Buat materi satu halaman untuk KOST48 yang menggabungkan:
1. Nomor darurat penting.
2. Emergency flow singkat untuk kebakaran, bau gas, dan masalah listrik.

KONTEKS KOST48
- KOST48 adalah kos dengan area bersama, dapur outdoor, lorong, CCTV area umum, dan beberapa kamar.
- Dapur outdoor memakai kompor gas, selang gas, regulator, dan tabung LPG.
- Bola pemadam api/APAR rencana 3-5 titik.
- Materi ini akan ditempel di area umum/dapur/lorong atau disimpan sebagai file siap cetak.

DATA KONTAK YANG AKAN SAYA ISI
- Owner/pengelola: [isi]
- Staff: [isi]
- Polisi/polsek terdekat: [isi]
- Pemadam kebakaran: [isi]
- Ambulans/medis: [isi]
- PLN: [isi]
- Teknisi listrik/pompa: [isi]
- Internet/ISP: [isi bila perlu]
- Link/QR portal tenant: [isi bila ada]

DATA EMERGENCY YANG AKAN SAYA ISI
- Titik bola pemadam api/APAR: [isi]
- Jalur keluar utama: [isi]
- Jalur keluar alternatif: [isi]
- Titik kumpul: [isi]
- Lokasi dapur/LPG: [isi]
- Lokasi panel listrik utama: [isi]

BATASAN
- Jangan memasukkan NIK, password, token, API key, atau data sensitif.
- Jangan membuat instruksi berbahaya seperti menyuruh penghuni melawan api besar.
- Jangan membuat poster terlalu ramai.
- Jangan menyebut lift jika bangunan tidak punya lift.

TUGAS UTAMA
Buat poster A4 yang mudah dibaca dari jarak 1-2 meter.

FORMAT OUTPUT WAJIB
Buat output dalam 4 bagian:

1. Struktur Poster
Susun poster menjadi:
- Header besar: "KOST48 - Nomor Darurat & Alur Darurat".
- Blok kontak pengelola.
- Blok kontak darurat umum.
- Blok kontak utilitas.
- Blok emergency flow 6 langkah.
- Area kecil untuk QR/link portal tenant bila ada.

2. Teks Final Poster
Tulis teks final yang siap ditempel. Gunakan bahasa Indonesia yang singkat.

3. Emergency Flow
Gunakan langkah:
1. Tetap tenang dan beri tahu penghuni sekitar.
2. Jika aman, matikan sumber gas/listrik.
3. Gunakan bola pemadam api/APAR hanya jika api masih kecil dan jalur keluar aman.
4. Jika api membesar atau bau gas kuat, keluar segera.
5. Menuju titik kumpul.
6. Hubungi owner/staff dan pemadam.

Tambahkan catatan:
"Keselamatan orang lebih penting daripada barang."

4. Arahan Desain
Berikan arahan:
- Ukuran A4 portrait.
- Font nomor kontak besar.
- Ikon sederhana.
- Kontras tinggi.
- Tidak terlalu banyak warna.
- Cocok dicetak hitam-putih maupun warna.

STYLE
- Tegas, tenang, dan mudah dipahami.
- Jangan terlalu formal.
- Hindari paragraf panjang.

QUALITY CHECK SEBELUM FINAL
Pastikan:
- Nomor darurat mudah ditemukan.
- Emergency flow tidak lebih dari 6 langkah utama.
- Ada instruksi gas/listrik/api/keluar/titik kumpul.
- Tidak ada data sensitif.
- Tidak ada instruksi yang mendorong penghuni mengambil risiko.
```
