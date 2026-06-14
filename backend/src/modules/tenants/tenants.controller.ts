import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { CreatePortalAccessDto } from './dto/create-portal-access.dto';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantsQueryDto } from './dto/tenants-query.dto';
import { TogglePortalAccessDto } from './dto/toggle-portal-access.dto';
import { ResetPortalPasswordDto } from './dto/reset-portal-password.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // F3-17: KTP disimpan terpisah dari foto kamar/tiket (data PDP sensitif).
  private readonly ktpUploadDir = join(process.cwd(), 'uploads', 'ktp-images');

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: TenantsQueryDto) {
    return { message: 'Daftar tenant berhasil diambil', data: await this.tenantsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail tenant berhasil diambil', data: await this.tenantsService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tenant berhasil dibuat', data: await this.tenantsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tenant berhasil diperbarui', data: await this.tenantsService.update(id, dto, user) };
  }

  @Patch(':id/portal-access/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async togglePortalAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TogglePortalAccessDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Status portal tenant berhasil diperbarui',
      data: await this.tenantsService.togglePortalAccess(id, dto, user),
    };
  }

  @Post(':id/portal-access')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createPortalAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePortalAccessDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Akun portal tenant berhasil dibuat',
      data: await this.tenantsService.createPortalAccess(id, dto, user),
    };
  }

  @Post(':id/portal-access/reset-password')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async resetPortalPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPortalPasswordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Password portal tenant berhasil diperbarui',
      data: await this.tenantsService.resetPortalPassword(id, dto, user),
    };
  }

  // ── F3-17: KTP upload + verifikasi + penyajian terproteksi + hapus PDP ───────

  @Post(':id/ktp/upload')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseGuards(RateLimitGuard)
  @RateLimit('imageUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'ktp-images');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, _file, cb) => {
          cb(null, `tmp_${Date.now()}_${randomBytes(8).toString('hex')}.bin`);
        },
      }),
      fileFilter: (_req, _file, cb) => cb(null, true),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  async uploadKtp(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Foto KTP wajib dipilih');
    const temporaryPath = join(this.ktpUploadDir, file.filename);
    const detectedMime = detectImageMime(temporaryPath);
    if (!detectedMime) {
      deleteFileSafe(temporaryPath);
      throw new BadRequestException('Foto KTP harus berupa JPG, PNG, atau WebP yang valid');
    }
    const secureName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    renameSync(temporaryPath, join(this.ktpUploadDir, secureName));

    const result = await this.tenantsService.setKtpImage(
      id,
      {
        fileKey: secureName,
        fileUrl: `/api/tenants/${id}/ktp/image`,
        originalFilename: file.originalname,
        mimeType: detectedMime,
        fileSizeBytes: file.size,
      },
      user,
    );
    // Hapus foto KTP lama bila ada (PDP: tak menyimpan berkas usang).
    if (result.previousFileKey) deleteFileSafe(join(this.ktpUploadDir, result.previousFileKey));
    return { message: 'Foto KTP berhasil diunggah; menunggu verifikasi OWNER', data: result.tenant };
  }

  @Post(':id/ktp/verify')
  @Roles(UserRole.OWNER)
  async verifyKtp(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'KTP tenant berhasil diverifikasi', data: await this.tenantsService.verifyKtp(id, user) };
  }

  @Get(':id/ktp/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getKtpImage(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileKey = await this.tenantsService.getKtpImageKey(id);
    const safe = basename(fileKey);
    if (safe !== fileKey || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(safe)) {
      throw new BadRequestException('Nama file KTP tidak valid');
    }
    const filePath = join(this.ktpUploadDir, safe);
    if (!existsSync(filePath)) throw new NotFoundException('Foto KTP tidak ditemukan');

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

  @Delete(':id/ktp')
  @Roles(UserRole.OWNER)
  async deleteKtp(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.tenantsService.clearKtp(id, user, 'MANUAL_OWNER_PDP_DELETE');
    if (result.previousFileKey) deleteFileSafe(join(this.ktpUploadDir, result.previousFileKey));
    return { message: 'Data KTP tenant berhasil dihapus (UU PDP)' };
  }

}
