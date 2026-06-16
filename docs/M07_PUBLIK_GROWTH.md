# KOST48 V5 - Publik, Marketing, UI/UX, Gamifikasi, Growth

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Permukaan publik dan pertumbuhan: marketing, UI/UX, loyalitas, gamifikasi, referral, tip staf, dan proposal growth.

## Sumber Digabung

- `docs/17_PUBLIK_MARKETING_UIUX.md` - konten dipertahankan
- `docs/19_GAMIFIKASI_LOYALITAS.md` - konten dipertahankan
- `docs/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md` - konten dipertahankan

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

MKT-4 CAC/CLV Dashboard selesai (DeepSeek V4 Pro + offline fallback). Audit keuangan LULUS — akuntansi akurat mendukung insight marketing. Detail: `docs/M04_KEUANGAN.md`.

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.

## Konsep Baru - Public Marketing Modern (2026-06-16)

Arahan owner: tema warna dan konten KOST48 tetap seperti sekarang, tetapi konsep web publik dibuat lebih modern,
lebih berkesan, dan lebih "hidup" seperti referensi Marshiba. Referensi dipakai untuk rasa presentasi
(immersive, playful, berani, CTA kuat), bukan untuk menyalin warna, aset, teks, atau karakter.

### Prinsip arah visual

- **Brand KOST48 tetap utama.** Warna, lokasi, harga, fasilitas, aturan booking, dan copy utama tidak diganti
  tanpa keputusan owner. Yang berubah adalah komposisi, ritme section, gerak halus, kedalaman visual, dan
  kekuatan CTA.
- **Modern tetapi tetap kos nyata.** Jangan terlalu meme/cartoon; KOST48 harus terasa aman, bersih, praktis,
  dan bisa dipercaya. Gaya playful dipakai secukupnya untuk membuat landing page mudah diingat.
- **Hero immersive.** First viewport harus langsung menjual KOST48: lokasi Surabaya Barat/Pakuwon-PTC,
  kamar siap huni, booking online, dan visual kamar/gedung/fasilitas. Gunakan foto nyata sebagai sinyal utama,
  bukan ilustrasi abstrak.
- **Navbar capsule/sticky.** Inspirasi Marshiba: navigasi rounded, kontras, sticky, dengan CTA booking yang
  menonjol. Pada mobile, CTA tetap mudah dijangkau tanpa menutup konten penting.
- **Section seperti story.** Alur publik bukan daftar fitur kaku, tetapi perjalanan: kenapa pilih KOST48,
  lihat kamar, pahami fasilitas, percaya dari bukti, lalu booking.
- **CTA berlapis.** CTA utama: "Lihat Kamar" / "Booking Sekarang". CTA sekunder: WhatsApp, Google Maps,
  aturan kos, dan cek ketersediaan. CTA harus jelas, tidak memaksa, dan konsisten dengan first-paid-wins.

### Data marketing yang wajib diangkat

- **Lokasi:** Jl. Hikmah V No. 48, Surabaya Barat, dekat Pakuwon/PTC.
- **Booking online:** katalog kamar, detail kamar, submit booking, dan status pembayaran via app.
- **Kepercayaan:** social proof dari ulasan visible rating >=4, jumlah penghuni aktif, Google Maps, CCTV,
  dan alur pembayaran yang transparan.
- **Efisiensi listrik:** kamar punya kipas + AC, kuota listrik gratis 30 kWh, pascabayar tanpa repot token,
  cocok untuk tenant yang ingin hemat.
- **Kamar prima:** foto kamar nyata, fasilitas per kamar, status ketersediaan, dan info maintenance jujur.
- **Layanan cepat:** kerusakan wajar seperti lampu, kran, shower, atau kebocoran ditangani gratis bila
  tenant lapor lewat app.
- **Retensi dan loyalitas:** poin tenant untuk renewal, bayar tepat waktu, review, referral, tiket tervalidasi,
  dan quest onboarding. Narasi publik: tinggal di KOST48 bukan hanya sewa kamar, tetapi masuk sistem kos
  yang rapi dan menghargai tenant baik.
- **Diferensiasi kompetitor:** banyak kos belum punya web app, booking online, dashboard tenant, meter listrik
  transparan, loyalty, dan laporan kerusakan digital.

### Struktur landing page yang disarankan

1. **Hero publik modern**
   - Foto/visual kamar atau gedung sebagai visual utama.
   - Headline singkat tentang kos Surabaya Barat yang praktis, transparan, dan bisa booking online.
   - CTA utama ke katalog kamar; CTA sekunder ke WhatsApp/Maps.
   - Micro-proof: rating, penghuni aktif, lokasi, atau "booking dan bayar bisa dipantau dari app".

2. **Kamar tersedia**
   - Card kamar dibuat lebih premium: foto besar, harga, fasilitas, status, badge hemat listrik, CTA detail.
   - Filter tetap jelas: "Semua Kamar" tidak boleh membingungkan bila ada kamar maintenance.
   - Loading memakai skeleton yang terasa polished.

