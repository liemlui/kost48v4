const assert = require('node:assert/strict');
const test = require('node:test');

const { evaluatePaymentPolicy } = require('../../dist/modules/payment-submissions/payment-policy.helper.js');

const bookingBase = {
  invoiceStatus: 'OPEN',
  invoiceTotalAmountRupiah: 1_000_000,
  invoicePaidAmountRupiah: 0,
  isBookingPath: true,
  stayDepositAmountRupiah: 500_000,
  stayDepositPaidAmountRupiah: 0,
  stayDownPaymentAmountRupiah: 300_000,
  stayDownPaymentPaidRupiah: 0,
};

test('booking menerima DP tepat', () => {
  const policy = evaluatePaymentPolicy({ ...bookingBase, amountRupiah: 300_000 });

  assert.equal(policy.canApprove, true);
  assert.equal(policy.amountTone, 'EXACT');
  assert.equal(policy.matchedAcceptedKind, 'DOWN_PAYMENT');
  assert.equal(policy.expectedAmountRupiah, 300_000);
});

test('booking menerima pelunasan penuh sewa dan deposit', () => {
  const policy = evaluatePaymentPolicy({ ...bookingBase, amountRupiah: 1_500_000 });

  assert.equal(policy.canApprove, true);
  assert.equal(policy.amountTone, 'EXACT');
  assert.equal(policy.matchedAcceptedKind, 'SETTLEMENT');
  assert.equal(policy.expectedAmountRupiah, 1_500_000);
});

test('booking menolak partial yang bukan DP tepat', () => {
  const policy = evaluatePaymentPolicy({ ...bookingBase, amountRupiah: 250_000 });

  assert.equal(policy.canApprove, false);
  assert.equal(policy.amountTone, 'PARTIAL');
  assert.match(policy.blockingReason ?? '', /harus tepat/);
});

test('booking menolak overpay', () => {
  const policy = evaluatePaymentPolicy({ ...bookingBase, amountRupiah: 1_600_000 });

  assert.equal(policy.canApprove, false);
  assert.equal(policy.amountTone, 'OVERPAY');
  assert.match(policy.blockingReason ?? '', /melebihi kewajiban/);
});

test('invoice-only menerima pelunasan penuh saja', () => {
  const policy = evaluatePaymentPolicy({
    amountRupiah: 800_000,
    invoiceStatus: 'OPEN',
    invoiceTotalAmountRupiah: 1_000_000,
    invoicePaidAmountRupiah: 200_000,
    isBookingPath: false,
  });

  assert.equal(policy.canApprove, true);
  assert.equal(policy.amountTone, 'EXACT');
  assert.equal(policy.matchedAcceptedKind, 'INVOICE_FULL');
  assert.equal(policy.expectedAmountRupiah, 800_000);
});

test('invoice-only menolak partial dan overpay', () => {
  const partial = evaluatePaymentPolicy({
    amountRupiah: 500_000,
    invoiceStatus: 'OPEN',
    invoiceTotalAmountRupiah: 1_000_000,
    invoicePaidAmountRupiah: 200_000,
    isBookingPath: false,
  });
  const overpay = evaluatePaymentPolicy({
    amountRupiah: 900_000,
    invoiceStatus: 'OPEN',
    invoiceTotalAmountRupiah: 1_000_000,
    invoicePaidAmountRupiah: 200_000,
    isBookingPath: false,
  });

  assert.equal(partial.canApprove, false);
  assert.equal(partial.amountTone, 'PARTIAL');
  assert.equal(overpay.canApprove, false);
  assert.equal(overpay.amountTone, 'OVERPAY');
});

test('invoice draft tidak bisa menerima pembayaran', () => {
  const policy = evaluatePaymentPolicy({
    amountRupiah: 800_000,
    invoiceStatus: 'DRAFT',
    invoiceTotalAmountRupiah: 1_000_000,
    invoicePaidAmountRupiah: 200_000,
    isBookingPath: false,
  });

  assert.equal(policy.canApprove, false);
  assert.equal(policy.amountTone, 'UNKNOWN');
  assert.match(policy.blockingReason ?? '', /draft/);
});
