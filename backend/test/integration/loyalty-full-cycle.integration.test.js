/**
 * Integration test: Loyalty Full Cycle (Y-J13)
 * =============================================
 * Menguji siklus loyalitas penuh:
 *   award → earn → balance → history → idempotency → leaderboard
 *
 * PRASYARAT: DB dev (port 5433 / kost48_v3_pro) running + sudah di-seed.
 * JALANKAN: cd backend && npm run build && npm run test:integration
 */

'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { LoyaltyService } = require('../../dist/modules/loyalty/loyalty.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-LOY-${label}-${Date.now()}-${++_tcIdx}`;
}

async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}

async function createTestTenant(prisma, label = 'LOY') {
  const { randomInt } = require('crypto');
  const identitySuffix = String(Date.now()).slice(-6) + String(randomInt(10, 99));
  return prisma.tenant.create({
    data: {
      fullName: `Tenant Loyalty Test ${label}`,
      phone: `0812${String(randomInt(10000000, 99999999))}`,
      email: `loy-${label.toLowerCase()}-${Date.now()}@test.kost48.com`,
      isActive: true,
      identityNumber: `LOY${identitySuffix}${label}`,
      emergencyContactPhone: '081234567890',
      emergencyContactName: 'Emergency Contact',
    },
    select: { id: true, fullName: true },
  });
}

async function cleanupTestData(prisma, tenantId) {
  if (tenantId) {
    try { await prisma.loyaltyPoint.deleteMany({ where: { tenantId } }); } catch {}
    try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J13a: Award points + balance + history
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J13a: Award points → balance → history', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const loyaltyService = module.get(LoyaltyService);

  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, tenantId);
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J13a: Award points → balance → history');

    // Setup tenant
    const tenant = await createTestTenant(prisma, '13A');
    tenantId = tenant.id;
    console.log(`     ✅ Tenant #${tenant.id}: ${tenant.fullName}`);

    // Award 50 poin untuk RENEWAL
    const r1 = await loyaltyService.award({
      tenantId,
      delta: 50,
      reason: 'RENEWAL',
      sourceType: 'RENEWAL',
      sourceId: `TEST-RENEWAL-${Date.now()}`,
      note: 'Poin perpanjangan sewa',
    });
    assert.ok(r1.created, 'Award pertama harus sukses');
    console.log(`     ✅ Award #1: +50 (RENEWAL)`);

    // Award 30 poin untuk ON_TIME_PAYMENT
    const r2 = await loyaltyService.award({
      tenantId,
      delta: 30,
      reason: 'ON_TIME_PAYMENT',
      sourceType: 'ON_TIME_PAYMENT',
      sourceId: `TEST-OTP-${Date.now()}`,
      note: 'Poin bayar tepat waktu',
    });
    assert.ok(r2.created, 'Award kedua harus sukses');
    console.log(`     ✅ Award #2: +30 (ON_TIME_PAYMENT)`);

    // Balance harus 80
    const balance = await loyaltyService.balance(tenantId);
    assert.strictEqual(balance, 80, 'Balance harus 80');
    console.log(`     ✅ Balance: ${balance}`);

    // History harus ada 2 item
    const history = await loyaltyService.history(tenantId);
    assert.strictEqual(history.balance, 80, 'History balance harus 80');
    assert.ok(history.items.length >= 2, `Harus ada >= 2 items: ${history.items.length}`);
    assert.strictEqual(history.totalEarned, 80, 'totalEarned harus 80');
    assert.strictEqual(history.totalRedeemed, 0, 'totalRedeemed harus 0');
    console.log(`     ✅ History: ${history.items.length} items, earned=${history.totalEarned}, redeemed=${history.totalRedeemed}`);

    // Award -20 (REDEMPTION)
    const r3 = await loyaltyService.award({
      tenantId,
      delta: -20,
      reason: 'REDEMPTION',
      sourceType: 'REDEMPTION',
      sourceId: `TEST-REDEEM-${Date.now()}`,
      note: 'Tukar poin diskon',
    });
    assert.ok(r3.created, 'Award redeem harus sukses');
    console.log(`     ✅ Award #3: -20 (REDEMPTION)`);

    // Balance harus 60
    const balance2 = await loyaltyService.balance(tenantId);
    assert.strictEqual(balance2, 60, 'Balance harus 60 setelah redeem');
    console.log(`     ✅ Balance akhir: ${balance2}`);

    // History akhir
    const history2 = await loyaltyService.history(tenantId);
    assert.strictEqual(history2.totalRedeemed, 20, 'totalRedeemed harus 20');
    console.log(`     ✅ History final: ${history2.items.length} items, balance=${history2.balance}`);

    console.log('\n  🎉 Y-J13a SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J13a GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J13b: Idempotency — award sama (sourceType+sourceId) tidak dobel
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J13b: Idempotency — double award tidak menambah poin dobel', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const loyaltyService = module.get(LoyaltyService);

  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, tenantId);
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J13b: Idempotency double award');

    const tenant = await createTestTenant(prisma, '13B');
    tenantId = tenant.id;

    const sourceKey = `TEST-IDEM-${Date.now()}`;

    // Award pertama
    const r1 = await loyaltyService.award({
      tenantId,
      delta: 100,
      reason: 'ADJUSTMENT',
      sourceType: 'ADJUSTMENT',
      sourceId: sourceKey,
    });
    assert.ok(r1.created, 'Award pertama harus sukses');

    // Award kedua — sourceId sama
    const r2 = await loyaltyService.award({
      tenantId,
      delta: 100,
      reason: 'ADJUSTMENT',
      sourceType: 'ADJUSTMENT',
      sourceId: sourceKey,
    });
    assert.ok(!r2.created, 'Award kedua harus di-skip');
    assert.strictEqual(r2.reason, 'ALREADY_AWARDED', 'Alasan harus ALREADY_AWARDED');

    // Balance tetap 100 (bukan 200)
    const balance = await loyaltyService.balance(tenantId);
    assert.strictEqual(balance, 100, `Balance harus 100, bukan ${balance}`);
    console.log(`     ✅ Balance tetap 100 (idempotent)`);

    console.log('\n  🎉 Y-J13b SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J13b GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J13c: Earn poin untuk alasan standar (ON_TIME_PAYMENT, VALIDATED_REPORT)
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J13c: Earn poin standar — ON_TIME_PAYMENT, VALIDATED_REPORT', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const loyaltyService = module.get(LoyaltyService);

  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, tenantId);
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J13c: Earn poin standar');

    const tenant = await createTestTenant(prisma, '13C');
    tenantId = tenant.id;

    // Earn ON_TIME_PAYMENT (default 50 poin)
    const r1 = await loyaltyService.earn(tenantId, 'ON_TIME_PAYMENT', `PAY-${Date.now()}`);
    assert.ok(r1.created, 'Earn ON_TIME_PAYMENT harus sukses');
    console.log('     ✅ ON_TIME_PAYMENT berhasil');

    // Earn VALIDATED_REPORT (default 30 poin)
    const r2 = await loyaltyService.earn(tenantId, 'VALIDATED_REPORT', `RPT-${Date.now()}`);
    assert.ok(r2.created, 'Earn VALIDATED_REPORT harus sukses');
    console.log('     ✅ VALIDATED_REPORT berhasil');

    // Earn RENEWAL (default 100 poin)
    const r3 = await loyaltyService.earn(tenantId, 'RENEWAL', `RNW-${Date.now()}`);
    assert.ok(r3.created, 'Earn RENEWAL harus sukses');
    console.log('     ✅ RENEWAL berhasil');

    // Balance harus akumulasi
    const balance = await loyaltyService.balance(tenantId);
    assert.ok(balance > 0, 'Balance harus > 0');
    console.log(`     ✅ Balance: ${balance}`);

    console.log('\n  🎉 Y-J13c SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J13c GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J13d: Award delta 0 harus di-skip
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J13d: Award delta 0 di-skip', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const loyaltyService = module.get(LoyaltyService);

  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, tenantId);
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J13d: Award delta 0');

    const tenant = await createTestTenant(prisma, '13D');
    tenantId = tenant.id;

    const r = await loyaltyService.award({
      tenantId,
      delta: 0,
      reason: 'ADJUSTMENT',
      sourceType: 'ADJUSTMENT',
      sourceId: `ZERO-${Date.now()}`,
    });
    assert.ok(!r.created, 'Delta 0 harus di-skip');
    assert.strictEqual(r.reason, 'ZERO_DELTA', 'Alasan harus ZERO_DELTA');

    const balance = await loyaltyService.balance(tenantId);
    assert.strictEqual(balance, 0, 'Balance harus 0');
    console.log(`     ✅ Delta 0 di-skip, balance=${balance}`);

    console.log('\n  🎉 Y-J13d SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J13d GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J13e: Leaderboard by room
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J13e: Leaderboard by room', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const loyaltyService = module.get(LoyaltyService);

  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, tenantId);
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J13e: Leaderboard by room');

    const tenant = await createTestTenant(prisma, '13E');
    tenantId = tenant.id;

    // Beri poin agar muncul di leaderboard
    await loyaltyService.award({
      tenantId,
      delta: 200,
      reason: 'RENEWAL',
      sourceType: 'RENEWAL',
      sourceId: `LB-${Date.now()}`,
      note: 'Poin untuk leaderboard test',
    });

    // Leaderboard harus bisa dipanggil tanpa error
    const board = await loyaltyService.leaderboardByRoom(3);
    assert.ok(Array.isArray(board), 'Leaderboard harus array');
    console.log(`     ✅ Leaderboard: ${board.length} entries`);

    // Jika tenant punya stay aktif, harus muncul di leaderboard
    if (board.length > 0) {
      board.forEach((entry) => {
        assert.ok(entry.rank >= 1, 'Rank harus >= 1');
        assert.ok(entry.roomCode, 'Harus ada roomCode');
        assert.ok(entry.points >= 0, 'Points harus >= 0');
      });
      console.log(`     ✅ Top entry: rank=${board[0].rank}, room=${board[0].roomCode}, points=${board[0].points}`);
    } else {
      console.log('     ℹ️  Leaderboard kosong (tenant tidak punya stay aktif — wajar)');
    }

    console.log('\n  🎉 Y-J13e SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J13e GAGAL:', err.message);
    throw err;
  }
});
