'use strict';
/**
 * Unit test: AdditionalServicesService — CRUD layanan tambahan + interest (minat tenant)
 * Cakupan: findAll, listActive, findOne, create, update, remove, createInterest,
 *   listMyInterests, listInterests, updateInterest
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { AdditionalServicesService } = require('../../dist/modules/additional-services/additional-services.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkService(overrides = {}) {
  return {
    id: 1,
    name: 'Galon Air',
    description: 'Galon isi ulang 19L',
    priceRupiah: 20000,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  };
}

function mkInterest(overrides = {}) {
  return {
    id: 10,
    tenantId: 7,
    serviceId: 1,
    status: 'PENDING',
    notes: 'Mau pasang galon',
    createdAt: new Date('2026-06-10'),
    updatedAt: new Date('2026-06-10'),
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}, notifOverrides = {}) {
  const prisma = {
    $transaction: async (arr) => Promise.all(arr),
    additionalService: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (args) => ({ ...mkService(), ...args.data }),
      update: async (args) => ({ ...mkService(), ...args.data }),
      delete: async () => ({ id: 1 }),
      count: async () => 0,
    },
    serviceInterest: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async (args) => ({ ...mkInterest(), ...args.data }),
      update: async (args) => ({ ...mkInterest(), ...args.data }),
    },
    ...prismaOverrides,
  };
  const notifications = {
    create: async () => undefined,
    createOnce: async () => undefined,
    ...notifOverrides,
  };
  return new AdditionalServicesService(prisma, notifications);
}

// ════════════════════════════════════════════════════════════════════════════
// AdditionalService CRUD
// ════════════════════════════════════════════════════════════════════════════

test('AS-fo-01: findOne not found', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('AS-fo-02: findOne returns service', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => mkService() } });
  const r = await svc.findOne(1);
  assert.strictEqual(r.name, 'Galon Air');
});

test('AS-fo-03: findAll returns paginated', async () => {
  const svc = makeSvc({
    additionalService: { findMany: async () => [mkService()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.meta.totalItems, 1);
});

test('AS-fo-04: findAll filters by isActive', async () => {
  const svc = makeSvc({
    additionalService: { findMany: async () => [], count: async () => 0 },
  });
  const r = await svc.findAll({ page: '1', limit: '10', isActive: 'true' });
  assert.strictEqual(r.items.length, 0);
});

test('AS-la-01: listActive returns only active', async () => {
  const svc = makeSvc({
    additionalService: { findMany: async () => [mkService(), mkService({ id: 2, name: 'TV Kabel' })] },
  });
  const r = await svc.listActive();
  assert.strictEqual(r.items.length, 2);
});

test('AS-cr-01: create succeeds', async () => {
  const svc = makeSvc({
    additionalService: { create: async (args) => mkService({ ...args.data }) },
  });
  const r = await svc.create({ name: 'WiFi', priceRupiah: 50000, isActive: true, sortOrder: 2 });
  assert.strictEqual(r.name, 'WiFi');
});

test('AS-up-01: update not found', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => null } });
  await assert.rejects(() => svc.update(999, { name: 'Baru' }), (e) => e instanceof NotFoundException);
});

test('AS-up-02: update succeeds', async () => {
  const svc = makeSvc({
    additionalService: { findUnique: async () => mkService(), update: async (args) => mkService({ ...args.data, name: 'Baru' }) },
  });
  const r = await svc.update(1, { name: 'Baru' });
  assert.strictEqual(r.name, 'Baru');
});

test('AS-re-01: remove not found', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => null } });
  await assert.rejects(() => svc.remove(999), (e) => e instanceof NotFoundException);
});

test('AS-re-02: remove succeeds', async () => {
  const svc = makeSvc({
    additionalService: { findUnique: async () => mkService(), delete: async () => ({ id: 1 }) },
  });
  const r = await svc.remove(1);
  assert.strictEqual(r.id, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// Service Interest
// ════════════════════════════════════════════════════════════════════════════

test('AS-ci-01: createInterest — service not found', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.createInterest(7, 999, { notes: 'Minta' }),
    (e) => e instanceof NotFoundException,
  );
});

test('AS-ci-02: createInterest — service inactive', async () => {
  const svc = makeSvc({ additionalService: { findUnique: async () => mkService({ isActive: false }) } });
  await assert.rejects(
    () => svc.createInterest(7, 1, { notes: 'Minta' }),
    (e) => e instanceof NotFoundException,
  );
});

test('AS-ci-03: createInterest — dedupe returns existing PENDING', async () => {
  const existing = mkInterest();
  const svc = makeSvc({
    additionalService: { findUnique: async () => mkService() },
    serviceInterest: {
      findFirst: async () => existing,
      create: async () => { throw new Error('should not create'); },
    },
  });
  const r = await svc.createInterest(7, 1, { notes: 'Minta' });
  assert.strictEqual(r.id, existing.id);
});

test('AS-ci-04: createInterest — new interest creates interest record', async () => {
  const svc = makeSvc(
    {
      additionalService: { findUnique: async () => mkService() },
      serviceInterest: {
        findFirst: async () => null,
        create: async (args) => mkInterest({ ...args.data, id: 11 }),
      },
      user: { findMany: async () => [{ id: 1 }] },
      notification: { create: async () => undefined, createOnce: async () => undefined },
    },
    {
      create: async () => undefined,
      createOnce: async () => undefined,
    },
  );
  const r = await svc.createInterest(7, 1, { notes: 'Minta' });
  assert.strictEqual(r.id, 11);
});

test('AS-lm-01: listMyInterests returns tenant interests', async () => {
  const svc = makeSvc({
    serviceInterest: {
      findMany: async () => [mkInterest()],
      count: async () => 1,
    },
  });
  const r = await svc.listMyInterests(TENANT_A, { page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
});

test('AS-li-01: listInterests returns all interests', async () => {
  const svc = makeSvc({
    serviceInterest: {
      findMany: async () => [mkInterest()],
      count: async () => 1,
    },
  });
  const r = await svc.listInterests({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
});

test('AS-ui-01: updateInterest — not found', async () => {
  const svc = makeSvc({ serviceInterest: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.updateInterest(999, { status: 'DONE' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('AS-ui-02: updateInterest — set DONE succeeds', async () => {
  const interest = mkInterest();
  const svc = makeSvc({
    serviceInterest: {
      findUnique: async () => interest,
      update: async (args) => mkInterest({ ...interest, ...args.data, status: 'DONE' }),
    },
  });
  const r = await svc.updateInterest(10, { status: 'DONE' }, ADMIN);
  assert.strictEqual(r.status, 'DONE');
});
