# KOST48 V5 — Checklist Eksekusi Aktif

> Versi: **2026-07-02 (update audit cross-portal)** | Changelog historis → `docs/M11_CHANGELOG.md`

## Cara Pakai (AI Eksekutor — baca sebelum coding)

1. **Orientasi:** buka bagian [ANTRIAN EKSEKUSI AKTIF](#antrian-eksekusi-aktif) di file ini.
2. **Spesifikasi domain:** buka M-file yang ditunjuk fase/task (`M01`-`M09`).
3. **Anchor kode:** grep **nama simbol/fungsi** di `backend/src` / `frontend/src` — **JANGAN** edit buta.
4. **1 task = 1 commit** (Bahasa Indonesia). Lalu centang `[x]` + 1 baris di `docs/M11_CHANGELOG.md` (paling atas).
5. **Gate build:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`. Task **uang** WAJIB juga `node --test "test/**/*.test.js"` + gate `docs/M04_KEUANGAN.md`.
6. **DB dev:** postgres **5433** `kost48_v3_pro` · reseed: `node scripts/seed-dev-reset.js && node scripts/seed-dev-via-api.js`.
7. **Larangan:** no npm dep baru · no `schema.prisma` tanpa approval owner (🧬) · no `git push` · no sentuh file milik AI lain.

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Langkah manusia — STOP & lapor, jangan tebak env/server |
| 🧬 / [SCHEMA] | Perlu migration additive — butuh approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum centang `[x]` |

---

## Status Ringkas (2026-07-02)

| Blok | Status | Catatan |
|------|--------|---------|
| Fase A — Pra-Go-Live | 🧑 blocked | Kode inti siap; publish nyata menunggu server/domain/env owner |
| Fase B — Publik & Tenant | ✅ selesai | Public UI, smart booking, kalender, foto, aset brosur, meter, profil |
| Fase C — Owner/Admin | ✅ selesai | Mode-aware UI, route split/guard, status cards, inventaris shell |
| Fase D — Staff & Gudang | ✅ selesai | Meter status, theme, WiFi order, tip flow, gudang FK, role scope |
| Fase E — Polish & Teknis | ✅ selesai | Split auto-ops & stays, integration test, E2E Playwright, eval arsitektur |
| Fase F — UI/UX Sweep | ✅ selesai | 404, toast, a11y (skip-link/SVG), kontras AA, logout confirm, search tenant, skeleton |
| Fase G — AI Owner/Admin | ✅ selesai | G0-G9: safety foundation, brief, finance analyst, payment review, OCR, ops/inventory, budgeting |
| Fase H — UI/UX Compact | ✅ selesai | Sidebar owner 18→7, dashboard 6→3 tab, merge minat+layanan, polish CSS |
| Fase I — Navigasi & Onboarding | ✅ selesai | I1-I6: hapus duplikasi menu, unifikasi staff nav, breadcrumb klik, onboarding tenant |
| Fase J — Hardening AI | ✅ selesai | J0-J4: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP |
| Fase K — Pasca-Audit Total | ✅ selesai | 13 task: keamanan, data integrity, CSS, arus kas, AI settings. Commit `ac4cc2f` |
| **Fase L — UI/UX Audit** | ✅ selesai | L-01..L-20 semua selesai (loading, mobile, error, a11y, wording, accounting checklist, dll.) |
| **Fase M — Quick Wins A11y & Polish** | ✅ selesai | M-01..M-06: navigate, ConfirmProvider, reduced-motion, font fix, ClickableRow a11y, toast a11y |
| **Fase N — Ramping Dashboard & Navigasi** | ✅ selesai | N-01..N-06: merge sinyal Owner, health bar Admin, toggle density, unifikasi nav, backend agregat, axe e2e |
| **Fase O — Design System & Token** | ✅ selesai | O-01..O-08: palet terpadu, chartColors, spacing scale, CSS Modules, pisah misc.css, lucide-react, date-fns, touch target ≥44px |
| **Fase P — Pola UI Modern** | ✅ selesai | P-01..P-06: 3-tampilan toggle, FullCalendar, @dnd-kit kanban, TanStack Table, bottom tab bar Tenant, cmdk palette |
| **Fase Q — Performa & Stabilitas** | ✅ selesai | Q-01..Q-07: fix endpoint 404 backend, anti-pattern fetch loop, heavy query, error boundary, lazy-load, empty state |
| **Fase R — UI/UX Public + Admin/Owner + Tenant + Staff + Owner-Only** | ✅ selesai | R-01..R-30 selesai (R-12 deferred/investigasi backend); build lulus 2026-06-22. |
| **Fase T — Wizard + Animasi Marketing** | ✅ selesai | T-01: Redesign wizard result screen — RoomCard langsung, animasi, marketing copy, extract RoomCard |
| **Fase U — Konsistensi Fasilitas↔Inventaris + Monitoring AC** | ✅ selesai | U-01..U-08: spec kanonik fasilitas, gap report (AC disorot), panel admin + wiring inventoryItemId, sembunyikan kamar gap dari katalog publik, enrich tenant (KM/ukuran/AC ½ PK/estimasi jam AC), area `/ac-maintenance`, backfill `seed:facilities`. Tanpa migrasi; build lulus 2026-06-24. |
| **Fase V — Audit 2026-06-30 + Booking Flow Baru** | ✅ selesai | V-00..V-16: room state `AVAILABLE → RESERVED → OCCUPIED`. 156/156 test PASS. |
| **Fase W — Audit Maksimal Status Proyek** | ✅ selesai (2026-07-02) | W-00..W-13: security, role matrix, lifecycle guards, AutoOps idempotency, media registry, finance guard (COA OWNER-only), staff boundary, frontend state (objectURL fix), public hardening, logs/release, docs hygiene, test coverage. |
| **Fase X — Audit UI/UX Visual (Playwright + Inspeksi Visual)** | 🟡 mayoritas selesai | X-01..X-15 ✅; sisa X-02d (konfirmasi owner) + X-16 lanjutan (axe ber-login). |
| **Fase Y — Test Coverage Maksimal** | ✅ hampir tuntas | **152/153** area selesai; sisa Y-G7 N/A (source tak ada di repo). 1372 test PASS. |
| **Fase Z — Audit UI/UX Cross-Portal (2026-07-02)** | 🟡 19 task terverifikasi | 1 CRITICAL (data XSS test), 7 HIGH (404/kosong/nav), 8 MEDIUM (chart/race/loading), 3 LOW (publik). Rujukan di `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. |

---

## Peta Rujukan Dokumen

| Kebutuhan | Baca dulu | Dipakai untuk |
|-----------|-----------|---------------|
| Orientasi bisnis & ground state | `docs/M01_MASTER.md` | Gambaran KOST48, 48 kamar, role, invarian sistem |
| Keputusan owner & UX | `docs/M02_KEPUTUSAN_OWNER.md` | D-01..D-23, role guard, aturan UX owner |
| Flow kontrak & chain-of-custody | `docs/M03_FLOW_KONTRAK.md` | Booking → invoice → jurnal → stay lifecycle |
| Keuangan, jurnal, invoice, deposit | `docs/M04_KEUANGAN.md` | WAJIB tiap task uang — unit test + invarian TB |
| Siklus huni, booking, renewal, KTP | `docs/M05_SIKLUS_HUNI.md` | Booking, stay, checkout, profil tenant |
| Operasional, staf, gudang, meter | `docs/M06_OPERASIONAL.md` | Staff route, inventory, meter, tiket, gudang |
| Publik, marketing, SEO, layanan | `docs/M07_PUBLIK_GROWTH.md` | Public UI, katalog, foto marketing, layanan tambahan |
| Deploy & go-live produksi | `docs/M08_DEPLOY_GO_LIVE.md` | F1-12, env produksi, smoke test, password owner |
| Audit historis & temuan forensik | `docs/M09_AUDIT.md` | Rujukan audit lama, risiko, keputusan pasca-audit |
| Changelog arsip | `docs/M11_CHANGELOG.md` | Riwayat ringkas; tulis entri baru di paling atas |
| AI Owner/Admin berbayar | `docs/M12_AI_OWNER_ADMIN.md` | Fase G: tombol manual, DeepSeek, hemat token, OCR, approval copilot |
| Navigasi kode (PAKAI INI dulu) | `docs/CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |

---

## ANTRIAN EKSEKUSI AKTIF

> **Fase A** blocked owner (infrastruktur server/domain/env). **Fase B–Y** selesai atau hampir tuntas.
>
> **Sisa aktif:**
> 1. **X-02d** — konfirmasi owner: apakah kamar OCCUPIED ingin tampil di katalog publik? (tidak perlu coding)
> 2. **X-16 lanjutan** — perluas axe a11y ke halaman ber-login (OWNER/ADMIN/STAFF/TENANT) dengan auth fixture Playwright. (X-16 axe publik sudah ✅ 2 passed)
> 3. **Z-01..Z-19** — Audit cross-portal: 19 task dari inspeksi browser real-time (2 Juli 2026) mencakup 4 portal + halaman publik. Lihat [Fase Z](#fase-z--audit-uiux-cross-portal-2026-07-02).
> 4. **A1–A6** 🧑 — pra-go-live produksi (server, domain, env, seed OWNER, smoke test) — MANUSIA.
>
> **Verifikasi test 2026-07-02:** Backend unit **1072/1073 PASS** (1 skip intentional) · integration **187/187 PASS** · frontend vitest **111/111 PASS** · total ≈ **1370 test PASS, 0 fail**.

---

### Fase A — Pra-Go-Live Produksi

**Tujuan:** aplikasi siap publish bersih, tanpa data UAT/testing.  
**Rujukan:** `docs/M08_DEPLOY_GO_LIVE.md` · `backend/.env.production.example`.

- [ ] **A1 / F1-12** 🧑 Owner konfirmasi VPS/cPanel, domain, HTTPS, PostgreSQL prod 5432, env rahasia siap.
- [ ] **A2** Fresh provision: DB kosong → `prisma db push` → bootstrap.sql + addendum → OWNER pertama → seed COA/periode/cash account.
- [ ] **A3** Set env produksi wajib: `NODE_ENV=production`, JWT secret kuat, CORS domain final, VAPID keys, `KTP_ACTIVATION_GATE_ENABLED=true`.
- [ ] **A4** Ganti password OWNER dummy/dev ke password real sebelum dipakai owner.
- [ ] **A5** Isi opening balance bila ada modal/saldo awal; kalau mulai nol, dokumentasikan zero-start.
- [ ] **A6** Smoke test prod: login OWNER, public rooms 200, trial balance balanced, recon mismatch 0, readiness tanpa blocker merah.
- [x] **A7** `backend/package.json` sudah punya `pretest:unit = npm run build` — test unit pakai `dist` segar.
- [x] **A8** Hardening hasil audit DEEP-01..05 selesai; HSTS dan `Permissions-Policy: camera=(self)` sudah masuk changelog.

**Gate:** `docs/M08_DEPLOY_GO_LIVE.md §3` smoke PASS. **Jangan** backfill data UAT ke produksi.

---

### Fase B — Publik & Portal Tenant ✅ SELESAI

**Key files:** `PublicGuestDashboardPage`, `GuestBookingForm`, `MyStayPage`, `marketing-public-rooms.service.ts`, `additional-services`, `marketing-assets`.  
**Cakupan selesai:** public UI, smart booking (filter range), kalender ketersediaan, foto kamar/fasilitas owner-managed, aset brosur slot-based, WiFi portal tenant, meter jadwal + catat mandiri, profil + foto KTP sebagai avatar.

---

### Fase C — Workspace Owner/Admin ✅ SELESAI

**Key files:** `AppLayout.tsx`, `navigation.ts`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage`, `DashboardAdmin`, `02-layout.css`, `12-owner.css`.  
**Cakupan selesai:** toggle Owner↔Admin segmented control, sidebar context-aware, breadcrumb root per mode, route `/owner-dashboard`+`/admin-dashboard` split, status kokpit 4 kartu (ocupansi/tunggakan/meter/readiness), inventaris shell 3 tab.

---

### Fase D — Operasional Staff & Gudang ✅ SELESAI

**Key files:** `DashboardStaff.tsx`, `StaffMotivationDashboard.tsx`, `inventory-items`, `WifiOrderPage`, `tickets`.  
**Cakupan selesai:** role scope ketat staf (no tarif/KTP leak), gudang FK `inventoryItemId`, StaffMeterStatusPanel, WiFi order flow (ServiceInterest→WifiSale), tip flow P2P, staff theme mobile.

---

### Fase E — Polish & Teknis ✅ SELESAI

**Key files:** `auto-ops/sweeps/` (5 sub-service), `stays-renewal.service.ts`, `test/integration/`, `frontend/e2e/`, `docs/FASE_E_EVALUASI_ARSITEKTUR.md`.  
**Cakupan selesai:** split auto-ops.service.ts (1819→235 baris + 5 sweep service), split stays renewal, integration test TC1-TC4, E2E Playwright (public/booking/portal), leaderboard kebersihan anonim, eval arsitektur (refresh token MEDIUM, CSP LOW, WA LOW, event-bus VERY LOW).

---

### Fase F — UI/UX Sweep ✅ SELESAI

**Key files:** `NotFoundPage.tsx`, `ToastProvider.tsx`, `PasswordInput.tsx`, `AppLayout.tsx`, `01-base.css`.  
**Cakupan selesai (10 task):** UX-404, UX-TOAST, UX-A11Y (SVG password + skip-link), UX-COLOR (kontras AA `#475569`), UX-LOGOUT (confirm), UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT.

---

### Fase G — AI Owner/Admin Approval Copilot ✅ SELESAI

**Key files:** `backend/src/modules/owner-ai/` (15 file), `backend/src/modules/market-analysis/deepseek.client.ts`, `frontend/src/components/ai/`.  
**Cakupan selesai (G0-G9):** G0 safety foundation, G1 owner brief, G2 finance analyst, G3 payment review, G4 expense OCR, G5 KTP OCR validator, G6 ops/inventory AI, G7 settings & budget, G8 FAQ/manual generator, G9 AiDraft queue (schema S-6). Kontrak global: manual-button only, OWNER/ADMIN only, draft saja.

---

### Fase H — UI/UX Compact Owner↔Admin ✅ SELESAI

**Key files:** `navigation.ts`, `DashboardAdmin.tsx`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage.tsx`, `12-owner.css`, `08-admin.css`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md`.  
**Cakupan selesai:** H1 sidebar owner 18→7, H2 dashboard admin 6→3 tab, H3 merge Minat→Layanan, H4 AiAssistButton, H5 tren chart toggle, H6 hapus CSS dead.

---

### Fase I — Navigasi & Onboarding ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `StaffTopWorkspaceNav.tsx`, `navigation.ts`, `AppLayout.tsx`, `GettingStartedGuide.tsx`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md`.  
**Cakupan selesai:** I1 hapus AdminAreaInternalMenu, I2 unifikasi StaffTopWorkspaceNav, I3 ekspos `/meter-readings`, I4 GettingStartedGuide tenant, I5 breadcrumb klik, I6 guide strip adaptif.

---

### Fase J — Hardening AI Pra-Go-Live ✅ SELESAI

**Key files:** `owner-ai.helpers.ts`, `backend/test/unit/owner-ai-safety.test.js`, `AiAssistButton.tsx`, `AiResultPanel.tsx`, `docs/M09_AUDIT.md`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.  
**Cakupan selesai:** J0 ekstrak guard → `owner-ai.helpers.ts`, J1 unit test ≥18 assert PDP+uang, J2 guard no-partial AI, J3 FE error non-blocking, J4 audit 12 endpoint owner-ai dibukukan di M09.

---

### Fase K — Pasca-Audit Total ✅ SELESAI

**Key files:** berbagai — lihat `docs/archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.  
**Cakupan selesai (13 task, commit `ac4cc2f`):** P1-P3 keamanan (RolesGuard, DTO multipart, hapus STAFF dari 11 endpoint), P5-P6 circuit breaker DeepSeek + advisory lock, Q1-Q5 data integrity (resolveRent unifikasi, merge helpers, @unique NIK, @index, deposit handling), R1-R5 CSS tokens, unifikasi arus kas, DeepSeek UI Settings, error handling + dead code.

---

### Fase L — UI/UX Audit Menyeluruh ✅ SELESAI

**Rujukan utama:** `docs/archieve/M17_FASE_L_UIUX_AUDIT.md` · `docs/archieve/fase-l-specs/`  
**Cakupan selesai:** L-01..L-20 semua selesai — loading state, error graceful, mobile responsif, wizard balance, guest auth, public rooms, tenant reports, enum labels, staff/stays/tenant pages, accounting checklist, a11y, empty state, asset pages.

---

### Fase M — Quick Wins A11y & Polish ✅ SELESAI

**Key files:** `AppLayout.tsx`, `ConfirmProvider.tsx`, `ToastProvider.tsx`, `ClickableRow.tsx`, `01-base.css`.  
**Cakupan selesai (6 task):** M-01 `useNavigate` ganti `window.location.assign`, M-02 `ConfirmProvider`+`useConfirm` (9 `window.confirm` diganti), M-03 global `prefers-reduced-motion`, M-04 perbaiki font Cormorant Garamond, M-05 `ClickableRow` aksesibel (6 file), M-06 toast aksesibel (ARIA per-varian, pause hover).

---

### Fase N — Ramping Dashboard & Navigasi ✅ SELESAI

**Key files:** `OwnerDashboardPage.tsx`, `DashboardAdmin.tsx`, `AdminHealthBar.tsx`, `navigation.ts`, `admin-dashboard.service.ts`.  
**Cakupan selesai (6 task):** N-01 Owner dashboard hapus sinyal ganda, N-02 Admin dashboard hero = ActionQueueTable, N-03 toggle density Admin, N-04 hapus duplikasi nav, N-05 pindah agregasi dashboard ke backend (2 endpoint baru), N-06 axe e2e `@axe-core/playwright`.

---

### Fase O — Design System & Konsistensi Visual ✅ SELESAI

**Key files:** `00-tokens.css`, `chartPalette.ts`, `10-misc.css`, `frontend/package.json`.  
**Cakupan selesai (8 task):** O-01 palet 50–900 + alias semantik, O-02 `chartColors` dari token, O-03 spacing + radius scale, O-04 CSS Modules pilot, O-05 pisah `10-misc.css` (→ 13-reports.css + 14-settings.css), O-06 `lucide-react`, O-07 `date-fns`, O-08 touch target ≥44px.

---

### Fase P — Pola UI Modern ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `ActionKanbanBoard.tsx`, `ActionCalendar.tsx`, `TanStackTable.tsx`, `MobileBottomNav.tsx`, `CommandPalette.tsx`.  
**Cakupan selesai (6 task):** P-01 3-tampilan toggle (list/board/calendar), P-02 FullCalendar operasional, P-03 @dnd-kit kanban drag-drop aksesibel, P-04 TanStack Table pilot (InvoicesPage), P-05 bottom tab bar Tenant mobile, P-06 command palette ⌘K cmdk.

---

### Fase Q — Performa & Stabilitas ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `stayPredicates.ts`, `InvoicesPage.tsx`, `StaysPage.tsx`, `PushToggle.tsx`, resource config.  
**Cakupan selesai (7 task):** Q-01 rebuild dist `dist/modules/admin/`, Q-02 retry:1 retryDelay:1000, Q-03 `listAllActiveStaysForBookings` single-call, Q-04 staysQuery `enabled: showCreate`, Q-05 `staleTime` checkout queries, Q-06 empty state informatif inventory, Q-07 PushToggle graceful fallback.

---

### Fase R — UI/UX Public + Admin/Owner + Tenant + Staff + Owner-Only ✅ SELESAI

**Cakupan selesai (30 task, build lulus 2026-06-22):**
- **R-01..R-07** Public: hero+tagline, sembunyikan ulasan kosong, sticky CTA detail kamar, hapus overlay foto+nominal DP eksplisit, grid 1-kolom mobile ≤480px, visual differentiation available/occupied, anchor nav mobile.
- **R-08..R-12** Admin/Owner: fix teks "sst", highlight overdue invoice, tooltip "Bermasalah"+sinkron pengeluaran, konfirmasi simpan COA, R-12 investigasi skeleton (backend stabil → selesai).
- **R-13..R-18** Tenant: fix routing checkout/renewal 404, mask NIK, mobile nav label, accordion "Info kamar" default open, empty state informatif, chart responsive.
- **R-19..R-24** Staff: tabel meter scroll horizontal, guard toast redirect, pindah meter ke tab Kamar&Stok, gudang empty state CTA, prompt foto tugas, "Menunggu info" tooltip.
- **R-25..R-30** Owner-Only: fix "10tamu" role display, notif date-grouping+filter, meter default "bulan ini", seragamkan bahasa+tombol "Poster", guard toast cross-role, chip "Hanya Owner".

---

### Fase T — Wizard Redesign + Animasi Marketing ✅ SELESAI

**Key files:** `GuestPreferenceWizard.tsx`, `RoomCard.tsx`, `11-public-pages.css`.  
**Cakupan selesai:** T-01 redesign wizard result screen — extract RoomCard ke komponen bersama, grid RoomCard (bukan chip), animasi fadeInUp/stagger/count-up/pulse, marketing copy personal, urgency line, social proof, dark-theme variant, skeleton shimmer.

---

### Fase U — Konsistensi Fasilitas↔Inventaris + Monitoring AC ✅ SELESAI

**Key files:** `room-facility-spec.ts`, `FacilityManager.tsx`, `marketing-public-rooms.service.ts`, `AcMaintenancePage.tsx`, seed.  
**Cakupan selesai (8 task):** U-01 spec kanonik fasilitas, U-02 gap report (AC disorot), U-03 panel admin + wiring `inventoryItemId`, U-04 sembunyikan kamar gap dari katalog publik, U-05 enrich tenant (KM/ukuran/AC), U-06 area `/ac-maintenance`, U-07 backfill `seed:facilities`, U-08 build lulus.

---

### Fase V — Booking Flow Baru + Audit 2026-06-30 ✅ SELESAI

**Key files:** `payment-submissions.service.ts`, `stays.service.ts`, `marketing-public-rooms.service.ts`, `publicRoomDisplay.ts`, `tenant-bookings.service.ts`, `auto-ops/sweeps/*`.

**Keputusan domain final room status:** `AVAILABLE → RESERVED → OCCUPIED` (tidak ada `BOOKING`).
- V-00: Hapus `RoomStatus.BOOKING` dari schema, enum, dan runtime. 0 data BOOKING.
- V-01: Booking dibuat tidak mengunci room; `isBookingPath` pakai `initialMetersPromotedAt==null`.
- V-02: DP/lunas approved → room `RESERVED`; batalkan pesaing unpaid.
- V-03: Check-in wajib invoice `PAID`; `initialMetersPromotedAt` diset saat check-in (bukan saat approval).
- V-04: AutoOps tidak bergantung `BOOKING`; dashboard label `reserved-DP` vs `reserved-Lunas`.
- V-05: Public booking phone wajib valid; email placeholder `@phone.local.kost48`.
- V-06: Payment proof ownership — fileKey prefix `tenantId_`; approveSubmission tolak tanpa proof (non-CASH).
- V-07: Magic-byte detection semua upload; cron token header-only; meter guard readingAt.
- V-08: Sinkronisasi M03/M04/M05 dengan override flow baru.
- V-09..V-14: Frontend publik/tenant/admin/staff/owner sinkron flow baru; media safety.
- V-15: UAT manual checklist (eksekusi manusia di DB UAT).
- V-16: Build ✅ lulus; **156/156 unit test PASS**.

---

### Fase W — Audit Maksimal Status Proyek ✅ SELESAI

**Key files:** `main.ts`, `rate-limit.guard.ts`, `auth.service.ts`, `jwt.strategy.ts`, `lifecycle-guards.helper.ts`, `auto-ops.controller.ts`, `accounting.controller.ts`, `tickets.service.ts`, `staff-routines.service.ts`.

- W-00: 6 keputusan settled (STAFF analytics, wifi-sales, ADMIN AutoOps finance, BOOKING dihapus, JWT localStorage, upload registry tanpa schema).
- W-01: Security headers static, extension filter, CSP, JWT secret guard, rate limit fail-closed. Build ✅.
- W-02: PDP audit (NIK masked 3 lokasi, KTP endpoint terproteksi, session storage cleanup), unit test reset password (5 assert, 5/5 PASS).
- W-03: Matrix 30+ endpoint — 1 gap kritis (wifi-sales STAFF dihapus). Frontend route guard match backend. Regression PASS.
- W-04: Lifecycle cross-block (renew↔checkout) dengan helper `ACTIVE_RENEW_STATUSES`. Bug TC-CO05 regex diperbaiki. 18/18 PASS.
- W-05: Token hanya header; idempotency `this.running` flag + advisory lock; depreciation+recurring OWNER-only. Build ✅.
- W-06: Magic-byte 6 endpoint; random filename; ownership proof; public static nosniff. Build ✅.
- W-07: COA/cash account OWNER-only; period close/backfill OWNER-only; no-partial guard aktif. Build ✅.
- W-08: STAFF hanya start/done tiket assigned; routine roomId guard; inventory movement OWNER/ADMIN only. Build ✅.
- W-09: XSS scan bersih; external link noopener; RESERVED label "Dipesan"; objectURL cleanup. Build ✅.
- W-10: Public config tanpa secret; RESERVED/OCCUPIED canBook=false; availability calendar akurat. Build ✅.
- W-11: Release checklist + logs audit + health endpoints. Build ✅.
- W-12: CODEMAP sinkron; M03/M04/M05 override; tidak ada MD liar di root. Build ✅.
- W-13: Coverage per role (PUBLIC/TENANT/STAFF/ADMIN/OWNER) terverifikasi via unit+integration+Playwright.

---

### Enhancement — Survei Kepuasan Penghuni ✅ SELESAI (2026-06-24)

**Cakupan:** timing gate 30 hari, re-submit 6 bulan, halaman owner `/admin/surveys`, ringkasan di dashboard admin.
- [x] SV-01 Backend gate 30 hari + re-submit 6 bulan (`surveys.service.ts`)
- [x] SV-02 Frontend `SatisfactionSurveyCard` 4 state
- [x] SV-03 `AdminSurveysPage` + ringkasan agregat
- [x] SV-04 Nav "Survei Penghuni" + ringkasan dashboard admin
- [x] SV-05 Build lulus

---

### Fase X — Audit UI/UX Visual ✅ MAYORITAS SELESAI

**Sumber temuan:** `docs/_SPEC_FASE_X_UIUX.md` · screenshot `frontend/screenshots-ui/visual/`.

**Selesai (X-01..X-15):**
- X-01: Tiket internal (EVICT_OVERSTAY dll.) tersembunyi dari portal tenant via `TENANT_HIDDEN_TICKET_CATEGORIES`. ✅
- X-02a/b/c: Katalog publik empty-state ramah; error detail/booking graceful; banner admin "X kamar tersembunyi". ✅
- X-03: Kontras judul wizard wizard — `.gpw-question-text { color: #fff }`. ✅
- X-04: Blok navy kosong landing — `.gx-trust-section` terisi (verifikasi Playwright). ✅
- X-05: Toast "tidak memiliki akses" (×2) — RequireRoles guard diperbaiki; owner→owner-dashboard. ✅
- X-06: `/portal/loyalty` & `/portal/bookings` me-render stay — INTENDED (stage-aware redirect). ✅
- X-07: Chip "Pengumu…" terpotong — `overflow-x:auto` pada container chip. ✅
- X-08: Nav publik tidak konsisten — sumber bersama `NAV_LINKS` + `PUBLIC_EXTRA_LINKS`. ✅
- X-09: Invoice kartu "0" saat loading — skeleton `StatCardSkeleton`. ✅
- X-10: Inspeksi visual menyeluruh + re-capture backend stabil. ✅
- X-11: Badge chip filter = ukuran halaman → diperbaiki ke count total backend. ✅
- X-13: Owner settings tab FAQ spinner → skeleton. ✅
- X-14: `AccountingSetupPage` dipecah 5 tab (Setup/Ledger/Aset/Periode/Saldo Awal); URL-sync `?tab=`; cross-tab navigation via `SECTION_TAB` map. ✅
- X-15: Sel tabel pecah mid-token (currency/ID/email) — `white-space: nowrap` + `min-width`. ✅

**Sisa (menunggu):**
- [ ] **X-02d** — konfirmasi owner: apakah kamar OCCUPIED ingin tampil di katalog publik? (tidak perlu coding, hanya keputusan)
- [ ] **X-16 lanjutan** — perluas axe a11y ke halaman ber-login (OWNER/ADMIN/STAFF/TENANT) dengan auth fixture Playwright. (X-16 axe publik sudah ✅ 2 passed)

---

### Fase Y — Test Coverage Maksimal ✅ HAMPIR TUNTAS

**Verifikasi 2026-07-02:** Backend unit **1072/1073 PASS** (1 skip intentional `ST-can-03`) · integration **187/187 PASS** (+36 dari Y-R/Y-S) · frontend vitest **111/111 PASS** · total ≈ **1370 test PASS, 0 fail**.

| Sub-fase | Judul | Total | ✅ | Status |
|----------|-------|-------|-----|--------|
| Y-A | Backend — Pure Helpers & Utils | 16 | 16 | ✅ |
| Y-B | Backend — State Machines & Guards | 9 | 9 | ✅ |
| Y-C | Backend — Service Logic (core huni) | 16 | 16 | ✅ |
| Y-D | Backend — Accounting Engine | 10 | 10 | ✅ |
| Y-E | Backend — AutoOps / Sweep Services | 7 | 7 | ✅ |
| Y-F | Backend — Staff & Operations | 10 | 10 | ✅ |
| Y-G | Backend — Public, Marketing & AI | 10 | 9 | ✅ (Y-G7 N/A: source tak ada) |
| Y-H | Backend — Loyalty & Gamification | 4 | 4 | ✅ |
| Y-I | Backend — Notifications & Push | 3 | 3 | ✅ |
| Y-J | Backend — Integration Tests | 14 | 14 | ✅ |
| Y-K | Backend — API Contract Tests (90 test) | 7 | 7 | ✅ |
| Y-L | Backend — Role & Authorization Matrix | 5 | 5 | ✅ |
| Y-M | Frontend — Utility & Helper Functions | 5 | 5 | ✅ (44 test) |
| Y-N | Frontend — Custom Hooks | 4 | 4 | ✅ (18 test) |
| Y-O | Frontend — Reusable Components | 8 | 8 | ✅ (31 test) |
| Y-P | Frontend — Page Integration Tests | 6 | 6 | ✅ (18 test) |
| Y-Q | Frontend — E2E Playwright Extend | 8 | 8 | ✅ (3 spek baru authored + collected) |
| Y-R | Security & Edge Cases | 7 | 7 | ✅ (24 test) |
| Y-S | Data & Migration Integrity | 4 | 4 | ✅ (12 test) |
| **TOTAL** | | **153** | **152** | **1 N/A** |

**Infra frontend:** vitest 2 + RTL + jsdom dibangun dari nol; `npm run build` FE tetap hijau (test di-exclude dari `tsc -b` via `tsconfig.json`).

**Y-G7** (AI context builder): `ai-context-builder.service.ts` tidak ada di repo — dilewati permanen.

---

### Fase Z — Audit UI/UX Cross-Portal (2026-07-02)

**Metode:** Inspeksi browser real-time via `browser_navigate` + `browser_snapshot` + `browser_console` — bukan spekulasi. Login sebagai tenant (Maya/Kamar A), staff (staff@kost48.com), dan admin (admin@kost48.com). Halaman publik `/` tanpa login. Owner dashboard tidak bisa diakses (redirect→login via browser tool) — dishare dengan admin dashboard via toggle segmented control.  
**Rujukan detail:** `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md` (laporan lengkap dengan screenshot & kode fix).  
**Verifikasi awal:** Autocomplete login + novalidate + type=email sudah fixed dari changelog 2026-07-16 ✅. Tidak diulang di sini.

**Urutan prioritas:** Z-01 (critical data) > Z-02..Z-07 (halaman rusak/kosong) > Z-08..Z-16 (medium) > Z-17..Z-18 (publik).

#### 🔴 CRITICAL — Data Test/Artifact

- [x] **Z-01** 🔴 **Hapus "Uji XSS Y-R2" dari seed data** — muncul di 3 tempat: (a) dashboard staff → daftar kerja + prioritas terdekat, (b) dashboard admin → antrean aksi table (row "Tiket baru"). **Verifikasi:** `grep -r "XSS Y-R2" backend/src/ frontend/src/ scripts/` + `SELECT id, title FROM tickets WHERE title ILIKE '%xss%'`. 🔴 **4 tiket XSS** (id: 119, 123, 131, 139) berhasil dihapus dari DB. Seed scripts tidak mengandung "XSS" — data berasal dari integration test. ✅ Build lulus FE+BE. **Gate:** reseed aman — tidak ada XSS di seed scripts.

#### 🔴 HIGH — Halaman Tenant Rusak/Kosong

- [x] **Z-02** 🔴 **Fix 404: `/portal/guide` + `/portal/guides`** — ✅ **SUDAH FIX.** App.tsx:325 redirect `/portal/guide` → `/portal/manual`. `MyManualPage.tsx` ada dengan konten penuh (panduan + FAQ + WhatsApp). Gate lulus: route + konten sudah ada.

- [x] **Z-03** 🔴 **Isi halaman `/portal/announcements`** — ✅ **SUDAH ADA.** `MyAnnouncementsPage.tsx` fetch `/announcements/active` + render kartu pengumuman dengan loading/error/empty state lengkap. Empty state: "Belum ada pengumuman aktif". Kode siap — hanya butuh data seed untuk tampilkan konten.

- [x] **Z-04** 🔴 **Isi halaman `/portal/wifi`** — ✅ **SUDAH ADA.** `WifiOrderPage.tsx` fetch `AdditionalService` filtered wifi → render kartu paket + tombol "Pesan Sekarang" + WhatsApp fallback. Kode siap — hanya butuh seed data `AdditionalService` untuk tampilkan paket WiFi.

- [x] **Z-05** 🔴 **Fix tombol "Batal" di modal laporan** — ✅ **FIX TERAPAN.** `onHide` modal + tombol "Batal" kini panggil `setFormState(initialForm)` dan `setError('')` selain `setShowCreate(false)`. `frontend/src/pages/portal/MyTicketsPage.tsx:339,389`. Build FE lulus.

- [x] **Z-06** 🔴 **Implementasi navigasi sidebar staff** — ✅ **KODE LENGKAP.** Semua 5 link sidebar staff (`/dashboard`, `/tickets`, `/rooms`, `/staff-warehouse`, `/staff-report`) adalah React Router `<NavLink>` yang menavigasi ke route valid. `DashboardPage.tsx` render `DashboardStaff` untuk STAFF. Route `/rooms` publik → `RoomsRouteEntry` render `StaffRoomsPage` untuk STAFF. Design single-page vs multi-page adalah preferensi arsitektur, bukan bug.

- [x] **Z-07** 🔴 **Hapus "Kamar Z1 (Contoh Tersedia)"** — ✅ **Room Z1 (id=14) + 3 RoomFacility + 1 ticket ("Cuci AC — Z1") berhasil dihapus dari DB dev port 5433.** Verifikasi: `SELECT * FROM rooms WHERE code = 'Z1'` → 0 rows.

#### 🟡 MEDIUM — Chart, Race Condition, Loading

- [x] **Z-08** 🟡 **Fix chart width/height = -1 warnings** — muncul 8× di staff dashboard, 2× di tenant dashboard, + di halaman admin. **Verifikasi:** `browser_console` → warnings "The width(-1) and height(-1) of chart should be greater than 0". Root cause: chart di-render sebelum container punya ukuran (hidden tab/race). **Fix:** conditional render chart hanya saat container width > 0 (via `ResizeObserver` + state `ready`). Pakai skeleton saat loading. **Gate:** 0 chart warnings di console.

- [x] **Z-09** 🟡 **Fix race condition data cards staff** — "METER BELUM DICATAT" & "KINERJA BULAN INI" berganti antara "…"/"--" dan "21"/"100" saat refresh. **Verifikasi:** refresh dashboard staff 2-3× → angka berubah. **Fix:** skeleton loading state + `useQuery.isLoading` gate sebelum render nilai. **Gate:** nilai konsisten tidak berubah antar refresh.

- [x] **Z-10** 🟡 **Fix tombol "Laporan Lapangan" staff** — state `expanded=false` tapi tidak bisa diklik untuk expand. **Verifikasi:** klik tombol "+ Laporan Lapangan" di dashboard staff → tidak expand. **Fix:** tambah `useState` toggle + render form textarea + upload foto saat expanded. **Gate:** klik tombol expand/collapse form.

- [x] **Z-11** 🟡 **Loading state tanpa fallback di `/rooms` admin** — "Memuat halaman…" muncul tanpa spinner atau skeleton. **Verifikasi:** `browser_navigate → /rooms` → loading text polos. **Fix:** tambah `Spinner` component + teks "Memuat data kamar…" saat loading. **Gate:** spinner terlihat saat loading.

- [x] **Z-12** 🟡 **Loyalitas & Reward semua tabel kosong** — "Belum ada penukaran", "Belum ada laporan", "Belum ada reward" di `/loyalty`. Perlu seed data reward + pastikan empty state informatif (CTA: "Tambah Reward" untuk admin). **Gate:** halaman menampilkan empty state dengan CTA, bukan tabel kosong mentah.

- [x] **Z-13** 🟡 **Hapus "LOYALTY_POINT_RUPIAH_VALUE" dari UI** — technical env variable exposed ke user di halaman `/loyalty`. **Fix:** ganti ke teks "1 poin ≈ Rp100. Nilai dapat disesuaikan oleh owner." **Gate:** tidak ada reference ke env variable di UI.

- [x] **Z-14** 🟡 **Tooltip untuk tombol disabled di tenant dashboard** — "Perpanjang" & "Ajukan Keluar" disabled tanpa penjelasan kenapa. **Fix:** tambah `title="..."` attribute. **Gate:** hover tombol disabled → muncul tooltip.

- [x] **Z-15** 🟡 **Konsistensi sidebar layout di tenant** — sidebar hilang di `/portal/announcements`. **Fix:** gunakan `TenantLayout` yang sama di semua halaman tenant. **Gate:** semua halaman `/portal/*` memiliki sidebar.

- [x] **Z-16** 🟡 **PWA install prompt dismiss persistence** — dialog "Pasang / Nanti" muncul di setiap halaman di ketiga portal. **Fix:** simpan timestamp dismiss ke `localStorage`, jangan tampilkan lagi selama 7 hari. **Gate:** setelah dismiss, prompt tidak muncul lagi di sesi yang sama.

#### 🟢 LOW — Publik & Cross-Portal

- [ ] **Z-17** 🟢 **Fix stat counter 0/0/0 di landing page** — "0 kamar tersedia / 0 terisi / 0 total kamar" membingungkan pengunjung. Admin dashboard menunjukkan 22 kamar total (12 terisi). **Verifikasi:** `browser_navigate → /` → lihat section "KETERSEDIAAN KAMAR". Kemungkinan root cause: API `/api/public/rooms-stats` tidak merespon atau semua kamar disembunyikan dari katalog. **Fix:** pastikan endpoint mengembalikan total real (22) + tampilkan "12 terisi / 1 tersedia / 22 total" atau empty state informatif. **Gate:** landing page menampilkan stat kamar yang akurat.

- [ ] **Z-18** 🟢 **Landing page: "Belum ada kamar yang tersedia"** — empty state sudah informatif tapi tidak ada CTA untuk cek kapan ketersediaan berubah. **Fix:** tambah CTA "Dapatkan notifikasi saat kamar kosong" atau link ke WhatsApp admin. **Gate:** empty state memiliki CTA yang jelas.

- [ ] **Z-19** 🟢 **Owner dashboard tidak teraudit penuh** — tidak bisa login sebagai OWNER via browser tool (redirect loop). Dashboard owner dishare dengan admin via toggle segmented control "Penghuni & Uang" / "Operasional". **Verifikasi manual 🧑:** login OWNER → periksa halaman accounting (`/owner-dashboard`), settings, COA, dan AI section. **Gate:** owner konfirmasi tidak ada issue blocking.

**Gate akhir Fase Z:** `npm run build` FE + backend hijau. Tidak ada regression di test suite (≈1370 test).
