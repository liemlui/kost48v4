# Runbook Data Awal Produksi dan Audit Fasilitas KOST48

Tanggal dibuat: 2026-07-08

Tujuan file ini:

1. Menjadi pusat cek data awal sebelum redeploy produksi ke shared hosting.
2. Menjadi bahan generate checklist lapangan per kamar dan area bersama.
3. Mencegah data penting tercecer di chat, catatan pribadi, atau file kerja sementara.

Catatan keamanan:

- Foto KTP, foto kartu identitas, password WiFi/admin, token cron, API key, dan akses cPanel jangan disimpan di repo.
- Full NIK idealnya diinput ke aplikasi produksi, bukan disalin berulang di docs. File ini cukup mencatat status "ada/belum/cek ulang" dan catatan blocker.
- Bila harus menyimpan full NIK untuk persiapan internal, pastikan repo/private storage aman dan jangan upload foto KTP mentah ke Git.

## 1. File Rujukan Redeploy Produksi

Gunakan urutan ini saat cek deploy:

1. `docs/PANDUAN_DEPLOY_CPANEL.md`
   - Panduan teknis deploy cPanel/shared hosting.
   - Env produksi, build, upload, database, cron, dan verifikasi.

2. `docs/M08_DEPLOY_GO_LIVE.md`
   - Checklist go-live lebih luas.
   - Risiko shared hosting, cron auto-ops, KTP gate, PWA/push, dan UAT.

3. `docs/RUNBOOK_ONBOARDING_TENANT_NYATA.md`
   - Urutan input tenant nyata: tenant -> upload KTP -> verifikasi -> stay -> lunasi invoice -> aktifkan portal.
   - Aturan tanggal masuk mengikuti siklus terakhir bulan berjalan.

4. File ini
   - Cek kelengkapan data awal, data tenant, audit kamar, fasilitas, inventaris, AC, listrik, air, jaringan, dan area bersama.

## 2. Jawaban Cepat: Apakah Data Awal Sudah Lengkap?

Status saat ini: belum lengkap untuk onboarding produksi yang rapi.

Yang sudah cukup jelas:

- Daftar mayoritas tenant aktif sudah ada.
- Mayoritas NIK tenant sudah ada.
- Siklus tanggal tagihan banyak kamar sudah ada.
- Target shared hosting dan pola cron sudah terdokumentasi.
- Gate KTP produksi sudah diperbaiki dan harus diverifikasi setelah deploy.
- FINAL (owner 2026-07-08): F3/F4 SUDAH TIDAK ADA — blok F dirombak menjadi F1+F2; total 13 kamar (A, B, C, D, F1, F2, G, H, I, J, K, L, M).
- Kebijakan aset & nilai sudah diputuskan owner (bagian 9A): cut-off 31 Juli 2026, kapitalisasi barang tahan lama ≥ Rp100rb, tanah+bangunan via NJOP + saldo awal.

Yang masih perlu dilengkapi sebelum atau saat onboarding:

- NIK Theo Wijaya.
- Data Dini dari foto KTP perlu diverifikasi ulang dari foto asli sebelum input.
- Kamar Annisa belum dipastikan.
- Siklus tagihan Annisa belum dipastikan.
- Harga sewa aktual per kamar.
- Status deposit per tenant: ada/tidak, nominal, sudah dipegang atau perlu opening balance.
- Meter listrik awal per kamar pada hari onboarding.
- Status lunas periode berjalan per tenant sebelum portal dibuka.
- Data inventaris kamar dan area bersama.
- Jadwal cuci AC dan status AC per kamar.
- Kondisi kWh meter, MCB, stop kontak, stekker, dan tee listrik.
- Data jaringan: router, switch, access point, kabel, UPS bila ada.
- Data tandon air, pompa, dan kapasitas.

## 2A. Data Owner yang Belum Masuk Database/Aplikasi

