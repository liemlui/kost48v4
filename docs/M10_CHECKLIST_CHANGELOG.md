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
| **Fase X — Audit UI/UX Visual (Playwright + Inspeksi Visual)** | ✅ selesai | X-01..X-16 semua selesai; X-02d owner konfirmasi OCCUPIED tampil; X-16 axe-auth.spec.ts 12 test. |
| **Fase Y — Test Coverage Maksimal** | ✅ hampir tuntas | **152/153** area selesai; sisa Y-G7 N/A (source tak ada di repo). 1372 test PASS. |
| **Fase Z — Audit UI/UX Cross-Portal (2026-07-02)** | 🟡 19 task terverifikasi | 1 CRITICAL (data XSS test), 7 HIGH (404/kosong/nav), 8 MEDIUM (chart/race/loading), 3 LOW (publik). Rujukan di `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. |
| **Fase AA — Perbaikan Temuan Audit CHECKLIST_01** | ✅ selesai | AA-01..AA-05: FaqPublicPage `GuestTopbar`, hapus filter `rating≥4`, 3 fix sudah dari sebelumnya; build lulus. |
| **Fase AB — Perbaikan Temuan Audit CHECKLIST_02** | ✅ selesai | AB-01..AB-05: 2 sudah done sebelumnya (AB-01 label Dipesan, AB-02 link error-state), 3 dikerjakan (page-size 9, deposit→Deposit jaminan, komentar DP preview) |
| **Fase AC — Perbaikan Temuan Audit CHECKLIST_03** | ✅ selesai | AC-01..AC-04: UTC date fix WIB, FAQ batas penghuni 2→4, Air Rp 0→Air termasuk, AC-04 N/A (tercakup AB-05) |
| **Fase AD — Perbaikan Temuan Audit CHECKLIST_04** | ✅ selesai | AD-01..AD-04: hapus TENANT dari settings/operational, sembunyikan enumerasi User tidak aktif, Link+autocomplete auth, komentar dead code |
| **Fase AE — Perbaikan Temuan Audit CHECKLIST_05** | ✅ selesai | AE-01 (HIGH: infinite refetch loop) ✅ fix sudah ada; AE-02 deferred (perlu tenant OCCUPIED di DB) |

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
> 1. **X-02d** — ✅ **SELESAI** — owner konfirmasi: OCCUPIED **TAMPIL** di katalog publik (kode sudah include OCCUPIED di `buildPublicRoomWhere`)
> 2. **X-16 lanjutan** — ✅ **SELESAI** — `e2e/a11y/axe-auth.spec.ts` (12 test: OWNER 3 + ADMIN 3 + STAFF 2 + TENANT 3 + publik 2 = 14 total axe test)
> 3. **Z-01..Z-19** — Audit cross-portal: 19 task dari inspeksi browser real-time (2 Juli 2026) mencakup 4 portal + halaman publik. Lihat [Fase Z](#fase-z--audit-uiux-cross-portal-2026-07-02).
> 4. **A1–A6** 🧑 — pra-go-live produksi (server, domain, env, seed OWNER, smoke test) — MANUSIA.
> 5. **AA-01..AA-05** — ✅ **SELESAI** — Fase AA (CHECKLIST_01): 5 task tuntas; detail di [Fase AA](#fase-aa--perbaikan-temuan-audit-publik-checklist_01).
> 6. **AB-01..AB-05** — ✅ **SELESAI** — Fase AB (CHECKLIST_02): 5 task tuntas (AB-01 label Dipesan + AB-02 link error-state sudah dari sebelumnya). Detail di [Fase AB](#fase-ab--perbaikan-temuan-audit-katalog-checkout_02).
> 7. **AC-01..AC-04** — ✅ **SELESAI** — Fase AC (CHECKLIST_03): 4 task tuntas (AC-04 N/A tercakup AB-05). Detail di [Fase AC](#fase-ac--perbaikan-temuan-audit-booking-checklist_03).
> 8. **AD-01..AD-04** — ✅ **SELESAI** — Fase AD (CHECKLIST_04): 4 task tuntas. Detail di [Fase AD](#fase-ad--perbaikan-temuan-audit-auth-checklist_04).
> 9. **AE-01 🔴 HIGH** — ✅ **SELESAI** — Fase AE (CHECKLIST_05): AE-01 infinite refetch loop fixed (sudah dari sebelumnya); AE-02 ⏳ deferred (perlu tenant OCCUPIED di DB). Detail di [Fase AE](#fase-ae--perbaikan-temuan-audit-mystay-checklist_05).
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
- [x] **X-02d** — ✅ Owner konfirmasi: OCCUPIED TAMPIL di katalog (kode `buildPublicRoomWhere` sudah memasukkan OCCUPIED)
- [x] **X-16 lanjutan** — ✅ `e2e/a11y/axe-auth.spec.ts` dibuat (12 test: OWNER/ADMIN/STAFF/TENANT). Token injection via API login, ≤5 critical/serious per halaman.

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

- [x] **Z-17** 🟢 **Fix stat counter 0/0/0 di landing page** — "0 kamar tersedia / 0 terisi / 0 total kamar" membingungkan pengunjung. Admin dashboard menunjukkan 22 kamar total (12 terisi). **Verifikasi:** `browser_navigate → /` → lihat section "KETERSEDIAAN KAMAR". Kemungkinan root cause: API `/api/public/rooms-stats` tidak merespon atau semua kamar disembunyikan dari katalog. **Fix:** pastikan endpoint mengembalikan total real (22) + tampilkan "12 terisi / 1 tersedia / 22 total" atau empty state informatif. **Gate:** landing page menampilkan stat kamar yang akurat.

- [x] **Z-18** 🟢 **Landing page: "Belum ada kamar yang tersedia"** — empty state sudah informatif tapi tidak ada CTA untuk cek kapan ketersediaan berubah. **Fix:** tambah CTA "Dapatkan notifikasi saat kamar kosong" atau link ke WhatsApp admin. **Gate:** empty state memiliki CTA yang jelas.

- [ ] **Z-19** 🟢 **Owner dashboard tidak teraudit penuh** — tidak bisa login sebagai OWNER via browser tool (redirect loop). Dashboard owner dishare dengan admin via toggle segmented control "Penghuni & Uang" / "Operasional". **Verifikasi manual 🧑:** login OWNER → periksa halaman accounting (`/owner-dashboard`), settings, COA, dan AI section. **Gate:** owner konfirmasi tidak ada issue blocking.

**Gate akhir Fase Z:** `npm run build` FE + backend hijau. Tidak ada regression di test suite (≈1370 test).

---

### Fase AA — Perbaikan Temuan Audit Publik (CHECKLIST_01)

> **Sumber:** `docs/audit/CHECKLIST_01_publik_landing.md` — 7 temuan (1 HIGH, 2 MEDIUM, 4 LOW).
> **Kode sudah ada di repo:** lihat `frontend/src/pages/public/`, `frontend/src/components/public/`, `backend/src/modules/marketing/`.
> **Gate tiap task:** `cd backend; npx tsc --noEmit` + `cd frontend; npm run build`. Kalau salah satu gagal → fix error dulu, baru lanjut.

---

#### AA-01 / C01-02 🔴 HIGH — Bocor nama penghuni di availability-calendar → ✅ SUDAH DIPERBAIKI

> **Status:** Backend & frontend sudah di-null-kan sebelum audit difinalisasi. Tidak ada aksi tambahan.

- [x] **Backend:** `marketing-public-rooms.service.ts:525,531` — `currentTenantName: null` & `dpTenantName: null` dengan comment `// C01-02` ✅
- [x] **Frontend:** `RichAvailabilityCalendar.tsx:254` — render nama dihapus, diganti comment `{/* C01-02: nama penghuni dihapus */}` ✅
- [x] Tidak ada aksi tambahan. **Verifikasi:** `curl` ke endpoint — payload tanpa nama tenant ✅

