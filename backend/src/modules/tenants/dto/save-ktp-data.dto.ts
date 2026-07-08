import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

/** P2-02: DTO validasi untuk PATCH /tenants/:id/ktp-data */
export class SaveKtpDataDto {
  @IsOptional() @IsString()
  nik?: string;

  @IsOptional() @IsString()
  namaLengkap?: string;

  @IsOptional() @IsString() @IsIn(['MALE', 'FEMALE'])
  gender?: string;

  @IsOptional() @IsDateString()
  birthDate?: string;

  @IsOptional() @IsString()
  birthPlace?: string;

  @IsOptional() @IsString()
  originCity?: string;

  @IsOptional() @IsString()
  originProvince?: string;

  @IsOptional() @IsString()
  occupation?: string;

  @IsOptional() @IsString()
  identityNumber?: string;

  @IsOptional() @IsString()
  rawOcrText?: string;
}