3. **Kenapa KOST48**
   - 4 sampai 6 benefit berbasis data: booking online, 30 kWh gratis, CCTV, dekat Pakuwon/PTC, lapor kerusakan
     via app, loyalty tenant.
   - Bentuk visual boleh memakai card sedikit playful/offset seperti referensi, tetapi tetap rapi dan mudah
     dibaca.

4. **Cara booking**
   - Timeline sederhana: pilih kamar, isi data, bayar DP/pelunasan, kamar terkunci setelah pembayaran valid.
   - Harus jujur terhadap aturan first-paid-wins.

5. **Bukti dan social proof**
   - Rating agregat, ulasan visible, jumlah penghuni aktif, dan narasi singkat tenant.
   - Jika data ulasan belum cukup, tampilkan empty state yang jujur, bukan klaim palsu.

6. **Living system**
   - Section yang menjual app sebagai nilai tambah: invoice jelas, riwayat sewa, laporan kerusakan, loyalty,
     referral, dan dashboard tenant.
   - Ini menjadi bagian "canggih" KOST48 tanpa mengubah bisnis kos menjadi gimmick.

7. **FAQ dan aturan penting**
   - FAQ ringkas tentang pembayaran, DP, listrik, maintenance, renewal, dan aturan umum.
   - Hindari teks panjang di landing; detail bisa masuk halaman Panduan/Aturan.

### Fitur frontend yang boleh dimaksimalkan

Stack saat ini: React 18, Vite 5, React Query, Bootstrap/React-Bootstrap, Recharts, PWA, CSS custom.
Gunakan kemampuan ini semaksimal mungkin sebelum menambah dependency baru.

- **React Query:** prefetch detail kamar dari card yang di-hover/focus, cache katalog, dan optimistic feel pada
  interaksi publik yang aman.
- **Vite code-split:** landing, detail kamar, dashboard publik, dan chart tidak boleh membuat first-load berat.
- **CSS modern:** sticky capsule nav, scroll reveal berbasis IntersectionObserver, `content-visibility` untuk
  section bawah, image aspect-ratio stabil, responsive grid yang tidak layout shift, dan `prefers-reduced-motion`.
- **PWA:** install prompt tetap halus; publik boleh diberi pesan "akses cepat dari HP" setelah user engage,
  bukan popup agresif.
- **Recharts:** hanya untuk visual yang benar-benar menjual data, misalnya okupansi/kepercayaan bila datanya
  valid. Jangan visualkan angka yang belum siap.
- **Media optimization:** foto kamar harus lazy-loaded, punya dimensi stabil, dan idealnya disiapkan dalam
  ukuran web yang wajar agar LCP tetap bagus.
- **Motion:** gunakan animasi CSS/native ringan. Library animasi baru hanya dipakai bila ada manfaat nyata dan
  tidak merusak performance budget.

### Batasan kualitas

- Lighthouse SEO tetap target >=90; baseline terakhir home = 100.
- LCP halaman publik target <2.5s di koneksi mobile layak.
- Tidak boleh ada teks menumpuk, CTA menutup konten, atau card berubah ukuran saat hover.
- Semua klaim marketing harus punya sumber dari data sistem, keputusan owner, atau konten manual owner.
- Aksesibilitas tetap dijaga: kontras, fokus keyboard, alt text foto, dan reduced motion.
- Mobile-first: landing harus terasa selesai di HP, bukan hanya bagus di desktop.

### 🆕 UI/UX Publik — Arahan Owner 2026-06-17 (untuk implementasi)

Semua saran owner dari walkthrough `http://localhost:5173/` — sudah dipetakan ke task ID `PUB-*`.

#### A. Navigasi, Tombol & Ikon
- **PUB-ICON** — Tambah ikon SVG/emoji di: fasilitas kamar, CTA, section header, navbar, badge status. Tanpa library baru (pakai emoji + CSS).
- **PUB-CTA-AUDIT** — Kurangi duplikasi tombol "Cek Kamar Tersedia". Cukup 1 di hero + 1 sticky di navbar. Sisanya ganti link teks ringan.
- **PUB-REMOVE-PREF** — Hapus tombol "Ubah Preferensi Tinggal" dari halaman publik (tidak berguna).
- **PUB-LOGIN-BTN** — Tambah tombol "Masuk Portal" di navbar publik, mengarah ke `/login`.

#### B. Kalender Ketersediaan Cerdas
- **PUB-CALENDAR** — Backend `GET /public/rooms/availability-calendar?from&to`: return grid per tanggal per kamar (KOSONG/BOOKING_DP/HUNI). Frontend: tampilan timeline horizontal 2 minggu/bulan.
- **PUB-CALENDAR-RENEW** — Kamar dengan stay ACTIVE + `plannedCheckOutDate` ≤ 14 hari → badge "Mungkin Tersedia" + catatan tenant mungkin perpanjang.
- **PUB-CALENDAR-CHECKOUT** — Tenant durasi pendek (DAILY/WEEKLY/BIWEEKLY) + stay dengan checkout request APPROVED → badge "Akan Kosong [tanggal]".
- **PUB-SMART-BOOKING** — Kamar dengan booking ber-DP checkIn tgl 30 masih bisa dipesan harian/mingguan sebelum tgl 30. Backend: `GET /public/rooms?checkIn&durationDays` — filter room yang available di seluruh rentang.

