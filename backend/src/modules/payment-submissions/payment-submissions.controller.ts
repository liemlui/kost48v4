import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomBytes } from 'crypto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreatePaymentSubmissionDto } from './dto/create-payment-submission.dto';
import { BatchPaymentSubmissionDto } from './dto/batch-payment-submission.dto';
import { RejectPaymentSubmissionDto } from './dto/reject-payment-submission.dto';
import { ReviewQueueQueryDto } from './dto/review-queue-query.dto';
import { PaymentSubmissionsService } from './payment-submissions.service';
import { detectImageMime, deleteFileSafe } from '../../common/utils/file-signature.util';
import { PrismaService } from '../../prisma/prisma.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@ApiTags('payment-submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-submissions')
export class PaymentSubmissionsController {
  constructor(
    private readonly paymentSubmissionsService: PaymentSubmissionsService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly UPLOAD_DIR = join(process.cwd(), 'uploads', 'payment-proofs');

  private ensureUploadDir() {
    if (!existsSync(this.UPLOAD_DIR)) mkdirSync(this.UPLOAD_DIR, { recursive: true });
  }

  private generateSecureFilename(ext: string): string {
    const timestamp = Date.now();
    const rand = randomBytes(8).toString('hex');
    return `${timestamp}-${rand}${ext}`;
  }

  /**
   * Protected endpoint — stream payment proof images.
   * Only OWNER/ADMIN see all; TENANT sees only their own submission's proof.
   * STAFF is denied.
   */
  @Get('proofs/:filename')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TENANT)
  async getProof(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    // ── Filename sanitisation ──────────────────────────────────────────────
    const safe = basename(filename);
    // Reject path traversal indicators
    if (safe !== filename || /\.\.|\\|\/|\0|%00/i.test(filename)) {
      throw new BadRequestException('Nama file tidak valid');
    }
    // Allow only .jpg .jpeg .png .webp
    const allowedExt = /\.(jpg|jpeg|png|webp)$/i;
    if (!allowedExt.test(safe)) {
      throw new BadRequestException('Tipe file bukti bayar tidak didukung');
    }

    const filePath = join(this.UPLOAD_DIR, safe);
    if (!existsSync(filePath)) {
      throw new BadRequestException('File bukti bayar tidak ditemukan');
    }

    // ── Tenant access guard: only their own submission ─────────────────────
    if (user.role === UserRole.TENANT) {
      const tenantId = user.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Akun tenant tidak valid');
      }
      const owns = await this.paymentSubmissionsService.doesTenantOwnProof(tenantId, safe);
      if (!owns) {
        throw new BadRequestException('File bukti bayar tidak ditemukan');
      }
    }

