'use strict';

/**
 * Unit test: OwnerAiService — AI tools: status, brief, OCR, KTP, ops, inventory, rate-limit
 *
 * Cakupan:
 *   - getStatus: konfigurasi AI
 *   - checkRateLimit: daily limit, bucket reset
 *   - getUsageStats: byFeature, remaining
 *   - buildBriefSnapshot: snapshot ringkas bisnis
 *   - generateBrief: AI mode + rule fallback
 *   - draftExpenseFromOcr: validasi input, fallback rule-based
 *   - validateKtpOcr: PDP guard, NIK match, fallback
 *   - draftTicketAction: tiket tidak ditemukan, fallback
 *   - draftReorder: inventory reorder draft
 *   - testConnection: AI configured/unconfigured
 *   - getUsageOverview, recentAiAudit
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { BadRequestException, NotFoundException } = require('@nestjs/common');

// ── Environment: aktifkan AI features untuk test — fallback getAiConfigSync ─
process.env.AI_FEATURES_ENABLED = 'true';

// ── Mock deepseek.client BEFORE loading service ────────────────────────────
const dsClient = require('../../dist/modules/market-analysis/deepseek.client.js');
let _mockConfigured = true;
let _mockChatResult = { content: '{"ok":true}', model: 'deepseek-v4-flash', usage: { total_tokens: 50 } };
let _mockChatError = null;

dsClient.deepseekConfigured = () => _mockConfigured;
dsClient.deepseekChat = async (messages, opts) => {
  if (_mockChatError) throw new Error(_mockChatError);
  return _mockChatResult;
};

const { OwnerAiService } = require('../../dist/modules/owner-ai/owner-ai.service.js');

// ── Helper ─────────────────────────────────────────────────────────────────
function makeSvc(overrides = {}) {
  const prisma = {
    $transaction: async (cb) => {
      if (typeof cb === 'function') return cb(prisma);
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb;
    },
    $queryRaw: async () => [],
    operationalSetting: {
      findUnique: async () => null,
    },
    room: {
      groupBy: async () => [],
      findMany: async () => [],
      count: async () => 0,
      findUnique: async () => null,
      findFirst: async () => null,
    },
    stay: {
      count: async () => 0,
      findFirst: async () => null,
      findMany: async () => [],
    },
    invoice: {
      aggregate: async () => ({ _count: { id: 0 }, _sum: { totalAmountRupiah: 0 } }),
    },
    paymentSubmission: {
      count: async () => 0,
    },
    ticket: {
      count: async () => 0,
      findUnique: async () => null,
      findMany: async () => [],
    },
    user: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    tenant: {
      findUnique: async () => null,
    },
    inventoryItem: {
      findMany: async () => [],
    },
    inventoryMovement: {
      findMany: async () => [],
    },
    expense: {
      aggregate: async () => ({ _sum: { amountRupiah: 0 } }),
    },
    ...overrides,
  };
  return new OwnerAiService(prisma);
}

const ACTOR = { id: 1 };

// ════════════════════════════════════════════════════════════════════════════
// getStatus
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA01: getStatus — default env fallback', async () => {
  _mockConfigured = true;
  const svc = makeSvc();
  const status = await svc.getStatus();
  assert.strictEqual(status.configured, true);
  assert.ok(status.hasOwnProperty('enabled'));
  assert.ok(status.hasOwnProperty('dailyLimit'));
  assert.ok(status.hasOwnProperty('dailyRemaining'));
  assert.ok(status.hasOwnProperty('manualOnly'));
  assert.ok(status.hasOwnProperty('ownerAdminOnly'));
  assert.ok(!status.hasOwnProperty('apiKey')); // JANGAN bocorkan key
});

test('TC-OA02: getStatus — configured=false bila tidak ada API key', async () => {
  _mockConfigured = false;
  const svc = makeSvc();
  const status = await svc.getStatus();
  assert.strictEqual(status.configured, false);
  _mockConfigured = true;
});

// ════════════════════════════════════════════════════════════════════════════
// checkRateLimit
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA03: checkRateLimit — tidak throw dalam batas', () => {
  const svc = makeSvc();
  // Panggil beberapa kali — tidak boleh throw
  for (let i = 0; i < 5; i++) {
    svc.checkRateLimit(1, 'brief');
  }
});

test('TC-OA04: checkRateLimit — throw 429 saat melebihi limit', async () => {
  process.env.AI_DAILY_REQUEST_LIMIT = '3';
  const svc = makeSvc({
    operationalSetting: {
      findUnique: async () => ({
        aiFeaturesEnabled: true,
        aiDailyRequestLimit: 3,
        deepseekModel: 'deepseek-v4-flash',
      }),
    },
  });
  // Populasi cache AI config via getAiConfig (private di TS, regular method di JS)
  await svc.getAiConfig();
  for (let i = 0; i < 3; i++) {
    svc.checkRateLimit(1, 'brief');
  }
  assert.throws(
    () => svc.checkRateLimit(1, 'brief'),
    (e) => e.status === 429,
  );
  delete process.env.AI_DAILY_REQUEST_LIMIT;
});

// ════════════════════════════════════════════════════════════════════════════
// getUsageStats
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA05: getUsageStats — tanpa request', () => {
  process.env.AI_DAILY_REQUEST_LIMIT = '50';
  const svc = makeSvc();
  const stats = svc.getUsageStats();
  assert.strictEqual(stats.todayTotal, 0);
  assert.strictEqual(stats.remainingDaily, 50);
  delete process.env.AI_DAILY_REQUEST_LIMIT;
});

// ════════════════════════════════════════════════════════════════════════════
// buildBriefSnapshot
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA06: buildBriefSnapshot — data kosong', async () => {
  const svc = makeSvc();
  const snap = await svc.buildBriefSnapshot();
  assert.ok(snap.period);
  assert.strictEqual(snap.rooms.total, 0);
  assert.strictEqual(snap.finance.overdueCount, 0);
  assert.strictEqual(snap.ops.openTicketCount, 0);
});

test('TC-OA07: buildBriefSnapshot — dengan data statistik', async () => {
  const svc = makeSvc({
    room: {
      groupBy: async () => [
        { status: 'AVAILABLE', _count: { id: 10 } },
        { status: 'OCCUPIED', _count: { id: 30 } },
      ],
    },
    invoice: {
      aggregate: async () => ({ _count: { id: 5 }, _sum: { totalAmountRupiah: 15_000_000 } }),
    },
    paymentSubmission: {
      count: async () => 3,
    },
    ticket: {
      count: async () => 2,
    },
    $queryRaw: async () => [],
  });
  const snap = await svc.buildBriefSnapshot();
  assert.strictEqual(snap.rooms.total, 40);
  assert.strictEqual(snap.rooms.occupied, 30);
  assert.strictEqual(snap.finance.overdueCount, 5);
  assert.strictEqual(snap.finance.overdueRupiah, 15_000_000);
  assert.strictEqual(snap.finance.pendingPaymentCount, 3);
  assert.strictEqual(snap.ops.openTicketCount, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// generateBrief
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA08: generateBrief — AI mode', async () => {
  _mockConfigured = true;
  _mockChatResult = {
    content: JSON.stringify({ summary: 'Ringkasan AI', priorityActions: [], risks: [], numbersToWatch: [], missingData: [] }),
    model: 'deepseek-v4-flash',
    usage: { total_tokens: 100 },
  };
  _mockChatError = null;
  const svc = makeSvc({
    room: { groupBy: async () => [] },
    invoice: { aggregate: async () => ({ _count: { id: 0 }, _sum: { totalAmountRupiah: 0 } }) },
    paymentSubmission: { count: async () => 0 },
    ticket: { count: async () => 0 },
    $queryRaw: async () => [],
  });
  const brief = await svc.generateBrief(ACTOR.id);
  assert.strictEqual(brief.mode, 'DEEPSEEK');
  assert.strictEqual(brief.fallback, false);
  assert.ok(brief.result);
  assert.strictEqual(brief.result.summary, 'Ringkasan AI');
});

test('TC-OA09: generateBrief — rule fallback (AI disabled)', async () => {
  _mockConfigured = false;
  const svc = makeSvc({
    room: { groupBy: async () => [] },
    invoice: { aggregate: async () => ({ _count: { id: 3 }, _sum: { totalAmountRupiah: 5_000_000 } }) },
    paymentSubmission: { count: async () => 2 },
    ticket: { count: async () => 1 },
    $queryRaw: async () => [],
  });
  const brief = await svc.generateBrief(ACTOR.id);
  assert.strictEqual(brief.mode, 'RULE_FALLBACK');
  assert.strictEqual(brief.fallback, true);
  assert.ok(brief.warnings.length > 0);
  _mockConfigured = true;
});

test('TC-OA10: generateBrief — AI error → fallback', async () => {
  _mockConfigured = true;
  _mockChatError = 'DeepSeek timeout';
  const svc = makeSvc({
    room: { groupBy: async () => [] },
    invoice: { aggregate: async () => ({ _count: { id: 0 }, _sum: { totalAmountRupiah: 0 } }) },
    paymentSubmission: { count: async () => 0 },
    ticket: { count: async () => 0 },
    $queryRaw: async () => [],
  });
  const brief = await svc.generateBrief(ACTOR.id);
  assert.strictEqual(brief.mode, 'RULE_FALLBACK');
  assert.strictEqual(brief.fallback, true);
  _mockChatError = null;
});

// ════════════════════════════════════════════════════════════════════════════
// draftExpenseFromOcr
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA11: draftExpenseFromOcr — teks terlalu pendek', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.draftExpenseFromOcr('pendek', ACTOR.id),
    (e) => e instanceof BadRequestException,
  );
});

test('TC-OA12: draftExpenseFromOcr — teks berisi base64/gambar', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.draftExpenseFromOcr('data:image/png;base64,abc123', ACTOR.id),
    (e) => e instanceof BadRequestException,
  );
});

test('TC-OA13: draftExpenseFromOcr — fallback rule-based', async () => {
  _mockConfigured = false;
  const svc = makeSvc();
  const result = await svc.draftExpenseFromOcr('Pembelian kabel LAN 50 meter Rp 75.000 di Toko ABC', ACTOR.id);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.strictEqual(result.fallback, true);
  assert.ok(result.result.amountRupiah > 0);
  assert.ok(result.result.needsReview);
  _mockConfigured = true;
});

test('TC-OA14: draftExpenseFromOcr — AI mode', async () => {
  _mockConfigured = true;
  _mockChatResult = {
    content: JSON.stringify({
      expenseDate: '2026-06-20',
      vendorName: 'Toko ABC',
      amountRupiah: 75000,
      category: 'OPERATIONAL',
      type: 'VARIABLE',
      description: 'Kabel LAN',
      confidence: 0.8,
      needsReview: [],
    }),
    model: 'deepseek-v4-flash',
    usage: { total_tokens: 80 },
  };
  _mockChatError = null;
  const svc = makeSvc();
  const result = await svc.draftExpenseFromOcr('Nota Toko ABC kabel Rp75.000', ACTOR.id);
  assert.strictEqual(result.mode, 'DEEPSEEK');
  assert.strictEqual(result.fallback, false);
  assert.ok(result.result.amountRupiah > 0);
});

// ════════════════════════════════════════════════════════════════════════════
// validateKtpOcr
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA15: validateKtpOcr — teks kosong', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.validateKtpOcr(1, '', ACTOR.id),
    (e) => e instanceof BadRequestException,
  );
});

test('TC-OA16: validateKtpOcr — gambar/base64 ditolak', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.validateKtpOcr(1, 'data:image/jpeg;base64,abc', ACTOR.id),
    (e) => e instanceof BadRequestException,
  );
});

test('TC-OA17: validateKtpOcr — tenant tidak ditemukan', async () => {
  const svc = makeSvc({ tenant: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.validateKtpOcr(999, 'Nama Budi\nNIK 3578010101900001', ACTOR.id),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-OA18: validateKtpOcr — fallback rule-based (AI disabled)', async () => {
  _mockConfigured = false;
  const svc = makeSvc({
    tenant: {
      findUnique: async () => ({ id: 1, fullName: 'Budi Santoso', identityNumber: '3578010101900001' }),
    },
  });
  const result = await svc.validateKtpOcr(1, 'Nama Budi Santoso\nNIK 3578010101900001\nAlamat Surabaya', ACTOR.id);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.strictEqual(result.fallback, true);
  assert.ok(result.result.nikFormatValid);
  assert.strictEqual(result.result.match.nikMatchesTenant, true);
  _mockConfigured = true;
});

// ════════════════════════════════════════════════════════════════════════════
// draftTicketAction
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA19: draftTicketAction — tiket tidak ditemukan', async () => {
  const svc = makeSvc({ ticket: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.draftTicketAction(999, ACTOR.id),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-OA20: draftTicketAction — fallback (AI disabled)', async () => {
  _mockConfigured = false;
  const svc = makeSvc({
    ticket: {
      findUnique: async () => ({
        id: 1,
        ticketNumber: 'TCK-001',
        title: 'AC rusak',
        category: 'KERUSAKAN',
        status: 'OPEN',
        description: 'AC tidak dingin',
        priority: 'MEDIUM',
        roomId: 1,
        room: { id: 1, code: 'G1-001', status: 'OCCUPIED' },
        assignedTo: null,
        linkedRoomItem: null,
        linkedInventoryItem: null,
        staffFieldReports: [],
      }),
    },
  });
  const result = await svc.draftTicketAction(1, ACTOR.id);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.strictEqual(result.fallback, true);
  _mockConfigured = true;
});

// ════════════════════════════════════════════════════════════════════════════
// draftReorder
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA21: draftReorder — fallback rule-based (AI disabled)', async () => {
  _mockConfigured = false;
  const svc = makeSvc({
    inventoryItem: {
      findMany: async () => [
        { id: 1, sku: null, name: 'Semen', category: 'MATERIAL', unit: 'sak', qtyOnHand: 2, minQty: 10, status: 'ACTIVE' },
      ],
    },
    inventoryMovement: { findMany: async () => [] },
    ticket: { findMany: async () => [] },
  });
  const result = await svc.draftReorder(ACTOR.id);
  assert.strictEqual(result.mode, 'RULE_FALLBACK');
  assert.ok(result.warnings);
  _mockConfigured = true;
});

// ════════════════════════════════════════════════════════════════════════════
// testConnection
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA22: testConnection — AI tidak dikonfigurasi', async () => {
  _mockConfigured = false;
  const svc = makeSvc();
  const result = await svc.testConnection(ACTOR.id);
  assert.strictEqual(result.configured, false);
  assert.strictEqual(result.ok, false);
  _mockConfigured = true;
});

test('TC-OA23: testConnection — AI berhasil', async () => {
  _mockConfigured = true;
  _mockChatResult = { content: 'OK', model: 'deepseek-v4-flash', usage: { total_tokens: 5 } };
  _mockChatError = null;
  const svc = makeSvc();
  const result = await svc.testConnection(ACTOR.id);
  assert.strictEqual(result.configured, true);
  assert.strictEqual(result.ok, true);
});

// ════════════════════════════════════════════════════════════════════════════
// getUsageOverview & recentAiAudit
// ════════════════════════════════════════════════════════════════════════════

test('TC-OA24: recentAiAudit — tanpa data audit AI', async () => {
  const svc = makeSvc({ $queryRaw: async () => [] });
  const audit = await svc.recentAiAudit(5);
  assert.deepStrictEqual(audit, []);
});

test('TC-OA25: getUsageOverview — gabungan usage + audit', async () => {
  const svc = makeSvc({ $queryRaw: async () => [] });
  const overview = await svc.getUsageOverview();
  assert.ok(overview.hasOwnProperty('todayTotal'));
  assert.ok(overview.hasOwnProperty('recentAudit'));
  assert.ok(Array.isArray(overview.recentAudit));
});
