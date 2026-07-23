import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync, renameSync } from 'fs';
import { basename, extname, join } from 'path';
import { diskStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  deleteFileSafe,
  detectImageMime,
  MIME_TO_EXT,
} from '../../common/utils/file-signature.util';
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  MarkTicketVendorDto,
  ResolutionDto,
  TipConfirmDto,
} from './dto/ticket.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'ticket-images');

  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar tiket — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: TicketsQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Daftar tiket berhasil diambil', data: await this.ticketsService.findAll(query, user) };
  }

  @Get('my')
  @ApiOperation({ summary: 'Daftar tiket saya — TENANT' })
  @Roles(UserRole.TENANT)
  async findMine(@CurrentUser() user: CurrentUserPayload, @Query() query: TicketsQueryDto) {
    return { message: 'Daftar tiket saya berhasil diambil', data: await this.ticketsService.findMine(user, query) };
  }

  // T-1: penghuni menandai sudah memberi tip ke staf (P2P, dihitung — bukan nominal).
  @Post(':id/tip-acknowledge')
  @ApiOperation({ summary: 'Akui tip ke staf — TENANT' })
  @Roles(UserRole.TENANT)
  async acknowledgeTip(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Terima kasih, tip dicatat', data: await this.ticketsService.acknowledgeTip(id, user) };
  }

  // STF-TIP-FLOW: staff konfirmasi apakah tip sudah masuk (P2P, di luar pembukuan).
  @Post(':id/tip-confirm')
  @ApiOperation({ summary: 'Konfirmasi penerimaan tip — STAFF' })
  @Roles(UserRole.STAFF)
  async confirmTip(@Param('id', ParseIntPipe) id: number, @Body() dto: TipConfirmDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: dto.received ? 'Tip dikonfirmasi sudah diterima' : 'Tip ditandai belum masuk',
      data: await this.ticketsService.confirmTip(id, Number(user.id), dto.received),
    };
  }

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload foto tiket — semua role' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  @UseGuards(RateLimitGuard)
  @RateLimit('imageUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const targetDir = join(process.cwd(), 'uploads', 'ticket-images');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req: any, _file: any, cb: any) => {
          cb(null, `tmp_${Date.now()}_${randomBytes(8).toString('hex')}.bin`);
        },
      }),
      fileFilter: (_req: any, _file: any, cb: any) => cb(null, true),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Foto tiket wajib dipilih');

    const temporaryPath = join(this.uploadDir, file.filename);
    const detectedMime = detectImageMime(temporaryPath);
    if (!detectedMime) {
      deleteFileSafe(temporaryPath);
      throw new BadRequestException('Foto tiket harus berupa JPG, PNG, atau WebP yang valid');
    }

    const secureName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    renameSync(temporaryPath, join(this.uploadDir, secureName));

    return {
      message: 'Foto tiket berhasil diunggah',
      data: {
        fileKey: secureName,
        fileUrl: `/api/tickets/images/${secureName}`,
        originalFilename: file.originalname,
        mimeType: detectedMime,
        fileSizeBytes: file.size,
      },
    };
  }

  @Get('images/:filename')
  @ApiOperation({ summary: 'Ambil foto tiket — semua role' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async getImage(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const safe = basename(filename);
    if (
      safe !== filename
      || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(safe)
    ) {
      throw new BadRequestException('Nama file foto tidak valid');
    }

    const filePath = join(this.uploadDir, safe);
    if (!existsSync(filePath) || !(await this.ticketsService.canAccessImage(safe, user))) {
      throw new NotFoundException('Foto tiket tidak ditemukan');
    }

    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeMap[extname(safe).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    return new StreamableFile(createReadStream(filePath));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail tiket — semua role' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail tiket berhasil diambil', data: await this.ticketsService.findOne(id, user) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat tiket backoffice — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateBackofficeTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createBackoffice(dto, user) };
  }

  @Post('portal')
  @ApiOperation({ summary: 'Buat tiket dari portal tenant — TENANT' })
  @Roles(UserRole.TENANT)
  async createPortal(@Body() dto: CreatePortalTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createPortal(dto, user) };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign tiket ke staf — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil di-assign', data: await this.ticketsService.assign(id, dto, user) };
  }

  // F5-3 (AUD-5): tandai tiket (mis. cuci AC) dikerjakan vendor luar / lepas penanda vendor.
  @Post(':id/vendor')
  @ApiOperation({ summary: 'Tandai tiket vendor luar — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async markVendor(@Param('id', ParseIntPipe) id: number, @Body() dto: MarkTicketVendorDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: dto.handledByVendor ? 'Tiket ditandai dikerjakan vendor luar' : 'Penanda vendor dilepas', data: await this.ticketsService.markVendor(id, dto, user) };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Mulai proses tiket — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil diproses', data: await this.ticketsService.start(id, user) };
  }

  @Post(':id/mark-done')
  @ApiOperation({ summary: 'Tandai tiket selesai — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async markDone(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolutionDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil ditandai selesai', data: await this.ticketsService.markDone(id, dto, user) };
  }

  // F2-18: STAFF boleh tutup CHECKOUT_INSPECTION; TENANT boleh tutup tiket mereka yang DONE.
  // Guard keselamatan tetap di service close().
  @Post(':id/close')
  @ApiOperation({ summary: 'Tutup tiket — OWNER/ADMIN/STAFF/TENANT' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status tiket berhasil diperbarui', data: await this.ticketsService.close(id, dto, user) };
  }
}
