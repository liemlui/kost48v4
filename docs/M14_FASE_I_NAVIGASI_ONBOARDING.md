# KOST48 V5 — Fase I: De-Duplikasi Navigasi & Onboarding

> **Dossier eksekutor** — setiap task punya blok kode SEARCH/REPLACE siap copas.
> AI lemah (v4-flash): baca task, copas blok kode, jalankan gate build. Tidak perlu berpikir.
> **Bahasa kerja: Indonesia.** Commit prefix `ui:`.

## Tujuan

Lapis ke-2 pembersihan UI/UX setelah Fase H:
1. **Hapus duplikasi** `AdminAreaInternalMenu` (chip sub-menu dalam dashboard = 100% duplikat sidebar).
2. **Unifikasi** `StaffTopWorkspaceNav` — satu sumber kebenaran di `navigation.ts`.
3. **Ekspos rute tersembunyi** — `/meter-readings` belum tercakup `activePaths` sidebar.
4. **Onboarding tenant** — komponen `GettingStartedGuide` untuk orientasi user baru.
5. **Breadcrumb klik** — segmen pertama jadi `<NavLink>`.
6. **Verifikasi** guide strip adaptif tenant.

**Semua frontend-only** — tidak sentuh backend, schema, atau API.

---

## Status Saat Ini (sebelum Fase I)

| Komponen | Masalah | Lokasi |
|----------|---------|--------|
| `AdminAreaInternalMenu` | Sub-menu 10+ chip duplikasi sidebar 100% | `DashboardAdmin.tsx:50-58, 157-178, 452-475, 538` |
| `StaffTopWorkspaceNav` | Hardcode 4 tab, tidak pakai `staffSections` | `StaffTopWorkspaceNav.tsx:70-77` vs `navigation.ts:79-89` |
| `/meter-readings` | Tidak ada di `activePaths` sidebar manapun | `navigation.ts` adminSections |
| Onboarding tenant | Tidak ada orientasi untuk user baru | Belum ada komponen |
| Breadcrumb | `<span>` semua, tidak bisa diklik | `AppLayout.tsx` breadcrumb render |

---

## Peta Rujukan

| ID | Task | File | Risiko |
|----|------|------|--------|
| **I1** | Hapus `AdminAreaInternalMenu` | `DashboardAdmin.tsx` | LOW |
| **I2** | Unifikasi `StaffTopWorkspaceNav` | `StaffTopWorkspaceNav.tsx` | LOW |
| **I3** | Ekspos `/meter-readings` di sidebar | `navigation.ts` | LOW |
| **I4** | `GettingStartedGuide` tenant | `GettingStartedGuide.tsx` [NEW], `TenantWorkspaceTabs.tsx` | LOW |
| **I5** | Breadcrumb klik | `AppLayout.tsx` | LOW |
| **I6** | Verifikasi guide strip | `TenantWorkspaceTabs.tsx` (no-op) | NONE |

---

## I1 — Hapus AdminAreaInternalMenu (5 edit)

**Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`

**5 edit berurutan.** Jalankan sebagai `multi_edit` atau satu per satu.

### Edit 1/5 — Hapus type AdminAreaMenuItem

```
frontend/src/pages/dashboard/DashboardAdmin.tsx
<<<<<<< SEARCH
type AdminAreaMenuItem = {
  id: string;
  label: string;
  helper: string;
  to: string;
  icon: string;
  count?: number;
  tone?: 'success' | 'info' | 'warning' | 'danger';
  active?: boolean;
};

