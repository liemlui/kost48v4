import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePublicSurveyDto {
  @IsOptional() @IsIn(['inside', 'outside', 'any']) bathroom?: string;
  @IsOptional() @IsIn(['ac', 'fan', 'any']) cooling?: string;
  @IsOptional() @IsIn(['standard', 'large', 'any']) roomSize?: string;
  @IsOptional() @IsIn(['regular', 'mezzanine', 'any']) roomType?: string;
  @IsOptional() @IsString() @MaxLength(500) priorities?: string;
  @IsOptional() @IsInt() @Min(0) estimatedPriceRupiah?: number;
  @IsOptional() @IsBoolean() skipped?: boolean;
  @IsOptional() @IsString() @MaxLength(64) sessionId?: string;
}
