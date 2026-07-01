/**
 * Integration test: Payment Flow (Y-J7)
 * ======================================
 * Alur: invoice ISSUED → submit proof → approve → PAID + jurnal
 */
'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { PaymentSubmissionsService } = require('../../dist/modules/payment-submissions/payment-submissions.service.js');
const { AccountingPostingService } = require('../../dist/modules/accounting/accounting-posting.service.js');

let _tcIdx = 0;
function uniqueCode(label) { return `INT-PAY-${label}-${Date.now()}-${++_tcIdx}`; }
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

async function bootstrap() {
  const m = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const a = m.createNestApplication(); await a.init(); return { module: m, app: a };
}

async function getAdmin(prisma) {
  const a = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  assert.ok(a); return { id: a.id, role: 'ADMIN', email: a.email, tenantId: null };
}

async function cleanup(prisma, { stayId, roomId, tenantId, userId }) {
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
      try { await prisma.meterReading.deleteMany({ where: { roomId: (await prisma.stay.findUnique({ where: { id: stayId }, select: { roomId: true } }))?.roomId } }); } catch {}
      try { await prisma.stay.delete({ where: { id: stayId } }); } catch {}
    } catch {}
  }
  if (roomId) { try { await prisma.meterReading.deleteMany({ where: { roomId } }); } catch {} try { await prisma.room.delete({ where: { id: roomId } }); } catch {} }
  if (tenantId) { try { await prisma.tenant.delete({ where: { id: tenantId } }); } catch {} }
  if (userId) { try { await prisma.user.delete({ where: { id: userId } }); } catch {} }
}

test('Y-J7: Payment Flow — invoice → submit → approve → PAID + jurnal', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const paySub = module.get(PaymentSubmissionsService);
  const adminActor = await getAdmin(prisma);
  const bcrypt = require('bcryptjs');
  const { randomInt } = require('crypto');

  let roomId, stayId, tenantId, userId;
  t.after(async () => { await cleanup(prisma, { stayId, roomId, tenantId, userId }); await app.close(); });

  try {
    console.log('\n  📋 Y-J7: Payment Flow');

    // Setup: room + stay (booking-style, promoted)
    const room = await prisma.room.create({
      data: { code: uniqueCode('PMT'), name: 'Kamar Payment Test', floor: '1', status: 'AVAILABLE',
        monthlyRateRupiah: 1_500_000, defaultDepositRupiah: 500_000, electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000, isActive: true },
      select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
    });
    roomId = room.id;

    const checkIn = addDays(new Date(), -30); checkIn.setUTCHours(0, 0, 0, 0);
    const tempPass = `UAT-PMT-${Date.now()}`;
    const pwHash = await bcrypt.hash(tempPass, 10);
    const { stay, tenant, portalUser } = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({ data: { fullName: 'Tenant Payment Test', phone: `0812${randomInt(10000000, 99999999)}`, email: `pay-${Date.now()}@test.kost48.com`, isActive: true, identityNumber: '1234567890123456', emergencyContactPhone: '081234567890', emergencyContactName: 'EC' } });
      const u = await tx.user.create({ data: { fullName: t.fullName, email: t.email, passwordHash: pwHash, role: 'TENANT', tenantId: t.id, isActive: true } });
      const s = await tx.stay.create({ data: { tenantId: t.id, roomId: room.id, status: 'ACTIVE', pricingTerm: 'MONTHLY', agreedRentAmountRupiah: room.monthlyRateRupiah, occupantCount: 1, hasPet: false, checkInDate: checkIn, plannedCheckOutDate: addDays(checkIn, 30), depositAmountRupiah: room.defaultDepositRupiah, depositPaidAmountRupiah: room.defaultDepositRupiah, depositStatus: 'HELD', electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000, bookingSource: 'WEBSITE', createdById: adminActor.id, initialMetersPromotedAt: checkIn } });
      return { stay: s, tenant: t, portalUser: u };
    });
    stayId = stay.id; tenantId = tenant.id; userId = portalUser.id;
    console.log(`     ✅ Room=${room.code}, Stay=#${stay.id}`);

    // Buat invoice ISSUED
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({ data: { invoiceNumber: `INV-TEST-${Date.now()}`, stayId, status: 'DRAFT', periodStart: checkIn, periodEnd: addDays(checkIn, 30), dueDate: addDays(checkIn, 30), createdById: adminActor.id } });
      await tx.invoiceLine.create({ data: { invoiceId: inv.id, lineType: 'RENT', description: `Sewa ${room.code}`, qty: 1, unit: 'MONTH', unitPriceRupiah: room.monthlyRateRupiah, lineAmountRupiah: room.monthlyRateRupiah, sortOrder: 0 } });
      return tx.invoice.update({ where: { id: inv.id }, data: { totalAmountRupiah: room.monthlyRateRupiah, status: 'ISSUED', issuedAt: new Date() } });
    });
    console.log(`     ✅ Invoice #${invoice.id} ISSUED: Rp ${Number(invoice.totalAmountRupiah).toLocaleString('id-ID')}`);

    // Tenant submit payment (CASH — no file needed)
    const tenantActor = { id: portalUser.id, role: 'TENANT', tenantId: tenant.id };
    const submission = await paySub.createSubmission(tenantActor, {
      stayId,
      invoiceId: invoice.id,
      amountRupiah: Number(invoice.totalAmountRupiah),
      paidAt: ymd(new Date()),
      paymentMethod: 'CASH',
      senderName: tenant.fullName,
      notes: 'Pembayaran tunai integration test',
    });
    assert.ok(submission.id, 'Submission harus terbuat');
    assert.strictEqual(submission.status, 'PENDING_REVIEW', 'Status harus PENDING_REVIEW');
    console.log(`     ✅ PaymentSubmission #${submission.id} PENDING_REVIEW`);

    // Admin approve payment
    const approved = await paySub.approveSubmission(adminActor, submission.id);
    assert.strictEqual(approved.status, 'APPROVED', 'Submission harus APPROVED');
    console.log(`     ✅ PaymentSubmission #${submission.id} APPROVED`);

    // Verifikasi invoice jadi PAID
    const invPaid = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert.strictEqual(invPaid.status, 'PAID', 'Invoice harus PAID');
    console.log(`     ✅ Invoice #${invoice.id} PAID`);

    // Verifikasi InvoicePayment
    const payment = await prisma.invoicePayment.findFirst({ where: { invoiceId: invoice.id } });
    assert.ok(payment, 'InvoicePayment harus terbuat');
    console.log(`     ✅ InvoicePayment #${payment.id}: Rp ${Number(payment.amountRupiah).toLocaleString('id-ID')}`);

    // Verifikasi journal entry terbuat (sourceType=INVOICE_PAYMENT, sourceId=paymentId)
    const journal = await prisma.journalEntry.findFirst({
      where: { sourceType: 'INVOICE_PAYMENT', sourceId: String(payment.id) },
      include: { lines: true },
    });
    assert.ok(journal, 'Journal entry harus terbuat');
    assert.ok(journal.lines.length >= 2, 'Jurnal harus memiliki ≥2 lines (double-entry)');
    console.log(`     ✅ Journal entry #${journal.id} terbuat dengan ${journal.lines.length} lines`);

    console.log('  🎉 Y-J7 SELESAI ✅');
  } catch (err) {
    console.error('\n  ❌ Y-J7 GAGAL:', err.message); throw err;
  }
});
