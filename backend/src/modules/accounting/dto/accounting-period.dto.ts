import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export const ACCOUNTING_PERIOD_STATUSES = ['OPEN', 'CLOSED', 'LOCKED'] as const;

export class AccountingPeriodsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsIn(ACCOUNTING_PERIOD_STATUSES) status?: string;
}

export class CreateAccountingPeriodDto {
  @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(ACCOUNTING_PERIOD_STATUSES) status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAccountingPeriodDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(ACCOUNTING_PERIOD_STATUSES) status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ReopenAccountingPeriodDto {
  @IsString() @MinLength(8) reason!: string;
}
