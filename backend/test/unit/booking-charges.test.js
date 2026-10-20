const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBookingCharges } = require('../../dist/modules/tenant-bookings/booking-charges.helper.js');

const base = {
  baseRentRupiah: 1_000_000,
  defaultDepositRupiah: 300_000,
  petDepositRupiah: 100_000,
};

test('F-02: STANDARD 2+2 — dua orang gratis, kepala ketiga kena 20%', () => {
  const two = calculateBookingCharges({ ...base, roomSize: 'STANDARD', occupantCount: 2 });
  assert.equal(two.occupantSurchargeRupiah, 0);
  assert.equal(two.agreedRentAmountRupiah, 1_000_000);

  const three = calculateBookingCharges({ ...base, roomSize: 'STANDARD', occupantCount: 3 });
  assert.equal(three.occupantSurchargeRupiah, 200_000);
  assert.equal(three.agreedRentAmountRupiah, 1_200_000);
});

test('F-02: LARGE 4+2 — empat orang gratis, kepala kelima kena 20%', () => {
  const four = calculateBookingCharges({ ...base, roomSize: 'LARGE', occupantCount: 4 });
  assert.equal(four.occupantSurchargeRupiah, 0);

  const five = calculateBookingCharges({ ...base, roomSize: 'LARGE', occupantCount: 5 });
  assert.equal(five.occupantSurchargeRupiah, 200_000);
});

test('F-02/F-12: deposit hewan ditambahkan di semua kanal', () => {
  const pet = calculateBookingCharges({ ...base, roomSize: 'STANDARD', occupantCount: 1, hasPet: true });
  assert.equal(pet.petDepositRupiah, 100_000);
  assert.equal(pet.depositAmountRupiah, 400_000);

  const noPet = calculateBookingCharges({ ...base, roomSize: 'STANDARD', occupantCount: 1, hasPet: false });
  assert.equal(noPet.petDepositRupiah, 0);
  assert.equal(noPet.depositAmountRupiah, 300_000);
});

test('F-02: hard cap STANDARD 4 dan LARGE 6', () => {
  assert.throws(() => calculateBookingCharges({ ...base, roomSize: 'STANDARD', occupantCount: 5 }), /maks 4/i);
  assert.throws(() => calculateBookingCharges({ ...base, roomSize: 'LARGE', occupantCount: 7 }), /maks 6/i);
});
