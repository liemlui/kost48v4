# KOST48 V5 — Contracts & Business Rules
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. **Sumber historis:** `archieve/01_CONTRACTS.md` (2,489 baris, V5.9.8-A). File ini adalah distilled contracts yang hanya memuat **aturan bisnis yang masih berlaku**. Detail per domain ada di dossier `10`-`19`.

<!-- KOST48_DOCS_SYNC_20260613_CONTRACTS_CONSOLIDATED -->

## 1. Role & Authorization Matrix

### Role Hierarchy
```text
OWNER > ADMIN > STAFF > TENANT
Permissions cascade down kecuali TENANT yang terisolasi.
```

### Permission Matrix per Domain

| Domain | OWNER | ADMIN | STAFF | TENANT |
|--------|-------|-------|-------|--------|
| **Stays** — create/approve/cancel/complete | ✅ RW | ✅ RW | ❌ | ❌ |
| **Stays** — view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Tenant Bookings** — approve/reject | ✅ | ✅ | ❌ | ❌ |
| **Tenant Bookings** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Payment Submissions** — approve/reject | ✅ | ✅ | ❌ | ❌ |
| **Payment Submissions** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Checkout Requests** — final checkout | ✅ | ✅ | ❌ | ❌ |
| **Checkout Requests** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Renew Requests** — approve/execute | ✅ | ✅ | ❌ | ❌ |
| **Renew Requests** — create/view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Invoices** — create/issue/cancel | ✅ | ✅ | ❌ | ❌ |
| **Invoices** — view own | ✅ | ✅ | ✅ | ✅ (own only) |
| **Inventory Movements** — official (IN/OUT/ASSIGN/RETURN) | ✅ | ✅ | ❌ | ❌ |
| **Inventory Items** — read | ✅ | ✅ | ✅ (read) | ❌ |
| **Room Items** — read own room | ✅ | ✅ | ✅ | ✅ (own room) |
| **Tickets** — create/assign/close | ✅ | ✅ | ✅ (operational) | ❌ |
| **Tickets** — view own | ✅ | ✅ | ✅ | ✅ |
| **Deposit Settlement** — execute | ✅ | ✅ | ❌ | ❌ |
| **Accounting Journals** — view/manage | ✅ | ✅ | ❌ | ❌ |
| **Finance Reports** | ✅ | ✅ | ❌ | ❌ |
| **Expenses** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Public Endpoints** | Public | Public | Public | Public |
| **Announcements** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Announcements** — view | ✅ | ✅ | ✅ | ✅ |

---

## 2. Booking & Stay Lifecycle Contracts

### 2.1 Booking Mandiri (Tenant Self-Booking)
- **Tidak ada model Booking.** `Stay` mewakili seluruh siklus.
- Booking = Stay `ACTIVE` + Room `RESERVED` + belum promoted.
- Huni = promoted (`initialMetersPromotedAt` terisi) + Room `OCCUPIED`.
- **DP ≠ Deposit**: DP 30% sewa (hangus bila gagal lunas, jurnal `DP_FORFEIT`). Deposit jaminan refundable.
- **First paid wins**: multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- Batas waktu bayar: `expiresAt` — jika belum lunas, booking hangus.
- Public booking: honeypot field `website` harus selalu kosong (anti-bot, tolak request jika terisi).

### 2.2 Admin Approval
- Booking RESERVED muncul di antrean admin.
- Approval membuat invoice (initial invoice).
- Setelah LUNAS → booking jadi ACTIVE, Room OCCUPIED.

### 2.3 Manual Check-in
- Check-in manual membuat Stay ACTIVE + Room OCCUPIED langsung.
- Initial invoice disimpan dengan `totalAmountRupiah` konsisten dengan invoice lines.
- Ledger jaminan + jurnal otomatis dibuat.

### 2.4 Stay Completion / Cancel
- `StaysService.complete()`: final checkout → stay selesai.
- `StaysService.cancel()`: stay batal (dengan reversal jika perlu).
- **HIGH-RISK:** Do not move/patch casually (lihat `.clinerules`).

---

## 3. Payment & Invoice Contracts

### 3.1 Payment Submission
- Tenant upload bukti bayar → `PENDING_REVIEW` → admin review → `APPROVED` / `REJECTED`.
- Approval mengubah status invoice menjadi `PAID`.
- Payment submission approval harus lock rows untuk safe decision (room, stay, invoice, payment submission).
- **HIGH-RISK:** `PaymentSubmissionsService.approveSubmission()` — do not move/patch casually.