Bagian ini membedakan data yang sudah dikonfirmasi owner dari data yang benar-benar sudah ada di database. Status "BELUM DB" berarti jangan menganggap aplikasi sudah tahu data ini.

| Data/info owner | Status | Perlu dibuat/diinput di mana | Catatan eksekusi |
|---|---|---|---|
| F3/F4 | FINAL: TIDAK ADA (owner 2026-07-08) | Tidak dibuat di master `Room` | Blok F dirombak menjadi F1+F2; F3/F4 dihapus dari semua checklist/form. |
| Annisa ada sebagai tenant | BELUM siap input stay | `Tenant` lalu `Stay` | Kamar dan siklus tagihan belum pasti. |
| Dini sudah kirim foto KTP | BELUM input produksi | Upload KTP via UI tenant/check-in | Verifikasi data dari foto asli sebelum input; jangan simpan foto KTP di repo. |
| Theo belum ada NIK | BLOCKER | Data tenant/KTP | Tidak boleh aktivasi stay sebelum NIK + KTP siap. |
| Lampu area bersama 7 titik | BELUM DB | Inventory/aset/checklist | Bisa dicatat sebagai `InventoryItem` bila ingin stok/perawatan; minimal masuk checklist inspeksi. |
| CCTV area bersama 5 titik | BELUM DB | `InventoryItem`/`FixedAsset` + notice CCTV | Cek angle kamera, terutama area dekat kamar mandi belakang. |
| Bola pemadam api/APAR rencana 3-5 titik | BELUM DB/belum final | Inventory/aset + emergency flow | Tentukan titik final pemasangan dulu. |
| Kamar mandi dalam: F1 closet jongkok, lainnya closet duduk | BELUM detail DB | `RoomFacility`/`RoomItem` | Audit per kamar agar fasilitas publik dan internal akurat. |
| Kamar mandi luar 2 unit | BELUM model khusus | Checklist fasilitas bersama/manual | Satu dengan closet duduk, satu khusus mandi; bak plastik besar; tanpa shower. |
| Dapur outdoor: kran, tempat sampah, kompor, selang, regulator, LPG | BELUM lengkap DB | Inventory/aset/checklist gas | Rak piring tidak ada; ventilasi tidak perlu karena outdoor. |
| Jemuran bersama besar area kamar belakang | BELUM DB | Inventory/checklist fasilitas bersama | Catat kapasitas, karat, dan kondisi. |
| Anak kunci master/cadangan | BELUM DB | Checklist audit kelengkapan data kamar/catatan kamar | Cocokkan jumlah total dan cadangan per kamar. |
| Garansi barang jika ada | BELUM DB | `FixedAsset.notes`/dokumen operasional | AC, router, pompa, CCTV, kasur. |
| Foto audit kondisi kamar saat ini | BELUM dibuat | Checklist audit kondisi/data saat ini | Foto kamar, kamar mandi, meter, kunci, inventaris. |
| Poster aturan, denah, emergency flow, notice CCTV | BELUM dibuat | Dokumen cetak + portal/manual tenant | Prompt AI ada di bagian Paket File/Prompt. |

## 3. Data Tenant dan Hunian Saat Ini

Gunakan tabel ini untuk cek kelengkapan sebelum input produksi. Kolom NIK sengaja fokus ke status, bukan penyimpanan ulang data sensitif.

| Siklus | Kamar | Tenant | Status NIK | Catatan |
|---:|---|---|---|---|
| - | - | Annisa | Ada | NIK ada, kamar belum pasti, siklus belum pasti. |
| 26 | A | Shinta Larista | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 1 | B | Dini Widiastutik | Perlu cek ulang dari foto KTP | Foto diterima owner. Verifikasi NIK dari foto asli sebelum input produksi. |
| 28 | C | Miko Rakatama Adhi Winarto | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 24 | D | Ade Chandra | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 26 | F1 | Yufita Hieng | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 8 | F2 | Patrick Wilfred | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 1 | G | Yofi Nurkolifah | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 10 | H | Welly Tanoto | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 5 | I | Theo Wijaya | Belum ada | Blocker onboarding tenant Theo. |
| 30 | J | Lovandra | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 10 | K | Meliana Tamara | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 1 | L | Destarika Hasan | Ada | Siap input bila harga/deposit/meter sudah ada. |
| 3 | M | Gabriel Excelly Pranajaya | Ada | Siap input bila harga/deposit/meter sudah ada. |