#### C. Kartu Kamar, Badge & Tombol
- **PUB-BADGE-STATUS** — Badge warna: Hijau="Tersedia", Merah="Terisi", Kuning="Dipesan", Abu-abu="Maintenance".
- **PUB-BTN-COLOR** — Tersedia→biru "Ajukan Booking", Maintenance→outline/wa "Tanya Ketersediaan", Terisi→disabled "Penuh".
- **PUB-FACILITY-SHOW** — Tampilkan 4-5 ikon fasilitas utama di card kamar (kamar mandi dalam/luar, AC/kipas, ukuran). Backend: tambah `RoomFacility.isMainFacility`.
- **PUB-ROOM-CATEGORY** — Field baru `Room.category` (ECONOMY, STANDARD, DELUXE) + `Room.type` (REGULAR, MEZZANINE). Badge kategori di card + filter drop-down. Untuk marketing, owner bisa petakan ulang kategori nanti via Settings.
- **PUB-PHOTO-RATIO** — CSS `aspect-ratio: 1/1; object-fit: cover` untuk semua foto kamar.

#### D. Responsif & Foto
- **PUB-CARD-RESPONSIVE** — Grid: 4 kolom desktop, 2 tablet, 1 mobile. Card stack vertikal di mobile.
- **PUB-FACILITY-PHOTO** — Owner upload 1 foto real per fasilitas via Settings. Tampil di halaman publik.
- **OWN-FOTO-UPLOAD** — Backend: endpoint CRUD foto marketing + foto fasilitas di Settings Owner. Frontend komponen upload + preview.
- **PUB-BROCHURE** — Section "Galeri KOST48" di landing — tampil foto brosur/spanduk yang di-upload owner.

#### E. Ulasan & Social Proof
- **PUB-REVIEWS** — `GET /public/reviews` ambil dari `StaffReview` VISIBLE rating≥4. Embed Google Maps reviews via iframe. Section "Apa Kata Penghuni".
- **PUB-REVIEWS-FILTER** — Tab filter: "Terbaru" / "Rating Tertinggi". Default rating ≥4, max 10.

#### F. Booking Flow & KTP
- **PUB-BOOKING-INFO** — Di halaman login: teks "Belum punya akun? Booking kamar dulu — akun Anda dibuat otomatis."
- **PUB-BOOKING-FORM** — Ubah validasi booking: `phone` XOR `email` wajib (minimal salah satu). Field lain optional, dilengkapi di portal tenant.
- **PUB-KTP-OCR** — Tambah dependency Tesseract.js (~2MB gzip). Setelah upload foto KTP → OCR offline ekstrak nama + NIK → auto-isi form. Backend simpan hasil OCR.
- **TEN-PROFILE-NOTIF** — Endpoint `GET /me/profile-completeness`. Di portal tenant, badge "Lengkapi Profil" + daftar field belum diisi (nama, telepon, email, KTP, kontak darurat, dll).

### Backlog desain (diperbarui 2026-06-17)

| ID | Deskripsi | Status |
|----|-----------|--------|
| **MG-UI-01** | Re-theme landing publik (hero immersive, capsule nav, CTA kuat, section story, card premium) | ⏳ Diperluas — lihat arahan owner §A-F |
| **MG-UI-02** | Komponen proof strip (rating, penghuni aktif, lokasi) | ⏳ Menunggu PUB-REVIEWS |
| **MG-UI-03** | Section "Living System" (invoice, riwayat, lapor, loyalty, referral) | ⏳ |
| **MG-UI-04** | Audit + upload foto marketing via Settings owner | ⏳ Menunggu OWN-FOTO-UPLOAD |
| **MG-UI-05** | Playwright screenshot desktop/mobile + Lighthouse ≥90 | ⏳ Setelah semua A-F selesai |
| **PUB-UI-REVAMP** | **Task besar** — semua item A–F di atas | **P0** — daftar sub-task di M10 |

### Prioritas productisasi analisa bisnis (owner setuju 2026-06-16)

Analisa bisnis tidak dibuat sebagai halaman teori, tetapi diubah menjadi fitur yang membantu owner menjual,
memilih kanal akuisisi, dan menjaga retensi. Urutan ini menjadi prioritas setelah konsep marketing modern
disetujui.

1. **P0 - MKT engine.** Buat konten analisa owner-editable: SWOT/PESTLE, value proposition,
   pembanding kompetitor, proof source, dan kebijakan layanan. Simpan sebagai `BusinessNarrative`
   atau `AppSetting` agar bisa dipakai ulang tanpa hardcode copy.
