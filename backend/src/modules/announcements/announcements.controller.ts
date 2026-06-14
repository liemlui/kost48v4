import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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
import { deleteFileSafe, detectImageMime, MIME_TO_EXT } from '../../common/utils/file-signature.util';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { AnnouncementsQueryDto } from './dto/announcements-query.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'announcement-images');

  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: AnnouncementsQueryDto) {
    return { message: 'Daftar pengumuman berhasil diambil', data: await this.announcementsService.findAll(query) };
  }

  @Get('active')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findActive(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pengumuman aktif berhasil diambil', data: await this.announcementsService.findActive(user) };
  }

  @Post('upload-image')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseGuards(RateLimitGuard)
  @RateLimit('imageUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'announcement-images');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, _file, cb) => {
          cb(null, `tmp_${Date.now()}_${randomBytes(8).toString('hex')}.bin`);
        },
      }),
      fileFilter: (_req, _file, cb) => cb(null, true),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Gambar pengumuman wajib dipilih');

    const temporaryPath = join(this.uploadDir, file.filename);
    const detectedMime = detectImageMime(temporaryPath);
    if (!detectedMime) {
      deleteFileSafe(temporaryPath);
      throw new BadRequestException('Gambar pengumuman harus berupa JPG, PNG, atau WebP yang valid');
    }

    const secureName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    renameSync(temporaryPath, join(this.uploadDir, secureName));

    return {
      message: 'Gambar pengumuman berhasil diunggah',
      data: {
        fileKey: secureName,
        fileUrl: `/api/announcements/images/${secureName}`,
        originalFilename: file.originalname,
        mimeType: detectedMime,
        fileSizeBytes: file.size,
      },
    };
  }

  @Get('images/:filename')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async getImage(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const safe = basename(filename);
    if (safe !== filename || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(safe)) {
      throw new BadRequestException('Nama file gambar tidak valid');
    }

    const filePath = join(this.uploadDir, safe);
    if (!existsSync(filePath) || !(await this.announcementsService.canAccessImage(safe, user))) {
      throw new NotFoundException('Gambar pengumuman tidak ditemukan');
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
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail pengumuman berhasil diambil', data: await this.announcementsService.findOne(id, user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pengumuman berhasil dibuat', data: await this.announcementsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAnnouncementDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pengumuman berhasil diperbarui', data: await this.announcementsService.update(id, dto, user) };
  }

  @Post(':id/publish')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pengumuman berhasil dipublikasikan', data: await this.announcementsService.publish(id, user) };
  }
}
