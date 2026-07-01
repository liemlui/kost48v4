'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ForbiddenException } = require('@nestjs/common');
const { InvoicePaymentsService } = require('../../dist/modules/invoice-payments/invoice-payments.service.js');

const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    invoice: { findUnique: async () => ({ id: 1, status: 'ISSUED', totalAmountRupiah: 500000, paidAmountRupiah: 0, invoiceNumber: 'INV-001', lines: [] }) },
    invoicePayment: { findMany: async () => [], findUnique: async () => null, create: async (a) => ({ id: 50, ...a.data }), count: async () => 0 },
    journalEntry: { findFirst: async () => null },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  const posting = { postInvoicePaymentTx: async () => ({ posted: true, journalEntry: { id: 20 } }) };
  return new InvoicePaymentsService(prisma, audit, posting);
}

test('IP-rg-01: non-admin cannot create', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.create(1, { paymentDate: new Date().toISOString(), amountRupiah: 500000, method: 'TRANSFER' }, { id: 10, role: 'TENANT' }), (e) => e instanceof ForbiddenException);
});

test('IP-rg-02: STAFF cannot create', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.create(1, { paymentDate: new Date().toISOString(), amountRupiah: 500000, method: 'TRANSFER' }, { id: 5, role: 'STAFF' }), (e) => e instanceof ForbiddenException);
});
