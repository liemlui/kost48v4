const test = require('node:test');
const assert = require('node:assert');

// date.util.js functions are pure — no NestJS DI needed, but parseDateOnly/parseJakartaDateOnly
// throw BadRequestException from @nestjs/common. We test the successful path via require
// and stub-avoid by testing pure date math separately.
const D = require('../../dist/common/utils/date.util.js');

test('startOfDay — returns UTC midnight for a given date', () => {
  const input = new Date('2026-06-15T10:30:00.000Z');
  const result = D.startOfDay(input);
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('startOfDay — preserves date at UTC midnight boundary', () => {
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = D.startOfDay(input);
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('startOfDay — handles end of month', () => {
  const input = new Date('2026-01-31T23:59:59.999Z');
  const result = D.startOfDay(input);
  assert.strictEqual(result.toISOString(), '2026-01-31T00:00:00.000Z');
});

test('endOfDay — returns 23:59:59.999 UTC for a given date', () => {
  const input = new Date('2026-06-15T10:30:00.000Z');
  const result = D.endOfDay(input);
  assert.strictEqual(result.toISOString(), '2026-06-15T23:59:59.999Z');
});

test('endOfDay — handles start of month', () => {
  const input = new Date('2026-02-01T00:00:00.000Z');
  const result = D.endOfDay(input);
  assert.strictEqual(result.toISOString(), '2026-02-01T23:59:59.999Z');
});

test('addDays — adds positive days', () => {
  const input = new Date('2026-06-15T10:00:00.000Z');
  const result = D.addDays(input, 5);
  assert.strictEqual(result.toISOString(), '2026-06-20T00:00:00.000Z');
});

test('addDays — subtracts days with negative argument', () => {
  const input = new Date('2026-06-15T10:00:00.000Z');
  const result = D.addDays(input, -3);
  assert.strictEqual(result.toISOString(), '2026-06-12T00:00:00.000Z');
});

test('addDays — zero days returns same day at midnight', () => {
  const input = new Date('2026-06-15T23:59:59.999Z');
  const result = D.addDays(input, 0);
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('addDays — crosses month boundary', () => {
  const input = new Date('2026-01-30T00:00:00.000Z');
  const result = D.addDays(input, 3);
  assert.strictEqual(result.toISOString(), '2026-02-02T00:00:00.000Z');
});

test('addDays — crosses year boundary', () => {
  const input = new Date('2025-12-30T00:00:00.000Z');
  const result = D.addDays(input, 5);
  assert.strictEqual(result.toISOString(), '2026-01-04T00:00:00.000Z');
});

test('parseDateOnly — valid ISO date string returns start of day', () => {
  const result = D.parseDateOnly('2026-06-15', 'Invalid date');
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('parseDateOnly — throws BadRequestException for invalid string', () => {
  assert.throws(() => D.parseDateOnly('not-a-date', 'Tanggal tidak valid'), {
    name: 'BadRequestException',
    message: 'Tanggal tidak valid',
  });
});

test('parseDateOnly — throws for empty string', () => {
  assert.throws(() => D.parseDateOnly('', 'Required'), {
    name: 'BadRequestException',
    message: 'Required',
  });
});

test('startOfJakartaBusinessDay — UTC+7 offset: 2026-06-15 00:00 WIB = 2026-06-14 17:00 UTC previous day', () => {
  // 2026-06-15 00:00 WIB = 2026-06-14 17:00 UTC
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = D.startOfJakartaBusinessDay(input);
  // startOfJakartaBusinessDay adds 7h then takes UTC date → should be 2026-06-15
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('startOfJakartaBusinessDay — afternoon WIB maps to next UTC day', () => {
  // 2026-06-15 20:00 WIB = 2026-06-15 13:00 UTC
  const input = new Date('2026-06-15T13:00:00.000Z');
  const result = D.startOfJakartaBusinessDay(input);
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('parseJakartaDateOnly — valid date string returns Jakarta business day start', () => {
  const result = D.parseJakartaDateOnly('2026-06-15', 'Invalid');
  // 2026-06-15 WIB = 2026-06-14 17:00 UTC → startOfJakartaBusinessDay → 2026-06-15
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('parseJakartaDateOnly — accepts Date object directly', () => {
  const input = new Date('2026-06-15T10:00:00.000Z');
  const result = D.parseJakartaDateOnly(input, 'Invalid');
  assert.strictEqual(result.toISOString(), '2026-06-15T00:00:00.000Z');
});

test('parseJakartaDateOnly — throws BadRequestException for invalid string', () => {
  assert.throws(() => D.parseJakartaDateOnly('invalid', 'Format tanggal salah'), {
    name: 'BadRequestException',
    message: 'Format tanggal salah',
  });
});

test('parseJakartaDateOnly — throws for invalid Date object', () => {
  assert.throws(() => D.parseJakartaDateOnly(new Date('not-valid'), 'Bad date'), {
    name: 'BadRequestException',
    message: 'Bad date',
  });
});
