import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCheckoutRequestDto {
  @ApiProperty({ example: 'Tunggu sampai kontrak habis ya' })
  @IsString()
  @MinLength(8, { message: 'Alasan penolakan wajib diisi minimal 8 karakter.' })
  reviewNotes: string;
}