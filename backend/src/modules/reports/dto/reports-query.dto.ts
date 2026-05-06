import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class MonthlyIncomeQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;
}

export class OverdueAgingQueryDto {
  @IsDateString()
  @IsOptional()
  asOf?: string;
}

export class ExpenseSummaryQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;
}

export class CashFlowQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;
}

export class OccupancyQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;
}
