# PETA SCOPE — KOST48 V5

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> **Tujuan:** lompat ke file yang tepat berdasarkan ROLE pengguna atau FLOW bisnis. Dipakai bersama `M00_CODEMAP.md` (navigasi modul) dan `M12_CHECKLIST_CHANGELOG.md` (antrian task).

---

## A. Scope Berdasarkan Role

### A1. PUBLIC (Calon Tenant — tanpa login)
**Apa yang dilihat/dilakukan:** landing page, katalog kamar + detail, FAQ, ulasan, form booking (KTP + DP 30%), halaman sukses booking.

| Layer | File | Catatan |
|-------|------|---------|
| FE shared | `frontend/src/pages/public/publicGuestShared.tsx` | Topbar, Footer, RoomPreviewCard, utilitas format — dipakai semua halaman publik |
| FE landing | `frontend/src/pages/public/PublicGuestDashboardPage.tsx` | Home page publik (hero, galeri, fasilitas, FAQ singkat, CTA) |
| FE katalog | `frontend/src/pages/rooms/PublicRoomsPage.tsx` | Daftar kamar + filter; `RoomsRouteEntry.tsx` = router entry |
| FE detail | `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` | Detail kamar + foto lightbox + tombol booking |
| FE booking | `frontend/src/pages/bookings/GuestBookingPage.tsx` | Shell halaman booking tamu |
| FE booking | `frontend/src/pages/bookings/GuestBookingForm.tsx` | Form isi data KTP + jadwal masuk |
| FE booking | `frontend/src/pages/bookings/GuestBookingSuccess.tsx` | Konfirmasi sukses + instruksi transfer DP |
| FE booking | `frontend/src/pages/bookings/guestBookingUtils.ts` | Helper kalkulasi harga + validasi form |
| FE FAQ | `frontend/src/pages/public/FaqPublicPage.tsx` | Halaman FAQ lengkap |
| FE ulasan | `frontend/src/pages/public/ReviewsPublicPage.tsx` | Ulasan tamu publik |
| BE service | `backend/src/modules/tenant-bookings/public-bookings.service.ts` | Buat booking publik + expiry 3 jam |
| BE controller | `backend/src/modules/tenant-bookings/public-bookings.controller.ts` | Endpoint POST booking + GET rooms (no-auth) |
| BE helper | `backend/src/modules/tenant-bookings/pricing.helper.ts` | Hitung DP 30% + biaya lain |
| BE katalog | `backend/src/modules/marketing/marketing-public-rooms.service.ts` | Query kamar publik + foto |
| BE FAQ | `backend/src/modules/faqs/faqs.service.ts` | FAQ publik |
| Docs | `M05_SIKLUS_HUNI.md` · `M07_PUBLIK_GROWTH.md` | |

