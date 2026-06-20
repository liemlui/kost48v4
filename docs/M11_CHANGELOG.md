# KOST48 V5 — M11 Changelog Arsip

> Arsip changelog ringkas, dipisah dari M10 pada 2026-06-19 untuk hemat token AI (M10 = checklist aktif saja). **Entri changelog BARU ditulis DI SINI (paling atas)**, bukan di M10. Format: 1 header tanggal + 1-2 poin outcome per entri.

## Changelog Ringkas

### 2026-06-20 — Fase M: Quick Wins A11y & Polish (M-01..M-06)
- **M-01** `AdminWorkspaces.tsx`: ganti `window.location.assign` → `useNavigate()` di `AdminStaffFrontlineList`.
- **M-02** Buat `ConfirmProvider` + `useConfirm()` (context + promise); daftarkan di `main.tsx`; ganti 9 `window.confirm` di 6 file (`AppLayout`, `FacilityManager`, `TenantProfilePhotoCard`, `MyStayPage`, `WifiOrderPage`, `OwnerSettingsPage`).
- **M-03** `01-base.css`: tambah blok `@media (prefers-reduced-motion: reduce)` global di akhir file.
- **M-04** `01-base.css` + `11-public-pages.css` (9 occurrences): typo `Cormorant Garant` → `Cormorant Garamond`; `00-tokens.css`: hapus `DM Mono` (tidak di-@import) → fallback `JetBrains Mono`.
- **M-05** Buat `ClickableRow.tsx` (tabIndex + onKeyDown + aria-label); pasang di `AdminWorkspaces`, `InvoicesPage`, `AncillaryRevenuePage`, `TicketsPage`, `SmartChartPanel`.
- **M-06** `ToastProvider.tsx`: refactor ke `ToastItem` per-toast dengan timer per-item; durasi 3500 → 6000ms; pause hover/focus; ARIA `role="status"` + `aria-live="polite"` untuk success/info, `role="alert"` + `aria-live="assertive"` untuk danger/warning.
- **Gate build:** `npm run build` ✅ 0 error (fix scope `useConfirm` di `ActiveStayContent` bukan `MyStayPage`).

### 2026-06-20 — Audit UI/UX: Owner & Admin Dashboard
- **OwnerDashboardPage**: hapus `OwnerActionStrip` + `AssistantPanel` sinyal (duplikat); gabung 2 panel AI menjadi 1 (`generateBrief`); hapus 3 tombol quick-action redundan; tambah tooltip kriteria grade badge; label "Kesiapan Go-Live" → "Kesiapan Akuntansi"; skor bisnis kini tampil hint `(0–100)`.
- **DashboardAdmin**: hapus `AdminHealthChips` (6 chip duplikat lane) + `admin-ops-guardrails` (4 blok teks statis); `AssistantPanel` kini full-width; hapus baris `detail` di `AdminTodayStatusStrip`; label "Finance" → "Keuangan".
- **AppLayout**: toggle `Kokpit Owner / Area Admin` kini muncul di mobile topbar (di bawah search bar), tidak hanya di sidebar Offcanvas.
### 2026-06-22 — docs: audit & bersihkan M-file (dedup, stale, sinkronisasi)
- **docs(audit):** Audit 14 M-file + CODEMAP terhadap kode nyata. 14 isu ditemukan (4 critical, 5 stale, 3 duplikasi, 2 minor). Semua difix: M17 status L-08/10/11/16 ditandai ✅, M01 model count 41→55 + modul 33+→38, CODEMAP 39→38 modul + 54→55 model, M02 OWN-STRUKTUR-PHASE2 ditandai selesai, M03 §7 auto-ops diupdate ke 5 sweep service, M01 §4 tabel auto-ops diganti sweep.
- **docs(arsip):** M17 + fase-l-specs/ dipindahkan ke `archieve/2026-06-20_fase_selesai/` karena Fase L selesai semua. Root docs lebih ramping.

### 2026-06-20 — ui(Fase L): L-08, L-10, L-11, L-16, L-19
- **frontend(L):** PublicRooms mendapat filter mobile collapse, compare counter x/3, carousel touch, dan pagination ellipsis; tiket tenant punya SafeImage lightbox; Reports lazy-load `UnlockedFormalReports` via Suspense skeleton.
- **finance(L):** Accounting setup punya checklist read-only dari query existing; Asset Register memindahkan form tambah aset ke modal dengan validasi tetap aktif. Gate: `npm.cmd run build` PASS + PWA verified.

### 2026-06-20 — feat(Fase L): eksekusi L-01..L-20 UI/UX fixes
- **L-01:** `App.tsx` — `return null` → `<PageLoadingSkeleton />` di `RequireRoles` + `TenantBookingRouteGuard`.
- **L-02/L-18:** `CashflowPage.tsx` — tambah EmptyState operasi kas kosong + import. `FinancialRatiosPage.tsx` — import `useNavigate`+`Button`, tambah CTA setup akuntansi bila belum formal.
- **L-03:** `StaffRoutinesAdminPage.tsx` — `Col md={3}` → `Col xs={12} md={6} lg={3}` (checkbox). `ReminderPreviewPage.tsx` — `maxWidth:250` → `minWidth:200,maxWidth:320` (4 lokasi, replace_all).
- **L-04:** `CheckInWizard.tsx` — tambah `isTenantsError` dari query. `StepTenantSelect.tsx` — prop `isError?`, Alert fallback saat query gagal.
- **L-06:** `GuestBookingSuccess.tsx` — state `copied`+`copyError`, `handleCopyPassword`, tombol "📋 Salin"/"✅ Disalin".
- **L-07:** `ResetPasswordPage.tsx` — timeout redirect 1200ms → 2000ms + teks pesan diperbarui.
- **L-09:** `OwnerDashboardPage.tsx` — konstanta `CARD_ERROR_VALUE='Gagal'`, kartu meter-due+readiness pakai `CARD_ERROR_VALUE` + helper jelas + tone `risk` saat error.
- **L-12:** `LoyaltyAdminPage.tsx` — tambah `REWARD_TYPE_LABEL` map, dropdown + kolom tabel pakai label Indonesia. Save button dinamis "Tambah Reward"/"Simpan Perubahan".
- **L-13:** `TicketsStaffMode.tsx` — "Mulai Kerjakan" → "Memproses..." saat `isPending`. `StaffRoutinesAdminPage.tsx` — tambah `reactivateMutation` + tombol "Aktifkan"/"Nonaktifkan" dengan loading state.
- **L-14:** `StayDetailPage.tsx` — tukar urutan Alert: warning keuangan (hasUnpaid/overdue) naik ke atas "Aturan perpanjangan" (info statis).
- **L-15:** `TenantWorkspaceTabs.tsx` — announcement strip truncate 2 baris `-webkit-line-clamp`. `MyManualPage.tsx` — Accordion `defaultActiveKey` buka FAQ pertama tiap kategori.
- **L-17:** `01-base.css` — CSS `:focus-visible` global + `.staff-room-card:focus-visible`. `AppLayout.tsx` — `aria-pressed` pada 4 tombol owner-view-toggle (mobile+desktop).
- **L-19:** `AssetRegisterPage.tsx` — `ALIGNMENT_STATUS_TOOLTIP` + `title` pada badge alignment. `LoyaltyAdminPage.tsx` — save button teks kontekstual.
- **L-20:** `ProfilePage.tsx` — `Form.Text` "Kosongkan jika tidak dipakai" di tip e-wallet. `OwnerSettingsPage.tsx` — error upload pakai label fasilitas (bukan slug). FAQ modal `autoFocus` ke field Pertanyaan.

### 2026-06-20 — audit(Fase L): audit UI/UX menyeluruh 75+ halaman
- **audit(L):** 75+ halaman diaudit via 5 agen paralel. 20 task (L-01..L-20) dikategorikan: loading state, mobile responsiveness, error display, aksesibilitas, wording, dan isu per halaman.
- **docs(M17):** `docs/M17_FASE_L_UIUX_AUDIT.md` BARU — laporan lengkap per halaman + matriks prioritas. Checklist Fase L ditambah di M10.

### 2026-06-20 — audit(Fase K): audit total 12 jalur + fix keamanan P1-P3
- **audit(12-jalur):** 97 temuan (24 critical, 42 medium, 31 low). Plan: `docs/M16_PASCA_AUDIT_PLAN.md`. 5 keputusan owner diambil.
- **backend(P1):** tambah `RolesGuard` di loyalty, notifications, push controller.
- **backend(P2):** fix DTO validation bypass multipart `submitWithProof` — validasi class-validator manual.
- **backend(P3):** hapus `STAFF` dari 11 endpoint sensitif (tenants, users, invoices, expenses, invoice-payments, stays POST). OWNER/ADMIN only.
- **docs(M16):** `docs/M16_PASCA_AUDIT_PLAN.md` BARU — 13 task P4-R5 + 31 backlog.

### 2026-06-20 — fix(Fase J): hardening owner-ai PDP, no-partial, dan gating frontend
- **backend(J0-J2):** tambah `owner-ai.helpers.ts`, safety test `owner-ai-safety.test.js`, guard AI payment sadar FULL/DP/SETTLEMENT, dan masking NIK di teks prompt KTP OCR sebelum DeepSeek. `test:unit` juga dipersempit ke `test/unit/**/*.test.js` agar tidak menjalankan integration test yang butuh DB UAT.
- **frontend(J3)+audit(J4):** `AiAssistButton` error non-blocking + retry, `AiResultPanel` tampilkan mode/model/fallback/warnings, tombol AI digate role+configured, dan audit 12 endpoint owner-ai dibukukan di M09. Gate: backend `npx.cmd tsc --noEmit`, `npm.cmd run build`, `npm.cmd run test:unit` PASS; frontend `npm.cmd run build` PASS.

### 2026-06-20 — docs(Fase J): dossier hardening AI pra-go-live (jaring pengaman owner-ai)
- **docs(M15):** `docs/M15_FASE_J_HARDENING_AI.md` BARU — 5 task J0-J4 (detail untuk AI eksekutor lemah): J0 ekstrak guard murni → `owner-ai.helpers.ts`, J1 unit test PDP mask-NIK + uang no-partial (`owner-ai-safety.test.js`), J2 luruskan guard no-partial AI sadar DP booking, J3 hardening FE AI non-blocking + gating, J4 audit PDP 12 endpoint → M09.
- **temuan audit kode 2026-06-20:** modul `owner-ai/` (Fase G, 15 file) selesai TANPA test; fungsi pengaman murni terkubur `private`; DIVERGENSI guard no-partial — AI `reviewPaymentSubmission` (±l.1150) salah me-REJECT DP booking sah vs domain `approveSubmission` (±l.567-587) yang sadar DP. Aman uang (over-reject) tapi rekomendasi salah.
- **docs(M10/M01/M12):** Fase J ditambah ke ANTRIAN + status table (dedup baris Fase I ganda) + router M01 + status M12. Backend/FE tidak disentuh (fase dokumentasi).

### 2026-06-20 — ui(Fase I): I1–I6 de-duplikasi navigasi + onboarding tenant
- **ui(I1):** hapus `AdminAreaInternalMenu` + `AdminAreaMenuItem` type + `activeAreaMenuItems` dari `DashboardAdmin.tsx` (484 baris, dari 551). Sub-menu chip 20+ item yang 100% duplikat sidebar dihapus. Teks header diupdate: "Gunakan sidebar kiri untuk membuka halaman detail."
- **ui(I2):** unifikasi `StaffTopWorkspaceNav` — import `getNavigationLinks('STAFF')` dari `navigation.ts`, ganti hardcode 4 tab dengan source tunggal. Tambah tab "Tugas" (`/tickets`) + key `tickets` di counts.
- **ui(I3):** tambah `/meter-readings` ke `activePaths` sidebar "Kamar & Stok" di `navigation.ts`.
- **feat(I4):** komponen baru `GettingStartedGuide.tsx` — 3 langkah orientasi tenant (browsing: pilih kamar→booking→bayar; booking: pantau→bayar→kunci). Render di `TenantWorkspaceTabs`.
- **ui(I5):** breadcrumb segmen pertama jadi `<NavLink to={defaultRoute}>` di `AppLayout.tsx`.
- **ui(I6):** verifikasi guide strip tenant adaptif (no-op, sudah benar).
- **Gate:** `npm run build` PASS (43s, 115 chunks, PWA verified). Backend tidak disentuh.
- **docs:** M14 dossier SEARCH/REPLACE siap copas; M10 centang I1-I6 [x]; M11 changelog ini.

