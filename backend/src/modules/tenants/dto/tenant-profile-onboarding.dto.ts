import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender, LeadSource, MaritalStatus, SmokingHabit, VehicleOwnership } from '../../../common/enums/app.enums';

export class TenantProfileOnboardingDto {
  // ── Field profil wajib (dikunci setelah diisi) ───────────────────────────────
  @IsOptional()
  @IsEnum(Gender, { message: 'Jenis kelamin tidak valid' })
  gender?: Gender;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal lahir tidak valid (YYYY-MM-DD)' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  originCity?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  companyOrCampus?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  // ── Field marketing analytics (opsional, bebas diedit kapan saja) ────────────
  @IsOptional()
  @IsEnum(MaritalStatus, { message: 'Status pernikahan tidak valid' })
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsEnum(VehicleOwnership, { message: 'Kepemilikan kendaraan tidak valid' })
  vehicleOwnership?: VehicleOwnership;

  @IsOptional()
  @IsEnum(SmokingHabit, { message: 'Kebiasaan merokok tidak valid' })
  smokingHabit?: SmokingHabit;

  @IsOptional()
  @IsEnum(LeadSource, { message: 'Sumber informasi tidak valid' })
  howDidYouHear?: LeadSource;
}
