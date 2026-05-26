import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { FixedAssetLedgerAlignmentMethod } from '../../../common/enums/app.enums';

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

export class AssetLedgerAlignmentDto {
  @IsEnum(FixedAssetLedgerAlignmentMethod)
  method!: FixedAssetLedgerAlignmentMethod;

  @IsOptional()
  @IsString()
  creditAccountCode?: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  @Min(1)
  amountRupiah?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
