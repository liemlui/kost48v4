# KOST48 V5 — Changelog Arsip (entri < V5.11.0, era pra-audit)
**Dipisah:** 2026-06-11 dari CHANGELOG.md aktif untuk hemat konteks. Hanya untuk penelusuran sejarah.

## 2026-06-02 — V5.10.0 Analytics Dashboard, Review Komplain, Tiket Operasional, Refactor CSS

### Type
Frontend feature sprint + backend enum additions + CSS architecture refactor.
No schema change. No DB reset. No new npm dependency.

### Added — Charts & Analytics (Recharts)

- `DonutGauge` dan `HorizontalBarChart` sebagai reusable chart components di `src/components/charts/`.
- `SmartChartPanel` diperkuat dengan mode donut/bar/tabel/summary.
- **StaysPage** — 3 chart panel: donut status penghuni, horizontal bar booking flow, bar tipe pembayaran.
- **InvoicesPage** — 3 chart panel: bar status tagihan, donut gauge rasio penagihan, bar ringkasan rupiah.
- **AdminStaffPerformancePage** — 3 chart panel: bar distribusi kategori kinerja, bar aktivitas KPI tim, gauge rata-rata skor + donut audit.
- **TicketsPage** — 3 chart panel: donut status tiket, bar kategori pekerjaan, bar aging umur tiket.
- **PaymentReviewPage** — 3 chart panel: gauge kelengkapan bukti, donut level risiko, bar metode bayar.
- **RenewRequestsAdminPage** — chart distribusi status perpanjangan (donut + progress bar mini).
- **MyInvoicesPage** (portal tenant) — gauge tingkat pelunasan + bar status tagihan.
- **PublicGuestDashboardPage** — donut ketersediaan kamar + bar komposisi fasilitas dari katalog publik.
- **OwnerDashboardPage** — line chart + bar chart tren pendapatan/biaya/laba dengan best-fit line dan rentang 1/3/6/12 bulan.

### Added — Review & Komplain Tenant → Staff

- `TenantStaffReviewPrompt` diperkuat: rating bintang animasi dengan hover effect.
- Rating ≤ 2 → wajib pilih kategori komplain: **Kebersihan / Kualitas Kerja / Keterlambatan / Kerusakan / Sikap Staff / Lainnya**.
- Rating ≥ 4 → tag pujian opsional: Cepat & Tepat, Bersih & Rapi, Ramah, Profesional.
- Kategori dikodekan sebagai `[Kategori] komentar` dalam `comment` field untuk kompatibilitas backend.
- Tombol submit berubah warna dan label ("Kirim Komplain" merah vs "Kirim Rating" biru).

### Added — Admin: Panel Komplain & Alert Kinerja

- **AdminStaffPerformancePage** — panel alert merah otomatis untuk staff dengan avg rating < 3 bulan ini.
- Panel alert kuning untuk staff dengan proof completion < 50%.
- Badge ⚠️ di kolom rating dan ⛔ di kolom sinyal negatif.
- Quick action "Audit →" langsung dari alert panel ke modal audit.

### Added — Staff: Visualisasi Review

- **StaffMonthlyReportPage** — bar chart distribusi 1⭐–5⭐ review per bulan.
- Counter "X komplain" merah, label kategori komplain/pujian dari `[tag]` prefix.
- Review item dengan border merah (komplain) / hijau (pujian).

### Added — Tiket Pekerjaan Baru (Admin/Owner)

- Tombol **"Buat Tiket Pekerjaan"** di header halaman Tiket (visible untuk ADMIN/OWNER).
- Modal dengan 6 kategori: Kebersihan 🧹 / Perbaikan 🔧 / Audit Inventaris 📦 / **Pindah Barang 🚚** / Pemeriksaan 🔍 / Umum 📋.
- Kategori **BARANG_PINDAH**: form khusus nama barang, jumlah, dari lokasi, ke lokasi — menjadi job operasional staff.
- Assign langsung ke staff saat tiket dibuat.

### Refactored — CSS Architecture

- `src/styles.css` (24.138 baris / 538 KB) dipecah menjadi 13 modul di `src/styles/`:

| File | Baris | Isi |
|---|---|---|
| `01-base.css` | 400 | CSS variables, reset, fonts |
| `02-layout.css` | 971 | App layout, sidebar, topbar |
| `03-components.css` | 645 | Badge, tabel, modal, toast, print |
| `04-operations.css` | 2.221 | Command center, smart panels |
| `05-staff.css` | 2.948 | Staff: work mode, routines, field ops |
| `06-tenant.css` | 2.177 | Portal tenant |
| `07-public.css` | 2.172 | Halaman publik & kamar |
| `08-admin.css` | 1.548 | Dashboard admin/owner |
| `09-finance.css` | 1.945 | Finance & accounting |
| `10-misc.css` | 4.568 | Global styles & responsive |
| `11-public-pages.css` | 2.942 | Guest home & landing |
| `12-owner.css` | 919 | Owner settings & reports |
| `13-charts.css` | 682 | Charts & analytics panels |

- `src/styles.css` kini hanya 16 baris berisi `@import` ke 13 modul tersebut.
- Vite build verified: semua modul balanced (comment opens = closes), output 661 KB CSS.

### Backend

- `TicketCategory` enum ditambah: `BARANG_PINDAH`, `AUDIT_INVENTARIS`, `PEMERIKSAAN`.
- `BACKOFFICE_TICKET_CATEGORIES` constant untuk validasi `CreateBackofficeTicketDto`.
- `CreateBackofficeTicketDto.category` kini divalidasi dengan `@IsIn` (sebelumnya `@IsString`).
- Tenant-staff-reviews: minor service refinement.

### Commits

| Hash | Deskripsi |
|---|---|
| `4df023c` | feat: improve owner workspace and recharts dashboards |
| `358426b` | feat: chart analytics Tiket, Review Bayar, Perpanjangan, Portal Tenant |
| `345c838` | feat: chart ketersediaan kamar dan fasilitas di halaman publik |
| `37fec46` | feat: perkuat review, komplain tenant→staff, tiket pekerjaan operasional |
| `6479352` | refactor: split styles.css (24K baris) menjadi 13 modul CSS + backend ticket categories |

### Verified

```text
- TypeScript check: PASS (npx tsc --noEmit clean di semua 5 commit).
- Vite production build: PASS (661 KB CSS output, 1.9 MB JS, build 50s).
- Git push: PASS ke origin/main.
- No schema change. No DB reset. No new npm dependency.
- CSS split: 13/13 file balanced (comment opens === closes).
```

---

## 2026-06-01 — V5.9.9 Fix: Missing getBookingExpiryMeta import

### Type

Backend + frontend patch: added missing `getBookingExpiryMeta` import in StaysPage.tsx, plus accumulated backend helpers and frontend cleanup files committed together.

### Added

- Added missing `getBookingExpiryMeta` import in `StaysPage.tsx` from `../../utils/bookingExpiry`.

### Changed

- Frontend `tsc -b` now passes without TS2304.

### Files included in commit `f3eb43b`

- **New backend helpers:** accounting-posting-helpers.ts, accounting-report-helpers.ts, stays-service-helpers.ts, tenant-bookings-helpers.ts
- **New frontend:** DashboardAdmin.tsx, DashboardOwner.tsx, DashboardStaff.tsx, dashboardShared.tsx, stayPredicates.ts, TicketsStaffMode.tsx, ticketsShared.ts, accounting-types.ts, config resources split (communications.ts, finance.ts, inventory.ts, people.ts, property.ts)
- **New doc:** 05_BUSINESS_MANAGEMENT_INTELLIGENCE_PLAN.md

### Verified

```text
- Commit pushed to main: f3eb43b fix: add missing getBookingExpiryMeta import in StaysPage.tsx.
- Git push PASS to origin/main.
- Frontend build PASS confirmed by user.
- No schema change. No DB reset. No new dependency.
```

---

## 2026-05-31 — V5.9.8-A Room Readiness Flow Hardening

### Type

Backend + frontend business-flow hardening for room readiness after final checkout, plus accumulated staff UX/list pagination cleanup pushed in the same commit.

### Added

- Added room-readiness gate after final checkout using existing `MAINTENANCE` room status.
- Added automatic/reused `CHECKOUT_INSPECTION` ticket creation after final checkout.
- Added duplicate-prevention logic for checkout inspection tickets by stay/room/category.
- Added safe room-ready transition when closing checkout-inspection tickets.
- Added public `Sedang Dicek` filter for rooms that are empty but not ready for booking.
- Added `useClientPagination` frontend hook for client-side fallback pagination.
- Added/expanded pagination on major table/list surfaces where server metadata is not available.
- Added staff queue visibility for completed work and clearer checkout-inspection task labels.

### Changed

- Final checkout no longer directly makes a room available/bookable.
- Room after checkout is shown as `Perlu dicek` / `Sedang dicek` until inspection is completed.
- Public `MAINTENANCE` rooms are non-bookable and use inquiry copy instead of booking CTA.
- Admin ticket close behavior is guarded so unsafe checkout-inspection tickets do not automatically release the room.
- Staff workspace copy was cleaned to remove developer/internal permission language.
- Staff layout/card rhythm was stabilized after screenshot feedback.
- ResourceTable fallback behavior now paginates instead of silently clipping lists.
- Dashboard/accounting/deposit/staff/admin list previews were moved toward max 10 visible rows.

### Verified

```text
- Commit pushed to main: 2abf4c9 feat(rooms): gate checkout room readiness.
- Git push PASS to origin/main.
- Backend build PASS confirmed by user.
- Frontend build PASS confirmed by user.
- Generated Prisma restored before commit.
```

