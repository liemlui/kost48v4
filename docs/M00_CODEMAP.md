# CODEMAP — Peta Navigasi Kode KOST48 V5 (untuk AI)

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> **Tujuan:** lompat langsung ke file yang benar tanpa scan buta. **Ini peta NAVIGASI, bukan sumber kebenaran perilaku** — detail aturan/flow ada di M-file domain (kolom "Detail"). Verifikasi simbol via Grep sebelum edit; path bisa bergeser.
> Stack: backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). 46 modul · 62 model (lokal 6 Sep) · 24 grup halaman.

## Konvensi (sekali paham, berlaku semua modul)
- **Backend modul:** `backend/src/modules/<nama>/` berisi `<nama>.controller.ts` (route `/<nama>`), `<nama>.service.ts` (logika), `<nama>.module.ts` (wiring), `dto/`. Modul besar dipecah multi-service (lihat tabel).
- **Infra backend:** `backend/src/prisma/` (PrismaService), `backend/src/auth/` (JWT+guard role + RefreshToken), `backend/src/audit-log/` (AuditLog writer), `backend/src/common/` (`guards/ decorators/ filters/ interceptors/ enums/ utils/ business/`), `backend/src/main.ts` (bootstrap, CORS, prefix `/api`).
- **Frontend halaman:** `frontend/src/pages/<grup>/<Halaman>Page.tsx`; komponen reusable `frontend/src/components/`; util `frontend/src/utils/`.
- **Schema:** `backend/prisma/schema.prisma` (62 model, 74 enum; lokal 6 Sep 2026). Generated client `backend/src/generated/prisma/` = **JANGAN baca** (32MB, regen `prisma generate`).

## Update implementasi 2026-07-23

Baseline historis 23 Juli 2026 adalah `8627289`; HEAD sesi berikutnya harus diperiksa dari Git. Rangkuman lintas perubahan AI pada release ini ada di `M13_CHANGELOG.md` dan `M13_CHANGELOG.md`.

