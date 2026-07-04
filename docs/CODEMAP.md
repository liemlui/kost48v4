# CODEMAP — Peta Navigasi Kode KOST48 V5 (untuk AI)

> **Tujuan:** lompat langsung ke file yang benar tanpa scan buta. **Ini peta NAVIGASI, bukan sumber kebenaran perilaku** — detail aturan/flow ada di M-file domain (kolom "Detail"). Verifikasi simbol via Grep sebelum edit; path bisa bergeser.
> Stack: backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). 42 modul · 57 model · 24 grup halaman.

## Konvensi (sekali paham, berlaku semua modul)
- **Backend modul:** `backend/src/modules/<nama>/` berisi `<nama>.controller.ts` (route `/<nama>`), `<nama>.service.ts` (logika), `<nama>.module.ts` (wiring), `dto/`. Modul besar dipecah multi-service (lihat tabel).
- **Infra backend:** `backend/src/prisma/` (PrismaService), `backend/src/auth/` (JWT+guard role), `backend/src/audit-log/` (AuditLog writer), `backend/src/common/` (`guards/ decorators/ filters/ interceptors/ enums/ utils/ business/`), `backend/src/main.ts` (bootstrap, CORS, prefix `/api`).
- **Frontend halaman:** `frontend/src/pages/<grup>/<Halaman>Page.tsx`; komponen reusable `frontend/src/components/`; util `frontend/src/utils/`.
- **Schema:** `backend/prisma/schema.prisma` (57 model, 69 enum). Generated client `backend/src/generated/prisma/` = **JANGAN baca** (32MB, regen `prisma generate`).

## Backend modul → path → tanggung jawab

### Keuangan & Akuntansi — detail: `M04_KEUANGAN.md`
| Modul/Service | Path (`backend/src/modules/`) | Tanggung jawab |
|---|---|---|
| accounting (core) | `accounting/accounting.service.ts` | Setup CoA, cash account, periode akuntansi |
| accounting (posting) | `accounting/accounting-posting.service.ts` | Posting JournalEntry/Line + reversal; deposit=liability 2000 |
| accounting (reports) | `accounting/accounting-reports.service.ts` | Trial balance, neraca, laba/rugi |
| accounting (close) | `accounting/accounting-period-close.service.ts` | Tutup buku/reopen versioned — **paling matang, jangan utak-atik** |
| accounting (readiness) | `accounting/accounting-readiness.service.ts` | Cek kesiapan sebelum tutup buku |
| rent-recognition | `accounting/rent-recognition.service.ts` | Unearned→earned bulanan (RentRecognitionSchedule) |
| finance | `finance/finance.service.ts` | Ringkasan/dashboard keuangan |
| invoices | `invoices/invoices.service.ts` | Lifecycle invoice + InvoiceLine |
| invoice-payments | `invoice-payments/invoice-payments.service.ts` | Pencatatan pembayaran invoice |
| payment-submissions | `payment-submissions/payment-submissions.service.ts` | Bukti bayar tenant → verifikasi admin |
| deposit-ledger | `deposit-ledger/deposit-ledger.service.ts` | Ledger deposit jaminan (refundable, liability) |
| expenses | `expenses/expenses.service.ts` | Biaya operasional |
| assets | `assets/assets.service.ts` | FixedAsset + depresiasi (run/line) |
| reports | `reports/reports.service.ts` | Laporan gabungan operasional+keuangan |

### Siklus Huni — detail: `M05_SIKLUS_HUNI.md` + flow `M03_FLOW_KONTRAK.md`
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| stays (core) | `stays/stays.service.ts` | Lifecycle Stay: booking→huni→selesai (promoted=`initialMetersPromotedAt`) |
| stays (query) | `stays/stays-query.service.ts` | Read/list stay |
| stays (prepay) | `stays/prepay-extension.service.ts` | Perpanjang prabayar fleksibel (2-4 bln ke depan) |
| stays (transfer) | `stays/room-transfer.service.ts` | Pindah kamar (RoomTransfer) |
| tenant-bookings | `tenant-bookings/{public-bookings,tenant-bookings,*-query}.service.ts` | Booking publik & tenant (DP 30% hangus) |
| tenants | `tenants/tenants.service.ts` | Data tenant + KTP (minimal, terproteksi, hapus saat keluar) |
| renew-requests | `renew-requests/renew-requests.service.ts` | Request perpanjang + approve owner; DP≤hari-H, lunas≤DP+7 |
| checkout-requests | `checkout-requests/checkout-requests.service.ts` | Request checkout tenant |
| rooms | `rooms/rooms.service.ts` | Kamar + RoomFacility (defaultDepositRupiah) |
| meter-readings | `meter-readings/meter-readings.service.ts` | Meter listrik/air pascabayar (free 30kWh + Rp2500/kWh) |

