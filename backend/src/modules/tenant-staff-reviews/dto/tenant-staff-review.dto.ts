import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// F2-18: keputusan owner atas review ≤2 yang menunggu verifikasi.
export class VerifyStaffReviewDto {
  @IsIn(['APPROVE', 'DISMISS'])
  decision!: 'APPROVE' | 'DISMISS';
}

export class CreateTenantStaffReviewDto {
  @IsInt()
  ticketId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  comment?: string;
}