=======
>>>>>>> REPLACE
```

### Edit 2/5 — Hapus fungsi AdminAreaInternalMenu

```
frontend/src/pages/dashboard/DashboardAdmin.tsx
<<<<<<< SEARCH
function AdminAreaInternalMenu({ title, items, onNavigate }: { title: string; items: AdminAreaMenuItem[]; onNavigate: (to: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="admin-area-internal-menu" aria-label={`Sub-menu ${title}`}>
      <div className="admin-area-internal-menu-head">
        <span>{title}</span>
        <small>Navigasi</small>
      </div>
      <div className="admin-area-internal-menu-scroll">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`admin-area-internal-chip ${item.tone ?? 'info'} ${item.active ? 'is-active' : ''}`.trim()}
            onClick={() => onNavigate(item.to)}
            title={item.helper}
          >
            <span className="admin-area-internal-chip-main">
              <span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span>
              <span className="admin-area-internal-label">{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && ['warning', 'danger'].includes(item.tone ?? '') ? <strong className="admin-area-internal-count">{item.count}</strong> : null}
            </span>
            <small>{item.helper}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

=======
>>>>>>> REPLACE
```

### Edit 3/5 — Hapus activeAreaMenuItems computed

```
frontend/src/pages/dashboard/DashboardAdmin.tsx
<<<<<<< SEARCH
  // FASE-H: sub-menu digabung mengikuti 3 area. 'stays-finance' = menu sewa + keuangan; 'ops' = tiket + staff + kamar/stok.
  const activeAreaMenuItems: AdminAreaMenuItem[] = activeArea === 'stays-finance' ? [
    { id: 'sf-all', icon: '💼', label: 'Semua', helper: 'Daftar utama penghuni & uang di tab ini', to: `${dashboardBase}?area=stays-finance`, count: pendingApprovalCount + waitingInitialPaymentCount + stays.length + pendingRenewCount + pendingCheckoutRequestCount + approvedCheckoutRequestCount + invoices.length, tone: 'info', active: true },
    { id: 'stays-bookings', icon: '📝', label: 'Booking Baru', helper: 'Review booking dan bayar awal', to: '/stays?status=BOOKINGS', count: pendingApprovalCount + waitingInitialPaymentCount, tone: pendingApprovalCount ? 'warning' : 'info' },
    { id: 'stays-active', icon: '🛏️', label: 'Masa sewa aktif', helper: 'Masa sewa sedang berjalan', to: '/stays', count: stays.length, tone: 'success' },
    { id: 'stays-renew', icon: '🔁', label: 'Perpanjangan', helper: 'Pengajuan perpanjangan dan cek meter', to: '/renew-requests', count: pendingRenewCount, tone: pendingRenewCount ? 'warning' : 'info' },
    { id: 'stays-checkout', icon: '🚪', label: 'Keluar', helper: 'Review keluar dan finalkan keluar', to: '/stays?status=BOOKINGS', count: pendingCheckoutRequestCount + approvedCheckoutRequestCount, tone: pendingCheckoutRequestCount || approvedCheckoutRequestCount ? 'warning' : 'info' },
    { id: 'stays-tenant', icon: '👤', label: 'Tenant', helper: 'Data penghuni dan akses portal', to: '/tenants', count: undefined, tone: 'info' },
    { id: 'finance-invoices', icon: '🧾', label: 'Tagihan', helper: 'Semua tagihan tenant', to: '/invoices', count: invoices.length, tone: 'info' },
    { id: 'finance-review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar menunggu dicek', to: '/payment-submissions/review', count: pendingPaymentReviewCount, tone: pendingPaymentReviewCount ? 'warning' : 'success' },
    { id: 'finance-overdue', icon: '⚠️', label: 'Terlambat', helper: 'Tagihan lewat jatuh tempo', to: '/invoices', count: overdueInvoices.length, tone: overdueInvoices.length ? 'danger' : 'success' },
    { id: 'finance-expenses', icon: '💸', label: 'Expenses', helper: 'Catatan pengeluaran operasional', to: '/expenses', count: undefined, tone: 'info' },
    { id: 'finance-history', icon: '📚', label: 'Riwayat Pembayaran', helper: 'Pembayaran invoice yang sudah tercatat', to: '/invoice-payments', count: undefined, tone: 'info' },
  ] : activeArea === 'ops' ? [
    { id: 'ops-all', icon: '🛠️', label: 'Semua', helper: 'Daftar utama operasional di tab ini', to: `${dashboardBase}?area=ops`, count: tickets.filter((ticket) => ticket.status !== 'CANCELLED').length + rooms.length, tone: 'info', active: true },
    { id: 'tickets-assign', icon: '👷', label: 'Perlu Assign', helper: 'Tiket baru belum punya petugas', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'OPEN' && !ticket.assignedToId).length, tone: 'warning' },
    { id: 'tickets-progress', icon: '🔧', label: 'Dikerjakan', helper: 'Sedang ditangani staff', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length, tone: 'info' },
    { id: 'tickets-check', icon: '✅', label: 'Perlu Cek', helper: 'Staff selesai, admin cek akhir', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'DONE').length, tone: 'warning' },
    { id: 'staff-checklist', icon: '📋', label: 'Checklist', helper: 'Checklist harian/mingguan/bulanan staff', to: '/staff-routines', count: undefined, tone: 'success' },
    { id: 'staff-performance', icon: '📈', label: 'Kinerja Staff', helper: 'Detail kinerja dan ulasan staff', to: '/staff-performance', count: undefined, tone: 'info' },
    { id: 'rooms-list', icon: '🏘️', label: 'Kamar', helper: 'Status kamar dan keterisian', to: '/rooms', count: rooms.length, tone: 'info' },
    { id: 'rooms-stock', icon: '📦', label: 'Stok Gudang', helper: 'Barang gudang dan stok minimum', to: '/inventory/gudang', count: inventoryItems.length, tone: 'info' },
    { id: 'rooms-low-stock', icon: '⚠️', label: 'Stok Menipis', helper: 'Barang butuh restock', to: '/inventory/gudang', count: inventoryItems.filter(isLowStockItem).length, tone: inventoryItems.filter(isLowStockItem).length ? 'warning' : 'success' },
  ] : [];

