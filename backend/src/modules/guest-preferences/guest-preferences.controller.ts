import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GuestPreferencesService } from './guest-preferences.service';

@ApiTags('guest-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guest-preferences')
export class GuestPreferencesController {
  constructor(private readonly service: GuestPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar survei preferensi tamu (wizard publik) — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Halaman (default 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Baris per halaman (default 50, max 100)' })
  @ApiQuery({ name: 'skipped', required: false, type: Boolean, description: 'Filter skipped (true/false)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter tanggal mulai (ISO)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter tanggal akhir (ISO)' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('skipped') skipped?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      skipped: skipped !== undefined ? skipped === 'true' : undefined,
      dateFrom,
      dateTo,
    });
    return { message: 'Data preferensi tamu berhasil diambil', data };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistik agregat survei preferensi tamu — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getStats() {
    const data = await this.service.getStats();
    return { message: 'Statistik preferensi tamu berhasil diambil', data };
  }
}
