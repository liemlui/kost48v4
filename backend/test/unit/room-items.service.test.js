'use strict';
/**
 * Unit test: RoomItemsService — inventaris barang dalam kamar
 * Cakupan: findAll, findMyRoomItems, create (ConflictException), update, updateStatusFromField
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException } = require('@nestjs/common');
const { RoomItemsService } = require('../../dist/modules/room-items/room-items.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_NO_TENANCY = { id: 11, role: 'TENANT', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkRoomItem(overrides = {}) {
  return {
    id: 1,
    roomId: 5,
    itemId: 100,
    qty: 1,
    status: 'GOOD',
    room: { id: 5, code: 'A-01', name: 'Kamar A-01' },
    item: { id: 100, name: 'Spring Bed', category: 'FURNITURE' },
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}) {
  const makeTx = () => {
    const ov = prismaOverrides.tx || {};
    const ticketBase = {
      findFirst: async () => null,
      count: async () => 0,
      findUnique: async () => null,
      update: async (args) => ({ id: 200, ...args.data }),
      create: async (args) => ({ id: 201, ...args.data }),
    };
    const roomItemBase = { update: async (args) => ({ ...mkRoomItem(), ...args.data }) };
    const fieldReportBase = { create: async (args) => ({ id: 30, ...args.data }) };
    const perfEventBase = { create: async (args) => ({ id: 40, ...args.data }) };
    const stayBase = { findFirst: async () => ({ id: 10, tenantId: 7 }) };
    return {
      $executeRaw: async () => [{ id: 1 }],
      roomItem: { ...roomItemBase, ...(ov.roomItem || {}) },
      ticket: { ...ticketBase, ...(ov.ticket || {}) },
      staffFieldReport: { ...fieldReportBase, ...(ov.staffFieldReport || {}) },
      staffPerformanceEvent: { ...perfEventBase, ...(ov.staffPerformanceEvent || {}) },
      stay: { ...stayBase, ...(ov.stay || {}) },
    };
  };

  const prisma = {
    $transaction: async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(makeTx());
      return arg;
    },
    roomItem: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (args) => ({ ...mkRoomItem(), ...args.data }),
      update: async (args) => ({ ...mkRoomItem(), ...args.data }),
    },
    stay: { findFirst: async () => null },
    user: { findMany: async () => [] },
    ticket: { findMany: async () => [], findFirst: async () => null, update: async (args) => args.data, create: async (args) => ({ id: 201, ...args.data }) },
    room: { findUnique: async () => null },
    inventoryItem: { findUnique: async () => null },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new RoomItemsService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('RI-fl-01: findAll returns items', async () => {
  const svc = makeSvc({ roomItem: { findMany: async () => [mkRoomItem()] } });
  const r = await svc.findAll();
  assert.strictEqual(r.items.length, 1);
});

test('RI-fl-02: findAll filters by roomId', async () => {
  const svc = makeSvc({ roomItem: { findMany: async () => [mkRoomItem()] } });
  const r = await svc.findAll(5);
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// findMyRoomItems
// ════════════════════════════════════════════════════════════════════════════

test('RI-fm-01: findMyRoomItems no tenantId → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.findMyRoomItems(TENANT_NO_TENANCY),
    (e) => e instanceof ConflictException,
  );
});

test('RI-fm-02: findMyRoomItems no active stay → empty', async () => {
  const svc = makeSvc({ stay: { findFirst: async () => null } });
  const r = await svc.findMyRoomItems(TENANT_A);
  assert.strictEqual(r.items.length, 0);
});

test('RI-fm-03: findMyRoomItems returns room items', async () => {
  const svc = makeSvc({
    stay: { findFirst: async () => ({ id: 10, roomId: 5 }) },
    roomItem: { findMany: async () => [mkRoomItem()] },
  });
  const r = await svc.findMyRoomItems(TENANT_A);
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// create — selalu ConflictException (gunakan mutasi stok)
// ════════════════════════════════════════════════════════════════════════════

test('RI-cr-01: create throws ConflictException', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ roomId: 5, itemId: 100, qty: 1 }, OWNER),
    (e) => e instanceof ConflictException,
  );
});

test('RI-cr-02: create staff → Forbidden', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ roomId: 5, itemId: 100, qty: 1 }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// update
// ════════════════════════════════════════════════════════════════════════════

test('RI-up-01: update not found', async () => {
  const svc = makeSvc({ roomItem: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.update(999, { qty: 2 }, OWNER),
    (e) => e instanceof NotFoundException,
  );
});

test('RI-up-02: update staff → Forbidden', async () => {
  const svc = makeSvc({ roomItem: { findUnique: async () => mkRoomItem() } });
  await assert.rejects(
    () => svc.update(1, { qty: 2 }, STAFF),
    (e) => e instanceof ForbiddenException,
  );
});

test('RI-up-03: update qty change throws ConflictException', async () => {
  const existing = mkRoomItem({ qty: 1 });
  const svc = makeSvc({
    roomItem: { findUnique: async () => existing },
  });
  await assert.rejects(
    () => svc.update(1, { qty: 2 }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('RI-up-04: update status only succeeds', async () => {
  const existing = mkRoomItem();
  const svc = makeSvc({
    roomItem: { findUnique: async () => existing, update: async (args) => ({ ...existing, ...args.data }) },
  });
  const r = await svc.update(1, { status: 'MAINTENANCE' }, ADMIN);
  assert.strictEqual(r.status, 'MAINTENANCE');
});

// ════════════════════════════════════════════════════════════════════════════
// updateStatusFromField
// ════════════════════════════════════════════════════════════════════════════

test('RI-us-01: updateStatusFromField — not found', async () => {
  const svc = makeSvc({ roomItem: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.updateStatusFromField(999, { status: 'DAMAGED' }, STAFF),
    (e) => e instanceof NotFoundException,
  );
});

test('RI-us-02: updateStatusFromField — staff sets DAMAGED with note', async () => {
  const existing = mkRoomItem();
  const svc = makeSvc({
    roomItem: { findUnique: async () => existing },
    stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    tx: {
      roomItem: { update: async (args) => ({ ...existing, ...args.data }) },
      ticket: { findFirst: async () => null, create: async (args) => ({ id: 201, ...args.data }) },
      staffFieldReport: { create: async (args) => ({ id: 30, ...args.data }) },
      staffPerformanceEvent: { create: async (args) => ({ id: 40, ...args.data }) },
      stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    },
  });
  const r = await svc.updateStatusFromField(1, { status: 'DAMAGED', note: 'Pecah' }, STAFF);
  assert.strictEqual(r.appliedStatus, 'MAINTENANCE');
});

test('RI-us-03: updateStatusFromField — staff requests replacement', async () => {
  const existing = mkRoomItem();
  const svc = makeSvc({
    roomItem: { findUnique: async () => existing },
    inventoryItem: { findUnique: async () => ({ id: 50, name: 'Sapu' }) },
    stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    tx: {
      roomItem: { update: async (args) => ({ ...existing, ...args.data }) },
      ticket: { findFirst: async () => null, create: async (args) => ({ id: 201, ...args.data }) },
      staffFieldReport: { create: async (args) => ({ id: 30, ...args.data }) },
      staffPerformanceEvent: { create: async (args) => ({ id: 40, ...args.data }) },
      stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    },
  });
  const r = await svc.updateStatusFromField(
    1, { status: 'DAMAGED', note: 'Ganti baru', requestsReplacement: true, requestedInventoryItemId: 50, requestedQty: '1' }, STAFF,
  );
  assert.strictEqual(r.appliedStatus, 'MAINTENANCE');
});

test('RI-us-04: updateStatusFromField — admin updates status', async () => {
  const existing = mkRoomItem();
  const svc = makeSvc({
    roomItem: { findUnique: async () => existing },
    stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    tx: {
      roomItem: { update: async (args) => ({ ...existing, ...args.data }) },
      ticket: { findFirst: async () => null, create: async (args) => ({ id: 201, ...args.data }) },
      staffFieldReport: { create: async (args) => ({ id: 30, ...args.data }) },
      staffPerformanceEvent: { create: async (args) => ({ id: 40, ...args.data }) },
      stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    },
  });
  const r = await svc.updateStatusFromField(1, { status: 'GOOD', note: 'Sudah diperbaiki' }, ADMIN);
  assert.strictEqual(r.appliedStatus, 'GOOD');
});
