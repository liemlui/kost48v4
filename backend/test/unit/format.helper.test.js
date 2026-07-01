const test = require('node:test');
const assert = require('node:assert');
const F = require('../../dist/common/utils/format.helper.js');

// --- formatRupiah ---

test('formatRupiah — formats integer', () => {
  assert.strictEqual(F.formatRupiah(1500000), 'Rp1.500.000');
});

test('formatRupiah — formats zero', () => {
  assert.strictEqual(F.formatRupiah(0), 'Rp0');
});

test('formatRupiah — formats null as Rp0', () => {
  assert.strictEqual(F.formatRupiah(null), 'Rp0');
});

test('formatRupiah — formats undefined as Rp0', () => {
  assert.strictEqual(F.formatRupiah(undefined), 'Rp0');
});

test('formatRupiah — formats NaN as Rp0', () => {
  assert.strictEqual(F.formatRupiah(NaN), 'Rp0');
});

test('formatRupiah — formats negative number with minus sign', () => {
  assert.strictEqual(F.formatRupiah(-50000), '-Rp50.000');
});

test('formatRupiah — formats small number without thousands separator', () => {
  assert.strictEqual(F.formatRupiah(750), 'Rp750');
});

test('formatRupiah — formats large number with multiple separators', () => {
  assert.strictEqual(F.formatRupiah(1234567890), 'Rp1.234.567.890');
});

// --- formatPhone ---

test('formatPhone — formats 62-prefix number', () => {
  assert.strictEqual(F.formatPhone('6281234567890'), '0812-3456-7890');
});

test('formatPhone — returns empty for null', () => {
  assert.strictEqual(F.formatPhone(null), '');
});

test('formatPhone — returns empty for undefined', () => {
  assert.strictEqual(F.formatPhone(undefined), '');
});

test('formatPhone — returns empty string for empty input', () => {
  assert.strictEqual(F.formatPhone(''), '');
});

test('formatPhone — strips non-digit characters and formats', () => {
  assert.strictEqual(F.formatPhone('0812-3456-7890'), '0812-3456-7890');
});

test('formatPhone — handles short number (< 10 digits)', () => {
  assert.strictEqual(F.formatPhone('081234567'), '081234567');
});

// --- formatDateToLongWIB ---

test('formatDateToLongWIB — formats Date object', () => {
  const date = new Date('2026-06-15T00:00:00.000Z');
  assert.strictEqual(F.formatDateToLongWIB(date), '15 Juni 2026');
});

test('formatDateToLongWIB — formats ISO string', () => {
  assert.strictEqual(F.formatDateToLongWIB('2026-06-15'), '15 Juni 2026');
});

test('formatDateToLongWIB — returns empty for null', () => {
  assert.strictEqual(F.formatDateToLongWIB(null), '');
});

test('formatDateToLongWIB — returns empty for undefined', () => {
  assert.strictEqual(F.formatDateToLongWIB(undefined), '');
});

test('formatDateToLongWIB — returns empty for invalid date string', () => {
  assert.strictEqual(F.formatDateToLongWIB('not-a-date'), '');
});

test('formatDateToLongWIB — handles end of year', () => {
  const date = new Date('2026-12-31T00:00:00.000Z');
  assert.strictEqual(F.formatDateToLongWIB(date), '31 Desember 2026');
});

test('formatDateToLongWIB — handles start of year', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');
  assert.strictEqual(F.formatDateToLongWIB(date), '1 Januari 2026');
});

test('formatDateToLongWIB uses WIB calendar date near UTC day boundary', () => {
  const date = new Date('2026-06-14T18:00:00.000Z');
  assert.strictEqual(F.formatDateToLongWIB(date), '15 Juni 2026');
});

// --- truncate ---

test('truncate — returns full text when under maxLength', () => {
  assert.strictEqual(F.truncate('Hello world', 50), 'Hello world');
});

test('truncate — truncates and appends ellipsis', () => {
  const long = 'Ini adalah kalimat yang sangat panjang untuk diuji';
  const result = F.truncate(long, 20);
  assert.ok(result.endsWith('...'), 'should end with ellipsis');
  assert.strictEqual(result.length, 23); // 20 + '...'
  assert.strictEqual(result.slice(0, 3), 'Ini');
});

test('truncate — returns empty for null', () => {
  assert.strictEqual(F.truncate(null), '');
});

test('truncate — returns empty for undefined', () => {
  assert.strictEqual(F.truncate(undefined), '');
});

test('truncate — uses default maxLength of 100', () => {
  const long = 'x'.repeat(150);
  const result = F.truncate(long);
  assert.strictEqual(result.length, 103); // 100 + '...'
  assert.ok(result.endsWith('...'));
});

// --- normalizeName ---

test('normalizeName — title-cases each word', () => {
  assert.strictEqual(F.normalizeName('budi santoso'), 'Budi Santoso');
});

test('normalizeName — trims whitespace', () => {
  assert.strictEqual(F.normalizeName('  ahmad  firmansyah  '), 'Ahmad Firmansyah');
});

test('normalizeName — returns empty for null', () => {
  assert.strictEqual(F.normalizeName(null), '');
});

test('normalizeName — returns empty for undefined', () => {
  assert.strictEqual(F.normalizeName(undefined), '');
});

test('normalizeName — handles single word', () => {
  assert.strictEqual(F.normalizeName('siti'), 'Siti');
});

test('normalizeName — collapses multiple spaces', () => {
  assert.strictEqual(F.normalizeName('ani   rahmania'), 'Ani Rahmania');
});
