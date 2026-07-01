'use strict';

/**
 * Unit test: RedemptionService — reward CRUD, request, decide (approve/reject)
 *
 * Cakupan: Y-H2
 */
const test = require('node:test');
const assert = require('node:assert');
const { RedemptionService } = require('../../dist/modules/loyalty/redemption.service.js');

// ─── Helper: buat mock tx (digunakan di dalam $transaction) ────────────
function makeTx(overrides = {}) {
  return {
    $queryRaw: async (strings, ...args) => {
      // Default: return reward aktif, stok 5
      return [{ id: 1, name: 'Voucher WiFi', pointCost: 100, stockQty: 5, type: 'SERVICE_ADDON', isActive: true, description: 'WiFi 30GB', fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: 10000 }];
    },
    loyaltyPoint: {
      aggregate: async ({ where, _sum }) => ({ _sum: { delta: 200 } }), // saldo cukup
    },
    redemption: {
      create: async (args) => ({ id: 10, ...args.data }),
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 10, tenantId: 1, rewardId: 1, pointCost: 100, status: 'PENDING', decidedAt: null, decidedById: null, journalEntryId: null, note: null, reward: { name: 'Voucher WiFi', type: 'SERVICE_ADDON', stockQty: 5, valueRupiah: 10000, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, description: 'WiFi 30GB' } };
      },
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    loyaltyReward: {
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    user: {
      findMany: async () => [{ id: 7 }], // untuk pickRoundRobinStaffTx
    },
    stay: {
      findFirst: async () => ({ id: 5, roomId: 3 }),
    },
    ticket: {
      findUnique: async () => null,
      create: async (args) => ({ id: 99, ...args.data }),
      count: async () => 0,
    },
    ...overrides,
  };
}

function makeSvc(txOverrides = {}, loyaltyOverrides = {}, postingOverrides = {}) {
  const tx = makeTx(txOverrides);
  const prisma = {
    loyaltyReward: {
      create: async (args) => ({ id: 1, ...args.data }),
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: args.where.id, name: 'Voucher WiFi', pointCost: 100, type: 'SERVICE_ADDON', isActive: true, description: 'WiFi 30GB', valueRupiah: 10000, stockQty: 5, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null };
      },
      findMany: async () => [{ id: 1, name: 'Voucher WiFi', pointCost: 100, type: 'SERVICE_ADDON', isActive: true }],
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    redemption: {
      findMany: async (args) => {
        const rows = [
          { id: 10, pointCost: 100, status: 'PENDING', reward: { name: 'Voucher', type: 'SERVICE_ADDON' }, tenant: { fullName: 'Budi' } },
        ];
        if (args?.where?.status) return rows.filter(r => r.status === args.where.status);
        return rows;
      },
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 10, tenantId: 1, rewardId: 1, pointCost: 100, status: 'PENDING', decidedAt: null, decidedById: null, journalEntryId: null, note: null, reward: { id: 1, name: 'Voucher WiFi', type: 'SERVICE_ADDON', stockQty: 5, valueRupiah: 10000, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, description: 'WiFi 30GB' } };
      },
      create: async (args) => ({ id: 10, ...args.data }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    $transaction: async (arg) => {
      if (typeof arg === 'function') return arg(tx);
      return arg;
    },
    ...loyaltyOverrides.prisma,
  };

  const loyalty = {
    award: async (input) => {
      if (input.delta === 0) return { created: false, skipped: true, reason: 'ZERO_DELTA' };
      return { created: true, id: 99 };
    },
    ...loyaltyOverrides,
  };

  const posting = {
    postRewardFulfillmentTx: async (tx, params) => ({ journalEntry: { id: 200 } }),
    ...postingOverrides,
  };

  return new RedemptionService(prisma, loyalty, posting);
}

// ─── Y-H2a: Reward CRUD ─────────────────────────────────────────────────
test('RH-reward-01: createReward membuat reward baru', async () => {
  let captured = null;
  const svc = makeSvc({}, {
    prisma: {
      loyaltyReward: { create: async (args) => { captured = args.data; return { id: 1, ...args.data }; } },
    },
  });
  const result = await svc.createReward({ name: 'Voucher WiFi', pointCost: 100, type: 'SERVICE_ADDON', description: 'WiFi 30GB', valueRupiah: 10000, stockQty: 5, isActive: true });
  assert.strictEqual(captured.name, 'Voucher WiFi');
  assert.strictEqual(captured.pointCost, 100);
  assert.strictEqual(captured.type, 'SERVICE_ADDON');
});

