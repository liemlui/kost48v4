import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/app.enums';

export class CreateUserDto {
  @IsString()
  fullName!: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsInt()
  tenantId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString() tipGopay?: string;
  @IsOptional() @IsString() tipOvo?: string;
  @IsOptional() @IsString() tipDana?: string;
  @IsOptional() @IsString() tipShopeepay?: string;
  @IsOptional() @IsString() tipBank?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsInt()
  tenantId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // F4-14: info tip P2P staf (e-wallet/bank) — tip langsung tenant→staf, TIDAK dijurnal.
  @IsOptional() @IsString() tipGopay?: string;
  @IsOptional() @IsString() tipOvo?: string;
  @IsOptional() @IsString() tipDana?: string;
  @IsOptional() @IsString() tipShopeepay?: string;
  @IsOptional() @IsString() tipBank?: string;
}
