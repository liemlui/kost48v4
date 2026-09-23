# Flow utama OWNER/ADMIN

Tanggal: 22 September 2026. Status: **peta dokumentasi dan kebutuhan produk; belum verifikasi source/runtime**.
Tujuan: menyederhanakan pekerjaan penghuni dan keuangan agar pengguna memahami akibat tindakan sebelum menjalankannya.
Keputusan owner: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md). Antrean dan gate pelaksanaan: [STATUS](../STATUS.md).
Dokumen ini tidak mengubah nominal, hak akses, aturan akuntansi, atau status bisnis. Rujukan teknis: [flow & kontrak](../domain/flow.md), [keuangan](../domain/keuangan.md), [hunian](../domain/hunian.md).

## 1. Cara membaca bukti

- **Kontrak dokumentasi:** aturan yang tercatat pada sumber di atas, dengan override terbaru mengalahkan narasi lama. Bukan klaim telah cocok dengan kode saat ini.
- **Usulan UI:** kebutuhan tampilan untuk keputusan owner; belum desain final atau fitur selesai.
- **UNKNOWN:** detail belum dibuktikan; task implementasi harus memeriksa service, kontrak API, konsumen, serta bukti terkait sebelum mengubah perilaku.
- Nominal sebelum/sesudah pada transaksi nyata harus berasal dari backend sesuai target, periode, dan status terkini. Tidak ada angka simulasi yang dianggap saldo aktual.

## 2. Enam alur kerja

| Alur | Langkah bisnis yang perlu terbaca | Hasil yang dicari pengguna |
|---|---|---|
| Penghuni masuk | Booking → bukti pembayaran → persetujuan → persiapan check-in → serah kunci | Tahu siapa yang telah membayar, kamar yang terkunci, dan siapa yang sudah benar-benar menghuni |
| Tagihan dan pembayaran | Periksa periode/komponen → terbitkan sesuai kontrak → tinjau bukti → setujui/tolak → lihat sisa | Tahu tagihan, uang diterima, sisa piutang, dan rujukan transaksi |
| Perpanjangan | Keputusan penghuni → DP/prabayar sesuai jalur → meter/utilitas → pelunasan → finalisasi | Tahu deadline, harga, periode lama/usulan, dan kapan periode benar-benar berubah |
| Penghuni keluar | Permintaan → tagihan/meter/kerusakan → finalisasi sesuai jalur → settlement → inspeksi | Tahu sisa kewajiban, deposit/refund, dan kapan kamar siap dihuni kembali |
| Pengeluaran | Periksa nota dan kategori → draft rutin atau input manual → konfirmasi sesuai jalur → laporan | Tahu kapan biaya memengaruhi kas/jurnal dan bagaimana menelusurinya |
| Tinjauan harian | Antrean tindakan → kondisi hunian/uang → sumber angka → tindak lanjut | Tahu pekerjaan hari ini, kondisi bisnis, dan akibat keputusan berikutnya |

## 3. Matriks dampak berdasarkan kontrak dokumentasi

Kolom bukti menyebut artefak yang perlu ditelusuri, bukan pernyataan telah diverifikasi pada sesi ini. Jalur koreksi yang belum pasti tetap UNKNOWN; jangan menawarkan tombol pembatalan yang belum didukung kontrak.

