import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IotDeviceType, IotProvider } from '../../../generated/prisma';

export class CreateIotDeviceDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'deviceCode hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung' })
  deviceCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsEnum(IotProvider)
  provider!: IotProvider;

  @IsEnum(IotDeviceType)
  deviceType!: IotDeviceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalDeviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  productId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateIotDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalDeviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  productId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class IotDeviceQueryDto {
  @IsOptional()
  @IsEnum(IotProvider)
  provider?: IotProvider;

  @IsOptional()
  @IsEnum(IotDeviceType)
  deviceType?: IotDeviceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;
}

export class IotTelemetryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 100;

  @IsOptional()
  @IsString()
  metric?: string;

  /** Awal periode telemetry (ISO 8601). Satu pembacaan tepat sebelum titik ini
   * juga dikirim sebagai baseline agar pemakaian kumulatif dapat dihitung. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TuyaProbeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalDeviceId?: string;
}
