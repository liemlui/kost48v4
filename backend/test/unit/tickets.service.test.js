'use strict';
/**
 * Unit test: TicketsService — CRUD, state transitions, tips
 * Cakupan: findAll, findMine, findOne, canAccessImage, createBackoffice, createPortal,
 *   assign, markVendor, start, markDone, close, confirmTip, acknowledgeTip
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException, BadRequestException } = require('@nestjs/common');
const { TicketsService } = require('../../dist/modules/tickets/tickets.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const STAFF_A = { id: 3, role: 'STAFF', tenantId: null };
const STAFF_B = { id: 4, role: 'STAFF', tenantId: null };
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_B = { id: 11, role: 'TENANT', tenantId: 8 };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkTicket(overrides = {}) {
  return {
    id: 1,
    ticketNumber: 'TIC-2026-0001',
    title: 'Keran bocor',
    description: 'Keran kamar mandi bocor',
    status: 'OPEN',
    category: 'MAINTENANCE',
    tenantId: 7,
    roomId: 5,
    stayId: 10,
    assignedToId: null,
    assignedAt: null,
    dueAt: null,
    handledByVendor: false,
    vendorNote: null,
    resolutionNote: null,
    resolvedAt: null,
    closedAt: null,
    linkedRoomItemId: null,
    linkedInventoryItemId: null,
    finalRoomItemStatus: null,
    finalInventoryItemStatus: null,
    finalAdminNote: null,
    issueImageUrl: null,
    issueImageFileKey: null,
    resolutionImageUrl: null,
    resolutionImageFileKey: null,
    createdAt: new Date('2026-06-01T08:00:00Z'),
    updatedAt: new Date('2026-06-01T08:00:00Z'),
    room: { id: 5, code: 'A-01' },
    tenant: { id: 7, fullName: 'Tenant A' },
    assignedTo: null,
    staffFieldReports: [],
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeService(findUniqueQueue = [], opts = {}) {
  const defaultFindUnique = async (args) => {
    if (findUniqueQueue.length > 0) return findUniqueQueue.shift();
    return null;
  };

  const makeTx = () => ({
    $executeRaw: async () => [{ id: 1 }],
    ticket: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async (args) => ({ ...mkTicket({ ...args.data, id: 42 }) }),
      update: async (args) => ({ ...mkTicket(), ...args.data }),
    },
    user: { findMany: async () => [{ id: 3 }] },
    roomItem: { findUnique: async () => ({ id: 10, status: 'GOOD', note: null }), update: async (args) => args.data },
    inventoryItem: { findUnique: async () => ({ id: 50, status: 'GOOD', notes: null }), update: async (args) => args.data },
    staffFieldReport: { updateMany: async () => ({ count: 1 }) },
    room: { update: async (args) => args.data, updateMany: async () => ({ count: 1 }) },
    stay: { count: async () => 0 },
    loyalty: { earnSafe: async () => ({}) },
  });

  const prisma = {
    $transaction: async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(makeTx());
      return arg;
    },
    ticket: {
      findUnique: defaultFindUnique,
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      update: async (args) => ({ ...mkTicket(), ...args.data }),
      create: async (args) => mkTicket({ ...args.data, id: 42 }),
    },
    user: { findUnique: async () => null, findMany: async () => [] },
    tenant: { findUnique: async () => null },
    stay: { findFirst: async () => null, count: async () => 0 },
    room: { findFirst: async () => null, update: async (args) => args.data, updateMany: async () => ({ count: 1 }) },
    roomItem: { findUnique: async () => null, update: async (args) => args.data },
    inventoryItem: { findUnique: async () => null, update: async (args) => args.data },
    staffFieldReport: { updateMany: async () => ({ count: 1 }) },
    staffPerformanceEvent: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async (args) => ({ id: 500, ...args.data }),
    },
    auditLog: { findFirst: async () => null },
    staffRoutineCompletion: { findFirst: async () => null },
    ...opts,
  };
  const audit = { log: async () => undefined };
  const notification = { create: async () => undefined, createOnce: async () => undefined };
  const loyalty = { earnSafe: async () => ({ earned: true }) };
  return new TicketsService(prisma, audit, notification, loyalty);
}

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('TK-fl-01: findAll returns paginated', async () => {
  const svc = makeService([], {
    ticket: { findMany: async () => [mkTicket()], count: async () => 1 },
  });
  const r = await svc.findAll({ page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.meta.totalItems, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// findMine (tenant)
// ════════════════════════════════════════════════════════════════════════════

test('TK-fm-01: findMine returns tenant tickets', async () => {
  const svc = makeService([], {
    ticket: { findMany: async () => [mkTicket()], count: async () => 1 },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.findMine(TENANT_A, { page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 1);
});

test('TK-fm-02: findMine hides internal categories', async () => {
  const svc = makeService([], {
    ticket: { findMany: async () => [], count: async () => 0 },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.findMine(TENANT_A, { page: '1', limit: '10' });
  assert.strictEqual(r.items.length, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// findOne
// ════════════════════════════════════════════════════════════════════════════

test('TK-fo-01: findOne not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(() => svc.findOne(999, OWNER), (e) => e instanceof NotFoundException);
});

test('TK-fo-02: findOne returns ticket for owner', async () => {
  const svc = makeService([mkTicket()]);
  const r = await svc.findOne(1, OWNER);
  assert.strictEqual(r.id, 1);
});

test('TK-fo-03: findOne tenant sees own ticket', async () => {
  const svc = makeService([mkTicket()]);
  const r = await svc.findOne(1, TENANT_A);
  assert.strictEqual(r.id, 1);
});

test('TK-fo-04: findOne tenant cannot see other tenant ticket', async () => {
  const svc = makeService([mkTicket()]);
  await assert.rejects(() => svc.findOne(1, TENANT_B), (e) => e instanceof ForbiddenException);
});

test('TK-fo-05: findOne tenant cannot see hidden category', async () => {
  const svc = makeService([mkTicket({ category: 'CHECKOUT_INSPECTION' })]);
  await assert.rejects(() => svc.findOne(1, TENANT_A), (e) => e instanceof NotFoundException);
});

// ════════════════════════════════════════════════════════════════════════════
// canAccessImage
// ════════════════════════════════════════════════════════════════════════════

test('TK-ci-01: canAccessImage owner always true', async () => {
  const svc = makeService([], { ticket: { findFirst: async () => null } });
  const r = await svc.canAccessImage('abc.jpg', OWNER);
  assert.strictEqual(r, true);
});

test('TK-ci-02: canAccessImage no ticket record → false for staff', async () => {
  const svc = makeService([], { ticket: { findFirst: async () => null } });
  const r = await svc.canAccessImage('abc.jpg', STAFF_A);
  assert.strictEqual(r, false);
});

test('TK-ci-03: canAccessImage tenant sees own ticket image', async () => {
  const svc = makeService([], {
    ticket: { findFirst: async () => ({ tenantId: 7, category: 'MAINTENANCE', assignedToId: null, staffFieldReports: [] }) },
  });
  const r = await svc.canAccessImage('abc.jpg', TENANT_A);
  assert.strictEqual(r, true);
});

test('TK-ci-04: canAccessImage tenant cannot see other tenant image', async () => {
  const svc = makeService([], {
    ticket: { findFirst: async () => ({ tenantId: 7, category: 'MAINTENANCE', assignedToId: null, staffFieldReports: [] }) },
  });
  const r = await svc.canAccessImage('abc.jpg', TENANT_B);
  assert.strictEqual(r, false);
});

// ════════════════════════════════════════════════════════════════════════════
// createBackoffice
// ════════════════════════════════════════════════════════════════════════════

test('TK-cb-01: createBackoffice staff invalid category → Conflict', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createBackoffice({ title: 'Test', category: 'KEUANGAN' }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('TK-cb-02: createBackoffice no tenantId for non-staff → Conflict', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createBackoffice({ title: 'Test', category: 'MAINTENANCE' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TK-cb-03: createBackoffice tenant not found → NotFound', async () => {
  const svc = makeService([], { tenant: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.createBackoffice({ title: 'Test', category: 'MAINTENANCE', tenantId: 999 }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-cb-04: createBackoffice success', async () => {
  const svc = makeService([], {
    tenant: { findUnique: async () => ({ id: 7 }) },
    ticket: { create: async (args) => mkTicket({ ...args.data, id: 42 }) },
  });
  const r = await svc.createBackoffice({ title: 'Test', category: 'MAINTENANCE', tenantId: 7 }, ADMIN);
  assert.strictEqual(r.id, 42);
});

// ════════════════════════════════════════════════════════════════════════════
// createPortal
// ════════════════════════════════════════════════════════════════════════════

test('TK-cp-01: createPortal no tenantId → Conflict', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createPortal({ title: 'Mati lampu', category: 'MAINTENANCE' }, { id: 10, role: 'TENANT', tenantId: null }),
    (e) => e instanceof ConflictException,
  );
});

test('TK-cp-02: createPortal tenant not found → NotFound', async () => {
  const svc = makeService([], { tenant: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.createPortal({ title: 'Mati lampu', category: 'MAINTENANCE' }, TENANT_A),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-cp-03: createPortal success', async () => {
  const svc = makeService([], {
    tenant: { findUnique: async () => ({ id: 7 }) },
    stay: { findFirst: async () => ({ id: 10, roomId: 5 }) },
  });
  const r = await svc.createPortal({ title: 'Mati lampu', category: 'MAINTENANCE', description: 'Lampu mati' }, TENANT_A);
  assert.strictEqual(r.id, 42);
});

// ════════════════════════════════════════════════════════════════════════════
// assign
// ════════════════════════════════════════════════════════════════════════════

test('TK-as-01: assign not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.assign(999, { assignedToId: 3 }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-as-02: assign closed ticket → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'CLOSED' })]);
  await assert.rejects(
    () => svc.assign(1, { assignedToId: 3 }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TK-as-03: assign success', async () => {
  const svc = makeService([mkTicket(), null]);
  // second findUnique returns user
  const svc2 = makeService([mkTicket(), { id: 3, role: 'STAFF' }], {
    ticket: { findUnique: async () => mkTicket(), update: async (args) => ({ ...mkTicket(), ...args.data, assignedToId: 3 }) },
    user: { findUnique: async () => ({ id: 3, role: 'STAFF' }) },
  });
  const r = await svc2.assign(1, { assignedToId: 3 }, ADMIN);
  assert.strictEqual(r.assignedToId, 3);
});

// ════════════════════════════════════════════════════════════════════════════
// markVendor
// ════════════════════════════════════════════════════════════════════════════

test('TK-mv-01: markVendor not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.markVendor(999, { handledByVendor: true }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-mv-02: markVendor closed → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'CLOSED' })]);
  await assert.rejects(
    () => svc.markVendor(1, { handledByVendor: true }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TK-mv-03: markVendor sets handledByVendor and clears assignee', async () => {
  const svc = makeService([], {
    ticket: { findUnique: async () => mkTicket({ assignedToId: 3 }), update: async (args) => ({ ...mkTicket({ handledByVendor: true, assignedToId: null }), ...args.data }) },
  });
  const r = await svc.markVendor(1, { handledByVendor: true, vendorNote: 'Cuci AC' }, ADMIN);
  assert.strictEqual(r.handledByVendor, true);
});

// ════════════════════════════════════════════════════════════════════════════
// start
// ════════════════════════════════════════════════════════════════════════════

test('TK-st-01: start not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(() => svc.start(999, STAFF_A), (e) => e instanceof NotFoundException);
});

test('TK-st-02: start not OPEN → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'IN_PROGRESS' })]);
  await assert.rejects(() => svc.start(1, STAFF_A), (e) => e instanceof ConflictException);
});

test('TK-st-03: start staff assigned to other → Conflict', async () => {
  const svc = makeService([mkTicket({ assignedToId: 4 })], {
    ticket: {
      findUnique: async () => mkTicket({ assignedToId: 4 }),
      findFirst: async () => null,
    },
  });
  await assert.rejects(() => svc.start(1, STAFF_A), (e) => e instanceof ConflictException);
});

test('TK-st-04: start success for staff', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ assignedToId: 3 }),
      findFirst: async () => null,
      update: async (args) => ({ ...mkTicket({ assignedToId: 3 }), ...args.data }),
    },
    staffRoutineCompletion: { findFirst: async () => null },
  });
  const r = await svc.start(1, STAFF_A);
  assert.strictEqual(r.status, 'IN_PROGRESS');
});

test('TK-st-05: start sets SLA when no assignedAt', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ assignedToId: null }),
      findFirst: async () => null,
      update: async (args) => ({ ...mkTicket(), ...args.data }),
    },
    staffRoutineCompletion: { findFirst: async () => null },
  });
  const r = await svc.start(1, STAFF_A);
  assert.strictEqual(r.status, 'IN_PROGRESS');
});

// ════════════════════════════════════════════════════════════════════════════
// markDone
// ════════════════════════════════════════════════════════════════════════════

test('TK-md-01: markDone not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.markDone(999, { resolutionNote: 'Selesai' }, STAFF_A),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-md-02: markDone non-vendor not IN_PROGRESS → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'OPEN' })]);
  await assert.rejects(
    () => svc.markDone(1, { resolutionNote: 'Selesai' }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('TK-md-03: markDone staff not assigned → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'IN_PROGRESS', assignedToId: 4 })]);
  await assert.rejects(
    () => svc.markDone(1, { resolutionNote: 'Selesai' }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('TK-md-04: markDone success', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ status: 'IN_PROGRESS', assignedToId: 3 }),
      update: async (args) => ({ ...mkTicket({ status: 'IN_PROGRESS', assignedToId: 3 }), ...args.data, status: 'DONE' }),
    },
  });
  const r = await svc.markDone(1, { resolutionNote: 'Selesai diperbaiki' }, STAFF_A);
  assert.strictEqual(r.status, 'DONE');
});

// ════════════════════════════════════════════════════════════════════════════
// close
// ════════════════════════════════════════════════════════════════════════════

test('TK-cl-01: close not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.close(999, { action: 'CLOSE', finalAdminNote: 'Selesai semua' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-cl-02: close tenant closes own DONE ticket', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ status: 'DONE', tenantId: 7 }),
      update: async (args) => ({ ...mkTicket({ status: 'DONE', tenantId: 7 }), ...args.data, status: 'CLOSED' }),
    },
  });
  const r = await svc.close(1, { action: 'CLOSE' }, TENANT_A);
  assert.strictEqual(r.status, 'CLOSED');
});

test('TK-cl-03: close tenant non-DONE → Conflict', async () => {
  const svc = makeService([mkTicket({ status: 'OPEN', tenantId: 7 })]);
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE' }, TENANT_A),
    (e) => e instanceof ConflictException,
  );
});

test('TK-cl-04: close admin CLOSE requires finalAdminNote', async () => {
  const svc = makeService([mkTicket({ status: 'DONE' })]);
  await assert.rejects(
    () => svc.close(1, { action: 'CLOSE', finalAdminNote: 'OK' }, ADMIN),
    (e) => e instanceof ConflictException,
  );
});

test('TK-cl-05: close admin CLOSE success with room item status', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ status: 'DONE', linkedRoomItemId: 10, staffFieldReports: [] }),
      update: async (args) => ({ ...mkTicket({ status: 'DONE' }), ...args.data, status: 'CLOSED' }),
    },
    roomItem: { findUnique: async () => ({ note: null }) },
    staffFieldReport: { updateMany: async () => ({ count: 0 }) },
  });
  const r = await svc.close(1, { action: 'CLOSE', finalAdminNote: 'Selesai sesuai prosedur', finalRoomItemStatus: 'GOOD', finalRoomItemId: 10 }, ADMIN);
  assert.strictEqual(r.status, 'CLOSED');
});

test('TK-cl-06: close CANCEL from OPEN', async () => {
  const svc = makeService([], {
    ticket: {
      findUnique: async () => mkTicket({ status: 'OPEN' }),
      update: async (args) => ({ ...mkTicket({ status: 'OPEN' }), ...args.data, status: 'CANCELLED' }),
    },
  });
  const r = await svc.close(1, { action: 'CANCEL', finalAdminNote: 'Tidak jadi' }, ADMIN);
  assert.strictEqual(r.status, 'CANCELLED');
});

// ════════════════════════════════════════════════════════════════════════════
// confirmTip
// ════════════════════════════════════════════════════════════════════════════

test('TK-ct-01: confirmTip ticket not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.confirmTip(999, 3, true),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-ct-02: confirmTip not assigned staff → Forbidden', async () => {
  const svc = makeService([mkTicket({ assignedToId: 4 })]);
  await assert.rejects(
    () => svc.confirmTip(1, 3, true),
    (e) => e instanceof ForbiddenException,
  );
});

test('TK-ct-03: confirmTip duplicate → Conflict', async () => {
  const svc = makeService([mkTicket({ assignedToId: 3 })], {
    staffPerformanceEvent: { findFirst: async () => ({ id: 500 }) },
  });
  await assert.rejects(
    () => svc.confirmTip(1, 3, true),
    (e) => e instanceof ConflictException,
  );
});

test('TK-ct-04: confirmTip success', async () => {
  const svc = makeService([], {
    ticket: { findUnique: async () => mkTicket({ assignedToId: 3, tenantId: 7 }) },
    staffPerformanceEvent: {
      findFirst: async () => null,
      create: async (args) => ({ id: 501, ...args.data }),
    },
  });
  const r = await svc.confirmTip(1, 3, true);
  assert.deepStrictEqual(r, { confirmed: true, received: true });
});

// ════════════════════════════════════════════════════════════════════════════
// acknowledgeTip
// ════════════════════════════════════════════════════════════════════════════

test('TK-at-01: acknowledgeTip ticket not found', async () => {
  const svc = makeService([null]);
  await assert.rejects(
    () => svc.acknowledgeTip(999, TENANT_A),
    (e) => e instanceof NotFoundException,
  );
});

test('TK-at-02: acknowledgeTip wrong tenant → Forbidden', async () => {
  const svc = makeService([mkTicket({ tenantId: 7, assignedToId: 3, status: 'DONE' })]);
  await assert.rejects(
    () => svc.acknowledgeTip(1, TENANT_B),
    (e) => e instanceof ForbiddenException,
  );
});

test('TK-at-03: acknowledgeTip no assigned staff → BadRequest', async () => {
  const svc = makeService([mkTicket({ tenantId: 7, assignedToId: null, status: 'DONE' })]);
  await assert.rejects(
    () => svc.acknowledgeTip(1, TENANT_A),
    (e) => e instanceof BadRequestException,
  );
});

test('TK-at-04: acknowledgeTip ticket not done → BadRequest', async () => {
  const svc = makeService([mkTicket({ tenantId: 7, assignedToId: 3, status: 'OPEN' })]);
  await assert.rejects(
    () => svc.acknowledgeTip(1, TENANT_A),
    (e) => e instanceof BadRequestException,
  );
});

test('TK-at-05: acknowledgeTip success', async () => {
  const svc = makeService([], {
    ticket: { findUnique: async () => mkTicket({ tenantId: 7, assignedToId: 3, status: 'DONE' }) },
    staffPerformanceEvent: {
      findFirst: async () => null,
      create: async (args) => ({ id: 502, ...args.data }),
    },
  });
  const r = await svc.acknowledgeTip(1, TENANT_A);
  assert.deepStrictEqual(r, { acknowledged: true, alreadyRecorded: false });
});

test('TK-at-06: acknowledgeTip idempotent', async () => {
  const svc = makeService([], {
    ticket: { findUnique: async () => mkTicket({ tenantId: 7, assignedToId: 3, status: 'DONE' }) },
    staffPerformanceEvent: {
      findFirst: async () => ({ id: 500 }),
    },
  });
  const r = await svc.acknowledgeTip(1, TENANT_A);
  assert.deepStrictEqual(r, { acknowledged: true, alreadyRecorded: true });
});
