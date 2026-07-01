/**
 * Integration test: Checkout Flow (Y-J5)
 * =======================================
 * Menguji siklus checkout penuh:
 *   Tenant aktif → create checkout request → Admin approve
 *   → Final checkout (StaysService.complete) → MAINTENANCE + inspeksi
 *   → Process deposit (FULL_REFUND) → kamar siap
 *
 * PRASYARAT: DB dev (port 5433 / kost48_v3_pro) running + sudah di-seed.
 * JALANKAN: cd backend && npm run build && npm run test:integration
 */

'use strict';
// Load .env from backend/ directory for standalone execution
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { CheckoutRequestsService } = require('../../dist/modules/checkout-requests/checkout-requests.service.js');
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `INT-CHK-${label}-${Date.now()}-${++_tcIdx}`;
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

async function createTestRoom(prisma, label = 'CHK') {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar Checkout Test ${label}`,
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
 * Buat stay ACTIVE + promoted dengan tenant + user portal + meter reading
 * (mirip booking flow test, tapi sudah check-in dan tinggal).
 */
async function createActiveStay(prisma, room, adminActor) {
  const bcrypt = require('bcryptjs');
  const { randomInt } = require('crypto');
  const tempPassword = `UAT-CHK-${Date.now()}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const checkIn = addDays(new Date(), -60); // 2 bulan lalu
  checkIn.setUTCHours(0, 0, 0, 0);
  const periodEnd = addMonths(checkIn, 6);
  const agreedRent = room.monthlyRateRupiah;
  const deposit = room.defaultDepositRupiah;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        fullName: `Tenant Checkout Test`,
        phone: `0812${String(randomInt(10000000, 99999999))}`,
        email: `chk-${Date.now()}@test.kost48.com`,
        isActive: true,
        identityNumber: '1234567890123456',
        emergencyContactPhone: '081234567890',
        emergencyContactName: 'Emergency Contact',
      },
    });

    const portalUser = await tx.user.create({
      data: {
        fullName: tenant.fullName,
        email: tenant.email,
        passwordHash,
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
        agreedRentAmountRupiah: agreedRent,
        occupantCount: 1,
        hasPet: false,
        checkInDate: checkIn,
        plannedCheckOutDate: periodEnd,
        depositAmountRupiah: deposit,
        depositPaidAmountRupiah: deposit,
        depositStatus: 'HELD',
        downPaymentAmountRupiah: 0,
        electricityTariffPerKwhRupiah: 2_500,
        waterTariffPerM3Rupiah: 5_000,
        bookingSource: 'WEBSITE',
        createdById: adminActor.id,
        initialMetersPromotedAt: checkIn, // sudah promoted / check-in
      },
    });

    // Catat meter listrik (prasyarat final checkout)
    await tx.meterReading.create({
      data: {
        roomId: room.id,
        utilityType: 'ELECTRICITY',
        readingValue: 100,
        readingAt: addDays(checkIn, 55),
        recordedById: adminActor.id,
      },
    });

    // Catat meter air
    await tx.meterReading.create({
      data: {
        roomId: room.id,
        utilityType: 'WATER',
        readingValue: 50,
        readingAt: addDays(checkIn, 55),
        recordedById: adminActor.id,
      },
    });

    return { stay, tenant, portalUser, tempPassword };
  });

  return result;
}

/**
 * Hapus semua data test — urutan sesuai FK constraints.
 */
