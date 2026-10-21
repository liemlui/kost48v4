// T2 (18 Okt 2026): GET /api/accounting/cash-accounts wajib melaporkan saldo yang
// SAMA dengan trial balance. Sebelum perbaikan endpoint membaca kolom tersimpan
// CashAccount.currentBalanceRupiah yang tidak pernah di-update oleh posting jurnal,
// sehingga Bank Utama tampil 0 padahal jurnal berisi Rp 14.600.000.
const assert = require('node:assert/strict');
const test = require('node:test');

const { AccountingService } = require('../../dist/modules/accounting/accounting.service.js');

const BANK_ID = 2;
const CASH_ID = 1;

function makeService({ accounts, ledgerRows }) {
  const groupByCalls = [];
  const prisma = {
    cashAccount: {
      findMany: async () => accounts,
    },
    journalLine: {
      groupBy: async (args) => {
        groupByCalls.push(args);
        return ledgerRows;
      },
    },
  };
  const schemaGuard = { assertReady: async () => {} };
  return { service: new AccountingService(prisma, schemaGuard), groupByCalls };
}

test('T2-1 — saldo Bank Utama dihitung dari jurnal POSTED (bukan kolom manual 0)', async () => {
  const { service } = makeService({
    accounts: [
      {
        id: BANK_ID,
        name: 'Bank Utama',
        accountType: 'BANK',
        openingBalanceRupiah: 0,
        currentBalanceRupiah: 0,
      },
      {
        id: CASH_ID,
        name: 'Kas Tunai',
        accountType: 'CASH',
        openingBalanceRupiah: 0,
        currentBalanceRupiah: 0,
      },
    ],
    ledgerRows: [
      { cashAccountId: BANK_ID, _sum: { debitRupiah: 14_600_000, creditRupiah: 0 } },
    ],
  });

  const rows = await service.listCashAccounts({ isActive: true });
  const bank = rows.find((row) => row.id === BANK_ID);
  const cash = rows.find((row) => row.id === CASH_ID);

  assert.equal(bank.currentBalanceRupiah, 14_600_000, 'Bank Utama = Rp 14.600.000 seperti trial balance');
  assert.equal(bank.manualBalanceRupiah, 0, 'kolom manual tetap dilaporkan apa adanya untuk audit');
  assert.equal(bank.ledgerDeltaRupiah, 14_600_000);
  assert.equal(cash.currentBalanceRupiah, 0, 'akun tanpa mutasi tetap 0');
});

test('T2-2 — saldo = opening + (debit − kredit), kredit mengurangi saldo', async () => {
  const { service } = makeService({
    accounts: [
      {
        id: CASH_ID,
        name: 'Kas Tunai',
        accountType: 'CASH',
        openingBalanceRupiah: 1_000_000,
        currentBalanceRupiah: 0,
      },
    ],
    ledgerRows: [{ cashAccountId: CASH_ID, _sum: { debitRupiah: 500_000, creditRupiah: 200_000 } }],
  });

  const [row] = await service.listCashAccounts();
  assert.equal(row.currentBalanceRupiah, 1_300_000);
  assert.equal(row.ledgerDeltaRupiah, 300_000);
});

test('T2-3 — pembacaan saldo hanya dari jurnal POSTED', async () => {
  const { service, groupByCalls } = makeService({ accounts: [], ledgerRows: [] });
  await service.listCashAccounts();

  assert.equal(groupByCalls.length, 1);
  assert.deepEqual(groupByCalls[0].by, ['cashAccountId']);
  assert.equal(groupByCalls[0].where.cashAccountId.not, null);
  assert.equal(groupByCalls[0].where.journalEntry.status, 'POSTED');
});