## 4. Data Wajib Per Tenant Sebelum Portal Dibuka

| Data | Wajib | Catatan |
|---|---:|---|
| Nama sesuai KTP | Ya | Dipakai di tenant profile dan invoice. |
| Nomor HP aktif | Ya | Untuk kontak dan akses portal. |
| NIK 16 digit | Ya | Jangan aktifkan stay tanpa verifikasi KTP jika gate ON. |
| Foto KTP | Ya | Upload lewat UI, bukan simpan di repo. |
| Status verifikasi KTP | Ya | Manual/AI sesuai flow aplikasi. |
| Kamar | Ya | Harus cocok dengan room code produksi. |
| Tanggal siklus tagihan | Ya | Untuk set `checkInDate` sesuai siklus terakhir bulan berjalan. |
| Harga sewa aktual | Ya | Jangan pakai asumsi default bila harga real beda. |
| Deposit/jaminan | Ya | Isi nominal dan status uangnya. |
| Status pembayaran periode berjalan | Ya | Lunasi invoice sebelum portal dibuka agar tidak muncul tunggakan palsu. |
| Meter listrik awal | Ya | Foto meter hari onboarding, input ke stay. |
| Meter air awal | Opsional | Saat ini default 0 bila sensor air belum aktif. |
| Catatan khusus | Opsional | Riwayat lama, pengecualian, catatan owner. |

Kebijakan perbaikan untuk tenant:

- Kerusakan karena pemakaian normal, usia barang, aus, bocor, lampu mati, kran rusak, AC bermasalah, atau fasilitas mulai tidak layak: owner/staff jadwalkan perbaikan atau penggantian.
- Kerusakan sengaja, salah pakai berat, kehilangan barang/kunci, atau tindakan yang melanggar aturan: dicatat sebagai tanggung jawab tenant sesuai hasil review.
- Kondisi kamar saat audit produksi perlu difoto agar owner/staff punya baseline data yang adil sebelum input ke aplikasi.
- Ringkasan kebijakan ini sebaiknya tampil di halaman tenant/portal dan juga dicetak sebagai aturan ringkas.

## 5. Template Audit Kamar

Copy bagian ini untuk setiap kamar (13): A, B, C, D, F1, F2, G, H, I, J, K, L, M — F3/F4 tidak ada (blok F = F1+F2). Alternatif lebih cepat: form siap pakai `docs/filePrint/06`/`07` (lihat bagian 8).

### Kamar: [kode kamar]

Identitas kamar:

- Status kamar: [terisi/kosong/maintenance/siap sewa]
- Tenant saat ini:
- Kategori kamar:
- Lantai/area:
- Harga sewa aktual:
- Deposit standar:
- Foto kamar utama: [ada/belum]
- Catatan umum:

Kamar mandi:

Default kamar mandi dalam:

