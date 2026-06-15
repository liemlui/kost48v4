# UI/UX FORENSIK DEEP (V3) — 13 teori × 7 surface; 5 screenshot dievaluasi langsung; 1 temuan DATA-TRUTH kritis (lokasi kontradiktif); W-01 ternyata SUDAH terpasang
**Basis:** baca kode `App.tsx` (routing+lazy), `PublicRoomsPage.tsx`, `PublicRoomDetailPage.tsx`, `PublicGuestDashboardPage.tsx` (targeted) + evaluasi visual 5 screenshot dari `_uiux_audit_2026-06-12/` (123 file): `public/home-mobile.png`, `public/rooms_14_detail-mobile.png`, `public/login-mobile.png`, `owner/owner-dashboard-mobile.png`, `admin/payment-submissions_review-mobile.png`.

## 🔴 UD-01 — TEMUAN DATA-TRUTH: LOKASI KONTRADIKTIF (prioritas konfirmasi owner #1)
- **Frontend** (`login-mobile.png` + copy login page + `index.html:7`): "Kos **Surabaya Barat** dekat **Pakuwon Mall / PTC**", badge "**Jalan Hikmah V No. 48, Surabaya Barat**".
- **Docs** (`01_GROUND_STATE.md §1`): "48 kamar, **Ngagel Jaya Utara**" (= Surabaya timur/pusat, dekat Gubeng — BUKAN barat).
- Dua sumber kebenaran resmi saling membantah alamat properti. Dampak: SEO lokal salah target, ekspektasi calon tenant salah, dan SELURUH analisis kompetitor/harga di docs strategi bisa salah dasar. **Wajib konfirmasi owner lalu koreksi sisi yang salah** (kemungkinan docs yang salah, karena copy frontend sangat spesifik: Jalan Hikmah V No. 48 + konten `officialKost48Content.ts`).

## Status eksekusi W-01..W-03 (koreksi V1 — sebagian SUDAH dikerjakan AI PWA di working tree)
| Item | Status V1 | Status AKTUAL (verifikasi kode 2026-06-13) |
|---|---|---|
| W-01 code splitting route | ❌ pending | ✅ **TERPASANG** — `App.tsx:19-51`: 33 route `lazy()`; halaman publik (login, home, katalog, detail, guest booking) eager :10-17 — arsitektur benar |
| Sisa W-01 | — | 🟠 `PublicGuestDashboardPage` EAGER (:13) DAN import recharts (:5 Pie/PieChart) → ±100KB+ chart lib tetap di first-load publik (V-1 MASIH VALID) |
| W-02 skeleton detail kamar | ❌ | 🟡 SEBAGIAN — error state + EmptyState SUDAH ada (`PublicRoomDetailPage.tsx:262-263`); loading masih Spinner, bukan skeleton |
| W-03/W-B05 pagination katalog | ❌ | ❌ tetap — `PublicRoomsPage.tsx` render semua kartu, tanpa "Tampilkan 12 lagi"; loading = Spinner inline (:440-441), EmptyState ada (:461-463) |

