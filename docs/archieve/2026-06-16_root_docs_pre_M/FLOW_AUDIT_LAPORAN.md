# LAPORAN AUDIT FLOW KOST48 V5 — Realita Kode vs Aturan Bisnis
**Tanggal:** 2026-06-14 | **Git HEAD:** `0a83dbd` | **Unit Test:** 26/26 ✅

---

## A. NARASI REALITA 5 FLOW INTI

---

### A1. FLOW BOOKING + PEMBAYARAN (Jantung Uang Masuk)

**Aktor yang terlibat:** Tenant (publik/portal), Admin, Sistem (Auto-Ops)

#### A1.1 Booking Publik (tanpa login)
1. **Input:** Tamu isi nama, email, telepon, pilih kamar, pilih tanggal.
2. **Validasi:**
   - `checkInDate` tidak boleh hari ini jika jam ≥ 21:00 WIB.
   - `checkInDate` tidak boleh masa lalu.
   - Phone dinormalisasi, email di-lowercase.
   - Ada **honeypot trap** (`dto.website`) — jika diisi, dianggap bot → 400.
3. **Buat akun sementara:** Password `Kost48${randomInt(10000,99999)}`, di-hash bcrypt, disimpan ke User + Tenant.
4. **Anti-duplikasi tenant:** Jika sudah ada tenant dengan email atau phone yang sama → pakai tenant yang sudah ada (gabung), bukan buat baru.
5. **Buat Stay (booking):** Dalam transaksi:
   - Lock kamar `FOR UPDATE` — kamar harus AVAILABLE atau RESERVED (multi-booking diizinkan).
   - Hitung harga = snapshot tarif per `pricingTerm`.
   - **DP = 30% × sewa** (`Math.round((agreedRent * 30) / 100)`).
   - **Expiry = 3 jam** dari waktu pembuatan booking (deadline flat).
   - Room → `RESERVED`, Stay status → `ACTIVE`, `initialMetersPromotedAt` = NULL.
6. **Notifikasi ke admin** — best-effort (tidak menggagalkan jika gagal).

#### A1.2 Booking Portal (tenant login)
- **SAMA persis** dengan publik, kecuali:
  - Tidak perlu buat akun (tenant sudah login).
  - Validasi tambahan: tenant harus aktif, tenant hanya boleh booking untuk dirinya sendiri.
  - Guard: tenant tidak boleh punya stay ACTIVE lain (1 tenant = 1 stay aktif).

#### A1.3 Tenant Upload Bukti Bayar (createSubmission)
1. Tenant login, pilih invoice yang ingin dibayar.
2. System cari `eligibleSubmissionTarget` — invoice harus milik stay tenant, status ISSUED/PARTIAL/DRAFT (kecuali RESERVED-strict).
3. **Anti-duplikasi:** Cek existing PENDING_REVIEW untuk stay+invoice yang sama → conflict.
4. Tenant upload file bukti (gambar) → simpan ke disk path.
5. Buat `PaymentSubmission` status `PENDING_REVIEW`.
6. **Notifikasi ke semua OWNER/ADMIN aktif** — dedupe per (recepient + title + entityType + entityId), best-effort.

#### A1.4 Admin Approve Pembayaran (approveSubmission) — KRUSIAL
**Ini titik paling kritis dalam sistem. Langkah demi langkah:**

1. **Lock submission** `FOR UPDATE` — harus PENDING_REVIEW, stay ACTIVE.
2. **Cek jalur:**
   - `isBookingPath = (room.status === 'RESERVED' && stay.initialMetersPromotedAt === null)` — booking belum check-in.
   - `isInvoiceOnlyPath` — sisanya (invoice langsung, bukan booking).
3. **Hitung ulang paid amount** dari invoice payments yang sudah ada.
4. **Dua-nominal gate** (F1-1R, F2-3 sudah diimplementasikan):
   - **Booking path:** nominal harus = DP 30% ATAU = total invoice (lunas penuh). Jika tidak → 409.
   - **Invoice-only path:** nominal harus = sisa tagihan (lunas penuh, tidak boleh partial). Jika tidak → 409.
5. **Split nominal:** `rentPortion` (dari invoice line RENT) + `depositPortion` (dari invoice line DEPOSIT).
6. **Buat InvoicePayment** — simpan ke invoice payments.
7. **Update status invoice:** Jika total paid = invoice total → `PAID`. Jika < → `PARTIAL`.
8. **Auto Journal Lite** — terbitkan jurnal INVOICE_PAYMENT (best-effort). Jika gagal, approval tetap jalan.
9. **Submission → APPROVED.**
10. **Jika booking path:**
    - Update `downPaymentPaidRupiah`.
    - **Jika invoice PAID (lunas penuh):**
      - Room → `OCCUPIED`.
      - Auto-set `plannedCheckOutDate` (checkIn + periode sewa).
      - Promosi meter (`initialMetersPromotedAt` diisi).
      - Stay → "promoted" (check-in nyata).
    - **CancelCompetingUnpaidBookingsTx:**
      - Cari booking lain di kamar yang sama (ACTIVE + belum promoted).
      - Untuk setiap pesaing: batalkan stay, batalkan invoice, reversal jurnal POSTED.
      - **Notifikasi ke tenant yang kalah** — best-effort.
      - **PENTING:** Booking dengan submission PENDING_REVIEW **TIDAK dibatalkan** — admin harus refund manual.

