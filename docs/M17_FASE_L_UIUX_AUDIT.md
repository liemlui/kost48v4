# M17 — Laporan Audit UI/UX Menyeluruh (Fase L)

> **Tanggal audit:** 2026-06-20 · **Cakupan:** 75+ halaman + komponen shared · **Checklist eksekusi → `docs/M10_CHECKLIST_CHANGELOG.md` Fase L**

## Panduan Navigasi Dokumen Fase L

| Dokumen | Isi |
|---------|-----|
| **M17 ini** | Ringkasan isu per halaman + matriks prioritas (konteks & motivasi) |
| **M10 Fase L** | Checklist eksekusi dengan scope yang sudah dikoreksi dari kode nyata |
| `docs/fase-l-specs/L01_L03_loading_error_mobile.md` | Spec before/after: L-01 (App.tsx blank), L-02 (CashflowPage + FinancialRatios), L-03 (StaffRoutines + ReminderPreview) |
| `docs/fase-l-specs/L04_L07_wizard_balance_guest_auth.md` | Spec before/after: L-04 (StepTenantSelect error), L-05 (SKIP — bukan bug), L-06 (copy password), L-07 (timeout 1200→2000ms) |
| `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` | Spec before/after: L-08 (PublicRooms 5 fix), L-09 (OwnerDash 2 kartu), L-10 (lightbox + WA), L-11 (lazy+Suspense) |
| `docs/fase-l-specs/L12_L15_enum_staff_stays_tenant.md` | Spec before/after: L-12 (REWARD_TYPES), L-13 (TicketsStaffMode + StaffRoutines), L-14 (alert order), L-15 (announcement truncate) |
| `docs/fase-l-specs/L16_L20_accounting_a11y_empty_asset_minor.md` | Spec before/after: L-16 (checklist widget), L-17 (focus outline), L-18 (CashflowPage empty), L-19 (asset modal + tooltip), L-20 (profile/settings minor) |

## Koreksi Pasca-Verifikasi Kode (5 Agen Opus, 2026-06-20)

Audit awal berbasis pembacaan parsial — 5 agen Opus membaca kode langsung dan menemukan **18 false alarm** yang tidak perlu diubah:

| Item | Temuan Awal | Fakta dari Kode | Status |
|------|-------------|-----------------|--------|
| L-05 BalanceSheet warna % | "kewajiban naik = hijau = bug" | Sengaja dibalik — konsisten dgn ProfitLoss "Beban" | **SKIP** |
| L-01 button spinners | Banyak file butuh spinner | TicketsStaffMode, InvoicesPage, StaysPage sudah bagus | Hanya App.tsx |
| L-03 TicketsPage grid | Col md={6} tidak responsive | CSS `.create-ticket-category-grid` sudah 3→2 kolom ≤768px | **SKIP** |
| L-03 PublicRoomDetail tarif | Table tidak responsive | Sudah `<Table responsive>` | **SKIP** |
| L-04 WizardSteps | Progress bar tidak ada | `WizardSteps` sudah ada di `checkInWizardUtils.tsx` | Hanya error handler |
| L-04 meter validation | Hanya saat submit | Sudah via react-hook-form `register+validate` onBlur | **SKIP** |
| L-02 OwnerDashboard "—" | Data kosong vs error tidak dibedakan | `'…'` loading vs `'—'` kosong sudah dibedakan | **SKIP** |
| L-02 DashboardAdmin severity | coreQueriesError vs supportQueriesError | Severity sudah tepat sesuai impact | **SKIP** |
| L-07 LoginPage auto-clear | Hanya field identifier | Kedua field (identifier + password) sudah auto-clear | **SKIP** |
| L-09 quick-action flex | Button overflow mobile | Sudah `flex-wrap` baris 580 | **SKIP** |
| L-10 step indicator WiFi | Tidak ada visual step | Sudah ada CSS step indicator | **SKIP** |
| L-10 "Sudah dipesan" badge | Tidak actionable | Sudah ada konteks yang memadai | **SKIP** |
| L-11 period selector | Tersembunyi pojok kanan | Sudah di posisi hero yang tepat | **SKIP** |
| L-12 save button | Text statis "Simpan" | Sudah dinamis (create vs edit) | **SKIP** |
| L-12 ServiceInterests | Enum mentah | Sudah Indonesia | **SKIP** |
| L-13 closeTicketMutation | Tidak tutup modal | Sudah tutup modal + invalidate query | **SKIP** |
| L-14 currency format | Tidak konsisten | Semua tile sudah konsisten `formatRupiah` | **SKIP** |
| L-17 GlobalSearch aria-label | Tidak ada | Sudah ada di baris 128 | **SKIP** |
| L-17 AdminContinuityStrip | Perlu aria-pressed | Ini tombol navigasi, bukan toggle | **SKIP** |
| L-18 InvoicesPage empty | Analytics panel hilang | Sudah pakai `EmptyState` component | **SKIP** |
| L-19 MarketAnalysis labels | Tidak ada "Kamu"/"AI" | Sudah ada di baris 179 | **SKIP** |

