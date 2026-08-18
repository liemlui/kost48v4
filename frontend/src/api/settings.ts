import client from './client';
import type { ApiEnvelope } from '../types';

export type OperationalSetting = {
  id: number;
  freeElectricityKwhPerMonth: number;
  electricityTariffPerKwhRupiah: number;
  waterMeteringEnabled: boolean;
  waterTariffPerM3Rupiah: number;
  freeWaterM3PerMonth: number;
  // Layanan tambahan owner-settable
  wifiRupiah: number;
  galonRupiah: number;
  petDepositRupiah: number;
  extraOccupantFeePercent: number;
  // AC cleaning — ambang kWh pemicu dini cuci AC (owner-settable)
  acCleanKwhThreshold: number;
  // Fitur tenant toggle
  tenantLoyaltyEnabled: boolean;
  ktpVerificationGateEnabled: boolean;
  // Brevo Email
  brevoApiKeySet?: boolean;
  brevoApiKeySource?: 'settings' | 'env' | null;
  brevoApiKeyPreview?: string | null;
  mailFromEmail?: string;
  mailFromName?: string;
  // Tuya IoT Cloud
  tuyaAccessKey?: string;
  tuyaApiBase?: string;
  tuyaSecretKeySet?: boolean;
  tuyaSecretKeySource?: 'settings' | 'env' | null;
  tuyaSecretKeyPreview?: string | null;
  // Web Push VAPID
  vapidPublicKey?: string;
  vapidSubject?: string;
  vapidPrivateKeySet?: boolean;
  vapidPrivateKeySource?: 'settings' | 'env' | null;
  vapidPrivateKeyPreview?: string | null;
  // AutoOps
  autoOpsEnabled: boolean;
  // Accounting sweeps
  recurringExpenseDraftsEnabled: boolean;
  assetDepreciationAutoEnabled: boolean;
  rentRecognitionEnabled: boolean;
  notificationPruningEnabled: boolean;
  notificationRetentionDays: number;
  journalReconciliationEnabled: boolean;
  journalReconciliationLimit: number;
  // SLA Deadlines
  bookingReviewDeadlineHours: number;
  approvedBookingPaymentDeadlineHours: number;
  paymentReviewUrgentHours: number;
  paymentReviewEscalateHours: number;
  paymentReviewMaxHours: number;
  invoiceUrgentAfterHours: number;
  invoiceDueAfterHours: number;
  renewReminderDays: number;
  renewLastCallHours: number;
  renewPaymentDeadlineHours: number;
  renewReviewUrgentHours: number;
  renewReviewEscalateHours: number;
  checkoutReviewUrgentHours: number;
  checkoutReviewEscalateHours: number;
  checkoutFinalUrgentHours: number;
  lateTenantVacateHours: number;
  autoOpsIntervalMinutes: number;
  // Maintenance
  acCleaningEnabled: boolean;
  // R3: AI/DeepSeek fields
  deepseekModel?: string;
  deepseekFinanceModel?: string;
  deepseekBaseUrl?: string;
  aiFeaturesEnabled?: boolean;
  aiManualOnly?: boolean;
  aiOwnerAdminOnly?: boolean;
  aiDailyRequestLimit?: number;
  aiMaxInputChars?: number;
  aiMaxOutputTokens?: number;
  aiFinanceMaxOutputTokens?: number;
  aiLogUsage?: boolean;
  aiDraftRetentionDays?: number;
  capitalizationThresholdByCategory?: string | null;
  // View-only status API key DeepSeek (nilai mentah TIDAK pernah dikirim backend)
  deepseekApiKeySet?: boolean;
  deepseekApiKeySource?: 'settings' | 'env' | null;
  deepseekApiKeyPreview?: string | null;
  updatedAt: string;
  updatedById?: number | null;
};

export type UpdateOperationalSettingPayload = Partial<
  Omit<
    OperationalSetting,
    'id' | 'updatedAt' | 'updatedById' | 'deepseekApiKeySet' | 'deepseekApiKeySource' | 'deepseekApiKeyPreview'
  >
