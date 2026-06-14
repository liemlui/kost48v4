import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "../../generated/prisma";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type AutoSourceType,
  dateOnly,
  mappedDepositStaySourceIds,
  mappedSourceIds,
  findAccountingPeriodForPostingTx,
  findAccountByCodeTx,
  findDefaultCashAccountTx,
  findCashAccountForPaymentMethodTx,
  revenueCodeForInvoiceLine,
  expenseCodeForCategory,
} from './accounting-posting-helpers';

type AccountingJournalSourceType = AutoSourceType | "DEPOSIT" | "ADJUSTMENT" | "DEPRECIATION" | "CLOSING_ENTRY" | "CLOSING_REVERSAL";

type JournalLineInput = {
  chartOfAccountId: number;
  cashAccountId?: number | null;
  description?: string;
  debitRupiah?: number;
  creditRupiah?: number;
  sortOrder?: number;
};

type PostJournalInput = {
  sourceType: AccountingJournalSourceType;
  sourceId: string;
  entryDate: Date;
  memo: string;
  createdById?: number | null;
  lines: JournalLineInput[];
};

function rupiah(value?: number | null) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue)
    ? Math.max(0, Math.round(numberValue))
    : 0;
}

function sourceEntryNumber(sourceType: string, sourceId: string) {
  const normalizedSourceType = sourceType.replace(/_/g, "-");
  const normalizedSourceId = String(sourceId)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `JE-AUTO-${normalizedSourceType}-${normalizedSourceId}`;
}

@Injectable()
export class AccountingPostingService {
  private readonly logger = new Logger(AccountingPostingService.name);

  constructor(private readonly prisma: PrismaService) {}

  explainPostingBoundary() {
    return {
      autoPostingEnabled: true,
      basis: "V5.28_B8_CLOSED_PERIOD_GOVERNANCE",
      sourceTypes: ["INVOICE", "INVOICE_PAYMENT", "EXPENSE", "WIFI_SALE", "DEPOSIT", "ADJUSTMENT", "DEPRECIATION", "CLOSING_ENTRY", "CLOSING_REVERSAL"],
      behavior:
        "Idempotent by sourceType/sourceId. Jika COA/cash/period belum siap atau periode sudah CLOSED, transaksi bisnis tetap aman dan journal auto-posting diskip dengan warning; koreksi periode closed harus lewat reopen/reversal Owner-only.",
      excluded: ["INVENTORY", "PAYMENT_REVERSAL"],
      note: "B8 menambahkan closed-period guard: tidak ada journal baru yang boleh masuk periode CLOSED kecuali workflow close/reopen yang terkontrol.",
    };
  }

  async postInvoiceIssued(invoiceId: number, createdById?: number | null) {
    return this.runIdempotentPosting(`INVOICE:${invoiceId}`, (tx: any) =>
      this.postInvoiceIssuedTx(tx, invoiceId, createdById),
    );
  }

  async postInvoicePayment(
    invoicePaymentId: number,
    createdById?: number | null,
  ) {
    return this.runIdempotentPosting(
      `INVOICE_PAYMENT:${invoicePaymentId}`,
      (tx: any) => this.postInvoicePaymentTx(tx, invoicePaymentId, createdById),
    );
  }

  async postExpense(expenseId: number, createdById?: number | null) {
    return this.runIdempotentPosting(`EXPENSE:${expenseId}`, (tx: any) =>
      this.postExpenseTx(tx, expenseId, createdById),
    );
  }

  async postWifiSale(wifiSaleId: number, createdById?: number | null) {
    return this.runIdempotentPosting(`WIFI_SALE:${wifiSaleId}`, (tx: any) =>
      this.postWifiSaleTx(tx, wifiSaleId, createdById),
    );
  }

  async postDepositReceivedForStay(
    stayId: number,
    createdById?: number | null,
    paymentMethod?: string | null,
    entryDate?: Date | string | null,
  ) {
    return this.runIdempotentPosting(`DEPOSIT:${stayId}`, (tx: any) =>
      this.postDepositReceivedForStayTx(
        tx,
        stayId,
        createdById,
        paymentMethod,
        entryDate,
      ),
    );
  }

  async postDepositSettlement(stayId: number, createdById?: number | null) {
    return this.runIdempotentPosting(`DEPOSIT_SETTLEMENT:${stayId}`, (tx: any) =>
      this.postDepositSettlementTx(tx, stayId, createdById),
    );
  }

  async postInvoiceCancellationReversal(
    invoiceId: number,
    createdById?: number | null,
  ) {
    return this.runIdempotentPosting(
      `INVOICE_CANCEL_REVERSAL:${invoiceId}`,
      (tx: any) =>
        this.postInvoiceCancellationReversalTx(tx, invoiceId, createdById),
    );
  }

