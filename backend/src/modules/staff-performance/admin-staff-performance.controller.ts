import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateStaffWorkAuditDto, StaffPerformanceMonthQueryDto } from './dto/staff-performance.dto';
import { StaffPerformanceService } from './staff-performance.service';

@ApiTags('admin-staff-performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/staff-performance')
export class AdminStaffPerformanceController {
  constructor(private readonly service: StaffPerformanceService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Ringkasan kinerja staf bulanan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async monthly(@Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Ringkasan kinerja staf berhasil diambil', data: await this.service.getAdminMonthly(query.month) };
  }

  // F3-5: leaderboard antar-staf (dorman saat staf < 2 → active=false).
  @Get('leaderboard')
  @ApiOperation({ summary: 'Leaderboard kinerja staf — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async leaderboard(@Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Leaderboard kinerja staf', data: await this.service.getLeaderboard(query.month) };
  }

  @Get('audit-suggestions')
  @ApiOperation({ summary: 'Rekomendasi audit staf — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async auditSuggestions(@Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Rekomendasi audit staf berhasil diambil', data: await this.service.getAuditSuggestions(query.month) };
  }

  @Get(':staffId/monthly')
  @ApiOperation({ summary: 'Detail kinerja staf per staf — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async detail(@Param('staffId', ParseIntPipe) staffId: number, @Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Detail kinerja staf berhasil diambil', data: await this.service.getStaffMonthly(staffId, query.month) };
  }

  @Post('audits')
  @ApiOperation({ summary: 'Buat audit pekerjaan staf — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createAudit(@Body() dto: CreateStaffWorkAuditDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Audit pekerjaan staf berhasil disimpan', data: await this.service.createAudit(dto, user) };
  }
}
