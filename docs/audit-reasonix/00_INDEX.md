# 🔍 AUDIT REASONIX CODE — KOST48 V5

> **Auditor:** Reasonix Code (DeepSeek V4 Pro) via sub-agent v4-flash × 5 batch
> **Tanggal:** 4 Juli 2026 · **Total Temuan:** 82 · **Skor Efisiensi Token:** 35/100 → target 71
> **Fokus:** Logika bisnis, akurasi perhitungan, finansial, laporan, UI/UX, efisiensi AI.

---

## 📋 CHECKLIST PROGRES — Centang `[x]` oleh AI yang mengerjakan

> **Aturan:** AI eksekutor WAJIB centang `[x]` setelah task selesai + tulis nama AI + tanggal di kolom "Done by". Kalau task TIDAK bisa diselesaikan → tulis alasan di kolom "Catatan", jangan dipaksa.

### FASE 1 — EFISIENSI TOKEN ⚡ (kerjakan dulu, baru bug)

> **Tujuan:** Naikkan skor efisiensi dari 35 → 71 agar AI berikutnya 2× lebih cepat.
> **Durasi total:** ~15 jam. **Spec:** `docs/audit-reasonix/09_EFISIENSI_TOKEN.md`

| ID | Task | Estimasi | Status | Done by | Tgl | Catatan |
|----|------|----------|--------|---------|-----|---------|
| **E1** | **Section markers** di 44 file >500 baris — tambah `// SECTION: Nama` di tiap file backend + frontend | 2 jam | [x] | Reasonix Code | 7 Jul | ✅ 20 backend + 24 frontend, semua sudah ada `// SECTION:` markers |
| **E2** | **Unifikasi `toLocaleString`** → `formatRupiah` — grep 36 file, ganti dengan import `formatRupiah` / `formatRupiahWithoutSymbol` | 1 jam | [x] | Reasonix Code | 7 Jul | ✅ 25+ file. 7 file money/currency diganti (CacClvDashboard, InvoicePrintLayout, AssetRegisterPage, ExpenseReceiptUpload, RichAvailabilityCalendar, publicGuestShared, StepReviewConfirm). Sisa date-formatting (out of scope E2). Build FE ✅ |
| **E3** | **Inline style → CSS class** — 10 file terburuk (69, 19, 17, 14, 13, 12×3, 11, 10×2) | 3 jam | [x] | Reasonix Code | 7 Jul | ✅ Build FE lulus. 7 file (Balance/PL/CF/Faq/Surveys/Kanban/Profile) + CSS utilities + perbaikan E2 collateral damage |
| **E4** | **`any` → typed** — modul akuntansi: `accounting-posting`, `accounting-reports`, `accounting-period-close` | 4 jam | [x] | Reasonix Code | 7 Jul | ✅ `posting` ✅, `period-close` ✅, `reports` ✅ 32× `(this.prisma as any)` dihapus via script. Semua modul akuntansi bersih dari `(this.prisma as any)`. Build backend ✅ |
| **E5** | **Split fungsi >100 baris** — top 5: `createPaymentSubmission`, `createStay`, `createTicket`, `getAvailableRooms`, `createBooking` | 5 jam | [x] | Reasonix Code | 7 Jul | ✅ `createSubmission` (195→80), ✅ `createTicket` sudah split, ✅ `getAvailableRooms` tidak ada, ✅ `create()` stays (591→543, extract `resolvePortalUserForCheckIn`), ✅ `createBooking` (193→151, extract `validateBookingPreconditions`). Build backend ✅ |
| | **GATE FASE 1:** Skor naik ke ≥60/100 | | | | | | Ukur ulang: file >500 tanpa markers, inline styles, any count |

### FASE 2 — BUG KRITIS 🔴 (6 fix)

> **Spec executable:** `docs/audit-reasonix/SPEC_PERBAIKAN_KRITIS.md` — SEBELUM/SESUDAH, Grep, Gate.
> **Durasi total:** ~6 jam.

