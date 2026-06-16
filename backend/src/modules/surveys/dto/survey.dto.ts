import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Survei kepuasan penghuni (1..5 per aspek; rekomendasi & komentar opsional).
export class SubmitSurveyDto {
  @IsInt() @Min(1) @Max(5)
  overallRating!: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  cleanliness?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  staffService?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  facility?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  valueForMoney?: number;

  @IsOptional() @IsBoolean()
  wouldRecommend?: boolean;

  @IsOptional() @IsString() @MaxLength(1500)
  comment?: string;
}
