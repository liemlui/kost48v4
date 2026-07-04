import { IsOptional, IsString } from 'class-validator';

export class RejectPaymentSubmissionDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
