const test = require('node:test');
const assert = require('node:assert');
const M = require('../../dist/common/business/money.helper.js');

test('roundRupiah — bilangan bulat tetap utuh', () => {
  assert.strictEqual(M.roundRupiah(0), 0);
  assert.strictEqual(M.roundRupiah(1700000), 1700000);
  assert.strictEqual(M.roundRupiah(-510300), -510300);
});

test('roundRupiah — pecahan dibulatkan ke terdekat', () => {
  assert.strictEqual(M.roundRupiah(0.4), 0);
  assert.strictEqual(M.roundRupiah(0.6), 1);
  assert.strictEqual(M.roundRupiah(2.49), 2);
  assert.strictEqual(M.roundRupiah(2.51), 3);
});

test('roundRupiah — tie 0,5 dibulatkan MENJAUHI nol (simetris debit/kredit)', () => {
  assert.strictEqual(M.roundRupiah(0.5), 1);
  assert.strictEqual(M.roundRupiah(2.5), 3);
  // Asimetri Math.round yang dicegah: Math.round(-0.5) === -0, helper -> -1.
  assert.strictEqual(M.roundRupiah(-0.5), -1);
  assert.strictEqual(M.roundRupiah(-2.5), -3);
  // Invarian simetri: nominal berlawanan tanda saling meniadakan.
  assert.strictEqual(M.roundRupiah(2.5) + M.roundRupiah(-2.5), 0);
});

test('roundRupiah — input tak valid -> 0', () => {
  assert.strictEqual(M.roundRupiah(NaN), 0);
  assert.strictEqual(M.roundRupiah(Infinity), 0);
  assert.strictEqual(M.roundRupiah(-Infinity), 0);
  assert.strictEqual(M.roundRupiah(null), 0);
  assert.strictEqual(M.roundRupiah(undefined), 0);
});

test('rupiahAmount — non-negatif (debit/kredit jurnal di-clamp >= 0)', () => {
  assert.strictEqual(M.rupiahAmount(2.6), 3);
  assert.strictEqual(M.rupiahAmount(-1), 0);
  assert.strictEqual(M.rupiahAmount(-0.5), 0);
  assert.strictEqual(M.rupiahAmount(NaN), 0);
  assert.strictEqual(M.rupiahAmount(1700000), 1700000);
});

test('PRESERVASI NILAI — identik Math.round untuk input non-negatif (DP/util/depresiasi)', () => {
  const cases = [
    (1700000 * 30) / 100,   // DP 30% bulanan -> 510000
    (1333000 * 30) / 100,   // DP 30% -> 399900
    12.5 * 3000,            // util m3 x tarif -> 37500
    1000000 / 12,           // depresiasi bulanan -> 83333.33
    7777777 / 13,           // pembagian acak -> pecahan
    250000 / 3,             // 83333.33
  ];
  for (const v of cases) {
    assert.strictEqual(M.roundRupiah(v), Math.round(v), `roundRupiah harus == Math.round untuk ${v}`);
  }
});