- Jika kamar punya kamar mandi dalam, normalnya cek semua item kamar mandi di tabel.
- F1 punya kamar mandi dalam dengan closet jongkok.
- Kamar lain yang punya kamar mandi dalam memakai closet duduk.
- Perbedaan fasilitas per kamar tetap dicatat di kolom catatan agar tidak dipukul rata.

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Kamar mandi dalam |  |  |  |  |  |
| Closet |  |  |  |  | Duduk/jongkok, flush/air, bocor/tidak. |
| Double stop kran toilet |  |  |  |  |  |
| Selang fleksibel ke tank closet |  |  |  |  |  |
| Selang jet shower |  |  |  |  |  |
| Kepala jet shower |  |  |  |  |  |
| Double kran |  |  |  |  |  |
| Selang shower |  |  |  |  |  |
| Kepala shower |  |  |  |  |  |
| Ember |  |  |  |  |  |
| Gayung |  |  |  |  |  |
| Sikat lantai |  |  |  |  |  |
| Sikat closet |  |  |  |  |  |
| Hanger baju kamar mandi |  |  |  |  |  |
| Lampu kamar mandi |  |  |  |  |  |
| Pintu kamar mandi |  |  |  |  | Engsel, handle, kunci, lapuk/tidak. |
| Saluran air/floor drain |  |  |  |  | Lancar/bau/mampet. |
| Ventilasi kamar mandi |  |  |  |  |  |

Kamar tidur dan furniture:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Pintu kamar |  |  |  |  | Engsel, handle, kunci. |
| Anak kunci total |  |  |  |  | Isi jumlah total. |
| Anak kunci cadangan |  |  |  |  | Isi jumlah cadangan. |
| Kasur |  |  |  |  | Ukuran: 90x200/120x200/160x200/180x200. |
| Sprei kasur |  |  |  |  |  |
| Bantal |  |  |  |  |  |
| Sarung bantal |  |  |  |  |  |
| Guling |  |  |  |  | Jika ada. |
| Sarung guling |  |  |  |  | Jika ada. |
| Lemari pakaian plastik |  |  |  |  |  |
| Lemari pakaian multiplek |  |  |  |  |  |
| Lemari pakaian besi |  |  |  |  |  |
| Hanger baju kamar |  |  |  |  |  |
| Bak sampah plastik |  |  |  |  |  |
| Jendela |  |  |  |  |  |
| Kunci/selot jendela |  |  |  |  |  |
| Jemuran handuk pribadi |  |  |  |  | Jika tidak ada, catat pakai jemuran bersama. |
| Lampu kamar |  |  |  |  |  |

Listrik, AC, kipas, dan sensor:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Stop kontak kamar |  |  |  |  | Isi jumlah dan posisi. |
| Stop kontak AC |  |  |  |  | Jika AC ada. |
| Stekker |  |  |  |  | Isi jumlah dan kondisi. |
| Tee listrik |  |  |  |  | Pastikan aman/tidak longgar. |
| Kipas angin |  |  |  |  | Merek/tipe bila perlu. |
| AC |  |  |  |  | PK, dingin/tidak, remote ada/tidak. |
| Jadwal cuci AC terakhir |  |  |  |  | Tanggal terakhir. |
| Jadwal cuci AC berikutnya |  |  |  |  | Tanggal rencana. |
| kWh meter |  |  |  |  | Angka awal onboarding dan kondisi fisik. |
| MCB |  |  |  |  | Ampere, sering trip/tidak. |
| Sensor suhu IoT |  |  |  |  | Untuk masa depan. |
| Sensor kelembaban IoT |  |  |  |  | Untuk masa depan. |
| Sensor flow meter air |  |  |  |  | Untuk masa depan. |

Nilai awal meter:

| Meter | Angka | Tanggal foto | Foto ada | Catatan |
|---|---:|---|---|---|
| Listrik kWh |  |  |  |  |
| Air/sensor flow meter |  |  |  | Default 0 bila belum aktif. |

Kesimpulan kamar:

- Kondisi umum: [baik/cukup/perlu perbaikan/tidak siap]
- Siap dihuni: [ya/tidak]
- Perbaikan wajib sebelum dihuni:
- Pembelian/penggantian barang:
- Ticket maintenance yang perlu dibuat:

## 6. Checklist Area Bersama dan Fasilitas Luar

Air dan tandon:

| Item | Jumlah | Kapasitas | Kondisi | Aksi | Catatan |
|---|---:|---:|---|---|---|
| Tandon air |  |  |  |  | Lokasi dan kondisi detail. |
| Pompa air |  |  |  |  |  |
| Pipa utama |  |  |  |  |  |
| Valve/kran utama |  |  |  |  |  |
| Pelampung/otomatis tandon |  |  |  |  |  |
| Jadwal bersih tandon |  |  |  |  | Tanggal terakhir dan berikutnya. |

Jaringan dan internet:

| Item | Jumlah | Kondisi | Aksi | Catatan |
|---|---:|---|---|---|
| Router utama |  |  |  | Jangan simpan password di docs. |
| Router tambahan/access point |  |  |  |  |
| Switch jaringan |  |  |  | Port aktif/rusak. |
| Kabel LAN utama |  |  |  |  |
| UPS/adaptor cadangan |  |  |  |  |
| Rak/box jaringan |  |  |  |  |
| ISP dan paket internet |  |  |  | Catat nama paket, bukan credential. |

Lampu area bersama:

| Lokasi | Jumlah | Kondisi | Aksi | Catatan |
|---|---:|---|---|---|
| Depan bagian poster | 1 |  |  |  |
| Teras depan | 1 |  |  |  |
| Dapur | 1 |  |  |  |
| Lorong | 1 |  |  |  |
| Pojok lorong | 1 |  |  |  |
| Depan kamar mandi belakang | 1 |  |  |  |
| Lorong belakang | 1 |  |  |  |
| Total lampu area bersama | 7 |  |  | Cek saklar, fitting, kabel, terang malam, dan area gelap. |

CCTV area bersama:

| Lokasi | Jumlah | Kondisi | Aksi | Catatan privasi/teknis |
|---|---:|---|---|---|
| Depan | 2 |  |  | Cek angle, night vision, rekaman, dan koneksi. |
| Depan dapur | 1 |  |  | Cek tidak mengarah ke area privat. |
| Area depan kamar mandi belakang | 1 |  |  | Wajib pastikan kamera tidak mengarah ke dalam kamar mandi/area privat. |
| Lorong belakang | 1 |  |  | Cek blind spot dan pencahayaan malam. |
| Total CCTV area bersama | 5 |  |  | Cek DVR/NVR, storage, adaptor, kabel, akses aplikasi, tanggal/jam rekaman. |

Kamar mandi luar:

| Lokasi/Fungsi | Jumlah | Kondisi | Aksi | Catatan |
|---|---:|---|---|---|
| Kamar mandi luar dengan closet duduk | 1 |  |  | Cek closet, kran, bak plastik besar, pintu, lampu, floor drain. |
| Kamar mandi luar khusus mandi | 1 |  |  | Tidak ada closet; cek bak plastik besar, kran, pintu, lampu, floor drain. |
| Bak air plastik besar | 2 |  |  | Khusus kamar mandi luar; bukan ember kecil. |
| Shower kamar mandi luar | 0 |  |  | Kamar mandi luar tidak memakai shower. |

Peralatan kebersihan area luar:

| Item | Jumlah | Kondisi | Aksi | Catatan |
|---|---:|---|---|---|
| Sapu area luar |  |  |  |  |
| Alat pel |  |  |  |  |
| Cikrak |  |  |  |  |
| Ember kebersihan |  |  |  |  |
| Sikat lantai umum |  |  |  |  |
| Tempat sampah umum |  |  |  |  |
| Cairan pembersih |  |  |  | Stok habis/tidak. |

Fasilitas bersama:

| Item | Jumlah | Kondisi | Aksi | Catatan |
|---|---:|---|---|---|
| Kursi santai |  |  |  |  |
| Jemuran bersama besar | 1 |  |  | Lokasi publik di area kamar belakang; cek kapasitas dan karat. |
| Lampu area luar |  |  |  |  |
| Stop kontak area luar |  |  |  |  |
| CCTV | 5 |  |  | Detail lokasi ada di tabel CCTV area bersama. |
| Gerbang/pagar |  |  |  | Kunci, engsel, akses. |