### A2. TENANT (Penghuni — login role TENANT)
**Apa yang dilihat/dilakukan:** MyStay (status kamar), invoice & bayar, meter reading, loyalty points, referral, permintaan renew/checkout, review staf, survei.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/portal/` | Area tenant (MyStay, invoice, loyalty, manual) |
| FE pages | `frontend/src/pages/stays/` | Detail stay tenant |
| FE pages | `frontend/src/pages/invoices/` · `payments/` | Invoice + bukti bayar |
| FE pages | `frontend/src/pages/loyalty/` | Poin, reward, referral |
| FE pages | `frontend/src/pages/renew-requests/` | Form renew |
| BE module | `backend/src/modules/stays/` (service + query) | Lifecycle stay |
| BE module | `backend/src/modules/invoices/invoices.service.ts` | Invoice tenant |
| BE module | `backend/src/modules/payment-submissions/` | Upload bukti bayar |
| BE module | `backend/src/modules/meter-readings/` | Lihat meter |
| BE module | `backend/src/modules/renew-requests/` | Request perpanjang |
| BE module | `backend/src/modules/checkout-requests/` | Request checkout |
| BE module | `backend/src/modules/loyalty/` | Poin + reward + referral |
| BE module | `backend/src/modules/surveys/` | Survei kepuasan |
| BE module | `backend/src/modules/tenant-staff-reviews/` | Review staf |
| Docs | `M05_SIKLUS_HUNI.md` · `M04_KEUANGAN.md` | |

### A3. STAFF (Karyawan — login role STAFF)
**Apa yang dilihat/dilakukan:** tiket (keluhan/perbaikan/inspeksi), rutinitas harian, laporan lapangan, meter reading, inventory movement, WiFi order.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/tickets/` | List + detail tiket |
| FE pages | `frontend/src/pages/staff/` | Rutinitas staf |
| FE pages | `frontend/src/pages/staff-routines/` | Template + assignment |
| FE pages | `frontend/src/pages/services/` | WiFi + layanan tambahan |
| BE module | `backend/src/modules/tickets/tickets.service.ts` | CRUD tiket + inspeksi |
| BE module | `backend/src/modules/staff-routines/` | Rutinitas staf |
| BE module | `backend/src/modules/staff-field-reports/` | Laporan lapangan |
| BE module | `backend/src/modules/staff-performance/` | KPI + event |
| BE module | `backend/src/modules/meter-readings/` | Input meter |
| BE module | `backend/src/modules/inventory-items/` · `inventory-movements/` | Stok + mutasi |
| BE module | `backend/src/modules/room-items/` | Barang per kamar |
| BE module | `backend/src/modules/wifi-sales/` | Order WiFi |
| Docs | `M06_OPERASIONAL.md` | |

### A4. ADMIN (Pengelola — login role ADMIN)
**Apa yang dilihat/dilakukan:** dashboard admin, approve booking/payment/renewal, kelola kamar & tenant, invoice & expense, laporan, staf, inventaris, pengumuman, FAQ, settings.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/dashboard/DashboardAdmin.tsx` | Command center |
| FE pages | `frontend/src/pages/admin/` | CRUD generik (ConfiguredResourcePage) |
| FE pages | `frontend/src/pages/resources/` | CRUD resource |
| FE pages | `frontend/src/pages/finance/` | Accounting setup |
| FE pages | `frontend/src/pages/reports/` | Laporan |
| BE module | **Semua modul kecuali owner-ai** | Admin = full access |
| Docs | `M04_KEUANGAN.md` · `M05_SIKLUS_HUNI.md` · `M06_OPERASIONAL.md` | |

### A5. OWNER (Pemilik — login role OWNER)
**Apa yang dilihat/dilakukan:** dashboard owner (KPI), laporan keuangan, AI assistant (brief/finance/payment review/ops/inventory), settings sistem, semua akses admin.

| Layer | File | Catatan |
|-------|------|---------|
| FE pages | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` | Kokpit owner KPI+chart+AI |
| FE pages | `frontend/src/pages/dashboard/AdminWorkspaces.tsx` | Tabel workspace |
| FE components | `frontend/src/components/ai/` | Tombol AI (DeepSeek) |
| FE components | `frontend/src/components/layout/AppLayout.tsx` | Owner view mode toggle |
| BE module | `backend/src/modules/owner-ai/` | AI brief, finance, payment, ops, inventory |
| BE module | `backend/src/modules/settings/settings.service.ts` | OperationalSetting |
| BE module | `backend/src/modules/accounting/` | Laporan + tutup buku |
| BE module | `backend/src/modules/market-analysis/` | Analisa pasar AI |
| Docs | `M04_KEUANGAN.md` · `M09_AI_OWNER_ADMIN.md` · `M02_KEPUTUSAN_OWNER.md` | Sumber kebenaran |

### A6. SYSTEM / IoT (Device — tanpa login, cron)
**Apa yang dilihat/dilakukan:** ESP32-C3 kirim water flow reading dan backend polling Tuya KWH meter via cron untuk observability owner/admin/tenant. Deteksi kebocoran/anomali dan aksi otomatis belum diaktifkan; telemetri tidak boleh membuat invoice otomatis.

