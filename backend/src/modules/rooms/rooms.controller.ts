import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { randomBytes } from 'crypto';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { deleteFileSafe, detectImageMime, MIME_TO_EXT } from '../../common/utils/file-signature.util';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CreateRoomFacilityDto, UpdateRoomFacilityDto } from './dto/room-facility.dto';
import { RoomsQueryDto } from './dto/rooms-query.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: RoomsQueryDto) {
    return { message: 'Daftar kamar berhasil diambil', data: await this.roomsService.findAll(query) };
  }

  // Monitoring AC + jadwal cuci (deklarasi SEBELUM ':id' agar tidak ketangkap ParseIntPipe).
  @Get('ac-maintenance')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async acMaintenance() {
    return { message: 'Status cuci AC berhasil diambil', data: await this.roomsService.getAcMaintenanceOverview() };
  }

  @Patch(':id/ac-clean')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async recordAcCleaning(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Cuci AC berhasil dicatat', data: await this.roomsService.recordAcCleaning(id, actor) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail kamar berhasil diambil', data: await this.roomsService.findOne(id) };
  }


  // F2-16 (D-17): unggah gambar = bagian setelan kamar — OWNER-only.
  @Post('upload-image')
  @Roles(UserRole.OWNER)
  @UseGuards(RateLimitGuard)
  @RateLimit('imageUpload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'room-images');
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
    if (!file) throw new BadRequestException('File gambar kamar wajib dipilih');

    const uploadDir = join(process.cwd(), 'uploads', 'room-images');
    const temporaryPath = join(uploadDir, file.filename);
    const detectedMime = detectImageMime(temporaryPath);
    if (!detectedMime) {
      deleteFileSafe(temporaryPath);
      throw new BadRequestException('Galeri kamar hanya menerima JPG, PNG, atau WebP yang valid');
    }

    const secureName = `${Date.now()}-${randomBytes(16).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    renameSync(temporaryPath, join(uploadDir, secureName));

    return {
      message: 'Gambar kamar berhasil diunggah',
      data: {
        fileKey: secureName,
        fileUrl: `/uploads/room-images/${secureName}`,
        originalFilename: file.originalname,
        mimeType: detectedMime,
        fileSizeBytes: file.size,
      },
    };
  }

  // F2-16 (D-17): setelan kamar & harga (rent/deposit/tarif) — OWNER-only.
  @Post()
  @Roles(UserRole.OWNER)
  async create(@Body() dto: CreateRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Kamar berhasil dibuat', data: await this.roomsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Kamar berhasil diperbarui', data: await this.roomsService.update(id, dto, user) };
  }

  @Get(':roomId/facilities')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findFacilities(@Param('roomId', ParseIntPipe) roomId: number) {
    return { message: 'Daftar fasilitas kamar berhasil diambil', data: await this.roomsService.findFacilities(roomId) };
  }

  // F2-16 (D-17): fasilitas = bagian setelan kamar — OWNER-only.
  @Post(':roomId/facilities')
  @Roles(UserRole.OWNER)
  async createFacility(@Param('roomId', ParseIntPipe) roomId: number, @Body() dto: CreateRoomFacilityDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Fasilitas kamar berhasil dibuat', data: await this.roomsService.createFacility(roomId, dto, user) };
  }

  @Patch(':roomId/facilities/:facilityId')
  @Roles(UserRole.OWNER)
  async updateFacility(@Param('roomId', ParseIntPipe) roomId: number, @Param('facilityId', ParseIntPipe) facilityId: number, @Body() dto: UpdateRoomFacilityDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Fasilitas kamar berhasil diperbarui', data: await this.roomsService.updateFacility(roomId, facilityId, dto, user) };
  }

  @Delete(':roomId/facilities/:facilityId')
  @Roles(UserRole.OWNER)
  async deleteFacility(@Param('roomId', ParseIntPipe) roomId: number, @Param('facilityId', ParseIntPipe) facilityId: number, @CurrentUser() user: CurrentUserPayload) {
    await this.roomsService.deleteFacility(roomId, facilityId, user);
    return { message: 'Fasilitas kamar berhasil dihapus' };
  }
}
