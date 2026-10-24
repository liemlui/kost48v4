import { IsEmail, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

/**
 * S7 (P36 a) — jalur cadangan OWNER/ADMIN untuk mengaitkan pengajuan yang dibuat
 * TANPA akun ke akun TENANT yang sudah ada (kasus kontak pengajuan berbeda dengan
 * kontak akun, sehingga klaim mandiri gagal).
 * Pilih salah satu: `userId` atau `email`.
 */
export class LinkBookingAccountDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(254)
  email?: string;
}
