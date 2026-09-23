const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildPaymentImpactPreview,
  buildPaymentImpactRealized,
  computeNextDepositState,
  computeNextInvoiceState,
  computePaymentAllocation,
  deriveDepositPaymentStatus,
} = require('../../dist/modules/payment-submissions/payment-impact.helper.js');
const { evaluatePaymentPolicy } = require('../../dist/modules/payment-submissions/payment-policy.helper.js');

// Skenario emas docs/operations/verifikasi-keuangan.md §5:
// tarif bulanan 1.700.000 · deposit 500.000 · DP 30% = 510.000 · pelunasan = 1.690.000.
const RENT = 1_700_000;
const DEPOSIT = 500_000;
const DP = 510_000;
const SETTLEMENT = RENT - DP + DEPOSIT; // 1.690.000

function invoicePolicyInput(overrides) {
  return {
    invoiceStatus: 'ISSUED',
    invoiceTotalAmountRupiah: RENT,
    invoicePaidAmountRupiah: 0,
    isBookingPath: true,
    stayDepositAmountRupiah: DEPOSIT,
    stayDepositPaidAmountRupiah: 0,
    stayDownPaymentAmountRupiah: DP,
    stayDownPaymentPaidRupiah: 0,
    ...overrides,
  };
}

function submissionFixture(overrides = {}) {
  const base = {
    id: 91,
    stayId: 41,
    invoiceId: 71,
    tenantId: 12,
    submittedById: 12,
    amountRupiah: DP,
    paidAt: new Date('2026-09-01T02:00:00Z'),
    paymentMethod: 'TRANSFER',
    targetType: 'INVOICE',
    senderName: 'Tenant Uji',
    senderBankName: 'BCA',
    referenceNumber: 'TRX-1',
    notes: null,
    fileKey: '12_bukti.jpg',
    fileUrl: '/payment-submissions/proofs/12_bukti.jpg',
    originalFilename: 'bukti.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1024,
    status: 'PENDING_REVIEW',
    reviewedById: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date('2026-09-01T02:05:00Z'),
    updatedAt: new Date('2026-09-01T02:05:00Z'),
    tenant: { id: 12, fullName: 'Tenant Uji', phone: '0800' },
    room: { id: 5, code: 'A1', name: 'Kamar A1', status: 'AVAILABLE' },
    stay: {
      id: 41,
      status: 'ACTIVE',
      expiresAt: new Date('2026-09-03T00:00:00Z'),
      initialMetersPromotedAt: null,
      depositAmountRupiah: DEPOSIT,
      depositPaidAmountRupiah: 0,
      depositPaymentStatus: 'UNPAID',
      downPaymentAmountRupiah: DP,
      downPaymentPaidRupiah: 0,
    },
    invoice: {
      id: 71,
      invoiceNumber: 'INV-2026-071',
      status: 'ISSUED',
      totalAmountRupiah: RENT,
      paidAmountRupiah: 0,
      remainingAmountRupiah: RENT,
    },
    submittedBy: { id: 12, fullName: 'Tenant Uji' },
    reviewedBy: null,
  };
  const merged = { ...base, ...overrides };
  merged.paymentPolicy = evaluatePaymentPolicy(
    invoicePolicyInput({
      amountRupiah: merged.amountRupiah,
      invoiceStatus: merged.invoice.status,
      invoiceTotalAmountRupiah: merged.invoice.totalAmountRupiah,
      invoicePaidAmountRupiah: merged.invoice.paidAmountRupiah,
      stayDepositPaidAmountRupiah: merged.stay.depositPaidAmountRupiah,
      stayDownPaymentPaidRupiah: merged.stay.downPaymentPaidRupiah,
    }),
  );

  return merged;
}

