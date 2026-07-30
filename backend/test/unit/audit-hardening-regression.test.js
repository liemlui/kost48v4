const assert = require('node:assert/strict');
const test = require('node:test');

const { startOfJakartaBusinessDay } = require('../../dist/common/utils/date.util.js');
const { AccountingPostingService } = require('../../dist/modules/accounting/accounting-posting.service.js');
const { AppNotificationService } = require('../../dist/modules/notifications/app-notification.service.js');
const { OwnerAiService } = require('../../dist/modules/owner-ai/owner-ai.service.js');
const { RenewRequestsService } = require('../../dist/modules/renew-requests/renew-requests.service.js');
const { StaffRoutinesService } = require('../../dist/modules/staff-routines/staff-routines.service.js');
const { WifiSalesService } = require('../../dist/modules/wifi-sales/wifi-sales.service.js');

test('S-01 — lock Stay, cross-check, dan create renew memakai transaksi yang sama', async () => {
  const events = [];
  const stay = {
    id: 10,
    status: 'ACTIVE',
    tenantId: 7,
    agreedRentAmountRupiah: 1_700_000,
    plannedCheckOutDate: new Date('2026-08-30T00:00:00.000Z'),
  };
  const request = { id: 91, stayId: stay.id, tenantId: stay.tenantId };
  const tx = {
    $queryRaw: async () => {
      events.push('lock-stay');
      return [{ id: stay.id }];
    },
    stay: {
      findUnique: async () => {
        events.push('read-stay');
        return stay;
      },
    },
    checkoutRequest: {
      findFirst: async () => {
        events.push('check-checkout');
        return null;
      },
    },
    invoice: {
      findMany: async () => {
        events.push('check-invoice');
        return [];
      },
    },
    renewRequest: {
      findFirst: async () => {
        events.push('check-renew');
        return null;
      },
      create: async () => {
        events.push('create-renew');
        return request;
      },
    },
  };
  const prisma = {
    $transaction: async (callback) => {
      events.push('tx-start');
      const result = await callback(tx);
      events.push('tx-commit');
      return result;
    },
  };
  const service = new RenewRequestsService(prisma, {}, {}, {}, { earnSafe: async () => undefined });
  service.loadStayNotifContext = async () => ({ tenantName: 'Tenant', roomLabel: 'Kamar A' });
  service.notifyAdminsRenew = async () => undefined;

  const result = await service.createRequest(
    { stayId: stay.id, requestedTerm: 'MONTHLY' },
    { id: 70, role: 'TENANT', tenantId: stay.tenantId },
  );

  assert.equal(result, request);
  assert.deepEqual(events, [
    'tx-start',
    'lock-stay',
    'read-stay',
    'check-checkout',
    'check-invoice',
    'check-renew',
    'create-renew',
    'tx-commit',
  ]);
});

test('OS-05 — start routine mengunci User sebelum guard dan write pekerjaan aktif', async () => {
  const events = [];
  const saved = { id: 81, status: 'IN_PROGRESS', staffUserId: 5 };
  let completionReads = 0;
  const tx = {
    $queryRaw: async () => {
      events.push('lock-user');
      return [{ id: 5 }];
    },
    ticket: {
      findFirst: async () => {
        events.push('check-active-ticket');
        return null;
      },
    },
    staffRoutineCompletion: {
      findFirst: async () => {
        completionReads += 1;
        events.push(completionReads === 1 ? 'check-existing-routine' : 'check-active-routine');
        return null;
      },
      create: async () => {
        events.push('create-routine');
        return saved;
      },
    },
  };
  const prisma = {
    staffRoutineTemplate: {
      findUnique: async () => ({ id: 3, isActive: true, frequency: 'DAILY' }),
    },
    $transaction: async (callback) => callback(tx),
  };
  const audit = { log: async () => events.push('audit') };
  const service = new StaffRoutinesService(prisma, audit);

  const result = await service.start(
    3,
    { dueDate: '2026-07-30' },
    { id: 5, role: 'STAFF' },
  );

  assert.equal(result, saved);
  assert.ok(events.indexOf('lock-user') < events.indexOf('check-active-ticket'));
  assert.ok(events.indexOf('lock-user') < events.indexOf('check-active-routine'));
  assert.ok(events.indexOf('check-active-routine') < events.indexOf('create-routine'));
});