| Tindakan | Aktor dan prasyarat | Dampak uang/status serta domain terkait | Bukti dan jalur koreksi |
|---|---|---|---|
| Buat booking awal | Pengguna melalui jalur booking yang diizinkan; kamar/tanggal valid | Booking belum dibayar tidak mengubah kamar menjadi RESERVED; pencatatan booking dan tagihan bukan bukti kas diterima | Booking/stay dan invoice terkait; pembatalan mengikuti guard existing. Endpoint/koreksi terkini UNKNOWN |
| Setujui DP/pelunasan awal | OWNER/ADMIN sesuai kontrak; bukti, nominal sah, pemenang kamar dan status harus valid | Approval DP maupun lunas → RESERVED; pembayaran dapat mengubah kas/piutang/deposit sesuai alokasi. Tidak mempromosikan meter atau menjadikan OCCUPIED | Payment, invoice, penerimaan deposit/jurnal sesuai jalur. Refund kalah-cepat berbeda dari pembatalan biasa; koreksi wajib ditelusuri ke guard existing |
| Check-in/serah kunci | Aktor berwenang; invoice sewa awal lunas, KTP dan prasyarat check-in terpenuhi | RESERVED → OCCUPIED; meter awal dipromosikan. Pelunasan sudah terjadi pada langkah pembayaran; jangan mencatat penerimaan uang kedua | Stay, meter awal, status kamar, audit check-in. Jalur koreksi setelah hunian aktif UNKNOWN; bukan sekadar mengembalikan status kamar |
| Terbitkan tagihan/tinjau pembayaran | OWNER/ADMIN sesuai kontrak invoice; periode, komponen dan bukti valid | DRAFT bukan pendapatan. Penerbitan, pembayaran dan pengakuan pendapatan memiliki dampak berbeda; utilitas memakai MeterReading bisnis | Invoice/payment, jurnal dan akun kas terkait; pembatalan/reversal harus mengikuti periode dan guard. Jangan hapus jejak transaksi untuk mengoreksi angka |
| Siapkan/finalkan renewal | OWNER/ADMIN sesuai jalur; harga loyalitas, deadline, meter dan invoice pelunasan valid | DP atau penerbitan settlement belum mengubah periode stay. Finalisasi setelah syarat PAID/deadline terpenuhi mengubah periode; DP renewal tidak mereset quota listrik | RenewRequest, invoice DP/settlement, paidAt, periode sebelum/sesudah. FORFEITED menandai/notifikasi; tindak lanjut manual mengikuti kewenangan, bukan otomatis checkout oleh UI |
| Finalisasi checkout | OWNER/ADMIN sesuai jalur; tagihan dan pemeriksaan terkait memenuhi guard | Checkout normal dan paksa memiliki syarat berbeda. Kamar menjadi MAINTENANCE/inspeksi; checkout bukan langsung AVAILABLE | Stay, tagihan, tiket inspeksi dan audit. Role forced-checkout perlu dicocokkan dengan service; narasi lama M05 tidak cukup sebagai izin |
| Selesaikan deposit/refund | **OWNER** sesuai M02 D-17; penerimaan deposit, kewajiban dan guard settlement valid | Deposit dibagi sesuai kewajiban/refund; pemakaian deposit ke piutang bukan penerimaan kas baru. Kekurangan pada forced checkout tetap piutang, bukan otomatis write-off | Ledger deposit, jurnal, invoice dan bukti refund; rekonsiliasi harus cocok. Settlement tidak diulang/hapus; mekanisme koreksi terkini UNKNOWN |
| Tutup inspeksi/kamar siap | Staf atau aktor yang berwenang sesuai kontrak tiket; pemeriksaan dan guard keselamatan terpenuhi | MAINTENANCE → AVAILABLE mengikuti room-readiness. Status dapat dipesan dan kondisi fisik siap dihuni perlu dibedakan | Tiket CHECKOUT_INSPECTION, hasil inspeksi, status kamar dan audit. Jalur pembukaan kembali tiket/status UNKNOWN |
| Catat/konfirmasi pengeluaran | OWNER/ADMIN sesuai hak; nota, kategori, periode dan akun yang valid | Draft rutin belum masuk laporan/jurnal. M04 mencatat input manual langsung CONFIRMED; konfirmasi draft dan posting jurnal satu transaksi | Expense, status, bukti, jurnal/kas terkait. Pembatalan draft berbeda dari koreksi biaya CONFIRMED; reversal existing perlu diverifikasi |
| Baca tinjauan harian | OWNER/ADMIN sesuai cakupan akses; periode dan kesegaran data terlihat | Membaca dashboard tidak mengubah transaksi. Kas, piutang, deposit, pendapatan dan laba tidak dipertukarkan | Tautan dari indikator ke sumber/periode; data kurang/error ditandai, bukan dikoreksi dengan mengisi nol |

## 4. Kontrak yang tidak boleh hilang saat UI disederhanakan

