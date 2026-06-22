const test = require('node:test');
const assert = require('node:assert');
const { BadRequestException, ServiceUnavailableException } = require('@nestjs/common');
const H = require('../../dist/modules/payment-submissions/payment-submissions.helpers.js');
const U = require('../../dist/modules/payment-submissions/payment-submissions.utils.js');

// =============================================================================
// 1. parseDateOnly  (helpers.ts)
// =============================================================================

test('parseDateOnly — string tanggal valid "2026-06-15" → UTC jam 00:00', () => {
  const result = H.parseDateOnly('2026-06-15', 'dummy');
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 5); // June = 5
  assert.strictEqual(result.getUTCDate(), 15);
  assert.strictEqual(result.getUTCHours(), 0);
  assert.strictEqual(result.getUTCMinutes(), 0);
  assert.strictEqual(result.getUTCSeconds(), 0);
  assert.strictEqual(result.getUTCMilliseconds(), 0);
});

test('parseDateOnly — string dengan time component "2026-06-15T14:30:00Z" → strip time jadi UTC 00:00', () => {
  const result = H.parseDateOnly('2026-06-15T14:30:00Z', 'dummy');
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 5);
  assert.strictEqual(result.getUTCDate(), 15);
  assert.strictEqual(result.getUTCHours(), 0);
  assert.strictEqual(result.getUTCMinutes(), 0);
  assert.strictEqual(result.getUTCSeconds(), 0);
  assert.strictEqual(result.getUTCMilliseconds(), 0);
});

test('parseDateOnly — string tanggal valid "2025-01-01" → UTC jam 00:00', () => {
  const result = H.parseDateOnly('2025-01-01', 'dummy');
  assert.strictEqual(result.getUTCFullYear(), 2025);
  assert.strictEqual(result.getUTCMonth(), 0);
  assert.strictEqual(result.getUTCDate(), 1);
  assert.strictEqual(result.getUTCHours(), 0);
});

test('parseDateOnly — string tak valid throw BadRequestException dengan errorMessage', () => {
  const errMsg = 'Tanggal tidak valid';
  assert.throws(
    () => H.parseDateOnly('not-a-date', errMsg),
    (err) => {
      return err instanceof BadRequestException && err.message === errMsg;
    },
  );
});

test('parseDateOnly — string kosong throw BadRequestException', () => {
  const errMsg = 'Tanggal harus diisi';
  assert.throws(
    () => H.parseDateOnly('', errMsg),
    (err) => err instanceof BadRequestException,
  );
});

test('parseDateOnly — null sebagai string "null" throw BadRequestException', () => {
  const errMsg = 'Invalid date';
  assert.throws(
    () => H.parseDateOnly('null', errMsg),
    (err) => err instanceof BadRequestException,
  );
});

test('parseDateOnly — "2026-13-01" (bulan invalid) throw BadRequestException', () => {
  // new Date('2026-13-01') di beberapa browser jadi Invalid Date
  assert.throws(
    () => H.parseDateOnly('2026-13-01', 'Bulan tidak valid'),
    (err) => err instanceof BadRequestException,
  );
});

test('parseDateOnly — "2026-00-01" (bulan 0 tidak valid) throw BadRequestException', () => {
  assert.throws(
    () => H.parseDateOnly('2026-00-01', 'Bulan tidak valid'),
    (err) => err instanceof BadRequestException,
  );
});

// =============================================================================
// 2. endOfDay  (helpers.ts)
// =============================================================================

test('endOfDay — input jam 10:30 UTC → return jam 23:59:59.999 waktu lokal', () => {
  const input = new Date('2026-06-15T10:30:00.000Z');
  const result = H.endOfDay(input);
  assert.strictEqual(result.getHours(), 23);
  assert.strictEqual(result.getMinutes(), 59);
  assert.strictEqual(result.getSeconds(), 59);
  assert.strictEqual(result.getMilliseconds(), 999);
});

test('endOfDay — input jam 00:00 UTC → return jam 23:59:59.999 waktu lokal', () => {
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = H.endOfDay(input);
  assert.strictEqual(result.getHours(), 23);
  assert.strictEqual(result.getMinutes(), 59);
  assert.strictEqual(result.getSeconds(), 59);
  assert.strictEqual(result.getMilliseconds(), 999);
});

test('endOfDay — input asli TIDAK termutasi (clone test)', () => {
  const input = new Date('2026-06-15T10:30:00.000Z');
  const inputCopy = new Date(input);
  H.endOfDay(input);
  assert.strictEqual(input.getTime(), inputCopy.getTime(), 'input asli harus tetap sama');
});