### 2026-06-20 — docs(Fase I): dossier navigasi & onboarding + audit UI/UX total
- **docs(M14):** `docs/M14_FASE_I_NAVIGASI_ONBOARDING.md` — 6 task I1-I6: hapus AdminAreaInternalMenu (duplikasi sidebar), unifikasi StaffTopWorkspaceNav dengan staffSections, ekspos rute tersembunyi (/expenses, /meter-readings), GettingStartedGuide tenant, breadcrumb interaktif, guide strip adaptif.
- **docs(M10):** Fase I ditambah ke ANTRIAN + ringkasan + peta rujukan. Fase G dan H ditandai **selesai**.
- **audit:** audit UI/UX total selesai — tidak ditemukan auto-trigger AI, semua panggilan AI di balik button. 3 lapis navigasi paralel teridentifikasi (sidebar → menu area → sub-menu chip).

### 2026-06-20 — css(Fase H H6): hapus CSS dead di 08-admin.css
- **css(H6):** 7 edit bedah di `08-admin.css` — hapus `.admin-area-tabs` (layout 6 & 7 kolom lama), `.admin-area-link-grid` (grid pintasan lama), `.admin-primary-tabs` (sticky tabs 6 kolom lama), dan semua referensinya di `@media` block. Selector live (`.admin-sla-mini-note`, `.admin-workspace-topbar`, `.admin-today-status-strip`, dll.) dipertahankan. `12-owner.css` tidak ada selector mati.
- **Gate:** `npm run build` PASS (19 s, 115 chunks, PWA verify OK). Backend tidak disentuh.

### 2026-06-20 — ui(Fase H H4+H5): unifikasi AI panel + compact Owner Dashboard
- **ui(H4):** `AiAssistButton` (`generateBrief`) ditambah di `DashboardAdmin.tsx` area overview — conditional bila API key `configured` (`aiStatusQuery`). `AssistantPanel` sinyal (`ownerAssistantItems` dari `data.signals`) ditambah di `OwnerDashboardPage.tsx` di bawah KPI cards.
- **ui(H5):** tren chart `.owner-trend-panel` dibungkus `{viewMode === 'full' ? ... : null}` (disembunyikan di mode Ringkas). 3 quick-action buttons "Buka Laporan / Buka Area Admin / Analisa Pasar" ditambah setelah row sinyal.
- **Gate:** `frontend npm run build` PASS (39 s, 115 chunks, PWA verify OK). Backend tidak disentuh.

### 2026-06-20 — ui(Fase H): compact Owner↔Admin (H1–H5 per M13) SELESAI
- **ui(H1):** sidebar Kokpit Owner 18→7 item, 1 grup "Keputusan Owner" (`navigation.ts`). Tanpa hilang fitur: `/loss-refunds` (Refund Kalah-Cepat, OWNER-only) + `/finance/assets` digabung ke `activePaths` "Akuntansi & Aset"; `/users`+`/tenants`+`/additional-services`+`/service-interests` digabung ke "Akun & Layanan". Pengumuman pindah ke tombol 📣 topbar (kondisi `isAdmin||isOwner`, `AppLayout.tsx`).
- **ui(H2):** dashboard admin 6→3 area — Ringkasan·Penghuni&Uang·Operasional (`DashboardAdmin.tsx`: type/areas/normalize/match/needs*/queries/menu/charts/JSX; `RoleWorkspaceTabs.tsx`: buildAdminTabs + OWNER_TABS jadi 3, match mencakup semua route). H3 (merge Minat→Layanan) & H4 (hapus dup finance) selesai otomatis via H1. H5 polish: `@media 480px .role-workspace-tabs` (`12-owner.css`).
- **Gate:** `frontend npm run build` PASS · `backend npx tsc --noEmit` PASS (0 perubahan backend/schema/API). DI-DEFER (di luar scope M13, owner belum minta): unifikasi AI panel admin & owner-dashboard compact mode.

### 2026-06-22 — docs(Fase H UI/UX Compact): spesifikasi + checklist antrian
- **docs(M13):** `docs/M13_FASE_H_UIUX_COMPACT.md` — 6 task H1-H6: compact owner sidebar (19→7), dashboard admin (6→3 tab), merge Minat+Layanan, unifikasi AI panel, owner dashboard landing page, CSS polish. Semua frontend-only, tidak sentuh backend/schema.
- **docs(M10):** Fase H ditambah ke ANTRIAN dengan 6 task + UAT checklist.
- **docs(M01, CODEMAP):** referensi M13 ditambah.

### 2026-06-19 — G9: AI Draft Queue (schema S-6)

- **G9 🧬** Model `AiDraft`+`AiDraftStatus` (migration additive `20260619140000_ai_draft_queue`). Modul terpisah `AiDraftService`/`AiDraftController`: `POST/GET /owner-ai/drafts`, `GET :id`, `POST :id/review` (APPLIED/REJECTED), `POST run/expire` (retention 60 hari). FE `api/aiDrafts.ts` + tombol "Simpan sebagai draft" di `AiResultPanel` (wired di KTP validator) + tab "Antrean Draft AI" di OwnerSettings. resultJson bersih (PDP).

### 2026-06-19 — G7: AI Settings, Budget & Observability

- **G7** GET /owner-ai/usage (usage per-fitur in-memory + 20 jejak AuditLog.meta.ai via jsonb_exists) + POST /owner-ai/test-connection (OWNER, latency+model, tanpa bocor API key). Tab "AI & Biaya" di OwnerSettingsPage: status/enabled/manual-only/model/limit, tes koneksi, usage per fitur, jejak keputusan AI.

#### 2026-06-19 — G3: Payment Review Assistant

- **G3** POST /owner-ai/payment-submissions/:id/review-draft: reviewPaymentSubmission() — no-partial deterministic guard BEFORE AI call, snapshot submission+invoice+stay, deepseekChat json:true. Tombol "Bantu Review AI (DeepSeek)" di ReviewPaymentModal.

## 2026-06-19 - G6: Ops & Inventory AI Draft

- **G6** POST `/owner-ai/tickets/:id/action-draft`, `/owner-ai/inventory/reorder-draft`, dan `/owner-ai/staff-field-reports/:id/review-draft`: snapshot operasional read-only, prompt ops-inventory, normalisasi schema, dan fallback rule-based. Tidak assign staf, tidak close tiket, tidak membuat movement/purchase/expense.
- Frontend: tombol "Saran AI" di detail tiket Owner/Admin dan "Cek Stok AI" di shell inventaris; hasil tampil di `AiResultPanel`, aksi final tetap lewat tombol existing.

### 2026-06-19 — Demografi Customer (teranonim, marketing)

- **Demografi** GET /market-analysis/demographics (OWNER/ADMIN): `demographicsSnapshot()` agregat TERANONIM dari Tenant (rentang usia dari birthDate, gender, top 10 provinsi/kota asal, top 10 pekerjaan) + coverage — tanpa NIK/nama/alamat (UU PDP, keputusan owner). Tab "Demografi Customer" di MarketAnalysisPage (`DemographicsPanel.tsx`).
- **🧬 Schema (owner-approved):** `Tenant.originProvince String?` (migration `20260619120000_tenant_origin_province`, additive nullable) + field di form tenant (people.ts) & DTO; demografi breakdown per provinsi.

### 2026-06-19 — G2: Finance AI Analyst

- **G2** POST /owner-ai/finance/analyze: buildFinanceSnapshot() raw SQL dari JournalLine, analyzeFinance() dengan deepseek-v4-pro, fallback rule-based. Tombol "Analisa Keuangan AI" di AccountingSetupPage (OWNER only).

### 2026-06-19 - G4: Expense Receipt OCR Draft

- **G4** POST `/owner-ai/expenses/receipt-draft`: teks OCR nota divalidasi, dirapikan DeepSeek/fallback menjadi draft expense, dinormalisasi ke enum existing, dan tidak membuat jurnal.
- Frontend `/expenses`: tambah OCR lokal `tesseract.js`, preview teks OCR, tombol "Rapikan Draft AI", prefill form expense existing, plus `AuditLog.meta.ai` kecil saat draft dipakai untuk simpan.

### 2026-06-19 — G5: KTP OCR Validator

- **G5** POST /owner-ai/tenants/:id/ktp-ocr-validate (OWNER/ADMIN): validasi TEKS OCR KTP vs data tenant. PDP — hanya teks (bukan gambar/base64, ditolak), NIK tenant & hasil ter-mask `************1234`. Cek deterministik backend-menang (NIK 16 digit + cocok tenant) + demografi dari struktur NIK (tgl lahir/gender) tanpa AI; DeepSeek json:true menormalkan + nama match; fallback rule-based. Komponen `KtpOcrValidateCard` (OCR lokal tesseract, gating role+configured) di StepTenantSelect check-in. Verifikasi final tetap tombol existing — AI tidak auto-verify.

### 2026-06-19 — G1: Owner Executive Brief

- **G1** POST /owner-ai/brief: service buildBriefSnapshot() query Prisma (rooms, overdue, pending, tickets, meter), generateBrief() dengan deepseekChat json:true, fallback rule-based. Tombol "Buat Brief AI" di OwnerDashboardPage dengan AiResultPanel.

### 2026-06-19 — G0: AI Safety Foundation

- **G0** deepseek.client.ts: upgrade model default ke deepseek-v4-flash, return type DeepseekChatResult (content+model+usage), opsi json:true+thinking, backward compat dengan market-analysis.
- Modul baru owner-ai/: controller status GET /owner-ai/status, service rate-limit+env guard, hash util stableHash.
- Frontend: 4 komponen AI (AiCostBadge, AiResultPanel, AiApprovalDrawer, AiSourceSnapshot), API getOwnerAiStatus().
- Env: tambah 9 var Fase G (AI_FEATURES_ENABLED, AI_MANUAL_ONLY, dll) di .env.production.example.


> Dipadatkan dari `docs/CHANGELOG.md`

### 2026-06-19 — docs(Fase G AI Owner/Admin): manual-only approval copilot
- Tambah `docs/M12_AI_OWNER_ADMIN.md` dan sinkron `CLAUDE.md`, `M01`-`M11`, `CODEMAP`: DeepSeek/API AI berbayar hanya lewat tombol manual Owner/Admin, output berupa draft/rekomendasi, aksi final tetap approval manusia, dengan guard token, PDP, fallback, dan audit `meta.ai`.
- Backlog Fase G G0-G9 disiapkan detail: safety foundation, owner brief, finance analyst, payment review, OCR expense/KTP, ops inventory, settings budget, FAQ/manual generator, dan optional `AiDraft` [SCHEMA] jika owner approve.

### 2026-06-19 — feat(Fase E Polish & Teknis): 6 task selesai — privacy UAT, split auto-ops & stays, integration test, E2E, evaluasi
- **E1b:** TEN-GAMIF privacy — verifikasi UAT ranking & leaderboard anonim; backend hanya expose kode kamar/poin/skor tanpa PII.
- **E3a:** Split `auto-ops.service.ts` (1.819→235 baris) — 5 sweep service (booking, stay, renewal, accounting, maintenance) + orchestrator.
- **E3b:** Split `stays.service.ts` — ekstrak 5 metode renewal ke `StaysRenewalService`; proxy via stays.service; renew-requests pakai StaysRenewalService langsung.
- **E3c:** Integration test skeleton `test/integration/stays-lifecycle.integration.test.js` (TC1 booking→huni→checkout hidup, TC2-4 placeholder) + script `test:integration`.
- **E3d:** E2E Playwright — `playwright.config.ts` + 3 spec (public-pages, booking-flow, tenant-portal) + script `test:e2e`.
- **E3e:** `docs/FASE_E_EVALUASI_ARSITEKTUR.md` — 4 item: refresh token MEDIUM, CSP LOW, WA/Email LOW, event bus VERY LOW.

### 2026-06-19 — feat(Fase B publik/tenant): aset publik & brosur owner-managed
- **Fase B 100%:** endpoint `marketing-assets` + tab Owner Settings "Aset Publik" mengelola hero, profil/galeri, spanduk, brosur depan/belakang; landing page memakai upload owner dengan fallback aset statis. Gate: BE `npx.cmd tsc --noEmit` PASS, FE `npm.cmd run build` PASS + PWA verify PASS.

