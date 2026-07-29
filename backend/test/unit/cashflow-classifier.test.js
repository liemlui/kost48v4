const test = require('node:test');
const assert = require('node:assert');
const C = require('../../dist/modules/accounting/cashflow-classifier.js');

test('isCashLine — hanya akun dengan cashAccountId atau prefix 10 yang dianggap kas', () => {
  // Kas: punya cashAccountId
  assert.strictEqual(C.isCashLine('1010', 1), true);
  // Kas: prefix 10xx tanpa cashAccountId
  assert.strictEqual(C.isCashLine('1020', null), true);
  // AR (piutang): prefix 11xx, TANPA cashAccountId → BUKAN kas
  assert.strictEqual(C.isCashLine('1100', null), false);
  // Expense: prefix 5000, TANPA cashAccountId → BUKAN kas
  assert.strictEqual(C.isCashLine('5000', null), false);
  // Liability deposit: prefix 2000, TANPA cashAccountId → BUKAN kas
  assert.strictEqual(C.isCashLine('2000', null), false);
});

test('isCashLine — null/undefined aman', () => {
  assert.strictEqual(C.isCashLine(null, null), false);
  assert.strictEqual(C.isCashLine(undefined, undefined), false);
  assert.strictEqual(C.isCashLine('', null), false);
});

test('classifyCashflow — array lines diklasifikasi dengan benar', () => {
  const result = C.classifyCashflow([
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1010', cashAccountId: 1, debitRupiah: 500000, creditRupiah: 0 },
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1010', cashAccountId: 1, debitRupiah: 0, creditRupiah: 200000 },
    { sourceType: 'DEPOSIT', coaCode: '1010', cashAccountId: 1, debitRupiah: 300000, creditRupiah: 0 },
  ]);
  // Operating in: 500000 (INVOICE_PAYMENT debit)
  assert.ok(result.operatingInTotal > 0, 'Harus ada kas masuk operasional');
  // Deposit masuk ke depositLiabilityIn, bukan operating
  assert.ok(result.depositLiabilityIn > 0, 'Deposit harus masuk depositLiabilityIn');
  // Operating out: 200000
  assert.ok(result.operatingOutTotal > 0, 'Harus ada kas keluar operasional');
  // net dihitung
  assert.strictEqual(typeof result.netRupiah, 'number');
});

test('classifyCashflow — array kosong', () => {
  const result = C.classifyCashflow([]);
  assert.strictEqual(result.operatingInTotal, 0);
  assert.strictEqual(result.operatingOutTotal, 0);
  assert.strictEqual(result.netRupiah, 0);
});

test('classifyCashflow — AR (1100) tidak masuk kas', () => {
  const result = C.classifyCashflow([
    { sourceType: 'INVOICE_PAYMENT', coaCode: '1100', cashAccountId: null, debitRupiah: 100000, creditRupiah: 0 },
  ]);
  assert.strictEqual(result.operatingInTotal, 0, 'AR tidak boleh dihitung sebagai kas masuk');
  assert.strictEqual(result.netRupiah, 0);
});