=======
>>>>>>> REPLACE
```

### Edit 4/5 — Hapus render call AdminAreaInternalMenu

```
frontend/src/pages/dashboard/DashboardAdmin.tsx
<<<<<<< SEARCH
      {activeArea !== 'overview' ? <AdminAreaInternalMenu title={`Menu ${activeAreaConfig.label}`} items={activeAreaMenuItems} onNavigate={navigate} /> : null}
=======
>>>>>>> REPLACE
```

### Edit 5/5 — Update teks header: sidebar, bukan chip

```
frontend/src/pages/dashboard/DashboardAdmin.tsx
<<<<<<< SEARCH
        <p>{headline}. Dashboard memuat data sesuai area kerja agar halaman lebih cepat; buka area lain dari chip atau sidebar.</p>
=======
        <p>{headline}. Dashboard memuat data sesuai area kerja. Gunakan sidebar kiri untuk membuka halaman detail.</p>
>>>>>>> REPLACE
```

**Gate:** `cd frontend; npm run build` PASS.
**UAT:** Login ADMIN → dashboard TIDAK menampilkan chip sub-menu. Sidebar berfungsi normal.

---

## I2 — Unifikasi StaffTopWorkspaceNav (3 edit)

**Target:** `frontend/src/components/staff/StaffTopWorkspaceNav.tsx`

**Masalah:** `links` array hardcode 4 item, tidak pakai `staffSections` dari `navigation.ts`. Tab "Tugas" (`/tickets`) hilang dari navigasi staff.

### Edit 1/2 — Import staffSections + pakai sebagai sumber link

Baca dulu file target: `frontend/src/components/staff/StaffTopWorkspaceNav.tsx`

```
frontend/src/components/staff/StaffTopWorkspaceNav.tsx
<<<<<<< SEARCH
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { fetchStaffRoutineToday } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';
import { listResource } from '../../api/resources';
import type { InventoryItem, RoomItem } from '../../types';
import { getInventoryHealth, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';
=======
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { fetchStaffRoutineToday } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';
import { listResource } from '../../api/resources';
import type { InventoryItem, RoomItem } from '../../types';
import { getInventoryHealth, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';
import { getNavigationLinks } from '../../config/navigation';
>>>>>>> REPLACE
```

### Edit 2/3 — Tambah key `tickets` ke counts return

```
frontend/src/components/staff/StaffTopWorkspaceNav.tsx
<<<<<<< SEARCH
    return {
      today: routineRemaining + actionTickets,
      rooms: roomProblems,
      warehouse: warehouseProblems,
      report: reportIssues,
    };
=======
    return {
      today: routineRemaining + actionTickets,
      tickets: actionTickets,
      rooms: roomProblems,
      warehouse: warehouseProblems,
      report: reportIssues,
    };
>>>>>>> REPLACE
```

### Edit 3/3 — Ganti links hardcode dengan getNavigationLinks

```
frontend/src/components/staff/StaffTopWorkspaceNav.tsx
<<<<<<< SEARCH
  const links = [
    { to: '/dashboard', label: 'Hari Ini', count: counts.today, key: 'today', hint: 'Semua pekerjaan hari ini' },
    { to: '/rooms', label: 'Kamar', count: counts.rooms, key: 'rooms', hint: 'Barang kamar, meter, dan kondisi kamar' },
    { to: '/staff-warehouse', label: 'Gudang', count: counts.warehouse, key: 'warehouse', hint: 'Stok dan alat umum' },
    { to: '/staff-report', label: 'Laporan', count: counts.report, key: 'report', hint: 'Bukti kerja bulanan' },
  ];
=======
  const navLinks = useMemo(() => getNavigationLinks('STAFF'), []);
  const links = useMemo(() => navLinks.map((link, idx) => {
    const keys = ['today', 'tickets', 'rooms', 'warehouse', 'report'] as const;
    const key = keys[idx] ?? 'today';
    const countMap: Record<string, number> = {
      today: counts.today,
      tickets: counts.tickets,
      rooms: counts.rooms,
      warehouse: counts.warehouse,
      report: counts.report,
    };
    return { to: link.to, label: link.label, count: countMap[key] ?? 0, key, hint: link.hint ?? link.label };
  }), [navLinks, counts]);
>>>>>>> REPLACE
```

**Gate:** `cd frontend; npm run build` PASS.
**UAT:** Login STAFF → 5 tab: Hari Ini, Tugas, Kamar & Stok, Gudang, Laporan. Count badge berfungsi.

---

## I3 — Ekspos /meter-readings di activePaths sidebar (1 edit)

**Target:** `frontend/src/config/navigation.ts`

**Cek:** `adminSections` → "Kamar & Stok" → `activePaths` belum mencakup `/meter-readings`.

### Edit 1/1 — Tambah /meter-readings ke activePaths

```
frontend/src/config/navigation.ts
<<<<<<< SEARCH
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, dan mutasi stok.', activePaths: ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements'] },
=======
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, mutasi stok, dan catatan meter.', activePaths: ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'] },
>>>>>>> REPLACE
```

**Gate:** `cd frontend; npm run build` PASS.
**UAT:** Buka `/meter-readings` → sidebar "Kamar & Stok" dalam state active.

---

## I4 — GettingStartedGuide untuk Tenant Baru (2 edit + 1 file baru)

### File baru: `frontend/src/components/tenant/GettingStartedGuide.tsx`

```
frontend/src/components/tenant/GettingStartedGuide.tsx
<<<<<<< SEARCH
=======
import { useNavigate } from 'react-router-dom';
import type { TenantPortalStage } from '../../hooks/useTenantPortalStage';

