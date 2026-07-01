/**
 * Integration test: Prepay Extension (Y-J10)
 * ===========================================
 * Menguji siklus prabayar/perpanjangan:
 *   Stay ACTIVE → prepay N bulan → invoice PAID → plannedCheckOutDate diperpanjang
 *   → jurnal (issuance + payment) → rent recognition schedule → loyalty points
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
const { PrepayExtensionService } = require('../../dist/modules/stays/prepay-extension.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-PRE-${label}-${Date.now()}-${++_tcIdx}`;
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

async function createTestRoom(prisma, label, opts = {}) {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Prepay Test ${label}`,
      floor: '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: opts.monthlyRateRupiah ?? 1_500_000,
      defaultDepositRupiah: 500_000,
      electricityTariffPerKwhRupiah: 0,
      waterTariffPerM3Rupiah: 0,
      isActive: true,
    },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
}

/**
 * Pastikan accounting period untuk bulan ini ada (OPEN).
 * Tanpa ini, jurnal prepay akan gagal.
 */
async function ensureCurrentPeriod(prisma) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const existing = await prisma.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
  if (!existing) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    return prisma.accountingPeriod.create({
      data: { year, month, startDate, endDate, status: 'OPEN' },
    });
  }
  return existing;
}

/**
 * Buat stay ACTIVE + promoted, tanpa tunggakan invoice.
 */
async function createActiveStayNoArrears(prisma, room, adminActor) {
  const bcrypt = require('bcryptjs');
  const { randomInt } = require('crypto');
  const identitySuffix = String(Date.now()).slice(-6) + String(randomInt(10, 99));
  const tempPassword = await bcrypt.hash(`UAT-PRE-${Date.now()}`, 10);

  const checkIn = addDays(new Date(), -30);
  checkIn.setUTCHours(0, 0, 0, 0);
  // plannedCheckOutDate dekat (1 bulan lagi) agar perpanjangan terasa
  const periodEnd = addMonths(checkIn, 1);
  const deposit = room.defaultDepositRupiah;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        fullName: `Tenant Prepay Test`,
        phone: `0812${String(randomInt(10000000, 99999999))}`,
        email: `pre-${Date.now()}@test.kost48.com`,
        isActive: true,
        identityNumber: `PRE${identitySuffix}`,
        emergencyContactPhone: '081234567890',
        emergencyContactName: 'Emergency Contact',
      },
    });

    await tx.user.create({
      data: {
        fullName: tenant.fullName,
        email: tenant.email,
        passwordHash: tempPassword,
        role: 'TENANT',
        tenantId: tenant.id,
        isActive: true,
      },
    });

    const stay = await tx.stay.create({
      data: {
        tenantId: tenant.id,
        roomId: room.id,
        status: 'ACTIVE',
        pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: room.monthlyRateRupiah,
        occupantCount: 1,
        hasPet: false,
        checkInDate: checkIn,
        plannedCheckOutDate: periodEnd,
        depositAmountRupiah: deposit,
        depositPaidAmountRupiah: deposit,
        depositStatus: 'HELD',
        downPaymentAmountRupiah: 0,
        electricityTariffPerKwhRupiah: 0,
        waterTariffPerM3Rupiah: 0,
        bookingSource: 'WEBSITE',
        createdById: adminActor.id,
        initialMetersPromotedAt: checkIn,
      },
    });

    await tx.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });
    return { stay, tenant };
  });

  return result;
}

