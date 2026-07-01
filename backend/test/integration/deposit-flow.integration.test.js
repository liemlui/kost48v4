/**
 * Integration test: Deposit Flow (Y-J6)
 * ======================================
 * Menguji siklus deposit penuh: terima → settlement (FORFEIT / PARTIAL_REFUND)
 * → jurnal liability 2000 via TenantDepositLedgerEntry.
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
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-DEP-${label}-${Date.now()}-${++_tcIdx}`;
}
const ymd = (d) => d.toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}

async function getAdminActor(prisma) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  assert.ok(admin, 'Harus ada user ADMIN (seed)');
  return { id: admin.id, role: 'ADMIN', email: admin.email, tenantId: null };
}

async function getOwnerActor(prisma) {
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, select: { id: true, email: true } });
  assert.ok(owner, 'Harus ada user OWNER (seed)');
  return { id: owner.id, role: 'OWNER', email: owner.email, tenantId: null };
}

async function createTestRoom(prisma, label = 'DEP') {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Deposit Test ${label}`,
      floor: '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: 1_500_000,
      defaultDepositRupiah: 500_000,
      electricityTariffPerKwhRupiah: 2_500,
      waterTariffPerM3Rupiah: 5_000,
      isActive: true,
    },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
}

/**
 * Buat stay ACTIVE + promoted + deposit HELD untuk test deposit.
 */
async function createActiveStayWithDeposit(prisma, room, adminActor) {
  const { randomInt } = require('crypto');
  const checkIn = addDays(new Date(), -30);
  checkIn.setUTCHours(0, 0, 0, 0);
  const periodEnd = addMonths(checkIn, 3);
  const agreedRent = room.monthlyRateRupiah;
  const deposit = room.defaultDepositRupiah;

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        fullName: `Tenant Deposit Test`,
        phone: `0812${String(randomInt(10000000, 99999999))}`,
        email: `dep-${Date.now()}@test.kost48.com`,
        isActive: true,
        identityNumber: '1234567890123456',
        emergencyContactPhone: '081234567890',
        emergencyContactName: 'Emergency Contact',
      },
    });

    const stay = await tx.stay.create({
      data: {
        tenantId: tenant.id,
        roomId: room.id,
        status: 'COMPLETED', // langsung COMPLETED biar bisa processDeposit
        pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: agreedRent,
        occupantCount: 1,
        hasPet: false,
        checkInDate: checkIn,
        plannedCheckOutDate: periodEnd,
        actualCheckOutDate: addDays(new Date(), -1),
        depositAmountRupiah: deposit,
        depositPaidAmountRupiah: deposit,
        depositStatus: 'HELD',
        downPaymentAmountRupiah: 0,
        downPaymentPaidRupiah: 0,
        electricityTariffPerKwhRupiah: 2_500,
        waterTariffPerM3Rupiah: 5_000,
        bookingSource: 'WEBSITE',
        belongingsStatus: 'PENDING',
        createdById: adminActor.id,
        initialMetersPromotedAt: checkIn,
      },
    });

    return { stay, tenant };
  });
}

