import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const AUTO_SOURCE_TYPES = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'] as const;
type AutoSourceType = (typeof AUTO_SOURCE_TYPES)[number];

type JournalLineInput = {
  chartOfAccountId: number;
  cashAccountId?: number | null;
  description?: string;
  debitRupiah?: number;
  creditRupiah?: number;
  sortOrder?: number;
};

type PostJournalInput = {
  sourceType: AutoSourceType;
  sourceId: string;
  entryDate: Date;
  memo: string;
  createdById?: number | null;
  lines: JournalLineInput[];
};

function rupiah(value?: number | null) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : 0;
}

function dateOnly(value: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sourceEntryNumber(sourceType: string, sourceId: string) {
  return `JE-AUTO-${sourceType.replace(/_/g, '-')}-${sourceId}`;
}

@Injectable()
export class AccountingPostingService {
  private readonly logger = new Logger(AccountingPostingService.name);

  constructor(private readonly prisma: PrismaService) {}

  explainPostingBoundary() {
    return {
      autoPostingEnabled: true,
      basis: 'V5.25_B3_AUTO_JOURNAL_LITE',
      sourceTypes: [...AUTO_SOURCE_TYPES],
      behavior: 'Idempotent by sourceType/sourceId. Jika COA, cash account, atau accounting period belum siap, transaksi bisnis tetap aman dan journal auto-posting akan diskip dengan warning.',
      excluded: ['DEPOSIT', 'DEPRECIATION', 'INVENTORY', 'CANCELLED_INVOICE_REVERSAL'],
      note: 'B3 Lite mem-post invoice issued, invoice payment, expense, dan WiFi sale. Deposit liability serta reversal pembatalan invoice disiapkan untuk batch lanjutan.',
    };
  }

  async postInvoiceIssued(invoiceId: number, createdById?: number | null) {
    return (this.prisma as any).$transaction((tx: any) => this.postInvoiceIssuedTx(tx, invoiceId, createdById));
  }

  async postInvoicePayment(invoicePaymentId: number, createdById?: number | null) {
    return (this.prisma as any).$transaction((tx: any) => this.postInvoicePaymentTx(tx, invoicePaymentId, createdById));
  }

  async postExpense(expenseId: number, createdById?: number | null) {
    return (this.prisma as any).$transaction((tx: any) => this.postExpenseTx(tx, expenseId, createdById));
  }

  async postWifiSale(wifiSaleId: number, createdById?: number | null) {
    return (this.prisma as any).$transaction((tx: any) => this.postWifiSaleTx(tx, wifiSaleId, createdById));
  }

  async postInvoiceIssuedTx(tx: any, invoiceId: number, createdById?: number | null) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, stay: { include: { tenant: true, room: true } } },
    });

    if (!invoice) return this.skip('INVOICE', invoiceId, 'Invoice tidak ditemukan.');
    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      return this.skip('INVOICE', invoiceId, `Invoice status ${invoice.status} belum boleh di-auto-journal.`);
    }
    if (!invoice.lines?.length) return this.skip('INVOICE', invoiceId, 'Invoice belum punya line.');

    const lineTotal = invoice.lines.reduce((sum: number, line: any) => sum + Number(line.lineAmountRupiah ?? 0), 0);
    const receivableAmount = rupiah(invoice.totalAmountRupiah || lineTotal);
    if (receivableAmount <= 0) return this.skip('INVOICE', invoiceId, 'Invoice total 0.');

    const ar = await this.findAccountByCodeTx(tx, '1100');
    if (!ar) return this.skip('INVOICE', invoiceId, 'COA 1100 Accounts Receivable belum tersedia.');

    const lines: JournalLineInput[] = [
      {
        chartOfAccountId: ar.id,
        description: `Piutang invoice ${invoice.invoiceNumber}`,
        debitRupiah: receivableAmount,
        creditRupiah: 0,
        sortOrder: 0,
      },
    ];

    let sortOrder = 1;
    for (const line of invoice.lines) {
      const amount = Number(line.lineAmountRupiah ?? 0);
      if (!Number.isFinite(amount) || amount === 0) continue;
      const code = this.revenueCodeForInvoiceLine(line.lineType, line.utilityType);
      const account = await this.findAccountByCodeTx(tx, code);
      if (!account) return this.skip('INVOICE', invoiceId, `COA revenue ${code} belum tersedia.`);

      const isDiscountOrNegative = amount < 0;
      lines.push({
        chartOfAccountId: account.id,
        description: line.description || `Revenue invoice ${invoice.invoiceNumber}`,
        debitRupiah: isDiscountOrNegative ? rupiah(Math.abs(amount)) : 0,
        creditRupiah: isDiscountOrNegative ? 0 : rupiah(amount),
        sortOrder: sortOrder++,
      });
    }

    return this.postBalancedJournalTx(tx, {
      sourceType: 'INVOICE',
      sourceId: String(invoice.id),
      entryDate: dateOnly(invoice.issuedAt ?? invoice.createdAt),
      memo: `Auto journal invoice ${invoice.invoiceNumber}`,
      createdById: createdById ?? invoice.createdById ?? null,
      lines,
    });
  }

  async postInvoicePaymentTx(tx: any, invoicePaymentId: number, createdById?: number | null) {
    const payment = await tx.invoicePayment.findUnique({
      where: { id: invoicePaymentId },
      include: { invoice: true },
    });
    if (!payment) return this.skip('INVOICE_PAYMENT', invoicePaymentId, 'Invoice payment tidak ditemukan.');

    const amount = rupiah(payment.amountRupiah);
    if (amount <= 0) return this.skip('INVOICE_PAYMENT', invoicePaymentId, 'Payment amount 0.');

    const cash = await this.findCashAccountForPaymentMethodTx(tx, payment.method);
    if (!cash) return this.skip('INVOICE_PAYMENT', invoicePaymentId, 'Cash/bank account aktif belum tersedia.');

    const ar = await this.findAccountByCodeTx(tx, '1100');
    if (!ar) return this.skip('INVOICE_PAYMENT', invoicePaymentId, 'COA 1100 Accounts Receivable belum tersedia.');

    return this.postBalancedJournalTx(tx, {
      sourceType: 'INVOICE_PAYMENT',
      sourceId: String(payment.id),
      entryDate: dateOnly(payment.paymentDate),
      memo: `Auto journal pembayaran invoice ${payment.invoice?.invoiceNumber ?? payment.invoiceId}`,
      createdById: createdById ?? payment.capturedById ?? null,
      lines: [
        {
          chartOfAccountId: cash.chartOfAccountId,
          cashAccountId: cash.id,
          description: `Kas masuk pembayaran invoice ${payment.invoice?.invoiceNumber ?? payment.invoiceId}`,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: ar.id,
          description: `Pelunasan piutang invoice ${payment.invoice?.invoiceNumber ?? payment.invoiceId}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async postExpenseTx(tx: any, expenseId: number, createdById?: number | null) {
    const expense = await tx.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return this.skip('EXPENSE', expenseId, 'Expense tidak ditemukan.');

    const amount = rupiah(expense.amountRupiah);
    if (amount <= 0) return this.skip('EXPENSE', expenseId, 'Expense amount 0.');

    const expenseAccount = await this.findAccountByCodeTx(tx, this.expenseCodeForCategory(expense.category));
    if (!expenseAccount) return this.skip('EXPENSE', expenseId, 'COA expense tujuan belum tersedia.');

    const cash = await this.findDefaultCashAccountTx(tx);
    if (!cash) return this.skip('EXPENSE', expenseId, 'Cash/bank account aktif belum tersedia.');

    return this.postBalancedJournalTx(tx, {
      sourceType: 'EXPENSE',
      sourceId: String(expense.id),
      entryDate: dateOnly(expense.expenseDate),
      memo: `Auto journal expense: ${expense.description}`,
      createdById: createdById ?? expense.createdById ?? null,
      lines: [
        {
          chartOfAccountId: expenseAccount.id,
          description: expense.description,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: cash.chartOfAccountId,
          cashAccountId: cash.id,
          description: `Kas keluar: ${expense.description}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async postWifiSaleTx(tx: any, wifiSaleId: number, createdById?: number | null) {
    const sale = await tx.wifiSale.findUnique({ where: { id: wifiSaleId } });
    if (!sale) return this.skip('WIFI_SALE', wifiSaleId, 'WiFi sale tidak ditemukan.');

    const amount = rupiah(sale.soldPriceRupiah);
    if (amount <= 0) return this.skip('WIFI_SALE', wifiSaleId, 'WiFi sale amount 0.');

    const cash = await this.findDefaultCashAccountTx(tx);
    if (!cash) return this.skip('WIFI_SALE', wifiSaleId, 'Cash/bank account aktif belum tersedia.');

    const wifiRevenue = await this.findAccountByCodeTx(tx, '4200');
    if (!wifiRevenue) return this.skip('WIFI_SALE', wifiSaleId, 'COA 4200 Wifi Voucher Revenue belum tersedia.');

    return this.postBalancedJournalTx(tx, {
      sourceType: 'WIFI_SALE',
      sourceId: String(sale.id),
      entryDate: dateOnly(sale.saleDate),
      memo: `Auto journal penjualan WiFi ${sale.packageName}`,
      createdById: createdById ?? sale.createdById ?? null,
      lines: [
        {
          chartOfAccountId: cash.chartOfAccountId,
          cashAccountId: cash.id,
          description: `Kas masuk WiFi ${sale.packageName}`,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: wifiRevenue.id,
          description: `Pendapatan WiFi ${sale.packageName}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async backfillAutoJournal(dto: { sourceTypes?: string[]; limit?: number } = {}, createdById?: number | null) {
    const sourceTypes = (dto.sourceTypes?.length ? dto.sourceTypes : [...AUTO_SOURCE_TYPES]).filter((item): item is AutoSourceType =>
      AUTO_SOURCE_TYPES.includes(item as AutoSourceType),
    );
    const limit = Math.min(Math.max(Number(dto.limit ?? 25), 1), 50);
    const items: Array<{ sourceType: AutoSourceType; sourceId: number; result: any }> = [];
    const warnings: string[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const sourceType of sourceTypes) {
      const remaining = limit - items.length;
      if (remaining <= 0) break;
      const ids = await this.findUnmappedSourceIds(sourceType, remaining);
      for (const id of ids) {
        try {
          const result = await this.postBySourceType(sourceType, id, createdById);
          if (result?.posted) createdCount += 1;
          else skippedCount += 1;
          if (result?.reason) warnings.push(`${sourceType} #${id}: ${result.reason}`);
          items.push({ sourceType, sourceId: id, result });
        } catch (error) {
          failedCount += 1;
          const message = error instanceof Error ? error.message : String(error);
          warnings.push(`${sourceType} #${id}: ${message}`);
          items.push({ sourceType, sourceId: id, result: { posted: false, skipped: false, failed: true, reason: message } });
        }
      }
    }

    return {
      basis: 'AUTO_JOURNAL_BACKFILL_LITE',
      limit,
      sourceTypes,
      createdCount,
      skippedCount,
      failedCount,
      items,
      warnings,
      note: 'Backfill terbatas dan idempotent. Deposit, inventory, depreciation, dan reversal belum diproses di B3.1.',
    };
  }

  private async postBySourceType(sourceType: AutoSourceType, sourceId: number, createdById?: number | null) {
    if (sourceType === 'INVOICE') return this.postInvoiceIssued(sourceId, createdById);
    if (sourceType === 'INVOICE_PAYMENT') return this.postInvoicePayment(sourceId, createdById);
    if (sourceType === 'EXPENSE') return this.postExpense(sourceId, createdById);
    return this.postWifiSale(sourceId, createdById);
  }

  private async findUnmappedSourceIds(sourceType: AutoSourceType, limit: number) {
    const mapped = await this.mappedSourceIds(sourceType);
    if (sourceType === 'INVOICE') {
      const rows = await (this.prisma as any).invoice.findMany({
        where: { status: { in: ['ISSUED', 'PARTIAL', 'PAID'] as any }, id: { notIn: mapped } },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: limit,
      });
      return rows.map((row: any) => row.id);
    }
    if (sourceType === 'INVOICE_PAYMENT') {
      const rows = await (this.prisma as any).invoicePayment.findMany({ where: { id: { notIn: mapped } }, select: { id: true }, orderBy: { id: 'asc' }, take: limit });
      return rows.map((row: any) => row.id);
    }
    if (sourceType === 'EXPENSE') {
      const rows = await (this.prisma as any).expense.findMany({ where: { id: { notIn: mapped } }, select: { id: true }, orderBy: { id: 'asc' }, take: limit });
      return rows.map((row: any) => row.id);
    }
    const rows = await (this.prisma as any).wifiSale.findMany({ where: { id: { notIn: mapped } }, select: { id: true }, orderBy: { id: 'asc' }, take: limit });
    return rows.map((row: any) => row.id);
  }

  private async mappedSourceIds(sourceType: AutoSourceType) {
    const rows = await (this.prisma as any).journalEntry.findMany({
      where: { sourceType: sourceType as any, sourceId: { not: null }, status: { not: 'VOID' as any } },
      select: { sourceId: true },
    });
    return rows.map((row: any) => Number(row.sourceId)).filter((id: number) => Number.isFinite(id));
  }

  private async postBalancedJournalTx(tx: any, input: PostJournalInput) {
    const existing = await tx.journalEntry.findFirst({
      where: { sourceType: input.sourceType as any, sourceId: input.sourceId },
      select: { id: true, entryNumber: true, status: true },
    });
    if (existing) {
      return { posted: false, skipped: true, reason: `Journal sudah ada (${existing.entryNumber}).`, journalEntry: existing };
    }

    const normalizedLines = input.lines
      .map((line, index) => ({
        ...line,
        debitRupiah: rupiah(line.debitRupiah),
        creditRupiah: rupiah(line.creditRupiah),
        sortOrder: line.sortOrder ?? index,
      }))
      .filter((line) => line.debitRupiah > 0 || line.creditRupiah > 0);

    if (normalizedLines.length < 2) return this.skip(input.sourceType, input.sourceId, 'Journal line kurang dari 2.');
    if (normalizedLines.some((line) => line.debitRupiah > 0 && line.creditRupiah > 0)) return this.skip(input.sourceType, input.sourceId, 'Ada line debit dan kredit sekaligus.');

    const totalDebit = normalizedLines.reduce((sum, line) => sum + line.debitRupiah, 0);
    const totalCredit = normalizedLines.reduce((sum, line) => sum + line.creditRupiah, 0);
    if (totalDebit <= 0 || totalCredit <= 0 || totalDebit !== totalCredit) {
      return this.skip(input.sourceType, input.sourceId, `Journal tidak balance: debit ${totalDebit}, kredit ${totalCredit}.`);
    }

    const period = await this.findOpenAccountingPeriodTx(tx, input.entryDate);
    if (!period) return this.skip(input.sourceType, input.sourceId, 'Tidak ada accounting period OPEN untuk tanggal transaksi.');

    const journal = await tx.journalEntry.create({
      data: {
        entryNumber: sourceEntryNumber(input.sourceType, input.sourceId),
        entryDate: dateOnly(input.entryDate),
        accountingPeriodId: period.id,
        status: 'POSTED' as any,
        sourceType: input.sourceType as any,
        sourceId: input.sourceId,
        memo: input.memo,
        totalDebitRupiah: totalDebit,
        totalCreditRupiah: totalCredit,
        isBalanced: true,
        createdById: input.createdById ?? undefined,
        postedById: input.createdById ?? undefined,
        postedAt: new Date(),
        lines: {
          create: normalizedLines.map((line) => ({
            chartOfAccountId: line.chartOfAccountId,
            cashAccountId: line.cashAccountId ?? undefined,
            description: line.description,
            debitRupiah: line.debitRupiah,
            creditRupiah: line.creditRupiah,
            sortOrder: line.sortOrder,
          })),
        },
      },
      include: { lines: { include: { chartOfAccount: true, cashAccount: true }, orderBy: { sortOrder: 'asc' } } },
    });

    return { posted: true, skipped: false, journalEntry: journal };
  }

  private async findOpenAccountingPeriodTx(tx: any, value: Date) {
    const entryDate = dateOnly(value);
    return tx.accountingPeriod.findFirst({
      where: {
        status: 'OPEN' as any,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  private async findAccountByCodeTx(tx: any, code: string) {
    return tx.chartOfAccount.findFirst({ where: { code, isActive: true } });
  }

  private async findDefaultCashAccountTx(tx: any) {
    const defaultCash = await tx.cashAccount.findFirst({ where: { isDefault: true, isActive: true }, orderBy: { id: 'asc' } });
    if (defaultCash) return defaultCash;
    return tx.cashAccount.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
  }

  private async findCashAccountForPaymentMethodTx(tx: any, method?: string | null) {
    const preferredType = method === 'QRIS' ? 'QRIS' : method === 'EWALLET' ? 'EWALLET' : method === 'CASH' ? 'CASH' : 'BANK';
    const preferred = await tx.cashAccount.findFirst({ where: { accountType: preferredType as any, isActive: true }, orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] });
    if (preferred) return preferred;
    return this.findDefaultCashAccountTx(tx);
  }

  private revenueCodeForInvoiceLine(lineType?: string | null, utilityType?: string | null) {
    if (lineType === 'RENT') return '4000';
    if (lineType === 'ELECTRICITY' || utilityType === 'ELECTRICITY') return '4100';
    if (lineType === 'WATER' || utilityType === 'WATER') return '4110';
    if (lineType === 'WIFI') return '4200';
    if (lineType === 'PENALTY') return '4400';
    return '4300';
  }

  private expenseCodeForCategory(category?: string | null) {
    const mapping: Record<string, string> = {
      SALARY: '6000',
      ELECTRICITY: '6100',
      WATER: '6110',
      INTERNET: '6120',
      MAINTENANCE: '6200',
      CLEANING: '6210',
      SUPPLIES: '6220',
      MARKETING: '6300',
      TAX: '6400',
      OTHER: '6990',
      RENT_BUILDING: '6990',
    };
    return mapping[String(category ?? 'OTHER')] ?? '6990';
  }

  private skip(sourceType: string, sourceId: string | number, reason: string) {
    this.logger.warn(`Skip auto journal ${sourceType} #${sourceId}: ${reason}`);
    return { posted: false, skipped: true, sourceType, sourceId: String(sourceId), reason };
  }
}