**Efek:** dari 20 task, hanya ~15 task yang memiliki perubahan nyata, dan mayoritas task yang ada scope lebih kecil dari perkiraan audit awal.

---

---

## Isu Cross-Cutting (Berdampak ke Seluruh App)

Perbaikan di sini efeknya ke semua role/halaman sekaligus.

### CC-1 — Loading State Tidak Konsisten

Tiga pola berbeda dipakai tanpa standar:
- `return null` → blank page (`RequireRoles`, `TenantBookingRouteGuard` di `App.tsx`)
- Spinner tanpa teks (sebagian besar halaman)
- Teks "…" inline (OwnerDashboard status cards)

**Dampak:** user tidak tahu apakah halaman loading atau crash.

**Saran:**
- `App.tsx`: ganti `return null` pada `RequireRoles` dan `TenantBookingRouteGuard` dengan `<Spinner animation="border" />` atau skeleton.
- Action button saat mutation pending: tambah `disabled` + `<Spinner size="sm" /> Menyimpan...`.
- Section yang bergantung query: gunakan skeleton card atau `<Spinner />` dengan teks konteks ("Memuat data penghuni…", bukan "Loading").

**File bermasalah:** `frontend/src/App.tsx`, `DashboardStaff.tsx`, `OwnerDashboardPage.tsx`, `InvoicesPage.tsx`, `RenewRequestsAdminPage.tsx`, `TicketsStaffMode.tsx`.

---

### CC-2 — Error Display Tidak Seragam

Empat representasi berbeda untuk kondisi error:
- `"—"` tanpa tooltip (OwnerDashboard meter/readiness)
- `Alert danger` generic
- `Alert info` untuk error serius (DashboardAdmin supportQueriesError)
- Tidak ada sama sekali (CashflowPage cash list kosong)

**Saran:**
- Pisahkan "data kosong" (EmptyState component) vs "gagal fetch" (Alert dengan CTA refresh).
- Gunakan tier severity: `danger` = data kritis gagal dimuat; `warning` = partial; `info` = konteks tambahan saja.
- Ganti `"—"` dengan badge/tooltip "Gagal memuat" bila penyebabnya query error.

**File bermasalah:** `OwnerDashboardPage.tsx`, `DashboardAdmin.tsx`, `CashflowPage.tsx`, `FinancialRatiosPage.tsx`.

---

### CC-3 — Empty State Tidak Standar

Sebagian pakai `<EmptyState />` component, sebagian hardcode teks, sebagian tidak ada sama sekali.

**Saran:** Selalu render section dengan pesan actionable: "Belum ada X. [Tombol CTA]". Gunakan `EmptyState` component yang sudah ada (`frontend/src/components/common/EmptyState.tsx`).

**File bermasalah:** `CashflowPage.tsx`, `InvoicesPage.tsx`, `AdminWorkspaces*.tsx`.

---

### CC-4 — Mobile Responsiveness Belum Merata

Grid/form yang bermasalah di mobile (≤375px):
- `TicketsPage` — category grid `Col md={6}` tanpa `xs={12}`
- `StaffRoutinesAdminPage` — 3 checkbox dalam `Col md={3}`
- `ReminderPreviewPage` — message preview `max-width: 250px`
- `PublicRoomsPage` — filter bar panjang tanpa collapse/drawer
- Tarif table `PublicRoomDetailPage` — tidak stack di mobile