#### A1.5 Keputusan Admin (Reject / Expire)
- **rejectSubmission:** Admin tolak bukti bayar → submission REJECTED. Notifikasi tenant.
- **expireBooking:** Admin/System expire booking → submission EXPIRED, stay CANCELLED, room AVAILABLE.

#### 🔴 Temuan Flow Pembayaran:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| B1 | Auto Journal Lite di `approveSubmission` adalah **best-effort** — jika gagal, approval tetap jalan, uang tercatat di invoice tapi **tidak ada jurnal** | `payment-submissions.service.ts:439-449` | 🔴 KRITIS |
| B2 | Deposit ledger (`recordDepositReceivedTx`) di booking path juga **best-effort** — jika gagal, deposit tidak tercatat di ledger | `payment-submissions.service.ts:483` | 🟠 TINGGI |
| B3 | `isBookingSchemaDriftError` (guard booking di createBooking:222) **menelan error** — jika terjadi race, error di-swallow, booking mungkin dibuat tanpa lock yang benar | `tenant-bookings.service.ts:222` | 🟠 TINGGI |

---

### A2. FLOW INVOICE + PEMBAYARAN MANUAL

**Aktor:** Admin/OWNER, Sistem

#### A2.1 Buat Invoice
1. Admin pilih tenant+stay, input lines (RENT, UTILITY, PENALTY, DEPOSIT, DISCOUNT, ADJUSTMENT).
2. Guard: hanya OWNER/ADMIN, periode valid, total > 0.
3. Transaksi: buat invoice DRAFT → buat lines → ISSUE (status → ISSUED, `issuedAt` diisi).
4. **Saat ISSUE:** Auto Journal `INVOICE_ISSUED` — debit Piutang (AR 1100), kredit Pendapatan (Revenue). Best-effort.

#### A2.2 Pembayaran Manual Admin
1. Admin input payment (nominal) untuk invoice tertentu.
2. **Lock invoice** `FOR UPDATE` — hitung total paid existing.
3. **Anti-overpayment:** `existingPaid + amount > invoiceTotal` → 409.
4. **Jika booking path (status RESERVED):** wajib lewat jalur approve bukti bayar, bukan manual → 409.
5. Buat InvoicePayment → sync status invoice (PAID/PARTIAL/ISSUED).
6. **Auto Journal** INVOICE_PAYMENT — best-effort.

#### A2.3 Remove Payment (HAPUS)
Guard **OCCUPIED** (F1-2): Jika `initialMetersPromotedAt` terisi ATAU room OCCUPIED → 409. Aman ✅

#### A2.4 Cancel Invoice
1. Guard: invoice harus ISSUED/PARTIAL (tidak boleh PAID atau CANCELLED).
2. Transaksi: set status CANCELLED.
3. **Reversal jurnal:** Auto Journal `INVOICE_CANCELLED` — reversal jurnal ISSUED sebelumnya. Best-effort.

#### 🔴 Temuan Invoice:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| I1 | Jurnal ISSUED dan reversal jurnal cancel adalah **best-effort** — invoice bisa ISSUED/CANCELLED tanpa jurnal | `invoices.service.ts:328-336` | 🔴 KRITIS |
| I2 | CREATE invoice untuk invoice di stay yang sudah COMPLETED tidak diblokir | `invoices.service.ts:289-290` | 🟡 MENENGAH |

---

### A3. FLOW RENEWAL (Perpanjangan)

**Aktor:** Tenant, Admin, Sistem (Sweeper)

#### A3.1 State Machine (7 status)
```
PENDING_DECISION ──[TENANT=YA]──→ AWAITING_DP
PENDING_DECISION ──[TENANT=TIDAK] → REJECTED_BY_TENANT
AWAITING_DP ──[DP LUNAS]──→ DP_SECURED
AWAITING_DP ──[EXPIRED (H-H+0)] → EXPIRED_PRIORITY
DP_SECURED ──[PELUNASAN LUNAS] → COMPLETED (stay diperpanjang)
DP_SECURED ──[GAGAL LUNAS H+7] → FORFEITED (manual admin)
PENDING_DECISION ──[ADMIN REJECT] → REJECTED_BY_ADMIN
```

#### A3.2 Langkah Detail
1. **H-10:** Auto-Ops `runContractEndReminders` kirim notif ke tenant untuk renew.
2. **Tenant createRequest:** Pilih stay → hitung DP 30% → status `PENDING_DECISION`.
3. **Tenant decideByTenant:**
   - **YA:** Buat invoice DP 30% terpisah. Status → `AWAITING_DP`. Notif ke admin.
   - **TIDAK:** Status → `REJECTED_BY_TENANT`. Notif admin.