### 2026-06-19 — feat(Fase F UI/UX Sweep): 10 task selesai — 404, toast, a11y, kontras, logout, search tenant, skeleton, login format
- **UX-404:** `NotFoundPage` + wildcard route di App.tsx untuk route tak dikenal.
- **UX-TOAST:** `ToastProvider` global dengan `useToast` hook + toast di SimpleCrudPage (create/update/delete).
- **UX-A11Y-PASSWORD:** Ganti emoji 👁/🙈 dengan SVG icon mata terbuka/tertutup, tambah `aria-label`.
- **UX-A11Y-SKIPLINK:** Skip-to-content link di AppLayout + CSS (muncul saat Tab), `id="main-content"`.
- **UX-COLOR:** `--text-muted` digelapkan `#64748b` → `#475569` di 01-base.css & 04-operations.css (WCAG AA).
- **UX-LOGOUT:** Konfirmasi `window.confirm` sebelum logout (staff + admin/owner).
- **UX-SEARCH-TENANT:** GlobalSearch dibuka untuk role TENANT (search invoice sendiri via `/me/invoices`), placeholder disesuaikan.
- **UX-SKELETON:** `StatCardSkeleton` width hardcoded → `100%` mengikuti container (cegah layout shift).
- **UX-OVERSCROLL:** Hapus `overscroll-behavior-y: none` — pull-to-refresh kembali di mobile.
- **UX-LOGIN-FORMAT:** Validasi format login tenant (email vs HP dengan regex).
- Gate: FE build PASS (0 error), PWA verify PASS.: header tanggal dipertahankan, tiap entry hanya menyimpan 1-2 poin outcome. Detail verbose tetap ada di source lama.

### 2026-06-19 — refactor(efisiensi AI/token): ekstrak helper MyStayPage
- `MyStayPage.tsx` 1028→902 baris; 15 helper murni (format/fasilitas/inventaris/harga kamar) → `frontend/src/pages/portal/myStayShared.tsx`. Komponen `ActiveStayContent` (stateful) tetap di file utama.
- Gate: FE `tsc` 0 + build PASS, chunk MyStayPage identik 35.91kB (0 perubahan perilaku). Sisa: monolit stateful (Tickets/Stays/AccountingSetup + backend jalur-uang) di-defer ke refactor per-task.

### 2026-06-19 — refactor(efisiensi AI/token): decompose PublicGuestDashboardPage
- `PublicGuestDashboardPage.tsx` 998→639 baris; helpers/konstanta + 5 komponen presentational (Lightbox/GuestTopbar/RoomPreviewCard/RoomPreviewSkeleton/GuestFooter) diekstrak ke `frontend/src/pages/public/publicGuestShared.tsx`.
- Gate: FE `tsc` 0 + build PASS (PWA verified), chunk ≈identik (0 perubahan perilaku).

### 2026-06-19 — refactor(efisiensi AI/token): decompose ReportsPage
- `ReportsPage.tsx` 732→289 baris; helpers + 21 komponen presentational (read-only laporan) diekstrak ke `frontend/src/pages/reports/reportShared.tsx` (pola mengikuti `dashboardShared.tsx`).
- Gate: FE `tsc` 0 + build PASS (PWA verified), chunk ReportsPage identik (0 perubahan perilaku). Catatan: TicketsPage/StaysPage/AccountingSetupPage = monolit stateful, ditunda (refactor per-task lebih aman).

### 2026-06-19 — refactor(efisiensi AI/token): bersih repo + split docs + CODEMAP + decompose DashboardAdmin
- **Repo:** untrack 32.8MB Prisma generated (`backend/src/generated/*`) dari git (sudah gitignore; regen via `prisma generate`); pindah `buku.md` (2.2MB) + `KOST48_Analisis_Bisnis_Total.pdf` (5.7MB) ke `reference/` (luar jalur baca AI) + read-guard di `CLAUDE.md`.
- **Docs:** split M10 → `docs/M11_CHANGELOG.md` (M10 126KB→90KB, changelog historis pindah ke sini); tambah `docs/CODEMAP.md` (peta modul→path→tanggung jawab + index 54 model + anchor flow) sebagai pintu navigasi kode hemat token.
- **Kode:** `DashboardAdmin.tsx` 915→522 baris (86→55KB); 5 workspace (Staff/Stays/Finance/Tickets/Rooms) diekstrak ke `frontend/src/pages/dashboard/AdminWorkspaces.tsx`. Gate: FE `tsc` 0 + build PASS, bundle chunk identik (0 perubahan perilaku).

### 2026-06-19 — audit(UI/UX full): temuan & prioritas perbaikan ditulis ke M07 + M10 Fase F
- Audit UI/UX menyeluruh (14 file CSS, 100+ komponen, 26 halaman): 1 critical (404 route), 1 high (toast global), 5 medium (aksesibilitas, kontras, keyboard, logout, focus trap), 6 low (polish).
- Temuan lengkap di `docs/M07_PUBLIK_GROWTH.md` → Audit UI/UX Full 2026-06-19.
- Task terstruktur di M10 Fase F: UX-404, UX-TOAST, UX-A11Y (password, skip-link, logout), UX-COLOR, UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT.

### 2026-06-19 — ui(Fase C polish): toggle segmented + divider topbar + breadcrumb root mode + bersih repo
- **OWN-TOGGLE-CSS:** `.owner-view-toggle` jadi segmented control (radius 12px, active putih+shadow, transisi 0.2s). **OWN-TOGGLE-LAYOUT:** `.owner-view-toggle-wrap` center + `.topbar-divider` kiri-kanan. **OWN-BREADCRUMB-MODE:** root hard-label "Kokpit Owner"/"Area Admin" sesuai mode.
- **Bersih repo:** hapus 14 file sampah `.reasonix/truncated-results/*` dari git + tambah `.reasonix/` ke `.gitignore`. Fase C kini benar-benar 100% (tanpa `[~]`).
- Gate: FE build 110 chunk, PWA verify PASS.

### 2026-06-19 — feat(FASE B-2): shell Inventaris terpadu /inventory + redirect route lama
- `InventoryShellPage` (route `/inventory`, OWNER/ADMIN) + `SegmentedTabs` 3 tab path-based: Gudang/Barang Kamar/Mutasi (nested routes render `ConfiguredResourcePage` dengan `hideAreaMenu`).
- Route lama `/inventory-items|/room-items|/inventory-movements` → `<Navigate>` ke tab shell; mutasi preservasi query (prefill ASSIGN/OUT/RETURN dari ResourceTable & SimpleCrudPage tetap jalan).
- Tautan OWNER/ADMIN diarahkan ke shell: sidebar activePaths, DashboardAdmin chips, RoleWorkspaceTabs match, areaMenu SimpleCrudPage, routeTitles. Keputusan owner: 3 tab.
- Gate: FE build 110 chunk, PWA verify PASS.

### 2026-06-19 — feat(OWN-BACKEND-MODE): header X-Owner-View-Mode + audit interceptor
- FE: `api/client.ts` interceptor kirim `X-Owner-View-Mode: owner|admin` saat key view-mode valid. Fix bentrok localStorage: density Kokpit Owner pindah ke key `kost48_owner_density` (sebelumnya tertimpa toggle owner/admin).
- BE: `OwnerViewModeInterceptor` global (sesudah RequestId) melampirkan `request.ownerViewMode` untuk guard/audit + log saat OWNER POST/PATCH/PUT/DELETE dalam mode admin. Tanpa ubah perilaku endpoint.
- Gate: backend `tsc --noEmit` 0 · FE build 109 chunk, PWA verify PASS.

### 2026-06-19 — refactor(OWN-ROLE-TABS-MODE): mode eksplisit di RoleWorkspaceTabs, buang hack role
- `RoleWorkspaceTabs` terima `role` asli + `ownerViewMode`; pilih tab set + base path internal (OWNER admin → `/admin-dashboard`, ADMIN → `/dashboard`). `AppLayout` tak lagi mengoper `role='ADMIN'` palsu / `adminDashboardPath`. aria-label ikut `isAdminView`.
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 — feat(OWN-STATUS-CARDS): strip status kokpit owner + regroup sidebar
- **Status Kokpit:** 4 kartu clickable di `OwnerDashboardPage` — okupansi (kpi), tunggakan (overdue+outstanding count+Rp), meter belum dicatat (best-effort `computeMeterDue`: stay aktif vs reading bulan terpilih), kesiapan go-live (`fetchAccountingReadiness` score/ready). Query readiness+meter best-effort (tak memblok dashboard, fallback "—").
- **Sidebar:** `ownerSections` diregroup jadi 2 grup besar "Operasional" vs "Keputusan Owner" (semua tautan dipertahankan).
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 — feat(OWN-ROUTE-SPLIT/GUARD): /admin-dashboard route nyata + mode owner ikut route
- **Split:** route baru `/admin-dashboard` (OWNER-only) di `App.tsx` me-render `DashboardAdmin`; hack render-inline di `AppLayout` dihapus → selalu `<Outlet/>`. Sidebar pakai `ownerAdminSections` (dashboard → `/admin-dashboard`), `RoleWorkspaceTabs` terima `adminDashboardPath`, chip internal `DashboardAdmin` pakai `dashboardBase` dinamis.
- **Guard:** kedua dashboard OWNER-only via `RequireRoles`; toggle owner kini `navigate()` antar route + `AppLayout` sinkronkan `ownerViewMode` dari pathname (URL langsung pun mode-aware). Title `/admin-dashboard` ditambah di `routeTitles`.
- Gate: FE build 109 chunk, PWA verify PASS.

### 2026-06-19 — ui(OWNER-VIEW mode-aware): sidebar/offcanvas/admin-action ikut mode + toggle mobile
- **Fase C cluster (5 item):** `SidebarContent` terima prop `ownerViewMode` → title/subtitle/footer & flag admin ikut mode (OWN-SIDEBAR-CONTEXT); `Offcanvas.Title` dinamis "Kokpit Owner"/"Area Admin (Owner)" (OWN-OFFCANVAS-TITLE); tombol "Pengumuman" muncul saat OWNER mode-admin (OWN-ADMIN-ICON-ACTION).
- **Mobile/transisi:** toggle Kokpit/Area Admin ditambah lebar-penuh di offcanvas + toggle topbar jadi desktop-only (OWN-TOGGLE-MOBILE); transisi 0.3s ease pada `.app-shell-grid`/`.app-sidebar`/`.app-main` (OWN-TOGGLE-TRANSITION).
- Gate: FE build 109 chunk, PWA verify PASS. Sisa Fase C: OWN-STATUS-CARDS, OWN-ROUTE-SPLIT/GUARD, OWN-BACKEND-MODE (opsional), FASE B-2 inventaris shell.

### 2026-06-19 — feat(schema-STF-GUDANG-2): FK inventoryItemId di RoomFacility + migration additive
- **Schema additive** (migration `20260618210000_stf_gudang2_facility_inventory_link`): `RoomFacility.inventoryItemId` (FK→InventoryItem, SET NULL), index, back-relation.
- **Service:** `loadFacilityCounts()` kini `groupBy inventoryItemId` (FK langsung), bukan fuzzy-name. `decorateInventoryItem()` terima `Map<number,number>`.
- **DTO:** `CreateRoomFacilityDto` + `UpdateRoomFacilityDto` tambah `inventoryItemId`. Admin/owner bisa tautkan fasilitas ke item gudang dari form kamar.
- Gate: BE tsc 0 · FE build 110 chunk · migration applied DB 5433 · seed 20 kipas.

### 2026-06-18 — feat(STF-METER-VIEW + STF-TIP-FLOW): dashboard meter staff + tip flow backend
- **STF-METER-VIEW [d-1]:** komponen `StaffMeterStatusPanel` — tabel per kamar status SUDAH/BELUM catat meter bulan ini + listrik/air/terakhir. Diintegrasikan ke `StaffMotivationDashboard`.
- **STF-THEME [d-2]:** CSS `staff-panel-card`, `staff-meter-table`, z-index mobile di route staff.
- **STF-TIP-FLOW [d-4]:** `tipShopeepay` ditambahkan ke User DTO (Create/Update) + service. Notif staff via `createOnce` saat tenant acknowledge tip. Endpoint `POST /tickets/:id/tip-confirm` (STAFF) konfirmasi Sudah/Belum masuk + notif balik ke tenant. Idempotency via `StaffPerformanceEvent TIP_CONFIRMED`.
- Status checklist M10: STF-METER-VIEW → `[x]`, STF-THEME → `[x]`, STF-TIP-FLOW → `[x]`.
- Gate: BE tsc 0, FE build 109 chunk (1555 module), PWA ok.