async function cleanupTestData(prisma, { stayId, roomId, tenantId }) {
  if (stayId) {
    try {
      try { await prisma.appNotification.deleteMany({ where: { entityType: 'STAY', entityId: String(stayId) } }); } catch {}
      const invs = await prisma.invoice.findMany({ where: { stayId }, select: { id: true } });
      for (const inv of invs) {
        try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: String(inv.id) } }); } catch {}
        try { await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.paymentSubmission.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoice.delete({ where: { id: inv.id } }); } catch {}
      }
      try { await prisma.tenantDepositLedgerEntry.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.rentRecognitionSchedule.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.renewRequest.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.roomTransfer.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.ticket.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.stay.delete({ where: { id: stayId } }); } catch {}
    } catch {}
  }
  if (roomId) {
    try { await prisma.meterReading.deleteMany({ where: { roomId } }); } catch {}
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
  if (tenantId) {
    try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J6a: Deposit FORFEIT — deposit hangus penuh (kerusakan)
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J6a: Deposit FORFEIT — full forfeit with ledger', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const staysService = module.get(StaysService);
  const ownerActor = await getOwnerActor(prisma);

  let roomId = null;
  let stayId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J6a: Deposit FORFEIT — full forfeit');

    // Setup: room + stay COMPLETED + deposit HELD
    const room = await createTestRoom(prisma, 'YJ6A');
    roomId = room.id;
    const { stay, tenant } = await createActiveStayWithDeposit(prisma, room, ownerActor);
    stayId = stay.id;
    tenantId = tenant.id;
    const depositAmount = Number(stay.depositAmountRupiah);
    console.log(`     ✅ Stay #${stay.id}, deposit=Rp ${depositAmount.toLocaleString('id-ID')}`);

    // Proses deposit FORFEIT
    const result = await staysService.processDeposit(stayId, {
      action: 'FORFEIT',
      depositNote: 'Deposit hangus karena kerusakan AC dan kunci kamar',
    }, ownerActor);

    assert.strictEqual(result.depositStatus, 'FORFEITED', 'Status deposit harus FORFEITED');
    assert.strictEqual(Number(result.depositDeductionRupiah), depositAmount, 'Dedukasi = full deposit');
    assert.strictEqual(Number(result.depositRefundedRupiah), 0, 'Refund = 0');
    console.log(`     ✅ Deposit FORFEITED: potong=Rp ${Number(result.depositDeductionRupiah).toLocaleString('id-ID')}`);

    // Verifikasi TenantDepositLedgerEntry
    const ledger = await prisma.tenantDepositLedgerEntry.findMany({
      where: { stayId },
      orderBy: { id: 'asc' },
    });
    assert.ok(ledger.length >= 1, 'Harus ada entry ledger deposit');
    console.log(`     ✅ ${ledger.length} ledger entries tercatat — type=${ledger[0].type}, direction=${ledger[0].direction}`);

    console.log('  🎉 Y-J6a SELESAI ✅');
  } catch (err) {
    console.error('\n  ❌ Y-J6a GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J6b: Deposit PARTIAL_REFUND — potong sebagian, refund sisa
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J6b: Deposit PARTIAL_REFUND — partial deduction + refund', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const staysService = module.get(StaysService);
  const ownerActor = await getOwnerActor(prisma);

  let roomId = null;
  let stayId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J6b: Deposit PARTIAL_REFUND — partial deduction + refund');

    // Setup
    const room = await createTestRoom(prisma, 'YJ6B');
    roomId = room.id;
    const { stay, tenant } = await createActiveStayWithDeposit(prisma, room, ownerActor);
    stayId = stay.id;
    tenantId = tenant.id;
    const depositAmount = Number(stay.depositAmountRupiah);
    const deduction = Math.round(depositAmount * 0.3); // 30% potong
    const refund = depositAmount - deduction;
    console.log(`     ✅ Stay #${stay.id}, deposit=Rp ${depositAmount.toLocaleString('id-ID')}`);
    console.log(`     → Potong Rp ${deduction.toLocaleString('id-ID')}, Refund Rp ${refund.toLocaleString('id-ID')}`);

    // Proses deposit PARTIAL_REFUND
    const result = await staysService.processDeposit(stayId, {
      action: 'PARTIAL_REFUND',
      depositDeductionRupiah: deduction,
      depositRefundedRupiah: refund,
      depositNote: 'Sebagian deposit dipotong untuk ganti kunci rusak',
    }, ownerActor);

    assert.strictEqual(result.depositStatus, 'PARTIALLY_REFUNDED', 'Status harus PARTIALLY_REFUNDED');
    assert.strictEqual(Number(result.depositDeductionRupiah), deduction, 'Dedukasi sesuai');
    assert.strictEqual(Number(result.depositRefundedRupiah), refund, 'Refund sesuai');
    console.log(`     ✅ Deposit PARTIALLY_REFUNDED: potong=Rp ${Number(result.depositDeductionRupiah).toLocaleString('id-ID')}, refund=Rp ${Number(result.depositRefundedRupiah).toLocaleString('id-ID')}`);

    // Verifikasi ledger
    const ledger = await prisma.tenantDepositLedgerEntry.findMany({
      where: { stayId },
      orderBy: { id: 'asc' },
    });
    assert.ok(ledger.length >= 1, 'Harus ada entry ledger deposit');
    console.log(`     ✅ ${ledger.length} ledger entries tercatat — type=${ledger[0].type}, direction=${ledger[0].direction}`);

    console.log('  🎉 Y-J6b SELESAI ✅');
  } catch (err) {
    console.error('\n  ❌ Y-J6b GAGAL:', err.message);
    throw err;
  }
});