### Operasional & Staff — detail: `M06_OPERASIONAL.md`
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| tickets | `tickets/tickets.service.ts` | Tiket keluhan/perbaikan + tiket inspeksi (guard AVAILABLE) |
| auto-ops | `auto-ops/auto-ops.service.ts` | Orchestrator job otomatis (reminder, auto-close, recognition) |
| staff-routines | `staff-routines/staff-routines.service.ts` | Template/assignment/completion rutinitas staf |
| staff-performance | `staff-performance/staff-performance.service.ts` | KPI + StaffPerformanceEvent |
| staff-field-reports | `staff-field-reports/staff-field-reports.service.ts` | Laporan lapangan staf |
| tenant-staff-reviews | `tenant-staff-reviews/tenant-staff-reviews.service.ts` | Review tenant atas kualitas staf |
| inventory-items | `inventory-items/inventory-items.service.ts` | Barang gudang (InventoryItem) |
| room-items | `room-items/room-items.service.ts` | Barang per kamar (RoomItem, FK ke InventoryItem) |
| inventory-movements | `inventory-movements/inventory-movements.service.ts` | Mutasi ASSIGN/OUT/RETURN |
| wifi-sales | `wifi-sales/wifi-sales.service.ts` | Order/penjualan WiFi tenant |
| additional-services | `additional-services/additional-services.service.ts` | Layanan tambahan + minat (ServiceInterest) |

### Publik, Marketing & Growth — detail: `M07_PUBLIK_GROWTH.md`
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| marketing | `marketing/{marketing-public-rooms,facility-images}.service.ts` | Katalog kamar publik + foto fasilitas |
| market-analysis | `market-analysis/market-analysis.service.ts` | Analisa pasar AI DeepSeek (env `DEEPSEEK_API_KEY`) |
| ai | `ai/{ai,ai-cache}.service.ts` | Scaffold rule AI + cache (lama; bukan DeepSeek) |
| analytics | `analytics/analytics.service.ts` | Analitik agregat |
| loyalty | `loyalty/{loyalty,redemption,referral,peer-report}.service.ts` | Poin, reward/redemption, referral, laporan sikap anonim |
| surveys | `surveys/surveys.service.ts` | Survei kepuasan tenant |
| faqs | `faqs/faqs.service.ts` | FAQ (rule flow) |
| announcements | `announcements/announcements.service.ts` | Pengumuman |

### AI Owner/Admin — detail: `M12_AI_OWNER_ADMIN.md`
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| market-analysis (existing) | `market-analysis/{deepseek.client,market-analysis}.service.ts` | Integrasi DeepSeek awal: SWOT/PESTLE/CAC-CLV, fallback offline |
| owner-ai (target Fase G) | `owner-ai/{owner-ai,ai-context-builder}.service.ts` | Tombol manual Owner/Admin: brief, finance analyst, payment review draft, OCR text normalizer, ops/inventory suggestions |
| audit-log | `audit-log/audit-log.service.ts` | Catat `meta.ai` saat manusia memakai draft AI untuk aksi final |
| settings/env | `settings/settings.service.ts` + env | Status AI, budget guard, model, manual-only flag |

