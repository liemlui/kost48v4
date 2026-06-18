# KOST48 V5 - Master Overview, Ground State, Plan, Traceability

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Dokumen orientasi utama untuk memahami blueprint sistem, kondisi aktual, rencana eksekusi, traceability audit, dan router dokumen AI.

## Sumber Digabung

- `docs/00_BLUEPRINT.md` - konten dipertahankan
- `docs/01_GROUND_STATE.md` - konten dipertahankan
- `docs/07_PLAN.md` - konten dipertahankan
- `docs/09_TRACEABILITY.md` - konten dipertahankan
- `docs/_PETA_AI.md` - konten dipertahankan

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

**Sistem KOST48 V5 LULUS audit keuangan ultra teliti.** Trial balance balanced, deposit MATCHED (16 stay × Rp500rb), 8 invarian akuntansi PASS, 7 DO-NOT-TOUCH blocks UTUH, 5 high-risk flows SEHAT. Detail: `docs/M04_KEUANGAN.md` Update 2026-06-17 dan `docs/M10_CHECKLIST_CHANGELOG.md`.

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/00_BLUEPRINT.md`

### BLUEPRINT SISTEM KOST48 — Peta Tunggal & Indeks Dossier
**Tanggal:** 2026-06-13 · **PINTU MASUK.** Baca ini dulu untuk gambaran utuh, lalu buka dossier domain yang relevan. Tiap dossier `10`-`19` mandiri dan berisi aturan, peta kode, temuan, task, desain, serta UAT domainnya.

#### 1. Identitas & model bisnis
- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP), **Jl. Hikmah V No. 48, Surabaya Barat** (dekat Pakuwon Mall/PTC; bukan Ngagel — D-01).
- Stack: NestJS+Prisma+PostgreSQL · React+Vite · JWT · Recharts. Role: OWNER/ADMIN/STAFF/TENANT.
- **BELUM PUBLISH** — DB = data testing (boleh dihapus). Deploy = START BERSIH (fresh, bukan migrasi). **1 staf.** Bayar **tunai+transfer**. Notif in-app → PWA push.
- **Filosofi:** retensi > akuisisi (CLV); **tenant = pengawas kualitas staf** (owner menindak staf berdasar nilai tenant); otomatisasi maksimal (auto-ops), manusia hanya di titik keputusan uang; laporan keuangan jujur (tidak ada benefit gelap).

#### 2. Konsep kunci uang
- **DP 30%** (uang muka, hangus) ≠ **Deposit jaminan** (`Room.defaultDepositRupiah`, SELALU tetap, refundable). **NO-PARTIAL menyeluruh.** **First-paid-wins.** **Booking expiry 3 jam flat.**
- Sewa per term: Harian13%·Mingguan45%·2Mingguan75%·Bulanan100%·Semester5,5×·Tahunan10×. Utilitas: short all-in, bulanan+ meter. WiFi terpisah.
- Akuntansi Auto Journal Lite (idempotent), auto-close & depresiasi otomatis, expense rutin auto-draft, kapitalisasi >Rp500rb. Keluar awal: sewa hangus, deposit normal.

#### 3. INDEKS DOSSIER (buka sesuai area kerja)
| Dossier | Domain | Status | Isu utama |
|---|---|---|---|
| `10_PEMBAYARAN_INVOICE` | bayar/approve/invoice/meter (flow 3,4) | 🟢/🔴 | no-partial (F1-1R), guard remove OCCUPIED (F1-2) |
| `11_BOOKING_RENEWAL` | booking + renewal (flow 2,5) | 🟢/🔴 | GAP #2 renewal (F2-1, desain lengkap di dossier), expiry/deposit-lock |
| `12_CHECKOUT_DEPOSIT_OVERSTAY` | checkout/deposit/overstay (flow 6,7) | 🟢 | cancel-tiket (F2-6), kabur/abandoned/paksa-checkout (F3-14/15/16) |
| `13_AKUNTANSI_LAPORAN` | jurnal/laporan/expense/aset (flow 10-12) | 🟢 mesin/🔴 laporan | F-01..F-34 (Fase 1 laporan!), draft-jurnal matikan |
| `14_INVENTARIS` | stok/movement/room-item (flow 9) | 🟢 | ghost-stock admin-review (F2-5) |
| `15_STAF_TIKET_KPI` | tiket/rutinitas/KPI/review (flow 8) | 🟢 | tenant-pengawas (F2-18), SLA (F3-19), KPI double-count (F2-9) |
| `16_NOTIFIKASI_PENGUMUMAN` | notif/pengumuman/push (flow 14) | 🟡 | renew notif (F2-2), copy A17 (F2-3), coverage (F3-1) |
| `17_PUBLIK_MARKETING_UIUX` | katalog/SEO/UI/chart (flow 2-publik) | 🟢 UX/🔴 SEO | SEO (F3-3), social proof (F3-4), perf publik (F2-11) |
| `18_AUTH_FONDASI_ONBOARDING` | auth/role/KTP (flow 1) | 🟢 | OWNER-only (F2-16), KTP gate (F3-17) |
| `19_GAMIFIKASI_LOYALITAS` | poin/reward tenant (BARU) | 📅 Fase 4 | F4-9 (desain lengkap di dossier) |
**Hierarki sumber kebenaran:** `03_KEPUTUSAN_OWNER` (aturan bisnis mengikat) → `01_GROUND_STATE` dan `02_FLOW_MAP` (fakta kode saat ini) → dossier domain (temuan dan desain target) → `08_CHECKLIST` (urutan eksekusi). `04_DEPLOY_AND_PWA` adalah runbook operasi. **`05_VERIFIKASI_KEUANGAN` wajib untuk setiap task uang.** Detail forensik 97 temuan diarsipkan di `archieve/_DEPRECATED_AUDIT_*`.

#### 4. PETA EKSEKUSI (urutan fase — task ada di dossier masing-masing)
```
FASE 1 (SEBELUM publish — uang & laporan benar):
  F1-0 alamat✓ → F1-T harness finance[D05] → F1-1R no-partial[D10] →
  F1-2 guard-payment[D10] →
  F1-3 cashflow[D13] → F1-4/5/6 rasio[D13] → F1-7 DRAFT-revenue[D13] →
  F1-8 settlement-guard[D13] → F1-9 deposit-cashflow[D13] →
  F1-10 deposit-lock[D11] → F1-11 expiry-3jam[D11] →
  F2-8 matikan-draft-jurnal[D13] → F1-12 DEPLOY BERSIH[D04]