    // ── Stream ─────────────────────────────────────────────────────────────
    const ext = extname(safe).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');

    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }


  private mapMultipartBodyToDto(body: Record<string, any>, file: any): CreatePaymentSubmissionDto {
    if (!file) throw new BadRequestException('File bukti bayar wajib dipilih');
    return {
      stayId: Number(body.stayId),
      invoiceId: Number(body.invoiceId),
      targetType: body.targetType ?? 'INVOICE',
      amountRupiah: Number(body.amountRupiah),
      paidAt: body.paidAt,
      paymentMethod: body.paymentMethod,
      senderName: body.senderName || undefined,
      senderBankName: body.senderBankName || undefined,
      referenceNumber: body.referenceNumber || undefined,
      notes: body.notes || undefined,
      fileKey: file.filename,
      fileUrl: `/api/payment-submissions/proofs/${file.filename}`,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    } as CreatePaymentSubmissionDto;
  }

  /** Manual class-validator check for multipart DTO (bypasses global ValidationPipe). */
  private async validateDto(dto: CreatePaymentSubmissionDto): Promise<string[]> {
    const instance = plainToInstance(CreatePaymentSubmissionDto, dto);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: false });
    const messages: string[] = [];
    for (const err of errors) {
      for (const constraint of Object.values(err.constraints ?? {})) {
        messages.push(constraint);
      }
    }
    return messages;
  }


  @Post('submit-with-proof')
  @Roles(UserRole.TENANT)
  @UseGuards(RateLimitGuard)
  @RateLimit('tenantUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'payment-proofs');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, _file, cb) => {
          // Temporary filename; will be renamed after magic-byte verification
          const tmp = `tmp_${Date.now()}_${randomBytes(4).toString('hex')}.bin`;
          cb(null, tmp);
        },
      }),
      fileFilter: (_req, _file, cb) => {
        // Accept all initially; we validate magic bytes after save
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async submitWithProof(
    @UploadedFile() file: any,
    @Body() body: Record<string, any>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File bukti pembayaran wajib diunggah');
    }
    // ── Magic-byte verification ────────────────────────────────────────────
    const filePath = join(this.UPLOAD_DIR, file.filename);
    const detectedMime = detectImageMime(filePath);
    if (!detectedMime) {
      deleteFileSafe(filePath);
      throw new BadRequestException('File bukti pembayaran harus berupa gambar JPG, PNG, atau WebP yang valid');
    }

    // ── Rename to secure filename ──────────────────────────────────────────
    const safeExt = extname(detectedMime === 'image/jpeg' ? 'x.jpg' : detectedMime === 'image/png' ? 'x.png' : 'x.webp');
    const secureName = this.generateSecureFilename(safeExt);
    const securePath = join(this.UPLOAD_DIR, secureName);
    renameSync(filePath, securePath);

    // Update file object for mapMultipartBodyToDto
    file.filename = secureName;
    file.originalname = file.originalname || 'proof';
    file.mimetype = detectedMime;

    // ── Manual DTO validation (multipart bypasses class-validator pipe) ────
    const dto = this.mapMultipartBodyToDto(body, file);
    const errors = await this.validateDto(dto);
    if (errors.length > 0) {
      deleteFileSafe(securePath);
      throw new BadRequestException(`Data pembayaran tidak valid: ${errors.join('; ')}`);
    }

    return {
      message: 'Pembayaran dan bukti berhasil dikirim dalam satu langkah. Admin akan memeriksa bukti pembayaran.',
      data: await this.paymentSubmissionsService.createSubmission(user, dto),
    };
  }

  @Post('upload-proof')
  @Roles(UserRole.TENANT)
  @UseGuards(RateLimitGuard)
  @RateLimit('tenantUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'payment-proofs');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, _file, cb) => {
          const tmp = `tmp_${Date.now()}_${randomBytes(4).toString('hex')}.bin`;
          cb(null, tmp);
        },
      }),
      fileFilter: (_req, _file, cb) => {
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadProof(@UploadedFile() file: any, @CurrentUser() user: CurrentUserPayload) {
    if (!file) throw new BadRequestException('File bukti bayar wajib dipilih');

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Akun tenant tidak valid');
    }

    const filePath = join(this.UPLOAD_DIR, file.filename);
    const detectedMime = detectImageMime(filePath);
    if (!detectedMime) {
      deleteFileSafe(filePath);
      throw new BadRequestException('File bukti pembayaran harus berupa gambar JPG, PNG, atau WebP yang valid');
    }

    const safeExt = extname(detectedMime === 'image/jpeg' ? 'x.jpg' : detectedMime === 'image/png' ? 'x.png' : 'x.webp');
    // Ownership built-in via tenantId prefix
    const secureName = `${tenantId}_${Date.now()}_${randomBytes(8).toString('hex')}${safeExt}`;
    const securePath = join(this.UPLOAD_DIR, secureName);
    renameSync(filePath, securePath);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'UPLOAD_PAYMENT_PROOF',
        entityType: 'PaymentProof',
        entityId: secureName,
        meta: {
          tenantId,
          fileKey: secureName,
          originalFilename: file.originalname,
          mimeType: detectedMime,
          fileSizeBytes: file.size,
        } as any,
      },
    });

    return {
      message: 'Bukti bayar berhasil diunggah',
      data: {
        fileKey: secureName,
        fileUrl: `/api/payment-submissions/proofs/${secureName}`,
        originalFilename: file.originalname,
        mimeType: detectedMime,
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

  /** M-4: Bayar sekaligus beberapa invoice (sewa + meter OPEN) milik stay yang sama. */
  @Post('batch')
  @Roles(UserRole.TENANT)
  async createBatch(@Body() dto: BatchPaymentSubmissionDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Bukti pembayaran batch berhasil dikirim dan menunggu review',
      data: await this.paymentSubmissionsService.createBatchSubmission(user, dto),
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