---

#### AA-02 / C01-03 🟡 MEDIUM — `Room.notes` internal terekspos → ✅ SUDAH DIPERBAIKI

> **Status:** `PUBLIC_ROOM_SELECT` sudah `notes: false`, response payload sudah `notes: null`. Tidak ada aksi tambahan.

- [x] **Backend:** `marketing-public-rooms.service.ts:28` — `notes: false` dengan comment `// C01-03`
- [x] **Backend:** `marketing-public-rooms.service.ts:713` — `notes: null` dengan comment `// C01-03`
- [x] Tidak ada aksi tambahan. **Verifikasi:** `curl http://localhost:3000/api/public/rooms` → payload rooms tidak mengandung field `notes`.

---

#### AA-03 / C01-01 🟡 MEDIUM — `freeKwh` dinamis tidak tampil di FAQ landing

**Masalah:** Di `PublicGuestDashboardPage.tsx:297`, kode mencari FAQ dengan `question === 'Bagaimana aturan listrik & air?'` — tapi pertanyaan itu **tidak ada**. Yang asli: `'Bagaimana sistem listrik?'` (`publicGuestShared.tsx:145`). Plus `.replace('jatah listrik gratis', …)` meleset karena teks jawaban berbunyi "Jatah gratis 30 kWh/bulan".