- Override Fase V di M03/M04/M05 berlaku: booking belum bayar → AVAILABLE; approval DP/pelunasan → RESERVED; check-in setelah syarat terpenuhi → OCCUPIED. RESERVED tidak membuktikan lunas.
- M02/M04 tetap menentukan nominal sah, DP, deposit, periode, jurnal dan permission. Tampilan sederhana tidak membuka nominal pembayaran bebas atau memberi ADMIN kewenangan settlement OWNER.
- Renewal, checkout, settlement deposit dan room-readiness adalah keputusan terpisah meskipun ditampilkan dalam satu perjalanan.
- Penundaan IoT tidak menonaktifkan pencatatan utilitas; MeterReading bisnis tetap landasan tagihan. Telemetry bukan penerbit tagihan otomatis.
- AI dalam aplikasi tetap pembantu analisis/draft; keputusan mutasi melalui manusia dan endpoint domain dengan guard existing.

## 5. Usulan UI dan dashboard

Dashboard utama menjawab tiga pertanyaan: **apa yang perlu saya kerjakan, bagaimana kondisi bisnis, dan apa akibat tindakan saya?**

1. Tampilkan antrean masalah/tenggat dengan penghuni/kamar, alasan, penanggung jawab, dan tindakan yang memang diizinkan.
2. Ringkasan hunian/uang menyebut periode, definisi dan waktu data. Bedakan nol, belum ada data, loading, gagal, dan data usang.
3. Sebelum tindakan berdampak, tampilkan objek, rupiah/status/periode sebelum → sesudah, proses terdampak, serta prasyarat yang belum terpenuhi.
4. Sesudah tindakan, tampilkan hasil aktual dan rujukan transaksi. Kegagalan, hasil belum pasti, atau sebagian proses tertahan tidak ditampilkan sebagai sukses penuh.
5. Detail komponen uang, sumber, riwayat, audit dan penjelasan [IB](arah-produk.md) dibuka bertahap sesuai OWN-DETAIL-WITHOUT-CLUTTER; tidak menghilangkan fungsi penting.

**Batas preview:** frontend mengonsumsi hasil/kontrak backend; tidak membuat rumus atau state machine bisnis kedua. Bila endpoint preview belum ada, tandai kebutuhan kontrak dan implementasikan melalui task terpisah. Perubahan data/permission setelah preview harus ditangani backend saat konfirmasi. Jangan menebak saldo atau menjanjikan hasil dari snapshot usang.

Deskripsi masalah lama [status Fase AO](../audit/status-ao-lintas-portal.md) bukan otomatis pekerjaan terbuka: AO-22 tercatat selesai historis, sementara status sisa lain perlu mengikuti M12 dan bukti yang relevan.

## 6. Acceptance dan pekerjaan berikutnya

Penerapan UI nanti diterima bila OWNER/ADMIN dapat menjelaskan akibat tindakan sebelum konfirmasi, menemukan hasil serta sumber angka sesudahnya, dan menyelesaikan enam alur tanpa menafsirkan sendiri perpindahan status/uang.

Sebelum perubahan aplikasi, task FLOW-CORE-01 perlu melengkapi matriks ini dengan producer/service → API → konsumen UI, nominal/status konkret dari fixture yang diizinkan, bukti kegagalan/retry serta jalur koreksi setiap tindakan. Ketersediaan preview, kewenangan detail, atomisitas dan perilaku koreksi saat ini **UNKNOWN** sampai diperiksa.
Validasi memakai skenario nonpersonal yang disetujui, mencakup jalur normal, prasyarat belum terpenuhi, data berubah, kegagalan, dan role terbatas. Dokumentasi ini tidak menggantikan gate uang M04/M12, verifikasi aplikasi, UAT, atau sign-off produksi.

---

**Digabung dari docs/product/landasan-ib.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

# Landasan IB Diploma Business Management untuk KOST48

Tanggal: 22 September 2026. Status: **landasan produk dan kerangka penerapan; bukan audit kurikulum atau klaim fitur selesai**.
Owner menetapkan IB Diploma Business Management Theory sebagai dasar bisnis kost yang kuat dalam [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md).
Penerapan didahulukan pada operasi penghuni dan keuangan OWNER/ADMIN; [flow utama](arah-produk.md) menjadi penghubung teori dengan pekerjaan sehari-hari. Antrean implementasi tetap [STATUS](../STATUS.md).

