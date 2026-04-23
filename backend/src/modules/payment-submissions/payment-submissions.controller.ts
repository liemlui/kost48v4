import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreatePaymentSubmissionDto } from './dto/create-payment-submission.dto';
import { RejectPaymentSubmissionDto } from './dto/reject-payment-submission.dto';
import { ReviewQueueQueryDto } from './dto/review-queue-query.dto';
import { PaymentSubmissionsService } from './payment-submissions.service';

@ApiTags('payment-submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-submissions')
export class PaymentSubmissionsController {
  constructor(private readonly paymentSubmissionsService: PaymentSubmissionsService) {}

  @Post()
  @Roles(UserRole.TENANT)
  async create(@Body() dto: CreatePaymentSubmissionDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Bukti pembayaran berhasil dikirim dan menunggu review',
      data: await this.paymentSubmissionsService.createSubmission(user, dto),
    };
  }

  @Get('my')
  @Roles(UserRole.TENANT)
  async mine(@CurrentUser() user: CurrentUserPayload, @Query() query: ReviewQueueQueryDto) {
    return {
      message: 'Riwayat bukti pembayaran saya berhasil diambil',
      data: await this.paymentSubmissionsService.findMine(user, query),
    };
  }

  @Get('review-queue')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reviewQueue(@Query() query: ReviewQueueQueryDto) {
    return {
      message: 'Queue review pembayaran berhasil diambil',
      data: await this.paymentSubmissionsService.findReviewQueue(query),
    };
  }

  @Post('internal/run-expiry-check')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runExpiryCheck(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Pengecekan booking kadaluarsa berhasil dijalankan',
      data: await this.paymentSubmissionsService.runExpiryCheck(user),
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Bukti pembayaran berhasil disetujui',
      data: await this.paymentSubmissionsService.approveSubmission(user, id),
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPaymentSubmissionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Bukti pembayaran berhasil ditolak',
      data: await this.paymentSubmissionsService.rejectSubmission(user, id, dto.reviewNotes),
    };
  }
}
