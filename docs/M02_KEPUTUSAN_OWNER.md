# KOST48 V5 - Keputusan Owner

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Sumber cepat untuk keputusan owner dan aturan bisnis yang harus dihormati sebelum menyentuh kode atau flow.

## Sumber Digabung

- `docs/03_KEPUTUSAN_OWNER.md` - konten dipertahankan

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

Semua keputusan owner terkait keuangan (no-partial, DP 30%, deposit=Room.defaultDepositRupiah, PSAK 72, DRAFT≠revenue, meter pascabayar, settlement guard) **terverifikasi TERIMPLEMENTASI** di kode. Audit 5 jalur: LULUS. Detail: `docs/M04_KEUANGAN.md` Update 2026-06-17.

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

### AI Owner/Admin - Fase G (2026-06-19)
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
- **OWN-TOGGLE**: Owner bisa switch antara "Kokpit Owner" (bisnis) dan "Area Admin" (operasional) via toggle di navbar. Default = Kokpit Owner. Area Admin menampilkan Command Center operasional harian dengan sidebar 6 link.
- **OWN-AUTOOPS-CLEAN**: Checklist UAT AutoOps dipindahkan dari UI ke docs. Panel AutoOps di dashboard hanya menampilkan metrik ringkas + tombol eksekusi + riwayat run kolapsibel.
- **OWN-NAV-SPLIT**: Sidebar Kokpit Owner = 13 link bisnis (6 section). Sidebar Area Admin = 6 link operasional (1 section). Tidak campur.
- **OWN-NAV-TOGGLE-PERSIST**: Mode toggle disimpan ke localStorage agar survive page refresh.

### OWN-STRUKTUR-PHASE2 ✅ SELESAI (Fase C + H + I)