### 3.2 Invoice
- Invoice types: `ISSUED`, `PAID`, `PARTIAL`, `CANCELLED`, `DRAFT`.
- Open invoice = status NOT `PAID` AND NOT `CANCELLED`. `DRAFT` juga blocking.
- Invoice `DRAFT` may be cancelled without reversal.
- Invoice `ISSUED`/`PARTIAL` with journal entries requires controlled cancellation/reversal.
- Renewal invoice mencakup sewa + meter (listrik, air).
- Line invoice `PENALTY` hanya untuk potongan manual (tanpa denda keterlambatan otomatis — keputusan owner D1).

### 3.3 Pembayaran Invoice
- Pelunasan paling lambat saat check-in.
- Gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- Rp0 / problem invoices harus diframe sebagai `perlu dicek admin`, bukan push payment action.

---

## 4. Checkout Contracts

### 4.1 Checkout Request
- Tenant ajukan checkout ≤ `plannedCheckOutDate` (tidak bisa extend via checkout; gunakan renew).
- Admin approve/reject checkout request — **approve bukan final checkout**.
- Approve checkout request → sinkronisasi `plannedCheckOutDate` ke approved date.
- **HIGH-RISK:** Checkout final — do not move/patch casually.

### 4.2 Final Checkout
- Final checkout date harus dinormalisasi sebagai Jakarta business date.
- Harus menggunakan conditional update pada stay ACTIVE (anti double-click/race).
- **Blokir oleh semua open invoice** (termasuk DRAFT).
- Setelah final checkout:
  - Room → `MAINTENANCE` / `Perlu dicek` (readiness gate)
  - Tiket `CHECKOUT_INSPECTION` dibuat (dedupe per stay/room/category)
  - Deposit settlement (jika ada deposit)
  - Final utility charge (jika ada)
- **Room readiness gate:** kamar tidak pernah `AVAILABLE` tanpa tiket `CHECKOUT_INSPECTION` ditutup.

### 4.3 Room Readiness Gate Detail
- Checklist inspeksi staf: kebersihan, kunci, barang tertinggal, inventaris, kerusakan, foto kondisi akhir.
- Staff UI must NOT use developer/internal permission copy (lifecycle, official movement, final checkout, approval finance, computed by system).
- Public display: `MAINTENANCE` → `Sedang dicek`, `canBook=false`.
- Public CTA for maintenance rooms: `Tanya Ketersediaan`, not `Ajukan Booking`.
- `allowBookingWhileCleaning=true` — kotor tapi bisa dipesan; huni menunggu tiket pembersihan ditutup.

---

## 5. Renew Contracts

### 5.1 Renew Request
- Tenant ajukan perpanjangan → admin approve → eksekusi perpanjangan.
- Renew invoice dibuat: sewa + meter (listrik, air) dengan periode menyambung.
- **HIGH-RISK:** `StaysService.renewStay()` — do not move/patch casually.

---

## 6. Deposit Contracts

### 6.1 Deposit Jaminan
- Deposit adalah **dana titipan / liability**, BUKAN revenue/omzet/profit.
- Diisi saat booking LUNAS atau check-in manual (nominal dari `Room.defaultDepositRupiah`).
- Dicek saat checkout.

### 6.2 Deposit Settlement
- Tipe settlement: `FULL_REFUND`, `PARTIAL`, `FORFEIT`.
- Harus dalam transaksi.
- Conditional update dari `HELD` (anti double processing).
- Dilarang untuk zero deposit.
- `FORFEIT` tidak diizinkan untuk zero-deposit cases.
- Partial deduction dan forfeit memerlukan meaningful notes.
- Jurnal `JE-AUTO-DEPOSIT-SETTLEMENT` diposting.
- **HIGH-RISK:** Deposit settlement — do not move/patch casually.

---

## 7. Inventory Contracts

### 7.1 Official Stock Truth
- `InventoryMovement` + synced `InventoryItem.qtyOnHand` + `RoomItem` = source of truth.
- Staff **dilarang** membuat official `InventoryMovement` (403).
- Direct `qtyOnHand` edit dilarang; gunakan Mutasi Stok.

### 7.2 Movement Types
- `IN`: barang masuk gudang (opening stock, restock).
- `OUT`: barang keluar gudang.
- `ASSIGN_TO_ROOM`: pasang ke kamar, kurangi qtyOnHand, buat RoomItem.
- `RETURN_FROM_ROOM`: kembali dari kamar, validasi stock room, kurangi RoomItem, tambah qtyOnHand.
- `PATCH` existing movement diblokir; koreksi pakai movement baru.
- Staff reports physical issues / restock needs via tiket/laporan, NOT official mutation.

### 7.3 Item Condition Tracking
- RoomItem condition: `GOOD` → `Baik`, `DAMAGED` → `Rusak`, `MISSING` → `Hilang`, `NEEDS_REPAIR` → `Perlu dicek`.
- Stock health dihitung: `habis` / `menipis` / `aman` dari `qtyOnHand` vs `minQty`, bukan dipilih manual.