4. **Admin rejectRequest:** Status → `REJECTED_BY_ADMIN`. Notif tenant.
5. **Tenant bayar DP** (lewat flow payment submission biasa → invoice DP).
6. **Admin confirmDownPayment:**
   - Cek invoice DP sudah PAID.
   - Status → `DP_SECURED`.
   - **Terbitkan invoice pelunasan** (sisa sewa + utilitas, tanpa DP).
   - Notif tenant.
7. **Tenant bayar pelunasan** (lewat flow payment submission biasa).
8. **Admin finalizeRenewal:**
   - Cek invoice pelunasan sudah PAID.
   - Cek deadline: tidak boleh lewat H+7 dari `downPaymentDueDate`.
   - Stay diperpanjang: periode baru, plannedCheckOutDate baru.
   - Status → `COMPLETED`.
   - Notif tenant.
9. **Sweeper (Auto-Ops):**
   - `EXPIRED_PRIORITY`: AWAITING_DP lewat `downPaymentDueDate` → batalkan invoice DP + reversal jurnal.
   - `FORFEITED`: DP_SECURED lewat H+7 → flag + notif admin. **Forced checkout manual admin** (keputusan owner hibrida).

#### ✅ Status: **SELESAI** (F2-1, F2-2). State machine penuh, guard deadline, sweeper hibrida.

---

### A4. FLOW CHECKOUT + DEPOSIT

**Aktor:** Tenant, Admin, Staf (inspeksi), Sistem

#### A4.1 Pengajuan Checkout
1. Tenant ajukan checkout request: guard `assertNoOpenInvoices` — tolak jika ada invoice belum PAID/CANCELLED.
2. Admin approve → notifikasi tenant + staf.
3. Atau admin reject → notifikasi tenant.

#### A4.2 Final Checkout (`complete`)
**KRUSIAL. Langkah demi langkah:**

1. **Guard actor:** Hanya OWNER/ADMIN.
2. **Guard invoice:** Query semua invoice stay. Jika ada yang belum PAID/CANCELLED → **BLOCK** (409).
3. **Transaksi:**
   - Stay → `COMPLETED`.
   - Room → `MAINTENANCE`.
   - Auto-create tiket `CHECKOUT_INSPECTION` (dedupe per stay+room+kategori).
   - Jika ada DRAFT invoice → batalkan (tanpa jurnal karena DRAFT).
4. **Auto Journal:** Reversal jurnal UTILITY yang belum diissue (best-effort).
5. **Notifikasi** ke staf + admin — best-effort.

#### A4.3 Settlement Deposit (`processDeposit`)
1. Guard: stay COMPLETED/CANCELLED, depositStatus HELD.
2. Aksi yang tersedia:
   - **FULL_REFUND:** depositStatus → REFUNDED.
   - **PARTIAL:** depositStatus → PARTIALLY_REFUNDED.
   - **FORFEIT:** depositStatus → FORFEITED.
3. **Jurnal DEPOSIT_SETTLEMENT** — dibuat di dalam transaksi (bukan best-effort). **Blocking.** ✅
4. **Deposit ledger** — dicatat di dalam transaksi. **Blocking.** ✅
5. Anti-double-settlement: guard depositStatus harus HELD.

#### A4.4 Room Readiness (Tiket Inspeksi)
1. Staf/Admin close tiket CHECKOUT_INSPECTION.
2. Cek tidak ada stay ACTIVE lain di kamar itu.
3. Cek semua barang GOOD.
4. **Room MAINTENANCE → AVAILABLE.**

#### ✅ Temuan Checkout:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| C1 | Saat `complete`, Auto Journal UTILITY reversal adalah **best-effort** — reversal bisa gagal | `stays.service.ts:662-664` | 🟠 TINGGI |
| C2 | Auto Journal `DEPOSIT_SETTLEMENT` sudah blocking ✅ — tapi di versi sebelum F1-8 ada risiko settlement tanpa jurnal. Sekarang sudah diperbaiki. | `stays.service.ts:834-870` | ✅ SELESAI |

---

### A5. FLOW AUTO-OPS + AKUNTANSI + LAPORAN

#### A5.1 Auto-Ops (13 Job Sequential)
**Urutan eksekusi** (mutex `running` mencegah overlap):