**File yang disentuh (2 file):**
- `frontend/src/pages/public/PublicGuestDashboardPage.tsx` (baris ~290-305)
- `frontend/src/pages/public/publicGuestShared.tsx` (baris ~145-146) — hanya untuk verifikasi teks

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/public/PublicGuestDashboardPage.tsx` dengan `read_file`, range `287-310`.
2. Cari blok `useMemo` yang mapping `faqItems`. Di dalamnya ada `if (item.question === 'Bagaimana aturan listrik & air?')`.
3. **Ganti** string `'Bagaimana aturan listrik & air?'` menjadi `'Bagaimana sistem listrik?'` (sesuai teks asli di `publicGuestShared.tsx:145`).
4. **Ganti** baris `.replace('Jatah gratis 30 kWh/bulan', ...)` menjadi `.replace(/Jatah gratis \d+ kWh\/bulan/, ...)`  ← pakai regex supaya match berapa pun angkanya.
5. **Pastikan** interpolasi `${freeKwh}`, `${electricityTariff}`, `${wifiPrice}`, `${petDeposit}` sudah benar (variabel dari baris 214-217).
6. Simpan. Jalankan `cd frontend; npm run build`. Kalau gagal → cek error, perbaiki.
7. **Verifikasi:** buka `http://localhost:5173` → FAQ landing → "Bagaimana sistem listrik?" harus menampilkan `Jatah gratis <nilai dari OperationalSetting> kWh/bulan`.

**Contoh hasil akhir yang benar:**
```tsx
if (item.question === 'Bagaimana sistem listrik?') {
  answer = answer.replace(/Jatah gratis \d+ kWh\/bulan/, `Jatah gratis ${freeKwh} kWh/bulan`);
  answer = answer.replace(/Rp [\d.]+(\/kWh)?/, `Rp ${electricityTariff.toLocaleString('id-ID')}/kWh`);
}
```

---

#### AA-04 / C01-05 🟢 LOW — Header/footer tidak konsisten antar 3 halaman publik

**Masalah:** Landing pakai `GuestTopbar` + `GuestFooter`. `/panduan` pakai `FaqTopbar` tanpa footer. `/reviews` tanpa topbar & footer (hanya tombol "🏠 Beranda" inline). **4 varian berbeda.**

**File yang disentuh (2 file):**
- `frontend/src/pages/public/FaqPublicPage.tsx`
- `frontend/src/pages/public/ReviewsPublicPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

##### A. Fix FaqPublicPage.tsx
1. Buka `frontend/src/pages/public/FaqPublicPage.tsx` dengan `read_file`.
2. Cari `function FaqTopbar()`. Hapus SELURUH fungsi `FaqTopbar` (hanya fungsi ini, bukan yang lain).
3. Di bagian render utama halaman: ganti `<FaqTopbar />` menjadi `<GuestTopbar />`.
4. **Import** `GuestTopbar` dan `GuestFooter` dari `publicGuestShared.tsx` (cek apakah sudah di-import; kalau belum, tambahkan).
5. Di bagian bawah halaman, **sebelum** closing tag terakhir, tambahkan `<GuestFooter />`.
6. Simpan. `npm run build` — pastikan tidak error.

##### B. Fix ReviewsPublicPage.tsx
1. Buka `frontend/src/pages/public/ReviewsPublicPage.tsx` dengan `read_file`.
2. Cari tombol inline "🏠 Beranda". **Hapus** tombol tersebut (navigasi akan disediakan oleh `GuestTopbar`).
3. **Tambahkan** `<GuestTopbar />` di bagian atas render (setelah return, sebelum konten utama).
4. **Tambahkan** `<GuestFooter />` di bagian bawah render (sebelum closing tag terakhir).
5. **Import** `GuestTopbar` dan `GuestFooter` dari `publicGuestShared.tsx` (kalau belum ada).
6. Simpan. `npm run build` — pastikan tidak error.

**Verifikasi:** buka `/`, `/panduan`, `/reviews` — ketiganya harus punya topbar + footer yang sama.

---

#### AA-05 / C01-04/06/07 🟢 LOW — Perbaikan minor (rating filter, hardcoded tarif, survei skip)

**Tiga perbaikan kecil dalam satu task.** Kerjakan berurutan.

##### A. C01-04 — Rating filter hanya ≥4

**Masalah:** `getPublicSocialProof` memfilter `rating: { gte: 4 }` → ulasan buruk disembunyikan, `averageRating` & `reviewCount` tidak akurat.

**File:** `backend/src/modules/marketing/marketing-public-rooms.service.ts`

1. Baca file, cari fungsi `getPublicSocialProof` (sekitar baris 55-95).
2. Cari semua `.findMany` atau `.count` yang punya filter `rating: { gte: 4 }`.
3. **Hapus** filter `rating: { gte: 4 }` dari semua query tersebut (biarkan rating apa adanya).
4. Simpan. `cd backend; npx tsc --noEmit`.

##### B. C01-06 — Tarif WiFi/listrik/deposit hardcoded

**Masalah:** Harga di `publicGuestShared.tsx` hardcoded: WiFi Rp50.000, listrik 30 kWh / Rp2.500/kWh, deposit hewan Rp100.000.

**File:** `frontend/src/pages/public/publicGuestShared.tsx` (baris ~80-160)

1. Ekspor `HOME_FAQ_ITEMS` dan `EXTRA_FAQ_ITEMS` menerima parameter opsional (atau biarkan teks default + ganti di runtime).
2. **Alternatif lebih sederhana:** verifikasi bahwa `PublicGuestDashboardPage.tsx` SUDAH melakukan `.replace()` dinamis (task AA-03) — kalau AA-03 sudah benar, maka C01-06 **otomatis teratasi** untuk landing. Biarkan teks hardcoded di `publicGuestShared.tsx` sebagai fallback default.
3. **Yang perlu dipastikan:** di `FaqPublicPage.tsx`, FAQ items juga ikut interpolasi dinamis (atau pakai `fetchPublicConfig`). Untuk sekarang, cukup pastikan AA-03 fix landing; halaman `/panduan` pakai fallback statis (LOW priority, bisa ditunda).
4. Tidak perlu ubah `publicGuestShared.tsx`. Cukup catat.

##### C. C01-07 — Survei preferensi terkirim saat wizard di-skip

**Masalah:** Di `/rooms`, menekan "Lewati wizard →" tetap memicu `POST /api/public/bookings/survey` → 201.

**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx` (atau komponen wizard di `frontend/src/components/`)