| Layer | File | Catatan |
|-------|------|---------|
| BE module | `backend/src/modules/iot/` | IoT controller, Tuya client/polling, registry credential ESP32, water ingest, dan pembaruan tenant terikat (sudah dibuat) |
| BE cron | `backend/src/modules/iot/iot-polling.service.ts` | Kemampuan polling/cron ada di kode; profil shared hosting memakai on-demand dan timer OFF, tanpa cron Tuya (M08/M19) |
| BE model | `backend/prisma/schema.prisma` | `IotDevice`, `IotIngestMessage`, `IotTelemetry`; telemetry dipisahkan dari `MeterReading` billing |
| FE tenant | `frontend/src/pages/portal/EnergyPage.tsx` | Timeline konsumsi dan quota berdasarkan periode sewa lunas; hanya estimasi/monitoring |
| Docs | `M14_IOT_TUYA_DEVICES.md` · `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` | Inventaris perangkat Tuya, rollout, dan spek implementasi |

---

## B. Scope Berdasarkan Flow Bisnis

### B1. BOOKING FLOW (Calon Tenant → DP → Approve → Stay)
```
PublicBookingForm → PaymentSubmission (DP 30%) → Admin approve → Stay (promoted)
                        ↓ (expiry 3 jam)
                      DP hangus (BookingSweep)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `tenant-bookings/public-bookings.service.ts` | Booking publik |
| BE | `tenant-bookings/tenant-bookings.service.ts` | Booking oleh tenant existing |
| BE | `payment-submissions/payment-submissions.service.ts` | Submit bukti DP |
| BE | `stays/stays.service.ts` | Promosi booking→stay |
| BE | `auto-ops/auto-ops.service.ts` (BookingSweep) | Expiry 3 jam |
| FE | `pages/public/` · `pages/bookings/` | Form + list booking |
| Docs | `M05_SIKLUS_HUNI.md` · `M03_FLOW_KONTRAK.md` | |

### B2. PAYMENT FLOW (Invoice → Bayar → Approve → Jurnal)
```
Stay aktif → Invoice (sewa + meter) → Tenant bayar (PaymentSubmission)
                                            → Admin APPROVE → InvoicePayment + JournalEntry
                                            → Admin REJECT → Tenant bayar ulang
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `invoices/invoices.service.ts` | Generate invoice |
| BE | `invoice-payments/invoice-payments.service.ts` | Catat pembayaran |
| BE | `payment-submissions/payment-submissions.service.ts` | Verifikasi bukti bayar |
| BE | `accounting/accounting-posting.service.ts` | Posting jurnal |
| FE | `pages/invoices/` · `pages/payments/` | UI invoice + bayar |
| Docs | `M04_KEUANGAN.md` | **GATE WAJIB** |

### B3. STAY FLOW (Huni → Meter → Renewal/Checkout)
```
Stay aktif → MeterReading (bulanan) → RenewRequest (sebelum habis)
                                    → CheckoutRequest → Checkout (deposit settlement)
                                    → Overstay (forced checkout)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `stays/stays.service.ts` | Lifecycle stay |
| BE | `meter-readings/meter-readings.service.ts` | Meter listrik/air |
| BE | `renew-requests/renew-requests.service.ts` | Renewal 8-state machine |
| BE | `checkout-requests/checkout-requests.service.ts` | Checkout tenant |
| BE | `deposit-ledger/deposit-ledger.service.ts` | Ledger deposit jaminan |
| BE | `stays/room-transfer.service.ts` | Pindah kamar |
| BE | `auto-ops/auto-ops.service.ts` (StaySweep) | Overstay, room healer |
| FE | `pages/stays/` · `pages/renew-requests/` | UI stay + renew |
| Docs | `M05_SIKLUS_HUNI.md` | |

### B4. DEPOSIT FLOW (Jaminan → Refund/Settlement)
```
Booking → Deposit diterima (TenantDepositLedgerEntry, liability 2000)
Checkout → Deposit settlement (refund ke tenant atau potong kerusakan)
Kabur/abandoned → Forced deposit→AR (DR 2000 / CR 1100)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `deposit-ledger/deposit-ledger.service.ts` | Ledger deposit |
| BE | `checkout-requests/checkout-requests.service.ts` | Settlement saat checkout |
| BE | `accounting/accounting-posting.service.ts` | Jurnal deposit (liability) |
| Docs | `M04_KEUANGAN.md` · `M05_SIKLUS_HUNI.md` | |