| # | Job | Fungsi | Status |
|---|-----|--------|--------|
| 1 | `runBookingExpiry` | Batalkan booking lewat `expiresAt` (3 jam) | ✅ |
| 2 | `runContractEndReminders` | Kirim notif kontrak akan berakhir (H-10,7,3,1,0) | ✅ |
| 3 | `runRenewalPriorityExpiry` | AWAITING_DP lewat deadline → EXPIRED_PRIORITY | ✅ |
| 4 | `runRenewalSettlementForfeit` | DP_SECURED lewat H+7 → FORFEITED (flag manual) | ✅ |
| 5 | `runDownPaymentForfeit` | Booking lewat checkIn+1 hari tanpa lunas → DP hangus | ✅ |
| 6 | `runOverstayForcedCheckout` | H+1 pk 12:00 → forced checkout. Skip jika ada tagihan. ✅ Skip DRAFT. | ✅ |
| 7 | `runPostCheckoutAutoCancel` | Stay belum promoted lewat plannedCheckOut → cancel | ✅ |
| 8 | `runRoomReleaseAtNoon` | pk 12:00 WIB → rilis booking expired | ✅ |
| 9 | `runRoomHealer` | Room RESERVED yatim → pulihkan | ✅ |
| 10 | `runOverstayEnforcement` | Kamar OCCUPIED lewat kontrak → tiket EVICT_OVERSTAY | ✅ |
| 11 | `runAutoExpenseDraft` | Buat draft expense rutin (gaji, listrik, dll) max 6/bln | ✅ |
| 12 | `runAutoDepreciation` | Depresiasi bulan sebelumnya | ✅ |
| 13 | `runAccountingAutoClose` | Tutup buku bulan lalu jika readiness aman | ✅ |

#### A5.2 Akuntansi (Auto Journal Lite)
**Sumber jurnal** dan cara kerjanya:

| Source Type | Trigger | Debit | Kredit | Best-Effort? |
|------------|---------|-------|--------|--------------|
| INVOICE_ISSUED | Invoice di-issue | AR (1100) | Revenue | ✅ Best-effort |
| INVOICE_PAYMENT | Payment diterima | Kas (10xx) | AR (1100) | ✅ Best-effort |
| INVOICE_CANCELLED | Invoice di-cancel | Revenue | AR (1100) | ✅ Best-effort |
| EXPENSE | Expense dikonfirmasi | Beban | Kas (10xx) | ✅ Best-effort |
| WIFI_SALE | Wifi terjual | Kas (10xx) | Pendapatan | ✅ Best-effort |
| DEPOSIT_RECEIVED | Deposit diterima | Kas (10xx) | Deposit Liab (2000) | ✅ Best-effort |
| DEPOSIT_SETTLEMENT | Deposit diselesaikan | Deposit Liab (2000) | Kas (10xx) | **Blocking** ✅ |
| DEPRECIATION_RUN | Depresiasi dijalankan | Beban Depresiasi | Akumulasi Depresiasi | ✅ Best-effort |

**Idempotensi:** Setiap source hanya boleh punya 1 jurnal POSTED → lock via `(sourceType, sourceId)` unique.

#### A5.3 Laporan Keuangan
| Laporan | Sumber Data | Exclude DRAFT? | Exclude CANCELLED? |
|---------|-------------|---------------|-------------------|
| **P&L** (profitLoss) | Invoice (totalAmount) + Wifi (soldPrice) + Expense (amount) | ✅ DRAFT | ✅ CANCELLED |
| **Cashflow** | InvoicePayment (amount) + Wifi (soldPrice) + Expense (amount) | ✅ (DRAFT expense) | ✅ CANCELLED invoice |
| **Balance Sheet** | **TIDAK ADA** method balanceSheet di reports.service | — | — |
| **Financial Ratios** | Mixed: invoice + kamar + hitung sendiri | ✅ | ✅ |
| **Occupancy Rate** | Kamar isActive + stay ACTIVE+promoted | ✅ | ✅ |

#### 🔴 Temuan Akuntansi:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| A1 | **5 dari 8 sumber jurnal adalah best-effort** — jika jurnal gagal, laporan keuangan tidak balance dengan data operasional | berbagai | 🔴 KRITIS |
| A2 | Balance Sheet tidak ada method terpisah — hanya `balanceSheetDraft` di finance.service yang pakai data operasional, bukan jurnal penuh | `reports.service.ts` | 🟠 TINGGI |
| A3 | High signal tickets sebelumnya pakai kategori 'URGENT','HIGH','EMERGENCY' yang tidak valid → sinyal mati. **SUDAH DIPERBAIKI** F2-12 | `finance.service.ts` | ✅ SELESAI |
| A4 | Occupancy rate dulu selalu 0 karena pakai field `occupancyRate`. **SUDAH DIPERBAIKI** F1-6 — inline hitung dari kamar| `finance.service.ts` | ✅ SELESAI |

---

## B. AUDIT BARIS PER BARIS — FILE KEUANGAN

### B1. `payment-submissions.service.ts` (1727 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 439-449 | `postJournal?.postInvoicePaymentNoTx` | **Best-effort.** Jika jurnal gagal, approval tetap jalan | 🔴 |
| 483 | `depositLedger.recordDepositReceivedTx` | **Best-effort.** Deposit ledger bisa tidak tercatat | 🟠 |
| 1270, 1298 | `.catch(e => this.logger.warn(...))` | Notifikasi tenant bisa gagal tanpa dampak | 🟡 |
| 1320 | `PaymentSubmission.findFirst` tanpa `FOR UPDATE` | Race condition kecil saat read before tx | 🟡 |

