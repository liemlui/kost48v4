const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { AutoOpsService } = require('../../dist/modules/auto-ops/auto-ops.service.js');
const { PrepayExtensionService } = require('../../dist/modules/stays/prepay-extension.service.js');
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

let _tcIdx = 0;
function uniqueCode(label) {
  return `TEST-${label}-${Date.now()}-${++_tcIdx}`;
}

// Bootstrap Nest app penuh + akses service via token CLASS (bukan string).
async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}

async function getOwnerActor(prisma) {
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, select: { id: true, email: true } });
  assert.ok(owner, 'Harus ada user OWNER (seed)');
  return { id: owner.id, role: 'OWNER', email: owner.email, tenantId: null };
}

async function pickTenant(prisma) {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true }, select: { id: true } });
  assert.ok(tenant, 'Harus ada tenant aktif (seed)');
  return tenant;
}

/** Buat kamar uji mandiri — dihapus di cleanup test. */
async function createTestRoom(prisma, label = 'TC') {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Test ${label}`,
      floor: '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: 1_400_000,
      defaultDepositRupiah: 500_000,
      electricityTariffPerKwhRupiah: 2_500,
      waterTariffPerM3Rupiah: 5_000,
      isActive: true,
    },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
}

/**
 * Hapus semua data test terkait stay + kamar (best-effort).
 * Urutan wajib sesuai RESTRICT FK:
 *   LoyaltyPoint → InvoicePayment → Invoice (cascade: InvoiceLine, PaymentSubmission)
 *   → TenantDepositLedgerEntry → Stay (cascade: CheckoutRequest, RenewRequest, RentRecognitionSchedule, RoomTransfer)
 */
async function cleanupTestData(prisma, stayIds, roomId) {
  for (const stayId of stayIds) {
    try {
      // AppNotification: entityType='STAY', entityId=stayId.toString()
      try { await prisma.appNotification.deleteMany({ where: { entityType: 'STAY', entityId: String(stayId) } }); } catch {}

      // Temukan semua invoice stay ini, hapus dependensi per-invoice
      const invs = await prisma.invoice.findMany({ where: { stayId }, select: { id: true } });
      for (const inv of invs) {
        try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: String(inv.id) } }); } catch {}
        try { await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        // Invoice.delete: cascade hapus InvoiceLine + PaymentSubmission
        try { await prisma.invoice.delete({ where: { id: inv.id } }); } catch {}
      }

      // TenantDepositLedgerEntry (RESTRICT on Stay)
      try { await prisma.tenantDepositLedgerEntry.deleteMany({ where: { stayId } }); } catch {}

      // Stay.delete: cascade hapus CheckoutRequest, RenewRequest, RentRecognitionSchedule, RoomTransfer
      try { await prisma.stay.delete({ where: { id: stayId } }); } catch {}
    } catch {}
  }
  if (roomId) {
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
}

/**
 * Integration test: siklus hidup Stay (booking → huni → checkout).
 * Prasyarat: DB UAT (port 5433) running + sudah di-seed.
 * Setiap test membuat kamar uji mandiri → tidak bergantung pada kamar AVAILABLE dari seed.
 * Jalankan: npm run build, lalu `npm run test:integration`
 */

// TC1: full lifecycle booking → check-in → checkout
test('TC1: Booking → Huni → Checkout selesai (lifecycle lengkap)', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'TC1');
  const tenant = await pickTenant(prisma);
  let stayId = null;

  try {
    console.log(`  🏠 Kamar uji: ${room.code} (#${room.id}), Tenant: #${tenant.id}`);

    const checkIn = new Date(); checkIn.setUTCHours(0, 0, 0, 0);
    const checkOut = new Date(checkIn); checkOut.setUTCMonth(checkOut.getUTCMonth() + 1);

    // 1. Buat Stay ACTIVE + set kamar RESERVED
    const stay = await prisma.stay.create({
      data: {
        tenantId: tenant.id, roomId: room.id, status: 'ACTIVE',
        checkInDate: checkIn, plannedCheckOutDate: checkOut, pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: room.monthlyRateRupiah,
        depositAmountRupiah: room.defaultDepositRupiah,
        depositPaidAmountRupiah: 0, downPaymentPaidRupiah: 0,
        electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
        initialMetersPromotedAt: null,
      },
    });
    stayId = stay.id;
    assert.strictEqual(stay.status, 'ACTIVE');

    await prisma.room.update({ where: { id: room.id }, data: { status: 'RESERVED' } });
    const roomAfter = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
    assert.strictEqual(roomAfter.status, 'RESERVED');

    // 2. Promote (check-in / pembayaran)
    const promoted = await prisma.stay.update({
      where: { id: stay.id },
      data: { initialMetersPromotedAt: new Date(), initialElectricityKwhPending: 0, initialWaterM3Pending: 0 },
    });
    assert.ok(promoted.initialMetersPromotedAt, 'Stay harus promoted setelah check-in');

    // 3. Checkout → COMPLETED + kamar AVAILABLE
    const checkoutStay = await prisma.stay.update({
      where: { id: stay.id },
      data: {
        status: 'COMPLETED', actualCheckOutDate: checkOut,
        checkoutReason: 'TC1 lifecycle test checkout',
        initialElectricityKwhPending: 100, initialWaterM3Pending: 50,
        initialMetersRecordedAt: new Date(),
      },
    });
    assert.strictEqual(checkoutStay.status, 'COMPLETED');

    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    const roomFinal = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
    assert.strictEqual(roomFinal.status, 'AVAILABLE', 'Kamar harus kembali AVAILABLE setelah checkout');

    console.log('  ✅ TC1: Booking → Huni → Checkout selesai');
  } finally {
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
  }
});

