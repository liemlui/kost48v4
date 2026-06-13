// F1-3 (F-01/05/19/20) — klasifikasi arus kas (direct method) yang PURE & teruji.
// Diekstrak dari accounting-reports.service.ts agar bisa diuji zero-dependency
// (lihat backend/test/unit/cashflow-classifier.test.js).

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
  // F1-9 (F-10): deposit = dana titipan/liability, BUKAN operating. Section terpisah.
  depositLiabilityIn: number;
  depositLiabilityOut: number;
  operatingInTotal: number;
  operatingOutTotal: number;
  netRupiah: number; // = total mutasi kas periode (operating+investing+financing+deposit)
}

/**
 * F1-3a (F-01): sebuah journal line memutasi KAS jika ditandai cashAccountId,
 * ATAU akun COA-nya berkode prefix '10' (1000/1010/1020 = Kas/Bank).
 * BUKAN '11' (1100 = PIUTANG/AR) — itulah bug F-01 yang membuat AR dihitung sebagai kas.
 */
export function isCashLine(coaCode: string | null, cashAccountId: number | null): boolean {
  if (cashAccountId != null) return true;
  return !!coaCode && String(coaCode).startsWith('10');
}

const INVESTING_SOURCES = new Set(['FIXED_ASSET', 'DEPRECIATION']);
const FINANCING_SOURCES = new Set(['OPENING_BALANCE']);
// F1-9 (F-10): deposit jaminan = perubahan liabilitas titipan, dipisah dari operating.
const DEPOSIT_SOURCES = new Set(['DEPOSIT']);

/**
 * F1-3c: klasifikasikan setiap sumber SEKALI ke satu kategori (operating/investing/financing)
 * berbasis NET (debit−kredit) per sourceType. Menghapus double-count versi lama yang
 * memasukkan semua line ke operating total LALU menambah investing/financing lagi.
 * netRupiah = Σ(debit−kredit) seluruh cash line = mutasi kas periode (untuk invarian beginning+net=ending).
 */
export function classifyCashflow(lines: CashflowLineInput[]): CashflowClassification {
  const buckets = new Map<string, { net: number; count: number }>();
  for (const line of lines) {
    if (!isCashLine(line.coaCode, line.cashAccountId)) continue;
    const sourceType = String(line.sourceType ?? 'UNKNOWN');
    const debit = Number(line.debitRupiah ?? 0);
    const credit = Number(line.creditRupiah ?? 0);
    if (debit === 0 && credit === 0) continue;
    const cur = buckets.get(sourceType) ?? { net: 0, count: 0 };
    cur.net += debit - credit;
    cur.count += 1;
    buckets.set(sourceType, cur);
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

  for (const [sourceType, data] of buckets) {
    const abs = Math.abs(data.net);
    if (INVESTING_SOURCES.has(sourceType)) {
      if (data.net >= 0) investingCashIn += abs;
      else investingCashOut += abs;
    } else if (FINANCING_SOURCES.has(sourceType)) {
      if (data.net >= 0) financingCashIn += abs;
      else financingCashOut += abs;
    } else if (DEPOSIT_SOURCES.has(sourceType)) {
      // F1-9 (F-10): dana titipan — perubahan liabilitas, BUKAN operating.
      if (data.net >= 0) depositLiabilityIn += abs;
      else depositLiabilityOut += abs;
    } else {
      // Operating: INVOICE_PAYMENT, WIFI_SALE, EXPENSE, fallback.
      if (data.net >= 0) {
        operatingCashIn.push({ sourceType, amountRupiah: abs, count: data.count });
        operatingInTotal += abs;
      } else {
        operatingCashOut.push({ sourceType, amountRupiah: abs, count: data.count });
        operatingOutTotal += abs;
      }
    }
  }

  const netRupiah =
    operatingInTotal - operatingOutTotal +
    (investingCashIn - investingCashOut) +
    (financingCashIn - financingCashOut) +
    (depositLiabilityIn - depositLiabilityOut);

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
