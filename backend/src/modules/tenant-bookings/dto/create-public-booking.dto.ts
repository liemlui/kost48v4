import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PricingTerm, StayPurpose } from '../../../common/enums/app.enums';

export class CreatePublicBookingDto {
  @IsInt()
  roomId!: number;

  @IsDateString()
  checkInDate!: string;

  @IsEnum(PricingTerm)
  pricingTerm!: PricingTerm;

  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @IsOptional()
  @IsEnum(StayPurpose)
  stayPurpose?: StayPurpose;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  website?: string;
}