## 7. Kemungkinan Item yang Masih Sering Terlewat

Gunakan bagian ini sebagai sanity check tambahan saat keliling kos.

Keselamatan dan darurat:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Bola pemadam api/APAR | Rencana | 3-5 |  |  | Rencana pasang beberapa titik strategis; cek tanggal/kondisi bila tipe APAR tabung. |
| Kotak P3K |  |  |  |  | Isi obat dasar, plester, antiseptik. |
| Poster nomor darurat |  |  |  |  | Polisi, pemadam, ambulans, PLN, owner, staff, teknisi listrik/pompa, dan kontak internet bila perlu. |
| Jalur evakuasi tidak terhalang |  |  |  |  | Terutama lorong dan tangga bila ada. |
| Anti-slip area basah |  |  |  |  | Kamar mandi, dapur, lorong belakang. |

Bangunan dan kebocoran:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Talang air |  |  |  |  | Tambahan inspeksi/laporan tenant; cek mampet/bocor/tidak. |
| Atap/plafon bocor |  |  |  |  | Tambahan inspeksi/laporan tenant; catat kamar/area. |
| Rembes dinding |  |  |  |  | Tambahan inspeksi/laporan tenant; catat titik dan foto. |
| Lantai retak/ambles/licin |  |  |  |  |  |
| Drainase area luar |  |  |  |  | Genangan saat hujan. |
| Hama/serangga/tikus |  |  |  |  | Jadwal pest control bila perlu. |

Dapur dan utilitas:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Wastafel dapur |  |  |  |  | Bocor/mampet/tidak. |
| Kran dapur | Ada |  |  |  |  |
| Rak piring/area cuci | Tidak ada | 0 |  |  | Jangan dianggap fasilitas wajib saat audit awal. |
| Tempat sampah dapur | Ada |  |  |  |  |
| Ventilasi dapur | Tidak perlu | 0 |  |  | Dapur outdoor. |
| Kompor gas | Ada |  |  |  | Cek api, tungku, knop, dan kebersihan. |
| Selang gas | Ada |  |  |  | Cek retak, umur, dan standar keamanan. |
| Regulator gas | Ada |  |  |  | Cek karet seal dan kebocoran. |
| Tabung LPG | Ada |  |  |  | Catat ukuran tabung dan lokasi aman. |

Dokumen dan operasional:

| Item | Ada | Jumlah | Kondisi | Aksi | Catatan |
|---|---|---:|---|---|---|
| Daftar anak kunci master/cadangan |  |  |  |  | Cocokkan dengan kamar. |
| Label kamar/area bila dibutuhkan |  |  |  |  | Opsional untuk membantu staf/teknisi; data kWh/listrik tetap di aplikasi. |
| Jadwal cuci AC semua kamar |  |  |  |  | Masukkan tanggal terakhir/berikutnya. |
| Jadwal bersih tandon |  |  |  |  |  |
| Foto bukti audit kondisi kamar saat ini |  |  |  |  | Depan, kasur, KM, meter, inventaris. |
| Buku/rekap garansi barang | Jika ada |  |  |  | AC, router, pompa, CCTV, kasur bila ada. |

## 8. Paket File/Prompt AI Multimodal

Materi di `docs/filePrint/`: file 01-04 = prompt copy-paste ke Gemini (AI kuat/multimodal); file 05-07 = checklist & form audit SIAP PAKAI (bukan prompt). Jangan masukkan NIK, foto KTP, password, token, API key, atau data sensitif.

