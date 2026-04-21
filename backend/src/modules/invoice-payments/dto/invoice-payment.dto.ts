import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../../../common/enums/app.enums';

export class CreateInvoicePaymentDto {
  @IsInt() invoiceId!: number;
  @IsDateString() paymentDate!: string;
  @IsInt() @Min(1) amountRupiah!: number;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateInvoicePaymentDto {
  @IsOptional() @IsDateString() paymentDate?: string;
  @IsOptional() @IsInt() @Min(1) amountRupiah?: number;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() note?: string;
}
