import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class PeriodCloseQueryDto {
  @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
}

export class PeriodClosePayloadDto {
  @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsOptional() @IsString() notes?: string;
}

export class PeriodReopenPayloadDto {
  @Type(() => Number) @IsInt() @Min(2020) @Max(2100) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsString() @MinLength(8) reason!: string;
}
