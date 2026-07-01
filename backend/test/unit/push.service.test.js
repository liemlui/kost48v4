'use strict';

/**
 * Unit test: PushService — web-push VAPID, subscription management, dispatch pending
 *
 * Cakupan Y-I3:
 *   - onModuleInit: VAPID configured / missing / invalid key
 *   - isConfigured, getVapidPublicKey
 *   - subscribe: create & update (upsert)
 *   - unsubscribe: deactivate subscription
 *   - dispatchPending: skip when VAPID not configured
 *   - dispatchPending: no pending notifications (0 processed)
 *   - dispatchPending: no active devices → SENT, noDevice=1
 *   - dispatchPending: send success → SENT
 *   - dispatchPending: endpoint 404/410 → subscription deactivated
 *   - dispatchPending: repeated failures → FAILED after MAX_ATTEMPTS
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');

// ── Mock web-push BEFORE loading push.service ─────────────────────────────
// Node module cache: require() mengembalikan objek yang sama, jadi override
// method sebelum service di-load agar tidak benar-benar kirim push.
const wpMock = require('web-push');

// State kontrol mock (module-level)
let _vapidConfigThrow = false;
let _sendResults = [];
let _sendIndex = 0;

function resetWpMocks() {
  _vapidConfigThrow = false;
  _sendResults = [];
  _sendIndex = 0;
  wpMock.setVapidDetails = (_subject, _publicKey, _privateKey) => {
    if (_vapidConfigThrow) throw new Error('Simulated VAPID config error');
  };
  wpMock.sendNotification = async (_subscription, _payload) => {
    const err = _sendResults[_sendIndex++];
    if (err) {
      const e = new Error(err.message);
      e.statusCode = err.statusCode;
      throw e;
    }
  };
}

resetWpMocks();

const { PushService } = require('../../dist/modules/push/push.service.js');

// ── Helper: create PushService with custom prisma mock ────────────────────
function makeSvc(prismaMock = null) {
  // Default mock (digunakan jika prismaMock tidak diberikan)
  const dflt = {
    pushSubscription: {
      upsert: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 1, endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1', lastUsedAt: null },
      ],
      update: async ({ where, data }) => ({ id: where.id, ...data }),
    },
    appNotification: {
      findMany: async () => [],
      update: async ({ where, data }) => ({ id: where.id, ...data }),
    },
  };

  return new PushService(prismaMock || dflt);
}

/**
 * Setup helper: set VAPID env, buat service dengan prisma mock,
 * panggil onModuleInit, jalankan fn, cleanup env.
 * 
 * @param {string|null} pubKey - VAPID_PUBLIC_KEY atau null untuk skip
 * @param {string|null} privKey - VAPID_PRIVATE_KEY atau null untuk skip
 * @param {object|null} prismaMock - Prisma mock lengkap (default dipakai jika null)
 * @param {function} fn - async (svc) => void
 */
