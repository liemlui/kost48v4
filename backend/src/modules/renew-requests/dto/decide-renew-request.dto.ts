import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DecideRenewRequestDto {
  @ApiProperty({ enum: ['YA', 'TIDAK'], example: 'YA', description: 'YA = perpanjang (lanjut DP); TIDAK = tidak perpanjang (kamar dibuka)' })
  @IsIn(['YA', 'TIDAK'])
  decision!: 'YA' | 'TIDAK';

  @ApiPropertyOptional({ example: 'Saya lanjut 1 bulan lagi' })
  @IsOptional()
  @IsString()
  notes?: string;
}