test('RH-reward-02: updateReward mengupdate reward yang ada', async () => {
  let capturedUpdate = null;
  const svc = makeSvc({}, {
    prisma: {
      loyaltyReward: {
        findUnique: async () => ({ id: 1, name: 'Voucher WiFi', pointCost: 100, type: 'SERVICE_ADDON', isActive: true }),
        update: async (args) => { capturedUpdate = args.data; return { id: 1, ...args.data }; },
      },
    },
  });
  const result = await svc.updateReward(1, { name: 'Voucher 60GB', pointCost: 150 });
  assert.strictEqual(capturedUpdate.name, 'Voucher 60GB');
  assert.strictEqual(capturedUpdate.pointCost, 150);
});

test('RH-reward-03: updateReward throw NotFound bila reward tidak ada', async () => {
  const svc = makeSvc({}, {
    prisma: {
      loyaltyReward: { findUnique: async () => null },
    },
  });
  await assert.rejects(() => svc.updateReward(999, { name: 'X' }), { message: 'Reward tidak ditemukan' });
});

test('RH-reward-04: listRewards mengembalikan reward aktif', async () => {
  const svc = makeSvc();
  const list = await svc.listRewards();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].isActive, true);
});

// ─── Y-H2b: Request Redemption ──────────────────────────────────────────
test('RH-request-01: requestRedemption sukses memotong poin dan stok', async () => {
  let awardInput = null;
  let afterCalled = false;
  const svc = makeSvc({
    redemption: {
      create: async (args) => ({ id: 10, ...args.data }),
    },
    $queryRaw: async () => [{ id: 1, name: 'Voucher WiFi', pointCost: 100, stockQty: 5, type: 'SERVICE_ADDON', isActive: true, description: 'WiFi 30GB', fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: 10000 }],
    loyaltyPoint: {
      aggregate: async ({ where, _sum }) => {
        // first call (before check) = balance 200, second call (after guard) = balance after deduct
        if (!afterCalled) { afterCalled = true; return { _sum: { delta: 200 } }; }
        return { _sum: { delta: 100 } }; // after deduct: 200 - 100 = 100
      },
    },
  }, {
    award: async (input) => { awardInput = input; return { created: true, id: 99 }; },
  });
  const result = await svc.requestRedemption(1, 1);
  assert.strictEqual(result.status, 'PENDING');
  assert.strictEqual(awardInput.delta, -100);
  assert.strictEqual(awardInput.sourceType, 'REDEMPTION');
});

test('RH-request-02: requestRedemption throw bila reward tidak aktif', async () => {
  const svc = makeSvc({
    $queryRaw: async () => [{ id: 1, name: 'Voucher', pointCost: 100, stockQty: 5, type: 'SERVICE_ADDON', isActive: false, description: null, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: null }],
  });
  await assert.rejects(() => svc.requestRedemption(1, 1), { message: 'Reward tidak tersedia' });
});

test('RH-request-03: requestRedemption throw bila stok habis', async () => {
  const svc = makeSvc({
    $queryRaw: async () => [{ id: 1, name: 'Voucher', pointCost: 100, stockQty: 0, type: 'SERVICE_ADDON', isActive: true, description: null, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: null }],
  });
  await assert.rejects(() => svc.requestRedemption(1, 1), { message: 'Stok reward habis' });
});

test('RH-request-04: requestRedemption throw bila poin tidak cukup', async () => {
  let afterCalled = false;
  const svc = makeSvc({
    $queryRaw: async () => [{ id: 1, name: 'Voucher', pointCost: 300, stockQty: 5, type: 'SERVICE_ADDON', isActive: true, description: null, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: null }],
    loyaltyPoint: {
      aggregate: async ({ where, _sum }) => {
        if (!afterCalled) { afterCalled = true; return { _sum: { delta: 200 } }; } // saldo 200 < cost 300
        return { _sum: { delta: 200 } };
      },
    },
  });
  await assert.rejects(() => svc.requestRedemption(1, 1), { message: 'Poin tidak cukup untuk menukar reward ini' });
});

test('RH-request-05: requestRedemption throw bila after guard negatif (race)', async () => {
  let afterCalled = false;
  const svc = makeSvc({
    $queryRaw: async () => [{ id: 1, name: 'Voucher', pointCost: 100, stockQty: 5, type: 'SERVICE_ADDON', isActive: true, description: null, fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, valueRupiah: null }],
    loyaltyPoint: {
      aggregate: async ({ where, _sum }) => {
        if (!afterCalled) { afterCalled = true; return { _sum: { delta: 200 } }; }
        return { _sum: { delta: -20 } }; // after deduct negatif (overspend race)
      },
    },
  });
  await assert.rejects(() => svc.requestRedemption(1, 1), { message: 'Poin tidak cukup untuk menukar reward ini' });
});