type Step = { icon: string; label: string; desc: string; to?: string };

function getSteps(stage: TenantPortalStage): Step[] {
  if (stage === 'browsing') {
    return [
      { icon: '🛏️', label: 'Pilih kamar', desc: 'Lihat katalog kamar yang tersedia dan pilih yang cocok untuk Anda.', to: '/rooms' },
      { icon: '📝', label: 'Ajukan pemesanan', desc: 'Isi form pemesanan. Admin akan me-review dan menyetujui booking Anda.', to: '' },
      { icon: '💰', label: 'Bayar tagihan awal', desc: 'Setelah disetujui, kirim bukti pembayaran DP 30% untuk konfirmasi.', to: '' },
    ];
  }
  if (stage === 'booking') {
    return [
      { icon: '👀', label: 'Pantau status', desc: 'Admin sedang me-review pemesanan Anda. Cek status di halaman ini secara berkala.', to: '/portal/bookings' },
      { icon: '💳', label: 'Bayar tagihan', desc: 'Setelah disetujui, segera bayar tagihan awal dan kirim bukti pembayaran.', to: '/portal/invoices' },
      { icon: '🔑', label: 'Dapat kunci', desc: 'Setelah pembayaran diverifikasi, kamar siap ditempati. Selamat datang di KOST48!', to: '' },
    ];
  }
  return [];
}

