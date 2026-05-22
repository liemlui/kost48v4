import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { StaffPerformanceMonthQueryDto } from './dto/staff-performance.dto';
import { StaffPerformanceService } from './staff-performance.service';

@ApiTags('staff-performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff-performance')
export class StaffPerformanceController {
  constructor(private readonly service: StaffPerformanceService) {}

  @Get('me/monthly')
  @Roles(UserRole.STAFF)
  async myMonthly(@CurrentUser() user: CurrentUserPayload, @Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Laporan kinerja staf berhasil diambil', data: await this.service.getMyMonthly(user, query.month) };
  }

  @Get('me/evidence')
  @Roles(UserRole.STAFF)
  async myEvidence(@CurrentUser() user: CurrentUserPayload, @Query() query: StaffPerformanceMonthQueryDto) {
    return { message: 'Bukti kerja staf berhasil diambil', data: await this.service.getStaffEvidence(user.id, query.month) };
  }
}
