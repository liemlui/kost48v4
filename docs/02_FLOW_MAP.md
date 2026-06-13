# KOST48 V5 — Flow Map (Peta Alur Kode Krusial)
**Versi:** 2026-06-12 — Update besar: koreksi rate-limit, PARTIAL payment (GAP #1), tulis ulang §5 Renew, 6 flow baru (Inventaris, WiFi, KPI, Finance, Strategic AI, PWA). Menambahkan §15 Gap Bisnis Real vs Kode.
**Tujuan:** Satu sumber navigasi untuk audit mendalam. Setiap flow krusial dipetakan ke `file:baris` aktual, transisi status, side-effect, dan invarian yang harus dijaga.

<!-- KOST48_DOCS_SYNC_20260612_FLOW_MAP_V2 -->

## Cara pakai saat audit
- Kolom **Rantai kode** = urutan eksekusi nyata, klik/lompat per `file:baris`.
- **Cross-ref gap bisnis** = lihat §15 untuk gap yang BELUM diperbaiki di kode.
- **Invarian** = aturan yang TIDAK BOLEH dilanggar; setiap audit pass wajib mencari jalur yang bisa melanggarnya.
- **Fokus audit** = pertanyaan terbuka/titik rawan yang ditemukan saat pemetaan.

---

## 0. Arsitektur Global

### 0.1 Request pipeline (backend)
- Entry: `backend/src/main.ts`
  - `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, disableErrorMessages di production })` — main.ts:34
  - CORS dari `CORS_ORIGIN` env (production wajib diisi) — main.ts:40-47
  - `trust proxy = 1` + security headers manual (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — main.ts:50-59
  - ⚠️ **TANPA Helmet** (keputusan sadar), **RATE-LIMIT SUDAH ADA** sejak V5.12.2: `common/middleware/rate-limit.middleware.ts` — global 300/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`), auth 10/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`). In-memory, per-proses; multi-instance perlu store bersama.
  - Static `/uploads` dihapus; bukti bayar hanya via endpoint terproteksi `GET /api/payment-submissions/proofs/:filename`
  - Swagger hanya non-production — main.ts:65+
- Module root: `backend/src/app.module.ts` — 36 modul terdaftar.
- Auth: JWT Bearer, guard + decorator `@Roles(...)`. Role enum aktual: **OWNER, ADMIN, STAFF, TENANT** (schema.prisma `UserRole`). **APP_GUARD global default-deny** (E-1) sejak V5.12.2 — controller baru otomatis 401, bukan bocor publik.
- Semua mutasi penting menulis `AuditLog` (langsung via `tx.auditLog.create` atau `audit.log`).

### 0.2 Representasi "Booking" (konsep kunci!)
Tidak ada model `Booking` terpisah. Satu record `Stay` mewakili seluruh siklus:
```
BOOKING   = Stay(status=ACTIVE) + Room(status=RESERVED) + initialMetersPromotedAt=NULL + expiresAt terisi
OCCUPIED  = Stay(status=ACTIVE) + Room(status=OCCUPIED) + initialMetersPromotedAt terisi ("promoted")
SELESAI   = Stay(status=COMPLETED)  |  BATAL/EXPIRED = Stay(status=CANCELLED)
```
> **Terminologi (ketetapan owner):** **DP** = uang muka pesan kamar (30% sewa, hangus bila gagal kontrak) → field `Stay.downPayment*`. **Deposit** = uang jaminan (refundable via settlement) → field `Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`.
>
> **Alur booking:** bayar DP 30% (atau lunas langsung) → DP approved = kamar terkunci (pesaing dibatalkan, `expiresAt` mati) → pelunasan + jaminan saat check-in → gagal lunas H+1 pk 12:00 → DP hangus (jurnal `DP_FORFEIT`). Overstay: tenant promoted lewat `plannedCheckOutDate` → tiket EVICT_OVERSTAY → H+1 forced checkout otomatis.

Constraint DB penunjang (sql/bootstrap.sql):
- `stay_one_active_per_tenant_uidx` — 1 stay ACTIVE per tenant (termasuk fase booking).
- `stay_one_active_per_room_uidx` — 1 stay ACTIVE per room **hanya jika sudah promoted** → multi-booking RESERVED pada 1 kamar DIIZINKAN (first paid wins).
- `stay_deposit_payment_amount_chk` — depositPaid ≤ depositAmount.

### 0.3 Enum status inti (schema.prisma)
| Entitas | Status |
|---|---|
| Stay | ACTIVE → COMPLETED / CANCELLED |
| Room | AVAILABLE → RESERVED → OCCUPIED → MAINTENANCE → (AVAILABLE) / INACTIVE |
| Invoice | DRAFT → ISSUED → PARTIAL → PAID / CANCELLED |
| PaymentSubmission | PENDING_REVIEW → APPROVED / REJECTED / EXPIRED |
| Deposit (Stay.depositStatus) | HELD → PARTIALLY_REFUNDED / REFUNDED / FORFEITED |
| Ticket | OPEN → IN_PROGRESS → DONE → CLOSED; OPEN → CANCELLED |
| RenewRequest / CheckoutRequest | PENDING → APPROVED / REJECTED |

---

## 1. Flow Auth & Identitas

**Aktor:** Semua role. **File inti:** `backend/src/auth/auth.service.ts`

| Langkah | Rantai kode |
|---|---|
| Login (email/phone + password) | auth.service.ts:28 `login` → `findUserForLogin`:254 → bcrypt compare → JWT |
| Profil sendiri | auth.service.ts:75 `me` |
| Lupa password | auth.service.ts:96 `forgotPassword` → token CSPRNG → `PasswordResetToken` → `sendResetEmail`:366 |
| Reset password | auth.service.ts:152 `resetPassword` (transaksi :199) |
| Ganti password | auth.service.ts:218 `changePassword` |

Manajemen identitas:
- Users CRUD (OWNER/ADMIN only): `modules/users/users.controller.ts:20-39`
- Tenants CRUD + akses portal: `modules/tenants/tenants.controller.ts` — buat akun portal `:60`, suspend `:47`, reset password `:73`
- Profil tenant self-service: `modules/tenants/tenant-profile.controller.ts:19,28` (GET profile, PATCH onboarding)

**Invarian:** token reset sekali pakai & berbatas waktu; tenant hanya bisa baca data dirinya; tidak ada refresh token (expiry 24 jam). Suspend user MEMUTUS sesi seketika (jwt.strategy validasi DB per request + klaim pwdAt).
**Fokus audit:** enumerasi akun via respons forgot-password; kekuatan JWT secret & klaim; sesi setelah suspend portal-access. (Rate-limit auth sudah ada — lihat §0.1)

---

## 2. Flow Publik → Booking

### 2.1 Katalog publik
- `modules/marketing/marketing-public-rooms.controller.ts:11,19` → `marketing-public-rooms.service.ts` (294 baris) — daftar/detail kamar publik, status MAINTENANCE tampil "Sedang dicek", `canBook=false`.
- FAQ publik: `modules/faqs/faqs.controller.ts` (6 endpoint).

### 2.2 Booking publik (tanpa login)
- `modules/tenant-bookings/public-bookings.controller.ts:13` POST → `public-bookings.service.ts:113` `createPublicBooking` (481 baris; buat Tenant+User+Stay sekaligus).

### 2.3 Booking via portal tenant
`modules/tenant-bookings/tenant-bookings.service.ts:56` `createBooking`:
1. Guard schema-ready :57; tenant aktif :91.
2. Transaksi: `SELECT … FOR UPDATE` Tenant :98 → tolak jika sudah punya stay ACTIVE :100-109.
3. Lock Room `FOR UPDATE` :111; kamar harus `isActive` dan status AVAILABLE/RESERVED :125 (multi-booking RESERVED diizinkan).
4. Tolak jika ada stay promoted/occupied di kamar itu :129-142.
5. Harga = snapshot tarif room per `pricingTerm` :144; **DP = 30% × sewa** :150.
6. `expiresAt = calculateBookingExpiry(checkInDate)` :152 (SLA bayar ±3 jam, cutoff same-day pk 21.00 WIB :83-89).
7. Room → RESERVED :157; INSERT Stay (raw SQL) :163; AuditLog `CREATE_BOOKING` :188.

### 2.4 Keputusan admin
- Approve: tenant-bookings.service.ts:236 `approveBooking` → terbit invoice booking.
- Reject: :480 `rejectBooking` (tulis `Stay.cancelReason`); Cancel oleh tenant: :639 `cancelPendingBooking`.
- Daftar booking tenant: :803 `findMine`; notifikasi: :907 approved, :940 rejected.

**Invarian:** booking tidak mengunci kamar (first paid wins); DP 30% mengikuti pricingTerm; booking expired tidak boleh di-approve.
**Fokus audit:** race multi-booking saat 2 pembayaran disetujui hampir bersamaan; konsistensi `isBookingSchemaDriftError` yang menelan error :222; jalur publik vs portal — apakah validasi & DP identik? (Lihat GAP #1 dan #4 di §15)

---

## 3. Flow Pembayaran (JANTUNG SISTEM)

**File inti:** `modules/payment-submissions/payment-submissions.service.ts` (1.346 baris — terbesar).

### 3.1 Tenant upload bukti
`createSubmission`:52 → `findEligibleSubmissionTarget`:1094 → PaymentSubmission PENDING_REVIEW. File bukti via endpoint terproteksi (`doesTenantOwnProof`:1336).

### 3.2 Approve oleh admin — `approveSubmission`:323
1. Lock submission `FOR UPDATE` :326 (`lockSubmissionTx`:1154); harus PENDING_REVIEW :331; stay ACTIVE :335.
2. `isBookingPath = room.status == RESERVED` :339; expired tidak bisa di-approve :345.
3. Hitung ulang paid amount :358; split nominal → `rentPortion` + `depositPortion` :369-393.
4. Buat `InvoicePayment` :397; status invoice → PAID/PARTIAL/ISSUED :414.
5. Auto Journal Lite (best-effort) :439-449.
6. Submission → APPROVED :451.
7. **Jalur booking** :461:
   - Update DP terbayar :473. Deposit ledger (best-effort) :483.
   - **Jika invoice PAID:** Room → OCCUPIED :519; auto `plannedCheckOutDate` :530; promosi meter :542+ → stay "promoted".
   - `cancelCompetingUnpaidBookingsTx`:659.
8. Notifikasi tenant :1270/:1298.

> ⚠️ **Catatan GAP #1 (owner):** Kode saat ini mengizinkan approval menghasilkan invoice PARTIAL. Menurut owner, **pembayaran harus sesuai kontrak — tidak ada partial payment.** Perbaikan: hanya approve jika total pembayaran ≥ total invoice + sisa deposit. Detail di §15 GAP #1.

### 3.3 Jalur lain
- Reject: `rejectSubmission`:753. Expire manual: `expireBooking`:803. Sweep expiry: `runExpiryCheck`:910 → `autoCancelRejectedExpiredBookingTx`:1022.
- **Refund DP kalah first-paid-wins:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. Untuk PENDING_REVIEW: admin refund manual + kirim bukti ke tenant. Lihat GAP #4 di §15.

**Invarian:** total pembayaran ≤ invoice + sisa DP; promosi meter & OCCUPIED hanya saat invoice PAID; hanya satu pemenang per kamar.
**Fokus audit:** semua blok best-effort (jurnal, ledger) → sumber selisih accounting; idempotensi retry approve; partial payment pada booking path (lihat GAP #1).

---

## 4. Flow Invoice & Pembayaran Manual

**File:** `modules/invoices/invoices.service.ts`, `modules/invoice-payments/invoice-payments.service.ts`, `modules/meter-readings/meter-readings.service.ts`

- Invoice CRUD: create:269, `createWithLinesAndIssue`:281, line add/update/remove :358-420 (guard line setelah ISSUED), `recalculateInvoiceTotal`:422.
- Issue: invoices.service.ts:433 → jurnal `postInvoiceIssued`.
- Cancel: :469 → pre-check jurnal POSTED, lalu reversal.
- Pembayaran manual (admin): invoice-payments.service.ts:113 `create` (FOR UPDATE, anti-overpayment) → `syncInvoiceStatus`:226; update:165 / remove:209 → `postPaymentReversalTx`.
- Meter reading: meter-readings.service.ts:121 create / :153 update, guard kronologis `assertReadingIsChronological`:29.

> ⚠️ **Catatan GAP #3 (owner):** Admin tidak boleh remove invoice payment jika kamar sudah OCCUPIED. Kode belum punya guard ini. Detail di §15 GAP #3.

**Invarian:** Σ InvoicePayment ≤ total invoice; status invoice = f(Σpayment); line tidak berubah setelah ISSUE; meter reading monoton naik per room+utilityType.
**Fokus audit:** konsistensi `syncInvoiceStatus` vs perhitungan inline di approveSubmission; reversal saat remove payment yang membuat invoice turun dari PAID → PARTIAL (kamar sudah OCCUPIED — GAP #3).

---

## 5. Flow Perpanjangan (Renew)

**File:** `modules/renew-requests/renew-requests.service.ts`, `modules/stays/stays.service.ts`

### Aturan bisnis (owner):
1. **H-7 sebelum kontrak jatuh tempo:** tenant dapat notifikasi "Perpanjang atau tidak?"
2. **Jika tenant jawab TIDAK:** admin verifikasi manual → kamar bisa dipesan per tanggal checkout tenant lama.
3. **Jika tenant jawab YA:** tenant transfer DP 30% perpanjangan → admin verify → jika valid, renewal disetujui.
4. **Jika tenant belum transfer:** kamar muncul di katalog publik, bisa dipesan orang lain secara online.
5. **Jika tenant checkout sebelum kontrak (disetujui admin):** kamar kotor → dibersihkan staff → muncul di katalog publik.
6. **Pelunasan perpanjangan maks H+7** dari pembayaran DP 30%.
7. **Jika tidak lunas H+7:** kamar bisa dipesan orang lain, staff bersihkan dan usir tenant lama.

### Status implementasi kode saat ini:
- `renew-requests.service.ts:21` `createRequest` — tenant ajukan (PENDING).
- `:77` admin approve → `stays.renewStayInTransaction` stays.service.ts:934:
  - Stay harus ACTIVE; `assertNoOpenInvoicesTx`.
  - Tolak jika hari ini > plannedCheckOutDate → wajib rebooking :973-977.
  - Periode baru mulai dari `plannedCheckOutDate` lama (exclusive) :980.
  - Wajib input meter → invoice DRAFT (RENT + utilitas) → ISSUED.
- `:147` admin reject. `:182` tenant lihat milik sendiri.

> ⚠️ **GAP #2 (owner):** Flow bisnis di atas **belum sepenuhnya diimplementasikan.** Saat ini, approve langsung memperpanjang stay tanpa fase "DP 30% belum aman, kamar bisa dipesan online". Detail di §15 GAP #2.

**Invarian:** renewal tidak boleh menumpuk tunggakan; periode kontinu tanpa gap/overlap.
**Fokus audit:** implementasi fase DP 30% renewal + grace period H+7 + kamar muncul di katalog publik + auto-cancel jika tidak lunas.

---

## 6. Flow Checkout & Deposit

### 6.1 Pengajuan checkout
`modules/checkout-requests/checkout-requests.service.ts` — create:47 (guard `assertNoOpenInvoices`:32) → approve:128 / reject:201 → notifikasi :294/:354/:392.

### 6.2 Final checkout — `stays.service.ts:480` `complete`
1. Hanya aktor lifecycle (`assertCoreLifecycleActor`).
2. **Blokir jika masih ada invoice belum PAID/CANCELLED** :500-523.
3. Stay → COMPLETED :525. Jika tidak ada stay aktif lain → **Room → MAINTENANCE** :546 + auto-create ticket `CHECKOUT_INSPECTION` (dedupe per stay/room/kategori) :559-606.

### 6.3 Settlement deposit — `stays.service.ts:749` `processDeposit`
- Hanya saat COMPLETED/CANCELLED & depositStatus HELD.
- Aksi: FULL_REFUND / PARTIAL / FORFEIT → depositStatus final; jurnal + ledger (**blocking**).

### 6.4 Room readiness gate — `tickets.service.ts:489` `close`
Tiket CHECKOUT_INSPECTION di-close → cek tidak ada stay ACTIVE lain :622 → semua barang GOOD :630 → **Room MAINTENANCE → AVAILABLE** :637-647.

### 6.5 Deposit ledger
`modules/deposit-ledger/deposit-ledger.service.ts` — recordDepositReceivedTx:158 (idempotent), recordDepositSettlementTx:197, summary:319, **reconciliationLite:351** (alat audit bawaan), backfillDryRun:420.

**Invarian:** kamar tidak pernah AVAILABLE tanpa inspeksi; deposit diproses tepat 1×; Σ ledger per stay = depositPaid − refund − deduction.
**Fokus audit:** deposit received best-effort tapi settlement blocking — ledger bisa pincang. Jalankan `reconciliationLite`.

---

## 7. Flow Auto-Ops (jam biologis sistem)

**File:** `modules/auto-ops/auto-ops.service.ts` — 9 job sequential (V5.12.1), mutex `running` :85, `runAll`:84:

| # | Job | Lokasi | Aksi |
|---|---|---|---|
| 1 | **Booking expiry** | runBookingExpiry:128 → expireBookingTx:407 | Booking lewat `expiresAt` tanpa submission PENDING/APPROVED → invoice CANCELLED (reversal blocking), submission EXPIRED, stay CANCELLED, room AVAILABLE. FOR UPDATE re-check. |
| 2 | **Room healer** | runRoomHealer:361 | Room RESERVED yatim (tanpa stay ACTIVE) → AVAILABLE. |
| 3 | **Noon release** | runRoomReleaseAtNoon:151 | ≥ pk 12:00 WIB: stay belum promoted, `plannedCheckOutDate ≤ hari ini` → CANCELLED + room AVAILABLE. |
| 4 | **DownPayment forfeit** | runDownPaymentForfeit | Stay belum promoted, lewat checkIn +1 hari tanpa pelunasan → CANCELLED, DP hangus (jurnal `DP_FORFEIT`), jaminan tidak tersentuh. |
| 5 | **Contract end reminders** | runContractEndReminders | Notifikasi H-7/H-3/H-1/H-day ke tenant (dedupe per gelombang). |
| 6 | **Overstay enforcement** | runOverstayEnforcement | Kamar OCCUPIED + `plannedCheckOutDate` lewat → auto-tiket `EVICT_OVERSTAY` untuk staf. |
| 7 | **Overstay forced checkout** | runOverstayForcedCheckout | H+1 pk 12:00: stay → COMPLETED, kamar → MAINTENANCE + `allowBookingWhileCleaning=true`, tiket pembersihan. Skip jika ada tagihan belum lunas. |
| 8 | **Post-checkout auto-cancel** | runPostCheckoutAutoCancel | Stay belum promoted, tak ada pembayaran APPROVED, lewat plannedCheckOut ≥ 1 hari → CANCELLED + DP FORFEITED + room AVAILABLE. |
| 9 | **Accounting auto-close** | runAccountingAutoClose | Tutup buku bulan lalu otomatis jika readiness aman. |

**Invarian:** job idempotent & aman dijalankan berulang; tidak pernah membatalkan stay yang sudah promoted/dibayar.
**Fokus audit:** Job #3 (noon release) tidak mengecek paymentSubmissions — tenant APPROVED tapi belum promoted (invoice belum PAID) bisa di-CANCEL tanpa forfeit. Job #3 vs #8 tumpang-tindih target tapi efek DP berbeda. Job #3/#6/#7/#8 tanpa `take` — perlu batch limit.

---

## 8. Flow Tiket & Operasional Staf

### 8.1 Tiket — `modules/tickets/tickets.service.ts`
- Buat: backoffice :265 (6+ kategori), portal :321 (komplain), otomatis (CHECKOUT_INSPECTION, EVICT_OVERSTAY, laporan barang).
- Siklus: assign:373 → start:401 (IN_PROGRESS) → markDone:457 (DONE) → close:489 (admin; gate kamar). Cancel dari OPEN :665+.

### 8.2 Rutinitas staf — `modules/staff-routines/staff-routines.service.ts`
Template (admin CRUD :314-:385) → staf `getToday`:74 → start:147/complete:207 (guard satu-kerja-aktif `assertNoActiveWork`:48) → KPI :276, progress admin :385.

### 8.3 Laporan lapangan — `modules/staff-field-reports/staff-field-reports.service.ts`
Staf lapor kondisi barang (create:73, foto) → admin reviewQueue:349 → adminReview:436 → validasi movement :563 + sinkron RoomItem :599 + auto-ticket :638.

### 8.4 Kinerja & review
- `modules/staff-performance/staff-performance.service.ts` — agregat bulanan per staf :161 (KPI dari routine/ticket/field report events), audit kerja `createAudit`:117, saran audit :80, bukti :112.
- Review tenant→staf: `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts` — eligible:15, create:54 (rating; ≤2⭐ wajib komplain, ≥4⭐ pujian; anti-duplikat).

**Fokus audit:** parsing regex BARANG_PINDAH :603-619 (rapuh); penugasan otomatis ke staf id terkecil (beban tidak merata); guard role `markDone` vs `close`.

---

## 9. Flow Inventaris & Barang Kamar (detail)

**File:** `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/`

### 9.1 Master barang gudang — `inventory-items.service.ts`
- CRUD :146/:198 — create, read, update, delete barang.
- `ensureOpeningStockSyncedTx`:99 — sinkron stok awal.
- Update status dari lapangan :216 — auto-ticket bila rusak/hilang.

### 9.2 Pergerakan stok — `inventory-movements.service.ts`
- `create`:43 — lock qty `lockInventoryQtyTx`:88, validasi kecukupan stok :132, sinkron RoomItem :156.
- `update`:72 — reverse lalu re-apply.
- Satu movement IN/OUT mempengaruhi qty gudang + RoomItem.

### 9.3 Barang per kamar — `room-items.service.ts`
- Daftar per kamar :69, milik tenant :73.
- Update status :115 — auto-ticket bila rusak/hilang.
- `create` disabled :98 — hanya via movement, tidak langsung.

### 9.4 Sinkronisasi & verifikasi
- `Verifikasi batch 5` (Audit Mega): double-apply qty TIDAK terjadi (trigger DB + sync self-healing). Tapi risiko kombinasi field-report → ticket-close tetap ada.
- `reconciliationLite` (deposit-ledger) juga mengecek qty.

**Invarian:** qty gudang = stok awal + Σ movement; RoomItem konsisten dengan movement IN/OUT per kamar; perubahan kondisi barang selalu meninggalkan jejak (ticket/field report).
**Fokus audit:** 3 jalur sinkron qty (movement, field report, ticket close) — skenario double-apply masih mungkin di edge case.

---

## 10. Flow Keuangan Operasional (Expense, WiFi, Aset)

### 10.1 Expense
- `modules/expenses/expenses.service.ts` CRUD :49-:72 → jurnal `postExpenseTx`.
- **Fokus audit:** delete expense — apakah jurnal ikut direversal? (M-33, FIX-14/15)

### 10.2 WiFi Sales
- `modules/wifi-sales/wifi-sales.service.ts` CRUD :40-:59 → jurnal `postWifiSaleTx`.
- Tenant bisa order WiFi via portal.
- **Fokus audit:** delete wifi-sale — apakah jurnal ikut direversal?

### 10.3 Aset Tetap
- `modules/assets/assets.service.ts` — CRUD :296/:337, readiness :48.
- **Ledger alignment:** preview:154 / post:159 → `postFixedAssetLedgerAlignmentTx`.
- **Depresiasi:** preview:377 / `runDepreciation`:384 → `AssetDepreciationRun` + `postDepreciationRunTx`.
- **Fokus audit:** depresiasi dobel-run pada bulan sama; aset terhubung roomItem/inventoryItem/expense (`validateRelations`:635) saat induk dihapus.

---

## 11. Flow Akuntansi (Auto Journal Lite + Tutup Buku)

**File:** `modules/accounting/`

### 11.1 Master & jurnal manual — `accounting.service.ts`
seedDefaultCoa:52 → COA CRUD :88-:139 → CashAccount :140-:213 → Periode :214-:312 → Opening balance draft/post/void :325-:526 → Jurnal manual draft :544 (guard periode OPEN :585).

### 11.2 Auto Journal Lite — `accounting-posting.service.ts`
- Wrapper non-tx :69-:127 dan versi `*Tx` :263-:771 untuk: INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED/SETTLEMENT, FIXED_ASSET_ALIGNMENT :128, DEPRECIATION_RUN :204, reversal cancel invoice :689 / payment :741.
- Inti: `postBalancedJournalTx`:1032 — jurnal seimbang, idempotent per (sourceType, sourceId), skip VOID.
- Perbaikan data: `backfillAutoJournal`:905, `dryRunDepositBackfill`:773, `findUnmappedSourceIds`:988.

### 11.3 Tutup buku — `accounting-period-close.service.ts`
readiness:75 → preview:80 → post:93 (manual) / autoCloseMonthly:122 → reopen:248. Readiness check: jurnal unmapped :580, depresiasi :604, alignment aset :615, trial balance :620.

### 11.4 Kesiapan global — `accounting-readiness.service.ts:134` `getReadiness`.

**Invarian:** setiap jurnal seimbang; 1 sumber operasional = max 1 jurnal POSTED aktif; tidak ada posting ke CLOSED; reversal hanya untuk POSTED.
**Fokus audit:** kebijakan campuran blocking vs best-effort per sumber × pemanggil; auto-close menutup periode sementara jurnal best-effort gagal belum di-backfill.

---

## 12. Flow Pelaporan & Dashboard Finance

### 12.1 Laporan operasional — `modules/reports/reports.service.ts`
- monthly-income, overdue-aging, deposit-liability, expense-summary, cash-flow, profit-loss, financial-ratios, occupancy (controller :24-:80).

### 12.2 Dashboard finansial — `modules/finance/finance.service.ts`
- `businessHealth`:40 — kesehatan bisnis multi-indikator.
- `occupancySummary`:179 — okupansi exclude RESERVED.
- `balanceSheetDraft`:234 — neraca saldo draft.
- `ownerDashboard`:280 — dashboard owner ringkas.
- Sejak V5.12.2 (E-4): saldo kas dari JURNAL (opening + Σ debit−kredit POSTED), bukan field manual.
- Sejak V5.12.2 (E-5): deposit liability = HELD di businessHealth & balanceSheetDraft.

### 12.3 Perhitungan keuangan kunci
- **Balance Sheet:** Aset = Kewajiban + Ekuitas. Auto Journal Lite memastikan setiap jurnal seimbang.
- **P&L:** Pendapatan (RENT, UTILITY, PENALTY) − Beban (EXPENSE, DEPRECIATION). Trial balance terverifikasi seimbang di UAT.
- **Cashflow:** Saldo kas = opening + Σ(debit−kredit line POSTED) per CashAccount.
- **Rasio:** financial-ratios (likuiditas, profitabilitas, solvabilitas, efisiensi). Tersedia di `reports.service.ts`.

### 12.4 Analisis ringkas — `modules/analytics/analytics.controller.ts`
- marketing, finance, operations, strategy summary.
- AI helper `modules/ai/ai.controller.ts`: business-narrative, payment-proof/analyze, reminders/personalize, classify-text.

**Fokus audit:** apakah angka reports (raw SQL) cocok dengan angka accounting (jurnal) untuk periode sama; akses role per endpoint laporan.

---

## 13. Flow Analisis Strategis (AI & Manual)

### 13.1 Data dasar untuk analisis
- **Keuangan:** Balance Sheet, P&L, Cashflow, Rasio dari §12.
- **Operasional:** Okupansi, turnover tenant, ticket/resolution time, KPI staf.
- **Pemasaran:** Harga kamar, tingkat booking, sumber booking (publik vs portal).
- **Inventaris:** Stok barang, kondisi barang per kamar, pergerakan stok.

### 13.2 Metode analisis (manual, akuntabilitas tertinggi)
| Metode | Input | Output |
|---|---|---|
| **SWOT** | Data keuangan, operasional, pasar | Kekuatan, Kelemahan, Peluang, Ancaman |
| **PESTLE** | Faktor eksternal (politik, ekonomi, sosial, teknologi, hukum, lingkungan) | Risiko & peluang eksternal |
| **BCG Matrix** | Pendapatan per kamar/tier, market share relatif | Stars, Cash Cows, Question Marks, Dogs |
| **Porter's Generic** | Biaya, diferensiasi, fokus pasar | Strategi bersaing yang tepat |
| **7P Marketing** | Produk, harga, tempat, promosi, orang, proses, bukti fisik | Rencana marketing mix |

### 13.3 AI sebagai konektor (Deepseek V4 Flash / V4-Pro)
- AI bukan sebagai pengganti, tapi **alat koneksi** antar semua indikator untuk memberikan flow dinamis.
- AI membaca semua data keuangan + operasional + strategis, lalu menghasilkan narrative bisnis dan rekomendasi.
- Contoh: AI melihat okupansi turun + pending booking tinggi + SWOT "Weakness: branding lemah" → rekomendasi 7P "Promosi: kolaborasi content creator."

### 13.4 Status implementasi
- `modules/ai/ai.controller.ts` — endpoint AI dasar sudah ada (business-narrative, proof/analyze, reminders/personalize, classify-text).
- Integrasi Deepseek API perlu ditambahkan.
- Analisis manual (SWOT, PESTLE, BCG, Porter, 7P) saat ini belum ada endpoint khusus — tersedia via laporan keuangan + dashboard.

**Fokus audit:** pastikan AI hanya konektor, bukan penentu keputusan final; data keuangan harus akurat sebelum masuk ke analisis strategis.

---

## 14. Flow Notifikasi, Pengumuman & PWA

### 14.1 Notifikasi in-app
- `modules/notifications/app-notification.controller.ts` — list, read, read-all.
- `preview reminder` :17-:49; `mock send` :20.
- **Belum ada pengiriman email/WA nyata.**
- Notifikasi terkirim untuk: approved/rejected payment, approved/rejected booking, approved/rejected renew, approved/rejected checkout, overstay reminders (H-7/H-3/H-1/H-day), kompetitor menang (A17).

### 14.2 Pengumuman
- `modules/announcements/` — draft → publish :50 → tampil di portal tenant.

### 14.3 PWA (status per 2026-06-12 — lihat `docs/08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md`)
- Saat ini: **PWA MVP installable**, belum operasional yang kuat.
- 17 temuan audit: 3 CRITICAL (PWA-01 s.d 03: produksi tertinggal, HTTP tidak paksa HTTPS, frontend tanpa security headers), 6 HIGH, 7 MEDIUM, 1 PLANNED (push notification).
- **4 Phase perbaikan:** Phase 0 (Release Gate), Phase 1 (Cache Safety + Update + Offline UX), Phase 2 (Installability), Phase 3 (Web Push dengan outbox).
- **Aturan kunci:** Jangan cache API/auth/private data. Jangan mutation offline. Push via outbox, bukan side-effect transaksi.
- **Sedang dikerjakan AI lain** — `08_PWA` adalah dokumen aktif, bukan arsip.

---

## 15. Gap Bisnis Real vs Kode — Temuan Audit Flow 2026-06-12

> **Sumber:** Wawancara owner 2026-06-12. Setelah dikonfirmasi, ditemukan 4 gap antara aturan bisnis asli vs implementasi kode.

### 🔴 GAP #1 — Tidak Ada Pembayaran Partial

**Aturan owner:** *"Pembayaran harus sesuai dengan kontrak sehingga kita tidak menerima pembayaran Partial."*

**Fakta kode (`payment-submissions.service.ts:369-393`):** `approveSubmission` split nominal → `rentPortion` + `depositPortion`, invoice bisa PARTIAL, kamar tetap RESERVED.

**Dampak:** Kode izinkan skenario yang tidak dikehendaki — tenant bayar sebagian, admin approve, invoice PARTIAL.

**Perbaikan:** Hanya boleh approve jika total pembayaran ≥ total invoice + sisa deposit. Tidak ada status PARTIAL untuk invoice booking.

---

### 🔴 GAP #2 — DP untuk Renewal: Fase Kamar Belum Aman

**Aturan owner:** DP 30% perpanjangan → kamar belum aman, bisa dipesan online sampai lunas (maks H+7). Staff bersihkan & usir jika tidak lunas.

**Fakta kode:** Renew approval langsung perpanjang stay. Tidak ada fase "kamar bisa dipesan online."

**Perbaikan:** Implementasi flow baru: notifikasi H-7 → tenant jawab YA/TIDAK → jika YA, transfer DP 30% → admin verify → kamar aman. Jika belum transfer → kamar muncul di katalog publik. Grace period H+7.

---

### 🟠 GAP #3 — Admin Tidak Boleh Hapus Payment Saat OCCUPIED

**Aturan owner:** *"Room yang masih di masa kontrak, tidak dapat dibatalkan sepihak oleh admin."*

**Fakta kode (`invoice-payments.service.ts:209` `remove`):** Tidak ada guard apakah room sudah OCCUPIED.

**Perbaikan:** Tambah guard: tolak `remove` jika stay sudah promoted (`initialMetersPromotedAt != NULL`) atau room.status == OCCUPIED.

---

### 🟡 GAP #4 — Refund DP untuk yang Kalah First Paid Wins (Manual via Admin)

**Aturan owner:** Tenant yang sudah transfer tapi admin terlambat verifikasi → tenant lain menang → DP dikembalikan. **Notifikasi** ke tenant yang kalah, lalu **admin transfer manual** dan kirim bukti ke tenant.

**Fakta kode:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. PENDING_REVIEW tidak tersentuh.

**Perbaikan:** Notifikasi + manual refund oleh admin (bukan auto-refund). Admin transfer balik dan upload bukti transfer.

---

### Ringkasan Gap

| # | Gap | Severitas | Dampak |
|---|---|---|---|
| 1 | Partial payment diizinkan | 🔴 KRITIS | Pembayaran tidak sesuai kontrak |
| 2 | Renewal DP belum ada fase aman | 🔴 KRITIS | Kamar bisa dipesan double |
| 3 | Admin bisa hapus payment saat OCCUPIED | 🟠 TINGGI | Inkonsistensi data occupancy |
| 4 | Belum ada notifikasi + proses refund untuk yang kalah | 🟡 MENENGAH | Komplain tenant, manual by admin |

---

## 16. Frontend Surface Map (ringkas)

`frontend/src/App.tsx` — ±50 route. Folder: `pages/{public,auth,portal,staff,admin,owner→(dashboard,finance,reports),bookings,stays,invoices,payments,tickets,rooms,resources,staff-routines,renew-requests,notifications,reminders,settings,profile}`.
Surface utama: publik (`/`, `/rooms`, `/register`), portal tenant (`pages/portal/*`), staf (`pages/staff/*` + staff-routines), admin/owner (stays, invoices, payments review, renew, tickets, performance, finance, reports).
State: TanStack Query + Axios; auth JWT. UI/UX audit (`05_UIUX_AUDIT`): 0 BLOCKER, 4 MAJOR (spinner 5-8dtk detail kamar, 48 kamar tanpa pagination, misleading "Masa Sewa Aktif", invoice kontradiktif), 6 MINOR, 8 Quick Wins.

---

## 17. Usulan Urutan Audit Mendatang

| Pass | Lingkup | Alasan prioritas |
|---|---|---|
| A — Uang masuk | Flow 3 + 4 + 11.2 | Jalur rupiah utama; best-effort journal; file terbesar |
| B — Mesin waktu | Flow 7 (9 job) + interaksi 3/5/6 | Tanpa manusia; tumpang-tindih job #3 vs #8 |
| C — Deposit end-to-end | Flow 2 → 3.2 → 6.3 → 6.5 + reconciliationLite | Asimetri best-effort vs blocking |
| D — Tutup buku | Flow 11.3 + 10 + cross-check 12 | Integritas laporan keuangan |
| E — Akses & keamanan | Flow 0.1 + 1 + guard role | Verifikasi @Roles per endpoint |
| F — Operasional fisik | Flow 6.4 + 8 + 9 | Konsistensi qty 3-jalur; gate kamar |
| G — Data lama | Backfill/reconciliation tools (6.5, 11.2) di DB nyata | Fix V5.11.0 baru fix kode, belum data |
| H — Strategis & AI | Flow 13 | Analisis manual + AI connector |
| I — PWA | Flow 14 + `08_PWA_AUDIT` | Sedang dikerjakan AI lain |