FASE 2 (pasca publish — flow & model):
  F2-1 RENEWAL[D11] → F2-2 notif-renew[D16] → F2-3+3b refund[D16/D10] →
  F2-5 ghost-stock[D14] → F2-6 cancel-tiket[D12] → F2-9 KPI-fix[D15] →
  F2-16 OWNER-only[D18] → F2-18 tenant-pengawas[D15] → F2-11 perf-publik[D17] →
  F2-12 sinyal+aging[D13] → F2-14 TZ-WIB[D13] → F2-17 notif-cancel[D16]
FASE 3 (operasional & visibilitas):
  F3-3 SEO[D17] → F3-4 social-proof[D17] → F3-7 heatmap → F3-14 kabur[D12] →
  F3-15 abandoned[D12] → F3-16 paksa-checkout[D12] → F3-17 KTP[D18] →
  F3-18 expense-rutin[D13] → F3-19 SLA[D15] → F3-20 prompt-review[D15] →
  F3-21 depresiasi-auto[D13] → F3-1/2 notif-coverage[D16] → F3-9..13 polish
FASE 4 (future): F4-1 unearned-rev[D13] · F4-9 GAMIFIKASI[D19] · F4-2 PWA-push[D16] · F4-7 pruning · F4-8 pindah-kamar
DITUNDA (1 staf): F2-10 round-robin · F3-5 leaderboard antar-staf [D15]
```
**Prioritas mutlak (bila waktu terbatas):** F1-T · F1-1R · F1-2 · F1-3 · F1-7 · F1-8 · F1-9 · F2-3 (copy A17) · F2-5 (ghost-stock). Setelah itu kerjakan GAP #2 renewal.

#### 5. AUTO-OPS ENGINE (lintas-domain, "jam biologis") — 9 job sequential
Mutex `running`; urutan: ①bookingExpiry ②contractEndReminders ③DP-forfeit ④forcedCheckout ⑤postCheckoutAutoCancel ⑥noonRelease ⑦roomHealer ⑧overstayEnforcement ⑨accountingAutoClose. Lock FOR UPDATE + re-cek; **uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi**; reversal jurnal blocking; gerbang WIB pk 12:00. Satu pintu cancel `cancelEndedUnpaidStay`. Job→dossier: ①③→D11/D12, ④⑤⑥⑧→D12, ②→D16, ⑨→D13. Tambahan: reminder H-10 (D16), depresiasi job #10 (D13), 2 sweeper renewal (D11), TZ WIB (D13). **Tangguh** (try/catch per item, take limit) — 9 check reliability lulus.

#### 6. INVARIAN SISTEM (tak boleh dilanggar)
1. Uang masuk = otomatisasi BERHENTI. 2. Stay promoted tak pernah dibatalkan job; CANCELLED berjurnal wajib reversal blocking. 3. Kamar tak AVAILABLE tanpa tiket inspeksi ditutup (staf boleh tutup, guard keselamatan tetap). 4. Tiap rupiah = 1 jurnal POSTED + AuditLog; deposit=liability; no-partial. 5. Periode renewal menyambung tanpa gap/overlap; tenant lama prioritas s/d hari-H. 6. Data sensitif (KTP) minimal+terproteksi+dihapus saat keluar. 7. Reward/benefit selalu berjejak akuntansi.

#### 7. MATRIX TEORI (sinkron PDF `reference/KOST48_Analisis_Bisnis_Total.pdf` + `reference/buku.md` — file referensi BESAR, JANGAN baca penuh)
> Catatan penting: teori bisnis dipakai dalam dua lapis. Lapis 1 = kerangka analisis owner/AI
> untuk membaca bisnis. Lapis 2 = fitur sistem yang benar-benar perlu dibangun sekarang. Jadi
> Porter, BMC, Ansoff, BCG, STEEPLE, STP, 7Ps, dan SERVQUAL **dipakai sebagai analisis** walau
> tidak semuanya perlu menjadi modul aplikasi mandiri.

- **Keuangan/Akuntansi:** cashflow, break-even/BEP, budgeting, forecasting, PSAK/unearned revenue,
  forensic accounting, variance, trial balance, deposit liability, dan rekonsiliasi dipakai aktif
  (M04/M10). DCF/Altman/DuPont/sensitivity/stress tetap ditunda sampai ada data produksi stabil.
- **Strategi Bisnis:** Porter/Five Forces, Business Model Canvas, Value Chain, STP, 7Ps, SWOT/TOWS,
  Ansoff, BCG, CLV/CAC, unit economics, social proof, VRIO, growth, AIDA, gamification dipakai sebagai
  kerangka analisis PDF dan prioritas growth (M07). Implementasi sistemnya bertahap: lead source,
  loyalty/referral, public funnel, add-on service, dan AI scheduler.
- **Manajemen/Operasi:** Six Sigma/TOC/Kaizen/TQM/VSM/Balanced Scorecard, Queue/Capacity,
  Revenue Management, Inventory Turnover, SLA, KPI, dan SERVQUAL turun menjadi tiket, room readiness,
  inventory, staff KPI, ranking kebersihan, dan kepuasan tenant (M05/M06). EOQ/Yield tetap tidak
  prioritas karena skala kos kecil dan barang consumable sedikit.
- **Psikologi & HR:** Expectancy, Equity, Reinforcement, SDT, Goal-Setting, Nudge, Loss-Aversion,
  McClelland, Herzberg, Maslow, Default Effect, dan Hick dipakai untuk staf, review tenant,
  gamifikasi, dan UX (M06/M07).
- **UI/UX & Visualisasi:** Nielsen 1-10, Fitts, Gestalt, WCAG, Tufte, ColorBrewer, sparkline, bullet,
  treemap, waterfall, heatmap dipakai; Sankey tetap ditolak karena funnel bisnis utama lebih linier.
- **Hukum & Tata Kelola:** UU PDP, perlindungan konsumen, kontrak perdata, audit trail, OWNER-only
  governance, dan source ledger dipakai sebagai guard operasional (M02/M06/M09).

#### 8. GAP ANALISA BISNIS -> FITUR APP (disetujui 2026-06-16)

Analisa bisnis dari PDF dan `reference/buku.md` tidak semuanya harus menjadi modul mandiri. Yang wajib diprodukkan
ke aplikasi adalah bagian yang langsung membantu owner menjual kamar, memahami kanal akuisisi, menjaga
retensi, dan mengambil keputusan operasional.

- **Prioritas 1 - MKT engine:** SWOT/PESTLE owner-editable, pembanding kompetitor, survey guest/prospek,
  dan narasi otomatis untuk onboarding, web publik, katalog, dan FAQ ringkas.
- **Prioritas 2 - MG-UI publik:** landing publik modern dengan hero immersive, capsule/sticky nav, CTA kuat,
  proof strip, section "Living System", foto marketing yang rapi, dan verifikasi Lighthouse/Playwright.
- **Prioritas 3 - CAC/CLV lite:** lead source sudah ada; lanjutkan menjadi dashboard owner untuk kanal
  akuisisi, conversion proxy, renewal rate, rata-rata lama tinggal, referral/loyalty impact, dan estimasi CLV.
  Paid CAC hanya dihitung bila biaya iklan/marketing sudah diinput; jangan membuat angka palsu.
- **Prioritas 4 - Retensi & service add-on:** cross-sell saat renewal, WiFi/bantuan bersih, tip staf lengkap,
  ranking kebersihan kamar, dan meter/listrik pascabayar sebagai value proposition publik.
- **Ditunda sampai data produksi stabil:** DCF, Altman, DuPont, sensitivity/stress analysis, market-share
  formal, dan BCG kuantitatif. Porter, BMC, Ansoff, STP, 7Ps, VRIO, AIDA, dan SERVQUAL tetap dipakai
  sebagai kerangka berpikir, bukan modul aplikasi terpisah.

#### 9. Risiko, dependensi & estimasi (lintas-domain)
**Dependensi kunci:** Fase 1 (uang/laporan benar) → DEPLOY bersih → Fase 2+. `F1-1R` no-partial → prasyarat renewal (`F2-1`, pakai jalur payment sama). `F1-3..F1-6` fix laporan → prasyarat chart finansial (`F3-12`) & analitik. `F2-5` util bersama → `F2-6`. `F2-9`+round-robin → leaderboard (ditunda 1 staf). N-04 pruning → PWA push (`F4-2`).
**Risiko tertinggi:** `F1-1R` (tolak pembayaran sah edge — uji DP/pelunasan/renewal/manual); `F1-3` (salah identifikasi line kas — cross-check manual 1 bulan); `F2-1` renewal (race vs booking publik); `F2-5` (refactor file panas); `F2-16` OWNER-only (audit `@Roles` menyeluruh); `F2-14` TZ WIB (KPI/jurnal dapat bergeser sehari). Kebijakan backup 6-bulanan berisiko terlalu jarang dan sebaiknya ditinjau owner.
**Estimasi:** ~30-38 sesi AI eksekutor (Fase 1: 7-9 · Fase 2: 11-13 · Fase 3: 8-10 · Fase 4+desain: 4-6). Regression harness gratis tiap akhir kerja uang: `reconciliation-lite` + `deposit-reconciliation` + `trial-balance`.
**Aturan eksekutor:** 1 task = `tsc --noEmit` 0 = 1 commit (Indonesia); STOP condition per task = lewati+catat+lanjut; JANGAN tambah npm deps / ubah schema-sql / push / sentuh file yang sedang M oleh AI lain (cek `git status` dulu). Schema additive (renewal/KTP/gamifikasi/refund) WAJIB owner-approve dulu.

#### 10. Statistik
97 temuan forensik · keputusan owner terkonsolidasi di `03_KEPUTUSAN_OWNER` · 44+ task · 10 dossier domain + 4 desain fitur. Sistem inti uang, jurnal, dan Auto-Ops kuat secara arsitektur; pekerjaan tersisa adalah memperbaiki laporan, menutup aturan bisnis yang belum diterapkan, lalu deploy bersih.


## Bagian 2 - `docs/01_GROUND_STATE.md`

### KOST48 V5 — Ground State (Ringkas)
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. Baseline kode: `3c7ffe2`. Versi V5.10.0 lama diarsipkan di `archieve/00_GROUND_STATE_V5100_STALE.md`, JANGAN dipakai sebagai referensi.
**Aturan:** file ini hanya memuat fakta yang sudah diverifikasi dari kode. Detail per-flow ada di `02_FLOW_MAP.md` (peta `file:baris`). Riwayat perubahan di `CHANGELOG.md`. Audit V3 SELESAI & dibubarkan ke dossier domain (`10`-`19`); orientasi & peta eksekusi di `00_BLUEPRINT.md`, keputusan owner di `03_KEPUTUSAN_OWNER.md`.

<!-- KOST48_DOCS_SYNC_20260611_GROUND_STATE_REWRITE -->

> **Status (2026-06-15):** Fase 1–4 + backlog owner + **Fase 5 (tindak-lanjut audit, S-5 + F5-1..F5-8) SELESAI** (lihat `CHANGELOG.md`). Audit menyeluruh semua fase TANPA 🔴 bug baru (`docs/AUDIT_MENYELURUH_SEMUA_FASE.md`). Schema additive terkini = S-5 (migration `20260615140000_s5_ac_usage_vendor`). **Belum publish** (DB testing; deploy fresh). **Go-live WAJIB:** set `KTP_ACTIVATION_GATE_ENABLED=true` + VAPID env (lihat `04_DEPLOY`).

#### 1. Identitas & Stack
- **KOST48 Surabaya** — kost eksklusif pria, 48 kamar (33 reguler, 10 eksklusif, 5 VIP), **Jl. Hikmah V No. 48, Surabaya Barat** (dekat Pakuwon Mall/PTC). (UD-01 terjawab 2026-06-13 D-01: alamat sebelumnya "Ngagel Jaya Utara" SALAH; frontend benar.)
- Backend: NestJS + TypeScript + Prisma + PostgreSQL. Auth JWT Bearer (expiry 24 jam, tanpa refresh token). Swagger non-production saja.
- Frontend: React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- Keamanan: header manual di `main.ts` (TANPA Helmet — keputusan sadar), rate limit in-memory (`common/middleware/rate-limit.middleware.ts`): global 300/menit/IP, auth 10/15 menit/IP.
- DB: `kost48_v3_pro` (UAT, port 5433) / `kost48_v3` (produksi, 5432). **41 model** aktif di schema.prisma (lihat §1.4).
- Role enum: **OWNER, ADMIN, STAFF, TENANT** (tidak ada SUPER_ADMIN/FINANCE).

##### 1.1 Arsitektur Multi-App V5 (Greenfield Shell + Brownfield Extraction)
```text
Tidak semua service dipisah sekaligus.
Tidak ada service-to-service HTTP di fase awal.
Shared DB + shared PrismaService tetap ada.
Extractor pattern: buat shell app → pindahkan module → koneksikan shared foundation.
Target apps: core-api, tenant-api, staff-api, finance-api, marketing-api, owner-api.
```

##### 1.2 Struktur Backend Saat Ini (terverifikasi vs kode 3c7ffe2 — 33 modul)
```text
backend/src/
├── main.ts            # bootstrap, global pipes/filters/interceptors, CORS, prefix, security headers
├── app.module.ts      # root module imports
├── prisma/            # PrismaService
├── generated/         # Prisma client (build artifact, jangan commit)
├── common/            # decorators, guards (APP_GUARD), enums, filters, interceptors, middleware (rate-limit)
├── auth/              # JWT auth (login, roles guard, jwt.strategy)
├── audit-log/         # audit trail service
└── modules/           # 33 modul:
    # uang & siklus huni
    stays · rooms · tenant-bookings · payment-submissions · invoices · invoice-payments ·
    meter-readings · renew-requests · checkout-requests · tenants
    # akuntansi & keuangan
    accounting · deposit-ledger · expenses · wifi-sales · assets · reports · finance · analytics
    # operasional staf & inventaris
    tickets · staff-routines · staff-field-reports · staff-performance · tenant-staff-reviews ·
    inventory-items · inventory-movements · room-items
    # publik, notif, fondasi, AI
    marketing · faqs · announcements · notifications · auto-ops · users · ai