async function withVapidConfig(pubKey, privKey, prismaMock, fn) {
  // Support 3-arg signature: prismaMock opsional
  if (typeof prismaMock === 'function') {
    fn = prismaMock;
    prismaMock = null;
  }
  const prevPub = process.env.VAPID_PUBLIC_KEY;
  const prevPriv = process.env.VAPID_PRIVATE_KEY;
  const prevSubj = process.env.VAPID_SUBJECT;

  try {
    if (pubKey) process.env.VAPID_PUBLIC_KEY = pubKey;
    if (privKey) process.env.VAPID_PRIVATE_KEY = privKey;
    process.env.VAPID_SUBJECT = 'mailto:admin@kost48.test';

    const svc = makeSvc(prismaMock);
    svc.onModuleInit();
    await fn(svc);
  } finally {
    if (prevPub !== undefined) process.env.VAPID_PUBLIC_KEY = prevPub;
    else delete process.env.VAPID_PUBLIC_KEY;
    if (prevPriv !== undefined) process.env.VAPID_PRIVATE_KEY = prevPriv;
    else delete process.env.VAPID_PRIVATE_KEY;
    if (prevSubj !== undefined) process.env.VAPID_SUBJECT = prevSubj;
    else delete process.env.VAPID_SUBJECT;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// onModuleInit + isConfigured + getVapidPublicKey
// ════════════════════════════════════════════════════════════════════════════

test('Y-I3.1: onModuleInit — VAPID configured', () => {
  resetWpMocks();
  return withVapidConfig('test-public-key', 'test-private-key', async (svc) => {
    assert.strictEqual(svc.isConfigured(), true);
    assert.strictEqual(svc.getVapidPublicKey(), 'test-public-key');
  });
});

test('Y-I3.2: onModuleInit — VAPID missing', () => {
  resetWpMocks();
  return withVapidConfig(null, null, async (svc) => {
    assert.strictEqual(svc.isConfigured(), false);
    assert.strictEqual(svc.getVapidPublicKey(), null);
  });
});

test('Y-I3.3: onModuleInit — VAPID invalid key', () => {
  resetWpMocks();
  _vapidConfigThrow = true; // Set AFTER resetWpMocks
  return withVapidConfig('bad', 'bad', async (svc) => {
    assert.strictEqual(svc.isConfigured(), false);
    assert.strictEqual(svc.getVapidPublicKey(), null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// subscribe
// ════════════════════════════════════════════════════════════════════════════

test('Y-I3.4: subscribe — creates subscription (upsert create)', async () => {
  let capturedCreate = null;
  const svc = makeSvc({
    pushSubscription: {
      upsert: async ({ where, create, update, select }) => {
        capturedCreate = create;
        return { id: 123 };
      },
    },
  });

  const dto = {
    endpoint: 'https://fcm.example.com/abc123',
    keys: { p256dh: 'key-p256dh', auth: 'key-auth' },
    userAgent: 'Mozilla/5.0 TestBrowser',
  };

  const result = await svc.subscribe(42, dto);

  assert.deepStrictEqual(result, { id: 123 });
  assert.strictEqual(capturedCreate.userId, 42);
  assert.strictEqual(capturedCreate.endpoint, 'https://fcm.example.com/abc123');
  assert.strictEqual(capturedCreate.p256dh, 'key-p256dh');
  assert.strictEqual(capturedCreate.auth, 'key-auth');
  assert.strictEqual(capturedCreate.userAgent, 'Mozilla/5.0 TestBrowser');
  assert.strictEqual(capturedCreate.isActive, true);
  assert.ok(capturedCreate.lastUsedAt);
});

test('Y-I3.5: subscribe — updates existing subscription (upsert update)', async () => {
  let capturedUpdate = null;
  const svc = makeSvc({
    pushSubscription: {
      upsert: async ({ where, create, update, select }) => {
        capturedUpdate = update;
        return { id: 1 };
      },
    },
  });

  const dto = {
    endpoint: 'https://fcm.example.com/abc123',
    keys: { p256dh: 'new-key', auth: 'new-auth' },
    userAgent: 'Mozilla/5.0 Updated',
  };

  const result = await svc.subscribe(99, dto);

  assert.deepStrictEqual(result, { id: 1 });
  assert.strictEqual(capturedUpdate.userId, 99);
  assert.strictEqual(capturedUpdate.p256dh, 'new-key');
  assert.strictEqual(capturedUpdate.auth, 'new-auth');
  assert.strictEqual(capturedUpdate.isActive, true);
});

// ════════════════════════════════════════════════════════════════════════════
// unsubscribe
// ════════════════════════════════════════════════════════════════════════════

test('Y-I3.6: unsubscribe — deactivates subscription', async () => {
  const svc = makeSvc();
  const result = await svc.unsubscribe(42, 'https://push.example.com/ep1');
  assert.deepStrictEqual(result, { affected: 1 });
});

test('Y-I3.7: unsubscribe — endpoint not found (affected=0)', async () => {
  const svc = makeSvc({
    pushSubscription: {
      updateMany: async () => ({ count: 0 }),
    },
  });
  const result = await svc.unsubscribe(42, 'unknown-endpoint');
  assert.deepStrictEqual(result, { affected: 0 });
});

// ════════════════════════════════════════════════════════════════════════════
// dispatchPending
// ════════════════════════════════════════════════════════════════════════════

test('Y-I3.8: dispatchPending — skip when VAPID not configured', () => {
  resetWpMocks();
  return withVapidConfig(null, null, async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.deepStrictEqual(result, {
      skipped: true,
      skippedReason: 'VAPID_NOT_CONFIGURED',
      processed: 0,
      sent: 0,
      failed: 0,
      noDevice: 0,
      deactivated: 0,
    });
  });
});

test('Y-I3.9: dispatchPending — no pending notifications', () => {
  resetWpMocks();
  return withVapidConfig('pk', 'sk', async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.strictEqual(result.skipped, false);
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.noDevice, 0);
    assert.strictEqual(result.deactivated, 0);
  });
});

test('Y-I3.10: dispatchPending — no active subscriptions → SENT + noDevice', () => {
  resetWpMocks();
  let updatedNotif = null;

  return withVapidConfig('pk', 'sk', {
    pushSubscription: {
      upsert: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [],           // no active device
      update: async () => {},
    },
    appNotification: {
      findMany: async () => [
        { id: 1, recipientUserId: 42, title: 'Test', body: 'Body', pushAttempts: 0, pushStatus: 'PENDING' },
      ],
      update: async ({ where, data }) => {
        updatedNotif = { id: where.id, ...data };
        return updatedNotif;
      },
    },
  }, async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.strictEqual(result.skipped, false);
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.sent, 0);       // no device → skip push → sent=0
    assert.strictEqual(result.noDevice, 1);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.deactivated, 0);

    assert.strictEqual(updatedNotif.pushStatus, 'SENT');
    assert.ok(updatedNotif.pushedAt);
  });
});

test('Y-I3.11: dispatchPending — send success → SENT', () => {
  resetWpMocks();
  _sendResults = [null]; // first call succeeds
  let updatedNotif = null;

  return withVapidConfig('pk', 'sk', {
    pushSubscription: {
      upsert: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 5, endpoint: 'https://fcm.example.com/dev1', p256dh: 'pk1', auth: 'a1' },
      ],
      update: async () => {},
    },
    appNotification: {
      findMany: async () => [
        { id: 10, recipientUserId: 7, title: 'Test Push', body: 'Hello', pushAttempts: 0, pushStatus: 'PENDING' },
      ],
      update: async ({ where, data }) => {
        updatedNotif = { id: where.id, ...data };
        return updatedNotif;
      },
    },
  }, async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.strictEqual(result.skipped, false);
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.sent, 1);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.noDevice, 0);
    assert.strictEqual(result.deactivated, 0);

    assert.strictEqual(updatedNotif.pushStatus, 'SENT');
    assert.strictEqual(updatedNotif.pushAttempts, 1);
    assert.ok(updatedNotif.pushedAt);
  });
});

