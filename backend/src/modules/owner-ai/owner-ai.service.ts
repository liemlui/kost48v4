import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCategory, ExpenseType, RoomStatus } from '../../common/enums/app.enums';
import { deepseekConfigured, deepseekChat } from '../market-analysis/deepseek.client';
import { stableHash } from './ai-snapshot-hash.util';
import { buildBriefPrompt } from './prompts/brief.prompt';
import { buildFinancePrompt } from './prompts/finance.prompt';
import { buildPaymentReviewPrompt } from './prompts/payment-review.prompt';
import { buildFaqPrompt } from './prompts/faq.prompt';
import { buildExpenseOcrPrompt } from './prompts/expense-ocr.prompt';
import { buildKtpOcrPrompt } from './prompts/ktp-ocr.prompt';
import {
  buildFieldReportReviewPrompt,
  buildInventoryReorderPrompt,
  buildTicketActionPrompt,
} from './prompts/ops-inventory.prompt';
import {
  ageDays,
  cleanShortText,
  decidePaymentReviewGuard,
  extractLikelyAmount,
  extractLikelyDate,
  extractLikelyVendor,
  extractNikFromOcr,
  inventoryItemSnapshot,
  maskNik,
  maskNikInText,
  normalizeExpenseOcrDraft,
  normalizeFieldReportDraft,
  normalizeInventoryDraft,
  normalizeName,
  normalizeTicketActionDraft,
  parseNikDemographics,
} from './owner-ai.helpers';

