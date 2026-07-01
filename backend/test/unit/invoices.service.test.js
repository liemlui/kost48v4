'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { InvoicesService } = require('../../dist/modules/invoices/invoices.service.js');

const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    invoice: {
      findUnique: async () => null,
      update: async (a) => ({ id: 100, ...a.data }),
      findMany: async () => [],
      count: async () => 0,
    },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  const posting = { postInvoiceIssuedTx: async () => ({ posted: true }) };
  const readiness = { isReady: async () => ({ ready: true }) };
  return new InvoicesService(prisma, audit, posting, readiness);
}

test('IV-fo-01: findOne not found', async () => {
  const svc = makeSvc({ invoice: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('IV-ca-01: cancel not found', async () => {
  const svc = makeSvc({ invoice: { findUnique: async () => null } });
  await assert.rejects(() => svc.cancel(999, { cancelReason: 'Batal' }, ADMIN), (e) => e instanceof NotFoundException);
});
