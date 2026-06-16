const test = require('node:test');
const assert = require('node:assert');
const H = require('../../dist/modules/stays/stays-service-helpers.js');

// =========================================================================
// METER M-5: helper checkout meter final × deposit jaminan
// =========================================================================

test('isMeterInvoice — semua baris listrik/air = tagihan meter', () => {
  assert.strictEqual(
    H.isMeterInvoice({ lines: [{ lineType: 'ELECTRICITY' }] }),
    true,
  );
  assert.strictEqual(
    H.isMeterInvoice({ lines: [{ lineType: 'ELECTRICITY' }, { lineType: 'WATER' }] }),
    true,
  );
});

test('isMeterInvoice — campuran sewa/lain = BUKAN tagihan meter (tetap memblokir)', () => {
  assert.strictEqual(
    H.isMeterInvoice({ lines: [{ lineType: 'RENT' }, { lineType: 'ELECTRICITY' }] }),
    false,
  );
  assert.strictEqual(H.isMeterInvoice({ lines: [{ lineType: 'RENT' }] }), false);
});

test('isMeterInvoice — tanpa baris = bukan tagihan meter', () => {
  assert.strictEqual(H.isMeterInvoice({ lines: [] }), false);
  assert.strictEqual(H.isMeterInvoice({ lines: undefined }), false);
});

test('invoiceRemainingRupiah — sisa = total − Σ pembayaran (clamp >= 0)', () => {
  assert.strictEqual(
    H.invoiceRemainingRupiah({ totalAmountRupiah: 50000, payments: [] }),
    50000,
  );
  assert.strictEqual(
    H.invoiceRemainingRupiah({ totalAmountRupiah: 50000, payments: [{ amountRupiah: 20000 }] }),
    30000,
  );
  // pembayaran >= total -> sisa 0 (tidak negatif)
  assert.strictEqual(
    H.invoiceRemainingRupiah({ totalAmountRupiah: 50000, payments: [{ amountRupiah: 60000 }] }),
    0,
  );
});

test('computeMeterDepositSettlement — deposit CUKUP: meter ditutup, sisa refund', () => {
  const r = H.computeMeterDepositSettlement({ meterDueRupiah: 120000, depositHeldRupiah: 500000 });
  assert.strictEqual(r.applied, 120000);
  assert.strictEqual(r.excess, 380000);
  assert.strictEqual(r.shortfall, 0);
  // Invarian: applied + excess = deposit; applied + shortfall = meter.
  assert.strictEqual(r.applied + r.excess, 500000);
  assert.strictEqual(r.applied + r.shortfall, 120000);
});

test('computeMeterDepositSettlement — deposit KURANG: deposit habis, sisa jadi AR', () => {
  const r = H.computeMeterDepositSettlement({ meterDueRupiah: 250000, depositHeldRupiah: 100000 });
  assert.strictEqual(r.applied, 100000);
  assert.strictEqual(r.excess, 0);
  assert.strictEqual(r.shortfall, 150000);
  assert.strictEqual(r.applied + r.excess, 100000);
  assert.strictEqual(r.applied + r.shortfall, 250000);
});

test('computeMeterDepositSettlement — pemakaian NOL: deposit penuh di-refund', () => {
  const r = H.computeMeterDepositSettlement({ meterDueRupiah: 0, depositHeldRupiah: 500000 });
  assert.strictEqual(r.applied, 0);
  assert.strictEqual(r.excess, 500000);
  assert.strictEqual(r.shortfall, 0);
});

test('computeMeterDepositSettlement — PAS habis: deposit = meter (forfeit penuh)', () => {
  const r = H.computeMeterDepositSettlement({ meterDueRupiah: 200000, depositHeldRupiah: 200000 });
  assert.strictEqual(r.applied, 200000);
  assert.strictEqual(r.excess, 0);
  assert.strictEqual(r.shortfall, 0);
});
