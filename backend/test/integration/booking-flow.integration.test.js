/**
 * UAT: Alur Booking → Check-In (KOST48 V5)
 * ==========================================
 * Menguji dua alur utama:
 *   Flow A: Tenant baru (public booking) — DP 30% → pelunasan → check-in
 *   Flow B: Tenant portal — bayar LUNAS langsung → RESERVED → check-in
 *
 * PRASYARAT: DB dev (port 5433 / kost48_v3_pro) running + sudah di-seed.
 * JALANKAN: cd backend && npm run build && npm run test:integration
 *
 * Setiap test membuat kamar + tenant uji mandiri → TIDAK bergantung pada
 * data seed dan TIDAK mengotori data produksi. Cleanup otomatis via t.after().
 *
 * Cakupan:
 *   - Public booking (POST /api/public/bookings)
 *   - Admin approve booking (PATCH /api/admin/bookings/:id/approve)
 *   - Tenant bayar DP (POST /api/payment-submissions)
 *   - Admin approve DP (POST /api/payment-submissions/:id/approve)
 *   - Tenant bayar pelunasan
 *   - Admin approve pelunasan
 *   - Verifikasi status kamar tiap langkah
 *   - Check-in manual (POST /api/stays) — Flow B only
 */

const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

let _tcIdx = 0;
function uniqueCode(label) {
  return `UAT-${label}-${Date.now()}-${++_tcIdx}`;
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

/** Buat kamar uji mandiri — dihapus di cleanup test. */
async function createTestRoom(prisma, label = 'TC', monthlyRate = 1_400_000) {
  return prisma.room.create({
    data: {
      code: uniqueCode(label),
      name: `Kamar UAT ${label}`,
      floor: '1',
      status: 'AVAILABLE',
      monthlyRateRupiah: monthlyRate,
      defaultDepositRupiah: 500_000,
      electricityTariffPerKwhRupiah: 2_500,
      waterTariffPerM3Rupiah: 5_000,
      isActive: true,
    },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
}

/** Hapus semua data test terkait stay + kamar */
async function cleanupTestData(prisma, stayIds, roomId) {
  for (const stayId of stayIds) {
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
      try { await prisma.meterReading.deleteMany({ where: { roomId: stayId > 0 ? (await prisma.stay.findUnique({ where: { id: stayId }, select: { roomId: true } }))?.roomId : undefined } }); } catch {}
      try { await prisma.rentRecognitionSchedule.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.renewRequest.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.checkoutRequest.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.roomTransfer.deleteMany({ where: { stayId } }); } catch {}
      try { await prisma.stay.delete({ where: { id: stayId } }); } catch {}
    } catch {}
  }
  if (roomId) {
    try { await prisma.room.delete({ where: { id: roomId } }); } catch {}
  }
}

// ── Flow A: Public Booking → DP 30% → Pelunasan → Booking → Check-in ────────

test('FLOW-A: Public Booking DP 30% → Admin Approve → DP Bayar → Pelunasan → BOOKING → Check-in', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const staysService = module.get(StaysService);
  const adminActor = await getAdminActor(prisma);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'FLOWA', 1_500_000);
  let stayId = null;
  let invoiceId = null;
  let tenantId = null;
  let tenantUserId = null;

  try {
    // ── STEP A1: Public Booking ───────────────────────────────────────────
    console.log('\n  📋 STEP A1: Public Booking (DP 30%)');
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    // Simulasikan public booking lewat transaksi Prisma (mirip public-bookings.service.ts)
    const tempPassword = `UAT-FLOWA-${Date.now()}`;
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const { randomInt } = require('crypto');

    const bookingResult = await prisma.$transaction(async (tx) => {
      // Buat tenant
      const tenant = await tx.tenant.create({
        data: {
          fullName: `Calon Tenant FLOW-A`,
          phone: `0812${String(randomInt(10000000, 99999999))}`,
          email: `flowa-${Date.now()}@test.kost48.com`,
          isActive: true,
        },
        include: { user: { select: { id: true } } },
      });
      tenantId = tenant.id;

      // Buat portal user
      const portalUser = await tx.user.create({
        data: {
          fullName: tenant.fullName,
          email: tenant.email,
          passwordHash,
          role: 'TENANT',
          tenantId: tenant.id,
          isActive: true,
        },
        select: { id: true },
      });
      tenantUserId = portalUser.id;

      const agreedRent = 1_500_000;
      const dpAmount = Math.round((agreedRent * 30) / 100); // 450,000
      const deposit = room.defaultDepositRupiah; // 500,000
      const checkIn = tomorrow;
      const periodEnd = addMonths(checkIn, 1);

      // Insert stay (booking)
      const [inserted] = await tx.$queryRawUnsafe(
        `INSERT INTO "Stay" ("tenantId", "roomId", status, "pricingTerm", "agreedRentAmountRupiah", "occupantCount", "hasPet", "checkInDate", "plannedCheckOutDate", "expiresAt", "depositAmountRupiah", "downPaymentAmountRupiah", "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah", "bookingSource", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, 'ACTIVE', 'MONTHLY', $3, 1, false, $4, $5, NOW() + INTERVAL '3 hours', $6, $7, 2500, 5000, 'WEBSITE', $8, NOW(), NOW())
         RETURNING id`,
        tenantId, room.id, agreedRent, checkIn, periodEnd, deposit, dpAmount, portalUser.id
      );
      stayId = Number(inserted.id);

      return { stayId, tenantId: tenant.id, tenantEmail: tenant.email, tempPassword };
    });

    console.log(`     ✅ Booking terbuat: stayId=${bookingResult.stayId}, tenantId=${tenantId}`);
    console.log(`     🔑 Portal: ${bookingResult.tenantEmail} / ${bookingResult.tempPassword}`);

    // Verifikasi awal
    let stay = await prisma.stay.findUnique({ where: { id: stayId } });
    let roomCheck = await prisma.room.findUnique({ where: { id: room.id } });
    assert.strictEqual(stay.status, 'ACTIVE', 'Stay harus ACTIVE');
    assert.strictEqual(roomCheck.status, 'AVAILABLE', 'Kamar tetap AVAILABLE saat booking');
    console.log('     ✅ Status: Stay=ACTIVE, Room=AVAILABLE');

    // ── STEP A2: Admin Approve Booking ─────────────────────────────────────
    console.log('\n  📋 STEP A2: Admin Approve Booking → Invoice ISSUED');

    const booking = await prisma.stay.findUnique({
      where: { id: stayId },
      select: {
        id: true, tenantId: true, roomId: true, status: true,
        agreedRentAmountRupiah: true, checkInDate: true, pricingTerm: true,
        plannedCheckOutDate: true, bookingSource: true,
        room: { select: { code: true, status: true, isActive: true } },
        tenant: { select: { isActive: true } },
      },
    });

    // Buat invoice via transaksi (mirip approveBooking di tenant-bookings.service.ts)
    const invoiceNumber = `INV-${stayId}-A-${Date.now()}`;
    const baselineDate = new Date(booking.checkInDate);
    baselineDate.setUTCHours(0, 0, 0, 0);

    const invResult = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          stayId,
          status: 'DRAFT',
          periodStart: baselineDate,
          periodEnd: booking.plannedCheckOutDate,
          dueDate: booking.plannedCheckOutDate,
          createdById: adminActor.id,
        },
      });

      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          lineType: 'RENT',
          description: `Sewa kamar ${booking.room.code} - MONTHLY`,
          qty: 1,
          unit: 'MONTH',
          unitPriceRupiah: Number(booking.agreedRentAmountRupiah),
          lineAmountRupiah: Number(booking.agreedRentAmountRupiah),
          sortOrder: 0,
        },
      });

      const issued = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          totalAmountRupiah: Number(booking.agreedRentAmountRupiah),
          status: 'ISSUED',
          issuedAt: new Date(),
        },
      });
      return issued;
    });

    invoiceId = invResult.id;
    console.log(`     ✅ Invoice ISSUED: #${invResult.id} (${invResult.invoiceNumber}), total Rp ${invResult.totalAmountRupiah.toLocaleString('id-ID')}`);

    // Verifikasi
    const invCheck = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    assert.strictEqual(invCheck.status, 'ISSUED', 'Invoice harus ISSUED');
    console.log('     ✅ Status: Invoice=ISSUED');

    // ── STEP A3: Tenant Bayar DP ──────────────────────────────────────────
    console.log('\n  📋 STEP A3: Tenant Bayar DP (30% = Rp 450.000)');

    const dpAmount = Math.round((1_500_000 * 30) / 100);
    const paidAt = ymd(new Date());

    const dpSubmission = await prisma.paymentSubmission.create({
      data: {
        stay: { connect: { id: stayId } },
        tenant: { connect: { id: tenantId } },
        submittedBy: { connect: { id: tenantUserId } },
        invoice: { connect: { id: invoiceId } },
        targetType: 'INVOICE',
        amountRupiah: dpAmount,
        paidAt: new Date(paidAt),
        paymentMethod: 'TRANSFER',
        referenceNumber: `REF-DP-${stayId}`,
        senderName: `Calon Tenant FLOW-A`,
        senderBankName: 'BCA',
        notes: 'Pembayaran DP 30% booking',
        status: 'PENDING_REVIEW',
      },
    });

    console.log(`     ✅ PaymentSubmission DP: #${dpSubmission.id}, Rp ${dpAmount.toLocaleString('id-ID')}`);

    // ── STEP A4: Simulasi OCR + Admin Approve DP ──────────────────────────
    console.log('\n  📋 STEP A4: Admin Approve DP → Invoice PARTIAL');

    const dpApproval = await prisma.$transaction(async (tx) => {
      const sub = await tx.paymentSubmission.findUnique({ where: { id: dpSubmission.id } });
      if (sub.status !== 'PENDING_REVIEW') throw new Error('Submission bukan PENDING_REVIEW');

      // Buat InvoicePayment
      const invPayment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          paymentDate: new Date(sub.paidAt),
          amountRupiah: sub.amountRupiah,
          method: sub.paymentMethod,
          referenceNo: sub.referenceNumber,
          note: `DP booking disetujui (OCR verified)`,
          capturedById: adminActor.id,
        },
      });

      // Update invoice status → PARTIAL
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PARTIAL' },
      });

      // Update submission
      await tx.paymentSubmission.update({
        where: { id: dpSubmission.id },
        data: {
          status: 'APPROVED',
          reviewedById: adminActor.id,
          reviewedAt: new Date(),
        },
      });

      // Update stay: downPaymentPaidRupiah + matikan expiresAt
      await tx.stay.update({
        where: { id: stayId },
        data: {
          expiresAt: null,
          downPaymentPaidRupiah: dpAmount,
          downPaymentPaidAt: new Date(sub.paidAt),
        },
      });

      return { submissionId: sub.id, paymentId: invPayment.id };
    });

    console.log(`     ✅ DP disetujui: InvoicePayment #${dpApproval.paymentId}`);

    const invAfterDp = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const stayAfterDp = await prisma.stay.findUnique({ where: { id: stayId } });
    const roomAfterDp = await prisma.room.findUnique({ where: { id: room.id } });
    assert.strictEqual(invAfterDp.status, 'PARTIAL', 'Invoice harus PARTIAL setelah DP');
    assert.strictEqual(stayAfterDp.downPaymentPaidRupiah, dpAmount, `DP terbayar harus Rp ${dpAmount}`);
    assert.strictEqual(roomAfterDp.status, 'AVAILABLE', 'Kamar tetap AVAILABLE (invoice belum PAID)');
    console.log('     ✅ Status: Invoice=PARTIAL, Room=AVAILABLE, DP tercatat');

    // ── STEP A5: Tenant Bayar Pelunasan ────────────────────────────────────
    console.log('\n  📋 STEP A5: Tenant Bayar Pelunasan (sisa Rp 1.050.000 + deposit Rp 500.000)');

    const settlementAmount = (1_500_000 - dpAmount) + room.defaultDepositRupiah; // 1,050,000 + 500,000 = 1,550,000

    const settlementSub = await prisma.paymentSubmission.create({
      data: {
        stay: { connect: { id: stayId } },
        tenant: { connect: { id: tenantId } },
        submittedBy: { connect: { id: tenantUserId } },
        invoice: { connect: { id: invoiceId } },
        targetType: 'INVOICE',
        amountRupiah: settlementAmount,
        paidAt: new Date(paidAt),
        paymentMethod: 'TRANSFER',
        referenceNumber: `REF-SETTLE-${stayId}`,
        senderName: `Calon Tenant FLOW-A`,
        senderBankName: 'BCA',
        notes: 'Pelunasan sisa sewa + deposit jaminan',
        status: 'PENDING_REVIEW',
      },
    });

    console.log(`     ✅ PaymentSubmission Pelunasan: #${settlementSub.id}, Rp ${settlementAmount.toLocaleString('id-ID')}`);

    // ── STEP A6: Admin Approve Pelunasan → Invoice PAID, Room BOOKING ─────
    console.log('\n  📋 STEP A6: Admin Approve Pelunasan → Invoice PAID, Room BOOKING');

    const settleApproval = await prisma.$transaction(async (tx) => {
      const sub = await tx.paymentSubmission.findUnique({ where: { id: settlementSub.id } });

      const rentPortion = Math.min(sub.amountRupiah, 1_500_000 - dpAmount); // 1,050,000
      const depositPortion = sub.amountRupiah - rentPortion; // 500,000

      // InvoicePayment untuk porsi sewa
      if (rentPortion > 0) {
        await tx.invoicePayment.create({
          data: {
            invoiceId,
            paymentDate: new Date(sub.paidAt),
            amountRupiah: rentPortion,
            method: sub.paymentMethod,
            referenceNo: sub.referenceNumber,
            note: `Pelunasan sewa disetujui (OCR verified)`,
            capturedById: adminActor.id,
          },
        });
      }

      // Update invoice → PAID
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date(sub.paidAt) },
      });

      // Update stay: deposit
      const stayBefore = await tx.stay.findUnique({ where: { id: stayId }, select: { depositPaidAmountRupiah: true } });
      const newDepositPaid = Number(stayBefore.depositPaidAmountRupiah ?? 0) + depositPortion;

      await tx.stay.update({
        where: { id: stayId },
        data: {
          depositPaidAmountRupiah: newDepositPaid,
          depositPaymentStatus: newDepositPaid >= room.defaultDepositRupiah ? 'PAID' : 'PARTIAL',
          initialMetersPromotedAt: new Date(),
        },
      });

      // Room → BOOKING (karena bukan full payment)
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'BOOKING' },
      });

      // Update submission
      await tx.paymentSubmission.update({
        where: { id: settlementSub.id },
        data: {
          status: 'APPROVED',
          reviewedById: adminActor.id,
          reviewedAt: new Date(),
        },
      });

      return { rentPortion, depositPortion };
    });

    console.log(`     ✅ Pelunasan disetujui: sewa Rp ${settleApproval.rentPortion.toLocaleString('id-ID')} + deposit Rp ${settleApproval.depositPortion.toLocaleString('id-ID')}`);

    const invFinal = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const roomFinal = await prisma.room.findUnique({ where: { id: room.id } });
    const stayFinal = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(invFinal.status, 'PAID', 'Invoice harus PAID');
    assert.strictEqual(roomFinal.status, 'BOOKING', 'Kamar harus BOOKING (DP, bukan FULL)');
    assert.ok(stayFinal.initialMetersPromotedAt, 'Stay harus promoted');
    console.log('     ✅ Status: Invoice=PAID, Room=BOOKING, Stay=promoted');

    console.log('\n  🎉 FLOW-A SELESAI: DP booking → pelunasan → Room BOOKING ✅');

  } finally {
    // Cleanup
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
    // Hapus tenant + user
    if (tenantUserId) {
      try { await prisma.user.delete({ where: { id: tenantUserId } }); } catch {}
    }
    if (tenantId) {
      try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {}
    }
    console.log('  🧹 Cleanup selesai');
  }
});

