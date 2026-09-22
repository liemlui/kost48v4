# KOST48 V5 — Keuangan, Pembayaran, Invoice, Akuntansi

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Semua fondasi keuangan: harness verifikasi, pembayaran/invoice, accounting, laporan, dan gate UAT finance.

## Sumber Digabung

- `docs/archieve/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md` - konten dipertahankan
- `docs/archieve/2026-06-16_root_docs_pre_M/10_PEMBAYARAN_INVOICE.md` - konten dipertahankan
- `docs/archieve/2026-06-16_root_docs_pre_M/13_AKUNTANSI_LAPORAN.md` - konten dipertahankan

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.

## Updates — dipindah
- Riwayat historis: [history/changelog/](history/changelog/)
- Aturan aktif & status invarian: [domain/keuangan.md](domain/keuangan.md)

Status invarian: lihat §1 (definisi) & status Jul 2026 di [domain/keuangan.md](domain/keuangan.md).

## Bagian 1 - `docs/archieve/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md`

### 05 — HARNESS VERIFIKASI KEUANGAN (jaring pengaman AI eksekutor)
**Tujuan:** memastikan **hitungan keuangan tetap handal** saat kode disentuh AI lemah. `tsc 0` TIDAK cukup — kode bisa lolos compile tapi salah angka (bukti: bug F-18 = kembaran F-01 yang lolos audit V1). Jalankan harness ini SETELAH tiap task keuangan (dossier 13) dan tiap task uang (dossier 10/12).
**Aturan inti:** kalau salah satu cek di bawah GAGAL → **JANGAN commit**, perbaiki dulu. Kalau tak yakin → STOP & lapor.

---
#### 1. INVARIAN KEUANGAN (HARAM dilanggar — kalau pernah false, ada bug)
1. **Setiap JournalEntry balance:** Σ debit = Σ kredit (DB-enforced; jangan matikan guard `postBalancedJournalTx`).
2. **Idempotent:** 1 (sourceType, sourceId) = maksimal 1 jurnal POSTED non-VOID.
3. **Deposit = LIABILITY** (akun 2000), bukan revenue. Saldo 2000 TIDAK pernah debit (kalau debit → F-24 belum difix).
4. **Kas = akun prefix `10` (1000/1010/1020)**, BUKAN `11` (1100 = PIUTANG). Cashflow/rasio yang menyebut "kas" harus pakai `cashAccountId` atau prefix `10`.
5. **No-partial:** total pembayaran = DP-persis ATAU pelunasan-penuh; invoice tak pernah PARTIAL liar.
6. **Trial Balance seimbang:** total debit = total kredit (sampai ke rupiah).
7. **Rekonsiliasi deposit: mismatch = 0** (snapshot stay = ledger = akun 2000).
8. **Revenue ≠ invoice DRAFT** (DRAFT belum diterbitkan, bukan pendapatan).

#### 2. ⛔ DO-NOT-TOUCH (kode SUDAH BENAR — jangan "diperbaiki")
| Kode | Lokasi | Kenapa jangan disentuh |
|---|---|---|
| `postBalancedJournalTx` (inti jurnal) | `accounting-posting.service.ts:1342-1448` | Guard balance+idempotent+periode OPEN. Mesin jurnal SEHAT. ⚠️ Line numbers diperbarui 2026-07-29 (sebelumnya 1110-1216 — stale). |
| Blok saldo kas E-4 | `accounting-reports.service.ts:837-862` | Saldo per CashAccount = opening + Σ(D−K) line ber-cashAccountId. SUDAH BENAR — F1-3 meniru pola INI, jangan ubah blok ini. |
| 10 fungsi posting (D/K) | `accounting-posting.service.ts:128-849` | Semua balance+idempotent. Hanya F1-8 (settlement guard) yang menambah CEK, bukan ubah jurnal. |
| Trial Balance + opening fallback | `accounting-reports.service.ts:27-95` | Anti-double-count. |
| Tutup buku (closing/reopen versioned) | `accounting-period-close.service.ts` | Paling matang; jangan utak-atik. |
| `recalculateInvoiceTotal` (DISCOUNT−) | `invoices.service.ts:461-480` | Konsisten dgn trigger DB. ⚠️ Line numbers diperbarui 2026-07-29 (sebelumnya 423-442 — stale). |

