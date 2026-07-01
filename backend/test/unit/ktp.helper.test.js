const test = require('node:test');
const assert = require('node:assert');
const KTP = require('../../dist/common/utils/ktp.helper.js');

test('isValidKTP — returns true for valid 16-digit NIK (male)', () => {
  // 352001 150690 0001 — male, born 15-06-1990
  assert.strictEqual(KTP.isValidKTP('3520011506900001'), true);
});

test('isValidKTP — returns true for valid NIK (female, day offset 40+)', () => {
  // 352001 550690 0002 — female, born 15-06-1990 (raw 55 = 15+40)
  assert.strictEqual(KTP.isValidKTP('3520015506900002'), true);
});

test('isValidKTP — returns false for null', () => {
  assert.strictEqual(KTP.isValidKTP(null), false);
});

test('isValidKTP — returns false for undefined', () => {
  assert.strictEqual(KTP.isValidKTP(undefined), false);
});

test('isValidKTP — returns false for empty string', () => {
  assert.strictEqual(KTP.isValidKTP(''), false);
});

test('isValidKTP — returns false for less than 16 digits', () => {
  assert.strictEqual(KTP.isValidKTP('352001150690001'), false);
});

test('isValidKTP — returns false for more than 16 digits', () => {
  assert.strictEqual(KTP.isValidKTP('35200115069000011'), false);
});

test('isValidKTP — returns false for non-digit characters', () => {
  assert.strictEqual(KTP.isValidKTP('35200115A6900001'), false);
});

test('isValidKTP — returns false for impossible month 13', () => {
  assert.strictEqual(KTP.isValidKTP('3520011513900001'), false);
});

test('isValidKTP — returns false for month 00', () => {
  assert.strictEqual(KTP.isValidKTP('3520011500900001'), false);
});

test('isValidKTP — returns false for male birth day 00', () => {
  // raw day 00 → invalid
  assert.strictEqual(KTP.isValidKTP('3520010012900001'), false);
});

test('isValidKTP — returns false for male birth day > 31', () => {
  // raw day 32 → male range valid only 1-31
  assert.strictEqual(KTP.isValidKTP('3520013212900001'), false);
});

test('isValidKTP — returns false for female birth day < 41', () => {
  // raw day 01-40 is male range; female must be 41-71
  assert.strictEqual(KTP.isValidKTP('3520010112900002'), true); // male OK
  assert.strictEqual(KTP.isValidKTP('3520014012900002'), false); // 40 is not valid female
});

test('isValidKTP — returns false for female birth day > 71', () => {
  // 72 > 71
  assert.strictEqual(KTP.isValidKTP('3520017212900002'), false);
});

test('getKTPInfo — returns gender MALE for raw day 1-31', () => {
  const info = KTP.getKTPInfo('3520011506900001');
  assert.strictEqual(info.valid, true);
  assert.strictEqual(info.gender, 'MALE');
  assert.strictEqual(info.birthDate, '1990-06-15');
});

test('getKTPInfo — returns gender FEMALE for raw day 41-71', () => {
  // raw 55 → 55-40 = 15, female
  const info = KTP.getKTPInfo('3520015506900002');
  assert.strictEqual(info.valid, true);
  assert.strictEqual(info.gender, 'FEMALE');
  assert.strictEqual(info.birthDate, '1990-06-15');
});

test('getKTPInfo — extracts province/city/district codes', () => {
  const info = KTP.getKTPInfo('3520011506900001');
  assert.strictEqual(info.provinceCode, '35');
  assert.strictEqual(info.cityCode, '20');
  assert.strictEqual(info.districtCode, '01');
  assert.strictEqual(info.nik, '3520011506900001');
});

test('getKTPInfo — returns valid=false for invalid input', () => {
  const info = KTP.getKTPInfo('12345');
  assert.strictEqual(info.valid, false);
  assert.strictEqual(info.gender, 'MALE');
  assert.strictEqual(info.birthDate, '0000-00-00');
});

test('getKTPInfo — returns valid=false for null', () => {
  const info = KTP.getKTPInfo(null);
  assert.strictEqual(info.valid, false);
  assert.strictEqual(info.nik, '');
});

test('getKTPInfo — century inference: year 90 → 1990 (>= 25)', () => {
  const info = KTP.getKTPInfo('3520011506900001');
  assert.strictEqual(info.birthDate, '1990-06-15');
});

test('getKTPInfo — century inference: year 24 → 2024 (< 25)', () => {
  const info = KTP.getKTPInfo('3520011506240001');
  assert.strictEqual(info.birthDate, '2024-06-15');
});

test('getKTPInfo — century inference: year 05 → 2005 (< 25)', () => {
  const info = KTP.getKTPInfo('3520011506050001');
  assert.strictEqual(info.birthDate, '2005-06-15');
});

test('getKTPInfo — century inference: year 25 → 1925 (>= 25)', () => {
  // year 25, month 01 (valid), day 15 (male) → 1925-01-15
  const info = KTP.getKTPInfo('3520011501250001');
  assert.strictEqual(info.birthDate, '1925-01-15');
});
