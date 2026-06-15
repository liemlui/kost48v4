/* UAT F5-7 (AUD-1): tagih utilitas kamar lama saat pindah kamar.
 * Jalankan dari backend/ setelah `npm run build`:
 *   node scripts/uat-f5-7-old-room-utility.js
 * Membuat data sintetis (room+tenant+stay+meter) DALAM transaksi yang DI-ROLLBACK,
 * lalu menagih utilitas kamar lama (helper + postInvoiceIssuedTx) dan memastikan:
 *  - invoice total = Σ(konsumsi × tarif),
 *  - jurnal invoice SEIMBANG (totalDebit == totalCredit). */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma } = require('../src/generated/prisma');
const { createRenewUtilityCheckpointLineTx } = require('../dist/modules/stays/stays-service-helpers.js');
const { AccountingPostingService } = require('../dist/modules/accounting/accounting-posting.service.js');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const svc = new AccountingPostingService(prisma);
const ROLLBACK = new Error('__ROLLBACK__');

(async () => {
  let passed = false;
  let captured = {};
  try {
    const actor = await prisma.user.findFirst({ where: { isActive: true }, select: { id: true } });
    const actorId = actor?.id ?? null;
    const elecTariff = 1500;
    const waterTariff = 8000;
    const suffix = Date.now().toString().slice(-8);

    await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({ data: { code: `UAT-F57-${suffix}`, monthlyRateRupiah: 1500000, electricityTariffPerKwhRupiah: elecTariff, waterTariffPerM3Rupiah: waterTariff } });
      const tenant = await tx.tenant.create({ data: { fullName: `UAT F57 ${suffix}`, phone: `0800${suffix}` } });
      const checkIn = new Date('2026-05-01');
      const stay = await tx.stay.create({ data: {
        tenantId: tenant.id, roomId: room.id, agreedRentAmountRupiah: 1500000, checkInDate: checkIn,
        pricingTerm: 'MONTHLY', status: 'ACTIVE', initialMetersPromotedAt: checkIn,
        electricityTariffPerKwhRupiah: elecTariff, waterTariffPerM3Rupiah: waterTariff,
      } });
      // Baseline meter (sebelum pindah).
      await tx.meterReading.create({ data: { roomId: room.id, utilityType: 'ELECTRICITY', readingAt: checkIn, readingValue: new Prisma.Decimal(100) } });
      await tx.meterReading.create({ data: { roomId: room.id, utilityType: 'WATER', readingAt: checkIn, readingValue: new Prisma.Decimal(20) } });

      // ── Replikasi billOldRoomUtilityTx ──
      const transferDate = new Date('2026-06-15');
      let invoice = await tx.invoice.create({ data: {
        invoiceNumber: `INV-TRF-UAT-${suffix}`, stayId: stay.id, status: 'DRAFT',
        periodStart: transferDate, periodEnd: transferDate, dueDate: transferDate,
        notes: 'UAT utilitas kamar lama', createdById: actorId,
      } });
      const elec = await createRenewUtilityCheckpointLineTx(tx, { roomId: room.id, invoiceId: invoice.id, utilityType: 'ELECTRICITY', label: 'listrik', unit: 'kWh', newReadingValue: new Prisma.Decimal(110), readingAt: transferDate, tariffRupiah: elecTariff, actorId, sortOrder: 0 });
      const water = await createRenewUtilityCheckpointLineTx(tx, { roomId: room.id, invoiceId: invoice.id, utilityType: 'WATER', label: 'air', unit: 'm³', newReadingValue: new Prisma.Decimal(23), readingAt: transferDate, tariffRupiah: waterTariff, actorId, sortOrder: 1 });
      const total = Number(elec.amountRupiah) + Number(water.amountRupiah);
      invoice = await tx.invoice.update({ where: { id: invoice.id }, data: { totalAmountRupiah: total, status: 'ISSUED', issuedAt: new Date() } });
      const posting = await svc.postInvoiceIssuedTx(tx, invoice.id, actorId);

      // Jurnal yang dibuat utk invoice ini.
      const entry = await tx.journalEntry.findFirst({ where: { sourceType: 'INVOICE', sourceId: String(invoice.id) }, select: { totalDebitRupiah: true, totalCreditRupiah: true, status: true } });
      captured = {
        elecConsumptionKwh: Number(elec.usageDelta), elecAmount: Number(elec.amountRupiah),
        waterConsumptionM3: Number(water.usageDelta), waterAmount: Number(water.amountRupiah),
        invoiceTotal: total, posting: posting ? { posted: posting.posted, skipped: posting.skipped } : null,
        entry,
      };

      // Asersi (di dalam tx).
      assert.strictEqual(captured.elecAmount, 10 * elecTariff, 'listrik = 10 kWh × tarif');
      assert.strictEqual(captured.waterAmount, 3 * waterTariff, 'air = 3 m³ × tarif');
      assert.strictEqual(total, 10 * elecTariff + 3 * waterTariff, 'total invoice = Σ konsumsi×tarif');
      assert.ok(entry, 'jurnal invoice harus dibuat');
      assert.strictEqual(entry.totalDebitRupiah, entry.totalCreditRupiah, 'jurnal SEIMBANG (debit==kredit)');
      assert.strictEqual(entry.totalDebitRupiah, total, 'nilai jurnal = total invoice');

      passed = true;
      throw ROLLBACK; // batalkan semua data sintetis
    });
  } catch (err) {
    if (err !== ROLLBACK) {
      console.error('\n❌ UAT F5-7 GAGAL:', err);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
  console.log('Detail:', JSON.stringify(captured, null, 2));
  console.log(passed ? '\n✅ UAT F5-7 LULUS: utilitas kamar lama tertagih, jurnal seimbang (rollback bersih).' : '\n❌ tidak lulus');
  await prisma.$disconnect();
  process.exit(passed ? 0 : 1);
})();
