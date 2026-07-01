'use strict';

/**
 * Unit test: SurveysService — submit, summary, mineExists
 *
 * Cakupan:
 *   - submit: simpan survei tenant, dengan/semua field opsional
 *   - summary: agregat nilai + recentComments
 *   - mineExists: tenant tanpa stay, tenant <30 hari, tenant >30 hari,
 *     tenant sudah submit (cooldown 6 bulan), tenant boleh isi ulang
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { SurveysService } = require('../../dist/modules/surveys/surveys.service.js');

function makeSvc(overrides = {}) {
  const prisma = {
    satisfactionSurvey: {
      create: async (args) => ({ id: 1, ...args.data, createdAt: new Date() }),
      findMany: async () => [],
      findFirst: async () => null,
    },
    stay: {
      findFirst: async () => null,
    },
    ...overrides,
  };
  return new SurveysService(prisma);
}

const TENANT = { id: 10, role: 'TENANT', tenantId: 5 };
const TENANT_NO_TENANT_ID = { id: 11, role: 'TENANT', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };

// ════════════════════════════════════════════════════════════════════════════
// submit
// ════════════════════════════════════════════════════════════════════════════

test('TC-SV01: submit survei dengan data minimal', async () => {
  let created = null;
  const svc = makeSvc({
    satisfactionSurvey: {
      create: async (args) => { created = args.data; return { id: 1, ...args.data }; },
    },
  });
  await svc.submit({ overallRating: 4 }, TENANT);
  assert.strictEqual(created.overallRating, 4);
  assert.strictEqual(created.tenantId, 5);
  assert.strictEqual(created.createdById, 10);
  assert.strictEqual(created.cleanliness, null);
  assert.strictEqual(created.wouldRecommend, null);
});

test('TC-SV02: submit survei dengan semua field', async () => {
  let created = null;
  const svc = makeSvc({
    satisfactionSurvey: {
      create: async (args) => { created = args.data; return { id: 1, ...args.data }; },
    },
  });
  await svc.submit({
    overallRating: 5,
    cleanliness: 4,
    staffService: 5,
    facility: 4,
    valueForMoney: 5,
    wouldRecommend: true,
    comment: '  Kosnya nyaman!  ',
  }, TENANT);
  assert.strictEqual(created.overallRating, 5);
  assert.strictEqual(created.cleanliness, 4);
  assert.strictEqual(created.comment, 'Kosnya nyaman!');
  assert.strictEqual(created.wouldRecommend, true);
});

test('TC-SV03: submit survei sebagai ADMIN tanpa tenantId — tenantId null', async () => {
  let created = null;
  const svc = makeSvc({
    satisfactionSurvey: {
      create: async (args) => { created = args.data; return { id: 1, ...args.data }; },
    },
  });
  await svc.submit({ overallRating: 3 }, ADMIN);
  assert.strictEqual(created.tenantId, null);
  assert.strictEqual(created.createdById, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// summary
// ════════════════════════════════════════════════════════════════════════════

test('TC-SV04: summary tanpa data survei', async () => {
  const svc = makeSvc({ satisfactionSurvey: { findMany: async () => [] } });
  const result = await svc.summary();
  assert.strictEqual(result.count, 0);
  assert.strictEqual(result.avgOverall, null);
  assert.strictEqual(result.recommendRate, null);
  assert.deepStrictEqual(result.recentComments, []);
});

test('TC-SV05: summary dengan beberapa survei', async () => {
  const surveys = [
    { id: 3, overallRating: 3, cleanliness: 4, staffService: 3, facility: 3, valueForMoney: 3, wouldRecommend: false, comment: '', createdAt: new Date('2026-06-22') },
    { id: 2, overallRating: 5, cleanliness: 5, staffService: 5, facility: 5, valueForMoney: 5, wouldRecommend: true, comment: 'Sangat baik', createdAt: new Date('2026-06-21') },
    { id: 1, overallRating: 4, cleanliness: 3, staffService: 4, facility: 5, valueForMoney: 4, wouldRecommend: true, comment: 'Bagus', createdAt: new Date('2026-06-20') },
  ];
  const svc = makeSvc({ satisfactionSurvey: { findMany: async () => surveys } });
  const result = await svc.summary();
  assert.strictEqual(result.count, 3);
  assert.strictEqual(result.avgOverall, 4); // (4+5+3)/3 = 4
  assert.strictEqual(result.avgCleanliness, 4); // (3+5+4)/3 = 4
  assert.strictEqual(result.recommendRate, 67); // 2/3
  // recentComments: hanya yg punya komentar, max 8
  assert.strictEqual(result.recentComments.length, 2);
  assert.strictEqual(result.recentComments[0].comment, 'Sangat baik');
});

// ════════════════════════════════════════════════════════════════════════════
// mineExists
// ════════════════════════════════════════════════════════════════════════════

test('TC-SV06: mineExists — tenant tanpa tenantId → tidak eligible', async () => {
  const svc = makeSvc();
  const result = await svc.mineExists(TENANT_NO_TENANT_ID);
  assert.strictEqual(result.submitted, false);
  assert.strictEqual(result.eligible, false);
});

test('TC-SV07: mineExists — tenant dengan stay <30 hari → belum eligible', async () => {
  const recentCheckIn = new Date();
  recentCheckIn.setDate(recentCheckIn.getDate() - 15); // 15 hari lalu
  const svc = makeSvc({
    stay: {
      findFirst: async () => ({ checkInDate: recentCheckIn }),
    },
  });
  const result = await svc.mineExists(TENANT);
  assert.strictEqual(result.submitted, false);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'min_stay_30_days');
  assert.ok(result.eligibleAt);
});

test('TC-SV08: mineExists — tenant dengan stay >30 hari, belum pernah submit → eligible', async () => {
  const oldCheckIn = new Date();
  oldCheckIn.setDate(oldCheckIn.getDate() - 60); // 60 hari lalu
  const svc = makeSvc({
    stay: {
      findFirst: async () => ({ checkInDate: oldCheckIn }),
    },
  });
  const result = await svc.mineExists(TENANT);
  assert.strictEqual(result.submitted, false);
  assert.strictEqual(result.eligible, true);
});

test('TC-SV09: mineExists — tenant sudah submit <6 bulan lalu → cooldown', async () => {
  const oldCheckIn = new Date();
  oldCheckIn.setDate(oldCheckIn.getDate() - 90);
  const lastSurvey = {
    id: 1,
    overallRating: 4,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 bulan lalu
  };
  const svc = makeSvc({
    stay: {
      findFirst: async () => ({ checkInDate: oldCheckIn }),
    },
    satisfactionSurvey: {
      findFirst: async () => lastSurvey,
    },
  });
  const result = await svc.mineExists(TENANT);
  assert.strictEqual(result.submitted, true);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'cooldown_6_months');
  assert.ok(result.nextEligibleAt);
  assert.ok(result.last);
});

test('TC-SV10: mineExists — tenant sudah submit >6 bulan lalu → boleh isi ulang', async () => {
  const oldCheckIn = new Date();
  oldCheckIn.setDate(oldCheckIn.getDate() - 400);
  const oldSurvey = {
    id: 1,
    overallRating: 4,
    createdAt: new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000), // 7 bulan lalu
  };
  const svc = makeSvc({
    stay: {
      findFirst: async () => ({ checkInDate: oldCheckIn }),
    },
    satisfactionSurvey: {
      findFirst: async () => oldSurvey,
    },
  });
  const result = await svc.mineExists(TENANT);
  assert.strictEqual(result.submitted, true);
  assert.strictEqual(result.eligible, true);
  assert.ok(result.last);
});

test('TC-SV11: mineExists — tenant tanpa stay aktif, belum submit → eligible', async () => {
  const svc = makeSvc({
    stay: { findFirst: async () => null },
    satisfactionSurvey: { findFirst: async () => null },
  });
  const result = await svc.mineExists(TENANT);
  assert.strictEqual(result.submitted, false);
  assert.strictEqual(result.eligible, true);
});