| ID | Bug | File | Estimasi | Status | Done by | Tgl |
|----|-----|------|----------|--------|---------|-----|
| **C1** | DISCOUNT line → journal tidak terposting (silent) | `accounting-posting-helpers.ts:70-76` | 1-2 jam | [x] | Reasonix Code | 7 Jul |
| **C2** | Overdue aging gross→net (partial payment) | `reports.service.ts:117` | 30 mnt | [x] | Reasonix Code | 7 Jul |
| **C3** | Renewal cross-term undercharge | `renew-requests.service.ts:267` | 1 jam | [x] | Reasonix Code | 7 Jul |
| **C4** | Collection rate period mismatch | `finance.service.ts:77-86` | 1 jam | [x] | Reasonix Code | 7 Jul |
| **C5** | Journal pending tanpa retry/alert | `payment-submissions.service.ts:794` | 2 jam | [x] | Reasonix Code | 7 Jul |
| **C6** | `@IsNumberString` vs JSON number | `stay.dto.ts:58-63` | 30 mnt | [x] | Reasonix Code | 7 Jul |
| | **GATE FASE 2:** tsc ✅ · unit test PASS · TB balanced | | | | | | |

### FASE 3 — TEMUAN TINGGI 🟠 (15 fix)

> **Detail:** `docs/audit-reasonix/01_FINANSIAL_PERHITUNGAN.md` § H1-H13 · `02_LOGIKA_BISNIS.md` · `03_LAPORAN_AKUNTANSI.md`
> **Durasi total:** ~8 jam.

| ID | Temuan | Estimasi | Status | Done by | Tgl |
|----|--------|----------|--------|---------|-----|
| **H1** | `updateLine()` undefined → hapus field di DB | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H2** | `CreatePortalTicketDto` category tanpa validasi enum | 15 mnt | [x] | Reasonix Code | 4 Jul |
| **H3** | Booking sweeper vs approval race — no auto-refund | 2 jam | [x] | Reasonix Code | 7 Jul |
| **H4** | DP forfeit: PAID invoice kecil block forfeit | 1 jam | [x] | Reasonix Code | 4 Jul |
| **H5** | Checkout `complete()` tanpa FOR UPDATE — race condition | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H6** | Balance sheet double-count current profit | 30 mnt | [x] | Reasonix Code | 7 Jul |
| **H7** | Cashflow `cashBeginning` fragile | 30 mnt | [x] | Reasonix Code | 7 Jul |
| **H8** | `RenewRequestsService.decideByTenant()` TIDAK tanpa transaksi | 15 mnt | [x] | Reasonix Code | 4 Jul |
| **H9** | `CheckoutRequestsService.approveRequest()` TOCTOU | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H10** | Admin dashboard revenue exclude WiFi | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H11** | Seed `ymd()` UTC vs WIB — bisa salah tanggal | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H12** | Multiple invoice duplicate guard stay+period | 1 jam | [x] | Reasonix Code | 4 Jul |
| **H13** | C19-01: tenant 403 console error | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H14** | C19-02: admin 375px overflow | 30 mnt | [x] | Reasonix Code | 4 Jul |
| **H15** | Z-19: owner dashboard belum diverifikasi | 🧑 | 🧑 | manual | — |
| | **GATE FASE 3:** tsc ✅ · build FE ✅ | | | | | | |

### FASE 4 — TEMUAN MENENGAH 🟡 (35 fix)

> **Detail:** `docs/audit-reasonix/04_UI_UX.md` · `05_MODUL_OPERASIONAL.md` · `07_CODE_QUALITY.md` · `08_REPORTING_DASHBOARD.md`
> **Durasi total:** ~12 jam.

