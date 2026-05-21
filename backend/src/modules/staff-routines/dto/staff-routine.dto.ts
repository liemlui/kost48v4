import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { StaffRoutineAreaType, StaffRoutineFrequency, StaffRoutineStatus } from '../../../common/enums/app.enums';

export class StaffRoutineTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama pekerjaan wajib diisi' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(StaffRoutineFrequency)
  frequency!: StaffRoutineFrequency;

  @IsOptional()
  @IsEnum(StaffRoutineAreaType)
  areaType?: StaffRoutineAreaType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresNote?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  staffUserId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;
}

export class CompleteRoutineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsEnum(StaffRoutineStatus)
  status?: StaffRoutineStatus;
}

export class StaffRoutineProgressQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  staffUserId?: number;
}