@Injectable()
export class OwnerAiService {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private aiConfigCache: { data: Awaited<ReturnType<typeof this.getAiConfigInternal>>; ts: number } | null = null;
  private aiConfigSync: Awaited<ReturnType<typeof this.getAiConfigInternal>> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Baca konfigurasi AI dari DB (cache 5 menit). Fallback env. */
  private async getAiConfigInternal() {
    const db = await this.prisma.operationalSetting.findUnique({ where: { id: 1 } });
    return {
      featuresEnabled: db?.aiFeaturesEnabled ?? (process.env.AI_FEATURES_ENABLED === 'true'),
      defaultModel: db?.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      financeModel: db?.deepseekFinanceModel || process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro',
      baseUrl: db?.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      dailyLimit: db?.aiDailyRequestLimit ?? Number(process.env.AI_DAILY_REQUEST_LIMIT || 50),
      maxInputChars: db?.aiMaxInputChars ?? Number(process.env.AI_MAX_INPUT_CHARS || 12000),
      maxOutputTokens: db?.aiMaxOutputTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 1400),
      financeMaxOutputTokens: db?.aiFinanceMaxOutputTokens ?? Number(process.env.AI_FINANCE_MAX_OUTPUT_TOKENS || 2200),
    };
  }
  private async getAiConfig() {
    const now = Date.now();
    if (!this.aiConfigCache || (now - this.aiConfigCache.ts) > 300_000) {
      this.aiConfigCache = { data: await this.getAiConfigInternal(), ts: now };
      this.aiConfigSync = this.aiConfigCache.data;
    }
    return this.aiConfigCache.data;
  }

  /** Sync fallback (gunakan setelah getAiConfig() dipanggil minimal sekali). */
  private getAiConfigSync(): NonNullable<typeof this.aiConfigSync> {
    return this.aiConfigSync ?? { featuresEnabled: false, defaultModel: 'deepseek-v4-flash', financeModel: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com', dailyLimit: 50, maxInputChars: 12000, maxOutputTokens: 1400, financeMaxOutputTokens: 2200 };
  }

  /** Status AI: configured, enabled, model, limit. Baca dari DB (R3), fallback env. Tanpa bocorkan API key. */
  async getStatus() {
    const configured = deepseekConfigured();
    const db = await this.prisma.operationalSetting.findUnique({ where: { id: 1 } });
    return {
      configured,
      enabled: db?.aiFeaturesEnabled ?? (process.env.AI_FEATURES_ENABLED === 'true'),
      defaultModel: db?.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      financeModel: db?.deepseekFinanceModel || process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro',
      baseUrl: db?.deepseekBaseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      manualOnly: db?.aiManualOnly ?? (process.env.AI_MANUAL_ONLY !== 'false'),
      ownerAdminOnly: db?.aiOwnerAdminOnly ?? (process.env.AI_OWNER_ADMIN_ONLY !== 'false'),
      dailyLimit: db?.aiDailyRequestLimit ?? Number(process.env.AI_DAILY_REQUEST_LIMIT || 50),
      dailyRemaining: this.getDailyRemaining(),
      logUsage: db?.aiLogUsage ?? (process.env.AI_LOG_USAGE !== 'false'),
      maxInputChars: db?.aiMaxInputChars ?? Number(process.env.AI_MAX_INPUT_CHARS || 12000),
      maxOutputTokens: db?.aiMaxOutputTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS || 1400),
      financeMaxOutputTokens: db?.aiFinanceMaxOutputTokens ?? Number(process.env.AI_FINANCE_MAX_OUTPUT_TOKENS || 2200),
      draftRetentionDays: db?.aiDraftRetentionDays ?? Number(process.env.AI_DRAFT_RETENTION_DAYS || 60),
    };
  }

  /** Rate-limit check: throws 429 jika melebihi daily limit. */
  checkRateLimit(actorId: number, feature: string): void {
    if (!this.getAiConfigSync().featuresEnabled) return; // no limit if disabled
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

  /** Max output tokens (default) — DB config dengan fallback env. */
  getMaxOutputTokens(): number {
    return this.getAiConfigSync().maxOutputTokens;
  }

  /** Max output tokens (finance) — DB config dengan fallback env. */
  getFinanceMaxOutputTokens(): number {
    return this.getAiConfigSync().financeMaxOutputTokens;
  }

  // ── G7: Settings, Budget & Observability ──────────────────────────────────

  /** Statistik penggunaan AI hari ini (in-memory, per feature). Tanpa secret. */
  getUsageStats() {
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 50);
    const byFeature: Record<string, number> = {};
    let todayTotal = 0;
    for (const [key, b] of this.buckets) {
      if (b.resetAt < dayStart) continue; // bucket kemarin → diabaikan
      const idx = key.indexOf(':');
      const feature = idx >= 0 ? key.slice(idx + 1) : 'unknown';
      byFeature[feature] = (byFeature[feature] ?? 0) + b.count;
      todayTotal += b.count;
    }
    return {
      enabled: this.getAiConfigSync().featuresEnabled,
      dailyLimit,
      todayTotal,
      remainingDaily: Math.max(0, dailyLimit - todayTotal),
      byFeature,
    };
  }

  /** 20 jejak audit terakhir yang memakai AI (AuditLog.meta.ai). Tanpa secret. */
  async recentAiAudit(limit = 20) {
    const rows = await this.prisma.$queryRaw<Array<{
      id: number; action: string; entityType: string; entityId: string | null; createdAt: Date; meta: any; actorName: string | null;
    }>>`
      SELECT a.id, a.action, a."entityType", a."entityId", a."createdAt", a.meta, u."fullName" AS "actorName"
      FROM "AuditLog" a
      LEFT JOIN "User" u ON u.id = a."actorUserId"
      WHERE jsonb_exists(a.meta, 'ai')
      ORDER BY a."createdAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
      actorName: r.actorName,
      ai: r.meta?.ai ?? null,
    }));
  }

  /** Ringkasan observability untuk Owner Settings: usage + audit AI. */
  async getUsageOverview() {
    const recentAudit = await this.recentAiAudit(20);
    return { ...this.getUsageStats(), recentAudit };
  }

  /** Tes koneksi DeepSeek (OWNER). Minimal token; JANGAN bocorkan API key. */
  async testConnection(actorId: number) {
    if (!deepseekConfigured()) {
      return { configured: false, ok: false, message: 'DEEPSEEK_API_KEY belum dikonfigurasi.' };
    }
    this.checkRateLimit(actorId, 'test-connection');
    const started = Date.now();
    try {
      const res = await deepseekChat(
        [
          { role: 'system', content: 'Balas hanya satu kata: OK.' },
          { role: 'user', content: 'OK' },
        ],
        { maxTokens: 5, temperature: 0, timeoutMs: 15_000 },
      );
      return {
        configured: true,
        ok: true,
        model: res.model,
        latencyMs: Date.now() - started,
        usage: res.usage,
        message: 'Koneksi DeepSeek berhasil.',
      };
    } catch (err: any) {
      return {
        configured: true,
        ok: false,
        latencyMs: Date.now() - started,
        // Pesan error DeepSeek tak memuat API key (key hanya di header Authorization).
        message: 'Gagal menghubungi DeepSeek: ' + (err?.message ?? 'tidak diketahui'),
      };
    }
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

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
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

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
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
        result: normalizeExpenseOcrDraft(parsed),
      };
    } catch (err: any) {
      return this.expenseOcrFallback(text, snapshotHash, err?.message);
    }
  }

  private expenseOcrFallback(text: string, snapshotHash: string, errorMsg?: string) {
    const warnings = ['AI tidak tersedia; draft dibuat konservatif dari OCR lokal dan wajib dicek manual.'];
    if (errorMsg) warnings.unshift('AI gagal: ' + String(errorMsg).slice(0, 180));

    const amountRupiah = extractLikelyAmount(text);
    const expenseDate = extractLikelyDate(text);
    const vendorName = extractLikelyVendor(text);
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
      result: normalizeExpenseOcrDraft({
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

  // ── G5: KTP OCR Validator ──────────────────────────────────────────────────

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
    const ocrNik = extractNikFromOcr(text);
    const nikFormatValid = !!ocrNik && ocrNik.length === 16;
    const tenantNikDigits = (tenant.identityNumber || '').replace(/\D/g, '');
    const nikMatchesTenant = nikFormatValid && tenantNikDigits.length === 16 && ocrNik === tenantNikDigits;
    const demographics = parseNikDemographics(ocrNik);
    const tenantMaskedNik = maskNik(tenant.identityNumber);

    // Hash dari objek yang sudah diminimalkan — TANPA NIK penuh / OCR mentah (PDP).
    const snapshotHash = stableHash({
      tenantId: tenant.id,
      tenantName: normalizeName(tenant.fullName),
      tenantNikMasked: tenantMaskedNik,
      ocrLen: text.length,
      ocrNikMasked: maskNik(ocrNik),
    });

    const deterministic = {
      nikFormatValid,
      nikMatchesTenant,
      ocrNikMasked: maskNik(ocrNik),
      demographicsFromNik: demographics,
    };

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return this.ktpFallback(tenant, deterministic, snapshotHash);
    }

    const messages = buildKtpOcrPrompt({
      ocrText: maskNikInText(text),
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
      if (parsed?.extracted) parsed.extracted.nik = maskNik(parsed.extracted.nik);
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

  // G6: Operations & inventory assistant drafts. Read-only; final actions stay manual.

  async draftTicketAction(ticketId: number, actorId: number) {
    this.checkRateLimit(actorId, 'ticket-action-draft');
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        room: { select: { id: true, code: true, status: true } },
        assignedTo: { select: { id: true, role: true } },
        linkedRoomItem: {
          include: {
            room: { select: { id: true, code: true } },
            item: { select: { id: true, name: true, category: true, qtyOnHand: true, minQty: true, status: true } },
          },
        },
        linkedInventoryItem: { select: { id: true, name: true, category: true, qtyOnHand: true, minQty: true, status: true } },
        staffFieldReports: {
          orderBy: { id: 'desc' },
          take: 5,
          select: {
            id: true,
            reportedCondition: true,
            conditionNotes: true,
            requestsReplacement: true,
            requestedQty: true,
            status: true,
            createdAt: true,
            requestedInventoryItem: { select: { id: true, name: true, qtyOnHand: true, minQty: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan.');

    const snapshot = this.buildTicketOpsSnapshot(ticket);
    const snapshotHash = stableHash(snapshot);
    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return this.ticketActionFallback(snapshot, snapshotHash, 'AI tidak dikonfigurasi');
    }

    const messages = buildTicketActionPrompt(snapshot);
    try {
      const ai = await deepseekChat(messages, { json: true, temperature: 0.2, maxTokens: this.getMaxOutputTokens() });
      const parsed = JSON.parse(ai.content);
      return {
        mode: 'DEEPSEEK',
        model: ai.model,
        usage: ai.usage,
        snapshotHash,
        promptHash: stableHash(messages.map((m) => m.content).join('|')),
        fallback: false,
        warnings: [],
        result: normalizeTicketActionDraft(parsed),
        missingData: [],
      };
    } catch (err: any) {
      return this.ticketActionFallback(snapshot, snapshotHash, err?.message);
    }
  }

  async draftReorder(actorId: number) {
    this.checkRateLimit(actorId, 'inventory-reorder-draft');
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [items, recentMovements, openStockTickets] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        select: { id: true, sku: true, name: true, category: true, unit: true, qtyOnHand: true, minQty: true, status: true },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { movementDate: { gte: since } },
        orderBy: { movementDate: 'desc' },
        take: 80,
        include: { item: { select: { id: true, name: true } }, room: { select: { id: true, code: true } } },
      }),
      this.prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, category: { in: ['STOK_HABIS', 'BARANG_RUSAK', 'AUDIT_INVENTARIS'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, ticketNumber: true, title: true, category: true, status: true, linkedInventoryItemId: true, createdAt: true },
      }),
    ]);

    const mappedItems = items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      qtyOnHand: Number(item.qtyOnHand),
      minQty: Number(item.minQty),
      status: item.status,
    }));
    const lowStockItems = mappedItems.filter((item) => item.qtyOnHand <= item.minQty || ['LOW_STOCK', 'OUT_OF_STOCK'].includes(item.status));
    const snapshot = {
      generatedAt: new Date().toISOString(),
      itemCount: mappedItems.length,
      lowStockItems,
      recentMovements: recentMovements.map((movement) => ({
        id: movement.id,
        itemId: movement.itemId,
        itemName: movement.item.name,
        movementType: movement.movementType,
        qty: Number(movement.qty),
        roomCode: movement.room?.code ?? null,
        movementDate: movement.movementDate.toISOString().slice(0, 10),
      })),
      openStockTickets: openStockTickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        category: ticket.category,
        status: ticket.status,
        linkedInventoryItemId: ticket.linkedInventoryItemId,
        ageDays: ageDays(ticket.createdAt),
      })),
    };
    const snapshotHash = stableHash(snapshot);

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return this.inventoryReorderFallback(snapshot, snapshotHash, 'AI tidak dikonfigurasi');
    }

    const messages = buildInventoryReorderPrompt(snapshot);
    try {
      const ai = await deepseekChat(messages, { json: true, temperature: 0.2, maxTokens: this.getMaxOutputTokens() });
      const parsed = JSON.parse(ai.content);
      return {
        mode: 'DEEPSEEK',
        model: ai.model,
        usage: ai.usage,
        snapshotHash,
        promptHash: stableHash(messages.map((m) => m.content).join('|')),
        fallback: false,
        warnings: [],
        result: normalizeInventoryDraft(parsed, lowStockItems),
        missingData: [],
      };
    } catch (err: any) {
      return this.inventoryReorderFallback(snapshot, snapshotHash, err?.message);
    }
  }

  async reviewFieldReport(reportId: number, actorId: number) {
    this.checkRateLimit(actorId, 'field-report-review-draft');
    const report = await this.prisma.staffFieldReport.findUnique({
      where: { id: reportId },
      include: {
        ticket: { select: { id: true, ticketNumber: true, title: true, category: true, status: true } },
        room: { select: { id: true, code: true, status: true } },
        roomItem: { include: { item: { select: { id: true, name: true, category: true, qtyOnHand: true, minQty: true, status: true } } } },
        inventoryItem: { select: { id: true, name: true, category: true, qtyOnHand: true, minQty: true, status: true } },
        requestedInventoryItem: { select: { id: true, name: true, category: true, qtyOnHand: true, minQty: true, status: true } },
      },
    });
    if (!report) throw new NotFoundException('Laporan lapangan tidak ditemukan.');

    const snapshot = {
      report: {
        id: report.id,
        status: report.status,
        reportedCondition: report.reportedCondition,
        conditionNotes: cleanShortText(report.conditionNotes, 600),
        requestsReplacement: report.requestsReplacement,
        requestedQty: report.requestedQty == null ? null : Number(report.requestedQty),
        ageDays: ageDays(report.createdAt),
      },
      ticket: report.ticket,
      room: report.room,
      roomItem: report.roomItem ? {
        id: report.roomItem.id,
        qty: Number(report.roomItem.qty),
        status: report.roomItem.status,
        note: cleanShortText(report.roomItem.note, 300),
        item: inventoryItemSnapshot(report.roomItem.item),
      } : null,
      inventoryItem: inventoryItemSnapshot(report.inventoryItem),
      requestedInventoryItem: inventoryItemSnapshot(report.requestedInventoryItem),
    };
    const snapshotHash = stableHash(snapshot);

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return this.fieldReportFallback(snapshot, snapshotHash, 'AI tidak dikonfigurasi');
    }

    const messages = buildFieldReportReviewPrompt(snapshot);
    try {
      const ai = await deepseekChat(messages, { json: true, temperature: 0.2, maxTokens: this.getMaxOutputTokens() });
      const parsed = JSON.parse(ai.content);
      return {
        mode: 'DEEPSEEK',
        model: ai.model,
        usage: ai.usage,
        snapshotHash,
        promptHash: stableHash(messages.map((m) => m.content).join('|')),
        fallback: false,
        warnings: [],
        result: normalizeFieldReportDraft(parsed),
        missingData: [],
      };
    } catch (err: any) {
      return this.fieldReportFallback(snapshot, snapshotHash, err?.message);
    }
  }

  // ── G2: Finance AI Analyst ─────────────────────────────────────────────────

  private buildTicketOpsSnapshot(ticket: any) {
    return {
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: cleanShortText(ticket.description, 800),
        category: ticket.category,
        status: ticket.status,
        hasIssueImage: Boolean(ticket.issueImageUrl || ticket.issueImageFileKey),
        hasResolutionImage: Boolean(ticket.resolutionImageUrl || ticket.resolutionImageFileKey),
        assigned: Boolean(ticket.assignedToId),
        handledByVendor: Boolean(ticket.handledByVendor),
        dueAt: ticket.dueAt?.toISOString?.() ?? null,
        ageDays: ageDays(ticket.createdAt),
      },
      room: ticket.room,
      linkedRoomItem: ticket.linkedRoomItem ? {
        id: ticket.linkedRoomItem.id,
        qty: Number(ticket.linkedRoomItem.qty),
        status: ticket.linkedRoomItem.status,
        note: cleanShortText(ticket.linkedRoomItem.note, 300),
        roomCode: ticket.linkedRoomItem.room?.code ?? null,
        item: inventoryItemSnapshot(ticket.linkedRoomItem.item),
      } : null,
      linkedInventoryItem: inventoryItemSnapshot(ticket.linkedInventoryItem),
      staffFieldReports: (ticket.staffFieldReports || []).map((report: any) => ({
        id: report.id,
        reportedCondition: report.reportedCondition,
        conditionNotes: cleanShortText(report.conditionNotes, 300),
        requestsReplacement: report.requestsReplacement,
        requestedQty: report.requestedQty == null ? null : Number(report.requestedQty),
        requestedInventoryItem: inventoryItemSnapshot(report.requestedInventoryItem),
        status: report.status,
        ageDays: ageDays(report.createdAt),
      })),
    };
  }

  private ticketActionFallback(snapshot: any, snapshotHash: string, errorMsg?: string) {
    const warnings = ['Draft tanpa AI (rule fallback). Owner/Admin tetap wajib memilih aksi manual.'];
    if (errorMsg) warnings.unshift('AI gagal: ' + String(errorMsg).slice(0, 180));
    const ticket = snapshot.ticket || {};
    const riskFlags = [
      ...(ticket.hasIssueImage ? [] : ['Foto/bukti awal belum ada.']),
      ...(snapshot.staffFieldReports?.length ? [] : ['Belum ada laporan lapangan staf.']),
      ...(ticket.dueAt ? [] : ['SLA/due date belum terisi.']),
    ];
    const recommendedAction = !ticket.assigned && ticket.status === 'OPEN'
      ? 'ASSIGN_STAFF'
      : (!ticket.hasIssueImage ? 'REQUEST_PHOTO' : (ticket.status === 'DONE' ? 'CLOSE' : 'KEEP_OPEN'));
    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      warnings,
      result: normalizeTicketActionDraft({
        summary: `${ticket.ticketNumber || 'Tiket'}: ${ticket.title || 'perlu ditinjau'}.`,
        recommendedAction,
        priority: ticket.category === 'EMERGENCY' || ticket.ageDays > 3 ? 'HIGH' : 'MEDIUM',
        suggestedNote: 'Mohon cek bukti, assign staf bila belum ada PIC, lalu lanjutkan aksi manual dari halaman tiket.',
        riskFlags,
      }),
      missingData: [],
    };
  }

  private inventoryReorderFallback(snapshot: any, snapshotHash: string, errorMsg?: string) {
    const warnings = ['Draft tanpa AI (rule fallback). Pembelian/mutasi stok tetap dibuat manual.'];
    if (errorMsg) warnings.unshift('AI gagal: ' + String(errorMsg).slice(0, 180));
    const lowStockItems = Array.isArray(snapshot.lowStockItems) ? snapshot.lowStockItems : [];
    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      warnings,
      result: normalizeInventoryDraft({
        lowStockItems: lowStockItems.map((item: any) => ({
          inventoryItemId: item.id,
          name: item.name,
          currentQty: item.qtyOnHand,
          suggestedMinQty: item.minQty,
          reason: item.status === 'OUT_OF_STOCK' ? 'Status habis stok.' : 'Qty sudah di bawah/sama dengan minimum.',
        })),
        purchaseSuggestions: lowStockItems.slice(0, 8).map((item: any) => ({
          name: item.name,
          qty: Math.max(1, Math.ceil(Number(item.minQty || 1) - Number(item.qtyOnHand || 0))),
          estimatedBudgetRupiah: 0,
          priority: item.status === 'OUT_OF_STOCK' ? 'HIGH' : 'MEDIUM',
        })),
        warnings: lowStockItems.length ? [] : ['Tidak ada item aktif yang terdeteksi low stock dari minQty/status.'],
      }, lowStockItems),
      missingData: [],
    };
  }

  private fieldReportFallback(snapshot: any, snapshotHash: string, errorMsg?: string) {
    const warnings = ['Draft tanpa AI (rule fallback). Review final tetap lewat admin-review.'];
    if (errorMsg) warnings.unshift('AI gagal: ' + String(errorMsg).slice(0, 180));
    const report = snapshot.report || {};
    return {
      mode: 'RULE_FALLBACK',
      model: 'rule-based',
      usage: undefined,
      snapshotHash,
      promptHash: '',
      fallback: true,
      warnings,
      result: normalizeFieldReportDraft({
        summary: `Laporan ${report.reportedCondition || 'lapangan'} perlu dicek admin.`,
        recommendedDecision: report.requestsReplacement ? 'APPROVE' : 'NEEDS_MORE_INFO',
        priority: ['MISSING', 'OUT_OF_STOCK'].includes(report.reportedCondition) ? 'HIGH' : 'MEDIUM',
        suggestedAdminNote: report.requestsReplacement
          ? 'Cek bukti/foto dan stok tersedia sebelum approve penggantian.'
          : 'Minta detail/foto tambahan bila kondisi belum jelas.',
        suggestedMovement: {
          needed: Boolean(report.requestsReplacement),
          movementType: report.requestsReplacement ? 'ASSIGN_TO_ROOM' : null,
          reason: report.requestsReplacement ? 'Staf meminta penggantian barang.' : 'Belum ada kebutuhan mutasi yang pasti.',
        },
        riskFlags: report.conditionNotes ? [] : ['Catatan kondisi masih kosong/pendek.'],
      }),
      missingData: [],
    };
  }

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
    if (!deepseekConfigured()) return this.financeFallback(snapshot, snapshotHash, 'AI tidak dikonfigurasi');
    const config = await this.getAiConfig();
    if (!config.featuresEnabled) return this.financeFallback(snapshot, snapshotHash, 'AI dimatikan di Settings');
    const messages = buildFinancePrompt(snapshot as any);
    try {
      const result = await deepseekChat(messages, { json: true, temperature: 0.3, model: config.financeModel, maxTokens: config.financeMaxOutputTokens });
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

  // ---- G3: Payment Review Assistant ---------------------------------------------

  async reviewPaymentSubmission(submissionId: number, actorId: number) {
    this.checkRateLimit(actorId, 'payment-review');
    const submission = await this.prisma.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        invoice: {
          select: {
            id: true,
            status: true,
            totalAmountRupiah: true,
            dueDate: true,
            lines: { select: { lineAmountRupiah: true } },
            payments: { select: { amountRupiah: true } },
          },
        },
        stay: {
          select: {
            status: true,
            agreedRentAmountRupiah: true,
            initialMetersPromotedAt: true,
            depositAmountRupiah: true,
            depositPaidAmountRupiah: true,
            downPaymentAmountRupiah: true,
            downPaymentPaidRupiah: true,
            room: { select: { status: true } },
          },
        },
      },
    });
    if (!submission) throw new Error('Submission tidak ditemukan');

    // Deterministic no-partial check SEBELUM AI
    const invoiceLineTotal = submission.invoice?.lines?.reduce((sum, line) => sum + Number(line.lineAmountRupiah ?? 0), 0) ?? 0;
    const invoiceTotal = Number(submission.invoice?.totalAmountRupiah ?? 0) > 0
      ? Number(submission.invoice?.totalAmountRupiah)
      : invoiceLineTotal;
    const invoicePaidAmount = submission.invoice?.payments?.reduce((sum, payment) => sum + Number(payment.amountRupiah ?? 0), 0) ?? 0;
    const invoiceRemaining = Math.max(invoiceTotal - invoicePaidAmount, 0);
    const submitted = submission.amountRupiah;
    const isBookingPath = submission.stay?.initialMetersPromotedAt == null;
    const depositRemaining = isBookingPath
      ? Math.max((submission.stay?.depositAmountRupiah ?? 0) - (submission.stay?.depositPaidAmountRupiah ?? 0), 0)
      : 0;
    const downPaymentRemaining = isBookingPath
      ? Math.max((submission.stay?.downPaymentAmountRupiah ?? 0) - (submission.stay?.downPaymentPaidRupiah ?? 0), 0)
      : 0;
    const settlementAmount = isBookingPath ? invoiceRemaining + depositRemaining : 0;
    const paymentGuard = decidePaymentReviewGuard(isBookingPath
      ? { invoiceTotal: 0, submitted, downPaymentRemaining, settlementAmount }
      : { invoiceTotal: invoiceRemaining, submitted });

    if (paymentGuard.violated) {
      return {
        mode: 'RULE_FALLBACK', fallback: true,
        warnings: ['Deterministic guard: nominal tidak sesuai aturan no-partial'],
        result: {
          recommendation: 'REJECT', confidence: 1.0,
          reason: 'Nominal tidak sesuai aturan no-partial.',
          riskFlags: ['NO_PARTIAL_VIOLATION'], reviewNoteDraft: '', requiredHumanChecks: [],
        },
      };
    }

    const snapshot = {
      submission: {
        id: submission.id, amountRupiah: submission.amountRupiah,
        paidAt: submission.paidAt, paymentMethod: submission.paymentMethod,
        status: submission.status,
      },
      invoice: submission.invoice ? {
        id: submission.invoice.id, status: submission.invoice.status,
        totalAmountRupiah: submission.invoice.totalAmountRupiah, dueDate: submission.invoice.dueDate,
        remainingRupiah: invoiceRemaining,
      } : null,
      stay: submission.stay ? {
        status: submission.stay.status,
        rent: submission.stay.agreedRentAmountRupiah,
        promoted: submission.stay.initialMetersPromotedAt !== null,
        bookingPath: isBookingPath,
        downPaymentRemaining,
        settlementAmount,
        paymentRule: paymentGuard.matchedRule,
      } : null,
    };
    const snapshotHash = stableHash(snapshot);

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return this.paymentFallback(snapshotHash, 'AI tidak dikonfigurasi');
    }

    const messages = buildPaymentReviewPrompt(snapshot as any);
    try {
      const result = await deepseekChat(messages, { json: true, temperature: 0.2, maxTokens: 1000 });
      const parsed = JSON.parse(result.content);
      return {
        mode: 'DEEPSEEK', model: result.model, usage: result.usage,
        snapshotHash, promptHash: stableHash(messages.map(m=>m.content).join('|')),
        fallback: false, warnings: [], result: parsed, missingData: [],
      };
    } catch (err: any) {
      return this.paymentFallback(snapshotHash, err.message);
    }
  }

  private paymentFallback(snapshotHash: string, errorMsg?: string) {
    return {
      mode: 'RULE_FALLBACK', fallback: true,
      warnings: errorMsg ? ['AI gagal: ' + errorMsg] : [],
      result: {
        recommendation: 'ASK_MORE_INFO', confidence: 0,
        reason: errorMsg || 'AI tidak tersedia', riskFlags: [],
        reviewNoteDraft: '', requiredHumanChecks: ['Review manual diperlukan'],
      },
      missingData: [], snapshotHash,
    };
  }

  // ---- G8: FAQ Generator ----------------------------------------------------

  async generateFaqDraft(actorId: number) {
    this.checkRateLimit(actorId, 'faq-generate');
    const layanan = await this.prisma.additionalService.findMany({
      where: { isActive: true },
      select: { name: true, description: true },
    });
    const messages = buildFaqPrompt(layanan.map(l => ({ name: l.name, description: l.description || undefined })));

    const promptHash = stableHash(messages.map(m => m.content).join('|'));

    const aicfg = await this.getAiConfig();
    if (!deepseekConfigured() || !aicfg.featuresEnabled) {
      return {
        mode: 'RULE_FALLBACK', fallback: true, promptHash,
        warnings: ['AI tidak dikonfigurasi'],
        result: { items: [], publicCopyDraft: '', tenantManualDraft: 'Aturan KOST48: DP 30%, deposit jaminan, no-partial.', warnings: [] },
        missingData: [],
      };
    }

    try {
      const result = await deepseekChat(messages, { json: true, temperature: 0.3 });
      const parsed = JSON.parse(result.content);
      return {
        mode: 'DEEPSEEK', model: result.model, usage: result.usage,
        promptHash, snapshotHash: '',
        fallback: false, warnings: parsed.warnings || [],
        result: parsed, missingData: [],
      };
    } catch (err: any) {
      return {
        mode: 'RULE_FALLBACK', fallback: true, promptHash,
        warnings: ['AI gagal: ' + err.message],
        result: { items: [], publicCopyDraft: '', tenantManualDraft: '', warnings: [] },
        missingData: [],
      };
    }
  }

}
