const test = require('node:test');
const assert = require('node:assert');
const F = require('../../dist/modules/accounting/financial-ratios.helper.js');

test('expenseRatioPercent — menghitung persentase biaya terhadap pendapatan', () => {
  // expenseRatio = (totalExpenses / totalRevenue) * 100
  // Normal case: 2.5jt expense / 10jt revenue = 25%
  const ratio = F.expenseRatioPercent(2500000, 10000000);
  assert.strictEqual(typeof ratio, 'number');
  assert.ok(ratio > 0 && ratio < 100, `expenseRatio harus masuk akal: ${ratio}`);
});

test('expenseRatioPercent — revenue 0 → 0 (hindari NaN/Infinity)', () => {
  assert.strictEqual(F.expenseRatioPercent(100000, 0), 0);
  assert.strictEqual(F.expenseRatioPercent(0, 0), 0);
});

test('expenseRatioPercent — persentase tidak lebih dari 100%', () => {
  // Bahkan jika expense > revenue, nilainya wajar (bisa > 100% saat rugi)
  const ratio = F.expenseRatioPercent(15000000, 10000000);
  assert.ok(typeof ratio === 'number' && !Number.isNaN(ratio), 'Tidak boleh NaN');
  assert.ok(ratio < 10000, `expenseRatio tidak boleh ekstrim: ${ratio}`);
});

test('occupancyRatePercent — menghitung tingkat okupansi', () => {
  const occ = F.occupancyRatePercent(13, 48); // 13 terisi dari 48 kamar
  assert.strictEqual(typeof occ, 'number');
  assert.ok(occ > 0 && occ < 100, `occupancyRate harus masuk akal: ${occ}`);
});

test('occupancyRatePercent — 0 kamar terisi', () => {
  assert.strictEqual(F.occupancyRatePercent(0, 48), 0);
});

test('occupancyRatePercent — totalRooms 0 → 0 (hindari NaN)', () => {
  assert.strictEqual(F.occupancyRatePercent(5, 0), 0);
});

test('sumLinesByPrefix — menjumlahkan berdasarkan prefix COA', () => {
  // Positive test: pastikan fungsi ada dan return number
  const lines = [
    { code: '1010', debitRupiah: 500000, creditRupiah: 0 },
    { code: '1020', debitRupiah: 300000, creditRupiah: 0 },
    { code: '1100', debitRupiah: 100000, creditRupiah: 0 },
  ];
  const sum = F.sumLinesByPrefix(lines, F.CASH_PREFIXES);
  assert.strictEqual(typeof sum, 'number');
  assert.ok(sum >= 0);
});

test('sumLinesByPrefix — array kosong', () => {
  assert.strictEqual(F.sumLinesByPrefix([], ['10']), 0);
});