#### 3. UNIT TEST (zero-dependency — pakai test runner BAWAAN Node, TANPA npm install)
> Proyek belum punya jest. JANGAN install. Pakai `node --test` (Node ≥18) terhadap hasil build `dist/`. Test = file CommonJS di `backend/test/unit/`.
**Cara jalankan:** `cd backend && npm run build && node --test "test/**/*.test.js"` → harus semua PASS (hijau). (Catatan: `node --test test/` GAGAL di Node 22/Windows — pakai pola glob ini.)
**Script siap-pakai (sudah ditambahkan):** di `package.json` → `"test:unit": "node --test \"test/**/*.test.js\""` → jalankan `npm run test:unit`.

##### File 1 — `backend/test/unit/pricing.test.js` (SIAP PAKAI — angka sudah diverifikasi dari kode)
```js
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../dist/modules/tenant-bookings/pricing.helper.js');

test('calculateRentByPricingTerm — tarif bulanan 1.700.000 (owner decision: WEEKLY=0.5, SMESTERLY=5.7, YEARLY=11)', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'DAILY'), 225000);    // 221.000 → bulat naik 5.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'WEEKLY'), 850000);   // 0.5 × 1.700.000 = 850.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'BIWEEKLY'), 1275000); // 0.75 × 1.700.000 = 1.275.000 → 1.275.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'MONTHLY'), 1700000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'SMESTERLY'), 9690000); // 5.7 × 1.700.000 = 9.690.000 → 9.690.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'YEARLY'), 18700000);   // 11.0 × 1.700.000 = 18.700.000 → 18.700.000
});
test('pembulatan naik ke 5.000', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1333000, 'DAILY'), 175000);    // 173.290 → 175.000
  assert.strictEqual(P.roundUpToNearest(1, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(5000, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(0), 0);
  assert.strictEqual(P.roundUpToNearest(-5), 0);
});
test('term tidak valid / rate 0 → 0', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(0, 'MONTHLY'), 0);
  assert.strictEqual(P.calculateRentByPricingTerm(1000000, 'XXX'), 0);
});
test('utilitas included hanya term pendek', () => {
  for (const t of ['DAILY','WEEKLY','BIWEEKLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), true);
  for (const t of ['MONTHLY','SMESTERLY','YEARLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), false);
});
```

##### File 2 — `backend/test/unit/periode.test.js` (SIAP PAKAI — UTC, exclusive end)
```js
const test = require('node:test');
const assert = require('node:assert');
const S = require('../../dist/modules/stays/stays.helpers.js');
const iso = (d) => d.toISOString().slice(0, 10);

test('calculatePeriodEnd — end eksklusif', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'DAILY')),   '2026-09-02');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'WEEKLY')),  '2026-09-08');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'MONTHLY')), '2026-10-01');
});
test('addCalendarMonthsClamped — clamp akhir bulan', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,0,31)), 'MONTHLY')), '2026-02-28'); // 31 Jan +1bln → 28 Feb
});
```

##### File 3 — `backend/test/unit/cashflow-classifier.test.js` (BUAT SAAT F1-3)
Saat F1-3 mengekstrak fungsi classifier kas (deteksi line kas via `cashAccountId != null`, klasifikasi sekali per line), tulis test: line ber-cashAccountId debit → operating-in; line AR (1100) → BUKAN kas (operating-in = 0); OPENING_BALANCE → bukan arus operasi. **DP/angka harapan: lihat skenario emas §5.**

> Fungsi lain (DP 30% = `Math.round(rent*30/100)`, splitRent/Deposit) ada di service (bukan helper murni) — diuji via skenario emas §5, bukan unit test.

#### 4. HARNESS REKONSILIASI (alat audit BAWAAN — jalankan tiap selesai task finance)
| Endpoint | Harapan SEHAT | Kalau GAGAL artinya |
|---|---|---|
| `GET /api/accounting/trial-balance` | `isBalanced: true` (debit=kredit) | ada jurnal tak balance → bug posting |
| `GET /api/deposit-ledger/reconciliation-lite` | `mismatch: 0` | snapshot stay ≠ ledger → bug deposit |
| `GET /api/accounting/deposit-reconciliation` | `reconciliationStatus: MATCHED` (atau OPENING_BALANCE_ONLY) | akun 2000 ≠ operational held → F-24/F-06 |
| `GET /api/accounting/cashflow` | beginning + netCashflow = ending | breakdown arus salah → F1-3 belum benar |
| `GET /api/accounting/financial-ratios` | expenseRatio masuk akal (mis. 25, bukan 1e8); occupancy>0 saat ada penghuni | F-02/F-04/F-18 belum benar |