### Not changed

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No new npm dependency.
- No apps folder, workspace migration, or service split.
- No separate RoomInspection model yet.
```

### Still pending

```text
- Targeted runtime smoke for room readiness flow.
- Public browser smoke for Sedang Dicek / non-bookable room state.
- Staff dashboard browser smoke after layout stabilization.
- Full manual browser smoke owner/admin/staff/tenant/public before M9 FULL PASS.
```
<!-- KOST48_DOCS_SYNC_20260531_V598A_ROOM_READINESS_FLOW_END -->

<!-- KOST48_DOCS_SYNC_20260531_V595A_PUBLIC_ROOM_ASSETS_START -->
## 2026-05-31 — V5.9.5-A Public Room Assets & Slideshow

### Type

Public room catalog/detail/booking marketing upgrade with real static image assets and honest availability actions.

### Added

- Added curated Kost48 `.webp` room/facility/logo assets to:
  - `frontend/public/room-images/`,
  - `backend/uploads/room-images/`.
- Added public room image fallback/gallery mapping so rooms can show real marketing photos even when DB image data is empty.
- Added public room availability filters:
  - `Semua`,
  - `Kamar Kosong`,
  - `Kamar Terisi`.
- Added/confirmed `canBook` handling in public room DTO/UI flow.
- Added multi-photo/slideshow behavior for public room cards/detail/booking preview.
- Added frontend fallback behavior to avoid broken image icons.

### Changed

- Public catalog now shows occupied rooms for marketing transparency instead of hiding them from prospects.
- Public room detail can open occupied/non-bookable rooms instead of returning a missing-room experience.
- Public status copy is simplified to `Kosong`, `Terisi`, and limited `Belum tersedia/Perawatan` language.
- Non-bookable rooms now route to WhatsApp `Tanya Ketersediaan` instead of direct booking submission or dead disabled buttons.
- Public branding can use the real Kost48 logo asset instead of only the K48 placeholder.
- Backend room image assets were committed intentionally under `backend/uploads/room-images` while keeping the rest of upload storage guarded.

### Verified

```text
- Frontend build PASS reported.
- Backend build PASS reported.
- API smoke PASS reported.
- Browser smoke PASS reported for public rooms, detail gallery, filters, and booking/non-booking states.
- Public rooms count increased to 13 rooms in catalog.
- OCCUPIED rooms visible and non-bookable.
- canBook false for OCCUPIED and true for bookable rooms.
- Photo/logo display issue fixed after A2/A3/A4 asset/gallery fixes.
- Backend image assets commit: 419dc62 chore(public): add backend room image assets.
```

### Not changed

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No new npm dependency.
- No lifecycle/payment business-rule rewrite.
- No official DB-backed media management/upload UI yet.
```

### Still pending

```text
- Docs sync commit for V5.9.5-A.
- Push local commits to origin/main.
- Full manual browser smoke across owner/admin/staff/tenant/public before claiming M9 FULL PASS.
- Future official media management design if room photos need admin upload/sort/alt-text support.
```
<!-- KOST48_DOCS_SYNC_20260531_V595A_PUBLIC_ROOM_ASSETS_END -->

<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_START -->
## 2026-05-31 — V5.9.3-B Tenant Room Dossier Compact

### Type

Tenant portal room transparency and compact UI improvement, with small backend read endpoint support.

### Added

- Added tenant-only room inventory endpoint:
  - `GET /api/room-items/my-room`
- Added current-stay room facilities exposure for public-visible room facilities.
- Added compact Room Dossier architecture to `/portal/stay`.
- Added expandable dossier sections:
  - Info kamar,
  - Fasilitas,
  - Inventaris kamar,
  - Tarif & dana titipan.
- Added full inventory visibility in tenant room dossier, with internal scroll for longer lists.
- Added friendly inventory status handling including `MAINTENANCE` => `Perlu dicek`.

### Changed

- `Kamar Saya` is now compact and information-dense instead of one tall open card.
- Room photo is represented as a small thumbnail/header visual rather than a large mobile-heavy block.
- Room pricing/deposit/utility values are presented as compact dossier rows.
- Deposit copy stays neutral as `dana titipan`.
- Inventory count and report CTA are separated.
- Tenant room transparency uses available DB data without requiring a schema change.

### Verified

```text
- Frontend build PASS: tsc -b 0 errors, Vite build completed in 8.17s.
- Tenant screenshot smoke PASS: 24/24 PNG captured, all status 200.
- Backend endpoint smoke PASS: GET /api/room-items/my-room returned success=True.
- Main pushed:
  - e2d7d58 fix(tenant): compact room dossier on my stay page
  - 7b89df6 fix(tenant): expose room dossier inventory data
```

### Not changed

```text
- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No tenant profile/photo/chat implementation yet.
```

### Still pending

```text
- Full manual browser smoke across owner/admin/staff/tenant/public before M9 FULL PASS.
- Tenant Profile One-Time Fill planning/implementation.
- Tenant photo decision and schema/API approval.
- Tenant interaction/community/chat planning.
```
<!-- KOST48_DOCS_SYNC_20260531_V593B_ROOM_DOSSIER_END -->

<!-- KOST48_DOCS_SYNC_20260531_V592_START -->
## 2026-05-31 — V5.8.6 to V5.9.2 Frontend UI Finalization, Finance Reports UI, and Tenant Engagement

### Type

Frontend-only UI/UX stabilization, compacting, finance report UI consolidation, and tenant engagement/room transparency.

### Added / Changed

- Stabilized visible public/auth/tenant/admin/owner copy after browser screenshot audit.
- Simplified owner navigation and removed notification/menu duplication where header/notification flow is enough.
- Reduced long-scroll pages by compacting dashboard sections and moving selected queues/lists toward 10 visible items.
- Added/expanded pagination behavior in major UI lists where feasible.
- Removed redundant detail buttons when rows already navigate to detail.
- Consolidated finance report UI under Reports → Keuangan:
  - Profit/Loss,
  - Cashflow,
  - Balance Sheet,
  - Piutang Aging,
  - Deposit Titipan.
- Added tenant stay journey/engagement presentation.
- Compact UI density pass across global CSS.
- Tenant announcements moved away from a heavy dedicated menu and toward header strip/notification-style visibility.
- Tenant `Kamar Saya` updated toward room transparency: room photo/placeholder, booking-like information, room facilities/items, and reporting guidance.
- Tenant service interest/feedback UI added as a frontend placeholder that does not claim backend persistence.

### Verified

```text
Frontend build PASS was reported for every generated package.
Final V5.9.2 frontend build PASS: 729 modules transformed.
Backend was not changed in V5.8.6 through V5.9.2.
Generated backend packages are UNCHANGED handoffs.
```

### Not fully verified yet

```text
Manual browser smoke after V5.9.2 is still required.
Tenant screenshots should be rerun first.
Staff, Admin, Owner, and Public role audits remain pending after tenant acceptance.
M9 FULL PASS is not claimed.
```

### Not changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No backend business logic change in V5.8.6–V5.9.2.
- No apps folder.
- No microservice split.
- No workspace migration.
- No lifecycle rewrite.
- No payment approval extraction.
- No dark mode.
- No new dependency.
- No profile photo upload backend yet.
<!-- KOST48_DOCS_SYNC_20260531_V592_END -->

<!-- KOST48_DOCS_SYNC_20260530_M10C_START -->
## 2026-05-30 — M10 Cleanup, Safety Flow Hardening, and Reminder Label

### Type

Frontend cleanup + backend safety hardening + tenant/admin portal refresh polish.

### Added / Changed

- Removed unused `frontend/src/config/resources/*` split files; `resources.ts` remains canonical.
- Removed user-facing legacy labels such as `Kost48 Surabaya V3`, `M4A`, `M5B`, and remaining visible `Queue` copy.
- Localized reminder page label from `Queue pengingat` to `Antrean pengingat`.
- Added `@RateLimit('publicBooking')` metadata path for public booking spam protection.
- Added logger warnings for best-effort accounting/deposit journal posting failures.
- Made final checkout date comparison use Jakarta business-day convention.
- Improved frontend mutation error messages through shared API error extraction.
- Aligned tenant portal payment/renew/stay invalidations after admin decisions.

### Verified

```text
M10-C frontend build PASS: 728 modules transformed.
GET /api/public/rooms PASS.
Admin login + GET /api/payment-submissions/review-queue PASS.
Commits pushed through 3fa294c on main.
```

### Not fully verified yet

```text
Manual browser smoke across owner/admin/staff/tenant/public remains pending.
M9 FULL PASS is not claimed yet.
```

### Not changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No apps folder.
- No microservice split.
- No workspace migration.
- No lifecycle rewrite.
- No payment approval extraction.
- No dark mode.
<!-- KOST48_DOCS_SYNC_20260530_M10C_END -->


<!-- KOST48_DOCS_SYNC_20260530_M9_API_FLOW_BUILD_START -->
## 0.0 Latest Current State — M9 Read Smoke, Critical API Flow, and Build Gate PASS

```text
Latest verified local gate before commit:
- M9 read smoke PASS: 25 passed, 0 failed.
- Frontend build PASS: 727 modules transformed.
- Backend build:local PASS: clean + Prisma generate + TypeScript build completed.
- Generated Prisma restored after build; git status no longer lists backend/src/generated/prisma.
- M9 critical API flow PASS across public booking, payment, renew, checkout, deposit, inventory, and staff report.
- M9 FULL PASS is still not claimed because manual browser smoke across owner/admin/staff/tenant/public is still pending.
```

### M9 critical API flow evidence summary

| Flow | Result | Evidence |
|---|---|---|
| Public booking | PASS | Website booking created stay `21`, tenant `22`, room `4 / G2-004`, and portal account. |
| Admin booking approve | PASS | Approval created initial invoice `32` as `ISSUED`, room became `RESERVED`, and open invoice count became `1`. |
| Tenant payment proof | PASS | Tenant submitted payment proof `8` for rent + deposit amount `2,200,000`; review queue showed `PENDING_REVIEW`. |
| Admin payment approval | PASS | Payment proof `8` approved; invoice `32` became `PAID`, room became `OCCUPIED`, deposit became `PAID / HELD`. |
| Renew request | PASS | Renew request `4` created and approved with meter checkpoint. |
| Renewal invoice | PASS | Renewal invoice `34` created as `ISSUED` with rent, electricity, and water lines totaling `1,741,950`. |
| Open invoice checkout blocker | PASS | Tenant checkout request and direct final checkout were blocked while invoice `34` was open. |
| Renewal invoice payment | PASS | Payment proof `9` approved; invoice `34` became `PAID`, stay open invoice count returned to `0`. |
| Checkout request approval | PASS | Checkout request `4` approved; stay remained `ACTIVE`, proving approval is not final checkout. |
| Final checkout | PASS | Final checkout completed stay `21`, set room `4` to `AVAILABLE`, and kept deposit `HELD`. |
| Deposit settlement | PASS | Full refund processed; deposit became `REFUNDED`, ledger matched, accounting journal `JE-AUTO-DEPOSIT-SETTLEMENT-21` posted and balanced. |
| Inventory lifecycle | PASS | Item `4` moved through IN, ASSIGN_TO_ROOM, RETURN_FROM_ROOM; staff official movement was blocked with 403. |
| Staff field report | PASS | Staff field report `1` created ticket `5`, admin reviewed as `APPROVE`, no official stock movement was auto-created. |

### M9 read smoke and build gate

```text
Read smoke:
- backend reachable at localhost:3000.
- public rooms PASS.
- admin login PASS.
- main admin read surfaces PASS.
- staff login/read smoke PASS.
- owner/tenant default role smoke only warned because seed credentials were not present; warnings did not fail read-smoke.
- final label: M9_READ_SMOKE_PASS, Passed 25, Failed 0.

Build:
- frontend npm run build PASS.
- backend npm run build:local PASS.
- generated Prisma restored after build.
```

### Current honest label

```text
M9 READ SMOKE = PASS.
M9 CRITICAL API FLOW = PASS.
M9 BUILD GATE = PASS.
M9 FULL PASS = pending manual browser smoke.
No DB reset was used.
No schema change was introduced.
No production DB mutation was performed.
Generated smoke reports and generated command packs are local UAT artifacts and must not be committed.
```

