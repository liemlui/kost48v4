'use strict';

/**
 * Unit test: ReportsService
 */
const test = require('node:test');
const assert = require('node:assert');
const { ReportsService } = require('../../dist/modules/reports/reports.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    chartOfAccount: { findMany: async () => [] },
    journalEntry: { findMany: async () => [], count: async () => 0, aggregate: async () => ({ _sum: { totalAmountRupiah: 0 } }) },
    journalLine: { groupBy: async () => [] },
    accountBalanceSnapshot: { findMany: async () => [] },
    invoice: { findMany: async () => [], aggregate: async () => ({ _sum: { totalAmountRupiah: 0, paidAmountRupiah: 0 } }), groupBy: async () => [] },
    invoicePayment: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    wifiSale: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    depositLedger: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }) },
    stay: { count: async () => 0, findMany: async () => [] },
    room: { count: async () => 48, findMany: async () => [], groupBy: async () => [] },
    expense: { aggregate: async () => ({ _sum: { amountRupiah: 0 } }), findMany: async () => [], groupBy: async () => [] },
    cashAccount: { findMany: async () => [] },
  };
  return new ReportsService(prisma);
}

test('RP-01: monthlyIncome returns data', async () => {
  const svc = makeSvc();
  const result = await svc.monthlyIncome({ year: 2026, month: 6 });
  assert.ok(result);
});

// profitLoss(year, month) — argumen terpisah, bukan object
test('RP-02: profitLoss returns data', async () => {
  const svc = makeSvc();
  const result = await svc.profitLoss(2026, 6);
  assert.ok(result);
});

test('RP-03: financialRatios returns data', async () => {
  const svc = makeSvc();
  const result = await svc.financialRatios(2026, 6);
  assert.ok(result);
});
