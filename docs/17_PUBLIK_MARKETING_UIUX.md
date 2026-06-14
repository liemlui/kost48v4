# DOSSIER 17 — PUBLIK, MARKETING & UI/UX
**Domain:** katalog publik, SEO, funnel akuisisi, social proof, UI/UX seluruh app, visualisasi/chart. **Flow 2-publik + frontend.**
**Status:** Funnel & UX 🟢 baik. SEO dasar dan social proof selesai diimplementasikan 2026-06-14; validasi Lighthouse SEO masih tertunda dan database lokal belum memiliki ulasan visible.
**File inti:** `marketing-public-rooms.service.ts` (304), `frontend/index.html`, `PublicRoomsPage.tsx`, `PublicRoomDetailPage.tsx`, `PublicGuestDashboardPage.tsx`, `App.tsx`, 13 file pakai Recharts.
**🆕 Backlog (D-19 / F4-12, 2026-06-14):** menu **"Panduan/Aturan" (manual book) di tenant app** — FAQ detail di-generate dari semua aturan/flow (`03_KEPUTUSAN_OWNER` + dossier), disajikan ringkas & berkategori (openness, jangan bikin tenant pusing). Input: interview owner / analisa WhatsApp. Fondasi `FaqsModule` ada. Detail di `03_KEPUTUSAN_OWNER §D-19`.

---
## 1. Aturan bisnis / konteks
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** (D-01 — frontend benar, docs sudah dikoreksi). SEO/copy pakai ini.
- **Retensi > akuisisi** untuk kos: prioritas renewal (dossier 11) + gamifikasi (dossier 19) di atas SEO. Tapi SEO tetap menutup kebocoran funnel atas.
- **Harga formula konsisten** (dossier 11 §1). CTA jujur first-paid-wins ("belum terkunci sebelum pembayaran valid").
- **Lead source** (M-08): enum `LeadSource` 10 kanal ada tapi booking publik hardcode WEBSITE → kanal akuisisi tak terukur (CAC).
- **V-1 code-split SUDAH terpasang** untuk 4 halaman publik termasuk PublicGuestDashboard; sisa F2-11: CSS ring, skeleton detail, pagination 12, sticky CTA, dan grid tablet.

## 2. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| UD-01/M-05 | ✅ TERSELESAI | Alamat kontradiktif frontend vs docs — owner konfirmasi Surabaya Barat; docs dikoreksi. | index.html vs docs | SELESAI (D-01) |
| UD-02 | ✅ RESOLVED | Data-truth kontradiksi lokasi — frontend "Surabaya Barat" vs docs "Ngagel Jaya Utara" — owner konfirmasi Surabaya Barat. Cross-ref UD-01. | index.html vs docs | RESOLVED (D-01) |
| UD-06 | 🟠 P2 | Room card mobile layout overflow di tablet (768-1024px) — card kamar meluber keluar container saat 2+ kolom grid. | `PublicRoomsPage.tsx` responsive grid | **F2-11**: fix grid breakpoint tablet |
| UD-07 | 🟡 P3 | Public room filter "Semua" mencakup MAINTENANCE rooms — canBook=false benar tapi UX membingungkan karena filter bernama "Semua" padahal sebagian non-bookable. | `PublicRoomsPage.tsx` filter | **F3-12**: rename filter ke "Semua Kamar" + badge "Termasuk yang sedang dicek" |
| V-3 | 🟡 P3 | Chart Recharts tidak punya fallback empty state — saat data kosong, chart area blank tanpa pesan "Belum ada data". | seluruh komponen Recharts (13 file) | **F3-12**: empty-state component + "Belum ada data" |
| V-6 | 🟡 P3 | DonutGauge color contrast rendah di mobile dark mode — teks persentase tidak terbaca di layar kecil. | `DonutGauge.tsx` | **F3-12**: perbaiki contrast ratio ≥4.5:1 |
| M-01 | 🟡 VALIDASI | OG/Twitter Card, JSON-LD, canonical, robots, dan sitemap sudah tersedia; SPA tetap bergantung pada kemampuan crawler merender JS. | `frontend/index.html` + `public/` | **F3-3 implementasi selesai**; ukur Lighthouse SEO ≥90 |
| M-06 | ✅ TERSELESAI | Social proof publik sudah tersedia dengan agregat rating, ulasan visible rating≥4 anonim, dan count penghuni aktif. Dataset lokal saat UAT belum memiliki ulasan visible. | pages/public | **F3-4 selesai 2026-06-14** |
| V-1 | 🟡 PARSIAL | PublicGuestDashboard dan 3 halaman publik lain sudah lazy/code-split; Recharts masih ada di chunk halaman dan CSS ring belum dikerjakan. | `App.tsx`, `PublicGuestDashboardPage.tsx` | **F2-11** lanjut CSS ring |
| UD-03 | 🟡 P3 | W-02 skeleton & W-03 pagination katalog belum (error-state detail sudah ada). | `PublicRoomsPage/PublicRoomDetailPage` | **F2-11** skeleton+pagination 12 |
| UD-04 | 🟡 P3 | Chart owner all-zero render sumbu palsu + "−100%" basis nol. | `OwnerDashboardPage` | **F3-12** empty-state all-zero + "—" |
| V-2 | 🟡 P3 | Donut "Level Risiko" merah penuh utk n=1 → terbaca krisis. | `PaymentReviewPage` | **F3-12** count utk n<5 |
| UD-05 | 🟡 P3 | CTA detail kamar tak sticky (mobile); klaim "7 menit" tanpa sumber. | publik | **F2-11**/F3-12 |
| M-02/M-04/M-09/V-5/V-7 | 🟡/INFO | pricing mentah bisa 0 vs term; 76 foto hardcode di service; filter term tak menyaring; palet belum colorblind-safe; seri Laba redundan. | berbagai | **F3-11**/F3-12 |

