// F1-3 (F-01/05/19/20): pure direct-method cashflow classification.

export interface CashflowLineInput {
  sourceType: string | null;
  coaCode: string | null;
  cashAccountId: number | null;
  debitRupiah: number;
  creditRupiah: number;
}

export interface CashflowBucket {
  sourceType: string;
  amountRupiah: number;
  count: number;
}

export interface CashflowClassification {
  operatingCashIn: CashflowBucket[];
  operatingCashOut: CashflowBucket[];
  investingCashIn: number;
  investingCashOut: number;
  financingCashIn: number;
  financingCashOut: number;
  depositLiabilityIn: number;
  depositLiabilityOut: number;
  operatingInTotal: number;
  operatingOutTotal: number;
  netRupiah: number;
}

export function isCashLine(coaCode: string | null, cashAccountId: number | null): boolean {
  if (cashAccountId != null) return true;
  return !!coaCode && String(coaCode).startsWith('10');
}

const INVESTING_SOURCES = new Set(['FIXED_ASSET', 'DEPRECIATION']);
const FINANCING_SOURCES = new Set(['OPENING_BALANCE']);
const DEPOSIT_SOURCES = new Set(['DEPOSIT']);

type DirectionData = { amount: number; count: number };

/**
 * Each cash line is classified exactly once. Inflow and outflow remain gross,
 * so opposite movements with the same sourceType cannot hide each other.
 */
export function classifyCashflow(lines: CashflowLineInput[]): CashflowClassification {
  const incoming = new Map<string, DirectionData>();
  const outgoing = new Map<string, DirectionData>();

  for (const line of lines) {
    if (!isCashLine(line.coaCode, line.cashAccountId)) continue;
    const sourceType = String(line.sourceType ?? 'UNKNOWN');
    const net = Number(line.debitRupiah ?? 0) - Number(line.creditRupiah ?? 0);
    if (net === 0) continue;

    const target = net > 0 ? incoming : outgoing;
    const current = target.get(sourceType) ?? { amount: 0, count: 0 };
    current.amount += Math.abs(net);
    current.count += 1;
    target.set(sourceType, current);
  }

  const operatingCashIn: CashflowBucket[] = [];
  const operatingCashOut: CashflowBucket[] = [];
  let investingCashIn = 0;
  let investingCashOut = 0;
  let financingCashIn = 0;
  let financingCashOut = 0;
  let depositLiabilityIn = 0;
  let depositLiabilityOut = 0;
  let operatingInTotal = 0;
  let operatingOutTotal = 0;

  const addDirection = (
    sourceType: string,
    data: DirectionData,
    direction: 'IN' | 'OUT',
  ) => {
    if (INVESTING_SOURCES.has(sourceType)) {
      if (direction === 'IN') investingCashIn += data.amount;
      else investingCashOut += data.amount;
      return;
    }
    if (FINANCING_SOURCES.has(sourceType)) {
      if (direction === 'IN') financingCashIn += data.amount;
      else financingCashOut += data.amount;
      return;
    }
    if (DEPOSIT_SOURCES.has(sourceType)) {
      if (direction === 'IN') depositLiabilityIn += data.amount;
      else depositLiabilityOut += data.amount;
      return;
    }

    const bucket = { sourceType, amountRupiah: data.amount, count: data.count };
    if (direction === 'IN') {
      operatingCashIn.push(bucket);
      operatingInTotal += data.amount;
    } else {
      operatingCashOut.push(bucket);
      operatingOutTotal += data.amount;
    }
  };

  for (const [sourceType, data] of incoming) addDirection(sourceType, data, 'IN');
  for (const [sourceType, data] of outgoing) addDirection(sourceType, data, 'OUT');

  const netRupiah =
    operatingInTotal - operatingOutTotal
    + investingCashIn - investingCashOut
    + financingCashIn - financingCashOut
    + depositLiabilityIn - depositLiabilityOut;

  return {
    operatingCashIn,
    operatingCashOut,
    investingCashIn,
    investingCashOut,
    financingCashIn,
    financingCashOut,
    depositLiabilityIn,
    depositLiabilityOut,
    operatingInTotal,
    operatingOutTotal,
    netRupiah,
  };
}
