const test = require('node:test');
const assert = require('node:assert');
const H = require('../../dist/modules/auto-ops/ac-cleaning.helper.js');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const NOW = new Date();

test('estimateKwhPerDay — watt × jam / 1000', () => {
  assert.strictEqual(H.estimateKwhPerDay(400, 8), 3.2);
  assert.strictEqual(H.estimateKwhPerDay(0, 8), 0);
  assert.strictEqual(H.estimateKwhPerDay(450, 0), 0);
});

test('NEVER — belum pernah dicuci → due', () => {
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: null, acCleanIntervalDays: 90, acWattage: 400, acUsageHoursPerDay: 8 },
    NOW,
  );
  assert.strictEqual(r.due, true);
  assert.strictEqual(r.reason, 'NEVER');
});

test('INTERVAL — lewat interval hari → due (reason INTERVAL)', () => {
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: daysAgo(91), acCleanIntervalDays: 90, acWattage: 400, acUsageHoursPerDay: 8 },
    NOW,
  );
  assert.strictEqual(r.due, true);
  assert.strictEqual(r.reason, 'INTERVAL');
});

test('KWH — pemicu dini saat kWh estimasi tinggi walau interval belum lewat', () => {
  // 800W × 12h = 9.6 kWh/hari; 30 hari = 288 kWh ≥ ambang 200 → KWH (interval 90 belum lewat)
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: daysAgo(30), acCleanIntervalDays: 90, acWattage: 800, acUsageHoursPerDay: 12 },
    NOW,
    { kwhThreshold: 200 },
  );
  assert.strictEqual(r.due, true);
  assert.strictEqual(r.reason, 'KWH');
  assert.ok(r.estimatedKwh >= 200);
});

test('TIDAK due — interval belum lewat & kWh estimasi rendah', () => {
  // 400W × 8h = 3.2 kWh/hari; 10 hari = 32 kWh < 200, interval 90 belum lewat
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: daysAgo(10), acCleanIntervalDays: 90, acWattage: 400, acUsageHoursPerDay: 8 },
    NOW,
    { kwhThreshold: 200 },
  );
  assert.strictEqual(r.due, false);
  assert.strictEqual(r.reason, null);
});

test('default dipakai bila acWattage/acUsageHoursPerDay kosong', () => {
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: daysAgo(5), acCleanIntervalDays: 90, acWattage: null, acUsageHoursPerDay: null },
    NOW,
  );
  // default 400W × 8h = 3.2 kWh/hari
  assert.strictEqual(r.kwhPerDay, 3.2);
});

test('kwhThreshold=0 menonaktifkan pemicu dini', () => {
  const r = H.evaluateAcCleaning(
    { acLastCleanedAt: daysAgo(30), acCleanIntervalDays: 90, acWattage: 800, acUsageHoursPerDay: 12 },
    NOW,
    { kwhThreshold: 0 },
  );
  assert.strictEqual(r.due, false);
});
