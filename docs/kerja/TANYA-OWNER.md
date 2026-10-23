# TANYA-OWNER — pertanyaan yang menunggu keputusan owner

> **Blok baca** · Jenis: **daftar pertanyaan untuk owner (bukan antrean, bukan kontrak)** · Status: **aktif — P37 satu-satunya pertanyaan terbuka (default berjalan); potret 23 Okt 2026** · Untuk siapa: owner + agen yang butuh jawaban sebelum melanjutkan
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

**Satu pertanyaan terbuka per 23 Okt 2026: P37** (wizard sebagai beranda tiap role — default "tidak ada perubahan beranda" berjalan). **P34–P36 dan P38 dijawab owner 23 Okt 2026** → register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1` (kontrak bergulir · NIK bukan alat masuk · akun wajib di titik DP) dan `S1b` (DP 30% × tarif periode). Rincian ukur + riset: [TASK-RUANG-WIZARD §8.9](TASK-RUANG-WIZARD.md#89-sesi-23-okt-2026--bukti-l1-ukur-ulang-dan-l2-riset). Di bawahnya blok lama dipertahankan sebagai rincian sampai pembersihan berikutnya.

**Dijawab owner 23 Okt 2026 → [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1`:** P34 **(a)** kontrak lewat tanggal = bulanan bergulir · P35 **(a)** NIK bukan alat masuk · P36 **(a)** akun wajib di titik DP. Blok pertanyaannya dihapus dari sini sesuai §1.

### P37 — Wizard sebagai beranda tiap role

**Konteks:** Misi Anda: fitur per role tampil sesederhana mungkin — wizard dulu, bukan menu penuh. Wizard pembuka sudah ada untuk empat role dengan tombol "lewati" yang diingat per pengguna, tetapi menu penuh masih tampil bersamaan. Riset: progressive disclosure mensyaratkan jalan keluar yang jelas ("must be obvious how users progress to the secondary level"), dan Apple menyarankan tab bar lima item atau kurang karena item yang disembunyikan sulit ditemukan. Ini keputusan owner karena mengubah tampilan pertama yang dilihat semua pengguna setiap hari.

**Pilihan:**
- **(a) Wizard jadi layar pertama tiap role, dengan tombol "Lihat semua menu" yang selalu terlihat.** Konsekuensi: satu jalur utama untuk semua orang, fitur lengkap tetap satu ketukan. Risiko: pengguna yang sudah hafal alur harus melewati wizard sekali (pilihannya diingat, jadi tidak berulang).
- **(b) Wizard hanya untuk TENANT; OWNER/ADMIN/STAFF langsung dashboard penuh.** Konsekuensi: operator tidak terganggu, penghuni tetap dipandu. Risiko: dua pola berbeda untuk dirawat, dan misi "sederhana untuk semua role" hanya separuh tercapai.
- **(c) Wizard tetap opsional lewat tombol, bukan layar pertama.** Konsekuensi: tidak ada perubahan kebiasaan siapa pun. Risiko: wizard jarang dipakai sehingga tidak menolong pengguna baru.

**Rekomendasi:** **(a)** — paling dekat dengan misi Anda, dengan syarat tombol "Lihat semua menu" tidak pernah disembunyikan dan pilihan "lewati" tetap diingat per pengguna.

**Default bila tidak dijawab:** **(c)** — tidak ada perubahan beranda; wizard tetap seperti sekarang.

