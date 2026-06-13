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
