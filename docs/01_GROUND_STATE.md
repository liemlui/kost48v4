# KOST48 V5 — Ground State (Ringkas)
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. Baseline kode: `3c7ffe2`. Versi V5.10.0 lama diarsipkan di `archieve/00_GROUND_STATE_V5100_STALE.md`, JANGAN dipakai sebagai referensi.
**Aturan:** file ini hanya memuat fakta yang sudah diverifikasi dari kode. Detail per-flow ada di `02_FLOW_MAP.md` (peta `file:baris`). Riwayat perubahan di `CHANGELOG.md`. Audit V3 SELESAI & dibubarkan ke dossier domain (`06`-`15`); orientasi & peta eksekusi di `00_BLUEPRINT.md`, keputusan owner di `03_KEPUTUSAN_OWNER.md`.

<!-- KOST48_DOCS_SYNC_20260611_GROUND_STATE_REWRITE -->

## 1. Identitas & Stack
- **KOST48 Surabaya** — kost eksklusif pria, 48 kamar (33 reguler, 10 eksklusif, 5 VIP), **Jl. Hikmah V No. 48, Surabaya Barat** (dekat Pakuwon Mall/PTC). (UD-01 terjawab 2026-06-13 D-01: alamat sebelumnya "Ngagel Jaya Utara" SALAH; frontend benar.)
- Backend: NestJS + TypeScript + Prisma + PostgreSQL. Auth JWT Bearer (expiry 24 jam, tanpa refresh token). Swagger non-production saja.
- Frontend: React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- Keamanan: header manual di `main.ts` (TANPA Helmet — keputusan sadar), rate limit in-memory (`common/middleware/rate-limit.middleware.ts`): global 300/menit/IP, auth 10/15 menit/IP.
- DB: `kost48_v3_pro` (UAT, port 5433) / `kost48_v3` (produksi, 5432). **40 model** aktif di schema.prisma.
- Role enum: **OWNER, ADMIN, STAFF, TENANT** (tidak ada SUPER_ADMIN/FINANCE).

### 1.1 Arsitektur Multi-App V5 (Greenfield Shell + Brownfield Extraction)
```text
Tidak semua service dipisah sekaligus.
Tidak ada service-to-service HTTP di fase awal.
Shared DB + shared PrismaService tetap ada.
Extractor pattern: buat shell app → pindahkan module → koneksikan shared foundation.
Target apps: core-api, tenant-api, staff-api, finance-api, marketing-api, owner-api.
```

### 1.2 Struktur Backend Saat Ini
```text
backend/src/
├── main.ts                         # bootstrap, global pipes/filters/interceptors, CORS, prefix
├── app.module.ts                   # root module imports
├── prisma/                         # PrismaService + generated client
├── common/                         # decorators, guards, enums, filters, interceptors, middleware
├── auth/                           # JWT auth module (login, roles guard)
├── audit-log/                      # audit trail service
├── modules/
│   ├── stays/                      # Stay lifecycle (create, complete, cancel, renew, promote)
│   ├── rooms/                      # Room CRUD + occupancy/status
│   ├── tenants/                    # Tenant profiles
│   ├── invoices/                   # Invoice generation & management
│   ├── payment-submissions/        # Payment proof submission + approval
│   ├── tenant-bookings/            # Tenant self-booking + admin approval
│   ├── checkout-requests/          # Checkout request + final
│   ├── renew-requests/             # Renew request + admin execution
│   ├── notifications/              # In-app notifications
│   ├── tickets/                    # Ticket system (CHECKOUT_INSPECTION, EVICT_OVERSTAY, etc.)
│   ├── inventory/                  # Inventory items, room items, movements
│   ├── expenses/                   # Operational expenses
│   ├── deposits/                   # Deposit settlement + ledger
│   ├── accounting/                 # Journal entries, COA, ledger, periods
│   ├── finance/                    # Finance dashboards
│   ├── public/                     # Public endpoints (rooms, register)
│   ├── dashboard/                  # Admin dashboards
│   ├── reports/                    # Financial reports
│   ├── me/                         # Authenticated user endpoints
│   ├── announcements/              # Announcement CRUD
│   └── maintenance/                # Room maintenance schedules
```