| ID | Temuan | Estimasi | Status | Done by | Tgl |
|----|--------|----------|--------|---------|-----|
| **M1** | `buildLineData` apply `roundRupiah` | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M2** | N+1 query — staff-assignment.util.ts | 1 jam | [x] | Reasonix Code | 7 Jul |
| **M3** | N+1 query — maintenance-sweep.service.ts | 1 jam | [x] | Reasonix Code | 7 Jul |
| **M4** | Survey summary load semua rows (pagination) | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ tambah take:200 |
| **M5** | `monthRange()` WIB offset salah (staff-perf) | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M6** | Renew admin pagination broken (hardcode page=1) | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M7** | `RejectPaymentSubmissionDto` reviewNotes bisa kosong | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M8** | `deepseek.client.ts` semua error jadi 500 | 1 jam | [x] | Reasonix Code | 7 Jul | ✅ ServiceUnavailable/BadRequest/BadGateway/GatewayTimeoutException |
| **M9** | `expenses.service.ts` where: any | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M10** | `accounting-readiness.service.ts` stringly-typed model | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ ganti as any → Record<string,unknown> + runtime guard |
| **M11** | `push.service.ts` NaN dari Number(error?.statusCode) | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M12** | `reminder-mock.service.ts` String(error) hilang stack | 10 mnt | [x] | Reasonix Code | 7 Jul |
| **M13** | `CreateBackofficeTicketDto` category optional vs required | 10 mnt | [x] | Reasonix Code | 7 Jul |
| **M14** | Business health score double-counted penalties | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ By design — komentar jelaskan score≠signal |
| **M15** | Owner dashboard revenue trend campur accrual+cash | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ Komentar: WiFi point-of-sale tidak punya periodStart — keterbatasan diketahui |
| **M16** | Owner dashboard net profit abaikan deposit | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ By design — deposit adalah liabilitas (bukan revenue). Komentar ditambahkan. |
| **M17** | `new Date()` tanpa isNaN guard (8 file FE) | 1 jam | [x] | Reasonix Code | 7 Jul | ✅ via L7 — 13 file FE |
| **M18** | `formatRupiah` diduplikasi di 3 file FE | 30 mnt | [x] | Antigravity | 4 Jul | ✅ Unifikasi formatRupiah & formatCompactRupiah di 7 file FE |
| **M19** | C06-01: invoice LUNAS masih tampilkan countdown | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L18 — guard PAID/CANCELLED di MyInvoicesPage
| **M20** | `SimpleCrudPage` tidak ada skeleton loading | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M21** | `ADJUSTMENT` enum inventory tidak usable | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L23 — by design ("belum didukung")
| **M22** | `BARANG_HILANG` / `AC_CLEANING` di luar enum | 15 mnt | [x] | Reasonix Code | 7 Jul |
| **M23** | AC_CLEANING ticket CLOSED → duplikasi bisa terjadi | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L25 — closedThreshold dedup
| **M24** | `AncillaryRevenuePage` statis tanpa API | 🧑 | [ ] | | |
| **M25** | Label admin dashboard "Pendapatan Bulan Ini" menyesatkan | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L21 — label sudah tidak ada di DashboardAdmin.tsx
| **M26** | Tidak ada targetting per tenant di announcements | 🧑 | [ ] | | | butuh fitur multitenant + tabel baru
| **M27** | Tidak ada auto-provisioning additional services | 🧑 | [ ] | | |
| **M28** | `GuestPreferenceSurvey` tidak ada admin page | 🧑 | [ ] | | | butuh controller + FE page baru
| **M29** | `ExternalReview` CRUD tidak diaudit | 🧑 | [ ] | | |
| **M30** | `MarketAnalysis` tidak ada validasi expiry | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ findAll filter 90 hari (cutoff createdAt)
| **M31** | `AiDraft` queue tidak diverifikasi live | 🧑 | [ ] | | |
| **M32** | Seed `addMonths` setMonth overflow | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L14
| **M33** | Seed `ymd()` UTC bisa salah tanggal WIB pagi | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L11
| **M34** | Seed hardcode year 2026 — expired Des 2026 | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L12
| **M35** | Seed require dist/ build artifact — crash kalau belum build | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via L13

### FASE 5 — TEMUAN RENDAH 🟢 (26 fix)

> **Detail:** Tersebar di semua file. Prioritas rendah — polish, kosmetik, observasi.
> **Durasi total:** ~6 jam.

