'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { UsersService } = require('../../dist/modules/users/users.service.js');

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    user: { findUnique: async () => null, findMany: async () => [], count: async () => 0 },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new UsersService(prisma, audit);
}

test('US-fo-01: findOne not found', async () => {
  const svc = makeSvc({ user: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('US-fo-02: findOne returns user', async () => {
  const svc = makeSvc({ user: { findUnique: async () => ({ id: 1, fullName: 'Admin', email: 'admin@kost48.com', role: 'ADMIN' }) } });
  const r = await svc.findOne(1);
  assert.strictEqual(r.id, 1);
});
