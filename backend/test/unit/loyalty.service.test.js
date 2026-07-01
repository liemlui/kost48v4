'use strict';

/**
 * Unit test: LoyaltyService — award, earn, balance, history, leaderboard
 *
 * Cakupan: Y-H1
 */
const test = require('node:test');
const assert = require('node:assert');
const { LoyaltyService } = require('../../dist/modules/loyalty/loyalty.service.js');

function makeSvc(overrides = {}) {
  const prisma = {
    loyaltyPoint: {
      create: async (args) => ({ id: 42, ...args.data }),
      aggregate: async ({ where, _sum }) => {
        if (where?.tenantId === 999) return { _sum: { delta: null } };
        // history() butuh 3 aggregate: balance (no filter), earned (gt:0), spent (lt:0)
        if (where?.delta?.gt != null) return { _sum: { delta: 100 } }; // earned
        if (where?.delta?.lt != null) return { _sum: { delta: -50 } }; // spent
        return { _sum: { delta: 100 } };
      },
      findMany: async (args) => {
        // history
        return [
          { id: 1, delta: 100, reason: 'RENEWAL', note: null, createdAt: new Date('2026-06-01') },
          { id: 2, delta: -50, reason: 'REDEMPTION', note: 'Tukar reward', createdAt: new Date('2026-06-15') },
        ];
      },
      groupBy: async () => {
        if (overrides.noPoints) return [];
        return [
          { tenantId: 1, _sum: { delta: 200 } },
          { tenantId: 2, _sum: { delta: 150 } },
        ];
      },
    },
    stay: {
      findMany: async () => [
        { tenantId: 1, room: { code: 'A1-001' } },
      ],
    },
    ...overrides.prisma,
  };
  return new LoyaltyService(prisma);
}

// ─── Y-H1a: award — idempotent, delta 0, normal create ─────────────────
test('LH-award-01: award dengan delta 0 tidak membuat record', async () => {
  const svc = makeSvc();
  const result = await svc.award({ tenantId: 1, delta: 0, reason: 'RENEWAL', sourceType: 'RENEWAL', sourceId: '1' });
  assert.deepStrictEqual(result, { created: false, skipped: true, reason: 'ZERO_DELTA' });
});

test('LH-award-02: award membuat record loyaltyPoint', async () => {
  let captured = null;
  const svc = makeSvc({
    prisma: {
      loyaltyPoint: {
        create: async (args) => {
          captured = args.data;
          return { id: 42, ...args.data };
        },
      },
    },
  });
  const result = await svc.award({ tenantId: 1, delta: 100, reason: 'RENEWAL', sourceType: 'RENEWAL', sourceId: 'S1', note: 'Renewal', createdById: 7 });
  assert.strictEqual(result.created, true);
  assert.strictEqual(result.id, 42);
  assert.strictEqual(captured.tenantId, 1);
  assert.strictEqual(captured.delta, 100);
  assert.strictEqual(captured.sourceId, 'S1');
});

test('LH-award-03: award P2002 (duplicate) mengembalikan ALREADY_AWARDED', async () => {
  const { Prisma } = require('../../dist/generated/prisma');
  const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5' });
  const svc = makeSvc({
    prisma: {
      loyaltyPoint: {
        create: async () => { throw p2002; },
      },
    },
  });
  const result = await svc.award({ tenantId: 1, delta: 100, reason: 'RENEWAL', sourceType: 'RENEWAL', sourceId: 'S1' });
  assert.deepStrictEqual(result, { created: false, skipped: true, reason: 'ALREADY_AWARDED' });
});

test('LH-award-04: award P2002 lain tetap rethrow', async () => {
  const svc = makeSvc({
    prisma: {
      loyaltyPoint: {
        create: async () => { throw new Error('DB down'); },
      },
    },
  });
  await assert.rejects(() => svc.award({ tenantId: 1, delta: 100, reason: 'RENEWAL', sourceType: 'RENEWAL', sourceId: 'S1' }), { message: 'DB down' });
});

