# 05 — HARNESS VERIFIKASI KEUANGAN (jaring pengaman AI eksekutor)
**Tujuan:** memastikan **hitungan keuangan tetap handal** saat kode disentuh AI lemah. `tsc 0` TIDAK cukup — kode bisa lolos compile tapi salah angka (bukti: bug F-18 = kembaran F-01 yang lolos audit V1). Jalankan harness ini SETELAH tiap task keuangan (dossier 13) dan tiap task uang (dossier 10/12).
**Aturan inti:** kalau salah satu cek di bawah GAGAL → **JANGAN commit**, perbaiki dulu. Kalau tak yakin → STOP & lapor.

---
## 1. INVARIAN KEUANGAN (HARAM dilanggar — kalau pernah false, ada bug)
1. **Setiap JournalEntry balance:** Σ debit = Σ kredit (DB-enforced; jangan matikan guard `postBalancedJournalTx`).
2. **Idempotent:** 1 (sourceType, sourceId) = maksimal 1 jurnal POSTED non-VOID.
3. **Deposit = LIABILITY** (akun 2000), bukan revenue. Saldo 2000 TIDAK pernah debit (kalau debit → F-24 belum difix).
4. **Kas = akun prefix `10` (1000/1010/1020)**, BUKAN `11` (1100 = PIUTANG). Cashflow/rasio yang menyebut "kas" harus pakai `cashAccountId` atau prefix `10`.
5. **No-partial:** total pembayaran = DP-persis ATAU pelunasan-penuh; invoice tak pernah PARTIAL liar.
6. **Trial Balance seimbang:** total debit = total kredit (sampai ke rupiah).
7. **Rekonsiliasi deposit: mismatch = 0** (snapshot stay = ledger = akun 2000).
8. **Revenue ≠ invoice DRAFT** (DRAFT belum diterbitkan, bukan pendapatan).

## 2. ⛔ DO-NOT-TOUCH (kode SUDAH BENAR — jangan "diperbaiki")
| Kode | Lokasi | Kenapa jangan disentuh |
|---|---|---|
| `postBalancedJournalTx` (inti jurnal) | `accounting-posting.service.ts:1110-1216` | Guard balance+idempotent+periode OPEN. Mesin jurnal SEHAT. |
| Blok saldo kas E-4 | `accounting-reports.service.ts:837-862` | Saldo per CashAccount = opening + Σ(D−K) line ber-cashAccountId. SUDAH BENAR — F1-3 meniru pola INI, jangan ubah blok ini. |
| 10 fungsi posting (D/K) | `accounting-posting.service.ts:128-849` | Semua balance+idempotent. Hanya F1-8 (settlement guard) yang menambah CEK, bukan ubah jurnal. |
| Trial Balance + opening fallback | `accounting-reports.service.ts:27-95` | Anti-double-count. |
| Tutup buku (closing/reopen versioned) | `accounting-period-close.service.ts` | Paling matang; jangan utak-atik. |
| `recalculateInvoiceTotal` (DISCOUNT−) | `invoices.service.ts:423-442` | Konsisten dgn trigger DB. |

## 3. UNIT TEST (zero-dependency — pakai test runner BAWAAN Node, TANPA npm install)
> Proyek belum punya jest. JANGAN install. Pakai `node --test` (Node ≥18) terhadap hasil build `dist/`. Test = file CommonJS di `backend/test/unit/`.
**Cara jalankan:** `cd backend && npm run build && node --test test/` → harus semua PASS (hijau).
**Tambah script (opsional, bukan dependensi):** di `package.json` → `"scripts": { "test:unit": "node --test test/" }`.

