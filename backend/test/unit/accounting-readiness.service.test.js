'use strict';

/**
 * Unit test: AccountingReadinessService
 */
const test = require('node:test');
const assert = require('node:assert');
const { AccountingReadinessService } = require('../../dist/modules/accounting/accounting-readiness.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    chartOfAccount: { count: async () => 10 },
    cashAccount: { count: async () => 2 },
    accountingPeriod: { findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }) },
    journalEntry: { count: async () => 5 },
    openingBalanceBatch: { count: async () => 1 },
  };
  const schemaGuard = {
    assertReady: async () => undefined,
    getStatus: async () => ({ ready: true, missingTables: [], checkedTables: [], message: 'ready', nextActions: [] }),
  };
  return new AccountingReadinessService(prisma, schemaGuard);
}

test('AR-01: getReadiness mengembalikan readiness dengan gates', async () => {
  const svc = makeSvc();
  const result = await svc.getReadiness();
  assert.ok(result.ready !== undefined);
  assert.ok(Array.isArray(result.gates));
  assert.ok(result.score >= 0 && result.score <= 100);
});

test('AR-02: getPostingPeriodReadiness mengembalikan period info', async () => {
  const svc = makeSvc();
  const result = await svc.getPostingPeriodReadiness(new Date('2026-06-15'));
  assert.ok(result);
  assert.ok(result.ready !== undefined);
});
