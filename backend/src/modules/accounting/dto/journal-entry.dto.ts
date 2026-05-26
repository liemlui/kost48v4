import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export const JOURNAL_ENTRY_STATUSES = ['DRAFT', 'POSTED', 'VOID'] as const;
export const JOURNAL_SOURCE_TYPES = ['MANUAL', 'OPENING_BALANCE', 'SYSTEM_PLACEHOLDER', 'INVOICE', 'INVOICE_PAYMENT', 'PAYMENT_SUBMISSION', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'INVENTORY', 'DEPRECIATION', 'ADJUSTMENT', 'CLOSING_ENTRY'] as const;

export class JournalEntriesQueryDto {
  @IsOptional() @IsIn(JOURNAL_ENTRY_STATUSES) status?: string;
  @IsOptional() @IsIn(JOURNAL_SOURCE_TYPES) sourceType?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class RecentJournalsQueryDto {
  @IsOptional() @IsString() sourceTypes?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class JournalBySourceQueryDto {
  @IsIn(JOURNAL_SOURCE_TYPES) sourceType!: string;
  @IsString() sourceId!: string;
}

export class TrialBalanceQueryDto {
  @IsOptional() @IsDateString() asOf?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
}

export class JournalLineDraftDto {
  @Type(() => Number) @IsInt() @Min(1) chartOfAccountId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cashAccountId?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) debitRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) creditRupiah?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class CreateJournalDraftDto {
  @IsOptional() @IsString() entryNumber?: string;
  @IsDateString() entryDate!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) accountingPeriodId?: number;
  @IsOptional() @IsIn(JOURNAL_SOURCE_TYPES) sourceType?: string;
  @IsOptional() @IsString() sourceId?: string;
  @IsOptional() @IsString() memo?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => JournalLineDraftDto) lines!: JournalLineDraftDto[];
}
