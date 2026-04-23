import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPaymentSubmissionDto {
  @IsString()
  @IsNotEmpty()
  reviewNotes!: string;
}