```
> Catatan: TIDAK ada modul `inventory`, `deposits`, `public`, `dashboard`, `me`, `maintenance` (penamaan lama). Endpoint publik ada di `marketing/` + `public-bookings` (dalam `tenant-bookings/`).

##### 1.3 Frontend Route/Surface Map
| Route Pattern | Surface | Auth |
|---|---|---|
| `/` | Landing / public home | Public |
| `/rooms` | Public room list | Public |
| `/rooms/:id` | Public room detail | Public |
| `/register` | Tenant registration | Public |
| `/login` | Login | Public |
| `/portal/*` | Tenant portal | TENANT |
| `/staff/*` | Staff workspace | STAFF/ADMIN |
| `/admin/*` | Admin/backoffice | ADMIN |
| `/finance/*` | Finance workspace | ADMIN |
| `/owner/*` | Owner dashboard | OWNER/ADMIN |

##### 1.4 Active Prisma Models (41)
`User`, `Tenant`, `Room`, `RoomFacility`, `Stay`, `TenantDepositLedgerEntry`, `MeterReading`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `PasswordResetToken`, `PaymentSubmission`, `Ticket`, `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffWorkAudit`, `StaffPerformanceEvent`, `StaffReview`, `Announcement`, `InventoryItem`, `RoomItem`, `InventoryMovement`, `StaffFieldReport`, `RenewRequest`, `CheckoutRequest`, `WifiSale`, `Expense`, `FixedAsset`, `AssetDepreciationRun`, `AssetDepreciationLine`, `AppNotification`, `AuditLog`, `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `OpeningBalanceBatch`, `OpeningBalanceLine`, `JournalEntry`, `JournalLine`, `Faq`.

##### 1.5 Known Limitations Saat Ini
- No service-to-service HTTP yet.
- No separate database per app.
- No event bus / message queue.
- No refresh token.
- No email/WA delivery (only in-app notification + PWA push planned).
- No damage/penalty model yet.
- Fixed asset dan depresiasi manual tersedia; depresiasi otomatis bulanan belum diterapkan.
- Staff inventory read-only.
- Owner dashboard aggregated data (no real-time push).
- Tanpa denda keterlambatan (keputusan owner D1).
- Deploy = FRESH (bukan migrasi dari sistem lama).

#### 2. Konsep kunci (wajib paham sebelum menyentuh kode)
- **Tidak ada model Booking.** Satu `Stay` mewakili seluruh siklus: booking = Stay ACTIVE + Room RESERVED + belum promoted; huni = promoted (`initialMetersPromotedAt` terisi) + Room OCCUPIED.
- **DP ≠ Deposit (ketetapan owner):**
  - **DP** (`Stay.downPayment*`) = uang muka pesan kamar, 30% sewa, bagian harga sewa, **hangus** bila gagal lunas (jurnal `DP_FORFEIT`).
  - **Deposit jaminan** (`Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`) = uang titipan, dicek saat checkout, **refundable** via settlement + ledger.
- **Alur booking:** bayar DP 30% (atau lunas langsung) → DP approved = kamar terkunci (pesaing batal) → pelunasan + jaminan paling lambat saat check-in → gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- **First paid wins:** multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- **Overstay lifecycle saat ini:** pengingat H-7/H-3/H-1/H-day → H-day pk 12:00 kamar dibuka publik + tiket EVICT_OVERSTAY → H+1 pk 12:00 forced checkout otomatis → kamar MAINTENANCE + `allowBookingWhileCleaning=true`. Keputusan owner menambah H-10; task ini belum diterapkan.
- **Tanpa denda keterlambatan** (keputusan owner D1, 2026-06-11). Line invoice `PENALTY` hanya untuk potongan manual.
- **Notifikasi hanya in-app** (keputusan D2); rencana jangka panjang: PWA push. Belum ada email/WA nyata.
- **Auto-ops = 9 job sequential** (`auto-ops.service.ts`): bookingExpiry, contractEndReminders, downPaymentForfeit, overstayForcedCheckout, postCheckoutAutoCancel, roomReleaseAtNoon, roomHealer, overstayEnforcement, accountingAutoClose.
- **Akuntansi Auto Journal Lite:** jurnal otomatis idempotent per (sourceType, sourceId); auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh). Reversal cancel invoice kini blocking di semua jalur (fix A8).
- **Room readiness gate:** kamar tidak pernah AVAILABLE tanpa tiket CHECKOUT_INSPECTION ditutup.

#### 3. Status audit & pengujian (per 2026-06-13)
- **Audit V1 (V5.12):** 53 temuan (42 backend + 11 UI/UX), 24 FIX dieksekusi (sejarah, diarsipkan di `archieve/_DEPRECATED_03_AUDIT_REPORT.md`).
- **Audit V3 (SELESAI):** 97 temua
n, keputusan owner, dan 4 desain fitur telah dibubarkan ke dossier domain `10`-`19`. Detail forensik diarsip di `archieve/_DEPRECATED_AUDIT_*`.
- **COA dikoreksi:** V1 mengklaim 17/17, V3 mengkoreksi menjadi **38 akun**.
- **UAT runtime PASS (DB UAT, 2026-06-12):** siklus DP→pelunasan (M-09 recalc DP, M-12 expiresAt mati, M-07 promoted) · siklus overstay penuh (pengingat H-3/H-day → tiket EVICT → forced checkout H+1 → kamar kotor-bisa-dipesan → settlement deposit berjurnal+ledger → gate room-ready) · renew penuh (invoice sewa+meter, periode menyambung) · rekonsiliasi deposit **mismatch=0** · trial balance **seimbang**; selisih P&L ledger vs operasional terjelaskan 100%.
- **Fondasi terverifikasi runtime:** E-1 guard global default-deny (+@Public), E-3 jaminan check-in manual (ledger+jurnal), E-4 saldo kas dari jurnal, E-5 liability HELD, E-9 hardening — PASS di UAT.
- **DEPLOY = FRESH (keputusan V3/D-06):** sistem BELUM publish, DB = data testing → deploy bersih, bukan migrasi; **E-2 backfill data lama tidak berlaku**. Belum siap produksi penuh sampai Fase 1 di dossier 10-13 tuntas.

#### 4. Akun default & perintah
- admin@kost48.com/admin123 · staff@kost48.com/staff123 · tenant.g2@kost48.com/tenant123 · liem.lui@gmail.com/admin123 (OWNER).
- Backend: `npx tsc --noEmit` (check), `npm run start:dev`. Frontend: `npm run build` (tsc+vite), `npm run dev`. Base URL API: `http://localhost:3000/api`.

#### 5. Aturan update dokumen
- Hierarki konflik: `03_KEPUTUSAN_OWNER` → fakta kode terverifikasi di file ini/`02_FLOW_MAP` → dossier → `08_CHECKLIST`.
- Rilis baru → update file ini (tetap ringkas, <10 KB) + prepend entri di `CHANGELOG.md`. Jangan biarkan dua sumber kebenaran beda versi.
- File docs >30 KB → arsipkan bagian lama ke `docs/archieve/`.


## Bagian 3 - `docs/07_PLAN.md`

### KOST48 V5 — Master Execution Plan
**Versi:** 2026-06-13 · Rencana kanonik setelah sinkronisasi keputusan owner, fakta kode, dan checklist.

#### 1. Hierarki Rencana

1. `03_KEPUTUSAN_OWNER.md` menentukan aturan bisnis.
2. `01_GROUND_STATE.md` dan `02_FLOW_MAP.md` menjelaskan fakta kode saat ini.
3. Dossier `10`-`19` menjelaskan gap, desain target, dan UAT per domain.
4. `08_CHECKLIST.md` adalah urutan task global dan satu-satunya daftar centang eksekusi.

Jika ID task atau status berbeda, `08_CHECKLIST.md` menang dan dokumen yang berbeda harus diperbaiki.

#### 2. Current Phase — Fase 1 Sebelum Publish

**Tujuan:** memastikan penerimaan uang, deposit, jurnal, dan laporan benar sebelum database produksi dibuat.

Urutan:

1. Pasang harness finance minimum (`F1-T`).
2. Tegakkan no-partial pada approval (`F1-1R`).
3. Blokir perubahan payment untuk kamar yang sudah dihuni (`F1-2`).
4. Perbaiki cashflow, rasio, neraca, occupancy, dan revenue DRAFT (`F1-3` s.d. `F1-9`).
5. Kunci deposit kamar dan pastikan expiry booking 3 jam (`F1-10`, `F1-11`).
6. Nonaktifkan pembuatan jurnal draft manual (`F2-8`).
7. Deploy database produksi bersih (`F1-12`).

Build dan verification gate:

```powershell
Set-Location backend
npm run build
node --test "test/**/*.test.js"