### B5. ACCOUNTING FLOW (Jurnal → Period Close → Laporan)
```
InvoicePayment → JournalEntry (auto) → Trial Balance → Period Close → Neraca/Laba-Rugi
Expense → JournalEntry
Deposit → Liability 2000
RentRecognitionSchedule → Unearned→Earned (bulanan)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `accounting/accounting.service.ts` | Setup CoA + cash account |
| BE | `accounting/accounting-posting.service.ts` | Posting + reversal |
| BE | `accounting/accounting-reports.service.ts` | TB, neraca, laba/rugi |
| BE | `accounting/accounting-period-close.service.ts` | Tutup buku — **JANGAN UTAK-ATIK** |
| BE | `accounting/rent-recognition.service.ts` | PSAK 72 unearned→earned |
| BE | `expenses/expenses.service.ts` | Biaya operasional |
| BE | `assets/assets.service.ts` | Aset tetap + depresiasi |
| BE | `auto-ops/auto-ops.service.ts` (AccountingSweep) | Auto-journal, rent recognition |
| FE | `pages/finance/` · `pages/reports/` | UI akuntansi |
| Docs | `M04_KEUANGAN.md` | **GATE WAJIB + unit test** |

### B6. STAFF OPERATIONS FLOW (Tiket → Rutinitas → KPI)
```
Ticket (keluhan/perbaikan/inspeksi) → Assign → Start → Close
StaffRoutine (template→assignment→completion) → StaffPerformanceEvent → KPI
StaffFieldReport → Admin review
Tenant → StaffReview (kualitas staf)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `tickets/tickets.service.ts` | Tiket + guard AVAILABLE |
| BE | `staff-routines/` | Template/assignment/completion |
| BE | `staff-performance/` | KPI + event |
| BE | `staff-field-reports/` | Laporan lapangan |
| BE | `tenant-staff-reviews/` | Review tenant→staf |
| FE | `pages/tickets/` · `pages/staff/` · `pages/staff-routines/` | UI operasional |
| Docs | `M06_OPERASIONAL.md` | |

### B7. INVENTORY FLOW (Stok → Mutasi → Room Item)
```
InventoryItem (gudang) → InventoryMovement (ASSIGN/OUT/RETURN) → RoomItem (per kamar)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `inventory-items/` | Barang gudang |
| BE | `inventory-movements/` | Mutasi ASSIGN/OUT/RETURN |
| BE | `room-items/` | Barang per kamar (FK InventoryItem) |
| FE | `pages/resources/` (CRUD generik) | UI inventaris |
| Docs | `M06_OPERASIONAL.md` | |

### B8. AI FLOW (Tombol Manual Owner/Admin → Draft → Approve → Audit)
```
Owner/Admin klik tombol AI → DeepSeek proses → AiDraft tersimpan
    → Manusia review draft → Manusia klik approve → Aksi final + AuditLog(meta.ai)
