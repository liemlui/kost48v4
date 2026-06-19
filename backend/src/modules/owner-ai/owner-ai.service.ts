import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory, ExpenseType } from '../../common/enums/app.enums';
import { deepseekConfigured, deepseekChat } from '../market-analysis/deepseek.client';
import { stableHash } from './ai-snapshot-hash.util';
import { buildBriefPrompt } from './prompts/brief.prompt';
import { buildFinancePrompt } from './prompts/finance.prompt';
import { buildExpenseOcrPrompt } from './prompts/expense-ocr.prompt';
import { buildKtpOcrPrompt } from './prompts/ktp-ocr.prompt';

type ExpenseOcrDraft = {
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

const EXPENSE_CATEGORY_VALUES = new Set<string>(Object.values(ExpenseCategory));
const EXPENSE_TYPE_VALUES = new Set<string>(Object.values(ExpenseType));

@Injectable()
export class OwnerAiService {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Status AI: configured, enabled, model, limit. Tanpa bocorkan API key. */
  getStatus() {
    const configured = deepseekConfigured();
    const enabled = process.env.AI_FEATURES_ENABLED === 'true';
    return {
      configured,
      enabled,
      defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      financeModel: process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro',
      manualOnly: process.env.AI_MANUAL_ONLY !== 'false', // default true
      ownerAdminOnly: process.env.AI_OWNER_ADMIN_ONLY !== 'false', // default true
      dailyLimit: Number(process.env.AI_DAILY_REQUEST_LIMIT || 50),
      dailyRemaining: this.getDailyRemaining(),
      logUsage: process.env.AI_LOG_USAGE !== 'false', // default true
    };
  }

  /** Rate-limit check: throws 429 jika melebihi daily limit. */
  checkRateLimit(actorId: number, feature: string): void {
    if (process.env.AI_FEATURES_ENABLED !== 'true') return; // no limit if disabled
    const key = `${actorId}:${feature}`;
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const b = this.buckets.get(key);
    if (!b || b.resetAt < dayStart) {
      this.buckets.set(key, { count: 1, resetAt: dayStart + 86_400_000 });
      return;
    }
    b.count += 1;
    const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 50);
    if (b.count > dailyLimit) {
      throw Object.assign(
        new Error('Batas harian AI tercapai. Coba lagi besok.'),
        { status: 429 },
      );
    }
  }

  /** Hitung sisa daily limit (global — tanpa actor). */
  private getDailyRemaining(): number {
    const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 50);
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    let used = 0;
    for (const [, b] of this.buckets) {
      if (b.resetAt >= dayStart) used += b.count;
    }
    return Math.max(0, dailyLimit - used);
  }

  /** Max input chars dari env. */
  getMaxInputChars(): number {
    return Number(process.env.AI_MAX_INPUT_CHARS || 12000);
  }

  /** Max output tokens (default) dari env. */
  getMaxOutputTokens(): number {
    return Number(process.env.AI_MAX_OUTPUT_TOKENS || 1400);
  }

  /** Max output tokens (finance) dari env. */
  getFinanceMaxOutputTokens(): number {
    return Number(process.env.AI_FINANCE_MAX_OUTPUT_TOKENS || 2200);
  }

  // ── G1: Owner Brief ──────────────────────────────────────────────────────

  /** Snapshot ringkas bisnis untuk brief AI. */
  async buildBriefSnapshot() {
    const [rooms, invoiceOverdue, pendingPayments, openTickets, meterMissing, readinessRows] = await Promise.all([
      this.prisma.room.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.invoice.aggregate({
        where: { status: 'ISSUED', dueDate: { lt: new Date() } },
        _count: { id: true },
        _sum: { totalAmountRupiah: true },
      }),
      this.prisma.paymentSubmission.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.$queryRaw<Array<{ roomId: number }>>`
        SELECT DISTINCT rm.id AS "roomId" FROM "Room" rm
        WHERE rm.status = 'OCCUPIED'
          AND NOT EXISTS (
            SELECT 1 FROM "MeterReading" mr
            WHERE mr."roomId" = rm.id
              AND mr."readingAt" >= ${new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
          )
      `,
      this.prisma.$queryRaw<Array<{ label: string }>>`SELECT label FROM "OperationalSetting" WHERE "key" = 'readiness_warnings'`,
    ]);

    const roomMap: Record<string, number> = { AVAILABLE: 0, OCCUPIED: 0, MAINTENANCE: 0, INACTIVE: 0 };
    rooms.forEach((r) => { roomMap[r.status] = r._count.id; });
    const total = Object.values(roomMap).reduce((a, b) => a + b, 0);
    const overdueCount = invoiceOverdue._count.id;
    const overdueSum = Number(invoiceOverdue._sum.totalAmountRupiah || 0);

    return {
      period: new Date().toISOString().slice(0, 7),
      rooms: { total, occupied: roomMap['OCCUPIED'] || 0, available: roomMap['AVAILABLE'] || 0, maintenance: roomMap['MAINTENANCE'] || 0 },
      finance: {
        overdueCount,
        overdueRupiah: overdueSum,
        pendingPaymentCount: pendingPayments,
      },
      ops: {
        openTicketCount: openTickets,
        meterMissingCount: meterMissing.length,
      },
      warnings: readinessRows.map((r) => r.label),
    };
  }

  /** Generate brief AI. Fallback rule-based bila AI gagal/disabled. */
  async generateBrief(actorId: number) {
    this.checkRateLimit(actorId, 'brief');
    const snapshot = await this.buildBriefSnapshot();
    const snapshotHash = stableHash(snapshot);

    if (!deepseekConfigured() || process.env.AI_FEATURES_ENABLED !== 'true') {
      return this.briefFallback(snapshot, snapshotHash);
    }

    const messages = buildBriefPrompt(snapshot as unknown as Record<string, unknown>);
    try {
      const result = await deepseekChat(messages, { json: true, temperature: 0.3 });
      const parsed = JSON.parse(result.content);
      return {
        mode: 'DEEPSEEK',
        model: result.model,
        usage: result.usage,
        snapshotHash,
        promptHash: stableHash(messages.map((m) => m.content).join('|')),
        fallback: false,
        result: parsed,
        warnings: [],
        missingData: parsed.missingData || [],
      };
    } catch (err: any) {
      return this.briefFallback(snapshot, snapshotHash, err.message);
    }
  }

  /** Fallback rule-based: tanpa AI, tetap output ringkasan dari snapshot. */
  private briefFallback(snapshot: any, snapshotHash: string, errorMsg?: string) {
    const warnings: string[] = [];
    if (errorMsg) warnings.push('AI gagal: ' + errorMsg);
    warnings.push('Hasil ini tanpa AI (rule fallback).');

    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      warnings,
      result: {
        summary: `${snapshot.rooms.occupied}/${snapshot.rooms.total} kamar terisi. ${snapshot.finance.overdueCount} tagihan lewat jatuh tempo. ${snapshot.ops.openTicketCount} tiket terbuka. ${snapshot.finance.pendingPaymentCount} pembayaran menunggu review.`,
        priorityActions: [
          ...(snapshot.finance.overdueCount > 0 ? [{ title: 'Tagihan lewat jatuh tempo', reason: `${snapshot.finance.overdueCount} tagihan belum dibayar`, route: '/invoices', severity: 'HIGH' as const }] : []),
          ...(snapshot.finance.pendingPaymentCount > 0 ? [{ title: 'Review pembayaran pending', reason: `${snapshot.finance.pendingPaymentCount} pembayaran perlu dicek`, route: '/payments', severity: 'MEDIUM' as const }] : []),
          ...(snapshot.ops.openTicketCount > 0 ? [{ title: 'Tiket terbuka', reason: `${snapshot.ops.openTicketCount} tiket belum selesai`, route: '/tickets', severity: 'MEDIUM' as const }] : []),
          ...(snapshot.ops.meterMissingCount > 0 ? [{ title: 'Meter belum dicatat', reason: `${snapshot.ops.meterMissingCount} kamar belum ada catatan meter bulan ini`, route: '/meter-readings', severity: 'LOW' as const }] : []),
        ],
        risks: [],
        numbersToWatch: [
          { label: 'Okupansi', value: `${snapshot.rooms.occupied}/${snapshot.rooms.total}`, why: 'Indikator utama kesehatan bisnis' },
          { label: 'Piutang', value: `${(snapshot.finance.overdueRupiah || 0).toLocaleString('id-ID')}`, why: 'Total tagihan yang belum dibayar' },
        ],
        missingData: [],
      },
      missingData: [],
    };
  }

  // G4: Expense receipt OCR draft. This never creates Expense or journal rows.
  async draftExpenseFromOcr(ocrText: string, actorId: number) {
    this.checkRateLimit(actorId, 'expense-ocr-draft');
    const text = String(ocrText ?? '').trim();
    const maxChars = this.getMaxInputChars();

    if (text.length < 10) {
      throw new BadRequestException('Teks OCR nota terlalu pendek untuk dirapikan.');
    }
    if (text.length > maxChars) {
      throw new BadRequestException(`Teks OCR terlalu panjang. Maksimal ${maxChars} karakter.`);
    }
    if (/data:image|base64,|;base64/i.test(text)) {
      throw new BadRequestException('Kirim teks OCR saja, bukan gambar/base64.');
    }

    const snapshot = {
      locale: 'id-ID',
      today: new Date().toISOString().slice(0, 10),
      acceptedCategories: Object.values(ExpenseCategory),
      acceptedTypes: Object.values(ExpenseType),
      ocrText: text,
    };
    const snapshotHash = stableHash(snapshot);

    if (!deepseekConfigured() || process.env.AI_FEATURES_ENABLED !== 'true') {
      return this.expenseOcrFallback(text, snapshotHash);
    }

    const messages = buildExpenseOcrPrompt(snapshot);
    const promptHash = stableHash(messages.map((m) => m.content).join('|'));
    try {
      const result = await deepseekChat(messages, {
        json: true,
        temperature: 0.1,
        maxTokens: this.getMaxOutputTokens(),
      });
      const parsed = JSON.parse(result.content);
      return {
        mode: 'DEEPSEEK',
        model: result.model,
        usage: result.usage,
        snapshotHash,
        promptHash,
        fallback: false,
        warnings: [],
        result: this.normalizeExpenseOcrDraft(parsed),
      };
    } catch (err: any) {
      return this.expenseOcrFallback(text, snapshotHash, err?.message);
    }
  }

  private expenseOcrFallback(text: string, snapshotHash: string, errorMsg?: string) {
    const warnings = ['AI tidak tersedia; draft dibuat konservatif dari OCR lokal dan wajib dicek manual.'];
    if (errorMsg) warnings.unshift('AI gagal: ' + String(errorMsg).slice(0, 180));

    const amountRupiah = this.extractLikelyAmount(text);
    const expenseDate = this.extractLikelyDate(text);
    const vendorName = this.extractLikelyVendor(text);
    const needsReview = [
      'Periksa ulang tanggal, vendor, kategori, dan nominal sebelum simpan.',
      ...(amountRupiah <= 0 ? ['Nominal tidak terbaca jelas dari nota.'] : []),
      ...(amountRupiah > 500000 ? ['Nominal di atas Rp500.000; cek apakah perlu dicatat sebagai aset/kapitalisasi.'] : []),
    ];

    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      warnings,
      result: this.normalizeExpenseOcrDraft({
        expenseDate,
        vendorName,
        amountRupiah,
        category: ExpenseCategory.OTHER,
        type: ExpenseType.VARIABLE,
        description: vendorName ? `Pembelian dari ${vendorName}` : 'Pengeluaran dari nota OCR',
        note: '',
        confidence: amountRupiah > 0 ? 0.35 : 0.15,
        needsReview,
      }),
    };
  }

  private normalizeExpenseOcrDraft(input: any): ExpenseOcrDraft {
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

    const expenseDate = this.isDateOnly(input?.expenseDate ?? input?.date)
      ? String(input?.expenseDate ?? input?.date)
      : null;
    if (!expenseDate) needsReview.push('Tanggal nota perlu dicek manual.');

    const vendorName = this.cleanShortText(input?.vendorName ?? input?.vendor, 120) || null;
    const description = this.cleanShortText(input?.description, 180)
      || (vendorName ? `Pembelian dari ${vendorName}` : 'Pengeluaran operasional dari nota');
    const note = this.cleanShortText(input?.note ?? input?.taxOrFeeWarning, 500);
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

  private cleanShortText(value: unknown, maxLength: number): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  private isDateOnly(value: unknown): boolean {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private extractLikelyVendor(text: string): string | null {
    const line = text
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.length >= 3 && !/^\d/.test(item) && !/total|tunai|cash|debit|kembali/i.test(item));
    return line ? this.cleanShortText(line, 80) : null;
  }

  private extractLikelyDate(text: string): string | null {
    const iso = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    }

    const local = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2}|\d{2})\b/);
    if (!local) return null;
    const year = local[3].length === 2 ? `20${local[3]}` : local[3];
    return `${year}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`;
  }

  private extractLikelyAmount(text: string): number {
    const matches = text.match(/(?:rp|idr)?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{4,})(?:,\d{2})?/gi) ?? [];
    const amounts = matches
      .map((match) => Number(match.replace(/(?:rp|idr)/gi, '').replace(/[,]\d{2}$/g, '').replace(/[^\d]/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
    return amounts.length ? Math.max(...amounts) : 0;
  }

  // ── G5: KTP OCR Validator ──────────────────────────────────────────────────

  /** Mask NIK → `************1234` (PDP: jangan tampilkan NIK penuh di log/prompt). */
  private maskNik(nik?: string | null): string | null {
    const digits = (nik || '').replace(/\D/g, '');
    if (digits.length < 4) return null;
    return '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
  }

  /** Ambil 16-digit NIK pertama dari teks OCR (heuristik deterministik). */
  private extractNikFromOcr(ocrText: string): string | null {
    const spaced = (ocrText || '').replace(/[^0-9]/g, ' ');
    const m = spaced.match(/\d{16}/);
    return m ? m[0] : null;
  }

  /**
   * Demografi deterministik dari struktur NIK (PPKKDD DDMMYY SSSS).
   * Digit 7-12 = tanggal lahir DDMMYY (DD+40 untuk perempuan). Tanpa AI.
   */
  private parseNikDemographics(nik?: string | null): { birthDate: string | null; gender: 'MALE' | 'FEMALE' | null } {
    const d = (nik || '').replace(/\D/g, '');
    if (d.length !== 16) return { birthDate: null, gender: null };
    let day = Number(d.slice(6, 8));
    const month = Number(d.slice(8, 10));
    const yy = Number(d.slice(10, 12));
    const gender: 'MALE' | 'FEMALE' = day > 40 ? 'FEMALE' : 'MALE';
    if (day > 40) day -= 40;
    if (day < 1 || day > 31 || month < 1 || month > 12) return { birthDate: null, gender };
    // Heuristik abad: <= tahun-sekarang (2 digit) → 20xx, selain itu 19xx.
    const nowYy = new Date().getFullYear() % 100;
    const year = yy <= nowYy ? 2000 + yy : 1900 + yy;
    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { birthDate, gender };
  }

  /** Normalisasi nama untuk perbandingan (uppercase, buang non-huruf). */
  private normalizeName(name?: string | null): string {
    return (name || '').toUpperCase().replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Validasi teks OCR KTP vs data tenant. PDP: hanya TEKS OCR (bukan gambar);
   * NIK tenant dikirim ter-mask ke AI; NIK di hasil/return juga ter-mask.
   * Verifikasi final TETAP tombol Owner/Admin existing — method ini tidak verify.
   */
  async validateKtpOcr(tenantId: number, ocrText: string, actorId: number) {
    this.checkRateLimit(actorId, 'ktp-ocr');

    const text = (ocrText || '').trim();
    if (!text) throw new BadRequestException('Teks OCR KTP kosong.');
    if (text.length > this.getMaxInputChars()) {
      throw new BadRequestException('Teks OCR terlalu panjang.');
    }
    // PDP guard: tolak bila yang dikirim ternyata gambar/base64, bukan teks OCR.
    if (/data:image\//i.test(text) || /;base64,/i.test(text) || /^[A-Za-z0-9+/=\s]{800,}$/.test(text)) {
      throw new BadRequestException('Kirim TEKS hasil OCR, bukan gambar/base64 KTP.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, fullName: true, identityNumber: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan.');

    // ── Cek deterministik (backend yang menang, bukan AI) ──
    const ocrNik = this.extractNikFromOcr(text);
    const nikFormatValid = !!ocrNik && ocrNik.length === 16;
    const tenantNikDigits = (tenant.identityNumber || '').replace(/\D/g, '');
    const nikMatchesTenant = nikFormatValid && tenantNikDigits.length === 16 && ocrNik === tenantNikDigits;
    const demographics = this.parseNikDemographics(ocrNik);
    const tenantMaskedNik = this.maskNik(tenant.identityNumber);

    // Hash dari objek yang sudah diminimalkan — TANPA NIK penuh / OCR mentah (PDP).
    const snapshotHash = stableHash({
      tenantId: tenant.id,
      tenantName: this.normalizeName(tenant.fullName),
      tenantNikMasked: tenantMaskedNik,
      ocrLen: text.length,
      ocrNikMasked: this.maskNik(ocrNik),
    });

    const deterministic = {
      nikFormatValid,
      nikMatchesTenant,
      ocrNikMasked: this.maskNik(ocrNik),
      demographicsFromNik: demographics,
    };

    if (!deepseekConfigured() || process.env.AI_FEATURES_ENABLED !== 'true') {
      return this.ktpFallback(tenant, deterministic, snapshotHash);
    }

    const messages = buildKtpOcrPrompt({
      ocrText: text,
      tenant: { fullName: tenant.fullName, nikMasked: tenantMaskedNik },
    });

    try {
      const ai = await deepseekChat(messages, {
        json: true,
        temperature: 0.1,
        maxTokens: this.getMaxOutputTokens(),
      });
      const parsed = JSON.parse(ai.content);
      // Mask NIK apa pun yang dikembalikan AI sebelum keluar dari backend (PDP).
      if (parsed?.extracted) parsed.extracted.nik = this.maskNik(parsed.extracted.nik);
      // Backend menang untuk cek deterministik.
      const match = {
        nameMatchesTenant: parsed?.match?.nameMatchesTenant ?? null,
        nikMatchesTenant,
        warnings: Array.isArray(parsed?.match?.warnings) ? parsed.match.warnings : [],
      };
      return {
        mode: 'DEEPSEEK',
        model: ai.model,
        usage: ai.usage,
        snapshotHash,
        promptHash: stableHash(messages.map((m) => m.content).join('|')),
        fallback: false,
        confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : undefined,
        warnings: [],
        result: {
          extracted: parsed?.extracted ?? {},
          nikFormatValid,
          demographicsFromNik: demographics,
          match,
          recommendation: parsed?.recommendation ?? 'REVIEW_MANUALLY',
        },
        missingData: [],
      };
    } catch (err: any) {
      return this.ktpFallback(tenant, deterministic, snapshotHash, err.message);
    }
  }

  /** Fallback rule-based KTP: tanpa AI, pakai cek deterministik NIK saja. */
  private ktpFallback(
    tenant: { fullName: string },
    det: { nikFormatValid: boolean; nikMatchesTenant: boolean; ocrNikMasked: string | null; demographicsFromNik: { birthDate: string | null; gender: 'MALE' | 'FEMALE' | null } },
    snapshotHash: string,
    errorMsg?: string,
  ) {
    const warnings: string[] = [];
    if (errorMsg) warnings.push('AI gagal: ' + errorMsg);
    warnings.push('Hasil tanpa AI (rule fallback) — hanya cek format NIK; nama wajib dicek manual.');
    if (!det.nikFormatValid) warnings.push('NIK pada OCR tidak terbaca 16 digit.');
    if (det.nikFormatValid && !det.nikMatchesTenant) warnings.push('NIK OCR tidak cocok dengan data tenant.');

    const recommendation = !det.nikFormatValid || !det.nikMatchesTenant ? 'REVIEW_MANUALLY' : 'REVIEW_MANUALLY';
    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      confidence: undefined,
      warnings,
      result: {
        extracted: { nik: det.ocrNikMasked, name: null, birthPlace: null, birthDate: det.demographicsFromNik.birthDate, gender: det.demographicsFromNik.gender, address: null },
        nikFormatValid: det.nikFormatValid,
        demographicsFromNik: det.demographicsFromNik,
        match: { nameMatchesTenant: null, nikMatchesTenant: det.nikMatchesTenant, warnings: [] },
        recommendation,
      },
      missingData: [],
    };
  }

  // ── G2: Finance AI Analyst ─────────────────────────────────────────────────

  async buildFinanceSnapshot() {
    const now = new Date();
    const [jeResult] = await this.prisma.$queryRaw<Array<{ totalDebit: number; totalCredit: number }>>`
      SELECT
        COALESCE(SUM(jl."debitRupiah"), 0) AS "totalDebit",
        COALESCE(SUM(jl."creditRupiah"), 0) AS "totalCredit"
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      WHERE je.status = 'POSTED'::text
    `;
    const [totalRooms, occupied] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { status: 'OCCUPIED' } }),
    ]);
    const totDebit = Number(jeResult?.totalDebit || 0);
    const totCredit = Number(jeResult?.totalCredit || 0);
    return {
      period: { year: now.getFullYear(), month: now.getMonth() + 1 },
      trialBalance: { isBalanced: Math.abs(totDebit - totCredit) < 1000, totalDebit: totDebit, totalCredit: totCredit },
      profitLoss: { revenue: totCredit, cogs: 0, expense: totDebit, netIncome: totCredit - totDebit },
      cashflow: { operatingNet: totCredit - totDebit, ending: totCredit - totDebit },
      ratios: { occupancyRatePercent: totalRooms ? Math.round((occupied / totalRooms) * 100) : 0, expenseRatio: totCredit ? Math.round((totDebit / totCredit) * 100) : 0 },
      readiness: { ready: true, score: 75, warnings: [] },
    };
  }

  async analyzeFinance(actorId: number) {
    this.checkRateLimit(actorId, 'finance');
    const snapshot = await this.buildFinanceSnapshot();
    const snapshotHash = stableHash(snapshot);
    if (!deepseekConfigured() || process.env.AI_FEATURES_ENABLED !== 'true') {
      return this.financeFallback(snapshot, snapshotHash, 'AI tidak dikonfigurasi');
    }
    const messages = buildFinancePrompt(snapshot as any);
    try {
      const result = await deepseekChat(messages, { json: true, temperature: 0.3, model: process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro', maxTokens: this.getFinanceMaxOutputTokens() });
      const parsed = JSON.parse(result.content);
      return { mode: 'DEEPSEEK', model: result.model, usage: result.usage, snapshotHash, promptHash: stableHash(messages.map(m=>m.content).join('|')), fallback: false, warnings: [], result: parsed, missingData: parsed.missingData || [] };
    } catch (err: any) {
      return this.financeFallback(snapshot, snapshotHash, err.message);
    }
  }

    private financeFallback(snapshot: any, snapshotHash: string, errorMsg?: string) {
    const warnings: string[] = [];
    if (errorMsg) warnings.push('AI gagal: ' + errorMsg);
    warnings.push('Analisa tanpa AI (rule fallback).');
    const netIncome = snapshot.profitLoss.netIncome;
    return {
      mode: 'RULE_FALLBACK', model: 'rule-based', usage: undefined, snapshotHash, promptHash: '', fallback: true, warnings,
      result: {
        executiveSummary: snapshot.trialBalance.isBalanced
          ? (String(snapshot.profitLoss.revenue) + String(snapshot.profitLoss.expense))
          : 'Trial balance tidak seimbang',
        healthScore: snapshot.trialBalance.isBalanced ? Math.min(100, Math.max(0, snapshot.ratios.occupancyRatePercent)) : 0,
        findings: [], ownerQuestions: [], doNotTouch: ['Jurnal periode', 'Period close', 'Deposit liability'], missingData: [],
      },
      missingData: [],
    };
  }
}