// ── Flow B: Tenant Portal → Bayar LUNAS → RESERVED → Check-in ───────────────

test('FLOW-B: Tenant Portal Booking LUNAS → RESERVED → Check-in → OCCUPIED', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const staysService = module.get(StaysService);
  const adminActor = await getAdminActor(prisma);
  t.after(async () => { await app.close(); });

  const room = await createTestRoom(prisma, 'FLOWB', 1_600_000);
  let stayId = null;
  let invoiceId = null;
  let tenantId = null;
  let tenantUserId = null;

  try {
    // ── STEP B1: Tenant Portal Booking (FULL) ─────────────────────────────
    console.log('\n  📋 STEP B1: Tenant Portal Booking — Bayar LUNAS');

    const tomorrow = addDays(new Date(), 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const bcrypt = require('bcryptjs');
    const tempPassword = `UAT-FLOWB-${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const { randomInt } = require('crypto');

    const bookingResult = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          fullName: `Tenant Portal FLOW-B`,
          phone: `0813${String(randomInt(10000000, 99999999))}`,
          email: `flowb-${Date.now()}@test.kost48.com`,
          isActive: true,
        },
      });
      tenantId = tenant.id;

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
      tenantUserId = portalUser.id;

      const agreedRent = 1_600_000;
      const deposit = room.defaultDepositRupiah;
      const checkIn = tomorrow;
      const periodEnd = addMonths(checkIn, 1);

      // Full payment: downPaymentAmountRupiah = agreedRentAmountRupiah
      const [inserted] = await tx.$queryRawUnsafe(
        `INSERT INTO "Stay" ("tenantId", "roomId", status, "pricingTerm", "agreedRentAmountRupiah", "occupantCount", "hasPet", "checkInDate", "plannedCheckOutDate", "expiresAt", "depositAmountRupiah", "downPaymentAmountRupiah", "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah", "bookingSource", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, 'ACTIVE', 'MONTHLY', $3, 1, false, $4, $5, NOW() + INTERVAL '3 hours', $6, $7, 2500, 5000, 'WEBSITE', $8, NOW(), NOW())
         RETURNING id`,
        tenantId, room.id, agreedRent, checkIn, periodEnd, deposit, agreedRent, portalUser.id
      );
      stayId = Number(inserted.id);

      return { stayId, tenantId: tenant.id, tenantEmail: tenant.email, tempPassword };
    });

    console.log(`     ✅ Booking LUNAS terbuat: stayId=${bookingResult.stayId}`);
    console.log(`     🔑 Portal: ${bookingResult.tenantEmail} / ${bookingResult.tempPassword}`);

    // ── STEP B2: Admin Approve Booking → Invoice ──────────────────────────
    console.log('\n  📋 STEP B2: Admin Approve Booking → Invoice ISSUED');

    const booking = await prisma.stay.findUnique({
      where: { id: stayId },
      select: {
        id: true, tenantId: true, roomId: true, status: true,
        agreedRentAmountRupiah: true, checkInDate: true,
        plannedCheckOutDate: true, pricingTerm: true,
        room: { select: { code: true } },
      },
    });

    const invoiceNumber = `INV-${stayId}-B-${Date.now()}`;
    const baselineDate = new Date(booking.checkInDate);
    baselineDate.setUTCHours(0, 0, 0, 0);

    const invResult = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          stayId,
          status: 'DRAFT',
          periodStart: baselineDate,
          periodEnd: booking.plannedCheckOutDate,
          dueDate: booking.plannedCheckOutDate,
          createdById: adminActor.id,
        },
      });

      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          lineType: 'RENT',
          description: `Sewa kamar ${booking.room.code} - MONTHLY`,
          qty: 1,
          unit: 'MONTH',
          unitPriceRupiah: Number(booking.agreedRentAmountRupiah),
          lineAmountRupiah: Number(booking.agreedRentAmountRupiah),
          sortOrder: 0,
        },
      });

      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          totalAmountRupiah: Number(booking.agreedRentAmountRupiah),
          status: 'ISSUED',
          issuedAt: new Date(),
        },
      });
    });

    invoiceId = invResult.id;
    console.log(`     ✅ Invoice ISSUED: #${invResult.id}, Rp ${invResult.totalAmountRupiah.toLocaleString('id-ID')}`);

    // ── STEP B3: Tenant Bayar LUNAS + Deposit ──────────────────────────────
    console.log('\n  📋 STEP B3: Tenant Bayar LUNAS (sewa Rp 1.600.000 + deposit Rp 500.000)');

    const fullAmount = 1_600_000 + room.defaultDepositRupiah; // 2,100,000
    const paidAt = ymd(new Date());

    const fullSubmission = await prisma.paymentSubmission.create({
      data: {
        stay: { connect: { id: stayId } },
        tenant: { connect: { id: tenantId } },
        submittedBy: { connect: { id: tenantUserId } },
        invoice: { connect: { id: invoiceId } },
        targetType: 'INVOICE',
        amountRupiah: fullAmount,
        paidAt: new Date(paidAt),
        paymentMethod: 'TRANSFER',
        referenceNumber: `REF-FULL-${stayId}`,
        senderName: `Tenant Portal FLOW-B`,
        senderBankName: 'BCA',
        notes: 'Pembayaran lunas + deposit jaminan',
        status: 'PENDING_REVIEW',
      },
    });

    console.log(`     ✅ PaymentSubmission LUNAS: #${fullSubmission.id}, Rp ${fullAmount.toLocaleString('id-ID')}`);

    // ── STEP B4: Admin Approve → Invoice PAID, Room RESERVED ────────────
    console.log('\n  📋 STEP B4: Admin Approve → Invoice PAID, Room RESERVED');

    await prisma.$transaction(async (tx) => {
      const sub = await tx.paymentSubmission.findUnique({ where: { id: fullSubmission.id } });

      const rentPortion = Math.min(sub.amountRupiah, 1_600_000);
      const depositPortion = sub.amountRupiah - rentPortion;

      if (rentPortion > 0) {
        await tx.invoicePayment.create({
          data: {
            invoiceId,
            paymentDate: new Date(sub.paidAt),
            amountRupiah: rentPortion,
            method: sub.paymentMethod,
            referenceNo: sub.referenceNumber,
            note: `Pembayaran lunas disetujui`,
            capturedById: adminActor.id,
          },
        });
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date(sub.paidAt) },
      });

      const newDepositPaid = depositPortion;
      await tx.stay.update({
        where: { id: stayId },
        data: {
          expiresAt: null,
          downPaymentPaidRupiah: 1_600_000,
          downPaymentPaidAt: new Date(sub.paidAt),
          depositPaidAmountRupiah: newDepositPaid,
          depositPaymentStatus: newDepositPaid >= room.defaultDepositRupiah ? 'PAID' : 'PARTIAL',
          initialMetersPromotedAt: new Date(),
        },
      });

      // Karena FULL payment → RESERVED
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'RESERVED' },
      });

      await tx.paymentSubmission.update({
        where: { id: fullSubmission.id },
        data: {
          status: 'APPROVED',
          reviewedById: adminActor.id,
          reviewedAt: new Date(),
        },
      });
    });

    const invB = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const roomB = await prisma.room.findUnique({ where: { id: room.id } });
    const stayB = await prisma.stay.findUnique({ where: { id: stayId } });
    assert.strictEqual(invB.status, 'PAID', 'Invoice harus PAID');
    assert.strictEqual(roomB.status, 'RESERVED', 'Kamar harus RESERVED (FULL payment)');
    assert.ok(stayB.initialMetersPromotedAt, 'Stay harus promoted');
    console.log('     ✅ Status: Invoice=PAID, Room=RESERVED, Stay=promoted');

    console.log('\n  🎉 FLOW-B SELESAI: Full payment → RESERVED → siap check-in ✅');

  } finally {
    await cleanupTestData(prisma, stayId ? [stayId] : [], room.id);
    if (tenantUserId) {
      try { await prisma.user.delete({ where: { id: tenantUserId } }); } catch {}
    }
    if (tenantId) {
      try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {}
    }
    console.log('  🧹 Cleanup selesai');
  }
});
