import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { OwnerAiService } from './owner-ai.service';
import { ExpenseReceiptDraftDto, KtpOcrValidateDto } from './dto/owner-ai.dto';

@Controller('owner-ai')
export class OwnerAiController {
  constructor(private readonly ownerAiService: OwnerAiService) {}

  /** Status AI — OWNER/ADMIN bisa lihat. Tidak bocorkan API key. */
  @Get('status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  getStatus() {
    return this.ownerAiService.getStatus();
  }

  /** Brief AI — ringkasan eksekutif bisnis. OWNER only. */
  @Post('brief')
  @Roles(UserRole.OWNER)
  async generateBrief(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.generateBrief(user.id);
  }

  /** Finance analyst — OWNER only. */
  @Post('finance/analyze')
  @Roles(UserRole.OWNER)
  async analyzeFinance(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.analyzeFinance(user.id);
  }

  /** Expense receipt OCR draft. OCR text only; final save tetap endpoint /expenses. */
  @Post('expenses/receipt-draft')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async draftExpenseFromReceipt(@Body() dto: ExpenseReceiptDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.draftExpenseFromOcr(dto.ocrText, user.id);
  }

  /**
   * G5: validasi teks OCR KTP vs data tenant. OWNER/ADMIN.
   * PDP: hanya TEKS OCR (bukan gambar). Verifikasi final tetap tombol existing.
   */
  @Post('tenants/:id/ktp-ocr-validate')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async validateKtpOcr(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KtpOcrValidateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ownerAiService.validateKtpOcr(id, dto.ocrText, user.id);
  }
}
