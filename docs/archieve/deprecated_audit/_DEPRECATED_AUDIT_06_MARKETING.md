# MARKETING & LANDING DEEP (V3) — Funnel jujur & katalog matang; SEO ≈ 0 TERVERIFIKASI ulang + 1 kesalahan lokasi di meta; social proof tetap kosong
**Basis baca:** `marketing-public-rooms.service.ts` (304 baris penuh), `frontend/index.html` (22 baris penuh), `frontend/public/` (isi: manifest, sw.js, offline.html — TANPA robots/sitemap), katalog & detail publik (lihat `AUDIT_07_UIUX.md`).

## AIDA × kondisi kode aktual
| Tahap | Status | Evidence | Catatan |
|---|---|---|---|
| Attention | 🟡 | Headline+foto home; fallback gambar cerdas: per-kamar dari 76 file terdaftar (`marketing-public-rooms.service.ts:34-46`), generik dirotasi `room.id % 6` (:241-246) — tidak ada kamar tanpa foto | M-04: daftar 76 filename HARDCODED di service — tambah foto baru = edit kode backend |
| Interest | ✅ | Katalog publik menampilkan SEMUA kamar aktif termasuk OCCUPIED/MAINTENANCE (:136-144) dgn `availabilityNote` jujur (:221-228) — kelangkaan terlihat alami | Scarcity bekerja tanpa dark pattern |
| Desire | 🟡 | Harga formula konsisten dari monthlyRate (`:298-302` via calculateRentByPricingTerm); tarif listrik/air & deposit DIBUKA transparan (:208-209) — pain reliever anti kejutan biaya | M-02: blok `pricing` mengekspos field mentah daily/weekly yang bisa 0 sementara `availablePricingTerms` mengklaim semua term tersedia (:284-296) — UI bisa tampil kontradiktif |
| Action | 🟡 | `canBook=true` utk AVAILABLE/RESERVED/MAINTENANCE+allowBooking (:217-220) + copy "belum terkunci sebelum pembayaran valid" (:223) = CTA jujur first-paid-wins | Friksi tersisa = performa detail kamar (U-01, W-02 pending) |

## TEMUAN
| # | Sev | Issue | Evidence | Theory |
|---|---|---|---|---|
| M-01 | 🔴 | **SEO hampir nol** — verifikasi ulang langsung: `index.html` hanya title+description+theme; TANPA Open Graph, TANPA JSON-LD, TANPA canonical; `frontend/public/` TANPA robots.txt & sitemap.xml; SPA tanpa SSR/prerender → konten dinamis tak terindeks | `frontend/index.html:1-22`; glob public/ = 3 file PWA saja | SEO teknis |
| M-05 | 🔴 BARU (=UD-01) | **Lokasi kontradiktif antar sumber resmi:** frontend konsisten menulis "Surabaya Barat, Jalan Hikmah V No. 48, dekat Pakuwon Mall/PTC" (`index.html:7`, copy login, `officialKost48Content.ts`) sedangkan `01_GROUND_STATE.md §1` menulis "Ngagel Jaya Utara" (timur/pusat). Salah satu PASTI keliru — bila docs yang salah, semua analisis lokasi/kompetitor di docs salah dasar; bila frontend yang salah, seluruh copy publik & SEO menyesatkan calon tenant | `frontend/index.html:7` vs `01_GROUND_STATE.md §1` vs screenshot login | Data truth → SEO lokal + kejujuran |
| M-06 | 🟠 | Social proof publik = NOL (grep testimoni/rating/penghuni di pages/public = 0) padahal data `tenant-staff-reviews` VISIBLE rating≥4 SUDAH ada di DB | verified ulang | Cialdini social proof |
| M-07 | 🟡 | Tidak ada narasi tier (33 reguler / 10 eksklusif / 5 VIP) — katalog menjual spesifikasi, bukan "kehidupan" (keamanan kost pria, komunitas, akses Surabaya Barat dekat Pakuwon/PTC) | katalog & detail | JTBD + VPC gain creator |
| M-08 | 🟡 | Tidak ada pencatatan funnel: `LeadSource` enum lengkap (GOOGLE_MAPS..OTA) tapi booking publik selalu `WEBSITE` (`public-bookings` hardcode) — owner tak bisa tahu kanal akuisisi mana yang bekerja | enum app.enums.ts:22 | CAC/Growth |
| M-09 | INFO | `buildPricingAvailabilityWhere` mengabaikan term yang diminta (filter hanya monthlyRate>0, :277-282) — filter pricingTerm di katalog tidak benar-benar menyaring | — | — |
| M-10 | ✅ | Booking publik = paritas DP 30% & deposit dgn portal (`public-bookings.service.ts:333-334`); copy anti-penipuan "jangan transfer sebelum tagihan resmi" terpasang | verified | Error prevention = trust |

