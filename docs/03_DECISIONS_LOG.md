# KOST48 V5 — Decisions Log
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation decision sync

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 256 | V5.15 direction dikunci sebagai `Intelligent Command Center + Finance Foundation` | Fokus naik dari UI command center ke rule intelligence, dedup UX, chart/report drill-down, dan finance foundation. |
| 257 | `AssistantPanel` dan `ActionQueueTable` tidak boleh menduplikasi pesan yang sama | Assistant menjadi diagnosis/impact; queue menjadi daftar pekerjaan konkret. |
| 258 | Dedup memakai kombinasi `ruleId + entityType + entityId + actionRoute` | Mengurangi alert spam dan membuat dashboard lebih matang. |
| 259 | Sidebar tidak harus menampilkan Reports sebagai menu utama jika dashboard sudah punya drill-down | Navigasi lebih ringan; reports menjadi detail workspace dari dashboard/finance cockpit. |
| 260 | `usePaymentUrgency.ts` menjadi pola resmi zero-cost intelligence | Pola hook deterministic dipakai untuk domain lain sebelum LLM. |
| 261 | Tier 0 intelligence hooks diprioritaskan sebelum AI/LLM | Biaya nol, deterministic, auditable, dan bisa langsung terasa cerdas. |
| 262 | Tier 0 candidate hooks: `useBusinessHealthScore`, `useTenantRiskProfile`, `useCashflowForecast`, `useOperationalStressIndex`, `useMeterAnomalyDetector` | Dashboard dan portal bisa terasa lebih “AI-like” tanpa backend baru. |
| 263 | `SmartCopyEngine` dibuat sebagai template engine kondisional, bukan LLM | Copy role-specific dan tenant-friendly bisa konsisten tanpa biaya. |
| 264 | AI/LLM hanya boleh on-demand lewat klik eksplisit | Tidak ada AI call saat page load; user yang tidak klik = zero cost. |
| 265 | Semua `/api/ai/*` wajib memakai cache dan rate limit | Melindungi biaya dan mencegah spam klik. |
| 266 | Prompt AI harus pendek dan output JSON kecil | Biaya dan latency ditekan; hasil mudah dipakai UI. |
| 267 | Batch AI calls dipilih daripada per-item calls | Reminder/classification bulk dikirim sebagai satu request jika memungkinkan. |
| 268 | Math/rule first, AI later | Jika bisa dihitung dengan if/else atau formula, tidak boleh memakai LLM. |
| 269 | In-memory `Map` cache diterima untuk MVP AI cache | Tidak perlu schema change untuk mulai Tier 1; persistence bisa menyusul. |
| 270 | Persistent `ai_cache` table boleh direncanakan setelah MVP | Schema hanya lewat migration plan, bukan DB reset. |
| 271 | Backend read/report endpoint boleh dibuka untuk finance/intelligence | V5.15 tidak lagi frontend-only jika backend membuka value nyata. |
| 272 | Schema database boleh direncanakan untuk finance foundation | Diizinkan oleh user, tetapi harus lewat migration plan dan tidak merusak production data. |
| 273 | Balance sheet harus dipersiapkan sebelum formal accounting ratios dibuka | Current ratio, quick ratio, D/E, ROCE tidak boleh fake. |
| 274 | Deposit held wajib diperlakukan sebagai liability, bukan revenue | Finance report tidak boleh salah membaca deposit sebagai pendapatan bersih. |
| 275 | Open invoice boleh menjadi accounts receivable candidate | Tetapi cancelled/paid invoice tidak boleh dihitung sebagai AR. |
| 276 | Formal ratios tetap locked sampai cash/bank, liability, equity, dan capital employed reliable | UI harus menjelaskan data apa yang belum tersedia. |
| 277 | Smart chart switcher boleh dibuat untuk summary/donut/bar/line/table | Chart hanya tampil jika data mendukung dan membantu keputusan. |
| 278 | Kondisi kamar dashboard harus tersambung ke occupancy core report | Room condition bukan dekorasi; harus menjadi pintu analisis okupansi. |
| 279 | Payment Proof Scanner menjadi kandidat Tier 1 “wow moment” pertama | AI membantu review bukti, tetapi tidak approve payment otomatis. |
| 280 | AI tidak boleh melakukan autonomous mutation | AI hanya memberi saran/ekstraksi; admin/user tetap eksekutor aksi. |