### Immediate pre-commit cleanup

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; Remove-Item ".\m9-uat-read-smoke-report-*.json" -Force -ErrorAction SilentlyContinue; Remove-Item ".\m9c-critical-flow-command-pack-*.ps1" -Force -ErrorAction SilentlyContinue; Remove-Item ".\m9c-critical-flow-command-pack-report-*.json" -Force -ErrorAction SilentlyContinue; git restore backend/src/generated/prisma; git status -sb
```

### Next required gate before FULL PASS

```text
Manual browser smoke owner/admin/staff/tenant/public:
- no no-op CTA or link #,
- filters visually distinct from primary action,
- tenant copy avoids raw backend terms,
- deposit copy remains dana titipan/liability,
- tables readable on desktop/tablet/mobile,
- checkout request approval not final checkout,
- final checkout blocked by every open invoice including DRAFT,
- staff reports issues/restock needs, not official stock mutation.
```
<!-- KOST48_DOCS_SYNC_20260530_M9_API_FLOW_BUILD_END -->

## 2026-05-30 — M9 Read Smoke, Critical API Flow, and Build Gate

### Type

UAT tooling hardening + full critical API flow verification + build gate verification.

### Added / Changed

- Added reusable critical-flow command-pack tooling:
  - `backend/scripts/m9-critical-flow-uat-command-pack.ps1`
- Hardened M9 read-smoke behavior:
  - backend-not-running is environment readiness,
  - optional owner/tenant seed credential mismatch is warning by default,
  - strict role login can be required explicitly.
- Hardened command pack generation:
  - uses discovered candidate IDs,
  - no hardcoded `1` for room/stay/invoice/item IDs,
  - public booking no longer fills the `website` honeypot field,
  - generated mutation pack remains disabled by default.

### Verified

```text
M9 read smoke PASS:
- 25 passed,
- 0 failed.

M9 critical API flow PASS:
- public booking,
- admin booking approval,
- tenant payment proof,
- admin payment review,
- renew with meter checkpoint,
- checkout blockers,
- final checkout,
- deposit settlement,
- inventory lifecycle,
- staff field report/admin review.

Build gate PASS:
- frontend npm run build PASS,
- backend npm run build:local PASS,
- generated Prisma restored after build.
```

### Not fully verified yet

```text
Manual browser smoke across owner/admin/staff/tenant/public remains pending.
M9 FULL PASS is not claimed yet.
```

### Not changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No microservice split.
- No apps folder.
- No generated Prisma commit.
- No generated UAT report/command-pack output should be committed.

<!-- KOST48_DOCS_SYNC_20260530_M9_0_START -->
## 0.0 Latest Current State — M9-0 Runtime Hotfix, Base Smoke Recovery, and Full Regression UAT Gate

```text
Latest pushed commits:
- ed85fb6 fix(runtime): guard deposit ledger and accounting readiness smoke
- 618ab15 docs: sync m8o to m8t command center verification
- fe72fba feat(command-center): harden ui actions finance inventory and lifecycle flows

Latest generated / applied tooling package:
- backend_20260530_M9_FULL_REGRESSION_UAT_TOOLING_FULL.zip
- frontend_20260530_M9_FULL_REGRESSION_UAT_TOOLING_UNCHANGED.zip

Current baseline:
- M8O–M8T code and docs are pushed.
- M9-0 runtime hotfix is pushed.
- M9 full regression UAT is not FULL PASS yet.
- M9 base smoke inline PASS after backend server was running.
```

### M9-0 runtime hotfix summary

| Area | Result | Evidence |
|---|---|---|
| Deposit ledger reconciliation-lite | PASS | `/api/deposit-ledger/reconciliation-lite` returned `success=True`, `ready=True`, `mismatchCount=0`. |
| Accounting readiness | PASS | `/api/accounting/readiness` returned `success=True`, `ready=True`, `score=100`. |
| Public rooms | PASS | `/api/public/rooms` returned `success=True`. |
| Payment review queue | PASS | `/api/payment-submissions/review-queue` returned `success=True`. |
| Backend build | PASS before smoke | `npm run build:local` completed with Prisma generate + TypeScript compile. |
| Git push | PASS | `ed85fb6` was pushed to `main`. |

### Important operational discovery

```text
Do not restore backend/src/generated/prisma before running local dev server if the dev server needs freshly generated Prisma types.
For local runtime/UAT:
1. npm run prisma:generate or npm run build:local may generate local Prisma client.
2. Start/restart backend.
3. Run smoke/UAT.
4. Only after UAT/build, restore generated Prisma before commit/push if schema/generator change is not approved.
```

### M9 UAT tooling note

```text
backend/scripts/m9-full-regression-read-smoke.ps1 was added as optional read-smoke tooling.
PowerShell execution policy may block unsigned scripts; use process-scope Bypass + Unblock-File if needed.
Failed JSON reports caused only by backend not reachable should be deleted and not committed.
Commit the script only if the team wants reusable M9 smoke tooling.
```

### Current honest label

```text
M8O–M8T = pushed.
M9-0 runtime hotfix = build/smoke PASS + pushed.
M9 base smoke inline = PASS for public rooms, payment review queue, deposit reconciliation, and accounting readiness.
M9 full regression = pending.
Manual browser smoke across all roles/pages = pending.
No DB reset was used.
No schema change was introduced.
Generated Prisma remains build/runtime artifact and must not be committed unless schema/generator scope is explicitly approved.
```

### Next recommended phase

```text
PLAN M9 Full Regression UAT + Production Readiness.
Goal:
- run read-smoke for all main role surfaces with backend actively running,
- run critical flow UAT: public booking, tenant payment proof, admin payment approval, renew, checkout, deposit, inventory/staff, owner finance,
- run manual browser smoke for owner/admin/staff/tenant/public,
- patch only bugs proven by M9 evidence,
- keep code/docs commits clean and exclude generated Prisma/report noise.
```
<!-- KOST48_DOCS_SYNC_20260530_M9_0_END -->


## 2026-05-30 — M9-0 Runtime Hotfix and Base Smoke Recovery

### Type

Backend runtime guard hotfix + optional UAT tooling.

### Added / Changed

- Patched deposit ledger reconciliation so it no longer depends on a fragile `Stay.depositLedgerEntries` Prisma include.
- Patched accounting readiness to guard missing/undefined Prisma delegates instead of throwing 500.
- Added optional M9 read-smoke PowerShell tooling package:
  - `backend/scripts/m9-full-regression-read-smoke.ps1`

### Verified

```text
Backend build:local PASS.
GET /api/public/rooms PASS.
GET /api/payment-submissions/review-queue PASS.
GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.
GET /api/accounting/readiness PASS with ready=True and score=100.
Hotfix commit ed85fb6 pushed to main.
```

### Not fully verified yet

```text
M9 full regression UAT is still pending.
Manual browser smoke across owner/admin/staff/tenant/public remains pending.
Optional UAT script should be committed only if desired; failed reports caused by backend not reachable should not be committed.
```

### Not changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No generated Prisma commit.
- No frontend change for M9-0 runtime hotfix.

<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_START -->
## 0.0 Latest Current State — M8O–M8T Command Center Verification, Flow Hardening, Inventory UAT, and Owner Finance Gate Sync

```text
Latest generated working packages:
- backend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- frontend_20260530_M8O_GLOBAL_UI_ACTION_RESPONSIVE_AND_INTEGRITY_FULL.zip
- backend_20260530_M8P1_UI_SMOKE_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P1_UI_SMOKE_HOTFIX_FULL.zip
- backend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_UNCHANGED.zip
- frontend_20260530_M8P2_RESPONSIVE_COPY_ACTION_HOTFIX_FULL.zip
- backend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- frontend_20260530_M8Q_BUSINESS_FLOW_HARDENING_FULL.zip
- backend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- frontend_20260530_M8R_RENEW_CHECKOUT_DEPOSIT_DEEP_UAT_FULL.zip
- backend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- frontend_20260530_M8S_INVENTORY_STAFF_OPS_FULL_UAT_FULL.zip
- backend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_UNCHANGED.zip
- frontend_20260530_M8T_OWNER_FINANCE_PRODUCTION_GATE_FULL.zip

Docs sync status:
- This docs sync supersedes older M8L–M8N active sections.
- Older M8L–M8N/M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8N

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8O | Global UI action/responsive + backend integrity cleanup | FULL | Frontend build PASS, backend build PASS, base API smoke PASS from user local logs |
| M8P.1 | UI smoke hotfix: responsive table auto-label + tenant copy cleanup | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8P.2 | Responsive/copy/action cleanup with safer labels and enum mapping | UNCHANGED | Frontend-only package; included in later cumulative frontend build PASS |
| M8Q | Business-flow hardening for checkout request, invoice/payment refresh | FULL | Build covered by later cumulative builds; checkout/invoice/payment read smoke covered in M8R/M8T gates |
| M8R | Renew + checkout + deposit deep UAT hardening | FULL | Build PASS and renew/checkout/invoice/deposit read smoke PASS |
| M8S | Inventory + staff ops full UAT hardening | FULL | Inventory lifecycle API UAT PASS; staff official movement blocked 403 PASS; staff warehouse UI direction PASS from screenshot |
| M8T | Owner Finance Cockpit + production readiness gate | Backend UNCHANGED | Finance read smoke PASS; accounting readiness PASS; frontend build PASS; backend build PASS after cumulative backend patches |

### Latest verified UAT evidence

```text
M8O base smoke:
- GET /api/public/rooms PASS.
- Admin login PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/inventory-items, /inventory-movements, /room-items PASS.

M8R read smoke:
- GET /api/stays?limit=20 PASS.
- GET /api/invoices?limit=20 PASS.
- GET /api/admin/checkout-requests?status=APPROVED PASS.
- GET /api/admin/renew-requests?status=PENDING PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.

M8S inventory lifecycle API UAT:
- InventoryItem id=4 / UAT-M8S-KURSI-045732 created with qtyOnHand 10.
- Opening stock created official IN movement qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- RETURN_FROM_ROOM qty 999 blocked with HTTP 409.
- OUT qty 1 reduced qtyOnHand to 8.
- Final positionSummary returned: Gudang (8) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.

M8T finance/production gate:
- GET /api/invoices?limit=20 PASS.
- GET /api/payment-submissions/review-queue PASS.
- GET /api/deposit-ledger/summary PASS.
- GET /api/deposit-ledger/reconciliation-lite PASS with ready=True and mismatchCount=0.
- GET /api/accounting/readiness PASS with ready=True and score=100.
- GET /api/assets?limit=20 PASS.
- GET /api/expenses?limit=20 PASS.
- Frontend build PASS: 727 modules transformed.
- Backend build:local PASS and final read smoke PASS.
```

### Current honest label

