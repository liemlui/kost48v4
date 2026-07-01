'use strict';
/**
 * Unit test: StaffFieldReportsService — laporan kondisi staff
 * Cakupan: create, findAll, reviewQueue, adminReview
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException, ForbiddenException } = require('@nestjs/common');
const { StaffFieldReportsService } = require('../../dist/modules/staff-field-reports/staff-field-reports.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const STAFF_A = { id: 3, role: 'STAFF', tenantId: null, fullName: 'Staff A' };
const STAFF_B = { id: 4, role: 'STAFF', tenantId: null, fullName: 'Staff B' };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
const OWNER = { id: 1, role: 'OWNER', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkRoomItem(overrides = {}) {
  return {
    id: 10, roomId: 5, itemId: 100, qty: 1, status: 'GOOD', note: null,
    item: { id: 100, name: 'Spring Bed', category: 'FURNITURE' },
    room: { id: 5, code: 'A-01', name: 'Kamar A-01' },
    ...overrides,
  };
}

function mkInventoryItem(overrides = {}) {
  return {
    id: 50, name: 'Sapu', category: 'ALAT_KEBERSIHAN', qtyOnHand: '5', status: 'GOOD', notes: null,
    ...overrides,
  };
}

function mkTicket(overrides = {}) {
  return {
    id: 200, ticketNumber: 'TIC-2026-0200', title: 'Perlu keputusan admin - Spring Bed', status: 'OPEN',
    roomId: 5, assignedToId: 3, linkedRoomItemId: null, linkedInventoryItemId: null,
    description: 'Laporan kondisi',
    room: { id: 5, code: 'A-01' },
    assignedTo: { id: 3, fullName: 'Staff A', role: 'STAFF' },
    ...overrides,
  };
}

function mkReport(overrides = {}) {
  return {
    id: 300, ticketId: 200, roomId: 5, roomItemId: 10, inventoryItemId: null,
    reportedByStaffId: 3, reportedCondition: 'DAMAGED', conditionNotes: 'Pecah',
    status: 'REPORTED', adminDecision: null, adminNote: null,
    reportedByStaff: { id: 3, fullName: 'Staff A', role: 'STAFF' },
    adminReviewedBy: null,
    room: { id: 5, code: 'A-01' },
    roomItem: { id: 10, item: { name: 'Spring Bed' }, room: { code: 'A-01' } },
    inventoryItem: null,
    requestedInventoryItem: null,
    relatedMovement: null,
    ticket: { id: 200, title: 'Tiket', room: { code: 'A-01' }, assignedTo: { fullName: 'Staff A' } },
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
      update: async (args) => ({ ...mkTicket(), ...args.data }),
      create: async (args) => ({ ...mkTicket({ id: 201 }), ...args.data }),
    };
    const roomItemBase = { findUnique: async () => null, update: async (args) => args.data };
    const inventoryItemBase = { findUnique: async () => null, update: async (args) => args.data };
    const stayBase = { findFirst: async () => null };
    const reportBase = { create: async (args) => ({ ...mkReport(), ...args.data }), update: async (args) => ({ ...mkReport(), ...args.data }) };
    const perfEventBase = { create: async (args) => args.data };
    const invMovementBase = { create: async (args) => ({ id: 99, ...args.data }) };
    return {
      $executeRaw: async () => [{ id: 1 }],
      ticket: { ...ticketBase, ...(ov.ticket || {}) },
      roomItem: { ...roomItemBase, ...(ov.roomItem || {}) },
      inventoryItem: { ...inventoryItemBase, ...(ov.inventoryItem || {}) },
      stay: { ...stayBase, ...(ov.stay || {}) },
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
    ticket: {
      findFirst: async () => null,
      findUnique: async () => null,
      findMany: async () => [],
      update: async (args) => ({ ...mkTicket(), ...args.data }),
      create: async (args) => ({ ...mkTicket({ id: Date.now() }), ...args.data }),
    },
    roomItem: { findUnique: async () => null, update: async (args) => args.data },
    inventoryItem: { findUnique: async () => null, update: async (args) => args.data },
    stay: { findFirst: async () => null },
    staffFieldReport: {
      create: async (args) => ({ ...mkReport(), ...args.data }),
      findMany: async () => [],
      findUnique: async () => null,
    },
    staffPerformanceEvent: { create: async (args) => args.data },
    room: { findUnique: async () => null },
    inventoryMovement: { create: async () => ({ id: 99 }) },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new StaffFieldReportsService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('SF-cr-01: create — no target item/ticket for staff → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ conditionNotes: 'Rusak' }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('SF-cr-02: create — no conditionNotes → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ roomItemId: 10, conditionNotes: '' }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('SF-cr-03: create — requestsReplacement missing item/qty → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create({ roomItemId: 10, conditionNotes: 'Rusak', requestsReplacement: true }, STAFF_A),
    (e) => e instanceof ConflictException,
  );
});

test('SF-cr-04: create — roomItem not found → NotFound', async () => {
  const svc = makeSvc({ roomItem: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.create({ roomItemId: 999, conditionNotes: 'Rusak' }, STAFF_A),
    (e) => e instanceof NotFoundException,
  );
});

test('SF-cr-05: create — ticket not found → NotFound', async () => {
  const svc = makeSvc({ ticket: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.create({ ticketId: 999, conditionNotes: 'Rusak' }, STAFF_A),
    (e) => e instanceof NotFoundException,
  );
});

test('SF-cr-06: create — staff creates report with roomItem (no existing ticket)', async () => {
  const roomItem = mkRoomItem();
  const svc = makeSvc({
    roomItem: { findUnique: async () => roomItem, update: async (args) => ({ ...roomItem, ...args.data }) },
    stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    tx: {
      ticket: { findFirst: async () => null, create: async (args) => mkTicket({ ...args.data, id: 201 }) },
      roomItem: { findUnique: async () => roomItem, update: async (args) => ({ ...roomItem, ...args.data }) },
      stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
      staffFieldReport: { create: async (args) => ({ ...mkReport(), ...args.data }) },
      staffPerformanceEvent: { create: async (args) => args.data },
    },
  });
  const r = await svc.create({
    roomItemId: 10, conditionNotes: 'Pecah', reportedCondition: 'DAMAGED', photoUrl: 'https://img.url',
  }, STAFF_A);
  assert.ok(r.report);
  assert.ok(r.ticket);
  assert.strictEqual(r.report.reportedCondition, 'DAMAGED');
});

test('SF-cr-07: create — admin creates report bypasses staff-only restrictions', async () => {
  const svc = makeSvc({
    roomItem: { findUnique: async () => mkRoomItem(), update: async (args) => args.data },
    stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
    tx: {
      ticket: { findFirst: async () => null, create: async (args) => mkTicket({ ...args.data, id: 202 }) },
      roomItem: { update: async (args) => args.data },
      stay: { findFirst: async () => ({ id: 10, tenantId: 7 }) },
      staffFieldReport: { create: async (args) => ({ ...mkReport(), ...args.data }) },
      staffPerformanceEvent: { create: async (args) => args.data },
    },
  });
  const r = await svc.create({ roomItemId: 10, conditionNotes: 'Cek kondisi' }, ADMIN);
  assert.ok(r.report);
});

// ════════════════════════════════════════════════════════════════════════════
// findAll
// ════════════════════════════════════════════════════════════════════════════

test('SF-fl-01: findAll returns reports', async () => {
  const svc = makeSvc({ staffFieldReport: { findMany: async () => [mkReport()] } });
  const r = await svc.findAll({ page: '1', limit: '10' }, ADMIN);
  assert.strictEqual(r.items.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// reviewQueue
// ════════════════════════════════════════════════════════════════════════════

test('SF-rq-01: reviewQueue returns queue object', async () => {
  const svc = makeSvc({
    ticket: {
      findMany: async () => [mkTicket()],
    },
    staffFieldReport: { findMany: async () => [mkReport()] },
  });
  const r = await svc.reviewQueue();
  assert.ok(Array.isArray(r.pendingAssignment));
  assert.ok(Array.isArray(r.pendingStockApproval));
  assert.ok(Array.isArray(r.pendingVerification));
  assert.ok(Array.isArray(r.pendingItemDecision));
  assert.ok(Array.isArray(r.recentlyClosed));
});

// ════════════════════════════════════════════════════════════════════════════
// adminReview
// ════════════════════════════════════════════════════════════════════════════

test('SF-ar-01: adminReview — not found', async () => {
  const svc = makeSvc({ staffFieldReport: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.adminReview(999, { decision: 'APPROVE' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('SF-ar-02: adminReview — APPROVE with replacement creates movement', async () => {
  const report = mkReport({ requestsReplacement: true, requestedInventoryItemId: 50, requestedQty: '2' });
  let movementCreated = false;
  const svc = makeSvc({
    staffFieldReport: { findUnique: async () => report, update: async (args) => ({ ...report, ...args.data }) },
    roomItem: { findUnique: async () => mkRoomItem() },
    room: { findUnique: async () => ({ id: 5, code: 'A-01' }) },
    inventoryItem: {
      findUnique: async () => mkInventoryItem(),
      update: async (args) => args.data,
    },
    inventoryMovement: { create: async () => { movementCreated = true; return {}; } },
    tx: {
      ticket: { findFirst: async () => null, count: async () => 0, findUnique: async () => null, update: async (args) => args.data, create: async () => ({}) },
      inventoryMovement: { create: async () => { movementCreated = true; return {}; } },
      inventoryItem: { update: async (args) => args.data },
      roomItem: { update: async (args) => args.data },
      staffFieldReport: { update: async (args) => ({ ...report, ...args.data }) },
    },
  });
  const r = await svc.adminReview(300, { adminDecision: 'APPROVE', adminNotes: 'Setuju ganti barang segera', createMovement: { inventoryItemId: 50, movementType: 'ASSIGN_TO_ROOM', qty: '2', roomId: 5, note: 'Ganti' } }, ADMIN);
  assert.strictEqual(r.report.adminDecision, 'APPROVE');
  assert.ok(movementCreated);
});

test('SF-ar-03: adminReview — DISMISS sets adminNotes', async () => {
  const report = mkReport();
  const svc = makeSvc({
    staffFieldReport: { findUnique: async () => report, update: async (args) => ({ ...report, ...args.data }) },
    tx: {
      ticket: { findFirst: async () => null, count: async () => 0, findUnique: async () => null, update: async (args) => args.data },
      staffFieldReport: { update: async (args) => ({ ...report, ...args.data }) },
    },
  });
  const r = await svc.adminReview(300, { adminDecision: 'DISMISS', adminNotes: 'Tidak perlu ganti barang ini karena masih bisa diperbaiki' }, ADMIN);
  assert.strictEqual(r.report.adminDecision, 'DISMISS');
});
