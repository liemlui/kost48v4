# Audit 360° Flow Uang (Jul 2026) — Bukti Bertanggal

> Dipindah apa adanya dari `docs/M04_KEUANGAN.md` (Tahap 3 S2.b4, 23 Sep 2026) pada DOC-GOV-20260922.
> Sifat: **bukti bertanggal**, bukan status aktif. Detail asal: `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md`.
> **Status per temuan** (verifikasi statis 23 Sep 2026): [p1-uang-status-2026-09-23.md](audit-uang-huni-2026-07.md) — P1-01..P1-03 indikasi diperbaiki; P1-04..P1-09 UNKNOWN.

## Audit 360° Flow Uang (Jul 2026)

**Status:** 🟢 90% SEHAT — 3 HIGH, 4 MEDIUM, 2 LOW. Detail → `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md`

### 8 Invarian Keuangan — Status Terkini

| # | Invarian | Status |
|---|----------|--------|
| 1 | Σ debit = Σ kredit | ✅ DB-enforced |
| 2 | Idempotent per (sourceType, sourceId) | ✅ unique constraint |
| 3 | Deposit = LIABILITY (2000), tidak pernah debit | ⚠️ Gate ada, tapi receipt best-effort |
| 4 | Kas = prefix 10, bukan 11 | ✅ F1-3 fix |
| 5 | No-partial menyeluruh | ✅ Gate di create + approve |
| 6 | Trial Balance seimbang | ⚠️ Bisa tidak seimbang jika P1-01 terjadi |
| 7 | Deposit mismatch = 0 | ⚠️ Bisa mismatch jika P1-02 terjadi |
| 8 | Revenue ≠ DRAFT | ✅ F1-7 exclude DRAFT |

### Temuan HIGH — P0 sebelum go-live

| ID | Temuan | Rekomendasi |
|----|--------|-------------|
| **P1-01** | Journal posting **best-effort** (try/catch) di `approveSubmission` — payment approve tp jurnal gagal | Jadikan **blocking** (throw, rollback tx approval) |
| **P1-02** | Deposit ledger **best-effort** (logger.warn) — deposit diterima tp tak tercatat | Jadikan **blocking** |
| **P1-03** | Accounting posting di tx **terpisah** dari business tx — window inconsistency | Unify tx / minimal advisory lock |

> **Status verifikasi 23 Sep 2026 (statis, bukan runtime):** `P1-01`, `P1-02`, dan `P1-03` tidak lagi cocok dengan kode saat ini — posting jurnal dan ledger deposit di-`await` di dalam transaksi bisnis (bukan best-effort) dan error diteruskan ke pemanggil. Bukti: [verifikasi P1 uang](audit-uang-huni-2026-07.md). Angka "3 HIGH" pada header di atas tetap sebagai catatan historis Jul 2026. `P1-04..P1-09` masih UNKNOWN.

### Temuan MEDIUM
P1-04 deposit ledger sourceId dedupe · P1-05 EXPIRED→REJECTED · P1-06 reversal partial gagal · P1-07 pre-check di luar tx. LOW: P1-08 `paidAt` fallback · P1-09 note not verified.

---

**Digabung dari docs/audit/audit-360-huni-2026-07.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

# Audit 360° Flow Huni (Jul 2026) — Bukti Bertanggal

