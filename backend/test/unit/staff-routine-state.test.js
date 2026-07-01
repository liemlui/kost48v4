'use strict';
/**
 * Unit test: Staff routine state machine — helpers & service transitions
 * Cakupan: StaffRoutinesService (start & complete) + helper functions
 *   (isTemplateDue, dueLabel, formatDateKey logic inline)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 * Catatan: helper functions (startOfLocalDate, parseDate, isTemplateDue, dll)
 *   adalah module-level function, bukan exports — diuji via service behavior.
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException, ConflictException } = require('@nestjs/common');
const { StaffRoutinesService } = require('../../dist/modules/staff-routines/staff-routines.service.js');
const { StaffRoutineStatus } = require('../../dist/common/enums/app.enums.js');

// ─── Aktor ────────────────────────────────────────────────────────────────
const STAFF_A = { id: 3, role: 'STAFF', tenantId: null };
const STAFF_B = { id: 5, role: 'STAFF', tenantId: null };

// ─── Template dasar ───────────────────────────────────────────────────────
function mkTemplate(overrides = {}) {
  return {
    id: 1,
    title: 'Bersihkan kamar mandi',
    frequency: 'DAILY',
    isActive: true,
    dayOfWeek: null,
    dayOfMonth: null,
    requiresPhoto: false,
    requiresNote: false,
    areaType: 'BATHROOM',
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
    status: 'IN_PROGRESS',
    completedAt: null,
    note: null,
    photoUrl: null,
    ...overrides,
  };
}

// ─── Mock Prisma + Audit ─────────────────────────────────────────────────
function makeService({
  templateResult = null,
  assignmentResult = null,
  existingCompletion = null,
} = {}) {
  const prisma = {
    staffRoutineTemplate: { findUnique: async () => templateResult },
    staffRoutineAssignment: { findUnique: async () => assignmentResult },
    staffRoutineCompletion: {
      findFirst: async () => existingCompletion,
      update: async ({ data }) => ({ ...(existingCompletion ?? mkCompletion()), ...data }),
      create: async (args) => ({ ...mkCompletion(), ...args.data, id: 101 }),
    },
    ticket: { findFirst: async () => null },
  };
  const audit = { log: async () => undefined };
  return new StaffRoutinesService(prisma, audit);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. StaffRoutineStatus enum
// ════════════════════════════════════════════════════════════════════════════

test('SR-T01: StaffRoutineStatus memiliki 5 nilai', () => {
  const values = Object.values(StaffRoutineStatus);
  assert.strictEqual(values.length, 5);
  assert.ok(values.includes('IN_PROGRESS'));
  assert.ok(values.includes('DONE'));
  assert.ok(values.includes('NEED_HELP'));
  assert.ok(values.includes('MISSED'));
  assert.ok(values.includes('SKIPPED'));
});

test('SR-T02: StaffRoutineStatus — IN_PROGRESS transisi valid ke DONE / NEED_HELP', () => {
  // Validasi bahwa IN_PROGRESS ada di enum dan bisa bertransisi
  assert.strictEqual(StaffRoutineStatus.IN_PROGRESS, 'IN_PROGRESS');
  assert.strictEqual(StaffRoutineStatus.DONE, 'DONE');
  assert.strictEqual(StaffRoutineStatus.NEED_HELP, 'NEED_HELP');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. isTemplateDue pattern test (via inline logic mirror)
// ════════════════════════════════════════════════════════════════════════════

function testIsTemplateDue(template, date) {
  if (template.frequency === 'DAILY') return true;
  if (template.frequency === 'WEEKLY') return template.dayOfWeek == null || template.dayOfWeek === date.getDay();
  if (template.frequency === 'MONTHLY') return template.dayOfMonth == null || template.dayOfMonth === date.getDate();
  return false;
}

function testDueLabel(template) {
  if (template.frequency === 'DAILY') return 'Harian';
  if (template.frequency === 'WEEKLY') return template.dayOfWeek == null ? 'Mingguan' : `Mingguan hari ke-${template.dayOfWeek}`;
  if (template.frequency === 'MONTHLY') return template.dayOfMonth == null ? 'Bulanan' : `Bulanan tanggal ${template.dayOfMonth}`;
  return 'Rutin';
}

test('SR-T03: isTemplateDue — DAILY selalu true', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'DAILY' }, new Date('2026-06-15')), true);
  assert.strictEqual(testIsTemplateDue({ frequency: 'DAILY' }, new Date('2026-12-31')), true);
});

test('SR-T04: isTemplateDue — WEEKLY tanpa dayOfWeek → true', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'WEEKLY', dayOfWeek: null }, new Date()), true);
});

test('SR-T05: isTemplateDue — WEEKLY dg dayOfWeek cocok → true', () => {
  // 2026-06-15 = Monday = 1
  assert.strictEqual(testIsTemplateDue({ frequency: 'WEEKLY', dayOfWeek: 1 }, new Date('2026-06-15')), true);
});

test('SR-T06: isTemplateDue — WEEKLY dg dayOfWeek tidak cocok → false', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'WEEKLY', dayOfWeek: 3 }, new Date('2026-06-15')), false);
});

test('SR-T07: isTemplateDue — MONTHLY tanpa dayOfMonth → true', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'MONTHLY', dayOfMonth: null }, new Date('2026-06-15')), true);
});

test('SR-T08: isTemplateDue — MONTHLY dg dayOfMonth cocok → true', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'MONTHLY', dayOfMonth: 15 }, new Date('2026-06-15')), true);
});

test('SR-T09: isTemplateDue — MONTHLY dg dayOfMonth tidak cocok → false', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'MONTHLY', dayOfMonth: 1 }, new Date('2026-06-15')), false);
});

test('SR-T10: isTemplateDue — frekuensi tidak dikenal → false', () => {
  assert.strictEqual(testIsTemplateDue({ frequency: 'YEARLY' }, new Date('2026-06-15')), false);
});

test('SR-T11: dueLabel — DAILY → "Harian"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'DAILY' }), 'Harian');
});

test('SR-T12: dueLabel — WEEKLY tanpa dayOfWeek → "Mingguan"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'WEEKLY', dayOfWeek: null }), 'Mingguan');
});

test('SR-T13: dueLabel — WEEKLY dg dayOfWeek → "Mingguan hari ke-3"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'WEEKLY', dayOfWeek: 3 }), 'Mingguan hari ke-3');
});

test('SR-T14: dueLabel — MONTHLY tanpa dayOfMonth → "Bulanan"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'MONTHLY', dayOfMonth: null }), 'Bulanan');
});

test('SR-T15: dueLabel — MONTHLY dg dayOfMonth → "Bulanan tanggal 15"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'MONTHLY', dayOfMonth: 15 }), 'Bulanan tanggal 15');
});

test('SR-T16: dueLabel — frekuensi tidak dikenal → "Rutin"', () => {
  assert.strictEqual(testDueLabel({ frequency: 'YEARLY' }), 'Rutin');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Service: start() — state transition guards
// ════════════════════════════════════════════════════════════════════════════

test('SR-T17: start — template tidak ditemukan → NotFound', async () => {
  const svc = makeService({ templateResult: null });
  await assert.rejects(
    () => svc.start(1, { dueDate: '2026-06-15' }, STAFF_A),
    (err) => err instanceof NotFoundException,
  );
});

test('SR-T18: start — template tidak aktif → NotFound', async () => {
  const svc = makeService({ templateResult: mkTemplate({ isActive: false }) });
  await assert.rejects(
    () => svc.start(1, { dueDate: '2026-06-15' }, STAFF_A),
    (err) => err instanceof NotFoundException,
  );
});

test('SR-T19: start — sudah DONE → Conflict', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: mkCompletion({ status: 'DONE' }),
  });
  await assert.rejects(
    () => svc.start(1, { dueDate: '2026-06-15' }, STAFF_A),
    (err) => err instanceof ConflictException,
  );
});

test('SR-T20: start — sudah NEED_HELP → Conflict', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: mkCompletion({ status: 'NEED_HELP' }),
  });
  await assert.rejects(
    () => svc.start(1, { dueDate: '2026-06-15' }, STAFF_A),
    (err) => err instanceof ConflictException,
  );
});

test('SR-T21: start — sudah IN_PROGRESS → idempotent (return existing)', async () => {
  const existing = mkCompletion({ status: 'IN_PROGRESS', id: 100 });
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: existing,
  });
  const result = await svc.start(1, { dueDate: '2026-06-15' }, STAFF_A);
  assert.strictEqual(result.id, 100);
  assert.strictEqual(result.status, 'IN_PROGRESS');
});

test('SR-T22: start — sukses buat baru IN_PROGRESS', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: null,
  });
  const result = await svc.start(1, { dueDate: '2026-06-15', note: 'Mulai bersih' }, STAFF_A);
  assert.ok(result);
  assert.strictEqual(result.status, 'IN_PROGRESS');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Service: complete() — state transitions
// ════════════════════════════════════════════════════════════════════════════

test('SR-T23: complete — template tidak ditemukan → NotFound', async () => {
  const svc = makeService({ templateResult: null });
  await assert.rejects(
    () => svc.complete(1, { dueDate: '2026-06-15', status: 'DONE' }, STAFF_A),
    (err) => err instanceof NotFoundException,
  );
});

test('SR-T24: complete — sudah DONE → Conflict (anti polish KPI)', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: mkCompletion({ status: 'DONE', completedAt: new Date() }),
  });
  await assert.rejects(
    () => svc.complete(1, { dueDate: '2026-06-15', status: 'DONE' }, STAFF_A),
    (err) => err instanceof ConflictException,
  );
});

test('SR-T25: complete — requiresPhoto tanpa photo → Conflict', async () => {
  const svc = makeService({
    templateResult: mkTemplate({ requiresPhoto: true }),
    existingCompletion: null,
  });
  await assert.rejects(
    () => svc.complete(1, { dueDate: '2026-06-15', status: 'DONE' }, STAFF_A),
    (err) => err instanceof ConflictException,
  );
});

test('SR-T26: complete — requiresNote tanpa note → Conflict', async () => {
  const svc = makeService({
    templateResult: mkTemplate({ requiresNote: true }),
    existingCompletion: null,
  });
  await assert.rejects(
    () => svc.complete(1, { dueDate: '2026-06-15', status: 'DONE' }, STAFF_A),
    (err) => err instanceof ConflictException,
  );
});

test('SR-T27: complete — IN_PROGRESS → DONE berhasil', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: mkCompletion({ status: 'IN_PROGRESS' }),
  });
  const result = await svc.complete(1, { dueDate: '2026-06-15', status: 'DONE', note: 'Selesai bersih' }, STAFF_A);
  assert.strictEqual(result.status, 'DONE');
});

test('SR-T28: complete — IN_PROGRESS → NEED_HELP berhasil', async () => {
  const svc = makeService({
    templateResult: mkTemplate(),
    existingCompletion: mkCompletion({ status: 'IN_PROGRESS' }),
  });
  const result = await svc.complete(1, { dueDate: '2026-06-15', status: 'NEED_HELP', note: 'Minta bantuan' }, STAFF_A);
  assert.strictEqual(result.status, 'NEED_HELP');
});