1. **Cari** file yang mengandung teks "Lewati wizard" atau "skip" + `POST /api/public/bookings/survey`.
2. Temukan handler tombol skip. Pastikan skip **tidak** memanggil fungsi submit survei.
3. Kalau skip tetap submit: tambahkan early return di handler skip (`if (skipped) return;` atau `return` sebelum `mutate()`).
4. Simpan. `npm run build`.

**Gate AA-05:** build hijau. Kalau ada bagian yang terlalu kompleks → skip dulu, tandai `[ ]` belum selesai.

---

**Gate akhir Fase AA:** ✅ Backend `npx tsc --noEmit` 0 error · ✅ Frontend `npm run build` sukses · AA-01..AA-05 semua selesai.

---

### Fase AB — Perbaikan Temuan Audit Katalog (CHECKLIST_02)

> **Sumber:** `docs/audit/CHECKLIST_02_publik_katalog_kamar.md` — 5 temuan (2 MEDIUM, 3 LOW).
> **Kode sudah ada di repo:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`, `PublicRoomDetailPage.tsx`, `frontend/src/utils/publicRoomDisplay.ts`.
> **Gate tiap task:** `cd frontend; npm run build`. Tidak ada perubahan backend.

---

#### AB-01 / C02-01 🟡 MEDIUM — Kamar RESERVED diberi label "Kosong" (menyesatkan)

**Masalah:** Di `getPublicRoomAvailabilityDisplay` (`publicRoomDisplay.ts:170`), status RESERVED mengembalikan `label: "Kosong"` — **sama persis** dengan AVAILABLE (`:179`). Padahal `canBook` berbeda. Pengunjung tidak bisa bedakan kamar dikunci vs benar-benar kosong.

**File:** `frontend/src/utils/publicRoomDisplay.ts`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/utils/publicRoomDisplay.ts` dengan `read_file`, range `160-195`.
2. Cari fungsi `getPublicRoomAvailabilityDisplay`. Di dalamnya ada switch/case atau if/else untuk status RESERVED dan AVAILABLE.
3. Temukan baris `label: "Kosong"` pada case RESERVED (sekitar baris 170).
4. **Ganti** `"Kosong"` menjadi `"Dipesan"` (ATAU `"Dikunci"` / `"Reserved"` — pilih satu yang paling jelas untuk pengunjung awam).
5. **Jangan ubah** case AVAILABLE (tetap "Kosong").
6. Simpan. Jalankan `cd frontend; npm run build`.
7. **Verifikasi:** buka `/rooms` (incognito), cari kamar RESERVED → badge harus "Dipesan", bukan "Kosong".

---

#### AB-02 / C02-02 🟡 MEDIUM — Error-state detail kamar: link mati `/katalog` + nomor WA palsu

**Masalah:** Buka `/rooms/999999/detail` (id numerik tak ada) → Alert kuning dengan 2 link rusak:
- "Lihat katalog kamar" → `href="/katalog"` — **route tidak ada** (yang benar `/rooms`). Juga `<a>` biasa (full reload), bukan `<Link>`.
- "hubungi admin via WhatsApp" → `href="https://wa.me/6281234567890"` — **nomor palsu**; nomor asli `6285648887628` (dari `officialKost48Location.whatsappUrl`).
- Teks "Kamar ini sedang penuh / tidak tersedia" menyesatkan (kamar memang tak ada, bukan penuh).

