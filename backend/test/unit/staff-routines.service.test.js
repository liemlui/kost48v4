'use strict';
/**
 * Unit test: StaffRoutinesService — getToday, getMyKpi, template CRUD, getAdminProgress
 * (start & complete sudah di-cover di staff-routine-state.test.js)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException } = require('@nestjs/common');
const { StaffRoutinesService } = require('../../dist/modules/staff-routines/staff-routines.service.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const STAFF_A = { id: 3, role: 'STAFF', tenantId: null };
const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };

// ─── Data dasar ───────────────────────────────────────────────────────────
function mkTemplate(overrides = {}) {
  return {
    id: 1,
    title: 'Bersihkan kamar mandi',
    description: 'Bersihkan lantai, wastafel, dan kaca',
    frequency: 'DAILY',
    isActive: true,
    sortOrder: 1,
    areaType: 'BATHROOM',
    requiresPhoto: false,
    requiresNote: false,
    dayOfWeek: null,
    dayOfMonth: null,
    assignments: [],
    ...overrides,
  };
}

function mkCompletion(overrides = {}) {
  return {
    id: 100,
    templateId: 1,
    assignmentId: null,
    staffUserId: 3,
    roomId: null,
    dueDate: new Date(),
    status: 'TODO',
    completedAt: null,
    note: null,
    photoUrl: null,
    ...overrides,
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────
function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg({})),
    staffRoutineTemplate: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async (args) => ({ ...mkTemplate(), ...args.data }),
      update: async (args) => ({ ...mkTemplate(), ...args.data }),
    },
    staffRoutineCompletion: {
      findMany: async () => [],
      findFirst: async () => null,
      count: async () => 0,
      create: async (args) => ({ ...mkCompletion(), ...args.data }),
      update: async (args) => ({ ...mkCompletion(), ...args.data }),
    },
    staffRoutineAssignment: { findUnique: async () => null },
    ticket: { findFirst: async () => null },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  return new StaffRoutinesService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// getToday
// ════════════════════════════════════════════════════════════════════════════

test('SR-gt-01: getToday returns empty when no templates', async () => {
  const svc = makeSvc({
    staffRoutineTemplate: { findMany: async () => [] },
    staffRoutineCompletion: { findMany: async () => [] },
  });
  const r = await svc.getToday(STAFF_A);
  assert.strictEqual(r.items.length, 0);
  assert.strictEqual(r.summary.total, 0);
  assert.strictEqual(r.summary.completionPercent, 100);
});

test('SR-gt-02: getToday returns due templates', async () => {
  const svc = makeSvc({
    staffRoutineTemplate: { findMany: async () => [mkTemplate({ assignments: [{}] })] },
    staffRoutineCompletion: { findMany: async () => [] },
  });
  const r = await svc.getToday(STAFF_A);
  assert.strictEqual(r.items.length, 1);
});

test('SR-gt-03: getToday shows completion summary', async () => {
  const svc = makeSvc({
    staffRoutineTemplate: { findMany: async () => [mkTemplate({ id: 1, assignments: [{}] }), mkTemplate({ id: 2, assignments: [{}] })] },
    staffRoutineCompletion: {
      findMany: async () => [mkCompletion({ templateId: 1, status: 'DONE' })],
    },
  });
  const r = await svc.getToday(STAFF_A);
  assert.strictEqual(r.summary.total, 2);
  assert.strictEqual(r.summary.completed, 1);
  assert.strictEqual(r.summary.remaining, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// getMyKpi
// ════════════════════════════════════════════════════════════════════════════

test('SR-gk-01: getMyKpi returns weekly summary', async () => {
  const completionData = [
    mkCompletion({ status: 'DONE', template: { id: 1, title: 'Bersih', areaType: 'BATHROOM', requiresPhoto: false, requiresNote: false } }),
  ];
  const svc = makeSvc({
    staffRoutineCompletion: { findMany: async () => completionData },
  });
  const r = await svc.getMyKpi(STAFF_A);
  assert.ok(r.period);
  assert.strictEqual(r.completedRoutineCount, 1);
  assert.strictEqual(r.needHelpCount, 0);
  assert.ok(Array.isArray(r.weekPoints));
});

// ════════════════════════════════════════════════════════════════════════════
// listTemplates
// ════════════════════════════════════════════════════════════════════════════

test('SR-lt-01: listTemplates returns all templates', async () => {
  const svc = makeSvc({
    staffRoutineTemplate: { findMany: async () => [mkTemplate(), mkTemplate({ id: 2, title: 'Sapu lantai' })] },
  });
  const r = await svc.listTemplates();
  assert.strictEqual(r.length, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// createTemplate
// ════════════════════════════════════════════════════════════════════════════

test('SR-ct-01: createTemplate succeeds', async () => {
  const svc = makeSvc({
    staffRoutineTemplate: { create: async (args) => mkTemplate({ ...args.data, id: 5 }) },
  });
  const r = await svc.createTemplate({ title: 'Cuci AC', frequency: 'MONTHLY', areaType: 'AC' }, ADMIN);
  assert.strictEqual(r.title, 'Cuci AC');
});

// ════════════════════════════════════════════════════════════════════════════
// updateTemplate
// ════════════════════════════════════════════════════════════════════════════

test('SR-ut-01: updateTemplate not found', async () => {
  const svc = makeSvc({ staffRoutineTemplate: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.updateTemplate(999, { title: 'Baru' }, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('SR-ut-02: updateTemplate succeeds', async () => {
  const template = mkTemplate();
  const svc = makeSvc({
    staffRoutineTemplate: {
      findUnique: async () => template,
      update: async (args) => ({ ...template, ...args.data }),
    },
  });
  const r = await svc.updateTemplate(1, { title: 'Baru' }, ADMIN);
  assert.strictEqual(r.title, 'Baru');
});

// ════════════════════════════════════════════════════════════════════════════
// deactivateTemplate
// ════════════════════════════════════════════════════════════════════════════

test('SR-dt-01: deactivateTemplate not found', async () => {
  const svc = makeSvc({ staffRoutineTemplate: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.deactivateTemplate(999, ADMIN),
    (e) => e instanceof NotFoundException,
  );
});

test('SR-dt-02: deactivateTemplate succeeds', async () => {
  const template = mkTemplate();
  const svc = makeSvc({
    staffRoutineTemplate: {
      findUnique: async () => template,
      update: async (args) => ({ ...template, ...args.data, isActive: false }),
    },
  });
  const r = await svc.deactivateTemplate(1, ADMIN);
  assert.strictEqual(r.isActive, false);
});

// ════════════════════════════════════════════════════════════════════════════
// getAdminProgress
// ════════════════════════════════════════════════════════════════════════════

test('SR-gp-01: getAdminProgress returns progress', async () => {
  const svc = makeSvc({
    staffRoutineCompletion: { findMany: async () => [mkCompletion({ status: 'DONE' })] },
  });
  const r = await svc.getAdminProgress({ to: '2026-06-20' });
  assert.ok(r.period);
  assert.strictEqual(r.items.length, 1);
});