## 1. Dasar dan batas sumber

[IB DP Business Management subject brief, first assessments 2024](https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/business-management-sl-subject-brief-en.pdf) menekankan keputusan bisnis, hubungan fungsi bisnis, dan konsekuensi bagi pemangku kepentingan. Konsep lintas bidangnya mencakup **kreativitas, perubahan, etika, dan keberlanjutan**.
Pemeriksaan terdahulu pada 22 September memakai teks indeks pencarian resmi; pengambilan PDF penuh ditolak HTTP 403. Dokumen ini tidak mengklaim mencakup seluruh silabus atau memvalidasi rumus/modul pembelajaran IB.

Pemetaan berikut merupakan **adaptasi KOST48**. Urutan dan kebutuhan aplikasinya mengikuti masalah owner, data yang tersedia, serta aturan bisnis existing; bukan urutan resmi kurikulum atau kewajiban menambah seluruh alat analisis IB.

## 2. Lima bidang dalam keputusan kost

| Bidang penerapan | Pertanyaan bisnis KOST48 | Data/bukti yang perlu tersedia | Bentuk bantuan aplikasi yang dituju |
|---|---|---|---|
| Keuangan dan akuntansi | Apakah kas cukup untuk kewajiban; siapa belum membayar; biaya apa perlu ditinjau? | Kas aktual, piutang, deposit, pendapatan, biaya, periode dan transaksi asal | Angka terpisah dengan definisi, asal dan periode; rincian kewajiban serta tindakan penagihan |
| Manajemen operasi | Apakah penghuni dapat masuk/keluar dengan benar dan kamar siap digunakan? | Booking, stay, tagihan, meter, checkout, inspeksi, tiket dan waktu kejadian | Enam flow utama dengan prasyarat, status, penanggung jawab dan dampak keputusan |
| Organisasi dan SDM | Siapa boleh memutuskan, mengerjakan, menyetujui dan menindaklanjuti? | Role/permission, penugasan, handoff, audit dan pekerjaan tertunda | Tanggung jawab jelas; OWNER/ADMIN/staf hanya mendapat tindakan sesuai kewenangan |
| Pemasaran | Layanan apa dibutuhkan penghuni dan apa yang mendukung retensi? | Masukan penghuni, keluhan, renewal, alasan keluar dan data pasar bersumber/tanggal | Ringkasan kebutuhan/retensi untuk menilai pilihan layanan; dampak harga/operasi tetap ditelusuri |
| Strategi dan evaluasi | Masalah apa paling bernilai diselesaikan dan apakah keputusan memberi hasil? | Tujuan, baseline, alternatif, biaya/manfaat, asumsi dan hasil setelah tindakan | Catatan keputusan singkat dengan pemilik keputusan, batas kesimpulan dan waktu evaluasi |

## 3. Empat konsep sebagai pemeriksaan keputusan

| Konsep | Pertanyaan penerapan KOST48 |
|---|---|
| Kreativitas | Adakah cara lebih sederhana menyelesaikan kebutuhan owner/penghuni dengan sumber daya yang tersedia? |
| Perubahan | Siapa terdampak, apa prasyaratnya, dan bagaimana proses baru diperkenalkan serta dievaluasi? |
| Etika | Apakah tagihan, deposit, informasi dan perlakuan penghuni dapat dijelaskan secara adil serta sesuai kewenangan? |
| Keberlanjutan | Apakah keputusan menjaga kelangsungan kas, kualitas layanan, pemeliharaan dan penggunaan sumber daya dalam jangka panjang? |

Pertanyaan ini membantu menilai pilihan. Jawabannya tidak menggantikan kebijakan deposit, tarif, kontrak sewa, pengakuan pendapatan, hak akses atau gate yang sudah diputuskan owner.

## 4. Bentuk catatan keputusan

Gunakan pola **kerangka → keputusan → input/sumber/tanggal → hasil dan batas → evaluasi**. Catatan dapat ditautkan dari task/keputusan yang relevan; jangan membuat antrean kedua.

