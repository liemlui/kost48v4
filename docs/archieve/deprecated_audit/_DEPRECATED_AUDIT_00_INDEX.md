# AUDIT FORENSIK FABLE 5 — DEEP V3 — INDEX
> 🧭 **Baru di sini? Baca [00_BLUEPRINT.md](00_BLUEPRINT.md) dulu** — peta tunggal sistem (model bisnis + 12 flow + status + target owner + prioritas). Lalu turun ke dokumen spesifik.

**Tanggal:** 2026-06-13 · Auditor: Fable 5 · Mode: read-only source · Baseline: `292817b` + working tree (file M milik AI PWA tidak disentuh)
**Lingkup baca:** 36 modul backend ter-mapping; ±9.000 baris service inti dibaca penuh per baris (posting 1.228, reports 1.148, payment-submissions 1.564, auto-ops 1.031, stays 1.174, period-close 650, accounting 620, + 15 file penuh lain); frontend: App.tsx + 4 halaman publik + grep heuristik seluruh src; 5 screenshot dievaluasi visual.

## 🔴 UPDATE 2026-06-13 — 16 KEPUTUSAN OWNER MENJAWAB SEMUA OPEN QUESTIONS (lihat `04_KEPUTUSAN_OWNER.md`)
Temuan terbesar dari wawancara: **sistem BELUM PUBLISH, database = data testing yang boleh dihapus.** Ini mengubah strategi deploy (fresh start, bukan migrasi) dan menggugurkan semua tugas perbaikan data lama. Keputusan kunci lain: alamat benar = **Surabaya Barat (frontend benar, docs salah)**; **no-partial menyeluruh** (termasuk renewal); draft jurnal manual **dimatikan**; refund kalah-cepat **dicatat di sistem**; reward staf **ada (bonus manual)**. Detail D-01..D-16 + dampak per-task di file 12.

## Ringkasan eksekutif
Deep-pass V3 mengkonfirmasi diagnosis V1 (mesin uang sehat, lapisan laporan sakit) lalu menggandakan presisinya: **63 temuan baru** di atas 16 temuan V1, termasuk 3 koreksi atas V1 sendiri. Paling penting: (1) **GAP #1 owner ternyata sudah sebagian tertutup di kode** (gate dua-nominal-sah A18) — rencana eksekusi V1 F1-1 akan MEMATIKAN jalur DP yang sah dan sudah direvisi (F1-1R); (2) **kontradiksi data-truth alamat properti** antara frontend ("Jl. Hikmah V, Surabaya Barat, Pakuwon/PTC") dan docs ("Ngagel Jaya Utara") — wajib keputusan owner sebelum SEO/strategi apa pun; (3) lapisan laporan punya 9 bug baru di luar F-01..F-04 (rasio kas=piutang kedua kali, MoM neraca selalu 0%, klasifikasi investing mati, sinyal tiket selalu 0, aging overstated); (4) satu vektor ghost-stock nyata pertama ditemukan (admin-review tanpa lock/validasi); (5) governance pinggiran berlubang (draft jurnal dead-end yang bisa memblokir tutup buku permanen + menyamar sourceType auto). Rencana 44 task di `05_ACTION_PLAN.md`.

## Temuan paling kritis (P1)
| # | Temuan | File |
|---|---|---|
| UD-01 | Alamat properti kontradiktif frontend vs docs — semua SEO/strategi lokasi salah dasar di salah satu sisi | `index.html:7` vs `01_GROUND_STATE.md §1` |
| B-01 | GAP #1 sebagian tertutup; rencana V1 F1-1 BERBAHAYA bila dieksekusi mentah | `payment-submissions.service.ts:122-135` vs `:406-430` |
| F-18 | Rasio likuiditas memakai PIUTANG sebagai kas (kembaran F-01 yang LOLOS dari rencana fix V1) | `accounting-reports.service.ts:961` |
| F-24 | Settlement deposit tanpa cek receipt journal → akun 2000 bisa debit permanen | `accounting-posting.service.ts:602-687` |
| I-02 | Ghost-stock via adminReview (tanpa lock + tanpa validasi RETURN) | `staff-field-reports.service.ts:478-505` |
| F-22+F-23 | Draft jurnal manual: dead-end (tanpa post/void) + bisa menekan auto-posting invoice selamanya | `accounting.controller.ts:207`, `dto/journal-entry.dto.ts:43` |
| N-01 | Copy A17 menyangkal dana tenant yang sudah transfer (risiko UUPK/kepercayaan) | `payment-submissions.service.ts:843` |