### File 1 — `backend/test/unit/pricing.test.js` (SIAP PAKAI — angka sudah diverifikasi dari kode)
```js
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../dist/modules/tenant-bookings/pricing.helper.js');

test('calculateRentByPricingTerm — tarif bulanan 1.700.000', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'DAILY'), 225000);    // 221.000 → bulat naik 5.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'WEEKLY'), 765000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'BIWEEKLY'), 1275000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'MONTHLY'), 1700000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'SMESTERLY'), 9350000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'YEARLY'), 17000000);
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

### File 2 — `backend/test/unit/periode.test.js` (SIAP PAKAI — UTC, exclusive end)
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

### File 3 — `backend/test/unit/cashflow-classifier.test.js` (BUAT SAAT F1-3)
Saat F1-3 mengekstrak fungsi classifier kas (deteksi line kas via `cashAccountId != null`, klasifikasi sekali per line), tulis test: line ber-cashAccountId debit → operating-in; line AR (1100) → BUKAN kas (operating-in = 0); OPENING_BALANCE → bukan arus operasi. **DP/angka harapan: lihat skenario emas §5.**

> Fungsi lain (DP 30% = `Math.round(rent*30/100)`, splitRent/Deposit) ada di service (bukan helper murni) — diuji via skenario emas §5, bukan unit test.

## 4. HARNESS REKONSILIASI (alat audit BAWAAN — jalankan tiap selesai task finance)
| Endpoint | Harapan SEHAT | Kalau GAGAL artinya |
|---|---|---|
| `GET /api/accounting/trial-balance` | `isBalanced: true` (debit=kredit) | ada jurnal tak balance → bug posting |
| `GET /api/deposit-ledger/reconciliation-lite` | `mismatch: 0` | snapshot stay ≠ ledger → bug deposit |
| `GET /api/accounting/deposit-reconciliation` | `reconciliationStatus: MATCHED` (atau OPENING_BALANCE_ONLY) | akun 2000 ≠ operational held → F-24/F-06 |
| `GET /api/accounting/cashflow` | beginning + netCashflow = ending | breakdown arus salah → F1-3 belum benar |
| `GET /api/accounting/financial-ratios` | expenseRatio masuk akal (mis. 25, bukan 1e8); occupancy>0 saat ada penghuni | F-02/F-04/F-18 belum benar |

**Aturan:** jalankan SEBELUM mulai (catat baseline) & SESUDAH task. Angka boleh berubah, tapi invarian §1 harus tetap true.

## 5. SKENARIO EMAS (end-to-end, angka eksak — verifikasi setelah Fase 1)
Di DB bersih + COA seeded + CashAccount Cash(1000)+Bank(1010) + periode OPEN:
1. Kamar tarif bulanan **1.700.000**, deposit **500.000**. Booking MONTHLY → DP 30% = **510.000**.
2. Tenant bayar DP 510.000 (transfer) → approve → jurnal `INVOICE_PAYMENT` D Bank 510.000 / K AR 510.000. Kamar RESERVED, expiresAt null.
3. Pelunasan = sisa sewa (1.700.000−510.000=1.190.000) + deposit 500.000 = **1.690.000** → approve → kamar OCCUPIED, meter promoted. Deposit → jurnal D Bank / K 2000 (liability) 500.000.
4. **Cek:** trial-balance seimbang; cashflow operating-in bulan ini = 510.000+1.190.000 = **1.700.000** (kas dari pelunasan sewa) — BUKAN angka AR; deposit 500.000 masuk kas tapi kredit 2000 (liability, bukan revenue). reconciliation-lite mismatch=0.
5. Checkout → settlement FULL_REFUND 500.000 → D 2000 / K Bank 500.000 → saldo 2000 kembali 0. reconciliation MATCHED.
> Bila angka cashflow menampilkan mutasi PIUTANG (1100) sebagai "kas" → F1-3 belum benar. Bila expenseRatio = jutaan persen → F1-4 belum benar.

## 6. GATE PER-TASK (centang sebelum commit task finance)
- [ ] `tsc --noEmit` 0 error.
- [ ] `node --test test/` semua PASS (kalau task menyentuh fungsi ber-test).
- [ ] 5 invarian §1 yang relevan tetap true (cek via §4 endpoint).
- [ ] Angka harapan task terpenuhi (lihat "selesai bila" di CHECKLIST / dossier 13).
- [ ] Tidak menyentuh kode di DO-NOT-TOUCH §2.
- Kalau ada yang ✗ → JANGAN commit; perbaiki atau STOP & lapor.
