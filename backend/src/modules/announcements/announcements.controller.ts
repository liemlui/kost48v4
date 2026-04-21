import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';
import { AnnouncementsQueryDto } from './dto/announcements-query.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
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