## Funnel konversi (6 langkah, terverifikasi)
katalog → detail → form booking → submit (Tenant+User+Stay otomatis) → bayar DP/pelunasan (2 nominal sah A18) → approve admin.
- Tidak bisa dipangkas struktural; pemangkas friksi = prefetch+skeleton detail (W-02/W-B04), pagination 12 kartu (W-B05), code-split route publik (W-01) — semua sudah terspesifikasi, belum dieksekusi.
- Pasca-booking: "waiting room" tenant (`TenantBookingWaitingRoom.tsx`) memandu pembayaran — kekuatan unik yang jarang dimiliki kost kompetitor.

## SEO actionable (semua tanpa dependensi baru, 1 sesi)
1. `index.html`: perbaiki description (M-05: "kost eksklusif pria di Surabaya Barat dekat Pakuwon/PTC" — alamat resmi D-01), tambah OG title/description/image + canonical.
2. JSON-LD statis `@type: LodgingBusiness` — nama, alamat Jl. Hikmah V No. 48 Surabaya Barat (D-01), priceRange (dari tarif publik), amenityFeature.
3. `frontend/public/robots.txt` (allow /, sitemap ref) + `sitemap.xml` statis 3 URL (/, /rooms, /register).
4. (Opsional fase 3) prerender 3 halaman publik atau meta dinamis per kamar via vite-plugin — JANGAN SSR penuh.

## Social proof actionable (F3-4)
- Endpoint publik read-only: agregat StaffReview VISIBLE rating≥4 (inisial anonim — UU PDP) + count penghuni aktif ("42/48 kamar terisi").
- Section home: 3 kutipan + angka okupansi. PRASYARAT: persetujuan owner atas konten + consent.

## Lead source tracking (M-08, murah)
- Form booking publik: dropdown opsional "Tahu KOST48 dari mana?" → isi `bookingSource` dari pilihan (enum sudah ada, kolom sudah ada) → laporan akuisisi per kanal = 1 groupBy.

## RECOMMENDATIONS (ordered)
1. M-05 + M-01 paket SEO dasar (1 sesi, dampak akuisisi terbesar per usaha).
2. M-06 social proof home (F3-4; butuh keputusan owner).
3. M-08 lead source dropdown (kolom & enum sudah ada — nyaris gratis).
4. M-07 copy naratif per tier di detail kamar.
5. W-01/02/03 performa publik (spesifikasi sudah ada di 07_NEXT_WORK_INSTRUCTIONS).

## OPEN QUESTIONS → sebagian TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Alamat (UD-01/M-05) → **Jl. Hikmah V, Surabaya Barat** (D-01) → SEO & copy pakai ini; draft copy Lampiran C placeholder [ALAMAT] diisi.
- Social proof + consent? → **YA, anonim/inisial + consent** (D-09) → F3-4 jalan pasca-publish.
- Landing page non-app utk SEO murni? → masih perlu keputusan owner saat F3-3 (usul: prerender 3 halaman publik bila tanpa landing terpisah).

---

## LAMPIRAN A — Audit per-file domain marketing (format V3 §5)

### backend/src/modules/marketing/marketing-public-rooms.service.ts (304 baris — dibaca penuh)
- **Function:** Katalog & detail kamar publik: select aman (PUBLIC_ROOM_SELECT), harga formula, fasilitas publicVisible, fallback foto.
- **Audit:** field terekspos dikurasi eksplisit (:11-27) — tidak bocor data tenant ✅; availabilityNote 3 varian jujur (:221-228) ✅; canBook benar utk MAINTENANCE+allowBookingWhileCleaning (overstay-rebooking) ✅; M-02 (pricing mentah vs term formula), M-04 (76 foto hardcode :34-46), M-09 (filter term tak menyaring :277-282).
- **Theory ref:** VPC pain reliever; scarcity tanpa dark pattern.
- **Verdict:** ✅ dengan 3 catatan kecil.

