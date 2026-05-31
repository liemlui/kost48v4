import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
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
  phone!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

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
}