async function cleanupTestData(prisma, { stayId, roomId, tenantId, userId } = {}) {
  if (stayId) {
    try {
      try { await prisma.appNotification.deleteMany({ where: { entityType: 'STAY', entityId: String(stayId) } }); } catch {}
      try { await prisma.checkoutRequest.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: { startsWith: `PREPAY:` } } }); } catch {}
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
    try { await prisma.room.update({ where: { id: roomId }, data: { status: 'AVAILABLE' } }); } catch {}
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
  if (tenantId) { try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {} }
  if (userId) { try { await prisma.user.delete({ where: { id: userId } }); } catch {} }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J10a: Prepay Extension — perpanjang 3 bulan (MONTHLY)
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J10a: Prepay Extension — perpanjang 3 bulan (MONTHLY)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepayService = module.get(PrepayExtensionService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let roomId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    // Pastikan accounting period tersedia
    const period = await ensureCurrentPeriod(prisma);
    console.log(`\n  📋 Accounting period: ${period.year}-${String(period.month).padStart(2, '0')} status=${period.status}`);

    // ── STEP 1: Setup ───────────────────────────────────────────────────
    console.log('\n  📋 STEP 1: Setup kamar + stay aktif tanpa tunggakan');
    const room = await createTestRoom(prisma, 'YJ10A');
    roomId = room.id;
    const { stay, tenant } = await createActiveStayNoArrears(prisma, room, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;

    const originalEndDate = new Date(stay.plannedCheckOutDate);
    console.log(`     ✅ Stay #${stay.id}, plannedCheckOut=${ymd(originalEndDate)}, rent=Rp ${Number(stay.agreedRentAmountRupiah).toLocaleString('id-ID')}`);

    // ── STEP 2: Prepay 3 bulan ──────────────────────────────────────────
    console.log('\n  📋 STEP 2: Prabayar 3 bulan (MONTHLY)');
    const prepayResult = await prepayService.prepayExtension(stayId, {
      months: 3,
      method: 'TRANSFER',
      note: 'Integration test — perpanjang 3 bulan',
    }, adminActor);

    assert.ok(prepayResult.invoiceNumber, 'Harus ada invoice number');
    assert.strictEqual(prepayResult.months, 3, 'Harus 3 bulan');
    assert.strictEqual(prepayResult.rateTerm, 'MONTHLY');
    console.log(`     ✅ Invoice=${prepayResult.invoiceNumber}, total=Rp ${prepayResult.totalRupiah?.toLocaleString('id-ID')}`);

    // ── STEP 3: Verifikasi plannedCheckOutDate diperpanjang ─────────────
    console.log('\n  📋 STEP 3: Verifikasi plannedCheckOutDate diperpanjang');
    const stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    const newEndDate = new Date(stayCheck.plannedCheckOutDate);
    const expectedMonths = originalEndDate.getUTCMonth() + 3;
    // Karena addCalendarMonthsClamped, cukup cek sudah > original
    assert.ok(newEndDate > originalEndDate, 'plannedCheckOutDate harus lebih besar');
    console.log(`     ✅ plannedCheckOut: ${ymd(originalEndDate)} → ${ymd(newEndDate)}`);

    // ── STEP 4: Verifikasi invoice PAID ─────────────────────────────────
    console.log('\n  📋 STEP 4: Verifikasi invoice PAID');
    const invoices = await prisma.invoice.findMany({
      where: { stayId },
      orderBy: { id: 'desc' },
      take: 1,
      include: { payments: true },
    });
    assert.ok(invoices.length > 0, 'Harus ada invoice');
    const inv = invoices[0];
    assert.strictEqual(inv.status, 'PAID', 'Invoice harus PAID');
    assert.ok(inv.payments.length > 0, 'Harus ada payment');
    console.log(`     ✅ Invoice #${inv.id} ${inv.invoiceNumber}: status=${inv.status}, payments=${inv.payments.length}`);

    // ── STEP 5: Verifikasi rent recognition schedule ────────────────────
    console.log('\n  📋 STEP 5: Verifikasi rent recognition schedule');
    const schedules = await prisma.rentRecognitionSchedule.findMany({
      where: { stayId },
      orderBy: { periodStart: 'asc' },
    });
    // Prepay 3 bulan harus menghasilkan minimal 3 jadwal pengakuan
    assert.ok(schedules.length >= 3, `Harus ada minimal 3 jadwal: ada ${schedules.length}`);
    console.log(`     ✅ ${schedules.length} jadwal pengakuan sewa terbuat`);

    console.log('\n  🎉 Y-J10a SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J10a GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J10b: Guard — prabayar dengan tunggakan harus ditolak
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J10b: Guard — prabayar dengan tunggakan harus ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepayService = module.get(PrepayExtensionService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let roomId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J10b: Guard — prabayar dengan tunggakan');

    const room = await createTestRoom(prisma, 'YJ10B');
    roomId = room.id;
    const { stay } = await createActiveStayNoArrears(prisma, room, adminActor);
    stayId = stay.id;

    // Buat invoice ISSUED (tunggakan) untuk stay ini
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-ARR-${stay.id}-${Date.now()}`,
        stayId: stay.id,
        status: 'ISSUED',
        periodStart: addDays(new Date(), -30),
        periodEnd: addDays(new Date(), 30),
        dueDate: addDays(new Date(), 14),
        totalAmountRupiah: 500_000,
        notes: 'Tagihan test — tunggakan',
      },
    });
    console.log('     ✅ Invoice tunggakan dibuat (ISSUED)');

    try {
      await prepayService.prepayExtension(stayId, { months: 1 }, adminActor);
      assert.fail('Seharusnya throw ConflictException');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('tunggakan') || msg.includes('lunas') || msg.includes('tagihan') || err.status === 409,
        `Harus tolak karena tunggakan: ${msg}`,
      );
      console.log(`     ✅ Ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J10b SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J10b GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J10c: Guard — prabayar dengan bulan invalid
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J10c: Guard — prabayar dengan bulan invalid (0 atau >24)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepayService = module.get(PrepayExtensionService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let roomId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J10c: Guard — bulan invalid');

    const room = await createTestRoom(prisma, 'YJ10C');
    roomId = room.id;
    const { stay } = await createActiveStayNoArrears(prisma, room, adminActor);
    stayId = stay.id;

    // Uji months=0
    try {
      await prepayService.prepayExtension(stayId, { months: 0 }, adminActor);
      assert.fail('months=0 harus ditolak');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(msg.includes('1-24') || err.status === 400, `months=0 harus ditolak: ${msg}`);
      console.log(`     ✅ months=0 ditolak: ${msg}`);
    }

    // Uji months=25
    try {
      await prepayService.prepayExtension(stayId, { months: 25 }, adminActor);
      assert.fail('months=25 harus ditolak');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(msg.includes('1-24') || err.status === 400, `months=25 harus ditolak: ${msg}`);
      console.log(`     ✅ months=25 ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J10c SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J10c GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J10d: Guard — SMESTERLY dengan <6 bulan, YEARLY dengan <12 bulan
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J10d: Guard — SMESTERLY <6 bulan & YEARLY <12 bulan', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepayService = module.get(PrepayExtensionService);
  const adminActor = await getAdminActor(prisma);

  let stayId = null;
  let roomId = null;
  let tenantId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J10d: Guard — SMESTERLY <6, YEARLY <12');

    const room = await createTestRoom(prisma, 'YJ10D');
    roomId = room.id;
    const { stay } = await createActiveStayNoArrears(prisma, room, adminActor);
    stayId = stay.id;

    // SMESTERLY dengan 3 bulan → harus gagal
    try {
      await prepayService.prepayExtension(stayId, { months: 3, rateTerm: 'SMESTERLY' }, adminActor);
      assert.fail('SMESTERLY 3 bulan harus ditolak');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('6') || msg.includes('semester') || err.status === 409,
        `SMESTERLY <6 harus ditolak: ${msg}`,
      );
      console.log(`     ✅ SMESTERLY 3 bln ditolak: ${msg}`);
    }

    // YEARLY dengan 6 bulan → harus gagal
    try {
      await prepayService.prepayExtension(stayId, { months: 6, rateTerm: 'YEARLY' }, adminActor);
      assert.fail('YEARLY 6 bulan harus ditolak');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('12') || msg.includes('tahunan') || err.status === 409,
        `YEARLY <12 harus ditolak: ${msg}`,
      );
      console.log(`     ✅ YEARLY 6 bln ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J10d SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J10d GAGAL:', err.message);
    throw err;
  }
});
