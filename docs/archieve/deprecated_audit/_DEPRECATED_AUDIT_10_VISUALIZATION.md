# VISUALISASI DEEP (V3) — Recharts di 13 file (10 halaman + 3 komponen chart); 1 temuan visual terkonfirmasi screenshot + 1 baru; 7 rekomendasi chart dgn spesifikasi implementasi
**Basis:** grep `from 'recharts'` 2026-06-13 (13 file) + evaluasi visual owner-dashboard & payment-review screenshot + status fix laporan (F-01..F-21).

## Inventori chart aktual (per file)
| File | Chart | Data | Status |
|---|---|---|---|
| `components/charts/DonutGauge.tsx` | Pie donut | gauge generik | dipakai lintas halaman |
| `components/charts/HorizontalBarChart.tsx` | BarChart horizontal | generik | ✅ aria-label ada |
| `components/charts/SmartChartPanel.tsx` | Pie/Bar adaptif | generik | ✅ aria-label ada |
| `pages/public/PublicGuestDashboardPage.tsx` | PieChart ketersediaan | rooms publik | 🔴 V-1: EAGER di first-load publik (App.tsx:13) |
| `pages/dashboard/OwnerDashboardPage.tsx` | LineChart tren 4 seri | ownerDashboard trendMonths | 🟡 UD-04 all-zero render sumbu Rp 0–4 |
| `pages/payments/PaymentReviewPage.tsx` | Donut risiko + kelengkapan | queue stats | 🟡 V-2 terkonfirmasi visual: merah penuh utk 1 item |
| `pages/portal/MyInvoicesPage.tsx` | Bar | tagihan tenant | ✅ |
| `pages/invoices/InvoicesPage.tsx` | Bar | agregat invoice | ✅ |
| `pages/admin/AdminStaffPerformancePage.tsx` | Pie/Bar | KPI staf | 🟡 menunggu K-6 fix agar angka benar |
| `pages/staff/StaffMonthlyReportPage.tsx` | Bar | KPI diri | idem |
| `pages/renew-requests/RenewRequestsAdminPage.tsx` | Pie | status renew | ✅ |
| `pages/reports/ReportsPage.tsx` | Bar | laporan ops | 🟡 sumber kena F-09 (DRAFT ikut revenue) |
| `pages/stays/StaysPage.tsx` | Pie/Bar | status stay | ✅ |
| Tidak ada: Area/Composed/Radar/Treemap/Sankey/Waterfall/Bullet/Sparkline/CalendarHeatmap | — | — | — |

## Temuan
| # | Sev | Issue | Theory |
|---|---|---|---|
| V-1 | 🟠 tetap | Recharts di first-load publik via PublicGuestDashboardPage eager (W-01 route lain sudah lazy — tinggal 1 halaman ini) | Performa = konversi |
| V-2 | 🟡 terkonfirmasi visual | Donut "Level Risiko" merah penuh utk n=1 (screenshot payment-review) — proporsi menyesatkan volume kecil | Tufte data-ink; proporsi ≠ severity |
| UD-04 | 🟡 BARU | LineChart owner render axis Rp 0–4 + 4 garis datar saat semua nilai 0; empty-state hanya menangkap no-data, bukan all-zero; "−100% dari bulan lalu" pada basis 0 | Honest scales |
| V-3 | 🟡 tetap | Tidak ada visual okupansi per-tanggal — owner buta pola musiman | Recognition over recall |
| V-5 | INFO | Palet belum dicek color-blind-safe (merah/hijau dominan di risiko & status) | Colorbrewer |
| V-7 | INFO BARU | 4 seri di LineChart tren owner (Pendapatan/Pengeluaran/Laba/Tren) — Laba = derivasi 2 seri lain; 3 seri cukup, kurangi tinta | Tufte data-ink |

