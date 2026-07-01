'use strict';

/**
 * Unit test: AssetsService — CRUD, depreciation, ledger alignment
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { AssetsService } = require('../../dist/modules/assets/assets.service.js');

function makeSvc() {
  const prisma = {
    $transaction: async (fn) => typeof fn === 'function' ? fn(prisma) : (Array.isArray(fn) ? Promise.all(fn) : fn),
    chartOfAccount: {
      findUnique: async () => ({ id: 1, code: '1500', name: 'Fixed Assets', type: 'ASSET', normalBalance: 'DEBIT', isActive: true }),
      findFirst: async () => ({ id: 1, code: '1500', name: 'Fixed Assets', type: 'ASSET', normalBalance: 'DEBIT', isActive: true }),
    },
    cashAccount: { findUnique: async () => ({ id: 1, name: 'Bank BCA', isActive: true }) },
    fixedAsset: {
      findMany: async () => [{ id: 1, assetCode: 'FA-00001', assetName: 'AC 1 PK', status: 'ACTIVE', purchaseCostRupiah: 5000000, depreciationEnabled: true, depreciationMethod: 'STRAIGHT_LINE', usefulLifeMonths: 60, salvageValueRupiah: 0, monthlyDepreciationRupiah: 83333, accumulatedDepreciationRupiah: 0, netBookValueRupiah: 5000000, depreciationStartDate: new Date('2026-01-01'), ledgerAlignmentStatus: 'ALIGNED' }],
      findUnique: async (args) => args?.where?.id === 999 ? null : { id: 1, assetCode: 'FA-00001', assetName: 'AC 1 PK', status: 'ACTIVE', purchaseCostRupiah: 5000000, depreciationEnabled: true, usefulLifeMonths: 60, salvageValueRupiah: 0, monthlyDepreciationRupiah: 83333, accumulatedDepreciationRupiah: 0, netBookValueRupiah: 5000000, depreciationStartDate: new Date('2026-01-01'), ledgerAlignmentStatus: 'ALIGNED' },
      count: async () => 1,
      create: async (args) => ({ id: 50, ...args.data }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
      aggregate: async () => ({ _sum: { purchaseCostRupiah: 5000000 } }),
    },
    assetDepreciationRun: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (args) => ({ id: 10, ...args.data }),
      findMany: async () => [],
      count: async () => 0,
    },
    assetDepreciationLine: { createMany: async () => ({ count: 1 }) },
    journalEntry: { findFirst: async () => null },
  };
  const posting = {
    postFixedAssetLedgerAlignmentTx: async () => ({ posted: true, journalEntry: { id: 20 } }),
    postDepreciationRunTx: async () => ({ posted: true, journalEntry: { id: 21 } }),
    runIdempotentPosting: async (_label, fn) => fn(prisma),
  };
  return new AssetsService(prisma, posting);
}

test('AS-01: findAll returns list', async () => {
  const svc = makeSvc();
  const result = await svc.findAll({ page: 1, limit: 10 });
  assert.ok(result);
});

test('AS-02: findOne not found', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('AS-03: readiness returns status', async () => {
  const svc = makeSvc();
  const result = await svc.readiness();
  assert.ok(result);
});

test('AS-04: depreciationPreview returns preview', async () => {
  const svc = makeSvc();
  const result = await svc.depreciationPreview({ year: 2026, month: 6 });
  assert.ok(result);
});

test('AS-05: create berhasil', async () => {
  const svc = makeSvc();
  // purchaseCostRupiah harus number positif; DTO transformer mungkin ubah jadi string
  // Pastikan mock create mengembalikan data
  const result = await svc.create({
    assetName: 'AC Baru',
    name: 'AC Baru',
    assetType: 'EQUIPMENT',
    acquisitionCostRupiah: 3000000,
    purchaseDate: '2026-06-01',
    depreciationEnabled: true,
    usefulLifeMonths: 48,
    salvageValueRupiah: 0,
    depreciationMethod: 'STRAIGHT_LINE',
  }, { id: 1, role: 'ADMIN' });
  assert.ok(result);
});
