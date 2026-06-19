# KOST48 V5 — Fase H: UI/UX Compact Owner ↔ Admin

> **Dossier baru** untuk menyederhanakan tampilan Owner & Admin tanpa menghilangkan fitur.
> Fokus: reduksi redundansi sidebar, compact tab dashboard, merge duplikasi, dan unifikasi AI panel.
> **Bahasa kerja: Indonesia.** Semua commit berbahasa Indonesia dengan prefix `ui:`.

## Tujuan

Fase H menyederhanakan UI/UX dengan **menghilangkan duplikasi, bukan fitur**. Owner tetap bisa mengakses semua fitur operasional via toggle "Area Admin" (🔧), tapi sidebar Kokpit Owner (📈) menjadi lebih ringkas dan strategis. Dashboard admin yang tadinya 6 tab area diringkas menjadi 3 area kerja. Semua perubahan hanya di frontend — **tidak menyentuh backend, schema, atau API**.

## Status Saat Ini (sebelum Fase H)

| Komponen | Kondisi | File |
|----------|---------|------|
| Sidebar Owner | 19 item (9 Operasional + 10 Keputusan) — 6 duplikat dgn admin | `frontend/src/config/navigation.ts:38-68` |
| Sidebar Admin | 6 item — compact, sudah baik | `frontend/src/config/navigation.ts:81-91` |
| Sidebar Owner-Admin | Copy admin + route ubah `/dashboard`→`/admin-dashboard` | `frontend/src/config/navigation.ts:94-98` |
| DashboardAdmin | 6 tab area dalam 1 file ~800 baris | `frontend/src/pages/dashboard/DashboardAdmin.tsx` |
| AdminWorkspaces | 5 tabel workspace + 4 sub-komponen diekstrak (bagus) | `frontend/src/pages/dashboard/AdminWorkspaces.tsx` |
| OwnerDashboardPage | Full page KPI + chart + AI, ~350 baris | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` |
| RoleWorkspaceTabs | 7 tab (owner) vs 6 tab (admin) vs 6 tab (owner-admin) | `frontend/src/components/workspace/RoleWorkspaceTabs.tsx` |
| AI Owner | `AiAssistButton` + DeepSeek brief | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx:310-360` |
| Assistant Admin | `AssistantPanel` rules-based (non-AI) | `frontend/src/components/command-center/` |
| Toggle Owner↔Admin | SUDAH ADA — route split + localStorage | `frontend/src/components/layout/AppLayout.tsx:195-210` |

## Keputusan Fase H