2. **P1 - Narasi publik otomatis.** Turunkan MKT engine menjadi copy untuk landing page, katalog kamar,
   onboarding tenant, FAQ ringkas, dan section "Living System". Klaim harus berasal dari data sistem,
   keputusan owner, atau input owner.
3. **P2 - Survey guest/prospek.** Tambahkan survey singkat untuk calon tenant: asal kanal, alasan memilih,
   hambatan booking, budget, prioritas fasilitas, dan alasan batal. Hasilnya masuk ke analisa SWOT/PESTLE
   dan dashboard growth.
4. **P3 - CAC/CLV lite dashboard.** Lead source sudah ada; lanjutkan menjadi ringkasan owner per bulan:
   bookingSource, jumlah booking, booking yang menjadi stay aktif, renewal rate, rata-rata lama tinggal,
   referral/loyalty impact, dan estimasi CLV. Paid CAC hanya boleh tampil bila biaya iklan diinput.
5. **P4 - Advanced finance/strategy nanti.** DCF, Altman, DuPont, sensitivity/stress analysis, market-share
   formal, dan BCG kuantitatif ditunda sampai data produksi stabil. Untuk sekarang cukup dipakai sebagai
   kerangka interpretasi, bukan modul aplikasi.


## Bagian 1 - `docs/17_PUBLIK_MARKETING_UIUX.md`

### DOSSIER 17 — PUBLIK, MARKETING & UI/UX
**Domain:** katalog publik, SEO, funnel akuisisi, social proof, UI/UX seluruh app, visualisasi/chart. **Flow 2-publik + frontend.**
**Status:** Funnel & UX 🟢 baik. SEO dasar dan social proof selesai diimplementasikan 2026-06-14; validasi Lighthouse SEO masih tertunda dan database lokal belum memiliki ulasan visible.
**File inti:** `marketing-public-rooms.service.ts` (304), `frontend/index.html`, `PublicRoomsPage.tsx`, `PublicRoomDetailPage.tsx`, `PublicGuestDashboardPage.tsx`, `App.tsx`, 13 file pakai Recharts.
**🆕 Backlog (D-19 / F4-12, 2026-06-14):** menu **"Panduan/Aturan" (manual book) di tenant app** — FAQ detail di-generate dari semua aturan/flow (`03_KEPUTUSAN_OWNER` + dossier), disajikan ringkas & berkategori (openness, jangan bikin tenant pusing). Input: interview owner / analisa WhatsApp. Fondasi `FaqsModule` ada. Detail di `03_KEPUTUSAN_OWNER §D-19`.

---
#### 1. Aturan bisnis / konteks
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** (D-01 — frontend benar, docs sudah dikoreksi). SEO/copy pakai ini.
- **Retensi > akuisisi** untuk kos: prioritas renewal (dossier 11) + gamifikasi (dossier 19) di atas SEO. Tapi SEO tetap menutup kebocoran funnel atas.
- **Harga formula konsisten** (dossier 11 §1). CTA jujur first-paid-wins ("belum terkunci sebelum pembayaran valid").
- **Lead source** (M-08): enum `LeadSource` 10 kanal ada tapi booking publik hardcode WEBSITE → kanal akuisisi tak terukur (CAC).
- **V-1 code-split SUDAH terpasang** untuk 4 halaman publik termasuk PublicGuestDashboard; sisa F2-11: CSS ring, skeleton detail, pagination 12, sticky CTA, dan grid tablet.