## ⚠️ Aturan emas (tetap berlaku, diperkuat): JANGAN bangun chart finansial baru di atas angka yang masih salah
Urutan wajib: F1-3..F1-7 + F-17/F-18/F-19/F-20 (lihat `AUDIT_04_FINANCE.md`) DULU → baru visualisasi finansial. Chart okupansi/operasional boleh duluan (datanya sehat).

## 7 rekomendasi chart baru — spesifikasi implementasi penuh
| # | Visual | File target | Data source (endpoint sudah ada?) | Komponen | Dependency | Prasyarat |
|---|---|---|---|---|---|---|
| 1 | **Occupancy Calendar Heatmap** (grid 7×N) | komponen baru `components/charts/OccupancyHeatmap.tsx` → DashboardAdmin | Stay promoted overlap per tanggal — endpoint agregat BARU read-only (`/api/reports/occupancy-daily?year&month`) | div/CSS grid murni (BUKAN lib; Recharts tak punya heatmap) | tidak ada | tidak ada — bisa segera |
| 2 | **Cashflow AreaChart saldo harian** | `pages/reports/CashflowPage.tsx` | `accounting/cashflow` per CashAccount (E-4) | `<AreaChart>` Recharts | tidak ada | 🔴 F-01/F-05/F-19/F-20 fix dulu |
| 3 | **Revenue Waterfall bulanan** | `pages/reports/ProfitLossPage.tsx` | P&L ledger lines (revenue per akun − beban per akun → net) | `<BarChart>` trik stacked-transparan (Recharts tanpa Waterfall native) | tidak ada | F-09 + periode close rapi |
| 4 | **KPI Bullet Graph staf** | `pages/admin/AdminStaffPerformancePage.tsx` | staff-performance summary (netKpi vs target) | `<BarChart layout="vertical">` + `<ReferenceLine>` target | tidak ada | K-6 fix + keputusan target owner |
| 5 | **Booking Funnel** | DashboardAdmin | count Stay (booking dibuat→DP→pelunasan→promoted) + submission — derivable dari data ada, endpoint agregat baru | `<BarChart>` bertahap horizontal (Sankey OVERKILL utk 1 jalur linier — tolak Sankey) | tidak ada | tidak ada |
| 6 | **Sparkline rasio 6 bulan** | `pages/reports/FinancialRatiosPage.tsx` | financial-ratios per bulan (loop 6 panggilan / endpoint batch baru) | `<LineChart>` mini tanpa axis | tidak ada | 🔴 F-02/F-03/F-04/F-18 fix dulu |
| 7 | **Room Profitability Treemap** | ReportsPage tab baru | BELUM BISA — butuh unit economics per kamar (beban per tier belum dipisah) | `<Treemap>` (Recharts PUNYA Treemap native) | tidak ada | data produksi ≥1 bulan + pemisahan beban (F4-4) |

## Perbaikan chart existing (murah, 1 sesi gabungan)
1. V-1: lazy-load PublicGuestDashboardPage atau ganti donut home → CSS conic-gradient ring (hilangkan recharts dari bundle publik).
2. V-2: bila item <5 → tampilkan badge count berwarna, bukan donut.
3. UD-04: guard `every(v => v === 0)` → tampilkan EmptyState "Belum ada data keuangan bulan ini"; perubahan % basis 0 → "—".
4. V-7: hapus seri "Laba Bersih" dari line chart (sudah ada kartu angka) ATAU jadikan toggle.
5. V-5: adopsi palet Okabe-Ito / ColorBrewer Set2 utk seri kategorikal (drop-in, konstanta warna saja).

