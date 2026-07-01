'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { RoomsService } = require('../../dist/modules/rooms/rooms.service.js');

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    room: { findUnique: async () => null, findMany: async () => [], count: async () => 0 },
    stay: { findFirst: async () => null },
    ticket: { findMany: async () => [], count: async () => 0 },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new RoomsService(prisma, audit);
}

test('RM-fo-01: findOne not found', async () => {
  const svc = makeSvc({ room: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});
