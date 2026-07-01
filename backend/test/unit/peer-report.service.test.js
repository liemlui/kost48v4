'use strict';

/**
 * Unit test: PeerReportService — laporan sikap antar-tenant (anonim), moderasi, konfirmasi
 *
 * Cakupan: Y-H4
 */
const test = require('node:test');
const assert = require('node:assert');
const { PeerReportService } = require('../../dist/modules/loyalty/peer-report.service.js');

// ─── Helper ─────────────────────────────────────────────────────────────
function makeSvc(overrides = {}) {
  const prisma = {
    tenant: {
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: args.where.id, fullName: 'Tenant ' + args.where.id };
      },
    },
    peerBehaviorReport: {
      findFirst: async (args) => {
        // Simulasi duplikat: tenant 1 lapor tenant 2 kategori KEBISINGAN sudah ada
        if (args?.where?.reporterTenantId === 1 && args?.where?.reporteeTenantId === 2 && args?.where?.category === 'KEBISINGAN') {
          return { id: 5 };
        }
        return null;
      },
      findUnique: async (args) => {
        if (args?.where?.id === 999) return null;
        return { id: args.where.id, reporterTenantId: 1, reporteeTenantId: 2, category: 'KEBISINGAN', description: 'Bising malam', status: 'PENDING_REVIEW', acknowledgedAt: null, improvedAt: null, confirmedAt: null, moderatedById: null };
      },
      findMany: async (args) => {
        if (args?.where?.reporteeTenantId && args?.where?.status?.in) {
          // listAboutMe
          return [{ id: 1, category: 'KEBISINGAN', description: 'Bising', status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), improvedAt: null, confirmedAt: null }];
        }
        if (args?.where?.reporterTenantId != null) {
          // listMadeBy
          return [{ id: 1, category: 'KEBISINGAN', status: 'PENDING_REVIEW', reportee: { fullName: 'Budi' } }];
        }
        // listForAdmin
        return [{ id: 1, reporter: { fullName: 'Ali' }, reportee: { fullName: 'Budi' } }];
      },
      create: async (args) => ({ id: 10, category: args.data.category, status: 'PENDING_REVIEW', createdAt: new Date() }),
      update: async (args) => ({ id: args.where.id, status: args.data.status, ...args.data }),
    },
    user: {
      findMany: async () => [{ id: 7 }, { id: 8 }],
      findFirst: async (args) => {
        if (args?.where?.tenantId === 2) return { id: 5 };
        return null;
      },
    },
    stay: {
      findMany: async () => [
        { tenant: { id: 2, fullName: 'Budi' }, room: { code: 'A1-002', name: 'Kamar A1-002' } },
        { tenant: { id: 3, fullName: 'Citra' }, room: { code: 'A1-003', name: 'Kamar A1-003' } },
        // duplikat tenant 2 di stay lain → harus deduplikasi
        { tenant: { id: 2, fullName: 'Budi' }, room: { code: 'A1-002', name: 'Kamar A1-002' } },
      ],
    },
    ...overrides.prisma,
  };

  const loyalty = {
    award: async (input) => {
      if (input.delta === 0) return { created: false, skipped: true, reason: 'ZERO_DELTA' };
      return { created: true, id: 77 };
    },
    ...overrides.loyalty,
  };

  const appNotification = {
    createOnce: async (input) => ({ created: true, notificationId: 100 }),
    create: async (input) => ({ id: 200 }),
    ...overrides.appNotification,
  };

  return new PeerReportService(prisma, loyalty, appNotification);
}

// ─── Y-H4a: create ──────────────────────────────────────────────────────
test('PR-create-01: create laporan baru sukses', async () => {
  let createdData = null;
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        create: async (args) => { createdData = args.data; return { id: 10, category: args.data.category, status: 'PENDING_REVIEW', createdAt: new Date() }; },
        findFirst: async () => null,
      },
    },
  });
  const result = await svc.create(1, { reporteeTenantId: 3, category: 'KEBERSIHAN', description: 'Kamar kotor' });
  assert.strictEqual(result.id, 10);
  assert.strictEqual(result.status, 'PENDING_REVIEW');
  assert.strictEqual(createdData.reporterTenantId, 1);
  assert.strictEqual(createdData.reporteeTenantId, 3);
  assert.strictEqual(createdData.category, 'KEBERSIHAN');
});

