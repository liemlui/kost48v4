const test = require('node:test');
const assert = require('node:assert');
const R = require('../../dist/modules/accounting/financial-ratios.helper.js');

test('expenseRatioPercent — F-02: (expense/revenue)x100, bukan expensex100', () => {
  assert.strictEqual(R.expenseRatioPercent(1000000, 4000000), 25);  // 1jt/4jt = 25% (kriteria selesai F1-4)
  assert.strictEqual(R.expenseRatioPercent(2000000, 4000000), 50);
  assert.strictEqual(R.expenseRatioPercent(0, 4000000), 0);
  assert.strictEqual(R.expenseRatioPercent(1000000, 0), 0);         // revenue 0 -> 0, bukan Infinity/1e8
});

test('sumLinesByPrefix — kas 10 (bukan AR 11), inventory 12, currentLiab 20-23 [F-18/F-03]', () => {
  const lines = [
    { type: 'ASSET', code: '1000', balanceRupiah: 500000 },    // kas
    { type: 'ASSET', code: '1010', balanceRupiah: 1500000 },   // bank
    { type: 'ASSET', code: '1100', balanceRupiah: 9000000 },   // AR/piutang — BUKAN kas
    { type: 'ASSET', code: '1200', balanceRupiah: 300000 },    // inventory
    { type: 'ASSET', code: '1500', balanceRupiah: 7000000 },   // fixed asset
    { type: 'LIABILITY', code: '2000', balanceRupiah: 500000 }, // deposit titipan
    { type: 'LIABILITY', code: '2100', balanceRupiah: 200000 }, // utang usaha
  ];
  assert.strictEqual(R.sumLinesByPrefix(lines, 'ASSET', R.CASH_PREFIXES), 2000000);            // 1000+1010, AR dikecualikan
  assert.strictEqual(R.sumLinesByPrefix(lines, 'ASSET', R.INVENTORY_PREFIXES), 300000);        // 1200
  assert.strictEqual(R.sumLinesByPrefix(lines, 'LIABILITY', R.CURRENT_LIABILITY_PREFIXES), 700000); // 2000+2100 (deposit termasuk)
});
