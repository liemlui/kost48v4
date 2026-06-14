import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RoomStatus } from '../../../common/enums/app.enums';

export class CreateRoomDto {
  @IsString() code!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() floor?: string;
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
  @IsOptional() @IsInt() @Min(0) acWattage?: number;
  @IsOptional() @IsInt() @Min(1) acCleanIntervalDays?: number;
}
export class UpdateRoomDto extends CreateRoomDto {}
