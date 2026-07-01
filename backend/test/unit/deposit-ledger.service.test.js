'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { DepositLedgerService } = require('../../dist/modules/deposit-ledger/deposit-ledger.service.js');

function makeSvc() {
  const prisma = {
    stay: { findMany: async () => [] },
    tenantDepositLedgerEntry: { findMany: async () => [/* summary query path: entry not found, empty branch needs at least tenant data */] },
  };
  return new DepositLedgerService(prisma);
}

test('DL-create-01: summary does not throw', async () => {
  const svc = makeSvc();
  const r = await svc.summary({});
  assert.ok(r);
});
