import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { OwnerDashboardService } from './owner-dashboard.service';
import { OwnerDashboardAggregateQueryDto } from './dto/owner-dashboard-aggregate-query.dto';

@ApiTags('owner-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('owner/dashboard')
export class OwnerDashboardController {
  constructor(private readonly service: OwnerDashboardService) {}

  @Get('aggregate')
  @ApiOperation({ summary: 'Agregat dashboard owner — OWNER-only' })
  @Roles(UserRole.OWNER)
  async aggregate(@Query() query: OwnerDashboardAggregateQueryDto) {
    const data = await this.service.aggregate(query.year, query.month, query.trendMonths);
    return { message: 'Agregat dashboard owner berhasil diambil', data };
  }
}
