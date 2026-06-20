# KOST48 V5 — Checklist Eksekusi Aktif

> Versi: **2026-06-20** | Changelog historis → `docs/M11_CHANGELOG.md`

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

## Status Ringkas (2026-06-20)

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
| **Fase S — Multi-Portal Vercel + Mobile-First** | 🔴 antrian | S-01..S-06: env portal gate, CORS Vercel, 3 Vercel project, mobile tenant, mobile staff, PWA offline-aware |

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
| UI/UX Compact | `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md` | Fase H: sidebar 18→7, dashboard 6→3 tab, merge layanan (diarsip) |
| Navigasi & Onboarding | `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md` | Fase I: de-duplikasi menu, rute tersembunyi, onboarding (diarsip) |
| Audit UI/UX Fase L | `docs/archieve/2026-06-20_fase_selesai/M17_FASE_L_UIUX_AUDIT.md` | Ringkasan isu + spec before/after di `docs/archieve/2026-06-20_fase_selesai/fase-l-specs/` |
| Navigasi kode (PAKAI INI dulu) | `docs/CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |
| Audit UI/UX 20 Juni 2026 (dasar Fase M–P) | `docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md` | Temuan a11y, token, responsif, usability — 46 isu → 4 fase eksekusi |

---

## ANTRIAN EKSEKUSI AKTIF

> Fase A blocked owner. Fase B–L selesai (lihat M11 untuk detail historis).

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
**Cakupan selesai (G0-G9):**
- G0: Safety foundation — model env, rate-limit, hash, env guard, `/owner-ai/status`
- G1: Owner brief — `POST /owner-ai/brief`, snapshot bisnis, `AiResultPanel`
- G2: Finance analyst — `POST /owner-ai/finance/analyze`, `deepseek-v4-pro`, fallback
- G3: Payment review — `POST /owner-ai/payment-submissions/:id/review-draft`, no-partial guard before AI
- G4: Expense OCR draft — OCR browser (tesseract.js) → normalize → `POST /owner-ai/expenses/receipt-draft`
- G5: KTP OCR validator — `POST /owner-ai/tenants/:id/ktp-ocr-validate`, PDP: teks only, NIK ter-mask
- G6: Ops/inventory AI — 3 endpoint: tiket action, reorder, field report review
- G7: Settings & budget — `GET /owner-ai/usage`, `POST /owner-ai/test-connection`, tab "AI & Biaya"
- G8: FAQ/manual generator — `POST /owner-ai/faqs/generate-draft`, draft-only, no auto-overwrite
- G9 🧬: AiDraft queue — schema S-6, `ai-draft.service.ts`, tab "Antrean Draft AI"

**Kontrak global wajib dijaga (lihat `docs/M12_AI_OWNER_ADMIN.md`):**
- Manual button only — tidak ada AI auto-trigger dari page-load/cron/prefetch
- OWNER/ADMIN only — STAFF/TENANT tidak lihat tombol AI
- Draft saja — AI tidak langsung mutasi data; aksi final tetap tombol domain existing
- No-partial, TB, deposit guard deterministik MENANG atas rekomendasi AI

---

### Fase H — UI/UX Compact Owner↔Admin ✅ SELESAI

**Key files:** `navigation.ts`, `DashboardAdmin.tsx`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage.tsx`, `12-owner.css`, `08-admin.css`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md`.  
**Cakupan selesai:** H1 sidebar owner 18→7 (grup "Keputusan Owner"), H2 dashboard admin 6→3 tab (Ringkasan/Penghuni&Uang/Operasional), H3 merge Minat→Layanan via activePaths, H4 AiAssistButton di DashboardAdmin + AssistantPanel di OwnerDashboard, H5 tren chart tersembunyi di mode Ringkas + quick-action buttons, H6 hapus CSS dead (08-admin.css).

---

### Fase I — Navigasi & Onboarding ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `StaffTopWorkspaceNav.tsx`, `navigation.ts`, `AppLayout.tsx`, `GettingStartedGuide.tsx`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md`.  
**Cakupan selesai:** I1 hapus AdminAreaInternalMenu (duplikasi sidebar 20+ chip), I2 unifikasi StaffTopWorkspaceNav dari `staffSections`, I3 ekspos `/meter-readings` ke activePaths sidebar, I4 GettingStartedGuide tenant baru (browsing/booking/occupied), I5 breadcrumb segmen pertama klik, I6 guide strip adaptif (verified no-op).

---

### Fase J — Hardening AI Pra-Go-Live ✅ SELESAI

**Key files:** `owner-ai.helpers.ts`, `backend/test/unit/owner-ai-safety.test.js`, `AiAssistButton.tsx`, `AiResultPanel.tsx`, `docs/M09_AUDIT.md`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.  
**Cakupan selesai:** J0 ekstrak guard murni → `owner-ai.helpers.ts`, J1 unit test `owner-ai-safety.test.js` (≥18 assert PDP+uang), J2 guard no-partial AI sadar DP/FULL/SETTLEMENT, J3 FE error non-blocking + gating role/configured, J4 audit 12 endpoint owner-ai dibukukan di M09.

---

### Fase K — Pasca-Audit Total ✅ SELESAI

**Key files:** berbagai — lihat `docs/archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.  
**Cakupan selesai (13 task, commit `ac4cc2f`):** P1-P3 keamanan (RolesGuard, DTO multipart, hapus STAFF dari 11 endpoint), P5-P6 circuit breaker DeepSeek + advisory lock, Q1-Q5 data integrity (resolveRent unifikasi, merge helpers, @unique NIK, @index, deposit handling), R1-R5 CSS tokens, unifikasi arus kas, DeepSeek UI Settings, error handling + dead code.

---

### Fase L — UI/UX Audit Menyeluruh ✅ SELESAI

**Rujukan utama:** `docs/archieve/M17_FASE_L_UIUX_AUDIT.md`  
**Spec detail (before/after kode nyata):** `docs/archieve/fase-l-specs/`
- `L01_L03_loading_error_mobile.md` — L-01..L-03
- `L04_L07_wizard_balance_guest_auth.md` — L-04..L-07
- `L08_L11_public_dashboard_tenant_reports.md` — L-08..L-11
- `L12_L15_enum_staff_stays_tenant.md` — L-12..L-15
- `L16_L20_accounting_a11y_empty_asset_minor.md` — L-16..L-20

**Gate umum:** `cd frontend; npm run build` ✅ setelah tiap task. Tidak ada perubahan backend/schema.

**Task yang sudah selesai:** L-01, L-02, L-03, L-04, L-05(SKIP), L-06, L-07, L-08, L-09, L-10, L-11, L-12, L-13, L-14, L-15, L-16, L-17, L-18, L-19, L-20.

#### L-08 🟡 — PublicRoomsPage: 5 Perubahan Nyata

- [x] **L-08** `PublicRoomsPage.tsx`: (1) carousel auto-rotate: tambah guard `if (isTouchDevice) return` agar tidak rotate otomatis di mobile. (2) compare counter: ubah `{compareList.length} kamar dipilih` → `{compareList.length}/3 kamar dipilih` + warna merah saat 3. (3) filter toggle mobile: button "Filter" toggle `showFilter` state + class `d-md-none` pada button, `d-none d-md-block` pada filter bar. (4) CSS animasi collapse/expand filter. (5) pagination ellipsis: ganti `Array.from({length: totalPages})` dengan fungsi `1 … X X+1 … N` saat `totalPages > 7`.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-08
  - **Anchor grep:** `hovered` (carousel) · `compareList.length` · `rm-filter-bar` · `Array.from.*totalPages`
  - **Gate:** `cd frontend; npm run build` ✅ · test compare counter · test filter mobile 375px

#### L-10 🟡 — MyTicketsPage: Image Lightbox + WifiOrderPage: WhatsApp Hardcode

- [x] **L-10** (a) `MyTicketsPage.tsx`: tambah `onClick` ke `SafeImage` untuk foto issue dan resolution → buka modal Bootstrap dengan `<img>` full-size. Tambah `useState` untuk `lightboxSrc` dan `Modal` dari react-bootstrap. (b) `WifiOrderPage.tsx`: ada nomor WA hardcoded di 2 tempat (const baris 7 + teks baris 96) — konsolidasi ke 1 const `KOST_WHATSAPP_NUMBER` dan gunakan const di baris 96.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-10
  - **Anchor grep:** `SafeImage` (MyTicketsPage) · nomor WA hardcoded (WifiOrderPage baris 7 dan 96)
  - **Gate:** `cd frontend; npm run build` ✅

#### L-11 🟡 — UnlockedFormalReports: Lazy + Suspense + Skeleton

- [x] **L-11** `ReportsPage.tsx` atau parent yang render `UnlockedFormalReports`: bungkus dengan `React.lazy` + `<Suspense fallback={<TableSkeleton rows={8} />}>`. Verifikasi `UnlockedFormalReports` diekspor sebagai **default export** sebelum membuat lazy import.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-11
  - **Anchor grep:** `UnlockedFormalReports` (import + render di ReportsPage)
  - **Gate:** `cd frontend; npm run build` ✅

#### L-16 🟢 — AccountingSetupPage: Checklist Bertahap di Atas Halaman

- [x] **L-16** `AccountingSetupPage.tsx`: tambah komponen `<AccountingSetupChecklist />` (file baru atau inline) di atas halaman — sebelum section pertama. Baca state dari queries yang **sudah ada** di halaman (period, COA, readiness) — jangan tambah query baru. Tampilkan checklist: ① COA terisi → ② Periode aktif → ③ Opening Balance → ④ Siap catat transaksi.
  - **Spec detail:** `docs/fase-l-specs/L16_L20_accounting_a11y_empty_asset_minor.md` § L-16
  - **Anchor grep:** baca awal `AccountingSetupPage.tsx` untuk nama query yang sudah ada
  - **Gate:** `cd frontend; npm run build` ✅

---

### Fase M — Quick Wins: Aksesibilitas & Polish (P0 Audit)

**Tujuan:** 6 perbaikan dampak tinggi, usaha rendah — hasil audit UI/UX 20 Juni 2026 §9 P0.
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md` §3–§4, §9.
**Strategi:** tidak ada dependensi baru. Masing-masing task independen — bisa paralel.