async function cleanupTestData(prisma, { stayId, roomId, tenantId, userId } = {}) {
  if (stayId) {
    try {
      try { await prisma.appNotification.deleteMany({ where: { entityType: 'STAY', entityId: String(stayId) } }); } catch {}
      try { await prisma.checkoutRequest.deleteMany({ where: { stayId } }); } catch {}

      const invs = await prisma.invoice.findMany({ where: { stayId }, select: { id: true } });
      for (const inv of invs) {
        try { await prisma.loyaltyPoint.deleteMany({ where: { sourceType: 'INVOICE', sourceId: String(inv.id) } }); } catch {}
        try { await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.paymentSubmission.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } }); } catch {}
        try { await prisma.invoice.delete({ where: { id: inv.id } }); } catch {}
      }
      try { await prisma.tenantDepositLedgerEntry.deleteMany({ where: { stayId } }); } catch {}
      // MeterReading tidak punya stayId — dihapus via roomId di bawah
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
  if (userId) {
    try { await prisma.user.delete({ where: { id: userId } }); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J5: Checkout Flow — request → approve → final → deposit → room release
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J5: Checkout Flow — request → approve → final checkout → deposit settlement', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const checkoutRequests = module.get(CheckoutRequestsService);
  const staysService = module.get(StaysService);
  const adminActor = await getAdminActor(prisma);
  const ownerActor = await getOwnerActor(prisma);

  // Data test — akan di-cleanup
  let stayId = null;
  let roomId = null;
  let tenantId = null;
  let userId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId, userId });
    await app.close();
  });

  try {
    // ── STEP 1: Setup — buat kamar + stay aktif ─────────────────────────
    console.log('\n  📋 STEP 1: Setup kamar + stay aktif');
    const room = await createTestRoom(prisma, 'YJ5');
    roomId = room.id;

    const { stay, tenant, portalUser } = await createActiveStay(prisma, room, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;
    userId = portalUser.id;

    const tenantActor = { id: portalUser.id, role: 'TENANT', tenantId: tenant.id };
    console.log(`     ✅ Room=${room.code}, Stay=#${stay.id}, Tenant=${tenant.fullName}`);

    // Verifikasi state awal
    let stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(stayCheck.status, 'ACTIVE', 'Stay harus ACTIVE');
    assert.strictEqual(stayCheck.depositStatus, 'HELD', 'Deposit harus HELD');
    assert.ok(stayCheck.initialMetersPromotedAt, 'Stay harus promoted (check-in)');
    console.log('     ✅ Status awal: Stay=ACTIVE, Deposit=HELD');

    // ── STEP 2: Tenant buat checkout request ────────────────────────────
    console.log('\n  📋 STEP 2: Tenant membuat checkout request');
    const checkoutDate = addDays(new Date(), 7); // H+7
    checkoutDate.setUTCHours(0, 0, 0, 0);

    const checkoutReq = await checkoutRequests.createRequest({
      stayId,
      requestedCheckOutDate: ymd(checkoutDate),
      checkoutReason: 'Selesai ujian',
      requestNotes: 'Mau pindah ke kos lain',
    }, tenantActor);

    assert.ok(checkoutReq.id, 'Checkout request harus terbuat');
    assert.strictEqual(checkoutReq.status, 'PENDING', 'Status harus PENDING');
    console.log(`     ✅ Checkout request #${checkoutReq.id} terbuat, status=PENDING`);

    // ── STEP 3: Admin approve checkout request ──────────────────────────
    console.log('\n  📋 STEP 3: Admin approve checkout request');
    const approved = await checkoutRequests.approveRequest(
      checkoutReq.id,
      { reviewNotes: 'Disetujui, silakan lanjut proses checkout' },
      adminActor,
    );

    assert.strictEqual(approved.status, 'APPROVED', 'Status harus APPROVED');
    console.log(`     ✅ Checkout request #${approved.id} approved`);

    // Verifikasi plannedCheckOutDate di-update
    stayCheck = await prisma.stay.findUnique({ where: { id: stayId } });
    const updatedPcDate = new Date(stayCheck.plannedCheckOutDate);
    const expectedDate = new Date(checkoutDate);
    assert.strictEqual(ymd(updatedPcDate), ymd(expectedDate),
      'plannedCheckOutDate harus sesuai tanggal yang diajukan');
    console.log(`     ✅ plannedCheckOutDate di-update ke ${ymd(updatedPcDate)}`);

    // ── STEP 4: Catat meter final (prasyarat final checkout) ────────────
    console.log('\n  📋 STEP 4: Catat meter listrik final');
    const finalMeter = await prisma.meterReading.create({
      data: {
        roomId: room.id,
        utilityType: 'ELECTRICITY',
        readingValue: 150, // naik 50 kwh
        readingAt: checkoutDate,
        recordedById: adminActor.id,
      },
    });
    assert.ok(finalMeter.id, 'Meter final harus tercatat');
    console.log(`     ✅ Meter listrik final: 150 kwh`);

    // ── STEP 5: Final checkout (StaysService.complete) ──────────────────
    console.log('\n  📋 STEP 5: Final checkout oleh admin');
    const completeDto = {
      actualCheckOutDate: ymd(checkoutDate),
      checkoutReason: 'CHECKOUT_REQUEST',
      notes: 'Checkout sesuai permintaan tenant',
    };

    const completed = await staysService.complete(stayId, completeDto, adminActor);
    assert.strictEqual(completed.status, 'COMPLETED', 'Stay harus COMPLETED');
    console.log(`     ✅ Stay #${stayId} status=COMPLETED`);

    // Verifikasi kamar jadi MAINTENANCE
    const roomAfter = await prisma.room.findUnique({ where: { id: room.id } });
    assert.strictEqual(roomAfter.status, 'MAINTENANCE', 'Kamar harus MAINTENANCE setelah checkout');
    console.log(`     ✅ Kamar ${room.code} status=MAINTENANCE`);

    // Verifikasi inspection ticket terbuat
    const ticket = await prisma.ticket.findFirst({
      where: { stayId, category: 'CHECKOUT_INSPECTION' },
    });
    assert.ok(ticket, 'Tiket inspeksi checkout harus terbuat');
    console.log(`     ✅ Tiket inspeksi #${ticket.ticketNumber} terbuat`);

    // Verifikasi belongingsDeadline terisi
    const stayFinal = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.ok(stayFinal.belongingsDeadline, 'belongingsDeadline harus terisi');
    console.log(`     ✅ belongingsDeadline: ${ymd(stayFinal.belongingsDeadline)}`);

    // ── STEP 6: Process deposit (FULL_REFUND) ──────────────────────────
    console.log('\n  📋 STEP 6: Proses deposit — FULL_REFUND');

    // Tutup tiket inspeksi dulu agar kamar bisa AVAILABLE
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });

    const depositResult = await staysService.processDeposit(
      stayId,
      {
        action: 'FULL_REFUND',
        depositNote: 'Deposit dikembalikan penuh - tidak ada kerusakan',
      },
      ownerActor,
    );

    assert.strictEqual(depositResult.depositStatus, 'REFUNDED', 'Deposit harus REFUNDED');
    assert.ok(Number(depositResult.depositRefundedRupiah) > 0, 'Harus ada refund');
    console.log(`     ✅ Deposit status=REFUNDED, refund=Rp ${Number(depositResult.depositRefundedRupiah).toLocaleString('id-ID')}`);

    // ── STEP 7: Admin set kamar kembali AVAILABLE ───────────────────────
    console.log('\n  📋 STEP 7: Kamar dikembalikan ke AVAILABLE');
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'AVAILABLE' },
    });

    const roomFinal = await prisma.room.findUnique({ where: { id: room.id } });
    assert.strictEqual(roomFinal.status, 'AVAILABLE', 'Kamar harus AVAILABLE');
    console.log(`     ✅ Kamar ${room.code} status=AVAILABLE — siap huni lagi`);

    // ── STEP 8: Verifikasi jurnal deposit settlement ────────────────────
    console.log('\n  📋 STEP 8: Verifikasi jurnal deposit');
    const ledgerEntries = await prisma.tenantDepositLedgerEntry.findMany({
      where: { stayId },
    });
    assert.ok(ledgerEntries.length > 0, 'Harus ada catatan ledger deposit');
    console.log(`     ✅ ${ledgerEntries.length} entry ledger deposit tercatat`);

    console.log('\n  🎉 Y-J5 SELESAI: Seluruh siklus checkout berhasil ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J5 GAGAL:', err.message);
    throw err;
  }
});

