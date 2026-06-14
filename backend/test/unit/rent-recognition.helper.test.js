const test = require('node:test');
const assert = require('node:assert');
const R = require('../../dist/modules/accounting/rent-recognition.helper.js');

const iso = (d) => d.toISOString().slice(0, 10);

test('monthsForPricingTerm — hanya SMESTERLY/YEARLY > 1', () => {
  assert.strictEqual(R.monthsForPricingTerm('SMESTERLY'), 6);
  assert.strictEqual(R.monthsForPricingTerm('YEARLY'), 12);
  assert.strictEqual(R.monthsForPricingTerm('MONTHLY'), 1);
  assert.strictEqual(R.monthsForPricingTerm('DAILY'), 1);
  assert.strictEqual(R.isDeferredTerm('SMESTERLY'), true);
  assert.strictEqual(R.isDeferredTerm('YEARLY'), true);
  assert.strictEqual(R.isDeferredTerm('MONTHLY'), false);
});

test('splitRentByMonths — Σ tepat = total (sisa ke bulan terakhir)', () => {
  const a = R.splitRentByMonths(5500000, 6); // semester 5.5jt
  assert.strictEqual(a.length, 6);
  assert.strictEqual(a.reduce((s, v) => s + v, 0), 5500000);
  assert.strictEqual(a[0], 916667);
  assert.strictEqual(a[5], 5500000 - 916667 * 5); // 916665

  const b = R.splitRentByMonths(1000000, 12);
  assert.strictEqual(b.reduce((s, v) => s + v, 0), 1000000);

  // N=1 → utuh
  assert.deepStrictEqual(R.splitRentByMonths(1700000, 1), [1700000]);

  // pembagian tak bulat: 100 / 3
  const c = R.splitRentByMonths(100, 3);
  assert.strictEqual(c.reduce((s, v) => s + v, 0), 100);
});

test('buildRentRecognitionSchedule — periode bulanan SMESTERLY', () => {
  const sch = R.buildRentRecognitionSchedule(new Date(Date.UTC(2026, 0, 15)), 'SMESTERLY', 5500000);
  assert.strictEqual(sch.length, 6);
  assert.strictEqual(sch[0].periodIndex, 1);
  assert.strictEqual(iso(sch[0].periodStart), '2026-01-15');
  assert.strictEqual(iso(sch[0].periodEnd), '2026-02-15');
  assert.strictEqual(iso(sch[5].periodStart), '2026-06-15');
  assert.strictEqual(iso(sch[5].periodEnd), '2026-07-15');
  assert.strictEqual(sch.reduce((s, p) => s + p.scheduledAmountRupiah, 0), 5500000);
});

test('buildRentRecognitionSchedule — term pendek → kosong', () => {
  assert.deepStrictEqual(R.buildRentRecognitionSchedule(new Date(), 'MONTHLY', 1700000), []);
  assert.deepStrictEqual(R.buildRentRecognitionSchedule(new Date(), 'DAILY', 225000), []);
});

test('buildRentRecognitionSchedule — clamp akhir bulan (31 Jan)', () => {
  const sch = R.buildRentRecognitionSchedule(new Date(Date.UTC(2026, 0, 31)), 'SMESTERLY', 6000000);
  assert.strictEqual(iso(sch[0].periodStart), '2026-01-31');
  assert.strictEqual(iso(sch[1].periodStart), '2026-02-28'); // clamp Feb
});