| Isian | Isi minimum |
|---|---|
| Masalah dan tujuan | Keputusan nyata yang perlu diambil, siapa terdampak, dan hasil yang ingin diperbaiki |
| Kerangka yang dipilih | Bidang/konsep yang membantu menjawab pertanyaan; alasan memilih alat analisis jika diperlukan |
| Input | Sumber data, tanggal/periode, definisi, kelengkapan dan bagian yang masih UNKNOWN |
| Alternatif | Pilihan yang masuk akal, biaya/manfaat, risiko, ketergantungan serta asumsi masing-masing |
| Keputusan | Pilihan owner/aktor berwenang, alasan dan tindakan yang disetujui; rekomendasi AI dibedakan dari persetujuan |
| Hasil dan batas | Hasil aktual atau proyeksi diberi label; rumus/asumsi, ketidakpastian dan keterbatasan interpretasi terlihat |
| Evaluasi | Ukuran keberhasilan, baseline, waktu meninjau kembali dan tindak lanjut bila hasil berbeda dari harapan |

Contoh adaptasi: owner ingin mengurangi tagihan lewat jatuh tempo. Gunakan operasi dan keuangan untuk memetakan invoice valid serta status pembayaran, periksa hambatan komunikasi, pilih tindak lanjut sesuai kewenangan, lalu bandingkan hasil pada periode yang sebanding. Jangan menyimpulkan penyebab dari korelasi atau mengarang target persentase tanpa baseline.

## 5. Urutan penerapan produk

1. **Pencatatan dan alur utama:** bedakan kas/piutang/deposit/pendapatan/laba; jelaskan dampak booking, pembayaran, renewal, checkout dan biaya. Validasi definisi serta sumber sebelum merancang indikator.
2. **Ringkasan manajemen:** tampilkan pekerjaan mendesak, kondisi bisnis, serta asal angka/periode yang dapat dibuka; gunakan bahasa operasional pada tampilan utama.
3. **Evaluasi keputusan:** gunakan catatan keputusan dan bukti sebelum/sesudah untuk memilih perbaikan berikutnya.
4. **Analisis lanjutan bila dibutuhkan:** alat seperti SWOT, PESTLE, BCG, Porter atau bauran pemasaran hanya dipilih bila pertanyaan serta data relevan. Narasi lama [flow & kontrak](../domain/flow.md) bukan bukti semua alat tersedia, tervalidasi, atau cocok untuk kost.

Pengembangan IoT tetap ditunda. Pencatatan meter/utilitas yang diperlukan operasi dan tagihan tetap dijaga. Dashboard tidak perlu menampilkan seluruh teori; penjelasan dan asumsi tersedia saat pengguna membuka detail.

## 6. Batas penerapan dan bukti selesai

- Perhitungan serta mutasi bisnis tetap pada kontrak/service existing; rekomendasi AI tidak langsung memposting jurnal atau mengubah transaksi/status.
- Rasio, proyeksi dan simulasi menyebut periode, input, rumus dan asumsi; tidak disamakan dengan uang tersedia atau transaksi aktual.
- Tidak ada data pasar, ambang rasio, hubungan sebab-akibat atau manfaat finansial yang dianggap fakta tanpa bukti. Nol berbeda dari data belum tersedia.
- Keputusan tarif, DP, deposit, pengakuan pendapatan dan kewenangan tetap mengikuti [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) serta [keuangan](../domain/keuangan.md). Usulan teori tidak otomatis menjadi kebijakan baru.
- Source, UI dan runtime belum diaudit pada penataan dokumentasi ini. Integrasi IB yang sudah benar-benar tersedia, mutu indikator, serta efektivitas bagi owner tetap **UNKNOWN** sampai dibuktikan pada task terkait.

Penerapan dianggap berguna ketika owner dapat menjawab suatu pertanyaan bisnis dengan data yang dapat ditelusuri, memahami alternatif dan batasnya, mengambil keputusan sesuai kewenangan, lalu mengevaluasi hasilnya. Jumlah framework, grafik atau halaman bukan ukuran keberhasilan.
