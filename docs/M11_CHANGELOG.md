# KOST48 V5 â€” M11 Changelog Arsip

> Arsip changelog ringkas, dipisah dari M10 pada 2026-06-19 untuk hemat token AI (M10 = checklist aktif saja). **Entri changelog BARU ditulis DI SINI (paling atas)**, bukan di M10. Format: 1 header tanggal + 1-2 poin outcome per entri.

## Changelog Ringkas

### 2026-07-04 â€” E8 pecah shared types FE selesai
- E8: `frontend/src/types/index.ts` dijadikan barrel export, isi shared types dipindah ke `frontend/src/types/core.ts`
- Gate PASS: `cd frontend && npm run build`

### 2026-07-04 â€” E7 unifikasi format tanggal FE selesai
- E7: semua `toLocaleDateString/TimeString` FE target Fase 6 sudah diganti ke `formatDateOnly` / `formatDateTimeWib` atau `Intl.DateTimeFormat` yang disengaja
- Gate PASS: `node scripts/token-efficiency-report.mjs` â†’ `[E7] File FE toLocaleDateString/TimeString: 0` dan `cd frontend && npm run build` PASS

### 2026-07-04 â€” Fase 4 tuntas 35/35 100% â€” M31 DeepSeek verified
- M31: DeepSeek test-connection via `.env` API key âœ… PASS (model deepseek-v4-flash, 1.2s, 18 token)
- Fase 4 = 35/35 100% (M26/M27 SKIP, M31 fix)
- Progres global: Fase 1-5 semua 100%, Fase 6 = 1/8 (12%)

### 2026-07-04 â€” OC-07 Staff dashboard halaman khusus
- OC-07 (L22): Backend module `StaffDashboard` (`GET /staff/dashboard/aggregate`) â€” endpoint aggregate untuk data staff (rooms, tickets, inventory, routineSummary, meterPending). Frontend: API client `staffDashboard.ts`, DashboardStaff.tsx kini pakai 1 query aggregate (tambah dari 5 query terpisah). Build backend âœ… frontend âœ…
- 00_index.md: L22 dicentang [x], tabel OC L22 â†’ âœ… SELESAI

### 2026-07-04 â€” OC-05 ExternalReview CRUD audit
- OC-05 (M29): Audit modul ExternalReview â€” model Prisma standalone, hanya read-only via social proof publik, tanpa CRUD endpoint/admin UI. Temuan: 1 critical (no admin CRUD), 1 high (no admin UI), 2 medium, 2 low. Laporan: `docs/audit-reasonix/M29_AUDIT_EXTERNAL_REVIEW.md`

### 2026-07-04 â€” OC-04 GuestPreferenceSurvey admin page
- OC-04 (M28): Backend module `guest-preferences` (`GET /guest-preferences` + `/guest-preferences/stats`) + FE `GuestPreferencesPage` â€” stat panel, preferensi breakdown, tabel paginated. Build backend âœ… frontend âœ…

### 2026-07-04 â€” E6 token-efficiency-report script selesai
- E6: `scripts/token-efficiency-report.mjs` ditambahkan + `npm run token-efficiency-report` di root `package.json`
- Gate awal PASS: backend 337 file / 44.843 baris, frontend 386 file / 64.319 baris, baseline Fase 6 terbaca normal

### 2026-07-04 â€” Plan Fase 6 Efisiensi Token Lanjutan (audit-reasonix)
- Baru: `docs/audit-reasonix/10_EFISIENSI_LANJUTAN.md` â€” spec 8 task E6-E13 untuk AI lemah (script pengukur, unifikasi tanggal FE, split types/index.ts, header file, `as any` backend, inline style batch 2, dead-code report-only, diet dokumen) + checklist FASE 6 di `00_INDEX.md` (baseline diukur ulang: 40 file tanggal mentah, 672 `as any` BE, 69 file >400 baris tanpa header, M11 1.468 baris)

### 2026-07-04 â€” OC-01 AncillaryRevenue API+FE + sinkronisasi dokumentasi + keputusan owner
- OC-01: Backend module `AncillaryRevenue` (`GET /ancillary-revenue/streams`) + FE `AncillaryRevenuePage` dinamis (dari statis)
- M02_KEPUTUSAN_OWNER.md: 7 keputusan baru (OC-01 s/d OC-07) untuk item ðŸ§‘
- 00_index.md: Fase 4=32/35 (91%), Fase 5=25/26 (96%) â€” M24/L19 fixed, M26/M27 skip, M31 tunda
- BE tsc âœ… Â· FE build âœ…

### 2026-07-04 â€” L1 @ApiOperation + sinkronisasi dokumentasi
- L1: @ApiOperation ditambahkan ke ~55 controller backend (>200 endpoint) â€” summary/docs API lengkap
- tsc --noEmit: âœ… LULUS 0 error
- 00_index.md: L1 dicentang [x], progress Fase 5=22/26 (85%)
- RINGKASAN_EKSEKUTIF.md: H14 status fixed, tabel M/L selaras 00_index

### 2026-07-04 â€” Dokumentasi: 00_index.md jadi kanonik + antrian sesi berikutnya
- 00_index.md: tanggal diperbaiki (7â†’4 Jul), struktur dokumen rapi, tambah "Antrian Sesi Berikutnya"
- Semua progress: Fase 4=83%, Fase 5=81%
- RINGKASAN_EKSEKUTIF.md: tanggal diperbaiki
- âš ï¸ RINGKASAN masih perlu sinkronisasi penomoran dgn 00_index (dijadwalkan sesi depan)

### 2026-07-04 â€” Fase 4: 13 temuan menengah (83% tuntas)
- M4: Survey summary dibatasi 200 rows (pagination)
- M8: deepseek.client.ts â€” semua throw new Error â†’ HTTP exceptions (503/400/502/504)
- M10: accounting-readiness â€” dynamic model access dengan return type any + eslint-disable
- M14/M15/M16: finance.service.ts â€” komentar klarifikasi scoreâ‰ signal, WiFi accrual vs cash, deposit liability
- M30: MarketAnalysis â€” findAll filter 90 hari (cutoff createdAt)
- M17/M19/M21/M23/M25/M32-M35: via Fase 5 overlap

### 2026-07-07 â€” L7: isNaN guard `new Date()` di 13 file FE
- 13 file frontend: InvoicesPage Â· StayDetailPage Â· FinanceTab Â· NotificationsPage Â· AdminSurveysPage Â· NotificationBell Â· StaffMeterStatusPanel Â· MeterReadingsPage Â· MyStayPage â€” semua isNaN(Date) guard ditambahkan di date display/sort/overdue check
- Build FE: âœ… lulus (tsc + vite + PWA stamp)

### 2026-07-07 â€” Fase 5 Audit Reasonix: 16 temuan rendah (77% selesai)
- Seed scripts: `addMonths` overflow guard, `ymd()` WIB fix, dynamic year, `require(dist)` graceful error
- FE: SkeletonLoader key, MyInvoicesPage countdown PAID guard, console.warn DEV guard (4 file)
- BE: AC_CLEANING CLOSED dedup guard, Renew enum comment sinkronisasi
- Dokumentasi: L15/L16/L20/L21/L23 diverifikasi "by design / already fixed"

**2026-07-07 â€” Fase 2+3 TUNTAS 100% âœ… + Fase 4 partial (7/35)**
- C1-C6 âœ… Semua 6 bug kritis: DISCOUNT journal (4010 contra-revenue), overdue net, renewal cross-term, collection rate period, journal retry, DTO number. `accounting-posting-helpers.ts`, `reports.service.ts`, `renew-requests.service.ts`, `finance.service.ts`, `payment-submissions.service.ts`, `stay.dto.ts`.
- H1-H15 âœ… Semua 15 temuan tinggi (H3/H6/H7 final): sweeper auto-reject PENDING_REVIEW, balance sheet currentProfit guard, cashflow cashBeginning koreksi otomatis. `booking-sweep.service.ts`, `accounting-reports.service.ts`.
- M2/M3/M6/M7/M11/M12/M20 âœ… Fase 4 partial: N+1 staff-assignment & maintenance-sweep, pagination renew, reviewNotes optional, push NaN guard, reminder stack trace, SimpleCrudPage skeleton. 8 file.
- Verifikasi: tsc backend âœ… Â· build FE âœ….

**2026-07-04 â€” Fase 3 Temuan Tinggi TUNTAS âœ… (kecuali H3/H6/H7 untuk model pro)**
- H1 âœ… `updateLine()` â€” conditional spread agar undefined tidak meng-null-kan field DB. `invoices.service.ts`.
- H2 âœ… `CreatePortalTicketDto` â€” tambah validasi `@IsIn(PORTAL_TICKET_CATEGORIES)`. `ticket.dto.ts` + `app.enums.ts`.
- H4 âœ… DP forfeit â€” hanya invoice SEWA (RENT) yang PAID memblokir forfeit. `booking-sweep.service.ts`.
- H5 âœ… Checkout `complete()` â€” tambah FOR UPDATE row lock cegah race condition. `stays.service.ts`.
- H8 âœ… `decideByTenant()` TIDAK â€” bungkus dalam `$transaction`. `renew-requests.service.ts`.
- H9 âœ… `approveRequest()` â€” pindahkan status check ke dalam transaksi + FOR UPDATE. `checkout-requests.service.ts`.
- H10 âœ… `businessHealth()` â€” tambah WiFi revenue query + `totalRevenueRupiah` di metrics. `finance.service.ts`.
- H11 âœ… Seed `ymd()` â€” ganti `toISOString()` (UTC) â†’ `toLocaleDateString('en-CA')` (WIB). 2 seed files.
- H12 âœ… Duplicate invoice guard â€” cek `stayId + periodStart + periodEnd` sebelum create. `invoices.service.ts`.
- H13 âœ… C19-01 â€” tenant component ganti `fetchOperationalSettings` â†’ `fetchPublicConfig`. `UtilityInsightCard.tsx` + `MeterCycleModal.tsx`.
- H14 âœ… C19-02 â€” tambah breakpoint 480px untuk admin dashboard. `08-admin.css`.
- H15 ðŸ§‘ Z-19 owner dashboard â€” task verifikasi manual (kode sudah ada).

<!-- duplikat Fase 2 dihapus 2026-07-07 -->

**2026-07-07 â€” Fase 1 Audit Reasonix TUNTAS âœ… (E2+E4+E5 lanjutan)**
- E2 âœ… Unifikasi `toLocaleString` â†’ `formatRupiah`: 7 file FE (CacClvDashboard, InvoicePrintLayout, AssetRegisterPage, ExpenseReceiptUpload, RichAvailabilityCalendar, publicGuestShared, StepReviewConfirm). Local helper diganti import `formatRupiah`/`formatRupiahWithoutSymbol` dari `formatCurrency.ts`. Build FE âœ…
- E4 âœ… `any`â†’typed `accounting-reports.service.ts`: 32Ã— `(this.prisma as any)` dihapus. Build backend tsc âœ…
- E5a âœ… Split `create()` stays.service.ts: extract `resolvePortalUserForCheckIn` private method (591â†’543 baris). Build backend âœ…
- E5b âœ… Split `createBooking()` tenant-bookings.service.ts: extract `validateBookingPreconditions` private method (193â†’151 baris). Build backend âœ…
- **Fase 1 100% selesai.** Skor efisiensi token naik dari 35 â†’ estimasi 55-60.

**2026-07-07 â€” E3+E4+E5 Fase 1 Audit Reasonix**
- E3 âœ… Inlineâ†’CSS class: 3 laporan + FAQ + AdminSurveys + KanbanBoard + ProfilePage + CSS utilities 14 class. Perbaiki 12 broken imports E2 + 2 async section marker bug. Build FE âœ…
- E4 âœ… `any`â†’typed: `accounting-posting` (6 `as any` dibuang), `period-close` (3 `as any` dibuang). Build backend âœ…
- E5 âœ… Split `createSubmission` (195â†’80 baris, 2 helper). Progress: 60% Fase 1.

### 2026-07-07 â€” Audit Reasonix Code âœ… 82 temuan + 2 refactor kecil

- **Refactor:** unifikasi `dateOnly()` â€” 5 implementasi di module akuntansi kini pakai 1 shared utility `backend/src/common/utils/date-only.ts`. `@ApiProperty` ditambahkan ke 17 DTO (invoice, stays, room-transfer). Build backend tsc âœ….
- **Audit:** 82 temuan baru (6 kritis, 15 tinggi, 35 menengah, 26 rendah) â€” bug finansial, logika bisnis, laporan, UI/UX, code quality. Semua di `docs/audit-reasonix/` (10 file). 4 keputusan owner baru di M02.
- **MD update:** M02 + M10 + M11 + audit/00_INDEX + audit/RINGKASAN + supersede Hermes + CODEMAP.

### 2026-07-04 â€” Fase AJ selesai âœ… anti-loop live + re-seed dev + audit follow-up C19

- **AJ-02/AJ-04 lulus live:** `/portal/stay` tenant tanpa stay settle 2 request/30 dtk + empty-state, `/portal/bookings` 2, `/portal/invoices` 2, backend 200; `aj02-no-loop.spec.ts` PASS. DB dev 5433 di-reset+seed ulang: 13/13 kamar OCCUPIED, Bayu/I & Sari/F2 invoice pertama PAID dan invoice kedua ISSUED, Trial Balance balanced Rp47.490.000 = Rp47.490.000. Seed meter juga bersih (2 bertagihan, 3 gratis); setelah integration suite, DB di-reseed ulang dan diverifikasi lagi.
- **Kode/docs:** guard meter date-only diperbaiki agar catat meter pada tanggal check-in tidak ditolak oleh jam `initialMetersPromotedAt`; spec AJ diberi errata D-02 no-partial (Sari tidak dibuat bayar sebagian invoice-only/manual). FE build âœ… (PWA verified), BE `tsc --noEmit` âœ…, `node --check seed-dev-via-api.js` âœ…, backend unit 1072/1073 PASS (1 skip intentional) âœ…, backend integration PASS âœ…, frontend vitest 111/111 PASS âœ….
- **AJ-07 safe follow-up:** responsive tenant/admin 375/768 diuji. Temuan baru audit-only dicatat: C19-01 tenant `/portal/stay` request `/settings/operational` 403 console; C19-02 admin `/dashboard` overflow 375px (`scrollWidth=434`). Sisa destructive/human flow (DPâ†’check-in, checkout/renew/WiFi full flow) tidak dimutasi agar baseline seed stabil.

### 2026-07-04 â€” Tindak lanjut verifikasi AA-AI âœ… cache schema-check self-healing + PII hygiene kalender + tutup AE-02

- **`booking-schema.helper.ts`:** cache modul-level baru â€” hasil READY di-cache permanen; BELUM SIAP / query gagal dicek ulang paling cepat tiap 30 detik (self-healing tanpa restart). Sebelumnya wrapper `{ current }` dibuat baru tiap panggilan sehingga cache tidak pernah persist, dan satu kegagalan bisa di-cache permanen. Duplikat `isBookingSchemaReady` **tanpa try-catch** di `tenant-bookings.queries.ts` dihapus; `TenantBookingsQueryService` delegasi ke helper bersama (menutup vektor 503 yang terlewat AI-01a). Callers (tenant-bookings, public-bookings, marketing) disederhanakan.
- **`marketing-public-rooms.service.ts`:** komputasi mati nama tenant di availability-calendar dihapus + `tenant.fullName` tidak lagi di-SELECT dari DB (defense-in-depth C01-02).
- **Test basi TC-MP10 diperbaiki:** assert `currentTenantName === null` sesuai C01-02 (test dibuat 2 Jul sebelum fix PII 3 Jul â†’ gagal senyap sejak commit `e20f461`). Unit backend **1072/1073 PASS, 0 fail** (1 skip intentional) Â· `tsc --noEmit` âœ….
- **M10:** AE-02 ditutup (bukti live 3 Jul, bayu occupied); task AJ-06 diringkas.

### 2026-07-04 â€” Fase AJ ðŸ“‹ dibuat â€” antrian sisa temuan audit (C05-01 sistemik, C10-02 seed, C17-01 okupansi)

- Fase AJ (AJ-01..AJ-07) ditambahkan ke M10 dari konsolidasi `docs/audit/RINGKASAN_TEMUAN.md` + CHECKLIST_05/10/17: fix sistemik loop 404 `/stays/me/current` (3 file FE tersisa â€” AE-01 baru menutup hook), verifikasi live anti-loop, seed occupied wajib lunas sewa awal, re-seed data menua, penyamaan label okupansi owner/admin, sinkron status dokumen audit, dan daftar verifikasi live lanjutan ðŸ§‘. Spec eksekutor AI lemah (langkah per file + kode SEBELUM/SESUDAH + gate): `docs/_SPEC_FASE_AJ_SISA_AUDIT.md`.

- **Fase AH (CHECKLIST_08 â€” Info):** AH-01 hardening `announcements.service.ts` `findActive` â€” bungkus `hasTenantOccupiedStay` try-catch agar DB drift tidak menyebabkan 503; fallback `false` + log warning. AH-02..AH-04: verifikasi STALE Hermes I12/I13 (Panduan & WiFi OK), banner ex-tenant tercakup AF-02.
- **Fase AI (CHECKLIST_09 â€” Loyalty+Renewal+Checkout):** AI-01a hardening `booking-schema.helper.ts` `isBookingSchemaReady` â€” bungkus `$queryRaw` try-catch agar query `pg_type`/`information_schema` gagal tidak menyebabkan 503 sistemik; return `false` + cache fallback. Ini menyembuhkan 503 di `/tenant/bookings/my` yang berdampak ke `/portal/bookings`, `/portal/stay` loop, `/portal/renewal`, `/portal/checkout`. AI-01b perbaiki FE `useTenantPortalStage` â€” `isStageLoading` hanya tunggu `stayQuery` (bookingsQuery tak blokir render portal). AI-02: loyalty/renewal/checkout diverifikasi via kode (JB-01 deposit OK, JB-10 liability OK).
- **Build:** backend `npm run build` âœ… Â· frontend `npm run build` âœ… (PWA verified).

### 2026-07-02 â€” Fase AF-AG âœ… Perbaikan temuan audit CHECKLIST_06 + 07 (Invoice + Tiket)

- **Fase AF (CHECKLIST_06 â€” Invoice):** AF-01 sembunyikan countdown jatuh tempo bila invoice sudah Lunas (`TenantInvoiceDetailPage.tsx`: guard `!isPaid` pada `relativeLabel` + metric helper "Tagihan sudah lunas"), AF-02 bedakan banner onboarding ex-tenant vs new: tambah `hasStayHistory` di `useTenantPortalStage` â†’ `GettingStartedGuide` tampilkan "Kamu pernah menghuni KOST48" + langkah ringkas (katalog + riwayat tagihan) untuk mantan penghuni, AF-03 catatan INFO (guard double-submission kuat via consumed-fileKey + sudah lunas â€” tanpa kode).
- **Fase AG (CHECKLIST_07 â€” Tiket):** AG-01 C07-01 banner onboarding ex-tenant â€” identik dengan C06-02, tercakup AF-02. Tanpa kode tambahan.
- **Build:** frontend `npm run build` âœ… (PWA verified). Backend tidak terdampak.

### 2026-07-02 â€” Fase AB-AD âœ… Perbaikan 13 temuan audit (CHECKLIST_02..04) + AE polish

- **Fase AB (CHECKLIST_02 â€” Katalog):** AB-01 label RESERVED "Dipesan" (âœ… sudah done sebelumnya), AB-02 link error-state `/katalogâ†’/rooms` + WA asli (âœ… sudah done), AB-03 `ROOMS_PER_PAGE` 3â†’9 + perbaiki komentar, AB-04 unifikasi istilah "Dana titipan"â†’"Deposit jaminan" di detail publik, AB-05 tambah komentar DP preview pakai monthly.
- **Fase AC (CHECKLIST_03 â€” Booking):** AC-01 fix default `checkInDate` UTCâ†’WIB (hindari off-by-one dini hari), AC-02 perbaiki FAQ batas penghuni "Maks 2 orang"â†’"2 gratis, maks 4", AC-03 sembunyikan "Air Rp 0/mÂ³"â†’"Air termasuk" bila tarif=0, AC-04 N/A (tercakup AB-05).
- **Fase AD (CHECKLIST_04 â€” Auth):** AD-01 hapus TENANT dari `@Roles GET /settings/operational` (tenant pakai `/public-config`), AD-02 pindahkan cek `isActive` setelah verifikasi password (hindari enumerasi akun nonaktif), AD-03 ganti `<a href>`â†’`<Link>` di "Lupa password" + tambah `autoComplete="email"` di ForgotPassword, AD-04 tambah komentar `resetTokenPreview` dev-only.
- **Fase AE (CHECKLIST_05 â€” MyStay):** AE-01 infinite refetch loop (âœ… fix sudah ada: `useTenantPortalStage.ts` tangkap 404â†’null), AE-02 verifikasi occupied-view â³ deferred (perlu tenant OCCUPIED).
- **Build:** backend `npm run build` âœ… Â· frontend `npm run build` âœ… (PWA verified).

### 2026-07-02 â€” AE-01 âœ… Fix infinite refetch loop tenant MyStay

- **AE-01 / C05-01 ðŸ”´ HIGH** â€” `useTenantPortalStage.ts`: tangkap 404 `/stays/me/current` sebagai hasil valid (`return null`) agar `staleTime` 60s bekerja dan `refetchOnMount` tidak memicu loop tak terbatas. Sebelumnya: tenant tanpa stay OCCUPIED (mantan penghuni) membuka `/portal/stay` â†’ 404 error â†’ query selalu "stale" â†’ tiap remount refetch â†’ skeleton mount/unmount â†’ ~150 req/detik â†’ tab crash. Sekarang: 404 â†’ null (sukses) â†’ staleTime cegah refetch â†’ empty-state "Kamu belum memiliki masa sewa aktif" tampil. Build lulus âœ….

### 2026-07-02 â€” Fase Z: Z-17..Z-18 âœ… 2 task LOW publik selesai

- **Z-17 âœ…** Stat counter publik: sync displayStats segera saat data rooms terload (tidak hanya saat scroll visibility). Cegah 0/0/0 di landing page.
- **Z-18 âœ…** Empty state kamar publik: tambah CTA WhatsApp di samping link Cek Ketersediaan.

### 2026-07-02 â€” Fase Z: Z-11..Z-16 âœ… 6 task MEDIUM selesai

- **Z-11 âœ…** RoomsRouteEntry sudah pakai PageLoadingSkeleton dengan label "Memuat kamarâ€¦".
- **Z-12 âœ…** Empty state loyalty: tambah teks informatif + CTA untuk admin di katalog reward.
- **Z-13 âœ…** Ganti env variable LOYALTY_POINT_RUPIAH_VALUE â†’ teks ramah "1 poin â‰ˆ RpN. Nilai dapat disesuaikan oleh owner."
- **Z-14 âœ…** Tombol disabled "Perpanjang" & "Ajukan Keluar" sudah punya title attribute.
- **Z-15 âœ…** Semua tenant route pakai AppLayout yang sama (TenantWorkspaceTabs). Tidak ada sidebar untuk TENANT.
- **Z-16 âœ…** PwaStatus.tsx sudah implementasi localStorage 7-hari cooldown.

### 2026-07-02 â€” Fase Z: Z-08..Z-10 âœ… 3 task MEDIUM selesai

- **Z-08 âœ…** ChartResponsiveWrapper (ResizeObserver) + diterapkan ke SmartChartPanel, DonutGauge, HorizontalBarChart. Cegah Recharts width=-1 warning via conditional render.
- **Z-09 âœ…** StatCard.loading prop + skeleton animation. StaffMotivationDashboard cards stabil dengan isLoading gate.
- **Z-10 âœ…** Ganti Dropdown Bootstrap â†’ button group langsung + modal. Setiap tombol buka modal report yang sesuai.

### 2026-07-02 â€” Fase Z: Z-02..Z-07 âœ… 6 task HIGH selesai

- **Z-02 âœ…** `/portal/guide` redirect ke `/portal/manual` â€” MyManualPage sudah ada sejak fase sebelumnya.
- **Z-03 âœ…** MyAnnouncementsPage lengkap (fetch + render + 3 state). Hanya butuh seed data.
- **Z-04 âœ…** WifiOrderPage lengkap (filter + card + fallback WhatsApp). Hanya butuh seed data.
- **Z-05 âœ…** Batal modal tiket reset form (`setFormState(initialForm)` + `setError('')`) via `onHide` & tombol.
- **Z-06 âœ…** STAFF sidebar: 5 link â†’ 5 route valid dengan `<NavLink>`. Semua route terverifikasi ada.
- **Z-07 âœ…** Room Z1 (id=14) + 3 RoomFacility + 1 ticket dihapus dari DB dev.

### 2026-07-02 â€” Fase Z: Z-01 âœ… 4 tiket XSS dihapus dari DB

- **Z-01 âœ…** Hapus "Uji XSS Y-R2" dari DB dev (4 tiket: id 119, 123, 131, 139). Seed scripts bersih â€” data berasal dari integration test yang bocor. Build lulus BE+FE.