| Output | File prompt |
|---|---|
| Audit data kamar dan fasilitas | `docs/filePrint/01_PROMPT_AUDIT_DATA_KAMAR_FASILITAS.md` |
| Denah evakuasi dan fasilitas | `docs/filePrint/02_PROMPT_DENAH_EVAKUASI_FASILITAS.md` |
| Nomor darurat + emergency flow | `docs/filePrint/03_PROMPT_NOMOR_DARURAT_DAN_EMERGENCY_FLOW.md` |
| Aturan tenant + kebijakan perbaikan + notice CCTV | `docs/filePrint/04_PROMPT_ATURAN_NOTICE_TENANT.md` |
| Checklist master info audit aset — SUDAH TERISI keputusan owner (bukan prompt) | `docs/filePrint/05_CHECKLIST_MASTER_INFO_AUDIT_ASET.md` |
| Form audit cetak ringkas berwarna (±6 halaman, langsung print) | `docs/filePrint/06_FORM_AUDIT_INVENTARIS_CETAK.html` |
| Form audit INTERAKTIF super detail (per kamar A-M: tap kondisi, autosave, ringkasan otomatis + unduh CSV; bisa dicetak kosong) | `docs/filePrint/07_FORM_AUDIT_INTERAKTIF_SUPER_DETAIL.html` |

Catatan: jadwal cuci AC, status AC, dan data kWh/listrik tetap diaudit, tetapi tidak dibuat sebagai materi print karena sudah ada di aplikasi. Gunakan hasil audit untuk memperbarui data di app dan membuat tiket bila ada kondisi fisik bermasalah.

Data mentah yang sebaiknya dikumpulkan sebelum generate:

- Foto/sketsa denah area.
- Foto tiap titik lampu dan CCTV.
- Foto area dapur, LPG, tandon, pompa, panel listrik.
- Daftar nomor darurat final.
- Data kamar per kode: fasilitas, meter, kunci, AC/kipas, ukuran kasur.
- Kebijakan final owner tentang tamu, jam tenang, pembayaran, kerusakan, dan kebersihan.

## 9. Standar Kondisi dan Aksi

Gunakan nilai yang konsisten agar nanti gampang dimasukkan ke sistem.

Kondisi:

- BAIK: berfungsi normal, bersih, aman.
- CUKUP: berfungsi, tapi mulai aus atau perlu monitoring.
- PERLU_PERBAIKAN: masih ada, tapi mengganggu fungsi.
- GANTI: rusak/berisiko dan lebih baik diganti.
- HILANG: seharusnya ada, tapi tidak ditemukan.
- TIDAK_ADA: memang tidak termasuk fasilitas kamar/area tersebut.

Aksi:

- OK: tidak perlu tindakan.
- MONITOR: cek lagi pada inspeksi berikutnya.
- REPAIR: buat tiket perbaikan.
- REPLACE: ganti barang.
- BUY: beli barang baru.
- CLEAN: perlu dibersihkan.
- VERIFY: perlu dicek ulang owner/staff.

Prioritas:

- P0: bahaya/operasional berhenti, tangani sebelum dihuni.
- P1: penting untuk kenyamanan/keluhan tinggi.
- P2: bisa dijadwalkan.
- P3: kosmetik atau peningkatan minor.

## 9A. Kebijakan Aset & Nilai (kuis owner 2026-07-08)

- Cut-off semua angka audit & neraca awal: **31 Juli 2026**.
- **Kapitalisasi:** aset tetap = barang TAHAN LAMA (umur pakai > 1 tahun) harga ≥ Rp 100.000/unit — kipas & lemari plastik MASUK. Barang ganti rutin (bohlam, sprei, gayung, sikat) = beban, bukan aset. (Revisi dari Rp500rb di hari yang sama.)
- Umur ekonomis default: elektronik/AC/CCTV/kipas 48 bln · furniture 48-96 bln · pompa/tandon/instalasi 96 bln · bangunan 240 bln · tanah tidak disusutkan.
- Tanah + bangunan MASUK pembukuan via saldo awal (OPENING_BALANCE): tanah = NJOP SPPT PBB; bangunan dinilai SEKALI kondisi kini per cut-off (renovasi 2011-kini tidak dirunut), susut fresh 240 bln.
- Nota hampir tidak ada → sumber harga default E (estimasi), N bila nota ketemu.
- Rekening bank campur pribadi → pilah saldo porsi kos per cut-off. Tidak ada hutang bisnis.
- Pendingin kamar campur AC/kipas (catat jenis per kamar); CCTV 5 kamera + DVR/NVR & HDD ada (didata sebagai aset terpisah).
- Pemetaan skala form 06/07 → standar bagian 9: B=BAIK · C=CUKUP · R=PERLU_PERBAIKAN · RB=GANTI · H=HILANG · T=TIDAK_ADA · MASALAH=REPAIR/VERIFY.

