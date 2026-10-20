const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDepositWithoutOverride } = require('../../dist/common/utils/deposit-policy.util.js');

test('F-01: deposit override ditolak dengan 400, bukan diabaikan', () => {
  assert.throws(
    () => resolveDepositWithoutOverride(300000, 0),
    (err) => {
      assert.equal(err.getStatus(), 400);
      assert.match(err.message, /override tidak diizinkan/i);
      return true;
    },
  );
});

test('F-01: nilai default / tanpa permintaan tetap diterima', () => {
  assert.equal(resolveDepositWithoutOverride(300000, 300000), 300000);
  assert.equal(resolveDepositWithoutOverride(300000, undefined), 300000);
  assert.equal(resolveDepositWithoutOverride(300000, null), 300000);
  assert.equal(resolveDepositWithoutOverride(0, undefined), 0);
});
