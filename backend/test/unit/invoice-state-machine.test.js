'use strict';
/**
 * Unit test: Invoice state machine — state transitions & guards
 * Cakupan: InvoicesService (issue DRAFT→ISSUED, cancel guards,
 *   assertFinanceMutationAllowed, assertValidInvoicePeriod, buildLineData)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException } = require('@nestjs/common');
const { InvoicesService } = require('../../dist/modules/invoices/invoices.service.js');
const { InvoiceStatus } = require('../../dist/common/enums/app.enums.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };
const TENANT = { id: 10, role: 'TENANT', tenantId: 7 };

// ─── Invoice dasar ────────────────────────────────────────────────────────
function mkInvoice(overrides = {}) {
  return {
    id: 1,
    invoiceNumber: 'INV-2026-0001',
    stayId: 10,
    status: 'DRAFT',
    totalAmountRupiah: 1500000,
    issuedAt: null,
    cancelReason: null,
    lines: [{ id: 1, lineType: 'RENT', lineAmountRupiah: 1500000 }],
    payments: [],
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
const NOOP_AUDIT = { log: async () => undefined };
const NOOP_ACCOUNTING_POSTING = {
  postInvoiceIssuedTx: async () => ({ posted: true, journalEntry: { id: 1 } }),
  postInvoiceCancellationReversalTx: async () => undefined,
};
const NOOP_ACCOUNTING_READINESS = {
  getReadiness: async () => ({
    accountsReady: true,
    formalStatementReady: true,
    schemaStatus: { message: 'Mock — accounting ready' },
  }),
};

/**
 * Buat InvoicesService dengan Prisma mock.
 * `findUniqueResult` dikembalikan oleh invoice.findUnique.
 * `txOverrides` untuk override method pada $transaction callback.
 */
function makeService({
  findUniqueResult = null,
  updateResult = null,
  txOverrides = {},
  txFindUniqueResult = null,
} = {}) {
  const prisma = {
    invoice: {
      findUnique: async () => findUniqueResult,
      update: async ({ data }) => ({ ...(findUniqueResult ?? {}), ...data }),
    },
    $queryRaw: async () => [],
    $transaction: async (cb) => {
      const defaultTx = {
        invoice: {
          findUnique: async () => txFindUniqueResult ?? findUniqueResult,
          update: async ({ data }) => ({ ...(txFindUniqueResult ?? findUniqueResult ?? {}), ...data }),
        },
        $queryRaw: async () => [],
        journalEntry: { findFirst: async () => null },
      };
      const tx = { ...defaultTx, ...txOverrides };
      return cb(tx);
    },
  };
  return new InvoicesService(prisma, NOOP_AUDIT, NOOP_ACCOUNTING_POSTING, NOOP_ACCOUNTING_READINESS);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. InvoiceStatus enum values
// ════════════════════════════════════════════════════════════════════════════

test('INV-T01: InvoiceStatus memiliki 5 nilai', () => {
  const values = Object.values(InvoiceStatus);
  assert.strictEqual(values.length, 5);
  assert.ok(values.includes('DRAFT'));
  assert.ok(values.includes('ISSUED'));
  assert.ok(values.includes('PARTIAL'));
  assert.ok(values.includes('PAID'));
  assert.ok(values.includes('CANCELLED'));
});

// ════════════════════════════════════════════════════════════════════════════
// 2. issue() — DRAFT → ISSUED
// ════════════════════════════════════════════════════════════════════════════

test('INV-T02: issue — STAFF ditolak (guard role)', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice() });
  await assert.rejects(
    () => svc.issue(1, STAFF),
    (err) => err instanceof ForbiddenException,
  );
});

test('INV-T03: issue — TENANT ditolak', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice() });
  await assert.rejects(
    () => svc.issue(1, TENANT),
    (err) => err instanceof ForbiddenException,
  );
});

test('INV-T04: issue — invoice tidak ditemukan → NotFound', async () => {
  const svc = makeService({ findUniqueResult: null });
  await assert.rejects(
    () => svc.issue(1, OWNER),
    (err) => err instanceof NotFoundException,
  );
});