// ─── Y-H2c: Decide Redemption ───────────────────────────────────────────
test('RH-decide-01: decide REJECT mengembalikan poin + stok', async () => {
  let awardInput = null;
  let updateStockQty = null;
  const svc = makeSvc({
    redemption: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: 10, tenantId: 1, rewardId: 1, pointCost: 100, status: 'PENDING', decidedAt: null, decidedById: null, journalEntryId: null, note: null, reward: { id: 1, name: 'Voucher WiFi', stockQty: 5, valueRupiah: 0, type: 'SERVICE_ADDON', fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, description: null } };
      },
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    $queryRaw: async () => [{ id: 1, stockQty: 5 }],
    loyaltyReward: {
      update: async (args) => { updateStockQty = args.data.stockQty; return { id: 1, ...args.data }; },
    },
  }, {
    award: async (input) => { awardInput = input; return { created: true, id: 99 }; },
  });
  const result = await svc.decideRedemption(10, 'REJECT', 7, 'Tidak valid');
  assert.strictEqual(result.status, 'REJECTED');
  assert.strictEqual(awardInput.delta, 100); // refund poin
  assert.strictEqual(awardInput.sourceType, 'REDEMPTION_REFUND');
  assert.strictEqual(updateStockQty, 6); // stok dikembalikan +1
});

test('RH-decide-02: decide APPROVE fulfilled reward + jurnal', async () => {
  let journalParams = null;
  const svc = makeSvc({
    redemption: {
      findUnique: async (args) => ({
        id: 10, tenantId: 1, rewardId: 1, pointCost: 100, status: 'PENDING', decidedAt: null, decidedById: null, journalEntryId: null, note: null,
        reward: { id: 1, name: 'Voucher WiFi', stockQty: 5, valueRupiah: 10000, type: 'SERVICE_ADDON', fulfillmentTaskCategory: 'CLEANING', fulfillmentTaskTitle: 'Bersihkan kamar', description: 'Layanan bersih' },
      }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    $queryRaw: async () => [{ id: 1, stockQty: 5 }],
  }, {}, {
    postRewardFulfillmentTx: async (tx, params) => { journalParams = params; return { journalEntry: { id: 200 } }; },
  });
  const result = await svc.decideRedemption(10, 'APPROVE', 7);
  assert.strictEqual(result.status, 'FULFILLED');
  assert.strictEqual(result.journalEntryId, 200);
  assert.strictEqual(journalParams.valueRupiah, 10000);
  assert.strictEqual(journalParams.rewardType, 'SERVICE_ADDON');
});

test('RH-decide-03: decide throw NotFound bila redemption tidak ada', async () => {
  const svc = makeSvc({
    redemption: { findUnique: async () => null },
  });
  await assert.rejects(() => svc.decideRedemption(999, 'APPROVE', 7), { message: 'Penukaran tidak ditemukan' });
});

test('RH-decide-04: decide throw Conflict bila status bukan PENDING', async () => {
  const svc = makeSvc({
    redemption: {
      findUnique: async () => ({ id: 10, tenantId: 1, rewardId: 1, pointCost: 100, status: 'FULFILLED', reward: { id: 1, name: 'V', stockQty: 5, valueRupiah: 0, type: 'SERVICE_ADDON', fulfillmentTaskCategory: null, fulfillmentTaskTitle: null, description: null } }),
    },
  });
  await assert.rejects(() => svc.decideRedemption(10, 'APPROVE', 7), { message: /Penukaran sudah/ });
});

// ─── Y-H2d: List + guard ────────────────────────────────────────────────
test('RH-list-01: listRedemptions tanpa filter', async () => {
  const svc = makeSvc();
  const list = await svc.listRedemptions();
  assert.strictEqual(list.length, 1);
});

test('RH-list-02: listRedemptions dengan filter status', async () => {
  const svc = makeSvc();
  const list = await svc.listRedemptions('PENDING');
  assert.strictEqual(list.length, 1);
});

test('RH-list-03: myRedemptions mengembalikan riwayat tenant', async () => {
  let capturedWhere = null;
  const svc = makeSvc({}, {
    prisma: {
      redemption: {
        findMany: async (args) => { capturedWhere = args.where; return []; },
      },
    },
  });
  await svc.myRedemptions(1);
  assert.strictEqual(capturedWhere.tenantId, 1);
});

test('RH-assert-01: assertTenant throw bila null', async () => {
  const svc = makeSvc();
  assert.throws(() => svc.assertTenant(null), { message: 'Hanya tenant yang dapat menukar reward' });
});

test('RH-assert-02: assertTenant return tenantId bila valid', async () => {
  const svc = makeSvc();
  assert.strictEqual(svc.assertTenant(5), 5);
});
