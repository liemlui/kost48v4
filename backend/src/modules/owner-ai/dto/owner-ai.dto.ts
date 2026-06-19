import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/** G5: validasi teks OCR KTP. Hanya TEKS — tidak pernah gambar (UU PDP). */
export class KtpOcrValidateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12000)
  ocrText!: string;
}

export class AiStatusResponse {
  configured: boolean;
  enabled: boolean;
  defaultModel: string;
  financeModel: string;
  manualOnly: boolean;
  ownerAdminOnly: boolean;
  dailyLimit: number;
  dailyRemaining: number;
  logUsage: boolean;
}

export class ExpenseReceiptDraftDto {
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  ocrText!: string;
}