// ─── Y-H1b: earn ────────────────────────────────────────────────────────
test('LH-earn-01: earn memanggil award dengan delta dari konstanta', async () => {
  let awardArgs = null;
  const svc = makeSvc({
    prisma: {
      loyaltyPoint: {
        create: async (args) => {
          awardArgs = args.data;
          return { id: 55, ...args.data };
        },
      },
    },
  });
  const result = await svc.earn(1, 'RENEWAL', 'SRC-1', { note: 'Auto renew' });
  assert.strictEqual(result.created, true);
  assert.strictEqual(awardArgs.tenantId, 1);
  assert.strictEqual(awardArgs.delta, 100); // LOYALTY_POINTS.RENEWAL = 100
  assert.strictEqual(awardArgs.sourceType, 'RENEWAL');
  assert.strictEqual(awardArgs.sourceId, 'SRC-1');
});

test('LH-earn-02: earn reason tanpa delta = skip', async () => {
  const svc = makeSvc();
  // reason tidak dikenal di LOYALTY_POINTS → pointsForReason returns 0
  const result = await svc.earn(1, 'UNKNOWN', 'SRC-2');
  assert.strictEqual(result.created, false);
  assert.strictEqual(result.skipped, true);
});

// ─── Y-H1c: earnSafe ────────────────────────────────────────────────────
test('LH-earnSafe-01: earnSafe sukses mengembalikan hasil earn', async () => {
  const svc = makeSvc();
  const result = await svc.earnSafe(1, 'RENEWAL', 'SRC-3');
  assert.strictEqual(result.created, true);
});

test('LH-earnSafe-02: earnSafe gagal tidak throw, return error:true', async () => {
  const svc = makeSvc({
    prisma: {
      loyaltyPoint: {
        create: async () => { throw new Error('DB err'); },
      },
    },
  });
  const result = await svc.earnSafe(1, 'RENEWAL', 'SRC-4');
  assert.strictEqual(result.created, false);
  assert.strictEqual(result.error, true);
});

// ─── Y-H1d: balance ──────────────────────────────────────────────────────
test('LH-balance-01: balance normal', async () => {
  const svc = makeSvc();
  const bal = await svc.balance(1);
  assert.strictEqual(bal, 100);
});

test('LH-balance-02: balance tenant tanpa poin = 0', async () => {
  const svc = makeSvc();
  const bal = await svc.balance(999); // tenantId=999 dikondisikan null
  assert.strictEqual(bal, 0);
});

// ─── Y-H1e: history ──────────────────────────────────────────────────────
test('LH-history-01: history mengembalikan balance+items', async () => {
  const svc = makeSvc();
  const h = await svc.history(1);
  assert.strictEqual(h.balance, 100);
  assert.strictEqual(h.totalEarned, 100);
  assert.strictEqual(h.totalRedeemed, 50); // Math.abs dari spent -50
  assert.strictEqual(h.items.length, 2);
  assert.strictEqual(h.items[0].delta, 100);
  assert.strictEqual(h.items[1].delta, -50);
  assert.ok(typeof h.items[0].createdAt === 'string');
});

// ─── Y-H1f: leaderboardByRoom ────────────────────────────────────────────
test('LH-leaderboard-01: leaderboard mengembalikan top per kamar', async () => {
  const svc = makeSvc();
  const lb = await svc.leaderboardByRoom(3);
  assert.strictEqual(lb.length, 1);
  assert.strictEqual(lb[0].roomCode, 'A1-001');
  assert.strictEqual(lb[0].points, 200);
  assert.strictEqual(lb[0].rank, 1);
});

test('LH-leaderboard-02: leaderboard kosong bila tidak ada data', async () => {
  const svc = makeSvc({ noPoints: true });
  const lb = await svc.leaderboardByRoom(3);
  assert.strictEqual(lb.length, 0);
});
