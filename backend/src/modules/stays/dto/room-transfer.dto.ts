import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferRoomDto {
  @ApiProperty({ description: 'ID kamar tujuan' })
  @IsInt() @Min(1)
  toRoomId!: number;

  @ApiPropertyOptional({ description: 'Tanggal transfer (YYYY-MM-DD), default hari ini' })
  @IsOptional() @IsString()
  transferDate?: string;

  @ApiPropertyOptional({ description: 'Alasan transfer' })
  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;

  // Override harga sewa (OWNER-only; default = kunci harga lama, rent-loyalty D-16).
  @ApiPropertyOptional({ description: 'Override sewa bulanan baru (Rupiah), OWNER-only' })
  @IsOptional() @IsInt() @Min(0)
  newAgreedRentRupiah?: number;

  // Snapshot meter awal kamar baru (opsional, seperti check-in).
  @ApiPropertyOptional({ description: 'Meter listrik awal kamar baru (kWh)' })
  @IsOptional() @Type(() => Number) @IsNumber()
  initialElectricityKwh?: number;

  @ApiPropertyOptional({ description: 'Meter air awal kamar baru (m³)' })
  @IsOptional() @Type(() => Number) @IsNumber()
  initialWaterM3?: number;

  // F5-7 (AUD-1/D-21.1): meter AKHIR kamar LAMA → tagih utilitas berjalan sebelum pindah.
  @ApiPropertyOptional({ description: 'Meter listrik akhir kamar lama (kWh)' })
  @IsOptional() @Type(() => Number) @IsNumber()
  finalElectricityKwh?: number;

  @ApiPropertyOptional({ description: 'Meter air akhir kamar lama (m³)' })
  @IsOptional() @Type(() => Number) @IsNumber()
  finalWaterM3?: number;

  @ApiPropertyOptional({ description: 'Catatan transfer' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

// F4-11: prabayar/perpanjangan N bulan (harga bulanan), dibayar penuh di muka.
export class PrepayExtensionDto {
  @ApiProperty({ description: 'Jumlah bulan prabayar' })
  @IsInt() @Min(1)
  months!: number;

  @ApiPropertyOptional({ description: 'Metode pembayaran' })
  @IsOptional() @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Tanggal pembayaran (YYYY-MM-DD)' })
  @IsOptional() @IsString()
  paidAt?: string;

  // F5-8 (A-5): tarif diskon untuk prabayar jangka panjang.
  @ApiPropertyOptional({ description: 'Term diskon: MONTHLY, SMESTERLY (≥6 bln), YEARLY (≥12 bln)' })
  @IsOptional() @IsString()
  rateTerm?: 'MONTHLY' | 'SMESTERLY' | 'YEARLY';

  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
