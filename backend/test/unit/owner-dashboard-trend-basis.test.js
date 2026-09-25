// Z19-T2 (audit Dashboard Owner 25 Sep 2026): kartu KPI "Laba Bersih" dan seri trend
// grafik wajib memakai BASIS YANG SAMA (akrual tagihan + WiFi − beban).
//
// Sebelum perbaikan, seri trend memakai basis KAS (InvoicePayment.paymentDate)
// sehingga dua angka berlabel sama bisa berbeda untuk bulan yang sama.
const assert = require('node:assert/strict');
const test = require('node:test');

const { FinanceService } = require('../../dist/modules/finance/finance.service.js');

const YEAR = 2026;
const MONTH = 9;
const INVOICE = 1_000_000;
const WIFI = 100_000;
const EXPENSE = 250_000;
const CASH_PAYMENT = 999; // sengaja berbeda dari INVOICE: basis kas tidak boleh dipakai trend

/** Prisma tiruan permisif: mencatat SQL dan mengembalikan angka per basis. */
function makePrisma() {
  const sqlCalls = [];
  const aggregate = {
    invoice: { totalAmountRupiah: INVOICE },
    invoicePayment: { amountRupiah: CASH_PAYMENT },
    expense: { amountRupiah: EXPENSE },
    wifiSale: { soldPriceRupiah: WIFI },
  };

  const model = (name) =>
    new Proxy(
      {},
      {
        get: (_target, method) => async () => {
          if (method === 'aggregate') return { _sum: aggregate[name] ?? {} };
          if (method === 'count') return 0;
          if (method === 'groupBy' || method === 'findMany') return [];
          return null;
        },
      },
    );

  const prisma = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '$queryRaw') {
          return async (strings) => {
            const sql = strings.join(' ? ');
            sqlCalls.push(sql);
            if (sql.includes('EXTRACT(YEAR FROM "periodStart"')) {
              return [{ year: YEAR, month: MONTH, total: BigInt(INVOICE) }];
            }
            if (sql.includes('EXTRACT(YEAR FROM "saleDate"')) {
              return [{ year: YEAR, month: MONTH, total: BigInt(WIFI) }];
            }
            if (sql.includes('EXTRACT(YEAR FROM "expenseDate"')) {
              return [{ year: YEAR, month: MONTH, total: BigInt(EXPENSE) }];
            }
            return [];
          };
        }
        return model(String(prop));
      },
    },
  );

  return { prisma, sqlCalls };
}

test('Z19T2-1 — trend bulan berjalan memakai basis akrual yang sama dengan KPI Laba Bersih', async () => {
  const { prisma } = makePrisma();
  const result = await new FinanceService(prisma).ownerDashboard({ year: YEAR, month: MONTH, trendMonths: 1 });

  assert.equal(result.trendMonths.length, 1);
  const [point] = result.trendMonths;
  assert.equal(point.year, YEAR);
  assert.equal(point.month, MONTH);
  assert.equal(point.revenue, INVOICE + WIFI, 'revenue trend = tagihan akrual + WiFi');
  assert.equal(point.expense, EXPENSE);
  assert.equal(point.netProfit, INVOICE + WIFI - EXPENSE);
  assert.equal(
    point.netProfit,
    result.kpi.netProfitRupiah,
    'kartu KPI dan grafik wajib sama untuk bulan yang sama',
  );

  // Residual yang disengaja: kartu "Pendapatan" tetap KAS (M15), jadi ia boleh berbeda.
  assert.equal(result.kpi.totalRevenueRupiah, CASH_PAYMENT + WIFI);
  assert.notEqual(result.kpi.totalRevenueRupiah, point.revenue);
});

test('Z19T2-2 — trend membaca Invoice.periodStart dan berhenti membaca kas InvoicePayment', async () => {
  const { prisma, sqlCalls } = makePrisma();
  await new FinanceService(prisma).ownerDashboard({ year: YEAR, month: MONTH, trendMonths: 3 });

  const trendSql = sqlCalls.filter((sql) => sql.includes('EXTRACT(YEAR FROM'));
  assert.equal(trendSql.length, 3, 'tiga seri bulanan: invoice, expense, wifi');

  const invoiceSql = trendSql.find((sql) => sql.includes('FROM "Invoice"'));
  assert.ok(invoiceSql, 'seri tagihan harus ada');
  assert.ok(invoiceSql.includes('"periodStart"'), 'basis akrual memakai periodStart');
  assert.ok(invoiceSql.includes("status NOT IN ('DRAFT', 'CANCELLED')"), 'predikat sama dengan KPI');
  assert.equal(
    trendSql.some((sql) => sql.includes('FROM "InvoicePayment"')),
    false,
    'seri kas InvoicePayment tidak boleh lagi dipakai untuk trend',
  );
});

test('Z19T2-3 — bulan tanpa data tetap nol dan bulan berjalan tetap di titik terakhir', async () => {
  const { prisma } = makePrisma();
  const result = await new FinanceService(prisma).ownerDashboard({ year: YEAR, month: MONTH, trendMonths: 3 });

  assert.equal(result.trendMonths.length, 3);
  const last = result.trendMonths[2];
  assert.equal(last.year, YEAR);
  assert.equal(last.month, MONTH);
  assert.equal(last.netProfit, INVOICE + WIFI - EXPENSE);

  const earlier = result.trendMonths[0];
  assert.equal(earlier.revenue, 0);
  assert.equal(earlier.expense, 0);
  assert.equal(earlier.netProfit, 0);
});
