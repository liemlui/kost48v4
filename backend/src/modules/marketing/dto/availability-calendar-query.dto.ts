import { IsDateString, IsOptional } from 'class-validator';

export class AvailabilityCalendarQueryDto {
  /** Tanggal awal range (YYYY-MM-DD). Default: hari ini. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Tanggal akhir range (YYYY-MM-DD), inclusive. Default: from + 13 hari (2 minggu). */
  @IsOptional()
  @IsDateString()
  to?: string;
}
