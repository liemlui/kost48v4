import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * F5-2 (AUD-2 / D-21.2): staf mengisi sendiri info tip P2P (e-wallet/bank).
 * Semua opsional; string kosong = hapus. TIDAK dijurnal (aliran uang P2P di luar buku kos).
 */
export class UpdateMyTipInfoDto {
  @IsOptional()
  @IsString({ message: 'GoPay harus berupa string' })
  @MaxLength(120, { message: 'GoPay maksimal 120 karakter' })
  tipGopay?: string;

  @IsOptional()
  @IsString({ message: 'OVO harus berupa string' })
  @MaxLength(120, { message: 'OVO maksimal 120 karakter' })
  tipOvo?: string;

  @IsOptional()
  @IsString({ message: 'DANA harus berupa string' })
  @MaxLength(120, { message: 'DANA maksimal 120 karakter' })
  tipDana?: string;

  @IsOptional()
  @IsString({ message: 'Bank harus berupa string' })
  @MaxLength(200, { message: 'Info bank maksimal 200 karakter' })
  tipBank?: string;
}