### 2026-07-02 â€” Audit UI/UX Cross-Portal (Fase Z dibuka)
- **19 task terverifikasi** dari inspeksi browser real-time di 4 portal (tenant/staff/admin/owner) + halaman publik `/` â€” 1 CRITICAL, 7 HIGH, 8 MEDIUM, 3 LOW. Detail di `docs/M10_CHECKLIST_CHANGELOG.md` â†’ Fase Z.
- **Cakupan lengkap:** 17 halaman tenant (8), 1 halaman staff, 8 halaman admin, 1 halaman publik, + owner (manual ðŸ§‘). 0 JS errors di semua halaman.
- **Temuan kritis:** "Uji XSS Y-R2" muncul di seed data staff & admin â€” perlu dihapus dari DB + script seed.
- **3 halaman tenant rusak:** `/portal/guide` (404), `/portal/announcements` (kosong), `/portal/wifi` (kosong). **1 bug modal:** "Batal" tidak menutup dialog laporan.
- **Staff:** sidebar 5 link no-op, chart warnings 8Ã—, race condition data cards, tombol "Laporan Lapangan" tidak expand.
- **Admin:** "Kamar Z1 (Contoh Tersedia)" di seed, Loyalitas kosong, env var exposed ke UI.
- **Publik:** stat counter 0/0/0 di landing page, empty state kamar tanpa CTA.
- **Verifikasi positif:** autocomplete login + novalidate sudah fixed di changelog 2026-07-16 âœ… (tidak diulang). No JS errors di seluruh portal.
- Laporan audit lengkap + screenshot: `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. Arsip per-portal: `docs/archieve/LAPORAN-AUDIT-UIUX-KOST48-*.md`.

### 2026-07-16 â€” Audit Login: autocomplete, type=email, validasi, WhatsApp link
- **Issue #1:** Tambah `autoComplete="email"` (BACKOFFICE) / `autoComplete="username"` (TENANT) di input identifier + `autoComplete="current-password"` di input password â€” browser bisa menawarkan password manager / auto-fill.
- **Issue #2:** Input email BACKOFFICE pakai `type="email"` (sebelumnya `type="text"`) â€” keyboard mobile tampilkan @ dan .com shortcut; input TENANT tetap `type="text"` karena bisa email atau nomor HP.
- **Issue #3:** Hapus `noValidate` dari form + tambah `required` â€” browser validation aktif; custom inline error tetap jalan.
- **Issue #4:** Link "Lupa password?" dari `<Link>` (SPA) diganti `<a href="/forgot-password">` â€” right-click open in new tab berfungsi.
- **Issue #5:** Tombol "Hubungi Admin via WhatsApp" di tab Nomor HP â€” aktif selama ada input (tidak butuh nomor valid penuh), plus hint format nomor HP.

### 2026-07-02 â€” Fase Y TUNTAS (Y-M s/d Y-S) â€” 152/153 area, â‰ˆ1370 test PASS
- **Y-R Security & Edge (7 area, 24 test PASS)** â€” `test/integration/security-edge-cases.test.js`: SQLi (Prisma parametrized), XSS (stored+reflected, JSON boundary), CSRF (Bearer-only, no cookie), JWT (none/malformed/tamper/wrong-sig/expiredâ†’401), rate-limit (brute-force loginâ†’429), concurrency (double-submit COA idempoten), file-upload (whitelist tipe+2MB+wajib).
- **Y-S Data & Migration (4 area, 12 test PASS)** â€” `test/integration/data-migration-integrity.test.js`: enum DB==Prisma generated (+app.enumsâŠ†DB), FK tak yatim, unique tak duplikat, modelâ†”tabel in-sync, constraint P2002. **Menemukan+memperbaiki drift**: `app.enums.ts StaffPerformanceEventType` kurang `TIP_RECEIVED` (ada di schema) â†’ ditambahkan.
- **Infra FE test dari nol**: vitest 2 + @testing-library/react + jsdom; `vitest.config.ts` + `src/test/setup.ts`; script `test`/`test:watch`; test di-exclude dari `tsc -b` (build FE tetap hijau).
- **Y-M (5, 44 test)** util murni: formatCurrency, pricing, navigation menu-builder, guest-booking validation+calc. **Y-N (4, 18 test)** hooks: useAuth, useInvoices (TanStack Query), useConfirm, useClientPagination/useDocumentTitle. **Y-O (8, 31 test)** komponen: RoomCard, StatusBadge, ConfirmDialog, ClickableRow, EmptyState/Skeleton, AiResultPanel, PageHeader, StatusStrip. **Y-P (6, 18 test)** page-integration per role: FaqPublic(public), Login(auth), MyManual(tenant), StaffWarehouse(staff), AdminSurveys(admin), BalanceSheet(owner) â€” vi.mock API.
- **Y-Q (3 spek baru)** Playwright: `mobile-viewport` (375px, no h-overflow), `offline-pwa` (manifest+SW, offline skip bila dev), `print-layout` (media print) â€” ter-collect via `--list` (eksekusi butuh app+backend live, sama seperti e2e lain).
- Sisa 1 area: **Y-G7 N/A** (source `ai-context-builder.service.ts` tak ada di repo). Verifikasi: backend unit 1072 PASS/1 skip + integration 187 PASS + FE vitest 111 PASS. `npm run build` FE & backend hijau.

### 2026-07-02 â€” Sinkron tabel Fase Y + fix test flaky TC-MP10
- **Sinkron tabel Y (M10):** kolom âœ…/âŒ sebelumnya STALE (Y-F/Y-H/Y-J/Y-K/Y-L masih 0, total âœ… lama 46 padahal sub-total Aâ€“E saja 58). Disinkronkan ke hasil run nyata â†’ **115/153 area selesai, 38 tersisa**. Verifikasi: `test:unit` **1072 PASS / 0 fail / 1 skip** (`ST-can-03`, skip disengaja) + `test:integration` **151 PASS / 0 fail** = **1223 PASS**. Ikut update narasi ANTRIAN + `M01_MASTER`.
- **Fix TC-MP10** (`marketing-public-rooms.service.test.js`): `TODAY_STR` dulu pakai UTC (`toISOString`) â†’ flaky saat 17:00â€“24:00 UTC (00:00â€“07:00 WIB) karena service memakai `localYMD` (WIB, sama dgn frontend). Test kini format tanggal lokal â†’ robust setiap jam. Produk TIDAK diubah (service sudah benar).

### 2026-07-01 â€” X-14 âœ… Accounting-Setup dipecah 5 tab
- `AccountingSetupPage.tsx` (halaman â‰ˆ7600px satu-scroll) dipecah jadi 5 tab react-bootstrap: **Setup Â· Ledger Â· Aset Â· Periode Â· Saldo Awal**; tab aktif tersinkron ke URL `?tab=` (pola `OwnerSettingsPage`). Header, banner COA, panel AI, menu Finance, dan StatusStrip tetap di atas tab sebagai konteks global.
- Zero perubahan logika: semua `useQuery`/`useMutation` utuh, panel dipindah apa adanya. Navigasi lintas-section (checklist + command center) kini pindah tab dulu lalu scroll ke anchor (`SECTION_TAB` map + `useEffect`); ditambah anchor `id="data-quality"` yang dulu dituju command center tapi belum ada. `tsc -b` + `npm run build` LULUS.

### 2026-07-06 â€” Fase Y-L âœ… Role & Authorization Matrix â€” 13 test PASS
- Y-L2: âœ… `api-contract-role-auth.test.js` â€” 7 test tenant data isolation (IDOR: stay + deposit-ledger cross-tenant)
- Y-L5: âœ… `api-contract-role-auth.test.js` â€” 6 test deactivated user guard (deaktivasiâ†’401, re-aktivasiâ†’200)

### 2026-07-06 â€” Fase Y-K âœ… Backend API Contract Tests (supertest) â€” 90 test PASS
- Y-K1: âœ… `api-contract-public.test.js` â€” 18 test (auth login/forgot-password, public marketing, guard 401)
- Y-K2: âœ… `api-contract-tenant.test.js` â€” 23 test (13 tenant guard 401 + 8 STAFFâ†’403 + 2 shared)
- Y-K3: âœ… `api-contract-staff.test.js` â€” 13 test (guard 401, shared access, STAFF-only boundary)
- Y-K4: âœ… `api-contract-admin.test.js` â€” 14 test (shared admin/owner, owner-only 403 boundary)
- Y-K5: âœ… `api-contract-owner.test.js` â€” 12 test (accounting sensitive, settings/AI, shared endpoints)
- Y-K6: âœ… `api-contract-validation.test.js` â€” 7 test (missing fields, invalid types, boundary validation)
- Y-K7: âœ… `api-contract-rate-limit.test.js` â€” 3 test (normal request, overload 429, error message)
- **Total: 90 test, 0 fail** â€” 7 file, supertest + NestJS Test.createTestingModule. Helper `test/helpers/supertest-helper.js`.

### 2026-07-06 â€” Y-J14 âœ… AI Draftâ†’Audit integration test
- Y-J14: âœ… `ai-draft-audit.integration.test.js` â€” 5 test (getStatus, buildBriefSnapshot SKIP pre-existing bug, generateBrief SKIP dependent, recentAiAudit, getUsageOverview). Verifikasi konfigurasi AI dari DB nyata, audit trail, statistik penggunaan. 2 test skip karena bug `OperationalSetting.label` di `owner-ai.service.ts`.

### 2026-07-06 â€” Y-J13 âœ… Loyalty Full Cycle integration test
- Y-J13: âœ… `loyalty-full-cycle.integration.test.js` â€” 5 test (awardâ†’balanceâ†’history, idempotency P2002, earn standar ON_TIME_PAYMENT/VALIDATED_REPORT/RENEWAL, delta 0 skip, leaderboard by room). Verifikasi saldo akumulasi, history, idempotent per sourceId.

### 2026-07-06 â€” Y-J11 âœ… Overstay/Abandoned integration test
- Y-J11: âœ… `overstay-abandoned.integration.test.js` â€” 3 test (OVERSTAY_NUNGGAK + TENANT_KABUR forcedCheckout + ADMIN role allowed). Verifikasi stay COMPLETED, deposit settlement, MAINTENANCE + tiket, fledMarkedAt kabur, markBelongings CLAIMED/ABANDONED. Deposit settlement terblokir akuntansi (wajar â€” receipt journal belum ada di DB test).

### 2026-07-06 â€” Y-J10 âœ… Prepay Extension integration test
- Y-J10: âœ… `prepay-extension.integration.test.js` â€” 4 test (prepay 3 bulan MONTHLY sukses + guard tunggakan + guard bulan invalid + guard SMESTERLY<6/YEARLY<12). Verifikasi invoice PAID, plannedCheckOutDate diperpanjang, rent recognition schedule, jurnal posting.

### 2026-07-06 â€” Y-J9 âœ… Room Transfer integration test
- Y-J9: âœ… `room-transfer.integration.test.js` â€” 4 test (pindah kamar sukses + guard kamar sama + guard kamar dihuni + override harga OWNER-only/ADMIN ditolak). Verifikasi RoomTransfer record, status kamar (MAINTENANCE/OCCUPIED), tiket inspeksi, rent override.

### 2026-07-06 â€” Y-J8 âœ… Accounting Period Close integration test
- Y-J8: âœ… `accounting-period-close.integration.test.js` â€” 3 test (full closeâ†’reopenâ†’re-close cycle + guard periode tidak ada + guard double close). Verifikasi closing journal CLOSING_ENTRY, reversal journal CLOSING_REVERSAL, closeVersion/reopenVersion, audit trail utuh (jurnal tidak dihapus saat reopen).

### 2026-07-06 â€” Y-J12 âœ… Inventory Movement integration test
- Y-J12: âœ… `inventory-movement.integration.test.js` â€” full cycle ASSIGNâ†’RETURNâ†’INâ†’OUT + 6 guard tests (insufficient stock, missing roomId, IN+roomId, STAFF forbidden, note too short, RETURN over-room-qty). 10 assertions, 1.9s.

### 2026-07-02 â€” Fase Y-I (Notifications & Push) âœ… selesai
- Y-I2: âœ… `reminder-mock.service.test.js` â€” 5 test (mockSend full success, invalid tenantId, tenant tanpa user, notif gagal, getTitleForType)
- Y-I3: âœ… `push.service.test.js` â€” 13 test (onModuleInit 3 varian, subscribe create/update, unsubscribe, dispatchPending skip/no-pending/no-device/success/404/FAILED)

### 2026-07-01 â€” Fase Y-H (Loyalty & Gamification) âœ… selesai
- Y-H1: âœ… `loyalty.service.test.js` â€” 13 test (award idempotent/delta 0/P2002, earn, earnSafe, balance, history, leaderboard)
- Y-H2: âœ… `redemption.service.test.js` â€” 18 test (reward CRUD, request redemption guard stok/saldo/race, decide approve+reject+jurnal+ticket, list, assertTenant)
- Y-H3: âœ… `referral.service.test.js` â€” 10 test (getOrCreateCode existing/baru/clash, linkReferralTx skip valid, rewardEligible + skip + error resilient)
- Y-H4: âœ… `peer-report.service.test.js` â€” 22 test (create self/notfound/duplicate/notif, moderate acknowledge/dismiss, markImproved, confirm reporter/admin/forbidden, list helpers + anonimitas)
- 63 test total, 0 fail; tsc clean

### 2026-07-01 â€” Fase Y-G (Public, Marketing & AI) âœ… selesai
- Y-G1: âœ… `marketing-public-rooms.service.test.js` â€” 11 test (social proof, catalog query, filter, detail, calendar, schema readiness)
- Y-G2: âœ… `facility-images.service.test.js` â€” 13 test (upload valid/invalid mime, list, delete, exists)
- Y-G3: âœ… `faqs.service.test.js` â€” 11 test (list public/all, CRUD, not found, seed idempoten)
- Y-G4: âœ… sudah ada `announcements-logic.test.js` (16 test)
- Y-G5: âœ… `surveys.service.test.js` â€” 11 test (submit, summary, mineExists timing gate 30 hari & cooldown 6 bulan)
- Y-G6: âœ… `owner-ai.service.test.js` â€” 25 test (status, rate-limit, usage, brief AI+fallback, expense OCR, KTP OCR, ticket action, reorder, test connection, audit)
- Y-G7: â›” dilewati â€” file sumber `ai-context-builder.service.ts` tidak ada di repo
- Y-G9: âœ… `market-analysis.service.test.js` â€” 17 test (business snapshot, demographics PDP-safe, CAC/CLV, chat SWOT, fallback, CRUD)
- Y-G10: âœ… `analytics.service.test.js` â€” 7 test (marketingSummary, financeSummary, operationsSummary, strategySummary)
- 95 test total, 0 fail

### 2026-07-06 â€” Fase Y-F (Staff & Operations) âœ… selesai
- Y-F1: âœ… `tickets.service.test.js` â€” 51 test (CRUD, assign, start, close, tip, ack)
- Y-F2: âœ… `staff-routines.service.test.js` â€” 11 test (getToday, getMyKpi, template CRUD, getAdminProgress)
- Y-F3: âœ… `staff-performance.service.test.js` â€” 10 test (KPI, leaderboard, audit, evidence)
- Y-F4: âœ… `staff-field-reports.service.test.js` â€” 12 test (create, reviewQueue, adminReview, findAll)
- Y-F5: âœ… `tenant-staff-reviews.service.test.js` â€” 16 test (eligible, create, verify, listPending)
- Y-F6: âœ… `inventory-items.service.test.js` â€” 13 test (CRUD, updateStatusFromField)
- Y-F7: âœ… `inventory-movements.service.test.js` â€” 13 test (CRUD, validateMovement guards)
- Y-F8: âœ… `room-items.service.test.js` â€” 14 test (CRUD, findMyRoomItems, updateStatusFromField)
- Y-F9: âœ… `wifi-sales.service.test.js` â€” 9 test (CRUD, journal guard)
- Y-F10: âœ… `additional-services.service.test.js` â€” 18 test (CRUD, interest, notification)
- **Total Y-F: 170 test â†’ 170/170 PASS** â€” 10 layanan Staff & Operations tercover penuh

### 2026-07-06 â€” Fase Y-E (AutoOps/Sweep Services) âœ… selesai
- Y-E1..Y-E6: âœ… `auto-ops.service.test.js` â€” 23 test (BookingSweep, StaySweep, RenewalSweep, AccountingSweep, MaintenanceSweep, mutex/orchestration) â€” 23/23 PASS
- **Total Y-E: 23/23 test PASS** â€” seluruh sweep service orchestration tercakup

### 2026-07-06 â€” Fase Y-D (Accounting Engine) âœ… selesai
- Y-D1: âœ… `accounting.service.test.js` â€” 22 test (CoA, cash account, period, opening balance, journal draft, schema guard)
- Y-D2: âœ… `accounting-posting.service.test.js` â€” 10 test (boundary, idempotency, P2002, 7 delegation methods)
- Y-D3: âœ… `accounting-reports.service.test.js` â€” 2 test (trialBalance, profitLoss)
- Y-D4: âœ… `accounting-period-close.service.test.js` â€” 2 test (readiness, preview)
- Y-D5: âœ… `accounting-readiness.service.test.js` â€” 2 test (getReadiness, getPostingPeriodReadiness)
- Y-D6: âœ… `rent-recognition.service.test.js` â€” 2 test (ensureSchedules, recognizeDue)
- Y-D7: âœ… `expenses.service.test.js` â€” 4 test (findAll, findOne, create, remove)
- Y-D8: âœ… `assets.service.test.js` â€” 5 test (findAll, findOne, readiness, depreciationPreview, create)
- Y-D9: âœ… `finance.service.test.js` â€” 2 test (businessHealth, occupancySummary)
- Y-D10: âœ… `reports.service.test.js` â€” 3 test (monthlyIncome, profitLoss, financialRatios)
- **Total Y-D: 54/54 test PASS** â€” seluruh Accounting Engine (10 service) tercakup

### 2026-07-06 â€” Fase Y-C (Service Logic) âœ… selesai
- Y-C4: âœ… `stays-query.service.test.js` â€” 30 test (findAll filter/pagination, findCurrentForTenant, findOne role isolation, getInvoiceSuggestion) â€” 30/30 PASS
- Y-C5: âœ… `prepay-extension.service.test.js` â€” 20 test (input validation, stay/arrears/rent guards, rate term, journal fail, success MONTHLY/SMESTERLY/YEARLY) â€” 20/20 PASS
- Y-C6: âœ… `room-transfer.service.test.js` â€” 10 test (rent override OWNER-only, stay/target room guards, success with meter readings) â€” 10/10 PASS
- Y-C7: âœ… `renew-requests.service.test.js` â€” 18 test (create guards, decideByTenant YA/TIDAK, reject, findMine) â€” 18/18 PASS
- Y-C8: âœ… `checkout-requests.service.test.js` â€” 22 test (create guards H+1/open invoice/renew, approve/reject admin) â€” 22/22 PASS
- Y-C9..Y-C16: âœ… 8 test file baru (invoices, invoice-payments, payment-submissions, deposit-ledger, meter-readings, rooms, tenants, users) â€” 14/14 PASS
- Total Y-C: 114 test, 114 PASS âœ…

### 2026-07-01 â€” Fase Y-B (State Machines & Guards) âœ…
- Y-B5: âœ… `stays-state-machine.test.js` (41 test: isMeterInvoice, invoiceRemainingRupiah, computeMeterDepositSettlement, assertCoreLifecycleActor, normalizeStayForResponse, calculatePeriodEnd, dll.)
- Y-B6: âœ… `room-status-guard.test.js` (25 test: getRoomBathroomKind, getRoomSizeLabel, expectedFacilities, computeFacilityGap)
- Y-B7: âœ… `payment-submission-state.test.js` (12 test: mapSubmissionRow, buildApprovalPaymentNote, PaymentSubmissionStatus enum)
- Y-B8: âœ… `invoice-state-machine.test.js` (19 test: issue guard DRAFTâ†’ISSUED, cancel guard, role guard)
- Y-B9: âœ… `staff-routine-state.test.js` (28 test: isTemplateDue, dueLabel, StaffRoutinesService startâ†’IN_PROGRESS, completeâ†’DONE/NEED_HELP)
- Total Y-B: 9/9 âœ… (125 test, 0 fail)

### 2026-07-02 â€” Fase Y-A (Pure Helpers & Utils) âœ…
- Y-A13: âœ… test `date.util.test.js` (19 test: startOfDay, endOfDay, addDays, parseDateOnly, WIB helpers)
- Y-A14: âœ… buat `ktp.helper.ts` + `ktp.helper.test.js` (23 test: validasi NIK 16 digit, gender, birth date, province)
- Y-A15: âœ… buat `format.helper.ts` + `format.helper.test.js` (31 test: formatRupiah, formatPhone, formatDate, truncate, normalizeName)
- Y-A16: âœ… buat `room-code.helper.ts` + `room-code.helper.test.js` (22 test: generateRoomCode, validateRoomCode, parseRoomCode)
- Build lulus, 301/301 unit test PASS (0 regresi)


### 2026-07-02 â€” Fase Y (Test Coverage Maksimal) â€” Pemetaan ðŸŸ¡
- Y-00: âœ… pemetaan garis besar 19 sub-fase, 153 area test (28 sudah, 125 belum). Detail di `M10` bagian "FASE Y". Prioritas: Y-A (helpers) â†’ Y-B (state machine) â†’ Y-C+Y-D (service+accounting) â†’ Y-E (auto-ops) â†’ Y-J (integration) â†’ Y-L (role matrix) â†’ Y-K (API contract) â†’ Y-F..Y-I (staff/loyalty/notif/AI) â†’ Y-M..Y-S (frontend+security+data). Dikerjakan bertahap per chat.

### 2026-07-02 â€” Fase W (Audit Maksimal) âœ… â€” 14 task selesai
- W-00..W-08: âœ… semua centang (COA/cash account â†’ OWNER-only keputusan owner 2026-07-02, deposit reconciliation â†’ jalankan saat go-live)
- W-09: âœ… XSS audit bersih, route guard solid, objectURL leak di SubmitPaymentModal + TenantInvoiceDetailPage diperbaiki
- W-10: âœ… Public config aman, RESERVED/OCCUPIED room no CTA booking false, availability calendar 5 status
- W-11: âœ… Log audit (tidak ada kebocoran JWT/token/NIK), `console.error` â†’ `this.logger.error`, health endpoints
- W-12: âœ… Dokumentasi bersih, CODEMAP akurat, tidak ada file MD liar
- W-13: âœ… Test coverage per role terverifikasi (156/156 test PASS, 12 Playwright spec)
- Backend build âœ… + all tests PASS

### 2026-07-01 â€” Fase V: verifikasi kode + centang 5 item sisa âœ…
- V-07: validasi `readingAt >= initialMetersPromotedAt` sudah diimplementasi (meter-readings.service.ts:214-222) â€” centang.
- V-11: 3 verifikasi kode terkonfirmasi â€” StayDetailPage (tidak ada CTA check-in, gate PAID di stays.service.ts), Staff room card (tanpa finance leak), Owner dashboard (tidak perlu bedakan reserved-DP/lunas, sudah ada di AdminWorkspaces).
- V-13: 156/156 unit test PASS. Backend + frontend build lulus.
- Status: Fase V âœ… selesai. Sisa: V-07 (keputusan owner: tenant meter â†’ invoice langsung?), V-12 (e2e test), V-15 (manual UAT), V-16 (backend integration test dengan DB UAT).

### 2026-07-01 â€” Eksekusi Audit AI Lemah (P0/P1 fixes) âœ…
- P0-1: Fix `submit-with-proof` â€” filename kini pakai prefix `tenantId_` seperti `upload-proof`, agar service validation ownership lulus.
- P0-2: Lengkapi filter `TENANT_HIDDEN_TICKET_CATEGORIES` ke `findOne()` (NotFound) dan `canAccessImage()` (return false) â€” tenant tidak bisa akses detail/gambar tiket internal walau tahu ID.
- P0-3: Fix backend tests â€” `BOOKING` â†’ `RESERVED` di booking-flow integration test (assertion + data + komentar). Checkout guard test regex sudah match (W-04).
- P1-1: Wizard publik kini pakai `isPublicRoomBookable()` â€” `RESERVED` tidak lagi dianggap available.
- Dokumentasi: M01 status diperbarui (W/X aktif, bukan B-L selesai); CLAUDE.md bersih dari typo + tambah syarat test PASS; hapus komentar `BOOKING` stale di tenant-bookings + stays service.

### 2026-07-01 - Fase X sisa: admin warning, public nav, landing navy, axe publik
- X-02c selesai: dashboard admin kini menampilkan peringatan kamar yang tidak tampil di katalog publik karena gap fasilitas-inventaris; backend aggregate menambah `facilityGaps` tanpa mengubah hide-gap Fase U.
- X-04/X-08/X-16 selesai untuk scope publik: trust section landing tidak lagi kosong saat capture, nav publik memakai sumber link bersama, Playwright axe publik berjalan dan 2/2 pass. X-06 diverifikasi intended; X-14 ditahan karena butuh keputusan owner.

### 2026-07-01 â€” W-00-D1 Diputuskan + Implementasi âœ…
- Owner putuskan: depreciation, recurring-expenses, journal-reconciliation, rent-recognition â†’ **OWNER-only**. ADMIN = operasional. Implementasi: `@Roles(OWNER)` di 4 endpoint auto-ops.controller.ts.

### 2026-07-01 â€” W-05 AutoOps Idempotency âœ…
- W-05 selesai: verifikasi advisory lock (pg_try_advisory_lock), in-process concurrency guard, idempotency di semua sweeper, query token sudah dihapus, no RoomStatus.BOOKING dependency. Blocker: W-00-D1 (finance-heavy OWNER-only) masih ðŸ§‘ butuh owner.

### 2026-07-01 â€” W-06 Upload & Media Registry âœ…
- W-06 audit selesai: magic-byte validation (detectImageMime) di 6 endpoint upload, random filename, protected upload ownership verified, staff field report photo gap documented (low risk). Tanpa schema migration (W-00-D3).

### 2026-07-01 â€” W-07 Finance Controls âœ…
- W-07 audit selesai: OWNER/ADMIN operasional, OWNER-only period/opening-balance/backfill, reversal/correction enforced, trial balance balanced, no invoice PAID tanpa payment. COA/cash account OWNER/ADMIN â†’ W-00-D1.

### 2026-07-01 â€” W-08 Staff/Ticket Boundary âœ…
- W-08 selesai: fix roomId validation di staff-routines (start+complete), rapikan formatting, verifikasi ticket close guard, inventory movement OWNER/ADMIN, STAFF update selalu PENDING_CHECK.

### 2026-07-01 â€” W-04 Lifecycle Cross-Blocks âœ…
- W-04 selesai: ekstrak helper `lifecycle-guards.helper.ts` (ACTIVE_RENEW_STATUSES, ACTIVE_CHECKOUT_STATUSES, isActiveRenewRequestStatus, isActiveCheckoutRequestStatus), integrasi ke checkout-requests + renew-requests service, fix TC-CO05 regex mismatch. 205/205 test PASS.

### 2026-07-01 â€” W-03 Role/API Exposure Matrix âœ…
- W-03 selesai: audit 30+ controller, 1 gap kritis diperbaiki (hapus STAFF dari wifi-sales GET/revenue), frontend guard verified match backend. Role matrix final: STAFF hanya operasional, OWNER/ADMIN semua finance.

### 2026-07-01 â€” W-02 Auth, Session & PDP âœ…
- W-02 selesai: audit PDP (NIK masked 3 lokasi, KTP terproteksi, payment proof tenant-isolated), sessionStorage cleanup verified, unit test reset password 5 assertion (expired/reused/same/inactive/invalid) â€” semua PASS.

### 2026-07-01 â€” W-01 Production Security Baseline âœ…
- W-01 selesai: security headers di static assets, extension filter gambar, CSP diperketat (`frame-ancestors 'none'`, `form-action 'self'`), JWT_SECRET production guard (tolak startup secret dev), rate limiter `failClosed` untuk auth route.

### 2026-07-01 â€” W-00 Project Status Gate âœ…
- W-00 Decision Register dibuat: 6 keputusan dianalisis â€” 3 terkunci kode, 2 ditentukan (JWT tetap localStorage, upload tanpa schema), 1 butuh owner (AutoOps finance-heavy). Detail di `docs/M02_KEPUTUSAN_OWNER.md Â§ W-00`.

### 2026-07-03 â€” X-Phase UI/UX Audit Fixes
- X-01 âœ… Sudah diimplementasi (TENANT_HIDDEN_TICKET_CATEGORIES + filter `/my`)
- X-02a/b âœ… Empty-state katalog publik & error graceful sudah ada
- X-03 âœ… Kontras wizard sudah fix (color:#fff)
- X-07 âœ… Chip navigasi tenant mobile flex-wrap (10-misc.css)
- X-09 âœ… StatusStrip invoice pakai StatCardSkeleton saat loading
- X-13 âœ… Spinner FAQ diganti SkeletonBlock
- X-15 âœ… tabular-nums di compact-data-table
- X-05 âœ… Toast akses ganda di-guard dengan useRef + defaultRoute check
- X-11 âœ… Badge count pakai totalItems dari meta, bukan items.length

### 2026-07-01 â€” Fase X / X-10: inspeksi UI/UX mendalam + RE-CAPTURE backend stabil
- Inspeksi visual 1-per-1 lintas role Ã— 2 viewport + re-capture OWNER+ADMIN dgn backend **non-watch** (`node dist/main.js`).
- **Pelajaran:** capture pertama saat backend `nest --watch` CRASH (giliran owner) â†’ banyak "error" owner = ARTEFAK, hilang setelah re-capture. â†’ capture WAJIB backend non-watch.
- X-05 dipecah: "Network Error" = artefak (ditutup); toast "tidak memiliki akses" (Ã—2) owner/admin dashboard = NYATA (akar `App.tsx` RequireRoles + StrictMode).
- Temuan baru: X-11 badge filter = subset halaman (tenants 5 vs 13, expenses 5 vs 12); X-15 sel tabel pecah mid-token; X-13 spinner settings; X-14 accounting-setup terlalu padat. X-16 axe a11y = sisa.
- Detail: `docs/_SPEC_FASE_X_UIUX.md` (bagian HASIL X-10) + `docs/M10_CHECKLIST_CHANGELOG.md` Fase X.

### 2026-06-30 â€” Fase V: Hardening Aktif (V-06..V-14) âœ…

### 2026-06-30 â€” Fase W + X: Security hardening, lifecycle fix, UI/UX audit ðŸ”´
- **W-01**: security headers `nosniff` ditambahkan ke static `/uploads/room-images` via `setHeaders` âœ…
- **W-04**: checkout request blokir semua active renew status (`PENDING_DECISION`/`AWAITING_DP`/`DP_SECURED`), bukan cuma `PENDING` âœ…
- **X-01**: tiket internal (`CHECKIN_CHECKOUT`, `CHECKOUT_INSPECTION`, dll.) tidak bocor ke tenant â€” filter `TENANT_HIDDEN_TICKET_CATEGORIES` di `findMine()` âœ…
- **X-02a**: empty-state katalog publik lebih informatif ("Semua kamar sedang penuh") âœ…
- **X-02b**: error graceful detail/booking publik â€” warning ramah bukan alert merah mentah âœ…
- **X-03**: kontras wizard â€” `.gpw-question-text` diberi `color: #fff` âœ…
- **V-06**: Payment Proof Ownership â€” upload-proof hardening (tenantId prefix, audit trail), validateAndResolveProof (ownership/file exists/consumed), SubmitBatchPaymentModal, "Bayar Semua" button wiring âœ…
- **V-08**: Sinkronisasi dokumen kontrak â€” M04 ditambahi override Fase V (M03/M05 sudah) âœ…
- **V-11**: `StepRoomSelect.tsx` â€” RESERVED kamar tenant lain tidak bisa dipilih âœ…
- **V-12**: `analytics/finance/summary` STAFF dihapus (OWNER/ADMIN only) âœ…
- **V-13**: `deposit-ledger backfill/dry-run` OWNER-only âœ…; `ProcessLossRefundDto.proofUrl` validasi server path âœ…
- V-07, V-09, V-10, V-14 diverifikasi semua sudah diimplementasi âœ…
- V-15 manual UAT masih perlu eksekusi manusia.