## Daftar file output
| File | Isi | Verdict 1 baris |
|---|---|---|
| [AUDIT_01_FLOW_VERIFIED.md](AUDIT_01_FLOW_VERIFIED.md) | 13 flow, baca penuh file inti, B-01..B-15 | 1 koreksi besar V1; auto-ops sangat tangguh |
| [AUDIT_02_RULES_COMPLIANCE.md](AUDIT_02_RULES_COMPLIANCE.md) | 11 aturan owner re-verifikasi | naik 7/11 → 8/11 sebagian; GAP #2 satu-satunya ❌ penuh |
| [AUDIT_03_EXTRA_FEATURES.md](AUDIT_03_EXTRA_FEATURES.md) | 9 fitur + 5 fondasi + drift docs | auth enumeration-safe TERBUKTI; 6 drift docs dicatat |
| [AUDIT_04_FINANCE.md](AUDIT_04_FINANCE.md) | COA 38 akun + 10 posting + BS/P&L/CF/rasio + PSAK | mesin ✅; +16 temuan baru F-17..F-34 |
| [AUDIT_05_INVENTORY.md](AUDIT_05_INVENTORY.md) | 3 jalur sinkron qty per baris | jalur resmi sehat; I-02 ghost-stock di jalur review |
| [AUDIT_06_MARKETING.md](AUDIT_06_MARKETING.md) | AIDA/SEO/funnel/social proof/lead source | SEO=0 + alamat salah; funnel jujur kelas atas |
| [AUDIT_07_UIUX.md](AUDIT_07_UIUX.md) | 13 teori × 7 surface + 5 screenshot | W-01 ternyata DONE; UD-01 data-truth; WCAG tetap hutang |
| [AUDIT_08_NOTIF.md](AUDIT_08_NOTIF.md) | 22 event + 9 job + kalender | 14/22; renew NOL; auto-ops 9 job lulus semua check |
| [AUDIT_09_KPI.md](AUDIT_09_KPI.md) | formula per baris + 10 teori psikologi | K-6 double-count baru; leaderboard butuh K-4/K-6 dulu |
| [AUDIT_10_VISUALIZATION.md](AUDIT_10_VISUALIZATION.md) | 13 file chart + 7 rekomendasi berspesifikasi | jangan chart finansial sebelum fix F1 |
| [05_ACTION_PLAN.md](05_ACTION_PLAN.md) | **44 task · 4 fase · dependency · risk · biaya** | F1-0 alamat → F1-1R → F1-3 → deploy bersih |
| [04_KEPUTUSAN_OWNER.md](04_KEPUTUSAN_OWNER.md) | **60 keputusan owner (6 bagian) menjawab semua OPEN QUESTIONS + flow detail** | BELUM PUBLISH; 1 staf; tenant=pengawas; alamat Surabaya Barat; no-partial; renewal DP; gamifikasi tenant |
| [06_DESAIN_RENEWAL.md](06_DESAIN_RENEWAL.md) | **Desain flow renewal GAP #2 (deliverable F2-1)** — state machine + 7 skenario UAT + schema | Tenant lama prioritas s/d hari-H; DP 30%; grace H+7; first-paid-wins setelah prioritas hilang |
| [07_DESAIN_GAMIFIKASI.md](07_DESAIN_GAMIFIKASI.md) | **Desain loyalitas/gamifikasi tenant (deliverable F4-9)** — poin, reward, akuntansi, UI | Poin dari renewal/bayar-tepat/streak/quest → reward (WiFi/cleaning/diskon) dicatat akurat |
| [08_DESAIN_OPERASIONAL.md](08_DESAIN_OPERASIONAL.md) | **Desain operasional** — review/tenant-pengawas, overstay/kabur/abandoned, KTP, expense rutin, SLA tiket | gate verifikasi review; deposit kurang→piutang; KTP foto+hapus; SLA 24j/3h/7h |

