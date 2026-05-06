import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus } from '../../common/enums/app.enums';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Monthly Income Summary
   * Total billed, paid, wifi revenue, outstanding, invoice counts.
   */
  async monthlyIncome(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [invoiceAgg, paymentAgg, invoiceCounts, wifiAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: {
          status: { not: InvoiceStatus.CANCELLED as any },
          periodStart: { gte: start, lt: end },
        },
      }),
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        where: {
          paymentDate: { gte: start, lt: end },
        },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          status: { not: InvoiceStatus.CANCELLED as any },
          periodStart: { gte: start, lt: end },
        },
      }),
      this.prisma.wifiSale.aggregate({
        _sum: { soldPriceRupiah: true },
        where: {
          saleDate: { gte: start, lt: end },
        },
      }),
    ]);

    const countByStatus: Record<string, number> = {};
    for (const g of invoiceCounts) {
      countByStatus[g.status as string] = g._count.id;
    }

    const totalBilled = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const totalPaid = Number(paymentAgg._sum.amountRupiah ?? 0);
    const totalWifi = Number(wifiAgg._sum.soldPriceRupiah ?? 0);
    const paidCount = countByStatus['PAID'] ?? 0;
    const partialCount = countByStatus['PARTIAL'] ?? 0;
    const unpaidCount = (countByStatus['ISSUED'] ?? 0) + (countByStatus['DRAFT'] ?? 0);
    const totalInvoices = paidCount + partialCount + unpaidCount;

    return {
      year,
      month,
      totalBilledRupiah: totalBilled,
      totalPaidRupiah: totalPaid,
      totalWifiRevenueRupiah: totalWifi,
      outstandingRupiah: totalBilled - totalPaid,
      invoiceCount: totalInvoices,
      paidInvoiceCount: paidCount,
      partialInvoiceCount: partialCount,
      unpaidInvoiceCount: unpaidCount,
    };
  }

  /**
   * Overdue Aging
   * Buckets: current, 1-30, 31-60, 61-90, 91+ days past due.
   */
  async overdueAging(asOf?: string) {
    const today = asOf ? new Date(asOf) : new Date();
    today.setHours(23, 59, 59, 999);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any },
        dueDate: { lt: today },
      },
      select: {
        id: true,
        dueDate: true,
        totalAmountRupiah: true,
        _count: { select: { payments: true } },
      },
    });

    const buckets = {
      current: { count: 0, totalRupiah: 0 },
      days1to30: { count: 0, totalRupiah: 0 },
      days31to60: { count: 0, totalRupiah: 0 },
      days61to90: { count: 0, totalRupiah: 0 },
      days91plus: { count: 0, totalRupiah: 0 },
    };

    const todayMs = today.getTime();

    for (const inv of overdueInvoices) {
      const dueMs = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.totalAmountRupiah);

      let bucket: keyof typeof buckets;
      if (diffDays <= 0) {
        bucket = 'current';
      } else if (diffDays <= 30) {
        bucket = 'days1to30';
      } else if (diffDays <= 60) {
        bucket = 'days31to60';
      } else if (diffDays <= 90) {
        bucket = 'days61to90';
      } else {
        bucket = 'days91plus';
      }

      buckets[bucket].count += 1;
      buckets[bucket].totalRupiah += amount;
    }

    const totalOverdueCount = buckets.days1to30.count + buckets.days31to60.count + buckets.days61to90.count + buckets.days91plus.count;
    const totalOverdueRupiah = buckets.days1to30.totalRupiah + buckets.days31to60.totalRupiah + buckets.days61to90.totalRupiah + buckets.days91plus.totalRupiah;

    return {
      asOf: today.toISOString().split('T')[0],
      buckets,
      totalOverdueRupiah,
      totalOverdueCount,
    };
  }

  /**
   * Deposit Liability Summary
   * Total deposit amount, paid, outstanding, per-status counts.
   */
  async depositLiability() {
    const stays = await this.prisma.stay.findMany({
      where: {
        status: 'ACTIVE' as any,
        depositAmountRupiah: { gt: 0 },
      },
      select: {
        id: true,
        depositAmountRupiah: true,
        depositPaidAmountRupiah: true,
        depositPaymentStatus: true,
      },
    });

    let totalDepositAmount = 0;
    let totalDepositPaid = 0;
    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;

    for (const s of stays) {
      const amount = Number(s.depositAmountRupiah);
      const paid = Number(s.depositPaidAmountRupiah);
      totalDepositAmount += amount;
      totalDepositPaid += paid;

      const status = s.depositPaymentStatus as string;
      if (status === 'PAID') {
        fullyPaidCount++;
      } else if (status === 'PARTIAL') {
        partiallyPaidCount++;
      } else {
        unpaidCount++;
      }
    }

    return {
      totalDepositAmountRupiah: totalDepositAmount,
      totalDepositPaidRupiah: totalDepositPaid,
      totalDepositOutstandingRupiah: totalDepositAmount - totalDepositPaid,
      activeStayCount: stays.length,
      fullyPaidCount,
      partiallyPaidCount,
      unpaidCount,
    };
  }

  /**
   * Expense Category Summary
   * Grouped by category for a given month.
   */
  async expenseSummary(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [totalAgg, categoryGroups] = await Promise.all([
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        where: {
          expenseDate: { gte: start, lt: end },
        },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        _sum: { amountRupiah: true },
        _count: { id: true },
        where: {
          expenseDate: { gte: start, lt: end },
        },
      }),
    ]);

    const categories = categoryGroups.map((g) => ({
      category: g.category as string,
      totalRupiah: Number(g._sum.amountRupiah ?? 0),
      count: g._count.id,
    }));

    return {
      year,
      month,
      totalExpenseRupiah: Number(totalAgg._sum.amountRupiah ?? 0),
      categories,
    };
  }

  /**
   * Cash Flow Approximation
   * cashIn = invoicePayments + wifiSales
   * cashOut = expenses
   * net = cashIn - cashOut
   */
  async cashFlow(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [paymentAgg, wifiAgg, expenseAgg] = await Promise.all([
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        where: {
          paymentDate: { gte: start, lt: end },
        },
      }),
      this.prisma.wifiSale.aggregate({
        _sum: { soldPriceRupiah: true },
        where: {
          saleDate: { gte: start, lt: end },
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        where: {
          expenseDate: { gte: start, lt: end },
        },
      }),
    ]);

    const invoicePayments = Number(paymentAgg._sum.amountRupiah ?? 0);
    const wifiSales = Number(wifiAgg._sum.soldPriceRupiah ?? 0);
    const expenses = Number(expenseAgg._sum.amountRupiah ?? 0);
    const totalCashIn = invoicePayments + wifiSales;
    const totalCashOut = expenses;

    return {
      year,
      month,
      cashIn: {
        invoicePaymentsRupiah: invoicePayments,
        wifiSalesRupiah: wifiSales,
        totalRupiah: totalCashIn,
      },
      cashOut: {
        expensesRupiah: totalCashOut,
        totalRupiah: totalCashOut,
      },
      netCashFlowRupiah: totalCashIn - totalCashOut,
    };
  }
}