import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AiService } from './ai.service';
import { BusinessNarrativeDto, ClassifyTextDto, PaymentProofAnalyzeDto, ReminderPersonalizeDto } from './dto/ai.dto';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('business-narrative')
  @ApiOperation({ summary: 'Generate narasi bisnis on-demand — OWNER/ADMIN' })
  async businessNarrative(@Body() dto: BusinessNarrativeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Narasi bisnis on-demand berhasil dibuat', data: this.aiService.businessNarrative(dto, user) };
  }

  @Post('payment-proof/analyze')
  @ApiOperation({ summary: 'Analisa bukti pembayaran dengan AI — OWNER/ADMIN' })
  async analyzePaymentProof(@Body() dto: PaymentProofAnalyzeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa bukti pembayaran berhasil dibuat', data: this.aiService.analyzePaymentProof(dto, user) };
  }

  @Post('reminders/personalize')
  @ApiOperation({ summary: 'Saran copy reminder personal — OWNER/ADMIN' })
  async personalizeReminder(@Body() dto: ReminderPersonalizeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Saran copy reminder berhasil dibuat', data: this.aiService.personalizeReminder(dto, user) };
  }

  @Post('classify-text')
  @ApiOperation({ summary: 'Klasifikasi teks dengan AI — OWNER/ADMIN' })
  async classifyText(@Body() dto: ClassifyTextDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Klasifikasi teks berhasil dibuat', data: this.aiService.classifyText(dto, user) };
  }
}