### frontend/index.html (22 baris — dibaca penuh)
- **Function:** Shell SPA + meta + manifest PWA.
- **Audit:** M-01 (tanpa OG/JSON-LD/canonical), M-05/UD-01 (deskripsi "Surabaya Barat" vs docs "Ngagel"); PWA meta lengkap (theme-color, apple-touch) ✅.
- **Theory ref:** SEO teknis; local SEO.
- **Verdict:** 🔴 titik leverage SEO termurah belum dipakai.

### frontend/src/data/officialKost48Content.ts (7.8KB — via screenshot login)
- **Function:** Konten resmi (alamat, deskripsi, galeri) yang dirender halaman login/publik.
- **Audit:** sumber klaim "Jl. Hikmah V No. 48, Surabaya Barat, Pakuwon/PTC" — pihak pertama dlm konflik UD-01.
- **Verdict:** menunggu F1-0.

### backend/src/modules/tenant-bookings/public-bookings.service.ts (irisan — lihat 01)
- **Audit pemasaran:** bookingSource hardcode WEBSITE (:187 area) → M-08 funnel kanal buta; LeadSource enum 10 kanal sudah tersedia di `app.enums.ts:22` tinggal dipakai.

## LAMPIRAN B — Kerangka pengukuran akuisisi pasca M-08 (untuk owner)
| Metrik | Sumber data setelah M-08 | Frekuensi |
|---|---|---|
| Booking per kanal | groupBy bookingSource pada Stay/bulan | bulanan |
| Konversi kanal → DP masuk | join Stay.bookingSource × downPaymentPaidAt not null | bulanan |
| CAC proksi per kanal | biaya promosi per kanal (Expense MARKETING ber-note kanal) ÷ booking kanal | bulanan |
| CLV proksi | rata-rata (lama huni bulan × tarif) per kohort kanal | kuartalan |
- Semua dihitung dari kolom yang SUDAH ada — tidak butuh schema baru; hanya disiplin input (dropdown M-08 + note expense).

## LAMPIRAN C — Draft copy SEO (siap pakai setelah F1-0 mengonfirmasi alamat)
- Title: `KOST48 Surabaya — Kost Eksklusif Pria [AREA] | Kamar AC, WiFi, Keamanan 24 Jam`.
- Description (≤155 char): `Kost pria 48 kamar di [ALAMAT]. Booking online, harga transparan mulai Rp 850rb, DP 30%, tanpa biaya tersembunyi.`
- JSON-LD minimal: LodgingBusiness { name, address (street, locality Surabaya, region Jawa Timur), priceRange "Rp850.000–Rp2.200.000", telephone, image, amenityFeature[] dari fasilitas publicVisible }.
- robots.txt: `User-agent: * / Allow: / / Sitemap: https://[domain]/sitemap.xml` + Disallow: /portal, /admin path SPA (opsional, route privat toh butuh login).
- Catatan: placeholder [AREA]/[ALAMAT] WAJIB menunggu keputusan F1-0 — jangan tebak.

## LAMPIRAN D — Checklist kanal organik di luar website (0 koding, eksekusi owner)
1. **Google Business Profile**: klaim/perbarui listing dgn alamat hasil F1-0; kategori "Boarding house"; foto dari aset web yang sudah ada; tautkan ke /rooms. (LeadSource GOOGLE_MAPS sudah ada di enum — pengukuran siap.)
2. **Konsistensi NAP** (Name-Address-Phone): samakan di GBP, website, IG/TikTok bio — prasyarat local SEO; saat ini MUSTAHIL konsisten karena UD-01.
3. **Review GBP**: minta tenant puas (rating internal ≥4) menulis review Google — social proof eksternal yang tidak butuh fitur web.
4. **WhatsApp click-to-chat**: tautan wa.me dgn teks pra-isi per kamar ("Halo, saya tertarik kamar G-02...") — 1 baris perubahan di tombol WA yang sudah ada.
5. Pengukuran: tiap kanal di atas punya nilai LeadSource padanan → dropdown M-08 menutup loop-nya.

