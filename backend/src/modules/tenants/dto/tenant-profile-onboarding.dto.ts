import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../../common/enums/app.enums';

export class TenantProfileOnboardingDto {
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
}