test('PR-create-02: create throw bila self-report', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.create(1, { reporteeTenantId: 1, category: 'X', description: 'X' }), { message: 'Tidak bisa melapor diri sendiri.' });
});

test('PR-create-03: create throw bila reportee tidak ditemukan', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.create(1, { reporteeTenantId: 999, category: 'X', description: 'X' }), { message: 'Tenant yang dilaporkan tidak ditemukan.' });
});

test('PR-create-04: create throw bila laporan aktif sudah ada', async () => {
  const svc = makeSvc(); // mock default: tenant 1 lapor 2 kategori KEBISINGAN sudah ada
  await assert.rejects(() => svc.create(1, { reporteeTenantId: 2, category: 'KEBISINGAN', description: 'Bising' }), { message: 'Sudah ada laporan aktif untuk tenant & kategori ini.' });
});

test('PR-create-05: create mengirim notif ke admin/owner', async () => {
  let notifCalls = 0;
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        create: async (args) => ({ id: 10, category: args.data.category, status: 'PENDING_REVIEW', createdAt: new Date() }),
        findFirst: async () => null,
      },
    },
    appNotification: {
      createOnce: async () => { notifCalls += 1; return { created: true, notificationId: 100 }; },
    },
  });
  await svc.create(1, { reporteeTenantId: 3, category: 'KEBERSIHAN', description: 'Kamar kotor' });
  assert.strictEqual(notifCalls, 2); // 2 admin (id 7, 8)
});

// ─── Y-H4b: moderate ────────────────────────────────────────────────────
test('PR-moderate-01: moderate ACKNOWLEDGE mengupdate status', async () => {
  const svc = makeSvc();
  const result = await svc.moderate(1, 'ACKNOWLEDGE', 7);
  assert.strictEqual(result.status, 'ACKNOWLEDGED');
});

test('PR-moderate-02: moderate DISMISS mengubah status', async () => {
  const svc = makeSvc();
  const result = await svc.moderate(1, 'DISMISS', 7);
  assert.strictEqual(result.status, 'DISMISSED');
});

test('PR-moderate-03: moderate throw bila report tidak ada', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.moderate(999, 'ACKNOWLEDGE', 7), { message: 'Laporan tidak ditemukan.' });
});

test('PR-moderate-04: moderate throw bila status bukan PENDING_REVIEW', async () => {
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findUnique: async () => ({ id: 1, status: 'DISMISSED' }),
      },
    },
  });
  await assert.rejects(() => svc.moderate(1, 'ACKNOWLEDGE', 7), { message: /Laporan sudah/ });
});

// ─── Y-H4c: markImproved ────────────────────────────────────────────────
test('PR-improve-01: markImproved sukses', async () => {
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findFirst: async (args) => {
          if (args?.where?.id === 1 && args?.where?.reporteeTenantId === 2) return { id: 1, status: 'ACKNOWLEDGED' };
          return null;
        },
        update: async (args) => ({ id: 1, status: args.data.status }),
      },
    },
  });
  const result = await svc.markImproved(2, 1);
  assert.strictEqual(result.status, 'IMPROVED');
});

test('PR-improve-02: markImproved throw bila report tidak ditemukan', async () => {
  const svc = makeSvc({
    prisma: { peerBehaviorReport: { findFirst: async () => null } },
  });
  await assert.rejects(() => svc.markImproved(99, 1), { message: 'Laporan tidak ditemukan.' });
});

test('PR-improve-03: markImproved throw bila status bukan ACKNOWLEDGED', async () => {
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findFirst: async () => ({ id: 1, status: 'PENDING_REVIEW' }),
      },
    },
  });
  await assert.rejects(() => svc.markImproved(2, 1), { message: 'Laporan belum bisa ditandai membaik.' });
});