## Matriks 13 teori × 7 surface (✅ baik · 🟡 ada catatan · ❌ pelanggaran · — n/a)
| Teori | `/` home | `/rooms` | `/rooms/:id` | Login | Portal tenant | Admin dashboard | Staff |
|---|---|---|---|---|---|---|---|
| N1 Visibility of status | 🟡 spinner kecil di angka stat | 🟡 spinner teks | 🟡 tanpa skeleton | ✅ | ✅ waiting-room booking | ✅ health grade | ✅ queue |
| N2 Match real world | 🟡 UD-01 lokasi! | ✅ copy jujur "Sudah ada peminat..." | ✅ "Cara booking aman" 6 langkah | ✅ tab Penghuni vs Admin | ✅ istilah DP vs jaminan benar | ✅ | ✅ |
| N3 User control | ✅ | ✅ filter | ✅ pilih term | ✅ lupa password | ✅ batal booking pending | ✅ | 🟡 satu-kerja-aktif membatasi (disengaja) |
| N4 Consistency | ✅ design system seragam (5 screenshot konsisten kartu/chip/badge) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| N5 Error prevention | ✅ warning "jangan transfer sebelum tagihan resmi" | ✅ | ✅ kotak peringatan gelap | ✅ helper text | ✅ nominal-pasti A18 di submit modal | ✅ guidance steps di review pembayaran (screenshot) | ✅ |
| N6 Recognition>recall | ✅ | ✅ chip meta | ✅ tarif 6 term tertabel | ✅ | ✅ | 🟡 3 sumber laporan keuangan tanpa label formal/estimasi (F-12) | ✅ |
| N7 Flexibility | ✅ | ✅ | ✅ 6 pricing pills | ✅ email/HP | ✅ | ✅ global search | ✅ |
| N8 Aesthetic & minimal | 🟡 home SANGAT panjang (status+harga+donut+fasilitas+info+FAQ ±20 item+footer) | 🟡 48 kartu sekaligus | 🟡 panjang tapi terstruktur | ✅ bersih | ✅ | 🟡 owner mobile = 15+ kartu vertikal | ✅ |
| N9 Error recovery | 🟡 | ✅ EmptyState + isError | ✅ isError Alert (:262) — W-B04 sebagian done | ✅ | ✅ 401 auto-logout | ✅ | ✅ |
| N10 Help | ✅ FAQ + WA | ✅ | ✅ langkah aman | ✅ | ✅ TenantGuidePanel | 🟡 | ✅ panduan kerja |
| Fitts (CTA) | ✅ tombol besar | ✅ | ✅ | ✅ Masuk full-width | ✅ | ✅ Setujui/Tolak besar bawah (screenshot) | ✅ |
| Hick (pilihan) | 🟡 FAQ ~20 + 3 CTA | ❌ 48 kartu tanpa pagination | 🟡 6 term (default Bulanan disorot = baik) | ✅ 2 tab | ✅ | 🟡 admin dashboard 84KB file, banyak panel | ✅ fokus 1 kerja |
| WCAG | ❌ belum diaudit; aria-label cuma 36 di SELURUH app (grep), mayoritas di komponen bersama; halaman publik minim | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |

## Evaluasi 5 screenshot (spesifik)
1. **`public/home-mobile.png`** — Struktur naratif baik (status → harga → fasilitas → FAQ → kontak). Temuan: (a) donut ketersediaan kamar di atas-fold = recharts eager (V-1); (b) halaman sangat panjang utk mobile, FAQ ±20 item tanpa pengelompokan (Hick); (c) angka "7 menit" (respon admin?) tanpa konteks sumber — klaim tanpa bukti = social proof lemah.
2. **`public/rooms_14_detail-mobile.png`** — Terbaik di sisi error-prevention: tabel tarif 6 term, "Cara booking aman" 6 langkah bernomor, kotak peringatan kontras gelap, ringkasan biaya. Temuan: font kecil di tabel tarif & kotak peringatan (WCAG body <14px?); CTA booking tidak sticky — user di akhir halaman panjang harus scroll balik (Fitts mobile).
3. **`public/login-mobile.png`** — Pola dual-tab Penghuni/Admin + "Lihat Katalog Kamar →" utk pengunjung nyasar = funnel re-entry pintar (N2/N7 ✅). Temuan: UD-01 (copy lokasi Surabaya Barat/Pakuwon); konten marketing panjang DI BAWAH form login — tidak mengganggu, malah memanfaatkan halaman paling sering dibuka.
4. **`owner/owner-dashboard-mobile.png`** — Health grade + headline natural-language ✅. Temuan: (a) **UD-04**: chart "Tren pendapatan & biaya" merender sumbu Rp 0–4 dgn 4 garis datar saat data nol — empty-state chart (QW-7) TIDAK terpicu utk kasus all-zero (hanya utk no-data); (b) "Kas bersih Rp 0 (−100% dari bulan lalu)" — perubahan % pada basis nol membingungkan (tampilkan "—"); (c) 15+ kartu vertikal = scroll panjang; pertimbangkan tab Ringkasan/Detail (sudah ada "Ringkasan/Masa..." tab atas — perkuat).
5. **`admin/payment-submissions_review-mobile.png`** — Guidance "Cek bukti → Pahami konteks → Ambil keputusan" + chip "Nominal tidak sama dengan total tagihan" = error-prevention kelas bank ✅. Temuan: **V-2 terkonfirmasi visual** — donut "Level Risiko" merah PENUH utk volume kecil (1 item) terbaca seolah krisis; ganti count + ikon utk n<5.