export default function GettingStartedGuide({ stage }: { stage: TenantPortalStage }) {
  const navigate = useNavigate();
  const steps = getSteps(stage);
  if (!steps.length) return null;

  return (
    <section className="getting-started-guide" aria-label="Panduan memulai">
      <div className="getting-started-head">
        <span className="page-eyebrow">Panduan memulai</span>
        <h3>{stage === 'browsing' ? '3 langkah menuju kamar Anda' : 'Status pemesanan Anda'}</h3>
      </div>
      <div className="getting-started-steps">
        {steps.map((step, i) => (
          <button
            key={i}
            type="button"
            className="getting-started-step"
            disabled={!step.to}
            onClick={() => step.to ? navigate(step.to) : undefined}
          >
            <span className="getting-started-step-num">{i + 1}</span>
            <span className="getting-started-step-icon" aria-hidden="true">{step.icon}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.desc}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
>>>>>>> REPLACE
```

### Edit 2/2 — Render GettingStartedGuide di TenantWorkspaceTabs

Baca dulu: `frontend/src/components/tenant/TenantWorkspaceTabs.tsx`

Cari baris yang mengandung `</TenantAnnouncementStrip>` lalu tambah render di bawahnya:

```
frontend/src/components/tenant/TenantWorkspaceTabs.tsx
<<<<<<< SEARCH
import TenantAvatar from '../common/TenantAvatar';
import { useAuth } from '../../context/AuthContext';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';
import { getResource } from '../../api/resources';
=======
import TenantAvatar from '../common/TenantAvatar';
import { useAuth } from '../../context/AuthContext';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';
import { getResource } from '../../api/resources';
import GettingStartedGuide from './GettingStartedGuide';
>>>>>>> REPLACE
```

Lalu render setelah `TenantAnnouncementStrip`:

```
frontend/src/components/tenant/TenantWorkspaceTabs.tsx
<<<<<<< SEARCH
      <TenantAnnouncementStrip stage={stage} />

      <section className="tenant-workspace-guide-strip">
=======
      <TenantAnnouncementStrip stage={stage} />

      <GettingStartedGuide stage={stage} />

      <section className="tenant-workspace-guide-strip">
>>>>>>> REPLACE
```

**Gate:** `cd frontend; npm run build` PASS.
**UAT:** Login TENANT stage `browsing` → 3 langkah orientasi muncul. Stage `booking` → 3 langkah status. Stage `occupied` → tidak muncul.

---

## I5 — Breadcrumb Interaktif (1 edit)

**Target:** `frontend/src/components/layout/AppLayout.tsx`

### Edit 1/1 — Segmen pertama breadcrumb jadi NavLink

```
frontend/src/components/layout/AppLayout.tsx
<<<<<<< SEARCH
                <nav aria-label="breadcrumb" className="app-topbar-breadcrumb">
                  {breadcrumbParts.map((part, index) => (
                    <span key={`${part}-${index}`}>
                      {index > 0 ? <span className="app-breadcrumb-separator"> / </span> : null}
                      <span>{part}</span>
                    </span>
                  ))}
                </nav>
=======
                <nav aria-label="breadcrumb" className="app-topbar-breadcrumb">
                  {breadcrumbParts.map((part, index) => (
                    <span key={`${part}-${index}`}>
                      {index > 0 ? <span className="app-breadcrumb-separator"> / </span> : null}
                      {index === 0 ? <NavLink to={defaultRoute} className="app-breadcrumb-link">{part}</NavLink> : <span>{part}</span>}
                    </span>
                  ))}
                </nav>
>>>>>>> REPLACE
```

**Gate:** `cd frontend; npm run build` PASS.
**UAT:** Klik segmen pertama breadcrumb → navigasi ke dashboard. Segmen lain tetap teks.

---

## I6 — Verifikasi Guide Strip (no-op)

Tidak ada perubahan kode. `getStageTitle()` dan `getStageSummary()` di `TenantWorkspaceTabs.tsx` sudah mengembalikan teks berbeda per stage.

**UAT manual:**
- [ ] Stage browsing: "Pilih kamar yang cocok" / "Pilih kamar, lalu pantau status pemesanan."
- [ ] Stage booking: "Pantau pemesanan" / "Lihat status pemesanan, tagihan, dan bukti bayar."
- [ ] Stage occupied: "Panduan Kos Saya" / "Kamar, tagihan, laporan, dan aksi penting."

---

## UAT Global Fase I

- [ ] **I1:** Admin dashboard TIDAK menampilkan chip sub-menu.
- [ ] **I2:** Staff nav 5 tab dari `navigation.ts` (termasuk "Tugas").
- [ ] **I3:** `/meter-readings` → sidebar "Kamar & Stok" active.
- [ ] **I4:** Tenant browsing/booking melihat `GettingStartedGuide`.
- [ ] **I5:** Breadcrumb segmen 1 bisa diklik → dashboard.
- [ ] **I6:** Guide strip tenant teks sesuai stage.
- [ ] **REGRESI:** Semua halaman existing tidak 404. Toggle Owner↔Admin tidak rusak.
- [ ] `cd frontend && npm run build` PASS.
