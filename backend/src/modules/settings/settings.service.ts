import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { setDeepseekApiKey } from '../market-analysis/deepseek.client';
import { refreshAutoOpsDeadlines } from '../../common/business/auto-ops.constants';
import { UpdateOperationalSettingDto } from './dto/operational-setting.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Muat API key DeepSeek + SLA deadlines dari DB ke runtime saat boot (env tetap fallback). */
  async onModuleInit() {
    try {
      const s = await this.prisma.operationalSetting.findUnique({ where: { id: 1 }, select: { deepseekApiKey: true } });
      if (s?.deepseekApiKey?.trim()) setDeepseekApiKey(s.deepseekApiKey);
      await refreshAutoOpsDeadlines(this.prisma);
    } catch (err: any) {
      this.logger.warn('Gagal memuat konfigurasi dari DB (pakai env fallback)', err?.message ?? err);
    }
  }

  /** Singleton id=1; buat dengan default bila belum ada. RAW — internal saja, JANGAN kirim langsung ke client.
   *  DEFENSIVE: jika kolom baru (mis. adminWhatsappNumber) belum ada di DB produksi, fallback ke default object
   *  agar endpoint publik tidak 500. Logger.warn agar operator tahu perlu `prisma db push`. */
  async getOperational() {
    try {
      const existing = await this.prisma.operationalSetting.findUnique({ where: { id: 1 } });
      if (existing) return existing;
      return this.prisma.operationalSetting.create({ data: { id: 1 } });
    } catch (err: any) {
      // Kolom / tabel belum sinkron dengan schema.prisma — kembalikan default lengkap.
      this.logger.warn('getOperational() gagal (schema DB belum sinkron?), fallback ke default', err?.message ?? err);
      return this.getOperationalDefaults();
    }
  }

  /** Nilai default lengkap OperationalSetting — digunakan sebagai fallback saat query gagal. */
  private getOperationalDefaults() {
    return {
      id: 1,
      freeElectricityKwhPerMonth: 30,
      electricityTariffPerKwhRupiah: 2500,
      waterMeteringEnabled: false,
      waterTariffPerM3Rupiah: 0,
      freeWaterM3PerMonth: 0,
      wifiRupiah: 50000,
      galonRupiah: 20000,
      petDepositRupiah: 100000,
      extraOccupantFeePercent: 20,
      acCleanKwhThreshold: 200,
      deepseekModel: 'deepseek-v4-flash',
      deepseekFinanceModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
      deepseekApiKey: '',
      aiFeaturesEnabled: false,
      aiManualOnly: true,
      aiOwnerAdminOnly: true,
      aiDailyRequestLimit: 50,
      aiMaxInputChars: 12000,
      aiMaxOutputTokens: 1400,
      aiFinanceMaxOutputTokens: 2200,
      aiLogUsage: true,
      aiDraftRetentionDays: 60,
      capitalizationThresholdByCategory: null as string | null,
      tenantLoyaltyEnabled: false,
      ktpVerificationGateEnabled: false,
      adminWhatsappNumber: '6285648887628',
      // Brevo Email
      brevoApiKey: '',
      mailFromEmail: 'no-reply@kost48surabaya.com',
      mailFromName: 'Kost48 Surabaya',
      // AutoOps
      autoOpsEnabled: true,
      // Accounting sweeps
      recurringExpenseDraftsEnabled: false,
      assetDepreciationAutoEnabled: false,
      rentRecognitionEnabled: false,
      notificationPruningEnabled: true,
      notificationRetentionDays: 90,
      journalReconciliationEnabled: false,
      journalReconciliationLimit: 100,
      // SLA Deadlines
      bookingReviewDeadlineHours: 3,
      approvedBookingPaymentDeadlineHours: 3,
      paymentReviewUrgentHours: 1,
      paymentReviewEscalateHours: 3,
      paymentReviewMaxHours: 6,
      invoiceUrgentAfterHours: 6,
      invoiceDueAfterHours: 24,
      renewReminderDays: 3,
      renewLastCallHours: 24,
      renewPaymentDeadlineHours: 3,
      renewReviewUrgentHours: 3,
      renewReviewEscalateHours: 6,
      checkoutReviewUrgentHours: 3,
      checkoutReviewEscalateHours: 6,
      checkoutFinalUrgentHours: 6,
      lateTenantVacateHours: 3,
      autoOpsIntervalMinutes: 5,
      // Maintenance
      acCleaningEnabled: true,
      updatedAt: new Date(),
      updatedById: null as number | null,
    };
  }

  /** Versi AMAN untuk respons API: API key TIDAK pernah ikut — hanya status + preview (preview khusus OWNER). */
  async getOperationalView(role?: string) {
    return this.toSafeView(await this.getOperational(), role);
  }

  async updateOperational(dto: UpdateOperationalSettingDto, userId?: number) {
    await this.getOperational();
    const { deepseekApiKey, brevoApiKey, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest, updatedById: userId ?? null };
    if (deepseekApiKey !== undefined) data.deepseekApiKey = deepseekApiKey.trim();
    if (brevoApiKey !== undefined) data.brevoApiKey = brevoApiKey.trim();

    const updated = await this.prisma.operationalSetting.update({ where: { id: 1 }, data });

    // Aktifkan key baru tanpa restart backend (kosong = kembali ke env fallback).
    if (deepseekApiKey !== undefined) setDeepseekApiKey(updated.deepseekApiKey);
    // Refresh SLA deadlines ke cache runtime
    await refreshAutoOpsDeadlines(this.prisma);

    return this.toSafeView(updated, 'OWNER');
  }

  /** Buang kolom rahasia dari payload; sisipkan status key agar UI tahu kondisi tanpa membocorkan nilai. */
  private toSafeView(setting: Awaited<ReturnType<SettingsService['getOperational']>>, role?: string) {
    const { deepseekApiKey, brevoApiKey, ...safe } = setting;
    const dbKey = (deepseekApiKey ?? '').trim();
    const fromDb = dbKey.length > 0;
    const fromEnv = Boolean(process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER_KEY);
    const brevoKey = (brevoApiKey ?? '').trim();
    const brevoFromDb = brevoKey.length > 0;
    const brevoFromEnv = Boolean(process.env.BREVO_API_KEY);
    return {
      ...safe,
      deepseekApiKeySet: fromDb || fromEnv,
      deepseekApiKeySource: fromDb ? ('settings' as const) : fromEnv ? ('env' as const) : null,
      deepseekApiKeyPreview: role === 'OWNER' && fromDb ? `••••${dbKey.slice(-4)}` : null,
      brevoApiKeySet: brevoFromDb || brevoFromEnv,
      brevoApiKeySource: brevoFromDb ? ('settings' as const) : brevoFromEnv ? ('env' as const) : null,
      brevoApiKeyPreview: role === 'OWNER' && brevoFromDb ? `••••${brevoKey.slice(-4)}` : null,
    };
  }
}
