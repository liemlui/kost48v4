import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class BusinessNarrativeDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  signals?: unknown[];
}

export class PaymentProofAnalyzeDto {
  @IsOptional()
  @IsInt()
  submissionId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedAmountRupiah?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  submittedAmountRupiah?: number;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderBankName?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReminderPersonalizeDto {
  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class ClassifyTextDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxLabels?: number;
}
