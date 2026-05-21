import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  async businessNarrative(@Body() dto: BusinessNarrativeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Narasi bisnis on-demand berhasil dibuat', data: this.aiService.businessNarrative(dto, user) };
  }

  @Post('payment-proof/analyze')
  async analyzePaymentProof(@Body() dto: PaymentProofAnalyzeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa bukti pembayaran berhasil dibuat', data: this.aiService.analyzePaymentProof(dto, user) };
  }

  @Post('reminders/personalize')
  async personalizeReminder(@Body() dto: ReminderPersonalizeDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Saran copy reminder berhasil dibuat', data: this.aiService.personalizeReminder(dto, user) };
  }

  @Post('classify-text')
  async classifyText(@Body() dto: ClassifyTextDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Klasifikasi teks berhasil dibuat', data: this.aiService.classifyText(dto, user) };
  }
}