### 2026-06-30 â€” Fase X: Audit UI/UX Visual (Playwright + Inspeksi Visual) ðŸ”´ dibuka
- **Metode baru**: `frontend/e2e/visual-capture.spec.ts` memotret 132 screenshot (5 role Ã— 2 viewport), tiap layar diinspeksi visual (bukan smoke-test teks). Re-seed event-path (perbaiki 2 stale seeder: `occupantCount`, `bookingSource:'ONLINE'`â†’`'WEBSITE'`).
- **Temuan ðŸ”´**: (X-01, DIKONFIRMASI API) tenant melihat tiket internal `EVICT_OVERSTAY` via `/tickets/my`; (X-02) katalog publik KOSONG saat go-live â€” bukan bug Fase U hide-gap (sengaja), tapi data normal bikin semua kamar tersembunyi tanpa peringatan admin + detail/booking error mentah.
- **Temuan ðŸŸ /ðŸŸ¡**: kontras judul wizard, blok navy kosong di landing, dashboard owner/admin "Network Error"+toast (perlu repro manual; API aggregate OK saat retest), `/portal/loyalty`+`/portal/bookings` fallback ke stay, chip mobile terpotong, nav publik tak konsisten.
- **Output**: `docs/_SPEC_FASE_X_UIUX.md` + `docs/M10_CHECKLIST_CHANGELOG.md` Fase X (X-01..X-10, instruksi eksekutor detail). Inspeksi ~110 screenshot sisa = task X-10.

### 2026-06-30 â€” TEMUAN Audit Fase V: Invoice Ganda + Meter di Payment âœ…
- **TEMUAN-1**: `stays.service.ts` â€” booking activation skip pembuatan invoice baru (stay sudah punya invoice PAID). Invoice+MeterReading dibungkus `if (lockedRoom.status !== RESERVED)`.
- **TEMUAN-2**: `payment-submissions.service.ts` â€” hapus MeterReading.create() saat payment approval (melanggar aturan Fase V). `stays.service.ts` â€” promote pending meter snapshot ke MeterReading saat check-in activation.
- **Gate**: Backend tsc âœ… | audit doc `_AUDIT_FASE_V_2026-06-30.md` dihapus (temuan sudah diimplement).

### 2026-07-14 â€” V-05: Fix Booking Publik Phone/Email âœ…
- **V-05**: `create-public-booking.dto.ts` â€” `phone` jadi required + validasi `@Matches`.
- **V-05**: `public-bookings.service.ts` â€” guard `normalizePhone` null â†’ BadRequest.
- **V-05**: `public-bookings.service.ts` â€” perbaiki OR lookup (filter null/empty conditions).
- **V-05**: `public-bookings.service.ts` â€” User.email pakai placeholder `tenant-{id}@phone.local.kost48` saat email tidak diisi.
- **V-05**: `public-bookings.service.ts` â€” portalAccess.email tetap pakai email asli (tidak bocorkan placeholder).
- **Gate**: Backend tsc âœ…

### 2026-07-13 â€” V-04: AutoOps & Dashboard Label Flow Baru âœ…
- **V-04**: `booking-sweep.service.ts` â€” skip `releaseRoomAfterBookingCancelTx` jika room sudah `AVAILABLE`.
- **V-04**: `stay-sweep.service.ts` â€” perkuat `runRoomHealer()`: pastikan tidak ada payment submission PENDING/APPROVED dari stay non-ACTIVE sebelum release room.
- **V-04**: `admin-dashboard.service.ts` â€” tambah `latestInvoiceId`/`latestInvoiceStatus`/`invoiceCount` di stay query dashboard.
- **V-04**: `dashboardShared.tsx` â€” tambah `getReservedPaymentLabel()`: Reserved-DP, Reserved-Lunas, Menunggu Pembayaran, Menunggu Persetujuan.
- **V-04**: `AdminWorkspaces.tsx` â€” booking rows pakai label baru + helper text sesuai status pembayaran.
- **Gate**: Backend tsc âœ… | Frontend tsc âœ…

### 2026-07-13 â€” V-03: Check-in Wajib Lunas + Booking Activation âœ…
- **V-03**: `stays.service.ts` â€” lock transaction terima RESERVED untuk aktivasi booking.
- **V-03**: Booking activation: cari existing stay unpromoted, verifikasi invoice PAID, promote stay.
- **V-03**: `payment-submissions.service.ts` â€” hapus `initialMetersPromotedAt` dari payment approval (check-in terpisah).
- **V-03**: Gate tenant stay aktif: booking unpromoted tidak dianggap stay aktif.
- **V-03**: Walk-in: create stay baru + promote. Booking: activate existing stay.
- **Gate**: Backend tsc âœ… | Frontend tsc âœ…

### 2026-07-13 â€” V-02: Payment Approved â†’ RESERVED + Re-check Room + Cancel Pesaing âœ…
- **V-02**: `payment-submissions.service.ts` â€” DP/lunas approved selalu set room `RESERVED` (tidak lagi tergantung `nextInvoiceStatus === PAID`).
- **V-02**: Re-check room sebelum approve: OCCUPIED tolak, RESERVED stay lain tolak + notes refund.
- **V-02**: Cancel competing unpaid bookings + reject PENDING_REVIEW submissions pesaing.
- **V-02**: Tidak set `initialMetersPromotedAt` di payment approval; meter promotion hanya saat PAID penuh.
- **Gate**: Backend tsc âœ…

### 2026-07-13 â€” V-01: Booking Tidak Mengunci Room + Booking Path domain-based âœ…
- **V-01**: `public-bookings.service.ts` & `tenant-bookings.service.ts` â€” RESERVED tidak bisa dibooking (hanya AVAILABLE atau MAINTENANCE+allowBooking).
- **V-01**: `payment-submissions.service.ts` â€” `isBookingPath` deteksi dari `stayPromotedAt==null`, bukan `Room.status`.
- **V-01**: `owner-ai.service.ts` â€” `isBookingPath` pake `initialMetersPromotedAt==null`.
- **V-01**: `marketing-public-rooms.service.ts` â€” `isAvailable`/`canBook` tidak include RESERVED.
- **V-01**: `tenant-bookings-query.service.ts` â€” `isAvailable` tidak include RESERVED.
- **V-01**: `publicRoomDisplay.ts` â€” RESERVED `canBook: false`, copy "Kamar sudah dikunci tenant lain".
- **V-01**: `SubmissionLockRow` + `SubmissionEligibilityRow` â€” tambah `stayPromotedAt`.
- **Gate**: Backend tsc âœ… | Frontend tsc âœ…

### 2026-07-13 â€” V-00: Hapus RoomStatus.BOOKING dari Enum Sepenuhnya âœ…
- **V-00**: `RoomStatus.BOOKING` **dihapus** dari `schema.prisma` dan `app.enums.ts` â€” enum sekarang: AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, INACTIVE.
- **V-00**: **0 data `BOOKING` di DB** (AVAILABLE=2, OCCUPIED=11) â€” aman dihapus tanpa migrasi data.
- **V-00**: 13 file backend + 3 file frontend dibersihkan dari referensi `RoomStatus.BOOKING`.
- **V-00**: `hasBookingRoomStatus` dihapus dari `booking-schema.helper.ts`, `tenant-bookings.queries.ts`, `tenant-bookings.types.ts`, `tenant-bookings-query.service.ts`.
- **V-00**: Label `RESERVED` diubah dari "Dipesan (Lunas)" jadi "Dipesan" (karena RESERVED bisa DP atau Lunas).
- **V-00**: `publicRoomDisplay.ts` â€” blok `BOOKING` dihapus; `isAvailable`/`canBook` tidak lagi include BOOKING.
- **V-00**: StatusBadge, statusLabels, finance service, auto-ops, marketing, payment-submissions, stays â€” semua bersih.
- **Gate**: Backend `tsc --noEmit` âœ… | Frontend `tsc --noEmit` âœ…

### 2026-07-01 â€” Sinkronisasi Docs MD vs Kode (Audit Total)
- **Audit total 16 file MD vs kode riil** (schema, enum, modul, pricing helper): M01, M04, M05, M03, CODEMAP diperbarui â€” sync pricing multipliers (WEEKLY 0.5, SMESTERLY 5.7, YEARLY 11.0), model count (55â†’57), enum count (65â†’69), module count (38â†’42), stale anchor commit reference, arsip path references.
- **M01_MASTER.md**: pricing terms +57 model/69 enum/42 modul + tambah `GuestPreferenceSurvey` & `ExternalReview`.
- **M04_KEUANGAN.md**: embedded `pricing.test.js` diperbarui ke nilai aktual (WEEKLY 850rb, SMESTERLY 9.69jt, YEARLY 18.7jt).
- **M05_SIKLUS_HUNI.md**: pricing terms sync (50% / 5,7Ã— / 11Ã—).
- **M03_FLOW_KONTRAK.md**: anchor warning diperbarui tunjuk arsip `_PETA_AI.md` + hilangkan commit `3c7ffe2`.
- **CODEMAP.md**: 42 modul Â· 57 model Â· 69 enum; link `M13_FASE_H` ke arsip; tambah model baru di index.

### 2026-06-30 â€” Audit menyeluruh + Fase V booking/payment hardening
- **Dokumentasi audit diperbarui**: `docs/M09_AUDIT.md` kini mencatat temuan audit terbaru 2026-06-30 (booking publik phone/email, proof ownership, room state `BOOKING`, upload spoof, cron token, meter guard, ticket image access, JWT localStorage) beserta hasil verifikasi build/test.
- **Checklist aktif dipindah ke M10**: `docs/M10_CHECKLIST_CHANGELOG.md` menambah **Fase V â€” Audit 2026-06-30 + Booking Flow Baru** dengan keputusan room state final `AVAILABLE -> RESERVED -> OCCUPIED` dan task V-00..V-16 untuk dieksekusi bertahap. File checklist root yang salah tempat dihapus.
- **Pendalaman flow/komponen ditambahkan**: Fase V diperluas menjadi V-00..V-16, mencakup payment booking path berbasis stay, check-in wajib lunas, public/tenant/admin/staff UI, role/data exposure, finance guard, media safety, dan regression matrix. `M03`, `M04`, `M05`, dan `M09` diberi update/override agar tidak mengikuti kontrak booking lama.
- **Pendalaman maksimal status proyek ditambahkan**: `docs/M10_CHECKLIST_CHANGELOG.md` kini punya **Fase W â€” Audit Maksimal Status Proyek** (W-00..W-13) untuk security baseline, auth/PDP, role matrix, renew/checkout/deposit, AutoOps idempotency, media registry, finance controls, staff boundary, frontend state, observability, docs source-of-truth, dan UAT per role. `docs/M09_AUDIT.md` juga menambahkan ringkasan temuan maksimal tersebut.

### 2026-06-25 â€” Redesign total Dashboard Staff (`/dashboard`) â€” KPI strip + bento
- **Hero ringkas + kontekstual** (`StaffMotivationDashboard`): tanggal + sapaan waktu (pagi/siang/sore/malam) + sekilas "{N} tugas Â· {M} perlu perhatian" + aksi cepat; paragraf motivasi/terima kasih panjang dipangkas jadi 1 baris halus.
- **KPI strip** 5 `StatCard` (reuse `common/StatCard`): Tugas hari ini Â· Selesai Â· Perlu bantuan Â· Meter belum dicatat Â· Kinerja bulan ini â€” semua clickable (scroll daftar kerja / ke `/rooms` / `/staff-report`).
- **Layout bento** (`05-staff.css`): Papan kerja + Prioritas terdekat (top-3, sebelumnya 8 `focusItems` dihitung tapi cuma 1 ditampilkan) sejajar; Kinerja + Checklist sejajar; responsif tumpuk di <992px.
- **Papan kerja**: progress "selesai hari ini" kini **donut ring** (`DonutGauge`) menggganti teks polos.
- **Single source of truth**: ekstrak `computeStaffBoard()` ke `utils/staffBoardStats.ts`, dipakai bersama KPI strip + papan kerja (angka tak pernah beda).
- **Modern touch**: ikon **lucide** menggantikan emoji di tab `StaffUnifiedWorkQueue` + `EmptyState` saat filter kosong; **skeleton per-seksi** (`HeroSkeleton`+`StatCardSkeleton`+`TableSkeleton`) menggantikan spinner full-page.
- **Hapus dead code lama**: file `utils/staffWorkStats.ts` (yatim) dihapus; kelas CSS usang dibersihkan (`staff-day-hero-*`, `staff-hero-copy`, `staff-thank-card`, `staff-nearest-inline`, `staff-operational-progress`, `staff-meter-summary-widget/info/text/btn`) di 05/06/09/10-*.css â€” tanpa duplikasi.
- `SegmentedTabs.icon` diperlebar `string` â†’ `ReactNode` (kompatibel mundur). Build LULUS (vite frontend).

### 2026-06-24 (lanjut-11) â€” Ikon + konsistensi navbar Staff Portal
- **`StaffTopWorkspaceNav`**: tambah render ikon emoji (`link.icon`) di tiap tab, selaras dengan `TenantWorkspaceTabs` (sebelumnya ikon didefinisikan di `navigation.ts` tapi tidak dirender).
- **CSS** (`05-staff.css`): tambah rule `.staff-workspace-tab > span[aria-hidden]` untuk sizing ikon (`1.05rem`).
- **`AppLayout` staff branch**: label tombol logout `"Logout"` â†’ `"Keluar"` (konsisten dengan tenant portal berbahasa Indonesia).
- Build LULUS (tsc backend + vite frontend).

### 2026-06-24 (lanjut-10) â€” Badge Pengumuman + Indikator Update Laporan + Timeline Tiket
- **`StayAnnouncementBanner`**: kini menampilkan badge `"N aktif"` + navigasi ke daftar pengumuman (`/portal/announcements`) bila >1 pengumuman aktif.
- **Fact chip "Laporan" di `MyStayPage`**: dot merah muncul bila ada tiket dengan `updatedAt` > terakhir kali tenant lihat halaman stay (via `sessionStorage`). Label `"Ada update"` menggantikan `"Aktif"`.
- **`MyTicketsPage`**: tiket kini ditampilkan sebagai **timeline vertikal** â€” node: Dibuat â†’ Ditugaskan (ke staff) â†’ Dieskalasi (jika ada) â†’ Selesai dikerjakan â†’ Ditutup. Setiap node menampilkan timestamp asli dari DB; node yang belum terjadi tampil redup ("Menunggu").
- CSS: `.asb-badge`, `.fact-dot`, `.ticket-timeline*` di `10-misc.css`. Build LULUS (tsc backend + vite frontend).

### 2026-06-24 (lanjut-9) â€” Denda kerusakan di form Final Checkout
- **`CompleteStayDto`** sekarang menerima `damageChargeRupiah` (opsional) + `damageNote` (opsional) â€” admin bisa mencatat biaya kerusakan langsung di form final checkout.
- **`complete()`** (`stays.service.ts`) otomatis membuat invoice `PENALTY` setelah stay COMPLETED bila ada denda. Invoice dibuat SETELAH blocking-check sehingga tidak memblokir checkout.
- Invoice PENALTY otomatis disettle terhadap deposit jaminan saat `processDeposit()` (Q5: deposit auto-cover semua invoice terbuka, termasuk non-meter).
- Frontend `CompleteStayModal`: input nominal denda (Rp) + catatan kerusakan (opsional, wajib diisi bila ada nominal).
- Build LULUS (tsc backend + vite frontend).

### 2026-06-24 (lanjut-8) â€” Survei Kepuasan: Gate 30 Hari + Re-submit + Halaman Owner
- **Timing gate 30 hari**: tenant hanya bisa isi survei setelah minimal 30 hari menginap (cek `checkInDate` stay aktif). Sebelumnya bisa isi hari pertama â€” rating tidak valid.
- **Re-submit 6 bulan**: tenant bisa isi ulang survei setiap 6 bulan (bukan sekali seumur tenant). Jika belum 6 bulan sejak survei terakhir, tampil info cooldown + tanggal eligible berikutnya.
- **Halaman owner `/admin/surveys`**: halaman baru (`AdminSurveysPage`) untuk OWNER/ADMIN â€” tabel semua survei, ringkasan agregat (rata-rata per aspek, rekomendasi rate), filter rating, sort, komentar terbaru. Sebelumnya endpoint `GET /surveys` sudah ada tapi tidak ada UI.
- **Ringkasan dashboard admin**: banner kecil di overview dashboard admin yang menampilkan jumlah respons, rata-rata rating, dan % rekomendasi â€” dengan link "Lihat semua â†’" ke `/surveys`.
- **Nav sidebar**: item "â­ Survei Penghuni" di sidebar admin, route title "Survei Penghuni".
- Backend: `mineExists()` return shape baru (`eligible`, `reason`, `eligibleAt`, `nextEligibleAt`). Frontend: `SatisfactionSurveyCard` handle 4 state (belum eligible/cooldown/re-submit/fresh). Build LULUS.

### 2026-06-24 (lanjut-7) â€” Konsistensi Fasilitasâ†”Inventaris + Monitoring AC
- **Spec kanonik** (`backend/.../rooms/room-facility-spec.ts` + mirror `frontend/.../utils/roomFacilitySpec.ts`): turunkan "expected facility" dari kriteria kamar (category/roomType/roomSize/hasAc), tandai STRUCTURAL (KM/mezzanine/ukuran) vs INVENTORY_BACKED (AC/kipas/kasur/lemari). `computeFacilityGap` jadi sumber tunggal gap.
- **Cek admin**: `GET /rooms/:id` sertakan `facilityCheck` (AC disorot via `acGap`); panel `FacilityGapPanel` + badge âš ï¸ di tab Fasilitas (`RoomDetailPage`); `FacilityManager` kini bisa menautkan fasilitas â†’ barang gudang (`inventoryItemId`).
- **Katalog publik**: kamar dengan gap fasilitasâ†”inventaris (mis. AC kurang) otomatis disembunyikan dari `/public/rooms` (list + detail) via `MarketingPublicRoomsService`.
- **Tenant**: accordion Fasilitas selalu terisi dari kriteria (AC/kipas, KM dalam/luar, mezzanine, ukuran); Info kamar tampilkan kapasitas AC Â½ PK, jenis KM, ukuran+maks penghuni, jadwal cuci AC, dan estimasi "30 kWh â‰ˆ ~X jam AC/hari" (`utils/acUsageEstimate.ts`).
- **Monitoring AC**: halaman admin `/ac-maintenance` (`GET /rooms/ac-maintenance` + `PATCH /rooms/:id/ac-clean`) â€” status hibrid (interval+kWh), tombol Catat Cuci AC (set `acLastCleanedAt`, tutup tiket `AC_CLEANING`).
- **Backfill**: `scripts/seed-facilities-inventory.js` (`npm run seed:facilities`, idempoten, UAT 5433) â€” isi item gudang + RoomItem (ASSIGN_TO_ROOM) + fasilitas tertaut + standar AC Â½ PK (380W) untuk 13 kamar.
- **Tanpa migrasi** (semua kolom sudah ada). tsc backend + build frontend LULUS.

### 2026-06-24 (lanjut-6) â€” /portal/stay jadi dashboard penghuni modern
- **Restrukturisasi dashboard** (`MyStayPage.tsx`): tata letak grid 2 kolom (1 kolom di mobile), tanpa ubah flow/modal/aturan.
- **4 modul baru** (`components/portal/stay/`): `LeaseProgressHero` (ring progres masa sewa via DonutGauge â€” % terlewati, sisa hari, lama tinggal), `UtilityInsightCard` (pemakaian + estimasi biaya listrik/air sesuai logika MeterCycleModal: free 30 kWh, toggle air; + mini-tren HorizontalBarChart), `StayQuickActions` (grid ikon: bayar/catat meter/perpanjang/keluar/lapor/pengumuman/panduan/WA admin), `StayAnnouncementBanner` (pengumuman aktif terbaru).
- **Progres deposit**: bar disetor vs target di accordion Tarif.
- **Refactor**: komputasi meter diekstrak ke `utils/meterUsage.ts` (dipakai bersama `MeterTab`); helper `getLeaseProgress`/`formatTenure` di `utils/dateTime.ts`.

### 2026-06-24 (lanjut-5) â€” ProfilePage: KTP OCR + Marketing fields + UX perbaikan portal
- **Profil Tenant lengkap**: KTP scan OCR (tesseract.js, client-side, tidak upload ke server) auto-isi gender/tgl-lahir/kota; tenant audit & koreksi hasil OCR sebelum terapkan ke form.
- **Marketing analytics fields**: `maritalStatus`, `vehicleOwnership`, `smokingHabit`, `howDidYouHear` ditambah ke schema Prisma + enum backend + DTO + service; bebas diedit (tidak dikunci); section terpisah di ProfilePage.
- **NIK masking**: NIK tampil `XXXX****XXXX` default sesuai UU PDP; ada tombol toggle tampil/sembunyikan per sesi.
- **Poin Reward hidden**: navigasi `/portal/loyalty` dimatikan sementara (PENDING).
- **Notifikasi z-index**: `notification-dropdown-menu` dinaikkan ke `z-index: 1050` agar tidak tertutup card "Lengkapi Profil".
- **Banner meter H-10**: banner kuning muncul otomatis H-10 sebelum akhir kontrak jika meter belum dicatat bulan ini, dengan CTA langsung buka modal catat meter.

### 2026-06-24 â€” Owner konfirmasi pricing + unit test pricing sinkron
- **Owner konfirmasi**: multiplier dipertahankan â€” `WEEKLY=0.5, SMESTERLY=5.7, YEARLY=11.0` (A-5/D-21.4).
- **Test fix**: `pricing.test.js` diperbarui mencerminkan nilai aktual â€” WEEKLY 850.000, SMESTERLY 9.690.000, YEARLY 18.700.000 (sebelumnya pakai nilai lama 0.45/5.5/10).

### 2026-06-24 (lanjut-3) â€” ExternalReview + Wizard Booking + Filter Default Kosong
- **ExternalReview**: Model baru additive di schema + migrasi + `prisma generate`; service `getPublicSocialProof` gabung StaffReview + ExternalReview (weighted avg, pool 20); seed 14 ulasan Google nyata di `seed-real.ts`.
- **Wizard 4-step booking**: `GuestBookingForm.tsx` direfactor ke wizard (Data Diriâ†’Bookingâ†’Preferensiâ†’Ringkasan); NIK wajib 16 digit; "Berapa lama?" chip menggantikan date picker checkout; step Preferensi bisa dilewati; estimasi duplikat dihapus; pilihan DP/Lunas di step 4.
- **Pricing fix**: `WEEKLY=0.5, SMESTERLY=5.7, YEARLY=11.0` sinkron backend.
- **Filter default**: `/rooms` default `avail=bookable` (tampil kamar kosong saja).

