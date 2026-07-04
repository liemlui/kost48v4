# 04 — UI/UX (20 temuan)

---

## 🟠 C19-01: Tenant Panggil Endpoint Admin — Console Error 403

**File:** `docs/audit/CHECKLIST_19_lintas_pwa_a11y.md:69-80`

Tenant `/portal/stay` → `GET /api/settings/operational` → 403. Harusnya `/settings/public-config`.

---

## 🟠 C19-02: Admin Dashboard — Horizontal Overflow 375px

**File:** `docs/audit/CHECKLIST_19_lintas_pwa_a11y.md:82-97`

`scrollWidth=434` vs `innerWidth=375`. Elemen `.admin-command-head`, `.assistant-insight-line`, `.action-queue-card` melebar.

---

## 🟡 `new Date()` Tanpa `isNaN` Guard (8+ file)

| File | Line | Issue |
|------|------|-------|
| `StayDetailPage.tsx` | 42 | `new Date(invoice.dueDate).getTime() < Date.now()` — risk epoch |
| `InvoicesPage.tsx` | 48 | `new Date(inv.dueDate) < new Date()` — no guard |
| `MyInvoicesPage.tsx` | 159 | `new Date(b.dueDate ?? 0).getTime()` — epoch semantic wrong |
| `ticketsShared.ts` | 34 | `const date = new Date(value)` — no isNaN, `toLocaleDateString` → "Invalid Date" |
| `AdminSurveysPage.tsx` | 102-108 | Sort by date — safe if always valid |
| `MyStayPage.tsx` | 203 | `new Date(t.updatedAt ?? t.createdAt ?? 0)` — fallback ok |
| `StayDetailPage.tsx` | 102 | `new Date(reading.readingAt).getTime()` — no guard |

---

## 🟡 `formatRupiah` Diduplikasi di 3+ File

| File | Issue |
|------|-------|
| `GuestBookingSuccess.tsx:41-43` | `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })` — duplikat `formatRupiah` |
| `MyInvoicesPage.tsx:14-16` | `fmtC` function — duplikat `formatRupiahWithoutSymbol` |
| `MyInvoicesPage.tsx:251` | `total.toLocaleString('id-ID')` — tanpa `formatRupiah` |

---

## 🟡 Inline Style Hardcode Warna (7+ komponen)

| Komponen | Warna Hardcode |
|----------|---------------|
| `SatisfactionSurveyCard.tsx` | `#f59e0b`, `#cbd5e1`, gradient `#fefce8→#fef3c7` |
| `FreeRepairPolicyCard.tsx` | `#ecfdf5→#eff6ff` |
| `ActionCalendar.tsx` | `#fff`, `#e2e8f0` |
| `ActionKanbanBoard.tsx` | `fontSize: '0.65em'` × 10 |
| `RichAvailabilityCalendar.tsx` | `#7c3aed`, `#dc2626`, `#22c55e` × 20 |
| `InvoicePrintLayout.tsx` | 39+ inline styles |

---

## 🟡 `console.error` / `console.warn` di Production (6 lokasi)

| File | Line | Call |
|------|------|------|
| `GlobalSearch.tsx` | 75 | `console.error('[GlobalSearch] tenants', err)` |
| `PwaRouteBoundary.tsx` | 20 | `console.error('[PWA] Route failed', error)` |
| `PwaStatus.tsx` | 121 | `console.warn('[PWA] SW registration failed')` |
| `CreateInvoiceModal.tsx` | 166,171 | `console.error('[CreateInvoiceModal] wifi', err)` × 2 |
| `usePushNotifications.ts` | 106,107 | `console.error('[PWA] unsubscribe failed')` × 2 |
| `MyStayPage.tsx` | 865 | `console.warn('[MyStayPage] tenantId mismatch')` |

---

## 🟢 `SimpleCrudPage` — Tidak Ada Skeleton Loading

**File:** `frontend/src/pages/resources/SimpleCrudPage.tsx`

Tabel muncul KOSONG dulu sebelum data fetch selesai. Tidak ada `<ResourceTableSkeleton />`.

---

## 🟢 C06-01: Invoice LUNAS Masih Tampilkan Countdown

**File:** `CHECKLIST_06_tenant_invoice_bayar.md`

Invoice sudah PAID masih tampilkan "Jatuh tempo dalam X hari". Stale state.

---

## 🟢 `SkeletonLoader` — `key={index}`

**File:** `frontend/src/components/common/SkeletonLoader.tsx:34-50`

```tsx
{Array.from({ length: 4 }).map((_, index) => <div key={index}>)}
```
Index sebagai key — minor untuk skeleton statis.

---

## 🟢 `AncillaryRevenuePage` — Static, Tanpa API

**File:** `frontend/src/pages/finance/AncillaryRevenuePage.tsx`

Seluruh halaman hardcode `revenueStreams` array. Tidak ada query API.

---

## 🟢 Tidak Ada `useDocumentTitle` di Mayoritas Halaman

Hanya `ServiceInterestsPage` yang pakai. Sisanya bergantung pada `RouteTitleSync` generik.

---

## 🟢 Label Admin Dashboard Menyesatkan

"Pendapatan Bulan Ini" padahal query pakai `periodStart` (akrual), bukan uang masuk bulan ini.

---

## 🟢 Staff Dashboard — Tidak Ada Halaman Khusus

Staff share komponen `DashboardAdmin`. Tidak ada KPI khusus staf.

---

## 🟢 Navigasi Publik — 4 Gaya Header Berbeda

`C01-05`: landing (`gx-topbar`), `/rooms` (topbar), `/panduan` (FaqTopbar), `/reviews` (tanpa topbar). Sudah difix di Fase AA-04 tapi perlu verifikasi.

---

## ✅ POSITIF

- ✅ `EmptyState` komponen dengan icon + title + description + CTA — dipakai 20+ halaman
- ✅ `PageLoadingSkeleton`, `HeroSkeleton`, `StatCardSkeleton`, `TableSkeleton` — konsisten
- ✅ Toast system: success/danger/warning/info, auto-dismiss 6s
- ✅ Semua mutation ada error feedback (inline Alert / toast)
- ✅ Form: submit disabled sampai valid, cancel reset form
- ✅ Currency: `formatRupiah` via `Intl.NumberFormat('id-ID')`
- ✅ PWA: dismiss 7 hari (I8 resolved), version sync
- ✅ Owner 390px: hamburger menu + stacking
