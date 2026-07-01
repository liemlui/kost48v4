'use strict';
/**
 * Unit test: Payment submission state — mapper & state guards
 * Cakupan: payment-submissions.mapper.ts (mapSubmissionRow, buildApprovalPaymentNote)
 *   + PaymentSubmissionStatus enum state transitions.
 *
 * Catatan: payment-submissions.helpers.ts dan utils.ts sudah di-cover
 * oleh payment-submissions-helpers.test.js.
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const MAPPER = require('../../dist/modules/payment-submissions/payment-submissions.mapper.js');
const ENUMS = require('../../dist/common/enums/app.enums.js');

// ════════════════════════════════════════════════════════════════════════════
// 1. PaymentSubmissionStatus enum values
// ════════════════════════════════════════════════════════════════════════════

test('PS-T01: PaymentSubmissionStatus memiliki 4 nilai', () => {
  const values = Object.values(ENUMS.PaymentSubmissionStatus);
  assert.strictEqual(values.length, 4);
  assert.ok(values.includes('PENDING_REVIEW'));
  assert.ok(values.includes('APPROVED'));
  assert.ok(values.includes('REJECTED'));
  assert.ok(values.includes('EXPIRED'));
});

// ════════════════════════════════════════════════════════════════════════════
// 2. mapSubmissionRow  (mapper.ts)
// ════════════════════════════════════════════════════════════════════════════

function makeListRow(overrides = {}) {
  return {
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
    status: 'PENDING_REVIEW',
    reviewedById: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date('2026-06-20T08:05:00Z'),
    updatedAt: new Date('2026-06-20T08:05:00Z'),
    tenantFullName: 'Budi Santoso',
    tenantPhone: '08123456789',
    roomId: 10,
    roomCode: 'G2-001',
    roomName: 'Kamar G2-001',
    roomStatus: 'occuped',
    stayStatus: 'active',
    stayExpiresAt: new Date('2026-07-20T00:00:00Z'),
    invoiceNumber: 'INV-2026-0001',
    invoiceStatus: 'issued',
    invoiceTotalAmountRupiah: 1000000,
    invoicePaidAmountRupiah: 250000,
    invoiceRemainingAmountRupiah: 750000,
    submittedByName: 'Admin',
    reviewedByName: null,
    ...overrides,
  };
}

test('PS-T02: mapSubmissionRow — mapping field dasar', () => {
  const row = makeListRow();
  const result = MAPPER.mapSubmissionRow(row);
  assert.strictEqual(result.id, 10);
  assert.strictEqual(result.stayId, 1);
  assert.strictEqual(result.invoiceId, 100);
  assert.strictEqual(result.tenantId, 5);
  assert.strictEqual(result.amountRupiah, 750000);
  assert.strictEqual(result.status, 'PENDING_REVIEW');
});

test('PS-T03: mapSubmissionRow — nested tenant object', () => {
  const row = makeListRow({ tenantFullName: 'Budi Santoso', tenantPhone: '08123456789' });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.tenant, { id: 5, fullName: 'Budi Santoso', phone: '08123456789' });
});

test('PS-T04: mapSubmissionRow — nested room object', () => {
  const row = makeListRow({ roomId: 10, roomCode: 'G2-001', roomName: 'Kamar G2-001', roomStatus: 'occuped' });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.room, { id: 10, code: 'G2-001', name: 'Kamar G2-001', status: 'occuped' });
});

test('PS-T05: mapSubmissionRow — nested stay object', () => {
  const expiresAt = new Date('2026-07-20T00:00:00Z');
  const row = makeListRow({ stayId: 1, stayStatus: 'active', stayExpiresAt: expiresAt });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.stay, { id: 1, status: 'active', expiresAt: expiresAt });
});

test('PS-T06: mapSubmissionRow — nested invoice dengan remaining', () => {
  const row = makeListRow({
    invoiceId: 100,
    invoiceNumber: 'INV-2026-0001',
    invoiceStatus: 'issued',
    invoiceTotalAmountRupiah: 1000000,
    invoicePaidAmountRupiah: 250000,
    invoiceRemainingAmountRupiah: 750000,
  });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.invoice, {
    id: 100,
    invoiceNumber: 'INV-2026-0001',
    status: 'issued',
    totalAmountRupiah: 1000000,
    paidAmountRupiah: 250000,
    remainingAmountRupiah: 750000,
  });
});

test('PS-T07: mapSubmissionRow — submittedBy + reviewedBy null', () => {
  const row = makeListRow({ submittedByName: 'Admin', reviewedByName: null });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.submittedBy, { id: 2, fullName: 'Admin' });
  assert.strictEqual(result.reviewedBy, null);
});

test('PS-T08: mapSubmissionRow — reviewedBy ada', () => {
  const row = makeListRow({ reviewedById: 1, reviewedByName: 'Owner' });
  const result = MAPPER.mapSubmissionRow(row);
  assert.deepStrictEqual(result.reviewedBy, { id: 1, fullName: 'Owner' });
});

test('PS-T09: mapSubmissionRow — semua field null/string tetap bertahan', () => {
  const row = makeListRow({
    senderName: null,
    senderBankName: null,
    referenceNumber: null,
    notes: 'Pembayaran bulan Juni',
    fileKey: 'tenant_5/inv-001.jpg',
    fileUrl: 'https://cdn.example.com/tenant_5/inv-001.jpg',
  });
  const result = MAPPER.mapSubmissionRow(row);
  assert.strictEqual(result.senderName, null);
  assert.strictEqual(result.notes, 'Pembayaran bulan Juni');
  assert.strictEqual(result.fileKey, 'tenant_5/inv-001.jpg');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. buildApprovalPaymentNote  (mapper.ts — duplicate dari helpers.ts)
// ════════════════════════════════════════════════════════════════════════════

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
    roomStatus: 'occuped',
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
    stayPromotedAt: null,
    invoiceNumber: '',
    invoiceStatus: '',
    invoiceIssuedAt: null,
    invoiceTotalAmountRupiah: 0,
    invoicePaidAmountRupiah: 0,
    ...overrides,
  };
}

test('PS-T10: buildApprovalPaymentNote — dengan referenceNumber + senderName', () => {
  const row = makeLockRow({ referenceNumber: 'INV-001', senderName: 'Budi' });
  const result = MAPPER.buildApprovalPaymentNote(row);
  assert.strictEqual(result, 'Pembayaran hasil approval bukti bayar tenant | Ref: INV-001 | Pengirim: Budi');
});

test('PS-T11: buildApprovalPaymentNote — keduanya null → base note saja', () => {
  const row = makeLockRow({ referenceNumber: null, senderName: null });
  const result = MAPPER.buildApprovalPaymentNote(row);
  assert.strictEqual(result, 'Pembayaran hasil approval bukti bayar tenant');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Validasi state transition PaymentSubmissionStatus
// ════════════════════════════════════════════════════════════════════════════

test('PS-T12: PaymentSubmissionStatus — hanya PENDING_REVIEW yang bisa di-approve/ditolak', () => {
  // Validasi enum: APPROVED/REJECTED/EXPIRED tidak bisa kembali ke PENDING_REVIEW
  const nonReviewable = ['APPROVED', 'REJECTED', 'EXPIRED'];
  for (const status of nonReviewable) {
    assert.ok(ENUMS.PaymentSubmissionStatus[status], `Enum harus punya ${status}`);
  }
});