## Temuan UI/UX baru (ringkas)
| # | Sev | Temuan | Evidence |
|---|---|---|---|
| UD-01 | 🔴 | Lokasi kontradiktif frontend vs docs | login copy + index.html:7 vs GROUND_STATE §1 |
| UD-02 | ✅ koreksi | W-01 SUDAH terpasang; sisa PublicGuestDashboard eager+recharts | App.tsx:13,19-51 |
| UD-03 | 🟡 | W-02 skeleton & W-03 pagination tetap pending; error-state detail sudah ada | PublicRoomsPage:440, PublicRoomDetailPage:262 |
| UD-04 | 🟡 | Chart owner: empty-state tak terpicu utk data all-zero; "−100%" basis nol | screenshot owner |
| UD-05 | 🟡 | CTA booking tidak sticky di detail kamar mobile yang panjang | screenshot detail |
| UD-06 | 🟡 | aria-label 36 total; alt text foto kamar belum diaudit; keyboard nav form booking/payment belum dicek — WCAG audit tetap hutang | grep |
| UD-07 | INFO | Klaim "7 menit" di home tanpa sumber | screenshot home |

## RECOMMENDATIONS (ordered)
1. UD-01: konfirmasi alamat ke owner HARI INI → koreksi GROUND_STATE atau seluruh copy publik + meta (gabung paket SEO M-05).
2. Keluarkan recharts dari first-load publik: lazy-load `PublicGuestDashboardPage` ATAU ganti donut home dgn CSS ring (sisa V-1).
3. W-02 skeleton + W-03 pagination 12 kartu (spesifikasi lama tetap berlaku).
4. UD-04: empty-state chart utk all-zero + "—" utk perubahan % basis nol.
5. UD-05: sticky CTA booking di detail kamar mobile.
6. Audit WCAG 1 sesi: axe-core di 5 halaman (login, katalog, detail, submit payment, review payment); fokus kontras + alt + keyboard.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- UD-01 alamat? → **Jl. Hikmah V, Surabaya Barat (frontend benar, docs salah)** (D-01) → koreksi DOCS (F1-0); frontend tidak diubah.
- U-08 portal bookings vs stay? → **pertahankan terpisah** (D-11) → tutup; jangan gabungkan.

---

## LAMPIRAN A — Audit per-surface (detail)

### Surface 1 — `/` home publik (`PublicGuestDashboardPage.tsx`, 25.4KB, EAGER)
- **Fungsi:** landing + status ketersediaan real-time + FAQ + kontak.
- **Kekuatan:** struktur naratif lengkap (status → harga → fasilitas → kepercayaan → FAQ → kontak); angka ketersediaan live dari API publik; loading per-angka (Spinner inline :281-291) tidak memblokir halaman.
- **Temuan:** import recharts eager (:5) = V-1; halaman terpanjang di app utk first-visit mobile; klaim "7 menit" tanpa sumber (UD-07); FAQ ±20 item flat tanpa grouping/search.
- **Aksi:** F2-11 (lazy/CSS ring) + pertimbangkan grouping FAQ 3 kategori.

### Surface 2 — `/rooms` katalog (`PublicRoomsPage.tsx`, 21.2KB, EAGER)
- **Fungsi:** katalog 48 kamar + filter + dual-mode (publik vs tenant login: `useTenantPortalStage` :309).
- **Kekuatan:** EmptyState saat hasil kosong (:461-463); copy meta jujur; dual-mode tanpa duplikasi halaman.
- **Temuan:** tanpa pagination (Hick ❌, W-03); loading = teks+spinner (:440-441) bukan skeleton; isError ditangani.
- **Aksi:** F2-11 pagination 12 + skeleton kartu.

### Surface 3 — `/rooms/:id` detail (`PublicRoomDetailPage.tsx`, 20.6KB, EAGER)
- **Fungsi:** galeri + spesifikasi + tarif 6 term + panduan booking aman + CTA.
- **Kekuatan:** error state (:262) + EmptyState (:263) SUDAH terpasang (W-B04 sebagian done — koreksi V1); tabel tarif lengkap; "Cara booking aman" 6 langkah bernomor = error prevention terbaik di halaman publik.
- **Temuan:** skeleton belum (spinner); CTA tidak sticky di mobile panjang (UD-05); font kecil tabel tarif (cek WCAG).
- **Aksi:** F2-11 skeleton + sticky CTA.

### Surface 4 — Login (`LoginPage.tsx`, 8.4KB)
- **Fungsi:** auth dual-audience + marketing below-the-fold.
- **Kekuatan:** tab Penghuni vs Admin/Operasional (recognition); helper text konteks; "Lihat Katalog Kamar →" = funnel re-entry; email ATAU no. HP.
- **Temuan:** UD-01 copy lokasi (KRITIS, data-truth); selain itu bersih.
- **Aksi:** F1-0.

