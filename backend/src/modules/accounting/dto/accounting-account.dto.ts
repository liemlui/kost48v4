import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'] as const;
export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const;

export class AccountingAccountsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(ACCOUNT_TYPES) type?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CreateChartOfAccountDto {
  @IsString() @MaxLength(32) code!: string;
  @IsString() @MaxLength(160) name!: string;
  @IsIn(ACCOUNT_TYPES) type!: string;
  @IsIn(NORMAL_BALANCES) normalBalance!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdateChartOfAccountDto {
  @IsOptional() @IsString() @MaxLength(32) code?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsIn(ACCOUNT_TYPES) type?: string;
  @IsOptional() @IsIn(NORMAL_BALANCES) normalBalance?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
