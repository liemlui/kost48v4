# Flow utama OWNER/ADMIN

Tanggal: 22 September 2026. Status: **peta dokumentasi dan kebutuhan produk; belum verifikasi source/runtime**.
Tujuan: menyederhanakan pekerjaan penghuni dan keuangan agar pengguna memahami akibat tindakan sebelum menjalankannya.
Keputusan owner: [M02](../M02_KEPUTUSAN_OWNER.md). Antrean dan gate pelaksanaan: [M12](../M12_CHECKLIST_CHANGELOG.md).
Dokumen ini tidak mengubah nominal, hak akses, aturan akuntansi, atau status bisnis. Rujukan teknis: [M03](../M03_FLOW_KONTRAK.md), [M04](../M04_KEUANGAN.md), [M05](../M05_SIKLUS_HUNI.md).

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
5. Detail komponen uang, sumber, riwayat, audit dan penjelasan [IB](landasan-ib.md) dibuka bertahap sesuai OWN-DETAIL-WITHOUT-CLUTTER; tidak menghilangkan fungsi penting.

**Batas preview:** frontend mengonsumsi hasil/kontrak backend; tidak membuat rumus atau state machine bisnis kedua. Bila endpoint preview belum ada, tandai kebutuhan kontrak dan implementasikan melalui task terpisah. Perubahan data/permission setelah preview harus ditangani backend saat konfirmasi. Jangan menebak saldo atau menjanjikan hasil dari snapshot usang.

Deskripsi masalah lama [M14](../M14_AUDIT_UI_UX.md) bukan otomatis pekerjaan terbuka: AO-22 tercatat selesai historis, sementara status sisa lain perlu mengikuti M12 dan bukti yang relevan.

## 6. Acceptance dan pekerjaan berikutnya

Penerapan UI nanti diterima bila OWNER/ADMIN dapat menjelaskan akibat tindakan sebelum konfirmasi, menemukan hasil serta sumber angka sesudahnya, dan menyelesaikan enam alur tanpa menafsirkan sendiri perpindahan status/uang.

Sebelum perubahan aplikasi, task FLOW-CORE-01 perlu melengkapi matriks ini dengan producer/service → API → konsumen UI, nominal/status konkret dari fixture yang diizinkan, bukti kegagalan/retry serta jalur koreksi setiap tindakan. Ketersediaan preview, kewenangan detail, atomisitas dan perilaku koreksi saat ini **UNKNOWN** sampai diperiksa.
Validasi memakai skenario nonpersonal yang disetujui, mencakup jalur normal, prasyarat belum terpenuhi, data berubah, kegagalan, dan role terbatas. Dokumentasi ini tidak menggantikan gate uang M04/M12, verifikasi aplikasi, UAT, atau sign-off produksi.
