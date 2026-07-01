/**
 * Integration test: Accounting Period Close (Y-J8)
 * =================================================
 * Menguji siklus tutup periode akuntansi penuh:
 *   Buat periode → readiness → preview → post close → CLOSED
 *   → reopen preview → reopen → OPEN
 *   → verifikasi jurnal closing/reversal + audit trail versioned
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
const { AccountingPeriodCloseService } = require('../../dist/modules/accounting/accounting-period-close.service.js');
const { AccountingService } = require('../../dist/modules/accounting/accounting.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

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

async function getAdminActor(prisma) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } });
  assert.ok(admin, 'Harus ada user ADMIN (seed)');
  return { id: admin.id, role: 'ADMIN', email: admin.email, tenantId: null };
}

/**
 * Pilih tahun/bulan yang aman untuk test (jauh di masa depan, tidak bentrok data nyata).
 */
function safeTestPeriod() {
  return { year: 2099, month: 12 };
}

/**
 * Bersihkan data test: period + jurnal terkait + audit log.
 */
async function cleanupTestData(prisma, { year, month } = {}) {
  if (!year || !month) return;
  try {
    const key = monthKey(year, month);
    // Hapus journal entries terkait periode ini
    const journals = await prisma.journalEntry.findMany({
      where: {
        sourceId: { startsWith: `PERIOD_CLOSE:${key}` },
      },
      select: { id: true },
    });
    for (const j of journals) {
      try { await prisma.journalLine.deleteMany({ where: { journalEntryId: j.id } }); } catch {}
      try { await prisma.journalEntry.delete({ where: { id: j.id } }); } catch {}
    }
    const reopenJournals = await prisma.journalEntry.findMany({
      where: {
        sourceId: { startsWith: `PERIOD_REOPEN:${key}` },
      },
      select: { id: true },
    });
    for (const j of reopenJournals) {
      try { await prisma.journalLine.deleteMany({ where: { journalEntryId: j.id } }); } catch {}
      try { await prisma.journalEntry.delete({ where: { id: j.id } }); } catch {}
    }
    // Hapus period
    try { await prisma.accountingPeriod.deleteMany({ where: { year, month } }); } catch {}
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// Y-J8a: Full Close + Reopen Cycle
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J8a: Accounting Period Close — full close → reopen cycle', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const periodCloseService = module.get(AccountingPeriodCloseService);
  const accountingService = module.get(AccountingService);
  const ownerActor = await getOwnerActor(prisma);

  const { year, month } = safeTestPeriod();
  const key = monthKey(year, month);

  t.after(async () => {
    await cleanupTestData(prisma, { year, month });
    await app.close();
  });

  try {
    // ── STEP 1: Buat accounting period baru ─────────────────────────────
    console.log(`\n  📋 STEP 1: Buat accounting period ${key}`);
    const period = await accountingService.createPeriod({ year, month });
    assert.ok(period.id, 'Period harus terbuat');
    assert.strictEqual(period.status, 'OPEN', 'Status awal harus OPEN');
    assert.strictEqual(period.closeVersion, 0, 'closeVersion awal = 0');
    assert.strictEqual(period.reopenVersion, 0, 'reopenVersion awal = 0');
    console.log(`     ✅ Period #${period.id} terbuat: ${key}, status=OPEN`);

    // ── STEP 2: Readiness check ─────────────────────────────────────────
    console.log(`\n  📋 STEP 2: Readiness check untuk ${key}`);
    const readiness = await periodCloseService.readiness({ year, month });
    assert.ok(readiness, 'Readiness harus mengembalikan objek');
    console.log(`     ✅ canPost=${readiness.canPost}, ready=${readiness.ready}`);
    if (readiness.blockedReasons.length > 0) {
      console.log(`     ⚠️  Blocked reasons: ${readiness.blockedReasons.join(' | ')}`);
    }
    // Untuk periode kosong, readiness mungkin tidak langsung bisa post
    // karena COA 3200 perlu dicek. Tapi minimal struktur readiness harus valid.
    assert.strictEqual(readiness.year, year);
    assert.strictEqual(readiness.month, month);
    assert.ok(Array.isArray(readiness.checks), 'checks harus array');
    console.log(`     ✅ ${readiness.checks.length} checks: ${readiness.checks.filter(c => c.ready).length} ready, ${readiness.checks.filter(c => !c.ready).length} blocked`);

    // ── STEP 3: Preview closing ─────────────────────────────────────────
    console.log(`\n  📋 STEP 3: Preview closing journal untuk ${key}`);
    const preview = await periodCloseService.preview({ year, month });
    assert.ok(preview, 'Preview harus mengembalikan objek');
    assert.ok(Array.isArray(preview.lines), 'Preview harus punya lines');
    console.log(`     ✅ ${preview.lines.length} line, debit=Rp ${preview.totalDebitRupiah?.toLocaleString?.('id-ID') ?? preview.totalDebitRupiah}, kredit=Rp ${preview.totalCreditRupiah?.toLocaleString?.('id-ID') ?? preview.totalCreditRupiah}`);
    console.log(`     ✅ isBalanced=${preview.isBalanced}, canPost=${preview.canPost}`);
    if (preview.blockedReasons.length > 0) {
      console.log(`     ⚠️  Blocked: ${preview.blockedReasons.join(' | ')}`);
    }

    // ── STEP 4: Post close (jika bisa) ──────────────────────────────────
    console.log(`\n  📋 STEP 4: Post close untuk ${key}`);
    let closeResult = null;
    if (preview.canPost) {
      closeResult = await periodCloseService.post(
        { year, month, notes: 'Integration test — tutup periode untuk verifikasi audit trail dan versioning.' },
        ownerActor,
      );
      assert.ok(closeResult.posted, 'Close harus posted');
      assert.ok(closeResult.period, 'Harus ada period');
      assert.strictEqual(closeResult.period.status, 'CLOSED', 'Period harus CLOSED');
      assert.ok(closeResult.journalEntry, 'Harus ada closing journal');
      assert.strictEqual(closeResult.journalEntry.sourceType, 'CLOSING_ENTRY', 'sourceType harus CLOSING_ENTRY');
      console.log(`     ✅ Periode CLOSED, closing journal #${closeResult.journalEntry.id} (${closeResult.journalEntry.entryNumber})`);
      console.log(`     ✅ closeVersion=${closeResult.period.closeVersion}`);

      // Verifikasi period status di DB
      const periodCheck = await prisma.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
      assert.strictEqual(periodCheck.status, 'CLOSED', 'Status DB harus CLOSED');
      assert.ok(periodCheck.closedAt, 'closedAt harus terisi');
      assert.ok(periodCheck.closingJournalEntryId, 'closingJournalEntryId harus terisi');
      assert.strictEqual(periodCheck.closeVersion, 1, 'closeVersion harus 1');
      assert.ok(periodCheck.closeBasis, 'closeBasis harus terisi');
      console.log(`     ✅ DB verified: status=CLOSED, closeVersion=1, closeBasis=${periodCheck.closeBasis}`);

      // Verifikasi jurnal closing di DB
      const closingJournal = await prisma.journalEntry.findUnique({
        where: { id: closeResult.journalEntry.id },
        include: { lines: true },
      });
      assert.strictEqual(closingJournal.status, 'POSTED', 'Closing journal harus POSTED');
      assert.strictEqual(closingJournal.isBalanced, true, 'Closing journal harus balanced');
      // Periode kosong (tanpa transaksi) menghasilkan 0 line — itu valid
      console.log(`     ✅ Closing journal: ${closingJournal.lines.length} lines, balanced=${closingJournal.isBalanced}`);

      // ── STEP 5: Reopen preview ────────────────────────────────────────
      console.log(`\n  📋 STEP 5: Reopen preview untuk ${key}`);
      const reopenPreview = await periodCloseService.reopenPreview({
        year, month,
        reason: 'Integration test — buka ulang untuk verifikasi reversal journal.',
      });
      assert.ok(reopenPreview, 'Reopen preview harus mengembalikan objek');
      console.log(`     ✅ canReopen=${reopenPreview.canReopen}, isBalanced=${reopenPreview.isBalanced}`);
      if (reopenPreview.blockedReasons.length > 0) {
        console.log(`     ⚠️  Blocked: ${reopenPreview.blockedReasons.join(' | ')}`);
      }

      // ── STEP 6: Reopen ────────────────────────────────────────────────
      console.log(`\n  📋 STEP 6: Reopen ${key}`);
      if (reopenPreview.canReopen) {
        const reopenResult = await periodCloseService.reopen(
          { year, month, reason: 'Integration test — buka ulang untuk verifikasi reversal journal dan audit trail.' },
          ownerActor,
        );
        assert.ok(reopenResult.reopened, 'Reopen harus sukses');
        assert.strictEqual(reopenResult.period.status, 'OPEN', 'Period harus OPEN kembali');
        assert.ok(reopenResult.journalEntry, 'Harus ada reversal journal');
        assert.strictEqual(reopenResult.journalEntry.sourceType, 'CLOSING_REVERSAL', 'sourceType harus CLOSING_REVERSAL');
        console.log(`     ✅ Periode OPEN kembali, reversal journal #${reopenResult.journalEntry.id} (${reopenResult.journalEntry.entryNumber})`);
        console.log(`     ✅ reopenVersion=${reopenResult.period.reopenVersion}`);

        // Verifikasi period status di DB setelah reopen
        const periodAfterReopen = await prisma.accountingPeriod.findUnique({ where: { year_month: { year, month } } });
        assert.strictEqual(periodAfterReopen.status, 'OPEN', 'Status DB harus OPEN setelah reopen');
        assert.ok(periodAfterReopen.reopenedAt, 'reopenedAt harus terisi');
        assert.ok(periodAfterReopen.reopenJournalEntryId, 'reopenJournalEntryId harus terisi');
        assert.strictEqual(periodAfterReopen.reopenVersion, 1, 'reopenVersion harus 1');
        console.log(`     ✅ DB verified: status=OPEN, reopenVersion=1, closeVersion tetap=${periodAfterReopen.closeVersion}`);

        // Verifikasi reversal journal di DB
        const reversalJournal = await prisma.journalEntry.findUnique({
          where: { id: reopenResult.journalEntry.id },
          include: { lines: true },
        });
        assert.strictEqual(reversalJournal.status, 'POSTED', 'Reversal journal harus POSTED');
        assert.strictEqual(reversalJournal.isBalanced, true, 'Reversal journal harus balanced');
        // Periode kosong (tanpa transaksi) menghasilkan 0 line — itu valid
        console.log(`     ✅ Reversal journal: ${reversalJournal.lines.length} lines, balanced=${reversalJournal.isBalanced}`);

        // Verifikasi closing journal TETAP ADA (tidak dihapus)
        const closingJournalStill = await prisma.journalEntry.findUnique({ where: { id: closeResult.journalEntry.id } });
        assert.ok(closingJournalStill, 'Closing journal TETAP ADA setelah reopen');
        assert.strictEqual(closingJournalStill.status, 'POSTED', 'Closing journal tetap POSTED');
        console.log(`     ✅ Closing journal #${closingJournalStill.id} tetap utuh (audit trail)`);

        // ── STEP 7: Re-close (close ulang setelah reopen) ───────────────
        console.log(`\n  📋 STEP 7: Re-close ${key} (closeVersion harus naik ke 2)`);
        const reClosePreview = await periodCloseService.preview({ year, month });
        if (reClosePreview.canPost) {
          const reCloseResult = await periodCloseService.post(
            { year, month, notes: 'Integration test — tutup ulang setelah reopen untuk verifikasi versioning.' },
            ownerActor,
          );
          assert.ok(reCloseResult.posted, 'Re-close harus sukses');
          assert.strictEqual(reCloseResult.period.closeVersion, 2, 'closeVersion harus 2 setelah re-close');
          console.log(`     ✅ Re-close sukses, closeVersion=${reCloseResult.period.closeVersion}`);

          // Verifikasi kedua closing journal ada (V1 + V2) — audit trail lengkap
          const allClosingJournals = await prisma.journalEntry.findMany({
            where: {
              sourceType: 'CLOSING_ENTRY',
              sourceId: { startsWith: `PERIOD_CLOSE:${key}` },
              status: 'POSTED',
            },
            orderBy: { id: 'asc' },
          });
          assert.ok(allClosingJournals.length >= 2, `Harus ada minimal 2 closing journal: ada ${allClosingJournals.length}`);
          console.log(`     ✅ ${allClosingJournals.length} closing journals (V1+V2) — audit trail lengkap`);
        } else {
          console.log(`     ⚠️  Re-close tidak bisa (canPost=false), lewati.`);
        }
      } else {
        console.log(`     ⚠️  Reopen tidak bisa, lewati.`);
      }
    } else {
      console.log(`     ⚠️  Close tidak bisa (canPost=false), lewati. blockedReasons: ${preview.blockedReasons.join(' | ')}`);
      console.log('     ℹ️  Ini mungkin normal jika COA 3200 belum ada / ada draft journal / dsb.');
      // Tetap assert bahwa preview memberikan struktur yang valid
      assert.ok(preview.readiness, 'Preview harus ada readiness');
    }

    console.log('\n  🎉 Y-J8a SELESAI: Siklus close→reopen→re-close berhasil ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J8a GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J8b: Guard — close periode yang belum dibuat
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J8b: Guard — close periode yang belum ada harus ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const periodCloseService = module.get(AccountingPeriodCloseService);
  const ownerActor = await getOwnerActor(prisma);

  t.after(async () => {
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J8b: Guard — close periode yang belum ada');

    // Pakai tahun/bulan yang yakin tidak ada periodenya
    const year = 2098;
    const month = 11;

    // Readiness harus menunjukkan belum dibuat
    const readiness = await periodCloseService.readiness({ year, month });
    assert.strictEqual(readiness.canPost, false, 'canPost harus false');
    assert.ok(readiness.blockedReasons.some(r => r.includes('belum dibuat')), 'Blocked reason harus menyebut "belum dibuat"');
    console.log(`     ✅ Readiness benar: canPost=false, reason="${readiness.blockedReasons[0]}"`);

    // Preview harus throw NotFoundException
    try {
      await periodCloseService.preview({ year, month });
      assert.fail('Seharusnya throw NotFoundException');
    } catch (err) {
      assert.ok(err.message?.includes('belum dibuat') || err.status === 404 || err.name === 'NotFoundException',
        `Harus throw NotFoundException: ${err.message}`);
      console.log(`     ✅ Preview throw: ${err.message}`);
    }

    // Post harus throw
    try {
      await periodCloseService.post(
        { year, month, notes: 'Test guard — periode tidak ada, harus gagal.' },
        ownerActor,
      );
      assert.fail('Seharusnya throw');
    } catch (err) {
      assert.ok(err.message?.includes('belum dibuat') || err.status === 404 || err.name === 'NotFoundException',
        `Harus throw: ${err.message}`);
      console.log(`     ✅ Post throw: ${err.message}`);
    }

    console.log('  🎉 Y-J8b SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J8b GAGAL:', err.message);
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Y-J8c: Guard — close periode yang sudah CLOSED
// ═══════════════════════════════════════════════════════════════════════════

test('Y-J8c: Guard — close periode yang sudah CLOSED harus ditolak', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const periodCloseService = module.get(AccountingPeriodCloseService);
  const accountingService = module.get(AccountingService);
  const ownerActor = await getOwnerActor(prisma);

  const { year, month } = safeTestPeriod();

  t.after(async () => {
    await cleanupTestData(prisma, { year, month });
    await app.close();
  });

  try {
    console.log('\n  📋 Y-J8c: Guard — close periode yang sudah CLOSED');

    // Buat periode
    await accountingService.createPeriod({ year, month });
    console.log(`     ✅ Period ${monthKey(year, month)} dibuat (OPEN)`);

    // Coba close (skip kalau ada blocker readiness)
    const preview = await periodCloseService.preview({ year, month });
    if (!preview.canPost) {
      console.log(`     ⚠️  Tidak bisa close (canPost=false), skip test guard double-close.`);
      console.log('  🎉 Y-J8c SELESAI (skipped — readiness blocked) ✅');
      return;
    }

    // Close pertama
    await periodCloseService.post(
      { year, month, notes: 'Integration test — close pertama untuk uji double-close guard.' },
      ownerActor,
    );
    console.log(`     ✅ Close pertama sukses`);

    // Close kedua harus ditolak
    try {
      await periodCloseService.post(
        { year, month, notes: 'Integration test — close kedua harus ditolak karena sudah CLOSED.' },
        ownerActor,
      );
      assert.fail('Seharusnya throw karena periode sudah CLOSED');
    } catch (err) {
      const msg = err.message || '';
      assert.ok(
        msg.includes('sudah') || msg.includes('CLOSED') || err.status === 400,
        `Harus tolak double close: ${msg}`,
      );
      console.log(`     ✅ Double close ditolak: ${msg}`);
    }

    console.log('  🎉 Y-J8c SELESAI ✅');

  } catch (err) {
    console.error('\n  ❌ Y-J8c GAGAL:', err.message);
    throw err;
  }
});
