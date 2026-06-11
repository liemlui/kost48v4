import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutRequestStatus, InvoiceStatus, PaymentSubmissionStatus, RenewRequestStatus, RoomStatus, StayStatus, TicketStatus } from '../../common/enums/app.enums';
import { FinancePeriodQueryDto } from './dto/finance-query.dto';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

type FinanceReadiness = {
  ready: boolean;
  missing: string[];
  assumptions: string[];
  nextDataNeeded: string[];
};

function monthWindow(query: FinancePeriodQueryDto) {
  const now = new Date();
  const year = query.year ?? now.getFullYear();
  const month = query.month ?? now.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { year, month, start, end };
}

function roundPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function healthGrade(score: number) {
  if (score >= 85) return 'AMAN';
  if (score >= 70) return 'PERHATIAN';
  if (score >= 50) return 'RISIKO';
  return 'KRITIS';
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async businessHealth(query: FinancePeriodQueryDto = {}) {
    const { year, month, start, end } = monthWindow(query);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [
      roomStatusGroups,
      activeStayCount,
      invoiceAgg,
      openInvoiceAgg,
      overdueAgg,
      paymentAgg,
      expenseAgg,
      pendingPaymentCount,
      pendingRenewCount,
      pendingCheckoutCount,
      approvedCheckoutCount,
      openTicketCount,
      highSignalTickets,
      depositAgg,
    ] = await Promise.all([
      this.prisma.room.groupBy({ by: ['status'], _count: { id: true }, where: { isActive: true } }),
      this.prisma.stay.count({ where: { status: StayStatus.ACTIVE as any, initialMetersPromotedAt: { not: null } } }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { not: InvoiceStatus.CANCELLED as any }, periodStart: { gte: start, lt: end } },
      }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] as any } },
      }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any }, dueDate: { lt: today } },
      }),
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        _count: { id: true },
        where: { paymentDate: { gte: start, lt: end } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        _count: { id: true },
        where: { expenseDate: { gte: start, lt: end } },
      }),
      this.prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.PENDING_REVIEW as any } }),
      this.prisma.renewRequest.count({ where: { status: RenewRequestStatus.PENDING as any } }),
      this.prisma.checkoutRequest.count({ where: { status: CheckoutRequestStatus.PENDING as any } }),
      this.prisma.checkoutRequest.count({ where: { status: CheckoutRequestStatus.APPROVED as any } }),
      this.prisma.ticket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] as any } } }),
      this.prisma.ticket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] as any }, category: { in: ['URGENT', 'HIGH', 'EMERGENCY'] as any } } }).catch(() => 0),
      this.prisma.stay.aggregate({
        _sum: { depositPaidAmountRupiah: true, depositAmountRupiah: true },
        _count: { id: true },
        where: { status: StayStatus.ACTIVE as any, depositAmountRupiah: { gt: 0 } },
      }),
    ]);

    const byStatus = roomStatusGroups.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.status)] = row._count.id;
      return acc;
    }, {});
    const totalRooms = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
    const maintenanceRooms = (byStatus[RoomStatus.MAINTENANCE] ?? 0) + (byStatus[RoomStatus.INACTIVE] ?? 0);
    const operableRooms = Math.max(0, totalRooms - maintenanceRooms);
    const occupancyRate = operableRooms > 0 ? roundPercent((activeStayCount / operableRooms) * 100) : 0;

    const billedRupiah = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const paidRupiah = Number(paymentAgg._sum.amountRupiah ?? 0);
    const expenseRupiah = Number(expenseAgg._sum.amountRupiah ?? 0);
    const openInvoiceRupiah = Number(openInvoiceAgg._sum.totalAmountRupiah ?? 0);
    const overdueRupiah = Number(overdueAgg._sum.totalAmountRupiah ?? 0);
    const collectionRate = billedRupiah > 0 ? roundPercent((paidRupiah / billedRupiah) * 100) : 0;
    const expenseRatio = billedRupiah > 0 ? roundPercent((expenseRupiah / billedRupiah) * 100) : 0;
    const netCashFlowRupiah = paidRupiah - expenseRupiah;
    const depositHeldRupiah = Number(depositAgg._sum.depositPaidAmountRupiah ?? 0);

    let score = 100;
    if (pendingPaymentCount > 0) score -= Math.min(18, pendingPaymentCount * 3);
    if (Number(overdueAgg._count.id ?? 0) > 0) score -= Math.min(25, Number(overdueAgg._count.id) * 4);
    if (occupancyRate < 60) score -= 18;
    else if (occupancyRate < 80) score -= 8;
    if (collectionRate > 0 && collectionRate < 70) score -= 15;
    if (expenseRatio > 70) score -= 12;
    if (approvedCheckoutCount > 0) score -= Math.min(12, approvedCheckoutCount * 4);
    if (openTicketCount > 8) score -= 8;
    score = Math.max(0, Math.min(100, score));

    const signals = [
      ...(pendingPaymentCount ? [{ severity: 'HIGH' as Severity, ruleId: 'payment-review', title: 'Pembayaran menunggu verifikasi', message: `${pendingPaymentCount} bukti pembayaran menahan cashflow/aktivasi.`, count: pendingPaymentCount, actionRoute: '/payment-submissions/review' }] : []),
      ...(Number(overdueAgg._count.id ?? 0) ? [{ severity: 'HIGH' as Severity, ruleId: 'invoice-overdue', title: 'Tagihan overdue', message: `${Number(overdueAgg._count.id)} tagihan melewati jatuh tempo senilai Rp ${overdueRupiah.toLocaleString('id-ID')}.`, count: Number(overdueAgg._count.id), actionRoute: '/invoices' }] : []),
      ...(approvedCheckoutCount ? [{ severity: 'BLOCKER' as Severity, ruleId: 'checkout-approved-final', title: 'Checkout disetujui belum final', message: `${approvedCheckoutCount} checkout sudah disetujui dan perlu finalisasi terpisah.`, count: approvedCheckoutCount, actionRoute: '/stays' }] : []),
      ...(pendingRenewCount ? [{ severity: 'MEDIUM' as Severity, ruleId: 'renew-pending', title: 'Renew pending', message: `${pendingRenewCount} permintaan perpanjangan menunggu review.`, count: pendingRenewCount, actionRoute: '/renew-requests' }] : []),
      ...(pendingCheckoutCount ? [{ severity: 'MEDIUM' as Severity, ruleId: 'checkout-pending', title: 'Checkout request pending', message: `${pendingCheckoutCount} pengajuan keluar perlu review admin.`, count: pendingCheckoutCount, actionRoute: '/stays?status=BOOKINGS' }] : []),
      ...(highSignalTickets ? [{ severity: 'MEDIUM' as Severity, ruleId: 'ticket-high-signal', title: 'Ticket urgent/high', message: `${highSignalTickets} ticket punya sinyal prioritas tinggi.`, count: highSignalTickets, actionRoute: '/tickets' }] : []),
    ];

    const readiness = await this.formalRatiosReadiness();

    return {
      year,
      month,
      score,
      grade: healthGrade(score),
      headline: score >= 85 ? 'Operasional terlihat stabil.' : score >= 70 ? 'Ada beberapa titik yang perlu dipantau.' : 'Ada risiko bisnis yang perlu tindakan.' ,
      metrics: {
        billedRupiah,
        paidRupiah,
        openInvoiceRupiah,
        overdueRupiah,
        expenseRupiah,
        netCashFlowRupiah,
        collectionRatePercent: collectionRate,
        expenseRatioPercent: expenseRatio,
        occupancyRatePercent: occupancyRate,
        activeStayCount,
        totalRooms,
        operableRooms,
        pendingPaymentCount,
        pendingRenewCount,
        pendingCheckoutCount,
        approvedCheckoutCount,
        openTicketCount,
        depositHeldRupiah,
      },
      signals,
      financeReadiness: readiness,
      assumptions: [
        'Collection rate memakai pembayaran yang diterima pada bulan yang sama dibanding tagihan periode bulan itu.',
        'Open invoice dihitung dari status bukan PAID dan bukan CANCELLED, termasuk DRAFT sesuai guard checkout.',
        'Deposit held dibaca sebagai liability operasional, bukan revenue.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async occupancySummary(query: FinancePeriodQueryDto = {}) {
    const { year, month, start, end } = monthWindow(query);
    const [roomGroups, activeStayCount, invoiceAgg, openTickets] = await Promise.all([
      this.prisma.room.groupBy({ by: ['status'], _count: { id: true }, where: { isActive: true } }),
      this.prisma.stay.count({ where: { status: StayStatus.ACTIVE as any, initialMetersPromotedAt: { not: null } } }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: { status: { not: InvoiceStatus.CANCELLED as any }, periodStart: { gte: start, lt: end } },
      }),
      this.prisma.ticket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] as any } } }),
    ]);

    const byStatus = roomGroups.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.status)] = row._count.id;
      return acc;
    }, {});
    const totalRooms = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
    const maintenanceRooms = (byStatus[RoomStatus.MAINTENANCE] ?? 0) + (byStatus[RoomStatus.INACTIVE] ?? 0);
    const operableRooms = Math.max(0, totalRooms - maintenanceRooms);
    const occupiedRooms = activeStayCount;
    const occupancyRatePercent = operableRooms > 0 ? roundPercent((occupiedRooms / operableRooms) * 100) : 0;
    const totalBilledRupiah = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);

    return {
      year,
      month,
      totalRooms,
      operableRooms,
      occupiedRooms,
      availableRooms: byStatus[RoomStatus.AVAILABLE] ?? 0,
      reservedRooms: byStatus[RoomStatus.RESERVED] ?? 0,
      maintenanceRooms,
      occupancyRatePercent,
      totalBilledRupiah,
      revenuePerOccupiedRoomRupiah: occupiedRooms > 0 ? Math.round(totalBilledRupiah / occupiedRooms) : 0,
      openTicketCount: openTickets,
      points: [
        { label: 'Terisi', value: occupiedRooms, route: '/reports?tab=operations' },
        { label: 'Kosong', value: byStatus[RoomStatus.AVAILABLE] ?? 0, route: '/rooms' },
        { label: 'Reserved', value: byStatus[RoomStatus.RESERVED] ?? 0, route: '/stays?status=BOOKINGS' },
        { label: 'Maintenance', value: maintenanceRooms, route: '/rooms' },
      ],
      note: 'Okupansi adalah snapshot real-time berdasarkan stay aktif dan kamar operasional.',
    };
  }

  async formalRatiosReadiness(): Promise<FinanceReadiness> {
    return {
      ready: false,
      missing: ['cash/bank account balance', 'current liabilities model', 'equity/capital model', 'asset/capital employed model'],
      assumptions: ['Open invoice dapat menjadi kandidat accounts receivable.', 'Deposit held diperlakukan sebagai liability.', 'Expense dan payment history tersedia sebagai data operasional, belum full ledger.'],
      nextDataNeeded: ['FinanceAccount atau CashAccount', 'Journal/LedgerEntry', 'Opening balance', 'Equity/capital injection records', 'Payables/current liabilities model'],
    };
  }

  async balanceSheetDraft(query: FinancePeriodQueryDto = {}) {
    const { year, month } = monthWindow(query);
    const [openInvoiceAgg, depositAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] as any } },
      }),
      this.prisma.stay.aggregate({
        _sum: { depositPaidAmountRupiah: true, depositAmountRupiah: true },
        _count: { id: true },
        where: { status: StayStatus.ACTIVE as any, depositAmountRupiah: { gt: 0 } },
      }),
    ]);

    const accountsReceivableRupiah = Number(openInvoiceAgg._sum.totalAmountRupiah ?? 0);
    const depositHeldLiabilityRupiah = Number(depositAgg._sum.depositPaidAmountRupiah ?? 0);
    const readiness = await this.formalRatiosReadiness();

    return {
      year,
      month,
      status: 'DRAFT_NOT_BALANCE_SHEET_GRADE',
      ready: false,
      assets: [
        { key: 'accounts_receivable_candidate', label: 'Accounts Receivable Candidate', amountRupiah: accountsReceivableRupiah, source: 'Open invoices excluding PAID/CANCELLED', confidence: 'MEDIUM' },
        { key: 'cash_bank', label: 'Cash/Bank', amountRupiah: null, source: 'Belum dimodelkan', confidence: 'LOCKED' },
      ],
      liabilities: [
        { key: 'deposit_held', label: 'Deposit Held Liability', amountRupiah: depositHeldLiabilityRupiah, source: 'Active stay deposit paid amount', confidence: 'MEDIUM' },
        { key: 'current_payables', label: 'Current Payables', amountRupiah: null, source: 'Belum dimodelkan', confidence: 'LOCKED' },
      ],
      equity: [
        { key: 'owner_equity', label: 'Owner Equity / Retained Earnings', amountRupiah: null, source: 'Belum dimodelkan', confidence: 'LOCKED' },
      ],
      totals: {
        knownAssetsRupiah: accountsReceivableRupiah,
        knownLiabilitiesRupiah: depositHeldLiabilityRupiah,
        knownEquityRupiah: null,
        equationBalanced: false,
      },
      readiness,
      note: 'Draft ini sengaja tidak menampilkan formal ratio karena belum ada cash/bank, payables, equity, dan asset ledger yang reliable.',
    };
  }

  async ownerDashboard(query: FinancePeriodQueryDto = {}) {
    const { year, month, start, end } = monthWindow(query);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Prev month for comparison
    const prevStart = new Date(Date.UTC(year, month - 2, 1));
    const prevEnd = new Date(Date.UTC(year, month - 1, 1));

    const [
      roomStatusGroups,
      activeStayCount,
      invoiceAgg,
      prevInvoiceAgg,
      paymentAgg,
      prevPaymentAgg,
      expenseAgg,
      prevExpenseAgg,
      openInvoiceAgg,
      overdueAgg,
      wifiAgg,
      prevWifiAgg,
      pendingPaymentCount,
    ] = await Promise.all([
      this.prisma.room.groupBy({ by: ['status'], _count: { id: true }, where: { isActive: true } }),
      this.prisma.stay.count({ where: { status: StayStatus.ACTIVE as any, initialMetersPromotedAt: { not: null } } }),
      // Current month invoice
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: { status: { not: InvoiceStatus.CANCELLED as any }, periodStart: { gte: start, lt: end } },
      }),
      // Prev month invoice
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        where: { status: { not: InvoiceStatus.CANCELLED as any }, periodStart: { gte: prevStart, lt: prevEnd } },
      }),
      // Current month payment
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        where: { paymentDate: { gte: start, lt: end } },
      }),
      // Prev month payment
      this.prisma.invoicePayment.aggregate({
        _sum: { amountRupiah: true },
        where: { paymentDate: { gte: prevStart, lt: prevEnd } },
      }),
      // Current month expense
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        where: { expenseDate: { gte: start, lt: end } },
      }),
      // Prev month expense
      this.prisma.expense.aggregate({
        _sum: { amountRupiah: true },
        where: { expenseDate: { gte: prevStart, lt: prevEnd } },
      }),
      // Open invoices
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] as any } },
      }),
      // Overdue
      this.prisma.invoice.aggregate({
        _sum: { totalAmountRupiah: true },
        _count: { id: true },
        where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] as any }, dueDate: { lt: today } },
      }),
      // Current month WiFi
      this.prisma.wifiSale.aggregate({
        _sum: { soldPriceRupiah: true },
        where: { saleDate: { gte: start, lt: end } },
      }),
      // Prev month WiFi
      this.prisma.wifiSale.aggregate({
        _sum: { soldPriceRupiah: true },
        where: { saleDate: { gte: prevStart, lt: prevEnd } },
      }),
      this.prisma.paymentSubmission.count({ where: { status: PaymentSubmissionStatus.PENDING_REVIEW as any } }),
    ]);

    // --- Room occupancy ---
    const byStatus = roomStatusGroups.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.status)] = row._count.id;
      return acc;
    }, {});
    const totalRooms = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
    const maintenanceRooms = (byStatus[RoomStatus.MAINTENANCE] ?? 0) + (byStatus[RoomStatus.INACTIVE] ?? 0);
    const operableRooms = Math.max(0, totalRooms - maintenanceRooms);
    const occupancyRate = operableRooms > 0 ? roundPercent((activeStayCount / operableRooms) * 100) : 0;

    // --- KPI values (current month) ---
    const invoiceRevenue = Number(invoiceAgg._sum.totalAmountRupiah ?? 0);
    const wifiRevenue = Number(wifiAgg._sum.soldPriceRupiah ?? 0);
    const totalRevenue = invoiceRevenue + wifiRevenue;
    const totalExpense = Number(expenseAgg._sum.amountRupiah ?? 0);
    const netProfit = totalRevenue - totalExpense;
    const cashIn = Number(paymentAgg._sum.amountRupiah ?? 0) + wifiRevenue;
    const cashOut = totalExpense;
    const netCashFlow = cashIn - cashOut;
    const netProfitMargin = totalRevenue > 0 ? roundPercent((netProfit / totalRevenue) * 100) : 0;

    // --- KPI values (prev month) ---
    const prevInvoiceRevenue = Number(prevInvoiceAgg._sum.totalAmountRupiah ?? 0);
    const prevWifiRevenue = Number(prevWifiAgg._sum.soldPriceRupiah ?? 0);
    const prevTotalRevenue = prevInvoiceRevenue + prevWifiRevenue;
    const prevTotalExpense = Number(prevExpenseAgg._sum.amountRupiah ?? 0);
    const prevNetProfit = prevTotalRevenue - prevTotalExpense;
    const prevCashIn = Number(prevPaymentAgg._sum.amountRupiah ?? 0) + prevWifiRevenue;
    const prevCashOut = prevTotalExpense;
    const prevNetCashFlow = prevCashIn - prevCashOut;

    // --- Change percent ---
    const changePercent = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return roundPercent(((current - previous) / previous) * 100);
    };

    // --- Grade ---
    const occupancyScore = occupancyRate >= 85 ? 25 : occupancyRate >= 60 ? 20 : 10;
    const profitScore = netProfitMargin >= 30 ? 25 : netProfitMargin >= 10 ? 15 : 5;
    const cashScore = netCashFlow >= 0 ? 25 : 10;
    const overduePenalty = Number(overdueAgg._count.id ?? 0) * 4;
    const pendingPenalty = pendingPaymentCount * 2;
    const score = Math.max(0, Math.min(100, occupancyScore + profitScore + cashScore + 25 - overduePenalty - pendingPenalty));
    const gradeMap = score >= 80 ? 'SEHAT' : score >= 60 ? 'PERHATIAN' : score >= 40 ? 'RISIKO' : 'KRITIS';

    // --- Signals ---
    const signals: Array<{ type: string; count: number; totalRupiah?: number; route: string }> = [];
    if (Number(overdueAgg._count.id ?? 0) > 0) {
      signals.push({ type: 'overdue', count: Number(overdueAgg._count.id), totalRupiah: Number(overdueAgg._sum.totalAmountRupiah ?? 0), route: '/invoices' });
    }
    if (pendingPaymentCount > 0) {
      signals.push({ type: 'pending_payment', count: pendingPaymentCount, route: '/payment-submissions/review' });
    }
    const outstanding = Number(openInvoiceAgg._sum.totalAmountRupiah ?? 0);
    const outstandingCount = Number(openInvoiceAgg._count.id ?? 0);
    if (outstanding > 0) {
      signals.push({ type: 'outstanding', count: outstandingCount, totalRupiah: outstanding, route: '/invoices' });
    }

    // --- Trend (dinamis berdasarkan query.trendMonths, default 6) ---
    const trendCount = query.trendMonths ?? 6;
    const trendMonths: Array<{ year: number; month: number; revenue: number; expense: number; netProfit: number }> = [];
    for (let i = trendCount - 1; i >= 0; i--) {
      const m = month - i;
      let ty = year;
      let tm = m;
      while (tm <= 0) { tm += 12; ty -= 1; }
      const trendStart = new Date(Date.UTC(ty, tm - 1, 1));
      const trendEnd = new Date(Date.UTC(ty, tm, 1));
      const [trendInvoice, trendExpense, trendWifi] = await Promise.all([
        this.prisma.invoice.aggregate({
          _sum: { totalAmountRupiah: true },
          where: { status: { not: InvoiceStatus.CANCELLED as any }, periodStart: { gte: trendStart, lt: trendEnd } },
        }),
        this.prisma.expense.aggregate({
          _sum: { amountRupiah: true },
          where: { expenseDate: { gte: trendStart, lt: trendEnd } },
        }),
        this.prisma.wifiSale.aggregate({
          _sum: { soldPriceRupiah: true },
          where: { saleDate: { gte: trendStart, lt: trendEnd } },
        }),
      ]);
      const rev = Number(trendInvoice._sum.totalAmountRupiah ?? 0) + Number(trendWifi._sum.soldPriceRupiah ?? 0);
      const exp = Number(trendExpense._sum.amountRupiah ?? 0);
      trendMonths.push({ year: ty, month: tm, revenue: rev, expense: exp, netProfit: rev - exp });
    }

    // --- Headline ---
    const headlineParts: string[] = [];
    if (netProfit > 0 && occupancyRate >= 70) {
      headlineParts.push('Bulan ini bisnis Anda sehat.');
    } else if (netProfit > 0) {
      headlineParts.push('Bulan ini masih untung, tapi ada yang perlu diperhatikan.');
    } else {
      headlineParts.push('Bulan ini perlu perhatian lebih.');
    }
    const revChange = changePercent(totalRevenue, prevTotalRevenue);
    if (revChange > 0) headlineParts.push(`Pendapatan naik ${revChange}% dibanding bulan lalu.`);
    else if (revChange < 0) headlineParts.push(`Pendapatan turun ${Math.abs(revChange)}% dibanding bulan lalu.`);
    else headlineParts.push('Pendapatan stabil dibanding bulan lalu.');
    if (signals.length > 0) headlineParts.push(`Ada ${signals.length} hal yang perlu ditindaklanjuti.`);

    return {
      year,
      month,
      grade: gradeMap,
      score,
      headline: headlineParts.join(' '),
      kpi: {
        totalRevenueRupiah: totalRevenue,
        totalRevenuePrevMonthRupiah: prevTotalRevenue,
        totalRevenueChangePercent: changePercent(totalRevenue, prevTotalRevenue),
        netProfitRupiah: netProfit,
        netProfitPrevMonthRupiah: prevNetProfit,
        netProfitChangePercent: changePercent(netProfit, prevNetProfit),
        netProfitMarginPercent: netProfitMargin,
        occupancyRatePercent: occupancyRate,
        occupancyRatePrevMonthPercent: null, // occupancy is snapshot, not period-based
        occupancyRateChangePercent: null,
        netCashFlowRupiah: netCashFlow,
        netCashFlowPrevMonthRupiah: prevNetCashFlow,
        netCashFlowChangePercent: changePercent(netCashFlow, prevNetCashFlow),
      },
      signals,
      trendMonths,
      trend6Months: trendMonths,
      generatedAt: new Date().toISOString(),
    };
  }
}