**Aturan:** jalankan SEBELUM mulai (catat baseline) & SESUDAH task. Angka boleh berubah, tapi invarian §1 harus tetap true.

#### 5. SKENARIO EMAS (end-to-end, angka eksak — verifikasi setelah Fase 1)
Di DB bersih + COA seeded + CashAccount Cash(1000)+Bank(1010) + periode OPEN:
1. Kamar tarif bulanan **1.700.000**, deposit **500.000**. Booking MONTHLY → DP 30% = **510.000**.
2. Tenant bayar DP 510.000 (transfer) → approve → jurnal `INVOICE_PAYMENT` D Bank 510.000 / K AR 510.000. Kamar RESERVED, expiresAt null.
3. Pelunasan = sisa sewa (1.700.000−510.000=1.190.000) + deposit 500.000 = **1.690.000** → approve → kamar OCCUPIED, meter promoted. Deposit → jurnal D Bank / K 2000 (liability) 500.000.
4. **Cek:** trial-balance seimbang; cashflow operating-in bulan ini = 510.000+1.190.000 = **1.700.000** (kas dari pelunasan sewa) — BUKAN angka AR; deposit 500.000 masuk kas tapi kredit 2000 (liability, bukan revenue). reconciliation-lite mismatch=0.
5. Checkout → settlement FULL_REFUND 500.000 → D 2000 / K Bank 500.000 → saldo 2000 kembali 0. reconciliation MATCHED.
> Bila angka cashflow menampilkan mutasi PIUTANG (1100) sebagai "kas" → F1-3 belum benar. Bila expenseRatio = jutaan persen → F1-4 belum benar.

#### 6. GATE PER-TASK (centang sebelum commit task finance)
- [ ] `tsc --noEmit` 0 error.
- [ ] `npm run test:unit` (`node --test "test/**/*.test.js"`) semua PASS (kalau task menyentuh fungsi ber-test).
- [ ] 5 invarian §1 yang relevan tetap true (cek via §4 endpoint).
- [ ] Angka harapan task terpenuhi (lihat "selesai bila" di `08_CHECKLIST` / dossier 13 di domain/keuangan.md).
- [ ] Tidak menyentuh kode di DO-NOT-TOUCH §2.
- Kalau ada yang ✗ → JANGAN commit; perbaiki atau STOP & lapor.


## Bagian 2 - Dossier 10 Pembayaran & Invoice

Aturan aktif: [Kebijakan Pembayaran & Invoice](domain/keuangan.md#kebijakan-pembayaran--invoice) dan [Invarian Pembayaran & Invoice](domain/keuangan.md#invarian-pembayaran--invoice). Snapshot dossier, peta kode, audit, task, dan UAT: [changelog Juni 2026](history/changelog/2026-06.md).



## Bagian 3 - Dossier 13 Akuntansi & Laporan

Aturan aktif: [Kebijakan Akuntansi & Pelaporan](domain/keuangan.md#kebijakan-akuntansi--pelaporan), [Invarian Akuntansi & Pelaporan](domain/keuangan.md#invarian-akuntansi--pelaporan), [Pengakuan Pendapatan, Arus Kas & Rasio](domain/keuangan.md#pengakuan-pendapatan-arus-kas--rasio), dan [Otomasi Biaya dan Penutupan Bulanan](domain/keuangan.md#otomasi-biaya-dan-penutupan-bulanan). Snapshot Juni: [changelog Juni 2026](history/changelog/2026-06.md); catatan test: [changelog Juli 2026](history/changelog/2026-07.md).


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

> **Status verifikasi 23 Sep 2026 (statis, bukan runtime):** `P1-01`, `P1-02`, dan `P1-03` tidak lagi cocok dengan kode saat ini — posting jurnal dan ledger deposit di-`await` di dalam transaksi bisnis (bukan best-effort) dan error diteruskan ke pemanggil. Bukti: [verifikasi P1 uang](audit/p1-uang-status-2026-09-23.md). Angka "3 HIGH" pada header di atas tetap sebagai catatan historis Jul 2026. `P1-04..P1-09` masih UNKNOWN.

### Temuan MEDIUM
P1-04 deposit ledger sourceId dedupe · P1-05 EXPIRED→REJECTED · P1-06 reversal partial gagal · P1-07 pre-check di luar tx. LOW: P1-08 `paidAt` fallback · P1-09 note not verified.
