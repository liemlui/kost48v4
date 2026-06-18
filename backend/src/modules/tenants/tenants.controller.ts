import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Logger, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { copyFileSync, createReadStream, existsSync, mkdirSync, renameSync } from 'fs';
import { basename, extname, join } from 'path';
import { diskStorage } from 'multer';
import { ProfilePhotoSource } from '../../generated/prisma';
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
  private readonly logger = new Logger(TenantsController.name);

  // F3-17: KTP disimpan terpisah dari foto kamar/tiket (data PDP sensitif).
  private readonly ktpUploadDir = join(process.cwd(), 'uploads', 'ktp-images');
  // PUB-FOTO-PROFIL-KTP: avatar disimpan terpisah dari KTP agar avatar MANUAL bertahan
  // walau KTP dihapus, dan agar penyajiannya bisa diakses tenant sendiri (KTP tidak).
  private readonly profilePhotoUploadDir = join(process.cwd(), 'uploads', 'profile-photos');

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: TenantsQueryDto) {
    return { message: 'Daftar tenant berhasil diambil', data: await this.tenantsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail tenant berhasil diambil', data: await this.tenantsService.findOne(id, user) };
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

    // PUB-FOTO-PROFIL-KTP (keputusan owner M02): foto KTP pertama otomatis jadi avatar.
    // Disalin ke direktori avatar terpisah agar tetap ada bila KTP diganti/dihapus selektif.
    let responseTenant = result.tenant;
    let avatarWarning: string | null = null;
    if (!result.hadProfilePhoto) {
      try {
        if (!existsSync(this.profilePhotoUploadDir)) mkdirSync(this.profilePhotoUploadDir, { recursive: true });
        const avatarName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
        copyFileSync(join(this.ktpUploadDir, secureName), join(this.profilePhotoUploadDir, avatarName));
        const profileResult = await this.tenantsService.setProfilePhoto(
          id,
          {
            fileKey: avatarName,
            fileUrl: `/api/tenants/${id}/profile-photo/image`,
            mimeType: detectedMime,
            fileSizeBytes: file.size,
          },
          ProfilePhotoSource.KTP_AUTO,
          user,
        );
        responseTenant = profileResult.tenant;
      } catch (error) {
        this.logger.error(
          `Gagal membuat avatar otomatis tenant #${id} dari foto KTP`,
          error instanceof Error ? error.stack : String(error),
        );
        avatarWarning = 'Foto KTP berhasil diunggah, tetapi avatar otomatis gagal dibuat. Gunakan tombol Ganti Foto Profil.';
      }
    }
    return {
      message: avatarWarning ?? 'Foto KTP berhasil diunggah; menunggu verifikasi OWNER',
      data: responseTenant,
      warning: avatarWarning ?? undefined,
    };
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
    // Avatar turunan KTP (KTP_AUTO) ikut terhapus saat KTP dihapus (UU PDP).
    if (result.previousProfilePhotoFileKey) deleteFileSafe(join(this.profilePhotoUploadDir, result.previousProfilePhotoFileKey));
    return { message: 'Data KTP tenant berhasil dihapus (UU PDP)' };
  }

  // ── PUB-FOTO-PROFIL-KTP: avatar tenant (owner/admin ganti, disajikan terproteksi) ──

  @Post(':id/profile-photo/upload')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseGuards(RateLimitGuard)
  @RateLimit('imageUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'profile-photos');
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
  async uploadProfilePhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Foto profil wajib dipilih');
    const temporaryPath = join(this.profilePhotoUploadDir, file.filename);
    const detectedMime = detectImageMime(temporaryPath);
    if (!detectedMime) {
      deleteFileSafe(temporaryPath);
      throw new BadRequestException('Foto profil harus berupa JPG, PNG, atau WebP yang valid');
    }
    const secureName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    renameSync(temporaryPath, join(this.profilePhotoUploadDir, secureName));

    const result = await this.tenantsService.setProfilePhoto(
      id,
      {
        fileKey: secureName,
        fileUrl: `/api/tenants/${id}/profile-photo/image`,
        mimeType: detectedMime,
        fileSizeBytes: file.size,
      },
      ProfilePhotoSource.MANUAL,
      user,
    );
    if (result.previousFileKey) deleteFileSafe(join(this.profilePhotoUploadDir, result.previousFileKey));
    return { message: 'Foto profil tenant berhasil diperbarui', data: result.tenant };
  }

  @Get(':id/profile-photo/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TENANT)
  async getProfilePhoto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Tenant hanya boleh melihat avatarnya sendiri (avatar bisa turunan KTP — jangan bocor lintas tenant).
    if (user.role === UserRole.TENANT && user.tenantId !== id) {
      throw new ForbiddenException('Tidak boleh mengakses foto profil tenant lain');
    }
    const fileKey = await this.tenantsService.getProfilePhotoKey(id);
    const safe = basename(fileKey);
    if (safe !== fileKey || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(safe)) {
      throw new BadRequestException('Nama file foto profil tidak valid');
    }
    const filePath = join(this.profilePhotoUploadDir, safe);
    if (!existsSync(filePath)) throw new NotFoundException('Foto profil tidak ditemukan');

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

  @Delete(':id/profile-photo')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deleteProfilePhoto(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.tenantsService.clearProfilePhoto(id, user);
    if (result.previousFileKey) deleteFileSafe(join(this.profilePhotoUploadDir, result.previousFileKey));
    return { message: 'Foto profil tenant berhasil dihapus' };
  }

}
