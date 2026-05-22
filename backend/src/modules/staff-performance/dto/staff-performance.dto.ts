import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { StaffAuditResult, StaffWorkSourceType } from '../../../common/enums/app.enums';

export class StaffPerformanceMonthQueryDto {
  @IsOptional()
  @IsString()
  month?: string;
}

export class CreateStaffWorkAuditDto {
  @IsInt()
  staffId!: number;

  @IsEnum(StaffWorkSourceType)
  sourceType!: StaffWorkSourceType;

  @IsOptional()
  @IsInt()
  sourceId?: number;

  @IsEnum(StaffAuditResult)
  result!: StaffAuditResult;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  notes?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
