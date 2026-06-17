import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdditionalServicesService } from './additional-services.service';
import {
  AdditionalServicesQueryDto,
  CreateAdditionalServiceDto,
  UpdateAdditionalServiceDto,
} from './dto/additional-service.dto';

// PUB-LAYANAN-TAMBAHAN: kelola layanan tambahan (OWNER-only mutasi, selaras D-17);
// daftar aktif dibaca semua role (tenant melihat di portal).
@ApiTags('additional-services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('additional-services')
export class AdditionalServicesController {
  constructor(private readonly service: AdditionalServicesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll(@Query() query: AdditionalServicesQueryDto) {
    return { message: 'Daftar layanan tambahan', data: await this.service.findAll(query) };
  }

  @Get('active')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async listActive() {
    return { message: 'Layanan tambahan aktif', data: await this.service.listActive() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail layanan tambahan', data: await this.service.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER)
  async create(@Body() dto: CreateAdditionalServiceDto) {
    return { message: 'Layanan tambahan dibuat', data: await this.service.create(dto) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdditionalServiceDto) {
    return { message: 'Layanan tambahan diperbarui', data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Layanan tambahan dihapus', data: await this.service.remove(id) };
  }
}
