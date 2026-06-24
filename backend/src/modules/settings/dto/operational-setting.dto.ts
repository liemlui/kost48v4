import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

/** M-1: konstanta operasional owner-settable (meter listrik/air + AI DeepSeek). Semua opsional (partial update). */
export class UpdateOperationalSettingDto {
  // Meter listrik & air
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeElectricityKwhPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) electricityTariffPerKwhRupiah?: number;
  @IsOptional() @IsBoolean() waterMeteringEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) waterTariffPerM3Rupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeWaterM3PerMonth?: number;
  // Layanan tambahan owner-settable
  @IsOptional() @IsInt() @Min(0) @Max(1000000) wifiRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) galonRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) petDepositRupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) extraOccupantFeePercent?: number;
  // AI / DeepSeek (R3)
  @IsOptional() @IsString() @MaxLength(100) deepseekModel?: string;
  @IsOptional() @IsString() @MaxLength(100) deepseekFinanceModel?: string;
  @IsOptional() @IsString() @MaxLength(300) deepseekBaseUrl?: string;
  @IsOptional() @IsBoolean() aiFeaturesEnabled?: boolean;
  @IsOptional() @IsBoolean() aiManualOnly?: boolean;
  @IsOptional() @IsBoolean() aiOwnerAdminOnly?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(1000) aiDailyRequestLimit?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiMaxInputChars?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiMaxOutputTokens?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100000) aiFinanceMaxOutputTokens?: number;
  @IsOptional() @IsBoolean() aiLogUsage?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(365) aiDraftRetentionDays?: number;
  @IsOptional() @IsString() capitalizationThresholdByCategory?: string; // JSON
}