> **KEPUTUSAN OWNER (2026-06-20) — penambal "fitur yatim" hasil review:**
> - **Refund Kalah-Cepat (`/loss-refunds`, OWNER-only)** TIDAK boleh hilang. Karena tak boleh nambah item sidebar (tetap 7), route ini dimasukkan ke `activePaths` item **"Akuntansi & Aset"** → `['/finance/accounting-setup', '/finance/assets', '/loss-refunds']`. Halaman tetap utuh.
> - **Pengumuman (`/announcements`)** dihapus dari sidebar (sesuai H1) TAPI diakses via **tombol 📣 di topbar, di sebelah ikon lonceng**. Tombol itu sudah ada untuk Admin & Owner-mode-Admin; kondisinya diperlebar ke **Owner mode Kokpit** juga ([AppLayout.tsx:450](../frontend/src/components/layout/AppLayout.tsx#L450) → `{isAdmin || isOwner ? ...}`).
> - **Koreksi angka:** sidebar Owner sebelum H = **18 item (9 Operasional + 9 Keputusan)**, bukan 19. Daftar "PERTAHANKAN" di §H1 yang melistkan 10 item digantikan oleh tabel target 7 item + blok kode final di §H1 (itu yang dipakai).

1. **Toggle Kokpit↔Area Admin TETAP** — arsitektur ini bersih, tidak diubah.
2. **Sidebar Kokpit Owner dipangkas** — 9 item Operasional yang duplikat dengan admin DIHAPUS dari sidebar owner. Owner yang butuh operasional harian pakai toggle 🔧 Area Admin.
3. **Dashboard admin 6 area → 3 area** — "Hari Ini" + "Penghuni & Uang" (merge stays+finance) + "Operasional" (merge tickets+staff+rooms).
4. **"Minat Layanan" di-merge ke "Layanan Tambahan"** — cukup 1 entry sidebar untuk keduanya.
5. **AI panel di Owner Dashboard** — tetap, tidak diubah (Fase G). `AssistantPanel` di Admin dashboard tidak di-upgrade (biaya AI; owner belum minta).
6. **Tidak menyentuh backend, schema, API, atau flow bisnis.** Murni frontend refactor.

---

## Peta Rujukan Fase H

| ID | Task | File yang Disentuh | Risiko |
|----|------|-------------------|--------|
| **H1** | Compact Owner Sidebar (19→7 item) | `navigation.ts` | **MEDIUM** — 12 item sidebar hilang dari owner, owner harus sadar toggle Area Admin |
| **H2** | Compact Admin Dashboard (6→3 area) | `DashboardAdmin.tsx`, `RoleWorkspaceTabs.tsx`, `AdminWorkspaces.tsx` | **HIGH** — restruktur dashboard admin, banyak query+UI berubah |
| **H3** | Merge Minat Layanan ke Layanan Tambahan | `navigation.ts`, `ServiceInterestsPage.tsx` (opsional) | **LOW** — hanya routing+sidebar |
| **H4** | Hapus duplicate entry "Pengeluaran" & "Pendapatan Tambahan" dari sidebar owner | `navigation.ts` | **LOW** — sudah ada di sidebar admin |
| **H5** | Polish: responsive check & breadcrumb label | `AppLayout.tsx`, CSS | **LOW** — polish visual |

---

## H1 — Compact Owner Sidebar (19 → 7 item)

### Kondisi saat ini

Owner sidebar punya 2 grup: **"Operasional"** (9 item) + **"Keputusan Owner"** (10 item).

**Grup "Operasional" (9 item) — akan dihapus semua:**
```
✅ HAPUS: Kokpit Owner           → /owner-dashboard   (pindah ke "Keputusan Owner" sbg item pertama)
✅ HAPUS: Masa Sewa & Penghuni   → /stays              (owner pakai Area Admin)
✅ HAPUS: Tagihan & Piutang      → /invoices           (owner pakai Area Admin)
✅ HAPUS: Pengeluaran            → /expenses           (owner pakai Area Admin)
✅ HAPUS: Pendapatan Tambahan    → /ancillary-revenue  (owner pakai Area Admin)
✅ HAPUS: Kamar & Inventaris     → /rooms              (owner pakai Area Admin)
✅ HAPUS: Kinerja Staff          → /staff-performance  (owner pakai Area Admin)
✅ HAPUS: Pengumuman             → /announcements      (owner pakai Area Admin)
✅ HAPUS: Minat Layanan          → /service-interests  (digabung ke Layanan Tambahan — lihat H3)
```

**Grup "Keputusan Owner" (10 item) — dipertahankan + tambah Kokpit Owner + Laporan di atas:**
```
PERTAHANKAN (7 item):
  1. 📈 Kokpit Owner             → /owner-dashboard   (dipindah dari Operasional)
  2. 📊 Laporan Bisnis           → /reports
  3. 🧭 Analisa Pasar (AI)       → /market-analysis
  4. 📘 Akuntansi                → /finance/accounting-setup
  5. 🏗️ Aset & Depresiasi        → /finance/assets
  6. ↩️ Refund Kalah-Cepat       → /loss-refunds
  7. 🎁 Loyalitas & Reward       → /loyalty
  8. 👤 Akun User                → /users
  9. ⚙️ Pengaturan               → /settings
 10. 🛎️ Layanan Tambahan         → /additional-services  (merge Minat Layanan — lihat H3)

HAPUS dari Keputusan Owner:
  ❌ 🛎️ Layanan Tambahan lama (digantikan entry merge H3)
```

### Target akhir (7 item)

Grup tunggal: **"Keputusan Owner"** — 7 item:

| # | Label | Icon | Route | Hint |
|---|-------|------|-------|------|
| 1 | Kokpit Owner | 📈 | `/owner-dashboard` | KPI bisnis, status kokpit, sinyal risiko, dan tren. |
| 2 | Laporan Bisnis | 📊 | `/reports` | Operasional, laba rugi, arus kas, neraca, dan rasio. |
| 3 | Analisa Pasar (AI) | 🧭 | `/market-analysis` | SWOT/PESTLE/kompetitor dengan AI DeepSeek. |
| 4 | Akuntansi & Aset | 📘 | `/finance/accounting-setup` | COA, periode, saldo awal, jurnal, aset & depresiasi. *(gabung /finance/accounting-setup + /finance/assets)* |
| 5 | Loyalitas & Reward | 🎁 | `/loyalty` | Katalog reward, kelola poin, setujui penukaran tenant. |
| 6 | Akun & Layanan | 👤 | `/users` | Kelola akun user + layanan tambahan. *(gabung /users + /additional-services + /service-interests)* |
| 7 | Pengaturan | ⚙️ | `/settings` | FAQ publik, foto kamar, konten halaman tamu, tarif, AI. |

> **CATATAN:** Item "Akuntansi & Aset" menggabungkan 2 route (`/finance/accounting-setup` + `/finance/assets`) yang tadinya terpisah. Kedua halaman TETAP ADA, hanya sidebar entry-nya digabung dengan `activePaths` yang mencakup keduanya. Begitu juga "Akun & Layanan" menggabungkan `/users` + `/additional-services` + `/service-interests`.

### Langkah implementasi (H1)

#### Step 1 — Baca file target
```
frontend/src/config/navigation.ts
```

#### Step 2 — Tulis ulang `ownerSections`

**Cari kode:**
```typescript
// Baris ~38
const ownerSections: NavigationSection[] = [
  {
    title: 'Operasional',
    links: [
```

**Ganti seluruh `ownerSections` (dari baris `const ownerSections` sampai `];` penutup sebelum `export const adminSections`) dengan:**

```typescript
const ownerSections: NavigationSection[] = [
  {
    title: 'Keputusan Owner',
    links: [
      { to: '/owner-dashboard', label: 'Kokpit Owner', icon: '📈', hint: 'KPI bisnis, status kokpit, sinyal risiko, dan tren.' },
      { to: '/reports', label: 'Laporan Bisnis', icon: '📊', hint: 'Operasional, laba rugi, arus kas, neraca, dan rasio keuangan.' },
      { to: '/market-analysis', label: 'Analisa Pasar (AI)', icon: '🧭', hint: 'Ditemani AI DeepSeek: SWOT, PESTLE, dan analisa kompetitor.' },
      { to: '/finance/accounting-setup', label: 'Akuntansi & Aset', icon: '📘', hint: 'Bagan Akun, periode, saldo awal, jurnal, aset tetap, depresiasi, dan refund kalah-cepat.', activePaths: ['/finance/accounting-setup', '/finance/assets', '/loss-refunds'] },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', hint: 'Katalog reward, kelola poin, dan setujui penukaran tenant.' },
      { to: '/users', label: 'Akun & Layanan', icon: '👤', hint: 'Kelola akun owner/admin/staff/penghuni, layanan tambahan, dan minat tenant.', activePaths: ['/users', '/tenants', '/additional-services', '/service-interests'] },
      { to: '/settings', label: 'Pengaturan', icon: '⚙️', hint: 'FAQ publik, foto kamar, konten halaman tamu, tarif dasar, dan konfigurasi AI.' },
    ],
  },
];
```

#### Step 3 — Hapus duplikasi `export const adminSections` (tidak ada perubahan)

`adminSections` TETAP seperti sekarang. Tidak ada perubahan.

#### Step 4 — Periksa konsumen sidebar

**Anchor (grep):**
- `getNavigationSections` dipanggil di `AppLayout.tsx:214` → tidak perlu diubah (fungsinya tetap sama)
- `getNavigationLinks` dipanggil di `AppLayout.tsx:219` → tidak perlu diubah

**Tidak ada perubahan di `AppLayout.tsx`** — fungsi `getNavigationSections` sudah menangani pengurangan item otomatis.

#### Step 5 — Verifikasi

- [ ] Sidebar Kokpit Owner hanya menampilkan 7 item dalam 1 grup "Keputusan Owner"
- [ ] Klik toggle 🔧 "Area Admin" → sidebar berubah ke 6 item admin
- [ ] Klik toggle 📈 "Kokpit Owner" → sidebar kembali ke 7 item
- [ ] Semua route di `activePaths` tetap bisa diakses (tidak 404)
- [ ] `cd frontend && npm run build` PASS

---

## H2 — Compact Admin Dashboard (6 → 3 area tab)

### Kondisi saat ini

`DashboardAdmin.tsx` menampilkan 6 area tab yang diatur oleh state `activeArea`:

| Tab | Area | Query data |
|-----|------|-----------|
| Hari Ini | `today` | rooms + stays + invoices + tickets + inventory + renew + checkout + payment-review + auto-ops |
| Masa Sewa | `stays` | stays + renew + checkout |
| Keuangan | `finance` | invoices + payment-review |
| Tiket | `tickets` | tickets |
| Staff | `staff` | tickets + staff-performance |
| Kamar & Stok | `rooms` | rooms + inventory |

### Target akhir (3 tab)

| # | Tab | Area | Isi | Warna |
|---|-----|------|-----|-------|
| 1 | **Ringkasan** | `overview` | Status strip + action queue + auto-ops + chart overview (semua query) | Default |
| 2 | **Penghuni & Uang** | `stays-finance` | Masa Sewa (stays+renew+checkout) + Finance (invoices+payment-review) — merge stays+finance | Biru |
| 3 | **Operasional** | `ops` | Tiket + Staff + Kamar & Stok — merge tickets+staff+rooms | Hijau |

### Langkah implementasi (H2)

#### Step 1 — Update `RoleWorkspaceTabs.tsx`

**File:** `frontend/src/components/workspace/RoleWorkspaceTabs.tsx`

**Cari fungsi `buildAdminTabs`:**
```typescript
function buildAdminTabs(base: string) {
  return [
    { id: 'today', label: 'Hari Ini', ... },
    { id: 'stays', label: 'Masa Sewa', ... },
    { id: 'finance', label: 'Keuangan', ... },
    { id: 'tickets', label: 'Tiket', ... },
    { id: 'staff', label: 'Staff', ... },
    { id: 'rooms', label: 'Kamar & Stok', ... },
  ];
}
```

**Ganti dengan:**
```typescript
function buildAdminTabs(base: string) {
  return [
    { id: 'overview', label: 'Ringkasan', to: base, match: (path: string, search: URLSearchParams) => path === base && !search.get('area') },
    { id: 'stays-finance', label: 'Penghuni & Uang', to: `${base}?area=stays-finance`, match: (path: string, search: URLSearchParams) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') || path.startsWith('/invoices') || path.startsWith('/payment-submissions') || path.startsWith('/invoice-payments') || path.startsWith('/expenses') || (path === base && search.get('area') === 'stays-finance') },
    { id: 'ops', label: 'Operasional', to: `${base}?area=ops`, match: (path: string, search: URLSearchParams) => path.startsWith('/tickets') || path.startsWith('/staff') || path.startsWith('/staff-routines') || ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'].some((prefix) => path.startsWith(prefix)) || (path === base && search.get('area') === 'ops') },
  ];
}
```

**Cari OWNER_TABS dan ganti dengan versi 3 tab juga:**
```typescript
const OWNER_TABS = [
  { id: 'overview', label: 'Ringkasan', to: '/owner-dashboard', match: (path: string) => path === '/owner-dashboard' },
  { id: 'stays-finance', label: 'Penghuni & Uang', to: '/stays', match: (path: string) => path.startsWith('/stays') || path.startsWith('/tenants') || path.startsWith('/renew-requests') || path.startsWith('/invoices') || path.startsWith('/payment-submissions') || path.startsWith('/expenses') || path.startsWith('/wifi-sales') || path.startsWith('/ancillary-revenue') },
  { id: 'ops', label: 'Laporan & Aset', to: '/reports', match: (path: string) => path.startsWith('/reports') || path.startsWith('/staff') || path.startsWith('/tickets') || path.startsWith('/rooms') || path.startsWith('/inventory') || path.startsWith('/finance') || path.startsWith('/settings') || path.startsWith('/users') || path.startsWith('/announcements') },
];
```

#### Step 2 — Update `DashboardAdmin.tsx`

**File:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`

**A. Ubah tipe `AdminQueueArea`:**
```typescript
// Cari:
type AdminQueueArea = 'today' | 'stays' | 'finance' | 'tickets' | 'staff' | 'rooms';

// Ganti dengan:
type AdminQueueArea = 'overview' | 'stays-finance' | 'ops';
```

**B. Ubah `ADMIN_QUEUE_AREAS`:**
```typescript
// Cari:
const ADMIN_QUEUE_AREAS: Array<{ id: AdminQueueArea; label: string; helper: string }> = [
  { id: 'today', label: 'Hari Ini', helper: '...' },
  ...
];

// Ganti dengan:
const ADMIN_QUEUE_AREAS: Array<{ id: AdminQueueArea; label: string; helper: string }> = [
  { id: 'overview', label: 'Ringkasan', helper: 'Orientasi cepat: kondisi hari ini dan pekerjaan yang butuh keputusan.' },
  { id: 'stays-finance', label: 'Penghuni & Uang', helper: 'Booking, penghuni aktif, perpanjangan, keluar, tagihan, dan pembayaran.' },
  { id: 'ops', label: 'Operasional', helper: 'Tiket, staff, rutinitas, kamar, stok, dan inventaris.' },
];
```

**C. Ubah `normalizeAdminArea`:**
```typescript
// Cari:
function normalizeAdminArea(value: string | null | undefined): AdminQueueArea {
  if (value === 'today' || value === 'announcements') return 'today';
  return ADMIN_QUEUE_AREAS.some((area) => area.id === value) ? value as AdminQueueArea : 'today';
}

// Ganti dengan:
function normalizeAdminArea(value: string | null | undefined): AdminQueueArea {
  if (value === 'stays-finance' || value === 'stays' || value === 'finance') return 'stays-finance';
  if (value === 'ops' || value === 'tickets' || value === 'staff' || value === 'rooms') return 'ops';
  return 'overview';
}
```

**D. Ubah `itemMatchesAdminArea`:**
```typescript
// Cari fungsi itemMatchesAdminArea(…)
// Ganti dengan:
function itemMatchesAdminArea(item: ActionQueueItem, area: AdminQueueArea): boolean {
  if (area === 'overview') return true;
  const haystack = `${item.ruleId ?? ''} ${item.entityType ?? ''} ${item.type ?? ''} ${item.subject ?? ''}`.toLowerCase();
  if (area === 'stays-finance') return /stay|booking|renew|checkout|tenant|sewa|pemesanan|perpanjangan|payment|invoice|tagihan|bayar|bukti|overdue|submission/.test(haystack);
  if (area === 'ops') return /ticket|tiket|repair|perbaikan|staff|routine|checklist|laporan|kinerja|room|kamar|inventory|inventaris|maintenance|stok|barang/.test(haystack);
  return true;
}
```

**E. Ubah query enabled conditions — ganti logika `needs*Data`:**

Di dalam komponen `AdminDashboard`, cari variabel-variabel ini dan ganti:

```typescript
// Cari:
const needsTodayData = activeArea === 'today';
const needsStaysData = needsTodayData || activeArea === 'stays';
const needsFinanceData = needsTodayData || activeArea === 'finance' || activeArea === 'stays';
const needsTicketData = needsTodayData || activeArea === 'tickets' || activeArea === 'staff';
const needsRoomData = needsTodayData || activeArea === 'rooms';
const needsInventoryData = needsTodayData || activeArea === 'rooms';
const needsAutoOpsData = needsTodayData || activeArea === 'stays' || activeArea === 'finance';
const needsStaffPerformanceData = activeArea === 'staff';

// Ganti dengan:
const needsOverviewData = activeArea === 'overview';
const needsStaysFinanceData = needsOverviewData || activeArea === 'stays-finance';
const needsOpsData = needsOverviewData || activeArea === 'ops';
```

Lalu update semua `enabled:` di `useQuery`:

| Query | enabled: lama | enabled: baru |
|-------|--------------|---------------|
| roomsQuery | `needsRoomData` | `needsOpsData \|\| needsOverviewData` |
| inventoryItemsQuery | `needsInventoryData` | `needsOpsData \|\| needsOverviewData` |
| staysQuery | `needsStaysData` | `needsStaysFinanceData` |
| invoicesQuery | `needsFinanceData` | `needsStaysFinanceData` |
| ticketsQuery | `needsTicketData` | `needsOpsData` |
| renewRequestsQuery | `needsStaysData` | `needsStaysFinanceData` |
| checkoutRequestsPendingQuery | `needsStaysData` | `needsStaysFinanceData` |
| checkoutRequestsApprovedQuery | `needsStaysData` | `needsStaysFinanceData` |
| paymentReviewQuery | `needsFinanceData` | `needsStaysFinanceData` |
| staffPerformanceQuery | `needsStaffPerformanceData` | `needsOpsData` |
| autoOpsQuery | `needsAutoOpsData` | `needsOverviewData` |

**F. Ubah `AdminOverviewCharts` — merge chart stays + finance ke 1 panel:**

Di `AdminOverviewCharts`, ganti array `panels`:

```typescript
// Cari:
const panels: Array<{ id: string; area: AdminQueueArea[]; node: ReactNode }> = [
  { id: 'stays-overview', area: ['stays'], node: ... },
  { id: 'finance', area: ['finance'], node: ... },
  { id: 'tickets', area: ['tickets'], node: ... },
  { id: 'rooms', area: ['rooms'], node: ... },
  { id: 'staff', area: ['staff'], node: ... },
];

// Ganti dengan:
const panels: Array<{ id: string; area: AdminQueueArea[]; node: ReactNode }> = [
  { id: 'stays-finance-overview', area: ['stays-finance'], node: (
    <Row className="g-3">
      <Col lg={6}><SmartChartPanel title="Penghuni & Masa Sewa" subtitle="Booking, bayar, perpanjangan, keluar." points={stayPoints} defaultMode="bar" ctaLabel="Buka masa sewa" ctaTo="/stays" totalLabel="Alur" /></Col>
      <Col lg={6}><SmartChartPanel title="Keuangan" subtitle="Tagihan, bukti pembayaran, draft, overdue." points={makeAdminFinancePoints(invoices, pendingPaymentReviewCount)} defaultMode="bar" ctaLabel="Semua tagihan" ctaTo="/invoices" totalLabel="Keuangan" /></Col>
    </Row>
  ) },
  { id: 'ops-overview', area: ['ops'], node: (
    <Row className="g-3">
      <Col lg={4}><SmartChartPanel title="Tiket" subtitle="Baru, dikerjakan, menunggu cek." points={makeAdminTicketPoints(tickets)} defaultMode="bar" ctaLabel="Buka tiket" ctaTo="/tickets" totalLabel="Tiket" /></Col>
      <Col lg={4}><SmartChartPanel title="Staff" subtitle="Pekerjaan dari tiket aktif." points={makeAdminStaffPoints(tickets)} defaultMode="bar" ctaLabel="Kinerja staff" ctaTo="/staff-performance" totalLabel="Staff" /></Col>
      <Col lg={4}><SmartChartPanel title="Kamar" subtitle="Status okupansi dan kesiapan." points={makeRoomPoints(rooms)} defaultMode="bar" ctaLabel="Status kamar" ctaTo="/rooms" totalLabel="Kamar" /></Col>
    </Row>
  ) },
];
```

**G. Update render conditions di JSX (enumerasi eksplisit — JANGAN tebak):**

Pemetaan kondisi lama → baru di blok `return (...)`:

| Komponen render | Kondisi lama | Kondisi baru |
|-----------------|--------------|--------------|
| `AdminOperationsCommandQueue` | `activeArea === 'today'` | `activeArea === 'overview'` |
| `AdminTodayStatusStrip` | `activeArea === 'today'` | `activeArea === 'overview'` |
| `ActionQueueTable` (antrean) | `activeArea === 'today'` | `activeArea === 'overview'` |
| `AdminAreaInternalMenu` | `activeArea !== 'today'` | `activeArea !== 'overview'` |
| `AdminProcessLine` | `activeArea === 'stays'` | `activeArea === 'stays-finance'` |
| `AdminStaysUnifiedList` | `activeArea === 'stays'` | `activeArea === 'stays-finance'` |
| `AdminFinanceWorkspace` | `activeArea === 'finance'` | `activeArea === 'stays-finance'` |
| `AdminTicketsWorkspace` | `activeArea === 'tickets'` | `activeArea === 'ops'` |
| `AdminStaffFrontlineList` | `activeArea === 'staff'` | `activeArea === 'ops'` |
| `AdminRoomsStockWorkspace` | `activeArea === 'rooms'` | `activeArea === 'ops'` |
| `AutoOpsControlPanel`+`AdminSlaMiniNote` | `today \|\| stays \|\| finance` | `activeArea === 'overview'` |
| `AssistantInsightLine` msg | `activeArea === 'today'` | `activeArea === 'overview'` |

> Konsekuensi: tab **"Penghuni & Uang"** merender `AdminProcessLine` + `AdminStaysUnifiedList` + `AdminFinanceWorkspace` berurutan; tab **"Operasional"** merender `AdminTicketsWorkspace` + `AdminStaffFrontlineList` + `AdminRoomsStockWorkspace`.
> `activeAreaMenuItems` (AdminAreaInternalMenu) di-rework dari 5 cabang (stays/finance/tickets/staff/rooms) → **2 cabang** (`stays-finance` gabung menu stays+finance; `ops` gabung menu tickets+staff+rooms).
> `AdminCommandHeader.isToday` (bandingkan label `'Hari Ini'`) → bandingkan `'Ringkasan'`.

#### Step 3 — Update `AdminWorkspaces.tsx` (jika diperlukan)

File `AdminWorkspaces.tsx` sudah mengekspos komponen-komponen independen:
- `AdminStaffFrontlineList`
- `AdminStaysUnifiedList`
- `AdminFinanceWorkspace`
- `AdminTicketsWorkspace`
- `AdminRoomsStockWorkspace`

**Tidak perlu diubah** — komponen ini dipanggil dari DashboardAdmin dengan data query. Hanya pemanggil di DashboardAdmin yang berubah.

#### Step 4 — Verifikasi

- [ ] Dashboard admin menampilkan 3 tab: "Ringkasan", "Penghuni & Uang", "Operasional"
- [ ] Tab "Ringkasan" menampilkan status strip + action queue + auto-ops panel
- [ ] Tab "Penghuni & Uang" menampilkan stays + finance charts + tabel
- [ ] Tab "Operasional" menampilkan tickets + staff + rooms charts + tabel
- [ ] Semua query tetap berjalan tanpa error
- [ ] Switch tab tidak menyebabkan reload berlebihan
- [ ] `cd frontend && npm run build` PASS
- [ ] Test mobile: 3 tab muat di layar kecil (max-width: 100%)

---

## H3 — Merge "Minat Layanan" ke "Layanan Tambahan"

### Kondisi saat ini

- `/additional-services` — CRUD daftar layanan tambahan (admin/owner kelola)
- `/service-interests` — daftar tenant yang menyatakan minat (admin/owner proses)
- Keduanya jadi entry sidebar TERPISAH di owner

### Target

Cukup **1 entry sidebar** "Layanan Tambahan" (`/additional-services`) yang mencakup kedua halaman. Halaman `/service-interests` TETAP ADA dan tetap bisa diakses — hanya tidak ada lagi di sidebar.

### Langkah implementasi (H3)

#### Step 1 — Update `ownerSections` (sudah dilakukan di H1)

Entry "Layanan Tambahan" SUDAH TIDAK ADA di sidebar owner hasil compact. Sebagai gantinya, `activePaths` pada item "Akun & Layanan" (`/users`) mencakup `/additional-services` dan `/service-interests`.

#### Step 2 — Opsional: tambah tab di `AdditionalServices` page

**TIDAK WAJIB** — bila owner ingin tab "Minat" dalam halaman Layanan Tambahan, bisa dibuat sebagai enhancement terpisah. Untuk Fase H, cukup redirect sidebar entry.

#### Step 3 — Verifikasi

- [ ] Sidebar Owner tidak lagi menampilkan "Minat Layanan" sebagai entry terpisah
- [ ] Halaman `/service-interests` tetap bisa diakses via URL langsung atau dari "Akun & Layanan" di sidebar
- [ ] Sidebar Admin tidak berubah
- [ ] `cd frontend && npm run build` PASS

---

## H4 — Hapus Duplicate Entry "Pengeluaran" & "Pendapatan Tambahan" dari Sidebar Owner

### Kondisi

Owner sidebar punya 3 entry terpisah untuk domain keuangan:
- Tagihan & Piutang (`/invoices`)
- Pengeluaran (`/expenses`)
- Pendapatan Tambahan (`/ancillary-revenue`)

Admin sidebar hanya punya 1 entry: "Keuangan" (`/invoices`) dengan `activePaths` mencakup semuanya.

### Target

Sidebar owner hasil H1 sudah menghapus ketiganya. Owner mengakses `/invoices`, `/expenses`, `/ancillary-revenue` via **Area Admin** (toggle 🔧) — di mana sidebar admin sudah mencakup semuanya dalam 1 entry "Keuangan".

**Tidak ada langkah tambahan** — H1 sudah menyelesaikan ini.

---

## H5 — Polish: Breadcrumb & Responsive

### Langkah implementasi (H5)

#### Step 1 — Update breadcrumb root label

**File:** `frontend/src/components/layout/AppLayout.tsx`

**Cari fungsi `getBreadcrumbParts`:**
```typescript
// Cari:
if (isOwner) {
  const root = ownerViewMode === 'admin' ? 'Area Admin' : 'Kokpit Owner';
  ...
}
```

**Pastikan root label tetap:**
- Mode 📈 Kokpit Owner → breadcrumb root = "Kokpit Owner"
- Mode 🔧 Area Admin → breadcrumb root = "Area Admin"

**Tidak perlu diubah** — kode existing sudah benar.

#### Step 2 — Check responsive tab overflow

3 tab ("Ringkasan", "Penghuni & Uang", "Operasional") harus muat di mobile.

**File:** `frontend/src/styles/08-admin.css`

**Anchor (grep):** `.role-workspace-tabs`

Cek apakah CSS `.role-workspace-tabs` sudah support wrapping atau horizontal scroll di mobile. Jika 3 tab terlalu lebar, tambahkan:

```css
@media (max-width: 480px) {
  .role-workspace-tabs button {
    font-size: 0.8rem;
    padding: 0.35rem 0.6rem;
  }
}
```

#### Step 3 — Verifikasi

- [ ] Breadcrumb root menampilkan "Kokpit Owner" atau "Area Admin" sesuai mode
- [ ] 3 tab admin muat di viewport 375px
- [ ] `cd frontend && npm run build` PASS

---

## Gate Global Fase H

Setiap task H1-H5 selesai, jalankan:

1. **Frontend build:** `cd frontend && npm run build` → harus PASS tanpa error/warning baru
2. **Backend typecheck:** `cd backend && npx tsc --noEmit` → harus PASS (tidak ada perubahan backend)
3. **Manual smoke test (browser):**
   - Login sebagai OWNER → lihat sidebar Kokpit Owner (7 item) ✅
   - Klik toggle 🔧 Area Admin → sidebar berubah (6 item admin) + route ke `/admin-dashboard` ✅
   - Dashboard admin: 3 tab muncul, klik setiap tab menampilkan data ✅
   - Tidak ada halaman 404 di route yang tadinya ada di sidebar owner ✅

---

## Risiko & Catatan

| Risiko | Mitigasi |
|--------|----------|
| Owner bingung kehilangan item sidebar | **Toggle Area Admin tetap ada di topbar** — owner tinggal klik untuk akses operasional. Sidebar mode admin menampilkan SEMUA item operasional yang dihapus dari Kokpit Owner. |
| Tab "Penghuni & Uang" terlalu berat (query banyak) | Query difilter per area: `stays-finance` hanya load stays+invoices+payment-review — bukan semua 12 query seperti `overview`. |
| Tab "Operasional" terlalu luas (tiket+staff+kamar) | Area `ops` load tickets (max 100) + rooms (max 120) — masih dalam batas wajar. Staff performance hanya load saat tab aktif. |
| Route `/service-interests` tidak ada di sidebar | Tetap bisa diakses via URL langsung. Owner bisa bookmark. Atau enhancement nanti: tab dalam `/additional-services`. |

---

## Dependensi

- **Tidak ada dependensi ke Fase A-G.** Fase H independen, bisa dikerjakan kapan saja.
- **Tidak menyentuh backend, schema, atau API.**
- **Tidak butuh approval owner** — murni UI refactor (kecuali owner ingin review sebelum eksekusi).

## Urutan Pengerjaan

```
H1 (sidebar compact) → H2 (dashboard tab compact) → H3 (merge selesai otomatis via H1) → H5 (polish)
```

H4 otomatis terselesaikan oleh H1 — tidak ada langkah tambahan.

---

## UAT Fase H

- [ ] **UAT-H1:** Login OWNER → sidebar Kokpit Owner hanya 7 item (1 grup: "Keputusan Owner") → klik setiap item membuka halaman yang benar
- [ ] **UAT-H2:** Login ADMIN → dashboard `/dashboard` menampilkan 3 tab → klik setiap tab menampilkan data yang sesuai
- [ ] **UAT-H3:** Toggle 🔧 Area Admin → sidebar berubah ke 6 item admin → klik "Keuangan" membuka `/invoices` → sidebar admin mencakup `/expenses` dan `/ancillary-revenue` via activePaths
- [ ] **UAT-H4:** Halaman `/service-interests` tetap bisa diakses (tidak 404) walau tidak ada di sidebar
- [ ] **UAT-H5:** Breadcrumb root berubah sesuai mode (Kokpit Owner vs Area Admin) → 3 tab admin muat di mobile 375px
- [ ] **UAT-REGRESSION:** Semua halaman existing tidak 404 → Login TENANT → portal berfungsi normal → Login STAFF → staff workspace berfungsi normal