### B2. `invoices.service.ts` (535 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 328-336 | `postInvoiceIssuedTx` dipanggil di luar transaksi | Jurnal ISSUED bisa gagal, invoice tetap ISSUED | 🔴 |
| 480-530 | `cancel` → `postInvoiceCancelledTx` juga di luar tx | Reversal bisa gagal | 🔴 |

### B3. `invoice-payments.service.ts` (~250 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 189-192 | `remove` → guard OCCUPIED menggunakan `initialMetersPromotedAt` | ✅ Sudah benar (F1-2) | ✅ |
| 113-193 | `create` → lock FOR UPDATE | ✅ Sudah benar | ✅ |

### B4. `accounting-posting.service.ts` (1273 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 1130-1236 | `postBalancedJournalTx` — idempoten via `(sourceType, sourceId)` | ✅ Sudah benar | ✅ |
| 1258-1271 | `runIdempotentPosting` — catch P2002 race | ✅ Sudah benar | ✅ |

### B5. `accounting.service.ts` (~700 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 585 | `createJournalEntry` guard periode OPEN | ✅ Sudah benar | ✅ |
| 325-526 | Opening balance draft/post/void | ✅ Sudah benar | ✅ |

### B6. `accounting-period-close.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 325-406 | `buildReadiness` — 11 checks | ✅ Sudah benar | ✅ |
| 122 | `autoCloseMonthly` — idempoten via `runAccountingAutoClose` | ✅ Sudah benar | ✅ |

### B7. `reports.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 306-370 | `profitLoss` — exclude DRAFT+CANCELLED | ✅ Sudah benar | ✅ |
| 251-298 | `cashFlow` — paymentDate, exclude DRAFT expense | ✅ Sudah benar | ✅ |
| 199-250 | `financialRatios` — expenseRatio (expense/revenue)x100 | ✅ Sudah benar | ✅ |

### B8. `finance.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 40-149 | `businessHealth` — overdue via `$queryRaw` sisa tagihan | ✅ Sudah benar | ✅ |
| 280-350 | `ownerDashboard` | ✅ Sudah benar | ✅ |

---

## C. 5 PROMPT MERMAID UNTUK GEMINI

### Prompt #1 — Flow Booking + Pembayaran

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow BOOKING DAN PEMBAYARAN KOST48.

Gunakan style flowchart (graph TD). Warna:
- Hijau (#22c55e) untuk aksi TENANT
- Biru (#3b82f6) untuk aksi ADMIN
- Oranye (#f97316) untuk aksi SISTEM/AUTO-OPS
- Merah (#ef4444) untuk ERROR/PENOLAKAN
- Abu-abu (#94a3b8) untuk NOTIFIKASI (best-effort)

Detail langkah:

START → [TENANT] Booking via publik (isi nama, email, telp, pilih kamar+tanggal)
  Decision: Apakah checkInDate < today? → YA → ERROR: "Tidak boleh booking masa lalu"
  → TIDAK → Decision: Apakah jam ≥ 21:00 WIB untuk check-in hari ini? → YA → ERROR: "Booking untuk hari ini ditutup"
  → TIDAK → [SISTEM] Cek apakah tenant sudah ada (email/phone match)
    Decision: Tenant baru? → YA → [SISTEM] Buat User+Tenant, password "Kost48{random}"
    → TIDAK → [SISTEM] Pakai tenant yang sudah ada
  → [SISTEM] Lock kamar (FOR UPDATE)
  → Decision: Kamar AVAILABLE atau RESERVED? → TIDAK → ERROR: "Kamar tidak tersedia"
  → YA → [SISTEM] Hitung harga = tarif × pricingTerm
  → [SISTEM] DP = 30% × sewa
  → [SISTEM] Expiry = 3 jam dari now
  → [SISTEM] Room → RESERVED, Stay → ACTIVE (initialMetersPromotedAt = NULL)
  → [ABU-ABU] Notif admin (best-effort)
  → [TENANT] Upload bukti bayar (PENDING_REVIEW)

  → [ADMIN] approveSubmission:
  → Decision: Apakah room RESERVED dan belum promoted? (booking path)
    → YA → [ADMIN] Validasi nominal: DP tepat(30%) ATAU lunas penuh
      → Decision: Valid? → TIDAK → ERROR: "Nominal harus DP 30% atau lunas penuh"
      → YA → [ADMIN] Split nominal: rentPortion + depositPortion
    → TIDAK (invoice-only) → [ADMIN] Validasi nominal = sisa tagihan
      → Decision: Valid? → TIDAK → ERROR: "Invoice-only wajib lunas penuh"
      → YA → [ADMIN] Buat InvoicePayment
  → [SISTEM] Update status invoice: PAID/PARTIAL/ISSUED
  → [ORANYE] Auto Journal INVOICE_PAYMENT (best-effort)
  → [SISTEM] Submission → APPROVED
  → Decision: Booking path + invoice PAID?
    → YA → 1) Room OCCUPIED 2) Auto plannedCheckOutDate 3) Promosi meter
           4) CancelCompetingUnpaidBookingsTx
           5) [ABU-ABU] Notif tenant kalah (best-effort)
    → TIDAK → Selesai
  → [ABU-ABU] Notif tenant pembayaran diterima (best-effort)

  Decision dari admin: Tolak (rejectSubmission)?
    → YA → [SISTEM] SUBMISSION REJECTED, notif tenant
    → TIDAK → Lanjut

