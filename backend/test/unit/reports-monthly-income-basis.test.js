// T1 (18 Okt 2026): laporan pendapatan bulanan wajib memakai SATU basis tanggal.
// Sebelum perbaikan: `billed` memakai Invoice.periodStart tetapi `paid` memakai
// InvoicePayment.paymentDate → September tampak menunggak Rp 14.600.000 padahal 11
// invoice sudah lunas (dibayar 18 Okt), dan Oktober tampak minus Rp 14.600.000.
// Perbaikan mengikuti pola AL-FIX-4 (financialRatios): pembayaran difilter lewat
// relasi invoice.periodStart, bukan tanggal kas.
const assert = require('node:assert/strict');
const test = require('node:test');

const { ReportsService } = require('../../dist/modules/reports/reports.service.js');

const BILLED = 14_600_000;
const INVOICE_PERIOD_START = Date.UTC(2026, 8, 1); // 2026-09-01
const CASH_PAYMENT_DATE = Date.UTC(2026, 9, 18); // 2026-10-18

const inRange = (time, range) => time >= range.gte && time < range.lt;

/**
 * Prisma tiruan yang SETIA pada dua basis tanggal:
 * - `paymentDate` = basis kas (logika lama) → pembayaran 18 Okt tidak masuk September.
 * - `invoice.periodStart` = basis tagihan (logika baru) → pembayaran ikut periode invoice.
 */
function makePrisma() {
  const paymentFilters = [];

  const prisma = {
    invoice: {
      aggregate: async ({ where }) => ({
        _sum: { totalAmountRupiah: inRange(INVOICE_PERIOD_START, where.periodStart) ? BILLED : 0 },
      }),
      groupBy: async ({ where }) =>
        inRange(INVOICE_PERIOD_START, where.periodStart) ? [{ status: 'PAID', _count: { id: 11 } }] : [],
    },
    invoicePayment: {
      aggregate: async ({ where }) => {
        paymentFilters.push(where);
        if (where.paymentDate) {
          return { _sum: { amountRupiah: inRange(CASH_PAYMENT_DATE, where.paymentDate) ? BILLED : 0 } };
        }
        if (where.invoice && where.invoice.periodStart) {
          return {
            _sum: { amountRupiah: inRange(INVOICE_PERIOD_START, where.invoice.periodStart) ? BILLED : 0 },
          };
        }
        return { _sum: { amountRupiah: 0 } };
      },
    },
    wifiSale: {
      aggregate: async () => ({ _sum: { soldPriceRupiah: 0 } }),
    },
  };

  return { prisma, paymentFilters };
}

test('T1-1 — September: 11 invoice lunas, outstanding 0 (bukan +14,6 jt)', async () => {
  const { prisma } = makePrisma();
  const result = await new ReportsService(prisma).monthlyIncome(2026, 9);

  assert.equal(result.totalBilledRupiah, BILLED, 'tagihan September = 14,6 jt');
  assert.equal(result.totalPaidRupiah, BILLED, 'pembayaran 18 Okt milik invoice periode September');
  assert.equal(result.outstandingRupiah, 0, 'tidak boleh ada tunggakan pada bulan yang sudah lunas');
  assert.equal(result.paidInvoiceCount, 11);
});

test('T1-2 — Oktober: tidak ada tagihan & tidak ada pembayaran → outstanding 0 (bukan −14,6 jt)', async () => {
  const { prisma } = makePrisma();
  const result = await new ReportsService(prisma).monthlyIncome(2026, 10);

  assert.equal(result.totalBilledRupiah, 0);
  assert.equal(result.totalPaidRupiah, 0, 'kas Oktober tidak boleh dipakai membentuk angka periode Oktober');
  assert.equal(result.outstandingRupiah, 0, 'outstanding tidak boleh negatif karena basis tanggal berbeda');
});

test('T1-3 — filter pembayaran memakai invoice.periodStart, bukan paymentDate', async () => {
  const { prisma, paymentFilters } = makePrisma();
  await new ReportsService(prisma).monthlyIncome(2026, 9);

  assert.equal(paymentFilters.length, 1);
  assert.ok(paymentFilters[0].invoice, 'filter pembayaran harus lewat relasi invoice');
  assert.ok(paymentFilters[0].invoice.periodStart, 'basis tagihan: invoice.periodStart');
  assert.equal(paymentFilters[0].paymentDate, undefined, 'tanggal kas tidak boleh dipakai lagi');
});