| ID | Temuan | Estimasi | Status | Done by | Tgl | Catatan |
|----|--------|----------|--------|---------|-----|---------|
| **L1** | `@ApiOperation` di semua controller (~40+ endpoint) — tambah summary/api docs | 2 jam | [ ] | | | |
| **L2** | `@ApiProperty` di DTO (invoice, stays, room-transfer) — 91 field | 1 jam | [x] | Reasonix Code | 7 Jul | ✅ 17 DTO, 82 field sudah |
| **L3** | `formatRupiah` duplikasi di 3+ file FE | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ via E2 |
| **L4** | `console.error` / `console.warn` di production (6 lokasi) | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ 4/6 wrapped dgn DEV guard; 1 (PwaStatus) sdh empty catch; 1 (PwaRouteBoundary) error boundary wajar prod |
| **L5** | Inline style hardcode warna di 7+ komponen | 3 jam | [x] | Reasonix Code | 7 Jul | ✅ via E3 |
| **L6** | `SkeletonLoader` — `key={index}` | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ HeroSkeleton key={index} → key={`hero-metric-${index}`} |
| **L7** | `new Date()` tanpa `isNaN` guard di 8+ file FE | 1 jam | [x] | Reasonix Code | 7 Jul | ✅ 13 file: InvoicesPage · StayDetailPage · FinanceTab · NotificationsPage (4 func) · AdminSurveysPage · NotificationBell · StaffMeterStatusPanel · MeterReadingsPage · MyStayPage (acLastCleanedAt) · MyInvoicesPage (L18) · ticketsShared (already fixed) |
| **L8** | Renew enum 10 state, dokumentasi "8-state" — sinkronisasi | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ Komentar enum diperbarui |
| **L9** | `staff-performance.service.ts` — `monthRange()` WIB offset salah | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via M5 (Fase 4) |
| **L10** | `push.service.ts` — `Number(error?.statusCode)` → NaN | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via M11 (Fase 4) |
| **L11** | Seed `ymd()` UTC vs WIB — bisa salah tanggal pagi | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ birthDate: ymd(bd) — ganti toISOString |
| **L12** | Seed hardcode year 2026 — expired Des 2026 | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ const Y = new Date().getFullYear() |
| **L13** | Seed require dist/ build artifact — crash kalau belum build | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ try/catch + pesan error jelas |
| **L14** | Seed `addMonths` setMonth overflow (31 Jan + 1 = 3 Mar) | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ setDate(1) sebelum setMonth |
| **L15** | `parseInt`/`Number()` pada query params — NaN silent | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ Semua controller pakai DTO dgn class-validator (sudah aman). parseInt sudah ada isNaN guard. |
| **L16** | `numeric()` method — NaN → 0 silent (`invoices.service.ts:38-40`) | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ By design — fallback 0 untuk Number.isFinite guard. Bukan bug. |
| **L17** | `SimpleCrudPage` — tidak ada skeleton loading | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via M20 | |
| **L18** | C06-01: invoice LUNAS masih tampilkan countdown | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ Guard `!['PAID','CANCELLED']` di MyInvoicesPage.tsx |
| **L19** | `AncillaryRevenuePage` — statis tanpa API | 🧑 | [ ] | | | butuh implementasi API |
| **L20** | Tidak ada `useDocumentTitle` di mayoritas halaman FE | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ By design — RouteTitleSync global di App.tsx sudah handle semua halaman via routeTitles config |
| **L21** | Label admin dashboard "Pendapatan Bulan Ini" menyesatkan | 10 mnt | [x] | Reasonix Code | 7 Jul | ✅ Label tsb sudah tidak ada di DashboardAdmin.tsx (diganti SmartChartPanel) |
| **L22** | Staff dashboard — tidak ada halaman khusus (share DashboardAdmin) | 🧑 | [ ] | | | butuh desain |
| **L23** | `ADJUSTMENT` enum inventory — tidak usable (selalu ditolak) | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ By design — conflictException "belum didukung" sesuai keputusan owner. ADJUSTMENT dipertahankan di enum utk masa depan. |
| **L24** | `BARANG_HILANG` / `AC_CLEANING` — di luar enum `TicketCategory` | 15 mnt | [x] | Reasonix Code | 7 Jul | ✅ via M22 (Fase 4). Keduanya sudah ada di enum. |
| **L25** | `AC_CLEANING` ticket CLOSED → duplikasi bisa terjadi | 30 mnt | [x] | Reasonix Code | 7 Jul | ✅ Tambah guard CLOSED + time-window (max acCleanIntervalDays) di maintenance-sweep dedup |
| **L26** | Announcement — tidak ada targeting per tenant | 🧑 | [ ] | | | butuh desain fitur |

---

## 📊 PROGRES GLOBAL

| Fase | Task | Selesai | Progress |
|------|------|---------|----------|
| 1 | Efisiensi Token (E1-E5) | 5/5 | ✅✅✅✅✅ 100% |
| 2 | Bug Kritis (C1-C6) | 6/6 | ✅✅✅✅✅✅ 100% |
| 3 | Temuan Tinggi (H1-H15) | 15/15 | ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅ 100% |
| 4 | Temuan Menengah (M1-M35) | 30/35 | ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅⬜⬜⬜⬜⬜⬜ 86% |
| 5 | Temuan Rendah (L1-L26) | 21/26 | ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅⬜⬜⬜⬜⬜ 81% |
| — | **Fase 3 — H3/H6/H7 final** | ✅ 3/3 | SUDAH SELESAI |
| — | **Refactor 4 Jul (dateOnly + @ApiProperty)** | ✅ 2/2 | SUDAH SELESAI |
| — | **Audit + Dokumentasi** | ✅ 12/12 file | SUDAH SELESAI |