> & {
  /** Isi untuk mengganti key; string kosong = hapus key dari settings (kembali ke env fallback). */
  deepseekApiKey?: string;
  brevoApiKey?: string;
  tuyaAccessKey?: string;
  tuyaSecretKey?: string;
  tuyaApiBase?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
};

/** Field yang diterima PUT /settings/operational (DTO backend pakai forbidNonWhitelisted —
 *  mengirim field asing seperti `id`/`updatedAt` membuat request DITOLAK 400). */
const OPERATIONAL_UPDATE_KEYS = [
  'freeElectricityKwhPerMonth', 'electricityTariffPerKwhRupiah', 'waterMeteringEnabled',
  'waterTariffPerM3Rupiah', 'freeWaterM3PerMonth', 'wifiRupiah', 'galonRupiah',
  'petDepositRupiah', 'extraOccupantFeePercent', 'acCleanKwhThreshold', 'tenantLoyaltyEnabled', 'ktpVerificationGateEnabled',
  'brevoApiKey', 'mailFromEmail', 'mailFromName',
  'tuyaAccessKey', 'tuyaSecretKey', 'tuyaApiBase',
  'vapidPublicKey', 'vapidPrivateKey', 'vapidSubject',
  'autoOpsEnabled',
  'recurringExpenseDraftsEnabled', 'assetDepreciationAutoEnabled', 'rentRecognitionEnabled',
  'notificationPruningEnabled', 'notificationRetentionDays', 'journalReconciliationEnabled', 'journalReconciliationLimit',
  'bookingReviewDeadlineHours', 'approvedBookingPaymentDeadlineHours',
  'paymentReviewUrgentHours', 'paymentReviewEscalateHours', 'paymentReviewMaxHours',
  'invoiceUrgentAfterHours', 'invoiceDueAfterHours',
  'renewReminderDays', 'renewLastCallHours', 'renewPaymentDeadlineHours', 'renewReviewUrgentHours', 'renewReviewEscalateHours',
  'checkoutReviewUrgentHours', 'checkoutReviewEscalateHours', 'checkoutFinalUrgentHours',
  'lateTenantVacateHours', 'autoOpsIntervalMinutes',
  'acCleaningEnabled',
  'deepseekModel', 'deepseekFinanceModel', 'deepseekBaseUrl', 'deepseekApiKey',
  'aiFeaturesEnabled', 'aiManualOnly', 'aiOwnerAdminOnly', 'aiDailyRequestLimit',
  'aiMaxInputChars', 'aiMaxOutputTokens', 'aiFinanceMaxOutputTokens', 'aiLogUsage',
  'aiDraftRetentionDays', 'capitalizationThresholdByCategory',
] as const;

/** Saring objek form (mis. hasil spread dari GET) menjadi payload PUT yang valid. */
export function pickOperationalPayload(form: Record<string, unknown>): UpdateOperationalSettingPayload {
  const out: Record<string, unknown> = {};
  for (const key of OPERATIONAL_UPDATE_KEYS) {
    if (form[key] !== undefined) out[key] = form[key];
  }
  return out as UpdateOperationalSettingPayload;
}

export async function fetchOperationalSettings() {
  const res = await client.get<ApiEnvelope<OperationalSetting>>('/settings/operational');
  return res.data.data;
}

export type PublicConfig = {
  freeElectricityKwhPerMonth: number;
  electricityTariffPerKwhRupiah: number;
  waterMeteringEnabled: boolean;
  wifiRupiah: number;
  galonRupiah: number;
  petDepositRupiah: number;
  extraOccupantFeePercent: number;
  tenantLoyaltyEnabled: boolean;
  adminWhatsappNumber: string;  // D-25: nomor WA admin, owner-settable
};

export async function fetchPublicConfig() {
  const res = await client.get<{ data: PublicConfig }>('/settings/public-config');
  return res.data.data;
}

export async function updateOperationalSettings(payload: UpdateOperationalSettingPayload) {
  const res = await client.put<ApiEnvelope<OperationalSetting>>('/settings/operational', payload);
  return res.data.data;
}