### 2026-06-24 (lanjut-2) â€” Dark Mode Fix + Panduan Navbar + WiFi Tiered + Google Review
- **CSS root fix**: Hapus `@media (prefers-color-scheme: dark)` dari `00-tokens.css` â€” variabel `--pub-surface` tidak lagi jadi `#1e293b` saat OS dark mode; teks kartu kini selalu terbaca (hardcoded dark text vs white card bg).
- **Navbar**: Tombol "Panduan & FAQ" dikembalikan ke `rm-topbar-nav` di `PublicRoomsPage.tsx`.
- **FaqPublicPage**: Tambah topbar navigasi; tampilkan `HOME_FAQ_ITEMS + EXTRA_FAQ_ITEMS` sebagai fallback statis saat DB kosong (bukan hanya saat error); kontras accordion diperkuat via inline style explicit.
- **WiFi tiered**: Update FAQ backend + `publicGuestShared.tsx` + `officialKost48Content.ts` â€” Bulanan Rp 50k Â· 2 Mingguan Rp 30k Â· Mingguan Rp 20k Â· Harian Rp 5k (per perangkat).
- **Google Review**: Link `https://g.page/r/CQoPM7OnWlRoEAE/review` disimpan di `officialKost48Location.googleReviewUrl`; tombol "Tulis Ulasan di Google" muncul di `ReviewsPublicPage`.
- **Galon fix**: Harga galon dikoreksi Rp 15.000 â†’ Rp 20.000 di `officialKost48Content.ts`.

### 2026-06-24 (lanjut) â€” hasPet Booking Flow + Owner Settings Konstanta UI
- **Backend DTO + service**: `hasPet` optional bool ditambah ke `CreatePublicBookingDto`; kolom `"hasPet"` masuk INSERT Stay di `public-bookings.service.ts`.
- **Frontend booking form**: Checkbox hewan peliharaan di `GuestBookingForm` + info deposit Rp 100.000 (refundable) saat dicentang; summary `GuestBookingRoomSummary` tampilkan baris hewan; `GuestBookingPage` kirim `hasPet` ke API.
- **Owner Settings UI**: `TariffSettingsPanel` diperluas â€” 4 form field baru: WiFi/galon, deposit hewan, % ekstra penghuni. Save mutation menyertakan keempatnya.

### 2026-06-24 â€” Data Default Nyata + Konstanta Baru + Kontras CSS
- **Backend FAQ**: Ganti 18 FAQ generik ke konten asli website kost48surabaya.com (galon Rp 20.000, ekstra penghuni 20%, deposit hewan Rp 100.000, aturan pasutri/nikah siri/hewan, sistem listrik detail). `faqs.service.ts` DEFAULT_FAQS.
- **Backend schema + migration**: Tambah 4 konstanta owner-settable ke `OperationalSetting` â€” `wifiRupiah(50k)`, `galonRupiah(20k)`, `petDepositRupiah(100k)`, `extraOccupantFeePercent(20)`. Tambah `hasPet Boolean` ke `Stay`. Migration `20260624000000_add_operational_constants_and_pet`. `settings.controller.ts` expose ke `public-config`. Frontend `settings.ts` type diperbarui.
- **Seed real**: `seed-dev-via-api.js` rewrite â€” 13 kamar nyata (A-M+F1-F2) kategori/tipe/ukuran/tarif/deposit sesuai website. Tenant bervariasi: Dimas(B) RenewPending, Cindy(C) pet, Indah(H) 2 orang, Bayu(I) menunggak, Lani(K) H-10 checkout, Sari(F2) DP saja.
- **CSS kontras**: Fix 6 area â€” `#94a3b8` â†’ `#475569/#64748b` di filter-label/hint/breadcrumb/placeholder; active chip `#0ea5e9`â†’`#0369a1`; gx-room-status is-limited amberâ†’`#7c3f00`; gx-room-price coralâ†’`#a04020`; rm-card-cat-badge menjadi light per-kategori (DELUXE=ungu, ECONOMY=amber, STANDARD=biru) dengan cls diterapkan dari component.
- **Docs**: `docs/DEFAULT_DATA.md` baru â€” dokumentasi semua nilai awal DB (13 kamar, konstanta, FAQ 18 item, fasilitas umum, dummy tenant).

### 2026-06-24 â€” Redesign Katalog Publik + Extra Occupant Fee
- **Backend/Frontend**: Fitur biaya penghuni ekstra â€” STANDARD maks 4 (2 free + 2 ekstra @+20%), LARGE maks 6 (4 free + 2 ekstra @+20%). Hard cap + "tidak direkomendasikan" (D-24). Schema `Stay.occupantCount`, `pricing.helper.ts`, DTO, service, frontend `pricing.ts` + `GuestBookingForm`.
- **Frontend katalog**: Tombol "Panduan" hapus dari topbar â†’ chip "ðŸ“– Panduan & FAQ KOST48" dekat header. Filter vertikal (Ketersediaanâ†’Pendinginâ†’KMâ†’Harga stack). `ROOMS_PER_PAGE` 12â†’3 + paginasi. Status chip warna berkedip (green pulse=Kosong, orange pulse=Maintenance, red=Penuh) â€” fix class mismatch `rm-badge-is-*`. Card: 4 spec selalu tampil (KM/Pendingin/Ukuran/Mezzanine) + tabel harga lengkap 6 term.

### 2026-06-Sekarang â€” Wizard Redesign + Animasi Marketing
- **Frontend**: Extract RoomCard ke komponen bersama (`src/components/rooms/RoomCard.tsx`). Wizard result screen langsung tampilkan grid RoomCard dengan tombol booking via WA. Animasi fade/stagger/count-up/pulse + copy marketing. Hapus duplikasi tombol navigasi yang membingungkan.

### 2026-06-23 â€” RichAvailabilityCalendar: Room Status Board canggih
- **Backend**: `getAvailabilityCalendar()` diperkaya â€” tenant name, contract end date, renew request indicator, DP booking info, category rate
- **Frontend**: `AvailabilityTimeline.tsx` â†’ `RichAvailabilityCalendar.tsx` â€” card layout per kamar, status badge (ðŸŸ¢/ðŸ”´/ðŸŸ¡/âš™ï¸), progress bar kontrak, filter pills, indikator perpanjangan ðŸ”„, countdown urgent
- **CSS**: `avcal-*` â†’ `rcal-*` â€” design system baru, mobile responsive, stats bar

### 2026-06-23 â€” Fitur biaya penghuni ekstra + aturan batas D-24
- **Backend**: `Stay.occupantCount Int @default(1)` + migration SQL; `ROOM_MAX_FREE_OCCUPANTS` + `ROOM_MAX_OCCUPANTS` + `calculateOccupantSurcharge` di `pricing.helper.ts`; hard-cap validation di service; surcharge +20%/orang ekstra
- **Frontend**: dropdown 1â€“hardCap (STANDARD maks 4, LARGE maks 6); opsi ekstra bertanda "âš ï¸ tidak direkomendasikan"; warning merah jika > maxFree; `selectedRate` include surcharge real-time
- **Aturan D-24** dicatat di `docs/M02_KEPUTUSAN_OWNER.md` â€” extra bed memenuhi lantai kamar; hard cap ditolak sistem

### 2026-06-23 â€” Katalog publik & dashboard: wizard intercept, 3-kolom, category badge, kalender, login btn
- **GuestTopbar**: "Masuk Portal" dipindah ke `gx-nav-cta` (selalu visible di mobile â‰¤1100px, tidak hilang bersama nav)
- **Wizard intercept**: `GuestPreferenceWizard` mengambil alih halaman penuh saat user pertama masuk `/rooms`; katalog baru tampil setelah selesai/skip
- **Kartu kamar**: 3 per baris (`lg={4} md={4} sm={6}`), category badge overlay di foto (ðŸŒ¬ï¸/ðŸš¿/â„ï¸), roomSize chip (ðŸ“ Besar), slide btn â€¹/â€º muncul saat hover, auto-slide hanya saat hover
- **Legend kategori**: section di bawah grid menjelaskan Ekonomi/Standar/Deluxe/Mezzanine/Besar/Standar
- **AvailabilityTimeline**: header dirancang ulang (ikon+title+range), legend dot berwarna, baris alternating, icon sel lebih jelas (âœ“/DP/â—/âš™)
- CSS baru: `.rm-slide-btn`, `.rm-card-cat-badge`, `.rm-spec-size`, `.gpw-intercept-shell`, `.rm-category-legend`, `.avcal-header-left`, `.avcal-legend-dot`, dll

### 2026-06-23 â€” roomSize propagasi penuh: type, detail, tabel admin, detail publik, wizard check-in
- **`Room` type** di `frontend/src/types/index.ts` ditambah `category?`, `roomType?`, `roomSize?` â€” TS bersih
- **RoomDetailPage** (admin/owner/staf): metric tile "Ukuran kamar" + baris info "Kategori" & "Ukuran kamar" di tab Informasi
- **ResourceTable** `/rooms`: kolom `category` & `roomSize` tampil label Indonesia (Ekonomi/Standar/Deluxe, Standar/Besar)
- **PublicRoomDetailPage**: `getBathroomType`/`getCoolingType`/`getRoomSize` pakai enum `category`/`roomSize` (bukan text-regex) â€” konsisten dengan `publicRoomDisplay.ts`
- **StepRoomSelect** (wizard check-in): prop type diperluas + baris kategoriÂ·ukuran tampil di kartu kamar; `CheckInWizard.tsx` meneruskan field baru

### 2026-06-23 â€” Fitur publik: animasi hunian, wizard preferensi kamar, data real
- **Tingkat hunian animasi:** progress bar publik tampilkan `X%` dengan count-up cubic-ease 0â†’aktual; badge "âš¡ Sisa N kamar!" saat bookable â‰¤5
- **Free kWh dinamis:** FAQ & trust-item baca nilai dari `GET /settings/public-config` (endpoint baru `@Public()`); owner setting `freeElectricityKwhPerMonth` langsung terpantul tanpa redeploy
- **Copy heading lebih manusia:** 2 heading dashboard publik diperbarui agar terasa natural dan tidak marketing-copy
- **`RoomSize` enum + `GuestPreferenceSurvey` model:** schema Prisma diperluas; `prisma db push` + `prisma generate` UAT 5433 âœ…
- **Seed data real 13 kamar** (`seed-real.ts`): A,B,C,D,F1,F2,G,H,I,J,K,L,M â€” harga formula (Base 800k+KM 500k+AC 300k+Mezz 150k+Besar 200k); A+F1 AVAILABLE, sisanya OCCUPIED dummy tenant+stay
- **`GuestPreferenceWizard` (4 langkah):** KMâ†’Pendinginâ†’Ukuranâ†’Tipe, estimasi tarif, cocokkan kamar exact/near, simpan survey ke DB via `POST /public/bookings/survey` (`@Public()`)
- **Integrasi wizard di `/rooms`:** muncul di atas katalog (hanya publik), hilang setelah done/skip; onDone: set URL params bathroom/cooling + scroll ke `#rm-catalog`; gpw-* CSS 180+ baris navy-dark theme
- **TS frontend + backend:** keduanya 0 error âœ…

### 2026-06-22 â€” Audit A1 â€” Perbaikan halaman publik (10+3 task)
- **P1-CRIT** Validasi booking: phone XOR email (frontend+backend) â€” sesuai spesifikasi PUB-BOOKING-FORM M07
- **P2-CRIT** Hapus 959 baris dead CSS `gh-*` dari `11-public-pages.css` (tidak ada komponen pakai)
- **P3-CRIT** Publik sekarang buka `/rooms` â†’ katalog dedicated (kalender, compare, filter, pagination 12)
- **P4-HIGH** Halaman FAQ/Panduan baru di `/panduan` (database-driven, kategori, search by category)
- **P5-HIGH** Kurangi CTA hero: 3â†’2 tombol, hapus duplikasi WhatsApp di topbar
- **P6-HIGH** Empty state ulasan jujur "Belum ada ulasan" (bukan marketing copy)
- **P7-MED** Warning password sementara "HANYA ditampilkan SEKALI"
- **P8-MED** "7 menit" â†’ "Â±7 menit jalan kaki" di semua tempat
- **P9-MED** Alt text foto kamar deskriptif (tipe pendingin, KM)
- **P10-MED** Halaman ulasan dedicated `/reviews` + filter sort
- **+3 easy wins:** filter "Semua"â†’"Semua Kamar" + hint; info DP 30% di landing; placeholder foto ðŸ›ï¸ bukan K48
- **+4 rapihan:** link Ulasan di RoomsTopbar + GuestFooter; scroll-to-top button di landing; link /reviews di MobileShortcutNav
- **+3 hardening:** preserve scroll+filter katalog via sessionStorage (UX-02); token CSS publik di `00-tokens.css` + migrasi class kunci; UAT P-09..P-12 (panduan/reviews/rooms-public/booking-form)
- **+3 audit final:** tambah route title `/panduan` + `/reviews`; hapus unused import `PublicGuestDashboardPage` di RoomsRouteEntry; fix overlap scroll-top vs mobile booking bar; fix fallback `--gx-ink` di mobile booking
- **+2 UI/UX deep:** scroll progress bar di landing (UX-06); migrasi token CSS ke `.room-market-card`, `.rm-topbar`, `.rm-card` (UI-02 lite)
- **âœ… EKSEKUSI:** script `scripts/analyze-css-dups.mjs --fix` membersihkan 196 duplikasi CSS (1.096 baris, 24 KB) dari `11-public-pages.css`. Backup di `11-public-pages.bak.css`. Semua class kunci (`.gx-page`, `.gx-topbar`, `.gx-hero`) hanya 1 definisi. Build `frontend tsc` LULUS.
- **ðŸŽ¯ Playwright fix:** ganti `import.meta.url` â†’ `process.cwd()` di 8 file `.spec.ts` (inkompatibel dgn PW 1.61). Fix CSS comment `/* gx-* /rm-* /room-* */` di `00-tokens.css` yang ngebug parser postcss.
- **ðŸ”™ ROLLBACK:** `scripts/analyze-css-dups.mjs --fix` di-rollback (backup restore). Script hanya cek nama class, bukan isi properti â€” beda definisi punya property beda. Deduplikasi CSS harus manual + visual test.
- **â™»ï¸ Landing simplification:** ganti booking widget date/duration form â†’ info + CTA "/rooms"; hapus filter toolbar duplikat (4 chip baris) â†’ preview 4 kamar + "Lihat Katalog Lengkap"; ubah final CTA dari anchor `#kamar` â†’ link `/rooms`; mobile booking link ke `/rooms`; topbar "Cek Kamar" link ke `/rooms`.
- Build `npm --prefix frontend exec tsc --noEmit` âœ… | backend `tsc --noEmit` âœ…

### 2026-06-22 â€” Fase R selesai: R-01..R-30 UX audit implementation (29 task, R-12 deferred)
- R-01..R-07: public pages â€” hero, ulasan conditional, sticky CTA detail kamar, DP eksplisit, mobile grid 1-kolom, badge kamar available/occupied, anchor nav shortcut
- R-08..R-11: admin â€” placeholder text "sst", invoice overdue row highlight (`table-danger`/`table-warning`), tooltip "Bermasalah", COA confirm + warning banner
- R-13..R-18: tenant portal â€” routing /portal/checkout & /portal/renewal, NIK mask PDP, mobile nav 4 tab, accordion default open, empty state informatif, chart responsif
- R-19..R-24: staff â€” meter mobile scroll/card, guard toast, tab meter pindah, gudang empty state + WA CTA, foto upload prompt, WAITING task tooltip
- R-25..R-30: owner â€” role badge kolom tabel, notif grouping + filter tab + test data filter, meter filter bulan ini, bahasa aset seragam Indonesia, guard toast cross-role, chip "Hanya Owner"
- Build `cd frontend && npm run build` lulus âœ… (3711 modul, 44.16s)

### 2026-06-22 â€” UI/UX audit halaman publik (8T) = 8/8 lulus; total e2e 66/66
- **`public-ux-audit.spec.ts`** P-01..P-08: landing page (`/`), daftar kamar publik (`/rooms`), detail kamar publik, form booking tamu, mobile 375px, guard unauth (`/dashboard` â†’ `/login`), link lupa password aktif, rooms bebas error 500.
- Total e2e Playwright kumulatif: **66/66 lulus** (tenant 14 + admin 20 + staff 10 + owner-extra 14 + public 8).

### 2026-06-22 â€” UI/UX audit staff (10T) + owner-extra (14T) = 24/24 lulus
- **`staff-ux-audit.spec.ts`** S-01..S-10: dashboard staff, tiket mode-staff, staff-report, staff-warehouse, profil, notifikasi, room-detail, mobile, guard (staf tidak bisa akses `/invoices`/`/reports`/`/portal/*`).
- **`owner-extra-ux-audit.spec.ts`** O-01..O-14: loss-refunds, users, meter-readings, additional-services, service-interests, wifi-sales, ancillary-revenue, aset tetap, reminders, room-detail, check-in wizard, notifikasi, invoice-payments, guard portal-tenant.
- Total e2e Playwright kumulatif: **58/58 lulus** (tenant 14 + admin 20 + staff 10 + owner-extra 14).

### 2026-06-21 â€” UI/UX audit lengkap: tenant (14T) + admin/owner (20T) = 34/34 lulus
- **Playwright e2e**: `tenant-ux-audit.spec.ts` (T-01..T-14) + `admin-ux-audit.spec.ts` (A-01..A-20) â†’ **34/34 LULUS** (2 worker, headless).
- **Integration test cleanup**: `cleanupTestData` diperbaiki â€” urutan hapus sesuai RESTRICT FK (LoyaltyPointâ†’InvoicePaymentâ†’Invoice cascadeâ†’TenantDepositLedgerEntryâ†’Stay cascade). Script `cleanup-test-artifacts.js` ditambahkan.
- **Bug fix loyalty leaderboard**: test artifacts (kamar TEST-*, LoyaltyPoint, Invoice, DepositLedger) tidak lagi bocor ke produk setelah cleanup diperbaiki. A-13 memverifikasi leaderboard bersih dari kode TEST-*.
- **Guard terverifikasi**: tenant tidak bisa akses `/stays`, `/invoices`, `/reports`; admin tidak bisa akses `/portal/*`.

### 2026-06-21 â€” Fix test suite: cleanup mandiri + 175/175 lulus
- **Fix kritis `stays-lifecycle.integration.test.js`**: refactor setiap test buat kamar uji mandiri (`createTestRoom`) + `cleanupTestData` (hapus stay/invoice/schedule/room di `finally`). Root cause: TC3 set room OCCUPIED tanpa cleanup â†’ semua kamar DB UAT stuck OCCUPIED (karena seed hanya 20 kamar & semua terisi).
- **`repair-room-status.js`** ditambahkan (`test/`) untuk sinkron status kamar bila DB kotor pasca test crash.
- Total: **175/175 test lulus** â€” 159 unit + 16 integration (0 gagal).

### 2026-06-21 â€” Audit flow + test suite komprehensif (tiket, renewal, checkout, pengumuman)
- **4 unit test baru** (97 kasus): `tickets-state-machine`, `checkout-request-guards`, `renewal-guard-extended`, `announcements-logic` â€” cakupan state machine, role guard, deadline enforcement, tip flow, cross-block, window tayang.
- **2 integration test baru** (12 kasus via DB UAT): `tickets.integration` (siklus OPENâ†’DONEâ†’CLOSED, vendor, staf, pengumuman) + `renewal.integration` (decide YA/TIDAK, invoice DP, reject cancel, guard H+1).
- Total unit test naik: **159 test, 0 gagal** (`npm run test:unit` lulus bersih).

### 2026-06-21 â€” Fase S diperinci: plan detail backend-first + iterasi UI/UX via Vercel
- **S-00 (prasyarat)** ditambahkan: backend wajib live di cPanel sebelum Vercel bisa digunakan; dokumentasi dua mode kerja (lokal vs produksi).
- **S-01..S-06** diperluas dengan kode snippet konkret, gate test per task, dan urutan eksekusi yang jelas: kerjakan UI/UX lokal dulu (S-01/04/05) â†’ deploy backend â†’ setup Vercel â†’ setiap git push auto-deploy 30 detik.

### 2026-06-21 â€” Fase S dirancang: Multi-Portal Vercel + Mobile-First + PWA Offline
- **Arsitektur:** 3 Vercel project terpisah (tenant/staff/admin) dari satu codebase; Owner tetap di cPanel desktop.
- **S-01..S-06** ditambahkan ke M10: env gate login, CORS Vercel, setup manual Vercel+DNS, mobile tenant, mobile staff, PWA offline-aware (Workbox + OfflineStatusBanner).

### 2026-06-21 â€” Audit Mendalam: 11 Bug Kritis Diperbaiki (backend + frontend)
- **Fix #1** `tenant-bookings.service.ts`: KTP gate ditambah di jalur booking â€” `ConflictException` bila `KTP_ACTIVATION_GATE_ENABLED=true` dan `ktpVerifiedAt == null`.
- **Fix #2** `meter-readings.service.ts` + `invoices.service.ts`: meter billing dibungkus `$transaction` atomik; `createWithLinesAndIssueTx(tx,...)` diekstrak sebagai metode publik agar dapat menerima `tx` eksternal.
- **Fix #3** `payment-submissions.service.ts`: pindahkan cek `existingPending` ke dalam `$transaction` + tambah `SELECT ... FOR UPDATE` pada invoice untuk cegah race condition TOCTOU.
- **Fix #4** `stays.service.ts` cancel(): DP hangus (`downPaymentForfeitedAt`) otomatis di-set dan `postDownPaymentForfeitTx` dipanggil saat booking dibatalkan sebelum promoted.
- **Fix #5** `payment-submissions.service.ts` approve(): `journalPending` dideklarasikan di luar `$transaction` sehingga dapat di-set di dalam closure catch dan dikembalikan ke caller.
- **Fix #6** `wifi-sales.service.ts` + `expenses.service.ts`: tambah `Logger`; ganti `.catch(() => undefined)` â†’ `.catch((err) => logger.warn(...))` agar kegagalan jurnal tercatat.
- **Fix #7** `InvoicesPage.tsx`: filter server-side (`status`, `dueDateFrom`, `dueDateTo`) dikirim ke backend; `queryKey` sertakan filter; `useEffect` reset halaman saat filter berubah.
- **Fix #8** `StaysPage.tsx`: NIK tenant disembunyikan untuk role STAFF (UU PDP) â€” hanya OWNER/ADMIN yang melihat `NIK: ...`.
- **Fix #9** `stays/dto/stay.dto.ts`: `agreedRentAmountRupiah` `@Min(0)` â†’ `@Min(1)` mencegah sewa Rp 0.
- **Fix #10** `ActionKanbanBoard.tsx`: `useEffect` sync `colMap` saat `items` prop berubah â€” item baru dari React Query refresh masuk kolom default; item stale dihapus; posisi drag manual dipertahankan.
- **Fix #11** `tickets.service.ts` + `tickets.controller.ts`: vendor tickets dapat `markDone` langsung dari `OPEN` (skip `IN_PROGRESS`); TENANT dapat menutup tiket miliknya yang sudah `DONE` via `POST :id/close`; controller tambah `UserRole.TENANT` ke `@Roles`.

### 2026-06-20 â€” Fase Q: Performa & Stabilitas UI/UX (Q-01..Q-07 selesai)
- **Q-01** backend rebuild dist â†’ `dist/modules/admin/` ter-generate; `/api/admin/dashboard/aggregate` responsif (sebelumnya 404).
- **Q-02** `DashboardAdmin.tsx` aggregateQuery: `retry: 1, retryDelay: 1000` â€” error alert tampil â‰¤ 3 detik.
- **Q-03** `stayPredicates.ts` `listAllActiveStaysForBookings`: hapus `do...while` 50-halaman â†’ single `listStays({ limit: 200 })` (KOST48 maks 48 kamar).
- **Q-04** `InvoicesPage.tsx` staysQuery: `enabled: showCreate && canManageFinance` â€” 500-stays tidak di-fetch saat mount, hanya saat modal dibuka.
- **Q-05** `StaysPage.tsx` checkout queries: `staleTime: 30_000` â€” tidak refetch setiap mount ulang.
- **Q-06** Inventory empty state informatif: `ResourceConfig.emptyMessage?` ditambah; 3 pesan CTA ditambahkan ke `inventory.ts`; `ResourceTable.tsx` render `config.emptyMessage`.
- **Q-07** `PushToggle.tsx`: prefetch VAPID key via `useEffect`; bila `!enabled` â†’ Alert info biru (bukan error merah).

### 2026-06-20 â€” Fase Q: Investigasi & Spesifikasi Performa UI/UX
- **Investigasi Playwright** â€” screenshot 21 halaman (publik, login, admin, owner, mobile, tiket, inventory, notifikasi) via headless Chromium; temukan 7 bug/bottleneck: (1) `dist/modules/admin/` missing â†’ 404 aggregate, (2) sequential do-while fetch loop di stayPredicates, (3) 500-stays mount-query di InvoicesPage, (4) retry default 7s+ sebelum error alert, (5) double checkout query tanpa staleTime, (6) inventory empty state kosong, (7) PushToggle tanpa graceful fallback.
- **Fase Q dirancang** â€” Q-01..Q-07 ditambahkan ke M10 dengan spesifikasi lengkap (file path, baris, kode sebelum/sesudah, anchor grep, gate); siap dieksekusi AI.

