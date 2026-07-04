import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateTenantStaffReviewDto, VerifyStaffReviewDto } from './dto/tenant-staff-review.dto';
import { TenantStaffReviewsService } from './tenant-staff-reviews.service';

@ApiTags('tenant-staff-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant/staff-reviews')
export class TenantStaffReviewsController {
  constructor(private readonly service: TenantStaffReviewsService) {}

  @Get('eligible')
  @ApiOperation({ summary: 'Pekerjaan staf yang bisa direview — TENANT' })
  @Roles(UserRole.TENANT)
  async eligible(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan staff yang bisa direview berhasil diambil', data: await this.service.eligible(user) };
  }

  @Post()
  @ApiOperation({ summary: 'Kirim review staf — TENANT' })
  @Roles(UserRole.TENANT)
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTenantStaffReviewDto) {
    return { message: 'Review staff berhasil dikirim', data: await this.service.create(user, dto) };
  }

  // F2-18: verifikasi owner atas review ≤2 yang menunggu (gate KPI staf).
  @Get('pending-verification')
  @ApiOperation({ summary: 'Review staf menunggu verifikasi — OWNER-only' })
  @Roles(UserRole.OWNER)
  async pendingVerification() {
    return { message: 'Review menunggu verifikasi berhasil diambil', data: await this.service.listPendingVerification() };
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verifikasi review staf — OWNER-only' })
  @Roles(UserRole.OWNER)
  async verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyStaffReviewDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Review berhasil diverifikasi', data: await this.service.verify(id, dto.decision, user) };
  }
}
