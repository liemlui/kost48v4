'use strict';

/**
 * Unit test: ReferralService — kode referral, link, sweeper reward
 *
 * Cakupan: Y-H3
 */
const test = require('node:test');
const assert = require('node:assert');
const { ReferralService } = require('../../dist/modules/loyalty/referral.service.js');

// ─── Helper ─────────────────────────────────────────────────────────────
function makeSvc(overrides = {}) {
  const prisma = {
    tenant: {
      findUnique: async (args) => {
        // tenant 1 sudah punya kode
        if (args?.where?.id === 1 && args?.select?.referralCode) return { referralCode: 'REF1ABCD' };
        // tenant tanpa kode
        if (args?.where?.id === 2 && args?.select?.referralCode) return { referralCode: null };
        // cek clash: tenant 99 clash
        if (args?.where?.referralCode === 'REF99CLASH') return { id: 99 };
        // referralCode tidak ditemukan
        if (args?.where?.referralCode != null && args?.where?.referralCode !== 'REF1ABCD') return null;
        return { id: args.where.id, fullName: 'Test' };
      },
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    tenantReferral: {
      findMany: async () => [
        { id: 1, referrerTenantId: 1, referredTenantId: 2 },
        { id: 2, referrerTenantId: 1, referredTenantId: 3 }, // belum active stay
      ],
      upsert: async (args) => ({ id: 10, ...args.create }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
    },
    stay: {
      findFirst: async (args) => {
        // referredTenantId=2 → active stay (promoted) ; 3 → no stay
        if (args?.where?.tenantId === 2) return { id: 99, status: 'ACTIVE' };
        return null;
      },
    },
    ...overrides.prisma,
  };

  const loyalty = {
    award: async (input) => {
      if (input.delta === 0) return { created: false, skipped: true, reason: 'ZERO_DELTA' };
      return { created: true, id: 55 };
    },
    ...overrides.loyalty,
  };

  return new ReferralService(prisma, loyalty);
}

// ─── Y-H3a: getOrCreateCode ─────────────────────────────────────────────
test('REF-code-01: tenant dengan kode existing mengembalikan kode yang ada', async () => {
  const svc = makeSvc();
  const result = await svc.getOrCreateCode(1);
  assert.strictEqual(result.code, 'REF1ABCD');
});

test('REF-code-02: tenant tanpa kode membuat kode baru', async () => {
  let updatedData = null;
  const svc = makeSvc({
    prisma: {
      tenant: {
        findUnique: async (args) => {
          if (args?.where?.id === 2 && args?.select?.referralCode) return { referralCode: null };
          if (args?.where?.referralCode != null) return null;
          return { id: args.where.id };
        },
        update: async (args) => { updatedData = args.data; return { id: 2, ...args.data }; },
      },
    },
  });
  const result = await svc.getOrCreateCode(2);
  assert.ok(result.code.startsWith('REF2'));
  assert.strictEqual(updatedData.referralCode, result.code);
});

test('REF-code-03: getOrCreateCode handle clash dengan retry', async () => {
  let attempts = 0;
  const svc = makeSvc({
    prisma: {
      tenant: {
        findUnique: async (args) => {
          if (args?.where?.id === 3 && args?.select?.referralCode) return { referralCode: null };
          // Simulasikan clash pertama, lalu berhasil
          if (args?.where?.referralCode != null) {
            attempts += 1;
            if (attempts <= 2) return { id: 99 }; // clash
            return null; // tidak clash
          }
          return { id: args.where.id };
        },
        update: async (args) => ({ id: 3, ...args.data }),
      },
    },
  });
  const result = await svc.getOrCreateCode(3);
  assert.ok(result.code.startsWith('REF3'));
});

// ─── Y-H3b: linkReferralTx ──────────────────────────────────────────────
test('REF-link-01: linkReferralTx membuat tenantReferral PENDING', async () => {
  let upsertArgs = null;
  const tx = {
    tenant: { findUnique: async (args) => args?.where?.referralCode === 'REF1ABCD' ? { id: 1 } : null },
    tenantReferral: { upsert: async (args) => { upsertArgs = args; return { id: 10, ...args.create }; } },
  };
  const svc = makeSvc();
  await svc.linkReferralTx(tx, { referralCode: 'REF1ABCD', referredTenantId: 5 });
  assert.strictEqual(upsertArgs.create.referrerTenantId, 1);
  assert.strictEqual(upsertArgs.create.referredTenantId, 5);
  assert.strictEqual(upsertArgs.create.status, 'PENDING');
});

test('REF-link-02: linkReferralTx skip bila kode kosong', async () => {
  let called = false;
  const tx = { tenantReferral: { upsert: async () => { called = true; } } };
  const svc = makeSvc();
  await svc.linkReferralTx(tx, { referralCode: '', referredTenantId: 5 });
  assert.strictEqual(called, false);
});

test('REF-link-03: linkReferralTx skip bila self-referral', async () => {
  let called = false;
  const tx = {
    tenant: { findUnique: async () => ({ id: 5 }) },
    tenantReferral: { upsert: async () => { called = true; } },
  };
  const svc = makeSvc();
  await svc.linkReferralTx(tx, { referralCode: 'SELF', referredTenantId: 5 });
  assert.strictEqual(called, false);
});

test('REF-link-04: linkReferralTx skip bila kode tidak valid', async () => {
  let called = false;
  const tx = {
    tenant: { findUnique: async () => null },
    tenantReferral: { upsert: async () => { called = true; } },
  };
  const svc = makeSvc();
  await svc.linkReferralTx(tx, { referralCode: 'INVALID', referredTenantId: 5 });
  assert.strictEqual(called, false);
});

// ─── Y-H3c: rewardEligible ──────────────────────────────────────────────
test('REF-reward-01: rewardEligible memberi reward referral aktif', async () => {
  let awardInput = null;
  let updateStatus = null;
  const svc = makeSvc({
    prisma: {
      tenantReferral: {
        findMany: async () => [{ id: 1, referrerTenantId: 1, referredTenantId: 2 }],
        update: async (args) => { updateStatus = args.data.status; return { id: 1, ...args.data }; },
      },
      stay: { findFirst: async (args) => args?.where?.tenantId === 2 ? { id: 99 } : null },
    },
    loyalty: {
      award: async (input) => { awardInput = input; return { created: true, id: 55 }; },
    },
  });
  const result = await svc.rewardEligible({ actorUserId: 7 });
  assert.strictEqual(result.rewarded, 1);
  assert.strictEqual(awardInput.tenantId, 1);
  assert.strictEqual(awardInput.sourceType, 'REFERRAL');
  assert.strictEqual(awardInput.createdById, 7);
  assert.strictEqual(updateStatus, 'REWARDED');
});

test('REF-reward-02: rewardEligible skip bila tenant belum active stay', async () => {
  const svc = makeSvc({
    prisma: {
      tenantReferral: {
        findMany: async () => [{ id: 2, referrerTenantId: 1, referredTenantId: 3 }],
      },
      stay: { findFirst: async () => null },
    },
  });
  const result = await svc.rewardEligible();
  assert.strictEqual(result.rewarded, 0);
});

test('REF-reward-03: rewardEligible tidak crash walau award throw', async () => {
  const svc = makeSvc({
    prisma: {
      tenantReferral: {
        findMany: async () => [{ id: 1, referrerTenantId: 1, referredTenantId: 2 }],
      },
      stay: { findFirst: async () => ({ id: 99 }) },
    },
    loyalty: {
      award: async () => { throw new Error('DB err'); },
    },
  });
  const result = await svc.rewardEligible();
  assert.strictEqual(result.rewarded, 0);
});
