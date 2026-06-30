import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '../../../common/enums/app.enums';

/**
 * M-4: Bayar sekaligus beberapa invoice (sewa + meter OPEN) milik stay yang sama
 * dengan satu bukti bayar. Backend membuat PaymentSubmission per invoice.
 */
export class BatchPaymentSubmissionDto {
  @IsInt()
  @Min(1)
  stayId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  invoiceIds!: number[];

  @IsDateString()
  paidAt!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  senderBankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // File metadata — fileUrl di-generate server-side, jangan dikirim client.
  // fileKey opsional untuk CASH; wajib untuk metode pembayaran lain (dicek di service).
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[\w\-]+\.(jpg|jpeg|png|webp)$/i, { message: 'fileKey tidak valid' })
  fileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024)
  fileSizeBytes?: number;
}