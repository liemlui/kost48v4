const test = require('node:test');
const assert = require('node:assert');
const { AppNotificationService } = require('../../dist/modules/notifications/app-notification.service.js');

const input = {
  recipientUserId: 7,
  title: 'Bukti Pembayaran Baru',
  body: 'Tenant mengirim bukti pembayaran.',
  linkTo: '/payment-submissions/review',
  entityType: 'PaymentSubmission',
  entityId: '42',
};

test('createOnce tidak membuat notifikasi duplikat', async () => {
  let createCalls = 0;
  const service = new AppNotificationService({
    appNotification: {
      findFirst: async () => ({ id: 99 }),
      create: async () => {
        createCalls += 1;
        return { id: 100 };
      },
    },
  });

  const result = await service.createOnce(input);

  assert.deepStrictEqual(result, { created: false, notificationId: 99 });
  assert.strictEqual(createCalls, 0);
});

test('createOnce membuat notifikasi ketika dedupe belum ada', async () => {
  let createdData = null;
  const service = new AppNotificationService({
    appNotification: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdData = data;
        return { id: 101 };
      },
    },
  });

  const result = await service.createOnce(input);

  assert.deepStrictEqual(result, { created: true, notificationId: 101 });
  assert.deepStrictEqual(createdData, {
    recipientUserId: 7,
    title: 'Bukti Pembayaran Baru',
    body: 'Tenant mengirim bukti pembayaran.',
    linkTo: '/payment-submissions/review',
    entityType: 'PaymentSubmission',
    entityId: '42',
    // F4-2: setiap notifikasi in-app diantre untuk Web Push (outbox in-place).
    pushStatus: 'PENDING',
  });
});