- [x] **M-01 — Ganti `window.location.assign` → `useNavigate()` (2 tempat)**
  **Target:** `frontend/src/pages/dashboard/AdminWorkspaces.tsx` baris 97.
  **Aksi:**
  1. Tambah `import { useNavigate } from 'react-router-dom';` di atas file.
  2. Di dalam komponen `AdminStaffFrontlineList`, tambah `const navigate = useNavigate();` sebelum return.
  3. Ganti baris 97: `onClick={() => window.location.assign('/staff-performance')}` → `onClick={() => navigate('/staff-performance')}`.
  4. **JANGAN ubah** `frontend/src/api/client.ts` baris 18 — itu axios interceptor di luar React context, `window.location.assign('/login')` untuk 401 sudah benar.
  **Anchor grep:** `window.location.assign`
  **Gate:** `cd frontend; npm run build` ✅ · klik baris staff di `/admin-dashboard` → tidak reload penuh.

- [x] **M-02 — Buat `ConfirmProvider` + `useConfirm()` + ganti 9 `window.confirm`**
  **Pola final (keputusan owner 2026-06-20):** context + promise — pemakaian cukup `const ok = await confirm({...})`, TANPA state per-file. Kode provider lengkap ada di arsip `docs/archieve/deprecated_dossiers/_DEPRECATED_M18_FASE_M_FRONTEND_UX.md` §M-1.
  **Aksi:**
  1. Buat file BARU `frontend/src/components/common/ConfirmProvider.tsx`:
     - Export `ConfirmProvider` + hook `useConfirm(): (opts) => Promise<boolean>`.
     - `ConfirmOptions`: `{ title; message; confirmLabel?; cancelLabel?; variant?: 'danger'|'warning'|'primary' }`.
     - Internal: `useState` (open + opts) + `useRef` resolver; render SATU `<Modal>` react-bootstrap. Tombol Ya → `resolve(true)`; Batal/close → `resolve(false)`.
  2. Daftarkan di `frontend/src/main.tsx`: bungkus `<App/>` dengan `<ConfirmProvider>` (di dalam `<ToastProvider>`).
  3. Ganti **9 pemakaian `window.confirm`** → handler `async` dengan `const ok = await confirm({...}); if (!ok) return;`:
     | # | File | Baris | Judul / variant dialog |
     |---|------|-------|------------------------|
     | 1 | `AppLayout.tsx` | 213 | "Keluar" (danger) — hapus fungsi lama `handleLogout`, pakai `handleLogoutClick` async di 2 tombol Logout |
     | 2 | `FacilityManager.tsx` | 371 | "Hapus Fasilitas" (danger) |
     | 3 | `TenantProfilePhotoCard.tsx` | 40 | "Hapus Foto Profil" (danger) |
     | 4 | `MyStayPage.tsx` | 723 | "Minat layanan" (primary) |
     | 5 | `WifiOrderPage.tsx` | 68 | "Pesan WiFi" (primary) |
     | 6–9 | `OwnerSettingsPage.tsx` | 67, 176, 406, 543 | "Hapus Foto Fasilitas" / "Hapus Aset Marketing" / "Hapus FAQ" / "Hapus Foto Kamar" (danger) |
  **Anchor grep:** `window.confirm` · `useConfirm`
  **Gate:** `cd frontend; npm run build` ✅ · `grep -r "window.confirm" src/` → 0 hasil · test 2–3 dialog: modal muncul, Ya/Batal berfungsi.

- [x] **M-03 — Global `prefers-reduced-motion` block**
  **Target:** `frontend/src/styles/01-base.css` — tambah di akhir file.
  **Aksi:**
  1. Buka `01-base.css`, tambah blok berikut di akhir file:
     ```css
     @media (prefers-reduced-motion: reduce) {
       *,
       *::before,
       *::after {
         animation-duration: 0.01ms !important;
         animation-iteration-count: 1 !important;
         transition-duration: 0.01ms !important;
         scroll-behavior: auto !important;
       }
     }
     ```
  2. **(Opsional — task terpisah):** audit animasi non-esensial dan bungkus dalam `@media (prefers-reduced-motion: no-preference) { ... }`. Tapi global reset di atas sudah cukup untuk P0.
  **Anchor grep:** `prefers-reduced-motion`
  **Gate:** `cd frontend; npm run build` ✅ · tidak rusak UI.

- [x] **M-04 — Perbaiki font `Cormorant Garant` → `Cormorant Garamond` + hapus font tak termuat**
  **Target:** `frontend/src/styles/01-base.css` baris 1, `11-public-pages.css` (10 lokasi), `00-tokens.css` baris 22.
  **Aksi:**
  1. `01-base.css` baris 1: ganti `Cormorant+Garant` → `Cormorant+Garamond` di URL `@import`.
  2. `11-public-pages.css`: **search & replace semua** `'Cormorant Garant'` → `'Cormorant Garamond'` (10 kemunculan: ~baris 1800, 1824, 2000, 2066, 2101, 2170, 2245, 2328, 2669, dst).
  3. `00-tokens.css` baris 22: `--font-data: 'DM Mono', ...` — komentari atau hapus karena DM Mono/DM Sans tidak di-`@import`. Ganti fallback ke `'JetBrains Mono', monospace` (font ini sudah di-load di baris 1).
  **Anchor grep:** `Cormorant Garant` · `DM Mono`
  **Gate:** `cd frontend; npm run build` ✅ · cek `01-base.css` URL valid → `Cormorant+Garamond`.

- [x] **M-05 — Ekstrak `<ClickableRow>` aksesibel + pasang di 10 file**
  **Target:** Buat komponen BARU, pakai di 10 file yang punya `<tr className="clickable-row">` tanpa a11y.
  **Aksi:**
  1. Buat file BARU `frontend/src/components/common/ClickableRow.tsx` — **pola yang MENJAGA semantik baris tabel** (jangan pasang `role="button"` di `<tr>` karena menghapus peran "row" dari a11y tree — temuan audit A3):
     - Props: `onClick: () => void`, `children: React.ReactNode`, `label: string` (nama aksesibel, mis. "Buka detail Budi"), `className?: string`.
     - **Direkomendasikan:** `<tr>` TANPA `role`/`tabIndex` (tetap baris biasa) + `onClick` untuk kemudahan mouse. Keyboard + nama aksesibel diletakkan pada SATU kontrol fokusabel di sel pertama: `<button type="button" className="row-open-btn stretched-link" aria-label={label} onClick={onClick}>`. Menjaga semantik tabel sekaligus aksesibel.
     - **Kompromi minimal** (bila refactor sel berat): pertahankan `tabIndex={0}` + `onKeyDown` (Enter/Space) di `<tr>` TAPI gunakan `role="row"` (bukan `button`) + `aria-label={label}` — tetap lebih baik dari `role="button"`.
     - Catatan: `ResourceTable.tsx` baris 344–356 saat ini masih `role="button"` di `<tr>` — selaraskan ke pola baru sebagai task lanjutan (opsional, jangan blokir M-05).
  2. Pasang di **6 file** yang belum aksesibel (cari dengan grep `className="clickable-row"`):
     | # | File | Baris | Ganti |
     |---|------|-------|-------|
     | 1 | `AdminWorkspaces.tsx` | 97, 186, 253, 316, 411, 421 | 6 `<tr className="clickable-row" onClick={...}>` → `<ClickableRow onClick={...}>` |
     | 2 | `AncillaryRevenuePage.tsx` | 95 | idem |
     | 3 | `InvoicesPage.tsx` | 501 | idem |
     | 4 | `TicketsPage.tsx` | 731 | idem |
     | 5 | `SmartChartPanel.tsx` | 120 | idem (conditional `className={point.to ? 'clickable-row' : undefined}` → `<ClickableRow>` hanya saat `point.to` ada) |
  3. **JANGAN ubah** `ResourceTable.tsx`, `StaysPage.tsx`, `CompactMetrics.tsx`, `ActionQueueTable.tsx` — mereka sudah punya a11y (walaupun `CompactMetrics` & `ActionQueueTable` kurang `onKeyDown`, itu task terpisah).
  4. Ekspor `ClickableRow` dari barrel `common/index.ts` bila ada.
  **Anchor grep:** `clickable-row`
  **Gate:** `cd frontend; npm run build` ✅ · test keyboard: Tab ke baris → Enter → aksi trigger.

- [x] **M-06 — Toast aksesibel: durabilitas & peran ARIA** (audit A4)
  **Target:** `frontend/src/components/common/ToastProvider.tsx`.
  **Aksi:**
  1. Durasi default 3500ms → 6000ms, dan jadikan opsional per panggilan: `toast(message, variant, durationMs?)`.
  2. Pause auto-dismiss saat hover/focus container (clear timeout di `onMouseEnter`/`onFocus`, restart saat leave/blur).
  3. ARIA per varian: `success`/`info` → `role="status"` + `aria-live="polite"`; `danger`/`warning` → `role="alert"` + `aria-live="assertive"` (sekarang SEMUA `role="alert"`).
  4. Tombol tutup tetap `aria-label="Tutup"`.
  **Anchor grep:** `ToastProvider` · `role="alert"`
  **Gate:** `cd frontend; npm run build` ✅ · toast sukses tidak menginterupsi pembaca layar; hover menahan dismiss.

