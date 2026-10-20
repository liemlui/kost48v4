import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PricingTerm, StayPurpose } from '../../../common/enums/app.enums';

export class CreateTenantBookingDto {
  @IsInt()
  roomId!: number;

  @IsDateString()
  checkInDate!: string;

  @IsEnum(PricingTerm)
  pricingTerm!: PricingTerm;

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
  @IsInt()
  @Min(1)
  occupantCount?: number;

  @IsOptional()
  @IsBoolean()
  hasPet?: boolean;
}
