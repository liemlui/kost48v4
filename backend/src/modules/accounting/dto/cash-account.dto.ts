import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const CASH_ACCOUNT_TYPES = ['CASH', 'BANK', 'QRIS', 'EWALLET', 'OTHER'] as const;

export class CashAccountsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(CASH_ACCOUNT_TYPES) accountType?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CreateCashAccountDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsIn(CASH_ACCOUNT_TYPES) accountType?: string;
  @Type(() => Number) @IsInt() @Min(1) chartOfAccountId!: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumberMasked?: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @Type(() => Number) @IsInt() openingBalanceRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() currentBalanceRupiah?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCashAccountDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(CASH_ACCOUNT_TYPES) accountType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) chartOfAccountId?: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumberMasked?: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @Type(() => Number) @IsInt() openingBalanceRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() currentBalanceRupiah?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}
