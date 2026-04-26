import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
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
  amountRupiah!: number;

  @IsDateString()
  paidAt!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderBankName?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsString()
  originalFilename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;
}

