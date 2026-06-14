import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class TransferRoomDto {
  @IsInt() @Min(1)
  toRoomId!: number;

  @IsOptional() @IsString()
  transferDate?: string;

  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;

  // Override harga sewa (OWNER-only; default = kunci harga lama, rent-loyalty D-16).
  @IsOptional() @IsInt() @Min(0)
  newAgreedRentRupiah?: number;

  // Snapshot meter awal kamar baru (opsional, seperti check-in).
  @IsOptional() @Type(() => Number) @IsNumber()
  initialElectricityKwh?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  initialWaterM3?: number;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

// F4-11: prabayar/perpanjangan N bulan (harga bulanan), dibayar penuh di muka.
export class PrepayExtensionDto {
  @IsInt() @Min(1)
  months!: number;

  @IsOptional() @IsString()
  method?: string;

  @IsOptional() @IsString()
  paidAt?: string;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