### Surface 5 — Portal tenant (`pages/portal/*`, 8 halaman)
- **Fungsi:** stay, tagihan, tiket, pengumuman, wifi, booking.
- **Kekuatan:** TenantBookingWaitingRoom memandu fase bayar; SubmitPaymentModal menegakkan nominal-pasti A18 di sisi UI; deposit timeline + safety-belt checkout (V1: pola terbaik app); 401 auto-logout.
- **Temuan:** tidak ada temuan baru level P1/P2 pada pass ini; IA bookings vs stay (U-08) tetap menunggu owner.
- **Aksi:** —.

### Surface 6 — Admin (dashboard 84KB + review pembayaran + stays + invoices)
- **Fungsi:** pusat operasional.
- **Kekuatan:** guidance steps review pembayaran + chip mismatch nominal (screenshot) = pencegahan salah-approve; global search; health grade natural language.
- **Temuan:** `DashboardAdmin.tsx` 84KB satu file (maintainability, INFO); 3 sumber laporan keuangan tanpa label (F-12 → F3-9); sinyal tiket mati (F-21 → F2-12).
- **Aksi:** F3-9, F2-12; refactor file besar saat ada sesi senggang (bukan prioritas).

### Surface 7 — Staff (queue + routines + laporan bulanan)
- **Fungsi:** kerja harian staf.
- **Kekuatan:** guard satu-kerja-aktif (fokus); checklist rutinitas dgn bukti foto; print view laporan.
- **Temuan:** skor kotak hitam (K-2); tanpa notif assign (08); leaderboard belum ada.
- **Aksi:** F3-1, F3-5.

## LAMPIRAN B — Checklist WCAG ringan untuk sesi audit berikutnya (UD-06)
1. Kontras: teks sekunder abu pada putih di home/katalog (target AA 4.5:1); kotak peringatan gelap di detail kamar (sudah baik); chip status warna-only?
2. Alt text: foto kamar galeri (SafeImage punya fallback, alt belum diaudit); ikon-only button (NotificationBell ✅ ada aria-label).
3. Keyboard: form booking publik (urutan tab, fokus modal SubmitPayment); ReviewPaymentModal (trap fokus?).
4. Target sentuh: pills 6 term di detail kamar mobile ≥44px?
5. Screen reader: tabel tarif punya header semantik?; angka stat home dibacakan dgn konteks?
6. Alat: axe-core di 5 halaman (login, katalog, detail, submit payment, review payment) — 1 sesi, output = daftar pelanggaran per halaman.

## LAMPIRAN C — Verifikasi quick-wins V1 (QW-1..8) pada pass ini
- QW-3 (copy DP 30%) ✅ terlihat di detail/booking; QW-5 (badge Menunggu Pembayaran) ✅; QW-7 (empty-state chart owner) 🟡 — tidak menangkap kasus all-zero (UD-04); QW-8 (recognition admin) ✅; lainnya tidak teramati negatif pada 5 screenshot yang dievaluasi.

## LAMPIRAN D — Catatan per-heuristik (justifikasi sel matriks utama)

### Nielsen #1 — Visibility of system status
- Pola dominan: Spinner inline per-angka/per-blok (home :281-291, katalog :440) — status terlihat tapi "kedip" tanpa kerangka.
- Standar yang dituju: SkeletonLoader (komponen SUDAH ada di `components/common/SkeletonLoader.tsx`, tinggal dipakai) — F2-11.
- Pembanding terbaik internal: TenantBookingWaitingRoom menampilkan fase pembayaran eksplisit — tiru pola "kamu ada di langkah X".

### Nielsen #2 — Match with real world
- Bahasa Indonesia operasional konsisten; istilah "DP" vs "deposit jaminan" dipisah benar pasca-A18 di seluruh copy yang diperiksa.
- SATU pengecualian fatal: UD-01 alamat — pelanggaran "match with real world" paling harfiah.

### Nielsen #3/#7 — Control & flexibility
- Tenant: batal booking pending, pilih term, email/HP login. Admin: filter+search di semua list. Staf: dibatasi satu-kerja (pembatasan disengaja demi fokus — bukan pelanggaran).

### Nielsen #4 — Consistency
- 5 screenshot lintas role memakai kartu/chip/badge/tab identik; CurrencyDisplay & StatusBadge terpusat di components/common — konsistensi by-architecture, bukan kebetulan.

### Nielsen #5 — Error prevention (kekuatan terbesar aplikasi)
- Lapisan UI: nominal-pasti di SubmitPaymentModal; warning anti-transfer-dini; chip mismatch nominal di review; `paymentReviewSafety.ts` + `invoiceActionSafety.ts` + `renewApprovalSafety.ts` = util frontend khusus pencegahan (9.8KB+5.3KB+5.8KB — investasi nyata).
- Lapisan API menggandakan semua guard (defense in depth terverifikasi di 01/02).

