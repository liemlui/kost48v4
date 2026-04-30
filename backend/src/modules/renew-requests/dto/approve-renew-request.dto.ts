import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveRenewRequestDto {
  @ApiPropertyOptional({ example: 'Disetujui, perpanjang 1 bulan' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}