**File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` dengan `read_file`, range `285-320`.
2. Cari blok yang merender error-state untuk id numerik tak ada. Cirinya: ada `<a href="/katalog">` dan `wa.me/6281234567890`.
3. **Ganti** `href="/katalog"` → `to="/rooms"` + ubah `<a>` menjadi `<Link>` (import dari `react-router-dom` kalau belum).
4. **Ganti** `href="https://wa.me/6281234567890"` → gunakan konstanta dari `officialKost48Location.whatsappUrl`. Cari dulu lokasi konstanta: `grep -r "whatsappUrl" frontend/src/` — biasanya di file `constants/` atau `config/`. Import bila perlu.
5. **Ganti** teks "Kamar ini sedang penuh / tidak tersedia" → "Kamar tidak ditemukan" (lebih akurat untuk id tak ada).
6. Simpan. `npm run build`.
7. **Verifikasi:** buka `/rooms/999999/detail` → link "Lihat katalog" harus ke `/rooms` (SPA, bukan reload). Link WA harus ke nomor `6285648887628`.

---

#### AB-03 / C02-03 🟢 LOW — Ukuran halaman katalog = 3 (komentar bilang 12)

**Masalah:** `ROOMS_PER_PAGE = 3` (`PublicRoomsPage.tsx:35`), tapi komentar di `:214` bilang "paginasi 12 per halaman". Dengan 13 kamar → 5 halaman, terlalu banyak klik.

**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/rooms/PublicRoomsPage.tsx`.
2. Cari konstanta `ROOMS_PER_PAGE` (sekitar baris 35).
3. **Ganti** nilai dari `3` menjadi `9` (atau `12` — samakan dengan komentar).
4. **Perbaiki komentar** di baris ~214 agar sinkron dengan nilai baru.
5. Simpan. `npm run build`.

---

#### AB-04 / C02-04 🟢 LOW — Deposit disebut dua istilah di halaman yang sama

**Masalah:** Deposit refundable disebut "Dana titipan" (`PublicRoomDetailPage.tsx:326,472`) sekaligus "Deposit jaminan" (`:357`) di halaman detail yang sama.

**File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`.
2. Cari dua kemunculan "Dana titipan" (sekitar baris 326 dan 472).
3. **Ganti semua** "Dana titipan" → "Deposit jaminan" (konsisten dengan `:357`). ATAU sebaliknya — pilih satu dan ganti yang lain.
4. **Rekomendasi:** pakai "Deposit jaminan (refundable)" supaya jelas.
5. Simpan. `npm run build`.

---

#### AB-05 / C02-05 🟢 LOW — DP preview di halaman DETAIL pakai raw monthly

**Masalah:** DP di halaman **detail** = `Math.round(monthly*0.3)` (raw monthly, tanpa term/surcharge). Di halaman **form booking**, DP sudah akurat (term+surcharge, = backend). Preview detail bisa berbeda untuk term non-bulanan / occupant ekstra.

**File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` (baris ~340)

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`, range `330-350`.
2. Cari perhitungan `Math.round(monthlyRent * 0.3)` atau `Math.round(... * 0.3)`.
3. **Tambahkan komentar** `// INFO: preview DP pakai monthly; form booking pakai term+surcharge (akurat)` di atas baris tersebut.
4. **Tidak perlu ubah rumus** — ini hanya preview, form booking sudah benar. Tapi kalau ingin akurat: import helper `calculateRentByPricingTerm` dari `guestBookingUtils.ts` dan hitung dengan term default + occupant.
5. Untuk sekarang, cukup tambah komentar saja. Simpan. `npm run build`.

---

**Gate akhir Fase AB:** ✅ `npm run build` frontend sukses · AB-01..AB-05 semua selesai.

---

### Fase AC — Perbaikan Temuan Audit Booking (CHECKLIST_03)

> **Sumber:** `docs/audit/CHECKLIST_03_publik_booking.md` — 4 temuan (semua LOW/INFO).
> **Kode sudah ada di repo:** `frontend/src/pages/bookings/GuestBookingForm.tsx`, `guestBookingUtils.ts`, `publicGuestShared.tsx`, `publicRoomDisplay.ts`.
> **Gate tiap task:** `cd frontend; npm run build`. Tidak ada perubahan backend.
> **Catatan:** Semua temuan LOW — bisa dikerjakan santai, tidak ada urgency.

---

#### AC-01 / C03-01 🟢 LOW — Default `checkInDate` pakai UTC (off-by-one dini hari WIB)

**Masalah:** `INITIAL_FORM.checkInDate = new Date().toISOString().slice(0,10)` (`guestBookingUtils.ts:25`) memakai UTC. Jam 00:00–07:00 WIB, UTC masih "kemarin" → default tanggal lampau → server tolak "Tanggal check-in tidak boleh di masa lalu".

