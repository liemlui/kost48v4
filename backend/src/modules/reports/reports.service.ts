// FILE: reports.service.ts — laporan keuangan & KPI untuk dashboard owner/admin (JALUR UANG)
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus } from '../../common/enums/app.enums';
import { isStayOccupiedOnDate } from './occupancy-daily.helper';
import { roundRupiah } from '../../common/business/money.helper';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Income & Overdue Reports
  // ═══════════════════════════════════════════════════════════

  private operationalApproximationMetadata(reportName: string) {
    return {
      reportName,
      basis: 'OPERATIONAL_APPROXIMATION',
      ledgerBacked: false,
      formalStatementReady: false,
      readinessNote: 'Laporan ini memakai data operasional invoice/payment/expense, belum jurnal akuntansi formal.',
    };
  }

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
          // F1-7 (F-09): DRAFT belum diterbitkan → bukan pendapatan/tagihan.
          status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] as any },
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
        payments: { select: { amountRupiah: true } },
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
      const paid = (inv as any).payments?.reduce(
        (sum: number, p: any) => sum + Number(p.amountRupiah ?? 0),
        0,
      ) ?? 0;
      const amount = Math.max(0, Number(inv.totalAmountRupiah) - paid);

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
      // Audit M-36: liability = semua jaminan berstatus HELD, termasuk stay
      // yang sudah selesai tetapi depositnya belum di-settle.
      where: {
        depositStatus: 'HELD' as any,
        OR: [{ status: 'ACTIVE' as any }, { depositPaidAmountRupiah: { gt: 0 } }],
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
          status: 'CONFIRMED' as any,
          expenseDate: { gte: start, lt: end },
        },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        _sum: { amountRupiah: true },
        _count: { id: true },
        where: {
          status: 'CONFIRMED' as any,
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
  // R2: cashFlow() dihapus — digantikan oleh GET /accounting/cashflow (ledger-backed direct method).

  /**
   * Profit & Loss Summary (Akrual)
   * Revenue = invoice billed (non-cancelled) + wifi sales
   * Expense = all expenses in period
   * Net Profit = Revenue - Expense
   */
  // ═══════════════════════════════════════════════════════════
  //  SECTION: Profit/Loss & Financial Ratios
  // ═══════════════════════════════════════════════════════════

  async profitLoss(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [invoiceAgg, wifiAgg, expenseAgg, categoryGroups] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: {
          // F1-7 (F-09): DRAFT belum diterbitkan → bukan pendapatan/tagihan.
          status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] as any },
          periodStart: { gte: start, lt: end },
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
          status: 'CONFIRMED' as any,
          expenseDate: { gte: start, lt: end },
        },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        _sum: { amountRupiah: true },
        _count: { id: true },
        where: {
          status: 'CONFIRMED' as any,
          expenseDate: { gte: start, lt: end },
        },
      }),
    ]);

    const invoiceRevenue = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const wifiRevenue = Number(wifiAgg._sum.soldPriceRupiah ?? 0);
    const totalRevenue = invoiceRevenue + wifiRevenue;
    const totalExpense = Number(expenseAgg._sum.amountRupiah ?? 0);
    const netProfit = totalRevenue - totalExpense;
    const netProfitMargin = totalRevenue > 0
      ? Math.round((netProfit / totalRevenue) * 10000) / 100
      : 0;

    const expenseCategories = categoryGroups.map((g) => ({
      category: g.category as string,
      totalRupiah: Number(g._sum.amountRupiah ?? 0),
      count: g._count.id,
    }));

    return {
      year,
      month,
      invoiceRevenueRupiah: invoiceRevenue,
      wifiRevenueRupiah: wifiRevenue,
      totalRevenueRupiah: totalRevenue,
      totalExpenseRupiah: totalExpense,
      netProfitRupiah: netProfit,
      netProfitMarginPercent: netProfitMargin,
      expenseCategories,
      metadata: this.operationalApproximationMetadata('profit-loss'),
    };
  }

  /**
   * Financial Ratios
   * Combines net profit margin, collection rate, expense ratio,
   * overdue rate (snapshot), and occupancy rate (real-time snapshot).
   */
  async financialRatios(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [invoiceAgg, wifiAgg, expenseAgg, paymentAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: {
          // F1-7 (F-09): DRAFT belum diterbitkan → bukan pendapatan/tagihan.
          status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] as any },
          periodStart: { gte: start, lt: end },
        },
      }),
      this.prisma.wifiSale.aggregate({
        _sum: { soldPriceRupiah: true },
        where: { saleDate: { gte: start, lt: end } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        where: { status: 'CONFIRMED' as any, expenseDate: { gte: start, lt: end } },
      }),
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        where: { invoice: { periodStart: { gte: start, lt: end } } },
      }),
    ]);

    const totalBilled = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const wifiRevenue = Number(wifiAgg._sum.soldPriceRupiah ?? 0);
    const totalRevenue = totalBilled + wifiRevenue;
    const totalExpense = Number(expenseAgg._sum.amountRupiah ?? 0);
    const totalPaid = Number(paymentAgg._sum.amountRupiah ?? 0);

    // Net Profit Margin
    const netProfit = totalRevenue - totalExpense;
    const netProfitMargin = totalRevenue > 0
      ? Math.round((netProfit / totalRevenue) * 10000) / 100
      : 0;

    // Collection Rate (period: payments received vs billed — invoice periodStart basis)
    // AL-FIX-4: payment filter by invoice.periodStart, bukan paymentDate — numerator & denominator
    // pakai jendela yang sama.
    const collectionRate = totalBilled > 0
      ? Math.round((totalPaid / totalBilled) * 10000) / 100
      : 0;

    // Expense Ratio
    const expenseRatio = totalRevenue > 0
      ? Math.round((totalExpense / totalRevenue) * 10000) / 100
      : 0;

    // Overdue Rate — snapshot (all-time overdue face value / this month billed)
    const overdueAgg = await this.prisma.invoice.aggregate({
      _sum: { totalAmountRupiah: true },
      where: {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any },
        dueDate: { lt: new Date() },
      },
    });
    const totalOverdueRupiah = Number(overdueAgg._sum.totalAmountRupiah ?? 0);
    const overdueRateSnapshot = totalBilled > 0
      ? Math.round((totalOverdueRupiah / totalBilled) * 10000) / 100
      : 0;

    // Occupancy Rate — real-time snapshot
    const [operableCount, occupiedCount] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      // Audit M-35: hanya stay promoted (benar-benar huni) yang dihitung okupansi.
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
      }),
    ]);
    const occupancyRate = operableCount > 0
      ? Math.round((occupiedCount / operableCount) * 10000) / 100
      : 0;

    return {
      year,
      month,
      netProfitMarginPercent: netProfitMargin,
      collectionRatePercent: collectionRate,
      expenseRatioPercent: expenseRatio,
      overdueRateSnapshotPercent: overdueRateSnapshot,
      overdueRateSnapshotNote:
        'Persentase total nominal tunggakan seluruh waktu terhadap total tagihan bulan ini (snapshot, bukan rasio periodik)',
      occupancyRatePercent: occupancyRate,
      occupancyRateNote:
        'Okupansi real-time berdasarkan stay aktif vs kamar operasional saat ini (bukan rata-rata bulanan)',
      metadata: this.operationalApproximationMetadata('financial-ratios'),
    };
  }

  /**
   * Occupancy & Revenue per Occupied Room
   * Real-time room snapshot + monthly billed revenue / occupied rooms.
   */
  async occupancy(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [operableCount, occupiedCount, invoiceAgg] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      // Audit M-35: hanya stay promoted (benar-benar huni) yang dihitung okupansi.
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
      }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: {
          // F1-7 (F-09): DRAFT belum diterbitkan → bukan pendapatan/tagihan.
          status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] as any },
          periodStart: { gte: start, lt: end },
        },
      }),
    ]);

    const totalBilled = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const occupancyRate = operableCount > 0
      ? Math.round((occupiedCount / operableCount) * 10000) / 100
      : 0;
    const revenuePerOccupied = occupiedCount > 0
      ? roundRupiah(totalBilled / occupiedCount)
      : 0;

    return {
      year,
      month,
      totalOperableRooms: operableCount,
      occupiedRooms: occupiedCount,
      occupancyRatePercent: occupancyRate,
      occupancyNote:
        'Okupansi real-time berdasarkan stay aktif vs kamar operasional saat ini (bukan rata-rata bulanan)',
      totalBilledRupiah: totalBilled,
      revenuePerOccupiedRoomRupiah: revenuePerOccupied,
      revenueNote:
        'Total tagihan bulan ini dibagi jumlah kamar terisi saat ini (estimasi kasar, bukan revenue per room-day)',
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Occupancy Reports
  // ═══════════════════════════════════════════════════════════

  async occupancyDaily(fromInput: string, toInput: string) {
    const from = this.parseDateOnly(fromInput, 'from');
    const to = this.parseDateOnly(toInput, 'to');
    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((to.getTime() - from.getTime()) / dayMs) + 1;

    if (totalDays < 1) {
      throw new BadRequestException('Tanggal from harus sebelum atau sama dengan to');
    }
    if (totalDays > 550) {
      throw new BadRequestException('Rentang heatmap maksimal 550 hari');
    }

    const operableRooms = await this.prisma.room.findMany({
      where: {
        isActive: true,
        status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
      },
      select: { id: true },
    });
    const operableRoomIds = operableRooms.map((room) => room.id);

    const stays = operableRoomIds.length
      ? await this.prisma.stay.findMany({
          where: {
            roomId: { in: operableRoomIds },
            status: { not: 'CANCELLED' as any },
            initialMetersPromotedAt: { not: null },
            checkInDate: { lte: to },
          },
          select: {
            roomId: true,
            status: true,
            checkInDate: true,
            plannedCheckOutDate: true,
            actualCheckOutDate: true,
            initialMetersPromotedAt: true,
          },
        })
      : [];

    const todayWib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayBoundary = new Date(`${todayWib}T00:00:00.000Z`);
    const days = Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(from.getTime() + index * dayMs);
      const dateKey = date.toISOString().slice(0, 10);
      const occupiedRoomIds = new Set<number>();

      for (const stay of stays) {
        if (isStayOccupiedOnDate({
          ...stay,
          status: String(stay.status),
          initialMetersPromotedAt: stay.initialMetersPromotedAt as Date,
        }, date, todayBoundary)) {
          occupiedRoomIds.add(stay.roomId);
        }
      }

      const occupiedRooms = occupiedRoomIds.size;
      const occupancyRatePercent = operableRoomIds.length
        ? Math.round((occupiedRooms / operableRoomIds.length) * 10000) / 100
        : 0;

      return {
        date: dateKey,
        occupiedRooms,
        totalOperableRooms: operableRoomIds.length,
        occupancyRatePercent,
        isProjection: dateKey > todayWib,
      };
    });

    return {
      from: fromInput.slice(0, 10),
      to: toInput.slice(0, 10),
      totalOperableRooms: operableRoomIds.length,
      days,
      note:
        'Historis memakai stay promoted dan tanggal checkout aktual. Hari mendatang memakai checkout rencana stay aktif; denominator memakai kamar operasional saat ini.',
    };
  }

  private parseDateOnly(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} harus berformat YYYY-MM-DD`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException(`${field} bukan tanggal yang valid`);
    }
    return parsed;
  }
}