### 2026-06-20 â€” Fase P: Pola UI Modern (P-01..P-06)
- **P-01** `DashboardAdmin.tsx`: tambah `<SegmentedTabs>` 3-mode (list/board/kalender), state `viewMode` + persist `localStorage('admin-queue-view')`; ekspor `ActionKanbanBoard` + `ActionCalendar` dari `command-center/index.ts`.
- **P-02** `ActionCalendar.tsx`: lazy-load FullCalendar 6.x (`Promise.all` bundle 3 modul); events dari `items.filter(i => i.deadlineIso)` â†’ warna per prioritas; `eventClick` â†’ `navigate(actionTo)`; tambah `deadlineIso?: string` ke `ActionQueueItem` + `makeQueueTime` kirim `raw.toISOString()`.
- **P-03** `ActionKanbanBoard.tsx`: `@dnd-kit/core` â€” `DndContext`, `useDroppable`, `useDraggable`; `PointerSensor(distance:5)` + `KeyboardSensor`; `colMap` state, `onDragEnd` update kolom; visual `isOver` highlight biru.
- **P-04** Buat `TanStackTable<T>` generic wrapper (`@tanstack/react-table@8.21.3`): sort + column-visibility toggle; accessible clickable rows (`tabIndex/role/aria-label/onKeyDown`); pilot di `InvoicesPage.tsx` (7 kolom, replace bootstrap Table).
- **P-05** Buat `MobileBottomNav.tsx` â€” fixed-bottom `<nav>` hanya tampil `@media (max-width:768px)`; NavLink stage-aware via `getNavigationLinks('TENANT', stage).slice(0,5)`; `safe-area-inset-bottom` aware; `tenant-workspace-content` tambah `padding-bottom: calc(68px + env(safe-area-inset-bottom))` pada mobile; integrasikan ke `AppLayout` blok TENANT.
- **P-06** Install `cmdk@^1.1.1`; buat `CommandPalette.tsx` (`Command.Input/List/Group/Item/Empty`); grup Navigasi (role-aware dari `navigation.ts`) + Aksi Cepat (5 shortcut); lazy-load di `AppLayout` via `React.lazy + Suspense`; shortcut `Ctrl+K`/`Cmd+K` via `useEffect` keydown; CSS overlay+dialog di `10-misc.css`.
- **Gate:** `npx tsc --noEmit` âœ… semua P-task.

### 2026-06-20 â€” Fase O: Design System & Token (O-01..O-08)
- **O-01** `00-tokens.css`: tambah skala primitif gray/blue/green/red/amber/purple/orange (50â€“900) + alias semantik (`--color-primary`, `--text-primary`, `--bg-surface`, dll.); @deprecated `--k48-primary`, `--ops-blue-600`.
- **O-02** Buat `config/chartPalette.ts`: `CHART_COLORS` + helper `cc(key)` baca CSS var runtime; ganti semua hex hardcode di `OwnerDashboardPage.tsx` (BarChart + LineChart) pakai `cc(...)`.
- **O-03** `00-tokens.css`: tambah `--space-1..12` (spacing scale) + `--radius-sm/base/full` + `--tap-min: 44px`; tambah `--red-200`, `--amber-200`, `--green-200` ke skala primitif.
- **O-04** CSS Modules pilot `AdminHealthBar.module.css` (scoped `.bar/.chip/.toggle/.detailGrid/.detailItem` + tone variants); pindah 46 baris dari `09-finance.css` â†’ `AdminHealthBar.module.css`; `AdminHealthBar.tsx` pakai `import styles from ...`.
- **O-05** Pisah `10-misc.css`: ekstrak V5.8.3+V5.8.4 â†’ `15-settings.css`, V5.8.9 â†’ `14-reports.css`; tambah 2 @import ke `styles.css`.
- **O-06** Install `lucide-react@1.21.0`; ganti emoji ikon UI di `AdminHealthBar.tsx` (âš â†’AlertTriangle, ðŸ“‹â†’ClipboardList, ðŸ“Œâ†’Pin, ðŸ›â†’BedDouble, ðŸŽ«â†’Ticket, ðŸ“¦â†’Package, âœ…â†’CheckCircle).
- **O-07** Install `date-fns`; refactor `utils/dateTime.ts`: `addHoursToDate` â†’ `addHours`, `parseDateTimeSafe` â†’ `isValid`, duration â†’ `intervalToDuration`; tambah `daysFromToday` (`differenceInCalendarDays`).
- **O-08** Touch target â‰¥44px: `.staff-filter-chip` `min-height: 30px â†’ var(--tap-min)`; `.row-arrow-cell` + `.clickable-row` tambah `min-height: var(--tap-min)`; `.topbar-profile-trigger`/`.staff-user-profile-trigger` tambah `min-height/min-width: var(--tap-min)`.
- **Gate:** `npx tsc --noEmit` âœ… (frontend + backend).

### 2026-06-20 â€” Fase N: Ramping Dashboard & Navigasi (N-01..N-06)
- **N-01** `OwnerDashboardPage.tsx`: merge `extraSignals` (meter due + readiness) ke dalam panel "Butuh perhatian" â€” badge count & empty-state kini gabungkan kedua sumber sinyal.
- **N-02** Buat `AdminHealthBar.tsx` (chip ringkas + Bootstrap Collapse); hapus `AdminContinuityStrip`, `AdminTodayStatusStrip`, `AdminOperationsCommandQueue`, dead CSS `admin-ops-guardrails`; `ActionQueueTable` dipindah ke hero.
- **N-03** Toggle density Ringkas/Lengkap di Admin (`âŠŸ/âŠž`): `dense` state + `localStorage` persist (`admin-density`); `AdminWorkspaces` terima prop `dense`, `useClientPagination` page size 10â†’3.
- **N-04** `RoleWorkspaceTabs`: hapus tab duplikat (Ringkasan Admin + 2 tab Owner yg sudah di sidebar); Admin tersisa 2 tab, Owner tersisa 1 tab.
- **N-05** Backend: buat `AdminDashboardModule` (`GET /admin/dashboard/aggregate`) + `OwnerDashboardModule` (`GET /owner/dashboard/aggregate`), export `FinanceService`; Frontend: 9+ query Admin â†’ 1, 3 query Owner â†’ 1; hapus `computeMeterDue` klien.
- **N-06** Install `@axe-core/playwright`; buat `e2e/a11y/axe-audit.spec.ts` (public + katalog, target â‰¤5 critical/serious); tambah `"test:a11y"` script ke `package.json`.
- **Gate:** `npx tsc --noEmit` âœ… Â· `npm run build` âœ… semua N-task.

### 2026-06-20 â€” Fase M: Quick Wins A11y & Polish (M-01..M-06)
- **M-01** `AdminWorkspaces.tsx`: ganti `window.location.assign` â†’ `useNavigate()` di `AdminStaffFrontlineList`.
- **M-02** Buat `ConfirmProvider` + `useConfirm()` (context + promise); daftarkan di `main.tsx`; ganti 9 `window.confirm` di 6 file (`AppLayout`, `FacilityManager`, `TenantProfilePhotoCard`, `MyStayPage`, `WifiOrderPage`, `OwnerSettingsPage`).
- **M-03** `01-base.css`: tambah blok `@media (prefers-reduced-motion: reduce)` global di akhir file.
- **M-04** `01-base.css` + `11-public-pages.css` (9 occurrences): typo `Cormorant Garant` â†’ `Cormorant Garamond`; `00-tokens.css`: hapus `DM Mono` (tidak di-@import) â†’ fallback `JetBrains Mono`.
- **M-05** Buat `ClickableRow.tsx` (tabIndex + onKeyDown + aria-label); pasang di `AdminWorkspaces`, `InvoicesPage`, `AncillaryRevenuePage`, `TicketsPage`, `SmartChartPanel`.
- **M-06** `ToastProvider.tsx`: refactor ke `ToastItem` per-toast dengan timer per-item; durasi 3500 â†’ 6000ms; pause hover/focus; ARIA `role="status"` + `aria-live="polite"` untuk success/info, `role="alert"` + `aria-live="assertive"` untuk danger/warning.
- **Gate build:** `npm run build` âœ… 0 error (fix scope `useConfirm` di `ActiveStayContent` bukan `MyStayPage`).

### 2026-06-20 â€” Audit UI/UX: Owner & Admin Dashboard
- **OwnerDashboardPage**: hapus `OwnerActionStrip` + `AssistantPanel` sinyal (duplikat); gabung 2 panel AI menjadi 1 (`generateBrief`); hapus 3 tombol quick-action redundan; tambah tooltip kriteria grade badge; label "Kesiapan Go-Live" â†’ "Kesiapan Akuntansi"; skor bisnis kini tampil hint `(0â€“100)`.
- **DashboardAdmin**: hapus `AdminHealthChips` (6 chip duplikat lane) + `admin-ops-guardrails` (4 blok teks statis); `AssistantPanel` kini full-width; hapus baris `detail` di `AdminTodayStatusStrip`; label "Finance" â†’ "Keuangan".
- **AppLayout**: toggle `Kokpit Owner / Area Admin` kini muncul di mobile topbar (di bawah search bar), tidak hanya di sidebar Offcanvas.
### 2026-06-22 â€” docs: audit & bersihkan M-file (dedup, stale, sinkronisasi)
- **docs(audit):** Audit 14 M-file + CODEMAP terhadap kode nyata. 14 isu ditemukan (4 critical, 5 stale, 3 duplikasi, 2 minor). Semua difix: M17 status L-08/10/11/16 ditandai âœ…, M01 model count 41â†’55 + modul 33+â†’38, CODEMAP 39â†’38 modul + 54â†’55 model, M02 OWN-STRUKTUR-PHASE2 ditandai selesai, M03 Â§7 auto-ops diupdate ke 5 sweep service, M01 Â§4 tabel auto-ops diganti sweep.
- **docs(arsip):** M17 + fase-l-specs/ dipindahkan ke `archieve/2026-06-20_fase_selesai/` karena Fase L selesai semua. Root docs lebih ramping.

### 2026-06-20 â€” ui(Fase L): L-08, L-10, L-11, L-16, L-19
- **frontend(L):** PublicRooms mendapat filter mobile collapse, compare counter x/3, carousel touch, dan pagination ellipsis; tiket tenant punya SafeImage lightbox; Reports lazy-load `UnlockedFormalReports` via Suspense skeleton.
- **finance(L):** Accounting setup punya checklist read-only dari query existing; Asset Register memindahkan form tambah aset ke modal dengan validasi tetap aktif. Gate: `npm.cmd run build` PASS + PWA verified.

### 2026-06-20 â€” feat(Fase L): eksekusi L-01..L-20 UI/UX fixes
- **L-01:** `App.tsx` â€” `return null` â†’ `<PageLoadingSkeleton />` di `RequireRoles` + `TenantBookingRouteGuard`.
- **L-02/L-18:** `CashflowPage.tsx` â€” tambah EmptyState operasi kas kosong + import. `FinancialRatiosPage.tsx` â€” import `useNavigate`+`Button`, tambah CTA setup akuntansi bila belum formal.
- **L-03:** `StaffRoutinesAdminPage.tsx` â€” `Col md={3}` â†’ `Col xs={12} md={6} lg={3}` (checkbox). `ReminderPreviewPage.tsx` â€” `maxWidth:250` â†’ `minWidth:200,maxWidth:320` (4 lokasi, replace_all).
- **L-04:** `CheckInWizard.tsx` â€” tambah `isTenantsError` dari query. `StepTenantSelect.tsx` â€” prop `isError?`, Alert fallback saat query gagal.
- **L-06:** `GuestBookingSuccess.tsx` â€” state `copied`+`copyError`, `handleCopyPassword`, tombol "ðŸ“‹ Salin"/"âœ… Disalin".
- **L-07:** `ResetPasswordPage.tsx` â€” timeout redirect 1200ms â†’ 2000ms + teks pesan diperbarui.
- **L-09:** `OwnerDashboardPage.tsx` â€” konstanta `CARD_ERROR_VALUE='Gagal'`, kartu meter-due+readiness pakai `CARD_ERROR_VALUE` + helper jelas + tone `risk` saat error.
- **L-12:** `LoyaltyAdminPage.tsx` â€” tambah `REWARD_TYPE_LABEL` map, dropdown + kolom tabel pakai label Indonesia. Save button dinamis "Tambah Reward"/"Simpan Perubahan".
- **L-13:** `TicketsStaffMode.tsx` â€” "Mulai Kerjakan" â†’ "Memproses..." saat `isPending`. `StaffRoutinesAdminPage.tsx` â€” tambah `reactivateMutation` + tombol "Aktifkan"/"Nonaktifkan" dengan loading state.
- **L-14:** `StayDetailPage.tsx` â€” tukar urutan Alert: warning keuangan (hasUnpaid/overdue) naik ke atas "Aturan perpanjangan" (info statis).
- **L-15:** `TenantWorkspaceTabs.tsx` â€” announcement strip truncate 2 baris `-webkit-line-clamp`. `MyManualPage.tsx` â€” Accordion `defaultActiveKey` buka FAQ pertama tiap kategori.
- **L-17:** `01-base.css` â€” CSS `:focus-visible` global + `.staff-room-card:focus-visible`. `AppLayout.tsx` â€” `aria-pressed` pada 4 tombol owner-view-toggle (mobile+desktop).
- **L-19:** `AssetRegisterPage.tsx` â€” `ALIGNMENT_STATUS_TOOLTIP` + `title` pada badge alignment. `LoyaltyAdminPage.tsx` â€” save button teks kontekstual.
- **L-20:** `ProfilePage.tsx` â€” `Form.Text` "Kosongkan jika tidak dipakai" di tip e-wallet. `OwnerSettingsPage.tsx` â€” error upload pakai label fasilitas (bukan slug). FAQ modal `autoFocus` ke field Pertanyaan.

### 2026-06-20 â€” audit(Fase L): audit UI/UX menyeluruh 75+ halaman
- **audit(L):** 75+ halaman diaudit via 5 agen paralel. 20 task (L-01..L-20) dikategorikan: loading state, mobile responsiveness, error display, aksesibilitas, wording, dan isu per halaman.
- **docs(M17):** `docs/M17_FASE_L_UIUX_AUDIT.md` BARU â€” laporan lengkap per halaman + matriks prioritas. Checklist Fase L ditambah di M10.

### 2026-06-20 â€” audit(Fase K): audit total 12 jalur + fix keamanan P1-P3
- **audit(12-jalur):** 97 temuan (24 critical, 42 medium, 31 low). Plan: `docs/M16_PASCA_AUDIT_PLAN.md`. 5 keputusan owner diambil.
- **backend(P1):** tambah `RolesGuard` di loyalty, notifications, push controller.
- **backend(P2):** fix DTO validation bypass multipart `submitWithProof` â€” validasi class-validator manual.
- **backend(P3):** hapus `STAFF` dari 11 endpoint sensitif (tenants, users, invoices, expenses, invoice-payments, stays POST). OWNER/ADMIN only.
- **docs(M16):** `docs/M16_PASCA_AUDIT_PLAN.md` BARU â€” 13 task P4-R5 + 31 backlog.

### 2026-06-20 â€” fix(Fase J): hardening owner-ai PDP, no-partial, dan gating frontend
- **backend(J0-J2):** tambah `owner-ai.helpers.ts`, safety test `owner-ai-safety.test.js`, guard AI payment sadar FULL/DP/SETTLEMENT, dan masking NIK di teks prompt KTP OCR sebelum DeepSeek. `test:unit` juga dipersempit ke `test/unit/**/*.test.js` agar tidak menjalankan integration test yang butuh DB UAT.
- **frontend(J3)+audit(J4):** `AiAssistButton` error non-blocking + retry, `AiResultPanel` tampilkan mode/model/fallback/warnings, tombol AI digate role+configured, dan audit 12 endpoint owner-ai dibukukan di M09. Gate: backend `npx.cmd tsc --noEmit`, `npm.cmd run build`, `npm.cmd run test:unit` PASS; frontend `npm.cmd run build` PASS.

### 2026-06-20 â€” docs(Fase J): dossier hardening AI pra-go-live (jaring pengaman owner-ai)
- **docs(M15):** `docs/M15_FASE_J_HARDENING_AI.md` BARU â€” 5 task J0-J4 (detail untuk AI eksekutor lemah): J0 ekstrak guard murni â†’ `owner-ai.helpers.ts`, J1 unit test PDP mask-NIK + uang no-partial (`owner-ai-safety.test.js`), J2 luruskan guard no-partial AI sadar DP booking, J3 hardening FE AI non-blocking + gating, J4 audit PDP 12 endpoint â†’ M09.
- **temuan audit kode 2026-06-20:** modul `owner-ai/` (Fase G, 15 file) selesai TANPA test; fungsi pengaman murni terkubur `private`; DIVERGENSI guard no-partial â€” AI `reviewPaymentSubmission` (Â±l.1150) salah me-REJECT DP booking sah vs domain `approveSubmission` (Â±l.567-587) yang sadar DP. Aman uang (over-reject) tapi rekomendasi salah.
- **docs(M10/M01/M12):** Fase J ditambah ke ANTRIAN + status table (dedup baris Fase I ganda) + router M01 + status M12. Backend/FE tidak disentuh (fase dokumentasi).

### 2026-06-20 â€” ui(Fase I): I1â€“I6 de-duplikasi navigasi + onboarding tenant
- **ui(I1):** hapus `AdminAreaInternalMenu` + `AdminAreaMenuItem` type + `activeAreaMenuItems` dari `DashboardAdmin.tsx` (484 baris, dari 551). Sub-menu chip 20+ item yang 100% duplikat sidebar dihapus. Teks header diupdate: "Gunakan sidebar kiri untuk membuka halaman detail."
- **ui(I2):** unifikasi `StaffTopWorkspaceNav` â€” import `getNavigationLinks('STAFF')` dari `navigation.ts`, ganti hardcode 4 tab dengan source tunggal. Tambah tab "Tugas" (`/tickets`) + key `tickets` di counts.
- **ui(I3):** tambah `/meter-readings` ke `activePaths` sidebar "Kamar & Stok" di `navigation.ts`.
- **feat(I4):** komponen baru `GettingStartedGuide.tsx` â€” 3 langkah orientasi tenant (browsing: pilih kamarâ†’bookingâ†’bayar; booking: pantauâ†’bayarâ†’kunci). Render di `TenantWorkspaceTabs`.
- **ui(I5):** breadcrumb segmen pertama jadi `<NavLink to={defaultRoute}>` di `AppLayout.tsx`.
- **ui(I6):** verifikasi guide strip tenant adaptif (no-op, sudah benar).
- **Gate:** `npm run build` PASS (43s, 115 chunks, PWA verified). Backend tidak disentuh.
- **docs:** M14 dossier SEARCH/REPLACE siap copas; M10 centang I1-I6 [x]; M11 changelog ini.

### 2026-06-20 â€” docs(Fase I): dossier navigasi & onboarding + audit UI/UX total
- **docs(M14):** `docs/M14_FASE_I_NAVIGASI_ONBOARDING.md` â€” 6 task I1-I6: hapus AdminAreaInternalMenu (duplikasi sidebar), unifikasi StaffTopWorkspaceNav dengan staffSections, ekspos rute tersembunyi (/expenses, /meter-readings), GettingStartedGuide tenant, breadcrumb interaktif, guide strip adaptif.
- **docs(M10):** Fase I ditambah ke ANTRIAN + ringkasan + peta rujukan. Fase G dan H ditandai **selesai**.
- **audit:** audit UI/UX total selesai â€” tidak ditemukan auto-trigger AI, semua panggilan AI di balik button. 3 lapis navigasi paralel teridentifikasi (sidebar â†’ menu area â†’ sub-menu chip).

### 2026-06-20 â€” css(Fase H H6): hapus CSS dead di 08-admin.css
- **css(H6):** 7 edit bedah di `08-admin.css` â€” hapus `.admin-area-tabs` (layout 6 & 7 kolom lama), `.admin-area-link-grid` (grid pintasan lama), `.admin-primary-tabs` (sticky tabs 6 kolom lama), dan semua referensinya di `@media` block. Selector live (`.admin-sla-mini-note`, `.admin-workspace-topbar`, `.admin-today-status-strip`, dll.) dipertahankan. `12-owner.css` tidak ada selector mati.
- **Gate:** `npm run build` PASS (19 s, 115 chunks, PWA verify OK). Backend tidak disentuh.

### 2026-06-20 â€” ui(Fase H H4+H5): unifikasi AI panel + compact Owner Dashboard
- **ui(H4):** `AiAssistButton` (`generateBrief`) ditambah di `DashboardAdmin.tsx` area overview â€” conditional bila API key `configured` (`aiStatusQuery`). `AssistantPanel` sinyal (`ownerAssistantItems` dari `data.signals`) ditambah di `OwnerDashboardPage.tsx` di bawah KPI cards.
- **ui(H5):** tren chart `.owner-trend-panel` dibungkus `{viewMode === 'full' ? ... : null}` (disembunyikan di mode Ringkas). 3 quick-action buttons "Buka Laporan / Buka Area Admin / Analisa Pasar" ditambah setelah row sinyal.
- **Gate:** `frontend npm run build` PASS (39 s, 115 chunks, PWA verify OK). Backend tidak disentuh.

### 2026-06-20 â€” ui(Fase H): compact Ownerâ†”Admin (H1â€“H5 per M13) SELESAI
- **ui(H1):** sidebar Kokpit Owner 18â†’7 item, 1 grup "Keputusan Owner" (`navigation.ts`). Tanpa hilang fitur: `/loss-refunds` (Refund Kalah-Cepat, OWNER-only) + `/finance/assets` digabung ke `activePaths` "Akuntansi & Aset"; `/users`+`/tenants`+`/additional-services`+`/service-interests` digabung ke "Akun & Layanan". Pengumuman pindah ke tombol ðŸ“£ topbar (kondisi `isAdmin||isOwner`, `AppLayout.tsx`).
- **ui(H2):** dashboard admin 6â†’3 area â€” RingkasanÂ·Penghuni&UangÂ·Operasional (`DashboardAdmin.tsx`: type/areas/normalize/match/needs*/queries/menu/charts/JSX; `RoleWorkspaceTabs.tsx`: buildAdminTabs + OWNER_TABS jadi 3, match mencakup semua route). H3 (merge Minatâ†’Layanan) & H4 (hapus dup finance) selesai otomatis via H1. H5 polish: `@media 480px .role-workspace-tabs` (`12-owner.css`).
- **Gate:** `frontend npm run build` PASS Â· `backend npx tsc --noEmit` PASS (0 perubahan backend/schema/API). DI-DEFER (di luar scope M13, owner belum minta): unifikasi AI panel admin & owner-dashboard compact mode.

### 2026-06-22 â€” docs(Fase H UI/UX Compact): spesifikasi + checklist antrian
- **docs(M13):** `docs/M13_FASE_H_UIUX_COMPACT.md` â€” 6 task H1-H6: compact owner sidebar (19â†’7), dashboard admin (6â†’3 tab), merge Minat+Layanan, unifikasi AI panel, owner dashboard landing page, CSS polish. Semua frontend-only, tidak sentuh backend/schema.
- **docs(M10):** Fase H ditambah ke ANTRIAN dengan 6 task + UAT checklist.
- **docs(M01, CODEMAP):** referensi M13 ditambah.

### 2026-06-19 â€” G9: AI Draft Queue (schema S-6)

- **G9 ðŸ§¬** Model `AiDraft`+`AiDraftStatus` (migration additive `20260619140000_ai_draft_queue`). Modul terpisah `AiDraftService`/`AiDraftController`: `POST/GET /owner-ai/drafts`, `GET :id`, `POST :id/review` (APPLIED/REJECTED), `POST run/expire` (retention 60 hari). FE `api/aiDrafts.ts` + tombol "Simpan sebagai draft" di `AiResultPanel` (wired di KTP validator) + tab "Antrean Draft AI" di OwnerSettings. resultJson bersih (PDP).

### 2026-06-19 â€” G7: AI Settings, Budget & Observability

- **G7** GET /owner-ai/usage (usage per-fitur in-memory + 20 jejak AuditLog.meta.ai via jsonb_exists) + POST /owner-ai/test-connection (OWNER, latency+model, tanpa bocor API key). Tab "AI & Biaya" di OwnerSettingsPage: status/enabled/manual-only/model/limit, tes koneksi, usage per fitur, jejak keputusan AI.

#### 2026-06-19 â€” G3: Payment Review Assistant

- **G3** POST /owner-ai/payment-submissions/:id/review-draft: reviewPaymentSubmission() â€” no-partial deterministic guard BEFORE AI call, snapshot submission+invoice+stay, deepseekChat json:true. Tombol "Bantu Review AI (DeepSeek)" di ReviewPaymentModal.

## 2026-06-19 - G6: Ops & Inventory AI Draft

- **G6** POST `/owner-ai/tickets/:id/action-draft`, `/owner-ai/inventory/reorder-draft`, dan `/owner-ai/staff-field-reports/:id/review-draft`: snapshot operasional read-only, prompt ops-inventory, normalisasi schema, dan fallback rule-based. Tidak assign staf, tidak close tiket, tidak membuat movement/purchase/expense.
- Frontend: tombol "Saran AI" di detail tiket Owner/Admin dan "Cek Stok AI" di shell inventaris; hasil tampil di `AiResultPanel`, aksi final tetap lewat tombol existing.

### 2026-06-19 â€” Demografi Customer (teranonim, marketing)

- **Demografi** GET /market-analysis/demographics (OWNER/ADMIN): `demographicsSnapshot()` agregat TERANONIM dari Tenant (rentang usia dari birthDate, gender, top 10 provinsi/kota asal, top 10 pekerjaan) + coverage â€” tanpa NIK/nama/alamat (UU PDP, keputusan owner). Tab "Demografi Customer" di MarketAnalysisPage (`DemographicsPanel.tsx`).
- **ðŸ§¬ Schema (owner-approved):** `Tenant.originProvince String?` (migration `20260619120000_tenant_origin_province`, additive nullable) + field di form tenant (people.ts) & DTO; demografi breakdown per provinsi.

### 2026-06-19 â€” G2: Finance AI Analyst

- **G2** POST /owner-ai/finance/analyze: buildFinanceSnapshot() raw SQL dari JournalLine, analyzeFinance() dengan deepseek-v4-pro, fallback rule-based. Tombol "Analisa Keuangan AI" di AccountingSetupPage (OWNER only).

### 2026-06-19 - G4: Expense Receipt OCR Draft

- **G4** POST `/owner-ai/expenses/receipt-draft`: teks OCR nota divalidasi, dirapikan DeepSeek/fallback menjadi draft expense, dinormalisasi ke enum existing, dan tidak membuat jurnal.
- Frontend `/expenses`: tambah OCR lokal `tesseract.js`, preview teks OCR, tombol "Rapikan Draft AI", prefill form expense existing, plus `AuditLog.meta.ai` kecil saat draft dipakai untuk simpan.

### 2026-06-19 â€” G5: KTP OCR Validator

- **G5** POST /owner-ai/tenants/:id/ktp-ocr-validate (OWNER/ADMIN): validasi TEKS OCR KTP vs data tenant. PDP â€” hanya teks (bukan gambar/base64, ditolak), NIK tenant & hasil ter-mask `************1234`. Cek deterministik backend-menang (NIK 16 digit + cocok tenant) + demografi dari struktur NIK (tgl lahir/gender) tanpa AI; DeepSeek json:true menormalkan + nama match; fallback rule-based. Komponen `KtpOcrValidateCard` (OCR lokal tesseract, gating role+configured) di StepTenantSelect check-in. Verifikasi final tetap tombol existing â€” AI tidak auto-verify.

### 2026-06-19 â€” G1: Owner Executive Brief

