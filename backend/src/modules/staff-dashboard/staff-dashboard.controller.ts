import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { StaffDashboardService } from './staff-dashboard.service';

@ApiTags('staff-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff/dashboard')
export class StaffDashboardController {
  constructor(private readonly service: StaffDashboardService) {}

  @Get('aggregate')
  @ApiOperation({ summary: 'Agregat data dashboard staff — STAFF' })
  @Roles(UserRole.STAFF)
  async aggregate(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Agregat dashboard staff berhasil diambil',
      data: await this.service.aggregate(user),
    };
  }
}