### 2026-06-18 — fix(PUB-CALENDAR-CSS): tambah stylesheet AvailabilityTimeline + settings-facility-actions
- **Audit AI:** komponen `AvailabilityTimeline.tsx` merujuk 20+ class CSS (`avcal-*`, `cell-*`) yang tidak ada di stylesheet manapun — tabel kalender tampil tanpa warna status, tanpa layout, tanpa scroll control.
- **Fix:** tambah 168 baris CSS di `11-public-pages.css` (shell, header, legend 4 warna status, table scroll horizontal, sticky header+room, weekend highlight, floor row, scroll controls, collapse, loading, mobile compact). Tambah `.settings-facility-actions` di `12-owner.css` (6 baris, flex row tombol upload/hapus foto fasilitas).
- Gate: FE build 109 chunk, PWA ok (CSS 108 KiB gzip).

### 2026-06-18 — feat(PUB-FOTO-PROFIL-KTP): avatar tenant dari foto KTP + kelola owner/admin
- **Keputusan owner (M02):** foto profil tenant diturunkan dari foto KTP pertama; owner/admin bisa ganti ulang; gambar dikompres.
- **Schema additive** (migration `20260618030000_tenant_profile_photo`): enum `ProfilePhotoSource {KTP_AUTO, MANUAL}` + field `profilePhoto*` di `Tenant`.
- **BE:** unggah KTP pertama otomatis menyalin file → `uploads/profile-photos/` dan set avatar `KTP_AUTO`; `POST/DELETE /tenants/:id/profile-photo` (OWNER/ADMIN ganti/hapus → `MANUAL`); `GET /tenants/:id/profile-photo/image` terproteksi (OWNER/ADMIN atau tenant **pemilik** saja). Avatar `KTP_AUTO` ikut terhapus saat KTP dihapus (UU PDP); avatar `MANUAL` tetap.
- **FE:** komponen `TenantAvatar` (foto + fallback inisial via `useAuthenticatedMediaUrl`) di topbar owner/tenant + workspace tenant; kartu `TenantProfilePhotoCard` (ganti/hapus, kompres 512px) di `StayDetailPage`; `profilePhotoUrl` ditambahkan ke `/tenant/profile`.
- Gate: BE build 0 · FE build 109 chunk, PWA ok · **UAT runtime LULUS 10/10** (auto-avatar 201, serve owner/tenant 200, tenant lihat avatar tenant lain 403, profile url terisi, re-upload MANUAL 201, hapus KTP→avatar MANUAL tetap / avatar KTP_AUTO terhapus).

### 2026-06-18 — fix(audit AI): facility photo URL/slug + ranking cleanliness + avatar KTP
- **PUB-FACILITY-PHOTO:** slug upload Settings disamakan dengan slug landing page; URL `/uploads/...` kini di-resolve ke backend/API origin; thumbnail fasilitas diberi dimensi stabil.
- **TEN-GAMIF:** ranking kebersihan memakai assignment aktif sebagai denominator (`doneCount/expectedCount`, `score%`), termasuk kamar yang belum dikerjakan, dan query `month/year` divalidasi.
- **PUB-FOTO-PROFIL-KTP:** auto-avatar dari KTP tidak gagal diam-diam lagi; response memberi warning bila turunan avatar gagal dan sukses mengembalikan tenant dengan avatar terbaru.
- Gate: BE `npx.cmd tsc --noEmit` PASS; FE `npx.cmd tsc -b --pretty false` PASS; FE `npm.cmd run build` PASS (rerun escalated karena sandbox Vite access denied).

### 2026-06-18 — feat(PUB-LAYANAN-MINAT): tenant ajukan minat layanan + proses admin/owner
- **Schema additive** (migration `20260618010000_service_interest`): model `ServiceInterest` (serviceId/tenantId/status `ServiceInterestStatus` PENDING·CONTACTED·DONE·CANCELLED/note/adminNote) + relasi cascade ke `AdditionalService`+`Tenant`.
- **BE:** `POST /additional-services/:id/interest` (TENANT, dedupe PENDING agar tak dobel) + `GET /my-interests` (TENANT) + `GET /interests` & `PATCH /interests/:id` (OWNER/ADMIN). Tiap minat baru bikin notif `createOnce` ke semua admin/owner (linkTo `/service-interests`).
- **FE tenant:** tombol "🙋 Saya Minat" per layanan di portlet MyStayPage (konfirmasi tarif, badge "Sudah diminati" bila PENDING).
- **FE admin/owner:** halaman `/service-interests` (tab PENDING/CONTACTED/DONE/Semua + aksi Tandai Dihubungi/Selesai/Batalkan) + nav owner Pengaturan.
- Gate: BE build 0 · FE build 108 chunk, PWA ok · **UAT runtime LULUS** (tenant create 201, dedupe→id sama, admin list+proses CONTACTED 200, tenant→route admin 403, notif owner+admin terbuat).

### 2026-06-18 -- feat(PUB-METER-JADWAL): status meter bulan ini di portal tenant
- **BE:** `GET /meter-readings` kini mengizinkan TENANT membaca meter hanya untuk kamar aktifnya; query `roomId` lain ditolak.
- **FE:** `/portal/stay` menampilkan jendela catat meter bulan ini, status sudah/belum, catatan terakhir, dan CTA catat meter.
- Gate: BE `npx.cmd tsc --noEmit` PASS; FE `npx.cmd tsc -b` PASS; FE `npm.cmd run build` PASS (rerun escalated karena sandbox Vite access denied).

### 2026-06-18 — feat(TEN-GAMIF): ranking kebersihan depan kamar bulanan (backend + frontend)
- **TEN-GAMIF:** backend `GET /public/rooms/cleanliness-ranking?month&year` — hitung skor per kamar dari `StaffRoutineCompletion` dengan template area `CLEANING` per bulan.
- **Frontend:** kartu "🧹 Ranking Kebersihan Bulan Ini" di `MyLoyaltyPage` — medali 🥇🥈🥉, anonim per kode kamar.
- Gate: BE build 0 · FE build 109 chunk, PWA ok.

### 2026-06-18 — feat(PUB-FACILITY-PHOTO): upload foto fasilitas publik + tampil di landing page
- **PUB-FACILITY-PHOTO:** Backend `POST /facility-images/upload/:slug` (OWNER/ADMIN, file JPG/PNG/WebP, max 2MB) + `GET /facility-images` (publik) + `DELETE /facility-images/:slug`.
- **Service:** `FacilityImagesService` — simpan file ke `uploads/room-images/facilities/{slug}.{ext}`, tanpa perubahan schema.
- **Settings:** tab baru "Foto Fasilitas" di OwnerSettingsPage (`FacilityPhotoPanel`) — grid upload/ganti/hapus per slug.
- **Landing page:** `PublicGuestDashboardPage` — fetch foto real dari API, tampilkan gambar bila ada, fallback emoji bila belum.
- Gate: BE build 0 · FE build 109 chunk, PWA ok.

### 2026-06-18 — feat(PUB-CALENDAR): availability calendar timeline horizontal (backend + frontend)
- **PUB-CALENDAR:** backend `GET /public/rooms/availability-calendar?from&to` — grid per kamar per tanggal (KOSONG/BOOKING_DP/HUNI/MAINTENANCE). Logic: stay ACTIVE + room status → status per hari.
- **Frontend:** `AvailabilityTimeline.tsx` — tabel horizontal scrollable, group per lantai, legend warna, collapse/expand, loading/empty state.
- **Integrasi:** ditampilkan di `PublicRoomsPage` setelah grid kamar + pagination.
- DTO: `AvailabilityCalendarQueryDto` (from, to opsional, default 2 minggu, clamp 62 hari).
- Gate: BE build 0 · FE build 108 chunk, PWA ok.

### 2026-06-18 — feat(PUB-SMART-BOOKING): filter ketersediaan kamar publik by checkIn+durationDays
- **PUB-SMART-BOOKING:** API `GET /public/rooms?checkIn=YYYY-MM-DD&durationDays=N` — filter kamar yang available di seluruh rentang (tanpa overlapping active stay).
- **DTO:** tambah field `checkIn`+`durationDays` di kedua `PublicRoomsQueryDto` (marketing + tenant-bookings).
- **Service:** `MarketingPublicRoomsService.buildPublicRoomWhere()` — tambah kondisi `stays: { none: { status: ACTIVE, checkInDate: { lt: endDate }, OR: [plannedCheckOutDate: null, plannedCheckOutDate: { gt: checkInDate }] } }`.
- Gate: BE build 0 (tsc PASS).

### 2026-06-18 — docs(checklist audit): sinkron status M10 vs kode
- **PUB-LAYANAN-MINAT:** dicatat selesai fungsional berdasarkan kode `ServiceInterest` + API + tenant button + halaman admin/owner proses minat. Sisa polish: native `window.confirm` → modal custom bila diminta.
- **MKT-5:** ditutup fungsional; renewal sudah punya copy meter dan cross-sell add-on opsional yang tidak memblokir flow.
- **Parsial ditandai `[~]`:** owner toggle phase-2, foto/brosur, meter schedule/staff view, staff role/wifi, tip flow, dan beberapa item audit visual.

### 2026-06-18 — fix(go-live hardening dari audit): test 55/55 + camera CSP (OCR) + HSTS
- **Test 54/55 → 55/55:** mock `ticket-number.test.js` pakai `$executeRaw` (bukan `$queryRaw`) sesuai advisory-lock F2-5. Bukan bug produksi, tapi suite kini hijau penuh.
- **DEEP-02:** `Permissions-Policy: camera=(self)` agar OCR KTP (PUB-KTP-OCR/Tesseract) tak terblok; mic & geo tetap diblok.
- **DEEP-03:** header `Strict-Transport-Security` (HSTS) ditambah — **hanya di produksi** (HTTPS), tidak di dev.
- **DEEP-01:** `@@index([token])` ditambahkan di schema + migration `20260618020000`. Redundan (@unique sudah bikin unique index PG) tapi tidak merusak — index eksplisit tidak mengurangi performa.
- Gate: BE build 0 · unit test **55/55** hijau.

### 2026-06-18 — fix(audit post-fix DEEP-04/05): konsolidasi duplikat + refactor auth helper
- **DEEP-04:** konsolidasi `lockApprovalBookingTx` — source of truth di `tenant-bookings.queries.ts`, hapus dari `tenant-bookings-helpers.ts`. tsc 0, 55/55 test PASS.
- **DEEP-05:** refactor `findUserForLogin` + `findUserForForgotPassword` → satu helper `findUserByEmailOrPhone(identifier, normalizedPhone, { includeExtraPhoneVariants? })`. Perilaku kedua method TETAP — login coba varian HP lebih banyak, forgot-password varian minimal. tsc 0, 55/55 test PASS.
- **NEW:** `backend/.env.production.example` — 55+ env vars lengkap (Wajib, VAPID, KTP gate, Brevo, DeepSeek, auto-ops, akuntansi, loyalty points, rate limit, deadline).
- **NEW:** `backend/scripts/change-owner-password.ts` — overwrite password OWNER via Prisma+bcrypt. Idempoten, pass dari env `OWNER_NEW_PASSWORD` atau prompt. JWT lama invalid otomatis (guard pwdAt).

### 2026-06-18 — ui(owner-dashboard): toggle tampilan Ringkas/Lengkap + persist localStorage
- **OwnerDashboardPage:** tombol toggle "📋 Ringkas" / "📊 Lengkap" di toolbar, sebelah "Buka laporan".
- **useOwnerViewMode hook:** baca localStorage `kost48_owner_view_mode`; default mobile ≤834px = compact; override manual tersimpan.
- **Compact mode sembunyikan:** panel tren chart + panel AI analysis via CSS class `owner-view-compact`.
- **FE:** `12-owner.css` — style toggle button (pill-style, active dark bg) + compact hide rules.
- Gate: FE build 108 chunk, PWA ok (gzip: 146 KiB JS, 107 KiB CSS).

### 2026-06-18 — ui(layout): sidebar collapsible (ikon-only) + breadcrumb + hamburger toggle
- **AppLayout.tsx:** state `sidebarCollapsed` + localStorage persist; class `sidebar-collapsed` di aside + grid.
- **SidebarContent:** saat collapsed — hanya ikon link yang tampil, teks/brand/context-card disembunyikan via CSS.
- **Toggle button:** lingkaran kecil di tepi kanan sidebar (◀ / ▶) + ikon hamburger ☰ di topbar (mobile).
- **CSS:** `02-layout.css` — `.app-shell-grid.sidebar-collapsed` (grid 60px + transisi 0.25s), `.sidebar-collapse-toggle` (toggle button bulat).
- **CSS:** `10-misc.css` — `.sidebar-collapsed` hide rules (sembunyikan brand-title, label, arrow, context-card, section-toggle, footer).
- **Breadcrumb:** sudah ada (`getBreadcrumbParts` + `app-topbar-breadcrumb`) — memakai React Router `pathname`.
- Gate: FE build 108 chunk, PWA ok (CSS +1 KiB gzip).