## 10. Mapping ke Aplikasi Setelah Audit

Setelah checklist lapangan selesai, input data ke aplikasi dengan urutan:

1. Master kamar dan fasilitas kamar.
2. Master barang/inventory item.
3. Barang yang melekat di kamar sebagai room item.
4. Meter listrik awal per stay.
5. Jadwal cuci AC dan status AC.
6. Tiket maintenance untuk barang/kondisi yang perlu aksi.
7. Aset tetap (barang tahan lama ≥ Rp100rb + tanah NJOP + bangunan nilai kondisi kini) → modul `FixedAsset` via SALDO AWAL (OPENING_BALANCE), lalu jalankan depresiasi. Trial balance WAJIB tetap seimbang (gate M04).
8. Foto kamar/fasilitas untuk katalog publik bila kualitas foto layak.

Jangan input sebagai stok barang bila item melekat permanen di kamar tanpa perlu mutasi rutin. Gunakan inventory/room item untuk barang yang perlu dilacak kondisi, jumlah, perbaikan, atau penggantian.

## 11. Checklist Final Sebelum Redeploy Produksi

Deploy teknis:

- [ ] Domain final sudah siap.
- [ ] cPanel Node.js app siap.
- [ ] PostgreSQL produksi siap.
- [ ] SSH akses siap.
- [ ] AutoSSL/HTTPS aktif.
- [ ] `.env` produksi lengkap.
- [ ] `AUTO_OPS_ENABLED=false` untuk shared hosting.
- [ ] `AUTO_OPS_CRON_TOKEN` dibuat kuat.
- [ ] cPanel cron memanggil endpoint auto-ops.
- [ ] `KTP_ACTIVATION_GATE_ENABLED=true` menjadi nilai awal.
- [ ] Setelah deploy, UI Settings -> Operasional dicek gate KTP ON.
- [ ] Tes aktivasi tanpa KTP terverifikasi harus ditolak.

Data awal:

- [ ] Theo NIK lengkap.
- [ ] Dini NIK diverifikasi dari foto asli.
- [ ] Annisa kamar dan siklus pasti.
- [x] F3/F4: FINAL tidak ada (blok F = F1+F2; 13 kamar).
- [ ] Harga sewa setiap kamar lengkap.
- [ ] Deposit setiap tenant lengkap.
- [ ] Meter listrik awal setiap kamar lengkap.
- [ ] Invoice awal langsung dilunasi untuk tenant yang memang sudah bayar.
- [ ] Portal tenant dibuka hanya setelah invoice awal aman.

Audit fasilitas:

- [ ] Audit kamar A selesai.
- [ ] Audit kamar B selesai.
- [ ] Audit kamar C selesai.
- [ ] Audit kamar D selesai.
- [ ] Audit kamar F1 selesai.
- [ ] Audit kamar F2 selesai.
- [ ] Audit kamar G selesai.
- [ ] Audit kamar H selesai.
- [ ] Audit kamar I selesai.
- [ ] Audit kamar J selesai.
- [ ] Audit kamar K selesai.
- [ ] Audit kamar L selesai.
- [ ] Audit kamar M selesai.
- [ ] Audit tandon/pompa selesai.
- [ ] Audit jaringan selesai.
- [ ] Audit alat kebersihan selesai.
- [ ] Audit fasilitas bersama selesai.
