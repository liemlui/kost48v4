import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateTenantStaffReviewDto } from './dto/tenant-staff-review.dto';
import { TenantStaffReviewsService } from './tenant-staff-reviews.service';

@ApiTags('tenant-staff-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant/staff-reviews')
export class TenantStaffReviewsController {
  constructor(private readonly service: TenantStaffReviewsService) {}

  @Get('eligible')
  @Roles(UserRole.TENANT)
  async eligible(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan staff yang bisa direview berhasil diambil', data: await this.service.eligible(user) };
  }

  @Post()
  @Roles(UserRole.TENANT)
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTenantStaffReviewDto) {
    return { message: 'Review staff berhasil dikirim', data: await this.service.create(user, dto) };
  }
}
