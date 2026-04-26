import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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


  @Post('upload-proof')
  @Roles(UserRole.TENANT)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'payment-proofs');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          const safeBase = (file.originalname || 'proof')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .slice(0, 60) || 'proof';
          cb(null, `${Date.now()}-${safeBase}${extname(file.originalname || '.jpg')}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Bukti bayar hanya menerima JPG, PNG, atau WebP'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadProof(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File bukti bayar wajib dipilih');
    return {
      message: 'Bukti bayar berhasil diunggah',
      data: {
        fileKey: file.filename,
        fileUrl: `/uploads/payment-proofs/${file.filename}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
    };
  }

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


  @Post('internal/expire-booking/:stayId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async expireBooking(
    @Param('stayId', ParseIntPipe) stayId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Booking reserved berhasil ditutup manual',
      data: await this.paymentSubmissionsService.expireBooking(stayId, user),
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
