const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getUtilityBillingCycle,
  getUtilityAllowanceMonths,
  toUtilityCycleInstantRange,
} = require('../../dist/common/business/utility-billing-cycle.helper.js');

test('siklus utilitas mengikuti tanggal check-in tenant', () => {
  const cycle = getUtilityBillingCycle(
    new Date('2026-07-05T00:00:00.000Z'),
    new Date('2026-08-04T12:00:00.000Z'),
  );

  assert.equal(cycle.start.toISOString(), '2026-07-05T00:00:00.000Z');
  assert.equal(cycle.end.toISOString(), '2026-08-05T00:00:00.000Z');
  assert.equal(cycle.key, '2026-07-05');
});

test('siklus tanggal 31 ter-clamp aman pada Februari', () => {
  const cycle = getUtilityBillingCycle(
    new Date('2026-01-31T00:00:00.000Z'),
    new Date('2026-03-01T12:00:00.000Z'),
  );

  assert.equal(cycle.start.toISOString(), '2026-02-28T00:00:00.000Z');
  assert.equal(cycle.end.toISOString(), '2026-03-31T00:00:00.000Z');
});

test('periode sewa lunas menjadi siklus kuota saat tenant memperpanjang', () => {
  const cycle = getUtilityBillingCycle(
    new Date('2026-01-05T00:00:00.000Z'),
    new Date('2026-08-17T12:00:00.000Z'),
    {
      start: new Date('2026-08-12T00:00:00.000Z'),
      end: new Date('2026-09-12T00:00:00.000Z'),
    },
  );

  assert.equal(cycle.start.toISOString(), '2026-08-12T00:00:00.000Z');
  assert.equal(cycle.end.toISOString(), '2026-09-12T00:00:00.000Z');
  assert.equal(cycle.key, '2026-08-12');
});

test('perpanjangan tiga bulan menerima tiga kuota bulanan', () => {
  assert.equal(getUtilityAllowanceMonths({
    start: new Date('2026-08-12T00:00:00.000Z'),
    end: new Date('2026-11-12T00:00:00.000Z'),
  }), 3);
});

test('batas date-only siklus dikonversi ke tengah malam Jakarta untuk telemetry', () => {
  const range = toUtilityCycleInstantRange({
    start: new Date('2026-07-05T00:00:00.000Z'),
    end: new Date('2026-08-05T00:00:00.000Z'),
  });
  assert.equal(range.start.toISOString(), '2026-07-04T17:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-08-04T17:00:00.000Z');
});