#### 2. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| UD-01/M-05 | ✅ TERSELESAI | Alamat kontradiktif frontend vs docs — owner konfirmasi Surabaya Barat; docs dikoreksi. | index.html vs docs | SELESAI (D-01) |
| UD-02 | ✅ RESOLVED | Data-truth kontradiksi lokasi — frontend "Surabaya Barat" vs docs "Ngagel Jaya Utara" — owner konfirmasi Surabaya Barat. Cross-ref UD-01. | index.html vs docs | RESOLVED (D-01) |
| UD-06 | 🟠 P2 | Room card mobile layout overflow di tablet (768-1024px) — card kamar meluber keluar container saat 2+ kolom grid. | `PublicRoomsPage.tsx` responsive grid | **F2-11**: fix grid breakpoint tablet |
| UD-07 | 🟡 P3 | Public room filter "Semua" mencakup MAINTENANCE rooms — canBook=false benar tapi UX membingungkan karena filter bernama "Semua" padahal sebagian non-bookable. | `PublicRoomsPage.tsx` filter | **F3-12**: rename filter ke "Semua Kamar" + badge "Termasuk yang sedang dicek" |
| V-3 | 🟡 P3 | Chart Recharts tidak punya fallback empty state — saat data kosong, chart area blank tanpa pesan "Belum ada data". | seluruh komponen Recharts (13 file) | **F3-12**: empty-state component + "Belum ada data" |
| V-6 | 🟡 P3 | DonutGauge color contrast rendah di mobile dark mode — teks persentase tidak terbaca di layar kecil. | `DonutGauge.tsx` | **F3-12**: perbaiki contrast ratio ≥4.5:1 |
| M-01 | ✅ RESOLVED (L-5, 2026-06-15) | OG/Twitter Card, JSON-LD, canonical, robots, sitemap tersedia. **Lighthouse SEO = 100/100** (LH 12.8.2, headless Chrome atas build dist, halaman home; 10 audit lulus). SPA tetap bergantung crawler render JS untuk per-route, tapi shell home (paling penting SEO) sempurna. | `frontend/index.html` + `public/` | **F3-3 + L-5 selesai** |
| M-06 | ✅ TERSELESAI | Social proof publik sudah tersedia dengan agregat rating, ulasan visible rating≥4 anonim, dan count penghuni aktif. Dataset lokal saat UAT belum memiliki ulasan visible. | pages/public | **F3-4 selesai 2026-06-14** |
| V-1 | 🟡 PARSIAL | PublicGuestDashboard dan 3 halaman publik lain sudah lazy/code-split; Recharts masih ada di chunk halaman dan CSS ring belum dikerjakan. | `App.tsx`, `PublicGuestDashboardPage.tsx` | **F2-11** lanjut CSS ring |
| UD-03 | 🟡 P3 | W-02 skeleton & W-03 pagination katalog belum (error-state detail sudah ada). | `PublicRoomsPage/PublicRoomDetailPage` | **F2-11** skeleton+pagination 12 |
| UD-04 | 🟡 P3 | Chart owner all-zero render sumbu palsu + "−100%" basis nol. | `OwnerDashboardPage` | **F3-12** empty-state all-zero + "—" |
| V-2 | 🟡 P3 | Donut "Level Risiko" merah penuh utk n=1 → terbaca krisis. | `PaymentReviewPage` | **F3-12** count utk n<5 |
| UD-05 | 🟡 P3 | CTA detail kamar tak sticky (mobile); klaim "7 menit" tanpa sumber. | publik | **F2-11**/F3-12 |
| M-02/M-04/M-09/V-5/V-7 | 🟡/INFO | pricing mentah bisa 0 vs term; 76 foto hardcode di service; filter term tak menyaring; palet belum colorblind-safe; seri Laba redundan. | berbagai | **F3-11**/F3-12 |

#### 3. Task
- **F3-3 · FASE 3 (SELESAI 2026-06-14; diukur L-5 2026-06-15):** `index.html` memuat OG/description/Twitter Card/canonical dan JSON-LD `LodgingBusiness`; `robots.txt` serta `sitemap.xml` tersedia. **Lighthouse SEO = 100/100 (TERUKUR)** — LH 12.8.2 headless Chrome atas build `dist` (server statis lokal port 4178), halaman home; 10 audit SEO lulus, structured-data N/A (cek manual). Target ≥90 terlampaui.
- **F3-4 · FASE 3 (SELESAI 2026-06-14):** endpoint publik read-only hanya mengekspos StaffReview VISIBLE rating≥4 dengan inisial tenant, agregat rating, ulasan terbaru, dan count penghuni aktif terpromosi. UAT real DB: 11 penghuni, 0 ulasan visible.
- **F3-7 · FASE 3 (SELESAI 2026-06-14):** endpoint owner `/api/reports/occupancy-daily?from&to` dan heatmap CSS-grid 12 bulan historis + 3 bulan proyeksi. Rentang maksimal 550 hari; checkout aktual eksklusif dan planned checkout dipakai untuk proyeksi.
- **F2-11 · FASE 2 (SELESAI 2026-06-14):** V-1 (lazy/code-split) + W-02 skeleton + W-03 pagination 12 + UD-05 sticky CTA + UD-06 fix tablet grid. Build LULUS (94 chunk, PWA verify ok).
- **F3-11 · FASE 3 (SELESAI 2026-06-14):** **M-08** lead source SUDAH lengkap di kode — check-in wizard admin punya dropdown `bookingSource` 10 kanal, backend `stays` simpan `bookingSource/Detail` + filter query (CAC terukur); booking publik tetap `WEBSITE` (benar). **M-04** ~76 foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (perilaku resolve identik). tsc 0.
- **F3-12 · FASE 3 (PARSIAL 2026-06-14):** ✅ **V-5** palet Okabe-Ito colorblind-safe (`components/charts/chartPalette.ts` dipakai SmartChartPanel + HorizontalBarChart + DonutGauge + PaymentReview); ✅ **V-2** count untuk n<5 di donut "Level Risiko" PaymentReview (hindari lingkaran 100% merah palsu); ✅ **V-6** kontras teks tengah DonutGauge (CSS `--text-main/--text-muted`); ✅ **UD-07** rename filter "Semua" → "Semua Kamar" + hint "termasuk terisi & sedang dicek"; ✅ **V-3** empty-state donut sudah ada di SmartChartPanel. **Tertunda:** **UD-04** (OwnerDashboard all-zero — butuh telaah chart owner lebih dalam), **V-7** (kurangi seri Laba redundan), + 7 rekomendasi visual baru. `frontend npm run build` LULUS (95 chunk, PWA ok). _Catatan: update CHANGELOG/CHECKLIST F3-12 tertunda — file dipegang agen renewal yang aktif._
- **Audit WCAG 1 sesi:** axe-core 5 halaman (login, katalog, detail, submit payment, review payment).

