'use strict';
/**
 * Unit test: TenantStaffReviewsService — review staf oleh tenant
 * Cakupan: eligible, create, listPendingVerification, verify
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException } = require('@nestjs/common');
const { TenantStaffReviewsService } = require('../../dist/modules/tenant-staff-reviews/tenant-staff-reviews.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const TENANT_A = { id: 10, role: 'TENANT', tenantId: 7 };
const TENANT_B = { id: 11, role: 'TENANT', tenantId: 8 };
const TENANT_NO_TENANCY = { id: 12, role: 'TENANT', tenantId: null };
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const STAFF = { id: 3, role: 'STAFF', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkTicket(overrides = {}) {
  return {
    id: 50,
    ticketNumber: 'TIC-2026-0050',
    title: 'Keran bocor',
    status: 'DONE',
    tenantId: 7,
    assignedToId: 3,
    updatedAt: new Date('2026-06-15'),
    assignedTo: { id: 3, fullName: 'Staff A', role: 'STAFF' },
    room: { id: 5, code: 'A-01', name: 'Kamar A-01' },
    tenant: { id: 7, fullName: 'Tenant A' },
    ...overrides,
  };
}

function mkReview(overrides = {}) {
  return {
    id: 100,
    staffId: 3,
    tenantId: 7,
    ticketId: 50,
    rating: 4,
    comment: 'Bagus',
    status: 'VISIBLE',
    moderatedById: null,
    createdAt: new Date('2026-06-16'),
    staff: { id: 3, fullName: 'Staff A', role: 'STAFF' },
    tenant: { id: 7, fullName: 'Tenant A' },
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}, notifOverrides = {}) {
  const prisma = {
    ticket: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    staffReview: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (args) => ({ ...mkReview(), ...args.data }),
      update: async (args) => ({ ...mkReview(), ...args.data }),
    },
    user: {
      findMany: async () => [{ id: 1 }],
    },
    ...prismaOverrides,
  };
  const notification = {
    create: async () => undefined,
    createOnce: async () => undefined,
    ...notifOverrides,
  };
  return new TenantStaffReviewsService(prisma, notification);
}

// ════════════════════════════════════════════════════════════════════════════
// eligible
// ════════════════════════════════════════════════════════════════════════════

test('TS-el-01: eligible — no tenantId → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.eligible(TENANT_NO_TENANCY),
    (e) => e instanceof ConflictException,
  );
});

test('TS-el-02: eligible — no tickets → empty items', async () => {
  const svc = makeSvc({ ticket: { findMany: async () => [] } });
  const r = await svc.eligible(TENANT_A);
  assert.strictEqual(r.items.length, 0);
});

test('TS-el-03: eligible — returns unreviewed tickets', async () => {
  const svc = makeSvc({
    ticket: { findMany: async () => [mkTicket()] },
    staffReview: { findMany: async () => [] },
  });
  const r = await svc.eligible(TENANT_A);
  assert.strictEqual(r.items.length, 1);
  assert.strictEqual(r.items[0].ticketId, 50);
});

test('TS-el-04: eligible — filters already reviewed tickets', async () => {
  const svc = makeSvc({
    ticket: { findMany: async () => [mkTicket()] },
    staffReview: { findMany: async () => [{ ticketId: 50 }] },
  });
  const r = await svc.eligible(TENANT_A);
  assert.strictEqual(r.items.length, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('TS-cr-01: create — no tenantId → Conflict', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.create(TENANT_NO_TENANCY, { ticketId: 50, rating: 4 }),
    (e) => e instanceof ConflictException,
  );
});

test('TS-cr-02: create — ticket not found → NotFound', async () => {
  const svc = makeSvc({ ticket: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.create(TENANT_A, { ticketId: 999, rating: 4 }),
    (e) => e instanceof NotFoundException,
  );
});

test('TS-cr-03: create — ticket belongs to other tenant → NotFound', async () => {
  const svc = makeSvc({
    ticket: { findUnique: async () => mkTicket({ tenantId: 8 }) },
  });
  await assert.rejects(
    () => svc.create(TENANT_A, { ticketId: 50, rating: 4 }),
    (e) => e instanceof NotFoundException,
  );
});

test('TS-cr-04: create — ticket not DONE/CLOSED → Conflict', async () => {
  const svc = makeSvc({
    ticket: { findUnique: async () => mkTicket({ status: 'IN_PROGRESS' }) },
  });
  await assert.rejects(
    () => svc.create(TENANT_A, { ticketId: 50, rating: 4 }),
    (e) => e instanceof ConflictException,
  );
});

test('TS-cr-05: create — ticket without assigned staff → Conflict', async () => {
  const svc = makeSvc({
    ticket: { findUnique: async () => mkTicket({ assignedToId: null, assignedTo: null }) },
  });
  await assert.rejects(
    () => svc.create(TENANT_A, { ticketId: 50, rating: 4 }),
    (e) => e instanceof ConflictException,
  );
});

test('TS-cr-06: create — rating >2 → VISIBLE langsung', async () => {
  const svc = makeSvc({
    ticket: { findUnique: async () => mkTicket() },
    staffReview: {
      create: async (args) => mkReview({ ...args.data, id: 101 }),
    },
  });
  const r = await svc.create(TENANT_A, { ticketId: 50, rating: 4, comment: 'Bagus' });
  assert.strictEqual(r.status, 'VISIBLE');
});

test('TS-cr-07: create — rating ≤2 → PENDING_VERIFICATION', async () => {
  const svc = makeSvc({
    ticket: { findUnique: async () => mkTicket() },
    staffReview: {
      create: async (args) => mkReview({ ...args.data, id: 101, status: 'PENDING_VERIFICATION' }),
    },
  });
  const r = await svc.create(TENANT_A, { ticketId: 50, rating: 2 });
  assert.strictEqual(r.status, 'PENDING_VERIFICATION');
});

// ════════════════════════════════════════════════════════════════════════════
// listPendingVerification
// ════════════════════════════════════════════════════════════════════════════

test('TS-lp-01: listPendingVerification returns pending reviews', async () => {
  const svc = makeSvc({
    staffReview: { findMany: async () => [mkReview({ status: 'PENDING_VERIFICATION', rating: 2 })] },
  });
  const r = await svc.listPendingVerification();
  assert.strictEqual(r.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// verify
// ════════════════════════════════════════════════════════════════════════════

test('TS-vf-01: verify — not found', async () => {
  const svc = makeSvc({ staffReview: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.verify(999, 'APPROVE', OWNER),
    (e) => e instanceof NotFoundException,
  );
});

test('TS-vf-02: verify — not PENDING_VERIFICATION → Conflict', async () => {
  const svc = makeSvc({
    staffReview: { findUnique: async () => mkReview({ status: 'VISIBLE' }) },
  });
  await assert.rejects(
    () => svc.verify(100, 'APPROVE', OWNER),
    (e) => e instanceof ConflictException,
  );
});

test('TS-vf-03: verify — APPROVE → VISIBLE', async () => {
  const svc = makeSvc({
    staffReview: {
      findUnique: async () => mkReview({ status: 'PENDING_VERIFICATION', rating: 2 }),
      update: async (args) => mkReview({ ...args.data, status: 'VISIBLE' }),
    },
  });
  const r = await svc.verify(100, 'APPROVE', OWNER);
  assert.strictEqual(r.status, 'VISIBLE');
});

test('TS-vf-04: verify — DISMISS → HIDDEN', async () => {
  const svc = makeSvc({
    staffReview: {
      findUnique: async () => mkReview({ status: 'PENDING_VERIFICATION', rating: 2 }),
      update: async (args) => mkReview({ ...args.data, status: 'HIDDEN' }),
    },
  });
  const r = await svc.verify(100, 'DISMISS', OWNER);
  assert.strictEqual(r.status, 'HIDDEN');
});
