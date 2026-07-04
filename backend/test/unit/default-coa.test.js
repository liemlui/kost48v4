'use strict';

/**
 * Unit test: DEFAULT_COA — Chart of Accounts default list
 *
 * Cakupan:
 *   - Semua akun punya properti wajib (code, name, type, normalBalance)
 *   - Semua kode unik
 *   - Akun 4010 (Rent Discount) ada dengan properti yang benar
 *   - Akun yang direferensikan di kode posting (4000, 4010, 4100, 4110, 4200, 4300, 4400) semuanya ada
 */
const test = require('node:test');
const assert = require('node:assert');

const { DEFAULT_COA } = require('../../dist/modules/accounting/constants/default-coa.js');

test('DEFAULT_COA — semua akun punya properti wajib', () => {
  assert.ok(Array.isArray(DEFAULT_COA), 'DEFAULT_COA harus array');
  assert.ok(DEFAULT_COA.length > 0, 'DEFAULT_COA tidak boleh kosong');

  for (const acct of DEFAULT_COA) {
    assert.ok(typeof acct.code === 'string' && acct.code.length > 0, `Akun tanpa code: ${JSON.stringify(acct)}`);
    assert.ok(typeof acct.name === 'string' && acct.name.length > 0, `Akun ${acct.code} tanpa name`);
    assert.ok(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'].includes(acct.type),
      `Akun ${acct.code} type "${acct.type}" tidak valid`);
    assert.ok(['DEBIT', 'CREDIT'].includes(acct.normalBalance),
      `Akun ${acct.code} normalBalance "${acct.normalBalance}" tidak valid`);
  }
});

test('DEFAULT_COA — semua kode unik', () => {
  const codes = DEFAULT_COA.map(a => a.code);
  const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
  assert.strictEqual(duplicates.length, 0, `Kode duplikat: ${[...new Set(duplicates)].join(', ')}`);
});

test('DEFAULT_COA — akun 4010 (Rent Discount) ada dengan properti benar', () => {
  const acct4010 = DEFAULT_COA.find(a => a.code === '4010');
  assert.ok(acct4010, 'Akun 4010 (Rent Discount) harus ada di DEFAULT_COA');
  assert.strictEqual(acct4010.name, 'Rent Discount', '4010.name harus "Rent Discount"');
  assert.strictEqual(acct4010.type, 'REVENUE', '4010.type harus REVENUE (contra-revenue)');
  assert.strictEqual(acct4010.normalBalance, 'DEBIT', '4010.normalBalance harus DEBIT (mengurangi revenue)');
  assert.ok(acct4010.description, '4010 harus punya description');
});

test('DEFAULT_COA — semua kode yang direferensikan di revenueCodeForInvoiceLine ada', () => {
  const requiredCodes = ['4000', '4010', '4100', '4110', '4200', '4300', '4400'];
  const availableCodes = new Set(DEFAULT_COA.map(a => a.code));
  for (const code of requiredCodes) {
    assert.ok(availableCodes.has(code), `Kode ${code} harus ada di DEFAULT_COA (dipakai revenueCodeForInvoiceLine)`);
  }
});