### Nielsen #6 — Recognition over recall
- Sisa utama: 3 sumber angka keuangan tanpa label formal/estimasi (F-12) — admin harus MENGINGAT mana yang ledger; F3-9 menutupnya dgn badge.

### Nielsen #8 — Aesthetic & minimalist
- 3 halaman "maraton scroll": home publik, owner dashboard mobile (15+ kartu), detail kamar. Tidak ada yang rusak — tapi prioritas informasi belum memangkas (FAQ 20 item flat; 4 seri chart utk 3 informasi).

### Nielsen #9/#10 — Recovery & help
- 401 auto-logout; isError+EmptyState di katalog/detail; FAQ+WA+panduan booking 6 langkah; TenantGuidePanel. Sisa: retry button belum seragam (sebagian halaman hanya Alert tanpa tombol coba-lagi).

### Fitts / Hick / Gestalt
- Fitts: CTA utama full-width mobile ✅; UD-05 sticky CTA = perbaikan tersisa.
- Hick: 2 pelanggaran terukur (48 kartu; FAQ 20) + 1 mitigasi baik (default Bulanan disorot dari 6 term).
- Gestalt: proximity (kartu per topik) & similarity (chip status sewarna-semakna) konsisten via design system.

### WCAG
- Status: BELUM PERNAH diaudit formal; bukti minim aria (36 label, terkonsentrasi di komponen bersama); checklist siap di Lampiran B; estimasi 1 sesi axe-core + 1 sesi perbaikan.

## LAMPIRAN E — Metrik mobile yang layak dipantau pasca F2-11 (baseline utk regresi performa)
| Metrik | Cara ukur | Halaman | Target |
|---|---|---|---|
| First-load JS publik | `npm run build` → ukuran chunk entry + eager imports | `/` `/rooms` `/rooms/:id` `/login` | tanpa recharts; entry < 250KB gz |
| LCP detail kamar | Lighthouse mobile throttled | `/rooms/:id` | < 2.5s (akar U-01) |
| CLS katalog | Lighthouse | `/rooms` | < 0.1 (skeleton membantu) |
| Jumlah request first-load | DevTools | `/` | turun pasca lazy dashboard |
- Baseline diambil SEBELUM F2-11 dieksekusi agar perbaikan terukur, bukan dirasa.

## LAMPIRAN F — Prinsip copywriting yang sudah terbukti di app ini (pertahankan saat menulis copy baru)
1. Jujur tentang status ("Sudah ada peminat, tetapi belum terkunci...") — kejujuran = konversi jangka panjang.
2. Sebut konsekuensi + tenggat eksplisit ("...hingga H+1 pk 12:00 WIB") — loss aversion yang fair.
3. Sebut langkah berikutnya di setiap notifikasi (linkTo + kalimat aksi).
4. Jangan pernah menyangkal fakta uang (pelajaran N-01) — bila ragu, tulis netral + arahkan ke admin.
5. Bahasa Indonesia operasional, bukan jargon sistem (istilah enum tidak pernah bocor ke copy — verified).

## LAMPIRAN G — Ringkasan verdict per surface (1 baris keputusan)
| Surface | Verdict | Aksi tunggal paling berdampak |
|---|---|---|
| `/` home | 🟡 sehat tapi berat & 1 klaim tanpa bukti | F2-11 (recharts keluar) |
| `/rooms` | 🟡 fungsional, Hick | F2-11 (pagination) |
| `/rooms/:id` | ✅ terbaik publik | UD-05 (sticky CTA) |
| Login | ✅ bersih, 1 data-truth | F1-0 (alamat) |
| Portal tenant | ✅ matang | — (tunggu U-08 owner) |
| Admin | ✅ kuat, padat | F3-9 (label sumber laporan) |
| Staff | ✅ fokus | F3-5 (transparansi skor) |

## Definisi selesai UI/UX "hijau penuh"
1. Alamat satu kebenaran (F1-0) di seluruh permukaan.
2. First-load publik tanpa recharts; LCP detail kamar < 2.5s; katalog ber-pagination + skeleton.
3. Audit WCAG axe-core 5 halaman dijalankan + pelanggaran AA kontras/alt/keyboard ditutup.
4. Label "Formal vs Estimasi" pada semua angka keuangan (recognition).
5. Chart all-zero menampilkan empty-state, bukan sumbu palsu.
6. Setiap chart inline punya aria-label + empty-state (standar SmartChartPanel).
