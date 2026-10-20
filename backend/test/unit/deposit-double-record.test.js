const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDepositNotCollectedTwice } = require('../../dist/common/utils/deposit-policy.util.js');

test('depositCollected ditolak 400 bila deposit sudah dibayar', () => {
  assert.throws(
    () => assertDepositNotCollectedTwice(true, 100000, 'PAID'),
    (err) => {
      assert.equal(err.getStatus(), 400);
      assert.match(err.message, /tidak boleh dicatat dua kali/i);
      return true;
    },
  );
});

test('depositCollected ditolak bila status PAID walau nominal 0', () => {
  assert.throws(() => assertDepositNotCollectedTwice(true, 0, 'PAID'), /dua kali/i);
});

test('tidak menolak bila belum dibayar atau checkbox tidak dicentang', () => {
  assert.doesNotThrow(() => assertDepositNotCollectedTwice(true, 0, null));
  assert.doesNotThrow(() => assertDepositNotCollectedTwice(false, 100000, 'PAID'));
});
