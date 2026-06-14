const test = require('node:test');
const assert = require('node:assert');
const P = require('../../dist/modules/auto-ops/auto-ops-period.helper.js');

test('jakartaYearMonth mengikuti pergantian hari WIB', () => {
  assert.deepStrictEqual(P.jakartaYearMonth(new Date('2026-06-30T17:30:00.000Z')), { year: 2026, month: 7 });
});

test('previousJakartaYearMonth menangani batas Januari', () => {
  assert.deepStrictEqual(P.previousJakartaYearMonth(new Date('2026-01-15T00:00:00.000Z')), { year: 2025, month: 12 });
  assert.deepStrictEqual(P.previousJakartaYearMonth(new Date('2026-06-14T00:00:00.000Z')), { year: 2026, month: 5 });
});