---

### Fase N — Ramping Dashboard & Navigasi (P1 Audit + Blueprint §7)

**Tujuan:** Kurangi redundansi data di Owner & Admin dashboard; satukan navigasi; pindahkan agregasi ke backend.
**Rujukan:** Audit §5–§7, blueprint penyederhanaan Admin & Owner.
**Strategi:** Kerjakan **berurutan** (N-01→N-02→...→N-06) karena tiap task bisa ubah file yang sama.

- [x] **N-01 — Ramping Owner Dashboard: hapus sinyal ganda, satukan panel AI**
  **Target:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`.
  **Aksi:**
  1. **Hapus `OwnerActionStrip`** (komponen sinyal "butuh perhatian" yang tampil di atas dashboard) — data yang sama sudah muncul di `AssistantPanel` dan panel "Butuh perhatian" bawah. Cari render `<OwnerActionStrip` → hapus.
  2. **Hapus panel AI kedua** — cari 2 tempat render `AiResultPanel` atau `AssistantPanel` (sekitar baris ~536 "Analisis AI" dan ~589 "Ringkasan Bisnis AI"). Satukan jadi SATU tombol "Brief AI" yang membuka drawer/modal dengan hasil generate. Konsep: 1 tombol `AiAssistButton` (sudah ada) → klik → 1 drawer berisi brief.
  3. **4 KPI tile tetap** di atas (Pendapatan, Laba, Okupansi, Kas).
  4. **Satu daftar "Butuh perhatian hari ini"** — gabung 3 sumber sinyal (`OwnerActionStrip`, `AssistantPanel` sinyal, panel bawah) jadi 1 `useMemo` yang merge + dedup data. Tampilkan sebagai `<ListGroup>` ringkas.
  5. **Tren chart** — tetap di section "Lengkap" (sudah di-handle toggle compact/full).
  6. **Sisa detail** → pindahkan ke disclosure `<Accordion>` "Detail" yang collapsed default.
  **Anchor grep:** `OwnerActionStrip` · `AiResultPanel` · `generateBrief`
  **Gate:** `cd frontend; npm run build` ✅ · Owner dashboard tidak boleh ada data yang sama tampil 2×.

- [x] **N-02 — Ramping Admin Dashboard: hero tunggal = antrean kerja, health bar ringkas**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`.
  **Aksi:**
  1. **Hero = `ActionQueueTable`** sebagai sumber kebenaran tunggal. Pindahkan ke posisi paling atas (setelah header).
  2. **Turunkan `AdminHealthChips` + `AdminContinuityStrip` lanes + `AdminTodayStatusStrip`** → jadi **satu** `<AdminHealthBar>` kompak (1 baris chip ringkas yang bisa diciutkan). Buat file BARU `frontend/src/components/command-center/AdminHealthBar.tsx`:
     - Props: data dari query yang sudah ada (rooms, stays, invoices, tickets).
     - Render: 4–5 chip inline: "⚠ 3 jatuh tempo" "📋 5 antrean" "🛏 42/48 terisi" "✅ SLA 94%".
     - Bungkus dalam `<Collapse>` Bootstrap — toggle "Sembunyikan/Tampilkan".
  3. **Hapus `admin-ops-guardrails`** (4 blok teks statis) — pindahkan ke tooltip atau hapus total.
  4. **`AssistantPanel`** — tetap, tapi jadi full-width di bawah antrean.
  **Anchor grep:** `AdminHealthChips` · `AdminContinuityStrip` · `admin-ops-guardrails` · `action-queue-table`
  **Gate:** `cd frontend; npm run build` ✅ · Admin dashboard ≤ 3 section vertikal.

- [x] **N-03 — Tambah toggle density "Ringkas/Lengkap" untuk Admin**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` + `AdminWorkspaces.tsx`.
  **Aksi:**
  1. Di `DashboardAdmin.tsx`, tambah `const [dense, setDense] = useState(false)` + `<Button variant="outline-secondary" size="sm" onClick={() => setDense(!dense)}>📏 {dense ? 'Ringkas' : 'Lengkap'}</Button>` di header.
  2. Conditional render: saat `dense === true`, sembunyikan widget sekunder (grafik mini, tabel detail) — hanya tampilkan `ActionQueueTable` + `AdminHealthBar` + `AssistantPanel`.
  3. Di `AdminWorkspaces.tsx`, baca `dense` dari parent (prop atau context). Saat ringkas: tabel 5→3 baris, sembunyikan kolom sekunder.
  4. **Simpan preferensi ke `localStorage`** — `localStorage.setItem('admin-density', dense ? 'compact' : 'full')`, baca saat mount.
  **Anchor grep:** `DashboardAdmin` · `dense` · `compact`
  **Gate:** `cd frontend; npm run build` ✅ · toggle tidak reload halaman, preferensi tersimpan.

- [x] **N-04 — Hapus duplikasi navigasi: sidebar + tabs tetap, tapi tanpa rute ganda**
  **Target:** `frontend/src/config/navigation.ts` + `frontend/src/components/layout/RoleWorkspaceTabs.tsx`.
  **Strategi (pilihan owner):** Pertahankan sidebar DAN RoleWorkspaceTabs — keduanya tetap ada. Tapi **tidak boleh ada rute yang bisa dijangkau dari kedua jalur.**
  **Aksi:**
  1. **Baca dulu:** `navigation.ts` (daftar sidebar: 6 item Admin, 7 item Owner) dan `RoleWorkspaceTabs.tsx` (daftar tab: 3 tab per mode).
  2. **Cross-check duplikasi:** buat tabel: kolom "Rute tujuan sidebar" vs "Rute tujuan tab". Tandai yang muncul di KEDUA sisi.
  3. **Hapus dari tab** setiap rute yang SUDAH ada di sidebar. Contoh: bila sidebar punya item "Stays" → `/stays`, dan tab juga punya tab menuju `/stays` → hapus tab itu dari `RoleWorkspaceTabs`. Biarkan tab hanya berisi rute yang TIDAK ada di sidebar (mis. `/admin-dashboard` dengan filter area tertentu).
  4. **Untuk tab yang tersisa:** pastikan navigasi tetap pakai `navigate()` react-router (bukan reload penuh).
  5. **Verifikasi:** cek semua rute — setiap halaman hanya bisa dijangkau dari SATU jalur (sidebar atau tab, tidak keduanya).
  **Anchor grep:** `navigation.ts` · `RoleWorkspaceTabs` · `to:` · `path:`
  **Gate:** `cd frontend; npm run build` ✅ · inspeksi manual: tidak ada rute yang muncul di sidebar DAN tab sekaligus.

- [x] **N-05 — Pindahkan agregasi dashboard ke backend**
  **Target:** Backend: buat endpoint agregat BARU. Frontend: ganti komputasi klien dengan query.
  **Aksi:**
  1. **Backend — endpoint baru** `GET /api/admin/dashboard/aggregate`:
     - Controller: `backend/src/modules/admin/admin-dashboard.controller.ts` (buat bila belum ada).
     - Service: `backend/src/modules/admin/admin-dashboard.service.ts`.
     - Return satu objek JSON: `{ health: { pendingRenew, overdueInvoices, pendingApproval, waitingInitialPayment, slaPercent }, lanes: [...], queueItems: [...], staffScores: [...] }`.
     - **Jangan ubah schema.prisma.** Gunakan query Prisma mentah (aggregate/groupBy).
  2. **Backend — endpoint baru** `GET /api/owner/dashboard/aggregate`:
     - Controller: `backend/src/modules/owner/owner-dashboard.controller.ts`.
     - Return: `{ kpi: { revenue, profit, occupancy, cash }, signals: [...], meterDue: { overdue, upcoming } }`.
  3. **Frontend — `DashboardAdmin.tsx`:**
     - Ganti 9+ `useQuery` individual → **1** `useQuery(['adminDashboardAggregate'], fetchAdminAggregate)`.
     - Hapus semua `.filter()` / `.map()` / `dedupeCommandItems()` komputasi inline.
     - `staleTime: 60_000` (1 menit cache).
  4. **Frontend — `OwnerDashboardPage.tsx`:**
     - Ganti multi-query → **1** `useQuery(['ownerDashboardAggregate'], fetchOwnerAggregate)`.
     - Hapus `computeMeterDue` + komputasi klien lain.
  5. **Gate keuangan:** `node --test "test/unit/**/*.test.js"` + `docs/M04_KEUANGAN.md` § invarian TB.
  **Anchor grep:** `useQuery` (DashboardAdmin) · `computeMeterDue`
  **Gate:** `cd backend; npx tsc --noEmit` ✅ · `cd frontend; npm run build` ✅ · unit test backend PASS.

- [x] **N-06 — Tambah `@axe-core/playwright` ke e2e**
  **Target:** `frontend/e2e/` — tambah ke setup Playwright yang sudah ada.
  **Aksi:**
  1. Install: `cd frontend; npm install --save-dev @axe-core/playwright`.
  2. Buat file BARU `frontend/e2e/a11y/axe-audit.spec.ts` (atau tambah ke `frontend/e2e/uat/`):
     - Import `AxeBuilder` dari `@axe-core/playwright`.
     - Test: buka halaman utama (public, tenant dashboard, admin dashboard, owner dashboard).
     - Jalankan `new AxeBuilder({ page }).analyze()`.
     - Assert `violations.length === 0` untuk rule critical/serious.
  3. Tambah script di `frontend/package.json`: `"test:a11y": "npx playwright test e2e/a11y/"`.
  **Anchor grep:** `playwright` · `e2e`
  **Gate:** `cd frontend; npx playwright test e2e/a11y/` → ≤ 5 violation critical/serious (baseline dulu, perbaiki bertahap).

---

### Fase O — Design System & Konsistensi Visual (V1–V6 Audit)

**Tujuan:** Satukan token, kurangi hex hardcode & `!important`, mulai migrasi CSS terstruktur.
**Rujukan:** Audit §4 (V1–V6).
**Strategi:** O-01..O-03 fondasi token → O-04..O-05 bersihkan CSS → O-06 lucide-react → O-07 date-fns → O-08 touch target ≥44px.

- [x] **O-01 — Satukan palet warna: 1 skala 50–900 + alias semantik**
  **Target:** `frontend/src/styles/00-tokens.css`.
  **Aksi:**
  1. **Baca dulu:** `00-tokens.css` — catat SEMUA token warna yang ada (`--primary`, `--k48-primary`, `--ops-blue-600`, `--color-success`, `--color-danger`, dll).
  2. **Definisikan SATU skala netral + brand:**
     ```css
     :root {
       /* Skala abu-abu */
       --gray-50: #f8fafc;  --gray-100: #f1f5f9;  --gray-200: #e2e8f0;
       --gray-300: #cbd5e1;  --gray-400: #94a3b8;  --gray-500: #64748b;
       --gray-600: #475569;  --gray-700: #334155;  --gray-800: #1e293b;  --gray-900: #0f172a;
       /* Skala brand biru */
       --blue-50: #eff6ff;  --blue-100: #dbeafe;  --blue-200: #bfdbfe;
       --blue-300: #93c5fd;  --blue-400: #60a5fa;  --blue-500: #3b82f6;
       --blue-600: #2563eb;  --blue-700: #1d4ed8;  --blue-800: #1e40af;  --blue-900: #1e3a8a;
       /* Skala aksen */
       --green-50..900, --red-50..900, --amber-50..900, --purple-50..900 (opsional — mulai dari yang dipakai saja).
     }
     ```
  3. **Alias semantik** — arahkan ke skala:
     ```css
     --color-primary: var(--blue-600);
     --color-primary-hover: var(--blue-700);
     --color-success: var(--green-600);
     --color-danger: var(--red-600);
     --color-warning: var(--amber-600);
     --text-primary: var(--gray-900);
     --text-secondary: var(--gray-600);
     --text-muted: var(--gray-500);
     --bg-surface: var(--gray-50);
     --border-default: var(--gray-200);
     ```
  4. **Hapus duplikat:** `--k48-primary`, `--ops-blue-600` → semua konsumen pakai `--color-primary`. Cari + replace di semua file CSS/TSX.
  5. **JANGAN hapus token lama dulu** — tambah komentar `/* @deprecated — pakai --color-primary */` agar transisi mulus.
  **Anchor grep:** `--k48-primary` · `--ops-blue-600` · `--primary`
  **Gate:** `cd frontend; npm run build` ✅ · warna tidak berubah secara visual (bandingkan screenshot sebelum/sesudah).

- [x] **O-02 — Util `chartColors` dari token + ganti hardcode di chart**
  **Target:** Buat file BARU `frontend/src/config/chartPalette.ts`. Ganti `OwnerDashboardPage.tsx` + file chart lain.
  **Aksi:**
  1. Buat `frontend/src/config/chartPalette.ts`:
     ```ts
     // Baca token dari CSS via getComputedStyle saat runtime ATAU hardcode referensi token
     export const CHART_COLORS = {
       revenue: 'var(--color-primary)',       // #2563eb fallback
       expense: 'var(--color-danger)',         // #ef4444 fallback
       profit: 'var(--color-success)',         // #16a34a fallback
       grid: 'var(--gray-200)',                // #e2e8f0 fallback
       trend: 'var(--purple-600)',             // #7c3aed fallback
       occupancy: 'var(--blue-400)',
       cash: 'var(--green-500)',
     } as const;
     ```
  2. **Baca nilai aktual dari CSS variable saat runtime** (opsi A — rekomendasi):
     ```ts
     export function getChartColor(varName: string, fallback: string): string {
       if (typeof window === 'undefined') return fallback;
       return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
     }
     ```
  3. **Ganti di `OwnerDashboardPage.tsx`** baris 181–205:
     - `#2563eb` → `getChartColor('--color-primary', '#2563eb')`
     - `#f97316` → `getChartColor('--color-danger', '#f97316')`
     - `#16a34a` → `getChartColor('--color-success', '#16a34a')`
     - `#e2e8f0` → `getChartColor('--gray-200', '#e2e8f0')`
     - `#7c3aed` → `getChartColor('--purple-600', '#7c3aed')`
  4. **Ganti di file chart lain** — grep `#` hex di file TSX dalam folder `components/charts/` dan `pages/`.
  **Anchor grep:** `#2563eb` · `#f97316` · `#16a34a` (di TSX)
  **Gate:** `cd frontend; npm run build` ✅ · chart tetap berwarna sama.