test('Y-J5b: Checkout Request — reject flow', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const checkoutRequests = module.get(CheckoutRequestsService);
  const adminActor = await getAdminActor(prisma);

  let roomId = null;
  let stayId = null;
  let tenantId = null;
  let userId = null;

  t.after(async () => {
    await cleanupTestData(prisma, { stayId, roomId, tenantId, userId });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J5b: Checkout Request — reject flow');

    // Setup
    const room = await createTestRoom(prisma, 'YJ5b');
    roomId = room.id;
    const { stay, tenant, portalUser } = await createActiveStay(prisma, room, adminActor);
    stayId = stay.id;
    tenantId = tenant.id;
    userId = portalUser.id;
    const tenantActor = { id: portalUser.id, role: 'TENANT', tenantId: tenant.id };

    // Buat checkout request
    const chkDate = addDays(new Date(), 5);
    chkDate.setUTCHours(0, 0, 0, 0);
    const req = await checkoutRequests.createRequest({
      stayId,
      requestedCheckOutDate: ymd(chkDate),
      checkoutReason: 'Tes reject',
    }, tenantActor);
    assert.strictEqual(req.status, 'PENDING');

    // Reject
    const rejected = await checkoutRequests.rejectRequest(
      req.id,
      { reviewNotes: 'Ditolak karena ada tagihan belum dibayar' },
      adminActor,
    );
    assert.strictEqual(rejected.status, 'REJECTED');
    console.log(`     ✅ Checkout request #${req.id} ditolak, status=REJECTED`);
    console.log('  🎉 Y-J5b SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J5b GAGAL:', err.message);
    throw err;
  }
});