## 2026-05-20 — V5.14 Command Center Product Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 241 | Product direction baru dikunci sebagai `KOST48 Command Center` | Aplikasi diarahkan menjadi asisten operasional kos, bukan dashboard statistik. |
| 242 | Subjudul produk: “Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.” | Semua redesign UX harus mengutamakan rekomendasi dan action queue. |
| 243 | V5.14 adalah frontend-first UX/product redesign plan | Backend tidak disentuh kecuali data existing terbukti tidak cukup. |
| 244 | Dashboard tidak boleh lagi didominasi giant KPI cards | Dashboard harus memakai AssistantPanel, ActionQueueTable, dan CompactMetrics. |
| 245 | Business Assistant V5.14 bersifat rule-based, bukan generative AI | Tidak ada AI halusinatif, autonomous mutation, atau auto-approval. |
| 246 | Admin dashboard prioritas pertama | Keluhan utama user adalah halaman depan kurang mengena dan tidak menjawab aksi operasional. |
| 247 | Tenant portal home prioritas kedua | Tenant harus paham status, tagihan, payment review, renew/keluar tanpa jargon teknis. |
| 248 | Stay Detail / Checkout readiness menjadi prioritas detail flow | UI harus menjelaskan invoice blocker, deposit, dan final checkout readiness. |
| 249 | Owner dashboard harus menjadi business health cockpit, bukan admin clone | Owner melihat kesehatan bisnis, risk, outstanding, occupancy, deposit liability, bukan task detail berlebihan. |
| 250 | Staff dashboard diarahkan sebagai operational task board | Staff fokus pada ticket, room check, inventory/maintenance. |
| 251 | No new chart/UI dependency by default | Gunakan React-Bootstrap/CSS existing; dependency baru harus PLAN dulu. |
| 252 | Multi-app tetap roadmap only selama V5.14 | UX redesign tidak boleh membuka `apps/`, workspace migration, atau service split. |
| 253 | No backend summary endpoint until audit proves necessary | Assistant/action queue MVP harus mencoba existing endpoints dulu. |
| 254 | Tenant-facing language harus memakai bahasa manusia | Gunakan “tagihan”, “masa sewa”, “ajukan keluar”, “bukti pembayaran sedang diperiksa”. |
| 255 | `planned checkout` tidak dipakai di UI tenant | Gunakan “Akhir Masa Sewa” atau “Tanggal Renew / Keluar”. |

## 2026-05-19 — V5.13 Release Readiness Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 236 | `e93c78a` menjadi baseline stabil setelah V5.12 full regression PASS | Release readiness boleh dimulai dari baseline ini. |
| 237 | V5.13 tidak mengubah business feature code | Risiko regression dijaga rendah. |
| 238 | Production smoke harus read-only secara default | Tidak boleh membuat/mengubah data produksi. |
| 239 | Source-lite ZIP wajib exclude generated/heavy/sensitive files | ZIP upload/deploy lebih aman dan kecil. |
| 240 | Multi-app tetap roadmap only setelah release readiness | Tidak ada `apps/` atau workspace migration di V5.13. |

## 2026-05-19 — V5.12 UAT Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 230 | V5.12 fokus pada full business UAT pack | Tidak membuka fitur besar baru sebelum renew/checkout/payment terbukti. |
| 231 | UAT scripts boleh membuat isolated UAT data | Scripts boleh create tenant, room, stay, invoice, payment untuk verifikasi repeatable. |
| 232 | V5.12 scripts tidak boleh reset DB | Data UAT dibuat additive, bukan destructive. |
| 233 | Renew UAT wajib membuktikan renewal invoice `ISSUED` dan double approval 409 | Menutup risiko kontrak renew setelah V5.10-B. |
| 234 | Checkout UAT wajib membuktikan open invoice block 409 dan paid invoice allows checkout | Menutup risiko guard checkout setelah V5.8-A/V5.10-A. |
| 235 | Payment regression wajib membuktikan PARTIAL/PAID/overpay guard | Menjaga finance core behavior setelah boundary hardening. |

## 2026-05-19 — V5.10 Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 219 | Decision D active: Stable Modular Monolith | Multi-app menjadi roadmap only, bukan implementasi aktif. |
| 220 | V5.9 multi-app shell tidak dilanjutkan | Jangan buat `apps/`, shell API terpisah, atau runtime alias mirror. |
| 221 | V5.10-A monolith hardening diprioritaskan | Import hygiene, checkout UX, Prisma generated hygiene, AuditLog dependency. |
| 222 | Renew approval tetap core monolith | Karena extend stay + invoice issue adalah lifecycle write. |
| 223 | Renew approve DTO harus sesuai frontend | Backend menerima `plannedCheckOutDate`, `agreedRentAmountRupiah`, `reviewNotes`. |
| 224 | Tenant renew create boleh membawa optional `requestedCheckOutDate` | Memberi kontrak yang selaras dengan schema dan admin list. |
| 225 | Renew approval harus lebih atomic | Row lock `FOR UPDATE`; request approval + stay extension + invoice issue dalam satu transaction. |
| 226 | Staff billing/finance-sensitive writes dibatasi | Meter reading, expense, wifi-sale write menjadi OWNER/ADMIN. |
| 227 | Staff read visibility tetap boleh untuk operasional | Staff tetap bisa membaca data tertentu untuk kebutuhan kerja. |
| 228 | Finance mutation tetap OWNER/ADMIN core | Payment approval dan invoice/payment mutation tidak diextract. |
| 229 | Docs aktif harus disinkronkan ke V5.10 | Tidak boleh lagi menyebut V5.8 PLAN sebagai fase aktif. |

## Active Business Decisions

1. `core` monolith owns all Stay lifecycle writes.
2. Room status/occupancy writes remain core.
3. Tenant can create/view requests/submissions only.
4. Renew approval/execution remains core.
5. Checkout final remains core and is blocked by open invoice.
6. Payment approval remains core.
7. Marketing/public is read-only.
8. Staff early boundary is low-risk/read-heavy.
9. Owner-api deferred.
10. Multi-app only after monolith gates pass.
11. Assistant is rule-based by default.
12. AI/LLM is on-demand only.
13. Finance ratios require balance sheet-grade data.
14. Backend/schema work is allowed only through bounded PLAN/ACT and migration-safe flow.

## Historical Decisions Kept Active

- `schema.prisma` is main data shape.
- `bootstrap.sql` is DB integrity guard.
- PowerShell only.
- Invoke-RestMethod for API tests.
- No production DB reset.
- No docs outside 7 active docs unless user asks.