## Koreksi atas V1 & docs (drift)
1. V1 F1-1 (GAP #1) — spesifikasi berbahaya, direvisi F1-1R. 2. V1 "COA 17/17" — aktual 38 akun. 3. V1 "W-01/W-02 belum" — W-01 done, W-B04 error-state done. 4. FLOW_MAP §4 postPaymentReversalTx — dead code. 5. FLOW_MAP §7 job #3 — sudah cek submissions. 6. FLOW_MAP §3.1 — file 1.564 baris + gate A18. 7. FLOW_MAP §14.1 notif renew — tetap salah (nol).

## MASTERY MATRIX — 63 teori (semua terisi; ✅ = menghasilkan temuan/verifikasi/rekomendasi nyata)
### Akuntansi & Keuangan (10)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| PSAK / GAAP | ✅ | 04 §A,§K (F-15,F-24,F-25) | compliant bersyarat, syarat bertambah |
| IFRS (15/16 ≈ PSAK 72/73) | ✅ | 04 §K (F-15 unearned revenue) | sewa multi-bulan belum diamortisasi |
| Forensic Accounting | ✅ | 04 seluruh §B-§I; 01 B-01 | metode utama audit ini |
| Variance Analysis | ✅ | 04 F-17 (MoM neraca rusak); ownerDashboard changePercent | alat MoM ada tapi 1 cacat |
| Break-Even Analysis | ✅ | 04 §J (rumus siap; est. 15 kamar/31%) | blocked data beban produksi |
| DCF / NPV | ❌ | — | butuh ekuitas riil + horizon investasi; tak relevan sampai opening balance produksi |
| Altman Z-Score | ❌ | — | rasio input (WC/TA dll) belum valid sebelum F1-4..6; tunda |
| DuPont ROE | ❌ | 04 §J | blocked ekuitas riil (F1-9) |
| Sensitivity Analysis | ❌ | 04 §J | bergantung BEP terisi |
| Liquidity Stress Test | ❌ | 04 §J | bergantung cashEnding E-4 pasca F1-3 |
### Manajemen (8)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Balanced Scorecard | ✅ | 08/09 (finansial+pelanggan/review+proses/tiket+SDM/KPI semua terukur) | 4 perspektif terdata, belum disatukan 1 dashboard |
| Six Sigma / DMAIC | ✅ | 01 B-01/B-11 (defect jalur approve), 05 I-02 | defect dipetakan ke akar per baris |
| Theory of Constraints | ✅ | 08 antrian review pembayaran = bottleneck; F3-8 | constraint teridentifikasi, ukur dulu |
| OKR | ❌ | — | organisasi 2-3 staf; KPI bulanan sudah memadai, OKR overhead |
| Kaizen | ✅ | 11 F3-13 paket perbaikan kecil berkelanjutan | pola QW V1 diteruskan |
| TQM | ✅ | 02 §gate kamar; quality gate room-ready & catatan ≥8 char | budaya mutu tertanam di kode |
| Agile / Scrum | ❌ | — | metode kerja tim, bukan objek audit kode; tak menghasilkan temuan |
| Value Stream Mapping | ✅ | 06 funnel 6 langkah; 01 flow 13 | jalur nilai terpetakan file:baris |
### Operasi (8)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Queue Theory | ✅ | 08 kalender/antrian; F3-8 umur antrian | metrik antrian belum diukur — task dibuat |
| Capacity Planning | ✅ | occupancy operable-rooms (F-04 fix; 04 §F) | basis kapasitas benar pasca-fix |
| Yield Management | ❌ | — | harga flat per term by design owner; dynamic pricing bukan agenda |
| Revenue Management | ✅ | 06 M-07 tier narasi; 04 §J unit economics/tier | tier belum dieksploitasi |
| Inventory Turnover | ✅ | 05 rekomendasi turnover+dead stock | endpoint belum ada — task |
| EOQ | ❌ | 05 | consumable sedikit, supplier harian — tak relevan permanen |
| Scheduling Optimization | ✅ | 01/08 urutan 9 job + gerbang WIB + B-14 | urutan benar; 1 celah catch-up |
| Resource Allocation | ✅ | 09 K-4 round-robin (3 lokasi id-asc) | timpang — task F2-10 |
### Psikologi (12)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Maslow | ✅ | 09 mapping | hygiene di luar app |
| Herzberg | ✅ | 09 (motivator kosong) | Staff of the Month diusulkan |
| McClelland | ✅ | 09 (kategori 5 jenjang ada) | badge achievement diusulkan |
| Self-Determination | ✅ | 09 K-7 (claim tiket bebas DITEMUKAN di kode) | autonomy ada tapi tanpa guardrail |
| Goal-Setting | ✅ | 09 (routine template) | target bulanan eksplisit diusulkan |
| Expectancy | ✅ | 09 K-1 clamp | putus di 100 — leaderboard netKpi |
| Equity | ✅ | 09 K-2/K-4 | formula tersembunyi + beban timpang |
| Reinforcement | ✅ | 09 K-3 | reward loop manual diusulkan |
| Nudge | ✅ | 09 guard satu-kerja; 07 copy peringatan | dipakai sistem secara sehat |
| Loss Aversion | ✅ | 07 N13; copy DP hangus di reminder H-x | dipakai ke tenant; sengaja tidak ke staf |
| Default Effect | ✅ | 07 (default Bulanan disorot di detail kamar) | default sehat |
| Hick's Law | ✅ | 07 matrix (katalog 48, FAQ 20) | 2 pelanggaran terdata |
### UI/UX (13)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Nielsen #1 Visibility | ✅ | 07 matrix kolom N1 | spinner vs skeleton |
| Nielsen #2 Real World | ✅ | 07 N2 + UD-01 | 1 pelanggaran KRITIS (alamat) |
| Nielsen #3 User Control | ✅ | 07 N3 | sehat |
| Nielsen #4 Consistency | ✅ | 07 N4 (5 screenshot) | design system seragam |
| Nielsen #5 Error Prevention | ✅ | 07 N5 + 02 gate A18 | kelas terbaik aplikasi |
| Nielsen #6 Recognition | ✅ | 07 N6 (F-12 label laporan) | 1 catatan |
| Nielsen #7 Flexibility | ✅ | 07 N7 | sehat |
| Nielsen #8 Aesthetic/Minimal | ✅ | 07 N8 (home panjang, owner 15+ kartu) | 3 catatan |
| Nielsen #9 Error Recovery | ✅ | 07 N9 (W-B04 sebagian done) | membaik |
| Nielsen #10 Help | ✅ | 07 N10 | FAQ+panduan kuat |
| Fitts's Law | ✅ | 07 + UD-05 sticky CTA | 1 temuan mobile |
| Gestalt | ✅ | 07 N4/screenshot (proximity kartu, similarity chip) | sehat via design system |
| WCAG / Accessibility | ✅ | 07 UD-06 (aria 36 total; belum diaudit formal) | temuan = hutang audit; task dibuat |
### Bisnis & Tools (18)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| BMC | ❌ | — | model tunggal sewa kamar, sudah jelas; tak menghasilkan temuan baru |
| Value Proposition Canvas | ✅ | 06 (pain reliever anti-penipuan kuat; gain creator lemah) | M-07 |
| Porter 5 Forces | ❌ | — | analisis kompetitor TIDAK VALID sampai UD-01 (lokasi) terjawab |
| Blue Ocean | ❌ | — | idem UD-01; positioning menunggu alamat pasti |
| BCG Matrix | ❌ | — | single property; matriks per-tier = F4-4 blocked data |
| Ansoff | ❌ | — | ekspansi bukan agenda owner saat ini |
| McKinsey 7S | ❌ | — | organisasi 2-3 staf; framework korporat overkill |
| VRIO | ✅ | 06 (sistem ops digital + waiting room = resource langka tak ditiru kost sebelah) | jadikan materi marketing |
| Platform Economy | ❌ | — | bukan platform dua sisi; tidak relevan |
| Subscription Economy | ✅ | 01/02 GAP #2 (renewal = retensi; notif renew bolong = churn risk) | retensi = prioritas F2-1/F2-2 |
| Gamification | ✅ | 09 §gamification | 4 usulan tanpa schema |
| Growth Hacking | ✅ | 06 M-08 lead source nyaris gratis | kolom sudah ada |
| AIDA | ✅ | 06 tabel AIDA | Action terhambat performa |
| Jobs-to-be-Done | ✅ | 06 M-07 | menjual spesifikasi, bukan kehidupan |
| Social Proof | ✅ | 06 M-06 + 07 UD-07 ("7 menit" tanpa bukti) | kebocoran akuisisi terbesar |
| CLV | ✅ | 02/08 (renewal+reminder = mesin CLV; GAP #2 merusaknya) | retensi > akuisisi utk kost |
| CAC | ✅ | 06 M-08 (kanal akuisisi tak terukur) | lead source = pengukur CAC |
| Unit Economics | ✅ | 04 §J + 10 #7 | rangka siap, data produksi belum |
### Visualisasi (8)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Tufte Data-Ink | ✅ | 10 V-2/V-7/UD-04 | 3 temuan tinta/skala |
| Colorbrewer | ✅ | 10 V-5 (palet Okabe-Ito diusulkan) | belum color-blind-safe |
| Sparklines | ✅ | 10 rek #6 (pasca fix rasio) | spesifikasi siap |
| Bullet Graphs | ✅ | 10 rek #4 | butuh target owner |
| Treemap | ✅ | 10 rek #7 (Recharts native, data belum siap) | parkir F4-4 |
| Sankey | ✅ | 10 rek #5 (dievaluasi & DITOLAK — funnel linier cukup bar) | keputusan sadar |
| Waterfall | ✅ | 10 rek #3 (trik stacked Recharts) | pasca F-09 |
| Calendar Heatmap | ✅ | 10 rek #1 (CSS grid, bukan lib) | satu-satunya yang bisa segera |
### Hukum (4)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| UU PDP | ✅ | 06 social proof anonim+consent; 03 Deepseek privacy | guard sudah jadi kebiasaan |
| UU ITE | ❌ | — | bukti elektronik & audit trail sudah memadai; tak ada temuan baru dari lensa ini |
| Hukum Perdata (kontrak) | ✅ | 02 aturan #8 (pembayaran sesuai kontrak = klausul perdata; gate A18 menegakkannya) | kode kini menegakkan kontrak |
| Perlindungan Konsumen | ✅ | 08 N-01 (copy menyangkal dana) + 06 M-05/UD-01 (info lokasi menyesatkan) | 2 risiko informasi-benar UUPK |

**Utilisasi: 46/63 teori menghasilkan temuan/verdict nyata; 17 ❌ masing-masing dengan alasan eksplisit (blocked-by-data: 5 · tidak relevan konteks 48-kamar: 11 · menunggu UD-01: 2 di antaranya).**

## Statistik temuan
- Temuan BARU V3: **63** (F-17..F-34: 18 · B-01..B-15: 15 · I-01..I-07: 7 · K-6..K-8: 3 · N-01..N-04: 4 · M-04..M-10: 6 · UD-01..UD-07: 7 · X-01..X-03: 3) + verifikasi ulang seluruh F-01..F-16/GAP/K/V V1.
- Koreksi atas V1/docs: 7. Temuan positif (verifikasi sehat) terdokumentasi: 20+.
- Severity baru: 7×P1 🔴 · 14×P2 🟠 · 26×P3 🟡 · 16×INFO.