#### 4. Rekomendasi visualisasi (Recharts, tanpa lib baru)
Prioritas: **#1 Occupancy Heatmap kalender SELESAI 2026-06-14** (CSS grid, rentang historis+berjalan+depan per D-15). #2 Cashflow Area, #3 Revenue Waterfall, #4 KPI Bullet, #5 Booking Funnel, #6 Sparkline rasio — **SETELAH** fix laporan F1 (jangan visualkan angka salah). #7 Treemap profitabilitas → tunda (butuh unit economics). Sankey DITOLAK (funnel linier cukup bar).

#### 5. Definisi "hijau penuh" + pengukuran
- 1 alamat konsisten (✅), Lighthouse SEO ≥90, JSON-LD valid, terindeks Google; social proof tampil; ≥80% booking punya bookingSource ≠ default; performa publik tanpa recharts first-load; LCP detail <2.5s.
- **Kanal akuisisi (CAC):** groupBy bookingSource/bulan pasca F3-11. **Retensi (CLV):** renewal + gamifikasi (dossier 11/19).


## Bagian 2 - `docs/19_GAMIFIKASI_LOYALITAS.md`

### DOSSIER 19 — GAMIFIKASI & LOYALITAS TENANT
**Domain:** program poin loyalitas tenant + reward (retensi). **Fitur BARU (F4-9) — belum ada di kode.** Ide owner.
**Status:** 🟢 SELESAI (F4-9, 2026-06-15) — schema + poin (4 trigger) + katalog + redemption (jurnal M4) + frontend tenant/admin. Ide perluasan = §2b (backlog F4-13/F4-14).
**Tujuan:** retensi (CLV ↑) + kumpulkan data marketing sukarela ("kayak game biar happy") + onboarding minimal (nama+HP+KTP, sisanya via quest).

---
#### 1. Aturan bisnis
- **Poin tidak dapat dipindahtangankan**, hanya tenant ber-stay aktif.
- **Reward DICATAT AKURAT di akuntansi** (M4) — bukan promosi siluman; laporan tetap jujur.
- **Penukaran WAJIB konfirmasi admin/owner** (M3), terutama diskon sewa (dampak pendapatan).
- **Rent-loyalty (D-16): tenant yang perpanjang (renew) tanpa putus kontrak TIDAK mengalami kenaikan harga sewa. Harga hanya bisa naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru).** Ini memperkuat retensi & gamifikasi — tenant loyal dilindungi dari inflasi sewa.

#### 2. Sumber poin (M1 — keempat ✅ IMPLEMENTASI SELESAI F4-9 inc.2/inc.4, 2026-06-15)
| Aktivitas | Pemicu | Poin (default, env-override) | Status |
|---|---|---|---|
| Perpanjang kontrak | renewal COMPLETED | +100 | ✅ |
| Bayar tepat waktu | invoice PAID & paidAt ≤ dueDate | +50 | ✅ |
| Lapor masalah & tervalidasi | tiket PORTAL tenant → CLOSED (divalidasi admin) | +30 | ✅ |
| Selesai quest onboarding | semua field profil terisi (kecuali KTP) | +200 sekali | ✅ |

##### 2b. Sumber poin TAMBAHAN (ide owner 2026-06-15 — SEMUA ✅ SELESAI)
| Ide | Konsep | Status |
|---|---|---|
| **Review saat renewal** (+30) | Tiap perpanjangan, tenant beri review/masukan → poin. | ✅ F4-13a (idempotent `RENEWAL_REVIEW:id`). |
| **Referral teman** (+150) | Tenant punya `referralCode`; teman pakai saat booking → referrer dapat poin saat teman jadi tenant aktif. | ✅ F4-13 referral (S-4: `TenantReferral`, sweeper `runReferralRewards`). |
| **Quest perbaikan sikap** (+40) | A lapor B (**anonim**); admin moderasi; B diberi tahu tanpa identitas A; B perbaiki; **A atau admin** konfirmasi → B dapat poin. | ✅ F4-13c (S-4: `PeerBehaviorReport`, privasi pelapor dijaga). |
| **Reward → tugas staf** | Reward SERVICE_ADDON yang menukar poin jadi perintah staf (bersihkan area umum/dapur/kamar mandi luar). | ✅ F4-13b (`LoyaltyReward.fulfillmentTaskCategory` → auto-create tiket). |

#### 3. Katalog reward (M2 — contoh, owner finalkan)
| Reward | Poin | Tipe | Catatan |
|---|---|---|---|
| Diskon sewa 5% | 500 | Diskon invoice | 1×/periode, admin approve. Akuntansi: jurnal diskon. |
| WiFi premium 1 bulan | 300 | Add-on layanan | |
| Token listrik gratis 50kWh | 200 | Diskon meter | |
| "Kamar Legendaris" badge | 1000 | Status + marketing | Bisa dipajang di katalog publik |
| Merchandise / gimmick fisik | 150 | Fisik | |

