import { IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { InvoiceLineType, UtilityType } from '../../../common/enums/app.enums';

export class CreateInvoiceDto {
  @IsInt()
  stayId!: number;

  @IsString()
  invoiceNumber!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInvoiceLineDto {
  @IsEnum(InvoiceLineType)
  lineType!: InvoiceLineType;

  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @IsString()
  description!: string;

  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsInt()
  @Min(0)
  unitPriceRupiah!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateInvoiceLineDto {
  @IsOptional()
  @IsEnum(InvoiceLineType)
  lineType?: InvoiceLineType;

  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceRupiah?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CancelInvoiceDto {
  @IsString()
  cancelReason!: string;
}
