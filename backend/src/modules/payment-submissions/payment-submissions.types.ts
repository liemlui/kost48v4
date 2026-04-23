export interface SubmissionBaseRow {
  id: number;
  stayId: number;
  invoiceId: number;
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
}

export interface SubmissionListRow extends SubmissionBaseRow {
  tenantFullName: string;
  tenantPhone: string;
  roomId: number;
  roomCode: string;
  roomName: string | null;
  roomStatus: string;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
  invoiceRemainingAmountRupiah: number;
  submittedByName: string;
  reviewedByName: string | null;
}

export interface SubmissionLockRow extends SubmissionBaseRow {
  tenantFullName: string;
  roomId: number;
  roomCode: string;
  roomStatus: string;
  roomIsActive: boolean;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceIssuedAt: Date | null;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
}

export interface SubmissionEligibilityRow {
  stayId: number;
  invoiceId: number;
  tenantId: number;
  tenantFullName: string;
  roomId: number;
  roomCode: string;
  roomName: string | null;
  roomStatus: string;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
}
