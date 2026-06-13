const test = require('node:test');
const assert = require('node:assert');
const C = require('../../dist/modules/accounting/cashflow-classifier.js');

test('isCashLine — kas = cashAccountId atau prefix 10, BUKAN 11 (AR/piutang) [F-01]', () => {
  assert.strictEqual(C.isCashLine('1000', null), true);
  assert.strictEqual(C.isCashLine('1010', null), true);
  assert.strictEqual(C.isCashLine(null, 5), true);       // ber-cashAccountId
  assert.strictEqual(C.isCashLine('1100', null), false); // PIUTANG/AR — inti bug F-01
  assert.strictEqual(C.isCashLine('4000', null), false); // pendapatan
  assert.strictEqual(C.isCashLine(null, null), false);
});

test('classifyCashflow — AR (1100) TIDAK dihitung sebagai kas [F-01]', () => {
  const r = C.classifyCashflow([
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1010', cashAccountId: 1, debitRupiah: 1700000, creditRupiah: 0 },
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1100', cashAccountId: null, debitRupiah: 0, creditRupiah: 1700000 }, // sisi AR — diabaikan
  ]);
  assert.strictEqual(r.operatingInTotal, 1700000);
  assert.strictEqual(r.operatingOutTotal, 0);
  assert.strictEqual(r.netRupiah, 1700000);
  assert.strictEqual(r.operatingCashIn.length, 1);
  assert.strictEqual(r.operatingCashIn[0].sourceType, 'INVOICE_PAYMENT');
});

test('classifyCashflow — kategori distinct tanpa double-count [F-19/F-20]', () => {
  const r = C.classifyCashflow([
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1010', cashAccountId: 1, debitRupiah: 1000000, creditRupiah: 0 },
    { sourceType: 'EXPENSE',         coaCode: '1000', cashAccountId: 2, debitRupiah: 0, creditRupiah: 300000 },
    { sourceType: 'FIXED_ASSET',     coaCode: '1000', cashAccountId: 2, debitRupiah: 0, creditRupiah: 500000 },
    { sourceType: 'OPENING_BALANCE', coaCode: '1000', cashAccountId: 2, debitRupiah: 200000, creditRupiah: 0 },
  ]);
  assert.strictEqual(r.operatingInTotal, 1000000);  // hanya INVOICE_PAYMENT
  assert.strictEqual(r.operatingOutTotal, 300000);  // hanya EXPENSE
  assert.strictEqual(r.investingCashOut, 500000);   // FIXED_ASSET keluar operating
  assert.strictEqual(r.financingCashIn, 200000);    // OPENING_BALANCE
  assert.strictEqual(r.netRupiah, 400000);          // 1.000.000-300.000-500.000+200.000
});

test('classifyCashflow — deposit titipan sementara operating (sampai F1-9)', () => {
  const r = C.classifyCashflow([
    { sourceType: 'DEPOSIT_RECEIVED', coaCode: '1010', cashAccountId: 1, debitRupiah: 500000, creditRupiah: 0 },
  ]);
  assert.strictEqual(r.operatingInTotal, 500000);
  assert.strictEqual(r.netRupiah, 500000);
});