END
```

### Prompt #2 — Flow Invoice + Pembayaran Manual

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow INVOICE DAN PEMBAYARAN MANUAL KOST48.

Warna sama: Hijau=tenant, Biru=admin, Oranye=sistem, Merah=error, Abu-abu=notif.

Detail langkah:

START → [ADMIN] Buat invoice: pilih stay, input lines (RENT/UTILITY/PENALTY/DEPOSIT/DISCOUNT/ADJUSTMENT)
  → Decision: Total > 0? → TIDAK → ERROR
  → YA → [SISTEM] Create invoice DRAFT
  → [SISTEM] Issue invoice: status ISSUED, issuedAt = now
  → [ORANYE] Auto Journal INVOICE_ISSUED: debit AR(1100), kredit Revenue (best-effort)
  → Status: ISSUED

  → [ADMIN] Pembayaran manual (create InvoicePayment):
  → [SISTEM] Lock invoice FOR UPDATE
  → Decision: Apakah room RESERVED (belum check-in)? → YA → ERROR: "Harus lewat approve bukti bayar"
  → TIDAK → Decision: existingPaid + amount > invoiceTotal? → YA → ERROR: "Overpayment"
  → TIDAK → Buat InvoicePayment
  → [SISTEM] Sync status invoice:
    → Jika paid == total → PAID
    → Jika paid < total → PARTIAL (jika sebelumnya ISSUED)
  → [ORANYE] Auto Journal INVOICE_PAYMENT (best-effort)

  → [ADMIN] Hapus payment (remove):
  → Decision: Apakah initialMetersPromotedAt != NULL ATAU room OCCUPIED?
    → YA → ERROR 409: "Tidak bisa hapus payment saat kamar sudah dihuni"
    → TIDAK → Hapus payment, reversal jurnal

  → [ADMIN] Cancel invoice:
  → Decision: Status ISSUED/PARTIAL?
    → YA → Status CANCELLED
    → [ORANYE] Auto Journal INVOICE_CANCELLED (reversal, best-effort)
    → TIDAK → ERROR: "Tidak bisa cancel invoice PAID/CANCELLED"

END
```

### Prompt #3 — Flow Renewal (Perpanjangan)

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow RENEWAL (PERPANJANGAN) KOST48.

Warna sama. Detail state machine dengan 7 status.

Detail langkah:

START → [SISTEM] H-10: runContractEndReminders → notif tenant kontrak akan berakhir
  → [TENANT] createRequest → pilih stay → hitung DP 30%
  → Status: PENDING_DECISION

  → [TENANT] decideByTenant:
  → Decision: YA atau TIDAK?
    → TIDAK → Status REJECTED_BY_TENANT → [ABU-ABU] Notif admin
    → YA → [SISTEM] Buat invoice DP 30% TERPISAH
       → Notif admin "tenant setuju renew"
       → Status: AWAITING_DP
       → Deadline: downPaymentDueDate = plannedCheckOutDate

  → [TENANT] Bayar DP (lewat flow payment submission biasa)
  → [ADMIN] confirmDownPayment:
  → Decision: Invoice DP sudah PAID?
    → TIDAK → ERROR: "DP belum dibayar"
    → YA → Status: DP_SECURED
    → [SISTEM] Terbitkan invoice PELUNASAN (sisa sewa + utilitas)
    → Deadline: settlementDueDate = now + 7 hari (H+7)
    → [ABU-ABU] Notif tenant "DP disetujui, segera bayar pelunasan"

  → [TENANT] Bayar pelunasan (lewat flow payment submission biasa)
  → [ADMIN] finalizeRenewal:
  → Decision: Invoice pelunasan sudah PAID?
    → TIDAK → ERROR
    → YA → Decision: Apakah sekarang > settlementDueDate?
      → YA → ERROR: "Melewati batas H+7, renewal tidak bisa difinalkan"
      → TIDAK → [SISTEM] Stay diperpanjang:
        1) Periode baru
        2) plannedCheckOutDate baru
        3) Status: COMPLETED
        → [ABU-ABU] Notif tenant "Kontrak diperpanjang"

  ── JALUR SISTEM (Sweeper Auto-Ops) ──
  → [SISTEM] runRenewalPriorityExpiry:
  → Decision: AWAITING_DP + downPaymentDueDate lewat?
    → YA → Status EXPIRED_PRIORITY
    → Batalkan invoice DP (reversal jurnal jika POSTED)
    → [ABU-ABU] Notif tenant "Prioritas renew hangus"

  → [SISTEM] runRenewalSettlementForfeit:
  → Decision: DP_SECURED + settlementDueDate lewat?
    → YA → Status FORFEITED
    → [ABU-ABU] Notif admin "Tenant gagal lunas, lakukan forced checkout manual"

  Decision from admin: rejectRequest?
    → YA → Status REJECTED_BY_ADMIN → [ABU-ABU] Notif tenant