```

| Layer | File | Catatan |
|-------|------|---------|
| BE | `owner-ai/owner-ai.service.ts` | Brief, finance, payment, ops |
| BE | `owner-ai/ai-context-builder.service.ts` | Konteks untuk prompt AI |
| BE | `market-analysis/deepseek.client.ts` | HTTP client DeepSeek |
| BE | `market-analysis/market-analysis.service.ts` | Analisa pasar (SWOT/PESTLE) |
| BE | `audit-log/audit-log.service.ts` | Catat `meta.ai` |
| FE | `components/ai/` | Tombol + drawer AI |
| FE | `pages/dashboard/OwnerDashboardPage.tsx` | Integrasi AI |
### B9. IOT FLOW (ESP32 Water → signed ingest / KWH → Tuya polling → telemetry → review)
```
ESP32-C3+D20 → signed POST /api/iot/v1/readings → IotIngestMessage + IotTelemetry
Tuya KWH Meter → Tuya Cloud API → IotPollingService / POST /api/iot/tuya/cron → IotTelemetry
Owner/Admin review → kandidat billing/manual → MeterReading → invoice cycle
```

Quota listrik untuk pembacaan meter bisnis dihitung dari periode sewa lunas; DP renewal tidak memulai periode baru. Telemetry pada flow ini dapat menjadi sumber tampilan/estimasi, tetapi tidak menjadi bukti invoice tanpa proses `MeterReading` yang ber-audit.

| Layer | File | Catatan |
|-------|------|---------|
| BE | `iot/{iot,water-ingest}.controller.ts` | Owner/Admin API, cron Tuya, dan signed ESP32 ingest |
| BE | `iot/{tuya/tuya-client,iot-polling}.service.ts` | HMAC-SHA256 Tuya dan polling terikat |
| BE | `iot/{iot,water-ingest}.service.ts` | Registry/mapping, telemetry, idempotensi/replay guard, credential device |
| Docs | `M14_IOT_TUYA_DEVICES.md` · `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` | Alert/kandidat billing masih UAT dan tidak otomatis |

---

## C. Quick Reference — "Mau X? Buka Y"

| Saya mau... | Role | Buka file ini dulu |
|-------------|------|--------------------|
| Tambah fitur di halaman tenant | TENANT | `frontend/src/pages/portal/` + `M05_SIKLUS_HUNI.md` |
| Ubah logika booking | PUBLIC | `backend/src/modules/tenant-bookings/` + `M05_SIKLUS_HUNI.md` |
| Ubah logika pembayaran | ADMIN | `backend/src/modules/payment-submissions/` + `M04_KEUANGAN.md` |
| Tambah laporan keuangan | OWNER | `backend/src/modules/accounting/` + `M04_KEUANGAN.md` |
| Ubah logika tiket staf | STAFF | `backend/src/modules/tickets/` + `M06_OPERASIONAL.md` |
| Tambah tombol AI baru | OWNER | `backend/src/modules/owner-ai/` + `M09_AI_OWNER_ADMIN.md` |
| Ubah deposit/refund | ADMIN | `backend/src/modules/deposit-ledger/` + `M04_KEUANGAN.md` |
| Tambah inventory | STAFF | `backend/src/modules/inventory-items/` + `M06_OPERASIONAL.md` |
| Ubah auto-ops/sweeper | SYSTEM | `backend/src/modules/auto-ops/` + `M06_OPERASIONAL.md` § Auto-Ops |
| Tambah field di model Prisma | — | `backend/prisma/schema.prisma` ⚠️ BUTUH APPROVAL OWNER |
| Perbaiki UI/UX | — | `frontend/src/styles/` + `frontend/src/components/` |
| Cek aturan owner | — | `docs/M02_KEPUTUSAN_OWNER.md` (84 keputusan, **SUMBER KEBENARAN**) |
| Tambah IoT / KWH meter | SYSTEM | `docs/M15_IOT.md` + `backend/src/modules/iot/` |

---

## D. Alur Kerja Ideal Per Scope

1. **Tentukan scope:** role siapa? flow apa? (lihat bagian A atau B di atas)
2. **Buka M-file domain** (kolom "Docs" di tabel) — pahami aturan bisnis
3. **Buka M00_CODEMAP.md** — verifikasi path modul backend + frontend
4. **Grep simbol** di `backend/src` / `frontend/src` sebelum edit
5. **Gate build:** `npx tsc --noEmit` (backend) + `npm run build` (frontend). Kalau task uang: **WAJIB** `M04_KEUANGAN.md` gate.
6. **Tutup:** perbarui checklist terkait di `M12` + entri changelog di `M13`.