> **Preferensi owner (2026-06-15):** utamakan reward **layanan in-house** (pembersihan kamar, **cat ulang kamar**, voucher WiFi) daripada diskon sewa — lebih hemat. **Nilai poin:** 1 poin ≈ Rp (env `LOYALTY_POINT_RUPIAH_VALUE`, default Rp100); admin form menyarankan biaya poin dari nilai rupiah reward (F4-9 selesai).
> **Reward "special request" → tugas staf (backlog F4-13b):** reward yang menukar poin jadi **perintah kerja staf** — mis. bersihkan **kamar mandi luar, area umum, dapur umum**. Saat FULFILLED → auto-create tiket tugas staf (+ jurnal reward M4).

#### 4. Implementasi (F4-9 — Fase 4)
- **Schema:** `LoyaltyPoint`, `LoyaltyReward`, `Redemption` (sourceType/sourceId idempotent seperti jurnal).
- **Akuntansi (M4) — SELARAS KODE (L-3, 2026-06-15):** `postRewardFulfillmentTx` mengklasifikasi per `LoyaltyRewardType`: **RENT_DISCOUNT → DR 4000 (kontra-pendapatan sewa)**, **METER_DISCOUNT → DR 4100 (kontra-pendapatan listrik)**, **SERVICE_ADDON/PHYSICAL → DR 6300 (beban marketing)**; semua CR 2100 (utang reward). BADGE/nilai 0 = tak menjurnal. Fallback aman ke 6300 bila COA pendapatan tak ada. (Sebelumnya semua reward → 6300; kini diskon sewa/listrik benar sebagai pengurang pendapatan. UAT: jurnal seimbang per tipe.)
- **Dashboard tenant:** progress poin + katalog reward + riwayat penukaran.
- **Admin panel:** approve/reject redemption + lihat loyalitas tenant.

#### 5. Catatan
- **Rent-loyalty (D-16):** aturan ini memperkuat gamifikasi — tenant loyal yang terus renew TANPA putus kontrak tidak akan mengalami kenaikan harga. Harga hanya naik jika tenant gagal bayar dan harus re-kontrak sebagai booking baru. Cross-ref dossier 03 (D-16), dossier 11 (renewal), dossier 17 (marketing).
- Program gamifikasi tidak boleh mengganggu integritas akuntansi (semua reward terjurnal).
- Poin expired setelah tenant keluar (tidak carry-over ke booking baru).


## Bagian 3 - `docs/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md`

### PROPOSAL — Marketing, Gamifikasi Tenant, Tip Staf (vision owner 2026-06-16)

Status: vision owner ditangkap; implementasi BERTAHAP. Terkait dossier `17_PUBLIK_MARKETING_UIUX`,
`19_GAMIFIKASI_LOYALITAS`, `15_STAF_TIKET_KPI`. Lihat juga `_PROPOSAL_METER_LISTRIK_AIR.md`.

#### A. Tip Staf (P2P, BUKAN pendapatan kos)

Sudah ada field schema `User.tipGopay/tipOvo/tipDana/tipBank` (F4-14). Tambah: **tipShopee**.
- **Staf input sendiri** ID e-wallet (OVO/GOPAY/ShopeePay/DANA/Bank) di profil/pengaturan staf.
- **Sisi tenant** (setelah tiket selesai & ditindak staf): narasi halus — *"Kalau berkenan menyisihkan
  uang kopi untuk staf, kami tidak memaksa. Ini langsung ke akun pribadi staf."* + tampilkan ID e-wallet staf.
- **Tombol "Terima kasih"** untuk staf saat dapat tip (akui/acknowledge).
- **Narasi owner-facing & staf:** tip = rezeki dari Tuhan, di luar kendali owner; murni urusan
  pribadi tenant↔staf. TIDAK dijurnal/direkap di buku kos (kebijakan F4-14).
- **Tenant yang memberi tip → dapat poin** (lihat C).

#### B. Marketing high-level (owner-editable → narasi tenant & web statis)

- **Owner bisa edit** komponen analisa bisnis di Settings: SWOT (Strength/Weakness/Opportunity/Threat)
  + PESTLE. Disimpan sebagai konten (model `BusinessNarrative`/AppSetting).
- Analisa → **narasi otomatis** dipakai di: onboarding tenant baru, web statis depan, katalog.
- **Pembanding kompetitor** (keunggulan KOST48): web app canggih, respon cepat, **book online**,
  CCTV, terdaftar Google Maps, kamar prima, **fleksibilitas hemat listrik (kipas + AC, 30kWh gratis,
  pascabayar tanpa token)**. Banyak kompetitor tak punya web / tak terdaftar maps.
- **Survey cepat ke guest** (belum jadi tenant) di sela waktu — pertanyaan singkat, hasil masuk analisa.
- Sumber referensi: www.kost48surabaya.com.

