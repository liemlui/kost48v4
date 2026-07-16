# KOST48 V5 — Keputusan Owner

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Sumber cepat untuk keputusan owner dan aturan bisnis yang harus dihormati sebelum menyentuh kode atau flow.

## Sumber Digabung

- `docs/03_KEPUTUSAN_OWNER.md` - konten dipertahankan

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

Semua keputusan owner terkait keuangan (no-partial, DP 30%, deposit=Room.defaultDepositRupiah, PSAK 72, DRAFT≠revenue, meter pascabayar, settlement guard) **terverifikasi TERIMPLEMENTASI** di kode. Audit 5 jalur: LULUS. Detail: `docs/M04_KEUANGAN.md` Update 2026-06-17.

## Update 2026-07-08 — GATE-KTP-ENV fix + AU-01..AU-03

- **GATE-KTP-ENV:** Gate KTP diam-diam OFF di produksi karena `OperationalSetting.ktpVerificationGateEnabled` default `false` mengalahkan env. Fix: `settings.service.ts` semai nilai awal row dari env. Docs deploy diperbarui.
- **AU-01..AU-03:** Fix UX Admin/Owner — `SimpleCrudPage.tsx` delete confirm dialog + onError toast; `StaysPage.tsx` mutation booking/checkout onError toast; `OwnerSettingsPage.tsx` "Hapus key" DeepSeek confirm.

## Update 2026-07-08 — Keputusan Data Lapangan Produksi

Status: OWNER-CONFIRMED untuk aturan/ground truth, tetapi sebagian besar BELUM MASUK DB produksi sampai audit lapangan dan onboarding dilakukan. Detail eksekusi: `docs/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md`.

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
- **OWN-DETAIL-WITHOUT-CLUTTER (2026-07-16):** UI lengkap dan detail tetapi dibuka bertahap. Ringkasan dan aksi utama tampil lebih dulu; detail, riwayat, audit, dan data teknis tersedia saat item dibuka. Fitur tidak dihapus hanya demi tampilan sederhana. Sumber: `docs/UI_UX_OWNER_ADMIN.md`.
- **OWN-VIEW-AUTHORITY:** Toggle hanya mengganti konteks tampilan. OWNER di Area Admin tetap memiliki role dan kewenangan OWNER.
- **KTP-LEGACY-PORTAL:** Penghuni lama dapat ditandai `LEGACY` saat migrasi. Tenant dapat upload KTP miliknya dari portal; upload baru mereset verifikasi dan masuk antrean Admin. OCR lokal dan AI hanya rekomendasi; keputusan final tetap OWNER/ADMIN.
- **OWN-TOGGLE**: Owner bisa switch antara "Kokpit Owner" (bisnis) dan "Area Admin" (operasional) via toggle di navbar. Default = Kokpit Owner. Area Admin menampilkan Command Center operasional harian dengan sidebar 6 link.
- **OWN-AUTOOPS-CLEAN**: Checklist UAT AutoOps dipindahkan dari UI ke docs. Panel AutoOps di dashboard hanya menampilkan metrik ringkas + tombol eksekusi + riwayat run kolapsibel.
- **OWN-NAV-SPLIT**: Sidebar Kokpit Owner = 13 link bisnis (6 section). Sidebar Area Admin = 6 link operasional (1 section). Tidak campur.
- **OWN-NAV-TOGGLE-PERSIST**: Mode toggle disimpan ke localStorage agar survive page refresh.

### OWN-STRUKTUR-PHASE2 ✅ SELESAI (Fase C + H + I)

Toggle Owner/Admin phase 1 berfungsi penuh. UI telah diperbaiki melalui Fase C (toggle segmented control, route split, sidebar context-aware, breadcrumb), Fase H (sidebar compact 18→7, dashboard 6→3 tab), dan Fase I (de-duplikasi navigasi, breadcrumb interaktif). Detail: `docs/M12_CHECKLIST_CHANGELOG.md` Fase C, H, I.

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.

---

## Bagian 1 — `docs/03_KEPUTUSAN_OWNER.md`

