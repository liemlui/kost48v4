import { ExpenseCategory, ExpenseType } from '../../common/enums/app.enums';

export type ExpenseOcrDraft = {
  expenseDate: string | null;
  vendorName: string | null;
  amountRupiah: number;
  category: ExpenseCategory;
  type: ExpenseType;
  description: string;
  note: string;
  confidence: number;
  needsReview: string[];
};

export type PaymentReviewGuardRule = 'FULL' | 'DP' | 'SETTLEMENT' | 'NONE';

export type PaymentReviewGuardInput = {
  invoiceTotal: number;
  submitted: number;
  downPaymentRemaining?: number;
  settlementAmount?: number;
};

export const EXPENSE_CATEGORY_VALUES = new Set<string>(Object.values(ExpenseCategory));
export const EXPENSE_TYPE_VALUES = new Set<string>(Object.values(ExpenseType));
export const TICKET_ACTION_VALUES = new Set(['ASSIGN_STAFF', 'CREATE_EXPENSE_DRAFT', 'REQUEST_PHOTO', 'CLOSE', 'KEEP_OPEN']);
export const PRIORITY_VALUES = new Set(['LOW', 'MEDIUM', 'HIGH']);
export const FIELD_DECISION_VALUES = new Set(['APPROVE', 'REJECT', 'NEEDS_MORE_INFO']);

