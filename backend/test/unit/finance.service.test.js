'use strict';

/**
 * Unit test: FinanceService
 */
const test = require('node:test');
const assert = require('node:assert');
const { FinanceService } = require('../../dist/modules/finance/finance.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    $queryRaw: async () => [{ cnt: 20 }],
    chartOfAccount: { findMany: async () => [], findFirst: async () => null },
    journalEntry: { findMany: async () => [], count: async () => 0 },
    journalLine: { groupBy: async () => [] },
    accountBalanceSnapshot: { findMany: async () => [] },
    accountingPeriod: { findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }) },
    stay: { count: async () => 0, findMany: async () => [], aggregate: async () => ({ _sum: { depositPaidAmountRupiah: 0, depositAmountRupiah: 0 }, _count: { id: 0 } }) },
    room: { count: async () => 48, findMany: async () => [], groupBy: async () => [] },
    invoice: { aggregate: async () => ({ _sum: { paidAmountRupiah: 0, totalAmountRupiah: 0 } }) },
    invoicePayment: { aggregate: async () => ({ _sum: { amountRupiah: 0 }, _count: { id: 0 } }) },
    wifiSale: { aggregate: async () => ({ _sum: { soldPriceRupiah: 0 } }) },
    depositLedger: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    expense: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    cashAccount: { findMany: async () => [] },
    checkoutRequest: { count: async () => 0 },
    ticket: { count: async () => 0 },
    paymentSubmission: { count: async () => 0 },
    renewRequest: { count: async () => 0 },
  };
  return new FinanceService(prisma);
}

test('FI-01: businessHealth returns report', async () => {
  const svc = makeSvc();
  const result = await svc.businessHealth({ year: 2026, month: 6 });
  assert.ok(result);
  assert.ok('score' in result || 'grade' in result || 'health' in result);
});

test('FI-02: occupancySummary returns data', async () => {
  const svc = makeSvc();
  const result = await svc.occupancySummary({ year: 2026, month: 6 });
  assert.ok(result);
});