```text
M8O–M8T = build-confirmed and read/API-smoked for the tested surfaces.
M8S inventory stock lifecycle API UAT = PASS.
M8T owner finance production gate = frontend build PASS + backend build PASS + finance/read smoke PASS.
Manual browser smoke for every role/page is still not a complete FULL regression.
Generated Prisma noise appears after backend build and must be restored before code commit.
No DB reset was used.
No schema change was introduced in M8O–M8T.
```

### Immediate pre-commit gate

```text
1. Restore generated Prisma noise:
   git restore backend/src/generated/prisma
2. Confirm git status no generated Prisma files.
3. Commit code changes first.
4. Commit docs changes separately.
5. Push only after clean git status and no accidental generated Prisma commit.
```

### Next recommended phase

```text
PLAN M9 Full Regression UAT + Production Readiness.
Goal:
- smoke all main role surfaces after M8O–M8T,
- verify public booking, tenant portal, admin payment, renew, checkout, deposit, inventory, staff, owner finance,
- manually check responsive and action integrity,
- then commit/push after code/docs split.
```
<!-- KOST48_DOCS_SYNC_20260530_M8O_M8T_END -->

## 2026-05-30 — M8O–M8T Command Center Verification, Lifecycle, Inventory, Staff Ops, and Owner Finance Gate

### Type

Backend + frontend command-center hardening across global action integrity, responsive tables, tenant copy, checkout/renew/deposit lifecycle, inventory/staff ops, and owner finance readiness.

### Added / Changed

#### M8O Global UI Action/Responsive + Integrity
- Fixed frontend build blocker in ResourceTable.
- Hardened proof link behavior so missing proof is not clickable as `#`.
- Added/expanded responsive table labels across command-center surfaces.
- Improved query invalidation after check-in, booking approval, renew, invoices, and payment review.
- Added Jakarta date helpers and safer meter date normalization.
- Added invoice issue journal consistency attempts in key lifecycle paths.

#### M8P.1 / M8P.2 UI Smoke Hotfixes
- Added global `responsiveTables` utility.
- Added safer table auto-enhancement / mobile labels.
- Cleaned tenant copy to `Panduan Kos Saya` and `status pemesanan`.
- Added human labels for booking sources and status labels.
- Improved StatusBadge accessibility.

#### M8Q Business Flow Hardening
- Added service-level OWNER/ADMIN guard for checkout request decisions.
- Added conditional update for checkout request approve/reject.
- Synced planned checkout date from approved checkout request.
- Prefilled final checkout modal from approved checkout request.
- Strengthened invoice/payment/dashboard/portal query invalidations.

#### M8R Renew + Checkout + Deposit
- Normalized final checkout date as Jakarta business date.
- Blocked checkout before check-in date.
- Added conditional ACTIVE stay update for final checkout.
- Made deposit settlement transactional and conditional from HELD.
- Required notes for partial deduction/forfeit.
- Added admin confirmation checklists for final checkout and deposit processing.

#### M8S Inventory + Staff Ops
- Blocked PATCH edits to InventoryMovement history.
- Added row lock/validation for RETURN_FROM_ROOM.
- Inventory item create/update returns position/location summary.
- Frontend movement form validates qty, room context, and movement date.
- Frontend invalidates inventory items/movements/room-items/rooms after movement.
- Staff warehouse UI clarifies staff reports issues; stock status is computed automatically.

#### M8T Owner Finance Production Gate
- Added owner dashboard production finance gate.
- Dashboard reads accounting readiness and asset readiness.
- Deposit copy reinforces dana titipan/liability.
- Gate cards link to real finance actions/pages.
- Added responsive styling for owner finance gate.

### Verified

```text
Frontend build PASS after M8T:
- 727 modules transformed.

Backend build:local PASS after cumulative backend patches.

Base/read smokes PASS:
- public rooms,
- invoices,
- payment review queue,
- inventory items,
- inventory movements,
- room items,
- rooms,
- deposit ledger summary,
- deposit ledger reconciliation-lite ready=True mismatchCount=0,
- accounting readiness ready=True score=100,
- assets,
- expenses.

M8S inventory lifecycle API UAT PASS:
- Item id=4 moved through IN 10, ASSIGN_TO_ROOM 2, RETURN_FROM_ROOM 1, OUT 1.
- Final position: Gudang (8) · G2-001 (1).
- Return qty 999 blocked HTTP 409.
- Staff official movement blocked HTTP 403.
```

### Not fully verified yet

```text
Full manual browser regression across every role/page remains recommended.
M9 should validate public booking, tenant payment proof, admin payment approval, renew, checkout, deposit, inventory/staff, owner finance, and responsive UI together.
```

### Not changed

- No apps folder.
- No microservices split.
- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle rewrite.
- No payment approval extraction.
- No dark mode.
- No new dependency.
- Generated Prisma must be restored before commit after backend build.

<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_START -->
## 0.0 Latest Current State — M8L–M8N Critical Integrity, Inventory Automation, and Action Integrity Sync

```text
Latest generated working packages:
- backend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- frontend_20260529_M8L_CRITICAL_AND_INVENTORY_SAFETY_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_REFERENCE_AND_OPENING_MOVEMENT_FULL.zip
- backend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- frontend_20260529_M8L_HOTFIX_STOCK_POSITION_AND_ROOM_FLOW_FULL.zip
- backend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- frontend_20260529_M8L_AUTO_INVENTORY_FLOW_FULL.zip
- backend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_UNCHANGED.zip
- frontend_20260529_M8L_RESPONSIVE_TABLES_ALL_SURFACES_FULL.zip
- backend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_UNCHANGED.zip
- frontend_20260529_M8M_GLOBAL_IA_SIMPLIFICATION_FULL.zip
- backend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_UNCHANGED.zip
- frontend_20260529_M8N_GLOBAL_ACTION_INTEGRITY_FULL.zip

Docs sync status:
- This docs sync supersedes older M8G–M8K active sections.
- Older M8G–M8K/M8F/M4A/V5.29 sections remain historical record below.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence after M8K

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8L-Critical | Payment/invoice/accounting integrity hotfix + inventory safety belt | FULL | ZIP generated; backend/frontend patch package created; local build still must be confirmed after apply |
| M8L-Stock Hotfix 1 | Stock reference refresh + opening stock movement | FULL | Corrected dropdown/reference refresh and opening IN movement behavior; superseded by Stock Hotfix 2 |
| M8L-Stock Hotfix 2 | Stock position, fallback qty sync, and room flow | FULL | Targeted backend smoke PASS; manual inventory UI smoke PASS from user screenshots/logs |
| M8L-Auto Inventory | Automate stock movement flows and reduce manual room item entry | FULL | RETURN_FROM_ROOM API smoke PASS; manual UI smoke PASS from user screenshots/logs |
| M8L-Responsive | Responsive tables/lists across command center | Backend UNCHANGED | Frontend package generated; local frontend build/manual PC-tablet-mobile smoke still required |
| M8M | Global IA simplification: remove global search, separate menu/filter | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |
| M8N | Global Action Integrity: no misleading/no-op buttons | Backend UNCHANGED | Frontend package generated; local frontend build/manual smoke still required |

### Latest verified UAT evidence

```text
M8L Stock Position + Room Flow:
- InventoryItem id=3 / UAT-M8L-MEJA-03 created with qtyOnHand 10.
- Opening stock created official InventoryMovement IN qty 10.
- ASSIGN_TO_ROOM qty 2 to roomId=1 reduced qtyOnHand to 8 and created/updated RoomItem qty 2.
- positionSummary returned: Gudang (8) · G2-001 (2).
- RETURN_FROM_ROOM qty 1 from roomId=1 increased qtyOnHand to 9 and reduced RoomItem qty to 1.
- positionSummary returned: Gudang (9) · G2-001 (1).
- Staff POST /api/inventory-movements returned 403.
- Short movement note returned 400.

M8L manual UI smoke from user screenshots:
- Stock Gudang shows quick actions Pasang / Keluar / Edit.
- Mutasi Stok quick-action prefill works for Pasang ke Kamar and Kembali dari Kamar.
- Confirmation modal shows official stock mutation warning and effect.
- Barang di Kamar is read/condition oriented and links to room detail.
- Room detail shows inventory tab with assigned item.

M8N user feedback:
- Any visible button/menu must have a real purpose.
- Menu, filter, CTA, and status badge must be visually and functionally separated.
- No global search in header unless a page-specific search is genuinely needed.
```

### Current honest label

```text
M8L inventory backend targeted smoke + manual UI smoke = PASS for tested stock sync/position/room flows.
M8L critical payment/invoice/accounting hotfix package = generated, but full local build/runtime smoke still required before PASS label.
M8L responsive, M8M IA simplification, and M8N action-integrity packages = generated, but final local frontend build + manual UI smoke still required.
No DB reset was used.
No schema change was introduced in these packages.
Generated Prisma noise must be restored before commit if build regenerates it.
```

### Next recommended phase

```text
PLAN M8O Verification Gate + UI Action Sweep.
Goal:
- run local frontend build after M8N,
- run backend build if latest backend M8L patches are applied,
- smoke critical API paths,
- manually check owner/admin/staff/tenant/public pages for misleading buttons, mobile table behavior, and menu/filter separation,
- then commit/push M8L–M8N only after clean git status.
```
<!-- KOST48_DOCS_SYNC_20260529_M8L_M8N_END -->

## 2026-05-29 — M8L–M8N Critical Integrity, Inventory Automation, Responsive Tables, IA Simplification, and Action Integrity

### Type

Backend + frontend integrity/safety patch for M8L, then frontend IA/UX simplification packages for responsive tables, global menu/filter separation, and action integrity.

### Added / Changed

#### M8L Critical Integrity
- Enriched current tenant stay response with invoice metadata used by tenant payment flow.
- Hardened payment approval locking around related payment/stay/room/invoice state.
- Ensured direct check-in invoice stores total amount.
- Hardened AutoOps invoice cancellation path toward accounting-safe behavior.
- Blocked zero-deposit forfeiture edge case.
- Improved invoice query invalidation and DRAFT/open invoice UI consistency.

#### M8L Inventory Automation
- Official stock movement requires meaningful note and confirmation.
- Initial stock on item creation creates an official IN movement.
- Backend explicitly syncs qtyOnHand after movement if DB trigger does not.
- ASSIGN_TO_ROOM automatically reduces gudang stock and creates/updates room item.
- RETURN_FROM_ROOM automatically validates/decreases room item and increases gudang stock.
- Direct stock quantity editing is blocked; use Mutasi Stok.
- Inventory item list exposes position summary across gudang and rooms.
- Barang di Kamar is treated as read/condition surface; assignment/return flows through Mutasi Stok.

#### M8L Responsive Tables
- Added global responsive table/list behavior for PC/tablet/mobile.
- Resource tables are intended to collapse into readable row cards on small screens.

#### M8M Global IA Simplification
- Removed global header search.
- Separated navigation menu from filter controls.
- Reduced non-useful helper copy and decorative badge behavior.

#### M8N Global Action Integrity
- Removed/reworked misleading no-op CTAs such as fake queue buttons.
- Filter-only controls are now treated as filters.
- Navigation controls are reserved for real work-area movement.
- Empty states are more section-specific.
- Inventory movement enums are shown as human-readable labels.

### Verified

```text
M8L stock sync targeted API/manual UI PASS:
- UAT-M8L-MEJA-03 qtyOnHand moved 10 → 8 → 9 through IN, ASSIGN_TO_ROOM, RETURN_FROM_ROOM.
- RoomItem qty moved 2 → 1 after return.
- positionSummary matched Gudang and room quantities.
- Staff official movement remained forbidden.
- Short movement note was blocked.
```

### Not fully verified yet

```text
M8L critical payment/invoice/accounting hotfix still needs local full build and targeted runtime smoke.
M8L responsive tables still need PC/tablet/mobile manual UI smoke.
M8M/M8N frontend packages still need local frontend build and manual UI smoke after apply.
M8H/M8I booking/waiting-room targeted smoke remains carry-forward.
```

### Not changed

- No apps folder.
- No microservices split.
- No schema change.
- No DB reset.
- No production DB mutation.
- No dark mode.
- No new dependency.

<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_START -->
## 0.0 Latest Current State — M8G–M8K Command Center Safety Belts Sync

```text
Latest local code commit:
5c4526f feat(command-center): harden accounting booking checkout and staff safety belts

