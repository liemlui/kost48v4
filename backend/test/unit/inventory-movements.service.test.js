'use strict';
/**
 * Unit test: InventoryMovementsService — mutasi stok gudang
 * Cakupan: findAll, findOne, create, update (ConflictException), validateMovement guards
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException } = require('@nestjs/common');
const { InventoryMovementsService } = require('../../dist/modules/inventory-movements/inventory-movements.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkMovement(overrides = {}) {
  return {
    id: 1,
    itemId: 100,
    movementType: 'IN',
    qty: '5',
    roomId: null,
    movementDate: new Date('2026-06-15'),
    note: 'Restok sapu',
    createdById: 2,
    item: { id: 100, name: 'Sapu Lidi' },
    room: null,
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}) {
  const makeTx = () => ({
    $queryRaw: async () => [{ qtyOnHand: '10' }],
    inventoryMovement: {
      create: async (args) => ({ ...mkMovement(), ...args.data }),
    },
    inventoryItem: {
      findUnique: async () => mkItem(),
      findUniqueOrThrow: async () => mkItem(),
      update: async (args) => ({ ...mkItem(), ...args.data }),
    },
    roomItem: {
      findFirst: async () => null,
      findMany: async () => [],
      update: async (args) => ({ qty: 1 }),
      create: async (args) => args.data,
    },
    room: { findUnique: async () => null },
    ...prismaOverrides.tx,
  });

  const prisma = {
    $transaction: async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(makeTx());
      return arg;
    },
    inventoryMovement: {
      findUnique: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async (args) => ({ ...mkMovement(), ...args.data }),
    },
    inventoryItem: {
      findUnique: async () => mkItem(),
      findUniqueOrThrow: async () => mkItem(),
      findFirst: async () => null,
      update: async (args) => ({ ...mkItem(), ...args.data }),
    },
    roomItem: { findFirst: async () => null, create: async (args) => args.data },
    room: { findUnique: async () => null },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new InventoryMovementsService(prisma, audit);
}

function mkItem(overrides = {}) {
  return { id: 100, name: 'Sapu Lidi', qtyOnHand: '10', isActive: true, ...overrides };
}

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('IM-fl-01: findAll returns paginated', async () => {
  const svc = makeSvc({
    inventoryMovement: { findMany: async () => [mkMovement()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.meta.totalItems, 1);
});

test('IM-fl-02: findAll filters by itemId', async () => {
  const svc = makeSvc({
    inventoryMovement: { findMany: async () => [mkMovement()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10', itemId: '100' });
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// findOne
// ════════════════════════════════════════════════════════════════════════════

test('IM-fo-01: findOne not found', async () => {
  const svc = makeSvc({ inventoryMovement: { findUnique: async () => null } });
  await assert.rejects(() => svc.findOne(999), (e) => e instanceof NotFoundException);
});

test('IM-fo-02: findOne returns movement', async () => {
  const svc = makeSvc({ inventoryMovement: { findUnique: async () => mkMovement() } });
  const r = await svc.findOne(1);
  assert.strictEqual(r.movementType, 'IN');
});

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('IM-cr-01: create staff → Forbidden', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'IN', qty: '5', note: 'Restok' }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

test('IM-cr-02: create empty note → throws', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'IN', qty: '5', note: '' }, OWNER),
    (e) => e instanceof ConflictException,
  );
});

test('IM-cr-03: create IN succeeds', async () => {
  const svc = makeSvc({
    inventoryMovement: {
      findUnique: async () => mkMovement(),
      create: async (args) => mkMovement({ ...args.data, id: 10 }),
    },
    inventoryItem: { findUnique: async () => mkItem() },
  });
  const r = await svc.create({ itemId: 100, movementType: 'IN', qty: '5', note: 'Restok 5 sapu' }, ADMIN);
  assert.strictEqual(r.movementType, 'IN');
});

// ════════════════════════════════════════════════════════════════════════════
// update — selalu ConflictException
// ════════════════════════════════════════════════════════════════════════════

test('IM-up-01: update not found', async () => {
  const svc = makeSvc({ inventoryMovement: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.update(999, { note: 'Koreksi' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('IM-up-02: update always throws ConflictException', async () => {
  const svc = makeSvc({
    inventoryMovement: { findUnique: async () => mkMovement() },
  });
  await assert.rejects(
    () => svc.update(1, { note: 'Koreksi' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// validateMovement guards (tested via create)
// ════════════════════════════════════════════════════════════════════════════

test('IM-vm-01: validateMovement — OUT with insufficient stock → Conflict', async () => {
  let callCount = 0;
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => {
      callCount++;
      if (callCount <= 2) return mkItem({ qtyOnHand: '1' }); // for validateMovement qty check
      return mkItem();
    }},
    inventoryMovement: { create: async (args) => mkMovement({ ...args.data }) },
  });
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'OUT', qty: '10', note: 'Ambil 10' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('IM-vm-02: validateMovement — ASSIGN_TO_ROOM without roomId → Conflict', async () => {
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => mkItem() },
    inventoryMovement: { create: async (args) => mkMovement({ ...args.data }) },
  });
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'ASSIGN_TO_ROOM', qty: '1', note: 'Pasang' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('IM-vm-03: validateMovement — IN with roomId → Conflict', async () => {
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => mkItem() },
    inventoryMovement: { create: async (args) => mkMovement({ ...args.data }) },
  });
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'IN', qty: '5', roomId: 5, note: 'Restok' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('IM-vm-04: validateMovement — ADJUSTMENT → Conflict', async () => {
  const svc = makeSvc({
    inventoryItem: { findUnique: async () => mkItem() },
    inventoryMovement: { create: async (args) => mkMovement({ ...args.data }) },
  });
  await assert.rejects(
    () => svc.create({ itemId: 100, movementType: 'ADJUSTMENT', qty: '1', note: 'Adjust' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});
