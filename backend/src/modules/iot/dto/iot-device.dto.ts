import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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
  limit: number = 100;

  @IsOptional()
  @IsString()
  metric?: string;
}

export class TuyaProbeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalDeviceId?: string;
}
