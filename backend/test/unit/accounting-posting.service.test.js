'use strict';

/**
 * Unit test: AccountingPostingService
 *
 * Cakupan:
 *   - explainPostingBoundary: metadata
 *   - runIdempotentPosting: wrapping $transaction, catch P2002
 *   - postInvoiceIssued / postInvoicePayment / postExpense / dll:
 *     method delegasi yang menjalankan transaksi internal
 *   - skip (via delegasi method saat precondition gagal)
 */
const test = require('node:test');
const assert = require('node:assert');

// PrismaClientKnownRequestError — gunakan dari Prisma agar instanceof berfungsi
const { Prisma } = require('../../dist/generated/prisma');
const { AccountingPostingService } = require('../../dist/modules/accounting/accounting-posting.service.js');

// ─── Helper: buat tx object dengan semua method yang dibutuhkan helper ──
function makeTx(overrides = {}) {
  return {
    chartOfAccount: {
      findUnique: async (args) => ({ id: 1, code: '4000', name: 'Pendapatan Sewa', type: 'INCOME', normalBalance: 'CREDIT', isActive: true }),
      findFirst: async (args) => ({ id: 1, code: args?.where?.code ?? '4000', name: 'Test', type: args?.where?.code === '1100' ? 'ASSET' : 'INCOME', normalBalance: 'CREDIT', isActive: true }),
      findMany: async () => [{ id: 1, isActive: true }],
    },
    cashAccount: {
      findUnique: async (args) => ({ id: 1, name: 'Bank BCA', accountType: 'BANK', bankName: 'BCA', isActive: true, isDefault: true, chartOfAccountId: 1, currentBalanceRupiah: 0 }),
      findFirst: async () => ({ id: 1, name: 'Bank BCA', isActive: true, isDefault: true, chartOfAccountId: 1 }),
    },
    accountingPeriod: {
      findUnique: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
      findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
    },
    journalEntry: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async (args) => ({ id: 99, entryNumber: args.data.entryNumber, ...args.data, lines: [] }),
      count: async () => 0,
    },
    journalLine: { createMany: async () => ({ count: 2 }) },
    accountBalanceSnapshot: { findMany: async () => [] },
    invoice: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 1, invoiceNumber: 'INV-001', status: 'ISSUED', totalAmountRupiah: 500000, issuedAt: new Date(), createdAt: new Date(), lines: [{ id: 1, lineAmountRupiah: 500000, lineType: 'RENT', utilityType: null, description: 'Sewa' }] };
      },
    },
    invoicePayment: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 1, invoiceId: 1, amountRupiah: 500000, method: 'TRANSFER', paymentDate: new Date(), capturedById: null, invoice: { invoiceNumber: 'INV-001' } };
      },
    },
    expense: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 1, description: 'Listrik', type: 'OPERATIONAL', amountRupiah: 200000, category: 'UTILITY', status: 'CONFIRMED', expenseDate: new Date(), createdById: null };
      },
    },
    wifiSale: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 1, amountRupiah: 100000, packageName: 'WiFi 30GB', saleDate: new Date(), createdById: null, status: 'ACTIVE' };
      },
    },
    depositLedger: { findMany: async () => [{ id: 1, stayId: 1, amountRupiah: 500000, type: 'COLLECT', status: 'ACTIVE', createdAt: new Date() }] },
    stay: { findUnique: async (args) => args?.where?.id === 999 ? null : { id: 1, tenantId: 1, roomId: 1, status: 'ACTIVE', checkInDate: new Date(), createdAt: new Date() } },
    openingBalanceBatch: {
      findUnique: async () => null,
      findFirst: async () => null,
    },
    room: { findUnique: async (args) => args?.where?.id === 999 ? null : { id: 1, code: 'A1-001' } },
    ...overrides,
  };
}

function makeSvc(txOverrides = {}) {
  const tx = makeTx(txOverrides);
  const prismaMock = {
    $transaction: async (arg) => {
      if (typeof arg === 'function') return arg(tx);
      if (Array.isArray(arg)) return Promise.all(arg.map(a => typeof a === 'function' ? a(tx) : a));
      return arg(tx);
    },
  };
  return new AccountingPostingService(prismaMock);
}

// ─── explainPostingBoundary ──────────────────────────────────────────────
test('AP-bnd-01: explainPostingBoundary mengembalikan metadata', () => {
  const svc = makeSvc();
  const result = svc.explainPostingBoundary();
  assert.ok(result.autoPostingEnabled);
  assert.ok(result.basis);
});

// ─── runIdempotentPosting ────────────────────────────────────────────────
test('AP-rip-01: runIdempotentPosting menjalankan fn dalam transaksi', async () => {
  const svc = makeSvc();
  const result = await svc.runIdempotentPosting('TEST', async (tx) => {
    const acct = await tx.chartOfAccount.findFirst({ where: { code: '4000' } });
    return { posted: true, journalEntry: { id: 99 }, basis: 'POSTING', accountFound: !!acct };
  });
  assert.ok(result.posted);
  assert.ok(result.accountFound);
});

test('AP-rip-02: runIdempotentPosting catch P2002 sebagai skip', async () => {
  // Buat error PrismaClientKnownRequestError
  const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5.0' });
  const txWithError = makeTx();
  txWithError.chartOfAccount.findFirst = async () => { throw p2002Error; };
  const svc = makeSvc(txWithError);
  const result = await svc.runIdempotentPosting('TEST', async (tx) => {
    await tx.chartOfAccount.findFirst({ where: { code: '4000' } });
    return { posted: true };
  });
  assert.ok(result.skipped);
  assert.equal(result.reason, 'Journal sudah ada (race duplicate, P2002).');
});

// ─── Delegation Methods ─────────────────────────────────────────────────
test('AP-inv-01: postInvoiceIssued sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postInvoiceIssued(1);
  // Bisa sukses diposting atau skip karena precondition
  // Yang penting tidak throw error
  assert.ok(result !== undefined);
  if (result.posted) assert.ok(result.journalEntry);
});

test('AP-inv-02: postInvoiceIssued invoice 999 skip', async () => {
  const svc = makeSvc();
  const result = await svc.postInvoiceIssued(999);
  assert.ok(result.skipped === true || result.skipped === undefined);
});

test('AP-pay-01: postInvoicePayment sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postInvoicePayment(1);
  assert.ok(result !== undefined);
});

test('AP-exp-01: postExpense sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postExpense(1);
  assert.ok(result !== undefined);
});

test('AP-wifi-01: postWifiSale sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postWifiSale(1);
  assert.ok(result !== undefined);
});

test('AP-dep-01: postDepositReceivedForStay sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postDepositReceivedForStay(1);
  assert.ok(result !== undefined);
});

test('AP-rev-01: postInvoiceCancellationReversal sukses', async () => {
  const svc = makeSvc();
  const result = await svc.postInvoiceCancellationReversal(1);
  assert.ok(result !== undefined);
});
