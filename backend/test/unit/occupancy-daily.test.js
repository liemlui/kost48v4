const test = require('node:test');
const assert = require('node:assert');
const H = require('../../dist/modules/reports/occupancy-daily.helper.js');

const utc = (value) => new Date(`${value}T00:00:00.000Z`);

test('checkout adalah batas eksklusif okupansi', () => {
  const stay = {
    status: 'COMPLETED',
    checkInDate: utc('2026-05-01'),
    plannedCheckOutDate: utc('2026-06-01'),
    actualCheckOutDate: utc('2026-05-20'),
    initialMetersPromotedAt: utc('2026-05-01'),
  };
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-05-19'), utc('2026-06-14')), true);
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-05-20'), utc('2026-06-14')), false);
});

test('completed tanpa actual checkout memakai planned checkout', () => {
  const stay = {
    status: 'COMPLETED',
    checkInDate: utc('2026-05-01'),
    plannedCheckOutDate: utc('2026-06-01'),
    actualCheckOutDate: null,
    initialMetersPromotedAt: utc('2026-05-01'),
  };
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-05-31'), utc('2026-06-14')), true);
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-06-01'), utc('2026-06-14')), false);
});

test('promosi setelah check-in menjadi awal okupansi nyata', () => {
  const stay = {
    status: 'ACTIVE',
    checkInDate: utc('2026-05-01'),
    plannedCheckOutDate: utc('2026-07-01'),
    actualCheckOutDate: null,
    initialMetersPromotedAt: utc('2026-05-03'),
  };
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-05-02'), utc('2026-06-14')), false);
  assert.strictEqual(H.isStayOccupiedOnDate(stay, utc('2026-05-03'), utc('2026-06-14')), true);
});
