const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createTuyaSignature,
} = require('../../dist/modules/iot/tuya/tuya-client.service.js');
const {
  normalizeTuyaStatus,
  tuyaObservedAt,
} = require('../../dist/modules/iot/tuya/tuya-normalizer.js');
const {
  createWaterIngestSignature,
} = require('../../dist/modules/iot/water-ingest.service.js');

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

test('normalisasi menandai nilai numerik tanpa scale sebagai SUSPECT', () => {
  const [metric] = normalizeTuyaStatus([{ code: 'unknown_number', value: 48 }], { status: [] });
  assert.equal(metric.metric, 'tuya.unknown_number');
  assert.equal(metric.valueDecimal, 48);
  assert.equal(metric.quality, 'SUSPECT');
  assert.match(metric.reason, /scale/);
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