> Dipindah apa adanya dari `docs/M05_SIKLUS_HUNI.md` (S2.c Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922.
> Status temuan tetap seperti tertulis di bawah (Jul 2026); bukan status aktif. Untuk temuan best-effort jurnal lintas modul, verifikasi terbaru ada di [p1-uang-status-2026-09-23.md](audit-uang-huni-2026-07.md).

## Audit 360° Flow Huni — Jul 2026 (M16)

**Status:** 🟢 93% SEHAT — 2 HIGH (✅ FIXED), 4 MEDIUM, 1 LOW. Detail → `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md`

### Temuan HIGH — ✅ FIXED

| ID | Temuan | Fix |
|----|--------|-----|
| P2-01 | BookingSource hardcode `WEBSITE` di portal tenant | Tambah `PORTAL` ke enum LeadSource (🧬) + ganti kode |
| P2-02 | Tidak ada guard checkout ≤ `plannedCheckOutDate` di `createRequest` | Tolak jika `requestedDate > plannedCheckOutDate` |

### Temuan MEDIUM
P2-03 `WEBSITE` untuk publik ✅ VALID · P2-04 lock stay ✅ FIXED · P2-05 damage charge ✅ VALID · P2-06 deposit vs meter ✅ VALID. LOW: P2-07 linkTo masih valid.

### 10 Nota Positif
1. Fase V compliance penuh · 2. FOR UPDATE di semua titik rawan · 3. Cross-block checkout vs renew · 4. Dedupe tiket CHECKOUT_INSPECTION · 5. Room readiness gate · 6. Rent-loyalty (D-16) · 7. Deposit = Room.defaultDepositRupiah · 8. Gate dua-nominal-sah · 9. Notifikasi lengkap · 10. Raw SQL INSERT

---

## 🆕 Deep Audit Siklus Huni — 29 Jul 2026 (Reasonix)

**Auditor:** Reasonix (deep audit terhadap laporan M16 + kode sumber).  
**Metode:** verifikasi line-number claims di 7 file backend + `grep` seluruh `.catch()` di `backend/src`.  
**Kesimpulan:** Audit M16 85% benar tapi **under-count best-effort journal 3× lipat** (3 → 9 titik) dan melewatkan modul `payment-submissions`.

### Temuan best-effort journal LENGKAP (9 titik)

| ID | Lokasi | Deskripsi | Severity | Tercatat M16? |
|----|--------|-----------|----------|---------------|
| **HS-01** | `tenant-bookings.service.ts:362-364` | Jurnal invoice booking approval | 🔴 HIGH | ✅ P1-01 |
| **HS-02** | `stays-renewal.service.ts:366-373` | Jurnal invoice settlement renewal | 🔴 HIGH | ✅ P1-02 |
| **HS-03** | `stays.service.ts:831-837` | Jurnal invoice denda (damage) saat complete | 🔴 HIGH | ✅ P1-03 |
| **HS-04** | `stays.service.ts:447-453` | Jurnal deposit LIABILITY saat walk-in check-in | 🔴 HIGH | ❌ **HILANG** |
| **HS-05** | `stays.service.ts:512-519` | Jurnal invoice sewa awal saat walk-in check-in | 🔴 HIGH | ❌ **HILANG** |
| **HS-06** | `stays-renewal.service.ts:196-201` | Jurnal invoice DP renewal | 🔴 HIGH | ❌ **HILANG** |
| **HS-07** | `payment-submissions.service.ts:898-902` | Deposit ledger `recordDepositReceivedTx` — try/catch swallow → ledger bisa bolong | 🔴 **CRITICAL** | ❌ **HILANG** |
| **HS-08** | `payment-submissions.service.ts:903-916` | Jurnal deposit LIABILITY saat approve submission | 🔴 HIGH | ❌ **HILANG** |
| **HS-09** | `room-transfer.service.ts:256` | Jurnal invoice room transfer | 🟠 MEDIUM | ❌ **HILANG** |

### Koreksi severity S-01 (cross-block race condition)

**S-01** — cross-block renew/checkout di luar transaction (`renew-requests.service.ts:54-61`, `checkout-requests.service.ts:73-80`). Pengecekan `prisma.renewRequest.findFirst` / `prisma.checkoutRequest.findFirst` dilakukan SEBELUM `$transaction`. **🆕 KOREKSI Codex Sol:** `renewRequest.createRequest()` TIDAK pakai `$transaction` sama sekali — lebih parah dari klaim awal. Celah: antara `findFirst` dan create, request bisa dibuat dari sesi lain.
**Severity dikoreksi:** MEDIUM → 🔴 **HIGH** (bisa menghasilkan renew + checkout bersamaan untuk stay yang sama).

### Cross-reference ke Fase AN hardening keuangan

HS-07 dan HS-08 tumpang tindih dengan **Fase AN** (`fase-an-hardening-keuangan`):
- **AN-01** (P1-02 keuangan) = HS-07 — deposit ledger blocking di `payment-submissions.service.ts:898-915`
- **AN-02** (P1-01 keuangan) = journal posting blocking di `payment-submissions.service.ts:817-836`

HS-01 s/d HS-06 dan HS-09 adalah tambahan murni dari sisi siklus huni — belum tercakup Fase AN. Koordinasikan perbaikan agar pola blocking seragam di semua modul (AN-03).

### Risk rating dikoreksi

| Sebelum (M16) | Sesudah (deep audit) |
|---|---|
| 🟡 MODERATE — 3 HIGH, 2 MEDIUM, 2 LOW | 🔴 **HIGH** — 1 CRITICAL, 8 HIGH, 1 MEDIUM, 2 LOW |

### Rekomendasi prioritas (direvisi)

1. **HS-07** (AN-01) — Deposit ledger blocking — PALING URGENT
2. **HS-08** (AN-02) — Deposit liability journal blocking
3. **HS-01 s/d HS-06, HS-09** — Seragamkan SEMUA journal posting jadi blocking (AN-03)
4. **S-01** — Pindahkan cross-block renew/checkout ke dalam transaction
5. Pertahankan S-02/S-03/S-04 (sudah benar)
6. Verifikasi `prepay-extension.service.ts` (belum tersentuh audit)
7. Verifikasi B-08 (`stays.cancel` stay promoted — M05 klaim "KODE FIXED/UAT PENDING")
8. Verifikasi sweeper belongings 30 hari (F3-15) — runtime check

---

**Digabung dari docs/audit/p1-uang-status-2026-09-23.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

# Status Temuan P1-01..P1-09 (Audit 360° Flow Uang, Jul 2026) — Verifikasi 23 Sep 2026

Jenis bukti: **verifikasi statis source** (membaca kode), **bukan** verifikasi runtime.
Baseline: HEAD `9512ad73` (setelah commit dokumentasi 23 Sep 2026). Tidak ada test/build/server/hook yang dijalankan.
Rujukan asal temuan: `docs/M04_KEUANGAN.md` §`## Audit 360° Flow Uang (Jul 2026)` dan arsip `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md`.

## Metode

Diperiksa pola pada jalur pemanggilan posting jurnal dan deposit ledger: apakah panggilan di-`await` di dalam transaksi bisnis, apakah dibungkus `try/catch` yang menelan error, apakah service terkait menelan error secara internal, dan transaksi (`tx`) mana yang dipakai.

## Hasil

| ID | Klaim M04 (Jul 2026) | Kondisi kode 23 Sep 2026 | Bukti | Status |
|---|---|---|---|---|
| **P1-01** | Jurnal *best-effort* (`try/catch`) di `approveSubmission` | Posting di-`await` di dalam transaksi bisnis tanpa `catch` lokal; `postBalancedJournalTx` melempar `InternalServerErrorException`; `catch` terluar **rethrow** → gagal jurnal = rollback approval | `payment-submissions.service.ts:594`, `:816-819`, `:1018-1096` (`:1095` rethrow); `accounting-posting.service.ts:1342-1386` | **Indikasi diperbaiki** (statis) |
| **P1-02** | Deposit ledger *best-effort* (`logger.warn`) | `recordDepositReceivedTx`/`recordDepositSettlementTx` di-`await` di dalam `tx`; `deposit-ledger.service.ts` **tidak memiliki satu pun** `try/catch` atau `logger.warn` | `payment-submissions.service.ts:865-879`; `stays.service.ts:1127`, `:1567`, `:1742`; `booking-sweep.service.ts:211`; `deposit-ledger.service.ts:159-198` | **Indikasi diperbaiki** (statis) |
| **P1-03** | Posting di transaksi **terpisah** dari transaksi bisnis | Posting memakai `tx` yang sama dengan tulisan bisnis (`postInvoiceIssuedTx(tx,…)`, `postInvoicePaymentTx(tx,…)`, `postDepositReceivedForStayTx(tx,…)`) | `payment-submissions.service.ts:816`, `:818`, `:880`; `accounting-posting.service.ts:1343` | **Indikasi diperbaiki** (statis) |
| **P1-04..P1-07** (MEDIUM) | Dedupe sourceId, EXPIRED→REJECTED, reversal partial, pre-check di luar tx | **Belum diperiksa** | — | UNKNOWN |
| **P1-08..P1-09** (LOW) | `paidAt` fallback, note not verified | **Belum diperiksa** | — | UNKNOWN |

## Catatan residual (temuan baru dari verifikasi ini)

1. **Jejak `journalPending`.** Nama field itu tinggal sebagai komentar warisan (`payment-submissions.service.ts:1104`) beserta metode retry jurnal (`:1100-1194`); pencarian tidak menemukan penulisan field tersebut lagi. **Belum diverifikasi** apakah endpoint retry masih terekspos dan apakah masih ada submission lama berstatus `journalPending`.
2. **Jalur senyap pada ledger deposit.** `recordDepositReceivedTx` mengembalikan `null` tanpa error bila `amount <= 0` (`deposit-ledger.service.ts:161`) atau stay tidak ditemukan (`:176`). Artinya ada jalur "deposit diterima tanpa entri ledger" yang tidak memicu kegagalan. Sempit, karena pemanggil baru saja memperbarui stay pada transaksi yang sama, tetapi polanya sejenis dengan risiko yang dilaporkan P1-02.

## Batas bukti

- Verifikasi **statis**; tidak membuktikan perilaku runtime dan tidak menggantikan test. Gate uang (`npm run test:unit` backend + M04) tetap tidak dijalankan pada task ini.
- Hanya jalur yang disebut di tabel yang diperiksa. Jalur lain (mis. reversal, sweeper lain, posting expense) **tidak** diperiksa.
- Status "indikasi diperbaiki" berlaku untuk pola yang diperiksa, **bukan** jaminan tidak ada celah lain.
- Temuan `P1-04..P1-09` tetap UNKNOWN sampai diperiksa.