## RECOMMENDATIONS (ordered)
1. Heatmap okupansi (#1) — satu-satunya visual baru bernilai tinggi yang TIDAK menunggu fix finansial.
2. Paket perbaikan chart existing (5 butir di atas).
3. Funnel booking (#5) — visibilitas konversi utk owner.
4. #2/#3/#6 SETELAH gelombang fix laporan F1.
5. Treemap (#7) parkir ke F4-4.

## OPEN QUESTIONS → sebagian TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Heatmap historis vs depan? → **KEDUANYA** (D-15) → F3-7 rentang lebar (−1 bln s.d +1 bln).
- Target netKpi per staf utk bullet graph → masih perlu angka owner saat F3-12 dikerjakan (reward sudah dikonfirmasi ada, D-13).

---

## LAMPIRAN A — Spesifikasi teknis heatmap okupansi (rekomendasi #1, siap eksekusi)
- **Endpoint baru:** `GET /api/reports/occupancy-daily?year=YYYY&month=MM` (OWNER/ADMIN).
- **Query:** ambil Stay `status IN (ACTIVE, COMPLETED)` + `initialMetersPromotedAt != null` yang periodenya overlap bulan target; per tanggal d: hitung stay dgn `checkInDate <= d < (actualCheckOutDate ?? plannedCheckOutDate ?? ∞)`.
- **Response:** `{ days: [{ date, occupied, operable, ratePercent }], summary }` — operable per hari boleh pakai snapshot sekarang (aproksimasi jujur, beri note).
- **Render:** CSS grid 7 kolom (Sen–Min), sel = div dgn `background: hsl(210, 70%, ${95 - rate*0.45}%)`, tooltip title bawaan; tanpa lib.
- **Aksesibilitas:** tiap sel `aria-label="12 Jun: 42 dari 46 kamar (91%)"`; legend gradasi 5 step.
- **Definisi selesai:** angka hari-ini == occupancySummary; bulan penuh ter-render <100ms utk 31 hari.

## LAMPIRAN B — Audit aksesibilitas & performa komponen chart existing
| Komponen | aria | Tooltip | Empty-state | Memo | Catatan |
|---|---|---|---|---|---|
| DonutGauge | ✅ 1 aria-label | bawaan | caller-dependent | ❌ | dipakai utk risiko (V-2) |
| HorizontalBarChart | ✅ | ✅ | caller | ❌ | sehat |
| SmartChartPanel | ✅ 2 | ✅ | ✅ | ❌ | terbaik |
| Inline charts (10 halaman) | ❌ mayoritas | ✅ | 🟡 QW-7 sebagian (UD-04) | ❌ | data kecil — memo tidak urgen (V-6 tetap) |
- Kesimpulan: standar baru utk chart inline = bungkus dgn SmartChartPanel/pola serupa (aria + empty-state seragam) — masukkan ke definition-of-done F3-12.

## LAMPIRAN C — Keputusan desain yang diambil (dan alasannya, agar tidak dibuka ulang)
1. **Sankey ditolak** utk funnel booking: jalurnya linier tunggal (lihat→detail→form→bayar→approve), tanpa percabangan bermakna — bar bertahap lebih jujur & murah (Tufte).
2. **CalendarHeatmap tanpa lib**: Recharts tidak punya; lib kalender baru melanggar larangan deps; CSS grid 30 sel trivially cukup.
3. **Waterfall via stacked-bar trick**: Recharts tanpa Waterfall native; trik baseline transparan adalah pola komunitas standar; alternatif (lib baru) ditolak.
4. **Treemap ditunda bukan ditolak**: Recharts PUNYA Treemap; blocker murni data (unit economics per kamar belum ada) — review ulang saat F4-4.
5. **Urutan rilis chart finansial dikunci ke fase fix laporan** — memvisualkan angka yang diketahui salah lebih buruk daripada tidak ada chart (keputusan eksplisit, jangan ditawar di sesi eksekusi).

## LAMPIRAN D — Konstanta palet usulan (V-5, drop-in)
```ts
// Okabe-Ito (color-blind safe) — ganti konstanta warna seri kategorikal
export const CHART_PALETTE = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#999999'];
// Status semantik tetap (jangan ubah makna): sukses #009E73 · peringatan #E69F00 · bahaya #D55E00
```
- Aturan: warna TIDAK boleh jadi satu-satunya pembeda — selalu sertai label/ikon (WCAG 1.4.1).