## 3. Task
- **F3-3 · FASE 3 (IMPLEMENTASI SELESAI 2026-06-14):** `index.html` memuat OG/description/Twitter Card/canonical dan JSON-LD `LodgingBusiness`; `robots.txt` serta `sitemap.xml` tersedia. Build dan verifikasi statis lulus. Target Lighthouse SEO ≥90 belum diukur karena konektor browser lokal gagal berjalan.
- **F3-4 · FASE 3 (SELESAI 2026-06-14):** endpoint publik read-only hanya mengekspos StaffReview VISIBLE rating≥4 dengan inisial tenant, agregat rating, ulasan terbaru, dan count penghuni aktif terpromosi. UAT real DB: 11 penghuni, 0 ulasan visible.
- **F3-7 · FASE 3 (SELESAI 2026-06-14):** endpoint owner `/api/reports/occupancy-daily?from&to` dan heatmap CSS-grid 12 bulan historis + 3 bulan proyeksi. Rentang maksimal 550 hari; checkout aktual eksklusif dan planned checkout dipakai untuk proyeksi.
- **F2-11 · FASE 2 (SELESAI 2026-06-14):** V-1 (lazy/code-split) + W-02 skeleton + W-03 pagination 12 + UD-05 sticky CTA + UD-06 fix tablet grid. Build LULUS (94 chunk, PWA verify ok).
- **F3-11 · FASE 3 (SELESAI 2026-06-14):** **M-08** lead source SUDAH lengkap di kode — check-in wizard admin punya dropdown `bookingSource` 10 kanal, backend `stays` simpan `bookingSource/Detail` + filter query (CAC terukur); booking publik tetap `WEBSITE` (benar). **M-04** ~76 foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (perilaku resolve identik). tsc 0.
- **F3-12 · FASE 3 (PARSIAL 2026-06-14):** ✅ **V-5** palet Okabe-Ito colorblind-safe (`components/charts/chartPalette.ts` dipakai SmartChartPanel + HorizontalBarChart + DonutGauge + PaymentReview); ✅ **V-2** count untuk n<5 di donut "Level Risiko" PaymentReview (hindari lingkaran 100% merah palsu); ✅ **V-6** kontras teks tengah DonutGauge (CSS `--text-main/--text-muted`); ✅ **UD-07** rename filter "Semua" → "Semua Kamar" + hint "termasuk terisi & sedang dicek"; ✅ **V-3** empty-state donut sudah ada di SmartChartPanel. **Tertunda:** **UD-04** (OwnerDashboard all-zero — butuh telaah chart owner lebih dalam), **V-7** (kurangi seri Laba redundan), + 7 rekomendasi visual baru. `frontend npm run build` LULUS (95 chunk, PWA ok). _Catatan: update CHANGELOG/CHECKLIST F3-12 tertunda — file dipegang agen renewal yang aktif._
- **Audit WCAG 1 sesi:** axe-core 5 halaman (login, katalog, detail, submit payment, review payment).

## 4. Rekomendasi visualisasi (Recharts, tanpa lib baru)
Prioritas: **#1 Occupancy Heatmap kalender SELESAI 2026-06-14** (CSS grid, rentang historis+berjalan+depan per D-15). #2 Cashflow Area, #3 Revenue Waterfall, #4 KPI Bullet, #5 Booking Funnel, #6 Sparkline rasio — **SETELAH** fix laporan F1 (jangan visualkan angka salah). #7 Treemap profitabilitas → tunda (butuh unit economics). Sankey DITOLAK (funnel linier cukup bar).

## 5. Definisi "hijau penuh" + pengukuran
- 1 alamat konsisten (✅), Lighthouse SEO ≥90, JSON-LD valid, terindeks Google; social proof tampil; ≥80% booking punya bookingSource ≠ default; performa publik tanpa recharts first-load; LCP detail <2.5s.
- **Kanal akuisisi (CAC):** groupBy bookingSource/bulan pasca F3-11. **Retensi (CLV):** renewal + gamifikasi (dossier 11/19).
