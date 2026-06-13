import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmDownPaymentDto {
  @ApiPropertyOptional({ example: '2026-06-20T10:00:00.000Z', description: 'Waktu DP 30% diterima (default: sekarang). settlementDueDate = +7 hari.' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'DP 30% diterima via transfer BCA' })
  @IsOptional()
  @IsString()
  notes?: string;
}