- Backend sekarang diperiksa dengan `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, dan `strictBindCallApply`; gunakan `common/utils/error-handler.ts` untuk pola log/rethrow yang seragam.
- `TenantBookingsQueryService` sudah dihapus. Jalur booking memakai service aktif dan helper bersama di `tenant-bookings/`; jangan membuat ulang service query lama.
- `StaysController` memanggil `StaysRenewalService` langsung untuk renewal; `StaysService` tetap fokus lifecycle inti.
- CSS frontend dimuat terpusat dari `frontend/src/styles.css`; file wrapper `public-area.ts`, `staff-area.ts`, dan `tenant-area.ts` sudah tidak ada. Konstanta lintas halaman ada di `frontend/src/config/constants.ts`.

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
| tenant-bookings | `tenant-bookings/{public-bookings,tenant-bookings}.service.ts` + `*.helpers.ts` | Booking publik & tenant (DP 30% hangus); query/map booking bersama, tanpa `TenantBookingsQueryService` |
| tenants | `tenants/tenants.service.ts` | Data tenant + KTP (minimal, terproteksi, hapus saat keluar) |
| renew-requests | `renew-requests/renew-requests.service.ts` | Request perpanjang + approve owner; DP≤hari-H, lunas≤DP+7 |
| checkout-requests | `checkout-requests/checkout-requests.service.ts` | Request checkout tenant |
| rooms | `rooms/rooms.service.ts` | Kamar + RoomFacility (defaultDepositRupiah) |
| meter-readings | `meter-readings/meter-readings.service.ts` | Meter listrik/air pascabayar; quota listrik mengikuti periode sewa lunas (bukan selalu bulan kalender) |

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
| iot | `iot/{iot,iot-polling,water-ingest}.service.ts` | Telemetri Tuya/ESP32, overview tenant/owner, timeline listrik; monitoring-only tanpa SSE |
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
| announcements | `announcements/{announcements.service,announcements.controller}.ts` | Pengumuman, akses detail, gambar terproteksi, hard delete + cleanup notifikasi |

### AI Owner/Admin — detail: `M09_AI_OWNER_ADMIN.md`
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| market-analysis (existing) | `market-analysis/{deepseek.client,market-analysis}.service.ts` | Integrasi DeepSeek awal: SWOT/PESTLE/CAC-CLV, fallback offline |
| owner-ai (Fase G) | `owner-ai/{owner-ai,ai-context-builder}.service.ts` | Tombol manual Owner/Admin: brief, finance analyst, payment review draft, OCR text normalizer, ops/inventory suggestions |
| audit-log | `audit-log/audit-log.service.ts` | Catat `meta.ai` saat manusia memakai draft AI untuk aksi final |
| settings/env | `settings/settings.service.ts` + env | Status AI, budget guard, model, manual-only flag |

### Notifikasi & Sistem
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| notifications | `notifications/{app-notification,reminder-mock,reminder-preview}.service.ts` | Notif in-app + preview reminder |
| push | `push/push.service.ts` | Web-push PWA (VAPID) |
| auto-ops announcement | `auto-ops/sweeps/announcement-sweep.service.ts` | Dispatch pengumuman terjadwal, dedupe penerima, `dispatchedAt` |
| users | `users/users.service.ts` | User/role (OWNER/ADMIN/STAFF/TENANT), profil, tip e-wallet |
| settings | `settings/settings.service.ts` | OperationalSetting (toggle meter air, dll) |

### Modul Baru (Fase Audit Reasonix + OC)
| Modul/Service | Path | Tanggung jawab |
|---|---|---|
| guest-preferences | `guest-preferences/guest-preferences.service.ts` | Survei preferensi kamar (OC-04) |
| staff-dashboard | `staff-dashboard/staff-dashboard.service.ts` | Dashboard aggregate staff (OC-07) |
| ancillary-revenue | `ancillary-revenue/ancillary-revenue.service.ts` | Pendapatan tambahan dinamis (OC-01) |

## Frontend grup halaman (`frontend/src/pages/`)
Standar struktur dan progressive disclosure Owner/Admin: `docs/M17_PORTAL_FLOW_RINGKAS.md`.
`public` katalog+booking publik · `auth` login · `portal` area tenant (MyStay, invoice, loyalty, manual) · `dashboard` (DashboardAdmin owner/admin) · `stays` · `bookings` · `renew-requests` · `invoices` · `payments` · `finance` (AccountingSetup) · `reports` · `rooms` · `resources`+`admin` (CRUD generik via ConfiguredResourcePage/SimpleCrudPage) · `tickets` · `staff`+`staff-routines` · `services` · `marketing` · `loyalty` · `notifications`+`reminders` · `settings` · `profile` · `components/ai` (Fase G reusable AI button/drawer).

## Index model (61) — grup → `schema.prisma`
- **Identitas/akses:** User, Tenant, PasswordResetToken, RefreshToken, AuditLog, PushSubscription, AppNotification, OperationalSetting
- **Huni:** Room, RoomFacility, Stay, RoomTransfer, RenewRequest, CheckoutRequest, MeterReading
- **IoT/telemetri:** IotDevice, IotIngestMessage, IotTelemetry
- **Uang:** Invoice, InvoiceLine, InvoicePayment, PaymentSubmission, TenantDepositLedgerEntry, Expense, WifiSale
- **Akuntansi:** ChartOfAccount, CashAccount, AccountingPeriod, OpeningBalanceBatch, OpeningBalanceLine, JournalEntry, JournalLine, RentRecognitionSchedule, FixedAsset, AssetDepreciationRun, AssetDepreciationLine
- **Operasional/staf:** Ticket, StaffRoutineTemplate/Assignment/Completion, StaffWorkAudit, StaffPerformanceEvent, StaffReview, StaffFieldReport, InventoryItem, RoomItem, InventoryMovement, Announcement
- **Growth/AI:** LoyaltyPoint, LoyaltyReward, Redemption, PeerBehaviorReport, TenantReferral, Faq, AdditionalService, ServiceInterest, SatisfactionSurvey, MarketAnalysis, AiDraft, GuestPreferenceSurvey, ExternalReview

## Flow & audit anchor
Tabel flow + method-anchor: `M03_FLOW_KONTRAK.md` (kontrak/uang). Job otomatis → `M06_OPERASIONAL.md` § Auto-Ops. Keputusan owner (84+): `M02_KEPUTUSAN_OWNER.md`. Audit terdahulu → `docs/archieve/_previous_cycles/M09_AUDIT.md`.

## Shared utilities (ditambahkan 2026-07-07)
| Utility | Path | Tanggung jawab |
|---------|------|----------------|
| `dateOnlyWib` / `todayWib` / `isoDate` | `backend/src/common/utils/date-only.ts` | Normalisasi tanggal WIB (UTC+7) — pakai di semua modul akuntansi (unifikasi dari 5 implementasi) |
| `roundRupiah` / `rupiahAmount` | `backend/src/common/business/money.helper.ts` | Standarisasi pembulatan Rupiah (F4-10) |
| `cashflow-classifier` | `backend/src/common/utils/cashflow-classifier.ts` | Klasifikasi kas vs AR (F1-3) |
| `financial-ratios.helper` | `backend/src/common/utils/financial-ratios.helper.ts` | Helper rasio keuangan (F1-4) |
| `room-booking.util` | `backend/src/common/utils/room-booking.util.ts` | Konsolidasi helper booking (F2-5) |
| `staff-assignment.util` | `backend/src/common/utils/staff-assignment.util.ts` | Round-robin assignment staf |
| `ticket-number.util` | `backend/src/common/utils/ticket-number.util.ts` | Generate nomor tiket |
| `catchError` / `logError` | `backend/src/common/utils/error-handler.ts` | Log error ber-konteks; `catchError` rethrow, `logError` untuk fire-and-forget |
| `getUtilityBillingCycle` / `getUtilityAllowanceMonths` | `backend/src/common/business/utility-billing-cycle.helper.ts` | Siklus quota listrik berdasarkan periode sewa lunas, termasuk renewal multi-bulan |

## Frontend — Redundansi UI/UX (Fase AM)

✅ **16/16 task selesai** — Detail → `docs/archieve/_previous_cycles/M14_REDUNDANSI_UI_UX.md`

| Task | Dampak |
|------|--------|
| AM-01 Unifikasi WhatsApp URL | 13 instance → 1 `utils/whatsapp.ts` |
| AM-02 Hapus RoleWorkspaceTabs | Duplikat dashboard tabs di AppLayout |
| AM-05 Tambah Pengumuman sidebar | Ikon 📣 di nav admin |
| AM-06/08/09 RoomCard reusable | FacilityList, RoomPriceTable, RoomSpecChips (3 komponen baru) |
| AM-07 Fix RoomComparePanel | Regex inline → shared utility |
| AM-11/12 Hapus tombol duplikat | Owner dashboard + FinancialRatiosPage |
| AM-14 `useGenericForm` hook | Wrapper form non-wizard |
| AM-15 Storybook pilot | 3 story (StatusBadge, EmptyState, StatCard) |
| AM-16 E2E smoke test | 3 flow kritis (public, login, dashboard) |

**Audit skor frontend:** 7/8 kategori ⭐⭐⭐⭐⭐, 1/8 ⭐⭐⭐⭐ (styling 99% CSS global)

## Cross-Dimension (P8) — Audit 360°
✅ 215 `@@index` di 61 model — semua FK utama terindeks · ✅ Global JWT default-deny + DTO validation + pagination + error handling + PWA · ✅ Code splitting + skeleton + empty state chart (✅ P8-03) + 404 (✅ Fase L) + toast (✅ Fase F+M) · ✅ Refresh Token httpOnly cookie (M17 P3-01)

## Dokumen audit terbaru
- **Audit UI/UX lintas portal aktif (30 Jul 2026):** `docs/M14_AUDIT_UI_UX.md` — 66 kombinasi awal, verifikasi homepage produksi, review statis dashboard Owner/Admin, benchmark terkurasi, antrean kolaboratif AO-00..AO-23
- **Audit Fable (2-3 Jul 2026):** `docs/archieve/audit_fable/00_INDEX.md` — 19 checklist C01-C19
- **Audit Reasonix Code (7 Jul 2026):** `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` — 82 temuan baru
- **Audit 360° P3-P8 (Jul 2026):** `docs/archieve/_previous_cycles/M17_AUDIT_360_P3_P8.md`
- **Audit 360° Flow Uang (Jul 2026):** `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md`
- **Audit 360° Flow Huni (Jul 2026):** `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md`
