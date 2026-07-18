import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { RoomCategory, RoomSize, RoomType } from '../../../common/enums/app.enums';

export class CreateRoomDto {
  @IsString() code!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() floor?: string;
  // PUB-ROOM-CATEGORY: kategori, tipe, dan ukuran kamar (OWNER-only di service).
  @IsOptional() @IsEnum(RoomCategory) category?: RoomCategory;
  @IsOptional() @IsEnum(RoomType) roomType?: RoomType;
  @IsOptional() @IsEnum(RoomSize) roomSize?: RoomSize;
  @IsOptional() @IsInt() @Min(0) dailyRateRupiah?: number;
  @IsOptional() @IsInt() @Min(0) weeklyRateRupiah?: number;
  @IsOptional() @IsInt() @Min(0) biWeeklyRateRupiah?: number;
  @IsInt() @Min(0) monthlyRateRupiah!: number;
  @IsOptional() @IsInt() @Min(0) defaultDepositRupiah?: number;
  @IsOptional() @IsInt() @Min(0) electricityTariffPerKwhRupiah?: number;
  @IsOptional() @IsInt() @Min(0) waterTariffPerM3Rupiah?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  // F4-15: konfigurasi AC untuk penjadwalan cuci AC.
  @IsOptional() @IsBoolean() hasAc?: boolean;
  @IsOptional() @IsInt() @Min(1) acCleanIntervalDays?: number;
  // F5-4 (AUD-3): estimasi jam pakai AC/hari → pemicu dini kWh hibrid.
  @IsOptional() @IsNumber() @Min(0) @Max(24) acUsageHoursPerDay?: number;
}
export class UpdateRoomDto extends CreateRoomDto {}