- [x] **O-03 — Tambah skala spacing (`--space-1..8`) + skala radius**
  **Target:** `frontend/src/styles/00-tokens.css`.
  **Aksi:**
  1. Tambah di `:root`:
     ```css
     --space-1: 0.25rem;  /* 4px */
     --space-2: 0.5rem;   /* 8px */
     --space-3: 0.75rem;  /* 12px */
     --space-4: 1rem;     /* 16px */
     --space-5: 1.25rem;  /* 20px */
     --space-6: 1.5rem;   /* 24px */
     --space-8: 2rem;     /* 32px */
     --space-10: 2.5rem;  /* 40px */
     --space-12: 3rem;    /* 48px */
     /* Radius */
     --radius-sm: 0.25rem;
     --radius-md: 0.375rem;
     --radius-lg: 0.5rem;
     --radius-xl: 0.75rem;
     --radius-full: 9999px;
     ```
  2. **JANGAN paksa migrasi semua spacing/padding hardcode** — itu kerja besar. Cukup sediakan token. Pakai bertahap di komponen baru.
  3. Bila ada `--density-*` yang bentrok, harmonisasi.
  **Anchor grep:** `--density-`
  **Gate:** `cd frontend; npm run build` ✅.

- [x] **O-04 — Mulai CSS Modules untuk kurangi `!important`**
  **Target:** Pilih 1 file CSS paling bermasalah sebagai pilot.
  **Aksi:**
  1. **Pilih pilot:** `10-misc.css` (104 KB, 130 `!important`) — file paling besar & kacau.
  2. **Audit isi `10-misc.css`:** kelompokkan rule berdasarkan komponen yang di-style. Catat rule mana yang DIPAKAI (grep class name di TSX) vs MANA yang dead.
  3. **Buat file CSS Module pertama:** `frontend/src/styles/10-misc.module.css` — salin rule yang masih dipakai, hapus `!important` dengan menaikkan spesifisitas via module scope (CSS Modules auto-scope class name).
  4. **Ganti 1–2 komponen** sebagai pilot untuk import dari module CSS (mis. komponen kecil di `common/`).
  5. **Target:** turunkan `!important` di file itu ≥ 50%. JANGAN hapus `10-misc.css` total — rename ke `10-misc-legacy.css`.
  **Anchor grep:** `10-misc.css` · `!important`
  **Gate:** `cd frontend; npm run build` ✅ · komponen pilot tidak rusak.

- [x] **O-05 — Pisah `10-misc.css` + bersihkan dead CSS**
  **Target:** `frontend/src/styles/10-misc.css`.
  **Aksi:**
  1. **Split file berdasarkan domain:** `10-misc.css` (104 KB) → pecah jadi:
     - `10-misc.css` (sisa ~40 KB — utility classes yang dipakai lintas halaman)
     - `13-reports.css` — rule untuk halaman laporan (ProfitLoss, BalanceSheet, Cashflow, FinancialRatios)
     - `14-settings.css` — rule untuk halaman settings (OwnerSettings, AccountingSetup, AssetRegister)
  2. **Deteksi dead CSS:** untuk setiap file CSS hasil split, grep SEMUA class selector di folder `pages/` dan `components/`. Rule yang TIDAK MUNCUL di TSX manapun → tambah komentar `/* POTENTIAL DEAD — verify before delete */`.
  3. **Jangan hapus massal** — risiko false positive (class dipakai via string concatenation). Hapus hanya yang sudah dikonfirmasi manual.
  4. Update import di `main.tsx` atau file entry CSS.
  **Anchor grep:** `10-misc.css`
  **Gate:** `cd frontend; npm run build` ✅ · tidak ada style hilang.

- [x] **O-06 — Ganti emoji UI → `lucide-react` (ikon SVG konsisten)**
  **Target:** Semua file TSX yang pakai emoji sebagai ikon UI.
  **Aksi:**
  1. Install: `cd frontend; npm install lucide-react`.
  2. **Mapping emoji → Lucide icon:**
     | Emoji | Lucide |
     |-------|--------|
     | ⚠️ | `AlertTriangle` |
     | ✅ | `CheckCircle` |
     | ❌ | `XCircle` |
     | 📋 | `ClipboardList` |
     | 🔍 | `Search` |
     | 💰 | `DollarSign` |
     | 📅 | `Calendar` |
     | 🛏️ | `Bed` (atau `Home`) |
     | ➕ | `Plus` |
     | ✏️ | `Pencil` |
     | 🗑️ | `Trash2` |
     | 📊 | `BarChart3` |
     | ⚙️ | `Settings` |
  3. **Prioritas:** ganti emoji di KOMPONEN BARU (`ClickableRow`, `ConfirmProvider`, `AdminHealthBar`) dulu. Lalu ganti bertahap di halaman existing.
  4. **JANGAN ganti emoji di konten** (mis. teks pengumuman, label bersemangat) — hanya yang berfungsi sebagai ikon UI.
  5. Bungkus ikon dengan `aria-hidden="true"` + `size={18}` untuk konsistensi.
  **Anchor grep:** `⚠️` · `✅` · `aria-hidden` (emoji)
  **Gate:** `cd frontend; npm run build` ✅ · ikon tampil tajam di semua OS.