Docs sync status:
- Code commit 5c4526f sudah dibuat lokal.
- Docs sync ini harus dicommit terpisah sebelum push GitHub.
- Older M4A/M8F/V5.29 sections below remain historical record.
- For coding, inspect latest real repo/ZIP first.
- If docs and code differ, write "docs/code out of sync" and follow real code.
```

### Completed batch sequence

| Batch | Focus | Backend | Verification label |
|---|---|---|---|
| M8G | Accounting Manual Payment Posting + Deposit Status Fix | FULL | Backend build PASS; manual payment journal smoke PASS; update/delete journaled payment blocked; deposit PARTIAL_REFUND status code patched but targeted runtime smoke still recommended |
| M8H | Admin Booking Review Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; reject endpoint added; targeted booking runtime smoke still recommended before FULL label |
| M8I | Tenant Booking / Waiting Room Safety Belt | FULL | Frontend build PASS; backend build covered by later local build; cancelled booking visibility patched; tenant booking runtime smoke still recommended |
| M8J | Admin Checkout Request Review Safety Belt | FULL | Backend build PASS; pending list PASS; short reject note blocked; valid reject PASS; valid approve PASS; already-processed approve blocked |
| M8K | Staff Report / Admin Confirmation Safety Belt | FULL | Backend build PASS; ticket list PASS; field report queue PASS; short final note blocked; valid ticket close PASS |

### Current honest label

```text
M8G–M8K = build-confirmed and core runtime-smoked for accounting, checkout, and ticket close paths.
M8H/M8I booking/waiting-room still need targeted runtime/manual UI smoke before FULL business-flow PASS.
Manual browser UI smoke for M8J/M8K is still not confirmed.
Generated Prisma noise was restored before code commit.
No DB reset was used.
```

### Latest important UAT evidence

```text
M8G:
- Manual InvoicePayment id=6 created JournalEntry JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE of journaled payment id=6 returned 409 and blocked silent accounting divergence.

M8J:
- Checkout request id=3 short reject note returned 400.
- Checkout request id=3 valid reject returned REJECTED.
- Checkout request id=2 valid approve returned APPROVED.
- Approving already processed request returned 409.

M8K:
- Ticket id=3 short finalAdminNote returned 400.
- Ticket id=3 valid finalAdminNote closed ticket TIC-UAT-0003.
- Backend build: npm run build:local PASS.
```

### Next recommended phase

```text
PLAN M8L Inventory Movement Safety Belt.
Goal:
- official stock movement must not be direct-click or staff-owned,
- staff may report need/condition only,
- admin/owner confirms official InventoryMovement,
- no schema change unless real guard/data gap is proven.
```
<!-- KOST48_DOCS_SYNC_20260529_M8G_M8K_END -->

## 2026-05-29 — M8G–M8K Command Center Safety Belts

### Type

Backend + frontend safety-belt hardening across accounting, booking, checkout request review, and staff/admin confirmation.

### Added / Changed

#### M8G Accounting
- Added accounting posting hook for manual admin invoice payments.
- Added accounting metadata/warning behavior to manual payment responses.
- Blocked update/delete for invoice payments that already have posted accounting journals.
- Changed `PARTIAL_REFUND` deposit status to `PARTIALLY_REFUNDED`.
- Added migration/bootstrap constraint update for deposit status consistency.
- Removed hardcoded local development path from AccountingSchemaGuard.

#### M8H Admin Booking Review
- Added approve booking review checklist modal.
- Added reject booking modal.
- Added admin booking reject endpoint.
- Added reject booking DTO.
- Added safe room release logic after rejected booking.

#### M8I Tenant Booking Waiting Room
- Tenant booking endpoint now includes cancelled/rejected website booking history.
- Tenant booking UI shows admin rejection/cancel reason.
- Tenant waiting-room copy shortened and made action-first.

#### M8J Checkout Request Review
- Added approve checkout request modal.
- Clarified approve request is not final checkout.
- Enforced checkout reject reason minimum 8 characters in backend DTO.
- Improved reject checkout modal copy.

#### M8K Staff/Admin Confirmation
- Staff action copy now emphasizes field report/proof, not final decision.
- Admin ticket close uses final confirmation UX.
- Ticket close requires meaningful final admin note.
- Staff field report review requires meaningful admin note.
- Backend enforces admin note minimum length for sensitive final decisions.

### Verified

```text
M8G:
- Backend build PASS from user local report.
- Manual payment id=6 created journal JE-AUTO-INVOICE-PAYMENT-6.
- PATCH/DELETE journaled payment blocked 409.

M8J:
- Backend build PASS from user local report.
- Pending checkout list PASS.
- Short reject reason blocked 400.
- Valid reject PASS.
- Valid approve PASS.
- Already processed request blocked 409.

M8K:
- Backend build PASS from user local report.
- Tickets list PASS.
- Staff field report queue PASS.
- Short final admin note blocked 400.
- Valid ticket close PASS.
```

### Not fully verified yet

```text
M8H/M8I targeted booking runtime smoke and manual UI smoke remain recommended.
Manual browser UI smoke for M8J/M8K remains recommended.
Deposit PARTIAL_REFUND status runtime smoke remains recommended when clean candidate data is available.
```

### Not changed

- No DB reset.
- No production DB mutation.
- No microservices/apps folder.
- No lifecycle rewrite.
- No dark mode.
- Generated Prisma was restored and not committed.

<!-- KOST48_DOCS_SYNC_20260528_M8F_START -->
## 0.0 Latest Current State — M8F Frontend Command Center Safety Belt Sync

```text
Latest generated working package:
- frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
- backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip

Latest pushed backend/source-of-truth commit still referenced by prior docs:
- 1b645de feat(deposit): add tenant deposit ledger foundation

Important status label:
- M7A–M8F are frontend-first package builds, not FULL runtime PASS.
- Frontend build PASS was verified for each batch in container.
- Backend was unchanged for M7A–M8F.
- Runtime/API smoke and manual browser UI smoke are deferred.
- Do not claim FULL PASS until local runtime/API smoke + manual UI smoke pass.
```

### Completed package sequence after M4A

| Batch | Focus | Backend | Verification |
|---|---|---|---|
| M7A | Tenant Portal Action Center Hardening | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8A | Checkout Closure + Deposit Settlement Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8B | Public Room Discovery + Booking Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8C | Payment Review Decision Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8D | Indonesian Readability + CTA Dedup Sweep | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8E | Renew Approval Safety Belt + Ringkas Copy | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |
| M8F | Invoice Issue/Cancel + Manual Payment Safety Belt | UNCHANGED | Frontend build PASS; runtime/manual smoke deferred |

### Latest product position

```text
KOST48 V5 Command Center now has safety-belt UI coverage across the main business flows:
- Tenant action center and payment proof UX.
- Public booking discovery with first-paid-room-priority copy.
- Admin payment review decision safety.
- Renew approval safety.
- Checkout/deposit settlement safety.
- Invoice issue/cancel/manual payment safety.
- Indonesian readability and CTA dedup rules.
```

### New UX rule locked from user feedback

```text
Orang Indonesia sangat tidak suka baca.
UI KOST48 must be concise, action-first, and not repeat the same explanation.
Repeated links/CTAs in one page should be limited to 1–2 maximum for the same destination/action.
```

Practical rule:
- Card/alert title: 3–7 words.
- Body: 1–2 short lines maximum.
- One primary CTA per block.
- Assistant/priority board should show the top 3 priorities by default.
- Avoid repeating the same warning across banner, card, modal, and footer.
- Use badges, numbers, and clear action labels instead of paragraphs.

### Current honest label

```text
M8F Frontend Command Center Safety Belt Sync = build-verified frontend package set.
Backend = unchanged after M4A for these M7A–M8F frontend safety batches.
Runtime/API smoke = deferred.
Manual UI smoke = deferred.
FULL PASS = not claimed.
```

### Next recommended phase

```text
PLAN M8G Admin Booking Review Safety Belt.
Focus:
- Admin booking review queue safety.
- Booking approval/reject confirmation.
- First-paid room priority explanation for admin.
- Avoid over-reserving rooms from booking-only interest.
- Keep backend unchanged unless missing data is proven.

After M8G, start M9 Targeted Runtime/UI Smoke to validate M7A–M8G locally.
```

### Source-of-truth note

```text
This M8F docs sync supersedes the older M4A-only current-state sections above/below.
Older M4A/V5.29 sections remain as historical record.
For coding, inspect the latest real ZIP/repo first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M8F_END -->

## 2026-05-28 — M7A–M8F Frontend Command Center Safety Belts

### Type

Frontend business-flow safety hardening + Indonesian readability cleanup. Backend unchanged.

### Added / Changed

- Added tenant action-center hardening for stay, invoices, proof upload, deposit copy, and ticket/request state.
- Standardized tenant payment proof UI to JPG/PNG/WebP image files and 2MB max.
- Added checkout final safety and deposit settlement safety copy/calculation.
- Added public booking first-paid safety copy and clearer room availability labels.
- Added payment review risk labels, approve checklist, and stronger reject-note requirement.
- Added readability and CTA dedup utilities.
- Added rule: Indonesian users dislike long copy; UI must be concise and action-first.
- Added renew approval safety checks and human-readable term labels.
- Added invoice issue/cancel/manual payment safety belts.
- Added create invoice frontend validation for empty/invalid invoice data.

### Verified

```text
Frontend build PASS for each generated frontend package M7A through M8F.
Backend unchanged for M7A through M8F.
```

### Not verified yet

```text
Runtime/API smoke deferred.
Manual UI smoke deferred.
FULL PASS not claimed.
```

