'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_AI_PRICING,
  AI_PRICING_MODEL_KEYS,
  normalizeAiModelKey,
  isAiPeakUtc,
  validateAiPricing,
  parseAiPricingJson,
  estimateAiCostUsd,
  buildAiUsageAuditMeta,
  extractPricingPageExcerpt,
} = require('../../dist/modules/owner-ai/ai-pricing.js');

test('AI pricing — tabel default berasal dari tabel resmi owner', () => {
  assert.deepEqual(AI_PRICING_MODEL_KEYS, ['deepseek-flash', 'deepseek-v4-pro']);
  assert.deepEqual(DEFAULT_AI_PRICING.models['deepseek-flash'], {
    cacheHitInputUsdPer1M: { offPeak: 0.003, peak: 0.006 },
    cacheMissInputUsdPer1M: { offPeak: 0.15, peak: 0.3 },
    outputUsdPer1M: { offPeak: 0.6, peak: 1.2 },
  });
  assert.deepEqual(DEFAULT_AI_PRICING.models['deepseek-v4-pro'], {
    cacheHitInputUsdPer1M: { offPeak: 0.022, peak: 0.044 },
    cacheMissInputUsdPer1M: { offPeak: 0.66, peak: 1.32 },
    outputUsdPer1M: { offPeak: 1.98, peak: 3.96 },
  });
  assert.equal(DEFAULT_AI_PRICING.currency, 'USD');
});

test('AI pricing — alias model lama dinormalisasi', () => {
  assert.equal(normalizeAiModelKey('deepseek-v4-flash'), 'deepseek-flash');
  assert.equal(normalizeAiModelKey('deepseek-v4-flash-vision-exp'), 'deepseek-flash');
  assert.equal(normalizeAiModelKey('deepseek-v4-pro'), 'deepseek-v4-pro');
  assert.equal(normalizeAiModelKey('model-lain'), null);
  assert.equal(normalizeAiModelKey(null), null);
});

test('AI pricing — jam sibuk 01–04 & 06–10 UTC hari kerja', () => {
  assert.equal(isAiPeakUtc(new Date('2026-10-19T02:00:00.000Z')), true); // Senin
  assert.equal(isAiPeakUtc(new Date('2026-10-19T05:00:00.000Z')), false);
  assert.equal(isAiPeakUtc(new Date('2026-10-19T06:00:00.000Z')), true);
  assert.equal(isAiPeakUtc(new Date('2026-10-19T10:00:00.000Z')), false);
  assert.equal(isAiPeakUtc(new Date('2026-10-17T02:00:00.000Z')), false); // Sabtu
  assert.equal(isAiPeakUtc(new Date('2026-10-18T02:00:00.000Z')), false); // Minggu
});

test('AI pricing — validasi menolak bentuk/angka tidak sah', () => {
  const valid = validateAiPricing(JSON.parse(JSON.stringify(DEFAULT_AI_PRICING)));
  assert.ok(valid);
  assert.deepEqual(valid.models['deepseek-flash'], DEFAULT_AI_PRICING.models['deepseek-flash']);

  assert.equal(validateAiPricing(null), null);
  assert.equal(validateAiPricing({ models: {} }), null);

  const missingModel = JSON.parse(JSON.stringify(DEFAULT_AI_PRICING));
  delete missingModel.models['deepseek-v4-pro'];
  assert.equal(validateAiPricing(missingModel), null);

  const negative = JSON.parse(JSON.stringify(DEFAULT_AI_PRICING));
  negative.models['deepseek-flash'].outputUsdPer1M.offPeak = -1;
  assert.equal(validateAiPricing(negative), null);

  const peakLower = JSON.parse(JSON.stringify(DEFAULT_AI_PRICING));
  peakLower.models['deepseek-flash'].outputUsdPer1M.peak = 0.1;
  assert.equal(validateAiPricing(peakLower), null);
});

