import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveRenewRequestDto {
  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @ApiPropertyOptional({ example: 1700000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  agreedRentAmountRupiah?: number;

  @ApiPropertyOptional({ example: 'Disetujui, perpanjang 1 bulan' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
