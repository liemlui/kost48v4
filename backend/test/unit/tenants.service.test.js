'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { TenantsService } = require('../../dist/modules/tenants/tenants.service.js');

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    tenant: { findUnique: async () => null, findMany: async () => [], count: async () => 0 },
    user: { findFirst: async () => null },
    stay: { findMany: async () => [] },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  const loyalty = { earnSafe: async () => undefined };
  const referral = { applyReferral: async () => undefined };
  return new TenantsService(prisma, audit, loyalty, referral);
}

test('TN-fo-01: findOne not found', async () => {
  const svc = makeSvc({ tenant: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});
