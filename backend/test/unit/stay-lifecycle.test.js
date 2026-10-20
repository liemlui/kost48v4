const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveStayLifecycle } = require('../../dist/modules/stays/stay-lifecycle.helper.js');

const planned = new Date('2026-10-20T00:00:00Z');

test('S-03: sebelum H-day 12.00 WIB tetap ACTIVE', () => {
  const status = deriveStayLifecycle(
    { status: 'ACTIVE', plannedCheckOutDate: planned },
    new Date('2026-10-20T04:59:59Z'), // 11:59:59 WIB
  );
  assert.equal(status, 'ACTIVE');
});

test('S-03: tepat H-day 12.00 WIB menjadi OVERSTAY tanpa grace', () => {
  const status = deriveStayLifecycle(
    { status: 'ACTIVE', plannedCheckOutDate: planned },
    new Date('2026-10-20T05:00:00Z'), // 12:00 WIB
  );
  assert.equal(status, 'OVERSTAY');
});

test('S-03: grace renewal DP_SECURED sampai akhir settlementDueDate', () => {
  const grace = new Date('2026-10-27T00:00:00Z');
  const during = deriveStayLifecycle(
    { status: 'ACTIVE', plannedCheckOutDate: planned, renewalGraceUntil: grace },
    new Date('2026-10-27T16:59:59Z'), // 23:59:59 WIB
  );
  assert.equal(during, 'GRACE');

  const after = deriveStayLifecycle(
    { status: 'ACTIVE', plannedCheckOutDate: planned, renewalGraceUntil: grace },
    new Date('2026-10-27T17:00:00Z'), // 00:00 WIB H+8
  );
  assert.equal(after, 'OVERSTAY');
});

test('S-03: status non-ACTIVE dikembalikan apa adanya', () => {
  assert.equal(deriveStayLifecycle({ status: 'COMPLETED', plannedCheckOutDate: planned }), 'COMPLETED');
  assert.equal(deriveStayLifecycle({ status: 'CANCELLED', plannedCheckOutDate: planned }), 'CANCELLED');
});