Toggle Owner/Admin phase 1 berfungsi penuh. UI telah diperbaiki melalui Fase C (toggle segmented control, route split, sidebar context-aware, breadcrumb), Fase H (sidebar compact 18→7, dashboard 6→3 tab), dan Fase I (de-duplikasi navigasi, breadcrumb interaktif). Detail: `docs/M10_CHECKLIST_CHANGELOG.md` Fase C, H, I.

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/03_KEPUTUSAN_OWNER.md`

### KEPUTUSAN OWNER — 2026-06-13 (+ addendum 2026-06-14: D-18/D-19, S-2)
**Sumber:** wawancara owner 2026-06-13 + catatan owner 2026-06-14. Dokumen ini MENGIKAT; bila konflik dengan dokumen lain, file ini menang. Dossier menjelaskan status kode dan cara implementasi, bukan mengganti keputusan bisnis di sini.

#### 🔴 TEMUAN BESAR DARI WAWANCARA — D-06: DATABASE MASIH DATA TESTING, BELUM PUBLISH
> Kutipan owner: *"Itu hanya testing, lebih baik data dihapus semua juga tidak masalah sebab kita belum publish kok."*

**Konsekuensi yang mengubah seluruh rencana:**
1. **Tidak ada migrasi data lama.** Deploy produksi = START BERSIH (fresh DB + seed COA + opening balance produksi), BUKAN memindahkan data UAT.
2. **Semua kekhawatiran "data lama" GUGUR:** F-24 (saldo 2000 historis), F-06/F-07 backfill deposit lama, E-2 backfill 11 stay promoted, F-15 historis — semua tidak relevan untuk data testing yang akan dihapus.
3. **Tetap perbaiki KODE-nya** (agar produksi ke depan bersih): F1-8 (guard settlement), F1-3..F1-7 (laporan) tetap wajib — yang gugur hanya tugas "perbaiki data historis".
4. **Deploy = FRESH** (drop DB → seed COA → opening balance), BUKAN migrasi. Runbook: `04_DEPLOY_AND_PWA.md`.

---

#### D — KEPUTUSAN UTAMA (D-01 s/d D-23)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| D-01 | **Alamat = Jl. Hikmah V No. 48, Surabaya Barat** (Pakuwon Mall/PTC). Frontend benar; docs lama salah "Ngagel Jaya Utara" → dikoreksi. | SEO, copy, header semua pakai Surabaya Barat. |
| D-02 | **NO PARTIAL PAYMENT di semua jalur.** Nominal pembayaran sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. | Task F1-1R: replikasi gate di approve. |
| D-03 | **DRAFT invoice TIDAK memblokir forced checkout.** Exclude dan auto-cancel DRAFT agar satu draft terlupakan tidak membuat overstay tertahan selamanya. Checkout normal tetap mengikuti guard invoice terbuka. | Task F3-13. |
| D-04 | **Expiry booking = 3 JAM FLAT semua jalur** (bukan cutoff 21:00 WIB). Booking malam berlaku 3 jam berikutnya. | F1-11 selesai. |
| D-05 | **Admin tidak boleh ubah deposit.** Deposit jaminan SELALU = `Room.defaultDepositRupiah`. | Task F1-10. |
| D-06 | **DATABASE MASIH TESTING → deploy FRESH.** Lihat bagian atas. | Task F1-12. |
| D-07 | **KTP wajib sebelum aktivasi kamar.** Upload foto KTP saat check-in; tanpa verified → blokir OCCUPIED. Simpan terproteksi, hapus saat keluar. Cukup FOTO (tidak baca NIK). | Task F3-17. |
| D-08 | **Deposit = dana titipan / LIABILITY, BUKAN revenue.** Jangan tampilkan di cashflow operasional; pisahkan ke section liabilitas. | Task F1-9 (F-10). |
| D-09 | **Social proof publik = rating≥4 anonim + count penghuni.** Boleh tampilkan inisial (UU PDP). | Task F3-4. |
| D-10 | **Pengumuman hanya untuk tenant OCCUPIED** (N-03). Tenant booking TIDAK terima. Kode sudah benar. | Pertahankan. |
| D-11 | **First-paid-wins tetap.** Multi-booking RESERVED diizinkan; pembayaran pertama disetujui mengunci kamar. | Pertahankan. |
| D-12 | **Retensi > akuisisi.** Prioritas: renewal F2-1 > SEO F3-3. Tapi kerjakan keduanya. | ⬆️ |
| D-13 | **Keluar lebih awal: sewa HANGUS, deposit kembali normal.** | Pertahankan. |
| D-14 | **Tenant kabur: admin tandai manual** (nunggak X hari + tak terhubung) → checkout dini + potong deposit. Deposit kurang → PIUTANG tenant (AR), bukan write-off. | Task F3-14. |
| D-15 | **Occupancy heatmap = prioritas visualisasi #1.** 12 bulan ke belakang + 3 bulan ke depan, grid kalender CSS. | Task F3-12. |
| D-16 | **RENT-LOYALTY — tenant yang perpanjang (renew) tanpa putus kontrak TIDAK mengalami kenaikan harga sewa.** Harga hanya bisa naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru). Memperkuat retensi — tenant loyal dilindungi dari inflasi sewa. | Cross-ref dossier 11, 17, 19. |
| D-17 | **Empat area OWNER-only:** tutup/buka periode akuntansi; hapus/nonaktif user atau staf; setelan kamar dan harga; proses deposit/refund settlement. ADMIN hanya boleh membaca atau menjalankan operasi lain yang secara eksplisit diizinkan. | Task F2-16. |
| D-18 | **RENEWAL/PRABAYAR FLEKSIBEL KAPAN SAJA** (2026-06-14). Tenant boleh perpanjang / **bayar di muka 2-4 bulan ke depan dengan harga BULANAN**, KAPAN SAJA — **tak harus menunggu kontrak lama habis**. Ini menambah jalur "prabayar/perpanjang lebih awal" di samping renewal akhir-kontrak (R1-R5, prompt H-10). Prabayar >1 bulan = **pendapatan diterima di muka** (akui bertahap → F4-1 unearned revenue). Rent-lock D-16 tetap berlaku (harga tak naik selama renew berlanjut). | Backlog **F4-11**; terkait F4-1. |
| D-19 | **FAQ DETAIL + "MANUAL BOOK" DI TENANT APP** (2026-06-14). Semua aturan/flow kos di-generate jadi **FAQ sangat detail** lalu disajikan sebagai **menu "Panduan/Aturan" di tenant app** — tenant bisa baca manual aturan kos secara mandiri. **Openness, TAPI jangan bikin tenant pusing** (ringkas, terstruktur, berkategori). Sumber konten: `03_KEPUTUSAN_OWNER` + dossier flow; input tambahan via **interview owner** atau **analisa percakapan WhatsApp** (pertanyaan & keluhan tenant yang sering). Fondasi `FaqsModule` sudah ada. | Backlog **F4-12**; dossier 17/16. |
| D-20 | **PINDAH KAMAR RESMI** (2026-06-15). Stay SAMA (roomId diperbarui); deposit ikut apa adanya; harga dikunci (D-16) kecuali **override OWNER-only** (D-17); meter kamar baru di-snapshot; kamar lama→inspeksi, kamar baru→OCCUPIED. Detail di §D-20. | **F4-8 SELESAI**. |
| D-23 | **AI Owner/Admin manual-only.** DeepSeek/API AI berbayar hanya dipakai setelah tombol manual Owner/Admin ditekan; AI membuat draft/rekomendasi dan manusia approve aksi final. Tidak ada AI otomatis dari cron/page-load; tidak ada akses Tenant/Staff; tidak ada mutasi uang/stok/kamar/KTP/jurnal tanpa approval manusia. | Fase G `docs/M12_AI_OWNER_ADMIN.md`; checklist M10. |
| D-24 | **BATAS PENGHUNI PER KAMAR + SURCHARGE EKSTRA** (2026-06-23). Kamar **standar** (2,5×3m): **2 orang gratis**, maks booking **4 orang** (2 ekstra). Kamar **besar** (3×3,5m): **4 orang gratis**, maks booking **6 orang** (2 ekstra). Kelebihan orang di atas batas gratis = **+20% harga sewa per kepala ekstra** (per term: harian/mingguan/bulanan/dst.). Batas +2 orang karena **extra bed mengisi hampir seluruh lantai kamar** sehingga kamar tidak lagi nyaman untuk bergerak. Lebih dari batas hard cap **ditolak sistem**. Penambahan 1-2 orang ekstra **BOLEH tapi TIDAK DIREKOMENDASIKAN** — sistem wajib menampilkan peringatan merah. Saran sistem: upgrade ke kamar besar jika tersedia. Diimplementasikan di `pricing.helper.ts` (`ROOM_MAX_FREE_OCCUPANTS`, `ROOM_MAX_OCCUPANTS`, `calculateOccupantSurcharge`) + `Stay.occupantCount`. | **Selesai 2026-06-23.** |
| D-25 | **NOMOR WA ADMIN = SETTING OPERATIONAL** (2026-07-02). Nomor WhatsApp admin/owner TIDAK BOLEH hardcode. Disimpan di `OperationalSetting.adminWhatsappNumber` dan bisa diubah oleh OWNER via halaman Settings. Semua link WA di aplikasi (landing, katalog, auth, portal tenant, portal staff) membaca dari setting ini + env var `VITE_PUBLIC_ADMIN_WHATSAPP` sebagai fallback compile-time. | **Task: update OperationalSetting + PublicConfig + frontend.** |

---

#### R — ATURAN RETENSI & RENEWAL (R1-R5)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| R1 | Tenant lama punya **prioritas eksklusif sampai hari-H tanpa wajib DP dulu**. | F2-1 state machine. |
| R2 | DP 30% perpanjangan → **pelunasan maks H+7 dari DP.** Grace boleh lewat kontrak. | F2-1. |
| R3 | **Gagal lunas H+7 → forced checkout + DP hangus + potong deposit.** | F2-1/F3-14. |
| R4 | Prompt via **notif H-10 + tenant boleh ajukan sendiri.** | F2-2 notif. |
| R5 | **TIDAK → kamar langsung dibuka publik** mulai tanggal checkout. | F2-1 state machine. |

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

- F-01: Cashflow salah deteksi AR sebagai cash → F1-3
- F-02: Operator precedence bug expense ratio → F1-4
- F-09: DRAFT masuk revenue → F1-7
- F-10: Deposit masuk operating cashflow → F1-9
- F-17: Balance sheet imbalance → F1-5
- F-18: Ratio AR sebagai cash → F1-4
- F-24: Settlement tanpa receipt journal → F1-8

#### K — KPI & TIKET

- K-5: monthRange UTC → F2-14 WIB
- K-1: resolved time dari assignedAt → bagian F3-19
- K-6/K-8: notif penerima salah → F3-1

#### L — LOYALITAS (BARU)

- **D-16:** Rent-loyalty — no rent hike while renewing (cross-ref D-16 di atas).

#### S — APPROVAL SCHEMA

- **S-1 (2026-06-13): Owner MENYETUJUI seluruh perubahan schema ADDITIVE** untuk task ber-marker 🧬/[SCHEMA]: F2-1 (RenewRequest +status/+field), F2-3b (bukti refund), F2-18 (StaffReview.status), F3-14 (Stay.fledMarkedAt), F3-15 (Stay.belongingsDeadline+ABANDONED), F3-17 (Tenant.ktp*), F4-9 (LoyaltyPoint/Reward/Redemption). Dikerjakan berurutan sesuai prioritas `08_CHECKLIST`. **Hanya additive** (tambah enum value/kolom nullable); tak menghapus/mengubah kolom lama. Deploy fresh → schema masuk `schema.prisma` (+ `sql/bootstrap.sql` bila perlu constraint).
- **S-4 (2026-06-15): Owner MENYETUJUI schema additive** (proposal `docs/_PROPOSAL_SCHEMA_F4_S4.md`): **F4-13c** `PeerBehaviorReport` + enum `PeerReportStatus` (quest perbaikan sikap antar-tenant ANONIM — reporter dirahasiakan dari reportee; **konfirmasi membaik oleh A ATAU admin**; B dapat poin +40 saat CONFIRMED); **F4-13 referral** `Tenant.referralCode` + `TenantReferral` + enum `ReferralStatus` (**matching via KODE REFERRAL saat booking publik**; referrer dapat poin +150 saat teman jadi tenant aktif). Nilai poin default (env-override).
- **S-3 (2026-06-15): Owner MENYETUJUI schema additive backlog Fase 4** (proposal `docs/_PROPOSAL_SCHEMA_F4_BACKLOG.md`) **KECUALI F4-13c** (quest perbaikan sikap anonim = DITUNDA, paling kompleks). Disetujui: **F4-12** (FAQ/manual, tanpa schema), **F4-15** (Room: hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays), **F4-13b** (LoyaltyReward: fulfillmentTaskCategory/Title), **F4-14** (User: tip Gopay/Ovo/Dana/Bank — **tip P2P TIDAK dijurnal/direkap**, owner hanya sediakan link), **F4-11** (RenewRequest: prepaidMonths/isEarly), **F4-13a** (RenewRequest: tenantReview/At). Semua additive.
- **S-2 (2026-06-14): Owner MENYETUJUI seluruh schema additive Fase 4** (proposal `docs/_PROPOSAL_SCHEMA_F4.md`): **F4-2** (PushSubscription + enum PushDeliveryStatus + AppNotification.pushStatus/pushAttempts/pushedAt), **F4-1** (RentRecognitionSchedule, pakai COA 2200), **F4-9** (LoyaltyPoint/LoyaltyReward/Redemption + 3 enum), **F4-8** (RoomTransfer). Plus **izin dependency npm `web-push`** (F4-2) dan pola **outbox in-place** (kolom di AppNotification, bukan tabel terpisah). Urutan eksekusi: **F4-2 → F4-1 → F4-9 → F4-8**.

---

#### D-18/D-19 — DETAIL TAMBAHAN (2026-06-14)

##### D-18 — Renewal / prabayar fleksibel kapan saja (backlog F4-11)
- **Aturan:** tenant boleh memperpanjang atau **membayar di muka untuk 2-4 bulan ke depan** dengan **harga bulanan**, **kapan saja** — tidak harus menunggu kontrak lama hampir/sudah habis.
- **Hubungan dengan renewal yang ada (R1-R5):** ini jalur TAMBAHAN ("early renewal / prepay"), bukan pengganti. Prompt H-10 + prioritas tenant lama (R1) tetap berlaku untuk renewal mendekati akhir kontrak; D-18 memperluas agar tenant bisa inisiatif lebih awal.
- **Akuntansi:** prabayar lebih dari 1 bulan = **pendapatan diterima di muka (unearned revenue, COA 2200)** → diakui bertahap per bulan. **Terikat ke F4-1** (RentRecognitionSchedule). Jangan akui seluruh prabayar sebagai pendapatan bulan berjalan.
- **Harga:** mengikuti **rent-lock D-16** — selama tenant terus renew tanpa putus kontrak, harga tidak naik.
- **Desain yang perlu (saat F4-11 dimulai):** titik masuk UI kapan saja (tenant app), pilih jumlah bulan, hitung total = bulan × tarif bulanan, alur pembayaran (no-partial D-02), perpanjangan `plannedCheckOutDate` stay, dan penjadwalan pengakuan pendapatan.

##### D-20 — Pindah kamar resmi (F4-8, keputusan desain 2026-06-15)
- **Stay yang SAMA** dipertahankan (hanya `roomId` diperbarui + dicatat `RoomTransfer`) → histori/loyalitas/masa sewa utuh, tak putus kontrak.
- **Deposit jaminan ikut pindah apa adanya** (tak dihitung ulang; tak ada transaksi uang deposit saat pindah).
- **Harga sewa dikunci** (rent-loyalty D-16) **kecuali override manual oleh OWNER** (mis. upgrade VIP yang tenant setujui; ADMIN tak boleh ubah harga — D-17).
- **Meter kamar baru di-snapshot baseline** saat pindah (seperti check-in).
- **Kamar lama → MAINTENANCE + tiket CHECKOUT_INSPECTION** (lalu AVAILABLE saat inspeksi ditutup); **kamar baru → OCCUPIED**.

##### D-19 — FAQ detail + "manual book" tenant app (backlog F4-12)
- **Tujuan:** tenant dapat membaca **manual/aturan kos** secara mandiri di tenant app → transparansi (openness) + mengurangi pertanyaan berulang ke admin/staf (selaras filosofi tenant-pengawas).
- **Konten:** FAQ **sangat detail**, di-generate dari **semua aturan/flow** (`03_KEPUTUSAN_OWNER` + dossier 10-19) — pembayaran, DP vs deposit, booking, renewal, checkout, deposit refund, overstay, KTP, tiket/keluhan, dll.
- **Penyajian:** menu **"Panduan / Aturan"** di tenant app, **ringkas & berkategori**, JANGAN bikin tenant pusing (hindari tembok teks; pakai kategori + ekspandable + bahasa sederhana).
- **Sumber input tambahan:** (a) **interview owner** soal kemungkinan pertanyaan tenant; (b) owner **paste percakapan WhatsApp** untuk dianalisa (pertanyaan & keluhan yang sering muncul) → diangkat jadi FAQ.
- **Fondasi teknis:** `FaqsModule` (backend `src/modules/faqs/`) sudah ada. Dossier acuan: 17 (publik/UIUX) + 16 (komunikasi).

---

#### D-21 — Keputusan tindak-lanjut AUDIT (2026-06-15, jawaban owner atas temuan `docs/AUDIT_FASE4_FINAL.md`)
- **D-21.1 (AUD-1, pindah kamar):** saat pindah kamar, **utilitas kamar LAMA periode berjalan WAJIB ditagih lebih dulu** — snapshot meter akhir kamar lama → buat tagihan utilitas berjalan SEBELUM `roomId` dipindah. Tidak boleh ada pemakaian tak tertagih. (mengikat ke F4-8 / D-20)
- **D-21.2 (AUD-2 + D-6, tip staf):** info e-wallet staf (GoPay/OVO/Bank/DANA) **diisi sendiri oleh staf** lewat halaman profil self-service. Owner hanya menyediakan fitur; aliran uang tetap P2P, **tidak dijurnal** (F4-14). Perlu UI profil staf + field e-wallet.
- **D-21.3 (AUD-3, cuci AC):** jadwal cuci AC pakai pendekatan **HIBRID** — interval hari sebagai dasar **+ alert dini bila estimasi kWh tinggi** (kWh = watt × jam-pakai/hari). `acWattage` mulai dipakai; perlu data **jam-pakai per kamar** (default wajar bila kosong).
- **D-21.4 (prabayar & poin, A-5/A-6/A-7/B-4) — KEEMPAT diaktifkan:**
  - **A-6:** blokir permintaan prabayar bila tenant masih punya **tagihan menunggak**.
  - **A-7:** beri **poin loyalitas saat prabayar** multi-bulan.
  - **B-4:** poin ON_TIME diberikan untuk **SETIAP invoice** yang dibayar tepat waktu (bukan hanya invoice sewa).
  - **A-5:** izinkan **tarif diskon SMESTERLY/YEARLY** untuk prabayar (bukan hanya tarif bulanan penuh) — owner yang menetapkan tarif diskonnya.

> Catatan eksekusi: D-21 menghasilkan task tindak-lanjut AUD-1..AUD-4 di `08_CHECKLIST.md`.

#### D-22 — Keputusan tindak-lanjut AUDIT MENYELURUH (2026-06-15, jawaban owner atas `AUDIT_MENYELURUH_SEMUA_FASE.md`)
- **D-22.1 (L-1, jurnal warisan best-effort):** pilih **best-effort + AUTO-REKONSILIASI**. Operasi (bayar/check-in/deposit) TETAP jalan walau jurnal gagal; tambah **sweeper rekonsiliasi otomatis** yang rutin mem-backfill jurnal yang bolong (pakai `backfillAutoJournal` yang sudah ada) + **alert owner** bila ada. Laporan tetap benar tanpa pernah memblok operasi harian. (BUKAN blocking penuh.)
- **D-22.2 (AUD-5 + AC vendor):** tiket **cuci AC dibuat TANPA assignee** → admin memilih: tugaskan **staf internal** ATAU tandai **vendor luar** (biaya tetap dicatat owner sbg expense, lihat F4-15/C-5). Tiket **sistem lain** (inspeksi checkout, reward→tugas, pindah kamar) **di-round-robin ke staf internal saat staf ≥2** (dorman saat 1 staf). Perlu penanda "vendor" pada tiket AC.
- **D-22.3 (AUD-4, FAQ awal):** **YA — seed FAQ awal** dari `03_KEPUTUSAN_OWNER` + dossier (pembayaran, DP vs deposit, booking, renewal, checkout, deposit, overstay, KTP, tiket, dll); owner tinggal edit. Tetap bisa diperkaya dari interview/WhatsApp nanti.
- **D-22.4 (B-9, referral di portal):** **YA — tambah field kode referral di alur booking admin/portal** agar referral tetap tercatat walau teman dibooking-kan admin (pakai `TenantReferral` yang ada).

> Catatan eksekusi: D-22 + D-21 menjadi **Fase 5 (tindak-lanjut audit)** di `08_CHECKLIST.md`.

- **S-5 (2026-06-15): Owner MENYETUJUI schema additive Fase 5** (migration `20260615140000_s5_ac_usage_vendor`): **`Room.acUsageHoursPerDay Float?`** (AUD-3, estimasi kWh hibrid; null→default konstanta) + **`Ticket.handledByVendor Boolean @default(false)` + `Ticket.vendorNote String?`** (AUD-5, tiket cuci AC oleh vendor luar → keluar round-robin/KPI staf). Murni additive (kolom baru nullable/default), aman `migrate deploy`. Owner: "Setujui + mulai semua".

---

---

## W-00 — Decision Register (Fase W Audit 2026-06-30)

**Dibuat:** 2026-07-01 | **Sumber:** Fase W — Project Status Gate

### Status: ✅ Sudah Terkunci di Kode

| Keputusan | Status | Implementasi | Dicatat |
|-----------|--------|-------------|---------|
| STAFF boleh lihat `analytics/finance/summary`? | **TIDAK** — OWNER/ADMIN only | `@Roles(OWNER, ADMIN)` di controller | ✅ |
| STAFF boleh lihat `wifi-sales`? | **READ-ONLY** — GET, tidak create/update/delete | `@Roles(OWNER, ADMIN, STAFF)` di GET, `@Roles(OWNER, ADMIN)` di POST/PATCH/DELETE | ✅ |
| `RoomStatus.BOOKING` dihapus? | **SUDAH** — tidak ada di schema/enum sejak migrasi Fase V | Enum hanya: `AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, INACTIVE` | ✅ |

### 🟡 Butuh Keputusan Owner

| # | Keputusan | Rekomendasi AI | Dampak | Ditentukan |
|---|-----------|---------------|--------|------------|
| W-00-D1 | **ADMIN** boleh jalankan AutoOps finance-heavy? | **DIPUTUSKAN OWNER (2026-07-01):** `depreciation` + `recurring-expenses` → **OWNER-only**. ADMIN = operasional; OWNER = investor (rasio, laporan). OWNER bisa toggle ke Admin Mode kapan saja. | Guard di `auto-ops.controller.ts`: `@Roles(OWNER)` untuk depreciation + recurring-expenses. ADMIN tetap bisa run sweeps non-finance. | ✅ **Diputuskan** |
| W-00-D2 | **JWT** tetap `localStorage` untuk rilis awal? | **Ya, untuk MVP.** Roadmap pindah ke httpOnly cookie + refresh-token rotation setelah go-live stabil. | Risiko XSS terdokumentasi; mitigasi: CSP ketat, no raw HTML/eval, protected media, logout → clear token. | **Sementara: localStorage** |
| W-00-D3 | **Upload registry** perlu migration schema? | **Mulai tanpa schema** — tracking via service-level Map + file naming convention. Migration ditunda setelah go-live. | W-06 tetap bisa audit + validasi MIME/path tanpa schema baru. | **Tanpa schema dulu** |

### Dampak ke Task Lain

| Task | Dependensi ke W-00 | Jalan |
|------|-------------------|-------|
| W-05 (AutoOps) | Butuh W-00-D1 | Buat guard `isFinanceHeavy` di AutoOps, OWNER-only sesuai rekomendasi |
| W-02 (Auth/Session) | Butuh W-00-D2 | Dokumentasi risiko + mitigasi jangka pendek; tidak perlu refactor httpOnly |
| W-06 (Upload Registry) | Butuh W-00-D3 | Kerjakan tanpa schema — service-level registry |

---

**Akhir dokumen.** Semua keputusan di atas mengikat. Detail implementasi & kode spesifik → dossier domain `10`-`19`. Peta fase → `00_BLUEPRINT.md §4`.