test('DP tepat: porsi sewa penuh, invoice PARTIAL, kamar RESERVED, deposit belum dijurnal', () => {
  const preview = buildPaymentImpactPreview(submissionFixture());

  assert.deepEqual(preview.allocation, {
    rentPortionRupiah: DP,
    depositPortionRupiah: 0,
    excessRupiah: 0,
  });
  assert.equal(preview.after.invoiceStatus, 'PARTIAL');
  assert.equal(preview.after.invoicePaidAmountRupiah, DP);
  assert.equal(preview.after.invoiceRemainingAmountRupiah, RENT - DP);
  assert.equal(preview.before.roomStatus, 'AVAILABLE');
  assert.equal(preview.after.roomStatus, 'RESERVED');
  assert.equal(preview.after.depositPaidAmountRupiah, 0);
  assert.equal(preview.after.depositPaymentStatus, 'UNPAID');
  assert.equal(preview.after.downPaymentPaidRupiah, DP);
  assert.equal(preview.after.expiresAt, null);

  assert.deepEqual(preview.accounting, {
    uangDiterimaRupiah: DP,
    jurnalKasMasukRupiah: DP,
    piutangTurunRupiah: DP,
    depositLiabilityNaikRupiah: 0,
    depositJournalDeferred: false,
  });
});

test('Pelunasan penuh: invoice PAID, deposit lunas dijurnal 2000, DP tetap DP', () => {
  const fixture = submissionFixture({
    amountRupiah: SETTLEMENT,
    stay: {
      id: 41,
      status: 'ACTIVE',
      expiresAt: null,
      initialMetersPromotedAt: null,
      depositAmountRupiah: DEPOSIT,
      depositPaidAmountRupiah: 0,
      depositPaymentStatus: 'UNPAID',
      downPaymentAmountRupiah: DP,
      downPaymentPaidRupiah: DP,
    },
    invoice: {
      id: 71,
      invoiceNumber: 'INV-2026-071',
      status: 'PARTIAL',
      totalAmountRupiah: RENT,
      paidAmountRupiah: DP,
      remainingAmountRupiah: RENT - DP,
    },
  });
  const preview = buildPaymentImpactPreview(fixture);

  assert.deepEqual(preview.allocation, {
    rentPortionRupiah: RENT - DP,
    depositPortionRupiah: DEPOSIT,
    excessRupiah: 0,
  });
  assert.equal(preview.after.invoiceStatus, 'PAID');
  assert.equal(preview.after.invoiceRemainingAmountRupiah, 0);
  assert.equal(preview.after.depositPaidAmountRupiah, DEPOSIT);
  assert.equal(preview.after.depositPaymentStatus, 'PAID');
  assert.equal(preview.after.downPaymentPaidRupiah, DP);

  assert.deepEqual(preview.accounting, {
    uangDiterimaRupiah: SETTLEMENT,
    jurnalKasMasukRupiah: SETTLEMENT,
    piutangTurunRupiah: RENT - DP,
    depositLiabilityNaikRupiah: DEPOSIT,
    depositJournalDeferred: false,
  });
});

test('dampak nyata (sesudah approve) memakai angka yang sama dengan preview', () => {
  const preview = buildPaymentImpactPreview(submissionFixture());
  const realized = buildPaymentImpactRealized({
    submissionId: preview.submissionId,
    invoiceNumber: preview.invoiceNumber,
    isBookingPath: preview.isBookingPath,
    allocation: preview.allocation,
    before: preview.before,
    totalInvoiceAmountRupiah: RENT,
    depositAmountRupiah: DEPOSIT,
    downPaymentAmountRupiah: DP,
    references: {
      invoicePaymentId: 555,
      journalInvoicePayment: { id: 900, entryNumber: 'JV-2026-0900' },
      journalDeposit: null,
      depositLedgerEntryId: null,
    },
  });

  assert.deepEqual(realized.after, preview.after);
  assert.deepEqual(realized.accounting, preview.accounting);
  assert.equal(realized.references.invoicePaymentId, 555);
  assert.equal(realized.references.journalInvoicePayment.entryNumber, 'JV-2026-0900');
  assert.equal(realized.references.journalDeposit, null);
});