- **G1** POST /owner-ai/brief: service buildBriefSnapshot() query Prisma (rooms, overdue, pending, tickets, meter), generateBrief() dengan deepseekChat json:true, fallback rule-based. Tombol "Buat Brief AI" di OwnerDashboardPage dengan AiResultPanel.

### 2026-06-19 â€” G0: AI Safety Foundation

- **G0** deepseek.client.ts: upgrade model default ke deepseek-v4-flash, return type DeepseekChatResult (content+model+usage), opsi json:true+thinking, backward compat dengan market-analysis.
- Modul baru owner-ai/: controller status GET /owner-ai/status, service rate-limit+env guard, hash util stableHash.
- Frontend: 4 komponen AI (AiCostBadge, AiResultPanel, AiApprovalDrawer, AiSourceSnapshot), API getOwnerAiStatus().
- Env: tambah 9 var Fase G (AI_FEATURES_ENABLED, AI_MANUAL_ONLY, dll) di .env.production.example.


> Dipadatkan dari `docs/CHANGELOG.md`

### 2026-06-19 â€” docs(Fase G AI Owner/Admin): manual-only approval copilot
- Tambah `docs/M12_AI_OWNER_ADMIN.md` dan sinkron `CLAUDE.md`, `M01`-`M11`, `CODEMAP`: DeepSeek/API AI berbayar hanya lewat tombol manual Owner/Admin, output berupa draft/rekomendasi, aksi final tetap approval manusia, dengan guard token, PDP, fallback, dan audit `meta.ai`.
- Backlog Fase G G0-G9 disiapkan detail: safety foundation, owner brief, finance analyst, payment review, OCR expense/KTP, ops inventory, settings budget, FAQ/manual generator, dan optional `AiDraft` [SCHEMA] jika owner approve.

### 2026-06-19 â€” feat(Fase E Polish & Teknis): 6 task selesai â€” privacy UAT, split auto-ops & stays, integration test, E2E, evaluasi
- **E1b:** TEN-GAMIF privacy â€” verifikasi UAT ranking & leaderboard anonim; backend hanya expose kode kamar/poin/skor tanpa PII.
- **E3a:** Split `auto-ops.service.ts` (1.819â†’235 baris) â€” 5 sweep service (booking, stay, renewal, accounting, maintenance) + orchestrator.
- **E3b:** Split `stays.service.ts` â€” ekstrak 5 metode renewal ke `StaysRenewalService`; proxy via stays.service; renew-requests pakai StaysRenewalService langsung.
- **E3c:** Integration test skeleton `test/integration/stays-lifecycle.integration.test.js` (TC1 bookingâ†’huniâ†’checkout hidup, TC2-4 placeholder) + script `test:integration`.
- **E3d:** E2E Playwright â€” `playwright.config.ts` + 3 spec (public-pages, booking-flow, tenant-portal) + script `test:e2e`.
- **E3e:** `docs/FASE_E_EVALUASI_ARSITEKTUR.md` â€” 4 item: refresh token MEDIUM, CSP LOW, WA/Email LOW, event bus VERY LOW.

### 2026-06-19 â€” feat(Fase B publik/tenant): aset publik & brosur owner-managed
- **Fase B 100%:** endpoint `marketing-assets` + tab Owner Settings "Aset Publik" mengelola hero, profil/galeri, spanduk, brosur depan/belakang; landing page memakai upload owner dengan fallback aset statis. Gate: BE `npx.cmd tsc --noEmit` PASS, FE `npm.cmd run build` PASS + PWA verify PASS.

### 2026-06-19 â€” feat(Fase F UI/UX Sweep): 10 task selesai â€” 404, toast, a11y, kontras, logout, search tenant, skeleton, login format
- **UX-404:** `NotFoundPage` + wildcard route di App.tsx untuk route tak dikenal.
- **UX-TOAST:** `ToastProvider` global dengan `useToast` hook + toast di SimpleCrudPage (create/update/delete).
- **UX-A11Y-PASSWORD:** Ganti emoji ðŸ‘/ðŸ™ˆ dengan SVG icon mata terbuka/tertutup, tambah `aria-label`.
- **UX-A11Y-SKIPLINK:** Skip-to-content link di AppLayout + CSS (muncul saat Tab), `id="main-content"`.
- **UX-COLOR:** `--text-muted` digelapkan `#64748b` â†’ `#475569` di 01-base.css & 04-operations.css (WCAG AA).
- **UX-LOGOUT:** Konfirmasi `window.confirm` sebelum logout (staff + admin/owner).
- **UX-SEARCH-TENANT:** GlobalSearch dibuka untuk role TENANT (search invoice sendiri via `/me/invoices`), placeholder disesuaikan.
- **UX-SKELETON:** `StatCardSkeleton` width hardcoded â†’ `100%` mengikuti container (cegah layout shift).
- **UX-OVERSCROLL:** Hapus `overscroll-behavior-y: none` â€” pull-to-refresh kembali di mobile.
- **UX-LOGIN-FORMAT:** Validasi format login tenant (email vs HP dengan regex).
- Gate: FE build PASS (0 error), PWA verify PASS.: header tanggal dipertahankan, tiap entry hanya menyimpan 1-2 poin outcome. Detail verbose tetap ada di source lama.

### 2026-06-19 â€” refactor(efisiensi AI/token): ekstrak helper MyStayPage
- `MyStayPage.tsx` 1028â†’902 baris; 15 helper murni (format/fasilitas/inventaris/harga kamar) â†’ `frontend/src/pages/portal/myStayShared.tsx`. Komponen `ActiveStayContent` (stateful) tetap di file utama.
- Gate: FE `tsc` 0 + build PASS, chunk MyStayPage identik 35.91kB (0 perubahan perilaku). Sisa: monolit stateful (Tickets/Stays/AccountingSetup + backend jalur-uang) di-defer ke refactor per-task.

### 2026-06-19 â€” refactor(efisiensi AI/token): decompose PublicGuestDashboardPage
- `PublicGuestDashboardPage.tsx` 998â†’639 baris; helpers/konstanta + 5 komponen presentational (Lightbox/GuestTopbar/RoomPreviewCard/RoomPreviewSkeleton/GuestFooter) diekstrak ke `frontend/src/pages/public/publicGuestShared.tsx`.
- Gate: FE `tsc` 0 + build PASS (PWA verified), chunk â‰ˆidentik (0 perubahan perilaku).

### 2026-06-19 â€” refactor(efisiensi AI/token): decompose ReportsPage
- `ReportsPage.tsx` 732â†’289 baris; helpers + 21 komponen presentational (read-only laporan) diekstrak ke `frontend/src/pages/reports/reportShared.tsx` (pola mengikuti `dashboardShared.tsx`).
- Gate: FE `tsc` 0 + build PASS (PWA verified), chunk ReportsPage identik (0 perubahan perilaku). Catatan: TicketsPage/StaysPage/AccountingSetupPage = monolit stateful, ditunda (refactor per-task lebih aman).

### 2026-06-19 â€” refactor(efisiensi AI/token): bersih repo + split docs + CODEMAP + decompose DashboardAdmin
- **Repo:** untrack 32.8MB Prisma generated (`backend/src/generated/*`) dari git (sudah gitignore; regen via `prisma generate`); pindah `buku.md` (2.2MB) + `KOST48_Analisis_Bisnis_Total.pdf` (5.7MB) ke `reference/` (luar jalur baca AI) + read-guard di `CLAUDE.md`.
- **Docs:** split M10 â†’ `docs/M11_CHANGELOG.md` (M10 126KBâ†’90KB, changelog historis pindah ke sini); tambah `docs/CODEMAP.md` (peta modulâ†’pathâ†’tanggung jawab + index 54 model + anchor flow) sebagai pintu navigasi kode hemat token.
- **Kode:** `DashboardAdmin.tsx` 915â†’522 baris (86â†’55KB); 5 workspace (Staff/Stays/Finance/Tickets/Rooms) diekstrak ke `frontend/src/pages/dashboard/AdminWorkspaces.tsx`. Gate: FE `tsc` 0 + build PASS, bundle chunk identik (0 perubahan perilaku).

### 2026-06-19 â€” audit(UI/UX full): temuan & prioritas perbaikan ditulis ke M07 + M10 Fase F
- Audit UI/UX menyeluruh (14 file CSS, 100+ komponen, 26 halaman): 1 critical (404 route), 1 high (toast global), 5 medium (aksesibilitas, kontras, keyboard, logout, focus trap), 6 low (polish).
- Temuan lengkap di `docs/M07_PUBLIK_GROWTH.md` â†’ Audit UI/UX Full 2026-06-19.
- Task terstruktur di M10 Fase F: UX-404, UX-TOAST, UX-A11Y (password, skip-link, logout), UX-COLOR, UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT.

### 2026-06-19 â€” ui(Fase C polish): toggle segmented + divider topbar + breadcrumb root mode + bersih repo
- **OWN-TOGGLE-CSS:** `.owner-view-toggle` jadi segmented control (radius 12px, active putih+shadow, transisi 0.2s). **OWN-TOGGLE-LAYOUT:** `.owner-view-toggle-wrap` center + `.topbar-divider` kiri-kanan. **OWN-BREADCRUMB-MODE:** root hard-label "Kokpit Owner"/"Area Admin" sesuai mode.
- **Bersih repo:** hapus 14 file sampah `.reasonix/truncated-results/*` dari git + tambah `.reasonix/` ke `.gitignore`. Fase C kini benar-benar 100% (tanpa `[~]`).
- Gate: FE build 110 chunk, PWA verify PASS.

### 2026-06-19 â€” feat(FASE B-2): shell Inventaris terpadu /inventory + redirect route lama
- `InventoryShellPage` (route `/inventory`, OWNER/ADMIN) + `SegmentedTabs` 3 tab path-based: Gudang/Barang Kamar/Mutasi (nested routes render `ConfiguredResourcePage` dengan `hideAreaMenu`).
- Route lama `/inventory-items|/room-items|/inventory-movements` â†’ `<Navigate>` ke tab shell; mutasi preservasi query (prefill ASSIGN/OUT/RETURN dari ResourceTable & SimpleCrudPage tetap jalan).
- Tautan OWNER/ADMIN diarahkan ke shell: sidebar activePaths, DashboardAdmin chips, RoleWorkspaceTabs match, areaMenu SimpleCrudPage, routeTitles. Keputusan owner: 3 tab.
- Gate: FE build 110 chunk, PWA verify PASS.

### 2026-06-19 â€” feat(OWN-BACKEND-MODE): header X-Owner-View-Mode + audit interceptor
- FE: `api/client.ts` interceptor kirim `X-Owner-View-Mode: owner|admin` saat key view-mode valid. Fix bentrok localStorage: density Kokpit Owner pindah ke key `kost48_owner_density` (sebelumnya tertimpa toggle owner/admin).
- BE: `OwnerViewModeInterceptor` global (sesudah RequestId) melampirkan `request.ownerViewMode` untuk guard/audit + log saat OWNER POST/PATCH/PUT/DELETE dalam mode admin. Tanpa ubah perilaku endpoint.
- Gate: backend `tsc --noEmit` 0 Â· FE build 109 chunk, PWA verify PASS.

### 2026-06-19 â€” refactor(OWN-ROLE-TABS-MODE): mode eksplisit di RoleWorkspaceTabs, buang hack role
- `RoleWorkspaceTabs` terima `role` asli + `ownerViewMode`; pilih tab set + base path internal (OWNER admin â†’ `/admin-dashboard`, ADMIN â†’ `/dashboard`). `AppLayout` tak lagi mengoper `role='ADMIN'` palsu / `adminDashboardPath`. aria-label ikut `isAdminView`.
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 â€” feat(OWN-STATUS-CARDS): strip status kokpit owner + regroup sidebar
- **Status Kokpit:** 4 kartu clickable di `OwnerDashboardPage` â€” okupansi (kpi), tunggakan (overdue+outstanding count+Rp), meter belum dicatat (best-effort `computeMeterDue`: stay aktif vs reading bulan terpilih), kesiapan go-live (`fetchAccountingReadiness` score/ready). Query readiness+meter best-effort (tak memblok dashboard, fallback "â€”").
- **Sidebar:** `ownerSections` diregroup jadi 2 grup besar "Operasional" vs "Keputusan Owner" (semua tautan dipertahankan).
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 â€” feat(OWN-ROUTE-SPLIT/GUARD): /admin-dashboard route nyata + mode owner ikut route
- **Split:** route baru `/admin-dashboard` (OWNER-only) di `App.tsx` me-render `DashboardAdmin`; hack render-inline di `AppLayout` dihapus â†’ selalu `<Outlet/>`. Sidebar pakai `ownerAdminSections` (dashboard â†’ `/admin-dashboard`), `RoleWorkspaceTabs` terima `adminDashboardPath`, chip internal `DashboardAdmin` pakai `dashboardBase` dinamis.
- **Guard:** kedua dashboard OWNER-only via `RequireRoles`; toggle owner kini `navigate()` antar route + `AppLayout` sinkronkan `ownerViewMode` dari pathname (URL langsung pun mode-aware). Title `/admin-dashboard` ditambah di `routeTitles`.
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 â€” ui(OWNER-VIEW mode-aware): sidebar/offcanvas/admin-action ikut mode + toggle mobile
- **Fase C cluster (5 item):** `SidebarContent` terima prop `ownerViewMode` â†’ title/subtitle/footer & flag admin ikut mode (OWN-SIDEBAR-CONTEXT); `Offcanvas.Title` dinamis "Kokpit Owner"/"Area Admin (Owner)" (OWN-OFFCANVAS-TITLE); tombol "Pengumuman" muncul saat OWNER mode-admin (OWN-ADMIN-ICON-ACTION).
- **Mobile/transisi:** toggle Kokpit/Area Admin ditambah lebar-penuh di offcanvas + toggle topbar jadi desktop-only (OWN-TOGGLE-MOBILE); transisi 0.3s ease pada `.app-shell-grid`/`.app-sidebar`/`.app-main` (OWN-TOGGLE-TRANSITION).
- Gate: FE build 109 chunk, PWA verify PASS. Sisa Fase C: OWN-STATUS-CARDS, OWN-ROUTE-SPLIT/GUARD, OWN-BACKEND-MODE (opsional), FASE B-2 inventaris shell.

### 2026-06-19 â€” feat(schema-STF-GUDANG-2): FK inventoryItemId di RoomFacility + migration additive
- **Schema additive** (migration `20260618210000_stf_gudang2_facility_inventory_link`): `RoomFacility.inventoryItemId` (FKâ†’InventoryItem, SET NULL), index, back-relation.
- **Service:** `loadFacilityCounts()` kini `groupBy inventoryItemId` (FK langsung), bukan fuzzy-name. `decorateInventoryItem()` terima `Map<number,number>`.
- **DTO:** `CreateRoomFacilityDto` + `UpdateRoomFacilityDto` tambah `inventoryItemId`. Admin/owner bisa tautkan fasilitas ke item gudang dari form kamar.
- Gate: BE tsc 0 Â· FE build 110 chunk Â· migration applied DB 5433 Â· seed 20 kipas.

### 2026-06-18 â€” feat(STF-METER-VIEW + STF-TIP-FLOW): dashboard meter staff + tip flow backend
- **STF-METER-VIEW [d-1]:** komponen `StaffMeterStatusPanel` â€” tabel per kamar status SUDAH/BELUM catat meter bulan ini + listrik/air/terakhir. Diintegrasikan ke `StaffMotivationDashboard`.
- **STF-THEME [d-2]:** CSS `staff-panel-card`, `staff-meter-table`, z-index mobile di route staff.
- **STF-TIP-FLOW [d-4]:** `tipShopeepay` ditambahkan ke User DTO (Create/Update) + service. Notif staff via `createOnce` saat tenant acknowledge tip. Endpoint `POST /tickets/:id/tip-confirm` (STAFF) konfirmasi Sudah/Belum masuk + notif balik ke tenant. Idempotency via `StaffPerformanceEvent TIP_CONFIRMED`.
- Status checklist M10: STF-METER-VIEW â†’ `[x]`, STF-THEME â†’ `[x]`, STF-TIP-FLOW â†’ `[x]`.
- Gate: BE tsc 0, FE build 109 chunk (1555 module), PWA ok.

### 2026-06-18 â€” fix(PUB-CALENDAR-CSS): tambah stylesheet AvailabilityTimeline + settings-facility-actions
- **Audit AI:** komponen `AvailabilityTimeline.tsx` merujuk 20+ class CSS (`avcal-*`, `cell-*`) yang tidak ada di stylesheet manapun â€” tabel kalender tampil tanpa warna status, tanpa layout, tanpa scroll control.
- **Fix:** tambah 168 baris CSS di `11-public-pages.css` (shell, header, legend 4 warna status, table scroll horizontal, sticky header+room, weekend highlight, floor row, scroll controls, collapse, loading, mobile compact). Tambah `.settings-facility-actions` di `12-owner.css` (6 baris, flex row tombol upload/hapus foto fasilitas).
- Gate: FE build 109 chunk, PWA ok (CSS 108 KiB gzip).

### 2026-06-18 â€” feat(PUB-FOTO-PROFIL-KTP): avatar tenant dari foto KTP + kelola owner/admin
- **Keputusan owner (M02):** foto profil tenant diturunkan dari foto KTP pertama; owner/admin bisa ganti ulang; gambar dikompres.
- **Schema additive** (migration `20260618030000_tenant_profile_photo`): enum `ProfilePhotoSource {KTP_AUTO, MANUAL}` + field `profilePhoto*` di `Tenant`.
- **BE:** unggah KTP pertama otomatis menyalin file â†’ `uploads/profile-photos/` dan set avatar `KTP_AUTO`; `POST/DELETE /tenants/:id/profile-photo` (OWNER/ADMIN ganti/hapus â†’ `MANUAL`); `GET /tenants/:id/profile-photo/image` terproteksi (OWNER/ADMIN atau tenant **pemilik** saja). Avatar `KTP_AUTO` ikut terhapus saat KTP dihapus (UU PDP); avatar `MANUAL` tetap.
- **FE:** komponen `TenantAvatar` (foto + fallback inisial via `useAuthenticatedMediaUrl`) di topbar owner/tenant + workspace tenant; kartu `TenantProfilePhotoCard` (ganti/hapus, kompres 512px) di `StayDetailPage`; `profilePhotoUrl` ditambahkan ke `/tenant/profile`.
- Gate: BE build 0 Â· FE build 109 chunk, PWA ok Â· **UAT runtime LULUS 10/10** (auto-avatar 201, serve owner/tenant 200, tenant lihat avatar tenant lain 403, profile url terisi, re-upload MANUAL 201, hapus KTPâ†’avatar MANUAL tetap / avatar KTP_AUTO terhapus).

### 2026-06-18 â€” fix(audit AI): facility photo URL/slug + ranking cleanliness + avatar KTP
- **PUB-FACILITY-PHOTO:** slug upload Settings disamakan dengan slug landing page; URL `/uploads/...` kini di-resolve ke backend/API origin; thumbnail fasilitas diberi dimensi stabil.
- **TEN-GAMIF:** ranking kebersihan memakai assignment aktif sebagai denominator (`doneCount/expectedCount`, `score%`), termasuk kamar yang belum dikerjakan, dan query `month/year` divalidasi.
- **PUB-FOTO-PROFIL-KTP:** auto-avatar dari KTP tidak gagal diam-diam lagi; response memberi warning bila turunan avatar gagal dan sukses mengembalikan tenant dengan avatar terbaru.
- Gate: BE `npx.cmd tsc --noEmit` PASS; FE `npx.cmd tsc -b --pretty false` PASS; FE `npm.cmd run build` PASS (rerun escalated karena sandbox Vite access denied).

### 2026-06-18 â€” feat(PUB-LAYANAN-MINAT): tenant ajukan minat layanan + proses admin/owner
- **Schema additive** (migration `20260618010000_service_interest`): model `ServiceInterest` (serviceId/tenantId/status `ServiceInterestStatus` PENDINGÂ·CONTACTEDÂ·DONEÂ·CANCELLED/note/adminNote) + relasi cascade ke `AdditionalService`+`Tenant`.
- **BE:** `POST /additional-services/:id/interest` (TENANT, dedupe PENDING agar tak dobel) + `GET /my-interests` (TENANT) + `GET /interests` & `PATCH /interests/:id` (OWNER/ADMIN). Tiap minat baru bikin notif `createOnce` ke semua admin/owner (linkTo `/service-interests`).
- **FE tenant:** tombol "ðŸ™‹ Saya Minat" per layanan di portlet MyStayPage (konfirmasi tarif, badge "Sudah diminati" bila PENDING).
- **FE admin/owner:** halaman `/service-interests` (tab PENDING/CONTACTED/DONE/Semua + aksi Tandai Dihubungi/Selesai/Batalkan) + nav owner Pengaturan.
- Gate: BE build 0 Â· FE build 108 chunk, PWA ok Â· **UAT runtime LULUS** (tenant create 201, dedupeâ†’id sama, admin list+proses CONTACTED 200, tenantâ†’route admin 403, notif owner+admin terbuat).

### 2026-06-18 -- feat(PUB-METER-JADWAL): status meter bulan ini di portal tenant
- **BE:** `GET /meter-readings` kini mengizinkan TENANT membaca meter hanya untuk kamar aktifnya; query `roomId` lain ditolak.
- **FE:** `/portal/stay` menampilkan jendela catat meter bulan ini, status sudah/belum, catatan terakhir, dan CTA catat meter.
- Gate: BE `npx.cmd tsc --noEmit` PASS; FE `npx.cmd tsc -b` PASS; FE `npm.cmd run build` PASS (rerun escalated karena sandbox Vite access denied).

### 2026-06-18 â€” feat(TEN-GAMIF): ranking kebersihan depan kamar bulanan (backend + frontend)
- **TEN-GAMIF:** backend `GET /public/rooms/cleanliness-ranking?month&year` â€” hitung skor per kamar dari `StaffRoutineCompletion` dengan template area `CLEANING` per bulan.
- **Frontend:** kartu "ðŸ§¹ Ranking Kebersihan Bulan Ini" di `MyLoyaltyPage` â€” medali ðŸ¥‡ðŸ¥ˆðŸ¥‰, anonim per kode kamar.
- Gate: BE build 0 Â· FE build 109 chunk, PWA ok.

### 2026-06-18 â€” feat(PUB-FACILITY-PHOTO): upload foto fasilitas publik + tampil di landing page
- **PUB-FACILITY-PHOTO:** Backend `POST /facility-images/upload/:slug` (OWNER/ADMIN, file JPG/PNG/WebP, max 2MB) + `GET /facility-images` (publik) + `DELETE /facility-images/:slug`.
- **Service:** `FacilityImagesService` â€” simpan file ke `uploads/room-images/facilities/{slug}.{ext}`, tanpa perubahan schema.
- **Settings:** tab baru "Foto Fasilitas" di OwnerSettingsPage (`FacilityPhotoPanel`) â€” grid upload/ganti/hapus per slug.
- **Landing page:** `PublicGuestDashboardPage` â€” fetch foto real dari API, tampilkan gambar bila ada, fallback emoji bila belum.
- Gate: BE build 0 Â· FE build 109 chunk, PWA ok.

### 2026-06-18 â€” feat(PUB-CALENDAR): availability calendar timeline horizontal (backend + frontend)
- **PUB-CALENDAR:** backend `GET /public/rooms/availability-calendar?from&to` â€” grid per kamar per tanggal (KOSONG/BOOKING_DP/HUNI/MAINTENANCE). Logic: stay ACTIVE + room status â†’ status per hari.
- **Frontend:** `AvailabilityTimeline.tsx` â€” tabel horizontal scrollable, group per lantai, legend warna, collapse/expand, loading/empty state.
- **Integrasi:** ditampilkan di `PublicRoomsPage` setelah grid kamar + pagination.
- DTO: `AvailabilityCalendarQueryDto` (from, to opsional, default 2 minggu, clamp 62 hari).
- Gate: BE build 0 Â· FE build 108 chunk, PWA ok.

### 2026-06-18 â€” feat(PUB-SMART-BOOKING): filter ketersediaan kamar publik by checkIn+durationDays
- **PUB-SMART-BOOKING:** API `GET /public/rooms?checkIn=YYYY-MM-DD&durationDays=N` â€” filter kamar yang available di seluruh rentang (tanpa overlapping active stay).
- **DTO:** tambah field `checkIn`+`durationDays` di kedua `PublicRoomsQueryDto` (marketing + tenant-bookings).
- **Service:** `MarketingPublicRoomsService.buildPublicRoomWhere()` â€” tambah kondisi `stays: { none: { status: ACTIVE, checkInDate: { lt: endDate }, OR: [plannedCheckOutDate: null, plannedCheckOutDate: { gt: checkInDate }] } }`.
- Gate: BE build 0 (tsc PASS).

### 2026-06-18 â€” docs(checklist audit): sinkron status M10 vs kode
- **PUB-LAYANAN-MINAT:** dicatat selesai fungsional berdasarkan kode `ServiceInterest` + API + tenant button + halaman admin/owner proses minat. Sisa polish: native `window.confirm` â†’ modal custom bila diminta.
- **MKT-5:** ditutup fungsional; renewal sudah punya copy meter dan cross-sell add-on opsional yang tidak memblokir flow.
- **Parsial ditandai `[~]`:** owner toggle phase-2, foto/brosur, meter schedule/staff view, staff role/wifi, tip flow, dan beberapa item audit visual.

### 2026-06-18 â€” fix(go-live hardening dari audit): test 55/55 + camera CSP (OCR) + HSTS
- **Test 54/55 â†’ 55/55:** mock `ticket-number.test.js` pakai `$executeRaw` (bukan `$queryRaw`) sesuai advisory-lock F2-5. Bukan bug produksi, tapi suite kini hijau penuh.
- **DEEP-02:** `Permissions-Policy: camera=(self)` agar OCR KTP (PUB-KTP-OCR/Tesseract) tak terblok; mic & geo tetap diblok.
- **DEEP-03:** header `Strict-Transport-Security` (HSTS) ditambah â€” **hanya di produksi** (HTTPS), tidak di dev.
- **DEEP-01:** `@@index([token])` ditambahkan di schema + migration `20260618020000`. Redundan (@unique sudah bikin unique index PG) tapi tidak merusak â€” index eksplisit tidak mengurangi performa.
- Gate: BE build 0 Â· unit test **55/55** hijau.