### UI/UX Compact (Fase H) — detail: `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md` (🗄️ arsip)
| Area | Path | Tanggung jawab |
|---|---|---|
| navigation config | `frontend/src/config/navigation.ts` | Sidebar sections OWNER/ADMIN/STAFF/TENANT |
| AppLayout + toggle | `frontend/src/components/layout/AppLayout.tsx` | Owner view mode toggle + sidebar adaptif |
| DashboardAdmin | `frontend/src/pages/dashboard/DashboardAdmin.tsx` | Command center 6-area (target compact 3) |
| AdminWorkspaces | `frontend/src/pages/dashboard/AdminWorkspaces.tsx` | Tabel workspace per area (stays/finance/tickets/rooms) |
| OwnerDashboard | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` | Kokpit owner KPI+chart+AI |
| RoleWorkspaceTabs | `frontend/src/components/workspace/RoleWorkspaceTabs.tsx` | Tab navigasi per-role (owner 7 / admin 6) |
| CSS owner + admin | `frontend/src/styles/12-owner.css` + `08-admin.css` | Styling dashboard & sidebar |

### Notifikasi & Sistem
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| notifications | `notifications/{app-notification,reminder-mock,reminder-preview}.service.ts` | Notif in-app + preview reminder |
| push | `push/push.service.ts` | Web-push PWA (VAPID) |
| users | `users/users.service.ts` | User/role (OWNER/ADMIN/STAFF/TENANT), profil, tip e-wallet |
| settings | `settings/settings.service.ts` | OperationalSetting (toggle meter air, dll) |

## Frontend grup halaman (`frontend/src/pages/`)
`public` katalog+booking publik · `auth` login · `portal` area tenant (MyStay, invoice, loyalty, manual) · `dashboard` (DashboardAdmin owner/admin) · `stays` · `bookings` · `renew-requests` · `invoices` · `payments` · `finance` (AccountingSetup) · `reports` · `rooms` · `resources`+`admin` (CRUD generik via ConfiguredResourcePage/SimpleCrudPage) · `tickets` · `staff`+`staff-routines` · `services` · `marketing` · `loyalty` · `notifications`+`reminders` · `settings` · `profile` · `components/ai` (target Fase G reusable AI button/drawer).

## Index model (57) — grup → `schema.prisma`
- **Identitas/akses:** User, Tenant, PasswordResetToken, AuditLog, PushSubscription, AppNotification, OperationalSetting
- **Huni:** Room, RoomFacility, Stay, RoomTransfer, RenewRequest, CheckoutRequest, MeterReading
- **Uang:** Invoice, InvoiceLine, InvoicePayment, PaymentSubmission, TenantDepositLedgerEntry, Expense, WifiSale
- **Akuntansi:** ChartOfAccount, CashAccount, AccountingPeriod, OpeningBalanceBatch, OpeningBalanceLine, JournalEntry, JournalLine, RentRecognitionSchedule, FixedAsset, AssetDepreciationRun, AssetDepreciationLine
- **Operasional/staf:** Ticket, StaffRoutineTemplate/Assignment/Completion, StaffWorkAudit, StaffPerformanceEvent, StaffReview, StaffFieldReport, InventoryItem, RoomItem, InventoryMovement, Announcement
- **Growth/AI:** LoyaltyPoint, LoyaltyReward, Redemption, PeerBehaviorReport, TenantReferral, Faq, AdditionalService, ServiceInterest, SatisfactionSurvey, TenantStaffReview, MarketAnalysis, AiDraft, GuestPreferenceSurvey, ExternalReview

## Flow & audit anchor
Tabel flow + method-anchor: `M03_FLOW_KONTRAK.md` (kontrak/uang) & `M09_AUDIT.md` (job otomatis, mis. `runAccountingAutoClose`, `rent-recognition`). Keputusan owner (84): `M02_KEPUTUSAN_OWNER.md`.

## Shared utilities (ditambahkan 2026-07-07)
| Utility | Path | Tanggung jawab |
|---------|------|----------------|
| `dateOnlyWib` / `todayWib` / `isoDate` | `backend/src/common/utils/date-only.ts` | Normalisasi tanggal WIB (UTC+7) — pakai di semua modul akuntansi (unifikasi dari 5 implementasi) |

## Dokumen audit terbaru
- **Audit Fable (2-3 Jul 2026):** `docs/audit/00_INDEX.md` — 19 checklist C01-C19
- **Audit Reasonix Code (7 Jul 2026):** `docs/audit-reasonix/RINGKASAN_EKSEKUTIF.md` — 82 temuan baru
