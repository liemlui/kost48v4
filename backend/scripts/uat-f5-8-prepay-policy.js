/* UAT F5-8 (prabayar A-5/A-6/A-7): jalankan dari backend/ setelah `npm run build`:
 *   node scripts/uat-f5-8-prepay-policy.js
 * Membuat data sintetis (committed), menjalankan PrepayExtensionService, lalu MEMBERSIHKAN.
 * Asersi: A-6 blokir saat menunggak; A-5 tarif diskon SMESTERLY; A-7 poin; TRIAL BALANCE seimbang. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');
const { AccountingPostingService } = require('../dist/modules/accounting/accounting-posting.service.js');
const { RentRecognitionService } = require('../dist/modules/accounting/rent-recognition.service.js');
const { LoyaltyService } = require('../dist/modules/loyalty/loyalty.service.js');
const { AuditLogService } = require('../dist/audit-log/audit-log.service.js');
const { PrepayExtensionService } = require('../dist/modules/stays/prepay-extension.service.js');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const posting = new AccountingPostingService(prisma);
const svc = new PrepayExtensionService(prisma, posting, new RentRecognitionService(prisma, posting), new AuditLogService(prisma), new LoyaltyService(prisma));

async function tb() {
  const a = await prisma.journalEntry.aggregate({ where: { status: 'POSTED' }, _sum: { totalDebitRupiah: true, totalCreditRupiah: true } });
  return { d: a._sum.totalDebitRupiah ?? 0, c: a._sum.totalCreditRupiah ?? 0 };
}

(async () => {
  const suffix = Date.now().toString().slice(-8);
  const actor = await prisma.user.findFirst({ where: { isActive: true, role: { in: ['OWNER', 'ADMIN'] } }, select: { id: true, role: true } });
  const monthly = 1500000;
  let room, tenant, stay, blockingInv;
  let ok = false;
  try {
    room = await prisma.room.create({ data: { code: `UAT-F58-${suffix}`, monthlyRateRupiah: monthly, electricityTariffPerKwhRupiah: 1500, waterTariffPerM3Rupiah: 8000 } });
    tenant = await prisma.tenant.create({ data: { fullName: `UAT F58 ${suffix}`, phone: `0811${suffix}` } });
    stay = await prisma.stay.create({ data: { tenantId: tenant.id, roomId: room.id, agreedRentAmountRupiah: monthly, checkInDate: new Date('2026-05-01'), pricingTerm: 'MONTHLY', status: 'ACTIVE', initialMetersPromotedAt: new Date('2026-05-01'), plannedCheckOutDate: new Date('2026-07-01') } });

    const tbBefore = await tb();
    assert.strictEqual(tbBefore.d, tbBefore.c, 'TB seimbang sebelum');

    // ── A-6: blokir prabayar saat ada tagihan menunggak ──
    blockingInv = await prisma.invoice.create({ data: { invoiceNumber: `INV-BLOCK-${suffix}`, stayId: stay.id, status: 'ISSUED', periodStart: new Date('2026-06-01'), periodEnd: new Date('2026-07-01'), totalAmountRupiah: 1500000, issuedAt: new Date(), createdById: actor.id } });
    await assert.rejects(
      () => svc.prepayExtension(stay.id, { months: 6, rateTerm: 'SMESTERLY' }, actor),
      /menunggak|belum lunas/i,
      'A-6: prabayar harus ditolak saat ada tagihan menunggak',
    );
    // Hapus tagihan penghalang agar bisa lanjut tes A-5/A-7.
    await prisma.invoice.delete({ where: { id: blockingInv.id } });
    blockingInv = null;

    // ── A-5 (tarif diskon SMESTERLY) + A-7 (poin) ──
    const res = await svc.prepayExtension(stay.id, { months: 6, rateTerm: 'SMESTERLY', method: 'TRANSFER' }, actor);
    const effExpected = Math.round((monthly * 5.5) / 6); // 1.375.000
    const totalExpected = effExpected * 6;
    assert.strictEqual(res.rateTerm, 'SMESTERLY', 'rateTerm SMESTERLY');
    assert.strictEqual(res.monthlyRentRupiah, effExpected, `effectiveMonthly = ${effExpected}`);
    assert.strictEqual(res.totalRupiah, totalExpected, `total prabayar = ${totalExpected}`);
    assert.ok(totalExpected < monthly * 6, 'tarif diskon < 6× bulanan penuh');

    // Deferral (Unearned 2200) + recognition schedule.
    const inv = await prisma.invoice.findFirst({ where: { stayId: stay.id, invoiceNumber: { contains: '-PRE-' } }, select: { id: true, totalAmountRupiah: true, status: true } });
    assert.strictEqual(inv.totalAmountRupiah, totalExpected, 'invoice total = total prabayar');
    assert.strictEqual(inv.status, 'PAID', 'invoice prabayar PAID');
    const sched = await prisma.rentRecognitionSchedule.findMany({ where: { stayId: stay.id }, select: { scheduledAmountRupiah: true } });
    const schedSum = sched.reduce((s, r) => s + r.scheduledAmountRupiah, 0);
    assert.strictEqual(sched.length, 6, '6 baris recognition');
    assert.strictEqual(schedSum, totalExpected, 'Σ recognition = total (tak ada selisih)');

    // A-7: poin loyalitas.
    const pts = await prisma.loyaltyPoint.aggregate({ where: { tenantId: tenant.id }, _sum: { delta: true } });
    assert.ok((pts._sum.delta ?? 0) > 0, 'A-7: poin loyalitas diberikan saat prabayar');

    // TB tetap seimbang.
    const tbAfter = await tb();
    assert.strictEqual(tbAfter.d, tbAfter.c, 'TB seimbang sesudah');

    console.log(JSON.stringify({ effectiveMonthly: res.monthlyRentRupiah, total: res.totalRupiah, fullPriceWouldBe: monthly * 6, recognitionRows: sched.length, recognitionSum: schedSum, loyaltyPoints: pts._sum.delta, tbAfter }, null, 2));
    ok = true;
  } catch (e) {
    console.error('\n❌ UAT F5-8 GAGAL:', e);
  } finally {
    // ── Cleanup (urutan FK). Jurnal sintetis BERIMBANG & tanpa FK ke invoice → dibiarkan
    //    (TB tetap seimbang; UAT DB = data testing disposable). ──
    try {
      if (blockingInv) await prisma.invoice.delete({ where: { id: blockingInv.id } }).catch(() => {});
      if (stay) {
        const invs = await prisma.invoice.findMany({ where: { stayId: stay.id }, select: { id: true } });
        const invIds = invs.map((i) => i.id);
        await prisma.rentRecognitionSchedule.deleteMany({ where: { stayId: stay.id } });
        await prisma.loyaltyPoint.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.invoicePayment.deleteMany({ where: { invoiceId: { in: invIds } } });
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: { in: invIds } } });
        await prisma.invoice.deleteMany({ where: { stayId: stay.id } });
        await prisma.meterReading.deleteMany({ where: { roomId: room.id } });
        await prisma.stay.delete({ where: { id: stay.id } });
      }
      if (tenant) await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
      if (room) await prisma.room.delete({ where: { id: room.id } }).catch(() => {});
    } catch (ce) { console.warn('cleanup warning:', ce?.message ?? ce); }
    await prisma.$disconnect();
    console.log(ok ? '\n✅ UAT F5-8 LULUS: A-6 blokir, A-5 diskon, A-7 poin, TB seimbang (data sintetis dibersihkan).' : '\n❌ UAT F5-8 GAGAL');
    process.exit(ok ? 0 : 1);
  }
})();