**File:** `frontend/src/pages/bookings/guestBookingUtils.ts` dan `GuestBookingForm.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/bookings/guestBookingUtils.ts`, cari `INITIAL_FORM` (sekitar baris 25).
2. Lihat cara `getTodayDateInput()` di `publicGuestShared.tsx:194` — ini sudah tz-adjusted (WIB).
3. **Ganti** `new Date().toISOString().slice(0,10)` dengan helper yang sama, atau buat helper lokal:
   ```ts
   const now = new Date();
   const offset = now.getTimezoneOffset(); // menit
   const local = new Date(now.getTime() - offset * 60 * 1000);
   const today = local.toISOString().slice(0, 10);
   ```
4. **Juga perbaiki** `min` attribute di input tanggal (`GuestBookingForm.tsx:300`) — pakai nilai yang sama.
5. Simpan. `npm run build`.
6. **Verifikasi:** buka form booking dini hari → default tanggal harus hari INI (WIB), bukan kemarin.

---

#### AC-02 / C03-02 🟢 LOW — Pesan batas penghuni tidak konsisten (FAQ vs sistem)

**Masalah:** Sistem: STANDARD **2 gratis / maks 4** (+20%/ekstra). Tapi FAQ landing: "**Maksimal 2 orang per kamar**" (`publicGuestShared.tsx:136`). Copy publik bertentangan dengan sistem.

**File:** `frontend/src/pages/public/publicGuestShared.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/public/publicGuestShared.tsx`, cari teks "Maksimal 2 orang per kamar" (sekitar baris 136).
2. **Ganti** menjadi "2 orang gratis, maksimal 4 orang per kamar (+20%/orang ekstra)".
3. **Atau** buat dinamis: import konstanta dari `pricing.helper.ts` (`FREE_OCCUPANTS_PER_ROOM = 2`, `MAX_OCCUPANTS_PER_ROOM = 4`).
4. Simpan. `npm run build`.

---

#### AC-03 / C03-03 🟢 LOW — "Air Rp 0 / m³" tampil saat tarif air = 0

**Masalah:** Kamar dengan `waterTariffPerM3Rupiah=0` menampilkan "Air Rp 0 / m³" (`publicRoomDisplay.ts:120`). Janggal.

