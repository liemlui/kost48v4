const test = require('node:test');
const assert = require('node:assert');
const C = require('../../dist/modules/accounting/cashflow-classifier.js');

test('cashflow keeps gross inflow and outflow for the same source type', () => {
  const result = C.classifyCashflow([
    {
      sourceType: 'DEPOSIT',
      coaCode: '1010',
      cashAccountId: 1,
      debitRupiah: 500000,
      creditRupiah: 0,
    },
    {
      sourceType: 'DEPOSIT',
      coaCode: '1010',
      cashAccountId: 1,
      debitRupiah: 0,
      creditRupiah: 200000,
    },
  ]);

  assert.strictEqual(result.depositLiabilityIn, 500000);
  assert.strictEqual(result.depositLiabilityOut, 200000);
  assert.strictEqual(result.netRupiah, 300000);
});