### KEPUTUSAN OWNER — 2026-06-13 (+ addendum 2026-06-14: D-18/D-19, S-2)
**Sumber:** wawancara owner 2026-06-13 + catatan owner 2026-06-14. Dokumen ini MENGIKAT; bila konflik dengan dokumen lain, file ini menang. Dossier menjelaskan status kode dan cara implementasi, bukan mengganti keputusan bisnis di sini.

#### 🔴 TEMUAN BESAR DARI WAWANCARA — D-06: DATABASE MASIH DATA TESTING, BELUM PUBLISH
> Kutipan owner: *"Itu hanya testing, lebih baik data dihapus semua juga tidak masalah sebab kita belum publish kok."*

**Konsekuensi yang mengubah seluruh rencana:**
1. **Tidak ada migrasi data lama.** Deploy produksi = START BERSIH (fresh DB + seed COA + opening balance produksi), BUKAN memindahkan data UAT.
2. **Semua kekhawatiran "data lama" GUGUR:** F-24 (saldo 2000 historis), F-06/F-07 backfill deposit lama, E-2 backfill 11 stay promoted, F-15 historis — semua tidak relevan untuk data testing yang akan dihapus.
3. **Tetap perbaiki KODE-nya** (agar produksi ke depan bersih): F1-8 (guard settlement), F1-3..F1-7 (laporan) tetap wajib — yang gugur hanya tugas "perbaiki data historis".
4. **Deploy = FRESH** (drop DB → seed COA → opening balance), BUKAN migrasi. Runbook: `M08_DEPLOY_GO_LIVE.md`.

---

#### D — KEPUTUSAN UTAMA (D-01 s/d D-25)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| D-01 | **Alamat = Jl. Hikmah V No. 48, Surabaya Barat** (Pakuwon Mall/PTC). Frontend benar; docs lama salah "Ngagel Jaya Utara" → dikoreksi. | SEO, copy, header semua pakai Surabaya Barat. |
| D-02 | **NO PARTIAL PAYMENT di semua jalur.** Nominal pembayaran sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. | ✅ Terimplementasi. |
| D-03 | **DRAFT invoice TIDAK memblokir forced checkout.** Exclude dan auto-cancel DRAFT agar satu draft terlupakan tidak membuat overstay tertahan selamanya. Checkout normal tetap mengikuti guard invoice terbuka. | ✅ F3-13 selesai. |
| D-04 | **Expiry booking = 3 JAM FLAT semua jalur** (bukan cutoff 21:00 WIB). Booking malam berlaku 3 jam berikutnya. | ✅ F1-11 selesai. |
| D-05 | **Admin tidak boleh ubah deposit.** Deposit jaminan SELALU = `Room.defaultDepositRupiah`. | ✅ F1-10 selesai. |
| D-06 | **DATABASE MASIH TESTING → deploy FRESH.** Lihat bagian atas. | Panduan di M08. |
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

### Status: ✅ Sudah Terkunci di Kode

| Keputusan | Status | Implementasi |
|-----------|--------|-------------|
| STAFF boleh lihat `analytics/finance/summary`? | **TIDAK** — OWNER/ADMIN only | `@Roles(OWNER, ADMIN)` di controller ✅ |
| STAFF boleh lihat `wifi-sales`? | **READ-ONLY** — GET, tidak create/update/delete | ✅ |
| `RoomStatus.BOOKING` dihapus? | **SUDAH** — tidak ada di schema/enum sejak migrasi Fase V | ✅ |

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

### Refactor 7 Juli 2026
| Refactor | Status | File |
|----------|--------|------|
| Unifikasi `dateOnly()` — 1 shared utility | ✅ Selesai | `backend/src/common/utils/date-only.ts` |
| `@ApiProperty` di DTO invoice + stays + room-transfer | ✅ Selesai | 3 file DTO |

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
- Antrian eksekusi: `docs/M12_CHECKLIST_CHANGELOG.md` § Fase AL
- Changelog: `docs/M13_CHANGELOG.md`

---

**Akhir dokumen.** Semua keputusan di atas mengikat. Detail implementasi & kode spesifik → dossier domain `10`-`19`. Peta fase → `M01_MASTER.md`.