**Saran:** Audit semua grid: pastikan ada `xs` breakpoint. Target test: 375px (iPhone SE).

---

### CC-5 — Aksesibilitas Dasar Kurang

- `AppLayout` GlobalSearch: tanpa `aria-label`
- `DashboardAdmin` AdminContinuityStrip: button tanpa `aria-pressed`
- `StaffRoomsPage`: card `tabIndex={0}` tanpa focus outline CSS
- Banyak emoji icon tanpa `aria-hidden="true"`
- `DashboardAdmin` modal ticket: tidak ada `createdAt` timestamp

**Saran:** Audit icon-only button; tambah `aria-label`. CSS: `.focus-visible { outline: 2px solid #0056b3; }`.

---

### CC-6 — Wording/Label Tidak Konsisten

- "Item" (English) vs "hal" (Indonesia) di `TenantPriorityBoard`
- Tab "Aktif" di StaysPage mencakup BOOKED+ACTIVE sekaligus
- Enum raw ke user: `RENT_DISCOUNT`, `SERVICE_ADDON` di `LoyaltyAdminPage`
- `FinancialRatiosPage`: badge RENDAH/BAIK logic flip antar context
- `BalanceSheetPage`: warna % change untuk Kewajiban terbalik (naik = hijau, seharusnya merah)

**Saran:** Buat `labelMap` terpusat untuk semua enum → label Indonesia.

---

## Temuan Per Grup Halaman

### Grup 1 — Auth + Public Guest

#### LoginPage
- Tab mode aktif (Penghuni/Admin) kurang kontras visual selain class `active` → saran: tambah border/background lebih tebal
- Error form tidak auto-clear konsisten di semua field

#### ForgotPasswordPage
- Token ditampilkan tanpa penjelasan sebelumnya bahwa gateway belum setup
- Teks "Response sistem akan tetap generik demi keamanan" teknis, tidak perlu untuk user biasa → pindah ke tooltip atau hapus

#### ResetPasswordPage
- Redirect ke login setelah success: 1200ms terlalu cepat → naikkan ke 2500ms atau tambah tombol "Lanjut ke Login"
- Tidak ada countdown expiry token

#### GuestBookingForm
- Label "📷 Pindai KTP (isi otomatis)" menyesatkan → hanya isi Nama & NIK, bukan semua field
- Estimasi biaya tidak mention utility cost → perlu disclaimer
- Terlalu banyak Alert berbeda variant sekaligus tanpa hierarchy

#### GuestBookingSuccess
- Password sementara ditampilkan tanpa tombol copy-to-clipboard
- Alert "Jangan transfer sebelum tagihan resmi" duplikat dari GuestBookingForm
- DP 30%: Alert pakai `variant="success"` (hijau) padahal ini syarat, bukan pencapaian → ubah ke `info`
- Tidak jelas apakah DP 30% wajib atau opsional

#### PublicRoomsPage
- Filter bar tidak ada collapse/drawer untuk mobile
- Compare max 3 kamar: constraint hanya di `title` hover, tidak terlihat di UI
- Pagination tidak ada ellipsis untuk 20+ halaman
- Carousel: tidak ada indikator pause/play

#### PublicRoomDetailPage
- Carousel autoplay 3400ms terlalu lambat; tidak ada kontrol pause
- Tarif table 3 kolom tidak responsive → perlu stack/card di mobile
- Sticky footer mobile bisa overlap konten → perlu `padding-bottom` di body
- Term selector: tidak ada "popular/recommended" indicator di pill button

---

### Grup 2 — Dashboard + Layout

#### OwnerDashboardPage (`frontend/src/pages/dashboard/OwnerDashboardPage.tsx`)
- Semua status card (Okupansi, Tunggakan, Meter due, Kesiapan) loading state tidak seragam
- Error pada meter/readiness query → tampil `"—"` saja tanpa tooltip/badge "Gagal"
- Trend chart button aktif tidak ada `aria-current`, hanya CSS class
- AssistantPanel "Sinyal Operasional" tidak ada empty state → heading muncul tanpa konten
- Quick-action button tidak ada `flex-wrap` → overflow di mobile