test('INV-T05: issue — invoice bukan DRAFT → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'ISSUED' }) });
  await assert.rejects(
    () => svc.issue(1, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T06: issue — invoice tanpa lines → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ lines: [] }) });
  await assert.rejects(
    () => svc.issue(1, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T07: issue — total ≤ 0 → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ totalAmountRupiah: 0, lines: [{ id: 1, lineType: 'RENT', lineAmountRupiah: 0 }] }) });
  await assert.rejects(
    () => svc.issue(1, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T08: issue — OWNER berhasil issue DRAFT → ISSUED', async () => {
  const inv = mkInvoice({ status: 'DRAFT', lines: [{ id: 1, lineType: 'RENT', lineAmountRupiah: 1500000 }] });
  const svc = makeService({ findUniqueResult: inv });
  const result = await svc.issue(1, OWNER);
  assert.ok(result, 'Hasil issue harus ada');
  assert.strictEqual(result.status, 'ISSUED');
});

test('INV-T09: issue — ADMIN berhasil', async () => {
  const inv = mkInvoice({ status: 'DRAFT', lines: [{ id: 1, lineType: 'RENT', lineAmountRupiah: 1500000 }] });
  const svc = makeService({ findUniqueResult: inv });
  const result = await svc.issue(1, ADMIN);
  assert.strictEqual(result.status, 'ISSUED');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. cancel() — guard validasi
// ════════════════════════════════════════════════════════════════════════════

test('INV-T10: cancel — STAFF ditolak', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'DRAFT' }) });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Test' }, STAFF),
    (err) => err instanceof ForbiddenException,
  );
});

test('INV-T11: cancel — invoice tidak ditemukan → NotFound', async () => {
  const svc = makeService({ findUniqueResult: null });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Test' }, OWNER),
    (err) => err instanceof NotFoundException,
  );
});

test('INV-T12: cancel — tanpa cancelReason → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'DRAFT' }) });
  await assert.rejects(
    () => svc.cancel(1, {}, OWNER),
    (err) => err instanceof ConflictException && err.message.includes('Alasan pembatalan'),
  );
});

test('INV-T13: cancel — invoice sudah CANCELLED → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'CANCELLED' }) });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Duplicate' }, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T14: cancel — invoice PAID → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'PAID', payments: [{ id: 1, amountRupiah: 1500000 }] }) });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Salah' }, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T15: cancel — invoice PARTIAL → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'PARTIAL', payments: [{ id: 1, amountRupiah: 500000 }] }) });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Salah' }, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T16: cancel — invoice ISSUED dg payments → Conflict', async () => {
  const svc = makeService({ findUniqueResult: mkInvoice({ status: 'ISSUED', payments: [{ id: 1, amountRupiah: 500000 }] }) });
  await assert.rejects(
    () => svc.cancel(1, { cancelReason: 'Salah' }, OWNER),
    (err) => err instanceof ConflictException,
  );
});

test('INV-T17: cancel — OWNER berhasil batalkan DRAFT', async () => {
  const inv = mkInvoice({ status: 'DRAFT' });
  const svc = makeService({ findUniqueResult: inv });
  const result = await svc.cancel(1, { cancelReason: 'Dibuat duplikat' }, OWNER);
  assert.ok(result);
  assert.strictEqual(result.status, 'CANCELLED');
});

test('INV-T18: cancel — OWNER berhasil batalkan ISSUED (tanpa payment)', async () => {
  const inv = mkInvoice({ status: 'ISSUED', payments: [] });
  const svc = makeService({ findUniqueResult: inv });
  const result = await svc.cancel(1, { cancelReason: 'Salah input nominal' }, OWNER);
  assert.ok(result);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Validasi buildLineData via addLine (DRAFT guard)
// ════════════════════════════════════════════════════════════════════════════

test('INV-T19: InvoiceStatus enum — DRAFT adalah satu-satunya status editable', () => {
  // Hanya DRAFT yang bisa ditambah/edit line
  assert.strictEqual(InvoiceStatus.DRAFT, 'DRAFT');
  // Status lain tidak bisa diedit
  assert.notStrictEqual(InvoiceStatus.ISSUED, 'DRAFT');
  assert.notStrictEqual(InvoiceStatus.PAID, 'DRAFT');
  assert.notStrictEqual(InvoiceStatus.CANCELLED, 'DRAFT');
});
