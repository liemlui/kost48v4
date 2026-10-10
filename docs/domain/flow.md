# Flow Map Kost48

Tanggal: 2026-09-22
Status: aktif
Tujuan: peta alur kode krusial (dari M03 Bagian 1)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [flow & kontrak](flow.md) · [domain/kontrak.md](kontrak.md)

> Migrasi dari docs/M03_FLOW_KONTRAK.md L61–550 pada aeedaf99
> (DOC-GOV-20260922 Tahap 3 S2.a).

## Bagian 1 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/02_FLOW_MAP.md`

### KOST48 V5 — Flow Map (Peta Alur Kode Krusial)
**Versi:** 2026-06-13 — sinkronisasi keputusan owner, status kode, dossier `10`-`19`, dan urutan Auto-Ops aktual.
**Tujuan:** Peta NARASI alur lintas-domain (apa memanggil apa, transisi status, side-effect, invarian).
> ⚠️ **ANCHOR BARIS:** angka `file:baris` di dokumen ini = posisi METODE pada snapshot audit **2026-06-13** — **INDIKATIF** (pasti bergeser sejak commit tersebut). **Sumber historis:** `docs/arsip/legacy/2026-06-16_root_docs_pre_M/_PETA_AI.md §2` + dossier `10`-`19`. Bila ragu, **grep nama metode di `backend/src/`**, jangan andalkan baris; pakai `docs/PETA-KODE.md` untuk navigasi modul terkini.

<!-- KOST48_DOCS_SYNC_20260630_FLOW_MAP_REVIEWED -->

#### Cara pakai saat audit
- Kolom **Rantai kode** = urutan eksekusi nyata, klik/lompat per `file:baris`.
- **Cross-ref gap bisnis** = lihat §15 untuk gap yang BELUM diperbaiki di kode.
- **Invarian** = aturan yang TIDAK BOLEH dilanggar; setiap audit pass wajib mencari jalur yang bisa melanggarnya.
- **Fokus audit** = pertanyaan terbuka/titik rawan yang ditemukan saat pemetaan.

---

#### 0. Arsitektur Global

##### 0.1 Request pipeline (backend)
- Entry: `backend/src/main.ts`
  - `ValidationPipe({ whitelist, transform, forbidNonWhitelisted, disableErrorMessages di production })` — `main.ts` `bootstrap()`
  - CORS dari `CORS_ORIGIN` env (production wajib diisi) — `main.ts` `bootstrap()` (blok `enableCors`)
  - `trust proxy = 1` + security headers manual (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP) — `main.ts` `bootstrap()` (middleware security headers + `set('trust proxy', 1)`)
  - ⚠️ **TANPA Helmet** (keputusan sadar), **RATE-LIMIT SUDAH ADA** sejak V5.12.2: `common/middleware/rate-limit.middleware.ts` — global 300/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`), auth 10/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`). In-memory, per-proses; multi-instance perlu store bersama.
  - Static `/uploads` dihapus; bukti bayar hanya via endpoint terproteksi `GET /api/payment-submissions/proofs/:filename`
  - Swagger hanya non-production — `main.ts` `bootstrap()` (`if (!isProduction)` + `SwaggerModule.setup`)
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

Constraint DB penunjang (secara historis berada dalam `backend/sql/bootstrap-production-schema.sql`; sumber saat ini `backend/sql/seed.sql` juga membawa data historis/PII):
- `stay_one_active_per_tenant_uidx` — 1 stay ACTIVE per tenant (termasuk fase booking).
- `stay_one_active_per_room_uidx` — 1 stay ACTIVE per room **hanya jika sudah promoted** → multi-booking RESERVED pada 1 kamar DIIZINKAN (first paid wins).
- `stay_deposit_payment_amount_chk` — depositPaid ≤ depositAmount.

> Untuk produksi, constraint/trigger ini harus diekstrak menjadi bootstrap guard khusus dan diuji pada DB kosong. Jangan menjalankan `backend/sql/seed.sql` untuk memperoleh constraint tersebut. Rujukan otoritatif: `DEPLOYMENT_ONLINE_20260723.md`.

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
| Login (email/phone + password) | `auth.service.ts` `login` → `findUserForLogin` → bcrypt compare → JWT |
| Profil sendiri | `auth.service.ts` `me` |
| Lupa password | `auth.service.ts` `forgotPassword` → token CSPRNG → `PasswordResetToken` → `sendResetEmail` |
| Reset password | `auth.service.ts` `resetPassword` (transaksi di dalamnya) |
| Ganti password | `auth.service.ts` `changePassword` |

