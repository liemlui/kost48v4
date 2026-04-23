import { SubmissionListRow, SubmissionLockRow } from './payment-submissions.types';

export function mapSubmissionRow(row: SubmissionListRow) {
  return {
    id: row.id,
    stayId: row.stayId,
    invoiceId: row.invoiceId,
    tenantId: row.tenantId,
    amountRupiah: row.amountRupiah,
    paidAt: row.paidAt,
    paymentMethod: row.paymentMethod,
    senderName: row.senderName,
    senderBankName: row.senderBankName,
    referenceNumber: row.referenceNumber,
    notes: row.notes,
    fileKey: row.fileKey,
    fileUrl: row.fileUrl,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status,
    reviewedAt: row.reviewedAt,
    reviewNotes: row.reviewNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tenant: {
      id: row.tenantId,
      fullName: row.tenantFullName,
      phone: row.tenantPhone,
    },
    room: {
      id: row.roomId,
      code: row.roomCode,
      name: row.roomName,
      status: row.roomStatus,
    },
    stay: {
      id: row.stayId,
      status: row.stayStatus,
      expiresAt: row.stayExpiresAt,
    },
    invoice: {
      id: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
      status: row.invoiceStatus,
      totalAmountRupiah: row.invoiceTotalAmountRupiah,
      paidAmountRupiah: row.invoicePaidAmountRupiah,
      remainingAmountRupiah: row.invoiceRemainingAmountRupiah,
    },
    submittedBy: {
      id: row.submittedById,
      fullName: row.submittedByName,
    },
    reviewedBy: row.reviewedById
      ? {
          id: row.reviewedById,
          fullName: row.reviewedByName,
        }
      : null,
  };
}

export function buildApprovalPaymentNote(submission: SubmissionLockRow) {
  const fragments = ['Pembayaran hasil approval bukti bayar tenant'];
  if (submission.referenceNumber) fragments.push(`Ref: ${submission.referenceNumber}`);
  if (submission.senderName) fragments.push(`Pengirim: ${submission.senderName}`);
  return fragments.join(' | ');
}