test('X4 — bucket dengan resetAt tepat di dayStart tidak dihitung sebagai hari ini', () => {
  const dayStart = startOfJakartaBusinessDay(new Date()).getTime();
  const service = new OwnerAiService({}, {});
  service.buckets = new Map([
    ['1:kemarin', { count: 7, resetAt: dayStart }],
    ['1:hari-ini', { count: 2, resetAt: dayStart + 86_400_000 }],
  ]);
  service.getAiConfigSync = () => ({ featuresEnabled: true, dailyLimit: 10 });

  assert.equal(service.getDailyRemaining(10), 8);
  const stats = service.getUsageStats();
  assert.equal(stats.todayTotal, 2);
  assert.equal(stats.byFeature['hari-ini'], 2);
  assert.equal(stats.byFeature.kemarin, undefined);
});

test('X4 — checkRateLimit mereset bucket tepat pada boundary hari baru', () => {
  const dayStart = startOfJakartaBusinessDay(new Date()).getTime();
  const service = new OwnerAiService({}, {});
  service.buckets = new Map([['4:brief', { count: 10, resetAt: dayStart }]]);
  service.getAiConfigSync = () => ({ featuresEnabled: true, dailyLimit: 10 });

  service.checkRateLimit(4, 'brief');

  assert.deepEqual(service.buckets.get('4:brief'), {
    count: 1,
    resetAt: dayStart + 86_400_000,
  });
});

test('notifikasi fan-out memakai satu lookup dan satu bulk insert', async () => {
  let findCalls = 0;
  let createCalls = 0;
  let inserted = [];
  const prisma = {
    appNotification: {
      findMany: async () => {
        findCalls += 1;
        return [{ recipientUserId: 1, title: 'Moderasi', entityType: 'PeerReport', entityId: '9' }];
      },
      createMany: async ({ data }) => {
        createCalls += 1;
        inserted = data;
        return { count: data.length };
      },
    },
  };
  const service = new AppNotificationService(prisma);
  const base = {
    title: 'Moderasi',
    body: 'Perlu ditinjau',
    entityType: 'PeerReport',
    entityId: '9',
  };

  const result = await service.createManyOnce([
    { ...base, recipientUserId: 1 },
    { ...base, recipientUserId: 2 },
    { ...base, recipientUserId: 2 },
  ]);

  assert.deepEqual(result, { created: 1, skipped: 1 });
  assert.equal(findCalls, 1);
  assert.equal(createCalls, 1);
  assert.deepEqual(inserted.map((row) => row.recipientUserId), [2]);
});

test('journal operasional melempar error untuk skip dan jurnal tidak balance', async () => {
  const service = new AccountingPostingService({});
  service.logger.error = () => undefined;
  assert.throws(
    () => service.skip('INVOICE', 12, 'COA belum tersedia'),
    /Gagal mencatat jurnal otomatis/,
  );
  await assert.rejects(
    service.postBalancedJournalTx(
      { journalEntry: { findFirst: async () => null } },
      {
        sourceType: 'INVOICE',
        sourceId: '12',
        entryDate: new Date(),
        memo: 'test',
        lines: [{ chartOfAccountId: 1, debitRupiah: 100 }],
      },
    ),
    /Journal line kurang dari 2/,
  );
});

test('OS-01 — WiFi sale dan journal menggunakan tx yang sama serta gagal bersama', async () => {
  let persisted = false;
  let auditCalled = false;
  const tx = {
    wifiSale: {
      create: async () => {
        persisted = true;
        return { id: 44 };
      },
    },
  };
  const prisma = {
    $transaction: async (callback) => {
      try {
        return await callback(tx);
      } catch (error) {
        persisted = false;
        throw error;
      }
    },
  };
  const accounting = {
    postWifiSaleTx: async (receivedTx) => {
      assert.equal(receivedTx, tx);
      throw new Error('journal gagal');
    },
  };
  const service = new WifiSalesService(
    prisma,
    { log: async () => { auditCalled = true; } },
    accounting,
  );

  await assert.rejects(
    service.create({ saleDate: '2026-07-30' }, { id: 8 }),
    /journal gagal/,
  );
  assert.equal(persisted, false);
  assert.equal(auditCalled, false);
});