Manajemen identitas:
- Users CRUD (OWNER/ADMIN only): `modules/users/users.controller.ts` — `findAll` / `findOne` / `create` / `update`
- Tenants CRUD + akses portal: `modules/tenants/tenants.controller.ts` — buat akun portal `createPortalAccess`, suspend `togglePortalAccess`, reset password `resetPortalPassword`
- Profil tenant self-service: `modules/tenants/tenant-profile.controller.ts` — `getMyProfile` (GET profile), `onboardingFill` (PATCH onboarding)

**Invarian:** token reset sekali pakai & berbatas waktu; tenant hanya bisa baca data dirinya; tidak ada refresh token (expiry 24 jam). Suspend user MEMUTUS sesi seketika (jwt.strategy validasi DB per request + klaim pwdAt).
**Fokus audit:** enumerasi akun via respons forgot-password; kekuatan JWT secret & klaim; sesi setelah suspend portal-access. (Rate-limit auth sudah ada — lihat §0.1)

---

#### 2. Flow Publik → Booking

##### 2.1 Katalog publik
- `modules/marketing/marketing-public-rooms.controller.ts` — `findAll` (daftar) / `findOne` (detail) → `marketing-public-rooms.service.ts` `getPublicRooms` / `getPublicRoomDetail`. MAINTENANCE normal tidak dapat dipesan; MAINTENANCE dengan `allowBookingWhileCleaning=true` dapat dipesan tetapi belum dapat dihuni.
- FAQ publik: `modules/faqs/faqs.controller.ts` (6 endpoint).

##### 2.2 Booking publik (tanpa login)
- `modules/tenant-bookings/public-bookings.controller.ts` `create` POST → `public-bookings.service.ts` `createPublicBooking` (buat Tenant+User+Stay sekaligus).

##### 2.3 Booking via portal tenant
`modules/tenant-bookings/tenant-bookings.service.ts` `createBooking`:
1. Guard schema-ready `validateBookingPreconditions` (`isBookingSchemaReady`); tenant aktif di helper yang sama.
2. Transaksi: `SELECT … FOR UPDATE` Tenant → tolak jika sudah punya stay ACTIVE.
3. Lock Room `FOR UPDATE`; kamar harus `isActive` dan status bookable (`AVAILABLE`, atau `MAINTENANCE` dengan `allowBookingWhileCleaning`).
4. Tolak jika ada stay promoted/occupied di kamar itu (kueri `existingPaidOrOccupiedStay`).
5. Harga = snapshot tarif room per `pricingTerm` via `resolveRent`; **DP = 30% × sewa** (`downPaymentAmountRupiah`).
6. `expiresAt = calculateBookingExpiry(checkInDate)` — helper memakai deadline flat 3 jam dari waktu pembuatan (`AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`).
7. Room status dibiarkan apa adanya (baru RESERVED saat DP/pelunasan disetujui); INSERT Stay (raw SQL); AuditLog `CREATE_BOOKING`.

##### 2.4 Keputusan admin
- Approve: `tenant-bookings.service.ts` `approveBooking` → terbit invoice booking.
- Reject: `rejectBooking` (tulis `Stay.cancelReason`); Cancel oleh tenant: `cancelPendingBooking`.
- Daftar booking tenant: `findMine`; notifikasi approved/rejected (best-effort).