### Not changed

- No backend mutation in M7A–M8F.
- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle rewrite.
- No payment approval backend rewrite.
- No AutoOps sensitive mutation.
- No dark mode.
- No new dependency.

### Latest packages

```text
frontend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_FULL.zip
backend_20260528_M8F_INVOICE_ACTION_SAFETY_BELT_UNCHANGED.zip
```


<!-- KOST48_DOCS_SYNC_20260528_M4A_START -->
## 0.0 Latest Current State — M4A Deposit Ledger Backend Foundation FULL PASS

```text
Current latest pushed code commit:
1b645de feat(deposit): add tenant deposit ledger foundation

Previous important pushed commits:
9d66c79 docs: sync m3.2 full first-paid runtime uat
296bd8d fix(autoops): harden runtime control panel
dc052a1 feat(tenant): ship my stay guide and autoops control ux
7c8c8e7 feat(accounting): add controlled monthly auto close governance
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
```

### Release status

```text
M3.2 Deep First-Paid Runtime UAT = FULL PASS.
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
M4A frontend = unchanged.
Next recommended phase = PLAN M4B Frontend Deposit Timeline.
```

### M3.2 final runtime lock

```text
BR1 Expired unpaid booking auto-cancel = PASS.
BR2 Pending proof must not auto-cancel = PASS.
BR3 Rejected proof after deadline auto-cancel = PASS.
BR4 Orphan RESERVED room auto-release = PASS.
BR5 Pure first-paid-wins competitor-unpaid scenario = PASS.
BR6 AutoOps must not approve payment = PASS.
BR7 AutoOps must not approve renew = PASS.
BR8 AutoOps must not final checkout = PASS.
BR9 AutoOps must not refund/deduct deposit = PASS.
```

BR5 pure runtime evidence:
```text
Stay A winner id=18 remained ACTIVE.
Payment submission A id=6 became APPROVED.
Invoice A id=30 became PAID.
Room G2-004 became OCCUPIED with activeStayId=18.
Competing unpaid Stay B id=19 became CANCELLED.
Room did not move to unpaid booking.
Cleanup returned Room G2-004 to AVAILABLE with activeStayId=null and currentStay=null.
```

### M4A runtime UAT result

| Area | Result | Evidence summary |
|---|---|---|
| Schema/table application | PASS | `TenantDepositLedgerEntry` table created via additive `prisma db push`, no DB reset. |
| Backend build | PASS | User local build reported successful before commit/push. |
| Summary endpoint | PASS | `GET /api/deposit-ledger/summary` returned basis `M4_DEPOSIT_LEDGER_SUMMARY`. |
| Reconciliation-lite endpoint | PASS | `GET /api/deposit-ledger/reconciliation-lite` returned `ready=true`, `mismatchCount=0`. |
| Backfill dry-run | PASS | `POST /api/deposit-ledger/backfill/dry-run` returned `dryRun=true` and did not mutate historical data. |
| Payment approval hook | PASS | Approved booking payment created `PAYMENT_RECEIVED` ledger entry for deposit amount. |
| Deposit settlement hook | PASS | Full refund settlement created `REFUND` ledger entry and reduced ledger held balance to zero. |
| Cleanup | PASS | Test stay/payment/invoice/ledger entries removed; Room G2-005 returned AVAILABLE. |
| Frontend | UNCHANGED | M4A was backend-first only. |

### M4A verified behavior

```text
Created runtime UAT IDs:
- Stay test: 20
- Tenant test: 21
- Room: 5 / G2-005
- Invoice: 31
- PaymentSubmission: 7
- InvoicePayment: 5
- TenantDepositLedgerEntry: 1 PAYMENT_RECEIVED, 2 REFUND

Payment hook:
- PAYMENT_RECEIVED
- direction=INCREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=500000
- sourceType=PAYMENT_SUBMISSION
- sourceId=7

Settlement hook:
- REFUND
- direction=DECREASE_LIABILITY
- amountRupiah=500000
- balanceAfterRupiah=0
- sourceType=STAY_DEPOSIT_SETTLEMENT
- sourceId=20:REFUND

After cleanup:
- Room G2-005 status=AVAILABLE
- activeStayId=null
- currentStay=null
- deposit-ledger summary increaseRupiah=0
- deposit-ledger summary decreaseRupiah=0
- recentEntries=[]
```

### M4A implementation summary

```text
Added backend module:
- src/modules/deposit-ledger/deposit-ledger.module.ts
- src/modules/deposit-ledger/deposit-ledger.controller.ts
- src/modules/deposit-ledger/deposit-ledger.service.ts
- src/modules/deposit-ledger/dto/deposit-ledger-query.dto.ts

Modified backend:
- prisma/schema.prisma
- src/app.module.ts
- src/common/enums/app.enums.ts
- src/modules/payment-submissions/payment-submissions.module.ts
- src/modules/payment-submissions/payment-submissions.service.ts
- src/modules/stays/stays.module.ts
- src/modules/stays/stays.service.ts
```

### Current honest label

```text
M4A Deposit Ledger Backend Foundation = FULL PASS + pushed.
Do not claim M4B until frontend surfaces are implemented and manually/UI smoked.
```

### Next recommended step

```text
PLAN M4B Frontend Deposit Timeline.
Focus:
- Admin Stay Detail / Finance tab deposit summary + timeline.
- Tenant My Stay deposit card with tenant-friendly microcopy.
- Owner/Finance deposit ledger drilldown.
- No backend mutation unless a missing read shape is proven.
```

### Source-of-truth note

```text
This section supersedes the older M3.2-only and V5.29-K current-state sections below.
Older sections remain as historical record.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```
<!-- KOST48_DOCS_SYNC_20260528_M4A_END -->



## 2026-05-28 — M4A Deposit Ledger Backend Foundation

### Added

- Added `TenantDepositLedgerEntry` model.
- Added deposit ledger entry types and directions.
- Added Deposit Ledger backend module.
- Added endpoints:
  - `GET /api/deposit-ledger/stays/:stayId`
  - `GET /api/deposit-ledger/tenants/:tenantId`
  - `GET /api/deposit-ledger/summary`
  - `GET /api/deposit-ledger/reconciliation-lite`
  - `POST /api/deposit-ledger/backfill/dry-run`
- Added payment approval hook for `PAYMENT_RECEIVED`.
- Added deposit settlement hook for refund/deduction/forfeit timeline events.

### Verified

- Backend build PASS from user local report.
- Summary endpoint PASS.
- Reconciliation-lite endpoint PASS.
- Backfill dry-run PASS.
- New deposit payment approval creates ledger entry PASS.
- Full refund settlement creates ledger entry PASS.
- Cleanup returns test room and ledger summary to clean state PASS.

### Not changed

- Frontend unchanged.
- Stay deposit snapshot fields remain.
- Payment/renew/checkout lifecycle rules unchanged.
- Historical deposit backfill remains dry-run only.


## 0.0 Latest Current State — V5.29-K Controlled Monthly Auto-Close Governance PASS + Pushed

```text
Current latest pushed commit:
7c8c8e7 feat(accounting): add controlled monthly auto close governance

Previous latest pushed commits:
0285dbe feat(accounting): ship posting period governance and invoice journal lifecycle
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
51eba86 feat(accounting): add statement command center finance cockpit
286e512 fix(accounting): block manual edits in closed period governance

Release status:
- V5.29-H/I/J accounting invoice lifecycle and period governance were verified before K.
- V5.29-K Controlled Monthly Auto-Close Governance is built, UAT-smoked, committed, and pushed.
- Backend build PASS from user local report.
- Frontend build PASS from user local report.
- Auto-close policy endpoint PASS.
- Owner manual auto-run safe-skip PASS.
- AutoOps accountingAutoClose integration PASS.
- ADMIN auto-run blocked with 403 PASS.
- Owner close without reason blocked with 400 PASS.
- Generated Prisma was restored and was not committed.
- Commit 7c8c8e7 is pushed to origin/main.

V5.29-K verified behavior:
- Auto-close policy basis is PERIOD_AUTO_CLOSE_MONTHLY_V5_29_K.
- Mode is AUTO_MONTHLY_PREVIOUS_PERIOD.
- Auto-close targets only the previous month, not the current month.
- Target period must already exist and must be OPEN.
- Period close readiness must return canPost=true.
- Closing preview must be balanced before posting.
- If blocker exists or target period is missing, system skips safely and does not force close.
- Owner can manually trigger auto-close through /api/accounting/period-close/auto-run.
- AutoOps run includes accountingAutoClose result.
- Admin cannot trigger auto-close manually.
- Manual period close requires a closing reason of at least 8 characters.

Known honest limitation:
- Actual auto-close closed=true scenario is deferred because target period 2026-04 did not exist in current UAT data.
- The verified K result is controlled safe-skip + governance/role/validation PASS, not actual previous-period closing PASS.
- Manual UI smoke remains user-side visual verification if needed.

Product decision locked:
- KOST48 may use automatic monthly period close, but only as controlled automation.
- Auto-close is not blind automation.
- It must be blocker-aware, auditable, balanced, role-safe, and reversible only through official reopen workflow.
- Reopen remains Owner-only and reason-required.
```

### Source-of-truth note

```text
This section supersedes older V5.29-C/D/E/H/I/J planning sections below.
Older sections remain as historical record only.
For coding, inspect the latest real repo/ZIP first.
If docs and code differ, write "docs/code out of sync" and follow real code.
```

## 2026-05-27 — V5.29-K Controlled Monthly Auto-Close Governance

### Type

Backend accounting governance + AutoOps integration + frontend accounting UI polish.

### Added / Changed

- Added controlled monthly auto-close policy endpoint.
- Added Owner manual auto-close runner.
- Integrated accounting auto-close into AutoOps result.
- Auto-close targets previous month only.
- Auto-close skips safely if target period is missing, not OPEN, readiness is blocked, or preview is unbalanced.
- Manual period close now requires a reason/note of at least 8 characters.
- ADMIN manual auto-close is blocked.
- Owner-facing Accounting Setup UI now explains controlled monthly auto-close.
- Period close UI copy now clarifies manual close vs automatic monthly close.
- Added frontend API support for auto-close policy and manual auto-run.

### Verified

```text
Backend build PASS from user local report.
Frontend build PASS from user local report.
Runtime UAT:
- GET /api/accounting/period-close/auto-policy PASS.
- POST /api/accounting/period-close/auto-run as OWNER PASS safe-skip.
- POST /api/auto-ops/run includes accountingAutoClose PASS safe-skip.
- POST /api/accounting/period-close/auto-run as ADMIN returns 403 PASS.
- POST /api/accounting/period-close/post without reason returns 400 PASS.

Commit pushed:
7c8c8e7 feat(accounting): add controlled monthly auto close governance
```

### Not Changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No payment/stay/renew/checkout lifecycle rewrite.
- No generated Prisma commit.
- No microservices/apps folder.
- No blind auto-close.
- No automatic creation of missing accounting periods.

