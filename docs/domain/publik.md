# Publik — Marketing, UI/UX, Gamifikasi, Growth

## Daftar isi

- [Bagian utama publik](#d4c-publik-utama)
- [Bagian B — Flow map](#d4c-flow)
- [Bagian C — Kontrak & business rules](#d4c-kontrak)


Tanggal: 2026-09-23
Status: aktif
Tujuan: arahan & aturan permukaan publik dan pertumbuhan — marketing, UI/UX publik, loyalitas/gamifikasi, referral, tip staf, proposal growth (dari M07)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [publik](publik.md) · [keuangan.md](keuangan.md) · [operasional.md](hunian.md#d4c-operasional) · [ai.md](ai.md)

**Daftar isi**

- [Update 2026-07-08 — Sinkronisasi Publik & Growth](#update-2026-07-08--sinkronisasi-publik--growth)
- [Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅](#update-2026-06-17--audit-keuangan-ultra-)
- [Update 2026-06-19 - Fase G AI Marketing & FAQ](#update-2026-06-19---fase-g-ai-marketing--faq)
- [Konsep Baru - Public Marketing Modern (2026-06-16)](#konsep-baru---public-marketing-modern-2026-06-16)
  - [Prinsip arah visual](#prinsip-arah-visual)
  - [Data marketing yang wajib diangkat](#data-marketing-yang-wajib-diangkat)
  - [Struktur landing page yang disarankan](#struktur-landing-page-yang-disarankan)
  - [Fitur frontend yang boleh dimaksimalkan](#fitur-frontend-yang-boleh-dimaksimalkan)
  - [Batasan kualitas](#batasan-kualitas)
  - [🆕 UI/UX Publik — Arahan Owner 2026-06-17 (untuk implementasi)](#-uiux-publik--arahan-owner-2026-06-17-untuk-implementasi)
  - [Backlog desain (diperbarui 2026-06-17)](#backlog-desain-diperbarui-2026-06-17)
  - [Prioritas productisasi analisa bisnis (owner setuju 2026-06-16)](#prioritas-productisasi-analisa-bisnis-owner-setuju-2026-06-16)
- [Bagian 1 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md`](#bagian-1---docsarsiplegacy2026-06-16_root_docs_pre_m17_publik_marketing_uiuxmd)
  - [DOSSIER 17 — PUBLIK, MARKETING & UI/UX](#dossier-17--publik-marketing--uiux)
- [Bagian 2 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/19_GAMIFIKASI_LOYALITAS.md`](#bagian-2---docsarsiplegacy2026-06-16_root_docs_pre_m19_gamifikasi_loyalitasmd)
  - [DOSSIER 19 — GAMIFIKASI & LOYALITAS TENANT](#dossier-19--gamifikasi--loyalitas-tenant)
- [Bagian 3 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md`](#bagian-3---docsarsiplegacy2026-06-16_root_docs_pre_m_proposal_marketing_gamifikasi_tipmd)
  - [PROPOSAL — Marketing, Gamifikasi Tenant, Tip Staf (vision owner 2026-06-16)](#proposal--marketing-gamifikasi-tenant-tip-staf-vision-owner-2026-06-16)
- [Audit UI/UX Full — 2026-06-19](#audit-uiux-full--2026-06-19)
  - [Ringkasan Temuan](#ringkasan-temuan)
  - [🔴 CRITICAL](#-critical)
  - [🟠 HIGH](#-high)


> Migrasi dari docs/M07_PUBLIK_GROWTH.md (B2 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks tidak diubah.
> Batch B2 memindahkan **seluruh isi M07 apa adanya** ke file ini (satu tujuan per handoff owner). Bagian bertanggal — `## Update 2026-06/07`, `## Audit UI/UX Full — 2026-06-19`, `## Audit 360° P7 Marketing & Growth (Jul 2026)`, dan dua deep audit 29 Jul 2026 — **ikut utuh di sini dan belum dipisah**; pemisahan ke `docs/AUDIT.md`/`docs/arsip/` dilakukan pada tahap konsolidasi audit/arsip atau batch lanjutan sesuai keputusan owner.

<a id="d4c-publik-utama"></a>
## Update 2026-07-08 — Sinkronisasi Publik & Growth

Semua fitur publik/marketing/gamifikasi telah terverifikasi dalam audit 360° P7. SEO 100/100, social proof aktif, loyalty poin idempotent, reward accounting benar. Tidak ada perubahan fundamental pada flow publik/growth.

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

MKT-4 CAC/CLV Dashboard selesai (DeepSeek V4 Pro + offline fallback). Audit keuangan LULUS — akuntansi akurat mendukung insight marketing. Detail: `docs/domain/keuangan.md`.

## Update 2026-06-19 - Fase G AI Marketing & FAQ

Analisa pasar AI yang sudah ada menjadi bagian Fase G `docs/domain/ai.md`. Semua AI marketing tetap manual lewat tombol, OWNER/ADMIN only, hemat token, dan memiliki fallback offline. Default model baru disarankan `deepseek-v4-flash`; model berat hanya untuk analisa strategis/finance Owner-only.

- **Market analysis:** SWOT/PESTLE/Competitor tetap owner-triggered; jangan auto-run saat halaman dibuka.
- **CAC/CLV:** AI hanya memberi insight naratif dari snapshot agregat; jangan mengarang paid CAC jika biaya iklan belum diinput.
- **FAQ generator:** AI boleh membuat draft FAQ/Manual dari rule summary, tetapi Owner memilih item lalu menyimpan. Jangan auto overwrite FAQ existing.
- **Public copy:** AI boleh membuat draft copy marketing dari data sistem, tetapi Owner/Admin menyetujui sebelum dipakai di Settings/FAQ/landing.

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
- **OWN-FOTO-UPLOAD** — SELESAI 2026-06-19: Owner Settings mengelola foto kamar, foto fasilitas, dan aset publik slot-based (hero, profil/galeri, spanduk, brosur depan/belakang) tanpa schema baru.
- **PUB-BROCHURE** — SELESAI 2026-06-19: section "Galeri KOST48" memakai upload owner bila ada, dengan fallback aset statis.

#### E. Ulasan & Social Proof
- **PUB-REVIEWS** — `GET /public/reviews` ambil dari `StaffReview` VISIBLE rating≥4. Embed Google Maps reviews via iframe. Section "Apa Kata Penghuni".
- **PUB-REVIEWS-FILTER** — Tab filter: "Terbaru" / "Rating Tertinggi". Default rating ≥4, max 10.

#### F. Booking Flow & KTP
- **PUB-BOOKING-INFO** — Di halaman login: teks "Belum punya akun? Booking kamar dulu — akun Anda dibuat otomatis."
- **PUB-BOOKING-FORM** — Ubah validasi booking: `phone` XOR `email` wajib (minimal salah satu). Field lain optional, dilengkapi di portal tenant.
- **PUB-KTP-OCR** — Tesseract.js OCR offline: setelah upload foto KTP → ekstrak nama + NIK → auto-isi form. Fase G boleh menambah validator DeepSeek **berbasis teks OCR saja**; jangan kirim gambar KTP ke API AI. Backend hanya menyimpan data yang sudah disetujui flow KTP.
- **TEN-PROFILE-NOTIF** — Endpoint `GET /me/profile-completeness`. Di portal tenant, badge "Lengkapi Profil" + daftar field belum diisi (nama, telepon, email, KTP, kontak darurat, dll).

### Backlog desain (diperbarui 2026-06-17)

| ID | Deskripsi | Status |
|----|-----------|--------|
| **MG-UI-01** | Re-theme landing publik (hero immersive, capsule nav, CTA kuat, section story, card premium) | ⏳ Diperluas — lihat arahan owner §A-F |
| **MG-UI-02** | Komponen proof strip (rating, penghuni aktif, lokasi) | ⏳ Menunggu PUB-REVIEWS |
| **MG-UI-03** | Section "Living System" (invoice, riwayat, lapor, loyalty, referral) | ⏳ |
| **MG-UI-04** | Audit + upload foto marketing via Settings owner | ✅ Selesai Fase B (marketing-assets + Owner Settings) |
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


## Bagian 1 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md`

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


## Bagian 2 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/19_GAMIFIKASI_LOYALITAS.md`

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


## Bagian 3 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md`

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


## Audit UI/UX Full — 2026-06-19

**Cakupan:** 14 file CSS (~6000 baris), 100+ komponen React, 26 halaman, routing, auth, form UX, PWA, aksesibilitas.

> **Status 2026-10-10 — bagian ini potret historis, bukan daftar cacat hari ini.** Diverifikasi ulang ke kode: **C-1, H-1, M-1, M-2, M-3, M-4, L-1, L-2 sudah DITUTUP** (bukti: `App.tsx` `Route path="*"` + `NotFoundPage.tsx` · `ToastProvider.tsx` dipasang di `main.tsx` dan dipakai `SimpleCrudPage.tsx` · `PasswordInput.tsx` memakai SVG `EyeOpenIcon` tanpa `tabIndex={-1}` · `AppLayout.tsx` `.skip-to-content` + `useConfirm` “Keluar” · `00-tokens.css` `--text-muted: #475569` · `GlobalSearch.tsx` `canSearchInvoices` · `SkeletonLoader.tsx` `StatCardSkeleton`) · **L-3** aturannya sudah tidak ada di kode (`overscroll-behavior-y` tidak ditemukan di `frontend/src`) · **M-5** masih berlaku (`SearchableSelect.tsx` `menuPortalTarget`). Teks temuan di bawah **dibiarkan apa adanya** sebagai catatan tanggal.

### Ringkasan Temuan

| Severity | Jumlah | Area |
|----------|--------|------|
| 🔴 Critical | 1 | Routing (404) |
| 🟠 High | 1 | Feedback system (toast global) |
| 🟡 Medium | 5 | Aksesibilitas, kontras, keyboard, logout, focus trap |
| 🔵 Low | 6 | Polish, edge case, search tenant, skeleton |
| ✅ Positive | 6 | Code-splitting, PWA, responsive table, auth, inline error, breadcrumb |

### 🔴 CRITICAL

#### C-1: Tidak ada halaman 404 / wildcard route

`App.tsx` tidak mendefinisikan `<Route path="*">`. Semua URL tidak dikenal merender layout kosong tanpa konten — sidebar + topbar dengan breadcrumb terakhir, tanpa pesan "Halaman tidak ditemukan" atau navigasi kembali.

**File:** `frontend/src/App.tsx` (akhir `<Routes>` block — tidak ada wildcard route)

**Rekomendasi:** Tambah `<Route path="*" element={<NotFoundPage />} />` dengan pesan ramah dan link ke dashboard/katalog.

---

### 🟠 HIGH

#### H-1: Tidak ada sistem feedback global (toast) untuk aksi sukses

Setelah create/update/delete, feedback sukses hanya berupa Alert inline di dalam modal atau hilang saat modal ditutup. `SimpleCrudPage` menutup modal setelah submit tanpa indikasi sukses apapun. Tidak ada pemanggilan `Toast` dari react-bootstrap di semua file TSX.

**Evidence:** `search_content "toast|Toast|useToast"` di `frontend/src` — hanya style CSS toast (aturan `.toast-container` di `frontend/src/styles/02-layout.css`) tapi tidak ada komponen React yang menggunakannya.

**Rekomendasi:** Buat `ToastProvider` + `useToast()` hook, tampilkan toast sukses/error di pojok kanan bawah setelah setiap mutasi. Bisa pakai react-bootstrap `Toast` atau buat custom ringan.

---

### 🟡 MEDIUM

#### M-1: PasswordInput toggle — emoji tanpa alt, tidak keyboard-accessible

`PasswordInput.tsx` menggunakan `🙈` / `👁` sebagai toggle show/hide password. Emoji dirender berbeda di tiap OS. Tombol toggle memiliki `tabIndex={-1}` (line 23) sehingga tidak bisa dijangkau keyboard.

**File:** `frontend/src/components/common/PasswordInput.tsx` — tombol toggle show/hide

**Rekomendasi:** Ganti emoji dengan SVG icon (mata terbuka/tertutup), hapus `tabIndex={-1}`, tambahkan `aria-label` dinamis ("Tampilkan password" / "Sembunyikan password").

#### M-2: Tidak ada skip-to-content link

Tidak ada `<a href="#main-content" class="skip-link">` di awal halaman. User keyboard/screen reader harus menavigasi seluruh sidebar, topbar, dan tab sebelum mencapai konten utama.

**Rekomendasi:** Tambah visually-hidden skip link di `AppLayout` yang muncul saat focus, menuju `<main>` content area.

#### M-3: Color contrast `--text-muted` (#64748b) gagal WCAG AA untuk small text

`--text-muted: #64748b` pada background putih memiliki contrast ratio ~4.55:1 — borderline pass untuk normal text (≥18px) tapi **gagal WCAG AA untuk small text** (<18px). Banyak `.small.text-muted` di aplikasi (label form, caption tabel, hint).

**File:** `frontend/src/styles/00-tokens.css` — token `--text-muted` di blok `:root`, digunakan di 200+ tempat.

**Rekomendasi:** Ubah `--text-muted` ke `#475569` (ratio 5.5:1, aman small text) atau `#334155` (ratio 7:1, AAA).

#### M-4: Tidak ada konfirmasi sebelum logout

Tombol "Logout" di `AppLayout` untuk Admin/Owner dan Staff langsung memanggil `logout()` tanpa modal konfirmasi. Di mobile, tombol ini kecil dan mudah tidak sengaja ter-tap.

**File:** `frontend/src/components/layout/AppLayout.tsx` (logout button untuk Staff ~line 328, Owner/Admin ~line 389)

**Rekomendasi:** Tambah `window.confirm()` atau modal kecil "Yakin ingin keluar?" sebelum logout.

#### M-5: Focus trap tidak sempurna di modal dengan react-select

`SearchableSelect` menggunakan `menuPortalTarget={document.body}` yang me-render dropdown di luar DOM tree modal. Focus tidak ter-trap di dalam modal saat dropdown react-select terbuka — user bisa Tab ke elemen di belakang modal.

**File:** `frontend/src/components/common/SearchableSelect.tsx` — prop `menuPortalTarget` pada `AsyncSelect`

**Rekomendasi:** Gunakan `menuPortalTarget` yang mengarah ke container modal, atau tambah event handler untuk membatasi Tab.

---

### 🔵 LOW

#### L-1: Tenant tidak punya GlobalSearch

`GlobalSearch` mengembalikan `null` saat `role === 'TENANT'`. Di portal tenant dengan banyak invoice dan tiket, tenant harus scroll panjang untuk mencari invoice lama.

**File:** `frontend/src/components/layout/GlobalSearch.tsx` — gerbang peran `canSearchTenants` / `canSearchRooms` / `canSearchInvoices`

**Rekomendasi:** Buka search terbatas untuk tenant (hanya invoice dan tiket miliknya, bukan data global).

#### L-2: Skeleton loader dimensi hardcoded

`StatCardSkeleton` menggunakan width fixed (96px, 120px, 72%) yang menghasilkan layout shift saat konten riil muncul karena dimensi tidak cocok.

**File:** `frontend/src/components/common/SkeletonLoader.tsx` — `StatCardSkeleton`

**Rekomendasi:** Gunakan CSS grid yang sama dengan stat card asli agar skeleton dan konten riil memiliki dimensi identik.

#### L-3: `overscroll-behavior-y: none` mencegah pull-to-refresh

`01-base.css` line 68 menetapkan `overscroll-behavior-y: none` pada body. Mencegah pull-to-refresh di mobile browser — gesture alami pengguna mobile.

**File:** UNKNOWN — `overscroll-behavior-y` tidak ada lagi di kode hari ini; yang tersisa hanya `overscroll-behavior: none` pada `body.offcanvas-open` (`frontend/src/styles/02-layout.css`)

**Rekomendasi:** Hapus atau batasi hanya pada elemen yang memang tidak boleh overscroll (mis. chart/map containers).

#### L-4: Form login — error message tidak spesifik format

LoginPage placeholder "Contoh: nama@email.com atau 0812..." — tapi error message generik. User tidak tahu apakah format input yang salah atau password yang salah.

**File:** `frontend/src/pages/auth/LoginPage.tsx` — `identifierPlaceholder` ("Contoh: nama@email.com atau 0812...")

**Rekomendasi:** Tambah validasi format ringan: jika input mengandung `@`, perlakukan sebagai email; jika diawali `0` dan numerik, perlakukan sebagai HP. Beri pesan error spesifik per format.

#### L-5: SafeImage loading text Bahasa Indonesia campur Inggris

`SafeImage` komentar internal bahasa Inggris; fallback text sudah Bahasa Indonesia.

**File:** `frontend/src/components/common/SafeImage.tsx`

#### L-6: Mobile offcanvas — pastikan SEMUA path navigasi menutup offcanvas

`changeOwnerViewMode` + `onBrandClick` sudah menutup offcanvas. Tapi link di `SidebarContent` hanya menutup via `onNavigate` prop — perlu dipastikan semua path (termasuk redirect internal) menutup offcanvas dengan benar.

---

### ✅ POSITIVE — Hal yang sudah sangat baik

1. **Code splitting dengan lazy loading** — semua halaman di-lazy load via `React.lazy()` + `Suspense` dengan fallback `PageLoadingSkeleton`. Bundle publik terpisah dari bundle workspace.
2. **PWA layer lengkap** — Service worker dengan cache strategy + precache, offline detection, error boundary per-route, install prompt + update notification.
3. **Responsive table otomatis** — `responsiveTables.ts` menambah `data-label` attribute via MutationObserver untuk tampilan stacked di mobile.
4. **Auth handling robust** — 401 interceptor auto-redirect, ProtectedRoute dengan loading state, role-based routing + RequireRoles guard, owner mode toggle dengan route terpisah, session storage cache untuk user.
5. **Inline error di form field** — LoginPage menampilkan error per-field (identifier, password) di bawah input terkait, bukan hanya Alert di atas form.
6. **Breadcrumb dinamis dari URL** — `getBreadcrumbParts()` otomatis membangun breadcrumb dari pathname + navigation config, tidak perlu manual per halaman.

### Prioritas Perbaikan

| # | Action | Impact | Estimasi |
|---|--------|--------|----------|
| 1 | Tambah route 404 + NotFoundPage | User tidak bingung saat URL salah | 30 menit |
| 2 | Buat ToastProvider global | Feedback aksi jelas & konsisten | 2 jam |
| 3 | Ganti emoji PasswordInput → SVG icon | Aksesibilitas, konsistensi | 20 menit |
| 4 | Tambah skip-to-content link | Aksesibilitas keyboard | 10 menit |
| 5 | Gelapkan `--text-muted` ke `#475569` | WCAG AA compliance | 5 menit |
| 6 | Tambah konfirmasi logout | Mencegah accidental logout | 15 menit |

> **Instruksi eksekusi detail (SEARCH/REPLACE siap pakai) Fase F bersifat historis; aturan aktif ada di berkas ini dan [domain/operasional.md](hunian.md#d4c-operasional).**
> Setiap task di M10 sudah dilengkapi: path file, nomor baris, blok SEARCH/REPLACE eksak, dan perintah verifikasi.
> AI model kecil (V4 Flash) bisa langsung menjalankan tanpa membaca kode sumber.

---

## Audit 360° P7 Marketing & Growth (Jul 2026)

**Status:** 🟢 Solid. Detail → `docs/arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md`

✅ Room filter publik · ✅ Badge status kamar (hijau/merah/kuning/abu) · ✅ SEO 100/100 · ✅ JSON-LD (LodgingBusiness) · ✅ Social proof (rating≥4, inisial anonim) · ✅ Availability calendar · ✅ Code splitting · ✅ **CTA booking** — `BookingCtaButton` shared component (P7-01 ✅ FIXED) · ✅ Loyalty poin idempotent (4 trigger) · ✅ Reward accounting (RENT_DISCOUNT/METER_DISCOUNT/SERVICE_ADDON/BADGE) · ✅ Referral system · ✅ Rent-loyalty (D-16 harga tidak naik) · ✅ Market Analysis (DeepSeek + offline fallback) · ✅ Guest Preference Survey (OC-04)

---

## 🆕 Deep Audit Publik & Marketing — 29 Jul 2026 (Reasonix)

**Auditor:** Reasonix (deep audit 6 modul backend publik/marketing: 17 file, 1834 baris).  
**Metode:** `grep` `.catch()` + `@Public` + auth bypass + data leak check di marketing, faqs, surveys, guest-preferences, loyalty/peer-report, market-analysis.  
**Kesimpulan:** Domain publik & marketing 🟢 **95% BERSIH** — 0 best-effort journal, 0 race condition. 1 temuan MEDIUM (PIN-based auth), 1 LOW (silent swallow notifikasi).

### Temuan

| ID | Lokasi | Deskripsi | Severity |
|----|--------|-----------|----------|
| **PM-01** | `peer-report.service.ts` — `create` / `moderate` | 2 `.catch(() => undefined)` — notifikasi admin & reportee gagal tanpa log. Dampak rendah (notifikasi non-kritis). | 🟢 LOW |
| **PM-04** | `public-availability.controller.ts` | Endpoint `PUT /public/availability/setup` di-protect dengan `X-Availability-Pin` header + `timingSafeEqual`, bukan JWT. Aman secara kriptografi, tapi tidak terintegrasi dengan sistem auth/role. PIN bocor = attacker bisa ubah ketersediaan publik. | 🟡 MEDIUM |

### Verifikasi auth guards — ✅ SEMUA BENAR

| Modul | `@Public()` | Endpoint | Verifikasi |
|---|---|---|---|
| `faqs.controller.ts` | 1 | `GET /faqs/public` | ✅ Tepat — FAQ publik tanpa auth |
| `marketing-public-rooms.controller.ts` | class-level | Semua endpoint | ✅ Tepat — katalog kamar + social proof + kalender |
| `marketing-assets.controller.ts` | 1 | `GET marketing-assets/` | ✅ Tepat — aset statis publik |
| `facility-images.controller.ts` | 1 | `GET facility-images/` | ✅ Tepat — foto fasilitas publik |
| `public-availability.controller.ts` | class-level | `GET + PUT /public/availability/setup` | ⚠️ GET OK, PUT via PIN |
| `surveys` | 0 | — | ✅ Semua butuh auth (TENANT / OWNER/ADMIN) |
| `guest-preferences` | 0 | — | ✅ Semua butuh auth (OWNER/ADMIN) |
| `loyalty` | 0 | — | ✅ Semua butuh auth (TENANT / OWNER/ADMIN) |

### Data leak prevention — ✅ AKTIF

- `marketing-public-rooms.service.ts` — `notes: false` di `PUBLIC_ROOM_SELECT` — mencegah ekspos catatan internal kamar ✅
- `marketing-public-rooms.service.ts` — `publicAvailability` hanya expose `status`, bukan metadata internal ✅
- FAQ publik hanya mengembalikan `isPublished: true` + `sortOrder` — tidak ada field internal ✅
- Surveys: semua endpoint butuh auth, tidak bisa di-spam publik ✅

### Modul BERSIH (0 isu)

| Modul | Baris | `.catch()` | `@Public` | Status |
|---|---|---|---|---|
| `marketing-public-rooms` | 1112 | 0 | ✅ | ✅ |
| `marketing-assets` | 122 | 0 | ✅ | ✅ |
| `facility-images` | 90 | 0 | ✅ | ✅ |
| `faqs` | 117 | 0 | ✅ | ✅ |
| `surveys` | 117 | 0 | 0 | ✅ |
| `guest-preferences` | 122 | 0 | 0 | ✅ |
| `market-analysis` | ~450 | 2 (re-throw + AI fallback) | 0 | ✅ |

### `.catch()` di market-analysis — ✅ AMAN

| Lokasi | Pola | Verifikasi |
|---|---|---|
| `deepseek.client.ts` | `res.text().catch(() => '')` | Fallback empty string untuk AI client — acceptable ✅ |
| `market-analysis.service.ts` — `remove()` | `.catch(() => { throw new NotFoundException(...) })` | BUKAN swallow — re-throw sebagai HTTP exception — ✅ |

### Risk rating

| Kategori | Rating |
|---|---|
| Best-effort journal | 🟢 **0 temuan** |
| Race condition | 🟢 **0 temuan** |
| Auth bypass / missing guard | 🟢 **0 temuan** (PIN wizard = by design) |
| Data leak | 🟢 **0 temuan** (prevention aktif) |
| Silent swallow | 🟢 **1 LOW** (PM-01 — notifikasi non-kritis) |
| **Overall** | 🟢 **LOW RISK** — domain paling bersih dari 4 domain yang diaudit |

---

## 🆕 Deep Audit AI & Growth — 29 Jul 2026 (Reasonix)

**Auditor:** Reasonix (deep scan 7 modul: owner-ai, ai, market-analysis, loyalty, analytics, ancillary-revenue — 2599 baris).  
**Kesimpulan:** 🟢 **99% BERSIH** — domain terbersih. 0 best-effort journal, 0 race condition baru.

### Temuan

**Tidak ada temuan HIGH atau MEDIUM.** Semua `.catch()` sudah diverifikasi acceptable di audit sebelumnya:

| Lokasi | Pola | Status |
|---|---|---|
| `peer-report.service.ts` — `create` / `moderate` | `.catch(() => undefined)` notifikasi | PM-01 (LOW) — sudah tercakup M18 |
| `deepseek.client.ts` | `.catch(() => '')` fallback AI | Acceptable ✅ |
| `market-analysis.service.ts` — `remove()` | `.catch(() => throw)` re-throw | Acceptable ✅ |

### Positive patterns — 4 guard kuat

| # | Pattern | Lokasi | Dampak |
|---|---------|--------|--------|
| 1 | **FOR UPDATE lock reward** | `redemption.service.ts` — `requestRedemption` / `decideRedemption` | `SELECT ... FOR UPDATE` pada `LoyaltyReward` dengan `stockQty` — mencegah overselling reward (dua tenant redeem bersamaan) ✅ |
| 2 | **OWNER-only segregation** | `owner-ai.controller.ts` | Delete/config/dangerous = OWNER only. Read/generate = OWNER/ADMIN. Sesuai M09 spec ✅ |
| 3 | **AI cache prune+cap** | `ai-cache.service.ts` | Cache AI punya TTL, max entries, dan prune — mencegah memory leak ✅ |
| 4 | **Redemption $transaction** | `redemption.service.ts` — `requestRedemption` / `decideRedemption` | Dua `$transaction` terpisah — redeem + fulfill, masing-masing dengan lock ✅ |

### Auth guard matrix — OWNER/ADMIN only

| Endpoint | OWNER | ADMIN | STAFF | TENANT |
|---|---|---|---|---|
| `POST /owner-ai/*` (generate) | ✅ | ✅ | ❌ | ❌ |
| `DELETE /owner-ai/*` | ✅ | ❌ | ❌ | ❌ |
| `GET /analytics/*` | ✅ | ✅ | ✅ (marketing) | ❌ |
| `GET /ancillary-revenue/*` | ✅ | ✅ | ❌ | ❌ |
| `GET /loyalty/*` (tenant) | ❌ | ❌ | ❌ | ✅ |

### Modul BERSIH (0 isu)

| Modul | Baris | `.catch()` | `$transaction` | Status |
|---|---|---|---|---|
| `owner-ai` | 2195 | 0 | — | ✅ **Paling terlindungi** |
| `ai` | 229 | 0 | — | ✅ |
| `analytics` | 97 | 0 | — | ✅ |
| `ancillary-revenue` | 121 | 0 | — | ✅ |
| `loyalty` | ~600 | 2 (PM-01) | ✅ + FOR UPDATE | ✅ |
| `market-analysis` | ~600 | 2 (acceptable) | — | ✅ |

### Risk rating

| Kategori | Rating |
|---|---|
| Best-effort journal | 🟢 **0** |
| Race condition | 🟢 **0** (FOR UPDATE di loyalty mencegah) |
| Silent swallow | 🟢 **0** (PM-01 notifikasi, sudah tercakup) |
| Auth bypass | 🟢 **0** (OWNER-only untuk operasi sensitif) |
| **Overall** | 🟢 **LOW** — domain terbersih dari semua |


<a id="d4c-flow"></a>
## Bagian B — Flow map

Tanggal: 2026-09-22
Status: aktif
Tujuan: peta alur kode krusial (dari M03 Bagian 1)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [flow & kontrak](publik.md#d4c-flow) · [domain/kontrak.md](publik.md#d4c-kontrak)

> Migrasi dari docs/M03_FLOW_KONTRAK.md L61–550 pada aeedaf99
> (DOC-GOV-20260922 Tahap 3 S2.a).

### Bagian 1 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/02_FLOW_MAP.md`

#### KOST48 V5 — Flow Map (Peta Alur Kode Krusial)
**Versi:** 2026-06-13 — sinkronisasi keputusan owner, status kode, dossier `10`-`19`, dan urutan Auto-Ops aktual.
**Tujuan:** Peta NARASI alur lintas-domain (apa memanggil apa, transisi status, side-effect, invarian).
> ⚠️ **ANCHOR BARIS:** angka `file:baris` di dokumen ini = posisi METODE pada snapshot audit **2026-06-13** — **INDIKATIF** (pasti bergeser sejak commit tersebut). **Sumber historis:** `docs/arsip/legacy/2026-06-16_root_docs_pre_M/_PETA_AI.md §2` + dossier `10`-`19`. Bila ragu, **grep nama metode di `backend/src/`**, jangan andalkan baris; pakai `docs/PETA-KODE.md` untuk navigasi modul terkini.

<!-- KOST48_DOCS_SYNC_20260630_FLOW_MAP_REVIEWED -->

##### Cara pakai saat audit
- Kolom **Rantai kode** = urutan eksekusi nyata, klik/lompat per `file:baris`.
- **Cross-ref gap bisnis** = lihat §15 untuk gap yang BELUM diperbaiki di kode.
- **Invarian** = aturan yang TIDAK BOLEH dilanggar; setiap audit pass wajib mencari jalur yang bisa melanggarnya.
- **Fokus audit** = pertanyaan terbuka/titik rawan yang ditemukan saat pemetaan.

---

##### 0. Arsitektur Global

###### 0.1 Request pipeline (backend)
- Entry: `backend/src/main.ts`
  - `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, disableErrorMessages di production })` — `main.ts` `bootstrap()`
  - CORS dari `CORS_ORIGIN` env (production wajib diisi) — `main.ts` `bootstrap()` (blok `enableCors`)
  - `trust proxy = 1` + security headers manual (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — `main.ts` `bootstrap()` (middleware security headers + `set('trust proxy', 1)`)
  - ⚠️ **TANPA Helmet** (keputusan sadar), **RATE-LIMIT SUDAH ADA** sejak V5.12.2: `common/middleware/rate-limit.middleware.ts` — global 300/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`), auth 10/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`). In-memory, per-proses; multi-instance perlu store bersama.
  - Static `/uploads` dihapus; bukti bayar hanya via endpoint terproteksi `GET /api/payment-submissions/proofs/:filename`
  - Swagger hanya non-production — `main.ts` `bootstrap()` (`if (!isProduction)` + `SwaggerModule.setup`)
- Module root: `backend/src/app.module.ts` — 33 modul di `modules/` (lihat `01_GROUND_STATE §1.2`).
- Auth: JWT Bearer, guard + decorator `@Roles(...)`. Role enum aktual: **OWNER, ADMIN, STAFF, TENANT** (schema.prisma `UserRole`). **APP_GUARD global default-deny** (E-1) sejak V5.12.2 — controller baru otomatis 401, bukan bocor publik.
- Semua mutasi penting menulis `AuditLog` (langsung via `tx.auditLog.create` atau `audit.log`).

###### 0.2 Representasi "Booking" (konsep kunci!)
Tidak ada model `Booking` terpisah. Satu record `Stay` mewakili seluruh siklus:
```
BOOKING   = Stay(status=ACTIVE) + Room(status=RESERVED) + initialMetersPromotedAt=NULL + expiresAt terisi
OCCUPIED  = Stay(status=ACTIVE) + Room(status=OCCUPIED) + initialMetersPromotedAt terisi ("promoted")
SELESAI   = Stay(status=COMPLETED)  |  BATAL/EXPIRED = Stay(status=CANCELLED)
```
> **Terminologi (ketetapan owner):** **DP** = uang muka pesan kamar (30% sewa, hangus bila gagal kontrak) → field `Stay.downPayment*`. **Deposit** = uang jaminan (refundable via settlement) → field `Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`.
>
> **Alur booking:** bayar DP 30% (atau lunas langsung) → DP approved = kamar terkunci (pesaing dibatalkan, `expiresAt` mati) → pelunasan + jaminan saat check-in → gagal lunas H+1 pk 12:00 → DP hangus (jurnal `DP_FORFEIT`). Overstay: tenant promoted lewat `plannedCheckOutDate` → tiket EVICT_OVERSTAY → H+1 forced checkout otomatis.

Constraint DB penunjang (secara historis berada dalam `backend/sql/bootstrap-production-schema.sql`; sumber saat ini `backend/sql/seed.sql` juga membawa data historis/PII):
- `stay_one_active_per_tenant_uidx` — 1 stay ACTIVE per tenant (termasuk fase booking).
- `stay_one_active_per_room_uidx` — 1 stay ACTIVE per room **hanya jika sudah promoted** → multi-booking RESERVED pada 1 kamar DIIZINKAN (first paid wins).
- `stay_deposit_payment_amount_chk` — depositPaid ≤ depositAmount.

> Untuk produksi, constraint/trigger ini harus diekstrak menjadi bootstrap guard khusus dan diuji pada DB kosong. Jangan menjalankan `backend/sql/seed.sql` untuk memperoleh constraint tersebut. Rujukan otoritatif: `DEPLOYMENT_ONLINE_20260723.md`.

###### 0.3 Enum status inti (schema.prisma)
| Entitas | Status |
|---|---|
| Stay | ACTIVE → COMPLETED / CANCELLED |
| Room | AVAILABLE → RESERVED → OCCUPIED → MAINTENANCE → (AVAILABLE) / INACTIVE |
| Invoice | DRAFT → ISSUED → PARTIAL → PAID / CANCELLED |
| PaymentSubmission | PENDING_REVIEW → APPROVED / REJECTED / EXPIRED |
| Deposit (Stay.depositStatus) | HELD → PARTIALLY_REFUNDED / REFUNDED / FORFEITED |
| Ticket | OPEN → IN_PROGRESS → DONE → CLOSED; CANCELLED dari kondisi yang diizinkan |
| RenewRequest / CheckoutRequest | PENDING → APPROVED / REJECTED |

---

##### 1. Flow Auth & Identitas

**Aktor:** Semua role. **File inti:** `backend/src/auth/auth.service.ts`

| Langkah | Rantai kode |
|---|---|
| Login (email/phone + password) | `auth.service.ts` `login` → `findUserForLogin` → bcrypt compare → JWT |
| Profil sendiri | `auth.service.ts` `me` |
| Lupa password | `auth.service.ts` `forgotPassword` → token CSPRNG → `PasswordResetToken` → `sendResetEmail` |
| Reset password | `auth.service.ts` `resetPassword` (transaksi di dalamnya) |
| Ganti password | `auth.service.ts` `changePassword` |

Manajemen identitas:
- Users CRUD (OWNER/ADMIN only): `modules/users/users.controller.ts` — `findAll` / `findOne` / `create` / `update`
- Tenants CRUD + akses portal: `modules/tenants/tenants.controller.ts` — buat akun portal `createPortalAccess`, suspend `togglePortalAccess`, reset password `resetPortalPassword`
- Profil tenant self-service: `modules/tenants/tenant-profile.controller.ts` — `getMyProfile` (GET profile), `onboardingFill` (PATCH onboarding)

**Invarian:** token reset sekali pakai & berbatas waktu; tenant hanya bisa baca data dirinya; tidak ada refresh token (expiry 24 jam). Suspend user MEMUTUS sesi seketika (jwt.strategy validasi DB per request + klaim pwdAt).
**Fokus audit:** enumerasi akun via respons forgot-password; kekuatan JWT secret & klaim; sesi setelah suspend portal-access. (Rate-limit auth sudah ada — lihat §0.1)

---

##### 2. Flow Publik → Booking

###### 2.1 Katalog publik
- `modules/marketing/marketing-public-rooms.controller.ts` — `findAll` (daftar) / `findOne` (detail) → `marketing-public-rooms.service.ts` `getPublicRooms` / `getPublicRoomDetail`. MAINTENANCE normal tidak dapat dipesan; MAINTENANCE dengan `allowBookingWhileCleaning=true` dapat dipesan tetapi belum dapat dihuni.
- FAQ publik: `modules/faqs/faqs.controller.ts` (6 endpoint).

###### 2.2 Booking publik (tanpa login)
- `modules/tenant-bookings/public-bookings.controller.ts` `create` POST → `public-bookings.service.ts` `createPublicBooking` (buat Tenant+User+Stay sekaligus).

###### 2.3 Booking via portal tenant
`modules/tenant-bookings/tenant-bookings.service.ts` `createBooking`:
1. Guard schema-ready `validateBookingPreconditions` (`isBookingSchemaReady`); tenant aktif di helper yang sama.
2. Transaksi: `SELECT … FOR UPDATE` Tenant → tolak jika sudah punya stay ACTIVE.
3. Lock Room `FOR UPDATE`; kamar harus `isActive` dan status bookable (`AVAILABLE`, atau `MAINTENANCE` dengan `allowBookingWhileCleaning`).
4. Tolak jika ada stay promoted/occupied di kamar itu (kueri `existingPaidOrOccupiedStay`).
5. Harga = snapshot tarif room per `pricingTerm` via `resolveRent`; **DP = 30% × sewa** (`downPaymentAmountRupiah`).
6. `expiresAt = calculateBookingExpiry(checkInDate)` — helper memakai deadline flat 3 jam dari waktu pembuatan (`AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`).
7. Room status dibiarkan apa adanya (baru RESERVED saat DP/pelunasan disetujui); INSERT Stay (raw SQL); AuditLog `CREATE_BOOKING`.

###### 2.4 Keputusan admin
- Approve: `tenant-bookings.service.ts` `approveBooking` → terbit invoice booking.
- Reject: `rejectBooking` (tulis `Stay.cancelReason`); Cancel oleh tenant: `cancelPendingBooking`.
- Daftar booking tenant: `findMine`; notifikasi approved/rejected (best-effort).

**Invarian:** booking belum bayar tidak mengunci kamar; DP pertama yang disetujui mengunci kamar; DP 30% mengikuti pricingTerm; booking expired tidak boleh di-approve.
**Fokus audit:** race multi-booking saat 2 pembayaran disetujui hampir bersamaan; konsistensi `isBookingSchemaDriftError` yang menelan error: jalur publik vs portal — apakah validasi & DP identik? (Lihat GAP #1 dan #4 di §15)

---

##### 3. Flow Pembayaran (JANTUNG SISTEM)

**File inti:** `modules/payment-submissions/payment-submissions.service.ts` (1.564 baris — terbesar).

###### 3.1 Tenant upload bukti
`createSubmission` → `findEligibleSubmissionTarget` → PaymentSubmission PENDING_REVIEW. File bukti via endpoint terproteksi (`doesTenantOwnProof`).

###### 3.2 Approve oleh admin — `payment-submissions.service.ts` `approveSubmission`
1. Lock submission `FOR UPDATE` (`lockSubmissionTx`); harus PENDING_REVIEW; stay ACTIVE. (Sub-baris langkah indikatif; anchor split/OCCUPIED/meter lihat dossier 10.)
2. `isBookingPath = room.status == RESERVED` lewat `submission.stayPromotedAt == null`; expired tidak bisa di-approve.
3. Hitung ulang paid amount (`freshPaidAmount`); split nominal → `rentPortion` + `depositPortion` (via `computePaymentAllocation`).
4. Buat `InvoicePayment` (hanya porsi sewa); status invoice → PAID/PARTIAL/ISSUED via `computeNextInvoiceState`.
5. Auto Journal Lite (best-effort) — `postInvoiceIssuedTx` + `postInvoicePaymentTx`.
6. Submission → APPROVED (`status: APPROVED`).
7. **Jalur booking** (`if (isBookingPath)`):
   - Update DP terbayar (`nextDepositState` → `stay.update`). Deposit ledger (best-effort) `recordDepositReceivedTx`.
   - **Jika invoice PAID:** Room di-set `RESERVED` (OCCUPIED baru saat check-in); auto `plannedCheckOutDate` via `calculatePeriodEnd`; promosi meter TIDAK di sini — dipindah ke check-in (`stays.service.ts` `create`).
   - `cancelCompetingUnpaidBookingsTx` (`payment-submissions.service.ts`).
8. Notifikasi tenant `notifyPaymentApproved` / `notifyLosingTenants`.

> ⚠️ **Catatan GAP #1 (owner):** Status teknis `PARTIAL` tetap diperlukan untuk DP 30% yang sah. Gap-nya adalah approval belum memvalidasi ulang dua nominal yang diizinkan: DP tepat atau pelunasan penuh tepat. Invoice-only wajib lunas penuh. **Status 2026-10-10:** validasi ulang itu **sudah ada** di `approveSubmission` (`F1-1R (D-02): NO-PARTIAL`) — lihat §15.

###### 3.3 Jalur lain
- Reject: `rejectSubmission`. Expire manual: `expireBooking`. Sweep expiry: `runExpiryCheck` → `autoCancelRejectedExpiredBookingTx`.
- **Refund DP kalah first-paid-wins:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. Untuk PENDING_REVIEW: admin refund manual + kirim bukti ke tenant. Lihat GAP #4 di §15.

**Invarian:** total pembayaran ≤ invoice + sisa DP; promosi meter & OCCUPIED hanya saat invoice PAID; hanya satu pemenang per kamar.
**Fokus audit:** semua blok best-effort (jurnal, ledger) → sumber selisih accounting; idempotensi retry approve; partial payment pada booking path (lihat GAP #1).

---

##### 4. Flow Invoice & Pembayaran Manual

**File:** `modules/invoices/invoices.service.ts`, `modules/invoice-payments/invoice-payments.service.ts`, `modules/meter-readings/meter-readings.service.ts`

- Invoice CRUD: `create`, `createWithLinesAndIssue`, line `addLine`/`updateLine`/`removeLine` (guard: invoice wajib masih DRAFT), `recalculateInvoiceTotal`.
- Issue: `invoices.service.ts` `issue` → jurnal `postInvoiceIssued`.
- Cancel: `cancel` → pre-check jurnal POSTED, lalu reversal.
- Pembayaran manual (admin): `invoice-payments.service.ts` `create` (FOR UPDATE, anti-overpayment) → `syncInvoiceStatus`; `update` / `remove` (remove berjurnal kini diblokir A8, dan guard `assertStayNotOccupiedForPaymentMutationTx`).
- Meter reading: `meter-readings.service.ts` `create` / `update`, guard kronologis `assertReadingIsChronological`.

> ⚠️ **Catatan GAP #3 (owner):** Admin tidak boleh remove invoice payment jika kamar sudah OCCUPIED. Dulu (2026-06-12) kode belum punya guard ini; **status 2026-10-10 guard sudah ada** (`assertStayNotOccupiedForPaymentMutationTx`). Detail di §15 GAP #3.

**Invarian:** Σ InvoicePayment ≤ total invoice; status invoice = f(Σpayment); line tidak berubah setelah ISSUE; meter reading monoton naik per room+utilityType.
**Fokus audit:** konsistensi `syncInvoiceStatus` vs perhitungan inline di approveSubmission; reversal saat remove payment yang membuat invoice turun dari PAID → PARTIAL (kamar sudah OCCUPIED — GAP #3).

---

##### 5. Flow Perpanjangan (Renew)

**File:** `modules/renew-requests/renew-requests.service.ts`, `modules/stays/stays.service.ts`

###### Aturan bisnis target (owner):
1. **H-10 sebelum kontrak jatuh tempo:** tenant menerima prompt perpanjang/tidak, dan tetap boleh mengajukan sendiri.
2. Tenant yang memilih YA memiliki prioritas eksklusif sampai hari-H tanpa wajib DP lebih dulu.
3. Jika memilih TIDAK, kamar dibuka untuk periode setelah tanggal checkout.
4. Jika hari-H belum ada DP, prioritas berakhir dan kamar dibuka publik.
5. DP 30% mengamankan renewal; pelunasan maksimal H+7 dari DP.
6. Gagal lunas H+7 → DP hangus, deposit dapat dipotong, dan forced checkout.
7. Harga tenant yang renew tanpa putus kontrak tidak naik.

###### Status implementasi kode saat ini (F2-1 selesai):
- Tenant memilih YA/TIDAK melalui state `PENDING_DECISION` → `AWAITING_DP` atau `REJECTED_BY_TENANT`; tenant lama memiliki prioritas sampai hari-H.
- DP renewal 30% yang diverifikasi admin mengubah request menjadi `DP_SECURED` dan menetapkan batas pelunasan H+7 dari waktu DP diterima.
- Setelah pelunasan penuh, service menerbitkan/mengecek settlement lalu menyelesaikan renewal menjadi `COMPLETED`; periode tetap kontinu dan rent-lock berlaku.
- AutoOps menandai `AWAITING_DP` lewat hari-H sebagai `EXPIRED_PRIORITY`, serta `DP_SECURED` yang gagal lunas H+7 sebagai `FORFEITED`. Forced checkout/settlement deposit tetap diproses melalui flow admin yang terkontrol.

> ✅ **GAP #2 ditutup:** approval renewal tidak lagi langsung memperpanjang stay. Jalur lama `APPROVED` dipertahankan hanya untuk kompatibilitas data/flow lama yang valid.

**Invarian:** renewal tidak boleh menumpuk tunggakan; periode kontinu tanpa gap/overlap.
**Fokus audit:** implementasi fase DP 30% renewal + grace period H+7 + kamar muncul di katalog publik + auto-cancel jika tidak lunas.

---

##### 6. Flow Checkout & Deposit

###### 6.1 Pengajuan checkout
`modules/checkout-requests/checkout-requests.service.ts` — `createRequest` (guard `assertNoOpenInvoices`) → `approveRequest` / `rejectRequest` → notifikasi `notifyOwnerAdminOnCreate` / `notifyTenantOnApprove` / `notifyTenantOnReject`.

###### 6.2 Final checkout — `stays.service.ts` `complete`
1. Hanya aktor lifecycle (`assertCoreLifecycleActor`).
2. **Blokir jika masih ada invoice belum PAID/CANCELLED** (`blockingInvoices`, tagihan meter dikecualikan).
3. Stay → COMPLETED (`stay.updateMany`). Jika tidak ada stay aktif lain → **Room → MAINTENANCE** (`if (otherActive === 0)`) + auto-create ticket `CHECKOUT_INSPECTION` (dedupe lewat `existingInspectionTicket`).

###### 6.3 Settlement deposit — `stays.service.ts` `processDeposit`
- Hanya saat COMPLETED/CANCELLED & depositStatus HELD.
- Aksi: FULL_REFUND / PARTIAL / FORFEIT → depositStatus final; jurnal + ledger (**blocking**).

###### 6.4 Room readiness gate — `tickets.service.ts` `close`
Tiket CHECKOUT_INSPECTION di-close → cek tidak ada stay promoted lain (`otherPromotedStays`) → status item akhir harus GOOD (`hasProblemFinalStatus`) → **Room MAINTENANCE → AVAILABLE** (`room.updateMany` di blok room-ready).

###### 6.5 Deposit ledger
`modules/deposit-ledger/deposit-ledger.service.ts` — `recordDepositReceivedTx` (idempotent), `recordDepositSettlementTx`, `summary`, **`reconciliationLite`** (alat audit bawaan), `backfillDryRun`.

**Invarian:** kamar tidak pernah AVAILABLE tanpa inspeksi; deposit diproses tepat 1×; Σ ledger per stay = depositPaid − refund − deduction.
**Fokus audit:** deposit received best-effort tapi settlement blocking — ledger bisa pincang. Jalankan `reconciliationLite`.

---

##### 7. Flow Auto-Ops (jam biologis sistem)

**File:** `modules/auto-ops/auto-ops.service.ts` — 6 sweep service, mutex advisory lock `pg_try_advisory_lock(1)`, `runAll()` sequential:

| Sweep | Operasi | Aksi |
|---|---|---|
| **BookingSweep** | `runBookingExpiry` | Booking lewat `expiresAt` tanpa submission PENDING/APPROVED → invoice CANCELLED, stay CANCELLED, room AVAILABLE. |
| | `runDownPaymentForfeit` | Stay belum promoted, lewat checkIn +1 hari tanpa pelunasan → CANCELLED, DP hangus. |
| **StaySweep** | `runOverstayForcedCheckout` | H+1 pk 12:00: stay → COMPLETED, kamar → MAINTENANCE + `allowBookingWhileCleaning=true`. |
| | `runPostCheckoutAutoCancel` | Stay belum promoted lewat planned checkout → cancel. |
| | `runRoomReleaseAtNoon` | ≥ pk 12:00 WIB: kandidat booking berakhir diproses. |
| | `runRoomHealer` | Room RESERVED yatim dipulihkan. |
| | `runOverstayEnforcement` | Kamar OCCUPIED lewat kontrak → tiket `EVICT_OVERSTAY`. |
| **RenewalSweep** | `runRenewalPriorityExpiry` | AWAITING_DP lewat hari-H → EXPIRED_PRIORITY. |
| | `runRenewalSettlementForfeit` | DP_SECURED gagal lunas H+7 → FORFEITED. |
| **AccountingSweep** | `runRentRecognition` | PSAK 72: unearned→earned bulanan. |
| | `runAutoJournalReconciliation` | Backfill jurnal warisan yang bolong. |
| | `runRecurringExpenseDrafts` | Draft biaya rutin bulanan. |
| | `runAutomaticDepreciation` | Depresiasi aset tetap bulan sebelumnya. |
| | `runAccountingAutoClose` | Tutup buku bulan lalu jika readiness aman. |
| | `runNotificationPruning` | Hapus notif >90 hari. |
| **MaintenanceSweep** | `runContractEndReminders` | Notifikasi H-10/H-7/H-3/H-1/H-day. |
| | `runTicketSlaEscalation` | Eskalasi SLA tiket (L0→admin, L1→owner). |
| | `runBelongingsAbandonment` | Barang ditinggal 30 hari → ABANDONED. |
| | `runAcCleaningSchedule` | Tiket cuci AC saat lewat interval. |
| | `runReferralRewards` | Beri poin referral saat teman aktif. |
| | `runPushDispatch` | Kirim push PWA queued. |
| **AnnouncementSweep** | `sweepAnnouncementDispatch` | Dispatch pengumuman aktif yang belum `dispatchedAt`, dedupe penerima. |

**Invarian:** job idempotent & aman dijalankan berulang; tidak pernah membatalkan stay yang sudah promoted/dibayar. Semua lewat `FOR UPDATE` re-cek. Uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi.

---

##### 8. Flow Tiket & Operasional Staf

###### 8.1 Tiket — `modules/tickets/tickets.service.ts`
- Buat: backoffice `createBackoffice` (6+ kategori), portal `createPortal` (komplain), otomatis (CHECKOUT_INSPECTION, EVICT_OVERSTAY, laporan barang).
- Siklus: `assign` → `start` (IN_PROGRESS) → `markDone` (DONE) → `close` (admin; gate kamar). Cancel dari kondisi diizinkan.

###### 8.2 Rutinitas staf — `modules/staff-routines/staff-routines.service.ts`
Template (admin `createTemplate`/`updateTemplate`) → staf `getToday` → `start`/`complete` (guard satu-kerja-aktif `assertNoActiveWork`) → KPI `getMyKpi`, progress admin `getAdminProgress`.

###### 8.3 Laporan lapangan — `modules/staff-field-reports/staff-field-reports.service.ts`
Staf lapor kondisi barang (`create`, foto) → admin `reviewQueue` → `adminReview` → validasi movement `validateMovement` + sinkron RoomItem `syncRoomItemTx` + update deskripsi tiket yang tertaut.

###### 8.4 Kinerja & review
- `modules/staff-performance/staff-performance.service.ts` — agregat bulanan per staf `getStaffMonthly` (KPI dari routine/ticket/field report events), audit kerja `createAudit`, saran audit `getAuditSuggestions`, bukti `getStaffEvidence`.
- Review tenant→staf: `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts` — `eligible`, `create` (rating; ≤2⭐ wajib komplain, ≥4⭐ pujian; anti-duplikat).

**Fokus audit:** penanganan kategori `BARANG_PINDAH` (`tickets.service.ts` `close`, `notifyBarangPindahClosed`) dan `TicketCategory.BARANG_PINDAH` (rapuh: bergantung deskripsi tiket); penugasan otomatis ke staf id terkecil (beban tidak merata); guard role `markDone` vs `close`.

---

##### 9. Flow Inventaris & Barang Kamar (detail)

**File:** `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/`

###### 9.1 Master barang gudang — `inventory-items.service.ts`
- CRUD (`create`/`update`/`findOne`/remove) — create, read, update, delete barang.
- `ensureOpeningStockSyncedTx` — sinkron stok awal.
- Update status dari lapangan `updateStatusFromField` — auto-ticket bila rusak/hilang.

###### 9.2 Pergerakan stok — `inventory-movements.service.ts`
- `create` — lock qty `lockInventoryQtyTx`, validasi kecukupan stok `validateMovementTx`, sinkron RoomItem `syncRoomItemTx`.
- `update` — mutasi resmi tidak boleh diedit langsung; `update` menolak dengan arahan buat mutasi koreksi.
- Satu movement IN/OUT mempengaruhi qty gudang + RoomItem.

###### 9.3 Barang per kamar — `room-items.service.ts`
- Daftar per kamar `findAll`, milik tenant `findMyRoomItems`.
- Update status `updateStatusFromField` — auto-ticket bila rusak/hilang.
- `create` disabled (melempar `ForbiddenException`) — hanya via movement, tidak langsung.

###### 9.4 Sinkronisasi & verifikasi
- `Verifikasi batch 5` (Audit Mega): double-apply qty TIDAK terjadi (trigger DB + sync self-healing). Tapi risiko kombinasi field-report → ticket-close tetap ada.
- `reconciliationLite` (deposit-ledger) juga mengecek qty.

**Invarian:** qty gudang = stok awal + Σ movement; RoomItem konsisten dengan movement IN/OUT per kamar; perubahan kondisi barang selalu meninggalkan jejak (ticket/field report).
**Fokus audit:** 3 jalur sinkron qty (movement, field report, ticket close) — skenario double-apply masih mungkin di edge case.

---

##### 10. Flow Keuangan Operasional (Expense, WiFi, Aset)

###### 10.1 Expense
- `modules/expenses/expenses.service.ts` CRUD (`create`/`update`/`remove`) → jurnal `postExpenseTx`.
- **Fokus audit:** delete expense — apakah jurnal ikut direversal? (M-33, FIX-14/15)

###### 10.2 WiFi Sales
- `modules/wifi-sales/wifi-sales.service.ts` CRUD (`create`/`update`/`remove`) → jurnal `postWifiSaleTx`.
- Tenant bisa order WiFi via portal.
- **Fokus audit:** delete wifi-sale — apakah jurnal ikut direversal?

###### 10.3 Aset Tetap
- `modules/assets/assets.service.ts` — CRUD `create`/`update`/`findOne`, readiness `readiness`.
- **Ledger alignment:** `previewLedgerAlignment` / `postLedgerAlignment` → `postFixedAssetLedgerAlignmentTx`.
- **Depresiasi:** `depreciationPreview` / `runDepreciation` → `AssetDepreciationRun` + `postDepreciationRunTx`.
- **Fokus audit:** depresiasi dobel-run pada bulan sama; aset terhubung roomItem/inventoryItem/expense (`validateRelations`) saat induk dihapus.

---

##### 11. Flow Akuntansi (Auto Journal Lite + Tutup Buku)

**File:** `modules/accounting/`

###### 11.1 Master & jurnal manual — `accounting.service.ts`
`seedDefaultCoa` → COA CRUD (`listAccounts`/`createAccount`/`updateAccount`) → CashAccount (`listCashAccounts`/`createCashAccount`/`updateCashAccount`) → Periode (`listPeriods`/`createPeriod`/`updatePeriod`) → Opening balance (`listOpeningBalances`/`createOpeningBalanceDraft`/`postOpeningBalance`/`voidOpeningBalance`) → Jurnal manual draft `createJournalDraft` (guard periode OPEN).

###### 11.2 Auto Journal Lite — `accounting-posting.service.ts`
- Wrapper non-tx (`postInvoiceIssued`/`postInvoicePayment`/`postExpense`/`postWifiSale`/`postDepositReceivedForStay`/`postDepositSettlement`) dan versi `*Tx` untuk: INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED/SETTLEMENT, FIXED_ASSET_ALIGNMENT `postFixedAssetLedgerAlignmentTx`, DEPRECIATION_RUN `postDepreciationRunTx`, reversal cancel invoice `postInvoiceCancellationReversalTx` / payment `postPaymentReversalTx`.
- Inti: `postBalancedJournalTx` — jurnal seimbang, idempotent per (sourceType, sourceId), skip VOID.
- Perbaikan data: `backfillAutoJournal`, `dryRunDepositBackfill`, `findUnmappedSourceIds`.

###### 11.3 Tutup buku — `accounting-period-close.service.ts`
`readiness` → `preview` → `post` (manual) / `autoCloseMonthly` → `reopen`. Readiness check per `key`: `unmapped-operational`, `depreciation`, `asset-alignment`, `trial-balance`.

###### 11.4 Kesiapan global — `accounting-readiness.service.ts` `getReadiness`.

**Invarian:** setiap jurnal seimbang; 1 sumber operasional = max 1 jurnal POSTED aktif; tidak ada posting ke CLOSED; reversal hanya untuk POSTED.
**Fokus audit:** kebijakan campuran blocking vs best-effort per sumber × pemanggil; auto-close menutup periode sementara jurnal best-effort gagal belum di-backfill.

---

##### 12. Flow Pelaporan & Dashboard Finance

###### 12.1 Laporan operasional — `modules/reports/reports.service.ts`
- monthly-income, overdue-aging, deposit-liability, expense-summary, profit-loss, financial-ratios, occupancy-daily, occupancy (rute di controller; `cash-flow` dihapus, digantikan `GET /accounting/cashflow`).

###### 12.2 Dashboard finansial — `modules/finance/finance.service.ts`
- `businessHealth` — kesehatan bisnis multi-indikator.
- `occupancySummary` — okupansi exclude RESERVED.
- `balanceSheetDraft` — neraca saldo draft.
- `ownerDashboard` — dashboard owner ringkas.
- Sejak V5.12.2 (E-4): saldo kas dari JURNAL (opening + Σ debit−kredit POSTED), bukan field manual.
- Sejak V5.12.2 (E-5): deposit liability = HELD di businessHealth & balanceSheetDraft.

###### 12.3 Perhitungan keuangan kunci
- **Balance Sheet:** Aset = Kewajiban + Ekuitas. Auto Journal Lite memastikan setiap jurnal seimbang.
- **P&L:** Pendapatan (RENT, UTILITY, PENALTY) − Beban (EXPENSE, DEPRECIATION). Trial balance terverifikasi seimbang di UAT.
- **Cashflow:** Saldo kas = opening + Σ(debit−kredit line POSTED) per CashAccount.
- **Rasio:** financial-ratios (likuiditas, profitabilitas, solvabilitas, efisiensi). Tersedia di `reports.service.ts`.

###### 12.4 Analisis ringkas — `modules/analytics/analytics.controller.ts`
- marketing, finance, operations, strategy summary.
- AI helper `modules/ai/ai.controller.ts`: business-narrative, payment-proof/analyze, reminders/personalize, classify-text.

**Fokus audit:** apakah angka reports (raw SQL) cocok dengan angka accounting (jurnal) untuk periode sama; akses role per endpoint laporan.

---

##### 13. Flow Analisis Strategis (AI & Manual)

###### 13.1 Data dasar untuk analisis
- **Keuangan:** Balance Sheet, P&L, Cashflow, Rasio dari §12.
- **Operasional:** Okupansi, turnover tenant, ticket/resolution time, KPI staf.
- **Pemasaran:** Harga kamar, tingkat booking, sumber booking (publik vs portal).
- **Inventaris:** Stok barang, kondisi barang per kamar, pergerakan stok.

###### 13.2 Metode analisis (manual, akuntabilitas tertinggi)
| Metode | Input | Output |
|---|---|---|
| **SWOT** | Data keuangan, operasional, pasar | Kekuatan, Kelemahan, Peluang, Ancaman |
| **PESTLE** | Faktor eksternal (politik, ekonomi, sosial, teknologi, hukum, lingkungan) | Risiko & peluang eksternal |
| **BCG Matrix** | Pendapatan per kamar/tier, market share relatif | Stars, Cash Cows, Question Marks, Dogs |
| **Porter's Generic** | Biaya, diferensiasi, fokus pasar | Strategi bersaing yang tepat |
| **7P Marketing** | Produk, harga, tempat, promosi, orang, proses, bukti fisik | Rencana marketing mix |

###### 13.3 AI sebagai konektor (Deepseek V4 Flash / V4-Pro)
- AI bukan sebagai pengganti, tapi **alat koneksi** antar semua indikator untuk memberikan flow dinamis.
- AI membaca semua data keuangan + operasional + strategis, lalu menghasilkan narrative bisnis dan rekomendasi.
- Contoh: AI melihat okupansi turun + pending booking tinggi + SWOT "Weakness: branding lemah" → rekomendasi 7P "Promosi: kolaborasi content creator."

###### 13.4 Status implementasi
- `modules/ai/ai.controller.ts` — endpoint AI dasar sudah ada (business-narrative, proof/analyze, reminders/personalize, classify-text).
- Integrasi Deepseek API perlu ditambahkan.
- Analisis manual (SWOT, PESTLE, BCG, Porter, 7P) saat ini belum ada endpoint khusus — tersedia via laporan keuangan + dashboard.

**Fokus audit:** pastikan AI hanya konektor, bukan penentu keputusan final; data keuangan harus akurat sebelum masuk ke analisis strategis.

---

##### 14. Flow Notifikasi, Pengumuman & PWA

###### 14.1 Notifikasi in-app
- `modules/notifications/app-notification.controller.ts` — list, read, read-all.
- `preview reminder` (`reminder-preview.controller.ts` `getAll` dan varian per jenis); `mock send` (`reminder-mock.controller.ts` `mockSend`).
- **Belum ada pengiriman email/WA nyata.**
- Notifikasi terkirim untuk payment, booking, checkout, overstay H-7/H-3/H-1/H-day, announcement, dan kompetitor menang. **Renew request/approve/reject belum memiliki notifikasi.**

###### 14.2 Pengumuman
- `modules/announcements/` — draft → publish (`announcements.service.ts` `update` dengan `isPublishing`) → tampil di portal tenant.

###### 14.3 PWA (lihat `docs/arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md`)
- Saat ini: **PWA MVP installable**, belum operasional yang kuat.
- 17 temuan audit: 3 CRITICAL (PWA-01 s.d 03: produksi tertinggal, HTTP tidak paksa HTTPS, frontend tanpa security headers), 6 HIGH, 7 MEDIUM, 1 PLANNED (push notification).
- **4 Phase perbaikan:** Phase 0 (Release Gate), Phase 1 (Cache Safety + Update + Offline UX), Phase 2 (Installability), Phase 3 (Web Push dengan outbox).
- **Aturan kunci:** Jangan cache API/auth/private data. Jangan mutation offline. Push via outbox, bukan side-effect transaksi.
- **Sedang dikerjakan AI lain** — `08_PWA` adalah dokumen aktif, bukan arsip.

---

##### 15. Gap Bisnis Real vs Kode — Temuan Audit Flow 2026-06-12

> **Sumber:** Wawancara owner 2026-06-12. Setelah dikonfirmasi, ditemukan 4 gap antara aturan bisnis asli vs implementasi kode.

> **Status 2026-10-10 — register ini potret wawancara, bukan status hari ini.** Diverifikasi ulang ke kode: **GAP #1 dan GAP #3 tampak sudah ditutup**, sehingga kalimat “Kode belum punya guard ini” dan “approval belum memvalidasi ulang dua nominal” di §3/§4 tidak lagi berlaku. Bukti: `payment-submissions.service.ts` `approveSubmission` menegakkan **dua nominal sah** (DP tepat atau pelunasan penuh) dan menolak sisanya — komentarnya sendiri `F1-1R (D-02): NO-PARTIAL`, sedangkan jalur invoice-only wajib lunas penuh · `invoice-payments.service.ts` `remove` memanggil `assertStayNotOccupiedForPaymentMutationTx`. **Batas:** ini pembacaan kode, **bukan** verifikasi runtime (tidak ada test/alur yang dijalankan); keputusan mencabut GAP adalah keputusan owner.

###### 🔴 GAP #1 — Tidak Ada Pembayaran Partial

**Aturan owner:** *"Pembayaran harus sesuai dengan kontrak sehingga kita tidak menerima pembayaran Partial."*

**Fakta kode (`payment-submissions.service.ts` `approveSubmission`):** `approveSubmission` split nominal → `rentPortion` + `depositPortion`, invoice bisa PARTIAL, kamar tetap RESERVED.

**Dampak:** Kode izinkan skenario yang tidak dikehendaki — tenant bayar sebagian, admin approve, invoice PARTIAL.

**Perbaikan:** booking hanya menerima DP tepat atau pelunasan penuh tepat; submission invoice-only dan pembayaran manual admin wajib lunas penuh. Status `PARTIAL` tetap sah untuk DP tepat.

---

###### ✅ GAP #2 — DP Renewal: Ditutup F2-1

**Implementasi aktif:** prompt H-10; prioritas tenant lama sampai hari-H; `AWAITING_DP` berakhir `EXPIRED_PRIORITY` bila melewati hari-H; DP yang terverifikasi menjadi `DP_SECURED`; pelunasan maksimal H+7; dan kegagalan menjadi `FORFEITED` melalui AutoOps. Harga renewal tetap mengikuti rent-lock.

**Keputusan operasional:** proses forced checkout dan settlement deposit setelah forfeit tetap dijalankan admin melalui flow checkout yang terkontrol, bukan tindakan otomatis tanpa review.

---

###### 🟠 GAP #3 — Admin Tidak Boleh Hapus Payment Saat OCCUPIED

**Aturan owner:** *"Room yang masih di masa kontrak, tidak dapat dibatalkan sepihak oleh admin."*

**Fakta kode (`invoice-payments.service.ts` `remove`):** saat wawancara (2026-06-12) tidak ada guard apakah room sudah OCCUPIED. **Status 2026-10-10 — guard itu sudah ada:** `remove` memanggil `assertStayNotOccupiedForPaymentMutationTx`, yang menolak bila stay promoted atau `room.status == OCCUPIED`.

**Perbaikan:** Tambah guard: tolak `remove` jika stay sudah promoted (`initialMetersPromotedAt != NULL`) atau room.status == OCCUPIED.

---

###### 🟡 GAP #4 — Refund DP untuk yang Kalah First Paid Wins (Manual via Admin)

**Aturan owner:** Tenant yang sudah transfer tapi admin terlambat verifikasi → tenant lain menang → DP dikembalikan. **Notifikasi** ke tenant yang kalah, lalu **admin transfer manual** dan kirim bukti ke tenant.

**Fakta kode:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. PENDING_REVIEW tidak tersentuh.

**Perbaikan:** Notifikasi + manual refund oleh admin (bukan auto-refund). Admin transfer balik dan upload bukti transfer.

---

###### Ringkasan Gap

| # | Gap | Severitas | Dampak |
|---|---|---|---|
| 1 | Partial payment diizinkan | 🔴 KRITIS | Pembayaran tidak sesuai kontrak |
| 2 | Renewal DP belum ada fase aman | 🔴 KRITIS | Kamar bisa dipesan double |
| 3 | Admin bisa hapus payment saat OCCUPIED | 🟠 TINGGI | Inkonsistensi data occupancy |
| 4 | Belum ada notifikasi + proses refund untuk yang kalah | 🟡 MENENGAH | Komplain tenant, manual by admin |

---

##### 16. Frontend Surface Map (ringkas)

`frontend/src/App.tsx` — ±50 route. Folder: `pages/{public,auth,portal,staff,admin,owner→(dashboard,finance,reports),bookings,stays,invoices,payments,tickets,rooms,resources,staff-routines,renew-requests,notifications,reminders,settings,profile}`.
Surface utama: publik (`/`, `/rooms`, `/register`), portal tenant (`pages/portal/*`), staf (`pages/staff/*` + staff-routines), admin/owner (stays, invoices, payments review, renew, tickets, performance, finance, reports).
State: TanStack Query + Axios; auth JWT. Audit historis UI/UX (berkas lama `_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md`) sudah dihapus dari repo; jejaknya ada di riwayat git sebelum 2026-10-05.

---

##### 17. Usulan Urutan Audit Mendatang

| Pass | Lingkup | Alasan prioritas |
|---|---|---|
| A — Uang masuk | Flow 3 + 4 + 11.2 | Jalur rupiah utama; best-effort journal; file terbesar |
| B — Mesin waktu | Flow 7 (9 job) + interaksi 3/5/6 | Tanpa manusia; tumpang-tindih job #3 vs #8 |
| C — Deposit end-to-end | Flow 2 → 3.2 → 6.3 → 6.5 + reconciliationLite | Asimetri best-effort vs blocking |
| D — Tutup buku | Flow 11.3 + 10 + cross-check 12 | Integritas laporan keuangan |
| E — Akses & keamanan | Flow 0.1 + 1 + guard role | Verifikasi @Roles per endpoint |
| F — Operasional fisik | Flow 6.4 + 8 + 9 | Konsistensi qty 3-jalur; gate kamar |
| G — Fresh deploy | Seed fondasi + reconciliation baseline | Data UAT tidak dimigrasikan sesuai D-06 |
| H — Strategis & AI | Flow 13 | Analisis manual + AI connector |
| I — PWA | Flow 14 + `08_PWA_AUDIT` | Sedang dikerjakan AI lain |

### Riwayat audit


**Status:** 🟢 Solid (1 🔴 CRITICAL ✅ FIXED). Detail → `docs/arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md`

✅ Enumeration-safe login & forgotPassword · ✅ Suspend memutus sesi via JWT `pwdAt` claim · ✅ PasswordResetToken SHA-256 hash, one-time · ✅ bcrypt · ✅ Global default-deny JWT (APP_GUARD) · ✅ Role guard (`@Roles(OWNER, ADMIN)`) · ✅ OWNER-only: periode, user, kamar, harga, deposit · ✅ Staff restriction inventory official (`@Roles`) · ✅ Rate limit (300/menit global, 10/15menit auth)

🔴 ~~P3-01: JWT 24 jam tanpa refresh token — XSS hijack risk~~ → ✅ **FIXED** 7 Jul 2026: model RefreshToken, httpOnly cookie, `/auth/refresh`, auto-refresh interceptor (🧬)
🔵 P3-02: rate limit in-memory (✅ aman di single-instance cPanel; perlu Redis jika multi-instance)


<a id="d4c-kontrak"></a>
## Bagian C — Kontrak & business rules

Tanggal: 2026-09-22
Status: aktif
Tujuan: kontrak & business rules (dari M03 Bagian 2)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [flow & kontrak](publik.md#d4c-flow) · [domain/flow.md](publik.md#d4c-flow)

> Migrasi dari docs/M03_FLOW_KONTRAK.md L551–955 pada aeedaf99
> (DOC-GOV-20260922 Tahap 3 S2.a).

### Bagian 2 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/06_CONTRACTS.md`

#### KOST48 V5 — Contracts & Business Rules
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. **Sumber historis:** `docs/arsip/legacy/2026-06-16_root_docs_pre_M/06_CONTRACTS.md` (kontrak lengkap lama; V5.9.8-A). File ini adalah distilled contracts yang hanya memuat **aturan bisnis yang masih berlaku**. Detail per domain ada di dossier `10`-`19`.

<!-- KOST48_DOCS_SYNC_20260613_CONTRACTS_CONSOLIDATED -->

##### 1. Role & Authorization Matrix

###### Role Hierarchy
```text
OWNER > ADMIN > STAFF > TENANT
Matrix eksplisit di bawah mengalahkan asumsi cascade, terutama untuk area OWNER-only.
```

###### Permission Matrix per Domain
Matrix ini memuat kontrak target keputusan owner. Area bertanda OWNER-only belum semuanya dipaksa oleh kode sampai F2-16 selesai.

| Domain | OWNER | ADMIN | STAFF | TENANT |
|--------|-------|-------|-------|--------|
| **Stays** — create/approve/cancel/complete | ✅ RW | ✅ RW | ❌ | ❌ |
| **Stays** — view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Tenant Bookings** — approve/reject | ✅ | ✅ | ❌ | ❌ |
| **Tenant Bookings** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Payment Submissions** — approve/reject | ✅ | ✅ | ❌ | ❌ |
| **Payment Submissions** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Checkout Requests** — final checkout | ✅ | ✅ | ❌ | ❌ |
| **Checkout Requests** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Renew Requests** — approve/execute | ✅ | ✅ | ❌ | ❌ |
| **Renew Requests** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Invoices** — create/issue/cancel | ✅ | ✅ | ❌ | ❌ |
| **Invoices** — view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Inventory Movements** — official (IN/OUT/ASSIGN/RETURN) | ✅ | ✅ | ❌ | ❌ |
| **Inventory Items** — read | ✅ | ✅ | ✅ (read) | ❌ |
| **Room Items** — read own room | ✅ | ✅ | ✅ | ✅ (own room) |
| **Tickets** — create/assign/close | ✅ | ✅ | ✅ (operational) | ❌ |
| **Tickets** — view own | ✅ | ✅ | ✅ | ✅ |
| **Deposit Settlement** — execute | ✅ | ❌ | ❌ | ❌ |
| **Accounting Journals** — view | ✅ | ✅ | ❌ | ❌ |
| **Accounting Period / manual journal mutation** | ✅ | ❌ | ❌ | ❌ |
| **Finance Reports** | ✅ | ✅ | ❌ | ❌ |
| **Expenses** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Room settings & pricing** — mutate | ✅ | ❌ | ❌ | ❌ |
| **Public Endpoints** | Public | Public | Public | Public |
| **Announcements** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Announcements** — view | ✅ | ✅ | ✅ | ✅ |

---

##### 2. Booking & Stay Lifecycle Contracts

###### 2.1 Booking Mandiri (Tenant Self-Booking)
- **Tidak ada model Booking.** `Stay` mewakili seluruh siklus.
- Booking = Stay `ACTIVE` + Room `RESERVED` + belum promoted.
- Huni = promoted (`initialMetersPromotedAt` terisi) + Room `OCCUPIED`.
- **DP ≠ Deposit**: DP 30% sewa (hangus bila gagal lunas, jurnal `DP_FORFEIT`). Deposit jaminan refundable.
- **First paid wins**: multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- `expiresAt` adalah batas pembayaran awal/DP. Setelah DP disetujui, expiry awal dimatikan; sisa pelunasan mengikuti deadline check-in/H+1.
- Public booking: honeypot field `website` harus selalu kosong (anti-bot, tolak request jika terisi).

###### 2.2 Admin Approval
- Booking RESERVED muncul di antrean admin.
- Approval membuat invoice (initial invoice).
- DP 30% yang disetujui mengunci kamar dan membatalkan pesaing yang belum membayar.
- Setelah sisa sewa + deposit jaminan lunas → Room OCCUPIED dan meter dipromosikan.

###### 2.3 Manual Check-in
- Check-in manual membuat Stay ACTIVE + Room OCCUPIED langsung.
- Initial invoice disimpan dengan `totalAmountRupiah` konsisten dengan invoice lines.
- Ledger jaminan + jurnal otomatis dibuat.

###### 2.4 Stay Completion / Cancel
- `StaysService.complete()`: final checkout → stay selesai.
- `StaysService.cancel()`: stay batal (dengan reversal jika perlu).
- **HIGH-RISK:** Do not move/patch casually (lihat `.clinerules`).

---

##### 3. Payment & Invoice Contracts

###### 3.1 Payment Submission
- Tenant upload bukti bayar → `PENDING_REVIEW` → admin review → `APPROVED` / `REJECTED`.
- Nominal booking yang sah hanya DP 30% tepat atau pelunasan penuh tepat. Invoice-only wajib lunas penuh.
- Approval DP dapat membuat status teknis invoice `PARTIAL`; ini bukan izin cicilan nominal bebas.
- Approval pelunasan mengubah invoice menjadi `PAID`.
- Payment submission approval harus lock rows untuk safe decision (room, stay, invoice, payment submission).
- **HIGH-RISK:** `PaymentSubmissionsService.approveSubmission()` — do not move/patch casually.

###### 3.2 Invoice
- Invoice types: `ISSUED`, `PAID`, `PARTIAL`, `CANCELLED`, `DRAFT`.
- Open invoice = status NOT `PAID` AND NOT `CANCELLED`. `DRAFT` juga blocking.
- Invoice `DRAFT` may be cancelled without reversal.
- Invoice `ISSUED`/`PARTIAL` with journal entries requires controlled cancellation/reversal.
- Renewal invoice mencakup sewa + meter (listrik, air).
- Line invoice `PENALTY` hanya untuk potongan manual (tanpa denda keterlambatan otomatis — keputusan owner D1).

###### 3.3 Pembayaran Invoice
- Pembayaran manual admin untuk invoice non-booking juga wajib lunas penuh; nominal parsial bebas tidak sah.
- Pelunasan paling lambat saat check-in.
- Gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- Rp0 / problem invoices harus diframe sebagai `perlu dicek admin`, bukan push payment action.

---

##### 4. Checkout Contracts

###### 4.1 Checkout Request
- Tenant ajukan checkout ≤ `plannedCheckOutDate` (tidak bisa extend via checkout; gunakan renew).
- Admin approve/reject checkout request — **approve bukan final checkout**.
- Approve checkout request → sinkronisasi `plannedCheckOutDate` ke approved date.
- **HIGH-RISK:** Checkout final — do not move/patch casually.

###### 4.2 Final Checkout
- Final checkout date harus dinormalisasi sebagai Jakarta business date.
- Harus menggunakan conditional update pada stay ACTIVE (anti double-click/race).
- Checkout normal diblokir semua open invoice, termasuk DRAFT.
- Forced checkout merupakan pengecualian target D-03: DRAFT di-auto-cancel dan tidak memblokir; invoice ISSUED/PARTIAL tetap memblokir keputusan otomatis.
- Setelah final checkout:
  - Room → `MAINTENANCE` / `Perlu dicek` (readiness gate)
  - Tiket `CHECKOUT_INSPECTION` dibuat (dedupe per stay/room/category)
  - Deposit settlement (jika ada deposit)
  - Final utility charge (jika ada)
- **Room readiness gate:** kamar tidak pernah `AVAILABLE` tanpa tiket `CHECKOUT_INSPECTION` ditutup.

###### 4.3 Room Readiness Gate Detail
- Checklist inspeksi staf: kebersihan, kunci, barang tertinggal, inventaris, kerusakan, foto kondisi akhir.
- Staff UI must NOT use developer/internal permission copy (lifecycle, official movement, final checkout, approval finance, computed by system).
- Public display: `MAINTENANCE` → `Sedang dicek`, `canBook=false`.
- Public CTA for maintenance rooms: `Tanya Ketersediaan`, not `Ajukan Booking`.
- `allowBookingWhileCleaning=true` — kotor tapi bisa dipesan; huni menunggu tiket pembersihan ditutup.

---

##### 5. Renew Contracts

###### 5.1 Renew Request
- **Kode saat ini:** tenant ajukan → admin approve → stay langsung diperpanjang.
- **Kontrak target mengikat:** tenant lama mendapat prioritas eksklusif sampai hari-H tanpa DP; prompt H-10; DP 30% mengamankan renewal; pelunasan maksimal H+7 dari DP.
- Jika hari-H belum ada DP, prioritas berakhir dan kamar dibuka publik. Jika H+7 setelah DP belum lunas, DP hangus dan forced checkout berlaku.
- Rent-loyalty: harga renewal tidak naik selama kontrak tidak putus.
- Renew invoice mencakup sewa + meter dengan periode menyambung tanpa gap/overlap.
- **HIGH-RISK:** `StaysService.renewStay()` — do not move/patch casually.

---

##### 6. Deposit Contracts

###### 6.1 Deposit Jaminan
- Deposit adalah **dana titipan / liability**, BUKAN revenue/omzet/profit.
- Diisi saat booking LUNAS atau check-in manual (nominal dari `Room.defaultDepositRupiah`).
- Dicek saat checkout.

###### 6.2 Deposit Settlement
- Tipe settlement: `FULL_REFUND`, `PARTIAL`, `FORFEIT`.
- Harus dalam transaksi.
- Conditional update dari `HELD` (anti double processing).
- Dilarang untuk zero deposit.
- `FORFEIT` tidak diizinkan untuk zero-deposit cases.
- Partial deduction dan forfeit memerlukan meaningful notes.
- Jurnal `JE-AUTO-DEPOSIT-SETTLEMENT` diposting.
- **HIGH-RISK:** Deposit settlement — do not move/patch casually.

---

##### 7. Inventory Contracts

###### 7.1 Official Stock Truth
- `InventoryMovement` + synced `InventoryItem.qtyOnHand` + `RoomItem` = source of truth.
- Staff **dilarang** membuat official `InventoryMovement` (403).
- Direct `qtyOnHand` edit dilarang; gunakan Mutasi Stok.

###### 7.2 Movement Types
- `IN`: barang masuk gudang (opening stock, restock).
- `OUT`: barang keluar gudang.
- `ASSIGN_TO_ROOM`: pasang ke kamar, kurangi qtyOnHand, buat RoomItem.
- `RETURN_FROM_ROOM`: kembali dari kamar, validasi stock room, kurangi RoomItem, tambah qtyOnHand.
- `PATCH` existing movement diblokir; koreksi pakai movement baru.
- Staff reports physical issues / restock needs via tiket/laporan, NOT official mutation.

###### 7.3 Item Condition Tracking
- RoomItem condition: `GOOD` → `Baik`, `DAMAGED` → `Rusak`, `MISSING` → `Hilang`, `NEEDS_REPAIR` → `Perlu dicek`.
- Stock health dihitung: `habis` / `menipis` / `aman` dari `qtyOnHand` vs `minQty`, bukan dipilih manual.

###### 7.4 Room Item Report (Staff)
- Staff field report → buat tiket (tidak auto-create official movement).
- Admin review staff report → `APPROVE` / `REJECT`.

---

##### 8. Ticket Contracts

###### 8.1 Ticket Lifecycle
- `OPEN` → `IN_PROGRESS` → `DONE` → `CLOSED`; `CANCELLED` tersedia dari kondisi yang diizinkan.
- Kategori: `CHECKOUT_INSPECTION`, `EVICT_OVERSTAY`, `BARANG_PINDAH`, `AUDIT_INVENTARIS`, `PEMERIKSAAN`, dll.
- Auto-created tickets: `CHECKOUT_INSPECTION` (setelah final checkout), `EVICT_OVERSTAY` (H-day overstay).

###### 8.2 Staff Ticket Rules
- Staff dapat close ticket `CHECKOUT_INSPECTION` (guard keselamatan tetap).
- Close safe inspection → room `MAINTENANCE` → `AVAILABLE`.
- Room tidak bisa AVAILABLE jika: ada active stay lain, room tidak MAINTENANCE, kondisi tidak aman.

---

##### 9. Notification Contracts

###### 9.1 Notification Types
- **Hanya in-app** (keputusan owner D2, 2026-06-11).
- Rencana jangka panjang: PWA push notification.
- **Belum ada email/WA nyata** (hanya preview/generate).

###### 9.2 Trigger Events
- Tenant: booking approve, payment accept/reject, checkout approve, invoice terbit, denda, reminder kontrak.
- Admin: booking baru, payment submission, pengajuan checkout, pengajuan renew.

---

##### 10. Accounting & Finance Contracts

###### 10.1 Auto Journal Lite
- Jurnal otomatis idempotent per `(sourceType, sourceId)`.
- Auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh).
- Reversal cancel invoice kini blocking di semua jalur.

###### 10.2 COA
- **38 akun** (dikoreksi dari klaim V1 17/17).

###### 10.3 Finance Reports
- Balance Sheet, P&L, Cashflow, Piutang Aging, Deposit Liability.
- Deposit must remain dana titipan/liability.
- Finance readiness smoke surfaces: accounting readiness, asset readiness, invoices, payment review, deposit ledger summary, reconciliation-lite.

###### 10.4 Deposit Ledger
- `GET /api/deposit-ledger/summary`
- `GET /api/deposit-ledger/reconciliation-lite` — `ready=true`, `mismatchCount=0`.

---

##### 11. Overstay & Auto-Ops Contracts

###### 11.1 Overstay Lifecycle
- Kode saat ini mengirim H-7, H-3, H-1, H-day. Target keputusan owner menambah H-10.
- H-day pk 12:00: kamar dibuka publik + tiket `EVICT_OVERSTAY`.
- H+1 pk 12:00: forced checkout otomatis.
- Kamar → `MAINTENANCE` + `allowBookingWhileCleaning=true`.
- **Pengecualian:** tagihan belum lunas → tidak auto-checkout, admin dapat alert.

###### 11.2 Auto-Ops Jobs (9 sequential)
1. `bookingExpiry`
2. `contractEndReminders`
3. `downPaymentForfeit`
4. `overstayForcedCheckout`
5. `postCheckoutAutoCancel`
6. `roomReleaseAtNoon`
7. `roomHealer`
8. `overstayEnforcement`
9. `accountingAutoClose`

---

##### 12. UI/UX Contracts

###### 12.1 Language Rules
- Gunakan Bahasa Indonesia bisnis/tenant, bukan backend jargon.
- Contoh mapping:
  - `stay` → `masa sewa`
  - `invoice` → `tagihan`
  - `payment submission` → `bukti pembayaran`
  - `PENDING_REVIEW` → `bukti diperiksa`
  - `checkout request` → `ajukan keluar`
  - `renew request` → `ajukan perpanjangan`
  - `deposit` → `dana titipan` / `deposit titipan`
  - `GOOD` → `Baik`, `DAMAGED` → `Rusak`, `MISSING` → `Hilang`
  - `Queue` → `Antrean`

###### 12.2 UI Behavior
- Compact mode: hindari oversized cards, excessive hero blocks, repeated copy.
- Satu destinasi = tidak boleh duplikasi CTA di section yang sama.
- Row clickable = tidak perlu tombol `Detail/Lihat` redundan.
- Tabel/list default 10 baris per halaman.
- Filter harus visually lighter dari primary actions.
- Filter reset pagination ke page 1.
- Tidak ada global search di header kecuali page-specific search diperlukan.

###### 12.3 Empty State & No-Op Rules
- No-op buttons, decorative CTAs, misleading `lihat antrean` dilarang.
- Empty states harus sesuai section, tidak boleh klaim "no work" jika masih ada queue/table di bawahnya.
- Jika elemen terlihat seperti primary button, harus melakukan real action.

---

##### 13. Safety Belts

###### 13.1 Booking Safety
- Rate limit public booking.
- Honeypot `website` field anti-bot.
- First-paid-wins gate.

###### 13.2 Payment Safety
- Lock rows during payment approval (payment submission, room, stay, invoice).
- Anti double-processing pada deposit settlement (conditional HELD).
- Invoice open blocking untuk checkout normal; forced checkout mengikuti pengecualian D-03.

###### 13.3 Inventory Safety
- Staff 403 untuk official movement.
- RETURN_FROM_ROOM: validasi cukup stock di RoomItem, block return > room stock (409).
- Short movement note → 400.
- Direct qtyOnHand edit dilarang.

###### 13.4 Room Readiness Safety
- Room tidak AVAILABLE tanpa CHECKOUT_INSPECTION ditutup.
- Ada active stay lain → tidak AVAILABLE.
- Kondisi tidak aman → tidak AVAILABLE.

###### 13.5 Concurrency
- Final checkout: conditional update pada stay ACTIVE.
- Deposit settlement: conditional update dari HELD.

---

##### 14. Deploy & Environment Rules

- **DEPLOY = FRESH** (keputusan V3/D-06, diperjelas D-30): buat database produksi BARU → seed COA → opening balance, BUKAN migrasi data UAT dan bukan drop otomatis database UAT. Setelah go-live gunakan patch migration saja; lihat `DEPLOYMENT_ONLINE_20260723.md`.
- Backfill data lama TIDAK berlaku.
- Generated Prisma files adalah build artifacts, harus di-restore sebelum commit.
- No production DB mutation.
- No schema change tanpa explicit approval.
- Runbook: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md`.

---

##### 15. Known Gaps & Deferred Features

| Gap | Status | Rencana |
|-----|--------|---------|
| No service-to-service HTTP | Deferred | V5.7+ architecture extraction |
| No separate database per app | Deferred | Shared DB tetap di V5 Phase 0/1 |
| No refresh token | Deferred | 24 jam JWT |
| No email/WA delivery | Deferred | PWA push planned |
| No damage/penalty model | Deferred | B5 future batch |
| Deposit ledger | Active | Reconciliation tersedia; source-id edge case masih perlu hardening |
| Fixed asset/depreciation | Active manual | Otomasi depresiasi bulanan masih future |
| No round-robin ticket assignment | Deferred | 1 staf, ditunda |
| No WIB timezone handling | Deferred | F2-14 |
| Baseline finance tests belum ada | Fase 1 | F1-T, zero-dependency `node --test` |

---

##### 16. HIGH-RISK FLOWS — DO NOT MOVE / DO NOT PATCH CASUALLY

| Flow | Service | Kepemilikan |
|------|---------|------------|
| `PaymentSubmissionsService.approveSubmission()` | core-api | Mutasi Stay/Room/Invoice/Deposit |
| `StaysService.create()` | core-api | Stay lifecycle creation |
| `StaysService.complete()` | core-api | Checkout final |
| `StaysService.renewStay()` | core-api | Renew execution |
| `TenantBookingsService.approveBooking()` | core-api | Booking approval |
| `StaysService.cancel()` | core-api | Stay cancellation with reversal |
| Deposit settlement | core-api | Mutasi deposit HELD → REFUNDED/FORFEIT |
| Room status writes | core-api | OCCUPIED/AVAILABLE/MAINTENANCE/RESERVED |
| Meter promotion | core-api | initialMetersPromotedAt |

---

##### 17. PowerShell Verification Commands (Quick Reference)

```powershell
# Public rooms smoke
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"

# Admin login (kata sandi DEV default: lihat docs/operations/default-dev.md — sengaja tidak ditulis di contoh ini)
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"<kata-sandi-DEV>"}'; $token=$login.data.accessToken

# Payment review queue
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}

# Deposit reconciliation
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/deposit-ledger/reconciliation-lite" -Headers @{Authorization="Bearer $token"}

# Accounting readiness
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}

# Staff mutation block expected 403
try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/inventory-movements" -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"roomId":1,"inventoryItemId":1,"quantity":1}' } catch { $_.Exception.Response.StatusCode.value__ }
```

---

**Referensi silang dossier domain:**
- Booking & Stay: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/10_PEMBAYARAN_INVOICE.md` + `docs/arsip/legacy/2026-06-16_root_docs_pre_M/11_BOOKING_RENEWAL.md`
- Checkout & Deposit: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/12_CHECKOUT_DEPOSIT_OVERSTAY.md`
- Akuntansi & Laporan: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/13_AKUNTANSI_LAPORAN.md` + `docs/arsip/legacy/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md`
- Inventaris: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/14_INVENTARIS.md`
- Staf & Tiket: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/15_STAF_TIKET_KPI.md`
- Notifikasi: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/16_NOTIFIKASI_PENGUMUMAN.md`
- Publik & Marketing: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md`
- Auth & Onboarding: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/18_AUTH_FONDASI_ONBOARDING.md`
- Flow Map: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/02_FLOW_MAP.md`
- Keputusan Owner: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/03_KEPUTUSAN_OWNER.md`
- Deploy & PWA: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md`
- Blueprint: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/00_BLUEPRINT.md`

**Sumber historis lengkap:** `docs/arsip/legacy/2026-06-16_root_docs_pre_M/06_CONTRACTS.md` (V5.9.8-A; arsip)

---

<a id="override-fase-v--status-kamar"></a>
<a id="override-fase-v---status-kamar"></a>
<a id="override-booking-flow-fase-v-2026-06-30-aktif"></a>
### Override Fase V — Status Kamar
Dampak keuangan: [keuangan.md](keuangan.md#override-fase-v--dampak-keuangan).

> Aturan di section ini masih berlaku dan mengesampingkan narasi historis.
> Dimigrasi dari M03 (via changelog) pada 7186693e — Tahap 3 S2.a.

**Kontrak terbaru mengalahkan narasi historis di bagian lama dokumen ini.** Bagian `0.2 Representasi "Booking"` di bawah masih menyimpan model lama untuk konteks arsip, tetapi eksekusi baru wajib mengikuti Fase V di [domain/kontrak.md](publik.md#d4c-kontrak) dan [domain/keuangan.md](keuangan.md).

State final status kamar:

```txt
Booking dibuat, belum bayar        -> Room AVAILABLE
DP 30% approved                    -> Room RESERVED
Full payment approved              -> Room RESERVED
Check-in/serah kunci setelah lunas  -> Room OCCUPIED
```

Aturan baru:

- `RoomStatus.BOOKING` tidak boleh ditulis lagi oleh runtime; jika masih ada di DB, perlakukan sebagai legacy-only.
- `RESERVED` berarti kamar terkunci oleh pembayaran approved, tetapi belum tentu lunas.
- Lunas dibaca dari invoice/payment asli, bukan dari status kamar dan bukan dari `downPaymentPaidRupiah`.
- Payment approval tidak boleh set `OCCUPIED` dan tidak boleh promote meter.
- Check-in/serah kunci wajib invoice sewa awal lunas; saat itulah `initialMetersPromotedAt` dan meter awal dipromosikan.

### Fase G AI sebagai Sidecar Approval (2026-06-19, aktif)
> Aturan AI tidak boleh memanggil promote stay, approve payment, dan batasan serupa masih berlaku.
> Dimigrasi dari M03 (via changelog) pada 821495c8 — Tahap 3 S2.

AI/DeepSeek tidak menambah state machine baru untuk booking, invoice, stay, renewal, checkout, ticket, inventory, atau KTP. AI hanya menjadi sidecar manual Owner/Admin: membaca snapshot ringkas, membuat draft/rekomendasi, lalu manusia menekan tombol approve/simpan existing. Detail penuh: `docs/domain/ai.md`.

- **Tidak ada transisi otomatis:** AI tidak boleh memanggil promote stay, approve payment, reject payment, verify KTP, close ticket, create inventory movement, post journal, atau open room tanpa aksi manusia.
- **Endpoint domain tetap sumber kebenaran:** semua mutasi tetap lewat controller/service existing yang sudah punya guard status, role, transaksi, dan audit.
- **Audit flow:** jika manusia memakai rekomendasi AI, audit domain tetap dibuat dan `AuditLog.meta.ai` mencatat feature/model/hash/confidence/humanDecision.
- **Fallback:** jika AI mati/limit/error, seluruh flow kontrak tetap berjalan manual seperti sebelum Fase G.

