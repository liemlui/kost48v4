# KOST48 V5 — Flow Map (Peta Alur Kode Krusial)
**Versi:** 2026-06-11 — Baseline V5.11.0 (pasca audit-fix #1–#16 + keputusan owner G1–G5)
**Tujuan:** Satu sumber navigasi untuk audit mendalam. Setiap flow krusial dipetakan ke `file:baris` aktual, transisi status, side-effect, dan invarian yang harus dijaga. Dokumen ini dibuat dari pembacaan kode langsung (bukan dari docs lama — `00_GROUND_STATE.md` diketahui drift, lihat §13).

<!-- KOST48_DOCS_SYNC_20260611_FLOW_MAP -->

## Cara pakai saat audit
- Kolom **Rantai kode** = urutan eksekusi nyata, klik/lompat per `file:baris`.
- **Invarian** = aturan yang TIDAK BOLEH dilanggar; setiap audit pass wajib mencari jalur yang bisa melanggarnya.
- **Fokus audit** = pertanyaan terbuka/titik rawan yang ditemukan saat pemetaan (belum tentu bug — perlu verifikasi).

---

## 0. Arsitektur Global

### 0.1 Request pipeline (backend)
- Entry: `backend/src/main.ts`
  - `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, disableErrorMessages di production })` — main.ts:34
  - CORS dari `CORS_ORIGIN` env (production wajib diisi) — main.ts:40-47
  - `trust proxy = 1` + security headers manual (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — main.ts:50-59
  - ⚠️ **TANPA Helmet dan TANPA rate-limit** (header diset manual; tidak ada throttling sama sekali)
  - Static `/uploads` dihapus; bukti bayar hanya via endpoint terproteksi `GET /api/payment-submissions/proofs/:filename`
  - Swagger hanya non-production — main.ts:65+
- Module root: `backend/src/app.module.ts` — 36 modul terdaftar.
- Auth: JWT Bearer, guard + decorator `@Roles(...)`. Role enum aktual: **OWNER, ADMIN, STAFF, TENANT** (schema.prisma `UserRole`).
- Semua mutasi penting menulis `AuditLog` (langsung via `tx.auditLog.create` atau `audit.log`).

### 0.2 Representasi "Booking" (konsep kunci!)
Tidak ada model `Booking` terpisah. Satu record `Stay` mewakili seluruh siklus:
```
BOOKING   = Stay(status=ACTIVE) + Room(status=RESERVED) + initialMetersPromotedAt=NULL + expiresAt terisi
OCCUPIED  = Stay(status=ACTIVE) + Room(status=OCCUPIED) + initialMetersPromotedAt terisi ("promoted")
SELESAI   = Stay(status=COMPLETED)  |  BATAL/EXPIRED = Stay(status=CANCELLED)
```
> **Terminologi (ketetapan owner 2026-06-11):** **DP** = uang muka untuk pesan kamar (bagian harga sewa, hangus bila gagal kontrak) → field `Stay.downPayment*` (sejak V5.12.0). **Deposit** = uang jaminan yang dicek saat checkout (refundable via settlement) → field `Stay.deposit*`, nominal dari `Room.defaultDepositRupiah`.
>
> **Update alur booking V5.12.0 (A18):** bayar DP 30% (atau langsung pelunasan penuh) → DP approved = kamar terkunci (pesaing dibatalkan, `expiresAt` mati) → pelunasan sisa sewa + jaminan paling lambat saat check-in → tidak lunas H+1 pk 12:00 → `runDownPaymentForfeit`: stay batal, DP hangus (jurnal `DP_FORFEIT`), jaminan tidak tersentuh. Overstay (A5): tenant promoted lewat `plannedCheckOutDate` tanpa checkout final → tiket EVICT_OVERSTAY pk 12:00. Detail di CHANGELOG V5.12.0; sebagian nomor baris di dokumen ini bergeser akibat fix V5.11.1–V5.12.0.

Constraint DB penunjang (sql/bootstrap.sql):
- `stay_one_active_per_tenant_uidx` — 1 stay ACTIVE per tenant (termasuk fase booking).
- `stay_one_active_per_room_uidx` — 1 stay ACTIVE per room **hanya jika sudah promoted** → multi-booking RESERVED pada 1 kamar DIIZINKAN (kebijakan "first paid wins").
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
- Users CRUD (OWNER/ADMIN only untuk create/update): `modules/users/users.controller.ts:20-39`
- Tenants CRUD + akses portal: `modules/tenants/tenants.controller.ts` — buat akun portal `:60`, suspend `:47`, reset password `:73`
- Profil tenant self-service: `modules/tenants/tenant-profile.controller.ts:19,28` (GET profile, PATCH onboarding)

**Invarian:** token reset sekali pakai & berbatas waktu; tenant hanya bisa baca data dirinya; tidak ada refresh token (expiry 24 jam).
**Fokus audit:** enumerasi akun via respons forgot-password; brute-force login (TIDAK ada rate-limit global); kekuatan JWT secret & klaim; sesi setelah suspend portal-access.

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
5. Harga = snapshot tarif room per `pricingTerm` :144; **DP = 30% × sewa** :150 (keputusan G4=B).
6. `expiresAt = calculateBookingExpiry(checkInDate)` :152 (SLA bayar ±3 jam, cutoff same-day pk 21.00 WIB :83-89).
7. Room → RESERVED :157; INSERT Stay (raw SQL) :163; AuditLog `CREATE_BOOKING` :188.

### 2.4 Keputusan admin
- Approve: tenant-bookings.service.ts:236 `approveBooking` → terbit invoice booking.
- Reject: :480 `rejectBooking` (tulis `Stay.cancelReason`); Cancel oleh tenant: :639 `cancelPendingBooking`.
- Daftar booking tenant: :803 `findMine`; notifikasi: :907 approved, :940 rejected.

**Invarian:** booking tidak mengunci kamar (first paid wins); DP 30% mengikuti pricingTerm; booking expired tidak boleh di-approve.
**Fokus audit:** race multi-booking saat 2 pembayaran disetujui hampir bersamaan; konsistensi `isBookingSchemaDriftError` yang menelan error :222; jalur publik (2.2) vs portal (2.3) — apakah validasi & DP identik?

---

## 3. Flow Pembayaran (JANTUNG SISTEM)

**File inti:** `modules/payment-submissions/payment-submissions.service.ts` (1.346 baris — terbesar).

### 3.1 Tenant upload bukti
`createSubmission`:52 → target invoice eligible (`findEligibleSubmissionTarget`:1094) → PaymentSubmission PENDING_REVIEW. File bukti diakses hanya via endpoint terproteksi (`doesTenantOwnProof`:1336).

### 3.2 Approve oleh admin — `approveSubmission`:323 (transaksi tunggal, urutan penting)
1. Lock submission `FOR UPDATE` :326 (`lockSubmissionTx`:1154); harus PENDING_REVIEW :331; stay ACTIVE :335.
2. `isBookingPath = room.status == RESERVED` :339; booking expired tidak bisa di-approve :345.
3. Hitung ulang paid amount segar :358; split nominal → `rentPortion` (≤ sisa invoice) + `depositPortion` (≤ sisa DP, kelebihan = ditolak) :369-393.
4. Buat `InvoicePayment` :397; status invoice → PAID/PARTIAL/ISSUED :414; update invoice :430.
5. **Auto Journal Lite (best-effort, tidak memblokir):** `postInvoiceIssuedTx` + `postInvoicePaymentTx` :439-449 → gagal hanya `logger.warn`.
6. Submission → APPROVED :451.
7. **Jalur booking saja** :461:
   - Update DP terbayar + `depositPaymentStatus` :473.
   - Deposit ledger `recordDepositReceivedTx` :483 (best-effort) + jurnal liability `postDepositReceivedForStayTx` :503 (best-effort).
   - **Jika invoice PAID:** Room → OCCUPIED :519; auto-isi `plannedCheckOutDate = calculatePeriodEnd` :530; **promosi meter** pending → `MeterReading` + set `initialMetersPromotedAt` :542+ → stay resmi "promoted".
   - Batalkan booking pesaing yang belum bayar: `cancelCompetingUnpaidBookingsTx`:659.
8. Notifikasi tenant :1270/:1298.

### 3.3 Jalur lain
- Reject: `rejectSubmission`:753. Expire manual: `expireBooking`:803. Sweep expiry: `runExpiryCheck`:910 → `autoCancelRejectedExpiredBookingTx`:1022.

**Invarian:** total pembayaran tidak boleh melebihi invoice + sisa DP; promosi meter & OCCUPied hanya saat invoice PAID; hanya satu pemenang per kamar (pesaing dibatalkan dalam transaksi yang sama).
**Fokus audit:** semua blok **best-effort** (jurnal, ledger) → sumber selisih accounting vs operasional; idempotensi bila approve di-retry; partial payment pada booking path (invoice PARTIAL → kamar tetap RESERVED — apakah expiry tetap berjalan adil?).

---

## 4. Flow Invoice & Pembayaran Manual

**File:** `modules/invoices/invoices.service.ts`, `modules/invoice-payments/invoice-payments.service.ts`, `modules/meter-readings/meter-readings.service.ts`

- Invoice CRUD: create:269, `createWithLinesAndIssue`:281, line add/update/remove :358-420 (DB guard melarang mutasi line setelah ISSUED), `recalculateInvoiceTotal`:422.
- Issue: invoices.service.ts:433 → jurnal `postInvoiceIssued`.
- Cancel: :469 → pre-check jurnal POSTED dulu, baru reversal (pola acuan fix #2/#12).
- Pembayaran manual (admin): invoice-payments.service.ts:113 `create` (FOR UPDATE, validasi overpayment dalam transaksi — fix #7) → `syncInvoiceStatus`:226; update:165 / remove:209 → `postPaymentReversalTx` (fix #9).
- Meter reading: meter-readings.service.ts:121 create / :153 update, guard kronologis `assertReadingIsChronological`:29.

**Invarian:** Σ InvoicePayment ≤ total invoice; status invoice selalu = f(Σpayment); line tidak berubah setelah ISSUE; meter reading monoton naik per room+utilityType.
**Fokus audit:** konsistensi `syncInvoiceStatus` vs perhitungan inline di approveSubmission (dua implementasi logika sama); reversal saat remove payment yang membuat invoice turun dari PAID → PARTIAL (kamar sudah OCCUPIED — apa efeknya?).

---

## 5. Flow Perpanjangan (Renew)

**File:** `modules/renew-requests/renew-requests.service.ts`, `modules/stays/stays.service.ts`

1. Tenant ajukan: renew-requests.service.ts:21 `createRequest` (PENDING).
2. Admin approve: :77 → `stays.renewStayInTransaction` stays.service.ts:934:
   - Stay harus ACTIVE; `assertNoOpenInvoicesTx` (tidak boleh ada tunggakan).
   - **Tolak jika hari ini > plannedCheckOutDate** → wajib rebooking (kebijakan owner) :973-977.
   - Periode baru mulai dari `plannedCheckOutDate` lama (exclusive) :980; hitung `calculatePeriodEnd`.
   - Wajib input meter listrik+air → invoice DRAFT berisi line RENT + utilitas :1004+ → lalu ISSUED.
3. Admin reject: :147. Tenant lihat milik sendiri: :182.

**Invarian:** renewal tidak boleh menumpuk tunggakan; invoice renew dibuat DRAFT dulu (guard line) baru di-issue; periode kontinu tanpa gap/overlap.
**Fokus audit:** denda keterlambatan (disebut di docs, perlu verifikasi implementasinya di mana); interaksi renew yang di-approve menjelang noon-release pk 12:00 (flow 7.3) — race kontrak habis vs perpanjangan.

---

## 6. Flow Checkout & Deposit

### 6.1 Pengajuan checkout
`modules/checkout-requests/checkout-requests.service.ts` — create:47 (guard `assertNoOpenInvoices`:32) → approve:128 / reject:201 → notifikasi :294/:354/:392.

### 6.2 Final checkout — `stays.service.ts:480` `complete`
1. Hanya aktor lifecycle (`assertCoreLifecycleActor`); tanggal pakai konvensi hari-bisnis Jakarta :482-497.
2. Transaksi: **blokir jika masih ada invoice belum PAID/CANCELLED** :500-523.
3. Stay → COMPLETED (updateMany guard status) :525; jika tidak ada stay aktif lain → **Room → MAINTENANCE** :546 + auto-create ticket `CHECKOUT_INSPECTION` (dedupe per stay/room/kategori, assign staff pertama) :559-606.

### 6.3 Settlement deposit — `stays.service.ts:749` `processDeposit`
- Hanya saat stay COMPLETED/CANCELLED & depositStatus HELD; blokir jika ada invoice aktif.
- Aksi: FULL_REFUND / PARTIAL / FORFEIT → depositStatus final; jurnal `postDepositSettlementTx` + ledger `recordDepositSettlementTx` (stays.service.ts ±:865-875, **blocking, bukan best-effort**).

### 6.4 Room readiness gate — `tickets.service.ts:489` `close`
Tiket CHECKOUT_INSPECTION di-close → cek tidak ada stay ACTIVE lain :622 → semua status barang final GOOD :630 → **Room MAINTENANCE → AVAILABLE** :637-647; alasan blokir dicatat di audit meta :668.

### 6.5 Deposit ledger (sumber kebenaran riwayat DP)
`modules/deposit-ledger/deposit-ledger.service.ts` — recordDepositReceivedTx:158 (idempotent via `createEntryIfMissingTx`:102), recordDepositSettlementTx:197, summary:319, **reconciliationLite:351** (alat audit bawaan), backfillDryRun:420.

**Invarian:** kamar tidak pernah AVAILABLE tanpa lolos inspeksi; deposit diproses tepat 1×; Σ ledger per stay = depositPaid − refund − deduction.
**Fokus audit:** deposit received dicatat **best-effort** (flow 3.2) tapi settlement **blocking** — ledger bisa pincang sebelah; jalankan `reconciliationLite` sebagai langkah audit data nyata.

---

## 7. Flow Auto-Ops (jam biologis sistem)

**File:** `modules/auto-ops/auto-ops.service.ts` — interval `AUTO_OPS_DEADLINES.AUTO_OPS_INTERVAL_MINUTES` (min 60 dtk) :35-45, mutex `running` :85, `runAll`:84 menjalankan 6 job paralel:

| # | Job | Lokasi | Aksi |
|---|---|---|---|
| 1 | Booking expiry | runBookingExpiry:128 → expireBookingTx:407 | Booking lewat `expiresAt` tanpa submission PENDING/APPROVED → invoice CANCELLED (+reversal jurnal POSTED, **blocking** :456-461), submission → EXPIRED, stay → CANCELLED, room → AVAILABLE. Re-check FOR UPDATE :410 (fix #3). |
| 2 | Room healer | runRoomHealer:361 | Room RESERVED yatim (tanpa stay ACTIVE) → AVAILABLE. |
| 3 | Noon release (G5=A) | runRoomReleaseAtNoon:151 | ≥ pk 12:00 WIB: stay ACTIVE belum promoted dengan plannedCheckOutDate ≤ hari ini → CANCELLED + room AVAILABLE. |
| 4 | Overstay enforcement (G1=B) | runOverstayEnforcement:209 | Kamar OCCUPIED + ada stay baru yang sudah APPROVED bayar → auto-ticket `EVICT_OVERSTAY` ke staff (dedupe :240). |
| 5 | H+1 auto-cancel + DP hangus (G2/G3=A) | runPostCheckoutAutoCancel:300 | Stay belum promoted, tak ada pembayaran APPROVED, lewat plannedCheckOut ≥ 1 hari → CANCELLED, `depositStatus=FORFEITED`, room AVAILABLE. |
| 6 | Accounting auto-close | runAccountingAutoClose:112 → accounting-period-close.service.ts:122 | Tutup buku bulan lalu otomatis jika readiness aman. |

**Invarian:** job idempotent & aman dijalankan berulang; tidak pernah membatalkan stay yang sudah promoted/dibayar.
**Fokus audit (temuan pemetaan):**
- Job #3 noon-release **tidak mengecek paymentSubmissions sama sekali** — tenant yang sudah bayar APPROVED tapi belum promoted (invoice belum PAID penuh) bisa di-CANCEL tanpa forfeit logic. Bandingkan dengan job #5 yang mengecek.
- Job #3 vs #5 tumpang-tindih target (keduanya unpromoted + lewat plannedCheckOut) tapi efek DP berbeda (tanpa forfeit vs forfeit) — urutan eksekusi paralel menentukan hasil DP.
- Job #5 bernama "PostCheckoutAutoCancel" tapi memakai `plannedCheckOutDate`, bukan H+1 sejak jatuh tempo bayar — verifikasi sesuai niat keputusan G2.
- Semua job loop per-item tanpa batch limit kecuali #1/#2 (take 100) — #3/#4/#5 tanpa `take`.

---

## 8. Flow Tiket & Operasional Staf

### 8.1 Tiket — `modules/tickets/tickets.service.ts`
- Buat: backoffice :265 (admin/owner, 6+ kategori), portal :321 (tenant komplain), otomatis (CHECKOUT_INSPECTION dari flow 6.2, EVICT_OVERSTAY dari flow 7.4, dari laporan barang flow 9).
- Siklus: assign:373 → start:401 (IN_PROGRESS, staf) → markDone:457 (DONE + resolusi) → close:489 (admin; wajib catatan final ≥8 char, status akhir barang; sinkron RoomItem/InventoryItem; tutup StaffFieldReport terkait; gate kamar flow 6.4). Cancel hanya dari OPEN :665+.

### 8.2 Rutinitas staf — `modules/staff-routines/staff-routines.service.ts`
Template (admin CRUD :314-:385) → staf `getToday`:74 → start:147/complete:207 dengan guard satu-pekerjaan-aktif `assertNoActiveWork`:48 → KPI pribadi :276, progress admin :385.

### 8.3 Laporan lapangan — `modules/staff-field-reports/staff-field-reports.service.ts`
Staf lapor kondisi barang (create:73, foto, ReportedCondition) → antrean admin reviewQueue:349 → adminReview:436 (APPROVE/REJECT) → validasi movement :563 + sinkron RoomItem :599 + auto-ticket :638.

### 8.4 Kinerja & review
- `modules/staff-performance/staff-performance.service.ts` — agregat bulanan per staf :161 (KPI dari routine/ticket/field report events), audit kerja `createAudit`:117, saran audit :80, bukti :112.
- Review tenant→staf: `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts` — eligible:15 (siapa boleh review), create:54 (rating; ≤2⭐ wajib kategori komplain, ≥4⭐ tag pujian; anti-duplikat P2002 — fix #14).

**Invarian:** transisi status tiket searah; staf hanya satu pekerjaan aktif; CHECKOUT_INSPECTION satu-satunya pintu MAINTENANCE→AVAILABLE.
**Fokus audit:** parsing regex deskripsi tiket BARANG_PINDAH :603-619 (rapuh); penugasan otomatis selalu ke staf id terkecil (beban tidak merata); siapa boleh `markDone` vs `close` (cek guard role per endpoint).

---

## 9. Flow Inventaris & Barang Kamar

**File:** `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/`

- Master barang gudang: inventory-items.service.ts — CRUD :146/:198, sinkron stok-awal `ensureOpeningStockSyncedTx`:99, update status dari lapangan :216 (auto-ticket bila rusak/hilang).
- Pergerakan stok: inventory-movements.service.ts — create:43 (lock qty `lockInventoryQtyTx`:88, validasi :132, sinkron RoomItem :156), update:72 (reverse lalu re-apply).
- Barang per kamar: room-items.service.ts — daftar per kamar :69, milik tenant :73, update status :115 (auto-ticket), create disabled :98 (hanya via movement).

**Invarian:** qty gudang = stok awal + Σ movement; RoomItem konsisten dengan movement IN/OUT per kamar; perubahan kondisi barang selalu meninggalkan jejak (ticket/field report).
**Fokus audit:** jalur sinkronisasi qty ada di ≥3 tempat (movement, field report, ticket close) — cari skenario double-apply.

---

## 10. Flow Keuangan Operasional (Expense, WiFi, Aset)

- Expense: `modules/expenses/expenses.service.ts` CRUD :49-:72 → jurnal `postExpenseTx`.
- WiFi sales: `modules/wifi-sales/wifi-sales.service.ts` CRUD :40-:59 → jurnal `postWifiSaleTx`.
- Aset tetap: `modules/assets/assets.service.ts` — CRUD :296/:337, readiness :48, **ledger alignment** preview:154/post:159 → `postFixedAssetLedgerAlignmentTx`, **depresiasi** preview:377 / `runDepreciation`:384 → `AssetDepreciationRun` + `postDepreciationRunTx`.

**Fokus audit:** delete expense/wifi-sale — apakah jurnal ikut direversal?; depresiasi dobel-run pada bulan sama; aset terhubung roomItem/inventoryItem/expense (`validateRelations`:635) saat induknya dihapus.

---

## 11. Flow Akuntansi (Auto Journal Lite + Tutup Buku)

**File:** `modules/accounting/`

### 11.1 Master & jurnal manual — accounting.service.ts
seedDefaultCoa:52 → COA CRUD :88-:139 → CashAccount :140-:213 → Periode :214-:312 → Opening balance draft/post/void :325-:526 → jurnal manual draft :544 (guard periode OPEN :585).

### 11.2 Auto Journal Lite — accounting-posting.service.ts
- Wrapper non-tx :69-:127 dan versi `*Tx` :263-:771 untuk: INVOICE issued, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT received/settlement, FIXED_ASSET alignment :128, DEPRECIATION run :204, reversal cancel invoice :689 / payment :741.
- Inti: `postBalancedJournalTx`:1032 — jurnal seimbang, idempotent per (sourceType, sourceId), skip VOID (fix #12).
- Perbaikan data: `backfillAutoJournal`:905, `dryRunDepositBackfill`:773, `findUnmappedSourceIds`:988.
- Pemanggil tersebar di 7 service (invoices, invoice-payments, payment-submissions, stays, auto-ops, expenses/wifi via posting service).

### 11.3 Tutup buku — accounting-period-close.service.ts
readiness:75 → preview:80 → post:93 (manual) atau autoCloseMonthly:122 (via auto-ops; kebijakan :101) → reopen:248. Readiness build :325 mengecek: jurnal unmapped :580, depresiasi :604, alignment aset :615, trial balance :620.

### 11.4 Kesiapan global — accounting-readiness.service.ts:134 `getReadiness`.

**Invarian:** setiap jurnal seimbang (Σdebit=Σkredit); 1 sumber operasional = max 1 jurnal POSTED aktif; tidak ada posting ke periode CLOSED; reversal hanya untuk jurnal POSTED.
**Fokus audit (tema terbesar):** kebijakan campuran **blocking vs best-effort** per pemanggil (lihat flow 3.2, 6.3, 7.1) → matriks lengkap sumber × pemanggil × kebijakan; auto-close menutup periode sementara jurnal best-effort yang gagal belum di-backfill.

---

## 12. Flow Pelaporan, Analytics, AI, Notifikasi

- Laporan operasional: `modules/reports/reports.service.ts` — monthly-income, overdue-aging, deposit-liability, expense-summary, cash-flow, profit-loss, financial-ratios, occupancy (controller :24-:80).
- Dashboard finansial: `modules/finance/finance.service.ts` — businessHealth:40, occupancySummary:179 (okupansi exclude RESERVED — fix P2-26), balanceSheetDraft:234, ownerDashboard:280.
- Analytics ringkas: `modules/analytics/analytics.controller.ts` — marketing/finance/operations/strategy summary.
- AI helper: `modules/ai/ai.controller.ts` — business-narrative, payment-proof/analyze, reminders/personalize, classify-text.
- Notifikasi in-app: `modules/notifications/app-notification.controller.ts` (list, read, read-all); preview reminder :17-:49; mock send :20. **Belum ada pengiriman email/WA nyata.**
- Pengumuman: `modules/announcements/` draft → publish :50 → tampil di portal.

**Fokus audit:** apakah angka reports (raw query) cocok dengan angka accounting (jurnal) untuk periode sama — uji silang P&L reports vs trial balance; akses role per endpoint laporan.

---

## 13. Drift Dokumentasi yang Sudah Terverifikasi (jangan percaya docs lama)

| Klaim docs lama | Fakta kode |
|---|---|
| `00_GROUND_STATE.md` §1.1: Helmet + express-rate-limit | Tidak ada keduanya; header manual, rate-limit absen (main.ts:50) |
| §3.0: Role SUPER_ADMIN > ADMIN > FINANCE > STAFF > TENANT | Enum aktual hanya OWNER/ADMIN/STAFF/TENANT |
| §1.2: 50 model (TenantBooking, Workspace, dst.) | 40 model; tidak ada TenantBooking/Workspace/ContractRule/PricingRule dll |
| §8.0: "No deposit ledger", "No asset/depreciation", "No invoice auto-posting" | Semuanya SUDAH ada (deposit-ledger, assets, Auto Journal Lite) |
| Struktur folder §2.0 (payments/, deposits/, public/, dashboard/, me/, maintenance/) | Nama modul aktual berbeda (lihat app.module.ts) |

---

## 14. Frontend Surface Map (ringkas)

`frontend/src/App.tsx` — ±50 route. Folder halaman: `pages/{public,auth,portal,staff,admin,owner→(dashboard,finance,reports),bookings,stays,invoices,payments,tickets,rooms,resources,staff-routines,renew-requests,notifications,reminders,settings,profile}`.
Surface utama: publik (`/`, `/rooms`, `/register`), portal tenant (`pages/portal/*` — MyBookings, MyInvoices, MyStay, MyTickets, WifiOrder, Announcements), staf (`pages/staff/*` + staff-routines), admin/owner (stays, invoices, payments review, renew, tickets, performance, finance, reports).
State: TanStack Query + Axios; auth context JWT.

---

## 15. Usulan Urutan Audit Mendalam (per flow di atas)

| Pass | Lingkup | Alasan prioritas |
|---|---|---|
| A — Uang masuk | Flow 3 + 4 + 11.2 | Jalur rupiah utama; konsentrasi best-effort journal; file terbesar |
| B — Mesin waktu | Flow 7 (6 job) + interaksi dengan 3/5/6 | Berjalan tanpa manusia; temuan tumpang-tindih job #3 vs #5 sudah ada |
| C — Deposit end-to-end | Flow 2 (DP 30%) → 3.2 → 6.3 → 6.5 + reconciliationLite | Asimetri best-effort vs blocking; uang titipan = risiko kepercayaan |
| D — Tutup buku | Flow 11.3 + 10 + cross-check 12 | Integritas laporan keuangan owner |
| E — Akses & keamanan | Flow 0.1 + 1 + guard role semua controller | Rate-limit absen; verifikasi @Roles per endpoint |
| F — Operasional fisik | Flow 6.4 + 8 + 9 | Konsistensi qty 3-jalur; gate kamar |
| G — Data lama | Backfill/reconciliation tools (6.5, 11.2) di DB nyata | Fix V5.11.0 baru memperbaiki kode, belum tentu data |
