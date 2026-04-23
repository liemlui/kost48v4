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
