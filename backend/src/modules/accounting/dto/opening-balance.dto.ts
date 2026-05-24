import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OpeningBalancesQueryDto {
  @IsOptional() @IsString() status?: string;
}

export class OpeningBalanceLineDraftDto {
  @Type(() => Number) @IsInt() @Min(1) chartOfAccountId!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) debitRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) creditRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class CreateOpeningBalanceDraftDto {
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) accountingPeriodId?: number;
  @IsDateString() cutoverDate!: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OpeningBalanceLineDraftDto) lines!: OpeningBalanceLineDraftDto[];
}
