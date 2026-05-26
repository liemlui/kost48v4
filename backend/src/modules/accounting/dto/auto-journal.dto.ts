import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const AUTO_JOURNAL_SOURCE_TYPES = ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'] as const;

export class AutoJournalBackfillDto {
  @IsOptional()
  @IsArray()
  @IsIn([...AUTO_JOURNAL_SOURCE_TYPES], { each: true })
  sourceTypes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class DepositBackfillDryRunDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
