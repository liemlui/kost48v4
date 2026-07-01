'use strict';

/**
 * Unit test: MarketAnalysisService — SWOT/PESTLE/COMPETITOR, CAC/CLV, chat
 *
 * Cakupan:
 *   - configured: status API key
 *   - businessSnapshot: agregat kamar, hunian, survei
 *   - demographicsSnapshot: agregat tenant anonim (PDP-safe)
 *   - cacClvSnapshot: data CAC/CLV
 *   - analyzeCacClv: AI mode + fallback
 *   - chat: AI multi-turn + fallback
 *   - crud: save, findAll, findOne, remove
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');

// ── Mock deepseek.client BEFORE loading service ────────────────────────────
const dsClient = require('../../dist/modules/market-analysis/deepseek.client.js');
let _mockConfigured = true;
let _mockChatResult = { content: '{"summary":"test","strengths":[],"weaknesses":[],"opportunities":[],"threats":[],"recommendations":[]}', model: 'deepseek-v4-flash', usage: { total_tokens: 80 } };
let _mockChatError = null;

dsClient.deepseekConfigured = () => _mockConfigured;
dsClient.deepseekChat = async (messages, opts) => {
  if (_mockChatError) throw new Error(_mockChatError);
  return _mockChatResult;
};

const { MarketAnalysisService } = require('../../dist/modules/market-analysis/market-analysis.service.js');

// ── Helper ─────────────────────────────────────────────────────────────────
function makeSvc(overrides = {}) {
  const prisma = {
    $transaction: async (cb) => {
      if (typeof cb === 'function') return cb(prisma);
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb;
    },
    $queryRaw: async () => [],
    room: {
      count: async () => 0,
    },
    stay: {
      count: async () => 0,
      findMany: async () => [],
      findUnique: async () => null,
    },
    tenant: {
      count: async () => 0,
      findMany: async () => [],
      findUnique: async () => null,
    },
    satisfactionSurvey: {
      aggregate: async () => ({ _count: { _all: 0 }, _avg: { overallRating: null } }),
      findMany: async () => [],
    },
    marketAnalysis: {
      create: async (args) => ({ id: 1, ...args.data }),
      findMany: async () => [],
      findUnique: async () => null,
      delete: async () => ({ id: 1 }),
    },
    invoicePayment: {
      aggregate: async () => ({ _sum: { amountRupiah: 0 } }),
    },
    invoice: {
      aggregate: async () => ({ _sum: { totalAmountRupiah: 0 } }),
      count: async () => 0,
    },
    expense: {
      aggregate: async () => ({ _sum: { amountRupiah: 0 } }),
    },
    review: {
      findMany: async () => [],
      aggregate: async () => ({ _avg: { rating: null }, _count: { id: 0 } }),
    },
    ...overrides,
  };
  return new MarketAnalysisService(prisma);
}

const ACTOR = { id: 1, role: 'OWNER', tenantId: null };

// ════════════════════════════════════════════════════════════════════════════
// configured
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA01: configured — true saat API key ada', () => {
  _mockConfigured = true;
  const svc = makeSvc();
  assert.strictEqual(svc.configured().configured, true);
});

test('TC-MA02: configured — false saat API key tidak ada', () => {
  _mockConfigured = false;
  const svc = makeSvc();
  assert.strictEqual(svc.configured().configured, false);
  _mockConfigured = true;
});

// ════════════════════════════════════════════════════════════════════════════
// businessSnapshot
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA03: businessSnapshot — data default (kosong)', async () => {
  const svc = makeSvc();
  const snap = await svc.businessSnapshot();
  assert.strictEqual(snap.rooms.total, 0);
  assert.strictEqual(snap.occupancyPercent, 0);
  assert.strictEqual(snap.survey.count, 0);
  assert.strictEqual(snap.survey.avgOverall, null);
});

test('TC-MA04: businessSnapshot — dengan data', async () => {
  const svc = makeSvc({
    room: {
      count: async (args) => {
        if (!args) return 48; // total — count() tanpa arg
        if (args?.where?.status === 'OCCUPIED') return 30;
        if (args?.where?.status === 'AVAILABLE') return 15;
        return 48;
      },
    },
    stay: { count: async () => 28 },
    satisfactionSurvey: {
      aggregate: async () => ({ _count: { _all: 10 }, _avg: { overallRating: 4.2 } }),
      findMany: async () => [
        { wouldRecommend: true },
        { wouldRecommend: true },
        { wouldRecommend: false },
      ],
    },
  });
  const snap = await svc.businessSnapshot();
  assert.strictEqual(snap.rooms.total, 48);
  assert.strictEqual(snap.rooms.occupied, 30);
  assert.strictEqual(snap.occupancyPercent, 63); // 30/48
  assert.strictEqual(snap.survey.count, 10);
  assert.strictEqual(snap.survey.avgOverall, 4.2);
  assert.strictEqual(snap.survey.recommendRate, 67); // 2/3
});

// ════════════════════════════════════════════════════════════════════════════
// demographicsSnapshot
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA05: demographicsSnapshot — tanpa tenant', async () => {
  const svc = makeSvc({ tenant: { findMany: async () => [] } });
  const demo = await svc.demographicsSnapshot();
  assert.strictEqual(demo.totalTenants, 0);
  assert.strictEqual(demo.ageRanges.length, 7);
  assert.strictEqual(demo.genders.length, 4);
});

test('TC-MA06: demographicsSnapshot — dengan data tenant (PDP-safe)', async () => {
  const tenants = [
    { gender: 'MALE', birthDate: new Date('2000-06-15'), originCity: 'Surabaya', originProvince: 'Jawa Timur', occupation: 'Mahasiswa' },
    { gender: 'FEMALE', birthDate: new Date('1998-03-20'), originCity: 'Surabaya', originProvince: 'Jawa Timur', occupation: 'Karyawan' },
  ];
  const svc = makeSvc({ tenant: { findMany: async () => tenants } });
  const demo = await svc.demographicsSnapshot();
  assert.strictEqual(demo.totalTenants, 2);
  assert.ok(demo.ageRanges.some((a) => a.count > 0));
  assert.strictEqual(demo.genders.find((g) => g.label === 'MALE')?.count, 1);
  assert.strictEqual(demo.genders.find((g) => g.label === 'FEMALE')?.count, 1);
  // Verifikasi TIDAK ada NIK/nama individu
  assert.ok(!demo.hasOwnProperty('individuals'));
});

// ════════════════════════════════════════════════════════════════════════════
// cacClvSnapshot (data offline, tanpa AI)
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA07: cacClvSnapshot — data default', async () => {
  const svc = makeSvc();
  const snap = await svc.cacClvSnapshot();
  assert.ok(snap.period);
  assert.strictEqual(snap.bookingByChannel.length, 0);
  assert.strictEqual(snap.totals.totalBooking, 0);
  assert.strictEqual(snap.totals.conversionPercent, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// analyzeCacClv
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA08: analyzeCacClv — fallback (AI disabled)', async () => {
  _mockConfigured = false;
  const svc = makeSvc();
  const result = await svc.analyzeCacClv(ACTOR);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.strictEqual(result.fallback, true);
  assert.ok(result.snapshot);
  _mockConfigured = true;
});

test('TC-MA09: analyzeCacClv — AI mode berhasil', async () => {
  _mockConfigured = true;
  _mockChatResult = {
    content: JSON.stringify({
      summary: 'Analisa CAC/CLV',
      channelInsights: [{ channel: 'Google', volume: 10, conversionRate: 0.5, assessment: 'Baik' }],
      retentionInsight: 'Retensi baik',
      clvEstimate: { value: 15000000, explanation: 'Estimasi' },
      recommendations: ['Tingkatkan referral'],
    }),
    model: 'deepseek-v4-flash',
    usage: { total_tokens: 120 },
  };
  _mockChatError = null;
  const svc = makeSvc();
  const result = await svc.analyzeCacClv(ACTOR);
  assert.strictEqual(result.configured, true);
  assert.strictEqual(result.mode, 'DEEPSEEK');
  assert.strictEqual(result.fallback, false);
  assert.ok(result.result);
});

// ════════════════════════════════════════════════════════════════════════════
// chat — SWOT / PESTLE / COMPETITOR multi-turn
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA10: chat — AI tidak dikonfigurasi → fallback langsung', async () => {
  _mockConfigured = false;
  const svc = makeSvc();
  const result = await svc.chat({ kind: 'SWOT', messages: [{ role: 'user', content: 'Mulai analisa' }] }, ACTOR);
  assert.strictEqual(result.configured, false);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.ok(result.snapshot);
  _mockConfigured = true;
});

test('TC-MA11: chat — AI mode, balasan tanpa HASIL (masih wawancara)', async () => {
  _mockConfigured = true;
  _mockChatResult = {
    content: 'Baik, saya akan bantu analisa SWOT KOST48. Pertama, bagaimana okupansi saat ini?',
    model: 'deepseek-v4-flash',
    usage: { total_tokens: 60 },
  };
  _mockChatError = null;
  const svc = makeSvc();
  const result = await svc.chat({ kind: 'SWOT', messages: [{ role: 'user', content: 'Mulai' }] }, ACTOR);
  assert.strictEqual(result.done, false);
  assert.strictEqual(result.result, null);
});

test('TC-MA12: chat — AI mode, balasan mengandung HASIL', async () => {
  _mockConfigured = true;
  _mockChatResult = {
    content: '===HASIL SWOT===\n{"summary":"KOST48 kuat","strengths":["Lokasi strategis"],"weaknesses":["Parkir terbatas"],"opportunities":["Ekspansi"],"threats":["Kompetitor"],"recommendations":["Fokus marketing"]}',
    model: 'deepseek-v4-flash',
    usage: { total_tokens: 150 },
  };
  _mockChatError = null;
  const svc = makeSvc();
  const result = await svc.chat({ kind: 'SWOT', messages: [{ role: 'user', content: 'Data sudah cukup' }] }, ACTOR);
  assert.strictEqual(result.done, true);
  assert.ok(result.result);
  assert.strictEqual(result.result.summary, 'KOST48 kuat');
});

test('TC-MA13: chat — AI error → fallback', async () => {
  _mockConfigured = true;
  _mockChatError = 'API error';
  const svc = makeSvc();
  const result = await svc.chat({ kind: 'SWOT', messages: [{ role: 'user', content: 'Mulai' }] }, ACTOR);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.ok(result.error);
  _mockChatError = null;
});

// ════════════════════════════════════════════════════════════════════════════
// CRUD — save, findAll, findOne, remove
// ════════════════════════════════════════════════════════════════════════════

test('TC-MA14: save — membuat market analysis record', async () => {
  let createData = null;
  const svc = makeSvc({
    marketAnalysis: {
      create: async (args) => { createData = args.data; return { id: 10, ...args.data }; },
    },
  });
  const result = await svc.save({ kind: 'SWOT', title: 'Analisa Juni 2026', summary: 'Ringkasan' }, ACTOR);
  assert.strictEqual(result.id, 10);
  assert.strictEqual(createData.kind, 'SWOT');
});

test('TC-MA15: findAll — tanpa data', async () => {
  const svc = makeSvc({ marketAnalysis: { findMany: async () => [], findUnique: async () => null } });
  const list = await svc.findAll();
  assert.deepStrictEqual(list, []);
});

test('TC-MA16: findOne — tidak ditemukan', async () => {
  const svc = makeSvc({ marketAnalysis: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.findOne(999),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-MA17: remove — berhasil hapus', async () => {
  const svc = makeSvc({
    marketAnalysis: { delete: async () => ({ id: 5 }) },
  });
  const result = await svc.remove(5);
  assert.strictEqual(result.deleted, true);
});
