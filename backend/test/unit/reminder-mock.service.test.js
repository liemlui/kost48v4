'use strict';

/**
 * Unit test: ReminderMockService — mock reminder preview
 *
 * Cakupan Y-I2:
 *   - mockSend: full success (audit + notification)
 *   - mockSend: invalid tenantId (NaN) → tetap sukses, tanpa notif
 *   - mockSend: tenant tanpa portal user → notif skip, tetap sukses
 *   - mockSend: notifikasi gagal → audit log error, mock tetap sukses
 *   - getTitleForType: tiap jenis reminder punya title sesuai
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { MockReminderType } = require('../../dist/modules/notifications/dto/mock-send.dto.js');
const { ReminderMockService } = require('../../dist/modules/notifications/reminder-mock.service.js');

// ── Helper ─────────────────────────────────────────────────────────────────
function makeSvc(overrides = {}) {
  const auditLogCalls = [];
  const appNotifCalls = [];

  const audit = {
    log: async (input) => {
      auditLogCalls.push(input);
      return { id: auditLogCalls.length };
    },
  };

  const prisma = {
    user: {
      findUnique: async ({ where }) => {
        if (where.tenantId === 7) return { id: 42 };
        return null;
      },
    },
    ...(overrides.prisma || {}),
  };

  // AppNotificationService.create takes plain input (not wrapped in {data})
  const appNotification = {
    create: async (input) => {
      appNotifCalls.push(input);
      return { id: appNotifCalls.length + 100 };
    },
    ...(overrides.appNotification || {}),
  };

  const svc = new ReminderMockService(audit, prisma, appNotification);

  // Expose call capture for assertions
  svc._auditLogCalls = auditLogCalls;
  svc._appNotifCalls = appNotifCalls;

  return svc;
}

const BASE_INPUT = {
  type: MockReminderType.INVOICE_DUE,
  candidateId: '7',
  phone: '08123456789',
  message: 'Tagihan bulan Juli sebesar Rp 1.500.000 akan jatuh tempo 3 hari lagi.',
  actorUserId: 1,
};

// ════════════════════════════════════════════════════════════════════════════
// mockSend — success path
// ════════════════════════════════════════════════════════════════════════════

test('Y-I2.1: mockSend — full success, audit log + notifikasi tenant', async () => {
  const svc = makeSvc();
  const result = await svc.mockSend(BASE_INPUT);

  // Hasil
  assert.strictEqual(result.mock, true);
  assert.strictEqual(result.status, 'MOCK_SENT');
  assert.strictEqual(result.type, MockReminderType.INVOICE_DUE);
  assert.strictEqual(result.candidateId, '7');
  assert.strictEqual(result.phone, '628123456789'); // normalizePhone: 0→62
  assert.strictEqual(result.messagePreview, BASE_INPUT.message);
  assert.ok(result.sentAt);

  // Audit log terisi
  assert.strictEqual(svc._auditLogCalls.length, 1);
  assert.strictEqual(svc._auditLogCalls[0].action, 'REMINDER_MOCK_SEND');
  assert.strictEqual(svc._auditLogCalls[0].entityType, 'REMINDER_INVOICE_DUE');
  assert.strictEqual(svc._auditLogCalls[0].entityId, '7');
  assert.strictEqual(svc._auditLogCalls[0].actorUserId, 1);

  // App notification terkirim
  assert.strictEqual(svc._appNotifCalls.length, 1);
  assert.strictEqual(svc._appNotifCalls[0].recipientUserId, 42); // user id dari tenant 7
  assert.strictEqual(svc._appNotifCalls[0].title, 'Tagihan akan jatuh tempo');
  assert.strictEqual(svc._appNotifCalls[0].body, BASE_INPUT.message);
  assert.strictEqual(svc._appNotifCalls[0].entityType, 'REMINDER_INVOICE_DUE');
  assert.strictEqual(svc._appNotifCalls[0].entityId, '7');
});

// ════════════════════════════════════════════════════════════════════════════
// mockSend — invalid tenantId
// ════════════════════════════════════════════════════════════════════════════

test('Y-I2.2: mockSend — invalid tenantId (NaN), notifikasi skip', async () => {
  const svc = makeSvc();
  const input = { ...BASE_INPUT, candidateId: 'bukan-angka' };
  const result = await svc.mockSend(input);

  assert.strictEqual(result.mock, true);
  assert.strictEqual(result.status, 'MOCK_SENT');
  // Tidak ada notifikasi — tapi audit tetap ada
  assert.strictEqual(svc._auditLogCalls.length, 1);
  assert.strictEqual(svc._appNotifCalls.length, 0); // tidak ada createNotification → skip
});

// ════════════════════════════════════════════════════════════════════════════
// mockSend — tenant tanpa portal user
// ════════════════════════════════════════════════════════════════════════════

test('Y-I2.3: mockSend — tenant tanpa portal user, notifikasi skip graceful', async () => {
  const svc = makeSvc();
  const input = { ...BASE_INPUT, candidateId: '999' }; // tenant 999 tidak punya user
  const result = await svc.mockSend(input);

  assert.strictEqual(result.mock, true);
  assert.strictEqual(result.status, 'MOCK_SENT');
  assert.strictEqual(svc._auditLogCalls.length, 1);
  assert.strictEqual(svc._appNotifCalls.length, 0); // prisma.user.findUnique return null → skip
});

// ════════════════════════════════════════════════════════════════════════════
// mockSend — notifikasi gagal, tetap sukses
// ════════════════════════════════════════════════════════════════════════════

test('Y-I2.4: mockSend — notifikasi create gagal, mock tetap sukses + audit error', async () => {
  const svc = makeSvc({
    appNotification: {
      create: async () => { throw new Error('DB timeout'); },
    },
  });
  const result = await svc.mockSend(BASE_INPUT);

  // Mock tetap sukses
  assert.strictEqual(result.mock, true);
  assert.strictEqual(result.status, 'MOCK_SENT');

  // Audit log: REMINDER_MOCK_SEND + APP_NOTIFICATION_CREATE_FAILED
  assert.strictEqual(svc._auditLogCalls.length, 2);
  assert.strictEqual(svc._auditLogCalls[0].action, 'REMINDER_MOCK_SEND');
  const failLog = svc._auditLogCalls[1];
  assert.strictEqual(failLog.action, 'APP_NOTIFICATION_CREATE_FAILED');
  assert.strictEqual(failLog.entityType, 'REMINDER_INVOICE_DUE');
  assert.ok(failLog.meta.error);
  assert.ok(failLog.meta.error.includes('DB timeout'));
  assert.ok(failLog.meta.stack);
  assert.ok(failLog.meta.stack.includes('DB timeout'));
});

// ════════════════════════════════════════════════════════════════════════════
// getTitleForType — tiap jenis reminder punya title sesuai
// ════════════════════════════════════════════════════════════════════════════

test('Y-I2.5: getTitleForType — semua jenis reminder punya title', async () => {
  const types = [
    { type: MockReminderType.BOOKING_EXPIRY, expectedTitle: 'Booking hampir kadaluarsa' },
    { type: MockReminderType.INVOICE_DUE, expectedTitle: 'Tagihan akan jatuh tempo' },
    { type: MockReminderType.INVOICE_OVERDUE, expectedTitle: 'Tagihan terlambat' },
    { type: MockReminderType.CHECKOUT, expectedTitle: 'Checkout mendekat' },
  ];

  for (const { type, expectedTitle } of types) {
    const svc = makeSvc();
    await svc.mockSend({ ...BASE_INPUT, type, candidateId: '7' });

    assert.strictEqual(
      svc._appNotifCalls[0].title,
      expectedTitle,
      `type ${type} → title "${expectedTitle}"`,
    );
  }
});
