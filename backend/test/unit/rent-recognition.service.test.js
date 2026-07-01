'use strict';

/**
 * Unit test: RentRecognitionService
 */
const test = require('node:test');
const assert = require('node:assert');
const { RentRecognitionService } = require('../../dist/modules/accounting/rent-recognition.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    chartOfAccount: {
      findUnique: async () => ({ id: 1, code: '4000', name: 'Pendapatan Sewa', type: 'INCOME', normalBalance: 'CREDIT', isActive: true }),
      findFirst: async () => ({ id: 1, code: '4000', name: 'Pendapatan Sewa', type: 'INCOME', normalBalance: 'CREDIT', isActive: true }),
    },
    stay: {
      findMany: async () => [
        { id: 1, tenantId: 1, roomId: 1, pricingTerm: 'YEARLY', agreedRentAmountRupiah: 12000000, checkInDate: new Date('2026-01-01'), initialMetersPromotedAt: new Date('2026-01-01'), createdAt: new Date('2026-01-01') },
      ],
    },
    invoice: {
      findFirst: async () => ({ id: 1, lines: [{ lineAmountRupiah: 12000000 }] }),
    },
    journalEntry: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async (args) => ({ id: 99, ...args.data }),
    },
    journalLine: { createMany: async () => ({ count: 2 }) },
    rentRecognitionSchedule: {
      findMany: async () => [],
      createMany: async () => ({ count: 12 }),
    },
    accountingPeriod: {
      findFirst: async () => ({ id: 1, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN' }),
    },
  };
  const posting = {
    postRentDeferralTx: async () => ({ posted: true, journalEntry: { id: 50 } }),
    postRentRecognitionTx: async () => ({ posted: true, journalEntry: { id: 51 } }),
    runIdempotentPosting: async (_label, fn) => fn(prisma),
  };
  return new RentRecognitionService(prisma, posting);
}

test('RR-01: ensureSchedules berjalan tanpa error', async () => {
  const svc = makeSvc();
  const result = await svc.ensureSchedules();
  assert.ok(result !== undefined);
});

test('RR-02: recognizeDue berjalan tanpa error', async () => {
  const svc = makeSvc();
  const result = await svc.recognizeDue();
  assert.ok(result !== undefined);
});