test('Y-I3.12: dispatchPending — endpoint 404 → subscription deactivated', () => {
  resetWpMocks();
  _sendResults = [{ message: 'Gone', statusCode: 410 }];
  let deactivatedSub = null;
  let updatedNotif = null;

  return withVapidConfig('pk', 'sk', {
    pushSubscription: {
      upsert: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 8, endpoint: 'https://fcm.example.com/dead', p256dh: 'pk', auth: 'a' },
      ],
      update: async ({ where, data }) => {
        deactivatedSub = { where, data };
        return { id: 8, ...data };
      },
    },
    appNotification: {
      findMany: async () => [
        { id: 20, recipientUserId: 7, title: 'Test 404', body: 'Body', pushAttempts: 0, pushStatus: 'PENDING' },
      ],
      update: async ({ where, data }) => {
        updatedNotif = { id: where.id, ...data };
        return updatedNotif;
      },
    },
  }, async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.deactivated, 1);
    assert.strictEqual(result.sent, 0);      // no successful send

    assert.deepStrictEqual(deactivatedSub, {
      where: { id: 8 },
      data: { isActive: false },
    });
  });
});

test('Y-I3.13: dispatchPending — repeated failures → FAILED after MAX_ATTEMPTS', () => {
  resetWpMocks();
  // pushAttempts starts at 2; after this dispatch → increments to 3 = MAX_ATTEMPTS → FAILED
  _sendResults = [{ message: 'Timeout', statusCode: 500 }];
  let updates = [];

  return withVapidConfig('pk', 'sk', {
    pushSubscription: {
      upsert: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: 10, endpoint: 'https://fcm.example.com/flaky', p256dh: 'pk', auth: 'a' },
      ],
      update: async () => {},
    },
    appNotification: {
      findMany: async () => [
        { id: 30, recipientUserId: 7, title: 'Retry', body: 'Retry body', pushAttempts: 2, pushStatus: 'PENDING' },
      ],
      update: async ({ where, data }) => {
        updates.push({ id: where.id, ...data });
        return { id: where.id, ...data };
      },
    },
  }, async (svc) => {
    const result = await svc.dispatchPending(100);
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.sent, 0);

    const lastUpdate = updates[updates.length - 1];
    assert.strictEqual(lastUpdate.pushStatus, 'FAILED');
    assert.strictEqual(lastUpdate.pushAttempts, 3);
  });
});
