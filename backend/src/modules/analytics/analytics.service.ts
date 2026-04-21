import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async marketingSummary() {
    const [tenantCount, activeStayCount, repeatTenantCount, checkoutReasons] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.stay.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.stay.groupBy({ by: ['tenantId'], _count: { tenantId: true }, having: { tenantId: { _count: { gt: 1 } } } }),
      this.prisma.stay.groupBy({ by: ['checkoutReason'], _count: { checkoutReason: true } }),
    ]);
    return { tenantCount, activeStayCount, repeatTenantRateApprox: tenantCount ? repeatTenantCount.length / tenantCount : 0, checkoutReasons };
  }

  async financeSummary() {
    const [invoiceAgg, paymentAgg, wifiAgg, expenseAgg, overdueCount] = await Promise.all([
      this.prisma.invoice.aggregate({ _sum: { totalAmountRupiah: true } }),
      this.prisma.invoicePayment.aggregate({ _sum: { amountRupiah: true } }),
      this.prisma.wifiSale.aggregate({ _sum: { soldPriceRupiah: true } }),
      this.prisma.expense.aggregate({ _sum: { amountRupiah: true } }),
      this.prisma.invoice.count({ where: { status: { in: ['ISSUED', 'PARTIAL'] as any }, dueDate: { lt: new Date() } } }),
    ]);
    return { totalBilledRupiah: invoiceAgg._sum.totalAmountRupiah ?? 0, totalPaidRupiah: paymentAgg._sum.amountRupiah ?? 0, totalWifiRevenueRupiah: wifiAgg._sum.soldPriceRupiah ?? 0, totalExpenseRupiah: expenseAgg._sum.amountRupiah ?? 0, overdueCount };
  }

  async operationsSummary() {
    const [roomCount, activeStayCount, ticketOpenCount, ticketInProgressCount, lowStockCount] = await Promise.all([
      this.prisma.room.count({ where: { isActive: true } }),
      this.prisma.stay.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.ticket.count({ where: { status: 'OPEN' as any } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' as any } }),
      this.prisma.inventoryItem.findMany(),
    ]);
    const lowStock = lowStockCount.filter((item) => Number(item.qtyOnHand) <= Number(item.minQty)).length;
    return { roomCount, activeStayCount, occupancyRateApprox: roomCount ? activeStayCount / roomCount : 0, ticketOpenCount, ticketInProgressCount, lowStockCount: lowStock };
  }

  async strategySummary() {
    const marketing = await this.marketingSummary();
    const finance = await this.financeSummary();
    const operations = await this.operationsSummary();
    return { marketing, finance, operations };
  }
}