  async postFixedAssetLedgerAlignmentTx(
    tx: any,
    input: {
      assetId: number;
      assetCode?: string | null;
      method: "RECLASSIFY_FROM_CASH" | "OWNER_CAPITAL_CONTRIBUTION";
      amountRupiah: number;
      creditAccountCode?: string | null;
      entryDate?: Date | string | null;
      notes?: string | null;
      createdById?: number | null;
    },
  ) {
    const amount = rupiah(input.amountRupiah);
    if (amount <= 0) {
      return this.skip(
        "ADJUSTMENT",
        `FIXED_ASSET_ALIGNMENT:${input.assetId}`,
        "Jumlah alignment aset harus lebih dari 0.",
      );
    }

    const fixedAsset = await findAccountByCodeTx(tx, "1500");
    if (!fixedAsset) {
      return this.skip(
        "ADJUSTMENT",
        `FIXED_ASSET_ALIGNMENT:${input.assetId}`,
        "COA 1500 Fixed Assets belum tersedia.",
      );
    }

    const creditCode =
      input.method === "OWNER_CAPITAL_CONTRIBUTION"
        ? "3000"
        : input.creditAccountCode || "1010";
    const creditAccount = await findAccountByCodeTx(tx, creditCode);
    if (!creditAccount) {
      return this.skip(
        "ADJUSTMENT",
        `FIXED_ASSET_ALIGNMENT:${input.assetId}`,
        `COA kredit ${creditCode} belum tersedia.`,
      );
    }

    const sourceId = `FIXED_ASSET_ALIGNMENT:${input.assetId}`;
    const assetLabel = input.assetCode ? `${input.assetCode} (#${input.assetId})` : `#${input.assetId}`;
    const methodLabel =
      input.method === "OWNER_CAPITAL_CONTRIBUTION"
        ? "kontribusi modal owner"
        : `reklasifikasi dari ${creditAccount.code} ${creditAccount.name}`;

    return this.postBalancedJournalTx(tx, {
      sourceType: "ADJUSTMENT",
      sourceId,
      entryDate: dateOnly(input.entryDate ?? new Date()),
      memo: `Fixed asset ledger alignment ${assetLabel}: ${methodLabel}`,
      createdById: input.createdById ?? null,
      lines: [
        {
          chartOfAccountId: fixedAsset.id,
          description: `Masukkan aset ${assetLabel} ke ledger Fixed Assets`,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: creditAccount.id,
          description: `Sumber alignment aset ${assetLabel}: ${methodLabel}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async postDepreciationRunTx(
    tx: any,
    depreciationRunId: number,
    entryDate: Date | string,
    amountRupiah: number,
    createdById?: number | null,
  ) {
    const amount = rupiah(amountRupiah);
    if (amount <= 0) {
      return this.skip(
        "DEPRECIATION",
        depreciationRunId,
        "Jumlah depresiasi 0.",
      );
    }

    const depreciationExpense = await findAccountByCodeTx(tx, "6700");
    if (!depreciationExpense) {
      return this.skip(
        "DEPRECIATION",
        depreciationRunId,
        "COA 6700 Depreciation belum tersedia.",
      );
    }

    const accumulatedDepreciation = await findAccountByCodeTx(tx, "1590");
    if (!accumulatedDepreciation) {
      return this.skip(
        "DEPRECIATION",
        depreciationRunId,
        "COA 1590 Accumulated Depreciation belum tersedia.",
      );
    }

    return this.postBalancedJournalTx(tx, {
      sourceType: "DEPRECIATION",
      sourceId: String(depreciationRunId),
      entryDate: dateOnly(entryDate),
      memo: `Auto journal depresiasi aset run #${depreciationRunId}`,
      createdById: createdById ?? null,
      lines: [
        {
          chartOfAccountId: depreciationExpense.id,
          description: `Beban depresiasi aset run #${depreciationRunId}`,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: accumulatedDepreciation.id,
          description: `Akumulasi depresiasi aset run #${depreciationRunId}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async postInvoiceIssuedTx(
    tx: any,
    invoiceId: number,
    createdById?: number | null,
  ) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        stay: { include: { tenant: true, room: true } },
      },
    });

    if (!invoice)
      return this.skip("INVOICE", invoiceId, "Invoice tidak ditemukan.");
    if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
      return this.skip(
        "INVOICE",
        invoiceId,
        `Invoice status ${invoice.status} belum boleh di-auto-journal.`,
      );
    }
    if (!invoice.lines?.length)
      return this.skip("INVOICE", invoiceId, "Invoice belum punya line.");

    const lineTotal = invoice.lines.reduce(
      (sum: number, line: any) => sum + Number(line.lineAmountRupiah ?? 0),
      0,
    );
    const receivableAmount = rupiah(invoice.totalAmountRupiah || lineTotal);
    if (receivableAmount <= 0)
      return this.skip("INVOICE", invoiceId, "Invoice total 0.");

    const ar = await findAccountByCodeTx(tx, "1100");
    if (!ar)
      return this.skip(
        "INVOICE",
        invoiceId,
        "COA 1100 Accounts Receivable belum tersedia.",
      );

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
      const code = revenueCodeForInvoiceLine(
        line.lineType,
        line.utilityType,
      );
      const account = await findAccountByCodeTx(tx, code);
      if (!account)
        return this.skip(
          "INVOICE",
          invoiceId,
          `COA revenue ${code} belum tersedia.`,
        );

      const isDiscountOrNegative = amount < 0;
      lines.push({
        chartOfAccountId: account.id,
        description:
          line.description || `Revenue invoice ${invoice.invoiceNumber}`,
        debitRupiah: isDiscountOrNegative ? rupiah(Math.abs(amount)) : 0,
        creditRupiah: isDiscountOrNegative ? 0 : rupiah(amount),
        sortOrder: sortOrder++,
      });
    }

    return this.postBalancedJournalTx(tx, {
      sourceType: "INVOICE",
      sourceId: String(invoice.id),
      entryDate: dateOnly(invoice.issuedAt ?? invoice.createdAt),
      memo: `Auto journal invoice ${invoice.invoiceNumber}`,
      createdById: createdById ?? invoice.createdById ?? null,
      lines,
    });
  }

  async postInvoicePaymentTx(
    tx: any,
    invoicePaymentId: number,
    createdById?: number | null,
  ) {
    const payment = await tx.invoicePayment.findUnique({
      where: { id: invoicePaymentId },
      include: { invoice: true },
    });
    if (!payment)
      return this.skip(
        "INVOICE_PAYMENT",
        invoicePaymentId,
        "Invoice payment tidak ditemukan.",
      );

    const amount = rupiah(payment.amountRupiah);
    if (amount <= 0)
      return this.skip(
        "INVOICE_PAYMENT",
        invoicePaymentId,
        "Payment amount 0.",
      );

    const cash = await findCashAccountForPaymentMethodTx(
      tx,
      payment.method,
    );
    if (!cash)
      return this.skip(
        "INVOICE_PAYMENT",
        invoicePaymentId,
        "Cash/bank account aktif belum tersedia.",
      );

    const ar = await findAccountByCodeTx(tx, "1100");
    if (!ar)
      return this.skip(
        "INVOICE_PAYMENT",
        invoicePaymentId,
        "COA 1100 Accounts Receivable belum tersedia.",
      );

    return this.postBalancedJournalTx(tx, {
      sourceType: "INVOICE_PAYMENT",
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
    if (!expense)
      return this.skip("EXPENSE", expenseId, "Expense tidak ditemukan.");
    if (expense.status && expense.status !== "CONFIRMED")
      return this.skip("EXPENSE", expenseId, "Hanya expense CONFIRMED yang boleh dijurnal.");

    const amount = rupiah(expense.amountRupiah);
    if (amount <= 0)
      return this.skip("EXPENSE", expenseId, "Expense amount 0.");

    const expenseAccount = await findAccountByCodeTx(
      tx,
      expenseCodeForCategory(expense.category),
    );
    if (!expenseAccount)
      return this.skip(
        "EXPENSE",
        expenseId,
        "COA expense tujuan belum tersedia.",
      );

    const cash = await findDefaultCashAccountTx(tx);
    if (!cash)
      return this.skip(
        "EXPENSE",
        expenseId,
        "Cash/bank account aktif belum tersedia.",
      );

    return this.postBalancedJournalTx(tx, {
      sourceType: "EXPENSE",
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

  async postWifiSaleTx(
    tx: any,
    wifiSaleId: number,
    createdById?: number | null,
  ) {
    const sale = await tx.wifiSale.findUnique({ where: { id: wifiSaleId } });
    if (!sale)
      return this.skip("WIFI_SALE", wifiSaleId, "WiFi sale tidak ditemukan.");

    const amount = rupiah(sale.soldPriceRupiah);
    if (amount <= 0)
      return this.skip("WIFI_SALE", wifiSaleId, "WiFi sale amount 0.");

    const cash = await findDefaultCashAccountTx(tx);
    if (!cash)
      return this.skip(
        "WIFI_SALE",
        wifiSaleId,
        "Cash/bank account aktif belum tersedia.",
      );

    const wifiRevenue = await findAccountByCodeTx(tx, "4200");
    if (!wifiRevenue)
      return this.skip(
        "WIFI_SALE",
        wifiSaleId,
        "COA 4200 Wifi Voucher Revenue belum tersedia.",
      );

    return this.postBalancedJournalTx(tx, {
      sourceType: "WIFI_SALE",
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

  async postDepositReceivedForStayTx(
    tx: any,
    stayId: number,
    createdById?: number | null,
    paymentMethod?: string | null,
    entryDate?: Date | string | null,
  ) {
    const stay = await tx.stay.findUnique({
      where: { id: stayId },
      include: { tenant: true, room: true },
    });
    if (!stay)
      return this.skip(
        "DEPOSIT",
        stayId,
        "Stay tidak ditemukan untuk deposit.",
      );

    const depositAmount = rupiah(stay.depositAmountRupiah);
    const paidAmount = rupiah(stay.depositPaidAmountRupiah);
    if (depositAmount <= 0 || paidAmount <= 0)
      return this.skip("DEPOSIT", stayId, "Deposit amount/paid masih 0.");
    if (paidAmount < depositAmount)
      return this.skip(
        "DEPOSIT",
        stayId,
        "Deposit belum lunas; liability journal ditunda sampai deposit penuh agar tidak underpost partial snapshot.",
      );

    const cash = paymentMethod
      ? await findCashAccountForPaymentMethodTx(tx, paymentMethod)
      : await findDefaultCashAccountTx(tx);
    if (!cash)
      return this.skip(
        "DEPOSIT",
        stayId,
        "Cash/bank account aktif belum tersedia.",
      );

    const depositLiability = await findAccountByCodeTx(tx, "2000");
    if (!depositLiability)
      return this.skip(
        "DEPOSIT",
        stayId,
        "COA 2000 Tenant Deposit Liability belum tersedia.",
      );

    return this.postBalancedJournalTx(tx, {
      sourceType: "DEPOSIT",
      sourceId: String(stay.id),
      entryDate: dateOnly(entryDate ?? stay.checkInDate ?? stay.createdAt),
      memo: `Auto journal deposit diterima untuk stay #${stay.id}`,
      createdById: createdById ?? null,
      lines: [
        {
          chartOfAccountId: cash.chartOfAccountId,
          cashAccountId: cash.id,
          description: `Kas masuk deposit stay #${stay.id}`,
          debitRupiah: paidAmount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: depositLiability.id,
          description: `Liabilitas deposit tenant stay #${stay.id}`,
          debitRupiah: 0,
          creditRupiah: paidAmount,
          sortOrder: 1,
        },
      ],
    });
  }

  async postDepositSettlementTx(
    tx: any,
    stayId: number,
    createdById?: number | null,
  ) {
    const stay = await tx.stay.findUnique({ where: { id: stayId } });
    if (!stay)
      return this.skip(
        "DEPOSIT",
        `SETTLEMENT:${stayId}`,
        "Stay tidak ditemukan untuk settlement deposit.",
      );

    const refunded = rupiah(stay.depositRefundedRupiah);
    const deduction = rupiah(stay.depositDeductionRupiah);
    const totalSettlement = refunded + deduction;
    if (totalSettlement <= 0)
      return this.skip(
        "DEPOSIT",
        `SETTLEMENT:${stayId}`,
        "Tidak ada refund/deduction deposit untuk dijurnal.",
      );

    // F1-8 (F-24): jangan debit liability 2000 bila TIDAK ada jurnal PENERIMAAN deposit
    // (credit 2000) untuk stay ini. Tanpa cek ini, settlement bisa membuat akun 2000
    // bersaldo DEBIT (uang titipan "hilang" dari buku). Hanya MENAMBAH cek — jurnal tidak diubah.
    const depositReceiptJournal = await tx.journalEntry.findFirst({
      where: { sourceType: "DEPOSIT" as any, sourceId: String(stayId), status: "POSTED" as any },
      select: { id: true },
    });
    if (!depositReceiptJournal)
      return this.skip(
        "DEPOSIT",
        `SETTLEMENT:${stayId}`,
        "Belum ada jurnal penerimaan deposit (akun 2000 tak pernah dikredit) untuk stay ini — settlement dilewati agar 2000 tidak jadi saldo debit (F-24).",
      );

    const depositLiability = await findAccountByCodeTx(tx, "2000");
    if (!depositLiability)
      return this.skip(
        "DEPOSIT",
        `SETTLEMENT:${stayId}`,
        "COA 2000 Tenant Deposit Liability belum tersedia.",
      );

    const lines: JournalLineInput[] = [
      {
        chartOfAccountId: depositLiability.id,
        description: `Pelepasan liabilitas deposit stay #${stay.id}`,
        debitRupiah: totalSettlement,
        creditRupiah: 0,
        sortOrder: 0,
      },
    ];

    let sortOrder = 1;
    if (refunded > 0) {
      const cash = await findDefaultCashAccountTx(tx);
      if (!cash)
        return this.skip(
          "DEPOSIT",
          `SETTLEMENT:${stayId}`,
          "Cash/bank account aktif belum tersedia untuk refund deposit.",
        );
      lines.push({
        chartOfAccountId: cash.chartOfAccountId,
        cashAccountId: cash.id,
        description: `Refund deposit stay #${stay.id}`,
        debitRupiah: 0,
        creditRupiah: refunded,
        sortOrder: sortOrder++,
      });
    }

    if (deduction > 0) {
      const recoveryRevenue = await findAccountByCodeTx(tx, "4400");
      if (!recoveryRevenue)
        return this.skip(
          "DEPOSIT",
          `SETTLEMENT:${stayId}`,
          "COA 4400 Penalty/Admin Fee Revenue belum tersedia untuk potongan deposit.",
        );
      lines.push({
        chartOfAccountId: recoveryRevenue.id,
        description: `Potongan/forfeit deposit stay #${stay.id}`,
        debitRupiah: 0,
        creditRupiah: deduction,
        sortOrder: sortOrder++,
      });
    }

    return this.postBalancedJournalTx(tx, {
      sourceType: "DEPOSIT",
      sourceId: `SETTLEMENT:${stay.id}`,
      entryDate: dateOnly(stay.depositRefundedAt ?? new Date()),
      memo: `Auto journal settlement deposit stay #${stay.id}`,
      createdById: createdById ?? null,
      lines,
    });
  }

  // F3-16: settlement deposit saat FORCED-CHECKOUT — deposit menutup piutang (AR)
  // tenant, kelebihan di-refund kas. BERBEDA dari postDepositSettlementTx yang
  // mengkredit 4400 (potongan/forfeit damages); di sini "deduction" = pembayaran
  // tunggakan tenant, jadi mengkredit AR 1100, bukan pendapatan.
  async postForcedCheckoutDepositSettlementTx(
    tx: any,
    stayId: number,
    appliedToArRupiah: number,
    refundedCashRupiah: number,
    createdById?: number | null,
  ) {
    const applied = rupiah(appliedToArRupiah);
    const refunded = rupiah(refundedCashRupiah);
    const total = applied + refunded;
    const sourceId = `FORCED_CHECKOUT_DEPOSIT:${stayId}`;
    if (total <= 0)
      return { ...this.skip("ADJUSTMENT", sourceId, "Tidak ada deposit untuk disetel."), benign: true };

    // F-24: hanya debit liability 2000 bila ada jurnal PENERIMAAN deposit (credit 2000).
    const receipt = await tx.journalEntry.findFirst({
      where: { sourceType: "DEPOSIT" as any, sourceId: String(stayId), status: "POSTED" as any },
      select: { id: true },
    });
    if (!receipt)
      return {
        ...this.skip(
          "ADJUSTMENT",
          sourceId,
          "Belum ada jurnal penerimaan deposit (2000 tak pernah dikredit); settlement deposit forced-checkout dilewati (F-24).",
        ),
        benign: true,
      };

    const depositLiability = await findAccountByCodeTx(tx, "2000");
    if (!depositLiability)
      return this.skip("ADJUSTMENT", sourceId, "COA 2000 Tenant Deposit Liability belum tersedia.");

    const lines: JournalLineInput[] = [
      {
        chartOfAccountId: depositLiability.id,
        description: `Pelepasan deposit (forced-checkout) stay #${stayId}`,
        debitRupiah: total,
        creditRupiah: 0,
        sortOrder: 0,
      },
    ];
    let sortOrder = 1;
    if (applied > 0) {
      const ar = await findAccountByCodeTx(tx, "1100");
      if (!ar)
        return this.skip("ADJUSTMENT", sourceId, "COA 1100 Accounts Receivable belum tersedia.");
      lines.push({
        chartOfAccountId: ar.id,
        description: `Deposit menutup tunggakan (AR) stay #${stayId}`,
        debitRupiah: 0,
        creditRupiah: applied,
        sortOrder: sortOrder++,
      });
    }
    if (refunded > 0) {
      const cash = await findDefaultCashAccountTx(tx);
      if (!cash)
        return this.skip("ADJUSTMENT", sourceId, "Cash/bank account aktif belum tersedia untuk refund deposit.");
      lines.push({
        chartOfAccountId: cash.chartOfAccountId,
        cashAccountId: cash.id,
        description: `Refund kelebihan deposit stay #${stayId}`,
        debitRupiah: 0,
        creditRupiah: refunded,
        sortOrder: sortOrder++,
      });
    }

    return this.postBalancedJournalTx(tx, {
      sourceType: "ADJUSTMENT",
      sourceId,
      entryDate: dateOnly(new Date()),
      memo: `Settlement deposit forced-checkout stay #${stayId} (AR ${applied}, refund ${refunded})`,
      createdById: createdById ?? null,
      lines,
    });
  }

  async postInvoiceCancellationReversalTx(
    tx: any,
    invoiceId: number,
    createdById?: number | null,
  ) {
    const original = await tx.journalEntry.findFirst({
      where: {
        sourceType: "INVOICE" as any,
        sourceId: String(invoiceId),
        status: "POSTED" as any,
      },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ postedAt: "desc" }, { id: "desc" }],
    });
    if (!original)
      return this.skip(
        "ADJUSTMENT",
        `INVOICE_REVERSAL:${invoiceId}`,
        "Original INVOICE journal belum ada; reversal tidak diperlukan.",
      );

    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice)
      return this.skip(
        "ADJUSTMENT",
        `INVOICE_REVERSAL:${invoiceId}`,
        "Invoice tidak ditemukan untuk reversal.",
      );
    if (invoice.status !== "CANCELLED")
      return this.skip(
        "ADJUSTMENT",
        `INVOICE_REVERSAL:${invoiceId}`,
        `Invoice status ${invoice.status}; reversal hanya untuk CANCELLED.`,
      );

    return this.postBalancedJournalTx(tx, {
      sourceType: "ADJUSTMENT",
      sourceId: `INVOICE_REVERSAL:${invoice.id}`,
      entryDate: dateOnly(new Date()),
      memo: `Reversal pembatalan invoice ${invoice.invoiceNumber ?? invoice.id}`,
      createdById: createdById ?? null,
      lines: (original.lines ?? []).map((line: any, index: number) => ({
        chartOfAccountId: line.chartOfAccountId,
        cashAccountId: line.cashAccountId ?? null,
        description: `Reversal: ${line.description ?? original.memo ?? `Invoice #${invoice.id}`}`,
        debitRupiah: Number(line.creditRupiah ?? 0),
        creditRupiah: Number(line.debitRupiah ?? 0),
        sortOrder: index,
      })),
    });
  }

  async postPaymentReversalTx(
    tx: any,
    invoicePaymentId: number,
    createdById?: number | null,
  ) {
    const original = await tx.journalEntry.findFirst({
      where: {
        sourceType: 'INVOICE_PAYMENT' as any,
        sourceId: String(invoicePaymentId),
        status: 'POSTED' as any,
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!original) return null;

    return this.postBalancedJournalTx(tx, {
      sourceType: 'ADJUSTMENT' as any,
      sourceId: `INVOICE_PAYMENT_REVERSAL:${invoicePaymentId}`,
      entryDate: dateOnly(new Date()),
      memo: `Reversal pembayaran invoice payment #${invoicePaymentId}`,
      createdById: createdById ?? null,
      lines: (original.lines ?? []).map((line: any, index: number) => ({
        chartOfAccountId: line.chartOfAccountId,
        cashAccountId: line.cashAccountId ?? null,
        description: `Reversal: ${line.description ?? original.memo ?? `Payment #${invoicePaymentId}`}`,
        debitRupiah: Number(line.creditRupiah ?? 0),
        creditRupiah: Number(line.debitRupiah ?? 0),
        sortOrder: index,
      })),
    });
  }

  /**
   * DP hangus (audit A18, kebijakan G2=A): debit 1100 AR, kredit 4400 Penalty/
   * Admin Fee Revenue — menetralkan saldo AR yang tersisa setelah reversal
   * invoice (kas DP tetap tercatat masuk, diakui sebagai pendapatan denda).
   * Hanya diposting bila pembayaran DP-nya sendiri sudah terjurnal
   * (INVOICE_PAYMENT POSTED); kalau belum, kas tidak pernah tercatat dan
   * jurnal forfeit justru menciptakan piutang fiktif → skip benign.
   */
  async postDownPaymentForfeitTx(
    tx: any,
    stayId: number,
    amountRupiah: number,
    createdById?: number | null,
  ) {
    const sourceId = `DP_FORFEIT:${stayId}`;
    const amount = rupiah(amountRupiah);
    if (amount <= 0) {
      return { ...this.skip("ADJUSTMENT", sourceId, "Nominal DP hangus 0."), benign: true };
    }

    const payments = await tx.invoicePayment.findMany({
      where: { invoice: { stayId } },
      select: { id: true },
    });
    const paymentIds = payments.map((payment: any) => String(payment.id));
    const postedPaymentJournal = paymentIds.length
      ? await tx.journalEntry.findFirst({
          where: {
            sourceType: "INVOICE_PAYMENT" as any,
            sourceId: { in: paymentIds },
            status: "POSTED" as any,
          },
          select: { id: true },
        })
      : null;
    if (!postedPaymentJournal) {
      return {
        ...this.skip(
          "ADJUSTMENT",
          sourceId,
          "Pembayaran DP belum pernah terjurnal; forfeit tidak diposting agar tidak membuat piutang fiktif.",
        ),
        benign: true,
      };
    }

    const ar = await findAccountByCodeTx(tx, "1100");
    if (!ar)
      return this.skip("ADJUSTMENT", sourceId, "COA 1100 Accounts Receivable belum tersedia.");
    const penalty = await findAccountByCodeTx(tx, "4400");
    if (!penalty)
      return this.skip("ADJUSTMENT", sourceId, "COA 4400 Penalty/Admin Fee Revenue belum tersedia.");

    return this.postBalancedJournalTx(tx, {
      sourceType: "ADJUSTMENT",
      sourceId,
      entryDate: dateOnly(new Date()),
      memo: `DP hangus stay #${stayId} (gagal pelunasan H+1)`,
      createdById: createdById ?? null,
      lines: [
        {
          chartOfAccountId: ar.id,
          description: `Netting piutang atas DP hangus stay #${stayId}`,
          debitRupiah: amount,
          creditRupiah: 0,
          sortOrder: 0,
        },
        {
          chartOfAccountId: penalty.id,
          description: `Pendapatan DP hangus stay #${stayId}`,
          debitRupiah: 0,
          creditRupiah: amount,
          sortOrder: 1,
        },
      ],
    });
  }

  async dryRunDepositBackfill(dto: { limit?: number } = {}) {
    const limit = Math.min(Math.max(Number(dto.limit ?? 25), 1), 50);
    const mappedDepositIds = await mappedDepositStaySourceIds(this.prisma);
    const stays = await (this.prisma as any).stay.findMany({
      where: { depositPaidAmountRupiah: { gt: 0 } },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        status: true,
        checkInDate: true,
        createdAt: true,
        depositAmountRupiah: true,
        depositPaidAmountRupiah: true,
        depositPaymentStatus: true,
        depositStatus: true,
        depositRefundedRupiah: true,
        depositDeductionRupiah: true,
        tenant: { select: { fullName: true } },
        room: { select: { code: true, name: true } },
      },
      orderBy: { id: "asc" },
      take: limit,
    });

    const items: Array<{
      stayId: number;
      tenantName?: string | null;
      roomCode?: string | null;
      depositAmountRupiah: number;
      depositPaidRupiah: number;
      depositHeldRupiah: number;
      hasDepositJournal: boolean;
      action: "WOULD_CREATE" | "SKIP" | "BLOCKED";
      reason: string;
      proposedJournal?: any;
    }> = [];
    const warnings: string[] = [];
    let createdWouldBe = 0;
    let skipped = 0;
    let blocked = 0;

    for (const stay of stays) {
      const paid = rupiah(stay.depositPaidAmountRupiah);
      const amount = rupiah(stay.depositAmountRupiah);
      const refunded = rupiah(stay.depositRefundedRupiah);
      const deducted = rupiah(stay.depositDeductionRupiah);
      const held = Math.max(paid - refunded - deducted, 0);
      const hasDepositJournal = mappedDepositIds.has(stay.id);
      if (hasDepositJournal) {
        skipped += 1;
        items.push({
          stayId: stay.id,
          tenantName: stay.tenant?.fullName ?? null,
          roomCode: stay.room?.code ?? null,
          depositAmountRupiah: amount,
          depositPaidRupiah: paid,
          depositHeldRupiah: held,
          hasDepositJournal,
          action: "SKIP",
          reason: "DEPOSIT journal untuk stay ini sudah ada.",
        });
        continue;
      }
      if (paid <= 0) {
        blocked += 1;
        items.push({
          stayId: stay.id,
          tenantName: stay.tenant?.fullName ?? null,
          roomCode: stay.room?.code ?? null,
          depositAmountRupiah: amount,
          depositPaidRupiah: paid,
          depositHeldRupiah: held,
          hasDepositJournal,
          action: "BLOCKED",
          reason: "Deposit paid masih 0.",
        });
        continue;
      }
      if (amount > 0 && paid < amount) {
        blocked += 1;
        warnings.push(`Stay #${stay.id}: deposit baru partial (${paid}/${amount}); B3.3R dry-run tidak membuat journal partial snapshot.`);
        items.push({
          stayId: stay.id,
          tenantName: stay.tenant?.fullName ?? null,
          roomCode: stay.room?.code ?? null,
          depositAmountRupiah: amount,
          depositPaidRupiah: paid,
          depositHeldRupiah: held,
          hasDepositJournal,
          action: "BLOCKED",
          reason: "Deposit belum lunas; hindari underpost partial snapshot.",
        });
        continue;
      }
      createdWouldBe += 1;
      items.push({
        stayId: stay.id,
        tenantName: stay.tenant?.fullName ?? null,
        roomCode: stay.room?.code ?? null,
        depositAmountRupiah: amount,
        depositPaidRupiah: paid,
        depositHeldRupiah: held,
        hasDepositJournal,
        action: "WOULD_CREATE",
        reason: "Aman sebagai kandidat DEPOSIT journal jika owner menjalankan execute di fase berikutnya.",
        proposedJournal: {
          sourceType: "DEPOSIT",
          sourceId: String(stay.id),
          debitCashRupiah: paid,
          creditTenantDepositLiabilityRupiah: paid,
        },
      });
    }

    if (!items.length) {
      warnings.push("Tidak ada stay dengan depositPaidAmountRupiah > 0 untuk di-backfill. Jika ledger liability tetap ada, kemungkinan berasal dari opening balance/manual journal.");
    }

    return {
      basis: "DEPOSIT_BACKFILL_DRY_RUN_B3_3R",
      dryRun: true,
      limit,
      createdWouldBe,
      skipped,
      blocked,
      items,
      warnings,
      note: "Dry-run saja. Endpoint ini tidak membuat JournalEntry agar liability deposit tidak tergandakan tanpa review owner.",
    };
  }

  async backfillAutoJournal(
    dto: { sourceTypes?: string[]; limit?: number } = {},
    createdById?: number | null,
  ) {
    const AUTO_SOURCE_TYPES_LIST = ["INVOICE", "INVOICE_PAYMENT", "EXPENSE", "WIFI_SALE"] as const;
    const sourceTypes = (
      dto.sourceTypes?.length ? dto.sourceTypes : [...AUTO_SOURCE_TYPES_LIST]
    ).filter((item): item is AutoSourceType =>
      (AUTO_SOURCE_TYPES_LIST as readonly string[]).includes(item),
    );
    const limit = Math.min(Math.max(Number(dto.limit ?? 25), 1), 50);
    const items: Array<{
      sourceType: AutoSourceType;
      sourceId: number;
      result: any;
    }> = [];
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
          const result = await this.postBySourceType(
            sourceType,
            id,
            createdById,
          );
          if (result?.posted) createdCount += 1;
          else skippedCount += 1;
          if (result?.reason)
            warnings.push(`${sourceType} #${id}: ${result.reason}`);
          items.push({ sourceType, sourceId: id, result });
        } catch (error) {
          failedCount += 1;
          const message =
            error instanceof Error ? error.message : String(error);
          warnings.push(`${sourceType} #${id}: ${message}`);
          items.push({
            sourceType,
            sourceId: id,
            result: {
              posted: false,
              skipped: false,
              failed: true,
              reason: message,
            },
          });
        }
      }
    }

