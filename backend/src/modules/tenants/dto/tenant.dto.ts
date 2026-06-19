import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Gender } from '../../../common/enums/app.enums';

export class CreateTenantDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsString({ message: 'No KTP wajib diisi' })
  @Matches(/^\d{16}$/, { message: 'No KTP wajib 16 digit angka' })
  identityNumber!: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  originCity?: string;

  @IsOptional()
  @IsString()
  originProvince?: string;

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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // B-9 (F5-5): kode referral teman yang merekomendasikan tenant baru ini (admin/portal booking).
  // BUKAN kolom Tenant.referralCode milik tenant sendiri — di-strip sebelum create.
  @IsOptional()
  @IsString()
  referredByCode?: string;
}
export class UpdateTenantDto extends CreateTenantDto {}