### Carry-forward

```text
Actual auto-close closed=true UAT remains deferred until previous OPEN period exists and readiness/preview are complete.
Next recommended product track: M1 Tenant My Stay Guide Full Audit.
Alternative accounting track: V5.29-L Actual Auto-Close Closed=True UAT + Year-End Close Planning.
```


## 2026-05-27 — V5.29-C/D Lifecycle Data Integrity + Renew/Checkout UTC Hotfix

### Type

Backend lifecycle/data integrity hotfix + frontend renew approval cache/date handling.

### Added / Changed

- Added strict deposit partial refund guard.
- Preserved explicit `agreedRentAmountRupiah=0`.
- Corrected stay `invoiceCount` vs `openInvoiceCount`.
- Ensured DRAFT invoice counts as open.
- Passed renew request `requestedTerm` into renew execution.
- Ensured renewal invoice remains `ISSUED` after approve.
- Corrected checkout notification primary date to requested checkout date.
- Stabilized checkout request list response shape for frontend `data.items`.
- Added/confirmed frontend cache invalidation after approve renew.
- Reworked lifecycle/finance date helpers to use UTC-safe calendar logic.
- Fixed renew approval H-1 drift for stay planned checkout and invoice period dates.
- Converted frontend renew approval date input to full ISO UTC.
- Cleaned tenant blocker copy so raw enum `(ISSUED)` no longer leaks.

### Verified

```text
Backend build PASS from user local report.
Frontend build PASS from user local report.
Runtime UAT PASS:
- B1 deposit invalid/valid partial refund
- B2 rent 0
- B3 invoice count/open count/DRAFT open
- B4 renew requestedTerm
- B5 checkout UTC + notification
- B7 checkout list shape
- F2 frontend cache invalidation
- HOTFIX3 renew UTC date precision
- HOTFIX4 tenant blocker microcopy

Commit pushed:
f6af6fc fix(lifecycle): harden deposit renew checkout data integrity
```

### Not Changed

- No schema change.
- No DB reset.
- No production DB mutation.
- No lifecycle rewrite.
- No generated Prisma commit.
- No microservices/apps folder.

### Carry-forward

```text
V5.29-E Admin Check-In + Invoice Hygiene Fix remains next:
- F1 check-in pricing terms,
- B6 DRAFT invoice cancellation reversal hygiene.
```

## 2026-05-26 — V5.29-B9A Statement Command Center Finance Cockpit

### Type

Frontend accounting/finance UX hardening. Backend unchanged.

### Added / Changed

- Added owner-readable Finance → Laporan Keuangan cockpit.
- Added statement cards for Trial Balance, Neraca, Laba Rugi, Aset, Period Close, and Data Quality.
- Added Accounting Data Quality Panel.
- Added Period Close / Reopen / Re-close Timeline.
- Added Journal Audit Trail Panel.
- Cleaned user-facing finance wording from technical phase labels.
- Renamed owner finance navigation from Setup Accounting to Laporan Keuangan.

### Verified

```text
Frontend build PASS.
Runtime accounting API smoke PASS.
Manual UI smoke PASS.
Commit pushed:
51eba86 feat(accounting): add statement command center finance cockpit
```

### Not Changed

- Backend unchanged.
- No schema change.
- No DB reset.
- No payment/stay/renew/checkout lifecycle rewrite.
- No generated Prisma commit.

---

## 2026-05-26 — V5.29-B9B Copy Consistency Cleanup

### Type

Backend/frontend copy consistency cleanup for accounting readiness and statement surfaces.

### Added / Changed

- Removed stale B1/B2/no-auto-posting-style warning from readiness response when ledger is ready.
- Readiness warning now says ledger accounting is ready to read while still requiring owner data-quality review.
- Trial Balance formalStatementReady now aligns with balanced ledger state.
- Frontend accounting copy cleaned from technical wording like Auto Journal Lite / Guarded / old phase labels.

### Verified

```text
Runtime accounting API smoke PASS from user log:
- readiness warnings current,
- Trial Balance balanced and formalStatementReady=true,
- Balance Sheet ready/formalStatementReady/balanced,
- P&L formalStatementReady=true and excludes closing/reversal,
- Period Close CLOSED with JE-CLOSE-2026-05-V2,
- unmapped operational=0,
- draft journal=0,
- unbalanced posted journal=0,
- depreciation posted,
- asset alignment safe.
```

### Pending

```text
Local backend build / frontend build / commit / push confirmation still required unless user reports completion.
```

---

## 2026-05-26 — Critical Lifecycle/Data Integrity Audit Accepted

### Type

Planning / accepted bug backlog.

### Added

- B1 CRITICAL deposit partial refund guard.
- B2 CRITICAL rent 0 nullish coalescing fix.
- B3 HIGH invoiceCount total vs openInvoiceCount filtered.
- B4 HIGH requestedTerm renew approve.
- F1 HIGH check-in pricing terms.
- B5 MEDIUM checkout notification requested date.
- B6 MEDIUM DRAFT invoice cancellation reversal hygiene.
- B7 MEDIUM checkout response consistency.
- F2 LOW renew approve cache invalidation.

### Next target

```text
V5.29-C Critical Lifecycle/Data Integrity Hotfix
```


## 2026-05-26 — V5.28-B8 Closed Period Governance + Reopen/Reversal

### Type

Backend accounting governance + frontend period close UI hardening.

### Added / Changed

- Added `JournalSourceType.CLOSING_REVERSAL`.
- Added reopen metadata fields to `AccountingPeriod`.
- Added period reopen preview endpoint.
- Added Owner-only period reopen endpoint.
- Reopen creates reversal journal instead of deleting/editing closing journal.
- Re-close after reopen creates next version, e.g. `JE-CLOSE-2026-05-V2`.
- Manual status mutation on `AccountingPeriod` is blocked.
- Journal draft/posting into CLOSED period is blocked unless controlled by governance workflow.
- P&L excludes `CLOSING_ENTRY` and `CLOSING_REVERSAL` by default.
- PeriodClosePanel now supports closed period, reopen preview, and reopen flow.

### Verified

```text
Reopen preview balanced.
Reopen/reversal succeeded.
AccountingPeriod returned OPEN.
Re-close preview balanced.
Re-close post created JE-CLOSE-2026-05-V2.
Duplicate close after re-close blocked.
Trial Balance after re-close balanced: Debit 34.170.000 = Kredit 34.170.000.
Balance Sheet after re-close balanced: Assets 29.915.000 = Liabilities+Equity 29.915.000.
P&L remained operational/readable with net -85.000.
Commit pushed:
286e512 fix(accounting): block manual edits in closed period governance
```

### Not Changed

- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.
- No production mutation.
- No generated Prisma commit.
- No microservices/apps folder.

---

## 2026-05-26 — V5.27-B7 Period Close + Retained Earnings

### Type

Backend accounting close foundation + frontend Owner period close workflow.

### Added / Changed

- Added `JournalSourceType.CLOSING_ENTRY`.
- Added close metadata fields to `AccountingPeriod`.
- Added period close readiness endpoint.
- Added period close preview endpoint.
- Added Owner-only period close post endpoint.
- Closing journal moves revenue/expense/COGS result into Retained Earnings.
- Balance Sheet after close moves closed period result into Retained Earnings.
- P&L operational report excludes closing entries by default.

### Verified

```text
Readiness ready=true.
Preview closing journal balanced.
Post close created JE-CLOSE-2026-05.
AccountingPeriod status CLOSED.
Duplicate close blocked.
Trial Balance remained balanced.
Balance Sheet remained balanced.
P&L stayed readable after close.
Commit pushed:
ff2008f feat(accounting): add period close retained earnings workflow
```

### Not Changed

- No reopen in B7.
- No payment/stay/renew/checkout lifecycle rewrite.
- No DB reset.


## 2026-05-24 — V5.23-A Admin IA + Finance Add-on Revenue Foundation

### Type

Frontend IA/product patch. Backend unchanged.

### Added / Changed

- Admin sidebar restored with final 5-menu structure:
  - Dashboard
  - Stays & Tenant
  - Finance
  - Staff & Tiket
  - Kamar & Stok
- Removed admin top workspace tabs as primary navigation.
- Dashboard repositioned as cross-menu Command Center.
- Finance IA expanded to include:
  - Tagihan
  - Review Pembayaran
  - Voucher WiFi
  - Pendapatan Tambahan
  - Pengeluaran
  - Riwayat Pembayaran
- Existing `WifiSale` placed as voucher WiFi revenue stream.
- Added Finance placeholder/plan page for future ancillary revenue.
- Expanded expense UI/category copy for kos business context.
- Expanded tenant ticket categories for kos-specific issue reporting.

### Not Changed

- Backend unchanged.
- No schema migration.
- No DB reset.
- No formal accounting ledger yet.
- No Balance Sheet claim.

### Verification

- Source ZIP generated.
- Touched-file syntax checks passed.
- Full frontend build still requires local environment with dependencies.
- Runtime/API smoke still required before PASS.

---

## 2026-05-24 — V5.23-B Accounting & Balance Sheet Foundation Planning

### Type

Planning direction / docs sync.

### Added

- Next official planning track:
  - Accounting Readiness
  - OPEX / COGS / CAPEX
  - AncillaryProduct / AncillarySale
  - CashAccount
  - ChartOfAccount
  - JournalEntry / JournalLine
  - Asset Register
  - Depreciation
  - Opening Balance
  - Balance Sheet readiness
- Clarified that existing finance is operational summary, not formal accounting.

### Not Allowed

- Do not fake Balance Sheet.
- Do not treat deposit as revenue.
- Do not reset DB.
- Do not force full double-entry in one patch without plan.
- Do not create standalone Reports menu until finance/reporting model is concrete.


## 2026-05-24 — V5.20 First Paid Room Priority + Fast AutoOps

### Type

Backend + frontend business-rule patch, AutoOps, payment UX, urgent UI, and docs sync.

### Added

- AutoOps module for deterministic business automation.
- Fast operational deadlines:
  - booking/payment SLA 3 hours,
  - payment review urgent 1 hour,
  - payment review escalate 3 hours,
  - payment review max 6 hours,
  - invoice overdue 24 hours,
  - old late tenant vacate rule 3 hours.
- First-paid room priority contract.
- One-step tenant payment proof flow: `Bayar & Kirim Bukti`.
- Auto-cancel expired unpaid booking.
- Auto-release orphan RESERVED rooms.
- Urgent UI emphasis for special/high-risk cases.
- Dedup direction for repeated assistant/alert copy.

### Changed

- Booking/minat no longer means room fully locked.
- Tenant/public copy now warns that room is secured only after payment is valid and approved.
- Renew/no-debt copy is more explicit.
- Admin/Owner dashboards should prioritize business blockers, not duplicated decorative alerts.

### Not Allowed

