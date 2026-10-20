import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectKtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