export function cleanShortText(value: unknown, maxLength: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isDateOnly(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function extractLikelyVendor(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length >= 3 && !/^\d/.test(item) && !/total|tunai|cash|debit|kembali/i.test(item));
  return line ? cleanShortText(line, 80) : null;
}

export function extractLikelyDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  const local = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2}|\d{2})\b/);
  if (!local) return null;
  const year = local[3].length === 2 ? `20${local[3]}` : local[3];
  return `${year}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;
}

export function extractLikelyAmount(text: string): number {
  const matches = text.match(/(?:rp|idr)?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{4,})(?:,\d{2})?/gi) ?? [];
  const amounts = matches
    .map((match) => Number(match.replace(/(?:rp|idr)/gi, '').replace(/[,]\d{2}$/g, '').replace(/[^\d]/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
  return amounts.length ? Math.max(...amounts) : 0;
}

export function maskNik(nik?: string | null): string | null {
  const digits = (nik || '').replace(/\D/g, '');
  if (digits.length < 4) return null;
  return '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

export function maskNikInText(value: string): string {
  return String(value ?? '').replace(/\d{16}/g, (nik) => maskNik(nik) ?? '[NIK_MASKED]');
}

export function extractNikFromOcr(ocrText: string): string | null {
  const spaced = (ocrText || '').replace(/[^0-9]/g, ' ');
  const m = spaced.match(/\d{16}/);
  return m ? m[0] : null;
}

export function parseNikDemographics(nik?: string | null): { birthDate: string | null; gender: 'MALE' | 'FEMALE' | null } {
  const d = (nik || '').replace(/\D/g, '');
  if (d.length !== 16) return { birthDate: null, gender: null };
  let day = Number(d.slice(6, 8));
  const month = Number(d.slice(8, 10));
  const yy = Number(d.slice(10, 12));
  const gender: 'MALE' | 'FEMALE' = day > 40 ? 'FEMALE' : 'MALE';
  if (day > 40) day -= 40;
  if (day < 1 || day > 31 || month < 1 || month > 12) return { birthDate: null, gender };
  const nowYy = new Date().getFullYear() % 100;
  const year = yy <= nowYy ? 2000 + yy : 1900 + yy;
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { birthDate, gender };
}

export function normalizeName(name?: string | null): string {
  return (name || '').toUpperCase().replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── G5+: KTP OCR preprocessing & multi-strategy extraction ─────────────────────

/**
 * Bersihkan teks OCR KTP: normalisasi whitespace, gabung baris pendek pecah,
 * koreksi salah-baca OCR umum (O→0, I→1, l→1 di segmen numerik).
 * Return teks yang sudah dibersihkan + metadata.
 */
export function cleanOcrText(raw: string): { cleaned: string; confidenceBoost: number } {
  if (!raw) return { cleaned: '', confidenceBoost: 0 };
  let text = raw;

  // Normalisasi: ganti karakter aneh yang sering muncul dari OCR Indonesia
  text = text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-') // en/em dash
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\t/g, ' ');

  // Gabung baris-baris pendek yang kemungkinan pecahan baris yang sama
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Baris yang sangat pendek (< 8 char, tidak ada digit) → gabung dengan baris berikutnya
    if (line.length < 8 && merged.length > 0 && !/\d/.test(line)) {
      merged[merged.length - 1] += ' ' + line;
    } else {
      merged.push(line);
    }
  }

  text = merged.join('\n');

  // Koreksi salah-baca umum: huruf → angka di segmen numerik
  // Pola "1O" → "10", "O1" → "01" (O jadi 0 di sekitar digit), "l" → "1"
  let boost = 0;
  const corrected = text.replace(/(\d)([Oo])(\d)/g, (_m, a, _o, b) => {
    boost += 0.5;
    return `${a}0${b}`;
  }).replace(/(\d)([Il|])(\d)/g, (_m, a, _i, b) => {
    boost += 0.5;
    return `${a}1${b}`;
  }).replace(/^([Oo])(\d)/gm, (_m, _o, d) => {
    boost += 0.5;
    return `0${d}`;
  });

  return { cleaned: corrected, confidenceBoost: Math.min(boost, 2) };
}

/**
 * Ekstrak nama dari teks OCR KTP menggunakan multi-strategi.
 * Lebih agresif dari frontend — backend bisa coba beberapa pola.
 */
export function extractNameFromOcr(text: string): string | null {
  const flat = text.replace(/\r?\n/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Strategy 1: Label "Nama"
  const labelPatterns = [
    /nama\s*[:.\-]?\s*(.+)/i,
    /n\s*a\s*m\s*a\s*[:.\-]?\s*(.+)/i,
    /name\s*[:.\-]?\s*(.+)/i,
  ];
  for (const pat of labelPatterns) {
    const m = flat.match(pat);
    if (m) {
      const cleaned = normalizeName(m[1]);
      if (cleaned.length >= 3) return cleaned;
    }
  }

  // Strategy 2: Cari baris ALL-CAPS mayoritas huruf di antara NIK dan TTL
  const nikIdx = lines.findIndex((l) => /\d{16}/.test(l.replace(/[^0-9]/g, '')));
  const ttlIdx = lines.findIndex((l) => /tempat|tgl|lahir/i.test(l));
  const start = nikIdx >= 0 ? nikIdx + 1 : 0;
  const end = ttlIdx >= 0 ? ttlIdx : lines.length;
  for (let i = start; i < end; i++) {
    const line = lines[i];
    const letters = line.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 6 && letters.length > line.length * 0.6) {
      const cleaned = normalizeName(line);
      if (cleaned.length >= 3) return cleaned;
    }
  }

  return null;
}

/**
 * Ekstrak alamat dari teks OCR KTP.
 */
export function extractAddressFromOcr(text: string): string | null {
  const flat = text.replace(/\r?\n/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Strategy 1: Label "Alamat"
  const m = flat.match(/alamat\s*[:.\-]?\s*(.+)/i);
  if (m) {
    const cleaned = m[1].replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 5) return cleaned.slice(0, 200);
  }

  // Strategy 2: Baris setelah "Alamat"
  const addrIdx = lines.findIndex((l) => /^alamat/i.test(l));
  if (addrIdx >= 0 && addrIdx + 1 < lines.length) {
    const nextLine = lines[addrIdx + 1];
    if (nextLine.length >= 5) return nextLine.slice(0, 200);
  }

  return null;
}

/**
 * Ekstrak tempat lahir dari teks OCR KTP.
 */
export function extractBirthPlaceFromOcr(text: string): string | null {
  const flat = text.replace(/\r?\n/g, ' ');

  // Cari "KOTA, DD-MM-YYYY" — ambil bagian kota
  const m = flat.match(/(?:tempat\s*\/?\s*tgl\s*lahir|tempat\s*lahir|tgl\s*lahir|ttl)\s*[:.\-]?\s*([A-Z][A-Z\s]{2,40})[,;]/i);
  if (m) {
    return m[1].replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  // Fallback: kota + koma + tanggal
  const m2 = flat.match(/([A-Z][A-Z\s]{2,30}),\s*\d{2}[-/]\d{2}[-/]\d{4}/i);
  if (m2) {
    return m2[1].replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  return null;
}

/**
 * Ekstrak provinsi dari alamat OCR KTP.
 */
export function extractProvinceFromOcr(text: string): string | null {
  const knownProvinces = [
    'ACEH', 'SUMATERA UTARA', 'SUMATERA BARAT', 'RIAU', 'JAMBI', 'SUMATERA SELATAN',
    'BENGKULU', 'LAMPUNG', 'BANGKA BELITUNG', 'KEPULAUAN RIAU',
    'DKI JAKARTA', 'JAWA BARAT', 'JAWA TENGAH', 'JAWA TIMUR', 'BANTEN',
    'BALI', 'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR',
    'KALIMANTAN BARAT', 'KALIMANTAN TENGAH', 'KALIMANTAN SELATAN', 'KALIMANTAN TIMUR', 'KALIMANTAN UTARA',
    'SULAWESI UTARA', 'SULAWESI TENGAH', 'SULAWESI SELATAN', 'SULAWESI TENGGARA', 'GORONTALO', 'SULAWESI BARAT',
    'MALUKU', 'MALUKU UTARA', 'PAPUA', 'PAPUA BARAT',
  ];
  const upper = text.toUpperCase();
  for (const prov of knownProvinces) {
    if (upper.includes(prov)) return prov;
  }
  return null;
}

/**
 * Cek apakah hasil deterministik cukup solid untuk skip AI (hemat token).
 * Return true jika NIK 16 digit + cocok tenant + nama OCR cocok tenant,
 * artinya confidence tinggi tanpa perlu validasi AI.
 */
export function isDeterministicResultSolid(
  nikMatchesTenant: boolean,
  nameMatchesTenant: boolean | null,
): boolean {
  return nikMatchesTenant && nameMatchesTenant === true;
}

export function normalizeExpenseOcrDraft(input: any): ExpenseOcrDraft {
  const needsReview: string[] = Array.isArray(input?.needsReview)
    ? input.needsReview.map((item: unknown) => String(item)).filter(Boolean).slice(0, 8)
    : [];

  const categoryRaw = String(input?.category ?? input?.categorySuggestion ?? ExpenseCategory.OTHER).toUpperCase();
  const category = EXPENSE_CATEGORY_VALUES.has(categoryRaw)
    ? categoryRaw as ExpenseCategory
    : ExpenseCategory.OTHER;
  if (category === ExpenseCategory.OTHER && categoryRaw !== ExpenseCategory.OTHER) {
    needsReview.push('Kategori dari AI tidak valid/kurang yakin; diset ke OTHER.');
  }

  const typeRaw = String(input?.type ?? ExpenseType.VARIABLE).toUpperCase();
  const type = EXPENSE_TYPE_VALUES.has(typeRaw)
    ? typeRaw as ExpenseType
    : ExpenseType.VARIABLE;
  if (type === ExpenseType.VARIABLE && typeRaw !== ExpenseType.VARIABLE) {
    needsReview.push('Tipe dari AI tidak valid; diset ke VARIABLE.');
  }

  const amount = Number(input?.amountRupiah ?? input?.amount ?? 0);
  const amountRupiah = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (amountRupiah <= 0 && !needsReview.some((item) => item.includes('Nominal'))) {
    needsReview.push('Nominal belum terbaca jelas.');
  }
  if (amountRupiah > 500000 && !needsReview.some((item) => item.includes('Rp500.000'))) {
    needsReview.push('Nominal di atas Rp500.000; cek apakah perlu dicatat sebagai aset/kapitalisasi.');
  }

  const expenseDate = isDateOnly(input?.expenseDate ?? input?.date)
    ? String(input?.expenseDate ?? input?.date)
    : null;
  if (!expenseDate) needsReview.push('Tanggal nota perlu dicek manual.');

  const vendorName = cleanShortText(input?.vendorName ?? input?.vendor, 120) || null;
  const description = cleanShortText(input?.description, 180)
    || (vendorName ? `Pembelian dari ${vendorName}` : 'Pengeluaran operasional dari nota');
  const note = cleanShortText(input?.note ?? input?.taxOrFeeWarning, 500);
  const confidenceRaw = Number(input?.confidence ?? 0);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0;

  return {
    expenseDate,
    vendorName,
    amountRupiah,
    category,
    type,
    description,
    note,
    confidence,
    needsReview: Array.from(new Set(needsReview)).slice(0, 8),
  };
}

export function inventoryItemSnapshot(item: any) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    qtyOnHand: item.qtyOnHand == null ? null : Number(item.qtyOnHand),
    minQty: item.minQty == null ? null : Number(item.minQty),
    status: item.status,
  };
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanShortText(item, 240)).filter(Boolean);
}

export function ageDays(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function normalizeTicketActionDraft(input: any) {
  const recommendedActionRaw = String(input?.recommendedAction ?? 'KEEP_OPEN').toUpperCase();
  const priorityRaw = String(input?.priority ?? 'MEDIUM').toUpperCase();
  return {
    summary: cleanShortText(input?.summary, 280) || 'Tiket perlu ditinjau manual.',
    recommendedAction: TICKET_ACTION_VALUES.has(recommendedActionRaw) ? recommendedActionRaw : 'KEEP_OPEN',
    priority: PRIORITY_VALUES.has(priorityRaw) ? priorityRaw : 'MEDIUM',
    suggestedNote: cleanShortText(input?.suggestedNote, 700) || 'Cek data tiket lalu pilih aksi manual.',
    riskFlags: toStringArray(input?.riskFlags).slice(0, 8),
  };
}

export function normalizeInventoryDraft(input: any, fallbackLowStock: any[] = []) {
  const lowStockItems = Array.isArray(input?.lowStockItems) ? input.lowStockItems : fallbackLowStock;
  const purchaseSuggestions = Array.isArray(input?.purchaseSuggestions) ? input.purchaseSuggestions : [];
  return {
    lowStockItems: lowStockItems.slice(0, 20).map((item: any) => ({
      inventoryItemId: Number(item?.inventoryItemId ?? item?.id ?? 0) || 0,
      name: cleanShortText(item?.name, 120) || 'Item stok',
      currentQty: Number.isFinite(Number(item?.currentQty ?? item?.qtyOnHand)) ? Number(item?.currentQty ?? item?.qtyOnHand) : 0,
      suggestedMinQty: Number.isFinite(Number(item?.suggestedMinQty ?? item?.minQty)) ? Number(item?.suggestedMinQty ?? item?.minQty) : 0,
      reason: cleanShortText(item?.reason, 240) || 'Perlu dicek ulang oleh admin.',
    })),
    purchaseSuggestions: purchaseSuggestions.slice(0, 12).map((item: any) => {
      const priorityRaw = String(item?.priority ?? 'MEDIUM').toUpperCase();
      return {
        name: cleanShortText(item?.name, 120) || 'Item pembelian',
        qty: Number.isFinite(Number(item?.qty)) ? Math.max(0, Number(item.qty)) : 0,
        estimatedBudgetRupiah: Number.isFinite(Number(item?.estimatedBudgetRupiah)) ? Math.max(0, Math.round(Number(item.estimatedBudgetRupiah))) : 0,
        priority: PRIORITY_VALUES.has(priorityRaw) ? priorityRaw : 'MEDIUM',
      };
    }),
    warnings: toStringArray(input?.warnings).slice(0, 8),
  };
}

export function normalizeFieldReportDraft(input: any) {
  const decisionRaw = String(input?.recommendedDecision ?? 'NEEDS_MORE_INFO').toUpperCase();
  const priorityRaw = String(input?.priority ?? 'MEDIUM').toUpperCase();
  const suggestedMovement = input?.suggestedMovement || {};
  const movementRaw = suggestedMovement?.movementType == null ? null : String(suggestedMovement.movementType).toUpperCase();
  return {
    summary: cleanShortText(input?.summary, 280) || 'Laporan lapangan perlu direview admin.',
    recommendedDecision: FIELD_DECISION_VALUES.has(decisionRaw) ? decisionRaw : 'NEEDS_MORE_INFO',
    priority: PRIORITY_VALUES.has(priorityRaw) ? priorityRaw : 'MEDIUM',
    suggestedAdminNote: cleanShortText(input?.suggestedAdminNote, 700) || 'Cek laporan dan pilih keputusan manual.',
    suggestedMovement: {
      needed: Boolean(suggestedMovement?.needed),
      movementType: ['ASSIGN_TO_ROOM', 'OUT'].includes(String(movementRaw)) ? movementRaw : null,
      reason: cleanShortText(suggestedMovement?.reason, 240),
    },
    riskFlags: toStringArray(input?.riskFlags).slice(0, 8),
  };
}

export function decidePaymentReviewGuard(input: PaymentReviewGuardInput): { violated: boolean; matchedRule: PaymentReviewGuardRule } {
  const submitted = Number(input.submitted);
  if (!Number.isFinite(submitted) || submitted < 0) {
    return { violated: true, matchedRule: 'NONE' };
  }

  const candidates: Array<{ rule: PaymentReviewGuardRule; amount: number }> = [
    { rule: 'FULL' as const, amount: Number(input.invoiceTotal) },
    { rule: 'DP' as const, amount: Number(input.downPaymentRemaining) },
    { rule: 'SETTLEMENT' as const, amount: Number(input.settlementAmount) },
  ].filter((candidate) => Number.isFinite(candidate.amount) && candidate.amount > 0);

  if (!candidates.length) {
    return { violated: false, matchedRule: 'NONE' };
  }

  const match = candidates.find((candidate) => submitted === candidate.amount);
  return match
    ? { violated: false, matchedRule: match.rule }
    : { violated: true, matchedRule: 'NONE' };
}
