# KEPUTUSAN-OWNER — Register Keputusan Bisnis Owner

Tanggal: 2026-09-23
Status: aktif
Tujuan: register kanonik keputusan bisnis/arah owner — tanggal, status berlaku/digantikan, dan sumber bukti; keputusan tidak diubah oleh pemindahan
Rujukan: [STATUS](STATUS.md) · [AGENTS](../AGENTS.md) · [STATUS](STATUS.md) · [KEPUTUSAN-OWNER (pointer)](KEPUTUSAN-OWNER.md) · [izin & catatan](history/izin-dan-catatan-keputusan-owner.md)

> Migrasi dari docs/M02_KEPUTUSAN_OWNER.md (B7 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks keputusan, tanggal, dan bukti dipindah apa adanya.
> Kelas isi non-keputusan dan izin/approval yang sudah digantikan dipisah ke [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) tanpa mengubah teks.
> Status "berlaku/digantikan" di bawah ditetapkan dari bukti bertanggal; keputusan lama tidak otomatis dianggap tidak berlaku.
> **Diperbarui 24 Sep 2026 (DOCS-CLEANUP-1b):** keputusan owner atas butir A1-A4, C1-C3 ditambahkan sebagai entri baru di bawah; tidak ada keputusan lama yang diubah.

## Status keputusan (berlaku / digantikan) — dari bukti

| Butir | Status | Bukti / pengganti |
|---|---|---|
| Retro-approve kondisional 23 Sep — syarat "setiap batch wajib approval eksplisit" | **digantikan** | [DELEGASI-DOC-TEKNIS](STATUS.md#6-keputusan-owner-yang-mengikat-ringkas) + [BATCH-B1-B11](STATUS.md#6-keputusan-owner-yang-mengikat-ringkas) (23 Sep, pasca-B5, `fe2955a3`); teks asli di [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) |
| IZIN-CAKUPAN 23 Sep — "S2.b3/S2.b4/S2.c dan batch berikutnya menunggu approval per batch" | **digantikan** | S2.b3/S2.b4/S2.c dieksekusi atas instruksi percepatan owner 23 Sep; B1–B7 mengikuti urutan batch + DELEGASI-DOC-TEKNIS ([STATUS §5](STATUS.md#5-pelaksanaan-vs-izin-dua-sumbu--jangan-digabung)) |
| ARAH-DOKUMEN 6 Sep — "seri M00–M19 dipertahankan" | **digantikan** | [KONSOLIDASI-FILE](STATUS.md#6-keputusan-owner-yang-mengikat-ringkas) 23 Sep + [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) (7 file utama; path lama menjadi pointer) |
| Keputusan izin bertahap 8 Sep + koreksi lingkup AO | **riwayat** (izin sebagian masih operatif; status eksekusi bertanggal) | Dipisah ke [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md); status aktual di [STATUS](STATUS.md) dan [STATUS](STATUS.md) |
| Butir lain: D-01..D-31, R1–R5, B1–B5, E/F/K/L/S, OP-*, FIN-*, PUB-*, STF-*, AI-*, OWN-*, W-00-D1..D3, AL-01..AL-04, OC-01..OC-07 | **berlaku** | Tidak ada bukti penggantian yang tercatat per 23 Sep 2026 |
| Batas penataan arsip & berkas besar (DOCS-CLEANUP, 24 Sep 2026 — A1–A4, C1–C3) | **berlaku** | Entri "2026-09-24 — DOCS-CLEANUP" di bawah; bukti batch [M13](M13_CHANGELOG.md) |

## 2026-09-24 — DOCS-CLEANUP: batas arsip, berkas >600 baris, dan preseden kerja

Konteks: batch DOCS-CLEANUP-1 (commit `06079a97`) memindahkan 11 berkas ke `docs/arsip/` dan menggabungkan 8 grup. Laporan menandai **satu sub-gate belum terpenuhi** (tidak ada berkas aktif >600 baris) dan empat butir yang menyentuh aturan bisnis/data. Owner menyetujui **seluruh rekomendasi** pada 24 Sep 2026, sehingga:

- **A1 — berkas aturan bisnis tetap utuh.** `domain/ai.md` (786), `domain/iot.md` (822), dan `domain/publik.md` (682) **tidak dipecah dan tidak dipindah**. Isi aturan bisnis tetap milik owner; sub-gate ">600 baris" untuk berkas-berkas ini **ditutup sebagai accepted exception**, bukan pelanggaran yang harus dikejar.
- **A2 — changelog berjalan tetap di tempat.** `history/changelog/2026-09.md` (987 → 1.000 baris) tetap di `docs/history/changelog/` sebagai penerima rotasi entri M13. Rotasi lebih agresif **tidak** dilakukan, karena akan mengeluarkan checkbox dari domain invariant riwayat (`[x]` = 101).
- **A3 — `docs/archieve/**` dibiarkan.** 107 berkas di disk, **31 tracked**, 76 lainnya di-exclude **lokal** lewat `.git/info/exclude` L9 (`docs/archieve/`) — di clone bersih berkas itu tampak sebagai untracked. Ejaan folder dipertahankan apa adanya; tidak ada pemindahan, penghapusan, atau penyeragaman ejaan.
- **A4 — `docs/audit-map/**` tetap artefak generated lokal.** 1.126 berkas, **0 tracked**, di-ignore `.gitignore` L87 (`/docs/audit-map/`); dipakai 135+ tautan peta per ID audit. **Dilarang dihapus** dan tidak dipindah ke repo; regenerasi dengan `node docs/audit-map/generate.cjs`.
- **C1 — tidak ada batch lanjutan.** DOCS-CLEANUP-2/3 **tidak dibuat**; penataan dokumen ditutup pada DOCS-CLEANUP-1. Sisa hanya Tahap 4 (review akhir) bila owner memintanya.
- **C2 — alat checker tidak diubah.** Angka rujukan tetap **26 temuan docs-scope**, dihitung pada disk yang memuat `docs/audit-map/**`; target `audit-map/**` **tidak** ditandai "generated - dilewati". Keterbatasan yang dinyatakan: di clone bersih angka itu berbeda karena direktori tersebut memang tidak ikut repo.
- **C3 — preseden kerja disetujui untuk batch penataan berikutnya:** (a) berkas `docs/**` yang sudah kotor karena **task lain yang sedang berjalan** di-commit sebagai *(working tree - hunk task lain)* lewat `git hash-object` + `git update-index --cacheinfo`, sehingga perubahan task lain tetap **unstaged** dan tidak rusak (tanpa `git add -A/-u/.`, tanpa stash/reset); (b) `git commit --amend` **boleh** dipakai untuk menjaga aturan "1 batch = 1 commit" bila ada berkas sah tertinggal dari staging — commit tetap satu dan tidak ada tautan rusak yang tertinggal.

Keputusan ini **tidak mengubah** aturan bisnis, nominal uang, gate uang/huni, schema, permission, kontrak API, atau UI/UX; yang ditetapkan hanya **batas penataan dokumentasi** dan cara kerja batch.

## 2026-09-23 — DEDUP-UANG: pengulangan isi aturan uang/harga boleh diringkas

Owner menjawab pertanyaan lanjutan batch B7: pengulangan isi aturan uang/harga **boleh didedup** dengan **satu pernyataan kanonik di `docs/domain/*`**; salinan lain menjadi kalimat rujukan. Batas yang mengikat:

- **Angka dan aturan tidak berubah** — hanya pengulangan yang dihapus; setiap nilai yang dihapus wajib terbukti ada di lokasi kanonik.
- **Rumah kanonik yang ditetapkan:** multiplikator term & utilitas per term + nominal DP/deposit → `domain/harga.md`; periode quota utilitas → `domain/keuangan.md`; konstanta utilitas (kuota gratis, tarif) → `domain/operasional.md`.
- **Tidak dihapus:** penyebutan kontekstual di dalam alur domain (`hunian.md`, `kontrak.md`, `flow.md`, `keuangan.md`) selama merupakan bagian alur; copy publik (`domain/publik.md`) tetap urusan keputusan produk.
- **D-02 dan D-05** pada [laporan duplikat](history/laporan-duplikat.md) ditutup dengan pola ini.

## 2026-09-23 — Percepatan penataan dokumentasi dan fokus implementasi

Owner menilai perbaikan aturan dan sinkronisasi dokumentasi sudah terlalu lama sehingga menghambat perkembangan aplikasi.

- **DOC-CEPAT:** tumpang tindih dokumentasi diselesaikan dengan eksekusi tegas, bukan tanya-jawab panjang. Batch **S2.b3** (M04 Bagian 1 → `docs/operations/verifikasi-keuangan.md`) dan **S2.b4** (blok Audit 360° → `docs/audit/audit-360-uang-2026-07.md`; M04 menjadi pointer) dijalankan atas instruksi ini.
- **FOKUS-IMPLEMENTASI:** setelah tumpang tindih selesai, pekerjaan diarahkan ke implementasi aplikasi; sisa pekerjaan dokumentasi tidak lagi mendahului kebutuhan produk.
- **Batas yang tetap:** approval per batch untuk batch **S3–S7** dan Tahap 4 belum tercatat; gate uang (AGENTS §8 + M04) dan izin server/deploy tetap berlaku.

## 2026-09-23 — Keputusan lanjutan: prioritas, cakupan izin, KTP, cakupan flow

Empat keputusan owner pada sesi tindak lanjut dokumentasi (23 Sep 2026):

- **PRIORITAS-DOC:** hasil yang didahulukan 30 hari ke depan adalah **menyelesaikan migrasi dokumentasi DOC-GOV-20260922** (sisa Tahap 3 dan Tahap 4). Ini menetapkan urutan kerja, **bukan** izin menyeluruh: setiap batch tetap wajib approval eksplisit sebelum eksekusi sesuai syarat pada seksi retro-approve di atas.
- **IZIN-CAKUPAN:** retro-approve kondisional 23 Sep mencakup **Tahap 2 (S0–S6), S1, S2.a (+S2.a-fix, S2.a-fix-2), S2.b1, S2.b2.a, dan S2.b2.b** — seluruh pekerjaan Tahap 3 yang sudah di-commit sampai `1d66fd34`. Batch S2.b3, S2.b4, S2.c, S2.d, S3–S7, dan Tahap 4 **belum tercatat** dan tetap menunggu approval per batch.
- **KTP-GATE-TUNDA:** `KTP_ACTIVATION_GATE_ENABLED` di produksi **ditunda** (belum diset true). Risiko yang diterima owner: selama ditunda, aktivasi kamar dapat lolos **tanpa KTP terverifikasi**, berlawanan dengan maksud UU PDP dan temuan D-17. Wajib ditinjau ulang sebelum onboarding penghuni nyata berikutnya; status env diverifikasi tanpa mencatat nilai secret.
- **FLOW-CORE-CAKUPAN:** keenam flow utama (penghuni masuk, tagihan & verifikasi pembayaran, perpanjangan, penghuni keluar/checkout, pengeluaran, dashboard harian) **tetap berada dalam cakupan** FLOW-CORE-01; tidak ada flow yang dikeluarkan. Urutan pengerjaan belum disetujui dan disusun sebagai usulan terpisah.

## Keputusan penyederhanaan aplikasi — 22 September 2026

Sumber: jawaban langsung owner atas empat pertanyaan arah produk. Keputusan ini memperbarui prioritas produk; aturan nominal, jurnal, permission, dan gate yang sudah berlaku tidak berubah.

- **PROD-SIMPLE:** hasil utama yang didahulukan adalah penyederhanaan aplikasi.
- **FLOW-CORE:** fokus pada operasional penghuni dan keuangan; mantapkan flow utama bisnis nyata sebelum memperluas fitur.
- **UX-OWNER-ADMIN:** pengguna prioritas OWNER/ADMIN. Masalah yang dilaporkan owner: UI/UX rumit, dashboard sulit dibaca, dan dampak satu keputusan terhadap nilai keuangan atau proses bisnis lain tidak jelas. Ini kebutuhan owner, bukan hasil audit runtime baru.
- **IOT-LATER:** pengembangan IoT ditunda sampai flow utama lebih matang. Penundaan pengembangan bukan izin menghapus fitur, memutus integrasi yang berjalan, atau menghilangkan pencatatan meter yang diperlukan tagihan.
- **ARAH-TEKNIS-TETAP:** target satu API NestJS, React/Vite, penundaan MA, serta gate keselamatan/keuangan tetap. EF tetap batas teknis dan gate yang relevan; prioritas produk kini mengikuti PROD-SIMPLE, bukan otomatis seluruh backlog EF lebih dahulu.
- **IB-FOUNDATION:** owner mengklarifikasi bahwa landasannya adalah **IB Diploma Business Management Theory**, untuk membangun dasar bisnis kost yang kuat. Penerapan teori harus terhubung ke keputusan bisnis nyata, data, flow aplikasi, dan evaluasi hasil; teori bukan izin otomatis mengubah nominal, jurnal, atau kebijakan bisnis existing.

Turunan pelaksanaan dan acceptance disusun dalam [rancangan DOC-GOV-20260922](arsip/DOC-GOV-20260922.md#11-arah-produk-dan-flow-utama). Usulan desain UI belum menjadi keputusan aturan bisnis. Migrasi dokumentasi XL tetap menunggu persetujuan rancangan; jawaban arah produk tidak dianggap sebagai approval migrasi atau implementasi keuangan.

## Keputusan arah aplikasi — 6 September 2026

Keputusan owner pada sesi penyelarasan dokumentasi; berlaku atas referensi arsitektur/urutan kerja yang lebih lama.
Prioritas produk pada bagian ini diperbarui oleh keputusan 22 Sep di atas; keputusan arsitektur, transaksi, dan batas izin tetap berlaku.

- **ARAH-EF:** Fase EF diprioritaskan. Audit lokal diterima sebagai audit statis dan typecheck; EF-00/02 menunggu identitas deployment dan pengukuran hosting. Jangan ulang implementasi EF-01/03/05 hanya karena server belum terverifikasi.
- **ARAH-SATU-API:** pertahankan modular monolith dan target satu proses API NestJS, PostgreSQL, frontend serta flow bisnis yang ada. Jumlah instance Passenger di host belum diketahui; target ini bukan bukti runtime.
- **ARAH-MA-TUNDA:** rencana lama V5.7/V5.8/V5.9 arsitektur dinamai **Fase MA — Batas Modul & Kesiapan Ekstraksi**, ditunda. Audit diterima sebagai bahan perencanaan, bukan PASS kesiapan migrasi. Belum ada izin apps/libs, aplikasi Nest baru, ekstraksi service, worker, atau perubahan model proses. EF-09 hanya gate keputusan masa depan bila pengukuran membuktikan kebutuhan.
- **ARAH-TRANSAKSI:** accounting, deposit, dan audit yang perlu atomisitas tetap pada transaksi pemanggil sekarang. Kepemilikan shared service ditunda; pasca-commit bukan otomatis aman dipisahkan dan outbox bukan solusi wajib tunggal.
- **ARAH-DOKUMEN:** seri M00–M19 dipertahankan. M12 satu checklist eksekusi; M19 spesifikasi/bukti EF; M08 runbook; M13 sejarah. Permintaan sinkronisasi mencakup panduan agent/dokumen, bukan kode, deploy, DB, atau bump versi.
- **ARAH-BUKTI:** catat implementasi, verifikasi lokal, deployment, dan dampak terukur secara terpisah. Kode uncommitted bisa saja masuk artefak; keberadaan patch di server tetap UNKNOWN sampai artefaknya diverifikasi. Fase A dan gate AO yang terbuka tidak dibatalkan.
- **ARAH-HOST:** dahulukan identitas artefak dan pengamatan pasif. Uji aktif (restart, burst, upload, cron, canary), konfigurasi server dan mutasi DB memerlukan izin terkait. Jangan minta nilai secret atau menghubungi support atas nama owner tanpa izin.

Checklist aktif: [STATUS](STATUS.md#2-antrean-prioritas-aktif). Tabel hosting: [efisiensi hosting](operations/efisiensi-hosting.md#9-pencatatan-hosting-ef-00-dan-ef-02).

## Update 2026-07-08 — Keputusan Data Lapangan Produksi

Status: OWNER-CONFIRMED untuk aturan/ground truth, tetapi sebagian besar BELUM MASUK DB produksi sampai audit lapangan dan onboarding dilakukan. Detail eksekusi: `docs/archieve/_expired_root_cleanup/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md`.

- **OP-FIX-NORMAL:** Kerusakan normal karena usia barang, aus, bocor, lampu mati, kran rusak, AC bermasalah, atau fasilitas mulai tidak layak ditangani owner/staff lewat perbaikan atau penggantian.
- **OP-FIX-INTENTIONAL:** Kerusakan sengaja, salah pakai berat, kehilangan barang/kunci, atau pelanggaran aturan direview sebagai tanggung jawab tenant.
- **OP-AUDIT-PHOTO:** Kondisi kamar saat audit produksi perlu difoto agar owner/staff punya baseline data yang adil sebelum input ke aplikasi.
- **OP-BATHROOM-INTERNAL:** Kamar dengan kamar mandi dalam diasumsikan punya paket perlengkapan kamar mandi lengkap untuk diaudit. F1 adalah pengecualian closet jongkok; kamar mandi dalam lain memakai closet duduk.
- **OP-BATHROOM-EXTERNAL:** Kamar mandi luar ada 2: satu dengan closet duduk, satu khusus mandi. Keduanya memakai bak air plastik besar, bukan ember kecil, dan tidak memakai shower.
- **OP-SHARED-LIGHTS:** Lampu area bersama yang diketahui: depan poster, teras depan, dapur, lorong, pojok lorong, depan kamar mandi belakang, lorong belakang. Total awal: 7 titik.
- **OP-CCTV-COMMON:** CCTV area bersama yang diketahui: depan 2, depan dapur 1, area depan kamar mandi belakang 1, lorong belakang 1. Total awal: 5 titik. Kamera dekat kamar mandi wajib dicek agar tidak mengarah ke area privat.
- **OP-FIRE-SAFETY:** Owner berencana memasang bola pemadam api/APAR 3-5 titik. Titik final belum ditentukan dan belum masuk database/aset.
- **OP-KITCHEN-OUTDOOR:** Dapur bersifat outdoor; kran dapur ada, rak piring tidak menjadi fasilitas wajib, tempat sampah dapur ada, kompor gas/selang/regulator/tabung LPG perlu audit rutin.
- **OP-FILE-PROMPT-PACK:** Materi file/prompt dibuat ringkas untuk dicopy-paste satu per satu ke Gemini: audit data kamar/fasilitas, denah evakuasi/fasilitas, nomor darurat + emergency flow, serta aturan tenant + kebijakan perbaikan + notice CCTV. Jadwal cuci AC dan data kWh/listrik dikelola di aplikasi, bukan materi print.
- **OP-DB-PENDING:** Data fisik area bersama, inventaris detail per kamar, lampu, CCTV, APAR/bola pemadam, LPG, garansi barang, anak kunci, dan dokumen cetak belum dianggap ada di DB sampai diinput melalui modul yang sesuai (`Room`, `RoomFacility`, `InventoryItem`, `RoomItem`, `FixedAsset`, `Ticket`, atau dokumen operasional).

### Kuis Audit Aset & Nilai (owner, 2026-07-08 sore)

- **OP-F-BLOCK-13KAMAR:** Kamar F3/F4 **SUDAH TIDAK ADA** — blok F dirombak menjadi F1 dan F2 saja. Total kamar aktif = **13** (A, B, C, D, F1, F2, G, H, I, J, K, L, M). Checklist/form/DB tidak boleh lagi menyebut F3/F4.
- **FIN-AUDIT-CUTOFF:** Audit inventaris total + neraca awal memakai SATU tanggal cut-off: **31 Juli 2026**.
- **FIN-ASET-KAPITALISASI:** Aset tetap = barang **TAHAN LAMA** (umur pakai > 1 tahun) dengan harga **≥ Rp 100.000/unit** — kipas angin (Rp150-250rb) dan lemari plastik (Rp200rb) MASUK. Barang ganti rutin (bohlam lampu, sprei, gayung, sikat) = beban, bukan aset, berapa pun harganya. *(Kuis awal sempat Rp500rb → dikoreksi owner di hari yang sama: terlalu tinggi untuk konteks kos.)*
- **FIN-ASET-UMUR:** Umur ekonomis default selaras kelompok pajak: elektronik/AC/CCTV/kipas 48 bln · furniture 48-96 bln · pompa/tandon/instalasi 96 bln · bangunan 240 bln · tanah TIDAK disusutkan.
- **FIN-TANAH-BANGUNAN:** Tanah + bangunan **MASUK pembukuan** via saldo awal (`FixedAsset.capitalizationSource=OPENING_BALANCE`). Tanah = NJOP SPPT PBB (dokumen ada). Bangunan dinilai SEKALI kondisi kini per cut-off, penyusutan fresh 240 bln; renovasi bertahap 2011-kini TIDAK dirunut per proyek (terserap nilai kini).
- **FIN-NOTA-MINIM:** Nota pembelian hampir tidak ada → sumber harga default **E (estimasi)**; N hanya bila nota ketemu.
- **FIN-REKENING-CAMPUR:** Rekening bank masih campur pribadi → saldo porsi bisnis dipilah per cut-off; ke depan disarankan rekening khusus kos.
- **FIN-HUTANG-NIHIL:** Tidak ada hutang/pinjaman bisnis → kewajiban hanya deposit tenant + sewa diterima di muka.
- **OP-PENDINGIN-MIX:** Pendingin kamar campuran AC dan kipas → jenis dicatat per kamar saat audit.
- **OP-CCTV-DVR:** CCTV 5 kamera + DVR/NVR & hard disk ADA → perekam didata sebagai aset terpisah.
- **OP-FORM-AUDIT-PACK:** Form lapangan siap pakai: `docs/filePrint/05_CHECKLIST_MASTER_INFO_AUDIT_ASET.md` (checklist terisi keputusan), `06_FORM_AUDIT_INVENTARIS_CETAK.html` (cetak ringkas), `07_FORM_AUDIT_INTERAKTIF_SUPER_DETAIL.html` (interaktif per kamar: tap kondisi, autosave, ringkasan otomatis + CSV). Ambang warning kapitalisasi di kode (owner-ai expense-OCR + insight accounting-reports) disamakan ke Rp100rb.

## Keputusan Operasional & Portal — 2026-06-17

### Layanan Tambahan & Meter
- **PUB-LAYANAN-TAMBAHAN**: Setiap layanan tambahan (WiFi, galon, TV, dll) di portal tenant tampilkan estimasi tarif. Admin yang kelola daftar layanan + tarif via Settings.
- **PUB-LAYANAN-MINAT**: Tombol "Saya Minat" pada layanan → modal konfirmasi biaya → setelah disetujui tenant → masuk ke proses admin.
- **PUB-METER-JADWAL**: Jadwal catat meter ditampilkan di halaman `/portal/stay` — kapan jendela buka/tutup, status bulan ini (sudah dicatat / belum).
- **STF-METER-VIEW**: Staff bisa melihat kamar mana yang sudah/belum catat meter.
- **CEGAH-DOUBLE-METER**: Guard sudah ada (M-2 dedupe per tanggal + utility). Cukup dipertahankan.

### Staff & Role Scope
- **STF-ROLE-SCOPE**: Staff hanya mengerjakan: reparasi, kebersihan, resepsionis (saat tamu datang). Staff tidak boleh memulai/approve pemesanan layanan berbayar.
- **STF-WIFI-ORDER**: Tombol "Mulai" untuk WiFi order hanya untuk admin/owner. Staff lihat status saja. Atau gunakan tombol "Pesan" yang nanti di-approve admin → masuk invoice.
- **STF-SARAN-LABEL**: Ganti label "Kirim via Laporan" menjadi "Kirim Saran" — fungsinya tetap lewat laporan (tiket), tapi judul dibedakan.
- **STF-TIP-FLOW**: Tip staf: tenant klik "Saya sudah transfer" → notif ke staff → staff punya 2 hari untuk konfirmasi (sudah masuk atau belum). Tombol "Terima Kasih" (acknowledge) di portal staff.

### Foto Profil
- **PUB-FOTO-PROFIL-KTP**: Foto profil tenant pakai foto KTP yang di-upload pertama saat join. Compress otomatis saat upload. Owner/Admin bisa upload ulang. Sistem kompres gambar (via `compressImageFile` yang sudah ada).

### AI Owner/Admin — Fase G (2026-06-19)
- **AI-MANUAL-ONLY**: Semua fitur AI/DeepSeek berbayar harus aktif hanya setelah Owner/Admin menekan tombol eksplisit. Tidak boleh auto-run saat page load, cron, interval, auto-ops, atau background prefetch.
- **AI-OWNER-ADMIN-ONLY**: Tombol AI hanya untuk OWNER/ADMIN. Tenant dan Staff tidak mendapat akses AI API berbayar.
- **AI-DRAFT-APPROVAL**: AI hanya membuat analisa, rekomendasi, draft note, atau prefilled form. Aksi final tetap manusia: Owner/Admin klik approve/simpan/tolak.
- **AI-NO-DIRECT-MUTATION**: AI tidak boleh langsung approve pembayaran, verifikasi KTP, membuat expense, mutasi stok, menutup tiket, posting jurnal, atau mengubah status kamar.
- **AI-HEMAT-TOKEN**: Kirim snapshot ringkas dan agregat, bukan seluruh data mentah. Default model hemat biaya; model berat hanya untuk analisa finance Owner-only.
- **AI-PDP**: Untuk KTP/bukti identitas, jangan kirim gambar ke DeepSeek. OCR gambar tetap lokal; DeepSeek hanya boleh menerima teks OCR yang sudah disaring bila perlu validasi.
- **AI-AUDIT**: Jika draft AI dipakai dalam aksi final, simpan jejak di `AuditLog.meta.ai`.

## Keputusan UI/UX Publik — 2026-06-17 (lihat `docs/M07_PUBLIK_GROWTH.md`)

### Navigasi & Tombol
- **PUB-LOGIN**: Tombol "Masuk Portal" harus ada di navbar publik → `/login`.
- **PUB-CTA**: Kurangi duplikasi "Cek Kamar Tersedia". Cukup 1 di hero + 1 sticky di navbar. Sisanya link teks.
- **PUB-REMOVE-PREF**: Hapus tombol "Ubah Preferensi Tinggal" dari halaman publik (tidak berguna).
- **PUB-ICON**: Tambah ikon emoji/SVG di fasilitas kamar, CTA, navbar, badge status. Tanpa library baru.

### Kalender Ketersediaan Cerdas
- **PUB-CALENDAR**: Halaman publik perlu kalender/timeline yang menunjukkan kamar kosong 2 minggu/bulan ke depan.
- **PUB-CALENDAR-RENEW**: Kamar dengan tenant kontrak dekat (≤14 hari) harus badge "Mungkin Tersedia" — tenant masih mungkin perpanjang.
- **PUB-CALENDAR-CHECKOUT**: Kamar dengan tenant durasi pendek (DAILY/WEEKLY/BIWEEKLY) + checkout request APPROVED → badge "Akan Kosong [tanggal]".
- **PUB-SMART-BOOKING**: Booking cerdas — kamar ada booking DP checkIn tgl 30 masih bisa dipesan harian/mingguan sebelum tgl 30.

### Kartu Kamar, Badge & Status
- **PUB-BADGE**: Badge warna per status: Hijau=Tersedia, Merah=Terisi, Kuning=Dipesan, Abu=Maintenance.
- **PUB-BTN-COLOR**: Tombol beda warna: Tersedia→biru "Ajukan Booking", Maintenance→outline/wa "Tanya Ketersediaan", Terisi→disabled "Penuh".
- **PUB-FACILITY-SHOW**: Tampilkan 4-5 ikon fasilitas utama di card kamar: kamar mandi dalam/luar, AC/kipas, ukuran besar/standar.
- **PUB-ROOM-CATEGORY**: Kamar punya kategori (ECONOMY, STANDARD, DELUXE) + tipe (REGULAR, MEZZANINE). Owner bisa petakan ulang via Settings untuk marketing.
- **PUB-PHOTO-RATIO**: Foto kamar dipaksa ratio 1:1 (CSS `aspect-ratio: 1/1; object-fit: cover`).

### Responsif & Foto
- **PUB-CARD-RESPONSIVE**: Grid kamar harus responsif: 4 kolom desktop, 2 tablet, 1 mobile.
- **PUB-FACILITY-PHOTO**: 1 foto real per fasilitas, di-upload owner via Settings.
- **OWN-FOTO-UPLOAD**: Owner bisa upload foto marketing (kamar, fasilitas, brosur, spanduk) via Settings.
- **PUB-BROCHURE**: Section "Galeri KOST48" di landing — tampil foto brosur/spanduk.

### Ulasan & Social Proof
- **PUB-REVIEWS**: Section "Apa Kata Penghuni" — ambil dari StaffReview VISIBLE rating≥4 + embed Google Maps (iframe).
- **PUB-REVIEWS-FILTER**: Filter "Terbaru" / "Rating Tertinggi". Default rating ≥4, max 10.

### Booking Flow & KTP
- **PUB-BOOKING-INFO**: Di halaman login: "Belum punya akun? Booking kamar dulu — akun Anda dibuat otomatis."
- **PUB-BOOKING-FORM**: Validasi `phone` XOR `email` (salah satu wajib). Field lain optional, dilengkapi di portal tenant.
- **PUB-KTP-OCR**: Tambah Tesseract.js untuk OCR offline — setelah upload foto KTP, ekstrak nama + NIK auto-isi form.
- **TEN-PROFILE-NOTIF**: Endpoint `GET /me/profile-completeness`. Portal tenant tampilkan badge "Lengkapi Profil" + daftar field belum diisi.

## Keputusan UI/UX Dashboard — 2026-06-17

### Toggle Owner/Admin View
- **OWN-DETAIL-WITHOUT-CLUTTER (2026-07-16):** UI lengkap dan detail tetapi dibuka bertahap. Ringkasan dan aksi utama tampil lebih dulu; detail, riwayat, audit, dan data teknis tersedia saat item dibuka. Fitur tidak dihapus hanya demi tampilan sederhana. Sumber: `docs/archieve/_expired_root_cleanup/UI_UX_OWNER_ADMIN.md`.
- **OWN-VIEW-AUTHORITY:** Toggle hanya mengganti konteks tampilan. OWNER di Area Admin tetap memiliki role dan kewenangan OWNER.
- **KTP-LEGACY-PORTAL:** Penghuni lama dapat ditandai `LEGACY` saat migrasi. Tenant dapat upload KTP miliknya dari portal; upload baru mereset verifikasi dan masuk antrean Admin. OCR lokal dan AI hanya rekomendasi; keputusan final tetap OWNER/ADMIN.
- **OWN-TOGGLE**: Owner bisa switch antara "Kokpit Owner" (bisnis) dan "Area Admin" (operasional) via toggle di navbar. Default = Kokpit Owner. Area Admin menampilkan Command Center operasional harian dengan sidebar 6 link.
- **OWN-AUTOOPS-CLEAN**: Checklist UAT AutoOps dipindahkan dari UI ke docs. Panel AutoOps di dashboard hanya menampilkan metrik ringkas + tombol eksekusi + riwayat run kolapsibel.
- **OWN-NAV-SPLIT**: Sidebar Kokpit Owner = 13 link bisnis (6 section). Sidebar Area Admin = 6 link operasional (1 section). Tidak campur.
- **OWN-NAV-TOGGLE-PERSIST**: Mode toggle disimpan ke localStorage agar survive page refresh.

### OWN-STRUKTUR-PHASE2 ✅ SELESAI (Fase C + H + I)

Toggle Owner/Admin phase 1 berfungsi penuh. UI telah diperbaiki melalui Fase C (toggle segmented control, route split, sidebar context-aware, breadcrumb), Fase H (sidebar compact 18→7, dashboard 6→3 tab), dan Fase I (de-duplikasi navigasi, breadcrumb interaktif). Detail: [STATUS.md](STATUS.md) §8 dan [history/changelog/](history/changelog/).

---

## Bagian 1 — `docs/archieve/2026-06-16_root_docs_pre_M/03_KEPUTUSAN_OWNER.md`

### KEPUTUSAN OWNER — 2026-06-13 (+ addendum 2026-06-14: D-18/D-19, S-2)
**Sumber:** wawancara owner 2026-06-13 + catatan owner 2026-06-14. Dokumen ini MENGIKAT; bila konflik dengan dokumen lain, file ini menang. Dossier menjelaskan status kode dan cara implementasi, bukan mengganti keputusan bisnis di sini.

#### 🔴 TEMUAN BESAR DARI WAWANCARA — D-06: DATABASE MASIH DATA TESTING, BELUM PUBLISH
> Kutipan owner: *"Itu hanya testing, lebih baik data dihapus semua juga tidak masalah sebab kita belum publish kok."* Keputusan pelaksanaan diperjelas oleh D-30 pada 2026-07-23: buat database produksi baru; jangan drop database UAT secara otomatis.

**Konsekuensi yang mengubah seluruh rencana:**
1. **Tidak ada migrasi data lama.** Deploy produksi = START BERSIH (fresh DB + seed COA + opening balance produksi), BUKAN memindahkan data UAT.
2. **Semua kekhawatiran "data lama" GUGUR:** F-24 (saldo 2000 historis), F-06/F-07 backfill deposit lama, E-2 backfill 11 stay promoted, F-15 historis — semua tidak relevan untuk data testing yang akan dihapus.
3. **Tetap perbaiki KODE-nya** (agar produksi ke depan bersih): F1-8 (guard settlement), F1-3..F1-7 (laporan) tetap wajib — yang gugur hanya tugas "perbaiki data historis".
4. **Deploy = FRESH** (database produksi BARU → seed COA → opening balance), BUKAN migrasi data UAT. Database UAT dipertahankan sebagai backup sampai ada persetujuan penghapusan tersendiri. Runbook: `DEPLOYMENT_ONLINE_20260723.md`.

---

#### D — KEPUTUSAN UTAMA (D-01 s/d D-25)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| D-01 | **Alamat = Jl. Hikmah V No. 48, Surabaya Barat** (Pakuwon Mall/PTC). Frontend benar; docs lama salah "Ngagel Jaya Utara" → dikoreksi. | SEO, copy, header semua pakai Surabaya Barat. |
| D-02 | **NO PARTIAL PAYMENT di semua jalur.** Nominal pembayaran sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. | ✅ Terimplementasi. |
| D-03 | **DRAFT invoice TIDAK memblokir forced checkout.** Exclude dan auto-cancel DRAFT agar satu draft terlupakan tidak membuat overstay tertahan selamanya. Checkout normal tetap mengikuti guard invoice terbuka. | ✅ F3-13 selesai. |
| D-04 | **Expiry booking = 3 JAM FLAT semua jalur** (bukan cutoff 21:00 WIB). Booking malam berlaku 3 jam berikutnya. | ✅ F1-11 selesai. |
| D-05 | **Admin tidak boleh ubah deposit.** Deposit jaminan SELALU = `Room.defaultDepositRupiah`. | ✅ F1-10 selesai. |
| D-06 | **DATABASE MASIH TESTING → deploy FRESH.** Lihat bagian atas; detail keselamatan pelaksanaan ada di D-30. | Panduan `DEPLOYMENT_ONLINE_20260723.md`. |
| D-07 | **KTP wajib sebelum aktivasi kamar.** Upload foto KTP saat check-in; tanpa verified → blokir OCCUPIED. Simpan terproteksi, hapus saat keluar. Cukup FOTO (tidak baca NIK). | ✅ F3-17 selesai + G5+ KTP. |
| D-08 | **Deposit = dana titipan / LIABILITY, BUKAN revenue.** Jangan tampilkan di cashflow operasional; pisahkan ke section liabilitas. | ✅ F1-9 selesai. |
| D-09 | **Social proof publik = rating≥4 anonim + count penghuni.** Boleh tampilkan inisial (UU PDP). | ✅ F3-4 selesai. |
| D-10 | **Pengumuman hanya untuk tenant OCCUPIED** (N-03). Tenant booking TIDAK terima. Kode sudah benar. | Pertahankan. |
| D-11 | **First-paid-wins tetap.** Multi-booking RESERVED diizinkan; pembayaran pertama disetujui mengunci kamar. | Pertahankan. |
| D-12 | **Retensi > akuisisi.** Prioritas: renewal F2-1 > SEO F3-3. Tapi kerjakan keduanya. | ⬆️ |
| D-13 | **Keluar lebih awal: sewa HANGUS, deposit kembali normal.** | Pertahankan. |
| D-14 | **Tenant kabur: admin tandai manual** (nunggak X hari + tak terhubung) → checkout dini + potong deposit. Deposit kurang → PIUTANG tenant (AR), bukan write-off. | ✅ F3-14 selesai. |
| D-15 | **Occupancy heatmap = prioritas visualisasi #1.** 12 bulan ke belakang + 3 bulan ke depan, grid kalender CSS. | ✅ F3-7 selesai. |
| D-16 | **RENT-LOYALTY — tenant yang perpanjang (renew) tanpa putus kontrak TIDAK mengalami kenaikan harga sewa.** Harga hanya bisa naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru). Memperkuat retensi — tenant loyal dilindungi dari inflasi sewa. | ✅ Terimplementasi. |
| D-17 | **Empat area OWNER-only:** tutup/buka periode akuntansi; hapus/nonaktif user atau staf; setelan kamar dan harga; proses deposit/refund settlement. ADMIN hanya boleh membaca atau menjalankan operasi lain yang secara eksplisit diizinkan. | ✅ F2-16 selesai. |
| D-18 | **RENEWAL/PRABAYAR FLEKSIBEL KAPAN SAJA** (2026-06-14). Tenant boleh perpanjang / **bayar di muka 2-4 bulan ke depan dengan harga BULANAN**, KAPAN SAJA — **tak harus menunggu kontrak lama habis**. Prabayar >1 bulan = **pendapatan diterima di muka** (akui bertahap → F4-1 unearned revenue). Rent-lock D-16 tetap berlaku. | ✅ F4-11 selesai. |
| D-19 | **FAQ DETAIL + "MANUAL BOOK" DI TENANT APP** (2026-06-14). Semua aturan/flow kos di-generate jadi FAQ → menu "Panduan/Aturan" di tenant app. Ringkas, terstruktur, berkategori. Fondasi `FaqsModule` sudah ada. | ✅ F4-12 selesai. |
| D-20 | **PINDAH KAMAR RESMI** (2026-06-15). Stay SAMA (roomId diperbarui); deposit ikut apa adanya; harga dikunci (D-16) kecuali **override OWNER-only** (D-17); meter kamar baru di-snapshot; kamar lama→inspeksi, kamar baru→OCCUPIED. | ✅ F4-8 selesai. |
| D-23 | **AI Owner/Admin manual-only.** DeepSeek/API AI berbayar hanya dipakai setelah tombol manual Owner/Admin ditekan; AI membuat draft/rekomendasi dan manusia approve aksi final. Tidak ada AI otomatis dari cron/page-load; tidak ada akses Tenant/Staff; tidak ada mutasi uang/stok/kamar/KTP/jurnal tanpa approval manusia. | ✅ Fase G `docs/M09_AI_OWNER_ADMIN.md`. |
| D-24 | **BATAS PENGHUNI PER KAMAR + SURCHARGE EKSTRA** (2026-06-23). Kamar **standar** (2,5×3m): **2 orang gratis**, maks booking **4 orang** (2 ekstra). Kamar **besar** (3×3,5m): **4 orang gratis**, maks booking **6 orang** (2 ekstra). Kelebihan orang di atas batas gratis = **+20% harga sewa per kepala ekstra**. | ✅ Selesai 2026-06-23. |
| D-25 | **NOMOR WA ADMIN = SETTING OPERATIONAL** (2026-07-02). Nomor WhatsApp admin/owner TIDAK BOLEH hardcode. Disimpan di `OperationalSetting.adminWhatsappNumber` dan bisa diubah oleh OWNER via halaman Settings. Semua link WA di aplikasi membaca dari setting ini + env var `VITE_PUBLIC_ADMIN_WHATSAPP` sebagai fallback. | ✅ Terimplementasi. |
| D-26 | **Kategori notifikasi adalah data bisnis tersimpan:** `FINANCE`, `OPERATIONS`, `SYSTEM`. Pembayaran/akuntansi eksplisit FINANCE; pengumuman, huni, tiket, kamar, booking = OPERATIONS; fallback = SYSTEM. | UI Bell dan analitik tidak lagi menebak kategori dari tipe entitas. |
| D-27 | **Pengumuman terjadwal dikirim saat aktif, bukan saat dibuat.** `startsAt` masa depan menahan notifikasi; AutoOps dispatch sekali dan mengisi `dispatchedAt`. | Ketepatan waktu mengikuti cadence AutoOps/cron; bukan real-time per detik. |
| D-28 | **Hapus pengumuman = hard delete OWNER/ADMIN.** Notifikasi yang menunjuk pengumuman dan file gambar terkait dibersihkan; AuditLog tetap ada. Gunakan unpublish bila hanya ingin menghentikan tayang. | Mencegah link inbox menuju 404. |
| D-29 | **In-app notification adalah sumber kebenaran; Web Push best-effort dan opt-in.** | Push gagal/tidak aktif tidak boleh menghilangkan inbox. |
| D-30 | **Go-live pertama memakai database produksi BARU/kosong, bukan drop DB UAT.** Data UAT tidak dimigrasikan. Bila target ternyata berisi data nyata, jalur otomatis berubah menjadi patch migration dan wajib persetujuan owner. Setelah go-live: patch-only, tanpa reset. | Runbook `DEPLOYMENT_ONLINE_20260723.md` menggantikan instruksi deploy lama yang ambigu. |
| D-31 | **Quota listrik gratis mengikuti periode sewa yang sudah LUNAS.** Perpanjangan tiga bulan memperoleh tiga quota bulanan; invoice DP renewal tidak memulai periode baru. Telemetry IoT hanya monitoring/estimasi dan tidak boleh menerbitkan tagihan sendiri. | Mencegah quota reset saat DP dan memastikan meter cycle/renewal/tampilan tenant memakai dasar periode yang sama. |

---

#### R — ATURAN RETENSI & RENEWAL (R1-R5)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| R1 | Tenant lama punya **prioritas eksklusif sampai hari-H tanpa wajib DP dulu**. | ✅ F2-1 state machine. |
| R2 | DP 30% perpanjangan → **pelunasan maks H+7 dari DP.** Grace boleh lewat kontrak. | ✅ F2-1. |
| R3 | **Gagal lunas H+7 → forced checkout + DP hangus + potong deposit.** | ✅ F2-1/F3-14. |
| R4 | Prompt via **notif H-10 + tenant boleh ajukan sendiri.** | ✅ F2-2 notif. |
| R5 | **TIDAK → kamar langsung dibuka publik** mulai tanggal checkout. | ✅ F2-1 state machine. |

#### B — BISNIS & OPERASIONAL (B1-B5)

| ID | Keputusan |
|----|-----------|
| B1 | Reminder kontrak: **H-10, H-7, H-3, H-1, H-day** (tambah H-10 dari yang ada). |
| B2 | Tenant kabur ditandai manual, **nunggak X hari + tak terhubung → checkout dini + potong deposit.** |
| B3 | Barang ditinggal: **batas 30 hari → ABANDONED + notif.** Tindakan fisik manual. |
| B4 | Admin boleh **PAKSA checkout tenant nunggak + potong sisa dari deposit.** Deposit kurang = PIUTANG. |
| B5 | Overstay H+1 forced checkout; nunggak → tidak auto-checkout, admin alert. |

#### E — FONDASI & KEAMANAN
- E-1: APP_GUARD global default-deny TERPASANG (V5.12.2)
- E-2: Backfill data lama TIDAK berlaku (D-06)
- E-3: Jaminan check-in manual (ledger+jurnal) — PASS
- E-4: Saldo kas dari jurnal — PASS
- E-5: Liability HELD — PASS
- E-9: Hardening — PASS
- E-6: TZ WIB → tunda F2-14
- E-7: Round-robin → tunda (1 staf)
- E-8: Test suite luas ditunda; harness finance minimum F1-T tetap wajib sebelum task uang.

#### F — KEUANGAN & AKUNTANSI
- F-01: Cashflow salah deteksi AR sebagai cash → ✅ F1-3
- F-02: Operator precedence bug expense ratio → ✅ F1-4
- F-09: DRAFT masuk revenue → ✅ F1-7
- F-10: Deposit masuk operating cashflow → ✅ F1-9
- F-17: Balance sheet imbalance → ✅ F1-5
- F-18: Ratio AR sebagai cash → ✅ F1-4
- F-24: Settlement tanpa receipt journal → ✅ F1-8

#### K — KPI & TIKET
- K-5: monthRange UTC → ✅ F2-14 WIB
- K-1: resolved time dari assignedAt → ✅ bagian F3-19
- K-6/K-8: notif penerima salah → ✅ F3-1

#### L — LOYALITAS
- **D-16:** Rent-loyalty — no rent hike while renewing (cross-ref D-16 di atas).

#### S — APPROVAL SCHEMA
- **S-1 (2026-06-13):** Owner MENYETUJUI seluruh perubahan schema ADDITIVE. Hanya additive (tambah enum value/kolom nullable); tak menghapus/mengubah kolom lama.
- **S-4 (2026-06-15):** Owner MENYETUJUI schema additive PeerBehaviorReport + referral system.
- **S-3 (2026-06-15):** Owner MENYETUJUI schema additive backlog Fase 4 KECUALI F4-13c (quest perbaikan sikap anonim = DITUNDA).
- **S-2 (2026-06-14):** Owner MENYETUJUI seluruh schema additive Fase 4 (PushSubscription, RentRecognitionSchedule, Loyalty, RoomTransfer).

---

#### D-18/D-19 — DETAIL TAMBAHAN (2026-06-14)

##### D-18 — Renewal / prabayar fleksibel kapan saja
- **Aturan:** tenant boleh memperpanjang atau **membayar di muka untuk 2-4 bulan ke depan** dengan **harga bulanan**, **kapan saja** — tidak harus menunggu kontrak lama hampir/sudah habis.
- **Hubungan dengan renewal yang ada (R1-R5):** ini jalur TAMBAHAN ("early renewal / prepay"), bukan pengganti.
- **Akuntansi:** prabayar lebih dari 1 bulan = **pendapatan diterima di muka (unearned revenue, COA 2200)** → diakui bertahap per bulan.
- **Harga:** mengikuti **rent-lock D-16** — selama tenant terus renew tanpa putus kontrak, harga tidak naik.

##### D-20 — Pindah kamar resmi (F4-8)
- **Stay yang SAMA** dipertahankan (hanya `roomId` diperbarui + dicatat `RoomTransfer`).
- **Deposit jaminan ikut pindah apa adanya.**
- **Harga sewa dikunci** (rent-loyalty D-16) kecuali override manual oleh OWNER.
- **Meter kamar baru di-snapshot baseline** saat pindah.
- **Kamar lama → MAINTENANCE + tiket CHECKOUT_INSPECTION; kamar baru → OCCUPIED.**

##### D-19 — FAQ detail + "manual book" tenant app
- **Tujuan:** tenant dapat membaca **manual/aturan kos** secara mandiri di tenant app.
- **Konten:** FAQ **sangat detail**, di-generate dari semua aturan/flow.
- **Penyajian:** menu **"Panduan / Aturan"** di tenant app, ringkas & berkategori.
- **Sumber input tambahan:** interview owner + analisa percakapan WhatsApp.

---

#### D-21 — Keputusan tindak-lanjut AUDIT (2026-06-15)
- **D-21.1 (AUD-1, pindah kamar):** utilitas kamar LAMA periode berjalan WAJIB ditagih lebih dulu.
- **D-21.2 (AUD-2 + D-6, tip staf):** info e-wallet staf diisi sendiri oleh staf lewat profil self-service. Aliran uang tetap P2P, tidak dijurnal.
- **D-21.3 (AUD-3, cuci AC):** jadwal cuci AC pakai pendekatan HIBRID — interval hari + alert dini estimasi kWh tinggi.
- **D-21.4 (prabayar & poin, A-5/A-6/A-7/B-4) — KEEMPAT diaktifkan.**
  - **A-6:** blokir permintaan prabayar bila tenant masih punya tagihan menunggak.
  - **A-7:** beri poin loyalitas saat prabayar multi-bulan.
  - **B-4:** poin ON_TIME diberikan untuk SETIAP invoice yang dibayar tepat waktu.
  - **A-5:** izinkan tarif diskon SMESTERLY/YEARLY untuk prabayar.

#### D-22 — Keputusan tindak-lanjut AUDIT MENYELURUH (2026-06-15)
- **D-22.1 (L-1, jurnal warisan best-effort):** pilih best-effort + AUTO-REKONSILIASI.
- **D-22.2 (AUD-5 + AC vendor):** tiket cuci AC dibuat TANPA assignee + bisa ditandai vendor.
- **D-22.3 (AUD-4, FAQ awal):** YA — seed FAQ awal dari aturan + dossier.
- **D-22.4 (B-9, referral di portal):** YA — tambah field kode referral di alur booking admin/portal.

- **S-5 (2026-06-15):** Owner MENYETUJUI schema additive Fase 5: `Room.acUsageHoursPerDay`, `Ticket.handledByVendor` + `vendorNote`.

---

## W-00 — Decision Register (Fase W Audit 2026-06-30)

**Dibuat:** 2026-07-01 | **Sumber:** Fase W — Project Status Gate

### 🟡 Butuh Keputusan Owner

| # | Keputusan | Rekomendasi AI | Dampak | Ditentukan |
|---|-----------|---------------|--------|------------|
| W-00-D1 | **ADMIN** boleh jalankan AutoOps finance-heavy? | **DIPUTUSKAN OWNER (2026-07-01):** `depreciation` + `recurring-expenses` → **OWNER-only**. | ✅ **Diputuskan** |
| W-00-D2 | **JWT** tetap `localStorage` untuk rilis awal? | **Ya, untuk MVP.** Roadmap pindah ke httpOnly cookie. | **Sementara: localStorage** (sejak M17 sudah ada Refresh Token httpOnly cookie) |
| W-00-D3 | **Upload registry** perlu migration schema? | **Mulai tanpa schema** — tracking via service-level Map. | **Tanpa schema dulu** |

---

## Update 2026-07-07 — AUDIT REASONIX CODE ✅

> **Sumber:** `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` — 82 temuan Reasonix Code (DeepSeek V4 Pro).

### Keputusan Baru (hasil konfirmasi owner 7 Jul 2026)

| # | Keputusan | Jawaban Owner | Implementasi |
|---|-----------|---------------|-------------|
| **AL-01** | Apakah invoice boleh pakai line DISCOUNT? | **Ya** — sediakan line diskon. | ✅ Tambah case `DISCOUNT` di `revenueCodeForInvoiceLine()`, return contra-revenue `'4010'`, posting sebagai DEBIT. |
| **AL-02** | Setelah kontrak habis, tenant boleh ganti durasi saat perpanjang? | **Ya** — bebas pilih term baru. | ✅ Perbaiki kalkulasi: re-multiply `agreedRentAmountRupiah` dengan ratio multiplier. |
| **AL-03** | Collection rate pakai basis akrual (tagihan) atau kas (penerimaan)? | **Basis tagihan (akrual)** — "Dari semua invoice periode X, berapa % yang sudah lunas?" | ✅ Samakan jendela waktu. |
| **AL-04** | WiFi — subscription system atau voucher? | **Voucher system.** Non-tenant juga bisa beli. Paket: sebulan 50k, 2 minggu 40k, seminggu 20k, sehari 5k. | **Mini project baru.** |

## Update 2026-07-04 — Keputusan Lanjutan Audit Reasonix ✅

| ID | Task | Keputusan Owner | OC ID |
|----|------|----------------|-------|
| **M24/L19** | `AncillaryRevenuePage` — Bangun API | **A — Bangun API**. | OC-01 |
| **M26/L26** | Announcement — targeting per tenant | **B — SKIP**. Broadcast ke semua tenant cukup. | OC-02 |
| **M27** | Auto-provisioning additional services | **B — SKIP**. Tetap manual. | OC-03 |
| **M28** | `GuestPreferenceSurvey` — admin page | **A — Bangun**. Controller + admin page. | OC-04 |
| **M29** | `ExternalReview` CRUD — audit | **A — Audit sekarang**. | OC-05 |
| **M31** | `AiDraft` queue — verifikasi live | **B — TUNDA**. Tes dengan DeepSeek asli ditunda. | OC-06 |
| **L22** | Staff dashboard — halaman khusus | **A — Bangun**. Halaman staff dashboard terpisah. | OC-07 |

### Rujukan
- Detail 82 temuan: `docs/archieve/audit_reasonix/` (10 file)
- Antrian eksekusi: [STATUS.md](STATUS.md) (kanonik)
- Changelog: `docs/M13_CHANGELOG.md`

---

## 2026-09-25 — Keputusan atas temuan uang lanjutan, izin akses, dan batas kerja

Owner menjawab daftar keputusan yang ditimbulkan verifikasi statis P1-04..P1-09 dan audit Z-19. Keputusan berlaku sebagai berikut.

- **P1-05-KEEP — submission kedaluwarsa tetap `EXPIRED` (status quo).** Dua jalur expiry (`payment-submissions.service.ts:1750–1756`, `:1877–1883`) **tidak diubah**; perilaku ini dicatat sebagai **accepted behaviour**, bukan diubah menjadi `REJECTED`. Tidak ada perubahan source akibat keputusan ini.
- **P1-04-FIX — risiko ledger deposit diperbaiki (izin diberikan).** Owner memilih memperbaiki, dengan bentuk teknis **`@@unique` dan/atau membuang fallback `stayId` + log keras saat skip**. Batas: (a) perubahan **schema/kunci unik yang menyentuh DB** adalah task operasional tersendiri dengan izin, backup, dan runbook sesuai [OPERASI](OPERASI.md); (b) perbaikan source wajib melewati **gate uang** ([AGENTS §8](../AGENTS.md) + §7 di [STATUS](STATUS.md)).
- **P1-09-CLEANUP — penghapusan salinan mati `buildApprovalPaymentNote`** (`payment-submissions.mapper.ts`) **digabung** ke task uang berikutnya, bukan task terpisah.
- **Z19-T2-BASIS — "Laba Bersih" disatukan pada basis akrual.** Definisi KPI dan grafik harus memakai basis yang sama (akrual), menggantikan pencampuran akrual (KPI) vs kas (grafik). Karena menyentuh interpretasi uang, implementasinya mengikuti gate uang dan **berkoordinasi dengan sesi yang memegang berkas dashboard**.
- **Z19-SESI-LAIN — berkas frontend Z-19 tetap milik sesi yang sedang mengerjakannya.** Sesi lain menyelesaikan perbaikan 3 berkas `frontend/src/**`; sesi verifikasi dokumentasi **tidak** men-stage atau meng-commit berkas itu.
- **PUSH-25SEP — izin push diberikan dan dieksekusi.** `main` di-push ke `origin/main` (`1b0858c2..5928462f`); commit lokal 24–25 Sep kini sinkron dengan remote.
- **AKSES-UAT-25SEP — izin akses DB UAT diberikan.** UAT tercatat pada port `5433`, `kost48_v3_pro`; izin dipakai untuk uji konkurensi nyata (T6/T7) pada task tersendiri, bukan untuk mutasi data produksi.
- **URUTAN-25SEP — urutan task AI berikutnya.** Setelah keputusan ini: (1) regresi auth temuan #3 (login/refresh/JWT strategy/forgot-password/rate limiting), (2) task uang P1-04 + P1-09, (3) uji konkurensi DB untuk T6/T7, (4) Z19-T2 bersama sesi dashboard.

Keputusan ini **tidak mengubah** nominal uang, tarif, aturan DP/deposit, atau kontrak API; yang ditetapkan adalah **izin kerja, bentuk perbaikan yang dipilih, dan urutan eksekusi**.

---

**Akhir dokumen.** Semua keputusan di atas mengikat. Detail implementasi & kode spesifik → dossier domain `10`-`19`. Peta fase → `M01_MASTER.md`.