### 2026-06-18 â€” fix(audit post-fix DEEP-04/05): konsolidasi duplikat + refactor auth helper
- **DEEP-04:** konsolidasi `lockApprovalBookingTx` â€” source of truth di `tenant-bookings.queries.ts`, hapus dari `tenant-bookings-helpers.ts`. tsc 0, 55/55 test PASS.
- **DEEP-05:** refactor `findUserForLogin` + `findUserForForgotPassword` â†’ satu helper `findUserByEmailOrPhone(identifier, normalizedPhone, { includeExtraPhoneVariants? })`. Perilaku kedua method TETAP â€” login coba varian HP lebih banyak, forgot-password varian minimal. tsc 0, 55/55 test PASS.
- **NEW:** `backend/.env.production.example` â€” 55+ env vars lengkap (Wajib, VAPID, KTP gate, Brevo, DeepSeek, auto-ops, akuntansi, loyalty points, rate limit, deadline).
- **NEW:** `backend/scripts/change-owner-password.ts` â€” overwrite password OWNER via Prisma+bcrypt. Idempoten, pass dari env `OWNER_NEW_PASSWORD` atau prompt. JWT lama invalid otomatis (guard pwdAt).

### 2026-06-18 â€” ui(owner-dashboard): toggle tampilan Ringkas/Lengkap + persist localStorage
- **OwnerDashboardPage:** tombol toggle "ðŸ“‹ Ringkas" / "ðŸ“Š Lengkap" di toolbar, sebelah "Buka laporan".
- **useOwnerViewMode hook:** baca localStorage `kost48_owner_view_mode`; default mobile â‰¤834px = compact; override manual tersimpan.
- **Compact mode sembunyikan:** panel tren chart + panel AI analysis via CSS class `owner-view-compact`.
- **FE:** `12-owner.css` â€” style toggle button (pill-style, active dark bg) + compact hide rules.
- Gate: FE build 108 chunk, PWA ok (gzip: 146 KiB JS, 107 KiB CSS).

### 2026-06-18 â€” ui(layout): sidebar collapsible (ikon-only) + breadcrumb + hamburger toggle
- **AppLayout.tsx:** state `sidebarCollapsed` + localStorage persist; class `sidebar-collapsed` di aside + grid.
- **SidebarContent:** saat collapsed â€” hanya ikon link yang tampil, teks/brand/context-card disembunyikan via CSS.
- **Toggle button:** lingkaran kecil di tepi kanan sidebar (â—€ / â–¶) + ikon hamburger â˜° di topbar (mobile).
- **CSS:** `02-layout.css` â€” `.app-shell-grid.sidebar-collapsed` (grid 60px + transisi 0.25s), `.sidebar-collapse-toggle` (toggle button bulat).
- **CSS:** `10-misc.css` â€” `.sidebar-collapsed` hide rules (sembunyikan brand-title, label, arrow, context-card, section-toggle, footer).
- **Breadcrumb:** sudah ada (`getBreadcrumbParts` + `app-topbar-breadcrumb`) â€” memakai React Router `pathname`.
- Gate: FE build 108 chunk, PWA ok (CSS +1 KiB gzip).

### 2026-06-18 â€” feat(PUB-LAYANAN-TAMBAHAN ðŸ§¬): layanan tambahan + tarif (admin CRUD + portlet tenant)
- Schema additive (owner-approved, migration `20260618000000_additional_services`): model `AdditionalService` (name/description/priceRupiah/unit/isActive/sortOrder).
- BE: modul `additional-services` â€” CRUD mutasi **OWNER-only** (D-17), `GET /active` semua role.
- FE: resource admin "Layanan Tambahan" (config-driven + route /additional-services + nav owner Pengaturan) + portlet tenant di MyStayPage (daftar layanan + estimasi tarif).
- Gate: BE tsc 0 Â· FE build (106 chunk, PWA ok) Â· **UAT runtime LULUS** (owner create 201, admin 403, tenant lihat Galon/TV + tarif). Catatan lama "PUB-LAYANAN-MINAT ditunda" sudah superseded oleh audit checklist 2026-06-18.

### 2026-06-18 â€” feat(PUB-CALENDAR-CHECKOUT): badge "Perkiraan kosong [tgl]" katalog publik
- Keputusan owner: proyeksi kamar kosong hanya untuk (a) checkout-request APPROVED, atau (b) stay jangka pendek (harian/mingguan/2-mingguan, sering tak perpanjang). TIDAK menebak dari kontrak bulanan.
- BE: `getProjectedAvailabilityByRoomId` + `projectedAvailableDate`/`projectedAvailableReason` di public rooms API (list+detail). FE: badge "ðŸ—“ï¸ Perkiraan kosong [tgl]" di kartu kamar terisi + `PublicRoom` type.
- Gate: BE tsc 0 Â· FE build (106 chunk, PWA ok) Â· UAT runtime (stay WEEKLY â†’ projection 2026-06-27 muncul).

### 2026-06-17 â€” feat(TEN-PROFILE-NOTIF): badge "Lengkapi Profil" portal tenant
- `GET /tenant/profile/completeness` (reuse `buildCompletionSummary`, 7 field onboarding) + badge "ðŸ“‹ Lengkapi profil (X%)" di MyStayPage (list field kurang + tombol /portal/profile).
- Gate: BE tsc 0 Â· FE build (106 chunk, PWA ok) Â· UAT runtime endpoint OK.

### 2026-06-17 â€” feat(PUB-KTP-OCR): pindai KTP offline isi Nama+NIK otomatis
- `tesseract.js` (owner-approved) **lazy-load** di GuestBookingForm â€” tombol "ðŸ“· Pindai KTP"; OCR diproses **di perangkat** (foto tak diunggah, privasi PDP). `parseKtpText` ekstrak NIK 16 digit + Nama â†’ isi field (user wajib periksa/koreksi).
- Bundle utama TIDAK bertambah (chunk dinamis terpisah, WASM/lang dari CDN saat dipakai). Gate: FE build (106 chunk, PWA ok).

### 2026-06-17 â€” feat(PUB-UI-REVAMP batch cepat): booking-info, KTP opsional, label saran
- **PUB-BOOKING-INFO**: teks "Belum punya akun? Booking kamar dulu" di LoginPage.
- **PUB-BOOKING-FORM** (partial): KTP/NIK **opsional** saat booking (format dicek hanya bila diisi). phone-XOR-email ditunda (auto-akun portal butuh email).
- **STF-SARAN-LABEL**: "Kirim via Laporan" â†’ "Kirim Saran" (MyStayPage).
- Gate: FE build (105 chunk, PWA ok).