### 1.3 Frontend Route/Surface Map
| Route Pattern | Surface | Auth |
|---|---|---|
| `/` | Landing / public home | Public |
| `/rooms` | Public room list | Public |
| `/rooms/:id` | Public room detail | Public |
| `/register` | Tenant registration | Public |
| `/login` | Login | Public |
| `/portal/*` | Tenant portal | TENANT |
| `/staff/*` | Staff workspace | STAFF/ADMIN |
| `/admin/*` | Admin/backoffice | ADMIN |
| `/finance/*` | Finance workspace | ADMIN |
| `/owner/*` | Owner dashboard | OWNER/ADMIN |

### 1.4 Active Prisma Models (40)
`AuditLog`, `BookingPaymentSubmission`, `CheckoutRequest`, `ContractRule`, `DepositSettlement`, `Expense`, `ExpenseCategory`, `ExpensePayment`, `ExpenseSplit`, `InventoryItem`, `InventoryMovement`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `JournalEntry`, `JournalEntryLine`, `Notification`, `PaymentSubmission`, `PaymentSubmissionReview`, `PricingRule`, `RenewRequest`, `Review`, `Room`, `RoomFacility`, `RoomFile`, `RoomGalleryImage`, `RoomItem`, `RoomMaintenanceSchedule`, `RoomUtilityAccount`, `Stay`, `StayFile`, `StayNote`, `StayUtilityUsage`, `Tenant`, `TenantBooking`, `TenantDeposit`, `TenantNotification`, `User`, `Ticket`, `TicketCategory`, `TicketComment`, `TicketWatcher`, `AccountingPeriod`, `AccountingPostingConfig`, `ClosingPeriod`, `Coa`, `GeneralLedger`, `OpeningBalance`, `Workspace`, `WorkspaceMembership`

### 1.5 Known Limitations Saat Ini
- No service-to-service HTTP yet.
- No separate database per app.
- No event bus / message queue.
- No refresh token.
- No email/WA delivery (only in-app notification + PWA push planned).
- No damage/penalty model yet.
- No asset/depreciation.
- Staff inventory read-only.
- Owner dashboard aggregated data (no real-time push).
- Tanpa denda keterlambatan (keputusan owner D1).
- Deploy = FRESH (bukan migrasi dari sistem lama).

## 2. Konsep kunci (wajib paham sebelum menyentuh kode)
- **Tidak ada model Booking.** Satu `Stay` mewakili seluruh siklus: booking = Stay ACTIVE + Room RESERVED + belum promoted; huni = promoted (`initialMetersPromotedAt` terisi) + Room OCCUPIED.
- **DP ≠ Deposit (ketetapan owner):**
  - **DP** (`Stay.downPayment*`) = uang muka pesan kamar, 30% sewa, bagian harga sewa, **hangus** bila gagal lunas (jurnal `DP_FORFEIT`).
  - **Deposit jaminan** (`Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`) = uang titipan, dicek saat checkout, **refundable** via settlement + ledger.
