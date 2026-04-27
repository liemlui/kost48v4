import { BadRequestException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmissionDetail = {
  id: number;
  stayId: number;
  invoiceId: number | null;
  tenantId: number;
  submittedById: number;
  amountRupiah: number;
  paidAt: Date;
  paymentMethod: string;
  senderName: string | null;
  senderBankName: string | null;
  referenceNumber: string | null;
  notes: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: string;
  reviewedById: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenant: { id: number; fullName: string; phone: string };
  room: { id: number; code: string; name: string | null; status: string };
  stay: { id: number; status: string; expiresAt: Date | null };
  invoice: {
    id: number;
    invoiceNumber: string;
    status: string;
    totalAmountRupiah: number;
    paidAmountRupiah: number;
    remainingAmountRupiah: number;
  };
  submittedBy: { id: number; fullName: string };
  reviewedBy: { id: number; fullName: string } | null;
};

export interface SubmissionLockRow {
  id: number;
  stayId: number;
  invoiceId: number | null;
  tenantId: number;
  submittedById: number;
  amountRupiah: number;
  paidAt: Date;
  paymentMethod: string;
  senderName: string | null;
  senderBankName: string | null;
  referenceNumber: string | null;
  notes: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: string;
  reviewedById: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenantFullName: string;
  roomId: number;
  roomCode: string;
  roomStatus: string;
  roomIsActive: boolean;
  stayStatus: string;
  stayDepositAmountRupiah: number;
  stayDepositPaidAmountRupiah: number;
  stayExpiresAt: Date | null;
  stayInitialElectricityKwhPending: number | null;
  stayInitialWaterM3Pending: number | null;
  stayInitialMetersRecordedAt: Date | null;
  stayInitialMetersRecordedById: number | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceIssuedAt: Date | null;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
}

/** Shape of a PaymentSubmission fetched with the standard include set. */
export type PaymentSubmissionWithIncludes = Prisma.PaymentSubmissionGetPayload<{
  include: {
    stay: { include: { room: true } };
    invoice: { include: { payments: { select: { amountRupiah: true } } } };
    tenant: { select: { id: true; fullName: true; phone: true } };
    submittedBy: { select: { id: true; fullName: true } };
    reviewedBy: { select: { id: true; fullName: true } };
  };
}>;

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

export function mapSubmissionFromPrisma(item: PaymentSubmissionWithIncludes): SubmissionDetail {
  const paidAmount = item.invoice?.payments?.reduce((sum, p) => sum + p.amountRupiah, 0) ?? 0;
  const totalAmount = item.invoice?.totalAmountRupiah ?? 0;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  return {
    id: item.id,
    stayId: item.stayId,
    invoiceId: item.invoiceId,
    tenantId: item.tenantId,
    submittedById: item.submittedById,
    amountRupiah: item.amountRupiah,
    paidAt: item.paidAt,
    paymentMethod: item.paymentMethod,
    senderName: item.senderName,
    senderBankName: item.senderBankName,
    referenceNumber: item.referenceNumber,
    notes: item.notes,
    fileKey: item.fileKey,
    fileUrl: item.fileUrl,
    originalFilename: item.originalFilename,
    mimeType: item.mimeType,
    fileSizeBytes: item.fileSizeBytes,
    status: item.status,
    reviewedById: item.reviewedById,
    reviewedAt: item.reviewedAt,
    reviewNotes: item.reviewNotes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    tenant: {
      id: item.tenant.id,
      fullName: item.tenant.fullName,
      phone: item.tenant.phone,
    },
    room: {
      id: item.stay.room.id,
      code: item.stay.room.code,
      name: item.stay.room.name,
      status: item.stay.room.status,
    },
    stay: {
      id: item.stay.id,
      status: item.stay.status,
      expiresAt: item.stay.expiresAt,
    },
    invoice: {
      id: item.invoice?.id ?? 0,
      invoiceNumber: item.invoice?.invoiceNumber ?? '',
      status: item.invoice?.status ?? '',
      totalAmountRupiah: totalAmount,
      paidAmountRupiah: paidAmount,
      remainingAmountRupiah: remainingAmount,
    },
    submittedBy: {
      id: item.submittedBy.id,
      fullName: item.submittedBy.fullName,
    },
    reviewedBy: item.reviewedBy
      ? {
          id: item.reviewedBy.id,
          fullName: item.reviewedBy.fullName,
        }
      : null,
  };
}

export function buildApprovalPaymentNote(submission: SubmissionLockRow): string {
  const fragments = ['Pembayaran hasil approval bukti bayar tenant'];
  if (submission.referenceNumber) fragments.push(`Ref: ${submission.referenceNumber}`);
  if (submission.senderName) fragments.push(`Pengirim: ${submission.senderName}`);
  return fragments.join(' | ');
}

export function parseDateOnly(value: string, errorMessage: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(errorMessage);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
}