// =============================================================================
// 3. buildApprovalPaymentNote  (helpers.ts)
// =============================================================================

function makeLockRow(overrides = {}) {
  return {
    id: 1,
    stayId: 1,
    invoiceId: null,
    tenantId: 1,
    submittedById: 1,
    amountRupiah: 500000,
    paidAt: new Date(),
    paymentMethod: 'transfer',
    senderName: null,
    senderBankName: null,
    referenceNumber: null,
    notes: null,
    fileKey: null,
    fileUrl: null,
    originalFilename: null,
    mimeType: null,
    fileSizeBytes: null,
    status: 'pending',
    reviewedById: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantFullName: 'Budi',
    roomId: 1,
    roomCode: 'G2-001',
    roomStatus: 'occupied',
    roomIsActive: true,
    stayStatus: 'active',
    stayDepositAmountRupiah: 0,
    stayDepositPaidAmountRupiah: 0,
    stayDownPaymentAmountRupiah: 0,
    stayDownPaymentPaidRupiah: 0,
    stayExpiresAt: null,
    stayInitialElectricityKwhPending: null,
    stayInitialWaterM3Pending: null,
    stayInitialMetersRecordedAt: null,
    stayInitialMetersRecordedById: null,
    invoiceNumber: '',
    invoiceStatus: '',
    invoiceIssuedAt: null,
    invoiceTotalAmountRupiah: 0,
    invoicePaidAmountRupiah: 0,
    ...overrides,
  };
}

test('buildApprovalPaymentNote — dengan referenceNumber saja', () => {
  const row = makeLockRow({ referenceNumber: 'INV-001' });
  const result = H.buildApprovalPaymentNote(row);
  assert.ok(result.includes('Ref: INV-001'), `expected "Ref: INV-001" in "${result}"`);
});

test('buildApprovalPaymentNote — dengan senderName saja', () => {
  const row = makeLockRow({ senderName: 'Budi' });
  const result = H.buildApprovalPaymentNote(row);
  assert.ok(result.includes('Pengirim: Budi'), `expected "Pengirim: Budi" in "${result}"`);
});

test('buildApprovalPaymentNote — keduanya ada', () => {
  const row = makeLockRow({ referenceNumber: 'INV-001', senderName: 'Budi' });
  const result = H.buildApprovalPaymentNote(row);
  assert.ok(result.includes('Ref: INV-001'), `expected "Ref: INV-001" in "${result}"`);
  assert.ok(result.includes('Pengirim: Budi'), `expected "Pengirim: Budi" in "${result}"`);
});

test('buildApprovalPaymentNote — keduanya null → hanya base note', () => {
  const row = makeLockRow({ referenceNumber: null, senderName: null });
  const result = H.buildApprovalPaymentNote(row);
  assert.strictEqual(result, 'Pembayaran hasil approval bukti bayar tenant');
});

test('buildApprovalPaymentNote — separator " | " antara fragments', () => {
  const row = makeLockRow({ referenceNumber: 'INV-001', senderName: 'Budi' });
  const result = H.buildApprovalPaymentNote(row);
  assert.strictEqual(result, 'Pembayaran hasil approval bukti bayar tenant | Ref: INV-001 | Pengirim: Budi');
});

// =============================================================================
// 4. mapSubmissionFromPrisma  (helpers.ts)
// =============================================================================

/** Helper: buat mock PaymentSubmissionWithIncludes minimal. */
function makePrismaItem(overrides = {}) {
  const defaults = {
    id: 10,
    stayId: 1,
    invoiceId: 100,
    tenantId: 5,
    submittedById: 2,
    amountRupiah: 750000,
    paidAt: new Date('2026-06-20T08:00:00Z'),
    paymentMethod: 'transfer',
    senderName: 'Budi',
    senderBankName: 'BCA',
    referenceNumber: 'INV-001',
    notes: null,
    fileKey: null,
    fileUrl: null,
    originalFilename: null,
    mimeType: null,
    fileSizeBytes: null,
    status: 'approved',
    reviewedById: 1,
    reviewedAt: new Date('2026-06-21T10:00:00Z'),
    reviewNotes: null,
    createdAt: new Date('2026-06-20T08:05:00Z'),
    updatedAt: new Date('2026-06-21T10:05:00Z'),
    tenant: { id: 5, fullName: 'Budi Santoso', phone: '08123456789' },
    stay: {
      id: 1,
      status: 'active',
      expiresAt: new Date('2026-07-20T00:00:00Z'),
      room: { id: 10, code: 'G2-001', name: 'Kamar G2-001', status: 'occupied' },
    },
    invoice: {
      id: 100,
      invoiceNumber: 'INV-2026-0001',
      status: 'issued',
      totalAmountRupiah: 0, // sengaja 0 agar pakai lineTotal
      paidAmountRupiah: 0,
      remainingAmountRupiah: 0,
      lines: [
        { lineAmountRupiah: 500000 },
        { lineAmountRupiah: 250000 },
      ],
      payments: [
        { amountRupiah: 600000 },
      ],
    },
    submittedBy: { id: 2, fullName: 'Admin' },
    reviewedBy: { id: 1, fullName: 'Owner' },
  };
  return { ...defaults, ...overrides };
}