- AutoOps must not approve payment.
- AutoOps must not approve renew.
- AutoOps must not final checkout.
- AutoOps must not refund/deduct deposit automatically.
- AutoOps must not create official inventory movements.

### Verification

- Source ZIP generated.
- Static ZIP integrity/source generation completed during patch.
- Local build/UAT still required before FULL PASS.

---

## 2026-05-23 — V5.19 Renew Meter Utility Checkpoint

### Type

Backend lifecycle hardening + frontend renew/payment/checkout UX.

### Added / Fixed

- Renew approval requires electricity/water meter checkpoint.
- Renewal invoice includes rent + electricity + water.
- Meter delta is calculated from previous reading.
- Checkout remains blocked by open invoice.
- Staff removed from sensitive lifecycle actions.
- Runtime UAT from user confirmed:
  - renew without meter fails,
  - renew with meter succeeds,
  - renewal invoice has 3 lines,
  - checkout blocked while invoice open,
  - final checkout succeeds after clear,
  - room returns AVAILABLE,
  - deposit refund succeeds.

### Verification

- Backend runtime UAT PASS from local user log.
- Frontend build was user-confirmed PASS for V5.19B/C before V5.20 work.

---

## 2026-05-22 — V5.17-D Routine Work Cards + Inventory/Staff UX Push

### Type

Frontend staff workspace UX polish.

### Added / Updated

- Restored staff checklist harian/mingguan/bulanan as professional work cards.
- Added progress-style checklist summary without new chart dependency.
- Improved assistant strip so it reads active work/checklist state.
- Improved inventory health UX:
  - stock habis/menipis/aman is computed from quantity/minimum stock.
  - staff no longer manually chooses stock health status.
- Improved staff room/card UX.
- Improved staff report modal readability and progressive flow.
- Improved admin staff field report decision UI.
- Added `frontend/src/utils/inventoryHealth.ts`.

### Verified

- User manual check: “Sudah saya cek sip bagus pass.”
- Commit pushed:

```text
484a288 feat(staff): polish workspace inventory and routine checklist ux
```

### Not Changed

- Backend unchanged for V5.17-D.
- No new chart dependency.
- No dark mode.
- No DB reset.
- Generated Prisma noise restored and not committed.

---

## 2026-05-22 — V5.17-C Inventory Intelligence

### Type

Frontend rule-intelligence UX.

### Changed

- Inventory stock health is now treated as computed information from `qtyOnHand/minQty`.
- Staff warehouse report no longer treats “stok habis/menipis” as manual condition input.
- Warehouse flow is split:
  - physical condition report,
  - stock health warning,
  - restock/action suggestion.
- Assistant highlights stock risk and restock blocker.

### Not Changed

- No backend schema change.
- No official InventoryMovement mutation by staff.

---

## 2026-05-22 — V5.17-B Clean Blue Staff UI + On-Flow Staff/Admin Repair UX

### Type

Frontend UI/UX polish.

### Changed

- Staff room cards became clickable full cards.
- Removed duplicate “Buka” / “Perlu cek” actions when they navigated to the same place.
- Cleaner blue design direction applied.
- Font weights reduced to improve readability.
- Low-contrast text/badge issues reduced.
- Admin review decision input changed from plain select to more on-flow choices.

### Not Changed

- No backend change.
- No new UI dependency.

---

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix

### Type

Backend staff visibility hard fix.

### Fixed

- `GET /api/tickets` for STAFF now shows active tickets assigned to the staff or created through the staff's field reports.
- Default staff list includes:
  - `OPEN`
  - `IN_PROGRESS`
  - `DONE`
- Staff list no longer incorrectly appears empty when active assigned tickets exist.

### Verified

Manual UAT:
- Staff user:
  - `id=3`
  - `role=STAFF`
- Fresh room item report created ticket:
  - `id=12`
  - `ticketNumber=TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff `GET /api/tickets?limit=20` displayed the active assigned ticket.

### Not Changed

- No frontend source change required for V5.16-G itself.
- No UAT script file added.
- No DB reset.

---

## 2026-05-22 — V5.16-F Staff Repair UX Final Polish

### Type

Frontend UX polish + backend visibility preparation.

### Updated

- Staff/admin wording made more human:
  - “Belum mulai”
  - “Sedang dikerjakan”
  - “Selesai, menunggu cek admin”
  - “Selesai final”
  - “Dibatalkan admin”
- Admin queue wording changed to “Antrian konfirmasi admin”.
- Staff work queue cleaned from technical jargon.

### Verification

Initial UAT showed report/linking still worked, but staff list needed V5.16-G hard fix.

---

## 2026-05-21 — V5.16-E Staff Ticket Linking + UAT Safe Package

### Type

Backend linking and UAT behavior cleanup.

### Fixed

- Fresh staff report for room item fills `linkedRoomItemId`.
- Fresh staff report for inventory item fills `linkedInventoryItemId`.
- Staff ticket detail visibility works.
- UAT commands are written in chat, not committed as script files.

### Verified

- Ticket 9 had `linkedRoomItemId=1`.
- Ticket 8 had `linkedInventoryItemId=2`.
- Ticket 8 and 9 were cancelled after UAT.

---

## 2026-05-21 — V5.16-D Staff Repair Select Contract + UAT

### Type

Frontend select contract + backend DTO alignment.

### Added

- Frontend `staffRepairOptions` single source of truth.
- Separate option sets for:
  - room item condition,
  - warehouse item condition,
  - admin decision,
  - final room item status,
  - final inventory item status.

### Verified

Manual UAT:
- Staff room item report applied temporary `MAINTENANCE`.
- Replacement request saved.
- Staff warehouse report applied temporary `PENDING_CHECK`.
- Admin review `APPROVE`, `NEEDS_MORE_INFO`, and `REJECT` accepted.
- Movement created and stock decreased.

---

## 2026-05-21 — V5.16-C Staff Repair Flow Stabilization

### Type

Validation and lifecycle hardening.

### Fixed

- Field report condition notes required.
- Replacement request requires inventory item and qty.
- Admin movement only allowed when decision is `APPROVE`.
- Staff reports require note or photo evidence.
- Ticket close remains valid only from `DONE`.

---

## 2026-05-21 — V5.16-B Staff Field Report + Admin Confirmation Queue

### Type

Backend schema additive + frontend admin/staff flow.

### Added

- `StaffFieldReport`.
- `ReportedCondition`.
- `AdminDecision`.
- `StaffFieldReportStatus`.
- Ticket nullable final/link fields:
  - `linkedRoomItemId`
  - `linkedInventoryItemId`
  - `finalRoomItemStatus`
  - `finalInventoryItemStatus`
  - `finalAdminNote`
- Admin review queue.
- Staff field reports API.

### Not Changed

- No DB reset.
- No lifecycle rewrite.
- Inventory movement remains owner/admin.

---

## 2026-05-21 — V5.16-A Staff Repair Governance

### Type

Business flow correction.

### Changed

- Staff status update became “laporan kondisi”.
- Staff no longer appears to decide final item status.
- Frontend wording changed from “Update Status” to “Laporkan Kondisi Barang”.

---

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation

### Type

Product/UX/architecture planning docs sync only.

### Added

- Intelligent Command Center direction.
- Assistant vs queue dedup strategy.
- Tier 0 deterministic intelligence plan.
- Tier 1 AI on-demand plan.
- Finance foundation plan.
- Smart chart system plan.

### Not Changed

- No backend source code changed by docs pack.
- No frontend source code changed by docs pack.
- No schema migration applied.
- No DB reset.


## 2026-05-24 — V5.23-B1 Backend Accounting Foundation Pre-ACT Docs Lock

### Type

Docs/context sync only. No backend/frontend source patch in this docs package.

### Added

- Consolidated backend audit findings from ChatGPT and Cline/DeepSeek.
- Clean backend source snapshot reference: `backend_latest_for_accounting_act_CLEAN.zip`.
- Pre-ACT verdict: READY FOR ACT B1 with additive-only scope.
- B1 Accounting Foundation locked scope: COA, CashAccount, AccountingPeriod, OpeningBalance, JournalEntry/Line, readiness, default COA seed, trial balance draft, unmapped transaction scanner.
- Allowed and forbidden file lists for ACT B1.
- Report honesty rule: existing reports must be marked operational approximation.
- Roadmap correction: TenantDepositLedger is deferred; Stay deposit fields must not be removed/deprecated yet.
- New-chat execution prompt file for the next ChatGPT ACT session.

### Not Changed

- No backend source code changed by this docs sync.
- No frontend source code changed by this docs sync.
- No schema migration applied.
- No DB reset.
- No auto-posting implemented.
- No payment/stay/checkout/renew flow changed.

### Verification

```text
Docs package generated only.
Code build/smoke not applicable to this docs sync.
Next ACT must run backend build and API smoke before claiming PASS.
```

## 2026-05-25 — V5.24-C Admin UI Critical Workflow Hardening

### Type

Frontend admin UI/UX hardening. Backend unchanged.

### Added / Changed

- GlobalSearch restored for admin topbar.
- Dashboard ticket DONE action hardened so it is no longer misleading.
- StaysPage filter behavior corrected so ALL is not hardcoded ACTIVE.
- Dashboard dead code/copy partially cleaned.
- AncillaryRevenuePage changed from roadmap-heavy future list into a more operational finance page.

### Verification

- API smoke confirmed:
  - `GET /api/tickets?limit=20`
  - `GET /api/public/rooms`
- Commit pushed:
  - `cb93fe6 fix(admin): harden dashboard search tickets and finance ux`

### Not Changed

- No backend lifecycle/payment/renew/checkout rewrite.
- No schema change.
- No generated Prisma committed.
- No B3 auto-journal.

---

## 2026-05-25 — V5.24-B2A/B/B2C Accounting Setup

### Type

Backend + frontend accounting setup hardening.

### Added / Changed

- Owner Accounting Setup UI.
- Cash/bank account setup surface.
- Accounting period setup.
- Opening balance draft/post workflow.
- Opening balance posting creates `JournalEntry` with `sourceType=OPENING_BALANCE`.
- Trial Balance avoids double-counting opening balance.
- Duplicate period/cash/opening balance messages hardened.
- Draft opening balance can be voided.
- POSTED opening balance remains protected from void until reversal plan exists.

### Verified

- COA seeded.
- Cash account created.
- Accounting period created.
- Opening balance posted.
- `JE-OPENING-1` created.
- Trial Balance balanced: Debit 30.000.000 = Kredit 30.000.000.
- Balance Sheet guard reads opening balance.
- Draft duplicate voided.
- Commits pushed:
  - `2308f17 feat(accounting): add opening balance setup workflow`
  - `c04aec5 fix(accounting): harden setup workflow messages`
  - `eb198b2 fix(accounting): allow voiding draft opening balances`

### Not Changed

- No invoice/payment/expense/stay auto-posting yet.
- No TenantDepositLedger yet.
- No asset/depreciation yet.
- No destructive schema change.
