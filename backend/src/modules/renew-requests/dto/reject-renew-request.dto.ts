import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRenewRequestDto {
  @ApiProperty({ example: 'Maaf, kamar sudah ada yang booking untuk bulan depan' })
  @IsString()
  reviewNotes: string;
}