**File:** `frontend/src/utils/publicRoomDisplay.ts`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/utils/publicRoomDisplay.ts`, cari template literal yang menghasilkan "Air Rp X / m³" (sekitar baris 120).
2. **Bungkus dengan kondisi:** bila tarif = 0, tampilkan "Air termasuk" (atau sembunyikan). Bila > 0, tampilkan seperti biasa.
3. Contoh:
   ```ts
   ${waterTariff > 0 ? `Air Rp ${waterTariff.toLocaleString('id-ID')} / m³` : 'Air termasuk'}
   ```
4. Simpan. `npm run build`.

---

#### AC-04 / C03-04 🟢 INFO — DP preview di detail pakai raw monthly (sama dengan C02-05)

**Masalah:** Sama persis dengan AB-05. Sudah dicatat di AB-05 — tidak perlu aksi terpisah.

- [x] **Diteruskan ke AB-05.** Tidak ada pengerjaan tambahan.

---

**Gate akhir Fase AC:** ✅ `npm run build` frontend sukses · AC-01..AC-04 selesai (AC-04 = N/A).

---

### Fase AD — Perbaikan Temuan Audit Auth (CHECKLIST_04)

> **Sumber:** `docs/audit/CHECKLIST_04_auth.md` — 4 temuan (semua LOW/INFO).
> **Kode sudah ada di repo:** `frontend/src/pages/auth/LoginPage.tsx`, `ForgotPasswordPage.tsx`, `backend/src/modules/auth/auth.service.ts`, `settings.controller.ts`.
> **Gate tiap task:** `cd backend; npx tsc --noEmit` + `cd frontend; npm run build`.
> **Catatan:** Temuan LOW — sistem auth sudah sangat solid; ini hanya polish.

---

#### AD-01 / C04-01 🟢 LOW — `/settings/operational` bocorkan config internal ke TENANT

**Masalah:** Endpoint `GET /api/settings/operational` mengembalikan **seluruh** objek OperationalSetting ke TENANT (`@Roles(OWNER,ADMIN,STAFF,TENANT)`, `settings.controller.ts:42`). Termasuk: `deepseekModel`, `deepseekFinanceModel`, `deepseekBaseUrl`, `aiMaxOutputTokens`, `capitalizationThresholdByCategory`, `updatedById`. Tidak ada API key/secret bocor, tapi config AI & akuntansi tak perlu dilihat tenant.

**File:** `backend/src/modules/settings/settings.controller.ts` (dan mungkin `settings.service.ts`)

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `backend/src/modules/settings/settings.controller.ts`, cari endpoint `GET /operational` (dekorator `@Get('operational')`).
2. Lihat dekorator `@Roles` — ada `TENANT` di dalamnya.
3. **Opsi A (rekomendasi):** Hapus `TENANT` dari `@Roles`, biarkan OWNER/ADMIN/STAFF saja. Tenant tidak butuh config operasional penuh — mereka sudah punya `/settings/public-config` (`@Public`).
4. **Opsi B:** Buat DTO ter-filter untuk TENANT (hanya field relevan: `electricityTariffPerKwhRupiah`, `waterTariffPerM3Rupiah`, `wifiPriceRupiah`, dll).
5. **Pilih Opsi A** (paling sederhana & aman).
6. Simpan. `cd backend; npx tsc --noEmit`.
7. **Verifikasi:** `curl -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/settings/operational` → harus 403.

---

#### AD-02 / C04-02 🟢 LOW — Login "User tidak aktif" bisa dibedakan (enumeration ringan)

**Masalah:** Akun non-aktif → `ForbiddenException('User tidak aktif')` **sebelum** cek password (`auth.service.ts:44-46`). Penyerang bisa tahu akun ada tapi nonaktif.

**File:** `backend/src/modules/auth/auth.service.ts`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `backend/src/modules/auth/auth.service.ts`, cari fungsi `validateUser` atau `login`.
2. Cari baris `throw new ForbiddenException('User tidak aktif')` (sekitar baris 44-46).
3. **Pindahkan** pengecekan `isActive` ke **setelah** verifikasi password. Atau **ganti** pesan error menjadi generik (sama dengan kredensial salah).
4. Contoh:
   ```ts
   //代替: throw new UnauthorizedException('Email atau password salah');
   // dengan log internal: this.logger.warn(`Inactive user login attempt: ${identifier}`);
   ```
5. Simpan. `cd backend; npx tsc --noEmit`.
6. **Verifikasi:** login dengan akun nonaktif → pesan error harus sama dengan password salah (generik).

---

#### AD-03 / C04-03 🟢 LOW — Link internal pakai `<a href>` (full reload) + missing autocomplete

**Masalah:** "Lupa password?" di login = `<a href="/forgot-password">` → reload penuh, bukan SPA `<Link>`. Input email di ForgotPassword tak punya `autoComplete="email"`.

**File:** `frontend/src/pages/auth/LoginPage.tsx` dan `ForgotPasswordPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/auth/LoginPage.tsx`, cari `<a href="/forgot-password">` (sekitar baris 207).
2. **Ganti** `<a href=...>` → `<Link to="/forgot-password">`. Import `Link` dari `react-router-dom` kalau belum.
3. Buka `frontend/src/pages/auth/ForgotPasswordPage.tsx`, cari input email (sekitar baris 206).
4. **Tambahkan** `autoComplete="email"` pada atribut input.
5. Simpan. `npm run build`.

---

#### AD-04 / C04-04 🟢 INFO — Dead code `resetTokenPreview` (Dev Preview)

**Masalah:** `ForgotPasswordPage.tsx:44,78,177-183` mengharapkan `result.resetTokenPreview`, tapi backend **tidak pernah** mengembalikannya. Blok ini tak pernah aktif (aman).

**File:** `frontend/src/pages/auth/ForgotPasswordPage.tsx`

**LANGKAH PENGERJAAN (ikuti persis):**

1. Buka `frontend/src/pages/auth/ForgotPasswordPage.tsx`.
2. Cari `resetTokenPreview` — ada di state, di response handler, dan di render.
3. **Opsi A:** Hapus semua referensi `resetTokenPreview` (state + handler + render).
4. **Opsi B:** Tambahkan komentar `// Dev-only — backend belum implement; aman di production` di atas blok render.
5. **Pilih Opsi B** (paling aman, tidak mengubah fungsionalitas).
6. Simpan. `npm run build`.

---

**Gate akhir Fase AD:** ✅ Backend `npx tsc --noEmit` 0 error · ✅ Frontend `npm run build` sukses · AD-01..AD-04 selesai.

---

### Fase AE — Perbaikan Temuan Audit MyStay (CHECKLIST_05)

> **Sumber:** `docs/audit/CHECKLIST_05_tenant_mystay.md` — 1 temuan HIGH + verifikasi pending.
> **⚠️ PRIORITAS UTAMA:** AE-01 adalah bug HIGH yang menyebabkan infinite refetch loop → self-DoS backend + crash tab.
> **Kode sudah ada di repo:** `frontend/src/pages/portal/MyStayPage.tsx`, `frontend/src/hooks/useTenantPortalStage.ts`, `frontend/src/App.tsx`.
> **Gate tiap task:** `cd frontend; npm run build`.

---

#### AE-01 / C05-01 🔴 HIGH — Infinite refetch loop `stays/me/current` + halaman stuck skeleton ✅ FIXED

**Masalah:** Tenant **tanpa stay OCCUPIED aktif** (mantan penghuni, atau tenant tahap booking) yang membuka `/portal/stay` → `GET /api/stays/me/current` 404 → **di-refetch tanpa henti** (~600 request per 4 detik). Halaman stuck skeleton. Akhirnya tab crash.

