'use strict';

/**
 * Unit test: ExpensesService
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { ExpensesService } = require('../../dist/modules/expenses/expenses.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    expense: {
      findMany: async () => [{ id: 1, description: 'Listrik', type: 'OPERATIONAL', amountRupiah: 200000, status: 'CONFIRMED', category: 'UTILITY', vendorName: 'PLN', expenseDate: new Date(), createdAt: new Date(), createdById: 1 }],
      findUnique: async (args) => args?.where?.id === 999 ? null : { id: 1, description: 'Listrik', type: 'OPERATIONAL', amountRupiah: 200000, status: 'CONFIRMED', category: 'UTILITY', vendorName: 'PLN', expenseDate: new Date(), createdAt: new Date(), createdById: 1 },
      count: async () => 1,
      create: async (args) => ({ id: 50, ...args.data }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
      delete: async () => ({ id: 1 }),
    },
    chartOfAccount: { findUnique: async () => ({ id: 1, isActive: true, type: 'EXPENSE' }) },
    cashAccount: { findUnique: async () => ({ id: 1, isActive: true }) },
    accountingPeriod: { findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }) },
  };
  const audit = { log: async () => undefined };
  const posting = {
    postExpense: async () => ({ posted: true, journalEntry: { id: 10 } }),
    runIdempotentPosting: async (_label, fn) => fn(prisma),
  };
  return new ExpensesService(prisma, audit, posting);
}

test('EX-01: findAll returns list', async () => {
  const svc = makeSvc();
  const result = await svc.findAll({ page: 1, limit: 10 });
  assert.ok(result);
  assert.ok(Array.isArray(result.data ?? []));
});

test('EX-02: findOne not found', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('EX-03: create berhasil', async () => {
  const svc = makeSvc();
  const result = await svc.create({ description: 'Test', type: 'OPERATIONAL', amountRupiah: 100000, category: 'UTILITY', expenseDate: '2026-06-15', vendorName: 'Test' }, { id: 1, role: 'ADMIN' });
  assert.ok(result);
});

test('EX-04: remove not found', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.remove(999, { id: 1, role: 'ADMIN' }), (e) => e instanceof NotFoundException);
});
