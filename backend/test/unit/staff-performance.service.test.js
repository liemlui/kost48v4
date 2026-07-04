'use strict';
/**
 * Unit test: StaffPerformanceService — KPI staf, audit, leaderboard
 * Cakupan: getMyMonthly, getAdminMonthly, getLeaderboard, getAuditSuggestions,
 *   getStaffMonthly, getStaffEvidence, createAudit
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { StaffPerformanceService } = require('../../dist/modules/staff-performance/staff-performance.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const STAFF_A = { id: 3, role: 'STAFF', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkStaff(overrides = {}) {
  return {
    id: 3, fullName: 'Staff A', email: 'staffa@kost48.com', role: 'STAFF', isActive: true, createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function mkRoutine(overrides = {}) {
  return {
    id: 100, templateId: 1, staffUserId: 3, status: 'DONE', dueDate: new Date('2026-06-15'),
    template: { id: 1, title: 'Bersih kamar', requiresPhoto: false, requiresNote: false },
    room: null,
    ...overrides,
  };
}

function mkTicket(overrides = {}) {
  return {
    id: 200, assignedToId: 3, status: 'DONE', category: 'MAINTENANCE',
    resolvedAt: new Date('2026-06-15'), assignedAt: new Date('2026-06-15'), dueAt: new Date('2026-06-16'),
    resolutionImageUrl: 'https://img.url', room: null, tenant: null,
    ...overrides,
  };
}

function mkAudit(overrides = {}) {
  return {
    id: 50, staffId: 3, result: 'PASS', scoreDelta: 3, notes: 'Bagus',
    createdAt: new Date('2026-06-15'),
    auditedBy: { id: 2, fullName: 'Admin', role: 'ADMIN' },
    ...overrides,
  };
}

function mkReview(overrides = {}) {
  return {
    id: 70, staffId: 3, rating: 5, comment: 'Mantap', status: 'VISIBLE',
    createdAt: new Date('2026-06-15'),
    tenant: { id: 7, fullName: 'Tenant A' },
    ...overrides,
  };
}

function mkEvent(overrides = {}) {
  return { id: 90, staffId: 3, eventType: 'AUDIT_PASS', scoreDelta: 3, reason: 'OK', createdAt: new Date('2026-06-15'), ...overrides };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arr) => Promise.all(arr),
    user: {
      findUnique: async () => mkStaff(),
      findMany: async () => [mkStaff()],
      findFirst: async () => null,
    },
    staffRoutineCompletion: { findMany: async () => [] },
    ticket: { findMany: async () => [] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { create: async (args) => ({ ...mkEvent(), ...args.data }), findMany: async () => [] },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new StaffPerformanceService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// getMyMonthly
// ════════════════════════════════════════════════════════════════════════════

test('SP-gm-01: getMyMonthly returns staff KPI', async () => {
  const svc = makeSvc({
    user: { findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [mkAudit()] },
    staffReview: { findMany: async () => [mkReview()] },
    staffPerformanceEvent: { findMany: async () => [mkEvent()] },
  });
  const r = await svc.getMyMonthly(STAFF_A);
  assert.ok(r.staff);
  assert.ok(r.score);
  assert.ok(r.category);
  assert.ok(r.monthlyKpi);
});

// ════════════════════════════════════════════════════════════════════════════
// getAdminMonthly
// ════════════════════════════════════════════════════════════════════════════

test('SP-ga-01: getAdminMonthly returns all staff KPI', async () => {
  const svc = makeSvc({
    user: { findMany: async () => [mkStaff(), mkStaff({ id: 4, fullName: 'Staff B' })], findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.getAdminMonthly();
  assert.strictEqual(r.items.length, 2);
  assert.ok(r.period);
  assert.ok(r.summary);
});

test('SP-ga-02: getAdminMonthly uses WIB month boundaries for explicit month', async () => {
  const captured = [];
  const svc = makeSvc({
    user: { findMany: async () => [mkStaff()], findUnique: async () => mkStaff() },
    staffRoutineCompletion: {
      findMany: async (args) => {
        captured.push(args.where.dueDate);
        return [];
      },
    },
    ticket: { findMany: async () => [] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });

  await svc.getAdminMonthly('2026-07');

  assert.strictEqual(captured.length, 1);
  assert.ok(captured[0].gte instanceof Date);
  assert.ok(captured[0].lt instanceof Date);
  assert.strictEqual(captured[0].gte.toISOString(), '2026-06-30T17:00:00.000Z');
  assert.strictEqual(captured[0].lt.toISOString(), '2026-07-31T17:00:00.000Z');
});

// ════════════════════════════════════════════════════════════════════════════
// getLeaderboard
// ════════════════════════════════════════════════════════════════════════════

test('SP-gl-01: getLeaderboard returns ranked staff', async () => {
  const svc = makeSvc({
    user: { findMany: async () => [mkStaff(), mkStaff({ id: 4, fullName: 'Staff B' })], findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.getLeaderboard();
  assert.ok(r.items.length >= 2);
  assert.strictEqual(r.active, true);
  assert.ok(r.items[0].rank);
});

// ════════════════════════════════════════════════════════════════════════════
// getAuditSuggestions
// ════════════════════════════════════════════════════════════════════════════

test('SP-gs-01: getAuditSuggestions returns suggestions', async () => {
  const svc = makeSvc({
    user: { findMany: async () => [mkStaff()], findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.getAuditSuggestions();
  assert.ok(r.items);
  assert.ok(r.summary);
});

// ════════════════════════════════════════════════════════════════════════════
// getStaffMonthly
// ════════════════════════════════════════════════════════════════════════════

test('SP-sm-01: getStaffMonthly returns specific staff', async () => {
  const svc = makeSvc({
    user: { findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.getStaffMonthly(3);
  assert.strictEqual(r.staff.id, 3);
});

// ════════════════════════════════════════════════════════════════════════════
// getStaffEvidence
// ════════════════════════════════════════════════════════════════════════════

test('SP-se-01: getStaffEvidence returns evidence data', async () => {
  const svc = makeSvc({
    user: { findUnique: async () => mkStaff() },
    staffRoutineCompletion: { findMany: async () => [mkRoutine()] },
    ticket: { findMany: async () => [mkTicket()] },
    meterReading: { findMany: async () => [] },
    staffWorkAudit: { findMany: async () => [] },
    staffReview: { findMany: async () => [] },
    staffPerformanceEvent: { findMany: async () => [] },
  });
  const r = await svc.getStaffEvidence(3);
  assert.ok(r.evidence);
});

// ════════════════════════════════════════════════════════════════════════════
// createAudit
// ════════════════════════════════════════════════════════════════════════════

test('SP-ca-01: createAudit — staff not found', async () => {
  const svc = makeSvc({ user: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.createAudit({ staffId: 999, result: 'PASS', sourceType: 'ROUTINE_AUDIT' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('SP-ca-02: createAudit — staff not STAFF role → NotFound', async () => {
  const svc = makeSvc({ user: { findUnique: async () => ({ id: 1, role: 'ADMIN' }) } });
  await assert.rejects(
    () => svc.createAudit({ staffId: 1, result: 'PASS', sourceType: 'ROUTINE_AUDIT' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('SP-ca-03: createAudit — PASS creates audit + event', async () => {
  const svc = makeSvc({
    user: { findUnique: async () => mkStaff() },
    staffWorkAudit: {
      create: async (args) => ({ ...mkAudit(), ...args.data, id: 55 }),
    },
    staffPerformanceEvent: {
      create: async (args) => mkEvent({ ...args.data, id: 95 }),
    },
  });
  const r = await svc.createAudit({ staffId: 3, result: 'PASS', sourceType: 'ROUTINE_AUDIT', notes: 'Rapi' }, ADMIN);
  assert.strictEqual(r.result, 'PASS');
});

test('SP-ca-04: createAudit — FAILED with negative delta', async () => {
  const svc = makeSvc({
    user: { findUnique: async () => mkStaff() },
    staffWorkAudit: {
      create: async (args) => mkAudit({ ...args.data, result: 'FAILED', scoreDelta: -10 }),
    },
    staffPerformanceEvent: { create: async (args) => mkEvent({ ...args.data }) },
  });
  const r = await svc.createAudit({ staffId: 3, result: 'FAILED', sourceType: 'ROUTINE_AUDIT' }, ADMIN);
  assert.strictEqual(r.result, 'FAILED');
  assert.strictEqual(r.scoreDelta, -10);
});
