import { IsDateString, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';

/**
 * M-2: catat meter satu siklus (listrik + air bareng) untuk kamar berpenghuni,
 * lalu auto-generate invoice meter (listrik/air) memakai jatah gratis & tarif dari
 * OperationalSetting. Hanya OWNER/ADMIN (penerbitan invoice = aksi finance).
 */
export class RecordMeterCycleDto {
  // Opsional: TENANT mengambil kamar dari stay-nya sendiri (roomId diabaikan demi keamanan).
  // OWNER/ADMIN WAJIB mengisi roomId (divalidasi di service).
  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsDateString()
  readingAt!: string;

  @IsNumberString({}, { message: 'Angka meter listrik harus berupa angka' })
  electricityReadingValue!: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Angka meter air harus berupa angka' })
  waterReadingValue?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
