import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingTerm } from '../../../common/enums/app.enums';

export class CreateRenewRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  stayId: number;

  @ApiProperty({ enum: PricingTerm, example: PricingTerm.MONTHLY })
  @IsEnum(PricingTerm)
  requestedTerm: PricingTerm;



  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  requestedCheckOutDate?: string;

  @ApiPropertyOptional({ example: 'Saya ingin memperpanjang 1 bulan lagi' })
  @IsOptional()
  @IsString()
  requestNotes?: string;
}