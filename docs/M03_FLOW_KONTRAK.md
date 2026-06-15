# KOST48 V5 - Flow Map dan Kontrak Sistem

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Peta alur kode krusial, lifecycle utama, kontrak domain, safety belt, dan aturan high-risk flow.

## Sumber Digabung

- `docs/02_FLOW_MAP.md` - konten dipertahankan
- `docs/06_CONTRACTS.md` - konten dipertahankan

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/02_FLOW_MAP.md`

### KOST48 V5 — Flow Map (Peta Alur Kode Krusial)
**Versi:** 2026-06-13 — sinkronisasi keputusan owner, status kode, dossier `10`-`19`, dan urutan Auto-Ops aktual.
**Tujuan:** Peta NARASI alur lintas-domain (apa memanggil apa, transisi status, side-effect, invarian).
> ⚠️ **ANCHOR BARIS:** angka `file:baris` di dokumen ini = posisi METODE (anchor utama disinkronkan ke kode `3c7ffe2`) + sebagian sub-baris langkah yang **INDIKATIF** (bisa bergeser saat file disunting). **Sumber baris terverifikasi:** `_PETA_AI.md §2` + dossier `10`-`19`. Bila ragu, **grep nama metode**, jangan andalkan sub-baris.

<!-- KOST48_DOCS_SYNC_20260613_FLOW_MAP_V3 -->

#### Cara pakai saat audit
- Kolom **Rantai kode** = urutan eksekusi nyata, klik/lompat per `file:baris`.
- **Cross-ref gap bisnis** = lihat §15 untuk gap yang BELUM diperbaiki di kode.
- **Invarian** = aturan yang TIDAK BOLEH dilanggar; setiap audit pass wajib mencari jalur yang bisa melanggarnya.
- **Fokus audit** = pertanyaan terbuka/titik rawan yang ditemukan saat pemetaan.

---

#### 0. Arsitektur Global

##### 0.1 Request pipeline (backend)
- Entry: `backend/src/main.ts`
  - `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, disableErrorMessages di production })` — main.ts:34
  - CORS dari `CORS_ORIGIN` env (production wajib diisi) — main.ts:40-47
  - `trust proxy = 1` + security headers manual (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — main.ts:50-59
  - ⚠️ **TANPA Helmet** (keputusan sadar), **RATE-LIMIT SUDAH ADA** sejak V5.12.2: `common/middleware/rate-limit.middleware.ts` — global 300/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`), auth 10/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`). In-memory, per-proses; multi-instance perlu store bersama.
  - Static `/uploads` dihapus; bukti bayar hanya via endpoint terproteksi `GET /api/payment-submissions/proofs/:filename`
  - Swagger hanya non-production — main.ts:65+
- Module root: `backend/src/app.module.ts` — 33 modul di `modules/` (lihat `01_GROUND_STATE §1.2`).
- Auth: JWT Bearer, guard + decorator `@Roles(...)`. Role enum aktual: **OWNER, ADMIN, STAFF, TENANT** (schema.prisma `UserRole`). **APP_GUARD global default-deny** (E-1) sejak V5.12.2 — controller baru otomatis 401, bukan bocor publik.
- Semua mutasi penting menulis `AuditLog` (langsung via `tx.auditLog.create` atau `audit.log`).

##### 0.2 Representasi "Booking" (konsep kunci!)
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

##### 0.3 Enum status inti (schema.prisma)
| Entitas | Status |
|---|---|
| Stay | ACTIVE → COMPLETED / CANCELLED |
| Room | AVAILABLE → RESERVED → OCCUPIED → MAINTENANCE → (AVAILABLE) / INACTIVE |
| Invoice | DRAFT → ISSUED → PARTIAL → PAID / CANCELLED |
| PaymentSubmission | PENDING_REVIEW → APPROVED / REJECTED / EXPIRED |
| Deposit (Stay.depositStatus) | HELD → PARTIALLY_REFUNDED / REFUNDED / FORFEITED |
| Ticket | OPEN → IN_PROGRESS → DONE → CLOSED; CANCELLED dari kondisi yang diizinkan |
| RenewRequest / CheckoutRequest | PENDING → APPROVED / REJECTED |

---

#### 1. Flow Auth & Identitas

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

#### 2. Flow Publik → Booking

##### 2.1 Katalog publik
- `modules/marketing/marketing-public-rooms.controller.ts:11,19` → `marketing-public-rooms.service.ts` — daftar/detail kamar publik. MAINTENANCE normal tidak dapat dipesan; MAINTENANCE dengan `allowBookingWhileCleaning=true` dapat dipesan tetapi belum dapat dihuni.
- FAQ publik: `modules/faqs/faqs.controller.ts` (6 endpoint).

##### 2.2 Booking publik (tanpa login)
- `modules/tenant-bookings/public-bookings.controller.ts:13` POST → `public-bookings.service.ts:113` `createPublicBooking` (481 baris; buat Tenant+User+Stay sekaligus).

##### 2.3 Booking via portal tenant
`modules/tenant-bookings/tenant-bookings.service.ts:56` `createBooking`:
1. Guard schema-ready :57; tenant aktif :91.
2. Transaksi: `SELECT … FOR UPDATE` Tenant :98 → tolak jika sudah punya stay ACTIVE :100-109.
3. Lock Room `FOR UPDATE` :111; kamar harus `isActive` dan status AVAILABLE/RESERVED :125 (multi-booking RESERVED diizinkan).
4. Tolak jika ada stay promoted/occupied di kamar itu :129-142.
5. Harga = snapshot tarif room per `pricingTerm` :144; **DP = 30% × sewa** :157.
6. `expiresAt = calculateBookingExpiry(checkInDate)` : helper memakai deadline flat 3 jam dari waktu pembuatan.
7. Room → RESERVED :157; INSERT Stay (raw SQL) :163; AuditLog `CREATE_BOOKING` :188.

##### 2.4 Keputusan admin
- Approve: tenant-bookings.service.ts:247 `approveBooking` → terbit invoice booking.
- Reject: :506 `rejectBooking` (tulis `Stay.cancelReason`); Cancel oleh tenant: :677 `cancelPendingBooking`.
- Daftar booking tenant: `findMine`; notifikasi approved/rejected (best-effort).

**Invarian:** booking belum bayar tidak mengunci kamar; DP pertama yang disetujui mengunci kamar; DP 30% mengikuti pricingTerm; booking expired tidak boleh di-approve.
**Fokus audit:** race multi-booking saat 2 pembayaran disetujui hampir bersamaan; konsistensi `isBookingSchemaDriftError` yang menelan error :222; jalur publik vs portal — apakah validasi & DP identik? (Lihat GAP #1 dan #4 di §15)

---

#### 3. Flow Pembayaran (JANTUNG SISTEM)

**File inti:** `modules/payment-submissions/payment-submissions.service.ts` (1.564 baris — terbesar).

##### 3.1 Tenant upload bukti
`createSubmission`:52 → `findEligibleSubmissionTarget`:1306 → PaymentSubmission PENDING_REVIEW. File bukti via endpoint terproteksi (`doesTenantOwnProof`:1554).

##### 3.2 Approve oleh admin — `approveSubmission`:353
1. Lock submission `FOR UPDATE` (`lockSubmissionTx`:1370); harus PENDING_REVIEW; stay ACTIVE. (Sub-baris langkah indikatif; anchor split/OCCUPIED/meter lihat dossier 10.)
2. `isBookingPath = room.status == RESERVED` :339; expired tidak bisa di-approve :345.
3. Hitung ulang paid amount :358; split nominal → `rentPortion` + `depositPortion` :369-393.
4. Buat `InvoicePayment` :397; status invoice → PAID/PARTIAL/ISSUED :414.
5. Auto Journal Lite (best-effort) :439-449.
6. Submission → APPROVED :451.
7. **Jalur booking** :461:
   - Update DP terbayar :473. Deposit ledger (best-effort) :483.
   - **Jika invoice PAID:** Room → OCCUPIED :519; auto `plannedCheckOutDate` :530; promosi meter :542+ → stay "promoted".
   - `cancelCompetingUnpaidBookingsTx`:736.
8. Notifikasi tenant :1270/:1298.

> ⚠️ **Catatan GAP #1 (owner):** Status teknis `PARTIAL` tetap diperlukan untuk DP 30% yang sah. Gap-nya adalah approval belum memvalidasi ulang dua nominal yang diizinkan: DP tepat atau pelunasan penuh tepat. Invoice-only wajib lunas penuh.

##### 3.3 Jalur lain
- Reject: `rejectSubmission`:909. Expire manual: `expireBooking`:959. Sweep expiry: `runExpiryCheck`:1096 → `autoCancelRejectedExpiredBookingTx`:1233.
- **Refund DP kalah first-paid-wins:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. Untuk PENDING_REVIEW: admin refund manual + kirim bukti ke tenant. Lihat GAP #4 di §15.

**Invarian:** total pembayaran ≤ invoice + sisa DP; promosi meter & OCCUPIED hanya saat invoice PAID; hanya satu pemenang per kamar.
**Fokus audit:** semua blok best-effort (jurnal, ledger) → sumber selisih accounting; idempotensi retry approve; partial payment pada booking path (lihat GAP #1).

---

#### 4. Flow Invoice & Pembayaran Manual

**File:** `modules/invoices/invoices.service.ts`, `modules/invoice-payments/invoice-payments.service.ts`, `modules/meter-readings/meter-readings.service.ts`

- Invoice CRUD: create:269, `createWithLinesAndIssue`:281, line add/update/remove (guard line setelah ISSUED), `recalculateInvoiceTotal`:423.
- Issue: invoices.service.ts:444 → jurnal `postInvoiceIssued`.
- Cancel: :480 → pre-check jurnal POSTED, lalu reversal.
- Pembayaran manual (admin): invoice-payments.service.ts:113 `create` (FOR UPDATE, anti-overpayment) → `syncInvoiceStatus`; update:189 / remove:237 (remove berjurnal kini diblokir A8).
- Meter reading: meter-readings.service.ts:121 create / :153 update, guard kronologis `assertReadingIsChronological`:29.

> ⚠️ **Catatan GAP #3 (owner):** Admin tidak boleh remove invoice payment jika kamar sudah OCCUPIED. Kode belum punya guard ini. Detail di §15 GAP #3.

**Invarian:** Σ InvoicePayment ≤ total invoice; status invoice = f(Σpayment); line tidak berubah setelah ISSUE; meter reading monoton naik per room+utilityType.
**Fokus audit:** konsistensi `syncInvoiceStatus` vs perhitungan inline di approveSubmission; reversal saat remove payment yang membuat invoice turun dari PAID → PARTIAL (kamar sudah OCCUPIED — GAP #3).

---

#### 5. Flow Perpanjangan (Renew)

**File:** `modules/renew-requests/renew-requests.service.ts`, `modules/stays/stays.service.ts`

##### Aturan bisnis target (owner):
1. **H-10 sebelum kontrak jatuh tempo:** tenant menerima prompt perpanjang/tidak, dan tetap boleh mengajukan sendiri.
2. Tenant yang memilih YA memiliki prioritas eksklusif sampai hari-H tanpa wajib DP lebih dulu.
3. Jika memilih TIDAK, kamar dibuka untuk periode setelah tanggal checkout.
4. Jika hari-H belum ada DP, prioritas berakhir dan kamar dibuka publik.
5. DP 30% mengamankan renewal; pelunasan maksimal H+7 dari DP.
6. Gagal lunas H+7 → DP hangus, deposit dapat dipotong, dan forced checkout.
7. Harga tenant yang renew tanpa putus kontrak tidak naik.

##### Status implementasi kode saat ini:
- `renew-requests.service.ts:21` `createRequest` — tenant ajukan (PENDING).
- `:77` admin approve → `stays.renewStayInTransaction` stays.service.ts:997:
  - Stay harus ACTIVE; `assertNoOpenInvoicesTx`.
  - Tolak jika hari ini > plannedCheckOutDate → wajib rebooking :973-977.
  - Periode baru mulai dari `plannedCheckOutDate` lama (exclusive) :980.
  - Wajib input meter → invoice DRAFT (RENT + utilitas) → ISSUED.
- `:147` admin reject. `:182` tenant lihat milik sendiri.

> ⚠️ **GAP #2 (owner):** Flow target di atas belum diimplementasikan. Kode saat ini masih langsung memperpanjang stay saat request disetujui.

**Invarian:** renewal tidak boleh menumpuk tunggakan; periode kontinu tanpa gap/overlap.
**Fokus audit:** implementasi fase DP 30% renewal + grace period H+7 + kamar muncul di katalog publik + auto-cancel jika tidak lunas.

---

#### 6. Flow Checkout & Deposit

##### 6.1 Pengajuan checkout
`modules/checkout-requests/checkout-requests.service.ts` — create:47 (guard `assertNoOpenInvoices`:32) → approve:128 / reject:201 → notifikasi :294/:354/:392.

##### 6.2 Final checkout — `stays.service.ts:526` `complete`
1. Hanya aktor lifecycle (`assertCoreLifecycleActor`).
2. **Blokir jika masih ada invoice belum PAID/CANCELLED** :500-523.
3. Stay → COMPLETED :525. Jika tidak ada stay aktif lain → **Room → MAINTENANCE** :546 + auto-create ticket `CHECKOUT_INSPECTION` (dedupe per stay/room/kategori) :559-606.

##### 6.3 Settlement deposit — `stays.service.ts:812` `processDeposit`
- Hanya saat COMPLETED/CANCELLED & depositStatus HELD.
- Aksi: FULL_REFUND / PARTIAL / FORFEIT → depositStatus final; jurnal + ledger (**blocking**).

##### 6.4 Room readiness gate — `tickets.service.ts:530` `close`
Tiket CHECKOUT_INSPECTION di-close → cek tidak ada stay ACTIVE lain :622 → semua barang GOOD :630 → **Room MAINTENANCE → AVAILABLE** :637-647.

##### 6.5 Deposit ledger
`modules/deposit-ledger/deposit-ledger.service.ts` — recordDepositReceivedTx:158 (idempotent), recordDepositSettlementTx:197, summary:319, **reconciliationLite:351** (alat audit bawaan), backfillDryRun:420.

**Invarian:** kamar tidak pernah AVAILABLE tanpa inspeksi; deposit diproses tepat 1×; Σ ledger per stay = depositPaid − refund − deduction.
**Fokus audit:** deposit received best-effort tapi settlement blocking — ledger bisa pincang. Jalankan `reconciliationLite`.

---

#### 7. Flow Auto-Ops (jam biologis sistem)

**File:** `modules/auto-ops/auto-ops.service.ts` — 9 job sequential (V5.12.1), mutex `running`, `runAll`:88:

| # | Job | Lokasi | Aksi |
|---|---|---|---|
| 1 | **Booking expiry** | runBookingExpiry:136 → expireBookingTx | Booking lewat `expiresAt` tanpa submission PENDING/APPROVED → invoice CANCELLED (reversal blocking), submission EXPIRED, stay CANCELLED, room AVAILABLE. FOR UPDATE re-check. |
| 2 | **Contract end reminders** | runContractEndReminders | Notifikasi H-7/H-3/H-1/H-day ke tenant (target berikutnya menambah H-10). |
| 3 | **DownPayment forfeit** | runDownPaymentForfeit | Stay belum promoted, lewat checkIn +1 hari tanpa pelunasan → CANCELLED, DP hangus, jaminan tidak tersentuh. |
| 4 | **Overstay forced checkout** | runOverstayForcedCheckout | H+1 pk 12:00: stay → COMPLETED, kamar → MAINTENANCE + `allowBookingWhileCleaning=true`. Skip jika ada tagihan belum lunas. |
| 5 | **Post-checkout auto-cancel** | runPostCheckoutAutoCancel | Stay belum promoted dan lewat planned checkout → cancel melalui jalur bersama yang menjaga uang masuk. |
| 6 | **Noon release** | runRoomReleaseAtNoon | ≥ pk 12:00 WIB: kandidat booking berakhir diproses melalui jalur cancel bersama. |
| 7 | **Room healer** | runRoomHealer | Room RESERVED yatim dipulihkan dengan tetap menghormati tiket inspeksi terbuka. |
| 8 | **Overstay enforcement** | runOverstayEnforcement | Kamar OCCUPIED lewat kontrak → tiket `EVICT_OVERSTAY` untuk staf. |
| 9 | **Accounting auto-close** | runAccountingAutoClose | Tutup buku bulan lalu otomatis jika readiness aman. |

**Invarian:** job idempotent & aman dijalankan berulang; tidak pernah membatalkan stay yang sudah promoted/dibayar.
**Status verifikasi:** noon release sudah mengecek submission PENDING/APPROVED dan jalur cancel bersama melewati stay yang memiliki invoice PAID/PARTIAL. Klaim lama bahwa job #3 dapat membatalkan uang masuk sudah basi.

---

#### 8. Flow Tiket & Operasional Staf

##### 8.1 Tiket — `modules/tickets/tickets.service.ts`
- Buat: backoffice :265 (6+ kategori), portal :321 (komplain), otomatis (CHECKOUT_INSPECTION, EVICT_OVERSTAY, laporan barang).
- Siklus: assign:405 → start:437 (IN_PROGRESS) → markDone:493 (DONE) → close:530 (admin; gate kamar). Cancel dari kondisi diizinkan.

##### 8.2 Rutinitas staf — `modules/staff-routines/staff-routines.service.ts`
Template (admin CRUD :314-:385) → staf `getToday`:74 → start:147/complete:207 (guard satu-kerja-aktif `assertNoActiveWork`:48) → KPI :276, progress admin :385.

##### 8.3 Laporan lapangan — `modules/staff-field-reports/staff-field-reports.service.ts`
Staf lapor kondisi barang (create:73, foto) → admin reviewQueue:349 → adminReview:436 → validasi movement :563 + sinkron RoomItem :599 + auto-ticket :638.

##### 8.4 Kinerja & review
- `modules/staff-performance/staff-performance.service.ts` — agregat bulanan per staf :161 (KPI dari routine/ticket/field report events), audit kerja `createAudit`:117, saran audit :80, bukti :112.
- Review tenant→staf: `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts` — eligible:15, create:54 (rating; ≤2⭐ wajib komplain, ≥4⭐ pujian; anti-duplikat).

**Fokus audit:** parsing regex BARANG_PINDAH :603-619 (rapuh); penugasan otomatis ke staf id terkecil (beban tidak merata); guard role `markDone` vs `close`.

---

#### 9. Flow Inventaris & Barang Kamar (detail)

**File:** `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/`

##### 9.1 Master barang gudang — `inventory-items.service.ts`
- CRUD :146/:198 — create, read, update, delete barang.
- `ensureOpeningStockSyncedTx`:99 — sinkron stok awal.
- Update status dari lapangan :216 — auto-ticket bila rusak/hilang.

##### 9.2 Pergerakan stok — `inventory-movements.service.ts`
- `create`:43 — lock qty `lockInventoryQtyTx`:88, validasi kecukupan stok :132, sinkron RoomItem :156.
- `update`:72 — reverse lalu re-apply.
- Satu movement IN/OUT mempengaruhi qty gudang + RoomItem.

##### 9.3 Barang per kamar — `room-items.service.ts`
- Daftar per kamar :69, milik tenant :73.
- Update status :115 — auto-ticket bila rusak/hilang.
- `create` disabled :98 — hanya via movement, tidak langsung.

##### 9.4 Sinkronisasi & verifikasi
- `Verifikasi batch 5` (Audit Mega): double-apply qty TIDAK terjadi (trigger DB + sync self-healing). Tapi risiko kombinasi field-report → ticket-close tetap ada.
- `reconciliationLite` (deposit-ledger) juga mengecek qty.

**Invarian:** qty gudang = stok awal + Σ movement; RoomItem konsisten dengan movement IN/OUT per kamar; perubahan kondisi barang selalu meninggalkan jejak (ticket/field report).
**Fokus audit:** 3 jalur sinkron qty (movement, field report, ticket close) — skenario double-apply masih mungkin di edge case.

---

#### 10. Flow Keuangan Operasional (Expense, WiFi, Aset)

##### 10.1 Expense
- `modules/expenses/expenses.service.ts` CRUD :49-:72 → jurnal `postExpenseTx`.
- **Fokus audit:** delete expense — apakah jurnal ikut direversal? (M-33, FIX-14/15)

##### 10.2 WiFi Sales
- `modules/wifi-sales/wifi-sales.service.ts` CRUD :40-:59 → jurnal `postWifiSaleTx`.
- Tenant bisa order WiFi via portal.
- **Fokus audit:** delete wifi-sale — apakah jurnal ikut direversal?

##### 10.3 Aset Tetap
- `modules/assets/assets.service.ts` — CRUD :296/:337, readiness :48.
- **Ledger alignment:** preview:154 / post:159 → `postFixedAssetLedgerAlignmentTx`.
- **Depresiasi:** preview:377 / `runDepreciation`:384 → `AssetDepreciationRun` + `postDepreciationRunTx`.
- **Fokus audit:** depresiasi dobel-run pada bulan sama; aset terhubung roomItem/inventoryItem/expense (`validateRelations`:635) saat induk dihapus.

---

#### 11. Flow Akuntansi (Auto Journal Lite + Tutup Buku)

**File:** `modules/accounting/`

##### 11.1 Master & jurnal manual — `accounting.service.ts`
seedDefaultCoa:52 → COA CRUD :88-:139 → CashAccount :140-:213 → Periode :214-:312 → Opening balance draft/post/void :325-:526 → Jurnal manual draft :544 (guard periode OPEN :585).

##### 11.2 Auto Journal Lite — `accounting-posting.service.ts`
- Wrapper non-tx :69-:127 dan versi `*Tx` :263-:771 untuk: INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED/SETTLEMENT, FIXED_ASSET_ALIGNMENT :128, DEPRECIATION_RUN :204, reversal cancel invoice :689 / payment :741.
- Inti: `postBalancedJournalTx`:1110 — jurnal seimbang, idempotent per (sourceType, sourceId), skip VOID.
- Perbaikan data: `backfillAutoJournal`:905, `dryRunDepositBackfill`:773, `findUnmappedSourceIds`:988.

##### 11.3 Tutup buku — `accounting-period-close.service.ts`
readiness:75 → preview:80 → post:93 (manual) / autoCloseMonthly:122 → reopen:248. Readiness check: jurnal unmapped :580, depresiasi :604, alignment aset :615, trial balance :620.

##### 11.4 Kesiapan global — `accounting-readiness.service.ts:134` `getReadiness`.

**Invarian:** setiap jurnal seimbang; 1 sumber operasional = max 1 jurnal POSTED aktif; tidak ada posting ke CLOSED; reversal hanya untuk POSTED.
**Fokus audit:** kebijakan campuran blocking vs best-effort per sumber × pemanggil; auto-close menutup periode sementara jurnal best-effort gagal belum di-backfill.

---

#### 12. Flow Pelaporan & Dashboard Finance

##### 12.1 Laporan operasional — `modules/reports/reports.service.ts`
- monthly-income, overdue-aging, deposit-liability, expense-summary, cash-flow, profit-loss, financial-ratios, occupancy (controller :24-:80).

##### 12.2 Dashboard finansial — `modules/finance/finance.service.ts`
- `businessHealth`:40 — kesehatan bisnis multi-indikator.
- `occupancySummary`:179 — okupansi exclude RESERVED.
- `balanceSheetDraft`:234 — neraca saldo draft.
- `ownerDashboard`:280 — dashboard owner ringkas.
- Sejak V5.12.2 (E-4): saldo kas dari JURNAL (opening + Σ debit−kredit POSTED), bukan field manual.
- Sejak V5.12.2 (E-5): deposit liability = HELD di businessHealth & balanceSheetDraft.

##### 12.3 Perhitungan keuangan kunci
- **Balance Sheet:** Aset = Kewajiban + Ekuitas. Auto Journal Lite memastikan setiap jurnal seimbang.
- **P&L:** Pendapatan (RENT, UTILITY, PENALTY) − Beban (EXPENSE, DEPRECIATION). Trial balance terverifikasi seimbang di UAT.
- **Cashflow:** Saldo kas = opening + Σ(debit−kredit line POSTED) per CashAccount.
- **Rasio:** financial-ratios (likuiditas, profitabilitas, solvabilitas, efisiensi). Tersedia di `reports.service.ts`.

##### 12.4 Analisis ringkas — `modules/analytics/analytics.controller.ts`
- marketing, finance, operations, strategy summary.
- AI helper `modules/ai/ai.controller.ts`: business-narrative, payment-proof/analyze, reminders/personalize, classify-text.

**Fokus audit:** apakah angka reports (raw SQL) cocok dengan angka accounting (jurnal) untuk periode sama; akses role per endpoint laporan.

---

#### 13. Flow Analisis Strategis (AI & Manual)

##### 13.1 Data dasar untuk analisis
- **Keuangan:** Balance Sheet, P&L, Cashflow, Rasio dari §12.
- **Operasional:** Okupansi, turnover tenant, ticket/resolution time, KPI staf.
- **Pemasaran:** Harga kamar, tingkat booking, sumber booking (publik vs portal).
- **Inventaris:** Stok barang, kondisi barang per kamar, pergerakan stok.

##### 13.2 Metode analisis (manual, akuntabilitas tertinggi)
| Metode | Input | Output |
|---|---|---|
| **SWOT** | Data keuangan, operasional, pasar | Kekuatan, Kelemahan, Peluang, Ancaman |
| **PESTLE** | Faktor eksternal (politik, ekonomi, sosial, teknologi, hukum, lingkungan) | Risiko & peluang eksternal |
| **BCG Matrix** | Pendapatan per kamar/tier, market share relatif | Stars, Cash Cows, Question Marks, Dogs |
| **Porter's Generic** | Biaya, diferensiasi, fokus pasar | Strategi bersaing yang tepat |
| **7P Marketing** | Produk, harga, tempat, promosi, orang, proses, bukti fisik | Rencana marketing mix |

##### 13.3 AI sebagai konektor (Deepseek V4 Flash / V4-Pro)
- AI bukan sebagai pengganti, tapi **alat koneksi** antar semua indikator untuk memberikan flow dinamis.
- AI membaca semua data keuangan + operasional + strategis, lalu menghasilkan narrative bisnis dan rekomendasi.
- Contoh: AI melihat okupansi turun + pending booking tinggi + SWOT "Weakness: branding lemah" → rekomendasi 7P "Promosi: kolaborasi content creator."

##### 13.4 Status implementasi
- `modules/ai/ai.controller.ts` — endpoint AI dasar sudah ada (business-narrative, proof/analyze, reminders/personalize, classify-text).
- Integrasi Deepseek API perlu ditambahkan.
- Analisis manual (SWOT, PESTLE, BCG, Porter, 7P) saat ini belum ada endpoint khusus — tersedia via laporan keuangan + dashboard.

**Fokus audit:** pastikan AI hanya konektor, bukan penentu keputusan final; data keuangan harus akurat sebelum masuk ke analisis strategis.

---

#### 14. Flow Notifikasi, Pengumuman & PWA

##### 14.1 Notifikasi in-app
- `modules/notifications/app-notification.controller.ts` — list, read, read-all.
- `preview reminder` :17-:49; `mock send` :20.
- **Belum ada pengiriman email/WA nyata.**
- Notifikasi terkirim untuk payment, booking, checkout, overstay H-7/H-3/H-1/H-day, announcement, dan kompetitor menang. **Renew request/approve/reject belum memiliki notifikasi.**

##### 14.2 Pengumuman
- `modules/announcements/` — draft → publish :50 → tampil di portal tenant.

##### 14.3 PWA (lihat `docs/04_DEPLOY_AND_PWA.md`)
- Saat ini: **PWA MVP installable**, belum operasional yang kuat.
- 17 temuan audit: 3 CRITICAL (PWA-01 s.d 03: produksi tertinggal, HTTP tidak paksa HTTPS, frontend tanpa security headers), 6 HIGH, 7 MEDIUM, 1 PLANNED (push notification).
- **4 Phase perbaikan:** Phase 0 (Release Gate), Phase 1 (Cache Safety + Update + Offline UX), Phase 2 (Installability), Phase 3 (Web Push dengan outbox).
- **Aturan kunci:** Jangan cache API/auth/private data. Jangan mutation offline. Push via outbox, bukan side-effect transaksi.
- **Sedang dikerjakan AI lain** — `08_PWA` adalah dokumen aktif, bukan arsip.

---

#### 15. Gap Bisnis Real vs Kode — Temuan Audit Flow 2026-06-12

> **Sumber:** Wawancara owner 2026-06-12. Setelah dikonfirmasi, ditemukan 4 gap antara aturan bisnis asli vs implementasi kode.

##### 🔴 GAP #1 — Tidak Ada Pembayaran Partial

**Aturan owner:** *"Pembayaran harus sesuai dengan kontrak sehingga kita tidak menerima pembayaran Partial."*

**Fakta kode (`payment-submissions.service.ts:406-430`):** `approveSubmission` split nominal → `rentPortion` + `depositPortion`, invoice bisa PARTIAL, kamar tetap RESERVED.

**Dampak:** Kode izinkan skenario yang tidak dikehendaki — tenant bayar sebagian, admin approve, invoice PARTIAL.

**Perbaikan:** booking hanya menerima DP tepat atau pelunasan penuh tepat; submission invoice-only dan pembayaran manual admin wajib lunas penuh. Status `PARTIAL` tetap sah untuk DP tepat.

---

##### 🔴 GAP #2 — DP untuk Renewal: Fase Kamar Belum Aman

**Aturan owner:** DP 30% perpanjangan → kamar belum aman, bisa dipesan online sampai lunas (maks H+7). Staff bersihkan & usir jika tidak lunas.

**Fakta kode:** Renew approval langsung perpanjang stay. Tidak ada fase "kamar bisa dipesan online."

**Perbaikan:** prompt H-10; prioritas tenant lama sampai hari-H tanpa DP; DP mengamankan renewal; tanpa DP di hari-H kamar dibuka; pelunasan maksimal H+7 dari DP; harga renewal tetap.

---

##### 🟠 GAP #3 — Admin Tidak Boleh Hapus Payment Saat OCCUPIED

**Aturan owner:** *"Room yang masih di masa kontrak, tidak dapat dibatalkan sepihak oleh admin."*

**Fakta kode (`invoice-payments.service.ts:237` `remove`):** Tidak ada guard apakah room sudah OCCUPIED.

**Perbaikan:** Tambah guard: tolak `remove` jika stay sudah promoted (`initialMetersPromotedAt != NULL`) atau room.status == OCCUPIED.

---

##### 🟡 GAP #4 — Refund DP untuk yang Kalah First Paid Wins (Manual via Admin)

**Aturan owner:** Tenant yang sudah transfer tapi admin terlambat verifikasi → tenant lain menang → DP dikembalikan. **Notifikasi** ke tenant yang kalah, lalu **admin transfer manual** dan kirim bukti ke tenant.

**Fakta kode:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. PENDING_REVIEW tidak tersentuh.

**Perbaikan:** Notifikasi + manual refund oleh admin (bukan auto-refund). Admin transfer balik dan upload bukti transfer.

---

##### Ringkasan Gap

| # | Gap | Severitas | Dampak |
|---|---|---|---|
| 1 | Partial payment diizinkan | 🔴 KRITIS | Pembayaran tidak sesuai kontrak |
| 2 | Renewal DP belum ada fase aman | 🔴 KRITIS | Kamar bisa dipesan double |
| 3 | Admin bisa hapus payment saat OCCUPIED | 🟠 TINGGI | Inkonsistensi data occupancy |
| 4 | Belum ada notifikasi + proses refund untuk yang kalah | 🟡 MENENGAH | Komplain tenant, manual by admin |

---

#### 16. Frontend Surface Map (ringkas)

`frontend/src/App.tsx` — ±50 route. Folder: `pages/{public,auth,portal,staff,admin,owner→(dashboard,finance,reports),bookings,stays,invoices,payments,tickets,rooms,resources,staff-routines,renew-requests,notifications,reminders,settings,profile}`.
Surface utama: publik (`/`, `/rooms`, `/register`), portal tenant (`pages/portal/*`), staf (`pages/staff/*` + staff-routines), admin/owner (stays, invoices, payments review, renew, tickets, performance, finance, reports).
State: TanStack Query + Axios; auth JWT. Audit historis UI/UX ada di `archieve/_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md`.

---

#### 17. Usulan Urutan Audit Mendatang

| Pass | Lingkup | Alasan prioritas |
|---|---|---|
| A — Uang masuk | Flow 3 + 4 + 11.2 | Jalur rupiah utama; best-effort journal; file terbesar |
| B — Mesin waktu | Flow 7 (9 job) + interaksi 3/5/6 | Tanpa manusia; tumpang-tindih job #3 vs #8 |
| C — Deposit end-to-end | Flow 2 → 3.2 → 6.3 → 6.5 + reconciliationLite | Asimetri best-effort vs blocking |
| D — Tutup buku | Flow 11.3 + 10 + cross-check 12 | Integritas laporan keuangan |
| E — Akses & keamanan | Flow 0.1 + 1 + guard role | Verifikasi @Roles per endpoint |
| F — Operasional fisik | Flow 6.4 + 8 + 9 | Konsistensi qty 3-jalur; gate kamar |
| G — Fresh deploy | Seed fondasi + reconciliation baseline | Data UAT tidak dimigrasikan sesuai D-06 |
| H — Strategis & AI | Flow 13 | Analisis manual + AI connector |
| I — PWA | Flow 14 + `08_PWA_AUDIT` | Sedang dikerjakan AI lain |


## Bagian 2 - `docs/06_CONTRACTS.md`

### KOST48 V5 — Contracts & Business Rules
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. **Sumber historis:** `archieve/01_CONTRACTS.md` (2,489 baris, V5.9.8-A). File ini adalah distilled contracts yang hanya memuat **aturan bisnis yang masih berlaku**. Detail per domain ada di dossier `10`-`19`.

<!-- KOST48_DOCS_SYNC_20260613_CONTRACTS_CONSOLIDATED -->

#### 1. Role & Authorization Matrix

##### Role Hierarchy
```text
OWNER > ADMIN > STAFF > TENANT
Matrix eksplisit di bawah mengalahkan asumsi cascade, terutama untuk area OWNER-only.
```

##### Permission Matrix per Domain
Matrix ini memuat kontrak target keputusan owner. Area bertanda OWNER-only belum semuanya dipaksa oleh kode sampai F2-16 selesai.

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
| **Deposit Settlement** — execute | ✅ | ❌ | ❌ | ❌ |
| **Accounting Journals** — view | ✅ | ✅ | ❌ | ❌ |
| **Accounting Period / manual journal mutation** | ✅ | ❌ | ❌ | ❌ |
| **Finance Reports** | ✅ | ✅ | ❌ | ❌ |
| **Expenses** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Room settings & pricing** — mutate | ✅ | ❌ | ❌ | ❌ |
| **Public Endpoints** | Public | Public | Public | Public |
| **Announcements** — create/manage | ✅ | ✅ | ❌ | ❌ |
| **Announcements** — view | ✅ | ✅ | ✅ | ✅ |

---

#### 2. Booking & Stay Lifecycle Contracts

##### 2.1 Booking Mandiri (Tenant Self-Booking)
- **Tidak ada model Booking.** `Stay` mewakili seluruh siklus.
- Booking = Stay `ACTIVE` + Room `RESERVED` + belum promoted.
- Huni = promoted (`initialMetersPromotedAt` terisi) + Room `OCCUPIED`.
- **DP ≠ Deposit**: DP 30% sewa (hangus bila gagal lunas, jurnal `DP_FORFEIT`). Deposit jaminan refundable.
- **First paid wins**: multi-booking RESERVED pada 1 kamar diizinkan sampai ada yang bayar.
- `expiresAt` adalah batas pembayaran awal/DP. Setelah DP disetujui, expiry awal dimatikan; sisa pelunasan mengikuti deadline check-in/H+1.
- Public booking: honeypot field `website` harus selalu kosong (anti-bot, tolak request jika terisi).

##### 2.2 Admin Approval
- Booking RESERVED muncul di antrean admin.
- Approval membuat invoice (initial invoice).
- DP 30% yang disetujui mengunci kamar dan membatalkan pesaing yang belum membayar.
- Setelah sisa sewa + deposit jaminan lunas → Room OCCUPIED dan meter dipromosikan.

##### 2.3 Manual Check-in
- Check-in manual membuat Stay ACTIVE + Room OCCUPIED langsung.
- Initial invoice disimpan dengan `totalAmountRupiah` konsisten dengan invoice lines.
- Ledger jaminan + jurnal otomatis dibuat.

##### 2.4 Stay Completion / Cancel
- `StaysService.complete()`: final checkout → stay selesai.
- `StaysService.cancel()`: stay batal (dengan reversal jika perlu).
- **HIGH-RISK:** Do not move/patch casually (lihat `.clinerules`).

---

#### 3. Payment & Invoice Contracts

##### 3.1 Payment Submission
- Tenant upload bukti bayar → `PENDING_REVIEW` → admin review → `APPROVED` / `REJECTED`.
- Nominal booking yang sah hanya DP 30% tepat atau pelunasan penuh tepat. Invoice-only wajib lunas penuh.
- Approval DP dapat membuat status teknis invoice `PARTIAL`; ini bukan izin cicilan nominal bebas.
- Approval pelunasan mengubah invoice menjadi `PAID`.
- Payment submission approval harus lock rows untuk safe decision (room, stay, invoice, payment submission).
- **HIGH-RISK:** `PaymentSubmissionsService.approveSubmission()` — do not move/patch casually.

##### 3.2 Invoice
- Invoice types: `ISSUED`, `PAID`, `PARTIAL`, `CANCELLED`, `DRAFT`.
- Open invoice = status NOT `PAID` AND NOT `CANCELLED`. `DRAFT` juga blocking.
- Invoice `DRAFT` may be cancelled without reversal.
- Invoice `ISSUED`/`PARTIAL` with journal entries requires controlled cancellation/reversal.
- Renewal invoice mencakup sewa + meter (listrik, air).
- Line invoice `PENALTY` hanya untuk potongan manual (tanpa denda keterlambatan otomatis — keputusan owner D1).

##### 3.3 Pembayaran Invoice
- Pembayaran manual admin untuk invoice non-booking juga wajib lunas penuh; nominal parsial bebas tidak sah.
- Pelunasan paling lambat saat check-in.
- Gagal lunas H+1 pk 12:00 → DP hangus, stay batal.
- Rp0 / problem invoices harus diframe sebagai `perlu dicek admin`, bukan push payment action.

---

#### 4. Checkout Contracts

##### 4.1 Checkout Request
- Tenant ajukan checkout ≤ `plannedCheckOutDate` (tidak bisa extend via checkout; gunakan renew).
- Admin approve/reject checkout request — **approve bukan final checkout**.
- Approve checkout request → sinkronisasi `plannedCheckOutDate` ke approved date.
- **HIGH-RISK:** Checkout final — do not move/patch casually.

##### 4.2 Final Checkout
- Final checkout date harus dinormalisasi sebagai Jakarta business date.
- Harus menggunakan conditional update pada stay ACTIVE (anti double-click/race).
- Checkout normal diblokir semua open invoice, termasuk DRAFT.
- Forced checkout merupakan pengecualian target D-03: DRAFT di-auto-cancel dan tidak memblokir; invoice ISSUED/PARTIAL tetap memblokir keputusan otomatis.
- Setelah final checkout:
  - Room → `MAINTENANCE` / `Perlu dicek` (readiness gate)
  - Tiket `CHECKOUT_INSPECTION` dibuat (dedupe per stay/room/category)
  - Deposit settlement (jika ada deposit)
  - Final utility charge (jika ada)
- **Room readiness gate:** kamar tidak pernah `AVAILABLE` tanpa tiket `CHECKOUT_INSPECTION` ditutup.

##### 4.3 Room Readiness Gate Detail
- Checklist inspeksi staf: kebersihan, kunci, barang tertinggal, inventaris, kerusakan, foto kondisi akhir.
- Staff UI must NOT use developer/internal permission copy (lifecycle, official movement, final checkout, approval finance, computed by system).
- Public display: `MAINTENANCE` → `Sedang dicek`, `canBook=false`.
- Public CTA for maintenance rooms: `Tanya Ketersediaan`, not `Ajukan Booking`.
- `allowBookingWhileCleaning=true` — kotor tapi bisa dipesan; huni menunggu tiket pembersihan ditutup.

---

#### 5. Renew Contracts

##### 5.1 Renew Request
- **Kode saat ini:** tenant ajukan → admin approve → stay langsung diperpanjang.
- **Kontrak target mengikat:** tenant lama mendapat prioritas eksklusif sampai hari-H tanpa DP; prompt H-10; DP 30% mengamankan renewal; pelunasan maksimal H+7 dari DP.
- Jika hari-H belum ada DP, prioritas berakhir dan kamar dibuka publik. Jika H+7 setelah DP belum lunas, DP hangus dan forced checkout berlaku.
- Rent-loyalty: harga renewal tidak naik selama kontrak tidak putus.
- Renew invoice mencakup sewa + meter dengan periode menyambung tanpa gap/overlap.
- **HIGH-RISK:** `StaysService.renewStay()` — do not move/patch casually.

---

#### 6. Deposit Contracts

##### 6.1 Deposit Jaminan
- Deposit adalah **dana titipan / liability**, BUKAN revenue/omzet/profit.
- Diisi saat booking LUNAS atau check-in manual (nominal dari `Room.defaultDepositRupiah`).
- Dicek saat checkout.

##### 6.2 Deposit Settlement
- Tipe settlement: `FULL_REFUND`, `PARTIAL`, `FORFEIT`.
- Harus dalam transaksi.
- Conditional update dari `HELD` (anti double processing).
- Dilarang untuk zero deposit.
- `FORFEIT` tidak diizinkan untuk zero-deposit cases.
- Partial deduction dan forfeit memerlukan meaningful notes.
- Jurnal `JE-AUTO-DEPOSIT-SETTLEMENT` diposting.
- **HIGH-RISK:** Deposit settlement — do not move/patch casually.

---

#### 7. Inventory Contracts

##### 7.1 Official Stock Truth
- `InventoryMovement` + synced `InventoryItem.qtyOnHand` + `RoomItem` = source of truth.
- Staff **dilarang** membuat official `InventoryMovement` (403).
- Direct `qtyOnHand` edit dilarang; gunakan Mutasi Stok.

##### 7.2 Movement Types
- `IN`: barang masuk gudang (opening stock, restock).
- `OUT`: barang keluar gudang.
- `ASSIGN_TO_ROOM`: pasang ke kamar, kurangi qtyOnHand, buat RoomItem.
- `RETURN_FROM_ROOM`: kembali dari kamar, validasi stock room, kurangi RoomItem, tambah qtyOnHand.
- `PATCH` existing movement diblokir; koreksi pakai movement baru.
- Staff reports physical issues / restock needs via tiket/laporan, NOT official mutation.

##### 7.3 Item Condition Tracking
- RoomItem condition: `GOOD` → `Baik`, `DAMAGED` → `Rusak`, `MISSING` → `Hilang`, `NEEDS_REPAIR` → `Perlu dicek`.
- Stock health dihitung: `habis` / `menipis` / `aman` dari `qtyOnHand` vs `minQty`, bukan dipilih manual.

##### 7.4 Room Item Report (Staff)
- Staff field report → buat tiket (tidak auto-create official movement).
- Admin review staff report → `APPROVE` / `REJECT`.

---

#### 8. Ticket Contracts

##### 8.1 Ticket Lifecycle
- `OPEN` → `IN_PROGRESS` → `DONE` → `CLOSED`; `CANCELLED` tersedia dari kondisi yang diizinkan.
- Kategori: `CHECKOUT_INSPECTION`, `EVICT_OVERSTAY`, `BARANG_PINDAH`, `AUDIT_INVENTARIS`, `PEMERIKSAAN`, dll.
- Auto-created tickets: `CHECKOUT_INSPECTION` (setelah final checkout), `EVICT_OVERSTAY` (H-day overstay).

##### 8.2 Staff Ticket Rules
- Staff dapat close ticket `CHECKOUT_INSPECTION` (guard keselamatan tetap).
- Close safe inspection → room `MAINTENANCE` → `AVAILABLE`.
- Room tidak bisa AVAILABLE jika: ada active stay lain, room tidak MAINTENANCE, kondisi tidak aman.

---

#### 9. Notification Contracts

##### 9.1 Notification Types
- **Hanya in-app** (keputusan owner D2, 2026-06-11).
- Rencana jangka panjang: PWA push notification.
- **Belum ada email/WA nyata** (hanya preview/generate).

##### 9.2 Trigger Events
- Tenant: booking approve, payment accept/reject, checkout approve, invoice terbit, denda, reminder kontrak.
- Admin: booking baru, payment submission, pengajuan checkout, pengajuan renew.

---

#### 10. Accounting & Finance Contracts

##### 10.1 Auto Journal Lite
- Jurnal otomatis idempotent per `(sourceType, sourceId)`.
- Auto-close bulanan ter-gate readiness (unmapped-operational menghitung penuh).
- Reversal cancel invoice kini blocking di semua jalur.

##### 10.2 COA
- **38 akun** (dikoreksi dari klaim V1 17/17).

##### 10.3 Finance Reports
- Balance Sheet, P&L, Cashflow, Piutang Aging, Deposit Liability.
- Deposit must remain dana titipan/liability.
- Finance readiness smoke surfaces: accounting readiness, asset readiness, invoices, payment review, deposit ledger summary, reconciliation-lite.

##### 10.4 Deposit Ledger
- `GET /api/deposit-ledger/summary`
- `GET /api/deposit-ledger/reconciliation-lite` — `ready=true`, `mismatchCount=0`.

---

#### 11. Overstay & Auto-Ops Contracts

##### 11.1 Overstay Lifecycle
- Kode saat ini mengirim H-7, H-3, H-1, H-day. Target keputusan owner menambah H-10.
- H-day pk 12:00: kamar dibuka publik + tiket `EVICT_OVERSTAY`.
- H+1 pk 12:00: forced checkout otomatis.
- Kamar → `MAINTENANCE` + `allowBookingWhileCleaning=true`.
- **Pengecualian:** tagihan belum lunas → tidak auto-checkout, admin dapat alert.

##### 11.2 Auto-Ops Jobs (9 sequential)
1. `bookingExpiry`
2. `contractEndReminders`
3. `downPaymentForfeit`
4. `overstayForcedCheckout`
5. `postCheckoutAutoCancel`
6. `roomReleaseAtNoon`
7. `roomHealer`
8. `overstayEnforcement`
9. `accountingAutoClose`

---

#### 12. UI/UX Contracts

##### 12.1 Language Rules
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

##### 12.2 UI Behavior
- Compact mode: hindari oversized cards, excessive hero blocks, repeated copy.
- Satu destinasi = tidak boleh duplikasi CTA di section yang sama.
- Row clickable = tidak perlu tombol `Detail/Lihat` redundan.
- Tabel/list default 10 baris per halaman.
- Filter harus visually lighter dari primary actions.
- Filter reset pagination ke page 1.
- Tidak ada global search di header kecuali page-specific search diperlukan.

##### 12.3 Empty State & No-Op Rules
- No-op buttons, decorative CTAs, misleading `lihat antrean` dilarang.
- Empty states harus sesuai section, tidak boleh klaim "no work" jika masih ada queue/table di bawahnya.
- Jika elemen terlihat seperti primary button, harus melakukan real action.

---

#### 13. Safety Belts

##### 13.1 Booking Safety
- Rate limit public booking.
- Honeypot `website` field anti-bot.
- First-paid-wins gate.

##### 13.2 Payment Safety
- Lock rows during payment approval (payment submission, room, stay, invoice).
- Anti double-processing pada deposit settlement (conditional HELD).
- Invoice open blocking untuk checkout normal; forced checkout mengikuti pengecualian D-03.

##### 13.3 Inventory Safety
- Staff 403 untuk official movement.
- RETURN_FROM_ROOM: validasi cukup stock di RoomItem, block return > room stock (409).
- Short movement note → 400.
- Direct qtyOnHand edit dilarang.

##### 13.4 Room Readiness Safety
- Room tidak AVAILABLE tanpa CHECKOUT_INSPECTION ditutup.
- Ada active stay lain → tidak AVAILABLE.
- Kondisi tidak aman → tidak AVAILABLE.

##### 13.5 Concurrency
- Final checkout: conditional update pada stay ACTIVE.
- Deposit settlement: conditional update dari HELD.

---

#### 14. Deploy & Environment Rules

- **DEPLOY = FRESH** (keputusan V3/D-06): drop DB → seed COA → opening balance, BUKAN migrasi.
- Backfill data lama TIDAK berlaku.
- Generated Prisma files adalah build artifacts, harus di-restore sebelum commit.
- No production DB mutation.
- No schema change tanpa explicit approval.
- Runbook: `docs/04_DEPLOY_AND_PWA.md`.

---

#### 15. Known Gaps & Deferred Features

| Gap | Status | Rencana |
|-----|--------|---------|
| No service-to-service HTTP | Deferred | V5.7+ architecture extraction |
| No separate database per app | Deferred | Shared DB tetap di V5 Phase 0/1 |
| No refresh token | Deferred | 24 jam JWT |
| No email/WA delivery | Deferred | PWA push planned |
| No damage/penalty model | Deferred | B5 future batch |
| Deposit ledger | Active | Reconciliation tersedia; source-id edge case masih perlu hardening |
| Fixed asset/depreciation | Active manual | Otomasi depresiasi bulanan masih future |
| No round-robin ticket assignment | Deferred | 1 staf, ditunda |
| No WIB timezone handling | Deferred | F2-14 |
| Baseline finance tests belum ada | Fase 1 | F1-T, zero-dependency `node --test` |

---

#### 16. HIGH-RISK FLOWS — DO NOT MOVE / DO NOT PATCH CASUALLY

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

#### 17. PowerShell Verification Commands (Quick Reference)

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
