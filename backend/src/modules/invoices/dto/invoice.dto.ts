import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineType, UtilityType } from '../../../common/enums/app.enums';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'ID masa sewa (Stay)' })
  @IsInt()
  stayId!: number;

  @ApiProperty({ description: 'Nomor invoice (unik)' })
  @IsString()
  invoiceNumber!: string;

  @ApiProperty({ description: 'Awal periode tagihan (YYYY-MM-DD)' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ description: 'Akhir periode tagihan (YYYY-MM-DD)' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ description: 'Tanggal jatuh tempo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Catatan invoice' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Tanggal jatuh tempo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Catatan invoice' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInvoiceLineDto {
  @ApiProperty({ enum: InvoiceLineType, description: 'Jenis rincian: MONTHLY_RENT, ELECTRICITY, WATER, WIFI, SERVICE, DISCOUNT, dll' })
  @IsEnum(InvoiceLineType)
  lineType!: InvoiceLineType;

  @ApiPropertyOptional({ enum: UtilityType, description: 'Subtipe utilitas (ELECTRICITY/WATER)' })
  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @ApiProperty({ description: 'Deskripsi rincian' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Kuantitas (format string desimal)' })
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty!: string;

  @ApiPropertyOptional({ description: 'Satuan (misal: kWh, m³, bulan)' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Harga satuan (Rupiah)' })
  @IsInt()
  @Min(0)
  unitPriceRupiah!: number;

  @ApiPropertyOptional({ description: 'Urutan tampil' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateInvoiceLineDto {
  @ApiPropertyOptional({ enum: InvoiceLineType, description: 'Jenis rincian' })
  @IsOptional()
  @IsEnum(InvoiceLineType)
  lineType?: InvoiceLineType;

  @ApiPropertyOptional({ enum: UtilityType, description: 'Subtipe utilitas' })
  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @ApiPropertyOptional({ description: 'Deskripsi rincian' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Kuantitas (format string desimal)' })
  @IsOptional()
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty?: string;

  @ApiPropertyOptional({ description: 'Satuan' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Harga satuan (Rupiah)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceRupiah?: number;

  @ApiPropertyOptional({ description: 'Urutan tampil' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}


export class CreateInvoiceWithLinesAndIssueDto extends CreateInvoiceDto {
  @ApiProperty({ type: [CreateInvoiceLineDto], description: 'Rincian tagihan (minimal 1)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[];
}

export class CancelInvoiceDto {
  @ApiProperty({ description: 'Alasan pembatalan invoice' })
  @IsString()
  cancelReason!: string;
}
