import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

/** M-1: konstanta operasional owner-settable (meter listrik/air + AI DeepSeek). Semua opsional (partial update). */
export class UpdateOperationalSettingDto {
  // Meter listrik & air
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeElectricityKwhPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) electricityTariffPerKwhRupiah?: number;
  @IsOptional() @IsBoolean() waterMeteringEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) waterTariffPerM3Rupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeWaterM3PerMonth?: number;
  // Layanan tambahan owner-settable
  @IsOptional() @IsInt() @Min(0) @Max(1000000) wifiRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) galonRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) petDepositRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) extraOccupantFeePercent?: number;
  // AC cleaning — ambang kWh pemicu dini (0 = nonaktifkan pemicu kWh, pakai interval hari saja)
  @IsOptional() @IsInt() @Min(0) @Max(100000) acCleanKwhThreshold?: number;
  // Fitur tenant toggle
  @IsOptional() @IsBoolean() tenantLoyaltyEnabled?: boolean;
  @IsOptional() @IsBoolean() ktpVerificationGateEnabled?: boolean;
  // Brevo Email
  @IsOptional() @IsString() @MaxLength(200) brevoApiKey?: string;
  @IsOptional() @IsString() @MaxLength(100) mailFromEmail?: string;
  @IsOptional() @IsString() @MaxLength(100) mailFromName?: string;
  // Tuya IoT Cloud (owner-settable)
  @IsOptional() @IsString() @MaxLength(200) tuyaAccessKey?: string;
  @IsOptional() @IsString() @MaxLength(200) tuyaSecretKey?: string;
  @IsOptional() @IsString() @MaxLength(300) tuyaApiBase?: string;
  // Web Push VAPID (owner-settable)
  @IsOptional() @IsString() @MaxLength(200) vapidPublicKey?: string;
  @IsOptional() @IsString() @MaxLength(400) vapidPrivateKey?: string;
  @IsOptional() @IsString() @MaxLength(200) vapidSubject?: string;
  // AutoOps
  @IsOptional() @IsBoolean() autoOpsEnabled?: boolean;
  // Accounting sweeps
  @IsOptional() @IsBoolean() recurringExpenseDraftsEnabled?: boolean;
  @IsOptional() @IsBoolean() assetDepreciationAutoEnabled?: boolean;
  @IsOptional() @IsBoolean() rentRecognitionEnabled?: boolean;
  @IsOptional() @IsBoolean() notificationPruningEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(365) notificationRetentionDays?: number;
  @IsOptional() @IsBoolean() journalReconciliationEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(1000) journalReconciliationLimit?: number;
  // SLA Deadlines
  @IsOptional() @IsInt() @Min(1) @Max(168) bookingReviewDeadlineHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) approvedBookingPaymentDeadlineHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) paymentReviewUrgentHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) paymentReviewEscalateHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) paymentReviewMaxHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) invoiceUrgentAfterHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(720) invoiceDueAfterHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(30) renewReminderDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) renewLastCallHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) renewPaymentDeadlineHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) renewReviewUrgentHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) renewReviewEscalateHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) checkoutReviewUrgentHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) checkoutReviewEscalateHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) checkoutFinalUrgentHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(168) lateTenantVacateHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60) autoOpsIntervalMinutes?: number;
  // Maintenance
  @IsOptional() @IsBoolean() acCleaningEnabled?: boolean;
  // AI / DeepSeek (R3)
  @IsOptional() @IsString() @MaxLength(100) deepseekModel?: string;
  @IsOptional() @IsString() @MaxLength(100) deepseekFinanceModel?: string;
  @IsOptional() @IsString() @MaxLength(300) deepseekBaseUrl?: string;
  // API key DeepSeek (owner-request 2026-07-04): isi via Settings→AI; string kosong = hapus (kembali ke env fallback).
  @IsOptional() @IsString() @MaxLength(200) deepseekApiKey?: string;
  @IsOptional() @IsBoolean() aiFeaturesEnabled?: boolean;
  @IsOptional() @IsBoolean() aiManualOnly?: boolean;
  @IsOptional() @IsBoolean() aiOwnerAdminOnly?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(1000) aiDailyRequestLimit?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiMaxInputChars?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiMaxOutputTokens?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiFinanceMaxOutputTokens?: number;
  @IsOptional() @IsBoolean() aiLogUsage?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(365) aiDraftRetentionDays?: number;
  @IsOptional() @IsString() capitalizationThresholdByCategory?: string; // JSON
}
