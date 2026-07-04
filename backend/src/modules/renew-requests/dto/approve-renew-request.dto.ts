import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveRenewRequestDto {
  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @ApiPropertyOptional({ example: 1700000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  agreedRentAmountRupiah?: number;

  @ApiPropertyOptional({ example: '1234', description: 'Wajib saat menerbitkan invoice pelunasan; tidak perlu saat finalisasi setelah invoice PAID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter listrik terbaru harus berupa angka' })
  electricityReadingValue?: number;

  @ApiPropertyOptional({ example: '88', description: 'Wajib saat menerbitkan invoice pelunasan; tidak perlu saat finalisasi setelah invoice PAID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter air terbaru harus berupa angka' })
  waterReadingValue?: number;

  @ApiPropertyOptional({ example: '2026-06-30T10:00:00.000Z', description: 'Wajib saat menerbitkan invoice pelunasan; tidak perlu saat finalisasi setelah invoice PAID' })
  @IsOptional()
  @IsDateString({}, { message: 'Tanggal catat meter tidak valid' })
  meterReadingAt?: string;

  @ApiPropertyOptional({ example: 'Disetujui, perpanjang 1 bulan' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