#### DashboardAdmin (`frontend/src/pages/dashboard/DashboardAdmin.tsx`)
- ActionQueueTable maxItems=12 tanpa "Tampilkan lebih banyak"
- Error severity: `coreQueriesError` → danger, `supportQueriesError` → info (seharusnya warning)
- AdminContinuityStrip button tanpa `aria-pressed`

#### AdminWorkspaces
- Modal ticket tidak tutup/refresh setelah action berhasil
- Label "Perlu Cek" untuk MAINTENANCE → ubah ke "Maintenance"
- Empty state "Data cancelled, expired, dan arsip memang tidak ditampilkan" teknis

#### AppLayout (`frontend/src/components/layout/AppLayout.tsx`)
- Sidebar collapse tooltip tidak sinkron dengan `aria-label`
- GlobalSearch tidak ada `aria-label`

#### App.tsx (`frontend/src/App.tsx`)
- `RequireRoles` dan `TenantBookingRouteGuard` → `return null` → blank page
- Tidak ada Error Boundary untuk lazy-loaded routes

---

### Grup 3 — Tenant Portal

#### TenantWorkspaceTabs (`frontend/src/components/tenant/TenantWorkspaceTabs.tsx`)
- Loading state "Memuat portal…" terlalu generic
- Announcement strip tidak truncate → konten panjang mendorong tombol "Lihat" keluar layar

#### MyInvoicesPage
- Setelah ganti tab, tidak ada `window.scrollTo({ top: 0 })` → user stuck scroll position lama

#### MyTicketsPage
- Preview image tiket `width: 120, height: 80` terlalu kecil → perlu lightbox/expand
- Category selection grid (15 opsi) tidak mobile-friendly → perlu 2 kolom di mobile

#### MyLoyaltyPage
- Peer report button tidak di-`disabled` saat mutation pending → bisa double-click
- Leaderboard kode kamar bisa identifiable walau disebut "anonim"

#### WifiOrderPage
- Nomor WhatsApp hardcoded tanpa info siapa yang balas
- "Sudah dipesan" badge tidak actionable → perlu tombol "Batalkan" atau link ke Tiket
- Step 1-2-3 tidak ada visual indicator (nomor/arrow)

#### TenantInvoiceDetailPage
- Textarea catatan tidak ada `maxLength` dan karakter counter
- Input nominal tidak diformat dengan "." setiap 3 digit

#### MyManualPage
- Accordion state tidak tersimpan saat navigate (user kehilangan posisi)

---

### Grup 4 — Stays + Finance + Reports

#### CheckInWizard (`frontend/src/pages/stays/CheckInWizard.tsx`)
- Tidak ada progress bar/step names — user tidak tahu berapa step tersisa
- Validasi form hanya saat submit, bukan `onBlur`
- `StepTenantSelect`: SearchableSelect tidak ada error handling jika query gagal

#### StayDetailPage
- Multiple alert (pending checkout, approved checkout, overdue) tidak berurutan berdasarkan severity
- Metric tile currency format tidak konsisten (ada Rp prefix, ada plain number)

#### StaysPage
- Section "Pengajuan Keluar Review" vs "Disetujui" tidak ada visual separator yang jelas
- Filter label "Aktif" mencakup BOOKED+ACTIVE sekaligus

#### AccountingSetupPage
- Halaman terlalu panjang (20+ queries) tanpa guided checklist
- Tidak ada skeleton loader untuk section yang loading

#### BalanceSheetPage
- **Bug logika:** Warna % change untuk Kewajiban terbalik: kewajiban naik seharusnya merah, bukan hijau

#### ReportsPage (`frontend/src/pages/reports/ReportsPage.tsx`)
- Period selector (Year/Month dropdown) tersembunyi di pojok kanan atas
- Tab "Laporan Formal" tidak ada skeleton loader saat query lambat

#### FinancialRatiosPage
- Badge RENDAH/BAIK logic flip antar context (liquidity vs solvency): tidak konsisten
- Data readiness badge tidak ada link/action untuk fix missing data

#### AssetRegisterPage
- Form tambah aset terlalu panjang di mobile → perlu modal/accordion
- Badge status tidak ada tooltip penjelasan

#### LossRefundsPage
- Kolom "Dibatalkan" ambigu → apakah tanggal batal atau tanggal update?

---

### Grup 5 — Staff + Admin + Lainnya