END
```

### Prompt #4 — Flow Checkout + Deposit

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow CHECKOUT DAN DEPOSIT KOST48.

Warna sama. Detail langkah:

START → [TENANT] Ajukan checkout request
  → [SISTEM] Guard: assertNoOpenInvoices
  → Decision: Ada invoice belum PAID/CANCELLED?
    → YA → ERROR: "Selesaikan semua tagihan dulu"
    → TIDAK → Status: PENDING

  → [ADMIN] Approve checkout request:
  → [ABU-ABU] Notif tenant + staf

  → [ADMIN] Final checkout (complete):
  → Guard actor: OWNER/ADMIN only
  → Guard invoice ulang: cek semua invoice stay → jika ada belum lunas → BLOCK (409)
  → [SISTEM] Dalam transaksi:
    1) Stay COMPLETED
    2) Room MAINTENANCE
    3) Buat tiket CHECKOUT_INSPECTION (dedupe)
    4) Batalkan DRAFT invoice (tanpa jurnal)
  → [ORANYE] Auto Journal UTILITY reversal (best-effort)
  → [ABU-ABU] Notif staf + admin

  ── TAHAP DEPOSIT ──
  → [ADMIN] processDeposit:
  → Decision: depositStatus HELD?
    → TIDAK → ERROR: "Deposit sudah diselesaikan"
    → YA → Pilih aksi:
      → FULL_REFUND → depositStatus REFUNDED
      → PARTIAL → depositStatus PARTIALLY_REFUNDED
      → FORFEIT → depositStatus FORFEITED
  → [SISTEM] Jurnal DEPOSIT_SETTLEMENT (BLOCKING di dalam tx) ✅
  → [SISTEM] Deposit ledger (BLOCKING di dalam tx) ✅

  ── TAHAP ROOM READINESS ──
  → [STAF/ADMIN] Tutup tiket CHECKOUT_INSPECTION
  → [SISTEM] Cek tidak ada stay ACTIVE lain
  → Decision: Semua barang GOOD?
    → YA → Room MAINTENANCE → AVAILABLE
    → TIDAK → Tunggu perbaikan

END
```

### Prompt #5 — Flow Auto-Ops + Akuntansi + Laporan

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow AUTO-OPS, AKUNTANSI DAN LAPORAN KOST48.

Warna: Oranye=sistem, Biru=admin, Merah=error.

Detail langkah:

START → [SISTEM] Auto-Ops dijalankan (runAll) — sequential, mutex running=true:
  → Job 1: runBookingExpiry → Batalkan booking lewat 3 jam
  → Job 2: runContractEndReminders → Notif H-10,7,3,1,0
  → Job 3: runRenewalPriorityExpiry → AWAITING_DP expired
  → Job 4: runRenewalSettlementForfeit → DP_SECURED H+7 expired
  → Job 5: runDownPaymentForfeit → DP hangus (kamar di-booking, lewat checkIn+1)
  → Job 6: runOverstayForcedCheckout → H+1 pk 12 forced checkout
  → Job 7: runPostCheckoutAutoCancel → Cancel stay belum promoted
  → Job 8: runRoomReleaseAtNoon → pk 12 rilis booking expired
  → Job 9: runRoomHealer → Room RESERVED yatim pulihkan
  → Job 10: runOverstayEnforcement → Tiket EVICT_OVERSTAY
  → Job 11: runAutoExpenseDraft → Draft expense rutin
  → Job 12: runAutoDepreciation → Depresiasi bulan lalu
  → Job 13: runAccountingAutoClose → Tutup buku bulan lalu

  ── JURNAL ──
  [ORANYE] Auto Journal Lite (best-effort, kecuali DEPOSIT_SETTLEMENT):
  Untuk setiap operasi (INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED, DEPRECIATION_RUN):
    Decision: Apakah sudah ada jurnal POSTED untuk (sourceType, sourceId) yang sama?
      → YA → Skip (idempoten)
      → TIDAK → Buat jurnal balanced → post

  ── TUTUP BUKU ──
  [SISTEM] accountingReadiness.getReadiness() → cek 11 kondisi:
  1) Periode OPEN
  2) Tidak ada closing aktif
  3) Trial balance balanced
  4) COA Retained Earnings aktif
  5) Tidak ada draft journal
  6) Tidak ada posted journal unbalanced
  7) Tidak ada draft opening balance
  8) Tidak ada unmapped operational source
  9) Depresiasi sudah jalan
  dst.
  → Decision: Semua green? → YA → Tutup buku (CLOSED + retained earnings)
  → TIDAK → Skip dengan laporan

  ── LAPORAN ──
  [ADMIN] Lihat laporan:
  → P&L: Revenue (invoice PAID/ISSUED/PARTIAL, exclude DRAFT/CANCELLED) - Expense (CONFIRMED)
  → Cashflow: InvoicePayment (paymentDate) + Expense (expenseDate)
     = Cash In - Cash Out
  → Financial Ratios: occupancy, expenseRatio, currentRatio, dll
  → Owner Dashboard: businessHealth (skor 0-100), overdue, pending
  → Occupancy: kamar operable vs promote

