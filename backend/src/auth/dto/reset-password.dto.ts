import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token reset harus berupa string' })
  @MinLength(6, { message: 'Token reset tidak valid' })
  token!: string;

  @IsString({ message: 'Password baru harus berupa string' })
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword!: string;
}
