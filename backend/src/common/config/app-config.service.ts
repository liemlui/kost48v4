import { Logger } from '@nestjs/common';

/**
 * AppConfigService — single source of truth untuk semua environment variable.
 * 
 * Prinsip:
 * 1. Setiap env var dibaca SEKALI (cache di properti)
 * 2. Validasi startup: env kritis wajib ada, kalau tidak → startup GAGAL
 * 3. Semua default value didefinisikan di sini (bukan tersebar di 25+ file)
 * 4. Akses typed: gunakan getter, jangan process.env langsung
 * 
 * Usage: Inject via NestJS — `constructor(private readonly config: AppConfigService) {}`
 */

export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  // ══════════════════════════════════════════════
  //  SECTION 1: Deployment & Database (KRITIS — startup gagal jika kosong)
  // ══════════════════════════════════════════════

  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly databaseUrl: string;

  // ══════════════════════════════════════════════
  //  SECTION 2: CORS & Security
  // ══════════════════════════════════════════════

  readonly corsOrigin: string[];
  readonly rateLimitGlobalPerMinute: number;
  readonly rateLimitAuthPer15Min: number;

  // ══════════════════════════════════════════════
  //  SECTION 3: Auto-Ops
  // ══════════════════════════════════════════════

  readonly autoOpsEnabled: boolean;
  readonly autoOpsCronToken: string;
  readonly autoOpsIntervalMinutes: number;
  readonly bookingReviewDeadlineHours: number;
  readonly approvedBookingPaymentDeadlineHours: number;
  readonly paymentReviewUrgentHours: number;
  readonly paymentReviewEscalateHours: number;
  readonly paymentReviewMaxHours: number;
  readonly invoiceUrgentAfterHours: number;
  readonly invoiceDueAfterHours: number;
  readonly renewReminderDays: number;
  readonly renewLastCallHours: number;
  readonly renewPaymentDeadlineHours: number;
  readonly renewReviewUrgentHours: number;
  readonly renewReviewEscalateHours: number;
  readonly checkoutReviewUrgentHours: number;
  readonly checkoutReviewEscalateHours: number;
  readonly checkoutFinalUrgentHours: number;
  readonly lateTenantVacateHours: number;

  // ══════════════════════════════════════════════
  //  SECTION 4: Accounting Sweeper Flags
  // ══════════════════════════════════════════════

  readonly accountingAutoCloseEnabled: boolean;
  readonly recurringExpenseDraftsEnabled: boolean;
  readonly assetDepreciationAutoEnabled: boolean;
  readonly rentRecognitionEnabled: boolean;
  readonly notificationPruningEnabled: boolean;
  readonly notificationRetentionDays: number;
  readonly journalReconciliationEnabled: boolean;
  readonly journalReconciliationLimit: number;

  // ══════════════════════════════════════════════
  //  SECTION 5: Maintenance & Facility
  // ══════════════════════════════════════════════

  readonly referralRewardsEnabled: boolean;
  readonly acCleaningEnabled: boolean;
  readonly acCleanKwhThreshold: number;
  readonly pushDispatchEnabled: boolean;

  // ══════════════════════════════════════════════
  //  SECTION 6: IoT & Telemetry
  // ══════════════════════════════════════════════

  readonly iotTuyaPollEnabled: boolean;
  readonly iotTuyaPollMinutes: number;
  readonly iotTuyaCronToken: string;
  readonly iotStaleAfterMinutes: number;

  // ══════════════════════════════════════════════
  //  SECTION 6A: Optional memory telemetry
  // ══════════════════════════════════════════════

  readonly memoryTelemetryEnabled: boolean;
  readonly memoryTelemetryIntervalSeconds: number;

  // ══════════════════════════════════════════════
  //  SECTION 7: AI / DeepSeek
  // ══════════════════════════════════════════════

  readonly deepseekApiKey: string | undefined;
  readonly deepseekBaseUrl: string;
  readonly deepseekModel: string;
  readonly deepseekFinanceModel: string;
  readonly aiFeaturesEnabled: boolean;
  readonly aiDailyRequestLimit: number;
  readonly aiMaxInputChars: number;
  readonly aiMaxOutputTokens: number;
  readonly aiFinanceMaxOutputTokens: number;
  readonly aiManualOnly: boolean;
  readonly aiOwnerAdminOnly: boolean;
  readonly aiLogUsage: boolean;
  readonly aiDraftRetentionDays: number;

  // ══════════════════════════════════════════════
  //  SECTION 8: Push Notification (VAPID)
  // ══════════════════════════════════════════════

  readonly vapidPublicKey: string;
  readonly vapidPrivateKey: string;
  readonly vapidSubject: string;

  // ══════════════════════════════════════════════
  //  SECTION 9: Business Rules
  // ══════════════════════════════════════════════

  readonly ktpActivationGateEnabled: boolean;
  readonly publicOnlineBookingEnabled: boolean;

  // ══════════════════════════════════════════════
  //  SECTION 10: Loyalty
  // ══════════════════════════════════════════════

  readonly loyaltyPointsRenewal: number;
  readonly loyaltyPointsOnTimePayment: number;
  readonly loyaltyPointsValidatedReport: number;
  readonly loyaltyPointsOnboardingQuest: number;
  readonly loyaltyPointsPeerImprovement: number;
  readonly loyaltyPointsReferral: number;
  readonly loyaltyPointRupiahValue: number;

  // ══════════════════════════════════════════════
  //  SECTION 11: External APIs
  // ══════════════════════════════════════════════

  readonly brevoApiKey: string | undefined;

  constructor() {
    // ── Section 1: Deployment ──
    this.nodeEnv = process.env.NODE_ENV ?? 'development';
    this.isProduction = this.nodeEnv === 'production';
    this.databaseUrl = process.env.DATABASE_URL ?? '';

    // ── Section 2: CORS & Security ──
    this.corsOrigin = (process.env.CORS_ORIGIN?.split(',') ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    this.rateLimitGlobalPerMinute = Number(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE ?? 300);
    this.rateLimitAuthPer15Min = Number(process.env.RATE_LIMIT_AUTH_PER_15MIN ?? 10);

    // ── Section 3: Auto-Ops ──
    this.autoOpsEnabled = this.parseBool(process.env.AUTO_OPS_ENABLED, true);
    this.autoOpsCronToken = (process.env.AUTO_OPS_CRON_TOKEN ?? '').trim();
    this.autoOpsIntervalMinutes = Number(process.env.AUTO_OPS_INTERVAL_MINUTES ?? 5);
    this.bookingReviewDeadlineHours = Number(process.env.BOOKING_REVIEW_DEADLINE_HOURS ?? 3);
    this.approvedBookingPaymentDeadlineHours = Number(process.env.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS ?? 3);
    this.paymentReviewUrgentHours = Number(process.env.PAYMENT_REVIEW_URGENT_HOURS ?? 1);
    this.paymentReviewEscalateHours = Number(process.env.PAYMENT_REVIEW_ESCALATE_HOURS ?? 3);
    this.paymentReviewMaxHours = Number(process.env.PAYMENT_REVIEW_MAX_HOURS ?? 6);
    this.invoiceUrgentAfterHours = Number(process.env.INVOICE_URGENT_AFTER_HOURS ?? 6);
    this.invoiceDueAfterHours = Number(process.env.INVOICE_DUE_AFTER_HOURS ?? 24);
    this.renewReminderDays = Number(process.env.RENEW_REMINDER_DAYS ?? 3);
    this.renewLastCallHours = Number(process.env.RENEW_LAST_CALL_HOURS ?? 24);
    this.renewPaymentDeadlineHours = Number(process.env.RENEW_PAYMENT_DEADLINE_HOURS ?? 3);
    this.renewReviewUrgentHours = Number(process.env.RENEW_REVIEW_URGENT_HOURS ?? 3);
    this.renewReviewEscalateHours = Number(process.env.RENEW_REVIEW_ESCALATE_HOURS ?? 6);
    this.checkoutReviewUrgentHours = Number(process.env.CHECKOUT_REVIEW_URGENT_HOURS ?? 3);
    this.checkoutReviewEscalateHours = Number(process.env.CHECKOUT_REVIEW_ESCALATE_HOURS ?? 6);
    this.checkoutFinalUrgentHours = Number(process.env.CHECKOUT_FINAL_URGENT_HOURS ?? 6);
    this.lateTenantVacateHours = Number(process.env.LATE_TENANT_VACATE_HOURS ?? 3);

    // ── Section 4: Accounting Sweeper ──
    this.accountingAutoCloseEnabled = this.parseBool(process.env.ACCOUNTING_AUTO_CLOSE_ENABLED, true);
    this.recurringExpenseDraftsEnabled = this.parseBool(process.env.RECURRING_EXPENSE_DRAFTS_ENABLED, true);
    this.assetDepreciationAutoEnabled = this.parseBool(process.env.ASSET_DEPRECIATION_AUTO_ENABLED, true);
    this.rentRecognitionEnabled = this.parseBool(process.env.RENT_RECOGNITION_ENABLED, true);
    this.notificationPruningEnabled = this.parseBool(process.env.NOTIFICATION_PRUNING_ENABLED, true);
    this.notificationRetentionDays = Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 90);
    this.journalReconciliationEnabled = this.parseBool(process.env.JOURNAL_RECONCILIATION_ENABLED, true);
    this.journalReconciliationLimit = Number(process.env.JOURNAL_RECONCILIATION_LIMIT ?? 50);

    // ── Section 5: Maintenance ──
    this.referralRewardsEnabled = this.parseBool(process.env.REFERRAL_REWARDS_ENABLED, true);
    this.acCleaningEnabled = this.parseBool(process.env.AC_CLEANING_ENABLED, true);
    this.acCleanKwhThreshold = Number(process.env.AC_CLEAN_KWH_THRESHOLD ?? 250);
    this.pushDispatchEnabled = this.parseBool(process.env.PUSH_DISPATCH_ENABLED, true);

    // ── Section 6: IoT ──
    this.iotTuyaPollEnabled = this.parseBool(process.env.IOT_TUYA_POLL_ENABLED, false);
    this.iotTuyaPollMinutes = Number(process.env.IOT_TUYA_POLL_MINUTES ?? 10);
    this.iotTuyaCronToken = (process.env.IOT_TUYA_CRON_TOKEN ?? '').trim();
    this.iotStaleAfterMinutes = Number(process.env.IOT_STALE_AFTER_MINUTES ?? 15);
    this.memoryTelemetryEnabled = this.parseBool(process.env.MEMORY_TELEMETRY_ENABLED, false);
    this.memoryTelemetryIntervalSeconds = Math.max(10, Number(process.env.MEMORY_TELEMETRY_INTERVAL_SECONDS ?? 60));

    // ── Section 7: AI / DeepSeek ──
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER_KEY || undefined;
    this.deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
    this.deepseekFinanceModel = process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro';
    this.aiFeaturesEnabled = process.env.AI_FEATURES_ENABLED === 'true';
    this.aiDailyRequestLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 50);
    this.aiMaxInputChars = Number(process.env.AI_MAX_INPUT_CHARS || 12000);
    this.aiMaxOutputTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS || 1400);
    this.aiFinanceMaxOutputTokens = Number(process.env.AI_FINANCE_MAX_OUTPUT_TOKENS || 2200);
    this.aiManualOnly = process.env.AI_MANUAL_ONLY !== 'false';
    this.aiOwnerAdminOnly = process.env.AI_OWNER_ADMIN_ONLY !== 'false';
    this.aiLogUsage = process.env.AI_LOG_USAGE !== 'false';
    this.aiDraftRetentionDays = Number(process.env.AI_DRAFT_RETENTION_DAYS || 60);

    // ── Section 8: Push (VAPID) ──
    this.vapidPublicKey = (process.env.VAPID_PUBLIC_KEY ?? '').trim();
    this.vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY ?? '').trim();
    this.vapidSubject = (process.env.VAPID_SUBJECT ?? 'mailto:admin@kost48.local').trim();

    // ── Section 9: Business Rules ──
    this.ktpActivationGateEnabled = this.parseBool(process.env.KTP_ACTIVATION_GATE_ENABLED, false);
    this.publicOnlineBookingEnabled = this.parseBool(process.env.PUBLIC_ONLINE_BOOKING_ENABLED, false);

    // ── Section 10: Loyalty ──
    this.loyaltyPointsRenewal = Number(process.env.LOYALTY_POINTS_RENEWAL ?? 100);
    this.loyaltyPointsOnTimePayment = Number(process.env.LOYALTY_POINTS_ON_TIME_PAYMENT ?? 50);
    this.loyaltyPointsValidatedReport = Number(process.env.LOYALTY_POINTS_VALIDATED_REPORT ?? 30);
    this.loyaltyPointsOnboardingQuest = Number(process.env.LOYALTY_POINTS_ONBOARDING_QUEST ?? 200);
    this.loyaltyPointsPeerImprovement = Number(process.env.LOYALTY_POINTS_PEER_IMPROVEMENT ?? 40);
    this.loyaltyPointsReferral = Number(process.env.LOYALTY_POINTS_REFERRAL ?? 150);
    this.loyaltyPointRupiahValue = Number(process.env.LOYALTY_POINT_RUPIAH_VALUE ?? 100);

    // ── Section 11: External APIs ──
    this.brevoApiKey = process.env.BREVO_API_KEY || undefined;

    // ── Startup validation ──
    this.validate();
  }

  // ══════════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════════

  private parseBool(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
    return defaultValue;
  }

  // ══════════════════════════════════════════════
  //  Startup Validation
  // ══════════════════════════════════════════════

  private validate(): void {
    const warnings: string[] = [];

    // KRITIS: Database URL wajib ada di production
    if (this.isProduction && !this.databaseUrl) {
      throw new Error('DATABASE_URL wajib diisi di production!');
    }
    if (!this.databaseUrl && !this.isProduction) {
      warnings.push('DATABASE_URL tidak diisi — menggunakan default Prisma');
    }

    // KRITIS: Auto-Ops cron token wajib di production
    if (this.isProduction && !this.autoOpsCronToken) {
      warnings.push('AUTO_OPS_CRON_TOKEN tidak diisi — cron endpoint tidak terlindungi!');
    }

    // WARNING: VAPID keys untuk push notification
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      warnings.push('VAPID keys tidak diisi — push notification tidak akan berfungsi');
    }

    // WARNING: AI tanpa API key
    if (!this.deepseekApiKey && this.aiFeaturesEnabled) {
      warnings.push('AI_FEATURES_ENABLED=true tapi DEEPSEEK_API_KEY tidak diisi — AI tidak bisa dipakai');
    }

    // Log summary
    this.logger.log(
      `AppConfigService siap — NODE_ENV=${this.nodeEnv}, ` +
      `DB=${this.databaseUrl ? 'configured' : 'MISSING'}, ` +
      `AutoOps=${this.autoOpsEnabled ? 'ON' : 'OFF'}, ` +
      `AI=${this.aiFeaturesEnabled && this.deepseekApiKey ? 'READY' : this.aiFeaturesEnabled ? 'NO_KEY' : 'OFF'}, ` +
      `Push=${this.vapidPublicKey ? 'configured' : 'MISSING'}`,
    );

    for (const w of warnings) {
      this.logger.warn(`⚠ ${w}`);
    }
  }
}