// ─── Y-H4d: confirm ─────────────────────────────────────────────────────
test('PR-confirm-01: confirm oleh reporter memberi poin', async () => {
  let awardInput = null;
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findUnique: async () => ({ id: 1, reporterTenantId: 1, reporteeTenantId: 2, status: 'IMPROVED' }),
        update: async (args) => ({ id: 1, status: args.data.status }),
      },
    },
    loyalty: {
      award: async (input) => { awardInput = input; return { created: true, id: 77 }; },
    },
  });
  const result = await svc.confirm(1, { id: 7, role: 'TENANT', tenantId: 1 });
  assert.strictEqual(result.status, 'CONFIRMED');
  assert.strictEqual(awardInput.tenantId, 2); // reportee dapat poin
  assert.strictEqual(awardInput.sourceType, 'PEER_IMPROVEMENT');
});

test('PR-confirm-02: confirm oleh admin memberi poin', async () => {
  let awardInput = null;
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findUnique: async () => ({ id: 1, reporterTenantId: 1, reporteeTenantId: 2, status: 'IMPROVED' }),
        update: async (args) => ({ id: 1, status: args.data.status }),
      },
    },
    loyalty: {
      award: async (input) => { awardInput = input; return { created: true, id: 77 }; },
    },
  });
  const result = await svc.confirm(1, { id: 7, role: 'ADMIN', tenantId: null });
  assert.strictEqual(result.status, 'CONFIRMED');
  assert.strictEqual(awardInput.tenantId, 2);
});

test('PR-confirm-03: confirm throw bila bukan reporter/admin', async () => {
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findUnique: async () => ({ id: 1, reporterTenantId: 1, reporteeTenantId: 2, status: 'IMPROVED' }),
      },
    },
  });
  await assert.rejects(() => svc.confirm(1, { id: 9, role: 'STAFF', tenantId: null }), { message: 'Hanya pelapor atau admin yang dapat mengonfirmasi.' });
});

test('PR-confirm-04: confirm throw bila status bukan IMPROVED', async () => {
  const svc = makeSvc({
    prisma: {
      peerBehaviorReport: {
        findUnique: async () => ({ id: 1, reporterTenantId: 1, reporteeTenantId: 2, status: 'PENDING_REVIEW' }),
      },
    },
  });
  await assert.rejects(() => svc.confirm(1, { id: 7, role: 'ADMIN', tenantId: null }), { message: 'Belum ada klaim perbaikan dari tenant.' });
});

test('PR-confirm-05: confirm throw bila report tidak ada', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.confirm(999, { id: 7, role: 'ADMIN', tenantId: null }), { message: 'Laporan tidak ditemukan.' });
});

// ─── Y-H4e: list helpers ────────────────────────────────────────────────
test('PR-list-01: listForAdmin mengembalikan semua laporan', async () => {
  const svc = makeSvc();
  const list = await svc.listForAdmin();
  assert.strictEqual(list.length, 1);
  assert.ok(list[0].reporter);
  assert.ok(list[0].reportee);
});

test('PR-list-02: listForAdmin filter status', async () => {
  const svc = makeSvc();
  const list = await svc.listForAdmin('PENDING_REVIEW');
  assert.strictEqual(list.length, 1);
});

test('PR-list-03: listMadeBy mengembalikan laporan reporter', async () => {
  const svc = makeSvc();
  const list = await svc.listMadeBy(1);
  assert.strictEqual(list.length, 1);
  assert.ok(list[0].reportee);
});

test('PR-list-04: listCoTenants mengembalikan tenant aktif lain (deduplikasi)', async () => {
  const svc = makeSvc();
  const list = await svc.listCoTenants(1);
  assert.strictEqual(list.length, 2); // Budi dan Citra (Budi hanya 1x walau 2 stay)
  assert.strictEqual(list[0].fullName, 'Budi');
  assert.strictEqual(list[0].room, 'A1-002');
});

test('PR-list-05: listAboutMe TIDAK mengandung reporterTenantId (anonim)', async () => {
  const svc = makeSvc();
  const list = await svc.listAboutMe(2);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].category, 'KEBISINGAN');
  // Pastikan tidak ada field reporterTenantId
  assert.strictEqual(Object.hasOwn(list[0], 'reporterTenantId'), false);
});
