# Produk — arah, orientasi, portal, dan scope

> **Blok baca** · Jenis: **dokumen produk** · Status: **aktif (potret 2026-10-21)** · Untuk siapa: agen/owner yang butuh arah produk, orientasi, kontrak portal OWNER/ADMIN, atau scope · **Jangan** dibaca kalau: mencari peta peran/rute (itu [peran.md](peran.md)).

## Daftar isi

- [Bagian A — Arah produk](#d4d-arah)
- [Bagian B — Orientasi produk](#d4d-orientasi)
- [Bagian C — Portal OWNER/ADMIN](#d4d-portal)
- [Bagian D — Scope produk](#d4d-scope)

<a id="d4d-arah"></a>
## Bagian A — Arah produk

Tanggal: 22 September 2026. Status: **peta dokumentasi dan kebutuhan produk; belum verifikasi source/runtime**.
Tujuan: menyederhanakan pekerjaan penghuni dan keuangan agar pengguna memahami akibat tindakan sebelum menjalankannya.
Keputusan owner: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md). Antrean dan gate pelaksanaan: [ANTREAN](../ANTREAN.md).
Dokumen ini tidak mengubah nominal, hak akses, aturan akuntansi, atau status bisnis. Rujukan teknis: [flow & kontrak](../domain/publik.md#d4c-flow), [keuangan](../domain/keuangan.md), [hunian](../domain/hunian.md).

### 1. Cara membaca bukti

- **Kontrak dokumentasi:** aturan yang tercatat pada sumber di atas, dengan override terbaru mengalahkan narasi lama. Bukan klaim telah cocok dengan kode saat ini.
- **Usulan UI:** kebutuhan tampilan untuk keputusan owner; belum desain final atau fitur selesai.
- **UNKNOWN:** detail belum dibuktikan; task implementasi harus memeriksa service, kontrak API, konsumen, serta bukti terkait sebelum mengubah perilaku.
- Nominal sebelum/sesudah pada transaksi nyata harus berasal dari backend sesuai target, periode, dan status terkini. Tidak ada angka simulasi yang dianggap saldo aktual.

### 2. Enam alur kerja

| Alur | Langkah bisnis yang perlu terbaca | Hasil yang dicari pengguna |
|---|---|---|
| Penghuni masuk | Booking → bukti pembayaran → persetujuan → persiapan check-in → serah kunci | Tahu siapa yang telah membayar, kamar yang terkunci, dan siapa yang sudah benar-benar menghuni |
| Tagihan dan pembayaran | Periksa periode/komponen → terbitkan sesuai kontrak → tinjau bukti → setujui/tolak → lihat sisa | Tahu tagihan, uang diterima, sisa piutang, dan rujukan transaksi |
| Perpanjangan | Keputusan penghuni → DP/prabayar sesuai jalur → meter/utilitas → pelunasan → finalisasi | Tahu deadline, harga, periode lama/usulan, dan kapan periode benar-benar berubah |
| Penghuni keluar | Permintaan → tagihan/meter/kerusakan → finalisasi sesuai jalur → settlement → inspeksi | Tahu sisa kewajiban, deposit/refund, dan kapan kamar siap dihuni kembali |
| Pengeluaran | Periksa nota dan kategori → draft rutin atau input manual → konfirmasi sesuai jalur → laporan | Tahu kapan biaya memengaruhi kas/jurnal dan bagaimana menelusurinya |
| Tinjauan harian | Antrean tindakan → kondisi hunian/uang → sumber angka → tindak lanjut | Tahu pekerjaan hari ini, kondisi bisnis, dan akibat keputusan berikutnya |

### 3. Matriks dampak berdasarkan kontrak dokumentasi

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

### 4. Kontrak yang tidak boleh hilang saat UI disederhanakan

- Override Fase V di M03/M04/M05 berlaku: booking belum bayar → AVAILABLE; approval DP/pelunasan → RESERVED; check-in setelah syarat terpenuhi → OCCUPIED. RESERVED tidak membuktikan lunas.
- M02/M04 tetap menentukan nominal sah, DP, deposit, periode, jurnal dan permission. Tampilan sederhana tidak membuka nominal pembayaran bebas atau memberi ADMIN kewenangan settlement OWNER.
- Renewal, checkout, settlement deposit dan room-readiness adalah keputusan terpisah meskipun ditampilkan dalam satu perjalanan.
- Penundaan IoT tidak menonaktifkan pencatatan utilitas; MeterReading bisnis tetap landasan tagihan. Telemetry bukan penerbit tagihan otomatis.
- AI dalam aplikasi tetap pembantu analisis/draft; keputusan mutasi melalui manusia dan endpoint domain dengan guard existing.

### 5. Usulan UI dan dashboard

Dashboard utama menjawab tiga pertanyaan: **apa yang perlu saya kerjakan, bagaimana kondisi bisnis, dan apa akibat tindakan saya?**

1. Tampilkan antrean masalah/tenggat dengan penghuni/kamar, alasan, penanggung jawab, dan tindakan yang memang diizinkan.
2. Ringkasan hunian/uang menyebut periode, definisi dan waktu data. Bedakan nol, belum ada data, loading, gagal, dan data usang.
3. Sebelum tindakan berdampak, tampilkan objek, rupiah/status/periode sebelum → sesudah, proses terdampak, serta prasyarat yang belum terpenuhi.
4. Sesudah tindakan, tampilkan hasil aktual dan rujukan transaksi. Kegagalan, hasil belum pasti, atau sebagian proses tertahan tidak ditampilkan sebagai sukses penuh.
5. Detail komponen uang, sumber, riwayat, audit dan penjelasan [IB](product.md#d4d-arah) dibuka bertahap sesuai OWN-DETAIL-WITHOUT-CLUTTER; tidak menghilangkan fungsi penting.

**Batas preview:** frontend mengonsumsi hasil/kontrak backend; tidak membuat rumus atau state machine bisnis kedua. Bila endpoint preview belum ada, tandai kebutuhan kontrak dan implementasikan melalui task terpisah. Perubahan data/permission setelah preview harus ditangani backend saat konfirmasi. Jangan menebak saldo atau menjanjikan hasil dari snapshot usang.

Deskripsi masalah lama [status Fase AO](../audit/status-ao-lintas-portal.md) bukan otomatis pekerjaan terbuka: AO-22 tercatat selesai historis, sementara status sisa lain perlu mengikuti M12 dan bukti yang relevan.

### 6. Acceptance dan pekerjaan berikutnya

Penerapan UI nanti diterima bila OWNER/ADMIN dapat menjelaskan akibat tindakan sebelum konfirmasi, menemukan hasil serta sumber angka sesudahnya, dan menyelesaikan enam alur tanpa menafsirkan sendiri perpindahan status/uang.

Sebelum perubahan aplikasi, task FLOW-CORE-01 perlu melengkapi matriks ini dengan producer/service → API → konsumen UI, nominal/status konkret dari fixture yang diizinkan, bukti kegagalan/retry serta jalur koreksi setiap tindakan. Ketersediaan preview, kewenangan detail, atomisitas dan perilaku koreksi saat ini **UNKNOWN** sampai diperiksa.
Validasi memakai skenario nonpersonal yang disetujui, mencakup jalur normal, prasyarat belum terpenuhi, data berubah, kegagalan, dan role terbatas. Dokumentasi ini tidak menggantikan gate uang M04/M12, verifikasi aplikasi, UAT, atau sign-off produksi.

---

**Digabung dari docs/product/landasan-ib.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh. Penomoran bagiannya **melanjutkan bagian pertama** (§7–§12) supaya tidak ada nomor bagian yang dipakai dua kali dalam satu berkas.

### Landasan IB Diploma Business Management untuk KOST48

Tanggal: 22 September 2026. Status: **landasan produk dan kerangka penerapan; bukan audit kurikulum atau klaim fitur selesai**.
Owner menetapkan IB Diploma Business Management Theory sebagai dasar bisnis kost yang kuat dalam [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md).
Penerapan didahulukan pada operasi penghuni dan keuangan OWNER/ADMIN; [flow utama](product.md#d4d-arah) menjadi penghubung teori dengan pekerjaan sehari-hari. Antrean implementasi tetap [ANTREAN](../ANTREAN.md).

### 7. Dasar dan batas sumber

[IB DP Business Management subject brief, first assessments 2024](https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/business-management-sl-subject-brief-en.pdf) menekankan keputusan bisnis, hubungan fungsi bisnis, dan konsekuensi bagi pemangku kepentingan. Konsep lintas bidangnya mencakup **kreativitas, perubahan, etika, dan keberlanjutan**.
Pemeriksaan terdahulu pada 22 September memakai teks indeks pencarian resmi; pengambilan PDF penuh ditolak HTTP 403. Dokumen ini tidak mengklaim mencakup seluruh silabus atau memvalidasi rumus/modul pembelajaran IB.

Pemetaan berikut merupakan **adaptasi KOST48**. Urutan dan kebutuhan aplikasinya mengikuti masalah owner, data yang tersedia, serta aturan bisnis existing; bukan urutan resmi kurikulum atau kewajiban menambah seluruh alat analisis IB.

### 8. Lima bidang dalam keputusan kost

| Bidang penerapan | Pertanyaan bisnis KOST48 | Data/bukti yang perlu tersedia | Bentuk bantuan aplikasi yang dituju |
|---|---|---|---|
| Keuangan dan akuntansi | Apakah kas cukup untuk kewajiban; siapa belum membayar; biaya apa perlu ditinjau? | Kas aktual, piutang, deposit, pendapatan, biaya, periode dan transaksi asal | Angka terpisah dengan definisi, asal dan periode; rincian kewajiban serta tindakan penagihan |
| Manajemen operasi | Apakah penghuni dapat masuk/keluar dengan benar dan kamar siap digunakan? | Booking, stay, tagihan, meter, checkout, inspeksi, tiket dan waktu kejadian | Enam flow utama dengan prasyarat, status, penanggung jawab dan dampak keputusan |
| Organisasi dan SDM | Siapa boleh memutuskan, mengerjakan, menyetujui dan menindaklanjuti? | Role/permission, penugasan, handoff, audit dan pekerjaan tertunda | Tanggung jawab jelas; OWNER/ADMIN/staf hanya mendapat tindakan sesuai kewenangan |
| Pemasaran | Layanan apa dibutuhkan penghuni dan apa yang mendukung retensi? | Masukan penghuni, keluhan, renewal, alasan keluar dan data pasar bersumber/tanggal | Ringkasan kebutuhan/retensi untuk menilai pilihan layanan; dampak harga/operasi tetap ditelusuri |
| Strategi dan evaluasi | Masalah apa paling bernilai diselesaikan dan apakah keputusan memberi hasil? | Tujuan, baseline, alternatif, biaya/manfaat, asumsi dan hasil setelah tindakan | Catatan keputusan singkat dengan pemilik keputusan, batas kesimpulan dan waktu evaluasi |

### 9. Empat konsep sebagai pemeriksaan keputusan

| Konsep | Pertanyaan penerapan KOST48 |
|---|---|
| Kreativitas | Adakah cara lebih sederhana menyelesaikan kebutuhan owner/penghuni dengan sumber daya yang tersedia? |
| Perubahan | Siapa terdampak, apa prasyaratnya, dan bagaimana proses baru diperkenalkan serta dievaluasi? |
| Etika | Apakah tagihan, deposit, informasi dan perlakuan penghuni dapat dijelaskan secara adil serta sesuai kewenangan? |
| Keberlanjutan | Apakah keputusan menjaga kelangsungan kas, kualitas layanan, pemeliharaan dan penggunaan sumber daya dalam jangka panjang? |

Pertanyaan ini membantu menilai pilihan. Jawabannya tidak menggantikan kebijakan deposit, tarif, kontrak sewa, pengakuan pendapatan, hak akses atau gate yang sudah diputuskan owner.

### 10. Bentuk catatan keputusan

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

### 11. Urutan penerapan produk

1. **Pencatatan dan alur utama:** bedakan kas/piutang/deposit/pendapatan/laba; jelaskan dampak booking, pembayaran, renewal, checkout dan biaya. Validasi definisi serta sumber sebelum merancang indikator.
2. **Ringkasan manajemen:** tampilkan pekerjaan mendesak, kondisi bisnis, serta asal angka/periode yang dapat dibuka; gunakan bahasa operasional pada tampilan utama.
3. **Evaluasi keputusan:** gunakan catatan keputusan dan bukti sebelum/sesudah untuk memilih perbaikan berikutnya.
4. **Analisis lanjutan bila dibutuhkan:** alat seperti SWOT, PESTLE, BCG, Porter atau bauran pemasaran hanya dipilih bila pertanyaan serta data relevan. Narasi lama [flow & kontrak](../domain/publik.md#d4c-flow) bukan bukti semua alat tersedia, tervalidasi, atau cocok untuk kost.

Pengembangan IoT tetap ditunda. Pencatatan meter/utilitas yang diperlukan operasi dan tagihan tetap dijaga. Dashboard tidak perlu menampilkan seluruh teori; penjelasan dan asumsi tersedia saat pengguna membuka detail.

### 12. Batas penerapan dan bukti selesai

- Perhitungan serta mutasi bisnis tetap pada kontrak/service existing; rekomendasi AI tidak langsung memposting jurnal atau mengubah transaksi/status.
- Rasio, proyeksi dan simulasi menyebut periode, input, rumus dan asumsi; tidak disamakan dengan uang tersedia atau transaksi aktual.
- Tidak ada data pasar, ambang rasio, hubungan sebab-akibat atau manfaat finansial yang dianggap fakta tanpa bukti. Nol berbeda dari data belum tersedia.
- Keputusan tarif, DP, deposit, pengakuan pendapatan dan kewenangan tetap mengikuti [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) serta [keuangan](../domain/keuangan.md). Usulan teori tidak otomatis menjadi kebijakan baru.
- Source, UI dan runtime belum diaudit pada penataan dokumentasi ini. Integrasi IB yang sudah benar-benar tersedia, mutu indikator, serta efektivitas bagi owner tetap **UNKNOWN** sampai dibuktikan pada task terkait.

Penerapan dianggap berguna ketika owner dapat menjawab suatu pertanyaan bisnis dengan data yang dapat ditelusuri, memahami alternatif dan batasnya, mengambil keputusan sesuai kewenangan, lalu mengevaluasi hasilnya. Jumlah framework, grafik atau halaman bukan ukuran keberhasilan.


<a id="d4d-orientasi"></a>
## Bagian B — Orientasi produk

Tanggal: 2026-09-23
Status: aktif
Tujuan: orientasi produk — identitas & model bisnis, konsep kunci uang, invarian sistem, stack & model aktif, dan perintah kerja (dari M01)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [PETA-KODE](../PETA-KODE.md) · [scope.md](product.md#d4d-scope) · [flow-utama.md](product.md#d4d-arah)

> Migrasi dari docs/M01_MASTER.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks orientasi tidak diubah.
> Batch B5 memisahkan materi bertanggal M01: status terkini 2026-09-08 → [changelog 2026-09](../arsip/changelog-2026-09.md); riwayat status 30 Juli 2026 → [changelog 2026-07](../arsip/changelog-2026-07.md); indeks dossier historis → [fase-lama](../arsip/fase-lama.md); Audit Lintas Scope 29 Jul 2026 → [audit-lintas-scope-2026-07-29.md](../arsip/audit-lintas-scope-2026-07-29.md).
> **Auto-Ops Engine (asal §4) dipindah ke rumah kanonik aturan operasional:** [domain/operasional.md](../domain/hunian.md#d4c-operasional) (koreksi B5, 23 Sep 2026) — teks tidak diubah; nomor bagian mengikuti asalnya.

### Pintu Masuk Docs Cepat

1. [ANTREAN.md](../ANTREAN.md) — blueprint kerja: antrean aktif, urutan eksekusi, gate verifikasi, invariant, keputusan owner ringkas.
2. [KEPUTUSAN-OWNER.md](../KEPUTUSAN-OWNER.md) — sumber kebenaran keputusan owner sebelum mengubah flow.
3. [PETA-KODE.md](../PETA-KODE.md) — peta modul ke file; pakai ini dulu sebelum grep liar ke seluruh repo.
4. [AUDIT.md](../AUDIT.md) — status audit, temuan bertanggal, dan gate Fase AO (AO-00..AO-23).
5. [ATURAN.md](../ATURAN.md) — aturan domain: keuangan, hunian, operasional, harga, publik, AI/IoT; rincian per topik di `docs/domain/`.
6. [OPERASI.md](../OPERASI.md) — runbook deploy, produksi harian, go-live, env, data master; rincian di `docs/operations/`. Baca ini dulu sebelum menyentuh server.
7. [product/scope.md](product.md#d4d-scope) dan [product/portal-owner-admin.md](product.md#d4d-portal) — scope per role/flow dan prinsip portal ringkas.
8. [AGENTS.md §3 — Peta dokumen](../../AGENTS.md) — indeks navigasi lengkap; peta path lama (M00–M20) ke rumah kanonik ada di [KONTRAK.md §8](../KONTRAK.md).

Hindari membaca arsip besar kecuali benar-benar perlu forensik: `docs/arsip/legacy/*` (arsip legacy; dulu docs/archieve/), `.docs-legacy/**` (sisanya, di luar dokumentasi), berkas `*_STALE.md`, `reference/*`, dan `backend/src/generated/*`.

### 1. Identitas & Model Bisnis

- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP)
- **Lokasi:** Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall/PTC — bukan Ngagel, koreksi D-01)
- **Stack:** NestJS + Prisma + PostgreSQL · React + Vite + React-Bootstrap + TanStack Query + Recharts
- **Role:** OWNER / ADMIN / STAFF / TENANT (tidak ada SUPER_ADMIN/FINANCE)
- **Status deployment terbaru:** UNKNOWN sampai identitas artefak/host diperoleh (M19 §9). Kebijakan go-live pertama: data UAT/testing tidak dimigrasikan. Go-live pertama memakai database produksi BARU/kosong; database UAT tidak di-drop otomatis. Sesudah go-live, gunakan patch migration saja. **1 staf.** Bayar tunai+transfer.
- **Filosofi:** retensi > akuisisi; tenant = pengawas kualitas staf; auto-ops maksimal; laporan keuangan jujur.

---

### 2. Konsep Kunci Uang (WAJIB PAHAM)

> **Sumber kebenaran:** `docs/KEPUTUSAN-OWNER.md` — bila konflik, M02 menang.
> **Ringkasan orientasi, bukan aturan kanonik.** Aturan rinci: harga & surcharge → [domain/harga.md](../domain/keuangan.md#d4c-harga); uang/DP/deposit/invarian pembayaran → [domain/keuangan.md](../domain/keuangan.md); siklus huni → [domain/hunian.md](../domain/hunian.md); operasional & Auto-Ops → [domain/operasional.md](../domain/hunian.md#d4c-operasional).

- **Tidak ada model Booking.** Satu `Stay` = booking→huni→selesai. Promoted = `initialMetersPromotedAt` terisi.
- **DP** (`downPayment*`, hangus) ≠ **Deposit jaminan** (`deposit*`, refundable). Besaran DP, nominal deposit, dan larangan ubah oleh ADMIN **tidak diulang di sini** — lihat [harga.md §7](../domain/keuangan.md#d4c-harga); perlakuan akuntansinya di [keuangan.md](../domain/keuangan.md).
- **NO-PARTIAL menyeluruh.** Nominal bayar harus tepat (DP atau pelunasan penuh). **First-paid-wins**; batas waktu booking (flat) mengikuti [hunian.md § Dossier 11](../domain/hunian.md#dossier-11--booking--renewal-normatif).
- **Tanpa denda keterlambatan.** Notifikasi in-app → PWA push. **AI = tombol manual Owner/Admin saja** (D-23).
- **Sewa per term:** semua term diturunkan dari tarif bulanan memakai tabel multiplikator — angka **tidak diulang di sini**, lihat [harga.md §2](../domain/keuangan.md#d4c-harga) (provenance owner-confirmed 2026-06-24 + `pricing.helper.ts` ikut ke kanonik).
- **Occupant surcharge (D-24):** batas penghuni per ukuran kamar dan tarif per kepala ekstra **tidak diulang di sini** — lihat [harga.md §8](../domain/keuangan.md#d4c-harga).

---
### 5. Invarian Sistem (Tak Boleh Dilanggar)

1. Uang masuk = otomatisasi BERHENTI.
2. Stay promoted tak pernah dibatalkan job; CANCELLED berjurnal reversal blocking.
3. Kamar tak AVAILABLE tanpa tiket CHECKOUT_INSPECTION ditutup.
4. Tiap rupiah = 1 jurnal POSTED + AuditLog; deposit = liability; no-partial.
5. Periode renewal menyambung tanpa gap/overlap; tenant lama prioritas s/d hari-H.
6. Data sensitif (KTP/NIK) minimal + terproteksi + dihapus saat keluar (UU PDP).
7. Reward/benefit selalu berjejak akuntansi (DR/CR sesuai tipe reward).
8. AI tidak langsung mutasi data; output AI = draft/rekomendasi; aksi final = approval manusia.
9. UI tidak memilih antara lengkap atau sederhana: kemampuan tetap lengkap, tetapi detail dibuka bertahap.

---

### 6. Stack & Model Aktif

- **Backend:** NestJS + TypeScript + Prisma 7 + PostgreSQL. Auth JWT Bearer 24jam + Refresh Token (httpOnly cookie sejak M17). CORS + rate-limit in-memory. 46 modul.
- **Frontend:** React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- **DB:** `kost48_v3_pro` (UAT, port 5433). Produksi pertama memakai database baru yang ditetapkan owner (mis. `kost48_prod`), bukan asumsi/reuse database lama `kost48_v3`.
- **62 Prisma model (74 enum; hitungan schema lokal 6 Sep 2026, daftar berikut navigasi):** `User`, `Tenant`, `Room`, `RoomFacility`, `Stay`, `TenantDepositLedgerEntry`, `MeterReading`, `IotDevice`, `IotIngestMessage`, `IotTelemetry`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `PasswordResetToken`, `PaymentSubmission`, `Ticket`, `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffWorkAudit`, `StaffPerformanceEvent`, `StaffReview`, `Announcement`, `InventoryItem`, `RoomItem`, `InventoryMovement`, `StaffFieldReport`, `RenewRequest`, `CheckoutRequest`, `WifiSale`, `Expense`, `FixedAsset`, `AssetDepreciationRun`, `AssetDepreciationLine`, `AppNotification`, `PushSubscription`, `AuditLog`, `AiDraft`, `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `OpeningBalanceBatch`, `OpeningBalanceLine`, `JournalEntry`, `JournalLine`, `RentRecognitionSchedule`, `RoomTransfer`, `LoyaltyPoint`, `LoyaltyReward`, `Redemption`, `PeerBehaviorReport`, `TenantReferral`, `Faq`, `OperationalSetting`, `AdditionalService`, `ServiceInterest`, `SatisfactionSurvey`, `MarketAnalysis`, `GuestPreferenceSurvey`, `ExternalReview`, `RefreshToken`.

---

### 7. Perintah Kerja

```bash
# Backend
cd backend
npx tsc --noEmit          # type check
npm run start:dev         # API http://localhost:3000/api
node --test "test/**/*.test.js"  # unit test

# Frontend
cd frontend
npm run build             # build + tsc
npm run dev               # dev server

# DB UAT (port 5433, jangan prod 5432)
node scripts/seed-dev-reset.js && node scripts/seed-dev-via-api.js
```

**Akun dev & perintah seed:** kanonik di [operations/default-dev.md](../operations/default-dev.md) — daftar akun tidak diulang di sini (dedup D-04, koreksi B5, 23 Sep 2026).


<a id="d4d-portal"></a>
## Bagian C — Portal OWNER/ADMIN

Tanggal: 2026-09-23
Status: aktif (rancangan + status implementasi)
Tujuan: rancangan portal ringkas Owner/Admin — prinsip desain, peran, flow OWNER, flow ADMIN, halaman pendukung, kriteria selesai, rencana, dan status implementasi (dari M17)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [scope.md](product.md#d4d-scope) · [flow-utama.md](product.md#d4d-arah)

> Migrasi dari docs/M17_PORTAL_FLOW_RINGKAS.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks rancangan tidak diubah.
> Batch B5 memindahkan **seluruh isi M17 apa adanya** (L6–L213) ke file ini; empat `[x]` status implementasi ikut apa adanya dan berada di luar domain invariant (STATUS.md + docs/history).

Status: SELESAI — Iterasi 1–4 tuntas.
Tujuan: menyederhanakan portal Owner/Admin dari "daftar fitur" menjadi "daftar kerja harian".

---

### 1. Prinsip desain

1. **Dashboard adalah daftar tugas, bukan kumpulan widget.**
   - Setiap kartu harus menjawab: apa yang terjadi, apa yang harus saya lakukan, satu tombol ke layar aksi.
2. **Satu layar, satu tujuan.**
   - Layar aksi tidak boleh menampung banyak fitur sekaligus.
3. **Alur input sesingkat mungkin.**
   - Admin tidak perlu paham struktur menu; cukup klik kartu tugas.
4. **Fitur lanjutan tetap ada, tapi tidak mengganggu.**
   - Masuk ke grup "Lainnya"/mode Lengkap, tidak dihapus.

---

### 2. Peran dan tujuan harian

| Peran | Tujuan saat buka portal |
|-------|-------------------------|
| OWNER | "Bisnis saya sehat atau tidak? Apa yang perlu saya putuskan hari ini?" |
| ADMIN | "Pekerjaan apa yang menunggu hari ini? Kerjakan satu per satu sampai bersih." |
| STAFF | Tidak berubah: "Checklist hari ini, kerjakan tugas, kirim bukti." |
| TENANT | Tidak berubah: "Lihat tagihan, bayar, lapor masalah." |

---

### 3. Flow OWNER

#### Layar 1: Kokpit Owner (harian/mingguan)

Tampilan ringkas:

```
┌────────────────────────────────────────────────────┐
│ Dashboard Owner — Oktober 2026                    │
│ Kondisi: Sehat / Perhatian / Risiko               │
├──────────┬──────────┬──────────┬──────────────────┤
│ Pendapatan│ Laba Bersih│ Okupansi │ Kas Bersih       │
├────────────────────────────────────────────────────┤
│ BUTUH PERHATIAN                                   │
│ • 3 tagihan overdue           [Lihat Tagihan]     │
│ • 2 bukti bayar pending       [Verifikasi]        │
│ • 1 kamar kosong > 30 hari    [Lihat Kamar]       │
└────────────────────────────────────────────────────┘
```

| Input | Aksi | Output / Selesai |
|-------|------|------------------|
| Pilih periode (bulan/tahun) | Tidak wajib; default bulan berjalan | KPI berubah sesuai periode |
| Klik kartu "Butuh perhatian" | Buka layar aksi terfilter | Item selesai hilang dari daftar |
| Klik "Lihat Tagihan" | Buka `/invoices?status=OVERDUE` | Daftar tagihan overdue saja |

Aturan:
- Grafik tren, AI, IoT, dsb. **tidak tampil di mode ringkas**.
- Sinyal prioritas dihitung dari data yang sama, tetapi labelnya bahasa manusia.

#### Layar 2: Laporan Bisnis (akhir bulan)

Alur tetap:
`/reports` → pilih jenis laporan → pilih periode → lihat angka → ekspor jika perlu.

| Input | Aksi | Output |
|-------|------|--------|
| Pilih jenis: Laba Rugi / Arus Kas / Neraca / Operasional | Klik tab | Laporan sesuai jenis |
| Pilih periode | Dropdown bulan/tahun | Angka periode terpilih |

#### Layar 3: Pengaturan (jarang)

Hanya dibuka saat:
- pertama kali setup,
- ganti tarif/listrik/air,
- tambah akun user.

Tidak perlu diubah pada iterasi ini.

---

### 4. Flow ADMIN (alur harian)

#### Layar 1: Dashboard "Hari Ini"

Tampilan yang diharapkan:

```
┌────────────────────────────────────────────────────┐
│ Dashboard Admin — Hari Ini                         │
│ Urutan kerja: 0 KTP · 1 Booking · 2 Bayar ·        │
│               3 Perpanjangan · 4 Keluar · 5 Blocker│
├────────────────────────────────────────────────────┤
│ 0. Verifikasi KTP (2)      [Periksa]               │
│ 1. Review booking (3)      [Review]                │
│ 2. Verifikasi bayar (1)    [Verifikasi]            │
│ 3. Catat meter renew (2)   [Catat Meter]           │
│ 4. Review keluar (1)       [Review]                │
│ 5. Blocker: 1 overdue, 1 stok menipis [Lihat]      │
└────────────────────────────────────────────────────┘
```

Prinsip:
- Kartu hanya muncul bila ada pekerjaan. Jika kosong, tampil "Semua aman".
- Urutan tetap 0 → 5, tidak boleh acak.
- Setiap kartu **satu tombol utama**. Detail sekunder bisa diakses lewat klik baris.

#### Alur per tugas

##### 0. Verifikasi KTP
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Periksa" |
| 2 | Data Penghuni terfilter `ktpStatus=PENDING_REVIEW` | Lihat foto + hasil OCR | Klik "Setujui" atau "Tolak" |
| 3 | Modal konfirmasi | Alasan (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

##### 1. Review booking
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Review" |
| 2 | Detail Stay | Cek kamar, durasi, harga | Klik "Approve" atau "Tolak" |
| 3 | Modal keputusan | Alasan tolak (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang / pindah ke "menunggu bayar" |

##### 2. Verifikasi pembayaran
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Verifikasi" |
| 2 | Review Bukti Bayar terfilter `PENDING_REVIEW` | Cek nominal, tanggal, bukti | Klik "Approve" / "Tolak" |
| 3 | Modal keputusan | Catatan (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

##### 3. Catat meter perpanjangan
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Catat Meter" |
| 2 | Daftar perpanjangan `PENDING` | Pilih tenant | Klik "Catat Meter" |
| 3 | Form meter | Angka kWh akhir, m³ akhir | Simpan |
| 4 | Ringkasan tagihan perpanjangan | Cek total | Klik "Approve" |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

##### 4. Review checkout
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Review" |
| 2 | Daftar checkout `PENDING` | Cek tagihan lunas, deposit | Klik "Setujui" / "Tolak" |
| 3 | Modal keputusan | Catatan | Simpan |
| 4 | Final checkout (jika disetujui) | Cek meter akhir, denda, deposit | Klik "Finalkan" |
| Selesai | Kembali ke Dashboard | — | Kamar kembali AVAILABLE |

##### 5. Blocker operasional
| Jenis | Kartu | Layar tujuan | Aksi utama |
|-------|-------|--------------|------------|
| Tagihan overdue | "3 tagihan overdue" | `/invoices?status=OVERDUE` | Lihat tagihan |
| Tiket menunggu admin | "2 tiket perlu cek" | `/tickets?status=DONE` | Cek tiket |
| Stok menipis | "1 stok menipis" | `/inventory/gudang?status=LOW_STOCK` | Cek stok |
| Kamar bermasalah | "1 kamar gap fasilitas" | `/rooms?status=MAINTENANCE` | Cek kamar |

---

### 5. Halaman pendukung (bukan alur utama)

Halaman berikut tetap ada, tetapi tidak ditampilkan sebagai prioritas:
- Kamar & Stok
- Masa Sewa & Penghuni
- Keuangan (daftar lengkap)
- Staff & Tiket
- Pengumuman
- IoT, AC, Preferensi Tamu, Survei, Loyalitas, Bantu Penghuni (grup "Lainnya")

---

### 6. Perubahan layar yang dibutuhkan

| Area | Perubahan | Risiko |
|------|-----------|--------|
| DashboardAdmin | Ubah dari 3 area kerja + chart menjadi 1 daftar tugas 0–5 | Sedang |
| Kartu antrean | Satu tombol utama per kartu; label aksi bahasa manusia | Rendah |
| Filter tujuan | Pastikan route tujuan menerima query param (`status`, `ktpStatus`, `tab`) | Rendah |
| OwnerDashboard | Hapus panel non-prioritas dari mode ringkas; fokus KPI + prioritas | Rendah |
| Navigation | Sudah dirapikan; tinggal menyesuaikan label bila perlu | Rendah |
| Backend | Tidak perlu perubahan besar; query param filter mungkin perlu dilengkapi | Rendah-Sedang |

---

### 7. Kriteria selesai

1. Owner membuka Kokpit dan dalam 5 detik tahu kondisi bisnis + apa yang perlu diputuskan.
2. Admin membuka Dashboard dan melihat urutan kerja 0–5; bisa menyelesaikan satu tugas tanpa mencari menu.
3. Setiap kartu tugas memiliki tepat satu tombol utama.
4. Tidak ada fitur yang hilang; fitur lanjutan tetap dapat diakses dari "Lainnya".
5. Mode "Lengkap" tetap tersedia untuk pengguna yang sudah terbiasa.

---

### 8. Rencana implementasi

1. **Iterasi 1**: DashboardAdmin menjadi daftar tugas berurutan (ganti area tabs).
2. **Iterasi 2**: Kartu tugas dengan tombol utama + route terfilter.
3. **Iterasi 3**: OwnerDashboard ringkas (KPI + prioritas) sesuai rancangan.
4. **Iterasi 4**: Uji flow end-to-end (booking → bayar → perpanjangan → checkout) dan cleanup widget lama.

### 9. Status implementasi

- [x] **Iterasi 1** — DashboardAdmin jadi daftar tugas harian berurutan 0–5 (`AdminWorkLaneCards`). Mode ringkas default; mode Lengkap (toggle ⊕) tetap menampilkan workspace/chart lama. Blocker step 5 kini mencakup gap fasilitas.
- [x] **Iterasi 2** — Kartu tugas + route terfilter (query param `status`/`ktpStatus`) dipastikan di semua halaman tujuan. `StaysPage` sudah membaca `status` (BOOKINGS/CHECKOUT); `SimpleCrudPage` memetakan `/rooms?status=MAINTENANCE`, `/inventory/gudang?status=LOW_STOCK`, dan `/tenants?ktpStatus=PENDING_REVIEW` ke filter resource (filter `KTP_REVIEW` baru untuk tenant); `TicketsPage` membaca `status=DONE`; `InvoicesPage` membaca `status=OVERDUE`; `RenewRequestsAdminPage` membaca `status=PENDING` (opsi filter `Perlu Meter` baru, kartu tugas kini mengarah ke `/renew-requests?status=PENDING`); `PaymentReviewPage` tetap default `PENDING_REVIEW`. Tanpa perubahan backend.
- [x] **Iterasi 3** — OwnerDashboard ringkas (KPI + prioritas) sesuai rancangan. Default mode `compact` (bukan responsif), period picker disembunyikan saat ringkas, panel prioritas melebar penuh, AI panel & tren chart hanya di mode Lengkap. Sinyal prioritas kini punya CTA eksplisit (`Lihat Tagihan` → `/invoices?status=OVERDUE`, `Verifikasi` → `/payment-submissions/review`, `Lihat Tagihan` → `/invoices?status=BILLING`, `Lihat Kamar` → `/rooms?status=AVAILABLE`) plus sinyal baru kamar kosong via query `/rooms` klien; label sinyal dibuat manusiawi (`Bukti bayar pending`, dsb.). `SimpleCrudPage` juga diperluas membaca `status=AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE` untuk `/rooms`.
- [x] **Iterasi 4** — Uji flow end-to-end (booking → bayar → perpanjangan → checkout) di UAT via API + Playwright. Booking online yang kamarnya masih `AVAILABLE` kini muncul di antrean admin (predikat booking diperbaiki: tidak lagi menuntut `RESERVED` sebelum bayar). Rute CTA perpanjangan dikoreksi dari `status=PENDING` (selalu kosong) menjadi dinamis per state: `DP_SECURED` → Catat Meter, `AWAITING_DP` → Konfirmasi DP, `PENDING_DECISION` → Lihat. Backend: renewal dengan pemakaian 0 kWh (jatah gratis penuh) tidak lagi membuat `InvoiceLine` qty=0 yang melanggar `invoice_line_non_negative_chk`. Widget lama Visual Dashboard (GaugeChart, ActivityRing, SnippetCard, ComplicationGrid, RatingDisplay) dihapus dari DashboardAdmin + file komponennya dibersihkan. Test: FE vitest 135/135 ✅, BE 74/74 ✅, build FE ✅, build BE ✅.

---

### 10. Lapisan Keputusan AI — arah 25 Sep 2026 (rancangan, BELUM diimplementasikan)

Latar: arahan owner 25 Sep 2026 — *"manfaatkan API AI untuk membuat simpel semua data; keputusan, kondisi, dan rekomendasi cukup diklik atau dicek ke lokasi tautan yang sudah direkomendasikan AI; tidak perlu semua ditampilkan di halaman"*. Arah ini melanjutkan PROD-SIMPLE/UX-OWNER-ADMIN (22 Sep) dan menggeser titik berat dari **menata tampilan** menjadi **AI yang menyusun alur**.

#### 10.1 Prinsip

1. **Halaman utama adalah hasil pemikiran, bukan tumpahan data.** Yang tampil 3–5 kartu keputusan, bukan tabel dan grafik sekaligus.
2. **AI menyusun, manusia memutuskan.** AI tidak pernah menulis data; setiap kartu berakhir di tautan terfilter atau di wizard dengan approve manusia (sejalan dengan [domain/ai.md](../domain/ai.md) pola aman dan [scope.md](product.md#d4d-scope) §B8).
3. **Angka pada kartu tidak boleh dikarang AI.** Semua angka berasal dari *fact pack* yang dihitung kode deterministik; AI hanya memilih, menamai sebab, dan menyusun urutan.
4. **AI mati ≠ aplikasi mati.** Wajib ada fallback rule-based dengan bentuk kartu yang sama.
5. **Tiga lapis tampilan:** `Brief` (default, kartu keputusan) · `Kerja` (papan alur/wizard untuk eksekusi) · `Data` (semua halaman lama — tetap ada, tapi tidak lagi dipromosikan sebagai navigasi utama).

#### 10.2 Kontrak kartu keputusan — **pakai ulang, bukan bikin baru**

Recon 25 Sep 2026 menemukan bentuk kartu yang dibutuhkan **sudah ada** di aplikasi: `ActionQueueItem` (`frontend/src/components/command-center/ActionQueueTable.tsx`), dipakai antrean kerja ADMIN dan sudah punya renderer + eksekutor deep-link (`openActionTarget()`) serta peringkat prioritas. Karena itu kontrak baru **tidak** dibuat; kartu keputusan = `ActionQueueItem` + 5 field tambahan.

Sudah tersedia di `ActionQueueItem`:

| Field | Isi | Dipakai untuk |
|---|---|---|
| `priority` | BLOCKER/HIGH/MEDIUM/WARNING/OPPORTUNITY/INFO/SUCCESS | urutan & warna kartu |
| `type`, `subject`, `issue` | judul, objek, masalah | judul + 2–3 fakta kartu |
| `recommendedAction` | satu tindakan konkret | label tombol utama |
| `actionTo` | tujuan deep-link (`navigate` bila internal) | **"tinggal klik"** |
| `ruleId`, `entityType`, `entityId`, `dedupKey` | identitas & dedupe (`frontend/src/utils/commandCenterDedup.ts` — `getCommandDedupKey`/`dedupeCommandItems`) | mencegah kartu AI ganda dengan kartu rule |
| `deadlineLabel`, `timeStatusLabel`, `timeStatusTone` | tenggat & status waktu | kesegaran kartu |

Field yang masih perlu ditambahkan (belum ada di tipe mana pun):

| Field baru | Isi | Alasan |
|---|---|---|
| `sebab` | mengapa ini terjadi (boleh dari AI) | jawaban "kenapa" tanpa membuka halaman |
| `dampak` | apa yang berubah bila dilakukan/diabaikan | kaitan keputusan ↔ uang/okupansi (IB) |
| `sourceRefs[]` | snapshot/endpoint asal angka | menjawab "dari mana angkanya" |
| `expiresAt` | masa berlaku kartu | mencegah kartu basi tampil sebagai fakta |
| `fallback` | true bila hasil rule-based, bukan AI | transparansi & pengukuran pasca-AI |

**Batas keamanan yang wajib menyertai kontrak ini:** keluaran AI saat ini memuat `route` berupa **string bebas** dan UI belum memvalidasinya sebelum `navigate` (temuan A-1 di [audit AI 25 Sep](../arsip/ai-agenda-recon-2026-09-25.md)). Kartu AI **tidak boleh** menavigasi ke string dari LLM. Rute harus dipetakan lewat allowlist deterministik (pola fungsi `ownerSignalRoute` di `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`) sebelum dipakai.

#### 10.3 Alur produksi kartu (pipeline)

```
1. Collector (kode)      agregat dari endpoint yang sudah ada → fact pack per domain
2. Rule engine (kode)    kondisi objektif + angka pasti + severity awal (kandidat kartu)
3. AI synthesizer        pilih 3–5 yang krusial, tulis sebab/rekomendasi/dampak, urutkan
4. Grounding validator   tolak angka/tautan yang tidak ada di fact pack → jatuh ke fallback
5. Cache                 hasil disimpan per (role, periode, snapshotHash); halaman hanya membaca
6. Aksi manusia          deep link terfilter / wizard / approve; AuditLog mencatat kartu yang dipakai
```

Langkah 1, 2, 4, dan 5 adalah kode deterministik dan **tidak memakai token**. AI hanya di langkah 3.

#### 10.4 Bentuk per role

| Role | Kernel | Sumber kartu | AI? |
|---|---|---|---|
| OWNER | **Decision Deck** — 3–5 kartu keputusan + 1 skor kesehatan & 3 penyebabnya | `extraSignals` + KPI + readiness + meter | ya (sebab, prioritas, dampak) |
| ADMIN | **Papan Shift** — alur bernomor 0–5 + satu aksi berikutnya per ruang | `adminWorkLanes` + `queueItems` | ya (sebab, urutan) |
| STAFF | **Kartu tugas satu per layar** (mode Fokus, bukti foto, auto-lanjut) | checklist & tiket hari ini | tidak — deterministik (hemat biaya) |
| TENANT | **Satu kartu "langkah berikutnya"** + tombol WhatsApp | tagihan, hunian, tiket | tidak — deterministik |

Aturan hemat: AI hanya dipakai di tempat yang benar-benar butuh penalaran (OWNER, ADMIN). STAFF dan TENANT memakai kartu deterministik; AI tidak dibakar untuk pekerjaan yang sudah jelas urutannya.

#### 10.5 Biaya, privasi, dan kegagalan

- Agenda dihitung **per (role, periode)**, bukan per pembukaan halaman → biaya tetap, tidak tumbuh mengikuti jumlah tampilan.
- Snapshot tetap berupa agregat tanpa PII (tanpa NIK, foto KTP, email, alamat) sesuai [domain/ai.md](../domain/ai.md) §Aturan Snapshot.
- `AI_DAILY_REQUEST_LIMIT` / budget guard yang berlaku tetap dipakai; `usage` tetap ditampilkan kecil bila tersedia.
- Kuota habis, key belum diisi, atau provider gagal → tampil kartu fallback deterministik **tanpa pesan galat** ke pengguna.

#### 10.6 Benturan aturan — **SELESAI** (diputuskan owner 25 Sep 2026)

Dua aturan kanonik berbenturan dengan pengalaman yang diminta:

| Aturan berlaku | Bunyi | Benturan |
|---|---|---|
| [domain/ai.md](../domain/ai.md) §Pola Terlarang | "AI berjalan otomatis saat dashboard dibuka" | Agenda yang sudah siap saat owner membuka Kokpit tampak seperti pelanggaran huruf aturan |
| [scope.md](product.md#d4d-scope) §B8 | "AI FLOW (Tombol Manual Owner/Admin → Draft → Approve → Audit)" | Alur kanonik mengandaikan tombol manual ditekan lebih dulu |

**Resolusi yang ditetapkan owner (entri "2026-09-25 — Dua mode", `CEPAT-AI-JADWAL`):** agenda AI dihitung **terjadwal 1× sehari** lalu disimpan, dan **halaman hanya membaca**. Membuka halaman tidak pernah memanggil AI, sehingga tidak ada biaya per tampilan dan tidak ada tulisan otomatis — dua larangan yang relevan tetap utuh, termasuk UAT Fase G item 1. Tombol "Perbarui agenda" tetap ada di luar jadwal. Rumah simpanannya memakai antrean draft `AiDraft` (G9) yang sudah ada.

Keputusan lanjutan yang menyertainya: AI **hanya untuk OWNER**; biaya ditampilkan hanya ke OWNER dengan target ≤ Rp 50.000/bulan; dan AI mati tidak boleh mengosongkan halaman. Rincian perilaku: [mode-cepat.md](../arsip/mode-cepat.md) §5–§6.

Konsekuensi yang sudah diputuskan:

- Agenda dihitung **terjadwal**, halaman **membaca**. Rumah simpanan: `AiDraft` (G9; `backend/src/modules/owner-ai/ai-draft.service.ts` + `ai-draft.controller.ts`) dengan status `DRAFT → APPLIED/REJECTED/EXPIRED` dan retensi 60 hari — **tanpa schema baru**.
- **Ketergantungan yang belum terbukti:** pemicu terjadwal di produksi (cron AutoOps masih terbuka di [ANTREAN](../ANTREAN.md) §3). Sampai terbukti, jalur tombol manual yang dipakai — dan itu tidak menghambat, karena kartu aturan tidak bergantung pada AI.

#### 10.7 Kriteria selesai

1. OWNER dapat menyebut 3 keputusan bulan ini dalam < 60 detik tanpa membuka menu.
2. ADMIN dapat menyelesaikan satu tugas langsung dari kartu, tanpa mencari menu.
3. Setiap kartu punya tepat satu aksi primer + tautan "kenapa" (lihat `facts`/`sourceRefs`).
4. Dengan AI dimatikan atau kuota habis, halaman tetap menampilkan kartu (fallback) dan tidak menampilkan galat.
5. Tidak ada angka pada kartu yang tidak dapat ditelusuri ke fact pack.
6. Navigasi menyusut menjadi 3–4 pintu utama; route lama tetap terjangkau lewat pencarian dan tautan kartu.

### 11. Arahan kerja lanjutan (checklist ada di STATUS)

Rancangan di §10 dipotong menjadi task bernomor agar dapat dieksekusi satu per satu. **Antrean resmi tetap [ANTREAN](../ANTREAN.md)** — daftar berikut hanya ringkasan arah:

| ID | Pekerjaan | Prasyarat |
|---|---|---|
| `AIDL-01` | Kontrak kartu (`ActionQueueItem` + `sebab`/`dampak`/`sourceRefs`/`expiresAt`/`fallback`) + mesin kartu **aturan** lintas role, termasuk fallback | tidak ada |
| `AIDL-02` | Shell Mode Cepat `/cepat` + percabangan login + saklar header + pemetaan saklar lama | `AIDL-01` |
| `AIDL-03` | Allowlist rute + tautan rekomendasi AI yang bisa diklik (OWNER) | `AIDL-02` |
| `AIDL-04` | Agenda AI terjadwal 1×/hari + strip biaya/kuota | `AIDL-03` + `AI-USAGE-01` + pemicu terjadwal terbukti |
| `AIDL-05` | Kirim ringkasan WhatsApp + cetak (OWNER/ADMIN) | `AIDL-02` |
| `AIDL-06` | Tinjau adopsi 30 hari | `AIDL-02` dirilis dan dipakai |
| `AI-USAGE-01` | Catat usage token + konstanta harga (menutup temuan A-5/A-6) | tidak ada |

Urutan ini menaruh **mesin kartu aturan lebih dulu**: ia melayani ADMIN, STAFF, dan TENANT sepenuhnya serta menjadi jalur fallback OWNER — sehingga penyederhanaan sudah terasa **tanpa satu rupiah token pun**. AI (`AIDL-03`/`AIDL-04`) hanya menambah kualitas sebab dan prioritas di atasnya.

**Perubahan dari rancangan 25 Sep sebelumnya (setelah keputusan "Dua mode"):** item lama `AIDL-01` (menampilkan `route` AI) bergeser menjadi `AIDL-03`; item lama `AIDL-05` (penyederhanaan navigasi halaman Normal) **dibatalkan** — digantikan oleh Mode Cepat; dan urutan `AIDL-02`/`AIDL-03` bertukar karena mesin kartu aturan kini menjadi fondasi, bukan tahap sementara. Rincian permukaan dua-mode: [mode-cepat.md](../arsip/mode-cepat.md).


<a id="d4d-scope"></a>
## Bagian D — Scope produk

Tanggal: 2026-09-23
Status: aktif
Tujuan: navigasi berbasis ROLE pengguna dan FLOW bisnis — scope PUBLIC/TENANT/STAFF/ADMIN/OWNER/SYSTEM, sembilan flow bisnis, quick reference "Mau X? Buka Y", dan alur kerja ideal (dari M10)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [PETA-KODE](../PETA-KODE.md) · [orientasi.md](product.md#d4d-orientasi)

> Migrasi dari docs/M10_PETA_SCOPE.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks peta scope tidak diubah.
> Batch B5 memindahkan **seluruh isi M10 apa adanya** (L6–L295) ke file ini; nomor & urutan bagian sama seperti aslinya. Peta modul/file kode ada di [PETA-KODE.md](../PETA-KODE.md).

> **Tujuan:** lompat ke file yang tepat berdasarkan ROLE pengguna atau FLOW bisnis. Dipakai bersama `docs/PETA-KODE.md` (navigasi modul) dan `docs/ANTREAN.md` (antrian task).

---

### A. Scope Berdasarkan Role

#### A1. PUBLIC (Calon Tenant — tanpa login)
**Apa yang dilihat/dilakukan:** landing page, katalog kamar + detail, FAQ, ulasan, form booking (KTP + DP 30%), halaman sukses booking.

| Layer | File | Catatan |
|-------|------|---------|
| FE shared | `frontend/src/pages/public/publicGuestShared.tsx` | Topbar, Footer, RoomPreviewCard, utilitas format — dipakai semua halaman publik |
| FE landing | `frontend/src/pages/public/PublicGuestDashboardPage.tsx` | Home page publik (hero, galeri, fasilitas, FAQ singkat, CTA) |
| FE katalog | `frontend/src/pages/rooms/PublicRoomsPage.tsx` | Daftar kamar + filter; `RoomsRouteEntry.tsx` = router entry |
| FE detail | `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` | Detail kamar + foto lightbox + tombol booking |
| FE booking | `frontend/src/pages/bookings/GuestBookingPage.tsx` | Shell halaman booking tamu |
| FE booking | `frontend/src/pages/bookings/GuestBookingForm.tsx` | Form isi data KTP + jadwal masuk |
| FE booking | `frontend/src/pages/bookings/GuestBookingSuccess.tsx` | Konfirmasi sukses + instruksi transfer DP |
| FE booking | `frontend/src/pages/bookings/guestBookingUtils.ts` | Helper kalkulasi harga + validasi form |
| FE FAQ | `frontend/src/pages/public/FaqPublicPage.tsx` | Halaman FAQ lengkap |
| FE ulasan | `frontend/src/pages/public/ReviewsPublicPage.tsx` | Ulasan tamu publik |
| BE service | `backend/src/modules/tenant-bookings/public-bookings.service.ts` | Buat booking publik + expiry 3 jam |
| BE controller | `backend/src/modules/tenant-bookings/public-bookings.controller.ts` | Endpoint POST booking + GET rooms (no-auth) |
| BE helper | `backend/src/modules/tenant-bookings/pricing.helper.ts` | Hitung DP 30% + biaya lain |
| BE katalog | `backend/src/modules/marketing/marketing-public-rooms.service.ts` | Query kamar publik + foto |
| BE FAQ | `backend/src/modules/faqs/faqs.service.ts` | FAQ publik |
| Docs | `domain/hunian.md` · `domain/publik.md` | |

#### A2. TENANT (Penghuni — login role TENANT)
**Apa yang dilihat/dilakukan:** MyStay (status kamar), invoice & bayar, meter reading, loyalty points, referral, permintaan renew/checkout, review staf, survei.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/portal/` | Area tenant (MyStay, invoice, loyalty, manual) |
| FE pages | `frontend/src/pages/stays/` | Detail stay tenant |
| FE pages | `frontend/src/pages/invoices/` · `payments/` | Invoice + bukti bayar |
| FE pages | `frontend/src/pages/loyalty/` | Poin, reward, referral |
| FE pages | `frontend/src/pages/renew-requests/` | Form renew |
| BE module | `backend/src/modules/stays/` (service + query) | Lifecycle stay |
| BE module | `backend/src/modules/invoices/invoices.service.ts` | Invoice tenant |
| BE module | `backend/src/modules/payment-submissions/` | Upload bukti bayar |
| BE module | `backend/src/modules/meter-readings/` | Lihat meter |
| BE module | `backend/src/modules/renew-requests/` | Request perpanjang |
| BE module | `backend/src/modules/checkout-requests/` | Request checkout |
| BE module | `backend/src/modules/loyalty/` | Poin + reward + referral |
| BE module | `backend/src/modules/surveys/` | Survei kepuasan |
| BE module | `backend/src/modules/tenant-staff-reviews/` | Review staf |
| Docs | `domain/hunian.md` · `domain/keuangan.md` | |

#### A3. STAFF (Karyawan — login role STAFF)
**Apa yang dilihat/dilakukan:** tiket (keluhan/perbaikan/inspeksi), rutinitas harian, laporan lapangan, meter reading, inventory movement, WiFi order.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/tickets/` | List + detail tiket |
| FE pages | `frontend/src/pages/staff/` | Rutinitas staf |
| FE pages | `frontend/src/pages/staff-routines/` | Template + assignment |
| FE pages | `frontend/src/pages/services/` | WiFi + layanan tambahan |
| BE module | `backend/src/modules/tickets/tickets.service.ts` | CRUD tiket + inspeksi |
| BE module | `backend/src/modules/staff-routines/` | Rutinitas staf |
| BE module | `backend/src/modules/staff-field-reports/` | Laporan lapangan |
| BE module | `backend/src/modules/staff-performance/` | KPI + event |
| BE module | `backend/src/modules/meter-readings/` | Input meter |
| BE module | `backend/src/modules/inventory-items/` · `inventory-movements/` | Stok + mutasi |
| BE module | `backend/src/modules/room-items/` | Barang per kamar |
| BE module | `backend/src/modules/wifi-sales/` | Order WiFi |
| Docs | `domain/operasional.md` | |

#### A4. ADMIN (Pengelola — login role ADMIN)
**Apa yang dilihat/dilakukan:** dashboard admin, approve booking/payment/renewal, kelola kamar & tenant, invoice & expense, laporan, staf, inventaris, pengumuman, FAQ, settings.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/dashboard/DashboardAdmin.tsx` | Command center |
| FE pages | `frontend/src/pages/admin/` | CRUD generik (ConfiguredResourcePage) |
| FE pages | `frontend/src/pages/resources/` | CRUD resource |
| FE pages | `frontend/src/pages/finance/` | Accounting setup |
| FE pages | `frontend/src/pages/reports/` | Laporan |
| BE module | **Semua modul kecuali owner-ai** | Admin = full access |
| Docs | `domain/keuangan.md` · `domain/hunian.md` · `domain/operasional.md` | |

#### A5. OWNER (Pemilik — login role OWNER)
**Apa yang dilihat/dilakukan:** dashboard owner (KPI), laporan keuangan, AI assistant (brief/finance/payment review/ops/inventory), settings sistem, semua akses admin.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` | Kokpit owner KPI+chart+AI |
| FE pages | `frontend/src/pages/dashboard/AdminWorkspaces.tsx` | Tabel workspace |
| FE components | `frontend/src/components/ai/` | Tombol AI (DeepSeek) |
| FE components | `frontend/src/components/layout/AppLayout.tsx` | Owner view mode toggle |
| BE module | `backend/src/modules/owner-ai/` | AI brief, finance, payment, ops, inventory |
| BE module | `backend/src/modules/settings/settings.service.ts` | OperationalSetting |
| BE module | `backend/src/modules/accounting/` | Laporan + tutup buku |
| BE module | `backend/src/modules/market-analysis/` | Analisa pasar AI |
| Docs | `domain/keuangan.md` · `domain/ai.md` · `KEPUTUSAN-OWNER.md` | Sumber kebenaran |

#### A6. SYSTEM / IoT (Device — tanpa login, cron)
**Apa yang dilihat/dilakukan:** ESP32-C3 kirim water flow reading dan backend polling Tuya KWH meter via cron untuk observability owner/admin/tenant. Deteksi kebocoran/anomali dan aksi otomatis belum diaktifkan; telemetri tidak boleh membuat invoice otomatis.

| Layer | File | Catatan |
|-------|------|---------|
| BE module | `backend/src/modules/iot/` | IoT controller, Tuya client/polling, registry credential ESP32, water ingest, dan pembaruan tenant terikat (sudah dibuat) |
| BE cron | `backend/src/modules/iot/iot-polling.service.ts` | Kemampuan polling/cron ada di kode; profil shared hosting memakai on-demand dan timer OFF, tanpa cron Tuya (M08/M19) |
| BE model | `backend/prisma/schema.prisma` | `IotDevice`, `IotIngestMessage`, `IotTelemetry`; telemetry dipisahkan dari `MeterReading` billing |
| FE tenant | `frontend/src/pages/portal/EnergyPage.tsx` | Timeline konsumsi dan quota berdasarkan periode sewa lunas; hanya estimasi/monitoring |
| Docs | `M14_IOT_TUYA_DEVICES.md` · `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` | Inventaris perangkat Tuya, rollout, dan spek implementasi |

---

### B. Scope Berdasarkan Flow Bisnis

#### B1. BOOKING FLOW (Calon Tenant → DP → Approve → Stay)
```
PublicBookingForm → PaymentSubmission (DP 30%) → Admin approve → Stay (promoted)
                        ↓ (expiry 3 jam)
                      DP hangus (BookingSweep)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `tenant-bookings/public-bookings.service.ts` | Booking publik |
| BE | `tenant-bookings/tenant-bookings.service.ts` | Booking oleh tenant existing |
| BE | `payment-submissions/payment-submissions.service.ts` | Submit bukti DP |
| BE | `stays/stays.service.ts` | Promosi booking→stay |
| BE | `auto-ops/auto-ops.service.ts` (BookingSweep) | Expiry 3 jam |
| FE | `pages/public/` · `pages/bookings/` | Form + list booking |
| Docs | `domain/hunian.md` · `M03_FLOW_KONTRAK.md` | |

#### B2. PAYMENT FLOW (Invoice → Bayar → Approve → Jurnal)
```
Stay aktif → Invoice (sewa + meter) → Tenant bayar (PaymentSubmission)
                                            → Admin APPROVE → InvoicePayment + JournalEntry
                                            → Admin REJECT → Tenant bayar ulang
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `invoices/invoices.service.ts` | Generate invoice |
| BE | `invoice-payments/invoice-payments.service.ts` | Catat pembayaran |
| BE | `payment-submissions/payment-submissions.service.ts` | Verifikasi bukti bayar |
| BE | `accounting/accounting-posting.service.ts` | Posting jurnal |
| FE | `pages/invoices/` · `pages/payments/` | UI invoice + bayar |
| Docs | `domain/keuangan.md` | **GATE WAJIB** |

#### B3. STAY FLOW (Huni → Meter → Renewal/Checkout)
```
Stay aktif → MeterReading (bulanan) → RenewRequest (sebelum habis)
                                    → CheckoutRequest → Checkout (deposit settlement)
                                    → Overstay (forced checkout)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `stays/stays.service.ts` | Lifecycle stay |
| BE | `meter-readings/meter-readings.service.ts` | Meter listrik/air |
| BE | `renew-requests/renew-requests.service.ts` | Renewal 8-state machine |
| BE | `checkout-requests/checkout-requests.service.ts` | Checkout tenant |
| BE | `deposit-ledger/deposit-ledger.service.ts` | Ledger deposit jaminan |
| BE | `stays/room-transfer.service.ts` | Pindah kamar |
| BE | `auto-ops/auto-ops.service.ts` (StaySweep) | Overstay, room healer |
| FE | `pages/stays/` · `pages/renew-requests/` | UI stay + renew |
| Docs | `domain/hunian.md` | |

#### B4. DEPOSIT FLOW (Jaminan → Refund/Settlement)
```
Booking → Deposit diterima (TenantDepositLedgerEntry, liability 2000)
Checkout → Deposit settlement (refund ke tenant atau potong kerusakan)
Kabur/abandoned → Forced deposit→AR (DR 2000 / CR 1100)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `deposit-ledger/deposit-ledger.service.ts` | Ledger deposit |
| BE | `checkout-requests/checkout-requests.service.ts` | Settlement saat checkout |
| BE | `accounting/accounting-posting.service.ts` | Jurnal deposit (liability) |
| Docs | `domain/keuangan.md` · `domain/hunian.md` | |

#### B5. ACCOUNTING FLOW (Jurnal → Period Close → Laporan)
```
InvoicePayment → JournalEntry (auto) → Trial Balance → Period Close → Neraca/Laba-Rugi
Expense → JournalEntry
Deposit → Liability 2000
RentRecognitionSchedule → Unearned→Earned (bulanan)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `accounting/accounting.service.ts` | Setup CoA + cash account |
| BE | `accounting/accounting-posting.service.ts` | Posting + reversal |
| BE | `accounting/accounting-reports.service.ts` | TB, neraca, laba/rugi |
| BE | `accounting/accounting-period-close.service.ts` | Tutup buku — **JANGAN UTAK-ATIK** |
| BE | `accounting/rent-recognition.service.ts` | PSAK 72 unearned→earned |
| BE | `expenses/expenses.service.ts` | Biaya operasional |
| BE | `assets/assets.service.ts` | Aset tetap + depresiasi |
| BE | `auto-ops/auto-ops.service.ts` (AccountingSweep) | Auto-journal, rent recognition |
| FE | `pages/finance/` · `pages/reports/` | UI akuntansi |
| Docs | `domain/keuangan.md` | **GATE WAJIB + unit test** |

#### B6. STAFF OPERATIONS FLOW (Tiket → Rutinitas → KPI)
```
Ticket (keluhan/perbaikan/inspeksi) → Assign → Start → Close
StaffRoutine (template→assignment→completion) → StaffPerformanceEvent → KPI
StaffFieldReport → Admin review
Tenant → StaffReview (kualitas staf)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `tickets/tickets.service.ts` | Tiket + guard AVAILABLE |
| BE | `staff-routines/` | Template/assignment/completion |
| BE | `staff-performance/` | KPI + event |
| BE | `staff-field-reports/` | Laporan lapangan |
| BE | `tenant-staff-reviews/` | Review tenant→staf |
| FE | `pages/tickets/` · `pages/staff/` · `pages/staff-routines/` | UI operasional |
| Docs | `domain/operasional.md` | |

#### B7. INVENTORY FLOW (Stok → Mutasi → Room Item)
```
InventoryItem (gudang) → InventoryMovement (ASSIGN/OUT/RETURN) → RoomItem (per kamar)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `inventory-items/` | Barang gudang |
| BE | `inventory-movements/` | Mutasi ASSIGN/OUT/RETURN |
| BE | `room-items/` | Barang per kamar (FK InventoryItem) |
| FE | `pages/resources/` (CRUD generik) | UI inventaris |
| Docs | `domain/operasional.md` | |

#### B8. AI FLOW (Tombol Manual Owner/Admin → Draft → Approve → Audit)
```
Owner/Admin klik tombol AI → DeepSeek proses → AiDraft tersimpan
    → Manusia review draft → Manusia klik approve → Aksi final + AuditLog(meta.ai)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `owner-ai/owner-ai.service.ts` | Brief, finance, payment, ops |
| BE | `owner-ai/ai-context-builder.service.ts` | Konteks untuk prompt AI |
| BE | `market-analysis/deepseek.client.ts` | HTTP client DeepSeek |
| BE | `market-analysis/market-analysis.service.ts` | Analisa pasar (SWOT/PESTLE) |
| BE | `audit-log/audit-log.service.ts` | Catat `meta.ai` |
| FE | `components/ai/` | Tombol + drawer AI |
| FE | `pages/dashboard/OwnerDashboardPage.tsx` | Integrasi AI |
#### B9. IOT FLOW (ESP32 Water → signed ingest / KWH → Tuya polling → telemetry → review)
```
ESP32-C3+D20 → signed POST /api/iot/v1/readings → IotIngestMessage + IotTelemetry
Tuya KWH Meter → Tuya Cloud API → IotPollingService / POST /api/iot/tuya/cron → IotTelemetry
Owner/Admin review → kandidat billing/manual → MeterReading → invoice cycle
```

Quota listrik untuk pembacaan meter bisnis dihitung dari periode sewa lunas; DP renewal tidak memulai periode baru. Telemetry pada flow ini dapat menjadi sumber tampilan/estimasi, tetapi tidak menjadi bukti invoice tanpa proses `MeterReading` yang ber-audit.

| Layer | File | Catatan |
|-------|------|---------|
| BE | `iot/{iot,water-ingest}.controller.ts` | Owner/Admin API, cron Tuya, dan signed ESP32 ingest |
| BE | `iot/{tuya/tuya-client,iot-polling}.service.ts` | HMAC-SHA256 Tuya dan polling terikat |
| BE | `iot/{iot,water-ingest}.service.ts` | Registry/mapping, telemetry, idempotensi/replay guard, credential device |
| Docs | `M14_IOT_TUYA_DEVICES.md` · `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` | Alert/kandidat billing masih UAT dan tidak otomatis |

---

### C. Quick Reference — "Mau X? Buka Y"

| Saya mau... | Role | Buka file ini dulu |
|-------------|------|--------------------|
| Tambah fitur di halaman tenant | TENANT | `frontend/src/pages/portal/` + `domain/hunian.md` |
| Ubah logika booking | PUBLIC | `backend/src/modules/tenant-bookings/` + `domain/hunian.md` |
| Ubah logika pembayaran | ADMIN | `backend/src/modules/payment-submissions/` + `domain/keuangan.md` |
| Tambah laporan keuangan | OWNER | `backend/src/modules/accounting/` + `domain/keuangan.md` |
| Ubah logika tiket staf | STAFF | `backend/src/modules/tickets/` + `domain/operasional.md` |
| Tambah tombol AI baru | OWNER | `backend/src/modules/owner-ai/` + `domain/ai.md` |
| Ubah deposit/refund | ADMIN | `backend/src/modules/deposit-ledger/` + `domain/keuangan.md` |
| Tambah inventory | STAFF | `backend/src/modules/inventory-items/` + `domain/operasional.md` |
| Ubah auto-ops/sweeper | SYSTEM | `backend/src/modules/auto-ops/` + `domain/operasional.md` § Auto-Ops |
| Tambah field di model Prisma | — | `backend/prisma/schema.prisma` ⚠️ BUTUH APPROVAL OWNER |
| Perbaiki UI/UX | — | `frontend/src/styles/` + `frontend/src/components/` |
| Cek aturan owner | — | `docs/KEPUTUSAN-OWNER.md` (84 keputusan, **SUMBER KEBENARAN**) |
| Tambah IoT / KWH meter | SYSTEM | `docs/domain/ai.md` + `backend/src/modules/iot/` |

---

### D. Alur Kerja Ideal Per Scope

1. **Tentukan scope:** role siapa? flow apa? (lihat bagian A atau B di atas)
2. **Buka M-file domain** (kolom "Docs" di tabel) — pahami aturan bisnis
3. **Buka M00_CODEMAP.md** — verifikasi path modul backend + frontend
4. **Grep simbol** di `backend/src` / `frontend/src` sebelum edit
5. **Gate build:** `npx tsc --noEmit` (backend) + `npm run build` (frontend). Kalau task uang: **WAJIB** `domain/keuangan.md` gate.
6. **Tutup:** perbarui checklist terkait di `M12` + entri changelog di `M13`.


