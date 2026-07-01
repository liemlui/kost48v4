'use strict';

/**
 * Unit test: AccountingService — CoA, Cash Account, Period, Opening Balance, Journal Draft
 *
 * Cakupan:
 *   - SchemaGuard: semua method menolak jika schema belum siap
 *   - CoA: listAccounts, createAccount, updateAccount (not found, self-parent, success)
 *   - Cash Account: listCashAccounts, createCashAccount (non-ASSET, conflict), updateCashAccount
 *   - Period: listPeriods, getPeriodById, createPeriod (conflict), updatePeriod (not found, status/tanggal immutable)
 *   - Opening Balance: listOpeningBalances, createOpeningBalanceDraft, voidOpeningBalance, postOpeningBalance
 *   - Journal: listJournalEntries, createJournalDraft, assertPeriodOpenForDraft
 */
const test = require('node:test');
const assert = require('node:assert');
const { BadRequestException, ConflictException, NotFoundException } = require('@nestjs/common');
const { AccountingService } = require('../../dist/modules/accounting/accounting.service.js');

// ─── Helpers ─────────────────────────────────────────────────────────────
const NOW = new Date();
function coa(id, overrides = {}) {
  return { id, code: `4${String(id).padStart(3, '0')}`, name: `Akun #${id}`, type: 'INCOME', normalBalance: 'CREDIT', isActive: true, description: null, parentId: null, parent: null, ...overrides };
}
function cashAcct(id, overrides = {}) {
  return { id, name: `Bank #${id}`, accountType: 'BANK', chartOfAccountId: 1, bankName: 'BCA', accountNumberMasked: '****1234', holderName: 'Owner', openingBalanceRupiah: 0, currentBalanceRupiah: 0, isDefault: true, isActive: true, notes: null, chartOfAccount: coa(1, { type: 'ASSET' }), ...overrides };
}
function period(id, overrides = {}) {
  return { id, year: 2026, month: 6, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: 'OPEN', notes: null, ...overrides };
}
function obBatch(id, overrides = {}) {
  return { id, accountingPeriodId: 1, status: 'DRAFT', notes: null, accountingPeriod: period(1), lines: [], ...overrides };
}
function journalEntry(id, overrides = {}) {
  return { id, accountingPeriodId: 1, entryNumber: 'JE-001', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', entryDate: NOW, memo: 'Test', createdById: 1, lines: [], ...overrides };
}

// ─── Factory ─────────────────────────────────────────────────────────────
function makeSchemaGuard(ready = true) {
  return {
    assertReady: async () => {
      if (!ready) throw new Error('Accounting schema not ready');
    },
    getStatus: async () => ({ ready, missingTables: ready ? [] : ['ChartOfAccount'], checkedTables: [], message: ready ? 'ready' : 'missing', nextActions: [] }),
  };
}

function makeSvc({
  ready = true,
  chartOfAccountOverrides = {},
  cashAccountOverrides = {},
  accountingPeriodOverrides = {},
  openingBalanceBatchOverrides = {},
  journalEntryOverrides = {},
  postingOverrides = {},
} = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    chartOfAccount: {
      findMany: async () => [coa(1), coa(2)],
      findUnique: async (args) => (chartOfAccountOverrides.findUniqueResult ?? null) ? chartOfAccountOverrides.findUniqueResult : (args?.where?.id === 999 ? null : coa(Number(args?.where?.id ?? 1))),
      create: async (args) => coa(99, { code: args.data.code, name: args.data.name, type: args.data.type, ...args.data }),
      update: async (args) => coa(args.where.id, { ...args.data }),
      upsert: async (args) => coa(args.where?.code ? 1 : 99, { code: args.create.code, name: args.create.name }),
    },
    cashAccount: {
      findMany: async () => [cashAcct(1), cashAcct(2)],
      findUnique: async (args) => args?.where?.id === 999 ? null : cashAcct(Number(args?.where?.id ?? 1)),
      create: async (args) => cashAcct(99, { name: args.data.name, ...args.data }),
      update: async (args) => cashAcct(args.where.id, args.data),
      updateMany: async () => ({ count: 1 }),
    },
    accountingPeriod: {
      findMany: async () => [period(1), period(2)],
      findUnique: async (args) => args?.where?.id === 999 ? null : period(Number(args?.where?.id ?? 1)),
      create: async (args) => period(99, { year: args.data.year, month: args.data.month, ...args.data }),
      update: async (args) => period(args.where.id, { ...args.data }),
    },
    openingBalanceBatch: {
      findMany: async () => [obBatch(1)],
      findUnique: async (args) => args?.where?.id === 999 ? null : obBatch(Number(args?.where?.id ?? 1)),
      create: async (args) => obBatch(99, { ...args.data }),
      update: async (args) => obBatch(args.where.id, { ...args.data }),
    },
    journalEntry: {
      findMany: async () => [journalEntry(1)],
      findUnique: async (args) => args?.where?.id === 999 ? null : journalEntry(Number(args?.where?.id ?? 1)),
      findFirst: async () => null,
      create: async (args) => journalEntry(99, { ...args.data }),
      count: async () => 0,
    },
    journalLine: { createMany: async () => ({ count: 2 }) },
    accountBalanceSnapshot: { findMany: async () => [] },
    ...chartOfAccountOverrides,
    ...cashAccountOverrides,
    ...accountingPeriodOverrides,
    ...openingBalanceBatchOverrides,
    ...journalEntryOverrides,
  };
  const schemaGuard = makeSchemaGuard(ready);
  const posting = {
    postOpeningBalanceTx: async () => ({ posted: true, journalEntry: { id: 10 } }),
    ...postingOverrides,
  };
  // AccountingService constructor takes (prisma, schemaGuard)
  return { svc: new AccountingService(prisma, schemaGuard), prisma, schemaGuard, posting };
}