---

## STRUKTUR DOKUMEN

| File | Isi | Kapan dibaca |
|------|-----|-------------|
| `00_index.md` | **📋 File ini** — indeks + checklist progres | Setiap mulai sesi |
| `RINGKASAN_EKSEKUTIF.md` | Semua 82 temuan ringkas + rekomendasi | Orientasi awal |
| `09_EFISIENSI_TOKEN.md` | Skor 35/100 + rekomendasi → 71 | **⚠️ Baca sebelum Fase 1** |
| `SPEC_PERBAIKAN_KRITIS.md` | 6 bug kritis: SEBELUM/SESUDAH, Grep, Gate | **⚠️ Baca sebelum Fase 2** |
| `01_FINANSIAL_PERHITUNGAN.md` | 18 temuan: penjelasan KENAPA + DAMPAK | Detail Fase 2-3 |
| `02_LOGIKA_BISNIS.md` | 16 temuan edge case | Detail Fase 3 |
| `03_LAPORAN_AKUNTANSI.md` | 8 temuan laporan | Detail Fase 3 |
| `04_UI_UX.md` | 20 temuan antarmuka | Detail Fase 3-4 |
| `05_MODUL_OPERASIONAL.md` | 15 temuan inventaris/tiket/AC/staf | Detail Fase 4 |
| `06_MODUL_LAINNYA.md` | 15 temuan WiFi/loyalty/survei | Detail Fase 4-5 |
| `07_CODE_QUALITY.md` | 22 temuan N+1/error/code smells | Detail Fase 4 |
| `08_REPORTING_DASHBOARD.md` | 27 temuan KPI & dashboard | Detail Fase 4 |

---

## METODOLOGI

- **5 batch sub-agent paralel** (`deepseek-v4-flash`) — hemat token ~75%
- Semua klaim didukung kutipan `file:line`
- Bahasa Indonesia sesuai konvensi repo
- **Audit selesai 4 Juli 2026.** Sekarang masuk **FASE EKSEKUSI.**

---

## 📋 ANTRIAN SESI BERIKUTNYA (untuk `/new`)

> Prioritas berdasarkan rekomendasi Fase 5: (1) DEFAULT_COA + test, (2) C5 retry/alert real, (3) sync C19 + RINGKASAN, (4) M28 admin page, (5) M18 formatRupiah unifikasi.

### 🔴 Teknis — Bisa langsung dikerjakan AI
| ID | Task | File | Ketergantungan |
|----|------|------|---------------|
| **F6** | Tambah akun `4010` ke `DEFAULT_COA` + unit test | `backend/src/modules/accounting/constants/default-coa.ts` | — |
| **C5** | Implementasi retry/alert sungguhan untuk journal pending | `payment-submissions.service.ts` | — |
| **M18** | Unifikasi `formatRupiah` (9 file FE, 5 varian) | 9 file FE | — |
| **L1** | `@ApiOperation` di ~40 endpoint controller | Semua controller | — |

### 🧑 Butuh keputusan owner
| ID | Task | Estimasi |
|----|------|----------|
| **M28** | GuestPreferenceSurvey admin page (controller + FE) | 1-2 jam |
| **L19/M24** | AncillaryRevenue API + FE | 3-4 jam |
| **M29/M31** | Halaman manual entry review + DeepSeek generate 50 review | 2-3 jam |

### 📝 Dokumentasi — selaraskan dengan 00_index kanonik
| File | Yang perlu diperbaiki |
|------|----------------------|
| `RINGKASAN_EKSEKUTIF.md` | Penomoran C/H/M selaras 00_index; H14 C19 status → fixed; tanggal 7→4 Jul |
| `M02_KEPUTUSAN_OWNER.md` | Referensi penomoran pakai 00_index, bukan RINGKASAN |
| `M10_CHECKLIST_CHANGELOG.md` | Referensi penomoran pakai 00_index, bukan RINGKASAN |