#### C. Gamifikasi Tenant (semua ANONIM di sisi tenant)

- **Poin = ukuran kebaikan, bukan sekadar reward.** Tampilkan narasi itu + ringkasan:
  **total dikumpulkan · sudah ditukar · sisa**.
- **Tip dari tenant → tambah poin** (perbuatan baik).
- **Rank Top 3/Top 5 (anonim):** poin tertinggi tenant. Jika nilai sama → tampilkan >1 (nama + kamar).
  CATATAN owner: minta "nama + kamar" untuk yang masuk top — pastikan konsisten dengan "anonim";
  kemungkinan maksud: tampilkan kamar (A/B/C) tanpa identitas pribadi penuh. **Perlu konfirmasi saat build.**
- **Ranking kebersihan depan kamar** (terbersih & terkotor) per bulan, per kamar (A, B, C, ...) —
  "permainan" interaksi antar kamar, anonim. Butuh sumber data (audit kebersihan depan kamar).

#### D. Gudang/Inventaris staf (kejelasan + logika stok min)

- **Filter default tidak jelas** + beda "Aman" vs "Semua barang" kurang jelas → perjelas label +
  tandai filter aktif.
- **Stok minimal otomatis untuk barang fasilitas kamar** (AC/kipas) = **jumlah kamar yang memakai**
  fasilitas itu. (mis. semua kamar punya kipas → min stok kipas = jumlah kamar).
- **Standarisasi: semua kamar punya kipas** (selain AC) → marketing hemat listrik ("pakai kipas saat
  cukup dingin"). Set di data kamar/seed + fasilitas.

#### E. Konstanta meter (lengkapi `_PROPOSAL_METER_LISTRIK_AIR.md`)

- **Kuota gratis 30 kWh juga owner-settable** (sudah masuk M-1: `freeElectricityKwhPerMonth`).

#### Catatan layout kecil

- `/staff-report`: posisi input bulan + tombol "Simpan/Cetak PDF" rapi di desktop; rapikan di lebar
  menengah (masuk sweep responsif).

#### F. Cross-sell saat perpanjangan + kebijakan perbaikan (➜ juga konten marketing)

Saat tenant **perpanjang**, tawarkan add-on (opsional, tidak memaksa):
- **Order WiFi** sekalian.
- **Minta bantuan bersih kamar oleh staf** — *pembersihan ruang DALAM = tanggung jawab tenant*; kalau
  butuh bantuan staf, beri **tip langsung** (tampilkan kisaran "mis. Rp X–Y, bebas"). Bukan tagihan kos.

**Kebijakan perbaikan (free, masuk konten marketing — pro-tenant):**
- **GRATIS** untuk kerusakan wajar: **ganti lampu putus, kran rusak, shower rusak, kebocoran air**, dll.
- Tenant **wajib lapor segera** (lewat Laporan Saya) agar cepat ditangani.
- Narasi marketing: *"Kerusakan wajar (lampu, kran, shower, bocor) kami perbaiki GRATIS & cepat —
  cukup lapor lewat app. Kamar selalu kami jaga prima."*

#### G. Struktur app Owner vs Admin + kartu status (vision owner 2026-06-16)

- **Owner punya kemampuan Admin; Admin TIDAK punya kemampuan Owner.** Di app owner, **pisahkan**
  area "fitur admin (mengurus operasional)" vs "fitur khusus owner" agar lebih terarah.
- **Kartu status besar** (pola seperti kartu kondisi kamar milik staf) juga dipakai di **Admin & Owner** —
  info penting bisa dianalisis sekali lihat (status keuangan, okupansi, tunggakan, dll).

#### Keputusan terverifikasi (2026-06-16)
- **Gudang staf:** filter = **Area** (Gudang/Area umum/Kamar) + **Kategori** barang + **Status** (Aman/Menipis/
  Habis/Masalah, otomatis). Stok-min fasilitas (AC/kipas) = jumlah kamar pemakai; semua kamar punya kipas.
- **Rank tenant Top 3:** tampil **Kamar saja** (anonim penuh), bukan nama.
- **Percantik route staf:** dikerjakan sebagai **satu pass re-theme** khusus (ikon/warna/komponen Tab).
- **Tip staf input e-wallet:** SEBAGIAN SUDAH ADA (F5-2: `PATCH /auth/me/tip-info` + kartu di ProfilePage).
  Sisa: tambah ShopeePay, narasi tenant "uang kopi" + tombol terima kasih, tip→poin, tip-count di laporan.

#### Urutan build disarankan
1. Tip staf (A) — schema field hampir lengkap, dampak cepat.
2. Gamifikasi tenant ringkas (C: poin=kebaikan + total/ditukar/sisa) — frontend dari data yang ada.
3. Gudang (D: kejelasan filter + min-stok fasilitas).
4. Rank tenant + kebersihan kamar (C lanjutan) — perlu endpoint + sumber data.
5. Marketing/SWOT/PESTLE engine (B) — paling besar.
