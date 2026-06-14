const test = require('node:test');
const assert = require('node:assert');
const L = require('../../dist/modules/loyalty/loyalty.constants.js');

test('pointsForReason — default dossier 19', () => {
  assert.strictEqual(L.pointsForReason('RENEWAL'), 100);
  assert.strictEqual(L.pointsForReason('ON_TIME_PAYMENT'), 50);
  assert.strictEqual(L.pointsForReason('VALIDATED_REPORT'), 30);
  assert.strictEqual(L.pointsForReason('ONBOARDING_QUEST'), 200);
});

test('computeLoyaltyBalance — Σ delta (earn - redeem)', () => {
  assert.strictEqual(L.computeLoyaltyBalance([]), 0);
  assert.strictEqual(
    L.computeLoyaltyBalance([{ delta: 100 }, { delta: 50 }, { delta: -120 }]),
    30,
  );
  // nilai tak valid diabaikan (tidak merusak saldo)
  assert.strictEqual(L.computeLoyaltyBalance([{ delta: 100 }, { delta: NaN }, { delta: 30 }]), 130);
});
