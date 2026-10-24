import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

export function parseDateOnly(value: string, errorMessage: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(errorMessage);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
}

/**
 * S7 — idempotensi pengajuan pembayaran TANPA kolom/tabel baru.
 *
 * Kunci idempoten = kombinasi nilai yang SUDAH tersimpan: `stayId` + `invoiceId` +
 * `amountRupiah` + `paidAt` (tanggal bayar, bukan timestamp). Jendela waktu membatasi
 * berapa lama kombinasi itu dianggap "ajuan yang sama", supaya pembayaran sah dengan
 * nominal identik pada periode lain tidak ikut tertolak.
 *
 * Batas jujur: ini bukan idempotency key seperti Stripe (yang menyimpan kunci eksplisit
 * dan memangkasnya setelah ±24 jam). Tanpa kolom kunci, pengajuan identik yang masuk
 * SETELAH jendela ini tidak bisa dibedakan dari pembayaran baru.
 */
export const PAYMENT_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function paymentIdempotencyWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - PAYMENT_IDEMPOTENCY_WINDOW_MS);
}

export function isPaymentSubmissionSchemaError(error: any) {
  const message = String(error?.message ?? '');
  const code = String(error?.code ?? error?.meta?.code ?? '');
  return code === '42P01' || code === '42704' || /PaymentSubmission|paymentsubmission/i.test(message);
}

export function handlePaymentSubmissionSchemaError(error: any): never | void {
  if (isPaymentSubmissionSchemaError(error)) {
    throw new ServiceUnavailableException(
      'Fitur payment submission belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
    );
  }
}