**Dijawab owner 23 Okt 2026 → [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1b`:** DP **30% × tarif periode** (kanonik sejak 23 Sep 2026, sudah dihitung di kode booking publik) — tidak ada perubahan rumus. Blok pertanyaannya dihapus dari sini sesuai §1.

**Blok lama yang DITUTUP (19 Okt 2026):** P19, P21, P24, dan P27 dijawab owner pada 19 Okt (listrik Rp2.500/kWh · air gratis sementara · data go-live disiapkan owner lewat `/checklist` · dump + jadwal + uji restore · paritas semua kanal) — rincian di register `GO-LIVE-DATA + TARIF + BACKUP + PARITAS`. Blok keempatnya di bawah ditandai **DITUTUP** dan dipertahankan sebagai rincian sampai pembersihan berkas berikutnya. Riwayat: **P12–P16** dijawab owner 18–19 Okt 2026 dan **dipindah** ke register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri "P12–P16"; blok pertanyaannya dihapus dari sini sesuai §1.

### P17 — Email/identifier untuk akun ADMIN "Hadi" (T6)

**Konteks:** Owner menetapkan ADMIN bernama **Hadi** tanpa email. Menu Akun Pengguna mewajibkan email valid karena email dipakai sebagai identifier login staf; tanpa email, akun tidak bisa dibuat dan tidak bisa login.

**Pilihan:**
- **(a)** Owner memberi email nyata Hadi (atau email kerja yang benar-benar bisa dibuka). Konsekuensi: akun dibuat lewat menu, login diuji, reset sandi mandiri mungkin. Risiko: bila email bukan milik Hadi, tautan reset tidak sampai ke dia.
- **(b)** Pakai email internal permanen `hadi@kost48surabaya.com` sebagai identifier dan owner menyampaikan sandi awal langsung. Konsekuensi: alur ADMIN terbukti; email tidak dipakai menerima pesan. Risiko: bila domain tidak punya kotak surat, reset via email tetap tidak sampai (harus lewat owner).
- **(c)** Tunda ADMIN sampai email ada. Konsekuensi: tidak ada risiko akun; butir checklist c9 tetap terbuka. Risiko: owner tetap satu-satunya operator.

**Rekomendasi:** **(a)** bila Hadi punya email; kalau belum, **(b)** dengan catatan reset manual oleh owner.

**Default bila tidak dijawab:** tidak membuat akun; T6 tetap terbuka.

### P18 — Brevo: IP server, pengirim terverifikasi, dan rotasi kunci (T5)

**Konteks:** Kunci Brevo sudah diisi lewat Pengaturan Operasional, tetapi uji kirim **gagal 401**: Brevo menolak karena IP server `203.161.184.108` belum masuk daftar IP resmi akun. Kunci juga pernah ditempel di chat sehingga sebaiknya dirotasi.

**Pilihan:**
- **(a)** Owner menambah IP `203.161.184.108` di dashboard Brevo (Security → Authorised IPs), memastikan pengirim `no-reply@kost48surabaya.com` terverifikasi, lalu memberi tahu agen. Konsekuensi: email reset langsung aktif; agen mengulang uji kirim dan memeriksa log. Risiko: daftar IP harus diperbarui bila hosting pindah IP.
- **(b)** Owner menonaktifkan pembatasan IP di Brevo. Konsekuensi: tidak perlu menjaga daftar IP; kunci bisa dipakai dari mana saja. Risiko: keamanan kunci menurun — tidak disarankan.
- **(c)** Tunda email; reset manual oleh owner. Konsekuensi: tidak ada perubahan keamanan; portal belum mandiri. Risiko: beban owner berlanjut.

**Rekomendasi:** **(a)**, lalu **rotasi kunci** setelah uji karena nilainya sudah terekspos di chat (kunci baru dimasukkan lewat Pengaturan Operasional, bukan chat).

**Default bila tidak dijawab:** email tetap nonaktif; T5 dan butir p3 checklist tetap terbuka.

### P19 — Tarif listrik & air Rp 0 di 13 kamar (temuan audit 19 Okt) — **DITUTUP 19 Okt 2026: listrik Rp2.500/kWh; air gratis sementara**

**Konteks:** audit 19 Okt 2026 07:03 WIB menemukan `Room.electricityTariffPerKwhRupiah` dan `Room.waterTariffPerM3Rupiah` bernilai **0 untuk 13 dari 13 kamar**, `waterMeteringEnabled=false`, sedangkan `freeElectricityKwhPerMonth=30`. Setiap tagihan baru yang memuat pemakaian listrik/air akan menghitung **pemakaian × Rp 0** — uang kos kurang tertagih, dan angkanya masuk buku besar apa adanya.

**Pilihan:**
- **(a)** Owner memberi angka tarif listrik per kWh dan tarif air per m³ (boleh per kamar bila beda), agen mengisi lewat menu Kamar. Konsekuensi: tagihan berikutnya benar; 11 tagihan PAID tidak berubah. Risiko: bila angka belum tersedia, penerbitan tagihan menunggu.
- **(b)** Satu tarif global di Pengaturan Operasional, semua kamar mengikuti. Konsekuensi: cepat, satu angka. Risiko: kamar dengan tarif berbeda akan salah tagih.
- **(c)** Tunda: larang penerbitan tagihan yang memuat listrik/air sampai tarif ada. Konsekuensi: tidak ada tagihan salah. Risiko: butuh perubahan perilaku (izin agen) dan menahan penagihan.

**Rekomendasi:** **(a)** — tarif listrik hampir selalu per kamar dan sudah ada kolomnya.

**Default bila tidak dijawab:** tidak menerbitkan tagihan baru yang memuat listrik/air; tidak mengubah kode.

### P20 — Saldo awal kas/bank (A5) masih kosong

**Konteks:** `OpeningBalanceBatch` **0 baris**, `CashAccount.openingBalanceRupiah` = 0 untuk kedua akun, sementara 23 jurnal POSTED sudah berjalan (debit = kredit Rp 29.400.000). Tanpa angka cutover, neraca tidak berangkat dari saldo riil. A5 masih terbuka di [ANTREAN](../ANTREAN.md).

**Pilihan:**
- **(a)** Owner menetapkan saldo kas tunai + saldo bank per tanggal cutover; agen menyiapkan batch saldo awal dan mempostingnya. Konsekuensi: neraca berangkat dari saldo nyata. Risiko: angka salah akan menggeser seluruh laporan sampai dikoreksi lewat reversal.
- **(b)** Zero-start resmi: sistem mulai dari 0 dan saldo riil di luar sistem sampai cutover berikutnya. Konsekuensi: tidak ada jurnal baru. Risiko: laporan kas tidak mencerminkan uang yang benar-benar dipegang owner.
- **(c)** Tunda; laporkan sebagai celah terbuka. Konsekuensi: tidak ada risiko jurnal. Risiko: keputusan A5 tetap menggantung dan laporan tetap ambigu.

**Rekomendasi:** **(a)** bila ada uang tunai/saldo bank nyata saat sistem mulai; **(b)** bila seluruh uang memang masuk setelah 18 Okt.

**Default bila tidak dijawab:** **(b)** zero-start ditulis di laporan sebagai keadaan resmi sampai keputusan ada.

### P21 — Foto kamar & fasilitas katalog publik kosong — **DITUTUP 19 Okt 2026: owner siapkan data; daftar di `/checklist`**

**Konteks:** `Room.images` kosong untuk **13/13 kamar**, folder `uploads/` berisi **0 berkas**, dan tiga URL foto yang dipakai `/api/public/rooms` diuji → **404 semua**. `RoomFacility` juga **0 baris**. Artinya katalog publik siap dibuka tetapi setiap kartu kamar menampilkan gambar rusak tanpa fasilitas.

**Pilihan:**
- **(a)** Owner menyerahkan foto kamar + daftar fasilitas; agen mengunggah dan memverifikasi satu URL → 200. Konsekuensi: katalog layak dibuka. Risiko: waktu menunggu aset dari owner.
- **(b)** Pakai foto dari materi promosi lama yang sudah ada. Konsekuensi: cepat. Risiko: foto mungkin tidak sesuai kondisi kamar sekarang.
- **(c)** Tutup katalog publik sampai foto tersedia (situs hanya WhatsApp). Konsekuensi: tidak ada katalog rusak. Risiko: kehilangan permintaan masuk.

**Rekomendasi:** **(a)**, dengan **(c)** sebagai keadaan sementara selama aset belum ada.

**Default bila tidak dijawab:** katalog publik **ditutup**; status NO-GO tetap.

### P22 — Deposit: 1 ledger tanpa jurnal, hanya 1 dari 11 stay ber-ledger

**Konteks:** `TenantDepositLedgerEntry` berisi **1 baris** (`INCREASE_LIABILITY` Rp 200.000) dan baris itu **tanpa** `journalEntryId`; 10 stay lain tidak punya ledger deposit sama sekali. Akun liabilitas deposit (2000) karena itu belum mencerminkan uang yang dipegang kos.

**Pilihan:**
- **(a)** Backfill: owner mengonfirmasi deposit yang benar-benar diterima per penghuni, agen memposting jurnal penerimaan deposit. Konsekuensi: liabilitas benar. Risiko: bila angka owner beda dari catatan, perlu koreksi resmi.
- **(b)** Catat resmi "deposit diterima di luar sistem / belum dijurnal" tanpa jurnal. Konsekuensi: tidak menyentuh buku besar. Risiko: neraca tetap kurang saji selama deposit dipegang.
- **(c)** Tunda sampai ada penghuni baru dengan deposit yang tercatat rapi.

**Rekomendasi:** **(a)** — ini uang orang lain yang harus tampil sebagai liabilitas.

**Default bila tidak dijawab:** **(b)** dicatat sebagai celah terbuka, tanpa perubahan data.

### P23 — Dua alamat kos yang berbeda (publik vs cetak invoice)

**Konteks:** halaman publik, FAQ, dan peta memakai **"Jalan Hikmah V No. 48, Surabaya Barat"**, sedangkan tata letak **cetak invoice** memakai **"Jl. Kedung Tarukan 4C No. 48, Surabaya"**. Salah satu tidak benar, atau keduanya benar untuk keperluan berbeda. Alamat tidak punya field konfigurasi — keduanya ditulis di kode.

**Pilihan:**
- **(a)** Hikmah V yang benar → perbaiki template cetak invoice. Konsekuensi: dokumen keuangan konsisten dengan situs. Risiko: bila ternyata salah, invoice yang sudah tercetak keliru.
- **(b)** Kedung Tarukan yang benar → perbaiki halaman publik, FAQ, peta, dan judul. Konsekuensi: situs yang berubah, bukan invoice. Risiko: materi promosi tercetak lama ikut salah.
- **(c)** Keduanya benar (mis. alamat lama/baru) → sebut keduanya dengan label di kedua tempat.

**Rekomendasi:** **(a)** — tiga tempat publik sudah konsisten ke Hikmah V; satu tempat cetak yang menyimpang.

**Default bila tidak dijawab:** tidak mengubah apa pun; dicatat sebagai inkonsistensi P2 di laporan audit.

### P24 — Backup database produksi (izin tindakan di server) — **DITUTUP 19 Okt 2026: dump + jadwal + uji restore disetujui**

**Konteks:** dump DB terakhir bertanggal **13 Sep 2026** (36 hari lalu). Data 18 Okt — 11 tagihan, 11 pembayaran, 23 jurnal — **tidak tercakup** oleh backup mana pun yang terlihat. Tidak ada bukti uji restore. Backup hosting (cPanel) tidak terverifikasi.

**Pilihan:**
- **(a)** Ya: buat dump sekarang, pasang jadwal harian, dan lakukan **satu uji restore** ke database terpisah. Konsekuensi: data bisa dipulihkan dan terbukti. Risiko: butuh ruang disk (±14 MB/berkas) dan satu sesi kerja di server.
- **(b)** Hanya dump sekali sekarang, tanpa jadwal dan tanpa uji restore. Konsekuensi: ada titik pulih hari ini. Risiko: besok kembali tanpa backup; restore belum terbukti.
- **(c)** Tidak; andalkan backup hosting. Konsekuensi: tidak ada tindakan. Risiko: keberadaan backup hosting `UNKNOWN` — bila tidak ada, kehilangan data tidak bisa dipulihkan.

**Rekomendasi:** **(a)**.

**Default bila tidak dijawab:** tidak membuat dump; risiko P1 ini diterima owner dan tertulis di laporan audit.

### P25 — Bila KTP belum dilengkapi setelah check-in, apa konsekuensinya?

**Konteks:** owner memutuskan KTP **tidak memblokir check-in**, tetapi **wajib dilengkapi sesudahnya** dan diingatkan terus. Sistem sekarang hanya punya saklar boolean “wajib KTP sebelum aktivasi” dan belum punya status KTP; jadi “wajib sesudah” belum punya akibat yang jelas. Ini menyangkut perilaku penghuni dan kepatuhan data, karena itu diputuskan owner.

**Pilihan:**
- **(a)** Pengingat saja, tanpa memblokir layanan. Konsekuensi: penghuni tetap bisa huni, perpanjang, dan checkout; kewajiban tercatat dan terlihat admin. Risiko: sebagian KTP tidak pernah masuk; kepatuhan bergantung pada kerelaan penghuni.
- **(b)** Blokir **perpanjangan** sampai KTP terverifikasi. Konsekuensi: hampir semua penghuni akan melengkapi karena butuh renew; check-in dan checkout tetap jalan. Risiko: bila verifikasi lambat, renewal tertunda dan kamar bisa kosong; butuh jalur pengecualian manual OWNER.
- **(c)** Blokir **checkout** sampai KTP terverifikasi. Konsekuensi: paling kuat. Risiko: penghuni yang ingin keluar tertahan; berpotensi sengketa deposit/barang — tidak disarankan.

**Rekomendasi:** **(a) + eskalasi**: pengingat berulang ke penghuni, dan daftar “KTP belum lengkap” muncul di dashboard admin/owner; blokir hanya bila owner benar-benar membutuhkannya.

**Default bila tidak dijawab:** **(a)** — pengingat saja, tanpa blokir layanan.

### P26 — Tenggat melengkapi KTP

**Konteks:** agar pengingat punya akhir, perlu tenggat. Verifikasi KTP saat ini bisa dilakukan **OWNER dan ADMIN** (`@Roles(OWNER, ADMIN)` di controller), sedangkan aturan dossier 18 menyebut verifikasi **OWNER** — selisih itu dicatat sebagai **F-13** di [TASK-SINKRON-ATURAN](TASK-AKTIF.md#d4f-sinkron) dan **tidak** diselesaikan lewat pertanyaan ini. Tenggat terlalu pendek membuat penghuni baru tertekan; terlalu panjang membuat data kosong menumpuk.

**Pilihan:**
- **(a)** **7 hari kalender** sejak check-in; eskalasi ke OWNER pada hari ke-8. Konsekuensi: cukup manusiawi, satu minggu untuk melengkapi. Risiko: 7 hari pertama data belum lengkap.
- **(b)** **3 hari**. Konsekuensi: data cepat lengkap. Risiko: penghuni yang sibuk/baru pindah bisa terlewat dan langsung dieskalasi.
- **(c)** **14 hari**. Konsekuensi: paling longgar. Risiko: data kosong lebih lama; pengingat terasa tidak serius.

**Rekomendasi:** **(a)** — sejalan dengan irama H+7 yang sudah dipakai renewal.

**Default bila tidak dijawab:** **(a)** 7 hari; akses verifikasi **tidak diubah** (tetap OWNER+ADMIN sesuai kode), F-13 tetap tercatat.

### P27 — Deposit & surcharge: tegakkan aturan di semua kanal, atau biarkan berbeda? — **DITUTUP 19 Okt 2026: tegakkan di semua kanal**

**Konteks:** kode sekarang menerima **override deposit** saat approve booking/check-in (padahal aturan D-05: deposit selalu `Room.defaultDepositRupiah`), dan **hanya booking publik** yang menghitung **surcharge penghuni + deposit hewan**; booking portal dan walk-in tidak. Artinya kamar yang sama bisa berharga berbeda tergantung jalur, dan deposit bisa menyimpang dari aturan. Ini uang, jadi owner yang memutuskan.

**Pilihan:**
- **(a)** Tegakkan aturan: deposit **selalu** default kamar (tanpa override), surcharge + deposit hewan dihitung **di semua kanal**. Konsekuensi: satu harga untuk satu kamar; FAQ bisa jujur. Risiko: admin kehilangan jalur negosiasi deposit; nominal booking portal berubah (lebih tinggi bila ada penghuni ekstra/hewan).
- **(b)** Pertahankan override deposit **khusus ADMIN** dengan alasan wajib + audit, tetapi surcharge/deposit hewan tetap paritas. Konsekuensi: fleksibel untuk kasus khusus. Risiko: selisih deposit tetap mungkin; laporan harus menyebut alasan.
- **(c)** Tunda; FAQ menulis apa adanya bahwa kanal berbeda. Konsekuensi: tidak ada perubahan uang. Risiko: aturan “deposit selalu default kamar” tetap dilanggar kode; transparansi jadi pengakuan cacat.

**Rekomendasi:** **(a)** — aturan sudah ada (D-05/D-24); yang perlu diperbaiki adalah kode dan satu helper bersama, bukan aturannya.

**Default bila tidak dijawab:** **(c)** sampai ada keputusan: tidak mengubah perhitungan uang, dan FAQ **tidak** boleh menjanjikan paritas.

### P28 — Verifikasi KTP: OWNER saja, atau OWNER+ADMIN?

**Konteks:** aturan dossier 18 menyebut verifikasi KTP oleh **OWNER**, tetapi controller hari ini memasang `@Roles(OWNER, ADMIN)` — ADMIN bisa memverifikasi. Ini menyangkut akses ke data pribadi (foto KTP), jadi bukan keputusan teknis biasa; selisihnya dicatat **F-13**.

**Pilihan:**
- **(a)** **OWNER saja** (sesuai aturan tertulis). Konsekuensi: sejalan prinsip akses paling sempit; ADMIN tetap bisa mengunggah/menyiapkan, OWNER yang mengklik verifikasi. Risiko: verifikasi menumpuk di satu orang; onboarding 13 KTP bisa lambat.
- **(b)** **OWNER+ADMIN** (sesuai kode hari ini). Konsekuensi: verifikasi bisa dibagi; aturan dossier 18 diperbarui. Risiko: ADMIN memegang akses PII; perlu jejak audit yang jelas dan kepercayaan eksplisit.
- **(c)** Tunda: biarkan kode apa adanya, catat sebagai penyimpangan. Konsekuensi: tidak ada perubahan hari ini. Risiko: aturan dan kode terus berbeda.

**Rekomendasi:** **(a)** — aturan sudah menetapkan OWNER; memperluas akses PII sebaiknya keputusan sadar, bukan karena kode terlanjur longgar.

**Default bila tidak dijawab:** **(c)** — tidak mengubah akses; F-13 tetap tercatat.

**Catatan riwayat (bukan pertanyaan):** P8–P16 sudah dijawab owner dan dipindah ke register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) (`P8-BUILD-SEBELUM-COMMIT`, `PEMADATAN-STOP-MEKANIS + KARTU-4-ROLE`, `KARTU-TENANT-3-INTI`, `P12–P16`); pertanyaan terjawab tidak disimpan dua kali (§1).

### P29 — Bukti UAT & sign-off AO-14: siapa yang menjalankan, di data apa?

**Konteks:** tujuh baris antrean (W-OWN-001/002/003/004/005/008, plus W-OWN-006) berhenti di **bukti runtime**, bukan di kode: crawl tiga role, dua state TENANT, viewport 320–1440 px, Axe/gate Baymard, screenshot bebas PII, dan tanda tangan AO-14. Agen tidak boleh membuat persona/UAT di produksi dan tidak punya sesi login. Tanpa keputusan ini, baris-baris itu tetap terbuka walau kode dan test hijau.

**Pilihan:**
- **(a)** Owner menjalankan sesi UAT singkat (OWNER/ADMIN/STAFF + 2 state TENANT) dan mengirim screenshot + catatan; agen menutup baris dengan bukti itu. Konsekuensi: bukti paling sah karena berasal dari sesi nyata. Risiko: butuh ±1 jam waktu owner; jadwal bergantung owner.
- **(b)** Agen menyiapkan **skrip crawl** (Playwright) yang dijalankan owner di mesin sendiri dengan akun UAT, lalu artefak (trace/screenshot) diunggah. Konsekuensi: sebagian besar pekerjaan mekanis hilang dari pundak owner. Risiko: menambah skrip + dependensi dev; akun UAT harus ada dan bukan data penghuni nyata.
- **(c)** Tunda seluruh bukti UAT sampai data go-live lengkap (foto, KTP, meter). Konsekuensi: tidak ada klaim DoD yang salah. Risiko: 7 baris antrean berhenti lama; regresi visual tidak terdeteksi.

**Rekomendasi:** **(b) lalu (a)** — skrip menghemat waktu owner, tetapi tanda tangan AO-14 tetap butuh mata owner.

**Default bila tidak dijawab:** **(c)** — baris tetap `[ ]` dan ditandai menunggu bukti; tidak ada klaim selesai.

### P30 — Normalisasi visual (AO-20) & hak pakai foto/aset (AO-19)

**Konteks:** W-OWN-009 menyisakan normalisasi istilah/warna setelah review AO-20; W-OWN-007 menyisakan keputusan **hak pakai foto**, keseragaman aspek, dan izin optimasi aset. Keduanya menyentuh tampilan publik dan kepemilikan materi, jadi bukan keputusan teknis.

**Pilihan:**
- **(a)** Owner menandai **satu** istilah/komponen contoh per masalah (mis. "Rating Tertinggi" sebagai pola), agen menyeragamkan sisanya. Konsekuensi: arah visual konsisten tanpa owner mengaudit semua halaman. Risiko: agen salah menafsirkan untuk halaman yang tidak dicontohkan.
- **(b)** Agen mengusulkan daftar istilah (glosarium) + tangkapan layar sebelum–sesudah per halaman, owner menyetujui borongan. Konsekuensi: satu putaran review, hasil menyeluruh. Risiko: butuh waktu owner membaca satu dokumen.
- **(c)** Biarkan apa adanya; catat sebagai utang visual. Konsekuensi: tidak ada risiko perubahan. Risiko: istilah bercampur (mis. "Deluxe" vs "Premium") tetap membingungkan calon penghuni.

**Rekomendasi:** **(b)** — satu dokumen glosarium + bukti visual lebih murah daripada review berulang; sekalian menutup AO-20 dan AO-19 dalam satu keputusan.

**Default bila tidak dijawab:** **(c)** — tidak ada perubahan tampilan; baris tetap terbuka.

### P31 — Akses server & data produksi untuk sisa W-OPS/W-DATA

**Konteks:** W-OPS-002/003/004/005/006/009/010/011/012/013/014 dan W-DATA-001 butuh **izin eksplisit**: pengukuran resource host, konfigurasi env/DB, rotasi secret/PIN, saldo awal, pemindahan `uploads/`, dan kueri baca DB produksi untuk membandingkan tarif 13 kamar. Agen hanya diizinkan menyentuh yang sudah disetujui.

**Pilihan:**
- **(a)** Owner memberi izin **baca-saja** (kueri SELECT + `du`/`ps`) untuk satu jendela waktu; agen mencatat temuan tanpa PII. Konsekuensi: W-DATA-001 dan baseline workload bisa selesai tanpa risiko tulis. Risiko: perlu owner hadir memberi akses; hasilnya potret, bukan pemantauan.
- **(b)** Tunda semua sampai onboarding 13 hunian selesai. Konsekuensi: tidak ada perubahan server. Risiko: baseline performa & rotasi secret makin jauh dari keadaan nyata.
- **(c)** Agen menyiapkan **daftar perintah** yang dijalankan owner sendiri (copy-paste), hasilnya ditempel balik. Konsekuensi: nol akses agen ke server. Risiko: salah tempel/kurang teliti; butuh satu putaran bolak-balik.

**Rekomendasi:** **(a)** untuk baca-saja + **(c)** untuk tindakan yang mengubah server (rotasi, migrasi aset).

**Default bila tidak dijawab:** **(c)** — tidak ada akses baru; baris bertanda BLOCKED (owner).

### P32 — Review adopsi Mode Cepat setelah 30 hari

**Konteks:** W-OWN-013 meminta keputusan berbasis data: berapa pemakaian `/cepat` vs Normal dan berapa kartu yang diklik. Data itu belum dikumpulkan; tanpa angka, keputusannya jadi opini.

**Pilihan:**
- **(a)** Tambahkan pencatat pemakaian ringan (AuditLog `page_view` untuk `/cepat` + klik kartu) dan tinjau setelah 30 hari. Konsekuensi: keputusan punya dasar angka. Risiko: menambah data perilaku; perlu kebijakan retensi.
- **(b)** Pakai data yang sudah ada (log akses server) tanpa kode baru. Konsekuensi: nol perubahan kode. Risiko: log akses tidak memuat klik kartu, jadi kesimpulan lemah.
- **(c)** Putuskan tanpa data: hapus Mode Cepat karena sudah `deprecated`. Konsekuensi: kode lebih sederhana. Risiko: membuang fitur tanpa bukti pemakaian.

**Rekomendasi:** **(a)** — murah, dan sejalan dengan gate “berbasis data, bukan opini”.

**Default bila tidak dijawab:** **(c)** — Mode Cepat sudah ditandai `deprecated`; tidak ada pencatat baru, baris tetap terbuka sampai owner memutuskan.

### P33 — Bukti pemicu cron agenda AI di produksi (W-OWN-012)

**Konteks:** kode agenda AI harian sudah selesai dan diuji (`AiAgendaSweepService`: maksimal satu `AiDraft` `daily-agenda` per hari WIB; panggilan kedua di hari yang sama mengembalikan `AGENDA_ALREADY_CREATED_TODAY`; fallback rule-based saat AI mati). Di produksi `AUTO_OPS_ENABLED=false`, jadi pemicu satu-satunya adalah `POST /api/auto-ops/cron` dengan header token dari env server. Yang belum terbukti: draft itu benar-benar lahir di produksi dan panggilan kedua tidak menambahnya. Membuktikannya butuh salah satu dari dua hal yang belum diizinkan: **baca DB produksi** (P31 masih terbuka) atau **satu panggilan cron** yang berisiko memicu permintaan AI berbayar bila kunci AI aktif.

**Pilihan:**
- **(a)** Owner mengizinkan **satu panggilan cron** pada jendela yang dipastikan AI mati/fallback (kunci AI kosong atau `AI_ENABLED=false`); agen memanggil dua kali dan melaporkan JSON panggilan kedua (`skipped: true` / `AGENDA_ALREADY_CREATED_TODAY`). Konsekuensi: bukti dedupe end-to-end tanpa biaya AI; satu draft agenda nyata masuk ke kotak OWNER. Risiko: kalau AI ternyata aktif, ada biaya satu brief (kecil, tetapi uang = keputusan owner).
- **(b)** Owner memberi **izin baca-saja DB produksi** (SELECT `id, feature, targetId, createdAt` dari `AiDraft` untuk `feature='daily-agenda'` hari itu) setelah cron terjadwal berjalan sendiri. Konsekuensi: tanpa panggilan manual dan tanpa biaya tambahan. Risiko: butuh akses DB; bukti baru ada setelah cron benar-benar berjalan.
- **(c)** Owner menjalankan sendiri dua `curl` cron dan menempelkan JSON-nya. Konsekuensi: nol akses/biaya agen. Risiko: satu putaran bolak-balik; cron terjadwal tetap belum terbukti.
- **(d)** Owner menyatakan bukti cron tidak diperlukan; W-OWN-012 ditutup dengan bukti kode + lima unit test. Konsekuensi: baris ditutup hari ini. Risiko: klaim "berjalan di produksi" tidak pernah dibuktikan.

**Rekomendasi:** **(b)** — bukti tanpa biaya dan tanpa panggilan manual; **(a)** hanya bila owner bisa memastikan AI sedang mati.

**Default bila tidak dijawab:** **(c)/BLOCKED** — tidak ada panggilan produksi dan tidak ada kueri DB dari agen; baris W-OWN-012 tetap `[ ]` dengan tanda BLOCKED (owner).





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
| 2026-10-11 | **P9 dan P10 DIJAWAB owner: P9 (b), P10 (b), baseline ratchet diterima.** Jawabannya dipindah ke register sebagai `PEMADATAN-STOP-MEKANIS + KARTU-4-ROLE (dikoreksi owner) + BASELINE-RATCHET-DITERIMA` ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)), dan berkas ini **dikosongkan**: blok P10, P9, dan P8 (yang jawabannya sudah ada di register) dihapus sesuai aturan §1 "pertanyaan yang sudah dijawab tidak disimpan dua kali". Berkas 98 → 44 baris. Dampak yang langsung dieksekusi: gate `AIDL-01` di [ANTREAN §3](../ANTREAN.md) ditulis jujur "tiga role"; pemadatan **tidak** dilanjutkan ke penggabungan makna. |
| 2026-10-11 | **KOREKSI OWNER atas P10, dan saya catat sebagai kesalahan eksekusi saya.** Owner menegaskan: *"loh role tetap tenant, admin, owner dan staff loh ya"* — jadi **TENANT tetap mendapat kartu**. Saat mengeksekusi pilihan (b), saya sempat menulis gate `AIDL-01` menjadi "tiga role"; itu **dibatalkan** dan gate kembali ke **OWNER/ADMIN/STAFF/TENANT**. Empat dokumen yang sudah saya ubah menyesuaikan (ANTREAN, TASK-AIDL-01a, TASK-AIDL-01b, register). Karena **aturan** kartu penghuni belum ada, muncul pertanyaan baru **P11** di berkas ini alih-alih saya mengarang daftar aturannya sendiri. |
| 2026-10-11 | **P11 DIJAWAB owner: (a)** — tiga kartu inti untuk TENANT, dua dibangun lebih dulu (tagihan, perpanjangan). Jawaban dipindah ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `KARTU-TENANT-3-INTI`; blok P11 **dihapus** sesuai §1; berkas kembali **0 pertanyaan terbuka**. Kode kartu TENANT **belum ditulis** — sisa `AIDL-01b`. |
| 2026-10-18 | **Lima pertanyaan baru P12–P16** ditulis di sini **sebelum** dipaparkan di chat: P12 berkas sandi OWNER + kunci SSH rilis, P13 kunci Brevo + pengirim, P14 akun ADMIN/STAFF, P15 saldo awal kas/bank, P16 izin deploy perbaikan laporan + UAT. Semua memakai lima unsur (§1). Konteks angkanya potret 18 Okt 2026 (rotasi DB 11:07 WIB, login OWNER 201, laporan produksi masih ±14,6 jt sampai deploy). |
| 2026-10-19 | **P12–P16 DIJAWAB owner** (P12 a dengan koreksi "tidak perlu dihapus", P13 kunci Brevo diberikan, P14 nama Hadi tanpa email, P15 b, P16 a) → dipindah ke register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `P12–P16`; bloknya **dihapus** dari sini (§1). Dua pertanyaan lanjutan ditulis: **P17** email/identifier Hadi, **P18** IP server + pengirim + rotasi kunci Brevo. |
| 2026-10-19 | **Enam pertanyaan baru P19–P24** ditulis di sini **sebelum** dipaparkan di chat, lahir dari audit go-live bertanggal ([AUDIT-GOLIVE-2026-10-19](../arsip/AUDIT-GOLIVE-2026-10-19.md)): P19 tarif listrik/air 0 di 13 kamar, P20 saldo awal kas/bank, P21 foto & fasilitas katalog publik, P22 deposit tanpa jurnal, P23 dua alamat kos, P24 izin backup + uji restore. Semua memakai lima unsur (§1). Angka konteksnya potret 19 Okt 2026 07:03 WIB dari kueri baca-saja ke DB produksi. |
| 2026-10-19 | **Empat pertanyaan baru P25–P28** ditulis di sini **sebelum** dipaparkan di chat, lahir dari instruksi owner tentang transparansi aturan + KTP pasca-check-in: P25 konsekuensi KTP belum lengkap, P26 tenggat, P27 paritas deposit/surcharge antar kanal, P28 akses verifikasi KTP. Semua memakai lima unsur (§1). Default sementara: pengingat saja, 7 hari (akses verifikasi tidak diubah), dan **tidak** mengubah perhitungan uang. |
| 2026-10-19 | **Arahan owner: default diterima, hanya pertanyaan krusial.** Delapan pertanyaan ditutup dengan default (P17, P18, P20, P22, P23, P25, P26, P28); yang tetap terbuka hanya **P19, P21, P24, P27**. Bloknya dipertahankan sebagai rincian sampai pembersihan berikutnya; keputusan induk di register `DEFAULT-DITERIMA`. |
| 2026-10-19 | **P19, P21, P24, P27 dijawab owner** → register `GO-LIVE-DATA + TARIF + BACKUP + PARITAS`: listrik Rp2.500/kWh, air gratis sementara (IoT waterflow), data go-live lewat `/checklist`, dump + jadwal + uji restore, paritas semua kanal. Blok ditandai **DITUTUP**; berkas kembali **0 pertanyaan terbuka**. |
| 2026-10-22 | **P33 ditambahkan (W-OWN-012, bukti cron produksi).** Konteks: kode + lima unit test selesai, produksi `AUTO_OPS_ENABLED=false`, bukti dedupe butuh baca DB (P31 terbuka) atau satu panggilan cron yang bisa memicu AI berbayar. Empat pilihan (a–d) + risiko + rekomendasi (b) + default aman (c/BLOCKED). **Tidak ada panggilan produksi/kueri DB dijalankan.** |
| 2026-10-23 | **Lima pertanyaan baru P34–P38** ditulis di sini **sebelum** dipaparkan di chat, lahir dari fase S1 Program ROOMS dan AKUN V2: P34 kontrak lewat tanggal, P35 NIK sebagai identifier, P36 pintu akun booking+DP, P37 wizard sebagai beranda, P38 nominal/tenggat/verifikator DP. Semua memakai lima unsur (§1). Konteks angkanya potret 23 Okt 2026 dari API publik produksi (13 kamar, 12 terisi, booking online mati, 9 kontrak lewat tanggal) + riset bersumber di [TASK-RUANG-WIZARD §8.9](TASK-RUANG-WIZARD.md#89-sesi-23-okt-2026--bukti-l1-ukur-ulang-dan-l2-riset). Tidak ada kode/DB yang disentuh. |
| 2026-10-23 | **P34, P35, P36 DIJAWAB owner (semuanya pilihan a) dan P38 bentuknya dipilih (b, persentase sewa)** → dipindah ke register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1`; blok P34–P36 **dihapus** dari sini sesuai §1 dan P38 dipersempit menjadi satu pertanyaan angka. Sisa terbuka: P37 (default berjalan) dan P38 (angka persentase). |
| 2026-10-23 | **P38 DIJAWAB owner: "DP 30%"** → register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1b`; blok P38 **dihapus** sesuai §1. Tercatat **koreksi konteks**: DP 30% (`downPaymentAmountRupiah`) berbeda dari deposit jaminan (`depositAmountRupiah`) — konteks pertanyaan sebelumnya keliru menyebut DP = deposit kamar + deposit hewan. Tidak ada perubahan rumus; **sisa pertanyaan terbuka: P37 saja**. |
