import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TenantDepositLedgerEntryType } from '../../../common/enums/app.enums';

export class DepositLedgerQueryDto {
  @IsOptional()
  @IsEnum(TenantDepositLedgerEntryType)
  type?: TenantDepositLedgerEntryType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DepositLedgerSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class DepositLedgerDryRunDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