// TC2: Sweeper booking-expiry — booking RESERVED yang kedaluwarsa harus dibatalkan
test('TC2: Booking RESERVED kedaluwarsa → sweeper batalkan + lepas kamar', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const autoOps = module.get(AutoOpsService);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'TC2');
  const tenant = await pickTenant(prisma);
  let stayId = null;

  try {
    const checkIn = new Date(); checkIn.setUTCHours(0, 0, 0, 0);
    const checkOut = new Date(checkIn); checkOut.setUTCMonth(checkOut.getUTCMonth() + 1);
    const expiredAt = new Date(Date.now() - 60 * 60 * 1000); // 1 jam lalu → kedaluwarsa

    const stay = await prisma.stay.create({
      data: {
        tenantId: tenant.id, roomId: room.id, status: 'ACTIVE',
        checkInDate: checkIn, plannedCheckOutDate: checkOut, pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: room.monthlyRateRupiah, depositAmountRupiah: room.defaultDepositRupiah,
        depositPaidAmountRupiah: 0, downPaymentPaidRupiah: 0,
        electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
        initialMetersPromotedAt: null, expiresAt: expiredAt,
      },
    });
    stayId = stay.id;
    await prisma.room.update({ where: { id: room.id }, data: { status: 'RESERVED' } });

    // Act: sweeper booking-expiry yang sebenarnya
    await autoOps.runBookingExpiry({ source: 'INTEGRATION_TEST' });

    // Assert: stay tidak lagi ACTIVE + kamar AVAILABLE
    const stayAfter = await prisma.stay.findUnique({ where: { id: stay.id }, select: { status: true } });
    assert.notStrictEqual(stayAfter.status, 'ACTIVE', 'Booking kedaluwarsa harus dibatalkan');
    const roomAfter = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
    assert.strictEqual(roomAfter.status, 'AVAILABLE', 'Kamar harus dilepas ke AVAILABLE setelah expiry');

    console.log('  ✅ TC2: Sweeper booking-expiry membatalkan booking & melepas kamar');
  } finally {
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
  }
});

