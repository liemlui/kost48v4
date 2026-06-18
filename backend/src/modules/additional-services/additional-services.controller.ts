import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AdditionalServicesService } from './additional-services.service';
import {
  AdditionalServicesQueryDto,
  CreateAdditionalServiceDto,
  CreateServiceInterestDto,
  ServiceInterestsQueryDto,
  UpdateAdditionalServiceDto,
  UpdateServiceInterestDto,
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

  // ── PUB-LAYANAN-MINAT (rute static SEBELUM :id agar tak tertangkap ParseIntPipe) ──
  @Get('interests')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async listInterests(@Query() query: ServiceInterestsQueryDto) {
    return { message: 'Daftar minat layanan', data: await this.service.listInterests(query) };
  }

  @Get('my-interests')
  @Roles(UserRole.TENANT)
  async listMyInterests(@CurrentUser() actor: CurrentUserPayload) {
    if (!actor.tenantId) return { message: 'Minat saya', data: { items: [] } };
    return { message: 'Minat saya', data: await this.service.listMyInterests(actor.tenantId) };
  }

  @Patch('interests/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateInterest(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceInterestDto) {
    return { message: 'Minat layanan diperbarui', data: await this.service.updateInterest(id, dto) };
  }

  @Post(':id/interest')
  @Roles(UserRole.TENANT)
  async createInterest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateServiceInterestDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    if (!actor.tenantId) {
      return { message: 'Akun tidak terhubung ke penghuni', data: null };
    }
    return { message: 'Minat dikirim ke pengelola', data: await this.service.createInterest(actor.tenantId, id, dto) };
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
