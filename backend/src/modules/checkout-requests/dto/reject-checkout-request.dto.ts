import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCheckoutRequestDto {
  @ApiProperty({ example: 'Tunggu sampai kontrak habis ya' })
  @IsString()
  reviewNotes: string;
}