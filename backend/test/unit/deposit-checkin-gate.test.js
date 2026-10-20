const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertWalkInDepositCollected,
  assertReservedDepositPaid,
} = require('../../dist/common/utils/deposit-policy.util.js');

test('F-11: walk-in dengan deposit > 0 wajib mencatat deposit tunai', () => {
  assert.throws(
    () => assertWalkInDepositCollected(300000, false),
    (err) => {
      assert.equal(err.getStatus(), 409);
      assert.match(err.message, /belum diterima/i);
      return true;
    },
  );
  assert.doesNotThrow(() => assertWalkInDepositCollected(300000, true));
  assert.doesNotThrow(() => assertWalkInDepositCollected(0, false));
});

test('F-11: booking RESERVED wajib deposit lunas', () => {
  assert.throws(
    () => assertReservedDepositPaid(400000, 300000),
    (err) => {
      assert.equal(err.getStatus(), 409);
      assert.match(err.message, /belum lunas/i);
      return true;
    },
  );
  assert.doesNotThrow(() => assertReservedDepositPaid(400000, 400000));
  assert.doesNotThrow(() => assertReservedDepositPaid(0, 0));
});