### 2026-06-18 — feat(PUB-LAYANAN-TAMBAHAN 🧬): layanan tambahan + tarif (admin CRUD + portlet tenant)
- Schema additive (owner-approved, migration `20260618000000_additional_services`): model `AdditionalService` (name/description/priceRupiah/unit/isActive/sortOrder).
- BE: modul `additional-services` — CRUD mutasi **OWNER-only** (D-17), `GET /active` semua role.
- FE: resource admin "Layanan Tambahan" (config-driven + route /additional-services + nav owner Pengaturan) + portlet tenant di MyStayPage (daftar layanan + estimasi tarif).
- Gate: BE tsc 0 · FE build (106 chunk, PWA ok) · **UAT runtime LULUS** (owner create 201, admin 403, tenant lihat Galon/TV + tarif). Catatan lama "PUB-LAYANAN-MINAT ditunda" sudah superseded oleh audit checklist 2026-06-18.

### 2026-06-18 — feat(PUB-CALENDAR-CHECKOUT): badge "Perkiraan kosong [tgl]" katalog publik
- Keputusan owner: proyeksi kamar kosong hanya untuk (a) checkout-request APPROVED, atau (b) stay jangka pendek (harian/mingguan/2-mingguan, sering tak perpanjang). TIDAK menebak dari kontrak bulanan.
- BE: `getProjectedAvailabilityByRoomId` + `projectedAvailableDate`/`projectedAvailableReason` di public rooms API (list+detail). FE: badge "🗓️ Perkiraan kosong [tgl]" di kartu kamar terisi + `PublicRoom` type.
- Gate: BE tsc 0 · FE build (106 chunk, PWA ok) · UAT runtime (stay WEEKLY → projection 2026-06-27 muncul).

### 2026-06-17 — feat(TEN-PROFILE-NOTIF): badge "Lengkapi Profil" portal tenant
- `GET /tenant/profile/completeness` (reuse `buildCompletionSummary`, 7 field onboarding) + badge "📋 Lengkapi profil (X%)" di MyStayPage (list field kurang + tombol /portal/profile).
- Gate: BE tsc 0 · FE build (106 chunk, PWA ok) · UAT runtime endpoint OK.

### 2026-06-17 — feat(PUB-KTP-OCR): pindai KTP offline isi Nama+NIK otomatis
- `tesseract.js` (owner-approved) **lazy-load** di GuestBookingForm — tombol "📷 Pindai KTP"; OCR diproses **di perangkat** (foto tak diunggah, privasi PDP). `parseKtpText` ekstrak NIK 16 digit + Nama → isi field (user wajib periksa/koreksi).
- Bundle utama TIDAK bertambah (chunk dinamis terpisah, WASM/lang dari CDN saat dipakai). Gate: FE build (106 chunk, PWA ok).

### 2026-06-17 — feat(PUB-UI-REVAMP batch cepat): booking-info, KTP opsional, label saran
- **PUB-BOOKING-INFO**: teks "Belum punya akun? Booking kamar dulu" di LoginPage.
- **PUB-BOOKING-FORM** (partial): KTP/NIK **opsional** saat booking (format dicek hanya bila diisi). phone-XOR-email ditunda (auto-akun portal butuh email).
- **STF-SARAN-LABEL**: "Kirim via Laporan" → "Kirim Saran" (MyStayPage).
- Gate: FE build (105 chunk, PWA ok).