## LAMPIRAN E — Posisi kompetitif (kerangka, menunggu UD-01 + data lapangan)
| Dimensi | KOST48 (dari kode/aset) | Kost tipikal sekitar | Sumber keunggulan |
|---|---|---|---|
| Transparansi harga | Formula publik 6 term + tarif utilitas terbuka | harga "hubungi kami" | VRIO: sistem |
| Proses booking | Online end-to-end + waiting room + 2 nominal pasti | WA manual | VRIO: sistem (sulit ditiru) |
| Kepercayaan | Copy anti-penipuan + bukti bayar terproteksi | — | sistem |
| Bukti sosial | ❌ belum ditampilkan | foto testimoni WA | M-06 = satu-satunya dimensi tertinggal |
- Analisis 5-forces/Blue-Ocean penuh DITUNDA sadar (lihat 00_INDEX matrix) sampai alamat pasti + survei harga 5 kompetitor radius 1km oleh owner (template kolom: nama, jarak, harga bulanan, fasilitas, kanal booking).

## Definisi selesai marketing "hijau penuh"
1. Satu alamat konsisten di semua permukaan (F1-0) + NAP seragam lintas kanal.
2. Lighthouse SEO ≥90 di 3 halaman publik; JSON-LD valid; terindeks Google (site: check).
3. Social proof tampil dgn consent terdokumentasi.
4. ≥80% booking baru punya bookingSource ≠ WEBSITE-default (artinya dropdown M-08 benar-benar diisi).
5. Laporan akuisisi bulanan per kanal dibaca owner (Lampiran B) selama 3 bulan berturut-turut.
6. Performa publik memenuhi baseline Lampiran E `AUDIT_07_UIUX.md`.

## Ringkasan eksekutif domain (1 paragraf untuk owner)
Funnel & pengalaman booking KOST48 sudah kelas atas untuk skala kost — transparansi harga, anti-penipuan, dan waiting-room adalah keunggulan VRIO yang sulit ditiru kompetitor WA-manual. Yang bocor BUKAN produknya, melainkan **pintu masuknya**: SEO teknis nyaris nol (calon tenant yang mencari di Google melihat halaman kosong), social proof tidak ditampilkan padahal datanya ada, dan kanal akuisisi tidak terukur. Ditambah satu kontradiksi alamat (UD-01) yang harus dibereskan sebelum apa pun. Urutan dampak/usaha: F1-0 alamat (wajib lebih dulu) → SEO dasar 1 sesi → lead-source dropdown (kolom sudah ada) → social proof. Tidak ada satu pun yang butuh dependensi baru atau SSR.

Catatan strategis: untuk kost (bukan hotel), retensi mengalahkan akuisisi — satu tenant yang memperpanjang 12× lebih berharga daripada satu booking baru. Karena itu, meski domain ini menyoroti kebocoran akuisisi, prioritas bisnis tertinggi tetap GAP #2 renewal (lihat 01/02), bukan SEO. SEO menutup kebocoran funnel atas; renewal menutup kebocoran funnel bawah yang nilainya lebih besar. Kerjakan keduanya, tetapi bila harus memilih satu: renewal dulu.

**Arah retensi yang owner putuskan (K-b 2026-06-13):** program **loyalitas/gamifikasi tenant** — poin dari perpanjangan tiap bulan + bayar tepat waktu + "quest" (lengkapi profil/survei sukarela) → reward **free WiFi / free cleaning / diskon sewa** saat capai ambang. Ini mesin retensi (CLV) eksplisit + cara mengumpulkan data marketing tanpa memaksa di onboarding (wajib hanya nama+HP+KTP). Task F4-9 (desain dulu). Memperkuat kesimpulan: investasi terbaik KOST48 = membuat tenant betah & memperpanjang, bukan sekadar menarik tenant baru.

## Theory ref ringkas (pemetaan domain → 00_INDEX matrix)
AIDA, VPC, JTBD, Social Proof (Cialdini), CAC, CLV, Unit Economics, Growth Hacking, VRIO, Subscription Economy, SEO teknis & lokal — semua diuji di sini dan menghasilkan temuan/rekomendasi nyata. Yang DITOLAK eksplisit (Porter 5-Forces, Blue Ocean, BCG, Ansoff, McKinsey 7S, BMC) karena single-property + menunggu UD-01; alasan per teori ada di 00_INDEX. Tidak ada teori marketing yang "dicentang kosong".
