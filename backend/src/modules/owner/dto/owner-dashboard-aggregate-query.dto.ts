import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OwnerDashboardAggregateQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100)
  year?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  month?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24)
  trendMonths?: number;
}
