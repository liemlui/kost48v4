'use strict';
/**
 * Unit test: InventoryItemsService — barang inventaris gudang
 * Cakupan: findAll, findOne, create, update, updateStatusFromField
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException } = require('@nestjs/common');
const { InventoryItemsService } = require('../../dist/modules/inventory-items/inventory-items.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkItem(overrides = {}) {
  return {
    id: 1,
    name: 'Sapu Lidi',
    sku: 'SP-001',
    category: 'ALAT_KEBERSIHAN',
    qtyOnHand: '10',
    unit: 'UNIT',
    minQty: '2',
    isActive: true,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    roomItems: [],
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}) {
  // Transaction tx object with all methods the service calls on it
  const makeTx = () => {
    const ov = prismaOverrides.tx || {};
    const invItemBase = {
      findUnique: async () => null,
      findUniqueOrThrow: async () => mkItem(),
      update: async (args) => ({ ...mkItem(), ...args.data }),
      create: async (args) => ({ ...mkItem(), ...args.data }),
    };
    const ticketBase = {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      findUnique: async () => null,
      create: async (args) => ({ id: 20, ...args.data }),
      update: async (args) => args.data,
    };
    const roomItemBase = { findFirst: async () => null };
    const reportBase = { create: async (args) => ({ id: 30, ...args.data }) };
    const perfEventBase = { create: async (args) => ({ id: 40, ...args.data }) };
    const invMovementBase = { findFirst: async () => null };
    return {
      $executeRaw: async () => [{ id: 1 }],
      inventoryItem: { ...invItemBase, ...(ov.inventoryItem || {}) },
      roomItem: { ...roomItemBase, ...(ov.roomItem || {}) },
      ticket: { ...ticketBase, ...(ov.ticket || {}) },
      staffFieldReport: { ...reportBase, ...(ov.staffFieldReport || {}) },
      staffPerformanceEvent: { ...perfEventBase, ...(ov.staffPerformanceEvent || {}) },
      inventoryMovement: { ...invMovementBase, ...(ov.inventoryMovement || {}) },
    };
  };

  const prisma = {
    $transaction: async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(makeTx());
      return arg;
    },
    inventoryItem: {
      findUnique: async () => null,
      findUniqueOrThrow: async () => mkItem(),
      findMany: async () => [],
      count: async () => 0,
      create: async (args) => ({ ...mkItem(), ...args.data }),
      update: async (args) => ({ ...mkItem(), ...args.data }),
      findFirst: async () => null,
    },
    roomFacility: { groupBy: async () => [] },
    room: { findFirst: async () => null },
    inventoryMovement: { findFirst: async () => null },
    ticket: {
      create: async (args) => ({ id: 20, ...args.data }),
      findMany: async () => [],
      findFirst: async () => null,
      update: async (args) => args.data,
    },
    user: { findMany: async () => [{ id: 2, role: 'ADMIN' }] },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new InventoryItemsService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('II-fl-01: findAll returns paginated', async () => {
  const svc = makeSvc({
    inventoryItem: { findMany: async () => [mkItem()], count: async () => 1 },
    roomFacility: { groupBy: async () => [] },
  });
  const r = await svc.findAll({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.meta.totalItems, 1);
});

test('II-fl-02: findAll filters by search', async () => {
  const svc = makeSvc({
    inventoryItem: { findMany: async () => [mkItem()], count: async () => 1 },
    roomFacility: { groupBy: async () => [] },
  });
  const r = await svc.findAll({ page: '1', limit: '10', search: 'sapu' });
  assert.strictEqual(r.items.length, 1);
});

test('II-fl-03: findAll lowStockOnly filter', async () => {
  const lowStockItem = mkItem({ qtyOnHand: '1', minQty: '5' });
  const svc = makeSvc({
    inventoryItem: { findMany: async () => [mkItem(), lowStockItem], count: async () => 2 },
    roomFacility: { groupBy: async () => [] },
  });
  const r = await svc.findAll({ page: '1', limit: '10', lowStockOnly: 'true' });
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// findOne
// ════════════════════════════════════════════════════════════════════════════

test('II-fo-01: findOne not found', async () => {
  const svc = makeSvc({ inventoryItem: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('II-fo-02: findOne returns item', async () => {
  const svc = makeSvc({ inventoryItem: { findUnique: async () => mkItem() } });
  const r = await svc.findOne(1);
  assert.strictEqual(r.name, 'Sapu Lidi');
});

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('II-cr-01: create not found user', async () => {
  const svc = makeSvc({ user: { findMany: async () => [] } });
  await assert.rejects(
    () => svc.create({ name: 'Baru', isActive: true }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

test('II-cr-02: create staff → Forbidden', async () => {
  const svc = makeSvc({ user: { findUnique: async () => ({ role: 'STAFF' }) } });
  await assert.rejects(
    () => svc.create({ name: 'Baru', isActive: true }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

test('II-cr-03: create admin succeeds', async () => {
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => null },
    inventoryMovement: { findFirst: async () => null },
    tx: {
      inventoryItem: {
        create: async (args) => mkItem({ ...args.data, id: 5, name: args.data.name }),
        findUniqueOrThrow: async () => mkItem({ name: 'Baru' }),
      },
      inventoryMovement: { create: async (args) => ({ id: 99, ...args.data }) },
    },
  });
  const r = await svc.create({ name: 'Baru', category: 'ALAT_KEBERSIHAN', unit: 'UNIT', isActive: true }, ADMIN);
  assert.strictEqual(r.name, 'Baru');
});

// ════════════════════════════════════════════════════════════════════════════
// update
// ════════════════════════════════════════════════════════════════════════════

test('II-up-01: update not found', async () => {
  const svc = makeSvc({ inventoryItem: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.update(999, { name: 'Baru' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('II-up-02: update staff → Forbidden', async () => {
  const svc = makeSvc({ inventoryItem: { findUnique: async () => mkItem() } });
  await assert.rejects(
    () => svc.update(1, { name: 'Baru' }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

test('II-up-03: update succeeds', async () => {
  let currentItem = mkItem();
  const svc = makeSvc({
    inventoryItem: {
      findUnique: async () => currentItem,
      update: async (prismaArgs) => {
        currentItem = { ...currentItem, ...(prismaArgs.data || {}) };
        return currentItem;
      },
      findUniqueOrThrow: async () => currentItem,
    },
  });
  const r = await svc.update(1, { name: 'Sapu Baru' }, ADMIN);
  assert.strictEqual(r.name, 'Sapu Baru');
});

// ════════════════════════════════════════════════════════════════════════════
// updateStatusFromField
// ════════════════════════════════════════════════════════════════════════════

test('II-us-01: updateStatusFromField — not found', async () => {
  const svc = makeSvc({ inventoryItem: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.updateStatusFromField(999, { status: 'DAMAGED' }, STAFF),
    (e) => e instanceof NotFoundException,
  );
});

test('II-us-02: updateStatusFromField — staff reports LOW_STOCK', async () => {
  const item = mkItem();
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => item },
    tx: {
      inventoryItem: { update: async (args) => ({ ...item, ...args.data }), findUnique: async () => item },
      ticket: { findFirst: async () => null, create: async (args) => ({ id: 20, ...args.data }), count: async () => 0, findUnique: async () => null },
      staffFieldReport: { create: async (args) => ({ id: 30, ...args.data }) },
      staffPerformanceEvent: { create: async (args) => ({ id: 40, ...args.data }) },
    },
  });
  const r = await svc.updateStatusFromField(1, { status: 'LOW_STOCK', note: 'Stok mau habis' }, STAFF);
  // Staff report maps to PENDING_CHECK (not the reported status directly)
  assert.strictEqual(r.appliedStatus, 'PENDING_CHECK');
  assert.strictEqual(r.reportedStatus, 'LOW_STOCK');
});