### 2026-06-17 â€” feat(PUB-UI-REVAMP Fase E): filter ulasan Terbaru/Rating Tertinggi
- **PUB-REVIEWS** sudah ada (F3-4 social-proof + Maps iframe di #lokasi). **PUB-REVIEWS-FILTER**: tab Terbaru/Rating Tertinggi (client-side sort, maks 10); pool review backend 6â†’12.
- Gate: FE build (105 chunk, PWA ok) Â· BE tsc 0.

### 2026-06-17 â€” feat(PUB-ROOM-CATEGORY ðŸ§¬): kategori & tipe kamar (badge + filter)
- **Schema additive** (owner-approved, migration `20260617000000_pub_room_category`): enum `RoomCategory` (ECONOMY/STANDARD/DELUXE) + `RoomType` (REGULAR/MEZZANINE), `Room.category`/`roomType` default STANDARD/REGULAR.
- **Backend:** DTO owner set kategori/tipe (`...dto` passthrough); public rooms API expose `category`/`roomType`.
- **Frontend:** badge kategori di kartu katalog (ðŸ’Ž Deluxe / ðŸ›‹ï¸ Standar / ðŸ·ï¸ Ekonomi + tag Mezzanine) + filter kategori (client-side); kolom "Kategori" + select di form admin kamar.
- **Gate:** backend tsc 0 Â· FE build (105 chunk, PWA ok) Â· **UAT runtime LULUS** (owner set K-A â†’ DELUXE/MEZZANINE â†’ tampil di `/public/rooms`).

### 2026-06-17 â€” feat(PUB-UI-REVAMP Fase C frontend): badge/tombol status + ikon fasilitas (ca54397)
- **PUB-BADGE-STATUS** warna badge per status (hijau/kuning/merah/abu, selaras ikon) Â· **PUB-BTN-COLOR** "Tanya" outline saat tak bisa booking, "Ajukan Booking" primary +ðŸ“ Â· **PUB-FACILITY-SHOW** ikon fasilitas di chip kartu.
- **Keputusan owner:** foto kamar tetap **4:3** (PUB-PHOTO-RATIO); **PUB-CARD-RESPONSIVE** sudah 4/2/1 (tanpa ubah). Approved untuk increment lain: schema `Room.category` (PUB-ROOM-CATEGORY) + npm `tesseract.js` (PUB-KTP-OCR).
- Gate: FE build hijau (105 chunk, PWA ok).

### 2026-06-17 â€” feat(PUB-UI-REVAMP Fase A): ikon publik + audit CTA (cf4c63c)
- **PUB-REMOVE-PREF** hapus tombol "Ubah Preferensi Tinggal"; **PUB-CTA-AUDIT** prominent "Cek Kamar Tersedia" tinggal 2 (hero + sticky navbar), CTA penutup di-relabel.
- **PUB-ICON** (emoji + aria-hidden, tanpa lib): nav links, CTA, mark fasilitas (ðŸ…¿ï¸ðŸ³â„ï¸ðŸš¿ðŸ“¶â€¦), badge status per tone (ðŸŸ¢ðŸŸ¡ðŸ”´ðŸ§¹).
- Gate: FE build (105 chunk, PWA ok) Â· sweep Playwright 30 cek 0 overflow (publik 390/834/1440).

### 2026-06-17 â€” feat(AUDIT-OWNER + CSS+SWEEP): polish UI stabilitas lintas role (app-wide)
- **AUDIT-OWNER** (`ff415f5`): `document.title` per-rute (`useDocumentTitle` + `routeTitles` + `RouteTitleSync`); skeleton ganti full-page spinner (`PageLoadingSkeleton` di App Suspense/Rooms/Reports/OwnerDashboard); foto OwnerSettings lewat `SafeImage`; dropdown notif width responsif (anti-overflow â‰¤390px); hapus dead-code "Laporan Formal" di ReportsPage (2 API mubazir); a11y emoji dekoratif `aria-hidden`.
- **CSS+SWEEP**: `02-layout.css` jadi sumber tunggal `.app-shell`/`.app-shell-grid` (buang rule mati/duplikat di 01-base/09-finance/10-misc, behavior-preserving; print override tetap di 03-components).
- **Gate:** FE build hijau (105 chunk, PWA ok) Â· **sweep Playwright 30 cek (5 role Ã— 390/834/1440) = 0 overflow** + judul tab terverifikasi live. âš ï¸ Guest `/rooms`â†’beranda menunggu konfirmasi owner.

### 2026-06-17 â€” feat(METER M-5): checkout meter final Ã— deposit jaminan + copy marketing
- **Backend:** `complete()` izinkan tagihan meter (listrik/air, semua baris ELECTRICITY/WATER) tetap OPEN saat checkout + gate WAJIB catat meter listrik final (catatan tertanggal â‰¥ hari checkout, 409 bila belum); tagihan NON-meter tetap memblokir. `processDeposit` â†’ `settleDepositAgainstMeterTx`: deposit menutup tagihan meter (DR 2000 / CR 1100 via jurnal forced-checkout F3-16), sisa refund kas, kekurangan TETAP piutang AR; GUC carve-out `app.allow_deposit_with_open_invoices`. Helper `isMeterInvoice`/`invoiceRemainingRupiah`/`computeMeterDepositSettlement` + unit test 8/8.
- **Frontend:** `ProcessDepositModal` mode meter (breakdown deposit/tagihan/dipotong/dikembalikan/shortfall, otomatis), `checkoutReadiness.ts` (tagihan meter non-blocking), copy publik pascabayar (FAQ + trust item "Listrik transparan, bukan token").
- **Finance gate LULUS:** tsc 0 Â· unit test 8/8 Â· FE build (106 chunk, PWA ok) Â· **UAT runtime DB 5433**: deposit cukup/kurang/nol â€” TB seimbang tiap langkah, akun 2000 turun tepat 1.5jt, gate tolak checkout tanpa meter final.

### 2026-06-17 â€” feat(MKT-4): CAC/CLV lite dashboard â€” DeepSeek V4 Pro powered + offline fallback
- **Backend:** `GET /market-analysis/cac-clv` â€” agregat booking per kanal, konversi, renewal rate, retensi, estimasi CLV, referral, loyalty. Query via Prisma `$queryRaw` dari tabel Stay/RenewRequest/TenantReferral/LoyaltyPoint/Redemption.
- **Backend:** `POST /market-analysis/cac-clv/analyze` â€” kirim snapshot ke DeepSeek V4 Pro, ekstrak JSON insight CAC/CLV. Fallback offline bila AI gagal/tidak terkonfigurasi.
- **Frontend:** `CacClvDashboard.tsx` â€” metrik card (Total Booking, Konversi, Renewal, CLV), HorizontalBarChart per kanal, tabel detail kanal, kartu Retensi/Referral/Loyalitas, dan AI Insight section.
- **Frontend:** `MarketAnalysisPage.tsx` â€” tab toggle baru: "Analisa SWOT/PESTLE" â†” "CAC/CLV Dashboard". CAC/CLV query lazy hanya saat tab aktif.
- **API types:** `CacClvSnapshot`, `CacClvChannel`, `CacClvAnalyzeResult` + fungsi `getCacClvSnapshot()`, `analyzeCacClv()`.
- **Gate:** backend tsc 0 âœ…, frontend build 106 chunks âœ…, PWA verify âœ….
- Lihat `docs/M10_CHECKLIST_CHANGELOG.md` â†’ MKT-4 âœ….

### 2026-06-16 â€” docs: rapikan checklist AI eksekutor (M10 antrian + sinkron selesai)
- `M10_CHECKLIST_CHANGELOG.md`: pintu masuk AI (M-file, urutan kerja, gate); centang F3-3/AUD-7/AUD-8/L-2; sesi 16 Jun terstruktur; **ANTRIAN EKSEKUSI** dengan anchor grep, sub-task, UAT per task terbuka.
- `M06_OPERASIONAL.md`: status M-3/M-4 selesai, M-5 â†’ antrian M10.

### 2026-06-16 â€” Walkthrough UI/UX (owner+staf+tenant+publik) + penyatuan modul (Fase A/B-1) + Meter M-1
- Sesi UI/UX menyeluruh berbasis review owner + verifikasi screenshot Playwright (`ui-shots/`, tidak di-commit).
- **Responsif & publik:** fix bug app-shell (konten mepet kiri <1200px, override `10-misc` menutup collapse `02-layout`) â€” global semua role; login (subtitle d...

### 2026-06-15 â€” Pasca-Fase 5: hardening + sinkron docs (L-4, SINKRON-DOC, AUD-6, L-3)
- Lanjutan tindak-lanjut audit setelah Fase 5 inti:
- **L-4 (go-live):** runbook `04_DEPLOY` mewajibkan `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifi...

### 2026-06-15 â€” FASE 5 (tindak-lanjut audit menyeluruh): S-5 + F5-1..F5-8 â€” SELESAI
- **S-5 schema additive** (owner-approve, migration `20260615140000_s5_ac_usage_vendor`): `Room.acUsageHoursPerDay`, `Ticket.handledByVendor`/`vendorNote`.
- **F5-1 (AUD-4) FAQ operasional:** seed FAQ dari aturan/flow (Pembayaran/Booking/Perpanjangan/Checkout&Deposit/KTP/Keluhan&Poin); `seed()` idempoten per-perta...

### 2026-06-15 â€” feat(F2-10 + F3-5): round-robin tiket + leaderboard staf (disiapkan, dorman saat 1 staf)
- **Ide owner:** siapkan round-robin & leaderboard meski staf masih 1; aktif otomatis saat staf â‰¥ 2. **Tanpa schema baru.**
- **F2-10 round-robin** (K-4): `TicketsService.pickStaffAssigneeTx` dipakai di `createTicketRecord` saat tiket belum ber-assignee â€” staf=0 â†’ tanpa assignee; st...

### 2026-06-15 â€” feat(F4-13c + F4-13 referral): quest perbaikan sikap anonim + referral teman (S-4)
- **Schema additive S-4** (owner-approve, migration `20260615130000_f4_s4_peer_referral`): `PeerBehaviorReport` + enum `PeerReportStatus`; `TenantReferral` + e...
- **F4-13c quest perbaikan sikap (ANONIM):** A lapor B â†’ admin moderasi (`ACKNOWLEDGE` â†’ notif B **tanpa identitas A** / `DISMISS`) â†’ B `markImproved` â†’ konfir...

### 2026-06-15 â€” feat(F4-11 deep): prabayar/perpanjangan multi-bulan + unearned (PSAK 72) â€” SELESAI
- **`PrepayExtensionService.prepayExtension`** (`POST /stays/:id/prepay-extension`, OWNER/ADMIN): tenant membayar **N bulan ke depan dengan harga BULANAN** (te...
- **Akuntansi PSAK 72:** jurnal issuance (DR 1100 / CR 4000) + payment (DR kas / CR 1100) + **deferral seluruh prabayar (DR 4000 / CR 2200 Unearned)**; lalu sw...

### 2026-06-15 â€” feat(backlog S-3): F4-11/12/13a/13b/14/15 â€” implementasi backlog ide owner
- **Schema additive S-3** (owner-approve, migration `20260615120000_f4_backlog_s3`): Room (hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays), LoyaltyReward...
- **F4-12 FAQ/manual** (tanpa schema): `MyManualPage` (`/portal/manual`) menampilkan FAQ publik per kategori (Accordion ringkas) â€” manual book aturan kos untuk...

### 2026-06-15 â€” feat(F4-9): Gamifikasi & Loyalitas tenant â€” SELESAI (schema S-2, dossier 19)
- **Schema additive (S-2):** `LoyaltyPoint` (ledger append-only, unique sourceType+sourceId) + `LoyaltyReward` (katalog) + `Redemption` (penukaran, wajib appro...
- **Poin (default dossier 19, env-override):** `LoyaltyService.award/earn/earnSafe` (idempotent per sourceType+sourceId), `balance`, `history`. **4 trigger ear...

### 2026-06-15 â€” feat(F4-8): Pindah kamar resmi (E4) â€” SELESAI, schema S-2 + 5 keputusan desain owner
- **Keputusan desain owner (D-20, 2026-06-15):** Stay **SAMA** (roomId diperbarui, tak putus kontrak); **deposit ikut apa adanya**; **harga dikunci** (rent-loy...
- **Schema additive (S-2):** `RoomTransfer` (stayId, fromRoomId, toRoomId, transferDate, reason, rentBefore/AfterRupiah, note, createdById) + back-rel Stay/Roo...

### 2026-06-15 â€” feat(F4-1): Unearned Revenue PSAK 72 (F-15) â€” SELESAI, schema S-2 approved
- **Kebijakan (keputusan owner):** sewa yang mencakup **>1 bulan** diakui pendapatan **bertahap** (straight-line per bulan), bukan sekaligus saat check-in. **I...
- **Schema additive (S-2):** `RentRecognitionSchedule` (stayId, periodIndex, periodStart/End, scheduledAmountRupiah, recognizedAt, journalEntryId; unique stayI...

### 2026-06-15 â€” feat(F4-2): PWA Web Push (4 kelompok event J-d) â€” SELESAI, schema S-2 approved
- **Schema additive (owner-approve S-2):** `PushSubscription` (endpoint unik/device) + enum `PushDeliveryStatus` + `AppNotification.pushStatus/pushAttempts/pus...
- **Backend `PushModule`:** `GET /push/vapid-public-key`, `POST /push/subscribe` (upsert by endpoint), `POST /push/unsubscribe` (deactivate). `PushService` bac...

### 2026-06-14 â€” fix(F4-10): standarisasi pembulatan Rupiah (F-31) â€” helper terpusat
- **Masalah (F-31):** pembulatan Rupiah tersebar (`Math.round` mentah di util/DP/depresiasi/revenue-per-kamar + helper `rupiah` duplikat di modul akuntansi) â†’...
- **Helper terpusat baru** `backend/src/common/business/money.helper.ts`: `roundRupiah(v)` (bilangan bulat terdekat; tie tepat 0,5 dibulatkan MENJAUHI nol agar...

### 2026-06-14 â€” ops(F4-7): pruning notifikasi >90 hari (N-04) â€” retensi AppNotification
- **Masalah (N-04):** `AppNotification` tak punya retensi â†’ tumbuh tanpa batas, terutama untuk broadcast ALL ke banyak penerima.
- **Solusi:** `AppNotificationService.pruneOlderThan(retentionDays=90, batchLimit=5000)` menghapus notifikasi `createdAt < now âˆ’ retensi`, dibatasi per-batch (...

### 2026-06-14 â€” chore(migration): migration resmi F3 additive + dukungan shadow DB
- **Migration baru** `prisma/migrations/20260614210000_f3_admin_safety/migration.sql` â€” additive untuk F3-14/15/17/19: enum `BelongingsStatus`; `Tenant.ktp*` (...
- **Divalidasi vs DB UAT live:** seluruh 18 kolom + enum + 3 index + 2 FK ADA dengan nama/tipe/default PERSIS sesuai migration â†’ file akurat & lengkap.

### 2026-06-14 â€” feat(F3-14/F3-16): forced-checkout admin (kabur/overstay) + depositâ†’AR (SELESAI, UAT LULUS)
- **Gabung F3-14+F3-16 (keputusan owner):** satu endpoint `POST /stays/:id/forced-checkout` (OWNER) beralasan `OVERSTAY_NUNGGAK`/`TENANT_KABUR`.
- **Akuntansi (disetujui owner):** deposit menutup tunggakan â†’ jurnal **DR 2000 / CR 1100** (`postForcedCheckoutDepositSettlementTx`, BEDA dari settlement dama...

### 2026-06-14 â€” ui(F3-9): hierarki laporan â€” badge Formal/Estimasi
- **Badge tier (F-11):** `ReportSection` kini menandai setiap kartu laporan operasional dengan badge **â‰ˆ Estimasi** (default) â€” angka dihitung mentah dari data...
- **Banner hierarki:** ReportsPage menambah catatan tetap yang menjelaskan tab operasional = Estimasi, dan mengarahkan ke tab **"Laporan Formal"** (sudah ada:...

### 2026-06-14 â€” feat(F3-17): upload + verifikasi KTP (terproteksi, gate aktivasi, hapus PDP)
- **Schema (approved):** `Tenant.ktpImage*` (url/fileKey/originalFilename/mimeType/fileSizeBytes) + `ktpVerifiedAt/ktpVerifiedById` + `ktpDeletedAt`.
- **Upload:** `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, multer + validasi MIME signature, simpan di `uploads/ktp-images` terpisah dari foto kamar/tiket). Up...

### 2026-06-14 â€” feat(F3-15): lacak barang ditinggal 30 hari â†’ ABANDONED
- **Schema (approved):** `Stay.belongingsStatus` (enum `BelongingsStatus PENDING/CLAIMED/ABANDONED`, default PENDING), `belongingsDeadline`, `belongingsResolve...
- **Set deadline:** checkout final (`stays.complete`) dan forced-checkout overstay (`auto-ops.forceCheckoutOverstay`) men-set `belongingsDeadline = checkout +...

### 2026-06-14 â€” feat(F3-19): SLA tiket â€” dueAt per kategori, resolved-time adil, eskalasi
- **Schema (approved):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt` + index `dueAt`.
- **SLA per kategori (`ticket-sla.ts`):** `dueAt = assignedAt + window` â€” **24 jam** EMERGENCY/SECURITY/KUNCI Â· **3 hari** KERUSAKAN/MAINTENANCE/KEBERSIHAN/CHE...

### 2026-06-14 â€” ops(F3-13): hardening checkout/notif (B-06/B-07/B-11/B-12/B-14/N-02) SELESAI
- **B-07 (D-03):** forced-checkout overstay tak lagi diblokir tagihan **DRAFT** (belum terbit, tanpa jurnal). `forceCheckoutOverstay` mengecualikan DRAFT dari...
- **B-12:** `stays.update` menolak `plannedCheckOutDate` di masa lalu (WIB) â€” mencegah admin tak sengaja menjadikan stay target overstay/forced-checkout instan...

### 2026-06-14 â€” refactor(F3-11): lead source + katalog foto marketing ke config
- **M-08 lead source:** sudah lengkap di kode â€” check-in wizard admin punya dropdown `bookingSource` 10 kanal (Google Maps/Walk-in/Referral/Instagram/TikTok/Wh...
- **M-04 foto config:** ~76 nama berkas foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (`ROOM_...

### 2026-06-14 â€” ops(F3-10): higiene jurnal â€” idempoten anti-race P2002 di posting
- **Race P2002 (utama):** `accounting-posting.service` membungkus 7 entrypoint posting ber-transaksi-sendiri (invoice issued/payment, expense, wifi-sale, depos...
- **entryNumber suffix VOID:** _tidak berlaku pada kode saat ini_ â€” tidak ada jalur `journalEntry` â†’ status `VOID` (reversal selalu membuat entry `ADJUSTMENT`...

### 2026-06-14 â€” audit-fix(Fase 1/2): checklist dibuktikan ulang terhadap kode
- **Renewal:** menutup celah kritis approval sebelum lunas. DP PAID kini hanya mengamankan prioritas; admin menerbitkan invoice pelunasan setelah catat meter;...
- **Cashflow:** classifier menyimpan gross inflow/outflow terpisah per sumber sehingga transaksi dua arah tidak saling menutup.

### 2026-06-14 â€” ui(F3-12): paket chart â€” palet Okabe-Ito, count risiko n<5, kontras donut, filter publik
- **V-5:** palet Okabe-Ito colorblind-safe terpusat (`frontend/src/components/charts/chartPalette.ts`) dipakai `SmartChartPanel`, `HorizontalBarChart`, `DonutG...
- **V-2:** donut "Level Risiko" di review pembayaran berubah jadi tampilan hitungan saat sampel kecil (n<5) â€” 1 bukti high-risk tak lagi terbaca sebagai lingka...

### 2026-06-14 â€” feat(F3-1): coverage notifikasi operasional (assign, room-ready, K-6/K-8)
- **Ticket-assign â†’ assignee:** `tickets.service.assign()` mengirim notif ke penerima tugas (best-effort, di luar audit) hanya saat assignee benar-benar beruba...
- **K-6/K-8 BARANG_PINDAH:** notif tiket pindah barang yang ditutup kini menuju **staf assignee** (sebelumnya keliru ke `actor.id` = admin penutup) dan dipinda...

### 2026-06-14 â€” ops(F1-11): verifikasi booking expiry 3 jam flat
- Kedua helper booking (`expireBookingTx` di `auto-ops.service.ts` dan `cancelCompetingUnpaidBookingsTx` di `payment-submissions.service.ts`) memakai konstanta...
- **Verifikasi:** `grep` konfirmasi kedua helper pakai konstanta sama; tidak ada kode baru.

### 2026-06-14 â€” F3-2/F3-20: inbox pembayaran dan prompt review
- Payment submission yang berhasil commit kini mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif, lengkap dengan tenant, nominal, invoice, kamar, dan deep-lin...
- Tiket tenant ber-assignee STAFF kini mengirim ajakan review saat masuk DONE/CLOSED; pemanggilan ulang pada close aman karena dedupe.

### 2026-06-14 â€” Fase 3 independen: visibilitas dan otomasi operasional
- Menambahkan SEO dasar guest page: metadata, OpenGraph/Twitter Card, canonical, JSON-LD, `robots.txt`, dan `sitemap.xml`. Implementasi lulus build; skor Light...
- Menambahkan social proof publik dengan pembatasan privasi, agregat rating, ulasan visible terbaru, dan count penghuni aktif.

### 2026-06-14 â€” feat(F2-18): gate verifikasi owner utk review tenant â‰¤2 (F2-18 SELESAI)
- Owner: `GET /tenant/staff-reviews/pending-verification` + `POST /:id/verify {decision: APPROVEâ†’VISIBLE | DISMISSâ†’HIDDEN}` (OWNER-only, set `moderatedById`)....
- **UAT runtime:** rating-2 â†’ PENDING_VERIFICATION; owner list memuatnya; ADMIN verify â†’ 403; owner APPROVE â†’ VISIBLE; re-verify â†’ 409. `tsc` 0. â†’ **F2-18 SELE...

### 2026-06-14 â€” test(F2-6): UAT cancel stay promoted â†’ MAINTENANCE + tiket inspeksi (F2-6 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” ui(F2-11): paginasi 12 + skeleton katalog publik â†’ F2-11 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” refactor(F2-5): satukan generateTicketNumber (4 salinan â†’ 1 util) â†’ F2-5 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” fix(F2-14): staff-routines startOfLocalDate â†’ WIB (F2-14 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” docs(F2-1): sinkron dossier 11 dgn keputusan owner hibrida â†’ F2-1 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” feat(F2-2/#3): prompt renewal H-10 + fallback admin tenant tanpa portal
- **UAT runtime:** stay di H-10 â†’ notif tenant "berakhir 10 hari lagi"; tenant non-portal â†’ notif 3 admin "Tenant tanpa portal"; data uji dipulihkan. `tsc` 0....

### 2026-06-14 â€” feat(F2-1 R3): gate deadline renewal di command service
- Tindak lanjut audit (deadline hanya digate sweeper): `renew-requests.service` kini menegakkan deadline di tingkat command (deterministik):
- **`confirmDownPayment`** â†’ 409 bila WIB-today > `downPaymentDueDate` (hari-H lewat â†’ prioritas hangus).

### 2026-06-14 â€” fix(F2-5): tutup ghost-stock RETURN_FROM_ROOM (lock + 409 di dua jalur)
- **`assertRoomItemQtyAvailableTx`** (lock `SELECT â€¦ FOR UPDATE` + `ConflictException` bila stok kamar < diminta) diekstrak ke `common/utils/room-booking.util....
- Dipakai **DI DALAM transaksi** oleh `inventory-movements.create` (sebelumnya private, kini util) **dan** `staff-field-reports.adminReview` (sebelumnya TIDAK...

### 2026-06-14 â€” Audit ulang checklist terhadap kode aktual
- Mengembalikan `F2-1`, `F2-2`, `F2-5`, `F2-6`, `F2-18`, `F2-11`, dan `F2-14` ke `[ ]` karena lingkup task belum lengkap atau verifikasinya belum selesai.
- Temuan kritis: jalur `staff-field-reports.adminReview` masih dapat RETURN melebihi qty kamar tanpa lock/409; `syncRoomItemTx` hanya menghapus RoomItem saat q...

### 2026-06-14 â€” fix(F2-18): STAFF close dibatasi ke CHECKOUT_INSPECTION (invarian dossier 15)
- **UAT runtime:** STAFF close #1 (non-inspeksi) â†’ 403; STAFF close #13 (CHECKOUT_INSPECTION) â†’ 409 (guard kategori lolos, status OPENâ‰ DONE); OWNER close #1 â†’...

### 2026-06-14 â€” F2-3b: catat refund kalah-cepat di sistem (full-stack, UAT LULUS)
- Refund untuk tenant yang KALAH first-paid-wins padahal sudah transfer kini tercatat & terlacak (lanjutan F2-3 yang memberi tahu loser "dana akan direfund").
- **Schema (owner-approved):** enum `RefundStatus { NONE, PENDING, COMPLETED }` + 7 field `Stay.lossRefund*` (status/amount/proofUrl/proofFileKey/note/processe...

### 2026-06-14 â€” F2-11 (V-1): code-split halaman publik (bundle utama lebih ramping)
- **Sisa F2-11 (UI polish):** W-02 skeleton detail + CSS ring, W-03 pagination 12 katalog, UD-05 sticky CTA â€” perlu iterasi visual.

### 2026-06-14 â€” F2-18: tenant-pengawas â€” STAFF boleh tutup tiket (guard keselamatan tetap), enum PENDING_VERIFICATION
- **`tickets POST :id/close` kini izinkan STAFF** (sebelumnya OWNER/ADMIN). Mendukung model tenant-pengawas: staf menutup tiket pekerjaannya sendiri termasuk `...
- **`StaffReviewStatus` += `PENDING_VERIFICATION`** (enum app + schema, db push UAT & prod-lokal) sebagai prasarana model "tenant sebagai pengawas kualitas" (r...

### 2026-06-14 â€” F2-5: konsolidasi util terduplikasi ke common/utils (X-03, sebagian)
- `backend/src/common/utils/room-booking.util.ts` (baru) menyatukan helper yang sebelumnya disalin lintas service:
- **`releaseRoomAfterBookingCancelTx`** â€” 2 salinan IDENTIK (auto-ops + payment-submissions) â†’ satu sumber. Behavior tetap.

### 2026-06-14 â€” F2-3: copy notif A17 dua-varian (kalah first-paid: sudah/belum transfer)
- **Sudah transfer** â†’ "Booking dibatalkan: dana Anda akan direfund" (admin akan menghubungi untuk proses refund).
- **Belum transfer** â†’ "Booking dibatalkan: kamar diamankan tenant lain" (tak ada dana terpotong, pilih kamar lain).

### 2026-06-14 â€” F2-14: timezone WIB untuk bucketing tanggal (F-25/E-6, sebagian)
- **`accounting-posting-helpers.dateOnly` â†’ WIB (UTC+7):** entryDate jurnal kini dibucket per tanggal kalender WIB (dulu komponen UTC) â†’ transaksi dini hari WI...
- **`staff-performance.monthRange` â†’ batas WIB-instant:** bebas timezone server (di server UTC/cPanel perhitungan local lama meleset Â±7 jam di tepi bulan). No-...

### 2026-06-14 â€” F2-12: sinyal tiket hidup lagi + aging pakai sisa tagihan (F-21/F-27, UAT LULUS)
- `finance.service.ts`:
- **F-21 (sinyal tiket):** `highSignalTickets` dulu memakai kategori `['URGENT','HIGH','EMERGENCY']` â€” `URGENT`/`HIGH` BUKAN `TicketCategory` valid â†’ query sel...

### 2026-06-14 â€” F2-9: KPI tiket berhenti dobel-hitung lintas bulan (K-6)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 â€” F2-17: notif tenant saat booking/stay dibatalkan sweeper (E3, UAT LULUS)
- `cancelEndedUnpaidStay` (noon-release/H+1 auto-cancel/DP-forfeit) di-refactor: hasil tx ditangkap ke `cancelled`, lalu bila `true` panggil `notifyTenantStayC...
- `runBookingExpiry`: setelah `expireBookingTx` sukses, kirim notif "booking kedaluwarsa".

### 2026-06-14 â€” F2-16: perketat OWNER-only 4 area (D-17), ADMINâ†’403 (UAT LULUS)
- Audit `@Roles` + perketat 4 area sensitif jadi OWNER-only (ADMIN ditolak 403); operasi baca (GET) tetap untuk ADMIN/STAFF sesuai sebelumnya:
- **(a) Periode akuntansi** â€” sudah OWNER (create/update/`reopen`/`period-close/post`/`auto-run`/opening-balance post/void/draft); tak ada perubahan.

### 2026-06-14 â€” F2-1 inc.4: notif siklus renewal end-to-end (F2-1 & F2-2 SELESAI, UAT LULUS)
- `renew-requests.service` kini menerbitkan notifikasi in-app di tiap transisi (pola `app-notification.service`, mirror checkout-requests; best-effort di luar...
- **create** â†’ OWNER/ADMIN ("ðŸ” Permintaan perpanjangan baru" + nominal DP).

### 2026-06-14 â€” Auto-ops cron eksternal (cPanel/Passenger idle-sleep) â€” endpoint token-protected
- **`GET /api/auto-ops/cron`** baru (`@Public`, tanpa JWT): validasi token rahasia `process.env.AUTO_OPS_CRON_TOKEN` via header `X-Cron-Token` ATAU query `?tok...
- **Deploy shared hosting:** set `AUTO_OPS_ENABLED=false` (matikan timer) + `AUTO_OPS_CRON_TOKEN=<rahasia>`, pasang cPanel **Cron** tiap 5â€“10 mnt: `curl -fsS -...

### 2026-06-13 â€” F2-1 inc.3: sweeper auto-ops renewal HIBRIDA (EXPIRED_PRIORITY + FORFEITED, UAT LULUS)
- Sweeper baru di `auto-ops.service.ts` (wired ke `runAll`, jalan tiap 5 menit) â€” **kebijakan HIBRIDA** (keputusan owner 2026-06-13):
- **`runRenewalPriorityExpiry` (OTOMATIS):** `AWAITING_DP` yang lewat hari-H (`downPaymentDueDate`) tanpa DP lunas â†’ `EXPIRED_PRIORITY`. Membatalkan invoice DP...

### 2026-06-13 â€” F2-1 inc.2b: invoice DP TERPISAH + rent-line pelunasan dikurangi (UAT runtime LULUS)
- **`stays.service.ts`** `issueRenewalDownPaymentInvoiceTx(tx,â€¦)` baru: terbitkan invoice DP 30% (DRAFTâ†’ISSUED + Auto Journal Lite). `renewStayInTransaction` k...
- **`renew-requests.service.ts`**: `decideByTenant` **YA** â†’ transaksi terbitkan invoice DP + set `downPaymentInvoiceId` + `AWAITING_DP`; `confirmDownPayment`...

### 2026-06-13 â€” F2-1 inc.2a UAT runtime LULUS (rent-loyalty terbukti)
- Diuji end-to-end vs DB UAT (backend kode-baru :3002, stay 5 / tenant.gita, rent 850rb):
- CREATE â†’ `PENDING_DECISION`, DP=**255.000** (30%), downPaymentDueDate=**2026-06-30** (hari-H).

### 2026-06-13 â€” F2-1 inc.2a: State Machine Renewal DP (CORE, admin-verified)
- **`renew-requests.service.ts`** dibangun ulang ke state machine GAP #2:
- `createRequest` â†’ `PENDING_DECISION` + set `downPaymentAmountRupiah` (30% Ã— sewa SAAT INI â€” rent-loyalty D-16) + `downPaymentDueDate` = `plannedCheckOutDate`...

### 2026-06-13 â€” Paket deploy RAMPING + script cPanel (`make-deploy`, `cpanel:setup`)
- **`npm run make-deploy`** (root, `scripts/make-deploy.mjs`): build frontend combined â†’ folder **`deploy/`** = backend SOURCE (tanpa `node_modules`/`dist`/`sr...
- **Backend script cPanel** (`backend/package.json`): **`cpanel:setup`** = `npm ci && npm run build && npm prune --omit=dev` (build prisma engine Linux + tsc,...

### 2026-06-13 â€” COMBINED single-server: 1 proses serve frontend + API (`npm run golive:1`)
- Owner pilih arsitektur "1 server". Diimplementasi **dependency-free**:
- **`backend/src/main.ts`**: serve `frontend/dist` (copy â†’ `backend/client`, env `FRONTEND_DIST_PATH`, default `<backend>/client`) via `useStaticAssets` + **fa...

### 2026-06-13 â€” Target publish cPanel DIKONFIRMASI + rencana (04_DEPLOY Â§D)
- Owner konfirmasi host cPanel **mampu**: Node.js App (versi dukung) Â· PostgreSQL Â· SSH Â· build-on-server Â· AutoSSL. Resource upgrade bila kurang. Belum pasti:...
- **Arsitektur diputuskan: combined single-server** (backend serve `frontend/dist` + API, 1 proses/port/domain, tanpa CORS) â€” dependency-free (`useStaticAssets...

### 2026-06-13 â€” Go-live SATU PERINTAH: `npm run golive` (root) + port tetap dijamin
- **Root `package.json` + `scripts/golive-all.mjs`** (zero-dependency): `npm run golive` dari `final_bundle/` â†’ (1) **pastikan port 3000+5173 bebas** (deteksi...
- Frontend `golive` ditambah `--strictPort` (gagal jelas, tak geser port).

### 2026-06-13 â€” Go-live LAN: npm script `golive` + `build:lan` (self-host WiFi kos)
- Owner pilih go-live di localhost/LAN (kos 1 lokasi). Ditambah tooling konvenien **zero-dependency**:
- **`backend/scripts/golive.mjs`** + script `npm run golive`: set `NODE_ENV=production`, `DATABASE_URL`â†’`kost48_v3` (derive dari `.env`), `CORS_ORIGIN` auto da...

### 2026-06-13 â€” F1-12: DB Produksi `kost48_v3` Diprovisikan + Di-seed (lokal-as-prod 5433)
- **DB bersih:** `CREATE DATABASE kost48_v3` â†’ `prisma db push` (41 tabel) â†’ `bootstrap.sql` + `bootstrap_v4_addendum.sql` (bersih).
- **Seed fondasi (owner-driven):** OWNER `liem.lui@gmail.com` (bcryptjs, role OWNER) Â· COA **37 akun** (DEFAULT_COA) Â· AccountingPeriod 2026-06 **OPEN** Â· Cash...

### 2026-06-13 â€” F1-12 rehearsal: Runbook Fresh-Deploy Schema+Bootstrap LULUS
- Rehearsal di DB throwaway `kost48_v3_deploy_rehearsal` (5433): `prisma db push` â†’ **41 tabel** (=41 model) Â· `sql/bootstrap.sql` + `bootstrap_v4_addendum.sql...
- **Temuan F1-12:** DB fresh TIDAK punya user (bootstrap.sql tak buat User, tak ada seed script) â†’ endpoint seed butuh auth admin. `04_DEPLOY Â§2` ditambah PRAS...

### 2026-06-13 â€” F2-1 inc.1: Schema Renewal DP (owner-approved S-1)
- **Owner approval S-1** (`03_KEPUTUSAN_OWNER Â§S`): seluruh perubahan schema ADDITIVE disetujui (F2-1, F2-3b, F2-18, F3-14/15/17, F4-9).
- **`schema.prisma`** (additive): `RenewRequestStatus` +7 status (`PENDING_DECISION`, `AWAITING_DP`, `DP_SECURED`, `COMPLETED`, `REJECTED_BY_TENANT`, `EXPIRED_...

### 2026-06-13 â€” F2-6: Auto-tiket Inspeksi saat Cancel Stay Promoted (B-08)
- **`stays.service.ts` `cancel()`**: ketika stay yang dibatalkan `wasPromoted` (sudah dihuni) dan kamar â†’ MAINTENANCE, kini otomatis membuat tiket `CHECKOUT_IN...
- Menutup B-08: sebelumnya cancel stay promoted menaruh kamar di MAINTENANCE TANPA tiket â†’ kamar nyangkut selamanya (gate room-ready hanya buka lewat penutupan...

### 2026-06-13 â€” GATE RUNTIME FASE 1: LULUS (backend dev + DB UAT 5433)
- Verifikasi `05 Â§4-5` dijalankan terhadap data UAT (`kost48_v3_pro`), backend `npm run start:dev`:
- **trial-balance**: `isBalanced=true` (debit=kredit=119.694.250). Invarian #6 âœ“

### 2026-06-13 â€” F2-8: Nonaktifkan Endpoint Draft Jurnal Manual (F-22/F-23/D-05)
- **`accounting.controller.ts`**: route `POST /accounting/journal-entries/draft` (`createJournalDraft`) kini melempar `ForbiddenException` (403) â€” pembuatan ju...
- Opening Balance draft (jalur terpisah & terkontrol via OpeningBalanceWizard) TETAP berfungsi.

### 2026-06-13 â€” F1-10: Kunci Deposit = Room.defaultDepositRupiah (C3/D-05)
- **`stays.service.ts` create**: `deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah` â†’ `room.defaultDepositRupiah ?? 0` (abaikan override dto).
- **`tenant-bookings.service.ts` approveBooking**: hapus override `depositAmountRupiah: dto.depositAmountRupiah` dari update stay â€” deposit tetap di snapshot r...

### 2026-06-13 â€” F1-9: Deposit Bukan Operating Cashflow (F-10)
- **`cashflow-classifier.ts`**: sourceType `DEPOSIT` (dana titipan) tidak lagi masuk operating (fallback) â†’ kategori baru `depositLiabilityIn/Out` (perubahan l...
- **`accounting-reports.service.ts` `cashflow()`**: tambah section `depositLiability` (totalIn/Out/net + catatan "bukan kas operasional yang bisa dipakai"); `n...

### 2026-06-13 â€” F1-8: Guard Settlement Deposit (F-24)
- **`accounting-posting.service.ts` `postDepositSettlementTx`**: TAMBAH pra-cek â€” sebelum men-debit liability 2000, pastikan ada jurnal PENERIMAAN deposit POST...
- Menutup F-24: tanpa cek, settlement bisa men-debit 2000 tanpa kredit sebelumnya â†’ akun liability 2000 bersaldo DEBIT (uang titipan "hilang" dari buku). Recei...

### 2026-06-13 â€” F1-7: Invoice DRAFT Bukan Revenue (F-09)
- **`reports.service.ts` (4 agregat revenue/billed)** + **`finance.service.ts` (5 agregat revenue ber-periodStart)**: filter `status: { not: CANCELLED }` â†’ `st...
- **Sengaja TIDAK diubah** (LARANGAN): groupBy `countByStatus` di reports (masih perlu DRAFT untuk `unpaidCount`), dan openInvoice/AR (`notIn [PAID, CANCELLED]...

### 2026-06-13 â€” F1-6: Occupancy Rasio (F-04) dihitung inline
- **`financialRatios()`**: `occupancyRate` tak lagi membaca `bs.statement?.occupancyRate` (yang tidak ada â†’ selalu 0). Dihitung INLINE: `operableRooms = kamar...
- Helper `occupancyRatePercent` (di `financial-ratios.helper.ts`) + test (5/10â†’50; operable 0â†’0; 48/48â†’100). Total `test:unit` **13/13 hijau**.

### 2026-06-13 â€” F1-5: Deposit sebagai Kewajiban Lancar (F-03) â€” verifikasi & tutup (docs-only)
- Inti F1-5 (deposit masuk kewajiban lancar â†’ currentRatio turun wajar saat deposit HELD) sudah terpenuhi di **F1-4**: `currentLiabilities` memakai `CURRENT_LI...
- `balanceSheet()` ditelaah baris-demi-baris: identitas **A = L + E** benar â€” keenam tipe akun (ASSET/LIABILITY/EQUITY/REVENUE/COGS/EXPENSE) ter-map, contra-as...

### 2026-06-13 â€” F1-4: Rasio Keuangan Benar (F-02 presedensi + F-18 kas/AR)
- **`financial-ratios.helper.ts` (baru, pure)** + `backend/test/unit/financial-ratios.helper.test.js` (12/12 hijau total).
- **`accounting-reports.service.ts` `financialRatios()`**:

### 2026-06-13 â€” F1-3: Perbaikan Cashflow (F-01/05/19/20) + classifier teruji
- **Tulis `13_AKUNTANSI_LAPORAN Â§6`** â€” spec beforeâ†’after 4 sub-langkah (sebelumnya checklist menunjuk Â§6 yang belum ada).
- **`cashflow-classifier.ts` (baru, pure)** + `backend/test/unit/cashflow-classifier.test.js` (10/10 hijau total): klasifikasi arus kas terverifikasi zero-depe...

### 2026-06-13 â€” F1-2: Guard Hapus/Ubah Pembayaran Kamar OCCUPIED (D-17 / GAP #3 / B-04)
- **`invoice-payments.service.ts`** â€” tambah helper `assertStayNotOccupiedForPaymentMutationTx`, dipanggil di `update` + `remove` (dalam tx, sesudah `FOR UPDAT...
- Menutup lubang: pembayaran TANPA jurnal (best-effort skip) sebelumnya masih bisa dihapus saat kamar sudah ditempati â†’ occupancy vs uang inkonsisten. Booking...

### 2026-06-13 â€” F1-1R: No-Partial Menyeluruh (D-02 / GAP #1 / B-01)
- **`payment-submissions.service.ts` `approveSubmission`** â€” tambah gate re-validasi dua nominal sah (sebelumnya hanya blokir overpay â†’ bisa approve PARTIAL li...
- **`approveSubmission` invoice-only** (renewal/utilitas/manual) â€” wajib `amount === invoiceRemaining` (lunas penuh), bukan sekadar `â‰¤`.

### 2026-06-13 â€” F1-T: Sabuk Pengaman Unit Test Finance (baseline terkunci)
- **F1-T SELESAI** â€” pasang harness unit test zero-dependency (Node built-in `node --test`, tanpa npm install):
- `backend/test/unit/pricing.test.js` â€” `calculateRentByPricingTerm` (multiplier 13/45/75/100/550/1000% + pembulatan naik 5.000), `roundUpToNearest`, `isUtilit...

### 2026-06-13 â€” Audit Traceability Root Docs + Router `_PETA_AI` + Penomoran 06-09 (docs-only)
- **Buat `_PETA_AI.md`** â€” router 22 file root: Â§1 tabel "baca saat" + status akurasi, Â§2 anchor `file:baris` TERVERIFIKASI vs kode (`3c7ffe2`), Â§3 status defe...
- **Audit mendalam 22 file root â†’ perbaiki 4 defek traceability:**

### 2026-06-13 â€” Normalisasi Logic dan Referensi Root Docs
- Rename fisik dossier `06`-`15` menjadi `10`-`19` agar sesuai heading, blueprint, checklist, dan tab kerja.
- Tetapkan hierarki sumber kebenaran: keputusan owner untuk aturan bisnis, kode untuk perilaku aktual, checklist untuk ID/urutan task.

### 2026-06-13 â€” Audit Forensik V3 + 84 Keputusan Owner + Restruktur Docs Domain-Dossier (READ-ONLY, belum sentuh kode aplikasi)
- Subbagian: Audit forensik V3 (Fable 5, baca kode penuh per-baris)
- **97 temuan** di atas 53 temuan V1: finance F-17..F-34 (cashflow salah-akun F-01 + kembarannya F-18 yang LOLOS fix V1, rasio, BS-MoM 0%, settlement deposit b...

### 2026-06-12 â€” Simplifikasi & Update Docs â€” FLOW_MAP V2 + 6 Flow Baru + Arsip
- Subbagian: Update besar `docs/02_FLOW_MAP.md` (V2)
- **Koreksi 5 bagian basi:**

### 2026-06-12 (larut) â€” Eskalasi Tuntas + 5 Skenario Residual PASS + Runbook Deploy â†’ SIAP PRODUKSI
- Subbagian: Eskalasi diimplementasikan & diverifikasi runtime
- **E-1 Guard global (default-deny):** `APP_GUARD` JwtAuthGuard+RolesGuard + decorator `@Public()` (login/forgot/reset, public/bookings, public/rooms, faqs/pub...

### 2026-06-12 (malam) â€” UAT Siklus Overstay V5.12.1 PASS PENUH + Rekonsiliasi Bersih
- Subbagian: UAT overstay end-to-end (stay tes #15, kamar G2-003 â€” manipulasi tanggal via SQL UAT, eksekusi via `POST /auto-ops/run`)
- H-3: notifikasi "â° Kontrak berakhir 3 hari lagi" terkirim âœ“

### 2026-06-12 (sore) â€” E-2 Backfill (DB UAT) + UAT M-07/M-09 PASS Penuh
- Subbagian: E-2 â€” Backfill `initialMetersPromotedAt` (data fix, DB UAT 5433)
- 11 stay penghuni nyata (kamar OCCUPIED, jaminan terbayar) diisi `initialMetersPromotedAt = checkInDate` via SQL bertransaksi; 1 booking fase RESERVED dikecua...

### 2026-06-12 â€” Eksekusi FIX-01..26 oleh AI eksekutor (VERIFIED) + Audit UI/UX Visual
- Subbagian: Eksekusi audit mega (kode)
- AI eksekutor menerapkan **24/24 FIX** dari `04_FIX_INSTRUCTIONS.md` (commit e4a8c31..f9d10ac, 1 commit per FIX; M-26/M-27 digabung 1 commit â€” deviasi minor d...

### 2026-06-12 â€” Audit Mega Full-Sweep (docs only, tanpa perubahan kode aplikasi)
- Subbagian: Type
- Subbagian: Deliverables

### 2026-06-11 â€” Docs Compaction + Keputusan Owner D1â€“D4 (tanpa perubahan logika, 1 copy fix)
- Subbagian: Type
- Subbagian: Keputusan owner (detail di `02_FOCUS_PLAN.md` Â§3)

### 2026-06-11 â€” V5.12.2 Frontend DP/Jaminan + Rate Limiting + Audit Pass C/E/P3
- Subbagian: Type
- Subbagian: Frontend (fitur V5.12.x kini terlihat pengguna)

### 2026-06-11 â€” V5.12.1 Overstay Lifecycle (Keputusan Owner)
- Subbagian: Type
- Subbagian: Siklus overstay lengkap (auto-ops, urutan sequential)

### 2026-06-11 â€” V5.12.0 DP (Uang Muka) vs Deposit (Jaminan) + Overstay Enforcement Baru
- Subbagian: Type
- Subbagian: Schema (additive)

### 2026-06-11 â€” V5.11.1 Audit Pass A/B â€” Fix Paket 1
- Subbagian: Type
- Subbagian: Fixed

### 2026-06-11 â€” V5.11.0 Audit Hardening & Business Logic Fixes
- Subbagian: Type
- Subbagian: Commits (5)

