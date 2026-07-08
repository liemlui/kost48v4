# Prompt Gemini - Audit Inventaris Total, Kondisi, dan Nilai Aset KOST48

Copy-paste blok prompt utama di bawah ke Gemini. Lampirkan foto/sketsa bila ada.

Tujuan dokumen hasil: (1) cek kondisi fisik + kelengkapan data aplikasi, (2) **pendataan inventaris total** untuk menyusun Daftar Aset Tetap + estimasi nilai aset bisnis (bahan hitung aset bersih di akuntansi). Aplikasi KOST48 sudah punya modul Aset Tetap (`FixedAsset` + penyusutan), jadi hasil audit harus siap diinput ke aplikasi.

```text
ROLE
Kamu adalah konsultan operasional kos, auditor fasilitas, perancang form inspeksi lapangan, DAN akuntan praktis UMKM yang paham stock opname, daftar aset tetap, penyusutan garis lurus, dan penilaian aset sederhana untuk bisnis kos di Indonesia.

MISSION
Buat dokumen audit inventaris total (stock opname) untuk KOST48 dengan DUA tujuan sekaligus:
1. OPERASIONAL - owner/staff keliling kos, mengecek kondisi nyata, menemukan barang yang perlu perbaikan/ganti/beli, dan melengkapi data yang belum masuk aplikasi.
2. KEUANGAN - mendata SEMUA barang dan fasilitas bernilai sehingga bisa disusun Daftar Aset Tetap lengkap dengan harga perolehan, umur ekonomis, dan estimasi nilai buku, sebagai dasar perhitungan total aset dan aset bersih bisnis.
Ini BUKAN form serah-terima tenant dan BUKAN kontrak tenant.

KONTEKS KOST48
- Kamar yang perlu diaudit (13 kamar): A, B, C, D, F1, F2, G, H, I, J, K, L, M. (F3/F4 sudah TIDAK ADA - blok F dirombak menjadi F1 dan F2 saja.)
- Tanggal cut-off audit: 31 Juli 2026 - semua saldo dan nilai mengacu ke tanggal ini.
- Nota pembelian hampir tidak ada: default sumber harga = E (estimasi); N hanya bila nota kebetulan ditemukan.
- Pendingin kamar CAMPURAN AC dan kipas - jenis pendingin wajib dicatat per kamar.
- F1 punya kamar mandi dalam dengan closet jongkok.
- Kamar mandi dalam lain memakai closet duduk.
- Kamar G, H, I memakai kamar mandi luar bersama.
- Kamar mandi luar ada 2 unit:
  1. Satu kamar mandi luar dengan closet duduk.
  2. Satu kamar mandi luar khusus mandi.
- Kamar mandi luar memakai bak air plastik besar, bukan ember kecil, dan tidak memakai shower.
- Jemuran bersama besar ada 1 di area kamar belakang.
- Dapur outdoor: kran ada, tempat sampah ada, rak piring tidak ada, ventilasi khusus tidak perlu.
- Dapur punya kompor gas, selang gas, regulator, dan tabung LPG.
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
- CCTV dekat kamar mandi wajib dicek sudutnya agar tidak mengarah ke area privat.
- Bola pemadam api/APAR rencana 3-5 titik, titik final belum diputuskan.
- Data kWh listrik, meter reading, jadwal cuci AC, dan status AC sudah punya tempat di aplikasi. Audit hanya mencatat kondisi fisik, angka/riwayat yang perlu disinkronkan, dan masalah yang butuh tiket/perbaikan.

KONTEKS MODUL ASET APLIKASI (WAJIB DIIKUTI)
Aplikasi KOST48 sudah punya modul Aset Tetap dengan penyusutan garis lurus. Setiap aset yang akan diinput butuh field berikut - form audit HARUS mengumpulkan data ini untuk tiap barang bernilai:
- Kode aset (usulkan format konsisten, contoh: AC-KAMAR-A, CCTV-DEPAN-1, POMPA-01).
- Nama aset.
- Kategori (pakai persis nilai ini): BUILDING (bangunan), RENOVATION (renovasi), ROOM_EQUIPMENT (perlengkapan kamar), FURNITURE (furniture), ELECTRONIC (elektronik), UTILITY_EQUIPMENT (pompa/tandon/instalasi/utilitas), VEHICLE (kendaraan), SOFTWARE, OTHER (lainnya).
- Lokasi: ROOM (sebut kode kamar), GENERAL (area bersama), WAREHOUSE (gudang).
- Tanggal/tahun perolehan. Bila nota hilang boleh perkiraan, WAJIB ditandai "estimasi".
- Harga perolehan Rupiah per unit. Sumber ditandai: N = ada nota, E = estimasi (harga beli dulu atau harga baru sekarang - sebutkan metodenya).
- Nilai sisa (salvage) Rupiah - default 0.
- Umur ekonomis dalam BULAN.
- Catatan kondisi.

ATURAN KAPITALISASI DAN UMUR EKONOMIS (SUDAH DIPUTUSKAN OWNER - jangan diubah)
- Ambang kapitalisasi (revisi owner 2026-07-08): barang TAHAN LAMA (umur pakai > 1 tahun) dengan harga >= Rp 100.000 per unit dicatat sebagai ASET_TETAP dan disusutkan. Konteks kos: harga barang kecil, jadi kipas angin (Rp 150-250rb), lemari plastik (Rp 200rb), bak air besar, kasur murah SEMUA masuk aset tetap.
- Barang tahan lama < Rp 100.000 dicatat sebagai PERLENGKAPAN: cukup jumlah + kondisi + estimasi nilai total per jenis (tidak disusutkan per unit, masuk estimasi nilai inventaris).
- Barang cepat habis/rusak (sprei, sarung bantal, gayung, sikat, hanger, cairan pembersih) tandai HABIS_PAKAI: cukup jumlah + kondisi, tidak masuk nilai aset.
- Acuan umur ekonomis (selaras kelompok penyusutan pajak Indonesia): AC/elektronik/router/CCTV/pompa kecil 48 bulan; furniture kayu/besi dan kasur bagus 48-96 bulan; tandon/instalasi listrik-air/utilitas besar 96 bulan; renovasi 48-96 bulan sesuai jenis; bangunan permanen 240 bulan. Tanah TIDAK disusutkan dan dicatat terpisah dari bangunan.
- Setiap barang diberi kolom "Perlakuan": ASET_TETAP / PERLENGKAPAN / HABIS_PAKAI.

BATASAN KEAMANAN DATA
- Jangan minta atau menampilkan NIK, foto KTP, password WiFi/admin, token cron, API key, akses cPanel, atau data sensitif.
- Nama tenant boleh dibuat kolom opsional, tapi beri catatan "tanpa NIK".
- Jangan membuat klaim hukum atau klaim nilai pasar yang terlalu pasti. Nilai estimasi selalu ditandai estimasi.

TUGAS UTAMA
Buat dokumen audit yang bisa dipakai langsung di HP atau dicetak sederhana. Dokumen harus membantu menjawab:
1. Barang/fasilitas apa saja yang ada secara fisik (inventaris total)?
2. Data apa yang belum masuk aplikasi?
3. Barang mana yang kondisinya baik, perlu monitor, perlu perbaikan, perlu diganti, atau perlu dibeli?
4. Tiket maintenance apa yang perlu dibuat?
5. Data app apa yang perlu diupdate setelah audit?
6. Berapa estimasi total nilai aset per kategori dan per lokasi?
7. Daftar aset mana yang siap diinput ke modul Aset Tetap aplikasi?

FORMAT OUTPUT WAJIB
Buat output dalam struktur berikut:

1. Ringkasan Cara Pakai
- 5-8 poin singkat cara owner/staff melakukan audit.
- Jelaskan bahwa ini audit kondisi + inventaris total untuk nilai aset, bukan serah-terima tenant.
- Jelaskan urutan: keliling isi form fisik dulu, lalu pindahkan barang bernilai ke Register Aset (form 6).

2. Standar Status dan Prioritas
- Kondisi: BAIK, CUKUP, PERLU_PERBAIKAN, GANTI, HILANG, TIDAK_ADA.
- Aksi: OK, MONITOR, UPDATE_APP, BUAT_TIKET, BELI, GANTI, BERSIHKAN, CEK_ULANG.
- Prioritas: P0 bahaya/segera, P1 penting, P2 bisa dijadwalkan, P3 kosmetik.
- Perlakuan aset: ASET_TETAP, PERLENGKAPAN, HABIS_PAKAI (pakai aturan kapitalisasi di atas).

3. Form Audit Per Kamar (fokus fisik, tetap ringkas untuk dipakai keliling)
Buat template tabel per kamar dengan kolom:
- Item
- Ada/Tidak
- Jumlah
- Kondisi
- Perlakuan (ASET_TETAP/PERLENGKAPAN/HABIS_PAKAI)
- Sudah Masuk App? (Belum/Sebagian/Sudah/Tidak Perlu)
- Foto Ada?
- Aksi
- Prioritas
- Catatan

Kelompok item per kamar:
- Identitas kamar: kode, status kamar, tenant saat ini tanpa NIK, harga sewa, deposit, kategori, catatan.
- Kunci: anak kunci total, anak kunci cadangan, kondisi kunci/pintu.
- Tidur/furniture: kasur, ukuran kasur, sprei, bantal, sarung bantal, guling bila ada, sarung guling, lemari plastik/multiplek/besi, hanger, bak sampah.
- Bukaan/pintu: pintu kamar, jendela, selot/kunci jendela.
- Listrik fisik: lampu kamar, stop kontak, stekker, tee listrik, kondisi fisik kWh meter, MCB. Catat bahwa data kWh resmi tetap di aplikasi.
- Pendingin: AC/kipas, remote AC, status dingin/tidak. Catat bahwa jadwal cuci AC resmi tetap di aplikasi.
- Kamar mandi dalam bila ada: closet duduk/jongkok, double stop kran toilet, selang fleksibel ke tank closet, jet shower, kepala jet shower, double kran, selang shower, kepala shower, ember, gayung, sikat lantai, sikat closet, hanger kamar mandi, lampu kamar mandi, pintu kamar mandi, floor drain.

4. Form Audit Kamar Mandi Luar
Masukkan 2 unit:
- KM luar dengan closet duduk.
- KM luar khusus mandi.
Item: bak air plastik besar, kran, gayung, sikat, lampu, pintu, floor drain, kebersihan, bau, kebocoran.
Catat bahwa KM luar tidak memakai shower.

5. Form Audit Area Bersama
Kelompok:
- Lampu area bersama 7 titik.
- CCTV area bersama 5 titik dengan catatan privasi.
- Dapur outdoor dan LPG (kompor, selang, regulator, tabung).
- Tandon/pompa/air.
- Jaringan internet: router, access point, switch, kabel, adaptor/UPS bila ada.
- Alat kebersihan: sapu, pel, cikrak, ember, sikat, tempat sampah, cairan pembersih.
- Jemuran bersama besar.
- Kursi santai bila ada.
- Bola pemadam api/APAR rencana 3-5 titik.

6. Register Aset dan Nilai (INTI KEUANGAN - satu tabel gabungan seluruh kos)
Kumpulkan SEMUA barang berlabel ASET_TETAP dari form 3-5 plus aset besar berikut ke SATU tabel register:
- Tanah - baris sendiri, TIDAK disusutkan, nilai dari NJOP SPPT PBB (dokumen tersedia).
- Bangunan kos (BUILDING) - baris sendiri, dinilai SEKALI dalam kondisi saat ini per 31 Juli 2026; renovasi bertahap 2011-kini TIDAK dirunut per proyek (sudah terserap dalam nilai kondisi kini); penyusutan mulai dari cut-off, umur 240 bulan.
- Instalasi listrik/air, tandon, pompa (UTILITY_EQUIPMENT).
- Seluruh AC per kamar, CCTV per titik, router/AP (ELECTRONIC).
- Furniture bernilai per kamar (FURNITURE / ROOM_EQUIPMENT).
Kolom register:
- Kode Aset (usulan)
- Nama Aset
- Kategori (enum aplikasi)
- Lokasi (ROOM + kode kamar / GENERAL / WAREHOUSE)
- Jumlah
- Tahun Perolehan (tandai E bila estimasi)
- Sumber Harga (N=nota / E=estimasi)
- Harga Perolehan per Unit (Rp)
- Total (Rp)
- Nilai Sisa (Rp, default 0)
- Umur Ekonomis (bulan)
- Estimasi Nilai Buku Sekarang (Rp, garis lurus sederhana)
- Kondisi
- Catatan
Tambahkan juga tabel kecil "Estimasi Nilai Perlengkapan" (barang PERLENGKAPAN per jenis: jumlah x estimasi harga = nilai total), terpisah dari aset tetap.

7. Ringkasan Akhir
Buat tabel ringkasan:
- Rekap nilai aset per kategori: total harga perolehan, estimasi akumulasi penyusutan, estimasi nilai buku.
- Rekap nilai aset per lokasi (per kamar / area bersama / gudang).
- Daftar aset siap input ke modul Aset Tetap aplikasi (baris yang datanya sudah lengkap).
- Data yang belum masuk aplikasi.
- Barang yang perlu dibeli.
- Barang/fasilitas yang perlu diganti.
- Tiket maintenance yang perlu dibuat.
Tutup dengan blok "DATA NON-FISIK UNTUK HITUNG ASET BERSIH" berisi checklist singkat yang TIDAK didapat dari keliling dan harus dilengkapi owner dari catatan keuangan/aplikasi: saldo kas dan semua rekening bank per tanggal cut-off, piutang sewa (tagihan tenant belum dibayar), kewajiban deposit jaminan tenant yang sedang dipegang (refundable = hutang), sewa dibayar di muka (pendapatan diterima di muka), hutang/pinjaman/cicilan bila ada. Rumus: Aset Bersih = (kas + bank + piutang + nilai buku aset tetap + nilai perlengkapan) - (deposit tenant + sewa diterima di muka + hutang). Ingatkan untuk menetapkan SATU tanggal cut-off agar semua angka konsisten.

8. Checklist Foto Audit
Buat daftar foto yang harus diambil:
- Tampak kamar.
- Kasur/furniture.
- Kamar mandi.
- Kunci.
- Stop kontak/MCB/kWh meter fisik.
- AC/kipas (termasuk pelat merk/tipe untuk bantu estimasi harga).
- Kerusakan.
- Area bersama: lampu, CCTV, dapur/LPG, tandon/pompa, jaringan, jemuran.
- Nota/kwitansi pembelian yang masih ada (difoto sebagai arsip bukti harga perolehan).

STYLE
- Bahasa Indonesia.
- Praktis, rapi, tidak terlalu banyak teori akuntansi - cukup istilah yang dipakai di form.
- Format tabel markdown.
- Bisa dipakai owner/staff langsung.
- Jangan membuat terlalu banyak dokumen terpisah. Semua output cukup dalam satu jawaban yang terstruktur.

QUALITY CHECK SEBELUM FINAL
Pastikan:
- Tidak berubah menjadi form serah-terima tenant.
- Ada kolom "Sudah Masuk App?" dan kolom "Perlakuan" aset.
- Ada Register Aset dan Nilai (form 6) dengan kolom harga perolehan, umur ekonomis bulan, dan estimasi nilai buku.
- Kategori aset memakai persis enum aplikasi (BUILDING, RENOVATION, ROOM_EQUIPMENT, FURNITURE, ELECTRONIC, UTILITY_EQUIPMENT, VEHICLE, SOFTWARE, OTHER).
- Tanah dipisah dari bangunan dan diberi catatan tidak disusutkan.
- Semua nilai estimasi diberi tanda E, nilai dari nota diberi tanda N.
- Ada rekap nilai per kategori dan per lokasi, plus blok data non-fisik untuk aset bersih.
- kWh listrik dan jadwal cuci AC diarahkan ke aplikasi, bukan dibuat sebagai poster/print.
- Ada prioritas P0-P3.
- Ada ringkasan data belum masuk aplikasi.
- Tidak ada data sensitif.
```
