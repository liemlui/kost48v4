'use strict';

/**
 * Unit test: AccountingReportsService
 */
const test = require('node:test');
const assert = require('node:assert');
const { AccountingReportsService } = require('../../dist/modules/accounting/accounting-reports.service.js');

function makeSvc() {
  // Tanpa $transaction karena trialBalance tidak pakai transaksi
  const prisma = {
    chartOfAccount: {
      findMany: async () => [
        { id: 1, code: '1000', name: 'Kas', type: 'ASSET', normalBalance: 'DEBIT', isActive: true },
        { id: 2, code: '2000', name: 'Hutang', type: 'LIABILITY', normalBalance: 'CREDIT', isActive: true },
      ],
      findFirst: async () => ({ id: 1, code: '1000', name: 'Kas', type: 'ASSET', normalBalance: 'DEBIT', isActive: true }),
    },
    journalEntry: {
      findMany: async () => [],
      findFirst: async () => null,
      count: async () => 0,
    },
    journalLine: {
      findMany: async () => [],
      groupBy: async () => [{ chartOfAccountId: 1, _sum: { debitRupiah: 0, creditRupiah: 0 } }],
    },
    accountBalanceSnapshot: { findMany: async () => [] },
    accountingPeriod: {
      findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
      findUnique: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
    },
    openingBalanceBatch: { findFirst: async () => null },
    openingBalanceLine: { groupBy: async () => [] },
    invoice: { findMany: async () => [], aggregate: async () => ({ _sum: { paidAmountRupiah: 0, totalAmountRupiah: 0 } }) },
    depositLedger: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    stay: { count: async () => 0 },
    expense: { findMany: async () => [] },
  };
  const readiness = {
    getReadiness: async () => ({ ready: true, score: 100, gates: [], missing: [], nextActions: [], warnings: [] }),
    getPostingPeriodReadiness: async () => ({ ready: true, key: '2026-06', id: 1, year: 2026, month: 6, status: 'OPEN', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), warning: null, nextAction: null, postingDate: '2026-06-15' }),
  };
  const schemaGuard = { assertReady: async () => undefined };
  return new AccountingReportsService(prisma, readiness, schemaGuard);
}

test('ARPT-01: trialBalance returns object', async () => {
  const svc = makeSvc();
  const result = await svc.trialBalance({ asOf: '2026-06-30' });
  assert.ok(result);
});

test('ARPT-02: profitLoss returns object', async () => {
  const svc = makeSvc();
  const result = await svc.profitLoss({ year: 2026, month: 6 });
  assert.ok(result);
});