Set-Location ../frontend
npm run build
```

Task finance juga wajib melewati endpoint rekonsiliasi di `05_VERIFIKASI_KEUANGAN.md`.

#### 3. Fase 2 — Flow Bisnis Inti

Prioritas setelah deploy:

1. Renewal DP, prioritas tenant lama, grace H+7, dan rent-loyalty (`F2-1`).
2. Notifikasi renewal H-10 serta hasil approve/reject (`F2-2`).
3. Copy dan pencatatan refund first-paid-wins (`F2-3`, `F2-3b`).
4. Tutup ghost-stock admin-review (`F2-5`).
5. Tiket inspeksi saat cancel stay promoted (`F2-6`).
6. Koreksi KPI, role OWNER-only, dan model tenant-pengawas (`F2-9`, `F2-16`, `F2-18`).
7. Performa publik, timezone WIB, dan notifikasi sweeper (`F2-11`, `F2-14`, `F2-17`).

Perubahan schema hanya boleh dilakukan setelah persetujuan owner.

#### 4. Fase 3 — Operasional dan Visibilitas

Lingkup:

- SEO, social proof, dan occupancy heatmap.
- Tenant kabur, barang abandoned, dan forced checkout tunggakan.
- KTP sebelum aktivasi kamar.
- Expense rutin, SLA tiket, prompt review, dan depresiasi otomatis.
- Coverage notifikasi dan higiene laporan/jurnal.
- Perbaikan chart serta lead-source.

Nomor dan urutan lengkap ada di `08_CHECKLIST.md`.

#### 5. Fase 4 — Future

- Unearned revenue untuk kontrak panjang.
- Gamifikasi dan reward tenant dengan jurnal akuntansi.
- PWA Web Push berbasis outbox.
- Pruning notifikasi.
- Flow pindah kamar resmi.

Round-robin dan leaderboard antar-staf tetap ditunda selama hanya ada satu staf.

#### 6. Arsitektur Multi-App

Rencana ekstraksi tetap berlaku, tetapi **bukan current production blocker**:

| App target | Kepemilikan |
|---|---|
| `core-api` | Stay lifecycle, payment approval, booking approval, checkout, renewal, room status |
| `marketing-api` | Public rooms, room detail, gallery read-only |
| `staff-api` | Tickets, room view, inventory read-only |
| `tenant-api` | Request/read surface tenant; tidak mengeksekusi lifecycle final |
| `finance-api` | Report/read surface; approval payment tetap di core |
| `owner-api` | Ditunda |

Ekstraksi baru dimulai setelah Fase 1 stabil dan high-risk command boundary diaudit.

#### 7. High-Risk Flows

Tetap di `core-api`:

- `PaymentSubmissionsService.approveSubmission()`
- `StaysService.create()`
- `StaysService.complete()`
- `StaysService.renewStay()`
- `TenantBookingsService.approveBooking()`
- `StaysService.cancel()`
- Deposit settlement
- Semua write status kamar
- Meter promotion

#### 8. Verification Gates

- Backend dan frontend build lulus.
- Trial balance seimbang.
- Deposit reconciliation mismatch 0.
- Cashflow: beginning + net = ending.
- Public route tetap 200 tanpa token; protected route 401 tanpa token.
- Staff tidak bisa membuat official inventory movement.
- Manual browser UAT mencakup public, tenant, staff, admin, finance, dan owner.

#### 9. Aturan Eksekusi

- Satu task kecil per commit.
- Jangan menambah dependency atau mengubah schema tanpa persetujuan.
- Jangan mengklaim PASS tanpa build/runtime evidence.
- Jangan memigrasikan data UAT ke produksi.
- Jangan mengekstrak high-risk flows sebelum command boundary siap.

**Sumber historis:** `docs/archieve/02_PLAN.md`.


## Bagian 4 - `docs/09_TRACEABILITY.md`

### KOST48 V5 — Audit Traceability Matrix
**Versi:** 2026-06-13 — Cross-reference audit besar → dossier mapping
**Purpose:** Melacak dari mana setiap temuan di dossier `10`-`19` berasal, dan memastikan tidak ada temuan audit V1/V3 yang hilang saat dibubarkan ke dossier.

#### Audit V3 → Dossier Mapping (97 temuan)

| Kode Temuan | Domain Audit | Dossier Tujuan | Status Restorasi |
|---|---|---|---|
| B-01 s/d B-15 | Flow Business (13 flow) | 10, 11, 12, 16 | ✅ B-01/04/09/11→10, B-03/B-15→11, B-07/08/12→12, B-02→10+16, B-14→16 |
| F-01 s/d F-34 | Finance Forensics | 13 | ✅ Termasuk F-09, F-10, F-17, F-18, F-24, F-29, F-30 |
| I-01 s/d I-10 | Inventory | 14 | ✅ Termasuk I-02, I-08, I-09, I-10 |
| M-01 s/d M-09 | Marketing | 17 | ✅ Termasuk M-01, M-05, M-06, M-08 |
| UD-01 s/d UD-07 | UI/UX | 17 | ✅ Termasuk UD-01, UD-02, UD-03, UD-04, UD-05, UD-06, UD-07 |
| V-1 s/d V-7 | Visualization | 17 | ✅ Termasuk V-1, V-2, V-3, V-5, V-6, V-7 |
| K-1 s/d K-8 | KPI & Motivation | 15 | ✅ Termasuk K-1, K-2, K-3, K-4, K-5, K-6, K-7, K-8 |
| N-01 s/d N-04 | Notifications | 16 | ✅ Termasuk N-01, N-02, N-03, N-04 |
| X-01 s/d X-03 | Extra Features | 18 | ✅ Termasuk X-01, X-02, X-03 |

#### Audit V1 (V5.12) → Dossier Mapping (53 temuan)
| Kode Temuan | Dossier Tujuan |
|---|---|
| A1-A18 | 10, 11, 12, 18 |
| C1-C3 | 11 |
| E1-E9 | 18 |
| F1-F2 | 13 |
| GAP#1-#4 | 10, 11 |
| M-07 s/d M-13 (V1) | 10, 11 |

#### Coverage Notes
- **Total temuan V3:** 97 (63 code findings + 34 design/decision)
- **Total temuan V1:** 53 (42 backend + 11 UI/UX)
- **Total dossier tujuan:** 10 files (10-19)
- **Status restorasi:** SEMUA temuan kritis telah direstore ke dossier masing-masing per 2026-06-13
- **Detail forensik lengkap:** `docs/archieve/_DEPRECATED_AUDIT_*` (11 file)

#### Cross-Reference Rules
- Setiap temuan di dossier HARUS mencantumkan kode asli (B-01, F-10, dst) untuk traceability
- File `archieve/_DEPRECATED_AUDIT_00_INDEX.md` adalah master index audit V3
- Jika dossier di-renumber, update matrix ini juga


## Bagian 5 - `docs/_PETA_AI.md`

### _PETA_AI — Router Dokumen Root `/docs` (hemat token + trace ke real file)
**Versi:** 2026-06-13 (disinkronkan setelah normalisasi docs). **Fungsi:** router dokumen dan anchor kode terverifikasi untuk mengurangi pembacaan yang tidak perlu.

#### 0. Cara pakai (AI eksekutor)
- Mulai dari `00_BLUEPRINT.md` (orientasi) → buka HANYA file yang kolom **"Baca saat"**-nya cocok. Dossier 10-19 MANDIRI (tak perlu baca silang).
- Untuk `file:baris`: pakai **§2 (terverifikasi)** atau anchor di **dossier 10-19**. ⚠️ **JANGAN pakai baris di `02_FLOW_MAP.md` — BASI** (lihat §3-D1).
- Task ID resmi = **`08_CHECKLIST.md` + `00_BLUEPRINT.md §4`**. Bila dossier menyebut ID berbeda → ikut `08_CHECKLIST` (lihat §3-D4).
- **Mau eksekusi otonom (YOLO)?** Lihat **§4** — set file minimum + apa yang boleh jalan tanpa tanya vs hard-STOP.

#### 1. Router 22 file root
| File | KB | Baca saat | Akurasi anchor |
|---|---|---|---|
| `00_BLUEPRINT.md` | 9 | **SELALU dulu** — orientasi, indeks dossier, peta fase §4, invarian | 🟢 ref dossier benar (10-19) |
| `01_GROUND_STATE.md` | 10 | Butuh fakta terverifikasi (stack, 41 model, route, limitasi) | 🟢 model dan ref dossier sudah disinkronkan |
| `02_FLOW_MAP.md` | 31 | Narasi alur lintas-domain (apa→apa), bukan untuk angka baris | 🔴 **baris BASI** di file besar (§3-D1) |
| `03_KEPUTUSAN_OWNER.md` | 6 | **Sebelum ubah flow** — 84 keputusan, SUMBER KEBENARAN | 🟢 |
| `04_DEPLOY_AND_PWA.md` | 8 | Deploy fresh + 17 temuan PWA (Phase 0-3) | 🟢 |
| `05_VERIFIKASI_KEUANGAN.md` | 8 | **WAJIB tiap task uang** — invarian, unit test, DO-NOT-TOUCH | 🟢 anchor akuntansi benar |
| `06_CONTRACTS.md` | 17 | Matriks role + aturan bisnis distilled (tanpa baris) | 🟢 by-design tanpa anchor baris |
| `07_PLAN.md` | 10 | Rencana fase produksi (Fase 1-4) | 🟢 |
| `08_CHECKLIST.md` | 12 | **Daftar task BERURUTAN + protokol eksekutor** | 🟢 sumber ID task resmi |
| `09_TRACEABILITY.md` | 2 | Mapping audit V1/V3 → dossier (anti-temuan-hilang) | 🟢 |
| `10_PEMBAYARAN_INVOICE.md` | 6 | Bayar/approve/invoice/meter (F1-1R, F1-2) | 🟢 terverifikasi |
| `11_BOOKING_RENEWAL.md` | 7 | Booking + renewal (F1-10/11, F2-1 + desain §5) | 🟢 terverifikasi |
| `12_CHECKOUT_DEPOSIT_OVERSTAY.md` | 7 | Checkout/deposit/overstay/kabur (F2-6, F3-13/14/15/16) | 🟢 terverifikasi |
| `13_AKUNTANSI_LAPORAN.md` | 6 | Jurnal/laporan (F1-3..9) | 🟢 nama file inti sudah benar |
| `14_INVENTARIS.md` | 5 | Stok/movement/room-item (F2-5 ghost-stock) | 🟢 |
| `15_STAF_TIKET_KPI.md` | 4 | Tiket/KPI/review (F2-9, F3-19/20) | 🟢 ID task sudah mengikuti CHECKLIST |
| `16_NOTIFIKASI_PENGUMUMAN.md` | 4 | Notif/pengumuman/push (F2-2/3/17, F3-1/2) | 🟢 |
| `17_PUBLIK_MARKETING_UIUX.md` | 6 | Katalog/SEO/UI/chart (F2-11, F3-3/4/7/11/12) | 🟢 |
| `18_AUTH_FONDASI_ONBOARDING.md` | 5 | Auth/role/KTP (F2-16, F3-17) | 🟢 |
| `19_GAMIFIKASI_LOYALITAS.md` | 3 | Poin/reward tenant (F4-9, desain) | 🟢 belum ada kode (fitur baru) |
| `CHANGELOG.md` | 31 | Riwayat rilis (prepend-only) | 🟢 |
| `_PETA_AI.md` | — | **File ini** — router + anchor terverifikasi | 🟢 |

#### 2. Anchor real-file TERVERIFIKASI (2026-06-13, cek vs kode — GANTI baris basi di FLOW_MAP)
Path relatif `backend/src/`. Angka = baris deklarasi `async`/method.
- **payment-submissions/payment-submissions.service.ts** (1564 baris): createSubmission:52 · approveSubmission:353 · cancelCompetingUnpaidBookingsTx:736 · rejectSubmission:909 · expireBooking:959 · runExpiryCheck:1096
- **stays/stays.service.ts** (1174): create:113 · complete:526 · cancel:675 · processDeposit:812 · renewStayInTransaction:997
- **auto-ops/auto-ops.service.ts** (1031): runAll:88 · runBookingExpiry:136 · runRoomReleaseAtNoon:164 · runRoomHealer:868
- **tickets/tickets.service.ts**: assign:405 · start:437 · markDone:493 · close:530
- **invoices/invoices.service.ts** (535): create:269 · createWithLinesAndIssue:281 · recalculateInvoiceTotal:423 · issue:444 · cancel:480
- **invoice-payments/invoice-payments.service.ts** (283): create:113 · update:189 · remove:237
- **tenant-bookings/tenant-bookings.service.ts**: createBooking:56 · approveBooking:247 · rejectBooking:506 · cancelPendingBooking:677
- **checkout-requests/checkout-requests.service.ts**: createRequest:47 · approveRequest:128 · rejectRequest:201
- **renew-requests/renew-requests.service.ts**: createRequest:21 · approveRequest:77 · rejectRequest:147
- **accounting/accounting-posting.service.ts** (38KB): postBalancedJournalTx:1110 (DO-NOT-TOUCH) · postPaymentReversalTx:741 (DEAD CODE)
- **accounting/accounting-reports.service.ts** (1148 baris — nama JAMAK "reports"): trialBalance:27 · profitLoss:227 · balanceSheet:347 · cashflow:731 · financialRatios:917 · blok saldo-kas E-4 :838-844 (DO-NOT-TOUCH)
- **marketing/marketing-public-rooms.service.ts** (303) · **notifications/app-notification.service.ts** (103)

#### 3. Status Normalisasi 2026-06-13
- **D1 · DIMITIGASI:** angka baris di `02_FLOW_MAP.md` bukan anchor kanonik. Gunakan nama simbol atau anchor §2 file ini.
- **D2 · SELESAI:** nama `accounting-reports.service.ts` sudah dikoreksi.
- **D3 · SELESAI:** dossier root kini benar-benar bernama `10`-`19`; Ground State sudah menunjuk nomor baru.
- **D4 · SELESAI:** ID task staf mengikuti CHECKLIST: KPI `F2-9`, SLA `F3-19`, prompt review `F3-20`.

> Saat konflik aturan bisnis: `03_KEPUTUSAN_OWNER` menang. Saat memeriksa perilaku yang sudah berjalan: kode menang. Untuk ID dan urutan task: `08_CHECKLIST` menang.

#### 4. EKSEKUSI OTONOM (YOLO) — file yang dipakai AI untuk jalan sendiri
Owner sudah menyatakan semua jelas di dokumen → eksekutor BOLEH jalan tanpa minta persetujuan, KECUALI hard-gate di bawah.
**Set file minimum (baca berurutan; sisanya on-demand):**
1. `00_BLUEPRINT.md` — orientasi + peta fase (§4).
2. `08_CHECKLIST.md` — ambil task teratas yang belum dicentang; **1 task = 1 commit**; ikuti "Protokol AI Eksekutor".
3. Dossier domain yang ditunjuk task (`10`-`19`) — spec lengkap: aturan + lokasi + cara fix + UAT.
4. `_PETA_AI.md §2` — anchor `file:baris` terverifikasi → langsung lompat ke kode.
5. Task uang (dossier 10/12/13) → **WAJIB** lewati `05_VERIFIKASI_KEUANGAN.md` sebelum commit.
Referensi bila ragu: `03_KEPUTUSAN_OWNER` (aturan), `06_CONTRACTS` (role/kontrak), `02_FLOW_MAP` (narasi alur).

**✅ BOLEH YOLO tanpa tanya:** task TANPA marker schema/owner → ubah kode, gate `tsc --noEmit`=0 / `npm run build` + harness finance hijau, commit Bahasa Indonesia, centang `08_CHECKLIST`, prepend `CHANGELOG`.

**⛔ TETAP STOP & lapor owner (hard-gate dari dokumen):**
- Task ber-marker **🧬 / [SCHEMA]** (ubah `schema.prisma`/`sql/`): F2-1, F2-3b, F2-18, F3-14/15/17, F4-1/8/9, dll.
- Langkah **🧑 / [OWNER]**: DEPLOY BERSIH (F1-9), drop/reset DB.
- `git push` (owner yang push) · `npm install` dependensi baru · file sedang di-M AI lain (cek `git status` dulu) · posisi baris bergeser jauh / error setelah 2× coba.
**Selain itu: jalan terus tanpa konfirmasi.**
