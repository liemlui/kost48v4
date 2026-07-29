import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class WaterIngestDto {
  @IsISO8601()
  observedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  sequence?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  pulseTotal!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1_000_000_000)
  volumeTotalLiters!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(10_000)
  flowRateLpm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-120)
  @Max(0)
  rssiDbm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firmwareVersion?: string;

  @IsOptional()
  @IsBoolean()
  counterReset?: boolean;

  @IsOptional()
  @IsObject()
  diagnostics?: Record<string, unknown>;
}