#### TicketsPage (`frontend/src/pages/tickets/TicketsPage.tsx`)
- Category grid tidak responsive (tidak ada `xs={12}`)
- Label "Assign ke Staff (opsional)" misleading — "bisa diubah nanti" lebih tepat

#### TicketsStaffMode
- Action button tidak punya spinner saat `isPending`
- Tidak ada success feedback setelah aksi berhasil

#### RenewRequestsAdminPage
- Modal 3-section tidak auto-scroll ke bagian meter yang wajib diisi

#### InvoicesPage
- Analytics panel hilang saat invoice kosong → tetap tampilkan dengan nilai 0

#### ProfilePage
- Field tip (GoPay, OVO, DANA, dll) tidak ada validasi format/placeholder
- Error API "Password current tidak cocok" → normalisasi ke bahasa manusia

#### OwnerSettingsPage
- Pesan error upload foto pakai slug teknis → ubah ke nama fasilitas yang ramah
- Modal FAQ tidak auto-focus ke field "Pertanyaan"

#### LoyaltyAdminPage
- Dropdown Tipe Reward menampilkan enum raw (`RENT_DISCOUNT`) → perlu label Indonesia
- Save button selalu "Simpan" padahal bisa "Ubah Reward" atau "Buat Reward Baru"

#### MarketAnalysisPage
- Chat UI tidak membedakan pesan user vs AI dengan label

#### ServiceInterestsPage
- Default tab "PENDING" bukan "Semua" → user tidak lihat semua data saat pertama buka
- Status badge warna tidak konsisten dengan warna tab

#### StaffRoomsPage
- Card `tabIndex={0}` tanpa focus outline CSS

---

## Matriks Prioritas Eksekusi (Fase L)

| Task | Area | Effort | Impact |
|------|------|--------|--------|
| **L-01** | Loading state standar (App.tsx null → skeleton) | Kecil | 🔴 Tinggi |
| **L-02** | Error display — pisah data kosong vs error | Kecil | 🔴 Tinggi |
| **L-03** | Mobile grid — xs breakpoint (Tickets, StaffRoutines, dll) | Kecil | 🔴 Tinggi |
| **L-04** | CheckInWizard — progress bar + field validation | Sedang | 🔴 Tinggi |
| **L-05** | BalanceSheetPage — bug warna % kewajiban | Kecil | 🔴 Tinggi |
| **L-06** | GuestBookingSuccess — copy password + DP info | Kecil | 🟡 Sedang |
| **L-07** | Auth pages — redirect timeout, error auto-clear | Kecil | 🟡 Sedang |
| **L-08** | PublicRoomsPage — filter mobile, pagination ellipsis | Sedang | 🟡 Sedang |
| **L-09** | OwnerDashboard — error badge, loading konsisten | Sedang | 🟡 Sedang |
| **L-10** | Tenant Portal — image lightbox, WifiOrder actionable | Sedang | 🟡 Sedang |
| **L-11** | ReportsPage — period selector, formal tab skeleton | Kecil | 🟡 Sedang |
| **L-12** | Enum → label Indonesia (Loyalty, Service, Status) | Kecil | 🟡 Sedang |
| **L-13** | Staff/Admin button loading + success feedback | Sedang | 🟡 Sedang |
| **L-14** | StayDetailPage — alert priority, currency format | Kecil | 🟡 Sedang |
| **L-15** | TenantWorkspaceTabs — loading, announcement truncate | Kecil | 🟡 Sedang |
| **L-16** | AccountingSetupPage — guided checklist/onboarding | Besar | 🟢 Rendah |
| **L-17** | Aksesibilitas — aria-label, focus outline, aria-pressed | Sedang | 🟢 Rendah |
| **L-18** | Empty state — komponen standar konsisten | Sedang | 🟢 Rendah |
| **L-19** | AssetRegisterPage — form modal, badge tooltip | Sedang | 🟢 Rendah |
| **L-20** | Minor fixes (ProfilePage tip, OwnerSettings error, FAQ focus) | Kecil | 🟢 Rendah |

---

*Diaudit via 5 agen paralel, 2026-06-20. Rujukan eksekusi: `docs/M10_CHECKLIST_CHANGELOG.md` Fase L.*