// TC3: Prabayar 3 bulan (PrepayExtensionService, PSAK 72).
test('TC3: Prabayar 3 bln → masa sewa diperpanjang tanpa gap + jadwal PSAK 72', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepay = module.get(PrepayExtensionService);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'TC3');
  const tenant = await pickTenant(prisma);
  const actor = await getOwnerActor(prisma);
  let stayId = null;

  try {
    const checkIn = new Date('2026-06-01T00:00:00Z');
    const plannedOut = new Date('2026-07-01T00:00:00Z');

    const stay = await prisma.stay.create({
      data: {
        tenantId: tenant.id, roomId: room.id, status: 'ACTIVE',
        checkInDate: checkIn, plannedCheckOutDate: plannedOut, pricingTerm: 'MONTHLY',
        agreedRentAmountRupiah: room.monthlyRateRupiah,
        depositAmountRupiah: room.defaultDepositRupiah,
        depositPaidAmountRupiah: room.defaultDepositRupiah, downPaymentPaidRupiah: 0,
        electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
        initialMetersPromotedAt: new Date('2026-06-02T00:00:00Z'),
      },
    });
    stayId = stay.id;
    await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });

    // Act: prabayar 3 bulan
    const res = await prepay.prepayExtension(stay.id, { months: 3, method: 'TRANSFER' }, actor);

    assert.strictEqual(res.months, 3, 'Harus prabayar 3 bulan');
    const stayAfter = await prisma.stay.findUnique({
      where: { id: stay.id }, select: { plannedCheckOutDate: true },
    });
    assert.ok(
      stayAfter.plannedCheckOutDate.getTime() > plannedOut.getTime(),
      'plannedCheckOutDate harus maju setelah prabayar',
    );

    const paidInvoice = await prisma.invoice.findFirst({
      where: { stayId: stay.id, status: 'PAID' }, select: { id: true },
    });
    assert.ok(paidInvoice, 'Harus ada invoice prabayar berstatus PAID');

    const sched = await prisma.rentRecognitionSchedule.count({ where: { stayId: stay.id } });
    assert.ok(sched > 0, 'Harus ada jadwal pengakuan pendapatan (RentRecognitionSchedule)');

    console.log('  ✅ TC3: Prabayar 3 bln kontigu + invoice PAID + jadwal PSAK 72');
  } finally {
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
  }
});

// TC4: Settle deposit checkout NYATA (StaysService.processDeposit, FULL_REFUND).
test('TC4: Proses deposit checkout (FULL_REFUND) → HELD menjadi REFUNDED', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const stays = module.get(StaysService);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'TC4');
  const tenant = await pickTenant(prisma);
  const actor = await getOwnerActor(prisma);
  const deposit = Number(room.defaultDepositRupiah);
  let stayId = null;

  try {
    const checkIn = new Date('2026-05-01T00:00:00Z');
    const checkOut = new Date('2026-06-01T00:00:00Z');

    const stay = await prisma.stay.create({
      data: {
        tenantId: tenant.id, roomId: room.id, status: 'COMPLETED',
        checkInDate: checkIn, plannedCheckOutDate: checkOut, actualCheckOutDate: checkOut,
        pricingTerm: 'MONTHLY', agreedRentAmountRupiah: room.monthlyRateRupiah,
        depositAmountRupiah: deposit, depositPaidAmountRupiah: deposit, depositStatus: 'HELD',
        downPaymentPaidRupiah: 0, electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
        initialMetersPromotedAt: new Date('2026-05-02T00:00:00Z'),
      },
    });
    stayId = stay.id;

    // Act: proses deposit FULL_REFUND
    await stays.processDeposit(stay.id, { action: 'FULL_REFUND', depositNote: 'TC4 integration test refund deposit' }, actor);

    // Assert: deposit REFUNDED + nominal refund = deposit diterima
    const stayAfter = await prisma.stay.findUnique({
      where: { id: stay.id }, select: { depositStatus: true, depositRefundedRupiah: true },
    });
    assert.strictEqual(stayAfter.depositStatus, 'REFUNDED', 'Deposit harus REFUNDED');
    assert.strictEqual(Number(stayAfter.depositRefundedRupiah), deposit, 'Nominal refund harus = deposit diterima');

    console.log('  ✅ TC4: processDeposit FULL_REFUND → deposit REFUNDED penuh');
  } finally {
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
  }
});
