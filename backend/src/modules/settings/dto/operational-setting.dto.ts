import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/** M-1: konstanta operasional owner-settable (meter listrik/air). Semua opsional (partial update). */
export class UpdateOperationalSettingDto {
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeElectricityKwhPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) electricityTariffPerKwhRupiah?: number;
  @IsOptional() @IsBoolean() waterMeteringEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) waterTariffPerM3Rupiah?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) freeWaterM3PerMonth?: number;
}