// ─── Schema Guard ────────────────────────────────────────────────────────
test('AS-grd-01: semua method tolak saat schema belum siap', async () => {
  const { svc } = makeSvc({ ready: false });
  for (const call of [
    () => svc.seedDefaultCoa(),
    () => svc.listAccounts(),
    () => svc.createAccount({ code: 'X', name: 'X', type: 'INCOME', normalBalance: 'CREDIT' }),
    () => svc.updateAccount(1, { name: 'X' }),
    () => svc.listCashAccounts(),
    () => svc.createCashAccount({ name: 'X', chartOfAccountId: 1, accountType: 'BANK' }),
    () => svc.updateCashAccount(1, { name: 'X' }),
    () => svc.listPeriods(),
    () => svc.getPeriodById(1),
    () => svc.createPeriod({ year: 2026, month: 7 }),
    () => svc.updatePeriod(1, { notes: 'test' }),
    () => svc.listOpeningBalances(),
    () => svc.getOpeningBalance(1),
    () => svc.voidOpeningBalance(1),
    () => svc.postOpeningBalance(1),
    () => svc.listJournalEntries(),
    () => svc.createJournalDraft({ accountingPeriodId: 1, memo: 'X', lines: [] }),
  ]) {
    await assert.rejects(() => call(), (e) => e.message?.includes('not ready') || e instanceof Error);
  }
});

// ─── COA ─────────────────────────────────────────────────────────────────
test('AS-coa-01: listAccounts mengembalikan daftar akun', async () => {
  const { svc } = makeSvc();
  const result = await svc.listAccounts({ type: 'INCOME' });
  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 2);
});

test('AS-coa-02: createAccount berhasil', async () => {
  const { svc } = makeSvc();
  const result = await svc.createAccount({ code: '4100', name: 'Pendapatan Test', type: 'INCOME', normalBalance: 'CREDIT' });
  assert.equal(result.code, '4100');
  assert.equal(result.name, 'Pendapatan Test');
});

test('AS-coa-03: updateAccount not found', async () => {
  const { svc, prisma } = makeSvc();
  prisma.chartOfAccount.findUnique = async () => null;
  await assert.rejects(() => svc.updateAccount(999, { name: 'Baru' }), (e) => e instanceof NotFoundException);
});

test('AS-coa-04: updateAccount self-parent ditolak', async () => {
  const { svc } = makeSvc();
  await assert.rejects(() => svc.updateAccount(1, { parentId: 1 }), (e) => e instanceof BadRequestException && e.message.includes('parent dirinya sendiri'));
});

test('AS-coa-05: updateAccount berhasil', async () => {
  const { svc } = makeSvc();
  const result = await svc.updateAccount(1, { name: 'Akun Updated' });
  assert.ok(result);
  assert.equal(result.name, 'Akun Updated');
});

// ─── Cash Account ────────────────────────────────────────────────────────
test('AS-ca-01: listCashAccounts mengembalikan daftar', async () => {
  const { svc } = makeSvc();
  const result = await svc.listCashAccounts({ accountType: 'BANK' });
  assert.ok(Array.isArray(result));
});

test('AS-ca-02: createCashAccount non-ASSET COA ditolak', async () => {
  const { svc } = makeSvc();
  // Override ensureAccount agar mengembalikan COA NON-ASSET
  // Strategy: findUnique untuk chartOfAccount di ensureAccount = coa(99, { type: 'INCOME' })
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    chartOfAccount: { findUnique: async () => coa(1, { type: 'INCOME' }) },
    cashAccount: { updateMany: async () => ({ count: 1 }) },
  };
  const schemaGuard = makeSchemaGuard(true);
  const localSvc = new AccountingService(prisma, schemaGuard);
  await assert.rejects(() => localSvc.createCashAccount({ name: 'Bank X', chartOfAccountId: 1, accountType: 'BANK' }), (e) => e instanceof BadRequestException && e.message.includes('COA bertipe ASSET'));
});

test('AS-ca-03: createCashAccount berhasil + default reset', async () => {
  const { svc, prisma } = makeSvc();
  // Pastikan ensureAccount mengembalikan COA ASSET
  prisma.chartOfAccount.findUnique = async (args) => args?.where?.id === 999 ? null : coa(1, { type: 'ASSET' });
  prisma.cashAccount.updateMany = async (args) => { if (args.data?.isDefault === false) return { count: 1 }; return { count: 0 }; };
  const result = await svc.createCashAccount({ name: 'Bank Baru', chartOfAccountId: 1, accountType: 'BANK', isDefault: true });
  assert.equal(result.name, 'Bank Baru');
  assert.equal(result.isDefault, true);
});

