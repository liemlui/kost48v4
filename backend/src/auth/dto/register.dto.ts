import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Pendaftaran akun penghuni (publik). Data minimal; KTP menyusul saat check-in. */
export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  fullName!: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(120)
  email!: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Nomor HP tidak valid (8–20 digit)' })
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72, { message: 'Password maksimal 72 karakter' })
  password!: string;
}
