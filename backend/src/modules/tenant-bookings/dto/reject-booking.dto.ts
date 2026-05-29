import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectBookingDto {
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reviewNotes!: string;
}
