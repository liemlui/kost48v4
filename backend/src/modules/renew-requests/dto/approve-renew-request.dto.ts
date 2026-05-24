import { IsDateString, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ example: '1234.000', description: 'Angka meter listrik terbaru saat perpanjangan disetujui' })
  @IsNotEmpty({ message: 'Meter listrik terbaru wajib diisi sebelum perpanjangan disetujui' })
  @IsNumberString({}, { message: 'Meter listrik terbaru harus berupa angka' })
  electricityReadingValue!: string;

  @ApiProperty({ example: '88.000', description: 'Angka meter air terbaru saat perpanjangan disetujui' })
  @IsNotEmpty({ message: 'Meter air terbaru wajib diisi sebelum perpanjangan disetujui' })
  @IsNumberString({}, { message: 'Meter air terbaru harus berupa angka' })
  waterReadingValue!: string;

  @ApiProperty({ example: '2026-06-30T10:00:00.000Z', description: 'Waktu pencatatan meter terbaru' })
  @IsNotEmpty({ message: 'Tanggal catat meter wajib diisi sebelum perpanjangan disetujui' })
  @IsDateString({}, { message: 'Tanggal catat meter tidak valid' })
  meterReadingAt!: string;

  @ApiPropertyOptional({ example: 'Disetujui, perpanjang 1 bulan' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