test('AI pricing — estimasi biaya off-peak vs peak (flash, 1M input miss + 1M output)', () => {
  const usage = { prompt_tokens: 1_000_000, completion_tokens: 1_000_000, total_tokens: 2_000_000 };
  const offPeak = estimateAiCostUsd({
    model: 'deepseek-v4-flash',
    usage,
    at: new Date('2026-10-19T05:00:00.000Z'),
  });
  assert.equal(offPeak.priced, true);
  assert.ok(Math.abs(offPeak.usd - 0.75) < 1e-12);

  const peak = estimateAiCostUsd({
    model: 'deepseek-flash',
    usage,
    at: new Date('2026-10-19T02:00:00.000Z'),
  });
  assert.equal(peak.priced, true);
  assert.ok(Math.abs(peak.usd - 1.5) < 1e-12);
});

test('AI pricing — cache hit memakai tarif cache hit, bukan cache miss', () => {
  const estimate = estimateAiCostUsd({
    model: 'deepseek-flash',
    usage: {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
      prompt_cache_hit_tokens: 1_000_000,
      prompt_cache_miss_tokens: 0,
    },
    at: new Date('2026-10-19T05:00:00.000Z'),
  });

  assert.equal(estimate.priced, true);
  assert.equal(estimate.cacheHitTokens, 1_000_000);
  assert.equal(estimate.cacheMissTokens, 0);
  assert.ok(Math.abs(estimate.usd - 0.603) < 1e-12);
});

test('AI pricing — model/usage tak dikenal tidak dihitung (bukan angka karangan)', () => {
  const unknownModel = estimateAiCostUsd({
    model: 'model-lain',
    usage: { prompt_tokens: 10, completion_tokens: 10 },
    at: new Date('2026-10-19T05:00:00.000Z'),
  });
  assert.equal(unknownModel.priced, false);
  assert.equal(unknownModel.usd, null);

  const noUsage = estimateAiCostUsd({
    model: 'deepseek-flash',
    usage: null,
    at: new Date('2026-10-19T05:00:00.000Z'),
  });
  assert.equal(noUsage.priced, false);
});

test('AI pricing — meta audit hanya berisi angka/fitur/model, tanpa secret', () => {
  const meta = buildAiUsageAuditMeta({
    feature: 'brief',
    model: 'deepseek-flash',
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
      prompt_cache_hit_tokens: 300,
      prompt_cache_miss_tokens: 700,
      secret: 'sk-jangan-disimpan',
      prompt: 'isi prompt rahasia',
    },
    at: new Date('2026-10-19T05:00:00.000Z'),
  });

  assert.equal(meta.ai.feature, 'brief');
  assert.equal(meta.ai.model, 'deepseek-flash');
  assert.equal(meta.ai.usage.total_tokens, 1200);
  assert.equal(typeof meta.ai.estimatedCostUsd, 'number');
  const serialized = JSON.stringify(meta);
  assert.equal(serialized.includes('sk-jangan-disimpan'), false);
  assert.equal(serialized.includes('isi prompt rahasia'), false);
});

test('AI pricing — parser JSON tahan pagar markdown dan teks sekitar', () => {
  assert.deepEqual(parseAiPricingJson('```json\n{"currency":"USD"}\n```'), { currency: 'USD' });
  assert.deepEqual(parseAiPricingJson('Berikut hasilnya: {"currency":"USD"} selesai'), { currency: 'USD' });
  assert.equal(parseAiPricingJson('bukan json'), null);
});

test('AI pricing — kutipan halaman resmi membuang tag dan memuat tabel', () => {
  const html = '<html><script>secret()</script><body><h1>Pricing</h1><p>deepseek-flash $0.15</p></body></html>';
  const excerpt = extractPricingPageExcerpt(html);
  assert.equal(excerpt.includes('<script>'), false);
  assert.equal(excerpt.includes('deepseek-flash'), true);
  assert.equal(excerpt.includes('$0.15'), true);
});
