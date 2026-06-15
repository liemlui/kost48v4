/* UAT L-3: jurnal reward per tipe. Jalankan dari backend/ setelah `npm run build`:
 *   node scripts/uat-l3-reward-contra-revenue.js
 * Dalam transaksi yang DI-ROLLBACK: posting reward RENT_DISCOUNT & SERVICE_ADDON, lalu cek
 * akun debit (4000 kontra-revenue vs 6300 beban) dan jurnal seimbang. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');
const { AccountingPostingService } = require('../dist/modules/accounting/accounting-posting.service.js');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const svc = new AccountingPostingService(prisma);
const ROLLBACK = new Error('__ROLLBACK__');

async function debitCodeFor(tx, sourceId) {
  const je = await tx.journalEntry.findFirst({ where: { sourceType: 'ADJUSTMENT', sourceId }, select: { id: true, totalDebitRupiah: true, totalCreditRupiah: true } });
  if (!je) return null;
  const lines = await tx.journalLine.findMany({ where: { journalEntryId: je.id }, select: { debitRupiah: true, creditRupiah: true, chartOfAccount: { select: { code: true } } } });
  const debitLine = lines.find((l) => l.debitRupiah > 0);
  const creditLine = lines.find((l) => l.creditRupiah > 0);
  return { debitCode: debitLine?.chartOfAccount.code, creditCode: creditLine?.chartOfAccount.code, totalDebit: je.totalDebitRupiah, totalCredit: je.totalCreditRupiah };
}

(async () => {
  let ok = false, out = {};
  try {
    const base = Date.now();
    await prisma.$transaction(async (tx) => {
      // RENT_DISCOUNT → kontra-revenue 4000
      await svc.postRewardFulfillmentTx(tx, { redemptionId: base + 1, valueRupiah: 100000, entryDate: new Date(), rewardType: 'RENT_DISCOUNT', memo: 'UAT L3 rent' });
      const rent = await debitCodeFor(tx, `REWARD_FULFILL:${base + 1}`);
      // METER_DISCOUNT → kontra-revenue 4100
      await svc.postRewardFulfillmentTx(tx, { redemptionId: base + 2, valueRupiah: 50000, entryDate: new Date(), rewardType: 'METER_DISCOUNT', memo: 'UAT L3 meter' });
      const meter = await debitCodeFor(tx, `REWARD_FULFILL:${base + 2}`);
      // SERVICE_ADDON → beban 6300 (perilaku lama tetap)
      await svc.postRewardFulfillmentTx(tx, { redemptionId: base + 3, valueRupiah: 75000, entryDate: new Date(), rewardType: 'SERVICE_ADDON', memo: 'UAT L3 service' });
      const service = await debitCodeFor(tx, `REWARD_FULFILL:${base + 3}`);
      out = { rent, meter, service };

      assert.strictEqual(rent.debitCode, '4000', 'RENT_DISCOUNT debit ke 4000 (Room Rent Revenue)');
      assert.strictEqual(rent.creditCode, '2100', 'RENT_DISCOUNT credit ke 2100 (AP)');
      assert.strictEqual(rent.totalDebit, rent.totalCredit, 'jurnal rent seimbang');
      assert.strictEqual(meter.debitCode, '4100', 'METER_DISCOUNT debit ke 4100 (Electricity Revenue)');
      assert.strictEqual(meter.totalDebit, meter.totalCredit, 'jurnal meter seimbang');
      assert.strictEqual(service.debitCode, '6300', 'SERVICE_ADDON debit ke 6300 (Marketing) — tak berubah');
      assert.strictEqual(service.totalDebit, service.totalCredit, 'jurnal service seimbang');

      ok = true;
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) { console.error('\n❌ UAT L-3 GAGAL:', e); await prisma.$disconnect(); process.exit(1); }
  }
  console.log('Detail:', JSON.stringify(out, null, 2));
  console.log(ok ? '\n✅ UAT L-3 LULUS: diskon sewa→4000, diskon listrik→4100, addon→6300; semua jurnal seimbang (rollback).' : '\n❌');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
})();