### 2026-06-17 — feat(PUB-UI-REVAMP Fase E): filter ulasan Terbaru/Rating Tertinggi
- **PUB-REVIEWS** sudah ada (F3-4 social-proof + Maps iframe di #lokasi). **PUB-REVIEWS-FILTER**: tab Terbaru/Rating Tertinggi (client-side sort, maks 10); pool review backend 6→12.
- Gate: FE build (105 chunk, PWA ok) · BE tsc 0.

### 2026-06-17 — feat(PUB-ROOM-CATEGORY 🧬): kategori & tipe kamar (badge + filter)
- **Schema additive** (owner-approved, migration `20260617000000_pub_room_category`): enum `RoomCategory` (ECONOMY/STANDARD/DELUXE) + `RoomType` (REGULAR/MEZZANINE), `Room.category`/`roomType` default STANDARD/REGULAR.
- **Backend:** DTO owner set kategori/tipe (`...dto` passthrough); public rooms API expose `category`/`roomType`.
- **Frontend:** badge kategori di kartu katalog (💎 Deluxe / 🛋️ Standar / 🏷️ Ekonomi + tag Mezzanine) + filter kategori (client-side); kolom "Kategori" + select di form admin kamar.
- **Gate:** backend tsc 0 · FE build (105 chunk, PWA ok) · **UAT runtime LULUS** (owner set K-A → DELUXE/MEZZANINE → tampil di `/public/rooms`).

### 2026-06-17 — feat(PUB-UI-REVAMP Fase C frontend): badge/tombol status + ikon fasilitas (ca54397)
- **PUB-BADGE-STATUS** warna badge per status (hijau/kuning/merah/abu, selaras ikon) · **PUB-BTN-COLOR** "Tanya" outline saat tak bisa booking, "Ajukan Booking" primary +📝 · **PUB-FACILITY-SHOW** ikon fasilitas di chip kartu.
- **Keputusan owner:** foto kamar tetap **4:3** (PUB-PHOTO-RATIO); **PUB-CARD-RESPONSIVE** sudah 4/2/1 (tanpa ubah). Approved untuk increment lain: schema `Room.category` (PUB-ROOM-CATEGORY) + npm `tesseract.js` (PUB-KTP-OCR).
- Gate: FE build hijau (105 chunk, PWA ok).

### 2026-06-17 — feat(PUB-UI-REVAMP Fase A): ikon publik + audit CTA (cf4c63c)
- **PUB-REMOVE-PREF** hapus tombol "Ubah Preferensi Tinggal"; **PUB-CTA-AUDIT** prominent "Cek Kamar Tersedia" tinggal 2 (hero + sticky navbar), CTA penutup di-relabel.
- **PUB-ICON** (emoji + aria-hidden, tanpa lib): nav links, CTA, mark fasilitas (🅿️🍳❄️🚿📶…), badge status per tone (🟢🟡🔴🧹).
- Gate: FE build (105 chunk, PWA ok) · sweep Playwright 30 cek 0 overflow (publik 390/834/1440).

### 2026-06-17 — feat(AUDIT-OWNER + CSS+SWEEP): polish UI stabilitas lintas role (app-wide)
- **AUDIT-OWNER** (`ff415f5`): `document.title` per-rute (`useDocumentTitle` + `routeTitles` + `RouteTitleSync`); skeleton ganti full-page spinner (`PageLoadingSkeleton` di App Suspense/Rooms/Reports/OwnerDashboard); foto OwnerSettings lewat `SafeImage`; dropdown notif width responsif (anti-overflow ≤390px); hapus dead-code "Laporan Formal" di ReportsPage (2 API mubazir); a11y emoji dekoratif `aria-hidden`.
- **CSS+SWEEP**: `02-layout.css` jadi sumber tunggal `.app-shell`/`.app-shell-grid` (buang rule mati/duplikat di 01-base/09-finance/10-misc, behavior-preserving; print override tetap di 03-components).
- **Gate:** FE build hijau (105 chunk, PWA ok) · **sweep Playwright 30 cek (5 role × 390/834/1440) = 0 overflow** + judul tab terverifikasi live. ⚠️ Guest `/rooms`→beranda menunggu konfirmasi owner.

### 2026-06-17 — feat(METER M-5): checkout meter final × deposit jaminan + copy marketing
- **Backend:** `complete()` izinkan tagihan meter (listrik/air, semua baris ELECTRICITY/WATER) tetap OPEN saat checkout + gate WAJIB catat meter listrik final (catatan tertanggal ≥ hari checkout, 409 bila belum); tagihan NON-meter tetap memblokir. `processDeposit` → `settleDepositAgainstMeterTx`: deposit menutup tagihan meter (DR 2000 / CR 1100 via jurnal forced-checkout F3-16), sisa refund kas, kekurangan TETAP piutang AR; GUC carve-out `app.allow_deposit_with_open_invoices`. Helper `isMeterInvoice`/`invoiceRemainingRupiah`/`computeMeterDepositSettlement` + unit test 8/8.
- **Frontend:** `ProcessDepositModal` mode meter (breakdown deposit/tagihan/dipotong/dikembalikan/shortfall, otomatis), `checkoutReadiness.ts` (tagihan meter non-blocking), copy publik pascabayar (FAQ + trust item "Listrik transparan, bukan token").
- **Finance gate LULUS:** tsc 0 · unit test 8/8 · FE build (106 chunk, PWA ok) · **UAT runtime DB 5433**: deposit cukup/kurang/nol — TB seimbang tiap langkah, akun 2000 turun tepat 1.5jt, gate tolak checkout tanpa meter final.

### 2026-06-17 — feat(MKT-4): CAC/CLV lite dashboard — DeepSeek V4 Pro powered + offline fallback
- **Backend:** `GET /market-analysis/cac-clv` — agregat booking per kanal, konversi, renewal rate, retensi, estimasi CLV, referral, loyalty. Query via Prisma `$queryRaw` dari tabel Stay/RenewRequest/TenantReferral/LoyaltyPoint/Redemption.
- **Backend:** `POST /market-analysis/cac-clv/analyze` — kirim snapshot ke DeepSeek V4 Pro, ekstrak JSON insight CAC/CLV. Fallback offline bila AI gagal/tidak terkonfigurasi.
- **Frontend:** `CacClvDashboard.tsx` — metrik card (Total Booking, Konversi, Renewal, CLV), HorizontalBarChart per kanal, tabel detail kanal, kartu Retensi/Referral/Loyalitas, dan AI Insight section.
- **Frontend:** `MarketAnalysisPage.tsx` — tab toggle baru: "Analisa SWOT/PESTLE" ↔ "CAC/CLV Dashboard". CAC/CLV query lazy hanya saat tab aktif.
- **API types:** `CacClvSnapshot`, `CacClvChannel`, `CacClvAnalyzeResult` + fungsi `getCacClvSnapshot()`, `analyzeCacClv()`.
- **Gate:** backend tsc 0 ✅, frontend build 106 chunks ✅, PWA verify ✅.
- Lihat `docs/M10_CHECKLIST_CHANGELOG.md` → MKT-4 ✅.

### 2026-06-16 — docs: rapikan checklist AI eksekutor (M10 antrian + sinkron selesai)
- `M10_CHECKLIST_CHANGELOG.md`: pintu masuk AI (M-file, urutan kerja, gate); centang F3-3/AUD-7/AUD-8/L-2; sesi 16 Jun terstruktur; **ANTRIAN EKSEKUSI** dengan anchor grep, sub-task, UAT per task terbuka.
- `M06_OPERASIONAL.md`: status M-3/M-4 selesai, M-5 → antrian M10.

### 2026-06-16 — Walkthrough UI/UX (owner+staf+tenant+publik) + penyatuan modul (Fase A/B-1) + Meter M-1
- Sesi UI/UX menyeluruh berbasis review owner + verifikasi screenshot Playwright (`ui-shots/`, tidak di-commit).
- **Responsif & publik:** fix bug app-shell (konten mepet kiri <1200px, override `10-misc` menutup collapse `02-layout`) — global semua role; login (subtitle d...

### 2026-06-15 — Pasca-Fase 5: hardening + sinkron docs (L-4, SINKRON-DOC, AUD-6, L-3)
- Lanjutan tindak-lanjut audit setelah Fase 5 inti:
- **L-4 (go-live):** runbook `04_DEPLOY` mewajibkan `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (default OFF; tanpa ini kamar bisa aktif tanpa KTP terverifi...

### 2026-06-15 — FASE 5 (tindak-lanjut audit menyeluruh): S-5 + F5-1..F5-8 — SELESAI
- **S-5 schema additive** (owner-approve, migration `20260615140000_s5_ac_usage_vendor`): `Room.acUsageHoursPerDay`, `Ticket.handledByVendor`/`vendorNote`.
- **F5-1 (AUD-4) FAQ operasional:** seed FAQ dari aturan/flow (Pembayaran/Booking/Perpanjangan/Checkout&Deposit/KTP/Keluhan&Poin); `seed()` idempoten per-perta...

### 2026-06-15 — feat(F2-10 + F3-5): round-robin tiket + leaderboard staf (disiapkan, dorman saat 1 staf)
- **Ide owner:** siapkan round-robin & leaderboard meski staf masih 1; aktif otomatis saat staf ≥ 2. **Tanpa schema baru.**
- **F2-10 round-robin** (K-4): `TicketsService.pickStaffAssigneeTx` dipakai di `createTicketRecord` saat tiket belum ber-assignee — staf=0 → tanpa assignee; st...

### 2026-06-15 — feat(F4-13c + F4-13 referral): quest perbaikan sikap anonim + referral teman (S-4)
- **Schema additive S-4** (owner-approve, migration `20260615130000_f4_s4_peer_referral`): `PeerBehaviorReport` + enum `PeerReportStatus`; `TenantReferral` + e...
- **F4-13c quest perbaikan sikap (ANONIM):** A lapor B → admin moderasi (`ACKNOWLEDGE` → notif B **tanpa identitas A** / `DISMISS`) → B `markImproved` → konfir...

### 2026-06-15 — feat(F4-11 deep): prabayar/perpanjangan multi-bulan + unearned (PSAK 72) — SELESAI
- **`PrepayExtensionService.prepayExtension`** (`POST /stays/:id/prepay-extension`, OWNER/ADMIN): tenant membayar **N bulan ke depan dengan harga BULANAN** (te...
- **Akuntansi PSAK 72:** jurnal issuance (DR 1100 / CR 4000) + payment (DR kas / CR 1100) + **deferral seluruh prabayar (DR 4000 / CR 2200 Unearned)**; lalu sw...

### 2026-06-15 — feat(backlog S-3): F4-11/12/13a/13b/14/15 — implementasi backlog ide owner
- **Schema additive S-3** (owner-approve, migration `20260615120000_f4_backlog_s3`): Room (hasAc/acWattage/acLastCleanedAt/acCleanIntervalDays), LoyaltyReward...
- **F4-12 FAQ/manual** (tanpa schema): `MyManualPage` (`/portal/manual`) menampilkan FAQ publik per kategori (Accordion ringkas) — manual book aturan kos untuk...

### 2026-06-15 — feat(F4-9): Gamifikasi & Loyalitas tenant — SELESAI (schema S-2, dossier 19)
- **Schema additive (S-2):** `LoyaltyPoint` (ledger append-only, unique sourceType+sourceId) + `LoyaltyReward` (katalog) + `Redemption` (penukaran, wajib appro...
- **Poin (default dossier 19, env-override):** `LoyaltyService.award/earn/earnSafe` (idempotent per sourceType+sourceId), `balance`, `history`. **4 trigger ear...

### 2026-06-15 — feat(F4-8): Pindah kamar resmi (E4) — SELESAI, schema S-2 + 5 keputusan desain owner
- **Keputusan desain owner (D-20, 2026-06-15):** Stay **SAMA** (roomId diperbarui, tak putus kontrak); **deposit ikut apa adanya**; **harga dikunci** (rent-loy...
- **Schema additive (S-2):** `RoomTransfer` (stayId, fromRoomId, toRoomId, transferDate, reason, rentBefore/AfterRupiah, note, createdById) + back-rel Stay/Roo...

### 2026-06-15 — feat(F4-1): Unearned Revenue PSAK 72 (F-15) — SELESAI, schema S-2 approved
- **Kebijakan (keputusan owner):** sewa yang mencakup **>1 bulan** diakui pendapatan **bertahap** (straight-line per bulan), bukan sekaligus saat check-in. **I...
- **Schema additive (S-2):** `RentRecognitionSchedule` (stayId, periodIndex, periodStart/End, scheduledAmountRupiah, recognizedAt, journalEntryId; unique stayI...

### 2026-06-15 — feat(F4-2): PWA Web Push (4 kelompok event J-d) — SELESAI, schema S-2 approved
- **Schema additive (owner-approve S-2):** `PushSubscription` (endpoint unik/device) + enum `PushDeliveryStatus` + `AppNotification.pushStatus/pushAttempts/pus...
- **Backend `PushModule`:** `GET /push/vapid-public-key`, `POST /push/subscribe` (upsert by endpoint), `POST /push/unsubscribe` (deactivate). `PushService` bac...

### 2026-06-14 — fix(F4-10): standarisasi pembulatan Rupiah (F-31) — helper terpusat
- **Masalah (F-31):** pembulatan Rupiah tersebar (`Math.round` mentah di util/DP/depresiasi/revenue-per-kamar + helper `rupiah` duplikat di modul akuntansi) →...
- **Helper terpusat baru** `backend/src/common/business/money.helper.ts`: `roundRupiah(v)` (bilangan bulat terdekat; tie tepat 0,5 dibulatkan MENJAUHI nol agar...

### 2026-06-14 — ops(F4-7): pruning notifikasi >90 hari (N-04) — retensi AppNotification
- **Masalah (N-04):** `AppNotification` tak punya retensi → tumbuh tanpa batas, terutama untuk broadcast ALL ke banyak penerima.
- **Solusi:** `AppNotificationService.pruneOlderThan(retentionDays=90, batchLimit=5000)` menghapus notifikasi `createdAt < now − retensi`, dibatasi per-batch (...

### 2026-06-14 — chore(migration): migration resmi F3 additive + dukungan shadow DB
- **Migration baru** `prisma/migrations/20260614210000_f3_admin_safety/migration.sql` — additive untuk F3-14/15/17/19: enum `BelongingsStatus`; `Tenant.ktp*` (...
- **Divalidasi vs DB UAT live:** seluruh 18 kolom + enum + 3 index + 2 FK ADA dengan nama/tipe/default PERSIS sesuai migration → file akurat & lengkap.

### 2026-06-14 — feat(F3-14/F3-16): forced-checkout admin (kabur/overstay) + deposit→AR (SELESAI, UAT LULUS)
- **Gabung F3-14+F3-16 (keputusan owner):** satu endpoint `POST /stays/:id/forced-checkout` (OWNER) beralasan `OVERSTAY_NUNGGAK`/`TENANT_KABUR`.
- **Akuntansi (disetujui owner):** deposit menutup tunggakan → jurnal **DR 2000 / CR 1100** (`postForcedCheckoutDepositSettlementTx`, BEDA dari settlement dama...

### 2026-06-14 — ui(F3-9): hierarki laporan — badge Formal/Estimasi
- **Badge tier (F-11):** `ReportSection` kini menandai setiap kartu laporan operasional dengan badge **≈ Estimasi** (default) — angka dihitung mentah dari data...
- **Banner hierarki:** ReportsPage menambah catatan tetap yang menjelaskan tab operasional = Estimasi, dan mengarahkan ke tab **"Laporan Formal"** (sudah ada:...

### 2026-06-14 — feat(F3-17): upload + verifikasi KTP (terproteksi, gate aktivasi, hapus PDP)
- **Schema (approved):** `Tenant.ktpImage*` (url/fileKey/originalFilename/mimeType/fileSizeBytes) + `ktpVerifiedAt/ktpVerifiedById` + `ktpDeletedAt`.
- **Upload:** `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, multer + validasi MIME signature, simpan di `uploads/ktp-images` terpisah dari foto kamar/tiket). Up...

### 2026-06-14 — feat(F3-15): lacak barang ditinggal 30 hari → ABANDONED
- **Schema (approved):** `Stay.belongingsStatus` (enum `BelongingsStatus PENDING/CLAIMED/ABANDONED`, default PENDING), `belongingsDeadline`, `belongingsResolve...
- **Set deadline:** checkout final (`stays.complete`) dan forced-checkout overstay (`auto-ops.forceCheckoutOverstay`) men-set `belongingsDeadline = checkout +...

### 2026-06-14 — feat(F3-19): SLA tiket — dueAt per kategori, resolved-time adil, eskalasi
- **Schema (approved):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt` + index `dueAt`.
- **SLA per kategori (`ticket-sla.ts`):** `dueAt = assignedAt + window` — **24 jam** EMERGENCY/SECURITY/KUNCI · **3 hari** KERUSAKAN/MAINTENANCE/KEBERSIHAN/CHE...

### 2026-06-14 — ops(F3-13): hardening checkout/notif (B-06/B-07/B-11/B-12/B-14/N-02) SELESAI
- **B-07 (D-03):** forced-checkout overstay tak lagi diblokir tagihan **DRAFT** (belum terbit, tanpa jurnal). `forceCheckoutOverstay` mengecualikan DRAFT dari...
- **B-12:** `stays.update` menolak `plannedCheckOutDate` di masa lalu (WIB) — mencegah admin tak sengaja menjadikan stay target overstay/forced-checkout instan...

### 2026-06-14 — refactor(F3-11): lead source + katalog foto marketing ke config
- **M-08 lead source:** sudah lengkap di kode — check-in wizard admin punya dropdown `bookingSource` 10 kanal (Google Maps/Walk-in/Referral/Instagram/TikTok/Wh...
- **M-04 foto config:** ~76 nama berkas foto marketing dipindah dari `marketing-public-rooms.service.ts` ke `marketing/marketing-room-images.config.ts` (`ROOM_...

### 2026-06-14 — ops(F3-10): higiene jurnal — idempoten anti-race P2002 di posting
- **Race P2002 (utama):** `accounting-posting.service` membungkus 7 entrypoint posting ber-transaksi-sendiri (invoice issued/payment, expense, wifi-sale, depos...
- **entryNumber suffix VOID:** _tidak berlaku pada kode saat ini_ — tidak ada jalur `journalEntry` → status `VOID` (reversal selalu membuat entry `ADJUSTMENT`...

### 2026-06-14 — audit-fix(Fase 1/2): checklist dibuktikan ulang terhadap kode
- **Renewal:** menutup celah kritis approval sebelum lunas. DP PAID kini hanya mengamankan prioritas; admin menerbitkan invoice pelunasan setelah catat meter;...
- **Cashflow:** classifier menyimpan gross inflow/outflow terpisah per sumber sehingga transaksi dua arah tidak saling menutup.

### 2026-06-14 — ui(F3-12): paket chart — palet Okabe-Ito, count risiko n<5, kontras donut, filter publik
- **V-5:** palet Okabe-Ito colorblind-safe terpusat (`frontend/src/components/charts/chartPalette.ts`) dipakai `SmartChartPanel`, `HorizontalBarChart`, `DonutG...
- **V-2:** donut "Level Risiko" di review pembayaran berubah jadi tampilan hitungan saat sampel kecil (n<5) — 1 bukti high-risk tak lagi terbaca sebagai lingka...

### 2026-06-14 — feat(F3-1): coverage notifikasi operasional (assign, room-ready, K-6/K-8)
- **Ticket-assign → assignee:** `tickets.service.assign()` mengirim notif ke penerima tugas (best-effort, di luar audit) hanya saat assignee benar-benar beruba...
- **K-6/K-8 BARANG_PINDAH:** notif tiket pindah barang yang ditutup kini menuju **staf assignee** (sebelumnya keliru ke `actor.id` = admin penutup) dan dipinda...

### 2026-06-14 — ops(F1-11): verifikasi booking expiry 3 jam flat
- Kedua helper booking (`expireBookingTx` di `auto-ops.service.ts` dan `cancelCompetingUnpaidBookingsTx` di `payment-submissions.service.ts`) memakai konstanta...
- **Verifikasi:** `grep` konfirmasi kedua helper pakai konstanta sama; tidak ada kode baru.

### 2026-06-14 — F3-2/F3-20: inbox pembayaran dan prompt review
- Payment submission yang berhasil commit kini mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif, lengkap dengan tenant, nominal, invoice, kamar, dan deep-lin...
- Tiket tenant ber-assignee STAFF kini mengirim ajakan review saat masuk DONE/CLOSED; pemanggilan ulang pada close aman karena dedupe.

### 2026-06-14 — Fase 3 independen: visibilitas dan otomasi operasional
- Menambahkan SEO dasar guest page: metadata, OpenGraph/Twitter Card, canonical, JSON-LD, `robots.txt`, dan `sitemap.xml`. Implementasi lulus build; skor Light...
- Menambahkan social proof publik dengan pembatasan privasi, agregat rating, ulasan visible terbaru, dan count penghuni aktif.

### 2026-06-14 — feat(F2-18): gate verifikasi owner utk review tenant ≤2 (F2-18 SELESAI)
- Owner: `GET /tenant/staff-reviews/pending-verification` + `POST /:id/verify {decision: APPROVE→VISIBLE | DISMISS→HIDDEN}` (OWNER-only, set `moderatedById`)....
- **UAT runtime:** rating-2 → PENDING_VERIFICATION; owner list memuatnya; ADMIN verify → 403; owner APPROVE → VISIBLE; re-verify → 409. `tsc` 0. → **F2-18 SELE...

### 2026-06-14 — test(F2-6): UAT cancel stay promoted → MAINTENANCE + tiket inspeksi (F2-6 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — ui(F2-11): paginasi 12 + skeleton katalog publik → F2-11 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — refactor(F2-5): satukan generateTicketNumber (4 salinan → 1 util) → F2-5 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — fix(F2-14): staff-routines startOfLocalDate → WIB (F2-14 SELESAI)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — docs(F2-1): sinkron dossier 11 dgn keputusan owner hibrida → F2-1 SELESAI
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — feat(F2-2/#3): prompt renewal H-10 + fallback admin tenant tanpa portal
- **UAT runtime:** stay di H-10 → notif tenant "berakhir 10 hari lagi"; tenant non-portal → notif 3 admin "Tenant tanpa portal"; data uji dipulihkan. `tsc` 0....

### 2026-06-14 — feat(F2-1 R3): gate deadline renewal di command service
- Tindak lanjut audit (deadline hanya digate sweeper): `renew-requests.service` kini menegakkan deadline di tingkat command (deterministik):
- **`confirmDownPayment`** → 409 bila WIB-today > `downPaymentDueDate` (hari-H lewat → prioritas hangus).

### 2026-06-14 — fix(F2-5): tutup ghost-stock RETURN_FROM_ROOM (lock + 409 di dua jalur)
- **`assertRoomItemQtyAvailableTx`** (lock `SELECT … FOR UPDATE` + `ConflictException` bila stok kamar < diminta) diekstrak ke `common/utils/room-booking.util....
- Dipakai **DI DALAM transaksi** oleh `inventory-movements.create` (sebelumnya private, kini util) **dan** `staff-field-reports.adminReview` (sebelumnya TIDAK...

### 2026-06-14 — Audit ulang checklist terhadap kode aktual
- Mengembalikan `F2-1`, `F2-2`, `F2-5`, `F2-6`, `F2-18`, `F2-11`, dan `F2-14` ke `[ ]` karena lingkup task belum lengkap atau verifikasinya belum selesai.
- Temuan kritis: jalur `staff-field-reports.adminReview` masih dapat RETURN melebihi qty kamar tanpa lock/409; `syncRoomItemTx` hanya menghapus RoomItem saat q...

### 2026-06-14 — fix(F2-18): STAFF close dibatasi ke CHECKOUT_INSPECTION (invarian dossier 15)
- **UAT runtime:** STAFF close #1 (non-inspeksi) → 403; STAFF close #13 (CHECKOUT_INSPECTION) → 409 (guard kategori lolos, status OPEN≠DONE); OWNER close #1 →...

### 2026-06-14 — F2-3b: catat refund kalah-cepat di sistem (full-stack, UAT LULUS)
- Refund untuk tenant yang KALAH first-paid-wins padahal sudah transfer kini tercatat & terlacak (lanjutan F2-3 yang memberi tahu loser "dana akan direfund").
- **Schema (owner-approved):** enum `RefundStatus { NONE, PENDING, COMPLETED }` + 7 field `Stay.lossRefund*` (status/amount/proofUrl/proofFileKey/note/processe...

### 2026-06-14 — F2-11 (V-1): code-split halaman publik (bundle utama lebih ramping)
- **Sisa F2-11 (UI polish):** W-02 skeleton detail + CSS ring, W-03 pagination 12 katalog, UD-05 sticky CTA — perlu iterasi visual.

### 2026-06-14 — F2-18: tenant-pengawas — STAFF boleh tutup tiket (guard keselamatan tetap), enum PENDING_VERIFICATION
- **`tickets POST :id/close` kini izinkan STAFF** (sebelumnya OWNER/ADMIN). Mendukung model tenant-pengawas: staf menutup tiket pekerjaannya sendiri termasuk `...
- **`StaffReviewStatus` += `PENDING_VERIFICATION`** (enum app + schema, db push UAT & prod-lokal) sebagai prasarana model "tenant sebagai pengawas kualitas" (r...

### 2026-06-14 — F2-5: konsolidasi util terduplikasi ke common/utils (X-03, sebagian)
- `backend/src/common/utils/room-booking.util.ts` (baru) menyatukan helper yang sebelumnya disalin lintas service:
- **`releaseRoomAfterBookingCancelTx`** — 2 salinan IDENTIK (auto-ops + payment-submissions) → satu sumber. Behavior tetap.

### 2026-06-14 — F2-3: copy notif A17 dua-varian (kalah first-paid: sudah/belum transfer)
- **Sudah transfer** → "Booking dibatalkan: dana Anda akan direfund" (admin akan menghubungi untuk proses refund).
- **Belum transfer** → "Booking dibatalkan: kamar diamankan tenant lain" (tak ada dana terpotong, pilih kamar lain).

### 2026-06-14 — F2-14: timezone WIB untuk bucketing tanggal (F-25/E-6, sebagian)
- **`accounting-posting-helpers.dateOnly` → WIB (UTC+7):** entryDate jurnal kini dibucket per tanggal kalender WIB (dulu komponen UTC) → transaksi dini hari WI...
- **`staff-performance.monthRange` → batas WIB-instant:** bebas timezone server (di server UTC/cPanel perhitungan local lama meleset ±7 jam di tepi bulan). No-...

### 2026-06-14 — F2-12: sinyal tiket hidup lagi + aging pakai sisa tagihan (F-21/F-27, UAT LULUS)
- `finance.service.ts`:
- **F-21 (sinyal tiket):** `highSignalTickets` dulu memakai kategori `['URGENT','HIGH','EMERGENCY']` — `URGENT`/`HIGH` BUKAN `TicketCategory` valid → query sel...

### 2026-06-14 — F2-9: KPI tiket berhenti dobel-hitung lintas bulan (K-6)
- Ringkas: lihat source changelog lama bila perlu detail historis.

### 2026-06-14 — F2-17: notif tenant saat booking/stay dibatalkan sweeper (E3, UAT LULUS)
- `cancelEndedUnpaidStay` (noon-release/H+1 auto-cancel/DP-forfeit) di-refactor: hasil tx ditangkap ke `cancelled`, lalu bila `true` panggil `notifyTenantStayC...
- `runBookingExpiry`: setelah `expireBookingTx` sukses, kirim notif "booking kedaluwarsa".

### 2026-06-14 — F2-16: perketat OWNER-only 4 area (D-17), ADMIN→403 (UAT LULUS)
- Audit `@Roles` + perketat 4 area sensitif jadi OWNER-only (ADMIN ditolak 403); operasi baca (GET) tetap untuk ADMIN/STAFF sesuai sebelumnya:
- **(a) Periode akuntansi** — sudah OWNER (create/update/`reopen`/`period-close/post`/`auto-run`/opening-balance post/void/draft); tak ada perubahan.

### 2026-06-14 — F2-1 inc.4: notif siklus renewal end-to-end (F2-1 & F2-2 SELESAI, UAT LULUS)
- `renew-requests.service` kini menerbitkan notifikasi in-app di tiap transisi (pola `app-notification.service`, mirror checkout-requests; best-effort di luar...
- **create** → OWNER/ADMIN ("🔁 Permintaan perpanjangan baru" + nominal DP).

### 2026-06-14 — Auto-ops cron eksternal (cPanel/Passenger idle-sleep) — endpoint token-protected
- **`GET /api/auto-ops/cron`** baru (`@Public`, tanpa JWT): validasi token rahasia `process.env.AUTO_OPS_CRON_TOKEN` via header `X-Cron-Token` ATAU query `?tok...
- **Deploy shared hosting:** set `AUTO_OPS_ENABLED=false` (matikan timer) + `AUTO_OPS_CRON_TOKEN=<rahasia>`, pasang cPanel **Cron** tiap 5–10 mnt: `curl -fsS -...

### 2026-06-13 — F2-1 inc.3: sweeper auto-ops renewal HIBRIDA (EXPIRED_PRIORITY + FORFEITED, UAT LULUS)
- Sweeper baru di `auto-ops.service.ts` (wired ke `runAll`, jalan tiap 5 menit) — **kebijakan HIBRIDA** (keputusan owner 2026-06-13):
- **`runRenewalPriorityExpiry` (OTOMATIS):** `AWAITING_DP` yang lewat hari-H (`downPaymentDueDate`) tanpa DP lunas → `EXPIRED_PRIORITY`. Membatalkan invoice DP...

### 2026-06-13 — F2-1 inc.2b: invoice DP TERPISAH + rent-line pelunasan dikurangi (UAT runtime LULUS)
- **`stays.service.ts`** `issueRenewalDownPaymentInvoiceTx(tx,…)` baru: terbitkan invoice DP 30% (DRAFT→ISSUED + Auto Journal Lite). `renewStayInTransaction` k...
- **`renew-requests.service.ts`**: `decideByTenant` **YA** → transaksi terbitkan invoice DP + set `downPaymentInvoiceId` + `AWAITING_DP`; `confirmDownPayment`...

### 2026-06-13 — F2-1 inc.2a UAT runtime LULUS (rent-loyalty terbukti)
- Diuji end-to-end vs DB UAT (backend kode-baru :3002, stay 5 / tenant.gita, rent 850rb):
- CREATE → `PENDING_DECISION`, DP=**255.000** (30%), downPaymentDueDate=**2026-06-30** (hari-H).

### 2026-06-13 — F2-1 inc.2a: State Machine Renewal DP (CORE, admin-verified)
- **`renew-requests.service.ts`** dibangun ulang ke state machine GAP #2:
- `createRequest` → `PENDING_DECISION` + set `downPaymentAmountRupiah` (30% × sewa SAAT INI — rent-loyalty D-16) + `downPaymentDueDate` = `plannedCheckOutDate`...

### 2026-06-13 — Paket deploy RAMPING + script cPanel (`make-deploy`, `cpanel:setup`)
- **`npm run make-deploy`** (root, `scripts/make-deploy.mjs`): build frontend combined → folder **`deploy/`** = backend SOURCE (tanpa `node_modules`/`dist`/`sr...
- **Backend script cPanel** (`backend/package.json`): **`cpanel:setup`** = `npm ci && npm run build && npm prune --omit=dev` (build prisma engine Linux + tsc,...

### 2026-06-13 — COMBINED single-server: 1 proses serve frontend + API (`npm run golive:1`)
- Owner pilih arsitektur "1 server". Diimplementasi **dependency-free**:
- **`backend/src/main.ts`**: serve `frontend/dist` (copy → `backend/client`, env `FRONTEND_DIST_PATH`, default `<backend>/client`) via `useStaticAssets` + **fa...

### 2026-06-13 — Target publish cPanel DIKONFIRMASI + rencana (04_DEPLOY §D)
- Owner konfirmasi host cPanel **mampu**: Node.js App (versi dukung) · PostgreSQL · SSH · build-on-server · AutoSSL. Resource upgrade bila kurang. Belum pasti:...
- **Arsitektur diputuskan: combined single-server** (backend serve `frontend/dist` + API, 1 proses/port/domain, tanpa CORS) — dependency-free (`useStaticAssets...

### 2026-06-13 — Go-live SATU PERINTAH: `npm run golive` (root) + port tetap dijamin
- **Root `package.json` + `scripts/golive-all.mjs`** (zero-dependency): `npm run golive` dari `final_bundle/` → (1) **pastikan port 3000+5173 bebas** (deteksi...
- Frontend `golive` ditambah `--strictPort` (gagal jelas, tak geser port).

### 2026-06-13 — Go-live LAN: npm script `golive` + `build:lan` (self-host WiFi kos)
- Owner pilih go-live di localhost/LAN (kos 1 lokasi). Ditambah tooling konvenien **zero-dependency**:
- **`backend/scripts/golive.mjs`** + script `npm run golive`: set `NODE_ENV=production`, `DATABASE_URL`→`kost48_v3` (derive dari `.env`), `CORS_ORIGIN` auto da...

### 2026-06-13 — F1-12: DB Produksi `kost48_v3` Diprovisikan + Di-seed (lokal-as-prod 5433)
- **DB bersih:** `CREATE DATABASE kost48_v3` → `prisma db push` (41 tabel) → `bootstrap.sql` + `bootstrap_v4_addendum.sql` (bersih).
- **Seed fondasi (owner-driven):** OWNER `liem.lui@gmail.com` (bcryptjs, role OWNER) · COA **37 akun** (DEFAULT_COA) · AccountingPeriod 2026-06 **OPEN** · Cash...

### 2026-06-13 — F1-12 rehearsal: Runbook Fresh-Deploy Schema+Bootstrap LULUS
- Rehearsal di DB throwaway `kost48_v3_deploy_rehearsal` (5433): `prisma db push` → **41 tabel** (=41 model) · `sql/bootstrap.sql` + `bootstrap_v4_addendum.sql...
- **Temuan F1-12:** DB fresh TIDAK punya user (bootstrap.sql tak buat User, tak ada seed script) → endpoint seed butuh auth admin. `04_DEPLOY §2` ditambah PRAS...

### 2026-06-13 — F2-1 inc.1: Schema Renewal DP (owner-approved S-1)
- **Owner approval S-1** (`03_KEPUTUSAN_OWNER §S`): seluruh perubahan schema ADDITIVE disetujui (F2-1, F2-3b, F2-18, F3-14/15/17, F4-9).
- **`schema.prisma`** (additive): `RenewRequestStatus` +7 status (`PENDING_DECISION`, `AWAITING_DP`, `DP_SECURED`, `COMPLETED`, `REJECTED_BY_TENANT`, `EXPIRED_...

### 2026-06-13 — F2-6: Auto-tiket Inspeksi saat Cancel Stay Promoted (B-08)
- **`stays.service.ts` `cancel()`**: ketika stay yang dibatalkan `wasPromoted` (sudah dihuni) dan kamar → MAINTENANCE, kini otomatis membuat tiket `CHECKOUT_IN...
- Menutup B-08: sebelumnya cancel stay promoted menaruh kamar di MAINTENANCE TANPA tiket → kamar nyangkut selamanya (gate room-ready hanya buka lewat penutupan...

### 2026-06-13 — GATE RUNTIME FASE 1: LULUS (backend dev + DB UAT 5433)
- Verifikasi `05 §4-5` dijalankan terhadap data UAT (`kost48_v3_pro`), backend `npm run start:dev`:
- **trial-balance**: `isBalanced=true` (debit=kredit=119.694.250). Invarian #6 ✓

### 2026-06-13 — F2-8: Nonaktifkan Endpoint Draft Jurnal Manual (F-22/F-23/D-05)
- **`accounting.controller.ts`**: route `POST /accounting/journal-entries/draft` (`createJournalDraft`) kini melempar `ForbiddenException` (403) — pembuatan ju...
- Opening Balance draft (jalur terpisah & terkontrol via OpeningBalanceWizard) TETAP berfungsi.

### 2026-06-13 — F1-10: Kunci Deposit = Room.defaultDepositRupiah (C3/D-05)
- **`stays.service.ts` create**: `deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah` → `room.defaultDepositRupiah ?? 0` (abaikan override dto).
- **`tenant-bookings.service.ts` approveBooking**: hapus override `depositAmountRupiah: dto.depositAmountRupiah` dari update stay — deposit tetap di snapshot r...

### 2026-06-13 — F1-9: Deposit Bukan Operating Cashflow (F-10)
- **`cashflow-classifier.ts`**: sourceType `DEPOSIT` (dana titipan) tidak lagi masuk operating (fallback) → kategori baru `depositLiabilityIn/Out` (perubahan l...
- **`accounting-reports.service.ts` `cashflow()`**: tambah section `depositLiability` (totalIn/Out/net + catatan "bukan kas operasional yang bisa dipakai"); `n...

### 2026-06-13 — F1-8: Guard Settlement Deposit (F-24)
- **`accounting-posting.service.ts` `postDepositSettlementTx`**: TAMBAH pra-cek — sebelum men-debit liability 2000, pastikan ada jurnal PENERIMAAN deposit POST...
- Menutup F-24: tanpa cek, settlement bisa men-debit 2000 tanpa kredit sebelumnya → akun liability 2000 bersaldo DEBIT (uang titipan "hilang" dari buku). Recei...

### 2026-06-13 — F1-7: Invoice DRAFT Bukan Revenue (F-09)
- **`reports.service.ts` (4 agregat revenue/billed)** + **`finance.service.ts` (5 agregat revenue ber-periodStart)**: filter `status: { not: CANCELLED }` → `st...
- **Sengaja TIDAK diubah** (LARANGAN): groupBy `countByStatus` di reports (masih perlu DRAFT untuk `unpaidCount`), dan openInvoice/AR (`notIn [PAID, CANCELLED]...

### 2026-06-13 — F1-6: Occupancy Rasio (F-04) dihitung inline
- **`financialRatios()`**: `occupancyRate` tak lagi membaca `bs.statement?.occupancyRate` (yang tidak ada → selalu 0). Dihitung INLINE: `operableRooms = kamar...
- Helper `occupancyRatePercent` (di `financial-ratios.helper.ts`) + test (5/10→50; operable 0→0; 48/48→100). Total `test:unit` **13/13 hijau**.

### 2026-06-13 — F1-5: Deposit sebagai Kewajiban Lancar (F-03) — verifikasi & tutup (docs-only)
- Inti F1-5 (deposit masuk kewajiban lancar → currentRatio turun wajar saat deposit HELD) sudah terpenuhi di **F1-4**: `currentLiabilities` memakai `CURRENT_LI...
- `balanceSheet()` ditelaah baris-demi-baris: identitas **A = L + E** benar — keenam tipe akun (ASSET/LIABILITY/EQUITY/REVENUE/COGS/EXPENSE) ter-map, contra-as...

### 2026-06-13 — F1-4: Rasio Keuangan Benar (F-02 presedensi + F-18 kas/AR)
- **`financial-ratios.helper.ts` (baru, pure)** + `backend/test/unit/financial-ratios.helper.test.js` (12/12 hijau total).
- **`accounting-reports.service.ts` `financialRatios()`**:

### 2026-06-13 — F1-3: Perbaikan Cashflow (F-01/05/19/20) + classifier teruji
- **Tulis `13_AKUNTANSI_LAPORAN §6`** — spec before→after 4 sub-langkah (sebelumnya checklist menunjuk §6 yang belum ada).
- **`cashflow-classifier.ts` (baru, pure)** + `backend/test/unit/cashflow-classifier.test.js` (10/10 hijau total): klasifikasi arus kas terverifikasi zero-depe...

### 2026-06-13 — F1-2: Guard Hapus/Ubah Pembayaran Kamar OCCUPIED (D-17 / GAP #3 / B-04)
- **`invoice-payments.service.ts`** — tambah helper `assertStayNotOccupiedForPaymentMutationTx`, dipanggil di `update` + `remove` (dalam tx, sesudah `FOR UPDAT...
- Menutup lubang: pembayaran TANPA jurnal (best-effort skip) sebelumnya masih bisa dihapus saat kamar sudah ditempati → occupancy vs uang inkonsisten. Booking...

### 2026-06-13 — F1-1R: No-Partial Menyeluruh (D-02 / GAP #1 / B-01)
- **`payment-submissions.service.ts` `approveSubmission`** — tambah gate re-validasi dua nominal sah (sebelumnya hanya blokir overpay → bisa approve PARTIAL li...
- **`approveSubmission` invoice-only** (renewal/utilitas/manual) — wajib `amount === invoiceRemaining` (lunas penuh), bukan sekadar `≤`.

### 2026-06-13 — F1-T: Sabuk Pengaman Unit Test Finance (baseline terkunci)
- **F1-T SELESAI** — pasang harness unit test zero-dependency (Node built-in `node --test`, tanpa npm install):
- `backend/test/unit/pricing.test.js` — `calculateRentByPricingTerm` (multiplier 13/45/75/100/550/1000% + pembulatan naik 5.000), `roundUpToNearest`, `isUtilit...

### 2026-06-13 — Audit Traceability Root Docs + Router `_PETA_AI` + Penomoran 06-09 (docs-only)
- **Buat `_PETA_AI.md`** — router 22 file root: §1 tabel "baca saat" + status akurasi, §2 anchor `file:baris` TERVERIFIKASI vs kode (`3c7ffe2`), §3 status defe...
- **Audit mendalam 22 file root → perbaiki 4 defek traceability:**

### 2026-06-13 — Normalisasi Logic dan Referensi Root Docs
- Rename fisik dossier `06`-`15` menjadi `10`-`19` agar sesuai heading, blueprint, checklist, dan tab kerja.
- Tetapkan hierarki sumber kebenaran: keputusan owner untuk aturan bisnis, kode untuk perilaku aktual, checklist untuk ID/urutan task.

### 2026-06-13 — Audit Forensik V3 + 84 Keputusan Owner + Restruktur Docs Domain-Dossier (READ-ONLY, belum sentuh kode aplikasi)
- Subbagian: Audit forensik V3 (Fable 5, baca kode penuh per-baris)
- **97 temuan** di atas 53 temuan V1: finance F-17..F-34 (cashflow salah-akun F-01 + kembarannya F-18 yang LOLOS fix V1, rasio, BS-MoM 0%, settlement deposit b...

### 2026-06-12 — Simplifikasi & Update Docs — FLOW_MAP V2 + 6 Flow Baru + Arsip
- Subbagian: Update besar `docs/02_FLOW_MAP.md` (V2)
- **Koreksi 5 bagian basi:**

### 2026-06-12 (larut) — Eskalasi Tuntas + 5 Skenario Residual PASS + Runbook Deploy → SIAP PRODUKSI
- Subbagian: Eskalasi diimplementasikan & diverifikasi runtime
- **E-1 Guard global (default-deny):** `APP_GUARD` JwtAuthGuard+RolesGuard + decorator `@Public()` (login/forgot/reset, public/bookings, public/rooms, faqs/pub...

### 2026-06-12 (malam) — UAT Siklus Overstay V5.12.1 PASS PENUH + Rekonsiliasi Bersih
- Subbagian: UAT overstay end-to-end (stay tes #15, kamar G2-003 — manipulasi tanggal via SQL UAT, eksekusi via `POST /auto-ops/run`)
- H-3: notifikasi "⏰ Kontrak berakhir 3 hari lagi" terkirim ✓

### 2026-06-12 (sore) — E-2 Backfill (DB UAT) + UAT M-07/M-09 PASS Penuh
- Subbagian: E-2 — Backfill `initialMetersPromotedAt` (data fix, DB UAT 5433)
- 11 stay penghuni nyata (kamar OCCUPIED, jaminan terbayar) diisi `initialMetersPromotedAt = checkInDate` via SQL bertransaksi; 1 booking fase RESERVED dikecua...

### 2026-06-12 — Eksekusi FIX-01..26 oleh AI eksekutor (VERIFIED) + Audit UI/UX Visual
- Subbagian: Eksekusi audit mega (kode)
- AI eksekutor menerapkan **24/24 FIX** dari `04_FIX_INSTRUCTIONS.md` (commit e4a8c31..f9d10ac, 1 commit per FIX; M-26/M-27 digabung 1 commit — deviasi minor d...

### 2026-06-12 — Audit Mega Full-Sweep (docs only, tanpa perubahan kode aplikasi)
- Subbagian: Type
- Subbagian: Deliverables

### 2026-06-11 — Docs Compaction + Keputusan Owner D1–D4 (tanpa perubahan logika, 1 copy fix)
- Subbagian: Type
- Subbagian: Keputusan owner (detail di `02_FOCUS_PLAN.md` §3)

### 2026-06-11 — V5.12.2 Frontend DP/Jaminan + Rate Limiting + Audit Pass C/E/P3
- Subbagian: Type
- Subbagian: Frontend (fitur V5.12.x kini terlihat pengguna)

### 2026-06-11 — V5.12.1 Overstay Lifecycle (Keputusan Owner)
- Subbagian: Type
- Subbagian: Siklus overstay lengkap (auto-ops, urutan sequential)

### 2026-06-11 — V5.12.0 DP (Uang Muka) vs Deposit (Jaminan) + Overstay Enforcement Baru
- Subbagian: Type
- Subbagian: Schema (additive)

### 2026-06-11 — V5.11.1 Audit Pass A/B — Fix Paket 1
- Subbagian: Type
- Subbagian: Fixed

### 2026-06-11 — V5.11.0 Audit Hardening & Business Logic Fixes
- Subbagian: Type
- Subbagian: Commits (5)
