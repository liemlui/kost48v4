import { IsInt, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  stayId: number;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  requestedCheckOutDate: string;

  @ApiProperty({ example: 'Selesai kuliah / pindah kota' })
  @IsString()
  checkoutReason: string;

  @ApiPropertyOptional({ example: 'Saya ingin checkout lebih awal karena sudah selesai kuliah' })
  @IsOptional()
  @IsString()
  requestNotes?: string;
}
