import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCheckoutRequestDto {
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  actualCheckOutDate?: string;

  @ApiPropertyOptional({ example: 'Checkout lebih awal atas permintaan tenant' })
  @IsOptional()
  @IsString()
  checkoutReason?: string;

  @ApiPropertyOptional({ example: 'Checkout disetujui, terima kasih' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
