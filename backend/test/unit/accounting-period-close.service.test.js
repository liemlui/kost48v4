'use strict';

/**
 * Unit test: AccountingPeriodCloseService
 */
const test = require('node:test');
const assert = require('node:assert');
const { AccountingPeriodCloseService } = require('../../dist/modules/accounting/accounting-period-close.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    chartOfAccount: {
      findMany: async () => [
        { id: 1, code: '3200', name: 'Saldo Laba', type: 'EQUITY', normalBalance: 'CREDIT', isActive: true },
      ],
      findFirst: async () => ({ id: 1, code: '3200', name: 'Saldo Laba', type: 'EQUITY', normalBalance: 'CREDIT', isActive: true }),
    },
    accountingPeriod: {
      findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
      findUnique: async (args) => args?.where?.id === 999 ? null : ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
      update: async (args) => ({ id: args.where.id, status: 'CLOSED' }),
    },
    journalEntry: {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (args) => ({ id: 99, ...args.data }),
      count: async () => 0,
    },
    journalLine: {
      createMany: async () => ({ count: 2 }),
      groupBy: async () => [],
    },
    accountBalanceSnapshot: {
      findMany: async () => [],
      createMany: async () => ({ count: 3 }),
    },
    openingBalanceBatch: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    invoice: { aggregate: async () => ({ _sum: { paidAmountRupiah: 0, totalAmountRupiah: 0 } }), count: async () => 0 },
    invoicePayment: { count: async () => 0 },
    wifiSale: { count: async () => 0 },
    depositLedger: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    cashAccount: { findFirst: async () => ({ id: 1 }) },
    stay: { count: async () => 0 },
    expense: { count: async () => 0 },
    fixedAsset: { count: async () => 0 },
    assetDepreciationRun: { findUnique: async () => null },
    rentRecognitionSchedule: { count: async () => 0 },
  };
  const reports = {
    trialBalance: async () => ({ accounts: [], totalDebit: 0, totalCredit: 0, totalDebitRupiah: 0, totalCreditRupiah: 0, isBalanced: true, asOf: '2026-06-30' }),
    profitLoss: async () => ({ revenue: { total: 0 }, expenses: { total: 0 } }),
    balanceSheet: async () => ({ totalAssets: 0, totalLiabilities: 0, totalEquity: 0 }),
    unmappedTransactions: async () => [],
    depositPosition: async () => ({ total: 0 }),
  };
  const schemaGuard = { assertReady: async () => undefined };
  const audit = { log: async () => undefined };
  return new AccountingPeriodCloseService(prisma, reports, schemaGuard, audit);
}

test('APC-01: readiness returns status', async () => {
  const svc = makeSvc();
  const result = await svc.readiness({ year: 2026, month: 6 });
  assert.ok(result);
});

test('APC-02: preview does not throw', async () => {
  const svc = makeSvc();
  const result = await svc.preview({ year: 2026, month: 6 });
  assert.ok(result);
});