### 7.4 Room Item Report (Staff)
- Staff field report → buat tiket (tidak auto-create official movement).
- Admin review staff report → `APPROVE` / `REJECT`.

---

## 8. Ticket Contracts

### 8.1 Ticket Lifecycle
- `OPEN` → `IN_PROGRESS` → `RESOLVED` / `CLOSED`.
- Kategori: `CHECKOUT_INSPECTION`, `EVICT_OVERSTAY`, `BARANG_PINDAH`, `AUDIT_INVENTARIS`, `PEMERIKSAAN`, dll.
- Auto-created tickets: `CHECKOUT_INSPECTION` (setelah final checkout), `EVICT_OVERSTAY` (H-day overstay).

### 8.2 Staff Ticket Rules
- Staff dapat close ticket `CHECKOUT_INSPECTION` (guard keselamatan tetap).
- Close safe inspection → room `MAINTENANCE` → `AVAILABLE`.
- Room tidak bisa AVAILABLE jika: ada active stay lain, room tidak MAINTENANCE, kondisi tidak aman.

---

## 9. Notification Contracts

### 9.1 Notification Types
- **Hanya in-app** (keputusan owner D2, 2026-06-11).
- Rencana jangka panjang: PWA push notification.
- **Belum ada email/WA nyata** (hanya preview/generate).

### 9.2 Trigger Events
- Tenant: booking approve, payment accept/reject, checkout approve, invoice terbit, denda, reminder kontrak.
- Admin: booking baru, payment submission, pengajuan checkout, pengajuan renew.

---

## 10. Accounting & Finance Contracts

### 10.1 Auto Journal Lite
- Jurnal otomatis idempotent per `(sourceType, sourceId)`.
- Auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh).
- Reversal cancel invoice kini blocking di semua jalur.

### 10.2 COA
- **38 akun** (dikoreksi dari klaim V1 17/17).

### 10.3 Finance Reports
- Balance Sheet, P&L, Cashflow, Piutang Aging, Deposit Liability.
- Deposit must remain dana titipan/liability.
- Finance readiness smoke surfaces: accounting readiness, asset readiness, invoices, payment review, deposit ledger summary, reconciliation-lite.

### 10.4 Deposit Ledger
- `GET /api/deposit-ledger/summary`
- `GET /api/deposit-ledger/reconciliation-lite` — `ready=true`, `mismatchCount=0`.

---

## 11. Overstay & Auto-Ops Contracts

### 11.1 Overstay Lifecycle
- Pengingat: H-7, H-3, H-1, H-day.
- H-day pk 12:00: kamar dibuka publik + tiket `EVICT_OVERSTAY`.
- H+1 pk 12:00: forced checkout otomatis.
- Kamar → `MAINTENANCE` + `allowBookingWhileCleaning=true`.
- **Pengecualian:** tagihan belum lunas → tidak auto-checkout, admin dapat alert.

### 11.2 Auto-Ops Jobs (9 sequential)
1. `bookingExpiry`
2. `roomHealer`
3. `roomReleaseAtNoon`
4. `downPaymentForfeit`
5. `contractEndReminders`
6. `overstayEnforcement`
7. `overstayForcedCheckout`
8. `postCheckoutAutoCancel`
9. `accountingAutoClose`

---

## 12. UI/UX Contracts

### 12.1 Language Rules
- Gunakan Bahasa Indonesia bisnis/tenant, bukan backend jargon.
- Contoh mapping:
  - `stay` → `masa sewa`
  - `invoice` → `tagihan`
  - `payment submission` → `bukti pembayaran`
  - `PENDING_REVIEW` → `bukti diperiksa`
  - `checkout request` → `ajukan keluar`
  - `renew request` → `ajukan perpanjangan`
  - `deposit` → `dana titipan` / `deposit titipan`
  - `GOOD` → `Baik`, `DAMAGED` → `Rusak`, `MISSING` → `Hilang`
  - `Queue` → `Antrean`

### 12.2 UI Behavior
- Compact mode: hindari oversized cards, excessive hero blocks, repeated copy.
- Satu destinasi = tidak boleh duplikasi CTA di section yang sama.
- Row clickable = tidak perlu tombol `Detail/Lihat` redundan.
- Tabel/list default 10 baris per halaman.
- Filter harus visually lighter dari primary actions.
- Filter reset pagination ke page 1.
- Tidak ada global search di header kecuali page-specific search diperlukan.

### 12.3 Empty State & No-Op Rules
- No-op buttons, decorative CTAs, misleading `lihat antrean` dilarang.
- Empty states harus sesuai section, tidak boleh klaim "no work" jika masih ada queue/table di bawahnya.
- Jika elemen terlihat seperti primary button, harus melakukan real action.

---

## 13. Safety Belts

### 13.1 Booking Safety
- Rate limit public booking.
- Honeypot `website` field anti-bot.
- First-paid-wins gate.

