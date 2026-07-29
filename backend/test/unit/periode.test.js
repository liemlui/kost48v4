const test = require('node:test');
const assert = require('node:assert');
const S = require('../../dist/modules/stays/stays.helpers.js');
const iso = (d) => d.toISOString().slice(0, 10);

test('calculatePeriodEnd — end eksklusif', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'DAILY')),   '2026-09-02');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'WEEKLY')),  '2026-09-08');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'MONTHLY')), '2026-10-01');
});
test('addCalendarMonthsClamped — clamp akhir bulan', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,0,31)), 'MONTHLY')), '2026-02-28'); // 31 Jan +1bln → 28 Feb
});