**Invarian:** booking belum bayar tidak mengunci kamar; DP pertama yang disetujui mengunci kamar; DP 30% mengikuti pricingTerm; booking expired tidak boleh di-approve.
**Fokus audit:** race multi-booking saat 2 pembayaran disetujui hampir bersamaan; konsistensi `isBookingSchemaDriftError` yang menelan error: jalur publik vs portal — apakah validasi & DP identik? (Lihat GAP #1 dan #4 di §15)

---

#### 3. Flow Pembayaran (JANTUNG SISTEM)

**File inti:** `modules/payment-submissions/payment-submissions.service.ts` (1.564 baris — terbesar).

##### 3.1 Tenant upload bukti
`createSubmission` → `findEligibleSubmissionTarget` → PaymentSubmission PENDING_REVIEW. File bukti via endpoint terproteksi (`doesTenantOwnProof`).

##### 3.2 Approve oleh admin — `payment-submissions.service.ts` `approveSubmission`
1. Lock submission `FOR UPDATE` (`lockSubmissionTx`); harus PENDING_REVIEW; stay ACTIVE. (Sub-baris langkah indikatif; anchor split/OCCUPIED/meter lihat dossier 10.)
2. `isBookingPath = room.status == RESERVED` lewat `submission.stayPromotedAt == null`; expired tidak bisa di-approve.
3. Hitung ulang paid amount (`freshPaidAmount`); split nominal → `rentPortion` + `depositPortion` (via `computePaymentAllocation`).
4. Buat `InvoicePayment` (hanya porsi sewa); status invoice → PAID/PARTIAL/ISSUED via `computeNextInvoiceState`.
5. Auto Journal Lite (best-effort) — `postInvoiceIssuedTx` + `postInvoicePaymentTx`.
6. Submission → APPROVED (`status: APPROVED`).
7. **Jalur booking** (`if (isBookingPath)`):
   - Update DP terbayar (`nextDepositState` → `stay.update`). Deposit ledger (best-effort) `recordDepositReceivedTx`.
   - **Jika invoice PAID:** Room di-set `RESERVED` (OCCUPIED baru saat check-in); auto `plannedCheckOutDate` via `calculatePeriodEnd`; promosi meter TIDAK di sini — dipindah ke check-in (`stays.service.ts` `create`).
   - `cancelCompetingUnpaidBookingsTx` (`payment-submissions.service.ts`).
8. Notifikasi tenant `notifyPaymentApproved` / `notifyLosingTenants`.

> ⚠️ **Catatan GAP #1 (owner):** Status teknis `PARTIAL` tetap diperlukan untuk DP 30% yang sah. Gap-nya adalah approval belum memvalidasi ulang dua nominal yang diizinkan: DP tepat atau pelunasan penuh tepat. Invoice-only wajib lunas penuh. **Status 2026-10-10:** validasi ulang itu **sudah ada** di `approveSubmission` (`F1-1R (D-02): NO-PARTIAL`) — lihat §15.

##### 3.3 Jalur lain
- Reject: `rejectSubmission`. Expire manual: `expireBooking`. Sweep expiry: `runExpiryCheck` → `autoCancelRejectedExpiredBookingTx`.
- **Refund DP kalah first-paid-wins:** `cancelCompetingUnpaidBookingsTx` hanya batalkan yang belum bayar. Untuk PENDING_REVIEW: admin refund manual + kirim bukti ke tenant. Lihat GAP #4 di §15.

**Invarian:** total pembayaran ≤ invoice + sisa DP; promosi meter & OCCUPIED hanya saat invoice PAID; hanya satu pemenang per kamar.
**Fokus audit:** semua blok best-effort (jurnal, ledger) → sumber selisih accounting; idempotensi retry approve; partial payment pada booking path (lihat GAP #1).

---

#### 4. Flow Invoice & Pembayaran Manual

**File:** `modules/invoices/invoices.service.ts`, `modules/invoice-payments/invoice-payments.service.ts`, `modules/meter-readings/meter-readings.service.ts`

- Invoice CRUD: `create`, `createWithLinesAndIssue`, line `addLine`/`updateLine`/`removeLine` (guard: invoice wajib masih DRAFT), `recalculateInvoiceTotal`.
- Issue: `invoices.service.ts` `issue` → jurnal `postInvoiceIssued`.
- Cancel: `cancel` → pre-check jurnal POSTED, lalu reversal.
- Pembayaran manual (admin): `invoice-payments.service.ts` `create` (FOR UPDATE, anti-overpayment) → `syncInvoiceStatus`; `update` / `remove` (remove berjurnal kini diblokir A8, dan guard `assertStayNotOccupiedForPaymentMutationTx`).
- Meter reading: `meter-readings.service.ts` `create` / `update`, guard kronologis `assertReadingIsChronological`.

> ⚠️ **Catatan GAP #3 (owner):** Admin tidak boleh remove invoice payment jika kamar sudah OCCUPIED. Dulu (2026-06-12) kode belum punya guard ini; **status 2026-10-10 guard sudah ada** (`assertStayNotOccupiedForPaymentMutationTx`). Detail di §15 GAP #3.

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

##### Status implementasi kode saat ini (F2-1 selesai):
- Tenant memilih YA/TIDAK melalui state `PENDING_DECISION` → `AWAITING_DP` atau `REJECTED_BY_TENANT`; tenant lama memiliki prioritas sampai hari-H.
- DP renewal 30% yang diverifikasi admin mengubah request menjadi `DP_SECURED` dan menetapkan batas pelunasan H+7 dari waktu DP diterima.
- Setelah pelunasan penuh, service menerbitkan/mengecek settlement lalu menyelesaikan renewal menjadi `COMPLETED`; periode tetap kontinu dan rent-lock berlaku.
- AutoOps menandai `AWAITING_DP` lewat hari-H sebagai `EXPIRED_PRIORITY`, serta `DP_SECURED` yang gagal lunas H+7 sebagai `FORFEITED`. Forced checkout/settlement deposit tetap diproses melalui flow admin yang terkontrol.

> ✅ **GAP #2 ditutup:** approval renewal tidak lagi langsung memperpanjang stay. Jalur lama `APPROVED` dipertahankan hanya untuk kompatibilitas data/flow lama yang valid.

**Invarian:** renewal tidak boleh menumpuk tunggakan; periode kontinu tanpa gap/overlap.
**Fokus audit:** implementasi fase DP 30% renewal + grace period H+7 + kamar muncul di katalog publik + auto-cancel jika tidak lunas.

---

#### 6. Flow Checkout & Deposit

##### 6.1 Pengajuan checkout
`modules/checkout-requests/checkout-requests.service.ts` — `createRequest` (guard `assertNoOpenInvoices`) → `approveRequest` / `rejectRequest` → notifikasi `notifyOwnerAdminOnCreate` / `notifyTenantOnApprove` / `notifyTenantOnReject`.

##### 6.2 Final checkout — `stays.service.ts` `complete`
1. Hanya aktor lifecycle (`assertCoreLifecycleActor`).
2. **Blokir jika masih ada invoice belum PAID/CANCELLED** (`blockingInvoices`, tagihan meter dikecualikan).
3. Stay → COMPLETED (`stay.updateMany`). Jika tidak ada stay aktif lain → **Room → MAINTENANCE** (`if (otherActive === 0)`) + auto-create ticket `CHECKOUT_INSPECTION` (dedupe lewat `existingInspectionTicket`).

##### 6.3 Settlement deposit — `stays.service.ts` `processDeposit`
- Hanya saat COMPLETED/CANCELLED & depositStatus HELD.
- Aksi: FULL_REFUND / PARTIAL / FORFEIT → depositStatus final; jurnal + ledger (**blocking**).

##### 6.4 Room readiness gate — `tickets.service.ts` `close`
Tiket CHECKOUT_INSPECTION di-close → cek tidak ada stay promoted lain (`otherPromotedStays`) → status item akhir harus GOOD (`hasProblemFinalStatus`) → **Room MAINTENANCE → AVAILABLE** (`room.updateMany` di blok room-ready).

##### 6.5 Deposit ledger
`modules/deposit-ledger/deposit-ledger.service.ts` — `recordDepositReceivedTx` (idempotent), `recordDepositSettlementTx`, `summary`, **`reconciliationLite`** (alat audit bawaan), `backfillDryRun`.

**Invarian:** kamar tidak pernah AVAILABLE tanpa inspeksi; deposit diproses tepat 1×; Σ ledger per stay = depositPaid − refund − deduction.
**Fokus audit:** deposit received best-effort tapi settlement blocking — ledger bisa pincang. Jalankan `reconciliationLite`.

---

#### 7. Flow Auto-Ops (jam biologis sistem)

**File:** `modules/auto-ops/auto-ops.service.ts` — 6 sweep service, mutex advisory lock `pg_try_advisory_lock(1)`, `runAll()` sequential:

| Sweep | Operasi | Aksi |
|---|---|---|
| **BookingSweep** | `runBookingExpiry` | Booking lewat `expiresAt` tanpa submission PENDING/APPROVED → invoice CANCELLED, stay CANCELLED, room AVAILABLE. |
| | `runDownPaymentForfeit` | Stay belum promoted, lewat checkIn +1 hari tanpa pelunasan → CANCELLED, DP hangus. |
| **StaySweep** | `runOverstayForcedCheckout` | H+1 pk 12:00: stay → COMPLETED, kamar → MAINTENANCE + `allowBookingWhileCleaning=true`. |
| | `runPostCheckoutAutoCancel` | Stay belum promoted lewat planned checkout → cancel. |
| | `runRoomReleaseAtNoon` | ≥ pk 12:00 WIB: kandidat booking berakhir diproses. |
| | `runRoomHealer` | Room RESERVED yatim dipulihkan. |
| | `runOverstayEnforcement` | Kamar OCCUPIED lewat kontrak → tiket `EVICT_OVERSTAY`. |
| **RenewalSweep** | `runRenewalPriorityExpiry` | AWAITING_DP lewat hari-H → EXPIRED_PRIORITY. |
| | `runRenewalSettlementForfeit` | DP_SECURED gagal lunas H+7 → FORFEITED. |
| **AccountingSweep** | `runRentRecognition` | PSAK 72: unearned→earned bulanan. |
| | `runAutoJournalReconciliation` | Backfill jurnal warisan yang bolong. |
| | `runRecurringExpenseDrafts` | Draft biaya rutin bulanan. |
| | `runAutomaticDepreciation` | Depresiasi aset tetap bulan sebelumnya. |
| | `runAccountingAutoClose` | Tutup buku bulan lalu jika readiness aman. |
| | `runNotificationPruning` | Hapus notif >90 hari. |
| **MaintenanceSweep** | `runContractEndReminders` | Notifikasi H-10/H-7/H-3/H-1/H-day. |
| | `runTicketSlaEscalation` | Eskalasi SLA tiket (L0→admin, L1→owner). |
| | `runBelongingsAbandonment` | Barang ditinggal 30 hari → ABANDONED. |
| | `runAcCleaningSchedule` | Tiket cuci AC saat lewat interval. |
| | `runReferralRewards` | Beri poin referral saat teman aktif. |
| | `runPushDispatch` | Kirim push PWA queued. |
| **AnnouncementSweep** | `sweepAnnouncementDispatch` | Dispatch pengumuman aktif yang belum `dispatchedAt`, dedupe penerima. |

**Invarian:** job idempotent & aman dijalankan berulang; tidak pernah membatalkan stay yang sudah promoted/dibayar. Semua lewat `FOR UPDATE` re-cek. Uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi.

---

#### 8. Flow Tiket & Operasional Staf

##### 8.1 Tiket — `modules/tickets/tickets.service.ts`
- Buat: backoffice `createBackoffice` (6+ kategori), portal `createPortal` (komplain), otomatis (CHECKOUT_INSPECTION, EVICT_OVERSTAY, laporan barang).
- Siklus: `assign` → `start` (IN_PROGRESS) → `markDone` (DONE) → `close` (admin; gate kamar). Cancel dari kondisi diizinkan.

##### 8.2 Rutinitas staf — `modules/staff-routines/staff-routines.service.ts`
Template (admin `createTemplate`/`updateTemplate`) → staf `getToday` → `start`/`complete` (guard satu-kerja-aktif `assertNoActiveWork`) → KPI `getMyKpi`, progress admin `getAdminProgress`.

##### 8.3 Laporan lapangan — `modules/staff-field-reports/staff-field-reports.service.ts`
Staf lapor kondisi barang (`create`, foto) → admin `reviewQueue` → `adminReview` → validasi movement `validateMovement` + sinkron RoomItem `syncRoomItemTx` + update deskripsi tiket yang tertaut.

##### 8.4 Kinerja & review
- `modules/staff-performance/staff-performance.service.ts` — agregat bulanan per staf `getStaffMonthly` (KPI dari routine/ticket/field report events), audit kerja `createAudit`, saran audit `getAuditSuggestions`, bukti `getStaffEvidence`.
- Review tenant→staf: `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts` — `eligible`, `create` (rating; ≤2⭐ wajib komplain, ≥4⭐ pujian; anti-duplikat).

**Fokus audit:** penanganan kategori `BARANG_PINDAH` (`tickets.service.ts` `close`, `notifyBarangPindahClosed`) dan `TicketCategory.BARANG_PINDAH` (rapuh: bergantung deskripsi tiket); penugasan otomatis ke staf id terkecil (beban tidak merata); guard role `markDone` vs `close`.

---

#### 9. Flow Inventaris & Barang Kamar (detail)

**File:** `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/`

##### 9.1 Master barang gudang — `inventory-items.service.ts`
- CRUD (`create`/`update`/`findOne`/remove) — create, read, update, delete barang.
- `ensureOpeningStockSyncedTx` — sinkron stok awal.
- Update status dari lapangan `updateStatusFromField` — auto-ticket bila rusak/hilang.

##### 9.2 Pergerakan stok — `inventory-movements.service.ts`
- `create` — lock qty `lockInventoryQtyTx`, validasi kecukupan stok `validateMovementTx`, sinkron RoomItem `syncRoomItemTx`.
- `update` — mutasi resmi tidak boleh diedit langsung; `update` menolak dengan arahan buat mutasi koreksi.
- Satu movement IN/OUT mempengaruhi qty gudang + RoomItem.

##### 9.3 Barang per kamar — `room-items.service.ts`
- Daftar per kamar `findAll`, milik tenant `findMyRoomItems`.
- Update status `updateStatusFromField` — auto-ticket bila rusak/hilang.
- `create` disabled (melempar `ForbiddenException`) — hanya via movement, tidak langsung.

##### 9.4 Sinkronisasi & verifikasi
- `Verifikasi batch 5` (Audit Mega): double-apply qty TIDAK terjadi (trigger DB + sync self-healing). Tapi risiko kombinasi field-report → ticket-close tetap ada.
- `reconciliationLite` (deposit-ledger) juga mengecek qty.

**Invarian:** qty gudang = stok awal + Σ movement; RoomItem konsisten dengan movement IN/OUT per kamar; perubahan kondisi barang selalu meninggalkan jejak (ticket/field report).
**Fokus audit:** 3 jalur sinkron qty (movement, field report, ticket close) — skenario double-apply masih mungkin di edge case.

---

#### 10. Flow Keuangan Operasional (Expense, WiFi, Aset)

##### 10.1 Expense
- `modules/expenses/expenses.service.ts` CRUD (`create`/`update`/`remove`) → jurnal `postExpenseTx`.
- **Fokus audit:** delete expense — apakah jurnal ikut direversal? (M-33, FIX-14/15)

##### 10.2 WiFi Sales
- `modules/wifi-sales/wifi-sales.service.ts` CRUD (`create`/`update`/`remove`) → jurnal `postWifiSaleTx`.
- Tenant bisa order WiFi via portal.
- **Fokus audit:** delete wifi-sale — apakah jurnal ikut direversal?

##### 10.3 Aset Tetap
- `modules/assets/assets.service.ts` — CRUD `create`/`update`/`findOne`, readiness `readiness`.
- **Ledger alignment:** `previewLedgerAlignment` / `postLedgerAlignment` → `postFixedAssetLedgerAlignmentTx`.
- **Depresiasi:** `depreciationPreview` / `runDepreciation` → `AssetDepreciationRun` + `postDepreciationRunTx`.
- **Fokus audit:** depresiasi dobel-run pada bulan sama; aset terhubung roomItem/inventoryItem/expense (`validateRelations`) saat induk dihapus.

---

#### 11. Flow Akuntansi (Auto Journal Lite + Tutup Buku)

**File:** `modules/accounting/`

##### 11.1 Master & jurnal manual — `accounting.service.ts`
`seedDefaultCoa` → COA CRUD (`listAccounts`/`createAccount`/`updateAccount`) → CashAccount (`listCashAccounts`/`createCashAccount`/`updateCashAccount`) → Periode (`listPeriods`/`createPeriod`/`updatePeriod`) → Opening balance (`listOpeningBalances`/`createOpeningBalanceDraft`/`postOpeningBalance`/`voidOpeningBalance`) → Jurnal manual draft `createJournalDraft` (guard periode OPEN).

##### 11.2 Auto Journal Lite — `accounting-posting.service.ts`
- Wrapper non-tx (`postInvoiceIssued`/`postInvoicePayment`/`postExpense`/`postWifiSale`/`postDepositReceivedForStay`/`postDepositSettlement`) dan versi `*Tx` untuk: INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED/SETTLEMENT, FIXED_ASSET_ALIGNMENT `postFixedAssetLedgerAlignmentTx`, DEPRECIATION_RUN `postDepreciationRunTx`, reversal cancel invoice `postInvoiceCancellationReversalTx` / payment `postPaymentReversalTx`.
- Inti: `postBalancedJournalTx` — jurnal seimbang, idempotent per (sourceType, sourceId), skip VOID.
- Perbaikan data: `backfillAutoJournal`, `dryRunDepositBackfill`, `findUnmappedSourceIds`.

##### 11.3 Tutup buku — `accounting-period-close.service.ts`
`readiness` → `preview` → `post` (manual) / `autoCloseMonthly` → `reopen`. Readiness check per `key`: `unmapped-operational`, `depreciation`, `asset-alignment`, `trial-balance`.

##### 11.4 Kesiapan global — `accounting-readiness.service.ts` `getReadiness`.

**Invarian:** setiap jurnal seimbang; 1 sumber operasional = max 1 jurnal POSTED aktif; tidak ada posting ke CLOSED; reversal hanya untuk POSTED.
**Fokus audit:** kebijakan campuran blocking vs best-effort per sumber × pemanggil; auto-close menutup periode sementara jurnal best-effort gagal belum di-backfill.

---

#### 12. Flow Pelaporan & Dashboard Finance

##### 12.1 Laporan operasional — `modules/reports/reports.service.ts`
- monthly-income, overdue-aging, deposit-liability, expense-summary, profit-loss, financial-ratios, occupancy-daily, occupancy (rute di controller; `cash-flow` dihapus, digantikan `GET /accounting/cashflow`).

##### 12.2 Dashboard finansial — `modules/finance/finance.service.ts`
- `businessHealth` — kesehatan bisnis multi-indikator.
- `occupancySummary` — okupansi exclude RESERVED.
- `balanceSheetDraft` — neraca saldo draft.
- `ownerDashboard` — dashboard owner ringkas.
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
- `preview reminder` (`reminder-preview.controller.ts` `getAll` dan varian per jenis); `mock send` (`reminder-mock.controller.ts` `mockSend`).
- **Belum ada pengiriman email/WA nyata.**
- Notifikasi terkirim untuk payment, booking, checkout, overstay H-7/H-3/H-1/H-day, announcement, dan kompetitor menang. **Renew request/approve/reject belum memiliki notifikasi.**

##### 14.2 Pengumuman
- `modules/announcements/` — draft → publish (`announcements.service.ts` `update` dengan `isPublishing`) → tampil di portal tenant.

##### 14.3 PWA (lihat `docs/arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md`)
- Saat ini: **PWA MVP installable**, belum operasional yang kuat.
- 17 temuan audit: 3 CRITICAL (PWA-01 s.d 03: produksi tertinggal, HTTP tidak paksa HTTPS, frontend tanpa security headers), 6 HIGH, 7 MEDIUM, 1 PLANNED (push notification).
- **4 Phase perbaikan:** Phase 0 (Release Gate), Phase 1 (Cache Safety + Update + Offline UX), Phase 2 (Installability), Phase 3 (Web Push dengan outbox).
- **Aturan kunci:** Jangan cache API/auth/private data. Jangan mutation offline. Push via outbox, bukan side-effect transaksi.
- **Sedang dikerjakan AI lain** — `08_PWA` adalah dokumen aktif, bukan arsip.

---

#### 15. Gap Bisnis Real vs Kode — Temuan Audit Flow 2026-06-12

> **Sumber:** Wawancara owner 2026-06-12. Setelah dikonfirmasi, ditemukan 4 gap antara aturan bisnis asli vs implementasi kode.

> **Status 2026-10-10 — register ini potret wawancara, bukan status hari ini.** Diverifikasi ulang ke kode: **GAP #1 dan GAP #3 tampak sudah ditutup**, sehingga kalimat “Kode belum punya guard ini” dan “approval belum memvalidasi ulang dua nominal” di §3/§4 tidak lagi berlaku. Bukti: `payment-submissions.service.ts` `approveSubmission` menegakkan **dua nominal sah** (DP tepat atau pelunasan penuh) dan menolak sisanya — komentarnya sendiri `F1-1R (D-02): NO-PARTIAL`, sedangkan jalur invoice-only wajib lunas penuh · `invoice-payments.service.ts` `remove` memanggil `assertStayNotOccupiedForPaymentMutationTx`. **Batas:** ini pembacaan kode, **bukan** verifikasi runtime (tidak ada test/alur yang dijalankan); keputusan mencabut GAP adalah keputusan owner.

##### 🔴 GAP #1 — Tidak Ada Pembayaran Partial

**Aturan owner:** *"Pembayaran harus sesuai dengan kontrak sehingga kita tidak menerima pembayaran Partial."*

**Fakta kode (`payment-submissions.service.ts` `approveSubmission`):** `approveSubmission` split nominal → `rentPortion` + `depositPortion`, invoice bisa PARTIAL, kamar tetap RESERVED.

**Dampak:** Kode izinkan skenario yang tidak dikehendaki — tenant bayar sebagian, admin approve, invoice PARTIAL.

**Perbaikan:** booking hanya menerima DP tepat atau pelunasan penuh tepat; submission invoice-only dan pembayaran manual admin wajib lunas penuh. Status `PARTIAL` tetap sah untuk DP tepat.

---

##### ✅ GAP #2 — DP Renewal: Ditutup F2-1

**Implementasi aktif:** prompt H-10; prioritas tenant lama sampai hari-H; `AWAITING_DP` berakhir `EXPIRED_PRIORITY` bila melewati hari-H; DP yang terverifikasi menjadi `DP_SECURED`; pelunasan maksimal H+7; dan kegagalan menjadi `FORFEITED` melalui AutoOps. Harga renewal tetap mengikuti rent-lock.

**Keputusan operasional:** proses forced checkout dan settlement deposit setelah forfeit tetap dijalankan admin melalui flow checkout yang terkontrol, bukan tindakan otomatis tanpa review.

---

##### 🟠 GAP #3 — Admin Tidak Boleh Hapus Payment Saat OCCUPIED

**Aturan owner:** *"Room yang masih di masa kontrak, tidak dapat dibatalkan sepihak oleh admin."*

**Fakta kode (`invoice-payments.service.ts` `remove`):** saat wawancara (2026-06-12) tidak ada guard apakah room sudah OCCUPIED. **Status 2026-10-10 — guard itu sudah ada:** `remove` memanggil `assertStayNotOccupiedForPaymentMutationTx`, yang menolak bila stay promoted atau `room.status == OCCUPIED`.

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
State: TanStack Query + Axios; auth JWT. Audit historis UI/UX (berkas lama `_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md`) sudah dihapus dari repo; jejaknya ada di riwayat git sebelum 2026-10-05.

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

## Riwayat audit


**Status:** 🟢 Solid (1 🔴 CRITICAL ✅ FIXED). Detail → `docs/arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md`

✅ Enumeration-safe login & forgotPassword · ✅ Suspend memutus sesi via JWT `pwdAt` claim · ✅ PasswordResetToken SHA-256 hash, one-time · ✅ bcrypt · ✅ Global default-deny JWT (APP_GUARD) · ✅ Role guard (`@Roles(OWNER, ADMIN)`) · ✅ OWNER-only: periode, user, kamar, harga, deposit · ✅ Staff restriction inventory official (`@Roles`) · ✅ Rate limit (300/menit global, 10/15menit auth)

🔴 ~~P3-01: JWT 24 jam tanpa refresh token — XSS hijack risk~~ → ✅ **FIXED** 7 Jul 2026: model RefreshToken, httpOnly cookie, `/auth/refresh`, auto-refresh interceptor (🧬)
🔵 P3-02: rate limit in-memory (✅ aman di single-instance cPanel; perlu Redis jika multi-instance)