- [x] **O-07 — Adopsi library tanggal (date-fns) ganti hitung tanggal manual** (audit §8)
  **Target:** `frontend/src/utils/dateTime.ts` + konsumen.
  **Aksi:**
  1. Install: `cd frontend; npm install date-fns` (tree-shakable; locale `id`).
  2. Refactor isi `utils/dateTime.ts` (`addHoursToDate`, `getDeadlineMeta`, `formatDateTimeWib`, `daysFromToday`, dll) agar memakai `date-fns` (`addHours`, `differenceInDays`, `format`, `formatDistanceToNow` + `date-fns/locale/id`).
  3. **Jaga signature fungsi tetap sama** — ganti implementasi internal saja, hindari perubahan massal konsumen.
  4. Fondasi ini dipasang SEBELUM Fase P (kalender/kanban deadline butuh perhitungan tanggal yang andal).
  **Anchor grep:** `addHoursToDate` · `getDeadlineMeta` · `formatDateTimeWib`
  **Gate:** `cd frontend; npm run build` ✅ · label deadline/relatif tetap sama persis.

- [x] **O-08 — Audit touch target ≥44px (mobile)** (audit §5 R5)
  **Target:** CSS — chip, badge kecil, panah baris, tombol ikon.
  **Aksi:**
  1. Tetapkan token `--tap-min: 44px`. Elemen interaktif kecil diberi `min-height/min-width: var(--tap-min)` ATAU padding cukup (pakai hit-area `::before` transparan bila visual harus tetap kecil).
  2. Target spesifik: `.staff-filter-chip.compact`, badge `0.7em` (`ResourceTable.tsx` baris 123), `.row-arrow-cell`, tombol ikon topbar (☰, ◀, lonceng).
  3. Verifikasi di viewport 375px (Chrome DevTools) — tak ada target < 44px di area yang sering disentuh.
  **Anchor grep:** `staff-filter-chip` · `row-arrow-cell` · `0.7em`
  **Gate:** `cd frontend; npm run build` ✅ · cek manual 375px.

---

### Fase P — Pola UI Modern (P2 Strategis Audit)

**Tujuan:** Adopsi kalender, kanban, tabel canggih — modernisasi UX sesuai kebutuhan domain berbasis deadline.
**Rujukan:** Audit §7–§8, rekomendasi teknologi mutakhir.
**Strategi:** Tiap task tambah 1 dependensi baru (lazy-load di rute). Kerjakan **bertahap** — P-01 dulu (toggle tampilan), lalu P-02..P-04 bisa independen.

- [x] **P-01 — Model "1 data, 3 tampilan" (List / Board / Kalender) untuk Admin**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` + komponen BARU.
  **Aksi:**
  1. Tambah state `const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')`.
  2. Render `<SegmentedTabs>` (komponen existing — `common/SegmentedTabs.tsx`) sebagai toggle tampilan: `[{id:'list', label:'📋 Hari Ini'}, {id:'board', label:'📌 Papan'}, {id:'calendar', label:'📅 Kalender'}]`.
  3. **List view** = `ActionQueueTable` (existing).
  4. **Board view** (placeholder dulu) = komponen BARU `frontend/src/components/command-center/ActionKanbanBoard.tsx` — render 4 kolom: "Baru", "Dikerjakan", "Menunggu Cek", "Selesai". Pakai data dari `queueItems` yang sama. Untuk P-01, cukup render kartu statis (drag-drop nanti di P-03).
  5. **Calendar view** (placeholder dulu) = komponen BARU `frontend/src/components/command-center/ActionCalendar.tsx` — render kalender sederhana (grid 7×5) yang menandai tanggal dengan item. Untuk P-01, cukup render hari dengan dot/counter. FullCalendar nanti di P-02.
  6. Simpan `viewMode` ke `localStorage`.
  **Anchor grep:** `SegmentedTabs` · `ActionQueueTable`
  **Gate:** `cd frontend; npm run build` ✅ · toggle tampilan tidak reload halaman.

- [x] **P-02 — Kalender operasional dengan FullCalendar**
  **Target:** `frontend/src/components/command-center/ActionCalendar.tsx` — ganti placeholder P-01.
  **Aksi:**
  1. Install: `cd frontend; npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction`.
  2. **Lazy-load:** bungkus import dengan `React.lazy(() => import('@fullcalendar/react'))` agar tidak tambah bobot bundle utama.
  3. Di `ActionCalendar.tsx`:
     - Render `<FullCalendar>` dengan plugin `dayGridPlugin`.
     - `events`: map `queueItems` + data dari query tambahan (jatuh tempo invoice, deadline checkout, siklus meter) ke format `{ title, date, color, extendedProps: { type, id } }`.
     - `dateClick`: buka drawer/modal dengan daftar item untuk tanggal itu.
     - `eventClick`: navigasi ke detail item (invoice, ticket, stay).
  4. **Sumber data kalender:** buat endpoint backend BARU `GET /api/admin/calendar?month=2026-06` → return events JSON. Atau hitung dari query existing di frontend.
  5. **Warna event berdasarkan tipe:** jatuh tempo = merah, siklus meter = biru, check-in/out = hijau, deadline renewal = amber.
  **Anchor grep:** `FullCalendar`
  **Gate:** `cd frontend; npm run build` ✅ · kalender render bulan Juni 2026 tanpa error.

- [x] **P-03 — Papan kanban dengan `@dnd-kit` (drag-drop aksesibel)**
  **Target:** `frontend/src/components/command-center/ActionKanbanBoard.tsx` — ganti placeholder P-01.
  **Aksi:**
  1. Install: `cd frontend; npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
  2. **Lazy-load:** `const DndContext = React.lazy(() => import('@dnd-kit/core').then(m => ({ default: m.DndContext })));`
  3. Di `ActionKanbanBoard.tsx`:
     - Render 4 kolom (`Droppable`) — "Baru" / "Dikerjakan" / "Menunggu Cek" / "Selesai".
     - Tiap kartu = `Draggable` dengan data `queueItem`.
     - `onDragEnd`: update status item via API (`PATCH /api/tickets/:id` atau endpoint action queue).
     - **Aksesibilitas:** `@dnd-kit` sudah support keyboard (Space untuk pickup, panah untuk pindah, Space untuk drop).
  4. **Data source:** pakai `queueItems` dari `DashboardAdmin` (atau dari aggregate endpoint N-05).
  5. Visual: badge SLA berwarna di tiap kartu, avatar staf yang bertanggung jawab (bila ada).
  **Anchor grep:** `DndContext` · `useDroppable`
  **Gate:** `cd frontend; npm run build` ✅ · drag-drop antar kolom berfungsi, keyboard aksesibel.

- [x] **P-04 — TanStack Table ganti tabel buatan tangan**
  **Target:** Pilih 1 halaman sebagai pilot, lalu perluas.
  **Aksi:**
  1. Install: `cd frontend; npm install @tanstack/react-table`.
  2. **Pilih pilot:** `InvoicesPage.tsx` atau `TicketsPage.tsx` — halaman dengan tabel besar yang dapat sort/filter.
  3. Buat komponen BARU `frontend/src/components/common/TanStackTable.tsx` (generic wrapper):
     - Props: `columns`, `data`, `onRowClick?`, `isLoading?`, `emptyMessage?`.
     - Render `<table>` dengan header sortable (klik → `toggleSorting`), rows dengan `data-label` untuk responsif mobile.
     - Integrasikan dengan `react-bootstrap` styling (kelas `table table-hover`).
  4. **Fitur:** sorting, pagination (dengan nomor halaman, bukan cuma prev/next), column visibility toggle.
  5. Ganti tabel buatan tangan di halaman pilot. Verifikasi semua fitur existing tetap berfungsi.
  6. **JANGAN** ganti `ResourceTable.tsx` — itu sudah baik. TanStack Table untuk tabel dashboard kompleks.
  **Anchor grep:** `InvoicesPage` · `TicketsPage` · `PaginationControls`
  **Gate:** `cd frontend; npm run build` ✅ · sort/filter/paginasi berfungsi.

- [x] **P-05 — Bottom tab bar untuk portal Tenant di mobile**
  **Target:** `frontend/src/components/layout/AppLayout.tsx` (atau `TenantWorkspaceTabs.tsx`).
  **Aksi:**
  1. **Deteksi viewport:** pakai CSS media query `@media (max-width: 768px)` atau hook `useMediaQuery`.
  2. Buat komponen BARU `frontend/src/components/layout/MobileBottomNav.tsx`:
     - Render `<nav>` fixed-bottom dengan 4–5 ikon + label.
     - Item: "🏠 Beranda", "🛏️ Kamar Saya", "📅 Booking", "🎫 Tiket", "👤 Profil".
     - Gunakan `<NavLink>` dari react-router → `className={({isActive}) => isActive ? 'active' : ''}`.
     - CSS: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 1030; background: var(--bg-surface); border-top: 1px solid var(--border-default); display: flex; justify-content: space-around; padding: var(--space-2) 0;`.
  3. **Sembunyikan sidebar** di mobile saat bottom nav aktif (atau tetap offcanvas seperti existing).
  4. **Ganti tab horizontal atas** (`TenantWorkspaceTabs`) dengan bottom nav — lebih ramah jempol.
  **Anchor grep:** `TenantWorkspaceTabs` · `max-width: 768`
  **Gate:** `cd frontend; npm run build` ✅ · test di Chrome DevTools 375px — bottom nav muncul, tombol berfungsi.

