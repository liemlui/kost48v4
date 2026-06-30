import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentSubmissionTargetType } from '../../../common/enums/app.enums';

export class CreatePaymentSubmissionDto {
  @IsInt()
  @Min(1)
  stayId!: number;

  @IsInt()
  @Min(1)
  invoiceId!: number;

  @IsEnum(PaymentSubmissionTargetType)
  targetType: PaymentSubmissionTargetType = PaymentSubmissionTargetType.INVOICE;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amountRupiah!: number;

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