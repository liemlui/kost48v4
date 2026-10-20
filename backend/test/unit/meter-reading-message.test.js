const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMeterNoInvoiceMessage } = require('../../dist/modules/meter-readings/meter-reading-message.helper.js');

const base = {
  hasPreviousElectricity: true,
  electricityChargeableKwh: 0,
  electricityTariffRupiah: 2500,
  waterChargeableM3: 0,
  waterTariffRupiah: 0,
};

test('tarif listrik 0 + pemakaian di atas jatah tidak disebut "dalam jatah gratis"', () => {
  const message = buildMeterNoInvoiceMessage({
    ...base,
    electricityChargeableKwh: 5,
    electricityTariffRupiah: 0,
  });
  assert.match(message, /tarif listrik 0/i);
  assert.match(message, /tidak dibuat/i);
  assert.doesNotMatch(message, /dalam jatah gratis/i);
});

test('pemakaian dalam jatah tetap memakai pesan lama', () => {
  const message = buildMeterNoInvoiceMessage({ ...base });
  assert.match(message, /dalam jatah gratis/i);
});

test('catatan pertama tetap memakai pesan catatan pertama', () => {
  const message = buildMeterNoInvoiceMessage({ ...base, hasPreviousElectricity: false });
  assert.match(message, /Catatan meter pertama/i);
});