- [x] **P-06 — Command palette ⌘K dengan `cmdk`**
  **Target:** `frontend/src/components/layout/AppLayout.tsx` — tambah overlay global.
  **Aksi:**
  1. Install: `cd frontend; npm install cmdk`.
  2. **Lazy-load:** `const CommandPalette = React.lazy(() => import('../common/CommandPalette'));` — render dengan `<Suspense fallback={null}>`.
  3. Buat komponen BARU `frontend/src/components/common/CommandPalette.tsx`:
     - Props: `open: boolean`, `onClose: () => void`.
     - Render `<Command>` dari cmdk:
       - `<Command.Input>` — input pencarian.
       - `<Command.List>` — hasil:
         - `<Command.Group heading="Navigasi">` — item rute (berdasarkan `navigation.ts` config, difilter role).
         - `<Command.Group heading="Aksi Cepat">` — "Booking baru", "Check-in", "Catat meter", "Buat tiket".
         - `<Command.Group heading="Terkini">` — histori navigasi (dari `sessionStorage`).
     - `onSelect`: navigasi via `useNavigate()`.
  4. **Shortcut:** `Ctrl+K` / `Cmd+K` — tambah `useEffect` dengan `keydown` listener di `AppLayout`.
  5. Integrasikan dengan `GlobalSearch` component yang sudah ada (bila ada).
  **Anchor grep:** `GlobalSearch` · `navigation.ts`
  **Gate:** `cd frontend; npm run build` ✅ · ⌘K buka palette, ketik "inv" → muncul "Invoices", Enter → navigasi.

---

### Fase Q — Performa & Stabilitas UI/UX (Q-01..Q-07)

**Tujuan:** Perbaiki 7 masalah kritis hasil investigasi Playwright 2026-06-20 — endpoint backend tidak terdaftar di dist, anti-pattern sequential fetch loop, heavy query saat mount, retry default terlalu panjang, double-fetch checkout, empty state kosong, dan push toggle tanpa graceful fallback.  
**Rujukan:** Investigasi sesi 2026-06-20 — `frontend/screenshots-ui/` (Playwright), curl audit, review kode langsung.  
**Strategi:** Urut Q-01 → Q-07. Q-01 backend perlu rebuild+restart; Q-02..Q-05 frontend kritis; Q-06..Q-07 polish. Q-02 baru bisa diverifikasi penuh setelah Q-01 selesai.  
**Gate umum tiap task:** `cd backend; npx tsc --noEmit` ✅ · `cd frontend; npm run build` ✅ · 1 commit per task.

---

#### Q-01 🔴 KRITIS — Backend: rebuild dist agar AdminDashboardModule ter-register

**Masalah:** `GET /api/admin/dashboard/aggregate` → HTTP 404. `backend/dist/modules/admin/` tidak ada. Backend berjalan dari `dist/main.js` lama yang dikompilasi sebelum `AdminDashboardModule` ditambah di Fase N-05. Akibat: `DashboardAdmin.tsx` query retry 3× (1s+2s+4s=7+ detik) → skeleton buta → error alert.  
**Verifikasi masalah terlebih dahulu:**
```bash
ls backend/dist/modules/ | grep -E "^admin$"
# Kalau output kosong → masalah terkonfirmasi
curl http://localhost:3000/api/admin/dashboard/aggregate -w "\nStatus: %{http_code}" 2>&1 | tail -1
# Harus: Status: 404 → terkonfirmasi
```

**Aksi:**
1. Stop backend yang sedang jalan (Ctrl+C di terminal backend, atau `npx kill-port 3000` bila perlu).
2. Cek TypeScript — pastikan tidak ada error di modul admin sebelum build:
   ```bash
   cd backend && npx tsc --noEmit 2>&1 | head -30
   ```
   - Jika ada error → baca pesan error, perbaiki file yang disebutkan (jangan ubah logika bisnis, hanya perbaiki type), jalankan ulang.
   - Jika clean (output kosong) → lanjut ke langkah 3.
3. Build ulang seluruh backend:
   ```bash
   cd backend && npm run build
   ```
   Tunggu hingga selesai (biasanya 30–60 detik). Pastikan tidak ada error di output.
4. Verifikasi hasil build:
   ```bash
   ls backend/dist/modules/admin/
   # Harus ada minimal: admin-dashboard.controller.js  admin-dashboard.service.js  admin-dashboard.module.js
   ```
5. Restart backend:
   ```bash
   cd backend && npm run start:dev
   # ATAU bila production: node dist/main.js
   ```
   Tunggu log "Application is running on port 3000".
6. Verifikasi endpoint sudah jalan:
   ```bash
   TOKEN=$(curl -s http://localhost:3000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"identifier":"admin@kost48.com","password":"admin123"}' \
     | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
   curl -s http://localhost:3000/api/admin/dashboard/aggregate \
     -H "Authorization: Bearer $TOKEN" | python -c "import sys,json; d=json.load(sys.stdin); print('SUCCESS' if d.get('success') else 'FAIL:'+str(d.get('message',''))[:80])"
   # Harus print: SUCCESS
   ```

**File yang disentuh:** Tidak ada kode yang diubah — hanya proses rebuild. Semua kode sudah benar di repo (`backend/src/modules/admin/`, terdaftar di `app.module.ts`).  
**Anchor grep:** `AdminDashboardModule` (app.module.ts) · `admin-dashboard.controller.ts` · `admin-dashboard.service.ts`  
**Gate:** `dist/modules/admin/` ada · curl aggregate → HTTP 200 + `"success":true` · `cd backend; npx tsc --noEmit` ✅.

---

- [x] **Q-01** Backend rebuild dist → `dist/modules/admin/` ada · `/api/admin/dashboard/aggregate` 200 OK.

---

#### Q-02 🔴 KRITIS — Frontend DashboardAdmin: kurangi retry default + verifikasi error state

**Masalah:** `aggregateQuery` di `DashboardAdmin.tsx:223` pakai default `retry: 3` (exponential backoff: 1s+2s+4s = 7+ detik) sebelum error alert muncul. Saat endpoint 404 (sebelum Q-01 diperbaiki), user melihat skeleton buta 7 detik. Setelah Q-01 diperbaiki, masalah ini tetap relevan untuk skenario network lambat atau backend restart.

**Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` baris 223.

**Aksi:**
1. Baca baris 220–230 dulu untuk konteks penuh.
2. Ganti **baris 223** — tambah `retry: 1` dan `retryDelay: 1000`:
   ```ts
   // SEBELUM (baris 223):
   const aggregateQuery = useQuery({ queryKey: ['admin-dashboard-aggregate'], queryFn: fetchAdminDashboardAggregate, staleTime: 60_000 });
   
   // SESUDAH:
   const aggregateQuery = useQuery({ queryKey: ['admin-dashboard-aggregate'], queryFn: fetchAdminDashboardAggregate, staleTime: 60_000, retry: 1, retryDelay: 1000 });
   ```
3. Verifikasi baris 314–315 sudah ada error state (jangan ubah, hanya konfirmasi):
   ```ts
   if (aggregateQuery.isLoading) return <LoadingDashboard />;
   if (aggregateQuery.isError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;
   ```
   Jika baris `isError` belum ada → tambahkan di bawah baris `isLoading`.
4. **Jangan ubah** query lain di file ini (`staffPerformanceQuery`, `autoOpsQuery`, `aiStatusQuery`).

**Anchor grep:** `aggregateQuery` · `fetchAdminDashboardAggregate` · `staleTime: 60_000` (DashboardAdmin.tsx)  
**Gate:** `cd frontend; npm run build` ✅ · Navigasi ke `/dashboard` → jika API error: alert merah muncul ≤ 3 detik. Jika API OK (setelah Q-01): data tampil normal.

---

- [x] **Q-02** DashboardAdmin retry: 1 + retryDelay: 1000. Error alert muncul ≤ 3 detik saat API gagal.

---

#### Q-03 🔴 KRITIS — Frontend StaysPage: ganti sequential pagination loop → single call

**Masalah:** `listAllActiveStaysForBookings()` di `frontend/src/pages/stays/stayPredicates.ts:69` adalah `do...while` loop dengan `await` sequential — tiap iterasi menunggu response sebelum lanjut. KOST48 punya maks 48 kamar → maks 48 stay aktif → SATU call `limit: 200` sudah cukup. Loop ini menyebabkan: (a) multiple sequential network calls, (b) browser tidak mencapai "networkidle", (c) UX lambat di tab "Perlu Tindak Lanjut".

**Target:** `frontend/src/pages/stays/stayPredicates.ts` baris 69–87.

**Aksi:**
1. Baca baris 69–88 dulu untuk konfirmasi kode saat ini.
2. **Ganti seluruh fungsi** `listAllActiveStaysForBookings` (baris 69–87) dengan implementasi baru:
   ```ts
   // HAPUS kode lama (baris 69–87):
   // export async function listAllActiveStaysForBookings(maxPages = 50): Promise<PaginatedResponse<Stay>> {
   //   const pageSize = 100;
   //   const items: Stay[] = [];
   //   ... (do...while loop) ...
   // }
   
   // TULIS kode baru (gantikan di posisi yang sama):
   // KOST48 = 48 kamar maks; stay aktif tidak mungkin >48. Single call limit 200 cukup untuk semua skenario.
   export async function listAllActiveStaysForBookings(): Promise<PaginatedResponse<Stay>> {
     return listStays({ status: 'ACTIVE', page: 1, limit: 200 });
   }
   ```
3. Verifikasi pemanggil di `StaysPage.tsx` baris 240:
   ```ts
   ? listAllActiveStaysForBookings()
   ```
   Ini tidak perlu diubah — signature return type tetap `Promise<PaginatedResponse<Stay>>`.
4. **Jangan ubah** bagian lain `stayPredicates.ts`.

**Anchor grep:** `listAllActiveStaysForBookings` · `do {` (stayPredicates.ts) · `maxPages = 50` · `pageSize = 100`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/stays` tab "Perlu Tindak Lanjut" → DevTools Network: hanya 1 request ke `/api/stays?status=ACTIVE&...`, bukan loop. Data muncul ≤ 2 detik.

---

- [x] **Q-03** stayPredicates.ts: `listAllActiveStaysForBookings` ganti do-while loop → single `listStays({ limit: 200 })`.

---

#### Q-04 🔴 KRITIS — Frontend InvoicesPage: lazy-load stays dropdown ke saat modal terbuka

**Masalah:** `frontend/src/pages/invoices/InvoicesPage.tsx:184` memanggil `listResource('/stays', { limit: 500 })` saat halaman PERTAMA DIMUAT — padahal 500 stays (~73KB JSON) hanya dibutuhkan ketika user membuka modal "Buat Invoice". Request besar ini memperlambar initial render InvoicesPage dan menyebabkan Playwright timeout saat `waitUntil: 'networkidle'`.

**Target:** `frontend/src/pages/invoices/InvoicesPage.tsx` baris 184.

**Aksi:**
1. Baca baris 164–186 dulu untuk konteks `canManageFinance`, `showCreate`, dan `staysQuery`.
2. Ganti **baris 184** — tambah `enabled: showCreate && canManageFinance` dan `staleTime: 30_000`:
   ```ts
   // SEBELUM (baris 184):
   const staysQuery = useQuery({ queryKey: ['stays', 'invoice-form'], queryFn: () => listResource<any>('/stays', { limit: 500 }) });
   
   // SESUDAH:
   const staysQuery = useQuery({
     queryKey: ['stays', 'invoice-form'],
     queryFn: () => listResource<any>('/stays', { limit: 500 }),
     enabled: showCreate && canManageFinance,
     staleTime: 30_000,
   });
   ```
3. Verifikasi baris 202 tidak perlu diubah — sudah handle `undefined` dengan benar:
   ```ts
   const stayOptions = useMemo(() => buildReferenceOptions(staysQuery.data?.items ?? [], '/stays'), [staysQuery.data?.items]);
   ```
   Ketika `enabled: false` → `staysQuery.data === undefined` → `stayOptions === []` → dropdown kosong sampai modal dibuka. ✅
4. Tambahkan `isLoading` indicator di dalam modal dropdown jika diperlukan untuk UX (opsional — hanya jika dropdown kosong terasa membingungkan):
   - Cari baris 646 (`<Modal show={showCreate...}`) → cari render `stayOptions`.
   - Bila ada `isLoading` prop di komponen `SearchableSelect` atau `ReactSelect` → tambah `isLoading={staysQuery.isLoading}`.

**Anchor grep:** `staysQuery` · `invoice-form` · `limit: 500` · `showCreate` (InvoicesPage.tsx)  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/invoices` → DevTools Network: TIDAK ada request `/stays?limit=500` sampai klik "Buat Invoice". Setelah klik → request muncul → dropdown terisi.

---

- [x] **Q-04** InvoicesPage staysQuery: tambah `enabled: showCreate && canManageFinance`. Stays tidak di-fetch saat mount.

---

#### Q-05 🟡 — Frontend StaysPage: tambah staleTime ke checkout request queries

**Masalah:** `StaysPage.tsx` membuat 2 query ke backend saat mount:
- `checkoutRequestsQuery` → `/api/checkout-requests?status=PENDING`
- `approvedCheckoutRequestsQuery` → `/api/checkout-requests?status=APPROVED`

Tanpa `staleTime`, keduanya refetch setiap kali StaysPage di-mount ulang (navigasi keluar-masuk). Untuk halaman operasional yang sering dibuka, ini menciptakan request redundan.

**Target:** `frontend/src/pages/stays/StaysPage.tsx` baris 191–201.

**Aksi:**
1. Baca baris 191–201 dulu untuk posisi pasti kedua query.
2. Tambah `staleTime: 30_000` ke kedua query:
   ```ts
   // SEBELUM baris 191–195:
   const checkoutRequestsQuery = useQuery({
     queryKey: ['admin-checkout-requests', 'PENDING'],
     queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
   });
   
   // SESUDAH:
   const checkoutRequestsQuery = useQuery({
     queryKey: ['admin-checkout-requests', 'PENDING'],
     queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
     staleTime: 30_000,
   });
   ```
   Lakukan hal yang sama untuk `approvedCheckoutRequestsQuery` (baris 197–201).
3. **Jangan ubah** logic lain — hanya tambah `staleTime`.

**Anchor grep:** `checkoutRequestsQuery` · `approvedCheckoutRequestsQuery` · `listAdminCheckoutRequests`  
**Gate:** `cd frontend; npm run build` ✅ · Navigasi keluar-masuk `/stays` 3× → Network tab menunjukkan request checkout tidak refetch selama 30 detik.

---

- [x] **Q-05** StaysPage: tambah `staleTime: 30_000` ke `checkoutRequestsQuery` dan `approvedCheckoutRequestsQuery`.

---

#### Q-06 🟡 — Frontend Inventory: empty state informatif dengan CTA

**Masalah:** Screenshot 07-inventory menunjukkan tab "Stok Barang" dalam kondisi data minimal dengan empty state yang tidak informatif — tidak ada instruksi apa yang harus dilakukan user baru.

**Target:** Cari di mana empty state dirender untuk resource `inventory-items` dan `room-items`.

**Aksi:**
1. Grep untuk menemukan file yang handle empty state inventory:
   ```bash
   grep -rn "EmptyState\|emptyMessage\|inventory-items\|Belum ada barang" frontend/src/pages/resources/ | head -20
   ```
2. Identifikasi komponen yang bertanggung jawab. Kemungkinan besar:
   - `frontend/src/pages/resources/ConfiguredResourcePage.tsx` — meneruskan `emptyMessage` prop ke tabel.
   - `frontend/src/components/common/ResourceTable.tsx` — render `<EmptyState>`.
3. Buka `frontend/src/components/common/EmptyState.tsx` — pahami props yang tersedia (`title`, `description`, `icon`, `action`).
4. Cari konfigurasi resource `inventory-items` dan `room-items`. Kemungkinan di:
   - `frontend/src/config/resourceConfigs.ts` atau file serupa.
   - Grep: `inventory-items` di folder `frontend/src/`.
5. Tambah/perbarui `emptyMessage` atau empty state config untuk:
   - **`inventory-items` (Gudang):**
     ```tsx
     emptyMessage: "Belum ada barang di gudang. Klik 'Tambah' untuk mencatat barang pertama."
     // ATAU jika EmptyState punya action:
     emptyAction: { label: 'Tambah Barang Pertama', onClick: () => setShowCreate(true) }
     ```
   - **`room-items` (Barang Kamar):**
     ```tsx
     emptyMessage: "Belum ada barang tercatat di kamar. Tugaskan barang dari Gudang via tab Mutasi."
     ```
   - **`inventory-movements` (Mutasi):**
     ```tsx
     emptyMessage: "Belum ada mutasi. Mulai dengan menugaskan barang dari Gudang ke kamar."
     ```
6. **Jangan buat komponen baru** — gunakan `EmptyState` yang sudah ada.

**Anchor grep:** `EmptyState` · `emptyMessage` · `inventory-items` · `ConfiguredResourcePage`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/inventory/gudang` saat data kosong → tampil teks instruksi (bukan area putih bersih).

---

- [x] **Q-06** Inventory empty state: tambah `emptyMessage` informatif + CTA untuk `inventory-items`, `room-items`, `inventory-movements`.

---

#### Q-07 🟢 — Frontend NotificationsPage: PushToggle graceful fallback saat VAPID belum dikonfigurasi

**Masalah:** Saat backend VAPID belum dikonfigurasi (env `VAPID_PUBLIC_KEY` kosong — kondisi normal di UAT), `PushToggle` kemungkinan menampilkan error atau state yang membingungkan karena request ke endpoint push gagal.

**Target:** `frontend/src/components/notifications/PushToggle.tsx`.

**Aksi:**
1. Baca `PushToggle.tsx` penuh — identifikasi bagaimana ia mendeteksi availability push dan bagaimana handle error.
2. Cek apakah sudah ada `try/catch` atau `isError` handling. Jika sudah ada fallback yang jelas → centang task ini sebagai "sudah OK, tidak perlu ubah".
3. Jika belum ada fallback yang informatif:
   - Cari kondisi di mana push tidak tersedia (VAPID tidak dikonfigurasi, atau `Notification` API tidak tersedia di browser).
   - Ganti tampilan error/null dengan pesan informasi ringan:
     ```tsx
     // Jika push tidak tersedia atau belum dikonfigurasi:
     return (
       <div className="alert alert-info d-flex align-items-center gap-2 small mb-3" role="note">
         <svg ... aria-hidden="true">{/* bell icon dari lucide-react */}</svg>
         <span>Notifikasi push belum aktif. Notifikasi dalam aplikasi tetap berjalan normal.</span>
       </div>
     );
     ```
4. Pastikan `role="note"` (bukan `role="alert"`) — ini info, bukan error.
5. **Jangan ubah** logika subscribe/unsubscribe yang ada.

**Anchor grep:** `PushToggle` · `VAPID` · `Notification.requestPermission` · `vapid-public-key`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/notifications` tanpa VAPID → pesan info ringan (bukan merah/error). Dengan VAPID → toggle berfungsi normal.

---

- [x] **Q-07** PushToggle: graceful fallback saat VAPID belum dikonfigurasi — info ringan, bukan error merah.

---

### Fase S — Multi-Portal Vercel + Mobile-First Tenant & Staff

**Tujuan:** Pisah frontend menjadi 3 portal Vercel terpisah (tenant/staff/admin) dengan mobile-first UX; Owner tetap akses via cPanel (full desktop view). PWA offline-aware dengan status sinkronisasi.

**Arsitektur target:**
```
tenant.kost48.com  → Vercel project "kost48-tenant"  (SPA, VITE_APP_PORTAL=tenant)
staff.kost48.com   → Vercel project "kost48-staff"   (SPA, VITE_APP_PORTAL=staff)
admin.kost48.com   → Vercel project "kost48-admin"   (SPA, VITE_APP_PORTAL=admin)
owner: cPanel saja (akses komputer, full access, sudah ada)
Backend API: tetap di cPanel → /api/*
Database: tetap di cPanel/VPS
```

**Strategi kode:** Satu codebase (`frontend/`), 3 build dengan env var berbeda. Login page menampilkan portal sesuai peran; setelah login role-check redirect ke error bila role tidak cocok.

**Batas Vercel Free Tier (lebih dari cukup untuk KOST48 48 kamar):**
- Bandwidth: 100 GB/bulan · Build: 6.000 menit/bulan · Projects: tidak terbatas · SSL: gratis

#### S-01 🟡 — Env var VITE_APP_PORTAL + role gate di login

**Target:** `frontend/src/main.tsx` atau `frontend/src/App.tsx` + `LoginPage.tsx`

**Aksi:**
1. Tambah env var `VITE_APP_PORTAL` (`tenant` | `staff` | `admin` | `` / kosong = all).
2. Di `LoginPage.tsx`: baca `import.meta.env.VITE_APP_PORTAL` → tampilkan judul dan logo sesuai portal ("Portal Penghuni", "Portal Staf", "Panel Admin").
3. Setelah login sukses: cek `user.role` vs portal yang diijinkan.
   - Jika portal=`tenant` dan role bukan TENANT → `logout()` + tampilkan alert "Akses ditolak. Gunakan portal yang sesuai."
   - Sama untuk `staff` (STAFF) dan `admin` (OWNER/ADMIN).
4. Jika `VITE_APP_PORTAL` kosong → semua role diijinkan (behavior saat ini, untuk cPanel/dev).

**Gate:** `VITE_APP_PORTAL=tenant npm run build` ✅ · Login sebagai TENANT → berhasil; login sebagai STAFF → alert tolak.

---

- [ ] **S-01** Env var `VITE_APP_PORTAL` + role gate di login (≤1 jam)

---

#### S-02 🟡 — Update CORS backend untuk domain Vercel

**Target:** `backend/.env` / `backend/src/app.module.ts` atau `main.ts`

**Aksi:**
1. Di `backend/.env.production`: tambahkan `CORS_ORIGIN=https://tenant.kost48.com,https://staff.kost48.com,https://admin.kost48.com,https://kost48.com`.
2. Verifikasi `main.ts` sudah baca `CORS_ORIGIN` dari env (split by koma).
3. Tambahkan wildcard `*.vercel.app` untuk preview URL Vercel (opsional, hanya dev).

**Gate:** `npx tsc --noEmit` ✅ · Test CORS dari browser dengan Origin Vercel.

---

- [ ] **S-02** Update CORS backend untuk domain Vercel (≤30 menit)

---

#### S-03 🧑 — Setup 3 Vercel project + custom domain

**[OWNER]** Langkah manual di dashboard Vercel & domain registrar:

1. Buat akun Vercel (gratis) → Import repo GitHub `liemlui/kost48v4`.
2. Buat 3 project: `kost48-tenant`, `kost48-staff`, `kost48-admin`.
3. Tiap project: Root Directory = `frontend/`, Build Command = `npm run build`, Output = `dist/`.
4. Env Vars per project:
   ```
   VITE_APP_PORTAL = tenant / staff / admin
   VITE_API_BASE_URL = https://api.kost48.com  ← sesuai domain backend
   ```
5. Custom domain: arahkan DNS `tenant/staff/admin.kost48.com` ke Vercel (CNAME).
6. SSL otomatis (Vercel Let's Encrypt).

**Gate:** Buka `https://tenant.kost48.com` → landing halaman login "Portal Penghuni".

---

- [ ] **S-03** 🧑 [OWNER] Setup Vercel + DNS + env vars (manual)

---

#### S-04 🟡 — Mobile-first layout Tenant portal

**Target:** `frontend/src/pages/portal/` + `frontend/src/styles/06-tenant.css`

**Aksi:**
1. `MyStayPage.tsx`: ganti tabel → card stack full-width di mobile (`<Card>` Bootstrap).
2. `MyInvoicesPage.tsx`: list tagihan → card per tagihan (nominal besar, status badge, tombol bayar full-width).
3. `MyTicketsPage.tsx`: card tiket dengan foto thumbnail inline (sudah ada lightbox dari R-1).
4. Form input: `font-size: 16px` min (cegah zoom iOS), padding ≥ 12px, label di atas bukan samping.
5. `06-tenant.css`: tambah breakpoint `@media (max-width: 576px)` untuk card utama full-width, gap 12px.

**Gate:** `npm run build` ✅ · Test di Chrome DevTools 375px (iPhone SE) → tidak ada overflow horizontal.

---

- [ ] **S-04** Mobile-first layout Tenant portal (≤2 jam)

---

#### S-05 🟡 — Mobile-first layout Staff portal

**Target:** `frontend/src/pages/tickets/TicketsStaffMode.tsx` + `frontend/src/styles/05-staff.css`

**Aksi:**
1. `TicketsStaffMode.tsx`: kartu tiket jadi swipeable (pakai `@dnd-kit` atau CSS `overflow-x: scroll` dengan snap).
2. Form laporan staf: tombol CTA full-width, foto upload tap-friendly.
3. `DashboardStaff.tsx`: metrik 2-kolom di mobile, chart responsif.
4. BottomTabBar (sudah ada Fase P): pastikan aktif untuk STAFF juga (saat ini hanya TENANT).
5. `05-staff.css`: min touch target 48px untuk semua tombol aksi staf.

**Gate:** `npm run build` ✅ · Test di 375px → BottomTabBar staf muncul, kartu tiket terbaca.

---

- [ ] **S-05** Mobile-first layout Staff portal (≤2 jam)

---

#### S-06 🟡 — PWA offline-aware: cache read + status banner

**Target:** `frontend/public/sw.js` atau `vite-plugin-pwa` config + komponen baru `OfflineStatusBanner.tsx`

**Aksi:**
1. Verifikasi `vite-plugin-pwa` sudah ada di `package.json`; jika tidak, install dulu (🧑 owner approve npm dep baru).
2. Konfigurasi Workbox cache strategy:
   - `GET /api/tenants/me`, `/api/stays/my`, `/api/invoices*`, `/api/tickets/my` → **StaleWhileRevalidate** (baca offline, update background).
   - `POST/PATCH/*` → network-only + queue di IndexedDB bila offline.
3. Buat `frontend/src/components/common/OfflineStatusBanner.tsx`:
   ```tsx
   // Tampil bila navigator.onLine === false
   // "📡 Offline · Data per [waktu] · X aksi tertunda"
   // Warna kuning/amber, tidak memblokir konten
   ```
4. Pasang `<OfflineStatusBanner />` di `AppLayout.tsx` (di atas `<main>`).
5. Tombol aksi keuangan (bayar, booking): tambah guard `if (!navigator.onLine) → toast "Butuh koneksi internet"`.

**Gate:** `npm run build` ✅ · Chrome DevTools → Network: Offline → halaman tenant tetap terbaca, banner kuning muncul.

---

- [ ] **S-06** PWA offline-aware: cache + `OfflineStatusBanner` (≤3 jam)

---

**Urutan eksekusi:** S-01 → S-02 → S-03 🧑 (paralel dengan S-04/S-05) → S-06  
**Estimasi total kode:** ~6-8 jam. S-03 tergantung owner (DNS propagation 1-24 jam).

---

## Catatan Eksekusi Penting

- **Fase M–P = turunan Audit UI/UX 20 Juni 2026** (`docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md`). Pemetaan: M=P0 quick wins, N=ramping dashboard/nav (§5–§7), O=design system (§4), P=pola UI modern (§7–§8).
- **M18_FASE_M diarsipkan** (stale/konflik) → `docs/archieve/deprecated_dossiers/_DEPRECATED_M18_FASE_M_FRONTEND_UX.md`. **Sumber kebenaran Fase M = file ini.** Pola konfirmasi final: `ConfirmProvider` + `useConfirm()`.
- **Fase B–K selesai:** detail historis di `docs/M11_CHANGELOG.md`.
- **MKT-5, PUB-UI-REVAMP, OWN-STRUKTUR, AUDIT-KEUANGAN-ULTRA:** semua diserap ke fase-fase di atas — jangan buat task duplikat.
- **Monolit yang jangan dipecah buta:** `TicketsPage`, `StaysPage`, `AccountingSetupPage` (FE), jalur-uang backend — refactor hanya per-task bila ada bug.
- **Selesai Referensi:** METER M-5 (checkout deposit UAT), SEO Lighthouse 100/100, split auto-ops E3a-E3b, integration test E3c, E2E E3d.
