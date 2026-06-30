import { IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PricingTerm, StayPurpose } from '../../../common/enums/app.enums';

export class CreatePublicBookingDto {
  @IsInt()
  roomId!: number;

  @IsDateString()
  checkInDate!: string;

  @IsEnum(PricingTerm)
  pricingTerm!: PricingTerm;

  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MaxLength(30)
  @Matches(/^[\d\s\+\-\(\)]{6,20}$/, { message: 'Format nomor telepon tidak valid' })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  identityNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @IsOptional()
  @IsEnum(StayPurpose)
  stayPurpose?: StayPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string;

  // F4-13: kode referral teman (opsional) → referrer dapat poin saat tenant ini aktif.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referralCode?: string;

  // Jumlah penghuni; melebihi batas gratis per roomSize → +20% sewa per orang.
  // Hard cap divalidasi di service berdasarkan roomSize (maks 4 STANDARD / 6 LARGE).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  occupantCount?: number;

  // Hewan peliharaan → petDepositRupiah dibebankan terpisah (refundable, dari OperationalSetting).
  @IsOptional()
  @IsBoolean()
  hasPet?: boolean;

  // Pilihan pembayaran awal: DP 30% atau LUNAS 100% sewa + semua deposit.
  // Default backend = DP bila tidak diisi.
  @IsOptional()
  @IsIn(['DP', 'FULL'])
  paymentChoice?: 'DP' | 'FULL';
}
