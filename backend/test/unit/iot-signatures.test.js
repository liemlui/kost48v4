const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createTuyaSignature,
  TuyaClientService,
} = require('../../dist/modules/iot/tuya/tuya-client.service.js');
const {
  normalizeTuyaStatus,
  tuyaObservedAt,
} = require('../../dist/modules/iot/tuya/tuya-normalizer.js');
const {
  createWaterIngestSignature,
  parseWaterObservedAt,
} = require('../../dist/modules/iot/water-ingest.service.js');
const {
  resolveIotStaleAfterMinutes,
  resolveTenantElectricityUsage,
} = require('../../dist/modules/iot/iot.service.js');

test('Tuya signature memakai canonical HMAC-SHA256 uppercase yang stabil', () => {
  const signature = createTuyaSignature({
    clientId: 'client-test',
    secret: 'secret-test',
    accessToken: 'token-test',
    timestamp: '1720000000000',
    nonce: 'nonce123',
    method: 'GET',
    pathWithQuery: '/v1.0/iot-03/devices/device/status',
  });

  assert.equal(signature, '945AD3A006EA8989DDB4E78246C3A87EDF0E7DB683A41039755C07A62A583034');
});

test('snapshot Tuya menggabungkan token paralel dan memakai cache specification', async () => {
  const originalFetch = global.fetch;
  const paths = [];
  global.fetch = async (input) => {
    const url = new URL(String(input));
    const path = `${url.pathname}${url.search}`;
    paths.push(path);
    let result;
    if (path === '/v1.0/token?grant_type=1') {
      result = { access_token: 'test-token', expire_time: 7200 };
    } else if (path.endsWith('/status')) {
      result = [{ code: 'add_ele', value: 123, t: 1_720_000_000 }];
    } else if (path.endsWith('/specification')) {
      result = { status: [{ code: 'add_ele', type: 'Integer', values: '{"unit":"kWh","scale":1}' }] };
    } else {
      result = { id: 'device-1', online: true };
    }
    return { ok: true, json: async () => ({ success: true, result }) };
  };

  try {
    const config = {
      get(key) {
        return {
          TUYA_CLIENT_ID: 'client-test',
          TUYA_CLIENT_SECRET: 'secret-test',
          TUYA_API_BASE: 'https://openapi.tuyaus.com',
        }[key];
      },
    };
    const client = new TuyaClientService(config);
    await Promise.all([
      client.getDeviceSnapshot('device-1'),
      client.getDeviceSnapshot('device-1'),
    ]);

    assert.equal(paths.filter((path) => path === '/v1.0/token?grant_type=1').length, 1);
    assert.equal(paths.filter((path) => path.endsWith('/specification')).length, 1);
    assert.equal(paths.filter((path) => path.endsWith('/status')).length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('normalisasi Tuya menerapkan scale specification pada KWH dan daya', () => {
  const metrics = normalizeTuyaStatus(
    [
      { code: 'add_ele', value: 12345, t: 1_720_000_000 },
      { code: 'cur_power', value: 678, t: 1_720_000_001 },
    ],
    {
      status: [
        { code: 'add_ele', type: 'Integer', values: JSON.stringify({ unit: 'kWh', scale: 3 }) },
        { code: 'cur_power', type: 'Integer', values: JSON.stringify({ unit: 'W', scale: 1 }) },
      ],
    },
  );

  assert.deepEqual(metrics.map((item) => [item.metric, item.valueDecimal, item.unit, item.quality]), [
    ['electricity.energy_total_kwh', 12.345, 'kWh', 'GOOD'],
    ['electricity.power_w', 67.8, 'W', 'GOOD'],
  ]);
  assert.equal(tuyaObservedAt([{ t: 1_720_000_001 }]).toISOString(), '2024-07-03T09:46:41.000Z');
});

test('normalisasi mengabaikan datapoint Tuya yang tidak dipakai aplikasi', () => {
  const metrics = normalizeTuyaStatus([{ code: 'unknown_number', value: 48 }], { status: [] });
  assert.deepEqual(metrics, []);
});

test('timestamp Tuya masa depan tidak boleh memperpanjang status fresh', () => {
  const fallback = new Date('2026-07-28T10:00:00.000Z');
  assert.equal(
    tuyaObservedAt([{ t: Date.parse('2026-07-28T11:00:00.000Z') }], fallback).toISOString(),
    fallback.toISOString(),
  );
});

test('water ingest signature mengikat device, waktu, nonce, dan raw body', () => {
  const signature = createWaterIngestSignature('water-secret', {
    deviceCode: 'water-01',
    timestamp: '1720000000',
    nonce: 'nonce-12345678',
    rawBody: Buffer.from('{"volumeTotalLiters":12.5}'),
  });

  assert.equal(signature, '371c3cd44b83c497899297416c01bfa91ffecef4bf22f27ac7ec98f75d8a9b8a');
});

test('water ingest menerima buffer lama tetapi menolak observedAt masa depan', () => {
  const now = Date.parse('2026-07-28T10:00:00.000Z');
  assert.equal(
    parseWaterObservedAt('2026-07-20T10:00:00.000Z', now).toISOString(),
    '2026-07-20T10:00:00.000Z',
  );
  assert.throws(
    () => parseWaterObservedAt('2026-07-28T10:05:00.001Z', now),
    /masa depan/,
  );
});

test('batas stale IoT selalu finite dan aman', () => {
  assert.equal(resolveIotStaleAfterMinutes(undefined), 30);
  assert.equal(resolveIotStaleAfterMinutes('not-a-number'), 30);
  assert.equal(resolveIotStaleAfterMinutes('0'), 1);
  assert.equal(resolveIotStaleAfterMinutes('99999'), 1440);
});

test('meter terverifikasi selalu mengalahkan estimasi telemetry untuk periode tagihan', () => {
  assert.deepEqual(resolveTenantElectricityUsage(12, 14), {
    source: 'METER_READING',
    usageKwh: 12,
    usableMeter: 12,
    usableTelemetry: 14,
    billingReady: true,
    resetDetected: false,
  });

  assert.deepEqual(resolveTenantElectricityUsage(null, 14), {
    source: 'IOT_TELEMETRY',
    usageKwh: 14,
    usableMeter: null,
    usableTelemetry: 14,
    billingReady: false,
    resetDetected: false,
  });
});

test('counter yang reset tidak dipakai sebagai konsumsi negatif', () => {
  assert.deepEqual(resolveTenantElectricityUsage(-2, -1), {
    source: 'NONE',
    usageKwh: null,
    usableMeter: null,
    usableTelemetry: null,
    billingReady: false,
    resetDetected: true,
  });
});