test('mapSubmissionFromPrisma — mapping field dasar', () => {
  const item = makePrismaItem({ id: 10, stayId: 1, invoiceId: 100, tenantId: 5, amountRupiah: 750000 });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.id, 10);
  assert.strictEqual(result.stayId, 1);
  assert.strictEqual(result.invoiceId, 100);
  assert.strictEqual(result.tenantId, 5);
  assert.strictEqual(result.submittedById, 2);
  assert.strictEqual(result.amountRupiah, 750000);
  assert.strictEqual(result.paymentMethod, 'transfer');
});

test('mapSubmissionFromPrisma — invoice null → invoice.id = 0, invoiceNumber = ""', () => {
  const item = makePrismaItem({ invoice: null });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.id, 0);
  assert.strictEqual(result.invoice.invoiceNumber, '');
  assert.strictEqual(result.invoice.status, '');
});

test('mapSubmissionFromPrisma — invoice null → total/paid/remaining 0', () => {
  const item = makePrismaItem({ invoice: null });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.totalAmountRupiah, 0);
  assert.strictEqual(result.invoice.paidAmountRupiah, 0);
  assert.strictEqual(result.invoice.remainingAmountRupiah, 0);
});

test('mapSubmissionFromPrisma — invoice dgn lines tanpa stored total → totalAmount = lineTotal', () => {
  // totalAmountRupiah = 0 (default) → pakai lineTotal = 500000 + 250000 = 750000
  const item = makePrismaItem({ invoice: { id: 100, invoiceNumber: 'INV-001', status: 'issued', totalAmountRupiah: 0, paidAmountRupiah: 0, remainingAmountRupiah: 0, lines: [{ lineAmountRupiah: 500000 }, { lineAmountRupiah: 250000 }], payments: [] } });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.totalAmountRupiah, 750000);
});

test('mapSubmissionFromPrisma — invoice dgn stored total > 0 → totalAmount = storedTotal', () => {
  const item = makePrismaItem({
    invoice: {
      id: 100,
      invoiceNumber: 'INV-001',
      status: 'issued',
      totalAmountRupiah: 800000,
      paidAmountRupiah: 0,
      remainingAmountRupiah: 0,
      lines: [{ lineAmountRupiah: 500000 }, { lineAmountRupiah: 250000 }],
      payments: [],
    },
  });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.totalAmountRupiah, 800000);
});

test('mapSubmissionFromPrisma — invoice dgn payments → paidAmount = sum, remainingAmount = max(total - paid, 0)', () => {
  // totalAmountRupiah = 0 → lineTotal = 500000 + 250000 = 750000
  // paid = 600000 + 100000 = 700000
  const item = makePrismaItem({
    invoice: {
      id: 100,
      invoiceNumber: 'INV-001',
      status: 'issued',
      totalAmountRupiah: 0,
      paidAmountRupiah: 0,
      remainingAmountRupiah: 0,
      lines: [{ lineAmountRupiah: 500000 }, { lineAmountRupiah: 250000 }],
      payments: [{ amountRupiah: 600000 }, { amountRupiah: 100000 }],
    },
  });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.paidAmountRupiah, 700000);
  assert.strictEqual(result.invoice.remainingAmountRupiah, 50000);
});

test('mapSubmissionFromPrisma — remainingAmount dibawah 0 di-clamp ke 0', () => {
  // total = 750000 (lineTotal), paid = 800000 → remaining = max(-50000, 0) = 0
  const item = makePrismaItem({
    invoice: {
      id: 100,
      invoiceNumber: 'INV-001',
      status: 'issued',
      totalAmountRupiah: 0,
      paidAmountRupiah: 0,
      remainingAmountRupiah: 0,
      lines: [{ lineAmountRupiah: 500000 }, { lineAmountRupiah: 250000 }],
      payments: [{ amountRupiah: 800000 }],
    },
  });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.invoice.remainingAmountRupiah, 0);
});

