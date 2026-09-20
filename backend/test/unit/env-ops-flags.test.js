const assert = require('node:assert/strict');
const test = require('node:test');

// EF-07 — precedence env > DB (AutoOps) dan default IoT polling OFF.
// Dibangun dari dist (pola sama dengan audit-hardening-regression.test.js);
// TIDAK menyentuh DB/server; timer yang dibuat selalu dibersihkan dengan onModuleDestroy().
const { AutoOpsService } = require('../../dist/modules/auto-ops/auto-ops.service.js');
const { IotPollingService } = require('../../dist/modules/iot/iot-polling.service.js');

const ENV_KEYS = ['AUTO_OPS_ENABLED', 'IOT_TUYA_POLL_ENABLED', 'IOT_TUYA_POLL_MINUTES'];

async function withEnv(overrides, fn) {
  const saved = new Map();
  for (const key of [...ENV_KEYS, ...Object.keys(overrides)]) saved.set(key, process.env[key]);
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return await fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function makeAutoOps(dbValue) {
  const prisma = {
    operationalSetting: { findUnique: async () => ({ autoOpsEnabled: dbValue }) },
  };
  const svc = new AutoOpsService(prisma, null, null, null, null, null, null, null);
  return { svc };
}

test('EF-07 — AUTO_OPS_ENABLED=false menang atas DB true (precedence env untuk shared hosting)', async () => {
  await withEnv({ AUTO_OPS_ENABLED: 'false' }, async () => {
    const { svc } = makeAutoOps(true);
    try {
      await svc.onModuleInit();
      assert.equal(svc.timer, null, 'env=false tidak boleh membuat timer');
    } finally {
      await svc.onModuleDestroy();
    }
  });
});

test('EF-07 — varian false (0/no/off) mematikan AutoOps', async () => {
  for (const raw of ['0', 'no', 'off', 'OFF', 'N']) {
    await withEnv({ AUTO_OPS_ENABLED: raw }, async () => {
      const { svc } = makeAutoOps(true);
      try {
        await svc.onModuleInit();
        assert.equal(svc.timer, null, `env=${raw} tidak boleh membuat timer`);
      } finally {
        await svc.onModuleDestroy();
      }
    });
  }
});

test('EF-07 — tanpa override env, DB=false mematikan AutoOps', async () => {
  await withEnv({}, async () => {
    const { svc } = makeAutoOps(false);
    try {
      await svc.onModuleInit();
      assert.equal(svc.timer, null, 'DB=false tanpa override wajib tetap off');
    } finally {
      await svc.onModuleDestroy();
    }
  });
});

test('EF-07 — tanpa override env, DB=true mengaktifkan AutoOps (timer lalu dibersihkan)', async () => {
  await withEnv({}, async () => {
    const { svc } = makeAutoOps(true);
    try {
      await svc.onModuleInit();
      assert.ok(svc.timer !== null, 'tanpa override AutoOps ikuti DB=true');
    } finally {
      await svc.onModuleDestroy();
      assert.equal(svc.timer, null, 'onModuleDestroy wajib clearInterval');
    }
  });
});

test('EF-07 — DB error → fallback default true (timer aktif, lalu dibersihkan)', async () => {
  const prisma = {
    operationalSetting: { findUnique: async () => { throw new Error('koneksi belum siap'); } },
  };
  const svc = new AutoOpsService(prisma, null, null, null, null, null, null, null);
  try {
    await svc.onModuleInit();
    assert.ok(svc.timer !== null, 'fallback default = true ketika DB tidak tersedia');
  } finally {
    await svc.onModuleDestroy();
  }
});

test('EF-07 — IOT_TUYA_POLL_ENABLED default OFF (tanpa cron Tuya dalam proses)', async () => {
  const iot = { syncAllTuya: async () => ({ succeeded: 0, total: 0 }) };
  const svc = new IotPollingService(iot);
  await withEnv({}, async () => {
    try {
      await svc.onModuleInit();
      assert.equal(svc.timer, null, 'polling IoT default wajib off');
    } finally {
      await svc.onModuleDestroy();
    }
  });
});

test('EF-07 — IOT_TUYA_POLL_ENABLED=true mengaktifkan polling (timer lalu dibersihkan)', async () => {
  const iot = { syncAllTuya: async () => ({ succeeded: 0, total: 0 }) };
  const svc = new IotPollingService(iot);
  await withEnv({ IOT_TUYA_POLL_ENABLED: 'true' }, async () => {
    try {
      await svc.onModuleInit();
      assert.ok(svc.timer !== null, 'env=true wajib mengaktifkan polling');
    } finally {
      await svc.onModuleDestroy();
      assert.equal(svc.timer, null, 'onModuleDestroy wajib clearInterval');
    }
  });
});

test('EF-07 — IOT_TUYA_POLL_ENABLED=0 mematikan polling meski key tersedia', async () => {
  const iot = { syncAllTuya: async () => ({ succeeded: 0, total: 0 }) };
  const svc = new IotPollingService(iot);
  await withEnv({ IOT_TUYA_POLL_ENABLED: '0' }, async () => {
    try {
      await svc.onModuleInit();
      assert.equal(svc.timer, null, 'env=0 wajib tetap off');
    } finally {
      await svc.onModuleDestroy();
    }
  });
});