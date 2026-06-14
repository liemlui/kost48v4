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

  // F4-11: prabayar fleksibel — jumlah bulan ke depan (harga bulanan); >1 = unearned (F4-1).
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  prepaidMonths?: number;

  // F4-13a: review/masukan tenant saat perpanjang → poin RENEWAL_REVIEW.
  @ApiPropertyOptional({ example: 'Kamar nyaman, saran: tambah rak.' })
  @IsOptional()
  @IsString()
  tenantReview?: string;
}