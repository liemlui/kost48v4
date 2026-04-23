import { IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString({ message: 'Email atau nomor HP harus berupa string' })
  @MinLength(3, { message: 'Email atau nomor HP minimal 3 karakter' })
  identifier!: string;
}
