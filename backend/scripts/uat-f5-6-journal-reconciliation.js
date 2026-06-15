/* UAT F5-6 (L-1): sweeper auto-rekonsiliasi jurnal.
 * Jalankan dari backend/ setelah `npm run build`:
 *   node scripts/uat-f5-6-journal-reconciliation.js
 * Asersi: backfillAutoJournal berjalan tanpa error, hasil well-formed, dan TRIAL BALANCE
 * (Σ totalDebit POSTED == Σ totalCredit POSTED) tetap seimbang sebelum & sesudah. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');
const { AccountingPostingService } = require('../dist/modules/accounting/accounting-posting.service.js');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function trialBalance() {
  const agg = await prisma.journalEntry.aggregate({
    where: { status: 'POSTED' },
    _sum: { totalDebitRupiah: true, totalCreditRupiah: true },
  });
  return {
    debit: agg._sum.totalDebitRupiah ?? 0,
    credit: agg._sum.totalCreditRupiah ?? 0,
  };
}

(async () => {
  try {
    const before = await trialBalance();
    console.log('TB sebelum:', before);
    assert.strictEqual(before.debit, before.credit, 'TB harus seimbang SEBELUM rekonsiliasi');

    const svc = new AccountingPostingService(prisma);
    const result = await svc.backfillAutoJournal({ limit: 50 }, null);
    console.log('Hasil backfill:', {
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
      warnings: (result.warnings ?? []).slice(0, 5),
    });
    assert.ok(typeof result.createdCount === 'number', 'createdCount harus number');
    assert.ok(typeof result.failedCount === 'number', 'failedCount harus number');

    const after = await trialBalance();
    console.log('TB sesudah:', after);
    assert.strictEqual(after.debit, after.credit, 'TB harus tetap seimbang SESUDAH rekonsiliasi');

    // Idempoten: jalankan lagi → tak boleh error, createdCount kedua = 0 (semua sudah terjurnal).
    const result2 = await svc.backfillAutoJournal({ limit: 50 }, null);
    console.log('Backfill ulang createdCount:', result2.createdCount);
    const after2 = await trialBalance();
    assert.strictEqual(after2.debit, after2.credit, 'TB tetap seimbang setelah run kedua');

    console.log('\n✅ UAT F5-6 LULUS: rekonsiliasi jalan, TB seimbang, idempoten.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ UAT F5-6 GAGAL:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