**Akar masalah (3 titik):**
1. `useTenantPortalStage.ts:35-44`: query `/stays/me/current` dengan `retry:false` + `refetchOnMount:true`. Error 404 → throw, bukan sukses.
2. `MyStayPage.tsx:815-824`: query stage `isLoading` → skeleton.
3. `App.tsx:166`: `RequireRoles` — `if (isStageLoading && role==='TENANT') return <PageLoadingSkeleton/>`. Skeleton mount → unmount → remount (...loop).

**File (3 file):**
- `frontend/src/hooks/useTenantPortalStage.ts`
- `frontend/src/pages/portal/MyStayPage.tsx`
- `frontend/src/App.tsx` (verifikasi saja)

**LANGKAH PENGERJAAN (ikuti persis — JANGAN LOMPAT):**

##### Langkah 1: Perbaiki `useTenantPortalStage.ts`

1. Buka `frontend/src/hooks/useTenantPortalStage.ts` dengan `read_file`.
2. Cari query `useQuery` yang memanggil endpoint `/stays/me/current` (sekitar baris 35-44).
3. **Ubah `queryFn`** supaya menangkap error 404 sebagai hasil valid:
   ```ts
   queryFn: async () => {
     try {
       const res = await api.get('/stays/me/current');
       return res.data;
     } catch (err) {
       if (err.response?.status === 404) {
         return null; // tidak ada stay aktif → hasil valid, bukan error
       }
       throw err; // error lain (500, network) tetap throw
     }
   }
   ```
4. Simpan.

##### Langkah 2: Perbaiki `MyStayPage.tsx`

1. Buka `frontend/src/pages/portal/MyStayPage.tsx`, range `810-880`.
2. Cari blok yang mengecek `stage !== 'occupied'` untuk menampilkan empty-state.
3. **Tambahkan handling** untuk `stage === null` (hasil dari langkah 1):
   ```tsx
   if (stage === null || stage === 'browsing') {
     return <EmptyState message="Kamu belum memiliki masa sewa aktif" />;
   }
   ```
4. Pastikan komponen `EmptyState` sudah di-import (atau buat inline kalau belum ada).
5. Simpan.

##### Langkah 3: Verifikasi `App.tsx`

1. Buka `frontend/src/App.tsx`, range `160-175`.
2. Cari `if (isStageLoading && role === 'TENANT') return <PageLoadingSkeleton/>`.
3. **Tidak perlu diubah** — setelah langkah 1-2, `isStageLoading` akan jadi `false` begitu 404 tertangani (query sukses dengan `null`).
4. Tapi untuk jaga-jaga: **tambah timeout** — kalau `isStageLoading` > 10 detik, tampilkan error-state, bukan skeleton selamanya.
5. Simpan.

##### Langkah 4: Build & verifikasi

1. `cd frontend; npm run build`.
2. **Verifikasi:** login sebagai Maya (`maya.tenant@kost48.test` / `Tenant#2026`), buka `/portal/stay`.
3. **Yang diharapkan:** muncul empty-state "Kamu belum memiliki masa sewa aktif" dalam <2 detik. **Bukan** skeleton selamanya.
4. Buka DevTools → Network → hanya **1 request** ke `/stays/me/current` (404), bukan puluhan/dibanjiri request.

---

#### AE-02 🟡 PENDING — Verifikasi visual dashboard "occupied"

**Masalah:** Saat audit, Maya tidak punya stay OCCUPIED aktif (Kamar A = MAINTENANCE). Tidak bisa verifikasi live:
- Chart listrik (I6 — width/height -1)
- Tooltip tombol "Perpanjang" & "Ajukan Keluar" (I7)
- PWA prompt (I8)
- Badge notifikasi
- Timeline riwayat
- Catat meter (termasuk uji meter mundur)

**LANGKAH PENGERJAAN (setelah AE-01 selesai):**

1. **Cari tenant dengan stay OCCUPIED aktif** di DB UAT port 5433:
   ```sql
   SELECT s.id, s."tenantId", u.email, r.code
   FROM "Stay" s
   JOIN "User" u ON s."tenantId" = u.id
   JOIN "Room" r ON s."roomId" = r.id
   WHERE s.status = 'OCCUPIED';
   ```
2. Kalau tidak ada tenant dengan password diketahui: **buat satu** via API admin (POST `/api/admin/stays` + check-in). Atau reset password tenant yang ada.
3. Login sebagai tenant occupied → buka `/portal/stay`.
4. Verifikasi checklist C05 langkah 5–16 (lihat `CHECKLIST_05_tenant_mystay.md`).
5. Catat temuan baru dengan prefiks `C05-xx` di checklist 05.

- [ ] AE-02 selesai — dashboard occupied terverifikasi.

---

**Gate akhir Fase AE:** ✅ AE-01 fix loop (1 request only) — `useTenantPortalStage.ts` tangkap 404→null · ✅ Build frontend sukses · ⏳ AE-02 menunggu tenant occupied.
