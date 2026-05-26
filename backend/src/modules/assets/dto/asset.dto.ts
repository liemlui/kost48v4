import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  FixedAssetCapitalizationSource,
  FixedAssetCategory,
  FixedAssetDepreciationMethod,
  FixedAssetLocationType,
  FixedAssetStatus,
} from '../../../common/enums/app.enums';

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function toBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
  return Boolean(value);
}

export class CreateFixedAssetDto {
  @IsOptional() @IsString() assetCode?: string;
  @IsString() name!: string;
  @IsOptional() @IsEnum(FixedAssetCategory) category?: FixedAssetCategory;
  @IsOptional() @IsEnum(FixedAssetStatus) status?: FixedAssetStatus;
  @IsOptional() @IsEnum(FixedAssetLocationType) locationType?: FixedAssetLocationType;
  @IsOptional() @IsEnum(FixedAssetCapitalizationSource) capitalizationSource?: FixedAssetCapitalizationSource;
  @IsOptional() @IsEnum(FixedAssetDepreciationMethod) depreciationMethod?: FixedAssetDepreciationMethod;
  @IsDateString() acquisitionDate!: string;
  @IsOptional() @IsDateString() depreciationStartDate?: string;
  @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) acquisitionCostRupiah!: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(0) salvageValueRupiah?: number;
  @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) usefulLifeMonths!: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(0) accumulatedDepreciationRupiah?: number;
  @IsOptional() @Transform(({ value }) => toBoolean(value)) @IsBoolean() depreciationEnabled?: boolean;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) roomId?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) inventoryItemId?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) roomItemId?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) expenseId?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFixedAssetDto {
  @IsOptional() @IsString() assetCode?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(FixedAssetCategory) category?: FixedAssetCategory;
  @IsOptional() @IsEnum(FixedAssetStatus) status?: FixedAssetStatus;
  @IsOptional() @IsEnum(FixedAssetLocationType) locationType?: FixedAssetLocationType;
  @IsOptional() @IsEnum(FixedAssetCapitalizationSource) capitalizationSource?: FixedAssetCapitalizationSource;
  @IsOptional() @IsEnum(FixedAssetDepreciationMethod) depreciationMethod?: FixedAssetDepreciationMethod;
  @IsOptional() @IsDateString() acquisitionDate?: string;
  @IsOptional() @IsDateString() depreciationStartDate?: string;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) acquisitionCostRupiah?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(0) salvageValueRupiah?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) usefulLifeMonths?: number;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(0) accumulatedDepreciationRupiah?: number;
  @IsOptional() @Transform(({ value }) => toBoolean(value)) @IsBoolean() depreciationEnabled?: boolean;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) roomId?: number | null;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) inventoryItemId?: number | null;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) roomItemId?: number | null;
  @IsOptional() @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) expenseId?: number | null;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() disposedAt?: string | null;
  @IsOptional() @IsString() disposalNote?: string | null;
}

export class RunDepreciationDto {
  @Transform(({ value }) => toNumber(value)) @IsInt() @Min(2000) year!: number;
  @Transform(({ value }) => toNumber(value)) @IsInt() @Min(1) month!: number;
  @IsOptional() @IsString() notes?: string;
}
