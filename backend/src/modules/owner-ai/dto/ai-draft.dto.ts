import { IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/** G9: simpan hasil AI sebagai draft. resultJson HARUS sudah bersih (tanpa NIK penuh/foto mentah). */
export class SaveAiDraftDto {
  @IsString() @MaxLength(80) feature!: string;
  @IsOptional() @IsString() @MaxLength(80) targetType?: string;
  @IsOptional() @IsString() @MaxLength(80) targetId?: string;
  @IsString() @MaxLength(40) mode!: string;
  @IsOptional() @IsString() @MaxLength(80) model?: string;
  @IsOptional() @IsString() @MaxLength(128) snapshotHash?: string;
  @IsOptional() @IsString() @MaxLength(128) promptHash?: string;
  @IsOptional() @IsNumber() confidence?: number;
  @IsObject() resultJson!: Record<string, unknown>;
  @IsOptional() @IsObject() usageJson?: Record<string, unknown>;
}

export class ReviewAiDraftDto {
  @IsIn(['APPLIED', 'REJECTED']) decision!: 'APPLIED' | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(500) reviewNote?: string;
}

export class ListAiDraftQuery {
  @IsOptional() @IsString() feature?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
}
