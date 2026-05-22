import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AdminReviewStaffFieldReportDto, CreateStaffFieldReportDto, StaffFieldReportsQueryDto } from './dto/staff-field-report.dto';
import { StaffFieldReportsService } from './staff-field-reports.service';

@ApiTags('staff-field-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff-field-reports')
export class StaffFieldReportsController {
  constructor(private readonly service: StaffFieldReportsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateStaffFieldReportDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Laporan kondisi diterima dan menunggu konfirmasi admin', data: await this.service.create(dto, user) };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: StaffFieldReportsQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Daftar laporan kondisi berhasil diambil', data: await this.service.findAll(query, user) };
  }

  @Get('review-queue')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reviewQueue() {
    return { message: 'Queue review laporan kondisi berhasil diambil', data: await this.service.reviewQueue() };
  }

  @Patch(':id/admin-review')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async adminReview(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminReviewStaffFieldReportDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Review laporan kondisi berhasil disimpan', data: await this.service.adminReview(id, dto, user) };
  }
}