### 13.2 Payment Safety
- Lock rows during payment approval (payment submission, room, stay, invoice).
- Anti double-processing pada deposit settlement (conditional HELD).
- Invoice open blocking untuk checkout final (termasuk DRAFT).

### 13.3 Inventory Safety
- Staff 403 untuk official movement.
- RETURN_FROM_ROOM: validasi cukup stock di RoomItem, block return > room stock (409).
- Short movement note → 400.
- Direct qtyOnHand edit dilarang.

### 13.4 Room Readiness Safety
- Room tidak AVAILABLE tanpa CHECKOUT_INSPECTION ditutup.
- Ada active stay lain → tidak AVAILABLE.
- Kondisi tidak aman → tidak AVAILABLE.

### 13.5 Concurrency
- Final checkout: conditional update pada stay ACTIVE.
- Deposit settlement: conditional update dari HELD.

---

## 14. Deploy & Environment Rules

- **DEPLOY = FRESH** (keputusan V3/D-06): drop DB → seed COA → opening balance, BUKAN migrasi.
- Backfill data lama TIDAK berlaku.
- Generated Prisma files adalah build artifacts, harus di-restore sebelum commit.
- No production DB mutation.
- No schema change tanpa explicit approval.
- Runbook: `docs/04_DEPLOY_AND_PWA.md`.

---

## 15. Known Gaps & Deferred Features

| Gap | Status | Rencana |
|-----|--------|---------|
| No service-to-service HTTP | Deferred | V5.7+ architecture extraction |
| No separate database per app | Deferred | Shared DB tetap di V5 Phase 0/1 |
| No refresh token | Deferred | 24 jam JWT |
| No email/WA delivery | Deferred | PWA push planned |
| No damage/penalty model | Deferred | B5 future batch |
| No deposit ledger (full) | Deferred | B4 future batch |
| No asset/depreciation | Deferred | Future |
| No round-robin ticket assignment | Deferred | 1 staf, ditunda |
| No WIB timezone handling | Deferred | F2-14 |
| No unit tests | Deferred | E-8 |

---

## 16. HIGH-RISK FLOWS — DO NOT MOVE / DO NOT PATCH CASUALLY

| Flow | Service | Kepemilikan |
|------|---------|------------|
| `PaymentSubmissionsService.approveSubmission()` | core-api | Mutasi Stay/Room/Invoice/Deposit |
| `StaysService.create()` | core-api | Stay lifecycle creation |
| `StaysService.complete()` | core-api | Checkout final |
| `StaysService.renewStay()` | core-api | Renew execution |
| `TenantBookingsService.approveBooking()` | core-api | Booking approval |
| `StaysService.cancel()` | core-api | Stay cancellation with reversal |
| Deposit settlement | core-api | Mutasi deposit HELD → REFUNDED/FORFEIT |
| Room status writes | core-api | OCCUPIED/AVAILABLE/MAINTENANCE/RESERVED |
| Meter promotion | core-api | initialMetersPromotedAt |

---

## 17. PowerShell Verification Commands (Quick Reference)

```powershell
# Public rooms smoke
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"

# Admin login
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken

# Payment review queue
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}

# Deposit reconciliation
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/deposit-ledger/reconciliation-lite" -Headers @{Authorization="Bearer $token"}

# Accounting readiness
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}

# Staff mutation block expected 403
try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/inventory-movements" -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"roomId":1,"inventoryItemId":1,"quantity":1}' } catch { $_.Exception.Response.StatusCode.value__ }
```

---

**Referensi silang dossier domain:**
- Booking & Stay: `docs/10_PEMBAYARAN_INVOICE.md` + `docs/11_BOOKING_RENEWAL.md`
- Checkout & Deposit: `docs/12_CHECKOUT_DEPOSIT_OVERSTAY.md`
- Akuntansi & Laporan: `docs/13_AKUNTANSI_LAPORAN.md` + `docs/05_VERIFIKASI_KEUANGAN.md`
- Inventaris: `docs/14_INVENTARIS.md`
- Staf & Tiket: `docs/15_STAF_TIKET_KPI.md`
- Notifikasi: `docs/16_NOTIFIKASI_PENGUMUMAN.md`
- Publik & Marketing: `docs/17_PUBLIK_MARKETING_UIUX.md`
- Auth & Onboarding: `docs/18_AUTH_FONDASI_ONBOARDING.md`
- Flow Map: `docs/02_FLOW_MAP.md`
- Keputusan Owner: `docs/03_KEPUTUSAN_OWNER.md`
- Deploy & PWA: `docs/04_DEPLOY_AND_PWA.md`
- Blueprint: `docs/00_BLUEPRINT.md`

**Sumber historis lengkap:** `docs/archieve/01_CONTRACTS.md` (2,489 baris, V5.9.8-A)