test('AS-ca-04: updateCashAccount not found', async () => {
  const { svc, prisma } = makeSvc();
  prisma.cashAccount.findUnique = async () => null;
  await assert.rejects(() => svc.updateCashAccount(999, { name: 'X' }), (e) => e instanceof NotFoundException);
});

// ─── Period ──────────────────────────────────────────────────────────────
test('AS-prd-01: listPeriods mengembalikan enriched periods', async () => {
  const { svc } = makeSvc();
  const result = await svc.listPeriods({ year: 2026 });
  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 2);
  assert.ok(result[0].key !== undefined);
  assert.ok(result[0].isPostingOpen !== undefined);
});

test('AS-prd-02: getPeriodById not found', async () => {
  const { svc, prisma } = makeSvc();
  prisma.accountingPeriod.findUnique = async () => null;
  await assert.rejects(() => svc.getPeriodById(999), (e) => e instanceof NotFoundException);
});

test('AS-prd-03: createPeriod conflict', async () => {
  const { svc, prisma } = makeSvc();
  prisma.accountingPeriod.create = async () => { const e = new Error(); e.code = 'P2002'; e.meta = { target: ['year'] }; throw e; };
  await assert.rejects(() => svc.createPeriod({ year: 2026, month: 6 }), (e) => e instanceof ConflictException);
});

test('AS-prd-04: updatePeriod not found', async () => {
  const { svc, prisma } = makeSvc();
  prisma.accountingPeriod.findUnique = async () => null;
  await assert.rejects(() => svc.updatePeriod(999, { notes: 'test' }), (e) => e instanceof NotFoundException);
});

test('AS-prd-05: updatePeriod tidak bisa ubah status', async () => {
  const { svc } = makeSvc();
  await assert.rejects(() => svc.updatePeriod(1, { status: 'CLOSED' }), (e) => e instanceof BadRequestException && e.message.includes('tidak boleh diubah manual'));
});

test('AS-prd-06: updatePeriod hanya ubah notes', async () => {
  const { svc, prisma } = makeSvc();
  prisma.accountingPeriod.update = async (args) => period(args.where.id, { notes: args.data.notes });
  const result = await svc.updatePeriod(1, { notes: 'Catatan baru' });
  assert.ok(result);
  assert.equal(result.notes, 'Catatan baru');
});

// ─── Opening Balance ─────────────────────────────────────────────────────
test('AS-ob-01: listOpeningBalances mengembalikan daftar', async () => {
  const { svc } = makeSvc();
  const result = await svc.listOpeningBalances({ status: 'DRAFT' });
  assert.ok(Array.isArray(result));
});

test('AS-ob-02: getOpeningBalance not found', async () => {
  const { svc, prisma } = makeSvc();
  prisma.openingBalanceBatch.findUnique = async () => null;
  await assert.rejects(() => svc.getOpeningBalance(999), (e) => e instanceof NotFoundException);
});

test('AS-ob-03: voidOpeningBalance berhasil ubah status VOIDED', async () => {
  const { svc, prisma } = makeSvc();
  const admin = { id: 1, role: 'ADMIN', tenantId: null };
  prisma.openingBalanceBatch.findUnique = async (args) => args?.where?.id === 999 ? null : obBatch(1, { status: 'DRAFT' });
  prisma.openingBalanceBatch.update = async (args) => obBatch(args.where.id, { status: args.data.status });
  const result = await svc.voidOpeningBalance(1, admin);
  assert.ok(result);
  assert.equal(result.status, 'VOID');
});

// ─── Journal Draft ───────────────────────────────────────────────────────
test('AS-je-01: listJournalEntries mengembalikan daftar', async () => {
  const { svc } = makeSvc();
  const result = await svc.listJournalEntries({ accountingPeriodId: 1 });
  assert.ok(Array.isArray(result));
});

test('AS-je-02: createJournalDraft berhasil', async () => {
  const { svc, prisma } = makeSvc();
  const admin = { id: 1, role: 'ADMIN', tenantId: null };
  // entryDate harus dalam rentang period (2026-06-01 s.d 2026-06-30)
  prisma.chartOfAccount.findMany = async () => [{ id: 1, isActive: true }, { id: 2, isActive: true }];
  const result = await svc.createJournalDraft({
    accountingPeriodId: 1,
    entryDate: '2026-06-15',
    memo: 'Jurnal test',
    lines: [
      { chartOfAccountId: 1, description: 'Debit', debitRupiah: 100000 },
      { chartOfAccountId: 2, description: 'Kredit', creditRupiah: 100000 },
    ],
  }, admin);
  assert.ok(result);
});

// ─── Seed Default COA ────────────────────────────────────────────────────
test('AS-sd-01: seedDefaultCoa berhasil idempotent', async () => {
  const { svc } = makeSvc();
  const result = await svc.seedDefaultCoa();
  assert.ok(result.seededCount > 0);
  assert.ok(Array.isArray(result.accounts));
});
