# DOSSIER 17 — PUBLIK, MARKETING & UI/UX
**Domain:** katalog publik, SEO, funnel akuisisi, social proof, UI/UX seluruh app, visualisasi/chart. **Flow 2-publik + frontend.**
**Status:** Funnel & UX 🟢 baik (error-prevention kelas atas). SEO ≈ 0 🔴 + social proof kosong = kebocoran akuisisi. Lokasi sudah dikoreksi.
**File inti:** `marketing-public-rooms.service.ts` (304), `frontend/index.html`, `PublicRoomsPage.tsx`, `PublicRoomDetailPage.tsx`, `PublicGuestDashboardPage.tsx`, `App.tsx`, 13 file pakai Recharts.

---
## 1. Aturan bisnis / konteks
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** (D-01 — frontend benar, docs sudah dikoreksi). SEO/copy pakai ini.
- **Retensi > akuisisi** untuk kos: prioritas renewal (dossier 11) + gamifikasi (dossier 19) di atas SEO. Tapi SEO tetap menutup kebocoran funnel atas.
- **Harga formula konsisten** (dossier 11 §1). CTA jujur first-paid-wins ("belum terkunci sebelum pembayaran valid").
- **Lead source** (M-08): enum `LeadSource` 10 kanal ada tapi booking publik hardcode WEBSITE → kanal akuisisi tak terukur (CAC).
- **W-01 code-split SUDAH terpasang** (App.tsx lazy); sisa: PublicGuestDashboard eager + recharts di first-load publik.

## 2. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| UD-01/M-05 | ✅ TERSELESAI | Alamat kontradiktif frontend vs docs — owner konfirmasi Surabaya Barat; docs dikoreksi. | index.html vs docs | SELESAI (D-01) |
| UD-02 | ✅ RESOLVED | Data-truth kontradiksi lokasi — frontend "Surabaya Barat" vs docs "Ngagel Jaya Utara" — owner konfirmasi Surabaya Barat. Cross-ref UD-01. | index.html vs docs | RESOLVED (D-01) |
| UD-06 | 🟠 P2 | Room card mobile layout overflow di tablet (768-1024px) — card kamar meluber keluar container saat 2+ kolom grid. | `PublicRoomsPage.tsx` responsive grid | **F2-11**: fix grid breakpoint tablet |
| UD-07 | 🟡 P3 | Public room filter "Semua" mencakup MAINTENANCE rooms — canBook=false benar tapi UX membingungkan karena filter bernama "Semua" padahal sebagian non-bookable. | `PublicRoomsPage.tsx` filter | **F3-12**: rename filter ke "Semua Kamar" + badge "Termasuk yang sedang dicek" |
| V-3 | 🟡 P3 | Chart Recharts tidak punya fallback empty state — saat data kosong, chart area blank tanpa pesan "Belum ada data". | seluruh komponen Recharts (13 file) | **F3-12**: empty-state component + "Belum ada data" |
| V-6 | 🟡 P3 | DonutGauge color contrast rendah di mobile dark mode — teks persentase tidak terbaca di layar kecil. | `DonutGauge.tsx` | **F3-12**: perbaiki contrast ratio ≥4.5:1 |
| M-01 | 🔴 P1 | SEO hampir nol: tanpa OG/JSON-LD/canonical/robots/sitemap; SPA tanpa SSR → Google lihat div kosong. | `frontend/index.html` + `public/` | **F3-3** OG+JSON-LD LodgingBusiness+robots+sitemap |
| M-06 | 🟠 P2 | Social proof publik = 0 padahal data review tenant ada → kebocoran akuisisi terbesar. | pages/public | **F3-4** agregat rating≥4 anonim + count penghuni (owner setuju D-09) |
| V-1 | 🟠 P2 | Recharts eager di PublicGuestDashboard → ±100KB+ di first-load publik calon tenant. | `PublicGuestDashboardPage.tsx:5` (eager App.tsx:13) | **F2-11** lazy / ganti CSS ring |
| UD-03 | 🟡 P3 | W-02 skeleton & W-03 pagination katalog belum (error-state detail sudah ada). | `PublicRoomsPage/PublicRoomDetailPage` | **F2-11** skeleton+pagination 12 |
| UD-04 | 🟡 P3 | Chart owner all-zero render sumbu palsu + "−100%" basis nol. | `OwnerDashboardPage` | **F3-12** empty-state all-zero + "—" |
| V-2 | 🟡 P3 | Donut "Level Risiko" merah penuh utk n=1 → terbaca krisis. | `PaymentReviewPage` | **F3-12** count utk n<5 |
| UD-05 | 🟡 P3 | CTA detail kamar tak sticky (mobile); klaim "7 menit" tanpa sumber. | publik | **F2-11**/F3-12 |
| M-02/M-04/M-09/V-5/V-7 | 🟡/INFO | pricing mentah bisa 0 vs term; 76 foto hardcode di service; filter term tak menyaring; palet belum colorblind-safe; seri Laba redundan. | berbagai | **F3-11**/F3-12 |

## 3. Task
- **F3-3 · FASE 3 (PRASYARAT D-01 ✅):** SEO dasar — `index.html` OG+description (alamat Surabaya Barat)+canonical; JSON-LD `@type:LodgingBusiness` (alamat, priceRange); `robots.txt`+`sitemap.xml` 3 URL. Target Lighthouse SEO ≥90.
- **F3-4 · FASE 3:** social proof home — endpoint publik read-only agregat StaffReview VISIBLE rating≥4 (inisial, UU PDP) + count penghuni. (D-09)
- **F2-11 · FASE 2:** V-1 (lazy/CSS ring) + W-02 skeleton + W-03 pagination 12 + UD-05 sticky CTA + UD-06 fix tablet grid.
- **F3-11 · FASE 3:** lead source dropdown (kanal akuisisi, enum ada) + pindah 76 foto hardcode ke `Room.images`/config.
- **F3-12 · FASE 3:** paket chart — UD-04 empty-state all-zero, V-2 count n<5, V-3 empty-state, V-5 palet Okabe-Ito, V-6 dark mode contrast, V-7 kurangi seri, UD-07 rename filter, + 7 rekomendasi visual baru (heatmap okupansi #1 = paling bernilai, lihat di bawah).
- **Audit WCAG 1 sesi:** axe-core 5 halaman (login, katalog, detail, submit payment, review payment).

## 4. Rekomendasi visualisasi (Recharts, tanpa lib baru)
Prioritas: **#1 Occupancy Heatmap kalender** (CSS grid, rentang historis+berjalan+depan per D-15) — satu-satunya yang bisa SEGERA (data okupansi sehat). #2 Cashflow Area, #3 Revenue Waterfall, #4 KPI Bullet, #5 Booking Funnel, #6 Sparkline rasio — **SETELAH** fix laporan F1 (jangan visualkan angka salah). #7 Treemap profitabilitas → tunda (butuh unit economics). Sankey DITOLAK (funnel linier cukup bar).

## 5. Definisi "hijau penuh" + pengukuran
- 1 alamat konsisten (✅), Lighthouse SEO ≥90, JSON-LD valid, terindeks Google; social proof tampil; ≥80% booking punya bookingSource ≠ default; performa publik tanpa recharts first-load; LCP detail <2.5s.
- **Kanal akuisisi (CAC):** groupBy bookingSource/bulan pasca F3-11. **Retensi (CLV):** renewal + gamifikasi (dossier 11/19).