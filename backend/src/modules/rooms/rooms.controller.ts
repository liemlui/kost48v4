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
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail kamar berhasil diambil', data: await this.roomsService.findOne(id) };
  }


  @Post('upload-image')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'room-images');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          const safeBase = (file.originalname || 'room-image')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .slice(0, 60) || 'room-image';
          cb(null, `${Date.now()}-${safeBase}${extname(file.originalname || '.jpg')}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Galeri kamar hanya menerima JPG, PNG, atau WebP'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File gambar kamar wajib dipilih');
    return {
      message: 'Gambar kamar berhasil diunggah',
      data: {
        fileKey: file.filename,
        fileUrl: `/uploads/room-images/${file.filename}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
    };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Kamar berhasil dibuat', data: await this.roomsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Kamar berhasil diperbarui', data: await this.roomsService.update(id, dto, user) };
  }

  @Get(':roomId/facilities')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findFacilities(@Param('roomId', ParseIntPipe) roomId: number) {
    return { message: 'Daftar fasilitas kamar berhasil diambil', data: await this.roomsService.findFacilities(roomId) };
  }

  @Post(':roomId/facilities')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createFacility(@Param('roomId', ParseIntPipe) roomId: number, @Body() dto: CreateRoomFacilityDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Fasilitas kamar berhasil dibuat', data: await this.roomsService.createFacility(roomId, dto, user) };
  }

  @Patch(':roomId/facilities/:facilityId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateFacility(@Param('roomId', ParseIntPipe) roomId: number, @Param('facilityId', ParseIntPipe) facilityId: number, @Body() dto: UpdateRoomFacilityDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Fasilitas kamar berhasil diperbarui', data: await this.roomsService.updateFacility(roomId, facilityId, dto, user) };
  }

  @Delete(':roomId/facilities/:facilityId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deleteFacility(@Param('roomId', ParseIntPipe) roomId: number, @Param('facilityId', ParseIntPipe) facilityId: number, @CurrentUser() user: CurrentUserPayload) {
    await this.roomsService.deleteFacility(roomId, facilityId, user);
    return { message: 'Fasilitas kamar berhasil dihapus' };
  }
}
