import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
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

}
