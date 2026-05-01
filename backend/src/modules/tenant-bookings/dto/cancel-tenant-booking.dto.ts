import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTenantBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}