END
```

---

## D. REKOMENDASI PERBAIKAN

### 🔴 KRITIS — Harus diperbaiki segera

| # | Rekomendasi | File Terkait | Dampak |
|---|------------|-------------|--------|
| R1 | **Jadikan Auto Journal Lite BLOCKING, bukan best-effort** untuk semua sumber operasional. Saat ini hanya DEPOSIT_SETTLEMENT yang blocking. Jika jurnal gagal, approval tetap jalan dan data keuangan tidak balance dengan operasional. | `accounting-posting.service.ts`, semua pemanggil `post*NoTx` | Laporan keuangan tidak akurat jika best-effort gagal |
| R2 | **Tambahkan mekanisme backfill/reconciliation** yang rutin membandingkan data operasional (invoice payments, expenses) dengan jurnal yang sudah diposting, lalu membuat jurnal yang hilang. | `accounting-posting.service.ts` `backfillAutoJournal` sudah ada tapi perlu otomatisasi | Jurnal hilang tidak pernah terisi |

### 🟠 TINGGI — Perlu diperbaiki

| # | Rekomendasi | File Terkait | Dampak |
|---|------------|-------------|--------|
| R3 | **Hapus `catch` di `isBookingSchemaDriftError`** — error seharusnya tidak di-swallow | `tenant-bookings.service.ts:222` | Race condition bisa membuat booking tanpa lock |
| R4 | **Tambah balanceSheet method** di `reports.service.ts` — saat ini tidak ada balance sheet, hanya balanceSheetDraft di finance.service yang kurang lengkap | `reports.service.ts` | Owner tidak bisa lihat neraca formal |
| R5 | **Jadikan deposit ledger BLOCKING (bukan best-effort)** — saat ini deposit diterima di booking path tapi ledger bisa gagal | `payment-submissions.service.ts:483` | Deposit tidak tercatat di ledger |

### 🟡 MENENGAH

| # | Rekomendasi | File Terkait |
|---|------------|-------------|
| R6 | Tambah guard untuk mencegah create invoice pada stay yang sudah COMPLETED | `invoices.service.ts:289-290` |
| R7 | Auto-close sebaiknya memiliki warning terlebih dahulu ke admin via notifikasi | `accounting-period-close.service.ts` |

---

## E. RINGKASAN RISIKO

| Area | Risiko | Severitas |
|------|--------|-----------|
| **Uang masuk (payment)** | Auto Journal best-effort → laporan keuangan bisa tidak balance dengan realita | 🔴 KRITIS |
| **Invoice lifecycle** | Jurnal ISSUED dan reversal best-effort → invoice bisa tidak tercatat di akuntansi | 🔴 KRITIS |
| **Deposit** | Deposit ledger best-effort saat diterima (resiko pincang), tapi settlement blocking ✅ | 🟠 TINGGI |
| **Renewal** | ✅ Aman — state machine penuh, guard deadline, sweeper hibrida | ✅ |
| **Checkout** | ✅ Aman — guard invoice, auto-ticket inspeksi, settlement blocking | ✅ |
| **Auto-Ops** | ✅ Aman — sequential dengan mutex, idempoten | ✅ |
| **Laporan** | Balance Sheet tidak ada, sisanya ✅ exclude DRAFT/CANCELLED | 🟡 MENENGAH |
| **Unit Test** | 26/26 hijau ✅ | ✅ |

---

## F. KESIMPULAN

Realita kode saat ini **SUDAH SESUAI** dengan aturan bisnis owner untuk:

1. ✅ **DP = 30%** dari sewa, perhitungan konsisten di booking dan renewal
2. ✅ **Expiry = 3 jam** flat di semua helper booking
3. ✅ **Partial payment diblokir** — dua-nominal gate (DP tepat / lunas penuh)
4. ✅ **Remove payment diblokir** saat OCCUPIED
5. ✅ **Renewal state machine** — 7 status, invoice DP terpisah, deadline H+7, sweeper
6. ✅ **Checkout guard** — invoice belum lunas = block, deposit settlement blocking
7. ✅ **Auto-Ops** — 13 job sequential dengan mutex, idempoten
8. ✅ **Unit test** 26/26 hijau

**KEKURANGAN UTAMA:** Auto Journal Lite yang **best-effort** di 5 dari 8 sumber jurnal. Ini adalah **satu-satunya risiko kritis** yang bisa membuat laporan keuangan tidak balance dengan data operasional. Jika Anda menginginkan laporan keuangan 100% kredibel, semua jurnal harus blocking (seperti DEPOSIT_SETTLEMENT yang sudah benar).

---
*Laporan ini dibuat berdasarkan audit kode langsung pada backend commit `0a83dbd` (2026-06-14).*