    return {
      basis: "AUTO_JOURNAL_BACKFILL_LITE",
      limit,
      sourceTypes,
      createdCount,
      skippedCount,
      failedCount,
      items,
      warnings,
      note: "Backfill terbatas dan idempotent untuk source B3.1. Deposit/reversal B3.3 diproses dari event operasional agar tidak double-posting.",
    };
  }

  private async postBySourceType(
    sourceType: AutoSourceType,
    sourceId: number,
    createdById?: number | null,
  ) {
    if (sourceType === "INVOICE")
      return this.postInvoiceIssued(sourceId, createdById);
    if (sourceType === "INVOICE_PAYMENT")
      return this.postInvoicePayment(sourceId, createdById);
    if (sourceType === "EXPENSE")
      return this.postExpense(sourceId, createdById);
    return this.postWifiSale(sourceId, createdById);
  }

  private async findUnmappedSourceIds(
    sourceType: AutoSourceType,
    limit: number,
  ) {
    const mapped = await mappedSourceIds(this.prisma,sourceType);
    if (sourceType === "INVOICE") {
      const rows = await (this.prisma as any).invoice.findMany({
        where: {
          status: { in: ["ISSUED", "PARTIAL", "PAID"] as any },
          id: { notIn: mapped },
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: limit,
      });
      return rows.map((row: any) => row.id);
    }
    if (sourceType === "INVOICE_PAYMENT") {
      const rows = await (this.prisma as any).invoicePayment.findMany({
        where: { id: { notIn: mapped } },
        select: { id: true },
        orderBy: { id: "asc" },
        take: limit,
      });
      return rows.map((row: any) => row.id);
    }
    if (sourceType === "EXPENSE") {
      const rows = await (this.prisma as any).expense.findMany({
        where: { status: "CONFIRMED" as any, id: { notIn: mapped } },
        select: { id: true },
        orderBy: { id: "asc" },
        take: limit,
      });
      return rows.map((row: any) => row.id);
    }
    const rows = await (this.prisma as any).wifiSale.findMany({
      where: { id: { notIn: mapped } },
      select: { id: true },
      orderBy: { id: "asc" },
      take: limit,
    });
    return rows.map((row: any) => row.id);
  }

  private async postBalancedJournalTx(tx: any, input: PostJournalInput) {
    const existing = await tx.journalEntry.findFirst({
      where: { sourceType: input.sourceType as any, sourceId: input.sourceId, status: { not: 'VOID' as any } },
      select: { id: true, entryNumber: true, status: true },
    });
    if (existing) {
      return {
        posted: false,
        skipped: true,
        reason: `Journal sudah ada (${existing.entryNumber}).`,
        journalEntry: existing,
      };
    }

    const normalizedLines = input.lines
      .map((line, index) => ({
        ...line,
        debitRupiah: rupiah(line.debitRupiah),
        creditRupiah: rupiah(line.creditRupiah),
        sortOrder: line.sortOrder ?? index,
      }))
      .filter((line) => line.debitRupiah > 0 || line.creditRupiah > 0);

    if (normalizedLines.length < 2)
      return this.skip(
        input.sourceType,
        input.sourceId,
        "Journal line kurang dari 2.",
      );
    if (
      normalizedLines.some(
        (line) => line.debitRupiah > 0 && line.creditRupiah > 0,
      )
    )
      return this.skip(
        input.sourceType,
        input.sourceId,
        "Ada line debit dan kredit sekaligus.",
      );

    const totalDebit = normalizedLines.reduce(
      (sum, line) => sum + line.debitRupiah,
      0,
    );
    const totalCredit = normalizedLines.reduce(
      (sum, line) => sum + line.creditRupiah,
      0,
    );
    if (totalDebit <= 0 || totalCredit <= 0 || totalDebit !== totalCredit) {
      return this.skip(
        input.sourceType,
        input.sourceId,
        `Journal tidak balance: debit ${totalDebit}, kredit ${totalCredit}.`,
      );
    }

    const period = await findAccountingPeriodForPostingTx(tx, input.entryDate);
    if (!period)
      return this.skip(
        input.sourceType,
        input.sourceId,
        "Tidak ada accounting period untuk tanggal transaksi.",
      );
    if (period.status !== "OPEN") {
      return this.skip(
        input.sourceType,
        input.sourceId,
        `Periode ${period.year}-${String(period.month).padStart(2, "0")} sudah ${period.status}; journal baru harus memakai workflow reopen/reversal Owner-only atau adjustment periode berjalan.`,
      );
    }

    const journal = await tx.journalEntry.create({
      data: {
        entryNumber: sourceEntryNumber(input.sourceType, input.sourceId),
        entryDate: dateOnly(input.entryDate),
        accountingPeriodId: period.id,
        status: "POSTED" as any,
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
      include: {
        lines: {
          include: { chartOfAccount: true, cashAccount: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return { posted: true, skipped: false, journalEntry: journal };
  }

  private skip(sourceType: string, sourceId: string | number, reason: string) {
    this.logger.warn(`Skip auto journal ${sourceType} #${sourceId}: ${reason}`);
    return {
      posted: false,
      skipped: true,
      sourceType,
      sourceId: String(sourceId),
      reason,
    };
  }

  // F3-10: jalankan posting jurnal idempoten yang punya transaksinya sendiri.
  // Bila dua proses paralel memposting source yang sama, `entryNumber` @unique
  // memicu P2002 pada create kedua. Karena error meng-abort transaksi Postgres
  // (tak bisa di-catch lalu re-query di dalam tx yang sama), penanganan harus di
  // LUAR transaksi: perlakukan duplikat sebagai sudah-terposting, bukan error.
  private async runIdempotentPosting(
    sourceLabel: string,
    fn: (tx: any) => Promise<any>,
  ) {
    try {
      return await (this.prisma as any).$transaction(fn);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        this.logger.warn(
          `Auto journal duplikat (race P2002) untuk ${sourceLabel} diperlakukan sebagai sudah-terposting.`,
        );
        return this.skip(sourceLabel, sourceLabel, "Journal sudah ada (race duplicate, P2002).");
      }
      throw error;
    }
  }
}