test('jalur tagihan (invoice-only): deposit tidak berubah, pelunasan penuh jadi PAID', () => {
  const fixture = submissionFixture({
    amountRupiah: RENT - 200_000,
    stay: {
      id: 41,
      status: 'ACTIVE',
      expiresAt: null,
      initialMetersPromotedAt: new Date('2026-08-01T00:00:00Z'),
      depositAmountRupiah: DEPOSIT,
      depositPaidAmountRupiah: DEPOSIT,
      depositPaymentStatus: 'PAID',
      downPaymentAmountRupiah: 0,
      downPaymentPaidRupiah: 0,
    },
    invoice: {
      id: 71,
      invoiceNumber: 'INV-2026-071',
      status: 'PARTIAL',
      totalAmountRupiah: RENT,
      paidAmountRupiah: 200_000,
      remainingAmountRupiah: RENT - 200_000,
    },
  });
  const preview = buildPaymentImpactPreview(fixture);

  assert.equal(preview.isBookingPath, false);
  assert.deepEqual(preview.allocation, {
    rentPortionRupiah: RENT - 200_000,
    depositPortionRupiah: 0,
    excessRupiah: 0,
  });
  assert.equal(preview.after.invoiceStatus, 'PAID');
  assert.equal(preview.after.roomStatus, preview.before.roomStatus);
  assert.equal(preview.after.depositPaidAmountRupiah, DEPOSIT);
  assert.equal(
    preview.notes.some((note) => note.includes('Deposit tidak berubah')),
    true,
  );
});

test('nominal melebihi kewajiban menghasilkan excess tanpa mengubah angka terima', () => {
  const allocation = computePaymentAllocation({
    amountRupiah: SETTLEMENT + 300_000,
    invoiceRemainingAmountRupiah: RENT - DP,
    depositRemainingAmountRupiah: DEPOSIT,
    isBookingPath: true,
  });

  assert.deepEqual(allocation, {
    rentPortionRupiah: RENT - DP,
    depositPortionRupiah: DEPOSIT,
    excessRupiah: 300_000,
  });
});

test('helper status deposit & invoice mengikuti aturan yang ada', () => {
  assert.equal(deriveDepositPaymentStatus(0, 0), 'UNPAID');
  assert.equal(deriveDepositPaymentStatus(DEPOSIT, DEPOSIT / 2), 'PARTIAL');
  assert.equal(deriveDepositPaymentStatus(DEPOSIT, DEPOSIT), 'PAID');
  assert.equal(
    computeNextInvoiceState({
      invoiceTotalAmountRupiah: RENT,
      invoicePaidAmountBeforeRupiah: 0,
      rentPortionRupiah: 0,
    }).statusAfter,
    'ISSUED',
  );
  assert.equal(
    computeNextDepositState({
      depositAmountRupiah: DEPOSIT,
      depositPaidBeforeRupiah: 0,
      downPaymentAmountRupiah: DP,
      downPaymentPaidBeforeRupiah: DP,
      rentPortionRupiah: RENT - DP,
      depositPortionRupiah: 0,
    }).downPaymentPaidAfterRupiah,
    DP,
  );
});

test('kebijakan pembayaran (sumber approve) tetap sama setelah refactor', () => {
  const policy = evaluatePaymentPolicy(invoicePolicyInput({ amountRupiah: DP }));

  assert.equal(policy.canApprove, true);
  assert.equal(policy.amountTone, 'EXACT');
  assert.equal(policy.matchedAcceptedKind, 'DOWN_PAYMENT');
  assert.equal(policy.expectedAmountRupiah, DP);
  assert.equal(
    evaluatePaymentPolicy(invoicePolicyInput({ amountRupiah: DEPOSIT })).canApprove,
    false,
  );
});

