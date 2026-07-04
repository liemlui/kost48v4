import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { OwnerAiService } from './owner-ai.service';
import { ExpenseReceiptDraftDto, KtpOcrValidateDto } from './dto/owner-ai.dto';

@ApiTags('owner-ai')
@ApiBearerAuth()
@Controller('owner-ai')
export class OwnerAiController {
  constructor(private readonly ownerAiService: OwnerAiService) {}

  /** Status AI — OWNER/ADMIN bisa lihat. Tidak bocorkan API key. */
  @Get('status')
  @ApiOperation({ summary: 'Status konfigurasi AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  getStatus() {
    return this.ownerAiService.getStatus();
  }

  /** Brief AI — ringkasan eksekutif bisnis. OWNER only. */
  @Post('brief')
  @ApiOperation({ summary: 'Generate ringkasan eksekutif bisnis — OWNER-only' })
  @Roles(UserRole.OWNER)
  async generateBrief(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.generateBrief(user.id);
  }

  /** Finance analyst — OWNER only. */
  @Post('finance/analyze')
  @ApiOperation({ summary: 'Analisa keuangan dengan AI — OWNER-only' })
  @Roles(UserRole.OWNER)
  async analyzeFinance(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.analyzeFinance(user.id);
  }

  /** Expense receipt OCR draft. OCR text only; final save tetap endpoint /expenses. */
  @Post('expenses/receipt-draft')
  @ApiOperation({ summary: 'Draft expense dari OCR receipt — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async draftExpenseFromReceipt(@Body() dto: ExpenseReceiptDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.draftExpenseFromOcr(dto.ocrText, user.id);
  }

  /**
   * G5: validasi teks OCR KTP vs data tenant. OWNER/ADMIN.
   * PDP: hanya TEKS OCR (bukan gambar). Verifikasi final tetap tombol existing.
   */
  @Post('tenants/:id/ktp-ocr-validate')
  @ApiOperation({ summary: 'Validasi teks OCR KTP vs data tenant — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async validateKtpOcr(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KtpOcrValidateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ownerAiService.validateKtpOcr(id, dto.ocrText, user.id);
  }

  /** G6: draft saran aksi tiket. Tidak assign/close/create expense otomatis. */
  @Post('tickets/:id/action-draft')
  @ApiOperation({ summary: 'Draft saran aksi tiket — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async draftTicketAction(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ownerAiService.draftTicketAction(id, user.id);
  }

  /** G6: draft reorder stok. Tidak membuat pembelian atau mutasi otomatis. */
  @Post('inventory/reorder-draft')
  @ApiOperation({ summary: 'Draft reorder stok inventory — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async draftInventoryReorder(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.draftReorder(user.id);
  }

  /** G6: draft review laporan lapangan. Keputusan final tetap endpoint admin-review. */
  @Post('staff-field-reports/:id/review-draft')
  @ApiOperation({ summary: 'Draft review laporan lapangan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reviewFieldReport(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ownerAiService.reviewFieldReport(id, user.id);
  }

  /** G3: review pembayaran dengan AI. No-partial dicek deterministic SEBELUM AI. */
  @Post("payment-submissions/:id/review-draft")
  @ApiOperation({ summary: 'Review pembayaran dengan AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reviewPaymentSubmission(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ownerAiService.reviewPaymentSubmission(id, user.id);
  }

  /** G7: observability biaya AI (usage hari ini + audit AI). OWNER only. */
  @Get('usage')
  @ApiOperation({ summary: 'Observability biaya AI — OWNER-only' })
  @Roles(UserRole.OWNER)
  async usage() {
    return this.ownerAiService.getUsageOverview();
  }

  /** G7: tes koneksi DeepSeek. OWNER only. Tidak bocorkan API key. */
  @Post('test-connection')
  @ApiOperation({ summary: 'Tes koneksi DeepSeek — OWNER-only' })
  @Roles(UserRole.OWNER)
  async testConnection(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.testConnection(user.id);
  }

  /** G8: generate draft FAQ dari aturan bisnis + layanan aktif. OWNER only. */
  @Post("faqs/generate-draft")
  @ApiOperation({ summary: 'Generate draft FAQ dari aturan bisnis — OWNER-only' })
  @Roles(UserRole.OWNER)
  async generateFaqDraft(@CurrentUser() user: CurrentUserPayload) {
    return this.ownerAiService.generateFaqDraft(user.id);
  }
}