test('mapSubmissionFromPrisma — reviewedBy null → reviewedBy = null', () => {
  const item = makePrismaItem({ reviewedBy: null });
  const result = H.mapSubmissionFromPrisma(item);
  assert.strictEqual(result.reviewedBy, null);
});

test('mapSubmissionFromPrisma — reviewedBy ada → reviewedBy = { id, fullName }', () => {
  const item = makePrismaItem({ reviewedBy: { id: 99, fullName: 'Bapak Owner' } });
  const result = H.mapSubmissionFromPrisma(item);
  assert.deepStrictEqual(result.reviewedBy, { id: 99, fullName: 'Bapak Owner' });
});

// =============================================================================
// 5. isPaymentSubmissionSchemaError  (utils.ts)
// =============================================================================

test('isPaymentSubmissionSchemaError — error.code = "42P01" → true', () => {
  const err = { code: '42P01', message: 'relation does not exist' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — error.code = "42704" → true', () => {
  const err = { code: '42704', message: 'type does not exist' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — error.message mengandung "PaymentSubmission" → true', () => {
  const err = { message: 'relation "PaymentSubmission" does not exist' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — error.message mengandung "paymentsubmission" (lowercase) → true', () => {
  const err = { message: 'column paymentsubmission not found' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — error.message mengandung "PAYMENTSUBMISSION" (uppercase) → true', () => {
  const err = { message: 'table PAYMENTSUBMISSION not found' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — generic Error → false', () => {
  const err = new Error('something went wrong');
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), false);
});

test('isPaymentSubmissionSchemaError — null → false', () => {
  assert.strictEqual(U.isPaymentSubmissionSchemaError(null), false);
});

test('isPaymentSubmissionSchemaError — undefined → false', () => {
  assert.strictEqual(U.isPaymentSubmissionSchemaError(undefined), false);
});

test('isPaymentSubmissionSchemaError — error.meta.code = "42P01" → true (Prisma nested meta)', () => {
  const err = { meta: { code: '42P01' }, message: 'prisma error' };
  assert.strictEqual(U.isPaymentSubmissionSchemaError(err), true);
});

test('isPaymentSubmissionSchemaError — string kosong sebagai error → false', () => {
  assert.strictEqual(U.isPaymentSubmissionSchemaError(''), false);
});

test('isPaymentSubmissionSchemaError — error tanpa code dan tanpa message → false', () => {
  assert.strictEqual(U.isPaymentSubmissionSchemaError({}), false);
});

// =============================================================================
// 6. handlePaymentSubmissionSchemaError  (utils.ts)
// =============================================================================

test('handlePaymentSubmissionSchemaError — jika schema error → throw ServiceUnavailableException', () => {
  const err = { code: '42P01', message: 'relation not found' };
  assert.throws(
    () => U.handlePaymentSubmissionSchemaError(err),
    (caught) => caught instanceof ServiceUnavailableException,
  );
});

test('handlePaymentSubmissionSchemaError — jika bukan schema error → void (tidak throw)', () => {
  const err = new Error('some other error');
  let returned;
  assert.doesNotThrow(() => {
    returned = U.handlePaymentSubmissionSchemaError(err);
  });
  // Fungsi return void / undefined
  assert.strictEqual(returned, undefined);
});

test('handlePaymentSubmissionSchemaError — null → void (tidak throw)', () => {
  let returned;
  assert.doesNotThrow(() => {
    returned = U.handlePaymentSubmissionSchemaError(null);
  });
  assert.strictEqual(returned, undefined);
});

test('handlePaymentSubmissionSchemaError — undefined → void (tidak throw)', () => {
  let returned;
  assert.doesNotThrow(() => {
    returned = U.handlePaymentSubmissionSchemaError(undefined);
  });
  assert.strictEqual(returned, undefined);
});

test('handlePaymentSubmissionSchemaError — error.message mengandung "PaymentSubmission" → throw ServiceUnavailableException', () => {
  const err = { message: 'relation "PaymentSubmission" does not exist' };
  assert.throws(
    () => U.handlePaymentSubmissionSchemaError(err),
    (caught) => caught instanceof ServiceUnavailableException,
  );
});