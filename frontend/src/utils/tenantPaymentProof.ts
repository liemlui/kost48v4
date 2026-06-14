export const TENANT_PAYMENT_PROOF_ACCEPT = 'image/jpeg,image/png,image/webp';
export const TENANT_PAYMENT_PROOF_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const TENANT_PAYMENT_PROOF_MAX_BYTES = 2 * 1024 * 1024;

export function formatTenantProofFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function validateTenantPaymentProofFile(file: File) {
  if (!TENANT_PAYMENT_PROOF_ALLOWED_TYPES.includes(file.type)) {
    return 'Bukti pembayaran hanya menerima JPG, PNG, atau WebP. PDF belum didukung untuk bukti pembayaran.';
  }
  if (file.size > TENANT_PAYMENT_PROOF_MAX_BYTES) {
    return `Ukuran bukti pembayaran maksimal 2MB. File kamu ${formatTenantProofFileSize(file.size)}.`;
  }
  return null;
}

export async function compressTenantPaymentProof(file: File): Promise<File> {
  if (!TENANT_PAYMENT_PROOF_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Bukti pembayaran hanya menerima JPG, PNG, atau WebP.');
  }

  const compressed = await compressImageFile(file, { maxSide: 1600, quality: 0.78 });
  return compressed.size < file.size ? compressed : file;
}

export async function prepareTenantPaymentProof(file: File): Promise<File> {
  const typeError = validateTenantPaymentProofFile(new File([file], file.name, { type: file.type }));
  if (typeError && !typeError.includes('maksimal')) throw new Error(typeError);

  let prepared = file;
  try {
    prepared = await compressTenantPaymentProof(file);
  } catch (error) {
    if (!TENANT_PAYMENT_PROOF_ALLOWED_TYPES.includes(file.type)) {
      throw error;
    }
    prepared = file;
  }

  const validationError = validateTenantPaymentProofFile(prepared);
  if (validationError) throw new Error(validationError);
  return prepared;
}

export function tenantPaymentProofReadyLabel(file: File) {
  return `${file.name} (${formatTenantProofFileSize(file.size)})`;
}
import { compressImageFile } from './compressImageFile';