- **Alur booking:** bayar DP 30% (atau lunas langsung) → DP approved = kamar terkunci (pesaing batal) → pelunasan + jaminan paling lambat saat check-in → gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- **First paid wins:** multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- **Overstay lifecycle:** pengingat H-7/H-3/H-1/H-day → H-day pk 12:00 kamar dibuka publik + tiket EVICT_OVERSTAY → H+1 pk 12:00 forced checkout otomatis → kamar MAINTENANCE + `allowBookingWhileCleaning=true` (kotor tapi bisa dipesan; huni menunggu tiket pembersihan ditutup). Pengecualian: tagihan belum lunas → tidak auto-checkout, admin dapat alert.
- **Tanpa denda keterlambatan** (keputusan owner D1, 2026-06-11). Line invoice `PENALTY` hanya untuk potongan manual.
- **Notifikasi hanya in-app** (keputusan D2); rencana jangka panjang: PWA push. Belum ada email/WA nyata.
- **Auto-ops = 9 job sequential** (`auto-ops.service.ts`): bookingExpiry, roomHealer, roomReleaseAtNoon, downPaymentForfeit, contractEndReminders, overstayEnforcement, overstayForcedCheckout, postCheckoutAutoCancel, accountingAutoClose.
- **Akuntansi Auto Journal Lite:** jurnal otomatis idempotent per (sourceType, sourceId); auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh). Reversal cancel invoice kini blocking di semua jalur (fix A8).
- **Room readiness gate:** kamar tidak pernah AVAILABLE tanpa tiket CHECKOUT_INSPECTION ditutup.

## 3. Status audit & pengujian (per 2026-06-13)
- **Audit V1 (V5.12):** 53 temuan (42 backend + 11 UI/UX), 24 FIX dieksekusi (sejarah, diarsipkan di `archieve/_DEPRECATED_03_AUDIT_REPORT.md`).
- **Audit V3 (SELESAI):** 97 temuan + 84 keputusan owner + 4 desain fitur — semua DIBUBARKAN ke dossier domain `06`-`15` (detail forensik diarsip di `archieve/_DEPRECATED_AUDIT_*`). Orientasi: `00_BLUEPRINT.md`; keputusan: `03_KEPUTUSAN_OWNER.md`. Temuan kunci: **belum publish (deploy fresh), Surabaya Barat, 1 staf, tenant=pengawas, no-partial menyeluruh**.
- **COA dikoreksi:** V1 mengklaim 17/17, V3 mengkoreksi menjadi **38 akun**.
- **UAT runtime PASS (DB UAT, 2026-06-12):** siklus DP→pelunasan (M-09 recalc DP, M-12 expiresAt mati, M-07 promoted) · siklus overstay penuh (pengingat H-3/H-day → tiket EVICT → forced checkout H+1 → kamar kotor-bisa-dipesan → settlement deposit berjurnal+ledger → gate room-ready) · renew penuh (invoice sewa+meter, periode menyambung) · rekonsiliasi deposit **mismatch=0** · trial balance **seimbang**; selisih P&L ledger vs operasional terjelaskan 100%.
- **Fondasi terverifikasi runtime:** E-1 guard global default-deny (+@Public), E-3 jaminan check-in manual (ledger+jurnal), E-4 saldo kas dari jurnal, E-5 liability HELD, E-9 hardening — PASS di UAT.
- **DEPLOY = FRESH (keputusan V3/D-06):** sistem BELUM publish, DB = data testing → deploy bersih (drop DB → seed COA → opening balance), BUKAN migrasi; **E-2 backfill data lama TIDAK berlaku**. Runbook: `04_DEPLOY_AND_PWA.md`. **Belum "siap produksi penuh"** sampai Fase 1 (fix laporan F-01..F-21 di dossier 09) tuntas. Sadar-risiko: A13/A15; ditunda: E-6 (TZ WIB → F2-14), E-7 (round-robin → ditunda 1 staf), E-8 (unit test).

## 4. Akun default & perintah
- admin@kost48.com/admin123 · staff@kost48.com/staff123 · tenant.g2@kost48.com/tenant123 · liem.lui@gmail.com/admin123 (OWNER).
- Backend: `npx tsc --noEmit` (check), `npm run start:dev`. Frontend: `npm run build` (tsc+vite), `npm run dev`. Base URL API: `http://localhost:3000/api`.

## 5. Aturan update dokumen
- Rilis baru → update file ini (tetap ringkas, <10 KB) + prepend entri di `CHANGELOG.md`. Jangan biarkan dua sumber kebenaran beda versi.
- File docs >30 KB → arsipkan bagian lama ke `docs/archieve/`.